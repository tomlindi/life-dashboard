// Bereich "Ziele & Projekte":
//   • oben die Projekte mit Filter und Sortierung (ProjektListe.tsx); jedes Projekt hat eine eigene Seite (ProjektSeite.tsx)
//   • langfristige Ziele mit Filter (Alle/Offen/Erreicht) und Unterzielen; zugeordnete Termine und Erinnerungen sind eingeklappt
//   • unten (eingeklappt): Kalendertermine einem Ziel/Projekt zuordnen, Erinnerungen einem Projekt zuordnen
// Aufgaben aus Apple Erinnerungen (außer Liste "Schule", die gehört zu Schule) lassen sich einem Projekt zuordnen.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Flag } from 'lucide-react'
import { db, type Aufgabe, type Termin, type Ziel } from '../../core/db'
import { heute, neueId, tagPlus, tagVon, uhrzeit } from '../../core/datum'
import { kurzDatum, relativ } from '../../core/format'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Aufklapper from '../../core/ui/Aufklapper'
import { Balken, Haken, Leer, LoeschKnopf, PlusKnopf, SchnellEingabe } from '../../core/ui/Formular'
import { ZielFormular } from './Formulare'
import ProjektListe from './ProjektListe'
import { ZIEL_FILTER, zielPasst, type ZielFilter } from './projekte'
import { useEinstellung } from '../../core/einstellungen'
import { schalteErinnerung } from '../../core/apple'
import { istSchulListe } from '../../core/aufgaben'

const FARBE = '#bf5af2'

export default function ZieleSeite() {
  const ziele = useLiveQuery(() => db.ziele.toArray(), []) ?? []
  const unterziele = useLiveQuery(() => db.unterziele.toArray(), []) ?? []
  const projekte = useLiveQuery(() => db.projekte.toArray(), []) ?? []
  // Termine ab heute (für Zuordnung und Anzeige)
  const termine = useLiveQuery(() => db.termine.where('start').aboveOrEqual(new Date(`${heute()}T00:00:00`).toISOString()).sortBy('start'), []) ?? []
  // Aufgaben aus Erinnerungen, die zu einem Projekt passen könnten (Schule-Liste gehört zu Schule)
  const erinnerungen = useLiveQuery(() => db.aufgaben.filter((a) => a.quelle === 'erinnerungen' && !istSchulListe(a.liste)).toArray(), []) ?? []

  const [zielFormular, setZielFormular] = useState(false)
  const [offen, setOffen] = useState<string | null>(null)

  /** Fortschritt eines Ziels in Prozent: Anteil erledigter Unterziele, sonst der Wert von Hand. */
  function prozent(z: Ziel): number {
    const liste = unterziele.filter((u) => u.zielId === z.id)
    if (liste.length === 0) return z.manuellProzent ?? 0
    return Math.round((liste.filter((u) => u.erledigt).length / liste.length) * 100)
  }

  /** Projekt-IDs, die zu einem Ziel gehören. */
  const projekteVon = (z: Ziel) => new Set(projekte.filter((p) => p.zielId === z.id).map((p) => p.id))
  /** Termine eines Ziels: direkt zugeordnete und die seiner Projekte. */
  function termineVon(z: Ziel) {
    const ids = projekteVon(z)
    return termine.filter((t) => t.zielId === z.id || (t.projektId && ids.has(t.projektId)))
  }
  /** Erinnerungen eines Ziels: die offenen Erinnerungen seiner Projekte. */
  function erinnerungenVon(z: Ziel) {
    const ids = projekteVon(z)
    return erinnerungen.filter((a) => !a.erledigt && a.projektId && ids.has(a.projektId))
  }

  /** Erinnerung einem Projekt zuordnen ("" = keinem). */
  const ordneErinnerungZu = (a: Aufgabe, projektId: string) => db.aufgaben.update(a.id, { projektId: projektId || undefined })
  // Zum Zuordnen: offene Erinnerungen, nach Liste und Fälligkeit sortiert
  const offeneErinnerungen = erinnerungen
    .filter((a) => !a.erledigt)
    .sort((a, b) => (a.liste ?? '').localeCompare(b.liste ?? '', 'de') || (a.faellig ?? '9999').localeCompare(b.faellig ?? '9999'))

  /** Termin zuordnen. Der Wert aus der Auswahl sieht so aus: "ziel:<id>", "projekt:<id>" oder "". */
  function ordneZu(termin: Termin, wert: string) {
    const [typ, id] = wert.split(':')
    db.termine.update(termin.id, { zielId: typ === 'ziel' ? id : undefined, projektId: typ === 'projekt' ? id : undefined })
  }

  const naechste14 = termine.filter((t) => tagVon(t.start) <= tagPlus(heute(), 14))

  // Filter für die Ziele (gespeichert): Erreicht = 100 %, Offen = alles darunter
  const [zielFilter, setZielFilter] = useEinstellung<ZielFilter>('zielFilter', 'Alle')
  const sichtbareZiele = ziele.filter((z) => zielPasst(prozent(z), zielFilter))

  return (
    <Seite titel="Ziele" farbe={FARBE}>
      {/* ---------- Projekte (Filter, Sortierung, Liste) ---------- */}
      <ProjektListe />

      {/* ---------- Ziele ---------- */}
      <Karte titel="Langfristige Ziele" akzent={FARBE} rechts={<PlusKnopf farbe={FARBE} onClick={() => setZielFormular(true)} label="Ziel" />}>
        {ziele.length > 0 && (
          <div className="mb-3 flex gap-2">
            {ZIEL_FILTER.map((x) => (
              <button
                key={x}
                onClick={() => setZielFilter(x)}
                className="tippbar min-h-9 shrink-0 rounded-full px-3.5 text-[14px] font-medium"
                style={{ background: zielFilter === x ? FARBE : '#2c2c2e', color: zielFilter === x ? '#000' : '#fff' }}
              >
                {x}
              </button>
            ))}
          </div>
        )}
        {ziele.length === 0 ? (
          <Leer>Noch keine Ziele. Was willst du in diesem Jahr erreichen?</Leer>
        ) : sichtbareZiele.length === 0 ? (
          <Leer>Keine Ziele für diesen Filter.</Leer>
        ) : (
          <ul className="space-y-2">
            {sichtbareZiele.map((z) => {
              const p = prozent(z)
              const istOffen = offen === z.id
              const liste = unterziele.filter((u) => u.zielId === z.id)
              const zielTermine = termineVon(z)
              const zielErinnerungen = erinnerungenVon(z)
              return (
                <li key={z.id} className="rounded-2xl bg-karte2 p-3">
                  <button onClick={() => setOffen(istOffen ? null : z.id)} className="tippbar w-full text-left">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[22px]">{z.emoji}</span>
                      <span className="flex-1 text-[16px] font-semibold">{z.titel}</span>
                      <span className="text-[15px] font-bold" style={{ color: FARBE }}>
                        {p} %
                      </span>
                      <ChevronDown size={18} className={`text-grau transition-transform ${istOffen ? 'rotate-180' : ''}`} />
                    </div>
                    <Balken wert={p / 100} farbe={FARBE} />
                  </button>

                  {/* Termine und Erinnerungen: standardmäßig eingeklappt, nur mit Anzahl */}
                  {(zielTermine.length > 0 || zielErinnerungen.length > 0) && (
                    <div className="mt-2">
                      {zielTermine.length > 0 && (
                        <Aufklapper titel="Termine" anzahl={zielTermine.length} klein>
                          {zielTermine.map((t) => (
                            <p key={t.id} className="py-1 text-[13px]">
                              📅 {t.titel}{' '}
                              <span className="text-grau">
                                · {kurzDatum(tagVon(t.start))}, {uhrzeit(t.start)}
                              </span>
                            </p>
                          ))}
                        </Aufklapper>
                      )}
                      {zielErinnerungen.length > 0 && (
                        <Aufklapper titel="Erinnerungen" anzahl={zielErinnerungen.length} klein>
                          {zielErinnerungen.map((a) => (
                            <div key={a.id} className="flex items-center">
                              {/* Abhaken wird beim nächsten Abgleich an Apple geschickt */}
                              <Haken an={a.erledigt} farbe={FARBE} onClick={() => schalteErinnerung(a)} />
                              <span className="min-w-0 flex-1 truncate text-[14px]">{a.titel}</span>
                              {a.faellig && <span className="shrink-0 text-[12px] text-grau">{relativ(a.faellig)}</span>}
                            </div>
                          ))}
                        </Aufklapper>
                      )}
                    </div>
                  )}

                  {istOffen && (
                    <div className="mt-3">
                      {liste.map((u) => (
                        <div key={u.id} className="flex items-center">
                          <Haken an={u.erledigt} farbe={FARBE} onClick={() => db.unterziele.update(u.id, { erledigt: !u.erledigt })} />
                          <span className={`flex-1 text-[15px] ${u.erledigt ? 'text-grau line-through' : ''}`}>{u.titel}</span>
                          <LoeschKnopf frage="Unterziel löschen?" onLoeschen={() => db.unterziele.delete(u.id)} />
                        </div>
                      ))}
                      {/* Ohne Unterziele: Fortschritt per Schieberegler */}
                      {liste.length === 0 && (
                        <label className="mb-2 block">
                          <span className="text-[13px] text-grau">Fortschritt von Hand (oder Unterziele hinzufügen)</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={z.manuellProzent ?? 0}
                            onChange={(e) => db.ziele.update(z.id, { manuellProzent: Number(e.target.value) })}
                            className="w-full"
                            style={{ accentColor: FARBE }}
                          />
                        </label>
                      )}
                      <SchnellEingabe
                        platzhalter="Unterziel hinzufügen …"
                        farbe={FARBE}
                        onNeu={(titel) => db.unterziele.add({ id: neueId(), zielId: z.id, titel, erledigt: false })}
                      />
                      <button
                        onClick={() =>
                          confirm(`Ziel „${z.titel}“ löschen?`) &&
                          db.transaction('rw', db.ziele, db.unterziele, db.projekte, async () => {
                            await db.unterziele.where('zielId').equals(z.id).delete()
                            await db.projekte.filter((p) => p.zielId === z.id).modify({ zielId: undefined }) // Projekte bleiben, nur ohne Ziel
                            await db.ziele.delete(z.id)
                          })
                        }
                        className="tippbar mt-2 min-h-10 text-[14px] text-[#ff453a]"
                      >
                        Ziel löschen
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Karte>

      {/* ---------- Termine zuordnen (eingeklappt, bei jedem Öffnen der Seite wieder zu) ---------- */}
      <Karte>
        <Aufklapper titel="Termine zuordnen" anzahl={naechste14.length} farbe="#ff9f0a">
        {naechste14.length === 0 ? (
          <Leer>Keine Termine in den nächsten 14 Tagen. Importiere deinen Kalender über „Mehr → Daten importieren“.</Leer>
        ) : (
          <ul>
            {naechste14.map((t, i) => (
              <li key={t.id} className={`flex min-h-14 items-center gap-3 py-1 ${i > 0 ? 'border-t border-linie' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{t.titel}</p>
                  <p className="text-[12px] text-grau">
                    {kurzDatum(tagVon(t.start))}, {uhrzeit(t.start)}
                  </p>
                </div>
                {/* Native Auswahlliste: auf dem iPhone erscheint das bekannte Drehrad */}
                <select
                  value={t.zielId ? `ziel:${t.zielId}` : t.projektId ? `projekt:${t.projektId}` : ''}
                  onChange={(e) => ordneZu(t, e.target.value)}
                  className="h-10 max-w-[45%] rounded-xl bg-karte2 px-2 text-[14px] outline-none"
                >
                  <option value="">– keins –</option>
                  {ziele.length > 0 && (
                    <optgroup label="Ziele">
                      {ziele.map((z) => (
                        <option key={z.id} value={`ziel:${z.id}`}>
                          {z.emoji} {z.titel}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {projekte.length > 0 && (
                    <optgroup label="Projekte">
                      {projekte.map((p) => (
                        <option key={p.id} value={`projekt:${p.id}`}>
                          {p.titel}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </li>
            ))}
          </ul>
        )}
        </Aufklapper>
      </Karte>

      {/* ---------- Erinnerungen zuordnen ---------- */}
      <Karte>
        <Aufklapper titel="Erinnerungen zuordnen" anzahl={offeneErinnerungen.length} farbe="#0a84ff">
        {offeneErinnerungen.length === 0 ? (
          <Leer>Keine offenen Aufgaben aus Erinnerungen (außer Schule). Hol sie mit „Life Sync einfügen“ unter „Mehr → Daten importieren“.</Leer>
        ) : projekte.length === 0 ? (
          <Leer>Leg zuerst ein Projekt an, dann kannst du ihm hier Aufgaben aus Erinnerungen zuordnen.</Leer>
        ) : (
          <ul>
            {offeneErinnerungen.map((a, i) => (
              <li key={a.id} className={`flex min-h-14 items-center gap-3 py-1 ${i > 0 ? 'border-t border-linie' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-[15px]">
                    <span className="truncate">{a.titel}</span>
                    {a.markiert && <Flag size={13} color="#ff9f0a" fill="#ff9f0a" className="shrink-0" />}
                  </p>
                  <p className="truncate text-[12px] text-grau">
                    {a.liste ?? 'Erinnerungen'}
                    {a.faellig ? ` · fällig ${relativ(a.faellig)}` : ''}
                  </p>
                </div>
                <select
                  value={a.projektId ?? ''}
                  onChange={(e) => ordneErinnerungZu(a, e.target.value)}
                  className="h-10 max-w-[45%] rounded-xl bg-karte2 px-2 text-[14px] outline-none"
                  aria-label={`Projekt für „${a.titel}“`}
                >
                  <option value="">– kein Projekt –</option>
                  {projekte.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titel}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
        </Aufklapper>
      </Karte>


      <ZielFormular offen={zielFormular} onZu={() => setZielFormular(false)} />
    </Seite>
  )
}
