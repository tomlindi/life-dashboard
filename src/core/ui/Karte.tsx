// Eine abgerundete, dunkelgraue Karte. Der Grundbaustein des ganzen Designs.
import type { ReactNode } from 'react'

interface Props {
  titel?: string
  akzent?: string // Farbe der Überschrift
  rechts?: ReactNode // z. B. ein kleiner Link oben rechts
  children: ReactNode
  className?: string
}

export default function Karte({ titel, akzent, rechts, children, className = '' }: Props) {
  return (
    <section className={`rounded-3xl bg-karte p-4 ${className}`}>
      {(titel || rechts) && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold" style={{ color: akzent ?? '#fff' }}>
            {titel}
          </h2>
          {rechts}
        </div>
      )}
      {children}
    </section>
  )
}
