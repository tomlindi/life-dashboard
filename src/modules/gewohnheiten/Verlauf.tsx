// Gewohnheiten-Entwicklung: Wie oft hast du deine Habits geschafft? Quote pro Woche (oder Monat) als Linie,
// aufgebaut wie die Gewicht-Karte bei Fitness: oben Zeitraum + Filter, dann Ø, Veränderung, längste Serie, Diagramm.
import { useState } from 'react'
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Habit, HabitEintrag } from '../../core/db'
import { heute, tagPlus, wocheVon } from '../../core/datum'
import Karte from '../../core/ui/Karte'
import { Leer } from '../../core/ui/Formular'
import { ZeitraumWahl, zeitraumAb, type ZeitraumLabel } from '../../core/ui/Zeitraum'

const FARBE = '#30d158'
const ROT = '#ff453a'
const achse = { tick: { fill: '#8e8e93', fontSize: 11 }, axisLine: false, tickLine: false } as const
const tooltipStil = { background: '#2c2c2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13 }
/** Ab mehr Wochen als hier (also bei 1J und oft bei "Alle") zeigen wir Monate, sonst wird die Linie zu unruhig. */
const MAX_WOCHEN = 27

/** Eine Woche (ab Montag) oder ein Monat im Diagramm. */
interface Abschnitt {
  start: string // erster Tag der Woche / des Monats
  erledigt: number // abgehakte Habit-Tage
  moeglich: number // Habit-Tage, an denen man hätte abhaken können
}

const quoteVon = (erledigt: number, moeglich: number) => (moeglich ? (erledigt / moeglich) * 100 : 0)
const summe = (liste: Abschnitt[]) => quoteVon(liste.reduce((s, a) => s + a.erledigt, 0), liste.reduce((s, a) => s + a.moeglich, 0))
const datumVon = (tag: string) => new Date(tag + 'T12:00:00')
/** "2026-09-28" -> "28.9." */
const tagMonat = (tag: string) => `${datumVon(tag).getDate()}.${datumVon(tag).getMonth() + 1}.`

/** Längste Folge von Tagen hintereinander in einer sortierten Liste von Tagen. */
function laengsteSerie(tage: string[]): number {
  let beste = 0
  let aktuell = 0
  tage.forEach((tag, i) => {
    aktuell = i > 0 && tagPlus(tage[i - 1], 1) === tag ? aktuell + 1 : 1
    beste = Math.max(beste, aktuell)
  })
  return beste
}

/** Rechnet Quote pro Abschnitt, Gesamt-Ø, Veränderung und längste Serie für die Auswahl aus. */
function auswerten(habits: Habit[], eintraege: HabitEintrag[], ab: string) {
  const h = heute()
  // Haken pro Habit als Set (schnelles Nachschauen)
  const tageVon = new Map<string, Set<string>>()
  for (const e of eintraege) {
    if (e.datum > h) continue
    if (!tageVon.has(e.habitId)) tageVon.set(e.habitId, new Set())
    tageVon.get(e.habitId)!.add(e.datum)
  }
  // Habits haben kein Anlege-Datum. Als Start nehmen wir deshalb den ersten Haken: Wochen davor zählen
  // nicht als 0 %, weil es das Habit da wahrscheinlich noch gar nicht gab. Ein Habit ganz ohne Haken
  // hat dadurch (noch) keinen Start und taucht hier erst nach dem ersten Abhaken auf.
  const aktive = habits
    .filter((x) => tageVon.has(x.id))
    .map((x) => {
      const tage = [...tageVon.get(x.id)!].sort()
      return { habit: x, tage: new Set(tage), sortiert: tage, start: tage[0] }
    })
  if (aktive.length === 0) return null

  const fruehester = aktive.reduce((a, x) => (x.start < a ? x.start : a), h)
  const erster = ab > fruehester ? ab : fruehester
  const wochen = Math.round((datumVon(wocheVon(h)).getTime() - datumVon(wocheVon(erster)).getTime()) / (7 * 86400000)) + 1
  const monatlich = wochen > MAX_WOCHEN
  // Wir beginnen am Anfang der ersten Woche / des ersten Monats, damit der erste Punkt kein halber ist
  const abschnittVon = (tag: string) => (monatlich ? tag.slice(0, 8) + '01' : wocheVon(tag))
  const beginn = abschnittVon(erster)

  // Tag für Tag bis heute: die laufende Woche zählt so automatisch nur bis heute
  const abschnitte: Abschnitt[] = []
  for (let tag = beginn; tag <= h; tag = tagPlus(tag, 1)) {
    const start = abschnittVon(tag)
    if (abschnitte[abschnitte.length - 1]?.start !== start) abschnitte.push({ start, erledigt: 0, moeglich: 0 })
    const a = abschnitte[abschnitte.length - 1]
    for (const x of aktive) {
      if (tag < x.start) continue
      // Heute zählt erst, wenn abgehakt – der Tag ist ja noch nicht vorbei (wie bei streak())
      if (tag === h && !x.tage.has(tag)) continue
      a.moeglich++
      if (x.tage.has(tag)) a.erledigt++
    }
  }
  // Montags (bzw. am Monatsersten) ist der neue Abschnitt bis zum ersten Haken leer: dann nicht als 0 % zeigen.
  // Nur der letzte kann leer sein – davor gibt es an jedem Tag mindestens ein aktives Habit.
  if (abschnitte.length > 1 && abschnitte[abschnitte.length - 1].moeglich === 0) abschnitte.pop()

  // Veränderung: zweite Hälfte der Abschnitte gegen die erste (ruhiger als nur erster gegen letzten Punkt).
  // Erst ab 2 Abschnitten pro Hälfte: der erste Abschnitt eines neuen Habits beginnt immer mit einem Haken
  // (Start = erster Haken) und wäre allein viel zu gut.
  const haelfte = Math.floor(abschnitte.length / 2)
  const veraenderung = haelfte >= 2 ? summe(abschnitte.slice(-haelfte)) - summe(abschnitte.slice(0, haelfte)) : null

  // Längste Serie im Zeitraum; bei "Alle" die vom besten Habit
  let serie = { laenge: 0, habit: aktive[0].habit }
  for (const x of aktive) {
    const laenge = laengsteSerie(x.sortiert.filter((t) => t >= beginn))
    if (laenge > serie.laenge) serie = { laenge, habit: x.habit }
  }

  // Beschriftungen: Wochen als "28.9.", Monate als "Okt" (mit Jahr, wenn es über mehrere Jahre geht)
  const mehrereJahre = abschnitte[0].start.slice(0, 4) !== h.slice(0, 4)
  const daten = abschnitte.map((a) => {
    const d = datumVon(a.start)
    const ende = tagPlus(a.start, 6)
    return {
      ...a,
      quote: Math.round(quoteVon(a.erledigt, a.moeglich)),
      achse: monatlich
        ? d.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '') + (mehrereJahre ? ` ${String(d.getFullYear()).slice(2)}` : '')
        : tagMonat(a.start),
      titel: monatlich
        ? d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        : ende >= h
          ? 'Diese Woche'
          : `Woche ${tagMonat(a.start)}–${tagMonat(ende)}`,
    }
  })

  return { daten, schnitt: summe(abschnitte), veraenderung, serie }
}

export default function EntwicklungKarte({ habits, eintraege }: { habits: Habit[]; eintraege: HabitEintrag[] }) {
  const [zeitraum, setZeitraum] = useState<ZeitraumLabel>('3M')
  const [auswahl, setAuswahl] = useState('alle')
  // Wurde das gewählte Habit gelöscht, springen wir zurück auf "Alle"
  const gewaehlt = habits.find((x) => x.id === auswahl)
  const ergebnis = auswerten(gewaehlt ? [gewaehlt] : habits, eintraege, zeitraumAb(zeitraum))

  const filter = [{ id: 'alle', text: 'Alle Habits' }, ...habits.map((x) => ({ id: x.id, text: `${x.emoji} ${x.name}` }))]
  const v = ergebnis?.veraenderung == null ? null : Math.round(ergebnis.veraenderung)
  const serie = ergebnis?.serie.laenge ?? 0

  return (
    <Karte titel="Entwicklung" akzent={FARBE}>
      {habits.length === 0 ? (
        <Leer>Leg oben eine Gewohnheit an. Sobald du abhakst, siehst du hier, wie du dich entwickelst.</Leer>
      ) : (
        <>
          <ZeitraumWahl wert={zeitraum} onWahl={setZeitraum} />
          {/* Filter: alle Habits zusammen oder nur eins (bricht in neue Zeilen um, kein seitliches Scrollen) */}
          {habits.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {filter.map((f) => {
                const an = (gewaehlt?.id ?? 'alle') === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => setAuswahl(f.id)}
                    className="tippbar min-h-8 max-w-full truncate rounded-full px-3 text-[13px] font-semibold"
                    style={{ background: an ? FARBE : '#2c2c2e', color: an ? '#000' : '#fff' }}
                  >
                    {f.text}
                  </button>
                )
              })}
            </div>
          )}

          {!ergebnis ? (
            <Leer>
              {gewaehlt ? `„${gewaehlt.name}“ wurde noch nie abgehakt.` : 'Noch keine Haken.'} Sobald du abhakst, siehst du hier deine Entwicklung.
            </Leer>
          ) : (
            <>
              {/* Kennzahlen in einer Zeile wie bei Gewicht und Schlaf */}
              <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                <span className="text-grau">
                  Ø <b className="text-white">{Math.round(ergebnis.schnitt)} %</b>
                </span>
                <span className="text-grau">
                  Veränderung{' '}
                  <b style={{ color: v === null || v === 0 ? '#fff' : v > 0 ? FARBE : ROT }}>
                    {v === null ? '–' : `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)} %-Pkt.`}
                  </b>
                </span>
                <span className="text-grau">
                  Längste Serie{' '}
                  <b className="text-white">
                    {serie} {serie === 1 ? 'Tag' : 'Tage'}
                    {/* Bei "Alle": welches Habit die Serie hat */}
                    {!gewaehlt && serie > 0 && ' ' + ergebnis.serie.habit.emoji}
                  </b>
                </span>
              </div>

              {ergebnis.daten.length >= 2 ? (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ergebnis.daten} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                      <XAxis dataKey="achse" interval="preserveStartEnd" minTickGap={12} padding={{ left: 6, right: 6 }} {...achse} />
                      <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(w) => `${w}%`} {...achse} width={40} />
                      {/* Gestrichelte Linie = Durchschnitt im Zeitraum */}
                      <ReferenceLine y={ergebnis.schnitt} stroke="#8e8e93" strokeDasharray="4 4" />
                      <Tooltip
                        contentStyle={tooltipStil}
                        formatter={(w, _n, p) => [`${w} % (${p.payload.erledigt} von ${p.payload.moeglich})`, 'Erledigt']}
                        labelFormatter={(_, p) => p?.[0]?.payload?.titel ?? ''}
                      />
                      <Line
                        type="monotone"
                        dataKey="quote"
                        stroke={FARBE}
                        strokeWidth={3}
                        dot={ergebnis.daten.length <= 40 ? { r: 3, fill: FARBE } : false}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-[14px] text-grau">
                  Noch zu wenige Daten für einen Verlauf – ab der zweiten Woche siehst du hier die Linie.
                </p>
              )}
            </>
          )}
        </>
      )}
    </Karte>
  )
}
