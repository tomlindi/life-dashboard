// Karte "Nächste Klausur" auf Heute: wann, welches Fach, wie viel schon dafür gelernt (Fokus-Timer, letzte 14 Tage).
// "Lernen" wählt das Fach im Fokus-Timer und öffnet ihn.
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Timer } from 'lucide-react'
import { kurzDatum, minutenText, relativ } from '../../core/format'
import Karte from '../../core/ui/Karte'
import { LERN_TAGE, useNaechsteKlausur, waehleLernfach } from '../schule/lernzeit'

const ROT = '#ff453a'

export default function NaechsteKlausur() {
  const naechste = useNaechsteKlausur()
  const navigate = useNavigate()
  if (!naechste) return null // keine Klausur geplant (oder lädt noch)

  const { klausur, minuten } = naechste
  const farbe = klausur.fach?.farbe ?? ROT
  return (
    <Karte titel="Nächste Klausur" akzent={ROT}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `color-mix(in srgb, ${farbe} 20%, transparent)` }}>
          <GraduationCap size={22} color={farbe} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold">{klausur.fach ? klausur.fach.name : klausur.titel}</p>
          <p className="text-[14px] text-grau">
            {relativ(klausur.datum)} · {kurzDatum(klausur.datum)}
          </p>
        </div>
      </div>
      {klausur.fach && (
        <div className="mt-3 flex items-center gap-2">
          <p className="flex-1 text-[14px] text-grau">
            Gelernt (letzte {LERN_TAGE} Tage): <b className="text-text">{minutenText(minuten)}</b>
          </p>
          <button
            onClick={async () => {
              await waehleLernfach(klausur.fach!.id)
              navigate('/fokus')
            }}
            className="tippbar flex h-10 items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold text-black"
            style={{ background: farbe }}
          >
            <Timer size={16} /> Lernen
          </button>
        </div>
      )}
    </Karte>
  )
}
