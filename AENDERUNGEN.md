# Änderungen

Neueste Änderungen stehen oben. Zurück zum Stand vor einem Umbau: `git reset --hard <Tag>` (z. B. `vor-umbau-2026-10-13`).

## 13.10.2026

**Tab-Leiste wie bei Apple.** Auf Heute, Mehr und den Bereichen, die selbst in der Leiste stehen, ist die Leiste sichtbar. Auf allen anderen Seiten und beim Runterscrollen fährt sie weich nach unten weg. Sie kommt zurück beim Hochscrollen, bei „Zurück“ und beim Hochwischen knapp über dem Home-Balken, wo dann ein kleiner Griff zu sehen ist. Jede Unterseite hat jetzt oben links „‹ Zurück“.

**Kalenderfarben.** Im Kalender steht unter jedem Tag ein farbiger Punkt pro Kalender (höchstens 3, sonst „+“), darunter eine Legende. Neue Kalender bekommen automatisch die nächste freie Apple-Farbe. Unter Mehr → Einstellungen → Kalenderfarben kannst du sie ändern. Die gleiche Farbe gibt es als Streifen an den Terminen.

**Life Sync löscht gelöschte Termine.** Jeder Import gilt als vollständiger Stand von heute 00:00 bis heute + 14 Tage (einstellbar unter Einstellungen → Life Sync: Termine). Importierte Termine, die dort fehlen, werden gelöscht. Selbst angelegte und vergangene Termine bleiben. Ohne Termine im Import oder bei unlesbaren Zeilen wird zur Sicherheit nichts gelöscht. Nach dem Import siehst du „X neu, Y aktualisiert, Z gelöscht“.

**Apple Health über Life Sync.** Zeilen mit `"typ":"health"` werden importiert: Schritte, Schlafphasen, Gewicht, Größe, Körperfett, Wasser, Alkohol, Kalorien und Makros. Zahlen mit Komma oder Einheit („72,4 kg“) werden verstanden, doppelte Werte ersetzt, unbekannte Arten gespeichert und gemeldet. Kaputte Zeilen werden übersprungen und mit Zeilennummer angezeigt, statt den ganzen Import abzubrechen.

**Health in der App.** Schlaf zeigt jetzt Phasen als gestapelte Balken und einen eigenen Schlafindex (0–100). Ernährung zeigt Kalorien und Makros aus Health, ohne die Foto-Schätzungen dazuzuzählen, dazu Wasser (jetzt in ml, 1 Glas = 250 ml) und Alkohol pro Tag und Woche. Neu gibt es den Bereich „Körper“ (Gewicht, KFA, Größe, BMI) und auf Heute drei kleine Kacheln für Schritte, Schlaf und Wasser. Werte aus Health tragen ein kleines Herz.

**Test für den Import.** `npm run test:import` spielt Beispieldaten mit allen Typen durch, auch kaputte Zeilen, in einer nachgebauten Datenbank. Deine echten Daten bleiben dabei unberührt.
