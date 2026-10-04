// Das Grundgerüst der App: Seiten-Bereich und unten das Dock (wie auf dem iPhone-Homescreen).
import { Suspense, lazy } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { House, LayoutGrid } from 'lucide-react'
import { module, TAB_IDS } from './modules'
import HeuteSeite from './modules/heute/Seite'
import { useAusgeblendet } from './core/einstellungen'
import Sicherheitsnetz from './core/ui/Sicherheitsnetz'
import { AppIcon } from './core/ui/AppIcons'

// "lazy": Die Mehr-Seite wird erst geladen, wenn man sie öffnet (hält den Start schnell)
const MehrSeite = lazy(() => import('./modules/mehr/Seite'))
const ImportSeite = lazy(() => import('./modules/mehr/Import'))
const BackupSeite = lazy(() => import('./modules/mehr/Backup'))
const KalenderSeite = lazy(() => import('./modules/kalender/KalenderSeite'))
const ErinnerungenSeite = lazy(() => import('./modules/kalender/ErinnerungenSeite'))
const EinstellungenSeite = lazy(() => import('./modules/mehr/Einstellungen'))

/**
 * Ein App-Icon im Dock: abgerundetes Quadrat ("Squircle") mit Farbverlauf und weißem Symbol,
 * wie die App-Icons auf dem iPhone. Der aktive Bereich bekommt einen Punkt darunter.
 */
function DockIcon({ to, label, children }: { to: string; label: string; children: React.ReactNode }) {
  return (
    <NavLink to={to} end={to === '/'} aria-label={label} className="tippbar relative flex flex-1 justify-center">
      {({ isActive }) => (
        <>
          {children}
          {/* Kleiner Punkt unter dem aktiven Icon (wie bei geöffneten Apps im Mac-Dock) */}
          <span className="absolute -bottom-[7px] h-1 w-1 rounded-full bg-white transition-opacity" style={{ opacity: isActive ? 0.85 : 0 }} />
        </>
      )}
    </NavLink>
  )
}

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

export default function App() {
  const [ausgeblendet] = useAusgeblendet()
  const tabModule = TAB_IDS.map((id) => module.find((m) => m.id === id)!).filter((m) => m && !ausgeblendet.includes(m.id))

  return (
    // HashRouter: Adressen sehen aus wie "#/fitness". Das funktioniert auf GitHub Pages ohne Zusatz-Einstellungen.
    <HashRouter>
      <div className="h-full">
        {/* Scrollbarer Inhalt. Oben Platz für Notch/Statusleiste, unten für das schwebende Dock.
            Der Inhalt läuft UNTER dem Dock durch, deshalb sieht man den Milchglas-Effekt. */}
        <main
          className="h-full overflow-y-auto overscroll-contain"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: '100px' }}
        >
          <Seiten />
        </main>

        {/* Dock unten: schwebender Milchglas-Kasten, tief am Rand wie auf dem iPhone.
            Der Home-Balken des iPhones liegt dann (wie bei Apple) knapp darunter. */}
        <nav className="fixed inset-x-2.5 bottom-2.5 z-40 flex items-center rounded-[32px] bg-white/[0.12] px-2 py-3 backdrop-blur-2xl backdrop-saturate-[1.8]">
          <DockIcon to="/" label="Heute">
            <AppIcon id="heute" farbe="#0a84ff" icon={House} />
          </DockIcon>
          {tabModule.map((m) => (
            <DockIcon key={m.id} to={`/${m.id}`} label={m.name}>
              <AppIcon id={m.id} farbe={m.farbe} icon={m.icon} />
            </DockIcon>
          ))}
          <DockIcon to="/mehr" label="Mehr">
            <AppIcon id="mehr" farbe="#636366" icon={LayoutGrid} />
          </DockIcon>
        </nav>
      </div>
    </HashRouter>
  )
}
