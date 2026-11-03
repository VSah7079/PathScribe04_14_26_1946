---
chapter: 7
id: ch7
title: Stufe 6: Schnittstellen-Engine und Anbindung externer Systeme
---

# Stufe 6: Schnittstellen-Engine und Anbindung externer Systeme {#ch7}

Dieses Kapitel beschreibt, wie PathScribe Nachrichten mit anderen Systemen austauscht: mit der elektronischen Patientenakte (EHR) des Krankenhauses, mit einem Laborinformationssystem (LIS), mit Referenzlaboren, mit Abrechnungssystemen, mit Registern und mit Berichtswerkzeugen. Es beschreibt auch die Bildschirme, mit denen eine Administratorin oder ein Administrator diesen Austausch überwacht und fehlgeschlagene Nachrichten bearbeitet.

Lesen Sie den Status jedes Teils, bevor Sie ein Projekt darauf aufbauen. Ein großer Teil dieser Stufe ist ein geschriebener Vertrag und eine umgesetzte Browserseite, während der Server und die Schnittstellen-Engine auf der Gegenseite noch nicht verbunden sind. Wo etwas nicht umgesetzt ist, steht im Abschnitt **Nicht umgesetzt** oder **Geplant**, und der Abschnitt nennt das, was dem am nächsten kommt und tatsächlich vorhanden ist.

**Die Regel dieses Kapitels.** PathScribe entscheidet, was gesendet wird und wann. Die Schnittstellen-Engine entscheidet, wie: den HL7-Text, die Verbindung, die Wiederholungen auf der Leitung und die herstellereigene Wortwahl. PathScribe übersetzt nie die Feldnamen oder Codes eines Herstellers und gibt sich für kein EHR als zertifizierter Konnektor aus.

## Die Einrichtungsreihenfolge für Stufe 6 {#ch7-order}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

Stufe 6 ist größtenteils optional. Ein Labor, das PathScribe allein betreibt, ohne LIS, ohne Register-Feed und ohne Berichtswerkzeug, kann sie vollständig überspringen. Führen Sie die folgenden Schritte nur für die Integrationen aus, die Sie verwenden, und in dieser Reihenfolge. Jeder Schritt nennt die Bildschirme, die zuerst konfiguriert sein müssen (Stufen 1 bis 5); dieselbe Information steht im Kasten „Einrichtungsreihenfolge“ auf jedem Bildschirm.

1. [Probencode-Zuordnung](#screen-crosswalk): Ordnen Sie die eigenen Probencodes jeder einsendenden Einrichtung Ihrem Probenverzeichnis zu, damit eingehende Aufträge aufgelöst werden. Benötigt das Einrichtungsverzeichnis und das Probenverzeichnis.
2. [Schnittstellenwörterbuch](#screen-interface_dictionary) (nur Mitarbeitende von ForMedrixAI): Beschreiben Sie die eigenen Felder eines Herstellers. Kunden führen diesen Schritt nicht aus; er ist aufgeführt, damit die Nummerierung vollständig ist.
3. [LIS-Eingang (Assist-Modus)](#screen-assist_lis_polling): für ein Labor, dessen LIS den Fall führt und in dem PathScribe mit KI-Entwürfen unterstützt. Benötigt KI-Verhalten und die Synoptik-Bibliothek.
4. [Berichts-Feed (Power BI)](#screen-bi_feed): Ein Berichtswerkzeug darf PathScribe-Daten lesen. Benötigt die durchführenden Einrichtungen im Einrichtungsverzeichnis.
5. [Migrations-Feldzuordnungen](#screen-migration_field_mappings): Ordnen Sie die Feldnamen eines Altsystems zu, vor jedem Import historischer Daten.
6. [Historische Datenmigrations-Aufträge](#screen-migration-jobs): Importieren Sie eine Datei aus einem Altsystem und prüfen Sie den Auftrag. Benötigt Schritt 5.
7. [Auftragsschein-Import](#screen-requisition_ingestion): stapelweise gescannte Papier-Auftragsscheine über den Barcode jeder Seite ihrem Fall zuordnen. Erfordert den Ablageordner des Scanners (oder das System, das Scans sendet).

Die Überwachungsbildschirme ([Systemprotokolle: Schnittstellen](#screen-audit-interfaces), [Schnittstellen-Engines](#screen-interface-engines), [Ausgehende Schnittstellen-DLQ](#screen-outbound-interface-dlq), [Ausgehende Sendungen](#screen-outbound-dispatches) und die [Ausgangswarteschlange](#screen-outbound-queue)) und die Testwerkzeuge ([Vorschau ausgehender Schnittstellennachrichten](#screen-outbound_message_preview), [Simulierter Postausgang](#screen-simulated_mail), [Simulierte Schnittstellen-Engine](#screen-mock-interface-engine) und [Simuliertes EMR](#screen-mock-emr)) sind keine Einrichtungsschritte. Jeder von ihnen nennt `Reference, not part of setup` und führt auf, was vorhanden sein muss, damit er Daten anzeigt.

## Was diese Stufe enthält und was nicht {#ch7-status}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

| Teil der Gliederung | Status | Was heute vorhanden ist |
|---|---|---|
| Architektur der Schnittstellen-Engine | Teilweise | Der Nachrichtenvertrag und die Browserseite sind umgesetzt. Die Engine (BridgeLink) und die dafür nötigen Server-Endpunkte sind Geplant. Siehe [Wie sich die Schnittstellen-Engine einfügt](#ch7-architecture). |
| Ausgehendes HL7 v2.x (ADT, ORU, ORM) | Teilweise | PathScribe sendet eine JSON-Nachricht, die die Engine in HL7 umwandelt; ausgenommen sind drei Nachrichten, die es selbst als HL7-Text aufbaut. Siehe [Nachrichtentypen](#ch7-hl7-types). |
| Eingehendes HL7 v2.x | Teilweise | Die Prozessoren sind vorhanden, und Sie können sie mit eingefügten Nachrichten testen. Noch empfängt kein Listener eine echte HL7-Nachricht. |
| FHIR-R4-Endpunkt und OAuth2-Client-Credentials | Nicht umgesetzt | Kein Endpunkt und kein Einrichtungsbildschirm. Siehe [FHIR R4 und OAuth2](#ch7-fhir). |
| EHR-Integration (Epic, Cerner, MEDITECH, AthenaHealth) | Nicht umgesetzt | Kein Herstellerkonnektor, weder zertifiziert noch nicht zertifiziert. Siehe [EHR-Integration](#ch7-ehr). |
| Versand an Referenzlabore und Rückempfang | Teilweise | Weiterleitungsmanifeste werden gesendet, und eine Ergebnisnutzlast wird verarbeitet. Noch empfängt kein Eingangs-Endpunkt ein Ergebnis. Siehe [Schnittstellen zu Referenzlaboren](#ch7-reflab). |
| Schnittstellenüberwachung, Fehlerwarteschlangen und erneute Verarbeitung | Umgesetzt (Browserseite) | Die Bildschirme und ihre Funktionen arbeiten. Der Heartbeat der Engine und die Wiederholungen auf Seiten der Engine sind Geplant. Siehe [Überwachung](#ch7-monitoring). |

## Wie sich die Schnittstellen-Engine einfügt {#ch7-architecture}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

**Status:** Teilweise

### Der Begriff „PathScribe Interface Engine“ {#ch7-pie-term}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

Die Gliederung dieses Handbuchs nennt die Schnittstellenschicht PathScribe Interface Engine (PIE). Dieser Name kommt im Produkt, in seinen Bildschirmen und in seinen Entwurfsdokumenten nicht vor, und dieses Handbuch erfindet keinen Produktnamen. Das Produkt hat zwei Bestandteile, die zusammen die Aufgabe erfüllen, die die Gliederung beschreibt:

- **Die PathScribe-Seite.** Dienste in der Anwendung entscheiden, was gesendet wird und wann, bauen die JSON-Nachricht auf, stellen sie in die Warteschlange, zeichnen das Ergebnis auf und lassen eine Administratorin oder einen Administrator die Nachricht erneut senden, zurückhalten oder freigeben. Alles in diesem Kapitel, was Sie anklicken können, liegt auf dieser Seite.
- **Die Schnittstellen-Engine.** Der Entwurf verwendet BridgeLink, eine Open-Source-Abspaltung von Mirth Connect, als Engine. Sie wandelt das JSON von PathScribe in HL7 (oder ein anderes Format) um, führt einen eigenen Nachrichtenspeicher, sendet an das empfangende System und empfängt Antworten. BridgeLink ist der Arbeitsname in den Entwurfsdokumenten (`INTERFACE_ENGINE_EDGE.md`). Die Kanalvorlagen sind Geplant, nicht umgesetzt.

### Wo die Engine läuft {#ch7-hosting}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

Die Engine ist ein Container-Image, das an zwei Orten verwendet wird, wählbar je Krankenhaus (Entscheidung D6). ForMedrixAI kann sie in der Region des Mandanten hosten, oder sie kann auf einer virtuellen Maschine im Krankenhaus installiert werden. Der Bildschirm [Schnittstellen-Engines](#screen-interface-engines) zeigt, welcher der beiden Fälle auf jede Engine zutrifft (**Gehostet** oder **Vor Ort**). Das Image, seine Kanalvorlagen und seine Health-Endpunkte sind Geplant, beim Serverteam.

HL7-Nachrichten laufen nicht über den SQL-Server-Nachrichtenbus (Entscheidung D1). Der API-Server übergibt eine Nachricht als Auftrag der Art `interface.dispatch` an die Engine, und die Engine hält HL7 in ihrem eigenen Nachrichtenspeicher.

### Was heute läuft und was Geplant ist {#ch7-today}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

| Bestandteil | Status | Was das für Sie bedeutet |
|---|---|---|
| Ausgehende Nachrichten, JSON-Umschlag | Umgesetzt (Browserseite) | Der Browser sendet `{queueEntryId, transactionType, dispatchedAt, payload}` per POST an die Adresse in der Build-Einstellung `VITE_INTERFACE_RECEIVER_ENDPOINT`. In einem Produktions-Build muss die Adresse `https` sein; eine fehlende Adresse oder eine Adresse mit einfachem HTTP wird abgelehnt, bevor etwas gesendet wird. Die Wartezeit beträgt 15 Sekunden. |
| Was als gesendet gilt | Umgesetzt (Browserseite) | Jede 2xx-Antwort markiert die Nachricht als gesendet. Es gibt noch keine HL7-Bestätigung (ACK). Ein Zeitlimit, eine nicht erreichbare Engine und eine Ablehnung sind drei verschiedene Fehler auf den Bildschirmen. |
| Demonstrations-Build | Demonstration | Ist keine Engine-Adresse eingestellt, empfängt eine simulierte Engine jede Nachricht und hält sie in einer Liste. Siehe [Simulierte Schnittstellen-Engine](#screen-mock-interface-engine). |
| Eingehende Ereignisse von Geräten | Umgesetzt (Browserseite) | Für die Cassette Engine gibt es vier Webhooks: Blockausnahme, Ergebnis des Kassettenversands, Materialstandort und Status des Gravurgeräts. Sie verwenden ein gemeinsames Geheimnis im Header `X-API-Key`, mit optionaler HMAC-Signatur. |
| Eingehende HL7-Nachrichten | Nicht umgesetzt | Die Prozessoren für ADT und Patientenverwaltung sind vorhanden und getestet, aber nichts empfängt eine echte HL7-Nachricht und ruft sie auf. |
| Server-Endpunkte für die Engine (`POST /api/interface/inbound`, `POST /api/interface/outbound-acks`, `POST /api/interface/heartbeat`, `GET /api/interface/engines`) | Geplant | Als Vertrag geschrieben (Phase 2e). Sie ergänzen Übergabe, durch Bestätigung abgeschlossene Ergebnisse, Wiederholungsfenster, Dead Letters und den Engine-Status. |
| Zugangsdaten je Mandant für die Engine | Geplant | OAuth2-Client-Credentials oder gegenseitiges TLS je Mandanten-Engine. Siehe [FHIR R4 und OAuth2](#ch7-fhir). |

**Geplante Wiederholungsfenster.** Der Vertrag sieht vor, dass eingehende Nachrichten 10 Sekunden, 30 Sekunden, 1 Minute, 5 Minuten und dann 15 Minuten warten, mit einem Dead Letter nach 24 Stunden. Ausgehende Nachrichten werden nach 1, 5, 15 und 60 Minuten erneut gesendet, danach stündlich, 24 Stunden lang. Registermeldungen werden 72 Stunden aufbewahrt. Eine Bestätigung AA wird gesendet; CA wird gesendet oder wartet auf die Anwendungsbestätigung; AR und CE werden innerhalb des Fensters wiederholt; AE und CR schlagen sofort fehl. Ein als Dead Letter abgelegtes Ergebnis hält spätere Nachrichten zum selben Fall zurück. Nichts davon läuft bisher. Heute wartet eine fehlgeschlagene Sendung darauf, dass eine Administratorin oder ein Administrator sie erneut sendet.

### Einrichtungs-Schnittstelleneinstellungen, die gespeichert, aber nicht verwendet werden {#ch7-facility-settings}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

Der Einrichtungseditor (Stufe 1, [Einrichtungsverzeichnis](#screen-facility-dictionary)) hat die Registerkarte **LIS-Integration**. Sie speichert eine Engine-Adresse, die HL7-Version, die Authentifizierungsart (keine, Basic, OAuth2 oder API-Schlüssel), ein Kennzeichen, das angibt, ob eine Zugangsberechtigung bereitgestellt wurde, ob das LIS die Fallstatus führt, ob PathScribe Aktionen nach der Finalisierung zulässt, sowie die Routing-Kennungen für die sendende und die empfangende Einrichtung und eine Überschreibung des ausgehenden Kanals. Diese Einstellungen werden mit der Einrichtung gespeichert. Heute liest sie kein Sendeweg. Eine Nachricht geht an die eine Adresse auf Ebene der Bereitstellung, die oben genannt ist. Die Zugangsberechtigung wird nie gespeichert: nur ein Kennzeichen Ja/Nein.

## Eingehendes und ausgehendes HL7 v2.x {#ch7-hl7}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

**Status:** Teilweise

### Nachrichtentypen {#ch7-hl7-types}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

Es gibt keinen Bildschirm, der Nachrichtentypen ein- oder ausschaltet. Die folgenden Typen sind durch das Produkt festgelegt. Dieser Teil führt nur auf, was der Code unterstützt. Was nicht aufgeführt ist, wird nicht unterstützt.

**Ausgehend.** PathScribe stellt diese Transaktionstypen in die Warteschlange. Die Engine baut das HL7 für alle auf, außer für die drei mit „PathScribe baut HL7 auf“.

| Transaktionstyp | Was er enthält | HL7-Form |
|---|---|---|
| `A08` | Aktualisierung der Patientenstammdaten | Engine baut ADT^A08 auf. Das Geschlecht wird in PID-8 als M, F, U oder A für unbestimmt gesendet (der Code A ist eine Annahme, die noch mit den empfangenden Systemen bestätigt werden muss). Für Standorte im Vereinigten Königreich lautet der NHS-Code M zu 1, F zu 2, I zu 9, U zu X. |
| `A40` | Zusammenführung von Patienten | Engine baut ADT^A40 auf |
| `A47` | Änderung der Patientenkennung | Engine baut ADT^A47 auf |
| `ORU_R01` | Endgültiger, ergänzter oder korrigierter Pathologiebefund | Engine baut ORU^R01 auf. Für die elektronische Pathologiemeldung in den USA (Stufe 7) baut PathScribe selbst eine ORU^R01 v2.5.1 auf. |
| `LIS_SYNC` | Falldaten und das synoptische Ergebnis eines Assist-Falls, für das LIS | Engine baut sie auf |
| `ORDER_CREATED` | Ein neuer Auftrag | Engine baut sie auf |
| `ACCESSION_EVENT` | Ein Auftrag, dessen Probeneingang erfolgt ist, oder ein Mangel beim Probeneingang | Engine baut sie auf |
| `REGISTRY_REPORT`, `CANCER_REGISTRY_REPORT` | Registermeldungen (Stufe 7) | Engine baut sie auf. Bestätigungen kommen zurück. |
| `REPORT_DELIVERY` | Ein signierter Befund als PDF für Telefax oder Dateiablage | Engine oder Zustelldienst |
| `PRINT_JOB` | Ein Befund als PDF, den die Engine drucken soll | Engine |
| `REFERRAL_MANIFEST` | Das Manifest eines Weiterleitungsstapels für ein Referenzlabor | Engine baut sie auf. Ergebnisse kommen zurück. |
| `MOLECULAR_ORDER` | Ein Auftrag für einen molekularen Assay oder ein Geräteauftrag | Engine baut sie auf |
| `WSI_SCAN_MANIFEST` | Die Objektträger, die in einen Scanstapel für Whole-Slide-Imaging geladen sind | Engine baut sie auf. Der Scanstatus der Objektträger kommt zurück. |
| `BLOCK_ORDER` | Die Färbeaufträge eines Blocks für ein Einbett- oder Färbegerät | PathScribe baut HL7 auf: ORM^O01 |
| `SLIDE_ORDER`, `SPECIMEN_LABEL` | Ein Objektträgerauftrag; ein Etikett für ein Probengefäß | Engine baut sie auf |
| `MATERIAL_SCAN_EVENT` | Ein Barcode-Scan einer Kassette oder eines Objektträgers | Engine baut sie auf |
| `CHARGE_DFT` | Eine Leistung für das Abrechnungssystem | PathScribe baut HL7 auf: DFT^P03 |
| `CHARGE_JSON` | Eine Leistung als JSON-Webhook für die Abrechnung | JSON, kein HL7 |
| `FINANCIAL_CLASS` | Nutzlast der Kostenträgerklasse für eine Abrechnungs-Engine | Eine Vorschau-Nutzlast, bis die Formate vorliegen |
| `CRITICAL_ALERT` | Kanäle für kritische Warnungen nach dem Produktivstart | Nicht angeschlossen. Heute erzeugt nichts diesen Typ. |

Das „ORM“ der Gliederung ist daher die ORM^O01, die PathScribe für Blockaufträge an ein Gerät aufbaut. PathScribe selbst baut keine ORM für ein EHR oder ein LIS auf. Die Engine entscheidet, welches HL7 aus einer Nachricht „Auftrag angelegt“ wird, und es gibt keinen Bildschirm, um einen Nachrichtentyp hinzuzufügen.

**Eingehend.** Diese Prozessoren sind in der Anwendung vorhanden. Keiner ist mit einem echten Listener verbunden, ausgenommen die oben genannten Geräte-Webhooks. In der Demonstrationsversion können Sie eine eingefügte Nachricht mit der [Simulierten Schnittstellen-Engine](#screen-mock-interface-engine) durch sie laufen lassen.

| Familie | Nachrichten | Status |
|---|---|---|
| Aufnahme, Entlassung und Verlegung (`adtParser.ts`) | A01, A03, A04, A08, A02, A09, A10, A05, A06, A07, A11, A12, A13, A31 | Prozessor umgesetzt; kein Listener |
| Patientenverwaltung (`patientManagementParser.ts`) | A40 Zusammenführung, A24 Verknüpfung, A47 Änderung der Kennung, A43 Verschiebung | Prozessor umgesetzt; kein Listener. Eine Nachricht, die nicht zugeordnet werden kann, wird als Schnittstellenausnahme in die Warteschlange gestellt, nie geraten. |
| Besuchsänderungen (`processVisitMessage.ts`) | A45, A50, A34 | Prozessor umgesetzt; kein Listener |
| Auftragsstatus des LIS (der Assist-Adapter) | ORU^R01, ORM^O01, OML^O21 | Nur Status. Sie können eine in den [LIS-Eingang (Assist-Modus)](#screen-assist_lis_polling) einfügen. |
| JSON-Ereignisse | HPV-Ergebnis, Blockausnahme, Materialstandort, Weiterleitungsergebnis, Ergebnisse molekularer Läufe, Scanstatus von Whole-Slide-Scans | Prozessoren umgesetzt; die Geräte-Webhooks sind der einzige aktive Weg |

**Eingehende Aufträge werden nicht aus HL7 gelesen.** Der Dienst für die Auftragsannahme nimmt einen strukturierten Auftrag entgegen, keine ORM-Nachricht, daher wird ein echter HL7-Auftrag aus einem EHR heute nicht angenommen. Die [Probencode-Zuordnung](#screen-crosswalk) löst die Codes eines Auftrags auf, sobald er den Dienst erreicht.

**Herstelleradapter.** Die Adapter für Cerebro und Vantage sind bewusst Platzhalter, die nichts tun.

### Probencode-Zuordnung {#screen-crosswalk}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Auftragstypen & Eingangsregeln

**Status:** Umgesetzt

**1. Navigation:** Registerkarte **System** der Konfiguration > Gruppe **Integrationen**
**2. Wartungspunkt:** Auftragstypen & Eingangsregeln (der Menüname). Der Titel auf dem Bildschirm lautet **Probencode-Zuordnung**.

**3. Fachlicher Zweck und Umfang.** Ein sendendes System verwendet eigene Codes für Proben, und derselbe Code kann bei verschiedenen sendenden Systemen Verschiedenes bedeuten. Dieser Bildschirm ordnet den Code jeder einsendenden Einrichtung genau einem Eintrag des Probenverzeichnisses zu. Jeder eingehende Auftrag wird gegen diese Tabelle geprüft. Passt kein Eintrag, blockiert PathScribe den Auftrag nicht. Es legt einen Eintrag mit der Markierung **Automatisch gelernt: Überprüfung ausstehend** an, legt einen ausstehenden Eintrag im Probenverzeichnis an, damit der Auftrag weiterlaufen kann, und stellt eine Schnittstellenausnahme der Art `unmapped_order_code` in die Warteschlange, die eine Person bearbeiten muss. Sie prüfen die automatisch gelernten Einträge hier oder legen vorab einen echten Eintrag an, damit ein bekannter Code nie gelernt werden muss.

**4. Voraussetzungen und Abhängigkeiten.** Die Liste **Einrichtung** ist das Einrichtungsverzeichnis, und die Liste **Löst auf zu** ist das Probenverzeichnis; beide werden daher zuerst eingerichtet. Wenn Sie das auslassen, sind die Listen leer, und eine Zuordnung kann nicht gespeichert werden, weil Einrichtung, externer Code und Probentyp alle erforderlich sind.

Setup step: Tier 6, step 1
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary), [Probenverzeichnis](#screen-specimens)
Unlocks: [Systemprotokolle: Schnittstellen](#screen-audit-interfaces)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-crosswalk - Liste der Probencode-Zuordnung mit den Schaltflächen Zuordnung hinzufügen, Tabelle importieren und Exportieren]

**6. Feldreferenz.**

Die Liste.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Einrichtung | Text (schreibgeschützt) | Nicht zutreffend | Die sendende Einrichtung, von der der Code stammt. | Nicht zutreffend |
| Externer Code | Text (schreibgeschützt) | Nicht zutreffend | Der eigene Probencode des sendenden Systems. | Nicht zutreffend |
| Löst auf zu | Text (schreibgeschützt) | Nicht zutreffend | Der Eintrag des Probenverzeichnisses, dem der Code zugeordnet ist. | Nicht zutreffend |
| Quelle | **Vom Administrator bestätigt** oder **Automatisch gelernt: Überprüfung ausstehend** | Nicht zutreffend | **Automatisch gelernte** Einträge wurden vom System angelegt, als kein Eintrag passte. Ein Zählerbanner über der Liste nennt, wie viele auf Überprüfung warten. | Nicht zutreffend |
| Banner Prüfung ausstehend | Anzahl und Link | Nicht zutreffend | Wird angezeigt, wenn Ausnahmen zu nicht zugeordneten Auftragscodes ausstehen. Der Link **Nicht zugeordnete Platzhalter in der Prüfwarteschlange anzeigen** öffnet die Systemprotokolle, Schnittstellen, gefiltert auf `unmapped_order_code`. | Ausgeblendet, wenn die Anzahl 0 ist |
| Zuordnung hinzufügen | Schaltfläche | Nicht zutreffend | Öffnet das Fenster Zuordnung hinzufügen. | Nicht zutreffend |
| Tabelle importieren | Schaltfläche, CSV-Datei | Nicht zutreffend | Liest eine CSV-Datei mit den Spalten Facility, ExternalCode und ResolvesTo und zeigt eine Vorschau, bevor etwas gespeichert wird. | Nicht zutreffend |
| Exportieren | Schaltfläche | Nicht zutreffend | Lädt `SpecimenCodeCrosswalk.csv` mit den Spalten Facility, ExternalCode, ResolvesTo und Source herunter. Der Export wird im Prüfprotokoll aufgezeichnet. | Nicht zutreffend |

Das Fenster Zuordnung hinzufügen.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Einrichtung | Auswahlliste aus dem [Einrichtungsverzeichnis](#screen-facility-dictionary) | Pflicht | Die sendende Einrichtung. Derselbe Code bei zwei verschiedenen Einrichtungen ist zulässig. | Leer |
| Externer Code | Text | Pflicht | Der Code genau so, wie der Absender ihn verwendet. Beim Abgleich wird Groß- und Kleinschreibung ignoriert. Der Platzhalter zeigt `TISSUE-01`. | Leer |
| Standort (optional) | Auswahlliste der Standorte oder **Alle Standorte** | Optional | Beschränkt die Zuordnung auf einen Standort. Eine neue Zuordnung, die ohne Standort gespeichert wird, gilt für alle Standorte. | Alle Standorte |
| Löst auf zu Probentyp | Durchsuchbare Auswahlliste aus dem [Probenverzeichnis](#screen-specimens), die Namen und Synonyme durchsucht | Pflicht | Der Eintrag, der aus einem Auftrag mit diesem Code wird. | Leer |
| Zuordnung speichern | Schaltfläche | Nicht zutreffend | Wird mit einer Meldung abgelehnt, wenn dieselbe Einrichtung, derselbe Code und derselbe Standort bereits einem Eintrag zugeordnet sind („Facility already maps external code to entry“). | Nicht zutreffend |

Die Tabellenvorschau.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Zusammenfassungszeile | Text | Nicht zutreffend | Bereite Zeilen, wie viele eine bestehende Zuordnung aktualisieren, wie viele neu sind und wie viele wegen Fehlern übersprungen werden. | Nicht zutreffend |
| Zeilenfehler | Textliste | Nicht zutreffend | Ein Einrichtungsname, der zu keiner Einrichtung passt, ein leerer externer Code oder ein Probenname, der zu keinem Eintrag des Probenverzeichnisses passt. Namen werden über den Namen abgeglichen, ohne Beachtung der Groß- und Kleinschreibung. Eine Zeile mit einem Fehler wird übersprungen, nie geraten. | Nicht zutreffend |
| Import anwenden | Schaltfläche | Nicht zutreffend | Speichert jede Zeile ohne Fehler. Eine Zeile, deren Einrichtung und Code bereits existieren, aktualisiert den Probentyp dieser Zuordnung. Importierte Zeilen haben keinen Standort. | Deaktiviert, wenn jede Zeile einen Fehler hat |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Zuordnungen hinzufügen, importieren und aktualisieren: `config:crosswalk:manage` (hohes Risiko). Admin und Laborleitung haben sie standardmäßig; Superadmin hat jede Berechtigung außer `config:ai-prompt:approve`, die aus Gründen der Funktionstrennung vorenthalten wird (die Laborleitung gibt KI-Anweisungen frei; der Support von ForMedrixAI nie). Ohne sie ist der Bildschirm nur zur Ansicht. Wird eine Ausnahme zu einem nicht zugeordneten Code aus dem Prüffenster heraus bearbeitet, entsteht derselbe Eintrag.

**Bekannte Grenzen.** Der Menüname (**Auftragstypen & Eingangsregeln**) unterscheidet sich vom Titel auf dem Bildschirm (**Probencode-Zuordnung**); beide bezeichnen denselben Bildschirm. In der Liste gibt es kein Bearbeiten und kein Löschen, nur Hinzufügen und die Aktualisierung per Tabelle. Ein echter HL7-Auftrag wird noch von keinem Listener empfangen; die Einträge werden daher verwendet, wenn ein Auftrag den Dienst für die Auftragsannahme erreicht, nicht aus einer Nachricht auf der Leitung.
### LIS-Eingang (Assist-Modus) {#screen-assist_lis_polling}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > LIS-Eingang (Assist-Modus)

**Status:** Teilweise

**1. Navigation:** Registerkarte **System** der Konfiguration > Gruppe **Integrationen**
**2. Wartungspunkt:** LIS-Eingang (Assist-Modus)

**3. Fachlicher Zweck und Umfang.** Im Assist-Modus führt das externe LIS den Fall. Seine Aktualisierungen erreichen PathScribe auf drei Wegen, durch Abfrage, durch eine HL7-v2-Nachricht oder durch einen JSON-Webhook, und alle drei laufen über eine gemeinsame Eingangswarteschlange. Meldet das LIS „Makroskopie abgeschlossen“, wählt die KI die synoptischen Vorlagen und entwirft die Felder, die sie aus dem makroskopischen Text ableiten kann. Meldet das LIS „Mikroskopie/Diagnose abgeschlossen“, entwirft sie den Rest aus der Diagnose. Dieser Bildschirm enthält die Einstellungen, ein Testfeld für eingefügte Nachrichten, die Eingangswarteschlange und das Laufprotokoll.

**Was umgesetzt ist und was nicht.** Umgesetzt: die Einstellungen, die Statuszuordnung, das Testfeld, die Eingangswarteschlange mit ihren Wiederholungen, das Laufprotokoll und die Regeln für die KI-Entwürfe. In der Demonstration simuliert: der Zeitplan (die App fragt im gespeicherten Intervall ab, solange sie geöffnet und die Abfrage eingeschaltet ist, und der Bildschirm zeigt einen Hinweis **Simulierter Zeitplan** mit dem letzten und dem nächsten Lauf) und das LIS, das **Jetzt abfragen** abfragt. Nicht umgesetzt: ein echter Listener für HL7- oder Webhook-Nachrichten und ein Feld für die Adresse des abzufragenden LIS. Der Bildschirm hat kein solches Feld.

**4. Voraussetzungen und Abhängigkeiten.** Der KI-Schritt verwendet die Schalter unter KI-Verhalten und die synoptischen Vorlagen. Gilt **KI in „KI-Verhalten“ ausgeschaltet**, ändert eine Aktualisierung nur den Falltext, und es entsteht kein Entwurf. Verarbeitet wird nur ein Fall im Assist-Modus; ein Fall, der nicht im Assist-Modus ist, wird mit dem Ergebnis **Kein Assist-Fall** übersprungen.

Setup step: Tier 6, step 3
Requires: [KI-Verhalten](#screen-tab-ai), [Synoptik-Bibliothek](#screen-tab-protocols)
Unlocks: [Systemprotokolle: Schnittstellen](#screen-audit-interfaces)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-assist_lis_polling - LIS-Eingang (Assist-Modus) mit Abfrage, Statuszuordnung, Testfeld, Eingangswarteschlange und Aktivität]

**6. Feldreferenz.**

Abfrage und Statuszuordnung.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| LIS nach Zeitplan abfragen | Ja/Nein-Schalter. Die Beschriftung lautet **Geplante Abfrage an** oder **Geplante Abfrage aus**. | Optional | Schaltet die geplante Abfrage ein. Auf dem Produktionsserver läuft der Zeitplan auf dem PathScribe-Server. **Jetzt abfragen** funktioniert unabhängig davon, ob dieser Schalter an oder aus ist. | Aus |
| Abfrage alle (Minuten) | Ganze Zahl von 1 bis 1440 | Pflicht | Der Abstand zwischen geplanten Abfragen. Ein Wert außerhalb des Bereichs oder ein Bruchteil wird mit „Das Intervall muss eine ganze Zahl von Minuten zwischen 1 und 1440 sein.“ abgelehnt. | 5 |
| LIS-Status (jede Zeile) | Text | Pflicht | Eines der eigenen Statuswörter Ihres LIS, zum Beispiel `GROSSED`. Beim Abgleich werden Leerzeichen an den Enden und Groß- und Kleinschreibung ignoriert. Ein leerer Status wird abgelehnt. Derselbe Status darf nicht zweimal aufgeführt werden. | Vier Zeilen, siehe unten |
| Meilenstein (jede Zeile) | Auswahl **Makroskopie abgeschlossen** oder **Mikroskopie/Diagnose abgeschlossen** | Pflicht | Was der Status bedeutet. „Makroskopie abgeschlossen“ löst einen Entwurf der makroskopischen Stufe aus. „Mikroskopie/Diagnose abgeschlossen“ löst einen vollständigen Entwurf aus. Ein Status, der nicht in der Liste steht, löst nichts aus. | Makroskopie abgeschlossen in einer neuen Zeile |
| Entfernen | Schaltfläche | Nicht zutreffend | Entfernt die Zeile. Ohne Zeilen zeigt der Bildschirm „Keine LIS-Status zugeordnet. Nichts löst einen KI-Entwurf aus.“ | Nicht zutreffend |
| + Status hinzufügen | Schaltfläche | Nicht zutreffend | Fügt eine leere Zeile hinzu. | Nicht zutreffend |
| Änderungen verwerfen, Speichern | Schaltflächen | Nicht zutreffend | Beide bleiben deaktiviert, bis sich etwas ändert. Beim Verlassen des Bildschirms mit ungespeicherten Änderungen erfolgt zuerst eine Rückfrage. | Nicht zutreffend |

Die vier Standardzeilen sind `GROSS_COMPLETE` und `GROSSED` (Makroskopie abgeschlossen) sowie `MICRO_COMPLETE` und `DX_COMPLETE` (Mikroskopie/Diagnose abgeschlossen).

Eine eingehende Nachricht testen.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Nachrichtenformat | Auswahl **HL7-v2-Nachricht** oder **JSON-Webhook** | Pflicht | Welcher Adapter den eingefügten Text liest. | HL7-v2-Nachricht |
| Beispiel laden | Schaltfläche | Nicht zutreffend | Füllt das Feld mit einem Beispiel für das gewählte Format. | Nicht zutreffend |
| Eingehende Nachricht | Freitext | Pflicht | Die Nachricht so, wie das LIS sie senden würde. Sie durchläuft denselben Adapter und dieselbe Eingangswarteschlange wie eine echte und wird sofort verarbeitet. Eine Nachricht, die nicht gelesen werden kann, zeigt einen Grund, zum Beispiel „Dies ist keine HL7-v2-Nachricht (sie muss mit einem MSH-Segment beginnen).“ | Leer |
| In die Warteschlange senden | Schaltfläche | Nicht zutreffend | Zeigt „Eingereiht: n · Sofort verarbeitet: n“ oder den Grund. | Nicht zutreffend |

Was die Adapter lesen. Eine HL7-Nachricht muss eine ORU^R01, ORM^O01 oder OML^O21 sein; jeder andere Typ wird abgelehnt. Je OBR-Segment entsteht eine Aktualisierung. Die Eingangsnummer ist OBR-3, sonst OBR-2, sonst ORC-3. Der Status ist ORC-5, sonst OBR-25. Die Zeit ist OBR-22, sonst MSH-7; eine Zeit ohne Zeitverschiebung wird als UTC gelesen, bitten Sie das LIS daher, eine Zeitverschiebung mitzusenden. Der Text stammt aus OBX-5 gemäß dem LOINC-Code in OBX-3: `22634-0` makroskopisch, `22635-7` mikroskopisch und `22637-3` Enddiagnose. Ein JSON-Body ist ein Objekt oder eine Liste; `accession`, `status` und `updatedAt` (ISO 8601) sind erforderlich, `grossText`, `microscopicText`, `diagnosisText`, `placerOrderNumber` und `fillerOrderNumber` sind optional. Die Auftragsnummern werden im synoptischen Ergebnis zurückgegeben.

Eingangswarteschlange.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Zählzeile | Text | Nicht zutreffend | Anzahl der wartenden, fehlgeschlagenen und verarbeiteten Einträge. | Nicht zutreffend |
| Fehlgeschlagene wiederholen | Schaltfläche | Nicht zutreffend | Wiederholt jeden fehlgeschlagenen Eintrag, der weniger als 5 Versuche hatte. Deaktiviert, wenn nichts fehlgeschlagen ist. | Nicht zutreffend |
| Empfangen, Quelle, Eingangsnummer, LIS-Status, Status, Ergebnis, Versuche | Schreibgeschützte Spalten | Nicht zutreffend | Quelle ist **Abfrage**, **HL7-v2-Nachricht** oder **JSON-Webhook**. Der Status ist **Wartend**, **Fehlgeschlagen** oder **Verarbeitet**. Das Ergebnis ist der Ausgang oder der Fehler. Die Eingangsnummer ist als Patientendaten gekennzeichnet, damit sie geschwärzt werden kann. Die Liste zeigt die neuesten 25 Zeilen. Ein Eintrag wird nach 5 Versuchen nicht mehr wiederholt. Die neuesten 200 verarbeiteten Ereignisse werden aufbewahrt. | Nicht zutreffend |

Aktivität.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Jetzt abfragen | Schaltfläche | Nicht zutreffend | Fragt das LIS sofort nach Änderungen ab. | Nicht zutreffend |
| Zeile zum Stand der Abfrage | Text | Nicht zutreffend | „Änderungen bis (Zeit) sind verarbeitet“ oder „Das LIS wurde noch nicht abgefragt.“ | Nicht zutreffend |
| Lauftabelle | Schreibgeschützte Spalten: Zeit, Auslöser, Vom LIS, Neu eingereiht, KI-Entwürfe, Nur Text, Übersprungen, Fehlgeschlagen | Nicht zutreffend | Der Auslöser ist **Jetzt abfragen**, **Zeitplan**, **Eingehende Nachricht** oder **Wiederholung**. Das Protokoll hält die letzten 20 Läufe. | Nicht zutreffend |
| Letzte Abfrage | Schreibgeschützte Spalten: Eingangsnummer, LIS-Status, Meilenstein, Ergebnis, Details | Nicht zutreffend | Eine Zeile je Fall im neuesten Lauf. Ein Ergebnis ist eines von: KI-Entwurf erstellt; Keine Änderung seit dem letzten Entwurf; Fall nicht in PathScribe; Bereits abgezeichnet; Fehlgeschlagen (wird wiederholt); Status nicht zugeordnet; Kein Assist-Fall; Text aktualisiert; KI in „KI-Verhalten“ ausgeschaltet; Text aktualisiert; Entwurf bereits vervollständigt. Die Details nennen neue Entwürfe, vorgeschlagene Felder und zu prüfende Vorlagenänderungen. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Einstellungen speichern: `config:assist-polling:manage` (hohes Risiko). Jetzt abfragen, Testnachricht und Fehlgeschlagene wiederholen: `assist:lis-message:ingest` (hohes Risiko, protokolliert); die geplante Abfrage gehört dem System und wird nicht geprüft. Admin und Laborleitung haben beide standardmäßig.

**Bekannte Grenzen.** Die Abfragequelle und der Zeitplan sind in der Demonstrationsversion simuliert, und kein Listener empfängt eine HL7- oder Webhook-Nachricht von einem echten LIS. Der HL7-Adapter liest den Status aus ORC-5, dann aus OBR-25, und der Quellcode beschreibt dies als Einstellung je Standort, doch der Bildschirm hat dafür kein Bedienelement. Ein abgezeichneter Fall wird nie verändert. Eine späte oder ergänzte Makroskopie nach dem vollständigen Entwurf aktualisiert nur den Text.

### Vorschau ausgehender Schnittstellennachrichten {#screen-outbound_message_preview}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Vorschau ausgehender Schnittstellennachrichten

**Status:** Umgesetzt

**1. Navigation:** Registerkarte **System** der Konfiguration > Gruppe **Integrationen**
**2. Wartungspunkt:** Vorschau ausgehender Schnittstellennachrichten

**3. Fachlicher Zweck und Umfang.** Ein Prüfwerkzeug. Es baut für eine echte Patientin, einen echten Patienten oder einen echten Fall die JSON-Nachricht auf, die PathScribe für die Schnittstellen-Engine in die Warteschlange stellen würde, zeigt sie an und lässt Sie sie als Datei herunterladen. Verwenden Sie es, um einer Schnittstellenanalystin oder einem Schnittstellenanalysten ein echtes Beispiel als Vorlage zu geben oder um zu prüfen, was die Engine erhält, bevor ein Kanal aufgebaut wird. Es sendet nichts und stellt nichts in die Warteschlange. Es zeigt nur vier Nachrichtentypen in der Vorschau: ADT^A08, ADT^A40, ADT^A47 und ORU^R01.

**4. Voraussetzungen und Abhängigkeiten.** Es muss zuvor nichts konfiguriert werden. Es benötigt einen vorhandenen Patientendatensatz (für die ADT-Typen) oder einen Fall mit einem finalisierten synoptischen Befund (für das Ergebnis). Ohne diese meldet der Bildschirm, dass der Patient nicht gefunden wurde oder dass der Paket-Generator nichts zurückgegeben hat.

Setup step: Reference, not part of setup
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-outbound_message_preview - Auswahl des Nachrichtentyps, ID-Felder und die JSON-Ausgabe]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Nachrichtentyp | Auswahl ADT^A08 Demografie-Update, ADT^A40 Patienten zusammenführen, ADT^A47 Kennung ändern, ORU^R01 Pathologiebefund | Pflicht | Bestimmt, welche Felder unten erscheinen. Ein Wechsel leert die Ausgabe. | ADT^A08 |
| Patienten-ID (A08) | Text, eine ID eines Patientendatensatzes | Pflicht für A08 | Der Patient, für den das Demografie-Update aufgebaut wird. Als Patientendaten gekennzeichnet. | Leer |
| Vorherige (zusammengeführte) Patienten-ID (A40) | Text | Pflicht für A40 | Der Datensatz, der zusammengeführt wurde. | Leer |
| Verbleibende Patienten-ID (A40) | Text | Pflicht für A40 | Der Datensatz, der bestehen bleibt. | Leer |
| Vorübergehende Patienten-ID (A47) | Text | Pflicht für A47 | Der vorübergehende Datensatz, dessen Kennung korrigiert wird. | Leer |
| Bestätigte Patienten-ID (A47) | Text | Pflicht für A47 | Der bestätigte Datensatz. | Leer |
| Grundcode (A47) | Text | Pflicht für A47 | Warum sich die Kennung ändert. | Leer |
| Notizen (A47) | Text | Pflicht für A47 | Eine Notiz als Freitext. | Leer |
| Fall-ID (ORU^R01) | Text | Pflicht für ORU | Der Fall. Als Eingangsnummer gekennzeichnet. | Leer |
| Synoptische Instanz-ID (ORU^R01) | Text | Pflicht für ORU | Ein finalisierter synoptischer Befund zu diesem Fall. | Leer |
| Ergebnisstatus (ORU^R01) | Auswahl **Endgültig**, **Korrigiert**, **Nachtrag** | Pflicht für ORU | Der Status des Ergebnisses, dessen Vorschau erstellt wird. | Endgültig |
| Paket-Vorschau | Schaltfläche | Nicht zutreffend | Baut das JSON auf und zeigt es an. Deaktiviert, bis die Pflichtfelder für den gewählten Typ ausgefüllt sind. | Nicht zutreffend |
| JSON herunterladen | Schaltfläche | Nicht zutreffend | Speichert die angezeigte Nachricht als `<type>_<time>.json`. Der Download wird im Prüfprotokoll aufgezeichnet. | Nicht zutreffend |

Auf dem Bildschirm erscheinen zwei Warnungen, und beide treffen zu. Bei A40 und A47 werden die Anzahlen der umgehängten Fälle und Kontakte mit 0 angezeigt, weil die Vorschau die Zusammenführung nicht ausführt. Bei ORU^R01 werden das Befund-PDF und der Befundtext als nicht vorhanden angezeigt, weil sie die Pipeline zur Befunddarstellung benötigen, die dieser Bildschirm nicht hat. Jedes andere Feld hat die Form, in der die Engine es erhalten würde. Die ORU-Vorschau setzt außerdem voraus, dass der Fall im Berichtsmodus des Orchestrators ist, und ein fehlendes PDF wird mit „Für dieses Ergebnis ist kein Befund-PDF verfügbar“ gemeldet.

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Eine Vorschau erstellen und herunterladen: `config:interface-preview:view` (hohes Risiko). Admin und Laborleitung haben sie standardmäßig.

**Bekannte Grenzen.** Der eigene Untertitel des Bildschirms lautet „PathScribe never builds or sends HL7 itself“. Das ist nicht ganz zutreffend: PathScribe baut HL7 für Blockaufträge (ORM^O01), für Leistungen (DFT^P03) und für Ergebnisse der elektronischen Pathologiemeldung in den USA auf. Dieser Bildschirm zeigt nur das JSON in der Vorschau. Die vier Typen sind die einzigen, die er in der Vorschau zeigen kann; die übrigen Transaktionstypen unter [Nachrichtentypen](#ch7-hl7-types) können hier nicht in der Vorschau gezeigt werden. Die gesendete Nachricht ist nachträglich bei Ereignissen zur Auftragsanlage unter [Ausgehende Sendungen](#screen-outbound-dispatches) einsehbar.

### [FORMEDRIXAI INTERNAL ONLY] Schnittstellenwörterbuch {#screen-interface_dictionary}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Schnittstellenwörterbuch

> 🔒 **Interne eingeschränkte Einstellung von ForMedrixAI**
> **Geltungsbereich:** Nur für interne Service- und Bereitstellungsmitarbeitende.
> **Erläuterung:** Ein Anbieterprofil legt fest, welche Felder der eigenen HL7-, JSON- oder FHIR-Nachricht eines Anbieters als Erweiterungsfelder in einen Fall übernommen werden. Ein falsches oder ohne Test geändertes Profil würde einen falschen Wert in einen Fall schreiben oder einen erforderlichen Wert auslassen, und der Falldatensatz ist ein medizinischer Datensatz. Nur Mitarbeitende von ForMedrixAI erstellen und veröffentlichen Profile, daher wird jedes an einem echten Beispiel getestet und versioniert. Die drei Funktionen, die ihn schützen, gelten nur für die Plattform, sind der Rolle Superadmin vorbehalten und von einem Krankenhaus nicht zuweisbar. Der Abschnitt ist für niemanden sichtbar, der sie nicht hat.

**Status:** Teilweise

**1. Navigation:** Registerkarte **System** der Konfiguration > Gruppe **Integrationen**
**2. Wartungspunkt:** Schnittstellenwörterbuch

**3. Fachlicher Zweck und Umfang.** Das Schnittstellenwörterbuch enthält Anbieterprofile. Ein Profil gibt für einen Anbieter oder ein Gerät und einen Nachrichtentyp an, wo in der Nachricht jedes Feld des Anbieters steht und welches Erweiterungsfeld (`ext.name`) am Fall daraus wird, mit einer optionalen Umwandlung, einem Standardwert, einer Code-Übersetzung und einem Kennzeichen „erforderlich“. Ein Profil durchläuft einen festen Lebenslauf: Entwurf, Test, Veröffentlichung und später Zurücksetzen oder Abschalten. Dieselbe Zuordnungs-Engine soll später echte Nachrichten lesen, sodass ein Profil Anbieterfelder ohne ein Code-Release ergänzen kann.

**Umgesetzt und nicht umgesetzt.** Umgesetzt: das Anlegen von Profilen, das Bearbeiten von Zuordnungen, der Test mit einer Beispielnachricht, das Veröffentlichen, das Zurücksetzen, das Abschalten und die Schutzprüfung des Geltungsbereichs. Simuliert: das Feld **Auf einen Fall anwenden**, das eine eingefügte Nachricht auf einen Fall anwendet, damit das Feld für Anbieterfelder zu sehen ist. Ein Banner sagt „Nothing is received from a vendor in this build.“ Es sind keine Anbieterprofile vorbelegt, daher beginnt die Liste leer. Ein Profil kann nur ein Erweiterungsfeld füllen. Alles andere erfordert ein Code-Release (siehe die Tabelle zum Geltungsbereich unten).

**4. Voraussetzungen und Abhängigkeiten.** Keine in diesem Handbuch. Zum Testen wird eine Beispielnachricht des Anbieters benötigt.

Setup step: Tier 6, step 2
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-interface_dictionary - Liste der Anbieterprofile, Zuordnungseditor, Testfeld und Versionen]

**6. Feldreferenz.**

Neues Anbieterprofil.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Anbieter oder Gerät | Text | Pflicht | Der Name des Anbieters. Ein bereits verwendeter Name wird abgelehnt. | Leer |
| Nachrichtenformat | Auswahl **HL7 v2**, **JSON**, **FHIR** | Pflicht | Bestimmt die Schreibweise der Stelle in jeder Zuordnung. | HL7 v2 |
| Nachrichtentyp | Text. Platzhalter: `ORU^R01` (HL7), `Observation` (FHIR), bei JSON optional | Pflicht bei HL7 und FHIR | Ein HL7-Profil braucht einen Typ wie `ORU^R01`. Ein FHIR-Profil braucht einen Ressourcentyp wie `Observation`. Eine Nachricht eines anderen Typs wird abgelehnt. | Leer |
| Profil anlegen | Schaltfläche | Nicht zutreffend | Legt das Profil ohne eine Live-Version an. | Nicht zutreffend |

Eine Zuordnung (je eine Zeile in der Arbeitskopie, mit dem Titel **Zuordnung n**).

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Stelle in der Nachricht | Text, in der vom Format verwendeten Form: `ZAB-3` oder `OBX[2]-5.1` (HL7), `result.lotNumber` (JSON), `Observation.component[0].valueString` (FHIR) | Pflicht | Die Stelle des Wertes. Eine Stelle, die nicht in der Form des Formats geschrieben ist, wird abgelehnt. Eine Stelle, die bei einer Gruppe endet statt bei einem Wert, schlägt im Test fehl. Ein Chip **Anbietersegment (Z)** erscheint, wenn eine HL7-Stelle in einem Z-Segment liegt. | Leer |
| Erweiterungsfeld | Text: `ext.` und dann ein Name, der mit einem Kleinbuchstaben beginnt, nur Buchstaben und Ziffern, bis zu 40 Zeichen | Pflicht | Das Feld am Fall, das den Wert erhält. Ein Teil der eigenen Struktur des Falls wird abgelehnt („erfordert ein Code-Release“). Zwei Zuordnungen dürfen nicht dasselbe Feld füllen. | `ext.` |
| Am Fall angezeigter Name | Text | Pflicht | Die Beschriftung, die eine Benutzerin oder ein Benutzer im Feld für Anbieterfelder sieht. | Leer |
| Typ | Auswahl aus Text, Zahl, Datum, Datum und Uhrzeit, Ja / Nein, Code | Pflicht | Der Wert wird im Test gegen den Typ geprüft. | Text |
| Umwandlung | Auswahl aus Keine, Leerzeichen entfernen, Kleinbuchstaben, Großbuchstaben, HL7-Datum nach ISO, HL7-Datum und -Uhrzeit nach ISO | Optional | Die Datumsumwandlungen benötigen den Typ Datum bzw. Datum und Uhrzeit. | Keine |
| Standardwert, falls fehlend | Text | Optional | Wird verwendet, wenn die Nachricht keinen Wert enthält. Er muss zum Typ passen. | Leer |
| Code-Übersetzung | Text: `vendor value = shown value`, durch Kommas getrennt. Beispiel `F=Female, M=Male` | Optional | Jeder Eintrag braucht beide Seiten. Ein Wert ohne Übersetzung zeigt im Test **keine Übersetzung für diesen Wert**. | Leer |
| Erforderlich (ohne den Wert schlägt der Test fehl) | Kontrollkästchen Ja/Nein | Optional | Eine Nachricht ohne Wert für eine erforderliche Zuordnung besteht den Test nicht. | Aus |
| Zuordnung hinzufügen, Entfernen, Zuordnungen speichern | Schaltflächen | Nicht zutreffend | Änderungen gelten nur für die Arbeitskopie. Speichern Sie vor dem Testen oder Veröffentlichen. | Nicht zutreffend |

Test, Veröffentlichung und Versionen.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Beispielnachricht | Freitext (als Patientendaten gekennzeichnet) | Pflicht zum Testen | Ein Beispiel des Anbieters. Es wird nicht gespeichert; nur die Anzahlen werden aufbewahrt. | Leer |
| Test ausführen | Schaltfläche | Nicht zutreffend | Zeigt je Zuordnung das Erweiterungsfeld, den Wert und das Ergebnis: **Zugeordnet**, **Standardwert verwendet**, **Nicht in der Nachricht**, **Erforderlicher Wert fehlt** oder **Problem**. Die Zusammenfassung lautet „Zugeordnet: n, erforderlich fehlend: n, Probleme: n.“ | Nicht zutreffend |
| Veröffentlichen | Schaltfläche | Nicht zutreffend | Benötigt eine gespeicherte Arbeitskopie mit mindestens einer Zuordnung, keine Zuordnungsprobleme und einen bestandenen Test, der neuer ist als die letzte Änderung. Die Live-Version wird zur vorherigen Version. | Nicht zutreffend |
| Versionstabelle | Schreibgeschützt: Version, Status, Wann, Von | Nicht zutreffend | Der Status ist **Entwurf**, **Getestet**, **Live**, **Ersetzt** oder **Abgeschaltet**. | Nicht zutreffend |
| Neuen Entwurf beginnen | Schaltfläche | Nicht zutreffend | Kopiert die Live-Version in eine neue Arbeitskopie. Je Anbieter kann nur eine Arbeitskopie geöffnet sein. | Nicht zutreffend |
| Zurücksetzen | Schaltfläche | Nicht zutreffend | Veröffentlicht die frühere Version als neue Version. | Nicht zutreffend |
| Abschalten | Schaltfläche | Nicht zutreffend | Setzt das Profil außer Dienst, sodass keine Version live ist. | Nicht zutreffend |
| Fall (Auf einen Fall anwenden) | Text, eine Fall-ID (Eingangsnummer) | Pflicht | Der Fall, der die Felder aus der eingefügten Nachricht erhält, gelesen mit der Live-Version. Nur in der Demonstration, mit der Kennzeichnung **Simuliert**. | Leer |

Die Tabelle zum Geltungsbereich auf dem Bildschirm führt auf, was eine Zuordnung leisten kann (die Codes des Anbieters, Datums- und Zeitformate, am Fall angezeigte Namen, zusätzliche JSON- oder FHIR-Elemente, erforderliche Werte und Standardwerte, Testen und Versionierung, die eigenen HL7-Z-Segmente eines Anbieters) und was ein Code-Release erfordert (Patientenidentität, Auftrags- und Eingangsdaten, Proben und Blöcke und Objektträger, Diagnose und Befundinhalt, Abzeichnung und Änderung, Abrechnungs- und Leistungsregeln, Workflow- und Routing-Regeln und ein neuer Nachrichtentyp).

**7. Berechtigungen.** Alle drei gelten nur für die Plattform: `platform:interface-dictionary:manage` (anlegen, bearbeiten, testen, abschalten, zurücksetzen), `platform:interface-dictionary:publish` (veröffentlichen; benötigt manage) und `platform:interface-dictionary:simulate` (in der Demonstration auf einen Fall anwenden; benötigt manage). Nur die Rolle Superadmin hat sie. Ein Krankenhaus kann sie seinen eigenen Rollen nicht erteilen. Ohne manage ist der Abschnitt ausgeblendet. Eine abgelehnte Änderung meldet „Nur ForMedrixAI-Mitarbeitende können Anbieterprofile ändern.“

**Bekannte Grenzen.** Es ist kein Anbieterprofil vorbelegt, und noch keine echte Nachricht wird über ein Profil gelesen. Die Abschnittsüberschrift im Code nennt dies einen Message Mapper; einen solchen Menünamen gibt es nicht.
## FHIR-R4-Endpunkt und OAuth2-Client-Credentials {#ch7-fhir}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

**Status:** Nicht umgesetzt

PathScribe hat keinen FHIR-R4-Endpunkt. Es veröffentlicht keinen FHIR-Server, nimmt keine FHIR-Ressource eines anderen Systems an und hat keinen Bildschirm, um eine FHIR-Basisadresse, eine Client-ID, ein Client-Geheimnis oder eine Token-Adresse zu konfigurieren. Es gibt auch keinen Einrichtungsbildschirm für OAuth2-Client-Credentials. Planen Sie keine Inbetriebnahme, die von einem von beiden abhängt.

Was dem am nächsten kommt und vorhanden ist, damit Sie wissen, worauf sich eine Frage beziehen könnte:

| Was | Was es ist | Status |
|---|---|---|
| Falldienst für eine FHIR-Quelle (`FHIRCaseService.ts`) | Gerüst zum Lesen von Fällen aus einem FHIR-Server. Die Basisadresse ist ein Platzhalter, und die Funktion, die ein Zugriffstoken holt, löst einen Fehler aus. Sie ist an keinen Bildschirm und keine Einstellung angeschlossen. | Nicht umgesetzt |
| FHIR als Nachrichtenformat im [Schnittstellenwörterbuch](#screen-interface_dictionary) | Ein Anbieterprofil kann für eine FHIR-Ressource wie `Observation` geschrieben werden, und der Test liest ein eingefügtes Beispiel. Nichts empfängt eine FHIR-Nachricht von einem Anbieter. | Teilweise, nur ForMedrixAI |
| Authentifizierungsart im Einrichtungseditor | Auf der Registerkarte **LIS-Integration** können Sie `OAuth2` als Authentifizierungsart für die Engine-Verbindung einer Einrichtung wählen. Es ist eine gespeicherte Auswahl. Kein Code liest sie. | Nur gespeichert |
| OAuth2-Client-Credentials oder gegenseitiges TLS für die Engine jedes Mandanten | Der Vertrag dafür, wie sich die Engine gegenüber der PathScribe-API ausweist (`INTERFACE_ENGINE_EDGE.md`). | Geplant |
| Anmeldung der Mitarbeitenden über OpenID Connect (OIDC) | Single Sign-On für Personen, nicht für Nachrichten von System zu System. In Stufe 1 behandelt. | Umgesetzt (Browserseite) |
| Tokens für den [Berichts-Feed (Power BI)](#screen-bi_feed) | Bearer-Tokens, die PathScribe ausstellt, einmal anzeigt und nur als Fingerabdruck aufbewahrt. Sie sind kein OAuth2. | Teilweise |

Die Seite [Simuliertes EMR](#screen-mock-emr) enthält den Hinweis „Die Produktivumgebung nutzt die FHIR-R4-API zur Synchronisierung mit dem LIS.“ Nichts im Code stützt diesen Satz. Betrachten Sie ihn als Entwurfsabsicht.

## EHR-Integration: Epic, Cerner, MEDITECH und AthenaHealth {#ch7-ehr}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

**Status:** Nicht umgesetzt

PathScribe hat für kein EHR einen Konnektor, weder zertifiziert noch nicht zertifiziert. Es ist in keinem Marktplatz eines Herstellers aufgeführt und hat nach den Belegen dieses Handbuchs keine Validierung eines Herstellers bestanden. Alles, was ein EHR sendet oder empfängt, läuft über die Schnittstellen-Engine, die das Schnittstellenteam des Krankenhauses konfiguriert, und PathScribe sieht nur die Nachrichten unter [Nachrichtentypen](#ch7-hl7-types). Beschreiben Sie PathScribe gegenüber einem Kunden nicht als „Epic-zertifiziert“, „Cerner-zertifiziert“ oder Ähnliches.

| EHR | Was in PathScribe vorhanden ist | Was nicht vorhanden ist |
|---|---|---|
| Epic | Eine Voreinstellung für das Kennungsformat mit dem Namen **Epic Beaker** (Eingangsnummer und ein 2D-Barcode-Muster für Objektträger). Einzustellen auf der Registerkarte Kennungsformate des Einrichtungseditors, Stufe 1. | Ein Konnektor, ein Epic-spezifisches Nachrichtenprofil, eine Zertifizierung, eine Registrierung als FHIR-App. |
| Cerner | Eine Voreinstellung für das Kennungsformat mit dem Namen **Cerner PathNet**. | Dasselbe. |
| MEDITECH | Eine Voreinstellung für das Kennungsformat mit dem Namen **MEDITECH**. | Dasselbe. |
| AthenaHealth | Nichts. Der Name kommt im Code, in den Bildschirmen und in den Entwurfsdokumenten nicht vor. | Alles. |

Dieselbe Liste der Voreinstellungen enthält auch Generic, CoPath, Sunquest und Custom. Eine Voreinstellung legt nur fest, welche Muster für Eingangsnummern und Barcodes das Scanfeld erkennt. Sie tauscht mit nichts eine Nachricht aus.

**Wie eine EHR-Integration heute aussieht.** Ein EHR kann PathScribe nur über die Engine erreichen, als ausgehende Nachrichten unter [Nachrichtentypen](#ch7-hl7-types) (Ergebnisse, Patientenaktualisierungen, Auftragsereignisse, Ereignisse beim Probeneingang) und als eingehende Prozessoren, die noch nicht an einen echten Listener angeschlossen sind. Das [Schnittstellenwörterbuch](#screen-interface_dictionary) hat für kein EHR ein vorbelegtes Anbieterprofil. Die [Probencode-Zuordnung](#screen-crosswalk) ordnet die Probencodes eines EHR zu, sobald ein Auftrag den Dienst für die Auftragsannahme erreicht. Die Hoheit über die Patientenidentität behält das EHR: Eine Nachricht A40, A24, A47 oder A43, die nicht zugeordnet werden kann, wird für eine Person als Schnittstellenausnahme in die Warteschlange gestellt, nie geraten. Siehe [Systemprotokolle: Schnittstellen](#screen-audit-interfaces).

### Simuliertes EMR {#screen-mock-emr}
Breadcrumb: Startseite > Simuliertes EMR

**Status:** Demonstration

**1. Navigation:** Ein Fenster, das in der Demonstrationsversion aus einem Fall geöffnet wird, unter der Adresse `/mock-emr?case=<reference>`. Es wird nur aufgebaut, wenn die Demonstrationswerkzeuge eingeschaltet sind (`__DEMO_TOOLS__`); ein Build, der mit einem API-Server spricht, enthält es nicht.
**2. Wartungspunkt:** Simuliertes EMR

**3. Fachlicher Zweck und Umfang.** Ein Ersatz für die Patientenansicht eines EHR, damit eine Demonstration das EMR-Begleitfenster neben einem Fall zeigen kann. Es sucht den Patienten des Falls anhand der Aktennummer in den Demonstrationsfällen und zeigt eine feste klinische Zusammenfassung. Es liest kein echtes EHR und trägt die Kennzeichnung **DEMO: SYNTHETISCHE DATEN**. Passt die Aktennummer zu keinem Patienten, meldet es **Kein Patient gefunden**, statt einen falschen Patienten zu zeigen.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Es benötigt einen Fall mit einem Patienten in den Demonstrationsdaten.

Setup step: Reference, not part of setup
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-mock-emr - Patientenansicht des simulierten EMR mit dem Demo-Kennzeichen]

**6. Feldreferenz.** Eine schreibgeschützte Seite. Nichts darauf kann geändert werden.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Patientenname, MRN, Geburtsdatum, Geschlecht | Text (schreibgeschützt, als Patientendaten gekennzeichnet) | Nicht zutreffend | Aus dem zugeordneten Demonstrationsfall. Das Geburtsdatum lautet „nicht erfasst“, wenn es fehlt. Ein Kennzeichen NHS erscheint, wenn eine NHS-Nummer verifiziert ist. | Nicht zutreffend |
| Aufenthalt, Status, Station | Text (schreibgeschützt) | Nicht zutreffend | Feste Demonstrationswerte (Aufgenommen, Station 4B Urologie). | Fest |
| Klinische Zusammenfassung: Aktive Probleme, Medikamente | Text (schreibgeschützt) | Nicht zutreffend | Fester Demonstrationstext, nicht vom Patienten übernommen. | Fest |
| Integrationshinweis | Text (schreibgeschützt) | Nicht zutreffend | Der Satz über FHIR R4. Siehe den Hinweis unter [FHIR-R4-Endpunkt und OAuth2-Client-Credentials](#ch7-fhir). | Fest |

**7. Berechtigungen.** Es gibt keine Funktion, und die Route hat keine Bildschirmsperre. Die Seite existiert nur in einer Demonstrationsversion.

**Bekannte Grenzen.** Nur synthetische Daten, und die klinische Zusammenfassung ist für jeden Patienten gleich. Es ist keine Integration.

## Schnittstellen zu Referenzlaboren {#ch7-reflab}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

**Status:** Teilweise

Ein Referenzlabor ist eine Einrichtung, an die Sie Proben für ausgelagerte Untersuchungen senden, zum Beispiel molekulare Untersuchungen oder fremdvergebene Immunhistochemie. PathScribe unterstützt den Versand mit einem Manifest und den Rückempfang mit einer Ergebnisnachricht. Die ausgehende Seite ist umgesetzt; die eingehende Seite hat einen Prozessor, aber keinen Endpunkt.

Es gibt keinen Bildschirm namens „Schnittstelle zum Referenzlabor“. Die Einrichtung verteilt sich auf Bildschirme, die Sie bereits haben:

1. **Das Labor als Einrichtung anlegen.** Legen Sie im [Einrichtungsverzeichnis](#screen-facility-dictionary) das Labor an und geben Sie ihm die Rolle **Referenzlabor (Ziel für ausgehende Weiterleitung)**. Diese Rolle macht es als Ziel eines Weiterleitungsstapels wählbar. Angeboten wird nur eine aktive Einrichtung mit dieser Rolle.
2. **Mit den Untersuchungen verknüpfen, die es durchführt.** Im [Diagnosekatalog](#screen-stains) führt eine Untersuchung der Kategorie **Molekular** die Referenzlabore auf, die sie durchführen dürfen, und welches davon das Standardlabor ist. Das Standardlabor muss eines der zugelassenen Labore sein. Die Verknüpfung wird nur für die Kategorie Molekular gespeichert, und ein Zusatzauftrag für diese Untersuchung übernimmt das Standardlabor und bietet nur die zugelassenen Labore an.
3. **Senden.** Weiterleitungsstapel werden in der [Chargenverwaltung](#screen-batch-management) mit dem Verarbeitungsknoten **Externe Weiterleitung** und einer Zieleinrichtung angelegt. Schließt der Stapel den Abgleich ab, stellt PathScribe eine Nachricht `REFERRAL_MANIFEST` in die Warteschlange und legt den Verfolgungsdatensatz automatisch an. Ein Fehler hierbei blockiert nie den Abschluss des Stapels selbst. Das Manifest enthält die Stapel-ID, den Master-Barcode, die Zieleinrichtung, die angeforderte Untersuchung, die Priorität (**STAT** oder **Routine**), die Positionen (Anzeige-ID, Materialart, Eingangsnummer des Falls und Probenetikett) und alle fremdvergebenen molekularen Aufträge. PathScribe entscheidet, was und wann; die Engine entscheidet über den Transport.
4. **Den Versand beobachten.** Die Nachricht erscheint in der [Ausgangswarteschlange](#screen-outbound-queue) unter dem Feed **Zuweisungen** und in der [Ausgehenden Schnittstellen-DLQ](#screen-outbound-interface-dlq) unter der Warteschlange **Versandliste**, wo eine fehlgeschlagene erneut gesendet wird.
5. **Rückempfang.** Eine Ergebnisnachricht (`ReferralResultEventPayload`) enthält die Stapel-ID und entweder ein **diskretes** Ergebnis (Text) oder einen **pdf_attachment** (einen Link zu einem PDF), nie beides, und optional die Ergebnisse zu jedem fremdvergebenen molekularen Auftrag. Der Prozessor prüft die Form, findet den Stapel, zeichnet das Ergebnis auf und markiert den Stapel als **result_received**, und wendet dann kodierte Ergebnisse auf die molekularen Aufträge an. Der Status eines Stapels geht nur vorwärts: versandt, unterwegs, geliefert, Ergebnis empfangen. Eine Person kann „unterwegs“ und „geliefert“ von Hand setzen; „Ergebnis empfangen“ wird nur gesetzt, wenn ein Ergebnis eintrifft.

**Was nicht umgesetzt ist.** Kein Endpunkt empfängt eine Ergebnisnachricht, daher trifft von einem Referenzlabor kein Ergebnis von selbst ein. Der Prozessor merkt sich die Nachrichten-IDs, die er verarbeitet hat, nur im Arbeitsspeicher, sodass ein Neustart sie vergisst. Er gibt eine von vier Antworten zurück: angewendet, bereits angewendet, Verfolgung nicht gefunden oder ungültige Nutzlast. Für ein Weiterleitungsergebnis gibt es in der [Simulierten Schnittstellen-Engine](#screen-mock-interface-engine) kein Testbeispiel. Die eigene Wortwahl eines Referenzlabors (seine Untersuchungsnamen und Ergebniscodes) übersetzt PathScribe nicht; dafür ist die Engine zuständig.

## Schnittstellenüberwachung, Fehlerwarteschlangen und erneute Verarbeitung {#ch7-monitoring}
Breadcrumb: Startseite > Qualität & Compliance

**Status:** Umgesetzt (Browserseite)

Alles, was eine Administratorin oder ein Administrator braucht, um zu sehen, was fehlgeschlagen ist, und um es erneut zu senden, zurückzuhalten oder freizugeben, liegt auf den Bildschirmen dieses Teils. Sie arbeiten heute mit den Demonstrationsdaten und mit den Diensten für den API-Server. Was die Engine bei einer Verbindung ergänzt (einen Heartbeat, durch Bestätigung abgeschlossene Ergebnisse und automatische Wiederholungsfenster), ist Geplant. Siehe [Was heute läuft und was Geplant ist](#ch7-today).

### Regeln zur erneuten Verarbeitung im Überblick {#ch7-reprocessing}
Breadcrumb: Startseite > Qualität & Compliance

Eine fehlgeschlagene Nachricht wird nie verworfen, und heute wird nichts erneut gesendet, ohne dass eine Person eine Schaltfläche drückt. Die folgenden Regeln setzt der Code durch.

| Situation | Wo sie erscheint | Was Sie tun können | Funktion |
|---|---|---|---|
| Eine eingehende Patientennachricht konnte nicht zugeordnet werden (A40, A24, A47, A43) | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces), Schnittstellenausnahmen | Prüfen, die Patienten von Hand verknüpfen oder Fälle verschieben, oder verwerfen. Die Nachricht wird nie geraten. | Keine eigene. Siehe die bekannten Grenzen dort. |
| Ein eingehender Auftragscode hat keinen Treffer im Probenverzeichnis | Schnittstellenausnahmen, Typ `unmapped_order_code` | **Zuordnen & Verknüpfen** legt den Eintrag der [Probencode-Zuordnung](#screen-crosswalk) an, oder verwerfen. | `config:crosswalk:manage` für den Eintrag |
| Eine ausgehende Nachricht konnte nicht gesendet werden | [Ausgehende Schnittstellen-DLQ](#screen-outbound-interface-dlq) und die [Ausgangswarteschlange](#screen-outbound-queue) als **Fehlgeschlagen** | **Übermittlung erneut versuchen** oder **Jetzt übermitteln** sendet sie erneut an die Engine. | `interface:outbound:resend` |
| Eine Nachricht soll noch nicht gehen | Ausgangswarteschlange, **Wartend** oder **Fehlgeschlagen** | Mit einem Grund **Anhalten**, dann **Freigeben**. Eine angehaltene Nachricht wird durch keine andere Aktion gesendet: Die Wiederholung meldet „In der Ausgangswarteschlange angehalten: dort zuerst freigeben.“ | `interface:outbound:hold`, `interface:outbound:release` |
| Eine Nachricht ist über ihre automatischen Wiederholungen hinaus fehlgeschlagen | Ausgangswarteschlange, **Endgültig fehlgeschlagen** | **Erneut senden** oder **Leistung zurückziehen** bei einer Abrechnungsposition. | `interface:outbound:resend`, `interface:outbound:retract` |
| Ein Register hat eine Meldung abgelehnt | Ausgangswarteschlange, **Abgelehnt** | **Erneut senden** (erneut einreichen) mit einem Grund oder **Als nicht meldepflichtig markieren** mit einem Grund. | `interface:outbound:resend`, `interface:outbound:mark-not-reportable` |
| Eine Leistung soll früher abgehen oder storniert werden | Ausgangswarteschlange, Abrechnungspositionen | **Jetzt freigeben** oder **Leistung zurückziehen**. | `interface:outbound:override-release`, `interface:outbound:retract` |
| Ein Befunddruck, ein Telefax oder eine Dateiablage ist nach den Wiederholungen fehlgeschlagen | Versandausnahmen, oben in der Ausgehenden Schnittstellen-DLQ | Aus der eigenen Warteschlange erneut senden (die Druckwarteschlange oder die Befundzustellung). Sie verlässt die Liste, wenn sie durchgeht. | `interface:outbound:resend` für die Befundzustellung |
| Eine in die Warteschlange gestellte Leistung ist fehlgeschlagen | Der Unterreiter Ausgehende DLQ der Systemprotokolle, Abrechnung (Stufe 7) | Siehe [Systemprotokolle: Abrechnung](#screen-audit-financial). | Siehe diesen Bildschirm |

**Die eingebauten Rollen.** Admin hat alle Funktionen `interface:outbound:*`, `interface:engine-status:view` und `jobs:server-job:view`. Die Laborleitung hat keine davon und hat den Bildschirm Ausgangswarteschlange nicht. Die Qualitätsprüfung öffnet nur den Bildschirm des Prüfprotokolls und die Exporte. Superadmin hat jede Berechtigung außer `config:ai-prompt:approve`, die aus Gründen der Funktionstrennung vorenthalten wird (die Laborleitung gibt KI-Anweisungen frei; der Support von ForMedrixAI nie). Es gibt keine eingebaute Rolle Schnittstellenanalyse: Ein Krankenhaus legt sie an und erteilt ihr die gewünschten Funktionen (die Seed-Datei sagt das).

**Was ein erneutes Senden tut.** Ein erneutes Senden baut die Nachricht aus dem Datensatz neu auf und sendet sie. Existiert der Datensatz, auf den sie sich bezieht, nicht mehr, wird nichts gesendet, und der Bildschirm meldet „Nicht gesendet: Die Nachricht konnte nicht erstellt werden“. Ein Ergebnis, zu dem es noch kein Befund-PDF gibt, wird zurückgehalten, nicht gesendet, und geht bei einer späteren Wiederholung mit dem PDF hinaus. Jede Aktion, die eine Nachricht ändert, wird im Prüfprotokoll aufgezeichnet, ein Eintrag je Nachricht, und der Prüftext enthält nie einen Patientennamen. Die Wiederholung auf Leitungsebene (die Engine wiederholt eine Verbindung) ist Sache der Engine, nicht von PathScribe.

### Systemprotokolle: Schnittstellen {#screen-audit-interfaces}
Breadcrumb: Startseite > Qualität & Compliance > Systemprotokolle > Schnittstellenprotokoll

**Status:** Umgesetzt

**1. Navigation:** Startseite > **Qualität & Compliance** > **Systemprotokolle** > Registerkarte **Schnittstellenprotokoll** (der Name der Registerkarte auf dem Bildschirm), unter `/audit?tab=interfaces`.
**2. Wartungspunkt:** Systemprotokolle: Schnittstellen

**3. Fachlicher Zweck und Umfang.** Die eine Stelle, an der Sie sehen, was an der Grenze zu anderen Systemen schiefgegangen ist. Sie hat fünf Unterreiter: **Schnittstellenausnahmen** (eingehende Nachrichten, die nicht verarbeitet werden konnten), **Ausgehende Interface-DLQ** (ausgehende Nachrichten, die fehlgeschlagen sind oder warten), **Ausgehende Sendungen** (die Spur der Ereignisse zur Auftragsanlage), **Druckwarteschlange** und **Engines** (Status der Schnittstellen-Engine, nur mit `interface:engine-status:view` sichtbar). Eine Zeile über den Unterreitern fasst die Engines zusammen und öffnet **Engines** mit einem Klick. Die Registerkarte zeigt ein Kennzeichen mit der Anzahl ausstehender Ausnahmen.

Dieses Kapitel dokumentiert hier die Schnittstellenausnahmen und die anderen vier Unterreiter auf ihren eigenen Bildschirmen: [Ausgehende Schnittstellen-DLQ](#screen-outbound-interface-dlq), [Ausgehende Sendungen](#screen-outbound-dispatches) und [Schnittstellen-Engines](#screen-interface-engines). Der Unterreiter Druckwarteschlange ist in diesem Handbuch nicht dokumentiert; siehe die offenen Fragen.

**4. Voraussetzungen und Abhängigkeiten.** Hier wird nichts konfiguriert. Die Liste füllt sich, wenn eine Schnittstellenausnahme ausgelöst wird. Ausnahmen zu nicht zugeordneten Auftragscodes erscheinen, wenn die [Probencode-Zuordnung](#screen-crosswalk) für einen Code keinen Eintrag hat.

Setup step: Reference, not part of setup
Requires: [Probencode-Zuordnung](#screen-crosswalk)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-audit-interfaces - Registerkarte Schnittstellenprotokoll mit dem Unterreiter Schnittstellenausnahmen, Statusfiltern und Suche]

**6. Feldreferenz.**

Unterreiter Schnittstellenausnahmen.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Statusfilter | Auswahl **Alle**, **Ausstehend**, **Gelöst**, **Verworfen**, jeweils mit einer Anzahl | Optional | Filtert die Liste. | Alle |
| Suche | Text, Platzhalter „Ereignistyp, Grund suchen…“ | Optional | Gleicht den Ereignistyp und den Grund ab. Der Link der Probencode-Zuordnung öffnet diese Registerkarte mit der Suche nach `unmapped_order_code`. | Leer |
| CSV exportieren | Schaltfläche | Nicht zutreffend | Lädt die gefilterte Liste herunter. Kein Patientenname, keine Aktennummer und kein Geburtsdatum sind enthalten. Protokolliert. | Nicht zutreffend |
| Patient zuordnen | Schaltfläche, angezeigt, wenn der Benutzer zu einer Organisation gehört | Nicht zutreffend | Öffnet das Break-Glass-Werkzeug, um eine Ausfall-Patientenidentität neu zuzuordnen. Eine seltene, eingeschränkte Aktion. | Nicht zutreffend |
| Zeitstempel | Datum und Uhrzeit (schreibgeschützt) | Nicht zutreffend | Wann die Ausnahme ausgelöst wurde. | Nicht zutreffend |
| Ereignistyp | Textkennzeichen (schreibgeschützt), zum Beispiel `A40`, `A24`, `A47`, `A43`, `unmapped_order_code` | Nicht zutreffend | Die Art der Nachricht. Daneben steht ein Chip mit der Support-Referenz. | Nicht zutreffend |
| Grund | Text (schreibgeschützt, als Patientendaten gekennzeichnet) | Nicht zutreffend | Der genaue Grund, warum sie nicht verarbeitet werden konnte, zum Beispiel „MRG-5 does not match any known Encounter.“ | Nicht zutreffend |
| Quellpatient, Zielpatient | Text (schreibgeschützt, als Aktennummer gekennzeichnet) | Nicht zutreffend | Die Kennungen, die vor dem Fehler ausgelesen wurden. Ein Strich, wenn keine gelesen werden konnte. | Nicht zutreffend |
| Status | Schaltfläche **Prüfen**, solange ausstehend; danach Kennzeichen **Gelöst** oder **Verworfen** | Nicht zutreffend | **Prüfen** öffnet das folgende Fenster. | Ausstehend |
| Fußzeile | „n von n Schnittstellenausnahmen angezeigt“ | Nicht zutreffend | Die Anzahl der angezeigten und der insgesamt vorhandenen. | Nicht zutreffend |

#### Fenster Schnittstellenausnahme prüfen
Breadcrumb: Startseite > Qualität & Compliance > Systemprotokolle > Schnittstellenprotokoll > Schnittstellenausnahme prüfen

Was das Fenster anbietet, hängt vom Ereignistyp ab. Verwerfen steht für jeden Typ zur Verfügung.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Quellpatient, Zielpatient | Text (schreibgeschützt) | Nicht zutreffend | Die beiden Patienten, die die Nachricht nannte. „Die Patientenidentität konnte nicht aufgelöst werden“ erscheint mit der Rohkennung, wenn die Zuordnung fehlgeschlagen ist. | Nicht zutreffend |
| Aktive Fälle des Quellpatienten (nur A43) | Kontrollkästchenliste von Fällen mit Probe, Einrichtung und Status | Optional | Wählen Sie, welche Fälle, falls überhaupt, zum Zielpatienten verschoben werden. | Keine ausgewählt |
| Ausgewählte Fälle verschieben (nur A43) | Schaltfläche | Nicht zutreffend | Verschiebt jeden ausgewählten Fall und zeichnet die Ausnahme als gelöst auf, mit einem Vermerk, wie viele verschoben wurden und welche Fehler aufgetreten sind. Deaktiviert, bis ein Fall ausgewählt ist und beide Patienten bekannt sind. | Nicht zutreffend |
| Suche und Patientenauswahllisten (A40, A24, A47) | Suchfeld und Auswahlliste, je eines für jede Seite. A47 hat nur die Quellseite, „Patient, dessen Kennung korrigiert wird“. A40 zeigt „Früherer Patient (wird zusammengeführt)“ und „Verbleibender Patient“. A24 zeigt „Erster Patientendatensatz“ und „Zweiter Patientendatensatz“. | Pflicht | Wählen Sie den oder die Datensätze, die die Nachricht meinte. „Es wird nichts geraten.“ | Leer |
| Anwenden (A40, A24, A47) | Schaltfläche, „A40 anwenden“ und so weiter | Nicht zutreffend | Wendet die Nachricht von Hand auf die von Ihnen gewählten Patienten an. | Nicht zutreffend |
| Roh-Auftragscode, Normalisiert, Kodierungssystem (`unmapped_order_code`) | Text (schreibgeschützt) | Nicht zutreffend | Was eingegangen ist und wie es normalisiert wurde. | Nicht zutreffend |
| Einem Probenverzeichniseintrag zuordnen (`unmapped_order_code`) | Durchsuchbare Auswahlliste | Pflicht zum Zuordnen | Der Eintrag, zu dem dieser Code aufgelöst werden soll. | Leer |
| Zuordnen & Verknüpfen (`unmapped_order_code`) | Schaltfläche | Nicht zutreffend | Legt den Eintrag der [Probencode-Zuordnung](#screen-crosswalk) direkt an, sodass spätere Aufträge mit genau diesem Code aufgelöst werden und die Ausnahme sich nicht wiederholt. Eine Ausnahme, die ausgelöst wurde, bevor es die Verfolgung der Einrichtung gab, kann hier nicht zugeordnet werden; legen Sie den Eintrag in der Probencode-Zuordnung an und verwerfen Sie dann. | Nicht zutreffend |
| Zurückweisen — Keine Aktion erforderlich | Schaltfläche | Nicht zutreffend | Schließt die Ausnahme ohne Änderung. Verwenden Sie sie, sobald die richtige Identität vorgelagert bestätigt wurde, zum Beispiel durch ein korrigiertes erneutes Senden aus dem EHR. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:audit-log:open`. Die Liste exportieren: `audit:interface-log:export` (hohes Risiko). Patient zuordnen: `patient:break-glass:rebind` (hohes Risiko; Admin hat sie standardmäßig). Admin, Laborleitung und Qualitätsprüfung öffnen den Bildschirm des Prüfprotokolls standardmäßig. Für die anderen Unterreiter siehe [Regeln zur erneuten Verarbeitung im Überblick](#ch7-reprocessing).

**Bekannte Grenzen.** Das Lösen, Verwerfen und Verknüpfen einer Schnittstellenausnahme hat keine eigene Funktion: Jeder, der den Bildschirm öffnen kann, kann es tun. Die Ausnahme aus einer eingehenden HL7-Nachricht kann nur erscheinen, wenn die Nachricht verarbeitet wird, und es gibt noch keinen echten Listener; in der Demonstrationsversion stammen Ausnahmen daher vom Simulator der [Simulierten Schnittstellen-Engine](#screen-mock-interface-engine). Die Prüfung für einen anderen Ereignistyp als die fünf oben bietet nur Verwerfen an.
### Schnittstellen-Engines {#screen-interface-engines}
Breadcrumb: Startseite > Qualität & Compliance > Systemprotokolle > Schnittstellenprotokoll > Engines

**Status:** Teilweise

**1. Navigation:** Systemprotokolle, Registerkarte **Schnittstellenprotokoll**, Unterreiter **Engines**. Der Unterreiter erscheint nur für Personen mit `interface:engine-status:view`.
**2. Wartungspunkt:** Schnittstellen-Engines (der Titel auf dem Bildschirm)

**3. Fachlicher Zweck und Umfang.** Eine Liste der Schnittstellen-Engine jedes Krankenhauses, die angibt, ob ihre Listener laufen, was wartet und was fehlgeschlagen ist. Sie aktualisiert sich jede Minute und hat eine Schaltfläche **Aktualisieren**. Sie ist schreibgeschützt: Kanäle werden auf der Engine selbst gestartet und gestoppt, und fehlgeschlagene ausgehende Nachrichten werden über die [Ausgehende Schnittstellen-DLQ](#screen-outbound-interface-dlq) erneut gesendet (die Schaltfläche **Ausgehend öffnen** führt dorthin).

**Was umgesetzt ist und was Geplant ist.** Der Bildschirm und die Statusregeln sind umgesetzt. Die Daten stammen vom Heartbeat der Engine, den die Engine alle 60 Sekunden an einen Endpunkt sendet, der Geplant ist (`POST /api/interface/heartbeat`; die Liste ist `GET /api/interface/engines`). Bis dahin zeigt die Demonstration vier Beispiel-Engines, eine für jeden Status, mit dem Kennzeichen **Simuliert**, und sagt „In der Demo verarbeitet der Browser die Schnittstellennachrichten selbst, daher gibt es keine Schnittstellen-Engine zu überwachen.“ Ist keine Engine registriert, sagt die Liste „Es ist noch keine Schnittstellen-Engine registriert.“

**4. Voraussetzungen und Abhängigkeiten.** Hier wird nichts konfiguriert. Eine Engine muss von ForMedrixAI installiert und registriert werden; das ist Geplant.

Setup step: Reference, not part of setup
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-interface-engines - Schnittstellen-Engines mit Status, Kanälen, wartenden Nachrichten und endgültig fehlgeschlagenen Nachrichten]

**6. Feldreferenz.** Eine schreibgeschützte Seite.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Zusammenfassungszeile | Text, „Schnittstellen-Engines: ...“ | Nicht zutreffend | Anzahlen: online, beeinträchtigt, offline, zu prüfen, Listener gestoppt, Nachrichten wartend. | Nicht zutreffend |
| Status | **Online**, **Beeinträchtigt**, **Offline**, **Prüfen** (schreibgeschützt) | Nicht zutreffend | Offline: kein Heartbeat seit 180 Sekunden, nach der Uhr des Servers. Beeinträchtigt: PathScribe ist von der Engine aus nicht erreichbar, das Zertifikat läuft in weniger als 14 Tagen ab, der freie Speicherplatz liegt unter 15 Prozent, ein Kanal hat einen Fehler, ist angehalten oder gestoppt, oder eine Nachricht wartet länger als 15 Minuten. Prüfen: sonst gesund, aber ein Kanal hat endgültig fehlgeschlagene Nachrichten. Online: nichts davon. | Nicht zutreffend |
| Hosting | **Gehostet** oder **Vor Ort** | Nicht zutreffend | Wo die Engine läuft (Entscheidung D6). | Nicht zutreffend |
| Version, Letzte Meldung | Text | Nicht zutreffend | Die Version der Engine, und „Nie gemeldet“, wenn keine vorliegt. | Nicht zutreffend |
| Erreicht PathScribe | Text | Nicht zutreffend | **Erreicht PathScribe** oder „Erreicht PathScribe nicht: Nachrichten werden zur Weiterleitung gespeichert“. | Nicht zutreffend |
| Speicher frei, Zertifikat läuft ab | Prozent, Datum | Nicht zutreffend | Die beiden oben genannten Gesundheitswerte. | Nicht zutreffend |
| Kanal | Text | Nicht zutreffend | Der Kanal der Engine. | Nicht zutreffend |
| Richtung | **Eingehend (Listener)** oder **Ausgehend** | Nicht zutreffend | | Nicht zutreffend |
| Zustand | **Gestartet**, **Angehalten**, **Gestoppt**, **Fehler** | Nicht zutreffend | Eine Zeile zum Kanalproblem erklärt: Wartet seit mehr als n Minuten; Endgültige Fehler zu bearbeiten; Fehler; Angehalten, Warteschlange erhalten; Gestoppt. | Nicht zutreffend |
| Wartend, Am längsten wartend, Endgültig fehlgeschlagen | Zahl, Minuten, Zahl | Nicht zutreffend | Tiefe der Warteschlange, Alter der am längsten wartenden Nachricht und Anzahl der endgültig fehlgeschlagenen Nachrichten. | Nicht zutreffend |
| Summen | Text | Nicht zutreffend | Wartende Nachrichten, endgültig fehlgeschlagene Nachrichten und gestoppte Listener über alle Engines. | Nicht zutreffend |
| Aktualisieren, Ausgehend öffnen | Schaltflächen | Nicht zutreffend | | Nicht zutreffend |

**7. Berechtigungen.** `interface:engine-status:view` (Standardrisiko; benötigt `screen:audit-log:open`). Admin hat sie standardmäßig; ein Krankenhaus kann sie seinen Schnittstellenanalystinnen und -analysten erteilen. Wer sie nicht hat, sieht den Unterreiter nicht, und ein abgelehnter Lesezugriff meldet „Sie sind nicht berechtigt, die Schnittstellen-Engines zu sehen.“

**Bekannte Grenzen.** Noch meldet keine Engine, daher ist die echte Liste leer, bis der Heartbeat-Endpunkt und das Engine-Image vorhanden sind (Geplant, Phase 2e). Die Grenzwerte für den Zustand sind im Code festgelegt und haben keine Einstellung.

### Ausgehende Schnittstellen-DLQ {#screen-outbound-interface-dlq}
Breadcrumb: Startseite > Qualität & Compliance > Systemprotokolle > Schnittstellenprotokoll > Ausgehende Interface-DLQ

**Status:** Umgesetzt

**1. Navigation:** Systemprotokolle, Registerkarte **Schnittstellenprotokoll**, Unterreiter **Ausgehende Interface-DLQ**.
**2. Wartungspunkt:** Ausgehende Schnittstellen-DLQ

**3. Fachlicher Zweck und Umfang.** Eine Dead-Letter-Queue (DLQ) ist die Liste der Nachrichten, die nicht gesendet werden konnten. Dieser Bildschirm zeigt fehlgeschlagene und wartende ausgehende Schnittstellennachrichten für jeweils eine Warteschlange und lässt Sie sie erneut senden. **Jetzt übermitteln** und **Wiederholen** senden die Nachricht an die Schnittstellen-Engine. Die Schaltflächen **Simulieren** sind eine Testhilfe und senden nie. Eine fehlgeschlagene Leistung steht in der getrennten DLQ für Abrechnung ([Systemprotokolle: Abrechnung](#screen-audit-financial)). Das Feld für Versandausnahmen (unten) steht ganz oben.

**4. Voraussetzungen und Abhängigkeiten.** Hier wird nichts konfiguriert. Eine Nachricht erscheint, nachdem ein ausgehendes Senden fehlgeschlagen ist. Ist `VITE_INTERFACE_RECEIVER_ENDPOINT` nicht gesetzt, nimmt die Demonstrations-Engine je nach ihrem Antwortmodus an oder lehnt ab (siehe [Simulierte Schnittstellen-Engine](#screen-mock-interface-engine)).

Setup step: Reference, not part of setup
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-outbound-interface-dlq - Ausgehende Schnittstellen-DLQ mit Auswahl der Warteschlange, fehlgeschlagenen Zeilen und Versandausnahmen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Warteschlange | Auswahl aus acht Warteschlangen: Pathologiebefund (ORU^R01); Zytologiebefund (ORU^R01); Patienten-ADT (A08/A40/A47); Assist-Modus-LIS-Sync; Eingangsereignisse (aufgenommen / Mangel); Befundversand (E-Fax, Dateiablage); Versandliste; Molekular- / Geräteauftrag | Pflicht | Wählt die Warteschlange. Die beiden ersten Spalten für Kennung und Art ändern sich mit ihr (zum Beispiel Fall und Befundstatus; Quellpatient und Ereignistyp; Chargen-Barcode und Priorität; Probe oder Barcode und Assay; Eingangsnummer und Kanal und Befund). Ein Wechsel der Warteschlange leert die Ergebnismeldungen. | Pathologiebefund |
| Fehlgeschlagen: Kennung, Art | Text (schreibgeschützt, als Patientendaten gekennzeichnet) | Nicht zutreffend | Der Datensatz und seine Art. | Nicht zutreffend |
| Fehlgeschlagen: Fehler | Text (schreibgeschützt) | Nicht zutreffend | Eines von **Übermittlung abgelehnt**, **Übermittlungs-Timeout**, **Engine nicht erreichbar** oder **Unbekannt**, mit der Meldung darunter. | Nicht zutreffend |
| Fehlgeschlagen: Wiederholungen | Zahl | Nicht zutreffend | Wie oft sie erneut gesendet wurde. „(Maximum überschritten)“ erscheint, wenn der Eintrag dieses Kennzeichen trägt. Die eigene Übermittlung des Browsers setzt das Kennzeichen heute nie. | Nicht zutreffend |
| Fehlgeschlagen: Übermittlung erneut versuchen | Schaltfläche | Nicht zutreffend | Sendet erneut. Die Antwort erscheint daneben: „Gesendet und von der Schnittstellen-Engine angenommen“; „Nicht gesendet: Der Grund steht in der Spalte „Fehler““; „Zurückgehalten: Das Befund-PDF ist noch nicht verfügbar“; „Nicht gesendet: Die Nachricht konnte nicht erstellt werden“; „Diese Nachricht ist nicht mehr in der Warteschlange“; „In der Ausgangswarteschlange angehalten: dort zuerst freigeben“; oder „Sie sind nicht berechtigt, Schnittstellennachrichten erneut zu senden.“ | Nicht zutreffend |
| Fehlgeschlagen: Als CAPA erfassen | Schaltfläche | Nicht zutreffend | Zeichnet den Fehler als Korrektur- und Vorbeugemaßnahme (CAPA) auf. Die Zeile zeigt danach **Erfasst**. | Nicht zutreffend |
| In Warteschlange: Kennung, Art, In Warteschlange seit | Schreibgeschützt | Nicht zutreffend | Nachrichten, die auf den Versand warten. | Nicht zutreffend |
| In Warteschlange: Jetzt übermitteln | Schaltfläche | Nicht zutreffend | Sendet die Nachricht jetzt. | Nicht zutreffend |
| In Warteschlange: Ablehnung simulieren, Zeitüberschreitung simulieren, Nichterreichbarkeit simulieren | Schaltflächen | Nicht zutreffend | Erzeugen zu Testzwecken einen Fehler dieser Art. Sie geben nie ein echtes Senden wieder. | Nicht zutreffend |
| Versandausnahmen (n) | Schreibgeschützte Liste: Fall, Kanal, Versuche, Letzter Fehler, Ersatz, Aufgegeben | Nicht zutreffend | Drucke, Telefaxe und Dateiablagen, die nach ihren automatischen Wiederholungen weiter fehlgeschlagen sind. Die Ersatzkanäle einer Regel erscheinen als „Gesendet per ...“. Admin und Laborleitung erhalten eine Nachricht, wenn eine hinzukommt. Ein Versand, der beim erneuten Senden durchgeht, verlässt die Liste beim nächsten Durchlauf. „Keine Versandausnahmen.“, wenn die Liste leer ist. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:audit-log:open`. Jetzt übermitteln, Übermittlung erneut versuchen und die Schaltflächen Simulieren: `interface:outbound:resend` (hohes Risiko, protokolliert). Admin hat sie standardmäßig. Ein Krankenhaus kann sie seiner eigenen Rolle Schnittstellenanalyse erteilen. Als CAPA erfassen hat keine eigene Funktion.

**Bekannte Grenzen.** Der Untertitel nennt „sieben Warteschlangen“, aber der Bildschirm bietet acht an. Im Browser gibt es keine automatische Wiederholung: Eine fehlgeschlagene Nachricht wartet auf eine Person. Die geplanten Wiederholungsfenster stehen unter [Was heute läuft und was Geplant ist](#ch7-today).

### Ausgehende Sendungen {#screen-outbound-dispatches}
Breadcrumb: Startseite > Qualität & Compliance > Systemprotokolle > Schnittstellenprotokoll > Ausgehende Sendungen

**Status:** Umgesetzt

**1. Navigation:** Systemprotokolle, Registerkarte **Schnittstellenprotokoll**, Unterreiter **Ausgehende Sendungen**.
**2. Wartungspunkt:** Ausgehende Sendungen

**3. Fachlicher Zweck und Umfang.** Die Spur jedes Ereignisses zur Auftragsanlage, das PathScribe an die Schnittstellen-Engine gesendet hat (Kategorie E), mit seinem Ergebnis. Sie ist ein Nachweis, keine Fehlerwarteschlange. Fehlgeschlagene Sendungen von Ergebnissen und Patientenaktualisierungen stehen in der [Ausgehende Schnittstellen-DLQ](#screen-outbound-interface-dlq). Öffnen Sie eine Zeile, um das genaue JSON zu sehen, das gesendet wurde. PathScribe sendet JSON; die Engine baut daraus die HL7-Nachricht auf.

**4. Voraussetzungen und Abhängigkeiten.** Hier wird nichts konfiguriert. Zeilen erscheinen, wenn eine Nachricht „Auftrag angelegt“ gesendet wird.

Setup step: Reference, not part of setup
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-outbound-dispatches - Tabelle Ausgehende Sendungen und Seitenfenster mit den Nutzdaten]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Statusfilter | Auswahl **Alle**, **Zugestellt**, **Fehlgeschlagen**, **Ergebnis unbekannt** | Optional | Filtert die Tabelle. „Ergebnis unbekannt“ heißt, die Nachricht wurde aufgezeichnet, aber es kam kein Ergebnis zurück. | Alle |
| Suche | Text, „Nachrichten-ID oder Eingangsnummer suchen...“ | Optional | Gleicht Nachrichten-ID und Eingangsnummer ab. | Leer |
| Zeitstempel | Datum und Uhrzeit (schreibgeschützt) | Nicht zutreffend | Wann sie gesendet wurde. | Nicht zutreffend |
| Nachrichten-ID | Text (schreibgeschützt) | Nicht zutreffend | Die ID der Nachricht. | Nicht zutreffend |
| Eingangsnummer | Text (schreibgeschützt, als Patientendaten gekennzeichnet) | Nicht zutreffend | Der Fall. | Nicht zutreffend |
| Kategorie | Text, **E: Auftrag** | Nicht zutreffend | Die Kategorie der Transaktion. | Nicht zutreffend |
| Nachrichtentyp | Text (schreibgeschützt) | Nicht zutreffend | Der Transaktionstyp. | Nicht zutreffend |
| Anfordernde Einrichtung | Text (schreibgeschützt) | Nicht zutreffend | Die Einrichtung, von der der Auftrag kam. | Nicht zutreffend |
| Status | **Zugestellt**, **Fehlgeschlagen**, **Ergebnis unbekannt**, mit „n Versuche“ | Nicht zutreffend | Das Ergebnis. | Nicht zutreffend |
| Seitenfenster Gesendete Nutzdaten | Schreibgeschütztes JSON mit **Nutzdaten kopieren** | Nicht zutreffend | Das genaue gesendete JSON und der Fehler, falls sie fehlgeschlagen ist. Kopieren legt es in die Zwischenablage. | Nicht zutreffend |
| Fußzeile | „n von n ausgehenden Sendungen angezeigt“ | Nicht zutreffend | | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:audit-log:open`. Die Tabelle und die Schaltfläche zum Kopieren haben keine Funktion. Admin, Laborleitung und Qualitätsprüfung öffnen den Bildschirm des Prüfprotokolls standardmäßig.

**Bekannte Grenzen.** In dieser Spur stehen nur Ereignisse zur Auftragsanlage. Andere Transaktionstypen stehen in der DLQ, solange sie fehlschlagen, und in der [Ausgangswarteschlange](#screen-outbound-queue).

### Ausgangswarteschlange {#screen-outbound-queue}
Breadcrumb: Startseite > Qualität & Compliance > Ausgangswarteschlange

**Status:** Umgesetzt

**1. Navigation:** Startseite > **Qualität & Compliance** > **Ausgangswarteschlange**, unter `/outbound-queue`.
**2. Wartungspunkt:** Ausgangswarteschlange

**3. Fachlicher Zweck und Umfang.** Alle ausgehenden Nachrichten an einem Ort: anhalten, freigeben oder erneut senden und korrigieren, was ein Register abgelehnt hat. Sie fasst zehn Kanäle zusammen (Befunde, Patienten-ADT, Akzession, LIS-Abgleich, Abrechnung, Befundzustellung, Zytologiebefunde, Zuweisungen, Molekulare Aufträge, Register) und zeigt das Ziel jeder Nachricht (Schnittstellen-Engine, Abrechnungssystem, LIS-Partner, Zustelldienst oder Register), den Transportweg, den die Engine verwendet (REST + mTLS, SFTP, Portal-Upload, PHIN-MS, Direkte TCP-Verbindung oder HTTPS-API, die nur als Teil der Zielbeschriftung angezeigt werden), und ihren Status. PathScribe entscheidet, was freigegeben wird und wann; die Engine übernimmt den Transport.

**4. Voraussetzungen und Abhängigkeiten.** Die Warteschlange liest aus den [Zustellzeitplänen](#screen-delivery_schedules), wann eine Nachricht abgeht und welche Meldefrist gilt: zuerst der eigene Zeitplan der durchführenden Einrichtung, sonst der des Unternehmens, sonst der Standard des Kanals. Ohne Zeitplan folgt eine Nachricht dem Standard des Kanals. Abrechnungspositionen folgen außerdem den Einstellungen zur Freigabe der Abrechnung und Registerpositionen den Registereinstellungen, beide in Stufe 7.

Setup step: Reference, not part of setup
Requires: [Zustellzeitpläne](#screen-delivery_schedules)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-outbound-queue - Ausgangswarteschlange mit Kanalfiltern, Fristenkacheln, Statusspalte und Aktionsleiste]

**6. Feldreferenz.**

Filter und Kacheln.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Nach Kanal filtern | Zehn Umschalt-Chips | Optional | Zeigt nur die gewählten Kanäle. | Alle Kanäle |
| Einrichtung | Auswahlliste, **Alle Einrichtungen** oder eine Einrichtung | Optional | Beschränkt auf eine Einrichtung. | Alle Einrichtungen |
| Nach Akzessionsnummer suchen | Text | Optional | Gleicht die Eingangsnummer ab. | Leer |
| Kachel Zu prüfen | Umschalter mit Anzahl | Optional | Zeigt Abrechnungspositionen, die für eine Person zurückgestellt sind (**Prüfung nötig: CPT-Code nicht zugeordnet**, **keine Einrichtung für die technische Komponente**, **Differenzleistung eines geänderten Falls**), und Registerpositionen, die geprüft werden müssen (ein Pflichtfeld ist leer, keine durchführende Einrichtung, kein Bundesstaatsprofil, eine Regel des Bundesstaats wie „Kein ICD-O-3-Code im Fall“). | Aus |
| Kachel Differenzleistungen | Anzahl | Nicht zutreffend | Leistungen aus geänderten Fällen. | Nicht zutreffend |
| Kacheln Meldefristen | Anzahlen, **Überfällig** und **Bald fällig** | Nicht zutreffend | Meldefristen für Register. | Nicht zutreffend |
| Sortieren nach, Richtung | Auswahl aus Kanal, Status, Zeit der Einreihung, Geplante Zeit, Versuche, Meldefrist; aufsteigend oder absteigend | Optional | Die Standardreihenfolge stellt Abgelehnt an den Anfang, dann Endgültig fehlgeschlagen, Fehlgeschlagen, Angehalten, Wartend, Gesendet, Bestätigt, Nicht meldepflichtig, Zurückgezogen. | Reihenfolge des Status |

Die Liste.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Auswahl (Zeile und alle auswählen) | Kontrollkästchen | Optional | Wählt Nachrichten für eine Sammelaktion. Die Anzahl lautet „Ausgewählt: n“. | Keine |
| Kanal, Akzession, Ziel | Text (schreibgeschützt) | Nicht zutreffend | Der Kanal, der Fall und das Ziel mit seinem Transportweg. | Nicht zutreffend |
| Status | Einer von **Wartend**, **Angehalten**, **Gesendet**, **Bestätigt**, **Fehlgeschlagen**, **Endgültig fehlgeschlagen**, **Abgelehnt**, **Nicht meldepflichtig**, **Zurückgezogen** | Nicht zutreffend | Wartend: eingereiht, geht zu ihrer Zeit. Angehalten: eine Person hat sie gestoppt. Gesendet: die Engine hat sie. Bestätigt: der Empfänger hat bestätigt. Fehlgeschlagen: ein Senden ist fehlgeschlagen. Endgültig fehlgeschlagen: über die automatischen Wiederholungen hinaus fehlgeschlagen. Abgelehnt: ein Register hat sie mit Fehlern zurückgegeben. Nicht meldepflichtig und Zurückgezogen sind abgeschlossen. | Nicht zutreffend |
| Versuche, Geplant, Frist, Details | Schreibgeschützt | Nicht zutreffend | Die Details enthalten den Grund des Anhaltens („Angehalten: ...“), den Fehler, ein geplantes Freigabedatum, ein Fälligkeitsdatum der Korrektur, „Vor dem Termin freigegeben (Benutzer-ID)“, „Berichtigt eine frühere Nachricht“ oder den Grund des Registers. | Nicht zutreffend |

Aktionen, die auf die ausgewählten Nachrichten wirken und die Funktion einmal für die Auswahl prüfen. Jede Nachricht erhält ihr eigenes Ergebnis; eine Ablehnung bei einer hält die übrigen nicht auf.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Anhalten | Schaltfläche, dann ein Feld | Grund erforderlich | Zulässig für Wartend und Fehlgeschlagen. Grund: Ausfall des Empfängers, Wartung beim Empfänger, Datenprüfung, Abrechnungsprüfung, Mögliches Duplikat oder Sonstiges. Eine optionale Notiz bis zu 200 Zeichen, mit dem Platzhalter „Keine Patientendaten“. | Nicht zutreffend |
| Freigeben | Schaltfläche | Nicht zutreffend | Zulässig für Angehalten. Stellt sie wieder in die Warteschlange. | Nicht zutreffend |
| Erneut senden | Schaltfläche, bei einer abgelehnten dann ein Feld | Grund erforderlich bei Abgelehnt | Zulässig für Fehlgeschlagen, Endgültig fehlgeschlagen und Abgelehnt. Eine abgelehnte Nachricht braucht den Grund, warum sie korrigiert wurde: Daten korrigiert, Kodierung korrigiert, Vom Pathologen korrigiert oder Sonstiges. | Nicht zutreffend |
| Als nicht meldepflichtig markieren | Schaltfläche, dann ein Feld | Grund erforderlich | Zulässig für Abgelehnt. Grund: Keine meldepflichtige Erkrankung, Außerhalb des Zuständigkeitsbereichs, Bereits gemeldet oder Sonstiges. Es wird nichts mehr gesendet. | Nicht zutreffend |
| Leistung zurückziehen | Schaltfläche, dann ein Feld | Grund erforderlich | Nur Abrechnungspositionen; zulässig für Wartend, Angehalten, Fehlgeschlagen und Endgültig fehlgeschlagen. Grund: Fall geändert, Fall zurückgezogen, Doppelte Leistung oder Sonstiges. Endgültig. | Nicht zutreffend |
| Jetzt freigeben | Schaltfläche | Nicht zutreffend | Nur Abrechnungspositionen; zulässig für Wartend und Angehalten. Sendet vor dem Zeitplan und zeichnet die Benutzer-ID auf. | Nicht zutreffend |

Eine Ablehnung wird als Anzahl gemeldet: nicht berechtigt, nicht mehr in der Warteschlange, nicht anhaltbar, nicht angehalten, nicht erneut sendbar, nicht abgelehnt, nicht zurückziehbar, nicht freigebbar, Grund erforderlich oder nicht gesendet (siehe die Spalte Details). Die Zusammenfassung lautet „Geändert: n“ und „Für den Status nicht zutreffend: n.“

**7. Berechtigungen.** Öffnen: `screen:outbound-queue:open`. Erneut senden: `interface:outbound:resend`. Anhalten: `interface:outbound:hold`. Freigeben: `interface:outbound:release`. Als nicht meldepflichtig markieren: `interface:outbound:mark-not-reportable`. Leistung zurückziehen: `interface:outbound:retract`. Jetzt freigeben: `interface:outbound:override-release`. Alle haben hohes Risiko und werden protokolliert. Jede der fünf außer „erneut senden“ benötigt die Funktion für den Bildschirm. Admin hat alle und den Bildschirm standardmäßig. Laborleitung und Qualitätsprüfung haben den Bildschirm nicht. Anhalten und Freigeben werden bei einer Sammelauswahl einmal geprüft.

**Bekannte Grenzen.** Die Warteschlange enthält die Nachrichten, die die PathScribe-Seite kennt. Ob eine Nachricht ihren Empfänger erreicht hat, hängt von der Bestätigung der Engine ab, die Geplant ist: Heute zählt jede 2xx-Antwort als gesendet. Bestätigt erscheint nur bei Kanälen, die eine Bestätigung mitführen (Register). Der im Ziel genannte Transportweg ist eine Beschriftung, weil die Engine den Transport verantwortet.

## Weitere Integrationen und Testwerkzeuge {#ch7-other}
Breadcrumb: Startseite > Konfiguration > System > Integrationen

**Status:** Teilweise

Diese Bildschirme gehören zu Stufe 6, betreffen aber nicht die Schnittstellen-Engine: ein Berichts-Feed für Analysewerkzeuge, der Import der Historie eines Altsystems und die Demonstrationswerkzeuge, die für nicht angeschlossene Systeme einspringen.

### Berichts-Feed (Power BI) {#screen-bi_feed}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Berichts-Feed (Power BI)

**Status:** Teilweise

**1. Navigation:** Registerkarte **System** der Konfiguration > Gruppe **Integrationen**
**2. Wartungspunkt:** Berichts-Feed (Power BI)

**3. Fachlicher Zweck und Umfang.** Lässt Power BI, Excel, Tableau oder ein Skript PathScribe-Daten über eine Berichts-API auf dem API-Server lesen. Sie verbinden sich nie mit der Datenbank. Sie legen fest, was der Feed anbietet (Datensätze und durchführende Laboreinrichtungen), stellen für jedes Werkzeug ein Token aus und halten identifizierende Daten fern, sofern nicht eine namentlich genannte Person sie freigegeben hat. Standardmäßig ist ein Token de-identifiziert: Namen, Aktennummern, Geburtsdaten und Freitexte werden entfernt, Datumsangaben werden auf den Monat reduziert, und Altersangaben ab 90 erscheinen als 90+.

**Was umgesetzt ist und was nicht.** Umgesetzt: die Einstellungen, der Freigabenachweis, das Erstellen, Ersetzen und Widerrufen von Token, der Feldkatalog und der Abruftest. Ein Token wird einmal angezeigt; PathScribe speichert nur einen Fingerabdruck und kann es nicht erneut anzeigen. Nicht angeschlossen: der Feed selbst. Der lesende Aufruf, `GET /api/bi/v1/{dataset}` mit `Authorization: Bearer psbi_...`, ist ein geschriebener Vertrag und der Serverauftrag PS-787. In der Demonstrationsversion werden die Einstellungen und Token im Browser gehalten, und **Abruf testen** simuliert nur, wie der Server antworten würde (er gibt keine Zeilen zurück). Ein Banner sagt das.

**4. Voraussetzungen und Abhängigkeiten.** Ein Token kann nur auf Einrichtungen beschränkt werden, die die Rolle durchführendes Labor haben; diese Einrichtungen kommen daher zuerst. Wenn Sie sie auslassen, sagt der Bildschirm „Es sind keine durchführenden Laboreinrichtungen eingerichtet.“, und ein Token kann nicht erstellt werden, weil mindestens eine Einrichtung angeboten werden muss.

Setup step: Tier 6, step 4
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-bi_feed - Einstellungen des Berichts-Feeds, Freigabe identifizierender Token, Tokenliste, Abruftest und Feldkatalog]

**6. Feldreferenz.**

Was der Feed anbietet.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Berichts-Feed ist eingeschaltet | Ja/Nein-Schalter | Optional | Solange er aus ist, wird jedes Token abgelehnt, und neue Token können nicht erstellt werden. | Aus |
| Datensätze | Kontrollkästchen: Audit-Zusammenfassungen, Abrechnungsereignisse, Fälle und Durchlaufzeiten, Qualität und Diskordanz, Proben, Arbeitsbelastung und Produktivität. Die, die einen Patienten identifizieren können, sind mit „kann Patienten identifizieren“ gekennzeichnet (Fälle, Proben, Abrechnung, Qualität). | Optional | Die Datensätze, die ein Token lesen darf. Audit-Zusammenfassungen sind Tageszahlen ohne Benutzer- oder Patientendetails. Die Arbeitsbelastung enthält keine Patientendaten. | Keiner angehakt |
| Durchführende Laboreinrichtungen | Kontrollkästchen | Optional | Die Einrichtungen, die der Feed anbietet. Ein Token kann auf einige davon beschränkt werden und erreicht nie eine, die nicht angehakt ist. | Keine angehakt |
| Änderungen verwerfen, Einstellungen speichern | Schaltflächen | Nicht zutreffend | Deaktiviert, bis sich etwas ändert. | Nicht zutreffend |

Identifizierende Token.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Freigegeben von | Text, bis zu 80 Zeichen | Pflicht zum Erfassen | Die namentlich genannte Person, die identifizierende Daten freigegeben hat. | Leer |
| Grund | Text, bis zu 500 Zeichen | Pflicht zum Erfassen | Warum identifizierende Daten benötigt werden. | Leer |
| Freigabe erfassen | Schaltfläche | Nicht zutreffend | Erfasst die Freigabe, mit der Angabe, wer sie erfasst hat und wann. Danach können identifizierende Token erstellt werden. | Nicht zutreffend |
| Freigabe zurückziehen | Schaltfläche | Nicht zutreffend | Entfernt sie. Ein identifizierendes Token erhält dann nichts Identifizierendes, bis eine neue Freigabe erfasst ist. Wird mit „Es ist keine Freigabe erfasst, die zurückgezogen werden könnte.“ abgelehnt, wenn keine vorliegt. | Nicht zutreffend |

Ein neues Token.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name | Text, bis zu 60 Zeichen. Platzhalter „Qualitäts-Dashboard“. | Pflicht | Unter den aktiven Token der Einrichtung eindeutig („Ein anderer aktiver Arbeitsplatz dieser Einrichtung hat diesen Namen.“ ist der Wortlaut, den der Bildschirm zeigt). | Leer |
| Was das Token erhält | Auswahl **De-identifiziert** oder **Identifizierend** | Pflicht | Identifizierend ist gesperrt, solange keine Freigabe erfasst ist. Identifizierend betrifft nur die Datensätze Fälle, Proben, Abrechnung und Qualität; für andere Datensätze wird es abgelehnt. | De-identifiziert |
| Datensätze, die dieses Token lesen darf | Kontrollkästchen der Datensätze, die der Feed anbietet | Pflicht (mindestens einer) | Ein Datensatz, den der Feed nicht anbietet, wird abgelehnt. | Keine |
| Einrichtungen, die dieses Token lesen darf | Kontrollkästchen der Einrichtungen, die der Feed anbietet | Optional | Ohne Auswahl gelten alle Einrichtungen, die der Feed anbietet. | Keine |
| Token erstellen | Schaltfläche | Nicht zutreffend | Zeigt das Token einmal mit Kopieren. Der Wortlaut „Kopieren Sie dieses Token jetzt ... Es wird nur einmal angezeigt.“ Ein Token beginnt mit `psbi_` und gilt 365 Tage. | Nicht zutreffend |

Die Tokenliste und der Abruftest.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Name, Datensätze, Einrichtungen, Modus, Token, Zuletzt abgerufen, Status | Schreibgeschützte Spalten | Nicht zutreffend | Das Token zeigt die letzten vier Zeichen und das Ablaufdatum. Der Status ist **Aktiv**, **Läuft bald ab** (innerhalb von 30 Tagen), **Token abgelaufen** oder **Widerrufen**. „Zuletzt abgerufen“ zeigt den Datensatz, die Zeilen und die Zeit. | Nicht zutreffend |
| Neues Token (ersetzen) | Schaltfläche in einer Zeile | Nicht zutreffend | Stellt ein Ersatztoken aus. Das bisherige Token funktioniert noch 24 Stunden, damit das Werkzeug aktualisiert werden kann. | Nicht zutreffend |
| Widerrufen | Schaltfläche, dann Grund und Notiz | Grund erforderlich | Gründe: Möglicherweise kompromittiert, Versehentlich registriert, An anderen Standort verlegt, Rechner ersetzt, Rechner außer Betrieb, Sonstiges. Eine Notiz ist bei Sonstiges erforderlich und sonst optional. **Jetzt widerrufen** bestätigt. Ein widerrufenes Token funktioniert sofort nicht mehr. | Nicht zutreffend |
| Token (Abruf testen) | Text | Pflicht | Ein eingefügtes Token. | Leer |
| Datensatz (Abruf testen) | Auswahl der Datensätze | Pflicht | Der Datensatz, der angefordert wird. | Erster Datensatz |
| Abrufen | Schaltfläche | Nicht zutreffend | Zeigt, wie der Server antworten würde: Akzeptiert (Zeilen und Felder sowie der Modus) oder Abgelehnt, weil es nicht die Form eines Feed-Tokens hat, kein Token passt, es widerrufen ist, es abgelaufen ist, der Datensatz nicht zulässig ist, der Feed aus ist, ein identifizierendes Token keine Freigabe hat oder das Token in der letzten Minute 60-mal abgerufen hat. | Nicht zutreffend |
| Feldkatalog | Schreibgeschützte Tabelle: Feld, Typ, De-identifizierter Feed | Nicht zutreffend | Jedes Feld jedes Datensatzes, so wie eine Analystin oder ein Analyst die Spalte sieht. Die letzte Spalte zeigt **Beibehalten**, **Entfernt** oder **Auf den Monat reduziert**. | Nicht zutreffend |

Die lesende API gibt standardmäßig 1000 Zeilen je Seite zurück und höchstens 10000.

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Einstellungen: `config:bi-feed:manage`. Token erstellen, ersetzen und widerrufen sowie Abruf testen: `config:bi-feed-tokens:manage`. Die Freigabe für identifizierende Token erfassen und zurückziehen: `config:bi-feed-identified:approve`. Alle drei haben hohes Risiko. Admin und Laborleitung haben sie standardmäßig; die Person, die ein identifizierendes Token erstellt, und die Person, die es freigibt, können daher dieselbe Person sein, sofern ein Krankenhaus sie nicht im Rollenverzeichnis trennt.

**Bekannte Grenzen.** Der Feed wird noch nicht bereitgestellt; in der Demonstrationsversion funktionieren nur die Einstellungen und Token. Während die Daten laden und in einigen Problemmeldungen sagt der Bildschirm „Arbeitsplatz“, wo er ein Feed-Token meint (ein Versehen im Wortlaut). Die Grenze des Tokens von 60 Abrufen je Minute und die Gültigkeit von 365 Tagen sind im Code festgelegt.
### Auftragsschein-Import {#screen-requisition_ingestion}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Auftragsschein-Import

**Status:** Teilweise

**1. Navigation:** Registerkarte **System** der Konfiguration > Gruppe **Integrationen**
**2. Wartungspunkt:** Auftragsschein-Import

**3. Fachlicher Zweck und Umfang.** Papier-Auftragsscheine werden vom Abteilungsscanner stapelweise in einen Ordner im Krankenhausnetz oder in ein Dokumentensystem eines Drittanbieters (ein ECM, der Dokumentenspeicher des LIS, ein Scan-Dienst) gescannt oder von einem anderen System an die PathScribe-API gesendet. Jeder Ordner und jedes System ist eine Quelle, eingerichtet über ihre Adresse; es können beliebig viele sein. PathScribe liest den Eingangsnummer-Barcode jeder Seite und verknüpft den Scan mit seinem Fall, nur als Verweis: Der Fall behält einen Verweis auf die Datei an ihrem Speicherort, die zugehörigen Seiten, den Barcode, den Zeitpunkt und die Quelle; PathScribe behält keine Kopie. Eine Seite ohne Barcode gehört zum vorherigen Auftragsschein; ein Trennblatt beendet einen Auftragsschein und gehört zu keinem Fall. Ein Scan ohne passenden Fall wartet in der Warteschlange der nicht zugeordneten Auftragsscheine unter Eingang > **📥 Auftragsschein-Eingang**, wo das Personal ihn durch Scannen oder Eingeben der Eingangsnummer zuordnet oder mit Grund verwirft.

**Was gebaut ist und was nicht.** Gebaut: diese Einstellung, die Regeln für Zuordnung und Seitengruppierung, der Auftragsschein-Eingang, die Schaltfläche **📄 Auftragsschein** des Falls auf dem Befundbildschirm und das Audit-Protokoll. In der Demonstrationsversion liest der Browser einen Ordner mit fiktiven PDFs, wenn jemand **Jetzt ausführen** drückt. Nicht gebaut: der geplante Serverjob, der Ihre Freigabe liest (`requisition.ingest`), das Lesen einer gedruckten Nummer ohne Barcode (OCR) und die API, an die ein sendendes System Scans übermittelt. Nur PDFs werden gelesen; jede andere Datei wird abgelehnt und in der Zusammenfassung des Laufs genannt.

**Mehrere ausführende Einrichtungen.** Jede Quelle gehört zu einer ausführenden Einrichtung (Feld **Ausführende Einrichtung**) oder zu **Alle Einrichtungen** für einen Scanner, den alle Labore teilen. Die Scans einer Quelle warten in der Warteschlange dieser Einrichtung, und jede Berechtigung unten wird für diese Einrichtung geprüft: Wer nur einem Labor zugeordnet ist (Personal → seine Einrichtungen), sieht, startet und bearbeitet nur die Scanner und Scans dieses Labors, und nur wer für alle Einrichtungen arbeitet, kann eine gemeinsame Quelle anlegen oder ändern. **＋ Quelle hinzufügen** fügt einen weiteren Scanner hinzu; die Schaltflächen über dem Formular wechseln zwischen ihnen. Die Zuordnung gilt unternehmensweit: Eine Eingangsnummer bezeichnet genau einen Fall, daher findet ein in einem Labor gescannter Auftragsschein auch einen Fall, der in einem anderen ausgeführt wird.

**Betrieb (serverlos).** Jede Quelle wird von einem geplanten Job gelesen, der einen Stapel verarbeitet und endet; in der PathScribe-Cloud läuft nichts dauerhaft. Ein Dokumentensystem eines Drittanbieters wird unter seiner https-Adresse gelesen, ein sendendes System sendet an die PathScribe-API. Ein Ordner im Krankenhausnetz wird vom PathScribe-**Standortagenten** gelesen, der dort bereits für Drucker und Freigaben installiert ist ([Standortagenten](#screen-site_agents)): Er liest die Barcodes im Krankenhausnetz und sendet PathScribe nur Dateiverweis, Seiten und Barcodes, sodass das PDF das Krankenhaus nie verlässt. Die Abholung von Auftragsscheinen durch den Standortagenten ist noch nicht gebaut. Die Prüfung auf fehlende Auftragsscheine läuft stündlich.

**4. Voraussetzungen und Abhängigkeiten.** Der Scanner speichert PDFs (eine Datei kann viele Auftragsscheine enthalten) in einem Ordner, den der API-Server lesen kann, und die Eingangsetiketten auf den Auftragsscheinen tragen die Eingangsnummer als Code-128- oder Code-39-Barcode.

Setup step: Tier 6, step 7
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-requisition_ingestion - the requisition source, schedule and separator barcode]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Diese Quelle lesen | Ja/Nein-Schalter | Optional | Solange er aus ist, liest der Job diese Quelle nicht. | Ein |
| Name | Text | Pflicht | Wird im Auftragsschein-Eingang angezeigt. | Requisition scanner drop folder |
| Ausführende Einrichtung | Auswahl: **Alle Einrichtungen** oder eine ausführende Labor-Einrichtung | Pflicht | Wem dieser Scanner gehört: Seine Scans warten in der Warteschlange dieser Einrichtung, und die Berechtigungen werden für sie geprüft. | Die Demonstrationsquelle: Desert Valley Medical Center; eine neue Quelle: das erste ausführende Labor |
| Herkunft der Scans | Auswahl **Ein Ordner im Krankenhausnetz, in den der Scanner speichert**, **Ein Dokumentensystem eines Drittanbieters, das PathScribe unter seiner Adresse liest** oder **Ein System, das Scans an die PathScribe-API sendet** | Pflicht | Bestimmt, was das nächste Feld enthält. Legen Sie für jeden Ordner oder jedes System eine Quelle an; es können beliebig viele sein. | Ein Ordner im Krankenhausnetz, in den der Scanner speichert |
| Ordneradresse / Systemadresse (https) / Sendendes System | Text | Pflicht | Ein Ordner: ein Netzwerkpfad (zum Beispiel `\\server\requisitions\inbox`) oder eine smb://-, nfs://-, file://- oder https://-Adresse. Ein Drittsystem (ein ECM, der Dokumentenspeicher des LIS, ein Scan-Dienst): seine https-Adresse; der Server liest dort neue Scans mit auf dem API-Server eingerichteten Zugangsdaten, nie im Browser. Ein sendendes System: sein Name, wie es sich bei der API anmeldet. Eine Adresse in falscher Form wird rot markiert und kann nicht gespeichert werden. | `\\lab-scan01\requisitions\inbox` (Demonstration) |
| Lesen alle (Minuten) | Ganzzahl, 1 bis 1.440 | Pflicht | Wie oft der Job die Quelle liest. | 15 |
| Barcode des Trennblatts | Text | Pflicht | Der Barcode auf dem Blatt zwischen Auftragsscheinen in einem Stapelscan. | `PATHSCRIBE-SEPARATOR` |
| Speichern | Schaltfläche | Nicht zutreffend | Deaktiviert, solange sich nichts ändert oder ein Feld ungültig ist. Zeigt „Zuletzt gespeichert“ mit Zeitpunkt und Person. | Nicht zutreffend |

**Erwartete Auftragsscheine.** Die zweite Karte dieses Bildschirms legt fest, welche Fälle einen gescannten Auftragsschein haben sollten, für die Organisation (**Standard der Organisation**) oder für eine ausführende Einrichtung (eine Einrichtung folgt dem Standard, bis ihre eigene Einstellung gespeichert ist).

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Gilt für | Auswahl: **Standard der Organisation** oder eine ausführende Labor-Einrichtung | Pflicht | Welche Einstellung bearbeitet wird. | Standard der Organisation |
| Ein gescannter Auftragsschein wird erwartet für | Kontrollkästchen: **Elektronischer KIS-/LIS-Auftrag**, **Im Eingang erfasst, ohne importierten Auftrag**, **Externer Fall / Auftragsfall**, **Erfassung bei Systemausfall**, **Lockbox-Einwurf** | Optional | Ein Fall soll einen haben, wenn sein Auftrag auf eine angekreuzte Weise kam. Ein elektronischer KIS-/LIS-Auftrag ist der Auftrag (seine Auftragsnachricht) und braucht standardmäßig kein Papier. Ein aus einem importierten Auftrag erfasster Fall gilt als elektronisch. | Alle angekreuzt außer Elektronischer KIS-/LIS-Auftrag |
| Fall markieren nach (Stunden) | Ganzzahl, 0 bis 720 | Pflicht | Stunden nach der Erfassung ohne zugeordneten Schein, bevor der Fall markiert wird. 0 markiert sofort. Blockiert die Arbeit nie. | 24 |
| Scan ohne Fall markieren nach (Stunden) | Ganzzahl, 0 bis 720 | Pflicht | Stunden, die ein Scan in der Warteschlange warten darf, bevor er rot „Noch kein Fall“ markiert und nach oben gestellt wird: vielleicht ein nicht eingegangenes, verlorenes oder nicht erfasstes Präparat. | 24 |
| Erwartungen speichern | Schaltfläche | Nicht zutreffend | Speichert die angezeigte Einstellung. Protokolliert (Requisition Expectation Saved). | Nicht zutreffend |

Ein markierter Fall erscheint unter **Fälle ohne Auftragsschein** im Auftragsschein-Eingang, zeigt **⚠ Auftragsschein fehlt** auf dem Befundbildschirm und erhält eine Fall-Abweichung **Missing Requisition** (von System erfasst), die im Abweichungsablauf und in den QS-Berichten verfolgt wird. Das Zuordnen seines Scans schließt Markierung und Abweichung (Lösung **Requisition Received or Not Required**); ebenso **Kein Papierauftrag** mit Grund (Elektronischer Auftrag vorhanden, Mündlicher Auftrag, dokumentiert, Auftrag in einem anderen Datensatz, Sonstiges). Die Prüfung läuft mit dem Import: auf dem Server als geplanter Job, in der Demonstration bei jedem Öffnen des Eingangs oder bei **Jetzt ausführen**. Audit-Ereignisse: Requisition Missing, Requisition Received, Requisition Waived, Requisition Without Case.

**Die Warteschlange nicht zugeordneter Auftragsscheine (Quarantäne).** Ein Scan, dessen Barcode zu keinem Fall passt oder unlesbar ist, kommt automatisch dorthin (Requisition Quarantined). Das Personal öffnet **Ansehen**, prüft die Seiten und ordnet ihn dann zu: durch Scannen oder Eingeben der Eingangsnummer, durch Eingabe eines Patientennamens oder einer Patientennummer zur Suche (Liste **Gefundene Fälle**, im Rahmen des eigenen Fallzugriffs), oder mit **Neuer Fall aus diesem Scan**, das den Eingang mit dem Scan öffnet; beim Speichern wird er dem neuen Fall zugeordnet (erfordert `case:accession:create`). Jede Zuordnung wird protokolliert (Requisition Re-associated), mit der Angabe, ob eingegeben, über die Suche gefunden oder neu angelegt.

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Quelle ändern: `config:requisition-ingestion:manage` (hohes Risiko, protokolliert; standardmäßig Admin). Im Auftragsschein-Eingang: `requisition:inbox:review` (öffnen und einen wartenden Scan ansehen), `requisition:inbox:resolve` (zuordnen oder verwerfen), `requisition:ingestion:run` (Jetzt ausführen); die Rollen, die den Eingang öffnen, haben standardmäßig alle drei. Aus dem Fall: `case:requisition:view` (die Rollen mit Fallzugriff). Das Audit-Protokoll zeigt Requisition Matched, Requisition Quarantined, Requisition Re-associated, Requisition Discarded, Requisition Viewed und Requisition Source Saved, ohne Dateinamen und ohne Patientennamen. Die Befehle des Auftragsschein-Eingangs stehen in der Aktionsliste (Konfiguration → Aktionsregister und Personal → Rollen, Gruppe **Requisition Inbox**): zum Eingang wechseln, Import jetzt ausführen (Alt+G oder per Sprache im Eingang), gescannten Auftragsschein ansehen, nicht zugeordneten Auftragsschein zuordnen, verwerfen, Auftragsschein des Falls anzeigen. Eingangsmitarbeiter haben standardmäßig alle; die Rollen mit Fallzugriff das Anzeigen des Auftragsscheins. Eine Befehlsfreigabe erweitert nie, was die Berechtigungen oben erlauben.

**Bekannte Grenzen.** Ein druckbares Trennblatt gibt es noch nicht: Drucken Sie den Barcode mit einem beliebigen Etikettenwerkzeug. Wird eine Datei an ihrem Speicherort verschoben oder gelöscht, kann der Auftragsschein des Falls nicht mehr geöffnet werden, da PathScribe keine Kopie behält.

### Migrations-Feldzuordnungen {#screen-migration_field_mappings}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Migrations-Feldzuordnungen

**Status:** Umgesetzt

**1. Navigation:** Registerkarte **System** der Konfiguration > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Wartungspunkt:** Migrations-Feldzuordnungen

**3. Fachlicher Zweck und Umfang.** Ordnet für jedes Quellsystem die eigenen Quellfeldnamen eines Alt-LIS den Migrations-Zielfeldern von PathScribe zu. Ein Kunde mit mehreren Institutionen migriert möglicherweise aus mehr als einem Altsystem, daher gehört jede Zuordnung zu einem Quellsystem. Der Import historischer Datensätze liest diese Zuordnungen. Ein Quellfeld ohne Zuordnung wird beim Import gemeldet und nicht kopiert.

**4. Voraussetzungen und Abhängigkeiten.** Es muss zuvor nichts konfiguriert werden. Der Import unter [Historische Datenmigrations-Aufträge](#screen-migration-jobs) benötigt mindestens eine aktive Zuordnung für das Quellsystem. Wenn Sie das auslassen, sagt der Import „Dieses Quellsystem hat keine aktiven Feldzuordnungen.“

Setup step: Tier 6, step 5
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: [Historische Datenmigrations-Aufträge](#screen-migration-jobs)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-migration_field_mappings - Liste der Migrations-Feldzuordnungen mit Filter für das Quellsystem und Zuordnung hinzufügen]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Filter Quellsystem | Auswahlliste, **Alle Quellsysteme** oder ein System | Optional | Filtert die Liste. | Alle Quellsysteme |
| Listenzeile | Schreibgeschützt: Quellfeld, Zielfeld, Kategorie und **Inaktiv**, wenn ausgeschaltet | Nicht zutreffend | Eine Zuordnung je Zeile, mit **Bearbeiten**. „Keine Feldzuordnungen erfasst.“, wenn die Liste leer ist. | Nicht zutreffend |
| Legacy-Quellsystem | Text, Platzhalter `LegacyLIS-Cerner` | Pflicht | Der Name des Altsystems. Die Liste der Quellsysteme im Import wird aus diesen Namen aufgebaut. | Leer |
| Kategorie | Auswahl aus Demografische Daten, Zugangsdetails, Makro-/Mikrotext, SNOMED/ICD-O-Codierung, Objektträger-/Blockinventar, PDF-Berichtsarchiv, Diskretes synoptisches Feld | Pflicht | Bestimmt, welche Zielfelder angeboten werden. | Erste Kategorie |
| Quellfeldname | Text, Platzhalter `PT_FNAME` | Pflicht | Der Feld- oder Spaltenname des Altsystems, wie er in der Kopfzeile der Datei oder im JSON steht. | Leer |
| Zielfeld | Auswahlliste der Felder der Kategorie | Pflicht | Demografische Daten: Vorname, Nachname, Geburtsdatum, MRN, Geschlecht. Zugangsdetails: alte Eingangsnummer, Eingangsdatum, Name des anfordernden Arztes, Name der Einrichtung, Probenbeschreibung. Makro-/Mikrotext: makroskopische Beschreibung, mikroskopische Beschreibung, Enddiagnose. Codierung: SNOMED-Codes, ICD-O-Codes. Objektträger-/Blockinventar: Block-IDs, Objektträger-IDs. PDF-Archiv: URL des archivierten Befunds. Synoptisches Feld: synoptische Felder. | Keines ausgewählt |
| Transformationshinweis (optional) | Text, Platzhalter „z. B. MM/DD/YYYY in ISO umwandeln“ | Optional | Ein Hinweis für die Person, die die Zuordnung liest. | Leer |
| Zuordnung hinzufügen, Bearbeiten, Speichern, Abbrechen | Schaltflächen und Fenster | Nicht zutreffend | Eine zweite aktive Zuordnung für dasselbe Quellsystem und dasselbe Quellfeld wird abgelehnt: „A mapping for (field) already exists for (system).“ | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Hinzufügen und bearbeiten: `config:migration-mappings:manage` (hohes Risiko). Admin und Laborleitung haben sie standardmäßig. Dieselbe Funktion schützt das Ausführen eines Imports.

**Bekannte Grenzen.** Der Transformationshinweis ist nur ein Kommentar: Kein Code wendet ihn an, daher wird ein Datum in einem anderen Format nicht umgewandelt, indem Sie einen Hinweis schreiben. Das Kennzeichen „aktiv“ einer Zuordnung wird gespeichert und vom Import beachtet, aber das Fenster hat keinen Schalter, um es zu ändern, daher ist eine neue Zuordnung stets aktiv. Es gibt keine Schaltfläche zum Löschen.

### Historische Datenmigrations-Aufträge {#screen-migration-jobs}
Breadcrumb: Startseite > Konfiguration > Migrationsaufträge

**Status:** Teilweise

**1. Navigation:** Die Adresse `/migration-jobs`, verfügbar für jeden, der den Bildschirm Konfiguration hat. Es gibt keinen Menüeintrag, der sie öffnet; geben Sie Ihren Administratorinnen und Administratoren daher die Adresse.
**2. Wartungspunkt:** Historische Datenmigrations-Aufträge

**3. Fachlicher Zweck und Umfang.** Status- und Kreuzvalidierungsberichte für Migrationsaufträge aus einem Alt-LIS und das Fenster **Altdatei importieren**, das einen Auftrag startet. Ein Auftrag meldet, wie viele Datensätze erfolgreich waren, fehlgeschlagen sind oder zu prüfen sind, und gleicht die Anzahl mit der Anzahl ab, die das Quellsystem angegeben hat. Mehrdeutige Patiententreffer, die beim Import gefunden werden, gehen an die bestehende Warteschlange Patiententreffer-Prüfung und werden hier nicht gesondert verfolgt.

**Was umgesetzt ist und was Simuliert ist.** Umgesetzt: das Lesen einer Datei, das Anwenden der Zuordnungen, das Validieren, der Abgleich mit Patienten, das Aufzeichnen des Auftrags und seiner Ergebnisse je Datensatz sowie der Abgleich der Anzahl. Simuliert: Der Import läuft im Browser, und die Entwurfsfälle, die er anlegt, sind als **Simuliert** gekennzeichnet. Ein Banner sagt, dass ein serverseitiger Massenimport ihn ersetzt. Die Datei selbst wird nicht aufbewahrt.

**4. Voraussetzungen und Abhängigkeiten.** Das Quellsystem muss aktive Feldzuordnungen haben, daher kommen zuerst die [Migrations-Feldzuordnungen](#screen-migration_field_mappings). Wenn Sie das auslassen, ist die Liste der Systeme im Fenster leer („Es haben noch keine Quellsysteme aktive Feldzuordnungen“).

Setup step: Tier 6, step 6
Requires: [Migrations-Feldzuordnungen](#screen-migration_field_mappings)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-migration-jobs - Liste der Migrationsaufträge mit Statuskennzeichen und der Schaltfläche Altdatei importieren]

**6. Feldreferenz.**

Die Liste und die Details.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Altdatei importieren | Schaltfläche | Nicht zutreffend | Öffnet das Importfenster. Ausgegraut ohne die Funktion. | Nicht zutreffend |
| Auftragszeile | Schreibgeschützt: Quellsystem, Statuskennzeichen, Kennzeichen **Simuliert**, Kennzeichen **Kreuzvalidierungsabweichung**, Anzahlen „n ok, n fehlgeschlagen, n zu prüfen“ | Nicht zutreffend | Klicken Sie, um die Details zu öffnen. Der Status ist **Ausstehend**, **Läuft**, **Abgeschlossen**, **Abgeschlossen mit Fehlern** oder **Fehlgeschlagen**. „Keine Migrationsaufträge vorhanden.“, wenn die Liste leer ist. | Nicht zutreffend |
| Kreuzvalidierung | Text | Nicht zutreffend | **Abgeglichen** (verarbeitet von angegeben), **Abweichung** (angegeben, verarbeitet und wie viele fehlen oder zusätzlich sind) oder „Keine angegebene Quellanzahl vorhanden, Abgleich nicht möglich“. | Nicht zutreffend |
| Anzahlen | Text | Nicht zutreffend | Erfolgreich, fehlgeschlagen, zu prüfen, von der Gesamtzahl der verarbeiteten. | Nicht zutreffend |
| Datensätze, die Aufmerksamkeit benötigen | Liste: Entwurfsfall oder Fehlermeldung | Nicht zutreffend | Fehlgeschlagene Datensätze zeigen den Fehler; mehrdeutige Treffer zeigen **MPI-Prüfung erforderlich**. | Nicht zutreffend |
| Datensätze | Liste jedes Datensatzergebnisses, mit **Erfolgreich**, **Fehlgeschlagen** oder **MPI-Prüfung erforderlich** | Nicht zutreffend | Das Ergebnis jedes Datensatzes und die ID seines Entwurfsfalls. | Nicht zutreffend |

Das Fenster Altdatei importieren.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Quellsystem | Auswahlliste der Systeme mit aktiven Zuordnungen | Pflicht | „Wählen Sie ein Quellsystem.“ | Keines |
| Altdatei (CSV oder JSON) | Datei, `.csv`, `.tsv`, `.txt` oder `.json`, bis zu 2000 Datensätze | Pflicht | Eine CSV-Datei braucht eine Kopfzeile mit den Feldnamen des Altsystems. JSON ist eine Liste von Datensätzen oder ein Objekt mit einer Liste `records`. Verschachtelte Werte werden ausgelassen und gezählt. Mehr als 2000 Datensätze werden abgelehnt. | Keine |
| Vom Quellsystem angegebene Datensatzzahl (optional) | Ganze Zahl | Optional | Wenn Sie sie kennen, gleicht der Auftrag sie mit den verarbeiteten Datensätzen ab. | Leer |
| Entwurfsfälle aus erfolgreichen Datensätzen anlegen | Kontrollkästchen Ja/Nein | Optional | Legt für jeden erfolgreichen Datensatz einen als **Simuliert** gekennzeichneten Entwurfsfall an und überspringt eine alte Eingangsnummer, die bereits importiert wurde („Bereits importiert“ lässt diesen Datensatz fehlschlagen). | An |
| Import starten | Schaltfläche | Nicht zutreffend | Führt aus und zeigt: Anzahlen, übersprungene Datensätze, weil sie bereits importiert wurden, angelegte Entwurfsfälle (Simuliert) und Quellfelder, die keine Zuordnung abdeckt. Eine Schaltfläche **Auftrag anzeigen** öffnet den Auftrag. | Nicht zutreffend |

Weitere Ablehnungen: Die Datei ist leer oder kein gültiges JSON, die erste Zeile enthält keine Feldnamen, die Datei enthält keine Datensätze, und „Sie haben keine Berechtigung, Altdatensätze zu importieren.“

**7. Berechtigungen.** Öffnen: `screen:configuration:open` (die Route wird durch den Bildschirm Konfiguration gesperrt). Import: `config:migration-mappings:manage` (hohes Risiko, protokolliert). Admin und Laborleitung haben sie standardmäßig.

**Bekannte Grenzen.** Die Route hat keinen Navigationseintrag. Der Import ist im Browser Simuliert; große oder produktive Importe warten auf den serverseitigen Massenimport. Die Obergrenze von 2000 Datensätzen ist im Code festgelegt.

### Simulierter Postausgang {#screen-simulated_mail}
Breadcrumb: Startseite > Konfiguration > System > Integrationen > Simulierter Postausgang

**Status:** Demonstration

**1. Navigation:** Registerkarte **System** der Konfiguration > Gruppe **Integrationen**
**2. Wartungspunkt:** Simulierter Postausgang

**3. Fachlicher Zweck und Umfang.** In der Demonstrationsversion ist kein Maildienst angeschlossen. Jede E-Mail, die das System gesendet hätte (eine Nachverfolgung, eine Einladung zum Tumorboard, ein Ereignis zur Prüfung einer Vorlage, ein Support-Ticket), wird hier aufbewahrt, mit der Kennzeichnung **Simuliert**, damit Sie sehen können, was gesendet worden wäre. Nichts verlässt den Browser. Eine Meldung sagt „Simulierte E-Mail erfasst, nicht gesendet“ und verweist hierher.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Einträge erscheinen, wenn eine Funktion eine E-Mail sendet.

Setup step: Reference, not part of setup
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-simulated_mail - Liste des simulierten Postausgangs und eine geöffnete Nachricht]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Anzahl | Text, „n simulierte E-Mail(s)“ | Nicht zutreffend | Die aufbewahrten Einträge. Der Postausgang behält die neuesten 200. | Nicht zutreffend |
| Erfasst, Art, An, Betreff | Schreibgeschützte Spalten | Nicht zutreffend | Die Art ist **E-Mail** oder **Vorlagenereignis**. Ein Empfänger, den der Server bestimmen würde, zeigt „(vom Server bestimmt)“. | Nicht zutreffend |
| Öffnen | Schaltfläche | Nicht zutreffend | Zeigt An, Cc, Betreff, Text und Anhänge, mit dem Hinweis „Simuliert: Diese Nachricht wurde an niemanden gesendet.“ | Nicht zutreffend |
| Postausgang leeren | Schaltfläche, mit einer Bestätigung | Nicht zutreffend | Entfernt jede simulierte E-Mail aus diesem Browser. | Nicht zutreffend |

**7. Berechtigungen.** Öffnen: `screen:configuration:open`. Der Abschnitt erscheint als bearbeitbar für jeden, der `config:vendor-integrations:manage` hat; die Schaltfläche Leeren hat keine Funktion.

**Bekannte Grenzen.** Nur Demonstration. Ein Server-Build sendet echte E-Mails über seinen Maildienst und führt keine simulierte Liste.

### Simulierte Schnittstellen-Engine {#screen-mock-interface-engine}
Breadcrumb: Startseite > Simulierte Schnittstellen-Engine

**Status:** Demonstration

**1. Navigation:** Die Adresse `/dev/mock-interface-engine`, nur in der Demonstrationsversion (`__DEMO_TOOLS__`). Ein Build, der mit einem API-Server spricht, enthält sie nicht. Die Seite hat keinen Menüeintrag.
**2. Wartungspunkt:** Simulierte Schnittstellen-Engine (PS-239)

**3. Fachlicher Zweck und Umfang.** Ein Werkzeug für Entwicklung und Demonstration. Es antwortet anstelle von Systemen, die es noch nicht gibt, sodass Sie eine molekulare Arbeitsliste übermitteln, eine Charge für Whole-Slide-Scans senden oder jede andere Schnittstellennachricht verschicken und eine realistische Antwort sehen können: Erfolg, eine bestimmte Ablehnung oder eine hängende Verbindung. Die Seite öffnet mit der Warnung „Entwicklerwerkzeug, keine echte Funktion.“ Sie hat vier Teile: die Antworteinstellungen, einen Simulator für eingehende Nachrichten, ein Protokoll dessen, was die simulierte Engine empfangen hat, und einen Simulator für Antworten eines Registers.

**4. Voraussetzungen und Abhängigkeiten.** Keine. Sie benötigt die Demonstrationsversion.

Setup step: Reference, not part of setup
Requires: Keine, dies ist ein Ausgangspunkt.
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-mock-interface-engine - Einstellungen der simulierten Schnittstellen-Engine, Simulator für eingehende Nachrichten, Engine-Protokoll und Simulator für Registerantworten]

**6. Feldreferenz.**

Antworteinstellungen.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Schalter Aktiviert und Status | Schaltfläche, mit dem Status „echte Versandaufrufe werden abgefangen“, „wird gestartet“ oder „kein Abfangen“ | Optional | Startet oder stoppt den Abfangmechanismus im Browser für den Aufruf der molekularen Arbeitsliste. | Aus |
| Antwortmodus | Auswahl **Immer erfolgreich**, **Immer fehlschlagen**, **Zeitüberschreitung** | Pflicht | „Immer erfolgreich“ antwortet mit HTTP 200. „Immer fehlschlagen“ antwortet mit dem unten genannten Status. „Zeitüberschreitung“ antwortet nie, sodass die Übermittlung auf „Wird versendet...“ stehen bleibt. | Immer erfolgreich |
| HTTP-Fehlerstatus | Ganze Zahl | Optional | Wird bei „Immer fehlschlagen“ angezeigt. Ein leerer oder Nullwert kehrt zu 500 zurück. | 500 |
| Für den Objektträgerscanner antworten | Kontrollkästchen Ja/Nein | Optional | Meldet nach der Annahme einer Scancharge jeden Objektträger zuerst als wird gescannt und dann als gescannt, sodass das Scannen von Objektträgern durchgängig gezeigt werden kann. | An |
| Ergebnisse des Molekulargeräts | Auswahl **Positiv**, **Negativ**, **Keine Ergebnisse** | Optional | Meldet nach der Annahme einer molekularen Arbeitsliste dieses Ergebnis für jede Patientenprobe, mit Kontrollen wie erwartet. | Keine Ergebnisse |

Die drei Felder.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Simulator für eingehende Nachrichten: Beispielnachricht | Auswahlliste mit 14 Beispielen: A01 Aufnahme; A01 Aufnahme mit verifizierter NHS-Nummer; A08 Aktualisierung; A24 Verknüpfung; A34 Zusammenführung (ältere Form); A40 Zusammenführung; A40 mit unbekannten Patienten (geht in die Ausnahmewarteschlange); A43 Verschiebung eines Besuchs; A45 Verschiebung eines Besuchs (Besuchsebene); A47 Änderung der Kennung; A50 Änderung der Besuchsnummer; und drei Ereignisse (Block beschädigt oder verloren, HPV-Ergebnis empfangen, Material ins Archiv verbracht) | Optional | **Beispiel laden** füllt das Feld. | Keines |
| Simulator für eingehende Nachrichten: Nachricht (HL7 oder JSON-Ereignis) | Freitext, als Patientendaten gekennzeichnet | Pflicht | Eine Nachricht oder ein Ereignis, die oder das durch dieselben Prozessoren läuft, die ein echter Listener verwenden würde. | Leer |
| Simulator für eingehende Nachrichten: Nachricht verarbeiten | Schaltfläche | Nicht zutreffend | Zeigt **Verarbeitet** oder **Nicht angewendet**. Eine Nachricht, die nicht zugeordnet werden kann, wird als Schnittstellenausnahme in die Warteschlange gestellt: „Öffnen Sie Audit, Fehlerprotokoll, Schnittstellen, um sie von Hand zu verknüpfen.“ Mit der Kennzeichnung **Simuliert**. | Nicht zutreffend |
| Von der simulierten Schnittstellen-Engine empfangen | Schreibgeschützte Liste: Wann, Nachrichtentyp, Ergebnis (**Akzeptiert**, **Abgelehnt**, **Zeitüberschreitung**), Öffnen | Nicht zutreffend | Ist keine Engine-Adresse eingestellt, landet jede ausgehende Nachricht hier, statt den Browser zu verlassen. **Öffnen** zeigt die Nachricht; **Liste leeren** leert sie. | Nicht zutreffend |
| Registerbestätigung empfangen: Register, Status, Antwort | Auswahllisten | Pflicht | Wählen Sie, was das Register zu einer gesendeten Meldung sagen würde: Akzeptiert, Akzeptiert mit Warnungen, Abgelehnt (korrigierbar), Abgelehnt (endgültig) oder Keine Antwort. **Empfangen** lässt sie durch die Funktion laufen, die der echte Eingangs-Endpunkt verwenden wird. Bei „Keine Antwort“ bleibt die Meldung in Erwartung einer Antwort. | Keine |

**7. Berechtigungen.** Die Route wird durch den Bildschirm Konfiguration gesperrt (`screen:configuration:open`). Die Bedienelemente haben keine Funktion.

**Bekannte Grenzen.** Nur Demonstration. Ihre Einstellungen werden im Browser aufbewahrt und nicht geteilt. Die Modi „Immer fehlschlagen“ und „Zeitüberschreitung“ wirken sich auf den Aufruf der molekularen Arbeitsliste aus, den der Abfangmechanismus behandelt; die simulierte Engine im Protokoll folgt für andere Nachrichten demselben Antwortmodus. Sie hat kein Beispiel für ein Weiterleitungsergebnis, sodass der Rückempfang vom Referenzlabor hier nicht gezeigt werden kann.
