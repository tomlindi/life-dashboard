// Beispieldaten, damit du sofort siehst, wie die App aussieht.
// Alles, was hier erzeugt wird, ist markiert (IDs beginnen mit "demo:" oder demo: true),
// damit "Beispieldaten löschen" nur diese Einträge entfernt und nichts von deinen echten Daten.
import { db } from './db'
import { heute, letzteTage, tagPlus, tagString } from './datum'
import { standardUebungenAnlegen, uebungNachName } from '../modules/fitness/gym/daten'

const DEMO = 'demo:'

/** Baut einen ISO-Zeitstempel für einen Tag und eine Uhrzeit, z. B. ("2026-10-03", 8, 30). */
const zeit = (tag: string, h: number, min = 0) => {
  const d = new Date(`${tag}T00:00:00`)
  d.setHours(h, min, 0, 0)
  return d.toISOString()
}

/** Einfache, immer gleiche "Zufallszahl" aus einer Zahl, damit die Daten stabil aussehen. */
const pseudo = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export async function ladeBeispieldaten() {
  const tage = letzteTage(14) // die letzten 14 Tage inkl. heute
  const h = heute()

  // Schritte: jeden Tag einen Wert zwischen ca. 4.000 und 12.000
  await db.schritte.bulkPut(
    tage.map((datum, i) => ({ datum, anzahl: Math.round(4000 + pseudo(i + 1) * 8000), demo: true })),
  )

  // Workouts: etwa jeden zweiten Tag eins (heute Morgen ein Lauf)
  const arten: { art: string; dauerMin: number; distanzKm?: number; typ?: string; tore?: number }[] = [
    { art: 'Handball', dauerMin: 90, typ: 'Training' },
    { art: 'Laufen', dauerMin: 38, distanzKm: 6.2, typ: 'Locker' },
    { art: 'Handball', dauerMin: 60, typ: 'Spiel', tore: 4 },
    { art: 'Laufen', dauerMin: 62, distanzKm: 10.4, typ: 'Long Run' },
  ]
  await db.workouts.bulkPut(
    tage
      .map((tag, i) => ({ tag, i }))
      .filter(({ i }) => i % 2 === 1 || i === 13)
      .map(({ tag, i }) => {
        const a = arten[Math.floor(i / 2) % arten.length]
        return {
          id: `${DEMO}workout-${tag}`,
          quelle: 'health' as const,
          art: a.art,
          start: zeit(tag, 17, 30),
          dauerMin: a.dauerMin,
          distanzKm: a.distanzKm,
          typ: a.typ,
          tore: a.tore,
        }
      }),
  )

  // Termine: heute und die nächsten Tage
  await db.termine.bulkPut([
    { id: `${DEMO}t1`, quelle: 'kalender', titel: 'Mathe', start: zeit(h, 8, 0), ende: zeit(h, 9, 30), ort: 'Raum 204', kalender: 'Schule' },
    { id: `${DEMO}t2`, quelle: 'kalender', titel: 'Gym', start: zeit(h, 17, 30), ende: zeit(h, 18, 45), ort: 'FitX', kalender: 'Sport' },
    { id: `${DEMO}t3`, quelle: 'kalender', titel: 'Englisch-Klausur', start: zeit(tagPlus(h, 3), 9, 0), ende: zeit(tagPlus(h, 3), 10, 30), kalender: 'Schule' },
    { id: `${DEMO}t4`, quelle: 'kalender', titel: 'Lena Geburtstag', start: zeit(tagPlus(h, 5), 18, 0), kalender: 'Privat' },
  ])

  // Aufgaben
  await db.aufgaben.bulkPut([
    { id: `${DEMO}a1`, quelle: 'erinnerungen', titel: 'Referat Geschichte vorbereiten', faellig: tagPlus(h, 2), erledigt: false, liste: 'Schule' },
    { id: `${DEMO}a2`, quelle: 'erinnerungen', titel: 'Vokabeln Kapitel 5', faellig: h, erledigt: false, liste: 'Schule' },
    { id: `${DEMO}a3`, quelle: 'manuell', titel: 'Sporttasche packen', faellig: h, erledigt: true, liste: 'Privat' },
  ])

  // Habits + Haken der letzten Tage
  const habits = [
    { id: `${DEMO}h1`, name: 'Lesen', emoji: '📚', sortierung: 1 },
    { id: `${DEMO}h2`, name: 'Meditieren', emoji: '🧘', sortierung: 2 },
    { id: `${DEMO}h3`, name: 'Vokabeln', emoji: '🗣️', sortierung: 3 },
    { id: `${DEMO}h4`, name: 'Früh aufstehen', emoji: '⏰', sortierung: 4 },
  ]
  await db.habits.bulkPut(habits)
  const haken = habits.flatMap((habit, hi) =>
    tage
      .filter((tag) => tag !== h && pseudo(hi * 100 + tag.length + Number(tag.slice(-2))) > 0.3)
      .map((tag) => ({ habitId: habit.id, datum: tag })),
  )
  await db.habitEintraege.bulkPut(haken)

  // Stimmung (heute bewusst leer, damit du den Schnell-Eintrag ausprobieren kannst) und Wasser
  await db.stimmung.bulkPut(
    tage
      .filter((tag) => tag !== h)
      .map((datum, i) => ({ datum, wert: 1 + Math.floor(pseudo(i + 40) * 5), demo: true })),
  )
  await db.wasser.bulkPut(tage.map((datum, i) => ({ datum, glaeser: 3 + Math.floor(pseudo(i + 7) * 6), demo: true })))

  await db.notizen.put({ id: `${DEMO}n1`, datum: h, text: 'Beispiel-Notiz: Mathe-Klausur nächste Woche wiederholen.', erstellt: new Date().toISOString() })

  // Tagebuch-Texte für ein paar Tage
  const texte = ['Gutes Training heute, danach Pizza mit Jonas.', 'Mathe war anstrengend, aber Referat lief gut.', 'Lange geschlafen, entspannter Tag.']
  for (const [i, t] of texte.entries()) {
    const datum = tagPlus(h, -(i + 1))
    const alt = await db.stimmung.get(datum)
    if (alt) await db.stimmung.update(datum, { text: t })
  }

  // ---------- Schule ----------
  const faecher = [
    { id: `${DEMO}f-mathe`, name: 'Mathe', farbe: '#0a84ff' },
    { id: `${DEMO}f-deutsch`, name: 'Deutsch', farbe: '#ff9f0a' },
    { id: `${DEMO}f-englisch`, name: 'Englisch', farbe: '#30d158' },
    { id: `${DEMO}f-bio`, name: 'Biologie', farbe: '#bf5af2' },
  ]
  await db.faecher.bulkPut(faecher)
  const noten: [string, number, 'Klausur' | 'Mündlich' | 'Test', number, number][] = [
    ['f-mathe', 11, 'Klausur', 2, -30],
    ['f-mathe', 13, 'Mündlich', 1, -10],
    ['f-deutsch', 9, 'Klausur', 2, -25],
    ['f-deutsch', 10, 'Mündlich', 1, -5],
    ['f-englisch', 12, 'Klausur', 2, -20],
    ['f-englisch', 14, 'Test', 1, -8],
    ['f-bio', 8, 'Klausur', 2, -15],
    ['f-bio', 11, 'Mündlich', 1, -3],
  ]
  await db.noten.bulkPut(
    noten.map(([fach, punkte, art, gewicht, tage], i) => ({ id: `${DEMO}note${i}`, fachId: `${DEMO}${fach}`, punkte, art, gewicht, datum: tagPlus(h, tage) })),
  )
  await db.klausuren.put({ id: `${DEMO}k1`, fachId: `${DEMO}f-mathe`, titel: 'Analysis', datum: tagPlus(h, 9) })
  await db.hausaufgaben.bulkPut([
    { id: `${DEMO}ha1`, fachId: `${DEMO}f-deutsch`, titel: 'Gedichtanalyse fertig schreiben', faellig: tagPlus(h, 1), erledigt: false },
    { id: `${DEMO}ha2`, fachId: `${DEMO}f-mathe`, titel: 'S. 112 Nr. 4–7', faellig: tagPlus(h, 2), erledigt: false },
  ])

  // ---------- Ziele & Projekte ----------
  await db.ziele.bulkPut([
    { id: `${DEMO}z1`, titel: 'Abi mit 1,5', emoji: '🎓' },
    { id: `${DEMO}z2`, titel: 'Halbmarathon laufen', emoji: '🏃' },
  ])
  await db.unterziele.bulkPut([
    { id: `${DEMO}u1`, zielId: `${DEMO}z1`, titel: 'Mathe auf 12 Punkte bringen', erledigt: false },
    { id: `${DEMO}u2`, zielId: `${DEMO}z1`, titel: 'Lernplan erstellen', erledigt: true },
    { id: `${DEMO}u3`, zielId: `${DEMO}z1`, titel: 'Jede Woche 2 Std. Englisch', erledigt: true },
    { id: `${DEMO}u4`, zielId: `${DEMO}z2`, titel: '10 km am Stück', erledigt: true },
    { id: `${DEMO}u5`, zielId: `${DEMO}z2`, titel: '15 km am Stück', erledigt: false },
    { id: `${DEMO}u6`, zielId: `${DEMO}z2`, titel: 'Anmeldung zum Lauf', erledigt: false },
  ])
  await db.projekte.put({ id: `${DEMO}p1`, titel: 'Eigene Website bauen', status: 'Aktiv', deadline: tagPlus(h, 30) })
  await db.projektAufgaben.bulkPut([
    { id: `${DEMO}pa1`, projektId: `${DEMO}p1`, titel: 'Design überlegen', erledigt: true },
    { id: `${DEMO}pa2`, projektId: `${DEMO}p1`, titel: 'Startseite bauen', erledigt: false },
    { id: `${DEMO}pa3`, projektId: `${DEMO}p1`, titel: 'Online stellen', erledigt: false },
  ])
  await db.termine.update(`${DEMO}t2`, { zielId: `${DEMO}z2` }) // Gym-Termin gehört zum Lauf-Ziel

  // ---------- Geld ----------
  const monatsAnfang = (vor: number) => {
    const d = new Date()
    d.setMonth(d.getMonth() - vor, 1)
    return d
  }
  const buchungen = [0, 1, 2, 3].flatMap((vor) => {
    const m = monatsAnfang(vor)
    const tagIm = (t: number) => {
      const d = new Date(m)
      d.setDate(t)
      return d > new Date() ? h : tagString(d)
    }
    return [
      { id: `${DEMO}b${vor}-1`, datum: tagIm(1), art: 'einnahme' as const, betrag: 50, kategorie: 'Taschengeld' },
      { id: `${DEMO}b${vor}-2`, datum: tagIm(3), art: 'einnahme' as const, betrag: 120, kategorie: 'Job', notiz: 'Nachhilfe' },
      { id: `${DEMO}b${vor}-3`, datum: tagIm(2), art: 'ausgabe' as const, betrag: 12 + vor * 6, kategorie: 'Essen', notiz: 'Döner & Snacks' },
      { id: `${DEMO}b${vor}-4`, datum: tagIm(2), art: 'ausgabe' as const, betrag: 25 + vor * 4, kategorie: 'Freizeit', notiz: 'Kino' },
      { id: `${DEMO}b${vor}-5`, datum: tagIm(3), art: 'ausgabe' as const, betrag: 15, kategorie: 'Handy' },
    ]
  })
  await db.buchungen.bulkPut(buchungen)
  await db.sparziele.bulkPut([
    { id: `${DEMO}s1`, name: 'Neue Kopfhörer', ziel: 150, gespart: 95 },
    { id: `${DEMO}s2`, name: 'Führerschein', ziel: 2000, gespart: 420 },
  ])

  // ---------- Schlaf, Gewicht ----------
  await db.schlaf.bulkPut(
    tage.map((datum, i) => ({
      datum,
      stunden: Math.round((6 + pseudo(i + 21) * 3) * 4) / 4,
      qualitaet: 2 + Math.floor(pseudo(i + 60) * 4),
      quelle: 'health' as const,
      demo: true,
    })),
  )
  await db.gewicht.bulkPut(tage.filter((_, i) => i % 3 === 0).map((datum, i) => ({ datum, kg: 68 + i * 0.2 - pseudo(i) * 0.5, demo: true })))

  // ---------- Ernährung ----------
  const bewertungen = ['gesund', 'okay', 'ungesund'] as const
  await db.mahlzeiten.bulkPut(
    tage.flatMap((datum, i) =>
      ['Frühstück', 'Mittagessen', 'Abendessen'].map((name, j) => ({
        id: `${DEMO}m${i}-${j}`,
        datum,
        name,
        bewertung: bewertungen[Math.floor(pseudo(i * 3 + j) * 2.6)],
      })),
    ),
  )

  // ---------- Freunde ----------
  const geburtstagIn = (tage: number, jahr: number) => `${jahr}${tagPlus(h, tage).slice(4)}`
  await db.freunde.bulkPut([
    { id: `${DEMO}fr1`, name: 'Lena', geburtstag: geburtstagIn(5, 2009), zuletzt: tagPlus(h, -2), plaene: [{ id: 'demo-pl1', text: 'Geburtstagsgeschenk besorgen' }] },
    { id: `${DEMO}fr2`, name: 'Jonas', geburtstag: geburtstagIn(60, 2008), zuletzt: tagPlus(h, -1), plaene: [{ id: 'demo-pl2', text: 'Zusammen ins Gym' }] },
    { id: `${DEMO}fr3`, name: 'Mia', geburtstag: geburtstagIn(140, 2009), zuletzt: tagPlus(h, -18), plaene: [] },
  ])

  // ---------- Gym: ein Plan und zwei vergangene Trainings ----------
  await standardUebungenAnlegen()
  const [bank, schulter, seit, trizeps] = await Promise.all(
    ['Bankdrücken', 'Schulterdrücken', 'Seitheben', 'Trizepsdrücken (Kabel)'].map((n) => uebungNachName(n)),
  )
  await db.gymPlaene.put({
    id: `${DEMO}plan-push`,
    name: 'Push (Beispiel)',
    notiz: 'Brust, Schultern, Trizeps',
    sortierung: 0,
    uebungen: [
      { id: 'demo-pu1', uebungId: bank, saetze: 4, wdh: '6-8', kg: 60, pauseSek: 150 },
      { id: 'demo-pu2', uebungId: schulter, saetze: 3, wdh: '8-10', kg: 30, pauseSek: 120 },
      { id: 'demo-pu3', uebungId: seit, saetze: 3, wdh: '12-15', kg: 8, pauseSek: 90 },
      { id: 'demo-pu4', uebungId: trizeps, saetze: 3, wdh: '10-12', kg: 20, pauseSek: 90 },
    ],
  })
  const satz = (kg: number, wdh: number, typ: 'normal' | 'aufwaermen' = 'normal') => ({ id: crypto.randomUUID(), kg, wdh, typ, erledigt: true })
  for (const [tageZurueck, plus] of [[6, 0], [2, 2.5]] as const) {
    const start = zeit(tagPlus(h, -tageZurueck), 17, 30)
    const ende = zeit(tagPlus(h, -tageZurueck), 18, 35)
    const id = `${DEMO}training-${tageZurueck}`
    await db.gymEinheiten.put({
      id,
      name: 'Push (Beispiel)',
      planId: `${DEMO}plan-push`,
      start,
      ende,
      uebungen: [
        { id: `${id}-1`, uebungId: bank, pauseSek: 150, ziel: '6-8', saetze: [satz(40, 10, 'aufwaermen'), satz(60 + plus, 8), satz(60 + plus, 7), satz(60 + plus, 6), satz(55 + plus, 8)] },
        { id: `${id}-2`, uebungId: schulter, pauseSek: 120, ziel: '8-10', saetze: [satz(30, 10), satz(30, 9), satz(30, 8)] },
        { id: `${id}-3`, uebungId: seit, pauseSek: 90, ziel: '12-15', saetze: [satz(8, 15), satz(8, 13), satz(8, 12)] },
        { id: `${id}-4`, uebungId: trizeps, pauseSek: 90, ziel: '10-12', saetze: [satz(20 + plus, 12), satz(20 + plus, 11), satz(20 + plus, 10)] },
      ],
    })
    await db.workouts.put({ id: `gym:${id}`, quelle: 'manuell', art: 'Gym', start, dauerMin: 65 })
  }

  // ---------- Hobbys ----------
  await db.hobbys.bulkPut([
    { id: `${DEMO}hb1`, name: 'Gitarre', emoji: '🎸', zielMinWoche: 180, ziel: 'Wonderwall flüssig spielen' },
    { id: `${DEMO}hb2`, name: 'Fotografie', emoji: '📷', zielMinWoche: 120 },
  ])
  await db.hobbyZeiten.bulkPut(
    tage.flatMap((datum, i) => [
      ...(i % 2 === 0 ? [{ id: `${DEMO}hz${i}a`, hobbyId: `${DEMO}hb1`, datum, minuten: 30 }] : []),
      ...(i % 4 === 1 ? [{ id: `${DEMO}hz${i}b`, hobbyId: `${DEMO}hb2`, datum, minuten: 60 }] : []),
    ]),
  )
}

/** Löscht ausschließlich die Beispieldaten. */
export async function loescheBeispieldaten() {
  const istDemoId = (id: string) => id.startsWith(DEMO)
  await Promise.all([
    db.workouts.filter((x) => istDemoId(x.id) || x.id.startsWith(`gym:${DEMO}`)).delete(),
    db.gymPlaene.filter((x) => istDemoId(x.id)).delete(),
    db.gymEinheiten.filter((x) => istDemoId(x.id)).delete(),
    db.termine.filter((x) => istDemoId(x.id)).delete(),
    db.aufgaben.filter((x) => istDemoId(x.id)).delete(),
    db.habits.filter((x) => istDemoId(x.id)).delete(),
    db.habitEintraege.filter((x) => istDemoId(x.habitId)).delete(),
    db.notizen.filter((x) => istDemoId(x.id)).delete(),
    db.schritte.filter((x) => x.demo === true).delete(),
    db.stimmung.filter((x) => x.demo === true).delete(),
    db.wasser.filter((x) => x.demo === true).delete(),
    db.schlaf.filter((x) => x.demo === true).delete(),
    db.gewicht.filter((x) => x.demo === true).delete(),
    // Alle Tabellen mit ID: Einträge mit "demo:"-ID löschen
    ...[db.faecher, db.noten, db.klausuren, db.hausaufgaben, db.ziele, db.unterziele, db.projekte, db.projektAufgaben, db.buchungen, db.sparziele, db.mahlzeiten, db.freunde, db.hobbys, db.hobbyZeiten].map(
      (tabelle) => (tabelle as typeof db.faecher).filter((x) => istDemoId(x.id)).delete(),
    ),
  ])
}

/** Gibt es noch Beispieldaten? (für die Anzeige des Löschen-Buttons) */
export async function gibtBeispieldaten(): Promise<boolean> {
  return (await db.habits.filter((x) => x.id.startsWith(DEMO)).count()) > 0
}
