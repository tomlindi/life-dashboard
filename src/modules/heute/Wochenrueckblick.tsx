// Wochenrückblick: Zahlen der letzten 7 Tage und Zusammenhänge (z. B. Schlaf vs. Stimmung).
import { useLiveQuery } from 'dexie-react-hooks'
import { db, holeEinstellung } from '../../core/db'
import { letzteTage, tagVon } from '../../core/datum'
import { mittel, zahl } from '../../core/format'
import Karte from '../../core/ui/Karte'

const fmt = (n: number | null, stellen = 1) => (n === null ? '–' : zahl(n, stellen))

/**
 * Vergleicht die Stimmung an zwei Gruppen von Tagen (z. B. "viel Schlaf" vs. "wenig Schlaf").
 * Gibt nur dann etwas zurück, wenn beide Gruppen mindestens 3 Tage haben und der Unterschied
 * spürbar ist (≥ 0,3 Punkte). Sonst wäre es eher Zufall als ein Zusammenhang.
 */
function vergleich(stimmungVon: Map<string, number>, tage: string[], gehoertZuA: (tag: string) => boolean | null) {
  const a: number[] = []
  const b: number[] = []
  for (const t of tage) {
    const s = stimmungVon.get(t)
    const gruppe = gehoertZuA(t)
    if (s === undefined || gruppe === null) continue
    ;(gruppe ? a : b).push(s)
  }
  const mA = mittel(a)
  const mB = mittel(b)
  if (a.length < 3 || b.length < 3 || mA === null || mB === null || Math.abs(mA - mB) < 0.3) return null
  return { mA, mB }
}

export default function Wochenrueckblick() {
  const daten = useLiveQuery(async () => {
    const [stimmung, wasser, schritte, workouts, schlaf, schlafZiel] = await Promise.all([
      db.stimmung.toArray(),
      db.wasser.toArray(),
      db.schritte.toArray(),
      db.workouts.toArray(),
      db.schlaf.toArray(),
      holeEinstellung<number>('schlafZiel', 8),
    ])
    return { stimmung, wasser, schritte, workouts, schlaf, schlafZiel }
  }, [])
  if (!daten) return null

  // ---- Kennzahlen der letzten 7 Tage ----
  const woche = new Set(letzteTage(7))
  const imZeitraum = <T extends { datum: string }>(liste: T[]) => liste.filter((x) => woche.has(x.datum))
  const stimmungW = imZeitraum(daten.stimmung)
  const kennzahlen = [
    { label: 'Ø Stimmung', wert: fmt(mittel(stimmungW.map((s) => s.wert))), einheit: '/ 5', farbe: '#ac8e68' },
    { label: 'Ø Schlaf', wert: fmt(mittel(imZeitraum(daten.schlaf).map((s) => s.stunden))), einheit: 'h', farbe: '#5e5ce6' },
    { label: 'Workouts', wert: String(daten.workouts.filter((w) => woche.has(tagVon(w.start))).length), einheit: '', farbe: '#ff375f' },
    { label: 'Ø Schritte', wert: fmt(mittel(imZeitraum(daten.schritte).map((s) => s.anzahl)), 0), einheit: '', farbe: '#30d158' },
  ]

  // ---- Zusammenhänge: über 30 Tage, damit genug Daten da sind ----
  const tage30 = letzteTage(30)
  const stimmungVon = new Map(daten.stimmung.map((s) => [s.datum, s.wert]))
  const schlafVon = new Map(daten.schlaf.map((s) => [s.datum, s.stunden]))
  const wasserVon = new Map(daten.wasser.map((w) => [w.datum, w.glaeser]))
  const workoutTage = new Set(daten.workouts.map((w) => tagVon(w.start)))
  const ziel = daten.schlafZiel

  const erkenntnisse: string[] = []
  const schlafV = vergleich(stimmungVon, tage30, (t) => (schlafVon.has(t) ? schlafVon.get(t)! >= ziel - 0.5 : null))
  if (schlafV)
    erkenntnisse.push(`😴 Nach Nächten mit mindestens ${zahl(ziel - 0.5)} h Schlaf war deine Stimmung im Schnitt ${fmt(schlafV.mA)}, sonst ${fmt(schlafV.mB)}.`)
  const sportV = vergleich(stimmungVon, tage30, (t) => workoutTage.has(t))
  if (sportV) erkenntnisse.push(`🏃 An Tagen mit Workout lag deine Stimmung bei ${fmt(sportV.mA)}, ohne Workout bei ${fmt(sportV.mB)}.`)
  const wasserV = vergleich(stimmungVon, tage30, (t) => (wasserVon.has(t) ? wasserVon.get(t)! >= 6 : null))
  if (wasserV) erkenntnisse.push(`💧 Mit 6+ Gläsern Wasser: Stimmung ${fmt(wasserV.mA)}, mit weniger: ${fmt(wasserV.mB)}.`)

  return (
    <Karte titel="Wochenrückblick" akzent="#bf5af2">
      <div className="grid grid-cols-2 gap-2">
        {kennzahlen.map((k) => (
          <div key={k.label} className="rounded-2xl bg-karte2 p-3">
            <p className="text-[12px] text-grau">{k.label}</p>
            <p className="text-[22px] font-bold" style={{ color: k.farbe }}>
              {k.wert} <span className="text-[12px] font-normal text-grau">{k.einheit}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {erkenntnisse.length === 0 ? (
          <p className="text-[13px] text-grau">Zusammenhänge (z. B. Schlaf und Stimmung) erscheinen, sobald genug Einträge da sind.</p>
        ) : (
          erkenntnisse.map((e) => (
            <p key={e} className="rounded-2xl bg-karte2 p-3 text-[14px] leading-snug text-white/85">
              {e}
            </p>
          ))
        )}
        {erkenntnisse.length > 0 && <p className="px-1 text-[11px] text-grau">Basis: letzte 30 Tage. Ein Zusammenhang ist ein Hinweis, kein Beweis.</p>}
      </div>
    </Karte>
  )
}
