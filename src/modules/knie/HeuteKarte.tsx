// Kleine Karte auf "Heute": Tag nach der OP und wie viele Physio-Übungen heute schon erledigt sind.
// Antippen öffnet den Bereich Knie. Ausblenden: Einstellungen → Heute anpassen.
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bandage, ChevronRight } from 'lucide-react'
import { db } from '../../core/db'
import { heute } from '../../core/datum'
import { useEinstellung, useAusgeblendet } from '../../core/einstellungen'
import { Balken } from '../../core/ui/Formular'
import { FARBE, seitOp, STANDARD_OP_DATUM } from './reha'

export default function KnieKarte() {
  const [ausgeblendet] = useAusgeblendet()
  const [opDatum] = useEinstellung('rehaOpDatum', STANDARD_OP_DATUM)
  const daten = useLiveQuery(async () => {
    const aktive = (await db.rehaUebungen.toArray()).filter((u) => u.aktiv)
    const tag = await db.rehaTage.get(heute())
    return { gesamt: aktive.length, erledigt: aktive.filter((u) => tag?.erledigt.includes(u.id)).length }
  }, [])
  if (ausgeblendet.includes('knie') || !daten) return null
  const { tage, woche } = seitOp(opDatum)

  return (
    <Link to="/knie" className="tippbar flex items-center gap-3 rounded-3xl bg-karte p-4">
      <Bandage size={26} color={FARBE} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">
          Knie · Tag {Math.max(0, tage)} <span className="font-normal text-grau">· Woche {woche}</span>
        </p>
        {daten.gesamt > 0 ? (
          <div className="mt-1.5 flex items-center gap-2">
            <Balken wert={daten.erledigt / daten.gesamt} farbe={FARBE} />
            <span className="shrink-0 text-[13px] tabular-nums text-grau">
              {daten.erledigt}/{daten.gesamt}
            </span>
          </div>
        ) : (
          <p className="text-[13px] text-grau">Physio-Übungen eintragen</p>
        )}
      </div>
      <ChevronRight size={18} className="shrink-0 text-grau" />
    </Link>
  )
}
