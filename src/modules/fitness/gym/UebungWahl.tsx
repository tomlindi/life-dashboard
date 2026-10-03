// Fenster zum Auswählen einer Übung: suchen, antippen, oder neue Übung anlegen.
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../core/db'
import Sheet from '../../../core/ui/Sheet'
import { Chips } from '../../../core/ui/Formular'
import { GRUPPEN, standardUebungenAnlegen, uebungNachName } from './daten'

const FARBE = '#ff375f'

export default function UebungWahl({ offen, onZu, onWahl }: { offen: boolean; onZu: () => void; onWahl: (uebungId: string) => void }) {
  const uebungen = useLiveQuery(() => db.uebungen.orderBy('name').toArray(), []) ?? []
  const [suche, setSuche] = useState('')
  const [gruppe, setGruppe] = useState('Sonstiges')

  // Beim ersten Öffnen die Standard-Übungen anlegen
  useEffect(() => {
    if (offen) standardUebungenAnlegen()
  }, [offen])

  const treffer = uebungen.filter((u) => u.name.toLowerCase().includes(suche.trim().toLowerCase()))
  const exakt = uebungen.some((u) => u.name.toLowerCase() === suche.trim().toLowerCase())

  function waehle(id: string) {
    onWahl(id)
    setSuche('')
    onZu()
  }

  return (
    <Sheet titel="Übung wählen" offen={offen} onZu={onZu}>
      <input
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        placeholder="Suchen oder neue Übung eingeben …"
        className="mb-3 h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
      />

      {/* Neue Übung anlegen, wenn es den Namen noch nicht gibt */}
      {suche.trim() && !exakt && (
        <div className="mb-3 rounded-2xl bg-karte2 p-3">
          <p className="mb-2 text-[13px] text-grau">Muskelgruppe für „{suche.trim()}“</p>
          <div className="mb-3">
            <Chips optionen={GRUPPEN} wert={gruppe} onWahl={setGruppe} farbe={FARBE} />
          </div>
          <button
            onClick={async () => waehle(await uebungNachName(suche, gruppe))}
            className="tippbar min-h-11 w-full rounded-xl text-[15px] font-semibold text-black"
            style={{ background: FARBE }}
          >
            „{suche.trim()}“ anlegen
          </button>
        </div>
      )}

      {/* Liste nach Muskelgruppen */}
      {GRUPPEN.map((g) => {
        const liste = treffer.filter((u) => u.gruppe === g)
        if (liste.length === 0) return null
        return (
          <div key={g} className="mb-3">
            <p className="mb-1 px-1 text-[12px] font-semibold uppercase tracking-wide text-grau">{g}</p>
            <div className="overflow-hidden rounded-2xl bg-karte2">
              {liste.map((u, i) => (
                <button key={u.id} onClick={() => waehle(u.id)} className={`tippbar flex min-h-12 w-full items-center px-4 text-left text-[16px] ${i > 0 ? 'border-t border-linie' : ''}`}>
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </Sheet>
  )
}
