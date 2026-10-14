// Seite "Backup & Daten": Sichern, Wiederherstellen, Beispieldaten, alles löschen.
import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CloudUpload, Download, Upload } from 'lucide-react'
import { db } from '../../core/db'
import { exportiereBackup, fuegeDatenHinzu, loescheAlles, stelleBackupWiederHer } from '../../core/backup'
import { gibtBeispieldaten, ladeBeispieldaten, loescheBeispieldaten } from '../../core/beispieldaten'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import { Schalter } from '../../core/ui/Formular'
import { autoBackupAn, backupDateiName, setzeAutoBackup, SYNC_KURZBEFEHL } from '../../core/apple'

/** Automatisches Backup bei jedem Apple-Abgleich (über den Kurzbefehl "Life Sync", 7 Dateien, eine pro Wochentag). */
function AutoBackup() {
  const [an, setAn] = useState(autoBackupAn())
  return (
    <Karte titel="Automatisch in iCloud sichern">
      <div className="flex min-h-12 items-center gap-3">
        <CloudUpload size={22} className="shrink-0 text-[#0a84ff]" />
        <span className="flex-1 text-[15px]">Bei jedem Apple-Abgleich sichern</span>
        <Schalter
          an={an}
          onClick={() => {
            setzeAutoBackup(!an)
            setAn(!an)
          }}
          label="Automatisches Backup"
        />
      </div>
      <p className="mt-2 text-[13px] leading-snug text-grau">
        Der Kurzbefehl „{SYNC_KURZBEFEHL}“ speichert dann jedes Mal eine Datei in iCloud Drive → Kurzbefehle → Life Backup. Es gibt eine Datei pro Wochentag (heute: „{backupDateiName()}“), jede wird nach einer Woche überschrieben. So
        kommst du bis zu 7 Tage zurück. <b>Vorher</b> musst du „{SYNC_KURZBEFEHL}“ einmal um ein paar Aktionen ergänzen (Anleitung: docs/KURZBEFEHL.md, Abschnitt 2d). Wiederherstellen geht oben mit „Backup wiederherstellen“.
      </p>
    </Karte>
  )
}

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
        <button onClick={sichern} className="tippbar mb-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0a84ff] text-[17px] font-semibold text-white">
          <Download size={20} /> Backup jetzt erstellen
        </button>
        <input ref={dateiFeld} type="file" accept=".json,application/json" className="hidden" onChange={(e) => wiederherstellen(e.target.files?.[0])} />
        <button onClick={() => dateiFeld.current?.click()} className="tippbar flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-karte2 text-[15px] font-semibold">
          <Upload size={18} /> Backup wiederherstellen
        </button>
        {meldung && <p className="mt-3 text-[14px]">{meldung}</p>}
      </Karte>

      <AutoBackup />

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
