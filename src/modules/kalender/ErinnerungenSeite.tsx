// Erinnerungen wie in Apples Erinnerungen-App: Übersicht (Heute, Geplant, Alle, Erledigt, Listen)
// und Listenansicht mit Abhaken und neuen Einträgen direkt in der Liste.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Inbox, List, ListChecks, type LucideIcon } from 'lucide-react'
import { db, type Aufgabe } from '../../core/db'
import { heute } from '../../core/datum'
import { kurzDatum, relativ } from '../../core/format'
import { schalteErinnerung, speichereErinnerung } from '../../core/apple'
import ErinnerungSheet from './ErinnerungSheet'
import SyncKnopf from './SyncKnopf'
import { farbeFuer, ROT } from './farben'

type Ansicht = 'heute' | 'geplant' | 'alle' | 'erledigt' | { liste: string }

const OHNE_LISTE = 'Erinnerungen' // so heißt Apples Standardliste

export default function ErinnerungenSeite() {
  const alle = useLiveQuery(() => db.aufgaben.toArray(), []) ?? []
  const [ansicht, setAnsicht] = useState<Ansicht | null>(null)
  const [bearbeiten, setBearbeiten] = useState<Aufgabe | undefined>()
  const h = heute()

  const offen = alle.filter((a) => !a.erledigt)
  const listen = [...new Set(alle.map((a) => a.liste ?? OHNE_LISTE))].sort((a, b) => a.localeCompare(b, 'de'))
  const filter: Record<'heute' | 'geplant' | 'alle' | 'erledigt', Aufgabe[]> = {
    heute: offen.filter((a) => a.faellig && a.faellig <= h),
    geplant: offen.filter((a) => a.faellig),
    alle: offen,
    erledigt: alle.filter((a) => a.erledigt),
  }

  // ---------- Übersicht ----------
  if (!ansicht) {
    const kacheln: { id: 'heute' | 'geplant' | 'alle' | 'erledigt'; name: string; icon: LucideIcon; farbe: string }[] = [
      { id: 'heute', name: 'Heute', icon: CalendarDays, farbe: '#0a84ff' },
      { id: 'geplant', name: 'Geplant', icon: CalendarDays, farbe: ROT },
      { id: 'alle', name: 'Alle', icon: Inbox, farbe: '#8e8e93' },
      { id: 'erledigt', name: 'Erledigt', icon: Check, farbe: '#8e8e93' },
    ]
    return (
      <div className="px-4 pb-10 pt-3">
        <Link to="/" className="tippbar mb-2 inline-flex min-h-10 items-center text-[17px] text-[#0a84ff]">
          <ChevronLeft size={22} /> Heute
        </Link>
        <h1 className="mb-4 text-[34px] font-bold">Erinnerungen</h1>
        <div className="mb-6 grid grid-cols-2 gap-3">
          {kacheln.map((k) => (
            <button key={k.id} onClick={() => setAnsicht(k.id)} className="tippbar rounded-2xl bg-karte p-3 text-left">
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: k.farbe }}>
                  <k.icon size={20} color="#fff" />
                </span>
                <span className="text-[28px] font-bold leading-none">{k.id === 'erledigt' ? '' : filter[k.id].length}</span>
              </div>
              <p className="mt-2 text-[16px] font-semibold text-grau">{k.name}</p>
            </button>
          ))}
        </div>

        <h2 className="mb-2 px-1 text-[20px] font-bold">Meine Listen</h2>
        <div className="mb-4 overflow-hidden rounded-2xl bg-karte">
          {listen.length === 0 && <p className="p-4 text-[14px] text-grau">Noch keine Listen. Sie kommen beim Import aus Apple Erinnerungen.</p>}
          {listen.map((l, i) => (
            <button key={l} onClick={() => setAnsicht({ liste: l })} className={`tippbar flex min-h-14 w-full items-center gap-3 px-4 text-left ${i > 0 ? 'border-t border-linie' : ''}`}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: farbeFuer(l) }}>
                <List size={17} color="#fff" />
              </span>
              <span className="flex-1 text-[17px]">{l}</span>
              <span className="text-[17px] text-grau">{offen.filter((a) => (a.liste ?? OHNE_LISTE) === l).length}</span>
              <ChevronRight size={18} className="text-grau" />
            </button>
          ))}
        </div>
        <SyncKnopf />
      </div>
    )
  }

  // ---------- Listenansicht ----------
  const titel = typeof ansicht === 'string' ? { heute: 'Heute', geplant: 'Geplant', alle: 'Alle', erledigt: 'Erledigt' }[ansicht] : ansicht.liste
  const farbe = typeof ansicht === 'string' ? (ansicht === 'geplant' ? ROT : ansicht === 'heute' ? '#0a84ff' : '#fff') : farbeFuer(ansicht.liste)
  const eintraege = (typeof ansicht === 'string' ? filter[ansicht] : alle.filter((a) => (a.liste ?? OHNE_LISTE) === ansicht.liste && !a.erledigt)).sort(
    (a, b) => (b.prioritaet ?? 0) - (a.prioritaet ?? 0) || (a.faellig ?? '9999').localeCompare(b.faellig ?? '9999'),
  )

  /** Neue Erinnerung direkt in der Liste anlegen (Liste/Datum passend zur Ansicht). */
  const aktuell = ansicht // hier sicher nicht leer (siehe "if (!ansicht)" oben)
  async function neu(text: string) {
    await speichereErinnerung({
      titel: text,
      liste: typeof aktuell === 'object' && aktuell.liste !== OHNE_LISTE ? aktuell.liste : undefined,
      faellig: aktuell === 'heute' ? h : undefined,
    })
  }

  return (
    <div className="px-4 pb-10 pt-3">
      <button onClick={() => setAnsicht(null)} className="tippbar mb-2 inline-flex min-h-10 items-center text-[17px] text-[#0a84ff]">
        <ChevronLeft size={22} /> Listen
      </button>
      <h1 className="mb-3 text-[34px] font-bold" style={{ color: farbe }}>
        {titel}
      </h1>

      <ul>
        {eintraege.map((a) => (
          <li key={a.id} className="flex items-start gap-3 border-b border-linie py-2">
            {/* Kreis antippen = abhaken */}
            <button onClick={() => schalteErinnerung(a)} className="tippbar mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center" aria-label={a.erledigt ? 'Wieder öffnen' : 'Erledigt'}>
              <span
                className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2"
                style={{ borderColor: a.erledigt ? farbeFuer(a.liste ?? OHNE_LISTE) : '#636366', background: a.erledigt ? farbeFuer(a.liste ?? OHNE_LISTE) : 'transparent' }}
              >
                {a.erledigt && <Check size={13} strokeWidth={3} color="#000" />}
              </span>
            </button>
            {/* Text antippen = Details bearbeiten */}
            <button onClick={() => setBearbeiten(a)} className="tippbar min-w-0 flex-1 py-1 text-left">
              <p className={`text-[16px] ${a.erledigt ? 'text-grau' : ''}`}>
                {a.prioritaet ? <span className="mr-1 font-bold text-[#0a84ff]">{'!'.repeat(a.prioritaet)}</span> : null}
                {a.titel}
                {a.sync && <Clock size={12} className="ml-1.5 inline text-[#ffd60a]" />}
              </p>
              {a.notiz && <p className="truncate text-[13px] text-grau">{a.notiz}</p>}
              {(a.faellig || (typeof ansicht === 'string' && a.liste)) && (
                <p className="text-[13px]" style={{ color: a.faellig && a.faellig < h && !a.erledigt ? ROT : '#8e8e93' }}>
                  {[a.faellig ? `${kurzDatum(a.faellig)} (${relativ(a.faellig)})` : '', typeof ansicht === 'string' ? a.liste : ''].filter(Boolean).join(' · ')}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Neue Erinnerung: einfach tippen und Enter (wie in Apples App) */}
      {ansicht !== 'erledigt' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const feld = e.currentTarget.elements.namedItem('neu') as HTMLInputElement
            if (feld.value.trim()) neu(feld.value.trim())
            feld.value = ''
          }}
          className="flex items-center gap-3 py-2"
        >
          <span className="flex h-8 w-8 items-center justify-center">
            <span className="h-[22px] w-[22px] rounded-full border-2 border-dashed border-[#636366]" />
          </span>
          <input name="neu" placeholder="Neue Erinnerung" className="h-10 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#0a84ff]" />
        </form>
      )}
      {eintraege.length === 0 && ansicht === 'erledigt' && <p className="py-6 text-center text-grau">Noch nichts erledigt.</p>}

      <div className="mt-6">
        <SyncKnopf />
        <p className="mt-2 flex items-center justify-center gap-1 text-[12px] text-grau">
          <ListChecks size={13} /> Änderungen gehen beim Abgleich an Apple Erinnerungen.
        </p>
      </div>

      <ErinnerungSheet aufgabe={bearbeiten} listen={listen} onZu={() => setBearbeiten(undefined)} />
    </div>
  )
}
