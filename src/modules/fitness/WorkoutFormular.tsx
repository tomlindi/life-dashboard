// Formular zum Eintragen ODER Bearbeiten eines Workouts (alle Sportarten außer dem Gym-Log).
// Je nach Sportart erscheinen passende Felder: Distanz + Pace, Art der Einheit, Tore (Handball).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, type Workout } from '../../core/db'
import { heute, neueId, tagVon } from '../../core/datum'
import Sheet from '../../core/ui/Sheet'
import { Chips, Eingabe, Label } from '../../core/ui/Formular'
import { SPORTARTEN, pace, sportart } from './arten'
import { starteTraining } from './gym/daten'

interface Props {
  offen: boolean
  onZu: () => void
  vorhanden?: Workout // gesetzt = bearbeiten
  startArt?: string // vorausgewählte Sportart (z. B. von der Laufen-Seite)
}

const zweistellig = (n: number) => String(n).padStart(2, '0')
const uhrzeitJetzt = () => `${zweistellig(new Date().getHours())}:${zweistellig(new Date().getMinutes())}`

export default function WorkoutFormular({ offen, onZu, vorhanden, startArt }: Props) {
  const navigate = useNavigate()
  const [art, setArt] = useState('Laufen')
  const [typ, setTyp] = useState<string | undefined>()
  const [stunden, setStunden] = useState('0')
  const [minuten, setMinuten] = useState('45')
  const [distanz, setDistanz] = useState('')
  const [tag, setTag] = useState(heute())
  const [uhrzeit, setUhrzeit] = useState(uhrzeitJetzt())
  const [anstrengung, setAnstrengung] = useState<number | undefined>()
  const [tore, setTore] = useState('')
  const [notiz, setNotiz] = useState('')

  // Beim Öffnen: Felder mit dem vorhandenen Workout füllen oder zurücksetzen
  useEffect(() => {
    if (!offen) return
    const w = vorhanden
    const d = w ? new Date(w.start) : new Date()
    setArt(w?.art ?? startArt ?? 'Laufen')
    setTyp(w?.typ)
    setStunden(String(Math.floor((w?.dauerMin ?? 45) / 60)))
    setMinuten(String((w?.dauerMin ?? 45) % 60))
    setDistanz(w?.distanzKm ? String(w.distanzKm).replace('.', ',') : '')
    setTag(w ? tagVon(w.start) : heute())
    setUhrzeit(`${zweistellig(d.getHours())}:${zweistellig(d.getMinutes())}`)
    setAnstrengung(w?.anstrengung)
    setTore(w?.tore !== undefined ? String(w.tore) : '')
    setNotiz(w?.notiz ?? '')
  }, [offen, vorhanden, startArt])

  const s = sportart(art)
  const dauerMin = (parseInt(stunden, 10) || 0) * 60 + (parseInt(minuten, 10) || 0)
  const km = parseFloat(distanz.replace(',', '.'))
  const kmOk = Number.isFinite(km) && km > 0

  async function speichern() {
    if (dauerMin <= 0) return
    await db.workouts.put({
      id: vorhanden?.id ?? `manuell:${neueId()}`,
      quelle: vorhanden?.quelle ?? 'manuell',
      art,
      typ,
      start: new Date(`${tag}T${uhrzeit || '12:00'}:00`).toISOString(),
      dauerMin,
      distanzKm: s.distanz && kmOk ? km : undefined,
      anstrengung,
      tore: art === 'Handball' && tore !== '' ? parseInt(tore, 10) || 0 : undefined,
      notiz: notiz.trim() || undefined,
    })
    onZu()
  }

  return (
    <Sheet titel={vorhanden ? 'Workout bearbeiten' : 'Workout eintragen'} offen={offen} onZu={onZu}>
      {/* Sportart */}
      <Label>Sportart</Label>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {SPORTARTEN.map((sp) => (
          <button
            key={sp.name}
            onClick={() => {
              setArt(sp.name)
              setTyp(undefined)
            }}
            className="tippbar flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] font-medium"
            style={{ background: art === sp.name ? sp.farbe : '#2c2c2e', color: art === sp.name ? '#000' : '#fff' }}
          >
            <sp.icon size={22} />
            {sp.name}
          </button>
        ))}
      </div>

      {/* Gym hat sein eigenes, ausführliches Log mit Sätzen */}
      {art === 'Gym' && !vorhanden && (
        <button
          onClick={async () => {
            onZu()
            navigate(`/fitness/gym/training/${await starteTraining()}`)
          }}
          className="tippbar mb-4 min-h-12 w-full rounded-2xl text-[15px] font-semibold text-black"
          style={{ background: s.farbe }}
        >
          Gym-Training mit Sätzen loggen →
        </button>
      )}

      {s.typen.length > 0 && (
        <>
          <Label>Art der Einheit</Label>
          <div className="mb-4">
            <Chips optionen={s.typen} wert={typ ?? ''} onWahl={(t) => setTyp(t === typ ? undefined : t)} farbe={s.farbe} />
          </div>
        </>
      )}

      {/* Dauer als Stunden + Minuten */}
      <div className="mb-4 flex gap-3">
        <Eingabe label="Stunden" value={stunden} onChange={(e) => setStunden(e.target.value)} inputMode="numeric" />
        <Eingabe label="Minuten" value={minuten} onChange={(e) => setMinuten(e.target.value)} inputMode="numeric" />
        {s.distanz && <Eingabe label="Distanz (km)" value={distanz} onChange={(e) => setDistanz(e.target.value)} inputMode="decimal" placeholder="z. B. 5,5" />}
      </div>
      {s.distanz && kmOk && dauerMin > 0 && (
        <p className="-mt-2 mb-4 text-[13px]" style={{ color: s.farbe }}>
          Pace: {pace(dauerMin, km)}
        </p>
      )}

      <div className="mb-4 flex gap-3">
        <Eingabe label="Datum" type="date" value={tag} max={heute()} onChange={(e) => setTag(e.target.value)} />
        <Eingabe label="Uhrzeit" type="time" value={uhrzeit} onChange={(e) => setUhrzeit(e.target.value)} />
      </div>

      {art === 'Handball' && (
        <div className="mb-4">
          <Eingabe label="Tore (optional)" value={tore} onChange={(e) => setTore(e.target.value)} inputMode="numeric" placeholder="–" />
        </div>
      )}

      <Label>Anstrengung (optional)</Label>
      <div className="mb-4 grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => setAnstrengung(anstrengung === n ? undefined : n)}
            className="tippbar h-10 rounded-lg text-[14px] font-semibold"
            style={{ background: anstrengung === n ? s.farbe : '#2c2c2e', color: anstrengung === n ? '#000' : '#fff' }}
          >
            {n}
          </button>
        ))}
      </div>

      <input
        value={notiz}
        onChange={(e) => setNotiz(e.target.value)}
        placeholder="Notiz (z. B. Strecke, Gegner, wie lief's?)"
        className="mb-5 h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
      />

      <div className="flex gap-2">
        {vorhanden && (
          <button
            onClick={async () => {
              if (!confirm('Workout löschen?')) return
              await db.workouts.delete(vorhanden.id)
              onZu()
            }}
            className="tippbar h-14 rounded-2xl bg-karte2 px-5 text-[16px] text-[#ff453a]"
          >
            Löschen
          </button>
        )}
        <button
          onClick={speichern}
          disabled={dauerMin <= 0}
          className="tippbar h-14 flex-1 rounded-2xl text-[17px] font-semibold text-black disabled:opacity-40"
          style={{ background: s.farbe }}
        >
          Speichern
        </button>
      </div>
    </Sheet>
  )
}
