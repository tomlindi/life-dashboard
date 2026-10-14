// Kalender wie in Apples Kalender-App: Monatsansicht oben, Termine des gewählten Tages darunter.
// Unter jedem Datum ein farbiger Punkt pro Kalender mit Terminen (höchstens 3, sonst "+"), darunter eine Legende.
// Mehrtägige Termine erscheinen an jedem ihrer Tage (Punkte und Tagesliste), siehe mehrtaegig.ts.
// Oben der Knopf "Kalender": Kalender ein-/ausblenden und ihre Farbe ändern (KalenderAuswahl.tsx).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus } from 'lucide-react'
import { db, type Termin } from '../../core/db'
import { heute, langesDatum } from '../../core/datum'
import TerminSheet from './TerminSheet'
import KalenderAuswahl from './KalenderAuswahl'
import { ganztaegigAm, liegtAm, tageDesTermins, tagNummer, zeitAm } from './mehrtaegig'
import { ROT, kalenderName, useKalenderFarben } from './farben'

const WOCHENTAGE = ['M', 'D', 'M', 'D', 'F', 'S', 'S']

/** Kleine runde Punkte (5 px) unter einem Datum: einer pro Kalender, höchstens 3, bei mehr ein "+". */
function Punkte({ kalender, farbe }: { kalender: string[]; farbe: (k: string) => string }) {
  const sortiert = [...kalender].sort((a, b) => a.localeCompare(b, 'de'))
  return (
    <span className="flex h-[5px] items-center gap-[3px]">
      {sortiert.slice(0, 3).map((k) => (
        <span key={k} className="h-[5px] w-[5px] rounded-full" style={{ background: farbe(k) }} />
      ))}
      {sortiert.length > 3 && <span className="text-[9px] font-bold leading-none text-grau">+</span>}
    </span>
  )
}

export default function KalenderSeite() {
  const alleTermine = useLiveQuery(() => db.termine.orderBy('start').toArray(), []) ?? []
  const { farbe, sichtbar, ausgeblendet } = useKalenderFarben()
  // Ausgeblendete Kalender (Knopf "Kalender") verschwinden überall auf dieser Seite
  const termine = alleTermine.filter((t) => sichtbar(t.kalender))
  const [gewaehlt, setGewaehlt] = useState(heute())
  const [monat, setMonat] = useState(() => ({ jahr: new Date().getFullYear(), monat: new Date().getMonth() }))
  const [sheet, setSheet] = useState<{ offen: boolean; termin?: Termin }>({ offen: false })
  const [auswahlOffen, setAuswahlOffen] = useState(false) // Blatt "Kalender"

  // Pro Tag: welche Kalender haben dort Termine? (für die farbigen Punkte im Monatsraster)
  // Mehrtägige Termine zählen an jedem ihrer Tage (siehe mehrtaegig.ts)
  const kalenderProTag = new Map<string, Set<string>>()
  for (const t of termine) {
    for (const tag of tageDesTermins(t)) {
      if (!kalenderProTag.has(tag)) kalenderProTag.set(tag, new Set())
      kalenderProTag.get(tag)!.add(kalenderName(t.kalender))
    }
  }
  const amTag = termine.filter((t) => liegtAm(t, gewaehlt))
  // Oben als Balken: echte Ganztagstermine und mittlere Tage mehrtägiger Termine
  const ganztags = amTag.filter((t) => ganztaegigAm(t, gewaehlt))
  const mitZeit = amTag.filter((t) => !ganztaegigAm(t, gewaehlt))

  // Monatsraster: vorne bis Montag auffüllen
  const ersterTag = new Date(monat.jahr, monat.monat, 1)
  const tageImMonat = new Date(monat.jahr, monat.monat + 1, 0).getDate()
  const leerVorne = (ersterTag.getDay() + 6) % 7
  const zellen: (string | null)[] = [
    ...Array<null>(leerVorne).fill(null),
    ...Array.from({ length: tageImMonat }, (_, i) => `${monat.jahr}-${String(monat.monat + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ]
  const monatsPraefix = `${monat.jahr}-${String(monat.monat + 1).padStart(2, '0')}`
  const kalenderImMonat = [...new Set([...kalenderProTag].filter(([tag]) => tag.startsWith(monatsPraefix)).flatMap(([, k]) => [...k]))].sort((a, b) => a.localeCompare(b, 'de'))
  const blaettern =(n: number) => setMonat(({ jahr, monat: m }) => ({ jahr: m + n < 0 ? jahr - 1 : m + n > 11 ? jahr + 1 : jahr, monat: (m + n + 12) % 12 }))

  function zuHeute() {
    setGewaehlt(heute())
    setMonat({ jahr: new Date().getFullYear(), monat: new Date().getMonth() })
  }

  return (
    <div className="px-4 pb-10 pt-3">
      {/* Kopfzeile wie bei Apple: zurück, Kalender (ein-/ausblenden), Heute, + */}
      <div className="mb-1 flex items-center justify-between">
        <Link to="/" className="tippbar inline-flex min-h-10 items-center text-[17px]" style={{ color: ROT }}>
          <ChevronLeft size={22} /> Heute
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setAuswahlOffen(true)} className="tippbar flex min-h-10 flex-col items-center justify-center px-2 leading-tight" style={{ color: ROT }}>
            <span className="text-[17px]">Kalender</span>
            {ausgeblendet.length > 0 && <span className="text-[11px] text-grau">{ausgeblendet.length} ausgeblendet</span>}
          </button>
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
                  background: istGewaehlt ? (istHeute ? ROT : 'var(--color-text)') : 'transparent',
                  color: istGewaehlt ? (istHeute ? '#fff' : 'var(--color-grund)') : istHeute ? ROT : wochenende ? '#8e8e93' : 'var(--color-text)',
                  fontWeight: istHeute || istGewaehlt ? 600 : 400,
                }}
              >
                {Number(tag.slice(8))}
              </span>
              <Punkte kalender={[...(kalenderProTag.get(tag) ?? [])]} farbe={farbe} />
            </button>
          )
        })}
      </div>

      {/* Legende: alle Kalender, die in diesem Monat Termine haben */}
      {kalenderImMonat.length > 0 && (
        <div className="-mt-2 mb-4 flex flex-wrap gap-x-3 gap-y-1 px-1">
          {kalenderImMonat.map((k) => (
            <span key={k} className="flex items-center gap-1.5 text-[12px] text-grau">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: farbe(k) }} />
              {k}
            </span>
          ))}
        </div>
      )}

      {/* Termine des gewählten Tages */}
      <h2 className="mb-2 border-t border-linie pt-3 text-[17px] font-semibold">{langesDatum(new Date(gewaehlt + 'T12:00:00'))}</h2>

      {ganztags.map((t) => (
        <button
          key={t.id}
          onClick={() => setSheet({ offen: true, termin: t })}
          className="tippbar mb-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[15px] font-medium"
          style={{ background: farbe(t.kalender) + '33', color: farbe(t.kalender) }}
        >
          <span className="min-w-0 flex-1 truncate">{t.titel}</span>
          {/* Mehrtägig: "Tag 2 von 3" */}
          {tagNummer(t, gewaehlt) && <span className="shrink-0 text-[12px] font-normal opacity-80">{tagNummer(t, gewaehlt)}</span>}
          {t.sync && <Clock size={13} className="shrink-0 text-[#ffd60a]" />}
        </button>
      ))}

      {amTag.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-grau">Keine Termine</p>
      ) : (
        <ul className="mb-4">
          {mitZeit.map((t) => (
            <li key={t.id}>
              <button onClick={() => setSheet({ offen: true, termin: t })} className="tippbar flex w-full gap-3 border-b border-linie py-2.5 text-left">
                {/* Uhrzeit für diesen Tag: bei mehrtägigen Terminen "ab 20:00" bzw. "bis 10:00" */}
                <span className="w-12 shrink-0 text-right text-[13px] leading-tight">
                  <span className="block">{zeitAm(t, gewaehlt).von}</span>
                  {zeitAm(t, gewaehlt).bis && <span className="block text-grau">{zeitAm(t, gewaehlt).bis}</span>}
                </span>
                <span className="w-1 shrink-0 rounded-full" style={{ background: farbe(t.kalender) }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[16px] font-medium">
                    <span className="truncate">{t.titel}</span>
                    {t.sync && <Clock size={13} className="shrink-0 text-[#ffd60a]" />}
                  </span>
                  {(t.ort || t.kalender || tagNummer(t, gewaehlt)) && (
                    <span className="flex items-center gap-1 truncate text-[13px] text-grau">
                      {t.ort && <MapPin size={12} />}
                      {[t.ort, t.kalender, tagNummer(t, gewaehlt)].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-center text-[12px] text-grau">⏳ = in Life geändert, beim nächsten Abgleich (↻ auf Heute) wird es in Apple Kalender übernommen.</p>

      <KalenderAuswahl offen={auswahlOffen} onZu={() => setAuswahlOffen(false)} />
      <TerminSheet offen={sheet.offen} termin={sheet.termin} tag={gewaehlt} onZu={() => setSheet({ offen: false })} />
    </div>
  )
}
