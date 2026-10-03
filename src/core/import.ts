// IMPORT der Daten aus dem iPhone-Kurzbefehl (Apple Health, Kalender, Erinnerungen).
//
// Das Format (Version 1) ist in docs/KURZBEFEHL.md genau beschrieben. Kurz:
// {
//   "version": 1,
//   "schritte": [{ "datum": "2026-10-02", "anzahl": 8421 }],
//   "workouts": [{ "art": "Laufen", "start": "2026-10-02T17:30:00+02:00", "dauerMin": 42, "distanzKm": 6.8 }],
//   "schlaf":   [{ "datum": "2026-10-02", "stunden": 7.4 }]   oder Einzel-Phasen mit start/ende,
//   "gewicht":  [{ "datum": "2026-10-01", "kg": 68.2 }],
//   "termine":  [{ "titel": "Mathe", "start": "...", "ende": "...", "ort": "..." }],
//   "aufgaben": [{ "titel": "Referat", "faellig": "2026-10-10" }]
// }
// Alle Teile sind optional. Der Import ist absichtlich großzügig: Zahlen mit Komma ("7,5"),
// deutsche Datumsangaben ("02.10.2026, 17:30") und einzelne Objekte statt Listen werden akzeptiert,
// weil die Kurzbefehle-App Daten manchmal so ausgibt.
//
// DUPLIKATE: Jeder Eintrag bekommt eine feste ID (z. B. Workout = Quelle + Startzeit).
// Wird derselbe Eintrag nochmal importiert, wird er aktualisiert statt doppelt angelegt.
//
// STRAVA SPÄTER: Eine direkte Strava-Anbindung müsste nur Workouts mit quelle "strava" liefern
// (siehe src/core/strava.ts). Der Rest der App funktioniert dann unverändert.
import { db, setzeEinstellung, type Quelle } from './db'
import { tagString, tagPlus, heute } from './datum'

// ---------- Hilfsfunktionen zum "Aufräumen" der Eingabedaten ----------

/** Macht aus allem eine Liste: [a,b] bleibt, {a} wird [{a}], nichts wird []. */
const liste = (x: unknown): Record<string, unknown>[] =>
  Array.isArray(x) ? x.filter((e) => e && typeof e === 'object') : x && typeof x === 'object' ? [x as Record<string, unknown>] : []

/** "7,5" / "7.5" / 7.5 / "8.421 Schritte" -> Zahl (oder NaN) */
function zahl(x: unknown): number {
  if (typeof x === 'number') return x
  if (typeof x !== 'string') return NaN
  let s = x.trim().replace(/[^\d,.-]/g, '')
  // "8.421" (deutscher Tausenderpunkt) vs. "7.5" (Dezimalpunkt): drei Ziffern nach dem Punkt = Tausender
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '')
  return parseFloat(s.replace(',', '.'))
}

/** Erkennt ISO-Daten und deutsche Daten wie "02.10.2026, 17:30" oder "2.10.26 um 17:30". */
function zeitpunkt(x: unknown): Date | null {
  if (typeof x !== 'string' && typeof x !== 'number') return null
  const s = String(x).trim()
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\D+(\d{1,2}):(\d{2}))?/)
  if (de) {
    const jahr = de[3].length === 2 ? 2000 + Number(de[3]) : Number(de[3])
    return new Date(jahr, Number(de[2]) - 1, Number(de[1]), Number(de[4] ?? 0), Number(de[5] ?? 0))
  }
  // Reines Datum "2026-10-02" als lokalen Tag behandeln (nicht als UTC)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T12:00:00')
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Tag "JJJJ-MM-TT" aus einem beliebigen Datumswert. */
function tag(x: unknown): string | null {
  if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.trim())) return x.trim()
  const d = zeitpunkt(x)
  return d ? tagString(d) : null
}

/** Nimmt den ersten vorhandenen Wert aus mehreren möglichen Feldnamen. */
const feld = (o: Record<string, unknown>, ...namen: string[]) => namen.map((n) => o[n]).find((v) => v !== undefined && v !== null && v !== '')

/** Übersetzt Workout-Arten (auch englische aus Health/Strava) in unsere Namen. */
export function workoutArt(roh: unknown): string {
  const s = String(roh ?? '').toLowerCase()
  if (/kraft|strength|gym|functional|hiit|core|weight/.test(s)) return 'Gym'
  if (/lauf|run|jogg/.test(s)) return 'Laufen'
  if (/rad|cycl|bike|ride/.test(s)) return 'Rad'
  if (/schwimm|swim/.test(s)) return 'Schwimmen'
  if (/yoga|pilates/.test(s)) return 'Yoga'
  if (/geh|walk|wander|hik/.test(s)) return 'Gehen'
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Sonstiges'
}

/** Gesamtlänge mehrerer Zeitspannen, Überlappungen zählen nur einmal (z. B. Uhr + iPhone). */
function vereinigteStunden(spannen: [number, number][]): number {
  const sortiert = [...spannen].sort((a, b) => a[0] - b[0])
  let summe = 0
  let [aktStart, aktEnde] = sortiert[0] ?? [0, 0]
  for (const [s, e] of sortiert.slice(1)) {
    if (s <= aktEnde) aktEnde = Math.max(aktEnde, e)
    else {
      summe += aktEnde - aktStart
      ;[aktStart, aktEnde] = [s, e]
    }
  }
  summe += aktEnde - aktStart
  return summe / 3_600_000
}

// ---------- Prüfen & Importieren ----------

export interface Zaehler {
  neu: number
  aktualisiert: number
}
export type ImportErgebnis = Record<'schritte' | 'workouts' | 'schlaf' | 'gewicht' | 'termine' | 'aufgaben', Zaehler> & { hinweise: string[] }

/** Wandelt Text in ein Objekt um und prüft grob, ob es unser Format ist. */
export function leseImportText(text: string): Record<string, unknown> {
  let daten: unknown
  try {
    daten = JSON.parse(text.trim())
  } catch {
    throw new Error('Das ist kein gültiges JSON. Hast du den Kurzbefehl ausgeführt, bevor du hier importierst?')
  }
  if (!daten || typeof daten !== 'object' || Array.isArray(daten)) throw new Error('Unerwartetes Format: Es wird ein JSON-Objekt { … } erwartet.')
  const o = daten as Record<string, unknown>
  if ('tabellen' in o && o.app === 'life-dashboard') throw new Error('Das ist ein Backup. Bitte unter „Backup & Daten“ wiederherstellen.')
  const bekannte = ['schritte', 'workouts', 'schlaf', 'gewicht', 'termine', 'aufgaben']
  if (!bekannte.some((k) => k in o)) throw new Error('Keine bekannten Daten gefunden (erwartet: ' + bekannte.join(', ') + ').')
  return o
}

export async function importiere(o: Record<string, unknown>): Promise<ImportErgebnis> {
  const leer = (): Zaehler => ({ neu: 0, aktualisiert: 0 })
  const erg: ImportErgebnis = { schritte: leer(), workouts: leer(), schlaf: leer(), gewicht: leer(), termine: leer(), aufgaben: leer(), hinweise: [] }

  // Alles in einer "Transaktion": Entweder klappt der ganze Import oder gar nichts wird geändert.
  await db.transaction('rw', [db.schritte, db.workouts, db.schlaf, db.gewicht, db.termine, db.aufgaben], async () => {
    // --- Schritte: Werte pro Tag aufsummieren (falls Health Einzelmessungen liefert) ---
    const schritteProTag = new Map<string, number>()
    for (const e of liste(o.schritte)) {
      const t = tag(feld(e, 'datum', 'start', 'tag'))
      const n = zahl(feld(e, 'anzahl', 'wert', 'schritte', 'value'))
      if (t && Number.isFinite(n)) schritteProTag.set(t, (schritteProTag.get(t) ?? 0) + n)
    }
    for (const [datum, anzahl] of schritteProTag) {
      const alt = await db.schritte.get(datum)
      await db.schritte.put({ datum, anzahl: Math.round(anzahl) }) // ersetzt den Tageswert (keine Doppelzählung)
      erg.schritte[alt ? 'aktualisiert' : 'neu']++
    }

    // --- Workouts ---
    for (const e of liste(o.workouts)) {
      const start = zeitpunkt(feld(e, 'start', 'startdatum', 'beginn'))
      if (!start) continue
      const ende = zeitpunkt(feld(e, 'ende', 'enddatum'))
      let dauerMin = zahl(feld(e, 'dauerMin', 'dauer', 'minuten'))
      if (!Number.isFinite(dauerMin) && ende) dauerMin = (ende.getTime() - start.getTime()) / 60000
      if (!Number.isFinite(dauerMin)) dauerMin = 0
      const q = String(feld(e, 'quelle') ?? '').toLowerCase()
      const quelle: Quelle = q === 'strava' || q === 'manuell' ? q : 'health'
      const km = zahl(feld(e, 'distanzKm', 'distanz', 'km'))
      // ID = Quelle + Startzeit auf die Minute genau -> gleiches Workout = gleiche ID
      const id = String(feld(e, 'id') ?? `${quelle}:${start.toISOString().slice(0, 16)}`)
      const alt = await db.workouts.get(id)
      await db.workouts.put({
        id,
        quelle,
        art: workoutArt(feld(e, 'art', 'typ', 'name', 'type')),
        start: start.toISOString(),
        dauerMin: Math.round(dauerMin),
        distanzKm: Number.isFinite(km) && km > 0 ? Math.round(km * 100) / 100 : undefined,
      })
      erg.workouts[alt ? 'aktualisiert' : 'neu']++
    }

    // --- Schlaf: entweder fertige Stunden pro Tag oder einzelne Phasen (start/ende) ---
    const stundenProTag = new Map<string, number>()
    const phasenProTag = new Map<string, [number, number][]>()
    for (const e of liste(o.schlaf)) {
      const stunden = zahl(feld(e, 'stunden', 'dauerStunden'))
      const t = tag(feld(e, 'datum', 'tag'))
      if (t && Number.isFinite(stunden)) {
        stundenProTag.set(t, stunden)
        continue
      }
      // Einzelne Phase: "Im Bett" und "Wach" zählen nicht als Schlaf
      const stadium = String(feld(e, 'stadium', 'wert', 'value', 'typ') ?? '')
      if (/bett|inbed|in bed|wach|awake/i.test(stadium)) continue
      const s = zeitpunkt(feld(e, 'start', 'startdatum'))
      const en = zeitpunkt(feld(e, 'ende', 'enddatum'))
      if (!s || !en || en <= s) continue
      const wachTag = tagString(en) // Schlaf zählt für den Tag, an dem man aufwacht
      phasenProTag.set(wachTag, [...(phasenProTag.get(wachTag) ?? []), [s.getTime(), en.getTime()]])
    }
    for (const [t, spannen] of phasenProTag) stundenProTag.set(t, vereinigteStunden(spannen))
    for (const [datum, stunden] of stundenProTag) {
      const alt = await db.schlaf.get(datum)
      // Qualitätsbewertung, die du in der App vergeben hast, bleibt erhalten
      await db.schlaf.put({ datum, stunden: Math.round(stunden * 100) / 100, qualitaet: alt?.qualitaet, quelle: 'health' })
      erg.schlaf[alt ? 'aktualisiert' : 'neu']++
    }

    // --- Gewicht ---
    for (const e of liste(o.gewicht)) {
      const datum = tag(feld(e, 'datum', 'start'))
      const kg = zahl(feld(e, 'kg', 'wert', 'value'))
      if (!datum || !Number.isFinite(kg)) continue
      const alt = await db.gewicht.get(datum)
      await db.gewicht.put({ datum, kg: Math.round(kg * 10) / 10 })
      erg.gewicht[alt ? 'aktualisiert' : 'neu']++
    }

    // --- Termine ---
    if ('termine' in o) {
      const importierteIds = new Set<string>()
      for (const e of liste(o.termine)) {
        const titel = String(feld(e, 'titel', 'title', 'name') ?? '').trim()
        const start = zeitpunkt(feld(e, 'start', 'startdatum', 'beginn'))
        if (!titel || !start) continue
        const ende = zeitpunkt(feld(e, 'ende', 'enddatum'))
        const id = String(feld(e, 'id') ?? `kal:${titel}|${start.toISOString().slice(0, 16)}`)
        importierteIds.add(id)
        const alt = await db.termine.get(id)
        await db.termine.put({
          id,
          quelle: 'kalender',
          titel,
          start: start.toISOString(),
          ende: ende?.toISOString(),
          ort: feld(e, 'ort', 'location') ? String(feld(e, 'ort', 'location')) : undefined,
          zielId: alt?.zielId, // Zuordnung zu Ziel/Projekt bleibt erhalten
          projektId: alt?.projektId,
        })
        erg.termine[alt ? 'aktualisiert' : 'neu']++
      }
      // Termine der nächsten 14 Tage, die nicht mehr im Kalender stehen (gelöscht/verschoben), entfernen
      const von = new Date().toISOString()
      const bis = new Date(`${tagPlus(heute(), 14)}T00:00:00`).toISOString()
      const veraltet = await db.termine.where('start').between(von, bis).filter((t) => t.quelle === 'kalender' && !importierteIds.has(t.id)).primaryKeys()
      await db.termine.bulkDelete(veraltet)
      if (veraltet.length) erg.hinweise.push(`${veraltet.length} Termine entfernt (nicht mehr im Kalender)`)
    }

    // --- Aufgaben aus Erinnerungen ---
    if ('aufgaben' in o) {
      const importierteIds = new Set<string>()
      for (const e of liste(o.aufgaben)) {
        const titel = String(feld(e, 'titel', 'title', 'name') ?? '').trim()
        if (!titel) continue
        // ID nur aus dem Titel: ändert sich das Fälligkeitsdatum, bleibt es dieselbe Aufgabe
        const id = String(feld(e, 'id') ?? `erinnerungen:${titel.toLowerCase()}`)
        importierteIds.add(id)
        const alt = await db.aufgaben.get(id)
        await db.aufgaben.put({
          id,
          quelle: 'erinnerungen',
          titel,
          faellig: tag(feld(e, 'faellig', 'fällig', 'due', 'datum')) ?? undefined,
          erledigt: alt?.erledigt ?? false, // in der App abgehakt? Dann bleibt es abgehakt.
        })
        erg.aufgaben[alt ? 'aktualisiert' : 'neu']++
      }
      // Aufgaben, die in Erinnerungen nicht mehr offen sind, gelten als erledigt
      const fertig = await db.aufgaben.filter((a) => a.quelle === 'erinnerungen' && !a.erledigt && !importierteIds.has(a.id)).primaryKeys()
      for (const id of fertig) await db.aufgaben.update(id, { erledigt: true })
      if (fertig.length) erg.hinweise.push(`${fertig.length} Aufgaben als erledigt markiert (in Erinnerungen abgehakt)`)
    }
  })

  await setzeEinstellung('letzterImport', new Date().toISOString())
  return erg
}

/** Kurze Zusammenfassung für die Anzeige, z. B. "Workouts: 2 neu, 5 aktualisiert". */
export function zusammenfassung(e: ImportErgebnis): string[] {
  const namen = { schritte: 'Schritte (Tage)', workouts: 'Workouts', schlaf: 'Schlaf (Nächte)', gewicht: 'Gewicht', termine: 'Termine', aufgaben: 'Aufgaben' } as const
  const zeilen = (Object.keys(namen) as (keyof typeof namen)[])
    .map((k) => {
      const name = namen[k]
      const z = e[k]
      return z.neu + z.aktualisiert > 0 ? `${name}: ${z.neu} neu, ${z.aktualisiert} aktualisiert` : null
    })
    .filter((z): z is string => z !== null)
  return [...(zeilen.length ? zeilen : ['Keine neuen Daten gefunden.']), ...e.hinweise]
}
