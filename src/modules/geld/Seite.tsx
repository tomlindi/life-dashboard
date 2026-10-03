// Bereich "Geld": Kontostand, Einnahmen/Ausgaben, Ausgaben pro Monat, Sparziele.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Plus } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { db, type Buchung } from '../../core/db'
import { heute } from '../../core/datum'
import { euro, kurzDatum } from '../../core/format'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import { Balken, Leer, LoeschKnopf, PlusKnopf } from '../../core/ui/Formular'
import { BuchungFormular, SparzielFormular } from './Formulare'

const FARBE = '#64d2ff'
const GRUEN = '#30d158'
const ROT = '#ff453a'

/** Die letzten n Monate als "JJJJ-MM", ältester zuerst. */
function letzteMonate(n: number): string[] {
  const jetzt = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(jetzt.getFullYear(), jetzt.getMonth() - (n - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}
const monatsName = (m: string) => new Date(m + '-15').toLocaleDateString('de-DE', { month: 'short' }).replace('.', '')
const summe = (liste: Buchung[]) => liste.reduce((s, b) => s + b.betrag, 0)

export default function GeldSeite() {
  const buchungen = useLiveQuery(() => db.buchungen.orderBy('datum').reverse().toArray(), []) ?? []
  const sparziele = useLiveQuery(() => db.sparziele.toArray(), []) ?? []
  const [formular, setFormular] = useState<'einnahme' | 'ausgabe' | null>(null)
  const [sparzielOffen, setSparzielOffen] = useState(false)

  const einnahmen = buchungen.filter((b) => b.art === 'einnahme')
  const ausgaben = buchungen.filter((b) => b.art === 'ausgabe')
  const kontostand = summe(einnahmen) - summe(ausgaben)

  const dieserMonat = heute().slice(0, 7) // "2026-10"
  const ausgabenMonat = ausgaben.filter((b) => b.datum.startsWith(dieserMonat))
  const einnahmenMonat = einnahmen.filter((b) => b.datum.startsWith(dieserMonat))

  // Diagramm: Ausgaben pro Monat (letzte 6 Monate)
  const monatsDaten = letzteMonate(6).map((m) => ({ name: monatsName(m), betrag: summe(ausgaben.filter((b) => b.datum.startsWith(m))) }))

  // Ausgaben dieses Monats nach Kategorie, größte zuerst
  const proKategorie = Object.entries(
    ausgabenMonat.reduce<Record<string, number>>((acc, b) => ({ ...acc, [b.kategorie]: (acc[b.kategorie] ?? 0) + b.betrag }), {}),
  ).sort((a, b) => b[1] - a[1])
  const groesste = proKategorie[0]?.[1] ?? 1

  return (
    <Seite titel="Geld" farbe={FARBE}>
      {/* Kontostand */}
      <Karte>
        <p className="text-[13px] text-grau">Kontostand</p>
        <p className="text-[40px] font-bold leading-tight" style={{ color: kontostand >= 0 ? '#fff' : ROT }}>
          {euro(kontostand)}
        </p>
        <div className="mt-2 flex gap-4 text-[14px]">
          <span style={{ color: GRUEN }}>+{euro(summe(einnahmenMonat))}</span>
          <span style={{ color: ROT }}>−{euro(summe(ausgabenMonat))}</span>
          <span className="text-grau">diesen Monat</span>
        </div>
      </Karte>

      {/* Zwei große Knöpfe: so ist eine Ausgabe in 3 Taps eingetragen */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setFormular('einnahme')} className="tippbar flex h-14 items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold text-black" style={{ background: GRUEN }}>
          <Plus size={20} /> Einnahme
        </button>
        <button onClick={() => setFormular('ausgabe')} className="tippbar flex h-14 items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold text-black" style={{ background: ROT }}>
          <Minus size={20} /> Ausgabe
        </button>
      </div>

      <Karte titel="Ausgaben pro Monat" akzent={ROT}>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monatsDaten} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={false}
                contentStyle={{ background: '#2c2c2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13 }}
                formatter={(v) => [euro(Number(v)), 'Ausgaben']}
                labelFormatter={() => ''}
              />
              <Bar dataKey="betrag" fill={ROT} radius={[6, 6, 6, 6]} minPointSize={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {proKategorie.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[13px] text-grau">Diesen Monat nach Kategorie</p>
            {proKategorie.map(([kat, betrag]) => (
              <div key={kat}>
                <div className="mb-1 flex justify-between text-[14px]">
                  <span>{kat}</span>
                  <span className="text-grau">{euro(betrag)}</span>
                </div>
                <Balken wert={betrag / groesste} farbe={ROT} />
              </div>
            ))}
          </div>
        )}
      </Karte>

      {/* Sparziele */}
      <Karte titel="Sparziele" akzent={FARBE} rechts={<PlusKnopf farbe={FARBE} onClick={() => setSparzielOffen(true)} label="Ziel" />}>
        {sparziele.length === 0 ? (
          <Leer>Noch keine Sparziele. Worauf sparst du?</Leer>
        ) : (
          <ul className="space-y-4">
            {sparziele.map((s) => (
              <li key={s.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[16px] font-semibold">{s.name}</span>
                  <span className="text-[14px] text-grau">
                    {euro(s.gespart)} / {euro(s.ziel)}
                  </span>
                </div>
                <Balken wert={s.gespart / s.ziel} farbe={s.gespart >= s.ziel ? GRUEN : FARBE} />
                <div className="mt-2 flex items-center gap-2">
                  {[-5, 5, 10, 20].map((d) => (
                    <button
                      key={d}
                      onClick={() => db.sparziele.update(s.id, { gespart: Math.max(0, s.gespart + d) })}
                      className="tippbar h-10 flex-1 rounded-xl bg-karte2 text-[14px] font-semibold"
                      style={{ color: d > 0 ? FARBE : '#8e8e93' }}
                    >
                      {d > 0 ? `+${d}` : d} €
                    </button>
                  ))}
                  <LoeschKnopf frage={`Sparziel „${s.name}“ löschen?`} onLoeschen={() => db.sparziele.delete(s.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Karte>

      {/* Letzte Buchungen */}
      <Karte titel="Buchungen">
        {buchungen.length === 0 ? (
          <Leer>Noch keine Einnahmen oder Ausgaben.</Leer>
        ) : (
          <ul>
            {buchungen.slice(0, 40).map((b, i) => (
              <li key={b.id} className={`flex min-h-14 items-center gap-3 ${i > 0 ? 'border-t border-linie' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px]">{b.notiz ?? b.kategorie}</p>
                  <p className="text-[13px] text-grau">
                    {b.notiz ? `${b.kategorie} · ` : ''}
                    {kurzDatum(b.datum)}
                  </p>
                </div>
                <span className="text-[16px] font-semibold" style={{ color: b.art === 'einnahme' ? GRUEN : '#fff' }}>
                  {b.art === 'einnahme' ? '+' : '−'}
                  {euro(b.betrag)}
                </span>
                <LoeschKnopf frage="Buchung löschen?" onLoeschen={() => db.buchungen.delete(b.id)} />
              </li>
            ))}
          </ul>
        )}
      </Karte>

      <BuchungFormular art={formular} onZu={() => setFormular(null)} />
      <SparzielFormular offen={sparzielOffen} onZu={() => setSparzielOffen(false)} />
    </Seite>
  )
}
