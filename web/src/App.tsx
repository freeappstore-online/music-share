import { useEffect, useState } from 'react'
import { type NavItem, ProfilePage, Shell } from '@freeappstore/sdk/ui'
import { fas } from './fas'
import {
  addToPlaylist,
  addTrack,
  createPlaylist,
  deletePlaylist,
  loadLibrary,
  removeFromPlaylist,
  removeTrack,
  renamePlaylist,
  saveLibrary,
  setShareId,
  updateTrack,
} from './library'
import type { Library } from './types'
import { LibraryPage } from './components/LibraryPage'
import { ListenPage } from './components/ListenPage'
import { PlaylistsPage } from './components/PlaylistsPage'
import { RecordPage } from './components/RecordPage'
import { PageHeader } from '@freeappstore/sdk/ui'

const NAV: NavItem[] = [
  { label: 'Record', href: '/', title: 'Record — music-share' },
  { label: 'Library', href: '/library', title: 'Library — music-share' },
  { label: 'Playlists', href: '/playlists', title: 'Playlists — music-share' },
  { label: 'Account', href: '/account', title: 'Account — music-share' },
]

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname)
  const [lib, setLib] = useState<Library>(loadLibrary)

  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  useEffect(() => saveLibrary(lib), [lib])

  const navigate = (href: string) => {
    window.history.pushState(null, '', href)
    setPath(href)
  }
  const change = (fn: (l: Library) => Library) => setLib(fn)

  const listenId = path.match(/^\/listen\/([^/]+)$/)?.[1]
  const playlistId = path.match(/^\/playlists\/([^/]+)$/)?.[1] ?? null

  let screen: React.ReactNode
  if (listenId) {
    screen = <ListenPage shareId={decodeURIComponent(listenId)} goTo={navigate} />
  } else if (path === '/account') {
    screen = (
      <>
        <PageHeader title="Account" />
        <ProfilePage app={fas} />
      </>
    )
  } else if (path === '/library') {
    screen = (
      <LibraryPage
        lib={lib}
        onAdd={(t) => change((l) => addTrack(l, t))}
        onEdit={(id, patch) => change((l) => updateTrack(l, id, patch))}
        onRemove={(id) => change((l) => removeTrack(l, id))}
        onAddToPlaylist={(pid, tid) => change((l) => addToPlaylist(l, pid, tid))}
      />
    )
  } else if (path === '/playlists' || playlistId) {
    screen = (
      <PlaylistsPage
        lib={lib}
        playlistId={playlistId}
        goTo={navigate}
        change={change}
        onCreate={(id, name) => change((l) => createPlaylist(l, id, name))}
        onRename={(id, name) => change((l) => renamePlaylist(l, id, name))}
        onDelete={(id) => change((l) => deletePlaylist(l, id))}
        onShareId={(id, shareId) => change((l) => setShareId(l, id, shareId))}
        onRemoveTrack={(pid, tid) => change((l) => removeFromPlaylist(l, pid, tid))}
      />
    )
  } else {
    screen = <RecordPage tracks={lib.tracks} onAdd={(t) => change((l) => addTrack(l, t))} goTo={navigate} />
  }

  return (
    <Shell app={fas} appName="music-share" nav={NAV} onNavigate={navigate}>
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-8">
        {screen}
        <p className="mt-10 text-sm text-[var(--muted)]">
          music-share is a free app on <a href="https://freeappstore.online" className="underline">FreeAppStore</a>.
        </p>
      </div>
    </Shell>
  )
}
