// Das Kachel-Raster mit allen Bereichen (aus der Liste in modules/index.ts).
// Jede Kachel zeigt eine kleine Kennzahl aus dem Bereich, damit man auf einen Blick sieht, wo man steht.
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { module } from '..'
import { db, holeEinstellung } from '../../core/db'
import { heute, tagVon, wochenStart } from '../../core/datum'
import { euro, zahl } from '../../core/format'
import { useAusgeblendet } from '../../core/einstellungen'
import { berechneHalbjahr } from '../schule/noten'
import { ohneDoppelte } from '../fitness/workouts'
import { abiPrognose, STANDARD_PRUEFUNGEN, type AbiPruefung } from '../schule/abi'

/** Liest für jeden Bereich eine kurze Kennzahl aus der Datenbank. */
function useKennzahlen(): Record<string, string> {
  return (
    useLiveQuery(async () => {
      const h = heute()
      const ws = wochenStart()
      const [workouts, noten, faecher, ziele, habits, haken, buchungen, schlaf, mahlzeiten, freunde, hobbyZeiten, stimmung, hj] = await Promise.all([
        db.workouts.toArray().then(ohneDoppelte),
        db.noten.toArray(),
        db.faecher.toArray(),
        db.ziele.count(),
        db.habits.count(),
        db.habitEintraege.where('datum').equals(h).count(),
        db.buchungen.toArray(),
        db.schlaf.orderBy('datum').reverse().first(),
        db.mahlzeiten.where('datum').equals(h).count(),
        db.freunde.count(),
        db.hobbyZeiten.where('datum').aboveOrEqual(ws).toArray(),
        db.stimmung.get(h),
        holeEinstellung<number>('aktuellesHalbjahr', 1),
      ])
      const { gesamt } = berechneHalbjahr(faecher, noten, hj, hj) // Schnitt des aktuellen Halbjahrs
      const pruefungen = await holeEinstellung<AbiPruefung[]>('abiPruefungen', STANDARD_PRUEFUNGEN)
      const abi = faecher.length ? abiPrognose(faecher, noten, hj, pruefungen) : null
      const konto = buchungen.reduce((s, b) => s + (b.art === 'einnahme' ? b.betrag : -b.betrag), 0)
      const hobbyMin = hobbyZeiten.reduce((s, z) => s + z.minuten, 0)
      return {
        fitness: `${workouts.filter((w) => tagVon(w.start) >= ws).length} Workouts diese Woche`,
        schule: abi?.bestanden ? `Abi ≈ ${abi.note.toFixed(1).replace('.', ',')}` : gesamt === null ? 'Noch keine Noten' : `Ø ${zahl(gesamt)} Punkte`,
        ziele: `${ziele} ${ziele === 1 ? 'Ziel' : 'Ziele'}`,
        gewohnheiten: habits ? `${haken}/${habits} heute` : 'Keine Habits',
        geld: euro(konto),
        schlaf: schlaf ? `${zahl(schlaf.stunden)} h zuletzt` : 'Keine Daten',
        ernaehrung: `${mahlzeiten} Mahlzeiten heute`,
        freunde: `${freunde} Freunde`,
        hobbys: `${zahl(hobbyMin / 60)} h diese Woche`,
        stimmung: stimmung ? ['😞', '😕', '😐', '🙂', '😄'][stimmung.wert - 1] + ' heute' : 'Noch kein Eintrag',
      } as Record<string, string>
    }, []) ?? {}
  )
}

export default function Kacheln() {
  const [ausgeblendet] = useAusgeblendet()
  const kennzahlen = useKennzahlen()
  return (
    <div className="grid grid-cols-2 gap-3">
      {module
        .filter((m) => !ausgeblendet.includes(m.id))
        .map((m) => (
          <Link key={m.id} to={`/${m.id}`} className="tippbar flex min-h-[100px] flex-col justify-between rounded-3xl bg-karte p-4">
            <m.icon size={26} color={m.farbe} strokeWidth={2} />
            <div>
              <span className="block text-[17px] font-semibold">{m.name}</span>
              <span className="block truncate text-[12px] text-grau">{kennzahlen[m.id] ?? ''}</span>
            </div>
          </Link>
        ))}
    </div>
  )
}
