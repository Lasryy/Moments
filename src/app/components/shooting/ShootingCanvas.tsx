import { useCallback, useEffect, useRef, useState } from 'react'
import {
  keyboardShotInput,
  moveKeyboardAim,
  pointerGestureToShotInput,
} from './shotControls'
import type { KeyboardAim } from './shotControls'
import type {
  NormalizedPoint,
  ShotInput,
  ShotResolution,
  ShotScenario,
} from '../../../moments/shooting/types'

interface ShootingCanvasProps {
  readonly scenario: ShotScenario
  readonly aim: ShotInput | null
  readonly completedShot: {
    readonly input: ShotInput
    readonly resolution: ShotResolution
  } | null
  readonly animationKey: number
  readonly onAimChange: (input: ShotInput | null) => void
  readonly onShot: (input: ShotInput) => void
}
const WIDTH = 800
const HEIGHT = 500
const pointToPixels = (point: NormalizedPoint): NormalizedPoint => ({
  x: point.x * WIDTH,
  y: point.y * HEIGHT,
})

export const ShootingCanvas = ({
  scenario,
  aim,
  completedShot,
  animationKey,
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
  const cancelPointer = (event?: React.PointerEvent<HTMLCanvasElement>) => {
    const pointer = activePointer.current
    if (!pointer || (event && pointer.id !== event.pointerId)) return
    if (event?.currentTarget.hasPointerCapture(pointer.id))
      event.currentTarget.releasePointerCapture(pointer.id)
    activePointer.current = null
    onAimChange(null)
  }
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
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
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointer = activePointer.current
    if (!pointer || pointer.id !== event.pointerId) return
    onAimChange(updatePointerAim(eventPoint(event), pointer.startedAt))
  }
  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointer = activePointer.current
    if (!pointer || pointer.id !== event.pointerId) return
    const input = updatePointerAim(eventPoint(event), pointer.startedAt)
    cancelPointer(event)
    if (input) onShot(input)
  }
  const updateKeyboardPreview = useCallback(
    (nextAim: KeyboardAim, elapsedMs: number) => {
      const preview = keyboardShotInput(nextAim, elapsedMs)
      onAimChange(preview)
    },
    [onAimChange],
  )
  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key.startsWith('Arrow')) {
      const nextAim = moveKeyboardAim(keyboardAim, event.key)
      setKeyboardAim(nextAim)
      updateKeyboardPreview(
        nextAim,
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
  const handleKeyUp = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
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
    const update = (now: number) => {
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
    const duration = completedShot ? (reducedMotion ? 1 : 650) : 0
    let frame = 0
    const render = (now: number) => {
      const progress =
        duration === 0 ? 0 : Math.min(1, (now - startedAt) / duration)
      drawScene(
        context,
        scenario,
        aim,
        completedShot?.resolution ?? null,
        progress,
      )
      if (progress < 1) frame = requestAnimationFrame(render)
    }
    render(startedAt)
    return () => cancelAnimationFrame(frame)
  }, [scenario, aim, completedShot, animationKey])
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
): void => {
  context.clearRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#1a5539'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.strokeStyle = '#e7f2db'
  context.lineWidth = 5
  context.strokeRect(92, 32, 616, 360)
  context.strokeStyle = 'rgba(231,242,219,.28)'
  context.lineWidth = 1
  for (let x = 120; x < 700; x += 38) {
    context.beginPath()
    context.moveTo(x, 32)
    context.lineTo(x, 392)
    context.stroke()
  }
  for (let y = 58; y < 392; y += 36) {
    context.beginPath()
    context.moveTo(92, y)
    context.lineTo(708, y)
    context.stroke()
  }
  const ballStart = scenario.geometry.ballStart
  const goalkeeperPosition = goalkeeperAtProgress(
    resolution,
    progress,
    scenario.geometry.goalkeeperStart,
  )
  drawPerson(
    context,
    goalkeeperPosition.x * WIDTH,
    goalkeeperPosition.y * HEIGHT,
    '#f0a74c',
    18,
  )
  for (const defender of scenario.geometry.defenderPositions)
    drawPerson(context, defender.x * WIDTH, defender.y * HEIGHT, '#d0d8eb', 15)
  drawPerson(
    context,
    ballStart.x * WIDTH - 42,
    ballStart.y * HEIGHT + 22,
    '#283b7a',
    17,
  )
  if (aim) drawAim(context, ballStart, aim)
  const ball = resolution
    ? ballAtProgress(resolution, ballStart, progress)
    : ballStart
  context.fillStyle = '#fff'
  context.beginPath()
  context.arc(ball.x * WIDTH, ball.y * HEIGHT, 11, 0, Math.PI * 2)
  context.fill()
  if (resolution && progress >= 1) {
    context.fillStyle = '#102419'
    context.font = '700 24px system-ui'
    context.textAlign = 'center'
    context.fillText(outcomeLabel(resolution.outcome), WIDTH / 2, 465)
  }
}
const drawAim = (
  context: CanvasRenderingContext2D,
  start: NormalizedPoint,
  aim: ShotInput,
): void => {
  const target = {
    x: start.x + aim.normalizedDirectionX * 0.5,
    y: start.y + aim.normalizedDirectionY * 0.9,
  }
  const from = pointToPixels(start)
  const to = pointToPixels(target)
  context.strokeStyle = '#d8f48b'
  context.setLineDash([8, 6])
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
  context.setLineDash([])
  context.fillStyle = '#d8f48b'
  context.font = '700 15px system-ui'
  context.textAlign = 'left'
  context.fillText(
    `Puissance ${Math.round(aim.normalizedPower * 100)} % · Timing ${Math.round(aim.releaseTiming * 100)} %`,
    18,
    478,
  )
}
const ballAtProgress = (
  resolution: ShotResolution,
  start: NormalizedPoint,
  progress: number,
): NormalizedPoint => {
  let end = resolution.actualBallDestination
  if (resolution.outcome === 'saved')
    end = resolution.goalkeeperDecision.interceptionPoint ?? end
  if (resolution.outcome === 'blocked')
    end = resolution.defenderBlockPoint ?? end
  if (resolution.outcome === 'post' && resolution.postBounceDestination) {
    if (progress > 0.72)
      return lerp(
        resolution.actualBallDestination,
        resolution.postBounceDestination,
        (progress - 0.72) / 0.28,
      )
    end = resolution.actualBallDestination
  }
  return lerp(start, end, 1 - (1 - progress) * (1 - progress))
}
const goalkeeperAtProgress = (
  resolution: ShotResolution | null,
  progress: number,
  start: NormalizedPoint,
): NormalizedPoint => {
  if (!resolution) return start
  const direction = resolution.goalkeeperDecision.diveDirection
  const end =
    direction === 'left'
      ? { x: 0.23, y: 0.42 }
      : direction === 'right'
        ? { x: 0.77, y: 0.42 }
        : start
  return lerp(start, end, Math.min(1, progress * 1.15))
}
const lerp = (
  from: NormalizedPoint,
  to: NormalizedPoint,
  progress: number,
): NormalizedPoint => ({
  x: from.x + (to.x - from.x) * progress,
  y: from.y + (to.y - from.y) * progress,
})
const drawPerson = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
): void => {
  context.fillStyle = color
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fill()
  context.fillRect(x - radius * 0.65, y + radius, radius * 1.3, radius * 2.2)
}
const outcomeLabel = (outcome: ShotResolution['outcome']): string =>
  ({
    goal: 'BUT',
    saved: 'ARRÊT',
    blocked: 'BLOQUÉ',
    post: 'POTEAU',
    'off-target': 'HORS CADRE',
  })[outcome]
