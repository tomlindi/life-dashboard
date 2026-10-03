// Vorläufige Seite für Bereiche, die wir noch nicht gebaut haben.
// Wird Schritt für Schritt durch echte Seiten ersetzt.
import type { LucideIcon } from 'lucide-react'
import Seite from './Seite'

interface Props {
  titel: string
  icon: LucideIcon
  farbe: string
}

export default function Platzhalter({ titel, icon: Icon, farbe }: Props) {
  return (
    <Seite titel={titel} farbe={farbe}>
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-karte px-6 py-16 text-center">
        <Icon size={44} color={farbe} strokeWidth={1.6} />
        <p className="text-[17px] font-semibold">Kommt bald</p>
        <p className="text-[14px] text-grau">Dieser Bereich wird in einem der nächsten Schritte gebaut.</p>
      </div>
    </Seite>
  )
}
