// Einstellungen → "Kalenderfarben": pro Kalender eine der 12 Apple-Farben wählen.
// Antippen klappt eine Zeile mit allen Farben auf, ein Tap auf eine Farbe speichert sofort.
import { useState } from 'react'
import Karte from '../../core/ui/Karte'
import { Leer } from '../../core/ui/Formular'
import { APPLE_FARBEN, useKalenderFarben } from './farben'
import FarbAuswahl from './FarbAuswahl'

export default function KalenderFarbenEinstellung() {
  const { namen, farbe } = useKalenderFarben()
  const [offen, setOffen] = useState<string | null>(null)

  return (
    <Karte titel="Kalenderfarben" akzent="#ff453a">
      {namen.length === 0 ? (
        <Leer>Noch keine Kalender. Sie erscheinen hier nach dem ersten Import.</Leer>
      ) : (
        <ul>
          {namen.map((name, i) => (
            <li key={name} className={i > 0 ? 'border-t border-linie' : ''}>
              <button onClick={() => setOffen(offen === name ? null : name)} className="tippbar flex min-h-12 w-full items-center gap-3 text-left">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: farbe(name) }} />
                <span className="flex-1 truncate text-[16px]">{name}</span>
                <span className="text-[13px] text-grau">{APPLE_FARBEN.find((f) => f.hex === farbe(name))?.name ?? ''}</span>
              </button>
              {offen === name && <FarbAuswahl name={name} aktuell={farbe(name)} onFertig={() => setOffen(null)} />}
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
