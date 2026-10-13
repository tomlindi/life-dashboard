// Das Dock: ein runder Glas-Knopf unten rechts (oder links, Einstellung "Knopf links").
//
//   • Im Knopf steht immer das Symbol der Seite, auf der du gerade bist, in ihrer Farbe.
//   • Antippen: Der Knopf klappt mit Federeffekt zu einer Glas-Kapsel auf. Darin stehen die 4 festen
//     Dock-Seiten und "Mehr". Bist du auf einer anderen Seite (z. B. Schlaf), steht sie zusätzlich
//     ganz außen. Die aktuelle Seite hat eine helle Kapsel dahinter.
//   • Seite antippen = dorthin wechseln und zuklappen. Daneben tippen oder nach unten wischen = nur zuklappen.
//   • Beim Scrollen wird der Knopf kleiner und durchsichtiger, kurz danach wieder normal.
//
// Außerdem hier: "‹ Zurück"-Knopf und Zurück-Wischen vom linken Bildschirmrand.
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ClipboardPaste, HardDrive, House, LayoutGrid, ListChecks, Settings, type LucideIcon } from 'lucide-react'
import { MAX_TABS, STANDARD_TABS, module } from '../../modules'
import { useAusgeblendet, useEinstellung } from '../einstellungen'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

// ---------- Welche Seiten gibt es? ----------

export interface DockSeite {
  id: string // "heute", "kalender", "mehr" oder die ID eines Bereichs
  pfad: string // z. B. "/" oder "/fitness"
  name: string
  icon: LucideIcon
  farbe: string // Akzentfarbe
}

/** Seiten, die man fest ins Dock legen kann: Heute, Kalender, Erinnerungen und alle Bereiche. */
export const WAEHLBARE_SEITEN: DockSeite[] = [
  { id: 'heute', pfad: '/', name: 'Heute', icon: House, farbe: '#0a84ff' },
  { id: 'kalender', pfad: '/kalender', name: 'Kalender', icon: CalendarDays, farbe: '#ff453a' },
  { id: 'erinnerungen', pfad: '/erinnerungen', name: 'Erinnerungen', icon: ListChecks, farbe: '#0a84ff' },
  ...module.map((m) => ({ id: m.id, pfad: `/${m.id}`, name: m.name, icon: m.icon, farbe: m.farbe })),
]
const MEHR: DockSeite = { id: 'mehr', pfad: '/mehr', name: 'Mehr', icon: LayoutGrid, farbe: '#ffffff' }
/** Weitere Seiten (nur über "Mehr" erreichbar), damit der Knopf auch dort das passende Symbol zeigt. */
const SONSTIGE: DockSeite[] = [
  MEHR,
  { id: 'import', pfad: '/import', name: 'Import', icon: ClipboardPaste, farbe: '#0a84ff' },
  { id: 'backup', pfad: '/backup', name: 'Backup', icon: HardDrive, farbe: '#8e8e93' },
  { id: 'einstellungen', pfad: '/einstellungen', name: 'Einstellungen', icon: Settings, farbe: '#8e8e93' },
]
const ALLE = [...WAEHLBARE_SEITEN, ...SONSTIGE]

/** Zu welcher Seite gehört eine Adresse? "/fitness/gym" -> Fitness, "/" -> Heute. */
export function seiteZu(pfad: string): DockSeite {
  return ALLE.find((s) => s.pfad === pfad) ?? ALLE.find((s) => s.pfad !== '/' && pfad.startsWith(s.pfad + '/')) ?? WAEHLBARE_SEITEN[0]
}

/** Die gewählten Dock-Seiten (Einstellung "dockTabs"), so wie gespeichert. */
export const useDockTabIds = () => useEinstellung<string[]>('dockTabs', STANDARD_TABS)

/** Die festen Seiten im Dock: deine Auswahl (ohne ausgeblendete Bereiche, höchstens 4) und am Ende "Mehr". */
export function useDockTabs(): DockSeite[] {
  const [ids] = useDockTabIds()
  const [ausgeblendet] = useAusgeblendet()
  const gewaehlt = ids
    .filter((id) => !ausgeblendet.includes(id))
    .map((id) => WAEHLBARE_SEITEN.find((s) => s.id === id))
    .filter((s): s is DockSeite => !!s)
    .slice(0, MAX_TABS)
  return [...gewaehlt, MEHR]
}

/**
 * Ist diese Seite eine Übersicht (eine feste Dock-Seite oder Heute)? Dort gibt es keinen Zurück-Knopf
 * und kein Zurück-Wischen. Alle anderen Seiten haben beides.
 */
export function useIstUebersicht(pfad: string) {
  const tabs = useDockTabs()
  return pfad === '/' || tabs.some((t) => t.pfad === pfad)
}

// ---------- Maße und Bewegung ----------
const KNOPF = 56
const RAND = 16
const EINTRAG = 58 // Breite eines Eintrags in der aufgeklappten Kapsel
// Federeffekt: schnell los, leicht über das Ziel hinaus, dann zurück (ca. 300 ms)
const FEDER = '300ms cubic-bezier(0.34, 1.36, 0.64, 1)'
const SANFT = '200ms ease-out'

/** Abstand unten im Inhalt, damit nichts unter dem Knopf liegt. */
export const DOCK_ABSTAND = `calc(env(safe-area-inset-bottom) + ${8 + KNOPF + 16}px)`

/** Glas-Optik wie in iOS 26: halb durchsichtig, unscharfer Hintergrund, feiner heller Rand, weicher Schatten. */
const GLAS = {
  background: 'rgba(30,30,30,0.6)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)', // Safari
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
} as const

/** Ein Eintrag in der aufgeklappten Kapsel. */
function Eintrag({ seite, aktiv, onWahl }: { seite: DockSeite; aktiv: boolean; onWahl: () => void }) {
  return (
    <Link to={seite.pfad} onClick={onWahl} aria-label={seite.name} aria-current={aktiv ? 'page' : undefined} className="tippbar flex h-full min-w-0 flex-1 items-center justify-center">
      <span
        className="flex w-full min-w-0 flex-col items-center gap-0.5 rounded-full px-1 py-1.5"
        style={{ background: aktiv ? 'rgba(255,255,255,0.14)' : 'transparent', color: aktiv ? seite.farbe : '#8e8e93' }}
      >
        <seite.icon size={21} strokeWidth={aktiv ? 2.4 : 2} />
        <span className="max-w-full truncate text-[10px] font-medium leading-none">{seite.name}</span>
      </span>
    </Link>
  )
}

/**
 * Das Dock. `inhalt` ist der scrollbare Bereich (für "beim Scrollen kleiner werden").
 * `farbe`: optional eine eigene Farbe für das Symbol (z. B. die Projektfarbe), sonst die des Bereichs.
 */
export function Dock({ inhalt, farbe: farbeVonSeite }: { inhalt: RefObject<HTMLElement | null>; farbe?: string }) {
  const { pathname } = useLocation()
  const tabs = useDockTabs()
  const [links] = useEinstellung<boolean>('dockLinks', false)
  const [offen, setOffen] = useState(false)
  const [scrollt, setScrollt] = useState(false)

  const aktuell = seiteZu(pathname)
  // Auf einer Projektseite (/ziele/projekt/<id>) hat der Knopf die Farbe des Projekts
  const projektId = pathname.match(/^\/ziele\/projekt\/([^/]+)/)?.[1]
  const projektFarbe = useLiveQuery(async () => (projektId ? (await db.projekte.get(projektId))?.farbe : undefined), [projektId])
  const farbe = farbeVonSeite ?? projektFarbe ?? aktuell.farbe
  // Aktuelle Seite gehört nicht zu den festen? Dann zusätzlich ganz außen anzeigen.
  const eintraege = tabs.some((t) => t.id === aktuell.id) ? tabs : [...tabs, aktuell]
  // Für Linkshänder spiegeln: dann steht "außen" rechts, und die Kapsel klappt nach rechts auf
  const reihe = links ? [...eintraege].reverse() : eintraege

  // Seitenwechsel (auch über "Zurück") klappt das Dock zu
  useEffect(() => setOffen(false), [pathname])

  // Beim Scrollen: kleiner und durchsichtiger, 0,8 s nach dem letzten Scrollen wieder normal
  useEffect(() => {
    const el = inhalt.current
    if (!el) return
    let timer: number | undefined
    const beimScrollen = () => {
      setScrollt(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setScrollt(false), 800)
    }
    el.addEventListener('scroll', beimScrollen, { passive: true })
    return () => {
      el.removeEventListener('scroll', beimScrollen)
      window.clearTimeout(timer)
    }
  }, [inhalt])

  // Nach unten wischen auf der offenen Kapsel klappt sie zu
  const wischStart = useRef<number | null>(null)
  const seite = links ? { left: RAND } : { right: RAND }
  const klein = scrollt && !offen

  return (
    <>
      {/* Unsichtbare Fläche hinter der offenen Kapsel: daneben tippen = zuklappen */}
      {offen && <button aria-label="Dock schließen" onClick={() => setOffen(false)} className="fixed inset-0 z-30 cursor-default" />}

      <nav
        className="fixed z-40 overflow-hidden rounded-full"
        onTouchStart={(e) => (wischStart.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (wischStart.current !== null && e.changedTouches[0].clientY - wischStart.current > 30) setOffen(false)
          wischStart.current = null
        }}
        style={{
          ...GLAS,
          ...seite,
          bottom: 'calc(env(safe-area-inset-bottom) + 8px)',
          height: KNOPF,
          // Zu: ein Kreis. Offen: so breit wie die Einträge, höchstens Bildschirmbreite minus Rand.
          width: offen ? `min(${reihe.length * EINTRAG + 8}px, calc(100vw - ${2 * RAND}px))` : KNOPF,
          transform: klein ? 'scale(0.85)' : 'scale(1)',
          transformOrigin: links ? 'bottom left' : 'bottom right',
          opacity: klein ? 0.6 : 1,
          transition: `width ${FEDER}, transform ${FEDER}, opacity ${SANFT}`,
        }}
      >
        {/* Aufgeklappt: alle Einträge */}
        <div
          className="absolute inset-y-0 flex items-center px-1"
          style={{
            ...(links ? { left: 0 } : { right: 0 }),
            width: `min(${reihe.length * EINTRAG + 8}px, calc(100vw - ${2 * RAND}px))`,
            opacity: offen ? 1 : 0,
            pointerEvents: offen ? 'auto' : 'none',
            transition: `opacity ${SANFT}`,
          }}
        >
          {reihe.map((s) => (
            <Eintrag key={s.id} seite={s} aktiv={s.id === aktuell.id} onWahl={() => setOffen(false)} />
          ))}
        </div>

        {/* Zugeklappt: nur das Symbol der aktuellen Seite */}
        <button
          onClick={() => setOffen(true)}
          aria-label={`Navigation öffnen (aktuell: ${aktuell.name})`}
          tabIndex={offen ? -1 : 0}
          className="absolute inset-y-0 flex items-center justify-center"
          style={{
            ...(links ? { left: 0 } : { right: 0 }),
            width: KNOPF - 2,
            color: farbe,
            opacity: offen ? 0 : 1,
            pointerEvents: offen ? 'none' : 'auto',
            transition: `opacity ${SANFT}`,
          }}
        >
          <aktuell.icon size={24} strokeWidth={2.3} />
        </button>
      </nav>
    </>
  )
}

// ---------- Zurück ----------

/** Einen Schritt zurück im Verlauf; wurde die Seite direkt geöffnet, zu `ersatz`. */
function useZurueck(ersatz = '/') {
  const navigate = useNavigate()
  return () => {
    // React Router merkt sich die Position im Verlauf in history.state.idx (0 = erste Seite)
    const hatVerlauf = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0
    if (hatVerlauf) navigate(-1)
    else navigate(ersatz)
  }
}

/** "‹ Zurück" oben links. */
export function ZurueckKnopf({ ersatz = '/', label = 'Zurück', farbe = '#0a84ff' }: { ersatz?: string; label?: string; farbe?: string }) {
  const zurueck = useZurueck(ersatz)
  return (
    <button onClick={zurueck} className="tippbar -ml-1.5 mb-1 inline-flex min-h-10 items-center text-[17px]" style={{ color: farbe }}>
      <ChevronLeft size={22} /> {label}
    </button>
  )
}

/** Läuft die App als Homescreen-App? (Nur dann fehlt die Zurück-Geste von iOS.) */
const alsApp = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches

/**
 * Zurück-Wischen vom linken Bildschirmrand nach rechts (wie in iOS-Apps), auf allen Seiten außer den Übersichten.
 * Nur in der Homescreen-App: In Safari macht iOS das schon selbst, sonst ginge es zwei Seiten zurück.
 * Zum Ausprobieren am PC ist die Geste im Entwicklungsmodus (npm run dev) immer an.
 */
export function useZurueckWischen() {
  const { pathname } = useLocation()
  const uebersicht = useIstUebersicht(pathname)
  const zurueck = useZurueck()
  const zurueckRef = useRef(zurueck) // immer die aktuelle Funktion, ohne die Geste neu anzumelden
  zurueckRef.current = zurueck
  const aktiv = !uebersicht && (alsApp() || import.meta.env.DEV)

  useEffect(() => {
    if (!aktiv) return
    let start: { x: number; y: number } | null = null
    const beginn = (e: TouchEvent) => {
      const t = e.touches[0]
      start = e.touches.length === 1 && t.clientX < 24 ? { x: t.clientX, y: t.clientY } : null // nur ganz am linken Rand
    }
    const bewegung = (e: TouchEvent) => {
      if (!start) return
      const t = e.touches[0]
      const dx = t.clientX - start.x
      const dy = Math.abs(t.clientY - start.y)
      if (dy > 40) start = null // eher senkrecht gescrollt -> keine Zurück-Geste
      else if (dx > 70) {
        start = null
        zurueckRef.current()
      }
    }
    const ende = () => (start = null)
    window.addEventListener('touchstart', beginn, { passive: true })
    window.addEventListener('touchmove', bewegung, { passive: true })
    window.addEventListener('touchend', ende, { passive: true })
    return () => {
      window.removeEventListener('touchstart', beginn)
      window.removeEventListener('touchmove', bewegung)
      window.removeEventListener('touchend', ende)
    }
  }, [aktiv])
}
