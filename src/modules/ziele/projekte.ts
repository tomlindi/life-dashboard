// Helfer für Projekte: Fortschritt, Filter, Sortierung und alle Änderungen an Projekten und Aufgaben.
// Jede Änderung setzt "geaendert" am Projekt, damit "Zuletzt bearbeitet" stimmt.
import { db, type Aufgabe, type Projekt, type ProjektAufgabe } from '../../core/db'
import { heute, neueId, tagPlus, wochenStart } from '../../core/datum'

/** Standardfarbe für Projekte ohne eigene Farbe (Apple-Blau). */
export const PROJEKT_FARBE = '#0A84FF'
export const farbeVon = (p: Projekt) => p.farbe ?? PROJEKT_FARBE

// ---------- Fortschritt ----------

/** Fortschritt: Aufgaben + Unteraufgaben + zugeordnete Erinnerungen. */
export function fortschritt(p: Projekt, aufgaben: ProjektAufgabe[], erinnerungen: Aufgabe[]) {
  const liste = [...aufgaben.filter((a) => a.projektId === p.id), ...erinnerungen.filter((a) => a.projektId === p.id)]
  const erledigt = liste.filter((a) => a.erledigt).length
  return { erledigt, alle: liste.length, offen: liste.length - erledigt, anteil: liste.length ? erledigt / liste.length : 0 }
}

// ---------- Filter und Sortierung (gespeichert als Einstellungen) ----------

export const FILTER = ['Alle', 'Aktiv', 'Pausiert', 'Erledigt', 'Deadline diese Woche'] as const
export type Filter = (typeof FILTER)[number]

export const SORTIERUNGEN = [
  { key: 'deadline', name: 'Deadline' },
  { key: 'fortschritt', name: 'Fortschritt' },
  { key: 'name', name: 'Name' },
  { key: 'zuletzt', name: 'Zuletzt bearbeitet' },
  { key: 'eigene', name: 'Eigene Reihenfolge' },
] as const
export type Sortierung = (typeof SORTIERUNGEN)[number]['key']

/** Passt ein Projekt zum Filter? ("Alle" zeigt auch Ideen, die anderen Chips nicht) */
export function passt(p: Projekt, filter: Filter, zielId: string): boolean {
  if (zielId && p.zielId !== zielId) return false
  switch (filter) {
    case 'Alle':
      return true
    case 'Aktiv':
      return p.status === 'Aktiv'
    case 'Pausiert':
      return p.status === 'Pausiert'
    case 'Erledigt':
      return p.status === 'Fertig'
    case 'Deadline diese Woche': {
      // von heute bis Sonntag, nur nicht erledigte Projekte
      const sonntag = tagPlus(wochenStart(), 6)
      return !!p.deadline && p.deadline >= heute() && p.deadline <= sonntag && p.status !== 'Fertig'
    }
  }
}

/** Projekte nach der gewählten Sortierung ordnen. Fehlende Werte (keine Deadline …) kommen ans Ende. */
export function sortiere(liste: Projekt[], s: Sortierung, anteil: (p: Projekt) => number): Projekt[] {
  const nachName = (a: Projekt, b: Projekt) => a.titel.localeCompare(b.titel, 'de')
  const amEnde = <T>(a: T | undefined, b: T | undefined, vergleich: (x: T, y: T) => number) =>
    a === undefined ? (b === undefined ? 0 : 1) : b === undefined ? -1 : vergleich(a, b)
  return [...liste].sort((a, b) => {
    switch (s) {
      case 'deadline':
        return amEnde(a.deadline, b.deadline, (x, y) => x.localeCompare(y)) || nachName(a, b)
      case 'fortschritt':
        return anteil(b) - anteil(a) || nachName(a, b) // am weitesten zuerst
      case 'name':
        return nachName(a, b)
      case 'zuletzt':
        return amEnde(a.geaendert, b.geaendert, (x, y) => y.localeCompare(x)) || nachName(a, b) // neueste zuerst
      case 'eigene':
        return amEnde(a.sortierung, b.sortierung, (x, y) => x - y) || nachName(a, b)
    }
  })
}

/**
 * Neue eigene Reihenfolge speichern. `sichtbarNeu` = die gerade angezeigten (evtl. gefilterten) Projekte
 * in neuer Reihenfolge. Ausgeblendete Projekte behalten ihre Plätze, die sichtbaren tauschen nur untereinander.
 */
export async function speichereReihenfolge(alle: Projekt[], sichtbarNeu: Projekt[]) {
  const geordnet = sortiere(alle, 'eigene', () => 0)
  const sichtbar = new Set(sichtbarNeu.map((p) => p.id))
  let i = 0
  const neu = geordnet.map((p) => (sichtbar.has(p.id) ? sichtbarNeu[i++] : p))
  await db.transaction('rw', db.projekte, async () => {
    for (const [nr, p] of neu.entries()) await db.projekte.update(p.id, { sortierung: nr })
  })
}

// ---------- Änderungen ----------

/** Merkt sich, dass das Projekt gerade bearbeitet wurde. */
export const beruehre = (projektId: string) => db.projekte.update(projektId, { geaendert: new Date().toISOString() })

export async function aendereProjekt(id: string, neu: Partial<Projekt>) {
  await db.projekte.update(id, { ...neu, geaendert: new Date().toISOString() })
}

export async function neueAufgabe(projektId: string, titel: string, elternId?: string) {
  await db.projektAufgaben.add({ id: neueId(), projektId, titel, erledigt: false, elternId, erstellt: new Date().toISOString() })
  await beruehre(projektId)
}

export async function schalteAufgabe(a: ProjektAufgabe) {
  await db.projektAufgaben.update(a.id, { erledigt: !a.erledigt })
  await beruehre(a.projektId)
}

/** Aufgabe löschen, samt ihren Unteraufgaben. */
export async function loescheAufgabe(a: ProjektAufgabe) {
  await db.transaction('rw', db.projektAufgaben, db.projekte, async () => {
    await db.projektAufgaben.where('elternId').equals(a.id).delete()
    await db.projektAufgaben.delete(a.id)
    await beruehre(a.projektId)
  })
}

/** Projekt löschen: Aufgaben weg, zugeordnete Erinnerungen und Termine bleiben (nur ohne Projekt). */
export async function loescheProjekt(p: Projekt) {
  await db.transaction('rw', db.projekte, db.projektAufgaben, db.aufgaben, db.termine, async () => {
    await db.projektAufgaben.where('projektId').equals(p.id).delete()
    await db.aufgaben.filter((a) => a.projektId === p.id).modify({ projektId: undefined })
    await db.termine.filter((t) => t.projektId === p.id).modify({ projektId: undefined })
    await db.projekte.delete(p.id)
  })
}

/** Reihenfolge der Aufgaben: nach Erstellzeit (ältere Aufgaben ohne Zeit zuerst, dann nach Titel). */
export const nachErstellt = (a: ProjektAufgabe, b: ProjektAufgabe) => (a.erstellt ?? '').localeCompare(b.erstellt ?? '') || a.titel.localeCompare(b.titel, 'de')

/** Farbe je Status (für die kleinen Status-Kapseln). */
export const STATUS_FARBE: Record<string, string> = { Idee: '#8e8e93', Aktiv: '#30d158', Pausiert: '#ffd60a', Fertig: '#0a84ff' }
