// Gym-Logik ohne Anzeige: Übungsliste, Statistiken, Training starten/beenden, Export, Plan-Import.
import { db, type EinheitUebung, type GymEinheit, type GymPlan, type Satz, type Uebung } from '../../../core/db'
import { heute, neueId } from '../../../core/datum'

// ---------- Übungsliste ----------

export const GRUPPEN = ['Brust', 'Rücken', 'Schultern', 'Beine', 'Po', 'Bizeps', 'Trizeps', 'Bauch', 'Ganzkörper', 'Sonstiges']

/** Häufige Übungen, damit du nicht alles selbst anlegen musst. */
const STANDARD_UEBUNGEN: [string, string][] = [
  ['Bankdrücken', 'Brust'], ['Schrägbankdrücken (KH)', 'Brust'], ['Butterfly', 'Brust'], ['Dips', 'Brust'],
  ['Klimmzüge', 'Rücken'], ['Latzug', 'Rücken'], ['Rudern (LH)', 'Rücken'], ['Kabelrudern', 'Rücken'], ['Kreuzheben', 'Rücken'],
  ['Schulterdrücken', 'Schultern'], ['Seitheben', 'Schultern'], ['Face Pulls', 'Schultern'],
  ['Kniebeugen', 'Beine'], ['Beinpresse', 'Beine'], ['Beinstrecker', 'Beine'], ['Beinbeuger', 'Beine'], ['Ausfallschritte', 'Beine'], ['Wadenheben', 'Beine'],
  ['Rumänisches Kreuzheben', 'Po'], ['Hip Thrust', 'Po'],
  ['Bizepscurls', 'Bizeps'], ['Hammer Curls', 'Bizeps'],
  ['Trizepsdrücken (Kabel)', 'Trizeps'], ['French Press', 'Trizeps'],
  ['Plank', 'Bauch'], ['Beinheben hängend', 'Bauch'],
]

/** Legt die Standard-Übungen an, falls die Liste noch leer ist. */
export async function standardUebungenAnlegen() {
  if ((await db.uebungen.count()) > 0) return
  await db.uebungen.bulkAdd(STANDARD_UEBUNGEN.map(([name, gruppe]) => ({ id: neueId(), name, gruppe })))
}

/** Findet eine Übung nach Namen (Groß-/Kleinschreibung egal) oder legt sie an. */
export async function uebungNachName(name: string, gruppe = 'Sonstiges'): Promise<string> {
  const vorhanden = await db.uebungen.filter((u) => u.name.toLowerCase() === name.trim().toLowerCase()).first()
  if (vorhanden) return vorhanden.id
  const id = neueId()
  await db.uebungen.add({ id, name: name.trim(), gruppe })
  return id
}

// ---------- Statistik ----------

/** Geschätztes Maximalgewicht für 1 Wiederholung (Epley-Formel): kg × (1 + Wdh / 30) */
export const e1rm = (kg: number, wdh: number) => (wdh <= 1 ? kg : kg * (1 + wdh / 30))

/**
 * Zählt der Satz für Bestleistungen? (abgehakt, kein Aufwärmsatz, kg und Wdh eingetragen)
 * 0 kg ist erlaubt: Das sind Übungen mit Körpergewicht (Klimmzüge, Dips).
 */
export const zaehlt = (s: Satz) => s.erledigt && s.typ !== 'aufwaermen' && s.kg !== undefined && s.kg >= 0 && (s.wdh ?? 0) > 0

export interface SatzMitDatum extends Satz {
  datum: string
  einheitId: string
}

/** Alle gezählten Sätze einer Übung, ältester zuerst. Optional nur aus Trainings vor einem Zeitpunkt. */
export function saetzeVon(einheiten: GymEinheit[], uebungId: string, vor?: string): SatzMitDatum[] {
  return einheiten
    .filter((e) => (!vor || e.start < vor) && e.ende)
    .sort((a, b) => a.start.localeCompare(b.start))
    .flatMap((e) =>
      e.uebungen
        .filter((u) => u.uebungId === uebungId)
        .flatMap((u) => u.saetze.filter(zaehlt).map((s) => ({ ...s, datum: e.start, einheitId: e.id }))),
    )
}

/** Schwerster Satz: höchstes Gewicht, bei Gleichstand mehr Wiederholungen. */
export function schwersterSatz(saetze: SatzMitDatum[]): SatzMitDatum | null {
  return saetze.reduce<SatzMitDatum | null>(
    (best, s) => (!best || s.kg! > best.kg! || (s.kg === best.kg && s.wdh! > best.wdh!) ? s : best),
    null,
  )
}

/** Letztes abgeschlossenes Training (vor einem Zeitpunkt), in dem die Übung vorkam. */
export function letzteEinheitMit(einheiten: GymEinheit[], uebungId: string, vor?: string): { einheit: GymEinheit; uebung: EinheitUebung } | null {
  const passend = einheiten
    .filter((e) => e.ende && (!vor || e.start < vor))
    .sort((a, b) => b.start.localeCompare(a.start))
    .find((e) => e.uebungen.some((u) => u.uebungId === uebungId && u.saetze.some(zaehlt)))
  if (!passend) return null
  return { einheit: passend, uebung: passend.uebungen.find((u) => u.uebungId === uebungId && u.saetze.some(zaehlt))! }
}

/** Letzter Arbeitssatz einer Übung (aus dem letzten Training). */
export function letzterSatz(einheiten: GymEinheit[], uebungId: string, vor?: string): Satz | null {
  const l = letzteEinheitMit(einheiten, uebungId, vor)
  if (!l) return null
  const gezaehlt = l.uebung.saetze.filter(zaehlt)
  return gezaehlt[gezaehlt.length - 1] ?? null
}

/** Volumen (kg × Wdh, ohne Aufwärmsätze) eines Trainings. */
export const volumen = (e: GymEinheit) =>
  e.uebungen.reduce((s, u) => s + u.saetze.filter(zaehlt).reduce((t, x) => t + x.kg! * x.wdh!, 0), 0)

/** "60 kg × 8" (bei 0 kg: "KG × 8" für Körpergewicht) */
export const satzText = (s: Pick<Satz, 'kg' | 'wdh'> | null) =>
  s && s.kg !== undefined && s.wdh !== undefined ? `${s.kg === 0 ? 'KG' : `${String(s.kg).replace('.', ',')} kg`} × ${s.wdh}` : '–'

// ---------- Training starten / beenden ----------

const neuerSatz = (kg?: number): Satz => ({ id: neueId(), kg, typ: 'normal', erledigt: false })

/** Startet ein Training: leer oder aus einem Plan. Gewichte werden vom letzten Mal übernommen. */
export async function starteTraining(plan?: GymPlan): Promise<string> {
  const einheiten = await db.gymEinheiten.toArray()
  const uebungen: EinheitUebung[] = (plan?.uebungen ?? []).map((pu) => {
    const vorher = letzteEinheitMit(einheiten, pu.uebungId)?.uebung.saetze.filter(zaehlt) ?? []
    return {
      id: neueId(),
      uebungId: pu.uebungId,
      pauseSek: pu.pauseSek,
      ziel: pu.wdh,
      notiz: pu.notiz,
      // Gewicht: letztes Mal (gleicher Satz) > Plan-Gewicht > leer
      saetze: Array.from({ length: pu.saetze }, (_, i) => neuerSatz(vorher[i]?.kg ?? vorher[vorher.length - 1]?.kg ?? pu.kg)),
    }
  })
  const id = neueId()
  await db.gymEinheiten.add({ id, name: plan?.name ?? 'Freies Training', planId: plan?.id, start: new Date().toISOString(), uebungen })
  return id
}

/** Übung zu einem laufenden Training hinzufügen (3 Sätze, Gewicht vom letzten Mal). */
export async function uebungHinzufuegen(einheitId: string, uebungId: string) {
  const [einheit, alle] = await Promise.all([db.gymEinheiten.get(einheitId), db.gymEinheiten.toArray()])
  if (!einheit) return
  const kg = letzterSatz(alle, uebungId, einheit.start)?.kg
  await db.gymEinheiten.update(einheitId, {
    uebungen: [...einheit.uebungen, { id: neueId(), uebungId, pauseSek: 120, saetze: [neuerSatz(kg), neuerSatz(kg), neuerSatz(kg)] }],
  })
}

/**
 * Training beenden: Nicht abgehakte Sätze werden entfernt, und ein Eintrag in der
 * Workout-Liste angelegt (damit es im Fitness-Ring und in der Übersicht zählt).
 */
export async function beendeTraining(id: string) {
  const e = await db.gymEinheiten.get(id)
  if (!e) return
  const ende = new Date().toISOString()
  const uebungen = e.uebungen.map((u) => ({ ...u, saetze: u.saetze.filter((s) => s.erledigt) })).filter((u) => u.saetze.length > 0)
  await db.gymEinheiten.update(id, { ende, uebungen, pauseEnde: undefined })
  await db.workouts.put({
    id: `gym:${id}`,
    quelle: 'manuell',
    art: 'Gym',
    start: e.start,
    dauerMin: Math.max(1, Math.round((Date.parse(ende) - Date.parse(e.start)) / 60000)),
  })
}

/** Training löschen (inkl. Eintrag in der Workout-Liste). */
export async function loescheTraining(id: string) {
  await db.gymEinheiten.delete(id)
  await db.workouts.delete(`gym:${id}`)
}

// ---------- Export (zum Analysieren) ----------

/**
 * CSV mit einer Zeile pro Satz. Ideal zum Analysieren (z. B. von Claude oder in Excel/Numbers).
 * Spalten: Datum;Training;Übung;Muskelgruppe;Satz;Typ;kg;Wdh;Volumen;e1RM;Pause_s;Notiz
 */
export async function gymCsv(): Promise<string> {
  const [einheiten, uebungen] = await Promise.all([db.gymEinheiten.orderBy('start').toArray(), db.uebungen.toArray()])
  const name = new Map(uebungen.map((u) => [u.id, u]))
  const zahl = (n?: number) => (n === undefined ? '' : String(Math.round(n * 10) / 10).replace('.', ','))
  const zeilen = ['Datum;Uhrzeit;Training;Übung;Muskelgruppe;Satz;Typ;kg;Wdh;Volumen;e1RM;Pause_s;Notiz']
  for (const e of einheiten.filter((x) => x.ende)) {
    const d = new Date(e.start)
    for (const u of e.uebungen) {
      u.saetze.forEach((s, i) => {
        const vol = s.kg && s.wdh ? s.kg * s.wdh : undefined
        zeilen.push(
          [
            d.toLocaleDateString('sv-SE'), // JJJJ-MM-TT
            d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            e.name,
            name.get(u.uebungId)?.name ?? '?',
            name.get(u.uebungId)?.gruppe ?? '',
            i + 1,
            s.typ,
            zahl(s.kg),
            s.wdh ?? '',
            zahl(vol),
            s.kg && s.wdh ? zahl(e1rm(s.kg, s.wdh)) : '',
            u.pauseSek,
            (u.notiz ?? '').replace(/[;\n]/g, ' '),
          ].join(';'),
        )
      })
    }
  }
  return zeilen.join('\n')
}

/** Kompletter Export als JSON (Übungen, Pläne, Trainings mit Übungsnamen). */
export async function gymJson(): Promise<string> {
  const [einheiten, uebungen, plaene] = await Promise.all([db.gymEinheiten.orderBy('start').toArray(), db.uebungen.toArray(), db.gymPlaene.toArray()])
  const name = (id: string) => uebungen.find((u) => u.id === id)?.name ?? '?'
  return JSON.stringify(
    {
      app: 'life-dashboard',
      typ: 'gym-export',
      exportiert: new Date().toISOString(),
      plaene: plaene.map((p) => ({ name: p.name, notiz: p.notiz, uebungen: p.uebungen.map((u) => ({ ...u, uebung: name(u.uebungId) })) })),
      trainings: einheiten
        .filter((e) => e.ende)
        .map((e) => ({ name: e.name, start: e.start, ende: e.ende, notiz: e.notiz, uebungen: e.uebungen.map((u) => ({ uebung: name(u.uebungId), pauseSek: u.pauseSek, notiz: u.notiz, saetze: u.saetze.map(({ kg, wdh, typ }) => ({ kg, wdh, typ })) })) })),
    },
    null,
    1,
  )
}

export const exportDateiname = (endung: string) => `gym-export-${heute()}.${endung}`

// ---------- Plan-Import (z. B. Pläne, die Claude für dich schreibt) ----------
//
// Format:
// {
//   "typ": "life-dashboard-gymplan",
//   "plaene": [
//     { "name": "Push A", "notiz": "…",
//       "uebungen": [ { "uebung": "Bankdrücken", "gruppe": "Brust", "saetze": 4, "wdh": "6-8", "kg": 60, "pauseSek": 150, "notiz": "…" } ] }
//   ]
// }
// Pläne mit gleichem Namen werden ersetzt (also aktualisiert), neue Übungen automatisch angelegt.

//
// Zusätzlich wird das "Übersicht"-Format verstanden (z. B. aus Notion oder einem anderen Chat):
// { "trainingstage": [ { "tag": "Montag", "training": "Push", "start": "14:30", "ende": "16:00", "hinweis": "…",
//     "pausiert": false, "uebungen": [ { "uebung": "…", "saetze": 3, "wiederholungen": "4–6", "hinweis": "…",
//     "zuletzt": { "datum": "2026-10-02", "gewicht_kg": 35, "wdh_pro_satz": [10, 10, 10] }, "naechstes_mal": "…" } ] } ] }
// Die "zuletzt"-Werte werden als vergangene Trainings angelegt, damit "Letztes Mal" sofort funktioniert.

type Roh = Record<string, unknown>
const text = (x: unknown) => (x === undefined || x === null || x === '' ? undefined : String(x))

/** Rät die Muskelgruppe aus dem Übungsnamen (für neu angelegte Übungen). */
export function rateGruppe(name: string): string {
  const n = name.toLowerCase()
  if (/bank|brust|butterfly|dips|fliegende|chest/.test(n)) return 'Brust'
  if (/klimm|rudern|row|latzug|lat|rücken|rueck|pull ?up|kreuzheben(?!.*rumän)/.test(n)) return 'Rücken'
  if (/schulter|seitheben|face pull|military|overhead|frontheben/.test(n)) return 'Schultern'
  if (/rumän|hip thrust|glute|po\b/.test(n)) return 'Po'
  if (/knie|squat|bein|waden|ausfall|box jump|sprung|lunge|trap-bar/.test(n)) return 'Beine'
  if (/bizeps|curl/.test(n)) return 'Bizeps'
  if (/trizeps|french|skull|pushdown/.test(n)) return 'Trizeps'
  if (/bauch|plank|crunch|core|sit-?up/.test(n)) return 'Bauch'
  return 'Sonstiges'
}

/** Pause aus einem Hinweis lesen ("2–3 min Pause" -> 180 s) oder aus den Wiederholungen schätzen. */
function ratePause(wdh: string, hinweis?: string): number {
  const min = hinweis?.match(/(\d+)\s*(?:[–-]\s*(\d+))?\s*min/)
  if (min) return Number(min[2] ?? min[1]) * 60
  const untere = parseInt(wdh, 10)
  return untere <= 6 ? 180 : untere <= 10 ? 120 : 90
}

interface PlanEingabe {
  name: string
  notiz?: string
  uebungen: { uebung: string; gruppe?: string; saetze: number; wdh: string; kg?: number; pauseSek?: number; notiz?: string }[]
  /** Vergangene Trainings: pro Datum die Sätze je Übung */
  historie: { datum: string; start?: string; ende?: string; saetze: { uebung: string; kg?: number; wdh: number[] }[] }[]
}

/** Wandelt das "trainingstage"-Format in unsere Plan-Struktur um. */
function ausTrainingstagen(tage: Roh[]): PlanEingabe[] {
  return tage.map((t, i) => {
    const uebungen = ((t.uebungen as Roh[]) ?? []).map((u) => {
      const wdh = String(u.wiederholungen ?? u.wdh ?? '8-12').replace('–', '-')
      const zuletzt = u.zuletzt as Roh | null | undefined
      const kgZuletzt = zuletzt ? Number(zuletzt.gewicht_kg) : NaN
      return {
        uebung: String(u.uebung ?? u.name ?? 'Übung'),
        saetze: Number(u.saetze) || 3,
        wdh,
        kg: Number.isFinite(kgZuletzt) && kgZuletzt > 0 ? kgZuletzt : undefined,
        pauseSek: ratePause(wdh, text(u.hinweis)),
        notiz: [text(u.hinweis), text(u.naechstes_mal) && `Nächstes Mal: ${u.naechstes_mal}`].filter(Boolean).join(' · ') || undefined,
      }
    })

    // "zuletzt" je Übung -> nach Datum gruppiert zu vergangenen Trainings
    const proDatum = new Map<string, PlanEingabe['historie'][number]>()
    for (const u of (t.uebungen as Roh[]) ?? []) {
      const z = u.zuletzt as Roh | null | undefined
      if (!z?.datum) continue
      const datum = String(z.datum)
      const kg = Number.isFinite(Number(z.gewicht_kg)) ? Number(z.gewicht_kg) : /körper|koerper|bw/i.test(String(z.gewicht ?? '')) ? 0 : undefined
      const wdh = Array.isArray(z.wdh_pro_satz) ? (z.wdh_pro_satz as unknown[]).map(Number) : z.wdh !== undefined ? [Number(z.wdh)] : []
      if (!wdh.length) continue
      if (!proDatum.has(datum)) proDatum.set(datum, { datum, start: text(t.start), ende: text(t.ende), saetze: [] })
      proDatum.get(datum)!.saetze.push({ uebung: String(u.uebung ?? u.name), kg, wdh })
    }

    const zeit = t.start && t.ende ? ` ${t.start}–${t.ende}` : ''
    const notiz = [
      t.pausiert ? '⏸ Pausiert' : '',
      text(t.tag) ? `${t.tag}${zeit}` : '',
      text(t.schwerpunkt),
      text(t.hinweis),
    ]
      .filter(Boolean)
      .join(' · ')
    return { name: String(t.training ?? t.name ?? `Plan ${i + 1}`), notiz: notiz || undefined, uebungen, historie: [...proDatum.values()] }
  })
}

export async function importierePlaene(eingabe: string): Promise<{ plaene: string[]; trainings: number }> {
  let daten: Roh
  try {
    daten = JSON.parse(eingabe.trim())
  } catch {
    throw new Error('Das ist kein gültiges JSON.')
  }

  // Welches Format?
  let plaene: PlanEingabe[]
  if (Array.isArray(daten.trainingstage)) {
    plaene = ausTrainingstagen(daten.trainingstage as Roh[])
  } else if (Array.isArray(daten.plaene)) {
    plaene = (daten.plaene as Roh[]).map((p, i) => ({
      name: String(p.name ?? `Plan ${i + 1}`),
      notiz: text(p.notiz),
      historie: [],
      uebungen: ((p.uebungen as Roh[]) ?? []).map((u) => ({
        uebung: String(u.uebung ?? u.name ?? 'Übung'),
        gruppe: text(u.gruppe),
        saetze: Number(u.saetze) || 3,
        wdh: String(u.wdh ?? u.wiederholungen ?? '8-12'),
        kg: Number(u.kg) > 0 ? Number(u.kg) : undefined,
        pauseSek: Number(u.pauseSek) > 0 ? Number(u.pauseSek) : undefined,
        notiz: text(u.notiz),
      })),
    }))
  } else {
    throw new Error('Kein Trainingsplan erkannt (erwartet "plaene" oder "trainingstage").')
  }

  const vorhandene = await db.gymPlaene.toArray()
  let trainings = 0
  for (const [i, p] of plaene.entries()) {
    // Plan anlegen bzw. gleichnamigen Plan ersetzen
    const uebungen = []
    for (const u of p.uebungen) {
      uebungen.push({
        id: neueId(),
        uebungId: await uebungNachName(u.uebung, u.gruppe ?? rateGruppe(u.uebung)),
        saetze: Math.max(1, Math.round(u.saetze)),
        wdh: u.wdh,
        kg: u.kg,
        pauseSek: u.pauseSek ?? ratePause(u.wdh),
        notiz: u.notiz,
      })
    }
    const alt = vorhandene.find((x) => x.name.toLowerCase() === p.name.toLowerCase())
    const planId = alt?.id ?? neueId()
    await db.gymPlaene.put({ id: planId, name: p.name, notiz: p.notiz, uebungen, sortierung: alt?.sortierung ?? vorhandene.length + i + 1 })

    // Vergangene Trainings anlegen (feste ID -> erneuter Import erzeugt keine Duplikate)
    for (const h of p.historie) {
      const id = `import:${p.name.toLowerCase()}:${h.datum}`
      const start = new Date(`${h.datum}T${h.start ?? '12:00'}:00`).toISOString()
      const ende = new Date(`${h.datum}T${h.ende ?? '13:00'}:00`).toISOString()
      const einheitUebungen: EinheitUebung[] = []
      for (const s of h.saetze) {
        const uebungId = await uebungNachName(s.uebung, rateGruppe(s.uebung))
        const plan = uebungen.find((u) => u.uebungId === uebungId)
        einheitUebungen.push({
          id: neueId(),
          uebungId,
          pauseSek: plan?.pauseSek ?? 120,
          ziel: plan?.wdh,
          saetze: s.wdh.map((w) => ({ id: neueId(), kg: s.kg, wdh: w, typ: 'normal' as const, erledigt: true })),
        })
      }
      await db.gymEinheiten.put({ id, name: p.name, planId, start, ende, uebungen: einheitUebungen })
      await db.workouts.put({ id: `gym:${id}`, quelle: 'manuell', art: 'Gym', start, dauerMin: Math.round((Date.parse(ende) - Date.parse(start)) / 60000) })
      trainings++
    }
  }
  return { plaene: plaene.map((p) => p.name), trainings }
}

export type { Uebung }
