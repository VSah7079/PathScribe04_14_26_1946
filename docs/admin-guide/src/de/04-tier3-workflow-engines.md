---
chapter: 4
id: ch4
title: Stufe 3: Workflow-Engines und betriebliche Konfiguration (als Drittes einrichten)
---

# Stufe 3: Workflow-Engines und betriebliche Konfiguration (als Drittes einrichten) {#ch4}

Stufe 3 ist der Teil der Konfiguration, der festlegt, wie die Arbeit abläuft, sobald die Personen, Standorte, Geräte und Wörterbücher der Stufen 1 und 2 vorhanden sind: wohin ein Fall weitergeleitet wird, welche Befehle und Makros ein Arbeitsplatz anbietet, wie ein Fall vor und nach der Freigabe zur Prüfung zurückgehalten wird und wie Durchlaufzeit und Qualität gemessen werden. Richten Sie diese Stufe als Drittes ein. Die meisten Bildschirme hier lesen ein Wörterbuch aus Stufe 1 oder Stufe 2 (eine Einrichtung, eine Subspezialität, einen Probentyp) und zeigen eine leere Auswahlliste, solange dieses Wörterbuch nicht gefüllt ist.

Lesen Sie dies, bevor Sie beginnen. Vier Dinge unterscheiden sich von dem, was die Bildschirmtitel des Produkts vermuten lassen.

- **Es gibt keine „Workflow-Vorlage für die Auftragserfassung“ und keine „Workflow-Vorlage für den Probeneingang“.** Das Verhalten beim Probeneingang verteilt sich auf Einstellungen, die dort beschrieben sind, wo sie liegen; [Wo die Einstellungen zum Probeneingang liegen](#ch4-accession-settings) listet sie auf. **Nicht umgesetzt.**
- **Mehrere Bildschirme speichern ihre Werte im Browser des Computers, mit dem sie eingestellt wurden** (Fallrouting, Routingregeln, Aktionsregister, Tuschierungs-Validierungsmodus, Nachverfolgung, Biopsie–Resektat-Korrelation, Beitragseinstellungen und die Bereitstellungsschalter auf dem Reiter Sprache). Der Status des Bildschirms weist darauf hin. Solche Einstellungen sind für andere Arbeitsplätze erst sichtbar, wenn die Version mit API-Server vorliegt.
- **Die digitale Pathologie ist überwiegend ein Anbieterwörterbuch.** PathScribe führt Anbieter und eine Startadresse des Viewers; es hat keinen Scannertreiber und zeigt Objektträgerbilder nicht selbst an. Siehe [Digitale Pathologie](#ch4-digital-pathology).
- **Fast jede Einstellung zur Freigabe und zur Qualität hat einen Standardwert der Organisation und eine Überschreibung je Labor.** Die Überschreibung wird im Bearbeitungsfenster der [Einrichtungskonfiguration](#screen-facility-dictionary) oder im Bildschirm selbst vorgenommen.

Richten Sie Stufe 3 in dieser Reihenfolge ein. Jeder Einrichtungsbildschirm enthält einen Kasten „Einrichtungsreihenfolge“ mit denselben Angaben, und der Builder prüft, dass kein Bildschirm einen anderen voraussetzt, der erst später folgt. Als Referenz gekennzeichnete Bildschirme sind Seiten für den Tagesbetrieb und gehören nicht zur Einrichtung.

1. [Routingregeln](#screen-routing_rules): Schlüsselwortregeln, die einen Fall an einen Subspezialitäts-Pool weiterleiten.
2. [Fallrouting](#screen-case_routing): die Einstellungen zur Pool-Zuweisung und der umfangreichere Regeleditor.
3. [Aktionsregister (Reiter)](#screen-tab-actions): die Befehle, ihre Tastenkürzel und Sprachphrasen.
4. [Aktionsgruppen](#screen-action_groups): benannte Befehlsbündel für einen Arbeitsplatz.
5. [Makros (Reiter)](#screen-tab-macros): gemeinsam genutzte Textmakros und der Import von Word-AutoText.
6. [Sprache (Reiter)](#screen-tab-voice): Schalter der Spracherkennung, persönliche Spracheinstellungen und das Fußpedal.
7. [Zuschnitt-Routenüberschreibungen](#screen-grossing_route_overrides): eine feste Zuschnittroute für eine Einrichtung und einen Probentyp.
8. [Tuschierungs-Validierungsmodus](#screen-inking_validation_mode): bei Tuschierungsproblemen warnen oder erzwingen.
9. [Anbieterintegrationen](#screen-vendor_integrations): Anbieter für digitale Pathologie, WSI-Viewer, Bildspeicher und Zuschnittbildgebung.
10. [Peer-Review vor Freigabe](#screen-peer_review_gate): wo die Freigabe auf ein Peer-Review wartet.
11. [Einstellungen zur Übereinstimmungsprüfung](#screen-concordance_review_settings): Vergleich vorläufig gegenüber endgültig.
12. [Freigabepuffer nach Signierung](#screen-release_buffer): das Rückrufzeitfenster nach der Freigabe.
13. [Abzeichnungsregeln nach Land](#screen-country_signing_rules): nationale Regeln je Beteiligungsart (nur Plattformadministrator).
14. [Revisionsgründe](#screen-revision_reasons): welche Gründe für Nachträge und Korrekturen eine CAPA empfehlen.
15. [Tumorboard-Regeln für automatische Markierung](#screen-tumor_board_rules): was einen Fall für ein Board vormerkt.
16. [Biopsie–Resektat-Korrelation](#screen-biopsy_resection_correlation): das Zeitfenster von der Biopsie bis zum Resektat.
17. [Zytologie-Histologie-Korrelation](#screen-cytology_histology_correlation): das Zeitfenster von der Zytologie bis zur Biopsie.
18. [Nachverfolgung](#screen-follow_up_tracking): Warnungen und E-Mail an Ärzte bei Nachuntersuchungen, die nicht eingetroffen sind.
19. [Kritische intraoperative Befunde](#screen-intraop_critical_results): Schnellschnittbefunde, die direkt an die Chirurgin oder den Chirurgen gehen.
20. [OP-Suite-Terminals](#screen-or_suite_terminals): Anzeigen im Operationssaal und ihre Token.
21. [Anzeigeprofile](#screen-display_profiles): Wandanzeigen für das Facility-Ops-Dashboard.
22. [QS-Konfigurationszentrum](#screen-qa_config_center): QS-Aktivitäten, Stichproben und CAPA-Auslöser.
23. [Richtlinie für Diskrepanztrends](#screen-qa_trend_policy): wann wiederholte Diskordanz markiert wird.
24. [TAT-Konfiguration (Reiter)](#screen-tab-tat): Zielwerte für die Durchlaufzeit.
25. [Leistungsziele](#screen-performance_targets): die Zahlen, an denen eine Pathologin oder ein Pathologe gemessen wird.
26. [Zytologie-QK-Regeln](#screen-cytology_qc_rules): wer für das Zytologie-Peer-Review ausgewählt wird.
27. [Zufallsauswahlquoten der Zytologie-QK](#screen-cytology_qc_settings): die Prozentsätze der Zufallsstichprobe.
28. [Tageshöchstmenge der Zytologie](#screen-cytology_workload_cap): die tägliche Objektträgergrenze und der Screening-Tag.
29. [Beitragseinstellungen](#screen-contribution_settings): die Seite Mein Beitrag.
30. [Feedback](#screen-feedback): die Schaltfläche für QS-Feedback.
31. [Forschungs-Feed](#screen-research_feed): die PubMed-Schlagzeile auf der Startseite.
32. [Arbeitsplatz-Gründe](#screen-bench_reasons): die antippbaren Gründe am Arbeitsplatz, in den Worten Ihres Labors.

Referenzseiten, nicht Teil der Einrichtung: [Chargenverwaltung](#screen-batch-management), [Einbettungsstation](#screen-embedding-station), [Mikrotomie-Arbeitsplatz](#screen-microtomy-workstation), [Objektträger-Verteilstation](#screen-slide-distribution-station), [Startseite](#screen-home), [Lockbox-Einwurf](#screen-lockbox-drop-off), [Qualitätssicherung](#screen-quality-assurance), [Randausnahmen-Überprüfung](#screen-margin-exception-review) und [Zytologie-QK-Warteschlange](#screen-cytology-qc-queue).

## Auftragserfassung und Probeneingang: Weiterleitung und Aktionsbündel {#ch4-order-entry}
Breadcrumb: Startseite > Konfiguration

Dieser Teil behandelt die Einstellungen, die festlegen, wohin ein Fall nach seiner Anlage geht und welche Befehle ein Arbeitsplatz anbietet. Lesen Sie zuerst [Wo die Einstellungen zum Probeneingang liegen](#ch4-accession-settings): PathScribe hat keinen einzelnen Bildschirm „Workflow-Vorlage für die Auftragserfassung“, und dieser Abschnitt nennt, was stattdessen vorhanden ist.

### Wo die Einstellungen zum Probeneingang liegen {#ch4-accession-settings}
Breadcrumb: Startseite > Konfiguration > System

**Status:** Teilweise

Es gibt in PathScribe heute keinen konfigurierbaren Bildschirm „Workflow-Vorlage für die Auftragserfassung“ oder „Workflow-Vorlage für den Probeneingang“. **Nicht umgesetzt.** Der Bildschirm Probeneingang (Startseite > Akzession) liest sein Verhalten aus den Wörterbüchern und Regeln unten, die jeweils auf einem eigenen Bildschirm eingerichtet werden. Der Bildschirm Probeneingang selbst hat keine eigene Einstellungsseite. Die Liste stammt aus den Diensten, die der Bildschirm Probeneingang aufruft.

| Was sich beim Probeneingang ändert | Wo Sie es einstellen | Kapitel |
|---|---|---|
| Das Format der Eingangsnummer | [Fallmaskenkonfiguration](#screen-case_mask_config) | Stufe 1 |
| Welche Felder ausgefüllt sein müssen, bevor der Probeneingang des Falls erfolgen kann (Seiten-IDs `accession` und `clinicalHistory`) | [Pflichtfelder](#screen-field_requirements) | Stufe 1 |
| Die Abteilungsliste und die Zuschnittvorlage, mit der eine Abteilung beginnt | [Abteilungen](#screen-departments) | Stufe 2 |
| Die Auswahlliste der Proben und die Auswahlliste der Behälter | [Präparatwörterbuch](#screen-specimens) und [Behältertypen](#screen-container_types) | Stufe 2 |
| Die Auswahlliste der einsendenden Ärzte | [Ärzte](#screen-physicians) | Stufe 2 |
| Die Mängelgründe, die beim Eingang gemeldet werden können | [Präparatmängel](#screen-deficiencies) | Stufe 2 |
| Die Zuschnittroute, die einer Probe beim Probeneingang zugewiesen wird, wenn eine einrichtungsspezifische Überschreibung gilt | [Zuschnitt-Routenüberschreibungen](#screen-grossing_route_overrides) | Stufe 3 |
| In welchen Pool ein nicht zugewiesener Fall weitergeleitet wird (dies läuft, wenn der Zuschnitt abgeschlossen ist, nicht beim Probeneingang) | [Fallrouting](#screen-case_routing) und [Routingregeln](#screen-routing_rules) | Stufe 3 |

Eingehende Aufträge aus der Schnittstellen-Engine werden mit dem Crosswalk der Probencodes abgeglichen, der unter Auftragstypen und Eingangsregeln in Stufe 6 eingerichtet wird. Die Serveraufrufe für eingehende Aufträge, den Crosswalk, Entwürfe und die Ausgangswarteschlange des Probeneingangs sind in `docs/architecture/ACCESSIONING_API.md` beschrieben.

**Bekannte Grenzen.** Geplant: eine Vorlage, die diese Einstellungen je Workflow bündelt. Es ist kein Termin festgelegt. Bis dahin wird jede Einstellung auf ihrem eigenen Bildschirm geändert.

### Routingregeln {#screen-routing_rules}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Routingregeln

**Status:** Demonstration

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Integrationen**
**2. Wartungspunkt:** Routingregeln

**3. Geschäftszweck und Geltungsbereich.** Eine Routingregel leitet einen Fall an einen Subspezialitäts-Pool weiter, indem sie Wörter in der Probenbeschreibung abgleicht. Dieser Bildschirm ist der einfache Editor für die Schlüsselwortregeln: Eine Regel besteht aus einem Pool, einer Liste von Schlüsselwörtern, einer Priorität und einer Notiz. Die Regeln werden in Prioritätsreihenfolge geprüft, und der erste Treffer gewinnt. PathScribe liefert acht integrierte Regeln mit (kolorektal, oberer Gastrointestinaltrakt, hepatobiliär und pankreatisch, Mamma, Urogenitaltrakt, gynäkologisch, Dermatopathologie, Hämatopathologie; Prioritäten 10 bis 60). Integrierte Regeln können bearbeitet und ausgeschaltet, aber nicht gelöscht werden. Dieselben Regeln werden auch mit mehr Optionen (Abgleich nach Probentyp, ein durchführendes Labor, Ausweich-Pools je Labor) unter [Fallrouting](#screen-case_routing) angezeigt; beide Bildschirme lesen und schreiben eine gemeinsame gespeicherte Liste.

**4. Voraussetzungen und Abhängigkeiten.** Eine Regel verweist auf einen Pool, und ein Pool ist eine Subspezialität, bei der **Pool / Arbeitsgruppe** eingeschaltet ist. Wenn Sie die Subspezialitäten überspringen, ist die Liste **An Pool weiterleiten** leer, es erscheint eine Warnung, und eine Regel kann nicht gespeichert werden.

Setup step: Tier 3, step 1
Requires: [Subspezialitäten](#screen-subspecialties)
Unlocks: [Fallrouting](#screen-case_routing)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-routing_rules - Liste der Routingregeln mit dem Feld Weiterleitung testen, Suche und Filter]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Weiterleitung testen (Probenbeschreibung) | Text | Optional | Geben Sie eine Beschreibung ein und wählen Sie **Testen**. Der Bildschirm zeigt den Pool der ersten passenden aktiven Regel sowie die Notiz und die Priorität der Regel oder eine Warnung, dass keine Regel passt und der Fall an den Ausweich-Pool ginge. Getestet werden nur Schlüsselwortregeln, und immer als globaler Regelsatz (es wird kein durchführendes Labor angewendet). | Leer |
| Schlüsselwörter oder Notizen durchsuchen | Text | Optional | Filtert die Liste nach Schlüsselwort oder Notiztext. | Leer |
| Weiterleitungsregeln filtern | Auswahl: Alle, Aktiv, Inaktiv, Nur benutzerdefiniert | Optional | Filtert die Liste. **Nur benutzerdefiniert** blendet die integrierten Regeln aus. | Alle |
| Prio. | Ganzzahl | Nicht zutreffend | Priorität, in der Liste angezeigt. Der niedrigere Wert wird zuerst geprüft. | Nicht zutreffend |
| Weiterleitung an Pool | Poolname | Nicht zutreffend | Der Zielpool, in der Liste angezeigt. | Nicht zutreffend |
| Schlüsselwörter | Chips | Nicht zutreffend | Die ersten acht Schlüsselwörter, dann „+N weitere“. | Nicht zutreffend |
| Notiz | Text | Nicht zutreffend | Die Notiz der Regel. | Nicht zutreffend |
| Status (Schalter in der Liste) | Schalter Aktiv / Inaktiv | Optional | Schaltet die Regel sofort ein oder aus. Änderungen werden automatisch gespeichert. | Nicht zutreffend |
| Bearbeiten, Duplizieren, Löschen | Zeilenschaltflächen | Nicht zutreffend | **Duplizieren** öffnet das Fenster **Weiterleitungsregel hinzufügen**, vorausgefüllt mit einer Kopie der Regel. **Löschen** (nur benutzerdefinierte Regeln) fragt nach einer Bestätigung und entfernt die Regel. Integrierte Regeln zeigen kein **Löschen**. | Nicht zutreffend |

#### Fenster Weiterleitungsregel hinzufügen und Regel bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| An Pool weiterleiten | Auswahlliste der aktiven Subspezialitäten, bei denen Pool / Arbeitsgruppe eingeschaltet ist (aus [Subspezialitäten](#screen-subspecialties)) | Pflicht | Der Pool, an den der Fall geht. Zeigt „Wählen Sie einen Pool aus“, wenn die Liste leer ist. | Der erste Pool der Liste |
| Schlüsselwörter | Eingegebene Wörter, mit **Hinzufügen** oder der Eingabetaste ergänzt und als Chips angezeigt | Pflicht (mindestens eines) | Wenn eine Probenbeschreibung ein beliebiges Schlüsselwort enthält, passt die Regel. Der Abgleich beachtet die Groß-/Kleinschreibung nicht, arbeitet mit Teilübereinstimmung und ignoriert Satzzeichen. Ein Schlüsselwort, das bereits in der Liste steht, wird abgelehnt. Schlüsselwörter werden in Kleinbuchstaben gespeichert. | Keine |
| Priorität | Ganzzahl | Pflicht | Der niedrigere Wert wird zuerst geprüft. Das Fenster lehnt eine Priorität ab, die eine andere Regel bereits verwendet („Priorität N wird bereits von einer anderen Regel verwendet“). Integrierte Regeln verwenden 10 bis 60. | 100 |
| Notiz (optional) | Text | Optional | Freitext für die Administratorin oder den Administrator. In der Liste durchsuchbar. | Leer |
| Status | Schalter Aktiv / Inaktiv | Optional | Eine inaktive Regel wird bei der Weiterleitung übersprungen. | Aktiv |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, duplizieren, löschen, ein- oder ausschalten: `config:case-routing:manage` (hohes Risiko, daher wird jede Prüfung protokolliert). Admin und Laborleitung haben sie standardmäßig; Superadmin hat den gesamten Katalog (außer `config:ai-prompt:approve`, aus Gründen der Aufgabentrennung zurückgehalten; die Laborleitung gibt KI-Anweisungen frei, der Support von ForMedrixAI nie).
**Bekannte Grenzen.** Die Regeln liegen im Demonstrationsspeicher des Browsers; für Routingregeln gibt es noch keinen Serververtrag (die Serveraufrufe `routing-rules` in `docs/architecture/ROUTING_API.md` gehören zu einer anderen Funktion, den Zuordnungen von Einrichtung, Arzt und Protokoll). Dieser Bildschirm kann kein durchführendes Labor festlegen und nicht nach Probentyp abgleichen; verwenden Sie dafür [Fallrouting](#screen-case_routing). Die Prüfung der Priorität, die eine doppelte Priorität ablehnt, wird im Fallrouting nicht angewendet.

### Fallrouting {#screen-case_routing}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Fallrouting

**Status:** Demonstration

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Integrationen**
**2. Wartungspunkt:** Fallrouting

**3. Geschäftszweck und Geltungsbereich.** Das Fallrouting legt fest, wie ein Fall ohne zugewiesene Pathologin oder zugewiesenen Pathologen einen Subspezialitäts-Pool erreicht. Der Bildschirm enthält den Hauptschalter, den Ausweich-Pool (einen globalen Pool und eine optionale Überschreibung für jedes durchführende Labor), die Routingregeln mit Eingrenzung nach Probentyp und durchführendem Labor, ein Testfeld und eine Schaltfläche, die jeden nicht zugewiesenen Fall sofort weiterleitet. Das Diagramm „So funktioniert die Weiterleitung“ auf dem Bildschirm gibt die Reihenfolge an: Ein Fall trifft ein, PathScribe prüft auf eine direkte Zuweisung (ein Fall, der bereits eine Pathologin oder einen Pathologen hat, bleibt unberührt), dann die eigenen Regeln des Labors, dann die globalen Regeln, dann den Ausweich-Pool des Labors, dann den globalen Ausweich-Pool, und wenn keiner vorhanden ist, wird der Fall zur manuellen Zuweisung markiert. Ein Pool, der unter Subspezialitäten als Standard / Catch-All markiert ist, hat Vorrang vor den hier festgelegten Ausweich-Pools.

**Wann die Weiterleitung läuft.** Die Weiterleitung läuft, wenn der Zuschnitt eines Falls abgeschlossen ist (ein STAT-Fall nimmt den STAT-Pfad), und nur beim ersten Mal, wenn die eigentliche diagnostische Arbeit an ihm beginnt. Sie läuft nicht beim Probeneingang. Ein Fall ohne Proben wird nicht weitergeleitet.

**4. Voraussetzungen und Abhängigkeiten.** Pools stammen aus den [Subspezialitäten](#screen-subspecialties) (Pool / Arbeitsgruppe eingeschaltet), Probentypen aus dem [Präparatwörterbuch](#screen-specimens) und durchführende Labore aus dem [Einrichtungskonfiguration](#screen-facility-dictionary) (Einrichtungen mit der Rolle durchführendes Labor). Wenn Sie die Pools überspringen, zeigt der Bildschirm „Keine aktiven Pools gefunden“, und es kann kein Ausweich-Pool gewählt werden; wenn Sie die Einrichtungen überspringen, sind die Tabelle je Labor und die Laborauswahllisten leer.

Setup step: Tier 3, step 2
Requires: [Routingregeln](#screen-routing_rules), [Subspezialitäten](#screen-subspecialties), [Präparatwörterbuch](#screen-specimens), [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-case_routing - Fallrouting mit Diagramm, Ausweich-Pool, Regeltabelle und manuellem Lauf]

**6. Feldreferenz.**

#### Weiterleitungskonfiguration

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Automatische Pool-Weiterleitung | Kontrollkästchen Ja/Nein | Optional | Eingeschaltet werden Fälle ohne LIS-Zuweisung nach Probentyp weitergeleitet. Ausgeschaltet liefert die Weiterleitung „nicht weitergeleitet“, und der Fall bleibt nicht zugewiesen. | Ein |
| STAT-Fälle sofort weiterleiten | Kontrollkästchen Ja/Nein | Optional | Ausgeschaltet wird ein STAT-Fall beim Abschluss des Zuschnitts gar nicht weitergeleitet (das Ergebnis lautet „Sofortige STAT-Weiterleitung ist deaktiviert“). | Ein |
| Zuweisungs-Timeout (Sekunden) | Ganzzahl, 0 bis 3600 | Optional | Auf dem Bildschirm beschrieben als die Zeit, die PathScribe auf die Zuweisung durch das LIS wartet, bevor es an einen Pool weiterleitet; 0 leitet sofort weiter. Der Wert wird gespeichert, aber heute liest ihn kein Weiterleitungscode, daher hat er keine Wirkung. | 300 |
| Globaler Ausweich-Pool | Auswahlliste der aktiven Pools ohne durchführendes Labor (aus [Subspezialitäten](#screen-subspecialties)) sowie „Keiner (manuelle Zuweisung erforderlich)“ | Optional | Wohin ein Fall geht, wenn keine Regel passt und weder ein Ausweich-Pool des Labors noch ein Pool Standard / Catch-All gilt. | Allgemeine Pathologie (`general`) |
| Ausweich-Pool-Überschreibung (eine Zeile je durchführendes Labor) | Auswahlliste der Pools, die global sind oder zu diesem Labor gehören, sowie „Globalen Standard verwenden“ | Optional | Ein Ausweich-Pool für Fälle dieses durchführenden Labors. Ein unter Subspezialitäten markierter Pool Standard / Catch-All hat Vorrang vor dieser Überschreibung, und die Überschreibung hat Vorrang vor dem globalen Ausweich-Pool. | Globalen Standard verwenden |
| Weiterleitungskonfiguration speichern | Schaltfläche | Nicht zutreffend | Speichert die Schalter, das Timeout und die Ausweich-Pools. Regeln werden bei jeder Änderung für sich gespeichert. | Nicht zutreffend |

#### Tabelle Weiterleitungsregeln

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche nach Schlüsselwort oder Notiz | Text | Optional | Filtert die Liste. | Leer |
| Nach Status filtern | Auswahl: Alle, Aktiv, Inaktiv | Optional | Filtert die Liste. | Alle |
| Nach Labor filtern | Auswahl: Alle Labore, Nur global oder ein durchführendes Labor | Optional | Filtert die Liste. | Alle Labore |
| Priorität, Übereinstimmung, Pool, Durchführendes Labor, Status | Spalten | Nicht zutreffend | Übereinstimmung zeigt „N Probentypen“, wenn die Regel Probentypen zuordnet, andernfalls die ersten vier Schlüsselwörter. Die Liste zeigt zuerst laborspezifische Regeln, dann globale Regeln, jeweils nach Priorität. Integrierte Regeln tragen ein Etikett **INTEGRIERT**. | Nicht zutreffend |
| Bearbeiten, Duplizieren, Deaktivieren / Reaktivieren | Zeilenschaltflächen | Nicht zutreffend | Hier gibt es kein Löschen (eine benutzerdefinierte Regel löschen Sie unter [Routingregeln](#screen-routing_rules)). **Duplizieren** öffnet das Fenster **Weiterleitungsregel hinzufügen** mit einer Kopie. | Nicht zutreffend |
| + Weiterleitungsregel hinzufügen | Schaltfläche | Nicht zutreffend | Öffnet das Fenster unten. | Nicht zutreffend |

#### Fenster Weiterleitungsregel hinzufügen und Weiterleitungsregel bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Zugeordnete Probentypen | Checkliste der aktiven Einträge des [Präparatwörterbuchs](#screen-specimens), mit einem Suchfeld | Pflicht, sofern kein Schlüsselwort eingegeben wird | Der deterministische Abgleich: Eine aus dem Präparatwörterbuch gewählte Probe wird anhand ihrer ID abgeglichen. Das Fenster zählt, wie viele ausgewählt sind. | Keine ausgewählt |
| Schlüsselwort-Ausweich | Durch Kommas getrennte Wörter | Pflicht, sofern kein Probentyp zugeordnet ist | Wird nur für eine Probe verwendet, die keinen Eintrag im Präparatwörterbuch hat (manuelle oder Altdaten-Erfassung). Groß-/Kleinschreibung wird nicht beachtet, Teilübereinstimmung. | Leer |
| Ziel-Pool | Auswahlliste der aktiven Pools, angezeigt als „Name, Global“ oder „Name, Labor“. Ist ein durchführendes Labor gewählt, werden nur globale Pools und die Pools dieses Labors angeboten | Pflicht | Der Pool, an den der Fall geht. Fehler: „Ein Ziel-Pool ist erforderlich.“ | Keiner |
| Priorität | Ganzzahl, mindestens 1 | Pflicht | Der niedrigere Wert wird innerhalb der laborspezifischen Ebene und innerhalb der globalen Ebene zuerst geprüft. Fehler: „Die Priorität muss eine positive Zahl sein.“ Dieses Fenster lehnt keine Priorität ab, die eine andere Regel bereits verwendet. | 100 |
| Durchführendes Labor | Auswahlliste der durchführenden Labore oder „Global (für jedes Labor geprüft)“ | Optional | Eine laborspezifische Regel wird für die eigenen Fälle dieses Labors vor den globalen Regeln geprüft. | Global |
| Notiz | Text | Optional | Freitext, durchsuchbar. | Leer |
| Status | Schalter Aktiv / Inaktiv | Optional | Eine inaktive Regel wird übersprungen. | Aktiv |

#### Weiterleitung testen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Probenverzeichniseintrag | Auswahlliste der aktiven Probeneinträge oder „Keiner (stattdessen den Schlüsselwort-Ausweich testen)“ | Optional | Testet den Abgleich nach Probentyp. | Keiner |
| Probenbeschreibung | Text | Optional | Testet den Schlüsselwort-Ausweich. | Leer |
| Als durchführendes Labor | Auswahlliste der durchführenden Labore oder „Nur global“ | Optional | Testet als Fall dieses Labors. Das Ergebnis nennt den Pool, ob der Treffer nach Probentyp oder nach Schlüsselwort zustande kam, und das Labor der Regel. | Nur global |

#### Manueller Weiterleitungslauf

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Nicht zugewiesene Fälle jetzt weiterleiten | Schaltfläche | Nicht zutreffend | Leitet jeden Fall weiter, der keine zugewiesene Pathologin und keinen zugewiesenen Pathologen hat, noch in keinem Pool liegt und nicht finalisiert ist. Erfordert `case:routing:run`; ohne diese Berechtigung läuft nichts. Danach zeigt der Bildschirm die Anzahlen Weitergeleitet, Übersprungen und Fehlgeschlagen sowie eine Zeile je Fall mit dem Grund. Nützlich nach einer Änderung von Regeln oder nach einem LIS-Ausfall. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Konfiguration und Regeln ändern: `config:case-routing:manage` (hohes Risiko, protokolliert). Die manuelle Weiterleitung ausführen: `case:routing:run` (hohes Risiko, protokolliert). Admin und Laborleitung haben beide standardmäßig; Superadmin hat den gesamten Katalog (außer `config:ai-prompt:approve`, aus Gründen der Aufgabentrennung zurückgehalten; die Laborleitung gibt KI-Anweisungen frei, der Support von ForMedrixAI nie).
**Bekannte Grenzen.** Demonstration: Regeln und Konfiguration liegen im Demonstrationsspeicher des Browsers, und es gibt noch keinen Serververtrag. Das **Zuweisungs-Timeout** wird gespeichert, aber nicht verwendet. Die Weiterleitung läuft nur beim Abschluss des Zuschnitts; beim Probeneingang gibt es keine Weiterleitung.

### Aktionsgruppen {#screen-action_groups}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Aktionsgruppen

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Aktionsgruppen

**3. Geschäftszweck und Geltungsbereich.** Eine Aktionsgruppe ist ein benanntes Bündel von Befehlen aus dem Aktionsregister (zum Beispiel „Objektträger / Block erfassen“). Eine Arbeitsplatzgruppe verweist auf Aktionsgruppen für die Aktionen, die sie standardmäßig zulässt, und für die, die sie hinzufügen darf. Eine Aktion kann zu mehr als einer Gruppe gehören.

**4. Voraussetzungen und Abhängigkeiten.** Die Gruppen wählen aus den Befehlen, die auf dem Reiter [Aktionsregister](#screen-tab-actions) aufgeführt sind. Eine Gruppe kann nicht ohne ausgewählte Aktion gespeichert werden.

Setup step: Tier 3, step 4
Requires: [Aktionsregister](#screen-tab-actions)
Unlocks: [Arbeitsplatzgruppen](#screen-workstation_groups)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-action_groups - Liste der Aktionsgruppen mit Suche und Aktionsgruppe hinzufügen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Aktionsgruppen durchsuchen | Text | Optional | Filtert die Liste nach dem Gruppennamen. | Leer |
| Name (Liste) | Text | Nicht zutreffend | Der Gruppenname. | Nicht zutreffend |
| Aktionen (Liste) | Text | Nicht zutreffend | Die Namen der ersten drei Aktionen, dann „+N weitere“. | Nicht zutreffend |
| Status (Liste) | Aktiv / Inaktiv | Nicht zutreffend | In der Liste angezeigt. **Deaktivieren** und **Reaktivieren** ändern ihn sofort. | Nicht zutreffend |
| Bearbeiten, Duplizieren, Deaktivieren / Reaktivieren | Zeilenschaltflächen | Nicht zutreffend | **Duplizieren** öffnet **Aktionsgruppe hinzufügen**, vorausgefüllt mit denselben Aktionen und einem Kopiernamen. Es gibt kein Löschen. | Nicht zutreffend |

#### Fenster Aktionsgruppe hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Der Gruppenname. Fehler: „Erforderlich“. | Keiner |
| Aktionen | Checkliste aller Aktionen im Aktionsregister, angezeigt als „Bezeichnung (Kategorie)“, mit einem Suchfeld | Pflicht (mindestens eine) | Die Befehle im Bündel. Fehler: „Wählen Sie mindestens eine Aktion aus“. | Keine ausgewählt |
| Aktiv | Schalter Aktiv / Inaktiv | Optional | Eine inaktive Gruppe bleibt erhalten, wird aber als Inaktiv markiert. | Aktiv |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, duplizieren, deaktivieren, reaktivieren: `config:action-groups:manage` (hohes Risiko, protokolliert; im Dienst geprüft). Admin und Laborleitung haben sie standardmäßig.
**Bekannte Grenzen.** Keine bekannt. Die Version mit API-Server ist in `docs/architecture/CONFIG_SERVICES_API.md` (`IActionGroupService`) beschrieben.

## Zuschnittvorlagen, Sprachmakros und AutoText-Bibliotheken {#ch4-grossing-macros}
Breadcrumb: Startseite > Konfiguration

Dieser Teil behandelt die Befehle, Textkürzel und Spracheinstellungen, die Zuschnitt und Diktat beschleunigen, sowie die beiden Zuschnittkontrollen (Routenüberschreibungen und die Tuschierungsprüfung). Die drei Zuschnittrouten (Route A Standardgewebe, Route B Flüssigkeit / Zellblock, Route C nur Histologie / direkte Triage) sind fest eingebaut und können nicht ergänzt werden. Die Startroute einer Abteilung wird unter [Abteilungen](#screen-departments) festgelegt. Die Zuschnittvorlagen selbst sind Berichtsvorlagen, die als nicht diagnostisch gekennzeichnet sind; sie werden auf dem [Reiter Berichtsvorlagen](#screen-tab-templates) erstellt, nicht hier.

### Aktionsregister (Reiter) {#screen-tab-actions}
Breadcrumb: Startseite > Konfiguration > Aktionsregister

**Status:** Demonstration

**1. Navigation:** Konfigurationsreiter **Aktionsregister**
**2. Wartungspunkt:** Systemaktionsregister

**3. Geschäftszweck und Geltungsbereich.** Das Aktionsregister listet jeden Befehl auf, den PathScribe per Tastenkürzel oder Sprache ausführen kann (zum Beispiel „aktuelle Kassette drucken“). Die Liste der Befehle ist im Produkt fest vorgegeben; Sie können hier keinen Befehl hinzufügen oder umbenennen. Für jeden Befehl können Sie das Tastenkürzel, die gesprochenen Auslösephrasen und die Arbeitsplatzprofile ändern, auf die er beschränkt ist. Die eigenen gelernten Sprachphrasen einer Person sind eine persönliche Einstellung und werden hier nicht geändert.

**4. Voraussetzungen und Abhängigkeiten.** Für den Reiter selbst keine. [Aktionsgruppen](#screen-action_groups) wählen Befehle aus dieser Liste, daher kann ein Befehl, der hier nicht steht, nicht gebündelt werden.

Setup step: Tier 3, step 3
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: [Aktionsgruppen](#screen-action_groups)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-actions - Systemaktionsregister mit Suche, Kategoriefilter und Schaltflächen Bearbeiten]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Aktionen oder Sprachbefehle durchsuchen | Text | Optional | Filtert nach dem Aktionsnamen oder nach einer Auslösephrase. | Leer |
| Kategorieschaltflächen | Eine Schaltfläche je Kategorie, dazu **Alle** | Optional | Zeigt nur eine Kategorie. | Alle |
| Aktion | Text (schreibgeschützt) | Nicht zutreffend | Der Name des Befehls, darunter die erforderliche Rolle. Ein Befehl, der im Produkt ausgeschaltet ist, zeigt ein Etikett **Deaktiviert**, und seine Schaltfläche **Bearbeiten** ist ausgegraut. | Nicht zutreffend |
| Tastenkombination (Liste) | Tastenkombination (schreibgeschützt) | Nicht zutreffend | Das aktuelle Tastenkürzel. Ein Befehl, der durch die eigene Taste eines Bildschirms verdeckt sein kann, zeigt zusätzlich „Alt+J, dann (Taste)“, womit er immer erreichbar ist. | Nicht zutreffend |
| Sprachbefehle (Liste) | Phrasen (schreibgeschützt) | Nicht zutreffend | Die gesprochenen Phrasen. | Nicht zutreffend |
| Vorlage herunterladen | Schaltfläche | Nicht zutreffend | Lädt `pathscribe_system_config.csv` mit jedem Befehl herunter (ID, Bezeichnung, Kategorie, Tastenkürzel, Sprachbefehle). Der Download wird als Export protokolliert. | Nicht zutreffend |
| Massenimport | Schaltfläche für CSV-Datei | Nicht zutreffend | Liest dasselbe Dateiformat wieder ein. Angewendet werden nur die Spalten Tastenkombination und Sprachbefehle, je vorhandener Befehls-ID. Zeilen mit einer unbekannten ID, einer wiederholten ID, einer geänderten Bezeichnung oder Kategorie, einem deaktivierten Befehl, einem in der Datei wiederholten Tastenkürzel oder einem reservierten Tastenkürzel werden übersprungen, und eine Zusammenfassung listet jeweils die ersten fünf je Ergebnis auf. Sprachbefehle in der Datei werden durch Semikolons getrennt. Neue Zeilen werden nicht akzeptiert. | Nicht zutreffend |

#### Fenster Aktion bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Tastenkombination | Tastenkombination, durch Drücken der Tasten aufgezeichnet | Optional | Klicken Sie in das Feld und drücken Sie die Kombination. Eine Kombination, die bereits ein anderer Befehl verwendet, zeigt einen Fehler mit dem Namen dieses Befehls und ein Angebot **Stattdessen (Vorschlag) verwenden** mit einem Klick; **Änderungen speichern** ist deaktiviert, solange der Fehler angezeigt wird. **Löschen** entfernt das Tastenkürzel. | Das eingebaute Tastenkürzel des Befehls |
| Sprachbefehle | Durch Kommas getrennte Phrasen | Optional | Die gesprochenen Phrasen, die den Befehl ausführen. | Die eingebauten Phrasen des Befehls |
| Arbeitsplatzprofile | Kontrollkästchen: jeder Funktionsbereich von Histologie, Zytologie, Molekularpathologie und Obduktion | Optional | Beschränkt den Befehl auf die gewählten Arbeitsplatzprofile. Lassen Sie alle unmarkiert, um ihn überall zuzulassen. | Keines markiert (überall zugelassen) |

**7. Berechtigungen.** Reiter öffnen: `screen:configuration:open`. Ein Tastenkürzel, eine Auslösephrase oder ein Arbeitsplatzprofil ändern (Bearbeiten oder Massenimport): `config:actions:manage` (hohes Risiko, protokolliert; im Dienst geprüft). Admin und Laborleitung haben sie standardmäßig. Gelernte Sprachbefehle sind die eigene Einstellung einer Person und benötigen keine Berechtigung.
**Seit dem Schreiben des Handbuchs hinzugekommene Befehle (Batches 650 bis 665).** Mitarbeitenden hinzufügen (Strg+Alt+Umschalt+0; erfordert `case:team:manage` am Fall, wie das Fenster Fallteam, und ein Zytologieassistent kann nicht als Konsiliarius hinzugefügt werden); Feld bearbeiten (Alt+E) und Abbrechen (Strg+Alt+J), die zuvor aufgeführt waren und nun wirken; Nachtrag hinzufügen; Abmelden und Weiter; Gemeinsam bearbeitete Fälle (Strg+Alt+F, früher „Meine Fälle filtern“); Zur Zeile gehen (Alt+7) und Fall per Eingangsnummer öffnen (Alt+8) in der Arbeitsliste; und Hilfe anzeigen, die von Alt+V auf **F1** verschoben wurde (Alt+V ist Vollansicht auf dem Befundbildschirm, und die Schaltfläche Hilfe funktioniert immer). Jeder Befehl drückt dieselbe Schaltfläche wie die Maus und ist daher von derselben Berechtigung ausgegraut: Fall abschließen, Finalisieren und Abmelden und Weiter erfordern `surgical:report:sign-out`; Annehmen erfordert `case:pool:claim`; Weitergeben erfordert `case:pool:pass`. Neunundzwanzig registrierte Befehle haben noch keinen Handler im Bildschirm; jeder ist mit seinem Grund in `docs/product/KNOWN_GAPS.md` aufgeführt, und ein Build-Test schlägt fehl, wenn ein neuer Befehl ohne Listener und ohne aufgeführten Grund registriert wird. Die Nachricht an den Mitarbeitenden ist ein Anwendungshinweis, der im Namen der Person gesendet wird, und erfordert daher keine Nachrichtenberechtigung; sie wird auf Englisch gespeichert wie die Nachricht der Prüfanfrage.
**Bekannte Grenzen.** Demonstration: Das Register liegt im Demonstrationsspeicher des Browsers, und in `docs/architecture/` gibt es dafür keinen Serververtrag. Die Liste der Befehle ist Code, keine Daten. Der Massenimport warnt nicht vor einem Tastenkürzel, das mit einem Befehl außerhalb der Datei kollidiert; nur das Fenster Bearbeiten prüft das.

### Makros (Reiter) {#screen-tab-macros}
Breadcrumb: Startseite > Konfiguration > Makros

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **Makros**
**2. Wartungspunkt:** Meine Makros (Textmakros und der Import von Word-AutoText)

**3. Geschäftszweck und Geltungsbereich.** Ein Makro ist ein formatierter Textblock, der sich erweitert, wenn jemand sein Kürzel (zum Beispiel `;normcolon`) im Befundeditor eingibt und die Leertaste drückt. Makros liegen auf einer von drei Ebenen: Unternehmen (jede Einrichtung), Einrichtung (ein durchführendes Labor) oder Persönlich (eine Person). Jede Person kann persönliche und Einrichtungsmakros führen; Makros der Ebene Unternehmen und persönliche Makros anderer Personen sind Administratoren vorbehalten. Hier wird auch eine AutoText-Bibliothek geladen: **Aus Word importieren** liest die Einträge für AutoText und Bausteine einer Word-Vorlage.

**4. Voraussetzungen und Abhängigkeiten.** Einrichtungsmakros werden unter einem durchführenden Labor aus dem [Einrichtungskonfiguration](#screen-facility-dictionary) abgelegt; wenn Sie es überspringen, ist die Einrichtungsliste leer, und ein Einrichtungsmakro kann nicht gespeichert werden. Die Schriftartenliste des Editors ist im Reiter fest vorgegeben und liest die [Genehmigten Schriftarten](#screen-fonts) nicht.

Setup step: Tier 3, step 5
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-macros - Reiter Makros mit der Liste links und dem Makroeditor rechts]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Ebenenreiter | **Alle** (nur Administratoren), **Unternehmen**, **Einrichtung**, **Persönlich**, jeweils mit einer Anzahl | Optional | **Alle** listet jedes Makro nach Name sortiert, gruppiert nach Unternehmen, dann jeder Einrichtung, dann jeder Person. Ein Administrator öffnet auf **Alle**; andere öffnen auf **Unternehmen**. | Alle (Administratoren) oder Unternehmen |
| Einrichtung auswählen | Auswahlliste der durchführenden Labore | Optional | Auf dem Reiter **Einrichtung** angezeigt; die Liste bleibt leer, bis eine Einrichtung gewählt ist. | Keine |
| Makroliste | Schaltflächen mit Name und Kürzel | Nicht zutreffend | Wählt ein Makro zur Bearbeitung aus. | Nicht zutreffend |
| + Neu | Schaltfläche | Nicht zutreffend | Beginnt ein neues Makro auf der aktuellen Ebene. | Nicht zutreffend |
| Aus Word importieren | Dateischaltfläche, akzeptiert `.dotx`, `.dotm`, `.docx`, `.docm` | Optional | Öffnet das Importfenster unten. | Nicht zutreffend |

#### Makroeditor

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Makroname | Text | Pflicht | Der Name des Makros. | Keiner |
| Auslöser-Shortcut | Text, der mit `;` beginnt | Pflicht | Im Editor eingegeben, dann die Leertaste, um zu erweitern. Ein Kürzel, das nicht mit `;` beginnt, wird abgelehnt („Der Auslöser muss mit ; beginnen“). | Keiner |
| Sichtbarkeit | Auswahl: Unternehmen, Einrichtung, Persönlich | Pflicht | Unternehmen wird nur Administratoren angeboten (Rollen admin, pathologist-admin, superadmin). Eine Person ohne Rechte am Makro sieht es schreibgeschützt („Nur ein Administrator kann dieses Makro ändern.“). | Die erste Ebene, die die Person verwenden darf |
| Einrichtung | Auswahlliste der durchführenden Labore | Pflicht, wenn die Sichtbarkeit Einrichtung ist | Das durchführende Labor, zu dem das Makro gehört. | Keine |
| Inhalt | Rich-Text-Editor | Optional | Der Text, der das Kürzel ersetzt. Angebotene Schriftarten: Arial, Times New Roman, Courier New, Roboto. | Leer |
| Löschen | Schaltfläche | Nicht zutreffend | Fragt „Makro (Name) löschen?“ und deaktiviert das Makro (es verschwindet aus der Liste). Nur angezeigt, wenn Sie es bearbeiten dürfen. | Nicht zutreffend |
| Makro erstellen / Änderungen speichern | Schaltfläche | Nicht zutreffend | Speichert. Deaktiviert, bis sich etwas geändert hat. | Nicht zutreffend |

#### Fenster Aus Word importieren

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Eintragscheckliste | Ein Kontrollkästchen je AutoText- oder Baustein-Eintrag, mit einer Vorschau von 100 Zeichen | Optional | Zeigt, wie viele Einträge gefunden wurden. **AutoText**-Einträge sind markiert; andere Bausteintypen (Deckblätter, Kopfzeilen, Tabellen) werden aufgeführt, aber nicht markiert. Einträge ohne Text werden beim Import übersprungen. | AutoText-Einträge markiert |
| Importieren als | Auswahl: Persönlich, Einrichtung, Unternehmen | Pflicht | Die Ebene, auf der die importierten Makros angelegt werden. | Persönlich |
| Einrichtung | Auswahlliste der durchführenden Labore | Pflicht, wenn Importieren als Einrichtung ist | Fehler „Wählen Sie die Einrichtung, zu der diese importierten Makros gehören.“, wenn leer. | Keine |
| N Makros importieren | Schaltfläche | Nicht zutreffend | Legt je markiertem Eintrag ein Makro mit der Kategorie Benutzerdefiniert an. Das Kürzel wird aus dem Namen des Eintrags erzeugt und eindeutig gemacht. | Nicht zutreffend |

**7. Berechtigungen.** Reiter öffnen: `screen:configuration:open`. Jede Person darf ihre eigenen persönlichen Makros ohne Berechtigung anlegen und ändern. Ein Makro der Ebene Unternehmen oder Einrichtung oder das persönliche Makro einer anderen Person anzulegen oder zu ändern, erfordert `config:macros:manage` (hohes Risiko, protokolliert; im Dienst geprüft). Admin und Laborleitung haben sie standardmäßig.
**Bekannte Grenzen.** Die Schriftartenliste des Editors ist eine feste Liste von vier Schriftarten, nicht das Wörterbuch der Genehmigten Schriftarten. Das Löschen eines Makros deaktiviert es; es gibt keinen Bildschirm, um eines zu reaktivieren. Sprachausgelöste Phrasen sind getrennt und stehen auf dem [Reiter Sprache](#screen-tab-voice).

### Sprache (Reiter) {#screen-tab-voice}
Breadcrumb: Startseite > Konfiguration > Sprache

**Status:** Teilweise

**1. Navigation:** Konfigurationsreiter **Sprache**
**2. Wartungspunkt:** Sprachintegration, Benutzereinstellungen, Sprachverarbeitungsregeln, Fußpedal

**3. Geschäftszweck und Geltungsbereich.** Ein Reiter mit vier Bereichen. Der erste (Sprachintegration) ist ein Bereitstellungsschalter für alle. Die anderen drei sind persönlich oder gelten je Arbeitsplatz: das regionale Akzentprofil, die eigenen Sprachmakros der Person (gesprochene Phrase zu resultierendem Text, „Sprach- & Diktatmakros“ genannt) und die Fußpedalzuordnungen dieses Computers.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Die Sprachbefehle selbst werden im [Aktionsregister](#screen-tab-actions) definiert.

Setup step: Tier 3, step 6
Requires: [Aktionsregister](#screen-tab-actions)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-voice - Reiter Sprache mit Sprachintegration, Akzent, Mikrofonempfindlichkeit, Sprachmakros und Fußpedal]

**6. Feldreferenz.**

#### Sprachintegration (für die gesamte Bereitstellung)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Sprachbefehle & Diktat | Schalter Ein / Aus | Optional | Ausgeschaltet ist die Mikrofonschaltfläche ausgegraut, und Sprache steht niemandem zur Verfügung. Die KI-Verfeinerung des Diktats steht automatisch zur Verfügung, wenn für die Bereitstellung ein KI-Schlüssel konfiguriert ist. Die Umgebungseinstellung `VITE_VOICE_ENABLED=false` entfernt die Sprache vollständig und überschreibt diesen Schalter. | Ein |
| Englische Befehle in anderen Sprachen unscharf erkennen | Schalter Ein / Aus | Optional | Diktiert eine Person auf Französisch, Deutsch, Niederländisch oder Koreanisch und nichts in dieser Sprache passt, kann ein knapper Fehltreffer dennoch als englischer Befehl ausgeführt werden. Schalten Sie dies aus, sobald die eigenen Befehle der Sprache vorhanden sind. Exakte englische Phrasen funktionieren weiterhin. | Ein |
| KI-Verfeinerungsanweisungen nach Sprache | Schreibgeschützte aufklappbare Liste | Nicht zutreffend | Zeigt die genauen Anweisungen, die an die KI gesendet werden, wenn sie diktierten Text verfeinert, je englischer Schreibkonvention und je anderer Sprache. Einträge, die noch nicht von einer Muttersprachlerin oder einem Muttersprachler geprüft wurden, sind mit „Muttersprachler-Prüfung erforderlich“ gekennzeichnet. | Nicht zutreffend |

#### Benutzereinstellungen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Regionales Akzentprofil | Auswahl aus 15 englischen Akzentprofilen sowie Französisch (Frankreich), Deutsch, Niederländisch (Belgien), Niederländisch (Niederlande), Spanisch (Spanien) und Koreanisch | Optional | Legt die Sprache fest, auf die die Spracherkennung hört. Wird je angemeldeter Person gespeichert. Niederländisch (Belgien) zeigt einen Hinweis, dass kein belgischer Sprecher es getestet hat. | Standard-Englisch (USA) |
| Mikrofonempfindlichkeit | Schieberegler, mit 85 % angezeigt | Nicht zutreffend | Nur Anzeige. Der Schieberegler ist mit nichts verbunden; die Verstärkung übernimmt der Browser. | 85 % (Anzeige) |

#### Sprach- & Diktatmakros

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Stimme testen | Schaltfläche | Nicht zutreffend | Hört zu und zeigt „Gehört: (Text)“, damit die Person das Mikrofon prüfen kann. | Nicht zutreffend |
| Massenimport | Schaltfläche für CSV-Datei | Optional | Ein Makro je Zeile in der Form `name, resulting text`. Alles nach einem zweiten Komma wird verworfen. | Nicht zutreffend |
| Makro hinzufügen | Schaltfläche | Nicht zutreffend | Fügt eine leere Zeile im Bearbeitungsmodus hinzu, die der angemeldeten Person gehört. | Nicht zutreffend |
| Makros durchsuchen | Text | Optional | Filtert nach dem gesprochenen Namen oder dem resultierenden Text. | Leer |
| Statusfilter | Auswahl: Alle Status, Nur aktive, Nur inaktive | Optional | Filtert die Liste. | Alle Status |
| Name | Text | In der Praxis Pflicht | Die gesprochene Phrase. | Neues Makro: leer |
| Resultierender Text | Text | Optional | Der Text, der geschrieben wird, wenn die Phrase gehört wird. | Leer |
| Status | Umschalter Aktiv / Inaktiv, nur im Bearbeitungsmodus änderbar | Optional | Ein inaktives Makro wird nicht verwendet. | Aktiv |
| Bearbeiten, Speichern, Löschen (Papierkorbsymbol) | Zeilenschaltflächen | Nicht zutreffend | **Löschen** entfernt die Zeile sofort ohne Bestätigung. | Nicht zutreffend |

#### Fußpedal (dieser Arbeitsplatz)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Pedal 1, Hauptaktion | Zugeordnete Taste oder Pedalschaltfläche | Optional | Push-to-Talk bei der Freigabe, Stückzahl beim Einbetten bestätigen. | Nicht zugeordnet |
| Pedal 2, Weiter / Nächstes | Zugeordnete Taste oder Pedalschaltfläche | Optional | Nächstes Feld bei der Freigabe, Nächstes drucken oder gravieren bei der Mikrotomie. | Nicht zugeordnet |
| Pedal 3, Pause / letztes Segment wiederholen | Zugeordnete Taste oder Pedalschaltfläche | Optional | Nur Diktat bei der Freigabe. Pause funktioniert, sobald zugeordnet; Wiederholen benötigt zusätzlich den Mikrofonzugriff, der in der ersten Freigabesitzung abgefragt werden kann. | Nicht zugeordnet |
| Zuordnen, Neu zuordnen, Abbrechen, Löschen | Schaltflächen | Nicht zutreffend | **Zuordnen** wartet auf den nächsten Druck des echten Pedals und speichert, was es sendet (eine Tastaturtaste oder eine Schaltfläche im Stil eines Gamepads). Die Zuordnung gehört zum Browser dieses Computers, nicht zum Konto der Person. | Nicht zutreffend |

**7. Berechtigungen.** Reiter öffnen: `screen:configuration:open`. Die Schalter der Sprachintegration benötigen `config:voice:manage` (hohes Risiko, protokolliert; geprüft, wenn die Einstellung gespeichert wird, und der Bereich zeigt ohne sie nur die Ansicht). Akzent, Sprachmakros und Fußpedal sind persönlich oder gelten je Arbeitsplatz und benötigen keine Berechtigung. Admin und Laborleitung haben `config:voice:manage` standardmäßig.
**Bekannte Grenzen.** Die beiden Bereitstellungsschalter werden in der gespeicherten Systemkonfiguration des Browsers gespeichert. Ein Serververtrag für die Systemkonfiguration existiert (`docs/architecture/DICTIONARIES_CONFIG_API.md`, `ISystemConfigService`), aber dieser Reiter ruft ihn noch nicht auf; daher bleiben die Schalter bei angeschlossenem API-Server nicht zwischen Sitzungen erhalten. Für Sprachmakros gibt es einen Serververtrag (`docs/architecture/MACROS_API.md`). Die Mikrofonempfindlichkeit ist nur eine Anzeige. Es gibt keinen Bildschirm, um gemeinsam genutzte Sprachmakros (Unternehmen oder Einrichtung) zu veröffentlichen; der Reiter verwaltet die eigenen der angemeldeten Person.

### Zuschnitt-Routenüberschreibungen {#screen-grossing_route_overrides}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Zuschnitt-Routenüberschreibungen

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Zuschnitt-Routenüberschreibungen

**3. Geschäftszweck und Geltungsbereich.** Eine Überschreibung legt fest, dass für eine Einrichtung ein Probentyp stets eine benannte Zuschnittroute verwendet. Nach dem Probeneingang schlägt PathScribe für jede Probe eine Zuschnittvorlage vor. Eine Probe, die zu einer aktiven Überschreibung passt (dieselbe Einrichtung und exakt derselbe Probentyp), erhält die Route der Überschreibung mit 100 Prozent Konfidenz und wird gar nicht an die KI gesendet. Alles, was nicht aufgeführt ist, nutzt die normale Weiterleitung.

**4. Voraussetzungen und Abhängigkeiten.** Die Einrichtung stammt aus der [Einrichtungskonfiguration](#screen-facility-dictionary), und der Probentyp muss exakt dem Typfeld eines Eintrags im [Präparatwörterbuch](#screen-specimens) entsprechen (beim Tippen werden die bekannten Typen angeboten). Wenn Sie die Einrichtungen überspringen, ist die Liste Einrichtung leer.

Setup step: Tier 3, step 7
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary), [Präparatwörterbuch](#screen-specimens)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-grossing_route_overrides - Liste der Zuschnitt-Routenüberschreibungen und Überschreibung hinzufügen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Einrichtung (Liste) | Name der Einrichtung | Nicht zutreffend | Die Einrichtung, für die die Überschreibung gilt. | Nicht zutreffend |
| Probentyp (Liste) | Text | Nicht zutreffend | Der Probentyp, für den die Überschreibung gilt. | Nicht zutreffend |
| Überschreibungsroute (Liste) | Routenname | Nicht zutreffend | Die Route, die die Probe erhält. | Nicht zutreffend |
| Status (Liste) | Aktiv / Inaktiv | Nicht zutreffend | Nur aktive Überschreibungen werden angewendet. | Nicht zutreffend |
| Bearbeiten, Entfernen | Zeilenschaltflächen | Nicht zutreffend | **Entfernen** löscht die Überschreibung sofort ohne Bestätigung. Setzen Sie die Überschreibung auf Inaktiv, um sie zu behalten. | Nicht zutreffend |

#### Fenster Zuschnitt-Routenüberschreibung hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Einrichtung | Auswahlliste der Einrichtungen (aus der [Einrichtungskonfiguration](#screen-facility-dictionary)) | Pflicht | Wird beim Probeneingang mit der Einrichtung des Falls abgeglichen. | Die erste Einrichtung der Liste |
| Probentyp | Text mit Vorschlägen aus den Typwerten des Präparatwörterbuchs | Pflicht | Muss exakt dem Typ im Präparatwörterbuch entsprechen (der Abgleich ist exakt). Fehler „Erforderlich“, wenn leer. Ein Wert, der zu keinem Typ des Wörterbuchs passt, wird akzeptiert und trifft schlicht nie zu. | Keiner |
| Überschreibungsroute | Auswahl: Standard-Gewebezuschnitt (Route A), Flüssigkeits-/Zellblock-Zuschnitt (Route B), Nur Histologie / Direkte Triage (Route C) | Pflicht | Die Route, die die Probe erhält. | Standard-Gewebezuschnitt (Route A) |
| Status | Schalter Aktiv / Inaktiv | Optional | Eine inaktive Überschreibung wird ignoriert. | Aktiv |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, entfernen: `config:grossing-routes:manage` (hohes Risiko, protokolliert; im Dienst geprüft). Admin und Laborleitung haben sie standardmäßig.
**Bekannte Grenzen.** Die Demonstrationsdaten enthalten eine Überschreibung (Niere auf Route C in der Einrichtung `c-westside`). Die Überschreibung wird nur durch den Vorschlag der Zuschnittvorlage angewendet, der nach dem Probeneingang läuft. Eine auf Abteilungsebene gewählte Route ([Abteilungen](#screen-departments)) wird durch eine Überschreibung nicht geändert.

### Tuschierungs-Validierungsmodus {#screen-inking_validation_mode}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Tuschierungs-Validierungsmodus

**Status:** Teilweise

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Tuschierungs-Validierungsmodus

**3. Geschäftszweck und Geltungsbereich.** Die strukturierte Tuschierungsprüfung betrachtet jeden Rand eines Falls, wenn jemand **Zuschnitt abschließen** wählt, und noch einmal bei der Freigabe. Sie findet drei Arten von Problemen: einen Rand, der nicht als untersucht markiert ist (Schweregrad 2), einen Rand ohne erfasste Tusche (Schweregrad 2) und einen Tuschefarbcode, der nicht im aktiven Tuschefarbenwörterbuch steht (Schweregrad 3). Dieser Bildschirm wählt für eine Einrichtung zwischen **Nur warnen** und **Strikt erzwingen**.

**Was der Code heute tut (im Quelltext geprüft).** Der Bildschirmtext sagt, Strikt erzwingen blockiere **Zuschnitt abschließen** bei einem Problem des Schweregrads 2 vollständig. Das Gate, das Zuschnitt abschließen aufhält, tut das in keinem der beiden Modi:
- Schweregrad 3 (nicht zugeordnete Tuschefarbe) blockiert Zuschnitt abschließen immer. Bei der Freigabe blockiert er, oder er verlangt eine Überschreibung durch eine Person mit `case:inking-gate:override`.
- Schweregrad 2 zeigt bei Zuschnitt abschließen eine Bestätigung **Mit Hinweisvermerk fortfahren** und lässt den Zuschnitt dann abschließen, in beiden Modi.
- Der einzige heute sichtbare Unterschied ist der Hinweis auf dem Bildschirm Zuschnitt: „Strikt erzwingen: Unten angezeigte Probleme blockieren die Freigabe, bis sie behoben sind“ gegenüber „Warnen & Hinweis: Unten angezeigte Probleme blockieren die Freigabe nicht“.
- Wenn das Tuschefarbenwörterbuch nicht geladen werden kann, verweigert das Gate das Fortfahren (Palette nicht verfügbar).
Der Unterschied zwischen dem Bildschirmtext und dem Gate ist für Pete in `open-questions/ch4.md` aufgeführt.

**4. Voraussetzungen und Abhängigkeiten.** Die Prüfung vergleicht erfasste Tuschefarben mit den aktiven Tuschefarben. Wenn Sie [Tuschefarben](#screen-ink_colors) überspringen, ist jede erfasste Tuschefarbe nicht zugeordnet (Schweregrad 3), was Zuschnitt abschließen blockiert. Die Einrichtungen stammen aus der [Einrichtungskonfiguration](#screen-facility-dictionary).

Setup step: Tier 3, step 8
Requires: [Tuschefarben](#screen-ink_colors), [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-inking_validation_mode - Tuschierungs-Validierungsmodus mit der Auswahlliste der Einrichtungen und zwei Optionen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Einrichtung | Auswahlliste der Einrichtungen | Pflicht | Der Modus wird je Einrichtung gespeichert. Die Wahl einer anderen Einrichtung lädt deren gespeicherten Modus. | Die erste Einrichtung der Liste |
| Tuschierungs-Validierungsmodus | Auswahl (Optionsfelder): Nur warnen, Strikt erzwingen | Pflicht | Nur warnen: Probleme des Schweregrads 2 werden markiert, blockieren aber nie (der Standard). Strikt erzwingen: auf dem Bildschirm als Blockade von Zuschnitt abschließen bei Schweregrad 2 beschrieben; siehe „Was der Code heute tut“ oben. Schweregrad 3 blockiert immer. | Nur warnen |
| Speichern | Schaltfläche | Nicht zutreffend | Erst nach einer Änderung aktiviert. Zeigt „Gespeichert.“ oder „Sie haben keine Berechtigung, dies zu ändern.“ Eine Änderung wird als „Inking validation mode changed“ mit dem alten und dem neuen Modus in das Prüfprotokoll geschrieben. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Den Modus ändern: `config:inking-validation-mode:manage` (hohes Risiko, protokolliert; im Dienst für diese Einrichtung geprüft). Admin und Laborleitung haben sie standardmäßig. Einen Stopp des Schweregrads 3 bei der Freigabe überschreiben: `case:inking-gate:override`, von Admin und Laborleitung gehalten.
**Bekannte Grenzen.** Teilweise aus dem oben genannten Grund: Der Modus wird gespeichert und angezeigt, aber Strikt erzwingen fügt bei Zuschnitt abschließen keinen harten Stopp hinzu. Die Einstellung liegt im Speicher für Standorteinstellungen des Browsers; für Standorteinstellungen gibt es in `docs/architecture/` noch keinen Serververtrag.

## Histologie-Arbeitslisten, Einbettung, Mikrotomie und Färbestationen {#ch4-histology}
Breadcrumb: Startseite > Chargenverwaltung

Dieser Teil behandelt die Arbeitsplatzbildschirme des Histologie-Workflows. Es sind Bildschirme für die tägliche Arbeit am Arbeitsplatz, keine Wartungsbildschirme; daher verwendet jeder das Referenzlayout: was er zeigt, was dafür zuerst konfiguriert sein muss und welche Einstellungen sein Verhalten ändern. Für die Stationen selbst gibt es keinen eigenen Konfigurationsbildschirm. Das Verhalten einer Station wird auf Bildschirmen in anderen Kapiteln festgelegt: den Bildschirmen [Scanstationen](#screen-scan_stations) und [Druckerprofile](#screen-printer_profiles) (welchen Drucker eine Station verwendet), dem [Etikettendesigner](#screen-label_designer) (was das gedruckte Etikett zeigt), den [Pflichtfeldern](#screen-field_requirements) (welche Felder ausgefüllt sein müssen, je Seite: `batchManagement`, `embedding`, `microtomy`, `slideDistribution`) und dem [Reiter Sprache](#screen-tab-voice) (Fußpedal). Eine Färbestation hat keinen eigenen Bildschirm: Färbeläufe sind Chargen (siehe Chargenverwaltung), und die Färbungsliste ist der [Diagnosekatalog](#screen-stains).

### Chargenverwaltung {#screen-batch-management}
Breadcrumb: Startseite > Chargenverwaltung

**Status:** Umgesetzt

**1. Navigation:** Startseite > **Chargenverwaltung** (nicht in der Konfiguration). Öffnet sich mit `screen:batch-management:open`.
**2. Wartungspunkt:** Nicht zutreffend. Dies ist ein Arbeitsplatz-Hub.

**3. Geschäftszweck und Geltungsbereich.** Die Chargenverwaltung verfolgt Gruppen von Kassetten und Objektträgern anhand des Behälterbarcodes durch die Verarbeitungsknoten (Entkalkung / Sonderbehandlung, Verarbeitung, Einbettung, Mikrotomie / Schneiden, Färbung, Endkontrolle, Externe Weiterleitung, Zytologie-Verarbeitung, Zytologie-Färbung, Zytologie-Bildgebung). Sie bietet das Scannen zur Nachverfolgung der Probenkette, den Abgleich und eine Reihe von Warteschlangen- und Berichtsseiten, die über Kacheln erreicht werden. Eine Charge ist ein Behälter (ein Färbegestell, ein Korb des Gewebeprozessors, ein Archivierungstablett, ein Entkalkungsgefäß oder eine Ad-hoc-Charge) mit einem Hauptbarcode und einem Verzeichnis der eingescannten Einträge.

**4. Voraussetzungen und Abhängigkeiten.** Der Bildschirm liest die für diesen Computer eingestellte Scanstation (um den Zielarbeitsplatz vorauszufüllen und die Entsorgungswarteschlange und die ausstehende Beladung auf die Einrichtung der Station einzugrenzen), die Reagenzchargen und Färbungen für Färbe- und Zytologie-Chargen sowie die Einrichtungen mit der Rolle Referenzlabor für Weiterleitungschargen. Ohne diese öffnet sich die Seite trotzdem, aber die zugehörigen Felder von **Neuer Behälter** bleiben leer.

Setup step: Reference, not part of setup
Requires: [Scanstationen](#screen-scan_stations), [Einrichtungskonfiguration](#screen-facility-dictionary), [Reagenz- & Lösungschargen](#screen-reagent_lots), [Diagnosekatalog](#screen-stains), [Pflichtfelder](#screen-field_requirements)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-batch-management - Chargenverwaltung mit Knotenkacheln, Werkzeugkacheln und der Liste der aktiven Chargen]

**6. Feldreferenz.** Dies ist eine Referenzseite: Die Tabellen listen Bedienelemente, Spalten und Filter auf.

#### Hub-Seite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Knotenkacheln (eine je Verarbeitungsknoten) | Kachel mit der Anzahl offener Chargen | Optional | Wählen Sie eine Kachel, um nur Chargen an diesem Knoten anzuzeigen; wählen Sie sie erneut, um zurückzusetzen. | Kein Filter |
| Haupt-Chargenbarcode scannen oder eingeben | Text- oder Scannereingabe | Optional | Ein Chargenbarcode öffnet diese Charge. Ein gescannter Code `CONT-` oder `RACK-`, der zu einem verfügbaren wiederverwendbaren Gestell passt, öffnet **Neuer Behälter** mit diesem Gestell ausgefüllt. Ein bereits ausgegebenes Gestell oder ein unbekannter Code zeigt einen Fehler und einen Ton. | Leer |
| Neuer Behälter | Schaltfläche | Nicht zutreffend | Öffnet das Fenster unten. | Nicht zutreffend |
| Aktiv & im Abgleich | Liste mit Anzahl | Nicht zutreffend | Offene Chargen, mit Anzahl der Einträge und STAT-Markierung. | Nicht zutreffend |
| Abgeschlossen & abgebrochen | Liste mit Anzahl | Nicht zutreffend | Geschlossene Chargen. | Nicht zutreffend |
| Werkzeugkacheln | Entsorgung, Entsorgungsbericht, Aufbewahrungssperren, Ausstehend, Etiketten nachdrucken, Objektträger-Scannen, Gravurmonitor, Gerätelogbuch | Nicht zutreffend | Jede öffnet eine der unten beschriebenen Seiten. | Nicht zutreffend |

#### Fenster Neuer Behälter

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Behältertyp | Auswahl: Färbegestell, Gewebeprozessor-Korb, Archivierungstablett, Entkalkungsgefäß, Ad-hoc-Charge | Pflicht | Die Art des Trägers. Eine Liste wiederverwendbarer Gestelle wird auf Gestelle dieses Typs gefiltert, die Verfügbar sind. | Färbegestell |
| Ziel-Arbeitsstation | Auswahlliste der Scanstationen oder „Keine Station“ | Optional | Die Wahl einer Station legt den Verarbeitungsknoten anhand der eigenen Stufe der Station fest. Ist die Station normalerweise ein anderer Knoten, bittet eine Warnung um Prüfung. | Die für diesen Computer eingestellte Station |
| Verarbeitungsknoten | Auswahl aus den zehn Knoten | Pflicht | Entscheidet, welche der zusätzlichen Felder unten erscheinen. | Entkalkung / Sonderbehandlung oder von der Station übernommen |
| Protokoll / Laufparameter | Text | Pflicht (gesperrt) | Zum Beispiel „Standard-H&E-Nachtlauf“. Kann unter Pflichtfelder nicht ausgeschaltet werden. | Keiner |
| Priorität | Auswahl: Routine, STAT | Pflicht | Markiert die Charge. | Routine |
| Lösungstyp | Auswahl: EDTA, 10 % NBF (Fixierfenster), Schnellentkalkung (Ameisensäure/HCl) | Pflicht an einem Entkalkungsknoten | Die Entkalkungslösung. | Erste Option |
| Zieldauer / Alarm-Timer | Stunden und Minuten | Pflicht an einem Entkalkungsknoten (gesperrt) | Stellt den Timer ein. Eine Warnmeldung erscheint 15 Minuten vor dem Ziel. | 4 Std. 0 Min. |
| Ziel-Referenzlabor | Auswahlliste der Einrichtungen mit der Rolle Referenzlabor | Pflicht an einem Knoten Externe Weiterleitung (gesperrt) | Wohin die Charge geht. Existiert keines, weist das Fenster darauf hin, zuerst eines in den Einrichtungseinstellungen anzulegen. | Keines |
| Angeforderter Test / Panel (optional) | Text | Optional (kann zur Pflicht gemacht werden) | Der beim Referenzlabor angeforderte Test. | Leer |
| Färbeprotokoll | Auswahlliste der Färbungen (aus dem [Diagnosekatalog](#screen-stains)) | Pflicht an einem Knoten Zytologie-Färbung (gesperrt) | Die Färbung, für die die Charge bestimmt ist. | Keines |
| Verwendete Reagenz- / Lösungschargen | Checkliste der aktiven Chargen (aus [Reagenz- & Lösungschargen](#screen-reagent_lots)) | Optional (kann zur Pflicht gemacht werden) an einem Färbeknoten | Erfasst die Chargen für den Lauf. Kann später eingescannt werden. | Keine |
| Behälter-Identifikationsmodus | Auswahl: Einweg-Etikett, Wiederverwendbares Gestell | Pflicht | Einweg: Das System erzeugt ein einmalig verwendbares Etikett mit Zeitstempel. Wiederverwendbar: Ein vorhandenes graviertes Gestell wird verwendet, und es wird kein Etikett gedruckt. | Einweg-Etikett |
| Gestell-ID | Scan oder Text | Pflicht für Wiederverwendbares Gestell (gesperrt) | Das auszugebende Gestell. | Leer |
| Erstellen & drucken / Sitzung starten | Schaltfläche | Nicht zutreffend | Legt die Charge an. Zeigt „Noch erforderlich: (Felder)“, bis die Pflichtfelder ausgefüllt sind. Bei einem Einweg-Etikett zeigt der nächste Schritt den Haupt-Chargenbarcode mit **Drucken**; bei einem Gestell steht dort, dass das Gestell nun ausgegeben ist und nichts gedruckt wird. **Weiter, Einträge scannen** öffnet die Charge. | Nicht zutreffend |

#### Seite Chargendetails

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Barcode einer Kassette oder eines Objektträgers scannen | Scannereingabe (kein Klick nötig) | Optional | Fügt den Eintrag dem Verzeichnis hinzu. Wird mit einer Meldung abgelehnt, wenn der Code zu keiner Kassette und keinem Objektträger passt, bereits in dieser Charge ist oder in einer anderen aktiven Charge liegt. | Nicht zutreffend |
| Verzeichnis | Liste mit Anzahl | Nicht zutreffend | Einträge der Charge, jeweils mit **Verschieben** (in eine andere aktive Charge) und **Entfernen**. | Nicht zutreffend |
| Abgleich starten | Schaltfläche | Nicht zutreffend | Startet die Verifizierung außerhalb des Prozesses: Scannen Sie jeden physischen Eintrag, sobald er den Träger verlässt. Einträge zeigen Übereinstimmend, Fehlend oder Unerwartet. | Nicht zutreffend |
| Charge abschließen | Schaltfläche | Nicht zutreffend | Deaktiviert, solange Einträge fehlen oder unerwartet sind (der Tooltip nennt die Anzahlen), und abgelehnt, solange eine Abweichung der Kühlkette nicht bestätigt ist. | Nicht zutreffend |
| Vorgesetzten-Override (Überschreiben & abschließen) | Link und Fenster mit einer verpflichtenden **Begründung** | Begründung erforderlich | Schließt mit Abweichungen ab. Wird auf den Namen der Person verbucht. Erfordert `batch:reconciliation:override`. | Nicht zutreffend |
| Charge abbrechen | Schaltfläche und Fenster mit einer verpflichtenden **Begründung** | Begründung erforderlich | Die Charge und das Verzeichnis bleiben für die Prüfung erhalten, werden als Abgebrochen markiert und nehmen keine Scans mehr an. Erfordert `batch:run:abort`. | Nicht zutreffend |
| Bestätigen (Abweichung der Kühlkette) | Schaltfläche und Fenster mit einer verpflichtenden **Notiz** | Notiz erforderlich | Wird angezeigt, wenn ein intelligenter Behälter eine Temperatur außerhalb des Bereichs gemeldet hat. Erfordert `batch:cold-chain-excursion:acknowledge`. | Nicht zutreffend |
| Zur Verarbeitung übertragen | Schaltfläche | Nicht zutreffend | Verschiebt die Einträge in eine neue Charge der Verarbeitung. | Nicht zutreffend |
| Gestell freigeben | Schaltfläche | Nicht zutreffend | Setzt ein wiederverwendbares Gestell auf Verfügbar zurück. | Nicht zutreffend |
| Weiterleitungsstatus | Text | Nicht zutreffend | Für eine Weiterleitungscharge: versandt, unterwegs, zugestellt, Ergebnis eingegangen (mit einem Link, wenn das Ergebnis ein PDF ist). | Nicht zutreffend |
| Geräteberichte; Bereich Kühlkette | Text | Nicht zutreffend | Gerätestatus der Zytologie; Temperaturmesswerte für eine Charge in einem intelligenten Behälter. | Nicht zutreffend |

#### Entsorgungswarteschlange

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Barcode einer Kassette oder eines Objektträgers scannen | Scannereingabe | Optional | Entsorgt den Eintrag sofort und blendet eine Bestätigung ein. Erfordert `retention:material:dispose`. | Nicht zutreffend |
| Zur Entsorgung berechtigt | Liste mit Anzahl | Nicht zutreffend | Blöcke und Objektträger, deren Aufbewahrungsfrist abgelaufen ist, ohne aktive Sperre und noch nicht entsorgt, jedes Mal frisch aus den Falldaten berechnet. Auf die Einrichtung der Station eingegrenzt; ohne eingestellte Scanstation werden alle Standorte angezeigt. | Nicht zutreffend |

#### Entsorgungsbericht

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Nach Einrichtung filtern | Auswahlliste | Optional | Begrenzt den Bericht. | Alle Einrichtungen |
| Nach Materialtyp filtern | Auswahlliste | Optional | Begrenzt den Bericht. | Alle Materialtypen |
| Von Datum, Bis Datum | Daten | Optional | Begrenzt nach dem Entsorgungsdatum. | Leer |
| Gesamt entsorgt | Zahl | Nicht zutreffend | Anzahl der angezeigten Zeilen. | Nicht zutreffend |
| Spalten | Entsorgt, Typ, Eintrags-ID, Fall, Probe, Entsorgt von, Standort | Nicht zutreffend | Eine Zeile je entsorgtem Eintrag. | Nicht zutreffend |
| Exportieren | Schaltfläche | Nicht zutreffend | Lädt eine CSV-Datei mit denselben Spalten herunter. Erfordert `retention:disposal-report:export`. | Nicht zutreffend |

#### Aufbewahrungssperren

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Fall, Grund oder Person suchen | Text | Optional | Filtert die Liste. | Leer |
| Spalten | Fall, Grund, Notiz, Gesetzt von, Gesetzt am, Aktionen | Nicht zutreffend | Eine Zeile je aktiver Sperre („N aktive Sperren“). | Nicht zutreffend |
| Aufheben | Schaltfläche und Fenster mit einer **Notiz zur Aufhebung** | Notiz erforderlich | Hebt die Sperre auf. Erfordert `case:retention-hold:release`. | Nicht zutreffend |
| Als CSV exportieren | Schaltfläche | Nicht zutreffend | Erfordert `retention:holds-queue:export`. | Nicht zutreffend |

#### Ausstehend (Beladung)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Scannen oder tippen zum Suchen | Text oder Scanner | Optional | Filtert nach der ID von Kassette oder Objektträger, nach Fall oder Probe. **Zurücksetzen** setzt zurück. | Leer |
| Aktualisieren | Schaltfläche | Nicht zutreffend | Berechnet die Warteschlange neu. | Nicht zutreffend |
| Wartet auf Chargenbeladung | Nach Fall gruppierte Liste | Nicht zutreffend | Kassetten und Objektträger, die gedruckt oder graviert, aber in keine aktive Charge eingescannt wurden, frisch aus den Falldaten abgeleitet. Auf die Einrichtung der Station eingegrenzt; ohne eingestellte Station werden alle Einrichtungen angezeigt. | Nicht zutreffend |

#### Etiketten nachdrucken

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Eingegangen ab, Eingegangen bis | Daten | Optional | Findet Fälle nach dem Eingangsdatum. | Leer |
| Eingangsnummer von, Eingangsnummer bis | Text | Optional | Findet Fälle nach dem Bereich der Eingangsnummer. Mindestens eines der vier Felder ist nötig; ein leerer Filter findet nichts. | Leer |
| Fälle suchen | Schaltfläche | Nicht zutreffend | Listet die gefundenen Fälle auf, die ältesten zuerst, jeweils mit einem Kontrollkästchen **Nachdrucken** und ihren Proben. | Nicht zutreffend |
| Etiketten | Kontrollkästchen: Kassetten, Probenbehälter, Anforderung | Optional | Welche Etikettenarten gedruckt werden. | Keines markiert |
| Kassettendrucker | Auswahlliste der Drucker | Pflicht, wenn Kassetten gewählt sind | Fehler „Wählen Sie zuerst den Kassettendrucker.“ | Keiner |
| Etiketten nachdrucken | Schaltfläche | Nicht zutreffend | Druckt jeweils ein Etikett (im Abstand von etwa 0,25 Sekunden) und zeigt den Fortschritt. Jedes Etikett wird protokolliert. Erfordert `label:batch:reprint` (standardmäßig bei Histologie-Fachkraft und Admin). Danach zeigt eine Zusammenfassung Gedruckt, fehlgeschlagen und durch die Schutzvorkehrung für den Druck auf Anforderung blockiert, sowie **N fehlgeschlagene Etiketten wiederholen**. | Nicht zutreffend |

#### Objektträger-Scannen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Scan-Warteschlange | Tabelle: Wählen, Fall, Objektträger, Priorität, Weitergeleitet an, Gestell / Position | Nicht zutreffend | Objektträger, die an der Objektträger-Verteilstation an Digital weitergeleitet wurden. | Nicht zutreffend |
| Objektträgerscanner | Auswahlliste der Geräte der Art „Objektträgerscanner“ (aus [Geräte](#screen-equipment)) | Pflicht | Existiert keiner, weist die Seite darauf hin, sie unter Konfiguration, Geräte anzulegen. | Keiner |
| N Objektträger laden | Schaltfläche | Nicht zutreffend | Legt am Scanner eine Scan-Charge an. Erfordert `wsi:scan-batch:load`. | Nicht zutreffend |
| Scan-Chargen | Tabelle: Charge, Scanner, Status, Fortschritt, Geladen, Aktionen | Nicht zutreffend | Der Fortschritt zeigt gescannt, fehlgeschlagen und wartend. Eine Charge, die nicht gesendet wurde, zeigt „Nicht gesendet (Code, Zeit)“ mit einer Wiederholung. Fehlschläge der Bild-QK zeigen den Grund. | Nicht zutreffend |
| Senden, Entladen | Schaltflächen | Nicht zutreffend | **Senden** (`wsi:scan-batch:send`) sendet das Scanverzeichnis an die Schnittstellen-Engine. **Entladen** (`wsi:scan-batch:unload`) schließt die Charge, sobald jeder Objektträger ein Ergebnis hat; Objektträger, die nicht gescannt wurden, kehren in die Warteschlange zurück. | Nicht zutreffend |

#### Gravurmonitor

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Nach Organisation filtern | Auswahlliste | Optional | Begrenzt die Geräte. | Alle Organisationen |
| Geräte | Karten mit Status, Warnungen, Verbrauchsmaterialwarnungen je Kassettenfarbe und „Gemeldet (Zeit)“ | Nicht zutreffend | Eine schreibgeschützte Zusammenfassung, etwa alle 30 Sekunden aktualisiert. Ein Etikett **Simuliert** erscheint, wenn keine Live-Quelle konfiguriert ist. | Nicht zutreffend |
| Engine-Diagnose starten | Link | Nicht zutreffend | Öffnet die eigene Diagnoseseite der Kassetten-Engine, wenn das Gerät einen Link meldet. | Nicht zutreffend |

#### Gerätelogbuch

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Gerätetabelle | Jedes aktive Gerät mit seinem Wartungs- und Kalibrierstatus | Nicht zutreffend | Zeilen mit einer Wartungswarnung sind hervorgehoben. Das Hinzufügen oder Ändern von Geräten erfolgt unter [Geräte](#screen-equipment). | Nicht zutreffend |
| Eintrag erfassen | Schaltfläche je Gerät | Nicht zutreffend | Erfasst Wartung oder Kalibrierung. Erfordert `equipment:maintenance:record` (Histologie-Fachkraft, Zytologieassistent, Molekulartechnologe, Admin und Laborleitung haben sie). | Nicht zutreffend |

**Wiederverwendbare Gestelle (Batch 761).** Ein Scan eines registrierten Gestells (RACK-…) findet dessen offenen Lauf, nie einen früheren abgeschlossenen. Ist der letzte Lauf geschlossen, startet der Scan einen neuen Lauf (Neuer Behälter mit dem Gestell vorausgefüllt). Wurde der letzte Lauf versiegelt oder auf den Färbeautomaten gebracht und nie geschlossen, öffnet sich das Gestell mit der Warnung „Der letzte Lauf auf … wurde nie geschlossen.“ Schließen Sie ihn (abschließen oder Supervisor-Übersteuerung), bevor das Gestell wieder verwendet wird.

**7. Berechtigungen.** Bildschirm öffnen: `screen:batch-management:open` (Histologie-Fachkraft, Zytologieassistent, Molekulartechnologe und Admin). Histologie-Fachkraft, Zytologieassistent und Molekulartechnologe starten außerdem mit `batch:reconciliation:override`, `batch:run:abort`, `batch:cold-chain-excursion:acknowledge` (alle hohes Risiko, protokolliert), `retention:material:dispose`, `retention:disposal-report:export`, `retention:holds-queue:export` und den drei Berechtigungen `wsi:scan-batch:*`. Admin öffnet den Bildschirm, hat aber keine davon; Admin hat `label:batch:reprint` und `equipment:maintenance:record`. `case:retention-hold:release` haben alle Fallrollen (Pathologe, Fellow, Assistenzarzt, PA, Probeneingang und die drei Technologenrollen).
**Bekannte Grenzen.** Der Gravurmonitor liest eine Firebase-Sammlung (`engraver_devices`), wenn Firebase konfiguriert ist, und zeigt andernfalls simulierte Geräte; Firebase ist nicht die Produktionsdatenbank, und dies wird ersetzt. Die `README.md` in `src/pages/BatchManagement/` sagt noch, die Warteschlange der Aufbewahrungssperren sei nicht umgesetzt; die Seite und die Kachel existieren. Chargen sind Umgesetzt (`IBatchService` in `docs/architecture/CASE_WORKFLOWS_API.md`).

### Einbettungsstation {#screen-embedding-station}
Breadcrumb: Startseite > Einbettungsstation

**Status:** Umgesetzt

**1. Navigation:** Startseite > **Einbettungsstation**. Öffnet sich mit `screen:embedding:open` (Histologie-Fachkraft und PA).
**2. Wartungspunkt:** Nicht zutreffend. Dies ist ein Arbeitsplatzbildschirm.

**3. Geschäftszweck und Geltungsbereich.** Der Bildschirm für den Einbettungsarbeitsplatz. Eine Fachkraft scannt eine Kassette, überprüft die Stückzahl anhand des Zuschnitts, erfasst die Gießform und die Orientierung, meldet jede Abweichung, gruppiert Blöcke, die zu einer Probe gehören, und druckt das Kassettenetikett bei Bedarf erneut.

**4. Voraussetzungen und Abhängigkeiten.** Der Druck von Kassettenetiketten erfordert eine für diesen Computer eingestellte Scanstation, bei der das Drucken eingeschaltet ist, sowie ein Druckerprofil für Kassetten; ohne sie meldet der Druckerbereich „Diese Station ist nicht für den echten Kassettenetikettendruck konfiguriert.“ Die Etikettenvorschau verwendet das Etikettenlayout des [Etikettendesigners](#screen-label_designer). Welche Eingaben verpflichtend sind, ergibt sich aus den [Pflichtfeldern](#screen-field_requirements) (Seite `embedding`).

Setup step: Reference, not part of setup
Requires: [Scanstationen](#screen-scan_stations), [Druckerprofile](#screen-printer_profiles), [Etikettendesigner](#screen-label_designer), [Pflichtfelder](#screen-field_requirements)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-embedding-station - Einbettungsstation mit Blockübersicht, Stückzahl und Kassettendruckbereich]

**6. Feldreferenz.** Referenzseite: die Bedienelemente auf dem Bildschirm.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Barcode einer Kassette scannen | Scanner oder Text | Zum Beginnen erforderlich | Lädt den Block. Scans, die mit `STATION:` beginnen, werden ignoriert. | Leer |
| Kontextleiste | Eingangsnummer, Patient, Geburtsdatum, Probe/Block, Typ | Nicht zutreffend | Patientenfelder sind zur Schwärzung in Screenshots als Patientendaten gekennzeichnet. **Nächste Kassette scannen** leert den Bildschirm. | Nicht zutreffend |
| Blöcke der Probe | Liste | Nicht zutreffend | Die Blöcke der Probe und ihr Status, der aktuelle ist markiert. | Nicht zutreffend |
| Beobachtete Anzahl; Bestätigen | Ganzzahl | Pflicht, sofern unter Pflichtfelder nicht als optional festgelegt | Prüfung der Stückzahl gegen die erwartete Anzahl aus dem Zuschnitt. | Leer |
| Größe der Gießform | Auswahl: 7x7mm, 15x15mm, 24x24mm, 24x30mm, Mega Mold | Optional (kann zur Pflicht gemacht werden) | Wird am Block erfasst. | Keine |
| Orientierungsanweisungen | Freitext, mit Schnellvorgaben „Hochkant einbetten“, „Epitheloberfläche nach unten“, „Querschnitt nach oben“ | Optional (kann zur Pflicht gemacht werden) | Wird am Block erfasst. | Leer |
| Diskrepanzmeldung | Ein-Tipp-Schaltflächen: Fehlendes Gewebe/Leere Kassette, Zusätzliches Gewebe gefunden, Ungeöffnete Kassette/Unverarbeitetes Gewebe, Beschädigte Kassette/Gebrochenes Scharnier | Optional | Markiert den Block; zeigt „Zuletzt markiert: (Grund) (von Name)“. | Keine |
| Warnmarkierungen | Winziges Gewebe, Zerbrechlich, Entkalkung erforderlich | Optional | Markiert den Block. | Aus |
| Mehrfachkassette / Geteilter Block | Auswahl weiterer nicht gruppierter Blöcke derselben Probe | Optional | **Als geteilte Kassetten gruppieren** verknüpft sie. | Keine |
| Blockkommentare | Schublade mit Text für **Kommentar** und **Kommentar hinzufügen** | Optional (Text kann zur Pflicht gemacht werden) | Kommentare zum Block. | Leer |
| Kassetten-Nachdruck | Schaltfläche, dann ein Fenster mit einer Auswahlliste **Grund** | Grund erforderlich | Gründe: Wachsablagerung, Verblasster Barcode, Mechanischer Stau, Sonstiges. Die Anzahl und der letzte Grund werden angezeigt. | Nicht zutreffend |
| Gerätestatus, Etikettenvorschau | Anzeige | Nicht zutreffend | Der Status des Druckers und eine Vorschau des Kassettenetiketts. | Nicht zutreffend |
| Fußpedal | Hardware | Optional | Pedal 1 bestätigt die Stückzahl (siehe [Reiter Sprache](#screen-tab-voice)). | Nicht zugeordnet |

**7. Berechtigungen.** Bildschirm öffnen: `screen:embedding:open`. Geschützte Schritte (Nachdruck, Kommentare) werden mit der Person erfasst; es gilt keine eigene Konfigurationsberechtigung.
**Bekannte Grenzen.** Die Listen der Nachdruckgründe, der Formgrößen und der Abweichungen sind im Produkt fest vorgegeben und nicht bearbeitbar.

### Mikrotomie-Arbeitsplatz {#screen-microtomy-workstation}
Breadcrumb: Startseite > Mikrotomie-Arbeitsplatz

**Status:** Umgesetzt

**1. Navigation:** Startseite > **Mikrotomie-Arbeitsplatz**. Öffnet sich mit `screen:microtomy:open` (Histologie-Fachkraft).
**2. Wartungspunkt:** Nicht zutreffend. Dies ist ein Arbeitsplatzbildschirm.

**3. Geschäftszweck und Geltungsbereich.** Der Bildschirm für den Schneidearbeitsplatz. Eine Fachkraft scannt einen Block (oder für die Zytologie einen Dekantier- oder Flüssigkeitsbehälter), fügt die zu schneidenden Objektträger nach Färbung und Ebene hinzu, druckt oder graviert Objektträgeretiketten einzeln oder als Charge, druckt mit einem Grund erneut, markiert einen Block als aufgebraucht und beobachtet die Abrechnung für den Block.

**4. Voraussetzungen und Abhängigkeiten.** Die Auswahlliste der Färbungen ist der [Diagnosekatalog](#screen-stains). Der Druck von Objektträgeretiketten erfordert eine Scanstation mit Objektträgerdruck und ein Druckerprofil. Verpflichtende Eingaben ergeben sich aus den [Pflichtfeldern](#screen-field_requirements) (Seite `microtomy`).

Setup step: Reference, not part of setup
Requires: [Scanstationen](#screen-scan_stations), [Druckerprofile](#screen-printer_profiles), [Diagnosekatalog](#screen-stains), [Pflichtfelder](#screen-field_requirements)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-microtomy-workstation - Mikrotomie-Arbeitsplatz mit Objektträger-Raster und Druckbereich]

**6. Feldreferenz.** Referenzseite: die Bedienelemente auf dem Bildschirm.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Barcode eines Blocks oder Dekantier-/Flüssigkeitsbehälters scannen | Scanner oder Text | Zum Beginnen erforderlich | Lädt den Block. | Leer |
| Blockübersicht | Anzeige | Nicht zutreffend | Status, Stückzahl, Gewebe, Blockkommentare, bisherige Objektträgerhistorie und für einen Matrixblock die darin enthaltenen Stanzen mit Position und Probe. | Nicht zutreffend |
| Objektträger-Raster | Tabelle: Ebene, Färbung, Druckstatus, Aktionen | Nicht zutreffend | Eine Zeile je Objektträger. **Drucken** druckt einen; **Erneut drucken** erfordert einen Grund; **Entfernen** eines gedruckten Objektträgers erfordert einen Stornogrund. Ein **Kontroll**-Objektträger kann zugeordnet werden. | Nicht zutreffend |
| Färbung (Objektträger hinzufügen) | Auswahlliste mit Suche | Pflicht (kann ausgeschaltet werden) | Die Färbung für einen neuen Objektträger. | Keine |
| Duplikate | Ganzzahl | Optional | Wie viele derselben Färbung. | 1 |
| Schnitttiefe der Ebene | Zahl in µm | Optional (kann zur Pflicht gemacht werden) | Tiefe des Schnitts. **+ Ebene** schneidet eine weitere Ebene derselben Färbung. | Leer |
| Grund für den Nachdruck | Auswahl: Stau, Zerkratztes Glas, Fehldruck, Sonstiges | Grund erforderlich | Wird mit dem Objektträger erfasst. | Keiner |
| Stornogrund (gedruckter Objektträger) | Auswahl: Beschädigter Schnitt, Irrtümlich angefordert, Gewebe aufgebraucht, Sonstiges | Grund erforderlich | Stornierung eines Objektträgers, der bereits gedruckt wurde. | Keiner |
| Druckmodus | Auswahl: Auf Anforderung, Charge | Optional | Auf Anforderung verwendet **Nächsten drucken/gravieren** für den nächsten nicht gedruckten Objektträger; Charge druckt die markierten Objektträger mit einem Fortschrittsfenster. | Auf Anforderung |
| Objektträger- und Blockkommentare | Schublade mit **Kommentar** und einem Kontrollkästchen „Diesen Kommentar auf dem physischen Etikett drucken“ | Optional (Text kann zur Pflicht gemacht werden) | Ein Kommentar zu einem Objektträger kann auf dem Etikett gedruckt werden. | Leer |
| Block aufgebraucht | Schaltfläche und Fenster mit einer verpflichtenden **Notiz** | Notiz erforderlich | Sendet eine E-Mail an die anfordernde Pathologin oder den anfordernden Pathologen und blockiert das Schneiden, bis diese das zerstörende Schneiden genehmigen oder den Auftrag stornieren oder ändern. Die Genehmigung erfordert `add-on:exception:approve-destructive-cut`. | Nicht zutreffend |
| Bereich Probenflüssigkeit / Dekantat | Gesamtvolumen (mL); Aussehen: Klar, Blutig, Trüb; Dekantatausbeute: Niedrig, Mäßig, Hoch | Optional | Eingaben zur Flüssigkeitszytologie. Zeigt eine vorgeschlagene Aufbereitung mit **Vorschlag übernehmen**. | Leer |
| Abrechnungsbereich | Anzeige | Nicht zutreffend | Leistungen für die Objektträger des Blocks, mit Warnungen für Leistungen, die auf Genehmigung warten; die **Vollständige Abrechnungsprüfung** erfordert die Berechtigung zur Abrechnungsprüfung. | Nicht zutreffend |
| Fußpedal | Hardware | Optional | Pedal 2 druckt oder graviert den nächsten Objektträger (siehe [Reiter Sprache](#screen-tab-voice)). | Nicht zugeordnet |

**7. Berechtigungen.** Bildschirm öffnen: `screen:microtomy:open`. Zerstörendes Schneiden genehmigen: `add-on:exception:approve-destructive-cut` (Pathologe, Fellow, Assistenzarzt). Vollständige Abrechnungsprüfung: `billing:applied-code:review`.
**Bekannte Grenzen.** Die Gründelisten sind im Produkt fest vorgegeben.

### Objektträger-Verteilstation {#screen-slide-distribution-station}
Breadcrumb: Startseite > Objektträger-Verteilstation

**Status:** Umgesetzt

**1. Navigation:** Startseite > **Objektträger-Verteilstation**. Öffnet sich mit `screen:slide-distribution:open` (Histologie-Fachkraft).
**2. Wartungspunkt:** Nicht zutreffend. Dies ist ein Arbeitsplatzbildschirm.

**3. Geschäftszweck und Geltungsbereich.** Der Bildschirm für die Ausgabe der Objektträger. Eine Fachkraft scannt Objektträger in eine Arbeitswarteschlange und leitet jeden dann entweder an eine physische Ausgabe (eine Pathologin, einen Pathologen oder einen Pool, mit einer Mappe, einem Tablett oder einer Kuriertasche) oder an einen digitalen Scanner (ein Gestell und eine Position) weiter und protokolliert Scan-Ausnahmen.

**4. Voraussetzungen und Abhängigkeiten.** Pathologinnen, Pathologen und Pools stammen aus der Personalliste und aus den Pools der [Subspezialitäten](#screen-subspecialties). Scanner sind Geräte der Art „Objektträgerscanner“ unter [Geräte](#screen-equipment); ohne sie weist die Auswahlliste darauf hin, dass keine eingerichtet sind. Verpflichtende Eingaben ergeben sich aus den [Pflichtfeldern](#screen-field_requirements) (Seite `slideDistribution`).

Setup step: Reference, not part of setup
Requires: [Geräte](#screen-equipment), [Subspezialitäten](#screen-subspecialties), [Pflichtfelder](#screen-field_requirements)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-slide-distribution-station - Objektträger-Verteilstation mit Warteschlange und Zielbereich]

**6. Feldreferenz.** Referenzseite: die Bedienelemente auf dem Bildschirm.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Barcode eines Objektträgers oder Blocks/einer Kassette scannen | Scanner oder Text | Optional | Die Warteschlange wächst fortlaufend. | Leer |
| Arbeitswarteschlange | Liste mit Anzahl | Nicht zutreffend | Objektträger mit Färbung, Status und Weiterleitung; **Aus der Warteschlange entfernen** entfernt einen. Kann nach Subspezialitäts-Pool oder Nicht zugewiesen gruppiert werden. | Nicht zutreffend |
| Zielmodus | Auswahl: Physische Ausgabe, Digitaler Scanner | Pflicht | Wählt die Form des Ziels. | Physische Ausgabe |
| Pathologe oder Pool | Auswahlliste mit Suche | Pflicht (kann ausgeschaltet werden) | Wer den Objektträger erhält. | Keiner |
| Mappen-ID des Objektträgers, Tablettnummer, Kuriertransporttasche | Text | Optional (jedes kann zur Pflicht gemacht werden) | Angaben zum physischen Ort. **Physische Weiterleitung bestätigen** speichert. | Leer |
| Scanner-Instrument | Auswahlliste der Objektträgerscanner | Pflicht für Digital | Der Scanner. | Keiner |
| Gestell-ID, Position im Fach | Text | Optional (jedes kann zur Pflicht gemacht werden) | Position am Scanner. **Scanner-Weiterleitung bestätigen** speichert und stellt den Objektträger in die Scan-Warteschlange. | Leer |
| Aktiver Objektträger, Probenkette | Anzeige | Nicht zutreffend | Status und Historie des ausgewählten Objektträgers. | Nicht zutreffend |
| Ersatzetikett auslösen | Schaltfläche und Fenster mit **Grund** | Grund erforderlich | Gründe: Beschädigtes Etikett, Unlesbarer Barcode, Verschmierter Druck, Sonstiges. Wird im Datensatz der Probenkette festgehalten. | Nicht zutreffend |
| Scan-Ausnahmeprotokoll | Ungelöste Scans mit **Auflösen** und einer optionalen **Notiz** | Optional (Notiz kann zur Pflicht gemacht werden) | Gründe: Unlesbarer Barcode, Nicht zugewiesene Eingangsnummer, Fehlendes Glas. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:slide-distribution:open`. Es gilt keine eigene Konfigurationsberechtigung.
**Bekannte Grenzen.** Die Gründelisten sind im Produkt fest vorgegeben. Das Datenmodell der Weiterleitung (Objektträgermappe, Tablett, Kuriertransporttasche) hat kein Wörterbuch dahinter; die Werte sind Freitext.

## Digitale Pathologie, WSI-Scanner-Integration und Viewer-Einstellungen {#ch4-digital-pathology}
Breadcrumb: Startseite > Konfiguration > System

Dieser Teil behandelt, was PathScribe heute für die digitale Pathologie bietet. Beachten Sie den Umfang genau. Es gibt zwei Bestandteile. Erstens die Anbieterwörterbücher unter [Anbieterintegrationen](#screen-vendor_integrations), die Listen mit Namen und Webadressen sind. Zweitens die Warteschlange für das Scannen von Objektträgern in der [Chargenverwaltung](#screen-batch-management), die ein Scanverzeichnis an die Schnittstellen-Engine sendet und einen Status zurückerhält. **Nicht umgesetzt:** ein anbieterspezifischer Scannertreiber oder ein Anbieter-Connector. Kein Bildschirm konfiguriert einen Scanner, außer dass er unter [Geräte](#screen-equipment) als Gerät der Art „Objektträgerscanner“ benannt wird. PathScribe hat keinen Objektträger-Viewer: Ein gescannter Objektträger zeigt die Vorschau seines Scanners und öffnet sich in der digitalen Pathologie-Anwendung des Labors, eingerichtet unter **Objektträgerbilder** in den Anbieterintegrationen (Batch 750). Die Seite des Mock-Viewers ist nur eine Demonstration.

### Anbieterintegrationen {#screen-vendor_integrations}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Anbieterintegrationen

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Anbieterintegrationen (vier Kategorien in einer Liste links: Digitale Pathologie / KI, WSI-Viewer, Bildverwaltungssysteme, Zuschnitt- / Makrobildgebung & Telepathologie)

**3. Geschäftszweck und Geltungsbereich.** Ein Bildschirm enthält vier Wörterbücher externer Produkte. Jedes ist eine Liste mit **Hinzufügen**, **Bearbeiten**, **Deaktivieren / Reaktivieren** und einem Schalter **Inaktive anzeigen**. Einträge werden nie gelöscht. Die Listen sind Referenzdaten: Auswahllisten und Links, die andere Teile von PathScribe lesen. Die Listen Digitale Pathologie / KI, Bildverwaltungssysteme und Zuschnitt- / Makrobildgebung sind Namen und Einstellungen, die erfasst und angezeigt werden; das Produkt enthält keinen anbieterspezifischen Connector, der auf sie wirkt. Nur die Kategorie WSI-Viewer hat eine funktionierende Verwendung: Ihre Einstellungen **Objektträgerbilder** geben die Adresse an, die einen Objektträger in der digitalen Pathologie-Anwendung des Labors öffnet, und die Adresse der Vorschau des Objektträgers; die **Start-URL-Vorlage** ihrer Liste wird verwendet, wenn dort keine Viewer-Adresse festgelegt ist.

**4. Voraussetzungen und Abhängigkeiten.** Keine außer dem Zugriff der Person. Legen Sie die Viewer-Adresse unter Objektträgerbilder fest (oder einen WSI-Viewer mit Startvorlage), bevor Objektträger in der Anwendung des Labors geöffnet werden können; Scanner-Hardware ist eine eigene Liste (Geräte).

Setup step: Tier 3, step 9
Requires: Keine.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-vendor_integrations - Anbieterintegrationen mit den vier Kategorien und der Liste der WSI-Viewer]

**6. Feldreferenz.**

#### Digitale Pathologie / KI (Fenster Hinzufügen und Bearbeiten)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Anbietername | Text | Pflicht | Speichern ist deaktiviert, wenn leer. | Keiner |
| Produktname | Text | Pflicht | Speichern ist deaktiviert, wenn leer. | Keiner |
| Modalität | Text | Pflicht | Zum Beispiel das klinische Gebiet, das das Produkt abdeckt. Speichern ist deaktiviert, wenn leer. | Keine |
| FDA-zugelassen | Kontrollkästchen | Optional | Wird neben dem Eintrag in der Liste angezeigt. | Aus |
| Inaktive anzeigen | Schalter | Optional | Zeigt Einträge, die deaktiviert wurden. | Aus |

Die Demonstrationsdaten enthalten sechs Einträge: Paige Prostate, Ibex Prostate Detect, PathAI AISight Dx, Proscia Concentriq AP-Dx, Hologic Genius Digital Diagnostics (alle FDA-zugelassen) und BD FocalPoint GS Imaging System (nicht als zugelassen markiert).

#### WSI-Viewer (Fenster Hinzufügen und Bearbeiten)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name (Anbieter / Produktname) | Text | Pflicht | Speichern ist deaktiviert, wenn leer. | Keiner |
| Start-URL-Vorlage | Webadresse mit dem Token `{{wsiUniqueId}}` | Optional | PathScribe ersetzt das Token durch die Kennung des Objektträgers. Nur verwendet, wenn unter Objektträgerbilder keine Viewer-Adresse festgelegt ist: Der erste aktive Eintrag mit einer verwendbaren https-Adresse öffnet den Objektträger. Eine Warnung erscheint, wenn dem Text das Token fehlt. | Leer |
| Inaktive anzeigen | Schalter | Optional | | Aus |

Alle Demonstrationseinträge haben eine leere Vorlage (der Demonstrationseintrag mit example.com wurde in Batch 750 entfernt).

#### Objektträgerbilder (WSI-Viewer, über der Liste)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Viewer-Adresse | https-Webadresse mit `{{slideId}}`, optional `{{accession}}` | Optional | Öffnet den Objektträger in der digitalen Pathologie-Anwendung des Labors, in einem eigenen Fenster, das sich seinen Platz an jedem Arbeitsplatz merkt. Sie darf keinen Benutzernamen, kein Passwort und keinen Patientennamen enthalten; die Anmeldung ist Sache dieser Anwendung. Das Öffnen wird im Auditprotokoll erfasst und erfordert `case:slide-image:open`. | `VITE_SLIDE_VIEWER_URL_TEMPLATE` der Bereitstellung, falls gesetzt |
| Adresse des Vorschaubilds | https-Webadresse mit `{{slideId}}`, optional `{{accession}}` | Optional | Die Vorschau des Objektträgers aus dem Scanner oder Bildsystem, unverändert angezeigt mit „Referenzvorschau. Nicht für die Diagnose.“, sobald der Objektträger gescannt ist. Fügen Sie ihren Host der Sicherheitsrichtlinie hinzu (img-src). | `VITE_SLIDE_THUMBNAIL_URL_TEMPLATE` der Bereitstellung, falls gesetzt |
| Einrichtungen mit eigenem System | Eine Einrichtung, dann dieselben zwei Adressen | Optional | Für eine Einrichtung mit eigenem Scanner oder eigener Anwendung; leer: Die Adresse des Labors wird verwendet. | Keiner |

Speichern erfordert `config:vendor-integrations:manage`. Ist keine Viewer-Adresse festgelegt, sieht der Benutzer beim Öffnen eines Objektträgers „Es ist keine Viewer-Adresse festgelegt. Wenden Sie sich an Ihre Administration.“. Jeder Arbeitsplatz legt im Arbeitsplatzmenü fest, wo sich das Objektträgerfenster öffnet (Fenster für Objektträgerbilder, Position festlegen).

#### Bildverwaltungssysteme (Fenster Hinzufügen und Bearbeiten)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Speichern ist deaktiviert, wenn leer. | Keiner |
| Bereitstellung | Auswahl: Enterprise-IMS, Dateiserver vor Ort | Optional | Wo der Bildspeicher läuft. | Enterprise-IMS |
| Authentifizierung | Auswahl: Keine, Signierte URL, OAuth-2.0-Bearer, mTLS | Optional | Wie der Speicher erreicht wird. Nur die Auswahl wird erfasst. | Keine |
| Basis-URL | Text | Optional | Adresse des Speichers. Das Fenster warnt davor, Token oder Geheimnisse einzutragen. Ein Eintrag ohne Adresse zeigt „keine Basis-URL“. | Leer |

#### Zuschnitt- / Makrobildgebung & Telepathologie (Fenster Hinzufügen und Bearbeiten)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Speichern ist deaktiviert, wenn leer. | Keiner |
| Authentifizierung | Auswahl (dieselben vier wie oben) | Optional | Wird nur erfasst. | Keine |
| Basis-URL | https-Webadresse | Optional | Eine Adresse, die nicht https ist, zeigt einen Fehler, und Speichern ist deaktiviert. | Leer |
| Unterstützt Live-Telepathologie | Kontrollkästchen | Optional | Die Liste zeigt „telepathologiefähig“ oder „nur statisch“. Nichts außerhalb dieser Liste liest es. | Aus |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:vendor-integrations:manage` (standardmäßig Admin und Laborleitung). Andere sehen die Listen schreibgeschützt.
**Bekannte Grenzen.** Der Vertrag steht in `docs/architecture/DIGITAL_PATHOLOGY_API.md`. **Nur Demonstration: Mock-WSI-Viewer.** Eine Route `/wsi-viewer?caseId=` öffnet `MockWsiViewerPage`, die einen „Mock“-Hinweis, die Identität des Falls und einen leeren Platzhalter anzeigt, wo ein Objektträger stünde. Sie existiert nur, wenn im Build die Demonstrationswerkzeuge eingeschaltet sind, wird durch einen Test aus Produktions-Builds ausgeschlossen und ist keine Administratoreinstellung. PathScribe selbst zeigt kein Whole-Slide-Bild an. Kein Anbieterdatensatz wird von der KI oder der Scanner-Warteschlange gelesen.

## Einstellungen zu Freigabe, Prüfung, Qualität und Betrieb der Pathologie {#ch4-signout}
Breadcrumb: Startseite > Konfiguration > System

Dieser Teil behandelt jede Einstellung, die die Freigabe und die Bildschirme zu Qualität, Durchlaufzeit und Betrieb darum herum prägt. Die Bildschirme sind gruppiert in: Regeln zu Freigabe und Prüfung; intraoperativ und Anzeige; Durchlaufzeit; Qualitätssicherung und Zytologie-QK; und Sonstiges (Beitrag, Feedback, Forschungs-Feed). Die Seiten für den Tagesbetrieb (Startseite, Qualitätssicherung, Lockbox-Einwurf, Randausnahmen-Überprüfung, Zytologie-QK-Warteschlange) sind Referenzseiten und stehen am Ende des Teils.

Fast jeder Bildschirm unten folgt einem Muster: ein Standardwert der Organisation, den jedes durchführende Labor im Bearbeitungsfenster der **Einrichtungskonfiguration** ([Einrichtungskonfiguration](#screen-facility-dictionary), Stufe 1) übernehmen oder überschreiben kann. Das durchführende Labor ist das Labor, das den Fall freigibt, ermittelt über die einsendende Einrichtung. Alle sind Konfiguration mit hohem Risiko: Nur Admin und Laborleitung (und die Superadministration von ForMedrixAI) haben standardmäßig die Berechtigung, sie zu ändern, und eine Person ohne sie sieht den Bildschirm schreibgeschützt.

### Peer-Review vor Freigabe {#screen-peer_review_gate}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Peer-Review vor Freigabe

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Peer-Review vor Freigabe

**3. Geschäftszweck und Geltungsbereich.** Eine erstmalige Malignität (anhand früherer Fälle des Patienten beurteilt) wird stets für ein unabhängiges Peer-Review empfohlen. Dieser Bildschirm legt fest, wo die Freigabe zusätzlich auf diese Prüfung **wartet**. Sie ist standardmäßig ausgeschaltet. Die spezifischste Einstellung gewinnt: Abteilung, dann durchführendes Labor, dann die Organisation. Ist das Gate eingeschaltet, kann eine Pathologin oder ein Pathologe für dringende Versorgung dennoch vor der Prüfung freigeben und gibt dafür einen Grund an; die Prüfung ist dann innerhalb von 24 Stunden geschuldet.

**4. Voraussetzungen und Abhängigkeiten.** Die Zeilen stammen aus den durchführenden Laboren ([Einrichtungskonfiguration](#screen-facility-dictionary)) und aus den Subspezialitäten ([Subspezialitäten](#screen-subspecialties), als „Abteilung“ angezeigt). Ohne sie steht nur der Schalter der Organisation zur Verfügung.

Setup step: Tier 3, step 10
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary), [Subspezialitäten](#screen-subspecialties)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-peer_review_gate - Peer-Review vor Freigabe mit dem Schalter der Organisation und zwei Tabellen]

**6. Feldreferenz.** Jede Änderung wird sofort gespeichert und zeigt „Gespeichert“.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Die Freigabe wartet organisationsweit auf das Peer-Review | Kontrollkästchen | Optional | Die Einstellung für die gesamte Organisation. | Aus |
| Durchführendes Labor (Tabelle Nach Einrichtung): Freigabe wartet auf Prüfung | Auswahl je Labor: Erben, Ein, Aus | Optional | Erben verwendet die Einstellung der Organisation. | Erben |
| Abteilung (Tabelle Nach Abteilung): Freigabe wartet auf Prüfung | Auswahl je Subspezialität: Erben, Ein, Aus | Optional | Erben verwendet die Einstellung des Labors. | Erben |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:peer-review:manage` (hohes Risiko, protokolliert; Admin und Laborleitung). 
**Bekannte Grenzen.** Eine Serverversion existiert (`QUALITY_SETTINGS_API.md`, `QUALITY_API.md`); die Demonstration hält die Einstellungen im Browser.

### Übereinstimmungsprüfung: vorläufig vs. endgültig {#screen-concordance_review_settings}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Übereinstimmungsprüfung: vorläufig vs. endgültig

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Einstellungen zur Übereinstimmungsprüfung

**3. Geschäftszweck und Geltungsbereich.** Steuert den automatischen Vergleich eines vorläufigen Befunds (zum Beispiel einer Schnellschnittdiagnose) mit der endgültigen Diagnose sowie einen optionalen Prüfbildschirm bei der Freigabe. Die Entscheidung über die Übereinstimmung trifft stets die Pathologin oder der Pathologe; diese beiden Einstellungen legen nur fest, ob das System hilft, sie sichtbar zu machen.

**4. Voraussetzungen und Abhängigkeiten.** Für den Standardwert der Organisation keine. Eine Ausnahme auf Laborebene wird im Bearbeitungsfenster der Einrichtungskonfiguration ([Einrichtungskonfiguration](#screen-facility-dictionary)) festgelegt.

Setup step: Tier 3, step 11
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-concordance_review_settings - Übereinstimmungsprüfung vorläufig vs. endgültig mit zwei Schaltern]

**6. Feldreferenz.** Jeder Schalter wird sofort gespeichert und zeigt „Gespeichert“.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Automatischen Vergleich aktivieren | Schalter | Optional | Das System vergleicht einen vorläufigen Befund mit der passenden endgültigen Diagnose und markiert eine echte Diskordanz zur Prüfung durch die Pathologin oder den Pathologen. Es bewertet selbst nie ein Ergebnis. | Ein |
| Prüfbildschirm bei der Freigabe verlangen | Schalter | Optional | Ein zusätzlicher Bildschirm zeigt den Vergleich vorläufig gegenüber endgültig, bevor die Freigabe abgeschlossen werden kann. | Ein |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:concordance-review:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Die Einstellung wird auch je Labor im Datensatz der Einrichtung gespeichert. Eine Serverversion existiert (`QUALITY_SETTINGS_API.md`).

### Freigabepuffer nach Signierung {#screen-release_buffer}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Freigabepuffer nach Signierung

**Status:** Teilweise

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Freigabepuffer (Titel auf dem Bildschirm: Freigabepuffer nach Signierung)

**3. Geschäftszweck und Geltungsbereich.** Eine vorübergehende Zurückhaltung zwischen Freigabe und tatsächlicher externer Übermittlung. Solange der Befund bei **Freigabe ausstehend** zurückgehalten wird, kann die signierende Pathologin oder der signierende Pathologe ihn ohne förmlichen Nachtrag zurückrufen und korrigieren. Dies sind die Standardwerte der gesamten Organisation. Ein durchführendes Labor kann sie übernehmen oder im Bearbeitungsfenster der Einrichtungskonfiguration eigene Werte für Aktivierung, Dauer und STAT-Umgehung festlegen; das Wasserzeichen und die Druckbeschränkung gelten nur organisationsweit.

**Was der Code heute tut (im Quelltext geprüft).** Der Zeitpunkt der Freigabe, der in die Berichte zur Durchlaufzeit einfließt, wird weiterhin bei der Freigabe erfasst. Ein getrennter Zeitpunkt „Freigegeben am“ wird erfasst, wenn die Zurückhaltung endet. Die Zurückhaltung wird durch einen Timer beendet, der in jedem geöffneten PathScribe-Bildschirm läuft (und durch eine Hintergrundprüfung auf jedem geöffneten Bildschirm). Ein serverseitiger Scheduler, der einen Fall freigeben würde, den niemand geöffnet hat, ist mit dem API-Server geplant und **nicht umgesetzt**; daher kann die Freigabe verspätet erfolgen, wenn kein Bildschirm geöffnet ist. 

**4. Voraussetzungen und Abhängigkeiten.** Für die Standardwerte keine. Überschreibungen je Labor: [Einrichtungskonfiguration](#screen-facility-dictionary).

Setup step: Tier 3, step 12
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-release_buffer - Einstellungen des Freigabepuffers nach Signierung]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Freigabepuffer nach Signierung aktivieren | Schalter | Optional | Ein signierter Befund wird für die Pufferdauer bei Freigabe ausstehend zurückgehalten, sofern keine Umgehung gilt. | Ein |
| Pufferdauer | Ganzzahl in Minuten, 1 bis 30 | Pflicht | Ein Wert außerhalb des Bereichs wird auf die Grenze gesetzt. | 10 |
| Puffer für STAT-Fälle umgehen | Schalter | Optional | STAT-Fälle werden sofort freigegeben. | Ein |
| Wasserzeichen-Bannertext | Text | Optional | Wird diagonal über jede Bildschirmansicht eines Befunds mit Freigabe ausstehend gezeichnet und an den PDF-Renderer gesendet. PathScribe sendet den Text; es kann nicht prüfen, ob der getrennte Renderer ihn zeichnet. | PENDING FINAL RELEASE - DO NOT DISTRIBUTE |
| Druckrichtlinie während der Freigabesperre | Auswahl: Erlauben, Warnen und bestätigen, Vorgesetzten-Ausnahme, Blockieren | Optional | Was geschieht, wenn jemand einen Befund druckt, der sich noch in seiner Freigabeverzögerung befindet (Batch 654; sie ersetzt den alten Schalter „Internen Papierausdruck einschränken“). **Erlauben** druckt sofort. **Warnen und bestätigen** weist darauf hin, dass die Kopie ein Entwurf mit Wasserzeichen ist, und bittet die Person um Bestätigung. **Vorgesetzten-Ausnahme** lässt nur eine Person drucken, die `print:release-hold:override` besitzt, und sie muss einen Grund angeben; alle anderen werden abgelehnt. **Blockieren** erlaubt keinen Ausdruck, bis der Befund freigegeben ist. Jede gedruckte Kopie trägt weiterhin das Wasserzeichen „Freigabe ausstehend“. Eine alte Einstellung Ein wurde zu Warnen und bestätigen; Aus wurde zu Erlauben. Die Einstellung gilt für die gesamte Organisation und ist ausgegraut, solange die Freigabeverzögerung ausgeschaltet ist. | Warnen und bestätigen |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:release-buffer:manage` (hohes Risiko; Admin und Laborleitung). Einen Befund während seiner Freigabesperre unter Vorgesetzten-Ausnahme drucken: `print:release-hold:override` („Einen Befund während seiner Freigabesperre drucken (Vorgesetzten-Ausnahme)“; Laborleitung und Admin haben sie standardmäßig; geben Sie sie jeder anderen Rolle, die gesperrte Befunde drucken soll).
**Bekannte Grenzen.** Teilweise wegen des Punkts zum Scheduler oben. Der Server-Job zur Freigabe, der einen Befund freigeben würde, den niemand geöffnet hat, ist entworfen (`docs/architecture/RELEASE_SWEEP_SERVER_JOB.md`: ein Durchlauf pro Minute; ein verpasstes Zeitfenster gibt verspätet frei, und der Fall wird markiert) und **nicht umgesetzt**. Sobald er umgesetzt ist, gibt er nie einen Befund frei, der unter einer Sperre der chirurgischen Freigabe steht; er markiert stattdessen den Fall für eine Person. Eine Serverversion der Einstellungen existiert (`REPORTS_API.md`).

### Abzeichnungsregeln nach Land {#screen-country_signing_rules}
Breadcrumb: Startseite > Konfiguration > System > Klinische Nachschlagewerke > Abzeichnungsregeln nach Land

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Klinische Nachschlagewerke**. Nur intern: Ein Administrator des Kunden sieht den Bildschirm schreibgeschützt.
**2. Wartungspunkt:** Abzeichnungsregeln nach Land

**3. Geschäftszweck und Geltungsbereich.** Die nationalen Regeln für jede Beteiligungsart: ihre örtliche Bezeichnung, ob sie freigeben darf, ob ihre Arbeit eine Gegenzeichnung braucht und ob sie den gesamten Fall einsehen darf. Jedes Labor des Landes übernimmt die Regeln, sofern es unter Teilnahmetypen keine eigene Ausnahme hat. Die Regeln bilden nationale Vorschriften ab, daher kann sie nur der Plattformadministrator von ForMedrixAI ändern. Jedes Speichern erfordert einen Grund und wird in das Prüfprotokoll geschrieben.

**4. Voraussetzungen und Abhängigkeiten.** Die Zeilen sind die Beteiligungsarten.

Setup step: Tier 3, step 13
Requires: [Teilnahmetypen](#screen-participation_types)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-country_signing_rules - Abzeichnungsregeln nach Land mit einer Karte je Beteiligungsart]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Land | Auswahlliste: US, CA, GB (England und Wales), GB (Schottland), GB (Nordirland), IE, AU, NZ, KR, BE, NL, DE, FR, ES | Pflicht | Das Wechseln mit nicht gespeicherten Änderungen wird blockiert („Speichern oder verwerfen Sie Ihre Änderungen, bevor Sie das Land wechseln.“). | GB (England und Wales) |
| In diesem Land anbieten / Hier nicht mehr anbieten | Schaltfläche auf einer Karte, deren Typ nicht global ist | Optional | Fügt den Typ für das Land hinzu oder entfernt ihn. Das Entfernen des letzten Landes wird abgelehnt (deaktivieren Sie stattdessen den Typ). | Nicht zutreffend |
| Lokale Bezeichnung | Text | Optional | Die Bezeichnung des Landes für den Typ. Der Platzhalter zeigt die Bezeichnung der Plattform. | Leer (Bezeichnung der Plattform) |
| Darf abschließen / abzeichnen | Auswahl: Plattformvorgabe (Wert), Ja, Nein | Optional | Ob der Typ freigeben darf. | Plattformvorgabe |
| Gegenzeichnung erforderlich | Auswahl: Plattformvorgabe, Ja, Nein | Optional | Ob die Arbeit des Typs eine Gegenzeichnung braucht. | Plattformvorgabe |
| Darf den ganzen Fall einsehen | Auswahl: Plattformvorgabe, Ja, Nein | Optional | | Plattformvorgabe |
| Regulatorische Grundlage | Mehrzeiliger Text | Optional | Die Vorschrift der Aufsichtsstelle oder des Fachverbands, der die Einstellung folgt. | Leer |
| Grund der Änderung | Text | Zum Speichern erforderlich | Fehler „Geben Sie einen Grund für die Änderung an.“ Angezeigt mit „Zuletzt geändert von (Name) am (Datum). Grund“. | Leer |
| Änderungen verwerfen, Änderungen speichern | Schaltflächen | Nicht zutreffend | **Änderungen speichern** meldet einen teilweisen Fehlschlag („zuvor gespeicherte Typen wurden beibehalten und protokolliert“). | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `platform:signing-rules:manage` (nur Plattform, hohes Risiko; nur Superadministration von ForMedrixAI). Admin und Laborleitung können sie nicht ändern.
**Bekannte Grenzen.** Vertrag in `docs/architecture/LAB_DICTIONARIES_API.md`.

### Revisionsgründe {#screen-revision_reasons}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Revisionsgründe

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Revisionsgründe

**3. Geschäftszweck und Geltungsbereich.** Listet die Gründe auf, aus denen eine Pathologin oder ein Pathologe einen freigegebenen Befund ergänzt oder korrigiert, und lässt die Administratorin oder den Administrator markieren, welche bedeuten, dass der ursprüngliche Befund die klinische Behandlung beeinflusst haben kann. Die Freigabe einer Revision aus einem markierten Grund empfiehlt der QS-Leitung eine CAPA. Dieser Bildschirm schaltet nur die Markierung um; er fügt keine Gründe hinzu und benennt sie nicht um.

**4. Voraussetzungen und Abhängigkeiten.** Keine.

Setup step: Tier 3, step 14
Requires: Keine.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-revision_reasons - Revisionsgründe in zwei Gruppen mit einem Schalter klinisch bedeutsam]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Nachtragsgründe (diagnostische Revision), Korrekturgründe (Schreibfehler) | Zwei Listen | Nicht zutreffend | Ausgangsgründe. Nachtrag: Revision der diagnostischen Interpretation, Neubewertung des Resektionsrands, Änderung des pathologischen Stagings, Umklassifizierung von Probe/Lokalisation. Korrektur: Tippfehler, Aktualisierung der Patienten-/Demografiedaten, Aktualisierung des einsendenden Arztes, Korrektur der Probenbeschriftung. | Nicht zutreffend |
| Grund, Beschreibung | Text | Nicht zutreffend | Hier nur lesbar. Inaktive Gründe zeigen ein Etikett „Inaktiv“. | Nicht zutreffend |
| Klinisch bedeutsam | Schalter je Grund | Optional | Ein zeigt „Empfiehlt eine CAPA“, aus zeigt „Keine CAPA“. | Ein für die vier Nachtragsgründe, aus für die vier Korrekturgründe |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:revision-reasons:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Im Produkt sind die Anfangswerte: Diagnose, Resektionsrand, Stadium und Umklassifizierung des Gewebes ein; Schreibkorrekturen aus (`revisionReasonRules.ts`). Der Dienst erlaubt das Hinzufügen, Bearbeiten, Deaktivieren und Reaktivieren von Gründen, aber dieser Bildschirm hat dafür keine Schaltfläche; das ist für Pete in `open-questions/ch4.md` aufgeführt. Vertrag: `docs/architecture/LAB_DICTIONARIES_API.md`.

### Arbeitsplatz-Gründe {#screen-bench_reasons}
Breadcrumb: Start > Konfiguration > System > Verwaltung und Compliance > Arbeitsplatz-Gründe

**Status:** Umgesetzt (Batch 736)

**1. Navigation:** Konfigurationsregister **System** > Gruppe **Verwaltung und Compliance**
**2. Pflegeelement:** Arbeitsplatz-Gründe

**3. Geschäftszweck und Umfang.** Die Gründe, die das Personal am Arbeitsplatz antippt statt zu tippen, in fünf Gruppen: Mikrotom (Block erschöpft); Nachbestellungen bei erschöpftem Block (Bestellung und Antwort des Pathologen, einschließlich Freigabe des destruktiven Schneidens); Charge abbrechen; Charge mit Abweichungen abschließen; Kühlkettenabweichung. Jedes Labor formuliert sie selbst. Ein Grund behält beim Umformulieren seinen **Code**; jeder Datensatz und jeder Prüfprotokolleintrag speichert den Code neben dem Text, sodass Berichte (Spalte **Grundcode** im Bericht der Abgleichsabweichungen) ihn vor und nach dem Umformulieren gleich zählen. Eine Notiz bleibt freiwillig.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Die Standardgründe werden in allen sechs Sprachen ausgeliefert.

Setup step: Tier 3, step 32
Requires: None.
Unlocks: None.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-bench_reasons - Arbeitsplatz-Gründe in fünf Gruppen]

**6. Felder.** Formulierung (mit **Umformulieren**; ein Standardgrund erscheint in der Sprache jedes Benutzers, ein umformulierter wie eingegeben), Code (schreibgeschützt, ändert sich nie), ↑ / ↓ (Reihenfolge), **Standardformulierung verwenden**, **Außer Gebrauch nehmen** / **Wiederherstellen**, **Grund hinzufügen**.

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:bench-reasons:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Eine Liste für die ganze Organisation; ein Standort kann noch keine eigene Formulierung haben.

### Tumorboard-Regeln für automatische Markierung {#screen-tumor_board_rules}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Tumorboard-Regeln für automatische Markierung

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Tumorboard-Regeln (Titel auf dem Bildschirm: Tumorboard-Regeln zur automatischen Markierung)

**3. Geschäftszweck und Geltungsbereich.** Bei der Freigabe führt PathScribe einen Fall für ein Tumorboard auf, wenn eine Regel auf den signierten Befund passt, und erfasst den Grund. Es gibt vier Board-Namen: Breast MDT, GI MDT, Thoracic MDM und Gyn-Onc. Es gibt zwei Arten von Regeln. Eine Randregel führt den Fall auf, wenn ein Resektionsrand näher als ein Schwellenwert liegt. Eine Regel zu Diagnose und Biomarker führt den Fall auf, wenn jedes Kriterium zutrifft. Werte des Unternehmens können für eine Einrichtung überschrieben oder ausgeschaltet werden. Eine getrennte Sperrfrist für Batches sperrt die Fallliste eines Boards vor dessen Besprechung.

**4. Voraussetzungen und Abhängigkeiten.** Überschreibungen je Einrichtung verwenden die [Einrichtungskonfiguration](#screen-facility-dictionary). Kriterien werden anhand von Feldbezeichnung und Wortlaut im signierten Befund abgeglichen; testen Sie daher eine Regel an einer echten Befundvorlage, bevor Sie sich auf sie verlassen.

Setup step: Tier 3, step 15
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-tumor_board_rules - Tumorboard-Regeln zur automatischen Markierung mit Randregeln, Kriterienregeln, Sperrfrist und Überschreibungen je Einrichtung]

**6. Feldreferenz.** Fehler werden über den Karten angezeigt.

#### Unternehmens-Baseline (Randregeln)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Regelliste (Board und Beschreibung) | Eine Zeile je Board | Nicht zutreffend | Vier Ausgangsregeln, eine je Board, „Knapper oder positiver Resektionsrand (< 1mm)“. | Nicht zutreffend |
| Randabstand-Schwellenwert (mm) | Zahl größer als 0 | Pflicht | Fehler „Geben Sie einen Randabstand-Schwellenwert größer als 0 ein.“ | 1 |
| Aktiv | Kontrollkästchen | Optional | Schaltet die Regel für das Unternehmen aus. | Ein |
| Speichern | Schaltfläche | Nicht zutreffend | Erst nach einer Änderung aktiviert. | Nicht zutreffend |

#### Regeln zu Diagnose und Biomarker

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Beschreibung der Regel | Text, 1 bis 80 Zeichen | Pflicht | Der Grund, der erfasst wird, wenn ein Fall aufgeführt wird. | Leer |
| Board | Auswahlliste der vier Boards | Pflicht | Fehler „Wählen Sie ein Board.“ | Nicht zutreffend |
| Typ des Kriteriums (n) | Auswahl: Diagnose enthält, Biomarker-Ergebnis, Rand unter (mm) | Pflicht | Jedes Kriterium muss zutreffen. Eine Regel hat 1 bis 6 Kriterien und mindestens ein Kriterium zu Diagnose oder Biomarker. | Nicht zutreffend |
| Diagnosetext für Kriterium (n) | Text, 2 bis 60 Zeichen | Pflicht für ein Diagnosekriterium | | Leer |
| Biomarker; Ergebnis für Kriterium (n) | Zwei Textfelder, jeweils bis zu 60 Zeichen | Pflicht für ein Biomarker-Kriterium | | Leer |
| Randabstand-Schwellenwert (Kriterium) | Zahl größer als 0 | Pflicht für ein Randkriterium | | Leer |
| Aktiv | Kontrollkästchen | Optional | | Ein |
| + Regel hinzufügen, + Kriterium hinzufügen, Kriterium entfernen, Entfernen, Speichern, Abbrechen | Schaltflächen | Nicht zutreffend | Höchstens 25 Regeln zu Diagnose und Biomarker („Das Limit von 25 ... ist erreicht“). | Keine Regeln |

#### Sperrfrist für Batches

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Sperrfrist (Stunden vor der Besprechung) | Zahl, 0 oder mehr | Pflicht | Terminänderungen werden innerhalb dieses Zeitfensters abgelehnt. Die Selbstzuweisung als Vortragende oder Vortragender funktioniert weiterhin bis zur Besprechung und danach. | 48 |

#### Überschreibungen je Einrichtung

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Einrichtung | Auswahlliste | Pflicht | Fehler „Wählen Sie eine Einrichtung.“ | Erste Einrichtung |
| Regel | Auswahlliste der Randregeln und der Kriterienregeln | Pflicht | Die zu überschreibende Regel. | Erste Regel |
| Randabstand-Schwellenwert (mm) | Zahl größer als 0 | Pflicht für eine Randregel | Wird für eine Kriterienregel nicht verwendet. | Wert der Regel |
| Aktiv | Kontrollkästchen | Optional | Aus deaktiviert die Regel in dieser Einrichtung (die Liste zeigt „deaktiviert“). | Ein |
| An Board weiterleiten | Auswahlliste oder „Board der Regel selbst“ | Optional | Sendet den Fall in dieser Einrichtung an ein anderes Board. | Board der Regel selbst |
| Speichern, Abbrechen, Entfernen | Schaltflächen | Nicht zutreffend | | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:tumor-board-rules:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Vertrag: `docs/architecture/TUMOR_BOARD_API.md`. Die Board-Liste ist im Produkt fest vorgegeben.

### Biopsie–Resektat-Korrelation {#screen-biopsy_resection_correlation}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Biopsie–Resektat-Korrelation

**Status:** Teilweise

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Biopsie–Resektat-Korrelation (Titel auf dem Bildschirm: Zeitfenster für die Korrelation Biopsie–Resektat)

**3. Geschäftszweck und Geltungsbereich.** Wie lange nach einer chirurgischen Biopsie ein späteres Resektat desselben Patienten als Korrelationskandidat gesucht wird und von welchem Datum an dieses Zeitfenster läuft. Ein Resektat passt, wenn es innerhalb des Zeitfensters entnommen oder eingegangen ist. Legen Sie es für das Unternehmen, für jeden Rechtsraum und für jede Einrichtung fest; die spezifischste Einstellung gewinnt. Der Bildschirm ist dasselbe Bedienelement wie [Zytologie-Histologie-Korrelation](#screen-cytology_histology_correlation), angewendet auf die chirurgischen Einstellungen.

**4. Voraussetzungen und Abhängigkeiten.** Überschreibungen je Einrichtung verwenden die [Einrichtungskonfiguration](#screen-facility-dictionary).

Setup step: Tier 3, step 16
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: [Nachverfolgung](#screen-follow_up_tracking)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-biopsy_resection_correlation - Zeitfenster für die Korrelation Biopsie–Resektat mit Unternehmensstandard, Regeln je Rechtsraum und Überschreibungen je Einrichtung]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unternehmensstandard: Zeitfenster (Tage) | Ganzzahl 1 bis 1825 | Pflicht | Fehler „Geben Sie eine ganze Zahl von Tagen zwischen 1 und 1825 ein.“ | 180 |
| Unternehmensstandard: Beginnt ab | Auswahl: Entnahmedatum, Eingangsdatum im Labor, (Freigabe) | Pflicht | Das Datum, von dem das Zeitfenster ausgeht. Die Auswahl der Freigabe heißt auf dem Bildschirm auch hier „Freigabe der Zytologie“. | Entnahmedatum |
| Speichern | Schaltfläche | Nicht zutreffend | | Nicht zutreffend |
| Nach Rechtsraum: + Regel für Rechtsraum hinzufügen | Auswahlliste der Rechtsräume ohne Regel, Zeitfenster (Tage), Beginnt ab; Speichern, Abbrechen, Entfernen | Optional | Eine Regel je Rechtsraum. Die Liste zeigt „N Tage ab (Bezugsdatum)“. | Keine |
| Abweichungen je Einrichtung: + Überschreibung für Einrichtung hinzufügen | Auswahlliste der Einrichtungen, Zeitfenster (Tage), Beginnt ab; Speichern, Abbrechen, Entfernen | Optional | „Wählen Sie eine Einrichtung.“ ist der Fehler, wenn keine gewählt ist. | Keine |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:biopsy-resection-correlation:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Teilweise: Der Dienst ist ein Mock mit Browserspeicher, exportiert aus `services/index.ts`; es gibt keine Serverversion. Das Zeitfenster der Zytologie hat eine (Umgesetzt). Dass die Bezeichnung „Freigabe der Zytologie“ auf dem Bildschirm der Biopsie erscheint, ist in `open-questions/ch4.md` aufgeführt.

### Zytologie-Histologie-Korrelation {#screen-cytology_histology_correlation}
Breadcrumb: Startseite > Konfiguration > Zytologie > Korrelationszeitfenster

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **Zytologie** > **Korrelationszeitfenster**
**2. Wartungspunkt:** Korrelationszeitfenster (Titel auf dem Bildschirm: Zeitfenster für die zyto-histologische Korrelation)

**3. Geschäftszweck und Geltungsbereich.** Wie lange nach einem auffälligen Zervixzytologiebefund eine spätere Biopsie als Korrelationskandidat gesucht wird und von welchem Datum an das Zeitfenster läuft. Die klinische Uhr beginnt, wenn die Zellen entnommen werden; daher ist die Entnahme der Standard. Eine Biopsie passt, wenn sie innerhalb des Zeitfensters entnommen oder eingegangen ist. Legen Sie es für das Unternehmen, für jeden Rechtsraum und für jede Einrichtung fest; die spezifischste Einstellung gewinnt. Das chirurgische Gegenstück ist die [Biopsie–Resektat-Korrelation](#screen-biopsy_resection_correlation).

**4. Voraussetzungen und Abhängigkeiten.** Überschreibungen je Einrichtung verwenden die [Einrichtungskonfiguration](#screen-facility-dictionary).

Setup step: Tier 3, step 17
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: [Nachverfolgung](#screen-follow_up_tracking)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_histology_correlation - Zeitfenster für die zyto-histologische Korrelation mit Regeln je Rechtsraum und je Einrichtung]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unternehmensstandard: Zeitfenster (Tage) | Ganzzahl 1 bis 1825 | Pflicht | Fehler „Geben Sie eine ganze Zahl von Tagen zwischen 1 und 1825 ein.“ | 180 |
| Unternehmensstandard: Beginnt ab | Auswahl: Entnahmedatum, Eingangsdatum im Labor, Freigabe der Zytologie | Pflicht | Fehler „Wählen Sie das Datum, ab dem das Fenster beginnt.“ | Entnahmedatum |
| Speichern | Schaltfläche | Nicht zutreffend | | Nicht zutreffend |
| Nach Rechtsraum: + Regel für Rechtsraum hinzufügen | Auswahlliste der Rechtsräume (nur die ohne Regel), Zeitfenster (Tage), Beginnt ab; Speichern, Abbrechen, Entfernen | Optional | Die Liste zeigt „N Tage ab (Bezugsdatum)“. Ohne Regel: „Jeder Rechtsraum verwendet den Unternehmensstandard.“ | Keine |
| Abweichungen je Einrichtung: + Überschreibung für Einrichtung hinzufügen | Auswahlliste der Einrichtungen, Zeitfenster (Tage), Beginnt ab; Speichern, Abbrechen, Entfernen | Optional | Fehler „Wählen Sie eine Einrichtung.“ | Keine |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:cytology-histology-correlation:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Vertrag: `docs/architecture/CYTOLOGY_API.md` (`ICytologyHistologyCorrelationSettingsService`).

### Nachverfolgung {#screen-follow_up_tracking}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Nachverfolgung

**Status:** Teilweise

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Nachverfolgung

**3. Geschäftszweck und Geltungsbereich.** Legt fest, wann das Labor vor einer erwarteten Folgeprobe gewarnt wird, die nicht eingetroffen ist, und ob Mitarbeitende den anfordernden Arzt dazu per E-Mail anschreiben dürfen. Die Zeitfenster der Nachverfolgung selbst werden unter [Zytologie-Histologie-Korrelation](#screen-cytology_histology_correlation) und [Biopsie–Resektat-Korrelation](#screen-biopsy_resection_correlation) festgelegt. Eine E-Mail an Ärzte wird nie automatisch gesendet: Eine Person prüft jede einzelne und drückt Senden.

**4. Voraussetzungen und Abhängigkeiten.** Überschreibungen je Einrichtung verwenden die [Einrichtungskonfiguration](#screen-facility-dictionary). Ohne die Korrelationszeitfenster gibt es nichts, wovor gewarnt werden könnte.

Setup step: Tier 3, step 18
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary), [Biopsie–Resektat-Korrelation](#screen-biopsy_resection_correlation), [Zytologie-Histologie-Korrelation](#screen-cytology_histology_correlation)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-follow_up_tracking - Nachverfolgung mit der Karte des Unternehmens und Überschreibungen je Einrichtung]

**6. Feldreferenz.** Die Karte des Unternehmens und jede Überschreibung je Einrichtung verwenden dieselben vier Felder.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| So viele Tage vor Fälligkeit benachrichtigen | Ganzzahl 0 bis 365 | Pflicht | 0 warnt erst, wenn die Frist überschritten ist. Fehler „Geben Sie eine ganze Zahl von Tagen zwischen 0 und 365 ein.“ | 30 |
| Mitarbeitenden erlauben, den anfordernden Arzt anzuschreiben | Kontrollkästchen | Optional | Fügt die Aktion „Anfordernden Arzt anschreiben“ hinzu. | Aus |
| E-Mail-Betreff (leer = Standardtext) | Text bis zu 200 Zeichen | Optional | Standardtext: „Folgeprobe angefordert: {{accession}}“. | Leer |
| E-Mail-Text (leer = Standardtext) | Text bis zu 4.000 Zeichen | Optional | Nur diese Platzhalter werden gefüllt: accession, windowStart, dueDate, clinicianName, labName, senderName. Es gibt absichtlich keinen Platzhalter für den Patientennamen oder die Diagnose. Ein unbekannter Platzhalter wird abgelehnt. | Leer |
| Speichern | Schaltfläche | Nicht zutreffend | Deaktiviert, solange ein Wert ungültig ist. | Nicht zutreffend |
| Abweichungen je Einrichtung: Einrichtung, Überschreibung hinzufügen, Entfernen | Auswahlliste und Schaltflächen | Optional | Eine Überschreibung je Einrichtung erscheint in der Liste als „N Tage im Voraus warnen, E-Mail an Arzt ein/aus“. Jede Einrichtung ohne Überschreibung verwendet die Karte des Unternehmens. | Keine |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:follow-up-tracking:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Teilweise: Die Einstellungen werden von einem Dienst mit Browserspeicher gespeichert (`followUpSettings.ts`); der Server-Dienst für die Nachverfolgung liefert die Einstellungen mit seiner Liste, hat aber keinen Schreibzugriff darauf. Die Nachverfolgungswarteschlange steht in `docs/architecture/` unter der Qualitäts-API.

### Kritische intraoperative Befunde {#screen-intraop_critical_results}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Kritische intraoperative Befunde

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Kritische intraoperative Befunde

**3. Geschäftszweck und Geltungsbereich.** Ein Wörterbuch der Schnellschnittbefunde, die die operierende Chirurgin oder den operierenden Chirurgen direkt erreichen sollen. Eine Probe passt zu einem Eintrag über ihre vorläufige Kategorie oder über einen Begriff in ihrer Schnellschnittdiagnose (verneinte Formulierungen werden ignoriert). Ein Treffer markiert die mündliche Mitteilung als kritischen Befund, den die Pathologin oder der Pathologe bestätigt oder aufhebt. Einträge werden nie gelöscht; sie werden deaktiviert.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Die Kategorien sind die vier vorläufigen Kategorien der intraoperativen Arbeitsliste.

Setup step: Tier 3, step 19
Requires: Keine.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-intraop_critical_results - Wörterbuch der kritischen intraoperativen Befunde]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Eintragsliste | Name, Beschreibung, „Kategorien: ... Begriffe: ...“, Etikett Inaktiv | Nicht zutreffend | Vier Ausgangseinträge: Malignität im Schnellschnitt (Kategorie Maligne); Positiver oder knapper Resektionsrand (Begriffe); Atypisch oder malignitätsverdächtig (Kategorie Atypisch / Suspekt); Positiver Lymphknoten (Begriffe). | Nicht zutreffend |
| Inaktive Einträge anzeigen | Schalter | Optional | | Aus |
| + Eintrag hinzufügen, Bearbeiten, Deaktivieren / Reaktivieren | Schaltflächen | Nicht zutreffend | Das Fenster steht unten. Ohne die Berechtigung zeigt der Bildschirm „Sie können dieses Verzeichnis ansehen, aber nicht ändern.“ | Nicht zutreffend |

#### Fenster Kritischen Befund hinzufügen und Kritischen Befund bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Meldung „Einen Namen und mindestens einen Begriff oder eine Kategorie angeben.“, bis ein Name und ein Abgleichskriterium vorhanden sind. | Leer |
| Beschreibung | Text | Optional | | Leer |
| Begriffe | Text, einer je Zeile oder durch Kommas getrennt | Pflicht, wenn keine Kategorie | Wird als ganzes Wort in beliebiger Groß-/Kleinschreibung abgeglichen. | Leer |
| Passende vorläufige Kategorien | Kontrollkästchen: Benigne, Maligne, Atypisch / Suspekt, Zurückgestellt | Pflicht, wenn kein Begriff | | Keines markiert |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:intraop-critical-results:manage` (hohes Risiko, protokolliert; nur Admin, die Laborleitung hat sie standardmäßig nicht; im Dienst geprüft).
**Bekannte Grenzen.** Vertrag: `docs/architecture/INTRAOP_CRITICAL_RESULTS_API.md`. Dieser Bildschirm steht nicht in der Tabelle Abschnitt-zu-Berechtigung (`configSectionAccess.ts`), daher stützt er sich allein auf die Prüfung im Dienst; der Bildschirm öffnet sich für eine Person ohne die Berechtigung schreibgeschützt.

### OP-Suite-Terminals {#screen-or_suite_terminals}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > OP-Suite-Terminals

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** OP-Suite-Terminals

**3. Geschäftszweck und Geltungsbereich.** Registriert die Wand- oder Tischanzeige in jeder Operationssaal-Suite, die das Intraoperative Dashboard zeigt. Jedes Terminal ist an einen vorhandenen Standort gebunden, sodass zwei Einrichtungen jeweils einen „OP 1“ haben können, ohne dass die Namen kollidieren. Ein Terminal kann als berechtigt für die Mehrsaal-Übersicht gekennzeichnet werden (für eine verantwortliche Pflegekraft, eine Labor-Verbindungsperson oder eine umherziehende Springerin). Der Zugriff erfolgt über ein Display-Token (unten), nicht über die Anmeldung einer Person.

**4. Voraussetzungen und Abhängigkeiten.** Einrichtungen und ihre Standorte (die Raumliste) stammen aus der [Einrichtungskonfiguration](#screen-facility-dictionary) (die Standorte im Bearbeitungsfenster der Einrichtung). Die Auswahlliste Standort bleibt leer, bis eine Einrichtung gewählt ist.

Setup step: Tier 3, step 20
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-or_suite_terminals - Liste der OP-Suite-Terminals]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Terminalliste | Name, Standort, „Für mehrere Säle berechtigt“, Etikett Inaktiv | Nicht zutreffend | | Nicht zutreffend |
| + Terminal hinzufügen, Bearbeiten, Deaktivieren / Reaktivieren, Inaktive anzeigen | Schaltflächen und Schalter | Nicht zutreffend | | Inaktive anzeigen aus |
| Display-Token | Schaltfläche je Terminal | Nicht zutreffend | Öffnet das Fenster unten. | Nicht zutreffend |

#### Fenster OP-Suite-Terminal hinzufügen und OP-Suite-Terminal bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Terminal-/Stationsidentität | Text (Beispiel OR-Suite-04) | Pflicht | | Leer |
| Einrichtung | Auswahlliste | Pflicht | Die Auswahl lädt die Standorte dieser Einrichtung. | Keine |
| Standort (OP-Saal) | Auswahlliste der Standorte der Einrichtung | Pflicht | Das Terminal ist an diesen Standort gebunden. | Keiner |
| Kann Mehrsaal-Übersicht einsehen (verantwortliche Pflegekraft, Labor-Verbindungsperson, umherziehende Springerin) | Kontrollkästchen | Optional | | Aus |

#### Fenster Display-Token (gemeinsam mit den Anzeigeprofilen)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Token-Status | Text | Nicht zutreffend | „Kein Token ausgestellt. Dieses Display kann nicht gestartet werden.“, „Token mit Endung (Hinweis) ist gültig bis (Datum)“, „Token ist am (Datum) abgelaufen“ oder „Token wurde am (Datum) widerrufen“. | Nicht zutreffend |
| Gültig für | Auswahl: 30, 90, 180, 365, 730 Tage | Pflicht | Gültigkeitsdauer eines neuen Tokens. | 365 Tage |
| Token ausstellen / Neues Token ausstellen | Schaltfläche | Nicht zutreffend | Zeigt das neue Token einmal an („Neues Token – jetzt kopieren“; es wird nicht erneut angezeigt). Gespeichert wird nur ein Fingerabdruck. Das Ausstellen eines neuen Tokens beendet das alte sofort. | Nicht zutreffend |
| Widerrufen | Schaltfläche | Nicht zutreffend | Macht das Display innerhalb einer Minute leer. Deaktiviert, wenn bereits widerrufen. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:or-suite-terminals:manage`. Ein Token ausstellen oder widerrufen: dieselbe Berechtigung (hohes Risiko; Admin und Laborleitung). 
**Bekannte Grenzen.** Vertrag: `docs/architecture/DISPLAY_ACCESS_API.md` (Token-Aufrufe). Das Intraoperative Dashboard, das das Terminal anzeigt, ist ein Arbeitsplatzbildschirm außerhalb der Liste dieses Kapitels.

### Anzeigeprofile {#screen-display_profiles}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Anzeigeprofile (Facility-Ops-Dashboards)

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Anzeigeprofile (Titel auf dem Bildschirm: Anzeigeprofile (Facility-Ops-Dashboards))

**3. Geschäftszweck und Geltungsbereich.** Ein Register der Wandanzeigen, die das Facility-Ops-Dashboard zeigen. Jedes Profil bindet eine Anzeige an ein durchführendes Labor und an eine oder mehrere von fünf Abteilungsansichten und kann per Timer zwischen den Ansichten wechseln. Die Schaltfläche **Facility-Ops-Dashboard öffnen** öffnet die Dashboard-Seite. Eine physische Gerätebindung wird weder geprüft noch erzwungen: Das Gerätefeld ist eine Notiz. Der Zugriff auf eine Anzeige wird über ihr Display-Token gesteuert (siehe das Fenster unter [OP-Suite-Terminals](#screen-or_suite_terminals)).

**4. Voraussetzungen und Abhängigkeiten.** Die durchführenden Labore stammen aus der [Einrichtungskonfiguration](#screen-facility-dictionary).

Setup step: Tier 3, step 21
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-display_profiles - Liste der Anzeigeprofile mit der Schaltfläche Facility-Ops-Dashboard öffnen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Profilliste | Name, Labor, Ansichten, Intervall | Nicht zutreffend | | Nicht zutreffend |
| Facility-Ops-Dashboard öffnen | Schaltfläche | Nicht zutreffend | Öffnet `/facility-ops-dashboard`. | Nicht zutreffend |
| + Anzeigeprofil hinzufügen, Bearbeiten, Deaktivieren / Reaktivieren, Inaktive anzeigen | Schaltflächen und Schalter | Nicht zutreffend | | Inaktive anzeigen aus |
| Display-Token | Schaltfläche je Profil | Nicht zutreffend | Das Token-Fenster, das unter OP-Suite-Terminals beschrieben ist. | Nicht zutreffend |

#### Fenster Anzeigeprofil hinzufügen und Anzeigeprofil bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Anzeigename | Text (Beispiel „Histologie-Arbeitsplatz 3 - Wandanzeige“) | Pflicht | | Leer |
| Durchführendes Labor | Auswahlliste der aktiven durchführenden Labore | Pflicht | | Keines |
| Zugewiesene Dashboard-Ansicht(en) | Kontrollkästchen: Zuschnitt & Probeneingang; Einbettung & Mikrotomie; Färbung & IHC; Versand & Referenzlabor; Diagnostische Freigabe / Scanner | Pflicht (mindestens eine) | Mehr als eine Ansicht lässt das Profil wechseln. | Keine markiert |
| Karussell-Intervall (Sekunden) | Ganzzahl (Beispiel 20) | Optional | Zeit je Ansicht, wenn mehr als eine zugewiesen ist. | Leer |
| Gerätetoken / MAC / IP (optional) | Text | Optional | Nur eine Anlagennotiz; der Zugriff wird über das Display-Token gesteuert. | Leer |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren, ein Token ausstellen oder widerrufen: `config:display-profiles:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Vertrag: `docs/architecture/INTRAOP_OPS_API.md` und `DISPLAY_ACCESS_API.md`. Das Register enthält nur Daten: PathScribe prüft nicht, ob eine physische Anzeige zu einem Profil passt.

### QS-Konfigurationszentrum {#screen-qa_config_center}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > QS-Konfigurationszentrum

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** QS-Konfigurationszentrum

**3. Geschäftszweck und Geltungsbereich.** Legt die Qualitätssicherungsaktivitäten fest, die ein Labor durchführt. Eine Aktivität beruht auf einem von zwei Archetypen: **Überprüfung mit Ergebnis** (ein Fall wird geprüft und bewertet, zum Beispiel Korrelation Schnellschnitt gegenüber endgültigem Befund) oder **Aufsicht / Zuweisung** (eine Leistungserbringerin oder ein Leistungserbringer wird über eine Fallzahl oder einen Zeitraum beaufsichtigt, zum Beispiel FPPE). **Standard**-Aktivitäten werden von PathScribe für den Rechtsraum des Labors kuratiert; sie können nicht ausgeschaltet oder in benutzerdefinierte umgewandelt werden, und nur ihre Stichprobe, ihr CAPA-Auslöser und ähnliche Einstellungen können konfiguriert werden. **Benutzerdefinierte** Aktivitäten gehören dem Labor; der schnellere Weg ist, eine Standard- oder benutzerdefinierte Aktivität zu duplizieren, weil ihre Prüffelder fertig mitkommen. Nichts eröffnet automatisch eine CAPA: Ein Auslöser empfiehlt sie nur der QS-Leitung, die sie bestätigt oder verwirft.

Zu den Standard-Prüfaktivitäten gehören: Korrelation Schnellschnitt gegenüber endgültigem Befund, Zytologie-Histologie-Korrelation, Bestätigung auffälliger/kritischer Befunde, Zweitscreening der GYN-Zytologie, chirurgisches Peer-Review nach der Freigabe, chirurgische Korrelation Biopsie–Resektat, Peer-Review vor der Freigabe, klinisch-pathologische Korrelation und Korrelation externer Konsile. Die angezeigte Liste hängt vom Rechtsraum ab.

**4. Voraussetzungen und Abhängigkeiten.** Der CAPA-Auslöser nennt einen Mängeltyp aus den [Präparatmängeln](#screen-deficiencies). Der erwartete Fallmix verwendet die [Subspezialitäten](#screen-subspecialties).

Setup step: Tier 3, step 22
Requires: [Präparatmängel](#screen-deficiencies), [Subspezialitäten](#screen-subspecialties)
Unlocks: [TAT-Konfiguration](#screen-tab-tat), [Richtlinie für Diskrepanztrends](#screen-qa_trend_policy)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-qa_config_center - QS-Konfigurationszentrum mit den Reitern Standard und Benutzerdefiniert]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Reiter Standard, Benutzerdefiniert | Reiter | Nicht zutreffend | Standard zeigt nur die Aktivitäten, die für den Rechtsraum gelten (andernfalls „Für (Rechtsraum) gelten keine Standardaktivitäten“). | Standard |
| Aktivitätsliste | Name, Archetyp, Rechtsräume („Alle“ oder eine Liste), Stichprobe %, CAPA-Auslöser, Status, Aktionen | Nicht zutreffend | Der CAPA-Auslöser lautet „(Schweregrade) zu (Mangel)“ mit „(nur nach Freigabe)“. | Nicht zutreffend |
| Konfigurieren (Standard), Bearbeiten (benutzerdefiniert), Duplizieren, Deaktivieren / Reaktivieren | Zeilenschaltflächen | Nicht zutreffend | Deaktivieren wird für eine Standardaktivität abgelehnt. | Nicht zutreffend |
| + Benutzerdefinierte Aktivität hinzufügen | Schaltfläche, dann eine Auswahl | Nicht zutreffend | Wählen Sie **Neue Aktivität Überprüfung mit Ergebnis** oder **Neue Aktivität Aufsicht / Zuweisung** oder Abbrechen. Die Auswahl empfiehlt stattdessen das Duplizieren. | Nicht zutreffend |

#### Fenster Konfigurieren, Bearbeiten und Duplizieren

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Bei einer Standardaktivität nur lesbar. Ein Duplikat beginnt als „(Name) (Kopie)“. | Leer |
| Beschreibung | Text | Optional | Bei einer Standardaktivität nur lesbar. | Leer |
| Prüffelder | Feldeditor (Archetyp Überprüfung) | Pflicht (mindestens ein Feld) | Bei einer Standardaktivität und bei einem Duplikat nur lesbar („aus Duplikat – hier nur lesbar“). Jedes Feld hat eine Bezeichnung, einen Typ (Kurztext, Langtext, Zahl, Einfachauswahl, Mehrfachauswahl, Dropdown-Liste), einen Hinweis, Pflicht und Optionen für einen Auswahltyp; Felder können nach oben und unten verschoben werden. Ein gespeichertes Feld kann umbenannt oder optional gemacht, aber nicht entfernt oder in seinem Typ geändert werden, und eine gespeicherte Option kann nicht entfernt werden: Frühere Prüfungen behalten ihre Antworten. Neue Felder können jederzeit hinzugefügt werden. | Ein einzelnes Feld Notizen |
| Feedback zu Lehre und Einarbeitung erfassen | Kontrollkästchen (Archetyp Überprüfung) | Optional | Bei einer Standardaktivität deaktiviert. | Aus |
| Stichprobenprozentsatz | Zahl 0 bis 100 (Archetyp Überprüfung) | Optional | Anteil der berechtigten Fälle, die zufällig ausgewählt werden. Leer bedeutet keine automatische Stichprobe. | Leer |
| CAPA-Auslöser: eine CAPA empfehlen, wenn | Kontrollkästchen: niedrig, mittel, hoch (Schweregrad der Diskordanz) | Optional | Der Schweregrad der Diskordanz wird immer erfasst; dies entscheidet nur, ob eine CAPA empfohlen wird. | Keines |
| CAPA-Auslöser: Mängeltyp | Auswahlliste aus den Präparatmängeln oder „Kein Mängeltyp gewählt“ | Optional | Der Mangel, den die Empfehlung nennt. | Keiner |
| Nur für Begutachtungen nach Freigabe des Befunds | Kontrollkästchen | Optional | | Aus |
| Erwarteter Fallmix (optional) | Mindestanzahlen je Subspezialität (Archetyp Aufsicht) | Optional | „+ Subspezialitäts-Ziel hinzufügen…“ fügt eine Zeile mit **Mindestanzahl** und **Entfernen** hinzu. Leer zeigt nur die tatsächliche Abdeckung, ohne Erwartung. | Leer |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |
| Hinzufügen / Duplikat erstellen / Änderungen speichern, Abbrechen | Schaltflächen | Nicht zutreffend | | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:qa-types:manage` (hohes Risiko; Admin und Laborleitung; die Sperre der Standardaktivität wird zusätzlich im Dienst durchgesetzt).
**Bekannte Grenzen.** Vertrag: `docs/architecture/QUALITY_API.md`.

### Richtlinie für Diskrepanztrends {#screen-qa_trend_policy}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Richtlinie für Diskrepanztrends

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** QS-Trendrichtlinie (Titel auf dem Bildschirm: Richtlinie für Diskrepanztrends)

**3. Geschäftszweck und Geltungsbereich.** Legt fest, wann wiederholte schwerwiegende Diskordanzen der Laborleitung gemeldet werden, entweder für die begutachtete Arbeit einer Pathologin oder eines Pathologen oder für einen Probentyp, unabhängig davon, wer ihn befundet hat. Ein Muster ist eine Empfehlung: Es eröffnet nie eine CAPA. Die Richtlinie der Organisation gilt für jedes durchführende Labor, das keine eigene hat; Begutachtungen werden nach der Richtlinie des Labors beurteilt, das den Fall durchgeführt hat.

**4. Voraussetzungen und Abhängigkeiten.** Begutachtungen stammen aus den QS-Aktivitäten im [QS-Konfigurationszentrum](#screen-qa_config_center). Laborrichtlinien verwenden die durchführenden Labore der [Einrichtungskonfiguration](#screen-facility-dictionary).

Setup step: Tier 3, step 23
Requires: [QS-Konfigurationszentrum](#screen-qa_config_center), [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-qa_trend_policy - Richtlinie für Diskrepanztrends mit Richtlinie der Organisation und Richtlinien der durchführenden Labore]

**6. Feldreferenz.** Dieselben Felder stehen im Block der Organisation und in jedem durchführenden Labor, bei dem „(Labor) hat eine eigene Richtlinie“ markiert ist.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Die begutachtete Arbeit jeder Pathologin und jedes Pathologen beobachten | Kontrollkästchen | Optional | | Ein |
| Jede Präparatart beobachten (Prozesssignal) | Kontrollkästchen | Optional | | Ein |
| Zeitraum (Monate) | Ganzzahl 1 bis 36 | Pflicht | Wie weit zurück Begutachtungen gezählt werden. | 3 |
| Mindestbegutachtungen im Zeitraum | Ganzzahl, mindestens 1 | Pflicht | Darunter wird nichts beurteilt; das schützt Mitarbeitende mit geringem Volumen und in Teilzeit. | 20 |
| Als schwerwiegend geltende Schweregrade | Kontrollkästchen: niedrig, mittel, hoch | Pflicht (mindestens einer) | Der Schweregrad des Begutachtenden bei einer diskordanten Begutachtung. | hoch |
| Auslösende schwerwiegende Diskrepanzen | Ganzzahl | Pflicht | 0 schaltet diese Prüfung aus. | 3 |
| Auslösende Quote schwerwiegender Diskrepanzen (%) | Zahl 0 bis 100 | Pflicht | Bezogen auf die Begutachtungen im Zeitraum. 0 schaltet diese Prüfung aus. Sind beide Prüfungen auf 0, wird die Richtlinie abgelehnt („Legen Sie eine Anzahl oder eine Quote fest“). | 10 |
| Wenn eine Schwelle überschritten wird | Auswahl: Die Laborleitung um eine Entscheidung bitten, Nur in der Trendliste vermerken | Pflicht | Keine der beiden Auswahlen eröffnet eine CAPA. | Die Laborleitung um eine Entscheidung bitten |
| (Labor) hat eine eigene Richtlinie | Kontrollkästchen je durchführendem Labor | Optional | Das Markieren blendet dieselben Felder für dieses Labor ein. | Aus |
| Richtlinie speichern | Schaltfläche | Nicht zutreffend | Zeigt „Gespeichert“ oder den Grund, warum nicht gespeichert wurde. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:qa-trend-policy:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Vertrag: `docs/architecture/QUALITY_SETTINGS_API.md`.

### TAT-Konfiguration (Reiter) {#screen-tab-tat}
Breadcrumb: Startseite > Konfiguration > TAT-Konfiguration

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **TAT-Konfiguration** (öffnet sich für Personen, die `config:tat-targets:manage` haben; der Reiter ist durch ein Abschnitts-Gate geschützt).
**2. Wartungspunkt:** TAT-Konfiguration (Titel auf dem Bildschirm: TAT-Konfiguration)

**3. Geschäftszweck und Geltungsbereich.** Legt die Zielwerte der Durchlaufzeit je Typ, Dringlichkeit, Einrichtung, Probe und Subspezialität fest. Die spezifischste passende Regel gewinnt, wenn ein Fall gemessen wird. Ein Fall fällt auf einen eingebauten Systemstandard zurück, wenn keine benutzerdefinierte Regel passt. Die Zielwerte bestimmen die Marken pünktlich und verspätet in der Suche, in den Qualitäts-Dashboards und auf der intraoperativen Tafel (Warnzeit des Schnellschnitts).

**Auflösungsreihenfolge (die spezifischste zuerst):** Einrichtung + Probe + Dringlichkeit; Einrichtung + Probe; Einrichtung + Subspezialität + Dringlichkeit; Einrichtung + Subspezialität; nur Einrichtung; nur Probe; Systemstandard (Rückfall). Ein **Auflösungssimulator** zeigt, welche Regel für einen bestimmten Fall gewinnt.

**4. Voraussetzungen und Abhängigkeiten.** Die Auswahllisten für den Geltungsbereich stammen aus der [Einrichtungskonfiguration](#screen-facility-dictionary), dem [Präparatwörterbuch](#screen-specimens) und den [Subspezialitäten](#screen-subspecialties). QS-Aktivitäten erscheinen als zusätzliche TAT-Typen, sobald sie im [QS-Konfigurationszentrum](#screen-qa_config_center) vorhanden sind.

Setup step: Tier 3, step 24
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary), [Präparatwörterbuch](#screen-specimens), [Subspezialitäten](#screen-subspecialties), [QS-Konfigurationszentrum](#screen-qa_config_center)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-tat - TAT-Konfiguration mit Liste, Filtern, Hierarchie und Simulator]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Regelliste | Tabelle: Typ, Ziel, Dringlichkeit, Geltungsbereich, Notizen, Status, Aktionen | Nicht zutreffend | Regeln gruppiert als „Unternehmen (n)“ und nach durchführendem Labor. Eine Zeile zeigt das Ziel, die Dringlichkeit (STAT, Routine, Beliebig), den Geltungsbereich, „warnen bei N Min.“ für den Schnellschnitt und „Rolle: ...“ für Konsiltypen. | Nicht zutreffend |
| Typfilter | Auswahlliste: Alle Typen, jeder TAT-Typ, jede QS-Aktivität | Optional | | Alle Typen |
| Nach durchführendem Labor filtern, Nach anordnender Einrichtung filtern | Auswahllisten | Optional | | Alle |
| Inaktive anzeigen | Schalter | Optional | | Aus |
| + Regel hinzufügen, Bearbeiten, Duplizieren, Löschen | Schaltflächen | Nicht zutreffend | **Löschen** wird für einen Systemstandard abgelehnt; schalten Sie ihn stattdessen aus. **Duplizieren** beginnt eine neue Regel aus einer vorhandenen. | Nicht zutreffend |
| Simulator | Schaltfläche und Bereich | Nicht zutreffend | Siehe die Tabelle des Simulators unten. | Nicht zutreffend |

#### Fenster TAT-Regel hinzufügen und TAT-Regel bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| TAT-Typ | Auswahlliste in zwei Gruppen. Klinischer Arbeitsablauf: Erster Kontakt, Gesamtfall, Gefrierschnitt, Kalte Ischämie, Zuschnitt, Abzeichnung, Konsultation — Meine Antwort, Konsultation — Antwort ausstehend, Autopsie-PAD, Autopsie-FAD. QS-Aktivitäten: jede Aktivität aus dem QS-Konfigurationszentrum | Pflicht | Fehler „TAT-Typ ist erforderlich“. | Erster Kontakt |
| Zielstunden | Zahl, Schrittweite 0,25, mindestens 0,1 | Pflicht | Fehler „Zielstunden müssen größer als 0 sein“. Zeigt „= (formatiert)“. | Keine |
| Warnen, wenn so viele Minuten verbleiben | Ganzzahl in Minuten | Optional | Nur Schnellschnitt. Die intraoperative Tafel wird an diesem Punkt gelb. Muss über 0 und unter dem Ziel liegen. | 5 |
| Dringlichkeit | Auswahl: Beliebig (Routine + STAT), Nur Routine, Nur STAT | Optional | | Beliebig |
| Gilt für: Durchführendes Labor | Auswahlliste oder „Alle durchführenden Labore“ | Optional | | Alle |
| Gilt für: Anordnende Einrichtung | Auswahlliste oder „Alle anordnenden Einrichtungen“ | Optional | | Alle |
| Gilt für: Probentyp | Auswahlliste oder „Alle Probentypen“ | Optional | | Alle |
| Gilt für: Subspezialität | Auswahlliste oder „Alle Subspezialitäten“ | Optional | | Alle |
| Gilt für: Rolle | Auswahl: Alle Rollen, Assistenzarzt, Fellow, Pathologe, Extern | Optional | Wird von den Konsiltypen verwendet. | Alle |
| Admin-Notizen | Text | Optional | Keine Wirkung auf den Abgleich. | Leer |
| Status | Aktiv / Inaktiv | Optional | Eine aktive Regel mit derselben Kombination aus Typ und Dringlichkeit wird abgelehnt („Für diese Kombination existiert bereits eine aktive Regel“). | Aktiv |
| Regel hinzufügen / Änderungen speichern, Abbrechen | Schaltflächen | Nicht zutreffend | Eine Live-Zeile sagt, worauf die Regel zutrifft, oder „Dies ist ein Systemstandard – gilt für alle Fälle“. | Nicht zutreffend |

#### Auflösungssimulator

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Durchführendes Labor, Anordnende Einrichtung, Probe, Subspezialität | Auswahllisten („Keine bestimmte ...“) | Optional | Der zu testende Fall. | Keine |
| Dringlichkeit | Auswahl | Optional | | Routine |
| Ergebnis je Typ | Etikett für jeden Typ, die gewinnende Regel, „Systemstandard“ oder „benutzerdefinierte Regel“ oder „Keine passende Regel“ | Nicht zutreffend | | Nicht zutreffend |

Die eingebauten Standardwerte (IDs, die mit `sys-` beginnen, in Stunden): Erster Kontakt 4 Routine, 1 STAT; Gesamtfall 24 Routine, 4 STAT; Schnellschnitt 0,5 Routine, 0,33 STAT; Kalte Ischämie 1; Zuschnitt 4 Routine, 2 STAT; Abzeichnung 4 Routine, 2 STAT; Konsultationsantwort und Antwort ausstehend 24 (Assistenzarzt), 48 (Pathologe), 120 (Extern). Sie können bearbeitet und ausgeschaltet, aber nie gelöscht werden. Das Ausschalten eines Standardwerts entfernt ihn aus der Auflösungsreihenfolge; stellen Sie daher sicher, dass eine benutzerdefinierte Regel die Lücke abdeckt.

**7. Berechtigungen.** Reiter öffnen: `config:tat-targets:manage` über das Abschnitts-Gate (hohes Risiko; Admin und Laborleitung). 
**Bekannte Grenzen.** Vertrag: `docs/architecture/TAT_AND_DELEGATION_API.md`. Die eingebaute Liste wird auch vom API-Server angelegt.

### Leistungsziele {#screen-performance_targets}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Leistungsziele

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Leistungsziele

**3. Geschäftszweck und Geltungsbereich.** Die Zahlen, an denen jede Pathologin und jeder Pathologe gemessen wird. Eine Änderung wird sofort gespeichert. Das Produktivitäts-Dashboard misst Fälle und RVUs an diesen Zielen; dort werden nur die Ziele für monatliche Fälle und monatliche RVUs angezeigt, die übrigen werden für Berichte geführt.

**4. Voraussetzungen und Abhängigkeiten.** Keine.

Setup step: Tier 3, step 25
Requires: Keine.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-performance_targets - Tabelle der Leistungsziele mit Formular zum Hinzufügen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Ziel (Name) | Text | Beim Hinzufügen Pflicht | Fehler „Geben Sie dem Ziel einen Namen.“ Integrierte Zeilen tragen ein Etikett „Integriert“. | Nicht zutreffend |
| Wert | Zahl, größer als null | Pflicht | Fehler „Geben Sie einen Wert größer als null ein.“ Ein Prozentwert über 100 wird abgelehnt. | Siehe unten |
| Einheit | Auswahl: Fälle, RVUs, Prozent, Stunden | Pflicht | | Siehe unten |
| Zeitraum | Auswahl: Täglich, Wöchentlich, Monatlich, Vierteljährlich, Jährlich | Pflicht | | Siehe unten |
| Entfernen | Schaltfläche je Zeile | Nicht zutreffend | Integrierte Ziele können nicht entfernt werden. | Nicht zutreffend |
| Ein Ziel hinzufügen: Zielname, Wert, Einheit, Zeitraum, Ziel hinzufügen | Formular | Pflicht | Fehler „Ein Ziel mit diesem Namen existiert bereits.“ | Leer |

Die fünf Ausgangszeilen: Fälle pro Monat 120 Fälle monatlich (integriert); Routine-TAT 48 Stunden monatlich (integriert); STAT-TAT 4 Stunden monatlich (integriert); QK-Freigaberate 98 Prozent vierteljährlich (integriert); Monatliche RVUs 350 RVUs monatlich (nicht integriert).

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:tat-targets:manage` (dieselbe Berechtigung wie der Reiter TAT; hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Vertrag: `docs/architecture/CONFIG_DICTIONARIES_API.md`. Die Zeilen „Routine-TAT“ und „STAT-TAT“ sind hier getrennt von den Regeln zur Durchlaufzeit je Fall auf dem Reiter [TAT-Konfiguration](#screen-tab-tat); das Produkt verknüpft sie nicht.

### Zytologie-QK-Regeln {#screen-cytology_qc_rules}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Zytologie-QK-Regeln

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Zytologie-QK-Regeln (Titel auf dem Bildschirm: Zytologie-QS-Zuweisungsregeln)

**3. Geschäftszweck und Geltungsbereich.** Die automatischen Regeln, die Zytologiefälle für das Peer-Review der Qualitätskontrolle auswählen, zuweisen und weiterleiten. Eine Regel legt fest, welche Fälle sie abdeckt (Kriterien), wie viele davon ausgewählt werden (Stichprobenlogik), wie dringend die Prüfung ist (Prioritätsstufe und SLA) und wer prüfen darf. Die Regeln werden von der höchsten Auswertungspriorität abwärts ausgewertet. Regeln können nicht gelöscht werden; sie werden deaktiviert. Die daraus entstehende Arbeit ist die [Zytologie-QK-Warteschlange](#screen-cytology-qc-queue).

Die Demonstrationsdaten enthalten benannte Regeln für die USA (CLIA: gezieltes erneutes Screening von Pap-Abstrichen mit hohem Risiko, 100 Prozent), das Vereinigte Königreich (NHS / RCPath: schnelles erneutes Screening, 20 Prozent), die EU (ISO 15189: Peer-Review durch Pathologen, 2 Prozent) und ein zufälliges erneutes Screening negativer Freigaben durch Zytologieassistenten (10 Prozent).

**4. Voraussetzungen und Abhängigkeiten.** Es wird nichts erzwungen. Das Kriterium der durchführenden Einrichtung wird als Liste von Einrichtungs-IDs eingegeben (es ist keine Auswahlliste); entnehmen Sie die IDs der [Einrichtungskonfiguration](#screen-facility-dictionary). Die Zufallsauswahlquoten unter [Zufallsauswahlquoten der Zytologie-QK](#screen-cytology_qc_settings) sind von diesen Regeln getrennt.

Setup step: Tier 3, step 26
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary)
Unlocks: [Zytologie-QK-Warteschlange](#screen-cytology-qc-queue)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-cytology_qc_rules - Liste der Zytologie-QS-Zuweisungsregeln]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Regelliste | Name, „Priorität N“, Prioritätsstufe, Etikett Inaktiv | Nicht zutreffend | | Nicht zutreffend |
| + Regel hinzufügen, Bearbeiten, Duplizieren, Deaktivieren / Reaktivieren, Inaktive anzeigen | Schaltflächen und Schalter | Nicht zutreffend | **Duplizieren** benennt die Kopie „(Name) (Kopie)“. | Inaktive anzeigen aus |

#### Fenster QS-Regel hinzufügen und QS-Regel bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Regelname | Text | Pflicht | | Leer |
| Beschreibung | Text | Optional | | Leer |
| Auswertungspriorität (höhere wird zuerst ausgewertet) | Ganzzahl | Pflicht | | 50 |
| SLA (Stunden) | Zahl | Pflicht | Die Zeit, die für den Abschluss der Prüfung zur Verfügung steht. | 24 |
| Prioritätsstufe der Zweitbegutachtung | Auswahl: Priorität 1 - Hohe Eskalation, Priorität 2 - Gezielt, hohe Folgen, Priorität 3 - Routine, zufällig | Pflicht | | Priorität 3 - Routine, zufällig |
| Aktiv | Kontrollkästchen | Optional | | Ein |
| Stichprobenlogik | Auswahl: Prozentsatz, Intervall (jeder N-te Fall), Feste Menge (die ersten N Fälle) | Pflicht | Auf die Auswahl folgt ein Zahlenfeld: Rate %, Jeder N-te Fall, Die ersten N Fälle. | Prozentsatz, 10 Prozent |
| Rechtsordnungen | Kontrollkästchen der Länder | Optional | Lassen Sie alle unmarkiert, um die Regel in jedem Rechtsraum anzuwenden. | Keines markiert |
| IDs der durchführenden Einrichtungen | Durch Kommas getrennter Text | Optional | | Leer |
| Rolle der Leistungserbringer | Kontrollkästchen: Pathologe, Zytotechnologe | Optional | Gilt für Fälle, die von dieser Rolle befundet wurden. | Keines markiert |
| Einarbeitungsstatus | Kontrollkästchen: Neueinstellung, Probezeit | Optional | Gilt für Mitarbeitende in der Einarbeitung. | Keines markiert |
| Berechtigte Gutachterrollen | Durch Kommas getrennter Text | Optional | Wem die Prüfung zugewiesen werden darf. | Leer |
| Probenkategorie | Kontrollkästchen: GYN-Pap, Nicht-GYN-Flüssigkeit, Feinnadelaspiration (FNA) | Optional | | Keines markiert |
| Beurteilbarkeit | Kontrollkästchen: Ausreichend, Unzureichend, Eingeschränkt | Optional | | Keines markiert |
| Ergebnisfilter | Auswahl: Jedes Ergebnis, Nur negativ, Nur nicht-negativ | Optional | | Jedes Ergebnis |
| Hochrisiko-Kennzeichen | Durch Kommas getrennter Text | Optional | | Leer |
| Bethesda-Klassifikationen | Durch Kommas getrennter Text | Optional | | Leer |
| SNOMED-Konzeptcodes | Durch Kommas getrennter Text | Optional | | Leer |
| Speichern, Abbrechen | Schaltflächen | Nicht zutreffend | | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:cytology-qc-rules:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Vertrag: `docs/architecture/CYTOLOGY_QC_API.md`.

### Zufallsauswahlquoten der Zytologie-QK {#screen-cytology_qc_settings}
Breadcrumb: Startseite > Konfiguration > Zytologie > QC-Zufallsauswahlrate

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **Zytologie** > **QC-Zufallsauswahlrate**
**2. Wartungspunkt:** QC-Zufallsauswahlrate (Titel auf dem Bildschirm: Zufallsauswahlquoten der Zytologie-QK)

**3. Geschäftszweck und Geltungsbereich.** Zwei voneinander unabhängige Quoten: der Prozentsatz der negativen GYN-Ergebnisse und der Prozentsatz der nicht negativen GYN-Ergebnisse, die zufällig für den QK-Pool ausgewählt werden. Es gibt einen Unternehmensstandard sowie optionale Überschreibungen je Einrichtung und je Mitarbeiterin oder Mitarbeiter. Eine Überschreibung für Mitarbeitende hat Vorrang vor einer Überschreibung je Einrichtung, die wiederum Vorrang vor dem Unternehmensstandard hat. Verwenden Sie eine Überschreibung für Mitarbeitende, um für neue Beschäftigte oder Studierende eine höhere Quote festzulegen.

**4. Voraussetzungen und Abhängigkeiten.** Einrichtungen ([Einrichtungskonfiguration](#screen-facility-dictionary)) und Mitarbeitende ([Mitarbeiter](#screen-staff-members)) für die Überschreibungen.

Setup step: Tier 3, step 27
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary), [Mitarbeiter](#screen-staff-members)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_qc_settings - Zufallsauswahlquoten der QK mit Überschreibungen je Einrichtung und je Mitarbeitende]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unternehmensstandard: Negativ | Zahl 0 bis 100 (Prozent) | Pflicht | | 10 |
| Unternehmensstandard: Nicht negativ | Zahl 0 bis 100 (Prozent) | Pflicht | | 10 |
| Speichern | Schaltfläche | Nicht zutreffend | Zeigt „Nicht gespeicherte Änderung“, bis gespeichert ist. | Nicht zutreffend |
| Abweichungen je Einrichtung: + Überschreibung hinzufügen | Auswahlliste der Einrichtungen; Quoten für Negativ und Nicht negativ; Speichern, Abbrechen, Entfernen | Optional | Eine Überschreibung kann eine Quote leer lassen, um sie zu erben („(Wert) % (geerbt)“). Die Liste lautet „Neg x, Nicht-Neg y“. | Keine („Keine Abweichungen je Einrichtung.“) |
| Mitarbeiterüberschreibungen: + Überschreibung hinzufügen | Auswahlliste der Mitarbeitenden; Quoten für Negativ und Nicht negativ; Speichern, Abbrechen, Entfernen | Optional | Hat Vorrang vor jeder Überschreibung je Einrichtung. | Keine („Keine Mitarbeiterüberschreibungen.“) |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:cytology-qc-rates:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Vertrag: `docs/architecture/CYTOLOGY_API.md` (`ICytologyQcSettingsService`).

### Tageshöchstmenge der Zytologie {#screen-cytology_workload_cap}
Breadcrumb: Startseite > Konfiguration > Zytologie > Tägliche Arbeitslastgrenze

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **Zytologie** > **Tägliche Arbeitslastgrenze**
**2. Wartungspunkt:** Tägliche Arbeitslastgrenze (Titel auf dem Bildschirm: Tägliche Arbeitslastgrenze der Zytologie)

**3. Geschäftszweck und Geltungsbereich.** Die Höchstzahl der GYN-Zytologie-Objektträger, die ein Zytologieassistent an einem Tag durchmustern darf (die CLIA-Arbeitslastgrenze), mit denselben drei Ebenen wie die QK-Quoten: Unternehmensstandard, Überschreibungen je Einrichtung und Überschreibungen je Mitarbeiterin oder Mitarbeiter (Mitarbeitende haben Vorrang vor der Einrichtung). Sie legt außerdem fest, wann der Screening-Tag beginnt, für die Stundenabzeichnung am Tagesende und den Arbeitslastbericht. Die Grenze selbst wird über rollierende 24 Stunden geprüft und verwendet den Tagesbeginn nicht.

**4. Voraussetzungen und Abhängigkeiten.** Einrichtungen und Mitarbeitende für die Überschreibungen. Eine Zeitzone des Labors wird in den Systemeinstellungen festgelegt (außerhalb dieses Kapitels).

Setup step: Tier 3, step 28
Requires: [Einrichtungskonfiguration](#screen-facility-dictionary), [Mitarbeiter](#screen-staff-members)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_workload_cap - Tägliche Arbeitslastgrenze mit Tagesbeginn und Überschreibungen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unternehmensstandard (Objektträger / Tag) | Ganzzahl 1 bis 100 | Pflicht | Fehler „Die Grenze muss eine ganze Zahl von Präparaten zwischen 1 und 100 sein.“ | 100 |
| Speichern | Schaltfläche | Nicht zutreffend | Zeigt „Nicht gespeicherte Änderung“. | Nicht zutreffend |
| Der Screening-Tag beginnt um | Auswahlliste der Stunden | Pflicht | Standardmäßig Mitternacht; 6:00 Uhr hält eine Nachtschicht von 22 bis 6 Uhr auf einem Datum zusammen. Eine Änderung gilt ab jetzt; frühere Tage behalten den damals gültigen Beginn. Fehler „Sie haben keine Berechtigung, dies zu ändern.“ | Mitternacht |
| Abweichungen je Einrichtung: + Überschreibung hinzufügen | Auswahlliste der Einrichtungen, Tageslimit (1 bis 100); Speichern, Abbrechen, Entfernen | Optional | Wenn jede Einrichtung bereits eine hat: „Jede Einrichtung hat bereits eine Überschreibung. Entfernen Sie eine, um sie neu festzulegen.“ | Keine |
| Mitarbeiterüberschreibungen: + Überschreibung hinzufügen | Auswahlliste der Mitarbeitenden, Tageslimit (1 bis 100); Speichern, Abbrechen, Entfernen | Optional | Verwenden Sie für neue Beschäftigte oder Studierende eine niedrigere Grenze. | Keine |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:cytology-workload-cap:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Vertrag: `docs/architecture/CYTOLOGY_API.md` (`ICytologyWorkloadCapSettingsService`).

### Beitragseinstellungen {#screen-contribution_settings}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Beitragseinstellungen

**Status:** Teilweise

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Beitragseinstellungen (Titel auf dem Bildschirm: Einstellungen für das Beitrags-Dashboard)

**3. Geschäftszweck und Geltungsbereich.** Steuert, was Pathologinnen und Pathologen auf ihrer eigenen Seite **Mein Beitrag** sehen und in welcher Zeitzone die monatlichen und die Jahreskennzahlen bis heute (Fallzahlen und RVU) gruppiert werden. Administratoren, Pathologen-Administratoren und Superadministratoren sehen die Vergleichsdaten mit Kollegen und der Einrichtung immer; der Schalter für Kollegenvergleiche steuert nur die Sicht einer gewöhnlichen Pathologin oder eines gewöhnlichen Pathologen auf sich selbst im Vergleich zu anderen. Gespeichert wird immer in UTC; die Zeitzone entscheidet nur, wie ein freigegebener Fall einem Tag oder Monat zugeordnet wird (eine Freigabe um 23 Uhr zählt für denselben Tag).

**4. Voraussetzungen und Abhängigkeiten.** Keine.

Setup step: Tier 3, step 29
Requires: Keine.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-contribution_settings - Einstellungen für das Beitrags-Dashboard mit Zeitzone und Kollegenvergleich]

**6. Feldreferenz.** Jede Änderung wird sofort gespeichert und zeigt „Gespeichert“.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Zeitzone der Einrichtung | Auswahlliste: Eastern, Central, Mountain, Arizona (keine Sommerzeit), Pacific, Alaska, Hawaii (keine Sommerzeit) (alle USA), Britische Zeit, UTC | Pflicht | Eine Liste mit neun Einträgen; andere Zeitzonen können nicht gewählt werden. | Arizona-Zeit (USA, keine Sommerzeit) |
| Kollegendurchschnitte und Vergleiche mit Spitzenleistern für Pathologen anzeigen | Kontrollkästchen („Sichtbarkeit des Kollegenvergleichs“) | Optional | Aus: Pathologen sehen nur ihre eigenen Fallzahlen und den Fortschritt gegenüber den Zielen der Einrichtung. Ein: Anonymisierte Kollegendurchschnitte und Zahlen der Spitzenleister werden ebenfalls angezeigt. | Aus |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:contribution-settings:manage` (hohes Risiko; Admin und Laborleitung; beim Speichern der Änderung geprüft).
**Bekannte Grenzen.** Teilweise: Die Werte werden vom Systemkonfigurationsspeicher der Anwendung gehalten, der heute in den Browserspeicher schreibt. Eine Speicherung auf dem Server, damit jeder Arbeitsplatz dieselben Einstellungen sieht, ist geplant (PS-345, `systemConfigStore.ts`), und der Serververtrag für die Systemkonfiguration existiert in `docs/architecture/DICTIONARIES_CONFIG_API.md`. Bis dahin ist eine Einstellung, die an einem Computer vorgenommen wurde, an einem anderen nicht sichtbar. Die RVU-Erfassung je Fall über diesen Schalter hinaus ist nicht umgesetzt (sie wartet auf die rechtliche und Compliance-Prüfung).

### Feedback {#screen-feedback}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Feedback

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Feedback

**3. Geschäftszweck und Geltungsbereich.** Mit der Schaltfläche für QS-Feedback können Testende von jedem Bildschirm aus ein Problem melden, mit einem Screenshot und ohne Patientendaten. Dieser Bildschirm legt fest, wann die Schaltfläche erscheint und wer die Meldungen erhält. Standardmäßig ist die Schaltfläche in einer Produktivinstanz ausgeblendet und in einer Validierungsinstanz sichtbar.

**4. Voraussetzungen und Abhängigkeiten.** Keine.

Setup step: Tier 3, step 30
Requires: Keine.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-feedback - Feedback-Einstellungen mit den drei Modi und den Empfängerlisten]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| QA-Feedback-Schaltfläche | Auswahl (Optionsfelder): Standard für diese Instanz, Immer angezeigt, Immer ausgeblendet | Pflicht | Eine Zeile sagt, ob dies eine Produktiv- oder eine Validierungsinstanz ist und was der Standard ist. Fehler „Wählen Sie, wann die Schaltfläche erscheint.“ | Standard für diese Instanz |
| QA-Empfänger | E-Mail-Adressen, durch Kommas getrennt | Pflicht, sobald die Schaltfläche erscheint | Fehler „Fügen Sie mindestens einen Empfänger hinzu: Die Schaltfläche erscheint in dieser Instanz, und das Feedback hätte kein Ziel.“ Eine ungültige Adresse wird abgelehnt. | Leer |
| Kopie an Administrator (CC) | E-Mail-Adressen, durch Kommas getrennt | Optional | | Leer |
| Speichern | Schaltfläche | Nicht zutreffend | Zeigt „Gespeichert“ oder den Grund. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:feedback:manage` (hohes Risiko; Admin und Laborleitung; die Schaltfläche Speichern ist berechtigungsgesteuert).
**Bekannte Grenzen.** Vertrag: `docs/architecture/CONFIG_DICTIONARIES_API.md`.

### Forschungs-Feed {#screen-research_feed}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Forschungs-Feed

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Forschungs-Feed

**3. Geschäftszweck und Geltungsbereich.** Die Literaturschlagzeile auf dem Dashboard der Startseite. Die Artikel stammen direkt aus NCBI PubMed, nach Veröffentlichungsdatum sortiert. Es ist ein automatischer Feed, keine kuratierte oder geprüfte Auswahl, und er darf Ärzten nie als Leitlinie präsentiert werden. Der Feed wird vom Browser der Person direkt bei NCBI abgerufen; ein fehlschlagender Feed zeigt nichts an und hält das Dashboard nie auf.

**4. Voraussetzungen und Abhängigkeiten.** Der Browser des Arbeitsplatzes muss NCBI erreichen können.

Setup step: Tier 3, step 31
Requires: Keine.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-research_feed - Einstellungen des Forschungs-Feeds mit Abrufstatus]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Letzter erfolgreicher Abruf; Letzter Versuch | Anzeige | Nicht zutreffend | Zeigt „Nie“ vor dem ersten Erfolg. | Nicht zutreffend |
| Feed auf dem Dashboard anzeigen | Kontrollkästchen | Optional | | Ein |
| Suchanfrage | Text (PubMed-Syntax) | Pflicht | Fehler „Die Suchanfrage darf nicht leer sein.“ Die Ausschlüsse für zurückgezogene Veröffentlichungen, Preprints, Editorials, Kommentare und Leserbriefe sind der einzige Qualitätsfilter des Feeds; ihre Entfernung kann eine zurückgezogene Arbeit sichtbar machen. | digital pathology OR synoptic reporting, Englisch, ohne zurückgezogene Arbeiten, Preprints, Editorials, Kommentare und Leserbriefe |
| Artikel-URL | https-Adresse mit `{PMID}` | Pflicht | Muss `{PMID}` enthalten und https auf einem zugelassenen Host sein (nih.gov, nlm.nih.gov, doi.org). | https://pubmed.ncbi.nlm.nih.gov/{PMID}/ |
| API-Endpunkt | https-Adresse | Pflicht | Basis-URL von NCBI eUtils, ohne abschließenden Schrägstrich, nur zugelassener Host. Ändern Sie sie nur, wenn NCBI den Dienst verlegt. | https://eutils.ncbi.nlm.nih.gov/entrez/eutils |
| Standardwerte wiederherstellen, Speichern | Schaltflächen | Nicht zutreffend | Nach dem Speichern: „Vorhandene zwischengespeicherte Artikel werden innerhalb von 24 Stunden aktualisiert.“ | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:research-feed:manage` (hohes Risiko; Admin und Laborleitung).
**Bekannte Grenzen.** Vertrag: `docs/architecture/REFERRAL_RESEARCH_API.md` (die Einstellungen). Der Artikelabruf selbst ist ein Browseraufruf bei NCBI, ohne dazwischenliegenden PathScribe-Server.

## Seiten für den Tagesbetrieb, die diese Einstellungen steuern {#ch4-reference-pages}
Breadcrumb: Startseite

Diese fünf Seiten sind Arbeitsplatz- oder Warteschlangenseiten, keine Wartungsbildschirme. Sie werden beschrieben, damit eine Administratorin oder ein Administrator weiß, was jede zeigt, wer sie öffnen kann und welche Einstellung sie ändert. Keine davon gehört zur Einrichtung.

### Startseite {#screen-home}
Breadcrumb: Startseite

**Status:** Umgesetzt

**1. Navigation:** Die Seite, die nach der Anmeldung angezeigt wird (`/`).
**2. Wartungspunkt:** Nicht zutreffend. Dies ist eine Startseite.

**3. Geschäftszweck und Geltungsbereich.** Eine Reihe von Kacheln, eine je Ziel, das die angemeldete Person aufrufen darf. Eine Kachel erscheint nur, wenn mindestens einer der Bildschirme, zu denen sie führt, einer der Rollen der Person gewährt ist. Eine Person ohne Bildschirm sieht „Keine Ihrer Rollen gibt Ihnen bisher Zugriff auf einen Bildschirm. Bitten Sie Ihre Administration, Ihnen einen zuzuweisen.“ Eine Fußzeile zeigt den Urheberrechtsvermerk und den tatsächlichen Systemstatus: einen farbigen Punkt mit „Wird geprüft“, danach „Betriebsbereit“, „Eingeschränkt“ oder „Nicht verfügbar“, oder „Status nicht verfügbar“, wenn die Prüfung selbst fehlschlägt. Der Status stammt aus der Zustandsprüfung des API-Servers (`GET /api/health/health-status/check`), die beim Öffnen der Startseite und erneut erfolgt, wenn der Tab nach fünf Minuten wieder sichtbar wird (nie per Zeitgeber). Sie meldet vier feste Komponenten (Datenbank, Nachrichtenübermittlung, Warteschlangen, Schnittstellen-Engine) ohne Patientendaten, und der Server legt den Gesamtstatus fest. In der Demo gibt es keinen Server, daher ist der Status als simuliert gekennzeichnet. Die Fußzeile macht keine Konformitätsaussage.

**4. Voraussetzungen und Abhängigkeiten.** Der Zugriff wird durch die Rolle und die Berechtigung festgelegt, die in Kapitel 2 (Mitarbeiterrollen) eingerichtet werden, sowie durch die Berechtigungs-Seeds. Es gibt keine eigene Kacheleinstellung.

Setup step: Reference, not part of setup
Requires: [Rollenverzeichnis](#screen-staff-roles)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-home - Startseite mit den Kacheln für eine Rolle]

**6. Spalten, Filter und Schaltflächen.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Willkommen zurück, (Name) | Text | Nicht zutreffend | | Nicht zutreffend |
| Akzession | Kachel | Nicht zutreffend | Öffnet den Probeneingang. Erfordert `screen:accession:open` (PA, Probeneingang). | Nicht zutreffend |
| Arbeitsliste | Kachel | Nicht zutreffend | Öffnet die Arbeitsliste sowie die Ansichten Zytologie-QK und Chirurgische QS. Wird angezeigt, wenn eine der Berechtigungen `screen:worklist:open`, `screen:cytology-qc-queue:open`, `screen:surgical-qa-worklist:open` vorliegt. | Nicht zutreffend |
| Suche | Kachel | Nicht zutreffend | `screen:search:open`. | Nicht zutreffend |
| Intraoperative Warteschlange | Kachel | Nicht zutreffend | `screen:intraop-queue:open` (Pathologe, Fellow, Assistenzarzt, PA). | Nicht zutreffend |
| Lockbox-Einwurf | Kachel | Nicht zutreffend | `screen:lockbox-drop-off:open` (Probeneingang, Admin). | Nicht zutreffend |
| Mein Beitrag | Kachel | Nicht zutreffend | `screen:my-contributions:open` (Pathologe, Fellow, Assistenzarzt, PA, Laborleitung). | Nicht zutreffend |
| Laborbeiträge | Kachel | Nicht zutreffend | `screen:bench-contributions:open` (Probeneingang und die Technologenrollen). | Nicht zutreffend |
| Pathologie-Arbeitsbereich | Hub-Kachel | Nicht zutreffend | Führt zu Zytologie-Arbeitsbereich, Mikrotomie, Einbettung, Objektträgerverteilung, Molekular, Chargenverwaltung und Randausnahmen-Überprüfung. Wird angezeigt, wenn eines davon gewährt ist. | Nicht zutreffend |
| Qualität & Compliance | Hub-Kachel | Nicht zutreffend | Führt zu Prüfprotokoll, Qualitätssicherung, Registerausnahmen, Autopsie-Dashboards und der Ausgangswarteschlange. Eine Markierung zeigt, wie viele Registermeldungen eine Person benötigen. | Nicht zutreffend |
| Tumorboard/MDT | Kachel | Nicht zutreffend | `screen:tumor-board:open` (Pathologe, Fellow, Assistenzarzt, PA). | Nicht zutreffend |
| Konfiguration | Kachel | Nicht zutreffend | `screen:configuration:open` (Admin, Vorlagenautor, Vorlagenfreigeber, Laborleitung). | Nicht zutreffend |

**7. Berechtigungen.** Jede Kachel hat die oben genannte Bildschirmberechtigung; für die Startseite selbst gibt es keine Berechtigung. Jede angemeldete Person erreicht die Startseite.
**Bekannte Grenzen.** Zusatzaufträge und die QS-Ansichten nach der Freigabe sind keine Kacheln: Sie sind eine Aktion an einem Fall und Ansichten innerhalb der Arbeitsliste. Facility-Ops-Dashboards stehen nicht auf der Startseite.

### Lockbox-Einwurf {#screen-lockbox-drop-off}
Breadcrumb: Startseite > Lockbox-Einwurf

**Status:** Umgesetzt

**1. Navigation:** Startseite > **Lockbox-Einwurf** (`/lockbox-drop-off`).
**2. Wartungspunkt:** Nicht zutreffend. Dies ist ein Arbeitsplatzbildschirm.

**3. Geschäftszweck und Geltungsbereich.** Ein Kiosk für Proben, die nach Dienstschluss in der Lockbox abgelegt werden. Die Person scannt jeden Behälter; PathScribe schreibt einen unveränderlichen Beleg „In der Lockbox empfangen“, mit einem Platzhalter, wenn kein Auftrag passt. Das Frühteam arbeitet aus dem **Nachtordner**, bis jeder Beleg mit einer Eingangsnummer versehen ist. Er hat zwei Reiter: **Einwurf** und **Nachtordner**.

**4. Voraussetzungen und Abhängigkeiten.** Die Listen der einsendenden Kunden und Ärzte im Formular für den Platzhalter stammen aus [Clients](#screen-clients) und [Ärzte](#screen-physicians). Ein Barcode passt zu einem Auftrag, wenn ein Auftrag mit ihm existiert; ohne einen wird ein Platzhalter geführt, und es wird keine Eingangsnummer erzeugt.

Setup step: Reference, not part of setup
Requires: [Clients](#screen-clients), [Ärzte](#screen-physicians)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-lockbox-drop-off - Lockbox-Einwurf mit Scanfeld und Nachtordner]

**6. Spalten, Filter und Schaltflächen.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Barcode des Behälters scannen | Scannereingabe, dann Eingabetaste | Pflicht | Nichts weiter muss bestätigt werden. Ein Barcode, der schon einmal empfangen wurde, zeigt den früheren Beleg und erzeugt keinen neuen. | Leer |
| Dringend | Umschalter | Optional | Markiert den Beleg „Dringend, hohe Priorität“. | Aus |
| Rückrufnummer (optional) | Text | Optional | Wird angezeigt, wenn Dringend gesetzt ist. | Leer |
| Belegkarte | Einsendende Einrichtung („Nicht erfasst“, falls keine), Einsendender Arzt, Empfangen, Empfangen von, Rückrufnummer | Nicht zutreffend | Endet mit „Nächsten Behälter scannen.“ | Nicht zutreffend |
| Formular für den Platzhalter („Kein offener Auftrag für diesen Barcode“) | Barcode; Einsendender Kunde (oder „Nicht in der Liste oder unbekannt“ plus ein Freitext-Kunde); Einsendender Arzt; Zeitpunkt des Einwurfs | Optional (jedes Feld) | Der Zeitpunkt des Einwurfs beginnt mit der aktuellen Zeit; ändern Sie ihn nur, wenn der Einwurf früher erfolgte. **Einwurf erfassen** speichert; **Abbrechen** verwirft. | Aktuelle Zeit |
| Nachtordner: Aktualisieren | Schaltfläche | Nicht zutreffend | | Nicht zutreffend |
| Zusammenfassung Zeit bis zum Eingang (QS) | Aktuell wartend, Längste Wartezeit, Eingegangen, Median, Mittelwert, Längste, Median bei dringenden | Nicht zutreffend | Vom Einwurf in die Lockbox bis zum Probeneingang. „Noch keine Daten“, wenn leer. | Nicht zutreffend |
| Tabelle des Nachtordners | Spalten: Eingangsnummer oder Platzhalter, Priorität, Einsendende Einrichtung, Empfangen, Empfangen von, Wartezeit, Status, Aktionen | Nicht zutreffend | Status: Auftrag zugeordnet, Platzhalter nicht verknüpft, Platzhalter mit einem Auftrag verknüpft. Leer: „Nichts wartet.“ | Nicht zutreffend |
| Mit Auftrag verknüpfen | Schaltfläche, dann Echte Auftrags- oder Eingangsnummer und **Verknüpfen** / **Abbrechen** | Zum Verknüpfen erforderlich | Erfordert `lockbox:placeholder:resolve`. | Nicht zutreffend |
| Als eingegangen markieren | Schaltfläche | Nicht zutreffend | Erfordert `lockbox:folder:review`. | Nicht zutreffend |
| Probeneingang öffnen | Schaltfläche | Nicht zutreffend | Öffnet den Probeneingang für den Beleg. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:lockbox-drop-off:open` (Probeneingang und Admin; Standardrisiko; das Öffnen wird nicht protokolliert). Einen Beleg scannen und erfassen: `lockbox:specimen:receive` (hohes Risiko, protokolliert; Probeneingang). Nachtordner, Zusammenfassung und Als eingegangen markieren: `lockbox:folder:review` (Probeneingang und Admin zur Aufsicht). Einen Platzhalter verknüpfen: `lockbox:placeholder:resolve` (Probeneingang).
**Bekannte Grenzen.** Vertrag: `docs/architecture/LOCKBOX_API.md`. Belege enthalten keine Patientendaten. In der Demonstration beginnt der Ordner mit sechs vorbelegten Belegen (zwei dringend, einer bereits akzessioniert); **Vollständiges Zurücksetzen** unter **Demo-Zurücksetzung** entfernt alles, was auf dem Bildschirm getan wurde, und lädt einen neuen Satz.

### Qualitätssicherung {#screen-quality-assurance}
Breadcrumb: Startseite > Qualität & Compliance > Qualitätssicherung

**Status:** Umgesetzt

**1. Navigation:** Startseite > **Qualität & Compliance** > **Qualitätssicherung** (`/quality-assurance`; ein Pfeiler kann in der Adresse benannt werden, `?pillar=`).
**2. Wartungspunkt:** Nicht zutreffend. Dies ist eine Arbeitswarteschlange.

**3. Geschäftszweck und Geltungsbereich.** Die Arbeitswarteschlange der Qualität. Sie ist in acht „Pfeiler“ gegliedert. **Operations** verfolgt Nichtkonformitäten und klinische Qualitätskennzahlen. **Finanzen** verfolgt Abrechnungs- und Codierungsmängel, die bei der Freigabe erhoben werden. Die **CAPA-Engine** steuert den Lebenszyklus der Korrekturmaßnahmen: Eine Korrektur schließt sich nicht von selbst, sie wird hier eskaliert, bis jemand bestätigt, dass sie gewirkt hat, mit regelmäßiger Managementbewertung. **Zytologie-QA** und **QA-Dashboard** berichten über die Prüfaktivität, der **Inspektionsmodus** bündelt sie als Auditnachweis, die **Unternehmensweite Zusammenfassung** ist eine laborübergreifende Zusammenfassung, und **Aktivitäten** listet die im [QS-Konfigurationszentrum](#screen-qa_config_center) definierten QS-Aktivitäten auf.

**4. Voraussetzungen und Abhängigkeiten.** Mängeltypen stammen aus den [Präparatmängeln](#screen-deficiencies); Aktivitäten und CAPA-Auslöser aus dem [QS-Konfigurationszentrum](#screen-qa_config_center); Muster aus der [Richtlinie für Diskrepanztrends](#screen-qa_trend_policy); überfällige Nachuntersuchungen aus der [Nachverfolgung](#screen-follow_up_tracking).

Setup step: Reference, not part of setup
Requires: [QS-Konfigurationszentrum](#screen-qa_config_center), [Richtlinie für Diskrepanztrends](#screen-qa_trend_policy), [Präparatmängel](#screen-deficiencies)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-quality-assurance - Qualitätssicherung mit Pfeilerreitern und Kacheln]

**6. Spalten, Filter und Schaltflächen.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Pfeilerreiter | Operations, Finanzen, CAPA-Engine, Zytologie-QA, Unternehmensweite Zusammenfassung, QA-Dashboard, Inspektionsmodus, Aktivitäten | Nicht zutreffend | | Operations |
| Kacheln von Operations | Mängel (mit „N überfällig“), Nachverfolgung nicht eingegangen, Verknüpfung Schnellschnitt, Diskrepanz, Gegenzeichnungsdauer, Qualifikationsprüfung, Drift nach Endbefund, Patientenabgleich-Überprüfung, Patientenverwaltung, Zugriffsanfragen, KI-Diskordanz | Nicht zutreffend | Jede öffnet ihre Liste. Mängel sind in Fallebene und Probenebene aufgeteilt. | Mängel |
| Aktionen von Operations | Abweichung melden, An CAPA eskalieren, Sofortige Eindämmung, Wirksamkeit verifizieren, Managementbewertung starten | Nicht zutreffend | **Abweichung melden**: Fall-ID (Nachschlagen), optional Probe, Abweichungstyp, „Was beobachtet wurde“. **An CAPA eskalieren**: Lösungstyp, Korrekturmaßnahme, Grundursache, Vorbeugende Maßnahme (optional), Fälligkeit der Wirksamkeitsprüfung; der Eintrag wechselt zu Verifizierung ausstehend, nicht zu Geschlossen. **Sofortige Eindämmung**: „Was getan wurde“; schließt sofort, ohne Grundursache oder spätere Prüfung. **Wirksamkeit verifizieren**: „Hat die Korrekturmaßnahme tatsächlich gewirkt?“ mit Wirksam - Schließen oder Wieder aufgetreten - Wiedereröffnen. | Nicht zutreffend |
| Kacheln der CAPA-Engine | Empfohlen, Diskrepanzmuster, An CAPA eskaliert, Geschlossen, Managementbewertungen | Nicht zutreffend | **Empfohlen**: CAPA-Empfehlungen aus QS-Aktivitäten (Verantwortlicher angezeigt), die eine QS-Leitung bestätigt oder verwirft. **Diskrepanzmuster**: wird nur Inhabern von `qa:pathologist-trend:view` angezeigt. Ein wieder aufgetretener Eintrag zeigt „Nach fehlgeschlagener Wirksamkeitsprüfung wiedereröffnet“. | Empfohlen |
| Kacheln von Finanzen | Abrechnungsmängel, Gelöst, Pool zur Codeprüfung, Leistungen in Genehmigung, Fehlgeschlagene Zustellungen („in der Konfiguration“) | Nicht zutreffend | **Abrechnungsabweichung lösen**: Lösungsgrund, dann **Weiter zur Korrektur**. **Pool zur Codeprüfung**: Prüfen mit Prüfergebnis (Kein Problem gefunden oder Abrechnungsmangel melden), der Leistung und Prüfernotizen. **Korrektur starten** öffnet die Abrechnungskorrektur. Fehlgeschlagene Zustellungen öffnet die Ausgangswarteschlange in der Konfiguration. | Abrechnungsmängel |
| Exportieren | Schaltfläche in Listen | Nicht zutreffend | Jede Liste hat eine eigene Berechtigung für den Export. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:quality-assurance:open` (Admin, Laborleitung, QS-Prüfer). Eine Managementbewertung einreichen: `qa:management-review:submit` (hohes Risiko, benötigt den Bildschirm Qualitätssicherung; wird mit den anderen Aktionen zu Qualitätsmängeln vergeben; Batch 659). Eine Änderung, die mit „nicht gespeichert“ zurückkommt, lässt das Fenster nun mit dem Eingegebenen geöffnet. CAPA-Empfehlungen entscheiden: `qa:capa-recommendation:decide` (Admin, Laborleitung, QS-Prüfer). Diskrepanzmuster einsehen und entscheiden: `qa:pathologist-trend:view` und `qa:pathologist-trend:decide` (standardmäßig nur Laborleitung). Eine Nachuntersuchung erfassen: `qa:follow-up:record` (Admin, Laborleitung, QS-Prüfer). Exporte: eine Berechtigung je Liste (`qa:deficiencies:export`, `qa:management-reviews:export`, `qa:billing-deficiencies:export`, `qa:inspection-evidence:export` und weitere; alle hohes Risiko; Admin und QS-Prüfer haben die meisten). Abrechnung korrigieren: `billing:applied-code:correct`.
**Bekannte Grenzen.** „Audits von Kostenträgern und Vorabgenehmigungen“ sind nicht umgesetzt (es gibt keine Erkennung), daher hat Finanzen keinen solchen Reiter. Eine CAPA wird nie automatisch eröffnet: Jede Empfehlung wartet auf eine Person. Vertrag: `docs/architecture/QUALITY_API.md`.

### Randausnahmen-Überprüfung {#screen-margin-exception-review}
Breadcrumb: Startseite > Pathologie-Arbeitsbereich > Randausnahmen-Überprüfung

**Status:** Umgesetzt

**1. Navigation:** Startseite > **Pathologie-Arbeitsbereich** > **Randausnahmen-Überprüfung** (`/margin-exception-review`).
**2. Wartungspunkt:** Nicht zutreffend. Dies ist eine Arbeitswarteschlange.

**3. Geschäftszweck und Geltungsbereich.** Listet Angaben zum Randabstand in Freitext auf, die PathScribe nicht sicher in eine Zahl umwandeln konnte, damit eine Person den tatsächlichen Abstand erfassen oder den Eintrag mit einem Grund verwerfen kann.

**4. Voraussetzungen und Abhängigkeiten.** Die Einträge stammen aus synoptischen Befunden (Kapitel 6), deren Randfeld Freitext ist.

Setup step: Reference, not part of setup
Requires: Keine.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-margin-exception-review - Liste der Randausnahmen-Überprüfung]

**6. Spalten, Filter und Schaltflächen.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Zeile | Patientenname und Eingangsnummer; Feldbezeichnung; der Rohtext; der Grund | Nicht zutreffend | Gründe: Noch keine Angabe gemacht; Keine Zahl im Text gefunden; Eine Zahl wurde gefunden, aber von Text umgeben, dem dieser Parser nicht traut. | Nicht zutreffend |
| Randabstand (mm) | Zahl, 0 oder mehr, Schrittweite 0,1 | Zum Auflösen erforderlich | Fehler „Geben Sie einen Randabstand von 0 oder mehr ein.“ | Leer |
| Auflösen | Schaltfläche | Nicht zutreffend | Speichert den erfassten Abstand. Erfordert `case:margin-exception:resolve`. | Nicht zutreffend |
| Verwerfen | Schaltfläche, dann ein Fenster mit **Warum dieses Feld keine Distanz angeben kann** | Grund erforderlich | **Verwerfen** oder Abbrechen. Die Person und der Grund werden erfasst. | Nicht zutreffend |
| Fall öffnen | Schaltfläche | Nicht zutreffend | Öffnet den Befund und kehrt hierher zurück. | Nicht zutreffend |
| Leere Liste | Text | Nicht zutreffend | „Keine offenen Randabstand-Ausnahmen.“ | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:margin-exception-review:open` (Pathologe, Fellow, Assistenzarzt, PA). Auflösen oder verwerfen: `case:margin-exception:resolve` (hohes Risiko; dieselben Rollen).
**Bekannte Grenzen.** Kein Konfigurationsbildschirm stellt den Parser ein; die Regel liegt im Produkt.

### Zytologie-QK-Warteschlange {#screen-cytology-qc-queue}
Breadcrumb: Startseite > Arbeitsliste > Zytologie-QC

**Status:** Umgesetzt

**1. Navigation:** Startseite > **Arbeitsliste**, Ansicht **Zytologie-QC** (`/cytology-qc-queue` leitet auf die Ansicht der Arbeitsliste weiter). Titel: Zytologie-QS-Zweitbegutachtungswarteschlange.
**2. Wartungspunkt:** Nicht zutreffend. Dies ist eine Arbeitswarteschlange.

**3. Geschäftszweck und Geltungsbereich.** Die Prüfarbeit, die von den [Zytologie-QK-Regeln](#screen-cytology_qc_rules) und den [Zufallsauswahlquoten der QK](#screen-cytology_qc_settings) erzeugt wird. Jeder Eintrag ist ein für das Peer-Review ausgewählter Fall mit einer Frist aus der SLA seiner Regel. Zwei Ansichten: **Warteschlange** und **Compliance**.

**4. Voraussetzungen und Abhängigkeiten.** Ohne QK-Regeln wird nichts ausgewählt. Der Gutachterpool für einen Eintrag stammt aus den berechtigten Gutachterrollen der Regel.

Setup step: Reference, not part of setup
Requires: [Zytologie-QK-Regeln](#screen-cytology_qc_rules)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-cytology-qc-queue - Zytologie-QS-Zweitbegutachtungswarteschlange]

**6. Spalten, Filter und Schaltflächen.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Warteschlange / Compliance | Reiter | Nicht zutreffend | Compliance zeigt den Bereich zur QK-Compliance. | Warteschlange |
| Alle Einträge, Eskalationen & Diskrepanzen, Routine & Zufall | Reiter | Nicht zutreffend | Filtert die Warteschlange. | Alle Einträge |
| Zeile | Fall, Regelname, Prioritätsstufe, SLA-Status, „Ausgewählt durch (Gründe)“, „Gutachterpool (Rollen)“ | Nicht zutreffend | SLA-Status: Im Zeitplan, SLA nähert sich, SLA überschritten. | Nicht zutreffend |
| Fall öffnen | Schaltfläche | Nicht zutreffend | | Nicht zutreffend |
| Mir zuweisen | Schaltfläche | Nicht zutreffend | Wird abgelehnt, wenn Sie den Fall freigegeben haben („eine andere Pathologin oder ein anderer Pathologe muss ihn prüfen“) oder nicht zum Gutachterpool gehören. | Nicht zutreffend |
| Übereinstimmung erfassen, Diskrepanz erfassen | Schaltflächen | Nicht zutreffend | Erfassen die Prüfung. Eine Diskrepanz öffnet ein Fenster für die Einzelheiten. Erfordert `cytology:qc-review:record`. Ein Fall „Einem anderen Gutachter zugewiesen“ zeigt keine Schaltflächen. | Nicht zutreffend |
| Eskalieren | Schaltfläche und Fenster („Diese überfällige Prüfung eskalieren?“) mit **Grund** | Grund erforderlich | Stellt eine überfällige Prüfung nicht zugewiesen in die Warteschlange zurück. | Nicht zutreffend |
| Supervisor-Umgehung | Schaltfläche und Fenster („QK-Prüfung für diesen Fall umgehen?“) mit **Begründung** | Begründung erforderlich | Genehmigt den Fall ohne QK-Prüfung, um eine klinische Verzögerung zu vermeiden. Der Name und die Begründung werden im Prüfprotokoll festgehalten. | Nicht zutreffend |
| Leer | Text | Nicht zutreffend | „Keine Fälle in dieser Warteschlange.“ | Nicht zutreffend |

**7. Berechtigungen.** Ansicht öffnen: `screen:cytology-qc-queue:open` (Pathologe, Fellow). Eine Prüfung erfassen oder eskalieren: `cytology:qc-review:record` (Pathologe, Fellow; hohes Risiko). Supervisor-Umgehung: `cytology:qc-review:bypass` (hohes Risiko; standardmäßig bei keiner Rolle, nur bei der Superadministration von ForMedrixAI; eine Administratorin oder ein Administrator muss sie zuweisen).
**Bekannte Grenzen.** Vertrag: `docs/architecture/CYTOLOGY_QC_API.md`.
