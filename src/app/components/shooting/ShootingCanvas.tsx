import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { isInsideGoalMouth } from '../../../moments/shooting/geometry'
import type {
  NormalizedPoint,
  ShotInput,
  ShotResolution,
  ShotScenario,
} from '../../../moments/shooting/types'
import {
  keyboardShotInput,
  moveKeyboardAim,
  pointerGestureToShotInput,
} from './shotControls'
import type { KeyboardAim } from './shotControls'
import { playbackProgress } from './playback'
import type { PlaybackState } from './playback'

export interface VisualDebugOptions {
  readonly ballPath: boolean
  readonly goalkeeperPath: boolean
  readonly interception: boolean
  readonly blockPoint: boolean
  readonly target: boolean
}
interface CompletedCanvasShot {
  readonly id: string
  readonly input: ShotInput
  readonly resolution: ShotResolution
}
interface ShootingCanvasProps {
  readonly scenario: ShotScenario
  readonly aim: ShotInput | null
  readonly completedShot: CompletedCanvasShot | null
  readonly playback: PlaybackState
  readonly debug: VisualDebugOptions
  readonly onAimChange: (input: ShotInput | null) => void
  readonly onShot: (input: ShotInput) => void
  readonly onPlaybackFinished: () => void
}
const WIDTH = 800
const HEIGHT = 500
const clamp = (value: number): number => Math.min(1, Math.max(0, value))
const toPixels = (point: NormalizedPoint): NormalizedPoint => ({
  x: point.x * WIDTH,
  y: point.y * HEIGHT,
})
const interpolate = (
  from: NormalizedPoint,
  to: NormalizedPoint,
  progress: number,
): NormalizedPoint => ({
  x: from.x + (to.x - from.x) * progress,
  y: from.y + (to.y - from.y) * progress,
})

export const ShootingCanvas = ({
  scenario,
  aim,
  completedShot,
  playback,
  debug,
  onAimChange,
  onShot,
  onPlaybackFinished,
}: ShootingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activePointer = useRef<{
    id: number
    start: NormalizedPoint
    startedAt: number
  } | null>(null)
  const chargeStartedAt = useRef<number | null>(null)
  const progressRef = useRef(0)
  const [keyboardAim, setKeyboardAim] = useState<KeyboardAim>({
    directionX: 0,
    directionY: -0.82,
  })
  const [isKeyboardCharging, setIsKeyboardCharging] = useState(false)
  const drawRef = useRef<(progress: number) => void>(() => undefined)
  const draw = useCallback(
    (progress: number) => {
      const context = canvasRef.current?.getContext('2d')
      if (!context) return
      drawScene(
        context,
        scenario,
        aim,
        completedShot?.resolution ?? null,
        progress,
        debug,
      )
    },
    [scenario, aim, completedShot, debug],
  )
  useEffect(() => {
    drawRef.current = draw
  }, [draw])
  useEffect(() => {
    draw(progressRef.current)
  }, [draw])
  const playbackRunId = playback.status === 'playing' ? playback.runId : 0
  const playbackShotId = playback.status === 'playing' ? playback.shotId : null
  const playbackStartedAt =
    playback.status === 'playing' ? playback.startedAt : 0
  useEffect(() => {
    if (playback.status !== 'playing' || completedShot?.id !== playbackShotId)
      return
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const duration = reducedMotion ? 1 : 950
    let frame = 0
    const render = (now: number): void => {
      const progress = playbackProgress(
        {
          status: 'playing',
          shotId: playbackShotId,
          runId: playbackRunId,
          startedAt: playbackStartedAt,
        },
        now,
        duration,
      )
      progressRef.current = progress
      drawRef.current(progress)
      if (progress < 1) frame = requestAnimationFrame(render)
      else onPlaybackFinished()
    }
    progressRef.current = 0
    frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  }, [
    playback.status,
    playbackRunId,
    playbackShotId,
    playbackStartedAt,
    completedShot?.id,
    onPlaybackFinished,
  ])
  const eventPoint = (event: {
    clientX: number
    clientY: number
  }): NormalizedPoint => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    }
  }
  const updatePointerAim = (
    end: NormalizedPoint,
    startedAt: number,
  ): ShotInput | null =>
    pointerGestureToShotInput(
      activePointer.current!.start,
      end,
      performance.now() - startedAt,
      { width: 1, height: 1 },
    )
  const cancelPointer = (event?: PointerEvent<HTMLCanvasElement>): void => {
    const pointer = activePointer.current
    if (!pointer || (event && pointer.id !== event.pointerId)) return
    if (event?.currentTarget.hasPointerCapture(pointer.id))
      event.currentTarget.releasePointerCapture(pointer.id)
    activePointer.current = null
    onAimChange(null)
  }
  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (playback.status === 'playing' || activePointer.current) return
    const point = eventPoint(event)
    const ball = scenario.geometry.ballStart
    if (Math.hypot(point.x - ball.x, point.y - ball.y) > 0.06) return
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointer.current = {
      id: event.pointerId,
      start: point,
      startedAt: performance.now(),
    }
    onAimChange(null)
  }
  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    const pointer = activePointer.current
    if (!pointer || pointer.id !== event.pointerId) return
    onAimChange(updatePointerAim(eventPoint(event), pointer.startedAt))
  }
  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>): void => {
    const pointer = activePointer.current
    if (!pointer || pointer.id !== event.pointerId) return
    const input = updatePointerAim(eventPoint(event), pointer.startedAt)
    cancelPointer(event)
    if (input) onShot(input)
  }
  const updateKeyboardPreview = useCallback(
    (nextAim: KeyboardAim, elapsedMs: number): void =>
      onAimChange(keyboardShotInput(nextAim, elapsedMs)),
    [onAimChange],
  )
  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>): void => {
    if (playback.status === 'playing') return
    if (event.key.startsWith('Arrow')) {
      const next = moveKeyboardAim(keyboardAim, event.key)
      setKeyboardAim(next)
      updateKeyboardPreview(
        next,
        chargeStartedAt.current === null
          ? 480
          : performance.now() - chargeStartedAt.current,
      )
      event.preventDefault()
    } else if (event.key === ' ' && chargeStartedAt.current === null) {
      chargeStartedAt.current = performance.now()
      setIsKeyboardCharging(true)
      updateKeyboardPreview(keyboardAim, 0)
      event.preventDefault()
    }
  }
  const handleKeyUp = (event: KeyboardEvent<HTMLCanvasElement>): void => {
    if (event.key !== ' ' || chargeStartedAt.current === null) return
    const input = keyboardShotInput(
      keyboardAim,
      performance.now() - chargeStartedAt.current,
    )
    chargeStartedAt.current = null
    setIsKeyboardCharging(false)
    onAimChange(null)
    onShot(input)
    event.preventDefault()
  }
  useEffect(() => {
    if (!isKeyboardCharging) return
    let frame = 0
    const update = (now: number): void => {
      if (chargeStartedAt.current !== null) {
        updateKeyboardPreview(keyboardAim, now - chargeStartedAt.current)
        frame = requestAnimationFrame(update)
      }
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [isKeyboardCharging, keyboardAim, updateKeyboardPreview])
  return (
    <canvas
      ref={canvasRef}
      className="shooting-canvas"
      width={WIDTH}
      height={HEIGHT}
      tabIndex={0}
      role="application"
      aria-label="Laboratoire de frappe : pressez le ballon et glissez, ou utilisez les flèches puis espace."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelPointer}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    />
  )
}

const drawScene = (
  context: CanvasRenderingContext2D,
  scenario: ShotScenario,
  aim: ShotInput | null,
  resolution: ShotResolution | null,
  progress: number,
  debug: VisualDebugOptions,
): void => {
  drawBackground(context)
  drawGoal(context, scenario, debug)
  const { ballStart, shooterPosition } = scenario.geometry
  if (debug.ballPath && resolution)
    drawPath(
      context,
      ballStart,
      animationDestination(resolution),
      '#f7fbff',
      [5, 6],
    )
  if (debug.goalkeeperPath && resolution)
    drawGoalkeeperPath(context, resolution)
  if (aim) drawAim(context, ballStart, aim, scenario, debug.target)
  if (debug.interception && resolution?.goalkeeperDecision.interceptionPoint)
    drawMarker(
      context,
      resolution.goalkeeperDecision.interceptionPoint,
      '#ffb258',
      'INTERCEPTION',
    )
  if (debug.blockPoint && resolution?.defenderBlockPoint)
    drawMarker(context, resolution.defenderBlockPoint, '#c5ced7', 'BLOC')
  for (const defender of scenario.geometry.defenderPositions)
    drawToken(context, defender, '#8e9aa7', '#d7dfe7', 'D')
  drawToken(
    context,
    goalkeeperAtProgress(
      resolution,
      progress,
      scenario.geometry.goalkeeperStart,
    ),
    '#df842d',
    '#ffd29b',
    'G',
  )
  drawToken(context, shooterPosition, '#3d6dcf', '#9fc2ff', 'T')
  drawBall(
    context,
    resolution ? ballAtProgress(resolution, ballStart, progress) : ballStart,
  )
  if (resolution && progress >= 1)
    drawOutcomeOverlay(context, resolution.outcome)
}
const drawBackground = (context: CanvasRenderingContext2D): void => {
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT)
  gradient.addColorStop(0, '#183b30')
  gradient.addColorStop(1, '#0d251d')
  context.fillStyle = gradient
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = 'rgba(218,241,226,.045)'
  context.fillRect(0, 0, WIDTH, HEIGHT)
}
const drawGoal = (
  context: CanvasRenderingContext2D,
  scenario: ShotScenario,
  debug: VisualDebugOptions,
): void => {
  const goal = scenario.geometry.goalMouth
  const left = goal.left * WIDTH
  const right = goal.right * WIDTH
  const top = goal.top * HEIGHT
  const bottom = goal.bottom * HEIGHT
  context.fillStyle = 'rgba(212,238,228,.09)'
  context.fillRect(left, top, right - left, bottom - top)
  context.strokeStyle = 'rgba(221,242,231,.2)'
  context.lineWidth = 1
  for (let x = left + 22; x < right; x += 22) {
    context.beginPath()
    context.moveTo(x, top)
    context.lineTo(x, bottom)
    context.stroke()
  }
  for (let y = top + 18; y < bottom; y += 18) {
    context.beginPath()
    context.moveTo(left, y)
    context.lineTo(right, y)
    context.stroke()
  }
  context.strokeStyle = '#edf8ec'
  context.lineWidth = 6
  context.beginPath()
  context.moveTo(left, bottom)
  context.lineTo(left, top)
  context.lineTo(right, top)
  context.lineTo(right, bottom)
  context.stroke()
  if (debug.target && scenario.context.goalkeeperCoversNearPost) {
    const nearRight = scenario.geometry.ballStart.x > 0.5
    const x = nearRight ? right : left
    context.fillStyle = '#ffcf92'
    context.font = '700 11px system-ui'
    context.textAlign = nearRight ? 'right' : 'left'
    context.fillText('1er POTEAU', x + (nearRight ? -8 : 8), top - 10)
  }
}
const drawAim = (
  context: CanvasRenderingContext2D,
  start: NormalizedPoint,
  aim: ShotInput,
  scenario: ShotScenario,
  showTarget: boolean,
): void => {
  const target = {
    x: start.x + aim.normalizedDirectionX * 0.55,
    y: start.y + aim.normalizedDirectionY * 0.6,
  }
  const inside = isInsideGoalMouth(target, scenario.geometry.goalMouth)
  const color = inside ? '#b9f47a' : '#ff9a6b'
  drawPath(context, start, target, color, [9, 6])
  if (showTarget) drawReticle(context, target, color)
  context.fillStyle = 'rgba(4,14,10,.72)'
  context.fillRect(20, 445, 310, 38)
  context.fillStyle = '#496454'
  context.fillRect(32, 454, 120, 8)
  context.fillStyle = color
  context.fillRect(32, 454, 120 * aim.normalizedPower, 8)
  context.strokeStyle = '#d9f3c8'
  context.lineWidth = 2
  context.beginPath()
  context.arc(218, 458, 11, 0, Math.PI * 2)
  context.stroke()
  context.fillStyle = color
  context.beginPath()
  context.arc(207 + aim.releaseTiming * 22, 458, 5, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#eff9e8'
  context.font = '700 12px system-ui'
  context.textAlign = 'left'
  context.fillText(
    `PUISSANCE ${Math.round(aim.normalizedPower * 100)}%`,
    32,
    475,
  )
  context.fillText(`TIMING ${Math.round(aim.releaseTiming * 100)}%`, 238, 475)
}
const animationDestination = (resolution: ShotResolution): NormalizedPoint =>
  resolution.outcome === 'saved'
    ? (resolution.goalkeeperDecision.interceptionPoint ??
      resolution.actualBallDestination)
    : resolution.outcome === 'blocked'
      ? (resolution.defenderBlockPoint ?? resolution.actualBallDestination)
      : resolution.actualBallDestination
const ballAtProgress = (
  resolution: ShotResolution,
  start: NormalizedPoint,
  progress: number,
): NormalizedPoint =>
  resolution.outcome === 'post' &&
  resolution.postBounceDestination &&
  progress > 0.72
    ? interpolate(
        resolution.actualBallDestination,
        resolution.postBounceDestination,
        (progress - 0.72) / 0.28,
      )
    : interpolate(start, animationDestination(resolution), easeOut(progress))
const goalkeeperAtProgress = (
  resolution: ShotResolution | null,
  progress: number,
  start: NormalizedPoint,
): NormalizedPoint => {
  if (!resolution) return start
  const movement = resolution.goalkeeperDecision.movement
  const staged =
    movement.wrongStep && progress < 0.28
      ? interpolate(
          movement.start,
          movement.wrongStep,
          easeOut(progress / 0.28),
        )
      : movement.wrongStep
        ? interpolate(
            movement.wrongStep,
            movement.final,
            easeOut((progress - 0.28) / 0.72),
          )
        : interpolate(movement.start, movement.final, easeOut(progress))
  return staged
}
const drawGoalkeeperPath = (
  context: CanvasRenderingContext2D,
  resolution: ShotResolution,
): void => {
  const movement = resolution.goalkeeperDecision.movement
  if (movement.wrongStep) {
    drawPath(context, movement.start, movement.wrongStep, '#ffb258', [5, 4])
    drawPath(context, movement.wrongStep, movement.final, '#ffb258', [5, 4])
  } else drawPath(context, movement.start, movement.final, '#ffb258', [5, 4])
}
const drawPath = (
  context: CanvasRenderingContext2D,
  from: NormalizedPoint,
  to: NormalizedPoint,
  color: string,
  dash: readonly number[],
): void => {
  const start = toPixels(from)
  const end = toPixels(to)
  context.strokeStyle = color
  context.lineWidth = 2.5
  context.setLineDash([...dash])
  context.beginPath()
  context.moveTo(start.x, start.y)
  context.lineTo(end.x, end.y)
  context.stroke()
  context.setLineDash([])
}
const drawToken = (
  context: CanvasRenderingContext2D,
  point: NormalizedPoint,
  fill: string,
  ring: string,
  label: string,
): void => {
  const pixel = toPixels(point)
  context.fillStyle = 'rgba(0,0,0,.22)'
  context.beginPath()
  context.arc(pixel.x + 3, pixel.y + 4, 20, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = fill
  context.beginPath()
  context.arc(pixel.x, pixel.y, 20, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = ring
  context.lineWidth = 2
  context.stroke()
  context.fillStyle = '#fff'
  context.font = '800 13px system-ui'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, pixel.x, pixel.y + 1)
  context.textBaseline = 'alphabetic'
}
const drawBall = (
  context: CanvasRenderingContext2D,
  point: NormalizedPoint,
): void => {
  const pixel = toPixels(point)
  context.fillStyle = 'rgba(0,0,0,.3)'
  context.beginPath()
  context.arc(pixel.x + 2, pixel.y + 3, 9, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#fff'
  context.beginPath()
  context.arc(pixel.x, pixel.y, 9, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#aab5c3'
  context.lineWidth = 1.5
  context.stroke()
}
const drawReticle = (
  context: CanvasRenderingContext2D,
  point: NormalizedPoint,
  color: string,
): void => {
  const pixel = toPixels(point)
  context.strokeStyle = color
  context.lineWidth = 2
  context.beginPath()
  context.arc(pixel.x, pixel.y, 15, 0, Math.PI * 2)
  context.stroke()
  context.beginPath()
  context.moveTo(pixel.x - 21, pixel.y)
  context.lineTo(pixel.x + 21, pixel.y)
  context.moveTo(pixel.x, pixel.y - 21)
  context.lineTo(pixel.x, pixel.y + 21)
  context.stroke()
}
const drawMarker = (
  context: CanvasRenderingContext2D,
  point: NormalizedPoint,
  color: string,
  label: string,
): void => {
  drawReticle(context, point, color)
  const pixel = toPixels(point)
  context.fillStyle = color
  context.font = '700 10px system-ui'
  context.textAlign = 'center'
  context.fillText(label, pixel.x, pixel.y - 25)
}
const drawOutcomeOverlay = (
  context: CanvasRenderingContext2D,
  outcome: ShotResolution['outcome'],
): void => {
  const text = {
    goal: 'BUT',
    saved: 'ARRÊT',
    blocked: 'BLOC',
    post: 'POTEAU',
    'off-target': 'HORS CADRE',
  }[outcome]
  context.fillStyle = 'rgba(6,19,13,.78)'
  context.fillRect(264, 402, 272, 56)
  context.strokeStyle =
    outcome === 'goal'
      ? '#b9f47a'
      : outcome === 'saved' || outcome === 'blocked'
        ? '#ffd078'
        : '#ffab9e'
  context.lineWidth = 2
  context.strokeRect(264, 402, 272, 56)
  context.fillStyle = '#fff'
  context.font = '900 28px system-ui'
  context.textAlign = 'center'
  context.fillText(text, WIDTH / 2, 439)
}
const easeOut = (progress: number): number =>
  1 - (1 - clamp(progress)) * (1 - clamp(progress))
