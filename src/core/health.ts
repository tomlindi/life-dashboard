// APPLE HEALTH: Werte aus Life Sync verstehen und auswerten.
//
// Jede Health-Zeile vom Kurzbefehl hat dasselbe Format:
//   {"typ":"health","art":"schritte","start":"2026-10-12T00:00:00+02:00","ende":"2026-10-13T00:00:00+02:00","wert":"8432","einheit":"count"}
// "wert" ist Text und kann Einheiten oder ein Komma enthalten ("72,4 kg", "0,18", "1,5 l").
//
// Diese Datei hat absichtlich keine Verbindung zur Datenbank: Sie rechnet nur.
// So lässt sie sich einfach testen (siehe scripts/test-import.mjs).

const STUNDE = 3_600_000
const MINUTE = 60_000

// ---------- Arten ----------

export type HealthArt = 'schritte' | 'schlaf' | 'gewicht' | 'groesse' | 'kfa' | 'wasser' | 'alkohol' | 'kalorien' | 'protein' | 'kohlenhydrate' | 'fett'

/** Erkennt die Art, auch mit anderer Schreibweise oder auf Englisch. Unbekannt -> null. */
export function healthArt(roh: unknown): HealthArt | null {
  const s = String(roh ?? '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
  if (/^(schritte|steps?|step ?count)$/.test(s)) return 'schritte'
  if (/^(schlaf|schlafanalyse|sleep|sleep ?analysis)$/.test(s)) return 'schlaf'
  if (/^(gewicht|koerpergewicht|weight|body ?mass)$/.test(s)) return 'gewicht'
  if (/^(groesse|koerpergroesse|height)$/.test(s)) return 'groesse'
  if (/^(kfa|koerperfett|koerperfettanteil|body ?fat( percentage)?)$/.test(s)) return 'kfa'
  if (/^(wasser|water)$/.test(s)) return 'wasser'
  if (/^(alkohol|alkoholische getraenke|alcohol(ic beverages)?)$/.test(s)) return 'alkohol'
  if (/^(kalorien|kcal|energie|nahrungsenergie|dietary ?energy|energy|calories)$/.test(s)) return 'kalorien'
  if (/^(protein|eiweiss)$/.test(s)) return 'protein'
  if (/^(kohlenhydrate|carbs|carbohydrates)$/.test(s)) return 'kohlenhydrate'
  if (/^(fett|fat|total ?fat)$/.test(s)) return 'fett'
  return null
}

/** Arten, die pro Tag addiert werden (alle anderen: der letzte Messwert des Tages zählt). */
export const TAGESSUMMEN: HealthArt[] = ['schritte', 'wasser', 'alkohol', 'kalorien', 'protein', 'kohlenhydrate', 'fett']

/** Anzeige-Namen, z. B. für die Import-Meldung. */
export const ART_NAMEN: Record<HealthArt, string> = {
  schritte: 'Schritte',
  schlaf: 'Schlaf',
  gewicht: 'Gewicht',
  groesse: 'Größe',
  kfa: 'KFA',
  wasser: 'Wasser',
  alkohol: 'Alkohol',
  kalorien: 'Kalorien',
  protein: 'Protein',
  kohlenhydrate: 'Kohlenhydrate',
  fett: 'Fett',
}

// ---------- Zahlen lesen ----------

/**
 * Liest eine Zahl aus Text, egal wie sie geschrieben ist:
 * "72,4 kg" -> 72.4 · "8.432" -> 8432 · "1.234,5" -> 1234.5 · "1,234.5" -> 1234.5 · "0,18" -> 0.18 · "18 %" -> 18
 */
export function leseZahl(x: unknown): number {
  if (typeof x === 'number') return x
  if (typeof x !== 'string') return NaN
  const treffer = x.replace(/\s/g, '').match(/-?[\d.,]*\d/)
  if (!treffer) return NaN
  let s = treffer[0]
  const komma = s.lastIndexOf(',')
  const punkt = s.lastIndexOf('.')
  if (komma >= 0 && punkt >= 0) {
    // Beides vorhanden: das letzte Zeichen von beiden ist das Dezimalzeichen
    s = komma > punkt ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (komma >= 0) {
    // Nur Komma: "72,4" Dezimal. Mehrere Kommas ("1,234,567") = Tausender
    s = (s.match(/,/g)!.length > 1 ? s.replace(/,/g, '') : s.replace(',', '.'))
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // "8.432" oder "1.234.567": deutscher Tausenderpunkt (genau drei Ziffern dahinter)
    s = s.replace(/\./g, '')
  }
  return parseFloat(s)
}

/**
 * Rechnet in die Standardeinheit der App um:
 * Gewicht kg · Größe cm · KFA % · Wasser ml · Kalorien kcal · Makros g · Schritte/Alkohol Anzahl.
 * `einheit` ist das Feld "einheit" plus der Text aus "wert" (z. B. "72,4 kg").
 */
export function inStandardEinheit(art: HealthArt, zahl: number, einheit: string): number {
  const e = einheit.toLowerCase()
  switch (art) {
    case 'gewicht':
      if (/\blb|pfund|pound/.test(e)) return zahl * 0.45359237
      if (/(^|[^k])g\b/.test(e) && zahl > 500) return zahl / 1000 // Gramm
      return zahl
    case 'groesse':
      if (/\bcm\b/.test(e)) return zahl
      if (/\bm\b/.test(e) || zahl < 3) return zahl * 100 // Meter -> cm
      return zahl
    case 'kfa':
      return zahl <= 1 ? zahl * 100 : zahl // 0,18 -> 18 %
    case 'wasser':
      if (/\bml\b/.test(e)) return zahl
      if (/\bcl\b/.test(e)) return zahl * 10
      if (/fl.?oz/.test(e)) return zahl * 29.5735
      if (/\bl\b|liter/.test(e) || zahl < 20) return zahl * 1000 // Liter -> ml
      return zahl
    case 'kalorien':
      return /\bkj\b/.test(e) ? zahl / 4.184 : zahl
    case 'protein':
    case 'kohlenhydrate':
    case 'fett':
      return /\bmg\b/.test(e) ? zahl / 1000 : zahl
    default:
      return zahl
  }
}

// ---------- Schlaf ----------

export type SchlafPhase = 'kern' | 'tief' | 'rem' | 'schlafend' | 'wach' | 'bett'

/** "Kern", "Core", "Tief", "Deep", "REM", "Wach", "Awake", "Im Bett", "In Bed", "Schlafend", "Asleep" … */
export function schlafPhase(roh: unknown): SchlafPhase {
  const s = String(roh ?? '').toLowerCase()
  if (/rem/.test(s)) return 'rem'
  if (/tief|deep/.test(s)) return 'tief'
  if (/kern|core|leicht|light/.test(s)) return 'kern'
  if (/bett|bed/.test(s)) return 'bett'
  if (/wach|awake/.test(s)) return 'wach'
  return 'schlafend' // "Schlafend", "Asleep", "Unspecified" und Unbekanntes
}

export const SCHLAF_PHASEN: { key: SchlafPhase; name: string; farbe: string }[] = [
  { key: 'wach', name: 'Wach', farbe: '#FF9F0A' },
  { key: 'rem', name: 'REM', farbe: '#64D2FF' },
  { key: 'kern', name: 'Kern', farbe: '#0A84FF' },
  { key: 'tief', name: 'Tief', farbe: '#5E5CE6' },
  { key: 'schlafend', name: 'Schlafend', farbe: '#40C8E0' },
]

/** Ein Schlaf-Eintrag, wie er für die Auswertung gebraucht wird. */
export interface PhasenEintrag {
  start: string // ISO
  ende?: string
  phase?: SchlafPhase
}

export interface Nacht {
  datum: string // "JJJJ-MM-TT" (der Morgen, an dem du aufwachst)
  einschlafen: string // ISO: Beginn der ersten Schlafphase
  aufwachen: string // ISO: Ende der letzten Schlafphase
  minuten: Record<SchlafPhase, number>
  schlafMin: number // Kern + Tief + REM (bzw. "Schlafend", wenn es keine Phasen gibt)
  hatPhasen: boolean // true = Kern/Tief/REM vorhanden (meist von der Apple Watch)
}

/** Lokaler Tag "JJJJ-MM-TT" eines Zeitpunkts (in Millisekunden). */
const tagAus = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Zu welcher Nacht gehört eine Phase? Alles, was zwischen 12:00 am Vortag und 12:00 beginnt,
 * zählt zur Nacht, die an diesem Morgen endet. (Start + 12 h ergibt genau diesen Tag.)
 */
export const nachtVon = (startIso: string) => tagAus(Date.parse(startIso) + 12 * STUNDE)

/** Gesamtlänge mehrerer Zeitspannen in Minuten; Überlappungen (Uhr + iPhone) zählen nur einmal. */
export function vereinigteMinuten(spannen: [number, number][]): number {
  const sortiert = spannen.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0])
  let summe = 0
  let akt: [number, number] | null = null
  for (const [s, e] of sortiert) {
    if (akt && s <= akt[1]) akt[1] = Math.max(akt[1], e)
    else {
      if (akt) summe += akt[1] - akt[0]
      akt = [s, e]
    }
  }
  if (akt) summe += akt[1] - akt[0]
  return summe / MINUTE
}

/** Fasst einzelne Schlafphasen zu Nächten zusammen (neueste zuerst). */
export function naechte(eintraege: PhasenEintrag[]): Nacht[] {
  const proNacht = new Map<string, { phase: SchlafPhase; s: number; e: number }[]>()
  for (const x of eintraege) {
    const s = Date.parse(x.start)
    const e = x.ende ? Date.parse(x.ende) : NaN
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) continue
    const n = nachtVon(x.start)
    if (!proNacht.has(n)) proNacht.set(n, [])
    proNacht.get(n)!.push({ phase: x.phase ?? 'schlafend', s, e })
  }

  const ergebnis: Nacht[] = []
  for (const [datum, phasen] of proNacht) {
    // Liefert die Uhr echte Phasen, sind "Schlafend"-Einträge (z. B. vom iPhone) doppelt -> weglassen
    const hatPhasen = phasen.some((p) => p.phase === 'kern' || p.phase === 'tief' || p.phase === 'rem')
    const genutzt = hatPhasen ? phasen.filter((p) => p.phase !== 'schlafend') : phasen
    const minuten = {} as Record<SchlafPhase, number>
    for (const { key } of [...SCHLAF_PHASEN, { key: 'bett' as const }]) {
      minuten[key] = vereinigteMinuten(genutzt.filter((p) => p.phase === key).map((p) => [p.s, p.e]))
    }
    const schlaf = genutzt.filter((p) => p.phase !== 'wach' && p.phase !== 'bett')
    const schlafMin = vereinigteMinuten(schlaf.map((p) => [p.s, p.e]))
    if (schlafMin === 0) continue // nur "Im Bett"/"Wach": kein Schlaf gemessen
    ergebnis.push({
      datum,
      einschlafen: new Date(Math.min(...schlaf.map((p) => p.s))).toISOString(),
      aufwachen: new Date(Math.max(...schlaf.map((p) => p.e))).toISOString(),
      minuten,
      schlafMin,
      hatPhasen,
    })
  }
  return ergebnis.sort((a, b) => b.datum.localeCompare(a.datum))
}

/** Einschlafzeit als Minuten ab 18:00 (so liegen 23:30 und 00:30 nah beieinander statt 23 h auseinander). */
function minutenAb18Uhr(iso: string) {
  const d = new Date(iso)
  return (((d.getHours() - 18 + 24) % 24) * 60 + d.getMinutes())
}

export interface SchlafIndex {
  wert: number // 0 bis 100
  teile: { name: string; punkte: number; max: number }[]
}

/**
 * EIGENER Schlafindex 0–100 (nicht Apples Schlafwert):
 *   Dauer im Verhältnis zum Ziel   40 Punkte  (voll ab Ziel)
 *   Anteil Tief + REM              25 Punkte  (voll ab 40 % der Schlafzeit)
 *   Wachzeit in der Nacht          15 Punkte  (voll bei 0 min, 0 Punkte ab 60 min)
 *   Regelmäßigkeit                 20 Punkte  (Einschlafzeit vs. Ø der 7 Nächte davor; 0 Punkte ab 90 min Abweichung)
 * Ohne Phasen (nur "Schlafend") zählen nur Dauer und Regelmäßigkeit, hochgerechnet auf 100.
 * `vorher` = die Nächte VOR dieser (beliebige Reihenfolge).
 */
export function schlafIndex(nacht: Nacht, zielStunden: number, vorher: Nacht[]): SchlafIndex {
  const begrenzt = (x: number) => Math.min(1, Math.max(0, x))
  const dauer = begrenzt(nacht.schlafMin / 60 / zielStunden)

  // Regelmäßigkeit: ohne Vergleichsnächte volle Punkte (es gibt noch nichts zu vergleichen)
  const vergleich = vorher
    .filter((n) => n.datum < nacht.datum)
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .slice(0, 7)
  let regel = 1
  if (vergleich.length) {
    const schnitt = vergleich.reduce((s, n) => s + minutenAb18Uhr(n.einschlafen), 0) / vergleich.length
    regel = begrenzt(1 - Math.abs(minutenAb18Uhr(nacht.einschlafen) - schnitt) / 90)
  }

  const teile = nacht.hatPhasen
    ? [
        { name: 'Dauer', punkte: 40 * dauer, max: 40 },
        { name: 'Tief + REM', punkte: 25 * begrenzt((nacht.minuten.tief + nacht.minuten.rem) / nacht.schlafMin / 0.4), max: 25 },
        { name: 'Wachzeit', punkte: 15 * begrenzt(1 - nacht.minuten.wach / 60), max: 15 },
        { name: 'Regelmäßigkeit', punkte: 20 * regel, max: 20 },
      ]
    : [
        { name: 'Dauer', punkte: 60 * dauer, max: 60 },
        { name: 'Regelmäßigkeit', punkte: 40 * regel, max: 40 },
      ]
  return { wert: Math.round(teile.reduce((s, t) => s + t.punkte, 0)), teile: teile.map((t) => ({ ...t, punkte: Math.round(t.punkte) })) }
}

/** Farbe für einen Schlafindex: grün ab 80, gelb ab 60, sonst orange. */
export const indexFarbe = (wert: number) => (wert >= 80 ? '#30D158' : wert >= 60 ? '#FFD60A' : '#FF9F0A')
