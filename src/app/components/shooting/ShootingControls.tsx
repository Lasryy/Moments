import type {
  PreferredFoot,
  ShotPlayerProfile,
  ShotScenario,
  ShotWeights,
} from '../../../moments/shooting/types'
interface ShootingControlsProps {
  readonly seed: string
  readonly scenarios: readonly ShotScenario[]
  readonly scenarioId: string
  readonly player: ShotPlayerProfile
  readonly fatigue: number
  readonly pressure: number
  readonly weights: ShotWeights
  readonly onSeedChange: (value: string) => void
  readonly onScenarioChange: (value: string) => void
  readonly onPlayerChange: (patch: Partial<ShotPlayerProfile>) => void
  readonly onFatigueChange: (value: number) => void
  readonly onPressureChange: (value: number) => void
  readonly onWeightsChange: (patch: Partial<ShotWeights>) => void
}
export const ShootingControls = ({
  seed,
  scenarios,
  scenarioId,
  player,
  fatigue,
  pressure,
  weights,
  onSeedChange,
  onScenarioChange,
  onPlayerChange,
  onFatigueChange,
  onPressureChange,
  onWeightsChange,
}: ShootingControlsProps) => (
  <section className="lab-panel controls-panel">
    <h2>Configuration</h2>
    <label>
      Seed
      <input
        value={seed}
        onChange={(event) => onSeedChange(event.target.value)}
      />
    </label>
    <label>
      Scénario
      <select
        value={scenarioId}
        onChange={(event) => onScenarioChange(event.target.value)}
      >
        {scenarios.map((scenario) => (
          <option value={scenario.id} key={scenario.id}>
            {scenario.label}
          </option>
        ))}
      </select>
    </label>
    <Range
      label="Statistique de tir"
      value={player.shooting}
      min={0}
      max={100}
      onChange={(value) => onPlayerChange({ shooting: value })}
    />
    <Range
      label="Gestion de la pression"
      value={player.pressureHandling}
      min={0}
      max={100}
      onChange={(value) => onPlayerChange({ pressureHandling: value })}
    />
    <FootSelect
      label="Pied fort"
      value={player.preferredFoot}
      onChange={(value) => onPlayerChange({ preferredFoot: value })}
    />
    <FootSelect
      label="Pied utilisé"
      value={player.usedFoot}
      onChange={(value) => onPlayerChange({ usedFoot: value })}
    />
    <Range
      label="Fatigue"
      value={fatigue}
      min={0}
      max={1}
      step={0.01}
      onChange={onFatigueChange}
    />
    <Range
      label="Pression"
      value={pressure}
      min={0}
      max={1}
      step={0.01}
      onChange={onPressureChange}
    />
    <h3>Poids provisoires</h3>
    <Range
      label="Exécution humaine"
      value={weights.humanExecution}
      min={0}
      max={1}
      step={0.01}
      onChange={(value) => onWeightsChange({ humanExecution: value })}
    />
    <Range
      label="Capacités"
      value={weights.playerAbility}
      min={0}
      max={1}
      step={0.01}
      onChange={(value) => onWeightsChange({ playerAbility: value })}
    />
    <Range
      label="Contexte"
      value={weights.context}
      min={0}
      max={1}
      step={0.01}
      onChange={(value) => onWeightsChange({ context: value })}
    />
    <p className="small-note">
      Les poids sont normalisés par le moteur pour former un total de 100 %.
    </p>
  </section>
)
const Range = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly step?: number
  readonly onChange: (value: number) => void
}) => (
  <label>
    {label}
    <span className="range-row">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>
        {max === 1 ? `${Math.round(value * 100)} %` : Math.round(value)}
      </output>
    </span>
  </label>
)
const FootSelect = ({
  label,
  value,
  onChange,
}: {
  readonly label: string
  readonly value: PreferredFoot
  readonly onChange: (value: PreferredFoot) => void
}) => (
  <label>
    {label}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as PreferredFoot)}
    >
      <option value="right">Droit</option>
      <option value="left">Gauche</option>
    </select>
  </label>
)
