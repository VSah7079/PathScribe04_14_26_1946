---
chapter: 5
id: ch5
title: Stufe 4: Das in PathScribe eingebettete KI-Framework
---

# Stufe 4: Das in PathScribe eingebettete KI-Framework {#ch5}

Stufe 4 umfasst alle Einstellungen, die festlegen, ob, wo und wie PathScribe künstliche Intelligenz (KI) verwendet, sowie die Prüfungen, die dafür sorgen, dass der Pathologe die Kontrolle über das Ergebnis behält. Lesen Sie dieses Kapitel mit einer Tatsache im Kopf: Das Framework ist enger gefasst als seine Gliederung. PathScribe ruft ein externes Sprachmodell für Befund- und Diktathilfen auf und übernimmt Ergebnisse aus Bildanalyseprodukten von Herstellern. Es enthält keine Computer-Vision-Engine, keinen Tumordetektor, keinen Zellzähler, keine Biomarker-Bewertung, keine eigenständige Engine zur Verarbeitung natürlicher Sprache (NLP) und kein Werkzeug zur Kalibrierung von Modellgewichten. Jedes dieser Elemente ist unten mit **Nicht umgesetzt** gekennzeichnet, zusammen mit dem, was am nächsten kommt und tatsächlich vorhanden ist.

Der Produktivbetrieb läuft auf Microsoft SQL Server hinter einer ASP.NET Core API. Die meisten Bildschirme in diesem Kapitel arbeiten heute im Browser mit Demonstrationsdaten; die Statuszeile jedes Bildschirms nennt, wie weit sein Serververtrag reicht.

## Einrichtung von Stufe 4 {#ch5-setup-order}
Breadcrumb: Startseite > Konfiguration > KI-Verhalten

Schließen Sie zuerst die Stufen 1 bis 3 ab. Stufe 4 liest Einrichtungen, Ärzte, Probentypen und Codesysteme aus diesen Stufen. Arbeiten Sie dann die Bildschirme in dieser Reihenfolge ab. Teil 4 jedes Bildschirms wiederholt dessen eigene Voraussetzungen.

1. [KI-Verhalten (Reiter)](#screen-tab-ai): Wählen Sie den KI-Dienst und das Modell, legen Sie die KI-Anbieterrichtlinie, die Konfidenzschwelle und den Standard für den Orchestrator fest.
2. [Validierungsstudien (Reiter)](#screen-tab-validation): der Einstieg zum Nachweis, dass ein Modell für Ihre Daten funktioniert.
3. [Validierungsstudien: Studien](#screen-validation-studies): eine Studie anlegen, genehmigen und aktivieren.
4. [Validierungsstudien: Berichte](#screen-validation-reports): eine Studie schließen und den Bericht drucken, der sie bewertet.
5. [KI-Anweisungen](#screen-ai_instructions): den Text freigeben, den die klinische Abweichungsprüfung an das Modell sendet.
6. [Regeln für klinische Diskrepanzen](#screen-clinical_mismatch_rules): festlegen, wann eine Diskrepanz warnt, protokolliert oder die Freigabe anhält.
7. [KI-Auslesen der Vorbefunde](#screen-history_extraction): das beratende Lesen früherer Fälle einschalten.
8. [Smart Capture](#screen-smart_capture): der Schalter für den Prototyp der Abrechnungsvorschläge und seine Checkliste für den Produktivbetrieb.

[Validierungsstudien: Dashboard](#screen-validation-dashboard) ist eine Seite für den Tagesbetrieb und gehört nicht zur Einrichtung. Eine Überschreibung des Modells für eine Einrichtung erfordert eine veröffentlichte Befundvorlage und eine bestandene Studie. Schließen Sie daher [Kapitel 6](#ch6) für die Vorlagen ab, bevor Sie sich auf eine Überschreibung für eine Einrichtung verlassen.

**Status der sechs Bereiche der Gliederung**

| Bereich | Status | Wo er konfiguriert wird |
|---|---|---|
| KI-Infrastruktur und Modellarchitektur | Umgesetzt für die Bildschirme und Einstellungen; Teilweise für die Serverseite (siehe jeden Bildschirm) | Konfiguration, Reiter **KI-Verhalten**; Einrichtungsverzeichnis, Reiter **KI & Leistung** ([Kapitel 2](#screen-facility-dictionary)) |
| Probenverfolgung und Computer-Vision-Unterstützung beim Zuschnitt | Nicht umgesetzt. Ein Herstellerverzeichnis und ein regelbasierter Prototyp für die Abrechnung sind vorhanden | Anbieterintegrationen, Kategorie Zuschnitt-Bildgebung ([Kapitel 4](#screen-vendor_integrations)); [Smart Capture](#screen-smart_capture) |
| NLP- und Auto-Strukturierungs-Engine | Teilweise. Einzelne Funktionen sind vorhanden; keine eigenständige Engine | [KI-Auslesen der Vorbefunde](#screen-history_extraction); Reiter Sprache und Makros ([Kapitel 4](#screen-tab-voice)); Werkzeuge auf der Befundseite |
| KI-Bildanalyse in der digitalen Pathologie | Teilweise. Die Übernahme von Herstellerergebnissen ist vorhanden. Tumorerkennung, Zellzählung und Biomarker-Bewertung sind Nicht umgesetzt | Anbieterintegrationen, Kategorien KI der digitalen Pathologie und Objektträger-Viewer ([Kapitel 4](#screen-vendor_integrations)); QS-Reiter KI-Diskordanz ([Kapitel 4](#screen-quality-assurance)) |
| Intelligente Qualitätskontrolle und Regeln zur Erkennung von Auffälligkeiten | Umgesetzt für die Bildschirme; Demonstration für die Serverseite der KI-Anweisungen | [Regeln für klinische Diskrepanzen](#screen-clinical_mismatch_rules); [KI-Anweisungen](#screen-ai_instructions); Regeln für abnormale Auslöser ([Kapitel 3](#screen-abnormal_trigger_rules)) |
| KI-Governance, Schwellen für die Kontrolle durch den Menschen, Kalibrierung | Umgesetzt für Governance und Schwellen. Kalibrierung der Gewichte: nicht vorhanden | [KI-Anweisungen](#screen-ai_instructions); [Validierungsstudien](#screen-tab-validation); Bereich Modellversionen im Reiter KI-Verhalten |

## KI-Infrastruktur und Modellarchitektur {#ch5-ai-infrastructure}
Breadcrumb: Startseite > Konfiguration > KI-Verhalten

**Status:** Umgesetzt für die Einstellungsbildschirme. Teilweise für den Server: Die Aufrufe im Produktivbetrieb sind beschrieben, einige sind noch nicht angeschlossen (aufgeführt bei jedem Bildschirm).

Dieser Abschnitt erklärt, wie ein KI-Aufruf erfolgt und wer bestimmt, was er verwendet. Der Bildschirm, der all das festlegt, [KI-Verhalten (Reiter)](#screen-tab-ai), folgt danach.

**Der KI-Proxy.** Der Browser enthält nie einen KI-Schlüssel. Er ruft die eigenen Routen `/api/ai/...` von PathScribe auf, und der Server ergänzt den Schlüssel aus einem Geheimnisspeicher wie Azure Key Vault. Routen gibt es für Anthropic, Google Gemini (Erzeugen, Streamen und Modellliste), OpenAI, Azure OpenAI (`/api/ai/azure/chat/completions`), einen benutzerdefinierten Endpunkt, AWS Bedrock (Aufruf und Streaming-Aufruf) sowie die Terminologieabfragen von UMLS und der National Library of Medicine. Der Server muss für jeden Aufruf einen Eintrag im Prüfprotokoll schreiben (ohne den Prompt-Text) und die Aufrufer in der Rate begrenzen. Der Proxy, den der Entwicklungs-Build verwendet, existiert im Produktivbetrieb nicht. Einen API-Schlüssel rotiert der Support von ForMedrixAI im Geheimnisspeicher des Servers. Kein Bildschirm setzt oder zeigt einen Schlüssel.

**Anbieter.** Der Bildschirm zeigt Herstellernamen. Intern wird jeder unter einer Kennung gespeichert, die nach dem Protokoll benannt ist, das er spricht.

| Angezeigt als | Gespeicherte Kennung | Angebotene Modelle (das erste ist der Standard, wenn Sie den Anbieter wählen) |
|---|---|---|
| Anthropic (Claude) | `structured_messages` | `claude-sonnet-4-6` (empfohlen), `claude-opus-4-8` (höchste Genauigkeit), `claude-haiku-4-5` (am schnellsten) |
| OpenAI (GPT-4) | `chat_completions` | `gpt-4o` (empfohlen), `gpt-4-turbo`, `gpt-4` |
| Azure OpenAI | `chat_completions_managed` | `gpt-4o` (Azure), `gpt-4-turbo` (Azure) |
| AWS Bedrock | `model_gateway` | `anthropic.claude-sonnet-4-6-v1:0`, `anthropic.claude-opus-4-8-v1:0`, `amazon.nova-pro-v1:0` |
| Google (Gemini) | `structured_content` | `gemini-1.5-flash` (empfohlen), `gemini-1.5-pro` |
| Selbst gehostet / benutzerdefinierter Endpunkt | `custom` | `custom` |
| Mock, Demomodus | `mock` | `mock-v1` |

Gehört die gespeicherte Anbieterkennung nicht zu diesen, verwendet PathScribe `structured_messages`. Eine Anbietereinstellung `mock` oder ein unbekannter Wert sendet den Aufruf trotzdem über den Proxy an die Anthropic-Route (ein offengelegtes Verhalten des Proxys, keine Abkürzung für die Demo). Bedrock benötigt eine Serverroute, die Anfragen signiert und einen normalisierten Stream zurückgibt; diese Route gehört zum Vertrag des Proxys.

**Welche Einstellung gilt.** PathScribe löst die KI-Konfiguration in dieser Reihenfolge auf: eine persönliche Überschreibung (nur in einer Entwicklersicht; kein Bildschirm setzt sie für einen Administrator), dann die Laboreinstellung der Organisation, dann die Standardwerte des Builds `VITE_AI_PROVIDER`, `VITE_AI_MODEL`, `VITE_AI_PROXY_URL`, `VITE_AI_GATEWAY_REGION` (Standard `us-east-1`), `VITE_AI_HOSTING_REGION` und `VITE_AI_MAX_TOKENS` (Standard 1000). Die Einstellung der Organisation wird unter dem Schlüssel `pathscribe_ai_org_config` gespeichert.

**Welches Modell jede Aufgabe verwendet.**

| Aufgabe | Verwendetes Modell | Hinweise |
|---|---|---|
| Hilfe für Befund und Narrativtext (Narrativtext erstellen, Synoptische Felder vorschlagen, Makrovorschläge, Suche nach kritischen Befunden, Vorlagenzuordnung) | Das Standardmodell der Organisation oder das eigene Modell der durchführenden Einrichtung, wenn im Einrichtungsverzeichnis im Reiter **KI & Leistung** eines festgelegt ist | Eine Einrichtung darf nur ein Modell wählen, für das eine gemeldete Studie mit der Bewertung BESTANDEN für diese Einrichtung vorliegt ([Validierungsstudien: Berichte](#screen-validation-reports)). Das Token-Limit und das Anfrageformat der Einrichtung gehören zum Modell. |
| Verfeinerung des Diktats | Das organisationsweite Standardmodell vom Typ Sprachdiktat | Keine Ebene für die Einrichtung. Ein Sprachmodell wird nur mit einer Studie, die mit BESTANDEN bewertet ist, zum Standard. Einstellung im Reiter Sprache ([Kapitel 4](#screen-tab-voice)). |
| KI-Zuordnung von synoptischen Vorlagen und Zuschnittvorlagen | Wie bei der Befundhilfe | Die Konfidenzschwelle für diese beiden ist im Code fest auf 60 gesetzt; es gibt keine Einstellung. Die Zuschnittzuordnung fällt auf die Standardvorlage für Gewebe zurück. |

**KI-Anbieterrichtlinie.** Eine Regel je Rechtsraum und optional eine engere Regel je Einrichtung legt fest, welche KI-Dienste und Hosting-Regionen für Arbeiten an diesem Ort verwendet werden dürfen. Ein Aufruf muss die Regel des Rechtsraums und die Regel der Einrichtung erfüllen. Ohne Regel ist jeder Dienst zulässig. Innerhalb einer Regel können die zulässigen Dienste alle oder eine Liste sein, und jeder zulässige Dienst kann eine Liste zulässiger Regionen tragen; keine Liste bedeutet jede Region. Ein Aufruf, dessen Region nicht erfasst ist, wird abgelehnt, wo Regionen eingeschränkt sind. Eine Ablehnung weicht nie auf einen anderen Dienst aus: Die Funktion arbeitet ohne KI weiter und zeigt "AI is not available for this jurisdiction". Der Anbieter "mock" ist immer zulässig. Der Server muss einen abgelehnten Aufruf mit 403 und dem Code `AI_VENDOR_NOT_ALLOWED` beantworten und ihn als `AI_CALL_REFUSED` protokollieren.

**KI-Prüfprotokoll.** Jeder KI-Aufruf schreibt einen Datensatz mit: Fall, Abschnitt, Anbieter, Modell, Status (abgeschlossen, Fehler, abgebrochen oder abgelehnt), Token-Anzahl, benötigter Zeit, Hosting-Region, Rechtsraum, Einrichtung und Funktion. Das Protokoll enthält die letzten 2000 Einträge und bleibt im Browser, bis der Server es erfasst. Kein Bildschirm zeigt es an.

**Orchestrator-Modus.** Der Orchestrator-Modus schreibt den Narrativtext eines Befunds in vier festen Schritten statt in einer einzigen Anfrage. Die Engine in `src/orchestrator/` ist der produktive Code. [KI-Verhalten (Reiter)](#screen-tab-ai) legt den Standard der Organisation fest, und eine Einrichtung kann ihn überschreiben. Wortlaut und Reihenfolge der Schritte sind nicht bearbeitbar.

### KI-Verhalten (Reiter) {#screen-tab-ai}
Breadcrumb: Startseite > Konfiguration > KI-Verhalten

**Status:** Umgesetzt

**1. Navigation:** Konfiguration, Reiter **KI-Verhalten**
**2. Pflegeeintrag:** KI-Verhalten (der gesamte Reiter)

**3. Geschäftlicher Zweck und Umfang.** Dieser Reiter enthält die KI-Einstellungen der Organisation: welche KI-Engine verwendet wird, ob KI für die makroskopische und die mikroskopische Arbeit läuft, wie sicher ein Vorschlag sein muss, bevor er angezeigt oder eingefügt wird, welcher Dienst und welches Modell hinter den Aufrufen stehen, wohin die KI-Anbieterrichtlinie Aufrufe zulässt, ob der Orchestrator-Modus eingeschaltet ist und welche Modellversionen zur Verfügung stehen. Alles gilt für die gesamte Organisation. Eine Einrichtung kann nur das Modell und den Schalter für den automatischen Entwurf des Narrativtexts überschreiben, und zwar in ihrem eigenen Datensatz im [Einrichtungsverzeichnis](#screen-facility-dictionary).

**4. Voraussetzungen und Abhängigkeiten.** Die Geltungsbereiche der KI-Anbieterrichtlinie sind die Rechtsräume und Einrichtungen, die Sie bereits angelegt haben; richten Sie diese daher zuerst ein. Überspringen Sie die Einrichtungen, kann der Bereich zur Richtlinie nur den eigenen Rechtsraum des Labors anbieten, sodass keine Regel für eine Einrichtung geschrieben werden kann.

Setup step: Tier 4, step 1
Requires: [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Validierungsstudien (Reiter)](#screen-tab-validation), [KI-Anweisungen](#screen-ai_instructions), [Regeln für klinische Diskrepanzen](#screen-clinical_mismatch_rules), [KI-Auslesen der Vorbefunde](#screen-history_extraction)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-ai - Reiter KI-Verhalten: Abzeichen KI-Engine, Verhaltensschalter, Anbietereinstellungen, KI-Anbieterrichtlinie, Orchestrator-Konfiguration und Modellversionen]

**6. Feldreferenz.** Die Bereiche erscheinen von oben nach unten in dieser Reihenfolge. Änderungen in der ersten Gruppe werden beim Vornehmen gespeichert.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Abzeichen **KI-Engine** | Schreibgeschütztes Abzeichen | Nicht zutreffend | Zeigt die Modellkennung, die gerade verwendet wird, oder "Mock - Demo Mode" mit einem Kennzeichen **DEMO**, wenn der Anbieter "mock" gewählt ist. | Nicht zutreffend |
| **Makroskopie-gesteuerte KI**, **Aktiviert** | Ja/Nein-Kontrollkästchen (`grossEnabled`) | Optional | Wenn aus, überspringen der Abschluss des Zuschnitts und die Assistenzabfrage die KI-Auswertung der makroskopischen Beschreibung. | Ein |
| **Mikroskopie-gesteuerte KI**, **Aktiviert** | Ja/Nein-Kontrollkästchen (`microscopicEnabled`) | Optional | Wenn aus, überspringen der Ablauf für Änderungen, das synoptische Seitenfenster und die Assistenzabfrage die KI-Arbeit am mikroskopischen Text. | Ein |
| **Konfidenzschwelle** | Schieberegler, ganze Zahl 0 bis 100 (`confidenceThreshold`) | Optional | Der Grad an Konfidenz, den ein Vorschlag braucht. Das synoptische Seitenfenster und das Abzeichen für die Prüfung des synoptischen Befunds verwenden ihn, um Vorschläge zu kennzeichnen. Ein Modell kann in seinem Fenster **Einstellungen** (unten) einen eigenen Wert tragen. Wird beim Ändern gespeichert. | 75 |
| **Erweitert**: Vorschläge bei oder über der Konfidenzschwelle automatisch einfügen | Ja/Nein-Kontrollkästchen (`autoInsertSuggestions`) | Optional | Wenn ein, trägt das synoptische Seitenfenster einen Vorschlag in das Feld ein, ohne auf die Annahme durch den Pathologen zu warten, falls seine Konfidenz die Schwelle erreicht. | Aus |
| **Erweitert**: Konfidenzwerte in der Editor-Oberfläche anzeigen | Ja/Nein-Kontrollkästchen (`showConfidenceScores`) | Optional | Wird nur gespeichert. Kein anderer Bildschirm liest ihn heute, daher hat eine Änderung keine Wirkung. | Ein |
| **Erweitert**: Makros basierend auf dem Diagnosekontext vorschlagen | Ja/Nein-Kontrollkästchen (`macroSuggestions`) | Optional | Wird nur gespeichert. Kein anderer Bildschirm liest ihn heute, daher hat eine Änderung keine Wirkung. | Aus |
| **Erweitert**: KI-Vorschläge nach Subspezialität filtern | Ja/Nein-Kontrollkästchen (`subspecialtyRouting`) | Optional | Wird nur gespeichert. Kein anderer Bildschirm liest ihn heute, daher hat eine Änderung keine Wirkung. | Ein |
| **Auf Standardwerte zurücksetzen** | Schaltfläche | Nicht zutreffend | Setzt alle oben genannten Verhaltenseinstellungen auf ihre Standardwerte zurück. Ändert weder den Anbieter noch die KI-Anbieterrichtlinie noch den Schalter für den Orchestrator. | Nicht zutreffend |

#### KI-Anbietereinstellungen
Breadcrumb: Startseite > Konfiguration > KI-Verhalten

Wird mit der Überschrift **KI-Anbieter - Organisationseinstellungen** nur für eine Person angezeigt, deren Rolle admin, pathologist-admin oder superadmin ist. Alle anderen sehen einen Hinweis, dass der Anbieter vom Administrator verwaltet wird. Ein Warnfeld erinnert Sie daran, dass Falltext das System in Richtung des gewählten Dienstes verlässt. Felder, die für den gewählten Anbieter nicht zutreffen, sind ausgeblendet.

[SCREENSHOT PLACEHOLDER: tab-ai-provider - KI-Anbietereinstellungen mit Anbieter, Modell und Hosting-Region]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **KI-Anbieter** | Auswahl, gruppiert nach **Produktionsanbieter** und **Entwicklung & Demo** | Pflicht | Wählt den Dienst. Mit der Wahl eines Anbieters wird **Modell** auf das erste Modell dieses Anbieters gesetzt. Ein kurzer Hinweis unter dem Feld beschreibt den Anbieter. | Anthropic (Claude), wenn nichts gespeichert ist |
| **Modell** | Auswahl aus der Liste des Anbieters (Tabelle oben) | Pflicht | Die Modellkennung, die bei jedem Aufruf gesendet wird. | Erstes Modell des Anbieters |
| **Azure-Ressourcenendpunkt** | https-Link; Platzhaltertext `https://my-org.openai.azure.com` | Pflicht für Azure OpenAI | Die Adresse Ihrer Azure-Ressource. Wird nur für Azure OpenAI angezeigt. | Keine |
| **Bereitstellungsname** | Text | Optional | Die Azure-Bereitstellung, die aufgerufen wird. Wird nur beibehalten, wenn auch ein Endpunkt gesetzt ist. Wird nur für Azure OpenAI angezeigt. | Keine |
| **AWS-Region** | Text | Optional | Die Bedrock-Region. Wird nur für AWS Bedrock angezeigt. | `us-east-1` |
| **Hosting-Region** | Text; Platzhaltertext `eu-west-1` | Optional | Die Region, in der der Anbieter den Aufruf verarbeitet, so benannt, wie der Anbieter sie nennt. Wird bei jedem Aufruf erfasst, damit die KI-Anbieterrichtlinie sie prüfen kann. Wird für jeden Anbieter außer AWS Bedrock und Mock angezeigt. | Leer (Region nicht erfasst) |
| **Basis-URL des Endpunkts** | https-Link | Pflicht für Benutzerdefiniert | Die Basisadresse eines OpenAI-kompatiblen Dienstes. PathScribe sendet darunter an `/chat/completions`. Wird nur für Selbst gehostet / benutzerdefinierter Endpunkt angezeigt. | Keine |
| Richtlinienwarnung | Schreibgeschützte Meldung | Nicht zutreffend | Erscheint, bevor Sie einen Dienst oder eine Region speichern, die eine Regel eines Rechtsraums oder einer Einrichtung in der Richtlinie unten nicht zulässt. | Nicht zutreffend |
| **Organisationskonfiguration speichern** | Schaltfläche | Nicht zutreffend | Speichert die Einstellung der Organisation. Erfordert `config:ai-provider:manage`. Wenn Sie den Reiter mit ungespeicherten Änderungen verlassen, werden Sie gewarnt. | Nicht zutreffend |
| **Verbindung testen** | Schaltfläche | Nicht zutreffend | Sendet eine Testanfrage (Funktion `connection-test`, 20 Tokens, mit der Bitte um die genaue Antwort "PathScribe AI connection OK"). Das Ergebnis lautet Testing, Connection OK oder Failed mit dem Fehler. | Nicht zutreffend |
| **Override löschen** | Schaltfläche | Nicht zutreffend | Erscheint nur in der Entwicklersicht, in der eine persönliche Überschreibung gesetzt werden kann. Wird einem Administrator nicht angezeigt. | Nicht zutreffend |

#### Wo PathScribe Daten speichert
Breadcrumb: Startseite > Konfiguration > KI-Verhalten

Eine schreibgeschützte Karte.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **Datenbank** | Schreibgeschützter Text | Nicht zutreffend | Die Region der Datenbank, übernommen aus `/api/config` des Servers. Zeigt **Nicht angegeben**, wenn der Server sie nicht liefert (die Demonstrationsversion hat keinen Server). | Nicht angegeben |
| **Dateispeicher (Befunde, Exporte)** | Schreibgeschützter Text | Nicht zutreffend | Die Region des Dateispeichers aus derselben Quelle. | Nicht angegeben |
| **KI-Dienst** | Schreibgeschützter Text | Nicht zutreffend | Die Hosting-Region, die in den KI-Anbietereinstellungen gesetzt ist. | Nicht erfasst |

#### KI-Anbieterrichtlinie
Breadcrumb: Startseite > Konfiguration > KI-Verhalten

Eine Tabelle mit Regeln, eine Zeile für den eigenen Rechtsraum des Labors und je eine für jede Einrichtung, die Sie betreuen, sowie das Bedienelement **Einrichtungsregel hinzufügen**. Eine Regel für eine Einrichtung schränkt die Regel ihres Rechtsraums ein. Das Prüfprotokoll-Ereignis für eine Änderung ist `AI_VENDOR_POLICY_CHANGED` (vorher und nachher).

[SCREENSHOT PLACEHOLDER: tab-ai-vendor-policy - Regeltabelle der KI-Anbieterrichtlinie und Regeleditor]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **Rechtsordnung oder Einrichtung** | Schreibgeschützter Text (Einrichtung angezeigt als Einrichtung und Rechtsraum) | Nicht zutreffend | Der Geltungsbereich der Regel. | Der Rechtsraum des Labors sowie jede betreute Einrichtung |
| **Zulässig** | Schreibgeschützter Text: **Keine Regel: jeder Dienst**, **Jeder Dienst** oder die Liste der Dienste | Nicht zutreffend | Was die Regel erlaubt. | Keine Regel: jeder Dienst |
| **Verwendeter Dienst** | Schreibgeschützter Text | Nicht zutreffend | Zeigt den Dienst, das Modell und die Region, die gerade verwendet werden, und ob dieser Geltungsbereich sie zulässt: **Zulässig**, **Nicht zulässig: Dienst**, **Nicht zulässig: Region** oder **Nicht zulässig: Region nicht erfasst**. | Nicht zutreffend |
| **Aktionen**: **Bearbeiten**, **Regel entfernen** | Schaltflächen | Nicht zutreffend | **Bearbeiten** öffnet den Regeleditor unten. **Regel entfernen** löscht die Regel, sodass der Geltungsbereich wieder jeden Dienst zulässt. | Nicht zutreffend |
| **Einrichtungsregel hinzufügen**, **Einrichtung wählen…** | Auswahl der betreuten Einrichtungen | Optional | Beginnt eine Regel für eine Einrichtung. | Keine |
| **Jeden Dienst zulassen** | Ja/Nein-Kontrollkästchen | Optional | Lässt alle Dienste zu. Wenn aus, haken Sie die Dienste an, die zulässig sein sollen. | Ein bei einer neuen Regel |
| Zulässige Dienste | Ein Kontrollkästchen je KI-Dienst | Pflicht, wenn **Jeden Dienst zulassen** aus ist | Mindestens ein Dienst muss zulässig sein, sonst wird das Speichern abgelehnt (**Lassen Sie mindestens einen Dienst zu oder entfernen Sie die Regel.**). | Keine |
| **Zulässige Regionen für** (Dienst) | Text, Regionen durch Kommas getrennt, zum Beispiel `eu-west-1, uksouth` | Optional | Leer lassen, um jede Region zuzulassen. Regionen werden von Leerzeichen befreit, in Kleinbuchstaben umgesetzt und dedupliziert. Ein leerer Eintrag oder Regionen bei einem Dienst, der nicht zulässig ist, werden abgelehnt. | Leer (jede Region) |
| **Regel speichern** | Schaltfläche | Nicht zutreffend | Speichert die Regel. Das Ergebnis lautet **Gespeichert** oder nennt den Grund der Ablehnung. | Nicht zutreffend |

#### Orchestrator-Konfiguration
Breadcrumb: Startseite > Konfiguration > KI-Verhalten

Ein ausklappbarer Bereich. Das Abzeichen **EIN - zum Umschalten klicken** oder **AUS - zum Umschalten klicken** ist der organisationsweite Standard für den Orchestrator-Modus.

[SCREENSHOT PLACEHOLDER: tab-ai-orchestrator - Orchestrator-Konfiguration mit den vier Generierungsschritten]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Schalter EIN/AUS | Ja/Nein-Schalter | Optional | Der Standard der Organisation. Eine Einrichtung kann ihn mit **Automatischer Befundentwurf** (Standard der Organisation übernehmen, Für das Labor aktiviert, Für das Labor deaktiviert) im Einrichtungsverzeichnis, Reiter **KI & Leistung**, überschreiben. Das Speichern erfordert `config:ai-provider:manage`. | EIN |
| Zusammenfassung der Schritte | Schreibgeschützter Text, "N von 4 Generierungsschritten aktiv" | Nicht zutreffend | Zählt die aktiven Schritte. | 4 von 4 |
| Schrittkarten | Schreibgeschützt: Schrittname, **AKTIV** oder **DEAKTIVIERT**, **KI-Anweisung**, **Kontextfelder** | Nicht zutreffend | Vier feste Schritte laufen nacheinander: Administrativer und klinischer Kopf, Probe und makroskopische Beschreibung, Zusammenfassung der synoptischen Daten, Zusatzuntersuchungen und Enddiagnose. Frühere Schritte liefern Kontext für spätere. | Im Code festgelegt |

#### Modellversionen
Breadcrumb: Startseite > Konfiguration > KI-Verhalten

Ein ausklappbarer Bereich mit der Kennzeichnung **Nur Administratoren**, der das Modellfenster enthält.

[SCREENSHOT PLACEHOLDER: tab-ai-models - Tabelle Modellversionen]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **Modell** | Schreibgeschützter Text | Nicht zutreffend | Der Name des Modells. | Nicht zutreffend |
| **Anbieter** | Schreibgeschützter Text | Nicht zutreffend | Der Hersteller des Modells. | Nicht zutreffend |
| **Typ** | Schreibgeschützt: Nur Makroskopie, Nur Mikroskopie, Makro + Mikro, Nur Diagnose, Sprachdiktat | Nicht zutreffend | Wofür das Modell gedacht ist. | Nicht zutreffend |
| **Genauigkeit** | Schreibgeschützter Prozentwert | Nicht zutreffend | Der für das Modell erfasste Benchmark-Wert. | Nicht zutreffend |
| **Verarbeitete Fälle** | Schreibgeschützte ganze Zahl | Nicht zutreffend | Fälle, die das Modell für Ihre Organisation bearbeitet hat. | 0 bei einem neu übernommenen Modell |
| **Status** | Schreibgeschützt: Aktiv, Beta, Zurückgezogen | Nicht zutreffend | Ein aus dem ForMedrixAI Store übernommenes Modell beginnt als Beta. | Nicht zutreffend |
| **Genehmigte Einrichtungen** | Schreibgeschützte Liste | Nicht zutreffend | Einrichtungen, deren festgelegtes Modell dieses ist. | Nicht zutreffend |
| **Standard** | Schreibgeschützte Markierung | Nicht zutreffend | Das Standardmodell der Organisation. | Nicht zutreffend |
| **Als Standard festlegen** | Schaltfläche | Nicht zutreffend | Macht das Modell zum Standard. Ein Sprachmodell kann ohne eine gemeldete Studie mit der Bewertung BESTANDEN nicht zum Standard werden. | Nicht zutreffend |
| **Außer Betrieb nehmen** | Schaltfläche, danach eine Bestätigung | Nicht zutreffend | Nimmt das Modell außer Betrieb. Die Bestätigung nennt die Einrichtungen, die darauf festgelegt sind. Das Standardmodell kann nicht außer Betrieb genommen werden. | Nicht zutreffend |
| **Einstellungen** | Schaltfläche | Nicht zutreffend | Öffnet das Fenster Modelleinstellungen unten. | Nicht zutreffend |

##### Fenster Modelleinstellungen
Breadcrumb: Startseite > Konfiguration > KI-Verhalten

[SCREENSHOT PLACEHOLDER: tab-ai-model-settings - Fenster Modelleinstellungen]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **Längste Antwort (Tokens)** | Ganze Zahl 50 bis 8000 | Optional | Das Meiste, was das Modell in einer Antwort schreiben darf. Leer verwendet die Einstellung der Organisation. | Leer |
| **Konfidenzschwelle (%)** | Ganze Zahl 0 bis 100 | Optional | Die eigene Schwelle dieses Modells. Leer verwendet die **Konfidenzschwelle** der Organisation. | Leer |

Alles andere wird mit "Geben Sie ganze Zahlen innerhalb der angezeigten Bereiche ein oder lassen Sie das Feld leer" abgelehnt. Dies sind die einzigen beiden Überschreibungen je Modell, die es gibt.

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Der Reiter ist schreibgeschützt für eine Person, die keine dieser vier Berechtigungen besitzt: `config:ai-behavior:manage` (Verhaltenseinstellungen und **Auf Standardwerte zurücksetzen**), `config:ai-provider:manage` (Anbietereinstellungen und Schalter für den Orchestrator), `config:ai-model:manage` (Standard festlegen, aktualisieren, außer Betrieb nehmen und ein Modell übernehmen) und `config:ai-vendor-policy:manage` (die KI-Anbieterrichtlinie). Das Feld für den KI-Anbieter erfordert zusätzlich die Rolle admin, pathologist-admin oder superadmin; das ist eine Prüfung der Rolle, keine Prüfung einer Berechtigung. Admin und Laborleiter besitzen die vier Berechtigungen standardmäßig über die Konfigurationsgruppen, und der Superadmin besitzt alles (außer `config:ai-prompt:approve`, aus Gründen der Aufgabentrennung zurückgehalten; die Laborleitung gibt KI-Anweisungen frei, der Support von ForMedrixAI nie). Die Änderung der KI-Anbieterrichtlinie wird als `AI_VENDOR_POLICY_CHANGED` protokolliert. Eine Änderung der Verhaltenseinstellungen erfasst nur die Prüfung der Berechtigung, nicht, was geändert wurde.

**Bekannte Grenzen.**
- `showConfidenceScores`, `macroSuggestions` und `subspecialtyRouting` werden gespeichert und von nichts anderem gelesen.
- Für die Verhaltenseinstellungen und die KI-Anbieterrichtlinie gibt es Serververträge (`CONFIG_SERVICES_API.md`, `AI_VENDOR_POLICY_API.md`; Modelle in `MODELS_API.md`). Bis der Server angeschlossen ist, arbeiten sie im Browser mit Demonstrationsdaten.
- Wortlaut, Reihenfolge und Feldzuordnung der Schritte in der Orchestrator-Konfiguration sind Geplant: Der Bildschirm zeigt "configurable in a future release".
- Die KI-Rechtschreibprüfung wurde zurückgezogen und hat keine Einstellung.
- Keine Einstellung schaltet die KI-Suche nach kritischen Befunden für sich allein ab. Sie folgt dem Anbieter, der KI-Anbieterrichtlinie und den [Regeln für abnormale Auslöser](#screen-abnormal_trigger_rules).
- Die Konfidenzuntergrenze für einen Befund „Auffällig“ ist 50 (Batch 655). Sie ist eine Konstante im Code, noch keine Einstellung, sodass ein Labor sie hier nicht ändern kann.
- **Das Fenster Codes (Batch 656).** Jeder vorgeschlagene medizinische Code wird auf zwei Wegen bestätigt: durch das Nachschlagen des Codes selbst und, daneben, durch die eigene Formulierung der KI; jeder der beiden bestätigt ihn. Ein Code, dessen Nachschlagen fehlschlägt, bleibt außerhalb der Liste und wird wie zuvor in einem Hinweis mitgezählt. Prüfungen von SNOMED CT laufen über die Server-Route, die `UMLS_API_KEY` enthält; starten Sie den Entwicklungsserver nach dem Bearbeiten von `.env` neu.
## Probenverfolgung und Computer-Vision-Unterstützung beim Zuschnitt {#ch5-specimen-vision}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Smart Capture

**Status:** Nicht umgesetzt für Computer Vision. Zwei verwandte Elemente sind vorhanden und werden hier beschrieben, damit niemand sie dafür hält.

PathScribe hat keine Computer-Vision-Engine für Proben. Nichts im Produkt liest eine Fotografie einer Probe, einer Kassette oder eines Objektträgers, um sie zu identifizieren, Blöcke zu zählen, eine Läsion zu vermessen oder sie zu verfolgen. Am nächsten kommen die folgenden Elemente, die vorhanden sind.

- **Das Herstellerverzeichnis für die Bildgebung beim Zuschnitt.** Eine Liste von Bildgebungsherstellern (zum Beispiel PAX-it!/PAXcam, PathoZoom und MacroPATH, genannt im Kommentar der Oberfläche) und wie jeder erreicht wird: Name, wie die Verbindung authentifiziert wird (keine, signierter Link, OAuth-2-Bearer-Token oder gegenseitiges TLS), die https-Basisadresse und ob der Hersteller Telepathologie unterstützt. Es ist eine Kategorie (`gross_imaging`) der [Anbieterintegrationen](#screen-vendor_integrations) in [Kapitel 4](#ch4), das ihre Felder beschreibt. Es enthält nur Adressen und führt keine Bildanalyse durch. Das Kamera-Bedienelement für den Zuschnitt im Fall ist eine einfache Fotoaufnahme; es speichert das Bild eingebettet, was als nicht konform gekennzeichnet ist, und die Verlagerung auf diese Herstellerkategorie ist zurückgestellt.
- **Zuschnitt-Hardware** ([Kapitel 2](#screen-grossing_hardware)) für Waagen, Kameras und Barcode-Geräte.
- **[Smart Capture](#screen-smart_capture)**, unten. Trotz des Namens ruft es kein KI-Modell auf und betrachtet kein Bild. Es ist ein fester Regelsatz, der Abrechnungszeilen vorschlägt.

### Smart Capture {#screen-smart_capture}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Smart Capture

**Status:** Umgesetzt (Prototyp). Er arbeitet mit Demonstrationsdaten und hat einen Serververtrag (`SIGNATURES_SMART_CAPTURE_API.md`), und die Ansicht im Fall trägt die Kennzeichnung "Prototyp, nicht Compliance-geprüft".

**1. Navigation:** Konfiguration, Reiter **System** > Gruppe **Labormaterialien & Arbeitsabläufe**
**2. Pflegeeintrag:** Smart Capture

**3. Geschäftlicher Zweck und Umfang.** Smart Capture schlägt für einen Fall Abrechnungszeilen nach Current Procedural Terminology (CPT) vor, und zwar aus den Wörtern der Probenbeschreibung, der Blockanzahl und der Anzahl der Färbungen. Die Regeln sind fest und versioniert (`sim-rules-1.0`): SC-LEVEL (88302 bis 88309 nach Stufe der Probe), SC-SPECIAL (88312), SC-IHC-FIRST und SC-IHC-ADDL (88342 und 88341) und SC-DECAL (88311). Es ist keine KI und keine Computer Vision. Der Ablauf lautet: vorschlagen, prüfen (jede Zeile annehmen oder ablehnen), freigeben (ein Pathologe bestätigt) und exportieren. In der Demonstration geht der Export an eine simulierte Engine. Dieser Bildschirm schaltet den Prototyp ein oder aus und erfasst die Checkliste für den Produktivbetrieb, die vollständig sein muss, bevor ein Export an eine echte Schnittstellen-Engine erlaubt ist.

**4. Voraussetzungen und Abhängigkeiten.** Die Regeln erfordern, dass CPT für den Rechtsraum in den Codiersystemen eingeschaltet ist. Überspringen Sie das, schlägt die Ansicht nichts vor und meldet `CPT_OFF`.

Setup step: Tier 4, step 8
Requires: [Codiersysteme](#screen-code_systems)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-smart_capture - Prototyp-Schalter von Smart Capture, Checkliste für den Produktivbetrieb und Exportschranke]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **Smart-Capture-Ansicht in der Abrechnungsprüfung anbieten** | Ja/Nein-Schalter | Optional | Wenn aus, wird die Smart-Capture-Ansicht im Bereich Abrechnung des Falls nicht angeboten. Protokolliert als "Smart Capture Prototype Switched". | Ein |
| **Klinische Validierung durchgeführt** | Ja/Nein-Haken; erfasst, wer ihn gesetzt hat und wann | Optional | Punkt der Checkliste für den Produktivbetrieb. Entfernen Sie einen der sechs Haken, schließt sich die Exportschranke. Protokolliert als "Smart Capture Checklist Changed". | Nicht gesetzt |
| **Sicherheitsprüfung durchgeführt** | Ja/Nein-Haken; erfasst, wer und wann | Optional | Punkt der Checkliste für den Produktivbetrieb. | Nicht gesetzt |
| **Datenschutzprüfung durchgeführt** | Ja/Nein-Haken; erfasst, wer und wann | Optional | Punkt der Checkliste für den Produktivbetrieb. | Nicht gesetzt |
| **Rechtsprüfung durchgeführt** | Ja/Nein-Haken; erfasst, wer und wann | Optional | Punkt der Checkliste für den Produktivbetrieb. | Nicht gesetzt |
| **Prüfung der Abrechnungs- und Kodierrichtlinien durchgeführt** | Ja/Nein-Haken; erfasst, wer und wann | Optional | Punkt der Checkliste für den Produktivbetrieb. | Nicht gesetzt |
| **Echtes Empfangssystem getestet** | Ja/Nein-Haken; erfasst, wer und wann | Optional | Punkt der Checkliste für den Produktivbetrieb. | Nicht gesetzt |
| **Export an eine echte Schnittstellen-Engine erlauben** | Ja/Nein-Schalter | Optional | Deaktiviert, bis alle sechs Haken gesetzt sind. Wenn aus, geht der Export nur an die simulierte Engine. Protokolliert als "Smart Capture Production Gate Changed". | Aus |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Eine Einstellung ändern: `config:smart-capture:manage` (standardmäßig Admin und Laborleiter). Im Fall gehen `billing:smart-capture:review`, `billing:smart-capture:approve` und `billing:smart-capture:send` an die Rolle Pathologe. Jede Änderung oben wird protokolliert.

**Bekannte Grenzen.** Die Regeln sind ein Prototyp und wurden nicht auf Compliance geprüft; die Haken erfassen, dass jemand angibt, die Prüfung sei erfolgt, und führen keine Prüfung durch. Nichts verwendet KI oder Bilder. Der Export an eine echte Schnittstellen-Engine ist nur eine Schranke: Es ist kein echtes Empfangssystem angeschlossen.

## NLP- und Auto-Strukturierungs-Engine {#ch5-nlp}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > KI-Auslesen der Vorbefunde

**Status:** Teilweise. Einzelne Sprachfunktionen sind vorhanden. Eine eigenständige NLP- oder Auto-Strukturierungs-Engine gibt es nicht, und es gibt dafür keinen Bildschirm.

Was heute vorhanden ist; jedes dieser Elemente sendet Text an das Modell, das in [KI-Verhalten (Reiter)](#screen-tab-ai) gewählt ist, und unterliegt der KI-Anbieterrichtlinie:

- **Auslesen von Vorbefunden** ([KI-Auslesen der Vorbefunde](#screen-history_extraction)): liest frühere Fälle und füllt strukturierte Felder als beratende Information.
- **Synoptik aus Narrativtext vorschlagen**: füllt auf der Befundseite synoptische Felder aus dem Narrativtext. Jeder Vorschlag trägt eine Konfidenz von 0 bis 100 und ein Zitat aus dem Quelltext. Es funktioniert im Orchestrator-Modus und im Assistenzmodus.
- **Narrativtext aus Synoptik erstellen**: schreibt auf der Befundseite den Narrativtext aus den synoptischen Daten. Nur im Orchestrator-Modus.
- **Zuordnung der synoptischen Vorlage**: Das Modell schlägt vor, welche synoptische Vorlage ein Fall braucht, mit einer festen Konfidenzschwelle von 60.
- **Suche nach kritischen Befunden** bei der Freigabe: eine Suche, die Verneinungen berücksichtigt, nur im Narrativtext.
- **Verfeinerung des Diktats** (Reiter Sprache, [Kapitel 4](#screen-tab-voice)) und **Makrovorschlag** (Reiter Makros, [Kapitel 4](#screen-tab-macros)).

Nicht umgesetzt: eine allgemeine Pipeline von Freitext zu strukturierten Daten über die oben genannten Funktionen hinaus, ein Bildschirm zu ihrer Konfiguration und jedes trainierte klinische NLP-Modell von PathScribe selbst. Der frühere Computational Sidecar wurde am 18. Oktober 2026 zurückgezogen.

### KI-Auslesen der Vorbefunde {#screen-history_extraction}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > KI-Auslesen der Vorbefunde

**Status:** Teilweise. Der Bildschirm und die Regeln arbeiten mit Demonstrationsdaten, und der Serververtrag ist beschrieben (`HISTORY_AI_EXTRACTION_API.md`), aber nichts wurde an einem echten Server erprobt. Der Zusammenfassungs-Hook für den Assistenzmodus ist nicht umgesetzt.

**1. Navigation:** Konfiguration, Reiter **System** > Gruppe **Verwaltung & Compliance**
**2. Pflegeeintrag:** KI-Auslesen der Vorbefunde

**3. Geschäftlicher Zweck und Umfang.** Öffnet ein Pathologe einen früheren Fall, kann das Modell dessen Enddiagnose und mikroskopischen Text lesen und Werte für die Felder einer strukturierten Vorlage vorschlagen. Die Ergebnisse tragen die Kennzeichnung "AI-extracted, not verified" und sind nur beratend: Befunde, Druck, Register, Abrechnung, Regeln und Exporte verwenden sie nie (ein Test im Code sichert das ab). Es macht je Fall zwei Modellaufrufe (die Vorlage wählen, dann die Felder füllen) und verwirft jedes Feld mit einer Konfidenz unter 30 (im Code festgelegt). Die Ergebnisse werden über einen Hash des Quelltexts zwischengespeichert, und ein fehlgeschlagener Lauf wird beim nächsten Öffnen des Falls erneut versucht. Das Ereignis `HISTORY_EXTRACTION_RUN` im Prüfprotokoll enthält keinen Patiententext.

**4. Voraussetzungen und Abhängigkeiten.** Die Funktion benötigt einen funktionierenden KI-Dienst und die Liste der Einrichtungen. Ohne KI-Dienst oder mit einem, den die KI-Anbieterrichtlinie ablehnt, wird nichts ausgelesen, und der Fall zeigt keine beratenden Daten.

Setup step: Tier 4, step 7
Requires: [KI-Verhalten (Reiter)](#screen-tab-ai), [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-history_extraction - KI-Auslesen der Vorbefunde: Geltungsbereich, Zustand und Karte zur Genauigkeit]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **Gilt für** | Auswahl: **Unternehmen (alle Einrichtungen)** oder eine aktive Einrichtung | Pflicht | Der Geltungsbereich, den Sie ansehen und ändern. | Unternehmen |
| Zustandskarte | Schreibgeschützt **Ein** oder **Aus** | Nicht zutreffend | Die Einstellung, die für den gewählten Geltungsbereich gilt. Aufgelöst als eigene Einstellung der Einrichtung, dann Einstellung des Unternehmens, dann aus. | Aus |
| Quellenmarke | Schreibgeschützt: **Integrierter Standard**, **Einstellung des Unternehmens** oder **Eigene Einstellung dieser Einrichtung** | Nicht zutreffend | Woher der Zustand stammt. | Integrierter Standard |
| **Einschalten** / **Ausschalten** | Schaltfläche | Nicht zutreffend | Setzt den Zustand für den gewählten Geltungsbereich. | Nicht zutreffend |
| **Einstellung des Unternehmens verwenden** | Schaltfläche | Nicht zutreffend | Erscheint nur, wenn die gewählte Einrichtung einen eigenen Eintrag hat. Entfernt ihn, sodass die Einrichtung dem Unternehmen folgt. | Nicht zutreffend |
| **Bisherige Genauigkeit** | Schreibgeschützte Karte: gelesene Befunde, ausgelesene Felder, als falsch markiert | Nicht zutreffend | Zählt für den gewählten Geltungsbereich, wie viele Befunde gelesen, wie viele Felder ausgelesen und wie viele von einem Pathologen als falsch markiert wurden. | 0 |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ändern: `config:history-extraction:manage` (Admin und Laborleiter). Im Fall gehen `ai:history-extraction:run` und `ai:history-extraction:flag` an Pathologe, Facharzt in Weiterbildung (Fellow) und Assistenzarzt (Resident), und `case:clinical-history:record` geht an diese drei und den Pathologieassistenten. Die KI-Anbieterrichtlinie gilt und lehnt einen nicht zulässigen Dienst mit `vendorNotAllowed` ab. Das Ausführen eines Auslesens wird als `HISTORY_EXTRACTION_RUN` protokolliert.

**Bekannte Grenzen.** Nur beratend, so gewollt. Der Zusammenfassungs-Hook für den Assistenzmodus ist Nicht umgesetzt. Die Konfidenzgrenze von 30 Punkten hat keine Einstellung.

## KI-Bildanalyse in der digitalen Pathologie {#ch5-dp-ai}
Breadcrumb: Startseite > Konfiguration > System > Labormaterialien & Arbeitsabläufe > Anbieterintegrationen

**Status:** Teilweise. Das Empfangen und Anzeigen von Ergebnissen aus Herstellerprodukten ist vorhanden. Tumorerkennung, Zellzählung und Biomarker-Bewertung durch PathScribe selbst sind **Nicht umgesetzt**.

PathScribe analysiert keine Bilder. Es erfasst, was das Produkt eines Herstellers meldet. Am nächsten an ein KI-Analysemodul kommt diese Kette, die in anderen Kapiteln konfiguriert wird:

- **Herstellerverzeichnis** (Kategorie KI der digitalen Pathologie in den [Anbieterintegrationen](#screen-vendor_integrations), [Kapitel 4](#ch4)): Herstellername, Produktname, Modalität (Freitext), ein Kontrollkästchen **FDA-zugelassen** (ein Vermerk des Administrators zu einem Zeitpunkt, keine Prüfung) und ein Schalter für aktiv. Es ist vorbelegt mit Paige Prostate, Ibex Prostate Detect, PathAI AISight Dx, Proscia Concentriq AP-Dx, Hologic Genius Digital Diagnostics (Zervixzytologie) und BD FocalPoint GS (als nicht zugelassen markiert, da es eine Premarket Approval und keine 510(k)-Freigabe ist). Hersteller von Objektträger-Viewern (Vorlagen für Startadressen) und Stapel von Whole-Slide-Image-Scans stehen daneben.
- **Ergebnisdatensatz**: ein Status (beauftragt, abgeschlossen, fehlgeschlagen oder Zeitüberschreitung), Befunde (eine Freitextbezeichnung, eine Konfidenz von 0 bis 1 und eine optionale Region), Biomarker-Messwerte als Freitext (Name und Wert) sowie ein Rang für die Triage der Objektträger mit einer Empfehlung zur Prüfung nach dem Muster der Quintile von BD.
- **Übernahme**: Ein Herstellerergebnis kommt als eingehendes Ereignis der Schnittstellen-Engine an. In der Demonstration löst der Abschluss eines Stapels Zytologie-Bildgebung automatisch einen KI-Screening-Auftrag beim ersten aktiven Hersteller für Zervixzytologie aus.
- **Abzeichen in der Arbeitsliste der Zytologie und Abfrage zur Konkordanz**: Die Antwort des Pathologen wird erfasst. Eine Abweichung erzeugt ein offenes Defizit und startet nie von selbst eine Korrekturmaßnahme.
- **QS-Reiter KI-Diskordanz** ([Kapitel 4](#screen-quality-assurance)): ein Bericht zur Diskordanz je Hersteller und ein Bericht zu stehengebliebenen Ergebnissen. Die Zeitüberschreitung für stehengebliebene Ergebnisse wird dort gesetzt (ganze Stunden 1 bis 720, Standard 24).

Nicht umgesetzt: ein Tumordetektor, Zellzähler oder Biomarker-Bewerter im Besitz von PathScribe und jedes Bedienelement, das die Analyse eines Herstellers abstimmt. Die echten Herstellerintegrationen sind nicht abgeschlossen. Der Vertrag ist `DIGITAL_PATHOLOGY_API.md`. Verwandte Einrichtung: Zytologie-Instrumentierung ([Kapitel 3](#screen-cytology_instrumentation)).

## Intelligente Qualitätskontrolle und Regeln zur Erkennung diagnostischer Auffälligkeiten {#ch5-smart-qc}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Regeln für klinische Diskrepanzen

**Status:** Umgesetzt für die Regelbildschirme. Demonstration für die Serverseite der KI-Anweisungen. Es gibt kein einzelnes Modul "Erkennung von Auffälligkeiten"; die folgenden Prüfungen sind getrennt, und jede ist dort beschrieben, wo sie konfiguriert wird.

- **Klinische Abweichungsprüfung** ([Regeln für klinische Diskrepanzen](#screen-clinical_mismatch_rules) und [KI-Anweisungen](#screen-ai_instructions), dieses Kapitel): Das Modell vergleicht die klinische Indikation und Anamnese mit der Diagnose, und die Regeln bestimmen, was ein Ergebnis bewirkt.
- **Regeln für abnormale Auslöser** ([Kapitel 3](#screen-abnormal_trigger_rules)): einzelne Regeln mit den Schweregraden Abnormal, Kritisch und Maligne. Die vorbelegten Regeln sind Resektionsrand-Status, Perineuralscheideninvasion, Lymphknotenstatus und Lymphgefäßinvasion.
- **Suche nach kritischen Befunden im Narrativtext**: Das Modell durchsucht den Narrativtext bei der Freigabe, berücksichtigt Verneinungen und sendet nur Narrativtext. Es hat keine eigene Einstellung.
- **Richtlinie zum Trend der QS-Diskordanz** ([Kapitel 4](#screen-qa_trend_policy)), der Reiter **KI-Diskordanz** ([Kapitel 4](#screen-quality-assurance)) und **Zytologie-QK-Regeln** ([Kapitel 4](#screen-cytology_qc_rules)).

Nicht umgesetzt: ein statistischer Detektor oder Detektor mit maschinellem Lernen für Auffälligkeiten, der Durchlaufzeiten, Mengen oder Ergebnisse über Fälle hinweg überwacht.

### Regeln für klinische Diskrepanzen {#screen-clinical_mismatch_rules}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > Regeln für klinische Diskrepanzen

**Status:** Umgesetzt. Er arbeitet mit Demonstrationsdaten und hat einen Serververtrag (`CONFIG_SERVICES_API.md`, `/api/clinical/clinical-mismatch-rule/*`).

**1. Navigation:** Konfiguration, Reiter **System** > Gruppe **Verwaltung & Compliance**
**2. Pflegeeintrag:** Regeln für klinische Diskrepanzen

**3. Geschäftlicher Zweck und Umfang.** Bei der Freigabe vergleicht das Modell, was der Kliniker dem Labor mitgeteilt hat, mit dem, was der Pathologe diagnostiziert hat, und gibt eine Art der Diskrepanz und eine Konfidenz von 0 bis 100 zurück. Diese Regeln machen aus der Konfidenz ein Ergebnis. Unterhalb der Anzeigeschwelle wird das Ergebnis verworfen. Von der Anzeigeschwelle bis zur Aktionsschwelle gilt es als niedriges Risiko: Der Pathologe sieht eine Warnung, und das QS-Protokoll erfasst sie. Bei oder über der Aktionsschwelle gilt die Aktion der Regel: **Block** macht es zu hohem Risiko und hält die Freigabe an, bis eine Entscheidung erfasst ist, **Warn** warnt, und **Log** erfasst es. Entscheidungen werden als RESOLVED, UNRESOLVED oder DEFERRED erfasst. Der vollständige Ablauf steht in `docs/product/CLINICAL_MISMATCH_CHECK.md`. Eine Regel je Art der Diskrepanz gilt für alle Probentypen, und Sie können eine Regel für einen Probentyp hinzufügen.

**4. Voraussetzungen und Abhängigkeiten.** Die Prüfung ruft den KI-Dienst auf, der im Reiter KI-Verhalten eingerichtet ist, und die Regeln für einzelne Probentypen wählen aus den aktiven Probentypen. Ohne KI-Dienst oder mit einem, den die KI-Anbieterrichtlinie ablehnt, läuft die Prüfung nicht. Überspringen Sie das Probenverzeichnis, ist die Liste **Regel für einen Präparattyp hinzufügen** leer.

Setup step: Tier 4, step 6
Requires: [KI-Verhalten (Reiter)](#screen-tab-ai), [Probenverzeichnis](#screen-specimens)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-clinical_mismatch_rules - Tabelle der Regeln für klinische Diskrepanzen und Bedienelement zum Hinzufügen einer Regel]

**6. Feldreferenz.** Schwellen werden gespeichert, wenn Sie das Feld verlassen oder die Eingabetaste drücken. Die Aktion wird gespeichert, wenn Sie sie wählen.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **Art der Diskrepanz** | Schreibgeschützt: unerwartete Malignität, Todesursache, Lokalisation oder Organ, erwartete Malignität fehlt, sonstige | Nicht zutreffend | Eine Zeile je Art für alle Probentypen sowie gegebenenfalls Zeilen für einzelne Probentypen. | Nicht zutreffend |
| **Präparattyp** | Schreibgeschützt: alle Probentypen oder ein Typ aus dem Probenverzeichnis | Nicht zutreffend | Der Geltungsbereich der Zeile. | Alle Probentypen |
| **Warnung ab** | Ganze Zahl 0 bis 100 (Anzeigeschwelle, %) | Pflicht | Ergebnisse darunter werden unterdrückt. | 60 für jede Art |
| **Aktion ab** | Ganze Zahl 0 bis 100 (Aktionsschwelle, %) | Optional | Muss mindestens **Warnung ab** entsprechen. Leer bedeutet, dass die Aktion mit dem Wert von **Warnung ab** beginnt. | unerwartete Malignität 70, Todesursache 70, Lokalisation oder Organ 65, erwartete Malignität fehlt leer, sonstige 65 |
| **Aktion** | Auswahl: **Block**, **Warn**, **Log** | Pflicht | Was bei oder über **Aktion ab** geschieht. | unerwartete Malignität Block, Todesursache Block, Lokalisation oder Organ Block, erwartete Malignität fehlt Log, sonstige Log |
| **Entfernen** | Schaltfläche | Nicht zutreffend | Löscht eine Regel für einen Probentyp. Die Regel für alle Proben einer Art kann nicht entfernt werden. | Nicht zutreffend |
| **Regel für einen Präparattyp hinzufügen** | Auswahl der Art und Auswahl des aktiven Probentyps | Optional | Legt eine Regel an, die als Kopie der Regel für alle Typen dieser Art beginnt. Eine zweite Regel für dieselbe Art und denselben Probentyp wird abgelehnt. | Keine |
| **Änderungen, Korrekturen und Ergänzungen** | Ja/Nein-Kontrollkästchen | Optional | Wenn ein, gilt "Eine Abweichung mit hohem Risiko hält die Freigabe an, bis eine Entscheidung erfasst ist" auch für Änderungen, Korrekturen und Ergänzungen. | Ein |

Eine abgelehnte Eingabe zeigt eines dieser Probleme: Schwelle außerhalb des Bereichs, Aktion unterhalb der Anzeige, Duplikat, Standard kann nicht entfernt werden, unbekannte Aktion oder unbekannte Kategorie.

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open`. Ansehen: `config:clinical-mismatch-rules:view` (standardmäßig Pathologe, QS-Prüfer und Laborleiter). Ändern: `config:clinical-mismatch-rules:manage`; sie setzt `view` voraus und hat keine Standardrolle, vergeben Sie sie daher bewusst. Ohne `manage` ist der Bildschirm schreibgeschützt. Änderungen werden als `CLINICAL_MISMATCH_RULE_CHANGED` protokolliert. `case:clinical-mismatch:record` (eine Entscheidung bei der Freigabe erfassen) geht an Pathologe und Facharzt in Weiterbildung (Fellow). Funktionstrennung: Niemand darf `config:clinical-mismatch-rules:manage` zusammen mit `config:ai-prompt:approve` besitzen, und der Superadmin ist nicht ausgenommen.

**Bekannte Grenzen.** Das Modell kann sich irren; die Schwellen sind die Steuerung des Labors dafür, wie stark ein Pathologe unterbrochen wird. Eine Diskrepanz bei der Freigabe ist beratend, es sei denn, die Aktion einer Regel ist **Block**.

## KI-Governance, Schwellen für die Kontrolle durch den Menschen und Kalibrierung {#ch5-governance}
Breadcrumb: Startseite > Konfiguration > Validierungsstudien

**Status:** Umgesetzt für Governance und Schwellen. Kalibrierung der Gewichte: nicht vorhanden.

Die Kontrollen von PathScribe halten einen Menschen zwischen dem Modell und dem Datensatz.

- **Freigegebene Anweisungen.** Der Text, den die klinische Abweichungsprüfung an das Modell sendet, ist versioniert, und eine zweite Person muss ihn freigeben ([KI-Anweisungen](#screen-ai_instructions)).
- **Nachweis.** Eine Validierungsstudie misst, wie oft Pathologen die Vorschläge des Modells unverändert annehmen, und eine Bewertung BESTANDEN ist es, die einer Einrichtung erlaubt, ein Modell festzulegen, oder ein Sprachmodell zum Standard werden lässt ([Validierungsstudien](#screen-tab-validation)).
- **Schwellen.** Jede Schwelle im Produkt ist hier aufgeführt.

| Schwelle | Wert | Wo festgelegt |
|---|---|---|
| Konfidenzschwelle (Vorschläge) | 0 bis 100, Standard 75 | Reiter **KI-Verhalten**; Überschreibung je Modell in **Modelleinstellungen** |
| Automatisches Einfügen bei oder über der Schwelle | Standardmäßig aus | Reiter **KI-Verhalten**, **Erweitert** |
| Anzeige- und Aktionsschwellen der klinischen Diskrepanz | 0 bis 100, Anzeige-Standard 60 | [Regeln für klinische Diskrepanzen](#screen-clinical_mismatch_rules) |
| Zuordnung von synoptischen Vorlagen und Zuschnittvorlagen | Fest 60 | Code; keine Einstellung |
| Feldgrenze beim Auslesen von Vorbefunden | Fest 30 | Code; keine Einstellung |
| Ziel-Akzeptanzrate und maximales mittleres Bearbeitungsverhältnis einer Studie | standardmäßig 70 % und 30 % | [Validierungsstudien: Studien](#screen-validation-studies) |
| Stehengebliebenes KI-Screening-Ergebnis | Ganze Stunden 1 bis 720, Standard 24 | QS-Reiter **KI-Diskordanz** ([Kapitel 4](#screen-quality-assurance)) |

**Kalibrierung der Gewichte und Einstellungen nur für den internen Gebrauch.** In PathScribe gibt es nirgends eine Einstellung zur Kalibrierung von Modellgewichten, zum Feintuning oder zur Neukalibrierung, und keine KI-Einstellung ist auf Mitarbeitende von ForMedrixAI beschränkt. Eine Suche im Code findet nur die Kalibrierung von Geräten und der Zytologie, die damit nichts zu tun haben. Keine Berechtigung im Katalog ist für KI als nur für die Plattform markiert. Zwei verwandte Tatsachen sind wissenswert. Der API-Schlüssel wird vom Support von ForMedrixAI im Geheimnisspeicher des Servers rotiert, und dafür gibt es keinen Bildschirm. Der Modellkatalog, den der ForMedrixAI Store anbietet, gehört der Plattform, und auch dafür gibt es keinen Bildschirm für Mitarbeitende. Weil es keine solche Einstellung gibt, hat dieses Kapitel keinen Abschnitt mit der Kennzeichnung nur für ForMedrixAI intern.
### KI-Anweisungen {#screen-ai_instructions}
Breadcrumb: Startseite > Konfiguration > System > Verwaltung & Compliance > KI-Anweisungen

**Status:** Demonstration. Die Regeln laufen im Browser über eingebundenen Speicher, und der Dienst hat keine eigene Serverroute (`HTTP_SERVICES_REMAINING.md`).

**1. Navigation:** Konfiguration, Reiter **System** > Gruppe **Verwaltung & Compliance**
**2. Pflegeeintrag:** KI-Anweisungen

**3. Geschäftlicher Zweck und Umfang.** Die klinische Abweichungsprüfung sendet dem Modell einen Anweisungstext. Dieser Bildschirm steuert diesen Text für jedes von drei Fachgebieten: Chirurgische Pathologie, Zytologie und Obduktion (als Reiter dargestellt). Eine Änderung durchläuft das Bearbeiten und danach die Freigabe durch eine andere Person, sodass niemand allein ändern kann, was dem Modell mitgeteilt wird. Der Block mit den Falldaten und das JSON-Antwortformat sind im Code festgelegt und hier nicht bearbeitbar. Nur die freigegebene Version wird verwendet. Version 0 ist der integrierte Text von PathScribe.

**4. Voraussetzungen und Abhängigkeiten.** Der Text wird von der Prüfung über den Dienst im Reiter KI-Verhalten verwendet, richten Sie daher zuerst den KI-Dienst ein. Überspringen Sie das, hat ein freigegebener Text nichts, womit er laufen kann, und **Diesen Text testen** meldet die KI als nicht verfügbar.

Setup step: Tier 4, step 5
Requires: [KI-Verhalten (Reiter)](#screen-tab-ai)
Unlocks: [Regeln für klinische Diskrepanzen](#screen-clinical_mismatch_rules)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: system-ai_instructions - Reiter der Fachgebiete in den KI-Anweisungen mit den Karten In Verwendung, Wartet auf Freigabe, Bearbeiten, Testen und Verlauf]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Reiter der Fachgebiete | Auswahl: Chirurgische Pathologie, Zytologie, Obduktion | Pflicht | Jedes Fachgebiet hat seinen eigenen Text und seinen eigenen Verlauf. | Chirurgische Pathologie |
| **In Verwendung: Version N** | Schreibgeschützter Text | Nicht zutreffend | Die freigegebene Version, die die Prüfung jetzt verwendet. | Version 0 (integrierter Text) |
| **Wartet auf Freigabe** | Schreibgeschützter Text | Nicht zutreffend | Die ausstehende Version, falls vorhanden. Eine neue Bearbeitung zieht die vorherige ausstehende zurück. | Keine |
| **Freigeben** | Schaltfläche | Nicht zutreffend | Macht die ausstehende Version zu der, die verwendet wird. Wird für jeden abgelehnt, der den Text seit der letzten Freigabe bearbeitet hat (SELF_APPROVAL). Erfordert `config:ai-prompt:approve`. | Nicht zutreffend |
| Grund der Ablehnung | Text | Pflicht zum Ablehnen | Der Grund wird im Verlauf aufbewahrt. | Keine |
| **Ablehnen** | Schaltfläche | Nicht zutreffend | Deaktiviert, bis ein Grund eingegeben ist. Die freigegebene Version bleibt in Verwendung. | Nicht zutreffend |
| Text bearbeiten | Textbereich, bis zu 6000 Zeichen, mit Zähler | Pflicht | Darf nicht leer sein, nicht über 6000 Zeichen liegen und muss sich vom aktuellen Text unterscheiden (andernfalls: leer, zu lang oder unverändert). | Der Text in Verwendung |
| **Zur Freigabe speichern** | Schaltfläche | Nicht zutreffend | Legt eine neue ausstehende Version an. | Nicht zutreffend |
| **Klinische Indikation** | Text | Optional | Beispieleingabe für den Test. Gefüllt aus einem integrierten Beispiel. | Beispieltext |
| **Klinische Anamnese** | Text | Optional | Beispieleingabe für den Test. | Beispieltext |
| **Befunde** | Text | Optional | Beispieleingabe für den Test. | Beispieltext |
| **Diagnose** | Text | Optional | Beispieleingabe für den Test. | Beispieltext |
| **Vom Pathologen bestätigter maligner Befund** | Ja/Nein-Kontrollkästchen | Optional | Beispieleingabe für den Test. | Aus |
| **Diesen Text testen** | Schaltfläche | Nicht zutreffend | Führt den ausstehenden oder bearbeiteten Text einmal am Beispiel aus. Das Ergebnis lautet Diskrepanz, keine, nicht zulässig (laut KI-Anbieterrichtlinie) oder nicht verfügbar. | Nicht zutreffend |
| Verlauf | Schreibgeschützte Liste | Nicht zutreffend | Jede Version mit ihrem Status: wartet auf Freigabe, in Verwendung, abgelehnt, ersetzt oder vor der Freigabe ersetzt. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: `screen:configuration:open` sowie `config:ai-prompt:edit` oder `config:ai-prompt:approve`. Das Auflisten der Versionen erfordert `config:ai-prompt:view` (QS-Prüfer und Laborleiter). `config:ai-prompt:edit` hat keine integrierte Rolle und setzt `view` voraus. `config:ai-prompt:approve` geht nur an den Laborleiter und wird dem Superadmin vorenthalten; sie setzt `view` voraus. Der Superadmin besitzt `view` und `edit`. Funktionstrennung: `config:ai-prompt:approve` darf nicht zusammen mit `config:clinical-mismatch-rules:manage` besessen werden. Protokolliert als `AI_PROMPT_EDITED`, `AI_PROMPT_APPROVED` und `AI_PROMPT_REJECTED`.

**Bekannte Grenzen.** Die Serverseite ist Nicht umgesetzt. Eine Person, die nur `view` besitzt, etwa ein QS-Prüfer, kann den Bildschirm nicht öffnen, obwohl die Liste für sie geladen würde.

### Validierungsstudien (Reiter) {#screen-tab-validation}
Breadcrumb: Startseite > Konfiguration > Validierungsstudien

**Status:** Umgesetzt. Er arbeitet mit Demonstrationsdaten und hat einen Serververtrag (`QUALITY_API.md`, `/api/validation-studies/...`).

**1. Navigation:** Konfiguration, Reiter **Validierungsstudien**
**2. Pflegeeintrag:** Validierungsstudien (der gesamte Reiter)

**3. Geschäftlicher Zweck und Umfang.** Eine Validierungsstudie sammelt Belege, dass ein KI-Modell an Ihren eigenen Fällen funktioniert. Die Pathologen arbeiten wie gewohnt; bei der Freigabe erfasst PathScribe für jeden KI-Vorschlag, ob er unverändert angenommen wurde und wie stark er bearbeitet wurde. Die Signale sind de-identifiziert. Wird die Studie geschlossen, bewertet der Bericht das Modell, und nur eine Bewertung BESTANDEN erlaubt einer Einrichtung, dieses Modell festzulegen. Der Reiter hat drei Unterreiter, **Studien**, **Dashboard** und **Berichte**, gewählt über `?section=studies`, `dashboard` oder `reports`. Die Studien sind beratend: `validationMode` ist immer advisory. Ein Banner weist darauf hin, und ein Umschalter **So funktioniert es - mit einem Beispiel** erklärt den Ablauf.

**4. Voraussetzungen und Abhängigkeiten.** Eine Studie validiert ein Modell, das im Reiter KI-Verhalten gewählt wurde, und schreibt Einrichtungen aus dem Einrichtungsverzeichnis ein. Überspringen Sie die Modelle und die Einrichtungen, hat das Studienformular nichts zur Auswahl.

Setup step: Tier 4, step 2
Requires: [KI-Verhalten (Reiter)](#screen-tab-ai), [Einrichtungsverzeichnis](#screen-facility-dictionary)
Unlocks: [Validierungsstudien: Studien](#screen-validation-studies)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: tab-validation - Reiter Validierungsstudien mit dem Hinweisbanner und den drei Unterreitern]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Hinweisbanner | Schreibgeschützter Text | Nicht zutreffend | Weist darauf hin, dass eine Studie beratend ist. | Nicht zutreffend |
| **So funktioniert es - mit einem Beispiel** | Umschalter | Optional | Zeigt oder verbirgt die ausgearbeitete Erklärung. | Verborgen |
| Unterreiter **Studien**, **Dashboard**, **Berichte** | Auswahl | Pflicht | Öffnet den jeweiligen Bildschirm unten. | Studien |

**7. Berechtigungen.** Der Reiter erscheint nur für eine Person, deren Rolle admin, pathologist-admin oder superadmin ist. Das ist eine Prüfung der Rolle, keine Prüfung einer Berechtigung. Im Reiter ist er ohne `config:validation-studies:manage` und `validation:approval:record` schreibgeschützt. Beide besitzen Admin und Laborleiter über die Konfigurationsgruppe Qualität. Die Rolle Laborleiter gehört nicht zur Prüfung der Rolle; sie besitzt die Berechtigungen, kann den Reiter aber nicht öffnen.

**Bekannte Grenzen.** Siehe [Validierungsstudien: Studien](#screen-validation-studies).

### Validierungsstudien: Studien {#screen-validation-studies}
Breadcrumb: Startseite > Konfiguration > Validierungsstudien > Studien

**Status:** Umgesetzt.

**1. Navigation:** Konfiguration, Reiter **Validierungsstudien** > Unterreiter **Studien**
**2. Pflegeeintrag:** Studien

**3. Geschäftlicher Zweck und Umfang.** Die Liste der Studien und das Formular, um eine anzulegen. Eine Studie durchläuft die Zustände Entwurf, Genehmigung ausstehend, genehmigt, aktiv, geschlossen und gemeldet. Die Schaltflächen hängen vom Zustand ab: Ein Entwurf hat **Bearbeiten**, **Zur Prüfung einreichen** und **Löschen**; eine Studie mit ausstehender Genehmigung hat **Genehmigung erfassen**; eine genehmigte Studie hat **Aktivieren** (ohne IRB-Referenz abgelehnt); eine aktive Studie hat **Studie schließen**.

**4. Voraussetzungen und Abhängigkeiten.** Das Studienformular wählt ein Modell aus dem Reiter KI-Verhalten, aktive Einrichtungen und eingeschriebene Pathologen (gefiltert nach den gewählten Einrichtungen) sowie optional veröffentlichte Befundvorlagen. Überspringen Sie die Ärzte, ist die Liste **Eingeschriebene Pathologen** leer, sodass eine Studie nicht gespeichert werden kann. Veröffentlichte Vorlagen werden in [Kapitel 6](#ch6) eingerichtet; gibt es keine, lassen Sie **Berichtsvorlagen** leer, um alle Vorlagen einzubeziehen.

Setup step: Tier 4, step 3
Requires: [Validierungsstudien (Reiter)](#screen-tab-validation), [KI-Verhalten (Reiter)](#screen-tab-ai), [Einrichtungsverzeichnis](#screen-facility-dictionary), [Ärzte](#screen-physicians)
Unlocks: [Validierungsstudien: Berichte](#screen-validation-reports), [Validierungsstudien: Dashboard](#screen-validation-dashboard)

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: validation-studies - Liste der Validierungsstudien mit Neue Studie]

**6. Feldreferenz.**

#### Formular Neue Studie / Studie bearbeiten
Breadcrumb: Startseite > Konfiguration > Validierungsstudien > Studien

[SCREENSHOT PLACEHOLDER: validation-studies-new - Formular Neue Studie]

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **Studienname** | Text | Pflicht | Der Name, der in der Liste und im Bericht angezeigt wird. | Keine |
| **Beschreibung** | Text | Optional | Zweck der Studie. | Keine |
| **Zu validierendes KI-Modell** | Auswahl von Modellen | Pflicht | Beim Bearbeiten gesperrt. Ein Link **ForMedrixAI-Store durchsuchen** (nur bei neuen Studien) öffnet das Fenster des Stores unten. | Keine |
| **Ziel-Akzeptanzrate** | Schieberegler 50 % bis 100 %, Schritt 5 | Pflicht | Der Anteil unverändert angenommener Vorschläge, der eine Bewertung BESTANDEN erreicht. | 70 % |
| **Maximales durchschnittliches Bearbeitungsverhältnis** | Schieberegler 10 % bis 90 %, Schritt 5 | Pflicht | Das Meiste, was die Pathologen Vorschläge im Durchschnitt bearbeiten dürfen, für eine Bewertung BESTANDEN. | 30 % |
| **Startdatum** | Datum | Pflicht | Wann die Studie beginnt. | Heute |
| **IRB-/Ethik-Referenz** | Text | Optional | Wird im Formular angezeigt, aber nicht gespeichert. Die Referenz wird im Schritt der Genehmigung erfasst. | Keine |
| **Teilnehmende Einrichtungen** | Auswahl aktiver Einrichtungen, mehrere | Pflicht | Signale zählen nur für diese. | Keine |
| **Eingeschriebene Pathologen** | Auswahl von Pathologen, mehrere, gefiltert nach den gewählten Einrichtungen | Pflicht | Nur deren Freigaben erzeugen Signale. Der zuerst Gewählte wird zum Hauptprüfer (Principal Investigator); dafür gibt es kein Feld. | Keine |
| **Berichtsvorlagen** | Auswahl veröffentlichter Vorlagen, mehrere | Optional | Leer bedeutet alle Vorlagen. | Alle Vorlagen |

#### Fenster Zur Ethik-/IRB-Prüfung einreichen
Breadcrumb: Startseite > Konfiguration > Validierungsstudien > Studien

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **Name des Ethik-/IRB-Ausschusses** | Text | Pflicht | Der Ausschuss, an den die Studie geht. | Keine |
| **Eingereicht von** | Text | Pflicht | Wer sie eingereicht hat. | Keine |
| **Voraussichtliches Prüfungsdatum** | Datum | Optional | Wann eine Entscheidung erwartet wird. | Keine |
| **Notizen für den Ausschuss** | Text | Optional | Freie Notizen. | Keine |

#### Fenster Ausschussgenehmigung erfassen
Breadcrumb: Startseite > Konfiguration > Validierungsstudien > Studien

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **IRB-/Ethik-Referenznummer** | Text | Pflicht | Ohne sie kann die Studie nicht aktiviert werden. | Keine |
| **Genehmigt von** | Text | Pflicht | Die genehmigende Person oder Stelle. | Keine |
| **Genehmigungsdatum** | Datum | Pflicht | Das Datum der Genehmigung. | Heute |
| **Referenz des Ausschussprotokolls** | Text | Optional | Wo das Protokoll abgelegt ist. | Keine |
| **Mit der Genehmigung verbundene Bedingungen** | Text | Optional | Etwaige Bedingungen. | Keine |

#### Fenster ForMedrixAI Store
Breadcrumb: Startseite > Konfiguration > Validierungsstudien > Studien

Listet Modelle auf, die ForMedrixAI nach eigenen Regressionstests veröffentlicht hat und die Ihre Organisation noch nicht übernommen hat. Jede Zeile zeigt das Modell, sein Veröffentlichungsdatum und den Benchmark-Wert von ForMedrixAI sowie eine Schaltfläche **Übernehmen**.

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| **Übernehmen** | Schaltfläche | Nicht zutreffend | Fügt das Modell Ihrer Organisation als Beta hinzu, nie als Standard, mit null Fällen, bis Ihre eigene Studie es bestätigt. Ablehnungen: Store nicht lizenziert, keine Organisation, nicht im Katalog, bereits übernommen. | Nicht zutreffend |

**7. Berechtigungen.** `config:validation-studies:manage` umfasst Anlegen, Aktualisieren, Zur Prüfung einreichen, Aktivieren, Schließen und Löschen. `validation:approval:record` umfasst das Erfassen der Ausschussgenehmigung. Das Übernehmen eines Modells erfordert `config:ai-model:manage`. Admin und Laborleiter besitzen die ersten beiden standardmäßig. Die Ereignisse der Studie werden als `validation_study_created`, `_submitted`, `_approval_recorded`, `_activated`, `_closed` und `_deleted` protokolliert. Das Speichern einer Bearbeitung protokolliert `validation_study_created`, und die Aktivierung erfasst den wörtlichen Namen `admin` als Person.

**Bekannte Grenzen.** Die Lizenzprüfung des Stores ist eine Attrappe, die immer besteht, und die Autorisierung des Abonnements ist offene Arbeit (PS-59). Die IRB-Referenz im Studienformular wird nicht gespeichert. Das Formular erfasst keinen zweiten Prüfer, nur einen Ausschussnamen.

### Validierungsstudien: Dashboard {#screen-validation-dashboard}
Breadcrumb: Startseite > Konfiguration > Validierungsstudien > Dashboard

**Status:** Umgesetzt.

**1. Navigation:** Konfiguration, Reiter **Validierungsstudien** > Unterreiter **Dashboard**
**2. Pflegeeintrag:** Dashboard

**3. Geschäftlicher Zweck und Umfang.** Eine schreibgeschützte Ansicht, wie eine laufende oder geschlossene Studie abschneidet. Verwenden Sie sie, um die Akzeptanzrate zu beobachten, bevor die Studie geschlossen wird.

**4. Voraussetzungen und Abhängigkeiten.** Sie zeigt Daten, sobald eine Studie aktiv ist und Pathologen Fälle freigegeben haben. Ohne aktive Studie ist die Studienliste leer.

Setup step: Reference, not part of setup
Requires: [Validierungsstudien: Studien](#screen-validation-studies)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: validation-dashboard - Validierungs-Dashboard mit Studienauswahl und Leistungstabelle]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Studienauswahl | Auswahl aktiver oder geschlossener Studien | Pflicht | Wählt die angezeigte Studie. | Die erste Studie |
| Erfasste Fälle | Schreibgeschützte ganze Zahl | Nicht zutreffend | Fälle mit mindestens einem Signal. | 0 |
| Abschnittssignale | Schreibgeschützte ganze Zahl | Nicht zutreffend | Bei der Freigabe erfasste Vorschläge. | 0 |
| Akzeptanzrate im Vergleich zum Ziel | Schreibgeschützter Prozentwert | Nicht zutreffend | Verglichen mit der **Ziel-Akzeptanzrate** der Studie. | Nicht zutreffend |
| Unverändert akzeptiert | Schreibgeschützter Prozentwert | Nicht zutreffend | Vorschläge, die wie geschrieben beibehalten wurden. | Nicht zutreffend |
| **Abschnitt**, **Signale**, **Akzeptanz**, **Durchschnittliches Bearbeitungsverhältnis**, **Häufigste Bearbeitung** | Tabellenspalten | Nicht zutreffend | Leistung nach Befundabschnitt. | Nicht zutreffend |
| Hinweis zur Beratung | Schreibgeschützter Text | Nicht zutreffend | Weist darauf hin, dass die Zahlen beratend sind. | Nicht zutreffend |

**7. Berechtigungen.** Bildschirm öffnen: dieselben Regeln für den Reiter wie bei [Validierungsstudien (Reiter)](#screen-tab-validation). Nichts auf der Seite ändert Daten.

**Bekannte Grenzen.** Keine bekannt.

### Validierungsstudien: Berichte {#screen-validation-reports}
Breadcrumb: Startseite > Konfiguration > Validierungsstudien > Berichte

**Status:** Umgesetzt.

**1. Navigation:** Konfiguration, Reiter **Validierungsstudien** > Unterreiter **Berichte**
**2. Pflegeeintrag:** Berichte

**3. Geschäftlicher Zweck und Umfang.** Erzeugt den gedruckten Bericht, der eine geschlossene Studie bewertet. Die Bewertung ist BESTANDEN, wenn die Akzeptanzrate mindestens dem Ziel entspricht und das mittlere Bearbeitungsverhältnis höchstens dem Maximum; BEDINGT BESTANDEN, wenn die Akzeptanzrate mindestens 85 % des Ziels beträgt; andernfalls WEITERE PRÜFUNG. **Bericht erstellen & drucken** öffnet ein Druckfenster, erfasst die Ausgabe im Prüfprotokoll, setzt die Studie auf gemeldet und speichert die endgültige Bewertung einmalig. Die Bewertung wird danach nie neu berechnet. Nur eine gemeldete Studie mit der Bewertung BESTANDEN, bei der die Einrichtung zu den Teilnehmern gehört, erlaubt dieser Einrichtung, das Modell als ihre KI-Überschreibung festzulegen.

**4. Voraussetzungen und Abhängigkeiten.** Ein Bericht erfordert eine geschlossene Studie. Überspringen Sie das Schließen, erscheint die Studie nicht in der Liste.

Setup step: Tier 4, step 4
Requires: [Validierungsstudien: Studien](#screen-validation-studies)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: validation-reports - Vorschau des Validierungsberichts und Bericht erstellen & drucken]

**6. Feldreferenz.**

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Studienauswahl | Auswahl geschlossener oder gemeldeter Studien | Pflicht | Wählt die Studie für die Vorschau. | Die erste Studie |
| Berichtsvorschau | Schreibgeschützt | Nicht zutreffend | Die Zahlen und die Bewertung, wie sie gedruckt werden. | Nicht zutreffend |
| **Bericht erstellen & drucken** | Schaltfläche | Nicht zutreffend | Druckt, protokolliert als `validation_report_generated`, setzt gemeldet und speichert die endgültige Bewertung. | Nicht zutreffend |

**7. Berechtigungen.** Dieselben Regeln für den Reiter wie bei [Validierungsstudien (Reiter)](#screen-tab-validation). Das Erstellen des Berichts verwendet `config:validation-studies:manage`.

**Bekannte Grenzen.** Die Bewertung ist endgültig, sobald sie gespeichert ist; eine falsche Bewertung kann vom Bildschirm aus nicht neu berechnet werden.
