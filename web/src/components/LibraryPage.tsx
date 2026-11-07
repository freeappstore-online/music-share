import { useState } from 'react'
import { ConfirmDialog, EmptyState, Modal, PageHeader, SearchInput, useToast } from '@freeappstore/sdk/ui'
import { deleteClip } from '../audioStore'
import { newId, safeUrl } from '../library'
import type { Library, Track } from '../types'
import { TrackRow } from './TrackRow'
import { btn, btnPrimary, card, input } from './styles'

interface Props {
  lib: Library
  onAdd: (track: Track) => void
  onEdit: (id: string, patch: Partial<Pick<Track, 'title' | 'artist' | 'url'>>) => void
  onRemove: (id: string) => void
  onAddToPlaylist: (playlistId: string, trackId: string) => void
}

export function LibraryPage({ lib, onAdd, onEdit, onRemove, onAddToPlaylist }: Props) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ title: '', artist: '', url: '' })
  const [editing, setEditing] = useState<Track | null>(null)
  const [removing, setRemoving] = useState<Track | null>(null)
  const [picking, setPicking] = useState<Track | null>(null)

  const addLink = (e: React.FormEvent) => {
    e.preventDefault()
    const url = safeUrl(form.url)
    if (!form.title.trim() || !url) {
      toast.show('Enter a title and a valid http(s) link', { variant: 'error' })
      return
    }
    onAdd({ id: newId(), title: form.title.trim(), artist: form.artist.trim(), url, recorded: false, durationSec: 0, createdAt: Date.now() })
    setForm({ title: '', artist: '', url: '' })
  }

  const confirmRemove = async () => {
    if (!removing) return
    if (removing.recorded) await deleteClip(removing.id).catch(() => undefined)
    onRemove(removing.id)
    setRemoving(null)
  }

  const q = query.trim().toLowerCase()
  const shown = lib.tracks.filter((t) => !q || `${t.title} ${t.artist}`.toLowerCase().includes(q))

  return (
    <>
      <PageHeader title="Library" description="Your recordings and saved song links." />
      <form onSubmit={addLink} className={`${card} grid gap-3 sm:grid-cols-2`} aria-label="Add a song link">
        <label className="text-sm font-semibold text-[var(--ink)]">
          Title
          <input className={`${input} mt-1`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="text-sm font-semibold text-[var(--ink)]">
          Artist
          <input className={`${input} mt-1`} value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
        </label>
        <label className="text-sm font-semibold text-[var(--ink)] sm:col-span-2">
          Listening link
          <input
            className={`${input} mt-1`}
            type="url"
            inputMode="url"
            placeholder="https://"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className={btnPrimary}>
            Add song
          </button>
        </div>
      </form>

      <div className="mt-6">
        {lib.tracks.length > 0 && <SearchInput value={query} onChange={setQuery} placeholder="Search songs" />}
        {lib.tracks.length === 0 ? (
          <EmptyState title="Nothing here yet" message="Record a tab or add a song link above." />
        ) : shown.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">No songs match "{query}".</p>
        ) : (
          <div className="mt-2 divide-y divide-[var(--line)]">
            {shown.map((t) => (
              <TrackRow
                key={t.id}
                track={t}
                actions={
                  <div className="flex gap-1">
                    <button type="button" className={btn} onClick={() => setPicking(t)} aria-label={`Add ${t.title} to a playlist`}>
                      + Playlist
                    </button>
                    <button type="button" className={btn} onClick={() => setEditing(t)} aria-label={`Edit ${t.title}`}>
                      Edit
                    </button>
                    <button type="button" className={btn} onClick={() => setRemoving(t)} aria-label={`Delete ${t.title}`}>
                      Delete
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>

      <EditModal track={editing} onClose={() => setEditing(null)} onSave={onEdit} />

      <Modal open={!!picking} onClose={() => setPicking(null)} title="Add to playlist">
        {lib.playlists.length === 0 ? (
          <p className="text-[var(--muted)]">Create a playlist first on the Playlists page.</p>
        ) : (
          <ul className="grid gap-2">
            {lib.playlists.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`${btn} w-full justify-start`}
                  onClick={() => {
                    if (picking) onAddToPlaylist(p.id, picking.id)
                    toast.show(`Added to ${p.name}`, { variant: 'success' })
                    setPicking(null)
                  }}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removing}
        title="Delete song?"
        message={`"${removing?.title ?? ''}" will be removed from your library and all playlists.${removing?.recorded ? ' The recording will be deleted from this device.' : ''}`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </>
  )
}

function EditModal({ track, onClose, onSave }: { track: Track | null; onClose: () => void; onSave: Props['onEdit'] }) {
  const toast = useToast()
  return (
    <Modal open={!!track} onClose={onClose} title="Edit song">
      {track && (
        <form
          key={track.id}
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            const title = String(data.get('title')).trim()
            const rawUrl = String(data.get('url')).trim()
            const url = track.recorded ? '' : safeUrl(rawUrl)
            if (!title || (!track.recorded && !url)) {
              toast.show('A title and a valid http(s) link are required', { variant: 'error' })
              return
            }
            onSave(track.id, { title, artist: String(data.get('artist')).trim(), url })
            onClose()
          }}
        >
          <label className="text-sm font-semibold text-[var(--ink)]">
            Title
            <input name="title" className={`${input} mt-1`} defaultValue={track.title} />
          </label>
          <label className="text-sm font-semibold text-[var(--ink)]">
            Artist
            <input name="artist" className={`${input} mt-1`} defaultValue={track.artist} />
          </label>
          {!track.recorded && (
            <label className="text-sm font-semibold text-[var(--ink)]">
              Listening link
              <input name="url" type="url" className={`${input} mt-1`} defaultValue={track.url} />
            </label>
          )}
          <button type="submit" className={btnPrimary}>
            Save
          </button>
        </form>
      )}
    </Modal>
  )
}
