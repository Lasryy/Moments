export type PlaybackState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'playing'
      readonly shotId: string
      readonly runId: number
      readonly startedAt: number
    }
  | {
      readonly status: 'finished'
      readonly shotId: string
      readonly runId: number
    }

export const idlePlayback: PlaybackState = { status: 'idle' }

export const startPlayback = (
  shotId: string,
  runId: number,
  startedAt: number,
): PlaybackState => ({
  status: 'playing',
  shotId,
  runId,
  startedAt,
})

export const finishPlayback = (state: PlaybackState): PlaybackState =>
  state.status === 'playing'
    ? { status: 'finished', shotId: state.shotId, runId: state.runId }
    : state

export const playbackProgress = (
  state: PlaybackState,
  now: number,
  durationMs: number,
): number =>
  state.status === 'finished'
    ? 1
    : state.status === 'playing'
      ? Math.min(1, Math.max(0, (now - state.startedAt) / durationMs))
      : 0
