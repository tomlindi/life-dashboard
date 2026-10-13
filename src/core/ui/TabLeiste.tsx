// Die Tab-Leiste unten (das "Dock") und alles, was sie ein- und ausblendet – wie in Apples Apps.
//
// Regeln:
//   • Auf Übersichtsseiten (Heute, Mehr und den Bereichen, die selbst in der Leiste stehen) ist sie sichtbar.
//   • Öffnest du eine andere Seite (z. B. Schlaf, Gym, Kalender), fährt sie nach unten weg.
//   • Runterscrollen blendet sie aus, Hochscrollen blendet sie ein.
//   • "Zurück" (Knopf oder Zurück-Geste des Browsers) blendet sie ein.
//   • Ist sie versteckt, erscheint unten ein kleiner Griff. Ein Wisch nach oben knapp über dem
//     Home-Balken holt sie zurück. Die untersten ~34 px gehören iOS (dort schließt ein Wisch die App),
//     deshalb zählt nur ein Wisch, der 40 bis 120 px über dem unteren Rand beginnt.
import { useEffect, useSyncExternalStore, type ReactNode, type RefObject } from 'react'
import { Link, NavLink, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { TAB_IDS } from '../../modules'

// ---------- Ein winziger "Speicher" für sichtbar/versteckt ----------
// (useSyncExternalStore: jede Komponente, die den Wert liest, wird bei Änderungen neu gezeichnet)

let sichtbar = true
let naechsteSeiteZeigen = false // gesetzt von einem Zurück-Knopf: die Zielseite zeigt die Leiste
const zuhoerer = new Set<() => void>()

function setzeSichtbar(neu: boolean) {
  if (neu === sichtbar) return
  sichtbar = neu
  zuhoerer.forEach((f) => f())
}

export function useLeisteSichtbar() {
  return useSyncExternalStore(
    (f) => {
      zuhoerer.add(f)
      return () => zuhoerer.delete(f)
    },
    () => sichtbar,
  )
}

/** Für alle Zurück-Knöpfe: Leiste sofort einblenden und auch auf der nächsten Seite sichtbar lassen. */
export function zeigeLeiste() {
  naechsteSeiteZeigen = true
  setzeSichtbar(true)
  // Falls gar keine Navigation folgt (z. B. "‹ Listen" innerhalb einer Seite): Merker wieder löschen
  setTimeout(() => (naechsteSeiteZeigen = false), 600)
}

/** Seiten, auf denen die Leiste beim Öffnen sichtbar ist. */
export function istUebersicht(pfad: string) {
  return pfad === '/' || pfad === '/mehr' || TAB_IDS.some((id) => pfad === `/${id}`)
}

// ---------- Abstände ----------
const WISCH_ZONE_UNTEN = 40 // px vom unteren Rand: darunter ist der iOS-Home-Balken
const WISCH_ZONE_OBEN = 120
const MIN_WISCH = 30 // so weit (px) muss der Finger nach oben wandern
const SCROLL_SCHWELLE = 8 // kleine Zitterbewegungen beim Scrollen ignorieren

/**
 * Steuert die Sichtbarkeit: Seitenwechsel, Scrollen im Inhalt und die Wischgeste.
 * `inhalt` ist der scrollbare Bereich (<main> in App.tsx).
 */
export function useLeistenSteuerung(inhalt: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation()
  const art = useNavigationType() // "POP" = Zurück/Vor im Verlauf

  // 1. Seitenwechsel
  useEffect(() => {
    setzeSichtbar(istUebersicht(pathname) || naechsteSeiteZeigen || art === 'POP')
    naechsteSeiteZeigen = false
  }, [pathname, art])

  // 2. Scrollen: runter = weg, hoch = wieder da
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
      if (diff > 0 && oben > 40) setzeSichtbar(false)
      else if (diff < 0) setzeSichtbar(true)
      letzte = oben
    }
    el.addEventListener('scroll', beimScrollen, { passive: true })
    return () => el.removeEventListener('scroll', beimScrollen)
  }, [inhalt, pathname])

  // 3. Wischgeste knapp über dem Home-Balken
  useEffect(() => {
    let start: { x: number; y: number } | null = null
    const beginn = (e: TouchEvent) => {
      const t = e.touches[0]
      const abstandUnten = window.innerHeight - t.clientY
      start = !sichtbar && e.touches.length === 1 && abstandUnten >= WISCH_ZONE_UNTEN && abstandUnten <= WISCH_ZONE_OBEN ? { x: t.clientX, y: t.clientY } : null
    }
    const bewegung = (e: TouchEvent) => {
      if (!start) return
      const t = e.touches[0]
      const dy = start.y - t.clientY // positiv = nach oben
      const dx = Math.abs(t.clientX - start.x)
      if (dy > MIN_WISCH && dy > dx) {
        setzeSichtbar(true)
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

/** Abstand unten im Inhalt, damit nichts unter der Leiste (oder dem Griff) verschwindet. */
export const abstandUnten = (leisteDa: boolean) => (leisteDa ? '100px' : 'calc(env(safe-area-inset-bottom) + 40px)')

// iOS-typische Bewegung: 250 ms, schnell los und sanft auslaufen (ease-out)
const BEWEGUNG = '250ms cubic-bezier(0.2, 0.8, 0.2, 1)'

/** Die schwebende Leiste mit Milchglas-Hintergrund. */
export function TabLeiste({ children }: { children: ReactNode }) {
  const da = useLeisteSichtbar()
  return (
    <>
      <nav
        aria-hidden={!da}
        className="fixed inset-x-2.5 z-40 flex items-center rounded-[32px] bg-white/[0.12] px-2 py-3 backdrop-blur-2xl backdrop-saturate-[1.8]"
        style={{
          bottom: 10, // tief am Rand wie auf dem iPhone, der Home-Balken liegt knapp darunter
          // Versteckt: ganz nach unten aus dem Bild schieben (eigene Höhe + Abstand + Home-Balken)
          transform: da ? 'translateY(0)' : 'translateY(calc(100% + 20px + env(safe-area-inset-bottom)))',
          transition: `transform ${BEWEGUNG}`,
          pointerEvents: da ? 'auto' : 'none',
        }}
      >
        {children}
      </nav>

      {/* Griff: nur sichtbar, solange die Leiste versteckt ist. Antippen geht auch. */}
      <button
        onClick={() => setzeSichtbar(true)}
        aria-label="Tab-Leiste einblenden"
        tabIndex={da ? -1 : 0}
        className="fixed left-1/2 z-40 flex h-7 w-24 -translate-x-1/2 items-center justify-center"
        style={{
          // knapp über dem Home-Balken, also mitten in der Wisch-Zone
          bottom: 'calc(env(safe-area-inset-bottom) + 10px)',
          opacity: da ? 0 : 1,
          transition: `opacity ${BEWEGUNG}`,
          pointerEvents: da ? 'none' : 'auto',
        }}
      >
        <span className="h-[5px] w-9 rounded-full bg-white/35 backdrop-blur" />
      </button>
    </>
  )
}

/** Ein App-Icon in der Leiste. Der aktive Bereich bekommt einen Punkt darunter. */
export function LeistenIcon({ to, label, children }: { to: string; label: string; children: ReactNode }) {
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
