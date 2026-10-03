// "Mehr": Daten importieren, Backup, alle weiteren Bereiche und Bereiche ein-/ausblenden.
import { Link } from 'react-router-dom'
import { ChevronRight, ClipboardPaste, HardDrive, type LucideIcon } from 'lucide-react'
import { module, TAB_IDS } from '..'
import { useAusgeblendet } from '../../core/einstellungen'
import Seite from '../../core/ui/Seite'

/** Eine Zeile in einer Apple-typischen Liste. */
function Zeile({ to, icon: Icon, farbe, name, oben }: { to: string; icon: LucideIcon; farbe: string; name: string; oben: boolean }) {
  return (
    <Link to={to} className={`tippbar flex min-h-14 items-center gap-3 px-4 ${oben ? '' : 'border-t border-linie'}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: farbe + '33' }}>
        <Icon size={20} color={farbe} />
      </span>
      <span className="flex-1 text-[17px]">{name}</span>
      <ChevronRight size={18} className="text-grau" />
    </Link>
  )
}

export default function MehrSeite() {
  const [ausgeblendet, setAusgeblendet] = useAusgeblendet()
  const weitere = module.filter((m) => !TAB_IDS.includes(m.id) && !ausgeblendet.includes(m.id))

  const umschalten = (id: string) => setAusgeblendet(ausgeblendet.includes(id) ? ausgeblendet.filter((x) => x !== id) : [...ausgeblendet, id])

  return (
    <Seite titel="Mehr">
      <div className="overflow-hidden rounded-3xl bg-karte">
        <Zeile to="/import" icon={ClipboardPaste} farbe="#0a84ff" name="Daten importieren" oben />
        <Zeile to="/backup" icon={HardDrive} farbe="#8e8e93" name="Backup & Daten" oben={false} />
      </div>

      {weitere.length > 0 && (
        <div className="overflow-hidden rounded-3xl bg-karte">
          {weitere.map((m, i) => (
            <Zeile key={m.id} to={`/${m.id}`} icon={m.icon} farbe={m.farbe} name={m.name} oben={i === 0} />
          ))}
        </div>
      )}

      <h2 className="mt-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-grau">Bereiche anzeigen</h2>
      <div className="overflow-hidden rounded-3xl bg-karte">
        {module.map((m, i) => {
          const an = !ausgeblendet.includes(m.id)
          return (
            <button key={m.id} onClick={() => umschalten(m.id)} className={`flex min-h-12 w-full items-center gap-3 px-4 ${i > 0 ? 'border-t border-linie' : ''}`}>
              <m.icon size={20} color={m.farbe} />
              <span className="flex-1 text-left text-[16px]">{m.name}</span>
              {/* Schalter im iOS-Stil */}
              <span className="relative h-[31px] w-[51px] rounded-full transition-colors" style={{ background: an ? '#30d158' : '#39393d' }}>
                <span className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all" style={{ left: an ? 22 : 2 }} />
              </span>
            </button>
          )
        })}
      </div>
      <p className="px-1 text-[13px] text-grau">Ausgeblendete Bereiche verschwinden von der Startseite, aus der Tab-Leiste und aus dieser Liste. Deine Daten bleiben erhalten.</p>
    </Seite>
  )
}
