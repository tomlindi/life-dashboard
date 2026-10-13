// Einstellungen → "Dock-Seiten": welche (höchstens 4) Seiten fest im Dock stehen und in welcher Reihenfolge.
// "Mehr" ist immer dabei. Reihenfolge: Zeile gedrückt halten und ziehen (oben = links in der Kapsel).
// Gespeichert als Einstellung "dockTabs" (Liste von IDs). Dazu der Schalter "Knopf links" (Einstellung "dockLinks").
import { GripVertical, Minus, Plus } from 'lucide-react'
import { MAX_TABS, STANDARD_TABS } from '..'
import { useAusgeblendet, useEinstellung } from '../../core/einstellungen'
import Karte from '../../core/ui/Karte'
import { Schalter } from '../../core/ui/Formular'
import SortierListe from '../../core/ui/SortierListe'
import { WAEHLBARE_SEITEN, useDockTabIds, type DockSeite } from '../../core/ui/Dock'

export default function DockSeiten() {
  const [ids, setIds] = useDockTabIds()
  const [links, setLinks] = useEinstellung<boolean>('dockLinks', false)
  const [ausgeblendet] = useAusgeblendet()
  // Nur gültige, nicht ausgeblendete Seiten (ein ausgeblendeter Bereich kann nicht im Dock stehen)
  const nutzbar = WAEHLBARE_SEITEN.filter((s) => !ausgeblendet.includes(s.id))
  const gewaehlt = ids.map((id) => nutzbar.find((s) => s.id === id)).filter((s): s is DockSeite => !!s)
  const uebrig = nutzbar.filter((s) => !gewaehlt.includes(s))
  const voll = gewaehlt.length >= MAX_TABS
  const speichere = (neu: DockSeite[]) => setIds(neu.map((s) => s.id))

  return (
    <Karte titel="Dock-Seiten" rechts={<span className="text-[13px] text-grau">{gewaehlt.length} von {MAX_TABS}</span>}>
      <SortierListe eintraege={gewaehlt} schluessel={(s) => s.id} onNeueReihenfolge={speichere}>
        {(s, zieht) => (
          <div className={`flex min-h-12 items-center gap-3 rounded-xl px-1 ${zieht ? 'bg-karte2' : ''}`}>
            <GripVertical size={18} className="shrink-0 text-grau" />
            <s.icon size={20} color={s.farbe} />
            <span className="flex-1 truncate text-[16px]">{s.name}</span>
            <button
              onClick={() => speichere(gewaehlt.filter((x) => x !== s))}
              disabled={gewaehlt.length <= 1}
              className="tippbar flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-karte2 text-[#ff453a] disabled:opacity-30"
              aria-label={`${s.name} entfernen`}
            >
              <Minus size={16} />
            </button>
          </div>
        )}
      </SortierListe>
      <div className="flex min-h-12 items-center gap-3 border-t border-linie px-1 text-grau">
        <span className="flex-1 text-[16px]">Mehr</span>
        <span className="text-[13px]">immer dabei</span>
      </div>

      {uebrig.length > 0 && (
        <>
          <p className="mb-1 mt-3 text-[13px] text-grau">{voll ? 'Das Dock ist voll. Entferne zuerst eine Seite.' : 'Hinzufügen:'}</p>
          <div className="flex flex-wrap gap-2">
            {uebrig.map((s) => (
              <button
                key={s.id}
                onClick={() => speichere([...gewaehlt, s])}
                disabled={voll}
                className="tippbar flex min-h-9 items-center gap-1.5 rounded-full bg-karte2 px-3 text-[14px] disabled:opacity-30"
              >
                <Plus size={14} /> <s.icon size={15} color={s.farbe} /> {s.name}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mt-3 text-[12px] leading-snug text-grau">
        Zum Sortieren eine Zeile gedrückt halten und ziehen. Oben = links im Dock.{' '}
        <button onClick={() => setIds(STANDARD_TABS)} className="underline">
          Standard wiederherstellen
        </button>
      </p>

      <div className="mt-3 flex min-h-12 items-center gap-3 border-t border-linie pt-3">
        <span className="flex-1">
          <span className="block text-[16px]">Knopf links</span>
          <span className="block text-[12px] text-grau">für Linkshänder</span>
        </span>
        <Schalter an={links} onClick={() => setLinks(!links)} label="Dock-Knopf links" />
      </div>
    </Karte>
  )
}
