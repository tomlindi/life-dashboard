// Das Grundgerüst der App: Seiten-Bereich oben, Tab-Leiste unten.
import { Suspense, lazy } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { House, Ellipsis } from 'lucide-react'
import { module, TAB_IDS } from './modules'
import HeuteSeite from './modules/heute/Seite'
import { useAusgeblendet } from './core/einstellungen'
import Sicherheitsnetz from './core/ui/Sicherheitsnetz'

// "lazy": Die Mehr-Seite wird erst geladen, wenn man sie öffnet (hält den Start schnell)
const MehrSeite = lazy(() => import('./modules/mehr/Seite'))
const ImportSeite = lazy(() => import('./modules/mehr/Import'))
const BackupSeite = lazy(() => import('./modules/mehr/Backup'))

/** Ein Eintrag in der Tab-Leiste. */
function Tab({ to, label, children, farbe }: { to: string; label: string; children: React.ReactNode; farbe: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className="tippbar flex min-h-[49px] flex-1 flex-col items-center justify-center gap-0.5"
    >
      {({ isActive }) => (
        // Aktiver Tab: Akzentfarbe des Bereichs, sonst grau (wie bei Apple)
        <span className="flex flex-col items-center gap-0.5" style={{ color: isActive ? farbe : '#8e8e93' }}>
          {children}
          <span className="text-[10px] font-medium">{label}</span>
        </span>
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
          <Route path="/mehr" element={<MehrSeite />} />
          <Route path="/import" element={<ImportSeite />} />
          <Route path="/backup" element={<BackupSeite />} />
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
      <div className="flex h-full flex-col">
        {/* Scrollbarer Inhalt. paddingTop = Platz für Notch/Statusleiste (Safe Area) */}
        <main className="flex-1 overflow-y-auto overscroll-contain" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <Seiten />
        </main>

        {/* Tab-Leiste unten. paddingBottom = Platz für den Home-Balken des iPhones */}
        <nav
          className="flex border-t border-linie bg-black/90 backdrop-blur"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Tab to="/" label="Heute" farbe="#0a84ff">
            <House size={24} />
          </Tab>
          {tabModule.map((m) => (
            <Tab key={m.id} to={`/${m.id}`} label={m.name} farbe={m.farbe}>
              <m.icon size={24} />
            </Tab>
          ))}
          <Tab to="/mehr" label="Mehr" farbe="#0a84ff">
            <Ellipsis size={24} />
          </Tab>
        </nav>
      </div>
    </HashRouter>
  )
}
