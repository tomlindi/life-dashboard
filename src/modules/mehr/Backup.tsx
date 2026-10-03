// Seite "Backup & Daten": Sichern, Wiederherstellen, Beispieldaten, alles löschen.
import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Upload } from 'lucide-react'
import { db } from '../../core/db'
import { exportiereBackup, fuegeDatenHinzu, loescheAlles, stelleBackupWiederHer } from '../../core/backup'
import { gibtBeispieldaten, ladeBeispieldaten, loescheBeispieldaten } from '../../core/beispieldaten'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'

export default function BackupSeite() {
  const letztes = useLiveQuery(() => db.einstellungen.get('letztesBackup'), [])
  const hatDemo = useLiveQuery(gibtBeispieldaten, [])
  const [meldung, setMeldung] = useState('')
  const dateiFeld = useRef<HTMLInputElement>(null)
  const hinzuFeld = useRef<HTMLInputElement>(null)

  async function hinzufuegen(datei: File | undefined) {
    if (!datei) return
    try {
      const n = await fuegeDatenHinzu(await datei.text())
      setMeldung(`${n} Einträge hinzugefügt ✓`)
    } catch (e) {
      setMeldung('Fehler: ' + (e as Error).message)
    }
    if (hinzuFeld.current) hinzuFeld.current.value = ''
  }

  async function sichern() {
    const r = await exportiereBackup()
    setMeldung(r === 'abgebrochen' ? 'Abgebrochen. Es wurde kein Backup gespeichert.' : 'Backup erstellt ✓')
  }

  async function wiederherstellen(datei: File | undefined) {
    if (!datei) return
    if (!confirm('Achtung: Alle aktuellen Daten werden durch das Backup ersetzt. Fortfahren?')) return
    try {
      const n = await stelleBackupWiederHer(await datei.text())
      setMeldung(`Wiederhergestellt: ${n} Einträge ✓`)
    } catch (e) {
      setMeldung('Fehler: ' + (e as Error).message)
    }
  }

  return (
    <Seite titel="Backup & Daten">
      <Karte titel="Backup">
        <p className="mb-3 text-[14px] leading-snug text-grau">
          Deine Daten liegen nur auf diesem Gerät. Sichere sie regelmäßig, am besten in iCloud Drive („In Dateien sichern“).
        </p>
        <p className="mb-3 text-[14px]">
          Letztes Backup:{' '}
          <b>{letztes ? new Date(String(letztes.value)).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'noch nie'}</b>
        </p>
        <button onClick={sichern} className="tippbar mb-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0a84ff] text-[17px] font-semibold">
          <Download size={20} /> Backup erstellen
        </button>
        <input ref={dateiFeld} type="file" accept=".json,application/json" className="hidden" onChange={(e) => wiederherstellen(e.target.files?.[0])} />
        <button onClick={() => dateiFeld.current?.click()} className="tippbar flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-karte2 text-[15px] font-semibold">
          <Upload size={18} /> Backup wiederherstellen
        </button>
        {meldung && <p className="mt-3 text-[14px]">{meldung}</p>}
      </Karte>

      <Karte titel="Daten hinzufügen">
        <p className="mb-3 text-[14px] leading-snug text-grau">
          Für ein Startpaket (z. B. Fächer, Freunde, Habits). Fügt Einträge hinzu, ohne vorhandene Daten zu löschen.
        </p>
        <input ref={hinzuFeld} type="file" accept=".json,application/json" className="hidden" onChange={(e) => hinzufuegen(e.target.files?.[0])} />
        <button onClick={() => hinzuFeld.current?.click()} className="tippbar flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-karte2 text-[15px] font-semibold text-[#30d158]">
          <Upload size={18} /> Datei hinzufügen
        </button>
      </Karte>

      <Karte titel="Beispieldaten">
        <button
          onClick={() => (hatDemo ? loescheBeispieldaten() : ladeBeispieldaten())}
          className="tippbar min-h-12 w-full rounded-2xl bg-karte2 text-[15px] font-semibold text-[#0a84ff]"
        >
          {hatDemo ? 'Beispieldaten löschen' : 'Beispieldaten laden'}
        </button>
        <p className="mt-2 text-[13px] text-grau">Löscht nur die Beispiel-Einträge, deine eigenen Daten bleiben.</p>
      </Karte>

      <Karte titel="Gefahrenzone">
        <button
          onClick={async () => {
            if (confirm('Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden (außer mit einem Backup).')) {
              await loescheAlles()
              setMeldung('Alle Daten gelöscht.')
            }
          }}
          className="tippbar min-h-12 w-full rounded-2xl bg-karte2 text-[15px] font-semibold text-[#ff453a]"
        >
          Alle Daten löschen
        </button>
      </Karte>
    </Seite>
  )
}
