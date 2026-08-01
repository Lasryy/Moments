import { serializeShotInput } from '../../../moments/shooting/normalizeShotInput'
import type { ShotInput, ShotResolution } from '../../../moments/shooting/types'
const percent = (value: number): string => `${Math.round(value * 100)} %`
export const ShootingResultPanel = ({
  completedShot,
}: {
  readonly completedShot: {
    readonly input: ShotInput
    readonly resolution: ShotResolution
  } | null
}) => {
  if (!completedShot)
    return (
      <section className="lab-panel result-panel">
        <h2>Résultat</h2>
        <p className="notice">
          Préparez votre visée : aucune frappe n’est résolue avant le
          relâchement.
        </p>
      </section>
    )
  const { input, resolution: result } = completedShot
  return (
    <section className="lab-panel result-panel" aria-live="polite">
      <h2>Résultat</h2>
      <p className={`outcome outcome-${result.outcome}`}>
        {outcomeLabel(result.outcome)}
      </p>
      <dl>
        <dt>Qualité finale</dt>
        <dd>{percent(result.finalShotQuality)}</dd>
        <dt>Exécution humaine</dt>
        <dd>{percent(result.humanExecutionScore)}</dd>
        <dt>Capacités</dt>
        <dd>{percent(result.playerAbilityScore)}</dd>
        <dt>Contexte</dt>
        <dd>{percent(result.contextScore)}</dd>
        <dt>Zone visée</dt>
        <dd>{formatPoint(result.targetPosition)}</dd>
        <dt>Destination</dt>
        <dd>{formatPoint(result.actualBallDestination)}</dd>
        <dt>Gardien</dt>
        <dd>
          {directionLabel(result.goalkeeperDecision.diveDirection)} · lecture{' '}
          {result.goalkeeperDecision.readWasCorrect ? 'bonne' : 'ratée'}
        </dd>
        <dt>Réaction / portée</dt>
        <dd>
          {percent(result.goalkeeperDecision.reactionScore)} /{' '}
          {percent(result.goalkeeperDecision.reachScore)}
        </dd>
        <dt>Indice de conséquence</dt>
        <dd>{result.consequenceHint}</dd>
      </dl>
      <h3>Explications</h3>
      <ul>
        {result.explanation.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h3>Geste reproductible</h3>
      <code>{serializeShotInput(input)}</code>
    </section>
  )
}
const formatPoint = (point: {
  readonly x: number
  readonly y: number
}): string => `x ${point.x.toFixed(2)} · y ${point.y.toFixed(2)}`
const outcomeLabel = (outcome: ShotResolution['outcome']): string =>
  ({
    goal: 'BUT',
    saved: 'ARRÊT',
    blocked: 'BLOC',
    post: 'POTEAU',
    'off-target': 'HORS CADRE',
  })[outcome]
const directionLabel = (
  direction: ShotResolution['goalkeeperDecision']['diveDirection'],
): string =>
  ({
    left: 'côté gauche écran',
    right: 'côté droit écran',
    stay: 'reste au centre',
  })[direction]
