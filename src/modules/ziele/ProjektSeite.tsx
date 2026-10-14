// Eigene Seite für ein Projekt (Adresse #/ziele/projekt/<id>, dadurch funktioniert "Zurück").
// Oben: Zurück, Bearbeiten, Name, großer Fortschrittsring, Status, Deadline, Ziel.
// Darunter aufklappbare Abschnitte: Aufgaben (mit Unteraufgaben), Termine, Erinnerungen, Notizen.
// Aufgaben im Stil von Apple Erinnerungen (AufgabenListe.tsx): Erledigtes eingeklappt, neue Aufgaben unten in der Liste.
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db'
import { heute, tagVon, uhrzeit } from '../../core/datum'
import { kurzDatum, relativ } from '../../core/format'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import Aufklapper from '../../core/ui/Aufklapper'
import { ZurueckKnopf } from '../../core/ui/Dock'
import { Leer } from '../../core/ui/Formular'
import { ProjektFormular } from './Formulare'
import { STATUS_FARBE, aendereProjekt, farbeVon, fortschritt } from './projekte'
import AufgabenListe, { ErinnerungEintrag } from './AufgabenListe'
import { letzterTag } from '../kalender/mehrtaegig'
import { lesbar } from '../../core/darstellung'

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
  const offeneAufgaben = aufgaben.filter((a) => !a.elternId && !a.erledigt).length
  // Kommende und gerade laufende (auch mehrtägige, die schon begonnen haben)
  const kommendeTermine = termine.filter((t) => letzterTag(t) >= heute())
  const ueberfaellig = projekt.deadline && projekt.deadline < heute() && projekt.status !== 'Fertig'

  return (
    <div className="px-4 pb-8 pt-3">
      {/* Kopfzeile: Zurück und Bearbeiten */}
      <div className="flex items-center justify-between">
        <ZurueckKnopf ersatz="/ziele" label="Ziele" farbe={farbe} />
        <button onClick={() => setBearbeiten(true)} className="tippbar mb-1 min-h-10 text-[17px]" style={{ color: lesbar(farbe) }}>
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
          <h1 className="text-[28px] font-bold leading-tight" style={{ color: lesbar(farbe) }}>
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
          <Aufklapper titel="Aufgaben" anzahl={offeneAufgaben} standardOffen farbe={farbe}>
            {/* Im Stil von Apple Erinnerungen, siehe AufgabenListe.tsx */}
            <AufgabenListe projektId={projekt.id} aufgaben={aufgaben} farbe={farbe} />
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
              <div className="-ml-2">
                {erinnerungen.map((a, i) => (
                  <ErinnerungEintrag key={a.id} a={a} farbe={farbe} linie={i < erinnerungen.length - 1} />
                ))}
              </div>
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
