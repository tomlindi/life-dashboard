// Die Leiste unten (aufgebaut wie die Tab-Leiste von WhatsApp):
//
//   • Volle Breite, halb durchsichtig mit feiner Linie oben, immer sichtbar.
//   • Die 4 festen Dock-Seiten (einstellbar unter Einstellungen → Dock-Seiten) und "Mehr", jeweils Symbol + Name.
//     Bist du auf einer anderen Seite (z. B. Schlaf), steht sie zusätzlich ganz rechts.
//   • Die aktuelle Seite: Symbol in einer Pille in ihrer Akzentfarbe, Name fett.
//
// Außerdem hier: "‹ Zurück"-Knopf und Zurück-Wischen vom linken Bildschirmrand.
import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ClipboardPaste, HardDrive, House, LayoutGrid, ListChecks, Settings, type LucideIcon } from 'lucide-react'
import { MAX_TABS, STANDARD_TABS, module } from '../../modules'
import { useAusgeblendet, useEinstellung } from '../einstellungen'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { lesbar } from '../darstellung'

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
const MEHR: DockSeite = { id: 'mehr', pfad: '/mehr', name: 'Mehr', icon: LayoutGrid, farbe: 'var(--color-text)' }
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

// ---------- Maße ----------
const HOEHE = 56 // Höhe der Leiste ohne den Streifen für die Home-Leiste des iPhones

/** Abstand unten im Inhalt, damit nichts unter der Leiste liegt. */
export const DOCK_ABSTAND = `calc(env(safe-area-inset-bottom) + ${HOEHE + 16}px)`

/** Ein Eintrag der Leiste: Symbol in einer Pille (bei der aktuellen Seite farbig hinterlegt), darunter der Name. */
function Eintrag({ seite, aktiv, farbe }: { seite: DockSeite; aktiv: boolean; farbe: string }) {
  return (
    <Link
      to={seite.pfad}
      aria-label={seite.name}
      aria-current={aktiv ? 'page' : undefined}
      className="tippbar flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1"
      style={{ color: aktiv ? 'var(--color-text)' : 'var(--color-grau)' }}
    >
      <span
        className="flex h-8 items-center justify-center rounded-full"
        style={{
          width: aktiv ? 56 : 32,
          // Farbige Pille in der Akzentfarbe der Seite (wie bei WhatsApp), mit Federeffekt
          background: aktiv ? `color-mix(in srgb, ${farbe} 22%, transparent)` : 'transparent',
          color: aktiv ? lesbar(farbe) : undefined,
          transition: 'width 300ms cubic-bezier(0.34, 1.36, 0.64, 1), background 200ms ease-out',
        }}
      >
        <seite.icon size={22} strokeWidth={aktiv ? 2.4 : 1.9} />
      </span>
      <span className={`max-w-full truncate px-0.5 text-[11px] leading-none ${aktiv ? 'font-semibold' : 'font-medium'}`}>{seite.name}</span>
    </Link>
  )
}

/**
 * Die Leiste unten. `farbe`: optional eine eigene Farbe für die aktuelle Seite (z. B. die Projektfarbe),
 * sonst die des Bereichs.
 */
export function Dock({ farbe: farbeVonSeite }: { farbe?: string }) {
  const { pathname } = useLocation()
  const tabs = useDockTabs()

  const aktuell = seiteZu(pathname)
  // Auf einer Projektseite (/ziele/projekt/<id>) hat die aktuelle Seite die Farbe des Projekts
  const projektId = pathname.match(/^\/ziele\/projekt\/([^/]+)/)?.[1]
  const projektFarbe = useLiveQuery(async () => (projektId ? (await db.projekte.get(projektId))?.farbe : undefined), [projektId])
  const farbe = farbeVonSeite ?? projektFarbe ?? aktuell.farbe
  // Aktuelle Seite gehört nicht zu den festen? Dann zusätzlich ganz rechts anzeigen.
  const eintraege = tabs.some((t) => t.id === aktuell.id) ? tabs : [...tabs, aktuell]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        background: 'var(--leiste)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)', // Safari
        borderTop: '0.5px solid var(--leiste-rand)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="mx-auto flex max-w-xl items-stretch px-1" style={{ height: HOEHE }}>
        {eintraege.map((s) => (
          <Eintrag key={s.id} seite={s} aktiv={s.id === aktuell.id} farbe={s.id === aktuell.id ? farbe : s.farbe} />
        ))}
      </div>
    </nav>
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
    <button onClick={zurueck} className="tippbar -ml-1.5 mb-1 inline-flex min-h-10 items-center text-[17px]" style={{ color: lesbar(farbe) }}>
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
