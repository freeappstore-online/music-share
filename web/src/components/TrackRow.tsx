import { useEffect, useState } from 'react'
import { Badge } from '@freeappstore/sdk/ui'
import { loadClip } from '../audioStore'
import { formatDuration, safeUrl } from '../library'
import type { Track } from '../types'

function ClipPlayer({ id }: { id: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    loadClip(id)
      .then((blob) => {
        if (cancelled) return
        if (!blob) return setMissing(true)
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => !cancelled && setMissing(true))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])

  if (missing) return <p className="mt-2 text-sm text-[var(--muted)]">The audio for this recording is not on this device.</p>
  return src ? <audio className="mt-2 w-full" controls preload="metadata" src={src} /> : null
}

export function TrackRow({ track, actions }: { track: Track; actions?: React.ReactNode }) {
  const link = safeUrl(track.url)
  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--ink)]">{track.title}</p>
          <p className="truncate text-sm text-[var(--muted)]">
            {track.artist || 'Unknown artist'}
            {track.recorded && ` · ${formatDuration(track.durationSec)}`}
          </p>
        </div>
        <Badge variant={track.recorded ? 'accent' : 'default'}>{track.recorded ? 'Recording' : 'Link'}</Badge>
        {link && (
          <a className="text-sm font-semibold text-[var(--accent)] underline" href={link} target="_blank" rel="noopener noreferrer">
            Listen
          </a>
        )}
        {actions}
      </div>
      {track.recorded && <ClipPlayer id={track.id} />}
    </div>
  )
}
