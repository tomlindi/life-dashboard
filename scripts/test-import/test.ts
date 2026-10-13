// TEST FÜR DEN LIFE-SYNC-IMPORT (Termine, Aufgaben, Apple Health) mit Beispieldaten,
// dazu Filter, Sortierung und Unteraufgaben bei Projekten.
// Läuft in Node mit einer nachgebauten Datenbank (fake-indexeddb), deine echten Daten bleiben unberührt.
// Start: npm run test:import
import 'fake-indexeddb/auto' // muss als Erstes kommen: stellt "indexedDB" in Node bereit
import { db, holeEinstellung } from '../../src/core/db'
import { importiere, leseImportText, zusammenfassung } from '../../src/core/import'
import { inStandardEinheit, leseZahl, naechte, schlafIndex } from '../../src/core/health'
import { heute, tagPlus } from '../../src/core/datum'
import type { Projekt } from '../../src/core/db'
import { istKlausurTermin, passtZuFach } from '../../src/modules/schule/klausuren'
import { ganztaegigAm, liegtAm, tageDesTermins, tagNummer, zeitAm } from '../../src/modules/kalender/mehrtaegig'
import { fortschritt, loescheAufgabe, neueAufgabe, passt, schalteAufgabe, sortiere, speichereReihenfolge, zielPasst } from '../../src/modules/ziele/projekte'

// ---------- Mini-Testwerkzeug ----------
let fehler = 0
function pruefe(name: string, ist: unknown, soll: unknown) {
  const ok = JSON.stringify(ist) === JSON.stringify(soll)
  if (!ok) fehler++
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${ok ? '' : `  → ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`}`)
}
const ungefaehr = (x: number, stellen = 2) => Math.round(x * 10 ** stellen) / 10 ** stellen

/** Zeitpunkt mit Zeitzone wie vom Kurzbefehl, z. B. "2026-10-12T23:00:00+02:00" (lokale Zeit). */
function zeit(tag: string, uhr: string) {
  const d = new Date(`${tag}T${uhr}:00`)
  const min = -d.getTimezoneOffset()
  const vz = min >= 0 ? '+' : '-'
  const z = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0')
  return `${tag}T${uhr}:00${vz}${z(min / 60)}:${z(min % 60)}`
}
const H = heute()
const GESTERN = tagPlus(H, -1)
const zeile = (o: object) => JSON.stringify(o)
const termin = (titel: string, tag: string, uhr: string, kalender: string) => zeile({ typ: 'termin', titel, start: zeit(tag, uhr), kalender })
const health = (art: string, start: string, ende: string, wert: string, einheit?: string) => zeile({ typ: 'health', art, start, ende, wert, einheit })

// ---------- 1. Zahlen lesen ----------
console.log('\n1. Zahlen und Einheiten')
pruefe('"72,4 kg"', leseZahl('72,4 kg'), 72.4)
pruefe('"8.432"', leseZahl('8.432'), 8432)
pruefe('"1.234,5 kcal"', leseZahl('1.234,5 kcal'), 1234.5)
pruefe('"1,234.5"', leseZahl('1,234.5'), 1234.5)
pruefe('"0,18"', leseZahl('0,18'), 0.18)
pruefe('"18 %"', leseZahl('18 %'), 18)
pruefe('"abc" = keine Zahl', Number.isNaN(leseZahl('abc')), true)
pruefe('Größe "1,82 m" -> cm', inStandardEinheit('groesse', 1.82, 'm 1,82 m'), 182)
pruefe('Größe "182 cm"', inStandardEinheit('groesse', 182, 'cm'), 182)
pruefe('KFA 0,18 -> 18 %', inStandardEinheit('kfa', 0.18, ''), 18)
pruefe('KFA 18 %', inStandardEinheit('kfa', 18, '%'), 18)
pruefe('Wasser 1,5 l -> ml', inStandardEinheit('wasser', 1.5, 'l'), 1500)
pruefe('Wasser 500 mL', inStandardEinheit('wasser', 500, 'mL'), 500)
pruefe('Gewicht 72400 g -> kg', inStandardEinheit('gewicht', 72400, 'g'), 72.4)

// ---------- 2. Schlaf: Phasen und Index ----------
console.log('\n2. Schlaf')
const phasen = [
  { start: zeit(GESTERN, '22:30'), ende: zeit(H, '07:00'), phase: 'bett' as const },
  { start: zeit(GESTERN, '23:00'), ende: zeit(H, '06:45'), phase: 'schlafend' as const }, // iPhone, doppelt zur Uhr
  { start: zeit(GESTERN, '23:00'), ende: zeit(H, '01:00'), phase: 'kern' as const },
  { start: zeit(H, '01:00'), ende: zeit(H, '02:00'), phase: 'tief' as const },
  { start: zeit(H, '02:00'), ende: zeit(H, '03:00'), phase: 'rem' as const },
  { start: zeit(H, '03:00'), ende: zeit(H, '03:15'), phase: 'wach' as const },
  { start: zeit(H, '03:15'), ende: zeit(H, '06:45'), phase: 'kern' as const },
]
const [nacht] = naechte(phasen)
pruefe('Nacht gehört zu heute', nacht.datum, H)
pruefe('Schlaf 7,5 h ("Schlafend" vom iPhone ignoriert, Wach/Im Bett zählen nicht)', nacht.schlafMin / 60, 7.5)
pruefe('Wachzeit 15 min', nacht.minuten.wach, 15)
const idx = schlafIndex(nacht, 8, [])
pruefe('Schlafindex (37,5 + 16,7 + 11,25 + 20 ≈ 85)', idx.wert, 85)
const nurSchlafend = naechte([{ start: zeit(GESTERN, '23:00'), ende: zeit(H, '07:00'), phase: 'schlafend' }])[0]
pruefe('Ohne Phasen: nur Dauer + Regelmäßigkeit (8 h von 8 h = 100)', schlafIndex(nurSchlafend, 8, []).wert, 100)

// ---------- 3. Erster Import: alles in Ordnung ----------
console.log('\n3. Erster Import (Termine, Aufgaben, Health)')
// Vorher: ein Termin aus einem Import VOR dem Update (alte ID ohne Kalender, mit Ziel verknüpft),
// ein in Life angelegter Termin, ein vergangener Termin und ein selbst eingetragener Schlaf mit Sternen.
const morgen = tagPlus(H, 1)
await db.termine.put({ id: `kal:Mathe|${new Date(zeit(morgen, '08:00')).toISOString().slice(0, 16)}`, quelle: 'kalender', titel: 'Mathe', start: new Date(zeit(morgen, '08:00')).toISOString(), zielId: 'abi' })
await db.termine.put({ id: 'kal:Selbst angelegt|x', quelle: 'manuell', titel: 'Selbst angelegt', start: new Date(zeit(tagPlus(H, 2), '10:00')).toISOString(), sync: 'ausstehend' })
await db.termine.put({ id: 'apple:Schule|Alt|x', quelle: 'kalender', titel: 'Vergangen', start: new Date(zeit(tagPlus(H, -3), '10:00')).toISOString(), kalender: 'Schule' })
await db.schlaf.put({ datum: H, stunden: 6, qualitaet: 4, quelle: 'manuell' })

const import1 = [
  termin('Mathe', morgen, '08:00', 'Schule'),
  termin('Training', tagPlus(H, 3), '17:30', 'Sport'),
  termin('Kino', tagPlus(H, 5), '20:00', 'Privat'),
  zeile({ typ: 'aufgabe', titel: 'Referat üben', faellig: tagPlus(H, 4) }),
  zeile({ typ: 'aufgabe', titel: 'Vokabeln' }),
  health('schritte', zeit(GESTERN, '00:00'), zeit(H, '00:00'), '8.432', 'count'),
  health('schritte', zeit(H, '00:00'), zeit(morgen, '00:00'), '3120 count'),
  ...phasen.map((p) => health('schlaf', p.start, p.ende, { bett: 'Im Bett', schlafend: 'Schlafend', kern: 'Kern', tief: 'Tief', rem: 'REM', wach: 'Wach' }[p.phase])),
  health('gewicht', zeit(H, '07:30'), zeit(H, '07:30'), '72,4 kg', 'kg'),
  health('groesse', zeit(H, '07:30'), zeit(H, '07:30'), '1,82', 'm'),
  health('kfa', zeit(H, '07:30'), zeit(H, '07:30'), '0,18'),
  health('wasser', zeit(H, '00:00'), zeit(morgen, '00:00'), '1,5 l'),
  health('alkohol', zeit(GESTERN, '00:00'), zeit(H, '00:00'), '2'),
  health('kalorien', zeit(H, '00:00'), zeit(morgen, '00:00'), '2.150 kcal'),
  health('protein', zeit(H, '00:00'), zeit(morgen, '00:00'), '120,5 g'),
  health('kohlenhydrate', zeit(H, '00:00'), zeit(morgen, '00:00'), '260'),
  health('fett', zeit(H, '00:00'), zeit(morgen, '00:00'), '70,2'),
  health('puls', zeit(H, '08:00'), zeit(H, '08:00'), '62', 'count/min'), // unbekannte Art
].join('\n')

const erg1 = await importiere(leseImportText(import1))
console.log('   Meldung: ' + zusammenfassung(erg1).join(' | '))
pruefe('Termine: 2 neu, 1 aktualisiert (alter Mathe-Eintrag übernommen), 0 gelöscht', [erg1.termine.neu, erg1.termine.aktualisiert, erg1.termine.geloescht], [2, 1, 0])
const mathe = (await db.termine.toArray()).filter((t) => t.titel === 'Mathe')
pruefe('Mathe nur einmal, neue ID mit Kalender, Ziel bleibt', mathe.map((t) => [t.id.startsWith('apple:Schule|'), t.zielId]), [[true, 'abi']])
pruefe('Selbst angelegter Termin bleibt', !!(await db.termine.get('kal:Selbst angelegt|x')), true)
pruefe('Aufgaben: 2 neu', erg1.aufgaben.neu, 2)
pruefe('Health: 19 Werte neu (auch zwei Schlafphasen mit gleichem Start)', erg1.health.neu, 19)
pruefe('Unbekannte Art "puls" gespeichert und gemeldet', [(await db.health.where('art').equals('puls').count()), erg1.hinweise.some((h) => h.includes('puls'))], [1, true])
pruefe('Schritte gestern 8432', (await db.schritte.get(GESTERN))?.anzahl, 8432)
pruefe('Schlaf heute 7,5 h aus Health, Sterne bleiben', await db.schlaf.get(H), { datum: H, stunden: 7.5, qualitaet: 4, quelle: 'health' })
pruefe('Gewicht 72,4 kg (aus Health)', await db.gewicht.get(H), { datum: H, kg: 72.4, quelle: 'health' })
const werte = Object.fromEntries((await db.health.where('tag').equals(H).toArray()).filter((w) => w.wert !== undefined).map((w) => [w.art, w.wert]))
pruefe('Größe 182 cm, KFA 18 %, Wasser 1500 ml, Kalorien 2150, Protein 120,5', [werte.groesse, werte.kfa, werte.wasser, werte.kalorien, werte.protein], [182, 18, 1500, 2150, 120.5])
const farben = await holeEinstellung<Record<string, string>>('kalenderFarben', {})
pruefe('Kalender bekommen verschiedene Farben', new Set([farben.Schule, farben.Sport, farben.Privat]).size, 3)

// ---------- 4. Zweiter Import: Termin gelöscht und einer verschoben ----------
console.log('\n4. Zweiter Import: "Training" gelöscht, "Kino" verschoben, Schritte aktualisiert')
const import2 = [
  termin('Mathe', morgen, '08:00', 'Schule'),
  termin('Kino', tagPlus(H, 6), '20:00', 'Privat'), // verschoben
  health('schritte', zeit(H, '00:00'), zeit(morgen, '00:00'), '5.020'), // gleicher Start -> ersetzen
].join('\n')
const erg2 = await importiere(leseImportText(import2))
console.log('   Meldung: ' + zusammenfassung(erg2).join(' | '))
pruefe('Termine: 1 neu, 1 aktualisiert, 2 gelöscht', [erg2.termine.neu, erg2.termine.aktualisiert, erg2.termine.geloescht], [1, 1, 2])
pruefe('Vergangener Termin bleibt', (await db.termine.toArray()).some((t) => t.titel === 'Vergangen'), true)
pruefe('Selbst angelegter Termin bleibt', !!(await db.termine.get('kal:Selbst angelegt|x')), true)
pruefe('Schritte heute ersetzt statt verdoppelt (5020)', [(await db.schritte.get(H))?.anzahl, await db.health.where('[art+tag]').equals(['schritte', H]).count()], [5020, 1])
pruefe('Health: 1 aktualisiert', [erg2.health.neu, erg2.health.aktualisiert], [0, 1])

// ---------- 5. Kaputte Zeilen ----------
console.log('\n5. Import mit kaputten Zeilen')
const import3 = [
  termin('Mathe', morgen, '08:00', 'Schule'), // "Kino" fehlt -> würde gelöscht, aber Schutz greift
  '{"typ":"termin","titel":"Kaputt","start":"2026-10-20T10:00:00+02:00"', // Klammer fehlt
  '{"typ":"health","art":"gewicht","wert":72,4}', // Komma-Zahl ohne Anführungszeichen
  'hallo welt',
  zeile({ typ: 'health', art: 'gewicht', wert: '71,9 kg' }), // ohne Start
  zeile({ typ: 'health', art: 'wasser', start: zeit(GESTERN, '00:00'), wert: 'viel' }), // keine Zahl
  health('wasser', zeit(GESTERN, '00:00'), zeit(H, '00:00'), '2.000 ml'),
].join('\n')
const erg3 = await importiere(leseImportText(import3))
console.log('   Meldung:\n     ' + zusammenfassung(erg3).join('\n     '))
pruefe('Kein Termin gelöscht (Schutz wegen unlesbarer Zeilen)', [erg3.termine.geloescht, (await db.termine.toArray()).some((t) => t.titel === 'Kino')], [0, true])
pruefe('3 unlesbare Zeilen gemeldet', erg3.hinweise.some((h) => h.startsWith('3 Zeilen nicht lesbar')), true)
pruefe('2 Health-Zeilen übersprungen (ohne Start, ohne Zahl)', erg3.hinweise.some((h) => h.startsWith('2 Health-Zeilen')), true)
pruefe('Gültige Zeile trotzdem importiert (Wasser 2000 ml)', (await db.health.get(`wasser|${new Date(zeit(GESTERN, '00:00')).toISOString().slice(0, 19)}`))?.wert, 2000)

// ---------- 6. Import ganz ohne Termine ----------
console.log('\n6. Import ohne Termine (nur Health)')
const erg4 = await importiere(leseImportText(health('schritte', zeit(H, '00:00'), zeit(morgen, '00:00'), '6000')))
pruefe('Nichts gelöscht + Hinweis', [erg4.termine.geloescht, (await db.termine.count()) > 0, erg4.hinweise.some((h) => h.startsWith('Keine Termine im Import'))], [0, true, true])

// ---------- 7. Gar nichts lesbar ----------
console.log('\n7. Völlig kaputter Text')
try {
  leseImportText('das ist kein JSON')
  pruefe('Fehler erwartet', 'kein Fehler', 'ImportFehler')
} catch (e) {
  pruefe('ImportFehler mit Zeilennummer', [(e as Error).name, (e as { zeile?: number }).zeile], ['ImportFehler', 1])
}

// ---------- 8. Projekte: Filter, Sortierung, eigene Reihenfolge, Unteraufgaben ----------
console.log('\n8. Projekte')
const projekt = (id: string, titel: string, status: Projekt['status'], extra: Partial<Projekt> = {}): Projekt => ({ id, titel, status, ...extra })
const pA = projekt('a', 'Website', 'Aktiv', { deadline: tagPlus(H, 20), geaendert: '2026-10-01T10:00:00Z', zielId: 'z1' })
const pB = projekt('b', 'Bewerbung', 'Aktiv', { deadline: H, geaendert: '2026-10-05T10:00:00Z' })
const pC = projekt('c', 'Gitarre', 'Pausiert')
const pD = projekt('d', 'Alte Idee', 'Idee')
const pE = projekt('e', 'Umzug', 'Fertig', { deadline: H })
const alleP = [pA, pB, pC, pD, pE]
const titelVon = (l: Projekt[]) => l.map((p) => p.titel)
pruefe('Filter Aktiv', titelVon(alleP.filter((p) => passt(p, 'Aktiv', ''))), ['Website', 'Bewerbung'])
pruefe('Filter Erledigt = Status Fertig', titelVon(alleP.filter((p) => passt(p, 'Erledigt', ''))), ['Umzug'])
pruefe('Deadline diese Woche (ohne Erledigte)', titelVon(alleP.filter((p) => passt(p, 'Deadline diese Woche', ''))), ['Bewerbung'])
pruefe('Filter nach Ziel', titelVon(alleP.filter((p) => passt(p, 'Alle', 'z1'))), ['Website'])
pruefe('Sortierung Deadline (ohne Deadline ans Ende)', titelVon(sortiere(alleP, 'deadline', () => 0)), ['Bewerbung', 'Umzug', 'Website', 'Alte Idee', 'Gitarre'])
pruefe('Sortierung Zuletzt bearbeitet', titelVon(sortiere(alleP, 'zuletzt', () => 0)).slice(0, 2), ['Bewerbung', 'Website'])
await db.projekte.bulkPut(alleP)
// Eigene Reihenfolge (anfangs nach Name), während nur "Aktiv" sichtbar ist: Website vor Bewerbung ziehen
await speichereReihenfolge(alleP, [pA, pB])
const geordnet = sortiere(await db.projekte.toArray(), 'eigene', () => 0)
pruefe('Eigene Reihenfolge: nur die sichtbaren tauschen ihre Plätze', titelVon(geordnet), ['Alte Idee', 'Website', 'Gitarre', 'Umzug', 'Bewerbung'])
// Unteraufgaben: Löschen einer Aufgabe löscht ihre Unteraufgaben mit, Fortschritt zählt alle
await neueAufgabe('a', 'Design')
const design = (await db.projektAufgaben.where('projektId').equals('a').toArray())[0]
await neueAufgabe('a', 'Farben wählen', design.id)
await neueAufgabe('a', 'Logo', design.id)
const unter = await db.projektAufgaben.where('elternId').equals(design.id).toArray()
await schalteAufgabe(unter[0])
const fA = fortschritt(pA, await db.projektAufgaben.toArray(), [])
pruefe('Fortschritt zählt Aufgaben + Unteraufgaben (1 von 3)', [fA.erledigt, fA.alle], [1, 3])
pruefe('Bearbeiten setzt "Zuletzt bearbeitet"', ((await db.projekte.get('a'))?.geaendert ?? '') > '2026-10-01T10:00:00Z', true)
await loescheAufgabe(design)
pruefe('Aufgabe löschen löscht Unteraufgaben mit', await db.projektAufgaben.where('projektId').equals('a').count(), 0)
pruefe('Ziel-Filter: 100 % = Erreicht, 80 % = Offen', [zielPasst(100, 'Erreicht'), zielPasst(80, 'Erreicht'), zielPasst(80, 'Offen'), zielPasst(100, 'Offen'), zielPasst(50, 'Alle')], [true, false, true, false, true])

// ---------- 9. Mehrtägige Termine ----------
console.log('\n9. Mehrtägige Termine')
const iso = (tag: string, uhr: string) => new Date(zeit(tag, uhr)).toISOString()
const T1 = tagPlus(H, 10)
const urlaub = { start: iso(T1, '00:00'), ende: iso(tagPlus(T1, 2), '23:59'), ganztaegig: true } // 3 Tage ganztägig
const urlaubMitternacht = { start: iso(T1, '00:00'), ende: iso(tagPlus(T1, 3), '00:00'), ganztaegig: true } // Ende 00:00 = Vortag
const fahrt = { start: iso(T1, '20:00'), ende: iso(tagPlus(T1, 2), '10:00') } // Fr 20:00 bis So 10:00
const normal = { start: iso(T1, '08:00'), ende: iso(T1, '09:30') }
pruefe('Ganztägig 3 Tage -> 3 Tage', tageDesTermins(urlaub).length, 3)
pruefe('Ende genau 00:00 zählt nicht mit', tageDesTermins(urlaubMitternacht).length, 3)
pruefe('Normaler Termin -> 1 Tag', tageDesTermins(normal), [T1])
pruefe('Fahrt liegt auch am mittleren Tag', liegtAm(fahrt, tagPlus(T1, 1)), true)
pruefe('Fahrt: Mitte ganztägig, Anfang nicht', [ganztaegigAm(fahrt, tagPlus(T1, 1)), ganztaegigAm(fahrt, T1)], [true, false])
pruefe('Fahrt: Uhrzeiten pro Tag', [zeitAm(fahrt, T1).von, zeitAm(fahrt, tagPlus(T1, 2)).von], ['ab 20:00', 'bis 10:00'])
pruefe('Normaler Termin: von–bis', zeitAm(normal, T1), { von: '08:00', bis: '09:30' })
pruefe('Tag 2 von 3', tagNummer(urlaub, tagPlus(T1, 1)), 'Tag 2 von 3')

// ---------- 10. Klausuren pro Fach ----------
console.log('\n10. Klausuren pro Fach')
const fachMathe = { id: 'm', name: 'Mathematik', farbe: '#0A84FF' }
const fachBio = { id: 'b', name: 'Biologie', farbe: '#30D158' }
pruefe('"Mathe-Klausur" gehört zu Mathematik', [istKlausurTermin('Mathe-Klausur'), passtZuFach(fachMathe, 'Mathe-Klausur')], [true, true])
pruefe('"Bio Test" gehört zu Biologie, nicht zu Mathe', [passtZuFach(fachBio, 'Bio Test'), passtZuFach(fachMathe, 'Bio Test')], [true, false])
pruefe('"Training" ist keine Klausur', istKlausurTermin('Training'), false)

console.log(fehler ? `\n✗ ${fehler} Prüfung(en) fehlgeschlagen` : '\n✓ Alle Prüfungen bestanden')
process.exit(fehler ? 1 : 0)
