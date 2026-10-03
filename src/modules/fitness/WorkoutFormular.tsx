// Formular zum manuellen Eintragen eines Workouts.
import { useState } from 'react'
import { db } from '../../core/db'
import { heute, neueId } from '../../core/datum'
import Sheet from '../../core/ui/Sheet'
import { ARTEN } from './arten'

const FARBE = '#ff375f'

export default function WorkoutFormular({ offen, onZu }: { offen: boolean; onZu: () => void }) {
  const [art, setArt] = useState('Gym')
  const [dauer, setDauer] = useState(60)
  const [distanz, setDistanz] = useState('')
  const [tag, setTag] = useState(heute())

  async function speichern() {
    const km = parseFloat(distanz.replace(',', '.'))
    await db.workouts.add({
      id: `manuell:${neueId()}`,
      quelle: 'manuell',
      art,
      // Als Uhrzeit nehmen wir 12:00, damit der Eintrag sicher am richtigen Tag landet
      start: new Date(`${tag}T12:00:00`).toISOString(),
      dauerMin: dauer,
      distanzKm: Number.isFinite(km) && km > 0 ? km : undefined,
    })
    setDistanz('')
    onZu()
  }

  return (
    <Sheet titel="Workout eintragen" offen={offen} onZu={onZu}>
      <p className="mb-2 text-[13px] text-grau">Art</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.keys(ARTEN).map((a) => (
          <button
            key={a}
            onClick={() => setArt(a)}
            className="tippbar min-h-11 rounded-full px-4 text-[15px] font-medium"
            style={{ background: art === a ? FARBE : '#2c2c2e' }}
          >
            {a}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[13px] text-grau">Dauer: {dauer} Minuten</p>
      <div className="mb-4 flex items-center gap-2">
        {[-15, -5, 5, 15].map((d) => (
          <button
            key={d}
            onClick={() => setDauer((x) => Math.max(5, x + d))}
            className="tippbar h-12 flex-1 rounded-2xl bg-karte2 text-[16px] font-semibold"
          >
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
      </div>

      <div className="mb-5 flex gap-3">
        <label className="flex-1">
          <span className="mb-2 block text-[13px] text-grau">Distanz (km, optional)</span>
          <input
            value={distanz}
            onChange={(e) => setDistanz(e.target.value)}
            inputMode="decimal"
            placeholder="z. B. 5,5"
            className="h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
          />
        </label>
        <label className="flex-1">
          <span className="mb-2 block text-[13px] text-grau">Datum</span>
          <input
            type="date"
            value={tag}
            max={heute()}
            onChange={(e) => setTag(e.target.value)}
            className="h-12 w-full rounded-2xl bg-karte2 px-3 outline-none"
          />
        </label>
      </div>

      <button onClick={speichern} className="tippbar h-14 w-full rounded-2xl text-[17px] font-semibold" style={{ background: FARBE }}>
        Speichern
      </button>
    </Sheet>
  )
}
