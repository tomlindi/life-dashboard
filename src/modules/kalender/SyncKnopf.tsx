// "Mit Apple abgleichen": startet den Kurzbefehl "Life Sync" und erinnert beim Zurückkommen ans Importieren.
//   • SyncKnopf (Standard): großer Knopf, steht in den Einstellungen
//   • SyncSymbol: kleines ↻ oben rechts auf "Heute" (mit Zahl der offenen Änderungen)
//   • SyncRueckkehr: Hinweis "Zurück aus Kurzbefehle? Jetzt importieren" (auf Heute und in den Einstellungen)
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useEinstellung } from '../../core/einstellungen'
import { SYNC_GESTARTET, starteAbgleich, type AppleAktion } from '../../core/apple'
import ImportKnopf from '../mehr/ImportKnopf'

const BLAU = '#0a84ff'

/** Wurde der Abgleich in den letzten 15 Minuten gestartet? */
function gestartetKuerzlich() {
  try {
    const t = Number(sessionStorage.getItem(SYNC_GESTARTET))
    return t > 0 && Date.now() - t < 15 * 60 * 1000
  } catch {
    return false
  }
}

const useWarteschlange = () => useEinstellung<AppleAktion[]>('appleWarteschlange', [])[0]

/** Hinweis nach der Rückkehr aus der Kurzbefehle-App: Apple-Daten importieren. Sonst unsichtbar. */
export function SyncRueckkehr() {
  const [zurueck, setZurueck] = useState(gestartetKuerzlich)

  // Kommt man aus der Kurzbefehle-App zurück, wird die Seite wieder sichtbar -> Import anbieten
  useEffect(() => {
    const pruefen = () => document.visibilityState === 'visible' && setZurueck(gestartetKuerzlich())
    document.addEventListener('visibilitychange', pruefen)
    return () => document.removeEventListener('visibilitychange', pruefen)
  }, [])

  function fertig() {
    try {
      sessionStorage.removeItem(SYNC_GESTARTET)
    } catch {
      // egal
    }
    setTimeout(() => setZurueck(false), 4000)
  }

  if (!zurueck) return null
  return (
    <div className="rounded-2xl bg-[#0a84ff]/15 p-3">
      <p className="mb-2 text-[14px]">Zurück aus Kurzbefehle? Jetzt die aktuellen Apple-Daten übernehmen:</p>
      <ImportKnopf onFertig={fertig} />
    </div>
  )
}

/** Kleines rundes ↻ (für die Kopfzeile von Heute). */
export function SyncSymbol() {
  const offen = useWarteschlange().length
  return (
    <button onClick={starteAbgleich} className="tippbar relative flex h-10 w-10 items-center justify-center rounded-full bg-karte" style={{ color: BLAU }} aria-label="Mit Apple abgleichen">
      <RefreshCw size={19} />
      {offen > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff453a] px-1 text-[11px] font-bold text-white">{offen}</span>}
    </button>
  )
}

/** Großer Knopf (Einstellungen) samt Rückkehr-Hinweis. */
export default function SyncKnopf() {
  const offen = useWarteschlange().length
  return (
    <div className="flex flex-col gap-3">
      <SyncRueckkehr />
      <button onClick={starteAbgleich} className="tippbar flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-karte2 text-[15px] font-semibold" style={{ color: BLAU }}>
        <RefreshCw size={18} /> Mit Apple abgleichen
        {offen > 0 && (
          <span className="rounded-full bg-[#ff453a] px-2 py-0.5 text-[12px] font-bold text-white">
            {offen} {offen === 1 ? 'Änderung' : 'Änderungen'}
          </span>
        )}
      </button>
    </div>
  )
}
