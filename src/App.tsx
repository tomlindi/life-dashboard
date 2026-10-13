// Das Grundgerüst der App: Seiten-Bereich und unten das Dock (wie auf dem iPhone-Homescreen).
// Wann das Dock ein- und ausfährt, steht in core/ui/TabLeiste.tsx.
import { Suspense, lazy, useRef } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { House, LayoutGrid } from 'lucide-react'
import { module, TAB_IDS } from './modules'
import HeuteSeite from './modules/heute/Seite'
import { useAusgeblendet } from './core/einstellungen'
import Sicherheitsnetz from './core/ui/Sicherheitsnetz'
import { AppIcon } from './core/ui/AppIcons'
import { LeistenIcon, TabLeiste, abstandUnten, useLeisteSichtbar, useLeistenSteuerung } from './core/ui/TabLeiste'

// "lazy": Die Mehr-Seite wird erst geladen, wenn man sie öffnet (hält den Start schnell)
const MehrSeite = lazy(() => import('./modules/mehr/Seite'))
const ImportSeite = lazy(() => import('./modules/mehr/Import'))
const BackupSeite = lazy(() => import('./modules/mehr/Backup'))
const KalenderSeite = lazy(() => import('./modules/kalender/KalenderSeite'))
const ErinnerungenSeite = lazy(() => import('./modules/kalender/ErinnerungenSeite'))
const EinstellungenSeite = lazy(() => import('./modules/mehr/Einstellungen'))

/** Alle Seiten. Das Sicherheitsnetz fängt Abstürze ab und wird beim Seitenwechsel zurückgesetzt. */
function Seiten() {
  const ort = useLocation() // aktuelle Seite, z. B. "/schule"
  return (
    <Sicherheitsnetz key={ort.pathname}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HeuteSeite />} />
          {module.map((m) => (
            <Route key={m.id} path={`/${m.id}`} element={<m.Seite />} />
          ))}
          {/* Unterseiten der Bereiche, z. B. /fitness/gym */}
          {module.flatMap((m) =>
            (m.unterseiten ?? []).map((u) => <Route key={`${m.id}/${u.pfad}`} path={`/${m.id}/${u.pfad}`} element={<u.Seite />} />),
          )}
          <Route path="/mehr" element={<MehrSeite />} />
          <Route path="/import" element={<ImportSeite />} />
          <Route path="/backup" element={<BackupSeite />} />
          <Route path="/kalender" element={<KalenderSeite />} />
          <Route path="/erinnerungen" element={<ErinnerungenSeite />} />
          <Route path="/einstellungen" element={<EinstellungenSeite />} />
        </Routes>
      </Suspense>
    </Sicherheitsnetz>
  )
}

/** Inhalt + Dock. Eigene Komponente, weil die Steuerung den Router (aktuelle Seite) braucht. */
function Rahmen() {
  const [ausgeblendet] = useAusgeblendet()
  const tabModule = TAB_IDS.map((id) => module.find((m) => m.id === id)!).filter((m) => m && !ausgeblendet.includes(m.id))
  const inhalt = useRef<HTMLElement>(null)
  useLeistenSteuerung(inhalt)
  const leisteDa = useLeisteSichtbar()

  return (
    <div className="h-full">
      {/* Scrollbarer Inhalt. Oben Platz für Notch/Statusleiste, unten für das schwebende Dock.
          Der Inhalt läuft UNTER dem Dock durch, deshalb sieht man den Milchglas-Effekt.
          Ist das Dock weg, wird der Abstand unten kleiner (sanft, im selben Takt wie das Dock). */}
      <main
        ref={inhalt}
        className="h-full overflow-y-auto overscroll-contain"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: abstandUnten(leisteDa), transition: 'padding-bottom 250ms ease-out' }}
      >
        <Seiten />
      </main>

      {/* Dock unten: schwebender Milchglas-Kasten, tief am Rand wie auf dem iPhone. */}
      <TabLeiste>
        <LeistenIcon to="/" label="Heute">
          <AppIcon id="heute" farbe="#0a84ff" icon={House} />
        </LeistenIcon>
        {tabModule.map((m) => (
          <LeistenIcon key={m.id} to={`/${m.id}`} label={m.name}>
            <AppIcon id={m.id} farbe={m.farbe} icon={m.icon} />
          </LeistenIcon>
        ))}
        <LeistenIcon to="/mehr" label="Mehr">
          <AppIcon id="mehr" farbe="#636366" icon={LayoutGrid} />
        </LeistenIcon>
      </TabLeiste>
    </div>
  )
}

export default function App() {
  return (
    // HashRouter: Adressen sehen aus wie "#/fitness". Das funktioniert auf GitHub Pages ohne Zusatz-Einstellungen.
    <HashRouter>
      <Rahmen />
    </HashRouter>
  )
}
