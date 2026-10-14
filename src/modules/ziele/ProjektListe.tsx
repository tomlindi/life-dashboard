// Karte "Projekte" auf der Ziele-Seite: Filter-Chips, Ziel-Auswahl, Sortieren und die Projektliste.
// Pro Projekt nur das Wichtigste: Farbe, Name, kleiner Fortschrittsring, Deadline, Anzahl offener Aufgaben.
// Antippen öffnet die Projektseite. Bei "Eigene Reihenfolge": gedrückt halten und ziehen.
// Filter und Sortierung werden als Einstellungen gespeichert und gelten beim nächsten Öffnen weiter.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowUpDown, Check, ChevronRight } from 'lucide-react'
import { db, type Projekt } from '../../core/db'
import { heute } from '../../core/datum'
import { relativ } from '../../core/format'
import { useEinstellung } from '../../core/einstellungen'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import Sheet from '../../core/ui/Sheet'
import SortierListe from '../../core/ui/SortierListe'
import { Leer, PlusKnopf } from '../../core/ui/Formular'
import { istSchulListe } from '../../core/aufgaben'
import { ProjektFormular } from './Formulare'
import { FILTER, SORTIERUNGEN, farbeVon, fortschritt, passt, sortiere, speichereReihenfolge, type Filter, type Sortierung } from './projekte'

const BLAU = '#0a84ff'

/** Eine Zeile in der Liste. */
function ProjektZeile({ p, anteil, offen, zieht }: { p: Projekt; anteil: number; offen: number; zieht?: boolean }) {
  const farbe = farbeVon(p)
  const ueberfaellig = p.deadline && p.deadline < heute() && p.status !== 'Fertig'
  return (
    <Link
      to={`/ziele/projekt/${p.id}`}
      className={`tippbar flex min-h-16 items-center gap-3 rounded-2xl p-3 ${zieht ? 'bg-leer' : 'bg-karte2'}`}
      draggable={false}
    >
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: farbe }} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[16px] font-semibold ${p.status === 'Fertig' ? 'text-grau' : ''}`}>{p.titel}</span>
        <span className="block truncate text-[13px] text-grau">
          {offen > 0 ? `${offen} offen` : 'nichts offen'}
          {p.deadline && (
            <>
              {' · '}
              <span className={ueberfaellig ? 'text-[#ff453a]' : ''}>Deadline {relativ(p.deadline)}</span>
            </>
          )}
        </span>
      </span>
      <Ring fortschritt={anteil} farbe={farbe} groesse={36} dicke={5} />
      <ChevronRight size={18} className="shrink-0 text-grau" />
    </Link>
  )
}

export default function ProjektListe() {
  const projekte = useLiveQuery(() => db.projekte.toArray(), []) ?? []
  const ziele = useLiveQuery(() => db.ziele.toArray(), []) ?? []
  const aufgaben = useLiveQuery(() => db.projektAufgaben.toArray(), []) ?? []
  // Erinnerungen zählen zum Fortschritt (Liste "Schule" gehört zu Schule)
  const erinnerungen = useLiveQuery(() => db.aufgaben.filter((a) => !!a.projektId && !istSchulListe(a.liste)).toArray(), []) ?? []
  const [filter, setFilter] = useEinstellung<Filter>('projektFilter', 'Alle')
  const [zielFilter, setZielFilter] = useEinstellung<string>('projektZielFilter', '')
  const [sortierung, setSortierung] = useEinstellung<Sortierung>('projektSortierung', 'deadline')
  const [sortierMenue, setSortierMenue] = useState(false)
  const [neu, setNeu] = useState(false)

  const f = (p: Projekt) => fortschritt(p, aufgaben, erinnerungen)
  // Gibt es das gefilterte Ziel nicht mehr, gilt "alle Ziele"
  const zielId = ziele.some((z) => z.id === zielFilter) ? zielFilter : ''
  const sichtbar = sortiere(
    projekte.filter((p) => passt(p, filter, zielId)),
    sortierung,
    (p) => f(p).anteil,
  )

  return (
    <Karte
      titel="Projekte"
      akzent={BLAU}
      rechts={
        <div className="flex items-center">
          <button onClick={() => setSortierMenue(true)} className="tippbar flex h-9 w-9 items-center justify-center" style={{ color: BLAU }} aria-label="Sortieren">
            <ArrowUpDown size={19} />
          </button>
          <PlusKnopf farbe={BLAU} onClick={() => setNeu(true)} label="Projekt" />
        </div>
      }
    >
      {/* Filter-Chips (seitlich wischbar) und Ziel-Auswahl */}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTER.map((x) => (
          <button
            key={x}
            onClick={() => setFilter(x)}
            className="tippbar min-h-9 shrink-0 rounded-full px-3.5 text-[14px] font-medium"
            style={{ background: filter === x ? BLAU : 'var(--color-karte2)', color: filter === x ? '#000' : 'var(--color-text)' }}
          >
            {x}
          </button>
        ))}
        {ziele.length > 0 && (
          // Native Auswahl: auf dem iPhone erscheint das Drehrad
          <select
            value={zielId}
            onChange={(e) => setZielFilter(e.target.value)}
            className="min-h-9 shrink-0 rounded-full px-3 text-[14px] font-medium outline-none"
            style={{ background: zielId ? BLAU : 'var(--color-karte2)', color: zielId ? '#000' : 'var(--color-text)' }}
            aria-label="Nur Projekte eines Ziels"
          >
            <option value="">Ziel: alle</option>
            {ziele.map((z) => (
              <option key={z.id} value={z.id}>
                {z.emoji} {z.titel}
              </option>
            ))}
          </select>
        )}
      </div>

      {projekte.length === 0 ? (
        <Leer>Noch keine Projekte.</Leer>
      ) : sichtbar.length === 0 ? (
        <Leer>Keine Projekte für diesen Filter.</Leer>
      ) : sortierung === 'eigene' ? (
        <>
          <SortierListe eintraege={sichtbar} schluessel={(p) => p.id} onNeueReihenfolge={(neuOrdnung) => speichereReihenfolge(projekte, neuOrdnung)} className="flex flex-col gap-2">
            {(p, zieht) => <ProjektZeile p={p} anteil={f(p).anteil} offen={f(p).offen} zieht={zieht} />}
          </SortierListe>
          <p className="mt-2 text-[12px] text-grau">Zum Verschieben ein Projekt gedrückt halten und ziehen.</p>
        </>
      ) : (
        <ul className="flex flex-col gap-2">
          {sichtbar.map((p) => (
            <li key={p.id}>
              <ProjektZeile p={p} anteil={f(p).anteil} offen={f(p).offen} />
            </li>
          ))}
        </ul>
      )}

      {/* Sortieren-Menü */}
      <Sheet titel="Sortieren nach" offen={sortierMenue} onZu={() => setSortierMenue(false)}>
        <ul className="overflow-hidden rounded-2xl bg-karte2">
          {SORTIERUNGEN.map((s, i) => (
            <li key={s.key} className={i > 0 ? 'border-t border-linie' : ''}>
              <button
                onClick={() => {
                  setSortierung(s.key)
                  setSortierMenue(false)
                }}
                className="tippbar flex min-h-12 w-full items-center px-4 text-left text-[16px]"
              >
                <span className="flex-1">{s.name}</span>
                {sortierung === s.key && <Check size={20} color={BLAU} strokeWidth={2.5} />}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <ProjektFormular offen={neu} onZu={() => setNeu(false)} />
    </Karte>
  )
}
