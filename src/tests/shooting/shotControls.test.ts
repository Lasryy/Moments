import { describe, expect, it } from 'vitest'
import {
  keyboardShotInput,
  MIN_GESTURE_POWER,
  moveKeyboardAim,
  pointerGestureToShotInput,
} from '../../app/components/shooting/shotControls'

describe('shooting controls', () => {
  it('converts a pointer gesture into a normalized input', () => {
    const input = pointerGestureToShotInput(
      { x: 0.5, y: 0.86 },
      { x: 0.82, y: 0.28 },
      696,
      { width: 1, height: 1 },
    )
    expect(input).toEqual(
      expect.objectContaining({ normalizedPower: expect.any(Number) }),
    )
    expect(
      Math.hypot(input!.normalizedDirectionX, input!.normalizedDirectionY),
    ).toBeLessThanOrEqual(1)
  })
  it('cancels a gesture too short to be a shot', () =>
    expect(
      pointerGestureToShotInput(
        { x: 0.5, y: 0.86 },
        { x: 0.5 + MIN_GESTURE_POWER / 2, y: 0.86 },
        100,
        { width: 1, height: 1 },
      ),
    ).toBeNull())
  it('moves keyboard aim and charges power independently from timing', () => {
    const moved = moveKeyboardAim(
      { directionX: 0, directionY: -0.82 },
      'ArrowRight',
    )
    expect(moved.directionX).toBeGreaterThan(0)
    const early = keyboardShotInput(moved, 200)
    const late = keyboardShotInput(moved, 900)
    expect(late.normalizedPower).toBeGreaterThan(early.normalizedPower)
    expect(late.releaseTiming).not.toBe(early.releaseTiming)
  })
})
