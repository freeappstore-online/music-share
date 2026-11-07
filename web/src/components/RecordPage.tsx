import { EmptyState, PageHeader, useToast } from '@freeappstore/sdk/ui'
import { saveClip } from '../audioStore'
import { formatDuration, newId } from '../library'
import { recordingSupported, useRecorder } from '../useRecorder'
import type { Track } from '../types'
import { TrackRow } from './TrackRow'
import { btnPrimary, card } from './styles'

interface Props {
  tracks: Track[]
  onAdd: (track: Track) => void
  goTo: (href: string) => void
}

export function RecordPage({ tracks, onAdd, goTo }: Props) {
  const toast = useToast()
  const { state, elapsed, start, stop } = useRecorder(async ({ blob, durationSec }) => {
    const id = newId()
    try {
      await saveClip(id, blob)
    } catch {
      toast.show('Could not save the recording on this device', { variant: 'error' })
      return
    }
    const when = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    onAdd({ id, title: `Recording ${when}`, artist: '', url: '', recorded: true, durationSec, createdAt: Date.now() })
    toast.show('Recording saved to your library', { variant: 'success' })
  })

  const begin = () =>
    start().catch((err: unknown) => {
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError') return // the user dismissed the picker
      toast.show(
        err instanceof Error && err.message === 'NO_AUDIO'
          ? 'No audio was shared. Pick a Chrome tab and tick "Share tab audio".'
          : 'Could not start recording',
        { variant: 'error' },
      )
    })

  const recent = tracks.filter((t) => t.recorded).slice(0, 3)

  return (
    <>
      <PageHeader title="Record" description="Capture the sound playing in a browser tab and keep it in your library." />
      {!recordingSupported() ? (
        <EmptyState title="Recording is not supported here" message="Tab audio capture needs a desktop browser such as Chrome or Edge." />
      ) : (
        <div className={`${card} text-center`}>
          <p className="display-font text-5xl font-bold tabular-nums text-[var(--ink)]" role="timer" aria-live="off">
            {formatDuration(elapsed)}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {state === 'recording'
              ? 'Recording the shared tab. Press Stop, or end sharing in your browser.'
              : 'Choose "Chrome Tab", then tick "Share tab audio" in the picker.'}
          </p>
          <div className="mt-4">
            {state === 'recording' ? (
              <button type="button" className={btnPrimary} onClick={stop}>
                Stop recording
              </button>
            ) : (
              <button type="button" className={btnPrimary} onClick={begin}>
                Start recording
              </button>
            )}
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-[var(--muted)]">
        Recordings stay on this device. Only record audio you have the right to keep.
      </p>
      {recent.length > 0 && (
        <section className="mt-8" aria-labelledby="recent">
          <div className="flex items-center justify-between">
            <h2 id="recent" className="display-font text-xl font-bold text-[var(--ink)]">
              Latest recordings
            </h2>
            <button type="button" className="text-sm font-semibold text-[var(--accent)] underline" onClick={() => goTo('/library')}>
              Open library
            </button>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {recent.map((t) => (
              <TrackRow key={t.id} track={t} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
