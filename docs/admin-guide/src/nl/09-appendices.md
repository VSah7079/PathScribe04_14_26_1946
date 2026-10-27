---
chapter: 9
id: ch9
title: Bijlagen: probleemoplossing en verificatie van het auditlogboek
---

# Bijlagen: probleemoplossing en verificatie van het auditlogboek {#ch9}

Dit hoofdstuk heeft drie delen. Het eerste is een matrix voor probleemoplossing: de problemen die een beheerder het vaakst tegenkomt, elk met de oorzaak en het scherm waar u het oplost. Het tweede is een index van de foutcodes die PathScribe toont of vastlegt. Het derde beschrijft het scherm Systeemlogboeken en geeft een stapsgewijze handleiding om te verifiëren wat het auditlogboek bevat. De woordenlijst met termen is het laatste hoofdstuk van de handleiding ([Woordenlijst](#ch99)).

**De gebruikershandleiding (Batch 657).** De online gebruikershandleiding voor de mensen die het werk doen, wordt gebouwd uit Markdown in `docs/user-guide/` met `python3 scripts/user-guide/build.py` en samen met de toepassing gepubliceerd onder `/help`; de knop Help van elk scherm en F1 openen het artikel voor het getoonde scherm. Configuratie- en beheerschermen behouden hun knoppen voor de Beheerdershandleiding. Er is geen instelling nodig. Voeg een pagina toe of wijzig haar door haar bestand te bewerken en opnieuw te bouwen; de build controleert de vereiste secties, links en routes.

Elk bericht dat hier wordt aangehaald, is de Nederlandse tekst uit het product. Elke code bestaat in de broncode; een code die in een contract alleen een tijdelijke aanduiding is en in het product niet wordt gebruikt, staat er niet bij.

## Matrix voor probleemoplossing {#ch9-matrix}
Breadcrumb: Start > Beheerdershandleiding > Bijlagen > Matrix voor probleemoplossing

**Status:** Gerealiseerd

**Hoe u de matrix gebruikt.** Zoek het symptoom dat de gebruiker meldt, lees de waarschijnlijke oorzaak en volg de oplossing. De meeste meldingen dat iets kapot is, komen neer op een van twee dingen: een woordenboek dat nooit is ingericht (een lege lijst) of een rol die een machtiging niet bevat (een grijze knop of een geweigerde opslag). Als het symptoom een code in hoofdletters toont, zoekt u die op in de [index van foutcodes](#ch9-error-codes).

**Eerst dit.** Twee controles beantwoorden de meeste vragen.

1. Open [Systeemlogboeken](#screen-audit-log) en zoek op de naam van de persoon of op de machtigingssleutel. Een geweigerde machtigingscontrole schrijft een vermelding **Capability refused** weg die de machtiging en de sessierol van de persoon noemt.
2. Kijk op het tabblad **Foutenlogboek** naar een open fout met een code, bron en tijd die dicht bij de melding liggen.

### Lege lijsten en meldingen dat iets niet is ingericht {#ch9-matrix-empty}

Een leeg keuzemenu of een melding dat er niets is geconfigureerd, betekent bijna altijd dat een woordenboek eerder in de inrichtingsvolgorde is overgeslagen. De pagina [Volgorde van inrichting](setup-sequence.html) toont de volgorde.

| Symptoom (wat de gebruiker ziet) | Waarschijnlijke oorzaak | Oplossing | Scherm |
|---|---|---|---|
| In het teamvenster van een casus: **Geen deelnametypen geconfigureerd**, met de hint ‘Stel typen in bij Systeem → Deelnametypen.’ | Er bestaat geen deelnametype. | Voeg de typen toe die het lab gebruikt en open het venster opnieuw. | [Deelnametypen](#screen-participation_types) |
| Een testafdruk of een etikettenvenster meldt **Geen printerprofielen geconfigureerd**. | Er is geen printerprofiel toegevoegd. | Voeg voor elk model etikettenprinter een printerprofiel toe. | [Printerprofielen](#screen-printer_profiles) |
| Een inbed- of microtomiestation meldt **Geen printer geconfigureerd** of **Het geconfigureerde printerprofiel bestaat niet meer.** Een station voor het verdelen van preparaten meldt **Dit station is niet ingesteld voor het afdrukken van glaasjesetiketten.** | Het station heeft geen printerprofiel, of het profiel is verwijderd. | Open het station en kies een printerprofiel dat nog bestaat. | [Scanstations](#screen-scan_stations), [Printerprofielen](#screen-printer_profiles) |
| Een venster voor het verdelen van preparaten of voor een scanbatch meldt **Er zijn geen glaasjesscanners ingesteld** (de tekst noemt Configuratie, Apparatuur, soort ‘Glaasjesscanner’). | Er is geen apparatuurrecord van de soort Glaasjesscanner. | Voeg de scanners toe. | [Apparatuur](#screen-equipment) |
| Een etiket wordt niet afgedrukt en het bericht luidt **Geen GS1-GTIN ingesteld. Stel er een in bij de afdrukinstellingen voordat u een GS1-cassette-etiket afdrukt** (of objectglasetiket). | Voor de faciliteit is geen GS1-GTIN ingevoerd. | Voer de GTIN in bij Afdrukinstellingen. | [Afdrukinstellingen](#screen-print_settings) |
| Het dashboard Facility Ops meldt **Er zijn nog geen weergaveprofielen geconfigureerd**. | Er bestaat geen weergaveprofiel. | Voeg er een toe onder Weergaveprofielen. | [Weergaveprofielen](#screen-display_profiles) |
| Het OK-dashboard meldt **Nog geen terminals geconfigureerd**. | Er bestaat geen terminal voor het operatiekamercomplex. | Voeg de terminals toe. | [OK-terminals](#screen-or_suite_terminals) |
| In het venster voor een toewijzingsregel: **Geen actieve pools. Schakel eerst "Pool / Werkgroep" in bij een subspecialisme.** | Geen enkel subspecialisme staat in de modus Pool / Werkgroep. | Schakel Pool / Werkgroep in voor ten minste één subspecialisme en voeg dan de regel toe. | [Subspecialismen](#screen-subspecialties), [Routeringsregels](#screen-routing_rules) |
| In het venster voor een nieuwe container: **Er is momenteel geen instelling geconfigureerd met de rol Referentielaboratorium.** | Geen enkele faciliteit heeft de rol Referentielaboratorium. | Geef een faciliteit die rol in haar faciliteitsinstellingen. | [Faciliteitenwoordenboek](#screen-facility-dictionary) |
| Een gebruiker die beveiligde e-mail probeert, ziet **Voor uw lab is geen gateway voor beveiligde berichten ingesteld.** | De faciliteit heeft geen gateway op het tabblad Beveiligde berichten. | Voeg een gateway toe in de instellingen van de faciliteit. | [Faciliteitenwoordenboek](#screen-facility-dictionary) |
| De lijst **Toevoegen** bij Serviceniveaus per klant is leeg, met de opmerking dat elke klant al een niveau heeft of dat er geen klanten zijn ingesteld. | Elke faciliteit heeft al een serviceniveau, of er bestaan geen klantfaciliteiten. | Voeg eerst de faciliteiten toe, of bewerk het bestaande niveau. | [Faciliteitsconfiguratie](#screen-clients), [Serviceniveaus per klant](#screen-client_sla) |

### Opslaan geweigerd, grijze knoppen en schermen die u niet kunt openen {#ch9-matrix-permissions}

PathScribe controleert machtigingen twee keer. Het scherm maakt een actie grijs die de persoon niet mag uitvoeren. De service achter de actie controleert opnieuw en weigert hem. In productie herhaalt de API-server de controle en heeft hij het laatste woord. Geen enkele rol kan dit omzeilen, ook Superadmin niet.

| Symptoom | Waarschijnlijke oorzaak | Oplossing | Scherm |
|---|---|---|---|
| Een knop is grijs. De tooltip luidt **Uw rollen bevatten ‘<capability>’ niet.** | Geen van de rollen van de persoon bevat die machtiging. | Voeg de machtiging toe aan een rol die de persoon heeft. Machtigingen zijn per gebied gegroepeerd in het Rollenwoordenboek. | [Rollen](#screen-staff-roles), [Medewerkers](#screen-staff-members) |
| De tooltip luidt **‘<capability>’ vereist ook ‘<other>’, dat uw rollen niet bevatten.** | De machtiging vereist een andere machtiging (de lijst `requires` in de catalogus). | Verleen beide. Een rol wordt niet opgeslagen met ‘aan een machtiging ontbreekt er een die ze nodig heeft’ totdat ook de vereiste machtiging is verleend. | [Rollen](#screen-staff-roles) |
| De tooltip luidt **‘<capability>’ is hier niet beschikbaar: uw toegewezen instellingen dekken dit niet.** | De persoon heeft de machtiging, maar de actie raakt een faciliteit buiten de toegewezen faciliteiten (of betreft alle faciliteiten). | Wijzig de faciliteitstoewijzing van de persoon. | [Medewerkers](#screen-staff-members) |
| Het opslaan van een Configuratie mislukt met **Niet opgeslagen: hiervoor is de toestemming ‘<permission>’ nodig. Een beheerder kan die toekennen via Configuratie → Personeel → Rollenwoordenboek.** | De persoon mist de machtiging `config:...:manage` voor dat scherm (code `CONFIG_NOT_PERMITTED`). | Verleen de genoemde machtiging aan de rol van de persoon. | [Rollen](#screen-staff-roles) |
| Het opslaan van een rol mislukt: **Niet opgeslagen: daarna zou geen enkele rol nog rollen kunnen beheren.** | De wijziging zou geen enkele toewijsbare rol met `config:roles:manage` overlaten. | Geef eerst **Rollen beheren** aan een andere toewijsbare rol en sla dan op. | [Rollen](#screen-staff-roles) |
| Het opslaan van een rol of van medewerkers mislukt met **de discrepantieregels wijzigen en de AI-instructies goedkeuren zijn gescheiden taken**. | Eén persoon (of één rol) mag niet zowel `config:clinical-mismatch-rules:manage` als `config:ai-prompt:approve` hebben (code `SEPARATION_OF_DUTIES`). | Verdeel de twee machtigingen over twee rollen die door verschillende personen worden gehouden. | [Rollen](#screen-staff-roles), [Medewerkers](#screen-staff-members) |
| Het opslaan van een rol mislukt met **deze rol wordt beheerd door ForMedrixAI**. | De rol Superadmin kan in een ziekenhuis niet worden gewijzigd. | Geen. Gebruik een andere rol. | [Rollen](#screen-staff-roles) |
| Een gebruiker opent een scherm en ziet **U hebt geen toegang tot dit scherm**; na het aanmelden meldt de startpagina **Geen van uw rollen geeft u al toegang tot een scherm. Vraag uw beheerder u er een toe te wijzen.** | De rol mist de machtiging `screen:<name>:open`, dus Start toont geen tegel en de route weigert het adres. | Voeg de schermmachtiging toe aan de rol. | [Rollen](#screen-staff-roles) |
| Een persoon kan zijn eigen wijziging niet goedkeuren: **U hebt deze tekst bewerkt en kunt hem dus niet goedkeuren.** | Zelfgoedkeuring wordt voor AI-instructies geweigerd (code `SELF_APPROVAL`). | Laat een andere houder van `config:ai-prompt:approve` het goedkeuren. | [AI-instructies](#screen-ai_instructions) |
| Een exportknop doet niets, of het exportscherm toont **U hebt geen toestemming om dit rapport te exporteren.** | Elke export heeft een eigen machtiging (bijvoorbeeld `audit:audit-log:export`) en de server controleert die bij het downloaden opnieuw. | Verleen de exportmachtiging die in de tooltip van de knop staat. | [Rollen](#screen-staff-roles), [Mijn exports](#screen-my-exports) |

### Etiketten en verslagen die niet worden afgedrukt {#ch9-matrix-print}

| Symptoom | Waarschijnlijke oorzaak | Oplossing | Scherm |
|---|---|---|---|
| Een etiket gaat naar het afdrukvenster van de browser en het bericht luidt **De etikettenprinter is niet verbonden, daarom is dit etiket naar het afdrukvenster van de browser gestuurd. Controleer of QZ Tray op deze computer actief is.** | De QZ Tray-service draait niet of is op die computer niet bereikbaar. | Start QZ Tray op de computer en druk opnieuw af. | [Printerprofielen](#screen-printer_profiles), [Afdrukinstellingen](#screen-print_settings) |
| **Etiket <id> is niet afgedrukt: <printer> heeft geen etiketten meer / het lint van <printer> is op / de printkop van <printer> staat open / <printer> is niet bereikbaar.** | De printer meldde die toestand (codes `PAPER_OUT`, `RIBBON_OUT`, `HEAD_OPEN`, `PRINTER_UNREACHABLE`). | Los het probleem aan de printer op en probeer het etiket opnieuw. Een etiket wordt nooit uit zichzelf opnieuw geprobeerd, dus het kan niet twee keer worden afgedrukt. | [Afdrukwachtrij](#screen-audit-interfaces) |
| **...is niet afgedrukt: <printer> heeft de etiketopmaak geweigerd** of **de barcode heeft de GS1-validatie niet doorstaan. Dit is een PathScribe-probleem; meld het alstublieft.** | De inhoud van het etiket is geweigerd (`MALFORMED_ZPL`, `INVALID_GS1`). Opnieuw proberen helpt niet. | Meld het aan de support van ForMedrixAI, met het tijdstip en de opmaak van het etiket. | [Labelontwerper](#screen-label_designer) |
| Een afdruktaak voor een verslag is **Mislukt** met ‘Netwerkafdrukken vereist de PathScribe-siteagent.’ | Een verslag is vanuit een browser naar een netwerkprinter gestuurd, die de browser niet kan bereiken (`NEEDS_SITE_AGENT`). | Laat het afdrukken van het lab via een printer van een site-agent lopen. | [Site-agents](#screen-site_agents), [Routeringsregels voor afdrukbestemmingen](#screen-print_routing_rules) |
| Afdrukken ‘werkt’, maar in de demonstratie komt er niets uit. | De demonstratie legt afdrukken vast in plaats van ze te verzenden. | Lees het logboek van gesimuleerde afdrukken. | [Logboek gesimuleerde afdrukken](#screen-simulated_print) |

### Interfaceberichten die vastzitten {#ch9-matrix-interfaces}

| Symptoom | Waarschijnlijke oorzaak | Oplossing | Scherm |
|---|---|---|---|
| Een bericht staat in **Uitgaande interface-DLQ** met de fout **Verzending afgewezen**, **Time-out bij verzending** of **Engine onbereikbaar**. | De interface-engine gaf geen 2xx terug (`DISPATCH_REJECTED`, `DISPATCH_TIMEOUT`, `DISPATCH_UNREACHABLE`). Het bericht wordt bewaard voor een nieuwe poging. | Controleer de engine op het subtabblad **Engines**. Als hij in orde is, kiest u **Verzending opnieuw proberen** (vereist `interface:outbound:resend`). | [Systeemlogboeken: interfaces](#screen-audit-interfaces) |
| Opnieuw proberen antwoordt **Aangehouden in de uitgaande wachtrij: geef het daar eerst vrij.** | Het bericht is in de uitgaande wachtrij aangehouden. | Geef het op dat scherm vrij en verzend het dan opnieuw. | [Systeemlogboeken: interfaces](#screen-audit-interfaces) |
| Opnieuw proberen antwoordt **Vastgehouden: de pdf van het verslag is nog niet beschikbaar.** | Het verslagdocument is nog niet gegenereerd. | Wacht. Het wordt bij een latere poging met de pdf verzonden. | [Systeemlogboeken: interfaces](#screen-audit-interfaces) |
| Een verrichting staat in de **Uitgaande DLQ** (financieel) met **ICD-10-code ontbreekt** of **NPI van zorgverlener ontbreekt**. | De verrichting kan zonder de code of de NPI niet worden opgebouwd (`MISSING_ICD10`, `MISSING_PROVIDER_NPI`). | Voer de waarde in op de regel; de regel heeft voor elk een invoerveld. | [Systeemlogboeken: financieel](#screen-audit-financial) |
| Een taak onder **Servertaken** kan niet opnieuw in de wachtrij worden gezet: **Verzend deze taak opnieuw vanuit Interfaces.** | Interface- en afdruktaken worden vanuit hun eigen schermen opnieuw verzonden (`WRONG_SCREEN`). | Gebruik de interface- of afdrukwachtrij, met `interface:outbound:resend` of `print:job:retry`. | [Systeemlogboeken: interfaces](#screen-audit-interfaces) |
| Een nieuwe poging antwoordt **Deze taak is niet meer mislukt; misschien is hij al opnieuw in de wachtrij gezet.** | Iemand heeft hem al opnieuw in de wachtrij gezet (`NOT_DEAD_LETTERED`). | Vernieuw. Geen actie nodig. | [Systeemlogboeken](#screen-audit-log) |
| Openstaande interface-uitzonderingen (een tellerbadge op het tabblad **Interfacelogboek**). | Inkomende berichten die niet aan een patiënt of casus konden worden gekoppeld, wachten op een persoon. | Open het subtabblad **Interface-uitzonderingen** en beoordeel elk bericht. | [Systeemlogboeken: interfaces](#screen-audit-interfaces) |

### Aanmelden mislukt {#ch9-matrix-signin}

| Symptoom | Waarschijnlijke oorzaak | Oplossing | Scherm |
|---|---|---|---|
| **Onjuist e-mailadres of wachtwoord**, daarna **Nog één mislukte poging blokkeert het aanmelden met dit e-mailadres gedurende 15 minuten.** | Aanmelden met een wachtwoord blokkeert een e-mailadres na 5 mislukte pogingen achter elkaar, gedurende 15 minuten. De teller geldt per ingetypt e-mailadres, ook als dat bij geen enkel account hoort. | Wacht 15 minuten, of stel een nieuw wachtwoord in voor de persoon: een wachtwoord instellen heft de blokkade op. Het auditlogboek bevat **Sign-in failed**, **Sign-in locked** en **Sign-in refused**. | [Medewerkers](#screen-staff-members) |
| **Vraag uw beheerder uw wachtwoord opnieuw in te stellen via het scherm Medewerkers.** | De persoon is het wachtwoord vergeten. Het aanmeldformulier biedt geen zelfservice voor opnieuw instellen. | Stel een tijdelijk wachtwoord in op het record van de persoon. De persoon moet bij de volgende aanmelding een eigen wachtwoord kiezen. | [Medewerkers](#screen-staff-members) |
| Single sign-on: **U bent aangemeld, maar er is geen actief PathScribe-account voor u.** | Er komt geen personeelsrecord overeen (`not_provisioned`). | Voeg de persoon toe als medewerker. De eerste single sign-on koppelt via het e-mailadres. | [Medewerkers](#screen-staff-members) |
| Single sign-on: **Uw PathScribe-account is inactief.** | Het personeelsrecord is inactief. | Activeer het opnieuw. | [Medewerkers](#screen-staff-members) |
| Single sign-on: **Meer dan één PathScribe-account komt overeen met deze aanmelding.** | Twee personeelsrecords hebben hetzelfde e-mailadres (`ambiguous`). | Verwijder het duplicaat. | [Medewerkers](#screen-staff-members) |
| Single sign-on: **Dit PathScribe-account is al gekoppeld aan een ander aanmeldaccount.** | Een opnieuw toegewezen mailbox: het record is bij dezelfde provider aan een andere identiteit gekoppeld (`already_linked`). | Ontkoppel het oude account op het record van de persoon en meld u opnieuw aan. | [Medewerkers](#screen-staff-members) |
| Single sign-on: **Uw PathScribe-account geeft geen toegang tot deze toepassing.** | De rollen van de persoon geven geen toegang tot casussen en ook niet tot configuratie (`no_app_access`). | Geef de persoon een rol met toegang. | [Rollen](#screen-staff-roles) |
| Single sign-on: **Uw organisatie vereist een tweede factor en de aanmeldservice heeft er geen gemeld.** | De identiteitsprovider meldde geen tweede factor (`mfa_required`). | Voltooi de tweede factor bij de identiteitsprovider. | [Sessiebeveiliging](#screen-session_security) |
| **Aanmelden is voor deze installatie niet ingesteld. Neem contact op met uw systeembeheerder.** | De build heeft geen aanmelding geconfigureerd. | Corrigeer `config.json` (zie de opstartcodes hieronder). | [Opstartconfiguratiecodes](#ch9-codes-config) |
| Een **PathScribe kan niet starten: de configuratie moet worden gecorrigeerd** over de volle pagina, met een lijst codes. | `config.json` bevat een instelling die het product weigert. PathScribe start niet met onjuiste instellingen. | Corrigeer `config.json` op de webserver en laad opnieuw. Elke code staat in de index. | [Opstartconfiguratiecodes](#ch9-codes-config) |
| Codes voor de tweede factor: **Die code is al gebruikt. Wacht op de volgende.** of **Te veel pogingen. Codes voor de tweede factor zijn geblokkeerd tot <time>.** | De code is opnieuw gebruikt, of er zijn te veel onjuiste codes ingevoerd. | Wacht op de volgende code, of tot het tijdstip waarop de blokkade eindigt. | [Sessiebeveiliging](#screen-session_security) |
| **Dit account is al aangemeld op een ander tabblad of venster in deze browser.** | PathScribe staat per account en per browser één actieve sessie toe. | Ga door om de andere sessie af te melden (niet-opgeslagen werk blijft bewaard en wordt ter beoordeling aangeboden). | [Sessiebeveiliging](#screen-session_security) |

### Een interfacebericht of scherm lijkt vast te zitten {#ch9-matrix-stuck}

| Symptoom | Waarschijnlijke oorzaak | Oplossing | Scherm |
|---|---|---|---|
| Een scherm meldt **De PathScribe-server is niet bereikbaar. Probeer het zo meteen opnieuw.** | De browser kon de API-server niet bereiken, of die antwoordde met een serverfout (`UNAVAILABLE`), of antwoordde niet binnen 30 seconden (`TIMED_OUT`). | Controleer het netwerkpad en de gezondheid van de API-server. Het scherm probeert het opnieuw waar het dat zegt (bijvoorbeeld het enginepaneel elke minuut). | [Systeemlogboeken](#screen-audit-log) |
| **Uw sessie is beëindigd. Meld u opnieuw aan.** | De server gaf 401 terug (`SIGNED_OUT`). | Meld u opnieuw aan. | [Sessiebeveiliging](#screen-session_security) |
| **Dit is al gedaan. Vernieuw en kijk opnieuw.** of een opslag die een conflict meldt. | Iemand anders heeft hetzelfde record gewijzigd (`CONFLICT`). | Vernieuw het scherm en voer de wijziging opnieuw uit. | [Systeemlogboeken](#screen-audit-log) |
| Een export blijft **Wordt voorbereid**, of eindigt met **De export duurde te lang en is gestopt.** | Een build wordt na 30 minuten gestopt (`TIMED_OUT`). | Verfijn de filters en exporteer opnieuw. | [Mijn exports](#screen-my-exports) |
| **Er worden al 3 exports voor u voorbereid.** | Eén gebruiker mag 3 open exports hebben (`TOO_MANY_OPEN`). | Wacht tot er één klaar is, of annuleer er één. | [Mijn exports](#screen-my-exports) |

## Index van systeemfoutcodes {#ch9-error-codes}
Breadcrumb: Start > Beheerdershandleiding > Bijlagen > Index van systeemfoutcodes

**Status:** Gerealiseerd

**Wat deze index omvat.** De codes in hoofdletters in de broncode die een beheerder op een scherm kan zien, in het Foutenlogboek kan lezen of in een contract kan vinden. Elke rij geeft het scherm waarop de code verschijnt, wat hij betekent en wat u moet doen. Het contract dat in de tweede kolom wordt genoemd, staat in `docs/architecture/`; waar geen contract een code vermeldt, noemt de rij het servicebestand.

**Hoe codes op een scherm komen.** De API-client geeft elke mislukte aanroep een korte vaste code en gebruikt nooit de berichttekst van de server, omdat die tekst een patiënt zou kunnen noemen. Een servercode wordt gebruikt als hij bestaat uit hoofdletters, cijfers en underscores, 2 tot 40 tekens lang is en met een letter begint. Anders volgt de code uit de HTTP-status.

| Status | Code |
|---|---|
| 401 | `SIGNED_OUT` |
| 403 | `NOT_PERMITTED` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 400, 422 | `INVALID` |
| 429 | `TOO_MANY_REQUESTS` |
| al het andere | `UNAVAILABLE` |

Er bestaan ook redenen in kleine letters (bijvoorbeeld de aanmeldredenen `not_provisioned` en `inactive`, en de `capability_refused`, `support_access_disabled` en `support_access_not_approved` van de server). Het zijn geen codes in hoofdletters, dus ze staan in de matrix hierboven en op het scherm [Supporttoegang](#screen-support_access), niet in deze index.

### Codes die elk scherm met een servergegevensbron kan tonen {#ch9-codes-http}

| Foutcode | Waar hij verschijnt | Betekenis | Wat u doet |
|---|---|---|---|
| `SIGNED_OUT` | Elk scherm dat de API-server aanroept. Contract: `HTTP_SERVICES_PATTERN.md` sectie 4; `src/services/apiServer/apiHttpClient.ts`. | De server antwoordde 401: de aanmelding is beëindigd of het token is niet geaccepteerd. | Meld u opnieuw aan. Komt het meteen na het aanmelden terug, meld het dan aan de support van ForMedrixAI. |
| `NOT_PERMITTED` | Elk scherm met een servergegevensbron. Contract: `HTTP_SERVICES_PATTERN.md`; `AUTHORIZATION_API.md`. | De server antwoordde 403: de machtiging ontbreekt, of ligt buiten de faciliteiten van de persoon. | Zie de matrixrijen over grijze knoppen. Zoek in [Systeemlogboeken](#screen-audit-log) naar **Capability refused**. |
| `NOT_FOUND` | Elk scherm met een servergegevensbron. Contract: `HTTP_SERVICES_PATTERN.md`. | Het record bestaat niet meer, bijvoorbeeld omdat iemand anders het heeft verwijderd of buiten gebruik gesteld. | Vernieuw en open het opnieuw. |
| `CONFLICT` | Elk scherm met een opslag met versiebeheer. Contract: `HTTP_SERVICES_PATTERN.md` (opslag met versiebeheer). | De server antwoordde 409: het record is gewijzigd sinds het is gelezen. Bij een casus geeft de server ook de versie terug die hij heeft. | Vernieuw en voer de wijziging opnieuw uit. |
| `INVALID` | Elke opslag naar de server. Contract: `HTTP_SERVICES_PATTERN.md`. | De server antwoordde 400 of 422: hij weigerde de waarden. | Controleer de invoer op het formulier en sla opnieuw op. |
| `TOO_MANY_REQUESTS` | Elk scherm met een servergegevensbron. Contract: `HTTP_SERVICES_PATTERN.md`; `STAFF_ADMIN_API.md`. | De server antwoordde 429: een limiet voor het aantal aanvragen is bereikt. | Wacht even en probeer het opnieuw. Herhaalde gevallen gaan naar de support van ForMedrixAI. |
| `TIMED_OUT` | Elk scherm met een servergegevensbron; de lijst met exports. Contract: `HTTP_SERVICES_PATTERN.md`; `ASYNC_EXPORT_API.md` sectie 4. | De aanroep kreeg binnen 30 seconden geen antwoord (de standaard van de client). Bij een exportbuild werd de build na 30 minuten gestopt. | Probeer het opnieuw. Verfijn bij een export de filters. |
| `UNAVAILABLE` | Elk scherm met een servergegevensbron, bijvoorbeeld de lijst met werkstations, de lijst met site-agents, het enginepaneel en Servertaken. Contract: `HTTP_SERVICES_PATTERN.md`. | De server was niet bereikbaar, antwoordde met een andere status, of stuurde een antwoord dat geen JSON-object was. | Controleer het netwerk en de API-server. Probeer het opnieuw. |
| `NOT_SUPPORTED` | Een actie die alleen in de demonstratie bestaat, op een serverimplementatie. Contract: `HTTP_SERVICES_PATTERN.md`; `src/services/apiServer/httpServiceExtras.ts`. | De methode bestaat alleen voor de demonstratie (het aanmaken van demogegevens). De serverversie doet geen aanroep. | Niets. Verwacht gedrag bij een serverimplementatie. |
### Weigeringen van machtiging en goedkeuring {#ch9-codes-permission}

| Foutcode | Waar hij verschijnt | Betekenis | Wat u doet |
|---|---|---|---|
| `CONFIG_NOT_PERMITTED` | Elke opslag in Configuratie. Contract: `AUTHORIZATION_API.md`; `src/services/authorization/guardConfigWrites.ts`. | De rollen van de persoon missen de machtiging voor dat scherm, dus er is niets opgeslagen. De pagina Configuratie toont de naam van de machtiging. | Verleen de machtiging bij [Rollen](#screen-staff-roles). |
| `EXPORT_NOT_PERMITTED` | Export van zoekresultaten van casussen en export van casusverslagen. Contract: `CASE_SEARCH_API.md`; `AUTHORIZATION_API.md` (exports). | De exportmachtiging (`search:case-results:export` of `search:case-report:export`) ontbreekt. Er worden geen rijen teruggegeven. | Verleen de machtiging. |
| `SEPARATION_OF_DUTIES` | Opslaan van een rol en opslaan van medewerkers. Contract: `AUTHORIZATION_API.md` (functiescheiding). | Eén rol of één persoon zou zowel `config:clinical-mismatch-rules:manage` als `config:ai-prompt:approve` hebben. | Laat de twee machtigingen bij verschillende rollen en verschillende personen berusten. |
| `SELF_APPROVAL` | AI-instructies. Contract: `AUTHORIZATION_API.md`; [AI-instructies](#screen-ai_instructions). | De persoon heeft de openstaande tekst bewerkt en kan hem dus niet goedkeuren. | Laat een andere houder van `config:ai-prompt:approve` hem goedkeuren. |
| `AI_VENDOR_NOT_ALLOWED` | Elke AI-functie. Contract: `AI_PROXY.md`; `src/services/aiIntegration/aiCallPolicy.ts`. | Het AI-leveranciersbeleid weigert de dienst of de regio voor de jurisdictie. De aanroep wordt niet gedaan en wordt geaudit als `AI_CALL_REFUSED`. De functie gaat zonder AI verder en meldt ‘AI is niet beschikbaar voor deze jurisdictie.’ | Wijzig de regel of de hostingregio op het tabblad [AI-gedrag](#screen-tab-ai), als het beleid van het lab dat toestaat. |

### Exports {#ch9-codes-exports}

| Foutcode | Waar hij verschijnt | Betekenis | Wat u doet |
|---|---|---|---|
| `INVALID_PARAMETERS` | [Mijn exports](#screen-my-exports). Contract: `ASYNC_EXPORT_API.md` sectie 3. | De server kon de filters niet gebruiken. | Wijzig de filters en exporteer opnieuw. |
| `TOO_MANY_ROWS` | [Mijn exports](#screen-my-exports). Contract: `ASYNC_EXPORT_API.md`. | Er kwamen meer dan 1.000.000 rijen overeen. | Verfijn de filters. |
| `TOO_MANY_OPEN` | [Mijn exports](#screen-my-exports). Contract: `ASYNC_EXPORT_API.md`. | De persoon heeft al 3 exports in de wachtrij of in uitvoering. | Wacht, of annuleer er één. |
| `BUILD_FAILED` | [Mijn exports](#screen-my-exports). Bron: `src/services/exports/asyncExportContract.ts`. | De server kon het bestand niet maken. Een build krijgt 2 pogingen. | Probeer het opnieuw. Mislukt het weer, meld het dan aan de support van ForMedrixAI. |
| `CANCELLED` | [Mijn exports](#screen-my-exports). Bron: `src/i18n/locales/en.json` (`exports.problem`). | De export is geannuleerd. | Exporteer opnieuw als de export nog nodig is. |
| `EXPIRED` | [Mijn exports](#screen-my-exports); de site-agent. Contract: `ASYNC_EXPORT_API.md`; `SITE_AGENT_API.md` sectie 6. | Bij een export: het bestand is na de bewaartermijn verwijderd (standaard 7 dagen, 1 tot 30 door het lab in te stellen). Bij een taak van een site-agent: de taak is niet op tijd gestart en is teruggegeven. | Exporteer opnieuw. Zie voor een taak de afdrukrijen hieronder. |

### Opstartconfiguratie {#ch9-codes-config}

Deze verschijnen op het scherm over de volle pagina **PathScribe kan niet starten: de configuratie moet worden gecorrigeerd**. PathScribe start niet totdat ze zijn gecorrigeerd. De instellingen en de regels staan in `RUNTIME_CONFIG.md` sectie 3. De code is `src/services/runtimeConfig/runtimeSettings.ts`.

| Foutcode | Waar hij verschijnt | Betekenis | Wat u doet |
|---|---|---|---|
| `UNREADABLE` | Opstartscherm. | `config.json` is geen geldige JSON. | Corrigeer het bestand. |
| `NOT_AN_OBJECT` | Opstartscherm. | `config.json` moet een lijst met instellingen en waarden zijn (een JSON-object). | Corrigeer het bestand. |
| `UNKNOWN_SETTING` | Opstartscherm. | De naam is geen van de instellingen die PathScribe kent, of is een naam die alleen voor de build geldt. | Controleer de spelling aan de hand van `RUNTIME_CONFIG.md`. |
| `NOT_TEXT` | Opstartscherm. | Een waarde moet tekst, een getal, of waar of onwaar zijn. | Corrigeer de waarde. |
| `TOO_LONG` | Opstartscherm. | Een waarde is langer dan 2.000 tekens. | Kort hem in. |
| `INVALID_URL` | Opstartscherm. | De waarde moet een webadres zijn, of een pad op deze site dat met `/` begint, zonder gebruikersnaam of wachtwoord erin. | Corrigeer het adres. |
| `NOT_HTTPS` | Opstartscherm. | Een adres moet https gebruiken. Gewoon http is alleen toegestaan naar deze computer in een ontwikkelbuild. | Gebruik een https-adres. |
| `NOT_THIS_SITE` | Opstartscherm. | Een proxypad leidt naar een andere site (bijvoorbeeld `//host`). | Gebruik een pad op deze site, of een https-adres. |
| `API_SERVER_REQUIRED` | Opstartscherm. | Een serverbuild heeft het adres van de PathScribe-server nodig en er is er geen ingesteld. | Stel het API-adres in. |
| `SSO_REQUIRED` | Opstartscherm. | Een serverbuild meldt uitsluitend aan via de identiteitsprovider, dus `VITE_AUTH_MODE` moet `sso` zijn. | Stel dat in, samen met de instellingen van de provider. |
| `API_SERVER_IN_DEMO_BUILD` | Opstartscherm. | Een demonstratiebuild praat nooit met een echte server. | Installeer een serverbuild. |
| `NOT_IN_DEMO_BUILD` | Opstartscherm. | Een demonstratiebuild kan geen hub, renderer, interfaceontvanger of instelling voor servertaken gebruiken en is nooit productie. | Installeer een serverbuild. |
| `ADDRESS_NOT_FROM_SERVER` | Opstartscherm, gemarkeerd met ‘(uit /api/config van de PathScribe-server)’. | De server mag geen adres instellen, omdat het beveiligingsbeleid van de site uit `config.json` wordt opgebouwd. | Zet het adres in `config.json`. |
| `NOT_FROM_SERVER` | Opstartscherm, gemarkeerd met ‘(uit /api/config van de PathScribe-server)’. | Alleen `config.json` of de build mag deze instelling bepalen (aanmelding, de rol van de instantie, welke taken de server uitvoert). | Verplaats de instelling naar `config.json`. |

### Afdrukken, etiketten en de site-agent {#ch9-codes-print}

De eerste zes codes hebben een eigen berichttekst. Het contract voor de codes van de agent is `SITE_AGENT_API.md` sectie 6; de lijst is `AGENT_ERROR_CODES` in `src/services/siteAgent/siteAgentContract.ts`. Het afdrukken van verslagen wordt opnieuw geprobeerd volgens het bezorgschema van het lab (standaard na 1, 5 en 15 minuten, tot 10 nieuwe pogingen). Etiketten worden nooit uit zichzelf opnieuw geprobeerd.

| Foutcode | Waar hij verschijnt | Betekenis | Wat u doet |
|---|---|---|---|
| `PRINTER_UNREACHABLE` | Melding bij een etiket; Afdrukwachtrij. Contract: `SITE_AGENT_API.md`. | Geen verbinding met de printer. Bij verslagen wordt het opnieuw geprobeerd. | Controleer de stroom en het netwerk van de printer en probeer het opnieuw. |
| `PAPER_OUT` | Melding bij een etiket; Afdrukwachtrij. Contract: `SITE_AGENT_API.md`. | De etikettenprinter heeft geen etiketten meer. | Plaats etiketten en probeer het opnieuw. |
| `RIBBON_OUT` | Melding bij een etiket; Afdrukwachtrij. Contract: `SITE_AGENT_API.md`. | Het lint van de etikettenprinter is op. | Plaats een lint en probeer het opnieuw. |
| `HEAD_OPEN` | Melding bij een etiket; Afdrukwachtrij. Contract: `SITE_AGENT_API.md`. | De printkop staat open. | Sluit hem en probeer het opnieuw. |
| `MALFORMED_ZPL` | Melding bij een etiket. Contract: `SITE_AGENT_API.md`. | De printer heeft de etiketopmaak geweigerd. Wordt niet opnieuw geprobeerd. | Meld het aan de support van ForMedrixAI. |
| `INVALID_GS1` | Melding bij een etiket. Contract: `SITE_AGENT_API.md`. | De barcode van het etiket heeft de GS1-validatie niet doorstaan. Wordt niet opnieuw geprobeerd. | Meld het aan de support van ForMedrixAI. Controleer de GTIN bij [Afdrukinstellingen](#screen-print_settings). |
| `NEEDS_SITE_AGENT` | [Afdrukwachtrij](#screen-audit-interfaces). Contract: `SITE_AGENT_API.md`; `src/services/printing/printJobFailureReason.ts`. | Een browser kan niet naar een netwerkprinter verzenden. De taak mislukt meteen en gaat naar de uitzonderingswachtrij. | Gebruik een printer van een site-agent. Zie [Site-agents](#screen-site_agents). |
| `PRINTER_OFFLINE` | [Afdrukwachtrij](#screen-audit-interfaces). Bron: `src/services/printing/attemptPrintDelivery.ts`. | QZ Tray is op de afdrukcomputer niet verbonden. Wordt opnieuw geprobeerd. | Start QZ Tray. |
| `PRINT_REJECTED` | [Afdrukwachtrij](#screen-audit-interfaces). Bron: `attemptPrintDelivery.ts`, `redispatchPrintJob.ts`. | Een taak kan niet worden afgedrukt, bijvoorbeeld omdat er geen printer is geconfigureerd voor aflevering via QZ Tray, of omdat het verslagdocument niet kon worden gemaakt. | Corrigeer de printerinstellingen en probeer het opnieuw. |
| `PRINTER_REJECTED` | Afdrukwachtrij. Contract: `SITE_AGENT_API.md`. | De printer heeft de taak geweigerd. Wordt niet opnieuw geprobeerd. | Kijk op de eigen foutweergave van de printer. |
| `DOCUMENT_UNAVAILABLE` | Afdrukwachtrij. Contract: `SITE_AGENT_API.md`. | De downloadlink van de agent is mislukt of verlopen. Wordt opnieuw geprobeerd. | In eerste instantie niets. Houdt het aan, meld het dan aan de support van ForMedrixAI. |
| `DOCUMENT_INTEGRITY` | Afdrukwachtrij. Contract: `SITE_AGENT_API.md`. | De SHA-256 van het bestand kwam niet overeen, dus het is nooit afgedrukt. Wordt niet opnieuw geprobeerd. | Meld het aan de support van ForMedrixAI. |
| `UNKNOWN_DESTINATION` | Afdrukwachtrij; bestandsafgifte. Contract: `SITE_AGENT_API.md`. | De agent heeft geen printer of share met die id (zijn configuratie is verouderd). | Werk de printerlijst van de agent bij op [Site-agents](#screen-site_agents). |
| `SHARE_UNREACHABLE` | Aflevering via bestandsafgifte. Contract: `SITE_AGENT_API.md`. | De share kon niet worden bereikt. Wordt opnieuw geprobeerd. | Controleer de share. |
| `SHARE_ACCESS_DENIED` | Aflevering via bestandsafgifte. Contract: `SITE_AGENT_API.md`. | De agent mag niet naar de share schrijven. Wordt niet opnieuw geprobeerd. | Corrigeer de rechten van de share. |
| `SHARE_FULL` | Aflevering via bestandsafgifte. Contract: `SITE_AGENT_API.md`. | De share is vol. Wordt opnieuw geprobeerd. | Maak ruimte vrij. |
| `IN_DOUBT` | Afdrukwachtrij. Contract: `SITE_AGENT_API.md`. | De agent stopte nadat hij was begonnen met verzenden en voordat hij het resultaat kende. Wordt nooit uit zichzelf opnieuw verzonden. | Controleer de printer. Druk opnieuw af als de pagina er niet is. |
| `AGENT_ERROR` | Afdrukwachtrij. Contract: `SITE_AGENT_API.md`. | Elke andere fout van de agent. Wordt opnieuw geprobeerd. | Controleer de agent op [Site-agents](#screen-site_agents). |

### Uitgaande berichten, verrichtingen, registers en servertaken {#ch9-codes-outbound}

| Foutcode | Waar hij verschijnt | Betekenis | Wat u doet |
|---|---|---|---|
| `DISPATCH_REJECTED` | [Systeemlogboeken: interfaces](#screen-audit-interfaces) (getoond als ‘Verzending afgewezen’). Contract: `INTERFACE_TRANSACTIONS.md`. | De engine gaf geen 2xx terug. Het bericht wordt bewaard voor een nieuwe poging. | Controleer de engine en kies dan **Verzending opnieuw proberen**. |
| `DISPATCH_TIMEOUT` | [Systeemlogboeken: interfaces](#screen-audit-interfaces) (getoond als ‘Time-out bij verzending’). Contract: `OUTBOUND_QUEUE_API.md`; `INTERFACE_TRANSACTIONS.md`. | De engine antwoordde niet op tijd. | Zoals hierboven. |
| `DISPATCH_UNREACHABLE` | [Systeemlogboeken: interfaces](#screen-audit-interfaces) (getoond als ‘Engine onbereikbaar’). Contract: `INTERFACE_TRANSACTIONS.md`. | De engine kon niet worden bereikt. | Zoals hierboven. |
| `MISSING_ICD10` | [Systeemlogboeken: financieel](#screen-audit-financial). Contract: `DIAGNOSIS_CODING.md`; `src/services/billing/validateChargeMetadata.ts`. | Een verrichting heeft geen ICD-10-code. | Voer de code in op de regel. |
| `MISSING_PROVIDER_NPI` | [Systeemlogboeken: financieel](#screen-audit-financial). Bron: `validateChargeMetadata.ts`. | Een verrichting heeft geen NPI van de zorgverlener. | Voer de NPI in op de regel. |
| `REGISTRY_NOT_READY` | Uitgaande wachtrij; Registeruitzonderingen. Contract: `BATCH_REGISTRY_FEED_API.md`; `REGISTRY_ACKNOWLEDGEMENT_API.md`. | Een inzending aan een register wordt vastgehouden: een verplicht veld of een instelling ontbreekt. | Vul het ontbrekende onderdeel aan dat bij de vermelding staat. |
| `REGISTRY_LIVE_NOT_APPROVED` | Uitgaande wachtrij; Registeruitzonderingen. Contract: `REGISTRY_GO_LIVE_API.md`. | Een echte casus is geautoriseerd, maar de registerverbinding is niet live goedgekeurd. De vermelding toont ‘Vastgehouden: attestatie vereist’. | Voltooi de goedkeuring voor livegang op het instellingenscherm van het register. |
| `NOT_DEAD_LETTERED` | Servertaken. Contract: `MESSAGE_BUS_API.md`. | De taak is niet meer mislukt (409). | Vernieuw. |
| `WRONG_SCREEN` | Servertaken. Bron: `src/services/serverJobs/serverJobsContract.ts`. | Interface- en afdruktaken worden hier niet opnieuw in de wachtrij gezet. | Verzend opnieuw vanuit de interface- of afdrukwachtrij. |
| `CONSULT_LINK_NOT_ACTIVE` | Tabblad Consultlinks. Contract: `CONSULT_ACCESS_API.md`. | De link is al ingetrokken of verlopen. | Vernieuw. |
| `NO_RECIPIENTS` | Rapportageschema's. Contract: `SCHEDULED_REPORTS_API.md`. | Er is geen actieve ontvanger meer over. | Kies ten minste één ontvanger. |
| `TOO_MANY_SCHEDULES` | Rapportageschema's. Contract: `SCHEDULED_REPORTS_API.md`. | De persoon heeft het maximaal toegestane aantal schema's. | Verwijder of voeg een schema samen. |
| `RECIPIENT_ACCESS_UNKNOWN` | Rapportageschema's. Contract: `SCHEDULED_REPORTS_API.md`. | Wat een ontvanger mag zien, kon niet worden bepaald, dus er is niets opgebouwd. | Controleer de rollen en faciliteiten van de ontvanger. |
| `RUN_FAILED` | Rapportageschema's. Bron: `src/services/scheduledReports/createScheduledReportService.ts`. | Een geplande uitvoering is mislukt. | Kijk in het Foutenlogboek. |

### Configuratieschermen: weigeringen die u moet kennen {#ch9-codes-config-screens}

| Foutcode | Waar hij verschijnt | Betekenis | Wat u doet |
|---|---|---|---|
| `REASON_REQUIRED` | [Code-import](#screen-code_import), intrekking van werkstations en feeds, en verschillende casusacties. Bron: de service van elk scherm. | Voor de wijziging is een reden vereist. | Voer een reden in. |
| `BAD_DATE` | [Codesystemen](#screen-code_systems). Bron: `src/services/coding/codeSystemPolicyRules.ts`. | Een datum is geen bestaande kalenderdatum. | Corrigeer hem. |
| `BAD_ROLE` | [Codesystemen](#screen-code_systems). Bron: `codeSystemPolicyRules.ts`. | Een rol in een regel is niet geldig. | Kies een geldige rol. |
| `BAD_SYSTEM` | [Codesystemen](#screen-code_systems). Bron: `codeSystemPolicyRules.ts`. | Een codesysteem is leeg of niet geldig. | Kies een codesysteem. |
| `DUPLICATE` | [Codesystemen](#screen-code_systems). Bron: `codeSystemPolicyRules.ts`. | Hetzelfde codesysteem heeft twee rijen met dezelfde begindatum. | Verwijder één rij of geef haar een andere datum. |
| `NO_RULES` | [Codesystemen](#screen-code_systems). Bron: `codeSystemPolicyRules.ts`. | Er zijn geen regels. | Voeg een regel toe, of herstel de standaard. |
| `TOO_MANY` | [Codesystemen](#screen-code_systems). Bron: `codeSystemPolicyRules.ts`. | Er zijn te veel regels. | Verwijder er een aantal. |
| `SAME_PERSON` | [Code-import](#screen-code_import). Bron: `src/services/billing/codeEngine/planImportJob.ts`. | De persoon die de import heeft geüpload, kan hem niet goedkeuren of afwijzen (vierogenprincipe). | Een andere persoon moet beslissen. |
| `JOB_NOT_APPROVED` | [Code-import](#screen-code_import). Bron: `planImportJob.ts`. | Alleen een goedgekeurde import kan worden teruggedraaid. | Geen. |
| `JOB_NOT_PENDING` | [Code-import](#screen-code_import). Bron: `planImportJob.ts`. | De import wacht niet meer op goedkeuring. | Vernieuw. |
| `MAPPING_INCOMPLETE` | [Code-import](#screen-code_import). Bron: `src/services/billing/mockCodeImportService.ts`. | De kolommen voor factuurcode, CPT-code en ingangsdatum zijn niet alle gekoppeld. | Koppel ze, of geef één ingangsdatum voor het hele bestand. |
| `NO_ROWS` | [Code-import](#screen-code_import). Bron: `mockCodeImportService.ts`. | Het bestand heeft geen rijen die kunnen worden geïmporteerd. | Controleer het bestand. |
| `ROWS_REFUSED` | [Code-import](#screen-code_import). Bron: `mockCodeImportService.ts`. | Een aantal rijen kan niet worden geïmporteerd. | Corrigeer ze, of kies ervoor ze over te slaan. |
| `ROW_MISSING` | [Code-import](#screen-code_import). Bron: `mockCodeImportService.ts`. | Een codeversie uit de import bestaat niet meer, dus hij kan niet worden goedgekeurd. | Upload de import opnieuw. |
| `ROW_NOT_PENDING` | [Code-import](#screen-code_import). Bron: `mockCodeImportService.ts`. | Een codeversie uit de import wacht niet meer op goedkeuring. | Upload de import opnieuw. |
| `NAME_TAKEN` | [Werkstations](#screen-workstations), [Rapportagefeed](#screen-bi_feed). Bron: `src/services/workstationRegistry/workstationRegistryRules.ts`; `src/services/biFeed/biFeedRules.ts`. | Een ander actief werkstation van de faciliteit heeft die naam. | Kies een andere naam. |
| `ALREADY_REVOKED` | [Werkstations](#screen-workstations), [Rapportagefeed](#screen-bi_feed). Bron: dezelfde twee services. | Het werkstation is al ingetrokken. | Geen. |
| `REVOKE_REASON_INVALID` | [Werkstations](#screen-workstations), [Rapportagefeed](#screen-bi_feed). Bron: dezelfde twee services. | Er moet een reden worden gekozen, met een toelichting bij Overig. | Kies een reden. |
| `FEED_OFF` | [Rapportagefeed](#screen-bi_feed). Bron: `src/services/biFeed/biFeedRules.ts`. | De feed staat uit. | Zet hem aan in de feedinstellingen. |
| `DATASET_NOT_IN_FEED` | [Rapportagefeed](#screen-bi_feed). Bron: `biFeedRules.ts`. | Een dataset wordt niet door de feed aangeboden. | Voeg hem eerst toe aan de feedinstellingen. |
| `FACILITY_NOT_IN_FEED` | [Rapportagefeed](#screen-bi_feed). Bron: `biFeedRules.ts`. | Een faciliteit wordt niet door de feed aangeboden. | Voeg haar eerst toe aan de feedinstellingen. |
| `IDENTIFIED_NOT_APPROVED` | [Rapportagefeed](#screen-bi_feed). Bron: `biFeedRules.ts`. | Voor identificerende tokens moet een goedkeuring zijn vastgelegd. | Leg de goedkeuring vast. |
| `NOT_HL7` | [LIS-ontvangst (Assist-modus)](#screen-assist_lis_polling). Bron: `src/services/lisIngestion/adapters/hl7v2StatusAdapter.ts`. | Het bericht is geen HL7 v2-bericht (het moet met een MSH-segment beginnen). | Controleer het verzendende systeem. |
| `UNSUPPORTED_MESSAGE_TYPE` | [LIS-ontvangst (Assist-modus)](#screen-assist_lis_polling). Bron: `hl7v2StatusAdapter.ts`. | Alleen ORU^R01-, ORM^O01- en OML^O21-berichten worden geaccepteerd. | Stuur een ondersteund type. |
| `MISSING_ACCESSION` | [LIS-ontvangst (Assist-modus)](#screen-assist_lis_polling). Bron: `hl7v2StatusAdapter.ts`, `webhookJsonAdapter.ts`. | Het bericht heeft geen accessienummer. | Corrigeer de afzender. |
| `MISSING_STATUS` | [LIS-ontvangst (Assist-modus)](#screen-assist_lis_polling). Bron: `src/services/lisIngestion/types.ts`. | Het bericht heeft geen LIS-status. | Corrigeer de afzender. |
| `INVALID_JSON` | [LIS-ontvangst (Assist-modus)](#screen-assist_lis_polling). Bron: `types.ts`. | Het bericht is geen geldige JSON. | Corrigeer de afzender. |
| `CROSSWALK_DUPLICATE_STATUS` | [LIS-ontvangst (Assist-modus)](#screen-assist_lis_polling). Bron: `src/services/assistPolling/mockAssistPollingService.ts`. | Een LIS-status is twee keer gekoppeld. | Koppel elke status één keer. |
| `INTERVAL_OUT_OF_RANGE` | [LIS-ontvangst (Assist-modus)](#screen-assist_lis_polling). Bron: `mockAssistPollingService.ts`. | Het pollinginterval ligt buiten de toegestane hele minuten. | Voer een waarde in binnen het getoonde bereik. |
| `NHS_NUMBER_CHECK_DIGIT` | [Brits kankerregister (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | Het NHS-nummer voldoet niet aan zijn controlecijfer. | Corrigeer het nummer bij de casus. |
| `NHS_NUMBER_FORMAT` | [Brits kankerregister (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | Het NHS-nummer bestaat niet uit tien cijfers. | Corrigeer het. |
| `PATIENT_IDENTIFIER_MISSING` | [Brits kankerregister (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | Het NHS-nummer ontbreekt. | Voer het in. |
| `ICDO_MISSING` | [Brits kankerregister (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | Er is geen ICD-O-3-code. | Voeg hem toe aan de casus. |
| `ICDO_FORMAT` | [Brits kankerregister (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | Een ICD-O-3-code heeft niet de vorm `8500/3`. | Corrigeer hem. |
| `DIAGNOSIS_DATE_MISSING` | [Brits kankerregister (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | De diagnosedatum ontbreekt. | Voer hem in. |
| `XML_NOT_WELL_FORMED` | [Brits kankerregister (COSD)](#screen-cosd_destination); upload van protocollen. Contract: `UK_COSD_API.md`; bron: `protocolUploadValidation.ts`. | Het voorbeeld, of het geüploade bestand, is geen goed gevormde XML. | Corrigeer de gegevens of het bestand. |
| `UNSUPPORTED_FORMAT` | Upload van protocollen in de Synoptische bibliotheek ([Synoptische bibliotheek](#screen-tab-protocols)). Bron: `src/services/templates/protocolUploadValidation.ts`. | Het bestandstype wordt niet ondersteund. Gebruik JSON, XML of XLSX. | Converteer het bestand. |
| `FILE_TOO_LARGE` | Upload van protocollen. Bron: `protocolUploadValidation.ts`. | Het bestand is groter dan 10 MB. | Verklein het. |
| `JSON_INVALID` | Upload van protocollen. Bron: `protocolUploadValidation.ts`. | Het bestand is geen geldige JSON. | Corrigeer het. |
| `JSON_NEWER_FORMAT` | Upload van protocollen. Bron: `protocolUploadValidation.ts`. | Het bestand is geëxporteerd door een nieuwere versie van PathScribe. | Werk PathScribe bij, of exporteer vanuit dezelfde versie. |
| `XML_NOT_SDC` | Upload van protocollen. Bron: `protocolUploadValidation.ts`. | De XML is geen CAP eCC-formulier (SDC). | Gebruik het juiste bestand. |
| `NOT_IMPORTABLE` | Upload van protocollen. Bron: `protocolUploadValidation.ts`. | De indeling kan worden gecontroleerd maar nog niet worden geïmporteerd. Importeren werkt voor PathScribe-protocolbestanden (JSON). | Gebruik een PathScribe-JSON-bestand. |
| `XLSX_NOT_MAPPED` | Upload van protocollen. Bron: `protocolUploadValidation.ts`. | De bladen van de werkmap zijn niet gelezen, dus kolommen zijn niet aan vragen gekoppeld. | Gebruik een ondersteunde indeling. |
| `PRODUCTION_GATED` | [Smart Capture](#screen-smart_capture). Bron: `src/services/smartCapture/smartCaptureStates.ts`. | Er is een echte interface-engine geconfigureerd en de productiepoort is gesloten, dus er is niets verzonden. | Open de productiepoort als het lab er klaar voor is. |
| `ALREADY_ACCESSIONED` | [Lockbox-afgifte](#screen-lockbox-drop-off). Contract: `LOCKBOX_API.md`. | Het ontvangstbewijs is al geaccessioneerd (409). | Geen. |
| `PLACEHOLDER_UNRESOLVED` | [Lockbox-afgifte](#screen-lockbox-drop-off). Contract: `LOCKBOX_API.md`. | Accessie is gevraagd voor een tijdelijke aanduiding zonder gekoppeld aanvraagnummer (409). | Koppel de tijdelijke aanduiding eerst aan haar aanvraag. |
| `NOT_A_PLACEHOLDER` | [Lockbox-afgifte](#screen-lockbox-drop-off). Contract: `LOCKBOX_API.md`. | Alleen een tijdelijke aanduiding kan aan een aanvraag worden gekoppeld. | Geen. |

## Naslag Systeemlogboeken {#ch9-system-logs}
Breadcrumb: Start > Beheerdershandleiding > Bijlagen > Naslag Systeemlogboeken

**Status:** Gerealiseerd

Systeemlogboeken is waar het overzicht van wat mensen, het systeem en de AI hebben gedaan, wordt gelezen. Dit deel beschrijft het scherm. Het volgende deel ([Handleiding voor verificatie van het auditlogboek](#ch9-audit-verification)) zegt hoe u het gebruikt om de vragen van een auditor te beantwoorden.

### Systeemlogboeken {#screen-audit-log}
Breadcrumb: Start > Systeemlogboeken

**Status:** Gerealiseerd. In de demonstratie wordt het auditlogboek in de browser bewaard; met een API-server wordt het door de server bewaard (zie Bekende beperkingen).

**1. Navigatie:** Starttegel **Systeemlogboeken** (adres `/audit`).
**2. Onderhoudsitem:** Systeemlogboeken (een naslagscherm; hier wordt niets ingericht).

**3. Doel en reikwijdte.** Eén scherm voor het compliancedossier van het lab: AI-acties, gebruikerswijzigingen, systeemgebeurtenissen, fouten, kwaliteitsborgingsactiviteit, interface- en afdrukactiviteit, mislukte financiële verzendingen, kritieke meldingen, externe consultlinks en de achtergrondtaken van de API-server. Het scherm is alleen-lezen, op drie acties na: een fout als **Oplossen** markeren, een mislukt interfacebericht of een mislukte afdruktaak opnieuw verzenden en een consultlink intrekken. Elk tabblad is een ander overzicht dat door een andere service wordt bijgehouden. De tabbladen Auditlogboek en Foutenlogboek worden hier beschreven. Het tabblad **Interfacelogboek** wordt beschreven in [Systeemlogboeken: interfaces](#screen-audit-interfaces) en het tabblad **Financieel** in [Systeemlogboeken: financieel](#screen-audit-financial).

**4. Randvoorwaarden en afhankelijkheden.** Het scherm toont alleen wat er is gebeurd, dus er hoeft niets vooraf te worden geconfigureerd, behalve wie het mag openen. Een persoon zonder `screen:audit-log:open` ziet geen starttegel en krijgt, als hij het adres intypt, de melding ‘U hebt geen toegang tot dit scherm’.

Setup step: Reference, not part of setup
Requires: [Rollen](#screen-staff-roles), [Medewerkers](#screen-staff-members)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-audit-log - Systeemlogboeken, tabblad Auditlogboek met typefilters, filters en CSV exporteren]

De paginakop luidt **Systeemlogboeken** met de ondertitel ‘Volledig overzicht van AI-acties, gebruikerswijzigingen, systeemgebeurtenissen, fouten en kwaliteitsborgingsactiviteiten’. Daarna volgt een tabbladenrij, dan een vak **Supportreferentie opzoeken** en dan het actieve tabblad. Een tellerbadge op **Foutenlogboek** toont de open fouten, op **Interfacelogboek** de openstaande interface-uitzonderingen en op **Kwaliteitsborging** de open kwaliteitsitems. Een persoon met de rol Patholoog ziet de mededeling ‘Alleen uw eigen dossieractiviteit wordt getoond — validatiestudie-gebeurtenissen zijn niet zichtbaar voor pathologen’.

[SCREENSHOT PLACEHOLDER: screen-audit-log-errors - Systeemlogboeken, tabblad Foutenlogboek]

**6. Veldreferentie.** Het scherm heeft filters, kolommen en knoppen in plaats van formuliervelden. Rijnamen beginnen met het tabblad.

#### Tabbladen

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Tabblad: Auditlogboek | Tabblad | Niet van toepassing | Elke auditvermelding die de persoon mag zien. Hieronder beschreven. | Geselecteerd bij het openen |
| Tabblad: Foutenlogboek | Tabblad | Niet van toepassing | Fouten die het systeem heeft vastgelegd, met een code. Hieronder beschreven. | Niet van toepassing |
| Tabblad: Interfacelogboek | Tabblad met subtabbladen Interface-uitzonderingen, Uitgaande interface-DLQ, Uitgaande verzendingen, Afdrukwachtrij, Engines | Niet van toepassing | Zie [Systeemlogboeken: interfaces](#screen-audit-interfaces). Het adres `?tab=interfaces` opent het. | Niet van toepassing |
| Tabblad: Kwaliteitsborging | Tabblad met een keuze Groep | Niet van toepassing | Acht groepen kwaliteitsrecords: Tekortkomingen, Peroperatieve koppeling, Discordantie & reconciliatie, Doorlooptijd medeondertekening, Bevoegdheidsbeoordeling, Afwijking na finalisatie, Beoordeling patiëntkoppeling en Managementbeoordelingen. Elke groep heeft eigen Status-keuzes. | Niet van toepassing |
| Tabblad: Financieel | Tabblad met subtabbladen Factureringslogboeken en Uitgaande DLQ | Niet van toepassing | Zie [Systeemlogboeken: financieel](#screen-audit-financial). | Niet van toepassing |
| Tabblad: Kritieke meldingen | Tabblad | Niet van toepassing | Het overzicht van meldingen over kritieke uitslagen. | Niet van toepassing |
| Tabblad: Consultlinks | Tabblad | Niet van toepassing | Elke externe consultlink bij elke casus, met **Alleen actief** en **Intrekken**. Getoond aan personen met `audit:consult-links:view`. | Niet van toepassing |
| Tabblad: Servertaken | Tabblad | Niet van toepassing | De achtergrondtaken van de API-server: gezondheid en dead letters, met opnieuw in de wachtrij zetten. Alleen getoond aan personen met `jobs:server-job:view`. Een link die zonder die machtiging wordt geopend, komt op Auditlogboek uit. | Verborgen zonder de machtiging |
| Supportreferentie opzoeken | Tekst, vorm `SR-XXXX-XXXX` | Optioneel | Noemt de casus, de auditvermelding, de foutvermelding of de interface-uitzondering waar een supportreferentie naar verwijst. Een opzoeking wordt zelf geaudit (`support_reference.resolved`). Valt de vermelding buiten het geladen bereik, dan zegt het scherm dat u de periode moet verruimen. | Leeg |

#### Tabblad Auditlogboek

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Auditlogboek: Typefilters | Keuze: Alle, AI, Gebruiker, Systeem, met aantallen | Optioneel | Filtert op het type van de vermelding. | Alle |
| Auditlogboek: Alleen patiëntbeheer | Ja/nee-selectievakje met aantal | Optioneel | Toont alleen gebeurtenissen waarvan de naam met `mpi.` begint (samenvoegen, verplaatsen, koppelen, opnieuw koppelen, bijwerken van demografische gegevens). Combineert met de andere filters. Een toekomstige `mpi.`-gebeurtenis wordt automatisch meegenomen. | Nee |
| Auditlogboek: Gebruikersfilter | Keuze uit elke gebruiker in de geladen vermeldingen | Optioneel | Alleen getoond in een Superadmin-sessie. Alle anderen vinden een persoon door de naam in het zoekvak te typen. | Alle gebruikers |
| Auditlogboek: Periode | Keuze: Vandaag, Laatste 7 dagen, Laatste 30 dagen, Laatste 90 dagen, Aangepaste periode | Optioneel | Afkapping in de tijdzone van de faciliteit. Aangepaste periode voegt een **van**- en een **tot**-datum toe; de einddatum omvat de hele dag. | Laatste 7 dagen |
| Auditlogboek: Zoeken | Tekst | Optioneel | Komt overeen met de gebeurtenisnaam, de detailtekst, de gebruiker en het casus-id (accessienummer), zonder onderscheid tussen hoofdletters en kleine letters. | Leeg |
| Auditlogboek: Exporteren als CSV | Knop | Niet van toepassing | Vereist `audit:audit-log:export`. Zie de verificatiehandleiding. Grijs zonder die machtiging. | Niet van toepassing |
| Auditlogboek: Tijdstempel | Kolom, `YYYY-MM-DD HH:MM:SS.mmm UTC` | Niet van toepassing | Wanneer de vermelding is geschreven, altijd getoond in UTC. | Niet van toepassing |
| Auditlogboek: Type | Kolom | Niet van toepassing | AI, Gebruiker of Systeem. | Niet van toepassing |
| Auditlogboek: Gebeurtenis | Kolom | Niet van toepassing | De gebeurtenisnaam, gevolgd door een chip met de supportreferentie. | Niet van toepassing |
| Auditlogboek: Detail | Kolom | Niet van toepassing | Engelse tekst, zonder patiëntnamen, geboortedatums, MRN's en klinische waarden. | Niet van toepassing |
| Auditlogboek: Gebruiker | Kolom | Niet van toepassing | De weergavenaam van de persoon of de systeemactor. Automatische acties tonen een systeemactor zoals `SYSTEM`. | Niet van toepassing |
| Auditlogboek: Dossier | Kolom | Niet van toepassing | Het accessienummer wanneer de vermelding een casus betreft. Klik erop om de casus te openen. | Niet van toepassing |

De vermelding bevat ook een betrouwbaarheidswaarde (voor AI-vermeldingen), een faciliteits-id en een scanstation-id. Ze worden opgeslagen en staan in het servercontract, maar het scherm toont er geen kolom voor en de CSV bevat de faciliteit of het station niet. Het faciliteits-id ontbreekt bij vermeldingen die zijn vastgelegd voordat het bestond of door code die het niet meegeeft.

#### Tabblad Foutenlogboek

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Foutenlogboek: Ernstfilters | Keuze: Alle, Fout, Waarschuwing, Info, met aantallen | Optioneel | Filtert op ernst. | Alle |
| Foutenlogboek: Status | Keuze: Alle statussen, Alleen open, Alleen opgelost | Optioneel | Filtert op oplossing. | Alle statussen |
| Foutenlogboek: Zoeken | Tekst | Optioneel | Komt overeen met bericht, code en bron. | Leeg |
| Foutenlogboek: Oplossen | Knop op elke open rij | Niet van toepassing | Vereist `audit:error:resolve`. Legt vast wie de fout heeft opgelost en wanneer; de rij toont dan ‘Opgelost door <name>, <time>’. | Niet van toepassing |
| Foutenlogboek: Exporteren als CSV | Knop | Niet van toepassing | Vereist `audit:error-log:export`. | Niet van toepassing |
| Foutenlogboek: kolommen | Tijdstempel, Ernst, Code, Bericht, Bron, Dossier, Status | Niet van toepassing | De kolom Code bevat de codes uit de [index](#ch9-error-codes). | Niet van toepassing |

**7. Machtigingen.**
- Het scherm openen: `screen:audit-log:open`. Beheerder, Laboratoriumdirecteur en QA-beoordelaar hebben die standaard. De rol Patholoog heeft die standaard niet.
- Exporteren: één machtiging per logboek, elk met hoog risico, elk met `screen:audit-log:open` als vereiste: `audit:audit-log:export`, `audit:error-log:export`, `audit:interface-log:export`, `audit:qa-log:export` en `audit:billing-log:export`. Rollen die het scherm openen, krijgen alle vijf vooraf toegekend. Elke export wordt zelf geaudit.
- Een fout oplossen: `audit:error:resolve` (hoog risico).
- Tabblad Consultlinks: `audit:consult-links:view`. Servertaken: `jobs:server-job:view`, en opnieuw in de wachtrij zetten met `jobs:server-job:requeue`.
- Afbakening op het scherm: Pathologen zien elke vermelding die een casus noemt, plus hun eigen vermeldingen zonder casus. Gebeurtenissen van validatiestudies (`validation_study_created`, `validation_study_activated`, `validation_study_closed`, `validation_study_deleted`, `validation_report_generated` en de drie `validation_routing_rule_*`-gebeurtenissen) zijn voor iedereen verborgen, behalve voor Beheerder, Patholoog-beheerder en Superadmin.
- Het bekijken van het logboek wordt zelf niet geaudit. Exports, het oplossen van een fout en een opzoeking van een supportreferentie wel.

**Bekende beperkingen.**
- **Geen bewijs van manipulatie in het hoofd-auditlogboek.** Het hoofd-auditlogboek is bewust alleen-toevoegen (de service kent geen aanroep om te wijzigen of te verwijderen en het servercontract geeft de databaseaanmelding van de toepassing zulke rechten niet), maar de vermeldingen zijn niet via hashes aan elkaar gekoppeld en niets op het scherm verifieert ze. Het enige record met een hashketen is het audit van [Supporttoegang](#screen-support_access). Zie de verificatiehandleiding.
- **Bewaring is een instelling, wordt niet afgedwongen.** De bewaartermijn van het logboek wordt ingesteld bij [Gegevensbewaring](#screen-retention). Nog geen enkele opschoningstaak leest hem (PS-345), dus er wordt vandaag niets door verwijderd.
- **De `detail` van het audit is bewust Engels.** Het is een compliancedocument, geen interfacetekst. De kolomkoppen, filters en knoppen zijn vertaald; de detailtekst en het geëxporteerde bestand niet.
- **Demonstratie.** Zonder API-server wordt het auditlogboek in de browser opgeslagen en begint het met vooraf aangemaakte voorbeeldvermeldingen. De tijd en de handelende gebruiker komen uit de browser. Met een API-server bepaalt de server de tijd en de actor aan de hand van het aanmeldtoken.
- **Geen kolom voor faciliteit of station** op het scherm of in de CSV, hoewel beide worden vastgelegd (zie hierboven).
## Handleiding voor verificatie van het auditlogboek {#ch9-audit-verification}
Breadcrumb: Start > Beheerdershandleiding > Bijlagen > Handleiding voor verificatie van het auditlogboek

**Status:** Gedeeltelijk. Het vastleggen, zoeken en exporteren zijn gerealiseerd. Bewijs van manipulatie voor het hoofd-auditlogboek en automatisch opschonen volgens de bewaartermijn zijn niet gerealiseerd.

**Voor wie dit is.** Een beheerder of een servicesengineer van ForMedrixAI die een auditor of inspecteur moet laten zien wat er is gewijzigd, wie het heeft gewijzigd en wanneer. Het gebruikt alleen wat er vandaag bestaat.

### Wat wordt vastgelegd {#ch9-audit-recorded}

Elke auditvermelding bevat: een id; een tijd (opgeslagen in UTC); een type (**AI**, **Gebruiker** of **Systeem**); een gebeurtenisnaam; een detailzin in het Engels; de weergavenaam van de handelende gebruiker; het accessienummer van een casus wanneer er een is; een AI-betrouwbaarheid waar die van toepassing is; een faciliteits-id waar de code er een meegeeft; en het scanstation waar de actie is uitgevoerd. Het station-id wordt automatisch toegevoegd aan elke vermelding die de auditservice schrijft.

Wat in het logboek terechtkomt:

- **Elke controle van een machtiging met hoog risico**, toegestaan of geweigerd. De gebeurtenis is **Capability allowed** of **Capability refused**. Het detail noemt de machtigingssleutel, de rollen die haar verleenden of de reden van de weigering, de sessierol van de persoon en de faciliteit. De machtigingencatalogus markeert welke machtigingen een hoog risico hebben. Het opslaan van een configuratiescherm is zo'n controle.
- **Wijzigingen van rollen en medewerkers.** **Role capabilities changed** noemt wat voor een rol is verleend en ingetrokken. **Staff access changed** legt een wijziging van de rollen, faciliteiten, pediatrietoegang, orkestratietoegang of cross-tenant QA-toegang van een persoon vast, elk met van en naar. **Staff credentials changed** legt wijzigingen van aanmeldgegevens vast.
- **Aanmeldgebeurtenissen.** **Signed in**, **Sign-in failed** (poging n van 5), **Sign-in locked**, **Sign-in refused**, **SSO account linked**, **SSO account unlinked** en **SSO sign-in refused**. Het logboek legt nooit vast wat er is ingetypt.
- **Benoemde wijzigingsgebeurtenissen voor sommige instellingen.** Bijvoorbeeld `AI_VENDOR_POLICY_CHANGED`, `CLINICAL_MISMATCH_RULE_CHANGED`, `AI_PROMPT_EDITED`, `AI_PROMPT_APPROVED`, `FEEDBACK_SETTINGS_CHANGED`, `RECALL_SETTINGS_CHANGED`, `QA_TREND_POLICY_CHANGED`, `CODE_SYSTEM_POLICY_CHANGED`, `PEER_REVIEW_GATE_CHANGED`, **Template review settings changed**, **Organ map colours changed**, **Signing-authority country profile changed** en de vier gebeurtenissen **Signing-authority facility override** (toegevoegd, gewijzigd, verwijderd, motivering bijgewerkt). De gebeurtenissen voor de uitzondering per faciliteit bevatten elke gewijzigde vlag met van en naar, en de motivering van de beheerder of ‘Justification: none given’.
- **Spraakopdrachten.** **Voice command executed** en **Voice command refused**. Het detail noemt de actie-id en het scherm, bijvoorbeeld `Voice command executed: action TABLE_DELETE on screen WORKLIST; confirmed by repeating the phrase`; bij een weigering staat de reden erin (niet beschikbaar op dit scherm, zin niet herhaald om te bevestigen, of niet op tijd herhaald). De persoon is de handelende gebruiker. Het logboek legt nooit vast wat er gezegd is en geen enkele regel noemt een zaak.
- **Afdrukken en exports.** `DOCUMENT_PRINTED`, `DOCUMENT_REPRINTED`, `DOCUMENT_RENDERED`, `DOCUMENT_EXPORTED`, `DOCUMENT_FAXED`: wie, de accessie, de bestemming, de status en, bij een export, het aantal rijen.
- **Casusgebeurtenissen**, zoals het genereren van een synoptisch verslag, veldwijzigingen, finalisatie, protocolkeuze, detectie en correctie van afwijkingen, correcties van facturatie en patiëntbeheer (`mpi.*`).
- **Automatische acties** onder een systeemactor.

Twee beperkingen zijn belangrijk wanneer u het overzicht leest.

1. Een machtigingsvermelding toont dat een persoon een machtiging heeft gebruikt en of dat was toegestaan. Voor de meeste instellingen toont zij de oude en de nieuwe waarde **niet**. Alleen de hierboven genoemde gebeurtenissen en enkele andere bevatten de wijziging zelf.
2. Een wijziging die wordt gemaakt terwijl een Superadmin-sessie in een andere organisatie handelt, wordt ook in het overzicht van [Supporttoegang](#screen-support_access) van die organisatie geschreven.

**De detailtekst is bewust Engels.** Auditrecords zijn compliancedocumenten, geen interfacetekst, dus het detail blijft letterlijk Engels in elke taal van het product en in de export. Zoek op de Engelse gebeurtenisnaam of op de machtigingssleutel.

### Een wijziging van een instelling vinden {#ch9-audit-find-setting}

1. Open [Systeemlogboeken](#screen-audit-log), tabblad **Auditlogboek**.
2. Stel de **Periode** in. De standaard is **Laatste 7 dagen**; kies **Aangepaste periode** voor een oudere wijziging. Vermeldingen buiten de periode zijn verborgen, niet verdwenen.
3. Typ bij **Zoeken** de machtigingssleutel van het scherm dat u controleert. De wijzigingsmachtiging van elk Configuratiescherm staat in het onderdeel **Machtigingen** in deze handleiding (bijvoorbeeld `config:retention-policy:manage` voor [Gegevensbewaring](#screen-retention)). De zoekopdracht komt overeen met de detailtekst, dus ze vindt de vermeldingen **Capability allowed**.
4. Lees de kolommen **Gebruiker** en **Tijdstempel** voor wie en wanneer. Het detail noemt de rol die de machtiging verleende.
5. Heeft het scherm een benoemde wijzigingsgebeurtenis (zie de lijst hierboven), zoek dan ook op die gebeurtenisnaam. Die bevat de wijziging zelf, niet alleen de machtigingscontrole.
6. Om ruis uit te sluiten, gebruikt u de typefilters (**Gebruiker** toont de menselijke acties).
7. Om alleen weigeringen te zien, zoekt u op `Capability refused`.

Een vermelding die **Capability allowed** zegt, toont dat de persoon de wijziging mocht maken en dat de wijziging is geprobeerd. Ze bewijst op zichzelf niet welke waarde is opgeslagen. Vergelijk voor een instelling zonder eigen wijzigingsgebeurtenis met de huidige waarde van het scherm en, als het lab die bewaart, met een configuratie-export (zie **Exporteren** hieronder).

### Controleren wie een machtiging heeft gewijzigd {#ch9-audit-find-permission}

1. Zoek op het tabblad **Auditlogboek** naar `Role capabilities changed`. Elke vermelding luidt `Role "<name>": granted <keys>; removed <keys>.` De kolom **Gebruiker** is de persoon die de rol heeft opgeslagen.
2. Om te zien wie een rol heeft gekregen of verloren, zoekt u naar `Staff access changed`. Het detail noemt elke wijziging met van en naar (rollen, faciliteiten, pediatrietoegang, orkestratietoegang, cross-tenant QA-toegang).
3. Om wijzigingen van aanmeldgegevens te zien, zoekt u naar `Staff credentials changed`.
4. Om te zien of een persoon een machtiging daadwerkelijk heeft gebruikt, zoekt u op de machtigingssleutel en leest u de vermeldingen **Capability allowed** en **Capability refused**.
5. Om te zien wie vandaag iets mag doen, gebruikt u [Rollen](#screen-staff-roles) en [Medewerkers](#screen-staff-members); het logboek toont de geschiedenis, die schermen tonen de huidige toestand.
6. Voor een rol die het ziekenhuis niet kan wijzigen: een wijziging van de rol Superadmin wordt in een ziekenhuis geweigerd, dus er is geen vermelding die er een toont. Superadmin wordt gehouden door supportmedewerkers van ForMedrixAI en wordt buiten de personeelsdirectory van het ziekenhuis verleend.

Het opslaan van een rol wordt ook geweigerd, voordat er iets wordt geschreven, als er daardoor geen rol meer zou zijn die rollen kan beheren, als een paar voor functiescheiding zou worden doorbroken, of als een machtiging zou worden verleend zonder de vereiste machtiging. Een geweigerde opslag schrijft geen vermelding **Role capabilities changed**.

### Hoe recordintegriteit en bewaring werken {#ch9-audit-integrity}

**Alleen-toevoegen.** De auditservice heeft geen aanroep om een vermelding te wijzigen of te verwijderen; ze kan alleen nieuwe schrijven en lezen. Het servercontract (`STAFF_ADMIN_API.md` sectie 1; `AUTHORIZATION_API.md`) schrijft voor dat de audittabel alleen-toevoegen is: er bestaat geen aanroep om te wijzigen of te verwijderen en de databaseaanmelding van de toepassing heeft zo'n recht niet. Een opgeloste fout is de enige wijziging die aan een record is toegestaan, en ze wordt vastgelegd als wie en wanneer op de foutvermelding, niet als overschrijving van het bericht.

**Wie de tijd en de actor bepaalt.** Met de API-server bepaalt de server de tijd en de handelende gebruiker aan de hand van het bearer-token. De browser stuurt alleen de gebeurtenis, dus een gebruiker kan de weergegeven naam niet kiezen. In de demonstratie doet de browser dat wel.

**Unieke id's.** Elke vermelding krijgt een uniek id. De tabel van de server moet naar verwachting ook de uniciteit afdwingen.

**Bewijs van manipulatie: het hoofd-auditlogboek heeft er geen.** Het hoofd-auditlogboek is **niet** via hashes aan elkaar gekoppeld en niet ondertekend. Niets op het scherm Systeemlogboeken bewijst dat een vermelding niet is gewijzigd door iemand met directe databasetoegang, en er is geen knop ‘verifiëren’ voor. De integriteit rust op de regel alleen-toevoegen hierboven en op databaserechten. Het enige record met een hashketen is het audit van [Supporttoegang](#screen-support_access) (zie hieronder). Als uw auditor cryptografisch bewijs van manipulatie voor het hoofdlogboek eist, meld dat dan aan ForMedrixAI: het is niet gerealiseerd.

**Bewaring.** De bewaartermijn voor het auditlogboek is een instelling bij [Gegevensbewaring](#screen-retention): het veld **Auditlogboeken**, in dagen, van 90 tot 3650, standaard 365. Het scherm zegt dat een wijziging ‘wordt van kracht bij de volgende opschoningscyclus’. **Nog geen enkele opschoningstaak leest deze instelling (PS-345)**, dus er wordt vandaag niets door verwijderd. Beschouw het getal als vastgelegd beleid, niet als afgedwongen beleid. Een record van elke export (wie, wat, wanneer, aantal rijen en bestandshash) wordt bewaard met de bewaartermijn van het auditlogboek.

**Exports zijn werkkopieën.** De geëxporteerde CSV is een kopie van wat op het scherm stond. Het record van de export is de auditvermelding.

### Exporteren {#ch9-audit-export}

1. Stel op het tabblad dat u nodig hebt eerst de filters in. De export omvat de rijen die de filters overlaten, niet het hele logboek.
2. Kies **Exporteren als CSV**. De knop is grijs, met een tooltip die de machtiging noemt, tenzij de persoon de exportmachtiging voor dat tabblad heeft (zie Machtigingen hierboven).
3. De service controleert de machtiging voordat ze het bestand opbouwt. Een weigering bouwt niets op.
4. Met een API-server wordt de export door de server opgebouwd (zie [Mijn exports](#screen-my-exports)): het bestand is een werkkopie die standaard 7 dagen wordt bewaard (1 tot 30), een persoon mag 3 open exports hebben en meer dan 1.000.000 rijen wordt geweigerd. In de demonstratie bouwt de browser het bestand op en downloadt hij het meteen.
5. Een bestandsnaam heeft de vorm `pathscribe-audit-log-<date>.csv`. De eerste regels zijn een kop die het rapport, wie het heeft aangevraagd, de gebruikte filters en het aantal rijen noemt. Daarna volgen de kolommen: **ID, Timestamp, Type, Event, Detail, Actioned By, Accession No., AI Confidence**. Cellen die met `=`, `+`, `-` of `@` beginnen, worden onschadelijk gemaakt zodat een spreadsheet ze niet als formule uitvoert.
6. Elke export schrijft een vermelding `DOCUMENT_EXPORTED` met de persoon, de bestandsnaam, de indeling en het aantal rijen. Zoek op `DOCUMENT_EXPORTED` om te zien wie het logboek heeft geëxporteerd.
7. De CSV bevat de faciliteits- of stationsid's niet. Als een inspecteur ze nodig heeft, meld dat dan aan ForMedrixAI services: de server heeft ze.
8. De andere tabbladen exporteren op dezelfde manier, elk met een eigen machtiging en eigen kolommen: Foutenlogboek (ID, Timestamp, Severity, Code, Message, Source, Accession No., Resolved), Kwaliteitsborging (ID, Group, Date, Case, Specimen, Detail, Status, User), Interfacelogboek en het factureringslogboek van Financieel.

### Hoe het audit van Supporttoegang erbij past {#ch9-audit-support}

Wanneer de support van ForMedrixAI bij uw gegevens komt, wordt dat vastgelegd in een eigen stroom, gescheiden van het hoofd-auditlogboek, en die stroom is van uw organisatie. Ze wordt beschreven bij [Supporttoegang](#screen-support_access).

- **Wat het vastlegt.** Beleidswijzigingen; aanvragen, goedkeuringen, afwijzingen, verlopen, vroegtijdige beëindigingen en intrekkingen; geweigerde openingen; het openen en bewerken van casussen; elke lijst, zoekopdracht of elk rapport dat uw casussen heeft getoond (met de casus-id's); de namen, nooit de waarden, van zoekcriteria; en exports van dit audit. De eigen exports en configuratiewijzigingen van een supportmedewerker worden hier ook vastgelegd (als `supportExport` en `supportConfigChange`), en ook in het hoofd-auditlogboek.
- **Vermeldingen worden nooit verwijderd.** Elke vermelding bevat een volgnummer, de tijd, de actor, het ticket, de actie, de casus-id's en een Engels detail zonder patiëntgegevens.
- **Het heeft een hashketen.** Elke vermelding draagt een SHA-256 over haar velden en de hash van de vorige vermelding, beginnend bij 64 nullen. Een gewijzigde, verwijderde of van volgorde veranderde vermelding verbreekt de keten. Het scherm meldt **Logboek intact (N regels)** of **Logboek gewijzigd bij regel N**, en de JSON-export bevat de ketencontrole.
- **Verifiëren.** Open Supporttoegang, lees de ketenregel van het auditpaneel en exporteer JSON voor een onafhankelijke controle. U hebt `config:support-audit:view` nodig.
- **Exportindelingen.** CSV, JSON en PDF, met de kolommen Tijdstip, Naam supportmedewerker, IP van herkomst, Land van herkomst, Ticketnummer, Uitgevoerde actie, Casus-ID's, Detail.
- **Beperkingen.** IP en land van herkomst kunnen alleen door de server naar waarheid uit het verzoek worden vastgelegd, dus de demonstratie laat ze leeg. Opslag per tenant, geïsoleerd in een eigen alleen-toevoegen-tabel, is werk aan de serverkant (PS-358).

Dit is het enige record in het product met ingebouwd bewijs van manipulatie. Het omvat alleen supporttoegang, niet het hoofd-auditlogboek.

### Een korte verificatieroutine {#ch9-audit-routine}

Werk voor een routinebeoordeling van een steekproefperiode deze stappen af.

1. Stel de periode van het **Auditlogboek** in op de periode. Noteer het aantal in de voet (‘N van M gebeurtenissen weergegeven’).
2. Zoek op `Role capabilities changed`, `Staff access changed` en `Capability refused` en lees elke vermelding.
3. Zoek op `Sign-in locked` en `Sign-in refused` naar aanmeldproblemen.
4. Zoek op `DOCUMENT_EXPORTED` om te zien wie gegevens heeft meegenomen.
5. Open het tabblad **Foutenlogboek**, filter op **Alleen open** en controleer dat er niets belangrijks onopgelost is.
6. Open [Supporttoegang](#screen-support_access) en bevestig dat de ketenregel intact meldt; lees de vermeldingen over de periode.
7. Exporteer de CSV van het Auditlogboek voor de periode en bewaar het bestand bij uw beoordelingsnotities. De export wordt zelf vastgelegd.
