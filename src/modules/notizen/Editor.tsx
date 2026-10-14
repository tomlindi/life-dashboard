// Notiz bearbeiten, ähnlich wie in Apple Notizen:
//   • Jede Zeile ist ein eigenes, mitwachsendes Textfeld. Die erste Zeile ist groß und fett (Titel).
//   • Checklisten-Zeilen haben einen runden Haken. Enter in einer Checkliste = nächster Punkt,
//     Enter in einem leeren Punkt = Checkliste beenden. Rücktaste am Zeilenanfang = Punkt wird normaler Text
//     bzw. die Zeile wird mit der vorigen verbunden.
//   • Speichert automatisch (kurz nach dem Tippen und beim Verlassen). Leere Notizen werden beim Verlassen gelöscht.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, FolderInput, ListChecks, Pin, PinOff, Trash2 } from 'lucide-react'
import { db, type Notiz } from '../../core/db'
import Sheet from '../../core/ui/Sheet'
import { aendereNotiz, FARBE, STANDARD_ORDNER, zuText, zuZeilen, type Zeile } from './notizen'

/** Textfeld, das mit seinem Inhalt in die Höhe wächst. */
function wachse(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = '0px'
  el.style.height = `${el.scrollHeight}px`
}

function Haken({ an, onClick }: { an: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()} // Tastatur bleibt offen
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center"
      aria-label={an ? 'Als offen markieren' : 'Abhaken'}
    >
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full" style={{ border: `1.5px solid ${an ? FARBE : '#8e8e93'}`, background: an ? FARBE : 'transparent' }}>
        {an && <Check size={14} strokeWidth={3} color="#000" />}
      </span>
    </button>
  )
}

export default function Editor({ notiz, onZurueck }: { notiz: Notiz; onZurueck: () => void }) {
  const [zeilen, setZeilen] = useState<Zeile[]>(() => zuZeilen(notiz.text))
  const [ordnerWahl, setOrdnerWahl] = useState(false)
  const ordner = useLiveQuery(() => db.notizOrdner.orderBy('sortierung').toArray(), []) ?? []
  const felder = useRef<(HTMLTextAreaElement | null)[]>([])
  const aktiv = useRef(0) // zuletzt fokussierte Zeile (für den Checklisten-Knopf)
  const fokus = useRef<{ zeile: number; pos: number } | null>(notiz.text ? null : { zeile: 0, pos: 0 })
  const gespeichert = useRef(notiz.text)
  const aktuell = useRef(zeilen)
  aktuell.current = zeilen

  // Nach jeder Änderung: Höhen anpassen und ggf. den Cursor setzen
  useLayoutEffect(() => {
    felder.current.forEach(wachse)
    if (fokus.current) {
      const el = felder.current[fokus.current.zeile]
      if (el) {
        el.focus()
        el.setSelectionRange(fokus.current.pos, fokus.current.pos)
      }
      fokus.current = null
    }
  }, [zeilen])

  // Automatisch speichern, kurz nachdem nicht mehr getippt wird
  useEffect(() => {
    const text = zuText(zeilen)
    if (text === gespeichert.current) return
    const t = setTimeout(() => {
      gespeichert.current = text
      aendereNotiz(notiz.id, { text })
    }, 400)
    return () => clearTimeout(t)
  }, [zeilen, notiz.id])

  // Beim Verlassen: letzten Stand sichern, leere Notiz löschen
  useEffect(
    () => () => {
      const text = zuText(aktuell.current)
      if (!text.trim()) db.notizen.delete(notiz.id)
      else if (text !== gespeichert.current) aendereNotiz(notiz.id, { text })
    },
    [notiz.id],
  )

  const setze = (neu: Zeile[], f?: { zeile: number; pos: number }) => {
    if (f) fokus.current = f
    setZeilen(neu)
  }

  function tippe(i: number, wert: string) {
    if (!wert.includes('\n')) return setze(zeilen.map((z, j) => (j === i ? { ...z, text: wert } : z)))
    // Eingefügter Text mit Zeilenumbrüchen: in mehrere Zeilen aufteilen
    const teile = zuZeilen(wert)
    const erste = { ...zeilen[i], text: teile[0].text }
    const neu = [...zeilen.slice(0, i), erste, ...teile.slice(1), ...zeilen.slice(i + 1)]
    const letzte = i + teile.length - 1
    setze(neu, { zeile: letzte, pos: neu[letzte].text.length })
  }

  function taste(e: React.KeyboardEvent<HTMLTextAreaElement>, i: number) {
    const z = zeilen[i]
    const el = e.currentTarget
    const pos = el.selectionStart
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      // Leerer Checklisten-Punkt + Enter = Checkliste beenden
      if (z.check && !z.text) return setze(zeilen.map((x, j) => (j === i ? { check: false, an: false, text: '' } : x)), { zeile: i, pos: 0 })
      const vorne = { ...z, text: z.text.slice(0, pos) }
      const hinten: Zeile = { check: z.check, an: false, text: z.text.slice(el.selectionEnd) }
      return setze([...zeilen.slice(0, i), vorne, hinten, ...zeilen.slice(i + 1)], { zeile: i + 1, pos: 0 })
    }
    if (e.key === 'Backspace' && pos === 0 && el.selectionEnd === 0) {
      if (z.check) {
        e.preventDefault()
        return setze(zeilen.map((x, j) => (j === i ? { check: false, an: false, text: x.text } : x)), { zeile: i, pos: 0 })
      }
      if (i > 0) {
        e.preventDefault()
        const vorher = zeilen[i - 1]
        const verbunden = { ...vorher, text: vorher.text + z.text }
        return setze([...zeilen.slice(0, i - 1), verbunden, ...zeilen.slice(i + 1)], { zeile: i - 1, pos: vorher.text.length })
      }
    }
    if (e.key === 'ArrowUp' && i > 0 && pos === 0) {
      e.preventDefault()
      setze(zeilen, { zeile: i - 1, pos: zeilen[i - 1].text.length })
    }
    if (e.key === 'ArrowDown' && i < zeilen.length - 1 && pos === z.text.length) {
      e.preventDefault()
      setze(zeilen, { zeile: i + 1, pos: 0 })
    }
  }

  /** Knopf "Checkliste": macht die aktive Zeile zum Punkt bzw. wieder zu Text. */
  function umschaltenCheckliste() {
    const i = Math.min(aktiv.current, zeilen.length - 1)
    const el = felder.current[i]
    setze(
      zeilen.map((z, j) => (j === i ? { check: !z.check, an: false, text: z.text } : z)),
      { zeile: i, pos: el?.selectionStart ?? zeilen[i].text.length },
    )
  }

  /** Antippen unter dem Text: ans Ende springen (wie in Apple Notizen). */
  function insLeere() {
    const letzte = zeilen.length - 1
    if (zeilen[letzte].text || zeilen[letzte].check) setze([...zeilen, { check: false, an: false, text: '' }], { zeile: letzte + 1, pos: 0 })
    else setze(zeilen, { zeile: letzte, pos: 0 })
  }

  const ordnerName = ordner.find((o) => o.id === notiz.ordnerId)?.name ?? STANDARD_ORDNER
  const leiste = 'tippbar flex h-11 w-11 items-center justify-center rounded-full'

  return (
    <div className="flex min-h-full flex-col px-4 pb-8 pt-3">
      {/* Kopf: zurück + Werkzeuge */}
      <div className="sticky top-0 z-10 -mx-4 mb-2 flex items-center bg-grund/90 px-2 backdrop-blur">
        <button onClick={onZurueck} className="tippbar inline-flex min-h-11 flex-1 items-center text-[17px]" style={{ color: FARBE }}>
          <ChevronLeft size={24} /> {ordnerName}
        </button>
        <button onPointerDown={(e) => e.preventDefault()} onClick={umschaltenCheckliste} className={leiste} style={{ color: FARBE }} aria-label="Checkliste">
          <ListChecks size={22} />
        </button>
        <button onClick={() => aendereNotiz(notiz.id, { angepinnt: !notiz.angepinnt })} className={leiste} style={{ color: FARBE }} aria-label={notiz.angepinnt ? 'Nicht mehr anpinnen' : 'Anpinnen'}>
          {notiz.angepinnt ? <PinOff size={21} /> : <Pin size={21} />}
        </button>
        <button onClick={() => setOrdnerWahl(true)} className={leiste} style={{ color: FARBE }} aria-label="In Ordner verschieben">
          <FolderInput size={21} />
        </button>
        <button
          onClick={async () => {
            if (!confirm('Notiz löschen?')) return
            gespeichert.current = ''
            setZeilen([{ check: false, an: false, text: '' }]) // leer = wird beim Verlassen gelöscht
            await db.notizen.delete(notiz.id)
            onZurueck()
          }}
          className={leiste}
          style={{ color: '#ff453a' }}
          aria-label="Notiz löschen"
        >
          <Trash2 size={21} />
        </button>
      </div>

      <p className="mb-2 text-center text-[12px] text-grau">
        {new Date(notiz.geaendert ?? notiz.erstellt).toLocaleString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* Die Zeilen */}
      <div>
        {zeilen.map((z, i) => {
          const titel = i === 0 && !z.check
          return (
            <div key={i} className="flex items-start">
              {z.check && (
                <Haken
                  an={z.an}
                  onClick={() => setze(zeilen.map((x, j) => (j === i ? { ...x, an: !x.an } : x)))}
                />
              )}
              <textarea
                ref={(el) => {
                  felder.current[i] = el
                }}
                value={z.text}
                rows={1}
                onChange={(e) => tippe(i, e.target.value)}
                onKeyDown={(e) => taste(e, i)}
                onFocus={() => (aktiv.current = i)}
                placeholder={i === 0 && zeilen.length === 1 ? 'Titel' : undefined}
                enterKeyHint="enter"
                className={`block min-w-0 flex-1 resize-none overflow-hidden bg-transparent outline-none placeholder:text-grau ${
                  titel ? 'py-1 text-[26px] font-bold leading-tight' : 'py-[5px] text-[17px] leading-snug'
                } ${z.check && z.an ? 'text-grau line-through' : ''}`}
                style={titel ? { fontSize: 26 } : { fontSize: 17 }}
              />
            </div>
          )
        })}
      </div>
      {/* Freie Fläche unten: antippen = weiterschreiben */}
      <div className="min-h-40 flex-1" onClick={insLeere} />

      <Sheet titel="Ordner wählen" offen={ordnerWahl} onZu={() => setOrdnerWahl(false)}>
        <div className="overflow-hidden rounded-2xl bg-karte2">
          {[{ id: undefined, name: STANDARD_ORDNER }, ...ordner].map((o, i) => (
            <button
              key={o.id ?? 'standard'}
              onClick={() => {
                aendereNotiz(notiz.id, { ordnerId: o.id })
                setOrdnerWahl(false)
              }}
              className={`tippbar flex min-h-12 w-full items-center px-4 text-left text-[16px] ${i > 0 ? 'border-t border-linie' : ''}`}
            >
              <span className="flex-1">{o.name}</span>
              {notiz.ordnerId === o.id && <Check size={18} color={FARBE} />}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
