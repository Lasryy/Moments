import { useMemo } from 'react'
import { SeededRng } from '../../core/rng/SeededRng'
import { useSeedStore } from '../stores/useSeedStore'
const SAMPLE_COUNT = 5
export const SeedDiagnostics = () => {
  const { seed, setSeed } = useSeedStore()
  const values = useMemo(() => {
    if (seed.length === 0) return []
    const rng = new SeededRng(seed)
    return Array.from({ length: SAMPLE_COUNT }, () => rng.nextInt(0, 9999))
  }, [seed])
  return (
    <section className="diagnostics" aria-labelledby="diagnostics-title">
      <div>
        <p className="eyebrow">Diagnostic temporaire</p>
        <h2 id="diagnostics-title">Vérifier le déterminisme</h2>
        <p>Retapez la même seed : les valeurs resteront identiques.</p>
      </div>
      <label htmlFor="world-seed">Seed du monde</label>
      <input
        id="world-seed"
        value={seed}
        onChange={(event) => setSeed(event.target.value)}
        placeholder="ex. saison-2030"
      />
      <output aria-live="polite">
        {values.length > 0
          ? values.join(' · ')
          : 'Saisissez une seed non vide.'}
      </output>
    </section>
  )
}
