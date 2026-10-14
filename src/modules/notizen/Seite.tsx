// Bereich "Notizen" wie Apple Notizen: Ordner, Suche, angepinnte Notizen, Gruppen nach Datum.
// Eine Notiz öffnet sich über die Adresse "#/notizen?notiz=<id>" (so kann "Heute" direkt auf eine Notiz verlinken).
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Folder, FolderPlus, ListChecks, MoreHorizontal, Pin, Search, SquarePen, X } from 'lucide-react'
import { db } from '../../core/db'
import Seite from '../../core/ui/Seite'
import { DOCK_ABSTAND } from '../../core/ui/Dock'
import Editor from './Editor'
import { FARBE, STANDARD_ORDNER, checkStand, geaendertVon, gruppiereNotizen, loescheOrdner, neueNotiz, neuerOrdner, titelVon, vorschauVon, zeitText } from './notizen'

/** Ausgewählter Ordner: alle Notizen, der Standardordner oder ein eigener Ordner (ID). */
type Auswahl = 'alle' | 'standard' | string

export default function NotizenSeite() {
  const [parameter, setParameter] = useSearchParams()
  const offeneId = parameter.get('notiz')
  const notizen = useLiveQuery(() => db.notizen.toArray(), []) ?? []
  const ordner = useLiveQuery(() => db.notizOrdner.orderBy('sortierung').toArray(), []) ?? []
  const [auswahl, setAuswahl] = useState<Auswahl>('alle')
  const [suche, setSuche] = useState('')

  const offen = offeneId ? notizen.find((n) => n.id === offeneId) : undefined
  const oeffne = (id: string | null) => setParameter(id ? { notiz: id } : {}, { replace: !id })

  // Eine Notiz ist offen -> Editor. "key": beim Wechsel zu einer anderen Notiz neu aufbauen.
  if (offeneId) {
    if (!offen) return null // lädt noch (oder wurde gerade gelöscht)
    return <Editor key={offen.id} notiz={offen} onZurueck={() => oeffne(null)} />
  }

  const eigenerOrdner = ordner.find((o) => o.id === auswahl)
  const imOrdner = notizen.filter((n) => (auswahl === 'alle' ? true : auswahl === 'standard' ? !n.ordnerId || !ordner.some((o) => o.id === n.ordnerId) : n.ordnerId === auswahl))
  const begriff = suche.trim().toLowerCase()
  const gefunden = begriff ? imOrdner.filter((n) => n.text.toLowerCase().includes(begriff)) : imOrdner
  const anzahl = (a: Auswahl) => notizen.filter((n) => (a === 'alle' ? true : a === 'standard' ? !n.ordnerId || !ordner.some((o) => o.id === n.ordnerId) : n.ordnerId === a)).length

  async function ordnerAnlegen() {
    const name = prompt('Name des neuen Ordners')?.trim()
    if (name) setAuswahl(await neuerOrdner(name))
  }

  async function ordnerMenue() {
    if (!eigenerOrdner) return
    const neu = prompt(`Ordner umbenennen (leer lassen und OK = Ordner löschen)`, eigenerOrdner.name)
    if (neu === null) return
    if (neu.trim()) return db.notizOrdner.update(eigenerOrdner.id, { name: neu.trim() })
    if (confirm(`Ordner „${eigenerOrdner.name}“ löschen? Die Notizen darin kommen in „${STANDARD_ORDNER}“.`)) {
      await loescheOrdner(eigenerOrdner.id)
      setAuswahl('alle')
    }
  }

  const chips: { id: Auswahl; name: string }[] = [{ id: 'alle', name: 'Alle' }, { id: 'standard', name: STANDARD_ORDNER }, ...ordner.map((o) => ({ id: o.id, name: o.name }))]

  return (
    <Seite titel={eigenerOrdner?.name ?? (auswahl === 'standard' ? STANDARD_ORDNER : 'Notizen')} farbe={FARBE}>
      {/* Suche */}
      <label className="flex h-10 items-center gap-2 rounded-xl bg-karte2 px-3">
        <Search size={17} className="shrink-0 text-grau" />
        <input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Suchen" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-grau" />
        {suche && (
          <button onClick={() => setSuche('')} className="text-grau" aria-label="Suche löschen">
            <X size={17} />
          </button>
        )}
      </label>

      {/* Ordner */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {chips.map((c) => {
          const an = auswahl === c.id
          return (
            <button
              key={c.id}
              onClick={() => (an && eigenerOrdner?.id === c.id ? ordnerMenue() : setAuswahl(c.id))}
              className="tippbar flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold"
              style={{ background: an ? FARBE : 'var(--color-karte2)', color: an ? '#000' : 'var(--color-text)' }}
            >
              {c.id !== 'alle' && <Folder size={14} />}
              {c.name}
              <span className="font-normal opacity-60">{anzahl(c.id)}</span>
              {an && eigenerOrdner?.id === c.id && <MoreHorizontal size={15} />}
            </button>
          )
        })}
        <button onClick={ordnerAnlegen} className="tippbar flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-karte2 px-3 text-[14px] font-semibold" style={{ color: FARBE }} aria-label="Neuer Ordner">
          <FolderPlus size={15} /> Ordner
        </button>
      </div>

      {/* Notizen, gruppiert */}
      {gefunden.length === 0 && <p className="py-10 text-center text-[15px] text-grau">{begriff ? 'Keine Treffer.' : 'Keine Notizen. Tippe auf den Stift unten rechts.'}</p>}
      {gruppiereNotizen(gefunden).map((g) => (
        <section key={g.titel}>
          <h2 className="mb-1.5 flex items-center gap-1.5 px-1 text-[17px] font-bold">
            {g.titel === 'Angepinnt' && <Pin size={15} color={FARBE} />}
            {g.titel}
          </h2>
          <div className="overflow-hidden rounded-2xl bg-karte">
            {g.notizen.map((n, i) => {
              const stand = checkStand(n)
              const ordnerName = auswahl === 'alle' ? (ordner.find((o) => o.id === n.ordnerId)?.name ?? STANDARD_ORDNER) : null
              return (
                <button key={n.id} onClick={() => oeffne(n.id)} className={`tippbar block w-full px-4 py-2.5 text-left ${i > 0 ? 'border-t border-linie' : ''}`}>
                  <p className="truncate text-[16px] font-semibold">{titelVon(n)}</p>
                  <p className="flex items-center gap-1.5 truncate text-[14px] text-grau">
                    <span className="shrink-0 text-text/80">{zeitText(geaendertVon(n))}</span>
                    {stand && (
                      <span className="flex shrink-0 items-center gap-0.5">
                        <ListChecks size={13} /> {stand.erledigt}/{stand.gesamt}
                      </span>
                    )}
                    <span className="truncate">{vorschauVon(n)}</span>
                  </p>
                  {ordnerName && (
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] text-grau">
                      <Folder size={11} /> {ordnerName}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {/* Neue Notiz (im gewählten Ordner): schwebt rechts über dem Dock-Knopf */}
      <button
        onClick={async () => oeffne(await neueNotiz(eigenerOrdner?.id))}
        className="tippbar fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ background: FARBE, color: '#000', bottom: `calc(${DOCK_ABSTAND} + 8px)` }}
        aria-label="Neue Notiz"
      >
        <SquarePen size={24} />
      </button>
    </Seite>
  )
}
