// App-Icons für das Dock, im Stil von Apples eigenen Icons.
// Alles ist als SVG gezeichnet (Hintergrund + Symbol), damit es auf dem iPhone gestochen scharf ist.
//   heute   -> wie Apples Kalender-Icon (weiß, Wochentag rot, Datum groß) – zeigt immer das heutige Datum
//   fitness -> wie Apples Fitness-App (schwarz mit drei Ringen)
//   schule / ziele / mehr -> Farbverlauf + gefülltes Symbol im Stil der SF Symbols
import type { LucideIcon } from 'lucide-react'

const GROESSE = 56
const ECKE = 13 // ca. 23 % der Breite: so rund sind Apples App-Icons

/** Hintergrund mit sanftem Verlauf von hell (oben) nach kräftig (unten), wie bei iOS-Icons. */
function Verlauf({ id, oben, unten }: { id: string; oben: string; unten: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={oben} />
          <stop offset="1" stopColor={unten} />
        </linearGradient>
      </defs>
      <rect width={GROESSE} height={GROESSE} rx={ECKE} fill={`url(#${id})`} />
    </>
  )
}

function KalenderIcon() {
  const d = new Date()
  const tag = d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '').toUpperCase()
  return (
    <svg width={GROESSE} height={GROESSE} viewBox={`0 0 ${GROESSE} ${GROESSE}`}>
      <rect width={GROESSE} height={GROESSE} rx={ECKE} fill="#fff" />
      <text x="28" y="17" textAnchor="middle" fontSize="10" fontWeight="600" fill="#ff3b30" fontFamily="-apple-system, system-ui, sans-serif">
        {tag}
      </text>
      <text x="28" y="45" textAnchor="middle" fontSize="29" fontWeight="300" fill="#000" fontFamily="-apple-system, system-ui, sans-serif">
        {d.getDate()}
      </text>
    </svg>
  )
}

function FitnessIcon() {
  // Drei Ringe wie bei Apple: Bewegen (rot), Trainieren (grün), Stehen (türkis)
  const ringe = [
    { r: 19, farbe: '#fa114f', anteil: 0.78 },
    { r: 13, farbe: '#a6ff00', anteil: 0.62 },
    { r: 7, farbe: '#00f0ff', anteil: 0.85 },
  ]
  return (
    <svg width={GROESSE} height={GROESSE} viewBox={`0 0 ${GROESSE} ${GROESSE}`}>
      <rect width={GROESSE} height={GROESSE} rx={ECKE} fill="#000" />
      <rect x="0.5" y="0.5" width={GROESSE - 1} height={GROESSE - 1} rx={ECKE - 0.5} fill="none" stroke="#ffffff22" />
      <g transform="rotate(-90 28 28)">
        {ringe.map((ring) => {
          const umfang = 2 * Math.PI * ring.r
          return (
            <g key={ring.r}>
              <circle cx="28" cy="28" r={ring.r} fill="none" stroke={ring.farbe} strokeOpacity="0.25" strokeWidth="5" />
              <circle cx="28" cy="28" r={ring.r} fill="none" stroke={ring.farbe} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${umfang * ring.anteil} ${umfang}`} />
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function SchuleIcon() {
  return (
    <svg width={GROESSE} height={GROESSE} viewBox={`0 0 ${GROESSE} ${GROESSE}`}>
      <Verlauf id="v-schule" oben="#ffb340" unten="#ff8000" />
      {/* Doktorhut (wie SF Symbol "graduationcap.fill") */}
      <path d="M28 13 L48 22 L28 31 L8 22 Z" fill="#fff" />
      <path d="M17 26.5 V34 C17 37.5 22 40 28 40 C34 40 39 37.5 39 34 V26.5 L28 31.5 Z" fill="#fff" />
      <path d="M44 23.8 V34" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="44" cy="35.5" r="2.2" fill="#fff" />
    </svg>
  )
}

function ZieleIcon() {
  return (
    <svg width={GROESSE} height={GROESSE} viewBox={`0 0 ${GROESSE} ${GROESSE}`}>
      <Verlauf id="v-ziele" oben="#d17bff" unten="#8a35db" />
      {/* Zielscheibe (wie SF Symbol "target") */}
      <circle cx="28" cy="28" r="16" fill="none" stroke="#fff" strokeWidth="4" />
      <circle cx="28" cy="28" r="9" fill="none" stroke="#fff" strokeWidth="4" />
      <circle cx="28" cy="28" r="3.2" fill="#fff" />
    </svg>
  )
}

function MehrIcon() {
  return (
    <svg width={GROESSE} height={GROESSE} viewBox={`0 0 ${GROESSE} ${GROESSE}`}>
      <Verlauf id="v-mehr" oben="#a1a1a6" unten="#5f5f64" />
      {/* 2×2-Raster (wie SF Symbol "square.grid.2x2.fill") */}
      {[
        [15, 15],
        [30, 15],
        [15, 30],
        [30, 30],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="11" height="11" rx="3.2" fill="#fff" />
      ))}
    </svg>
  )
}

/** Allgemeines Icon für Bereiche ohne eigenes Design: Farbverlauf in der Bereichsfarbe + Lucide-Symbol. */
function StandardIcon({ farbe, icon: Icon }: { farbe: string; icon: LucideIcon }) {
  return (
    <span className="relative flex items-center justify-center" style={{ width: GROESSE, height: GROESSE }}>
      <svg width={GROESSE} height={GROESSE} viewBox={`0 0 ${GROESSE} ${GROESSE}`} className="absolute inset-0">
        <Verlauf id={`v-${farbe.slice(1)}`} oben={`${farbe}b3`} unten={farbe} />
      </svg>
      <Icon size={28} color="#fff" strokeWidth={2.4} className="relative" />
    </span>
  )
}

export function AppIcon({ id, farbe, icon }: { id: string; farbe: string; icon: LucideIcon }) {
  if (id === 'heute') return <KalenderIcon />
  if (id === 'fitness') return <FitnessIcon />
  if (id === 'schule') return <SchuleIcon />
  if (id === 'ziele') return <ZieleIcon />
  if (id === 'mehr') return <MehrIcon />
  return <StandardIcon farbe={farbe} icon={icon} />
}
