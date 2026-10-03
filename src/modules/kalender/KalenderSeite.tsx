// Kalender wie in Apples Kalender-App: Monatsansicht oben, Termine des gewählten Tages darunter.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus } from 'lucide-react'
import { db, type Termin } from '../../core/db'
import { heute, langesDatum, tagVon, uhrzeit } from '../../core/datum'
import TerminSheet from './TerminSheet'
import SyncKnopf from './SyncKnopf'
import { farbeFuer, ROT } from './farben'

const WOCHENTAGE = ['M', 'D', 'M', 'D', 'F', 'S', 'S']

export default function KalenderSeite() {
  const termine = useLiveQuery(() => db.termine.orderBy('start').toArray(), []) ?? []
  const [gewaehlt, setGewaehlt] = useState(heute())
  const [monat, setMonat] = useState(() => ({ jahr: new Date().getFullYear(), monat: new Date().getMonth() }))
  const [sheet, setSheet] = useState<{ offen: boolean; termin?: Termin }>({ offen: false })

  // Welche Tage haben Termine? (für die Punkte im Monatsraster)
  const tageMitTerminen = new Set(termine.map((t) => tagVon(t.start)))
  const amTag = termine.filter((t) => tagVon(t.start) === gewaehlt)
  const ganztags = amTag.filter((t) => t.ganztaegig)
  const mitZeit = amTag.filter((t) => !t.ganztaegig)

  // Monatsraster: vorne bis Montag auffüllen
  const ersterTag = new Date(monat.jahr, monat.monat, 1)
  const tageImMonat = new Date(monat.jahr, monat.monat + 1, 0).getDate()
  const leerVorne = (ersterTag.getDay() + 6) % 7
  const zellen: (string | null)[] = [
    ...Array<null>(leerVorne).fill(null),
    ...Array.from({ length: tageImMonat }, (_, i) => `${monat.jahr}-${String(monat.monat + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ]
  const blaettern = (n: number) => setMonat(({ jahr, monat: m }) => ({ jahr: m + n < 0 ? jahr - 1 : m + n > 11 ? jahr + 1 : jahr, monat: (m + n + 12) % 12 }))

  function zuHeute() {
    setGewaehlt(heute())
    setMonat({ jahr: new Date().getFullYear(), monat: new Date().getMonth() })
  }

  return (
    <div className="px-4 pb-10 pt-3">
      {/* Kopfzeile wie bei Apple: zurück, Heute, + */}
      <div className="mb-1 flex items-center justify-between">
        <Link to="/" className="tippbar inline-flex min-h-10 items-center text-[17px]" style={{ color: ROT }}>
          <ChevronLeft size={22} /> Heute
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={zuHeute} className="tippbar min-h-10 px-3 text-[17px]" style={{ color: ROT }}>
            Heute
          </button>
          <button onClick={() => setSheet({ offen: true })} className="tippbar flex h-10 w-10 items-center justify-center" style={{ color: ROT }} aria-label="Neuer Termin">
            <Plus size={26} />
          </button>
        </div>
      </div>

      {/* Monat */}
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-[30px] font-bold">
          {ersterTag.toLocaleDateString('de-DE', { month: 'long' })} <span style={{ color: ROT }}>{monat.jahr}</span>
        </h1>
        <div className="flex">
          <button onClick={() => blaettern(-1)} className="tippbar flex h-10 w-10 items-center justify-center" style={{ color: ROT }} aria-label="Vorheriger Monat">
            <ChevronLeft size={24} />
          </button>
          <button onClick={() => blaettern(1)} className="tippbar flex h-10 w-10 items-center justify-center" style={{ color: ROT }} aria-label="Nächster Monat">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-7 text-center">
        {WOCHENTAGE.map((w, i) => (
          <span key={i} className="pb-1 text-[11px] font-semibold text-grau">
            {w}
          </span>
        ))}
        {zellen.map((tag, i) => {
          if (!tag) return <span key={`leer-${i}`} />
          const istHeute = tag === heute()
          const istGewaehlt = tag === gewaehlt
          const wochenende = i % 7 >= 5
          return (
            <button key={tag} onClick={() => setGewaehlt(tag)} className="tippbar flex h-12 flex-col items-center justify-center gap-0.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-[18px]"
                style={{
                  background: istGewaehlt ? (istHeute ? ROT : '#fff') : 'transparent',
                  color: istGewaehlt ? (istHeute ? '#fff' : '#000') : istHeute ? ROT : wochenende ? '#8e8e93' : '#fff',
                  fontWeight: istHeute || istGewaehlt ? 600 : 400,
                }}
              >
                {Number(tag.slice(8))}
              </span>
              <span className="h-1 w-1 rounded-full" style={{ background: tageMitTerminen.has(tag) ? '#8e8e93' : 'transparent' }} />
            </button>
          )
        })}
      </div>

      {/* Termine des gewählten Tages */}
      <h2 className="mb-2 border-t border-linie pt-3 text-[17px] font-semibold">{langesDatum(new Date(gewaehlt + 'T12:00:00'))}</h2>

      {ganztags.map((t) => (
        <button
          key={t.id}
          onClick={() => setSheet({ offen: true, termin: t })}
          className="tippbar mb-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[15px] font-medium"
          style={{ background: farbeFuer(t.kalender) + '33', color: farbeFuer(t.kalender) }}
        >
          {t.titel}
          {t.sync && <Clock size={13} className="ml-auto text-[#ffd60a]" />}
        </button>
      ))}

      {amTag.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-grau">Keine Termine</p>
      ) : (
        <ul className="mb-4">
          {mitZeit.map((t) => (
            <li key={t.id}>
              <button onClick={() => setSheet({ offen: true, termin: t })} className="tippbar flex w-full gap-3 border-b border-linie py-2.5 text-left">
                <span className="w-12 shrink-0 text-right text-[13px] leading-tight">
                  <span className="block">{uhrzeit(t.start)}</span>
                  {t.ende && <span className="block text-grau">{uhrzeit(t.ende)}</span>}
                </span>
                <span className="w-1 shrink-0 rounded-full" style={{ background: farbeFuer(t.kalender) }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[16px] font-medium">
                    <span className="truncate">{t.titel}</span>
                    {t.sync && <Clock size={13} className="shrink-0 text-[#ffd60a]" />}
                  </span>
                  {(t.ort || t.kalender) && (
                    <span className="flex items-center gap-1 truncate text-[13px] text-grau">
                      {t.ort && <MapPin size={12} />}
                      {[t.ort, t.kalender].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <SyncKnopf />
      <p className="mt-2 text-center text-[12px] text-grau">⏳ = in Life geändert, beim nächsten Abgleich wird es in Apple Kalender übernommen.</p>

      <TerminSheet offen={sheet.offen} termin={sheet.termin} tag={gewaehlt} onZu={() => setSheet({ offen: false })} />
    </div>
  )
}
