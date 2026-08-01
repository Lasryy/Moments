import { useEffect, useRef, useState } from 'react'
import { normalizeShotInput } from '../../../moments/shooting/normalizeShotInput'
import type {
  ShotInput,
  ShotResolution,
  ShotScenario,
} from '../../../moments/shooting/types'

interface ShootingCanvasProps {
  readonly scenario: ShotScenario
  readonly resolution: ShotResolution
  readonly animationKey: number
  readonly onShot: (input: ShotInput) => void
}
const WIDTH = 800
const HEIGHT = 500
const BALL = { x: 0.5, y: 0.86 }
const MAX_GESTURE = 260
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export const ShootingCanvas = ({
  scenario,
  resolution,
  animationKey,
  onShot,
}: ShootingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [aim, setAim] = useState<ShotInput | null>(null)
  const pointerRef = useRef<{
    id: number
    x: number
    y: number
    startedAt: number
  } | null>(null)
  const keyboardAimRef = useRef({ x: 0, y: -0.8 })
  const keyboardStartedAt = useRef<number | null>(null)
  const toCanvas = (event: {
    clientX: number
    clientY: number
  }): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    }
  }
  const toInput = (x: number, y: number, startedAt: number): ShotInput => {
    const dx = x - BALL.x * WIDTH
    const dy = y - BALL.y * HEIGHT
    const distance = Math.hypot(dx, dy)
    const scale = distance > 0 ? Math.min(1, MAX_GESTURE / distance) : 1
    return normalizeShotInput({
      normalizedDirectionX: clamp((dx / MAX_GESTURE) * scale, -1, 1),
      normalizedDirectionY: clamp((dy / MAX_GESTURE) * scale, -1, 1),
      normalizedPower: clamp(distance / MAX_GESTURE, 0, 1),
      releaseTiming: clamp((performance.now() - startedAt) / 1200, 0, 1),
    })
  }
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = toCanvas(event)
    if (Math.hypot(point.x - BALL.x * WIDTH, point.y - BALL.y * HEIGHT) > 38)
      return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerRef.current = {
      id: event.pointerId,
      x: point.x,
      y: point.y,
      startedAt: performance.now(),
    }
    setAim(toInput(point.x, point.y, pointerRef.current.startedAt))
  }
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerRef.current
    if (!pointer || pointer.id !== event.pointerId) return
    const point = toCanvas(event)
    pointer.x = point.x
    pointer.y = point.y
    setAim(toInput(point.x, point.y, pointer.startedAt))
  }
  const releasePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerRef.current
    if (!pointer || pointer.id !== event.pointerId) return
    const point = toCanvas(event)
    const input = toInput(point.x, point.y, pointer.startedAt)
    pointerRef.current = null
    setAim(null)
    onShot(input)
  }
  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const increment = 0.12
    if (event.key === 'ArrowLeft')
      keyboardAimRef.current.x = clamp(
        keyboardAimRef.current.x - increment,
        -1,
        1,
      )
    else if (event.key === 'ArrowRight')
      keyboardAimRef.current.x = clamp(
        keyboardAimRef.current.x + increment,
        -1,
        1,
      )
    else if (event.key === 'ArrowUp')
      keyboardAimRef.current.y = clamp(
        keyboardAimRef.current.y - increment,
        -1,
        1,
      )
    else if (event.key === 'ArrowDown')
      keyboardAimRef.current.y = clamp(
        keyboardAimRef.current.y + increment,
        -1,
        1,
      )
    else if (event.key === ' ' && keyboardStartedAt.current === null)
      keyboardStartedAt.current = performance.now()
    else return
    event.preventDefault()
  }
  const handleKeyUp = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key !== ' ' || keyboardStartedAt.current === null) return
    const duration = clamp(
      (performance.now() - keyboardStartedAt.current) / 1200,
      0,
      1,
    )
    keyboardStartedAt.current = null
    const direction = keyboardAimRef.current
    const length = Math.hypot(direction.x, direction.y)
    onShot(
      normalizeShotInput({
        normalizedDirectionX: direction.x / Math.max(1, length),
        normalizedDirectionY: direction.y / Math.max(1, length),
        normalizedPower: duration,
        releaseTiming: duration,
      }),
    )
  }
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const startedAt = performance.now()
    const duration = reducedMotion ? 1 : 620
    let frame = 0
    const render = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      drawScene(context, scenario, resolution, aim, progress)
      if (progress < 1) frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  }, [scenario, resolution, aim, animationKey])
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
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    />
  )
}

const drawScene = (
  context: CanvasRenderingContext2D,
  scenario: ShotScenario,
  resolution: ShotResolution,
  aim: ShotInput | null,
  progress: number,
): void => {
  context.clearRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#1a5539'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#244b37'
  context.fillRect(0, 0, WIDTH, 96)
  context.strokeStyle = '#e7f2db'
  context.lineWidth = 5
  context.strokeRect(92, 32, 616, 360)
  context.strokeStyle = 'rgba(231,242,219,.35)'
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
  const target = resolution.actualBallDestination
  const goalkeeperX =
    resolution.goalkeeperDecision.diveDirection === 'left'
      ? 0.31
      : resolution.goalkeeperDecision.diveDirection === 'right'
        ? 0.69
        : 0.5
  drawPerson(context, goalkeeperX * WIDTH, 168, '#f0a74c', 18)
  if (scenario.context.defenderCount > 0)
    drawPerson(context, 0.5 * WIDTH + 68 * progress, 334, '#d0d8eb', 15)
  drawPerson(context, BALL.x * WIDTH - 45, BALL.y * HEIGHT + 26, '#283b7a', 17)
  context.strokeStyle = '#d8f48b'
  context.setLineDash([5, 4])
  context.lineWidth = 2
  context.beginPath()
  context.arc(
    resolution.targetPosition.x * WIDTH,
    resolution.targetPosition.y * HEIGHT,
    18,
    0,
    Math.PI * 2,
  )
  context.stroke()
  context.setLineDash([])
  if (aim) {
    context.strokeStyle = '#d8f48b'
    context.setLineDash([8, 6])
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(BALL.x * WIDTH, BALL.y * HEIGHT)
    context.lineTo(
      BALL.x * WIDTH + aim.normalizedDirectionX * MAX_GESTURE,
      BALL.y * HEIGHT + aim.normalizedDirectionY * MAX_GESTURE,
    )
    context.stroke()
    context.setLineDash([])
  }
  const eased = 1 - (1 - progress) * (1 - progress)
  const ballX = (BALL.x + (target.x - BALL.x) * eased) * WIDTH
  const ballY =
    (BALL.y + (target.y - BALL.y) * eased - Math.sin(eased * Math.PI) * 0.12) *
    HEIGHT
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(ballX, ballY, 11, 0, Math.PI * 2)
  context.fill()
  if (progress >= 1) {
    context.fillStyle = '#102419'
    context.font = '700 24px system-ui'
    context.textAlign = 'center'
    context.fillText(outcomeLabel(resolution.outcome), WIDTH / 2, 465)
  }
}
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
