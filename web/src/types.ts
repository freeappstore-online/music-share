export interface Track {
  id: string
  title: string
  artist: string
  /** A page where the song can be heard (YouTube, Spotify, Bandcamp...). Empty for recordings. */
  url: string
  /** True when the audio is a tab recording stored on this device. */
  recorded: boolean
  durationSec: number
  createdAt: number
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  /** Set once the playlist has been published; the id of its public share document. */
  shareId?: string
}

export interface Library {
  tracks: Track[]
  playlists: Playlist[]
}

/** What a share link exposes: names and listening links, never audio. */
export interface SharedTrack {
  title: string
  artist: string
  url: string
  recorded: boolean
}

export interface SharedPlaylist {
  name: string
  tracks: SharedTrack[]
  [key: string]: unknown
}
