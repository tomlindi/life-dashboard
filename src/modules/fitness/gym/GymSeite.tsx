// Gym-Übersicht: Training starten, Pläne, Bestleistungen pro Übung, Verlauf, Export.
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, ClipboardCopy, ClipboardPaste, FileDown, FileUp, Play } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db, type GymEinheit } from '../../../core/db'
import { neueId } from '../../../core/datum'
import { kurzDatum, zahl } from '../../../core/format'
import { teileDatei } from '../../../core/backup'
import { leseZwischenablage } from '../../../core/zwischenablage'
import Karte from '../../../core/ui/Karte'
import Sheet from '../../../core/ui/Sheet'
import { Leer, PlusKnopf } from '../../../core/ui/Formular'
import { e1rm, exportDateiname, gymCsv, gymJson, importierePlaene, letzterSatz, saetzeVon, satzText, schwersterSatz, starteTraining, volumen } from './daten'

const FARBE = '#ff375f'

/** Detail-Fenster einer Übung: Verlauf des geschätzten Maximalgewichts und alle Trainings. */
function UebungDetail({ uebungId, name, einheiten, onZu }: { uebungId: string | null; name: string; einheiten: GymEinheit[]; onZu: () => void }) {
  if (!uebungId) return null
  const saetze = saetzeVon(einheiten, uebungId)
  // Pro Training: bester Satz (nach geschätztem Maximalgewicht)
  const proTraining = [...new Set(saetze.map((s) => s.einheitId))].map((eid) => {
    const liste = saetze.filter((s) => s.einheitId === eid)
    const best = liste.reduce((a, b) => (e1rm(b.kg!, b.wdh!) > e1rm(a.kg!, a.wdh!) ? b : a))
    return { datum: liste[0].datum, name: kurzDatum(liste[0].datum.slice(0, 10)), e1rm: Math.round(e1rm(best.kg!, best.wdh!) * 10) / 10, saetze: liste }
  })
  const bester = schwersterSatz(saetze)
  return (
    <Sheet titel={name} offen onZu={onZu}>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-karte2 p-3">
          <p className="text-[12px] text-grau">Schwerster Satz</p>
          <p className="text-[18px] font-bold text-[#ffd60a]">{satzText(bester)}</p>
        </div>
        <div className="rounded-2xl bg-karte2 p-3">
          <p className="text-[12px] text-grau">Geschätztes Maximum (1 Wdh)</p>
          <p className="text-[18px] font-bold">{proTraining.length ? `${zahl(Math.max(...proTraining.map((p) => p.e1rm)))} kg` : '–'}</p>
        </div>
      </div>
      {proTraining.length >= 2 && (
        <div className="mb-3 h-40 rounded-2xl bg-karte2 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={proTraining} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1c1c1e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13 }} formatter={(v) => [`${zahl(Number(v))} kg`, 'gesch. Max.']} />
              <Line type="monotone" dataKey="e1rm" stroke={FARBE} strokeWidth={3} dot={{ r: 3, fill: FARBE }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <ul className="space-y-2">
        {[...proTraining].reverse().map((p) => (
          <li key={p.datum} className="rounded-2xl bg-karte2 p-3">
            <p className="mb-1 text-[13px] text-grau">{p.name}</p>
            <p className="text-[15px]">{p.saetze.map((s) => `${s.kg === 0 ? 'KG' : String(s.kg).replace('.', ',')}×${s.wdh}`).join('  ·  ')}</p>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

export default function GymSeite() {
  const navigate = useNavigate()
  const plaene = useLiveQuery(() => db.gymPlaene.orderBy('sortierung').toArray(), []) ?? []
  const einheiten = useLiveQuery(() => db.gymEinheiten.orderBy('start').reverse().toArray(), []) ?? []
  const uebungen = useLiveQuery(() => db.uebungen.toArray(), []) ?? []
  const [detail, setDetail] = useState<string | null>(null)
  const [meldung, setMeldung] = useState('')
  const dateiFeld = useRef<HTMLInputElement>(null)

  const laufend = einheiten.find((e) => !e.ende)
  const fertige = einheiten.filter((e) => e.ende)
  const name = (id: string) => uebungen.find((u) => u.id === id)?.name ?? 'Übung'

  // Alle Übungen, die schon mal trainiert wurden, mit letztem und schwerstem Satz
  const trainierte = [...new Set(fertige.flatMap((e) => e.uebungen.map((u) => u.uebungId)))]
    .map((uid) => ({ uid, name: name(uid), letzter: letzterSatz(einheiten, uid), bester: schwersterSatz(saetzeVon(einheiten, uid)) }))
    .filter((x) => x.bester)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  async function starte(planId?: string) {
    if (laufend && !confirm('Es läuft schon ein Training. Trotzdem ein neues starten?')) return
    const id = await starteTraining(plaene.find((p) => p.id === planId))
    navigate(`/fitness/gym/training/${id}`)
  }

  async function neuerPlan() {
    const id = neueId()
    await db.gymPlaene.add({ id, name: 'Neuer Plan', uebungen: [], sortierung: plaene.length + 1 })
    navigate(`/fitness/gym/plan/${id}`)
  }

  async function planImport(text: string) {
    try {
      const { plaene, trainings } = await importierePlaene(text)
      setMeldung(`✅ Pläne: ${plaene.join(', ')}${trainings ? ` · ${trainings} vergangene Trainings übernommen` : ''}`)
    } catch (e) {
      setMeldung('⚠️ ' + (e as Error).message)
    }
  }

  return (
    <div className="px-4 pb-10 pt-3">
      <Link to="/fitness" className="tippbar mb-2 inline-flex min-h-10 items-center text-[17px]" style={{ color: FARBE }}>
        <ChevronLeft size={22} /> Fitness
      </Link>
      <h1 className="mb-4 text-[34px] font-bold" style={{ color: FARBE }}>
        Gym
      </h1>

      <div className="flex flex-col gap-3">
        {/* Laufendes Training */}
        {laufend && (
          <Link to={`/fitness/gym/training/${laufend.id}`} className="tippbar flex items-center gap-3 rounded-3xl p-4 text-black" style={{ background: FARBE }}>
            <Play size={24} fill="black" />
            <div className="flex-1">
              <p className="text-[17px] font-bold">{laufend.name} läuft</p>
              <p className="text-[13px]">seit {new Date(laufend.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr · antippen zum Weitermachen</p>
            </div>
            <ChevronRight size={22} />
          </Link>
        )}

        {/* Pläne */}
        <Karte titel="Trainingspläne" akzent={FARBE} rechts={<PlusKnopf farbe={FARBE} onClick={neuerPlan} label="Plan" />}>
          {plaene.length === 0 ? (
            <Leer>Noch keine Pläne. Leg einen an oder importiere einen Plan, den Claude für dich geschrieben hat.</Leer>
          ) : (
            <ul className="space-y-2">
              {plaene.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-2xl bg-karte2 p-3">
                  <Link to={`/fitness/gym/plan/${p.id}`} className="tippbar min-w-0 flex-1">
                    <p className="text-[16px] font-semibold">{p.name}</p>
                    <p className="truncate text-[13px] text-grau">{p.uebungen.map((u) => name(u.uebungId)).join(', ') || 'Noch keine Übungen'}</p>
                  </Link>
                  <button
                    onClick={() => starte(p.id)}
                    disabled={p.uebungen.length === 0}
                    className="tippbar flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black disabled:opacity-30"
                    style={{ background: FARBE }}
                    aria-label={`${p.name} starten`}
                  >
                    <Play size={20} fill="black" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => starte()} className="tippbar mt-3 min-h-12 w-full rounded-2xl bg-karte2 text-[15px] font-semibold">
            Freies Training starten
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                try {
                  await planImport((await leseZwischenablage()).text)
                } catch {
                  setMeldung('⚠️ Kein Zugriff auf die Zwischenablage.')
                }
              }}
              className="tippbar flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-karte2 text-[13px]"
            >
              <ClipboardPaste size={16} /> Plan einfügen
            </button>
            <button onClick={() => dateiFeld.current?.click()} className="tippbar flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-karte2 text-[13px]">
              <FileUp size={16} /> Plan-Datei
            </button>
          </div>
          <input
            ref={dateiFeld}
            type="file"
            accept=".json,application/json,text/plain"
            className="hidden"
            onChange={async (e) => {
              const datei = e.target.files?.[0]
              if (datei) await planImport(await datei.text())
              e.target.value = ''
            }}
          />
          {meldung && <p className="mt-2 text-[14px]">{meldung}</p>}
        </Karte>

        {/* Bestleistungen pro Übung */}
        <Karte titel="Übungen" akzent="#ffd60a">
          {trainierte.length === 0 ? (
            <Leer>Hier erscheinen deine Übungen mit letztem und schwerstem Satz, sobald du ein Training beendet hast.</Leer>
          ) : (
            <ul>
              {trainierte.map((t, i) => (
                <li key={t.uid}>
                  <button onClick={() => setDetail(t.uid)} className={`tippbar flex min-h-14 w-full items-center gap-2 text-left ${i > 0 ? 'border-t border-linie' : ''}`}>
                    <span className="flex-1 text-[16px]">{t.name}</span>
                    <span className="text-right text-[12px] leading-snug">
                      <span className="block text-grau">
                        letzter <b className="text-white">{satzText(t.letzter)}</b>
                      </span>
                      <span className="block text-grau">
                        schwerster <b className="text-[#ffd60a]">{satzText(t.bester)}</b>
                      </span>
                    </span>
                    <ChevronRight size={16} className="text-grau" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Karte>

        {/* Verlauf */}
        <Karte titel="Verlauf">
          {fertige.length === 0 ? (
            <Leer>Noch keine abgeschlossenen Trainings.</Leer>
          ) : (
            <ul>
              {fertige.slice(0, 30).map((e, i) => (
                <li key={e.id}>
                  <Link to={`/fitness/gym/training/${e.id}`} className={`tippbar flex min-h-14 items-center gap-2 py-1 ${i > 0 ? 'border-t border-linie' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-medium">{e.name}</p>
                      <p className="text-[13px] text-grau">
                        {kurzDatum(e.start.slice(0, 10))} · {Math.round((Date.parse(e.ende!) - Date.parse(e.start)) / 60000)} Min · {zahl(volumen(e) / 1000)} t
                      </p>
                      <p className="truncate text-[12px] text-grau">{e.uebungen.map((u) => name(u.uebungId)).join(', ')}</p>
                    </div>
                    <ChevronRight size={16} className="text-grau" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Karte>

        {/* Export */}
        <Karte titel="Exportieren & analysieren">
          <p className="mb-3 text-[13px] leading-snug text-grau">
            Exportiere alle Trainings (eine Zeile pro Satz) und schick die Datei an Claude, z. B. für Fortschritts-Analysen oder einen neuen Plan.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => setMeldung((await teileDatei(exportDateiname('csv'), await gymCsv(), 'text/csv')) === 'abgebrochen' ? '' : '✅ CSV exportiert')}
              className="tippbar flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-karte2 text-[14px] font-semibold"
            >
              <FileDown size={16} /> CSV-Datei
            </button>
            <button
              onClick={async () => setMeldung((await teileDatei(exportDateiname('json'), await gymJson(), 'application/json')) === 'abgebrochen' ? '' : '✅ JSON exportiert')}
              className="tippbar flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-karte2 text-[14px] font-semibold"
            >
              <FileDown size={16} /> JSON-Datei
            </button>
          </div>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(await gymCsv())
              setMeldung('✅ Kopiert, jetzt einfach in den Chat mit Claude einfügen')
            }}
            className="tippbar mt-2 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold text-black"
            style={{ background: FARBE }}
          >
            <ClipboardCopy size={16} /> Für Claude kopieren
          </button>
        </Karte>
      </div>

      <UebungDetail uebungId={detail} name={detail ? name(detail) : ''} einheiten={einheiten} onZu={() => setDetail(null)} />
    </div>
  )
}
