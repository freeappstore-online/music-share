import type { Library, Playlist, SharedPlaylist, Track } from './types'

export const STORAGE_KEY = 'music-share:library:v1'
export const EMPTY_LIBRARY: Library = { tracks: [], playlists: [] }

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

export function newId(): string {
  return crypto.randomUUID()
}

export function loadLibrary(storage: KeyValueStorage = localStorage): Library {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
    if (parsed && Array.isArray(parsed.tracks) && Array.isArray(parsed.playlists)) return parsed as Library
  } catch {
    // Corrupt or unavailable storage: start with an empty library.
  }
  return EMPTY_LIBRARY
}

export function saveLibrary(lib: Library, storage: KeyValueStorage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(lib))
}

export function addTrack(lib: Library, track: Track): Library {
  return { ...lib, tracks: [track, ...lib.tracks] }
}

export function removeTrack(lib: Library, trackId: string): Library {
  return {
    tracks: lib.tracks.filter((t) => t.id !== trackId),
    playlists: lib.playlists.map((p) => ({ ...p, trackIds: p.trackIds.filter((id) => id !== trackId) })),
  }
}

export function updateTrack(lib: Library, trackId: string, patch: Partial<Pick<Track, 'title' | 'artist' | 'url'>>): Library {
  return { ...lib, tracks: lib.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)) }
}

export function createPlaylist(lib: Library, id: string, name: string): Library {
  const playlist: Playlist = { id, name: name.trim() || 'Untitled playlist', trackIds: [] }
  return { ...lib, playlists: [playlist, ...lib.playlists] }
}

export function renamePlaylist(lib: Library, id: string, name: string): Library {
  const trimmed = name.trim()
  if (!trimmed) return lib
  return { ...lib, playlists: lib.playlists.map((p) => (p.id === id ? { ...p, name: trimmed } : p)) }
}

export function deletePlaylist(lib: Library, id: string): Library {
  return { ...lib, playlists: lib.playlists.filter((p) => p.id !== id) }
}

export function setShareId(lib: Library, id: string, shareId: string | undefined): Library {
  return { ...lib, playlists: lib.playlists.map((p) => (p.id === id ? { ...p, shareId } : p)) }
}

export function addToPlaylist(lib: Library, playlistId: string, trackId: string): Library {
  return {
    ...lib,
    playlists: lib.playlists.map((p) =>
      p.id === playlistId && !p.trackIds.includes(trackId) ? { ...p, trackIds: [...p.trackIds, trackId] } : p,
    ),
  }
}

export function removeFromPlaylist(lib: Library, playlistId: string, trackId: string): Library {
  return {
    ...lib,
    playlists: lib.playlists.map((p) =>
      p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) } : p,
    ),
  }
}

/** Move a track one place up (-1) or down (+1). Out-of-range moves are ignored. */
export function moveInPlaylist(lib: Library, playlistId: string, trackId: string, delta: -1 | 1): Library {
  return {
    ...lib,
    playlists: lib.playlists.map((p) => {
      if (p.id !== playlistId) return p
      const from = p.trackIds.indexOf(trackId)
      const to = from + delta
      if (from < 0 || to < 0 || to >= p.trackIds.length) return p
      const ids = [...p.trackIds]
      ;[ids[from], ids[to]] = [ids[to], ids[from]]
      return { ...p, trackIds: ids }
    }),
  }
}

export function playlistTracks(lib: Library, playlist: Playlist): Track[] {
  const byId = new Map(lib.tracks.map((t) => [t.id, t]))
  return playlist.trackIds.flatMap((id) => byId.get(id) ?? [])
}

/** Accept only http(s) links; anything else (javascript:, data:...) is dropped. */
export function safeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : ''
  } catch {
    return ''
  }
}

export function toShared(lib: Library, playlist: Playlist): SharedPlaylist {
  return {
    name: playlist.name,
    tracks: playlistTracks(lib, playlist).map((t) => ({
      title: t.title,
      artist: t.artist,
      url: t.recorded ? '' : safeUrl(t.url),
      recorded: t.recorded,
    })),
  }
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function shareLink(origin: string, shareId: string): string {
  return `${origin}/listen/${encodeURIComponent(shareId)}`
}
