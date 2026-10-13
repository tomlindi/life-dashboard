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
import { aufgabeId, importierteTerminId, terminId, type AppleAktion } from './apple'
import { vergibKalenderFarben } from '../modules/kalender/farben'
import { tagString, tagPlus, heute } from './datum'
import { ART_NAMEN, healthArt, inStandardEinheit, leseZahl, nachtVon, naechte, schlafPhase, type HealthArt } from './health'

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
  geloescht?: number // nur bei Terminen
}
export type ImportErgebnis = Record<'schritte' | 'workouts' | 'schlaf' | 'gewicht' | 'termine' | 'aufgaben', Zaehler> & {
  hinweise: string[]
  termineTage: number // für welchen Zeitraum der Abgleich der Termine galt
  health: Zaehler // alle Health-Werte zusammen
  healthArten: Record<string, number> // Anzahl Health-Werte je Art, z. B. { schritte: 7, schlaf: 40 }
}

// Das Zerlegen des Textes (ein Objekt, Array, ein Objekt pro Zeile …) steckt in core/importText.ts
export { leseImportText, ImportFehler } from './importText'

/** Standard-Zeitraum für den Termin-Abgleich (Einstellung "termineTage", änderbar in den Einstellungen). */
export const STANDARD_TERMINE_TAGE = 14

export async function importiere(o: Record<string, unknown>): Promise<ImportErgebnis> {
  const leer = (): Zaehler => ({ neu: 0, aktualisiert: 0 })
  // Zeitraum für den Termin-Abgleich: NUR die Einstellung zählt. Ein "termineTage" aus einem älteren
  // Kurzbefehl wird absichtlich ignoriert: Passt er nicht zur echten Abfrage, würden Termine fälschlich gelöscht.
  const termineTage = Math.min(366, Math.max(1, Math.round(await holeEinstellung<number>('termineTage', STANDARD_TERMINE_TAGE))))
  const erg: ImportErgebnis = { schritte: leer(), workouts: leer(), schlaf: leer(), gewicht: leer(), termine: { ...leer(), geloescht: 0 }, aufgaben: leer(), hinweise: [], termineTage, health: leer(), healthArten: {} }
  const kalenderNamen = new Set<string>()
  let termineUebersprungen = 0
  // Zeilen, die schon beim Lesen kaputt waren (siehe importText.ts)
  const uebersprungen = Array.isArray(o.uebersprungen) ? (o.uebersprungen as string[]) : []
  let healthKaputt = 0
  const unbekannteArten = new Map<string, number>()

  // Alles in einer "Transaktion": Entweder klappt der ganze Import oder gar nichts wird geändert.
  await db.transaction('rw', [db.schritte, db.workouts, db.schlaf, db.gewicht, db.termine, db.aufgaben, db.health], async () => {
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
    // Jeder Import ist der VOLLSTÄNDIGE Stand für heute 00:00 bis heute + N Tage (so fragt der
    // Kurzbefehl ab). Importierte Termine in diesem Zeitraum, die fehlen, wurden in Apple gelöscht
    // oder verschoben und werden hier ebenfalls gelöscht. Vergangene Termine bleiben.
    const termine = liste(o.termine)
    const importierteIds = new Set<string>()
    for (const e of termine) {
      const titel = String(feld(e, 'titel', 'title', 'name') ?? '').trim()
      const start = zeitpunkt(feld(e, 'start', 'startdatum', 'beginn'))
      if (!titel || !start) {
        termineUebersprungen++ // kaputte Zeile: ohne Titel oder ohne lesbaren Start
        continue
      }
      const startIso = start.toISOString()
      const ende = zeitpunkt(feld(e, 'ende', 'enddatum'))
      const kalender = feld(e, 'kalender', 'calendar') ? String(feld(e, 'kalender', 'calendar')).trim() : undefined
      // Erkennung: Titel + Start + Kalender
      const id = String(feld(e, 'id') ?? importierteTerminId(titel, startIso, kalender))
      if (importierteIds.has(id)) continue // dieselbe Zeile doppelt im Import
      importierteIds.add(id)
      if (kalender) kalenderNamen.add(kalender)
      // Gibt es denselben Termin (Titel + Start) noch mit alter ID? Das ist entweder ein in Life
      // angelegter Termin, den Apple jetzt bestätigt, oder einer aus einem Import vor diesem Update.
      // Er wird ersetzt (zählt als "aktualisiert"), damit nichts doppelt erscheint.
      const vorgaenger = await db.termine
        .where('start')
        .equals(startIso)
        .filter((t) => t.id !== id && t.id.startsWith('kal:') && t.titel === titel)
        .toArray()
      if (vorgaenger.length) await db.termine.bulkDelete(vorgaenger.map((t) => t.id))
      const alt = (await db.termine.get(id)) ?? vorgaenger[0]
      await db.termine.put({
        id,
        quelle: 'kalender',
        titel,
        start: startIso,
        ende: ende?.toISOString(),
        ort: feld(e, 'ort', 'location') ? String(feld(e, 'ort', 'location')) : undefined,
        kalender,
        ganztaegig: /^(true|ja|1|yes)$/i.test(String(feld(e, 'ganztaegig', 'ganztägig', 'allday') ?? '')) || istGanztags(start, ende) || undefined,
        notiz: feld(e, 'notiz', 'notizen', 'notes') ? String(feld(e, 'notiz', 'notizen', 'notes')) : undefined,
        zielId: alt?.zielId, // Zuordnung zu Ziel/Projekt bleibt erhalten
        projektId: alt?.projektId,
        // "sync" fehlt absichtlich: Apple hat den Termin bestätigt, er ist nicht mehr "ausstehend"
      })
      erg.termine[alt ? 'aktualisiert' : 'neu']++
    }
    if (importierteIds.size === 0) {
      // Schutz: Ein Import ganz ohne Termine ist eher ein Fehler im Kurzbefehl als ein leerer Kalender
      erg.hinweise.push('Keine Termine im Import – zur Sicherheit wurde kein Termin gelöscht.')
    } else if (uebersprungen.length) {
      // Schutz: Eine unlesbare Zeile könnte ein Termin gewesen sein -> der würde sonst fälschlich gelöscht
      erg.hinweise.push('Weil Zeilen nicht lesbar waren, wurde zur Sicherheit kein Termin gelöscht.')
    } else {
      const von = new Date(`${heute()}T00:00:00`).toISOString()
      const bis = new Date(`${tagPlus(heute(), termineTage)}T00:00:00`).toISOString()
      // Nur importierte Termine ("kalender"). Selbst in Life angelegte ("manuell") bleiben immer.
      const veraltet = await db.termine
        .where('start')
        .between(von, bis)
        .filter((t) => t.quelle === 'kalender' && !importierteIds.has(t.id))
        .primaryKeys()
      await db.termine.bulkDelete(veraltet)
      erg.termine.geloescht = veraltet.length
    }

    // --- Apple Health ({"typ":"health","art":…,"start":…,"ende":…,"wert":…,"einheit":…}) ---
    // Alle Werte landen roh in der Tabelle "health" (gleiche Art + gleicher Start = ersetzen).
    // Schritte, Schlaf und Gewicht werden zusätzlich pro Tag in ihre bisherigen Tabellen übertragen,
    // damit die vorhandenen Seiten und Diagramme sie zeigen. Ein Health-Wert ersetzt dort die eigene Eingabe.
    const betroffen = { schritte: new Set<string>(), schlaf: new Set<string>(), gewicht: new Set<string>() }
    for (const e of liste(o.health)) {
      const artRoh = String(feld(e, 'art', 'name') ?? '').trim()
      const start = zeitpunkt(feld(e, 'start', 'startdatum', 'datum'))
      const ende = zeitpunkt(feld(e, 'ende', 'enddatum'))
      const text = String(feld(e, 'wert', 'value') ?? '').trim()
      const einheit = feld(e, 'einheit', 'unit') ? String(feld(e, 'einheit', 'unit')).trim() : undefined
      const art = healthArt(artRoh)
      // Ohne Art oder Start ist die Zeile nicht zu gebrauchen; Schlaf braucht zusätzlich ein Ende (Dauer)
      if (!artRoh || !start || (art === 'schlaf' && !ende)) {
        healthKaputt++
        continue
      }
      let wert: number | undefined
      if (art !== 'schlaf') {
        const z = leseZahl(text)
        if (Number.isFinite(z)) wert = art ? Math.round(inStandardEinheit(art, z, `${einheit ?? ''} ${text}`) * 100) / 100 : z
        else if (art) {
          healthKaputt++ // bekannte Art, aber keine Zahl im Wert
          continue
        }
      }
      const artName = art ?? artRoh.toLowerCase()
      const startIso = start.toISOString()
      // Erkennung: Art + Start. Bei Schlaf zusätzlich die Phase, denn iPhone ("Schlafend", "Im Bett")
      // und Apple Watch ("Kern") melden oft Phasen mit genau derselben Startzeit.
      const phase = art === 'schlaf' ? schlafPhase(text) : undefined
      const id = `${artName}|${startIso.slice(0, 19)}${phase ? `|${phase}` : ''}`
      const alt = await db.health.get(id)
      await db.health.put({
        id,
        art: artName,
        start: startIso,
        ende: ende?.toISOString(),
        tag: tagString(start),
        wert,
        text,
        einheit,
        phase,
        bekannt: art !== null,
      })
      erg.health[alt ? 'aktualisiert' : 'neu']++
      erg.healthArten[artName] = (erg.healthArten[artName] ?? 0) + 1
      if (!art) unbekannteArten.set(artRoh, (unbekannteArten.get(artRoh) ?? 0) + 1)
      if (art === 'schritte') betroffen.schritte.add(tagString(start))
      if (art === 'gewicht') betroffen.gewicht.add(tagString(start))
      if (art === 'schlaf') betroffen.schlaf.add(nachtVon(startIso))
    }
    // Schritte: Tagessumme aller Health-Werte dieses Tages
    for (const t of betroffen.schritte) {
      const werte = await db.health.where('[art+tag]').equals(['schritte', t]).toArray()
      await db.schritte.put({ datum: t, anzahl: Math.round(werte.reduce((s, w) => s + (w.wert ?? 0), 0)) })
    }
    // Schlaf: alle Phasen der Nacht zusammenfassen (sie beginnen am Vortag ab 12 Uhr oder am Tag bis 12 Uhr)
    for (const n of betroffen.schlaf) {
      const phasen = await db.health.where('[art+tag]').between(['schlaf', tagPlus(n, -1)], ['schlaf', n], true, true).toArray()
      const nacht = naechte(phasen).find((x) => x.datum === n)
      if (!nacht) continue // z. B. nur "Im Bett", aber kein Schlaf gemessen
      const alt = await db.schlaf.get(n)
      // Qualitätsbewertung, die du in der App vergeben hast, bleibt erhalten
      await db.schlaf.put({ datum: n, stunden: Math.round((nacht.schlafMin / 60) * 100) / 100, qualitaet: alt?.qualitaet, quelle: 'health' })
    }
    // Gewicht: der letzte Messwert des Tages
    for (const t of betroffen.gewicht) {
      const letzter = (await db.health.where('[art+tag]').equals(['gewicht', t]).sortBy('start')).at(-1)
      if (letzter?.wert) await db.gewicht.put({ datum: t, kg: Math.round(letzter.wert * 10) / 10, quelle: 'health' })
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
  if (termineUebersprungen) erg.hinweise.push(`${termineUebersprungen} Termin-Zeilen ohne Titel oder gültigen Start übersprungen`)
  if (healthKaputt) erg.hinweise.push(`${healthKaputt} Health-Zeilen ohne Art, Start/Ende oder lesbaren Wert übersprungen`)
  if (unbekannteArten.size) {
    erg.hinweise.push(`Unbekannte Health-Arten gespeichert (noch ohne Anzeige): ${[...unbekannteArten].map(([a, n]) => `„${a}“ (${n})`).join(', ')}`)
  }
  if (uebersprungen.length) {
    // Die ersten paar kaputten Zeilen mit Nummer zeigen, damit man den Kurzbefehl reparieren kann
    erg.hinweise.push(`${uebersprungen.length} Zeilen nicht lesbar und übersprungen:`, ...uebersprungen.slice(0, 5).map((z) => `• ${z}`))
    if (uebersprungen.length > 5) erg.hinweise.push(`• … und ${uebersprungen.length - 5} weitere`)
  }

  // Neue Kalender bekommen gleich ihre Farbe (nächste freie Apple-Farbe)
  if (kalenderNamen.size) await vergibKalenderFarben(kalenderNamen)

  // Warteschlange für Apple aufräumen: Was Apple schon gemeldet hat, muss nicht nochmal gesendet werden
  // (sonst gäbe es den Termin/die Erinnerung beim nächsten Abgleich doppelt).
  const warteschlange = await holeEinstellung<AppleAktion[]>('appleWarteschlange', [])
  if (warteschlange.length) {
    // Termine erkennt die Warteschlange an Titel + Start (sie kennt den Apple-Kalender nicht)
    const termine = new Set((await db.termine.toArray()).filter((t) => t.quelle === 'kalender').map((t) => terminId(t.titel, t.start)))
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

/**
 * Kurze Zusammenfassung für die Anzeige, z. B.
 * "Termine: 3 neu, 12 aktualisiert, 1 gelöscht (Zeitraum 14 Tage)" und "Aufgaben: 2 neu, 5 aktualisiert".
 */
export function zusammenfassung(e: ImportErgebnis): string[] {
  const namen = { schritte: 'Schritte (Tage)', workouts: 'Workouts', schlaf: 'Schlaf (Nächte)', gewicht: 'Gewicht', aufgaben: 'Aufgaben' } as const
  const t = e.termine
  const zeilen = [
    // Termine immer anzeigen, auch bei 0 – so siehst du, dass der Abgleich gelaufen ist
    `Termine: ${t.neu} neu, ${t.aktualisiert} aktualisiert, ${t.geloescht ?? 0} gelöscht (Zeitraum ${e.termineTage} Tage)`,
    ...(Object.keys(namen) as (keyof typeof namen)[])
      .map((k) => {
        const z = e[k]
        return z.neu + z.aktualisiert > 0 ? `${namen[k]}: ${z.neu} neu, ${z.aktualisiert} aktualisiert` : null
      })
      .filter((z): z is string => z !== null),
  ]
  // Health: Summe und Aufteilung nach Art, z. B. "Health: 47 neu, 3 aktualisiert (Schritte 7, Schlaf 40, Wasser 3)"
  const h = e.health
  if (h.neu + h.aktualisiert > 0) {
    const arten = Object.entries(e.healthArten)
      .map(([art, n]) => `${ART_NAMEN[art as HealthArt] ?? art} ${n}`)
      .join(', ')
    zeilen.push(`Health: ${h.neu} neu, ${h.aktualisiert} aktualisiert (${arten})`)
  }
  return [...zeilen, ...e.hinweise]
}
