---
chapter: 2
id: ch2
title: Stufe 1: Primäre Systemvoraussetzungen (zuerst einrichten)
---

# Stufe 1: Primäre Systemvoraussetzungen (zuerst einrichten) {#ch2}

Stufe 1 ist der Teil der Konfiguration, auf dem jede andere Einstellung aufbaut. Sie beantwortet vier Fragen, bevor irgendetwas anderes eingerichtet werden kann: welche Laborstandorte es gibt, wer was tun darf, welche physischen Geräte die Standorte verwenden und welche organisationsweiten Regeln gelten. Spätere Stufen lesen aus ihr. Eine Abteilung verlangt eine Einrichtung. Eine Befundvorlage leitet nach Rolle weiter. Ein Etikett wird über ein Druckerprofil gedruckt. Ist ein Bildschirm der Stufe 1 leer, zeigen die davon abhängigen Bildschirme leere Auswahllisten oder lassen sich nicht speichern.

Richten Sie Stufe 1 in dieser Reihenfolge ein. Jeder Bildschirm unten trägt ein Feld **Einrichtungsreihenfolge** mit denselben Angaben, und der Builder prüft, dass kein Bildschirm einen anderen voraussetzt, der erst danach kommt.

1. [Einrichtungsverzeichnis](#screen-facility-dictionary): die Organisation, ihre durchführenden Labore und einsendenden Kunden.
2. [Teilnahmetypen](#screen-participation_types): die Fallrollen (primär, Assistenzarzt, Konsiliarius) und wer einen Befund freigeben darf.
3. [Rollen](#screen-staff-roles): was jede Tätigkeit öffnen und ändern darf.
4. [Delegationstypen](#screen-delegation_types): die Arten, einen Fall oder Befund zu übergeben.
5. [Mitarbeiter](#screen-staff-members): die Personen.
6. [Qualifikationsprüfung](#screen-staff-credentialing): Überprüfungen der beaufsichtigten Tätigkeit für neue Mitarbeitende.
7. [Sitzungssicherheit](#screen-session_security): Abmeldung bei Leerlauf, zweiter Faktor und Abmelderichtlinie.
8. [Support-Zugriff](#screen-support_access): ob der Support von ForMedrixAI auf Ihre Daten zugreifen darf.
9. [Geräte](#screen-equipment): das Register aller Geräte.
10. [Druckerprofile](#screen-printer_profiles): was jeder Etikettendrucker kann und wie ein Browser ihn erreicht.
11. [Standortagenten](#screen-site_agents): das Programm, das im Netzwerk eines Standorts druckt und Dateien bewegt.
12. [Scanstationen](#screen-scan_stations): die Arbeitsplätze, als die sich ein Terminal ausweisen kann.
13. [Druckeinstellungen](#screen-print_settings): Etikettengrößen, Barcoderegeln und Druckverhalten.
14. [Etikettendesigner](#screen-label_designer): das Layout jedes Etiketts.
15. [Arbeitsplätze](#screen-workstations): registrierte Computer mit einem Token.
16. [Arbeitsplatzgruppen](#screen-workstation_groups): Arbeitsplätze, nach Fachrichtung und Bereich gruppiert.
17. [Zuschnitt-Hardware](#screen-grossing_hardware): Kameras und Waagen an den Zuschnittarbeitsplätzen.
18. [Datenaufbewahrung](#screen-retention): wie lange Datensätze aufbewahrt werden.
19. [Fallmaskenkonfiguration](#screen-case_mask_config): die Vergabe der Eingangsnummern.
20. [Pflichtfelder](#screen-field_requirements): welche Felder eine Seite braucht, bevor sie gespeichert werden kann.
21. [Externe Ressourcen](#screen-external_resources): Referenzlinks.

Fünf Bildschirme sind Referenzen und keine Einrichtungsschritte: der [Reiter System](#screen-tab-system), der [Reiter Personal](#screen-tab-staff), die [Geltungsbereich-Referenz](#screen-scope_reference), die [Übersicht je Rechtsraum](#screen-jurisdiction_overview) und das [Protokoll simulierter Drucke](#screen-simulated_print).

**Statuswörter.** Jeder Bildschirm zeigt eines der fünf Statuswörter, die im Redaktionsstandard festgelegt sind: Umgesetzt, Demonstration, Teilweise, Geplant, Nicht umgesetzt. Heute laufen die meisten Datendienste auf den Demonstrationsdaten des Browsers, und die Produktiv-API wird Dienst für Dienst angeschlossen. Wo ein Bildschirm bereits einen Produktivdienst und einen Vertrag in `docs/architecture` hat, ist er **Umgesetzt**. Wo der Bildschirm nur im Browser funktioniert oder seine Wirkung noch nirgends angewendet wird, ist er **Demonstration**.

## Teil A: Verwaltung von Unternehmen und Einrichtungen {#ch2-enterprise-facilities}
Breadcrumb: Startseite > Konfiguration > System

Dieser Teil enthält den Reiter System, der jeden Bildschirm der Teile A, C und D umfasst, sowie den einen Bildschirm, der die Struktur Ihrer Organisation festlegt.

**So funktioniert die Hierarchie.** Es gibt keinen eigenen Bildschirm „Unternehmen“ und keine Art „Krankenhaus“ oder „Praxis“. Alles ist eine Einrichtung im [Einrichtungsverzeichnis](#screen-facility-dictionary). Eine Einrichtung, die als Unternehmen markiert ist, ist die oberste Ebene (Ihre Organisation). Andere Einrichtungen verweisen als Übergeordnetes Unternehmen auf sie und sind die Zugehörigen. Was eine Einrichtung tut, bestimmen ihre Rollen (Durchführendes Labor, Einsendende Einrichtung und so weiter), nicht eine Art. Standorte (Station, Raum, Bett) hängen unter genau einer Einrichtung. Die [Geltungsbereich-Referenz](#screen-scope_reference) nennt, welche Einstellungen einmal für das Unternehmen und welche je Einrichtung gesetzt werden.

**Wo Datum, Uhrzeit, Zeitzone und Sprache festgelegt werden.** Es gibt keinen einzelnen Bildschirm „globales Datum und Uhrzeit“. Jedes wird an einer anderen Stelle festgelegt:

| Was | Wo es festgelegt wird | Geltungsbereich |
|---|---|---|
| Zeitzone | Eine Auswahl **Zeitzone der Einrichtung** im Einstellungsbildschirm des [Beitrags-Dashboards](#screen-contribution_settings). Sie bestimmt, in welchem Tag oder Monat ein freigegebener Fall gezählt wird, und das Jahr der Eingangsnummern. | Gesamte Organisation. Standard `America/Phoenix`. |
| Datums- und Zahlenformat | Folgt der Anzeigesprache, die in der oberen Leiste gewählt wird. Der Reiter Kennungsformate des Einrichtungseditors zeigt Datumsformat, Zeitformat und Gebietsschema des Rechtsraums nur lesend. | Browser der jeweiligen Person. |
| Anzeigesprache | Die Sprachschaltfläche in der oberen Leiste. Auswahl: Englisch, Französisch, Französisch (Belgien), Deutsch, Niederländisch, Niederländisch (Belgien), Koreanisch, Spanisch. Im Browser als `pathscribe_language` gespeichert. | Jede Person, jeder Browser. |
| Befundsprache | **Befundsprache** im Reiter Allgemein der Einrichtung. | Jedes durchführende Labor. |
| Rechtschreibsprache | **Rechtschreibsprache** im Datensatz der Mitarbeiterin oder des Mitarbeiters. | Jede Person. |
| Aktualisierungsfenster des Standortagenten | Zeiten in der Ortszeit des Standorts im Bildschirm [Standortagenten](#screen-site_agents). | Jeder Standort. |

Gespeicherte Zeiten sind immer UTC. Nichts in Stufe 1 ändert das.

### Reiter System {#screen-tab-system}
Breadcrumb: Startseite > Konfiguration > System

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System**. Ein direkter Link wie `/configuration?tab=system&section=print_settings` öffnet einen Abschnitt.
**2. Wartungspunkt:** System (der Container für jeden Abschnitt von System)

**3. Geschäftszweck und Umfang.** Der Reiter System enthält die Referenzdaten und Betriebseinstellungen des Labors. Er hat sechs Gruppen, die als Schaltflächen am oberen Rand stehen: **Arbeitsplatz & Hardware**, **Labormaterialien & Arbeitsabläufe**, **Klinische Nachschlagewerke**, **Finanz- & Umsatz-Nachschlagewerke**, **Verwaltung & Compliance** und **Integrationen**. Die Wahl einer Gruppe listet in der linken Seitenleiste nur die Bildschirme dieser Gruppe auf. Der Reiter System ist der Standardreiter, wenn die Konfiguration geöffnet wird.

**4. Voraussetzungen und Abhängigkeiten.** Zum Öffnen der Konfiguration ist die Berechtigung `screen:configuration:open` nötig. Jeder Abschnitt prüft dann seine eigene Berechtigung. Fehlt sie, öffnet sich der Abschnitt schreibgeschützt mit einem Hinweis, und seine Bedienelemente sind deaktiviert.

Setup step: Reference, not part of setup
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Druckeinstellungen](#screen-print_settings)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-system - Reiter System mit Gruppenschaltflächen und Seitenleiste]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Gruppenschaltflächen | Sechs Schaltflächen | Nicht zutreffend | Die Wahl einer Gruppe zeigt deren Abschnitte in der Seitenleiste und öffnet den ersten Abschnitt. | Arbeitsplatz & Hardware |
| Seitenleiste | Liste von Abschnitten | Nicht zutreffend | Eine Schaltfläche je Abschnitt der aktiven Gruppe, nach Name sortiert. Ein Abschnitt, den nur eine Ingenieurin oder ein Ingenieur von ForMedrixAI verwenden darf, ist ausgeblendet, sofern Sie nicht dessen Plattform-Berechtigung besitzen. | Druckeinstellungen ausgewählt |
| Einrichtung: (Auswahl) | Auswahlliste der aktiven durchführenden Labore sowie **Alle Einrichtungen** | Optional | Nur in der Gruppe Arbeitsplatz & Hardware angezeigt. Sie filtert Druckeinstellungen, Druckerprofile, Scanstationen, Standortagenten, Geräte und Zuschnitt-Hardware auf einen Standort. Sie wird nur gemerkt, bis Sie den Reiter System verlassen, und nicht gespeichert. | Alle Einrichtungen |
| Hinweis auf nicht gespeicherte Änderungen | Bestätigung | Nicht zutreffend | Der Wechsel zu einem anderen Abschnitt oder einer anderen Gruppe mit nicht gespeicherten Änderungen fragt, ob Sie weiterbearbeiten oder verwerfen möchten. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Die eigene Berechtigung jedes Abschnitts steht beim jeweiligen Abschnitt. Admin und Laborleitung besitzen die Berechtigung für den Konfigurationsbildschirm standardmäßig.
**Bekannte Grenzen.** Die Einrichtungsauswahl bleibt beim Neuladen der Seite nicht erhalten. Arbeitsplätze und Arbeitsplatzgruppen verwenden sie nicht: Arbeitsplätze hat eine eigene Spalte für die Einrichtung und Arbeitsplatzgruppen einen eigenen Filter für das durchführende Labor.

### Einrichtungsverzeichnis {#screen-facility-dictionary}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Einrichtungskonfiguration

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Integrationen** > **Einrichtungskonfiguration**. Die Seitenüberschrift lautet „Einrichtungskonfiguration“. Es ist derselbe Bildschirm, den Kapitel 3 als [Einrichtungskonfiguration](#screen-clients) aufführt.
**2. Wartungspunkt:** Einrichtungsverzeichnis

**3. Geschäftszweck und Umfang.** Eine Einrichtung ist jeder Standort und jede Organisation, die PathScribe kennt: Ihre eigenen Labore, die Praxen und Krankenhäuser, die Ihnen Proben senden, und die Referenzlabore, an die Sie Arbeit weiterleiten. Jede Einrichtung hat ihre Rollen, Kontaktdaten, die Codes, mit denen eingehende Aufträge ihr zugeordnet werden, ihre Zielvorgaben für die Durchlaufzeit, die Optionen der Befundübermittlung und die Druckweiterleitung. Die Organisation der obersten Ebene ist eine Einrichtung mit gesetztem Haken bei **Unternehmen**. Fast jeder andere Bildschirm verlangt eine Einrichtung; deshalb ist dies der erste Bildschirm, der auszufüllen ist.

**4. Voraussetzungen und Abhängigkeiten.** Nichts kommt davor. Die Liste Leistungsort-Code im Reiter Allgemein liest das Codeverzeichnis, und die Liste Modell im Reiter KI & Leistung enthält nur Modelle mit bestandener Validierungsstudie. Beides ist optional. Legen Sie die Einrichtung nicht an, sind die Einrichtungsauswahlen aller anderen Bildschirme leer.

Setup step: Tier 1, step 1
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: [Teilnahmetypen](#screen-participation_types), [Delegationstypen](#screen-delegation_types), [Mitarbeiter](#screen-staff-members), [Geräte](#screen-equipment), [Fallmaskenkonfiguration](#screen-case_mask_config), [Abteilungen](#screen-departments)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-facility-dictionary - Einrichtungsliste mit Suche, Status- und Rollenfiltern und Einrichtung hinzufügen]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Findet Einrichtungsname, vergebende Stelle, Kontaktname und E-Mail. | Leer |
| Statusfilter | Reiter: Alle, Aktiv, Inaktiv, Nicht verifiziert | Optional | Nicht verifizierte Einrichtungen wurden automatisch aus einem eingehenden Auftrag angelegt und warten auf eine Prüfung durch eine Person. | Alle |
| Rollenfilter | Reiter: Alle Arten, Durchführendes Labor, Einsendende Einrichtung | Optional | Grenzt nach Rolle ein. | Alle Arten |
| Trefferzahl | Text (N von M) | Nicht zutreffend | Zeigt, wie viele Einrichtungen passen. | Nicht zutreffend |
| Spalte Einrichtung | Text | Nicht zutreffend | Name, Code der vergebenden Stelle, Adresse und eine Markierung „Zugehörig“. | Nicht zutreffend |
| Spalte Rollen | Kennzeichen | Nicht zutreffend | Die Rollen der Einrichtung und ihr Rechtsraum. | Nicht zutreffend |
| Spalte Kontakt | Text | Nicht zutreffend | Kontaktname und E-Mail. | Nicht zutreffend |
| Spalte TAT | Text | Nicht zutreffend | Zeigt „N h erster Kontakt“, „N h gesamt“ oder Standard. | Nicht zutreffend |
| Spalte Status | Text | Nicht zutreffend | Aktiv, Inaktiv oder Nicht verifiziert. Ein Hinweis „Automatisch angelegt“ erscheint, wenn die Einrichtung aus einem Auftrag stammt. | Nicht zutreffend |
| + Einrichtung hinzufügen | Schaltfläche | Nicht zutreffend | Öffnet den Editor mit einer leeren Einrichtung. | Nicht zutreffend |
| Verifizieren | Zeilenschaltfläche | Nicht zutreffend | Nur bei nicht verifizierten Einrichtungen angezeigt. Markiert die Einrichtung als geprüft. | Nicht zutreffend |
| Bearbeiten | Zeilenschaltfläche | Nicht zutreffend | Öffnet den Editor. | Nicht zutreffend |
| Duplizieren | Zeilenschaltfläche | Nicht zutreffend | Kopiert die Einrichtung auf Organisationsebene in eine neue Einrichtung. Dabei werden vergebende Stelle, CLIA- oder ISO-Nummer, Adresse und Kontaktdaten, Leitung, ältere Mandantenkennungen, pädiatrische Berechtigungen, Schnittstellen-Endpunkt und Zugangsdaten geleert. Der Name wird zu „Kopie von“ plus dem Originalnamen. | Nicht zutreffend |
| Deaktivieren / Aktivieren | Zeilenschaltfläche | Nicht zutreffend | Bei nicht verifizierten Einrichtungen nicht angezeigt. Das Deaktivieren einer noch verwendeten Einrichtung öffnet **Einrichtung wird noch verwendet** und bittet um Bestätigung. Verweise werden nicht entfernt. | Nicht zutreffend |

#### Editorfenster: Reiter Allgemein

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name der Einrichtung | Text | Pflicht | Wie die Einrichtung auf Aufträgen, Befunden und Etiketten erscheint. Fehler: „Der Name der Einrichtung ist erforderlich“. | Leer |
| Vergebende Stelle | Text, bis zu 10 Zeichen, in Großbuchstaben erzwungen | Pflicht | Eingehende HL7-Aufträge werden der Einrichtung anhand dieses Codes zugeordnet; er muss daher eindeutig sein (ohne Unterscheidung von Groß- und Kleinschreibung). | Leer |
| Status | Auswahl: Aktiv, Inaktiv (Nicht verifiziert wird nur angezeigt, wenn es bereits gesetzt ist) | Pflicht | Inaktive Einrichtungen werden für neue Arbeit nicht angeboten. | Aktiv |
| Rollen | Kontrollkästchen: Durchführendes Labor, Interner einsendender Standort, Interne anfordernde Einrichtung, Externe anfordernde Einrichtung, Probenentnahme, Referenzlabor | Pflicht | Mindestens die Rollen, die beschreiben, was der Standort tut. Durchführendes Labor schaltet den Reiter KI & Leistung und die nur für Labore geltenden Felder unten frei. | Externe anfordernde Einrichtung |
| Leistungsort-Code | Auswahlliste aus den Leistungsort-Codes | Optional | Setzt die Rolle Probenentnahme voraus. | Keiner |
| CLIA-/ISO-Akkreditierungsnummer | Text | Optional | Setzt Durchführendes Labor oder Unternehmen voraus. Wird in Befundköpfen verwendet. | Leer |
| Name des Laborleiters | Text | Optional | Setzt Durchführendes Labor oder Unternehmen voraus. Wird in Befundköpfen verwendet. | Leer |
| URL des Kopfzeilen-Logos | https-Link | Optional | Setzt Durchführendes Labor oder Unternehmen voraus. Nur die Adresse wird gespeichert, nie das Bild. | Leer |
| Leistungen benötigen Abrechnungsfreigabe | Auswahl: Wie das Unternehmen, Ein, Aus | Optional | Nur Durchführendes Labor oder Unternehmen. „Wie das Unternehmen“ wird nur Laboren angeboten, die kein Unternehmen sind. | Wie das Unternehmen |
| Richtlinie für Nachtragsseiten: Nachträge auf eine eigene Seite erzwingen | Ja/Nein-Schalter | Optional | Nur Durchführendes Labor. | Aus |
| Befundsprache | Auswahl der acht Anzeigesprachen | Optional | Nur Durchführendes Labor. Der Standard folgt dem Rechtsraum. | Nach Rechtsraum |
| Auffälligkeitserkennung: In dieser Einrichtung aktiviert | Ja/Nein-Schalter | Optional | Nur Durchführendes Labor. | Aus |
| Rechtsraum | Auswahl aus 14: US, CA, GB_EW, GB_SCT, GB_NIR, IE, AU, NZ, KR, BE, NL, DE, FR, ES | Pflicht | Legt die Landesregeln der Einrichtung, das Datumsformat, die Rechtschreibprüfung und den Standard für die Patientenkennung fest (angezeigt unter Kennungsformate). | US |
| Kennung im nationalen Screening-Register | Text | Optional | Die Kennung der Einrichtung bei einem nationalen Screening-Register. | Leer |
| Proben-/Blockkennzeichnung | Auswahl: alpha (Probe A, B, C und Block A1, A2, A3) oder numerisch (Probe 1, 2, 3 und Block 1A, 1B, 1C) | Pflicht | Wie neue Proben und Blöcke bezeichnet werden. | Alpha |
| Unternehmen | Kontrollkästchen: „Dies ist eine Institution der obersten Ebene (Unternehmen)“ | Optional | Markiert die Einrichtung als oberste Ebene. Schaltet die Felder frei, die nur für Unternehmen gelten (Verbindung zur Schnittstellen-Engine, Gesicherte Nachrichten). | Aus |
| Übergeordnetes Unternehmen | Auswahlliste anderer Einrichtungen, die Unternehmen sind | Optional | Macht diese Einrichtung zu einer zugehörigen Einrichtung dieses Unternehmens. | Keines |
| Titel des Kontakts | Auswahl: Herr, Frau, Ms., Mx., Dr. | Optional | Anrede der Kontaktperson. | Leer |
| Suffix des Kontakts | Auswahl aus Vorgaben oder Andere | Optional | Zum Beispiel Jr. oder MD. | Leer |
| Vornamen, Familiennamen, Rufname | Text | Optional | Die Kontaktperson. | Leer |
| E-Mail | Text, muss „@“ enthalten | Optional | Kontakt-E-Mail. | Leer |
| Telefon, Fax | Text | Optional | Kontaktnummern. | Leer |
| Adresse, Ort, Bundesland/Provinz/Region, Postleitzahl | Text | Optional | Postanschrift. | Leer |

Welche Kontaktfelder Pflicht sind, ergibt sich aus [Pflichtfelder](#screen-field_requirements), Seite **Einrichtungseditor**: Name, vergebende Stelle, E-Mail, Telefon, Fax, Adresse, Ort, Region, Postleitzahl und Kontaktperson. Die Fußzeile nennt, was noch erforderlich ist.

#### Editorfenster: Reiter LIS-Integration

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Verbindung zur Schnittstellen-Engine: Endpunkt | Text | Pflicht, sobald konfiguriert | Nur Unternehmen. Wohin PathScribe Nachrichten an die Schnittstellen-Engine sendet. | Leer |
| HL7-Version | Auswahl: 2.3, 2.4, 2.5, 2.5.1, 2.6 | Optional | Nur Unternehmen. | 2.5.1 |
| Authentifizierungstyp | Auswahl: none, basic, oauth2, api_key | Optional | Nur Unternehmen. | none |
| Zugangsdaten konfiguriert | Ja/Nein | Optional | Nur Unternehmen. Hält fest, dass Zugangsdaten eingerichtet sind. Das Geheimnis selbst wird hier nicht eingegeben. | Nein |
| Das verbundene LIS verwaltet die wichtigsten Fallstatus | Ja/Nein-Schalter | Optional | Nur Unternehmen. | Aus |
| Pathologen können Nachträge/Berichtigungen direkt in PathScribe einleiten | Ja/Nein-Schalter | Optional | Nur Unternehmen. | Aus |
| Weiterleitung des Unternehmens überschreiben | Ja/Nein-Schalter | Optional | Nur Einrichtungen, die kein Unternehmen sind. Aus bedeutet, dass die Einrichtung die Verbindung ihres übergeordneten Unternehmens erbt. | Aus |
| ID der sendenden Einrichtung (MSH-4) | Text | Pflicht, sobald konfiguriert | Kennzeichnet die Einrichtung im ausgehenden HL7. | Leer |
| ID der empfangenden Einrichtung (MSH-6) | Text | Optional | Der Code des empfangenden Systems. | Leer |
| Ausgangskanal-Überschreibung | Text | Optional | Ein anderer Engine-Kanal für diese Einrichtung. | Leer |
| Ein kombiniertes PDF je Fall senden | Ja/Nein-Schalter | Optional | Nur Durchführendes Labor. | Aus |

#### Editorfenster: Reiter Kennungsformate

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Überschreibungsschalter | Ja/Nein-Schalter | Optional | Nur Einrichtungen, die kein Unternehmen sind. Aus verwendet die Formate des übergeordneten Unternehmens. | Aus |
| Formatzeilen | Liste, gegliedert in Stufe 1 (Suche: ein Objektträger-Barcode öffnet den Fall) und Stufe 2 (interne Zuordnung) | Nicht zutreffend | Jede Zeile hat einen Aktiviert-Schalter, ein Testfeld und eine Schaltfläche zum Anzeigen des Musters. Die Muster sind vom System festgelegt und nicht bearbeitbar. | Nach Rechtsraum |
| LIS-Voreinstellungsfilter | Auswahl | Optional | Grenzt die Zeilen auf eine Voreinstellung ein. | Alle |
| Einen Scan simulieren | Text | Optional | Geben Sie einen Wert ein oder scannen Sie ihn, um zu sehen, welches Format passt. | Leer |
| Gebietsschema-Informationen | Nur lesbarer Text | Nicht zutreffend | Zeigt Rechtsraum, Datumsformat, Zeitformat, Gebietsschema, Rechtschreibprüfung und Standard der Patientenkennung. | Nicht zutreffend |
| Änderungen speichern | Schaltfläche | Nicht zutreffend | Speichert die Überschreibung. | Nicht zutreffend |

#### Editorfenster: Reiter Befundung

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Berichtsformat | Auswahl: PDF, HL7, Beides | Pflicht | Wie Befunde an diese Einrichtung gehen. | PDF |
| Übermittlungsart | Auswahl: E-Mail, Fax, Portal, HL7 | Pflicht | Wie Befunde sie erreichen. | Portal |
| Berichte bei Abschluss automatisch freigeben | Ja/Nein-Schalter | Optional | | Aus |
| Bericht an überweisenden Arzt kopieren | Ja/Nein-Schalter | Optional | | Aus |

#### Editorfenster: Reiter TAT & Eskalation

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Zielvorgabe erster Kontakt | Ganze Zahl in Stunden, 1 bis 168 | Optional | Leer verwendet den Systemstandard. | Leer (Systemstandard 4 Stunden) |
| Zielvorgabe Gesamt-TAT des Falls | Ganze Zahl in Stunden, 1 bis 720 | Optional | Leer verwendet den Systemstandard. | Leer (Systemstandard 24 Stunden) |
| Eskalationspriorität | Auswahl: high, critical | Optional | Priorität einer Überfälligkeitsmeldung. | high |
| Eskalationsempfänger | Kontrollkästchen: Pathologiegruppe, Laboradministration, Überweisender Arzt | Optional | Ist keines angehakt, werden Meldungen für diese Einrichtung unterdrückt. Eingeschränkte (pädiatrische) Fälle eskalieren immer mit Critical. | Keine |

#### Editorfenster: Reiter KI & Leistung (nur Durchführendes Labor)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Automatischer Befundentwurf | Auswahl: inherit, on, off | Optional | | Erben |
| Überschreibung der Sitzungs-Leerlaufzeit | Auswahl: inherit, 5, 10, 15, 20, 30, 60 Minuten | Optional | Überschreibt den Standard der Organisation aus [Sitzungssicherheit](#screen-session_security) für Fälle in diesem Labor. | Erben |
| Zufallsstichprobenrate für Codeprüfung | Ganze Zahl, 0 bis 100 | Optional | Prozentsatz der Fälle, die für die Codeprüfung stichprobenartig gezogen werden. Leer bedeutet keine. Eine Änderung wird im Prüfprotokoll als „Code review random sampling rate changed“ festgehalten. | Leer |
| Freigabepuffer | Auswahl: erben oder überschreiben | Optional | Überschreiben blendet Puffer aktiviert, Dauer (1 bis 30 Minuten) und STAT umgehen ein. | Erben (Standard beim Überschreiben 10 Minuten) |
| Modell | Auswahlliste: erben oder Modelle mit bestandener Validierungsstudie | Optional | Nur im Bearbeitungsmodus. | Erben |

#### Editorfenster: Reiter Standorte (nur im Bearbeitungsmodus)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Pflegeort | Text | Pflicht | Wird von Druckweiterleitungsregeln und Arbeitsplätzen abgeglichen. | Leer |
| Raum, Bett, Gebäude, Stockwerk | Text | Optional | Teile des Standorts. | Leer |
| Standortstatus | Auswahl (HL7-Tabelle 0306) | Optional | | Leer |
| Personenstandortart | Auswahl (HL7-Tabelle 0305) | Optional | | Leer |
| Verifizieren, Aktivieren, Deaktivieren | Schaltflächen | Nicht zutreffend | Standorte, die automatisch aus einem eingehenden PV1-Segment angelegt wurden, kommen als Nicht verifiziert an. | Nicht zutreffend |

#### Editorfenster: Reiter Drucken (nur im Bearbeitungsmodus; mit eigenem Speichern)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Freigegebene Befunde drucken | Ja/Nein-Schalter | Optional | Nur Durchführendes Labor. | Aus |
| Übermittlung | Auswahl: Benannter QZ-Tray-Drucker, Netzwerkdrucker direkt, Schnittstellen-Engine oder Druckserver | Pflicht, wenn Drucken an ist | Nur Durchführendes Labor. | Keine |
| Papierformat | Auswahl: Standard (Letter), Letter, A4, Legal | Optional | Nur Durchführendes Labor. | Standard |
| Druckername | Text | Pflicht für QZ Tray | | Leer |
| Druckerart | Auswahl: Drucker des Standortagenten, Druckeradresse | Pflicht für direkt | | Keine |
| Protokoll | Auswahl: RAW 9100, LPR/LPD, IPP | Pflicht für direkt | | RAW 9100 |
| Adresse, Port | Text, ganze Zahl 1 bis 65535 | Pflicht für direkt | | Leer, 9100 |
| Warteschlangenname, IPP-Pfad, Anzeigename | Text | Optional | Warteschlange für LPR, Pfad für IPP. | Leer |
| Papierfach | Auswahl: Befundstandard, Fach 1 Briefpapier, Fach 2 Normalpapier | Optional | Jede Einrichtung. | Befundstandard |
| Seiten | Auswahl: Befundstandard, Doppelseitig, Einseitig | Optional | Jede Einrichtung. | Befundstandard |

#### Editorfenster: Reiter Gesicherte Nachrichten (nur im Bearbeitungsmodus, nur Unternehmen)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Gateway-Zeilen | NHSMAIL, EGRESS, ACCURX, PAUBOX, VIRTRU, ZIX, HEALTHLINK, MEDICAL_OBJECTS, REFERRALNET, KR_HIE | Optional | Eine Zeile je Gateway. | Aus |
| Aktiviert | Ja/Nein-Schalter | Optional | | Aus |
| Standard | Optionsfeld | Optional | Das Gateway, das standardmäßig verwendet wird. | Keines |
| Absenderadresse oder -ID | Text | Optional | | Leer |
| Vereinbarung liegt vor, Referenz, unterzeichnet am, läuft ab am | Ja/Nein, Text, Datumsangaben | Optional | Patientendaten gehen nur hinaus, solange eine Vereinbarung gilt. | Nein |

#### Editorfenster: Reiter Rechtschreibung (nur im Bearbeitungsmodus, nur Durchführendes Labor)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Wortliste | Textliste | Optional | Wörter, die die Rechtschreibprüfung in dieser Einrichtung akzeptiert. Änderungen werden protokolliert. | Leer |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, ändern, deaktivieren, reaktivieren und verifizieren: `config:facilities:manage`. Reiter Drucken: `config:print-settings:manage`. Reiter Gesicherte Nachrichten: `config:secure-messaging:manage`. Admin und Laborleitung besitzen diese standardmäßig. Feldänderungen, die die Seite protokolliert, sind oben aufgeführt.
**Bekannte Grenzen.** Das Senden über gesicherte Nachrichten wird simuliert: `messageService.sendSecureEmail` zeichnet die Nachricht auf, aber einen echten Gateway-Transport gibt es noch nicht (PS-332). Der Text des Reiters KI & Leistung verweist für den Standard des Freigabepuffers auf „Konfiguration > System > LIS-Integration“, doch dieser Standard liegt in [Freigabepuffer nach Signierung](#screen-release_buffer).
### Geltungsbereich-Referenz {#screen-scope_reference}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Geltungsbereich-Referenz

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance** > **Geltungsbereich-Referenz**
**2. Wartungspunkt:** Geltungsbereich-Referenz (nur lesend)

**3. Geschäftszweck und Umfang.** Eine Seite, die eine Frage beantwortet: Wird diese Einstellung einmal für die Organisation, einmal je Einrichtung oder auf mehreren Ebenen vorgenommen? Sie definiert außerdem die Begriffe Unternehmen, durchführende Einrichtung und anfordernde Einrichtung. Sie ändert nichts.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Sie liest eine feste Liste, die im Produkt geführt wird. Es sind nur neun Einstellungen aufgeführt, und die Seite weist darauf hin, dass nicht aufgeführte Bereiche nicht geprüft wurden.

Setup step: Reference, not part of setup
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-scope_reference - Tabelle der Geltungsbereich-Referenz und Definitionen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Was die Begriffe bedeuten | Drei Definitionen | Nicht zutreffend | Unternehmen (die gesamte Organisation), durchführende Einrichtung (ein Laborstandort) und anfordernde Einrichtung oder Kunde (wer den Fall sendet). | Nicht zutreffend |
| Einstellungsbereich | Text | Nicht zutreffend | Die Einstellung: Richtlinie zur Anmeldung mit zweitem Faktor, Abmeldezeit bei Leerlauf, Druckeinstellungen, Druckweiterleitungsregeln, Zielvorgaben für die Durchlaufzeit, Standortagenten, Scanstationen, Geräte, Arbeitsplätze. | Nicht zutreffend |
| Wo es festgelegt wird | Text | Nicht zutreffend | Eines von: Unternehmen, Standard des Unternehmens mit Überschreibung je Einrichtung, Jede Einrichtung, Mehrere Ebenen (die spezifischste gilt). | Nicht zutreffend |
| Funktionsweise | Text | Nicht zutreffend | Ein Satz je Einstellung. Ein Link öffnet den Bildschirm, auf dem die Einstellung liegt. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Es gibt nichts zu ändern und keine Berechtigung für den Abschnitt.
**Bekannte Grenzen.** Die Liste umfasst neun Einstellungen. Deuten Sie eine fehlende Einstellung weder als unternehmensweit noch als einrichtungsbezogen.

### Übersicht je Rechtsraum {#screen-jurisdiction_overview}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Übersicht je Rechtsraum

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance** > **Übersicht je Rechtsraum**
**2. Wartungspunkt:** Übersicht je Rechtsraum (nur lesend)

**3. Geschäftszweck und Umfang.** Eine Karte je Land, die zeigt, was dafür eingerichtet ist, sodass Sie Lücken erkennen, ohne sieben Bildschirme zu öffnen. Sie listet die Länder auf, für die es Signierregeln gibt, sowie jedes Land, das eine Einrichtung oder das Labor verwendet. Jede Zeile hat einen Link **Ändern** zum Bildschirm, auf dem diese Einstellung bearbeitet wird. Die Seite sagt: „Diese Seite zeigt nur, was eingerichtet ist.“

**4. Voraussetzungen und Abhängigkeiten.** Sie liest die Einrichtungen; legen Sie diese daher zuerst an. Eine leere Länderkarte bedeutet, dass die Einrichtungsliste oder die Regeln dahinter leer sind.

Setup step: Reference, not part of setup
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-jurisdiction_overview - Länderkarten mit einer Zeile je Einstellung]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Einrichtungen | Textliste | Nicht zutreffend | Die Einrichtungen in diesem Land. Eine inaktive Einrichtung zeigt „(inaktiv)“. Ändern öffnet die [Einrichtungskonfiguration](#screen-clients). | Nicht zutreffend |
| Angebotene Rollen | Anzahl | Nicht zutreffend | Angebotene Beteiligungsrollen. Ändern öffnet die [Teilnahmetypen](#screen-participation_types). | Nicht zutreffend |
| Signierregeln | Text | Nicht zutreffend | Rollen, die „abzeichnen dürfen“, und Rollen, die „eine Gegenzeichnung benötigen“. Ändern öffnet die [Abzeichnungsregeln nach Land](#screen-country_signing_rules). | Nicht zutreffend |
| Codesysteme | Textliste | Nicht zutreffend | Jedes System mit Pflicht oder optional. Ändern öffnet die [Codiersysteme](#screen-code_systems). | Nicht zutreffend |
| Krebsregister | Textliste | Nicht zutreffend | Register, die für das Land eingerichtet sind. Ändern öffnet die [Krebsregister-Berichterstattung](#screen-cancer_registry_settings). | Nicht zutreffend |
| KI-Richtlinie | Text | Nicht zutreffend | Eines von: Keine Einschränkungen, Alle KI-Dienste zulässig, Zulässig (eine Liste), Beschränkt auf Anbieter in der Datenregion, sowie eine Anzahl der Einrichtungsregeln. Ändern öffnet den Reiter KI-Verhalten. | Nicht zutreffend |
| Aufbewahrungsregeln von | Text | Nicht zutreffend | „Für dieses Land gespeichert“ oder „Integrierter Standard“. Ändern öffnet die [Aufsichtsbehörden](#screen-governing_bodies). | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hier gibt es nichts zu ändern. Jeder Link Ändern benötigt die Berechtigung des Bildschirms, den er öffnet.
**Bekannte Grenzen.** Keine bekannt.

## Teil B: Benutzerverwaltung, Rollen und die Berechtigungsmatrix {#ch2-users-roles}
Breadcrumb: Startseite > Konfiguration > Personal

Dieser Teil behandelt, wer sich anmelden kann und was jede Person tun darf. Der Zugriff in PathScribe wird aus Berechtigungen aufgebaut. Eine Berechtigung ist eine einzelne Erlaubnis, geschrieben als `domain:object:verb`, zum Beispiel `config:roles:manage`. Eine Rolle ist ein benanntes Bündel von Berechtigungen. Eine Person erhält Berechtigungen über ihre Rollen, beschränkt auf die Einrichtungen in ihrem Datensatz. Berechtigungen, die mit hohem Risiko gekennzeichnet sind, werden bei ihrer Verwendung im Prüfprotokoll festgehalten.

**Die Berechtigungsmatrix.** Die Matrix ist die Berechtigungsliste im Bildschirm Rollen: jede Berechtigung, gruppiert, mit einem Haken für jede Rolle. Der Katalog und die Ausgangszuweisungen sind im Produkt festgelegt (`capabilityCatalog.ts` und `capabilitySeeds.ts`). Vier Regeln sind bei der Planung von Rollen wichtig:

- **Integrierte Rollen.** Pathologe, Assistenzarzt, Fellow, PA, Admin, Arzt, OP-Personal, Vorlagenautor, Vorlagenfreigeber, Laborleitung, QS-Prüfer, Superadmin, Probeneingangskraft, Histologie-Fachkraft, Zytologieassistent und Molekulartechnologe werden vorgefertigt mitgeliefert. Eine Rolle, die Sie selbst hinzufügen, beginnt ohne Konfigurationsberechtigungen.
- **Admin und Laborleitung.** Admin besitzt jede Konfigurationsberechtigung. Die Laborleitung besitzt denselben Satz mit Ausnahme von zwei Gruppen: der Verwaltungsgruppe (`config:roles:manage`, `config:staff:edit`, `config:staff-access:assign`, `config:staff-password:manage`, `config:field-requirements:manage`, `auth:mfa-enrolment:reset`, `config:demo-data:reset`) und dem Entwerfen von Protokollen. Rollen, Mitarbeitende und Pflichtfelder verwalten also nur Admin und Superadmin.
- **Superadmin.** Eine Rolle von ForMedrixAI. Sie besitzt jede Berechtigung außer `config:ai-prompt:approve`; ein Krankenhaus kann sie nicht ändern und nicht seinen eigenen Mitarbeitenden zuweisen.
- **Funktionstrennung.** `config:clinical-mismatch-rules:manage` und `config:ai-prompt:approve` dürfen nicht gemeinsam von einer Rolle oder einer Person gehalten werden. Das Speichern wird abgelehnt.

Eine abgelehnte Konfigurationsänderung zeigt den Grund `CONFIG_NOT_PERMITTED`. Ein Abschnitt, den Sie nicht ändern können, öffnet sich schreibgeschützt.

### Reiter Personal {#screen-tab-staff}
Breadcrumb: Startseite > Konfiguration > Personal

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **Personal**
**2. Wartungspunkt:** Personal (der Container für Mitarbeiter, Rollen und Qualifikationsprüfung)

**3. Geschäftszweck und Umfang.** Ein Reiter für die personenbezogene Seite der Konfiguration. Er hat drei Unterreiter: **Mitarbeiter**, **Rollenverzeichnis** und **Qualifikationsprüfung**. Ein Link wie `/configuration?tab=staff&section=roles` öffnet einen Unterreiter (`members`, `roles` oder `credentialing`).

**4. Voraussetzungen und Abhängigkeiten.** Zum Öffnen der Konfiguration ist `screen:configuration:open` nötig. Jeder Unterreiter prüft seine eigene Berechtigung.

Setup step: Reference, not part of setup
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Mitarbeiter](#screen-staff-members), [Rollen](#screen-staff-roles), [Qualifikationsprüfung](#screen-staff-credentialing)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-staff - Reiter Personal mit seinen drei Unterreitern]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Mitarbeiter | Unterreiter | Nicht zutreffend | Die Personen. Siehe [Mitarbeiter](#screen-staff-members). | Ausgewählt |
| Rollenverzeichnis | Unterreiter | Nicht zutreffend | Die Rollen. Siehe [Rollen](#screen-staff-roles). | Nicht zutreffend |
| Qualifikationsprüfung | Unterreiter | Nicht zutreffend | Zuweisungen der beaufsichtigten Tätigkeit. Siehe [Qualifikationsprüfung](#screen-staff-credentialing). | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Die Berechtigung jedes Unterreiters steht in dessen eigenem Bildschirm.
**Bekannte Grenzen.** Keine bekannt.

### Teilnahmetypen {#screen-participation_types}
Breadcrumb: Startseite > Konfiguration > System > Klinische Nachschlagewerke > Teilnahmetypen

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Klinische Nachschlagewerke** > **Teilnahmetypen**
**2. Wartungspunkt:** Teilnahmetypen

**3. Geschäftszweck und Umfang.** Ein Teilnahmetyp (Beteiligungsart) ist die Rolle, die eine Person in einem Fall spielt: primärer Pathologe, Assistenzarzt, Konsiliarius, Zuschnitt und so weiter. Hier wird auch die Signierbefugnis festgelegt: ob diese Rolle den endgültigen Befund ausstellen darf, ob der Befund eine Gegenzeichnung braucht, ob die Person den ganzen Fall sieht und ob mehr als eine Person die Rolle innehaben kann. Rollen erhalten dann die Typen, als die ihre Inhaber auftreten dürfen.

**4. Voraussetzungen und Abhängigkeiten.** Der Abschnitt zur Freigabebefugnis je Einrichtung setzt voraus, dass die Einrichtungen existieren. Der Bildschirm Rollen liest diese Liste für seinen Reiter Fallbeteiligung; legen Sie die Typen daher vor den Rollen fest. Wird das ausgelassen, hat eine Rolle keine Typen zur Auswahl.

Setup step: Tier 1, step 2
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Rollen](#screen-staff-roles), [Mitarbeiter](#screen-staff-members)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-participation_types - Liste der Teilnahmetypen mit Berechtigungskennzeichen]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Platzhalter „Teilnahmetypen suchen“. | Leer |
| Filter | Reiter, beginnend mit Alle | Optional | | Alle |
| Typ, Beschreibung, Fähigkeiten, Status | Spalten | Nicht zutreffend | Fähigkeiten erscheinen als kurze Kennzeichen: Finalisieren, Gegenzeichnen, Vorlage, Vollansicht, Mehrfach. Ein Kennzeichen „integriert“ markiert Systemtypen. | Nicht zutreffend |
| Fußzeilenzahl | Text | Nicht zutreffend | „N aktiv, M gesamt“. | Nicht zutreffend |
| + Typ hinzufügen | Schaltfläche | Nicht zutreffend | Öffnet den Editor. | Nicht zutreffend |
| Bearbeiten, Duplizieren | Zeilenschaltflächen | Nicht zutreffend | Duplizieren öffnet eine Kopie zum Bearbeiten. | Nicht zutreffend |

Das Produkt liefert diese Systemtypen mit: primary, resident, attending, grossing, cytotechnologist, consultant, frozen, second_opinion, provisional_hire, biomedical_scientist und bms_advanced_practitioner. Systemtypen können nicht gelöscht werden. Bei einem integrierten Typ können Sie Bezeichnung, Beschreibung und Farbe bearbeiten. Das Kennzeichen „Finalisieren“ von `primary` ist gesperrt.

#### Editorfenster

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Bezeichnung | Text | Pflicht | Muss eindeutig sein. Fehler: „Bezeichnung ist erforderlich“ und „Ein Teilnahmetyp mit dem Namen ... existiert bereits“. | Leer |
| Abkürzung | Text, bis zu 12 Zeichen | Pflicht | Muss eindeutig sein. Wird in Fallköpfen und Listen angezeigt. | Leer |
| Beschreibung | Text | Optional | | Leer |
| Farbe | Vorgegebene Farbfelder oder eine eigene Farbe | Optional | | `#8AB4F8` |
| Kann finalisieren / abzeichnen | Ja/Nein-Schalter | Optional | Diese Rolle kann den endgültigen signierten Befund ausstellen. | Aus |
| Gegenzeichnung erforderlich | Ja/Nein-Schalter | Optional | Befunde dieser Rolle müssen von einem Facharzt gegengezeichnet werden. | Aus |
| Kann Berichtsvorlage verwenden | Ja/Nein-Schalter | Optional | Dieser Rolle kann eine Befundvorlage für die strukturierte Befundung zugewiesen werden. | Aus |
| Kann gesamten Fall einsehen | Ja/Nein-Schalter | Optional | Voller Fallzugriff einschließlich aller Proben und früherer Befunde. | Aus |
| Erlaubt mehrere pro Fall | Ja/Nein-Schalter | Optional | Mehr als eine Person kann die Rolle in einem Fall gleichzeitig innehaben. | Ein |
| Status | Aktiv / Inaktiv | Optional | | Aktiv |
| Freigabebefugnis auf Einrichtungsebene | Ein Block je durchführendes Labor | Optional | Jedes Labor erbt den regulatorischen Standard seines Rechtsraums oder den Plattformstandard. Überschreiben Sie nur bei einer lokalen Ausnahme oder einem Credentialing-Schema. | Geerbt |
| Gegenzeichnung in diesem Labor erforderlich, Kann in diesem Labor finalisieren / abzeichnen, Kann in diesem Labor gesamten Fall einsehen | Ja/Nein-Überschreibungen | Optional | Jede zeigt ihre Quelle: Plattformstandard, Rechtsraum-Standard oder „Auf Einrichtungsebene überschrieben von Name am Datum“. **Auf übernommene Vorgabe zurücksetzen** entfernt die Überschreibung beim Speichern. | Geerbt |
| Begründung | Text | Optional | Wird mit der Überschreibung im Prüfprotokoll festgehalten. | Leer |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, duplizieren, überschreiben: `config:participation-types:manage` (hohes Risiko, protokolliert; Überschreibungen auf Einrichtungsebene werden mit der Begründung im Prüfprotokoll festgehalten). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Keine bekannt.

### Rollenverzeichnis {#screen-staff-roles}
Breadcrumb: Startseite > Konfiguration > Personal > Rollenverzeichnis

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **Personal** > Unterreiter **Rollenverzeichnis**
**2. Wartungspunkt:** Rollen

**3. Geschäftszweck und Umfang.** Eine Rolle ist ein Bündel von Berechtigungen und eine Liste der Teilnahmetypen, als die ihre Inhaber auftreten dürfen. Dieser Bildschirm ist die Berechtigungsmatrix: Sie haken an, welche Berechtigungen jede Rolle besitzt, und Sie fügen eigene Rollen hinzu. Er enthält auch den Satz der Sprach- und Tastaturbefehle für die Rolle; dieser ist eine Erleichterung und keine Zugriffskontrolle.

**4. Voraussetzungen und Abhängigkeiten.** Der Reiter Fallbeteiligung listet die Teilnahmetypen auf; legen Sie diese daher zuerst fest. Wird das ausgelassen, bietet der Reiter keine Typen an. Die Rollen werden anschließend im Bildschirm Mitarbeiter für Personen ausgewählt.

Setup step: Tier 1, step 3
Requires: [Teilnahmetypen](#screen-participation_types)
Unlocks: [Mitarbeiter](#screen-staff-members), [Support-Zugriff](#screen-support_access)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: staff-roles - Liste des Rollenverzeichnisses mit Fall- und Konfigurationszugriff]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Platzhalter „Rollen suchen“. | Leer |
| Rolle | Kennzeichen und Name | Nicht zutreffend | Markiert integrierte Rollen und Rollen, die „von ForMedrixAI verwaltet“ werden. | Nicht zutreffend |
| Beschreibung | Text | Nicht zutreffend | | Nicht zutreffend |
| Fallzugriff | Ja/Nein | Nicht zutreffend | Ob die Rolle an Fällen arbeitet. | Nicht zutreffend |
| Konfigurationszugriff | Ja/Nein | Nicht zutreffend | Ob die Rolle die Konfiguration öffnet. | Nicht zutreffend |
| Berechtigungen | Anzahl (n von gesamt) | Nicht zutreffend | | Nicht zutreffend |
| Befehle | Balken | Nicht zutreffend | Aktivierte Sprach- und Tastaturbefehle. | Nicht zutreffend |
| Bearbeiten / Ansehen, Duplizieren | Zeilenschaltflächen | Nicht zutreffend | Eine Rolle, die Sie nicht ändern können, öffnet sich als Ansicht. Duplizieren erzwingt, dass die Kopie eine eigene (nicht integrierte) Rolle ist. | Nicht zutreffend |

#### Rollenfenster

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | | Leer |
| Farbe | Farbauswahl | Optional | | `#8AB4F8` |
| Beschreibung | Text | Optional | | Leer |
| Fallzugriff | Kontrollkästchen | Optional | | Aus |
| Konfigurationszugriff | Kontrollkästchen | Optional | | Aus |
| Reiter Berechtigungen | Kontrollkästchen, gruppiert | Optional | Ein Kästchen je Berechtigung. Berechtigungen mit hohem Risiko tragen die Markierung **Auditiert**. Ein Kästchen zeigt „Benötigt“, wenn es von einer anderen Berechtigung abhängt, und „Benötigt von“, wenn andere von ihm abhängen. | Keines angehakt |
| Reiter Befehle | Kontrollkästchen | Optional | Sprach- und Tastaturbefehle für die Rolle. Sie steuern den Zugriff nicht. | Standards der Rolle |
| Reiter Fallbeteiligung | Kontrollkästchen der aktiven Teilnahmetypen | Optional | Die Typen, als die die Inhaber dieser Rolle auftreten dürfen. Eine Rolle Zytologieassistent kann keine Pathologen-Typen innehaben. | Keine |
| Reiter Aktionsreferenz | Nur lesbare Liste | Nicht zutreffend | Eine Kurzübersicht der Aktionen. | Nicht zutreffend |

Das Speichern wird in diesen Fällen mit einer Meldung abgelehnt: Ihnen fehlt die Berechtigung; eine Berechtigung ist nicht gültig; die Änderung würde `config:clinical-mismatch-rules:manage` und `config:ai-prompt:approve` in einer Rolle oder in einer Rolle, die eine Person innehat, zusammenführen (Funktionstrennung); die Änderung würde keine zuweisbare Rolle mit `config:roles:manage` übrig lassen (mindestens eine muss sie behalten); die Rolle ist Superadmin (nur lesend); oder eine Rolle Zytologieassistent erhält einen Teilnahmetyp für Pathologen. Eine Änderung der Berechtigungen einer Rolle wird im Prüfprotokoll als „Role capabilities changed“ festgehalten.

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, duplizieren: `config:roles:manage` (hohes Risiko, protokolliert). Admin und Superadmin besitzen sie standardmäßig. Die Laborleitung nicht.
**Bekannte Grenzen.** Superadmin kann von einem Krankenhaus nicht geändert werden. Eine eigene Rolle beginnt ohne Konfigurationsberechtigungen; haken Sie daher die an, die ihre Personen brauchen.

### Mitarbeiter {#screen-staff-members}
Breadcrumb: Startseite > Konfiguration > Personal > Mitarbeiter

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **Personal** > Unterreiter **Mitarbeiter**
**2. Wartungspunkt:** Mitarbeiter

**3. Geschäftszweck und Umfang.** Der Datensatz jeder Person, die in PathScribe arbeitet: Name, Kontaktdaten, Rollen, die Einrichtungen, an denen sie arbeitet, berufliche Kennungen, Unterschrift, Anmeldepasswort und Status. Die Rollen bestimmen, was sie tun kann. Die Einrichtungen begrenzen, wo diese Berechtigungen gelten.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste Einrichtungen liest das Einrichtungsverzeichnis, und die Liste Rollen liest den Bildschirm Rollen. Die Subspezialitäten stammen aus dem Subspezialitätenverzeichnis in [Subspezialitäten](#screen-subspecialties). Werden die Rollen ausgelassen, kann eine Person nicht gespeichert werden: Mindestens eine Rolle ist erforderlich.

Setup step: Tier 1, step 5
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Rollen](#screen-staff-roles)
Unlocks: [Qualifikationsprüfung](#screen-staff-credentialing), [Sitzungssicherheit](#screen-session_security), [Support-Zugriff](#screen-support_access)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: staff-members - Mitarbeiterliste, nach primärer Rolle gruppiert]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Findet Name, E-Mail, Qualifikationen, NPI, GMC-Nummer, Lizenz und Telefon. | Leer |
| Rollenfilter | Auswahlliste der Rollen (Arzt ist ausgenommen) | Optional | Eine Gruppe „Keine passende Rolle“ zeigt Personen, deren Rolle nicht mehr existiert. | Alle |
| Mitarbeiter | Name, Qualifikationen, Kennzeichen | Nicht zutreffend | Kennzeichen Päd. und Orch sowie „+N“ für weitere Rollen. Nach primärer Rolle gruppiert, mit einer Anzahl. | Nicht zutreffend |
| E-Mail, Rolle, Subspezialitäten, Status | Spalten | Nicht zutreffend | | Nicht zutreffend |
| Mitarbeiter hinzufügen | Schaltfläche | Nicht zutreffend | Benötigt `config:staff-access:assign`. | Nicht zutreffend |

#### Editorfenster

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Vorname, zweiter Vorname, Nachname | Text | Pflicht laut Pflichtfeldern | Siehe den Hinweis unter der Tabelle. | Leer |
| E-Mail | Text im Format name@domain.tld | Pflicht laut Pflichtfeldern | Geprüft mit dem Muster `\S+@\S+\.\S+`. | Leer |
| Rolle(n) | Kontrollkästchen | Pflicht | Mindestens eine. Arzt und Rollen, die nicht zugewiesen werden können, werden nicht angeboten. Gesperrt ohne `config:staff-access:assign`. | Keine |
| Telefon | Text | Optional | | Leer |
| Subspezialitäten | Auswahlliste aus dem Subspezialitätenverzeichnis | Optional | | Keine |
| Qualifikationen | Text | Optional | Zum Beispiel MD. | Leer |
| NPI | Text | Optional | Nummer eines Leistungserbringers in den Vereinigten Staaten. | Leer |
| GMC-Nummer | Text | Optional | Registrierungsnummer im Vereinigten Königreich. | Leer |
| Lizenznummer | Text | Optional | | Leer |
| Sprachprofil | Auswahl aus den Sprachprofilen | Optional | | Leer |
| Rechtschreibsprache | Auswahl von Sprachen | Optional | Die Sprache, die für die Rechtschreibprüfung dieser Person verwendet wird. | Leer |
| Prüferkreise der Zytologie-Qualitätskontrolle | Text, durch Kommas getrennte Rollencodes, in Großbuchstaben erzwungen | Optional | | Leer |
| Einrichtungen | Kontrollkästchen | Optional | Leer bedeutet alle Einrichtungen. Es begrenzt, wo die Berechtigungen der Person gelten. Es ändert nicht, welche Fälle sie öffnen kann. Seit Batch 653 gilt die Begrenzung auch für Aktionen auf Fallebene, wobei die auftraggebende Einrichtung des Falls verwendet wird; ein Fall ohne hinterlegte Einrichtung wird für eine auf Einrichtungen begrenzte Person weiterhin abgelehnt, korrigieren Sie daher die Einrichtung des Auftrags. Eine Person ohne Einrichtungsbegrenzung bemerkt keine Änderung. | Leer (alle) |
| Pädiatrischer Zugang | Ja/Nein-Schalter | Optional | Benötigt `config:staff-access:assign`. | Aus |
| Orchestration-Zugang | Ja/Nein-Schalter | Optional | Benötigt `config:staff-access:assign`. | Aus |
| Schnellauthentifizierungs-PIN | Vier Ziffern | Optional | Nur angezeigt, wenn die Person die Rolle OP-Personal innehat. | Leer |
| Jurisdiktionsbezogene Qualifikationen | Zeilen | Optional | Jede Zeile: Typ (IBMS_ASD, UK_HO_REGISTERED_FORENSIC_PATHOLOGIST, MEDICOLEGAL_APPOINTMENT, NL_KCA_ADVANCED, DE_ZYTO_ASSISTENT_ADV), Ausstellende Stelle, Rechtsraum, Gültig ab (Pflicht), Gültig bis (optional, nicht vor dem Datum Gültig ab). | Keine |
| Anmeldepasswort | Text, 12 bis 128 Zeichen | Optional | Nur beim Bearbeiten. Wird abgelehnt, wenn es kompromittiert, häufig oder musterhaft ist. Optionen: „muss bei der nächsten Anmeldung geändert werden“ und Entfernen. Benötigt `config:staff-password:manage`. | Keines |
| Verknüpfte Anmeldekonten | Liste | Nicht zutreffend | Nur beim Bearbeiten. **Verknüpfung entfernen** löst eine Verknüpfung mit einer externen Identität. | Keine |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |
| Link zum Unterschriftsbild | https-Link | Optional | Eine Vorschau wird angezeigt. PathScribe speichert den Link, nicht das Bild. | Leer |

Welche der Angaben Vorname, zweiter Vorname, Nachname, Rolle, Subspezialitäten, Einrichtungen, E-Mail, Telefon, Qualifikationen, NPI, GMC-Nummer, Lizenz und Unterschrift Pflicht sind, wird in [Pflichtfelder](#screen-field_requirements), Seite **Mitarbeitende**, festgelegt. Die Rolle ist immer Pflicht.

Das Speichern prüft die oben genannten Berechtigungen und lehnt eine Änderung ab, die die Funktionstrennung verletzt. Das Ändern von Rollen, Einrichtungen oder der Zugriffskennzeichen schreibt „Staff access changed“ in das Prüfprotokoll. Das Ändern von Qualifikationen schreibt „Staff credentials changed“.

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Den Datensatz bearbeiten: `config:staff:edit`. Rollen, Einrichtungen, Zugriffskennzeichen und Qualifikationen: `config:staff-access:assign` (benötigt `config:staff:edit`). Passwörter: `config:staff-password:manage`. Alle mit hohem Risiko. Admin und Superadmin besitzen sie standardmäßig.
**Bekannte Grenzen.** Die Schnellauthentifizierungs-PIN gilt nur für die Rolle OP-Personal.
### Delegationstypen {#screen-delegation_types}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Delegationstypen

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance** > **Delegationstypen**
**2. Wartungspunkt:** Delegationstypen

**3. Geschäftszweck und Umfang.** Ein Delegationstyp ist eine benannte Art, einen Fall oder Befund an eine andere Person zu übergeben: neu zuweisen, an einen Pool senden, eine Zweitmeinung einholen, zur Lehrbesprechung senden. Jeder Typ legt fest, ob die Zuständigkeit übergeht, ob eine Notiz nötig ist und ob mehrere Personen ihn empfangen können.

**4. Voraussetzungen und Abhängigkeiten.** Die Auswahl Durchführendes Labor liest das Einrichtungsverzeichnis. Wird es ausgelassen, wird nur **Alle Labore** angeboten.

Setup step: Tier 1, step 4
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Pflichtfelder](#screen-field_requirements)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-delegation_types - Liste der Delegationstypen mit Laborfilter]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Laborfilter | Auswahlliste: Alle, Global oder ein Labor | Optional | Grenzt die Liste ein. | Alle |
| Bezeichnung | Text | Pflicht | | Leer |
| ID | Text, Großbuchstaben, bis zu 24 Zeichen | Pflicht | Wird beim Tippen aus der Bezeichnung abgeleitet. Nach dem Anlegen des Typs gesperrt. | Abgeleitet |
| Beschreibung | Text | Pflicht | | Leer |
| CPT-Hinweis | Text | Optional | | Leer |
| Durchführendes Labor | Auswahlliste | Optional | | Alle Labore |
| Akzentfarbe | Vorgegebene Farbfelder | Optional | | Erste Vorgabe |
| Aktiv | Ja/Nein-Schalter | Optional | | Ein |
| Übertragt Eigentümerschaft | Ja/Nein-Schalter | Optional | | Aus |
| Erfordert Notiz | Ja/Nein-Schalter | Optional | Die absendende Person muss eine Notiz schreiben. | Aus |
| Erlaubt mehrere Empfänger | Ja/Nein-Schalter | Optional | | Aus |
| Löschen | Zeilenschaltfläche | Nicht zutreffend | Nur eigene Typen. Fragt mit Ja oder Nein. | Nicht zutreffend |

Das Produkt liefert sieben Systemtypen mit: REASSIGN, POOL, SECOND_OPINION, CASUAL_REVIEW (inaktiv), TUMOR_BOARD (inaktiv), TEACHING und CONSULT_EXT. Ein Systemtyp erlaubt nur den Schalter Aktiv. Eigene Typen können bearbeitet und gelöscht werden.

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, löschen, umschalten: `config:delegation-types:manage` (hohes Risiko, protokolliert). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Der Untertitel des Bildschirms sagt, ein Systemtyp könne „in einen neuen eigenen Typ dupliziert“ werden, aber es gibt keine Schaltfläche Duplizieren. Um eine Variante zu erstellen, fügen Sie einen neuen Typ hinzu.

### Qualifikationsprüfung {#screen-staff-credentialing}
Breadcrumb: Startseite > Konfiguration > Personal > Qualifikationsprüfung

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **Personal** > Unterreiter **Qualifikationsprüfung**
**2. Wartungspunkt:** Credentialing

**3. Geschäftszweck und Umfang.** Zwei Arten der Zuweisung beaufsichtigter Tätigkeit. Eine **Focused Professional Practice Evaluation (FPPE)** stellt einem neu eingestellten Pathologen einen Betreuer (Proctor) zur Seite, bis eine festgelegte Zahl von Fällen oder Tagen überprüft wurde. Eine Zuweisung zur **Kompetenz der Zytologieassistenz** stellt einer neuen Zytologieassistentin oder einem neuen Zytologieassistenten eine vorgesetzte Person zur Seite, bis eine Zahl von Beurteilungen erledigt ist. Beide erscheinen als Tabellen Aktiv und Abgeschlossen mit einem Einrichtungsfilter.

**4. Voraussetzungen und Abhängigkeiten.** Die ausgewählten Personen müssen bereits unter [Mitarbeiter](#screen-staff-members) existieren und das Labor im [Einrichtungsverzeichnis](#screen-facility-dictionary). Werden sie ausgelassen, sind die Auswahllisten leer.

Setup step: Tier 1, step 6
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Mitarbeiter](#screen-staff-members)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: staff-credentialing - Tabellen der FPPE- und der Kompetenzzuweisungen für Zytologieassistenz]

**6. Feldreferenz.**

#### FPPE-Zuweisung

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Vorläufige Neueinstellung | Auswahlliste des Personals | Pflicht | Die Person, die beurteilt wird. | Keine |
| Betreuer | Auswahlliste des Personals | Pflicht | Muss eine andere Person sein. | Keine |
| Durchführendes Labor | Auswahlliste | Pflicht | | Keines |
| Umfang der Subspezialität | Auswahlliste | Optional | Begrenzt die Überprüfung auf eine Subspezialität. | Alle |
| Überprüfung endet nach | Auswahl: Fallzahl, Dauer, eines von beiden | Pflicht | | Eines von beiden |
| Fallzahl | Ganze Zahl | Pflicht, wenn verwendet | Muss größer als 0 sein. | 20 |
| Dauer | Ganze Zahl in Tagen | Pflicht, wenn verwendet | Muss größer als 0 sein. | 90 |
| Jetzt abschließen | Zeilenschaltfläche | Nicht zutreffend | Beendet die Überprüfung vorzeitig. | Nicht zutreffend |
| Einrichtungsfilter | Auswahlliste | Optional | Filtert beide Tabellen. | Alle |

#### Zuweisung der Kompetenz der Zytologieassistenz

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Neuer Zytotechnologe | Auswahlliste des Personals | Pflicht | | Keine |
| Vorgesetzter | Auswahlliste des Personals | Pflicht | | Keine |
| Durchführendes Labor | Auswahlliste | Optional | | Keines |
| Umfang der Subspezialität | Auswahlliste | Optional | | Alle |
| Erforderliche Beurteilungen | Ganze Zahl | Pflicht | | 2 |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. FPPE: `config:fppe:manage`. Kompetenz der Zytologieassistenz: `config:cytotech-competency:manage`. Beide mit hohem Risiko, protokolliert. Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Die Tabelle zur Kompetenz der Zytologieassistenz zeigt Datumsangaben im eigenen Format des Browsers, nicht in der Anzeigesprache.

### Sitzungssicherheit {#screen-session_security}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Sitzungssicherheit

**Status:** Teilweise

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance** > **Sitzungssicherheit**
**2. Wartungspunkt:** Sitzungssicherheit

**3. Geschäftszweck und Umfang.** Vier organisationsweite Steuerungen dafür, wie Personen ihre Identität nachweisen: die Abmeldezeit bei Leerlauf, biometrische Erneuerungsprüfungen, die Richtlinie für den zweiten Faktor (MFA) und die Authentifizierungsrichtlinie beim Signieren von Befunden. Eine durchführende Einrichtung kann die Leerlaufzeit (im Reiter KI & Leistung der Einrichtung) und die Signierrichtlinie überschreiben.

**4. Voraussetzungen und Abhängigkeiten.** Die Überschreibungen je Einrichtung und die Tabelle der Einrichtungen von Personen lesen das Einrichtungsverzeichnis und die Mitarbeiterliste. Werden sie ausgelassen, ist die Tabelle der Überschreibungen leer, aber die Standards der Organisation funktionieren weiter.

Setup step: Tier 1, step 7
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Mitarbeiter](#screen-staff-members)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-session_security - Karten für Leerlaufzeit, Biometrie, MFA und Signierrichtlinie]

**6. Feldreferenz.**

#### Leerlaufzeit

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Standard der Organisation | Auswahl: 5, 10, 15, 20, 30, 60 Minuten | Pflicht | Wird beim Ändern gespeichert. 60 Sekunden vor der Abmeldung erscheint eine Warnung. Eine Überschreibung der Einrichtung ersetzt ihn für dieses Labor. | 15 Minuten |

#### Biometrische Richtlinie

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Aktiviert | Ja/Nein-Schalter | Optional | Eine Installation kann ihn erzwungen ausschalten. | Aus |
| Rhythmus | Auswahl: per_sign_off, per_session, per_days, never | Optional | Wie oft erneut geprüft wird. | per_sign_off |
| Tage | Ganze Zahl, 1 bis 365 | Pflicht für per_days | | 30 |

#### MFA-Richtlinie

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Modus | Auswahl: off, signing_roles, all | Pflicht | Wer einen zweiten Faktor verwenden muss. | off |
| Minuten bis zur erneuten Prüfung | Ganze Zahl, 1 bis 720 | Optional | Wie lange eine Prüfung des zweiten Faktors gültig bleibt. | 30 |
| Sitzungsstunden | Ganze Zahl, 1 bis 72 | Optional | | 12 |
| Tabelle der Einrichtungen | Liste mit **Einrichtung zurücksetzen** | Nicht zutreffend | Das Zurücksetzen benötigt `auth:mfa-enrolment:reset`. | Nicht zutreffend |

#### Signierrichtlinie

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unternehmensstandard | Auswahl: strict, session | Pflicht | Wie ein Befund beim Signieren authentifiziert wird. | strict |
| Zeitüberschreitung | Auswahl: 15, 30, 60, 240 Minuten | Optional | | 30 Minuten |
| Zweiter Faktor | Ja/Nein-Schalter | Optional | | Aus |
| Überschreibungen der Einrichtungen sperren | Ja/Nein-Schalter | Optional | Verhindert, dass eine Einrichtung die Richtlinie ändert. | Aus |
| Überschreibungen je Einrichtung | Tabelle, eine Zeile je durchführende Einrichtung | Optional | | Erben |
| Exportieren | CSV-Schaltfläche | Nicht zutreffend | | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:session-security:manage` (hohes Risiko, protokolliert). Eine MFA-Einrichtung zurücksetzen: `auth:mfa-enrolment:reset`. Admin und Laborleitung besitzen die erste. Nur Admin und Superadmin besitzen die zweite.
**Bekannte Grenzen.** Der Authenticator wird in der Demonstration simuliert. Beim Single Sign-On verlangt der Identitätsanbieter den zweiten Faktor. Der Bildschirm zur Signierrichtlinie sagt, dass die Einschränkung der Remote-Abmeldung den API-Server braucht und zurückgestellt ist. Der Bildschirm warnt, dass die Authentifizierung beim Signieren mit 21 CFR Part 11 (11.200) zusammenhängt; die Steuerung legt fest, was abgefragt wird, und macht ein Labor nicht von sich aus konform.

### Support-Zugriff {#screen-support_access}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Support-Zugriff

**Status:** Demonstration

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance** > **Support-Zugriff**
**2. Wartungspunkt:** Support-Zugriff

**3. Geschäftszweck und Umfang.** Sie entscheiden, ob der Support von ForMedrixAI auf die Daten Ihrer Organisation zugreifen darf. Der Bildschirm legt die Richtlinie fest, zeigt Anfragen, die auf Genehmigung warten, und aktiven Zugriff und führt ein getrenntes Protokoll von allem, was der Support getan hat. „Support-Zugriff“ bedeutet eine Superadmin-Sitzung, die auf eine Organisation zugreift, zu deren Personal die Person nicht gehört. Ihre eigenen Benutzer sind nie betroffen.

**4. Voraussetzungen und Abhängigkeiten.** Jemand muss genehmigen können: ein Mitglied Ihrer Organisation, das `config:support-access:approve` besitzt und nicht die anfragende Person ist. Richten Sie zuerst Rollen und Personen ein. Kann niemand genehmigen und lautet die Richtlinie Genehmigung erforderlich, bleiben Anfragen unbeantwortet.

Setup step: Tier 1, step 8
Requires: [Rollen](#screen-staff-roles), [Mitarbeiter](#screen-staff-members)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-support_access - Richtlinie, offene Anfragen, aktiver Zugriff und Support-Aktivität]

**6. Feldreferenz.**

#### Richtlinie

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Richtlinie für den Support-Zugriff | Auswahl: Deaktiviert, Genehmigung erforderlich, Immer erlaubt | Pflicht | Deaktiviert: Der Support kann Ihre Daten nicht öffnen, auflisten oder durchsuchen. Genehmigung erforderlich: Der Support fragt je Ticket mit einem Grund an, und eine genehmigende Person genehmigt. Immer erlaubt: keine Anfrage nötig, alles wird dennoch aufgezeichnet. | Genehmigung erforderlich |
| Zugriffsfenster | Auswahl: 30 Minuten, 1, 2, 4, 8 Stunden | Pflicht | Wie lange eine Genehmigung gilt. Der Support oder Sie können sie früher beenden. | 2 Stunden |
| Richtlinie speichern | Schaltfläche | Nicht zutreffend | | Nicht zutreffend |

#### Anfragen und aktiver Zugriff

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Wartet auf Genehmigung | Tabelle | Nicht zutreffend | Spalten: Support-Mitarbeiter, Ticket, Grund, Angefragt. Schaltflächen **Genehmigen** und **Ablehnen**. Sie können Ihre eigene Anfrage nicht genehmigen. | Nicht zutreffend |
| Aktiver Support-Zugriff | Tabelle | Nicht zutreffend | Spalten: Support-Mitarbeiter, Ticket, Genehmigt von, Verbleibende Zeit. Schaltfläche **Widerrufen**. | Nicht zutreffend |

#### Support-Aktivität

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Prüftabelle | Tabelle | Nicht zutreffend | Spalten: Zeitstempel, Name des Support-Mitarbeiters, Herkunfts-IP, Herkunftsland, Ticket-ID, Ausgeführte Aktion, Fall-IDs, Details. Jeder Eintrag ist durch einen Hash mit dem vorherigen verkettet, sodass ein geänderter oder entfernter Eintrag als „Datensatz geändert bei Eintrag N“ erscheint. | Nicht zutreffend |
| CSV exportieren, JSON exportieren, Als PDF exportieren | Schaltflächen | Nicht zutreffend | Benötigt `config:support-audit:view`. | Nicht zutreffend |

#### [FORMEDRIXAI INTERNAL ONLY] Bereich „Support-Zugriff anfragen“ {#screen-support_access-request}

> 🔒 **Interne eingeschränkte Einstellung von ForMedrixAI**
> **Geltungsbereich:** Nur internes Service- und Bereitstellungspersonal.
> **Erläuterung:** Dieser Bereich erscheint nur in einer Superadmin-Sitzung, also einer Support-Anmeldung von ForMedrixAI. Er öffnet ein an ein Ticket gebundenes Fenster auf die Daten einer Kundenorganisation. Eine Administratorin oder ein Administrator des Kunden sieht ihn nie, und eine Änderung an dieser Stelle durch jemand anderen als den Support würde einer Person den Zugriff auf geschützte Gesundheitsdaten ohne die Genehmigung des Kunden ermöglichen.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Organisation | Auswahlliste | Pflicht | Der Kunde, auf den zugegriffen werden soll. | Keine |
| Support-Ticket-ID | Text | Pflicht | Zum Beispiel SUP-1234. | Leer |
| Grund | Text, mindestens 10 Zeichen | Pflicht | Was angesehen werden muss und warum. | Leer |
| Zugriff anfragen, Zugriff beenden | Schaltflächen | Nicht zutreffend | | Nicht zutreffend |
| Ticket geschlossen (simuliert) | Schaltfläche | Nicht zutreffend | Simuliert, dass das Ticketsystem das Ticket schließt: beendet den Zugriff und zeichnet es auf. Es ist kein Ticketsystem angeschlossen. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Richtlinie und Fenster festlegen: `config:support-access:policy`. Genehmigen, ablehnen, widerrufen: `config:support-access:approve`. Das Prüfprotokoll ansehen und exportieren: `config:support-audit:view`. Alle mit hohem Risiko. Admin und Superadmin besitzen sie standardmäßig. Die genehmigende Person muss zur Organisation gehören und darf nicht die anfragende Person sein, obwohl ein Superadmin jede Berechtigung besitzt.
**Bekannte Grenzen.** Die Browserversion ist vollständig, aber die Serverseite ist nicht angeschlossen: Die Richtliniensperre, ticketgebundene Sitzungen, die nur anhängende Prüftabelle, die Benachrichtigung der genehmigenden Personen und der PDF-Export sind in `AUTHORIZATION_API.md` spezifiziert und noch nicht gebaut. Die Benachrichtigung per E-Mail wird simuliert. Die Herkunfts-IP und das Herkunftsland im Prüfprotokoll kann nur der Server wahrheitsgemäß aufzeichnen; in der Browserversion sind sie daher nicht echt.

## Teil C: Zuordnungen von Arbeitsplatz, Drucker, Etikettengenerator und Scanner {#ch2-hardware}
Breadcrumb: Startseite > Konfiguration > System > Arbeitsplatz & Hardware

Dieser Teil behandelt die physische Seite: das Register der Geräte, die Drucker und das Programm, das sie ansteuert, die Arbeitsplätze, die scannen und drucken, und die Regeln für Etiketten. Die meisten dieser Bildschirme liegen in der Gruppe **Arbeitsplatz & Hardware**, die über der Seitenleiste eine gemeinsame Auswahl **Einrichtung** zeigt. Wählen Sie dort einmal einen Standort, und Druckeinstellungen, Druckerprofile, Scanstationen, Standortagenten, Geräte und Zuschnitt-Hardware zeigen alle diesen Standort. Arbeitsplatzgruppen liegt in der Gruppe **Labormaterialien & Arbeitsabläufe**.

**Empfohlene Reihenfolge.** Registrieren Sie zuerst die Geräte (Geräte), legen Sie dann fest, was jeder Drucker kann (Druckerprofile), installieren und konfigurieren Sie dann den Standortagenten, benennen Sie dann die Arbeitsplätze (Scanstationen), legen Sie dann die Druckregeln und die Etikettenlayouts fest, registrieren Sie dann die Computer und gruppieren Sie die Arbeitsplätze.

**Was ein Etikett braucht.** Ein gedrucktes Etikett durchläuft vier Dinge. Die Druckeinstellungen wählen Etikettengröße, Barcodetyp und Druckerprofil. Der Etikettendesigner legt die Felder an. Die Druckerprofile legen fest, wie ein Browser den Drucker erreicht. Der Reiter Drucken des Einrichtungseditors und der Standortagent legen fest, wohin Befunde und Etiketten im Netzwerk des Standorts gehen. Ohne API-Server erreicht nichts einen echten Drucker: Jeder Druck wird im [Protokoll simulierter Drucke](#screen-simulated_print) aufgezeichnet.

### Geräte {#screen-equipment}
Breadcrumb: Startseite > Konfiguration > System > Arbeitsplatz & Hardware > Geräte

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Arbeitsplatz & Hardware** > **Geräte**
**2. Wartungspunkt:** Geräte

**3. Geschäftszweck und Umfang.** Ein Register aller Geräte im Labor: Analysegeräte, Färbeautomaten, Gewebeeinbettautomaten, Objektträgerscanner, Kameras, Waagen, Etikettendrucker, Graviergeräte und Lagereinheiten. Jedes Gerät gehört zu einem durchführenden Labor und kann an einer Scanstation stehen. Andere Bildschirme verweisen auf das Register: Ein Druckerprofil verknüpft einen Etikettendrucker, Zuschnitt-Hardware verknüpft eine Kamera oder Waage, und ein molekularer Ansatz zielt auf ein aktives Analysegerät. Ein Wartungsprotokoll hält Wartung, Kalibrierung und Störungen fest.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste Durchführendes Labor liest das Einrichtungsverzeichnis, und die Liste Scanstation liest die [Scanstationen](#screen-scan_stations) dieses Labors. Wird die Einrichtung ausgelassen, kann das Gerät nicht gespeichert werden. Die Scanstation ist optional und kann später festgelegt werden.

Setup step: Tier 1, step 9
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Druckerprofile](#screen-printer_profiles), [Zuschnitt-Hardware](#screen-grossing_hardware)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-equipment - Geräteregister mit Filtern für Art und Status]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Name, Code, Hersteller, Modell oder Seriennummer. | Leer |
| Artfilter | Auswahlliste: Alle Arten oder eine Art | Optional | | Alle Arten |
| Statusfilter | Reiter, beginnend mit Alle | Optional | | Alle |
| Spalten | Gerät, Code, Art, Hersteller und Modell, Durchführendes Labor, Scanstation, Wartung, Einstellungen, Status, Aktionen | Nicht zutreffend | Wartung zeigt Aktuell, Bald fällig, Überfällig, Noch nicht durchgeführt, Nicht geplant oder Störung, mit dem nächsten Fälligkeitsdatum. Einstellungen verlinkt auf das Druckerprofil oder den Datensatz der Zuschnitt-Hardware, der das Gerät verwendet. | Nicht zutreffend |
| + Gerät hinzufügen, Bearbeiten, Protokoll, Deaktivieren / Reaktivieren | Schaltflächen | Nicht zutreffend | Deaktivieren, nicht löschen, weil Ansätze und gedruckte Etiketten den Code tragen. | Nicht zutreffend |

#### Fenster Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Code | Text, Buchstaben, Ziffern, „_“ und „-“ | Pflicht | Die ID, die andere Datensätze tragen, zum Beispiel PANTHER_02 in einem molekularen Ansatz und dessen Deck-Barcode. Muss eindeutig sein. Kann nach dem Anlegen nicht geändert werden. | Leer |
| Name | Text | Pflicht | | Leer |
| Art | Auswahl: Analysegerät, Färbeautomat, Gewebeeinbettautomat, Flüssigkeitszytologie-Prozessor, Objektträgerscanner, Kamera, Waage, Etikettendrucker, Graviergerät, Lagereinheit, Sonstiges | Pflicht | Aktive Analysegeräte sind das, worauf molekulare Ansätze zielen können. | Analysegerät |
| Hersteller, Modell | Text | Optional | | Leer |
| Seriennummer | Text | Optional | | Leer |
| Durchführendes Labor | Auswahlliste | Pflicht | Eine Änderung leert die Scanstation. | Gewählter Standort |
| Scanstation | Auswahlliste der Stationen in diesem Labor | Optional | Wo es steht. Bei einem Analysegerät prüft die Arbeitslistenzuteilung, dass von dieser Station gesendet wird. Eine Station in einem anderen Labor wird abgelehnt. | Keine |
| Kalibrierung alle (Tage) | Ganze Zahl, 1 bis 3650 | Optional | Leer bedeutet kein Plan. Fälligkeitsdaten zählen ab dem letzten bestandenen Eintrag im Wartungsprotokoll. | Leer |
| Wartung alle (Tage) | Ganze Zahl, 1 bis 3650 | Optional | Gleiche Regel. | Leer |
| Niedrigste Temperatur (°C), Höchste Temperatur (°C) | Zahlen, niedrigste unter höchster; beide dürfen leer sein | Optional | Batch 730: der Bereich für eine Temperaturkontrolle im Gerätelogbuch. Ein Messwert außerhalb gilt als nicht bestanden; der Bereich wird in jeden Eintrag übernommen. | Leer |
| Nimmt Großformat-Objektträger | Kontrollkästchen, nur Färbeautomaten und Objektträgerscanner | Optional | Batch 732: Das Gerät nimmt Großformat-Objektträger (Megablöcke). Die Objektträgerverteilung schickt einen Großformat-Objektträger nur an einen so markierten Scanner. | Nicht angekreuzt |
| Status | Aktiv / Inaktiv | Optional | | Aktiv |
| Deck-Layout | Zeilen, nur Analysegeräte | Optional | Die Steckplätze auf dem Deck des Analysegeräts. Jede Zeile: Deck oder Fach, Steckplatz-ID (Buchstaben, Ziffern, „_“, keine zwei gleich) und Nimmt auf (Extraktionsplatte, Reagenzkartusche, Probenröhrchen-Rack; mindestens eines). Die Rack-Beladung bietet nur passende Steckplätze an. Die Steckplatz-ID wird auf den Barcode der Deckposition gedruckt. | Keine |

#### Fenster Wartungsprotokoll

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Verlauf | Tabelle: Datum, Art, Ergebnis, Von, Anmerkungen | Nicht zutreffend | Einträge können nicht geändert oder gelöscht werden. Korrigieren Sie einen Fehler mit einem neuen Eintrag. Ein Hinweis „Offene Störung“ erscheint, bis eine bestandene Reparatur oder Funktionsprüfung erfasst ist. | Nicht zutreffend |
| Art | Auswahl: Wartung, Kalibrierung, Funktionsprüfung, Reparatur, Störung | Pflicht | | Wartung |
| Durchgeführt am | Datum | Pflicht | Darf nicht in der Zukunft liegen. | Heute |
| Durchgeführt von | Text | Pflicht | Mitarbeiterin oder Mitarbeiter oder Servicetechniker. | Ihr Name |
| Ergebnis | Auswahl: Bestanden, Nicht bestanden, Nicht zutreffend | Pflicht | | Bestanden |
| Anmerkungen | Text | Pflicht bei einem Fehlschlag oder einer Störung | | Leer |

#### Färbegestelle

Batch 737. Wird unter dem Register angezeigt, wenn das Labor wiederverwendbare Färbegestelle hat (gravierte RACK-IDs). Jede Zeile ist ein Gestell mit dem Kästchen **Nimmt Großformat-Objektträger auf**, sofort gespeichert (erfordert `config:equipment:manage`). Die Chargenverwaltung weist einen Großformat-Objektträger (aus einem Megablock geschnitten) zurück, der auf einen Färbeträger gescannt wird, der keine Großformat-Objektträger aufnimmt; ein Einweg-Färbeträger nimmt sie auf, wenn in Neuer Behälter **Nimmt Großformat-Objektträger auf (Megablöcke)** angekreuzt ist. Die Demo hat ein solches Gestell, RACK-STAIN-LF-01.

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:equipment:manage`. Einen Eintrag im Wartungsprotokoll erfassen: `equipment:maintenance:record`. Beide mit hohem Risiko. Admin und Laborleitung besitzen beide. Die Rollen Histologie-Fachkraft, Zytologieassistent und Molekulartechnologe besitzen ebenfalls die Berechtigung für das Protokoll.
**Bekannte Grenzen.** Fälligkeitsdaten der Wartung werden in der Zeitzone der Einrichtung berechnet, die in den Einstellungen des Beitrags-Dashboards festgelegt ist.
### Druckerprofile {#screen-printer_profiles}
Breadcrumb: Startseite > Konfiguration > System > Arbeitsplatz & Hardware > Druckerprofile

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Arbeitsplatz & Hardware** > **Druckerprofile**
**2. Wartungspunkt:** Druckerprofile

**3. Geschäftszweck und Umfang.** Ein Druckerprofil hält fest, was ein Etikettendrucker tatsächlich kann (Auflösung, Unterstützung von DataMatrix und GS1, Modulgröße) und wie ein Browser ihn erreicht (die Bridge). PathScribe verwendet es, um die richtige Etikettenvorlage zu wählen und einen Auftrag abzulehnen, den der Drucker nicht verarbeiten kann, bevor er gesendet wird.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste Gerät im Verzeichnis liest die [Geräte](#screen-equipment) und bietet nur Etikettendrucker an. Die Liste Einrichtung liest das Einrichtungsverzeichnis. Wird Geräte ausgelassen, wird das Profil dennoch gespeichert, ist aber mit keinem Gerät verknüpft. Ein Gerät, das kein Etikettendrucker ist, wird abgelehnt: „Das Gerät im Verzeichnis muss ein Etikettendrucker sein.“

Setup step: Tier 1, step 10
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Geräte](#screen-equipment)
Unlocks: [Druckeinstellungen](#screen-print_settings), [Scanstationen](#screen-scan_stations), [Etikettendesigner](#screen-label_designer)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-printer_profiles - Tabelle der Druckerprofile]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Drucker-ID, Modell, Hersteller, Bridge, Einrichtung, Gerät im Verzeichnis, DPI, GS1 / DataMatrix, Status, Aktionen | Nicht zutreffend | GS1 / DataMatrix zeigt Beides, Nur DataMatrix, Nur GS1 oder einen Strich. Ein gemeinsam genutzter Drucker zeigt „Global“. | Nicht zutreffend |
| + Druckerprofil hinzufügen, Bearbeiten, Duplizieren, Entfernen | Schaltflächen | Nicht zutreffend | Entfernen löscht das Profil. | Nicht zutreffend |

#### Fenster Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Drucker-ID | Text | Pflicht | Zum Beispiel ZEBRA-192.168.12.85. | Leer |
| Modell | Text | Pflicht | Zum Beispiel ZT411. | Leer |
| Hersteller | Auswahl: Zebra (ZPL), Citizen, SATO, Leica CEREBRO, Sakura Tissue-Tek, Andere | Optional | | Zebra (ZPL) |
| ZPL-Version | Text | Optional | Zum Beispiel 7.0. | Leer |
| Bridge-Typ | Auswahl: QZ Tray, Zebra Browser Print, BarTender Automation, Direkt über die Schnittstellen-Engine, PathScribe Agent, Druckdialog des Betriebssystems | Pflicht | Wie ein Browser den Drucker an diesem Standort erreicht. | Druckdialog des Betriebssystems |
| Agent-Port | Ganze Zahl, 1024 bis 65535 | Optional | Wird für die Bridge PathScribe Agent angezeigt. Lassen Sie das Feld leer, sofern die IT den Agenten nicht von seinen Standard-Ports (9100 bis 9102) weg verschoben hat. | Leer |
| Einrichtung | Auswahlliste oder Global | Optional | Ein gemeinsam genutzter Netzwerkdrucker, der von mehreren Standorten aus verwendet wird, hat keinen einzelnen Eigentümer: Belassen Sie ihn auf Global. | Gewählter Standort oder Global |
| Gerät im Verzeichnis | Auswahlliste aus Geräte | Optional | Der physische Drucker. | Nicht verknüpft |
| DPI | Ganze Zahl | Pflicht | | 300 |
| Maximale Druckdichte | Ganze Zahl | Pflicht | | 300 |
| DataMatrix-Modulgröße | Ganze Zahl, in Punkten | Pflicht | Wirkt sich auf die Lesbarkeit bei der Auflösung dieses Druckers aus. | 4 |
| IP-Adresse | Text | Optional | Zum Beispiel 192.168.12.85. | Leer |
| Port | Ganze Zahl | Optional | | 9100 |
| Unterstützt DataMatrix | Ja/Nein-Schalter | Optional | | Ein |
| Unterstützt GS1 | Ja/Nein-Schalter | Optional | | Ein |
| Aktiv | Ja/Nein-Schalter | Optional | | Ein |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, duplizieren, entfernen: `config:printers:manage` (hohes Risiko, protokolliert). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Heute sendet nur ein Profil mit der Bridge QZ Tray tatsächlich Etiketten. Jede andere Bridge weicht auf den Druckdialog des Browsers aus.

### Standortagenten {#screen-site_agents}
Breadcrumb: Startseite > Konfiguration > System > Arbeitsplatz & Hardware > Standortagenten

**Status:** Teilweise

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Arbeitsplatz & Hardware** > **Standortagenten**. Wählen Sie zuerst in der Auswahl Einrichtung einen Standort.
**2. Wartungspunkt:** Standortagenten

**3. Geschäftszweck und Umfang.** Ein Standortagent ist ein PathScribe-Programm, das im Netzwerk eines Standorts installiert wird. Es druckt Befunde und Etiketten auf den Druckern des Standorts und schreibt und holt Dateien auf den Netzwerkfreigaben des Standorts. Dieser Bildschirm registriert Agenten, legt fest, welche Drucker und Freigaben ein Agent verwenden darf, widerruft einen Agenten und legt das Zeitfenster fest, in dem er sich selbst aktualisieren darf.

**4. Voraussetzungen und Abhängigkeiten.** Ein Agent gehört zu einem durchführenden Labor; legen Sie daher zuerst die Einrichtung an. Der Bildschirm zeigt „Wählen Sie einen Standort (ein durchführendes Labor)“, bis Sie einen auswählen. Die hier festgelegten Drucker-IDs sind die Ziel-IDs, auf die Arbeitsplätze und der Reiter Drucken des Einrichtungseditors verweisen.

Setup step: Tier 1, step 11
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Arbeitsplätze](#screen-workstations), [Scanstationen](#screen-scan_stations)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-site_agents - Agenten, Agentendrucker, Dateifreigaben und Aktualisierungsfenster]

**6. Feldreferenz.**

#### Agenten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Neuer Registrierungscode | Schaltfläche | Nicht zutreffend | Erzeugt einen Einmalcode, der bei der Installation des Agenten einzugeben ist. Er läuft ab, wird einmal angezeigt und kann kopiert werden. Benötigt `config:site-agents:enroll`. | Nicht zutreffend |
| Agententabelle | Rechner, Status, Version, Zuletzt gemeldet, Zertifikat läuft ab, Drucker, Aktionen | Nicht zutreffend | Der Status ist Online, Benötigt Aufmerksamkeit, Offline oder Widerrufen. Drucker zeigt „N von M erreichbar“. | Nicht zutreffend |
| Widerrufen | Zeilenschaltfläche | Nicht zutreffend | Trennt den Agenten sofort ab. | Nicht zutreffend |
| Grund für den Widerruf | Auswahl: Möglicherweise kompromittiert, Versehentlich registriert, An einen anderen Standort verlegt, Rechner ersetzt, Rechner außer Betrieb genommen, Andere | Pflicht | | Keiner |
| Notiz | Text, bis zu 500 Zeichen | Pflicht bei Andere | | Leer |

#### Agentendrucker

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Drucker-ID | Text | Pflicht | Muss am Standort eindeutig sein. | printer-1, printer-2 und so weiter |
| Name | Text | Optional | | Leer |
| Art | Auswahl: Befund, Etikett | Pflicht | Etikettendrucker verwenden nur Raw 9100. | Befund |
| Protokoll | Auswahl: Raw 9100, LPR, IPP, IPPS (bestätigt das Drucken) | Pflicht | IPPS ist bevorzugt: Der Drucker bestätigt jeden Befund. Raw 9100 und LPR können nur bestätigen, dass gesendet wurde. | IPPS |
| Adresse | IP-Adresse oder Hostname | Pflicht | IPv6 wird noch nicht unterstützt. | Leer |
| Port | Ganze Zahl, 1 bis 65535 | Pflicht | | Nach Protokoll: 9100, 515, 631 |
| LPR-Warteschlange | Text | Optional | Wird für LPR angezeigt. | Leer |
| IPP-Pfad | Text | Optional | Wird für IPP und IPPS angezeigt. | Leer |
| Drucker hinzufügen, Entfernen | Schaltflächen | Nicht zutreffend | Hinzufügen benötigt `config:site-agent-config:manage`. | Nicht zutreffend |

#### Dateifreigaben

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Richtung | Schreiben oder Abholen | Pflicht | Festgelegt durch **Schreibfreigabe hinzufügen** oder **Abholfreigabe hinzufügen**. | Nach Schaltfläche |
| Freigabe-ID | Text | Pflicht | Muss am Standort eindeutig sein. | share-1, share-2 |
| Freigabepfad | Text wie \\server\share\folder | Pflicht | | Leer |
| Dateimuster | Dateinamenmuster wie *.hl7 | Pflicht für Abholen | Nur ein Name, keine Ordner. PDFs und Bilder werden nicht abgeholt: Sie bleiben Links. | Leer |
| Unverändert seit (s) | Ganze Zahl in Sekunden | Pflicht für Abholen | Mindestens 5 Sekunden. | 30 |
| Größte Datei (MB) | Ganze Zahl, 1 bis 500 | Pflicht für Abholen | | 50 |
| Nach der Übergabe | Auswahl: In „processed“ verschieben, Löschen | Pflicht für Abholen | Das Löschen klinischer Dateien wird nicht empfohlen. | In „processed“ verschieben |
| Übergeben an | Auswahl: PathScribe-Import (Aufträge oder Ergebnisse), Kanal der Schnittstellen-Engine | Pflicht für Abholen | | Kanal der Schnittstellen-Engine |
| Engine-Kanal | Text, mit Vorschlägen | Pflicht bei einem Kanal | | Leer |
| Abgelehnte Dateien nach | Ordnername aus Buchstaben, Ziffern, Leerzeichen, - oder _ (bis zu 64 Zeichen) | Pflicht für Abholen | | rejected |
| Name des Zugangsdaten-Eintrags | Text | Optional | Der Name des Eintrags, der das Freigabepasswort enthält. Passwörter werden nie in PathScribe eingegeben. | Leer |

#### Agentenaktualisierungen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Aktualisierungsfenster von, bis | Uhrzeit wie 02:00, in der Ortszeit des Standorts | Optional | Geben Sie beide Zeiten an oder keine. Sie dürfen nicht gleich sein. Das Fenster darf über Mitternacht reichen. Ohne Fenster aktualisiert sich der Agent, wenn der Server es sagt. | Kein Fenster |
| Drucker und Freigaben speichern, Verwerfen | Schaltflächen | Nicht zutreffend | Der Agent übernimmt eine gespeicherte Änderung sofort. Ein Hinweis „Nicht gespeicherte Änderungen“ erscheint, bis Sie speichern. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Agenten registrieren und widerrufen: `config:site-agents:enroll`. Drucker, Freigaben, Aktualisierungsfenster: `config:site-agent-config:manage`. Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** In der Demonstration kann sich kein Agent registrieren; die Agentenliste ist daher leer. Sie können dennoch einen Code erzeugen und Drucker und Freigaben einrichten. Der Produktivbetrieb verwendet den Serververtrag in `SITE_AGENT_API.md`. Der Agent lehnt jeden Drucker außerhalb der Subnetze und Ports ab, die Ihre IT auf seinem Rechner erlaubt hat.

### Scanstationen {#screen-scan_stations}
Breadcrumb: Startseite > Konfiguration > System > Arbeitsplatz & Hardware > Scanstationen

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Arbeitsplatz & Hardware** > **Scanstationen**
**2. Wartungspunkt:** Scanstationen

**3. Geschäftszweck und Umfang.** Die physischen Arbeitsplätze, als die sich ein Terminal bei der Anmeldung und in der oberen Leiste ausweisen kann und zu denen ein gedrucktes Stationsetikett mitten im Arbeitsablauf wechselt. Zu Beginn sind acht Stationen eingerichtet. Name, Barcode-Code und Arbeitsablaufphase legen Sie selbst fest. Geräte können an einer Station stehen, und Arbeitsplatzgruppen fassen Stationen zusammen.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste Einrichtung liest das Einrichtungsverzeichnis (nur durchführende Labore). Eine Station, die das Drucken unterstützt, braucht ein Kassetten- und Objektträger-Druckerprofil aus den [Druckerprofilen](#screen-printer_profiles). Wird es ausgelassen, wird das Speichern abgelehnt: „Erforderlich, wenn Unterstützt Drucken aktiviert ist.“

Setup step: Tier 1, step 12
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Druckerprofile](#screen-printer_profiles)
Unlocks: [Druckeinstellungen](#screen-print_settings), [Arbeitsplatzgruppen](#screen-workstation_groups), [Zuschnitt-Hardware](#screen-grossing_hardware)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-scan_stations - Liste der Scanstationen mit Etikett drucken und Alle aktiven Stationsetiketten drucken]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Name oder Barcode-Code. | Leer |
| Statusfilter | Auswahl: Alle, Aktiv, Inaktiv | Optional | | Alle |
| Spalten | Station, Barcode-Code, Einrichtung, Arbeitsablaufphase, Status, Aktionen | Nicht zutreffend | | Nicht zutreffend |
| Etikett drucken, Alle aktiven Stationsetiketten drucken | Schaltflächen | Nicht zutreffend | Drucken das Barcode-Etikett der Station. | Nicht zutreffend |
| + Scanstation hinzufügen, Bearbeiten, Deaktivieren / Reaktivieren | Schaltflächen | Nicht zutreffend | Deaktivieren, nicht löschen. | Nicht zutreffend |

#### Fenster Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Stationsname | Text | Pflicht | Zum Beispiel Zuschnittstation 4. | Leer |
| Barcode-Code | Text | Pflicht | Auf das Etikett der Station gedruckt als `STATION:` plus der Code. Zum Beispiel GROSSING-04. | Leer |
| Einrichtung | Auswahlliste der durchführenden Labore | Pflicht | Das Labor, in dem der Arbeitsplatz steht, nicht eine einsendende Einrichtung. | Gewählter Standort |
| Arbeitsablaufphase | Auswahl: Probeneingang, Zuschnitt, Aufarbeitung, Einbettung, Mikrotomie / Schneiden, Färbung, Objektträgerarchiv, Andere | Pflicht | | Probeneingang |
| Drucker-IP | Text | Optional | Der Netzwerk-Etikettendrucker an diesem Arbeitsplatz. Getrennt vom Druckerprofil. | Leer |
| Unterstützt Gravur | Ja/Nein-Schalter | Optional | Gravurhardware wie Leica CEREBRO. Das Senden an das Graviergerät ist ein Platzhalter, bis die Anbieterintegration gebaut ist. | Aus |
| Unterstützt Drucken | Ja/Nein-Schalter | Optional | Druckt hier GS1-DataMatrix-Etiketten für Kassetten und Objektträger. | Aus |
| Kassetten-/Objektträger-Druckerprofil | Auswahlliste der Druckerprofile | Pflicht, wenn Unterstützt Drucken aktiviert ist | | Keines |
| Status | Aktiv / Inaktiv | Optional | | Aktiv |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:scan-stations:manage` (hohes Risiko, protokolliert). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Das Senden an ein Graviergerät ist ein Platzhalter.

### Druckeinstellungen {#screen-print_settings}
Breadcrumb: Startseite > Konfiguration > System > Arbeitsplatz & Hardware > Druckeinstellungen

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Arbeitsplatz & Hardware** > **Druckeinstellungen** (der Abschnitt, mit dem der Reiter System sich öffnet)
**2. Wartungspunkt:** Druckeinstellungen

**3. Geschäftszweck und Umfang.** Das Standardverhalten des Etikettendrucks für das Labor: jedes Kassettenetikett beim Erfassen drucken oder als Stapel; die Etikettengrößen; der Barcodetyp und die Präfixe; an welches Druckerprofil jede Art von Etikett geht; und das physische Layout von Kassetten- und Objektträgeretiketten. Ist keine Einrichtung gewählt, bearbeiten Sie den Systemstandard. Die Wahl einer Einrichtung zeigt deren Einstellungen: Bis Sie eine Überschreibung anlegen, erbt sie den Systemstandard und ist nur lesbar. **+ Einrichtungsüberschreibung erstellen** kopiert den Standard, damit die Einrichtung abweichen kann, und **Auf Systemstandard zurücksetzen** entfernt die Überschreibung. Eine Einrichtung behält nur die Felder, in denen sie abweichen soll.

**4. Voraussetzungen und Abhängigkeiten.** Die drei Auswahllisten für Druckerprofile lesen die [Druckerprofile](#screen-printer_profiles). Werden sie ausgelassen, bietet jede nur „Druckdialog des Browsers verwenden“ an. Die Einrichtungsauswahl liest das Einrichtungsverzeichnis.

Setup step: Tier 1, step 13
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Druckerprofile](#screen-printer_profiles), [Scanstationen](#screen-scan_stations)
Unlocks: [Etikettendesigner](#screen-label_designer)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-print_settings - Karten der Druckeinstellungen mit dem Banner zur Einrichtungsüberschreibung]

**6. Feldreferenz.** Jedes Bedienelement speichert, sobald Sie es ändern. Ein Hinweis „Speichern“ erscheint während des Speicherns.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Standard-Druckverhalten | Auswahl: Auf Abruf (je Block oder Behälter), Stapel (je Fall oder Auftrag) | Pflicht | Auf Abruf druckt jedes Kassettenetikett, sobald es beim Zuschnitt erfasst wird. Stapel verschiebt den Druck auf eine Aktion je Fall. | Auf Abruf |
| On-Demand-Leitplanken erzwingen | Ja/Nein-Schalter | Optional | Wenn aktiviert, ist der Standard laborweit festgelegt, und der Probeneingang kann einen Fall nicht auf Stapel umstellen. | Aus |
| Scanverifizierung erforderlich | Ja/Nein-Schalter | Optional | Verlangt das Scannen des Barcodes der neuen Kassette oder des neuen Behälters, bevor zum nächsten Block weitergegangen wird. | Aus |
| Beim Nachdruck eines Befunds nach dem Grund fragen | Ja/Nein-Schalter | Optional | Der Nachdruck eines gedruckten Befunds braucht einen Grund, der mit dem Druck im Prüfprotokoll festgehalten wird. | Aus |
| Behälteretikettengröße | Auswahl von Etikettengrößen-Voreinstellungen (Größen für ganzseitige Anforderungen werden nicht angeboten) | Pflicht | Standardprobe (CLSI AUTO12, 2,0 mal 1,0 Zoll), Sekundäre Kassetten-/Objektträger-Überlagerung (1,0 mal 0,25 Zoll), Mittlerer Behälter (3,0 mal 2,0 Zoll), Großer chirurgischer Behälter (4,0 mal 2,0 Zoll), Anforderungsaufkleber (4,0 mal 2,0 Zoll), Anforderungs-/Transportbeutel (4,0 mal 6,0 Zoll). | Standardprobe |
| Anforderungsetikettengröße | Auswahl aller Voreinstellungen, einschließlich Ganzseitige Anforderung US Letter und A4 | Pflicht | Der Aufkleberbogen für Anforderungen. | Anforderungs-/Transportbeutel (4,0 mal 6,0 Zoll) |
| Behälteretikett-Druckerprofil | Auswahlliste der Profile oder Druckdialog des Browsers verwenden | Optional | Mit einem QZ-Tray-Profil gehen Behälteretiketten direkt an diesen Thermodrucker. | Druckdialog des Browsers verwenden |
| Molekular-Etikett-Druckerprofil | Dasselbe | Optional | Für Etiketten von Molekularplatten, Racks, Proben und Deckpositionen. | Druckdialog des Browsers verwenden |
| Anforderungsetikett-Druckerprofil | Dasselbe | Optional | Für den Aufkleberbogen der Anforderung. | Druckdialog des Browsers verwenden |
| Behälter-Barcode-Symbologie | Auswahl: Code 128 (1D), QR-Code (2D), DataMatrix (2D) | Pflicht | Wird auf die Etiketten des Master-Ansatz-Barcodes der Ansatzverwaltung angewendet. | Code 128 |
| Präfix für Einweg-Etiketten | Text, bis zu 12 Zeichen, Großbuchstaben | Pflicht | Gedruckt als Präfix-TYP-JJJJMMTT-XXXX. | CONT |
| Präfix für wiederverwendbare Racks | Text, bis zu 12 Zeichen, Großbuchstaben | Pflicht | Gedruckt als Präfix-TYP-NN. | RACK |
| GS1-GTIN (Kassetten-/Objektträgeretiketten) | Text, bis zu 14 Zeichen | Pflicht für den GS1-DataMatrix-Druck | Der Wert AI(01) auf jedem GS1-DataMatrix-Etikett für Kassetten und Objektträger. Braucht ein GS1-Firmenpräfix, das für ForMedrixAI LLC registriert ist (GS1 US oder die regionale Mitgliedsorganisation). Standardmäßig leer: Jeder echte GS1-Druck wird mit einem Fehler abgelehnt, bis Sie eines eingeben. | Leer |
| Kassettenetikett-Layout: Voreinstellung | Auswahl: Kassette 45 Grad (etwa 28,2 mal 8,0 mm), Kassette 35 Grad (etwa 28,5 mal 7,0 mm) | Optional | Füllt die vier Felder darunter. | 45 Grad |
| Flächenbreite (mm) | Zahl, mindestens 1 | Pflicht | Physische Breite der Kassettenfläche. | 28,2 |
| Flächenhöhe (mm) | Zahl, mindestens 1 | Pflicht | | 8,0 |
| Barcode-Modulgröße (mm) | Zahl, mindestens 0,05 | Pflicht | | 0,25 |
| Textzeilenhöhe (mm) | Zahl, mindestens 0,5 | Pflicht | | 1,4 |
| Passprüfung des Kassettenlayouts | Warnung oder Meldung „hat Platz“ und eine Live-Vorschau im Maßstab 10:1 | Nicht zutreffend | Warnt, wenn Barcode oder Text nicht auf die konfigurierte Fläche passen. | Nicht zutreffend |
| Einen echten Testdruck senden | Auswahlliste der Druckerprofile, Test-GTIN, **Testdruck senden** | Optional | Druckt Beispieldaten über ein echtes Profil. Halten Sie das Ergebnis vor dem Einsatz an eine tatsächliche Kassette. | Keines |
| Objektträgeretikett-Layout: Flächenbreite, Flächenhöhe, Barcode-Modulgröße, Texthöhe (mm) | Zahlen (Mindestwerte 1, 1, 0,05, 0,5) | Pflicht | Legen die Punktgrößen und die Textposition im gedruckten Objektträgeretikett fest. Hat eine eigene Vorschau, Passprüfung und einen eigenen Testdruck. | 20,0, 8,0, 0,2, 1,2 |
| Behältertyp-Codes | Ein Textfeld (bis zu 8 Zeichen, Großbuchstaben) je Typ: Färbegestell, Korb des Gewebeeinbettautomaten, Archivablage, Entkalkungsgefäß, Ad-hoc-Ansatz | Pflicht | Der Kurzcode in jedem Master-Ansatz-Barcode. | STAIN, PROC, TRAY, DECAL, ADHOC |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:print-settings:manage` (hohes Risiko, protokolliert). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Nur ein QZ-Tray-Profil sendet direkt. Jede andere Bridge weicht auf den Druckdialog des Browsers aus. Eine Einrichtung ohne Überschreibung kann nicht bearbeitet werden. Prüfen Sie die Kassettenmaße an der echten Kassette, denn eine falsche Größe druckt über den Rand hinaus.
### Etikettendesigner {#screen-label_designer}
Breadcrumb: Startseite > Konfiguration > System > Arbeitsplatz & Hardware > Etikettendesigner

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Arbeitsplatz & Hardware** > **Etikettendesigner**
**2. Wartungspunkt:** Etikettendesigner

**3. Geschäftszweck und Umfang.** Ein Drag-and-drop-Editor für das Layout jedes Etiketts: Sie platzieren Felder auf einem Etikett fester Größe, legen ihre genaue Position und Größe fest und bestimmen, wann jedes angezeigt wird. Layouts werden je Etikettentyp geführt, als Standard des Unternehmens und bei einigen Typen als Überschreibung der Einrichtung. Ein Layout kann als Druckercode exportiert werden, um es vor dem Einsatz auf einem Drucker oder in einem Viewer zu testen.

**4. Voraussetzungen und Abhängigkeiten.** Die Auswahl der Überschreibung der Einrichtung liest das Einrichtungsverzeichnis. Die Druckeinstellungen legen fest, welcher Drucker das Etikett erhält; richten Sie diese daher zuerst ein. Werden die Einrichtungen ausgelassen, wird nur der Unternehmensstandard angeboten.

Setup step: Tier 1, step 14
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Druckeinstellungen](#screen-print_settings)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-label_designer - Etikettenfläche, verfügbare Felder und Inspektor]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Etikettentyp | Auswahl: Anforderung, Probe (Behälter), Block (Kassette), Objektträger, Umfüllbehälter, Molekulare Probe, Molekulare Platte, Molekulares Rack, Molekulare Deckposition | Pflicht | Jeder Typ hat eine feste Etikettengröße: 101,6 mal 152,4 mm, 50,8 mal 25,4, 25,4 mal 12,7, 25,4 mal 9,5, 50,8 mal 25,4, 25,4 mal 12,7, 50,8 mal 19,05, 38,1 mal 12,7, 38,1 mal 12,7 (in dieser Reihenfolge). Die Größe ist nicht bearbeitbar. | Anforderung |
| Geltungsbereich | Auswahl: Unternehmensstandard oder eine Einrichtung „(Überschreibung)“ | Pflicht | Nur Anforderung, Probe und Umfüllbehälter erlauben eine Überschreibung der Einrichtung. Block, Objektträger und die vier molekularen Typen zeigen **Unternehmensstandard: gesperrt** und können nur im Unternehmensstandard bearbeitet werden. | Unternehmensstandard |
| Verfügbare Felder | Liste | Nicht zutreffend | Felder dieses Etikettentyps, die noch nicht auf der Fläche liegen. Ziehen Sie eines auf die Fläche. „Alle Felder platziert“ erscheint, wenn keines mehr übrig ist. | Nicht zutreffend |
| Fläche | Drag-and-drop-Bereich | Nicht zutreffend | Live-Vorschau mit Beispieldaten in der tatsächlichen Größe des Etiketts. Ziehen Sie ein Feld zum Verschieben oder einen Anfasser zum Ändern der Größe (Hinweistext „Zum Ändern der Größe ziehen“). Anfasser erscheinen nur am ausgewählten Feld. Ein Barcode-Feld zeichnet einen echten Beispiel-Barcode; kann der Barcode nicht gezeichnet werden, zeigt das Feld stattdessen „Barcode-Rendering fehlgeschlagen“. | Nicht zutreffend |
| Inspektor | Bereich | Nicht zutreffend | Die Einstellungen des ausgewählten Feldes. Ist nichts ausgewählt, steht dort „Wählen Sie ein platziertes Feld zum Bearbeiten aus.“ | Nicht zutreffend |
| X (mm), Y (mm) | Zahl | Pflicht | Position des ausgewählten Felds. Ein Feld bleibt innerhalb des Etiketts. | Wo abgelegt |
| Breite (mm), Höhe (mm) | Zahl | Pflicht | Größe des ausgewählten Felds. | Standard des Felds |
| Schriftgröße (mm) | Zahl | Pflicht bei Textfeldern | | Standard des Felds |
| Dieses Feld anzeigen | Auswahl: Immer, Bedingung | Pflicht | Bedingung zeigt eine zweite Auswahl: ein anderes Feld, dann „wenn dieses Feld einen Wert hat“, „wenn dieses Feld leer ist“ oder „wenn dieses Feld gleich“ mit einem **Vergleichswert**. | Immer |
| Vorschau mit leerem Feld | Kontrollkästchen | Optional | Zeigt das Etikett so, wie es gedruckt wird, wenn das geprüfte Feld leer ist. | Aus |
| Feld entfernen | Schaltfläche | Nicht zutreffend | Nimmt das ausgewählte Feld von der Fläche. | Nicht zutreffend |
| An Etikett anpassen | Schaltfläche | Nicht zutreffend | Erscheint, wenn ein Feld über den Rand hinausgeht. Das Speichern wird abgelehnt, bis es behoben ist: „Nicht gespeichert: Ein Feld geht über den Rand des Etiketts hinaus.“ | Nicht zutreffend |
| Layout speichern | Schaltfläche | Nicht zutreffend | Speichert für den gewählten Typ und Geltungsbereich. Meldungen: „Unternehmensstandard gespeichert.“ oder „Überschreibung der Einrichtung gespeichert.“; wenn das Speichern aus einem Grund fehlschlägt, den der Bildschirm nicht benennen kann, „Unbekannter Fehler beim Speichern dieses Layouts.“ | Nicht zutreffend |
| Auf Standard zurücksetzen | Schaltfläche | Nicht zutreffend | Entfernt das gespeicherte Layout für diesen Typ und Geltungsbereich und leert die Fläche. Die Meldung lautet „Layout auf Standard zurückgesetzt.“ | Nicht zutreffend |
| Versionsverlauf | Schaltfläche und Liste | Nicht zutreffend | Jedes Speichern ist eine Version, angezeigt als „Version N, gespeichert wann von wem“. **Diese Version wiederherstellen** speichert sie als neueste Version. Die Liste trägt die Überschrift „Gespeicherte Versionen dieses Layouts“. Ein Layout, das noch nie gespeichert wurde, zeigt „Dieses Layout wurde noch nicht gespeichert.“ | Nicht zutreffend |
| ZPL exportieren, EPL exportieren, DPL exportieren | Schaltflächen | Nicht zutreffend | Zeigt den aus dem Layout übersetzten Druckercode. Testen Sie ihn im Viewer, den der Bildschirm nennt (labelary.com), mit 203 dpi oder auf Ihrem eigenen Drucker. Barcode-Befehle unterscheiden sich zwischen Druckermodellen etwas. Das Ergebnis erscheint in einem Feld mit der Überschrift „Exportiertes ZPL“ (bei EPL und DPL weist ein Hinweis darauf hin, dass es ein Ausgangspunkt ist). Markieren Sie den Text, um ihn zu kopieren. ZPL ist die Sprache, die PathScribe sendet (über QZ Tray). **EPL und DPL sind nur Exporttext**: PathScribe sendet sie nie an einen Drucker; Sie kopieren oder speichern den Text und senden ihn selbst. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern, zurücksetzen, wiederherstellen: `config:label-layouts:manage` (hohes Risiko, protokolliert). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Der Export ist ein Ausgangspunkt zum Testen, keine Garantie, dass jedes Druckermodell ihn identisch druckt. Das Feld trägt die Überschrift „Exportiertes ZPL“, auch nachdem Sie EPL exportieren oder DPL exportieren gewählt haben; lesen Sie den Hinweis über dem Text, um zu sehen, welche Sprache er enthält. Die Kassetten- und Objektträgermaße für den Druck selbst stammen außerdem aus den [Druckeinstellungen](#screen-print_settings).

### Arbeitsplätze {#screen-workstations}
Breadcrumb: Startseite > Konfiguration > System > Arbeitsplatz & Hardware > Arbeitsplätze

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Arbeitsplatz & Hardware** > **Arbeitsplätze**
**2. Wartungspunkt:** Arbeitsplätze

**3. Geschäftszweck und Umfang.** Ein Register jedes Computers, der druckt oder einen PathScribe-Agenten ausführt. Jeder erhält ein langlebiges Token und ist an die Einrichtung, den Raum und die Rolle gebunden, in der er arbeitet, sodass die Druckweiterleitung ihn ansteuern kann. Ein Computer kann außerdem als „Dieser Computer“ markiert werden, damit der Browser weiß, welcher Arbeitsplatz er ist.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste Einrichtung liest das Einrichtungsverzeichnis. Die gebundenen Drucker sind die Ziel-IDs aus der Druckerliste des Standortagenten; richten Sie daher zuerst die [Standortagenten](#screen-site_agents) ein. Wird das ausgelassen, können Sie eine beliebige ID eingeben, sie passt aber beim Drucken auf nichts.

Setup step: Tier 1, step 15
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Standortagenten](#screen-site_agents)
Unlocks: [Druckziel-Weiterleitungsregeln](#screen-print_routing_rules)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-workstations - Arbeitsplatzliste mit Tokenstatus und Arbeitsplatz registrieren]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Arbeitsplatz, Einrichtung, Raum, Rolle, Drucker, Token, Zuletzt gesehen, Status, Aktionen | Nicht zutreffend | Der Status ist Aktiv, Läuft bald ab (innerhalb von 30 Tagen), Token abgelaufen oder Widerrufen. Token zeigt die letzten Zeichen und das Ablaufdatum. Eine widerrufene Zeile zeigt, wer sie widerrufen hat und warum. | Nicht zutreffend |
| Arbeitsplatz registrieren | Schaltfläche | Nicht zutreffend | Öffnet das Formular. | Nicht zutreffend |
| Bearbeiten | Zeilenschaltfläche | Nicht zutreffend | | Nicht zutreffend |
| Neues Token | Zeilenschaltfläche | Nicht zutreffend | Stellt ein neues Token aus. Das bisherige Token funktioniert noch 24 Stunden, damit der Agent aktualisiert werden kann. | Nicht zutreffend |
| Widerrufen | Zeilenschaltfläche | Nicht zutreffend | Wählen Sie einen Grund (Möglicherweise kompromittiert, Versehentlich registriert, An einen anderen Standort verlegt, Rechner ersetzt, Rechner außer Betrieb genommen, Andere). Bei Andere ist eine Notiz erforderlich. Das Token funktioniert sofort nicht mehr. | Nicht zutreffend |
| Diesen Computer verwenden / Diesen Computer nicht mehr verwenden | Zeilenschaltfläche | Nicht zutreffend | Bindet diesen Browser an den Arbeitsplatz. | Nicht zutreffend |
| Ein Token testen | Text und Schaltfläche **Prüfen** | Optional | Zeigt, wie der Server auf ein eingefügtes Token antworten würde: Akzeptiert oder Abgelehnt als abgelaufen, widerrufen, unbekannt oder fehlerhaft. | Leer |

#### Formular Registrieren und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text, bis zu 60 Zeichen | Pflicht | Muss unter den aktiven Arbeitsplätzen der Einrichtung eindeutig sein. | Leer |
| Einrichtung | Auswahlliste | Pflicht | | Keine |
| Raum | Text, bis zu 60 Zeichen | Optional | Zum Beispiel Zuschnittraum 2. | Leer |
| Versorgungspunkt | Text, bis zu 60 Zeichen | Optional | Druckweiterleitungsregeln für einen Standort gleichen hiermit ab. | Leer |
| Fachbereich | Auswahl: Histologie, Zytologie, Molekular, Obduktion | Optional | | Nicht gesetzt |
| Funktionsbereich | Auswahlliste für diesen Fachbereich | Optional | Muss zum Fachbereich gehören. | Nicht gesetzt |
| Befunddrucker, Etikettendrucker | Text mit Vorschlägen | Optional | Eine Ziel-ID aus der Druckerliste des Standortagenten. | Nicht gesetzt |
| Registrieren und Token anzeigen, Speichern | Schaltflächen | Nicht zutreffend | Das neue Token wird einmal angezeigt: Kopieren Sie es in den Agenten des Arbeitsplatzes. PathScribe behält nur einen Fingerabdruck und kann es nicht erneut anzeigen. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Registrieren, bearbeiten: `config:workstations:manage`. Neues Token, widerrufen, ein Token testen: `config:workstation-tokens:manage`. Alle mit hohem Risiko. Registrieren, Ändern, Erneuern und Widerrufen sowie abgelehnte Anmeldungen werden im Prüfprotokoll festgehalten. Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Ein Token gilt 365 Tage, sofern es nicht ersetzt wird. In der Demonstration werden Token im Browser geprüft; im Produktivbetrieb prüft sie der API-Server. Eine Anmeldung in der Demonstration ist als Simuliert gekennzeichnet.

### Arbeitsplatzgruppen {#screen-workstation_groups}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Arbeitsplatzgruppen

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Labormaterialien & Arbeitsabläufe** > **Arbeitsplatzgruppen**
**2. Wartungspunkt:** Arbeitsplatzgruppen

**3. Geschäftszweck und Umfang.** Eine Arbeitsplatzgruppe fasst Scanstationen nach Fachrichtung und Funktionsbereich zusammen, begrenzt sie auf ein durchführendes Labor und legt fest, was geladen wird, wenn eine Fachkraft eine auswählt: den Modus der Qualitätskontrolle, eine Standard-Aktionsgruppe, eine Standardaktion und eine optionale eigene Seite.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste Durchführendes Labor liest das Einrichtungsverzeichnis. Die Liste Standard-Aktionsgruppe liest die [Aktionsgruppen](#screen-action_groups), und die Liste Standardaktion liest das Aktionsregister; beide sind optional, und jede bietet ohne sie „Keine“ an. Das Gruppieren von Stationen setzt voraus, dass [Scanstationen](#screen-scan_stations) existieren. Die Obduktion hat noch keine Funktionsbereiche; eine Obduktionsgruppe kann daher nicht gespeichert werden (siehe PS-261).

Setup step: Tier 1, step 16
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Scanstationen](#screen-scan_stations)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-workstation_groups - Liste der Arbeitsplatzgruppen mit Suche]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Name oder Funktionsbereich. | Leer |
| Spalten | Name, Fachrichtung / Bereich, Durchführendes Labor, QC-Modus, Status, Aktionen | Nicht zutreffend | | Nicht zutreffend |
| Arbeitsplatzgruppe hinzufügen, Bearbeiten, Deaktivieren / Reaktivieren | Schaltflächen | Nicht zutreffend | | Nicht zutreffend |

#### Fenster Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Zum Beispiel Gruppe Zuschnitt-Arbeitsplätze. | Leer |
| Fachrichtung | Auswahl: HISTOLOGY, CYTOLOGY, MOLECULAR, AUTOPSY | Pflicht | Bestimmt, welche Funktionsbereiche angeboten werden. | HISTOLOGY |
| Funktionsbereich | Auswahlliste für die Fachrichtung | Pflicht | | Keiner |
| Durchführendes Labor | Auswahlliste | Pflicht | | Keines |
| QC-Durchsetzungsmodus | Auswahl: Auto-Resolve, Enforced, Hybrid | Optional | | Nicht gesetzt |
| Standard-Aktionsgruppe | Auswahlliste | Optional | | Keine |
| Standardaktion (löst beim nächsten Scan aus) | Auswahlliste | Optional | | Keine |
| Dedizierte Seitenroute | Text wie /microtomy-workstation | Optional | Lassen Sie das Feld leer, bis eine echte Arbeitsplatzseite existiert. | Leer |
| Aktiv | Ja/Nein-Schalter | Optional | | Ein |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:workstation-groups:manage` (hohes Risiko, protokolliert). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Die Obduktion hat keine Funktionsbereiche und kann daher noch nicht verwendet werden.

### Zuschnitt-Hardware {#screen-grossing_hardware}
Breadcrumb: Startseite > Konfiguration > System > Arbeitsplatz & Hardware > Zuschnitt-Hardware

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Arbeitsplatz & Hardware** > **Zuschnitt-Hardware**
**2. Wartungspunkt:** Zuschnitt-Hardware

**3. Geschäftszweck und Umfang.** Kameras und Waagen an den Zuschnittarbeitsplätzen und wie PathScribe jede erreicht. Das physische Gerät wird aus dem Geräteregister gewählt.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste Gerät im Verzeichnis liest die [Geräte](#screen-equipment), und die Liste Scanstation liest die [Scanstationen](#screen-scan_stations). Wird Geräte ausgelassen, ist das Gerät nicht verknüpft. Ein Gerät der falschen Art wird abgelehnt.

Setup step: Tier 1, step 17
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Geräte](#screen-equipment), [Scanstationen](#screen-scan_stations)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-grossing_hardware - Liste der Zuschnitt-Hardware]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Name, Art, Verbindung, Gerät im Verzeichnis, Scanstation, Status, Aktionen | Nicht zutreffend | Meldung bei leerer Liste: „Keine Zuschnitt-Hardware für diese Einrichtung.“ | Nicht zutreffend |
| + Zuschnitt-Hardware hinzufügen, Bearbeiten, Deaktivieren / Reaktivieren | Schaltflächen | Nicht zutreffend | | Nicht zutreffend |
| Art | Auswahl: Kamera, Waage | Pflicht | | Kamera |
| Name | Text | Pflicht | Zum Beispiel Makrokamera Zuschnittstation 3. | Leer |
| Verbindung | Auswahl: Browser (keine Installation), PathScribe Agent, Manuelle Eingabe | Pflicht | Kamera: Browser oder Agent. Waage: Agent oder Manuelle Eingabe. Andere Kombinationen werden abgelehnt. Der Browser erreicht eine Standard-USB-Kamera direkt. Manuelle Eingabe bedeutet, dass das Gewicht in die Zuschnittvorlage getippt wird. | Browser (keine Installation) |
| Adresse des PathScribe Agents | https-Link wie https://127.0.0.1:9100 | Pflicht für Agent | Muss mit https:// beginnen. | Leer |
| Gerät im Verzeichnis | Auswahlliste aus Geräte derselben Art | Optional | | Nicht verknüpft |
| Scanstation | Auswahlliste oder Jede Station | Optional | | Jede Station |
| Status | Aktiv / Inaktiv | Optional | | Aktiv |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:grossing-hardware:manage` (hohes Risiko, protokolliert). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Keine bekannt.

### Protokoll simulierter Drucke {#screen-simulated_print}
Breadcrumb: Startseite > Konfiguration > System > Arbeitsplatz & Hardware > Protokoll simulierter Drucke

**Status:** Demonstration

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Arbeitsplatz & Hardware** > **Protokoll simulierter Drucke**
**2. Wartungspunkt:** Protokoll simulierter Drucke (nur lesend, mit einer Schaltfläche zum Leeren)

**3. Geschäftszweck und Umfang.** Ohne API-Server werden Etiketten und Befunde nicht an einen echten Drucker gesendet. Jeder Druck wird hier als Simuliert aufgezeichnet, sodass Sie sehen, was gedruckt worden wäre, wohin und wie oft. Nichts, was hier steht, hat einen Drucker erreicht. Ein Schalter lässt simulierte Drucke fehlschlagen, um den Fehlerpfad zu testen.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Es zeigt, was die Druckbildschirme erzeugen; drucken Sie daher zuerst etwas.

Setup step: Reference, not part of setup
Requires: [Druckerprofile](#screen-printer_profiles)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-simulated_print - Tabelle des Protokolls simulierter Drucke]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Simulierte Drucke fehlschlagen lassen | Kontrollkästchen | Optional | Lässt jeden simulierten Druck fehlschlagen, sodass Sie die Fehlermeldung testen können. | Aus |
| Anzahl | Text | Nicht zutreffend | „N simulierte Drucke“. | Nicht zutreffend |
| Protokoll leeren | Schaltfläche | Nicht zutreffend | Bittet um Bestätigung und leert dann jeden Datensatz. Kann nicht rückgängig gemacht werden. | Nicht zutreffend |
| Wann | Datum und Uhrzeit | Nicht zutreffend | Im Format der Anzeigesprache. | Nicht zutreffend |
| Was | Text | Nicht zutreffend | Druck über Standortagent, Gravur von Objektträger oder Kassette, Etikett, Molekular-Etikett, Netzwerk-Druckauftrag, Befund, Etikett für einen Scan. | Nicht zutreffend |
| Gesendet über | Text | Nicht zutreffend | Der verwendete Weg. | Nicht zutreffend |
| Ziel | Text | Nicht zutreffend | | Nicht zutreffend |
| Kopien | Ganze Zahl | Nicht zutreffend | | Nicht zutreffend |
| Ergebnis | Text | Nicht zutreffend | „Simuliert: an Drucker gesendet“ oder „Simuliert: fehlgeschlagen“. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Die Berechtigung des Abschnitts ist `config:printers:manage`. Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Das Protokoll wird im eigenen Speicher des Browsers geführt; es gilt daher je Browser und wird nicht geteilt. Es wird durch echtes Drucken ersetzt, sobald der API-Server angeschlossen ist.

## Teil D: Globale Systemeinstellungen, Datum/Uhrzeit/Zeitzone, Proben- und Eingangsnummerierung {#ch2-global-preferences}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance

Dieser Teil enthält die organisationsweiten Regeln: wie lange Datensätze aufbewahrt werden, wie Eingangsnummern aufgebaut sind, welche Felder Seiten verlangen und welche Referenzlinks das Personal sieht. Es gibt keinen einzelnen Bildschirm „globale Einstellungen“. Für Datum, Uhrzeit, Zeitzone und Sprache siehe die Tabelle in [Teil A](#ch2-enterprise-facilities): Die Zeitzone ist eine einzige organisationsweite Auswahl in den Einstellungen des [Beitrags-Dashboards](#screen-contribution_settings), das Datumsformat folgt der Anzeigesprache, und Befunds- und Rechtschreibsprache werden an der Einrichtung und an der Person festgelegt. Die schreibgeschützte [Übersicht je Rechtsraum](#screen-jurisdiction_overview) steht in Teil A.

### Datenaufbewahrung {#screen-retention}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Datenaufbewahrung

**Status:** Demonstration

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance** > **Datenaufbewahrung**
**2. Wartungspunkt:** Datenaufbewahrung

**3. Geschäftszweck und Umfang.** Die eigenen Aufbewahrungsfristen des Labors: wie lange PathScribe KI-Vorschläge, das Prüfprotokoll, Fallmomentaufnahmen und das Befundarchiv aufbewahren soll. Der Bildschirm hält die Richtlinie fest. Überschreibungen auf Abteilungsebene und die Mindestfristen der Aufsichtsbehörden werden in den [Abteilungen](#screen-departments) und den [Aufsichtsbehörden](#screen-governing_bodies) festgelegt.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Ziehen Sie die Richtlinie Ihrer Institution zur Datengovernance zurate, bevor Sie eine Frist verkürzen.

Setup step: Tier 1, step 18
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: [Abteilungen](#screen-departments)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-retention - Vier Aufbewahrungsfristen mit Änderungen speichern und Auf Standardwerte zurücksetzen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| KI-Vorschläge | Ganze Zahl in Tagen, 30 bis 730 | Pflicht | KI-erzeugte Feldvorschläge und Konfidenzwerte, die je Fall aufbewahrt werden. | 90 Tage |
| Audit-Protokolle | Ganze Zahl in Tagen, 90 bis 3650 | Pflicht | Alle Benutzeraktionen, Signierungen, Nachträge, Sprachereignisse und Systemereignisse. Das Minimum beträgt 90 Tage. Kürzungen unter die regulatorischen Mindestfristen brauchen die Freigabe Ihrer Compliance-Beauftragten oder Ihres Compliance-Beauftragten. | 365 Tage |
| Fall-Schnappschüsse | Ganze Zahl in Jahren, 1 bis 30 | Pflicht | Vollständige Falldaten, die bei jeder Finalisierung und Signierung erfasst werden. | 7 Jahre |
| Berichtsarchiv | Ganze Zahl in Jahren, 1 bis 30 | Pflicht | Signierte Befunde, die für die rechtsmedizinische und pathologische Überprüfung aufbewahrt werden. | 10 Jahre |
| Änderungen speichern | Schaltfläche | Nicht zutreffend | Zeigt „Aufbewahrungsrichtlinie aktualisiert. Wirksam ab dem nächsten Bereinigungszyklus.“ Ein Wert außerhalb seines Bereichs wird beim Tippen ignoriert. | Nicht zutreffend |
| Auf Standardwerte zurücksetzen | Schaltfläche | Nicht zutreffend | Setzt die vier Standardwerte in die Felder ein. Sie wählen weiterhin Änderungen speichern. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:retention-policy:manage` (hohes Risiko, protokolliert). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Die Richtlinie wird nur im Browser gespeichert. Noch liest kein Bereinigungsauftrag sie: Ihretwegen wird nichts gelöscht oder anders aufbewahrt (PS-345). Die Meldung „wirksam ab dem nächsten Bereinigungszyklus“ beschreibt das beabsichtigte Verhalten, kein gebautes.
### Fallmaskenkonfiguration {#screen-case_mask_config}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Fallmaskenkonfiguration

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Integrationen** > **Fallmaskenkonfiguration**
**2. Wartungspunkt:** Fallmaskenkonfiguration (Vergabe der Eingangsnummern)

**3. Geschäftszweck und Umfang.** Eine Fallmaske ist das Muster einer Eingangsnummer: ein Präfix, das Jahr und eine laufende Nummer, zum Beispiel `MFT26-0029`. Jede Maske hat ein eigenes Präfix, ein eigenes Muster und einen eigenen Zähler und gehört zu genau einem Geltungsbereich: dem Unternehmen, einer Einrichtung als durchführendes Labor oder einer Abteilung. Beim Probeneingang eines Falls sucht PathScribe in dieser Reihenfolge nach einer Maske: seine Abteilung, dann sein durchführendes Labor, dann das Unternehmen. Ein Fall ohne Maske irgendwo in dieser Kette verwendet das Standardmuster `O` plus zweistelliges Jahr, einen Bindestrich und eine vierstellige laufende Nummer. Eine Eingangsnummer ist dauerhaft und an physisches Gewebe und die Probenkette gebunden; das Speichern einer Maske ändert daher nur das Muster für die Zukunft und setzt den Zähler nie zurück.

**4. Voraussetzungen und Abhängigkeiten.** Die Geltungsbereiche Einrichtung und Unternehmen lesen das Einrichtungsverzeichnis. Ein Geltungsbereich Abteilung liest die [Abteilungen](#screen-departments), die in einer späteren Stufe eingerichtet werden. Wird die Einrichtung ausgelassen, kann keine Maske für Einrichtung oder Unternehmen hinzugefügt werden; Fälle verwenden dann das Standardmuster. Ein Geltungsbereich, der bereits eine Maske hat, wird nicht erneut angeboten: Verwenden Sie Bearbeiten.

Setup step: Tier 1, step 19
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Abteilungen](#screen-departments)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-case_mask_config - Fallmasken, gruppiert nach Unternehmen, Einrichtung und Abteilung]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Gruppen | Unternehmen, Einrichtung, Abteilung | Nicht zutreffend | Jede Gruppe listet ihre Masken auf oder „Noch keine Fallmaske auf Geltungsbereichsebene definiert“. | Nicht zutreffend |
| Spalten | Präfix, Maskenmuster, Aktuelle laufende Nummer, Jährlich zurücksetzen, Aktionen | Nicht zutreffend | | Nicht zutreffend |
| + Fallmaske hinzufügen, Bearbeiten, Löschen | Schaltflächen | Nicht zutreffend | Löschen wirkt sofort und hat keine Bestätigung. | Nicht zutreffend |

#### Fenster Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Geltungsbereich | Auswahl: Abteilung, Unternehmen, Einrichtung (durchführendes Labor), dann eine Auswahlliste dieser Art | Pflicht | Beim Bearbeiten gesperrt. Jedes durchführende Labor, das eine Maske hat, wird beim Hinzufügen ausgelassen: „Jede echte Einrichtung als durchführendes Labor hat bereits eine eigene Fallmaske.“ | Abteilung |
| Präfix | Text | Pflicht | Zum Beispiel MFT. | Leer |
| Maskenmuster | Text mit den Token `{PREFIX}`, `{YEAR:4}`, `{YEAR:2}`, `{SEQ:N}` | Pflicht | Zum Beispiel ergibt `{PREFIX}{YEAR:2}-{SEQ:4}` den Wert `MFT26-0029`. | `{PREFIX}{YEAR:2}-{SEQ:4}` |
| Sequenzstellen | Ganze Zahl, 1 oder mehr | Pflicht | Wird verwendet, wenn das Muster keine ausdrückliche Stellenzahl hat. | 4 |
| Laufende Nummer jährlich zurücksetzen | Ja/Nein-Schalter | Optional | Beginnt die laufende Nummer in jedem neuen Jahr bei 1, nach der Zeitzone der Einrichtung, nie nach der Zeitzone des Geräts. | Ein |
| Nächste Nummer als Vorschau | Schaltfläche | Nicht zutreffend | Zeigt die nächste Nummer, ohne eine zu verbrauchen. | Nicht zutreffend |
| Aktuelle laufende Nummer, zuletzt zurückgesetzt, zuletzt aktualisiert von | Nur lesbarer Text | Nicht zutreffend | Wird beim Bearbeiten angezeigt. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, löschen: `config:case-masks:manage` (hohes Risiko, protokolliert). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Das Jahr und das jährliche Zurücksetzen verwenden die Zeitzone der Einrichtung der Organisation (Einstellungen des [Beitrags-Dashboards](#screen-contribution_settings)). Das Beispiel von **Nächste Nummer als Vorschau** wird mit der Zeitzone des Browsers erstellt, den Sie verwenden; um den Jahreswechsel kann es daher ein anderes Jahr zeigen als die Nummer, die ein Fall tatsächlich erhielte.

### Pflichtfelder {#screen-field_requirements}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Pflichtfelder

**Status:** Demonstration

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance** > **Pflichtfelder**
**2. Wartungspunkt:** Pflichtfelder

**3. Geschäftszweck und Umfang.** Legt für Ihre Organisation fest, welche Felder jede Seite braucht, bevor sie gespeichert werden kann. Einige Felder sind als immer erforderlich gesperrt, mit der angezeigten Begründung, weil ein Datensatz ohne sie unsicher oder unbrauchbar ist. Die übrigen können Sie ein- oder ausschalten. Seiten übernehmen die Auswahl beim Speichern: Zum Beispiel lesen Mitarbeiter und der Einrichtungseditor ihre Pflichtfelder hier.

**4. Voraussetzungen und Abhängigkeiten.** Der Bildschirm gilt für die Organisation der angemeldeten Person. Eine Person ohne verknüpfte Organisation sieht die Standardwerte und kann sie nicht ändern. Nichts anderes muss zuvor festgelegt werden.

Setup step: Tier 1, step 20
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-field_requirements - Seitenauswahl und gruppierte Schalter Pflicht mit gesperrten Feldern]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Seite | Auswahlliste von 16 Seiten: Eingang, Zusatzaufträge, Chargenverwaltung, Klinische Angaben (Zytologie), Zytologie-Screening, Einbettstation, Einrichtungseditor, Zuschnitt, Intraoperative Konsultation, Nachrichten, Mikrotomie-Arbeitsplatz, Molekularer Plattenaufbau, Molekulare Rack-Beladung, Fallbefund, Objektträger-Verteilstation, Mitarbeitende | Pflicht | Zeigt die Felder einer Seite in Gruppen. | Eingang |
| Einstellungen für (Organisation) | Text | Nicht zutreffend | Die Organisation, die Sie ändern. | Ihre Organisation |
| Pflicht | Kontrollkästchen, eines je Feld | Optional | Schaltet die Anforderung ein oder aus. Ein Hinweis „Vom Standard abweichend“ erscheint, wenn Sie sie geändert haben. | Je Feld |
| Immer Pflicht | Gesperrtes Kennzeichen und Begründung | Nicht zutreffend | Das Feld kann nicht ausgeschaltet werden. Die Begründung wird angezeigt, zum Beispiel dass die Laborstandards zwei Patientenkennungen verlangen. | Gesperrt |
| Hinweise | Text unter einem Feld | Nicht zutreffend | Zum Beispiel „Wird für jede Probe geprüft“, „Wird automatisch ausgefüllt, wenn leer gelassen“ oder eine Bedingung wie „Nur Zytologie- und FNA-Fälle“. | Nicht zutreffend |

Das Geschlecht auf der Seite Eingang ist ein gesperrtes Pflichtfeld ohne Standardwert (Batch 661): Die Person im Probeneingang muss es auswählen. Der Grund des Systemausfalls auf der Seite Eingang ist erforderlich, und ohne ihn ist das Absenden gesperrt (Batch 658).

Eine abgelehnte Änderung zeigt eine von: „Dieses Feld ist immer erforderlich.“, „Sie haben keine Berechtigung, Pflichtfelder zu ändern.“, „Sie können nur die Einstellungen Ihrer eigenen Organisation ändern.“, „Dieses Feld kann nicht konfiguriert werden.“ oder „Diese Seite kann nicht konfiguriert werden.“ Jede Änderung, die Sie vornehmen, wird mit der Seite, dem Feld und dem neuen Wert im Prüfprotokoll festgehalten.

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:field-requirements:manage` (Verwaltungsgruppe). Admin und Superadmin besitzen sie standardmäßig. Die Laborleitung nicht, und sie sieht den Bildschirm nur lesend: „Sie können diese Einstellungen sehen, aber nicht ändern.“
**Bekannte Grenzen.** Die Einstellungen werden in der Demonstration im Speicher des Browsers gehalten. Der Produktivserver hat nur für die Berechtigungsprüfung einen Vertrag (`AUTHORIZATION_API.md`), nicht für das Speichern der Einstellungen. Das Ausschalten einer Protokollanforderung im Zuschnitt leitet Proben, die ohne Protokoll abgeschlossen wurden, zur Zweitprüfung weiter.

### Externe Ressourcen {#screen-external_resources}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Externe Ressourcen

**Status:** Umgesetzt

**1. Navigation:** Konfigurationsreiter **System** > Gruppe **Verwaltung & Compliance** > **Externe Ressourcen**
**2. Wartungspunkt:** Externe Ressourcen

**3. Geschäftszweck und Umfang.** Die Referenzlinks, die im Bereich Ressourcen angezeigt werden: CAP-Protokolle, die WHO-Klassifikation, interne Laborsysteme und Ähnliches. Die Schnellzugriffe auf den Bildschirmen Suche und Prüfprotokoll stammen aus dieser Liste (Batch 659), ein hier hinzugefügter Link erscheint also dort. Ein unternehmensweiter Link ist für alle sichtbar. Ein auf ein Labor beschränkter Link ist nur in dem durchführenden Labor sichtbar, an das er gebunden ist.

**4. Voraussetzungen und Abhängigkeiten.** Ein auf ein Labor beschränkter Link braucht ein durchführendes Labor aus dem Einrichtungsverzeichnis. Wird es ausgelassen, können nur unternehmensweite Links gespeichert werden: „Wählen Sie ein durchführendes Labor für eine auf ein Labor beschränkte Ressource.“

Setup step: Tier 1, step 21
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-external_resources - Ressourcenliste, gruppiert nach Protokolle, Referenzen und Systeme]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Liste | Ressourcen, nach Kategorie gruppiert | Nicht zutreffend | Jede Zeile zeigt ihren Titel, ihren Link und ihren Geltungsbereich: „Unternehmensweit“ oder „Labor: Name“. Meldung bei leerer Liste: „Noch keine externen Ressourcen konfiguriert.“ | Nicht zutreffend |
| + Ressource hinzufügen, Bearbeiten, Löschen | Schaltflächen | Nicht zutreffend | Löschen fragt „(Titel) löschen? Das kann nicht rückgängig gemacht werden.“ | Nicht zutreffend |
| Titel | Text | Pflicht | Zum Beispiel CAP-Krebsprotokolle. | Leer |
| URL | Webadresse, die mit https:// oder http:// beginnt | Pflicht | Fehler: „Geben Sie eine gültige URL einschließlich https:// ein.“ | Leer |
| Kategorie | Auswahl: Protokolle, Referenzen, Systeme | Pflicht | | Protokolle |
| Geltungsbereich | Auswahl: Unternehmensweit, Bestimmtes durchführendes Labor | Pflicht | | Unternehmensweit |
| Durchführendes Labor | Auswahlliste | Pflicht bei Geltungsbereich Labor | | Keines |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, löschen: `config:external-resources:manage` (hohes Risiko, protokolliert). Admin und Laborleitung besitzen sie standardmäßig.
**Bekannte Grenzen.** Nur die Adresse wird gespeichert. PathScribe prüft nicht, ob der Link funktioniert.
