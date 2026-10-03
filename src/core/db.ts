// Die Datenbank. Dexie ist ein Helfer für IndexedDB, den Speicher deines Browsers.
// Alles bleibt auf deinem Gerät, es gibt keinen Server.
//
// Jede "Tabelle" ist wie ein Excel-Blatt. Hinter dem Namen steht, nach welchen
// Spalten wir schnell suchen wollen (der erste Eintrag ist der eindeutige Schlüssel).
// Weitere Bereiche (Schule, Geld, ...) fügen wir später als neue "version" hinzu.
import Dexie, { type Table } from 'dexie'

// ---------- Typen: so sieht ein Eintrag in jeder Tabelle aus ----------

/** Wo kommt ein Eintrag her? "strava" ist für später reserviert. */
export type Quelle = 'health' | 'kalender' | 'erinnerungen' | 'manuell' | 'strava'

export interface Workout {
  id: string // bei Importen: stabile externe ID -> erkennt Duplikate
  quelle: Quelle
  art: string // z. B. "Laufen", "Gym", "Rad"
  start: string // ISO-Zeitstempel
  dauerMin: number
  distanzKm?: number
}

export interface Schritte {
  datum: string // "JJJJ-MM-TT" (eindeutig pro Tag)
  anzahl: number
  demo?: boolean // true = Beispieldaten (lassen sich per Knopfdruck löschen)
}

export interface Termin {
  id: string
  quelle: Quelle
  titel: string
  start: string
  ende?: string
  ort?: string
  zielId?: string // optional: gehört zu einem Ziel (kommt im Bereich "Ziele")
  projektId?: string
}

export interface Aufgabe {
  id: string
  quelle: Quelle
  titel: string
  faellig?: string // "JJJJ-MM-TT"
  erledigt: boolean
}

export interface Habit {
  id: string
  name: string
  emoji: string
  sortierung: number
}

/** Ein Haken für ein Habit an einem Tag. */
export interface HabitEintrag {
  habitId: string
  datum: string
}

export interface Stimmung {
  datum: string // eindeutig pro Tag
  wert: number // 1 (schlecht) bis 5 (super)
  text?: string // kurzer Tagebuch-Eintrag
  demo?: boolean
}

export interface Wasser {
  datum: string
  glaeser: number
  demo?: boolean
}

export interface Notiz {
  id: string
  datum: string
  text: string
  erstellt: string
}

/** Einfache Einstellungen als Schlüssel/Wert (z. B. Name, Wochenziel). */
export interface Einstellung {
  key: string
  value: unknown
}

// ---------- Schule ----------

export interface Fach {
  id: string
  name: string
  farbe: string
}

export type NotenArt = 'Klausur' | 'Mündlich' | 'Test' | 'Sonstiges'

export interface Note {
  id: string
  fachId: string
  punkte: number // 0 bis 15
  art: NotenArt
  gewicht: number // z. B. 2 = zählt doppelt
  datum: string
}

export interface Klausur {
  id: string
  fachId?: string
  titel: string
  datum: string
}

export interface Hausaufgabe {
  id: string
  fachId?: string
  titel: string
  faellig: string
  erledigt: boolean
}

// ---------- Ziele & Projekte ----------

export interface Ziel {
  id: string
  titel: string
  emoji: string
  /** Nur benutzt, wenn das Ziel keine Unterziele hat: Fortschritt von Hand (0–100). */
  manuellProzent?: number
}

export interface Unterziel {
  id: string
  zielId: string
  titel: string
  erledigt: boolean
}

export type ProjektStatus = 'Idee' | 'Aktiv' | 'Pausiert' | 'Fertig'

export interface Projekt {
  id: string
  titel: string
  status: ProjektStatus
  deadline?: string
}

export interface ProjektAufgabe {
  id: string
  projektId: string
  titel: string
  erledigt: boolean
}

// ---------- Geld ----------

export interface Buchung {
  id: string
  datum: string
  art: 'einnahme' | 'ausgabe'
  betrag: number // immer positiv, die "art" sagt, ob rein oder raus
  kategorie: string
  notiz?: string
}

export interface Sparziel {
  id: string
  name: string
  ziel: number
  gespart: number
}

// ---------- Schlaf, Ernährung, Gewicht ----------

export interface Schlaf {
  datum: string // der Tag, an dem du aufgewacht bist
  stunden: number
  qualitaet?: number // 1 bis 5
  quelle: Quelle
  demo?: boolean
}

export type Bewertung = 'gesund' | 'okay' | 'ungesund'

export interface Mahlzeit {
  id: string
  datum: string
  name: string
  bewertung: Bewertung
}

export interface Gewicht {
  datum: string
  kg: number
  demo?: boolean
}

// ---------- Freunde & Hobbys ----------

export interface Plan {
  id: string
  text: string
  datum?: string
}

export interface Freund {
  id: string
  name: string
  geburtstag?: string // "JJJJ-MM-TT" (das Jahr darf auch geschätzt sein)
  zuletzt?: string // wann zuletzt getroffen
  plaene: Plan[] // gemeinsame Pläne
}

export interface Hobby {
  id: string
  name: string
  emoji: string
  zielMinWoche?: number // Ziel: so viele Minuten pro Woche
  ziel?: string // ein freies Ziel, z. B. "Song X auf Gitarre spielen"
}

export interface HobbyZeit {
  id: string
  hobbyId: string
  datum: string
  minuten: number
}

// ---------- Die Datenbank selbst ----------

class LifeDB extends Dexie {
  faecher!: Table<Fach, string>
  noten!: Table<Note, string>
  klausuren!: Table<Klausur, string>
  hausaufgaben!: Table<Hausaufgabe, string>
  ziele!: Table<Ziel, string>
  unterziele!: Table<Unterziel, string>
  projekte!: Table<Projekt, string>
  projektAufgaben!: Table<ProjektAufgabe, string>
  buchungen!: Table<Buchung, string>
  sparziele!: Table<Sparziel, string>
  schlaf!: Table<Schlaf, string>
  mahlzeiten!: Table<Mahlzeit, string>
  gewicht!: Table<Gewicht, string>
  freunde!: Table<Freund, string>
  hobbys!: Table<Hobby, string>
  hobbyZeiten!: Table<HobbyZeit, string>
  workouts!: Table<Workout, string>
  schritte!: Table<Schritte, string>
  termine!: Table<Termin, string>
  aufgaben!: Table<Aufgabe, string>
  habits!: Table<Habit, string>
  habitEintraege!: Table<HabitEintrag, [string, string]>
  stimmung!: Table<Stimmung, string>
  wasser!: Table<Wasser, string>
  notizen!: Table<Notiz, string>
  einstellungen!: Table<Einstellung, string>

  constructor() {
    super('life-dashboard')
    this.version(1).stores({
      workouts: 'id, start, art',
      schritte: 'datum',
      termine: 'id, start',
      aufgaben: 'id, faellig, erledigt',
      habits: 'id, sortierung',
      habitEintraege: '[habitId+datum], datum', // zusammengesetzter Schlüssel: pro Habit und Tag nur ein Haken
      stimmung: 'datum',
      wasser: 'datum',
      notizen: 'id, datum',
      einstellungen: 'key',
    })
    // Version 2: alle weiteren Bereiche. Dexie übernimmt die Tabellen aus Version 1
    // automatisch, vorhandene Daten bleiben erhalten.
    this.version(2).stores({
      faecher: 'id',
      noten: 'id, fachId, datum',
      klausuren: 'id, datum',
      hausaufgaben: 'id, faellig',
      ziele: 'id',
      unterziele: 'id, zielId',
      projekte: 'id',
      projektAufgaben: 'id, projektId',
      buchungen: 'id, datum',
      sparziele: 'id',
      schlaf: 'datum',
      mahlzeiten: 'id, datum',
      gewicht: 'datum',
      freunde: 'id',
      hobbys: 'id',
      hobbyZeiten: 'id, hobbyId, datum',
    })
  }
}

export const db = new LifeDB()

// ---------- Einstellungen lesen/schreiben ----------

export async function holeEinstellung<T>(key: string, standard: T): Promise<T> {
  const e = await db.einstellungen.get(key)
  return e ? (e.value as T) : standard
}
export const setzeEinstellung = (key: string, value: unknown) => db.einstellungen.put({ key, value })

