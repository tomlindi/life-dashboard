// Die 12 Apple-Farben als Kreise zum Antippen (zwei Reihen à 6).
// Gemeinsam genutzt von Einstellungen → Kalenderfarben und dem Blatt "Kalender" auf der Kalender-Seite.
import { Check } from 'lucide-react'
import { APPLE_FARBEN, setzeKalenderFarbe } from './farben'

export default function FarbAuswahl({ name, aktuell, onFertig }: { name: string; aktuell: string; onFertig: () => void }) {
  return (
    <div className="grid grid-cols-6 gap-2 pb-3">
      {APPLE_FARBEN.map((f) => (
        <button
          key={f.hex}
          onClick={() => {
            void setzeKalenderFarbe(name, f.hex)
            onFertig()
          }}
          aria-label={f.name}
          className="tippbar flex aspect-square items-center justify-center rounded-full"
          style={{ background: f.hex }}
        >
          {aktuell === f.hex && <Check size={18} color="#000" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}
