// Eigene Seite für ein Projekt (Adresse #/ziele/projekt/<id>, dadurch funktioniert "Zurück").
// Oben: Zurück, Bearbeiten, Name, großer Fortschrittsring, Status, Deadline, Ziel.
// Darunter aufklappbare Abschnitte: Aufgaben (mit Unteraufgaben), Termine, Erinnerungen, Notizen.
// Erledigtes ist eingeklappt ("3 erledigt ›"), neue Aufgaben kommen unten direkt in die Liste (wie in Apple Erinnerungen).
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flag, Plus } from 'lucide-react'
import { db, type ProjektAufgabe } from '../../core/db'
import { heute, tagVon, uhrzeit } from '../../core/datum'
import { kurzDatum, relativ } from '../../core/format'
import { schalteErinnerung } from '../../core/apple'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import Aufklapper from '../../core/ui/Aufklapper'
import { ZurueckKnopf } from '../../core/ui/Dock'
import { Haken, Leer, LoeschKnopf, SchnellEingabe } from '../../core/ui/Formular'
import { ProjektFormular } from './Formulare'
import { STATUS_FARBE, aendereProjekt, farbeVon, fortschritt, loescheAufgabe, nachErstellt, neueAufgabe, schalteAufgabe } from './projekte'

/** Eine Aufgabe mit ihren Unteraufgaben. Erledigte Unteraufgaben sind als "n erledigt ›" eingeklappt. */
function AufgabeZeile({ a, unter, farbe }: { a: ProjektAufgabe; unter: ProjektAufgabe[]; farbe: string }) {
  const [neueUnter, setNeueUnter] = useState(false)
  const offen = unter.filter((u) => !u.erledigt)
  const erledigt = unter.filter((u) => u.erledigt)
  return (
    <li className="border-b border-linie last:border-b-0">
      <div className="flex items-center">
        <Haken an={a.erledigt} farbe={farbe} onClick={() => schalteAufgabe(a)} />
        <span className={`min-w-0 flex-1 text-[16px] ${a.erledigt ? 'text-grau line-through' : ''}`}>{a.titel}</span>
        {!a.erledigt && (
          <button onClick={() => setNeueUnter(!neueUnter)} className="tippbar flex h-9 w-9 items-center justify-center text-grau" aria-label={`Unteraufgabe zu „${a.titel}“`}>
            <Plus size={18} />
          </button>
        )}
        <LoeschKnopf frage={unter.length ? 'Aufgabe samt Unteraufgaben löschen?' : 'Aufgabe löschen?'} onLoeschen={() => loescheAufgabe(a)} />
      </div>

      {/* Unteraufgaben, eingerückt */}
      {(unter.length > 0 || neueUnter) && (
        <div className="mb-1 ml-9">
          {offen.map((u) => (
            <div key={u.id} className="flex items-center">
              <Haken an={false} farbe={farbe} onClick={() => schalteAufgabe(u)} />
              <span className="min-w-0 flex-1 text-[15px]">{u.titel}</span>
              <LoeschKnopf frage="Unteraufgabe löschen?" onLoeschen={() => loescheAufgabe(u)} />
            </div>
          ))}
          {erledigt.length > 0 && (
            <Aufklapper titel={`${erledigt.length} erledigt`} klein>
              {erledigt.map((u) => (
                <div key={u.id} className="flex items-center">
                  <Haken an farbe={farbe} onClick={() => schalteAufgabe(u)} />
                  <span className="min-w-0 flex-1 text-[15px] text-grau line-through">{u.titel}</span>
                  <LoeschKnopf frage="Unteraufgabe löschen?" onLoeschen={() => loescheAufgabe(u)} />
                </div>
              ))}
            </Aufklapper>
          )}
          {neueUnter && <SchnellEingabe platzhalter="Unteraufgabe …" farbe={farbe} onNeu={(titel) => neueAufgabe(a.projektId, titel, a.id)} />}
        </div>
      )}
    </li>
  )
}

/** Notizfeld: speichert beim Tippen (kurz verzögert) und beim Verlassen des Feldes. */
function Notizen({ projektId, start }: { projektId: string; start: string }) {
  const [text, setText] = useState(start)
  const timer = useRef<number | undefined>(undefined)
  const speichern = (t: string) => {
    window.clearTimeout(timer.current)
    void aendereProjekt(projektId, { notiz: t.trim() ? t : undefined })
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <textarea
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        window.clearTimeout(timer.current)
        const neu = e.target.value
        timer.current = window.setTimeout(() => speichern(neu), 600)
      }}
      onBlur={() => speichern(text)}
      placeholder="Notizen zum Projekt …"
      rows={4}
      className="mb-2 w-full resize-y rounded-2xl bg-karte2 p-3 text-[16px] leading-snug outline-none placeholder:text-grau"
    />
  )
}

export default function ProjektSeite() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const projekt = useLiveQuery(() => db.projekte.get(id), [id])
  const aufgaben = useLiveQuery(() => db.projektAufgaben.where('projektId').equals(id).toArray(), [id]) ?? []
  const erinnerungen = useLiveQuery(() => db.aufgaben.filter((a) => a.projektId === id).toArray(), [id]) ?? []
  const termine = useLiveQuery(() => db.termine.filter((t) => t.projektId === id).sortBy('start'), [id]) ?? []
  const ziel = useLiveQuery(async () => (projekt?.zielId ? db.ziele.get(projekt.zielId) : undefined), [projekt?.zielId])
  const [bearbeiten, setBearbeiten] = useState(false)

  // Lädt noch oder gibt es nicht (mehr): nur der Zurück-Knopf
  if (projekt === undefined) return <div className="px-4 pt-3"><ZurueckKnopf ersatz="/ziele" label="Ziele" /></div>
  const farbe = farbeVon(projekt)
  const f = fortschritt(projekt, aufgaben, erinnerungen)
  const hauptAufgaben = aufgaben.filter((a) => !a.elternId).sort(nachErstellt)
  const unterVon = (a: ProjektAufgabe) => aufgaben.filter((u) => u.elternId === a.id).sort(nachErstellt)
  const offen = hauptAufgaben.filter((a) => !a.erledigt)
  const erledigt = hauptAufgaben.filter((a) => a.erledigt)
  const kommendeTermine = termine.filter((t) => tagVon(t.start) >= heute())
  const ueberfaellig = projekt.deadline && projekt.deadline < heute() && projekt.status !== 'Fertig'

  return (
    <div className="px-4 pb-8 pt-3">
      {/* Kopfzeile: Zurück und Bearbeiten */}
      <div className="flex items-center justify-between">
        <ZurueckKnopf ersatz="/ziele" label="Ziele" farbe={farbe} />
        <button onClick={() => setBearbeiten(true)} className="tippbar mb-1 min-h-10 text-[17px]" style={{ color: farbe }}>
          Bearbeiten
        </button>
      </div>

      {/* Name, Ring, Status, Deadline, Ziel */}
      <div className="mb-4 flex items-center gap-4 px-1">
        <Ring fortschritt={f.anteil} farbe={farbe} groesse={104} dicke={13}>
          <div>
            <p className="text-[22px] font-bold leading-none">{Math.round(f.anteil * 100)} %</p>
            <p className="mt-0.5 text-[11px] text-grau">
              {f.erledigt}/{f.alle}
            </p>
          </div>
        </Ring>
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-bold leading-tight" style={{ color: farbe }}>
            {projekt.titel}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="rounded-full px-2.5 py-0.5 font-semibold text-black" style={{ background: STATUS_FARBE[projekt.status] }}>
              {projekt.status}
            </span>
            {projekt.deadline && <span className={ueberfaellig ? 'text-[#ff453a]' : 'text-grau'}>Deadline {relativ(projekt.deadline)}</span>}
          </div>
          {ziel && (
            <p className="mt-1 truncate text-[13px] text-grau">
              {ziel.emoji} {ziel.titel}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Karte>
          <Aufklapper titel="Aufgaben" anzahl={offen.length} standardOffen farbe={farbe}>
            <ul>
              {offen.map((a) => (
                <AufgabeZeile key={a.id} a={a} unter={unterVon(a)} farbe={farbe} />
              ))}
            </ul>
            {/* Neue Aufgabe direkt unten in der Liste */}
            <SchnellEingabe platzhalter="Neue Aufgabe …" farbe={farbe} onNeu={(titel) => neueAufgabe(projekt.id, titel)} />
            {erledigt.length > 0 && (
              <Aufklapper titel={`${erledigt.length} erledigt`} klein>
                <ul>
                  {erledigt.map((a) => (
                    <AufgabeZeile key={a.id} a={a} unter={unterVon(a)} farbe={farbe} />
                  ))}
                </ul>
              </Aufklapper>
            )}
          </Aufklapper>
        </Karte>

        <Karte>
          <Aufklapper titel="Termine" anzahl={kommendeTermine.length} farbe={farbe}>
            {kommendeTermine.length === 0 ? (
              <Leer>Keine kommenden Termine. Zuordnen kannst du sie auf der Ziele-Seite unter „Termine zuordnen“.</Leer>
            ) : (
              <ul className="pb-1">
                {kommendeTermine.map((t) => (
                  <li key={t.id} className="py-1.5 text-[15px]">
                    {t.titel}
                    <span className="block text-[12px] text-grau">
                      {kurzDatum(tagVon(t.start))}
                      {t.ganztaegig ? ', ganztägig' : `, ${uhrzeit(t.start)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Aufklapper>
        </Karte>

        <Karte>
          <Aufklapper titel="Erinnerungen" anzahl={erinnerungen.filter((a) => !a.erledigt).length} farbe={farbe}>
            {erinnerungen.length === 0 ? (
              <Leer>Keine Erinnerungen zugeordnet. Das geht auf der Ziele-Seite unter „Erinnerungen zuordnen“.</Leer>
            ) : (
              erinnerungen.map((a) => (
                <div key={a.id} className="flex items-center">
                  {/* Abhaken wird beim nächsten Abgleich an Apple geschickt */}
                  <Haken an={a.erledigt} farbe={farbe} onClick={() => schalteErinnerung(a)} />
                  <span className={`min-w-0 flex-1 truncate text-[15px] ${a.erledigt ? 'text-grau line-through' : ''}`}>{a.titel}</span>
                  {a.markiert && <Flag size={14} color="#ff9f0a" fill="#ff9f0a" className="mr-2 shrink-0" />}
                  <span className="shrink-0 text-[12px] text-grau">{a.faellig ? relativ(a.faellig) : (a.liste ?? '')}</span>
                </div>
              ))
            )}
          </Aufklapper>
        </Karte>

        <Karte>
          <Aufklapper titel="Notizen" standardOffen farbe={farbe}>
            <Notizen key={projekt.id} projektId={projekt.id} start={projekt.notiz ?? ''} />
          </Aufklapper>
        </Karte>
      </div>

      <ProjektFormular offen={bearbeiten} onZu={() => setBearbeiten(false)} projekt={projekt} onGeloescht={() => navigate('/ziele', { replace: true })} />
    </div>
  )
}
