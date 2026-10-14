// Einstellungen → "Heute anpassen": jede Karte der Startseite ein-/ausschalten und per Ziehen sortieren.
import { GripVertical } from 'lucide-react'
import Karte from '../../core/ui/Karte'
import { Schalter } from '../../core/ui/Formular'
import SortierListe from '../../core/ui/SortierListe'
import { HEUTE_KARTEN, useHeuteKarten } from '../heute/karten'

export default function HeuteAnpassen() {
  const [karten, setKarten, zuruecksetzen] = useHeuteKarten()
  const an = karten.filter((k) => k.an).length

  return (
    <Karte titel="Heute anpassen" rechts={<span className="text-[13px] text-grau">{an} von {karten.length} an</span>}>
      <SortierListe eintraege={karten} schluessel={(k) => k.id} onNeueReihenfolge={setKarten}>
        {(k, zieht) => {
          const info = HEUTE_KARTEN.find((h) => h.id === k.id)!
          return (
            <div className={`flex min-h-12 items-center gap-3 rounded-xl px-1 ${zieht ? 'bg-karte2' : ''}`}>
              <GripVertical size={18} className="shrink-0 text-grau" />
              <span className={`min-w-0 flex-1 ${k.an ? '' : 'text-grau'}`}>
                <span className="block truncate text-[16px]">{info.name}</span>
                {'info' in info && <span className="block truncate text-[12px] text-grau">{info.info}</span>}
              </span>
              <Schalter an={k.an} onClick={() => setKarten(karten.map((x) => (x.id === k.id ? { ...x, an: !x.an } : x)))} label={`${info.name} anzeigen`} />
            </div>
          )
        }}
      </SortierListe>
      <p className="mt-3 text-[12px] leading-snug text-grau">
        Zum Sortieren eine Zeile gedrückt halten und ziehen.{' '}
        <button onClick={zuruecksetzen} className="underline">
          Standard wiederherstellen
        </button>
      </p>
    </Karte>
  )
}
