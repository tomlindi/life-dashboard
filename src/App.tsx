// Das Grundgerüst der App: Seiten-Bereich und unten das Dock (wie auf dem iPhone-Homescreen).
import { Suspense, lazy } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { House, LayoutGrid } from 'lucide-react'
import { module, TAB_IDS } from './modules'
import HeuteSeite from './modules/heute/Seite'
import { useAusgeblendet } from './core/einstellungen'
import Sicherheitsnetz from './core/ui/Sicherheitsnetz'

// "lazy": Die Mehr-Seite wird erst geladen, wenn man sie öffnet (hält den Start schnell)
const MehrSeite = lazy(() => import('./modules/mehr/Seite'))
const ImportSeite = lazy(() => import('./modules/mehr/Import'))
const BackupSeite = lazy(() => import('./modules/mehr/Backup'))
const KalenderSeite = lazy(() => import('./modules/kalender/KalenderSeite'))
const ErinnerungenSeite = lazy(() => import('./modules/kalender/ErinnerungenSeite'))

/**
 * Ein App-Icon im Dock: abgerundetes Quadrat ("Squircle") mit Farbverlauf und weißem Symbol,
 * wie die App-Icons auf dem iPhone. Der aktive Bereich bekommt einen Punkt darunter.
 */
function DockIcon({ to, label, children, farbe }: { to: string; label: string; children: React.ReactNode; farbe: string }) {
  return (
    <NavLink to={to} end={to === '/'} aria-label={label} className="tippbar flex flex-1 flex-col items-center gap-1">
      {({ isActive }) => (
        <>
          <span
            className="flex h-[54px] w-[54px] items-center justify-center rounded-[15px] text-white shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
            style={{
              // Heller Schimmer oben + Akzentfarbe: wirkt wie ein echtes App-Icon
              background: `linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 55%), ${farbe}`,
            }}
          >
            {children}
          </span>
          {/* Punkt unter dem aktiven Icon (wie bei geöffneten Apps im Dock) */}
          <span className="h-[5px] w-[5px] rounded-full transition-opacity" style={{ background: '#fff', opacity: isActive ? 0.9 : 0 }} />
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
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 104px)' }}
        >
          <Seiten />
        </main>

        {/* Dock unten: schwebender, abgerundeter Kasten mit Milchglas (Blur), wie auf dem iPhone */}
        <nav
          className="fixed inset-x-3 z-40 flex items-start rounded-[34px] border border-white/10 bg-[#3a3a3c]/45 px-2 pt-2.5 pb-1.5 backdrop-blur-2xl backdrop-saturate-150"
          style={{ bottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          <DockIcon to="/" label="Heute" farbe="#0a84ff">
            <House size={26} strokeWidth={2.2} />
          </DockIcon>
          {tabModule.map((m) => (
            <DockIcon key={m.id} to={`/${m.id}`} label={m.name} farbe={m.farbe}>
              <m.icon size={26} strokeWidth={2.2} />
            </DockIcon>
          ))}
          <DockIcon to="/mehr" label="Mehr" farbe="#636366">
            <LayoutGrid size={26} strokeWidth={2.2} />
          </DockIcon>
        </nav>
      </div>
    </HashRouter>
  )
}
