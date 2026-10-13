// Das Dock unten (Tab-Leiste) im Stil von iOS 26 – und alles, was es ein- und ausblendet.
//
// Drei Zustände:
//   "gross" = schwebende Glas-Kapsel mit allen Tabs (Symbol + Beschriftung)
//   "klein" = kleine runde Kapsel unten links, nur mit dem Symbol des aktiven Tabs
//   "weg"   = ganz nach unten weggefahren; unten erscheint ein kleiner Griff
//
// Regeln:
//   • Übersichtsseiten (die Tabs im Dock und "Mehr"): beim Öffnen groß.
//     Runterscrollen -> klein, Hochscrollen oder Antippen der kleinen Kapsel -> wieder groß.
//   • Alle anderen Seiten (z. B. Schlaf, Gym, Kalender): beim Öffnen weg. Scrollen holt es dort
//     NICHT zurück (das wirkte unruhig). Zurück kommt es nur über "Zurück" (Knopf oder Zurück-Geste)
//     oder mit einem Wisch nach oben knapp über dem Home-Balken (bzw. Antippen des Griffs).
//     Die untersten ~34 px gehören iOS (dort schließt ein Wisch die App), deshalb zählt nur ein Wisch,
//     der 40 bis 120 px über dem unteren Rand beginnt.
import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react'
import { Link, NavLink, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { ChevronLeft, House, LayoutGrid, type LucideIcon } from 'lucide-react'
import { MAX_TABS, STANDARD_TABS, module } from '../../modules'
import { useAusgeblendet, useEinstellung } from '../einstellungen'

// ---------- Welche Tabs stehen im Dock? ----------

export interface Tab {
  id: string // "heute", "mehr" oder die ID eines Bereichs
  pfad: string // z. B. "/" oder "/fitness"
  name: string
  icon: LucideIcon
  farbe: string // Akzentfarbe, wenn der Tab aktiv ist
}

/** Alle Tabs, die man wählen kann (Heute + alle Bereiche). */
export const WAEHLBARE_TABS: Tab[] = [
  { id: 'heute', pfad: '/', name: 'Heute', icon: House, farbe: '#0a84ff' },
  ...module.map((m) => ({ id: m.id, pfad: `/${m.id}`, name: m.name, icon: m.icon, farbe: m.farbe })),
]
const MEHR: Tab = { id: 'mehr', pfad: '/mehr', name: 'Mehr', icon: LayoutGrid, farbe: '#ffffff' }

/** Die gewählten Tab-IDs (Einstellung "dockTabs"), so wie gespeichert. */
export const useDockTabIds = () => useEinstellung<string[]>('dockTabs', STANDARD_TABS)

/** Die Tabs im Dock: deine Auswahl (ohne ausgeblendete Bereiche, höchstens 4) und am Ende immer "Mehr". */
export function useDockTabs(): Tab[] {
  const [ids] = useDockTabIds()
  const [ausgeblendet] = useAusgeblendet()
  const gewaehlt = ids
    .filter((id) => !ausgeblendet.includes(id))
    .map((id) => WAEHLBARE_TABS.find((t) => t.id === id))
    .filter((t): t is Tab => !!t)
    .slice(0, MAX_TABS)
  return [...gewaehlt, MEHR]
}

/**
 * Ist diese Seite eine Übersicht (= ein Tab im Dock)? Dort ist das Dock beim Öffnen sichtbar.
 * Heute ("/") zählt immer dazu, auch wenn es nicht im Dock steht: Dort startet die App.
 */
export function useIstUebersicht(pfad: string) {
  const tabs = useDockTabs()
  return pfad === '/' || tabs.some((t) => t.pfad === pfad)
}

/** Welcher Tab gehört zu einer Seite? "/fitness/gym" -> Fitness. */
const tabZu = (tabs: Tab[], pfad: string) =>
  tabs.find((t) => t.pfad === pfad) ?? tabs.filter((t) => t.pfad !== '/').find((t) => pfad.startsWith(t.pfad + '/'))

// ---------- Ein winziger "Speicher" für den Zustand ----------
// (useSyncExternalStore: jede Komponente, die den Wert liest, wird bei Änderungen neu gezeichnet)

export type DockZustand = 'gross' | 'klein' | 'weg'
let zustand: DockZustand = 'gross'
let naechsteSeiteZeigen = false // gesetzt von einem Zurück-Knopf: die Zielseite zeigt das Dock
const zuhoerer = new Set<() => void>()

function setzeZustand(neu: DockZustand) {
  if (neu === zustand) return
  zustand = neu
  zuhoerer.forEach((f) => f())
}

export function useDockZustand() {
  return useSyncExternalStore(
    (f) => {
      zuhoerer.add(f)
      return () => zuhoerer.delete(f)
    },
    () => zustand,
  )
}

/** Für alle Zurück-Knöpfe: Dock sofort einblenden und auch auf der nächsten Seite zeigen. */
export function zeigeLeiste() {
  naechsteSeiteZeigen = true
  setzeZustand('gross')
  // Falls gar keine Navigation folgt (z. B. "‹ Listen" innerhalb einer Seite): Merker wieder löschen
  setTimeout(() => (naechsteSeiteZeigen = false), 600)
}

// ---------- Maße ----------
const RAND = 16 // Abstand links/rechts
const HOEHE = 64
const WISCH_ZONE_UNTEN = 40 // px vom unteren Rand: darunter ist der iOS-Home-Balken
const WISCH_ZONE_OBEN = 120
const MIN_WISCH = 30 // so weit (px) muss der Finger nach oben wandern
const SCROLL_SCHWELLE = 8 // kleine Zitterbewegungen beim Scrollen ignorieren

// Bewegung wie eine Feder: schnell los, leicht über das Ziel hinaus, dann zurück (ca. 300 ms)
const FEDER = '300ms cubic-bezier(0.34, 1.36, 0.64, 1)'
const SANFT = '250ms cubic-bezier(0.2, 0.8, 0.2, 1)'

/** Abstand unten im Inhalt, damit nichts unter dem Dock (oder dem Griff) verschwindet. */
export const abstandUnten = (z: DockZustand) =>
  z === 'weg' ? 'calc(env(safe-area-inset-bottom) + 40px)' : `calc(env(safe-area-inset-bottom) + ${8 + HOEHE + 16}px)`

/**
 * Steuert den Zustand: Seitenwechsel, Scrollen im Inhalt und die Wischgeste.
 * `inhalt` ist der scrollbare Bereich (<main> in App.tsx).
 */
export function useLeistenSteuerung(inhalt: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation()
  const art = useNavigationType() // "POP" = Zurück/Vor im Verlauf
  const uebersicht = useIstUebersicht(pathname)
  const uebersichtRef = useRef(uebersicht)
  uebersichtRef.current = uebersicht

  // 1. Seitenwechsel
  useEffect(() => {
    setzeZustand(uebersicht || naechsteSeiteZeigen || art === 'POP' ? 'gross' : 'weg')
    naechsteSeiteZeigen = false
  }, [pathname, art, uebersicht])

  // 2. Scrollen
  useEffect(() => {
    const el = inhalt.current
    if (!el) return
    let letzte = el.scrollTop
    const beimScrollen = () => {
      const oben = el.scrollTop
      const maxOben = el.scrollHeight - el.clientHeight
      // Das "Gummiband" von iOS ganz oben/unten erzeugt Gegenbewegungen -> nicht beachten
      if (oben < 0 || oben > maxOben) return
      const diff = oben - letzte
      if (Math.abs(diff) < SCROLL_SCHWELLE) return
      letzte = oben
      if (uebersichtRef.current) {
        // Übersicht: runter = klein, hoch = groß
        if (diff > 0 && oben > 40) setzeZustand('klein')
        else if (diff < 0) setzeZustand('gross')
      } else if (diff > 0 && oben > 40) {
        // Andere Seiten: wurde das Dock (z. B. per "Zurück") gezeigt, verschwindet es beim Runterscrollen wieder.
        // Hochscrollen holt es hier absichtlich nicht zurück.
        setzeZustand('weg')
      }
    }
    el.addEventListener('scroll', beimScrollen, { passive: true })
    return () => el.removeEventListener('scroll', beimScrollen)
  }, [inhalt, pathname])

  // 3. Wischgeste knapp über dem Home-Balken (nur wenn das Dock weg ist)
  useEffect(() => {
    let start: { x: number; y: number } | null = null
    const beginn = (e: TouchEvent) => {
      const t = e.touches[0]
      const abstand = window.innerHeight - t.clientY
      start = zustand === 'weg' && e.touches.length === 1 && abstand >= WISCH_ZONE_UNTEN && abstand <= WISCH_ZONE_OBEN ? { x: t.clientX, y: t.clientY } : null
    }
    const bewegung = (e: TouchEvent) => {
      if (!start) return
      const t = e.touches[0]
      const dy = start.y - t.clientY // positiv = nach oben
      const dx = Math.abs(t.clientX - start.x)
      if (dy > MIN_WISCH && dy > dx) {
        setzeZustand('gross')
        start = null
      }
    }
    const ende = () => (start = null)
    // "passive": wir verhindern nichts, Tippen und Scrollen funktionieren dort ganz normal weiter
    window.addEventListener('touchstart', beginn, { passive: true })
    window.addEventListener('touchmove', bewegung, { passive: true })
    window.addEventListener('touchend', ende, { passive: true })
    window.addEventListener('touchcancel', ende, { passive: true })
    return () => {
      window.removeEventListener('touchstart', beginn)
      window.removeEventListener('touchmove', bewegung)
      window.removeEventListener('touchend', ende)
      window.removeEventListener('touchcancel', ende)
    }
  }, [])
}

// ---------- Aussehen ----------

/** Glas-Optik: halb durchsichtig dunkel, unscharfer Hintergrund, feiner heller Rand, weicher Schatten. */
const GLAS = {
  background: 'rgba(30,30,30,0.6)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)', // Safari
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
} as const

/** Ein Tab: Symbol mit kleiner Beschriftung. Aktiv = helle Kapsel dahinter + Farbe des Bereichs. */
function TabKnopf({ tab }: { tab: Tab }) {
  return (
    <NavLink to={tab.pfad} end={tab.pfad === '/'} aria-label={tab.name} className="tippbar flex min-w-0 flex-1 justify-center">
      {({ isActive }) => (
        <span
          className="flex min-w-0 flex-col items-center gap-0.5 rounded-full px-3 py-1.5"
          style={{ background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent', color: isActive ? tab.farbe : '#8e8e93', transition: `background ${SANFT}` }}
        >
          <tab.icon size={22} strokeWidth={isActive ? 2.4 : 2} />
          <span className="max-w-full truncate text-[10.5px] font-medium leading-none">{tab.name}</span>
        </span>
      )}
    </NavLink>
  )
}

/** Das Dock: große Kapsel, kleine runde Kapsel oder weggefahren (plus Griff). */
export function Dock() {
  const z = useDockZustand()
  const tabs = useDockTabs()
  const { pathname } = useLocation()
  const aktiv = tabZu(tabs, pathname) ?? tabs[0]
  const klein = z === 'klein'

  return (
    <>
      <nav
        aria-hidden={z === 'weg'}
        className="fixed z-40 overflow-hidden rounded-full"
        style={{
          ...GLAS,
          left: RAND,
          bottom: 'calc(env(safe-area-inset-bottom) + 8px)',
          height: HOEHE,
          // Groß: volle Breite minus Rand. Klein: ein Kreis (Breite = Höhe).
          width: klein ? HOEHE : `calc(100vw - ${2 * RAND}px)`,
          // Weg: ganz nach unten aus dem Bild schieben (eigene Höhe + Abstand + Home-Balken)
          transform: z === 'weg' ? 'translateY(calc(100% + 16px + env(safe-area-inset-bottom)))' : 'translateY(0)',
          transition: `width ${FEDER}, transform ${z === 'weg' ? SANFT : FEDER}`,
          pointerEvents: z === 'weg' ? 'none' : 'auto',
        }}
      >
        {/* Alle Tabs (groß) */}
        <div
          className="absolute inset-y-0 left-0 flex items-center px-1.5"
          style={{ width: `calc(100vw - ${2 * RAND}px)`, opacity: klein ? 0 : 1, transition: `opacity ${SANFT}`, pointerEvents: klein ? 'none' : 'auto' }}
        >
          {tabs.map((t) => (
            <TabKnopf key={t.id} tab={t} />
          ))}
        </div>

        {/* Nur das aktive Symbol (klein). Antippen macht das Dock wieder groß. */}
        <button
          onClick={() => setzeZustand('gross')}
          aria-label="Tab-Leiste vergrößern"
          tabIndex={klein ? 0 : -1}
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: klein ? 1 : 0, transition: `opacity ${SANFT}`, pointerEvents: klein ? 'auto' : 'none', color: aktiv.farbe }}
        >
          <aktiv.icon size={24} strokeWidth={2.4} />
        </button>
      </nav>

      {/* Griff: nur sichtbar, solange das Dock weg ist. Antippen geht auch. */}
      <button
        onClick={() => setzeZustand('gross')}
        aria-label="Tab-Leiste einblenden"
        tabIndex={z === 'weg' ? 0 : -1}
        className="fixed left-1/2 z-40 flex h-7 w-24 -translate-x-1/2 items-center justify-center"
        style={{
          // knapp über dem Home-Balken, also mitten in der Wisch-Zone
          bottom: 'calc(env(safe-area-inset-bottom) + 10px)',
          opacity: z === 'weg' ? 1 : 0,
          transition: `opacity ${SANFT}`,
          pointerEvents: z === 'weg' ? 'auto' : 'none',
        }}
      >
        <span className="h-[5px] w-9 rounded-full bg-white/35 backdrop-blur" />
      </button>
    </>
  )
}

/**
 * "‹ Zurück" oben links. Geht im Verlauf einen Schritt zurück, wenn es einen gibt
 * (z. B. Heute → Schlaf → zurück zu Heute). Wurde die Seite direkt geöffnet, geht es zu `ersatz`.
 */
export function ZurueckKnopf({ ersatz = '/', label = 'Zurück', farbe = '#0a84ff' }: { ersatz?: string; label?: string; farbe?: string }) {
  const navigate = useNavigate()
  // React Router merkt sich die Position im Verlauf in history.state.idx (0 = erste Seite)
  const hatVerlauf = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0
  const klasse = 'tippbar -ml-1.5 mb-1 inline-flex min-h-10 items-center text-[17px]'
  if (hatVerlauf) {
    return (
      <button
        onClick={() => {
          zeigeLeiste()
          navigate(-1)
        }}
        className={klasse}
        style={{ color: farbe }}
      >
        <ChevronLeft size={22} /> {label}
      </button>
    )
  }
  return (
    <Link to={ersatz} onClick={zeigeLeiste} className={klasse} style={{ color: farbe }}>
      <ChevronLeft size={22} /> {label}
    </Link>
  )
}
