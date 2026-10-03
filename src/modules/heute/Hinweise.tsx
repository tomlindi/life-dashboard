// Hinweise oben auf der Startseite: Geburtstage, Backup-Erinnerung und der tägliche Import.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Cake, HardDrive } from 'lucide-react'
import { db } from '../../core/db'
import { heute, tagVon } from '../../core/datum'
import { relativ } from '../../core/format'
import { BACKUP_INTERVALL_TAGE, tageSeitBackup } from '../../core/backup'
import { baldigeGeburtstage } from '../freunde/geburtstag'
import ImportKnopf from '../mehr/ImportKnopf'

/** Geburtstage in den nächsten 7 Tagen. */
export function GeburtstagsHinweis() {
  const freunde = useLiveQuery(() => db.freunde.toArray(), []) ?? []
  const bald = baldigeGeburtstage(freunde, 7)
  if (bald.length === 0) return null
  return (
    <Link to="/freunde" className="tippbar flex items-center gap-3 rounded-3xl bg-[#ff6482]/15 p-4">
      <Cake size={26} color="#ff6482" />
      <div className="text-[15px] leading-snug">
        {bald.map((g) => (
          <p key={g.freund.id}>
            <b>{g.freund.name}</b> hat {g.inTagen === 0 ? <b>heute</b> : relativ(g.datum)} Geburtstag (wird {g.alter}) 🎉
          </p>
        ))}
      </div>
    </Link>
  )
}

/** Erinnerung, wenn das letzte Backup älter als 7 Tage ist. */
export function BackupHinweis() {
  const tage = useLiveQuery(tageSeitBackup, [])
  // Ohne jegliche Daten muss man auch nichts sichern
  const hatDaten = useLiveQuery(async () => (await db.workouts.count()) + (await db.stimmung.count()) + (await db.noten.count()) + (await db.buchungen.count()) > 0, [])
  if (tage === undefined || !hatDaten) return null
  if (tage !== null && tage <= BACKUP_INTERVALL_TAGE) return null
  return (
    <Link to="/backup" className="tippbar flex items-center gap-3 rounded-3xl bg-[#ffd60a]/15 p-4">
      <HardDrive size={24} color="#ffd60a" />
      <p className="flex-1 text-[15px] leading-snug">
        {tage === null ? 'Du hast noch nie ein Backup gemacht.' : `Dein letztes Backup ist ${tage} Tage alt.`} <b className="text-[#ffd60a]">Jetzt sichern →</b>
      </p>
    </Link>
  )
}

/** Täglicher Import: großer Knopf, solange heute noch nicht importiert wurde. */
export function ImportBereich() {
  const letzter = useLiveQuery(() => db.einstellungen.get('letzterImport'), [])
  const [zeigen, setZeigen] = useState(false)
  const heuteImportiert = letzter && tagVon(String(letzter.value)) === heute()
  if (heuteImportiert && !zeigen) {
    return (
      <button onClick={() => setZeigen(true)} className="tippbar px-1 text-left text-[13px] text-grau">
        ✓ Heute importiert um {new Date(String(letzter.value)).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · <span className="text-[#0a84ff]">erneut importieren</span>
      </button>
    )
  }
  return <ImportKnopf klein />
}
