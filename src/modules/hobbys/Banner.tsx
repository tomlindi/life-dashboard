// Kleines Banner oben auf "Heute", solange ein Hobby-Timer läuft. Antippen öffnet Hobbys, ■ stoppt direkt.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Square } from 'lucide-react'
import { db } from '../../core/db'
import { FARBE, stoppeTimer, uhrText, useHobbyLauf } from './timer'

export default function HobbyBanner() {
  const [lauf] = useHobbyLauf()
  const hobby = useLiveQuery(async () => (lauf ? db.hobbys.get(lauf.hobbyId) : undefined), [lauf?.hobbyId])
  const [jetzt, setJetzt] = useState(Date.now())
  useEffect(() => {
    if (!lauf) return
    const t = setInterval(() => setJetzt(Date.now()), 1000)
    return () => clearInterval(t)
  }, [lauf])
  if (!lauf) return null

  const sek = Math.max(0, Math.floor((jetzt - Date.parse(lauf.start)) / 1000))
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-2xl pl-4 pr-1.5" style={{ background: `color-mix(in srgb, ${FARBE} 15%, transparent)` }}>
      <Link to="/hobbys" className="tippbar flex min-h-12 flex-1 items-center gap-3">
        <span className="text-[20px]">{hobby?.emoji ?? '⏱️'}</span>
        <span className="flex-1 text-[15px] font-medium tabular-nums">
          {hobby?.name ?? 'Hobby'} · {uhrText(sek)}
        </span>
      </Link>
      <button onClick={stoppeTimer} className="tippbar flex h-10 items-center gap-1.5 rounded-xl bg-[#ff453a] px-3 text-[14px] font-semibold text-white" aria-label="Hobby-Timer stoppen">
        <Square size={13} fill="currentColor" /> Stopp
      </button>
    </div>
  )
}
