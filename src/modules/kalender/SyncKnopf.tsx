// "Mit Apple abgleichen": startet den Kurzbefehl "Life Sync" und erinnert beim Zurückkommen ans Importieren.
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useEinstellung } from '../../core/einstellungen'
import { SYNC_GESTARTET, starteAbgleich, type AppleAktion } from '../../core/apple'
import ImportKnopf from '../mehr/ImportKnopf'

/** Wurde der Abgleich in den letzten 15 Minuten gestartet? */
function gestartetKuerzlich() {
  try {
    const t = Number(sessionStorage.getItem(SYNC_GESTARTET))
    return t > 0 && Date.now() - t < 15 * 60 * 1000
  } catch {
    return false
  }
}

export default function SyncKnopf() {
  const [warteschlange] = useEinstellung<AppleAktion[]>('appleWarteschlange', [])
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

  if (zurueck) {
    return (
      <div className="rounded-2xl bg-[#0a84ff]/15 p-3">
        <p className="mb-2 text-[14px]">Zurück aus Kurzbefehle? Jetzt die aktuellen Apple-Daten übernehmen:</p>
        <ImportKnopf onFertig={fertig} />
      </div>
    )
  }

  return (
    <button onClick={starteAbgleich} className="tippbar flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-karte text-[15px] font-semibold text-[#0a84ff]">
      <RefreshCw size={18} /> Mit Apple abgleichen
      {warteschlange.length > 0 && (
        <span className="rounded-full bg-[#ff453a] px-2 py-0.5 text-[12px] font-bold text-white">
          {warteschlange.length} {warteschlange.length === 1 ? 'Änderung' : 'Änderungen'}
        </span>
      )}
    </button>
  )
}
