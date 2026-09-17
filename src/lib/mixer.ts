import { decode } from './loudness'
import { db } from './db'
import type { Slot, Track } from './types'

type Channel = {
  buffer: AudioBuffer
  start: number
  /** normalisation × volume de l'animateur */
  level: GainNode
  /** mute / solo */
  gate: GainNode
  source?: AudioBufferSourceNode
}

export type ChannelState = { volume: number; muted: boolean; solo: boolean }

const RAMP = 0.02
// 5 pistes normalisées qui s'additionnent : on baisse le master et on limite les crêtes.
const MASTER_GAIN = 0.7

export const volumeToGain = (volume: number) => (volume / 100) ** 2

export class Mixer {
  readonly ctx = new AudioContext()
  private master = this.ctx.createGain()
  private channels: Channel[] = []
  private startedAt = 0
  status: 'stopped' | 'playing' | 'paused' = 'stopped'

  constructor() {
    const limiter = this.ctx.createDynamicsCompressor()
    limiter.threshold.value = -3
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.003
    limiter.release.value = 0.1
    this.master.gain.value = MASTER_GAIN
    this.master.connect(limiter).connect(this.ctx.destination)
  }

  async load(slots: Slot[], tracks: Track[]) {
    this.channels = await Promise.all(
      slots.map(async (slot) => {
        const track = tracks.find((t) => t.id === slot.trackId)
        const audio = await db.audio(slot.trackId)
        if (!track || !audio) throw new Error('Morceau manquant dans la bibliothèque')
        const level = this.ctx.createGain()
        const gate = this.ctx.createGain()
        level.gain.value = track.normGain * volumeToGain(slot.volume)
        level.connect(gate).connect(this.master)
        return { buffer: await decode(audio), start: slot.start, level, gate }
      }),
    )
  }

  async play() {
    // iOS : le contexte doit être relancé dans un geste utilisateur.
    if (this.status === 'stopped') {
      const at = this.ctx.currentTime + 0.1
      for (const ch of this.channels) {
        const source = this.ctx.createBufferSource()
        source.buffer = ch.buffer
        source.loop = true
        source.loopStart = ch.start
        source.loopEnd = ch.buffer.duration
        source.connect(ch.level)
        source.start(at, ch.start)
        ch.source = source
      }
      this.startedAt = at
    }
    await this.ctx.resume()
    this.status = 'playing'
  }

  async pause() {
    await this.ctx.suspend()
    this.status = 'paused'
  }

  stop() {
    for (const ch of this.channels) {
      ch.source?.stop()
      ch.source?.disconnect()
      ch.source = undefined
    }
    this.status = 'stopped'
  }

  /** Temps écoulé depuis le lancement (le contexte suspendu gèle l'horloge). */
  elapsed() {
    return this.status === 'stopped' ? 0 : Math.max(0, this.ctx.currentTime - this.startedAt)
  }

  apply(states: ChannelState[], normGains: number[]) {
    const anySolo = states.some((s) => s.solo)
    const now = this.ctx.currentTime
    states.forEach((s, i) => {
      const ch = this.channels[i]
      if (!ch) return
      const open = !s.muted && (!anySolo || s.solo)
      ch.gate.gain.setTargetAtTime(open ? 1 : 0, now, RAMP)
      ch.level.gain.setTargetAtTime(normGains[i] * volumeToGain(s.volume), now, RAMP)
    })
  }

  dispose() {
    this.stop()
    void this.ctx.close()
  }
}

/** Sur iOS 17+, joue le son même quand le téléphone est en mode silencieux. */
export function preferPlaybackSession() {
  const nav = navigator as Navigator & { audioSession?: { type: string } }
  if (nav.audioSession) nav.audioSession.type = 'playback'
}
