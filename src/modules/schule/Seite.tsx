// Bereich "Schule": Gesamtschnitt, Fächer mit Noten, Klausuren, Hausaufgaben, CSV-Import.
import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, FileUp } from 'lucide-react'
import { db, type Note } from '../../core/db'
import { heute, tagVon } from '../../core/datum'
import { kurzDatum, mittel, relativ } from '../../core/format'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import { Haken, Leer, LoeschKnopf, PlusKnopf } from '../../core/ui/Formular'
import { FachFormular, NoteFormular, TerminFormular } from './Formulare'
import { formatNote, notenText, punkteFarbe, punkteZuNote, schnittPunkte } from './noten'
import { importiereNotenCsv } from './csv'

const FARBE = '#ff9f0a'

/** Erkennt Klausuren in importierten Kalenderterminen. */
const istKlausurTermin = (titel: string) => /klausur|test|pr(ü|ue)fung|schulaufgabe|arbeit\b|abi/i.test(titel)

export default function SchuleSeite() {
  const faecher = useLiveQuery(() => db.faecher.toArray(), []) ?? []
  const noten = useLiveQuery(() => db.noten.orderBy('datum').reverse().toArray(), []) ?? []
  const klausuren = useLiveQuery(() => db.klausuren.where('datum').aboveOrEqual(heute()).sortBy('datum'), []) ?? []
  const kalenderKlausuren = useLiveQuery(() => db.termine.where('start').aboveOrEqual(new Date().toISOString()).toArray(), []) ?? []
  const hausaufgaben = useLiveQuery(() => db.hausaufgaben.orderBy('faellig').toArray(), []) ?? []

  // Welches Formular ist gerade offen?
  const [formular, setFormular] = useState<null | 'fach' | 'note' | 'klausur' | 'hausaufgabe'>(null)
  const [noteFuerFach, setNoteFuerFach] = useState<string | undefined>()
  const [aufgeklappt, setAufgeklappt] = useState<string | null>(null)
  const [csvMeldung, setCsvMeldung] = useState('')
  const dateiFeld = useRef<HTMLInputElement>(null)

  // Schnitt pro Fach, Gesamtschnitt = Mittel aller Fachschnitte (jedes Fach zählt gleich)
  const notenVon = (fachId: string) => noten.filter((n) => n.fachId === fachId)
  const fachSchnitte = faecher.map((f) => ({ fach: f, schnitt: schnittPunkte(notenVon(f.id)) }))
  const gesamt = mittel(fachSchnitte.map((f) => f.schnitt).filter((s): s is number => s !== null))
  const fachName = (id?: string) => faecher.find((f) => f.id === id)?.name

  // Anstehende Klausuren: eigene Einträge + Kalendertermine, die nach Klausur aussehen
  const anstehend = [
    ...klausuren.map((k) => ({ id: k.id, titel: `${fachName(k.fachId) ? fachName(k.fachId) + ': ' : ''}${k.titel}`, datum: k.datum, eigen: true })),
    ...kalenderKlausuren.filter((t) => istKlausurTermin(t.titel)).map((t) => ({ id: t.id, titel: t.titel, datum: tagVon(t.start), eigen: false })),
  ].sort((a, b) => a.datum.localeCompare(b.datum))

  const offeneHA = hausaufgaben.filter((h) => !h.erledigt || h.faellig >= heute())

  async function csvGewaehlt(datei: File | undefined) {
    if (!datei) return
    try {
      const e = await importiereNotenCsv(await datei.text())
      setCsvMeldung(
        `${e.neu} Noten importiert` +
          (e.doppelt ? `, ${e.doppelt} schon vorhanden` : '') +
          (e.uebersprungen ? `, ${e.uebersprungen} Zeilen übersprungen` : '') +
          (e.neueFaecher.length ? `. Neue Fächer: ${e.neueFaecher.join(', ')}` : ''),
      )
    } catch (err) {
      setCsvMeldung('Fehler: ' + (err as Error).message)
    }
    if (dateiFeld.current) dateiFeld.current.value = '' // damit man dieselbe Datei nochmal wählen kann
  }

  return (
    <Seite titel="Schule" farbe={FARBE}>
      {/* Gesamtschnitt */}
      <Karte titel="Gesamtschnitt" akzent={FARBE}>
        <div className="flex items-center gap-5">
          <Ring fortschritt={(gesamt ?? 0) / 15} farbe={FARBE} groesse={112} dicke={14}>
            <div>
              <p className="text-[26px] font-bold leading-none">{gesamt === null ? '–' : formatNote(gesamt)}</p>
              <p className="mt-0.5 text-[11px] text-grau">Punkte</p>
            </div>
          </Ring>
          <div>
            <p className="text-[13px] text-grau">entspricht Note</p>
            <p className="text-[40px] font-bold leading-tight">{gesamt === null ? '–' : formatNote(punkteZuNote(gesamt))}</p>
            <p className="text-[13px] text-grau">
              {noten.length} Noten in {faecher.length} Fächern
            </p>
          </div>
        </div>
      </Karte>

      {/* Fächer */}
      <Karte titel="Fächer" rechts={<PlusKnopf farbe={FARBE} onClick={() => setFormular('fach')} label="Fach" />}>
        {faecher.length === 0 ? (
          <Leer>Leg zuerst deine Fächer an oder importiere eine CSV-Datei.</Leer>
        ) : (
          <ul>
            {fachSchnitte.map(({ fach, schnitt }, i) => {
              const offen = aufgeklappt === fach.id
              const liste = notenVon(fach.id)
              return (
                <li key={fach.id} className={i > 0 ? 'border-t border-linie' : ''}>
                  {/* Zeile antippen = Noten des Fachs auf-/zuklappen */}
                  <button onClick={() => setAufgeklappt(offen ? null : fach.id)} className="tippbar flex min-h-14 w-full items-center gap-3 text-left">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: fach.farbe }} />
                    <span className="flex-1 text-[17px]">{fach.name}</span>
                    {schnitt !== null && (
                      <span className="text-right">
                        <span className="block text-[17px] font-semibold" style={{ color: punkteFarbe(schnitt) }}>
                          {formatNote(schnitt)} P.
                        </span>
                        <span className="block text-[12px] text-grau">Note {formatNote(punkteZuNote(schnitt))}</span>
                      </span>
                    )}
                    <ChevronDown size={18} className={`text-grau transition-transform ${offen ? 'rotate-180' : ''}`} />
                  </button>
                  {offen && (
                    <div className="pb-3 pl-6">
                      {liste.map((n: Note) => (
                        <div key={n.id} className="flex items-center gap-3 py-1">
                          <span className="w-10 text-[17px] font-bold" style={{ color: punkteFarbe(n.punkte) }}>
                            {n.punkte}
                          </span>
                          <span className="flex-1 text-[14px]">
                            {n.art} <span className="text-grau">· ×{String(n.gewicht).replace('.', ',')} · {kurzDatum(n.datum)} · {notenText(n.punkte)}</span>
                          </span>
                          <LoeschKnopf frage="Note löschen?" onLoeschen={() => db.noten.delete(n.id)} />
                        </div>
                      ))}
                      <div className="mt-1 flex gap-2">
                        <button
                          onClick={() => {
                            setNoteFuerFach(fach.id)
                            setFormular('note')
                          }}
                          className="tippbar min-h-11 flex-1 rounded-xl bg-karte2 text-[15px] font-semibold"
                          style={{ color: FARBE }}
                        >
                          + Note
                        </button>
                        <button
                          onClick={() =>
                            confirm(`Fach „${fach.name}“ mit allen Noten löschen?`) &&
                            db.transaction('rw', db.faecher, db.noten, async () => {
                              await db.noten.where('fachId').equals(fach.id).delete()
                              await db.faecher.delete(fach.id)
                            })
                          }
                          className="tippbar min-h-11 rounded-xl bg-karte2 px-4 text-[15px] text-[#ff453a]"
                        >
                          Fach löschen
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Karte>

      {faecher.length > 0 && (
        <button
          onClick={() => {
            setNoteFuerFach(undefined)
            setFormular('note')
          }}
          className="tippbar h-14 rounded-2xl text-[17px] font-semibold text-black"
          style={{ background: FARBE }}
        >
          + Note eintragen
        </button>
      )}

      {/* Anstehende Klausuren */}
      <Karte titel="Anstehende Klausuren" akzent="#ff453a" rechts={<PlusKnopf farbe="#ff453a" onClick={() => setFormular('klausur')} />}>
        {anstehend.length === 0 ? (
          <Leer>Keine Klausuren geplant. Kalendertermine mit „Klausur“ oder „Test“ im Titel erscheinen automatisch.</Leer>
        ) : (
          <ul className="space-y-1">
            {anstehend.map((k) => (
              <li key={k.id} className="flex min-h-11 items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px]">{k.titel}</p>
                  <p className="text-[13px] text-grau">
                    {kurzDatum(k.datum)} · {relativ(k.datum)}
                    {!k.eigen && ' · aus Kalender'}
                  </p>
                </div>
                {k.eigen && <LoeschKnopf frage="Klausur löschen?" onLoeschen={() => db.klausuren.delete(k.id)} />}
              </li>
            ))}
          </ul>
        )}
      </Karte>

      {/* Hausaufgaben */}
      <Karte titel="Hausaufgaben" akzent="#0a84ff" rechts={<PlusKnopf farbe="#0a84ff" onClick={() => setFormular('hausaufgabe')} />}>
        {offeneHA.length === 0 ? (
          <Leer>Keine Hausaufgaben. 🎉</Leer>
        ) : (
          <ul>
            {offeneHA.map((h) => (
              <li key={h.id} className="flex min-h-12 items-center gap-1">
                <Haken an={h.erledigt} farbe="#0a84ff" onClick={() => db.hausaufgaben.update(h.id, { erledigt: !h.erledigt })} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[16px] ${h.erledigt ? 'text-grau line-through' : ''}`}>{h.titel}</p>
                  <p className={`text-[13px] ${h.faellig < heute() && !h.erledigt ? 'text-[#ff453a]' : 'text-grau'}`}>
                    {fachName(h.fachId) ? `${fachName(h.fachId)} · ` : ''}fällig {relativ(h.faellig)}
                  </p>
                </div>
                <LoeschKnopf frage="Hausaufgabe löschen?" onLoeschen={() => db.hausaufgaben.delete(h.id)} />
              </li>
            ))}
          </ul>
        )}
      </Karte>

      {/* CSV-Import */}
      <Karte titel="Noten importieren (CSV)">
        <p className="mb-3 text-[13px] leading-snug text-grau">
          Spalten: Fach, Punkte (oder Note 1–6), optional Art, Gewicht, Datum. Bereits importierte Noten werden erkannt und nicht doppelt angelegt.
        </p>
        <input ref={dateiFeld} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => csvGewaehlt(e.target.files?.[0])} />
        <button onClick={() => dateiFeld.current?.click()} className="tippbar flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-karte2 text-[15px] font-semibold">
          <FileUp size={18} /> CSV-Datei wählen
        </button>
        {csvMeldung && <p className="mt-3 text-[14px]">{csvMeldung}</p>}
      </Karte>

      <FachFormular offen={formular === 'fach'} onZu={() => setFormular(null)} />
      <NoteFormular offen={formular === 'note'} onZu={() => setFormular(null)} faecher={faecher} startFach={noteFuerFach} />
      <TerminFormular offen={formular === 'klausur'} onZu={() => setFormular(null)} faecher={faecher} typ="klausur" />
      <TerminFormular offen={formular === 'hausaufgabe'} onZu={() => setFormular(null)} faecher={faecher} typ="hausaufgabe" />
    </Seite>
  )
}
