// Zeigt einen Import-Fehler verständlich an: was falsch ist, welche Zeile kaputt ist
// und die ersten 200 Zeichen der Zwischenablage. So sieht man, was der Kurzbefehl liefert.
import { ImportFehler } from '../../core/importText'

export default function ImportFehlerAnzeige({ fehler }: { fehler: unknown }) {
  const meldung = fehler instanceof Error ? fehler.message : String(fehler)
  if (!(fehler instanceof ImportFehler)) {
    return <div className="rounded-2xl bg-[#ff453a]/15 p-3 text-[14px] leading-snug">⚠️ {meldung}</div>
  }
  return (
    <div className="space-y-2 rounded-2xl bg-[#ff453a]/15 p-3 text-[14px] leading-snug">
      <p>⚠️ {meldung}</p>
      {fehler.zeile && (
        <div>
          <p className="mb-1 text-[12px] text-grau">Zeile {fehler.zeile}:</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-black p-2 font-mono text-[12px] text-[#ff9f0a]">{fehler.zeilenText || '(leer)'}</pre>
        </div>
      )}
      <div>
        <p className="mb-1 text-[12px] text-grau">Anfang der Zwischenablage (200 Zeichen):</p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-black p-2 font-mono text-[12px] text-white/80">{fehler.vorschau || '(leer)'}</pre>
      </div>
    </div>
  )
}
