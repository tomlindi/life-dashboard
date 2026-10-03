// Kleine Helfer rund um Datum und Uhrzeit.
// Wir speichern Tage immer als Text "2026-10-03" (Jahr-Monat-Tag).
// Das lässt sich einfach vergleichen und sortieren.

const zweistellig = (n: number) => String(n).padStart(2, '0')

/** Wandelt ein Datum in "JJJJ-MM-TT" um (in deiner lokalen Zeitzone). */
export function tagString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${zweistellig(d.getMonth() + 1)}-${zweistellig(d.getDate())}`
}

/** Heute als "JJJJ-MM-TT". */
export const heute = () => tagString()

/** Verschiebt einen Tag um n Tage (negativ = zurück). */
export function tagPlus(tag: string, n: number): string {
  const d = new Date(tag + 'T12:00:00') // 12 Uhr vermeidet Probleme mit der Sommerzeit
  d.setDate(d.getDate() + n)
  return tagString(d)
}

/** Die letzten n Tage inklusive heute, älteste zuerst. */
export function letzteTage(n: number): string[] {
  return Array.from({ length: n }, (_, i) => tagPlus(heute(), i - (n - 1)))
}

/** Montag der aktuellen Woche. */
export function wochenStart(): string {
  const d = new Date()
  const tagImWoche = (d.getDay() + 6) % 7 // Montag = 0
  return tagPlus(tagString(d), -tagImWoche)
}

/** Montag der Woche, in der ein Tag liegt. */
export function wocheVon(tag: string): string {
  const d = new Date(tag + 'T12:00:00')
  return tagPlus(tag, -((d.getDay() + 6) % 7))
}

/** Uhrzeit "08:30" aus einem ISO-Zeitstempel. */
export function uhrzeit(iso: string): string {
  const d = new Date(iso)
  return `${zweistellig(d.getHours())}:${zweistellig(d.getMinutes())}`
}

/** Tag eines ISO-Zeitstempels in lokaler Zeit. */
export const tagVon = (iso: string) => tagString(new Date(iso))

/** "Samstag, 3. Oktober" */
export function langesDatum(d: Date = new Date()): string {
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** "Mo", "Di", ... für Diagramme. */
export function kurzerWochentag(tag: string): string {
  return new Date(tag + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')
}

/** Begrüßung je nach Tageszeit. */
export function begruessung(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

/** Zufällige eindeutige ID für neue Einträge. */
export const neueId = () => crypto.randomUUID()
