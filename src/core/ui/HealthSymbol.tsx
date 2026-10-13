// Kleines Herz wie das Symbol der Health-App: "Dieser Wert kommt aus Apple Health".
import { Heart } from 'lucide-react'

export default function HealthSymbol({ groesse = 13 }: { groesse?: number }) {
  return (
    <span title="aus Apple Health" aria-label="aus Apple Health" className="inline-flex shrink-0 items-center">
      <Heart size={groesse} color="#FF375F" fill="#FF375F" />
    </span>
  )
}
