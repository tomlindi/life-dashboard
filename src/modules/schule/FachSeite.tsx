// Eigene Seite pro Fach (Adresse #/schule/fach/<id>, dadurch funktioniert "Zurück").
// Oben: Fachname in Fachfarbe und Schnitt im aktuellen Halbjahr.
// Darunter aufklappbare Abschnitte: Notizen (freies Textfeld), Klausuren, Hausaufgaben, Noten.
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import { db, type Klausur, type Termin } from '../../core/db'
import { heute, tagVon } from '../../core/datum'
import { kurzDatum, relativ } from '../../core/format'
import { useEinstellung } from '../../core/einstellungen'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import Aufklapper from '../../core/ui/Aufklapper'
import { ZurueckKnopf } from '../../core/ui/Dock'
import { Haken, Leer } from '../../core/ui/Formular'
import TerminSheet from '../kalender/TerminSheet'
import { KlausurFormular } from './Formulare'
import { istKlausurTermin, passtZuFach } from './klausuren'
import { berechneHalbjahr, formatGenau, formatNote, notenText, punkteFarbe, punkteZuNote } from './noten'

/** Notizfeld: speichert beim Tippen (kurz verzögert) und beim Verlassen des Feldes. */
function Notizen({ fachId, start }: { fachId: string; start: string }) {
  const [text, setText] = useState(start)
  const timer = useRef<number | undefined>(undefined)
  const speichern = (t: string) => {
    window.clearTimeout(timer.current)
    void db.faecher.update(fachId, { notiz: t.trim() ? t : undefined })
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
      placeholder="Infos zum Fach: Lehrkraft, Bewertung, Lernstoff, Links …"
      rows={6}
      className="mb-2 w-full resize-y rounded-2xl bg-karte2 p-3 text-[16px] leading-snug outline-none placeholder:text-grau"
    />
  )
}

export default function FachSeite() {
  const { id = '' } = useParams()
  const fach = useLiveQuery(() => db.faecher.get(id), [id])
  const faecher = useLiveQuery(() => db.faecher.toArray(), []) ?? []
  const noten = useLiveQuery(() => db.noten.where('fachId').equals(id).toArray(), [id]) ?? []
  const klausuren = useLiveQuery(() => db.klausuren.where('datum').aboveOrEqual(heute()).filter((k) => k.fachId === id).sortBy('datum'), [id]) ?? []
  const kalender = useLiveQuery(() => db.termine.where('start').aboveOrEqual(new Date().toISOString()).sortBy('start'), []) ?? []
  const hausaufgaben = useLiveQuery(() => db.hausaufgaben.filter((h) => h.fachId === id).sortBy('faellig'), [id]) ?? []
  const [aktuellesHJ] = useEinstellung<number>('aktuellesHalbjahr', 1)
  const [neueKlausur, setNeueKlausur] = useState(false)
  const [bearbeite, setBearbeite] = useState<{ klausur?: Klausur; termin?: Termin } | null>(null)

  // Lädt noch oder gibt es nicht (mehr): nur der Zurück-Knopf
  if (fach === undefined) {
    return (
      <div className="px-4 pt-3">
        <ZurueckKnopf ersatz="/schule" label="Schule" />
      </div>
    )
  }

  // Schnitt im aktuellen Halbjahr (gleiche Rechnung wie auf der Schule-Seite, inkl. Zeugnisnote)
  const [ergebnis] = berechneHalbjahr([fach], noten, aktuellesHJ, aktuellesHJ).ergebnisse
  const { gerundet, schnitt, istZeugnis } = ergebnis
  const notenHJ = [...ergebnis.noten].sort((a, b) => b.datum.localeCompare(a.datum))

  // Kommende Klausuren: eigene mit diesem Fach + Kalendertermine, die nach Klausur in diesem Fach aussehen
  const kalenderKlausuren = kalender.filter((t) => istKlausurTermin(t.titel) && passtZuFach(fach, t.titel))
  const alleKlausuren: { id: string; titel: string; datum: string; zusatz: string; klausur?: Klausur; termin?: Termin }[] = [
    ...klausuren.map((k) => ({ id: k.id, titel: k.titel, datum: k.datum, zusatz: [k.uhrzeit, k.raum && `Raum ${k.raum}`].filter(Boolean).join(' · '), klausur: k })),
    ...kalenderKlausuren.map((t) => ({ id: t.id, titel: t.titel, datum: tagVon(t.start), zusatz: 'aus Kalender', termin: t })),
  ].sort((a, b) => a.datum.localeCompare(b.datum))
  const offeneHA = hausaufgaben.filter((h) => !h.erledigt)

  return (
    <div className="px-4 pb-8 pt-3">
      <ZurueckKnopf ersatz="/schule" label="Schule" farbe={fach.farbe} />

      {/* Kopf: Name und Schnitt */}
      <div className="mb-4 flex items-center gap-4 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-grau">{aktuellesHJ}. Halbjahr</p>
          <h1 className="text-[32px] font-bold leading-tight" style={{ color: fach.farbe }}>
            {fach.name}
            {fach.doppelt && <span className="ml-2 text-[15px] font-medium text-grau">2x</span>}
          </h1>
          {gerundet !== null && (
            <p className="text-[14px] text-grau">
              {istZeugnis ? 'Zeugnis · ' : schnitt !== null ? `Ø ${formatGenau(schnitt)} · ` : ''}Note {formatNote(punkteZuNote(istZeugnis || schnitt === null ? gerundet : schnitt))}
            </p>
          )}
        </div>
        <Ring fortschritt={(gerundet ?? 0) / 15} farbe={gerundet !== null ? punkteFarbe(gerundet) : '#8e8e93'} groesse={96} dicke={11}>
          <div>
            <p className="text-[24px] font-bold leading-none">{gerundet ?? '–'}</p>
            <p className="mt-0.5 text-[11px] text-grau">Punkte</p>
          </div>
        </Ring>
      </div>

      <div className="flex flex-col gap-3">
        <Karte>
          <Aufklapper titel="Notizen" standardOffen farbe={fach.farbe}>
            <Notizen key={fach.id} fachId={fach.id} start={fach.notiz ?? ''} />
          </Aufklapper>
        </Karte>

        <Karte>
          <Aufklapper titel="Klausuren" anzahl={alleKlausuren.length} standardOffen farbe={fach.farbe}>
            {alleKlausuren.length === 0 && <Leer>Keine kommenden Klausuren.</Leer>}
            <ul>
              {alleKlausuren.map((k) => (
                <li key={k.id}>
                  {/* Antippen = bearbeiten */}
                  <button onClick={() => setBearbeite({ klausur: k.klausur, termin: k.termin })} className="tippbar flex min-h-12 w-full items-center gap-3 py-1 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px]">{k.titel}</span>
                      <span className="block text-[13px] text-grau">
                        {kurzDatum(k.datum)} · {relativ(k.datum)}
                        {k.zusatz && ` · ${k.zusatz}`}
                      </span>
                      {k.klausur?.stoff && <span className="block whitespace-pre-line text-[12px] text-grau">📚 {k.klausur.stoff}</span>}
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-grau" />
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={() => setNeueKlausur(true)} className="tippbar mb-1 mt-1 min-h-10 text-[15px] font-semibold" style={{ color: fach.farbe }}>
              + Klausur
            </button>
          </Aufklapper>
        </Karte>

        <Karte>
          <Aufklapper titel="Hausaufgaben" anzahl={offeneHA.length} farbe={fach.farbe}>
            {offeneHA.length === 0 ? (
              <Leer>Keine offenen Hausaufgaben. 🎉</Leer>
            ) : (
              offeneHA.map((h) => (
                <div key={h.id} className="flex items-center">
                  <Haken an={h.erledigt} farbe={fach.farbe} onClick={() => db.hausaufgaben.update(h.id, { erledigt: !h.erledigt })} />
                  <span className="min-w-0 flex-1 text-[15px]">{h.titel}</span>
                  <span className={`shrink-0 text-[12px] ${h.faellig < heute() ? 'text-[#ff453a]' : 'text-grau'}`}>{relativ(h.faellig)}</span>
                </div>
              ))
            )}
          </Aufklapper>
        </Karte>

        <Karte>
          <Aufklapper titel="Noten" anzahl={notenHJ.length} farbe={fach.farbe}>
            {notenHJ.length === 0 ? (
              <Leer>Noch keine Noten im {aktuellesHJ}. Halbjahr. Eintragen kannst du sie auf der Schule-Seite.</Leer>
            ) : (
              notenHJ.map((n) => (
                <div key={n.id} className="flex items-center gap-3 py-1">
                  <span className="w-11 text-[17px] font-bold" style={{ color: punkteFarbe(n.punkte) }}>
                    {String(n.punkte).replace('.', ',')}
                  </span>
                  <span className="flex-1 text-[14px]">
                    {n.art}
                    <span className="text-grau">
                      {' '}
                      · {kurzDatum(n.datum)} · {notenText(n.punkte)}
                    </span>
                  </span>
                </div>
              ))
            )}
          </Aufklapper>
        </Karte>
      </div>

      <KlausurFormular offen={neueKlausur} onZu={() => setNeueKlausur(false)} faecher={faecher} fachVorgabe={fach.id} />
      <KlausurFormular offen={!!bearbeite?.klausur} onZu={() => setBearbeite(null)} faecher={faecher} klausur={bearbeite?.klausur} />
      <TerminSheet offen={!!bearbeite?.termin} onZu={() => setBearbeite(null)} termin={bearbeite?.termin} tag={bearbeite?.termin ? tagVon(bearbeite.termin.start) : heute()} />
    </div>
  )
}
