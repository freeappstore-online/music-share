import { initApp } from '@freeappstore/sdk'

export const fas = initApp({ appId: 'music-share' })
export const sharedPlaylists = fas.collections.collection('shared-playlists')
