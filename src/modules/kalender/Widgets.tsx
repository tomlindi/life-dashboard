// Zwei quadratische Widgets für die Startseite, gestaltet wie Apples 2×2-Widgets:
// Kalender (Wochentag rot, großes Datum, nächste Termine) und Erinnerungen (Anzahl + offene Einträge).
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Termin } from '../../core/db'
import { heute, tagPlus } from '../../core/datum'
import { ROT, useKalenderFarben } from './farben'
import { ganztaegigAm, letzterTag, liegtAm, zeitAm } from './mehrtaegig'

export function KalenderWidget() {
  const { farbe, sichtbar } = useKalenderFarben() // Farbstreifen links wie in Apple Kalender; ausgeblendete Kalender weglassen
  const h = heute()
  const morgenTag = tagPlus(h, 1)
  // Termine, die vor übermorgen beginnen und bis heute oder später dauern. Der Blick ein Jahr zurück
  // erwischt auch mehrtägige Termine, die schon vor heute angefangen haben (z. B. Urlaub seit gestern).
  const termine =
    useLiveQuery(
      () =>
        db.termine
          .where('start')
          .between(new Date(`${tagPlus(h, -366)}T00:00:00`).toISOString(), new Date(`${tagPlus(h, 2)}T00:00:00`).toISOString())
          .sortBy('start'),
      [h],
    ) ?? []
  const jetzt = new Date().toISOString()
  // Heute: noch nicht vorbei (ganztägige bzw. mehrtägige Termine gelten den ganzen Tag)
  const heutige = termine.filter((t) => sichtbar(t.kalender) && liegtAm(t, h) && (ganztaegigAm(t, h) || letzterTag(t) > h || (t.ende ?? t.start) >= jetzt))
  const morgen = termine.filter((t) => sichtbar(t.kalender) && liegtAm(t, morgenTag))
  const liste = heutige.length ? heutige : morgen
  const tag = heutige.length ? h : morgenTag
  // Zeit-Text für den angezeigten Tag, z. B. "08:00–09:30", "ab 20:00", "bis 10:00" oder "ganztägig"
  const zeitText = (t: Termin) => {
    if (ganztaegigAm(t, tag)) return 'ganztägig'
    const z = zeitAm(t, tag)
    return z.bis ? `${z.von}–${z.bis}` : z.von
  }
  const d = new Date()

  return (
    <Link to="/kalender" className="tippbar flex aspect-square flex-col rounded-3xl bg-karte p-3.5">
      <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: ROT }}>
        {d.toLocaleDateString('de-DE', { weekday: 'long' })}
      </p>
      <p className="-mt-1 text-[40px] font-light leading-tight">{d.getDate()}</p>
      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
        {liste.length === 0 ? (
          <p className="text-[13px] text-grau">Keine Termine heute</p>
        ) : (
          <>
            {!heutige.length && <p className="text-[11px] font-semibold uppercase text-grau">Morgen</p>}
            {liste.slice(0, 2).map((t) => (
              <div key={t.id} className="flex gap-1.5">
                <span className="w-[3px] shrink-0 rounded-full" style={{ background: farbe(t.kalender) }} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold leading-tight">{t.titel}</p>
                  <p className="text-[12px] leading-tight text-grau">{zeitText(t)}</p>
                </div>
              </div>
            ))}
            {liste.length > 2 && <p className="text-[11px] text-grau">+{liste.length - 2} weitere</p>}
          </>
        )}
      </div>
    </Link>
  )
}

export function ErinnerungenWidget() {
  const offen = useLiveQuery(() => db.aufgaben.filter((a) => !a.erledigt).toArray(), []) ?? []
  const h = heute()
  // Überfällige und heutige zuerst, dann nach Datum, ohne Datum zuletzt
  const sortiert = [...offen].sort((a, b) => (a.faellig ?? '9999').localeCompare(b.faellig ?? '9999'))

  return (
    <Link to="/erinnerungen" className="tippbar flex aspect-square flex-col rounded-3xl bg-karte p-3.5">
      <div className="flex items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0a84ff] text-[16px] text-white">☰</span>
        <span className="text-[30px] font-bold leading-none">{offen.length}</span>
      </div>
      <p className="mb-1 mt-1 text-[14px] font-semibold text-[#0a84ff]">Erinnerungen</p>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        {sortiert.length === 0 ? (
          <p className="text-[13px] text-grau">Alles erledigt 🎉</p>
        ) : (
          sortiert.slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px]" style={{ borderColor: a.faellig && a.faellig < h ? ROT : '#8e8e93' }} />
              <span className={`truncate text-[13px] ${a.faellig && a.faellig <= h ? 'font-medium' : ''}`}>{a.titel}</span>
            </div>
          ))
        )}
      </div>
    </Link>
  )
}
