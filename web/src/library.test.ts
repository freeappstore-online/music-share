import { describe, expect, it } from 'vitest'
import {
  addToPlaylist,
  addTrack,
  createPlaylist,
  EMPTY_LIBRARY,
  formatDuration,
  loadLibrary,
  moveInPlaylist,
  playlistTracks,
  removeTrack,
  renamePlaylist,
  safeUrl,
  saveLibrary,
  setShareId,
  shareLink,
  STORAGE_KEY,
  toShared,
} from './library'
import type { Library, Track } from './types'

const track = (id: string, over: Partial<Track> = {}): Track => ({
  id,
  title: `Song ${id}`,
  artist: 'Artist',
  url: `https://example.com/${id}`,
  recorded: false,
  durationSec: 0,
  createdAt: 0,
  ...over,
})

function build(): Library {
  let lib = EMPTY_LIBRARY
  lib = addTrack(lib, track('a'))
  lib = addTrack(lib, track('b'))
  lib = addTrack(lib, track('c', { recorded: true, url: '', durationSec: 61 }))
  lib = createPlaylist(lib, 'p1', '  Road trip ')
  for (const id of ['a', 'b', 'c']) lib = addToPlaylist(lib, 'p1', id)
  return lib
}

const memoryStorage = (initial?: string) => {
  const data = new Map<string, string>(initial === undefined ? [] : [[STORAGE_KEY, initial]])
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('library', () => {
  it('creates playlists with trimmed names and a fallback', () => {
    expect(build().playlists[0].name).toBe('Road trip')
    expect(createPlaylist(EMPTY_LIBRARY, 'x', '   ').playlists[0].name).toBe('Untitled playlist')
  })

  it('does not add the same track to a playlist twice', () => {
    const lib = addToPlaylist(build(), 'p1', 'a')
    expect(lib.playlists[0].trackIds).toEqual(['a', 'b', 'c'])
  })

  it('removing a track also removes it from playlists', () => {
    const lib = removeTrack(build(), 'b')
    expect(lib.tracks.map((t) => t.id)).toEqual(['c', 'a'])
    expect(lib.playlists[0].trackIds).toEqual(['a', 'c'])
  })

  it('reorders tracks and ignores out-of-range moves', () => {
    let lib = moveInPlaylist(build(), 'p1', 'c', -1)
    expect(lib.playlists[0].trackIds).toEqual(['a', 'c', 'b'])
    lib = moveInPlaylist(lib, 'p1', 'a', -1)
    expect(lib.playlists[0].trackIds).toEqual(['a', 'c', 'b'])
    lib = moveInPlaylist(lib, 'p1', 'b', 1)
    expect(lib.playlists[0].trackIds).toEqual(['a', 'c', 'b'])
  })

  it('keeps the old name when renaming to blank', () => {
    expect(renamePlaylist(build(), 'p1', '  ').playlists[0].name).toBe('Road trip')
    expect(renamePlaylist(build(), 'p1', 'Gym').playlists[0].name).toBe('Gym')
  })

  it('skips tracks that no longer exist when listing a playlist', () => {
    const lib = build()
    const dangling = { ...lib.playlists[0], trackIds: ['a', 'gone'] }
    expect(playlistTracks(lib, dangling).map((t) => t.id)).toEqual(['a'])
  })

  it('tracks the share id', () => {
    const lib = setShareId(build(), 'p1', 'abc')
    expect(lib.playlists[0].shareId).toBe('abc')
    expect(setShareId(lib, 'p1', undefined).playlists[0].shareId).toBeUndefined()
  })
})

describe('sharing', () => {
  it('shares titles and links but never audio or local data', () => {
    const lib = build()
    const shared = toShared(lib, lib.playlists[0])
    expect(shared.name).toBe('Road trip')
    expect(shared.tracks).toEqual([
      { title: 'Song a', artist: 'Artist', url: 'https://example.com/a', recorded: false },
      { title: 'Song b', artist: 'Artist', url: 'https://example.com/b', recorded: false },
      { title: 'Song c', artist: 'Artist', url: '', recorded: true },
    ])
  })

  it('drops non-http links', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('')
    expect(safeUrl('data:text/html,hi')).toBe('')
    expect(safeUrl('not a url')).toBe('')
    expect(safeUrl(' https://example.com/x ')).toBe('https://example.com/x')
  })

  it('builds an encoded listen link', () => {
    expect(shareLink('https://music-share.freeappstore.online', 'a b')).toBe('https://music-share.freeappstore.online/listen/a%20b')
  })
})

describe('persistence', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage()
    const lib = build()
    saveLibrary(lib, storage)
    expect(loadLibrary(storage)).toEqual(lib)
  })

  it('falls back to an empty library for missing or corrupt data', () => {
    expect(loadLibrary(memoryStorage())).toEqual(EMPTY_LIBRARY)
    expect(loadLibrary(memoryStorage('{oops'))).toEqual(EMPTY_LIBRARY)
    expect(loadLibrary(memoryStorage('{"tracks":1}'))).toEqual(EMPTY_LIBRARY)
  })
})

describe('formatDuration', () => {
  it('formats m:ss', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(61.4)).toBe('1:01')
    expect(formatDuration(-3)).toBe('0:00')
  })
})
