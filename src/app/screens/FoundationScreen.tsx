import { SeedDiagnostics } from '../components/SeedDiagnostics'
export const FoundationScreen = () => (
  <main className="page-shell">
    <section className="hero" aria-labelledby="moments-title">
      <p className="eyebrow">Fondations du prototype</p>
      <h1 id="moments-title">Moments</h1>
      <p className="tagline">
        Une carrière entière. Les actions qui changent un destin.
      </p>
      <p className="notice">
        Cette interface de diagnostic prépare le monde procédural ; le jeu
        complet reste à construire.
      </p>
    </section>
    <SeedDiagnostics />
  </main>
)
