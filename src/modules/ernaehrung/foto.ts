// Bereitet ein Handyfoto für die KI vor: verkleinern und als JPEG umwandeln.
// - Für die KI: lange Seite höchstens 1024 px als JPEG (größer bringt der KI nichts, macht die Anfrage nur groß und langsam).
// - Zum Speichern: ein kleines Vorschaubild (lange Seite 160 px), damit die Datenbank klein bleibt.
// iPhone-Fotos (HEIC) wandelt Safari beim Auswählen schon selbst in JPEG um.

const KI_KANTE = 1024
const VORSCHAU_KANTE = 160

export interface VorbereitetesFoto {
  base64: string // JPEG für die KI, ohne "data:image/jpeg;base64,"-Anfang
  vorschau: string // kleines JPEG als "data:"-Text (für Liste und Datenbank)
}

/** Lädt die Datei als Bild. Der Browser dreht es dabei schon richtig herum (EXIF). */
async function ladeBild(datei: File): Promise<{ bild: HTMLImageElement; freigeben: () => void }> {
  const url = URL.createObjectURL(datei)
  const bild = new Image()
  try {
    // onload statt bild.decode(): decode() kann hängen bleiben, wenn die Seite gerade im Hintergrund ist
    await new Promise<void>((fertig, fehler) => {
      bild.onload = () => fertig()
      bild.onerror = () => fehler(new Error('nicht lesbar'))
      bild.src = url
    })
  } catch {
    URL.revokeObjectURL(url)
    throw new Error('Das Foto konnte nicht gelesen werden. Versuch es mit einem anderen Foto.')
  }
  return { bild, freigeben: () => URL.revokeObjectURL(url) }
}

/** Zeichnet eine Bildquelle verkleinert auf eine Leinwand (canvas). */
function verkleinere(quelle: CanvasImageSource, breite: number, hoehe: number, kante: number): HTMLCanvasElement {
  const faktor = Math.min(1, kante / Math.max(breite, hoehe))
  const leinwand = document.createElement('canvas')
  leinwand.width = Math.max(1, Math.round(breite * faktor))
  leinwand.height = Math.max(1, Math.round(hoehe * faktor))
  const ctx = leinwand.getContext('2d')
  if (!ctx) throw new Error('Das Foto konnte nicht verkleinert werden.')
  ctx.fillStyle = '#fff' // durchsichtige PNGs bekommen weißen statt schwarzen Hintergrund
  ctx.fillRect(0, 0, leinwand.width, leinwand.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(quelle, 0, 0, leinwand.width, leinwand.height)
  return leinwand
}

export async function bereiteFotoVor(datei: File): Promise<VorbereitetesFoto> {
  const { bild, freigeben } = await ladeBild(datei)
  try {
    if (!bild.naturalWidth || !bild.naturalHeight) throw new Error('Das Foto konnte nicht gelesen werden. Versuch es mit einem anderen Foto.')
    const gross = verkleinere(bild, bild.naturalWidth, bild.naturalHeight, KI_KANTE)
    // Das Vorschaubild aus dem schon verkleinerten Bild: sieht weicher aus als direkt vom Original
    const klein = verkleinere(gross, gross.width, gross.height, VORSCHAU_KANTE)
    return {
      base64: gross.toDataURL('image/jpeg', 0.85).split(',')[1] ?? '',
      vorschau: klein.toDataURL('image/jpeg', 0.75),
    }
  } finally {
    freigeben()
  }
}
