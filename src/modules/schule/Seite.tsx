// Bereich "Schule": Halbjahr wählen, Gesamtschnitt, Fächer mit Noten und Gewichtung (wie Notan),
// Halbjahres-Übersicht, Klausuren, Hausaufgaben, CSV-Import.
import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, FileUp, Flag } from 'lucide-react'
import { db, type Fach, type NotenArt } from '../../core/db'
import { heute, tagVon } from '../../core/datum'
import { kurzDatum, relativ } from '../../core/format'
import { useEinstellung } from '../../core/einstellungen'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import { Haken, Leer, LoeschKnopf, PlusKnopf } from '../../core/ui/Formular'
import { FachFormular, NoteFormular, TerminFormular } from './Formulare'
import { NOTEN_ARTEN, berechneHalbjahr, formatGenau, formatNote, notenText, punkteFarbe, punkteZuNote } from './noten'
import { importiereNotenCsv } from './csv'
import { abiPrognose } from './abi'
import AbiPrognose from './AbiPrognose'
import { schalteErinnerung } from '../../core/apple'
import { istSchulListe } from '../../core/aufgaben'

const FARBE = '#ff9f0a'
const HALBJAHRE = [1, 2, 3, 4]
const KUERZEL: Record<NotenArt, string> = { Klausur: 'SC', Mündlich: 'MÜ', Praktisch: 'PR', Prüfung: 'Prüf.', Test: 'Test', Sonstiges: 'Sonst.' }

/** Erkennt Klausuren in importierten Kalenderterminen. */
const istKlausurTermin = (titel: string) => /klausur|test|pr(ü|ue)fung|schulaufgabe|arbeit\b|abi/i.test(titel)

/** Einstellungen eines Fachs: doppelt zählen und Anteile der Notenarten. */
function FachEinstellungen({ fach, hj }: { fach: Fach; hj: number }) {
  const summe = Object.values(fach.anteile ?? {}).reduce((s, x) => s + (x ?? 0), 0)
  return (
    <div className="mt-2 rounded-xl bg-black/30 p-3">
      {/* Zeugnisnote: leer lassen = gerundeter Schnitt zählt */}
      <label className="flex min-h-10 items-center justify-between gap-3">
        <span className="text-[14px]">Zeugnisnote {hj}. HJ (falls abweichend)</span>
        <input
          key={`${fach.id}-${hj}`}
          inputMode="numeric"
          placeholder="–"
          defaultValue={fach.zeugnis?.[String(hj)] ?? ''}
          onBlur={(e) => {
            const zeugnis = { ...fach.zeugnis }
            const wert = parseInt(e.target.value, 10)
            if (wert >= 0 && wert <= 15) zeugnis[String(hj)] = wert
            else delete zeugnis[String(hj)]
            db.faecher.update(fach.id, { zeugnis })
          }}
          className="h-10 w-16 rounded-lg bg-karte2 text-center outline-none placeholder:text-grau"
        />
      </label>
      <button onClick={() => db.faecher.update(fach.id, { doppelt: !fach.doppelt })} className="flex min-h-10 w-full items-center justify-between">
        <span className="text-[14px]">Zählt doppelt (wie „2x“ in Notan)</span>
        <span className="relative h-[31px] w-[51px] rounded-full transition-colors" style={{ background: fach.doppelt ? '#30d158' : '#39393d' }}>
          <span className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white transition-all" style={{ left: fach.doppelt ? 22 : 2 }} />
        </span>
      </button>
      {fach.anteile ? (
        <>
          <p className="mb-2 mt-2 text-[13px] text-grau">
            Anteile in % {summe !== 100 && <span className="text-[#ffd60a]">(Summe {summe} %, wird automatisch umgerechnet)</span>}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {NOTEN_ARTEN.map((art) => (
              <label key={art} className="text-center">
                <span className="block text-[11px] text-grau">{KUERZEL[art]}</span>
                <input
                  inputMode="numeric"
                  defaultValue={fach.anteile?.[art] ?? 0}
                  onBlur={(e) => {
                    const wert = Math.max(0, Math.min(100, Number(e.target.value.replace(',', '.')) || 0))
                    db.faecher.update(fach.id, { anteile: { ...fach.anteile, [art]: wert } })
                  }}
                  className="h-10 w-full rounded-lg bg-karte2 text-center outline-none"
                />
              </label>
            ))}
          </div>
          <button onClick={() => db.faecher.update(fach.id, { anteile: undefined })} className="tippbar mt-2 min-h-9 text-[13px] text-grau">
            Anteile entfernen (jede Note nach Gewicht)
          </button>
        </>
      ) : (
        <button
          onClick={() => db.faecher.update(fach.id, { anteile: { Klausur: 50, Mündlich: 50 } })}
          className="tippbar mt-2 min-h-10 text-[14px]"
          style={{ color: FARBE }}
        >
          + Anteile schriftlich/mündlich festlegen
        </button>
      )}
    </div>
  )
}

export default function SchuleSeite() {
  // Fächer sortiert: erst nach "sortierung", dann alphabetisch
  const faecher = (useLiveQuery(() => db.faecher.toArray(), []) ?? []).sort(
    (a, b) => (a.sortierung ?? 999) - (b.sortierung ?? 999) || a.name.localeCompare(b.name, 'de'),
  )
  const noten = useLiveQuery(() => db.noten.orderBy('datum').reverse().toArray(), []) ?? []
  const klausuren = useLiveQuery(() => db.klausuren.where('datum').aboveOrEqual(heute()).sortBy('datum'), []) ?? []
  const kalenderKlausuren = useLiveQuery(() => db.termine.where('start').aboveOrEqual(new Date().toISOString()).toArray(), []) ?? []
  const hausaufgaben = useLiveQuery(() => db.hausaufgaben.orderBy('faellig').toArray(), []) ?? []
  // Offene Aufgaben aus der Erinnerungen-Liste "Schule" zählen auch als Hausaufgaben
  const schulErinnerungen = useLiveQuery(() => db.aufgaben.filter((a) => !a.erledigt && istSchulListe(a.liste)).toArray(), []) ?? []

  // Aktuelles Halbjahr (gespeichert) und das gerade angezeigte Halbjahr
  const [aktuellesHJ, setAktuellesHJ] = useEinstellung<number>('aktuellesHalbjahr', 1)
  const [gewaehltesHJ, setGewaehltesHJ] = useState<number | null>(null)
  const hj = gewaehltesHJ ?? aktuellesHJ

  const [formular, setFormular] = useState<null | 'fach' | 'note' | 'klausur' | 'hausaufgabe'>(null)
  const [noteFuerFach, setNoteFuerFach] = useState<string | undefined>()
  const [aufgeklappt, setAufgeklappt] = useState<string | null>(null)
  const [csvMeldung, setCsvMeldung] = useState('')
  const dateiFeld = useRef<HTMLInputElement>(null)

  const { ergebnisse, gesamt } = berechneHalbjahr(faecher, noten, hj, aktuellesHJ)
  // Für die Übersicht: alle vier Halbjahre, fehlende hochgerechnet ("wie bisher")
  const alleHJ = HALBJAHRE.map((h) => berechneHalbjahr(faecher, noten, h, aktuellesHJ))
  const { werte: hjWerte } = abiPrognose(faecher, noten, aktuellesHJ, [])
  const fachName = (id?: string) => faecher.find((f) => f.id === id)?.name

  // Anstehende Klausuren: eigene Einträge + Kalendertermine, die nach Klausur aussehen
  const anstehend = [
    ...klausuren.map((k) => ({ id: k.id, titel: `${fachName(k.fachId) ? fachName(k.fachId) + ': ' : ''}${k.titel}`, datum: k.datum, eigen: true })),
    ...kalenderKlausuren.filter((t) => istKlausurTermin(t.titel)).map((t) => ({ id: t.id, titel: t.titel, datum: tagVon(t.start), eigen: false })),
  ].sort((a, b) => a.datum.localeCompare(b.datum))

  const offeneHA = hausaufgaben.filter((h) => !h.erledigt || h.faellig >= heute())
  /** Fach aus dem Titel erraten, nur für die Anzeige: "Bio-Referat" -> Biologie, "Mathe Seite 12" -> Mathematik. */
  const fachAusTitel = (titel: string) => {
    const woerter = titel.toLowerCase().split(/[^a-zäöüß]+/).filter((w) => w.length >= 3)
    return faecher.find((f) => {
      const name = f.name.toLowerCase()
      return titel.toLowerCase().includes(name) || woerter.some((w) => name.startsWith(w))
    })?.name
  }
  // Eigene Hausaufgaben und Schul-Erinnerungen in einer Liste, nach Fälligkeit (ohne Datum zuletzt)
  const haListe = [
    ...offeneHA.map((h) => ({ art: 'eigen' as const, id: h.id, faellig: h.faellig, h })),
    ...schulErinnerungen.map((a) => ({ art: 'erinnerung' as const, id: a.id, faellig: a.faellig ?? '9999', a })),
  ].sort((x, y) => x.faellig.localeCompare(y.faellig))

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
      {/* Halbjahr wählen */}
      <div className="flex gap-2">
        {HALBJAHRE.map((h) => (
          <button
            key={h}
            onClick={() => setGewaehltesHJ(h)}
            className="tippbar min-h-11 flex-1 rounded-2xl text-[15px] font-semibold"
            style={{ background: hj === h ? FARBE : '#1c1c1e', color: hj === h ? '#000' : '#fff' }}
          >
            {h}. HJ{h === aktuellesHJ ? ' •' : ''}
          </button>
        ))}
      </div>
      {hj !== aktuellesHJ && (
        <button onClick={() => setAktuellesHJ(hj)} className="tippbar -mt-1 px-1 text-left text-[13px]" style={{ color: FARBE }}>
          {hj}. Halbjahr als aktuelles Halbjahr festlegen
        </button>
      )}

      {/* Gesamtschnitt */}
      <Karte titel={`Schnitt ${hj}. Halbjahr`} akzent={FARBE}>
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
            <p className="text-[12px] leading-snug text-grau">aus den gerundeten Halbjahresnoten, „2x“-Fächer doppelt</p>
          </div>
        </div>
      </Karte>

      {/* Abi-Prognose gleich oben, damit man sie sofort sieht */}
      {faecher.length > 0 && <AbiPrognose faecher={faecher} noten={noten} aktuellesHJ={aktuellesHJ} />}

      {/* Fächer */}
      <Karte titel="Fächer" rechts={<PlusKnopf farbe={FARBE} onClick={() => setFormular('fach')} label="Fach" />}>
        {faecher.length === 0 ? (
          <Leer>Leg zuerst deine Fächer an oder importiere eine CSV-Datei.</Leer>
        ) : (
          <ul>
            {ergebnisse.map(({ fach, noten: liste, schnitt, gerundet, istZeugnis }, i) => {
              const offen = aufgeklappt === fach.id
              return (
                <li key={fach.id} className={i > 0 ? 'border-t border-linie' : ''}>
                  {/* Zeile antippen = Noten des Fachs auf-/zuklappen */}
                  <button onClick={() => setAufgeklappt(offen ? null : fach.id)} className="tippbar flex min-h-14 w-full items-center gap-3 text-left">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: fach.farbe }} />
                    <span className="flex-1 text-[17px]">
                      {fach.name}
                      {fach.doppelt && <span className="ml-1 text-[12px] text-grau">2x</span>}
                    </span>
                    {gerundet !== null ? (
                      <span className="text-right">
                        <span className="block text-[17px] font-semibold" style={{ color: punkteFarbe(gerundet) }}>
                          {gerundet} P.{' '}
                          {schnitt !== null && <span className="text-[12px] font-normal text-grau">({formatGenau(schnitt)})</span>}
                        </span>
                        <span className="block whitespace-nowrap text-[12px] text-grau">
                          {/* Mit Zeugnisnote zählt diese, sonst der genaue Schnitt */}
                          {istZeugnis ? 'Zeugnis · ' : ''}Note {formatNote(punkteZuNote(istZeugnis || schnitt === null ? gerundet : schnitt))}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-grau">–</span>
                    )}
                    <ChevronDown size={18} className={`text-grau transition-transform ${offen ? 'rotate-180' : ''}`} />
                  </button>
                  {offen && (
                    <div className="pb-3 pl-6">
                      {liste.length === 0 && <p className="py-1 text-[14px] text-grau">Noch keine Noten im {hj}. Halbjahr.</p>}
                      {liste.map((n) => {
                        const zaehltNicht = fach.anteile && !(fach.anteile[n.art] ?? 0)
                        return (
                          <div key={n.id} className="flex items-center gap-3 py-1">
                            <span className="w-11 text-[17px] font-bold" style={{ color: punkteFarbe(n.punkte) }}>
                              {String(n.punkte).replace('.', ',')}
                            </span>
                            <span className="flex-1 text-[14px]">
                              {n.art}
                              <span className="text-grau">
                                {n.gewicht !== 1 ? ` · ×${String(n.gewicht).replace('.', ',')}` : ''} · {kurzDatum(n.datum)} · {notenText(n.punkte)}
                              </span>
                              {zaehltNicht && <span className="block text-[12px] text-[#ffd60a]">zählt nicht (Anteil {n.art} = 0 %)</span>}
                            </span>
                            <LoeschKnopf frage="Note löschen?" onLoeschen={() => db.noten.delete(n.id)} />
                          </div>
                        )
                      })}
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
                            confirm(`Fach „${fach.name}“ mit allen Noten (aller Halbjahre) löschen?`) &&
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
                      <FachEinstellungen fach={fach} hj={hj} />
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
          + Note eintragen ({hj}. HJ)
        </button>
      )}

      {/* Übersicht aller Halbjahre (wie "Block 1" in Notan) */}
      {faecher.length > 0 && (
        <Karte titel="Halbjahres-Übersicht">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-[12px] text-grau">
                <th className="pb-2 text-left font-normal">Fach</th>
                {HALBJAHRE.map((h) => (
                  <th key={h} className="pb-2 text-center font-normal">
                    {h}.
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faecher.map((f) => (
                <tr key={f.id} className="border-t border-linie">
                  <td className="py-1.5">
                    {f.name}
                    {f.doppelt && <span className="ml-1 text-[11px] text-grau">2x</span>}
                  </td>
                  {(hjWerte.get(f.id) ?? []).map((w, i) => (
                    // Hochgerechnete Werte (Prognose) kursiv und blasser
                    <td
                      key={i}
                      className={`text-center ${w?.art === 'prognose' ? 'font-normal italic opacity-60' : 'font-semibold'}`}
                      style={{ color: w ? punkteFarbe(w.wert) : '#8e8e93' }}
                    >
                      {w?.wert ?? '–'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-linie text-[13px]">
                <td className="py-1.5 text-grau">Ø Punkte</td>
                {alleHJ.map((h, i) => (
                  <td key={i} className="text-center text-grau">
                    {h.gesamt === null ? '–' : formatNote(h.gesamt)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-grau">
            <i>Kursiv</i> = hochgerechnet (Schnitt der bisherigen Halbjahre).
          </p>
        </Karte>
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
        {haListe.length === 0 ? (
          <Leer>Keine Hausaufgaben. 🎉</Leer>
        ) : (
          <ul>
            {haListe.map((eintrag) => {
              if (eintrag.art === 'eigen') {
                const h = eintrag.h
                return (
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
                )
              }
              // Aus Erinnerungen (Liste "Schule"): Abhaken wird beim nächsten Abgleich an Apple geschickt
              const a = eintrag.a
              const fach = fachAusTitel(a.titel)
              return (
                <li key={a.id} className="flex min-h-12 items-center gap-1">
                  <Haken an={false} farbe="#0a84ff" onClick={() => schalteErinnerung(a)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px]">{a.titel}</p>
                    <p className={`text-[13px] ${a.faellig && a.faellig < heute() ? 'text-[#ff453a]' : 'text-grau'}`}>
                      {fach ? `${fach} · ` : ''}
                      {a.faellig ? `fällig ${relativ(a.faellig)}` : 'ohne Datum'} · Erinnerungen
                    </p>
                  </div>
                  {a.markiert && <Flag size={16} color="#ff9f0a" fill="#ff9f0a" className="mr-3 shrink-0" aria-label="markiert" />}
                </li>
              )
            })}
          </ul>
        )}
      </Karte>

      {/* CSV-Import */}
      <Karte titel="Noten importieren (CSV)">
        <p className="mb-3 text-[13px] leading-snug text-grau">
          Spalten: Fach, Punkte (oder Note 1–6), optional Art, Gewicht, Datum, Halbjahr. Bereits importierte Noten werden erkannt und nicht doppelt angelegt.
        </p>
        <input ref={dateiFeld} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => csvGewaehlt(e.target.files?.[0])} />
        <button onClick={() => dateiFeld.current?.click()} className="tippbar flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-karte2 text-[15px] font-semibold">
          <FileUp size={18} /> CSV-Datei wählen
        </button>
        {csvMeldung && <p className="mt-3 text-[14px]">{csvMeldung}</p>}
      </Karte>

      <FachFormular offen={formular === 'fach'} onZu={() => setFormular(null)} />
      <NoteFormular offen={formular === 'note'} onZu={() => setFormular(null)} faecher={faecher} startFach={noteFuerFach} halbjahr={hj} />
      <TerminFormular offen={formular === 'klausur'} onZu={() => setFormular(null)} faecher={faecher} typ="klausur" />
      <TerminFormular offen={formular === 'hausaufgabe'} onZu={() => setFormular(null)} faecher={faecher} typ="hausaufgabe" />
    </Seite>
  )
}
