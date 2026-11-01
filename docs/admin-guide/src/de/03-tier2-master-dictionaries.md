---
chapter: 3
id: ch3
title: Stufe 2: Stammwörterbücher und klinische Grunddaten (an zweiter Stelle einrichten)
---

# Stufe 2: Stammwörterbücher und klinische Grunddaten (an zweiter Stelle einrichten) {#ch3}

Stufe 2 umfasst die Listen, aus denen die tägliche Arbeit des Labors auswählt: Abteilungen, Probentypen, Färbungen, Protokolle, Behälter, Kassettenfarben, Ärzte, Service-Level der Kunden sowie die Code- und Klassifikationslisten, die in Befunden verwendet werden. Keine dieser Listen steht für sich allein. Ein Probentyp verweist auf eine Abteilung, eine Subspezialität und ein Protokoll. Eine Kassettenregel verweist auf ein Protokoll und eine Farbe. Ein Service-Level eines Kunden verweist auf eine einsendende Kundeneinrichtung. Deshalb folgt Stufe 2 auf Stufe 1 (die Einrichtungen, Personen und Geräte in [Kapitel 2](#ch2)) und hat eine eigene Reihenfolge.

Richten Sie Stufe 2 in der folgenden Reihenfolge ein. Jeder Bildschirm enthält ein Feld **Einrichtungsreihenfolge** mit denselben Angaben, und der Builder prüft, dass kein Bildschirm einen anderen voraussetzt, der erst danach kommt.

1. [Aufsichtsbehörden](#screen-governing_bodies): die Normungs- und Aufsichtsstellen und ihre Aufbewahrungsfristen. Nur für den internen Gebrauch bei ForMedrixAI.
2. [Codiersysteme](#screen-code_systems): welche Diagnose-Codiersysteme in jedem Land ausgeschaltet, optional oder verpflichtend sind, und welche Lizenzen Sie besitzen.
3. [Terminologiedienste](#screen-terminology): eine Zustandsprüfung der Dienste für die Codesuche.
4. [Code-Import (Massenimport)](#screen-code_import): ein CSV-Import von Abrechnungscodes.
5. [Abteilungen](#screen-departments): die grobe Klassifikation einer Probe beim Probeneingang.
6. [Subspezialitäten](#screen-subspecialties): die pathologischen Arbeitsgruppen und ihre Weiterleitung.
7. [Diagnosekatalog](#screen-stains): Färbungen, Antikörper, molekulare Untersuchungen, Schnittprotokolle und Schnellbestellungs-Makros.
8. [Protokollwörterbuch](#screen-protocols): der Verarbeitungsablauf für eine Probe.
9. [Behältertypen](#screen-container_types): die Behälter, in denen Proben eintreffen.
10. [Präparatwörterbuch](#screen-specimens): die Probentypen, die die obigen Listen zusammenführen.
11. [Markierungen](#screen-flags): Kennzeichnungen für Fälle und Proben.
12. [Anlagenstandort-Wörterbuch](#screen-asset_locations): benannte physische Standorte und Lagerplätze des Leichenhauses.
13. [Kühlkette](#screen-cold_chain): Lagereinheiten, Zustandstypen und Temperaturmesswerte.
14. [Präparatmängel](#screen-deficiencies): Mangelarten und Lösungsarten.
15. [Organkarten](#screen-organ_maps): Farben, Muster und Fragenzuordnungen für die anatomischen Karten.
16. [Kassettenfarben](#screen-cassette_colors): das Farbwörterbuch.
17. [Kassetten-Routingregeln](#screen-cassette_routing_rules): welche Farbe eine Kassette erhält.
18. [Tuschefarben](#screen-ink_colors): die Tuschefarben für die Ränder.
19. [Reagenz- & Lösungschargen](#screen-reagent_lots): Charge, Verfallsdatum und QC-Status der Reagenzien.
20. [Ärzte](#screen-physicians): einsendende und anfordernde Ärzte.
21. [Einrichtungskonfiguration](#screen-clients): Kundenkonten (derselbe Bildschirm wie das [Einrichtungsverzeichnis](#screen-facility-dictionary)).
22. [Service-Level je Kunde](#screen-client_sla): Durchlaufzeitzusagen je Kunde.
23. [Regeln für abnormale Auslöser](#screen-abnormal_trigger_rules): die Paare aus Feld und Wert, die einen Fall kennzeichnen.
24. [Reiter Zytologie](#screen-tab-cytology): die Startseite für die Zytologieeinstellungen.
25. [Nomenklatursystem](#screen-cytology_nomenclature): welches Befundungssystem die Zytologie verwendet.
26. [Interpretation und Empfehlungen](#screen-cytology_categories): die Kategorielisten der Zytologie.
27. [Nicht-gynäkologische Klassifikation (Milan/Paris)](#screen-non_gyn_cytology_categories): Kategorien für Speicheldrüse und Harnwege.
28. [Screening-Strategie](#screen-cytology_screening_strategy): Co-Testing oder HPV-first und die Fristen für die Wiedereinbestellung.
29. [Nicht-gynäkologische Weiterleitung](#screen-cytology_routing): an welche Arbeitsliste ein nicht-gynäkologischer Fall geht.
30. [Länder- und Laborregeln](#screen-cytology_compliance_features): Obergrenze der Arbeitsmenge, Rückschau, dringende Unterschrift und Screening-Intervalle.
31. [Unterstützte Instrumentierung](#screen-cytology_instrumentation): Whole Slide Imaging oder herkömmliche Durchsicht.
32. [Zyto-histologische Korrelation (SNOMED)](#screen-snomed_histology_severity_mapping): die SNOMED-Schweregrade, die in der Korrelation verwendet werden.
33. [Forschungsfälle und Chargenzwecke](#screen-research_cases): wie Forschungsfälle erkannt und aus der klinischen Arbeit herausgehalten werden, und wofür ein Träger verwendet wird (Batch 728).

Die folgenden Teile richten sich nach dem Thema, nicht nach der Einrichtungsreihenfolge: [Teil A](#ch3-anatomic-specialties) die Fachrichtungen der anatomischen Pathologie, [Teil B](#ch3-specimen-tissue) Proben und Gewebe, [Teil C](#ch3-container-cassette) Behälter, Kassetten und Tusche, [Teil D](#ch3-stains-protocols) Färbungen und Protokolle, [Teil E](#ch3-code-libraries) Codebibliotheken und [Teil F](#ch3-physicians-clients) Ärzte, Kunden und Aufsichtsbehörden.

**Statuswörter.** Jeder Bildschirm zeigt eines der fünf Statuswörter aus dem Redaktionsstandard: Umgesetzt, Demonstration, Teilweise, Geplant, Nicht umgesetzt. Fast jedes Wörterbuch in diesem Kapitel hat einen Produktivdienst und einen schriftlich festgelegten API-Vertrag, daher sind die meisten **Umgesetzt**. Die Ausnahmen sind auf dem Bildschirm benannt: Die Einstellungen der [Organkarten](#screen-organ_maps) und die Richtlinie der [Codiersysteme](#screen-code_systems) werden nur im Browser gehalten, und die Messwerte der [Kühlkette](#screen-cold_chain) sind simuliert.

**Was alle Wörterbuch-Bildschirme gemeinsam haben.**
- Eine Änderung erfordert die eigene Berechtigung `config:...:manage` des Bildschirms. Ohne sie können Sie den Bildschirm öffnen und die Daten sehen, aber die Bedienelemente sind ausgegraut. Die Berechtigungen in diesem Kapitel sind als hohes Risiko eingestuft, daher wird jede Prüfung (erlaubt oder abgelehnt) im Prüfprotokoll festgehalten.
- Die meisten Wörterbücher hier werden je **durchführendem Labor** oder **Global** (jedes Labor) geführt. Ein Name oder Code muss innerhalb eines Labors oder innerhalb von Global eindeutig sein.
- Die meisten Listen löschen nicht. Eine Zeile wird auf **Inaktiv** gesetzt; dadurch bleiben alle Datensätze erhalten, die sie bereits verwenden.
- Ein Name oder Code, der mit einem Auftrag eintrifft und zu nichts passt, erzeugt eine Zeile **Nicht verifiziert** (Abteilungen, Ärzte, Anlagenstandorte und Einrichtungen tun dies). Die Zeile funktioniert, aber jemand sollte sie prüfen und **Verifizieren** wählen.

## Teil A: Fachrichtungen der anatomischen Pathologie {#ch3-anatomic-specialties}
Breadcrumb: Startseite > Konfiguration

Dieser Teil enthält die Bildschirme, mit denen die Abteilungen und Arbeitsgruppen des Labors eingerichtet werden, sowie den Reiter Zytologie. PathScribe hat keinen einzelnen Bildschirm „Fachrichtung“. Die fünf Fachrichtungen der anatomischen Pathologie werden über mehrere Bildschirme eingerichtet, die hier aufgeführt sind; die Tabelle nennt deshalb für jede, was vorhanden ist und was nicht.

| Fachrichtung | Was Sie heute konfigurieren können | Was nicht vorhanden ist |
|---|---|---|
| Chirurgische Pathologie | Die [Abteilung](#screen-departments) Chirurgisches Gewebe und ihre Standard-Zuschneidevorlage; die Probenkategorie SURGICAL_TISSUE im [Präparatwörterbuch](#screen-specimens); [Organkarten](#screen-organ_maps) sowie die Protokoll- und Kassettenwörterbücher in den Teilen B bis D. | Ein eigener Einstellungsbildschirm „Chirurgische Pathologie“. |
| Zytopathologie | Die [Abteilung](#screen-departments) Flüssigkeiten / Zytologie; die Probenkategorien GYN_CYTOLOGY und NON_GYN_CYTOLOGY; der gesamte [Reiter Zytologie](#screen-tab-cytology) (acht Bildschirme in diesem Kapitel und vier weitere in den Kapiteln 4 und 8). | Keine. Dies ist die einzige Fachrichtung mit einem eigenen Einstellungsreiter. |
| Dermatopathologie | Eine [Subspezialität](#screen-subspecialties) namens Dermatopathology (vorbelegt) und eine eingebaute Fallweiterleitungsregel, die Hautbegriffe dorthin leitet. Die Stufenkarten der Mohs-mikrografischen Chirurgie gehören zu den [Organkarten](#screen-organ_maps). | Eine Abteilung, Probenkategorie oder ein Einstellungsbildschirm für Dermatopathologie. |
| Hämatopathologie | Eine [Subspezialität](#screen-subspecialties) namens Hematopathology (vorbelegt) und eine eingebaute Fallweiterleitungsregel, die hämatologische Begriffe dorthin leitet. | Eine Abteilung, Probenkategorie oder ein Einstellungsbildschirm für Hämatopathologie. |
| Obduktion | Die Probenkategorie AUTOPSY im [Präparatwörterbuch](#screen-specimens); Lagerplätze des Leichenhauses und eine Belegungsansicht im [Anlagenstandort-Wörterbuch](#screen-asset_locations); Obduktions-Schnittprotokolle im [Protokollwörterbuch](#screen-protocols); die Fachrichtung AUTOPSY der Arbeitsplatzgruppen ([Arbeitsplatzgruppen](#screen-workstation_groups)); und die Zieltypen AUTOPSY_PAD und AUTOPSY_FAD für die Durchlaufzeit im [Reiter TAT-Konfiguration](#screen-tab-tat). | Ein Reiter Obduktion oder ein obduktionsspezifischer Wartungsbildschirm. |

Die eingebauten Fallweiterleitungsregeln, die diese Subspezialitäten verwenden, stehen unter [Routingregeln](#screen-routing_rules) (Kapitel 4).

### Abteilungen {#screen-departments}
Breadcrumb: Startseite > Konfiguration > System > Klinische Nachschlagewerke > Abteilungen

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Klinische Nachschlagewerke**
**2. Wartungspunkt:** Abteilungen

**3. Geschäftlicher Zweck und Umfang.** Eine Abteilung ist die grobe Klassifikation einer Probe beim Probeneingang: zum Beispiel Chirurgisches Gewebe, Flüssigkeiten / Zytologie, Nur Histologie / Konsil. Sie bestimmt, mit welcher Zuschneidevorlage ein Fall beginnt, ob die Abteilung Unterlagen kürzer oder länger aufbewahrt als die Vorgabe des Rechtsraums und welcher Laborleiter und welche Akkreditierungsnummer im Befundkopf der Abteilung stehen. Der Link Fallmaske im Bearbeitungsfenster führt zur [Fallmaskenkonfiguration](#screen-case_mask_config), wo die Eingangsnummernmaske der Abteilung festgelegt wird.

**4. Voraussetzungen und Abhängigkeiten.** Die Aufbewahrungsausnahme wird gegen die Untergrenze geprüft, die unter [Aufsichtsbehörden](#screen-governing_bodies) für den aktuellen Rechtsraum festgelegt ist. Hat keine Aufsichtsbehörde eine Aufbewahrungsfrist für den Rechtsraum, gibt es keine Untergrenze, gegen die geprüft werden kann. Die Liste der Zuschneidevorlagen ist im Produkt fest vorgegeben (drei Auswahlmöglichkeiten) und hängt daher von keinem anderen Bildschirm ab. Abteilungen werden vom [Präparatwörterbuch](#screen-specimens) gelesen (jeder Probentyp nennt eine Abteilung), vom [Protokollwörterbuch](#screen-protocols) (ein neues Protokoll in einer Flüssigkeitsabteilung beginnt als Dekantierstrecke) und vom Auftragseingang, der eine nicht verifizierte Abteilung anlegt, wenn ein Auftrag eine nicht vorhandene Abteilung nennt.

Setup step: Tier 2, step 5
Requires: [Aufsichtsbehörden](#screen-governing_bodies)
Unlocks: [Präparatwörterbuch](#screen-specimens), [Protokollwörterbuch](#screen-protocols), [Fallmaskenkonfiguration](#screen-case_mask_config)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-departments - Abteilungsliste mit Suche, Statusfilter und Abteilung hinzufügen]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Schränkt die Liste nach dem Namen der Abteilung ein. | Leer |
| Statusfilter | Auswahl: Alle, Aktiv, Inaktiv, Nicht verifiziert | Optional | Nicht verifizierte Abteilungen wurden automatisch aus einem Auftrag angelegt. | Alle |
| Spalte Abteilung | Text | Entfällt | Name und Beschreibung. | Entfällt |
| Spalte Standard-Zuschneidevorlage | Text | Entfällt | Die Zuschneideroute, mit der die Abteilung beginnt. | Entfällt |
| Spalte Fallmaske | Text | Entfällt | Zeigt „DEFINIERT“ gefolgt von der Maske, wenn die Abteilung in der Fallmaskenkonfiguration eine hat. | Entfällt |
| Spalte Aufbewahrungsausnahme | Text | Entfällt | Die Ausnahmetage je Materialtyp, falls vorhanden. | Entfällt |
| Spalte Status | Text | Entfällt | Aktiv, Inaktiv oder Nicht verifiziert. Ein Hinweis „automatisch erstellt“ erscheint, wenn die Abteilung aus einem Auftrag stammt. | Entfällt |
| + Abteilung hinzufügen | Schaltfläche | Entfällt | Öffnet das Bearbeitungsfenster mit einer leeren Abteilung. | Entfällt |
| Verifizieren | Schaltfläche in der Zeile | Entfällt | Nur für nicht verifizierte Abteilungen angezeigt. Markiert die Abteilung als geprüft. | Entfällt |
| Bearbeiten | Schaltfläche in der Zeile | Entfällt | Öffnet das Bearbeitungsfenster. | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Der Name der Abteilung, wie ihn das Personal beim Probeneingang sieht. | Keiner |
| Beschreibung | Freitext | Optional | Welche Arten von Proben hierher gehören. | Keine |
| Standard-Zuschneidevorlage | Auswahl: Standard-Gewebezuschnitt, Flüssigkeits-/Zellblock-Zuschnitt, Nur Histologie | Pflicht | Die Zuschneideroute, mit der ein Fall in dieser Abteilung beginnt. Die drei Auswahlmöglichkeiten sind fest vorgegeben. Sie werden als `grossing_standard_tissue`, `grossing_fluid_cytology` und `grossing_histology_only` gespeichert. | Standard-Gewebezuschnitt |
| Fallmaske | Link (nur beim Bearbeiten) | Entfällt | Öffnet die [Fallmaskenkonfiguration](#screen-case_mask_config). | Entfällt |
| Status | Schalter Aktiv / Inaktiv | Optional | Eine inaktive Abteilung wird beim Probeneingang nicht angeboten. Nennen Einträge des Präparatwörterbuchs die Abteilung noch, fordert Sie ein Fenster **Abteilung wird noch verwendet** auf, mit **Trotzdem deaktivieren** zu bestätigen. Diese Einträge werden nicht geändert. | Aktiv |
| Aufbewahrungsausnahme: Block, Objektträger, Feuchtgewebe | Ganze Zahl von Tagen größer als 0, ein Feld je Materialtyp | Optional | Ein leeres Feld verwendet die Vorgabe des Rechtsraums. Ein Wert unter der Untergrenze der Aufsichtsbehörde öffnet ein Bestätigungsfenster (siehe unten). | Leer |
| Name des Laborleiters | Text | Optional | Berichtskopf-Kennzeichnung für diese Abteilung. Der Rückfall ist die Einrichtung, dann das Unternehmen. | Leer |
| CLIA-/ISO-Akkreditierungsnummer | Text | Optional | Gleicher Rückfall. | Leer |
| Kopfzeilen-Logo-URL | https-Link | Optional | Eine gehostete Bildadresse. Gespeichert wird nur die Adresse, nie das Bild. Muss mit `https` beginnen. | Leer |

#### Bestätigungsfenster bei Unterschreitung der Untergrenze

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Begründung | Freitext | Pflicht | Warum diese Abteilung Unterlagen kürzer aufbewahrt als die Untergrenze der Aufsichtsbehörde. | Keine |
| Unterschreitung der Untergrenze bestätigen | Schaltfläche | Entfällt | Speichert die Ausnahme und schreibt das Prüfereignis „Retention Override Below Floor“. | Entfällt |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, verifizieren, deaktivieren: `config:departments:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Die einzige Verweisprüfung bei der Deaktivierung betrifft das Präparatwörterbuch. Die Liste der Zuschneidevorlagen einer Abteilung ist auf drei Auswahlmöglichkeiten festgelegt und kann nicht erweitert werden. Vorbelegte Abteilungen sind Surgical Tissue, Fluid / Cytology, Histology-Only / Consultation und ein nicht verifizierter, automatisch angelegter Frozen Section.

### Subspezialitäten {#screen-subspecialties}
Breadcrumb: Startseite > Konfiguration > System > Klinische Nachschlagewerke > Subspezialitäten

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Klinische Nachschlagewerke**
**2. Wartungspunkt:** Subspezialitäten

**3. Geschäftlicher Zweck und Umfang.** Eine Subspezialität ist eine pathologische Arbeitsgruppe, etwa GI, Brust, Dermatopathologie oder Hämatopathologie. Jede kann eine **Arbeitsgruppe** sein (Fälle werden namentlich genannten Pathologen zugewiesen) oder ein **Pool** (jedes Mitglied darf einen Fall übernehmen). Eine Subspezialität besitzt eine Liste von Probentypen, eine Liste von Pathologen und Assistenzärzten und eine Liste von Einrichtungen. Weiterleitungsregeln schicken Fälle dorthin, und die Schnellauswahl für die Objektträgerverteilung führt die aktiven auf. Ein systemverwalteter Pool namens General Pathology ist der Auffangpool für Fälle, die zu nichts anderem passen.

**4. Voraussetzungen und Abhängigkeiten.** Der Reiter Ärzte führt Mitarbeitende auf, deren Rolle Pathologe oder Assistenzarzt ist, und der Reiter Einrichtungen führt aktive Einrichtungen auf. Legen Sie beides zuerst in Stufe 1 an ([Mitarbeiter](#screen-staff-members), [Einrichtungsverzeichnis](#screen-facility-dictionary)), sonst sind diese Reiter leer. Probentypen können hier verknüpft werden oder später im Editor des [Präparatwörterbuchs](#screen-specimens), wo jeder Probentyp eine Subspezialität nennt. Ein Probentyp kann nur zu einer Subspezialität gehören.

Setup step: Tier 2, step 6
Requires: [Mitarbeiter](#screen-staff-members), [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Präparatwörterbuch](#screen-specimens), [Routingregeln](#screen-routing_rules)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-subspecialties - Subspezialitätenliste mit Suche, Statusfilter und Subspezialität hinzufügen]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Schränkt nach dem Namen der Subspezialität ein. | Leer |
| Statusfilter | Auswahl: Alle, Aktiv, Inaktiv | Optional | | Alle |
| Spalte Name der Subspezialität | Text | Entfällt | Name mit einem Punkt für die Arbeitsgruppe, einem Kennzeichen SYSTEM für den systemverwalteten Pool, der Beschreibung und dem durchführenden Labor. | Entfällt |
| Spalte Status | Text | Entfällt | Aktiv oder Inaktiv. | Entfällt |
| Bearbeiten | Schaltfläche in der Zeile | Entfällt | Öffnet das Bearbeitungsfenster. Beim systemverwalteten Pool steht stattdessen **Schreibgeschützt**. | Entfällt |
| Fußzeile Live-Systemsynchronisierung | Text | Entfällt | Eine Anzahl der angezeigten Subspezialitäten. | Entfällt |

#### Bearbeitungsfenster: linker Bereich

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Eindeutig für das durchführende Labor oder über alles hinweg, wenn die Subspezialität Global ist. | Keiner |
| Status | Schalter Aktiv / Inaktiv | Optional | Das Inaktivieren fordert eine Bestätigung an (siehe unten). Beim Reaktivieren erscheint ein Hinweis, dass die früheren Verknüpfungen nicht wiederhergestellt werden. | Aktiv |
| Zuweisungsmodus | Auswahl: Arbeitsgruppe oder Pool | Pflicht | Arbeitsgruppe: Fälle werden namentlich genannten Pathologen zugewiesen. Pool: Jedes Mitglied des Pools darf einen Fall übernehmen. Pool-Übernahmen werden durchgesetzt, wenn ein Fall übernommen oder angenommen wird. | Arbeitsgruppe |
| Durchführendes Labor | Auswahl: Global oder ein aktives durchführendes Labor | Optional | Wird für einen Pool angeboten. Beschränkt den Namen und die Auffangkennzeichnung auf dieses Labor. | Global |
| Auffangpool | Kontrollkästchen | Optional | Höchstens eine Subspezialität je Laborbereich ist der Auffangpool. Beim Speichern wird die Kennzeichnung vom bisherigen Inhaber entfernt. | Aus |
| Beschreibung | Freitext | Optional | | Keine |

#### Bearbeitungsfenster: rechter Bereich

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Reiter Proben | Auswahlliste der Einträge des Präparatwörterbuchs | Optional | Das Ankreuzen eines Eintrags schreibt diese Subspezialität in den Probentyp. Ein Eintrag, der bereits zu einer anderen Subspezialität gehört, zeigt „Derzeit in: X“. | Keine angekreuzt |
| Reiter Ärzte | Auswahlliste der Mitarbeitenden mit der Rolle Pathologe oder Assistenzarzt | Optional | Die Mitglieder der Arbeitsgruppe. | Keine angekreuzt |
| Reiter Einrichtungen | Auswahlliste der aktiven Einrichtungen | Optional | Die Einrichtungen, die die Arbeitsgruppe betreut. Gespeichert als Kundenliste der Subspezialität. | Keine angekreuzt |
| Zusammenfassung in der Fußzeile | Text | Entfällt | Anzahl der angekreuzten Proben, Ärzte und Einrichtungen. | Entfällt |

#### Bestätigungsfenster zum Inaktivieren

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Auswirkungsliste | Text | Entfällt | Führt die Proben auf, deren Verknüpfung aufgehoben wird, die Ärzte, deren Zuweisung entfällt, die Einträge der TAT-Konfiguration, die ihr noch zugeordnet sind, und die Weiterleitungsregeln, die noch auf sie zielen. | Entfällt |
| Deaktivieren & entkoppeln | Schaltfläche | Entfällt | Inaktiviert die Subspezialität und entfernt die Verknüpfungen zu Proben und Ärzten. Die TAT-Einträge und Weiterleitungsregeln werden aufgeführt, aber nicht geändert. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, inaktivieren: `config:subspecialties:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Vorbelegte Subspezialitäten sind GI, Breast, Dermatopathology, Neuro, Hematopathology, Surgical GYN, Uro, Thoracic, ein Pool Oncology und der systemverwaltete Pool General Pathology. Das Inaktivieren einer Subspezialität entfernt nicht die Weiterleitungsregeln oder TAT-Einträge, die sie noch nennen. Korrigieren Sie diese auf ihren eigenen Bildschirmen.

### Reiter Zytologie {#screen-tab-cytology}
Breadcrumb: Startseite > Konfiguration > Zytologie

**Status:** Umgesetzt

**1. Navigation:** Reiter **Zytologie** der Konfiguration
**2. Wartungspunkt:** Zytologieeinstellungen (eine Seitenleiste mit zwölf Abschnitten)

**3. Geschäftlicher Zweck und Umfang.** Der Reiter Zytologie enthält alle Einstellungen, die speziell die Zytopathologie betreffen. Er ist eine Seitenleiste mit zwölf Abschnitten. Acht sind in diesem Kapitel beschrieben, drei (QC-Einstellungen, Obergrenze der Arbeitsmenge und Histologie-Korrelation) in [Kapitel 4](#screen-cytology_qc_settings) und einer (das Register) in Kapitel 8. Jeder Abschnitt prüft seine eigene Berechtigung. Wer sie nicht besitzt, sieht den Abschnitt nur lesend. Beim Wechsel zwischen Abschnitten mit ungespeicherten Änderungen werden Sie zuerst um eine Bestätigung gebeten.

| Beschriftung der Seitenleiste | Bildschirm |
|---|---|
| Interpretation und Empfehlungen | [Interpretation und Empfehlungen](#screen-cytology_categories) |
| Nicht-gynäkologische Klassifikation (Milan/Paris) | [Nicht-gynäkologische Klassifikation](#screen-non_gyn_cytology_categories) |
| Nomenklatursystem | [Nomenklatursystem](#screen-cytology_nomenclature) |
| Screening-Strategie | [Screening-Strategie](#screen-cytology_screening_strategy) |
| Nicht-gynäkologische Weiterleitung | [Nicht-gynäkologische Weiterleitung](#screen-cytology_routing) |
| Länder- und Laborregeln | [Länder- und Laborregeln](#screen-cytology_compliance_features) |
| Unterstützte Instrumentierung | [Unterstützte Instrumentierung](#screen-cytology_instrumentation) |
| Zyto-histologische Korrelation (SNOMED) | [Zyto-histologische Korrelation (SNOMED)](#screen-snomed_histology_severity_mapping) |
| QC-Einstellungen | [Kapitel 4](#screen-cytology_qc_settings) |
| Obergrenze der Arbeitsmenge | [Kapitel 4](#screen-cytology_workload_cap) |
| Histologie-Korrelation | [Kapitel 4](#screen-cytology_histology_correlation) |
| Register | [Kapitel 8](#screen-cytology_registry) |

**4. Voraussetzungen und Abhängigkeiten.** Der Reiter selbst benötigt nichts. Seine Überschreibungen je Einrichtung führen die Einrichtungen aus dem [Einrichtungsverzeichnis](#screen-facility-dictionary) auf; richten Sie dieses daher zuerst ein.

Setup step: Tier 2, step 24
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Nomenklatursystem](#screen-cytology_nomenclature), [Interpretation und Empfehlungen](#screen-cytology_categories), [Nicht-gynäkologische Klassifikation](#screen-non_gyn_cytology_categories), [Screening-Strategie](#screen-cytology_screening_strategy), [Nicht-gynäkologische Weiterleitung](#screen-cytology_routing), [Länder- und Laborregeln](#screen-cytology_compliance_features), [Unterstützte Instrumentierung](#screen-cytology_instrumentation), [Zyto-histologische Korrelation (SNOMED)](#screen-snomed_histology_severity_mapping)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-cytology - Reiter Zytologie mit seiner Seitenleiste der Abschnitte]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Seitenleiste | Liste von zwölf Abschnitten | Entfällt | Die Auswahl eines Abschnitts öffnet ihn rechts. Ein Abschnitt, dessen Berechtigung Ihnen fehlt, öffnet sich nur lesend. | Erster Abschnitt |
| Hinweis auf ungespeicherte Änderungen | Bestätigungsfenster | Entfällt | Erscheint, wenn Sie einen Abschnitt mit ungespeicherten Änderungen verlassen. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Jeder Abschnitt nennt seine eigene Berechtigung. Admin, Laborleiter und Superadmin besitzen die Zytologie-Berechtigungen standardmäßig, mit einer Ausnahme, die unter [Länder- und Laborregeln](#screen-cytology_compliance_features) genannt ist.

**Bekannte Grenzen.** Keine bekannt.
### Nomenklatursystem {#screen-cytology_nomenclature}
Breadcrumb: Startseite > Konfiguration > Zytologie > Nomenklatursystem

**Status:** Umgesetzt

**1. Navigation:** Reiter **Zytologie** der Konfiguration > Seitenleiste **Nomenklatursystem**
**2. Wartungspunkt:** Nomenklatursystem

**3. Geschäftlicher Zweck und Umfang.** Legt das Befundungssystem der Zytologie fest, das das Labor verwendet. Das Unternehmen hat einen Standard, und jede Einrichtung kann ein eigenes System haben. Die Wahl bestimmt, welche Kategorieliste der Zytologieassistent und der Pathologe sehen, wenn sie einen Fall interpretieren.

**4. Voraussetzungen und Abhängigkeiten.** Die Einrichtungsliste für Überschreibungen stammt aus dem [Einrichtungsverzeichnis](#screen-facility-dictionary). Wird es übersprungen, hat **+ Überschreibung hinzufügen** keine Einrichtung zur Auswahl. Die Kategorielisten jedes Systems werden unter [Interpretation und Empfehlungen](#screen-cytology_categories) bearbeitet.

Setup step: Tier 2, step 25
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Interpretation und Empfehlungen](#screen-cytology_categories)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_nomenclature - Unternehmensstandard und Überschreibungen je Einrichtung]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unternehmensstandard | Auswahl: Bethesda, BSCC/RCPath, München III, SFCC (französisch beschriftetes Bethesda), PALGA CISOE-A | Pflicht | Wird von jeder Einrichtung ohne eigene Überschreibung verwendet. Speichern schreibt ihn. | Bethesda |
| + Überschreibung hinzufügen | Schaltfläche | Entfällt | Öffnet eine Zeile, in der Sie eine Einrichtung und ein System wählen. | Entfällt |
| Einrichtung (Überschreibungszeile) | Auswahlliste der Einrichtungen | Pflicht | Die Einrichtung, für die die Überschreibung gilt. | Keine |
| System (Überschreibungszeile) | Auswahl derselben fünf Systeme | Pflicht | Das Befundungssystem, das diese Einrichtung verwendet. | Keines |
| Entfernen | Schaltfläche in der Zeile | Entfällt | Entfernt die Überschreibung. Die Einrichtung kehrt zum Unternehmensstandard zurück. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:cytology-nomenclature:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig.

**Bekannte Grenzen.** PALGA CISOE-A kann hier gewählt werden, aber [Interpretation und Empfehlungen](#screen-cytology_categories) hat dafür keinen Kategorieeditor.

### Interpretation und Empfehlungen {#screen-cytology_categories}
Breadcrumb: Startseite > Konfiguration > Zytologie > Interpretation und Empfehlungen

**Status:** Umgesetzt

**1. Navigation:** Reiter **Zytologie** der Konfiguration > Seitenleiste **Interpretation und Empfehlungen**
**2. Wartungspunkt:** Interpretation und Empfehlungen (das Kategoriewörterbuch der Zytologie)

**3. Geschäftlicher Zweck und Umfang.** Enthält die Kategorielisten, aus denen ein Zytologiebefund für das gewählte Nomenklatursystem aufgebaut wird: Probenqualität, allgemeine Kategorisierung, Interpretation oder Ergebnis und Empfehlungen. Jeder Eintrag gibt an, ob ein Pathologe ihn vor der Befundfreigabe prüfen muss und welchen Schweregrad er der Erkennung von Auffälligkeiten vorschlägt. Die Bethesda-Liste ist die Hauptliste. Die SFCC-Ansicht ist eine schreibgeschützte Kopie von Bethesda mit dem französischen Text.

**4. Voraussetzungen und Abhängigkeiten.** Legen Sie zuerst unter [Nomenklatursystem](#screen-cytology_nomenclature) das verwendete System fest, damit Sie die Liste bearbeiten, die die Anwender sehen werden. Der vorgeschlagene Schweregrad wird von der Prüfung auf klinische Diskrepanz und von der Erkennung von Auffälligkeiten gelesen, wenn ein Fall freigegeben wird. Wird dieser Bildschirm übersprungen, werden die eingebauten Listen verwendet.

Setup step: Tier 2, step 26
Requires: [Nomenklatursystem](#screen-cytology_nomenclature)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_categories - Kategorieliste für das gewählte System mit den Abschnitts-Reitern]

**6. Feldreferenz.**

#### Seitensteuerung

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Nomenklatursystem | Auswahl: Bethesda, BSCC/RCPath, München III, SFCC | Pflicht | Die Liste, die bearbeitet wird. SFCC ist schreibgeschützt und aus Bethesda abgeleitet. PALGA CISOE-A wird hier nicht angeboten. | Bethesda |
| Abschnitts-Reiter | Reiter: Probenqualität, Allgemeine Kategorisierung, Interpretation / Ergebnis, Empfehlungen | Pflicht | Jeder Reiter ist eine Kategorieliste. | Probenqualität |
| Inaktive anzeigen | Kontrollkästchen | Optional | Schließt deaktivierte Kategorien ein. | Aus |
| + Kategorie hinzufügen | Schaltfläche | Entfällt | Öffnet das Fenster zum Hinzufügen. Für SFCC ausgeblendet. | Entfällt |
| Französische Übersetzungen als CSV exportieren | Schaltfläche | Entfällt | Lädt die Bethesda-Liste mit ihrem französischen Text herunter. Der Export wird im Prüfprotokoll festgehalten. | Entfällt |
| Französische Übersetzungen als CSV importieren | Schaltfläche | Entfällt | Liest den französischen Text anhand der Kategorie-ID wieder ein. | Entfällt |
| Kennzeichen in der Zeile | Text | Entfällt | Pathologenprüfung, der vorgeschlagene Schweregrad, Inaktiv und ein Kennzeichen „eingebaut“. | Entfällt |
| Deaktivieren / Reaktivieren | Schaltfläche in der Zeile | Entfällt | Ändert die Markierung Aktiv. | Entfällt |
| Bearbeiten | Schaltfläche in der Zeile | Entfällt | Öffnet das Bearbeitungsfenster. | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Bezeichnung | Text | Pflicht | Die Kategorie, wie sie im Befund erscheint. | Keine |
| Französische Bezeichnung (SFCC) | Text | Optional | Nur Bethesda. Speist die SFCC-Ansicht. | Leer |
| Abkürzung | Text | Optional | | Leer |
| Gruppe | Auswahl | Optional | Nur im Reiter Interpretation / Ergebnis. Gruppiert den Eintrag. | Keine |
| Beschreibung | Freitext | Optional | | Leer |
| Französische Beschreibung | Freitext | Optional | Nur Bethesda. | Leer |
| Erfordert Pathologenprüfung vor Befundfreigabe | Kontrollkästchen | Optional | Ein Zytologieassistent kann einen Fall mit dieser Kategorie nicht allein freigeben. | Aus |
| Vorgeschlagener Schweregrad für die Erkennung von Auffälligkeiten | Auswahl: keiner, Auffällig, Kritisch, Maligne | Optional | Ein Vorschlag an die Erkennung von Auffälligkeiten. Ein Treffer wird immer vom Pathologen bestätigt oder bestritten. | Keiner |
| Aktiv | Kontrollkästchen | Optional | | An |

#### Karte Richtlinie für reaktive Veränderungen (nur Bethesda)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Reaktive Veränderungen: Wer gibt frei | Statustext: Zytologieassistent, gemischt oder Pathologe | Entfällt | Zeigt die aktuelle Einstellung für die Einträge zu reaktiven Veränderungen. | Zytologieassistent |
| Freigabe durch Zytotechnologen erlauben | Schaltfläche | Entfällt | Hebt die Prüfpflicht für die Einträge zu reaktiven Veränderungen auf (diejenigen, deren ID mit `cyto-nonneo-reactive-` beginnt). | Entfällt |
| Pathologen verlangen | Schaltfläche | Entfällt | Setzt die Prüfpflicht für dieselben Einträge. Gilt nur für neue Prüfungen. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern, einschließlich der beiden Richtlinien-Schaltflächen: `config:cytology-categories:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig.

**Bekannte Grenzen.** Das Fenster zeigt drei gespeicherte Eigenschaften nicht an (`usage`, `diagnosticRank` und `isUnsatisfactory`). Der französische CSV-Import ordnet anhand der ID zu und fügt keine neuen Kategorien hinzu.

### Nicht-gynäkologische Klassifikation (Milan/Paris) {#screen-non_gyn_cytology_categories}
Breadcrumb: Startseite > Konfiguration > Zytologie > Nicht-gynäkologische Klassifikation (Milan/Paris)

**Status:** Umgesetzt

**1. Navigation:** Reiter **Zytologie** der Konfiguration > Seitenleiste **Nicht-gynäkologische Klassifikation (Milan/Paris)**
**2. Wartungspunkt:** Nicht-gynäkologische Klassifikation

**3. Geschäftlicher Zweck und Umfang.** Enthält die nummerierten diagnostischen Kategorien der beiden nicht-gynäkologischen Befundungssysteme: des Milan-Systems (Speicheldrüse) und des Paris-Systems (Harnwege). Jede Kategorie hat eine Nummer, eine Bezeichnung und ein optionales Malignitätsrisiko.

**4. Voraussetzungen und Abhängigkeiten.** Eigenständig. Die Kategorien erscheinen im nicht-gynäkologischen Zytologiebefund. Wird er übersprungen, werden die eingebauten Kategorien verwendet.

Setup step: Tier 2, step 27
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-non_gyn_cytology_categories - Kategorieliste für Milan und Paris]

**6. Feldreferenz.**

#### Seitensteuerung

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Schaltflächen für das System | Auswahl: Milan (Speicheldrüse), Paris (Harnwege) | Pflicht | Die Liste, die bearbeitet wird. | Erstes System |
| Inaktive anzeigen | Kontrollkästchen | Optional | | Aus |
| + Kategorie hinzufügen | Schaltfläche | Entfällt | Öffnet das Fenster zum Hinzufügen. | Entfällt |
| Deaktivieren / Reaktivieren | Schaltfläche in der Zeile | Entfällt | | Entfällt |
| Bearbeiten | Schaltfläche in der Zeile | Entfällt | | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Kategorienummer | Ganze Zahl | Pflicht | Die Nummer der Kategorie im System. | Keine |
| Bezeichnung | Text | Pflicht | | Keine |
| Abkürzung | Text | Optional | | Leer |
| Beschreibung | Freitext | Optional | | Leer |
| Malignitätsrisiko in % | Zahl von 0 bis 100 | Optional | Wird neben der Kategorie angezeigt. | Leer |
| Erfordert Pathologenprüfung | Kontrollkästchen | Optional | | An |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:cytology-categories:manage` (hohes Risiko, protokolliert), dieselbe Berechtigung wie bei [Interpretation und Empfehlungen](#screen-cytology_categories). Admin, Laborleiter und Superadmin besitzen sie standardmäßig.

**Bekannte Grenzen.** Keine bekannt.

### Screening-Strategie {#screen-cytology_screening_strategy}
Breadcrumb: Startseite > Konfiguration > Zytologie > Screening-Strategie

**Status:** Umgesetzt

**1. Navigation:** Reiter **Zytologie** der Konfiguration > Seitenleiste **Screening-Strategie**
**2. Wartungspunkt:** Screening-Strategie

**3. Geschäftlicher Zweck und Umfang.** Legt fest, wie das Zervixscreening durchgeführt wird (Co-Testing, HPV-first oder nur Zytologie), für das Unternehmen und für jede Einrichtung, und enthält die Fristen und den Wortlaut für die Wiedereinbestellung für Australien und Neuseeland.

**4. Voraussetzungen und Abhängigkeiten.** Die Einrichtungsliste für Überschreibungen stammt aus dem [Einrichtungsverzeichnis](#screen-facility-dictionary). Die Karte der Wiedereinbestellungsfristen wird innerhalb der Einstellungen der Strategie gespeichert, daher gilt dieselbe Berechtigung.

Setup step: Tier 2, step 28
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_screening_strategy - Standardstrategie, Überschreibungen je Einrichtung und Karte der Wiedereinbestellungsfristen]

**6. Feldreferenz.**

#### Strategie

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unternehmensstandard | Auswahl: Co-Testing, Primäre HPV-Testung mit Reflex auf Zytologie, Nur Zytologie | Pflicht | Wird von jeder Einrichtung ohne Überschreibung verwendet. | Co-Testing |
| + Überschreibung hinzufügen | Schaltfläche | Entfällt | Öffnet eine Zeile, in der Sie eine Einrichtung und eine Strategie wählen. | Entfällt |
| Überschreibung je Einrichtung | Auswahlliste plus dieselben drei Auswahlmöglichkeiten | Pflicht | | Keine |
| Entfernen | Schaltfläche in der Zeile | Entfällt | Entfernt die Überschreibung. | Entfällt |

#### Karte Wiedereinbestellungsfristen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Land | Auswahl: Australien, Neuseeland | Pflicht | Das Land, dessen Fristen und Wortlaut Sie bearbeiten. Die Auswahl ist gesperrt, solange das Formular ungespeicherte Änderungen enthält. | Australien |
| Dringend (HPV 16/18): Von, Bis | Ganze Wochen, 1 bis 52 | Optional | Das erste Feld darf nicht später sein als das zweite. Sind beide leer, bedeutet das „so bald wie möglich“. | 2 bis 4 Wochen |
| Routine: Von, Bis | Ganze Wochen, 1 bis 52 | Optional | Gleiche Regeln. | 6 bis 12 Wochen |
| Wiederholte Entnahme: Von, Bis | Ganze Wochen, 1 bis 52 | Optional | Wird für das gewählte Land als Frist für Australien oder als Frist für Neuseeland angezeigt. | Australien 6 bis 12 Wochen, Neuseeland leer |
| Sprache | Auswahl: Englisch, Französisch, Deutsch, Niederländisch, Koreanisch, Spanisch | Pflicht | Die Sprache des Wortlauts, den Sie bearbeiten. | Englisch |
| Wortlaut: LBC-Wiedereinbestellung für Ärzte | Freitext, bis zu 1000 Zeichen | Optional | Leer verwendet den eingebauten Text. Zulässig sind nur die Platzhalter `{{type}}` und `{{next}}`. | Leer |
| Wortlaut: wiederholte Entnahme | Freitext, bis zu 1000 Zeichen | Optional | Leer verwendet den eingebauten Text. Platzhalter sind nicht zulässig. | Leer |
| Speichern | Schaltfläche | Entfällt | Speichert die Fristen und den Wortlaut. Protokolliert als `RECALL_SETTINGS_CHANGED`. | Entfällt |
| Änderungen verwerfen | Schaltfläche | Entfällt | Setzt die Karte auf die gespeicherten Werte zurück. | Entfällt |
| Standardwerte wiederherstellen | Schaltfläche | Entfällt | Setzt die eingebauten Fristen wieder in das Formular ein. Wählen Sie Speichern, um sie zu behalten. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:cytology-screening-strategy:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig.

**Bekannte Grenzen.** Eine altersbasierte Screening-Regel existiert im Dienst, hat aber keinen Bildschirm. Wiedereinbestellungsfristen gibt es nur für Australien und Neuseeland.

### Nicht-gynäkologische Weiterleitung {#screen-cytology_routing}
Breadcrumb: Startseite > Konfiguration > Zytologie > Nicht-gynäkologische Weiterleitung

**Status:** Umgesetzt

**1. Navigation:** Reiter **Zytologie** der Konfiguration > Seitenleiste **Nicht-gynäkologische Weiterleitung**
**2. Wartungspunkt:** Nicht-gynäkologische Weiterleitung

**3. Geschäftlicher Zweck und Umfang.** Legt fest, an welche Arbeitsliste ein nicht-gynäkologischer Zytologiefall geht: die Arbeitsliste Chirurgische Pathologie oder die Arbeitsliste Zytologie. Gynäkologische Fälle gehen immer an die Arbeitsliste Zytologie.

**4. Voraussetzungen und Abhängigkeiten.** Überschreibungen verwenden die Einrichtungsliste aus dem [Einrichtungsverzeichnis](#screen-facility-dictionary). Die nicht-gynäkologische Probenkategorie im [Präparatwörterbuch](#screen-specimens) bestimmt, für welche Fälle dies gilt.

Setup step: Tier 2, step 29
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_routing - Unternehmensstandard und Überschreibungen je Einrichtung]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unternehmensstandard | Auswahl: Arbeitsliste Chirurgische Pathologie, Arbeitsliste Zytologie | Pflicht | Wohin nicht-gynäkologische Fälle gehen, sofern keine Überschreibung je Einrichtung gilt. | Arbeitsliste Chirurgische Pathologie |
| + Überschreibung hinzufügen | Schaltfläche | Entfällt | Öffnet eine Zeile, in der Sie eine Einrichtung und eine Arbeitsliste wählen. | Entfällt |
| Überschreibung je Einrichtung | Auswahlliste plus die zwei Auswahlmöglichkeiten | Pflicht | | Keine |
| Entfernen | Schaltfläche in der Zeile | Entfällt | | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:cytology-routing:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig.

**Bekannte Grenzen.** Keine bekannt.

### Länder- und Laborregeln {#screen-cytology_compliance_features}
Breadcrumb: Startseite > Konfiguration > Zytologie > Länder- und Laborregeln

**Status:** Umgesetzt

**1. Navigation:** Reiter **Zytologie** der Konfiguration > Seitenleiste **Länder- und Laborregeln**
**2. Wartungspunkt:** Länder- und Laborregeln

**3. Geschäftlicher Zweck und Umfang.** Schaltet drei länderspezifische Kontrollen der Zytologie für das Unternehmen und für jede Einrichtung ein oder aus und enthält die Regeln für Screening-Intervalle nach Land. Die Kontrollen tun, was ihre Bezeichnung sagt. Sie sorgen nicht für sich allein dafür, dass ein Labor einen Standard erfüllt.

**4. Voraussetzungen und Abhängigkeiten.** Überschreibungen je Einrichtung verwenden das [Einrichtungsverzeichnis](#screen-facility-dictionary). Jede Funktion, die auf Automatisch steht, folgt dem Land der Einrichtung; deshalb muss der Rechtsraum der Einrichtung festgelegt sein.

Setup step: Tier 2, step 30
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_compliance_features - Drei Funktionen und die Karte der Screening-Intervalle]

**6. Feldreferenz.**

#### Funktionen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Tägliche CLIA-Arbeitslastgrenze | Auswahl: Automatisch, An, Aus | Pflicht | Begrenzt die Objektträger, die ein Zytologieassistent an einem Tag durchmustert. Automatisch bedeutet An für US-Einrichtungen. | Automatisch |
| 5-jährige retrospektive Rückschau nach CAP | Auswahl: Automatisch, An, Aus | Pflicht | Automatisch bedeutet An für US-Einrichtungen. | Automatisch |
| Signatur für dringende vorläufige Befunde | Auswahl: Automatisch, An, Aus | Pflicht | Automatisch bedeutet, dass überall eine Signatur erforderlich ist. | Automatisch |
| Überschreibung je Einrichtung | Auswahlliste plus die drei Auswahlmöglichkeiten, je Funktion | Optional | Überschreibt die Einstellung des Unternehmens für eine Einrichtung. | Keine |
| Speichern | Schaltfläche | Entfällt | Speichert die Funktionen. Protokolliert. | Entfällt |

#### Karte Screening-Intervalle

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Ländercode | Text, in Großbuchstaben umgewandelt | Pflicht | Zum Beispiel GB_EW, FR. | Keiner |
| Ab Alter | Ganze Zahl, 0 oder mehr | Pflicht | Beginn der Altersgruppe. | 25 in einer neuen Zeile |
| Bis Alter | Ganze Zahl, nicht kleiner als Ab Alter | Pflicht | Ende der Altersgruppe. | 64 in einer neuen Zeile |
| Intervall (Monate) | Ganze Zahl größer als 0 | Pflicht | Das Screening-Intervall für die Altersgruppe. Wird für die Prüfung der Einhaltung des Intervalls verwendet (EU-QA-01). Die Karenzzeit beträgt 3 Monate. | 36 in einer neuen Zeile |
| Entfernen | Schaltfläche in der Zeile | Entfällt | | Entfällt |
| Regel hinzufügen | Schaltfläche | Entfällt | Fügt eine Zeile hinzu. | Entfällt |
| Speichern | Schaltfläche | Entfällt | Eine Zeile ohne Land, mit negativem Alter, mit einem Wert Bis Alter unter Ab Alter oder mit einem Intervall von 0 oder weniger wird abgelehnt („invalidRule“). Protokolliert als „Screening Intervals Updated“. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:cytology-compliance:manage` (hohes Risiko, protokolliert). Admin und Superadmin besitzen sie standardmäßig. **Der Laborleiter besitzt sie nicht**, weil diese Berechtigung zur Gruppe Administration und nicht zur Gruppe Zytologie gehört.

**Bekannte Grenzen.** Der Bildschirm hat keine reine Leseansicht: Wer die Berechtigung nicht besitzt, sieht Bedienelemente, die das Speichern dann ablehnt. Die vorbelegten Intervallregeln decken GB_EW, FR, DE, NL, BE und IE ab und sind Beispiele zur Überprüfung, keine nationale Richtlinie.

### Unterstützte Instrumentierung {#screen-cytology_instrumentation}
Breadcrumb: Startseite > Konfiguration > Zytologie > Unterstützte Instrumentierung

**Status:** Umgesetzt

**1. Navigation:** Reiter **Zytologie** der Konfiguration > Seitenleiste **Unterstützte Instrumentierung**
**2. Wartungspunkt:** Unterstützte Instrumentierung

**3. Geschäftlicher Zweck und Umfang.** Legt fest, wie Zytologieassistenten Objektträger durchmustern: an digitalen Objektträgerbildern (Whole Slide Imaging) oder auf die herkömmliche geführte Weise. Bei Whole Slide Imaging zeigt der Fall die Aktion **WSI-Objektträger anzeigen** und die Kachel Scans abgeschlossen. Bei der herkömmlichen Modalität werden keine Bildsteuerungen angezeigt.

**4. Voraussetzungen und Abhängigkeiten.** Überschreibungen verwenden das [Einrichtungsverzeichnis](#screen-facility-dictionary).

Setup step: Tier 2, step 31
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_instrumentation - Unternehmensstandard und Überschreibungen je Einrichtung]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unternehmensstandard | Auswahl: Whole Slide Imaging (WSI), Herkömmlich geführt | Pflicht | | Whole Slide Imaging |
| + Überschreibung hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Überschreibung je Einrichtung | Auswahlliste plus die zwei Auswahlmöglichkeiten | Pflicht | | Keine |
| Entfernen | Schaltfläche in der Zeile | Entfällt | | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:cytology-instrumentation:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig.

**Bekannte Grenzen.** Keine bekannt.

### Zyto-histologische Korrelation (SNOMED) {#screen-snomed_histology_severity_mapping}
Breadcrumb: Startseite > Konfiguration > Zytologie > Zyto-histologische Korrelation (SNOMED)

**Status:** Umgesetzt

**1. Navigation:** Reiter **Zytologie** der Konfiguration > Seitenleiste **Zyto-histologische Korrelation (SNOMED)**
**2. Wartungspunkt:** Zyto-histologische Korrelation (SNOMED)

**3. Geschäftlicher Zweck und Umfang.** Ordnet SNOMED-Codes der zervikalen Histologie einem Schweregrad von 0 bis 5 zu, damit ein Zytologieergebnis mit der anschließenden Biopsie verglichen werden kann. Die Liste wird mit fünf synthetischen Testeinträgen ausgeliefert. Ersetzen Sie diese durch Ihre lizenzierten Codes.

**4. Voraussetzungen und Abhängigkeiten.** Die Schweregrade werden gelesen, wenn ein Zytologieergebnis mit der anschließenden zervikalen Histologie verglichen wird. Wird dieser Bildschirm übersprungen, hat der Vergleich keine Schweregrade, die er verwenden kann. Zum Ersetzen der synthetischen Testcodes benötigen Sie Codes aus Ihrer eigenen lizenzierten Ausgabe von SNOMED CT.

Setup step: Tier 2, step 32
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: cytology-snomed_histology_severity_mapping - Tabelle SNOMED-Code zu Schweregrad]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| SNOMED-Code | Text | Pflicht | Kann nach dem Hinzufügen nicht mehr geändert werden. Ein doppelter Code wird abgelehnt. | Keiner |
| Beschreibung | Text | Pflicht | | Keine |
| Schweregrad | Ganze Zahl, 0 bis 5 | Pflicht | Das Feld begrenzt den Wert auf 0 bis 5. | Keiner |
| Hinzugefügt | Datum und Benutzer | Entfällt | Wer die Zeile hinzugefügt hat und wann. | Entfällt |
| Bearbeiten | Schaltfläche in der Zeile | Entfällt | Ändert nur die Beschreibung und den Schweregrad. | Entfällt |
| Entfernen | Schaltfläche in der Zeile | Entfällt | Fordert eine Bestätigung an und entfernt dann die Zeile. | Entfällt |
| Zeile hinzufügen | Drei Felder und eine Schaltfläche | Entfällt | Dieselben drei Felder wie oben. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Ändern: `config:cytology-severity-mapping:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig.

**Bekannte Grenzen.** Die Grenze von 0 bis 5 wird nur vom Eingabefeld durchgesetzt. Die vorbelegten Einträge sind `TEST-SNOMED-100001` bis `100005`.
## Teil B: Stammwörterbücher für Proben- und Gewebetypen {#ch3-specimen-tissue}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe

Dieser Teil enthält die Listen, die beschreiben, was im Labor eintrifft und wie es nachverfolgt wird: die Probentypen, die anatomischen Karten, die Kennzeichnungen für Fälle und Proben, die benannten physischen Standorte, die Kühlkette und die Mangeltypen.

### Präparatwörterbuch {#screen-specimens}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Präparatwörterbuch

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Präparatwörterbuch

**3. Geschäftlicher Zweck und Umfang.** Die Hauptliste der Probentypen. Jeder Eintrag nennt den Typ, das Verfahren und die anatomische Lokalisation und trägt die Abteilung, die Subspezialität, das Verarbeitungsprotokoll, die Standardfärbungen und einen Basis-Abrechnungscode. Die **Probenkategorie** steuert die Weiterleitung an Arbeitslisten und das Verhalten beim Probeneingang (chirurgisch, GYN-Zytologie, Non-GYN-Zytologie, Obduktion, molekular, Konsil). Der Auftragseingang gleicht den Probentext eines Auftrags mit dieser Liste ab. Ein Treffer, der nicht exakt ist, löst einen Mangel aus.

**4. Voraussetzungen und Abhängigkeiten.** Der Editor wählt aus drei anderen Listen: die Abteilung aus [Abteilungen](#screen-departments), die Subspezialität aus [Subspezialitäten](#screen-subspecialties) und das Verarbeitungsprotokoll aus den aktiven Protokollen im [Protokollwörterbuch](#screen-protocols). Wird eine davon übersprungen, ist die zugehörige Auswahlliste leer, und der Probentyp wird ohne sie gespeichert. Das Protokoll liefert auch den Kassettentyp, und die [Kassetten-Routingregeln](#screen-cassette_routing_rules) greifen anhand des Protokolls; ein Probentyp ohne Protokoll kann daher nicht zu einer Regel passen, die eines nennt. Standardfärbungen ist reiner Text und wird nicht gegen den [Diagnosekatalog](#screen-stains) geprüft.

Setup step: Tier 2, step 10
Requires: [Abteilungen](#screen-departments), [Subspezialitäten](#screen-subspecialties), [Protokollwörterbuch](#screen-protocols)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-specimens - Liste des Präparatwörterbuchs mit Filtern, Vorlage herunterladen, Tabelle hochladen und Probe hinzufügen]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | | Leer |
| Typfilter | Auswahl | Optional | | Alle |
| Statusfilter | Auswahl | Optional | | Alle |
| Spalte Probe | Text | Entfällt | Name und Code. | Entfällt |
| Spalte Typ, Verfahren, Lokalisation | Text | Entfällt | | Entfällt |
| Spalte Abteilung | Text | Entfällt | | Entfällt |
| Spalte CPT-Basis | Text | Entfällt | | Entfällt |
| Spalte Protokoll | Text | Entfällt | | Entfällt |
| Spalte Fixierung erforderlich | Text | Entfällt | Zeigt, ob vor der Befundfreigabe eine Fixierzeit erforderlich ist. | Entfällt |
| Spalte Status | Text | Entfällt | Wählen Sie sie aus, um zwischen Aktiv und Inaktiv umzuschalten. Es gibt keine Bestätigung. | Entfällt |
| Bearbeiten, Duplizieren | Schaltflächen in der Zeile | Entfällt | Duplizieren öffnet eine Kopie im Editor. | Entfällt |
| Vorlage herunterladen | Schaltfläche | Entfällt | Lädt eine CSV-Datei mit den Importspalten herunter. | Entfällt |
| Tabelle hochladen | Schaltfläche | Entfällt | Öffnet das Fenster Upload überprüfen (unten). | Entfällt |
| + Probe hinzufügen | Schaltfläche | Entfällt | Öffnet den Editor mit einem leeren Probentyp. | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | | Keiner |
| Probencode | Text | Optional | Der Schlüssel, über den ein erneuter Import zuordnet. | Leer |
| Beschreibung | Freitext | Optional | | Leer |
| Typ | Text oder Auswahl | Pflicht | Zum Beispiel Biopsie oder Resektat. | Keiner |
| Verfahren | Text oder Auswahl | Pflicht | | Keines |
| Probenkategorie | Auswahl: keine, SURGICAL_TISSUE, GYN_CYTOLOGY, NON_GYN_CYTOLOGY, AUTOPSY, MOLECULAR, CONSULT, OTHER | Optional | Steuert die Weiterleitung an Arbeitslisten und das Verhalten beim Probeneingang. | Keine |
| Anatomische Lage | Text | Optional | | Leer |
| Seitigkeit | Auswahl: Links, Rechts, Beidseitig, Mittellinie, k. A. | Optional | | Keine |
| Subspezialität | Auswahlliste aus [Subspezialitäten](#screen-subspecialties) | Optional | | Keine |
| Abteilung | Auswahlliste aus [Abteilungen](#screen-departments) | Optional | | Keine |
| Synonyme | Text, durch Kommas getrennt | Optional | Andere Namen, die der Auftrag verwenden kann. | Leer |
| Standard-Basis-CPT-Code | Text | Optional | Freitext. | Leer |
| Standardfärbungen | Text, durch Kommas getrennt | Optional | Freitext, nicht an das Färbungswörterbuch gebunden. | Leer |
| Verarbeitungshinweise | Freitext | Optional | | Leer |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |
| Erfordert Fixierzeit vor Befundfreigabe | Schalter Ja/Nein | Optional | | Aus |
| Verarbeitungsprotokoll | Auswahlliste der aktiven Protokolle | Optional | | Keines |

#### Fenster Upload überprüfen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| CSV-Spalten | Name, Description, Subspecialty, SpecimenCode, Type, Procedure, Site, Laterality, Synonyms, Department, RequiresFixativeTime, Active, DefaultStains, ProcessingNotes | Entfällt | Eine Zeile wird einem vorhandenen Probentyp zuerst über SpecimenCode zugeordnet, dann über Name. Subspecialty und Department werden über den Namen zugeordnet. | Entfällt |
| N Zeile(n) übernehmen | Schaltfläche | Entfällt | Schreibt die angezeigten Zeilen. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, importieren, aktivieren: `config:specimen-dictionary:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Zwei gespeicherte Eigenschaften haben kein Feld auf dem Bildschirm (`defaultComplexity` und `microUpgradeBaseCptCode`). Beim Speichern wird als Bearbeiter im Datensatz „admin“ eingetragen, nicht die angemeldete Person. Der Standard-Basis-CPT-Code wird nicht gegen das Abrechnungswörterbuch geprüft.

### Organkarten {#screen-organ_maps}
Breadcrumb: Startseite > Konfiguration > System > Klinische Nachschlagewerke > Organkarten

**Status:** Demonstration

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Klinische Nachschlagewerke**
**2. Wartungspunkt:** Organkarten

**3. Geschäftlicher Zweck und Umfang.** Die anatomischen Karten, die neben einem synoptischen Befund angezeigt werden (Prostata-Sektor- und Biopsiekarten, Zifferblatt der Mamma, kolorektaler Polyp, Rektum- und Nierenresektion, Mundhöhle, Neck Dissection, Mohs-Stufen), werden immer aus den Antworten des Synoptikbefunds gezeichnet. Eine Karte hat keine eigenen Daten. Dieser Bildschirm legt fest, wie die Karten aussehen und welche Fragen sie speisen. Er hat zwei Reiter: **Farben und Muster** und **Kartenzuordnungen**.

**4. Voraussetzungen und Abhängigkeiten.** Die Bereichsliste unter Farben und Muster führt die Rechtsräume und Einrichtungen aus dem [Einrichtungsverzeichnis](#screen-facility-dictionary) auf. Wird es übersprungen, kann nur die Unternehmensebene bearbeitet werden. Die Kartenzuordnungen führen die synoptischen Vorlagen in der [Synoptik-Bibliothek](#screen-tab-protocols) auf. Die eigenen Prostata- und Mohs-Karten von PathScribe benötigen keine Zuordnung. Eine Vorlage, die Ihr eigenes Labor geschrieben hat, benötigt eine Zuordnung, bevor ihre Karte gezeichnet werden kann.

Setup step: Tier 2, step 15
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Synoptik-Bibliothek](#screen-tab-protocols)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-organ_maps - Farben und Muster mit Ebenenauswahl und Vorschau]

**6. Feldreferenz.**

#### Reiter Farben und Muster

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Ebene | Auswahl: Unternehmen, Rechtsraum, Einrichtung | Pflicht | Die Schicht, die Sie bearbeiten. Eine Einrichtung erbt von ihrem Rechtsraum, dann vom Unternehmen, dann vom eingebauten Schema. Beim Wechsel der Ebene mit ungespeicherten Änderungen werden Sie zuerst gefragt. | Unternehmen |
| Rechtsraum wählen, Einrichtung wählen | Auswahlliste | Pflicht für diese Ebenen | Die Rechtsräume stammen aus dem Rechtsraum der Einrichtungen selbst. | Keine |
| Zeigt (Zeilenbeschriftung) | Text | Entfällt | Eine Zeile je Kategorie oder Umriss: benigne, nicht beprobt, Tumor, Grade Group 1, Grade Group 2, Grade Group 3 oder höher, extraprostatische Ausdehnung, positiver Rand, invasives Karzinom, DCIS, Verkalkungen, Rand frei, Rand knapp, Rand positiv, Residualtumor, perineurale Invasion, Adenom, Adenom am Rand, Dysplasie am Rand, ENE minor, ENE major. | Entfällt |
| Farbe | Farbwähler (Hexwert, etwa `#b91c1c`) | Pflicht beim Überschreiben | | Eingebaute Farbe |
| Muster | Auswahl: Vollfläche, Gepunktet, Schraffiert, Kreuzschraffiert, Kein Muster | Pflicht beim Überschreiben | Jede Farbe ist mit einem Muster gepaart, damit die Karte auch in Schwarzweiß lesbar ist. „Kein Muster“ ist nur für benigne und nicht beprobt zulässig. | Eingebautes Muster |
| Legendentext | Text, bis zu 40 Zeichen | Optional | Ihr eigener Wortlaut für die Legende. | Eingebauter Wortlaut |
| Hier überschreiben / Geerbtes verwenden | Schaltfläche in der Zeile | Entfällt | Entsperrt oder sperrt die Werte der Zeile auf dieser Ebene. | Geerbtes verwenden |
| Schwellenwerte für Rand und Abstand | Sieben Zeilen, jeweils ein Abstand in mm und (bei sechs davon) ein Vergleichsoperator: ≤ bei oder unter, < unter, = genau | Optional | Siehe die Tabelle unten. Jede Zeile hat ihre eigenen Schaltflächen Hier überschreiben und Geerbtes verwenden. | Eingebaute Werte |
| Vorschau | Zeichnungen | Entfällt | Zeigt jede Karte mit dem Entwurfsschema. | Entfällt |
| Überschreibungen dieser Ebene entfernen | Schaltfläche | Entfällt | Löscht die Schicht. | Entfällt |
| Speichern | Schaltfläche | Entfällt | Speichert die Schicht. Wird mit einer Begründung abgelehnt, wenn eine Farbe kein Hexwert ist, ein Muster fehlt, ein Legendentext zu lang ist oder ein Schwellenwert außerhalb des Bereichs liegt. | Entfällt |

| Schwellenwert | Zulässiger Bereich (mm) | Eingebauter Wert |
|---|---|---|
| Mamma: Ein Rand ist knapp unter (kein Operator) | 0.1 bis 10 | 2 |
| Maligner Polyp: Rand befallen bei | 0 bis 10 | 1, ≤ |
| Rektum, zirkumferenzieller Resektionsrand: befallen bei | 0 bis 10 | 1, ≤ |
| Mundhöhle: Rand befallen bei | 0 bis 10 | 1, < |
| Mundhöhle: Rand knapp bei | 0 bis 20 | 5, ≤ |
| Niere, partielle Nephrektomie: Parenchymrand befallen bei | 0 bis 10 | 0, = |
| Niere, radikale Nephrektomie: Weichteilrand befallen bei | 0 bis 10 | 0, = |

Eine Schicht für die Mundhöhle, deren Abstand für „befallen“ nicht unter ihrem Abstand für „knapp“ liegt, wird als Konflikt aufgeführt. Bis dies behoben ist, verwenden die Karten dieser Schicht die Standardregel für „knapp“.

#### Reiter Kartenzuordnungen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Synoptik-Vorlage | Auswahlliste der Vorlagen | Pflicht | Die Vorlage, die zugeordnet wird. Ein Statuskennzeichen zeigt: Kartenfragen von PathScribe, Zuordnung Ihres Labors, Randfragen zur Überprüfung oder Keine Karte. | Keine |
| Karte | Auswahl aus den neun Karten | Pflicht | Der Kartentyp für diese Vorlage. | Aus der Vorlage |
| Fragenauswahl | Eine Auswahlliste je Karteneingabe, etwa Rasterfrage Tumorherde oder Frage zur Seite | Pflicht für die Eingaben, die die Karte benötigt | Jede führt die Fragen der Vorlage auf. „— nicht verwendet —“ lässt eine Eingabe unzugeordnet. | Nicht verwendet |
| Antwort und Bedeutung auf der Karte | Tabelle, eine Zeile je Antwort | Pflicht für jede zugeordnete Auswahlfrage | Legt fest, was jede Antwort auf der Karte bedeutet. Mindestens eine Antwort muss eine Bedeutung haben. | Ignorieren |
| Auswahl der Rasterspalten | Eine Auswahlliste je Rasterspalte | Pflicht für Raster-Eingaben | Entsprechen den Spalten des Rasters (Lokalisation, % Beteiligung, Grade Group und so weiter). | Nicht verwendet |
| Allgemeine Randfragen | Auswahllisten für den Randstatus und die befallenen Ränder, je Komponente | Pflicht für Randkarten | Die eigenen Randfragen des Formulars folgen denen der Karte und sind gesperrt, sodass beide nicht voneinander abweichen können. Eine Frage kann nur eine Randrolle erfüllen. | Nicht verwendet |
| Speichern | Schaltfläche | Entfällt | Speichert die Zuordnung. | Entfällt |
| Zuordnung Ihres Labors entfernen | Schaltfläche | Entfällt | Entfernt die Zuordnung. | Entfällt |
| Neu beginnen | Schaltfläche | Entfällt | Setzt den Entwurf zurück. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Farben, Muster und Schwellenwerte ändern: `config:organ-map-scheme:manage`. Zuordnungen ändern: `config:organ-map-bindings:manage`. Beide sind hohes Risiko und protokolliert. Admin, Laborleiter und Superadmin besitzen beide standardmäßig. Ohne sie sind die Schaltflächen deaktiviert.

**Bekannte Grenzen.** Die Einstellungen werden im Browser gehalten, und die Fallwerte im Falldatensatz. Der API-Vertrag (`docs/architecture/ORGAN_MAPPING_API.md`) ist eine Spezifikation: Die Server-Endpunkte sind noch nicht gebaut, weshalb der Status Demonstration lautet. Eine Zuordnung, die gespeichert wurde, bevor Ränder je Komponente gemeldet wurden, wird nicht mehr berechnet und fordert Sie auf, jede Randfrage erneut zuzuweisen.

### Markierungen {#screen-flags}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Markierungen

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Markierungen (Seitentitel „Fall- und Probenkennzeichen“)

**3. Geschäftlicher Zweck und Umfang.** Eine Kennzeichnung ist eine Beschriftung, die auf einen Fall oder auf eine einzelne Probe gesetzt wird, etwa STAT, Maligne oder Vertraulich, mit einem Schweregrad von 1 bis 5 und einem Symbol. Eine Kennzeichnung kann auch den Druck des Fallbefunds einschränken. Kennzeichnungen werden auch durch Importe aus einem Laborinformationssystem angelegt (angezeigt mit dem Kennzeichen „LIS-Import“).

**4. Voraussetzungen und Abhängigkeiten.** Keine. Das Einschränken des Drucks erfordert später zum Drucken die Berechtigung `report:restricted-case:print`, die auf dem Bildschirm [Rollen](#screen-staff-roles) festgelegt wird. Kennzeichnungen, die automatisch aus einem LIS-Import angelegt werden, erscheinen in einem Banner mit einer Schaltfläche **Prüfen**, bis jemand sie überprüft hat.

Setup step: Tier 2, step 11
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-flags - Liste der Fall- und Probenkennzeichen mit Filtern und Kennzeichnung hinzufügen]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | | Leer |
| Statusfilter | Auswahl | Optional | | Alle |
| Ebenenfilter | Auswahl: Fall, Probe | Optional | | Alle |
| Spalten | Name (mit einem Kennzeichen „LIS-Import“), Ebene, LIS-Code, Schweregrad, Status, Aktionen | Entfällt | | Entfällt |
| Banner für automatisch angelegte Einträge und Prüfen | Banner und Schaltfläche | Entfällt | Filtert die Liste auf die aus Importen angelegten Kennzeichnungen. **Filter zurücksetzen** entfernt den Filter. | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | | Keiner |
| Beschreibung | Freitext | Optional | | Leer |
| Ebene | Auswahl: Fall, Probe | Pflicht | Wo die Kennzeichnung angewendet werden kann. | Fall |
| Schweregrad | Auswahl: 1 Informativ, 2 Niedrig, 3 Mittel, 4 Hoch, 5 Kritisch | Pflicht | | 1 |
| LIS-Code | Text | Optional | Ordnet die Kennzeichnung beim Import einem LIS-Code zu. | Leer |
| Symbol | Auswahl: ihc, fish, molecular, flow-cytometry, cytogenetics, micro, coag, generic-lab | Pflicht | | generic-lab |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |
| Druck einschränken | Kontrollkästchen | Optional | Nur auf Fallebene. Verhindert, dass der Befund von Personen gedruckt wird, die die Berechtigung `report:restricted-case:print` nicht besitzen. | Aus |

Jedes Speichern fragt zuerst „Möchten Sie diese Änderungen wirklich übernehmen?“.

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:case-flags:manage` (hohes Risiko). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Das Speichern schreibt die Prüfereignisse `CONFIG_FLAG_CREATED`, `CONFIG_FLAG_UPDATED` (nur bei Änderungen von Name, Beschreibung und LIS-Code) und `CONFIG_FLAG_DEACTIVATED`.

**Bekannte Grenzen.** Eine gespeicherte Eigenschaft (`tagClass`) stammt noch aus einem früheren Entwurf und wird nicht verwendet. Vorbelegte Kennzeichnungen sind unter anderem STAT, Malignant und Confidential - Restricted Printing.

### Anlagenstandort-Wörterbuch {#screen-asset_locations}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Anlagenstandort-Wörterbuch

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Anlagenstandort-Wörterbuch

**3. Geschäftlicher Zweck und Umfang.** Die verwaltete Liste der physischen Standorte (Gebäude, Räume, Lagereinheiten, Lagerplätze, Arbeitsplätze, Archivregale), gegen die der Standortverlauf eines Materials geprüft wird. Ein am Arbeitsplatz eingegebener Standort, der hier zu nichts passt, erzeugt einen nicht verifizierten Eintrag. Der Reiter **Leichenhaus-Lagerbelegung** zeigt, welche Lagerplätze des Leichenhauses derzeit eine Obduktionsprobe enthalten.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Der Belegungsreiter führt nur Standorte des Typs Lagerplatz auf; legen Sie daher zuerst mindestens einen hier an. Ohne einen solchen zeigt der Belegungsreiter „Noch keine echten storage_slot-Standorte definiert — fügen Sie einen im Verzeichnis-Tab hinzu.“.

Setup step: Tier 2, step 12
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-asset_locations - Liste des Anlagenstandort-Wörterbuchs]

**6. Feldreferenz.**

#### Reiter Verzeichnis

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Ordnet nach Name oder Beschreibung zu. | Leer |
| Spalten | Name, Typ, Übergeordnet, Status, Aktionen | Entfällt | Eine Zeile Nicht verifiziert zeigt einen Hinweis „automatisch erstellt“. | Entfällt |
| + Standort hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Verifizieren | Schaltfläche in der Zeile | Entfällt | Wird für Zeilen mit dem Status Nicht verifiziert angezeigt. | Entfällt |
| Bearbeiten | Schaltfläche in der Zeile | Entfällt | | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Zum Beispiel Leichenhaus-Kühlzelle 1 - Ablage A. | Keiner |
| Standorttyp | Auswahl: Gebäude, Raum, Lagereinheit, Lagerplatz, Arbeitsplatz, Archivregal, Andere | Pflicht | Nur Lagerplatz erscheint im Belegungsreiter. | Lagerplatz |
| Übergeordneter Standort | Auswahlliste anderer Standorte | Optional | | Keiner |
| Beschreibung | Freitext | Optional | | Leer |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |

#### Reiter Leichenhaus-Lagerbelegung

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Lagerplatz | Text | Entfällt | Jeder Standort des Typs Lagerplatz. | Entfällt |
| Status | Text | Entfällt | Belegt oder Verfügbar, ermittelt aus dem Standortverlauf der Proben von Obduktionsfällen, die Sie sehen können. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, verifizieren: `config:asset-locations:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Die Belegungsansicht liest die Fälle, die Ihr eigener Zugriff erlaubt; daher können zwei Personen unterschiedliche Ergebnisse sehen. Vorbelegte Standorte sind unter anderem Grossing Station 3, Archive Shelf 12B, Histology Bench 2 (nicht verifiziert) und zwei Lagerplätze des Leichenhauses.
### Kühlkette {#screen-cold_chain}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Kühlkette

**Status:** Teilweise

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Kühlkette

**3. Geschäftlicher Zweck und Umfang.** Legt die Temperaturbereiche (Bedingungstypen) und die Kühlschränke und Gefrierschränke (Lagereinheiten) fest, deren Messungen überwacht werden, und führt die intelligenten Behälter auf. Eine Messung außerhalb des Bereichs einer Einheit ist eine Abweichung: Die Charge in einem intelligenten Behälter wird gesperrt, und für die CAPA-Prüfung wird ein Mangel „Cold-Chain Excursion“ angelegt.

**4. Voraussetzungen und Abhängigkeiten.** Eine Lagereinheit benötigt einen Bedingungstyp; legen Sie daher zuerst die Typen an. Es gibt zwei eingebaute Typen (Frozen Tissue, Fresh Tissue). Der Mangel, der durch eine Abweichung angelegt wird, verwendet den eingebauten Typ Cold-Chain Excursion unter [Präparatmängel](#screen-deficiencies). Intelligente Behälter werden an anderer Stelle registriert (im Hardware-Behälterregister) und erscheinen hier nur lesend.

Setup step: Tier 2, step 13
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-cold_chain - Kühlkette mit den Reitern Lagereinheiten, Bedingungstypen und Intelligente Behälter]

**6. Feldreferenz.**

#### Reiter Lagereinheiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Name, Bedingungstyp, Status, Aktionen | Entfällt | | Entfällt |
| + Lagereinheit hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Messungen | Schaltfläche in der Zeile | Entfällt | Öffnet die letzte Messung, die Anzahl der Messungen und Abweichungen, eine Tabelle der Messungen und das Bedienelement **Simulierte Messung senden**. | Entfällt |
| Bearbeiten, Deaktivieren, Reaktivieren | Schaltflächen in der Zeile | Entfällt | | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten einer Lagereinheit

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | | Keiner |
| Bedingungstyp | Auswahlliste der aktiven Bedingungstypen | Pflicht | Der Bereich, gegen den die Messungen der Einheit geprüft werden. | Erster aktiver Typ |
| Aktiv | Kontrollkästchen | Optional | | An |

#### Reiter Bedingungstypen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Name, Zulässiger Bereich, Status, Aktionen | Entfällt | Eingebaute Typen sind mit „Integriert“ gekennzeichnet. | Entfällt |
| Entfernen | Schaltfläche in der Zeile | Entfällt | Fordert eine Bestätigung an. Wird für eingebaute Typen nicht angeboten. | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten eines Bedingungstyps

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | | Keiner |
| Höchstwert (°C) | Zahl | Pflicht | Eine Messung darüber ist eine Abweichung. | Keiner |
| Tiefstwert (°C, optional) | Zahl unter dem Höchstwert | Optional | Leer lassen, wenn nur ein Höchstwert zählt, etwa bei einem Gefrierschrank. | Leer |
| Aktiv | Kontrollkästchen | Optional | | An |

#### Reiter Intelligente Behälter

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Behälter, Bedingungstyp, Aktuelle Charge, Aktionen | Schreibgeschützte Spalten | Entfällt | Es werden nur Behälter aufgeführt, die als intelligente Behälter gekennzeichnet sind. **Messungen** öffnet dasselbe Messungsfenster. | Entfällt |

#### Bedienelement Simulierte Messung senden

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Temperatur (°C) | Zahl | Pflicht | Wird durch dieselbe Verarbeitung gesendet wie die Messung eines Sensors, gekennzeichnet als Simuliert, mit „Simulated“ im Prüfpfad. | Keine |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren, entfernen: `config:cold-chain:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Das Senden einer simulierten Messung wird gesondert geprüft: Wer keine Berechtigung hat, sieht „Sie dürfen keine simulierte Messung senden.“

**Bekannte Grenzen.** Es ist kein Sensor-Feed angeschlossen. Jede Messung stammt aus dem Bedienelement Simuliert und ist überall als Simuliert gekennzeichnet. Deshalb lautet der Status Teilweise: Die Wörterbücher für Einheiten und Typen sind gebaut, die Live-Messungen nicht. Vorbelegte Typen sind Frozen Tissue (höchstens -20 °C) und Fresh Tissue (höchstens 8 °C).

### Forschungsfälle und Chargenzwecke {#screen-research_cases}
Breadcrumb: Start > Konfiguration > System > Labormaterialien und Arbeitsabläufe > Forschungsfälle und Chargenzwecke

**Status:** Teilweise

**1. Navigation:** Konfigurationsregister **System** > Gruppe **Labormaterialien und Arbeitsabläufe**
**2. Pflegeelement:** Forschungsfälle und Chargenzwecke

**3. Geschäftszweck und Umfang.** Zwei Einstellungen für Arbeit, die keine Routineversorgung ist.

*Forschungsfälle.* Bis Forschungsobjekte ohne Eingangsnummer unterstützt werden, wird eine Forschungsprobe als Fall eines fiktiven Forschungspatienten erfasst. Diese Karte legt fest, wie PathScribe diese Fälle erkennt: am Präfix der Eingangsnummer (z. B. `RES`) oder am Präfix der Patientennummer des Forschungspatienten (z. B. `RSCH-`). Ein Forschungsfall wird dann:

- nicht in den klinischen Arbeitslisten gezeigt (Kacheln und Listen; über die Fallsuche auffindbar);
- bei Durchlaufzeit-, Mengen- und Qualitätszahlen der Contribution-Dashboards nicht mitgezählt;
- nie als Ergebnis an die Patientenakte gesendet (endgültig, vorläufig, geändert oder Zytologie) und nie per Fax oder Dateiablage zugestellt; das Prüfprotokoll vermerkt jedes nicht gesendete Ergebnis mit Grund;
- nie an die Abrechnung gesendet: seine Leistungen werden an der Abrechnungswarteschlange abgewiesen, und seine Kostenträgermeldung trägt die **Kostenträgerklasse ohne Abrechnung** ohne Versicherungsschutz;
- nie an ein Krebs- oder Screeningregister gemeldet;
- für die **Tage** ab Eingang aufbewahrt und danach in der Entsorgungsliste geführt. Aufbewahrungssperren gelten weiter.

*Chargenzwecke.* Wofür ein Träger verwendet wird. Sechs sind eingebaut: Routine, Forschung, Lehre, Klinische Studie, Biobank, QS / Validierung. Sie lassen sich ausschalten, aber nicht entfernen; Routine ist immer aktiv. Fügen Sie eigene Zwecke des Labors hinzu. Ein neuer Träger ist Routine, sofern in **Neuer Container** nichts anderes gewählt wird. Ein anderer Zweck erscheint auf der Chargendetailseite, und jedes [Anzeigeprofil](#screen-display_profiles) kann nur bestimmte Zwecke zeigen.

**4. Voraussetzungen und Abhängigkeiten.** Keine für die Einstellungen. Für die Forschungslösung den fiktiven Forschungspatienten anlegen (Patientennummer mit dem Präfix) und gegebenenfalls ein Nummernformat mit dem Forschungspräfix.

Setup step: Tier 2, step 33
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-research_cases - Karten Forschungsfälle und Chargenzwecke]

**6. Feldreferenz.**

#### Karte Forschungsfälle

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Passende Fälle als Forschungsfälle behandeln | Kontrollkästchen | Optional | Aus: kein Fall ist ein Forschungsfall. | Ein |
| Präfixe der Eingangsnummer | Text, durch Kommas getrennt | Pflicht, wenn ein (dies oder die Patientennummer-Präfixe) | Passt, wenn das Präfix des Falls gleich ist oder seine vollständige Nummer damit beginnt. Ohne Leerzeichen; höchstens 20 Zeichen. | RES |
| Präfixe der Patientennummer (MRN) des Forschungspatienten | Text, durch Kommas getrennt | Pflicht, wenn ein (dies oder die Eingangsnummer-Präfixe) | Passt, wenn die Patientennummer damit beginnt. | RSCH- |
| Kostenträgerklasse ohne Abrechnung | Text | Pflicht, wenn ein | Wird als Abrechnungsart des Kontos in der Kostenträgermeldung gesendet. | Research - No Charge |
| Material aufbewahren (Tage nach Eingang) | Ganze Zahl, 0 bis 36500 | Pflicht | Ab wann Blöcke und Objektträger des Falls zur Entsorgung gelistet werden. | 365 |
| Speichern | Schaltfläche | Nicht zutreffend | Ohne die unten genannte Berechtigung oder bei ungültigen Werten abgewiesen. | Nicht zutreffend |

#### Karte Chargenzwecke

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Zweckzeilen | Name und Kontrollkästchen Aktiv | Nicht zutreffend | Eingebaute Namen erscheinen in der Sprache des Lesers. Der Name eines Laborzwecks wird direkt bearbeitet (eindeutig, höchstens 40 Zeichen). Routine lässt sich nicht abwählen. | Sechs eingebaute Zwecke, alle aktiv |
| Neuer Zweck, Hinzufügen | Text und Schaltfläche | Optional | Fügt einen Laborzweck hinzu. | Leer |
| Speichern | Schaltfläche | Nicht zutreffend | Ohne die unten genannte Berechtigung oder bei leerem, zu langem oder doppeltem Namen abgewiesen. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Forschungsfälle speichern: `config:research-cases:manage`. Chargenzwecke speichern: `config:batch-purposes:manage`. Hohes Risiko; standardmäßig Admin, Laborleitung und Superadmin.

**Bekannte Grenzen.** Der Befundbildschirm kennzeichnet einen Forschungsfall noch nicht als „Forschung, kein klinischer Befund“; er kann freigegeben werden (nichts wird gesendet). Es gibt keine Forschungsarbeitsliste. Qualitätszahlen außerhalb der Contribution-Dashboards und der BI-Feed auf dem Server sind noch nicht gefiltert. Forschungsobjekte ohne Eingangsnummer folgen später.

### Präparatmängel {#screen-deficiencies}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Präparatmängel

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Integrationen**
**2. Wartungspunkt:** Präparatmängel (zwei Reiter: Mangelarten und Lösungsarten)

**3. Geschäftlicher Zweck und Umfang.** Ein Mangel ist ein erfasstes Problem mit einer Probe oder einem Fall (ein beschädigter Behälter, eine Etikettenabweichung, ein fehlender Auftragsschein). Eine Lösungsart gibt an, wie er behoben wurde. Dieser Bildschirm enthält beide Listen. Einige Mangelarten werden vom System selbst über ihre feste ID angelegt, zum Beispiel Cold-Chain Excursion, Tissue Discrepancy und Block Lost.

**4. Voraussetzungen und Abhängigkeiten.** Die Auswahlliste Durchführendes Labor verwendet die durchführenden Labore aus dem [Einrichtungsverzeichnis](#screen-facility-dictionary). Bleibt sie auf Global, gilt die Option für jedes Labor, sodass die Einrichtungsliste nicht erforderlich ist.

Setup step: Tier 2, step 14
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-deficiencies - Präparatmängel mit den Reitern Mangelarten und Lösungsarten]

**6. Feldreferenz.**

#### Beide Reiter

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Laborfilter | Auswahl: Alle Labore, Nur global oder ein durchführendes Labor | Optional | Wird angezeigt, wenn durchführende Labore vorhanden sind. | Alle Labore |
| Spalten | Mangelart oder Lösungsart, Beschreibung, Ebene (nur im Reiter Mangelarten), Durchführendes Labor, Status, Aktionen | Entfällt | | Entfällt |
| + Mangelart hinzufügen, + Lösungsart hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Bearbeiten, Deaktivieren, Aktivieren | Schaltflächen in der Zeile | Entfällt | Es gibt kein Löschen. | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Eindeutig innerhalb des durchführenden Labors oder innerhalb von Global. Eine Wiederholung wird mit „existiert bereits“ abgelehnt. | Keiner |
| Beschreibung | Freitext | Optional | Wird als Hinweis angezeigt, wenn jemand die Option auswählt. | Leer |
| Ebene | Auswahl: Probe, Fall/Auftrag, Beide | Pflicht | Nur im Reiter Mangelarten. Probe gilt für eine einzelne Probe (Behälterschaden). Fall/Auftrag betrifft den gesamten Fall (fehlende Unterlagen). | Beide |
| Durchführendes Labor | Auswahlliste: Global oder ein durchführendes Labor | Optional | Global bedeutet jedes durchführende Labor. | Global |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:deficiency-types:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig.

**Bekannte Grenzen.** Neunundzwanzig Mangelarten und zwölf Lösungsarten sind vorbelegt. Das Deaktivieren einer Art, die das System über ihre feste ID anlegt, wird nicht blockiert, und dieses Handbuch hat nicht geprüft, was das System dann tut. Dieser Bildschirm hat keine reine Leseansicht.

## Teil C: Konfigurationen für Behälter-, Kassetten- und Objektträgertypen {#ch3-container-cassette}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe

Dieser Teil enthält die Behälter, in denen eine Probe eintrifft, die Kassettenfarben und die Regeln, die eine Farbe auswählen, sowie die Tuschefarben, die an den Rändern verwendet werden.

**Es gibt keinen Bildschirm für Objektträgertypen.** PathScribe hat kein Wörterbuch der Objektträgertypen und nirgends in der Konfiguration eine Auswahlliste für Objektträgertypen. Vorhanden sind die Anzahl **Objektträger** bei jedem Schritt eines Eintrags im [Protokollwörterbuch](#screen-protocols) (wie viele Objektträger ein Schritt schneidet), die **Schnittprotokolle** und **Schnellbestellungs-Makros** im [Diagnosekatalog](#screen-stains) (Ebenen und Serienschnitte) sowie das Etikettenlayout im [Etikettendesigner](#screen-label_designer). Der Kassettentyp, also das physische Format des Blocks, stammt aus dem **Bearbeitungsformat** des Protokolls, nicht aus einem Bildschirm in diesem Teil.

### Behältertypen {#screen-container_types}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Behältertypen

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Behältertypen (Seitentitel „Behältertyp-Verzeichnis“)

**3. Geschäftlicher Zweck und Umfang.** Die Liste der Behälterklassifikationen, die beim Probeneingang verwendet werden: ein vorgefülltes 20-mL-Formalingefäß, ein trockenes 60-mL-Gefäß, ein 1-Liter-Eimer, ein Röhrchen für die flüssigkeitsbasierte Zytologie, ein Röhrchen mit RPMI-Medium. Jeder Eintrag hat eine Kategorie, ein optionales Fassungsvermögen, ein optionales Standardfixativ und eine Markierung, ob er vorgefüllt geliefert wird. Die Liste wird auf der Seite des Probeneingangs und im Bearbeitungsfenster der Probe ausgewählt.

**4. Voraussetzungen und Abhängigkeiten.** Die Auswahlliste Standard-Fixativ liest das Fixativwörterbuch. Dieses Wörterbuch ist vorbelegt (fünfzehn Fixative und Medien) und hat keinen eigenen Wartungsbildschirm; es muss daher nichts zuvor eingerichtet werden. Durchführendes Labor verwendet die durchführenden Labore aus dem [Einrichtungsverzeichnis](#screen-facility-dictionary); lassen Sie es auf Alle Labore, um diese Abhängigkeit zu vermeiden.

Setup step: Tier 2, step 9
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-container_types - Liste des Behältertyp-Verzeichnisses mit Filtern]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Name oder Beschreibung. | Leer |
| Statusfilter | Auswahl: Alle, Aktiv, Inaktiv | Optional | | Alle |
| Laborfilter | Auswahl: Alle Labore, Nur global (kein Labor festgelegt) oder ein Labor | Optional | | Alle Labore |
| Spalten | Behältertyp, Kategorie, APLIS-Zuordnung, Durchführendes Labor, Status, Aktionen | Entfällt | | Entfällt |
| + Behältertyp hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Bearbeiten, Deaktivieren, Reaktivieren | Schaltflächen in der Zeile | Entfällt | Es gibt kein Löschen. | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Eindeutig innerhalb des durchführenden Labors oder innerhalb von Alle Labore. | Keiner |
| Beschreibung | Freitext | Optional | Fachbegriffe vom Arbeitsplatz, Markennamen oder örtliche Gepflogenheiten. | Leer |
| Kategorie | Auswahl: Histologie (Biopsien und Resektate), Zytologie (Flüssigkeiten und Ausstriche), Spezialmedium (ergänzende Untersuchungen) | Pflicht | | Histologie |
| APLIS-Zuordnung | Text | Optional | Für welchen Probentyp der Behälter typischerweise verwendet wird. Zwei Behälter können innerhalb eines Labors nicht dieselbe Zuordnung tragen. | Leer |
| Kapazität (mL) | Zahl | Optional | Leer lassen, wenn die Kapazität schwankt oder nicht aussagekräftig ist. | Leer |
| Standard-Fixativ | Auswahlliste der aktiven Fixative | Optional | „Keines (trocken / am Arbeitsplatz befüllt)“ für einen trockenen Behälter. | Keines |
| Vorgefüllt | Schalter Ja/Nein | Optional | Ja: wird mit dem oben genannten Fixativ vorgefüllt geliefert. Nein: wird am Arbeitsplatz oder von der entnehmenden Person befüllt. | Nein |
| Durchführendes Labor | Auswahlliste: Alle Labore oder ein durchführendes Labor | Optional | | Alle Labore |
| Systemlogik-Notizen | Freitext | Optional | Dokumentation des beabsichtigten Verhaltens. Sie bewirkt heute nichts. | Leer |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:container-types:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Systemlogik-Notizen sind nur Dokumentation: Nichts löst aufgrund einer Behälterwahl eine STAT-Meldung, einen Fixierzeit-Timer oder einen Abrechnungsmodifikator aus. Die Fixativliste kann auf keinem Bildschirm bearbeitet werden. Die vorbelegte Liste ist größer als die „9 standard defaults“, die der Untertitel der Seite nennt.

### Kassettenfarben {#screen-cassette_colors}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Kassettenfarben

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Kassettenfarben

**3. Geschäftlicher Zweck und Umfang.** Das Wörterbuch der Kassettenfarben. Die [Kassetten-Routingregeln](#screen-cassette_routing_rules) verweisen über dieses Wörterbuch auf eine Farbe; das Umbenennen eines Anzeigenamens hier aktualisiert daher jede Regel. Jede Farbe trägt außerdem ihre eigene Ausweichrichtlinie: was zu tun ist, wenn der Trichter für diese Farbe nicht verfügbar ist, entweder automatisch eine andere Farbe einzusetzen oder den Techniker zu benachrichtigen.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Die Auswahlliste Ersetzen durch führt die anderen Farben auf; eine Farbe zum Ersetzen muss daher zuerst vorhanden sein.

Setup step: Tier 2, step 16
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: [Kassetten-Routingregeln](#screen-cassette_routing_rules)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-cassette_colors - Liste der Kassettenfarben]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Laborfilter | Auswahl: Alle Labore, Nur global (kein Labor festgelegt) oder ein Labor | Optional | | Alle Labore |
| Spalten | Farbe, Schlüssel, Durchführendes Labor, Ausweichrichtlinie, Status, Aktionen | Entfällt | Die Ausweichregel wird als „Auto → Name“ oder „Techniker benachrichtigen“ angezeigt. | Entfällt |
| + Farbe hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Bearbeiten, Deaktivieren, Reaktivieren | Schaltflächen in der Zeile | Entfällt | | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Schlüssel | Text, in Großbuchstaben umgewandelt, Leerzeichen werden zu Unterstrichen | Pflicht | Der stabile Schlüssel, der an die Gravurengine gesendet wird. Ein späteres Umbenennen des Anzeigenamens beschädigt ihn nie. Eindeutig innerhalb des durchführenden Labors oder innerhalb von Alle Labore. | Keiner |
| Anzeigename | Text | Pflicht | Eindeutig innerhalb des durchführenden Labors oder innerhalb von Alle Labore. | Keiner |
| Hex-Code | Farbwähler und Text, 6-stelliger Hexwert wie `#3B82F6` | Pflicht | Wird abgelehnt, wenn er kein echter 6-stelliger Hexcode ist. | Keiner |
| Wenn der Trichter dieser Farbe nicht verfügbar ist | Auswahl: Automatisch ersetzen, Techniker benachrichtigen | Pflicht | | Techniker benachrichtigen |
| Ersetzen durch | Auswahlliste der anderen Farben | Pflicht bei Automatisch ersetzen | Die Farbe, die stattdessen verwendet wird. | Keine |
| Durchführendes Labor | Auswahlliste: Alle Labore oder ein durchführendes Labor | Optional | | Alle Labore |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:cassette-colors:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** PathScribe entscheidet, welche logische Farbe eine Kassette erhält. Trichternummern oder physische Fächer bildet es nicht ab. Vorbelegte Farben sind White, Blue, Red, Pink, Green / Mesh und Yellow. White ist mit Techniker benachrichtigen vorbelegt, als Anker, auf den die anderen zurückfallen.

### Kassetten-Routingregeln {#screen-cassette_routing_rules}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Kassetten-Routingregeln

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Kassetten-Routingregeln

**3. Geschäftlicher Zweck und Umfang.** Legt fest, welche Kassettenfarbe ein Block erhält, anhand von Protokoll, Auftragspriorität, Ursprungsstation, auftraggebender Einrichtung und Falltyp. Jede Bedingung, die Sie festlegen, muss zutreffen. Eine nicht festgelegte Bedingung trifft auf alles zu; eine Regel ohne Bedingungen ist daher eine Auffangregel. Treffen mehrere Regeln zu, gewinnt das höchste Prioritätsgewicht, und bei Gleichstand gewinnt die früher angelegte Regel. Eine Regel wird außerhalb ihrer Daten Gültig ab und Gültig bis ignoriert. Der Kassettentyp (das Format) wird hier nie festgelegt: Er stammt aus dem Bearbeitungsformat des zutreffenden Protokolls.

**4. Voraussetzungen und Abhängigkeiten.** Die Protokollauswahl liest das [Protokollwörterbuch](#screen-protocols), die Farbauswahl liest die [Kassettenfarben](#screen-cassette_colors), die Auswahl der Ursprungsstation liest die [Scanstationen](#screen-scan_stations) und die Auswahl der auftraggebenden Einrichtung liest das [Einrichtungsverzeichnis](#screen-facility-dictionary). Werden die Farben übersprungen, ist die Liste Kassettenfarbe leer, und keine Regel kann gespeichert werden.

Setup step: Tier 2, step 17
Requires: [Protokollwörterbuch](#screen-protocols), [Kassettenfarben](#screen-cassette_colors), [Scanstationen](#screen-scan_stations), [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-cassette_routing_rules - Liste der Kassetten-Routingregeln nach Gewicht geordnet]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Gewicht, Regel, Bedingungen, Farbe, Status, Aktionen | Entfällt | Nach Gewicht sortiert, das höchste zuerst. Die Bedingungen lauten „Protokoll: Name“, „Priorität: Liste“, „Station: Name“, „Einrichtung: Name“, „Falltyp: Typ“ oder „Beliebig (Auffangregel)“. | Entfällt |
| + Regel hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Bearbeiten, Duplizieren, Deaktivieren, Reaktivieren | Schaltflächen in der Zeile | Entfällt | Duplizieren öffnet eine Kopie mit dem Namen „Name (Kopie)“. | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Regelname | Text | Pflicht | | Keiner |
| Beschreibung | Freitext | Optional | | Leer |
| Protokoll | Auswahlliste: „Beliebiges Protokoll“ oder ein Protokoll | Optional | | Beliebiges Protokoll |
| Auftragspriorität | Kontrollkästchen: Routine, Eilig, STAT | Optional | Mehr als eines angekreuzt bedeutet: eines davon. | Keine angekreuzt |
| Ursprungsstation | Auswahlliste: „Jede Station“ oder eine Scanstation | Optional | | Jede Station |
| Auftraggebende Einrichtung | Auswahlliste: „Jede Einrichtung“ oder eine Einrichtung | Optional | | Jede Einrichtung |
| Falltyp | Text | Optional | Freitext, zum Beispiel Konsil oder Referenzlabor. Er muss genau mit dem Falltyp des Falls übereinstimmen. | Leer |
| Kassettenfarbe | Auswahlliste der Farben | Pflicht | Eine inaktive Farbe wird mit „(inaktiv)“ angezeigt. | Keine |
| Druckvorlagenschlüssel | Text | Optional | Ein loser Schlüssel für ein Drucklayout. | Leer |
| Prioritätsgewicht | Ganze Zahl, 1 bis 100 | Pflicht | Das höhere gewinnt, wenn mehrere Regeln zutreffen. | 10 |
| Gültig ab | Datum | Optional | | Leer |
| Gültig bis | Datum | Optional | | Leer |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, duplizieren, deaktivieren: `config:cassette-routing:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Eine Regel kann auch prüfen, ob eine Zytologieprobe ein Zellblock oder Restflüssigkeit ist (eine Dekantierbedingung), und die vorbelegte Regel Cell Block verwendet dies, aber in diesem Fenster gibt es dafür kein Feld; Sie können es daher bei einer neuen Regel nicht festlegen. Acht Regeln sind vorbelegt, darunter STAT Override, Cell Block, Renal Protocol und vier Regeln für kleine Biopsien.
### Tuschefarben {#screen-ink_colors}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Tuschefarben

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Tuschefarben

**3. Geschäftlicher Zweck und Umfang.** Das Farbwörterbuch, gegen das das Auftragen von Randtusche bei der Befundfreigabe geprüft wird und aus dem die Rand- und Tuschierformulare des Zuschnittbildschirms ihre Auswahl treffen.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Wird es übersprungen, ist die Tuscheauswahl im Zuschnitt leer, und die Tuschierprüfung bei der Befundfreigabe hat nichts, wogegen sie prüfen kann. Wie streng diese Prüfung ist (nur warnen oder strikt durchsetzen, standardmäßig nur warnen), wird je Einrichtung auf einem gesonderten Bildschirm festgelegt, dem Tuschierungs-Validierungsmodus.

Setup step: Tier 2, step 18
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-ink_colors - Liste der Tuschefarben]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Farbe, Code, Status, Aktionen | Entfällt | | Entfällt |
| + Farbe hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Bearbeiten, Deaktivieren, Reaktivieren | Schaltflächen in der Zeile | Entfällt | | Entfällt |
| Name | Text | Pflicht | Eindeutig in der gesamten Liste. | Keiner |
| Code | Text, etwa `#0000FF` | Pflicht | Der Code, der bei der Befundfreigabe geprüft wird. Eindeutig in der gesamten Liste. | Keiner |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:ink-color:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Vorbelegte Farben sind Black, Blue, Green, Yellow, Orange, Red und Violet. Das Codefeld ist Freitext; der Bildschirm zeigt nur dann ein Farbmuster, wenn der Wert ein 6-stelliger Hexcode ist.

## Teil D: Stammdaten für Verarbeitungsprotokolle, Färbungen, Antikörper und Spezialfärbungen {#ch3-stains-protocols}
Breadcrumb: Startseite > Konfiguration > System

Dieser Teil enthält die Hauptlisten für alles, was nach dem Zuschnitt mit einer Probe geschieht: die Färbungen, Antikörper und molekularen Untersuchungen, die Chargen der verwendeten Reagenzien und die Verarbeitungsprotokolle.

**Wo Antikörper und Spezialfärbungen stehen.** PathScribe hat keinen eigenen Bildschirm für Antikörper und keinen eigenen Bildschirm für Spezialfärbungen. Beide sind Einträge im [Diagnosekatalog](#screen-stains) (dem Färbungswörterbuch) und werden über die **Kategorie** unterschieden: Ein Antikörper ist ein Eintrag mit der Kategorie **IHC** (oder **Immunfluoreszenz**), der einen **Antikörperklon** und einen **Anbieter** trägt, und eine Spezialfärbung ist ein Eintrag mit der Kategorie **Spezialfärbung**. Chargen von Antikörpern und Spezialfärbungssets werden unter [Reagenz- & Lösungschargen](#screen-reagent_lots) nachverfolgt.

### Diagnosekatalog {#screen-stains}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Diagnosekatalog

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Diagnosekatalog (das Färbungswörterbuch). Er hat vier Reiter: Diagnostische Assays, Schnittprotokolle, Schnellbestellungs-Makros und Master-Ziele.

**3. Geschäftlicher Zweck und Umfang.** Ein Katalog für Färbungen (Routine, Spezial, Immunhistochemie, Immunfluoreszenz, Zytologie), molekulare Untersuchungen (FISH, PCR, NGS) und andere Untersuchungen. Ein **Diagnostischer Assay** ist das, was angefordert wird. Ein **Schnittprotokoll** legt fest, wie der Block geschnitten wird (zum Beispiel Stufe x 3). Die beiden sind absichtlich getrennt. Ein **Schnellbestellungs-Makro** fasst von jedem eines in einer einzigen Bestellvorgabe zusammen. **Master-Ziele** ist die Liste der Sonden, Gene und Mutationsregionen, aus denen molekulare Untersuchungen aufgebaut werden.

**4. Voraussetzungen und Abhängigkeiten.** Die molekularen Felder wählen durchführende Labore und Referenzlabore aus dem [Einrichtungsverzeichnis](#screen-facility-dictionary). Referenzlabore benötigen die Rolle Referenzlabor. Abrechnungscodes werden als Abrechnungscode eines Eintrags im Abrechnungswörterbuch eingegeben, nie als roher CPT-Code, und das Abrechnungswörterbuch wird erst später eingerichtet (Stufe 7); ein hier eingegebener Code wird daher beim Speichern nicht geprüft. Wird der Katalog übersprungen, hat das [Protokollwörterbuch](#screen-protocols) keine Färbungen, die es einem Schritt zuordnen kann, und für [Reagenz- & Lösungschargen](#screen-reagent_lots) gibt es keine, denen eine Charge zugeordnet werden kann.

Setup step: Tier 2, step 7
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Protokollwörterbuch](#screen-protocols), [Reagenz- & Lösungschargen](#screen-reagent_lots)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-stains - Diagnosekatalog mit dem Reiter Diagnostische Assays]

**6. Feldreferenz.**

#### Reiter Diagnostische Assays: Liste

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Ordnet nach Name oder Kategorie zu. | Leer |
| Spalten | Name, Kategorie, Klon / Anbieter, Abrechnungscode, Bearbeitungszeit, Status, Aktionen | Entfällt | | Entfällt |
| Exportieren | Schaltfläche | Entfällt | Lädt StainDictionary.csv mit Name, Category, Description, AntibodyClone, Vendor, DefaultTurnaroundHours und Active herunter. Der Export wird im Prüfprotokoll festgehalten. | Entfällt |
| Tabelle importieren | Schaltfläche | Entfällt | Liest eine CSV-Datei mit denselben Spalten ein. Eine Zeile wird einem vorhandenen Eintrag über den Namen zugeordnet, ohne Beachtung der Groß- und Kleinschreibung. Die Vorschau sagt „N neu, M zu aktualisieren“. **Import anwenden** schreibt sie. | Entfällt |
| + Diagnoseprozess hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Bearbeiten, Duplizieren | Schaltflächen in der Zeile | Entfällt | | Entfällt |

#### Fenster Diagnostischer Assay

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Eindeutig im gesamten Katalog. Eine Wiederholung wird abgelehnt. | Keiner |
| Kategorie | Auswahl: Routine, Spezialfärbung, IHC, Immunfluoreszenz, Molekular, Zytologie, Sonstige | Pflicht | Bestimmt, welche der folgenden Felder angezeigt werden. | Routine |
| Beschreibung | Freitext | Optional | | Leer |
| Standard-Abrechnungscode | Text | Optional | Der billingCode eines Eintrags im Abrechnungswörterbuch. Leer lassen, um die generische Regel für IHC oder Spezialfärbungen zu verwenden. | Leer |
| Eigenständige Abrechnungseinheit | Schalter Ja/Nein | Optional | Nur IHC mit einem Abrechnungscode. Aus: Die Färbung zählt weiterhin in der ersten und zusätzlichen IHC-Sequenz der Probe. An: Sie nimmt weder einen Platz in der Sequenz ein noch ändert sie die Zählung. | Aus |
| QK-Durchsetzungsmodus nach dem Lauf | Auswahl: Keine Überschreibung, Erzwungen, Automatisch lösen, Hybrid | Optional | Nur IHC und Spezialfärbung. Überschreibt den Geräte-Standard der Arbeitsplatzgruppe für eine Charge, in der diese Färbung läuft. | Keine Überschreibung |
| Zielkontrollobjektträger erforderlich | Schalter Ja/Nein | Optional | Nur IHC und Spezialfärbung. Erzwingt das QC-Gate bei der Befundfreigabe. | Aus |
| Kontrollobjektträger bei Batch-Erstellung automatisch anhängen | Schalter Ja/Nein | Optional | Wird nur angezeigt, wenn ein Kontrollobjektträger erforderlich ist. | Aus |
| Standard-Kontrollgewebe | Text | Optional | Wird nur angezeigt, wenn ein Kontrollobjektträger erforderlich ist. Füllt die Beschreibung des Kontrollobjektträgers aus. Wird nie geprüft. | Leer |
| Antikörperklon | Text | Optional | Nur IHC und Immunfluoreszenz. | Leer |
| Anbieter | Text | Optional | Nur IHC und Immunfluoreszenz. | Leer |
| Methodik | Auswahl: Anatomische Pathologie FISH, Zytogenetische FISH, Einzelgen-/gezielte PCR, NGS-Panel | Optional | Nur Molekular. | Keine |
| Intern durchgeführt in | Auswahlliste der durchführenden Labore | Optional | Nur Molekular. Eine Zusatzbestellung an einem angekreuzten Labor bietet „intern“ an und beginnt damit, und die Bestellung geht in die Auftragswarteschlange des Molekular-Arbeitsbereichs. Der Fremdversand wird immer angeboten. | Keine angekreuzt |
| Für diesen Test freigegebene Referenzlabore | Auswahlliste der aktiven Referenzlabore | Optional | Nur Molekular. Eine Zusatzbestellung bietet nur diese Labore an. Ist keines angekreuzt, werden alle aktiven Referenzlabore angeboten. | Keine angekreuzt |
| Standardlabor | Auswahlliste der angekreuzten Referenzlabore | Optional | Nur Molekular. Wird bei einer neuen Zusatzbestellung ausgefüllt. | Kein Standard |
| Standardziele | Suchfeld und Liste der Master-Ziele | Optional | Nur Molekular. Wird in jede neue Bestellung kopiert und dort danach frei bearbeitet. Eine Änderung ändert nie eine bestehende Bestellung. Sie können auch ein neues Symbol und ein optionales Detail eingeben und **Zum Master-Wörterbuch hinzufügen** wählen. | Keine |
| Abrechnungsmodell | Auswahl: Basis + Zusatz (mit Multiplex-Schwellenwert), Pro-Einheit-Multiplikator, Pauschale | Pflicht bei Molekular | Bestimmt, welche der nächsten Felder angezeigt werden. Gespeichert werden nur die Felder, die das gewählte Modell verwendet. | Basis + Zusatz |
| Basis-billingCode (1. Ziel) | Text | Optional | Nur Basis + Zusatz. | Leer |
| Zusatz-billingCode (jedes weitere) | Text | Optional | Nur Basis + Zusatz. | Leer |
| Multiplex-billingCode | Text | Optional | Nur Basis + Zusatz. | Leer |
| Multiplex-Schwellenwert | Ganze Zahl | Optional | Nur Basis + Zusatz. | 3 |
| Pro-Einheit-billingCode | Text | Optional | Nur Pro-Einheit-Multiplikator. | Leer |
| Pauschal-billingCode | Text | Optional | Nur Pauschale. | Leer |
| Standard-Bearbeitungszeit (Stunden) | Zahl, 0 oder mehr | Optional | | Leer |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |

#### Reiter Schnittprotokolle

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Name, Beschreibung, Status, Aktionen | Entfällt | | Entfällt |
| + Protokoll hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Name | Text | Pflicht | Eindeutig. Eine Wiederholung wird abgelehnt. | Keiner |
| Beschreibung | Freitext | Optional | Was die Schnittanweisung bedeutet. | Leer |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |

#### Reiter Schnellbestellungs-Makros

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Bezeichnung, Färbungstyp, Schnittprotokoll, Status, Aktionen | Entfällt | | Entfällt |
| + Makro hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Bezeichnung | Text | Pflicht | Zum Beispiel „H&E x 3“. Eindeutig. | Keine |
| Färbungstyp | Auswahlliste der diagnostischen Assays | Pflicht | | Erster Assay |
| Schnittprotokoll | Auswahlliste der Schnittprotokolle | Pflicht | | Erstes Protokoll |
| Sortierreihenfolge | Ganze Zahl | Optional | Wo es in der Liste der Schnellbestellungen steht. | 99 |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |

#### Reiter Master-Ziele

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Symbol, Typ, Detail, Status, Aktionen | Entfällt | | Entfällt |
| + Ziel hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Symbol | Text | Pflicht | Zum Beispiel ERBB2. Eine Wiederholung desselben Symbols und Details wird abgelehnt. | Keines |
| Typ | Auswahl: Sonde (FISH), Gen (NGS), Mutationsregion (PCR) | Pflicht | | Sonde |
| Detail | Text | Optional | Zum Beispiel 17q12 (Locus) oder V600E (Mutation). | Leer |
| Status | Schalter Aktiv / Inaktiv | Optional | Ein inaktives Ziel bleibt in Einträgen, die es bereits verwenden, wird aber bei der Suche nach einem neuen Standardziel nicht angeboten. | Aktiv |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen und bearbeiten in allen vier Reitern: `config:stain-dictionary:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Der CSV-Import und -Export enthalten nur sieben Spalten. Sie enthalten keine Abrechnungs-, QC- oder molekularen Felder, und ein Import prüft den Wert Kategorie nicht gegen die Liste. Der vorbelegte Katalog enthält Routine- und Spezialfärbungen, IHC-Antikörper mit Klonen, Immunfluoreszenz-Marker, Zytologiefärbungen und molekulare Untersuchungen.

### Protokollwörterbuch {#screen-protocols}
Breadcrumb: Startseite > Konfiguration > System > Klinische Nachschlagewerke > Protokollwörterbuch

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Klinische Nachschlagewerke**
**2. Wartungspunkt:** Protokollwörterbuch

**3. Geschäftlicher Zweck und Umfang.** Ein Protokoll ist ein eigenständiger, wiederverwendbarer Verarbeitungsablauf. Es ist nicht an einen Probentyp gebunden: Sie ordnen es über das Feld **Verarbeitungsprotokoll** im [Präparatwörterbuch](#screen-specimens) zu, und eine Bearbeitung hier ändert jeden Probentyp, der es verwendet. Ein Protokoll hat eine oder mehrere **Spuren** (zum Beispiel Lichtmikroskopie, Immunfluoreszenz, Elektronenmikroskopie). Jede Spur hat eine Materialart (Block oder Dekantierung), ein Fixiermittel, ein Bearbeitungsformat und geordnete Schritte. Ein Schritt kann Objektträger schneiden, Färbungen auftragen oder ein Halt sein. Ein Protokoll kann eine Triage am Arbeitsplatz mit einer Checkliste verlangen.

**4. Voraussetzungen und Abhängigkeiten.** Schritte wählen Färbungen aus dem [Diagnosekatalog](#screen-stains). Die Auswahllisten für Fixiermittel und Bearbeitungsformat lesen zwei feste Wörterbücher, die keinen Wartungsbildschirm haben (fünfzehn Fixiermittel und Medien, vier Formate: Standard, Megablock, Frozen Block, Resin Grid). Ein neues Protokoll übernimmt das Standardfixiermittel und das Standardformat und beginnt als Dekantierungsspur, wenn seine Abteilung eine Flüssigkeitsabteilung ist ([Abteilungen](#screen-departments)). Wird der Katalog übersprungen, ist die Färbungsauswahl der Schritte leer.

Setup step: Tier 2, step 8
Requires: [Abteilungen](#screen-departments), [Diagnosekatalog](#screen-stains)
Unlocks: [Präparatwörterbuch](#screen-specimens), [Kassetten-Routingregeln](#screen-cassette_routing_rules)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-protocols - Liste des Protokollwörterbuchs mit Filtern, Export und Import]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Laborfilter | Auswahl: Alle Labore, Nur global (kein Labor festgelegt) oder ein Labor | Optional | | Alle Labore |
| Spalten | Name, Durchführendes Labor, Spuren, Verwendet von, Triage erforderlich, Status, Aktionen | Entfällt | **Verwendet von** zählt die Probentypen, die dem Protokoll zugeordnet sind. | Entfällt |
| Exportieren | Schaltfläche | Entfällt | Lädt die Protokolle herunter, eine Zeile je Schritt. | Entfällt |
| Tabelle importieren | Schaltfläche | Entfällt | Liest eine Datei im Format des Exports ein. Die Vorschau führt nicht zugeordnete Färbungen und ungültige Anzahlen auf. **Import anwenden** schreibt die Protokolle. | Entfällt |
| + Protokoll hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Bearbeiten, Duplizieren | Schaltflächen in der Zeile | Entfällt | Duplizieren öffnet „Protokoll hinzufügen — geklont von Name“. | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text | Pflicht | Eindeutig innerhalb des durchführenden Labors oder innerhalb von Alle Labore. | Keiner |
| Durchführendes Labor | Auswahlliste: Alle Labore oder ein durchführendes Labor | Optional | | Alle Labore |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |
| Beschreibung | Freitext | Optional | Wofür es gedacht ist und welche Probentypen ihm zugeordnet sind. | Leer |
| Triage am Arbeitsplatz erforderlich | Schalter Ja/Nein | Optional | | Nicht erforderlich |
| Triage-Checkliste | Liste von Textschritten | Optional | Wird angezeigt, wenn eine Triage erforderlich ist. Schritt hinzufügen und Entfernen. | Leer |
| Verwendungshinweis | Text | Entfällt | Nennt, welche Probentypen dem Protokoll zugeordnet sind, oder „Derzeit keinem Probentyp zugeordnet“. | Entfällt |
| Verlauf | Liste früherer Versionen | Entfällt | Anzeigen und **Diese Version wiederherstellen** setzen das Protokoll auf eine frühere Version zurück. | Entfällt |

#### Spur (mindestens eine erforderlich)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name der Spur | Text | Pflicht | Zum Beispiel Lichtmikroskopie. | Keiner |
| Materialart | Auswahl: Block (festes Gewebe, Kassette), Dekantierung (Flüssigkeit / Zytologie) | Pflicht | | Block |
| Fixiermittel | Auswahlliste der Fixiermittel | Pflicht | Ein Wert, der nicht im Wörterbuch steht, wird mit „(nicht im Verzeichnis)“ angezeigt. | Das Standardfixiermittel |
| Bearbeitungsformat | Auswahlliste der Formate | Pflicht | Der Kassettentyp. | Das Standardformat |
| Dekalzifizierung erforderlich | Schalter Ja/Nein | Optional | | Aus |
| Standardanzahl Blöcke oder Standardanzahl Dekantierungen | Ganze Zahl größer als 0 | Optional | Ein leeres Feld bedeutet 1. | Leer |
| Standard-Stückzahl | Ganze Zahl größer als 0 | Optional | Nur Blockspuren. Bei einer Dekantierungsspur wird sie abgelehnt. | Leer |
| + Spur hinzufügen, Spur entfernen | Schaltflächen | Entfällt | | Entfällt |

#### Schritt (innerhalb einer Spur)

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Aktion Schritt | Text | Optional | Zum Beispiel Schnitt Ebene 1, Gefrierschnitt. | Leer |
| Färbungen | Such- und Auswahlliste der diagnostischen Assays | Optional | Suche nach Name oder Kategorie. | Keine |
| Objektträger | Ganze Zahl | Optional | | Leer |
| Zurückhalten | Schalter Ja/Nein | Optional | Ein Haltschritt. | Aus |
| + Schritt hinzufügen, Schritt entfernen | Schaltflächen | Entfällt | | Entfällt |

Die Schaltfläche **Änderungen speichern** ist deaktiviert, bis der Name, jeder Name einer Spur und die Anzahlen jeder Spur gültig sind.

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, eine Version wiederherstellen: `config:processing-protocols:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Drei gespeicherte Eigenschaften je Spur und je Schritt haben kein Feld auf dem Bildschirm: eine Dauer der Dekalzifizierung, eine Markierung „ausgehenden Auftrag senden“ bei einem Schritt und eine Liste zulässiger zusätzlicher Färbungen. Die Listen der Fixiermittel und Bearbeitungsformate können auf keinem Bildschirm bearbeitet werden. Nicht zu verwechseln mit dem Reiter Protokolle der Synoptik-Bibliothek ([Kapitel 6](#screen-tab-protocols)), der Befundprotokolle enthält und keine Verarbeitungsabläufe.

### Reagenz- & Lösungschargen {#screen-reagent_lots}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Reagenz- & Lösungschargen

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Reagenz- & Lösungschargen (Seitentitel „Reagenzien- und Lösungschargenregister“)

**3. Geschäftlicher Zweck und Umfang.** Ein Register der Reagenzchargen mit Chargennummer, Verfallsdatum und QC-Status. Eine Charge gehört zu einer Katalogfärbung (einem IHC-Antikörper oder Spezialfärbungsset) oder zu einem von sieben Routine-Linienreagenzien der H&E-Färbung. Wenn jemand eine Färbecharge anlegt, werden die aktiven Chargen zur Zuordnung angeboten.

**4. Voraussetzungen und Abhängigkeiten.** Eine Charge einer Katalogfärbung wählt aus den aktiven, nicht routinemäßigen Einträgen des [Diagnosekatalogs](#screen-stains). Wird der Katalog übersprungen, ist die Liste Färbung leer. Routine-Linienreagenzien sind eine feste Liste und benötigen nichts.

Setup step: Tier 2, step 19
Requires: [Diagnosekatalog](#screen-stains)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-reagent_lots - Liste des Reagenzien- und Lösungschargenregisters]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Chargennummer oder Färbung. | Leer |
| Statusfilter | Auswahl: Alle Status, Aktiv, Inaktiv | Optional | | Alle Status |
| QC-Zustandsfilter | Auswahl: Alle QC-Zustände, Ausstehend, Bestanden, Nicht bestanden | Optional | | Alle QC-Zustände |
| Spalten | Reagenz / Färbung, Chargennummer, Ablaufdatum, QC-Status, Durchführendes Labor, Status, Aktionen | Entfällt | | Entfällt |
| + Reagenzcharge hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Bearbeiten, Deaktivieren, Reaktivieren | Schaltflächen in der Zeile | Entfällt | | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Diese Charge ist für | Auswahl: Katalogfärbung (IHC / Spezialfärbung), Routinemäßiges H&E-Linienreagenz | Pflicht | Bestimmt, ob die nächste Auswahlliste Färbung oder Linienreagenz ist. | Katalogfärbung |
| Färbung | Auswahlliste der aktiven, nicht routinemäßigen Katalogeinträge | Pflicht bei einer Katalogfärbung | | Keine |
| Linienreagenz | Auswahl: Hämatoxylin, Eosin, Bläuungsreagenz, Differenzierer, Entwässerungsmittel (Alkohol), Klärmittel (Xylol), Einbettmedium | Pflicht bei einem Linienreagenz | | Keines |
| Chargennummer | Text | Pflicht | | Keine |
| Ablaufdatum | Datum | Pflicht | | Keines |
| Eingangsdatum | Datum | Optional | | Leer |
| Hersteller | Text | Optional | | Leer |
| QC-Status | Auswahl: Ausstehend, Bestanden, Nicht bestanden | Pflicht | | Ausstehend |
| Durchführendes Labor | Auswahlliste: Alle Labore (gemeinsamer Bestand) oder ein durchführendes Labor | Optional | | Alle Labore |
| Aktiv | Schalter Ja/Nein | Optional | | Aktiv |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:reagent-lots:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Das Register erfasst den QC-Status. Dieses Handbuch hat keine Regel gefunden, die verhindert, dass eine Färbecharge eine abgelaufene oder nicht bestandene Reagenzcharge verwendet, und das Fenster der Färbecharge führt nur die aktiven Chargen auf.
## Teil E: Bibliotheken der Diagnosecodes {#ch3-code-libraries}
Breadcrumb: Startseite > Konfiguration > System

Dieser Teil enthält die Einstellungen für Codiersysteme und für die Dienste, die sie durchsuchen. PathScribe hält den Inhalt von SNOMED CT, ICD, ICD-O, LOINC oder CPT nicht selbst vor. Jedes System wird von seiner eigenen Normungsstelle gepflegt und über einen Dienst abgefragt.

**Wo die verwandten Wörterbücher stehen.** Die CPT-Modifikatorliste ist das [CPT-Modifikator-Wörterbuch](#screen-modifier_dictionary), und die Liste der Leistungscodes ist das [Abrechnungswörterbuch](#screen-billing_dictionary). Beide sind in [Kapitel 8](#ch8) beschrieben, nicht hier. Der unten beschriebene [Code-Import (Massenimport)](#screen-code_import) lädt Abrechnungscodes in das Abrechnungswörterbuch. Er importiert keine Diagnosecodes.

### Codiersysteme {#screen-code_systems}
Breadcrumb: Startseite > Konfiguration > System > Klinische Nachschlagewerke > Codiersysteme

**Status:** Demonstration

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Klinische Nachschlagewerke**
**2. Wartungspunkt:** Codiersysteme

**3. Geschäftlicher Zweck und Umfang.** Legt für jedes Land, das Sie bedienen, fest, welche Codiersysteme (ICD-10, ICD-11, ICD-O, SNOMED CT, LOINC, CPT, OPCS-4 und weitere) **Aus**, **Optional** oder **Verpflichtend** sind, und ab welchem Datum. Der Wechsel einer Region von ICD-10 zu ICD-11 ist hier eine Einstellung, keine Softwareänderung. Eine zweite Karte, **Lizenzierte Terminologien**, erfasst die Lizenzen für SNOMED CT und ICD-O-3, die Ihre Organisation besitzt. Echte Codes, die unter [Regeln für abnormale Auslöser](#screen-abnormal_trigger_rules) eingegeben werden, werden nur verwendet, solange die passende Lizenz eingeschaltet und nicht abgelaufen ist. Bis dahin werden deutlich gekennzeichnete Testcodes verwendet.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste der Länder besteht aus dem eigenen Rechtsraum des Labors und dem Rechtsraum jeder aktiven Einrichtung; die Einrichtungen werden daher zuerst eingerichtet ([Einrichtungsverzeichnis](#screen-facility-dictionary)). Werden sie übersprungen, wird nur das eigene Land des Labors aufgeführt.

Setup step: Tier 2, step 2
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Regeln für abnormale Auslöser](#screen-abnormal_trigger_rules)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-code_systems - Richtlinie der Codiersysteme je Land und die Karte Lizenzierte Terminologien]

**6. Feldreferenz.**

#### Richtlinientabelle

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Wo | Text | Entfällt | Eine Zeile je bedientem Land. | Entfällt |
| Heute in Verwendung | Text | Entfällt | Jedes System mit seiner heutigen Rolle, zum Beispiel „ICD-10: Optional“, und „(danach Verpflichtend ab Datum)“, wenn eine spätere Regel existiert. | Entfällt |
| Festgelegt durch | Text | Entfällt | „Standard“ oder „Hier festgelegt“. | Standard |
| Bearbeiten | Schaltfläche in der Zeile | Entfällt | Öffnet den Regeleditor für dieses Land. | Entfällt |
| Auf Standard zurücksetzen | Schaltfläche in der Zeile | Entfällt | Wird angezeigt, wenn ein Datensatz existiert. Entfernt ihn. | Entfällt |

#### Regeleditor

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Codiersystem | Text mit Vorschlägen: SNOMED CT, ICD-10, ICD-11, LOINC, ICD-O, CPT, OPCS-4 | Pflicht | Eine System-ID. Ein künftiges System kann als Daten eingegeben werden. | Keines |
| Rolle | Auswahl: Aus, Optional, Verpflichtend | Pflicht | | Optional |
| Gilt ab | Datum | Optional | Leer lassen für eine Regel, die jetzt gilt. Um eine Rolle später zu ändern, fügen Sie für dasselbe System eine zweite Zeile mit einem Startdatum hinzu. Es gilt die jüngste Zeile, die bereits begonnen hat. | Leer |
| Entfernen | Schaltfläche in der Zeile | Entfällt | | Entfällt |
| + Regel hinzufügen | Schaltfläche | Entfällt | Höchstens 40 Regeln je Land. | Entfällt |
| Speichern | Schaltfläche | Entfällt | Wird abgelehnt, wenn es keine Regeln gibt, ein System oder eine Rolle leer oder ungültig ist, ein Datum nicht echt ist, zwei Zeilen für ein System dasselbe Startdatum haben oder es zu viele Regeln gibt. | Entfällt |
| Abbrechen | Schaltfläche | Entfällt | | Entfällt |

Ein Land ohne Datensatz beginnt mit jedem bekannten System auf Optional, außer ICD-11, das auf Aus steht.

#### Karte Lizenzierte Terminologien

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unsere Organisation besitzt diese Lizenz: echte Codes verwenden | Kontrollkästchen, je eines für SNOMED CT und ICD-O-3 | Optional | Schaltet echte Codes ein. | Aus |
| Lizenzinhaber | Text | Pflicht, wenn das Kästchen angekreuzt ist | | Leer |
| Edition oder Release | Text | Pflicht, wenn das Kästchen angekreuzt ist | | Leer |
| Lizenz- oder Vertragsnummer | Text | Pflicht, wenn das Kästchen angekreuzt ist | | Leer |
| Letzter Gültigkeitstag | Datum | Optional | Leer lassen, wenn die Lizenz nicht abläuft. Nach diesem Tag werden wieder Testcodes verwendet. | Leer |
| Statuszeile | Text | Entfällt | Eine von: Lizenz eingeschaltet; Lizenz an einem Datum abgelaufen; Keine Lizenz erfasst; Lizenz erfasst, aber ausgeschaltet. | Entfällt |
| Lizenzen speichern | Schaltfläche | Entfällt | Wird mit einer Begründung abgelehnt, wenn ein Pflichtfeld leer ist oder das Datum nicht echt ist. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Richtlinie speichern, bearbeiten, zurücksetzen und Lizenzen speichern: `config:code-systems:manage` (hohes Risiko). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Jede Änderung der Richtlinie wird als `CODE_SYSTEM_POLICY_CHANGED` protokolliert, mit dem Zustand davor und danach.

**Bekannte Grenzen.** Die Einstellungen werden gespeichert, aber noch liest nichts die Richtlinie: Das Fenster Code hinzufügen, die Befundfreigabe und ausgehende Nachrichten verwenden sie nicht (Geplant, `docs/architecture/DIAGNOSIS_CODING.md`). Der Bildschirm sagt dies auf seiner Oberfläche selbst. Die Richtlinie wird im Browser gehalten, bis der API-Server sie hält, weshalb der Status Demonstration lautet. PathScribe enthält keine Inhalte von SNOMED CT oder ICD-O-3: Die Lizenz ist eine Vereinbarung zwischen Ihrer Organisation und der lizenzgebenden Stelle.

### Terminologiedienste {#screen-terminology}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Terminologiedienste

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Integrationen**
**2. Wartungspunkt:** Terminologiedienste

**3. Geschäftlicher Zweck und Umfang.** Eine Verbindungsprüfung. Sie bestätigt, dass PathScribe die Codiersysteme erreichen kann, die für die Codesuche und für KI-Vorschläge verwendet werden: SNOMED CT, ICD-10, ICD-11, LOINC, ICD-O und CPT. Hier gibt es nichts hinzuzufügen oder hochzuladen. Jedes System wird von seiner eigenen Normungsstelle gepflegt und innerhalb von PathScribe nicht versioniert. Die Prüfungen laufen, wenn der Bildschirm geöffnet wird und wenn Sie **Alle testen** wählen.

**4. Voraussetzungen und Abhängigkeiten.** Die richtige ICD-10-Variante wird aus Ihren aktiven [Aufsichtsbehörden](#screen-governing_bodies) gewählt: ICD-10-CM für die USA (CAP), ICD-10 WHO für RCPath und ICCR und ICD-10-AM für RCPA. Varianten außerhalb der USA und CPT benötigen einen Backend-Proxy. Ist eine Adresse des API-Servers konfiguriert, laufen die Abfragen für ICD-10-CM, ICD-11 und LOINC über den Server, wie in `docs/architecture/TERMINOLOGY_PROXY_API.md` beschrieben. SNOMED CT und ICD-O werden über die UMLS-Route des Servers geprüft.

Setup step: Tier 2, step 3
Requires: [Aufsichtsbehörden](#screen-governing_bodies)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-terminology - Verbindungsprüfung der Terminologiedienste]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Gesamtstatus | Text | Entfällt | „Alle Systeme betriebsbereit“, wenn jeder Dienst Live oder Lizenz erforderlich ist. Andernfalls „Einige Dienste benötigen Aufmerksamkeit“. | Entfällt |
| Zuletzt geprüft | Uhrzeit | Entfällt | | Entfällt |
| Umgebungsvariablen anzeigen | Schalter Ja/Nein | Optional | Wird nur einem Superadmin angezeigt. Zeigt die Umgebungsvariable und den Wert hinter jedem Dienst. | Aus |
| Alle testen | Schaltfläche | Entfällt | Führt die Prüfungen erneut aus. | Entfällt |
| Dienst | Text | Entfällt | SNOMED CT, ICD-10-CM, ICD-11, LOINC, ICD-O, CPT. | Entfällt |
| Details | Text | Entfällt | Was der Dienst bereitstellt und seine Quelle (zum Beispiel NLM Clinical Tables, kostenlos). | Entfällt |
| Status | Text | Entfällt | Wird geprüft, Live, Beeinträchtigt, Ausgefallen, Nicht konfiguriert oder Lizenz erforderlich. | Entfällt |
| Regionsabhängige ICD-10-Varianten | Hinweis | Entfällt | Erklärt die oben beschriebene Wahl der Variante. | Entfällt |
| CPT-Lizenz vor Go-Live erforderlich | Hinweis | Entfällt | CPT ist von der AMA lizenziert und kann nicht über eine öffentliche API bereitgestellt werden. Es benötigt eine AMA-Lizenz und einen Backend-Proxy. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Der Bildschirm ändert keine Daten und hat keine eigene Berechtigung. Der Schalter für die Umgebungsvariablen ist für einen Superadmin vorgesehen.

**Bekannte Grenzen.** Der Bildschirm kann kein System hinzufügen und keine Adresse ändern. Die Adressen stammen aus den Umgebungsvariablen der Bereitstellung.

### Code-Import (Massenimport) {#screen-code_import}
Breadcrumb: Startseite > Konfiguration > System > Finanz- & Umsatz-Nachschlagewerke > Code-Import (Massenimport)

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Finanz- & Umsatz-Nachschlagewerke**
**2. Wartungspunkt:** Code-Import

**3. Geschäftlicher Zweck und Umfang.** Importiert Abrechnungscodes aus einer CSV-Datei (CPT, HCPCS, NHS OPCS-4 oder lokale Laborcodes) in das [Abrechnungswörterbuch](#screen-billing_dictionary). Jeder Import wird zu einem Auftrag. Eine zweite Person muss den gesamten Auftrag unter [Ausstehende Abrechnungsregel-Genehmigungen](#screen-pending_approvals) genehmigen oder ablehnen. Frühere Versionen eines Codes bleiben bis zum Gültigkeitsdatum der neuen Version in Kraft. Die Seite hat drei Schritte und einen Importverlauf.

**4. Voraussetzungen und Abhängigkeiten.** In Stufe 2 wird zuvor nichts benötigt. Die Auswahlliste Standort führt Ihre Standorte auf, und **Unternehmensweit** wendet die Codes überall an. Im Abrechnungswörterbuch ändert sich nichts, bis eine andere Person den Auftrag genehmigt; planen Sie daher einen zweiten Administrator ein.

Setup step: Tier 2, step 4
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: [Abrechnungswörterbuch](#screen-billing_dictionary), [Ausstehende Abrechnungsregel-Genehmigungen](#screen-pending_approvals)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-code_import - Assistent für den Code-Import und Importverlauf]

**6. Feldreferenz.**

#### Schritt 1: Datei und Geltungsbereich

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| CSV-Datei auswählen | Datei | Pflicht | Wird abgelehnt, wenn sie keine CSV-Datei ist, keine Kopfzeile oder keine Datenzeilen hat oder nicht gelesen werden kann. | Keine |
| Codiersystem | Auswahl: CPT, HCPCS, Lokale Laborcodes, NHS OPCS-4 | Pflicht | | CPT |
| Land | Auswahl gruppiert als Betriebsländer, Europäische Union, Sonstige, dazu „Alle Länder“ | Pflicht | Ein Wechsel des Standards füllt ein Land aus: US für CPT und HCPCS, UK für NHS OPCS-4, leer für lokale Codes. | US |
| Standort | Auswahlliste: Unternehmensweit oder ein Standort | Optional | | Unternehmensweit |
| Notiz zum Import | Text | Optional | Wird dem Änderungsgrund jedes Codes im Import hinzugefügt. | Leer |

#### Schritt 2: Spalten zuordnen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Abrechnungscode | Auswahl einer Dateispalte oder „— Nicht in der Datei —“ | Pflicht | PathScribe schlägt Zuordnungen anhand der Spaltennamen vor. Eine Spalte kann mehr als ein Feld füllen: Eine einzelne Spalte „Code“ liefert häufig sowohl den Abrechnungscode als auch den CPT-Code. | Vorgeschlagen |
| CPT-Code | Auswahl einer Dateispalte | Pflicht | | Vorgeschlagen |
| Gültig ab | Auswahl einer Dateispalte | Pflicht, sofern nicht ein Datum für die Datei angegeben ist | | Vorgeschlagen |
| Beschreibung, Ebene, Abrechnungsart (TC / 26 / Global), HCPCS-Code, Arbeits-RVU, Praxiskosten-RVU, Haftpflicht-RVU, Notizen | Auswahl einer Dateispalte | Optional | | Vorgeschlagen |
| Gültig ab (für die ganze Datei) | Datum | Optional | Wird für Zeilen ohne eigenes Datum verwendet. Ersetzt die Spalte Gültig ab. | Leer |
| Ebene, falls nicht in der Datei | Auswahl: Aus der Beschreibung ableiten oder eine Ebene | Optional | | Aus der Beschreibung ableiten |
| Abrechnungsart, falls nicht in der Datei | Auswahl: Technisch (TC), Ärztlich (26), Global | Optional | | Global |
| Datei prüfen | Schaltfläche | Entfällt | Deaktiviert, bis die Pflichtfelder zugeordnet sind. | Entfällt |

#### Schritt 3: Prüfen und importieren

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Zusammenfassung der Vorschau | Text | Entfällt | Anzahl der Zeilen, die importiert werden können, und der abgelehnten Zeilen. | Entfällt |
| Abgelehnte Zeilen | Tabelle: Zeile, Abrechnungscode, Grund | Entfällt | Bis zu 50 werden angezeigt. Gründe: kein Abrechnungscode, kein CPT-Code, ein fehlerhaftes oder fehlendes Gültigkeitsdatum, ein fehlerhafter RVU-Wert, eine Wiederholung des Abrechnungscodes in der Datei, eine nicht erkannte Abrechnungsart oder Ebene, oder der Code hat bereits eine Version im Entwurf oder in Genehmigung. | Entfällt |
| Diese Zeilen überspringen und den Rest importieren | Kontrollkästchen | Optional | Abgelehnte Zeilen blockieren den Import, sofern Sie sie nicht überspringen. | Aus |
| Schaltfläche Import | Schaltfläche | Entfällt | Speichert einen Auftrag, der auf Genehmigung wartet. | Entfällt |

#### Importverlauf

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Spalten | Datei / Auftrag, Codiersystem, Gilt für, Codes, Hochgeladen, Status, Aktionen | Entfällt | Der Status ist Wartet auf Genehmigung, Genehmigt, Abgelehnt, Zurückgenommen oder Zurückgenommen (einige Codes stillgelegt). Aufträge werden nie gelöscht. | Entfällt |
| Zurücknehmen | Schaltfläche in der Zeile | Entfällt | Nur genehmigte Aufträge. Öffnet ein Feld für die Begründung. | Entfällt |
| Grund für die Rücknahme | Text | Pflicht | | Keiner |
| Rücknahme bestätigen | Schaltfläche | Entfällt | Entfernt die Versionen, die der Import hinzugefügt hat. Eine Version, die Leistungen bereits verwendet haben, bleibt erhalten und wird als stillgelegt markiert. Frühere Versionen, die der Import beendet hatte, werden wieder geöffnet. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Importieren und zurücknehmen: `config:billing-code-import:run` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Das Genehmigen oder Ablehnen eines Auftrags erfolgt durch eine andere Person unter [Ausstehende Abrechnungsregel-Genehmigungen](#screen-pending_approvals). Die Person, die einen Auftrag hochgeladen hat, kann ihn nicht genehmigen (Vier-Augen-Prinzip).

**Bekannte Grenzen.** Der Import bringt nur Abrechnungscodes ein, keine Diagnosecodes. Die Ebene einer Zeile, die nicht in der Datei steht, kann aus der Beschreibung abgeleitet werden. Eine Datei mit demselben Abrechnungscode zweimal wird für diesen Code abgelehnt.

## Teil F: Einsendende Ärzte, Kundenkonten und Verteilungseinstellungen {#ch3-physicians-clients}
Breadcrumb: Startseite > Konfiguration > System

Dieser Teil enthält die Personen und Organisationen, die Aufträge senden, die Durchlaufzeit, die jedem Kunden zugesagt ist, die Regeln, die ein Ergebnis als abnormal kennzeichnen, und die Normungsstellen, die Aufbewahrungsfristen festlegen. Die Einstellungen zur Befundzustellung werden beim Arzt (bevorzugter Kontakt) und im Reiter Berichterstattung der Einrichtung festgelegt, nicht auf einem eigenen Bildschirm.

### Ärzte {#screen-physicians}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Ärzte

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Integrationen**
**2. Wartungspunkt:** Ärzte

**3. Geschäftlicher Zweck und Umfang.** Das Verzeichnis der anfordernden und einsendenden Ärzte und ihrer Zugehörigkeit zu Einrichtungen. Jeder hat einen eindeutigen **Arztcode** und, falls vorhanden, eine NPI (National Provider Identifier). Kontaktdaten, eine bevorzugte Kontaktart und eine SMS-fähige Mobilnummer (nur für automatisierte SMS bei kritischen Befunden verwendet) werden hier geführt. Ein Arztname, der mit einem Auftrag eintrifft und zu nichts passt, erzeugt einen nicht verifizierten Eintrag, den jemand prüfen sollte.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste Einrichtungszugehörigkeiten liest das [Einrichtungsverzeichnis](#screen-facility-dictionary). Wird es übersprungen, ist die Liste leer, und ein Arzt kann keinem Kunden zugeordnet werden.

Setup step: Tier 2, step 20
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-physicians - Ärzteliste mit Suche, Statusfilter, Export und Import]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Suche | Text | Optional | Name, Code, NPI oder Fachgebiet. | Leer |
| Statusfilter | Auswahl: Alle, Aktiv, Inaktiv, Nicht verifiziert | Optional | | Alle |
| Spalten | Arzt (mit Code und NPI), Fachgebiet, Kontakt (mit „über“ bevorzugter Kontaktart), Einrichtungen, Status, Aktionen | Entfällt | | Entfällt |
| Exportieren | Schaltfläche | Entfällt | Lädt eine CSV-Datei herunter, einschließlich Arztcode, NPI, Kontakt, SMS, Status und Einrichtungen. | Entfällt |
| Tabelle importieren | Schaltfläche | Entfällt | Eine Zeile wird einem vorhandenen Arzt zuerst über die NPI zugeordnet, dann über den Arztcode. Eine Zeile mit keinem von beiden erhält einen neuen Code. Die Vorschau sagt „N zu aktualisieren, M neu“ und wie vielen ein neuer Code zugewiesen wurde. **Import anwenden** schreibt sie. | Entfällt |
| Verifizieren | Schaltfläche in der Zeile | Entfällt | Wird für nicht verifizierte Einträge angezeigt. | Entfällt |
| Bearbeiten | Schaltfläche in der Zeile | Entfällt | | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Titel | Auswahl: Keiner, Mr., Mrs., Ms., Mx., Dr. | Optional | | Keiner |
| Suffix | Auswahl aus Vorgaben oder Andere | Optional | | Leer |
| Vorname(n) | Text | Pflicht | Alle Vor- und mittleren Namen. | Keiner |
| Familienname(n) | Text | Pflicht | | Keiner |
| Bevorzugter Name | Text | Optional | Wie das Personal die Person nennen soll, falls abweichend. | Leer |
| Arztcode | Text | Pflicht | Eine interne Kennung, zum Beispiel PHY-0231. Eindeutig im gesamten Verzeichnis. Eine Wiederholung wird abgelehnt und nennt den Arzt, der den Code besitzt. | Keiner |
| NPI-Nummer | Text | Optional | Nicht jeder Arzt hat eine. Eindeutig, wenn angegeben. Der Bildschirm prüft das 10-stellige Format nicht. | Leer |
| Fachgebiet | Text | Optional | | Leer |
| Telefon, Fax | Text | Optional | | Leer |
| SMS-fähiges Mobiltelefon | Text | Optional | Nur für automatisierte SMS bei kritischen Befunden. | Leer |
| Mobilfunkanbieter (USA) | Auswahl: Unbekannt / nicht USA, Verizon, AT&T, T-Mobile, US Cellular, Andere | Optional | Wird verwendet, um die SMS als E-Mail an das Gateway des Anbieters zu senden. | Unbekannt / nicht USA |
| E-Mail-zu-SMS-Domain des Anbieters | Text | Optional | Wird angezeigt, wenn der Anbieter Andere ist. | Leer |
| E-Mail | Text | Optional | | Leer |
| Bevorzugter Kontakt | Auswahl: E-Mail, Fax, Telefon | Pflicht | | E-Mail |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |
| Einrichtungszugehörigkeiten | Such- und Auswahlliste der Einrichtungen | Optional | Ein Arzt kann mehreren Einrichtungen zugeordnet werden. | Keine angekreuzt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, importieren, verifizieren, deaktivieren: `config:physicians:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig.

**Bekannte Grenzen.** Der Bildschirm hat für Personen ohne die Berechtigung keine reine Leseansicht: Der Dienst lehnt das Speichern ab. Vorbelegte Ärzte sind Beispieldatensätze (ab PHY-0001).
### Einrichtungskonfiguration {#screen-clients}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Einrichtungskonfiguration

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Integrationen** > **Einrichtungskonfiguration**
**2. Wartungspunkt:** Einrichtungskonfiguration (Kundenkonten)

**3. Geschäftlicher Zweck und Umfang.** Ein Kundenkonto ist eine Einrichtung mit der Rolle Externe anfordernde Einrichtung (eine Praxis, Klinik oder ein Krankenhaus, das Ihnen Proben sendet) oder der Rolle Interne anfordernde Einrichtung. Dies ist derselbe Bildschirm mit demselben Editor, den [Kapitel 2](#ch2) als [Einrichtungsverzeichnis](#screen-facility-dictionary) beschreibt. Alles zu seinen Feldern, Reitern und Standardwerten steht nur einmal dort. Dieser Abschnitt sagt nur, was wichtig ist, wenn Sie ihn zur Einrichtung von Kunden verwenden.

**4. Voraussetzungen und Abhängigkeiten.** In Stufe 2 kommt nichts davor: Er ist der Bildschirm der Stufe 1. Richten Sie zuerst Ihre durchführenden Labore ein, dann jeden Kunden. Kunden speisen drei Bildschirme der Stufe 2: [Ärzte](#screen-physicians) (Zugehörigkeiten), [Service-Level je Kunde](#screen-client_sla) (ein Level je Kunde, zugeordnet über die Vergebende Stelle) und die Überschreibungen je Einrichtung in den Zytologie-Bildschirmen.

Setup step: Tier 2, step 21
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Service-Level je Kunde](#screen-client_sla)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-clients - Liste der Einrichtungskonfiguration mit Suche, Filtern und Einrichtung hinzufügen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Listenseite: Suche, Status- und Rollenfilter, Spalten, + Einrichtung hinzufügen, Verifizieren, Bearbeiten, Duplizieren, Deaktivieren | Siehe [Einrichtungsverzeichnis](#screen-facility-dictionary) | Entfällt | Duplizieren kopiert die Einrichtung auf Organisationsebene in eine neue Einrichtung und löscht die Kennungen. Das Deaktivieren einer Einrichtung, die noch verwendet wird, öffnet **Einrichtung wird noch verwendet** und bittet Sie um eine Bestätigung. | Entfällt |
| Rollen im Reiter Allgemein | Kontrollkästchen: Durchführendes Labor, Interner Einsendestandort, Interne anfordernde Einrichtung, Externe anfordernde Einrichtung, Probengewinnung, Referenzlabor | Pflicht | Ein Kundenkonto ist eine anfordernde Rolle. Ein Referenzlabor, an das Sie Arbeit senden, benötigt die Rolle Referenzlabor, um im [Diagnosekatalog](#screen-stains) zu erscheinen. | Externe anfordernde Einrichtung |
| Vergebende Stelle im Reiter Allgemein | Text, bis zu 10 Zeichen | Pflicht | Ordnet eingehende Aufträge dem Kunden zu. Die [Service-Level je Kunde](#screen-client_sla) werden über denselben Code zugeordnet. | Leer |
| Reiter des Editors | Allgemein, LIS-Integration, Kennungsformate, Berichterstellung, Bearbeitungszeit & Eskalation, KI & Leistung, Standorte, Sichere Nachrichten, Drucken, Rechtschreibung | Entfällt | Die Felder jedes Reiters stehen im [Einrichtungsverzeichnis](#screen-facility-dictionary). Standorte, Sichere Nachrichten, Drucken und Rechtschreibung erscheinen, nachdem die Einrichtung zum ersten Mal gespeichert wurde. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, duplizieren, aktivieren, deaktivieren: `config:facilities:manage` (hohes Risiko, protokolliert). Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Derselbe Bildschirm ist in der Gliederung zweimal unter zwei Namen aufgeführt. Er ist in Kapitel 2 vollständig beschrieben und wird hier nicht wiederholt.

### Service-Level je Kunde {#screen-client_sla}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Service-Level je Kunde

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Verwaltung & Compliance**
**2. Wartungspunkt:** Service-Level je Kunde

**3. Geschäftlicher Zweck und Umfang.** Legt die Durchlaufzeit fest, die jedem Kunden zugesagt ist: Stunden bis zur ersten Bearbeitung und Stunden bis zum signierten Befund, mit optionalen kürzeren STAT-Zielen. Fälle werden ab dem Zeitpunkt ihres Eingangs gemessen. Ein Fall, der nach einem Ziel noch offen ist, zeigt in der Arbeitsliste ein Kennzeichen. Ein leeres STAT-Feld verwendet das Routineziel.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste **Hinzufügen** bietet nur Kunden an, die eine Vergebende Stelle haben, nicht Inaktiv sind und noch kein Service-Level haben. Richten Sie zuerst die Kunden ein ([Einrichtungskonfiguration](#screen-clients)). Wird dies übersprungen, sagt der Bildschirm „Jeder Kunde hat bereits ein Service-Level, oder es sind noch keine Kunden eingerichtet.“

Setup step: Tier 2, step 22
Requires: [Einrichtungskonfiguration](#screen-clients)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-client_sla - Tabelle der Service-Level je Kunde und Kunden-Service-Level hinzufügen]

**6. Feldreferenz.**

#### Tabelle

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Kunde | Text | Entfällt | Der Name des Kunden. | Entfällt |
| Erste Bearbeitung (Stunden) | Zahl größer als 0 | Pflicht | Wird in der Tabelle bearbeitet. Wird gespeichert, wenn Sie das Feld verlassen. Darf nicht länger sein als der signierte Befund. | Keine |
| Signierter Befund (Stunden) | Zahl größer als 0 | Pflicht | | Keine |
| STAT erste Bearbeitung (Stunden) | Zahl größer als 0 oder leer | Optional | Leer zeigt „Wie Routine“. | Leer |
| STAT signierter Befund (Stunden) | Zahl größer als 0 oder leer | Optional | Leer zeigt „Wie Routine“. | Leer |
| Aktiv | Kontrollkästchen | Optional | | An |
| Entfernen | Schaltfläche in der Zeile | Entfällt | | Entfällt |

#### Kunden-Service-Level hinzufügen

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Kunde | Auswahlliste: „Name (Stelle)“ | Pflicht | Nur Kunden ohne Level. | Keiner |
| Erste Bearbeitung (Stunden) | Zahl größer als 0 | Pflicht | | Keine |
| Signierter Befund (Stunden) | Zahl größer als 0 | Pflicht | | Keine |
| Service-Level hinzufügen | Schaltfläche | Entfällt | Wird mit einer Begründung abgelehnt, wenn der Kunde fehlt, bereits ein Level hat, ein Ziel nicht größer als 0 ist oder die erste Bearbeitung länger ist als der signierte Befund. | Entfällt |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, entfernen: `config:tat-targets:manage` (hohes Risiko, protokolliert), dieselbe Berechtigung wie beim Reiter TAT-Konfiguration. Admin, Laborleiter und Superadmin besitzen sie standardmäßig. Wer sie nicht besitzt, sieht den Bildschirm nur lesend.

**Bekannte Grenzen.** Der Bildschirm hat einen Produktivdienst und einen API-Vertrag. Eine ältere Lückenliste nennt ihn nur im Browser vorhanden. Einem Kunden ohne Vergebende Stelle kann kein Level zugewiesen werden.

### Regeln für abnormale Auslöser {#screen-abnormal_trigger_rules}
Breadcrumb: Startseite > Konfiguration > System > Klinische Nachschlagewerke > Regeln für abnormale Auslöser

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Klinische Nachschlagewerke**
**2. Wartungspunkt:** Regeln für abnormale Auslöser (Seitentitel „Erkennung von Auffälligkeiten – Auslöseregeln für hohes Risiko“)

**3. Geschäftlicher Zweck und Umfang.** Legt fest, welche Paare aus synoptischem Feld und Wert einen Fall als Auffällig, Kritisch oder Maligne kennzeichnen. Ein Treffer ist immer ein Vorschlag, den der Pathologe bei der Befundfreigabe bestätigt oder bestreitet, nie eine automatische Feststellung. Ein Schalter oben schaltet die Erkennung von Auffälligkeiten für das gesamte Unternehmen aus.

**4. Voraussetzungen und Abhängigkeiten.** Eine Regel kann echte SNOMED-CT- und ICD-O-3-Codes tragen, die nur verwendet werden, solange die passende Lizenz unter [Codiersysteme](#screen-code_systems) eingeschaltet und gültig ist. Bis dahin hängt PathScribe deutlich gekennzeichnete Testcodes an. Der Schalter für das Unternehmen ist ein Hauptschalter: Solange er aus ist, kann keine Einrichtung die Erkennung in ihrem Datensatz im [Einrichtungsverzeichnis](#screen-facility-dictionary) für sich selbst einschalten.

Setup step: Tier 2, step 23
Requires: [Codiersysteme](#screen-code_systems)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-abnormal_trigger_rules - Liste der Auslöseregeln mit dem Schalter für das Unternehmen]

**6. Feldreferenz.**

#### Seitensteuerung

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Unternehmensweit aktiviert | Kontrollkästchen | Optional | Aus schaltet die Erkennung von Auffälligkeiten für jede Einrichtung ab. An lässt jeder durchführenden Einrichtung die Freiheit, sie für sich selbst einzuschränken. | Aus der Unternehmenskonfiguration |
| Laborfilter | Auswahl: Alle Labore, Nur global oder ein Labor | Optional | | Alle Labore |
| Spalten | Feldbezeichnung, Auslösewert(e), Schweregrad, Beschreibung, Durchführendes Labor, Status, Aktionen | Entfällt | | Entfällt |
| + Auslöseregel hinzufügen | Schaltfläche | Entfällt | | Entfällt |
| Bearbeiten, Duplizieren, Deaktivieren, Aktivieren | Schaltflächen in der Zeile | Entfällt | | Entfällt |

#### Fenster zum Hinzufügen und Bearbeiten

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Synoptische Feldbezeichnung | Text | Pflicht | Zum Beispiel Margin Status. Muss mit der Bezeichnung der synoptischen Frage übereinstimmen. Eine Regel je Bezeichnung innerhalb des durchführenden Labors oder innerhalb von Global. | Keine |
| Auslösewert(e) | Text, durch Kommas getrennt | Pflicht | Zum Beispiel Positive. Mindestens einer. | Keine |
| Schweregrad | Auswahl: Auffällig, Kritisch, Bösartig | Pflicht | | Auffällig |
| Beschreibung | Freitext | Optional | Wird dem Pathologen als Grund für den Vorschlag angezeigt. | Leer |
| SNOMED-CT-Code | Text, 6 bis 18 Ziffern | Optional | Aus Ihrer lizenzierten Ausgabe. | Leer |
| SNOMED-CT-Begriff | Text | Pflicht, wenn ein Code angegeben ist | Der Begriff, wie er in Ihrer Ausgabe erscheint. | Leer |
| ICD-O-3-Code | Text in der Form 8500/3 | Optional | | Leer |
| ICD-O-3-Begriff | Text | Pflicht, wenn ein Code angegeben ist | | Leer |
| Durchführendes Labor | Auswahlliste: Global oder ein durchführendes Labor | Optional | | Global |
| Status | Schalter Aktiv / Inaktiv | Optional | | Aktiv |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen, bearbeiten, deaktivieren: `config:abnormal-triggers:manage` (hohes Risiko, protokolliert). Die Berechtigung gehört zur Gruppe Qualität. Admin, Laborleiter und Superadmin besitzen sie standardmäßig.

**Bekannte Grenzen.** Die Feldbezeichnung der Regel wird als Text abgeglichen; eine umbenannte synoptische Frage trifft daher nicht mehr zu. Der Schalter für das Unternehmen speichert die Unternehmenskonfiguration. Vier Regeln sind vorbelegt: Margin Status Positive, Perineural Invasion Present, Lymph Node Status Positive und Lymphovascular Invasion Present.

### [FORMEDRIXAI INTERNAL ONLY] Aufsichtsbehörden {#screen-governing_bodies}
Breadcrumb: Startseite > Konfiguration > System > Klinische Nachschlagewerke > Aufsichtsbehörden

> 🔒 **Interne, eingeschränkte Einstellung von ForMedrixAI**
> **Geltungsbereich:** Nur für internes Service- und Bereitstellungspersonal.
> **Erläuterung:** Diese Liste legt fest, welche Normungsstellen in Kraft sind und wie lange jede Stelle vorschreibt, dass Material aufbewahrt werden muss. Die darin geführten Aufbewahrungsfristen sind die Untergrenze, gegen die die Aufbewahrungsausnahme jeder Abteilung geprüft wird, und sie speisen die Aufbewahrungsuhr für gelagerte Blöcke, Objektträger und Feuchtgewebe. Eine Änderung durch einen Endanwender könnte eine gesetzliche Aufbewahrungsfrist verkürzen oder eine Stelle einschalten, die für das Land des Labors nicht gilt; daher erfordert die Bearbeitung die Plattform-Berechtigung `platform:governing-bodies:manage`, die nur der Superadmin besitzt. Alle anderen sehen die Liste nur lesend mit dem Hinweis „Super-Admin-Zugriff erforderlich“.

**Status:** Umgesetzt

**1. Navigation:** Reiter **System** der Konfiguration > Gruppe **Klinische Nachschlagewerke**
**2. Wartungspunkt:** Aufsichtsbehörden

**3. Geschäftlicher Zweck und Umfang.** Eine Aufsichtsbehörde ist eine Normungs- oder Regulierungsstelle, etwa CAP, RCPath, ICCR, RCPA, CAP-ACP, die EU (ISO 15189) oder die koreanische MSA. Jede Stelle ist eingeschaltet oder ausgeschaltet, deckt einige Rechtsräume ab und führt einen nur anhängenden Verlauf von Aufbewahrungsfristen (Tage für Blöcke, Objektträger und Feuchtgewebe). Eine Aufbewahrungsfrist wird nur von einer eingeschalteten Stelle mit mindestens einer Version verwendet, die den Rechtsraum abdeckt. Benutzerdefinierte Stellen können hinzugefügt werden.

**4. Voraussetzungen und Abhängigkeiten.** Dies ist ein Ausgangspunkt. Ohne eine Aufbewahrungsversion bei einer eingeschalteten Stelle für den Rechtsraum des Labors gibt es keine Aufbewahrungsuntergrenze, sodass die Aufbewahrungsausnahme einer Abteilung nicht geprüft wird. Abteilungen lesen sie ([Abteilungen](#screen-departments)). Die ICD-10-Variante unter [Terminologiedienste](#screen-terminology) richtet sich nach den aktiven Stellen.

Setup step: Tier 2, step 1
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: [Abteilungen](#screen-departments), [Terminologiedienste](#screen-terminology)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-governing_bodies - Liste der Aufsichtsbehörden mit den Schaltern Aktiv und Auto-Synchronisierung]

**6. Feldreferenz.**

#### Listenseite

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Aufsichtsbehörde | Text | Entfällt | Abkürzung und Name. | Entfällt |
| Region | Text | Entfällt | Die Rechtsräume, die die Stelle abdeckt. | Entfällt |
| Aktiv | Schalter Ja/Nein | Optional | Eine inaktive Stelle liefert keine Aufbewahrungsfrist und wird von der Übersicht je Rechtsraum ignoriert. | Siehe vorbelegte Stellen unten |
| Auto-Synchronisierung | Schalter Ja/Nein | Optional | Deaktiviert, solange die Stelle nicht Aktiv ist. Wird gespeichert, aber noch liest nichts sie. | Siehe vorbelegte Stellen unten |
| Aufbewahrung, Bearbeiten, Entfernen (✕) | Schaltflächen in der Zeile | Entfällt | Aufbewahrung öffnet das Fenster für die Aufbewahrung. Nur benutzerdefinierte Stellen können bearbeitet oder entfernt werden. | Entfällt |
| Benutzerdefinierte Institution hinzufügen | Schaltfläche | Entfällt | Wird nur nach einer Änderung angezeigt. | Entfällt |
| Änderungen speichern | Schaltfläche | Entfällt | Wird nur nach einer Änderung angezeigt, neben einer Markierung „Nicht gespeicherte Änderungen“. | Entfällt |
| Terminologieüberwachung – Demnächst verfügbar | Hinweis | Entfällt | Eine nächtliche Synchronisierung der Inhalte von SNOMED CT und ICD ist Geplant. | Entfällt |

#### Fenster Benutzerdefinierte Stelle

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Abkürzung | Text | Pflicht | Wird in Großbuchstaben zur ID der Stelle. Kann später nicht geändert werden. Eine Kollision mit einer vorhandenen ID wird abgelehnt. | Keine |
| Vollständiger Name | Text | Pflicht | | Keiner |
| Region | Text | Optional | | Leer |
| Website | Text | Optional | | Leer |

Eine benutzerdefinierte Stelle beginnt eingeschaltet, mit ausgeschalteter Auto-Synchronisierung.

#### Fenster Aufbewahrung

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Gilt für Rechtsordnung(en) | Chips: US, CA, GB_EW, GB_SCT, GB_NIR, IE, AU, NZ, KR, BE, NL, DE, FR, ES | Optional | Die Rechtsräume, die die Stelle abdeckt. **Rechtsordnungen speichern** übernimmt die Änderung. | Je Stelle |
| Versionsverlauf | Liste v1, v2 und so weiter | Entfällt | Nur anhängend und unveränderlich. | Entfällt |
| Neue Version: Gültigkeitsdatum | Datum | Pflicht | | Heute |
| Neue Version: Block, Objektträger, Feuchtgewebe in Tagen | Ganze Zahlen größer als 0 | Pflicht, alle drei | | Keine |
| Neue Version: Quelle / Zitat | Text | Pflicht | | Keine |
| Rückwirkend auf das gesamte derzeit gelagerte, nicht entsorgte Material anwenden | Kontrollkästchen | Optional | Nur für Verlängerungen. | Aus |
| Neue Version veröffentlichen | Schaltfläche | Entfällt | Fügt die Version hinzu. | Entfällt |
| Gesamten Versionsverlauf löschen | Schaltfläche | Entfällt | Entfernt den Verlauf. | Entfällt |

Vorbelegte Stellen: CAP (US, eingeschaltet, Synchronisierung an), RCPath (GB_EW, GB_SCT, GB_NIR, eingeschaltet, Synchronisierung an), ICCR (eingeschaltet, Synchronisierung an, keine Aufbewahrungsfristen), RCPA (AU, NZ, ausgeschaltet), CAP-ACP (CA, eingeschaltet, Synchronisierung aus), EU (ISO 15189; BE, NL, DE, FR, ausgeschaltet) und KR (MSA, ausgeschaltet).

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Bearbeiten und speichern: `platform:governing-bodies:manage` (nur Plattform, hohes Risiko). Der Superadmin besitzt sie standardmäßig, keine andere eingebaute Rolle.

**Bekannte Grenzen.** Die Auto-Synchronisierung wird gespeichert, aber nichts anderes liest sie, und die nächtliche Protokollsynchronisierung, die der Untertitel der Seite erwähnt, ist Geplant. Jede Aufbewahrungsversion trägt als Autor „super-admin“ ein, wer auch immer sie veröffentlicht hat.
