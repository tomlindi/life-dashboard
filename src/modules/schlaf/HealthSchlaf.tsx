// Schlaf aus Apple Health: Schlafindex der letzten Nacht und Schlafphasen als gestapelte Balken.
// Die Nächte kommen aus den einzelnen Phasen (core/health.ts -> naechte()).
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { kurzerWochentag, letzteTage } from '../../core/datum'
import { stundenText } from '../../core/format'
import { SCHLAF_PHASEN, indexFarbe, schlafIndex, type Nacht } from '../../core/health'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import HealthSymbol from '../../core/ui/HealthSymbol'

const FARBE = '#5e5ce6'



export function SchlafIndexKarte({ nacht, alle, ziel }: { nacht: Nacht; alle: Nacht[]; ziel: number }) {
  const index = schlafIndex(nacht, ziel, alle) // "alle": die Nächte davor zählen für die Regelmäßigkeit
  const farbe = indexFarbe(index.wert)
  return (
    <Karte titel="Schlafindex" akzent={FARBE} rechts={<HealthSymbol />}>
      <div className="flex items-center gap-5">
        <Ring fortschritt={index.wert / 100} farbe={farbe} groesse={96} dicke={12}>
          <p className="text-[26px] font-bold leading-none">{index.wert}</p>
        </Ring>
        <ul className="min-w-0 flex-1 space-y-1">
          {index.teile.map((t) => (
            <li key={t.name} className="flex justify-between text-[14px]">
              <span className="text-grau">{t.name}</span>
              <span>
                {t.punkte}
                <span className="text-grau">/{t.max}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-[12px] leading-snug text-grau">
        {nacht.hatPhasen
          ? 'Eigener Index, nicht Apples Schlafwert: Dauer im Verhältnis zu deinem Ziel (40), Anteil Tief- und REM-Schlaf (25), Wachzeit (15) und wie regelmäßig du einschläfst (20).'
          : 'Eigener Index, nicht Apples Schlafwert. Ohne Schlafphasen (z. B. ohne Apple Watch) zählen nur Dauer im Verhältnis zu deinem Ziel (60) und Regelmäßigkeit der Einschlafzeit (40).'}
      </p>
    </Karte>
  )
}

/** Schlafphasen der letzten 7 Nächte als gestapelte Balken (wie in der Health-App). */
export function PhasenKarte({ naechte }: { naechte: Nacht[] }) {
  const nachDatum = new Map(naechte.map((n) => [n.datum, n]))
  const daten = letzteTage(7).map((tag) => {
    const n = nachDatum.get(tag)
    const zeile: Record<string, number | string> = { tag, name: kurzerWochentag(tag).slice(0, 2) }
    for (const p of SCHLAF_PHASEN) zeile[p.key] = n ? n.minuten[p.key] / 60 : 0
    return zeile
  })
  // Nur Phasen in der Legende zeigen, die auch vorkommen (ohne Uhr gibt es z. B. nur "Schlafend")
  const vorhanden = SCHLAF_PHASEN.filter((p) => daten.some((d) => Number(d[p.key]) > 0))
  // Von unten nach oben: Tief, Kern, REM, Schlafend, Wach
  const stapel = [...vorhanden].reverse()

  return (
    <Karte titel="Schlafphasen (7 Nächte)" akzent={FARBE} rechts={<HealthSymbol />}>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={daten} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
            <Tooltip
              cursor={false}
              contentStyle={{ background: 'var(--color-karte2)', border: 'none', borderRadius: 12, color: 'var(--color-text)', fontSize: 13 }}
              formatter={(v, name) => [stundenText(Math.round(Number(v) * 60) / 60), SCHLAF_PHASEN.find((p) => p.key === name)?.name ?? String(name)]}
              labelFormatter={() => ''}
            />
            {stapel.map((p, i) => (
              <Bar key={p.key} dataKey={p.key} stackId="nacht" fill={p.farbe} radius={i === stapel.length - 1 ? [4, 4, 0, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {vorhanden.map((p) => (
          <span key={p.key} className="flex items-center gap-1.5 text-[12px] text-grau">
            <span className="h-2 w-2 rounded-full" style={{ background: p.farbe }} />
            {p.name}
          </span>
        ))}
      </div>
    </Karte>
  )
}
