// Bereich "Studium": Wohin nach dem Abi?
// Ziel, Hochschulen und Firmen fürs Praxisstudium (PiBS) mit Status, dazu Aufgaben und Fristen.
import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ExternalLink, Star } from 'lucide-react'
import { db, type StudiumOption, type StudiumStatus } from '../../core/db'
import { heute, neueId } from '../../core/datum'
import { kurzDatum, relativ } from '../../core/format'
import { useEinstellung } from '../../core/einstellungen'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Aufklapper from '../../core/ui/Aufklapper'
import { Chips, Haken, Leer, LoeschKnopf, SchnellEingabe } from '../../core/ui/Formular'
import { FARBE, ladeVorlage, STATUS, statusFarbe } from './vorlage'

const feldKlasse = 'w-full rounded-xl bg-mulde px-3 outline-none placeholder:text-grau'

function StatusPille({ status }: { status: StudiumStatus }) {
  const farbe = statusFarbe(status)
  return (
    <span className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: `color-mix(in srgb, ${farbe} 20%, transparent)`, color: farbe }}>
      {status}
    </span>
  )
}

/** Favoriten zuerst, dann nach Fortschritt (Zusage oben, Absage unten), dann eigene Reihenfolge. */
const rang = (s: StudiumStatus) => (s === 'Absage' ? -1 : STATUS.indexOf(s))
const sortiere = (liste: StudiumOption[]) => [...liste].sort((a, b) => Number(!!b.favorit) - Number(!!a.favorit) || rang(b.status) - rang(a.status) || a.sortierung - b.sortierung)

function OptionZeile({ o }: { o: StudiumOption }) {
  const [offen, setOffen] = useState(false)
  const setze = (felder: Partial<StudiumOption>) => db.studiumOptionen.update(o.id, felder)
  return (
    <li className="rounded-2xl bg-karte2 p-3">
      <div className="flex items-center gap-2">
        <button onClick={() => setze({ favorit: !o.favorit })} className="tippbar flex h-9 w-9 shrink-0 items-center justify-center" aria-label={o.favorit ? 'Kein Favorit mehr' : 'Als Favorit markieren'}>
          <Star size={20} color={o.favorit ? '#ffd60a' : '#8e8e93'} fill={o.favorit ? '#ffd60a' : 'none'} />
        </button>
        <button onClick={() => setOffen(!offen)} className="tippbar min-w-0 flex-1 text-left" aria-expanded={offen}>
          <p className={`truncate text-[17px] font-semibold ${o.status === 'Absage' ? 'text-grau line-through' : ''}`}>{o.name}</p>
          {o.ort && <p className="truncate text-[13px] text-grau">{o.ort}</p>}
        </button>
        <StatusPille status={o.status} />
        <ChevronDown size={18} className={`shrink-0 text-grau transition-transform ${offen ? 'rotate-180' : ''}`} />
      </div>

      {offen && (
        <div className="mt-3 space-y-3">
          <Chips optionen={STATUS} wert={o.status} onWahl={(status) => setze({ status })} farbe={statusFarbe(o.status)} />
          <input id={`ort-${o.id}`} value={o.ort ?? ''} onChange={(e) => setze({ ort: e.target.value || undefined })} placeholder="Ort" className={`${feldKlasse} h-10`} aria-label="Ort" />
          <div className="flex gap-2">
            <input id={`link-${o.id}`} value={o.link ?? ''} onChange={(e) => setze({ link: e.target.value.trim() || undefined })} placeholder="Link (https://…)" className={`${feldKlasse} h-10 min-w-0 flex-1`} aria-label="Link" />
            {o.link?.startsWith('http') && (
              <a href={o.link} target="_blank" rel="noreferrer" className="tippbar flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mulde" style={{ color: FARBE }} aria-label="Link öffnen">
                <ExternalLink size={18} />
              </a>
            )}
          </div>
          <textarea id={`notiz-${o.id}`} value={o.notiz ?? ''} onChange={(e) => setze({ notiz: e.target.value || undefined })} placeholder="Notizen: Kosten, Kontakt, offene Fragen …" rows={4} className={`${feldKlasse} py-2 text-[15px]`} aria-label="Notiz" />
          <button onClick={() => confirm(`${o.name} löschen?`) && db.studiumOptionen.delete(o.id)} className="tippbar min-h-10 text-[14px] text-[#ff453a]">
            Löschen
          </button>
        </div>
      )}
    </li>
  )
}

function OptionenKarte({ art, titel, platzhalter, liste }: { art: StudiumOption['art']; titel: string; platzhalter: string; liste: StudiumOption[] }) {
  const aktiv = liste.filter((o) => o.status !== 'Absage').length
  return (
    <Karte titel={titel} akzent={FARBE} rechts={liste.length > 0 && <span className="text-[14px] text-grau">{aktiv} offen</span>}>
      {liste.length === 0 ? <Leer>Noch nichts eingetragen.</Leer> : <ul className="mb-3 space-y-2">{sortiere(liste).map((o) => <OptionZeile key={o.id} o={o} />)}</ul>}
      <SchnellEingabe platzhalter={platzhalter} farbe={FARBE} onNeu={(name) => db.studiumOptionen.add({ id: neueId(), art, name, status: 'Idee', sortierung: liste.length })} />
    </Karte>
  )
}

function AufgabenKarte() {
  const alle = useLiveQuery(() => db.studiumAufgaben.toArray(), []) ?? []
  const [titel, setTitel] = useState('')
  const [datum, setDatum] = useState('')
  // Mit Datum zuerst (früheste oben), dann ohne Datum
  const offen = alle.filter((a) => !a.erledigt).sort((a, b) => (a.datum ?? '9999').localeCompare(b.datum ?? '9999'))
  const erledigt = alle.filter((a) => a.erledigt)

  async function neu(e: FormEvent) {
    e.preventDefault()
    if (!titel.trim()) return
    await db.studiumAufgaben.add({ id: neueId(), titel: titel.trim(), datum: datum || undefined, erledigt: false })
    setTitel('')
    setDatum('')
  }

  return (
    <Karte titel="Aufgaben & Fristen" akzent={FARBE}>
      {offen.length === 0 ? (
        <Leer>Nichts offen.</Leer>
      ) : (
        <ul className="mb-2">
          {offen.map((a) => {
            const knapp = a.datum && a.datum <= heute() // heute oder überfällig
            const bald = a.datum && !knapp && relativ(a.datum).match(/^(morgen|in [1-7] Tagen)$/)
            return (
              <li key={a.id} className="flex items-center">
                <Haken an={false} farbe={FARBE} onClick={() => db.studiumAufgaben.update(a.id, { erledigt: true })} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-snug">{a.titel}</p>
                  {a.datum && (
                    <p className="text-[13px] font-medium" style={{ color: knapp ? '#ff453a' : bald ? '#ff9f0a' : 'var(--color-grau)' }}>
                      {kurzDatum(a.datum)} · {relativ(a.datum)}
                    </p>
                  )}
                </div>
                <LoeschKnopf frage="Aufgabe löschen?" onLoeschen={() => db.studiumAufgaben.delete(a.id)} />
              </li>
            )
          })}
        </ul>
      )}
      <form onSubmit={neu} className="flex flex-col gap-2">
        <input id="studium-aufgabe" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Bewerbung HSLU abschicken" className="h-11 rounded-xl bg-karte2 px-3 outline-none placeholder:text-grau" />
        <div className="flex gap-2">
          <input id="studium-frist" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl bg-karte2 px-3 outline-none" aria-label="Frist (optional)" />
          <button type="submit" disabled={!titel.trim()} className="tippbar h-11 shrink-0 rounded-xl px-4 text-[15px] font-semibold text-black disabled:opacity-40" style={{ background: FARBE }}>
            Hinzufügen
          </button>
        </div>
      </form>
      {erledigt.length > 0 && (
        <div className="mt-2">
          <Aufklapper titel={`${erledigt.length} erledigt`} klein>
            <ul>
              {erledigt.map((a) => (
                <li key={a.id} className="flex items-center">
                  <Haken an farbe={FARBE} onClick={() => db.studiumAufgaben.update(a.id, { erledigt: false })} />
                  <span className="flex-1 text-[15px] text-grau line-through">{a.titel}</span>
                  <LoeschKnopf frage="Aufgabe löschen?" onLoeschen={() => db.studiumAufgaben.delete(a.id)} />
                </li>
              ))}
            </ul>
          </Aufklapper>
        </div>
      )}
    </Karte>
  )
}

export default function StudiumSeite() {
  const [ziel, setZiel] = useEinstellung('studiumZiel', 'Wirtschaftsingenieurwesen, praxisintegriert (PiBS)')
  const optionen = useLiveQuery(() => db.studiumOptionen.toArray(), [])
  const fristen = useLiveQuery(() => db.studiumAufgaben.where('datum').aboveOrEqual(heute()).sortBy('datum'), []) ?? []
  const naechste = fristen.find((f) => !f.erledigt)
  const hochschulen = (optionen ?? []).filter((o) => o.art === 'hochschule')
  const firmen = (optionen ?? []).filter((o) => o.art === 'firma')
  const zaehle = (s: StudiumStatus[]) => (optionen ?? []).filter((o) => s.includes(o.status)).length

  return (
    <Seite titel="Studium" untertitel="Nach dem Abi" farbe={FARBE}>
      <Karte>
        <label className="block">
          <span className="mb-1 block text-[13px] text-grau">Mein Ziel</span>
          <textarea id="studium-ziel" value={ziel} onChange={(e) => setZiel(e.target.value)} rows={2} className="w-full resize-none bg-transparent text-[20px] font-bold leading-snug outline-none" />
        </label>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-linie pt-3 text-center">
          {[
            { zahl: zaehle(['Idee', 'Recherche', 'Angefragt']), text: 'in Prüfung' },
            { zahl: zaehle(['Beworben', 'Gespräch']), text: 'beworben' },
            { zahl: zaehle(['Zusage']), text: 'Zusagen' },
          ].map((k) => (
            <div key={k.text}>
              <p className="text-[24px] font-bold tabular-nums leading-tight">{k.zahl}</p>
              <p className="text-[12px] text-grau">{k.text}</p>
            </div>
          ))}
        </div>
        {naechste?.datum && (
          <p className="mt-3 rounded-xl bg-karte2 px-3 py-2 text-[14px]">
            <span className="font-semibold" style={{ color: FARBE }}>
              Nächste Frist {relativ(naechste.datum)}:
            </span>{' '}
            {naechste.titel}
          </p>
        )}
      </Karte>

      {optionen && optionen.length === 0 && (
        <Karte>
          <Leer>Hochschulen, Firmen und offene Fragen aus deinen Notizen (HSLU, ZHAW, FHNW, OST, BFH, Karlsruhe, InfraTech, Perlen, Siemens, GONSER …) mit einem Tipp übernehmen?</Leer>
          <button onClick={ladeVorlage} className="tippbar mt-3 min-h-11 w-full rounded-xl text-[15px] font-semibold text-black" style={{ background: FARBE }}>
            Aus meinen Notizen laden
          </button>
        </Karte>
      )}

      <OptionenKarte art="hochschule" titel="Hochschulen" platzhalter="Hochschule hinzufügen" liste={hochschulen} />
      <OptionenKarte art="firma" titel="Firmen fürs Praxisstudium" platzhalter="Firma hinzufügen" liste={firmen} />
      <AufgabenKarte />
    </Seite>
  )
}
