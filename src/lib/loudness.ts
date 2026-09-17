// Mesure de la sonie intégrée (ITU-R BS.1770 / EBU R128) pour égaliser les morceaux.
const TARGET_LUFS = -16
const MAX_BOOST_DB = 12

let decoder: OfflineAudioContext | undefined

export function decode(data: ArrayBuffer): Promise<AudioBuffer> {
  decoder ??= new OfflineAudioContext(2, 1, 44100)
  // decodeAudioData détache le buffer : on lui passe une copie.
  return decoder.decodeAudioData(data.slice(0))
}

async function kWeighted(buffer: AudioBuffer): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const shelf = ctx.createBiquadFilter()
  shelf.type = 'highshelf'
  shelf.frequency.value = 1681
  shelf.gain.value = 4

  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = 38
  highpass.Q.value = 0.5

  source.connect(shelf).connect(highpass).connect(ctx.destination)
  source.start()
  return ctx.startRendering()
}

const toLufs = (power: number) => -0.691 + 10 * Math.log10(power)
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

export async function measureLufs(buffer: AudioBuffer): Promise<number> {
  const weighted = await kWeighted(buffer)
  const { length, sampleRate, numberOfChannels } = weighted

  // Somme cumulée de l'énergie de tous les canaux, pour des blocs glissants rapides.
  const energy = new Float64Array(length + 1)
  for (let c = 0; c < numberOfChannels; c++) {
    const data = weighted.getChannelData(c)
    for (let i = 0; i < length; i++) energy[i + 1] += data[i] * data[i]
  }
  for (let i = 0; i < length; i++) energy[i + 1] += energy[i]

  // Blocs de 400 ms avec 75 % de recouvrement.
  const block = Math.round(0.4 * sampleRate)
  const step = Math.round(0.1 * sampleRate)
  const powers: number[] = []
  for (let s = 0; s + block <= length; s += step) {
    powers.push((energy[s + block] - energy[s]) / block)
  }

  const absGated = powers.filter((p) => toLufs(p) > -70)
  if (absGated.length === 0) return -70
  const relThreshold = toLufs(mean(absGated)) - 10
  const relGated = absGated.filter((p) => toLufs(p) > relThreshold)
  return toLufs(mean(relGated))
}

export function gainFor(lufs: number): number {
  const db = Math.min(TARGET_LUFS - lufs, MAX_BOOST_DB)
  return 10 ** (db / 20)
}
