// Bereich "Knie": Reha nach der Kreuzband-OP.
// Tage seit der OP, Physio-Übungen zum Abhaken, Schmerz/Schwellung/Beweglichkeit pro Tag,
// Verlauf als Diagramm und Meilensteine fürs Comeback.
// Wichtig: Die App plant nichts selbst. Übungen und Freigaben kommen von Arzt und Physio.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db, type RehaUebung } from '../../core/db'
import { heute, neueId, tagPlus } from '../../core/datum'
import { kurzDatum } from '../../core/format'
import { useEinstellung } from '../../core/einstellungen'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import Aufklapper from '../../core/ui/Aufklapper'
import { Chips, Haken, Leer, LoeschKnopf, SchnellEingabe, Schalter } from '../../core/ui/Formular'
import { aendereTag, FARBE, ladeMeilensteinVorlage, rehaStreak, SCHWELLUNG, seitOp, STANDARD_OP_DATUM, tageZwischen } from './reha'

const achse = { tick: { fill: '#8e8e93', fontSize: 11 }, axisLine: false, tickLine: false } as const
const tooltipStil = { background: 'var(--color-karte2)', border: 'none', borderRadius: 12, color: 'var(--color-text)', fontSize: 13 }

/** Zahl aus einem Eingabefeld: leer = undefined. */
const zahlOderLeer = (text: string) => (text.trim() === '' || isNaN(Number(text)) ? undefined : Number(text))

function Uebersicht({ opDatum, setOpDatum, erledigt, gesamt, streak }: { opDatum: string; setOpDatum: (d: string) => void; erledigt: number; gesamt: number; streak: number }) {
  const { tage, woche } = seitOp(opDatum)
  return (
    <Karte>
      <div className="flex items-center gap-4">
        <Ring fortschritt={gesamt ? erledigt / gesamt : 0} farbe={FARBE} groesse={88} dicke={10}>
          <span className="text-[17px] font-bold">
            {erledigt}/{gesamt}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-grau">Seit der OP</p>
          <p className="text-[30px] font-bold leading-tight">Tag {Math.max(0, tage)}</p>
          <p className="text-[14px] text-grau">
            Woche {woche}
            {streak > 0 ? ` · ${streak} ${streak === 1 ? 'Tag' : 'Tage'} alle Übungen` : ''}
          </p>
        </div>
      </div>
      <label className="mt-3 flex items-center justify-between gap-3 border-t border-linie pt-3">
        <span className="text-[14px] text-grau">OP-Datum</span>
        <input id="knie-op-datum" type="date" value={opDatum} max={heute()} onChange={(e) => e.target.value && setOpDatum(e.target.value)} className="h-10 rounded-xl bg-karte2 px-3 outline-none" />
      </label>
    </Karte>
  )
}

function TagKarte({ uebungen }: { uebungen: RehaUebung[] }) {
  const [datum, setDatum] = useState(heute())
  const tag = useLiveQuery(() => db.rehaTage.get(datum), [datum])
  const erledigt = tag?.erledigt ?? []
  const istHeute = datum === heute()

  const setze = (feld: string, wert: unknown) => aendereTag(datum, () => ({ [feld]: wert }))
  const umschalten = (id: string) => aendereTag(datum, (t) => ({ erledigt: t.erledigt.includes(id) ? t.erledigt.filter((x) => x !== id) : [...t.erledigt, id] }))

  return (
    <Karte
      titel={istHeute ? 'Heute' : kurzDatum(datum)}
      akzent={FARBE}
      rechts={
        <div className="flex items-center gap-1">
          <button onClick={() => setDatum(tagPlus(datum, -1))} className="tippbar h-9 w-9 rounded-full text-[18px] text-grau" aria-label="Tag zurück">
            ‹
          </button>
          <button onClick={() => setDatum(tagPlus(datum, 1))} disabled={istHeute} className="tippbar h-9 w-9 rounded-full text-[18px] text-grau disabled:opacity-30" aria-label="Tag vor">
            ›
          </button>
        </div>
      }
    >
      <p className="mb-1 text-[13px] text-grau">Übungen</p>
      {uebungen.length === 0 ? (
        <Leer>Noch keine Übungen. Trag unten bei „Übungen vom Physio“ ein, was dein Physio dir gegeben hat.</Leer>
      ) : (
        <ul className="mb-3">
          {uebungen.map((u) => (
            <li key={u.id} className="flex items-center">
              <Haken an={erledigt.includes(u.id)} farbe={FARBE} onClick={() => umschalten(u.id)} />
              <span className={`flex-1 text-[16px] ${erledigt.includes(u.id) ? 'text-grau line-through' : ''}`}>{u.name}</span>
              {u.vorgabe && <span className="text-[14px] text-grau">{u.vorgabe}</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-4 border-t border-linie pt-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[13px] text-grau">
            <span>Schmerz</span>
            <span className="text-[15px] font-semibold" style={{ color: 'var(--color-text)' }}>
              {tag?.schmerz ?? '–'} <span className="text-[13px] font-normal text-grau">/ 10</span>
            </span>
          </div>
          <input
            id="knie-schmerz"
            type="range"
            min={0}
            max={10}
            step={1}
            value={tag?.schmerz ?? 0}
            onChange={(e) => setze('schmerz', Number(e.target.value))}
            className="w-full"
            style={{ accentColor: FARBE }}
            aria-label="Schmerz von 0 bis 10"
          />
        </div>
        <div>
          <p className="mb-1.5 text-[13px] text-grau">Schwellung</p>
          <Chips optionen={SCHWELLUNG} wert={tag?.schwellung !== undefined ? SCHWELLUNG[tag.schwellung] : ('' as (typeof SCHWELLUNG)[number])} onWahl={(w) => setze('schwellung', SCHWELLUNG.indexOf(w))} farbe={FARBE} />
        </div>
        <div className="flex gap-3">
          <label className="block min-w-0 flex-1">
            <span className="mb-1.5 block text-[13px] text-grau">Beugung (°)</span>
            <input id="knie-beugung" inputMode="numeric" value={tag?.beugung ?? ''} onChange={(e) => setze('beugung', zahlOderLeer(e.target.value))} placeholder="z. B. 95" className="h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau" />
          </label>
          <label className="block min-w-0 flex-1">
            <span className="mb-1.5 block text-[13px] text-grau">Streckdefizit (°)</span>
            <input id="knie-streckung" inputMode="numeric" value={tag?.streckung ?? ''} onChange={(e) => setze('streckung', zahlOderLeer(e.target.value))} placeholder="0 = gerade" className="h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-grau">Notiz</span>
          <textarea
            id="knie-notiz"
            value={tag?.notiz ?? ''}
            onChange={(e) => setze('notiz', e.target.value || undefined)}
            placeholder="Wie ging's? Was hat der Physio gesagt?"
            rows={2}
            className="w-full rounded-2xl bg-karte2 px-4 py-3 outline-none placeholder:text-grau"
          />
        </label>
      </div>
    </Karte>
  )
}

const VERLAUF = ['Beugung', 'Streckdefizit', 'Schmerz'] as const

function VerlaufKarte({ opDatum }: { opDatum: string }) {
  const [art, setArt] = useState<(typeof VERLAUF)[number]>('Beugung')
  const tage = useLiveQuery(() => db.rehaTage.where('datum').aboveOrEqual(opDatum).sortBy('datum'), [opDatum]) ?? []
  const feld = art === 'Beugung' ? 'beugung' : art === 'Streckdefizit' ? 'streckung' : 'schmerz'
  const einheit = art === 'Schmerz' ? '/10' : '°'
  // x = Tag nach der OP -> echte Zeitachse
  const daten = tage.filter((t) => t[feld] !== undefined).map((t) => ({ x: tageZwischen(opDatum, t.datum), wert: t[feld] as number, datum: t.datum }))

  return (
    <Karte titel="Verlauf" akzent={FARBE}>
      <div className="mb-3">
        <Chips optionen={VERLAUF} wert={art} onWahl={setArt} farbe={FARBE} />
      </div>
      {daten.length >= 2 ? (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daten} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tickCount={5} tickFormatter={(x) => `Tag ${x}`} {...achse} />
              <YAxis domain={art === 'Schmerz' ? [0, 10] : ['auto', 'auto']} {...achse} width={44} />
              <Tooltip contentStyle={tooltipStil} formatter={(v) => [`${v}${einheit}`, art]} labelFormatter={(_, p) => (p?.[0]?.payload?.datum ? kurzDatum(p[0].payload.datum) : '')} />
              <Line type="monotone" dataKey="wert" stroke={FARBE} strokeWidth={3} dot={{ r: 3, fill: FARBE }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Leer>Ab zwei eingetragenen Tagen siehst du hier, wie sich {art === 'Schmerz' ? 'der Schmerz' : `die ${art}`} entwickelt.</Leer>
      )}
    </Karte>
  )
}

function Meilensteine() {
  const liste = useLiveQuery(() => db.rehaMeilensteine.orderBy('sortierung').toArray(), []) ?? []
  const erreicht = liste.filter((m) => m.erreicht).length
  return (
    <Karte titel="Meilensteine" akzent={FARBE} rechts={liste.length > 0 && <span className="text-[14px] text-grau">{erreicht} von {liste.length}</span>}>
      {liste.length === 0 ? (
        <div className="space-y-3">
          <Leer>Schritte zurück zum Handball. Hak sie ab, sobald Arzt oder Physio sie freigeben.</Leer>
          <button onClick={ladeMeilensteinVorlage} className="tippbar min-h-11 w-full rounded-xl bg-karte2 text-[15px] font-semibold" style={{ color: FARBE }}>
            Typische Meilensteine laden
          </button>
        </div>
      ) : (
        <ul className="mb-2">
          {liste.map((m) => (
            <li key={m.id} className="flex items-center">
              <Haken an={!!m.erreicht} farbe={FARBE} onClick={() => db.rehaMeilensteine.update(m.id, { erreicht: m.erreicht ? undefined : heute() })} />
              <span className={`min-w-0 flex-1 text-[16px] ${m.erreicht ? 'text-grau' : ''}`}>{m.titel}</span>
              {m.erreicht && <span className="text-[13px] text-grau">{kurzDatum(m.erreicht)}</span>}
              <LoeschKnopf frage={`„${m.titel}“ löschen?`} onLoeschen={() => db.rehaMeilensteine.delete(m.id)} />
            </li>
          ))}
        </ul>
      )}
      <SchnellEingabe platzhalter="Eigener Meilenstein" farbe={FARBE} onNeu={(titel) => db.rehaMeilensteine.add({ id: neueId(), titel, sortierung: liste.length })} />
    </Karte>
  )
}

function UebungenVerwalten({ alle }: { alle: RehaUebung[] }) {
  return (
    <Karte>
      <Aufklapper titel="Übungen vom Physio" anzahl={alle.length} farbe={FARBE} standardOffen={alle.length === 0}>
        <p className="mb-2 text-[13px] leading-snug text-grau">Nur Übungen eintragen, die dein Physio dir gegeben hat. Ausgeschaltete Übungen bleiben gespeichert, stehen aber nicht mehr bei „Heute“.</p>
        <ul className="mb-2">
          {alle.map((u) => (
            <li key={u.id} className="flex items-center gap-2 py-1">
              <div className="min-w-0 flex-1">
                <input
                  value={u.name}
                  onChange={(e) => db.rehaUebungen.update(u.id, { name: e.target.value })}
                  className="w-full bg-transparent text-[16px] outline-none"
                  aria-label="Name der Übung"
                />
                <input
                  value={u.vorgabe ?? ''}
                  onChange={(e) => db.rehaUebungen.update(u.id, { vorgabe: e.target.value || undefined })}
                  placeholder="Vorgabe, z. B. 3 × 15"
                  className="w-full bg-transparent text-[13px] text-grau outline-none placeholder:text-grau/60"
                  aria-label="Vorgabe"
                />
              </div>
              <Schalter an={u.aktiv} onClick={() => db.rehaUebungen.update(u.id, { aktiv: !u.aktiv })} label={`${u.name} im Tagesplan`} />
              <LoeschKnopf frage={`„${u.name}“ löschen?`} onLoeschen={() => db.rehaUebungen.delete(u.id)} />
            </li>
          ))}
        </ul>
        <SchnellEingabe platzhalter="z. B. Quadrizeps anspannen" farbe={FARBE} onNeu={(name) => db.rehaUebungen.add({ id: neueId(), name, aktiv: true, sortierung: alle.length })} />
      </Aufklapper>
    </Karte>
  )
}

export default function KnieSeite() {
  const [opDatum, setOpDatum] = useEinstellung('rehaOpDatum', STANDARD_OP_DATUM)
  const alle = useLiveQuery(() => db.rehaUebungen.orderBy('sortierung').toArray(), []) ?? []
  const aktive = alle.filter((u) => u.aktiv)
  const tage = useLiveQuery(() => db.rehaTage.where('datum').aboveOrEqual(tagPlus(heute(), -120)).toArray(), []) ?? []
  const map = new Map(tage.map((t) => [t.datum, t.erledigt]))
  const heuteErledigt = aktive.filter((u) => map.get(heute())?.includes(u.id)).length

  return (
    <Seite titel="Knie" untertitel="Reha & Comeback" farbe={FARBE}>
      <Uebersicht opDatum={opDatum} setOpDatum={setOpDatum} erledigt={heuteErledigt} gesamt={aktive.length} streak={rehaStreak(map, aktive.map((u) => u.id))} />
      <TagKarte uebungen={aktive} />
      <VerlaufKarte opDatum={opDatum} />
      <Meilensteine />
      <UebungenVerwalten alle={alle} />
      <p className="px-1 text-[12px] leading-snug text-grau">Die App plant kein Training. Belastung, Übungen und Freigaben sprichst du mit Arzt und Physio ab.</p>
    </Seite>
  )
}
