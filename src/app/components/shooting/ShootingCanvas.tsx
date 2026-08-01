import { useCallback, useEffect, useRef, useState } from 'react'
import {
  keyboardShotInput,
  moveKeyboardAim,
  pointerGestureToShotInput,
} from './shotControls'
import type { KeyboardAim } from './shotControls'
import type { KeyboardEvent, PointerEvent } from 'react'
import type {
  NormalizedPoint,
  ShotInput,
  ShotResolution,
  ShotScenario,
} from '../../../moments/shooting/types'

export interface VisualDebugOptions {
  readonly ballPath: boolean
  readonly goalkeeperPath: boolean
  readonly interception: boolean
  readonly blockPoint: boolean
  readonly target: boolean
}
interface ShootingCanvasProps {
  readonly scenario: ShotScenario
  readonly aim: ShotInput | null
  readonly completedShot: {
    readonly input: ShotInput
    readonly resolution: ShotResolution
  } | null
  readonly animationKey: number
  readonly debug: VisualDebugOptions
  readonly onAimChange: (input: ShotInput | null) => void
  readonly onShot: (input: ShotInput) => void
}
const WIDTH = 800
const HEIGHT = 500
const GOAL = { left: 92, right: 708, top: 42, bottom: 352 }
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
  animationKey,
  debug,
  onAimChange,
  onShot,
}: ShootingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activePointer = useRef<{
    id: number
    start: NormalizedPoint
    startedAt: number
  } | null>(null)
  const chargeStartedAt = useRef<number | null>(null)
  const [keyboardAim, setKeyboardAim] = useState<KeyboardAim>({
    directionX: 0,
    directionY: -0.82,
  })
  const [isKeyboardCharging, setIsKeyboardCharging] = useState(false)
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
    if (activePointer.current) return
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
      return
    }
    if (event.key === ' ' && chargeStartedAt.current === null) {
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
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const startedAt = performance.now()
    const duration = completedShot ? (reducedMotion ? 1 : 950) : 0
    let frame = 0
    const render = (now: number): void => {
      const progress =
        duration === 0 ? 0 : Math.min(1, (now - startedAt) / duration)
      drawScene(
        context,
        scenario,
        aim,
        completedShot?.resolution ?? null,
        progress,
        debug,
      )
      if (progress < 1) frame = requestAnimationFrame(render)
    }
    render(startedAt)
    return () => cancelAnimationFrame(frame)
  }, [scenario, aim, completedShot, animationKey, debug])
  return (
    <canvas
      ref={canvasRef}
      className="shooting-canvas"
      width={WIDTH}
      height={HEIGHT}
      tabIndex={0}
      role="application"
      aria-label="Terrain de frappe. Pressez le ballon et glissez, ou utilisez les flèches puis espace."
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
  drawPitch(context, scenario)
  const ballStart = scenario.geometry.ballStart
  const goalkeeperPath = resolveGoalkeeperPath(
    resolution,
    scenario.geometry.goalkeeperStart,
  )
  if (debug.goalkeeperPath && resolution)
    drawPath(
      context,
      goalkeeperPath.start,
      goalkeeperPath.end,
      '#ffb258',
      [6, 5],
    )
  if (debug.ballPath && resolution)
    drawPath(
      context,
      ballStart,
      animationDestination(resolution),
      '#f7fbff',
      [5, 6],
    )
  if (aim) drawAim(context, ballStart, aim, debug.target)
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
  const goalkeeperPosition = interpolate(
    goalkeeperPath.start,
    goalkeeperPath.end,
    easeOut(clamp((progress - 0.08) / 0.7)),
  )
  drawToken(context, goalkeeperPosition, '#df842d', '#ffd29b', 'G')
  drawToken(
    context,
    { x: ballStart.x - 0.048, y: Math.min(0.96, ballStart.y + 0.055) },
    '#3d6dcf',
    '#9fc2ff',
    'T',
  )
  const ball = resolution
    ? ballAtProgress(resolution, ballStart, progress)
    : ballStart
  drawBall(context, ball)
  if (resolution && progress >= 1)
    drawOutcomeOverlay(context, resolution.outcome)
}
const drawPitch = (
  context: CanvasRenderingContext2D,
  scenario: ShotScenario,
): void => {
  context.clearRect(0, 0, WIDTH, HEIGHT)
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT)
  gradient.addColorStop(0, '#173e31')
  gradient.addColorStop(1, '#0d251d')
  context.fillStyle = gradient
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = 'rgba(218,241,226,.08)'
  context.fillRect(
    GOAL.left,
    GOAL.top,
    GOAL.right - GOAL.left,
    GOAL.bottom - GOAL.top,
  )
  context.strokeStyle = 'rgba(226,242,229,.26)'
  context.lineWidth = 1
  for (let x = GOAL.left + 35; x < GOAL.right; x += 35) {
    context.beginPath()
    context.moveTo(x, GOAL.top)
    context.lineTo(x, GOAL.bottom)
    context.stroke()
  }
  for (let y = GOAL.top + 28; y < GOAL.bottom; y += 28) {
    context.beginPath()
    context.moveTo(GOAL.left, y)
    context.lineTo(GOAL.right, y)
    context.stroke()
  }
  context.strokeStyle = '#edf8ec'
  context.lineWidth = 6
  context.strokeRect(
    GOAL.left,
    GOAL.top,
    GOAL.right - GOAL.left,
    GOAL.bottom - GOAL.top,
  )
  context.strokeStyle = 'rgba(237,248,236,.72)'
  context.lineWidth = 2
  context.strokeRect(150, 42, 500, 220)
  context.beginPath()
  context.arc(WIDTH / 2, 262, 95, 0, Math.PI)
  context.stroke()
  if (scenario.context.goalkeeperCoversNearPost) {
    const nearPostX =
      scenario.geometry.ballStart.x > 0.5 ? GOAL.right : GOAL.left
    context.strokeStyle = '#ffbd72'
    context.lineWidth = 8
    context.beginPath()
    context.moveTo(nearPostX, GOAL.top)
    context.lineTo(nearPostX, GOAL.bottom)
    context.stroke()
    context.fillStyle = '#ffcf92'
    context.font = '700 12px system-ui'
    context.textAlign = nearPostX === GOAL.right ? 'right' : 'left'
    context.fillText(
      '1er POTEAU',
      nearPostX + (nearPostX === GOAL.right ? -10 : 10),
      28,
    )
  }
}
const drawAim = (
  context: CanvasRenderingContext2D,
  start: NormalizedPoint,
  aim: ShotInput,
  showTarget: boolean,
): void => {
  const target = {
    x: start.x + aim.normalizedDirectionX * 0.5,
    y: start.y + aim.normalizedDirectionY * 0.9,
  }
  drawPath(context, start, target, '#b9f47a', [9, 6])
  if (showTarget) drawReticle(context, target, '#b9f47a')
  const powerWidth = 150 * aim.normalizedPower
  context.fillStyle = 'rgba(4,14,10,.72)'
  context.fillRect(20, 445, 280, 38)
  context.fillStyle = '#496454'
  context.fillRect(32, 454, 120, 8)
  context.fillStyle = '#b9f47a'
  context.fillRect(32, 454, powerWidth * 0.8, 8)
  context.strokeStyle = '#d9f3c8'
  context.lineWidth = 2
  context.beginPath()
  context.arc(218, 458, 11, 0, Math.PI * 2)
  context.stroke()
  const timingX = 207 + aim.releaseTiming * 22
  context.fillStyle = '#b9f47a'
  context.beginPath()
  context.arc(timingX, 458, 5, 0, Math.PI * 2)
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
const ballAtProgress = (
  resolution: ShotResolution,
  start: NormalizedPoint,
  progress: number,
): NormalizedPoint => {
  if (
    resolution.outcome === 'post' &&
    resolution.postBounceDestination &&
    progress > 0.72
  )
    return interpolate(
      resolution.actualBallDestination,
      resolution.postBounceDestination,
      (progress - 0.72) / 0.28,
    )
  return interpolate(start, animationDestination(resolution), easeOut(progress))
}
const animationDestination = (resolution: ShotResolution): NormalizedPoint =>
  resolution.outcome === 'saved'
    ? (resolution.goalkeeperDecision.interceptionPoint ??
      resolution.actualBallDestination)
    : resolution.outcome === 'blocked'
      ? (resolution.defenderBlockPoint ?? resolution.actualBallDestination)
      : resolution.actualBallDestination
const resolveGoalkeeperPath = (
  resolution: ShotResolution | null,
  start: NormalizedPoint,
): { readonly start: NormalizedPoint; readonly end: NormalizedPoint } => {
  if (!resolution) return { start, end: start }
  if (
    resolution.goalkeeperDecision.reachesBall &&
    resolution.goalkeeperDecision.interceptionPoint
  )
    return { start, end: resolution.goalkeeperDecision.interceptionPoint }
  const direction = resolution.goalkeeperDecision.diveDirection
  return {
    start,
    end:
      direction === 'left'
        ? { x: 0.23, y: 0.42 }
        : direction === 'right'
          ? { x: 0.77, y: 0.42 }
          : start,
  }
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
  1 - (1 - progress) * (1 - progress)
