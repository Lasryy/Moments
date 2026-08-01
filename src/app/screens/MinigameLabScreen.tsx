import { useMemo, useState } from 'react'
import {
  DEFAULT_SHOT_WEIGHTS,
  getShotScenario,
  resolveShot,
  SHOT_SCENARIOS,
  SHOT_SIMULATION_VERSION,
} from '../../moments/shooting'
import type {
  ShotInput,
  ShotPlayerProfile,
  ShotResolution,
  ShotWeights,
} from '../../moments/shooting'
import { ShootingCanvas } from '../components/shooting/ShootingCanvas'
import { ShootingControls } from '../components/shooting/ShootingControls'
import { ShootingResultPanel } from '../components/shooting/ShootingResultPanel'

export interface CompletedShot {
  readonly input: ShotInput
  readonly resolution: ShotResolution
}
export const MinigameLabScreen = () => {
  const [seed, setSeed] = useState('moments-shooting-lab')
  const [scenarioId, setScenarioId] = useState(SHOT_SCENARIOS[0]!.id)
  const scenario = getShotScenario(scenarioId)
  const [player, setPlayer] = useState<ShotPlayerProfile>(
    scenario.defaultPlayer,
  )
  const [fatigue, setFatigue] = useState(scenario.context.fatigue)
  const [pressure, setPressure] = useState(scenario.context.pressure)
  const [weights, setWeights] = useState<ShotWeights>(DEFAULT_SHOT_WEIGHTS)
  const [aim, setAim] = useState<ShotInput | null>(null)
  const [completedShot, setCompletedShot] = useState<CompletedShot | null>(null)
  const [animationKey, setAnimationKey] = useState(0)
  const activeScenario = useMemo(
    () => ({
      ...scenario,
      context: { ...scenario.context, fatigue, pressure },
    }),
    [scenario, fatigue, pressure],
  )
  const resetSituation = (): void => {
    setAim(null)
    setCompletedShot(null)
  }
  const fire = (input: ShotInput): void => {
    const resolution = resolveShot({
      simulationVersion: SHOT_SIMULATION_VERSION,
      seed: seed || 'empty-seed',
      scenario: activeScenario,
      player,
      input,
      weights,
    })
    setAim(null)
    setCompletedShot({ input, resolution })
    setAnimationKey((value) => value + 1)
  }
  const changeScenario = (id: string): void => {
    const next = getShotScenario(id)
    setScenarioId(id)
    setPlayer(next.defaultPlayer)
    setFatigue(next.context.fatigue)
    setPressure(next.context.pressure)
    resetSituation()
  }
  const changeSeed = (value: string): void => {
    setSeed(value)
    resetSituation()
  }
  return (
    <main className="lab-shell">
      <header className="lab-header">
        <a href="/" className="back-link">
          ← Fondations
        </a>
        <p className="eyebrow">Laboratoire expérimental</p>
        <h1>Moment de frappe</h1>
        <p>
          Visez depuis le ballon, glissez pour régler direction et puissance,
          puis relâchez. Au clavier : flèches pour viser, espace pour charger
          puis tirer.
        </p>
      </header>
      <div className="lab-grid">
        <ShootingControls
          seed={seed}
          scenarios={SHOT_SCENARIOS}
          scenarioId={scenarioId}
          player={player}
          fatigue={fatigue}
          pressure={pressure}
          weights={weights}
          onSeedChange={changeSeed}
          onScenarioChange={changeScenario}
          onPlayerChange={(patch) => {
            setPlayer((current) => ({ ...current, ...patch }))
            resetSituation()
          }}
          onFatigueChange={(value) => {
            setFatigue(value)
            resetSituation()
          }}
          onPressureChange={(value) => {
            setPressure(value)
            resetSituation()
          }}
          onWeightsChange={(patch) => {
            setWeights((current) => ({ ...current, ...patch }))
            resetSituation()
          }}
        />
        <section className="play-panel">
          <ShootingCanvas
            scenario={activeScenario}
            aim={aim}
            completedShot={completedShot}
            animationKey={animationKey}
            onAimChange={setAim}
            onShot={fire}
          />
          <div className="play-actions">
            <button
              type="button"
              disabled={completedShot === null}
              onClick={() => setAnimationKey((value) => value + 1)}
            >
              Rejouer exactement cette frappe
            </button>
            <p>
              Résolution {SHOT_SIMULATION_VERSION} · seed {seed || 'empty-seed'}
            </p>
          </div>
        </section>
        <ShootingResultPanel completedShot={completedShot} />
      </div>
    </main>
  )
}
