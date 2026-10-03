// Bereich "Ziele & Projekte": langfristige Ziele mit Unterzielen, Projekte mit Aufgaben,
// und Kalendertermine, die man einem Ziel oder Projekt zuordnen kann.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown } from 'lucide-react'
import { db, type Projekt, type Termin, type Ziel } from '../../core/db'
import { heute, neueId, tagPlus, tagVon, uhrzeit } from '../../core/datum'
import { kurzDatum, relativ } from '../../core/format'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import { Balken, Haken, Leer, LoeschKnopf, PlusKnopf, SchnellEingabe } from '../../core/ui/Formular'
import { ProjektFormular, STATUS, ZielFormular } from './Formulare'

const FARBE = '#bf5af2'
const STATUS_FARBE: Record<string, string> = { Idee: '#8e8e93', Aktiv: '#30d158', Pausiert: '#ffd60a', Fertig: '#0a84ff' }

/** Kleine Liste der Termine, die zu einem Ziel/Projekt gehören. */
function ZugeordneteTermine({ termine }: { termine: Termin[] }) {
  if (termine.length === 0) return null
  return (
    <div className="mt-2 space-y-1">
      {termine.map((t) => (
        <p key={t.id} className="text-[13px] text-grau">
          📅 {t.titel} · {kurzDatum(tagVon(t.start))}, {uhrzeit(t.start)}
        </p>
      ))}
    </div>
  )
}

export default function ZieleSeite() {
  const ziele = useLiveQuery(() => db.ziele.toArray(), []) ?? []
  const unterziele = useLiveQuery(() => db.unterziele.toArray(), []) ?? []
  const projekte = useLiveQuery(() => db.projekte.toArray(), []) ?? []
  const aufgaben = useLiveQuery(() => db.projektAufgaben.toArray(), []) ?? []
  // Termine ab heute (für Zuordnung und Anzeige)
  const termine = useLiveQuery(() => db.termine.where('start').aboveOrEqual(new Date(`${heute()}T00:00:00`).toISOString()).sortBy('start'), []) ?? []

  const [formular, setFormular] = useState<null | 'ziel' | 'projekt'>(null)
  const [offen, setOffen] = useState<string | null>(null)

  /** Fortschritt eines Ziels in Prozent: Anteil erledigter Unterziele, sonst der Wert von Hand. */
  function prozent(z: Ziel): number {
    const liste = unterziele.filter((u) => u.zielId === z.id)
    if (liste.length === 0) return z.manuellProzent ?? 0
    return Math.round((liste.filter((u) => u.erledigt).length / liste.length) * 100)
  }

  function projektFortschritt(p: Projekt) {
    const liste = aufgaben.filter((a) => a.projektId === p.id)
    return { erledigt: liste.filter((a) => a.erledigt).length, alle: liste.length }
  }

  /** Nächster Status beim Antippen: Idee → Aktiv → Pausiert → Fertig → Idee */
  const naechsterStatus = (p: Projekt) => STATUS[(STATUS.indexOf(p.status) + 1) % STATUS.length]

  /** Termin zuordnen. Der Wert aus der Auswahl sieht so aus: "ziel:<id>", "projekt:<id>" oder "". */
  function ordneZu(termin: Termin, wert: string) {
    const [typ, id] = wert.split(':')
    db.termine.update(termin.id, { zielId: typ === 'ziel' ? id : undefined, projektId: typ === 'projekt' ? id : undefined })
  }

  const naechste14 = termine.filter((t) => tagVon(t.start) <= tagPlus(heute(), 14))

  return (
    <Seite titel="Ziele" farbe={FARBE}>
      {/* ---------- Ziele ---------- */}
      <Karte titel="Langfristige Ziele" akzent={FARBE} rechts={<PlusKnopf farbe={FARBE} onClick={() => setFormular('ziel')} label="Ziel" />}>
        {ziele.length === 0 ? (
          <Leer>Noch keine Ziele. Was willst du in diesem Jahr erreichen?</Leer>
        ) : (
          <ul className="space-y-2">
            {ziele.map((z) => {
              const p = prozent(z)
              const istOffen = offen === z.id
              const liste = unterziele.filter((u) => u.zielId === z.id)
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
                      <ZugeordneteTermine termine={termine.filter((t) => t.zielId === z.id)} />
                      <button
                        onClick={() =>
                          confirm(`Ziel „${z.titel}“ löschen?`) &&
                          db.transaction('rw', db.ziele, db.unterziele, async () => {
                            await db.unterziele.where('zielId').equals(z.id).delete()
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

      {/* ---------- Projekte ---------- */}
      <Karte titel="Projekte" akzent="#0a84ff" rechts={<PlusKnopf farbe="#0a84ff" onClick={() => setFormular('projekt')} label="Projekt" />}>
        {projekte.length === 0 ? (
          <Leer>Noch keine Projekte.</Leer>
        ) : (
          <ul className="space-y-2">
            {projekte.map((p) => {
              const { erledigt, alle } = projektFortschritt(p)
              const istOffen = offen === p.id
              const ueberfaellig = p.deadline && p.deadline < heute() && p.status !== 'Fertig'
              return (
                <li key={p.id} className="rounded-2xl bg-karte2 p-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setOffen(istOffen ? null : p.id)} className="tippbar min-w-0 flex-1 text-left">
                      <p className="truncate text-[16px] font-semibold">{p.titel}</p>
                      <p className={`text-[13px] ${ueberfaellig ? 'text-[#ff453a]' : 'text-grau'}`}>
                        {alle > 0 ? `${erledigt}/${alle} Aufgaben` : 'Keine Aufgaben'}
                        {p.deadline ? ` · Deadline ${relativ(p.deadline)}` : ''}
                      </p>
                    </button>
                    {/* Status antippen = nächster Status */}
                    <button
                      onClick={() => db.projekte.update(p.id, { status: naechsterStatus(p) })}
                      className="tippbar min-h-9 rounded-full px-3 text-[13px] font-semibold text-black"
                      style={{ background: STATUS_FARBE[p.status] }}
                    >
                      {p.status}
                    </button>
                  </div>
                  {alle > 0 && (
                    <div className="mt-2">
                      <Balken wert={erledigt / alle} farbe="#0a84ff" />
                    </div>
                  )}

                  {istOffen && (
                    <div className="mt-3">
                      {aufgaben
                        .filter((a) => a.projektId === p.id)
                        .map((a) => (
                          <div key={a.id} className="flex items-center">
                            <Haken an={a.erledigt} farbe="#0a84ff" onClick={() => db.projektAufgaben.update(a.id, { erledigt: !a.erledigt })} />
                            <span className={`flex-1 text-[15px] ${a.erledigt ? 'text-grau line-through' : ''}`}>{a.titel}</span>
                            <LoeschKnopf frage="Aufgabe löschen?" onLoeschen={() => db.projektAufgaben.delete(a.id)} />
                          </div>
                        ))}
                      <SchnellEingabe
                        platzhalter="Aufgabe hinzufügen …"
                        farbe="#0a84ff"
                        onNeu={(titel) => db.projektAufgaben.add({ id: neueId(), projektId: p.id, titel, erledigt: false })}
                      />
                      <label className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-[14px] text-grau">Deadline</span>
                        <input
                          type="date"
                          value={p.deadline ?? ''}
                          onChange={(e) => db.projekte.update(p.id, { deadline: e.target.value || undefined })}
                          className="h-10 rounded-xl bg-black/40 px-3 outline-none"
                        />
                      </label>
                      <ZugeordneteTermine termine={termine.filter((t) => t.projektId === p.id)} />
                      <button
                        onClick={() =>
                          confirm(`Projekt „${p.titel}“ löschen?`) &&
                          db.transaction('rw', db.projekte, db.projektAufgaben, async () => {
                            await db.projektAufgaben.where('projektId').equals(p.id).delete()
                            await db.projekte.delete(p.id)
                          })
                        }
                        className="tippbar mt-2 min-h-10 text-[14px] text-[#ff453a]"
                      >
                        Projekt löschen
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Karte>

      {/* ---------- Termine zuordnen ---------- */}
      <Karte titel="Termine zuordnen" akzent="#ff9f0a">
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
      </Karte>

      <ZielFormular offen={formular === 'ziel'} onZu={() => setFormular(null)} />
      <ProjektFormular offen={formular === 'projekt'} onZu={() => setFormular(null)} />
    </Seite>
  )
}
