// Hell / Dunkel / Automatisch (Einstellungen → Darstellung).
// Gespeichert im localStorage dieses Geräts (wie bei Apple pro Gerät), damit die Farbe schon vor dem
// ersten Bild feststeht und nichts aufblitzt. Die Farben selbst stehen in index.css.
import { useSyncExternalStore } from 'react'

export type Darstellung = 'hell' | 'dunkel' | 'auto'

const SCHLUESSEL = 'darstellung'
const STANDARD: Darstellung = 'dunkel'
const zuhoerer = new Set<() => void>()
const hellAbfrage = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null

export function holeDarstellung(): Darstellung {
  try {
    const wert = localStorage.getItem(SCHLUESSEL)
    return wert === 'hell' || wert === 'dunkel' || wert === 'auto' ? wert : STANDARD
  } catch {
    return STANDARD // privater Modus: localStorage kann fehlen
  }
}

/** Ist gerade wirklich der helle Modus zu sehen? */
const istHell = (d: Darstellung) => d === 'hell' || (d === 'auto' && !!hellAbfrage?.matches)

/** Setzt data-theme am <html> und die Farbe der Statusleiste. */
export function wendeDarstellungAn(d: Darstellung = holeDarstellung()) {
  document.documentElement.dataset.theme = d
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', istHell(d) ? '#f2f2f7' : '#000000')
}

export function setzeDarstellung(d: Darstellung) {
  try {
    localStorage.setItem(SCHLUESSEL, d)
  } catch {
    // ohne localStorage gilt die Wahl nur bis zum Neuladen
  }
  wendeDarstellungAn(d)
  zuhoerer.forEach((f) => f())
}

// "Automatisch": Wechselt das iPhone zwischen hell und dunkel, die Statusleiste mitziehen
hellAbfrage?.addEventListener('change', () => wendeDarstellungAn())

/** Hook: aktuelle Darstellung, aktualisiert sich beim Umschalten. */
export function useDarstellung(): [Darstellung, (d: Darstellung) => void] {
  const wert = useSyncExternalStore(
    (f) => {
      zuhoerer.add(f)
      return () => zuhoerer.delete(f)
    },
    holeDarstellung,
  )
  return [wert, setzeDarstellung]
}

/**
 * Akzentfarbe für Text (Überschriften, Links): im Light Mode etwas dunkler, damit helle Farben wie Hellblau
 * oder Gelb auf weißem Grund lesbar bleiben. Im Dark Mode unverändert. Die Stärke steht in index.css (--abdunkeln).
 */
export const lesbar = (farbe?: string) => (farbe ? `color-mix(in srgb, ${farbe}, #000 var(--abdunkeln))` : undefined)
