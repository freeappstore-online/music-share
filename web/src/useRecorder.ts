import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'recording'

export interface Recording {
  blob: Blob
  durationSec: number
}

export const recordingSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== 'undefined'

/**
 * Records the audio of a browser tab. The browser's share picker needs video requested too, so the video
 * track is stopped immediately and only the audio is recorded. Only "Chrome Tab" sharing with
 * "Share tab audio" ticked carries audio.
 */
export function useRecorder(onFinish: (rec: Recording) => void) {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    if (state !== 'recording') return
    const started = Date.now()
    setElapsed(0)
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500)
    return () => clearInterval(t)
  }, [state])

  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }, [])

  const start = useCallback(async () => {
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    display.getVideoTracks().forEach((t) => t.stop())
    const audioTracks = display.getAudioTracks()
    if (audioTracks.length === 0) {
      display.getTracks().forEach((t) => t.stop())
      throw new Error('NO_AUDIO')
    }
    const audio = new MediaStream(audioTracks)
    stream.current = audio
    const chunks: Blob[] = []
    const rec = new MediaRecorder(audio)
    const startedAt = Date.now()
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
    rec.onstop = () => {
      audio.getTracks().forEach((t) => t.stop())
      setState('idle')
      recorder.current = null
      if (chunks.length > 0) {
        onFinishRef.current({
          blob: new Blob(chunks, { type: rec.mimeType || 'audio/webm' }),
          durationSec: (Date.now() - startedAt) / 1000,
        })
      }
    }
    // The user can end the capture from the browser's own "Stop sharing" bar.
    audioTracks[0].addEventListener('ended', stop)
    recorder.current = rec
    rec.start(1000)
    setState('recording')
  }, [stop])

  useEffect(() => () => {
    stop()
    stream.current?.getTracks().forEach((t) => t.stop())
  }, [stop])

  return { state, elapsed, start, stop }
}
