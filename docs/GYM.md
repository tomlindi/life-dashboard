# Gym-Training

**Fitness → Gym**: Trainingspläne, Trainings loggen, Bestleistungen, Export.

## Training loggen
- **Plan starten** (▶︎) oder **Freies Training**. Gewichte werden vom letzten Mal übernommen.
- Pro Satz: **kg** und **Wdh** eintragen und **✓** antippen. Leere Felder werden dabei mit „Letztes Mal“ gefüllt. Danach startet die **Pause** (Countdown unten, ±15 s, Skip).
- **„Letztes Mal“ antippen** übernimmt die Werte vom letzten Training.
- **Satznummer antippen** ändert den Typ: **W** = Aufwärmen (zählt nicht für Bestleistungen), **D** = Dropsatz, **F** = bis zum Versagen.
- **⏱ antippen** ändert die Pause der Übung (1:00 bis 4:00).
- **Training beenden**: Nicht abgehakte Sätze werden verworfen, Bestleistungen 🏆 angezeigt, und das Training zählt im Fitness-Wochenziel.
- Alles wird sofort gespeichert. Auch abgeschlossene Trainings kannst du jederzeit bearbeiten.

## Statistik pro Übung
- **Letzter Satz**: der letzte Arbeitssatz aus dem letzten Training.
- **Schwerster Satz**: höchstes Gewicht (bei Gleichstand mehr Wdh), ohne Aufwärmsätze.
- **Geschätztes Maximum (1 Wdh)**: Epley-Formel `kg × (1 + Wdh/30)`.

## Export (zum Analysieren mit Claude)
- **Für Claude kopieren**: CSV in die Zwischenablage, dann direkt in den Chat einfügen.
- **CSV-Datei**: eine Zeile pro Satz:
  `Datum;Uhrzeit;Training;Übung;Muskelgruppe;Satz;Typ;kg;Wdh;Volumen;e1RM;Pause_s;Notiz`
- **JSON-Datei**: alles inkl. Pläne und Notizen.

## Plan-Format (zum Importieren)
Pläne, die Claude für dich schreibt, importierst du über **Gym → Plan einfügen** (aus der Zwischenablage) oder **Plan-Datei**. Ein Plan mit gleichem Namen wird ersetzt, neue Übungen werden automatisch angelegt.

```json
{
  "typ": "life-dashboard-gymplan",
  "plaene": [
    {
      "name": "Push A",
      "notiz": "Brust/Schulter/Trizeps, +2,5 kg wenn alle Sätze am oberen Ende",
      "uebungen": [
        { "uebung": "Bankdrücken", "gruppe": "Brust", "saetze": 4, "wdh": "6-8", "kg": 60, "pauseSek": 150, "notiz": "Schulterblätter zusammen" },
        { "uebung": "Seitheben", "gruppe": "Schultern", "saetze": 3, "wdh": "12-15", "kg": 8, "pauseSek": 90 }
      ]
    }
  ]
}
```
Muskelgruppen: Brust, Rücken, Schultern, Beine, Po, Bizeps, Trizeps, Bauch, Ganzkörper, Sonstiges.
