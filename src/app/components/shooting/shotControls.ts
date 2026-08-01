import { normalizeShotInput } from '../../../moments/shooting/normalizeShotInput'
import type {
  NormalizedPoint,
  ShotInput,
} from '../../../moments/shooting/types'

export const MIN_GESTURE_POWER = 0.08
export interface CanvasSize {
  readonly width: number
  readonly height: number
}
export interface KeyboardAim {
  readonly directionX: number
  readonly directionY: number
}
const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value))
export const pointerGestureToShotInput = (
  start: NormalizedPoint,
  end: NormalizedPoint,
  elapsedMs: number,
  size: CanvasSize,
): ShotInput | null => {
  const dx = (end.x - start.x) / size.width
  const dy = (end.y - start.y) / size.height
  const distance = Math.hypot(dx, dy)
  if (distance < MIN_GESTURE_POWER) return null
  const directionScale = Math.max(1, distance)
  return normalizeShotInput({
    normalizedDirectionX: dx / directionScale,
    normalizedDirectionY: dy / directionScale,
    normalizedPower: clamp(distance),
    releaseTiming: clamp(elapsedMs / 1200),
  })
}
export const isPointerOnBall = (
  point: NormalizedPoint,
  ball: NormalizedPoint,
  radius = 0.06,
): boolean => Math.hypot(point.x - ball.x, point.y - ball.y) <= radius
export const moveKeyboardAim = (aim: KeyboardAim, key: string): KeyboardAim => {
  const amount = 0.12
  if (key === 'ArrowLeft')
    return { ...aim, directionX: clamp(aim.directionX - amount, -1, 1) }
  if (key === 'ArrowRight')
    return { ...aim, directionX: clamp(aim.directionX + amount, -1, 1) }
  if (key === 'ArrowUp')
    return { ...aim, directionY: clamp(aim.directionY - amount, -1, 1) }
  if (key === 'ArrowDown')
    return { ...aim, directionY: clamp(aim.directionY + amount, -1, 1) }
  return aim
}
export const keyboardShotInput = (
  aim: KeyboardAim,
  elapsedMs: number,
): ShotInput => {
  const length = Math.hypot(aim.directionX, aim.directionY)
  const power = clamp(elapsedMs / 1200)
  const timing = clamp(0.5 + 0.5 * Math.sin(elapsedMs / 150))
  return normalizeShotInput({
    normalizedDirectionX: aim.directionX / Math.max(1, length),
    normalizedDirectionY: aim.directionY / Math.max(1, length),
    normalizedPower: power,
    releaseTiming: timing,
  })
}
