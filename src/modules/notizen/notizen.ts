// Notizen: Regeln rund um Text, Zeilen, Ordner und Gruppen (ohne Anzeige).
// Eine Notiz ist einfacher Text. Die erste Zeile ist der Titel.
// Checklisten-Zeilen sehen im Text so aus: "- [ ] offen" bzw. "- [x] erledigt".
import { db, type Notiz } from '../../core/db'
import { heute, neueId, tagPlus, tagVon } from '../../core/datum'

export const FARBE = 'var(--color-gelb)' // #ffd60a, im Light Mode dunkler (index.css)
/** Name des Standardordners (Notizen ohne ordnerId, z. B. Schnellnotizen von „Heute“). */
export const STANDARD_ORDNER = 'Notizen'

// ---------- Zeilen ----------

export interface Zeile {
  check: boolean // true = Checklisten-Zeile
  an: boolean // abgehakt (nur bei Checklisten-Zeilen)
  text: string
}

const CHECK = /^- \[([ xX])\] ?(.*)$/

export function zuZeilen(text: string): Zeile[] {
  return text.split('\n').map((z) => {
    const m = CHECK.exec(z)
    return m ? { check: true, an: m[1] !== ' ', text: m[2] } : { check: false, an: false, text: z }
  })
}

export const zuText = (zeilen: Zeile[]) => zeilen.map((z) => (z.check ? `- [${z.an ? 'x' : ' '}] ${z.text}` : z.text)).join('\n')

/** Zeilen ohne Checklisten-Zeichen, leere weggelassen. */
const inhalt = (text: string) =>
  zuZeilen(text)
    .map((z) => z.text.trim())
    .filter(Boolean)

export const titelVon = (n: Notiz) => inhalt(n.text)[0] ?? 'Neue Notiz'
export const vorschauVon = (n: Notiz) => inhalt(n.text).slice(1).join(' ') || 'Kein weiterer Text'

/** Wie viele Checklisten-Punkte sind erledigt? (null = keine Checkliste) */
export function checkStand(n: Notiz): { erledigt: number; gesamt: number } | null {
  const punkte = zuZeilen(n.text).filter((z) => z.check)
  return punkte.length ? { erledigt: punkte.filter((z) => z.an).length, gesamt: punkte.length } : null
}

export const geaendertVon = (n: Notiz) => n.geaendert ?? n.erstellt

// ---------- Gruppen wie in Apple Notizen ----------

/** Teilt Notizen in "Angepinnt", "Heute", "Gestern", "Letzte 7 Tage", "Letzte 30 Tage" und Monate auf. Neueste zuerst. */
export function gruppiereNotizen(notizen: Notiz[]): { titel: string; notizen: Notiz[] }[] {
  const sortiert = [...notizen].sort((a, b) => geaendertVon(b).localeCompare(geaendertVon(a)))
  const h = heute()
  const gruppen = new Map<string, Notiz[]>()
  const dazu = (titel: string, n: Notiz) => gruppen.set(titel, [...(gruppen.get(titel) ?? []), n])
  for (const n of sortiert.filter((n) => n.angepinnt)) dazu('Angepinnt', n)
  for (const n of sortiert.filter((n) => !n.angepinnt)) {
    const tag = tagVon(geaendertVon(n))
    if (tag === h) dazu('Heute', n)
    else if (tag === tagPlus(h, -1)) dazu('Gestern', n)
    else if (tag > tagPlus(h, -7)) dazu('Letzte 7 Tage', n)
    else if (tag > tagPlus(h, -30)) dazu('Letzte 30 Tage', n)
    else dazu(new Date(tag + 'T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }), n)
  }
  return [...gruppen].map(([titel, notizen]) => ({ titel, notizen }))
}

/** Zeit für die Liste: heute "14:05", sonst "13.10.25". */
export function zeitText(iso: string) {
  const d = new Date(iso)
  return tagVon(iso) === heute() ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ---------- Speichern ----------

export async function neueNotiz(ordnerId?: string): Promise<string> {
  const jetzt = new Date().toISOString()
  const id = neueId()
  await db.notizen.add({ id, datum: heute(), text: '', erstellt: jetzt, geaendert: jetzt, ordnerId })
  return id
}

export const aendereNotiz = (id: string, neu: Partial<Notiz>) => db.notizen.update(id, { ...neu, geaendert: new Date().toISOString() })

export async function neuerOrdner(name: string): Promise<string> {
  const alle = await db.notizOrdner.toArray()
  const id = neueId()
  await db.notizOrdner.add({ id, name, sortierung: Math.max(0, ...alle.map((o) => o.sortierung)) + 1 })
  return id
}

/** Ordner löschen: seine Notizen wandern in den Standardordner (gehen also nicht verloren). */
export async function loescheOrdner(id: string) {
  await db.transaction('rw', db.notizOrdner, db.notizen, async () => {
    await db.notizen.where('ordnerId').equals(id).modify({ ordnerId: undefined })
    await db.notizOrdner.delete(id)
  })
}
