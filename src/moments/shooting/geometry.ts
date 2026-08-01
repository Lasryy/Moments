import type {
  GoalFrameCollision,
  GoalMouthGeometry,
  NormalizedPoint,
} from './types'

/** One shared coordinate system for the deterministic engine and the Canvas. */
export const DEFAULT_GOAL_MOUTH: GoalMouthGeometry = {
  left: 0.2,
  right: 0.8,
  top: 0.12,
  bottom: 0.5,
  postRadius: 0.012,
  crossbarRadius: 0.012,
}

export const BALL_RADIUS = 0.014

export const isInsideGoalMouth = (
  point: NormalizedPoint,
  goal: GoalMouthGeometry,
): boolean =>
  point.x > goal.left &&
  point.x < goal.right &&
  point.y > goal.top &&
  point.y < goal.bottom

export const classifyShotDestination = (
  destination: NormalizedPoint,
  goal: GoalMouthGeometry,
): 'on-target' | 'off-target' =>
  isInsideGoalMouth(destination, goal) ? 'on-target' : 'off-target'

const distanceToSegment = (
  point: NormalizedPoint,
  start: NormalizedPoint,
  end: NormalizedPoint,
): number => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0)
    return Math.hypot(point.x - start.x, point.y - start.y)
  const progress = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ),
  )
  return Math.hypot(
    point.x - (start.x + dx * progress),
    point.y - (start.y + dy * progress),
  )
}

/** Returns a real frame collision; it never relies on a later random draw. */
export const resolveGoalFrameCollision = (
  trajectoryStart: NormalizedPoint,
  trajectoryEnd: NormalizedPoint,
  goal: GoalMouthGeometry,
  ballRadius = BALL_RADIUS,
): GoalFrameCollision => {
  const postThreshold = goal.postRadius + ballRadius
  const crossbarThreshold = goal.crossbarRadius + ballRadius
  const leftDistance = distanceToSegment(
    { x: goal.left, y: goal.bottom },
    trajectoryStart,
    trajectoryEnd,
  )
  const rightDistance = distanceToSegment(
    { x: goal.right, y: goal.bottom },
    trajectoryStart,
    trajectoryEnd,
  )
  const barDistance = distanceToSegment(
    { x: (goal.left + goal.right) / 2, y: goal.top },
    trajectoryStart,
    trajectoryEnd,
  )
  if (barDistance <= crossbarThreshold) return 'crossbar'
  if (leftDistance <= postThreshold) return 'left-post'
  if (rightDistance <= postThreshold) return 'right-post'
  return null
}

export const clampToGoal = (
  point: NormalizedPoint,
  goal: GoalMouthGeometry,
  margin = 0,
): NormalizedPoint => ({
  x: Math.min(goal.right - margin, Math.max(goal.left + margin, point.x)),
  y: Math.min(goal.bottom - margin, Math.max(goal.top + margin, point.y)),
})

export const screenSideForPoint = (
  point: NormalizedPoint,
  centerX: number,
): 'left' | 'right' | 'stay' =>
  point.x < centerX - 0.025
    ? 'left'
    : point.x > centerX + 0.025
      ? 'right'
      : 'stay'
