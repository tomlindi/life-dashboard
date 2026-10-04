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
  typ?: string // Art der Einheit, z. B. "Long Run", "Intervall", "Spiel"
  anstrengung?: number // 1 (sehr leicht) bis 10 (maximal)
  tore?: number // Handball
  notiz?: string
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
  kalender?: string // Name des Apple-Kalenders, z. B. "Schule"
  ganztaegig?: boolean
  notiz?: string
  zielId?: string // optional: gehört zu einem Ziel (kommt im Bereich "Ziele")
  projektId?: string
  sync?: 'ausstehend' // in Life geändert, aber noch nicht an Apple gesendet/bestätigt
}

export interface Aufgabe {
  id: string
  quelle: Quelle
  titel: string
  faellig?: string // "JJJJ-MM-TT"
  erledigt: boolean
  liste?: string // Name der Erinnerungen-Liste
  notiz?: string
  prioritaet?: number // 0 = keine, 1 = niedrig, 2 = mittel, 3 = hoch
  sync?: 'ausstehend'
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

export type NotenArt = 'Klausur' | 'Mündlich' | 'Praktisch' | 'Prüfung' | 'Test' | 'Sonstiges'

export interface Fach {
  id: string
  name: string
  farbe: string
  /** Leistungsfach: zählt im Gesamtschnitt doppelt (wie "(2x)" in Notan). */
  doppelt?: boolean
  /**
   * Anteile der Notenarten in Prozent, z. B. { Klausur: 70, Mündlich: 30 }.
   * Ohne Anteile zählt einfach jede Note nach ihrer Gewichtung.
   */
  anteile?: Partial<Record<NotenArt, number>>
  /** Reihenfolge in der Liste (kleinere Zahl = weiter oben). */
  sortierung?: number
  /** Offizielle Zeugnisnote pro Halbjahr ("1" bis "4"), falls sie vom gerundeten Schnitt abweicht. */
  zeugnis?: Record<string, number>
}

export interface Note {
  id: string
  fachId: string
  punkte: number // 0 bis 15 (auch halbe Punkte wie 8,5 sind möglich)
  art: NotenArt
  gewicht: number // innerhalb der Notenart, z. B. 2 = zählt doppelt
  datum: string
  halbjahr?: number // 1 bis 4 (Kursstufe). Ohne Angabe: das aktuelle Halbjahr.
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
  // Nährwerte sind freiwillig (ältere oder schnelle Einträge haben keine). Gramm, außer kcal.
  kcal?: number
  protein?: number
  kohlenhydrate?: number
  fett?: number
  bild?: string // kleines Vorschaubild als JPEG-"data:"-Text (ca. 160 px)
  tipp?: string // kurzer Tipp der KI (oder selbst geschrieben)
  quelle?: 'ki' | 'manuell' // Nährwerte von der KI geschätzt oder von Hand eingetragen
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

// ---------- Gym (Krafttraining) ----------

/** Eine Übung aus deiner Übungsliste, z. B. "Bankdrücken". */
export interface Uebung {
  id: string
  name: string
  gruppe: string // Muskelgruppe, z. B. "Brust"
  notiz?: string
}

/** normal = Arbeitssatz, aufwaermen = zählt nicht für Bestleistungen */
export type SatzTyp = 'normal' | 'aufwaermen' | 'drop' | 'versagen'

export interface Satz {
  id: string
  kg?: number
  wdh?: number
  typ: SatzTyp
  erledigt: boolean
}

/** Eine Übung innerhalb eines Trainings, mit ihren Sätzen. */
export interface EinheitUebung {
  id: string
  uebungId: string
  pauseSek: number
  ziel?: string // Zielwiederholungen aus dem Plan, z. B. "8–10"
  notiz?: string
  saetze: Satz[]
}

/** Ein Gym-Training (eine "Einheit"). */
export interface GymEinheit {
  id: string
  name: string
  planId?: string
  start: string // ISO-Zeitstempel
  ende?: string // leer = Training läuft noch
  notiz?: string
  uebungen: EinheitUebung[]
  pauseEnde?: string // Ende der laufenden Pause (für den Countdown)
}

/** Eine Übung in einem Trainingsplan (Vorlage). */
export interface PlanUebung {
  id: string
  uebungId: string
  saetze: number
  wdh: string // z. B. "8-10"
  kg?: number
  pauseSek: number
  notiz?: string
}

export interface GymPlan {
  id: string
  name: string
  notiz?: string
  uebungen: PlanUebung[]
  sortierung: number
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
  uebungen!: Table<Uebung, string>
  gymPlaene!: Table<GymPlan, string>
  gymEinheiten!: Table<GymEinheit, string>
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
    // Version 3: Gym-Training (Übungen, Pläne, Trainingseinheiten)
    this.version(3).stores({
      uebungen: 'id, name',
      gymPlaene: 'id, sortierung',
      gymEinheiten: 'id, start',
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

