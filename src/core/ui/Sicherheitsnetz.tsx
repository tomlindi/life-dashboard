// Sicherheitsnetz ("Error Boundary"): Stürzt eine Seite wegen eines Fehlers ab, zeigt es eine
// verständliche Meldung statt einer leeren, weißen App. Deine Daten bleiben dabei unberührt.
// (React erlaubt so etwas nur als "Klassen-Komponente", deshalb sieht der Code etwas anders aus.)
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface Zustand {
  fehler: Error | null
}

export default class Sicherheitsnetz extends Component<Props, Zustand> {
  state: Zustand = { fehler: null }

  static getDerivedStateFromError(fehler: Error): Zustand {
    return { fehler }
  }

  render() {
    if (!this.state.fehler) return this.props.children
    return (
      <div className="m-4 rounded-3xl bg-karte p-5">
        <p className="mb-1 text-[20px] font-bold">Hoppla, hier ist etwas schiefgelaufen 😕</p>
        <p className="mb-4 text-[14px] text-grau">Deine Daten sind sicher. Lade die App neu. Wenn der Fehler bleibt, schick diese Meldung an Claude:</p>
        <pre className="mb-4 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-black p-3 text-[12px] text-[#ff453a]">{this.state.fehler.message}</pre>
        <button onClick={() => location.reload()} className="tippbar min-h-12 w-full rounded-2xl bg-[#0a84ff] text-[16px] font-semibold">
          Neu laden
        </button>
      </div>
    )
  }
}
