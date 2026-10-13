// Einstellungen → "Tabs anpassen": welche (höchstens 4) Einträge im Dock stehen und in welcher Reihenfolge.
// Der 5. Tab ist immer "Mehr". Gespeichert als Einstellung "dockTabs" (Liste von IDs, z. B. ["heute","fitness"]).
// Reihenfolge mit Pfeil-Knöpfen statt Ziehen: Das klappt auf dem iPhone zuverlässiger.
import { ArrowDown, ArrowUp, Minus, Plus } from 'lucide-react'
import { MAX_TABS, STANDARD_TABS } from '..'
import { useAusgeblendet } from '../../core/einstellungen'
import Karte from '../../core/ui/Karte'
import { WAEHLBARE_TABS, useDockTabIds, type Tab } from '../../core/ui/TabLeiste'

export default function TabsAnpassen() {
  const [ids, setIds] = useDockTabIds()
  const [ausgeblendet] = useAusgeblendet()
  // Nur gültige, nicht ausgeblendete Einträge (ein ausgeblendeter Bereich kann nicht im Dock stehen)
  const nutzbar = WAEHLBARE_TABS.filter((t) => !ausgeblendet.includes(t.id))
  const gewaehlt = ids.map((id) => nutzbar.find((t) => t.id === id)).filter((t): t is Tab => !!t)
  const uebrig = nutzbar.filter((t) => !gewaehlt.includes(t))
  const voll = gewaehlt.length >= MAX_TABS

  const speichere = (neu: Tab[]) => setIds(neu.map((t) => t.id))
  function verschiebe(i: number, richtung: -1 | 1) {
    const neu = [...gewaehlt]
    ;[neu[i], neu[i + richtung]] = [neu[i + richtung], neu[i]]
    speichere(neu)
  }

  const knopf = 'tippbar flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-karte2 disabled:opacity-30'

  return (
    <Karte titel="Tabs anpassen" rechts={<span className="text-[13px] text-grau">{gewaehlt.length} von {MAX_TABS}</span>}>
      <ul>
        {gewaehlt.map((t, i) => (
          <li key={t.id} className={`flex min-h-12 items-center gap-3 ${i > 0 ? 'border-t border-linie' : ''}`}>
            <t.icon size={20} color={t.farbe} />
            <span className="flex-1 truncate text-[16px]">{t.name}</span>
            <button onClick={() => verschiebe(i, -1)} disabled={i === 0} className={knopf} aria-label={`${t.name} nach links`}>
              <ArrowUp size={16} />
            </button>
            <button onClick={() => verschiebe(i, 1)} disabled={i === gewaehlt.length - 1} className={knopf} aria-label={`${t.name} nach rechts`}>
              <ArrowDown size={16} />
            </button>
            <button onClick={() => speichere(gewaehlt.filter((x) => x !== t))} disabled={gewaehlt.length <= 1} className={`${knopf} text-[#ff453a]`} aria-label={`${t.name} entfernen`}>
              <Minus size={16} />
            </button>
          </li>
        ))}
        <li className="flex min-h-12 items-center gap-3 border-t border-linie text-grau">
          <span className="flex-1 text-[16px]">Mehr</span>
          <span className="text-[13px]">immer dabei</span>
        </li>
      </ul>

      {uebrig.length > 0 && (
        <>
          <p className="mb-1 mt-4 text-[13px] text-grau">{voll ? 'Das Dock ist voll. Entferne zuerst einen Tab.' : 'Hinzufügen:'}</p>
          <div className="flex flex-wrap gap-2">
            {uebrig.map((t) => (
              <button
                key={t.id}
                onClick={() => speichere([...gewaehlt, t])}
                disabled={voll}
                className="tippbar flex min-h-9 items-center gap-1.5 rounded-full bg-karte2 px-3 text-[14px] disabled:opacity-30"
              >
                <Plus size={14} /> <t.icon size={15} color={t.farbe} /> {t.name}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mt-3 text-[12px] leading-snug text-grau">
        Oben in der Liste = links im Dock.{' '}
        <button onClick={() => setIds(STANDARD_TABS)} className="underline">
          Standard wiederherstellen
        </button>
      </p>
    </Karte>
  )
}
