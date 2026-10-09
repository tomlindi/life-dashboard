// Karte "Aufgaben heute" auf der Startseite: alles, was heute fällig oder schon überfällig ist.
// Überfällige rot, in Erinnerungen markierte mit Fähnchen. Darunter klein die übrigen offenen Aufgaben.
// Abhaken geht direkt hier (wird beim nächsten "Mit Apple abgleichen" an Erinnerungen geschickt).
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Flag } from 'lucide-react'
import { db } from '../../core/db'
import { heute } from '../../core/datum'
import { relativ } from '../../core/format'
import { schalteErinnerung } from '../../core/apple'
import Karte from '../../core/ui/Karte'
import { Haken } from '../../core/ui/Formular'
import { ROT } from '../kalender/farben'

const BLAU = '#0a84ff'
const ORANGE = '#ff9f0a' // Fähnchen-Farbe wie in Apples Erinnerungen

export default function FaelligeAufgaben() {
  const offen = useLiveQuery(() => db.aufgaben.filter((a) => !a.erledigt).toArray(), []) ?? []
  const h = heute()
  // Überfällige zuerst (älteste oben), dann heutige; innerhalb eines Tages markierte und wichtige zuerst
  const faellig = offen
    .filter((a) => a.faellig && a.faellig <= h)
    .sort((a, b) => a.faellig!.localeCompare(b.faellig!) || Number(!!b.markiert) - Number(!!a.markiert) || (b.prioritaet ?? 0) - (a.prioritaet ?? 0))
  const uebrige = offen.length - faellig.length

  return (
    <Karte
      titel="Aufgaben heute"
      akzent={BLAU}
      rechts={
        <Link to="/erinnerungen" className="tippbar flex items-center text-[13px] text-grau">
          Alle <ChevronRight size={16} />
        </Link>
      }
    >
      {faellig.length === 0 ? (
        <p className="text-[14px] text-grau">Heute ist nichts fällig. 🎉</p>
      ) : (
        <ul className="-ml-2">
          {faellig.map((a) => {
            const ueberfaellig = a.faellig! < h
            return (
              <li key={a.id} className="flex min-h-12 items-center gap-1">
                <Haken an={false} farbe={BLAU} onClick={() => schalteErinnerung(a)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px]" style={{ color: ueberfaellig ? ROT : undefined }}>
                    {(a.prioritaet ?? 0) > 0 && <span style={{ color: ueberfaellig ? ROT : BLAU }}>{'!'.repeat(a.prioritaet!)} </span>}
                    {a.titel}
                  </p>
                  <p className="truncate text-[12px]" style={{ color: ueberfaellig ? ROT : '#8e8e93' }}>
                    {ueberfaellig ? `überfällig · ${relativ(a.faellig!)}` : 'heute'}
                    {a.liste ? ` · ${a.liste}` : ''}
                  </p>
                </div>
                {a.markiert && <Flag size={16} color={ORANGE} fill={ORANGE} className="mr-1 shrink-0" aria-label="markiert" />}
              </li>
            )
          })}
        </ul>
      )}
      {uebrige > 0 && (
        <p className="mt-2 text-[12px] text-grau">
          {uebrige} {uebrige === 1 ? 'weitere offene Aufgabe' : 'weitere offene Aufgaben'}
        </p>
      )}
    </Karte>
  )
}
