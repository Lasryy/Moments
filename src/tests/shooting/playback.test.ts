import { describe, expect, it } from 'vitest'
import {
  finishPlayback,
  idlePlayback,
  playbackProgress,
  startPlayback,
} from '../../app/components/shooting/playback'

describe('shooting playback', () => {
  it('uses a distinct run without recalculating a result', () => {
    const first = startPlayback('shot-1', 1, 100)
    const replay = startPlayback('shot-1', 2, 200)
    expect(first.status).toBe('playing')
    expect(replay.status).toBe('playing')
    if (first.status !== 'playing' || replay.status !== 'playing') return
    expect(first.shotId).toBe(replay.shotId)
    expect(replay.runId).toBe(2)
    expect(playbackProgress(replay, 200, 950)).toBe(0)
    expect(playbackProgress(finishPlayback(replay), 1000, 950)).toBe(1)
  })
  it('does not change an idle playhead when debug or aim are redrawn elsewhere', () =>
    expect(playbackProgress(idlePlayback, 1000, 950)).toBe(0))
})
