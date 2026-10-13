// Kleines Banner oben auf der Heute-Seite, solange der Fokus-Timer läuft oder auf "Start" wartet.
// Antippen öffnet den Bereich Fokus. Läuft eine Phase hier ab, wird sie genauso abgeschlossen wie auf der Fokus-Seite.
import { Link } from 'react-router-dom'
import { ChevronRight, Timer } from 'lucide-react'
import { useFokusUhr } from './lauf'
import { PHASEN_NAME, laeuft, restMs, uhrText, vergangenMs } from './timer'

const FARBE = '#ff9f0a'

export default function FokusBanner() {
  const { lauf, jetzt } = useFokusUhr()
  if (!lauf) return null

  const text =
    lauf.art === 'stoppuhr'
      ? `Stoppuhr · ${uhrText(vergangenMs(lauf, jetzt))}${laeuft(lauf) ? '' : ' (angehalten)'}`
      : lauf.bereit
        ? `${PHASEN_NAME[lauf.phase]} bereit · antippen zum Starten`
        : `${PHASEN_NAME[lauf.phase]} · ${uhrText(Math.max(0, restMs(lauf, jetzt)))} übrig${laeuft(lauf) ? '' : ' (angehalten)'}`

  return (
    <Link to="/fokus" className="tippbar flex min-h-12 items-center gap-3 rounded-2xl px-4" style={{ background: FARBE + '26' }}>
      <Timer size={20} color={FARBE} />
      <span className="flex-1 text-[15px] font-medium tabular-nums">{text}</span>
      <ChevronRight size={18} className="text-grau" />
    </Link>
  )
}
