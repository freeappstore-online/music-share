import { useState } from 'react'
import { ConfirmDialog, EmptyState, ListRow, PageHeader, useToast } from '@freeappstore/sdk/ui'
import { useAuth } from '@freeappstore/sdk/hooks'
import { fas, sharedPlaylists } from '../fas'
import { moveInPlaylist, newId, playlistTracks, shareLink, toShared } from '../library'
import type { Library, Playlist } from '../types'
import { TrackRow } from './TrackRow'
import { btn, btnDanger, btnPrimary, card, input } from './styles'

interface Props {
  lib: Library
  playlistId: string | null
  goTo: (href: string) => void
  change: (fn: (lib: Library) => Library) => void
  onCreate: (id: string, name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onShareId: (id: string, shareId: string | undefined) => void
  onRemoveTrack: (playlistId: string, trackId: string) => void
}

export function PlaylistsPage(props: Props) {
  const playlist = props.playlistId ? props.lib.playlists.find((p) => p.id === props.playlistId) : undefined
  if (props.playlistId && !playlist) {
    return (
      <>
        <PageHeader title="Playlist not found" />
        <button type="button" className={btn} onClick={() => props.goTo('/playlists')}>
          Back to playlists
        </button>
      </>
    )
  }
  return playlist ? <PlaylistDetail {...props} playlist={playlist} /> : <PlaylistList {...props} />
}

function PlaylistList({ lib, goTo, onCreate }: Props) {
  const [name, setName] = useState('')
  const create = (e: React.FormEvent) => {
    e.preventDefault()
    const id = newId()
    onCreate(id, name)
    setName('')
    goTo(`/playlists/${id}`)
  }
  return (
    <>
      <PageHeader title="Playlists" description="Group songs, then share a link to the list." />
      <form onSubmit={create} className="flex flex-wrap gap-2" aria-label="New playlist">
        <label className="min-w-0 flex-1 text-sm font-semibold text-[var(--ink)]">
          <span className="sr-only">Playlist name</span>
          <input className={input} placeholder="New playlist name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="submit" className={btnPrimary}>
          Create playlist
        </button>
      </form>
      <div className="mt-6">
        {lib.playlists.length === 0 ? (
          <EmptyState title="No playlists yet" message="Create one, then add songs from your library." />
        ) : (
          lib.playlists.map((p) => (
            <ListRow
              key={p.id}
              title={p.name}
              subtitle={`${p.trackIds.length} ${p.trackIds.length === 1 ? 'song' : 'songs'}${p.shareId ? ' · shared' : ''}`}
              onClick={() => goTo(`/playlists/${p.id}`)}
            />
          ))
        )}
      </div>
    </>
  )
}

function PlaylistDetail({ lib, playlist, goTo, change, onRename, onDelete, onShareId, onRemoveTrack }: Props & { playlist: Playlist }) {
  const toast = useToast()
  const { user } = useAuth(fas)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const tracks = playlistTracks(lib, playlist)
  const link = playlist.shareId ? shareLink(window.location.origin, playlist.shareId) : ''

  const publish = async () => {
    setBusy(true)
    try {
      const doc = toShared(lib, playlist)
      if (playlist.shareId) {
        await sharedPlaylists.update(playlist.shareId, doc)
        toast.show('Share link updated', { variant: 'success' })
      } else {
        const created = await sharedPlaylists.create(doc)
        onShareId(playlist.id, created.id)
        toast.show('Playlist shared', { variant: 'success' })
      }
    } catch {
      toast.show('Could not publish the playlist. Try again.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const unshare = async () => {
    if (!playlist.shareId) return
    setBusy(true)
    try {
      await sharedPlaylists.delete(playlist.shareId)
      onShareId(playlist.id, undefined)
      toast.show('Link turned off', { variant: 'success' })
    } catch {
      toast.show('Could not turn the link off. Try again.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast.show('Link copied', { variant: 'success' })
    } catch {
      toast.show('Copy failed. Select the link and copy it manually.', { variant: 'error' })
    }
  }

  return (
    <>
      <PageHeader
        title={playlist.name}
        description={`${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'}`}
        actions={
          <button type="button" className={btn} onClick={() => goTo('/playlists')}>
            All playlists
          </button>
        }
      />

      <section className={card} aria-labelledby="share-h">
        <h2 id="share-h" className="display-font text-lg font-bold text-[var(--ink)]">
          Share
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Anyone with the link sees the song titles and listening links. Recordings are listed by name only, because their audio never leaves your device.
        </p>
        {!user ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={() => fas.auth.signIn('github')}>
              Sign in with GitHub to share
            </button>
            <button type="button" className={btn} onClick={() => fas.auth.signIn('google')}>
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="mt-3 grid gap-3">
            {link && (
              <input className={input} readOnly value={link} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={busy || tracks.length === 0} onClick={publish}>
                {playlist.shareId ? 'Update shared copy' : 'Create share link'}
              </button>
              {link && (
                <>
                  <button type="button" className={btn} onClick={copy}>
                    Copy link
                  </button>
                  <button type="button" className={btn} disabled={busy} onClick={unshare}>
                    Turn off link
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="songs-h">
        <h2 id="songs-h" className="display-font text-xl font-bold text-[var(--ink)]">
          Songs
        </h2>
        {tracks.length === 0 ? (
          <EmptyState message='Add songs from the Library with the "+ Playlist" button.' />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {tracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                actions={
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className={btn}
                      disabled={i === 0}
                      aria-label={`Move ${t.title} up`}
                      onClick={() => change((l) => moveInPlaylist(l, playlist.id, t.id, -1))}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className={btn}
                      disabled={i === tracks.length - 1}
                      aria-label={`Move ${t.title} down`}
                      onClick={() => change((l) => moveInPlaylist(l, playlist.id, t.id, 1))}
                    >
                      Down
                    </button>
                    <button type="button" className={btn} aria-label={`Remove ${t.title} from playlist`} onClick={() => onRemoveTrack(playlist.id, t.id)}>
                      Remove
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Playlist settings">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            onRename(playlist.id, String(new FormData(e.currentTarget).get('name')))
          }}
        >
          <input name="name" className={input} defaultValue={playlist.name} aria-label="Playlist name" key={playlist.name} />
          <button type="submit" className={btn}>
            Rename
          </button>
        </form>
        <div>
          <button type="button" className={btnDanger} onClick={() => setConfirmDelete(true)}>
            Delete playlist
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete playlist?"
        message={`"${playlist.name}" will be deleted${playlist.shareId ? ' and its share link will stop working' : ''}. Your songs stay in the library.`}
        confirmLabel="Delete"
        variant="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (playlist.shareId) await sharedPlaylists.delete(playlist.shareId).catch(() => undefined)
          onDelete(playlist.id)
          setConfirmDelete(false)
          goTo('/playlists')
        }}
      />
    </>
  )
}
