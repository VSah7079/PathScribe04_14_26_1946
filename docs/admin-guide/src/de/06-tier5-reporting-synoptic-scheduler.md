---
chapter: 6
id: ch6
title: Stufe 5: Befundung, synoptische Formulare und Konfiguration des Schedulers
---

# Stufe 5: Befundung, synoptische Formulare und Konfiguration des Schedulers {#ch6}

Dieses Kapitel beschreibt, wie ein freigegebener Befund aussieht, welche strukturierten (synoptischen) Formulare Pathologinnen und Pathologen ausfüllen und wie ein freigegebener Befund versendet, gedruckt und zeitlich gesteuert wird. Es dokumentiert 15 Bildschirme in vier Teilen. Drei Punkte der Gliederung sind nicht umgesetzt, und jeder ist an der Stelle gekennzeichnet, an der er vorkommt: ein Zustellkanal über ein Patientenportal, das automatische Laden von CAP-Protokollversionen und ein nächtlicher Job-Scheduler, den ein Administrator konfigurieren kann. Die jeweils nächstliegenden funktionierenden Möglichkeiten sind in den einzelnen Abschnitten genannt.

**Reihenfolge der Einrichtung für diese Stufe.** Erledigen Sie zuerst Stufe 1 bis Stufe 4 (insbesondere Einrichtungen, Ärzte, Rollen und Standort-Agenten). Arbeiten Sie danach diese Stufe in der folgenden Reihenfolge ab. Das Kästchen „Einrichtungsreihenfolge“ jedes Bildschirms wiederholt dessen Platz in der Liste.

1. [Genehmigte Schriftarten](#screen-fonts): Legen Sie fest, welche Schriftarten die Befundeditoren anbieten.
2. [Dokumentstil](#screen-document_style): Legen Sie den Standardtextstil, das Seitenformat und die Ränder der Befunde des Labors fest.
3. [Vorlagenprüfung](#screen-template_governance): Legen Sie fest, wer synoptische Vorlagen freigeben und veröffentlichen darf.
4. [Teilebibliothek](#screen-templates-parts): Erstellen oder kopieren Sie die wiederverwendbaren Kopfzeilen, Textkörper und Fußzeilen.
5. [Berichtsvorlagen](#screen-templates-templates): Setzen Sie Teile zu Berichtsvorlagen zusammen und veröffentlichen Sie diese.
6. [Routing-Regeln](#screen-templates-routing): Legen Sie fest, welche Vorlage ein Fall für eine Einrichtung, einen Arzt oder ein Protokoll verwendet.
7. [Prüfwarteschlange](#screen-protocols-review): Führen Sie synoptische Protokolle durch Entwurf, Prüfung und Freigabe.
8. [Aktive Protokolle](#screen-protocols-active): Prüfen und pflegen Sie die veröffentlichten synoptischen Protokolle.
9. [Druckziel-Weiterleitungsregeln](#screen-print_routing_rules): Legen Sie fest, an welchen Drucker ein freigegebener Befund geht.
10. [Zustellungs-Konfigurationsregeln](#screen-delivery_rules): Legen Sie fest, wie jeder freigegebene Befund versendet wird (Ergebnisnachricht, Druck, E-Fax, Dateiablage).
11. [Zustellzeitpläne](#screen-delivery_schedules): Legen Sie fest, wann etwas versendet wird.

Bildschirme, die nicht zur Einrichtung gehören und daher keine Schrittnummer haben: die beiden Registerseiten ([Register Berichtsvorlagen](#screen-tab-templates) und [Register Synoptik-Bibliothek](#screen-tab-protocols)), [Alle Protokolle](#screen-protocols-all) und [Meine Exporte](#screen-my-exports).

**Zustellkanäle im Überblick.** Jeder Kanal wird mit seinen Grenzen in [Teil 3](#ch6-scheduled-delivery) erneut beschrieben.

| Kanal | Status | Was vorhanden ist |
|---|---|---|
| Druckwarteschlange | Umgesetzt | Zustellungsregeln senden einen Druckauftrag; Druckweiterleitungsregeln wählen den Drucker; der Bildschirm Druckwarteschlange verwaltet die Aufträge. |
| Ergebnisnachricht an die Schnittstellen-Engine (elektronisch) | Umgesetzt | Der Standardkanal. |
| E-Fax | Umgesetzt | Wird an den Schnittstellenserver gesendet, der die PDF-Datei an ein E-Mail-zu-Fax-Gateway übergibt. |
| Dateiablage | Umgesetzt | Wird an den Schnittstellenserver gesendet, der die Datei in einen Ordner oder ein SFTP-Ziel schreibt, das auf diesem Server eingerichtet ist. |
| Sichere E-Mail | Demonstration | Eine Person sendet aus einem Fenster eine fallbezogene Nachricht; die E-Mail geht an den [Simulierten Postausgang](#screen-simulated_mail). Es ist kein Kanal einer Zustellungsregel. |
| Patienten- oder Einsenderportal | Nicht umgesetzt | Es existiert kein Portalkanal. |

**Wo sich die Werkzeuge für Stapel- und Nachtjobs befinden.** Der Stapeldruck und der nächtliche Job-Scheduler sind nicht ein einzelner Bildschirm. [Teil 4](#ch6-batch-jobs) listet die vorhandenen Bildschirme auf und nennt, wo jeder dokumentiert ist.

## Designer für Berichtsvorlagen und Einrichtung des Brandings {#ch6-report-templates}
Breadcrumb: Startseite > Konfiguration > Berichtsvorlagen

Ein Befund wird aus drei Arten von **Teilen** aufgebaut (Kopfzeile, Textkörper, Fußzeile). Eine **Vorlage** ordnet Teile in fünf Slots an (Kopfzeile Seite 1, Kopfzeile ab Seite 2, Textkörper, Fußzeile ab Seite 2, Fußzeile Seite 1). **Routing-Regeln** bestimmen, welche Vorlage ein Fall erhält. Die Standardschriftarten, das Seitenformat und die Ränder des Labors liegen unter alledem.

**Wie eine Vorlage für einen Fall gewählt wird.** Der Router prüft die folgenden Stufen in dieser Reihenfolge und hält bei der ersten Übereinstimmung an: zuerst eine Sperre für vorläufige Befunde; dann eine Überschreibung der Einrichtung (Durchlauf 0); dann, bei einer angeschlossenen Einrichtung ohne eigene Regel, die Überschreibung ihres übergeordneten Unternehmens (Durchlauf 0a); dann eine Präferenz des Arztes (Durchlauf 0b); dann eine Übereinstimmung mit einem synoptischen Protokoll, wobei vom Administrator definierte Regeln vor der integrierten Tabelle geprüft werden (Durchlauf 1); dann der Rückgriff auf die Subspezialität (Durchlauf 2); dann der Rückgriff auf den Goldstandard (Durchlauf 3). Innerhalb einer Regelart hat eine Regel für ein durchführendes Labor Vorrang vor einer globalen Regel für dieselbe Einrichtung oder denselben Arzt.

**Ebenen des Textstils.** Der Textstil eines Befunds stammt aus drei Ebenen; die spezifischste gewinnt: Der Standard des Labors (Dokumentstil) wird durch das eigene Bedienfeld Stil einer Vorlage überschrieben, und dieses wird durch die Beschriftungsformatierung einer Komponente im Inspektor überschrieben.

**Branding.** Die Kopfzeile des Befunds übernimmt Logo, Namen der Laborleitung und Akkreditierungsnummer aus der Abteilung, danach aus der Einrichtung und danach aus dem Unternehmen. Diese Felder werden auf anderen Bildschirmen festgelegt; dieses Kapitel wiederholt sie nicht:
- Branding der Abteilung: [Abteilungswörterbuch](#screen-departments) (Name des Laborleiters, Akkreditierungsnummer, URL des Kopfzeilen-Logos).
- Branding der Einrichtung und Befundoptionen: [Einrichtungskonfiguration](#screen-clients) und [Einrichtungswörterbuch](#screen-facility-dictionary).

PathScribe speichert nur die Adresse eines gehosteten Logobilds, nie das Bild selbst. Ein Kopfteil, bei dem **Logo der Einrichtung anzeigen** eingeschaltet ist, verwendet sie.

### Register Berichtsvorlagen {#screen-tab-templates}
Breadcrumb: Startseite > Konfiguration > Berichtsvorlagen

**Status:** Umgesetzt

**1. Navigation:** Register **Berichtsvorlagen** unter Konfiguration
**2. Wartungspunkt:** Das Register selbst, mit den Unterregistern **Berichtsvorlagen**, **Teilebibliothek** und **Routing-Regeln**.

**3. Geschäftlicher Zweck und Umfang.** Das Register fasst die drei Bildschirme zusammen, die das Befundlayout festlegen: die Vorlagenliste, die wiederverwendbare Teilebibliothek und die Routing-Regeln für Vorlagen. Die Registerseite hat keine eigenen Felder. Die Schaltflächen der Unterregister sind die einzigen Bedienelemente.

**4. Voraussetzungen und Abhängigkeiten.** Das Register öffnet sich für jede Person mit `screen:configuration:open`. Jedes Unterregister wird dann durch seine eigene Berechtigung eingeschränkt; eine Person ohne diese sieht die Liste, kann aber nichts ändern.

Setup step: Reference, not part of setup
Requires: [Dokumentstil](#screen-document_style)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-templates - Register Berichtsvorlagen mit den drei Unterregistern]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Berichtsvorlagen (Unterregister) | Schaltfläche | Nicht zutreffend | Öffnet die [Vorlagenliste](#screen-templates-templates). | Ausgewählt |
| Teilebibliothek (Unterregister) | Schaltfläche | Nicht zutreffend | Öffnet die [Teilebibliothek](#screen-templates-parts). | Nicht ausgewählt |
| Routing-Regeln (Unterregister) | Schaltfläche | Nicht zutreffend | Öffnet die [Routing-Regeln für Vorlagen](#screen-templates-routing). | Nicht ausgewählt |

**7. Berechtigungen.** Das Register öffnen: `screen:configuration:open`. Die Aktionen jedes Unterregisters verwenden eigene Berechtigungen, die beim Unterregister aufgeführt sind.
**Bekannte Grenzen.** Keine bekannt.

### Teilebibliothek {#screen-templates-parts}
Breadcrumb: Startseite > Konfiguration > Berichtsvorlagen > Teilebibliothek

**Status:** Umgesetzt

**1. Navigation:** Register **Berichtsvorlagen** unter Konfiguration > Unterregister **Teilebibliothek**
**2. Wartungspunkt:** Berichtsteile (Kopfzeile, Textkörper, Fußzeile)

**3. Geschäftlicher Zweck und Umfang.** Ein Teil ist ein wiederverwendbarer Baustein eines Befunds: eine **Kopfzeile** (Branding der Einrichtung, Eingangsnummer, Patientendemografie), ein **Textkörper** (Diagnose, makroskopische Beschreibung, mikroskopische Beschreibung, synoptische Daten) oder eine **Fußzeile** (Seitenzahlen, Vertraulichkeitshinweis, Zeile zur Patientenidentität). Teile werden hier einmal erstellt und in beliebig viele Vorlagen eingesetzt. Ein Teil kann global sein (jedem durchführenden Labor angeboten) oder zu einem durchführenden Labor gehören. Die Bibliothek enthält mitgelieferte Teile, die mit dem Kennzeichen **Integriert** angezeigt werden. Integrierte Teile können nicht bearbeitet oder archiviert werden; duplizieren Sie einen, um ihn zu ändern.

**4. Voraussetzungen und Abhängigkeiten.** Teile benötigen keine anderen Teile, aber der Textstil des Labors und die durchführenden Labore, auf die sie sich beziehen, sollten zuvor vorhanden sein. Überspringen Sie die Einrichtung der Einrichtungen, bietet die Liste Ausführendes Labor nur Global an.

Setup step: Tier 5, step 4
Requires: [Dokumentstil](#screen-document_style), [Einrichtungskonfiguration](#screen-clients)
Unlocks: [Berichtsvorlagen](#screen-templates-templates)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: templates-parts - Teilebibliothek mit gruppierten Kopfzeilen, Textkörpern und Fußzeilen]

**Was der Bildschirm zeigt.** Archivierte Teile sind in der Liste ausgeblendet. Die Teile sind unter Kopfzeilen, Textkörper und Fußzeilen gruppiert. Jede Karte zeigt den Namen, ein Statuskennzeichen (Entwurf, Veröffentlicht oder Archiviert), gegebenenfalls das Kennzeichen Integriert, das durchführende Labor sowie Typ, Fachgebiet und Beschreibung. Eine Karte bietet **Bearbeiten** (nicht bei integrierten Teilen), **Duplizieren** und **Archivieren** mit einer Ja/Nein-Bestätigung (nicht bei integrierten Teilen).

**6. Feldreferenz.**

Bedienelemente der Liste:

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Filtert die Liste nach dem Namen des Teils. | Leer |
| Typfilter | Auswahl: Alle, Kopfzeilen, Textkörper, Fußzeilen | Optional | Zeigt eine Art von Teilen. | Alle |
| Laborfilter | Auswahl: alle Labore, Global oder ein durchführendes Labor | Optional | Zeigt die Teile eines Labors. | Alle |
| Neuer Teil | Schaltfläche | Nicht zutreffend | Öffnet die Typauswahl für Teile (Kopfzeile, Textkörper oder Fußzeile) und danach den Teil-Editor. | Nicht zutreffend |

#### Teil-Editor {#ch6-part-builder}
Breadcrumb: Startseite > Konfiguration > Berichtsvorlagen > Teilebibliothek > Teil-Editor

[SCREENSHOT PLACEHOLDER: templates-parts-builder - Teil-Editor mit Zeichenfläche, Palette und Inspektor]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Teiltyp | Auswahl: Kopfteil, Hauptteil, Fußteil | Pflicht | Wird einmal beim Erstellen des Teils gewählt. Bestimmt, in welchen Slot der Teil eingesetzt werden kann. | Keiner |
| Name | Text | Pflicht | Wird in der Bibliothek und im Slot der Vorlage angezeigt. Zum Bearbeiten klicken Sie auf den Namen. | `New Header Part`, `New Body Part` oder `New Footer Part` |
| Fachgebiet | Text | Optional | Gruppiert den Teil. `General` bedeutet jedes Fachgebiet. | Leer (angezeigt als Allgemein) |
| Beschreibung | Text | Optional | Kurzer Hinweis, der auf der Karte der Bibliothek angezeigt wird. | Leer |
| Standard | Auswahl: Keine, CAP, RCPath, Benutzerdefiniert | Optional | Nur eine Bezeichnung. Sie hält die Quelle des Layouts fest und lädt oder prüft kein Protokoll. | Keine |
| Ausführendes Labor | Auswahl: Global (jedes ausführende Labor) oder ein ausführendes Labor | Optional | Ein laborspezifischer Teil wird nur für die Vorlagen dieses Labors angeboten. | Global |
| Raster | Schalter: Raster ein / Raster aus | Optional | Zeigt oder verbirgt das Layoutraster auf der Zeichenfläche. Nur Anzeige. | Ein |
| Komponenten (Zeichenfläche) | Aus der Palette ziehen | Optional | Der Inhalt des Teils. Die Felder des Inspektors stehen unter [Berichtsvorlagen](#screen-templates-templates). Die Anzahl der Komponenten wird angezeigt. | Leer |
| Speicherstatus | Anzeige: Nicht gespeichert, Wird gespeichert, Gespeichert, Fehler | Nicht zutreffend | Der Teil wird beim Bearbeiten gespeichert. | Nicht zutreffend |
| Veröffentlichen | Schaltfläche | Nicht zutreffend | Macht den Teil für Vorlagen verfügbar (nur veröffentlichte Teile können eingesetzt werden). Es gilt eine Prüfung der Enddiagnose; siehe den Vorlageneditor. | Entwurf |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Erstellen, speichern, archivieren, duplizieren: `config:report-template:manage`. Veröffentlichen: `config:report-template:publish`. Beide haben ein hohes Risiko und werden protokolliert. Admin und Lab Director besitzen beide; Template Author besitzt manage; Template Approver besitzt publish.
**Vorlagenvariablen für das Geschlecht der Patientin oder des Patienten und die NHS-Nummer (Batch 662).** Berichtsvorlagen drucken `{{patient.sexAtBirth}}` und können `{{patient.nhsNumber}}` verwenden. Das Geschlecht wird weiterhin mit demselben Code gespeichert (M, F, U) plus I für unbestimmt, sodass Vorlagen, die `patient.sex == 'M'` prüfen, weiter funktionieren. Das Kennzeichen im Patientenbanner zeigt „traced“ (ermittelt) nur, wenn der gespeicherte NHS Number Status Indicator 01 ist.
**Bekannte Grenzen.** Das Feld Standard ist eine Bezeichnung. Es verknüpft einen Teil nicht mit einem CAP- oder RCPath-Protokoll.

### Berichtsvorlagen {#screen-templates-templates}
Breadcrumb: Startseite > Konfiguration > Berichtsvorlagen > Berichtsvorlagen

**Status:** Umgesetzt

**1. Navigation:** Register **Berichtsvorlagen** unter Konfiguration > Unterregister **Berichtsvorlagen**
**2. Wartungspunkt:** Berichtsvorlagen

**3. Geschäftlicher Zweck und Umfang.** Eine Berichtsvorlage legt den Aufbau eines Befunds fest: welche Kopf-, Haupt- und Fußteile sie in welchen Slots verwendet und (optional) die KI-gestützten Generierungsschritte des Labors dafür. Eine Vorlage ist Entwurf, Veröffentlicht oder Archiviert. Nur eine veröffentlichte Vorlage kann vom Routing gewählt werden. Die Liste zeigt jede Vorlage mit ihrem Status, einem Kennzeichen **KI**, wenn die KI-Generierung eingeschaltet ist, einem Kennzeichen **STANDARD** beim Standardlayout für die chirurgische Pathologie, der Anzahl der aktiven Slots und dem Zeitpunkt der letzten Aktualisierung.

**4. Voraussetzungen und Abhängigkeiten.** Vorlagen werden aus veröffentlichten Teilen aufgebaut; die Teilebibliothek kommt daher zuerst. Überspringen Sie sie, zeigt die Teileauswahl im Editor „No published parts found“. Der Textstil des Labors sollte festgelegt sein, damit das Bedienfeld Stil der Vorlage einen Standard hat, auf den es zurückgreifen kann.

Setup step: Tier 5, step 5
Requires: [Teilebibliothek](#screen-templates-parts), [Dokumentstil](#screen-document_style)
Unlocks: [Routing-Regeln](#screen-templates-routing)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: templates-templates - Liste der Berichtsvorlagen mit Statusfilter, Suche, Aus Standard und Neue Vorlage]

**6. Feldreferenz.**

Bedienelemente der Liste:

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Statusfilter | Auswahl: Alle, Veröffentlicht, Entwurf, Archiviert, jeweils mit einer Anzahl | Optional | Zeigt einen Status. | Alle |
| Suche | Text | Optional | Filtert nach dem Namen. | Leer |
| Neue Vorlage (Leer beginnen) | Schaltfläche | Nicht zutreffend | Legt einen leeren Entwurf an und öffnet den Editor. | Nicht zutreffend |
| Aus Standard (Standardvorlage verwenden) | Schaltfläche | Nicht zutreffend | Kopiert das Standardlayout für die chirurgische Pathologie als neuen Entwurf mit dem Namen `My Surgical Pathology Report`. | Nicht zutreffend |
| Bearbeiten | Schaltfläche in einer Entwurfszeile | Nicht zutreffend | Öffnet den Editor. | Nicht zutreffend |
| Duplizieren | Schaltfläche | Nicht zutreffend | Erstellt eine Kopie mit dem Namen `Copy of <name>`. | Nicht zutreffend |
| Löschen / Archivieren | Schaltfläche mit Ja/Nein-Bestätigung | Nicht zutreffend | Ein Entwurf wird gelöscht; eine veröffentlichte Vorlage wird archiviert. | Nicht zutreffend |

#### Vorlageneditor {#ch6-template-editor}
Breadcrumb: Startseite > Konfiguration > Berichtsvorlagen > Berichtsvorlagen > Vorlageneditor

[SCREENSHOT PLACEHOLDER: templates-templates-editor - Vorlageneditor mit Bedienfeld Teilebibliothek, Seitenslots und Vorschau]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name der Vorlage | Text | Pflicht | Zum Bearbeiten klicken. Wird gespeichert, wenn Sie das Feld verlassen. | Der beim Erstellen vergebene Name |
| Zeile mit Fachgebiet und Standard | Schreibgeschützter Text | Nicht zutreffend | Zeigt das Fachgebiet der Vorlage und ihren Standard (CAP, RCPath oder Benutzerdefiniert). Eine leere Vorlage beginnt mit `general` und `custom`. | `general`, `custom` |
| Status | Entwurf, Veröffentlicht oder Archiviert | Nicht zutreffend | **Veröffentlichen** setzt einen Entwurf auf Veröffentlicht. Veröffentlichen ist deaktiviert, wenn die Vorlage mehr als ein als Enddiagnose markiertes Feld hat. | Entwurf |
| Filter Ausführendes Labor (Bedienfeld Teilebibliothek) | Auswahl: Alle Labore (Global + jedes Labor), Global oder ein Labor | Optional | Schränkt die angebotenen Teile ein. | Alle Labore |
| Teilesuche | Text | Optional | Filtert die veröffentlichten Teile. | Leer |
| Slot: Kopfzeile Seite 1 | Ein Kopfteil | Optional | Kopfzeile der ersten Seite. | Leer |
| Slot: Kopfzeile ab Seite 2 | Ein Kopfteil oder „wie Seite 1“ | Optional | Kopfzeile der folgenden Seiten. | Leer |
| Slot: Textkörper | Geordnete Liste von Hauptteilen | Optional | Zum Umordnen ziehen. Hauptteile setzen sich über alle Seiten fort. Jeder kann mit dem Slot-Schalter ausgeschaltet werden, ohne ihn zu entfernen. | Leer |
| Slot: Fußzeile ab Seite 2 | Ein Fußteil | Optional | Fußzeile der folgenden Seiten. | Leer |
| Slot: Fußzeile Seite 1 | Ein Fußteil | Optional | Fußzeile der ersten Seite. | Leer |
| Stil (Schriftart) | Auswahl aus den genehmigten Schriftarten | Optional | Standardtextstil auf Vorlagenebene für Kopfzeile, Textkörper oder Fußzeile. Greift auf den Standard des Labors zurück, wenn leer. | Standard des Labors |
| Stil (Schriftgröße, pt) | Zahl | Optional | Wie oben. Die Größen sind in Punkt angegeben. | Standard des Labors |
| Stil (Fett, Unterstrichen) | Schalter | Optional | Wie oben. | Aus |
| Stil (Textumwandlung) | Auswahl: Wie eingegeben, Großschreibung, GROSSBUCHSTABEN | Optional | Wie oben. | Wie eingegeben |
| Vorschau | Schaltfläche | Nicht zutreffend | Zeigt die Vorlage mit Beispielfalldaten, die Seitenzahl und den Beispielkontext. | Nicht zutreffend |
| Ränder der Vorschau (oben, rechts, unten, links, mm) | Zahl | Optional | Nur für diese Vorschau. Das echte Seitenformat und die echten Ränder des Labors werden im Dokumentstil festgelegt. | Die Einstellung des Labors |
| Seitenformat der Vorschau | Auswahl: A4, US Letter, US Legal, A3, B5 | Optional | Nur für diese Vorschau. | Die Einstellung des Labors |

#### Inspektor: Felder der ausgewählten Komponente {#ch6-template-inspector}
Breadcrumb: Startseite > Konfiguration > Berichtsvorlagen > Berichtsvorlagen > Vorlageneditor > Inspektor

Der Inspektor zeigt die Eigenschaften dessen, was Sie auf der Zeichenfläche auswählen. Im Teil-Editor wird derselbe Inspektor verwendet.

[SCREENSHOT PLACEHOLDER: templates-templates-inspector - Inspektor für ein ausgewähltes Feld]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Beschriftung | Text | Optional | Die gedruckte Beschriftung des Felds. | Leer |
| Breite | Spalten von 12 | Optional | Ziehen Sie den Griff auf der Zeichenfläche für eine feinere Steuerung. | Je nach Komponententyp |
| Erforderlich | Ja/Nein-Schalter | Optional | Das Feld muss ausgefüllt werden. | Aus |
| Bei Leere ausblenden | Ja/Nein-Schalter | Optional | Lässt das Feld im gedruckten Befund weg, wenn es keinen Wert hat. | Aus |
| Seitenumbruch vor diesem Feld | Ja/Nein-Schalter | Optional | Beginnt eine neue Seite. | Aus |
| Feld für Enddiagnose | Ja/Nein-Schalter | Optional | Markiert das Feld, das die Enddiagnose enthält. Eine Vorlage darf nur eines haben. | Aus |
| In FHIR-Export einschließen | Ja/Nein-Schalter | Optional | Wird mit dem Feld gespeichert. Es ist kein Bildschirm für den FHIR-Export umgesetzt; siehe [Kapitel 7](#ch7). | Aus |
| Anzeigen, wenn (Sichtbarkeit) | Bedingungsliste mit UND/ODER | Optional | Bedingungen zu anderen Feldern: ist gleich, ist ungleich, enthält, ist leer, ist nicht leer, größer als, kleiner als und so weiter. | Immer angezeigt |
| Beschriftungsposition | Auswahl: Über dem Feld, Neben dem Feld, Ausgeblendet | Optional | Formatierung der Beschriftung. | Oben |
| Schriftgröße der Beschriftung (pt), Fett, Unterstrichen, Textumwandlung | Zahl und Schalter | Optional | Formatierung der Beschriftung auf Komponentenebene. Hat Vorrang vor den Stilen von Vorlage und Labor. | Geerbt |
| Bindungsschlüssel | Text | Pflicht bei gebundenen Feldern | Das Falldatenfeld, das ein Textfeld, Dropdown-Feld, Zahlenfeld, Datumsfeld, eingebettetes Bild oder ein Datenabsatz liest. | Keiner |
| Textfeld: Platzhalter, Maximale Länge, Validierungsmuster (Regex) | Text, Zahl, Text | Optional | Eingabegrenzen eines Textfelds. | Leer |
| Dropdown: Optionen | Je Zeile ein `value|Label` | Pflicht | Die Auswahlmöglichkeiten. | Leer |
| Dropdown: Mehrfachauswahl zulassen, Freitexteingabe zulassen | Schalter | Optional | | Aus |
| Zahl: Einheit, Einheitsoptionen, Dezimalstellen, Min, Max | Text und Zahlen | Optional | | Leer |
| Datum: Format, Standardmäßig heutiges Datum | Auswahl: Datum, Datum und Uhrzeit, Nur Jahr; Schalter | Optional | | Datum, aus |
| Berechnet: Ausdruck, Ausgabetyp, Einheit | Text; Auswahl Text, Zahl, Datum | Pflicht | Ein aus anderen Feldern berechneter Wert. | Keiner |
| Statische Beschriftung: Text, Variante, Fett, Kursiv | Text; Auswahl Überschrift 1, 2, 3, Fließtext, Bildunterschrift | Pflicht | Feste Überschrift oder fester Text. | Fließtext |
| Rich-Text-Block: Inhalt, Schriftgröße (px), Textausrichtung | Text, Zahl, Auswahl Links, Zentriert, Rechts | Optional | Fester Fließtext, in jedem Befund gleich. | Leer |
| Datenabsatz: Bindungsschlüssel, Rich-Text-Formatierung, KI darf diesen Absatz verfassen | Text und Schalter | Optional | Ein aus Falldaten befüllter Slot. | KI-Schreiben aus |
| Eingebettetes Bild: Bindungsschlüssel oder Statische Bild-URL, Alt-Text, Bildunterschrift, Ausrichtung, Breite, Höhe (px) | Text, Zahlen | Optional | Eine gehostete Bildadresse, nie eine hochgeladene Datei. | Automatische Größe |
| Abschnitt: Druck-Überschrift, Einklappbar, Standardmäßig eingeklappt | Text und Schalter | Optional | Eine Gruppe von Feldern. | Aus |
| Spaltenlayout: Anzahl der Spalten, Spaltenabstand (px) | Zahlen | Optional | Die Spalten, über die der Inhalt fließt. | Keines |
| Wiederholungsgruppe: Iterieren über, Elementalias, Min. Elemente, Max. Elemente | Text, Zahlen | Optional | Wiederholt ihren Inhalt für jedes Element einer Liste. | Keine |
| Wenn-Block: Untergeordnete Elemente anzeigen, wenn, Sonst-Zweig | Bedingungsliste | Optional | Zeigt den Inhalt, wenn die Bedingung zutrifft. | Keiner |
| Switch-Block: Verzweigen nach, Fälle (Fallbeschriftung, Wenn) | Feld und Bedingungsliste | Optional | Zeigt den Inhalt des passenden Falls. | Keiner |
| Seitenumbruch: Umbruchverhalten | Auswahl: Automatisch, Immer umbrechen, Umbruch vermeiden | Optional | | Automatisch |
| Vorlagenverweis: ID der referenzierten Vorlage, Name, Kontextüberschreibungen | Text | Optional | Fügt den Inhalt einer anderen Vorlage ein. | Keiner |
| Kopfzeile: Logo der Einrichtung anzeigen, Patientennamen anzeigen, Eingangsnummer anzeigen, Seitenbereich, Höhe (px), Benutzerdefiniertes HTML | Schalter, Auswahl Alle Seiten, Nur Seite 1, Nur Seite 2 und folgende; Zahl; Text | Optional | Schalter für den Inhalt der Kopfzeile. | Aus, alle Seiten |
| Fußzeile: Seitenzahlen anzeigen, Seitenzahlformat, Seitenbereich, Höhe (px), Benutzerdefiniertes HTML | Schalter, Text, Auswahl, Zahl, Text | Optional | Schalter für den Inhalt der Fußzeile. | Aus, alle Seiten |
| KI-Generierung: KI-gestützte Generierung aktivieren, Systemanweisung, Temperatur, Max. Token | Schalter, Text, Zahl, Zahl | Optional | KI-Einstellungen je Abschnitt, die der Orchestration-Modus verwendet. Einrichtung in [Kapitel 5](#ch5). | Aus |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Erstellen, speichern, duplizieren, löschen, archivieren: `config:report-template:manage`. Veröffentlichen: `config:report-template:publish`. Beide mit hohem Risiko, protokolliert. Inhaber wie bei der Teilebibliothek.
**Bekannte Grenzen.** Die Prüfungen der Enddiagnose laufen im Editor vor dem Veröffentlichen. Der Lebenszyklus der Vorlage ist hier Entwurf, Veröffentlicht, Archiviert; es gibt keinen Prüfschritt wie bei der synoptischen Vorlage (siehe [Vorlagenprüfung](#screen-template_governance)).
### Routing-Regeln {#screen-templates-routing}
Breadcrumb: Startseite > Konfiguration > Berichtsvorlagen > Routing-Regeln

**Status:** Umgesetzt

**1. Navigation:** Register **Berichtsvorlagen** unter Konfiguration > Unterregister **Routing-Regeln**
**2. Wartungspunkt:** Vorlagen-Weiterleitungsregeln

**3. Geschäftlicher Zweck und Umfang.** Regeln überschreiben die Standardkette (Protokoll, dann Subspezialität, dann Goldstandard) für bestimmte Einrichtungen, Ärzte oder synoptische Protokolle. Mit einer **Protokollzuordnung** ordnen Sie ein neues oder geändertes synoptisches Protokoll einer Vorlage zu, ohne dass ein Software-Release nötig ist. Dies ist nicht derselbe Bildschirm wie die [Routingregeln](#screen-routing_rules) unter System, die Fälle an Pathologen verteilen.

**4. Voraussetzungen und Abhängigkeiten.** Regeln verweisen auf veröffentlichte Vorlagen, Einrichtungen, Ärzte und Protokolle. Überspringen Sie die Vorlagen, ist die Liste der Berichtsvorlagen leer. Eine Protokollzuordnung wählt aus den Protokollen der Synoptik-Bibliothek und ist daher nach der Arbeit in der [Prüfwarteschlange](#screen-protocols-review) am nützlichsten; eine Regel kann später hinzugefügt werden.

Setup step: Tier 5, step 6
Requires: [Berichtsvorlagen](#screen-templates-templates), [Einrichtungskonfiguration](#screen-clients), [Ärzte](#screen-physicians)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: templates-routing - Vorlagen-Weiterleitungsregeln mit den Bereichen Einrichtung, Arzt und Protokoll sowie dem Testbedienfeld]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Einrichtungs-Overrides | Liste von Regeln | Optional | Durchlauf 0 und Durchlauf 0a. Eine angeschlossene Einrichtung ohne eigene Regel verwendet die Regel ihres übergeordneten Unternehmens. | Keine |
| Arztpräferenzen | Liste von Regeln | Optional | Durchlauf 0b. | Keine |
| Protokollzuordnungen | Liste von Regeln | Optional | Durchlauf 1. Sie ergänzen die integrierte Protokolltabelle und haben Vorrang vor ihr. | Keine (nur die integrierte Tabelle) |
| Bedienfeld Priorität | Schreibgeschützte Liste | Nicht zutreffend | Zeigt jeden Durchlauf und ob er administrativ definiert oder administrativ erweiterbar ist; der Durchlauf, der den letzten Test aufgelöst hat, ist hervorgehoben. | Nicht zutreffend |
| Regel aktivieren / deaktivieren | Schalter in jeder Zeile | Optional | Eine deaktivierte Regel wird übersprungen. | Aktiviert |
| Löschen | Schaltfläche mit Bestätigung | Nicht zutreffend | | Nicht zutreffend |

#### Regel hinzufügen oder bearbeiten {#ch6-routing-rule-window}
Breadcrumb: Startseite > Konfiguration > Berichtsvorlagen > Routing-Regeln > Regel hinzufügen

[SCREENSHOT PLACEHOLDER: templates-routing-rule - Fenster Einrichtungs-Weiterleitungsregel hinzufügen]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Einrichtung, Arzt oder Protokoll | Auswahlliste | Pflicht | Auf welche Entität die Regel angewendet wird. Die Beschriftung folgt dem Bereich, den Sie geöffnet haben. | Keine |
| Ausführendes Labor | Auswahl: Global (jedes ausführende Labor) oder ein Labor | Optional | Eine Regel für ein Labor wird vor einer globalen Regel für die eigenen Fälle dieses Labors geprüft. | Global |
| Berichtsvorlage | Auswahlliste der Vorlagen | Pflicht | Die Vorlage, die die Entität immer verwendet. | Keine |
| Notiz | Text | Optional | Warum der Override besteht. | Leer |

#### Vorlagen-Weiterleitung testen {#ch6-routing-test}
Breadcrumb: Startseite > Konfiguration > Berichtsvorlagen > Routing-Regeln > Test

[SCREENSHOT PLACEHOLDER: templates-routing-test - Bedienfeld Vorlagen-Weiterleitung testen]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Ausführende Einrichtung | Auswahlliste | Optional | Die Einrichtung des Falls. | Beliebig |
| Anordnender Arzt | Auswahlliste | Optional | | Beliebig |
| Subspezialität | Auswahlliste | Optional | | Beliebig |
| Synoptische Vorlagen-ID | Auswahlliste | Optional | | Keine |
| Weiterleitung testen | Schaltfläche | Nicht zutreffend | Zeigt die gewählte Vorlage und den Durchlauf, der sie gewählt hat. Bei einem mehrdeutigen Ergebnis werden die Kandidaten aufgelistet. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, ändern, löschen: `config:template-routing:manage` (hohes Risiko, protokolliert). Admin und Lab Director besitzen sie; Template Author und Template Approver nicht.
**Bekannte Grenzen.** Die Tabellen für Subspezialität und Goldstandard (Durchlauf 2 und 3) sind integriert und können hier nicht bearbeitet werden. Die Sperre für vorläufige Befunde ist integriert.

### Genehmigte Schriftarten {#screen-fonts}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Genehmigte Schriftarten

**Status:** Umgesetzt

**1. Navigation:** Register **System** unter Konfiguration > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Genehmigte Schriftarten

**3. Geschäftlicher Zweck und Umfang.** Steuert, welche Schriftarten die Freitext-Editoren Pathologinnen und Pathologen in ihrer Symbolleiste anbieten (der Befundeditor, der Textteil-Editor, die Makro-Editoren und die Kommentarfenster lesen die Liste). Eine ausgeschaltete Schriftart bleibt in der Liste, ist aber für die Anwender ausgeblendet. Der Vorrat ist auf 14 Schriftarten in drei Gruppen festgelegt. Sie können hier keinen Schriftartnamen hinzufügen.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Diese Einstellung filtert nur eine Symbolleiste. Sie ändert nicht die Standardschriftart der Befunde des Labors; diese wird im [Dokumentstil](#screen-document_style) festgelegt, der eine eigene, kürzere Liste von sieben Schriftarten anbietet und diese Liste nicht liest.

Setup step: Tier 5, step 1
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-fonts - Genehmigte Schriftarten mit Suche und Schaltern je Schriftart]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Schriftarten suchen | Text | Optional | Filtert die 14 Schriftarten nach dem Namen. | Leer |
| Zählkennzeichen | Schreibgeschützter Text, „N von 14 aktiviert“ | Nicht zutreffend | | Nicht zutreffend |
| Schalter je Schriftart (einer pro Schriftart) | Ja/Nein-Schalter, angezeigt als Aktiv oder Inaktiv | Optional | Ein bedeutet, dass die Schriftart in den Symbolleisten der Editoren erscheint. Der Vorrat: Serif (Times New Roman, Georgia, Garamond, Palatino), Serifenlos (Arial, Helvetica, Calibri, Verdana, Trebuchet MS, Tahoma, Roboto), Monospace (Courier New, Consolas, Lucida Console). | Ein für Arial, Times New Roman und Courier New; aus für die übrigen |
| Schutz der letzten Schriftart | Meldung „Mindestens eine Schriftart muss aktiviert bleiben“ | Nicht zutreffend | Die letzte aktivierte Schriftart kann nicht ausgeschaltet werden. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:report-appearance:manage` (hohes Risiko, protokolliert). Ohne sie ist der Bereich ausgegraut und nur zur Ansicht. Admin und Lab Director besitzen sie standardmäßig.
**Bekannte Grenzen.** Keine bekannt.

### Dokumentstil {#screen-document_style}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Dokumentstil

**Status:** Umgesetzt

**1. Navigation:** Register **System** unter Konfiguration > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Dokumentstil

**3. Geschäftlicher Zweck und Umfang.** Legt den Standardtextstil des Labors für Kopfzeile, Textkörper und Fußzeile jedes Befunds fest sowie das Seitenformat und die Druckränder des Labors. Das eigene Bedienfeld Stil einer Vorlage überschreibt den Standard für diese Vorlage, und die Beschriftungsformatierung einer Komponente überschreibt beide. Größen werden in Punkt gespeichert, der gedruckten Größe, und unter 8 pt wird nichts gedruckt. Ein Stil, der gespeichert wurde, bevor es Punkt gab, wird in Pixel geführt (jedes Pixel druckt als 0,75 pt) und druckt weiterhin wie bisher, bis Sie ihn umwandeln.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Erledigen Sie dies vor dem Erstellen von Vorlagen, damit jede Vorlage mit dem richtigen Standard beginnt.

Setup step: Tier 5, step 2
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: [Teilebibliothek](#screen-templates-parts), [Berichtsvorlagen](#screen-templates-templates)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-document_style - Dokumentstil mit den Stilen für Kopfzeile, Textkörper und Fußzeile sowie der Seiteneinrichtung]

**6. Feldreferenz.** Dieselben fünf Stilfelder erscheinen je einmal für Kopfzeile, Textkörper und Fußzeile.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Schriftfamilie (Kopfzeile, Textkörper, Fußzeile) | Auswahl: Arial, Helvetica, Times New Roman, Georgia, Calibri, Verdana, Courier New | Optional | Die Standardschriftart des Befunds für diesen Bereich. | Arial |
| Schriftgröße (pt) | Anzahl Punkt, mindestens 8 | Optional | Die gedruckte Größe. Wird als „Schriftgröße (px, vor der Umstellung auf Punkt gespeichert)“ mit einem Hinweis angezeigt, wenn der Stil noch in Pixel vorliegt. | Textkörper 10, Kopfzeile 11, Fußzeile 10 |
| Fett | Ja/Nein-Schalter | Optional | | Kopfzeile ein; Textkörper und Fußzeile aus |
| Unterstrichen | Ja/Nein-Schalter | Optional | | Aus |
| Textumwandlung | Auswahl: Wie eingegeben, Großschreibung, GROSSBUCHSTABEN | Optional | | Wie eingegeben |
| Vorschau | Schreibgeschützter Beispieltext | Nicht zutreffend | Zeigt den gewählten Stil sofort an. | Nicht zutreffend |
| In Punkt umwandeln | Schaltfläche, nur bei einem in Pixel gespeicherten Stil angezeigt | Nicht zutreffend | Öffnet eine Bestätigung, die jede Größe und die gedruckte Größe auflistet. Die Zahlen bleiben gleich und bedeuten nun Punkt, sodass der Text größer gedruckt wird. Wird im Prüfprotokoll festgehalten. | Nicht zutreffend |
| Seitenformat | Auswahl: A4 (210 x 297 mm), US Letter (216 x 279), US Legal (216 x 356), A3 (297 x 420), B5 (176 x 250) | Optional | Das Papierformat des Labors. Die Vorlagenvorschau öffnet sich damit. | A4 |
| Rand oben, rechts, unten, links (mm) | Ganze Zahl von 5 bis 50 | Optional | Druckränder. | Oben 25, rechts 20, unten 25, links 20 |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:report-appearance:manage` (hohes Risiko, protokolliert), im Dienst ebenso geprüft wie auf dem Bildschirm. Admin und Lab Director besitzen sie.
**Bekannte Grenzen.** Der Renderer für Entwicklungsberichte (`functions/`) druckt weiterhin A4 und liest das Seitenformat des Labors noch nicht; die Einstellung wird in der Render-Nutzlast mitgesendet, damit der Produktionsserver sie verwenden kann. Seitenformat und Ränder sind Vorgaben für das Labor, durch das Druckerpapier bestimmt, keine persönliche Wahl.

### Vorlagenprüfung {#screen-template_governance}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Vorlagenprüfung

**Status:** Umgesetzt

**1. Navigation:** Register **System** unter Konfiguration > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Vorlagenprüfung

**3. Geschäftlicher Zweck und Umfang.** Legt fest, wer an diesem Standort **synoptische Vorlagen** (die Synoptik-Bibliothek) freigeben und veröffentlichen darf. Sie regelt nicht die Berichtsvorlagen, die einen eigenen einfachen Lebenszyklus aus Entwurf, Veröffentlichen und Archivieren haben. Es gelten zwei Einstellungen und eine feste Regel: Eine diagnostische synoptische Vorlage kann nicht unter 80 % SNOMED-Abdeckung auf Feldebene veröffentlicht werden. Prozedurale Vorlagen, etwa Checklisten für den Zuschnitt, sind ausgenommen, weil sie nie codiert werden.

**4. Voraussetzungen und Abhängigkeiten.** Die integrierten Rollen Template Author, Template Approver, Lab Director und Admin leisten die Arbeit; die Rollen der Mitarbeitenden werden daher zuerst eingerichtet. Überspringen Sie dies, kann niemand eine Vorlage freigeben, weil die Freigabe die Berechtigungen der Freigebenden erfordert.

Setup step: Tier 5, step 3
Requires: [Rollen](#screen-staff-roles)
Unlocks: [Prüfwarteschlange](#screen-protocols-review), [Aktive Protokolle](#screen-protocols-active)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-template_governance - Vorlagenprüfung mit Selbstfreigabe und erforderlichen Prüfern]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Selbstfreigabe von Vorlagen erlauben | Ja/Nein-Schalter | Optional | Aus (empfohlen): Ein Autor kann eine Vorlage, die er erstellt oder bearbeitet hat, weder freigeben noch veröffentlichen. Jede Person, die die Vorlage gespeichert hat, gilt als Autor. Schalten Sie nur für Einzelpraxen, kleine Standorte oder Tests ein. | Aus |
| Erforderliche Prüfer | Auswahl: 1, 2 oder 3 unabhängige Prüfer | Optional | Freigaben, die eine Vorlage braucht, bevor sie veröffentlicht werden kann. Jede muss von einem anderen Template Approver, Lab Director oder Admin stammen, der nicht zu ihren Autoren gehört (außer die Selbstfreigabe ist eingeschaltet). | 1 |
| SNOMED-Schwelle | Schreibgeschützter Text, 80 % | Nicht zutreffend | Wird im Untertitel angezeigt. Nicht bearbeitbar. | 80 % |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:template-governance:manage` (hohes Risiko, protokolliert; die Änderung wird mit dem alten und dem neuen Wert festgehalten). Admin besitzt sie standardmäßig; Lab Director nicht. Vergeben Sie sie daher unter Mitarbeitende > Rollen, wenn der Lab Director sie verwalten soll. Ohne sie zeigt der Bildschirm einen Hinweis, dass Sie die Einstellungen ansehen, aber nicht ändern können.
**Bekannte Grenzen.** Keine bekannt.

## Einrichtung des synoptischen Berichtsmoduls nach CAP {#ch6-synoptic}
Breadcrumb: Startseite > Konfiguration > Synoptik-Bibliothek

Die Synoptik-Bibliothek enthält die strukturierten Checklisten (Protokolle), die Pathologinnen und Pathologen für Krebsbefunde und andere Befundungen ausfüllen. Sie ist von den Berichtsvorlagen getrennt: Ein Protokoll legt die Fragen und ihre Codierung fest, eine Berichtsvorlage legt fest, wie ein Befund aussieht. Der Bildschirm Routing-Regeln verbindet beide.

**Was die Bibliothek heute tatsächlich enthält (lesen Sie dies zuerst).** In den Demonstrationsdaten enthält das Register 36 Protokolle: 32 Veröffentlicht, 3 In Prüfung und 1 Entwurf. Nach Quelle sind 23 `Custom` und 13 `PathScribe`. **Keines ist eine lizenzierte CAP- oder RCPath-Checkliste.** Die Namen CAP, RCPath und ICCR bestehen nur als Quellenbezeichnungen im Fenster Hochladen und als Namen von Aufsichtsbehörden. Die 19 Demonstrations-Checklisten (Mamma, Lunge, Prostata, Kolon, Niere, Wilms, Melanom und andere) tragen schlichte Namen wie „Colon resection“ und das Kennzeichen „Demo-Wortlaut“, in der Version `0.1.0-generic`; sie können nicht kopiert werden, und ein Kunden-Build enthält sie nicht. Die übrigen sind zwei generische synoptische Testformulare, PathScribe-Formulare wie Mohs und Neck Dissection, Formulare für Leber (medizinisch), Plazenta und Nierentransplantat, die makroskopische Untersuchung bei Obduktionen, die drei Zuschnittwege des Goldstandards und fünf Befundungssysteme der Zytologie (Bethesda Schilddrüse, Milan Speicheldrüse, Paris Harntrakt, Papanicolaou pankreatobiliär, Lymphknoten-FNA). Ein Krankenhaus, das ein CAP-Protokoll benötigt, muss es unter der eigenen Lizenz des CAP beschaffen und über die folgenden Wege einbringen.

**Wie eine Protokollversion hineinkommt und wieder hinausgeht.**

| Schritt | Status | Was vorhanden ist |
|---|---|---|
| Eine PathScribe-Protokolldatei (JSON) importieren | Umgesetzt | **Protokoll hochladen** liest die Datei, prüft sie und speichert sie als Entwurf. Danach durchläuft sie die Prüfung wie jeder andere Entwurf. |
| Eine elektronische CAP-Checkliste (eCC, SDC-XML) oder eine Excel-Arbeitsmappe prüfen | Teilweise | Das Format der Datei wird geprüft und die Anzahl der Abschnitte und Fragen angezeigt. Sie kann noch nicht importiert werden, und der Inhalt wird nicht gegen CAP oder RCPath verifiziert. |
| Ein Protokoll im Editor erstellen | Umgesetzt | **Erstellen / Anpassen** beginnt bei null oder mit einer Kopie eines vorhandenen Protokolls. |
| Eine neue Version eines vorhandenen Protokolls laden | Umgesetzt | **Neue Version** öffnet den Editor mit der nächsten Versionsnummer. Das Veröffentlichen archiviert die Version, aus der sie stammt. |
| Automatische nächtliche Synchronisierung von Aktualisierungen von CAP, RCPath oder ICCR | Nicht umgesetzt | Der Bildschirm Aufsichtsbehörden hat je Behörde einen Schalter Auto-Synchronisierung, und das Fenster Hochladen sowie die Benachrichtigungstexte erwähnen eine nächtliche Synchronisierung, doch in diesem Build existiert kein Synchronisierungsjob, und keiner steht in der Jobliste des Servers. Der Benachrichtigungsvertrag (`TEMPLATE_NOTIFICATIONS_API.md`) beschreibt die Nachrichten, die ein künftiger Synchronisierungsjob senden würde. Laden Sie Aktualisierungen bis dahin von Hand. |
| Ein Protokoll außer Dienst stellen | Umgesetzt | **Archivieren** nimmt es aus neuen Befunden heraus; bereits geschriebene Befunde behalten ihren Inhalt. **Als Entwurf wiederherstellen** bringt es zur Prüfung und erneuten Veröffentlichung zurück. |

**Lebenszyklus.** Entwurf, In Prüfung, Änderungen erforderlich, Genehmigt, Veröffentlicht, Archiviert. Die Namen der Aktionen folgen der Quelle: Bei CAP heißt der Freigabeschritt **Akzeptieren** und der Veröffentlichungsschritt **Freigeben**; bei RCPath heißen sie **Ratifizieren** und **Veröffentlichen**; bei Custom, PathScribe und ICCR heißen sie **Genehmigen** und **Veröffentlichen**. Die Steuerung (Selbstfreigabe, Anzahl der Prüfer, die 80-%-SNOMED-Regel) wird in der [Vorlagenprüfung](#screen-template_governance) festgelegt.

### Register Synoptik-Bibliothek {#screen-tab-protocols}
Breadcrumb: Startseite > Konfiguration > Synoptik-Bibliothek

**Status:** Umgesetzt

**1. Navigation:** Register **Synoptik-Bibliothek** unter Konfiguration
**2. Wartungspunkt:** Das Register, mit drei Unterseiten: **Aktive Protokolle** (Validierte, im Einsatz befindliche Checklisten), **Prüfwarteschlange** (Zur Genehmigung vorgemerkt) und **Alle Protokolle** (Vollständige Bibliothek).

**3. Geschäftlicher Zweck und Umfang.** Ein Ort für den gesamten Lebenszyklus der Protokolle. Das Register hat keine eigenen Felder; seine drei Navigationseinträge öffnen die folgenden Unterseiten.

**4. Voraussetzungen und Abhängigkeiten.** Öffnet sich für jede Person mit `screen:configuration:open`. Welche Aufsichtsbehörden in der Bibliothek erscheinen, wird unter [Aufsichtsbehörden](#screen-governing_bodies) festgelegt.

Setup step: Reference, not part of setup
Requires: [Aufsichtsbehörden](#screen-governing_bodies)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-protocols - Register Synoptik-Bibliothek mit Aktiven Protokollen, Prüfwarteschlange und Allen Protokollen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Aktive Protokolle | Navigationseintrag, „Validierte, im Einsatz befindliche Checklisten“ | Nicht zutreffend | Öffnet die [Aktiven Protokolle](#screen-protocols-active). | Ausgewählt |
| Prüfwarteschlange | Navigationseintrag, „Zur Genehmigung vorgemerkt“ | Nicht zutreffend | Öffnet die [Prüfwarteschlange](#screen-protocols-review). | Nicht ausgewählt |
| Alle Protokolle | Navigationseintrag, „Vollständige Bibliothek“ | Nicht zutreffend | Öffnet [Alle Protokolle](#screen-protocols-all). | Nicht ausgewählt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Aktionen verwenden die Protokollberechtigungen, die bei jeder Unterseite aufgeführt sind.
**Bekannte Grenzen.** Keine bekannt.

### Prüfwarteschlange {#screen-protocols-review}
Breadcrumb: Startseite > Konfiguration > Synoptik-Bibliothek > Prüfwarteschlange

**Status:** Umgesetzt

**1. Navigation:** Register **Synoptik-Bibliothek** unter Konfiguration > **Prüfwarteschlange**
**2. Wartungspunkt:** Protokolle, die vor der Veröffentlichung warten

**3. Geschäftlicher Zweck und Umfang.** Listet jedes Protokoll in einem Zustand vor der Veröffentlichung (In Prüfung, Änderungen erforderlich, Genehmigt), gruppiert nach anatomischer Kategorie, mit einer Zählkachel für jeden Zustand. Ein Banner wiederholt die Regel: Vorlagen benötigen vor der Veröffentlichung mindestens 80 % SNOMED-Abdeckung und eine klinische Freigabe. Klicken Sie auf eine Karte, um die Prüfansicht (In Prüfung, Genehmigt) oder den Editor (Änderungen erforderlich) zu öffnen. Protokolle im Entwurf erscheinen hier nicht; Sie finden sie unter Alle Protokolle.

**4. Voraussetzungen und Abhängigkeiten.** Benötigt die Prüfeinstellungen und die Rollen, die die Arbeit leisten. Überspringen Sie sie, wird die Freigabe abgelehnt, weil der Person die Berechtigung fehlt oder weil ein einzelner Autor versucht, die eigene Arbeit freizugeben.

Setup step: Tier 5, step 7
Requires: [Vorlagenprüfung](#screen-template_governance), [Rollen](#screen-staff-roles), [Aufsichtsbehörden](#screen-governing_bodies)
Unlocks: [Aktive Protokolle](#screen-protocols-active)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: protocols-review - Prüfwarteschlange mit Zustandszählern und Karten]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Vergleicht mit Protokollname, Kategorie oder Quelle. | Leer |
| Zustandskacheln | Schreibgeschützte Zähler: In Prüfung, Änderungen erforderlich, Genehmigt | Nicht zutreffend | | Nicht zutreffend |
| Protokoll hochladen | Schaltfläche | Nicht zutreffend | Öffnet das [Fenster Hochladen](#ch6-upload-window). | Nicht zutreffend |
| Erstellen / Anpassen | Schaltfläche | Nicht zutreffend | Öffnet das [Fenster Erstellen](#ch6-build-window). | Nicht zutreffend |
| Karte: Name, Version, Quellenkennzeichen, Typ, Eigentümer | Schreibgeschützter Text | Nicht zutreffend | Protokolldaten. | Nicht zutreffend |
| Karte: Lebenszykluskennzeichen | Schreibgeschützt: In Prüfung, Änderungen erforderlich, Genehmigt | Nicht zutreffend | | Nicht zutreffend |
| Karte: Prüfnotiz | Schreibgeschützter Text | Nicht zutreffend | Die letzte Notiz des Prüfers, angezeigt mit einer Rückgabe- oder Warnmarkierung. | Leer |
| Aktion der Karte | Öffnet die Prüfansicht („Prüfer öffnen“ oder „Prüfansicht öffnen, um zu veröffentlichen“, wenn Genehmigt) oder den Editor („Editor öffnen, um Änderungen zu bearbeiten“) | Nicht zutreffend | | Nicht zutreffend |

#### Aktionen der Prüfansicht {#ch6-reviewer-actions}
Die Prüfseite (von einer Karte aus geöffnet) verschiebt ein Protokoll zwischen den Zuständen. Jede Verschiebung verlangt eine Bestätigung und, bei einer Rückgabe, einen Grund.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Als „In Prüfung“ markieren | Schaltfläche | Nicht zutreffend | Stellt einen Entwurf in die Prüfwarteschlange. | Nicht zutreffend |
| Genehmigen (CAP: Akzeptieren; RCPath: Ratifizieren) | Schaltfläche mit Bestätigung und optionalen Schlussnotizen | Optionale Notizen | Benötigt `config:protocol:approve`. Eine Person, die die Vorlage erstellt oder bearbeitet hat, kann sie nicht genehmigen, außer die Selbstfreigabe ist eingeschaltet, und kann nicht zweimal genehmigen. | Nicht zutreffend |
| Veröffentlichen (CAP: Freigeben) | Schaltfläche mit Bestätigung | Nicht zutreffend | Benötigt `config:protocol:publish`, die erforderliche Anzahl unabhängiger Freigaben und bei einer diagnostischen Vorlage mindestens 80 % SNOMED-Abdeckung auf Feldebene. Das Veröffentlichen macht sie allen Pathologen gleichzeitig verfügbar. | Nicht zutreffend |
| Änderungen erforderlich | Schaltfläche mit erforderlichem Grund | Grund erforderlich | Gibt das Protokoll an den Autor zurück. Benötigt `config:protocol:approve`. | Nicht zutreffend |
| Auf Entwurf zurücksetzen | Schaltfläche | Nicht zutreffend | Setzt ein Protokoll auf Entwurf zurück. | Nicht zutreffend |

**7. Berechtigungen.** Entwerfen, importieren, erstellen, speichern, einreichen: `config:protocol:draft`. Genehmigen und zur Änderung zurückgeben: `config:protocol:approve`. Veröffentlichen: `config:protocol:publish`. Außer Dienst stellen (archivieren, wiederherstellen): `config:protocol:retire`. Alle mit hohem Risiko und protokolliert. Template Author besitzt draft; Template Approver besitzt approve, publish und retire; Admin besitzt alle vier; Lab Director besitzt alle außer draft. Einreichen, Zurückgeben, Genehmigen und Veröffentlichen senden jeweils eine Benachrichtigung (an die Freigebenden, den Autor und so weiter).
**Bekannte Grenzen.** Die Prüfansicht und der Editor sind eigene Vollseiten (`/template-review/:id`, `/template-editor/:id`). Ihre Feld-für-Feld-Referenz gehört nicht zu den 15 Bildschirmen dieses Kapitels; siehe [Felder des Vorlageneditors](#ch6-protocol-editor).
### Aktive Protokolle {#screen-protocols-active}
Breadcrumb: Startseite > Konfiguration > Synoptik-Bibliothek > Aktive Protokolle

**Status:** Umgesetzt

**1. Navigation:** Register **Synoptik-Bibliothek** unter Konfiguration > **Aktive Protokolle**
**2. Wartungspunkt:** Veröffentlichte Protokolle

**3. Geschäftlicher Zweck und Umfang.** Die Checklisten, die derzeit im Arbeitsablauf der synoptischen Befundung angeboten werden (Zustand Veröffentlicht), nach Kategorie gruppiert und nach Chirurgische Pathologie, Nicht-gynäkologische Zytologie, GYN-Zytologie oder Zuschnitt filterbar. Klicken Sie auf eine Zeile, um sie für Statistiken, die Lebenszyklusanzeige und Aktionen aufzuklappen.

**4. Voraussetzungen und Abhängigkeiten.** Protokolle gelangen in diese Liste, indem sie aus der Prüfwarteschlange veröffentlicht werden; arbeiten Sie daher zuerst die Warteschlange ab. Überspringen Sie sie, ist die Liste leer („Keine Protokolle gefunden“).

Setup step: Tier 5, step 8
Requires: [Prüfwarteschlange](#screen-protocols-review), [Aufsichtsbehörden](#screen-governing_bodies)
Unlocks: [Routing-Regeln](#screen-templates-routing)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: protocols-active - Aktive Protokolle nach Kategorie gruppiert mit einer aufgeklappten Zeile]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Gruppenfilter | Auswahl: Alle, Chirurgische Pathologie, Nicht-gynäkologische Zytologie, GYN-Zytologie, Zuschnitt, jeweils mit einer Anzahl | Optional | | Alle |
| Suche | Text | Optional | Vergleicht mit Name, Kategorie oder Quelle. | Leer |
| Protokoll hochladen | Schaltfläche | Nicht zutreffend | Öffnet das [Fenster Hochladen](#ch6-upload-window). | Nicht zutreffend |
| Erstellen / Anpassen | Schaltfläche | Nicht zutreffend | Öffnet das [Fenster Erstellen](#ch6-build-window). | Nicht zutreffend |
| Zeile: Name, Version, Quellenkennzeichen, Typ, Lebenszykluskennzeichen | Schreibgeschützter Text | Nicht zutreffend | | Nicht zutreffend |
| Abschnitte | Schreibgeschützte Zahl | Nicht zutreffend | Ein Schätzwert: die Anzahl der Felder geteilt durch 7, gerundet, mindestens 1. Es ist keine Zählung der tatsächlichen Abschnitte des Protokolls. | Nicht zutreffend |
| Felder | Schreibgeschützte Zahl | Nicht zutreffend | | Nicht zutreffend |
| Zuletzt geändert | Schreibgeschützter Text | Nicht zutreffend | | Nicht zutreffend |
| Eigentümer | Schreibgeschützter Text | Nicht zutreffend | | Nicht zutreffend |
| SNOMED-CT-Abdeckung, ICD-10/11-Abdeckung | Schreibgeschützte Balken, Prozent | Nicht zutreffend | Abdeckung der Codierung auf Feldebene. | Nicht zutreffend |
| Protokoll ansehen | Schaltfläche | Nicht zutreffend | Öffnet die schreibgeschützte Prüfansicht. | Nicht zutreffend |
| Duplizieren | Schaltfläche | Nicht zutreffend | Öffnet den Editor mit einer Kopie (ein neues Protokoll). | Nicht zutreffend |
| JSON exportieren | Schaltfläche | Nicht zutreffend | Lädt das Protokoll als PathScribe-JSON-Datei herunter; der Export wird protokolliert. | Nicht zutreffend |
| Neue Version | Schaltfläche | Nicht zutreffend | Öffnet den Editor mit der nächsten Version. Das Veröffentlichen der neuen Version archiviert diese. | Nicht zutreffend |
| Archivieren | Schaltfläche mit Bestätigung | Nicht zutreffend | Nimmt es aus neuen Befunden heraus. Ein veröffentlichtes Protokoll zeigt eine deutlichere Warnung. Bereits geschriebene Befunde behalten ihren Inhalt. Benötigt `config:protocol:retire`. | Nicht zutreffend |

**7. Berechtigungen.** Wie bei der [Prüfwarteschlange](#screen-protocols-review). Ansehen und Exportieren benötigen nur den Bildschirm.
**Bekannte Grenzen.** Die Angabe Abschnitte ist ein Schätzwert.

### Alle Protokolle {#screen-protocols-all}
Breadcrumb: Startseite > Konfiguration > Synoptik-Bibliothek > Alle Protokolle

**Status:** Umgesetzt

**1. Navigation:** Register **Synoptik-Bibliothek** unter Konfiguration > **Alle Protokolle**
**2. Wartungspunkt:** Die vollständige Bibliothek

**3. Geschäftlicher Zweck und Umfang.** Jedes Protokoll in jedem Zustand, nach Kategorie gruppiert. Dies ist die einzige Stelle, an der Sie Entwürfe und archivierte Protokolle finden und ein archiviertes wiederherstellen können.

**4. Voraussetzungen und Abhängigkeiten.** Keine, außer dass die Bibliothek Inhalt hat.

Setup step: Reference, not part of setup
Requires: [Prüfwarteschlange](#screen-protocols-review)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: protocols-all - Alle Protokolle mit Statusfilter-Schaltflächen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Statusfilter | Auswahl: Alle, Veröffentlicht, Genehmigt, In Prüfung, Änderungen erforderlich, Entwurf, Archiviert, jeweils mit einer Anzahl | Optional | **Alle** blendet archivierte Protokolle aus; sie erscheinen nur unter **Archiviert**. | Alle |
| Suche | Text | Optional | Vergleicht mit Name, Kategorie oder Quelle. | Leer |
| Protokoll hochladen, Erstellen / Anpassen | Schaltflächen | Nicht zutreffend | Wie oben. | Nicht zutreffend |
| Zeile: Name, Version, Quelle, Typ, Lebenszykluskennzeichen, Prüfnotiz | Schreibgeschützt | Nicht zutreffend | | Nicht zutreffend |
| Prüfer öffnen | Schaltfläche, nicht bei Veröffentlicht oder Archiviert | Nicht zutreffend | | Nicht zutreffend |
| Editor öffnen | Schaltfläche, nicht bei Veröffentlicht oder Archiviert | Nicht zutreffend | | Nicht zutreffend |
| Duplizieren, JSON exportieren, Archivieren | Schaltflächen | Nicht zutreffend | Wie bei Aktive Protokolle (Duplizieren und Archivieren werden bei einer archivierten Zeile nicht angeboten). | Nicht zutreffend |
| Als Entwurf wiederherstellen | Schaltfläche, nur bei archivierten Zeilen | Nicht zutreffend | Bringt ein archiviertes Protokoll als Entwurf zurück; es muss die Prüfung erneut durchlaufen. | Nicht zutreffend |

**7. Berechtigungen.** Wie bei der Prüfwarteschlange.
**Bekannte Grenzen.** Keine bekannt.

#### Fenster Hochladen {#ch6-upload-window}
Breadcrumb: Startseite > Konfiguration > Synoptik-Bibliothek > Protokoll hochladen

[SCREENSHOT PLACEHOLDER: protocols-upload - Fenster Protokoll hochladen mit Aufsichtsgremium und Ablagebereich für Dateien]

Untertitel: „Manueller Upload — Ausweichlösung, falls die nächtliche Synchronisierung ein Update verpasst“. Ein Warnhinweis besagt, dass ein importiertes Protokoll als Entwurf gespeichert wird und zur Prüfung eingereicht und freigegeben werden muss, bevor es veröffentlicht werden kann.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Aufsichtsgremium | Auswahl: CAP, RCPath, ICCR, RCPA, Andere | Pflicht | Wird als Quelle des Entwurfs festgehalten. | CAP |
| Datei | JSON-, XML- oder XLSX-Datei, bis 10 MB, abgelegt oder durchsucht | Pflicht | Wird gelesen und geprüft, sobald sie gewählt ist. | Keine |
| Ergebnis der Formatprüfung | Schreibgeschützte Liste | Nicht zutreffend | Nennt, ob das Format gültig ist, listet Probleme auf und stellt stets fest, dass der Inhalt nicht gegen CAP oder RCPath verifiziert ist. Nur ein PathScribe-JSON-Protokoll ist importierbar. Ein CAP-eCC-XML-Formular (SDC) oder eine Excel-Arbeitsmappe wird geprüft, kann aber „hier geprüft, aber noch nicht importiert werden“. | Nicht zutreffend |
| Als Entwurf importieren | Schaltfläche | Nicht zutreffend | Speichert den Entwurf. Wird abgelehnt, wenn ein Protokoll mit demselben Namen existiert oder ohne `config:protocol:draft`. | Deaktiviert, bis die Datei importierbar ist |

#### Fenster Erstellen / Anpassen {#ch6-build-window}
Breadcrumb: Startseite > Konfiguration > Synoptik-Bibliothek > Erstellen / Anpassen

[SCREENSHOT PLACEHOLDER: protocols-build - Fenster Erstellen / Anpassen]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Von Grund auf neu beginnen | Auswahl | Optional | Öffnet den Editor mit einer leeren Vorlage. | Nicht zutreffend |
| Suche Bestehende Vorlage | Text | Optional | Sucht nach Name, Quelle oder Kategorie. | Leer |
| Bestehende Vorlage | Auswahl aus der Bibliothek, jeweils mit Version und Feldanzahl | Optional | Die Vorlage, die kopiert wird. | Keine |
| Diese Vorlage anpassen | Schaltfläche | Nicht zutreffend | Öffnet den Editor mit einer Kopie. | Nicht zutreffend |

#### Felder des Vorlageneditors {#ch6-protocol-editor}
Breadcrumb: Startseite > Konfiguration > Synoptik-Bibliothek > Vorlageneditor

[SCREENSHOT PLACEHOLDER: protocols-editor - Editor für synoptische Vorlagen mit Metadaten, Abschnitten und Feldern]

Der Editor ist eine Vollseite. Sein Block **Vorlagen-Metadaten** steht unten; Abschnitte und Felder haben viele weitere Einstellungen (Feldtyp, Antwortoptionen mit SNOMED- und ICD-Codierung, Bedingungen, Zählregeln, Befundrollen pT, pN, pM, FIGO-Stadium und Blockkennung). Die vollständige Referenz für diese Seite ist eine offene Frage für das Handbuch.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Vorlagenname | Text | Pflicht | Muss unter den nicht archivierten Protokollen eindeutig sein. | Leer |
| Anatomische Kategorie | Auswahl über Kategorieschaltflächen | Optional | Gruppiert das Protokoll in den Listen. | Leer |
| Quelle / Fachgesellschaft | Auswahl über Quellenschaltflächen | Pflicht | Bestimmt die Namen der Aktionen (Akzeptieren, Ratifizieren, Genehmigen). | Custom |
| Klassifikationssystem | Text | Optional | Bei Zytologiesystemen zum Beispiel die Ausgabe des Bethesda-Systems. | Leer |
| Stadieneinteilung (Auflage) | Text | Optional | Zum Beispiel `AJCC 8th`. | Leer |
| Version | Haupt-, Neben- und Patch-Nummer mit Schaltflächen zum Erhöhen | Pflicht | Wird bei Neue Version automatisch erhöht. | `1.0.0` |
| Entwurf speichern | Schaltfläche | Nicht zutreffend | Benötigt `config:protocol:draft`. | Nicht zutreffend |
| Zur Prüfung einreichen | Schaltfläche mit Bestätigung | Nicht zutreffend | Verschiebt die Vorlage in die Prüfwarteschlange und benachrichtigt Administratoren und klinische Leitungen. Sie können sie nicht bearbeiten, bis sie zurückgegeben wird. | Nicht zutreffend |

## Geplanter Befundversand und Regeln zur automatischen Verteilung {#ch6-scheduled-delivery}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance

Drei Einstellungen bestimmen, was nach der Freigabe mit einem Befund geschieht: Die **Zustellungs-Konfigurationsregeln** wählen die Kanäle, die **Druckziel-Weiterleitungsregeln** wählen den Drucker für den Druckkanal, und die **Zustellzeitpläne** wählen den Zeitpunkt. Ein vierter Bildschirm, **Meine Exporte**, listet Dateien auf, die eine Person angefordert hat.

**Status der Kanäle, einzeln.**

| Kanal | Status | Was heute vorhanden ist |
|---|---|---|
| Fax | Umgesetzt | Eine Zustellungsregel kann einen Kanal auf E-Fax mit einer Faxnummer setzen (7 bis 15 Ziffern, optional ein führendes `+`). PathScribe sendet die signierte PDF-Datei und ihre Angaben als Nachricht `REPORT_DELIVERY` an den Schnittstellenserver; der Server übergibt sie an ein E-Mail-zu-Fax-Gateway. Das Gateway wird auf dem Server eingerichtet, nicht in PathScribe. Hat der Server keinen Faxkanal, antwortet er mit 503, und die Zustellung scheitert mit diesem Grund. Vertrag: `REPORT_DELIVERY_API.md`; Empfänger für die Entwicklung: `functions/report_delivery.py`. Maximale PDF-Größe 20 MB. |
| Portal | Nicht umgesetzt | In den Zustellungsregeln gibt es keinen Portalkanal. Der Datensatz der Einrichtung hat eine Auswahl **Übermittlungsart** (E-Mail, Fax, Portal, HL7), die gespeichert wird, aber nichts liest sie, wenn ein Befund gesendet wird. |
| Sichere E-Mail | Demonstration | Kein Kanal einer Zustellungsregel. Eine Person startet aus einem Fenster eine fallbezogene sichere Nachricht; sie wird an den [Simulierten Postausgang](#screen-simulated_mail) zugestellt, und nichts verlässt das Haus. Ein echter E-Mail-Kanal ist nicht angebunden. |
| Druckwarteschlange | Umgesetzt | Der Kanal Druck erzeugt einen Druckauftrag. Der Drucker stammt aus den Druckweiterleitungsregeln, sonst aus dem eigenen Standardziel der Einrichtung. Die Aufträge werden auf dem Bildschirm Druckwarteschlange verwaltet (siehe [Teil 4](#ch6-batch-jobs)). |
| Elektronisch (Befundnachricht) | Umgesetzt | Die Befundnachricht an die Schnittstellen-Engine. Sie ist der Standard, wenn keine Regel zutrifft. |
| Dateiablage | Umgesetzt | Der Server schreibt die PDF-Datei in einen Ordner oder ein SFTP-Ziel. Die Regel nennt das Ziel; der Server hält seine Adresse und die Anmeldedaten. |

### Zustellungs-Konfigurationsregeln {#screen-delivery_rules}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Zustellungs-Konfigurationsregeln

**Status:** Umgesetzt

**1. Navigation:** Register **System** unter Konfiguration > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Zustellungs-Konfigurationsregeln

**3. Geschäftlicher Zweck und Umfang.** Legt fest, wie jeder freigegebene Befund gesendet wird: über die Befundnachricht, gedruckt, gefaxt, in ein Dateiziel abgelegt oder zur manuellen Abholung zurückgehalten. Eine Regel trifft zu anhand von Leistungserbringer, auftraggebender Einrichtung, Patientenstandort (Behandlungsort) und Berichtstyp. Es gewinnt die Regel, die die meisten Felder trifft. Trifft nichts zu, geht der Befund **Nur elektronisch**. Der Bildschirm enthält außerdem die Einstellung des Standorts für automatische Wiederholungen und ein Testbedienfeld.

**4. Voraussetzungen und Abhängigkeiten.** Regeln verweisen auf Leistungserbringer, Einrichtungen und Standorte, und ein Druckkanal braucht einen Ort zum Drucken. Überspringen Sie die Einrichtungen und Ärzte, sind die Kriterienlisten leer. Überspringen Sie die Druckweiterleitung, fällt ein Druckauftrag auf das eigene Standardziel der Einrichtung zurück.

Setup step: Tier 5, step 10
Requires: [Einrichtungskonfiguration](#screen-clients), [Ärzte](#screen-physicians), [Druckziel-Weiterleitungsregeln](#screen-print_routing_rules)
Unlocks: [Zustellzeitpläne](#screen-delivery_schedules)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-delivery_rules - Zustellungs-Konfigurationsregeln mit Regeltabelle, Wiederholungseinstellung und Testbedienfeld]

**6. Feldreferenz.**

Bedienelemente des Bildschirms:

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Regeltabelle: Kriterien, Kanäle, Notiz | Schreibgeschützte Liste | Nicht zutreffend | Die Kriterien lauten Leistungserbringer, Einrichtung, Standort und Bericht oder „Trifft auf jeden Fall zu (niedrigste Priorität)“. Die Kanäle lauten Listen Primär, Sekundär und Ersatz oder „Es wird nichts gesendet“. | Leer: Jeder Fall wird zu Nur elektronisch aufgelöst |
| Regel hinzufügen | Schaltfläche | Nicht zutreffend | Öffnet das Regelfenster. | Nicht zutreffend |
| Bearbeiten, Löschen | Zeilenschaltflächen | Nicht zutreffend | | Nicht zutreffend |
| Automatische Wiederholungen: Wartezeit vor jeder (Minuten) | Ganze Minuten, durch Kommas getrennt, jeweils 1 bis 1.440, höchstens 10 | Optional | Ein Druck, ein Fax oder eine Dateiablage, der oder das scheitert, wird nach jeder Wartezeit der Reihe nach erneut versucht. Nach dem letzten Versuch geht er in die Versandausnahmen, Admin und Lab Director erhalten eine Nachricht, und die Ersatzkanäle der Regel werden gesendet. Leer bedeutet keine Wiederholungen. | `1, 5, 15` |
| Wiederholungen speichern | Schaltfläche | Nicht zutreffend | Benötigt `config:delivery-rules:manage`. | Nicht zutreffend |

#### Zustellungsregel hinzufügen oder bearbeiten {#ch6-delivery-rule-window}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Zustellungs-Konfigurationsregeln > Regel hinzufügen

[SCREENSHOT PLACEHOLDER: system-delivery_rules-edit - Fenster Zustellungsregel hinzufügen mit Kriterien und Kanälen]

Jedes Kriterium ist optional. Eine Regel ohne gesetzte Kriterien trifft auf jeden Fall zu, aber nur als Treffer mit der niedrigsten Priorität. Das Fenster weist darauf hin.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Leistungserbringer | Auswahlliste der Ärzte | Optional | | Beliebiger Leistungserbringer |
| Auftraggebende Einrichtung | Auswahlliste der Einrichtungen | Optional | | Beliebige Einrichtung |
| Patientenstandort (Behandlungsort) | Auswahlliste der Standorte | Optional | | Beliebiger Standort |
| Berichtstyp | Auswahl: Vorläufig, Endgültig, Korrigiert, Nachtrag | Optional | | Beliebiger Berichtstyp |
| Kanal: Elektronisch (Befundnachricht an die Schnittstellen-Engine) | Auswahl: Aus, Primär, Sekundär, Ersatz | Optional | Primäre und sekundäre Kanäle werden sofort gesendet. Ersatzkanäle werden gesendet, wenn ein primärer Druck, ein Fax oder eine Dateiablage kein Ziel hat oder nach seinen Wiederholungen noch scheitert. | Aus |
| Kanal: Druck | Wie oben | Optional | | Aus |
| Kanal: E-Fax | Wie oben | Optional | | Aus |
| Kanal: Dateiablage | Wie oben | Optional | | Aus |
| Faxnummer | Text, 7 bis 15 Ziffern mit optionalem `+` | Optional | Leer lassen, um an den anfordernden Arzt zu faxen, oder ohne Faxnummer an die anfordernde Einrichtung. | Leer |
| Ziel der Dateiablage | Text, der Name des Ziels, wie auf dem Schnittstellenserver eingerichtet | Pflicht, wenn Dateiablage eingeschaltet ist | Der Ordner oder SFTP-Server und seine Anmeldedaten werden auf dem Server gehalten, nicht in PathScribe. | Leer |
| Notiz | Text | Optional | Warum die Regel besteht. | Leer |

Ein Ersatzkanal ohne primären Kanal wird abgelehnt („Ein Ersatzkanal braucht einen primären Kanal“). Eine Faxnummer, die nicht 7 bis 15 Ziffern hat, oder eine Dateiablage ohne Ziel wird abgelehnt.

#### Zustellungsauflösung testen {#ch6-delivery-test}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Zustellungs-Konfigurationsregeln > Test

[SCREENSHOT PLACEHOLDER: system-delivery_rules-test - Bedienfeld Zustellungsauflösung testen]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Leistungserbringer, Auftraggebende Einrichtung, Patientenstandort, Berichtstyp | Auswahlfelder, wie oben | Optional | Die Falldetails, die getestet werden. | Beliebig |
| Auflösen | Schaltfläche | Nicht zutreffend | Zeigt die zutreffende Regel, die aufgelöste Aktion (Nur elektronisch, Nur Druck, Duale Zustellung, Unterdrücken) und den Kanalplan. Ohne Treffer meldet sie, dass der Standard Nur elektronisch gilt. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Regeln hinzufügen, ändern, löschen und Wiederholungen speichern: `config:delivery-rules:manage` (hohes Risiko, protokolliert). Admin und Lab Director besitzen sie. Das erneute Senden einer fehlgeschlagenen Zustellung verwendet die Bildschirme Druckwarteschlange oder Ausgangswarteschlange und deren eigene Berechtigungen.
**Bekannte Grenzen.** Fax und Dateiablage setzen voraus, dass auf dem Schnittstellenserver diese Kanäle und Ziele eingerichtet sind. Portal ist Nicht umgesetzt. Sichere E-Mail ist hier kein Kanal.

### Zustellzeitpläne {#screen-delivery_schedules}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Zustellzeitpläne

**Status:** Teilweise

**1. Navigation:** Register **System** unter Konfiguration > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Zustellzeitpläne

**3. Geschäftlicher Zweck und Umfang.** Legt fest, **wann** etwas gesendet wird, je Schnittstelle, für das gesamte Unternehmen, mit einer optionalen Überschreibung für eine durchführende Einrichtung. Register erhalten je einen eigenen Zeitplan. PathScribe entscheidet, wann ein Eintrag seine Warteschlange verlassen darf; die Schnittstellen-Engine entscheidet, wie er gesendet wird. Schnittstellen: Befundzustellung, Abrechnungszustellung, Befundschnittstelle, Aufnahmeschnittstelle (ADT), Eingangsschnittstelle, LIS-Abgleich, Register. **Teilweise:** Der Zeitplan wird gespeichert, aufgelöst und ausgewertet, und die Ausgangswarteschlange zeigt für jeden Eintrag die geplante Zeit und die Markierung der Meldefrist. Der Vertrag besagt, dass der Produktionsserver dieselben Regeln anwenden muss, bevor er einen Eintrag weitergibt; ein Browser- oder Entwicklungs-Build hält ein Senden nicht bis zu seiner Zeit zurück.

**4. Voraussetzungen und Abhängigkeiten.** Eine Überschreibung für eine Einrichtung wählt aus den Einrichtungen; diese kommen daher zuerst. Überspringen Sie das, kann nur der Zeitplan des Unternehmens festgelegt werden.

Setup step: Tier 5, step 11
Requires: [Einrichtungskonfiguration](#screen-clients), [Zustellungs-Konfigurationsregeln](#screen-delivery_rules)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-delivery_schedules - Zustellzeitpläne je Schnittstelle mit Geltungsbereich Unternehmen und Einrichtung]

**6. Feldreferenz.**

Bedienelemente des Bildschirms:

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Zeitpläne für | Auswahl: Gesamtes Unternehmen oder eine durchführende Einrichtung | Optional | Der Geltungsbereich, der bearbeitet wird. | Gesamtes Unternehmen |
| Karte der Schnittstelle: Zusammenfassung und Quelle | Schreibgeschützter Text | Nicht zutreffend | Die Zusammenfassung lautet zum Beispiel „Sammellauf Mo, Mi um 06:00 (America/New_York)“. Die Quelle lautet „Kein Zeitplan festgelegt: Sofortversand“, „Folgt dem Unternehmenszeitplan“ oder „Für diese Einrichtung festgelegt“. | Sofort gesendet |
| Karten der Register | Eine Karte je Register | Optional | Jedes Register hat seinen eigenen Zeitplan und übernimmt nie den eines anderen. | 240 Minuten nach der Freigabe zurückhalten; eine Änderung stellt erneut in die Warteschlange |
| Bearbeiten, Für diese Einrichtung festlegen, Unternehmen folgen | Schaltflächen | Nicht zutreffend | Erstellen oder entfernen eine Überschreibung für die Einrichtung. Das Entfernen bewirkt, dass die Einrichtung dem Unternehmen folgt. | Nicht zutreffend |

#### Zeitplan-Editor {#ch6-schedule-editor}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Zustellzeitpläne > Bearbeiten

[SCREENSHOT PLACEHOLDER: system-delivery_schedules-edit - Zeitplan-Editor]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Art des Versands | Auswahl: Sofort senden, Nur zu festgelegten Zeiten, Gesammelt zu festen Zeiten, Bis zur endgültigen Freigabe zurückhalten, Bei Freigabe, nach einer Prüffrist | Pflicht | | Sofort senden |
| Zeiten, in denen gesendet werden darf | Zeilen mit Tage, Von, Bis (24-Stunden-Format); Zeitraum hinzufügen / Entfernen | Pflicht bei festgelegten Zeiten | Jeder Zeitraum muss am selben Tag nach seinem Beginn enden. | Keine |
| Häufigkeit (Wie oft) | Auswahl: Täglich, Wöchentlich, Monatlich | Pflicht beim Sammellauf | | Keine |
| Tage des Sammellaufs | Wochentage Mo bis So | Pflicht bei wöchentlich | | Keine |
| Tage des Monats | Zahlen 1 bis 28, durch Kommas getrennt | Pflicht bei monatlich | | Keine |
| Zeiten des Sammellaufs (24 Std.) | Uhrzeiten wie `06:00, 22:00` | Pflicht beim Sammellauf | | Keine |
| Annahmeschluss (optional) | Uhrzeit, 24-Stunden-Format | Optional | Einträge, die an einem Lauftag nach dieser Zeit freigegeben werden, warten auf den nächsten Lauf. Leer verwendet die Laufzeit. | Leer |
| Prüffrist (Minuten nach der Freigabe) | Ganze Zahl, 1 bis 10.080 | Pflicht bei Prüffrist | Stimmen Sie sie auf das QA- und Änderungsfenster ab. | Keine |
| Tage ohne Versand | Daten `YYYY-MM-DD`, durch Kommas getrennt | Optional | Zum Beispiel Feiertage. Gilt für Zeiten und Sammellauf. | Leer |
| Zeitzone | IANA-Name, zum Beispiel `America/New_York` | Pflicht | Die obigen Zeiten gelten in dieser Zone. | Keine |
| Meldefrist (Tage ab Freigabe) | Ganze Zahl, 1 bis 3.650 | Optional | Die Warteschlange markiert Fälle nahe dieser Frist (innerhalb von 3 Tagen) oder nach deren Ablauf. | Leer |
| Eine Änderung stellt den Eintrag erneut in die Warteschlange | Ja/Nein-Schalter | Optional | Ein korrigierter Befund wird nach diesem Zeitplan erneut gesendet. Bei Registern standardmäßig eingeschaltet. | Aus, außer bei Registern |
| Zeitplan speichern | Schaltfläche | Nicht zutreffend | Wird abgelehnt, wenn ungültig oder ohne Berechtigung. | Nicht zutreffend |

#### Zeitplan ausprobieren {#ch6-schedule-test}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Zustellzeitpläne > Zeitplan ausprobieren

[SCREENSHOT PLACEHOLDER: system-delivery_schedules-test - Bedienfeld Zeitplan ausprobieren]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Schnittstelle | Auswahl der Schnittstellen | Pflicht | | Keine |
| Durchführende Einrichtung | Auswahl oder Keine (Unternehmenszeitplan) | Optional | | Keine |
| Register | Auswahl | Pflicht bei der Schnittstelle Register | | Keine |
| Datum und Uhrzeit (in der Zeitzone des Zeitplans) | Datum und Uhrzeit | Pflicht | | Jetzt |
| Der Fall ist endgültig freigegeben | Ja/Nein | Optional | | Nein |
| Freigegeben am | Datum und Uhrzeit | Optional | | Leer |
| Prüfen | Schaltfläche | Nicht zutreffend | Antwortet „Es wird gesendet“ oder „Es wartet“, mit dem Grund und der nächsten Gelegenheit. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:delivery-schedules:manage` (hohes Risiko, nur nach Schnittstelle, Einrichtung, Register und Art protokolliert; keine Patientendaten). Admin und Lab Director besitzen sie.
**Bekannte Grenzen.** Registerziele, Pflichtfelder, Freigabe der Inbetriebnahme und Transport gehören zur eigenen Einrichtung des Registers, nicht zum Zeitplan. Siehe `DELIVERY_SCHEDULES_API.md`.
### Druckziel-Weiterleitungsregeln {#screen-print_routing_rules}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Druckziel-Weiterleitungsregeln

**Status:** Umgesetzt

**1. Navigation:** Register **System** unter Konfiguration > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Druckziel-Weiterleitungsregeln

**3. Geschäftlicher Zweck und Umfang.** Legt fest, an welchen Netzwerkdrucker der Druckauftrag eines freigegebenen Befunds geht. Der Geltungsbereich einer Regel ist eine Ebene: **Arbeitsplatz / Benutzer**, **Standort**, **Kundenkonto (auftraggebende Einrichtung)** oder **Einrichtung (durchführendes Labor)**. Die spezifischste Ebene mit einer zutreffenden, aktiven Regel gewinnt unbedingt gegenüber weniger spezifischen Ebenen. Innerhalb einer Ebene kann eine Regel nach Proben- oder Fallart und nach Ereignisauslöser eingegrenzt werden. Trifft nichts zu, geht der Auftrag an das eigene Standardziel der Einrichtung.

**4. Voraussetzungen und Abhängigkeiten.** Eine Regel nennt einen Drucker, der über einen Standort-Agenten oder per Adresse erreicht wird, und einen Bereich aus Arbeitsplätzen, Standorten und Einrichtungen. Überspringen Sie die Standort-Agenten, kann nur eine Druckeradresse angegeben werden. Eine Einrichtungsregel muss die Drucker des eigenen Standort-Agenten dieser Einrichtung verwenden.

Setup step: Tier 5, step 9
Requires: [Standortagenten](#screen-site_agents), [Einrichtungskonfiguration](#screen-clients), [Arbeitsplätze](#screen-workstations)
Unlocks: [Zustellungs-Konfigurationsregeln](#screen-delivery_rules)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-print_routing_rules - Druckziel-Weiterleitungsregeln mit Tabelle und Testbedienfeld]

**6. Feldreferenz.**

Bedienelemente des Bildschirms:

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Regeltabelle: Bereich, Kriterien, Ziel, Notiz | Schreibgeschützte Liste | Nicht zutreffend | Die Kriterien lauten „Probe: ...“, „Auslöser: ...“ oder „Trifft auf jeden Job dieser Ebene zu“. | Leer: Aufträge verwenden das Standardziel jeder Einrichtung |
| Regel hinzufügen, Bearbeiten, Löschen | Schaltflächen | Nicht zutreffend | | Nicht zutreffend |

#### Druckweiterleitungsregel hinzufügen oder bearbeiten {#ch6-print-rule-window}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Druckziel-Weiterleitungsregeln > Regel hinzufügen

[SCREENSHOT PLACEHOLDER: system-print_routing_rules-edit - Fenster Druckweiterleitungsregel hinzufügen]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Bereichsebene | Auswahl: Arbeitsplatz / Benutzer, Standort, Kundenkonto (auftraggebende Einrichtung), Einrichtung (durchführendes Labor) | Pflicht | | Keine |
| Bereich | Arbeitsplatz- oder Benutzer-ID (Text, zum Beispiel `ws-fgh-theatre2-01`) oder eine Auswahlliste der Standorte oder Einrichtungen | Pflicht | Eine Warnung erscheint, wenn er fehlt. | Keine |
| Proben-/Fallart | Auswahl: Routine-Chirurgie, Schnellschnitt, Zytologie | Optional | | Beliebige Proben-/Fallart |
| Ereignisauslöser | Auswahl: Erstmalige Befundfreigabe, Korrigierte Befundfreigabe (Korrektur/Nachtrag), Vorläufig | Optional | | Beliebiger Ereignisauslöser |
| Druckziel: Drucker | Auswahl: Drucker des Standort-Agenten oder Druckeradresse (direkt gesendet) | Pflicht | Eine direkte Adresse funktioniert nur von einem PathScribe-Server innerhalb des Krankenhausnetzwerks; aus der Cloud verwenden Sie einen Drucker des Standort-Agenten. | Keine |
| Standort (ausführendes Labor) | Auswahlliste | Pflicht bei einem Drucker des Standort-Agenten | | Keine |
| Drucker | Auswahlliste der Befunddrucker des Standort-Agenten | Pflicht bei einem Drucker des Standort-Agenten | Benötigt die Berechtigung, die Drucker dieses Standorts zu sehen. | Keine |
| Adresse | IP-Adresse oder Hostname, ohne `http://` oder Pfad | Pflicht bei einer direkten Adresse | | Keine |
| Protokoll | Auswahl: IPP, LPR/LPD, Raw (Port 9100) | Pflicht bei einer direkten Adresse | | Keine |
| Port | Ganze Zahl 1 bis 65535 | Optional | | Der Standard des Protokolls |
| IPP-Pfad | Text | Optional, nur IPP | | `/ipp/print` |
| LPR-Warteschlange | Text | Optional, nur LPR/LPD | | `lp` |
| Name | Text | Optional | Ein verständlicher Name für den Drucker. | Leer |
| Notiz | Text | Optional | Warum die Regel besteht. | Leer |

#### Auflösung des Druckziels testen {#ch6-print-test}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Druckziel-Weiterleitungsregeln > Test

[SCREENSHOT PLACEHOLDER: system-print_routing_rules-test - Bedienfeld Auflösung des Druckziels testen]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Arbeitsplatz-/Benutzer-ID | Text | Optional | | Leer |
| Standort, Auftraggebende Einrichtung, Durchführende Einrichtung | Auswahlfelder | Optional | | Beliebig |
| Proben-/Fallart, Ereignisauslöser | Auswahlen | Optional | | Beliebig |
| Auflösen | Schaltfläche | Nicht zutreffend | Zeigt die zutreffende Regel und ihre Ebene sowie das ermittelte Ziel. Ohne Treffer meldet sie, dass der Auftrag auf das Standardziel der Einrichtung zurückfallen würde. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, ändern, löschen: `config:print-routing:manage` (hohes Risiko, protokolliert). Die Benennung eines Druckers des Standort-Agenten wird an diesem Standort geprüft, ebenso das Sehen seiner Drucker. Admin und Lab Director besitzen sie.
**Bekannte Grenzen.** Das Standardziel der Einrichtung, der Druckmodus (benannter Drucker über QZ Tray, Übergabe an die Schnittstellen-Engine oder direkter Netzwerkdruck) und das Papierformat werden im Register Drucken des Einrichtungsdatensatzes im [Einrichtungswörterbuch](#screen-facility-dictionary) festgelegt, nicht hier. Der direkte Netzwerkdruck benötigt einen PathScribe-Server oder Standort-Agenten innerhalb des Krankenhausnetzwerks; ein Browser kann keinen Drucker-Socket öffnen.

### Meine Exporte {#screen-my-exports}
Breadcrumb: Startseite > Meine Exporte

**Status:** Demonstration

**1. Navigation:** Die Schaltfläche für Exporte in der oberen Leiste, die die Anzahl der zum Herunterladen bereiten Exporte anzeigt. Die Schaltfläche erscheint nur, wenn ein API-Server verbunden ist; öffnen Sie in der Demonstration die Seite unter `/my-exports`.
**2. Wartungspunkt:** Die eigenen Exportdateien der angemeldeten Person

**3. Geschäftlicher Zweck und Umfang.** Große Exporte (QA-, Prüf-, Entsorgungs- und Suchberichte) werden als Hintergrundjobs vorbereitet. Die Person fordert an, erfährt, wann die Datei bereit ist, und lädt sie hier herunter. Dateien werden 7 Tage aufbewahrt, und nur die Person, die angefordert hat, kann sie herunterladen. In dieser Demonstration werden Exporte sofort heruntergeladen, daher ist die Liste normalerweise leer. Ein Banner kennzeichnet den simulierten Server: Exporte werden im Browser vorbereitet und nur bis zur Abmeldung aufbewahrt. Der API-Vertrag ist `ASYNC_EXPORT_API.md`; bei verbundenem PathScribe-Server wird ein großer Export dort vorbereitet und erscheint hier, wenn er bereit ist.

**4. Voraussetzungen und Abhängigkeiten.** Keine, um die Seite zu öffnen. Ein Export erscheint nur, wenn seine eigene Exportberechtigung vergeben wurde (zum Beispiel `qa:deficiencies:export`); vergeben Sie diese daher unter den Rollen der Mitarbeitenden an die Personen, die sie brauchen.

Setup step: Reference, not part of setup
Requires: [Rollen](#screen-staff-roles)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-my-exports - Liste Meine Exporte mit Status, Zeilen und Download]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Export | Schreibgeschützter Text | Nicht zutreffend | Der Titel des Exports. | Nicht zutreffend |
| Angefordert | Schreibgeschütztes Datum mit Uhrzeit | Nicht zutreffend | | Nicht zutreffend |
| Status | Schreibgeschützt: Wartet, Wird vorbereitet, Fertig, Fehlgeschlagen, Abgebrochen, Abgelaufen | Nicht zutreffend | | Nicht zutreffend |
| Zeilen | Schreibgeschützte Zahl | Nicht zutreffend | | Nicht zutreffend |
| Gelöscht nach | Schreibgeschütztes Datum | Nicht zutreffend | Sieben Tage nach der Anforderung. | Nicht zutreffend |
| Aktionen: Herunterladen, Abbrechen | Schaltflächen | Nicht zutreffend | Herunterladen, wenn Fertig; Abbrechen, solange Wartet oder Wird vorbereitet. | Nicht zutreffend |
| Aktualisieren | Schaltfläche | Nicht zutreffend | | Nicht zutreffend |
| Exporte verlängern (zum Testen der Wartezeit) | Ja/Nein-Schalter, nur auf dem simulierten Server angezeigt | Optional | Ein Bedienelement für die Demonstration. | Aus |

**7. Berechtigungen.** Die Seite benötigt nur eine angemeldete Person und listet deren eigene Exporte auf. Jeder Export wird unter seiner eigenen Berechtigung `...:export` angefordert, die ein hohes Risiko hat und als `DOCUMENT_EXPORTED` mit der Zeilenanzahl protokolliert wird.
**Bekannte Grenzen.** Die Serverseite ist nicht angebunden. Konfigurationsexporte (Wörterbücher, Crosswalks, die Ärzteliste) sind klein, bleiben im Browser und erscheinen hier nicht. Geplante Läufe gespeicherter Berichte (Seite Suche, Bericht > Zeitpläne) sind simuliert und senden nichts; sie haben einen eigenen Vertrag in `SCHEDULED_REPORTS_API.md`.

## Einrichtung des Stapeldrucks und des nächtlichen Job-Schedulers {#ch6-batch-jobs}
Breadcrumb: Startseite > Konfiguration

**Status dieses Teils:** Teilweise. Es gibt keinen einzelnen Bildschirm „Stapeldruck und nächtlicher Job-Scheduler“, und ein Administrator kann keinen geplanten Job anlegen oder bearbeiten. Was vorhanden ist, steht unten, mit dem Kapitel, das jeden Bildschirm dokumentiert.

| Punkt | Status | Wo es konfiguriert wird | Wo es dokumentiert ist |
|---|---|---|---|
| Druckwarteschlange (zurückhalten, freigeben, abbrechen, wiederholen, umleiten, Sammelaktionen) | Umgesetzt | Die Aufträge werden unter Systemprotokolle > Schnittstellenprotokoll > Druckwarteschlange verwaltet. Drucker und Weiterleitung werden in den [Druckziel-Weiterleitungsregeln](#screen-print_routing_rules) und im Register Drucken der Einrichtung festgelegt. | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) |
| Sammeln von Druckaufträgen („Sammelauftrag jetzt ausführen“) | Teilweise | Eine Schaltfläche auf dem Bildschirm Druckwarteschlange mit Beginn und Ende eines Zeitfensters (24-Stunden-Zeiten, als UTC gelesen) und einer Auswahl der Gruppierung (Kundenkonto oder Zustellroute). Sie fasst die in das Fenster fallenden, in die Warteschlange gestellten, nicht über die Schnittstelle laufenden und freigegebenen Aufträge unter gemeinsamen Sammelkennungen zusammen. Sie läuft nur, wenn jemand sie drückt. Ein wiederkehrender Job namens `print.batchAggregation` erscheint in der Jobliste des Servers ohne festes Intervall, doch in diesem Build ist kein Zeitplan festgelegt. | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) |
| Stapelnachdruck von Etiketten | Umgesetzt | Chargenverwaltung > Etiketten nachdrucken: Fälle nach Eingangsdatum oder -nummer suchen, Kassetten, Probenbehälter oder Anforderungen auswählen, einen Kassettendrucker wählen und jeweils ein Etikett nachdrucken. Jedes Etikett wird protokolliert; fehlgeschlagene Etiketten können wiederholt werden. Benötigt `label:batch:reprint`. | [Chargenverwaltung](#screen-batch-management) |
| Geplante Exporte | Demonstration | Gespeicherte Fallsuchberichte können von der Seite Suche aus unter Bericht > Zeitpläne geplant werden (täglich, wöchentlich oder monatlich). Ein Lauf ist simuliert und sendet nichts. Große Exporte laufen als Hintergrundjobs und stehen unter [Meine Exporte](#screen-my-exports). | `SCHEDULED_REPORTS_API.md`, `ASYNC_EXPORT_API.md` |
| Serveraufträge (Zustand der Warteschlange, Dead Letters, erneut einreihen) | Umgesetzt, nur Lesen und erneutes Einreihen | Systemprotokolle > Serveraufträge. Zeigt die Jobarten (Schnittstellenversand, Zustellversuch, Druckversand, Freigabe zurückgehaltener Befunde, Leistungsversand, Exporterstellung, Ereignis) und die wiederkehrenden Jobs mit der Häufigkeit ihrer Läufe. Benötigt `jobs:server-job:view`; das erneute Einreihen eines Jobs im Dead Letter benötigt `jobs:server-job:requeue`. | [Systemprotokolle](#screen-audit-log) |
| Nächtlicher Job-Scheduler (Jobs anlegen, bearbeiten, aktivieren oder deaktivieren) | Nicht umgesetzt | Wiederkehrende Jobs sind auf dem API-Server fest vorgegeben. Der Bildschirm Serveraufträge listet sie auf und zeigt ihren Zustand, hat aber keine Bedienelemente, um eine Zeit zu ändern oder einen auszuschalten. | Nicht zutreffend |
| Nächtliche Protokollsynchronisierung (CAP, RCPath, ICCR) | Nicht umgesetzt | Siehe [Synoptik-Bibliothek](#ch6-synoptic). | Nicht zutreffend |

**Wiederkehrende Jobs, die der Server heute auflistet** (Minuten zwischen den Läufen): Durchlauf der Zustellwiederholungen (0.5), Durchlauf fälliger Freigaben (0.25), Ablauf von Konsil-Links (5), Eskalation veralteter Registereinträge (60), tägliche Nachverfolgungshinweise (1440), Ablauf des Supportzugriffs (5), Durchlauf der Korrelation von Zytologie und Histologie (1440), LIS-Abfrage (eigener Zeitplan), Sammeln von Druckaufträgen (eigener Zeitplan), ROSE-SLA-Überwachung der Zytologie (5), Bereinigung des Nachrichtenbusses (1440).

**Reihenfolge der Einrichtung für Stapelarbeiten.** Für Serveraufträge ist nichts zu konfigurieren. Schließen Sie für das Drucken zuerst die [Druckziel-Weiterleitungsregeln](#screen-print_routing_rules) ab und prüfen Sie dann die Druckwarteschlange. Richten Sie für den Etikettennachdruck zuerst den Kassettendrucker unter Druckerprofile ein. Vergeben Sie `label:batch:reprint` und die Berechtigungen `print:job:*` unter den Rollen der Mitarbeitenden an die Personen, die diese Arbeiten ausführen.
