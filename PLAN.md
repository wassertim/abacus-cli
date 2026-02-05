# Abacus CLI - Phase 4: Duplikat-Prüfung + vollständige API

## Kontext

Phase 1-3 sind fertig:
- Login/Session-Persistenz funktioniert
- Discovery hat ergeben: Vaadin (kein REST) → Browser-Automatisierung
- `time log` erstellt neue Einträge via Playwright (Combobox-Auswahl mit `pressSequentially` + Enter)

## Ziel

Duplikat-Prüfung beim Erfassen + Edit-Support für bestehende Einträge.

## Flow für `abacus time log`

```
1. Browser öffnen, zur Leistungen-Seite navigieren
2. Einträge für Zieldatum + Projekt lesen
3. Falls Eintrag existiert:
   → Zeigen: "8.00 STD bereits gebucht am 05.02.2026 für Projekt 71100000001"
   → Fragen: "Bestehenden updaten oder neuen hinzufügen? [u/n]"
     - "u" → Eintrag anklicken → Edit-Dialog → Felder aktualisieren
     - "n" → Neuen Eintrag erfassen (wie bisher)
4. Falls kein Eintrag: Neuen Eintrag erfassen
5. Formular ausfüllen, Browser offen lassen für Review (kein Auto-Save)
```

## Navigation: Leistungen-Seite statt Wochenrapport

Bisheriger Weg: Wochenrapport → Tag wählen → "+" klicken
Neuer Weg: **Leistungen-Seite** nutzen (Menu: Rapportierung → Leistungen)

Vorteile:
- Leistungen-Tabelle hat Spalten: Datum, Projekt, Leistungsart, Text, Anzahl, Status
- Einträge können nach Datum gefiltert werden (Datepicker oben)
- Klick auf Eintrag öffnet Edit-Dialog (gleicher Aufbau wie "Neue Leistung erfassen")
- "Leistung erfassen" Button oben rechts für neue Einträge

## Implementierung

### Datei: `src/api.ts`

**Bestehende Funktionen (behalten):**
- `waitForVaadin(page)`
- `fillCombobox(page, movieId, value)`

**Neue Funktion: `navigateToLeistungen(page)`**
```
1. page.goto(abacusUrl)
2. Rapportierung expandieren (movie-id="menu-item_rapportierung")
3. Klick auf a[title="Leistungen"]
4. waitForVaadin
```

**Neue Funktion: `readEntries(page, date): ExistingEntry[]`**
```
1. Datum im Datepicker auf Zielmonat setzen
2. Tabelle auslesen: Zeilen im vaadin-grid lesen
3. Filtern nach Datum (Spalte "Datum")
4. Return: Array von { datum, projekt, leistungsart, text, anzahl, status, rowIndex }
```

**Neue Funktion: `clickEntry(page, rowIndex)`**
```
1. Zeile in der Tabelle anklicken
2. Edit-Dialog öffnet sich (gleicher Aufbau wie Neu-Dialog)
```

**Refactored: `fillDialog(page, entry)`**
Extrahiert aus bestehendem `logTime()` - füllt die Dialog-Felder aus.
Wird von sowohl Neu-Erfassen als auch Edit genutzt.

**Refactored: `logTime(entry)` → Hauptfunktion**
```
1. navigateToLeistungen(page)
2. entries = readEntries(page, entry.date)
3. match = entries.find(e => e.projekt.includes(entry.project))
4. if (match):
     - Console: "X STD bereits gebucht am DD.MM.YYYY für Projekt ..."
     - Prompt: "Bestehenden updaten oder neuen hinzufügen? [u/n]"
     - "u" → clickEntry(page, match.rowIndex) → fillDialog(page, entry)
     - "n" → Klick "Leistung erfassen" Button → fillDialog(page, entry)
5. else:
     - Klick "Leistung erfassen" Button → fillDialog(page, entry)
6. Browser offen lassen für Review (2 min timeout)
```

### Datei: `src/commands/time.ts`

Keine grossen Änderungen. Flags bleiben:
```
--project <name>        Projektnummer (z.B. 71100000001)
--hours <n>             Stunden
--leistungsart <name>   Leistungsart (default: 1435)
--text <text>           Buchungstext
--date <YYYY-MM-DD>     Datum (default: heute)
```

### Datei: `src/index.ts`

Unverändert.

## Kritische Punkte

1. **Tabelle lesen**: Vaadin-Grid ist virtualisiert. Wir müssen die sichtbaren Zeilen auslesen. Da die Leistungen-Seite eine Monatsansicht zeigt, sollten alle Einträge eines Monats sichtbar sein (typisch < 30 Zeilen).

2. **Datum im Datepicker**: Falls das Zieldatum in einem anderen Monat liegt, müssen wir den Monat im Datepicker wechseln.

3. **Edit-Dialog**: Gleicher Aufbau wie Neu-Dialog (bestätigt vom User). Gleiche `fillDialog()` Funktion nutzbar.

4. **User-Prompt**: `readline` aus Node.js für die interaktive Frage im Terminal (u/n).

## Verifikation

1. `npm run build` kompiliert ohne Fehler
2. `node dist/index.js time log --project 71100000001 --hours 8` auf Tag ohne Eintrag → erstellt neuen Eintrag
3. Gleichen Befehl nochmal → zeigt "bereits gebucht", fragt u/n
4. "u" → öffnet Edit-Dialog mit bestehenden Werten
5. "n" → öffnet Neu-Dialog
