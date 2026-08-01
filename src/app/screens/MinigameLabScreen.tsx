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
  ShotWeights,
} from '../../moments/shooting'
import { ShootingCanvas } from '../components/shooting/ShootingCanvas'
import { ShootingControls } from '../components/shooting/ShootingControls'
import { ShootingResultPanel } from '../components/shooting/ShootingResultPanel'
const INITIAL_INPUT: ShotInput = {
  normalizedDirectionX: 0.45,
  normalizedDirectionY: -0.78,
  normalizedPower: 0.66,
  releaseTiming: 0.52,
}
export const MinigameLabScreen = () => {
  const [seed, setSeed] = useState('moments-shooting-lab')
  const [scenarioId, setScenarioId] = useState(SHOT_SCENARIOS[0]!.id)
  const [input, setInput] = useState<ShotInput>(INITIAL_INPUT)
  const [animationKey, setAnimationKey] = useState(0)
  const scenario = getShotScenario(scenarioId)
  const [player, setPlayer] = useState<ShotPlayerProfile>(
    scenario.defaultPlayer,
  )
  const [fatigue, setFatigue] = useState(scenario.context.fatigue)
  const [pressure, setPressure] = useState(scenario.context.pressure)
  const [weights, setWeights] = useState<ShotWeights>(DEFAULT_SHOT_WEIGHTS)
  const activeScenario = useMemo(
    () => ({
      ...scenario,
      context: { ...scenario.context, fatigue, pressure },
    }),
    [scenario, fatigue, pressure],
  )
  const result = useMemo(
    () =>
      resolveShot({
        simulationVersion: SHOT_SIMULATION_VERSION,
        seed: seed || 'empty-seed',
        scenario: activeScenario,
        player,
        input,
        weights,
      }),
    [seed, activeScenario, player, input, weights],
  )
  const changeScenario = (id: string) => {
    const next = getShotScenario(id)
    setScenarioId(id)
    setPlayer(next.defaultPlayer)
    setFatigue(next.context.fatigue)
    setPressure(next.context.pressure)
  }
  const fire = (nextInput: ShotInput) => {
    setInput(nextInput)
    setAnimationKey((value) => value + 1)
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
          puis relâchez. Au clavier : flèches puis maintien et relâchement
          d’espace.
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
          onSeedChange={setSeed}
          onScenarioChange={changeScenario}
          onPlayerChange={(patch) =>
            setPlayer((current) => ({ ...current, ...patch }))
          }
          onFatigueChange={setFatigue}
          onPressureChange={setPressure}
          onWeightsChange={(patch) =>
            setWeights((current) => ({ ...current, ...patch }))
          }
        />
        <section className="play-panel">
          <ShootingCanvas
            scenario={activeScenario}
            resolution={result}
            animationKey={animationKey}
            onShot={fire}
          />
          <div className="play-actions">
            <button
              type="button"
              onClick={() => setAnimationKey((value) => value + 1)}
            >
              Rejouer exactement cette frappe
            </button>
            <p>
              Résolution {SHOT_SIMULATION_VERSION} · seed {seed || 'empty-seed'}
            </p>
          </div>
        </section>
        <ShootingResultPanel result={result} input={input} />
      </div>
    </main>
  )
}
