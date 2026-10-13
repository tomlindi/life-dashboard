// Einstellungen → "Kalenderfarben": pro Kalender eine der 12 Apple-Farben wählen.
// Antippen klappt eine Zeile mit allen Farben auf, ein Tap auf eine Farbe speichert sofort.
import { useState } from 'react'
import { Check } from 'lucide-react'
import Karte from '../../core/ui/Karte'
import { Leer } from '../../core/ui/Formular'
import { APPLE_FARBEN, setzeKalenderFarbe, useKalenderFarben } from './farben'

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
              {offen === name && (
                // 12 Farben in zwei Reihen à 6
                <div className="grid grid-cols-6 gap-2 pb-3">
                  {APPLE_FARBEN.map((f) => (
                    <button
                      key={f.hex}
                      onClick={() => {
                        void setzeKalenderFarbe(name, f.hex)
                        setOffen(null)
                      }}
                      aria-label={f.name}
                      className="tippbar flex aspect-square items-center justify-center rounded-full"
                      style={{ background: f.hex }}
                    >
                      {farbe(name) === f.hex && <Check size={18} color="#000" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
