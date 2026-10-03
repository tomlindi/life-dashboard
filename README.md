# Life Dashboard

Mein persönliches Dashboard als Web-App (PWA) fürs iPhone: Fitness, Schule, Ziele, Gewohnheiten, Geld, Schlaf, Ernährung, Freunde, Hobbys, Stimmung. Alle Daten bleiben lokal auf dem Gerät (IndexedDB). Es gibt keinen Server und keinen Login.

## Befehle

| Befehl | Was passiert |
|---|---|
| `npm run dev` | Startet die App zum Entwickeln auf http://localhost:5173 |
| `npm run build` | Prüft den Code (TypeScript) und baut die fertige App nach `dist/` |
| `npm run icons` | Erzeugt die App-Icons in `public/` neu |

## Anleitungen

- [docs/HOSTING.md](docs/HOSTING.md): online stellen (GitHub Pages) und aufs iPhone installieren
- [docs/KURZBEFEHL.md](docs/KURZBEFEHL.md): Kurzbefehl für Apple Health, Kalender und Erinnerungen, JSON-Format, Notan-CSV

## Aufbau

```
src/
  App.tsx              Grundgerüst: Seiten + Tab-Leiste unten
  core/                Gemeinsames für alle Bereiche
    db.ts              Datenbank (alle Tabellen und Datentypen)
    import.ts          Import aus dem Kurzbefehl (inkl. Duplikat-Erkennung)
    backup.ts          Backup als JSON-Datei
    beispieldaten.ts   Beispieldaten laden/löschen
    strava.ts          Vorbereitung für eine spätere direkte Strava-Anbindung
    datum.ts, format.ts, einstellungen.ts
    ui/                Design-Bausteine: Karte, Ring, Seite, Sheet, Formular …
  modules/
    index.ts           ← DIE LISTE ALLER BEREICHE (hier hinzufügen/entfernen)
    heute/             Startseite
    fitness/ schule/ ziele/ gewohnheiten/ geld/ schlaf/ ernaehrung/ freunde/ hobbys/ stimmung/
    mehr/              Mehr-Menü, Import-Seite, Backup-Seite
```

### Einen neuen Bereich hinzufügen
1. Ordner `src/modules/meinbereich/` anlegen mit `Seite.tsx` (die Seite) und `index.ts` (Name, Icon, Farbe). Am einfachsten kopierst du einen vorhandenen Bereich.
2. Neue Tabellen in `src/core/db.ts` als neue `this.version(3).stores({...})` eintragen.
3. Den Bereich in `src/modules/index.ts` in die Liste aufnehmen.

Ausblenden geht auch ohne Code: **Mehr → Bereiche anzeigen**.
