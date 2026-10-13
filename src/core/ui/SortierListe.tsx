// Liste zum Umsortieren per Ziehen: Eintrag kurz gedrückt halten (ca. 0,25 s), dann ziehen.
// Kurz antippen funktioniert weiter normal (z. B. ein Projekt öffnen), und Scrollen auch.
// Gebaut mit der Bibliothek dnd-kit, weil Ziehen auf dem iPhone sonst leicht mit dem Scrollen kollidiert.
//
// Benutzung:
//   <SortierListe eintraege={projekte} schluessel={(p) => p.id} onNeueReihenfolge={speichere}>
//     {(p, zieht) => <MeineZeile projekt={p} hervorgehoben={zieht} />}
//   </SortierListe>
import type { ReactNode } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props<T> {
  eintraege: T[]
  schluessel: (e: T) => string
  onNeueReihenfolge: (neu: T[]) => void
  children: (e: T, zieht: boolean) => ReactNode
  className?: string
}

/** Eine verschiebbare Zeile. */
function Zeile({ id, children }: { id: string; children: (zieht: boolean) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 10 : undefined,
        // Beim Ziehen leicht anheben, wie in iOS
        scale: isDragging ? '1.03' : undefined,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : undefined,
        WebkitTouchCallout: 'none', // kein iOS-Menü beim Gedrückthalten
      }}
    >
      {children(isDragging)}
    </li>
  )
}

export default function SortierListe<T>({ eintraege, schluessel, onNeueReihenfolge, children, className }: Props<T>) {
  const sensoren = useSensors(
    // Erst nach 250 ms Gedrückthalten ziehen; bewegt sich der Finger vorher mehr als 8 px, ist es Scrollen
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = eintraege.map(schluessel)

  function beimLoslassen({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    onNeueReihenfolge(arrayMove(eintraege, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  return (
    <DndContext sensors={sensoren} collisionDetection={closestCenter} onDragEnd={beimLoslassen}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {eintraege.map((e) => (
            <Zeile key={schluessel(e)} id={schluessel(e)}>
              {(zieht) => children(e, zieht)}
            </Zeile>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
