// Drei kleine Kacheln auf der Heute-Seite: Schritte, letzte Nacht (Dauer + Schlafindex) und Wasser.
// Ein Herz zeigt, dass der Wert aus Apple Health kommt. Antippen öffnet den passenden Bereich.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db'
import { heute, tagPlus } from '../../core/datum'
import { stundenText, zahl } from '../../core/format'
import { useEinstellung, useSchrittziel, useWasserziel } from '../../core/einstellungen'
import { indexFarbe, schlafIndex } from '../../core/health'
import { GLAS_ML, useHealthNaechte, useHealthTage } from '../../core/healthDaten'
import HealthSymbol from '../../core/ui/HealthSymbol'
import { wasserMl } from '../ernaehrung/health'

function Kachel({ to, titel, farbe, health, children, fortschritt }: { to: string; titel: string; farbe: string; health: boolean; children: ReactNode; fortschritt?: number }) {
  return (
    <Link to={to} className="tippbar flex min-h-[92px] flex-col justify-between rounded-3xl bg-karte p-3">
      <p className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: farbe }}>
        {titel} {health && <HealthSymbol groesse={10} />}
      </p>
      <div>{children}</div>
      {/* dünner Fortschrittsbalken zum Tagesziel */}
      {fortschritt !== undefined && (
        <span className="mt-1.5 block h-1 overflow-hidden rounded-full" style={{ background: farbe + '33' }}>
          <span className="block h-full rounded-full" style={{ width: `${Math.min(100, fortschritt * 100)}%`, background: farbe }} />
        </span>
      )}
    </Link>
  )
}

export default function HealthKacheln() {
  const tag = heute()
  const [schrittziel] = useSchrittziel()
  const [schlafZiel] = useEinstellung<number>('schlafZiel', 8)
  const [wasserziel] = useWasserziel()
  const health = useHealthTage(['schritte', 'wasser'], 1)
  const schritte = useLiveQuery(() => db.schritte.get(tag), [tag])?.anzahl ?? 0
  const glaeser = useLiveQuery(async () => new Map((await db.wasser.where('datum').equals(tag).toArray()).map((w) => [w.datum, w.glaeser])), [tag]) ?? new Map<string, number>()
  const schlaf = useLiveQuery(async () => (await db.schlaf.get(tag)) ?? (await db.schlaf.get(tagPlus(tag, -1))), [tag])
  const naechte = useHealthNaechte(14)
  const nacht = schlaf ? naechte.find((n) => n.datum === schlaf.datum) : undefined
  const index = nacht ? schlafIndex(nacht, schlafZiel, naechte).wert : undefined
  const ml = wasserMl(tag, health.wasser, glaeser)

  return (
    <div className="grid grid-cols-3 gap-3">
      <Kachel to="/fitness" titel="Schritte" farbe="#30d158" health={health.schritte?.has(tag) ?? false} fortschritt={schritte / schrittziel}>
        <p className="text-[20px] font-bold leading-tight">{schritte.toLocaleString('de-DE')}</p>
      </Kachel>
      <Kachel to="/schlaf" titel="Schlaf" farbe="#5e5ce6" health={schlaf?.quelle === 'health'}>
        <p className="text-[20px] font-bold leading-tight">{schlaf ? stundenText(Math.round(schlaf.stunden * 60) / 60).replace(' min', '') : '–'}</p>
        {index !== undefined && (
          <p className="text-[12px] text-grau">
            Index <b style={{ color: indexFarbe(index) }}>{index}</b>
          </p>
        )}
      </Kachel>
      <Kachel to="/ernaehrung" titel="Wasser" farbe="#64d2ff" health={health.wasser?.has(tag) ?? false} fortschritt={ml / (wasserziel * GLAS_ML)}>
        <p className="text-[20px] font-bold leading-tight">
          {zahl(ml / 1000, 2)}
          <span className="ml-0.5 text-[13px] font-medium text-grau">l</span>
        </p>
      </Kachel>
    </div>
  )
}
