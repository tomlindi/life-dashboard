// Bereich "Ernährung": Mahlzeiten per Foto-Analyse (Google Gemini) oder schnell von Hand,
// einfache Bewertung gesund/okay/ungesund, geschätzte Nährwerte und Wasser-Zähler.
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ChevronRight, GlassWater, ImagePlus, Minus, Plus } from 'lucide-react'
import { db, type Bewertung, type Mahlzeit } from '../../core/db'
import { heute, kurzerWochentag, letzteTage, neueId } from '../../core/datum'
import { holeSchluessel } from '../../core/gemini'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import { Leer } from '../../core/ui/Formular'
import { BEWERTUNG } from './bewertung'
import MahlzeitSheet from './MahlzeitSheet'

const FARBE = '#a3e635'
const WASSER_ZIEL = 8
const VORSCHLAEGE = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']

export default function ErnaehrungSeite() {
  const tag = heute()
  const wasser = useLiveQuery(() => db.wasser.get(tag), [tag])
  const mahlzeiten = useLiveQuery(() => db.mahlzeiten.toArray(), []) ?? []
  const [name, setName] = useState('')
  // Formular: entweder mit neuem Foto oder zum Bearbeiten einer Mahlzeit
  const [sheet, setSheet] = useState<{ offen: boolean; foto?: File; vorhanden?: Mahlzeit }>({ offen: false })
  const kameraFeld = useRef<HTMLInputElement>(null)
  const galerieFeld = useRef<HTMLInputElement>(null)

  const glaeser = wasser?.glaeser ?? 0
  const heutige = mahlzeiten.filter((m) => m.datum === tag)
  const tage7 = letzteTage(7)
  const woche = mahlzeiten.filter((m) => tage7.includes(m.datum))
  const anteilGesund = woche.length ? Math.round((woche.filter((m) => m.bewertung === 'gesund').length / woche.length) * 100) : null

  // Tagessumme der (geschätzten) Nährwerte
  const summe = (feld: 'kcal' | 'eiweiss' | 'kohlenhydrate' | 'fett') => heutige.reduce((s, m) => s + (m.naehrwerte?.[feld] ?? 0), 0)
  const mitNaehrwerten = heutige.some((m) => m.naehrwerte?.kcal)

  /** Ein Tap auf eine Bewertung speichert die Mahlzeit sofort (ohne Foto). */
  async function speichere(bewertung: Bewertung) {
    await db.mahlzeiten.add({ id: neueId(), datum: tag, name: name.trim() || 'Mahlzeit', bewertung, quelle: 'manuell' })
    setName('')
  }

  /** Foto gewählt/aufgenommen -> Formular öffnen, dort startet die Analyse. */
  function fotoGewaehlt(datei: File | undefined) {
    if (datei) setSheet({ offen: true, foto: datei })
  }

  return (
    <Seite titel="Ernährung" farbe={FARBE}>
      {/* Foto-Analyse */}
      <Karte titel="Foto-Analyse" akzent={FARBE}>
        <p className="mb-3 text-[13px] leading-snug text-grau">
          Fotografiere dein Essen: Gemini erkennt das Gericht, bewertet es, schätzt die Nährwerte und gibt dir einen Tipp. Du kannst alles vor dem Speichern ändern.
        </p>
        {/* capture="environment" öffnet auf dem iPhone direkt die Rückkamera */}
        <input ref={kameraFeld} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (fotoGewaehlt(e.target.files?.[0]), (e.target.value = ''))} />
        <input ref={galerieFeld} type="file" accept="image/*" className="hidden" onChange={(e) => (fotoGewaehlt(e.target.files?.[0]), (e.target.value = ''))} />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => kameraFeld.current?.click()} className="tippbar flex h-14 items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold text-black" style={{ background: FARBE }}>
            <Camera size={20} /> Foto machen
          </button>
          <button onClick={() => galerieFeld.current?.click()} className="tippbar flex h-14 items-center justify-center gap-2 rounded-2xl bg-karte2 text-[16px] font-semibold">
            <ImagePlus size={20} /> Hochladen
          </button>
        </div>
        {!holeSchluessel() && (
          <Link to="/einstellungen" className="tippbar mt-2 flex items-center gap-1 text-[13px] text-grau">
            Noch kein Gemini-Schlüssel: <span style={{ color: FARBE }}>in den Einstellungen eintragen</span> <ChevronRight size={14} />
          </Link>
        )}
      </Karte>

      {/* Schnell von Hand */}
      <Karte titel="Schnell eintragen">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Was hast du gegessen? (optional)"
          className="mb-2 h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
        />
        <div className="mb-3 flex flex-wrap gap-2">
          {VORSCHLAEGE.map((v) => (
            <button key={v} onClick={() => setName(v)} className="tippbar min-h-9 rounded-full bg-karte2 px-3 text-[14px]" style={{ color: name === v ? FARBE : '#fff' }}>
              {v}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[13px] text-grau">Wie war’s? (ein Tap speichert)</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(BEWERTUNG) as Bewertung[]).map((b) => (
            <button
              key={b}
              onClick={() => speichere(b)}
              className="tippbar flex h-20 flex-col items-center justify-center gap-1 rounded-2xl"
              style={{ background: BEWERTUNG[b].farbe + '26' }}
            >
              <span className="text-[28px]">{BEWERTUNG[b].emoji}</span>
              <span className="text-[14px] font-semibold capitalize" style={{ color: BEWERTUNG[b].farbe }}>
                {b}
              </span>
            </button>
          ))}
        </div>
      </Karte>

      {/* Heute */}
      <Karte titel="Heute">
        {mitNaehrwerten && (
          <div className="mb-3 grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'kcal', wert: summe('kcal') },
              { label: 'Eiweiß', wert: summe('eiweiss'), einheit: 'g' },
              { label: 'Kohlenh.', wert: summe('kohlenhydrate'), einheit: 'g' },
              { label: 'Fett', wert: summe('fett'), einheit: 'g' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl bg-karte2 py-2">
                <p className="text-[17px] font-bold">
                  {k.wert.toLocaleString('de-DE')}
                  {k.einheit && <span className="text-[11px] font-normal text-grau"> {k.einheit}</span>}
                </p>
                <p className="text-[11px] text-grau">{k.label}</p>
              </div>
            ))}
          </div>
        )}
        {heutige.length === 0 ? (
          <Leer>Heute noch nichts eingetragen.</Leer>
        ) : (
          <ul>
            {heutige.map((m, i) => (
              <li key={m.id}>
                {/* Antippen = Details ansehen und bearbeiten */}
                <button onClick={() => setSheet({ offen: true, vorhanden: m })} className={`tippbar flex min-h-14 w-full items-center gap-3 py-1.5 text-left ${i > 0 ? 'border-t border-linie' : ''}`}>
                  {m.bild ? (
                    <img src={m.bild} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-karte2 text-[22px]">{BEWERTUNG[m.bewertung].emoji}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px]">{m.name}</span>
                    <span className="block truncate text-[12px] text-grau">
                      <span style={{ color: BEWERTUNG[m.bewertung].farbe }}>{m.bewertung}</span>
                      {m.naehrwerte?.kcal ? ` · ca. ${m.naehrwerte.kcal} kcal` : ''}
                      {m.tipp ? ` · ${m.tipp}` : ''}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-grau" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {mitNaehrwerten && <p className="mt-2 text-[11px] text-grau">Nährwerte sind Schätzungen aus dem Foto, keine genauen Messwerte.</p>}
      </Karte>

      {/* Wasser */}
      <Karte titel="Wasser" akzent="#64d2ff" rechts={<span className="text-[13px] text-grau">{glaeser} / {WASSER_ZIEL} Gläser</span>}>
        <div className="mb-3 flex justify-between">
          {Array.from({ length: WASSER_ZIEL }, (_, i) => (
            <GlassWater key={i} size={30} color={i < glaeser ? '#64d2ff' : '#3a3a3c'} fill={i < glaeser ? '#64d2ff55' : 'transparent'} />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => db.wasser.put({ datum: tag, glaeser: Math.max(0, glaeser - 1) })} className="tippbar flex h-12 w-14 items-center justify-center rounded-2xl bg-karte2" aria-label="Ein Glas weniger">
            <Minus size={20} />
          </button>
          <button onClick={() => db.wasser.put({ datum: tag, glaeser: glaeser + 1 })} className="tippbar flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#64d2ff] text-[16px] font-semibold text-black">
            <Plus size={20} /> Glas Wasser
          </button>
        </div>
      </Karte>

      {/* Woche: pro Tag ein Punkt je Mahlzeit in der Farbe der Bewertung */}
      <Karte titel="Letzte 7 Tage" rechts={anteilGesund !== null && <span className="text-[13px] text-grau">{anteilGesund} % gesund</span>}>
        <div className="flex justify-between">
          {tage7.map((t) => (
            <div key={t} className="flex w-10 flex-col items-center gap-1">
              <div className="flex min-h-16 flex-col-reverse items-center gap-1">
                {mahlzeiten
                  .filter((m) => m.datum === t)
                  .map((m) => (
                    <span key={m.id} className="h-3 w-3 rounded-full" style={{ background: BEWERTUNG[m.bewertung].farbe }} />
                  ))}
              </div>
              <span className="text-[11px] text-grau">{kurzerWochentag(t)}</span>
            </div>
          ))}
        </div>
      </Karte>

      <MahlzeitSheet offen={sheet.offen} foto={sheet.foto} vorhanden={sheet.vorhanden} tag={tag} onZu={() => setSheet({ offen: false })} />
    </Seite>
  )
}
