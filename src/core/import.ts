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
import { db, holeEinstellung, setzeEinstellung, type Quelle } from './db'
import { aufgabeId, terminId, type AppleAktion } from './apple'
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
  if (/handball/.test(s)) return 'Handball'
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Sonstiges'
}

/**
 * Erkennt ganztägige Termine, auch wenn der Kurzbefehl es nicht mitschickt:
 * Beginn um 00:00 und Ende um 23:59 (oder 00:00 eines späteren Tages), in lokaler Zeit.
 */
function istGanztags(start: Date, ende: Date | null): boolean {
  if (!ende || start.getHours() !== 0 || start.getMinutes() !== 0) return false
  const endeUm2359 = ende.getHours() === 23 && ende.getMinutes() === 59
  const endeUmMitternacht = ende.getHours() === 0 && ende.getMinutes() === 0 && ende > start
  return endeUm2359 || endeUmMitternacht
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

// Das Zerlegen des Textes (ein Objekt, Array, ein Objekt pro Zeile …) steckt in core/importText.ts
export { leseImportText, ImportFehler } from './importText'

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
        // Was du in der App ergänzt hast (Typ, Anstrengung, Tore, Notiz), bleibt erhalten
        typ: alt?.typ,
        anstrengung: alt?.anstrengung,
        tore: alt?.tore,
        notiz: alt?.notiz,
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
          kalender: feld(e, 'kalender', 'calendar') ? String(feld(e, 'kalender', 'calendar')) : undefined,
          ganztaegig: /^(true|ja|1|yes)$/i.test(String(feld(e, 'ganztaegig', 'ganztägig', 'allday') ?? '')) || istGanztags(start, ende) || undefined,
          notiz: feld(e, 'notiz', 'notizen', 'notes') ? String(feld(e, 'notiz', 'notizen', 'notes')) : undefined,
          zielId: alt?.zielId, // Zuordnung zu Ziel/Projekt bleibt erhalten
          projektId: alt?.projektId,
          // "sync" fehlt absichtlich: Apple hat den Termin bestätigt, er ist nicht mehr "ausstehend"
        })
        erg.termine[alt ? 'aktualisiert' : 'neu']++
      }
      // Termine im abgefragten Zeitraum (Standard 14 Tage, einstellbar über "termineTage"),
      // die nicht mehr im Kalender stehen (gelöscht/verschoben), entfernen
      const tage = Math.min(366, Math.max(1, zahl(o.termineTage) || 14))
      const von = new Date().toISOString()
      const bis = new Date(`${tagPlus(heute(), tage)}T00:00:00`).toISOString()
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
          liste: feld(e, 'liste', 'list') ? String(feld(e, 'liste', 'list')) : alt?.liste,
          notiz: feld(e, 'notiz', 'notizen', 'notes') ? String(feld(e, 'notiz', 'notizen', 'notes')) : undefined,
          prioritaet: Number.isFinite(zahl(feld(e, 'prioritaet', 'priorität', 'priority'))) ? zahl(feld(e, 'prioritaet', 'priorität', 'priority')) : undefined,
          // In Apple offen -> auch in Life offen. Ausnahme: in Life abgehakt, aber noch nicht an Apple gesendet.
          erledigt: alt?.sync === 'ausstehend' ? alt.erledigt : false,
          sync: alt?.sync === 'ausstehend' && alt.erledigt ? 'ausstehend' : undefined,
        })
        erg.aufgaben[alt ? 'aktualisiert' : 'neu']++
      }
      // Aufgaben, die in Erinnerungen nicht mehr offen sind, gelten als erledigt
      const fertig = await db.aufgaben.filter((a) => a.quelle === 'erinnerungen' && !a.erledigt && !importierteIds.has(a.id)).primaryKeys()
      for (const id of fertig) await db.aufgaben.update(id, { erledigt: true })
      // Abgehakte Einträge, die Apple nicht mehr meldet, sind bestätigt -> nicht mehr "ausstehend"
      const bestaetigt = await db.aufgaben.filter((a) => a.erledigt && a.sync === 'ausstehend' && !importierteIds.has(a.id)).primaryKeys()
      for (const id of bestaetigt) await db.aufgaben.update(id, { sync: undefined })
      if (fertig.length) erg.hinweise.push(`${fertig.length} Aufgaben als erledigt markiert (in Erinnerungen abgehakt)`)
    }
  })

  // Warteschlange für Apple aufräumen: Was Apple schon gemeldet hat, muss nicht nochmal gesendet werden
  // (sonst gäbe es den Termin/die Erinnerung beim nächsten Abgleich doppelt).
  const warteschlange = await holeEinstellung<AppleAktion[]>('appleWarteschlange', [])
  if (warteschlange.length) {
    const termine = new Set((await db.termine.toArray()).filter((t) => t.quelle === 'kalender').map((t) => t.id))
    const offen = new Set((await db.aufgaben.toArray()).filter((a) => a.quelle === 'erinnerungen').map((a) => a.id))
    const rest = warteschlange.filter((a) => {
      if (a.typ === 'termin' && a.neu && !a.loeschen) return !termine.has(terminId(a.neu.titel, new Date(a.neu.start).toISOString()))
      if (a.typ === 'erinnerung' && a.neu && !a.loeschen) return !offen.has(aufgabeId(a.neu.titel))
      return true
    })
    if (rest.length !== warteschlange.length) await setzeEinstellung('appleWarteschlange', rest)
  }

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
