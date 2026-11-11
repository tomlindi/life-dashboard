// Startpaket für den Bereich Studium, übernommen aus Toms Notizen im Second Brain (Stand Oktober 2026).
// Feste IDs: zweimal laden legt nichts doppelt an, bestehende Einträge werden nicht überschrieben.
import { db, type StudiumAufgabe, type StudiumOption, type StudiumStatus } from '../../core/db'

export const FARBE = '#7aa2ff'

export const STATUS: StudiumStatus[] = ['Idee', 'Recherche', 'Angefragt', 'Beworben', 'Gespräch', 'Zusage', 'Absage']

/** Farbe pro Status: grau am Anfang, blau unterwegs, grün bei Zusage, rot bei Absage. */
export function statusFarbe(s: StudiumStatus) {
  if (s === 'Zusage') return '#30d158'
  if (s === 'Absage') return '#ff453a'
  if (s === 'Beworben' || s === 'Gespräch') return FARBE
  if (s === 'Angefragt') return '#ff9f0a'
  return '#8e8e93'
}

const OPTIONEN: StudiumOption[] = [
  {
    id: 'v-hslu',
    art: 'hochschule',
    name: 'HSLU',
    ort: 'Horw bei Luzern',
    status: 'Recherche',
    favorit: true,
    link: 'https://www.hslu.ch/de-ch/hochschule-luzern/studium/pibs/stellenangebote',
    notiz:
      'Wirtschaftsingenieur | Innovation, Vertiefung Operations Management. Bietet PiBS an. Semestergebühr mit Wohnsitz Ausland CHF 1 300. PiBS-Koordination: Lea Wick, +41 41 349 34 66.',
    sortierung: 0,
  },
  { id: 'v-zhaw', art: 'hochschule', name: 'ZHAW', ort: 'Winterthur', status: 'Idee', notiz: 'PiBS ja. CHF 1 220 pro Semester (Wohnsitz Ausland).', sortierung: 1 },
  { id: 'v-fhnw', art: 'hochschule', name: 'FHNW', ort: 'Brugg-Windisch', status: 'Idee', notiz: 'PiBS ja. CHF 1 000 pro Semester (Wohnsitz Ausland).', sortierung: 2 },
  { id: 'v-ost', art: 'hochschule', name: 'OST', ort: 'St. Gallen / Rapperswil', status: 'Idee', notiz: 'PiBS ja. CHF 1 500 pro Semester (Wohnsitz Ausland).', sortierung: 3 },
  { id: 'v-bfh', art: 'hochschule', name: 'BFH', ort: 'Biel', status: 'Idee', notiz: 'PiBS ja. CHF 2 550 pro Semester (Wohnsitz Ausland).', sortierung: 4 },
  { id: 'v-karlsruhe', art: 'hochschule', name: 'Karlsruhe', ort: 'Deutschland', status: 'Idee', notiz: 'Plan B: normal in Deutschland studieren, falls das duale Studium in der Schweiz nicht klappt.', sortierung: 5 },
  { id: 'v-infratech', art: 'firma', name: 'InfraTech AG', ort: 'Stans', status: 'Recherche', notiz: 'Platz 1 im PiBS-Ranking der HSLU-Stellenbörse. Nennt Wirtschaftsingenieurwesen, zahlt Lohn, eher Infrastruktur. Verlangt gymnasiale Matur.', sortierung: 0 },
  { id: 'v-perlen', art: 'firma', name: 'Perlen Packaging', ort: 'Perlen', status: 'Recherche', notiz: 'Platz 2. Pharmafolien, beste Industrie unter den Angeboten. Start laut Eintrag erst 2030 (evtl. Tippfehler).', sortierung: 1 },
  { id: 'v-siemens', art: 'firma', name: 'Siemens', ort: 'Zug / Zürich', status: 'Recherche', favorit: true, notiz: 'Lieblingsfirma. Platz 3, nur „Informatik, Ingenieurwesen“ angegeben, Link tot. Kein Lohn veröffentlicht.', sortierung: 2 },
  { id: 'v-gonser', art: 'firma', name: 'GONSER AG', ort: 'Hergiswil', status: 'Recherche', notiz: 'Platz 4. Onlinehändler, keine Industrie.', sortierung: 3 },
  { id: 'v-pilatus', art: 'firma', name: 'Pilatus', status: 'Idee', notiz: 'Zum Anfragen.', sortierung: 4 },
  { id: 'v-thermoplan', art: 'firma', name: 'Thermoplan', status: 'Idee', notiz: 'Zum Anfragen.', sortierung: 5 },
  { id: 'v-ruag', art: 'firma', name: 'RUAG', status: 'Idee', notiz: 'Zum Anfragen.', sortierung: 6 },
  { id: 'v-daetwyler', art: 'firma', name: 'Dätwyler', status: 'Idee', notiz: 'Zum Anfragen.', sortierung: 7 },
]

const AUFGABEN: StudiumAufgabe[] = [
  { id: 'v-matur', titel: 'Klären: Zählt das deutsche Abitur als „gymnasiale Matur“? (HSLU, InfraTech)', erledigt: false },
  { id: 'v-rhythmus', titel: 'Klären: Gibt es bei der HSLU einen festen Wochenrhythmus im PiBS?', erledigt: false },
  { id: 'v-siemens-frage', titel: 'Siemens fragen: PiBS auch für Wirtschaftsingenieurwesen?', erledigt: false },
]

export async function ladeVorlage() {
  const [o, a] = await Promise.all([db.studiumOptionen.toArray(), db.studiumAufgaben.toArray()])
  await db.studiumOptionen.bulkAdd(OPTIONEN.filter((x) => !o.some((y) => y.id === x.id)))
  await db.studiumAufgaben.bulkAdd(AUFGABEN.filter((x) => !a.some((y) => y.id === x.id)))
}
