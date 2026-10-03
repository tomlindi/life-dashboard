// Karte "Abi-Prognose": Note, Block I und II, Prüfungsfächer einstellen.
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Fach, Note } from '../../core/db'
import { useEinstellung } from '../../core/einstellungen'
import Karte from '../../core/ui/Karte'
import { Balken } from '../../core/ui/Formular'
import { STANDARD_PRUEFUNGEN, abiPrognose, type AbiPruefung } from './abi'
import { formatNote } from './noten'

const FARBE = '#bf5af2'

/** Zahl aus einem Eingabefeld (leer = undefined). */
const leseZahl = (s: string) => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 && n <= 15 ? n : undefined
}

export default function AbiPrognose({ faecher, noten, aktuellesHJ }: { faecher: Fach[]; noten: Note[]; aktuellesHJ: number }) {
  const [pruefungen, setPruefungen] = useEinstellung<AbiPruefung[]>('abiPruefungen', STANDARD_PRUEFUNGEN)
  const [offen, setOffen] = useState(false)
  const p = abiPrognose(faecher, noten, aktuellesHJ, pruefungen)

  const aendere = (nr: number, neu: Partial<AbiPruefung>) => setPruefungen(pruefungen.map((x) => (x.nr === nr ? { ...x, ...neu } : x)))

  return (
    <Karte titel="Abi-Prognose" akzent={FARBE} rechts={<span className="text-[12px] text-grau">wenn du so weitermachst</span>}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[52px] font-bold leading-none" style={{ color: FARBE }}>
            {p.bestanden ? formatNote(p.note) : '–'}
          </p>
          <p className="mt-1 text-[13px] text-grau">{p.gesamt} / 900 Punkte</p>
        </div>
        <div className="w-1/2 space-y-2 text-[13px]">
          <div>
            <div className="mb-1 flex justify-between">
              <span>Block I</span>
              <span className="text-grau">{p.block1} / 600</span>
            </div>
            <Balken wert={p.block1 / 600} farbe={FARBE} />
          </div>
          <div>
            <div className="mb-1 flex justify-between">
              <span>Block II</span>
              <span className="text-grau">{p.block2} / 300</span>
            </div>
            <Balken wert={p.block2 / 300} farbe={FARBE} />
          </div>
        </div>
      </div>
      {p.unterkurse > 0 && <p className="mt-3 text-[13px] text-[#ffd60a]">⚠️ {p.unterkurse} Halbjahr(e) unter 5 Punkten (2x-Fächer doppelt gezählt)</p>}

      <button onClick={() => setOffen(!offen)} className="tippbar mt-3 flex min-h-10 w-full items-center justify-between text-[15px]" style={{ color: FARBE }}>
        Prüfungsfächer & Details
        <ChevronDown size={18} className={`transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>

      {offen && (
        <div className="mt-2 space-y-3">
          <p className="text-[13px] leading-snug text-grau">
            Leere Felder werden mit deinem Halbjahresschnitt im Fach geschätzt (grau). Trag Ergebnisse ein, sobald du sie kennst, oder deine eigene Erwartung.
          </p>
          {p.pruefungsErgebnisse.map((e) => {
            const eintrag = pruefungen.find((x) => x.nr === e.nr)!
            return (
              <div key={e.nr} className="rounded-xl bg-karte2 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="w-8 text-[15px] font-bold" style={{ color: FARBE }}>
                    P{e.nr}
                  </span>
                  <select
                    value={eintrag.fachId ?? ''}
                    onChange={(ev) => aendere(e.nr, { fachId: ev.target.value || undefined })}
                    className="h-10 min-w-0 flex-1 rounded-lg bg-black/40 px-2 text-[15px] outline-none"
                  >
                    <option value="">– Fach wählen –</option>
                    {faecher.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <span className="w-16 text-right text-[15px] font-semibold">
                    {formatNote(e.ergebnis)}
                    <span className="block text-[11px] font-normal text-grau">{e.geschaetzt ? 'geschätzt' : 'eingetragen'}</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  {e.nr <= 4 && (
                    <label className="flex-1">
                      <span className="block text-[11px] text-grau">schriftlich</span>
                      <input
                        key={`s-${e.nr}-${eintrag.schriftlich}`}
                        inputMode="decimal"
                        defaultValue={eintrag.schriftlich ?? ''}
                        placeholder={e.geschaetzt ? formatNote(e.ergebnis) : ''}
                        onBlur={(ev) => aendere(e.nr, { schriftlich: leseZahl(ev.target.value) })}
                        className="h-10 w-full rounded-lg bg-black/40 px-3 outline-none placeholder:text-grau"
                      />
                    </label>
                  )}
                  <label className="flex-1">
                    <span className="block text-[11px] text-grau">{e.nr <= 4 ? 'mündl. Zusatzprüfung' : 'mündlich'}</span>
                    <input
                      key={`m-${e.nr}-${eintrag.muendlich}`}
                      inputMode="decimal"
                      defaultValue={eintrag.muendlich ?? ''}
                      placeholder={e.nr === 5 && e.geschaetzt ? formatNote(e.ergebnis) : '–'}
                      onBlur={(ev) => aendere(e.nr, { muendlich: leseZahl(ev.target.value) })}
                      className="h-10 w-full rounded-lg bg-black/40 px-3 outline-none placeholder:text-grau"
                    />
                  </label>
                </div>
              </div>
            )
          })}
          <p className="text-[12px] leading-snug text-grau">
            Rechnung wie Notan (Baden-Württemberg): Block I = Summe ÷ Anzahl × 40 (2x-Fächer doppelt), Block II = 5 Prüfungen × 4, Note = 17/3 − Punkte/180. Hochgerechnete
            Halbjahre siehst du in der Halbjahres-Übersicht kursiv.
          </p>
        </div>
      )}
    </Karte>
  )
}
