---
chapter: 9
id: ch9
title: Anhang: Fehlerbehebung und Prüfung des Prüfprotokolls
---

# Anhang: Fehlerbehebung und Prüfung des Prüfprotokolls {#ch9}

Dieses Kapitel hat drei Teile. Der erste ist eine Matrix zur Fehlerbehebung: die Probleme, auf die Administratoren am häufigsten stoßen, jeweils mit Ursache und dem Bildschirm, der sie behebt. Der zweite ist ein Index der Fehlercodes, die PathScribe anzeigt oder aufzeichnet. Der dritte beschreibt den Bildschirm Systemprotokolle und enthält eine Schritt-für-Schritt-Anleitung, um zu prüfen, was das Prüfprotokoll enthält. Das Glossar der Begriffe ist das letzte Kapitel des Handbuchs ([Glossar](#ch99)).

**Das Benutzerhandbuch (Batch 657).** Das Online-Benutzerhandbuch für die Personen, die die Arbeit erledigen, wird aus Markdown in `docs/user-guide/` mit `python3 scripts/user-guide/build.py` erstellt und mit der Anwendung unter `/help` veröffentlicht; die Schaltfläche Hilfe jedes Bildschirms und F1 öffnen den Artikel zum angezeigten Bildschirm. Konfigurations- und Administratorbildschirme behalten ihre Schaltflächen für das Administratorhandbuch. Es ist keine Einstellung nötig. Eine Seite wird hinzugefügt oder geändert, indem man ihre Datei bearbeitet und neu erstellt; der Build prüft die erforderlichen Abschnitte, Links und Routen.

Jede hier zitierte Meldung ist der Text des Produkts in deutscher Sprache. Jeder Code ist einer, der im Quellcode vorhanden ist; ein Code, der in einem Vertrag nur ein Platzhalter ist und im Produkt nicht verwendet wird, ist nicht aufgeführt.

## Matrix zur Fehlerbehebung {#ch9-matrix}
Breadcrumb: Startseite > Administratorhandbuch > Anhänge > Matrix zur Fehlerbehebung

**Status:** Umgesetzt

**So verwenden Sie die Matrix.** Suchen Sie das Symptom, das der Benutzer meldet, lesen Sie die wahrscheinliche Ursache und folgen Sie der Behebung. Die meisten Meldungen „es funktioniert nicht“ haben eine von zwei Ursachen: ein Verzeichnis, das nie eingerichtet wurde (eine leere Liste), oder eine Rolle, die eine Berechtigung nicht enthält (eine ausgegraute Schaltfläche oder ein abgelehntes Speichern). Zeigt das Symptom einen Code in Großbuchstaben, schlagen Sie ihn im [Fehlercode-Index](#ch9-error-codes) nach.

**Vor allem anderen.** Zwei Prüfungen beantworten die meisten Fragen.

1. Öffnen Sie [Systemprotokolle](#screen-audit-log) und suchen Sie nach dem Namen der Person oder dem Berechtigungsschlüssel. Eine abgelehnte Berechtigungsprüfung schreibt einen Eintrag **Capability refused**, der die Berechtigung und die Sitzungsrolle der Person nennt.
2. Suchen Sie im Tab **Fehlerprotokoll** nach einem offenen Fehler mit einem Code, einer Quelle und einer Uhrzeit nahe der Meldung.

### Leere Listen und Meldungen „nicht eingerichtet“ {#ch9-matrix-empty}

Eine leere Auswahlliste oder eine Meldung „nichts konfiguriert“ bedeutet fast immer, dass ein Verzeichnis, das in der Einrichtungsreihenfolge früher steht, übersprungen wurde. Die Seite [Einrichtungsreihenfolge](setup-sequence.html) nennt die Reihenfolge.

| Symptom (was der Benutzer sieht) | Wahrscheinliche Ursache | Behebung | Bildschirm |
|---|---|---|---|
| Im Teamfenster eines Falls: **Keine Teilnahmetypen konfiguriert**, mit dem Hinweis „Richten Sie Typen unter System → Teilnahmetypen ein.“ | Es existiert kein Teilnahmetyp. | Fügen Sie die Typen hinzu, die das Labor verwendet, und öffnen Sie das Fenster erneut. | [Teilnahmetypen](#screen-participation_types) |
| Ein Testdruck oder ein Etikettenfenster meldet **Keine Druckerprofile konfiguriert**. | Es wurde kein Druckerprofil hinzugefügt. | Fügen Sie für jedes Modell von Etikettendrucker ein Druckerprofil hinzu. | [Druckerprofile](#screen-printer_profiles) |
| Eine Einbettungs- oder Mikrotomiestation meldet **Kein Drucker konfiguriert** oder **Das konfigurierte Druckerprofil existiert nicht mehr**. Eine Station zur Objektträgerverteilung meldet **Diese Station ist nicht für den Druck von Objektträgeretiketten eingerichtet.** | Die Station hat kein Druckerprofil, oder ihr Profil wurde gelöscht. | Öffnen Sie die Station und wählen Sie ein Druckerprofil, das noch existiert. | [Scanstationen](#screen-scan_stations), [Druckerprofile](#screen-printer_profiles) |
| Ein Fenster zur Objektträgerverteilung oder zu einem Scan-Batch meldet **Es sind keine Objektträgerscanner eingerichtet** (der Text nennt Konfiguration, Geräte, Art „Objektträgerscanner“). | Es gibt keinen Geräteeintrag der Art Objektträgerscanner. | Fügen Sie die Scanner hinzu. | [Geräte](#screen-equipment) |
| Ein Etikett wird nicht gedruckt, und die Meldung lautet **Keine GS1-GTIN konfiguriert. Legen Sie in den Druckeinstellungen eine fest, bevor Sie ein GS1-Kassettenetikett drucken** (oder Objektträgeretikett). | Für die Einrichtung ist keine GS1-GTIN eingetragen. | Tragen Sie die GTIN in den Druckeinstellungen ein. | [Druckeinstellungen](#screen-print_settings) |
| Das Dashboard Facility Ops meldet **Es sind noch keine Anzeigeprofile konfiguriert**. | Es existiert kein Anzeigeprofil. | Fügen Sie unter Anzeigeprofile eines hinzu. | [Anzeigeprofile](#screen-display_profiles) |
| Das OP-Dashboard meldet **Noch keine Terminals konfiguriert**. | Es existiert kein Terminal für den OP-Saal. | Fügen Sie die Terminals hinzu. | [OP-Saal-Terminals](#screen-or_suite_terminals) |
| Im Fenster der Weiterleitungsregel: **Keine aktiven Pools. Aktivieren Sie zuerst „Pool / Arbeitsgruppe“ bei einer Subspezialität.** | Keine Subspezialität befindet sich im Modus Pool / Arbeitsgruppe. | Schalten Sie Pool / Arbeitsgruppe für mindestens eine Subspezialität ein und fügen Sie dann die Regel hinzu. | [Subspezialitäten](#screen-subspecialties), [Weiterleitungsregeln](#screen-routing_rules) |
| Im Fenster für einen neuen Behälter: **Derzeit ist keine Einrichtung mit der Rolle „Referenzlabor“ konfiguriert.** | Keine Einrichtung hat die Rolle Referenzlabor. | Weisen Sie einer Einrichtung diese Rolle in ihren Einrichtungseinstellungen zu. | [Einrichtungsverzeichnis](#screen-facility-dictionary) |
| Ein Benutzer, der sichere E-Mail versucht, sieht **Für Ihr Labor ist kein sicheres Nachrichten-Gateway eingerichtet.** | Die Einrichtung hat kein Gateway unter ihrem Tab Sichere Nachrichten. | Fügen Sie in den Einstellungen der Einrichtung ein Gateway hinzu. | [Einrichtungsverzeichnis](#screen-facility-dictionary) |
| Die Liste **Hinzufügen** der Service-Level je Kunde ist leer, mit dem Hinweis, dass jeder Kunde bereits ein Service-Level hat oder keine Kunden eingerichtet sind. | Jede Einrichtung hat bereits ein Service-Level, oder es existieren keine Einrichtungen von Kunden. | Fügen Sie zuerst die Einrichtungen hinzu oder bearbeiten Sie das vorhandene Service-Level. | [Einrichtungskonfiguration](#screen-clients), [Service-Level je Kunde](#screen-client_sla) |

### Abgelehnte Speichervorgänge, ausgegraute Schaltflächen und Bildschirme, die sich nicht öffnen lassen {#ch9-matrix-permissions}

PathScribe prüft Berechtigungen zweimal. Der Bildschirm graut eine Aktion aus, die die Person nicht ausführen darf. Der Dienst hinter der Aktion prüft erneut und lehnt sie ab. In der Produktion wiederholt der API-Server die Prüfung und hat das letzte Wort. Für keine Rolle gibt es eine Umgehung, auch nicht für Superadmin.

| Symptom | Wahrscheinliche Ursache | Behebung | Bildschirm |
|---|---|---|---|
| Eine Schaltfläche ist ausgegraut. Ihr Tooltip lautet **Ihre Rollen enthalten „<capability>“ nicht.** | Keine der Rollen der Person enthält diese Berechtigung. | Fügen Sie die Berechtigung einer Rolle hinzu, die die Person hat. Berechtigungen sind im Rollenverzeichnis nach Bereichen gruppiert. | [Rollen](#screen-staff-roles), [Mitarbeiter](#screen-staff-members) |
| Der Tooltip lautet **„<capability>“ erfordert außerdem „<other>“, das Ihre Rollen nicht enthalten.** | Die Berechtigung setzt eine weitere Berechtigung voraus (ihre `requires`-Liste im Katalog). | Erteilen Sie beide. Ein Speichern der Rolle wird mit „a capability is missing one it needs“ abgelehnt, bis auch die erforderliche Berechtigung erteilt ist. | [Rollen](#screen-staff-roles) |
| Der Tooltip lautet **„<capability>“ ist hier nicht verfügbar: Ihre Einrichtungszuordnung deckt dies nicht ab.** | Die Person hat die Berechtigung, aber die Aktion betrifft eine Einrichtung außerhalb ihrer zugewiesenen Einrichtungen (oder umfasst alle Einrichtungen). | Ändern Sie die Einrichtungszuordnung der Person. | [Mitarbeiter](#screen-staff-members) |
| Ein Speichern in der Konfiguration schlägt fehl mit **Nicht gespeichert: Dafür ist die Berechtigung „<permission>“ nötig. Ein Administrator kann sie unter Konfiguration → Personal → Rollenverzeichnis erteilen.** | Der Person fehlt die Berechtigung `config:...:manage` für diesen Bildschirm (Code `CONFIG_NOT_PERMITTED`). | Erteilen Sie die genannte Berechtigung der Rolle der Person. | [Rollen](#screen-staff-roles) |
| Ein Speichern der Rolle schlägt fehl: **Nicht gespeichert: Danach könnte keine Rolle mehr Rollen verwalten.** | Die Änderung ließe keine zuweisbare Rolle mit `config:roles:manage` übrig. | Vergeben Sie zuerst **Rollen verwalten** an eine andere zuweisbare Rolle und speichern Sie dann. | [Rollen](#screen-staff-roles) |
| Ein Speichern einer Rolle oder eines Mitarbeiters schlägt fehl mit **Das Ändern der Diskrepanzregeln und das Freigeben der KI-Anweisungen sind getrennte Aufgaben**. | Eine Person (oder eine Rolle) darf nicht zugleich `config:clinical-mismatch-rules:manage` und `config:ai-prompt:approve` haben (Code `SEPARATION_OF_DUTIES`). | Verteilen Sie die beiden Berechtigungen auf zwei Rollen, die verschiedene Personen haben. | [Rollen](#screen-staff-roles), [Mitarbeiter](#screen-staff-members) |
| Ein Speichern der Rolle schlägt fehl mit **Diese Rolle wird von ForMedrixAI verwaltet**. | Die Rolle Superadmin kann in einem Krankenhaus nicht geändert werden. | Keine. Verwenden Sie eine andere Rolle. | [Rollen](#screen-staff-roles) |
| Ein Benutzer öffnet einen Bildschirm und sieht **Sie haben keinen Zugriff auf diesen Bildschirm**; nach der Anmeldung meldet die Startseite **Keine Ihrer Rollen gibt Ihnen bisher Zugriff auf einen Bildschirm.** | Der Rolle fehlt die Berechtigung `screen:<name>:open`, daher zeigt die Startseite keine Kachel, und die Route lehnt die Adresse ab. | Fügen Sie der Rolle die Bildschirmberechtigung hinzu. | [Rollen](#screen-staff-roles) |
| Eine Person kann ihre eigene Bearbeitung nicht freigeben: **Sie haben diesen Text bearbeitet und können ihn daher nicht freigeben.** | Die Selbstfreigabe wird für KI-Anweisungen abgelehnt (Code `SELF_APPROVAL`). | Lassen Sie eine andere Person mit `config:ai-prompt:approve` die Freigabe vornehmen. | [KI-Anweisungen](#screen-ai_instructions) |
| Eine Export-Schaltfläche tut nichts, oder der Export-Bildschirm zeigt **Sie haben keine Berechtigung, diesen Bericht zu exportieren.** | Jeder Export hat eine eigene Berechtigung (zum Beispiel `audit:audit-log:export`), und der Server prüft sie beim Herunterladen erneut. | Erteilen Sie die Export-Berechtigung, die der Tooltip der Schaltfläche nennt. | [Rollen](#screen-staff-roles), [Meine Exporte](#screen-my-exports) |

### Etiketten und Berichte, die nicht gedruckt werden {#ch9-matrix-print}

| Symptom | Wahrscheinliche Ursache | Behebung | Bildschirm |
|---|---|---|---|
| Ein Etikett geht an das Druckfenster des Browsers, und die Meldung lautet **Der Etikettendrucker ist nicht verbunden, daher wurde dieses Etikett an das Druckfenster des Browsers gesendet. Prüfen Sie, ob QZ Tray auf diesem Computer läuft.** | Der Dienst QZ Tray läuft auf diesem Computer nicht oder ist nicht erreichbar. | Starten Sie QZ Tray auf dem Computer und drucken Sie erneut. | [Druckerprofile](#screen-printer_profiles), [Druckeinstellungen](#screen-print_settings) |
| **Etikett <id> wurde nicht gedruckt: <printer> hat keine Etiketten mehr / Das Farbband von <printer> ist leer / Der Druckkopf von <printer> ist geöffnet / <printer> ist nicht erreichbar.** | Der Drucker hat diesen Zustand gemeldet (Codes `PAPER_OUT`, `RIBBON_OUT`, `HEAD_OPEN`, `PRINTER_UNREACHABLE`). | Beheben Sie das Problem am Drucker und wiederholen Sie dann das Etikett. Ein Etikett wird nie von selbst wiederholt, daher kann es nicht doppelt gedruckt werden. | [Druckwarteschlange](#screen-audit-interfaces) |
| **...wurde nicht gedruckt: <printer> hat das Etikettenlayout abgelehnt** oder **der Barcode hat die GS1-Validierung nicht bestanden. Dies ist ein PathScribe-Problem; bitte melden Sie es.** | Der Inhalt des Etiketts wurde abgelehnt (`MALFORMED_ZPL`, `INVALID_GS1`). Eine Wiederholung hilft nicht. | Melden Sie es dem Support von ForMedrixAI mit der Uhrzeit und dem Layout des Etiketts. | [Etikettendesigner](#screen-label_designer) |
| Ein Druckauftrag für einen Befund ist **Fehlgeschlagen** mit „Network printing needs the PathScribe site agent.“ | Ein Befund wurde aus einem Browser an einen Netzwerkdrucker gesendet, den dieser nicht erreichen kann (`NEEDS_SITE_AGENT`). | Leiten Sie den Druck des Labors über einen Drucker des Standortagenten. | [Standortagenten](#screen-site_agents), [Druckziel-Weiterleitungsregeln](#screen-print_routing_rules) |
| Das Drucken „funktioniert“, aber in der Demonstration kommt nichts heraus. | Die Demonstration zeichnet Drucke auf, statt sie zu senden. | Lesen Sie das Protokoll simulierter Drucke. | [Protokoll simulierter Drucke](#screen-simulated_print) |

### Schnittstellennachrichten, die hängen {#ch9-matrix-interfaces}

| Symptom | Wahrscheinliche Ursache | Behebung | Bildschirm |
|---|---|---|---|
| Eine Nachricht erscheint in **Ausgehende Interface-DLQ** mit dem Fehler **Übermittlung abgelehnt**, **Übermittlungs-Timeout** oder **Engine nicht erreichbar**. | Die Schnittstellen-Engine hat kein 2xx zurückgegeben (`DISPATCH_REJECTED`, `DISPATCH_TIMEOUT`, `DISPATCH_UNREACHABLE`). Die Nachricht wird für eine Wiederholung aufbewahrt. | Prüfen Sie die Engine im Untertab **Engines**. Ist sie fehlerfrei, wählen Sie **Übermittlung erneut versuchen** (erfordert `interface:outbound:resend`). | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) |
| Die Wiederholung antwortet **In der Ausgangswarteschlange angehalten: dort zuerst freigeben.** | Die Nachricht ist in der Ausgangswarteschlange angehalten. | Geben Sie sie auf diesem Bildschirm frei und senden Sie sie dann erneut. | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) |
| Die Wiederholung antwortet **Zurückgehalten: Das Befund-PDF ist noch nicht verfügbar.** | Das Befunddokument ist noch nicht erstellt. | Warten Sie. Es wird bei einer späteren Wiederholung mit dem PDF gesendet. | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) |
| Eine Leistung ist in der **Ausgehenden DLQ** (Abrechnung) mit **ICD-10-Code fehlt** oder **NPI des Leistungserbringers fehlt**. | Die Leistung kann ohne den Code oder die NPI nicht erstellt werden (`MISSING_ICD10`, `MISSING_PROVIDER_NPI`). | Tragen Sie den Wert in der Zeile ein; die Zeile hat für beide ein Eingabefeld. | [Systemprotokolle: Abrechnung](#screen-audit-financial) |
| Ein Auftrag unter **Serveraufträge** lässt sich nicht erneut einreihen: **Senden Sie diesen Auftrag unter „Schnittstellen“ erneut.** | Schnittstellen- und Druckaufträge werden von ihren eigenen Bildschirmen aus erneut gesendet (`WRONG_SCREEN`). | Verwenden Sie die Schnittstellen- oder Druckwarteschlange, mit `interface:outbound:resend` oder `print:job:retry`. | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) |
| Ein erneutes Einreihen antwortet **Dieser Auftrag ist nicht mehr fehlgeschlagen; er wurde vielleicht bereits erneut eingereiht.** | Jemand hat ihn bereits erneut eingereiht (`NOT_DEAD_LETTERED`). | Aktualisieren Sie. Keine Aktion. | [Systemprotokolle](#screen-audit-log) |
| Ausstehende Schnittstellenausnahmen (ein Zähler am Tab **Schnittstellenprotokoll**). | Eingehende Nachrichten, die keinem Patienten oder Fall zugeordnet werden konnten, warten auf eine Person. | Öffnen Sie den Untertab **Schnittstellenausnahmen** und prüfen Sie jede einzeln. | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) |

### Die Anmeldung schlägt fehl {#ch9-matrix-signin}

| Symptom | Wahrscheinliche Ursache | Behebung | Bildschirm |
|---|---|---|---|
| **E-Mail-Adresse oder Passwort falsch**, danach **Ein weiterer Fehlversuch sperrt die Anmeldung für diese E-Mail-Adresse für 15 Minuten.** | Die Anmeldung mit Passwort sperrt eine E-Mail-Adresse nach 5 aufeinanderfolgenden Fehlversuchen für 15 Minuten. Die Zählung gilt je eingegebener E-Mail-Adresse, gleich ob die Adresse zu einem Konto gehört. | Warten Sie 15 Minuten oder legen Sie für die Person ein neues Passwort fest: Das Festlegen eines Passworts hebt die Sperre auf. Das Prüfprotokoll enthält **Sign-in failed**, **Sign-in locked** und **Sign-in refused**. | [Mitarbeiter](#screen-staff-members) |
| **Bitten Sie Ihren Administrator, Ihr Passwort im Bildschirm „Personal“ zurückzusetzen.** | Die Person hat das Passwort vergessen. Das Anmeldeformular bietet kein Zurücksetzen durch die Person selbst. | Legen Sie im Datensatz der Person ein temporäres Passwort fest. Die Person muss bei der nächsten Anmeldung ein eigenes wählen. | [Mitarbeiter](#screen-staff-members) |
| Single Sign-On: **Sie haben sich angemeldet, aber für Sie gibt es kein aktives PathScribe-Konto.** | Es passt kein Mitarbeiterdatensatz (`not_provisioned`). | Fügen Sie die Person als Mitarbeiter hinzu. Das erste Single Sign-On verknüpft über die E-Mail-Adresse. | [Mitarbeiter](#screen-staff-members) |
| Single Sign-On: **Ihr PathScribe-Konto ist inaktiv.** | Der Mitarbeiterdatensatz ist inaktiv. | Aktivieren Sie ihn wieder. | [Mitarbeiter](#screen-staff-members) |
| Single Sign-On: **Mehr als ein PathScribe-Konto passt zu dieser Anmeldung.** | Zwei Mitarbeiterdatensätze haben dieselbe E-Mail-Adresse (`ambiguous`). | Entfernen Sie das Duplikat. | [Mitarbeiter](#screen-staff-members) |
| Single Sign-On: **Dieses PathScribe-Konto ist bereits mit einem anderen Anmeldekonto verknüpft.** | Ein neu zugewiesenes Postfach: Der Datensatz ist mit einer anderen Identität beim selben Anbieter verknüpft (`already_linked`). | Heben Sie die Verknüpfung des alten Kontos im Datensatz der Person auf und melden Sie sich dann erneut an. | [Mitarbeiter](#screen-staff-members) |
| Single Sign-On: **Ihr PathScribe-Konto umfasst keinen Zugriff auf diese Anwendung.** | Die Rollen der Person enthalten weder Zugriff auf Fälle noch Zugriff auf die Konfiguration (`no_app_access`). | Geben Sie der Person eine Rolle mit Zugriff. | [Rollen](#screen-staff-roles) |
| Single Sign-On: **Ihre Organisation verlangt einen zweiten Faktor, und der Anmeldedienst hat keinen gemeldet.** | Der Identitätsanbieter hat keinen zweiten Faktor gemeldet (`mfa_required`). | Schließen Sie den zweiten Faktor beim Identitätsanbieter ab. | [Sitzungssicherheit](#screen-session_security) |
| **Die Anmeldung ist für diese Installation nicht eingerichtet. Wenden Sie sich an Ihren Systemadministrator.** | Für die Version ist keine Anmeldung konfiguriert. | Korrigieren Sie `config.json` (siehe die Codes für den Start unten). | [Konfigurationscodes für den Start](#ch9-codes-config) |
| Eine ganzseitige Meldung **PathScribe kann nicht starten: die Konfiguration muss korrigiert werden** mit einer Liste von Codes. | `config.json` enthält eine Einstellung, die das Produkt ablehnt. PathScribe startet mit falschen Einstellungen nicht. | Korrigieren Sie `config.json` auf dem Webserver und laden Sie neu. Jeder Code steht im Index. | [Konfigurationscodes für den Start](#ch9-codes-config) |
| Codes für den zweiten Faktor: **Dieser Code wurde bereits verwendet. Warten Sie auf den nächsten.** oder **Zu viele Versuche. Codes für den zweiten Faktor sind bis <time> gesperrt.** | Der Code wurde erneut verwendet, oder es wurden zu viele falsche Codes eingegeben. | Warten Sie auf den nächsten Code oder bis zum Ende der Sperre. | [Sitzungssicherheit](#screen-session_security) |
| **Dieses Konto ist bereits in einem anderen Tab oder Fenster dieses Browsers angemeldet.** | PathScribe erlaubt je Konto und Browser eine aktive Sitzung. | Fahren Sie fort, um die andere Sitzung abzumelden (ihre ungespeicherte Arbeit bleibt erhalten und wird zur Prüfung angeboten). | [Sitzungssicherheit](#screen-session_security) |

### Eine Schnittstellennachricht oder ein Bildschirm hängt anscheinend {#ch9-matrix-stuck}

| Symptom | Wahrscheinliche Ursache | Behebung | Bildschirm |
|---|---|---|---|
| Ein Bildschirm meldet **Der PathScribe-Server ist nicht erreichbar. Versuchen Sie es gleich noch einmal.** | Der Browser konnte den API-Server nicht erreichen, oder dieser antwortete mit einem Serverfehler (`UNAVAILABLE`) oder innerhalb von 30 Sekunden nicht (`TIMED_OUT`). | Prüfen Sie den Netzwerkweg und den Zustand des API-Servers. Der Bildschirm wiederholt den Versuch, wo er es angibt (zum Beispiel das Engine-Panel jede Minute). | [Systemprotokolle](#screen-audit-log) |
| **Ihre Sitzung ist beendet. Melden Sie sich erneut an.** | Der Server hat 401 zurückgegeben (`SIGNED_OUT`). | Melden Sie sich erneut an. | [Sitzungssicherheit](#screen-session_security) |
| **Das wurde bereits erledigt. Aktualisieren und erneut ansehen.** oder ein Speichern, das einen Konflikt meldet. | Jemand anderes hat denselben Datensatz geändert (`CONFLICT`). | Aktualisieren Sie den Bildschirm und führen Sie die Änderung erneut aus. | [Systemprotokolle](#screen-audit-log) |
| Ein Export bleibt **Wird vorbereitet** oder endet mit **Der Export hat zu lange gedauert und wurde abgebrochen.** | Ein Build wird nach 30 Minuten abgebrochen (`TIMED_OUT`). | Schränken Sie die Filter ein und exportieren Sie erneut. | [Meine Exporte](#screen-my-exports) |
| **Es werden bereits 3 Exporte für Sie vorbereitet.** | Ein Benutzer darf 3 offene Exporte haben (`TOO_MANY_OPEN`). | Warten Sie, bis einer fertig ist, oder brechen Sie einen ab. | [Meine Exporte](#screen-my-exports) |

## Index der Systemfehlercodes {#ch9-error-codes}
Breadcrumb: Startseite > Administratorhandbuch > Anhänge > Index der Systemfehlercodes

**Status:** Umgesetzt

**Was dieser Index abdeckt.** Die Codes in Großbuchstaben im Quellcode, die ein Administrator auf einem Bildschirm sehen, im Fehlerprotokoll lesen oder in einem Vertrag finden kann. Jede Zeile nennt den Bildschirm, auf dem der Code erscheint, was er bedeutet und was zu tun ist. Der in der zweiten Spalte genannte Vertrag liegt in `docs/architecture/`; wo kein Vertrag einen Code aufführt, nennt die Zeile stattdessen die Dienstdatei.

**Wie Codes auf einen Bildschirm gelangen.** Der API-Client gibt jedem fehlgeschlagenen Aufruf einen kurzen festen Code und verwendet nie den Meldungstext des Servers, weil dieser Text einen Patienten nennen könnte. Ein Code des Servers wird verwendet, wenn er aus Großbuchstaben, Ziffern und Unterstrichen besteht, 2 bis 40 Zeichen lang ist und mit einem Buchstaben beginnt. Andernfalls ergibt sich der Code aus dem HTTP-Status.

| Status | Code |
|---|---|
| 401 | `SIGNED_OUT` |
| 403 | `NOT_PERMITTED` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 400, 422 | `INVALID` |
| 429 | `TOO_MANY_REQUESTS` |
| alles andere | `UNAVAILABLE` |

Es gibt auch Gründe in Kleinbuchstaben (zum Beispiel die Anmeldegründe `not_provisioned` und `inactive` sowie die Gründe des Servers `capability_refused`, `support_access_disabled` und `support_access_not_approved`). Sie sind keine Codes in Großbuchstaben, daher stehen sie in der Matrix oben und im Bildschirm [Support-Zugriff](#screen-support_access), nicht in diesem Index.

### Codes, die jeder Bildschirm mit Serveranbindung anzeigen kann {#ch9-codes-http}

| Fehlercode | Wo er erscheint | Bedeutung | Was zu tun ist |
|---|---|---|---|
| `SIGNED_OUT` | Jeder Bildschirm, der den API-Server aufruft. Vertrag: `HTTP_SERVICES_PATTERN.md` Abschnitt 4; `src/services/apiServer/apiHttpClient.ts`. | Der Server hat 401 geantwortet: Die Anmeldung ist beendet, oder das Token wurde nicht angenommen. | Melden Sie sich erneut an. Kehrt der Code direkt nach der Anmeldung zurück, informieren Sie den Support von ForMedrixAI. |
| `NOT_PERMITTED` | Jeder Bildschirm mit Serveranbindung. Vertrag: `HTTP_SERVICES_PATTERN.md`; `AUTHORIZATION_API.md`. | Der Server hat 403 geantwortet: Die Berechtigung fehlt oder liegt außerhalb der Einrichtungen der Person. | Siehe die Zeilen der Matrix zu ausgegrauten Schaltflächen. Suchen Sie in [Systemprotokolle](#screen-audit-log) nach **Capability refused**. |
| `NOT_FOUND` | Jeder Bildschirm mit Serveranbindung. Vertrag: `HTTP_SERVICES_PATTERN.md`. | Der Datensatz existiert nicht mehr, zum Beispiel weil jemand anderes ihn gelöscht oder stillgelegt hat. | Aktualisieren Sie und öffnen Sie ihn erneut. |
| `CONFLICT` | Jeder Bildschirm mit einem versionierten Speichern. Vertrag: `HTTP_SERVICES_PATTERN.md` (versionierte Speichervorgänge). | Der Server hat 409 geantwortet: Der Datensatz hat sich seit dem Lesen geändert. Bei einem Fall gibt der Server zusätzlich die Version zurück, die er hält. | Aktualisieren Sie und führen Sie die Änderung erneut aus. |
| `INVALID` | Jedes Speichern mit Serveranbindung. Vertrag: `HTTP_SERVICES_PATTERN.md`. | Der Server hat 400 oder 422 geantwortet: Er hat die Werte abgelehnt. | Prüfen Sie die Eingaben im Formular und speichern Sie erneut. |
| `TOO_MANY_REQUESTS` | Jeder Bildschirm mit Serveranbindung. Vertrag: `HTTP_SERVICES_PATTERN.md`; `STAFF_ADMIN_API.md`. | Der Server hat 429 geantwortet: Ein Ratenlimit wurde erreicht. | Warten Sie einen Moment und versuchen Sie es erneut. Wiederholte Fälle gehen an den Support von ForMedrixAI. |
| `TIMED_OUT` | Jeder Bildschirm mit Serveranbindung; die Liste der Exporte. Vertrag: `HTTP_SERVICES_PATTERN.md`; `ASYNC_EXPORT_API.md` Abschnitt 4. | Der Aufruf hatte innerhalb von 30 Sekunden keine Antwort (der Standard des Clients). Bei einem Export-Build wurde der Build nach 30 Minuten abgebrochen. | Wiederholen Sie den Vorgang. Schränken Sie bei einem Export die Filter ein. |
| `UNAVAILABLE` | Jeder Bildschirm mit Serveranbindung, zum Beispiel die Liste der Arbeitsplätze, die Liste der Standortagenten, das Engine-Panel und Serveraufträge. Vertrag: `HTTP_SERVICES_PATTERN.md`. | Der Server war nicht erreichbar, antwortete mit einem anderen Status oder sendete eine Antwort, die kein JSON-Objekt war. | Prüfen Sie das Netzwerk und den API-Server. Wiederholen Sie den Vorgang. |
| `NOT_SUPPORTED` | Eine Aktion, die nur in der Demonstration existiert, in einer Server-Version. Vertrag: `HTTP_SERVICES_PATTERN.md`; `src/services/apiServer/httpServiceExtras.ts`. | Die Methode existiert nur für die Demonstration (Erzeugen von Demodaten). Die Server-Version führt keinen Aufruf aus. | Nichts. Bei einer Server-Version zu erwarten. |
### Ablehnungen von Berechtigungen und Freigaben {#ch9-codes-permission}

| Fehlercode | Wo er erscheint | Bedeutung | Was zu tun ist |
|---|---|---|---|
| `CONFIG_NOT_PERMITTED` | Jedes Speichern in der Konfiguration. Vertrag: `AUTHORIZATION_API.md`; `src/services/authorization/guardConfigWrites.ts`. | Den Rollen der Person fehlt die Berechtigung für diesen Bildschirm, daher wurde nichts gespeichert. Die Seite Konfiguration zeigt den Namen der Berechtigung. | Erteilen Sie die Berechtigung unter [Rollen](#screen-staff-roles). |
| `EXPORT_NOT_PERMITTED` | Export der Fallsuche und Export des Fallberichts. Vertrag: `CASE_SEARCH_API.md`; `AUTHORIZATION_API.md` (Exporte). | Die Export-Berechtigung (`search:case-results:export` oder `search:case-report:export`) fehlt. Es werden keine Zeilen zurückgegeben. | Erteilen Sie die Berechtigung. |
| `SEPARATION_OF_DUTIES` | Speichern einer Rolle und Speichern eines Mitarbeiters. Vertrag: `AUTHORIZATION_API.md` (Funktionstrennung). | Eine Rolle oder eine Person hätte sowohl `config:clinical-mismatch-rules:manage` als auch `config:ai-prompt:approve`. | Weisen Sie die beiden Berechtigungen getrennten Rollen zu, die verschiedene Personen haben. |
| `SELF_APPROVAL` | KI-Anweisungen. Vertrag: `AUTHORIZATION_API.md`; [KI-Anweisungen](#screen-ai_instructions). | Die Person hat den ausstehenden Text bearbeitet und kann ihn daher nicht freigeben. | Lassen Sie eine andere Person mit `config:ai-prompt:approve` die Freigabe vornehmen. |
| `AI_VENDOR_NOT_ALLOWED` | Jede KI-Funktion. Vertrag: `AI_PROXY.md`; `src/services/aiIntegration/aiCallPolicy.ts`. | Die KI-Anbieterrichtlinie lehnt den Dienst oder die Region für den Rechtsraum ab. Der Aufruf wird nicht gesendet und als `AI_CALL_REFUSED` protokolliert. Die Funktion arbeitet ohne KI weiter und meldet „KI ist für diese Rechtsordnung nicht verfügbar.“ | Ändern Sie die Regel oder die Hosting-Region im Tab [KI-Verhalten](#screen-tab-ai), sofern die Richtlinie des Labors dies erlaubt. |

### Exporte {#ch9-codes-exports}

| Fehlercode | Wo er erscheint | Bedeutung | Was zu tun ist |
|---|---|---|---|
| `INVALID_PARAMETERS` | [Meine Exporte](#screen-my-exports). Vertrag: `ASYNC_EXPORT_API.md` Abschnitt 3. | Der Server konnte die Filter nicht verwenden. | Ändern Sie die Filter und exportieren Sie erneut. |
| `TOO_MANY_ROWS` | [Meine Exporte](#screen-my-exports). Vertrag: `ASYNC_EXPORT_API.md`. | Mehr als 1.000.000 Zeilen passten. | Schränken Sie die Filter ein. |
| `TOO_MANY_OPEN` | [Meine Exporte](#screen-my-exports). Vertrag: `ASYNC_EXPORT_API.md`. | Die Person hat bereits 3 Exporte in der Warteschlange oder in Bearbeitung. | Warten Sie oder brechen Sie einen ab. |
| `BUILD_FAILED` | [Meine Exporte](#screen-my-exports). Quelle: `src/services/exports/asyncExportContract.ts`. | Der Server konnte die Datei nicht erstellen. Ein Build erhält 2 Versuche. | Versuchen Sie es erneut. Schlägt es wieder fehl, informieren Sie den Support von ForMedrixAI. |
| `CANCELLED` | [Meine Exporte](#screen-my-exports). Quelle: `src/i18n/locales/en.json` (`exports.problem`). | Der Export wurde abgebrochen. | Exportieren Sie erneut, wenn er noch benötigt wird. |
| `EXPIRED` | [Meine Exporte](#screen-my-exports); der Standortagent. Vertrag: `ASYNC_EXPORT_API.md`; `SITE_AGENT_API.md` Abschnitt 6. | Bei einem Export: Die Datei wurde nach ihrer Aufbewahrungsdauer gelöscht (standardmäßig 7 Tage, 1 bis 30 vom Labor festgelegt). Bei einem Auftrag des Standortagenten: Er wurde nicht rechtzeitig gestartet und zurückgegeben. | Exportieren Sie erneut. Zu einem Auftrag siehe die Druckzeilen unten. |

### Konfiguration beim Start {#ch9-codes-config}

Diese erscheinen auf dem ganzseitigen Bildschirm **PathScribe kann nicht starten: die Konfiguration muss korrigiert werden**. PathScribe startet erst, wenn sie korrigiert sind. Die Einstellungen und die Regeln stehen in `RUNTIME_CONFIG.md` Abschnitt 3. Der Code ist `src/services/runtimeConfig/runtimeSettings.ts`.

| Fehlercode | Wo er erscheint | Bedeutung | Was zu tun ist |
|---|---|---|---|
| `UNREADABLE` | Startbildschirm. | `config.json` ist kein gültiges JSON. | Korrigieren Sie die Datei. |
| `NOT_AN_OBJECT` | Startbildschirm. | `config.json` muss eine Liste von Einstellungen und Werten sein (ein JSON-Objekt). | Korrigieren Sie die Datei. |
| `UNKNOWN_SETTING` | Startbildschirm. | Der Name gehört nicht zu den Einstellungen, die PathScribe kennt, oder ist ein Name, der nur für den Build gilt. | Prüfen Sie die Schreibweise anhand von `RUNTIME_CONFIG.md`. |
| `NOT_TEXT` | Startbildschirm. | Ein Wert muss Text, eine Zahl oder wahr oder falsch sein. | Korrigieren Sie den Wert. |
| `TOO_LONG` | Startbildschirm. | Ein Wert ist länger als 2.000 Zeichen. | Kürzen Sie ihn. |
| `INVALID_URL` | Startbildschirm. | Der Wert muss eine Webadresse oder ein Pfad auf dieser Website sein, der mit `/` beginnt und weder Benutzernamen noch Passwort enthält. | Korrigieren Sie die Adresse. |
| `NOT_HTTPS` | Startbildschirm. | Eine Adresse muss https verwenden. Einfaches http ist nur zu diesem Computer in einem Entwicklungs-Build erlaubt. | Verwenden Sie eine https-Adresse. |
| `NOT_THIS_SITE` | Startbildschirm. | Ein Proxy-Pfad führt zu einer anderen Website (zum Beispiel `//host`). | Verwenden Sie einen Pfad auf dieser Website oder eine https-Adresse. |
| `API_SERVER_REQUIRED` | Startbildschirm. | Ein Server-Build benötigt die Adresse des PathScribe-Servers, und es ist keine festgelegt. | Legen Sie die API-Adresse fest. |
| `SSO_REQUIRED` | Startbildschirm. | Ein Server-Build meldet nur über den Identitätsanbieter an, daher muss `VITE_AUTH_MODE` den Wert `sso` haben. | Legen Sie ihn und die Einstellungen des Anbieters fest. |
| `API_SERVER_IN_DEMO_BUILD` | Startbildschirm. | Ein Demonstrations-Build spricht nie mit einem echten Server. | Installieren Sie einen Server-Build. |
| `NOT_IN_DEMO_BUILD` | Startbildschirm. | Ein Demonstrations-Build kann keine Einstellung für Hub, Renderer, Schnittstellenempfänger oder Serveraufträge verwenden und ist nie Produktion. | Installieren Sie einen Server-Build. |
| `ADDRESS_NOT_FROM_SERVER` | Startbildschirm, gekennzeichnet mit „(aus /api/config des PathScribe-Servers)“. | Der Server darf keine Adresse festlegen, weil die Sicherheitsrichtlinie der Website aus `config.json` erstellt wird. | Tragen Sie die Adresse in `config.json` ein. |
| `NOT_FROM_SERVER` | Startbildschirm, gekennzeichnet mit „(aus /api/config des PathScribe-Servers)“. | Nur `config.json` oder der Build darf diese Einstellung festlegen (Anmeldung, die Rolle der Instanz, welche Aufträge der Server ausführt). | Verschieben Sie die Einstellung nach `config.json`. |

### Drucken, Etiketten und der Standortagent {#ch9-codes-print}

Die ersten sechs Codes haben einen eigenen Meldungstext. Der Vertrag für die Codes des Agenten ist `SITE_AGENT_API.md` Abschnitt 6; die Liste ist `AGENT_ERROR_CODES` in `src/services/siteAgent/siteAgentContract.ts`. Drucke von Befunden werden nach dem Zustellplan des Labors wiederholt (standardmäßig nach 1, 5 und 15 Minuten, bis zu 10 Wiederholungen). Etiketten werden nie von selbst wiederholt.

| Fehlercode | Wo er erscheint | Bedeutung | Was zu tun ist |
|---|---|---|---|
| `PRINTER_UNREACHABLE` | Etiketten-Meldung; Druckwarteschlange. Vertrag: `SITE_AGENT_API.md`. | Keine Verbindung zum Drucker. Bei Befunden wird wiederholt. | Prüfen Sie Stromversorgung und Netzwerk des Druckers und wiederholen Sie dann. |
| `PAPER_OUT` | Etiketten-Meldung; Druckwarteschlange. Vertrag: `SITE_AGENT_API.md`. | Dem Etikettendrucker gehen die Etiketten aus. | Legen Sie Etiketten ein und wiederholen Sie. |
| `RIBBON_OUT` | Etiketten-Meldung; Druckwarteschlange. Vertrag: `SITE_AGENT_API.md`. | Dem Etikettendrucker geht das Farbband aus. | Legen Sie ein Farbband ein und wiederholen Sie. |
| `HEAD_OPEN` | Etiketten-Meldung; Druckwarteschlange. Vertrag: `SITE_AGENT_API.md`. | Der Druckkopf ist geöffnet. | Schließen Sie ihn und wiederholen Sie. |
| `MALFORMED_ZPL` | Etiketten-Meldung. Vertrag: `SITE_AGENT_API.md`. | Der Drucker hat das Etikettenlayout abgelehnt. Keine Wiederholung. | Melden Sie es dem Support von ForMedrixAI. |
| `INVALID_GS1` | Etiketten-Meldung. Vertrag: `SITE_AGENT_API.md`. | Der Barcode des Etiketts hat die GS1-Validierung nicht bestanden. Keine Wiederholung. | Melden Sie es dem Support von ForMedrixAI. Prüfen Sie die GTIN in den [Druckeinstellungen](#screen-print_settings). |
| `NEEDS_SITE_AGENT` | [Druckwarteschlange](#screen-audit-interfaces). Vertrag: `SITE_AGENT_API.md`; `src/services/printing/printJobFailureReason.ts`. | Ein Browser kann nicht an einen Netzwerkdrucker senden. Der Auftrag schlägt sofort fehl und geht in die Ausnahmewarteschlange. | Verwenden Sie einen Drucker des Standortagenten. Siehe [Standortagenten](#screen-site_agents). |
| `PRINTER_OFFLINE` | [Druckwarteschlange](#screen-audit-interfaces). Quelle: `src/services/printing/attemptPrintDelivery.ts`. | QZ Tray ist auf dem Druckcomputer nicht verbunden. Es wird wiederholt. | Starten Sie QZ Tray. |
| `PRINT_REJECTED` | [Druckwarteschlange](#screen-audit-interfaces). Quelle: `attemptPrintDelivery.ts`, `redispatchPrintJob.ts`. | Ein Auftrag kann nicht gedruckt werden, zum Beispiel weil für die Zustellung über QZ Tray kein Drucker konfiguriert ist oder das Befunddokument nicht erstellt werden konnte. | Korrigieren Sie die Druckereinstellungen und wiederholen Sie dann. |
| `PRINTER_REJECTED` | Druckwarteschlange. Vertrag: `SITE_AGENT_API.md`. | Der Drucker hat den Auftrag abgelehnt. Keine Wiederholung. | Prüfen Sie die eigene Fehleranzeige des Druckers. |
| `DOCUMENT_UNAVAILABLE` | Druckwarteschlange. Vertrag: `SITE_AGENT_API.md`. | Der Download-Link des Agenten ist fehlgeschlagen oder abgelaufen. Es wird wiederholt. | Zunächst nichts. Bleibt es bestehen, informieren Sie den Support von ForMedrixAI. |
| `DOCUMENT_INTEGRITY` | Druckwarteschlange. Vertrag: `SITE_AGENT_API.md`. | Der SHA-256 der Datei stimmte nicht überein, daher wurde sie nie gedruckt. Keine Wiederholung. | Informieren Sie den Support von ForMedrixAI. |
| `UNKNOWN_DESTINATION` | Druckwarteschlange; Dateiablage. Vertrag: `SITE_AGENT_API.md`. | Der Agent hat keinen Drucker und keine Freigabe mit dieser Kennung (seine Konfiguration ist veraltet). | Aktualisieren Sie die Druckerliste des Agenten unter [Standortagenten](#screen-site_agents). |
| `SHARE_UNREACHABLE` | Zustellung in die Dateiablage. Vertrag: `SITE_AGENT_API.md`. | Die Freigabe war nicht erreichbar. Es wird wiederholt. | Prüfen Sie die Freigabe. |
| `SHARE_ACCESS_DENIED` | Zustellung in die Dateiablage. Vertrag: `SITE_AGENT_API.md`. | Der Agent darf nicht in die Freigabe schreiben. Keine Wiederholung. | Korrigieren Sie die Berechtigungen der Freigabe. |
| `SHARE_FULL` | Zustellung in die Dateiablage. Vertrag: `SITE_AGENT_API.md`. | Die Freigabe ist voll. Es wird wiederholt. | Schaffen Sie Speicherplatz. |
| `IN_DOUBT` | Druckwarteschlange. Vertrag: `SITE_AGENT_API.md`. | Der Agent wurde angehalten, nachdem er mit dem Senden begonnen hatte und bevor er das Ergebnis kannte. Er wird nie von selbst erneut gesendet. | Prüfen Sie den Drucker. Drucken Sie erneut, wenn die Seite nicht vorhanden ist. |
| `AGENT_ERROR` | Druckwarteschlange. Vertrag: `SITE_AGENT_API.md`. | Jeder andere Fehler des Agenten. Es wird wiederholt. | Prüfen Sie den Agenten unter [Standortagenten](#screen-site_agents). |

### Ausgehende Nachrichten, Leistungen, Register und Serveraufträge {#ch9-codes-outbound}

| Fehlercode | Wo er erscheint | Bedeutung | Was zu tun ist |
|---|---|---|---|
| `DISPATCH_REJECTED` | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) (angezeigt als „Übermittlung abgelehnt“). Vertrag: `INTERFACE_TRANSACTIONS.md`. | Die Engine hat kein 2xx zurückgegeben. Die Nachricht wird für eine Wiederholung aufbewahrt. | Prüfen Sie die Engine und wählen Sie dann **Übermittlung erneut versuchen**. |
| `DISPATCH_TIMEOUT` | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) (angezeigt als „Übermittlungs-Timeout“). Vertrag: `OUTBOUND_QUEUE_API.md`; `INTERFACE_TRANSACTIONS.md`. | Die Engine hat nicht rechtzeitig geantwortet. | Wie oben. |
| `DISPATCH_UNREACHABLE` | [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) (angezeigt als „Engine nicht erreichbar“). Vertrag: `INTERFACE_TRANSACTIONS.md`. | Die Engine war nicht erreichbar. | Wie oben. |
| `MISSING_ICD10` | [Systemprotokolle: Abrechnung](#screen-audit-financial). Vertrag: `DIAGNOSIS_CODING.md`; `src/services/billing/validateChargeMetadata.ts`. | Einer Leistung fehlt ein ICD-10-Code. | Tragen Sie den Code in der Zeile ein. |
| `MISSING_PROVIDER_NPI` | [Systemprotokolle: Abrechnung](#screen-audit-financial). Quelle: `validateChargeMetadata.ts`. | Einer Leistung fehlt die NPI des Leistungserbringers. | Tragen Sie die NPI in der Zeile ein. |
| `REGISTRY_NOT_READY` | Ausgangswarteschlange; Registerausnahmen. Vertrag: `BATCH_REGISTRY_FEED_API.md`; `REGISTRY_ACKNOWLEDGEMENT_API.md`. | Eine Meldung an ein Register ist zurückgehalten: Ein erforderliches Feld oder eine erforderliche Einstellung fehlt. | Vervollständigen Sie das fehlende Element, das der Eintrag nennt. |
| `REGISTRY_LIVE_NOT_APPROVED` | Ausgangswarteschlange; Registerausnahmen. Vertrag: `REGISTRY_GO_LIVE_API.md`. | Ein echter Fall wurde freigegeben, aber die Verbindung zum Register ist nicht für den Produktivbetrieb freigegeben. Der Eintrag zeigt „Zurückgehalten: Bestätigung erforderlich“. | Schließen Sie die Freigabe für den Produktivbetrieb im Einstellungsbildschirm des Registers ab. |
| `NOT_DEAD_LETTERED` | Serveraufträge. Vertrag: `MESSAGE_BUS_API.md`. | Der Auftrag ist nicht mehr fehlgeschlagen (409). | Aktualisieren Sie. |
| `WRONG_SCREEN` | Serveraufträge. Quelle: `src/services/serverJobs/serverJobsContract.ts`. | Schnittstellen- und Druckaufträge werden hier nicht erneut eingereiht. | Senden Sie sie aus der Schnittstellen- oder Druckwarteschlange erneut. |
| `CONSULT_LINK_NOT_ACTIVE` | Tab Konsil-Links. Vertrag: `CONSULT_ACCESS_API.md`. | Der Link ist bereits widerrufen oder abgelaufen. | Aktualisieren Sie. |
| `NO_RECIPIENTS` | Zeitpläne für Berichte. Vertrag: `SCHEDULED_REPORTS_API.md`. | Es ist kein aktiver Empfänger übrig. | Wählen Sie mindestens einen Empfänger. |
| `TOO_MANY_SCHEDULES` | Zeitpläne für Berichte. Vertrag: `SCHEDULED_REPORTS_API.md`. | Die Person hat die höchste zulässige Zahl an Zeitplänen. | Löschen oder vereinen Sie einen Zeitplan. |
| `RECIPIENT_ACCESS_UNKNOWN` | Zeitpläne für Berichte. Vertrag: `SCHEDULED_REPORTS_API.md`. | Es konnte nicht ermittelt werden, was ein Empfänger sehen darf, daher wurde nichts erstellt. | Prüfen Sie die Rollen und Einrichtungen des Empfängers. |
| `RUN_FAILED` | Zeitpläne für Berichte. Quelle: `src/services/scheduledReports/createScheduledReportService.ts`. | Ein geplanter Lauf ist fehlgeschlagen. | Sehen Sie im Fehlerprotokoll nach. |

### Konfigurationsbildschirme: Ablehnungen, die man kennen sollte {#ch9-codes-config-screens}

| Fehlercode | Wo er erscheint | Bedeutung | Was zu tun ist |
|---|---|---|---|
| `REASON_REQUIRED` | [Code-Import](#screen-code_import), Sperrungen von Arbeitsplätzen und Feeds sowie mehrere Fallaktionen. Quelle: der Dienst des jeweiligen Bildschirms. | Für die Änderung ist ein Grund erforderlich. | Geben Sie einen Grund ein. |
| `BAD_DATE` | [Codiersysteme](#screen-code_systems). Quelle: `src/services/coding/codeSystemPolicyRules.ts`. | Ein Datum ist kein echtes Kalenderdatum. | Korrigieren Sie es. |
| `BAD_ROLE` | [Codiersysteme](#screen-code_systems). Quelle: `codeSystemPolicyRules.ts`. | Eine Rolle in einer Regel ist nicht gültig. | Wählen Sie eine gültige Rolle. |
| `BAD_SYSTEM` | [Codiersysteme](#screen-code_systems). Quelle: `codeSystemPolicyRules.ts`. | Ein Codiersystem ist leer oder nicht gültig. | Wählen Sie ein Codiersystem. |
| `DUPLICATE` | [Codiersysteme](#screen-code_systems). Quelle: `codeSystemPolicyRules.ts`. | Dasselbe Codiersystem hat zwei Zeilen mit demselben Startdatum. | Entfernen Sie eine Zeile oder geben Sie ihr ein anderes Datum. |
| `NO_RULES` | [Codiersysteme](#screen-code_systems). Quelle: `codeSystemPolicyRules.ts`. | Es gibt keine Regeln. | Fügen Sie eine Regel hinzu oder setzen Sie auf den Standard zurück. |
| `TOO_MANY` | [Codiersysteme](#screen-code_systems). Quelle: `codeSystemPolicyRules.ts`. | Es gibt zu viele Regeln. | Entfernen Sie einige. |
| `SAME_PERSON` | [Code-Import](#screen-code_import). Quelle: `src/services/billing/codeEngine/planImportJob.ts`. | Die Person, die den Import hochgeladen hat, kann ihn nicht freigeben oder ablehnen (Vier-Augen-Prinzip). | Eine andere Person muss entscheiden. |
| `JOB_NOT_APPROVED` | [Code-Import](#screen-code_import). Quelle: `planImportJob.ts`. | Nur ein freigegebener Import kann zurückgenommen werden. | Keine. |
| `JOB_NOT_PENDING` | [Code-Import](#screen-code_import). Quelle: `planImportJob.ts`. | Der Import wartet nicht mehr auf Freigabe. | Aktualisieren Sie. |
| `MAPPING_INCOMPLETE` | [Code-Import](#screen-code_import). Quelle: `src/services/billing/mockCodeImportService.ts`. | Die Spalten für den Abrechnungscode, den CPT-Code und das Gültigkeitsdatum sind nicht alle zugeordnet. | Ordnen Sie sie zu oder geben Sie ein Gültigkeitsdatum für die ganze Datei an. |
| `NO_ROWS` | [Code-Import](#screen-code_import). Quelle: `mockCodeImportService.ts`. | Die Datei hat keine Zeilen, die importiert werden können. | Prüfen Sie die Datei. |
| `ROWS_REFUSED` | [Code-Import](#screen-code_import). Quelle: `mockCodeImportService.ts`. | Einige Zeilen können nicht importiert werden. | Korrigieren Sie sie oder wählen Sie, sie zu überspringen. |
| `ROW_MISSING` | [Code-Import](#screen-code_import). Quelle: `mockCodeImportService.ts`. | Eine Codeversion aus dem Import existiert nicht mehr und kann daher nicht freigegeben werden. | Laden Sie den Import erneut hoch. |
| `ROW_NOT_PENDING` | [Code-Import](#screen-code_import). Quelle: `mockCodeImportService.ts`. | Eine Codeversion aus dem Import ist nicht mehr ausstehend. | Laden Sie den Import erneut hoch. |
| `NAME_TAKEN` | [Arbeitsplätze](#screen-workstations), [Berichts-Feed](#screen-bi_feed). Quelle: `src/services/workstationRegistry/workstationRegistryRules.ts`; `src/services/biFeed/biFeedRules.ts`. | Ein anderer aktiver Arbeitsplatz der Einrichtung hat diesen Namen. | Wählen Sie einen anderen Namen. |
| `ALREADY_REVOKED` | [Arbeitsplätze](#screen-workstations), [Berichts-Feed](#screen-bi_feed). Quelle: dieselben beiden Dienste. | Der Arbeitsplatz ist bereits gesperrt. | Keine. |
| `REVOKE_REASON_INVALID` | [Arbeitsplätze](#screen-workstations), [Berichts-Feed](#screen-bi_feed). Quelle: dieselben beiden Dienste. | Ein Grund muss gewählt werden, bei Sonstiges mit einer Notiz. | Wählen Sie einen Grund. |
| `FEED_OFF` | [Berichts-Feed](#screen-bi_feed). Quelle: `src/services/biFeed/biFeedRules.ts`. | Der Feed ist ausgeschaltet. | Schalten Sie ihn in den Feed-Einstellungen ein. |
| `DATASET_NOT_IN_FEED` | [Berichts-Feed](#screen-bi_feed). Quelle: `biFeedRules.ts`. | Ein Datensatz wird vom Feed nicht angeboten. | Fügen Sie ihn zuerst in den Feed-Einstellungen hinzu. |
| `FACILITY_NOT_IN_FEED` | [Berichts-Feed](#screen-bi_feed). Quelle: `biFeedRules.ts`. | Eine Einrichtung wird vom Feed nicht angeboten. | Fügen Sie sie zuerst in den Feed-Einstellungen hinzu. |
| `IDENTIFIED_NOT_APPROVED` | [Berichts-Feed](#screen-bi_feed). Quelle: `biFeedRules.ts`. | Für identifizierende Token muss eine Freigabe vorliegen. | Erfassen Sie die Freigabe. |
| `NOT_HL7` | [LIS-Eingang (Assist-Modus)](#screen-assist_lis_polling). Quelle: `src/services/lisIngestion/adapters/hl7v2StatusAdapter.ts`. | Die Nachricht ist keine HL7-v2-Nachricht (sie muss mit einem MSH-Segment beginnen). | Prüfen Sie das sendende System. |
| `UNSUPPORTED_MESSAGE_TYPE` | [LIS-Eingang (Assist-Modus)](#screen-assist_lis_polling). Quelle: `hl7v2StatusAdapter.ts`. | Es werden nur Nachrichten ORU^R01, ORM^O01 und OML^O21 angenommen. | Senden Sie einen unterstützten Typ. |
| `MISSING_ACCESSION` | [LIS-Eingang (Assist-Modus)](#screen-assist_lis_polling). Quelle: `hl7v2StatusAdapter.ts`, `webhookJsonAdapter.ts`. | Die Nachricht hat keine Eingangsnummer. | Korrigieren Sie den Absender. |
| `MISSING_STATUS` | [LIS-Eingang (Assist-Modus)](#screen-assist_lis_polling). Quelle: `src/services/lisIngestion/types.ts`. | Die Nachricht hat keinen LIS-Status. | Korrigieren Sie den Absender. |
| `INVALID_JSON` | [LIS-Eingang (Assist-Modus)](#screen-assist_lis_polling). Quelle: `types.ts`. | Die Nachricht ist kein gültiges JSON. | Korrigieren Sie den Absender. |
| `CROSSWALK_DUPLICATE_STATUS` | [LIS-Eingang (Assist-Modus)](#screen-assist_lis_polling). Quelle: `src/services/assistPolling/mockAssistPollingService.ts`. | Ein LIS-Status ist doppelt zugeordnet. | Ordnen Sie jeden Status nur einmal zu. |
| `INTERVAL_OUT_OF_RANGE` | [LIS-Eingang (Assist-Modus)](#screen-assist_lis_polling). Quelle: `mockAssistPollingService.ts`. | Das Abfrageintervall liegt außerhalb der zulässigen ganzen Minuten. | Geben Sie einen Wert im angezeigten Bereich ein. |
| `NHS_NUMBER_CHECK_DIGIT` | [Britisches Krebsregister (COSD)](#screen-cosd_destination). Vertrag: `UK_COSD_API.md`. | Die NHS-Nummer besteht die Prüfung der Prüfziffer nicht. | Korrigieren Sie die Nummer im Fall. |
| `NHS_NUMBER_FORMAT` | [Britisches Krebsregister (COSD)](#screen-cosd_destination). Vertrag: `UK_COSD_API.md`. | Die NHS-Nummer hat nicht zehn Ziffern. | Korrigieren Sie sie. |
| `PATIENT_IDENTIFIER_MISSING` | [Britisches Krebsregister (COSD)](#screen-cosd_destination). Vertrag: `UK_COSD_API.md`. | Die NHS-Nummer fehlt. | Geben Sie sie ein. |
| `ICDO_MISSING` | [Britisches Krebsregister (COSD)](#screen-cosd_destination). Vertrag: `UK_COSD_API.md`. | Es gibt keinen ICD-O-3-Code. | Fügen Sie ihn dem Fall hinzu. |
| `ICDO_FORMAT` | [Britisches Krebsregister (COSD)](#screen-cosd_destination). Vertrag: `UK_COSD_API.md`. | Ein ICD-O-3-Code hat nicht die Form `8500/3`. | Korrigieren Sie ihn. |
| `DIAGNOSIS_DATE_MISSING` | [Britisches Krebsregister (COSD)](#screen-cosd_destination). Vertrag: `UK_COSD_API.md`. | Das Diagnosedatum fehlt. | Geben Sie es ein. |
| `XML_NOT_WELL_FORMED` | [Britisches Krebsregister (COSD)](#screen-cosd_destination); Hochladen von Protokollen. Vertrag: `UK_COSD_API.md`; Quelle: `protocolUploadValidation.ts`. | Die Vorschau oder die hochgeladene Datei ist kein wohlgeformtes XML. | Korrigieren Sie die Daten oder die Datei. |
| `UNSUPPORTED_FORMAT` | Hochladen von Protokollen in die Synoptik-Bibliothek ([Synoptik-Bibliothek](#screen-tab-protocols)). Quelle: `src/services/templates/protocolUploadValidation.ts`. | Der Dateityp wird nicht unterstützt. Verwenden Sie JSON, XML oder XLSX. | Konvertieren Sie die Datei. |
| `FILE_TOO_LARGE` | Hochladen von Protokollen. Quelle: `protocolUploadValidation.ts`. | Die Datei ist größer als 10 MB. | Verkleinern Sie sie. |
| `JSON_INVALID` | Hochladen von Protokollen. Quelle: `protocolUploadValidation.ts`. | Die Datei ist kein gültiges JSON. | Korrigieren Sie sie. |
| `JSON_NEWER_FORMAT` | Hochladen von Protokollen. Quelle: `protocolUploadValidation.ts`. | Die Datei wurde von einer neueren Version von PathScribe exportiert. | Aktualisieren Sie PathScribe oder exportieren Sie aus derselben Version. |
| `XML_NOT_SDC` | Hochladen von Protokollen. Quelle: `protocolUploadValidation.ts`. | Das XML ist kein Formular der CAP eCC (SDC). | Verwenden Sie die richtige Datei. |
| `NOT_IMPORTABLE` | Hochladen von Protokollen. Quelle: `protocolUploadValidation.ts`. | Das Format kann geprüft, aber noch nicht importiert werden. Der Import funktioniert für PathScribe-Protokolldateien (JSON). | Verwenden Sie eine JSON-Datei von PathScribe. |
| `XLSX_NOT_MAPPED` | Hochladen von Protokollen. Quelle: `protocolUploadValidation.ts`. | Die Blätter der Arbeitsmappe wurden nicht gelesen, daher wurden Spalten nicht Fragen zugeordnet. | Verwenden Sie ein unterstütztes Format. |
| `PRODUCTION_GATED` | [Smart Capture](#screen-smart_capture). Quelle: `src/services/smartCapture/smartCaptureStates.ts`. | Es ist eine echte Schnittstellen-Engine konfiguriert, und die Produktionsschranke ist geschlossen, daher wurde nichts gesendet. | Öffnen Sie die Produktionsschranke, wenn das Labor bereit ist. |
| `ALREADY_ACCESSIONED` | [Lockbox-Einwurf](#screen-lockbox-drop-off). Vertrag: `LOCKBOX_API.md`. | Die Quittung wurde bereits im Probeneingang erfasst (409). | Keine. |
| `PLACEHOLDER_UNRESOLVED` | [Lockbox-Einwurf](#screen-lockbox-drop-off). Vertrag: `LOCKBOX_API.md`. | Der Probeneingang wurde für einen Platzhalter ohne verknüpfte Auftragsnummer angefordert (409). | Verknüpfen Sie den Platzhalter zuerst mit seinem Auftrag. |
| `NOT_A_PLACEHOLDER` | [Lockbox-Einwurf](#screen-lockbox-drop-off). Vertrag: `LOCKBOX_API.md`. | Nur ein Platzhalter kann mit einem Auftrag verknüpft werden. | Keine. |

## Referenz der Systemprotokolle {#ch9-system-logs}
Breadcrumb: Startseite > Administratorhandbuch > Anhänge > Referenz der Systemprotokolle

**Status:** Umgesetzt

In den Systemprotokollen wird gelesen, was Personen, das System und die KI getan haben. Dieser Teil beschreibt den Bildschirm. Der nächste Teil ([Anleitung zur Prüfung des Prüfprotokolls](#ch9-audit-verification)) erklärt, wie Sie ihn nutzen, um die Fragen eines Auditors zu beantworten.

### Systemprotokolle {#screen-audit-log}
Breadcrumb: Startseite > Systemprotokolle

**Status:** Umgesetzt. Das Prüfprotokoll wird in der Demonstration im Browser gehalten; mit einem API-Server hält es der Server (siehe Bekannte Grenzen).

**1. Navigation:** Kachel **Systemprotokolle** der Startseite (Adresse `/audit`).
**2. Wartungspunkt:** Systemprotokolle (ein Referenzbildschirm; hier wird nichts eingerichtet).

**3. Geschäftlicher Zweck und Umfang.** Ein Bildschirm für die Compliance-Aufzeichnung des Labors: KI-Aktionen, Änderungen durch Benutzer, Systemereignisse, Fehler, Aktivitäten der Qualitätssicherung, Schnittstellen- und Druckaktivität, Fehler bei der Übermittlung von Abrechnungsdaten, kritische Warnmeldungen, externe Konsil-Links und die Hintergrundaufträge des API-Servers. Er ist schreibgeschützt, bis auf drei Aktionen: einen Fehler als **Beheben** zu markieren, eine fehlgeschlagene Schnittstellennachricht oder einen Druckauftrag erneut zu senden und einen Konsil-Link zu widerrufen. Jeder Tab ist eine andere Aufzeichnung, die ein anderer Dienst führt. Die Tabs Prüfprotokoll und Fehlerprotokoll sind hier beschrieben. Der Tab **Schnittstellenprotokoll** ist unter [Systemprotokolle: Schnittstellen](#screen-audit-interfaces) beschrieben und der Tab **Abrechnung** unter [Systemprotokolle: Abrechnung](#screen-audit-financial).

**4. Voraussetzungen und Abhängigkeiten.** Der Bildschirm zeigt nur, was geschehen ist, daher ist nichts vorab zu konfigurieren, außer wer ihn öffnen darf. Eine Person ohne `screen:audit-log:open` sieht keine Kachel auf der Startseite und, wenn sie die Adresse eingibt, die Meldung „Sie haben keinen Zugriff auf diesen Bildschirm“.

Setup step: Reference, not part of setup
Requires: [Rollen](#screen-staff-roles), [Mitarbeiter](#screen-staff-members)
Unlocks: Keine.

**5. Bildschirm.**

[SCREENSHOT PLACEHOLDER: screen-audit-log - Systemprotokolle, Tab Prüfprotokoll mit Typ-Schaltflächen, Filtern und CSV exportieren]

Die Kopfzeile der Seite lautet **Systemprotokolle** mit dem Untertitel „Vollständige Aufzeichnung von KI-Aktionen, Benutzeränderungen, Systemereignissen, Fehlern und Qualitätssicherungsaktivitäten“. Darunter folgen eine Tab-Leiste, ein Feld **Support-Referenz suchen** und dann der aktive Tab. Ein Zähler am Tab **Fehlerprotokoll** zeigt offene Fehler, am Tab **Schnittstellenprotokoll** die ausstehenden Schnittstellenausnahmen und am Tab **Qualitätssicherung** die offenen Qualitätspunkte. Eine Person mit der Rolle Pathologe sieht den Hinweis „Es wird nur Ihre eigene Fallaktivität angezeigt — Ereignisse aus Validierungsstudien sind für Pathologen nicht sichtbar“.

[SCREENSHOT PLACEHOLDER: screen-audit-log-errors - Systemprotokolle, Tab Fehlerprotokoll]

**6. Feldreferenz.** Der Bildschirm hat Filter, Spalten und Schaltflächen statt Formularfeldern. Die Zeilennamen beginnen mit dem Tab.

#### Tabs

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Tab: Prüfprotokoll | Tab | Nicht zutreffend | Jeder Prüfeintrag, den die Person sehen darf. Unten beschrieben. | Beim Öffnen ausgewählt |
| Tab: Fehlerprotokoll | Tab | Nicht zutreffend | Fehler, die das System mit einem Code aufgezeichnet hat. Unten beschrieben. | Nicht zutreffend |
| Tab: Schnittstellenprotokoll | Tab mit den Untertabs Schnittstellenausnahmen, Ausgehende Interface-DLQ, Ausgehende Sendungen, Druckwarteschlange, Engines | Nicht zutreffend | Siehe [Systemprotokolle: Schnittstellen](#screen-audit-interfaces). Die Adresse `?tab=interfaces` öffnet ihn. | Nicht zutreffend |
| Tab: Qualitätssicherung | Tab mit einer Gruppenauswahl | Nicht zutreffend | Acht Gruppen von Qualitätsaufzeichnungen: Mängel, Intraoperative Verknüpfung, Diskrepanz & Abgleich, Gegenzeichnungsdauer, Qualifikationsprüfung, Abweichung nach Finalisierung, Patientenabgleich-Prüfung und Managementbewertungen. Jede Gruppe hat eigene Auswahlmöglichkeiten für den Status. | Nicht zutreffend |
| Tab: Abrechnung | Tab mit den Untertabs Abrechnungsprotokolle und Ausgehende DLQ | Nicht zutreffend | Siehe [Systemprotokolle: Abrechnung](#screen-audit-financial). | Nicht zutreffend |
| Tab: Kritische Warnmeldungen | Tab | Nicht zutreffend | Die Aufzeichnung der Warnmeldungen zu kritischen Befunden. | Nicht zutreffend |
| Tab: Konsil-Links | Tab | Nicht zutreffend | Jeder externe Konsil-Link in jedem Fall, mit **Nur aktive** und **Widerrufen**. Wird Personen mit `audit:consult-links:view` angezeigt. | Nicht zutreffend |
| Tab: Serveraufträge | Tab | Nicht zutreffend | Die Hintergrundaufträge des API-Servers: Zustand und Dead Letters, mit erneutem Einreihen. Nur Personen mit `jobs:server-job:view` angezeigt. Ein Link, der ohne diese Berechtigung geöffnet wird, landet im Prüfprotokoll. | Ohne die Berechtigung verborgen |
| Support-Referenz suchen | Text, Form `SR-XXXX-XXXX` | Optional | Nennt den Fall, den Prüfeintrag, den Fehlereintrag oder die Schnittstellenausnahme, auf die eine Support-Referenz verweist. Eine Suche wird selbst protokolliert (`support_reference.resolved`). Liegt der Eintrag außerhalb des geladenen Zeitraums, fordert die Meldung auf, den Zeitraum zu erweitern. | Leer |

#### Tab Prüfprotokoll

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Prüfprotokoll: Typ-Schaltflächen | Auswahl: Alle, KI, Benutzer, System, mit Zählern | Optional | Filtert nach dem Typ des Eintrags. | Alle |
| Prüfprotokoll: Nur Patientenverwaltung | Ja/Nein-Kontrollkästchen mit Zähler | Optional | Zeigt nur Ereignisse, deren Name mit `mpi.` beginnt (Zusammenführen, Verschieben, Verknüpfen, erneutes Zuordnen, Aktualisierung demografischer Daten). Wird mit den anderen Filtern kombiniert. Ein künftiges Ereignis `mpi.` wird automatisch einbezogen. | Nein |
| Prüfprotokoll: Benutzerfilter | Auswahl aller Benutzer in den geladenen Einträgen | Optional | Nur in einer Sitzung als Superadmin angezeigt. Alle anderen finden eine Person, indem sie den Namen in das Suchfeld eingeben. | Alle Benutzer |
| Prüfprotokoll: Zeitraum | Auswahl: Heute, Letzte 7 Tage, Letzte 30 Tage, Letzte 90 Tage, Benutzerdefinierter Zeitraum | Optional | Grenze in der Zeitzone der Einrichtung. Benutzerdefinierter Zeitraum fügt ein Datum **von** und **bis** hinzu; das Enddatum schließt den ganzen Tag ein. | Letzte 7 Tage |
| Prüfprotokoll: Suche | Text | Optional | Findet den Ereignisnamen, den Detailtext, den Benutzer und die Fall-ID (Eingangsnummer), ohne Beachtung der Groß- und Kleinschreibung. | Leer |
| Prüfprotokoll: CSV exportieren | Schaltfläche | Nicht zutreffend | Erfordert `audit:audit-log:export`. Siehe die Anleitung zur Prüfung. Ohne sie ausgegraut. | Nicht zutreffend |
| Prüfprotokoll: Zeitstempel | Spalte, `YYYY-MM-DD HH:MM:SS.mmm UTC` | Nicht zutreffend | Wann der Eintrag geschrieben wurde, stets in UTC angezeigt. | Nicht zutreffend |
| Prüfprotokoll: Typ | Spalte | Nicht zutreffend | KI, Benutzer oder System. | Nicht zutreffend |
| Prüfprotokoll: Ereignis | Spalte | Nicht zutreffend | Der Ereignisname, gefolgt von einem Chip mit der Support-Referenz. | Nicht zutreffend |
| Prüfprotokoll: Detail | Spalte | Nicht zutreffend | Englischer Text, frei von Patientennamen, Geburtsdaten, Patientennummern (MRN) und klinischen Werten. | Nicht zutreffend |
| Prüfprotokoll: Benutzer | Spalte | Nicht zutreffend | Der Anzeigename der Person oder des Systemakteurs. Automatische Aktionen zeigen einen Systemakteur wie `SYSTEM`. | Nicht zutreffend |
| Prüfprotokoll: Fall | Spalte | Nicht zutreffend | Die Eingangsnummer, wenn der Eintrag einen Fall betrifft. Ein Klick darauf öffnet den Fall. | Nicht zutreffend |

Der Eintrag enthält außerdem einen Konfidenzwert (bei KI-Einträgen), eine Kennung der Einrichtung und eine Kennung der Scanstation. Sie werden gespeichert und stehen im Vertrag des Servers, aber der Bildschirm zeigt dafür keine Spalte, und die CSV-Datei enthält weder Einrichtung noch Station. Die Kennung der Einrichtung fehlt bei Einträgen, die vor ihrer Einführung oder von Code aufgezeichnet wurden, der sie nicht liefert.

#### Tab Fehlerprotokoll

| Feldname | Datentyp / Format | Pflicht/Optional | Beschreibung und Geschäftslogik | Systemstandard |
|---|---|---|---|---|
| Fehlerprotokoll: Schweregrad-Schaltflächen | Auswahl: Alle, Fehler, Warnung, Info, mit Zählern | Optional | Filtert nach Schweregrad. | Alle |
| Fehlerprotokoll: Status | Auswahl: Alle Status, Nur offene, Nur gelöste | Optional | Filtert nach Lösungsstand. | Alle Status |
| Fehlerprotokoll: Suche | Text | Optional | Findet Meldung, Code und Quelle. | Leer |
| Fehlerprotokoll: Beheben | Schaltfläche in jeder offenen Zeile | Nicht zutreffend | Erfordert `audit:error:resolve`. Erfasst, wer ihn behoben hat und wann; die Zeile zeigt dann „Behoben von <name>, <time>“. | Nicht zutreffend |
| Fehlerprotokoll: CSV exportieren | Schaltfläche | Nicht zutreffend | Erfordert `audit:error-log:export`. | Nicht zutreffend |
| Fehlerprotokoll: Spalten | Zeitstempel, Schweregrad, Code, Meldung, Quelle, Fall, Status | Nicht zutreffend | Die Spalte Code enthält die Codes des [Index](#ch9-error-codes). | Nicht zutreffend |

**7. Berechtigungen.**
- Den Bildschirm öffnen: `screen:audit-log:open`. Admin, Laborleitung und QS-Prüfer haben sie standardmäßig. Die Rolle Pathologe hat sie standardmäßig nicht.
- Export: eine Berechtigung je Protokoll, jede mit hohem Risiko, jede setzt `screen:audit-log:open` voraus: `audit:audit-log:export`, `audit:error-log:export`, `audit:interface-log:export`, `audit:qa-log:export` und `audit:billing-log:export`. Rollen, die den Bildschirm öffnen, erhalten ab Werk alle fünf. Jeder Export wird selbst protokolliert.
- Einen Fehler beheben: `audit:error:resolve` (hohes Risiko).
- Tab Konsil-Links: `audit:consult-links:view`. Serveraufträge: `jobs:server-job:view`, und erneutes Einreihen mit `jobs:server-job:requeue`.
- Eingrenzung auf dem Bildschirm: Pathologen sehen jeden Eintrag, der einen Fall nennt, sowie ihre eigenen Einträge ohne Fall. Ereignisse aus Validierungsstudien (`validation_study_created`, `validation_study_activated`, `validation_study_closed`, `validation_study_deleted`, `validation_report_generated` und die drei Ereignisse `validation_routing_rule_*`) sind für alle außer Admin, Pathologe-Admin und Superadmin verborgen.
- Das Ansehen des Protokolls wird selbst nicht protokolliert. Exporte, das Beheben eines Fehlers und eine Suche nach einer Support-Referenz werden protokolliert.

**Bekannte Grenzen.**
- **Keine Manipulationserkennung im Hauptprüfprotokoll.** Das Hauptprüfprotokoll ist von Natur aus nur anhängend (im Dienst gibt es keinen Aufruf zum Ändern oder Löschen, und der Vertrag des Servers erteilt dem Datenbankzugang der Anwendung keine solche Berechtigung), aber seine Einträge sind nicht per Hash verkettet, und nichts auf dem Bildschirm prüft sie. Die einzige per Hash verkettete Aufzeichnung ist das Prüfprotokoll des [Support-Zugriffs](#screen-support_access). Siehe die Anleitung zur Prüfung.
- **Die Aufbewahrung ist eine Einstellung, keine erzwungene Regel.** Die Aufbewahrungsdauer des Protokolls wird unter [Datenaufbewahrung](#screen-retention) festgelegt. Kein Auftrag zum Löschen liest sie bisher (PS-345), daher wird derzeit nichts dadurch gelöscht.
- **Das `detail` des Prüfprotokolls ist absichtlich englisch.** Es ist ein Compliance-Nachweis, kein Text der Oberfläche. Die Spaltenüberschriften, Filter und Schaltflächen sind übersetzt; der Detailtext und die exportierte Datei nicht.
- **Demonstration.** Ohne API-Server wird das Prüfprotokoll im Browser gespeichert und beginnt mit vorbefüllten Beispieleinträgen. Die Zeit und der handelnde Benutzer stammen aus dem Browser. Mit einem API-Server legt der Server Zeit und Akteur anhand des Anmelde-Tokens fest.
- **Keine Spalte für Einrichtung oder Station** auf dem Bildschirm oder in der CSV-Datei, obwohl beide aufgezeichnet werden (siehe oben).
## Anleitung zur Prüfung des Prüfprotokolls {#ch9-audit-verification}
Breadcrumb: Startseite > Administratorhandbuch > Anhänge > Anleitung zur Prüfung des Prüfprotokolls

**Status:** Teilweise. Die Aufzeichnung, die Suche und der Export sind umgesetzt. Die Manipulationserkennung für das Hauptprüfprotokoll und das automatische Löschen nach der Aufbewahrungsdauer sind nicht umgesetzt.

**Für wen dies gedacht ist.** Für einen Administrator oder einen Service-Ingenieur von ForMedrixAI, der einem Auditor oder Inspektor zeigen muss, was sich geändert hat, wer es geändert hat und wann. Sie verwendet nur, was heute existiert.

### Was aufgezeichnet wird {#ch9-audit-recorded}

Jeder Prüfeintrag enthält: eine Kennung; eine Zeit (in UTC gespeichert); einen Typ (**KI**, **Benutzer** oder **System**); einen Ereignisnamen; einen Detailsatz auf Englisch; den Anzeigenamen des handelnden Benutzers; eine Eingangsnummer des Falls, wenn es eine gibt; eine KI-Konfidenz, wo sie zutrifft; eine Kennung der Einrichtung, wo der Code sie liefert; und die Scanstation, an der die Aktion erfolgte. Die Kennung der Station wird jedem Eintrag, den der Prüfdienst schreibt, automatisch hinzugefügt.

Was im Protokoll landet:

- **Jede Prüfung einer Berechtigung mit hohem Risiko**, erlaubt oder abgelehnt. Das Ereignis heißt **Capability allowed** oder **Capability refused**. Das Detail nennt den Berechtigungsschlüssel, die Rollen, die sie erteilt haben, oder den Grund der Ablehnung, die Sitzungsrolle der Person und die Einrichtung. Der Berechtigungskatalog kennzeichnet, welche Berechtigungen ein hohes Risiko haben. Das Speichern eines Konfigurationsbildschirms ist eine dieser Prüfungen.
- **Änderungen an Rollen und Mitarbeitern.** **Role capabilities changed** listet, was einer Rolle erteilt und entzogen wurde. **Staff access changed** erfasst eine Änderung der Rollen, Einrichtungen, des pädiatrischen Zugriffs, des Orchestrierungszugriffs oder des mandantenübergreifenden QS-Zugriffs einer Person, jeweils von und zu. **Staff credentials changed** erfasst Änderungen der Zugangsdaten.
- **Anmeldeereignisse.** **Signed in**, **Sign-in failed** (Versuch n von 5), **Sign-in locked**, **Sign-in refused**, **SSO account linked**, **SSO account unlinked** und **SSO sign-in refused**. Das Protokoll zeichnet nie auf, was eingegeben wurde.
- **Benannte Änderungsereignisse für einige Einstellungen.** Zum Beispiel `AI_VENDOR_POLICY_CHANGED`, `CLINICAL_MISMATCH_RULE_CHANGED`, `AI_PROMPT_EDITED`, `AI_PROMPT_APPROVED`, `FEEDBACK_SETTINGS_CHANGED`, `RECALL_SETTINGS_CHANGED`, `QA_TREND_POLICY_CHANGED`, `CODE_SYSTEM_POLICY_CHANGED`, `PEER_REVIEW_GATE_CHANGED`, **Template review settings changed**, **Organ map colours changed**, **Signing-authority country profile changed** und die vier Ereignisse **Signing-authority facility override** (hinzugefügt, geändert, entfernt, Begründung aktualisiert). Die Ereignisse zur Ausnahme einer Einrichtung enthalten jedes geänderte Kennzeichen von und zu sowie die Begründung des Administrators oder „Justification: none given“.
- **Sprachbefehle.** **Voice command executed** und **Voice command refused**. Das Detail nennt die Aktions-ID und den Bildschirm, zum Beispiel `Voice command executed: action TABLE_DELETE on screen WORKLIST; confirmed by repeating the phrase`; bei einer Ablehnung steht der Grund darin (auf diesem Bildschirm nicht verfügbar, Wendung zur Bestätigung nicht wiederholt oder nicht rechtzeitig wiederholt). Die Person ist der handelnde Benutzer. Das Protokoll speichert nie, was gesagt wurde, und kein Eintrag nennt einen Fall.
- **Drucke und Exporte.** `DOCUMENT_PRINTED`, `DOCUMENT_REPRINTED`, `DOCUMENT_RENDERED`, `DOCUMENT_EXPORTED`, `DOCUMENT_FAXED`: wer, die Eingangsnummer, das Ziel, der Status und, bei einem Export, die Zeilenzahl.
- **Fallereignisse** (Case events), etwa das Erzeugen von Synopsen, Feldaktualisierungen, Finalisierung, Protokollauswahl, Erkennung und Korrektur von Abweichungen, Korrekturen der Abrechnung und Patientenverwaltung (`mpi.*`).
- **Automatische Aktionen** (Automatic actions) unter einem Systemakteur.

Zwei Grenzen sind beim Lesen der Aufzeichnung wichtig.

1. Ein Eintrag zu einer Berechtigung zeigt, dass eine Person eine Berechtigung verwendet hat und ob sie erlaubt war. Bei den meisten Einstellungen zeigt er die alten und neuen Werte **nicht**. Nur die oben genannten Ereignisse und einige weitere enthalten die Änderung selbst.
2. Eine Änderung, die eine Sitzung als Superadmin in einer anderen Organisation vornimmt, wird auch in die Aufzeichnung des [Support-Zugriffs](#screen-support_access) dieser Organisation geschrieben.

**Der Detailtext ist absichtlich englisch.** Prüfaufzeichnungen sind Compliance-Nachweise, kein Text der Oberfläche, daher bleibt das Detail in jeder Sprache des Produkts und im Export wörtlich englisch. Suchen Sie mit dem englischen Ereignisnamen oder dem Berechtigungsschlüssel.

### So finden Sie die Änderung einer Einstellung {#ch9-audit-find-setting}

1. Öffnen Sie [Systemprotokolle](#screen-audit-log), Tab **Prüfprotokoll**.
2. Legen Sie den **Zeitraum** fest. Standard ist **Letzte 7 Tage**; wählen Sie **Benutzerdefinierter Zeitraum** für eine ältere Änderung. Einträge außerhalb des Zeitraums sind ausgeblendet, nicht verschwunden.
3. Geben Sie unter **Suche** den Berechtigungsschlüssel des Bildschirms ein, den Sie prüfen. Die Berechtigung zum Ändern jedes Konfigurationsbildschirms ist in dessen Teil **Berechtigungen** in diesem Handbuch genannt (zum Beispiel `config:retention-policy:manage` für [Datenaufbewahrung](#screen-retention)). Die Suche findet den Detailtext und damit die Einträge **Capability allowed**.
4. Lesen Sie die Spalten **Benutzer** und **Zeitstempel** für wer und wann. Das Detail nennt die Rolle, die die Berechtigung erteilt hat.
5. Hat der Bildschirm ein benanntes Änderungsereignis (siehe die Liste oben), suchen Sie auch nach diesem Ereignisnamen. Es enthält die Änderung selbst, nicht nur die Berechtigungsprüfung.
6. Um Störeinträge auszuschließen, verwenden Sie die Schaltflächen für den **Typ** (**Benutzer** zeigt die Aktionen von Menschen).
7. Um nur Ablehnungen zu sehen, suchen Sie `Capability refused`.

Ein Eintrag mit **Capability allowed** zeigt, dass die Person die Änderung vornehmen durfte und dass die Änderung versucht wurde. Er beweist für sich allein nicht, welcher Wert gespeichert wurde. Vergleichen Sie bei einer Einstellung ohne eigenes Änderungsereignis mit dem aktuellen Wert des Bildschirms und, wenn das Labor eine führt, mit einem Konfigurationsexport (siehe **Export** unten).

### So prüfen Sie, wer eine Berechtigung geändert hat {#ch9-audit-find-permission}

1. Suchen Sie im Tab **Prüfprotokoll** nach `Role capabilities changed`. Jeder Eintrag lautet `Role "<name>": granted <keys>; removed <keys>.` Die Spalte **Benutzer** nennt die Person, die die Rolle gespeichert hat.
2. Um zu sehen, wer eine Rolle erhalten oder verloren hat, suchen Sie `Staff access changed`. Das Detail listet jede Änderung von und zu (Rollen, Einrichtungen, pädiatrischer Zugriff, Orchestrierungszugriff, mandantenübergreifender QS-Zugriff).
3. Um Änderungen der Zugangsdaten zu sehen, suchen Sie `Staff credentials changed`.
4. Um zu sehen, ob eine Person eine Berechtigung tatsächlich verwendet hat, suchen Sie den Berechtigungsschlüssel und lesen Sie die Einträge **Capability allowed** und **Capability refused**.
5. Um aufzulisten, wer heute etwas tun darf, verwenden Sie [Rollen](#screen-staff-roles) und [Mitarbeiter](#screen-staff-members); das Protokoll zeigt den Verlauf, diese Bildschirme zeigen den aktuellen Zustand.
6. Für eine Rolle, die das Krankenhaus nicht ändern kann: Eine Änderung der Rolle Superadmin wird in einem Krankenhaus abgelehnt, daher zeigt kein Eintrag eine solche. Superadmin liegt bei Mitarbeitenden des Supports von ForMedrixAI und wird außerhalb des Mitarbeiterverzeichnisses des Krankenhauses erteilt.

Ein Speichern einer Rolle wird außerdem abgelehnt, bevor etwas geschrieben wird, wenn danach keine Rolle mehr Rollen verwalten könnte, ein Paar zur Funktionstrennung verletzt würde oder eine Berechtigung ohne die erforderliche erteilt würde. Ein abgelehntes Speichern schreibt keinen Eintrag **Role capabilities changed**.

### So funktionieren Integrität und Aufbewahrung der Aufzeichnung {#ch9-audit-integrity}

**Nur anhängend.** Der Prüfdienst hat keinen Aufruf, um einen Eintrag zu ändern oder zu löschen; er kann nur neue schreiben und sie lesen. Der Vertrag des Servers (`STAFF_ADMIN_API.md` Abschnitt 1; `AUTHORIZATION_API.md`) verlangt, dass die Prüftabelle nur anhängend ist: Es gibt keinen Aufruf zum Ändern oder Löschen, und der Datenbankzugang der Anwendung hat keine solche Berechtigung. Ein behobener Fehler ist die einzige Änderung, die an einem Datensatz erlaubt ist, und sie wird als wer und wann am Fehlereintrag erfasst, nicht als Überschreiben der Meldung.

**Wer die Zeit und den Akteur festlegt.** Mit dem API-Server legt der Server die Zeit und den handelnden Benutzer anhand des Bearer-Tokens fest. Der Browser sendet nur das Ereignis, daher kann ein Benutzer den angezeigten Namen nicht wählen. In der Demonstration tut es der Browser.

**Eindeutige Kennungen.** Jeder Eintrag erhält eine eindeutige Kennung. Die Tabelle des Servers soll die Eindeutigkeit ebenfalls erzwingen.

**Manipulationserkennung: Das Hauptprüfprotokoll hat keine.** Das Hauptprüfprotokoll ist **nicht** per Hash verkettet oder signiert. Nichts im Bildschirm Systemprotokolle belegt, dass ein Eintrag von jemandem mit direktem Datenbankzugriff nicht verändert wurde, und es gibt dafür keine Schaltfläche „Prüfen“. Die Integrität beruht auf der oben genannten Regel „nur anhängend“ und auf Datenbankberechtigungen. Die einzige per Hash verkettete Aufzeichnung ist das Prüfprotokoll des [Support-Zugriffs](#screen-support_access) (siehe unten). Verlangt Ihr Auditor eine kryptografische Manipulationserkennung für das Hauptprotokoll, teilen Sie dies ForMedrixAI mit: Sie ist nicht umgesetzt.

**Aufbewahrung.** Die Aufbewahrungsdauer des Prüfprotokolls ist eine Einstellung unter [Datenaufbewahrung](#screen-retention): das Feld **Audit-Protokolle**, in Tagen, von 90 bis 3650, standardmäßig 365. Der Bildschirm sagt, eine Änderung „wird beim nächsten Löschzyklus wirksam“. **Kein Auftrag zum Löschen liest diese Einstellung bisher (PS-345)**, daher wird derzeit nichts dadurch gelöscht. Behandeln Sie die Zahl als aufgezeichnete Richtlinie, nicht als erzwungene. Ein Nachweis jedes Exports (wer, was, wann, Zeilenzahl und Hash der Datei) wird mit der Aufbewahrung des Prüfprotokolls geführt.

**Exporte sind Arbeitskopien.** Die exportierte CSV-Datei ist eine Kopie dessen, was auf dem Bildschirm stand. Der Nachweis des Exports ist der Prüfeintrag.

### So exportieren Sie {#ch9-audit-export}

1. Legen Sie im benötigten Tab zuerst die Filter fest. Der Export umfasst die Zeilen, die die Filter übrig lassen, nicht das ganze Protokoll.
2. Wählen Sie **CSV exportieren**. Die Schaltfläche ist ausgegraut, mit einem Tooltip, der die Berechtigung nennt, sofern die Person nicht die Export-Berechtigung für diesen Tab hat (siehe Berechtigungen oben).
3. Der Dienst prüft die Berechtigung, bevor er die Datei erstellt. Eine Ablehnung erstellt nichts.
4. Mit einem API-Server wird der Export vom Server erstellt (siehe [Meine Exporte](#screen-my-exports)): Die Datei ist eine Arbeitskopie, die standardmäßig 7 Tage aufbewahrt wird (1 bis 30), eine Person darf 3 offene Exporte haben, und mehr als 1.000.000 Zeilen werden abgelehnt. In der Demonstration erstellt der Browser die Datei und lädt sie sofort herunter.
5. Ein Dateiname hat die Form `pathscribe-audit-log-<date>.csv`. Die ersten Zeilen sind ein Kopf, der den Bericht, die anfordernde Person, die verwendeten Filter und die Zeilenzahl nennt. Dann folgen die Spalten: **ID, Timestamp, Type, Event, Detail, Actioned By, Accession No., AI Confidence**. Zellen, die mit `=`, `+`, `-` oder `@` beginnen, werden entschärft, damit eine Tabellenkalkulation sie nicht als Formel ausführt.
6. Jeder Export schreibt einen Eintrag `DOCUMENT_EXPORTED` mit der Person, dem Dateinamen, dem Format und der Zeilenzahl. Suchen Sie `DOCUMENT_EXPORTED`, um zu sehen, wer das Protokoll exportiert hat.
7. Die CSV-Datei enthält die Kennungen von Einrichtung und Station nicht. Braucht ein Inspektor sie, teilen Sie dies dem Service von ForMedrixAI mit: Der Server hält sie.
8. Die anderen Tabs werden auf dieselbe Weise exportiert, jeder mit eigener Berechtigung und eigenen Spalten: Fehlerprotokoll (ID, Timestamp, Severity, Code, Message, Source, Accession No., Resolved), Qualitätssicherung (ID, Group, Date, Case, Specimen, Detail, Status, User), Schnittstellenprotokoll und das Abrechnungsprotokoll im Tab Abrechnung.

### Wie das Prüfprotokoll des Support-Zugriffs einzuordnen ist {#ch9-audit-support}

Wenn der Support von ForMedrixAI auf Ihre Daten zugreift, wird dies in einem eigenen Strom aufgezeichnet, getrennt vom Hauptprüfprotokoll, und er gehört Ihrer Organisation. Er ist unter [Support-Zugriff](#screen-support_access) beschrieben.

- **Was er aufzeichnet.** Richtlinienänderungen; Anfragen, Genehmigungen, Ablehnungen, Abläufe, vorzeitige Beendigungen und Widerrufe; abgelehnte Öffnungen; Öffnen und Bearbeiten von Fällen; jede Liste, Suche oder jeden Bericht, die Ihre Fälle offengelegt haben (mit den Fall-IDs); die Namen, nie die Werte, von Suchkriterien; und Exporte dieses Prüfprotokolls. Auch die eigenen Exporte und Konfigurationsänderungen eines Support-Mitarbeiters werden hier erfasst (als `supportExport` und `supportConfigChange`) sowie im Hauptprüfprotokoll.
- **Einträge werden nie entfernt.** Jeder Eintrag enthält eine laufende Nummer, die Zeit, den Akteur, das Ticket, die Aktion, die Fall-IDs und ein englisches Detail ohne Patientendaten.
- **Es ist per Hash verkettet.** Jeder Eintrag trägt einen SHA-256 über seine Felder und den Hash des vorherigen Eintrags, beginnend mit 64 Nullen. Ein geänderter, entfernter oder umgeordneter Eintrag unterbricht die Kette. Der Bildschirm meldet **Protokoll unverändert (N Einträge)** oder **Protokoll bei Eintrag N verändert**, und der JSON-Export enthält die Prüfung der Kette.
- **So prüfen Sie es.** Öffnen Sie den Support-Zugriff, lesen Sie die Kettenzeile im Prüfbereich und exportieren Sie JSON für eine unabhängige Prüfung. Sie benötigen `config:support-audit:view`.
- **Exportformate.** CSV, JSON und PDF, mit den Spalten Zeitstempel, Name des Support-Mitarbeiters, Herkunfts-IP, Herkunftsland, Ticket-ID, Durchgeführte Aktion, Fall-IDs, Detail.
- **Grenzen.** Herkunfts-IP und Herkunftsland kann nur der Server wahrheitsgemäß aus der Anfrage erfassen, daher lässt die Demonstration sie leer. Mandantengetrennte Speicherung in einer eigenen, nur anhängenden Tabelle ist Arbeit am Server (PS-358).

Dies ist die einzige Aufzeichnung im Produkt mit eingebauter Manipulationserkennung. Sie deckt nur den Support-Zugriff ab, nicht das Hauptprüfprotokoll.

### Ein kurzer Prüfablauf {#ch9-audit-routine}

Gehen Sie für eine routinemäßige Überprüfung eines Stichprobenzeitraums diese Schritte durch.

1. Legen Sie den Zeitraum des **Prüfprotokolls** auf den Zeitraum fest. Notieren Sie die Anzahl in der Fußzeile („N von M Ereignissen angezeigt“).
2. Suchen Sie `Role capabilities changed`, `Staff access changed` und `Capability refused` und lesen Sie jeden Eintrag.
3. Suchen Sie `Sign-in locked` und `Sign-in refused` nach Anmeldeproblemen.
4. Suchen Sie `DOCUMENT_EXPORTED`, um zu sehen, wer Daten herausgenommen hat.
5. Öffnen Sie den Tab **Fehlerprotokoll**, filtern Sie auf **Nur offene** und prüfen Sie, dass nichts Wichtiges ungelöst ist.
6. Öffnen Sie den [Support-Zugriff](#screen-support_access) und bestätigen Sie, dass die Kettenzeile „unverändert“ meldet; lesen Sie die Einträge des Zeitraums.
7. Exportieren Sie die CSV-Datei des Prüfprotokolls für den Zeitraum und bewahren Sie die Datei bei Ihren Prüfnotizen auf. Der Export wird selbst protokolliert.
