import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LibraryView } from '@/components/LibraryView'
import { Player } from '@/components/Player'
import { RoundEditor } from '@/components/RoundEditor'
import { RoundsView } from '@/components/RoundsView'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { preferPlaybackSession } from '@/lib/mixer'
import { loadStore, useStore } from '@/lib/store'
import type { Round } from '@/lib/types'

type Screen =
  | { name: 'home'; tab: string }
  | { name: 'edit'; round?: Round }
  | { name: 'play'; round: Round }

export default function App() {
  const { loaded } = useStore()
  const [screen, setScreen] = useState<Screen>({ name: 'home', tab: 'rounds' })

  useEffect(() => {
    void loadStore()
    preferPlaybackSession()
    // Évite que Safari purge les extraits téléchargés.
    void navigator.storage?.persist?.()
  }, [])

  const home = (tab = 'rounds') => setScreen({ name: 'home', tab })

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
      {!loaded ? null : screen.name === 'play' ? (
        <Player round={screen.round} onBack={() => home()} />
      ) : screen.name === 'edit' ? (
        <RoundEditor round={screen.round} onDone={() => home()} />
      ) : (
        <Tabs value={screen.tab} onValueChange={(tab) => home(String(tab))} className="gap-4">
          <header className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">Multi Blind Test</h1>
            <TabsList>
              <TabsTrigger value="rounds">Manches</TabsTrigger>
              <TabsTrigger value="library">Bibliothèque</TabsTrigger>
            </TabsList>
          </header>
          <TabsContent value="rounds">
            <RoundsView
              onCreate={() => setScreen({ name: 'edit' })}
              onEdit={(round) => setScreen({ name: 'edit', round })}
              onPlay={(round) => setScreen({ name: 'play', round })}
            />
          </TabsContent>
          <TabsContent value="library">
            <LibraryView />
          </TabsContent>
        </Tabs>
      )}
      <Toaster position="top-center" />
      <UpdatePrompt />
    </main>
  )
}
