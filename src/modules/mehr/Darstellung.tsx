// Einstellungen → "Darstellung": Hell, Dunkel oder Automatisch (wie das iPhone eingestellt ist).
import { Moon, Smartphone, Sun, type LucideIcon } from 'lucide-react'
import { useDarstellung, type Darstellung as Wahl } from '../../core/darstellung'
import Karte from '../../core/ui/Karte'

const OPTIONEN: { wert: Wahl; name: string; icon: LucideIcon }[] = [
  { wert: 'hell', name: 'Hell', icon: Sun },
  { wert: 'dunkel', name: 'Dunkel', icon: Moon },
  { wert: 'auto', name: 'Automatisch', icon: Smartphone },
]

export default function Darstellung() {
  const [darstellung, setDarstellung] = useDarstellung()
  return (
    <Karte titel="Darstellung">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-karte2 p-1">
        {OPTIONEN.map((o) => {
          const an = darstellung === o.wert
          return (
            <button
              key={o.wert}
              onClick={() => setDarstellung(o.wert)}
              className="tippbar flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[13px] font-semibold"
              style={{ background: an ? 'var(--color-segment)' : 'transparent', color: an ? 'var(--color-text)' : 'var(--color-grau)' }}
              aria-pressed={an}
            >
              <o.icon size={20} />
              {o.name}
            </button>
          )
        })}
      </div>
      {darstellung === 'auto' && <p className="mt-2 text-[13px] text-grau">Folgt der Einstellung deines iPhones (hell am Tag, dunkel am Abend, wenn du das so eingestellt hast).</p>}
    </Karte>
  )
}
