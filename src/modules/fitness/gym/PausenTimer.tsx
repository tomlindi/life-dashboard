// Pausen-Countdown: erscheint unten, nachdem du einen Satz abgehakt hast.
// Das Ende der Pause wird im Training gespeichert. So läuft der Timer weiter,
// auch wenn du kurz die App wechselst.
import { useEffect, useRef, useState } from 'react'
import { db } from '../../../core/db'

/** Kurzer Piepton über die Web-Audio-Schnittstelle (ohne Sound-Datei). */
function piep() {
  try {
    const ctx = new AudioContext()
    for (const [verzoegerung, frequenz] of [[0, 880], [0.25, 880], [0.5, 1320]]) {
      const ton = ctx.createOscillator()
      const lautstaerke = ctx.createGain()
      ton.frequency.value = frequenz
      lautstaerke.gain.setValueAtTime(0.25, ctx.currentTime + verzoegerung)
      lautstaerke.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + verzoegerung + 0.2)
      ton.connect(lautstaerke).connect(ctx.destination)
      ton.start(ctx.currentTime + verzoegerung)
      ton.stop(ctx.currentTime + verzoegerung + 0.2)
    }
  } catch {
    // Ton nicht möglich (z. B. Stummschaltung) – dann eben nur die Anzeige
  }
}

export default function PausenTimer({ einheitId, pauseEnde }: { einheitId: string; pauseEnde?: string }) {
  const [jetzt, setJetzt] = useState(Date.now())
  const [fertig, setFertig] = useState(false)
  const gepiept = useRef<string | null>(null)

  // Jede Viertelsekunde neu zeichnen, solange eine Pause läuft
  useEffect(() => {
    if (!pauseEnde) return
    setFertig(false)
    const t = setInterval(() => setJetzt(Date.now()), 250)
    return () => clearInterval(t)
  }, [pauseEnde])

  const rest = pauseEnde ? Math.ceil((Date.parse(pauseEnde) - jetzt) / 1000) : 0

  // Pause vorbei: piepen, kurz "Weiter geht's!" zeigen, dann ausblenden
  useEffect(() => {
    if (pauseEnde && rest <= 0 && gepiept.current !== pauseEnde) {
      gepiept.current = pauseEnde
      piep()
      setFertig(true)
      const t = setTimeout(() => db.gymEinheiten.update(einheitId, { pauseEnde: undefined }), 4000)
      return () => clearTimeout(t)
    }
  }, [rest, pauseEnde, einheitId])

  if (!pauseEnde) return null

  const verschiebe = (sek: number) => db.gymEinheiten.update(einheitId, { pauseEnde: new Date(Date.parse(pauseEnde) + sek * 1000).toISOString() })
  const minuten = Math.floor(Math.max(0, rest) / 60)
  const sekunden = String(Math.max(0, rest) % 60).padStart(2, '0')

  return (
    <div className="fixed inset-x-3 z-40" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 62px)' }}>
      <div className={`flex items-center gap-2 rounded-2xl p-3 shadow-lg ${fertig ? 'bg-[#30d158] text-black' : 'bg-karte2'}`}>
        <div className="flex-1">
          <p className={`text-[12px] ${fertig ? '' : 'text-grau'}`}>{fertig ? 'Pause vorbei' : 'Pause'}</p>
          <p className="text-[28px] font-bold tabular-nums leading-none">{fertig ? "Weiter geht's! 💪" : `${minuten}:${sekunden}`}</p>
        </div>
        {!fertig && (
          <>
            <button onClick={() => verschiebe(-15)} className="tippbar h-11 rounded-xl bg-black/40 px-3 text-[14px] font-semibold">
              −15
            </button>
            <button onClick={() => verschiebe(15)} className="tippbar h-11 rounded-xl bg-black/40 px-3 text-[14px] font-semibold">
              +15
            </button>
          </>
        )}
        <button
          onClick={() => db.gymEinheiten.update(einheitId, { pauseEnde: undefined })}
          className={`tippbar h-11 rounded-xl px-3 text-[14px] font-semibold ${fertig ? 'bg-black/20' : 'bg-[#ff375f] text-black'}`}
        >
          {fertig ? 'OK' : 'Skip'}
        </button>
      </div>
    </div>
  )
}
