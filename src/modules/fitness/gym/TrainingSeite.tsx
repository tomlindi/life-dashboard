// Ein Gym-Training durchführen oder nachträglich bearbeiten.
// Jede Änderung wird sofort gespeichert. Auch wenn iOS die App im Hintergrund schließt, ist nichts verloren.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, ChevronLeft, Trophy, X } from 'lucide-react'
import { db, type GymEinheit, type Satz, type SatzTyp } from '../../../core/db'
import { neueId } from '../../../core/datum'
import { zahl } from '../../../core/format'
import Karte from '../../../core/ui/Karte'
import UebungWahl from './UebungWahl'
import PausenTimer from './PausenTimer'
import {
  beendeTraining,
  letzteEinheitMit,
  loescheTraining,
  saetzeVon,
  satzText,
  schwersterSatz,
  uebungHinzufuegen,
  volumen,
  zaehlt,
} from './daten'

const FARBE = '#ff375f'
const PAUSEN = [60, 90, 120, 150, 180, 240]
const TYPEN: SatzTyp[] = ['normal', 'aufwaermen', 'drop', 'versagen']
const TYP_KUERZEL: Record<SatzTyp, string> = { normal: '', aufwaermen: 'W', drop: 'D', versagen: 'F' }
const TYP_FARBE: Record<SatzTyp, string> = { normal: '#fff', aufwaermen: '#ffd60a', drop: '#64d2ff', versagen: '#ff453a' }

/** Ändert ein Training direkt in der Datenbank (immer auf dem neuesten Stand, nichts geht verloren). */
const aendere = (id: string, fn: (e: GymEinheit) => void) => db.gymEinheiten.where('id').equals(id).modify(fn)

const zahlText = (n?: number) => (n === undefined ? '' : String(n).replace('.', ','))
const leseZahl = (s: string) => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Zahlenfeld, das beim Tippen sofort speichert, ohne dass der Cursor springt. */
function ZahlFeld({ wert, platzhalter, onAendern }: { wert?: number; platzhalter?: string; onAendern: (n?: number) => void }) {
  const [text, setText] = useState(zahlText(wert))
  const fokus = useRef(false)
  // Wert von außen geändert (z. B. "Letztes Mal" übernommen)? Dann anzeigen, aber nicht während man tippt.
  useEffect(() => {
    if (!fokus.current) setText(zahlText(wert))
  }, [wert])
  return (
    <input
      value={text}
      inputMode="decimal"
      placeholder={platzhalter}
      onFocus={(e) => {
        fokus.current = true
        e.target.select()
      }}
      onBlur={() => {
        fokus.current = false
        setText(zahlText(wert))
      }}
      onChange={(e) => {
        setText(e.target.value)
        onAendern(leseZahl(e.target.value))
      }}
      className="h-10 w-full rounded-lg bg-black/40 text-center font-semibold outline-none placeholder:font-normal placeholder:text-grau"
    />
  )
}

/** Laufende Trainingsdauer (aktualisiert sich jede Sekunde). */
function Dauer({ start }: { start: string }) {
  const [jetzt, setJetzt] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.max(0, Math.floor((jetzt - Date.parse(start)) / 1000))
  const h = Math.floor(s / 3600)
  return (
    <span className="tabular-nums">
      {h > 0 ? `${h}:` : ''}
      {String(Math.floor((s % 3600) / 60)).padStart(h > 0 ? 2 : 1, '0')}:{String(s % 60).padStart(2, '0')}
    </span>
  )
}

export default function TrainingSeite() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  // undefined = lädt noch, null = gibt es nicht
  const einheit = useLiveQuery(async () => (await db.gymEinheiten.get(id)) ?? null, [id])
  const alle = useLiveQuery(() => db.gymEinheiten.toArray(), []) ?? []
  const uebungen = useLiveQuery(() => db.uebungen.toArray(), []) ?? []
  const [wahlOffen, setWahlOffen] = useState(false)

  if (einheit === undefined) return null
  if (einheit === null) {
    return (
      <div className="p-6 text-center text-grau">
        Training nicht gefunden. <Link to="/fitness/gym" className="text-[#ff375f]">Zurück</Link>
      </div>
    )
  }

  const laeuft = !einheit.ende
  const name = (uebungId: string) => uebungen.find((u) => u.id === uebungId)?.name ?? 'Übung'

  // ---- Zusammenfassung & Bestleistungen (Personal Records) ----
  const prs = einheit.uebungen.flatMap((u) => {
    const bisher = schwersterSatz(saetzeVon(alle, u.uebungId, einheit.start))
    const heute = schwersterSatz(u.saetze.filter(zaehlt).map((s) => ({ ...s, datum: einheit.start, einheitId: einheit.id })))
    if (!heute || (bisher && (heute.kg! < bisher.kg! || (heute.kg === bisher.kg && heute.wdh! <= bisher.wdh!)))) return []
    return [{ name: name(u.uebungId), satz: heute, erstes: !bisher }]
  })
  const dauerMin = einheit.ende ? Math.round((Date.parse(einheit.ende) - Date.parse(einheit.start)) / 60000) : 0
  const anzahlSaetze = einheit.uebungen.reduce((s, u) => s + u.saetze.filter((x) => x.erledigt).length, 0)

  // ---- Satz-Aktionen ----
  function satzAendern(uebungIndex: number, satzIndex: number, neu: Partial<Satz>) {
    aendere(id, (e) => Object.assign(e.uebungen[uebungIndex].saetze[satzIndex], neu))
  }

  function satzAbhaken(uebungIndex: number, satzIndex: number, vorher?: Satz) {
    aendere(id, (e) => {
      const u = e.uebungen[uebungIndex]
      const s = u.saetze[satzIndex]
      s.erledigt = !s.erledigt
      if (s.erledigt) {
        // Leere Felder mit "Letztes Mal" bzw. dem Ziel füllen (wie bei Gym-Apps üblich)
        if (s.kg === undefined) s.kg = vorher?.kg
        if (s.wdh === undefined) s.wdh = vorher?.wdh ?? (parseInt(u.ziel ?? '', 10) || undefined)
        if (!e.ende) e.pauseEnde = new Date(Date.now() + u.pauseSek * 1000).toISOString() // Pause starten
      }
    })
  }

  return (
    <div className="px-4 pb-40 pt-3">
      {/* Kopf */}
      <Link to="/fitness/gym" className="tippbar mb-2 inline-flex min-h-10 items-center text-[17px]" style={{ color: FARBE }}>
        <ChevronLeft size={22} /> Gym
      </Link>
      <input
        defaultValue={einheit.name}
        onBlur={(e) => aendere(id, (x) => void (x.name = e.target.value.trim() || x.name))}
        className="mb-1 w-full bg-transparent text-[30px] font-bold outline-none"
        style={{ fontSize: 30 }}
      />
      <p className="mb-4 text-[15px] text-grau">
        {laeuft ? (
          <>
            Läuft seit <Dauer start={einheit.start} />
          </>
        ) : (
          `${new Date(einheit.start).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })} · ${dauerMin} Min`
        )}
      </p>

      {/* Zusammenfassung nach dem Training */}
      {!laeuft && (
        <Karte className="mb-3">
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-[22px] font-bold">{dauerMin}</p>
              <p className="text-[12px] text-grau">Minuten</p>
            </div>
            <div>
              <p className="text-[22px] font-bold">{anzahlSaetze}</p>
              <p className="text-[12px] text-grau">Sätze</p>
            </div>
            <div>
              <p className="text-[22px] font-bold">{zahl(volumen(einheit) / 1000)} t</p>
              <p className="text-[12px] text-grau">Volumen</p>
            </div>
          </div>
          {prs.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-linie pt-3">
              {prs.map((p) => (
                <p key={p.name} className="flex items-center gap-2 text-[14px]">
                  <Trophy size={16} color="#ffd60a" />
                  <span className="flex-1">{p.name}</span>
                  <span className="font-semibold text-[#ffd60a]">
                    {satzText(p.satz)}
                    {p.erstes ? ' (erstes Mal)' : ' Bestleistung!'}
                  </span>
                </p>
              ))}
            </div>
          )}
        </Karte>
      )}

      {/* Übungen */}
      <div className="flex flex-col gap-3">
        {einheit.uebungen.map((u, ui) => {
          const letzte = letzteEinheitMit(alle, u.uebungId, einheit.start)
          const vorherSaetze = letzte?.uebung.saetze.filter(zaehlt) ?? []
          const bester = schwersterSatz(saetzeVon(alle, u.uebungId, einheit.start))
          let arbeitsSatzNr = 0
          return (
            <Karte key={u.id}>
              <div className="mb-1 flex items-center gap-1">
                <h2 className="flex-1 text-[18px] font-bold" style={{ color: FARBE }}>
                  {name(u.uebungId)}
                </h2>
                <button
                  disabled={ui === 0}
                  onClick={() => aendere(id, (e) => void e.uebungen.splice(ui - 1, 0, e.uebungen.splice(ui, 1)[0]))}
                  className="tippbar flex h-9 w-9 items-center justify-center text-grau disabled:opacity-20"
                  aria-label="Nach oben"
                >
                  <ArrowUp size={18} />
                </button>
                <button
                  disabled={ui === einheit.uebungen.length - 1}
                  onClick={() => aendere(id, (e) => void e.uebungen.splice(ui + 1, 0, e.uebungen.splice(ui, 1)[0]))}
                  className="tippbar flex h-9 w-9 items-center justify-center text-grau disabled:opacity-20"
                  aria-label="Nach unten"
                >
                  <ArrowDown size={18} />
                </button>
                <button
                  onClick={() => confirm(`${name(u.uebungId)} aus dem Training entfernen?`) && aendere(id, (e) => void e.uebungen.splice(ui, 1))}
                  className="tippbar flex h-9 w-9 items-center justify-center text-grau"
                  aria-label="Übung entfernen"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Letzter Satz, schwerster Satz, Ziel, Pause */}
              <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-grau">
                <span>
                  Letzter Satz: <b className="text-white">{satzText(vorherSaetze[vorherSaetze.length - 1] ?? null)}</b>
                </span>
                <span>
                  Schwerster: <b className="text-[#ffd60a]">{satzText(bester)}</b>
                </span>
                {u.ziel && <span>Ziel: {u.ziel} Wdh</span>}
                <button
                  onClick={() => aendere(id, (e) => void (e.uebungen[ui].pauseSek = PAUSEN[(PAUSEN.indexOf(u.pauseSek) + 1) % PAUSEN.length]))}
                  className="tippbar rounded-full bg-karte2 px-2 text-white"
                >
                  ⏱ {Math.floor(u.pauseSek / 60)}:{String(u.pauseSek % 60).padStart(2, '0')}
                </button>
              </div>

              {/* Satz-Tabelle */}
              <div className="grid grid-cols-[36px_1fr_64px_52px_44px] items-center gap-x-2 gap-y-1.5 text-center">
                <span className="text-[11px] text-grau">Satz</span>
                <span className="text-[11px] text-grau">Letztes Mal</span>
                <span className="text-[11px] text-grau">kg</span>
                <span className="text-[11px] text-grau">Wdh</span>
                <span />
                {u.saetze.map((s, si) => {
                  if (s.typ !== 'aufwaermen') arbeitsSatzNr++
                  const vorher = s.typ === 'aufwaermen' ? undefined : vorherSaetze[arbeitsSatzNr - 1]
                  return (
                    <div key={s.id} className={`contents ${s.erledigt ? '[&>*]:bg-[#30d158]/15' : ''}`}>
                      {/* Antippen wechselt den Typ: normal → W (Aufwärmen) → D (Drop) → F (Versagen) */}
                      <button
                        onClick={() => satzAendern(ui, si, { typ: TYPEN[(TYPEN.indexOf(s.typ) + 1) % TYPEN.length] })}
                        className="tippbar h-10 rounded-lg text-[15px] font-bold"
                        style={{ color: TYP_FARBE[s.typ] }}
                      >
                        {TYP_KUERZEL[s.typ] || arbeitsSatzNr}
                      </button>
                      {/* "Letztes Mal" antippen = Werte übernehmen */}
                      <button
                        onClick={() => vorher && satzAendern(ui, si, { kg: vorher.kg, wdh: vorher.wdh })}
                        className="tippbar h-10 truncate rounded-lg text-[13px] text-grau"
                      >
                        {vorher ? `${vorher.kg === 0 ? 'KG' : zahlText(vorher.kg)} × ${vorher.wdh}` : '–'}
                      </button>
                      <ZahlFeld wert={s.kg} platzhalter={zahlText(vorher?.kg)} onAendern={(kg) => satzAendern(ui, si, { kg })} />
                      <ZahlFeld wert={s.wdh} platzhalter={vorher?.wdh?.toString() ?? u.ziel?.split(/[-–]/)[0]} onAendern={(wdh) => satzAendern(ui, si, { wdh: wdh === undefined ? undefined : Math.round(wdh) })} />
                      <button
                        onClick={() => satzAbhaken(ui, si, vorher)}
                        className="tippbar flex h-10 items-center justify-center rounded-lg text-[18px] font-bold"
                        style={{ background: s.erledigt ? '#30d158' : '#3a3a3c', color: s.erledigt ? '#000' : '#8e8e93' }}
                        aria-label={s.erledigt ? 'Satz als offen markieren' : 'Satz abhaken'}
                      >
                        ✓
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() =>
                    aendere(id, (e) => {
                      const letzter = e.uebungen[ui].saetze[e.uebungen[ui].saetze.length - 1]
                      e.uebungen[ui].saetze.push({ id: neueId(), kg: letzter?.kg, wdh: letzter?.wdh, typ: 'normal', erledigt: false })
                    })
                  }
                  className="tippbar min-h-10 flex-1 rounded-xl bg-karte2 text-[15px] font-semibold"
                >
                  + Satz
                </button>
                <button
                  disabled={u.saetze.length === 0}
                  onClick={() => aendere(id, (e) => void e.uebungen[ui].saetze.pop())}
                  className="tippbar min-h-10 rounded-xl bg-karte2 px-4 text-[15px] text-grau disabled:opacity-30"
                >
                  − Satz
                </button>
              </div>
              <input
                defaultValue={u.notiz ?? ''}
                onBlur={(e) => aendere(id, (x) => void (x.uebungen[ui].notiz = e.target.value.trim() || undefined))}
                placeholder="Notiz (z. B. Sitzhöhe 4, enger Griff)"
                className="mt-2 h-10 w-full rounded-xl bg-black/30 px-3 text-[14px] outline-none placeholder:text-grau"
              />
            </Karte>
          )
        })}

        <button onClick={() => setWahlOffen(true)} className="tippbar min-h-12 rounded-2xl bg-karte text-[16px] font-semibold" style={{ color: FARBE }}>
          + Übung hinzufügen
        </button>

        <textarea
          defaultValue={einheit.notiz ?? ''}
          onBlur={(e) => aendere(id, (x) => void (x.notiz = e.target.value.trim() || undefined))}
          placeholder="Notiz zum Training (Wie lief's? Energie, Schlaf, Schmerzen …)"
          rows={2}
          className="w-full resize-none rounded-2xl bg-karte p-3 text-[15px] outline-none placeholder:text-grau"
        />

        {laeuft ? (
          <button
            onClick={async () => {
              const offen = einheit.uebungen.some((u) => u.saetze.some((s) => !s.erledigt))
              if (offen && !confirm('Nicht abgehakte Sätze werden verworfen. Training beenden?')) return
              await beendeTraining(id)
              document.querySelector('main')?.scrollTo(0, 0)
            }}
            className="tippbar min-h-14 rounded-2xl bg-[#30d158] text-[17px] font-semibold text-black"
          >
            Training beenden
          </button>
        ) : (
          <button
            onClick={async () => {
              if (!confirm('Dieses Training endgültig löschen?')) return
              await loescheTraining(id)
              navigate('/fitness/gym')
            }}
            className="tippbar min-h-12 rounded-2xl bg-karte text-[15px] text-[#ff453a]"
          >
            Training löschen
          </button>
        )}
      </div>

      <UebungWahl offen={wahlOffen} onZu={() => setWahlOffen(false)} onWahl={(uebungId) => uebungHinzufuegen(id, uebungId)} />
      {laeuft && <PausenTimer einheitId={id} pauseEnde={einheit.pauseEnde} />}
    </div>
  )
}
