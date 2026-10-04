// Der "Importieren"-Knopf: liest die Zwischenablage und importiert sofort.
// Wird auf der Startseite (täglicher Ablauf) und auf der Import-Seite verwendet.
import { useState } from 'react'
import { ClipboardPaste } from 'lucide-react'
import { importiere, leseImportText, zusammenfassung } from '../../core/import'
import ImportFehlerAnzeige from './ImportFehlerAnzeige'

export default function ImportKnopf({ klein = false, onFertig }: { klein?: boolean; onFertig?: () => void }) {
  const [status, setStatus] = useState<{ ok: true; zeilen: string[] } | { ok: false; fehler: unknown } | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function los() {
    setLaeuft(true)
    try {
      // Auf dem iPhone erscheint jetzt eine kleine "Einfügen"-Blase, die du antippen musst.
      // Das ist eine Schutzfunktion von iOS und lässt sich nicht abschalten.
      const text = await navigator.clipboard.readText()
      const ergebnis = await importiere(leseImportText(text))
      setStatus({ ok: true, zeilen: zusammenfassung(ergebnis) })
      onFertig?.()
    } catch (e) {
      const keinZugriff = (e as Error).name === 'NotAllowedError'
      setStatus({ ok: false, fehler: keinZugriff ? new Error('Kein Zugriff auf die Zwischenablage. Erlaube das Einfügen oder nutze „Mehr → Daten importieren“.') : e })
    }
    setLaeuft(false)
  }

  return (
    <div>
      <button
        onClick={los}
        disabled={laeuft}
        className={`tippbar flex w-full items-center justify-center gap-2 rounded-2xl font-semibold ${klein ? 'h-12 bg-karte text-[16px] text-[#0a84ff]' : 'h-14 bg-[#0a84ff] text-[17px]'}`}
      >
        <ClipboardPaste size={20} /> {laeuft ? 'Importiere …' : 'Aus Zwischenablage importieren'}
      </button>
      {status?.ok && (
        <div className="mt-2 rounded-2xl bg-[#30d158]/15 p-3 text-[14px] leading-snug">
          ✅{' '}
          {status.zeilen.map((z) => (
            <span key={z} className="block">
              {z}
            </span>
          ))}
        </div>
      )}
      {status && !status.ok && (
        <div className="mt-2">
          <ImportFehlerAnzeige fehler={status.fehler} />
        </div>
      )}
    </div>
  )
}
