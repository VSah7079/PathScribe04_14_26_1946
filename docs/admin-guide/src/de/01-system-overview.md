---
chapter: 1
id: ch1
title: Systemübersicht und Architektur
---

# Systemübersicht und Architektur {#ch1}

Dieses Kapitel richtet sich an Administratorinnen, Administratoren und Techniker, die eine PathScribe-Bereitstellung planen. Es beschreibt, aus welchen Teilen PathScribe besteht, wie Daten zwischen ihnen fließen, was ein Standort bereitstellen muss und welche Sicherheitskontrollen es gibt. Es beschreibt, was das Produkt heute leistet. Alles, was nicht umgesetzt ist, ist als **Geplant** oder **Nicht umgesetzt** gekennzeichnet, und das Kapitel nennt, wo sich die nächstliegende funktionierende Funktion befindet.

## So verwenden Sie dieses Handbuch {#ch1-how-to-use}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > So verwenden Sie dieses Handbuch

**Status:** Umgesetzt (dieses Handbuch und die Schaltfläche Hilfe in der Anwendung).

**Die Kapitel folgen der Reihenfolge der Einrichtung.** Kapitel 2 behandelt Stufe 1, Kapitel 3 behandelt Stufe 2 und so weiter bis Kapitel 8, das Stufe 7 behandelt. Kapitel N dokumentiert Stufe N-1. Wenn Sie einen Standort vom ersten bis zum letzten Kapitel einrichten, sind bei jedem Bildschirm, den Sie erreichen, die Bildschirme, von denen er abhängt, bereits eingerichtet. Kapitel 9 enthält die Anhänge (Referenz des Prüfprotokolls und Glossar).

**Jeder Bildschirm hat ein Feld Einrichtungsreihenfolge.** Jeder Pflegebildschirm in diesem Handbuch trägt drei Zeilen:

- **Einrichtungsschritt:** der Platz des Bildschirms in der Reihenfolge, zum Beispiel „Stufe 2, Schritt 6“. Ein Bildschirm, der ein Protokoll, eine Warteschlange oder ein im Alltag genutztes Dashboard ist, trägt „Referenz, nicht Teil der Einrichtung“.
- **Zuerst einrichten:** die Bildschirme, die zuvor eingerichtet sein müssen. Jeder ist ein Link. Das Handbuch nennt auch, was geschieht, wenn Sie ihn überspringen (eine leere Auswahlliste oder ein abgelehntes Speichern).
- **Dies ermöglicht:** was der Bildschirm nach der Einrichtung möglich macht.

**Die Seite mit der Gesamtreihenfolge der Einrichtung.** [Reihenfolge der Einrichtung](setup-sequence.html) (`setup-sequence.html`) listet jeden Bildschirm in der Reihenfolge auf, in der Sie ihn einrichten sollten, erzeugt aus diesen drei Zeilen. Verwenden Sie sie als Checkliste für einen neuen Standort.

**Die Schaltfläche Hilfe.** **Umgesetzt.** Eine Schaltfläche **Hilfe** befindet sich oben rechts auf jedem Konfigurationsbildschirm und öffnet dieses Handbuch in einem separaten Fenster, das seine Position merkt (ein neuer Tab, wenn der Browser kein Fenster zulässt), beim eigenen Abschnitt dieses Bildschirms, sodass nicht gespeicherte Änderungen nicht verloren gehen. Sie folgt dem geöffneten Tab und dem Abschnitt der Seitenleiste: Im Rollenverzeichnis des Reiters Personal öffnet sie den Abschnitt [Rollenverzeichnis](#screen-staff-roles), und unter **System > Abteilungen** öffnet sie [Abteilungen](#screen-departments). Der Bildschirm Migration Jobs hat eine unter seinem Titel. Die Schaltfläche öffnet `go.html#<screen id>`, wobei `<screen id>` die Kennung des Bildschirms in diesem Handbuch ist (zum Beispiel `screen-departments`); `go.html` wird vom Build des Handbuchs erzeugt und findet die richtige Kapitelseite. Bildschirme außerhalb der Konfiguration, die einen Abschnitt in diesem Handbuch haben (das Prüfprotokoll, die Chargenverwaltung, der Lockbox-Einwurf und weitere), werden über eine Schaltfläche mit einem aufgeschlagenen Buch in der oberen Leiste neben dem Mikrofon geöffnet. Ein Test schlägt fehl, wenn ein Konfigurations-Tab oder -Abschnitt keinen Abschnitt in diesem Handbuch hat, sodass kein neuer Bildschirm ohne Dokumentation ausgeliefert werden kann.

**Statuswörter.** Jeder Bildschirm und jeder Teil dieses Kapitels verwendet eines von fünf festen Wörtern:

| Status | Bedeutung |
|---|---|
| **Umgesetzt** | Funktioniert mit den Demonstrationsdaten und hat einen schriftlichen Schnittstellenvertrag (`docs/architecture/*_API.md`) für den Produktionsserver. |
| **Demonstration** | Funktioniert nur im Browser mit den Demonstrationsdaten. Die Serverseite der Produktion ist noch nicht angebunden. |
| **Teilweise** | Ein Teil dessen, was die Überschrift nennt, ist umgesetzt. Der Abschnitt listet genau auf, welcher Teil. |
| **Geplant** | Nicht umgesetzt. Ein kurzer Absatz sagt, was beabsichtigt ist und was zum Zeitplan bekannt ist. |
| **Nicht umgesetzt** | Angefordert, aber es gibt weder einen Bildschirm noch einen Vertrag. Der Abschnitt sagt dies in einem Satz und nennt, was am nächsten kommt und tatsächlich existiert. |

Lesen Sie „Umgesetzt“ mit Sorgfalt. Es bedeutet, dass die Browserseite funktioniert und der Vertrag für den Server geschrieben ist. Es bedeutet nicht, dass der Produktionsserver existiert. Der nächste Teil dieses Kapitels sagt, in welchem Zustand sich der Produktionsserver heute befindet.

**NUR FÜR FORMEDRIXAI INTERN.** Einige Einstellungen dürfen nur von den Bereitstellungs- oder Serviceingenieuren von ForMedrixAI geändert werden. Es sind die Berechtigungen der Domäne `platform:` oder jede als `platformOnly` gekennzeichnete Berechtigung sowie Bildschirme, die nur für solches Personal angezeigt werden. In diesem Handbuch beginnt ihre Überschrift mit `[FORMEDRIXAI INTERNAL ONLY]`, und der Abschnitt beginnt mit einem umrandeten Hinweis, der sagt, wer die Einstellung ändern darf und warum sie eingeschränkt ist. Die Kundenausgabe des Handbuchs lässt diese Abschnitte weg. Die interne Ausgabe behält sie. Wenn Sie Kundenadministrator oder Kundenadministratorin sind und eine Einstellung nicht sehen, die ein Ingenieur von ForMedrixAI erwähnt, handelt es sich wahrscheinlich um eine davon.

## Zusammenfassung für die Leitung {#ch1-executive-summary}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Zusammenfassung für die Leitung

**Status:** Teilweise. Die Browseranwendung ist umgesetzt. Der Produktions-API-Server, das Datenbankschema und die ständig laufenden Dienste sind in schriftlichen Verträgen festgelegt und noch nicht umgesetzt (siehe [Der heutige Stand des Produkts](#ch1-current-state)).

PathScribe ist ein KI-gestütztes Befundungssystem für die klinische Pathologie und Laborinformationssystem (LIS) von ForMedrixAI LLC. Es ist für die USA, das Vereinigte Königreich, die EU und weitere Märkte gebaut, und die Bildschirme sind in sechs Sprachen übersetzt (Englisch, Französisch, Deutsch, Niederländisch, Koreanisch und Spanisch; die Übersetzungen außer Englisch müssen vor dem klinischen Einsatz noch von Muttersprachlern geprüft werden).

Ein Fall läuft in einer von zwei Betriebsarten, die je Fall festgelegt wird:

- **CoPilot.** PathScribe ist eine Ebene zur synoptischen Datenerfassung auf einem führenden LIS. Das führende LIS besitzt den Fall und den endgültigen Befund, und PathScribe liefert strukturierte synoptische Daten an dieses zurück.
- **Orchestrierung.** PathScribe führt den Fall von Anfang bis Ende als schlankes LIS, einschließlich KI-gestütztem Fließtext. Es wird für Einsenderfälle ohne führendes LIS verwendet.

Was eine Administratorin oder ein Administrator steuert, ist die Konfiguration: Personal und Rollen, die Verzeichnisse und Nachschlagelisten, die Workflow-Regeln, das KI-Verhalten, Befundvorlagen, Schnittstellen und Abrechnungsregeln. Die folgenden Kapitel dokumentieren diese Bildschirme in der Reihenfolge, in der ein Standort eingerichtet wird.

Drei Tatsachen sind für die Planung wichtig:

1. **Die Produktionsdatenbank ist Microsoft SQL Server**, erreicht über einen PathScribe-API-Server auf Basis von ASP.NET Core, mit Live-Aktualisierungen über SignalR. PathScribe verwendet Firebase nicht als Produktionsdatenbank. Einige Firebase-Dateien sind aus früheren Arbeiten im Repository verblieben und sollen ersetzt werden.
2. **Den Hosting-Ort wählen der Kunde oder ForMedrixAI.** Das Design verwendet Standardbausteine (Container, SQL Server, TLS-Zertifikate) und hängt nicht von einem einzelnen Cloud-Anbieter ab. Ein Standort kann eine öffentliche Cloud, eine private oder souveräne Cloud oder ein eigenes Rechenzentrum verwenden.
3. **PathScribe kann noch nicht in die Produktion überführt werden.** Die Browseranwendung ist weit genug, um sie vorzuführen und gegen Verträge zu testen. Der Server, der echte Patientendaten halten würde, ist nicht gebaut. Planen Sie eine erste Bereitstellung als gemeinsames Projekt mit ForMedrixAI, nicht als Installation.

## Architekturübersicht {#ch1-architecture}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Architekturübersicht

**Status:** Teilweise. Jeder der folgenden Teile trägt seinen eigenen Status.

### Die Teile {#ch1-parts}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Architekturübersicht > Die Teile

| Teil | Was es ist | Status |
|---|---|---|
| **Browseranwendung** | Eine Single-Page-Anwendung in React und TypeScript, die als statische Dateien ausgeliefert wird. Sie hält keine Schlüssel und schreibt, wenn ein API-Server konfiguriert ist, keine Patientendaten in den Browserspeicher. Ein Build bedient jeden Standort: Die Einstellungen jedes Standorts stammen aus einer Datei `config.json` neben `index.html`. | Umgesetzt |
| **PathScribe-API-Server** | ASP.NET Core. Er erzwingt Berechtigungen, hält die Anmeldesitzung, führt die Datenbanktransaktionen und geplanten Aufträge aus und ruft die KI-Anbieter, den Befund-Renderer und die Schnittstellen-Engine auf. | Geplant. Verträge sind in `docs/architecture/*_API.md` geschrieben. Im Repository gibt es keinen Servercode. |
| **Hub für Live-Aktualisierungen** | Ein SignalR-Hub auf dem API-Server unter `/hubs/live`. Er teilt geöffneten Bildschirmen mit, dass sich etwas geändert hat, nur mit Kennungen und nie mit Patiententext. | Geplant. Die Browserseite ist umgesetzt und gegen einen Test-Hub getestet. |
| **Datenbank** | Microsoft SQL Server. | Geplant. Im Repository sind weder Schema noch Skripte vorhanden. |
| **Schnittstellen-Engine** | BridgeLink, ein Open-Source-Fork von Mirth Connect (ein Java-Server). PathScribe übergibt ihr eine JSON-Nachricht; die Engine erzeugt und sendet den HL7-Verkehr und empfängt die Antworten. | Teilweise. Der Nachrichtenvertrag ist geschrieben. Die Engine ist noch nicht bereitgestellt oder angebunden, und die Demonstrationsversion verwendet eine Mock-Engine. |
| **KI-Proxy und KI-Anbieter** | Der API-Server leitet KI-Anfragen an den konfigurierten Anbieter weiter und fügt den Anbieterschlüssel hinzu, den der Browser nie hält. | Teilweise. Die Browserseite und die Prüfung des Anbieters je Rechtsraum sind umgesetzt. Die Serverrouten sind geplant. |
| **Befund-Renderer** | Ein Dienst, der einen freigegebenen Befund in ein PDF umwandelt, mit headless Chromium, gesteuert durch Playwright. | Geplant. Es gibt nur einen Ersatz für die Entwicklung. |
| **Standort-Agent** | Ein Windows-Dienst, der an jedem Standort installiert ist. Er verbindet sich nach außen über HTTPS, druckt Befunde und Etiketten auf Netzwerkdrucker und schreibt Dateien auf Windows-Freigaben. | Teilweise. Die Verwaltungsbildschirme und der Vertrag sind umgesetzt. Der Agent selbst ist geplant. |
| **Druckbrücken am Arbeitsplatz** | QZ Tray oder der PathScribe-Arbeitsplatz-Agent, der auf einem Computer am Arbeitsplatz läuft, um Etiketten auf dem danebenstehenden Drucker zu drucken. | QZ Tray: Umgesetzt (Etiketten werden darüber gedruckt). Arbeitsplatz-Agent: Umgesetzt (Browserseite). |
| **Viewer für Whole Slide Imaging (WSI)** | Die eigene Viewer-Anwendung des Herstellers (zum Beispiel Leica, Roche oder Hamamatsu). PathScribe verfolgt Scan-Chargen und öffnet den Viewer des Herstellers in einem neuen Browser-Tab für den richtigen Objektträger. Es zeichnet nie Objektträgerbilder. | Umgesetzt (Startlink). Statusaktualisierungen von Scan-Chargen brauchen den Hub. |

### Wie die Daten fließen {#ch1-data-flow}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Architekturübersicht > Wie die Daten fließen

```
 Hospital or lab network                         PathScribe hosting (cloud or on-premises)
 -----------------------                         ----------------------------------------
 Bench workstation                               Static web host (browser app, config.json)
   Browser app  --- https ---------------------> PathScribe API server (ASP.NET Core)
     |   ^                                         |        |         |          |
     |   +---- wss /hubs/live (SignalR) <----------+        |         |          |
     |                                                      |         |          |
     +-- QZ Tray / workstation agent (localhost)            v         v          v
         labels to the printer beside it                SQL Server   AI proxy   Report renderer
                                                         (database)    |        (Chromium PDF)
 Site agent (Windows service) --- https, outward ------>     |         v
   report and label printers, Windows shares                 |    AI vendors (per jurisdiction policy)
                                                             |
 Interface engine (BridgeLink) <---- JSON ---- API server ---+
   HL7 to and from the host LIS, EMR, instruments
   (hosted by ForMedrixAI, or installed at the hospital)
```

So lesen Sie das Schema:

1. **Browser zum API-Server.** Jede Aktion läuft mit der Identität der angemeldeten Person über den API-Server. Die eigenen Berechtigungsprüfungen des Browsers blenden nur Schaltflächen aus; der Server entscheidet. Der Server liefert feste Fehlercodes (`NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`) und sendet nie Text zurück, der einen Patienten nennen könnte. Patientennamen und Kennungen wandern in einem Anfragekörper, nie in einer Webadresse.
2. **API-Server zum Hub zu den Browsern.** Nachdem eine Datenbankänderung festgeschrieben ist, schreibt der Server in derselben Transaktion ein Ereignis in eine Outbox-Tabelle. Ein Dispatcher veröffentlicht es dann über den Hub. Das Ereignis enthält nur Kennungen. Ein Bildschirm, der es empfängt, liest die Daten über den normalen, berechtigungsgeprüften Aufruf neu. Die ersten Bildschirme, die ihn nutzen, sind das Live Board des Operationssaals und die Warteschlange für intraoperative Fälle; das Entwurfsziel sind weniger als 500 Millisekunden vom Festschreiben bis zum zweiten Board. Ohne Hub fragen dieselben Bildschirme zyklisch ab (alle 15 Sekunden auf den intraoperativen Bildschirmen).
3. **API-Server zur KI.** Der Browser ruft `/api/ai/...` auf seinem eigenen Ursprung auf. Der Server fügt den Anbieterschlüssel hinzu, prüft die Anbieter- und Regionsrichtlinie des Rechtsraums, leitet die Anfrage weiter und schreibt einen Prüfeintrag, der keinen Prompt-Text enthält.
4. **API-Server zur Schnittstellen-Engine.** Der API-Server sendet einen JSON-Umschlag mit einem Transaktionstyp (15 ausgehende Typen sind in `INTERFACE_TRANSACTIONS.md` aufgeführt). Die Engine bildet ihn auf HL7 ab und sendet ihn. PathScribe erzeugt HL7 für die Übertragung nie selbst. Der HL7-Verkehr bleibt im eigenen Nachrichtenspeicher der Engine, nicht auf dem Nachrichtenbus von PathScribe.
5. **API-Server zum Standort-Agenten.** Der Standort-Agent ist der einzige Weg, auf dem ein in der Cloud gehosteter Server einen Drucker oder eine Freigabe im Krankenhaus erreicht. Er verbindet sich über HTTPS mit einem Clientzertifikat nach außen zum Server, sodass keine eingehende Firewall-Freigabe nötig ist.
6. **Befunde.** Der Server rendert jedes PDF, das PathScribe verlässt, speichert je Freigabe ein unveränderliches, mit Hash versehenes Dokument und sendet genau dieses Dokument über jeden Kanal. Der Browser zeigt eine Vorschau, die so gebaut ist, dass sie dem Gesendeten entspricht.

### Hosting und Skalierung {#ch1-hosting}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Architekturübersicht > Hosting und Skalierung

**Status:** Geplant. Dies ist der Entwurf in `DEPLOYMENT_READINESS_REVIEW.md`; nichts davon wurde bereitgestellt.

- **Zwei unterstützte Hosting-Arten.** Eine öffentliche Cloud, die dort, wo es passt, die verwaltete Datenbank und das Container-Hosting des Anbieters nutzt. Oder ein portables Paket: dieselben Container auf Kubernetes oder Docker in einer privaten Cloud, einer souveränen Cloud oder dem eigenen Rechenzentrum des Krankenhauses. Das Paket wird einmal validiert, und jeder Hosting-Standort erhält dann eine Checkliste zur Installationsqualifizierung.
- **Ständig laufende Teile.** Die API (mindestens eine betriebsbereite Instanz), die Datenbank (in der Produktion nie automatisch pausiert), der Hub für Live-Aktualisierungen, der Befund-Renderer und die Schnittstellen-Engine, die HL7-Verbindungen hält. Das Herunterskalieren auf null ist weder mit einer Bildschirmaktualisierung im Sekundentakt noch mit STAT-Fällen in der Nacht vereinbar. Wiederkehrende Aufträge (Wiederholungen, Freigabe-Timer, Ablaufprüfungen) können als kurze geplante Aufgaben laufen.
- **Skalierung des Hubs.** Gemeinsam genutztes SaaS verwendet Azure SignalR Service. Private Cloud und lokaler Betrieb verwenden ein Redis-Backplane oder eine einzelne Instanz. Ohne Azure SignalR Service braucht der Lastverteiler Sticky Sessions und aktivierte WebSockets mit einem Leerlauf-Timeout von mehr als 15 Sekunden. Das Entwicklungsteam muss diese Matrix noch bestätigen.
- **Die Schnittstellen-Engine läuft in beiden Fällen** (entschieden am Oct 13, 2026): gehostet von ForMedrixAI in der Region des Mandanten oder installiert im Krankenhaus, aus demselben Container-Image.
- **Ein Build, viele Standorte.** `npm run build:server` erzeugt den Build für die Produktion. Er enthält keine Demonstrationskonten und keine Demonstrationswerkzeuge. Die Adressen und Anmeldeeinstellungen jedes Standorts stehen in seiner `config.json` (37 Einstellungen, aufgelistet in `RUNTIME_SETTINGS`), die mit `Cache-Control: no-store` ausgeliefert wird. PathScribe startet nicht und nennt die falschen Einstellungen, wenn die Datei gegen eine Regel verstößt (zum Beispiel eine Adresse, die nicht `https://` ist).
- **Sicherheits-Header des Browsers.** Die Content-Security-Policy, HSTS und die übrigen Header werden für nginx, IIS und Azure App Service, Azure Static Web Apps, Azure Front Door oder eine einfache Liste aus einer einzigen Definition in `deploy/security-headers/` erzeugt. Führen Sie den Generator nach der Änderung einer Adresse in `config.json` erneut aus, damit die neue Adresse zugelassen wird.
- **Schemaänderungen** sind versionierte SQL-Skripte, die von der Release-Pipeline angewendet werden, nie beim Start der Anwendung, und jede Änderung hinterlässt die Datenbank für die vorherige Version nutzbar.

## Der heutige Stand des Produkts {#ch1-current-state}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Der heutige Stand des Produkts

**Status:** Demonstration für fast jeden Datenbildschirm; Ausnahmen siehe die folgende Tabelle.

Lesen Sie diesen Teil, bevor Sie einem Kunden einen Termin für die Inbetriebnahme zusagen. Er wurde am Oct 21, 2026 gegen das Repository geprüft.

**Was heute läuft.** Die Browseranwendung läuft auf **im Browser gehaltenen Demonstrationsdiensten**. Etwa 170 Dienstordner in `src/services/` folgen einem Muster: eine Schnittstelle, eine Demonstrationsversion, die ihre Daten im Browser hält, und (bei fast allen) eine Serverversion, die die API aufruft. Die Anwendung wählt die Serverversion, wenn `VITE_API_BASE_URL` in `config.json` gesetzt ist, und sonst die Demonstrationsversion. Wenn ein API-Server konfiguriert ist, werden Demonstrationsdaten im Arbeitsspeicher gehalten und nicht in den Browserspeicher geschrieben.

**Was an eine Produktions-API angebunden ist.** Nichts. Die Serverversionen existieren im Browsercode und haben Tests mit einem Scheinserver, die jede Route prüfen, aber der API-Server, der sie beantworten würde, ist nicht im Repository und wurde nicht gebaut (die Arbeit ist dem Team in Indien zugewiesen, nach den Verträgen). Nichts wurde gegen einen echten Server ausprobiert. Serverseitige Versionen im Browsercode sind für alle Dienste außer dreien geschrieben:

| Dienst ohne Serverversion | Grund |
|---|---|
| Aktionsregister (Sprach- und Tastenkürzel-Abgleich) | Synchron und im Arbeitsspeicher. Nur seine gespeicherten Einstellungen würden über den Konfigurationsdienst an den Server gehen. |
| KI-Anweisungsdienst | Seine Regeln laufen im Browser über eingespeisten Speicher; der Speicher geht über den Konfigurations- und den Prüfdienst. |
| Schnittstellenwörterbuch-Dienst | Ebenso: Die Regeln laufen im Browser. Der Speicher geht über den Konfigurations- und den Prüfdienst. |

Live-Aktualisierungen verwenden im Browser bereits SignalR (`signalRLiveUpdateService.ts`), aber der Hub ist nicht gebaut.

**Was eine Produktionsbereitstellung blockiert** (aus der Bereitschaftsprüfung, Stand bei Batch 641):

| Blocker | Stand |
|---|---|
| API-Server und SQL-Server-Schema | Offen. Nicht begonnen. |
| Blob-Speicher für Befund-PDFs, Exporte und zurückgehaltene Freigaben | Vertrag geschrieben. Speicher und Endpunkte offen. |
| Serverseitige geplante Aufträge (etwa zehn Timer) | Offen. Bis ein Auftrag umgezogen ist, führt der Browser ihn aus, solange jemand angemeldet ist. `VITE_SERVER_JOBS` übergibt einen Auftrag namentlich an den Server. |
| Befund-Renderer-Dienst | Zytologievorlage fertig. Der gehostete Dienst ist offen. |
| Anmeldung über den Server (Backend-for-Frontend), Konfiguration des Identitätsanbieters zur Laufzeit | Konfiguration zur Laufzeit fertig. Der Serverteil ist offen. |
| Schnittstellen-Engine, ständig laufend, mit den Edge-Regeln | Vertrag geschrieben. Hosting und Endpunkte offen. |
| Standort-Agent | Vertrag und Bildschirme fertig. Der Agent ist offen. |
| Hub und Push-Aktualisierungen | Browserseite fertig. Der Hub ist offen. |
| Die früheren Vercel-Funktionen `api/`, die Firebase-Dienste und `functions/` stilllegen | Offen. Drei Bildschirme (Graviergeräte-Überwachung, QA-Mängelliste, Verlauf der Materialverfolgung) lesen noch Firebase-gestützte Dienste. |

Weitere offene Punkte, die eine Administratorin oder ein Administrator kennen sollte:

- **Der Browser erzwingt Berechtigungen heute, und die Durchsetzung auf dem Server ist nicht gebaut.** Die Berechtigungsprüfungen laufen in den Diensten des Browsers. Ein Server muss jede Prüfung wiederholen, bevor echte Patientendaten gehalten werden. Siehe [Sicherheitsmodell](#ch1-security).
- **Ein Test mit Screenreadern durch eine Person wurde nicht durchgeführt.** Automatisierte Barrierefreiheitsprüfungen (WCAG-2.1-Regeln A und AA, in Chromium) bestehen, aber eine Person hat noch nicht mit NVDA oder VoiceOver getestet (PS-687).
- **Firefox wurde nicht durch die automatisierte Testsuite geführt** im Build-Arbeitsbereich. Eine manuelle Prüfung in Chrome, Edge und Firefox ist offen (PS-718).
- **Übersetzungen** ins Französische, Deutsche, Niederländische, Koreanische und Spanische müssen vor dem klinischen Einsatz von Muttersprachlern geprüft werden.
- **Die Pipeline zur kontinuierlichen Integration** ist geschrieben, läuft aber erst, wenn das Repository auf GitHub liegt (geplant für Ende Oktober 2026).
## Systemvoraussetzungen {#ch1-prerequisites}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Systemvoraussetzungen

**Status:** Teilweise. Das Repository enthält die Anforderungen an Software, Netzwerk und Browser. Es enthält **keine Dimensionierungsangaben** für Server, Datenbankspeicher, Bandbreite, Datensicherung oder Wiederherstellung. Wo dieser Teil „Noch nicht festgelegt“ sagt, gibt es im Repository keine Angabe, und hier wird keine erfunden; die offenen Punkte stehen in der Datei mit den offenen Fragen des Kapitels, damit ForMedrixAI sie entscheidet, bevor ein Kunde die Kapazität plant.

### Serverhardware und Hosting {#ch1-prereq-hardware}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Systemvoraussetzungen > Serverhardware und Hosting

| Gegenstand | Was das Repository sagt |
|---|---|
| Größe des API-Servers (CPU, Arbeitsspeicher, Anzahl der Instanzen) | Noch nicht festgelegt. Der Entwurf verlangt mindestens eine betriebsbereite Instanz, mit Geschäftslogik in Klassenbibliotheken und einem Container-Image. |
| Größe des Hubs (SignalR) und Anzahl der Verbindungen | Noch nicht festgelegt. Der Abnahmetest verwendet mindestens 50 verbundene Boards. |
| Befund-Renderer | Ein betriebsbereiter Pool von 2 bis 4 Chromium-Browserprozessen (beginnen Sie mit 2), ein Timeout von 5 Sekunden je Befund, ein Browser, der nach 500 Renderings neu gestartet wird, kein ausgehender Netzwerkverkehr, ein größeres `/dev/shm` und etwa 100 MB Schriftarten (einschließlich CJK). CPU und Arbeitsspeicher je Instanz: Noch nicht festgelegt. |
| Schnittstellen-Engine | BridgeLink, ein dauerhaft laufender Java-Server, als Container. Größe: Noch nicht festgelegt. |
| Container-Plattform | Kubernetes oder Docker für das portable Paket; das Container-Hosting des Anbieters für eine öffentliche Cloud. Versionen: Noch nicht festgelegt. |
| Nachrichtenvermittler | Keiner. Der Nachrichtenbus besteht aus Tabellen in der SQL-Server-Datenbank, hinter einer Schnittstelle (`IMessageBus`). RabbitMQ oder eine Cloud-Warteschlange würden nur hinzugefügt, wenn der Lasttest zeigt, dass die Tabellen ein Engpass sind. |
| Build-Werkzeuge (für Techniker, die das Frontend bauen) | Node.js 24.x (`engines` in `package.json`). Auf einem Produktionsserver, der statische Dateien ausliefert, nicht erforderlich. |

### Datenbank {#ch1-prereq-database}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Systemvoraussetzungen > Datenbank

**Status:** Geplant. Im Repository sind weder Schema noch Skripte noch Datenbankcode vorhanden.

- **Engine.** Microsoft SQL Server. Dieselbe Engine läuft als Azure SQL Database (serverless oder bereitgestellt), als SQL Server auf einer virtuellen Maschine, als SQL Server in Linux-Containern (offizielle Microsoft-Images für 2017 bis 2025; nur x86-64-Linux-Hosts; eine Lizenz ist erforderlich) oder als AWS RDS for SQL Server.
- **Pausieren Sie eine Produktionsdatenbank nie automatisch.** Eine pausierte Datenbank macht den ersten Bildschirm am Morgen oder einen STAT-Fall in der Nacht zu einer fehlgeschlagenen Anfrage. Das automatische Pausieren ist nur für Test- und Schulungsmandanten zulässig. Bei Azure SQL serverless wird es mit `-1` ausgeschaltet.
- **Ausgangspunkt für die Größe.** Die Bereitschaftsprüfung empfiehlt für einen Produktionsmandanten mindestens 2 virtuelle Kerne, „bis ein Lasttest etwas anderes sagt“. Es ist eine Empfehlung, keine getestete Anforderung. Speicher, Arbeitsspeicher, IOPS und Wachstum je Fall: Noch nicht festgelegt.
- **Schemaänderungen.** Versionierte Skripte, die von der Release-Pipeline angewendet werden, bevor der API-Container startet, nie beim Start der Anwendung.
- **Datensicherungen.** Die Wiederherstellung zu einem beliebigen Zeitpunkt (Point-in-Time-Restore) ist der Entwurf für die Prüftabellen. Zeitplan der Datensicherung, Aufbewahrung, Wiederherstellungszeitziel und Wiederherstellungspunktziel: Noch nicht festgelegt.
- **Hinweis zu AWS.** AWS hat kein serverless SQL Server, und eine geänderte Instanzklasse bedeutet Ausfallzeit (verkürzt durch Multi-AZ). Es fallen Lizenzkosten an.
- **Blob-Speicher** für Befund-PDFs, Exporte und zurückgehaltene Freigaben: Azure Blob oder ein S3-kompatibler Speicher, je Mandant, privat, im Ruhezustand verschlüsselt und in der Hosting-Region des Mandanten (Vertrag: `BLOB_STORAGE_API.md`). PathScribe speichert keine Bilder oder Anhänge, nur Links auf das Bildgebungssystem des Labors.

### Netzwerk {#ch1-prereq-network}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Systemvoraussetzungen > Netzwerk

| Bedarf | Detail |
|---|---|
| TLS überall | Jede Serveradresse in `config.json` muss `https://` sein. Einfaches `http://` ist nur zum selben Computer in einem Entwicklungs-Build erlaubt oder für eine interne Bereitstellung, die in ihrer Ursprungsdatei der Sicherheits-Header `"https": false` setzt (wodurch HSTS entfällt). |
| Browser zu API und Hub | HTTPS zum API-Server. WebSockets (`wss://`) zu `/hubs/live`. Lassen Sie Server-Sent Events und Long Polling als Ausweichverfahren aktiviert, weil einige Krankenhaus-Proxys WebSockets sperren. Lastverteiler brauchen aktivierte WebSockets und ein Leerlauf-Timeout von mehr als 15 Sekunden. |
| Zugelassene Adressen | Die Adressen in `config.json` (API, Identitätsanbieter, Hub, Renderer, Schnittstellenempfänger, KI- und Terminologie-Endpunkte, Fehlerüberwachung) werden zur Content-Security-Policy des Browsers. Führen Sie den Header-Generator nach jeder Änderung erneut aus. |
| Identitätsanbieter | Vom Browser aus erreichbar (und vom Server aus, sobald der Server die Anmeldung hält). Weiterleitungsadressen für Microsoft Entra ID: `https://<pathscribe host>/auth/callback/microsoft` und `https://<pathscribe host>/auth/signing/microsoft`. |
| Standort-Agent | Nur ausgehendes HTTPS (Port 443), auf einem eigenen Hostnamen (zum Beispiel `agent.<tenant domain>`), der ein Clientzertifikat verlangt. Keine eingehende Firewall-Freigabe. Ein Proxy mit TLS-Inspektion muss diesen Host unverändert durchlassen, weil die Inspektion das Clientzertifikat zerstört. |
| Reichweite des Standort-Agenten (lokal von der IT des Krankenhauses festgelegt) | Die Drucker-Subnetze, die Druckerports (Standard 9100, 515, 631 und 443), die UNC-Wurzeln für Freigaben und die Hosts, von denen Dokumente heruntergeladen werden dürfen. PathScribe kann diese Liste nicht ändern. |
| HL7-Verbindung | Aufträge hinein und Ergebnisse hinaus laufen über die Schnittstellen-Engine. Die Verbindung wird durch ein Site-to-Site-VPN oder MLLP über TLS gesichert. Eine Nachricht wird erst bestätigt, wenn sie dauerhaft gespeichert ist. |
| Feste ausgehende Adresse | SFTP-Dateiablagen brauchen für die Zulassungsliste des Krankenhauses eine feste ausgehende IP-Adresse (ein NAT-Gateway oder ein Firewall-Egress) und einen fest hinterlegten Hostschlüssel. |
| E-Fax und E-Mail | Ein SMTP-Gateway auf Port 587 mit Authentifizierung. |
| Bandbreite und Latenz | Noch nicht festgelegt. Das Entwurfsziel für eine allgemeine Bildschirmaktualisierung sind 800 ms im 95. Perzentil vom Festschreiben bis zur Anzeige; für die Boards im Operationssaal weniger als 500 ms. Der erste Seitenaufruf umfasst 0,70 MB komprimiert (Ziel 1 MB). |
| Hosting-Region | Je Bereitstellung wird eine Region gewählt. Der Endpunkt `/api/config` des API-Servers kann die Regionen der Datenbank und des Blob-Speichers melden, die der Reiter KI-Verhalten anzeigt (siehe [KI-Verhalten](#screen-tab-ai)). Dieser Endpunkt ist geplant. |

### Arbeitsplatzrechner {#ch1-prereq-workstation}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Systemvoraussetzungen > Arbeitsplatzrechner

**Status:** Umgesetzt, offene Prüfungen sind vermerkt.

- **Unterstützte Browser** (entschieden am Oct 15, 2026): aktuelle Versionen von Chrome, Microsoft Edge und Firefox. **Safari wird nicht unterstützt.** Die automatisierten Tests laufen in Chromium (der Engine von Chrome und Edge). Firefox wird nur auf Anforderung ausgeführt, wurde im Build-Arbeitsbereich noch nicht ausgeführt, und eine manuelle Prüfung in allen drei ist offen (PS-718). In Chrome und Edge werden Auswahllisten als gestaltete Felder gezeichnet; Firefox zeigt seine eigene Liste. Das Verhalten ist dasselbe.
- **Verwendete Browserfunktionen.** WebAssembly (die Rechtschreibprüfung), Web Workers und (wenn die Person sie erlaubt) Kamera, Mikrofon und Bildschirmaufnahme, für Zuschnittfotos, Diktat und Screenshots für Verbesserungsanfragen. Der Header Permissions-Policy erlaubt diese nur für PathScribe.
- **Etikettendruck von einem Arbeitsplatzrechner.** QZ Tray (Umgesetzt) oder der PathScribe-Arbeitsplatz-Agent (Umgesetzt, Browserseite) muss auf dem Computer laufen. Sie lauschen nur auf dem Computer selbst: der Arbeitsplatz-Agent auf `wss://127.0.0.1` an den Ports 9100 bis 9102 und QZ Tray auf `localhost` an den Ports 8181, 8282, 8383 und 8484. Wenn die Seite QZ Tray nicht erreichen kann, öffnet sich das Etikett im Druckfenster des Browsers, und eine Meldung sagt, dass der Etikettendrucker nicht verbunden ist.
- **Zugriff auf das lokale Netzwerk erlauben.** Chrome und Edge fragen die Person um Erlaubnis für lokale Adressen. Die IT des Krankenhauses kann PathScribe mit der Richtlinie `LocalNetworkAccessAllowedForUrls` vorab genehmigen.
- **Abfragen von QZ Tray.** QZ Tray fragt „Allow this website to use your printers?“, bis Druckanfragen mit dem Zertifikat des Kunden signiert werden. Das Signieren ist **geplant** (es braucht den API-Server). Bis dahin wird die Person möglicherweise einmal je Arbeitsplatzrechner gefragt. Die Entscheidung (Oct 16, 2026) lautet: ein selbstsigniertes Zertifikat je Kunde, das ein Ablaufdatum hat, das die IT erneuern und erneut verteilen muss; siehe `docs/product/QZ_TRAY_CERTIFICATE_GUIDE.md`. Die Schritte für jedes Werkzeug zur Geräteverwaltung sind mit „Zuerst testen“ gekennzeichnet, weil sie auf keinem Pilotrechner ausgeführt wurden.
- **Etikettendrucker.** Thermodrucker, die ZPL verarbeiten. Berichtsdrucker im Netzwerk werden über den Standort-Agenten erreicht. Das Drucken von Befunden im Netzwerk funktioniert heute nicht aus dem Browser.
- **Screenreader.** Automatisierte Barrierefreiheitsprüfungen bestehen; der Test durch eine Person mit NVDA oder VoiceOver ist offen (PS-687).
- **Sprachen.** Englisch, Französisch, Deutsch, Niederländisch, Koreanisch und Spanisch, dazu belgisch-niederländische und belgisch-französische Formulierungen.
- **Monitorgröße, Mindestprozessor und Arbeitsspeicher:** Noch nicht festgelegt.
- **Viewer für Whole Slide Imaging.** Der Viewer des Herstellers muss so installiert oder vom Arbeitsplatzrechner aus erreichbar sein, wie der Hersteller es verlangt. PathScribe öffnet den Viewer nur in einem neuen Tab, mit einer Vorlage für die Startadresse, die Sie einmal für jeden Viewer eingeben und in die der Barcode des Objektträgers eingesetzt wird. Er wird in den [Anbieterintegrationen](#screen-vendor_integrations) konfiguriert. PathScribe liefert keine Viewer-Adresse mit.

## Sicherheitsmodell {#ch1-security}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell

**Status:** Teilweise. Fast jede der folgenden Kontrollen ist im Browser umgesetzt und hat einen geschriebenen Serververtrag. Der Server, der jede Prüfung wiederholen muss, ist nicht gebaut (siehe [Der heutige Stand des Produkts](#ch1-current-state)). Eine Prüfung im Browser ist ein Entgegenkommen; die Prüfung des Servers ist die Kontrolle. Beschreiben Sie keine der hier genannten Kontrollen als Schutz echter Patientendaten, solange die Serverseite nicht existiert.

Dieser Teil sagt, was jede Kontrolle tut. Er sagt nicht, dass ein Labor durch ihre Verwendung ein Gesetz oder eine Norm erfüllt. Das entscheiden die eigenen Richtlinien, Verträge und das Qualitätssystem des Labors.

### Single Sign-On {#ch1-sso}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > Single Sign-On

**Status:** Teilweise. OpenID Connect (OIDC): Browserseite umgesetzt. Serverseite geplant.

- **Protokoll.** OpenID Connect, Authorization-Code-Flow mit PKCE, wobei die Anwendung als öffentlicher Client einer Single-Page-Anwendung registriert ist (kein Client-Secret). Es ist generisch und funktioniert daher mit Microsoft Entra ID, Okta, Ping und Keycloak. Microsoft Entra ID ist das erste Ziel. Die Entra-Authority muss einen Mandanten nennen: `/common`, `/organizations` und `/consumers` werden abgelehnt, weil sie jedes Microsoft-Konto zulassen würden.
- Die Anmeldung mit **Google** wird nicht angeboten, weil der Token-Endpunkt von Google ein Client-Secret verlangt. Ein Krankenhaus mit Google Workspace kann Google über Entra ID oder Okta föderieren.
- **Niemand wird durch die Anmeldung angelegt.** Nur Personal, das bereits eingerichtet und aktiv ist, kann sich anmelden. Die Identität wird einem Personaldatensatz über das dauerhafte Subjekt des Anbieters zugeordnet (`oid` von Entra, sonst `sub`), nie allein über die E-Mail. Die erste Anmeldung kann über die E-Mail verknüpfen, wenn die E-Mail vertrauenswürdig ist (verifiziert oder eine mandantenspezifische Entra-Authority); eine Einstellung kann das ausschalten, sodass eine Administratorin oder ein Administrator jedes Konto verknüpft. Ablehnungen (nicht eingerichtet, inaktiv, mehrdeutig, bereits verknüpft, kein Anwendungszugriff) werden mit einer klaren Meldung angezeigt und protokolliert. Siehe [Mitarbeiter](#screen-staff-members).
- **Demonstrationsversionen** bieten auch die Anmeldung mit Passwort. Ein Produktions-Build (`VITE_AUTH_MODE` auf `sso` gesetzt) enthält keine Demonstrationskonten.
- **Token.** Heute hält der Browser die Token in `sessionStorage` (nur dieser Tab, weg, wenn der Tab geschlossen wird). **Für die Produktion geplant** (entschieden am Oct 3 und Oct 15, 2026): Der API-Server hält die Token, und der Browser erhält nur ein Sitzungs-Cookie mit `HttpOnly`, `Secure` und `SameSite` samt einem Anti-Forgery-Header. Der Browser trägt nie ein JWT, und der Hub verwendet dasselbe Cookie. Dafür ist ein gemeinsamer Sitzungsspeicher (SQL Server oder Redis) auf dem Server nötig.
- **Die Anwendung in Entra ID registrieren** (Schritte für die IT des Krankenhauses, aus `AUTHENTICATION_OIDC.md`): eine Registrierung für einen einzelnen Mandanten mit der Plattform Single-Page-Anwendung und den beiden unter [Netzwerk](#ch1-prereq-network) genannten Weiterleitungsadressen, ohne Client-Secret, mit dem optionalen Claim `email` im ID-Token und einem bereitgestellten API-Bereich (Scope), der der Anwendung gewährt wird.
- **Konten und Rollen aus dem Verzeichnis.** Die automatische Kontensynchronisierung (SCIM: Eintritte, Änderungen und Austritte) ist für die Serverphase **geplant**. Die Zuordnung von Verzeichnisgruppen zu PathScribe-Rollen ist für die Zeit nach dem ersten Release **geplant**. Wenn sie kommt, darf eine Gruppe nur Rollen für den Arbeitsplatz gewähren, nie Admin, Laborleitung, Vorlagengenehmiger oder irgendetwas mit Signierbefugnis, und jede Zuordnung braucht die Genehmigung einer zweiten Administratorin oder eines zweiten Administrators. Heute werden Rollen von Hand in den [Mitarbeitern](#screen-staff-members) und den [Rollen](#screen-staff-roles) zugewiesen.

#### SAML 2.0 {#ch1-saml}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > Single Sign-On > SAML 2.0

**Status:** Nicht umgesetzt.

PathScribe hat keine SAML-2.0-Anmeldung, keine SAML-Bibliothek und keinen SAML-Bildschirm. Eine Suche im gesamten Repository findet das Wort nur in zwei Entwurfsdokumenten. Das Nächstliegende, das funktioniert, ist OIDC, siehe oben. Die dokumentierte Richtung für gemeinsam genutztes SaaS-Hosting ist, dass sich Krankenhäuser über einen PathScribe-Identitätsbroker (Microsoft Entra ID External ID) anmelden, der mit dem Verzeichnis des Krankenhauses SAML oder OIDC spricht und mit PathScribe reines OIDC, sodass „PathScribe nie SAML verarbeitet“. Dieser Broker ist **geplant** und nicht gebaut. Eine Bereitstellung in einer privaten Cloud oder eine dedizierte Bereitstellung verbindet sich per OIDC direkt mit der eigenen Entra ID des Krankenhauses. Ein Krankenhaus, das heute nur SAML anbieten kann, sollte das ForMedrixAI bei der Planung mitteilen oder SAML in Entra ID oder Okta föderieren, die dann OIDC mit PathScribe sprechen.

### Rollenbasierte Zugriffskontrolle {#ch1-rbac}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > Rollenbasierte Zugriffskontrolle

**Status:** Demonstration. Die Prüfungen laufen in den Diensten des Browsers. Die serverseitige Durchsetzung (`AUTHORIZATION_API.md`, Phase 4) ist **geplant**.

- **Berechtigungen.** Alles, was PathScribe durchsetzt, ist eine benannte Berechtigung in der Form `domain:object:verb`, zum Beispiel `config:retention-policy:manage`. Der Katalog (`capabilityCatalog.ts`) ist die einzige Liste und enthält etwa 320 Berechtigungen (322 zum Zeitpunkt des Schreibens; die Zahl wächst mit den Releases). Eine Berechtigung wird nur zusammen mit ihrer Prüfung hinzugefügt, und ein Test lässt den Build fehlschlagen, wenn eine Berechtigung keine Prüfung hat. Jede Berechtigung hat eine Risikostufe. Bei einer Berechtigung mit **hohem Risiko** wird jede Prüfung an einer Aktion in das Prüfprotokoll geschrieben, erlaubt oder abgelehnt, und jeder Export hat hohes Risiko.
- **Rollen.** Eine Rolle ist ein Satz von Berechtigungen. Ein Mitarbeiter oder eine Mitarbeiterin hat eine oder mehrere Rollen und eine Zuweisung zu Einrichtungen (eine leere Zuweisung bedeutet alle Einrichtungen). Der Geltungsbereich gehört zur Zuweisung, nicht zur Rolle. Eine Prüfung ist nur bestanden, wenn eine innegehabte Rolle die Berechtigung gewährt, jede von ihr vorausgesetzte Berechtigung ebenfalls gewährt ist und die Aktion innerhalb der Einrichtungen der Person liegt. Eine Ablehnung nennt einen Grund (nicht gewährt, Voraussetzung nicht gewährt, außerhalb des Geltungsbereichs, Einrichtung unbekannt).
- **Eingebaute Rollen.** Sechzehn: Pathologe, Assistenzarzt, Fellow, Pathologieassistent, Admin, Arzt, OP-Personal, Vorlagenautor, Vorlagengenehmiger, Laborleitung, QA-Prüfer, Probeneingang, Histologie-Fachkraft, Zytologieassistent, Molekularbiologie-Fachkraft und Superadmin. Arzt und OP-Personal sind Verzeichniseinträge ohne Anwendungszugriff. Die Voreinstellungen folgen dem Prinzip der minimalen Rechte: Ein Pathologe hat standardmäßig keine Konfigurationsberechtigungen. Eine Administratorin oder ein Administrator kann Rollen ändern und Rollen hinzufügen in den [Rollen](#screen-staff-roles), außer Superadmin.
- **Keine Umgehung für irgendeine Rolle.** Superadmin ist eine Rolle, der Berechtigungen wie jeder anderen gewährt werden, und die Prüfung hat dafür keine Abkürzung. Auch Admin schließt nichts ein. Superadmin hat jede Berechtigung außer `config:ai-prompt:approve` (das Freigeben der KI-Anweisungen): Sie wird aus Gründen der Funktionstrennung vorenthalten, sodass nur das Labor (die Laborleitung) freigibt, was seiner eigenen KI gesagt wird, und der Support von ForMedrixAI es nie tut.
- **Superadmin ist ForMedrixAI-Support vorbehalten.** Es wird nur über eine Support-Anmeldung gehalten. Ein Krankenhaus kann es weder zuweisen noch bearbeiten noch in der Rollenauswahl für Personal sehen, und ein Personaldatensatz, der es nennt, erhält daraus nichts. Die serverseitige Quelle dieser Identität (der eigene Identitätsmandant von ForMedrixAI) ist **geplant**.
- **Nur für die Plattform bestimmte Berechtigungen.** Sechs Berechtigungen der Domäne `platform:` gelten nur für Superadmin (mandantenübergreifende Fallansicht, Aufsichtsbehörden, Signierregeln sowie Verwalten, Veröffentlichen und Simulieren des Schnittstellenwörterbuchs). Eine Rolle eines Krankenhauses kann sie nicht innehaben. Ihre Bildschirme sind in diesem Handbuch mit `[FORMEDRIXAI INTERNAL ONLY]` gekennzeichnet.
- **Mandantengrenze.** Jeder Benutzer und jeder Fall trägt eine `organisationId`. Der mandantenübergreifende Zugriff ist auf den Support-Zugriff beschränkt (siehe unten). Die Durchsetzung findet heute im Browser statt; eine serverseitige Abfrageschicht, die sie durchsetzt, ist geplant.
- **Fallschutz.** Eine Person, die einen Fall nicht öffnen kann, erhält dieselbe neutrale Meldung wie bei einem Fall, den es nicht gibt. Eine getippte oder eingefügte Eingangsnummer beweist nichts, und eine Nachricht macht eine Nummer nur dann zum Link, wenn die lesende Person diesen Fall öffnen kann. Der Server muss auf „Es gibt keinen solchen Fall“ und „Sie dürfen ihn nicht sehen“ dieselbe Antwort geben (zum Beispiel `404`), ohne Unterschied in Inhalt, Headern oder Zeitverhalten.
- **Bildschirme.** Jeder Bildschirm hat seine eigene Berechtigung `screen:<name>:open`. Startseite und Hubs zeigen nur die Kacheln, die die Person öffnen darf, und die Route prüft erneut.
- **Sprach- und Tastaturbefehle** sind keine Zugriffskontrolle und werden nie verwendet, um Zugriff zu gewähren.
- **Wo Sie es verwalten.** [Rollen](#screen-staff-roles), [Mitarbeiter](#screen-staff-members) und der [Reiter Personal](#screen-tab-staff). Änderungen an Rollen und Berechtigungen werden protokolliert.

### Multi-Faktor-Authentifizierung und erneute Authentifizierung bei der Abmeldung {#ch1-mfa}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > Multi-Faktor-Authentifizierung und erneute Authentifizierung bei der Abmeldung

**Status:** Teilweise. Browserseite umgesetzt. Der Authenticator für Demonstrationskonten ist **simuliert**. Serverseite geplant.

- **Benutzer mit Single Sign-On.** Der Identitätsanbieter verlangt den zweiten Faktor. PathScribe liest das ID-Token und akzeptiert MFA, wenn `amr` den Wert `mfa` enthält oder Methoden aus zwei verschiedenen Familien nennt (Wissen, Besitz, Inhärenz) oder `acr` eine Multi-Faktor-Klasse nennt. Ein Passwort allein ist keine MFA. Wenn die Organisation MFA verlangt und das Token dies nicht aussagt, wird die Anmeldung mit einer klaren Meldung abgelehnt. Der Anbieter muss so eingestellt sein, dass er diese Claims sendet (Entra: eine Richtlinie für bedingten Zugriff, die MFA verlangt; Okta: eine Authentifizierungsrichtlinie mit einem Besitzfaktor; Keycloak: die Authentifizierungsstufe auf `acr` abbilden und einen `amr`-Mapper hinzufügen).
- **Richtlinie je Organisation.** In der [Sitzungssicherheit](#screen-session_security): wer gefragt wird (niemand, die Rollen, die Befunde signieren, oder alle; Standard niemand), wie viele Minuten vergehen, bis eine Signatur einen frischen Code braucht (1 bis 720, Standard 30), und wie viele Stunden vergehen, bis der zweite Faktor abläuft und die Sitzung endet (1 bis 72, Standard 12). Gespeichert mit `config:session-security:manage` und protokolliert.
- **Erneute Bestätigung bei einer Signatur.** Wenn der letzte zweite Faktor älter ist als die Step-up-Zeit, fragt das Signieren erneut: einen frischen Code bei Passwortsitzungen oder eine frische Anmeldung beim Anbieter (`prompt=login`), deren Token MFA erneut bestätigen muss.
- **Demonstrationskonten.** Ein **simulierter** zeitbasierter Authenticator (RFC 6238) mit Wiederherstellungscodes, die einmal angezeigt werden. Er ist nur in der Demonstrationsversion enthalten. Ein Server-Build hat keinen simulierten Faktor, sodass eine Person, die kein Single Sign-On verwendet und nach MFA gefragt wird, die Meldung erhält, dass sie nicht verfügbar ist, und sich nicht anmelden kann. Das Zurücksetzen einer Registrierung braucht `auth:mfa-enrolment:reset`.
- **Sperre.** Fünf fehlgeschlagene Codes sperren die Prüfung für 15 Minuten. Fünf fehlgeschlagene Passwortanmeldungen sperren eine E-Mail-Adresse für 15 Minuten. Diese Zähler werden heute im Browser geführt; der Server muss sie führen. Bei Single Sign-On wendet der Anbieter seine eigene Sperre an.
- **Richtlinie zur Authentifizierung bei der Abmeldung** (Umgesetzt, Demonstration). Je durchführender Einrichtung: ein Passwort bei jeder Abmeldung (der Standard, `strict`) oder einmal je Sitzung (`session`, mit einer Dauer von 15, 30, 60 oder 240 Minuten), mit einem optionalen zweiten Faktor. Eine Sitzung endet bei Zeitüberschreitung, Abmeldung oder Rollenwechsel. Der Bildschirm warnt, dass der Modus einmal je Sitzung von dem abweicht, was 21 CFR Part 11 (11.200(a)(1)) für spätere Signaturen erwartet, sodass das Qualitätssystem des Kunden entscheidet.
- **Biometrisches Signieren** (WebAuthn, Touch ID oder Windows Hello) ist eine optionale Bestätigung. Jede Person registriert ihr eigenes Gerät, und das Passwort funktioniert immer ebenfalls. Die Serverversion der biometrischen Aufrufe ist geschrieben, aber die Bildschirme verwenden sie noch nicht.
- **Nicht umgesetzt:** Einschränkung der Remote-Abmeldung nach Netzwerk, Ablauf einer Abmeldesitzung bei Sperrung des Arbeitsplatzes, SMS und Hardware-Schlüssel als zweiter Faktor, ein serverseitiger Richtlinienspeicher.
- **Wo Sie es verwalten.** [Sitzungssicherheit](#screen-session_security).
### Sitzungssicherheit {#ch1-session}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > Sitzungssicherheit

**Status:** Teilweise. Zeitüberschreitung bei Inaktivität umgesetzt (Browser). Vom Server gehaltene Sitzung geplant.

- **Zeitüberschreitung bei Inaktivität.** Ein organisationsweiter Standard in der [Sitzungssicherheit](#screen-session_security), zur Auswahl 5, 10, 15, 20, 30 oder 60 Minuten. Der Standard ist 15. Ein durchführendes Labor kann seinen eigenen Wert im [Einrichtungsverzeichnis](#screen-facility-dictionary) festlegen. Wenn ein Fall geöffnet ist, gilt der Wert des Labors; an anderer Stelle (Startseite, Arbeitsliste) gilt der Wert der Organisation. Bei der Zeitüberschreitung wird die Person abgemeldet, und nicht gespeicherte Entwürfe bleiben erhalten, sie werden nicht verworfen.
- **Dasselbe Konto, zweiter Tab.** Die erneute Anmeldung desselben Benutzers in einem anderen Tab löst die frühere Sitzung im selben Browser ab, mit einer Rückfrage.
- **Regel des Servers.** Der Server beendet außerdem eine Sitzung, deren Token abgelaufen ist, sodass ein geschlossener oder eingefrorener Browser keine offen halten kann.
- **Browserspeicher.** Ist ein API-Server konfiguriert, werden keine Patientendaten in den Browserspeicher geschrieben. Nur Anzeigeeinstellungen, Arbeitsplatzeinstellungen (Scanstation, Anzeigeprofil, Fensterpositionen) und die Anmeldesitzung berühren ihn.
- **Schutz von Übertragung und Seite.** Die erzeugten Header setzen eine strenge Content-Security-Policy (kein Inline-Skript, kein `eval`, kein Framing), HSTS bei https-Bereitstellungen, `nosniff`, eine Richtlinie `no-referrer` (Adressen können Fallkennungen tragen) und eine eingeschränkte Permissions-Policy. Der HTML-Code von Befunden wird bereinigt, bevor er angezeigt wird. Der Browser hält keinen Schlüssel für KI, Terminologie oder Anbieter, und ein Test lässt den Build fehlschlagen, wenn einer im Frontend auftaucht.
- **Fehlerberichte.** Absturzberichte können an Sentry oder an einen eigenen Collector eines Krankenhauses gehen, **standardmäßig aus**. Ein Bericht enthält nur einen Fehlernamen, eine bereinigte Meldung (kein zitierter Text, keine E-Mail-Adressen und keine Folgen von drei oder mehr Ziffern), höchstens zehn Stack-Frames, die Route mit ersetzten numerischen Segmenten und eine Referenz. Er braucht zwei Einstellungen in `config.json` und für einen US-Kunden einen unterzeichneten Business Associate Agreement mit dem Anbieter, für die EU und das Vereinigte Königreich einen Auftragsverarbeitungsvertrag und Datenhaltung in der EU. Selbst-Hosting vermeidet beides.
- **Wo Sie es verwalten.** [Sitzungssicherheit](#screen-session_security) und [Einrichtungsverzeichnis](#screen-facility-dictionary).

### Support-Zugriff {#ch1-support}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > Support-Zugriff

**Status:** Teilweise. Browserseite umgesetzt. Serverseite geplant.

Das Krankenhaus entscheidet als Verantwortlicher für die Datenverarbeitung, ob der Support von ForMedrixAI seine Daten erreichen darf. „Support-Zugriff“ bedeutet, dass eine Superadmin-Sitzung eine Organisation erreicht, deren Personal die Person nicht angehört.

- **Richtlinie je Organisation.** Deaktiviert (der Support erhält nichts, auch nicht Superadmin), **Genehmigung erforderlich** (der Standard) oder Immer erlaubt. Bei Genehmigung erforderlich fragt der Support je Ticket mit einer Begründung von mindestens 10 Zeichen an. Eine genehmigende Person im Krankenhaus (nicht die anfragende) genehmigt oder lehnt ab. Eine Genehmigung gilt für das Zugriffsfenster der Organisation (30 Minuten, 1, 2, 4 oder 8 Stunden; der Standard ist 2) oder kürzer, wenn der Support sie beendet oder das Krankenhaus sie widerruft.
- **Der eigene Prüfstrom des Krankenhauses.** Getrennt vom Hauptprüfprotokoll: Anfragen, Entscheidungen, Abläufe, abgelehnte Öffnungen, Öffnungen und Bearbeitungen von Fällen, jede Liste oder Suche, die Fälle offengelegt hat (Fallkennungen; Namen der Suchkriterien, nie Werte), Richtlinienänderungen und Exporte. Jeder Eintrag ist per Hash mit dem vorherigen verkettet, sodass ein geänderter oder entfernter Eintrag die Kette bricht, und der Bildschirm zeigt die Manipulationsprüfung. Der Export erfolgt als CSV oder JSON.
- **Berechtigungen.** `config:support-access:policy`, `config:support-access:approve` und `config:support-audit:view`, voreingestellt für Admin. Das Öffnen des Falls einer anderen Organisation braucht außerdem `platform:cross-tenant-cases:view`, das nur Superadmin innehaben kann, und wird protokolliert.
- **Nicht umgesetzt (Arbeit am Server):** die IP-Adresse und das Land des Ursprungs (der Browser zeichnet sie leer auf), die Benachrichtigung der Genehmigenden per E-Mail und Webhook (heute eine Meldung in der Anwendung), das Beenden des Zugriffs beim Schließen des Tickets, der PDF-Export des Stroms (CSV und JSON gibt es; eine PDF-Funktion ist im Browser geschrieben), der Strom in einer eigenen, nur anhängenden Tabelle je Mandant und Support-Sitzungstoken, die an Ticket und Ablauf gebunden sind.
- **Wo Sie es verwalten.** [Support-Zugriff](#screen-support_access).

### Protokollierung zur Nachvollziehbarkeit {#ch1-audit}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > Protokollierung zur Nachvollziehbarkeit

**Status:** Teilweise. Browserseite umgesetzt. Speicherung auf dem Server geplant.

- **Was aufgezeichnet wird.** Benutzeraktionen, Abmeldungen, Änderungen (Amendments), Sprachereignisse, Systemereignisse und KI-Aufrufe. Jede Prüfung einer Berechtigung mit hohem Risiko wird aufgezeichnet, ob erlaubt oder abgelehnt. Konfigurationsänderungen durch eine berechtigte Person werden protokolliert. Manche zeichnen die alten und neuen Werte auf (zum Beispiel die KI-Anbieterrichtlinie und Überschreibungen der Signierbefugnis); bei vielen Einstellungen enthält das Protokoll nur den Eintrag, dass die Berechtigungsprüfung erlaubt wurde, nicht den neuen Wert. Was jeder Eintrag enthält, siehe [Systemprotokolle](#screen-audit-log).
- **Keine Patientendaten im Detail.** Der Text `detail` des Prüfprotokolls ist wörtlich Englisch und so gebaut, dass er keine Patientennamen, Geburtsdaten, MRNs oder klinischen Werte enthält. Er verwendet Kennungen und Konfigurationsnamen. Passwörter, Codes und Geheimnisse werden nie aufgezeichnet.
- **Entwurf des Servers.** Nur anhängende Tabellen (nur Einfüge- und Leseberechtigung), jede Prüfzeile in derselben Transaktion wie die Änderung geschrieben, die sie aufzeichnet, ein per Hash verketteter Strom für den Support-Zugriff und Point-in-Time-Datensicherungen. Exportierte Prüfarchive auf unveränderlichem Speicher sind eine Option je Krankenhaus. **Geplant:** Nichts davon existiert, bis der Server gebaut ist. Die Browserversion hält das Protokoll im Demonstrationsspeicher.
- **Aufbewahrung.** Siehe [Datenaufbewahrung](#ch1-retention).
- **Wo Sie es lesen.** [Systemprotokolle](#screen-audit-log), mit den Ansichten für Schnittstellen und Finanzen [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) und [Systemprotokolle: Finanzen](#screen-audit-financial).

### Schwärzung von Patientendaten in Support-Screenshots {#ch1-phi}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > Schwärzung von Patientendaten in Support-Screenshots

**Status:** Umgesetzt.

Wenn ein Benutzer eine Verbesserungsanfrage (Enhancement Request) sendet, erstellt die Anwendung einen Screenshot und deckt jedes als Patientendaten gekennzeichnete Element ab, bevor das Bild den Browser verlässt. Alles, was einen Patientennamen, ein Geburtsdatum, eine MRN oder nationale Kennung, eine Eingangs- oder Fallnummer oder Kontakt- oder Versicherungsdaten des Patienten zeigt, ist mit `data-phi` und seiner Art gekennzeichnet. Toasts, die einen Fall nennen, sind umhüllt, sodass auch sie abgedeckt werden. Personalnamen gelten nicht als Patientendaten. Ein Test liest jede Quelldatei und lässt den Build an einer nicht gekennzeichneten Stelle fehlschlagen, ohne Ausnahmeliste. Grenzen, die Sie einplanen sollten: Freitext, der zufällig eine Kennung enthält (Prüfdetail, Ausnahmegründe der Schnittstelle), kann von keiner Codeprüfung erkannt werden, daher werden diese Zellen als Ganzes abgedeckt; und die Prüfung liest Namen, nicht Typen, sodass ein Wert, der durch eine allgemeine Liste geleitet wird, übersehen werden kann (ein solcher Fall wurde in Batch 368 gefunden und behoben, danach wurden zwanzig Bildschirme in einem Browser geprüft).

**Arbeitsplatzbildschirme (Batches 759 und 760).** Die Arbeitsplatzbildschirme (Einbettung, Mikrotom, Zytologie-Vorbereitung, Nachforderungs-Assistent, Prüfung von Schnittrand-Ausnahmen, Molekular-Chargenverwaltung) und die Zytologie-Screening-Bildschirme zeigen weder Namen noch Geburtsdatum noch MRN des Patienten, nur die Eingangsnummer, die Probenherkunft (oder den Röhrchentyp) und die Objektträger-IDs. Ein externer Fall zeigt zusätzlich seine externe Fall-ID, die beim Probeneingang erfasst wird. Eine eingetippte statt gescannte ID wird zugelassen und im Prüfprotokoll als „Manual Entry“ erfasst. Nichts einzurichten.

### KI-Anbieterrichtlinie und Hosting-Regionen {#ch1-ai-policy}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > KI-Anbieterrichtlinie und Hosting-Regionen

**Status:** Teilweise. Prüfung im Browser umgesetzt. Prüfung im Server-Proxy geplant.

- **Warum.** Einige Rechtsräume nennen, welche KI-Anbieter erlaubt oder verboten sind. PathScribe ist anbieterneutral und prüft jeden KI-Aufruf, bevor er gesendet wird.
- **Die Regel.** Für jeden Rechtsraum und optional jede Einrichtung: die erlaubten KI-Dienste und die für jeden Dienst erlaubten Hosting-Regionen. Keine Regel bedeutet, dass jeder Dienst erlaubt ist. Eine Regel der Einrichtung engt die Regel ihres Rechtsraums ein, und der Aufruf muss beide bestehen. Wo eine Regel Regionen begrenzt, wird ein Aufruf abgelehnt, dessen Region nicht aufgezeichnet ist. Die Dienste werden nach der Form der Anfrage benannt: strukturierte Nachrichten (Anthropic), Chat-Vervollständigungen (OpenAI), verwaltete Chat-Vervollständigungen (Azure OpenAI), Modell-Gateway (AWS Bedrock), strukturierter Inhalt (Google Gemini) und benutzerdefiniert (ein selbst gehostetes Modell). Die konfigurierte Hosting-Region wird mit der Einstellung des KI-Anbieters gespeichert.
- **Bei Ablehnung.** Die Funktion läuft ohne KI weiter und sagt „KI ist für diesen Rechtsraum nicht verfügbar“, wo sie es kann. Der Aufruf wird nie stattdessen an einen anderen Anbieter gesendet.
- **Der Server muss die Prüfung wiederholen.** Eine Prüfung im Browser lässt sich umgehen, daher muss der KI-Proxy des Servers auf jeder Route dieselbe Prüfung vornehmen und ist die, die zählt. Er muss den Dienst und die Region aus der gespeicherten Einstellung wählen, nie aus dem Anfragekörper, mit `403` und dem Code `AI_VENDOR_NOT_ALLOWED` antworten und die Ablehnung protokollieren. **Geplant.**
- **Schlüssel.** Der Browser hält nie einen Schlüssel eines KI-Anbieters. In der Produktion liegen die Schlüssel im Geheimnisspeicher des Servers (zum Beispiel Azure Key Vault). Die gespeicherte Einstellung enthält Anbieter, Modell, Endpunkt und Namen der Bereitstellung, nie einen Schlüssel.
- **Was der Server außerdem tun sollte (geplant):** jeden KI-Aufruf protokollieren (wer, Fall, geprüfte Einrichtung und Rechtsraum, Dienst, Modell, Hosting-Region, Funktion, Token, Ergebnis; nie den Prompt, der Patientendaten enthalten kann), je Benutzer und Organisation die Rate begrenzen und prüfen, dass für den gewählten Anbieter ein Business Associate Agreement oder ein Auftragsverarbeitungsvertrag vorliegt.
- **Offengelegte Lücke.** Im Browser sendet die Anbietereinstellung `mock` KI-Anfragen über den Proxy an die Anthropic-Route, sodass ein Demonstrationsstandort mit der Einstellung `mock` den Proxy trotzdem aufruft. Ein Rechtsraum, der Anthropic nicht zulässt, lehnt dies ab.
- **Menschliche Prüfung.** KI-Ausgaben sind ein Vorschlag. Die Bildschirme, die sie verwenden, zeigen sie, damit die klinisch tätige Person sie annimmt oder ablehnt; siehe das Kapitel zur KI (Kapitel 5).
- **Wo Sie es verwalten.** Die Karte der KI-Anbieterrichtlinie und die Karte der Hosting-Regionen im Reiter [KI-Verhalten](#screen-tab-ai). Das Ändern einer Regel braucht `config:ai-vendor-policy:manage` (standardmäßig Admin und Laborleitung), und jede Änderung wird als `AI_VENDOR_POLICY_CHANGED` protokolliert.

### Datenaufbewahrung {#ch1-retention}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > Datenaufbewahrung

**Status:** Teilweise. Die Einstellungen sind umgesetzt. **Nach ihnen werden noch keine Daten gelöscht**; der Löschauftrag ist Arbeit am Server.

Die [Datenaufbewahrung](#screen-retention) enthält vier Zeiträume: KI-Vorschläge (Standard 90 Tage), Prüfprotokolle (Standard 365 Tage), Fallmomentaufnahmen (Standard 7 Jahre) und das Befundarchiv (Standard 10 Jahre). Der Bildschirm warnt, dass die Mindestaufbewahrung des Prüfprotokolls 90 Tage beträgt und dass Verkürzungen unter die gesetzlichen Mindestfristen die Freigabe der Compliance-Beauftragten der Institution brauchen. Das Speichern braucht `config:retention-policy:manage`. Die Aufbewahrung von physischem Probenmaterial und Blöcken wird über die Entsorgungswarteschlange und die Aufbewahrungssperren auf Fallebene abgewickelt, die dem Rechtsraum folgen (RCPath für das Vereinigte Königreich, CAP und CLIA für die USA). Unveränderliche Befunddokumente im Blob-Speicher sind ein eigener Schutz gegen Löschung. Aufbewahrungsfristen für Datensicherungen: Noch nicht festgelegt.

### HIPAA und CLIA: die Kontrollen, die das Produkt hat {#ch1-regulatory}
Breadcrumb: Startseite > Administratorhandbuch > Systemübersicht und Architektur > Sicherheitsmodell > HIPAA und CLIA: die Kontrollen, die das Produkt hat

**Status:** Teilweise. Die Tabelle listet Kontrollen auf, die im Browser-Build existieren. Keine Kontrolle schützt echte Patientendaten, solange die Serverseite nicht existiert, und **die Verwendung dieser Kontrollen macht ein Labor nicht konform** mit HIPAA, CLIA oder einem anderen Gesetz. Die Konformität hängt von den Richtlinien, Verträgen, dem Hosting und dem Qualitätssystem des Labors ab.

| Bereich | Was PathScribe hat | Status | Wo |
|---|---|---|---|
| Eindeutige Benutzeridentität | Personaldatensätze, mit Single Sign-On, das über das dauerhafte Subjekt des Anbieters zugeordnet wird | Teilweise | [Mitarbeiter](#screen-staff-members) |
| Zugriffskontrolle (minimale Rechte) | Berechtigungen und Rollen, Geltungsbereich der Einrichtung, keine Umgehung für irgendeine Rolle, Fallschutz | Demonstration | [Rollen](#screen-staff-roles) |
| Automatische Abmeldung | Zeitüberschreitung bei Inaktivität (Standard der Organisation, Überschreibung je Labor); Entwürfe bleiben erhalten | Umgesetzt (Browser) | [Sitzungssicherheit](#screen-session_security) |
| Authentifizierung der Person | Single Sign-On, MFA des Anbieters anhand des Tokens geprüft, erneute Bestätigung bei einer Signatur, optionale Geräteprüfung | Teilweise | [Sitzungssicherheit](#screen-session_security) |
| Prüfkontrollen | Prüfprotokoll von Aktionen, Prüfungen mit hohem Risiko, Konfigurationsänderungen; per Hash verketteter Support-Strom | Teilweise | [Systemprotokolle](#screen-audit-log) |
| Sicherheit der Übertragung | https für jede Serveradresse erforderlich, HSTS, strenge Content-Richtlinie; gegenseitiges TLS für den Standort-Agenten | Umgesetzt (Browser und Header). Server geplant | [Netzwerk](#ch1-prereq-network) |
| Zugriff von Anbietern | Vom Krankenhaus kontrollierter, an Tickets gebundener, zeitlich begrenzter Support-Zugriff mit eigener Protokollierung | Teilweise | [Support-Zugriff](#screen-support_access) |
| Minimale Notwendigkeit in Werkzeugen | Patientendaten in Support-Screenshots geschwärzt; kein Patiententext in Webadressen, Fehlern oder Hub-Nachrichten; Absturzberichte bereinigt | Umgesetzt | [Schwärzung](#ch1-phi) |
| Dritte, die Patientendaten verarbeiten | KI-Anbieterrichtlinie je Rechtsraum, Regionsgrenzen, vom Server gehaltene Schlüssel; für jeden Anbieter ist ein Business Associate Agreement oder ein Auftragsverarbeitungsvertrag nötig | Teilweise | [KI-Verhalten](#screen-tab-ai) |
| Integrität des Befunds | Ein unveränderliches, mit Hash (SHA-256) versehenes Befunddokument je Freigabe, unverändert über jeden Kanal gesendet; versionierte Fallspeicherungen mit Konflikterkennung | Umgesetzt (Vertrag); Server geplant | Kapitel 6 |
| Datenaufbewahrung | Konfigurierbare Zeiträume; Entsorgungswarteschlange und Aufbewahrungssperren für Proben | Teilweise | [Datenaufbewahrung](#screen-retention) |
| CLIA: Signierbefugnis | Beteiligungsarten und Signierregeln je Land entscheiden, wer signieren darf, mit protokollierten lokalen Überschreibungen | Umgesetzt | [Teilnahmetypen](#screen-participation_types), [Abzeichnungsregeln nach Land](#screen-country_signing_rules) |
| CLIA: Arbeitsmenge und Kompetenz in der Zytologie | Eine tägliche Arbeitslastgrenze für das GYN-Zytologie-Screening, mit Überschreibungen für Personal und Einrichtung, und die Weiterleitung der Abmeldungen einer neuen Zytologieassistentin an eine Vorgesetzte zur Gegenzeichnung, bis Kompetenzbeurteilungen dokumentiert sind | Umgesetzt (Browser). Der Server erfasst die Screening-Zeit mit seiner eigenen Uhr; geplant | [Tägliche Arbeitslastgrenze](#screen-cytology_workload_cap), [Länder- und Laborregeln](#screen-cytology_compliance_features) |
| Identität der Einrichtung auf Befunden | Ein Einrichtungsdatensatz enthält seine CLIA- oder ISO-15189-Nummer, die in den Befundköpfen angezeigt wird | Umgesetzt | [Einrichtungsverzeichnis](#screen-facility-dictionary) |

**Nicht umgesetzt oder nicht festgelegt:** Verschlüsselung der SQL-Server-Datenbank im Ruhezustand (im Repository ist weder eine Einstellung noch eine Anforderung geschrieben; die Blob-Container sind als im Ruhezustand verschlüsselt festgelegt); eine Spezifikation für Datensicherung und Notfallwiederherstellung; ein serverseitiger manipulationssicherer Prüfspeicher; ein unabhängiger Penetrationstest oder eine Sicherheitszertifizierung (im Repository ist keine verzeichnet); und jede Aussage zur Konformität.
