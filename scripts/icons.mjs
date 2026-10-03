// Erzeugt die App-Icons (PNG) ohne Zusatzprogramme.
// Aufruf: npm run icons
// Motiv: schwarzer Hintergrund mit drei farbigen Ringen (wie Apples Fitness-App).
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

// --- Minimaler PNG-Schreiber -------------------------------------------
const crcTabelle = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTabelle[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (typ, daten) => {
  const laenge = Buffer.alloc(4)
  laenge.writeUInt32BE(daten.length)
  const t = Buffer.from(typ)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, daten])))
  return Buffer.concat([laenge, t, daten, crc])
}
function png(groesse, pixelFunktion) {
  const zeilen = []
  for (let y = 0; y < groesse; y++) {
    const zeile = Buffer.alloc(1 + groesse * 3)
    for (let x = 0; x < groesse; x++) {
      const [r, g, b] = pixelFunktion(x / groesse, y / groesse)
      zeile[1 + x * 3] = r
      zeile[2 + x * 3] = g
      zeile[3 + x * 3] = b
    }
    zeilen.push(zeile)
  }
  const kopf = Buffer.alloc(13)
  kopf.writeUInt32BE(groesse, 0)
  kopf.writeUInt32BE(groesse, 4)
  kopf[8] = 8 // 8 Bit pro Farbe
  kopf[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', kopf),
    chunk('IDAT', deflateSync(Buffer.concat(zeilen))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Motiv: drei Ringe, jeweils zu ~75 % gefüllt --------------------------
const ringe = [
  { radius: 0.34, farbe: [255, 55, 95] }, // rot
  { radius: 0.24, farbe: [48, 209, 88] }, // grün
  { radius: 0.14, farbe: [10, 132, 255] }, // blau
]
const breite = 0.075
function pixel(x, y) {
  const dx = x - 0.5
  const dy = y - 0.5
  const abstand = Math.hypot(dx, dy)
  // Winkel: 0 = oben, im Uhrzeigersinn
  const winkel = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI)
  for (const ring of ringe) {
    if (Math.abs(abstand - ring.radius) < breite / 2) {
      const gefuellt = winkel < 0.75 * 2 * Math.PI
      return gefuellt ? ring.farbe : ring.farbe.map((c) => Math.round(c * 0.22))
    }
  }
  return [0, 0, 0]
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', png(192, pixel))
writeFileSync('public/icon-512.png', png(512, pixel))
writeFileSync('public/apple-touch-icon.png', png(180, pixel))
console.log('Icons erzeugt in /public')
