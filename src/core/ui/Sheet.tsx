// Ein Eingabe-Fenster, das von unten hochfährt (wie bei Apple). Für Formulare.
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  titel: string
  offen: boolean
  onZu: () => void
  children: ReactNode
}

export default function Sheet({ titel, offen, onZu, children }: Props) {
  if (!offen) return null
  return (
    // Der dunkle Hintergrund: Antippen schließt das Fenster
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onZu}>
      <div
        // stopPropagation: Tippen im Fenster selbst soll es nicht schließen
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90%] w-full overflow-y-auto rounded-t-3xl bg-karte p-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px] font-bold">{titel}</h2>
          <button onClick={onZu} className="tippbar flex h-10 w-10 items-center justify-center rounded-full bg-karte2" aria-label="Schließen">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
