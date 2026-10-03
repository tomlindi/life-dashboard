// Fortschrittsring wie in Apples Fitness-App.
// Gezeichnet als SVG: ein grauer Kreis als Hintergrund und ein farbiger Kreis,
// von dem wir nur den Teil sichtbar machen, der dem Fortschritt entspricht.
import type { ReactNode } from 'react'

interface Props {
  fortschritt: number // 0 bis 1 (mehr als 1 ist erlaubt, der Ring bleibt dann voll)
  farbe: string
  groesse?: number // Durchmesser in Pixeln
  dicke?: number // Strichdicke
  children?: ReactNode // Inhalt in der Mitte (z. B. eine Zahl)
}

export default function Ring({ fortschritt, farbe, groesse = 96, dicke = 12, children }: Props) {
  const radius = (groesse - dicke) / 2
  const umfang = 2 * Math.PI * radius // Länge des Kreises
  const anteil = Math.min(Math.max(fortschritt, 0), 1)

  return (
    <div className="relative shrink-0" style={{ width: groesse, height: groesse }}>
      {/* -rotate-90: der Ring beginnt oben statt rechts */}
      <svg width={groesse} height={groesse} className="-rotate-90">
        {/* Hintergrundring: gleiche Farbe, aber stark abgedunkelt */}
        <circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={radius}
          fill="none"
          stroke={farbe}
          strokeOpacity={0.2}
          strokeWidth={dicke}
        />
        {/* Fortschritt: strokeDasharray = "gefüllt, Rest". Runde Enden wie bei Apple. */}
        <circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={radius}
          fill="none"
          stroke={farbe}
          strokeWidth={dicke}
          strokeLinecap="round"
          strokeDasharray={`${umfang * anteil} ${umfang}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>
    </div>
  )
}
