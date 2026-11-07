import { useEffect, useState } from 'react'
import { Badge, EmptyState, PageHeader, Spinner } from '@freeappstore/sdk/ui'
import { sharedPlaylists } from '../fas'
import { safeUrl } from '../library'
import type { SharedPlaylist } from '../types'

type State = { status: 'loading' } | { status: 'missing' } | { status: 'error' } | { status: 'ready'; playlist: SharedPlaylist }

/** Public page behind a share link. Works signed out. */
export function ListenPage({ shareId, goTo }: { shareId: string; goTo: (href: string) => void }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    sharedPlaylists
      .get<SharedPlaylist>(shareId)
      .then((doc) => !cancelled && setState(doc ? { status: 'ready', playlist: doc } : { status: 'missing' }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [shareId])

  if (state.status === 'loading') return <Spinner />
  if (state.status !== 'ready') {
    return (
      <>
        <PageHeader title="Playlist unavailable" />
        <EmptyState
          message={state.status === 'missing' ? 'This link was turned off or never existed.' : 'Could not load this playlist. Check your connection and retry.'}
          action={
            <button type="button" className="text-sm font-semibold text-[var(--accent)] underline" onClick={() => goTo('/')}>
              Open music-share
            </button>
          }
        />
      </>
    )
  }

  const { playlist } = state
  return (
    <>
      <PageHeader title={playlist.name} description={`A shared playlist · ${playlist.tracks.length} songs`} />
      <ol className="divide-y divide-[var(--line)]">
        {playlist.tracks.map((t, i) => {
          const link = safeUrl(t.url)
          return (
            <li key={i} className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-6 text-right text-sm tabular-nums text-[var(--muted)]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--ink)]">{t.title}</p>
                <p className="truncate text-sm text-[var(--muted)]">{t.artist || 'Unknown artist'}</p>
              </div>
              {link ? (
                <a className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent)] underline" href={link} target="_blank" rel="noopener noreferrer">
                  Listen
                </a>
              ) : (
                <Badge>{t.recorded ? 'Recording' : 'No link'}</Badge>
              )}
            </li>
          )
        })}
      </ol>
    </>
  )
}
