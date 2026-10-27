---
chapter: 1
id: ch1
title: Systeemoverzicht en architectuur
---

# Systeemoverzicht en architectuur {#ch1}

Dit hoofdstuk is bedoeld voor de beheerder of engineer die een PathScribe-implementatie voorbereidt. Het beschrijft uit welke onderdelen PathScribe bestaat, hoe gegevens tussen die onderdelen stromen, wat een locatie moet aanleveren en welke beveiligingsmaatregelen er zijn. Het beschrijft wat het product vandaag doet. Wat niet is gerealiseerd, is gelabeld als **Gepland** of **Niet gerealiseerd**, en het hoofdstuk vermeldt waar de dichtstbijzijnde werkende functie te vinden is.

## Hoe u deze handleiding gebruikt {#ch1-how-to-use}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Hoe u deze handleiding gebruikt

**Status:** Gerealiseerd (deze handleiding en de knop Help in de toepassing).

**De hoofdstukken volgen de volgorde van inrichting.** Hoofdstuk 2 behandelt niveau 1, hoofdstuk 3 niveau 2, enzovoort tot en met hoofdstuk 8, dat niveau 7 behandelt. Hoofdstuk N beschrijft niveau N-1. Als u een locatie van het eerste tot het laatste hoofdstuk inricht, zijn bij elk scherm dat u bereikt de schermen waarvan het afhangt al ingericht. Hoofdstuk 9 bevat de bijlagen (naslag over het auditlogboek en de woordenlijst).

**Elk scherm heeft een kader Inrichtingsvolgorde.** Elk onderhoudsscherm in deze handleiding bevat drie regels:

- **Inrichtingsstap:** de plaats van het scherm in de volgorde, bijvoorbeeld "Niveau 2, stap 6". Een scherm dat een logboek, een wachtrij of een dashboard is en dagelijks wordt gebruikt, vermeldt "Naslag, geen onderdeel van de inrichting".
- **Vereist:** de schermen die eerst moeten zijn ingericht. Elk daarvan is een koppeling. De handleiding zegt ook wat er gebeurt als u het overslaat (een lege keuzelijst of een weigering bij het opslaan).
- **Maakt mogelijk:** wat het scherm mogelijk maakt zodra het is ingericht.

**De centrale pagina Volgorde van inrichting.** [Volgorde van inrichting](setup-sequence.html) (`setup-sequence.html`) toont elk scherm in de volgorde waarin u het moet inrichten, opgebouwd uit die drie regels. Gebruik de pagina als controlelijst voor een nieuwe locatie.

**De knop Help.** **Gerealiseerd.** Een knop **Help** staat rechtsboven op elk scherm van Configuratie en opent deze handleiding in een apart venster dat zijn plaats onthoudt (een nieuw tabblad als de browser een venster weigert) bij de eigen sectie van dat scherm, zodat niet-opgeslagen wijzigingen niet verloren gaan. De knop volgt het geopende tabblad en de sectie in de zijbalk: bij het Rollenwoordenboek op het tabblad Personeel opent hij de sectie [Rollenwoordenboek](#screen-staff-roles) en bij **Systeem > Afdelingen** opent hij [Afdelingen](#screen-departments). Het scherm Migration Jobs heeft er een onder zijn titel. De knop opent `go.html#<screen id>`, waarbij `<screen id>` de id van het scherm in deze handleiding is (bijvoorbeeld `screen-departments`); `go.html` wordt door de build van de handleiding gemaakt en vindt de juiste hoofdstukpagina. Schermen buiten Configuratie die een sectie in deze handleiding hebben (het Auditlogboek, Batchbeheer, de Lockbox-afgifte en andere) worden geopend met een knop in de vorm van een open boek in de bovenbalk, naast de microfoon. Een test mislukt als een tabblad of sectie van Configuratie geen sectie in deze handleiding heeft, zodat een nieuw scherm niet zonder documentatie kan worden opgeleverd.

**Statuswoorden.** Elk scherm en elk onderdeel van dit hoofdstuk gebruikt een van vijf vaste woorden:

| Status | Betekenis |
|---|---|
| **Gerealiseerd** | Werkt op de demonstratiegegevens en heeft een beschreven servicecontract (`docs/architecture/*_API.md`) voor de productieserver. |
| **Demonstratie** | Werkt alleen in de browser op de demonstratiegegevens. De kant van de productieserver is nog niet aangesloten. |
| **Gedeeltelijk** | Een deel van wat de kop zegt is gerealiseerd. De sectie vermeldt precies welk deel. |
| **Gepland** | Niet gerealiseerd. Een korte alinea zegt wat de bedoeling is en wat over de timing bekend is. |
| **Niet gerealiseerd** | Gevraagd, maar er bestaat geen scherm of contract. De sectie zegt dat in één zin en noemt het dichtstbijzijnde onderdeel dat wel bestaat. |

Lees "Gerealiseerd" zorgvuldig. Het betekent dat de browserkant werkt en dat het contract voor de server is geschreven. Het betekent niet dat de productieserver bestaat. Het volgende deel van dit hoofdstuk beschrijft de huidige stand van de productieserver.

**FORMEDRIXAI INTERNAL ONLY.** Sommige instellingen mogen alleen worden gewijzigd door implementatie- of service-engineers van ForMedrixAI. Het zijn de machtigingen in het domein `platform:`, of elke machtiging die is gemarkeerd als `platformOnly`, en schermen die alleen aan dat personeel worden getoond. In deze handleiding begint hun kop met `[FORMEDRIXAI INTERNAL ONLY]` en opent de sectie met een omkaderde mededeling die zegt wie de instelling mag wijzigen en waarom ze beperkt is. De klanteneditie van de handleiding laat die secties weg. De interne editie bewaart ze. Als u klantbeheerder bent en een instelling niet ziet die een engineer van ForMedrixAI noemt, is het waarschijnlijk een van deze.

## Samenvatting voor het management {#ch1-executive-summary}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Samenvatting voor het management

**Status:** Gedeeltelijk. De browsertoepassing is gerealiseerd. De productie-API-server, het databaseschema en de permanent draaiende services zijn vastgelegd in beschreven contracten en nog niet gebouwd (zie [De stand van het product vandaag](#ch1-current-state)).

PathScribe is een AI-ondersteund systeem voor klinisch pathologierapportage en een laboratoriuminformatiesysteem (LIS) van ForMedrixAI LLC. Het is gebouwd voor de VS, het Verenigd Koninkrijk, de EU en andere markten, en de schermen zijn vertaald in zes talen (Engels, Frans, Duits, Nederlands, Koreaans en Spaans; de andere vertalingen dan het Engels moeten voor klinisch gebruik nog door moedertaalsprekers worden beoordeeld).

Een casus draait in een van twee modi, per casus bepaald:

- **CoPilot.** PathScribe is een laag voor synoptische gegevensvastlegging bovenop een gast-LIS. Het gast-LIS is eigenaar van de casus en het definitieve verslag, en PathScribe stuurt gestructureerde synoptische gegevens terug naar dat LIS.
- **Orchestratie.** PathScribe is eigenaar van de casus van begin tot eind als een lichtgewicht LIS, inclusief AI-ondersteunde vrije tekst. Het wordt gebruikt voor outreachcasus zonder gast-LIS.

Wat een beheerder beheert, is de configuratie: personeel en rollen, de woordenboeken en opzoeklijsten, de workflowregels, het gedrag van de AI, verslagsjablonen, interfaces en factureringsregels. De hoofdstukken hierna beschrijven die schermen in de volgorde waarin een locatie wordt ingericht.

Drie feiten zijn van belang voor de planning:

1. **De productiedatabase is Microsoft SQL Server**, bereikt via een PathScribe API-server die is gebouwd op ASP.NET Core, met liveupdates via SignalR. PathScribe gebruikt Firebase niet als productiedatabase. Een aantal Firebase-bestanden staat nog in de repository uit eerder werk en moet worden vervangen.
2. **De hosting is de keuze van de klant of van ForMedrixAI.** Het ontwerp gebruikt standaardonderdelen (containers, SQL Server, TLS-certificaten) en hangt niet af van één cloudaanbieder. Een locatie kan een openbare cloud, een private of soevereine cloud, of een eigen datacenter gebruiken.
3. **PathScribe kan nog niet in productie worden genomen.** De browsertoepassing is compleet genoeg om te demonstreren en om tegen contracten te testen. De server die echte patiëntgegevens zou bevatten, is niet gebouwd. Plan een eerste implementatie als gezamenlijk project met ForMedrixAI, niet als installatie.

## Architectuuroverzicht {#ch1-architecture}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Architectuuroverzicht

**Status:** Gedeeltelijk. Elk onderdeel hieronder heeft zijn eigen status.

### De onderdelen {#ch1-parts}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Architectuuroverzicht > De onderdelen

| Onderdeel | Wat het is | Status |
|---|---|---|
| **Browsertoepassing** | Een React- en TypeScript-single-pagetoepassing, aangeboden als statische bestanden. Ze bevat geen sleutels en schrijft, wanneer een API-server is geconfigureerd, geen patiëntgegevens naar de opslag van de browser. Eén build bedient elke locatie: de instellingen van elke locatie komen uit een bestand `config.json` naast `index.html`. | Gerealiseerd |
| **PathScribe API-server** | ASP.NET Core. Hij dwingt machtigingen af, bewaart de aanmeldsessie, voert de databasetransacties en geplande taken uit en roept de AI-leveranciers, de verslagrenderer en de interface-engine aan. | Gepland. Contracten zijn beschreven in `docs/architecture/*_API.md`. In de repository staat geen servercode. |
| **Hub voor liveupdates** | Een SignalR-hub op de API-server op `/hubs/live`. Hij meldt geopende schermen dat er iets is veranderd, uitsluitend met identificaties en nooit met patiënttekst. | Gepland. De browserkant is gerealiseerd en getest tegen een testhub. |
| **Database** | Microsoft SQL Server. | Gepland. In de repository staan geen schema of scripts. |
| **Interface-engine** | BridgeLink, een opensourcefork van Mirth Connect (een Java-server). PathScribe geeft hem een JSON-bericht; de engine bouwt en verstuurt de HL7-berichten en ontvangt de antwoorden. | Gedeeltelijk. Het berichtcontract is beschreven. De engine is nog niet uitgerold of aangesloten en de demonstratiebuild gebruikt een nagebootste engine. |
| **AI-proxy en AI-leveranciers** | De API-server stuurt AI-verzoeken door naar de geconfigureerde leverancier en voegt de sleutel van de leverancier toe, die de browser nooit bezit. | Gedeeltelijk. De browserkant en de controle van de leverancier per jurisdictie zijn gerealiseerd. De serverroutes zijn gepland. |
| **Verslagrenderer** | Een service die een vrijgegeven verslag omzet in een PDF, met headless Chromium aangestuurd door Playwright. | Gepland. Er bestaat alleen een noodoplossing voor de ontwikkeling. |
| **Site-agent** | Een Windows-service die op elke locatie wordt geïnstalleerd. Hij maakt uitgaand verbinding via HTTPS, drukt verslagen en labels af op netwerkprinters en schrijft bestanden naar Windows-shares. | Gedeeltelijk. De beheerschermen en het contract zijn gerealiseerd. De agent zelf is gepland. |
| **Afdrukbridges op het werkstation** | QZ Tray of de PathScribe-werkstationagent, draaiend op een computer op de werkplek om labels af te drukken op de printer ernaast. | QZ Tray: Gerealiseerd (labels worden erdoor afgedrukt). Werkstationagent: Gerealiseerd (browserkant). |
| **Viewers voor whole slide imaging (WSI)** | De eigen viewertoepassing van de leverancier (bijvoorbeeld Leica, Roche of Hamamatsu). PathScribe houdt scanbatches bij en opent de viewer van de leverancier in een nieuw browsertabblad voor het juiste preparaat. Het tekent nooit preparaatbeelden. | Gerealiseerd (startlink). Statusupdates van scanbatches vereisen de hub. |

### Hoe gegevens stromen {#ch1-data-flow}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Architectuuroverzicht > Hoe gegevens stromen

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

Zo leest u het:

1. **Browser naar API-server.** Elke handeling loopt via de API-server met de identiteit van de aangemelde gebruiker. De eigen machtigingscontroles van de browser verbergen alleen knoppen; de server beslist. De server geeft vaste foutcodes terug (`NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`) en stuurt nooit tekst terug die een patiënt zou kunnen noemen. Namen en identificaties van patiënten reizen mee in de body van een verzoek, nooit in een webadres.
2. **API-server naar hub naar browsers.** Nadat een databasewijziging is vastgelegd, schrijft de server in dezelfde transactie een gebeurtenis naar een outbox-tabel. Een dispatcher publiceert die vervolgens via de hub. De gebeurtenis bevat alleen identificaties. Een scherm dat haar ontvangt, leest de gegevens opnieuw via de normale aanroep met machtigingscontrole. De eerste schermen die dit gebruiken zijn het Live Board van de operatiekamer en de Intraoperative Queue; de ontwerpdoelstelling is minder dan 500 milliseconden van vastlegging tot het tweede bord. Zonder hub pollen dezelfde schermen (elke 15 seconden op de intraoperatieve schermen).
3. **API-server naar AI.** De browser roept `/api/ai/...` aan op zijn eigen origin. De server voegt de sleutel van de leverancier toe, controleert het leverancier- en regiobeleid van de jurisdictie, stuurt het verzoek door en schrijft een auditregistratie zonder prompttekst.
4. **API-server naar interface-engine.** De API-server stuurt een JSON-envelop met een transactietype (15 uitgaande typen staan in `INTERFACE_TRANSACTIONS.md`). De engine zet die om naar HL7 en verstuurt hem. PathScribe bouwt zelf nooit HL7 voor de verbinding. HL7-verkeer blijft in het eigen berichtenarchief van de engine, niet op de PathScribe-berichtenbus.
5. **API-server naar site-agent.** De site-agent is de enige manier waarop een in de cloud gehoste server een printer of share binnen het ziekenhuis bereikt. Hij maakt uitgaand verbinding met de server via HTTPS met een clientcertificaat, zodat geen inkomende firewallopening nodig is.
6. **Verslagen.** De server rendert elke PDF die PathScribe verlaat, bewaart per vrijgave één onveranderlijk, gehasht document en verstuurt precies dat document via elk kanaal. De browser toont een voorbeeld dat is gebouwd om overeen te komen met wat wordt verzonden.

### Hosting en schaalbaarheid {#ch1-hosting}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Architectuuroverzicht > Hosting en schaalbaarheid

**Status:** Gepland. Dit is het ontwerp in `DEPLOYMENT_READINESS_REVIEW.md`; niets daarvan is uitgerold.

- **Twee ondersteunde manieren om te hosten.** Een openbare cloud, met de beheerde database en containerhosting van de aanbieder waar dat past. Of een overdraagbaar pakket: dezelfde containers op Kubernetes of Docker in een private cloud, een soevereine cloud of het eigen datacenter van het ziekenhuis. Het pakket wordt eenmaal gevalideerd en elke hostinglocatie krijgt daarna een controlelijst voor installatiekwalificatie.
- **Permanent draaiende onderdelen.** De API (minstens één warme instantie), de database (in productie nooit automatisch gepauzeerd), de hub voor liveupdates, de verslagrenderer en de interface-engine die de HL7-verbindingen vasthoudt. Terugschalen naar nul is niet verenigbaar met een schermvernieuwing per seconde of met STAT-casus 's nachts. Terugkerende taken (nieuwe pogingen, vrijgavetimers, verloopcontroles) kunnen als korte geplande taken draaien.
- **De hub schalen.** Gedeelde SaaS gebruikt Azure SignalR Service. Private cloud en on-premises gebruiken een Redis-backplane of één enkele instantie. Zonder Azure SignalR Service heeft de load balancer sticky sessions nodig, met WebSockets ingeschakeld en een idle timeout van meer dan 15 seconden. Het ontwikkelteam moet deze matrix nog bevestigen.
- **De interface-engine draait op beide manieren** (besloten op 13 okt 2026): gehost door ForMedrixAI in de regio van de tenant, of geïnstalleerd in het ziekenhuis, vanuit hetzelfde containerimage.
- **Eén build, vele locaties.** `npm run build:server` maakt de build voor productie. Die bevat geen demonstratieaccounts of demonstratiehulpmiddelen. De adressen en aanmeldinstellingen van elke locatie staan in zijn `config.json` (37 instellingen, vermeld in `RUNTIME_SETTINGS`), aangeboden met `Cache-Control: no-store`. PathScribe weigert te starten, en noemt de onjuiste instellingen, als het bestand een regel schendt (bijvoorbeeld een adres dat niet `https://` is).
- **Beveiligingsheaders van de browser.** De Content-Security-Policy, HSTS en de andere headers worden voor nginx, IIS en Azure App Service, Azure Static Web Apps, Azure Front Door of een gewone lijst gegenereerd uit één definitie in `deploy/security-headers/`. Voer na het wijzigen van een adres in `config.json` de generator opnieuw uit, zodat het nieuwe adres is toegestaan.
- **Schemawijzigingen** zijn geversioneerde SQL-scripts die door de releasepijplijn worden toegepast, nooit bij het opstarten van de toepassing, en elke wijziging laat de database bruikbaar voor de vorige versie.

## De stand van het product vandaag {#ch1-current-state}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > De stand van het product vandaag

**Status:** Demonstratie voor vrijwel elk gegevensscherm; zie de tabel hieronder voor uitzonderingen.

Lees dit deel voordat u een klant een livegangdatum belooft. Het is gecontroleerd tegen de repository op 21 okt 2026.

**Wat vandaag draait.** De browsertoepassing draait op **in de browser bewaarde demonstratieservices**. Ongeveer 170 servicemappen in `src/services/` volgen één patroon: een interface, een demonstratieversie die haar gegevens in de browser bewaart en (voor bijna alle) een serverversie die de API aanroept. De toepassing kiest de serverversie wanneer `VITE_API_BASE_URL` in `config.json` is ingesteld, en anders de demonstratieversie. Wanneer een API-server is geconfigureerd, worden demonstratiegegevens in het geheugen bewaard en niet naar de opslag van de browser geschreven.

**Wat is aangesloten op een productie-API.** Niets. De serverversies bestaan in de browsercode en hebben tests met een nagebootste server die elke route controleren, maar de API-server die ze zou beantwoorden staat niet in de repository en is niet gebouwd (het werk is, vanuit de contracten, toegewezen aan het team in India). Er is niets uitgeprobeerd tegen een echte server. Voor alle services op drie na zijn serverversies in de browsercode geschreven:

| Service zonder serverversie | Waarom |
|---|---|
| Actieregister (spraak- en sneltoetsherkenning) | Synchroon en in het geheugen. Alleen de opgeslagen instellingen zouden via de configuratieservice naar de server gaan. |
| AI-instructieservice | De regels draaien in de browser over geïnjecteerde opslag; de opslag loopt via de configuratie- en auditservices. |
| Interfacewoordenboekservice | Idem: de regels draaien in de browser. De opslag loopt via de configuratie- en auditservices. |

Liveupdates gebruiken in de browser al SignalR (`signalRLiveUpdateService.ts`), maar de hub is niet gebouwd.

**Wat een productie-implementatie blokkeert** (uit de readiness review, status bij Batch 641):

| Blokkade | Stand |
|---|---|
| API-server en SQL Server-schema | Open. Niet gestart. |
| Blobopslag voor verslag-PDF's, exports en vastgehouden vrijgaven | Contract beschreven. Opslag en endpoints open. |
| Geplande taken aan de serverkant (ongeveer tien timers) | Open. Totdat elke taak is verplaatst, voert de browser hem uit zolang iemand is aangemeld. `VITE_SERVER_JOBS` draagt een taak op naam over aan de server. |
| Verslagrendererservice | Cytologiesjabloon klaar. De gehoste service is open. |
| Aanmelden via de server (backend-for-frontend), configuratie van de identiteitsprovider tijdens runtime | Runtimeconfiguratie klaar. Het servergedeelte is open. |
| Interface-engine, permanent draaiend, met de edge-regels | Contract beschreven. Hosting en endpoints open. |
| Site-agent | Contract en schermen klaar. De agent is open. |
| Hub en pushupdates | Browserkant klaar. De hub is open. |
| De eerdere Vercel-functies in `api/`, de Firebase-services en `functions/` buiten gebruik stellen | Open. Drie schermen (Graveermonitor, QA-lijst met tekortkomingen, historie van materiaalopvolging) lezen nog Firebase-services. |

Andere openstaande punten die een beheerder moet kennen:

- **De browser dwingt machtigingen vandaag af en de handhaving aan de serverkant is niet gebouwd.** De machtigingscontroles draaien in de services van de browser. Een server moet elke controle herhalen voordat echte patiëntgegevens worden bewaard. Zie [Beveiligingsmodel](#ch1-security).
- **Testen met een schermlezer door een persoon is niet gedaan.** Geautomatiseerde toegankelijkheidscontroles (WCAG 2.1 A- en AA-regels, in Chromium) slagen, maar een persoon heeft nog niet getest met NVDA of VoiceOver (PS-687).
- **Firefox is niet door de geautomatiseerde testreeks gehaald** in de bouwomgeving. Een handmatige controle in Chrome, Edge en Firefox is open (PS-718).
- **Vertalingen** in het Frans, Duits, Nederlands, Koreaans en Spaans moeten voor klinisch gebruik door moedertaalsprekers worden beoordeeld.
- **De pijplijn voor continue integratie** is geschreven maar draait pas zodra de repository op GitHub staat (gepland voor eind oktober 2026).
## Systeemvereisten {#ch1-prerequisites}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Systeemvereisten

**Status:** Gedeeltelijk. De repository bevat de eisen voor software, netwerk en browser. Ze bevat **geen dimensioneringscijfers** voor servers, databaseopslag, bandbreedte, back-up of herstel. Waar dit deel "Nog niet gespecificeerd" zegt, bestaat in de repository geen cijfer en wordt hier geen cijfer verzonnen; de openstaande punten staan in het bestand met open vragen van het hoofdstuk, zodat ForMedrixAI kan beslissen voordat een klant de capaciteit plant.

### Serverhardware en hosting {#ch1-prereq-hardware}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Systeemvereisten > Serverhardware en hosting

| Onderdeel | Wat de repository zegt |
|---|---|
| Omvang van de API-server (CPU, geheugen, aantal instanties) | Nog niet gespecificeerd. Het ontwerp vraagt minstens één warme instantie, met bedrijfslogica in klassenbibliotheken en een containerimage. |
| Omvang van de hub (SignalR) en aantal verbindingen | Nog niet gespecificeerd. De acceptatietest gebruikt minstens 50 verbonden borden. |
| Verslagrenderer | Een warme pool van 2 tot 4 Chromium-browserprocessen (begin met 2), een time-out van 5 seconden per verslag, een browser die na 500 renders wordt vernieuwd, geen uitgaand netwerkverkeer, een grotere `/dev/shm` en ongeveer 100 MB aan lettertypen (inclusief CJK). CPU en geheugen per instantie: Nog niet gespecificeerd. |
| Interface-engine | BridgeLink, een langdurig draaiende Java-server, als container. Omvang: Nog niet gespecificeerd. |
| Containerplatform | Kubernetes of Docker voor het overdraagbare pakket; de containerhosting van de aanbieder voor een openbare cloud. Versies: Nog niet gespecificeerd. |
| Berichtenbroker | Geen. De berichtenbus bestaat uit tabellen in de SQL Server-database, achter een interface (`IMessageBus`). RabbitMQ of een cloudwachtrij zou pas worden toegevoegd als belastingtests laten zien dat de tabellen een knelpunt vormen. |
| Buildtools (voor engineers die de front-end bouwen) | Node.js 24.x (`engines` in `package.json`). Niet nodig op een productieserver, die statische bestanden aanbiedt. |

### Database {#ch1-prereq-database}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Systeemvereisten > Database

**Status:** Gepland. In de repository staan geen schema, scripts of databasecode.

- **Engine.** Microsoft SQL Server. Dezelfde engine draait als Azure SQL Database (serverless of provisioned), SQL Server op een virtuele machine, SQL Server in Linux-containers (officiële Microsoft-images voor 2017 tot 2025; alleen x86-64 Linux-hosts; een licentie is vereist) of AWS RDS for SQL Server.
- **Pauzeer een productiedatabase nooit automatisch.** Een gepauzeerde database maakt van het eerste scherm 's ochtends, of van een STAT-casus 's nachts, een mislukt verzoek. Automatisch pauzeren is alleen aanvaardbaar voor test- en opleidingstenants. Op Azure SQL serverless wordt het uitgezet met `-1`.
- **Uitgangspunt voor de omvang.** De readiness review adviseert voor een productietenant een minimum van 2 virtuele cores "totdat belastingtests anders uitwijzen". Het is een aanbeveling, geen geteste eis. Opslag, geheugen, IOPS en groei per casus: Nog niet gespecificeerd.
- **Schemawijzigingen.** Geversioneerde scripts die door de releasepijplijn worden toegepast voordat de API-container start, nooit bij het opstarten van de toepassing.
- **Back-ups.** Point-in-time-herstel is het ontwerp voor de audittabellen. Back-upschema, bewaartermijn, hersteltijddoelstelling en herstelpuntdoelstelling: Nog niet gespecificeerd.
- **AWS-opmerking.** AWS heeft geen serverless SQL Server, en een gewijzigde instantieklasse betekent downtime (korter met Multi-AZ). Licentiekosten zijn van toepassing.
- **Blobopslag** voor verslag-PDF's, exports en vastgehouden vrijgaven: Azure Blob of een S3-compatibele opslag, per tenant, privé, versleuteld in rust en in de hostingregio van de tenant (contract: `BLOB_STORAGE_API.md`). PathScribe bewaart geen beelden of bijlagen, alleen koppelingen naar het beeldvormingssysteem van het laboratorium.

### Netwerk {#ch1-prereq-network}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Systeemvereisten > Netwerk

| Behoefte | Detail |
|---|---|
| TLS overal | Elk serveradres in `config.json` moet `https://` zijn. Gewoon `http://` is alleen toegestaan naar dezelfde computer in een ontwikkelbuild, of voor een interne implementatie die `"https": false` instelt in haar bestand met origins voor beveiligingsheaders (waardoor HSTS vervalt). |
| Browser naar API en hub | HTTPS naar de API-server. WebSockets (`wss://`) naar `/hubs/live`. Laat Server-Sent Events en long polling ingeschakeld als terugvaloptie, omdat sommige ziekenhuisproxy's WebSockets blokkeren. Load balancers hebben WebSockets ingeschakeld nodig en een idle timeout van meer dan 15 seconden. |
| Toegestane adressen | De adressen in `config.json` (API, identiteitsproviders, hub, renderer, interface-ontvanger, AI- en terminologie-endpoints, foutbewaking) vormen de Content-Security-Policy van de browser. Voer de headergenerator opnieuw uit na elke wijziging. |
| Identiteitsprovider | Bereikbaar vanuit de browser (en vanuit de server, zodra de server de aanmelding beheert). Omleidingsadressen voor Microsoft Entra ID: `https://<pathscribe host>/auth/callback/microsoft` en `https://<pathscribe host>/auth/signing/microsoft`. |
| Site-agent | Alleen uitgaand HTTPS (poort 443), op een eigen hostnaam (bijvoorbeeld `agent.<tenant domain>`) die een clientcertificaat eist. Geen inkomende firewallopening. Een proxy die TLS inspecteert moet die host ongemoeid doorlaten, omdat inspectie het clientcertificaat breekt. |
| Bereik van de site-agent (lokaal ingesteld door de IT van het ziekenhuis) | De printersubnetten, de printerpoorten (standaard 9100, 515, 631 en 443), de UNC-roots voor shares en de hosts waarvan documenten mogen worden gedownload. PathScribe kan deze lijst niet wijzigen. |
| HL7-koppeling | Aanvragen binnen en uitslagen buiten lopen via de interface-engine. De koppeling is beveiligd met een site-to-site-VPN of MLLP over TLS. Een bericht wordt pas bevestigd zodra het duurzaam is opgeslagen. |
| Vast uitgaand adres | SFTP-bestandsuitwisselingen hebben een vast uitgaand IP-adres nodig voor de toegestane lijst van het ziekenhuis (een NAT-gateway of firewall-egress) en een vastgezette hostsleutel. |
| E-fax en e-mail | Een SMTP-gateway op poort 587 met authenticatie. |
| Bandbreedte en latentie | Nog niet gespecificeerd. De ontwerpdoelstelling voor een gewone schermvernieuwing is 800 ms bij het 95e percentiel van vastlegging tot weergave; voor de borden van de operatiekamer minder dan 500 ms. Het eerste laden van de pagina is 0,70 MB gecomprimeerd (doel 1 MB). |
| Hostingregio | Per implementatie wordt één regio gekozen. De `/api/config` van de API-server kan de database- en blobregio's rapporteren, die het tabblad AI-gedrag toont (zie [AI-gedrag](#screen-tab-ai)). Dat endpoint is gepland. |

### Clientwerkstation {#ch1-prereq-workstation}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Systeemvereisten > Clientwerkstation

**Status:** Gerealiseerd, met open controles zoals vermeld.

- **Ondersteunde browsers** (besloten op 15 okt 2026): actuele versies van Chrome, Microsoft Edge en Firefox. **Safari wordt niet ondersteund.** De geautomatiseerde tests draaien in Chromium (de engine van Chrome en Edge). Firefox wordt alleen op verzoek gedraaid, is nog niet gedraaid in de bouwomgeving, en een handmatige controle in alle drie is open (PS-718). In Chrome en Edge worden keuzelijsten getekend als opgemaakte vlakken; Firefox toont zijn eigen lijst. Het gedrag is hetzelfde.
- **Gebruikte browserfuncties.** WebAssembly (de spellingcontrole), Web Workers en (wanneer de gebruiker toestemming geeft) camera, microfoon en schermopname, voor foto's bij het uitsnijden, dicteren en schermafbeeldingen bij verbeteringsverzoeken. De Permissions-Policy-header staat deze alleen toe voor PathScribe.
- **Labels afdrukken vanaf een computer op de werkplek.** QZ Tray (Gerealiseerd) of de PathScribe-werkstationagent (Gerealiseerd, browserkant) moet op de computer draaien. Ze luisteren alleen op de computer zelf: de werkstationagent op `wss://127.0.0.1` poorten 9100 tot 9102 en QZ Tray op `localhost` poorten 8181, 8282, 8383 en 8484. Als de pagina QZ Tray niet kan bereiken, opent het label in het afdrukvenster van de browser en meldt een bericht dat de labelprinter niet is verbonden.
- **Toegang tot het lokale netwerk toestaan.** Chrome en Edge vragen de gebruiker om toestemming voor lokale adressen. De IT van het ziekenhuis kan PathScribe vooraf goedkeuren met het beleid `LocalNetworkAccessAllowedForUrls`.
- **Meldingen van QZ Tray.** QZ Tray vraagt "Allow this website to use your printers?" totdat afdrukverzoeken met het certificaat van de klant worden ondertekend. Het ondertekenen is **gepland** (het vereist de API-server). Tot die tijd kan de gebruiker eenmaal per werkstation worden gevraagd. Het besluit (16 okt 2026) is één zelfondertekend certificaat per klant, met een vervaldatum die de IT moet verlengen en opnieuw uitrollen; zie `docs/product/QZ_TRAY_CERTIFICATE_GUIDE.md`. De stappen voor elk hulpmiddel voor apparaatbeheer zijn gemarkeerd met "Test first", omdat ze niet op een pilotcomputer zijn uitgevoerd.
- **Labelprinters.** Thermische printers die ZPL accepteren. Verslagprinters op het netwerk worden via de site-agent bereikt. Netwerkafdrukken van verslagen werkt vandaag niet vanuit de browser.
- **Schermlezers.** Geautomatiseerde toegankelijkheidscontroles slagen; testen door een persoon met NVDA of VoiceOver is open (PS-687).
- **Talen.** Engels, Frans, Duits, Nederlands, Koreaans en Spaans, plus de woordkeuze voor Belgisch Nederlands en Belgisch Frans.
- **Monitorgrootte, minimale processor en minimaal geheugen:** Nog niet gespecificeerd.
- **Viewers voor whole slide imaging.** De viewer van de leverancier moet vanaf het werkstation zijn geïnstalleerd of bereikbaar, zoals die leverancier vereist. PathScribe opent de viewer alleen in een nieuw tabblad, met een sjabloon voor het startadres dat u eenmaal per viewer invoert, waarin de barcode van het preparaat wordt ingevuld. Het wordt ingesteld in [Leveranciersintegraties](#screen-vendor_integrations). PathScribe levert geen viewer-adres mee.

## Beveiligingsmodel {#ch1-security}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel

**Status:** Gedeeltelijk. Vrijwel elke maatregel hieronder is gerealiseerd in de browser en heeft een beschreven servercontract. De server die elke controle moet herhalen, is niet gebouwd (zie [De stand van het product vandaag](#ch1-current-state)). Een controle in de browser is een beleefdheid; de controle van de server is de maatregel. Beschrijf geen enkele maatregel hier als bescherming van echte patiëntgegevens zolang de serverkant niet bestaat.

Dit deel zegt wat elke maatregel doet. Het zegt niet dat het gebruik ervan een laboratorium conform enige wet of norm maakt. Dat wordt bepaald door het eigen beleid, de contracten en het kwaliteitssysteem van het laboratorium.

### Single sign-on {#ch1-sso}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > Single sign-on

**Status:** Gedeeltelijk. OpenID Connect (OIDC): browserkant Gerealiseerd. Serverkant Gepland.

- **Protocol.** OpenID Connect, authorization code flow met PKCE, waarbij de app is geregistreerd als publieke single-pageapplicatieclient (geen clientgeheim). Het is generiek, dus het werkt met Microsoft Entra ID, Okta, Ping en Keycloak. Microsoft Entra ID is het eerste doel. De Entra-authority moet een tenant noemen: `/common`, `/organizations` en `/consumers` worden geweigerd omdat ze elk Microsoft-account zouden toelaten.
- **Google**-aanmelding wordt niet aangeboden, omdat het tokenendpoint van Google een clientgeheim eist. Een ziekenhuis op Google Workspace kan Google federeren via Entra ID of Okta.
- **Niemand wordt aangemaakt door aan te melden.** Alleen personeel dat al is ingericht en actief is, kan zich aanmelden. De identiteit wordt gekoppeld aan een personeelsrecord via het permanente subject van de provider (`oid` van Entra, anders `sub`), nooit alleen via het e-mailadres. De eerste aanmelding mag via het e-mailadres koppelen als dat e-mailadres wordt vertrouwd (geverifieerd, of een tenantspecifieke Entra-authority); een instelling kan dat uitzetten, zodat een beheerder elk account koppelt. Weigeringen (niet ingericht, inactief, dubbelzinnig, al gekoppeld, geen toegang tot de toepassing) worden met een duidelijk bericht getoond en geaudit. Zie [Medewerkers](#screen-staff-members).
- **Demonstratiebuilds** bieden ook aanmelding met een wachtwoord. Een productiebuild (`VITE_AUTH_MODE` ingesteld op `sso`) bevat geen demonstratieaccounts.
- **Tokens.** Vandaag bewaart de browser de tokens in `sessionStorage` (alleen dit tabblad, weg zodra het tabblad sluit). **Gepland voor productie** (besloten op 3 en 15 okt 2026): de API-server bewaart de tokens en de browser krijgt alleen een sessiecookie met `HttpOnly`, `Secure` en `SameSite`, met een anti-forgery-header. De browser draagt nooit een JWT en de hub gebruikt dezelfde cookie. Dit vereist gedeelde sessieopslag (SQL Server of Redis) op de server.
- **De app registreren in Entra ID** (stappen voor de IT van het ziekenhuis, uit `AUTHENTICATION_OIDC.md`): een registratie voor één tenant met het platform Single-page application en de twee omleidingsadressen die onder [Netwerk](#ch1-prereq-network) staan, geen clientgeheim, de optionele claim `email` in het ID-token en een beschikbaar gestelde API-scope die aan de toepassing is verleend.
- **Accounts en rollen uit de directory.** Automatische accountsynchronisatie (SCIM: nieuwe medewerkers, wijzigingen en vertrekkers) is **gepland** voor de serverfase. Het koppelen van directorygroepen aan PathScribe-rollen is **gepland** voor na de eerste release. Wanneer het er is, mag een groep alleen werkplekrollen verlenen, nooit Beheerder, Laboratoriumdirecteur, Sjabloongoedkeurder of iets met ondertekeningsbevoegdheid, en elke koppeling vraagt de goedkeuring van een tweede beheerder. Vandaag worden rollen met de hand toegewezen in [Medewerkers](#screen-staff-members) en [Rollen](#screen-staff-roles).

#### SAML 2.0 {#ch1-saml}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > Single sign-on > SAML 2.0

**Status:** Niet gerealiseerd.

PathScribe heeft geen SAML 2.0-aanmelding, geen SAML-bibliotheek en geen SAML-scherm. Een zoekactie in de hele repository vindt het woord alleen in twee ontwerpdocumenten. Het dichtstbijzijnde dat werkt is OIDC, hierboven. De gedocumenteerde richting voor gedeelde SaaS-hosting is dat ziekenhuizen zich aanmelden via een PathScribe-identiteitsbroker (Microsoft Entra ID External ID), die SAML of OIDC spreekt met de directory van het ziekenhuis en gewone OIDC met PathScribe, zodat "PathScribe nooit SAML verwerkt". Die broker is **gepland** en niet gebouwd. Een private-clouddeployment of een dedicated implementatie maakt rechtstreeks via OIDC verbinding met de eigen Entra ID van het ziekenhuis. Een ziekenhuis dat vandaag alleen SAML kan bieden, moet dat tijdens de planning aan ForMedrixAI melden, of SAML federeren naar Entra ID of Okta, die dan OIDC spreken met PathScribe.

### Rolgebaseerde toegangscontrole {#ch1-rbac}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > Rolgebaseerde toegangscontrole

**Status:** Demonstratie. De controles draaien in de services van de browser. De handhaving aan de serverkant (`AUTHORIZATION_API.md`, fase 4) is **gepland**.

- **Machtigingen.** Alles wat PathScribe afdwingt, is een benoemde machtiging in de vorm `domain:object:verb`, bijvoorbeeld `config:retention-policy:manage`. De catalogus (`capabilityCatalog.ts`) is de enige lijst en bevat ongeveer 320 machtigingen (322 op het moment van schrijven; het aantal groeit met de releases). Een machtiging wordt alleen samen met haar controle toegevoegd en een test laat de build mislukken als een machtiging geen controle heeft. Elke machtiging heeft een risiconiveau. Voor een machtiging met **hoog risico** wordt elke controle bij een handeling vastgelegd in het auditlogboek, toegestaan of geweigerd, en elke export heeft een hoog risico.
- **Rollen.** Een rol is een set machtigingen. Een medewerker heeft een of meer rollen en een toewijzing aan faciliteiten (een lege toewijzing betekent alle faciliteiten). Het bereik hoort bij de toewijzing, niet bij de rol. Een controle slaagt alleen als een toegekende rol de machtiging verleent, elke machtiging die ze vereist ook is verleend en de handeling binnen de faciliteiten van de persoon valt. Een weigering geeft een reden (niet verleend, vereiste niet verleend, buiten bereik, faciliteit onbekend).
- **Ingebouwde rollen.** Zestien: Patholoog, Assistent in opleiding, Fellow, Patholoog-assistent, Beheerder, Arts, OK-personeel, Sjabloonauteur, Sjabloongoedkeurder, Laboratoriumdirecteur, QA-beoordelaar, Accessiemedewerker, Histotechnoloog, Cytotechnoloog, Moleculair technoloog en Superadmin. Arts en OK-personeel zijn directoryvermeldingen zonder toegang tot de toepassing. De standaardinstellingen volgen het principe van minimale rechten: een patholoog heeft standaard geen configuratiemachtigingen. Een beheerder kan rollen wijzigen en rollen toevoegen in [Rollen](#screen-staff-roles), behalve Superadmin.
- **Geen omzeiling voor welke rol dan ook.** Superadmin is een rol waaraan machtigingen worden verleend zoals aan elke andere, en de controle kent er geen sluiproute voor. Beheerder impliceert evenmin iets. Superadmin heeft elke machtiging behalve `config:ai-prompt:approve` (het goedkeuren van de AI-instructies): die wordt onthouden met het oog op functiescheiding, zodat alleen het laboratorium (de Laboratoriumdirecteur) goedkeurt wat zijn eigen AI wordt opgedragen, en ForMedrixAI-support dat nooit doet.
- **Superadmin is gereserveerd voor ForMedrixAI-support.** De rol wordt alleen gehouden via een supportaanmelding. Een ziekenhuis kan hem niet toewijzen, bewerken of zien in de rolkiezer voor personeel, en een personeelsrecord die hem noemt, krijgt er niets van. De bron van die identiteit aan de serverkant (de eigen identiteitstenant van ForMedrixAI) is **gepland**.
- **Machtigingen alleen voor het platform.** Zes machtigingen in het domein `platform:` tellen alleen mee voor Superadmin (casus bekijken over tenants heen, toezichthoudende instanties, ondertekeningsregels, en beheren, publiceren en simuleren van het interfacewoordenboek). Een rol van een ziekenhuis kan ze niet hebben. Hun schermen zijn in deze handleiding gemarkeerd met `[FORMEDRIXAI INTERNAL ONLY]`.
- **Tenantgrens.** Elke gebruiker en elke casus draagt een `organisationId`. Bereik over tenants heen is beperkt tot supporttoegang (hieronder). De handhaving gebeurt vandaag in de browser; een querylaag aan de serverkant die dit afdwingt, is gepland.
- **Privacy van casus.** Een persoon die een casus niet kan openen, krijgt dezelfde neutrale melding als bij een casus die niet bestaat. Een getypt of geplakt accessienummer bewijst niets, en een bericht maakt van een nummer alleen een koppeling als de lezer die casus kan openen. De server moet hetzelfde antwoord geven (bijvoorbeeld `404`) voor "geen zo'n casus" en "u mag hem niet zien", zonder verschil in body, headers of timing.
- **Schermen.** Elk scherm heeft zijn eigen machtiging `screen:<name>:open`. Start en de hubs tonen alleen de tegels die de persoon mag openen, en de route controleert opnieuw.
- **Spraak- en toetsenbordopdrachten** zijn geen toegangsbeheer en worden nooit gebruikt om toegang te verlenen.
- **Waar u het beheert.** [Rollen](#screen-staff-roles), [Medewerkers](#screen-staff-members) en het [tabblad Personeel](#screen-tab-staff). Wijzigingen in rollen en machtigingen worden geaudit.

### Multifactorauthenticatie en herauthenticatie bij ondertekening {#ch1-mfa}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > Multifactorauthenticatie en herauthenticatie bij ondertekening

**Status:** Gedeeltelijk. Browserkant Gerealiseerd. De authenticator voor demonstratieaccounts is **Gesimuleerd**. Serverkant Gepland.

- **Gebruikers van single sign-on.** De identiteitsprovider vraagt om de tweede factor. PathScribe leest het ID-token en accepteert MFA wanneer `amr` de waarde `mfa` bevat, of methoden uit twee verschillende families noemt (kennis, bezit, inherentie), of wanneer `acr` een multifactorklasse noemt. Een wachtwoord alleen is geen MFA. Als de organisatie MFA vereist en het token dat niet zegt, wordt de aanmelding met een duidelijk bericht geweigerd. De provider moet zo zijn ingesteld dat hij deze claims meestuurt (Entra: een Conditional Access-beleid dat MFA vereist; Okta: een authenticatiebeleid met een bezitsfactor; Keycloak: koppel het authenticatieniveau aan `acr` en voeg een `amr`-mapper toe).
- **Beleid per organisatie.** In [Sessiebeveiliging](#screen-session_security): wie wordt gevraagd (niemand, de rollen die verslagen ondertekenen, of iedereen; standaard niemand), hoeveel minuten voordat een handtekening een nieuwe code nodig heeft (1 tot 720, standaard 30) en na hoeveel uur de tweede factor verloopt en de sessie eindigt (1 tot 72, standaard 12). Opgeslagen met `config:session-security:manage` en geaudit.
- **Stap omhoog bij een handtekening.** Wanneer de laatste tweede factor ouder is dan de step-uptijd, vraagt het ondertekenen opnieuw: een nieuwe code voor wachtwoordsessies, of een nieuwe aanmelding bij de provider (`prompt=login`) waarvan het token opnieuw MFA moet bevestigen.
- **Demonstratieaccounts.** Een **gesimuleerde** tijdgebaseerde authenticator (RFC 6238) met herstelcodes die eenmaal worden getoond. Hij zit alleen in de demonstratiebuild. Een serverbuild heeft geen gesimuleerde factor, dus een persoon die geen single sign-on gebruikt en om MFA wordt gevraagd, krijgt te horen dat dit niet beschikbaar is en kan zich niet aanmelden. Het opnieuw instellen van een registratie vereist `auth:mfa-enrolment:reset`.
- **Blokkering.** Vijf mislukte codes blokkeren de controle gedurende 15 minuten. Vijf mislukte aanmeldingen met een wachtwoord blokkeren een e-mailadres gedurende 15 minuten. Deze tellers worden vandaag in de browser bijgehouden; de server moet ze bijhouden. Bij single sign-on past de provider zijn eigen blokkering toe.
- **Authenticatiebeleid voor ondertekening** (Gerealiseerd, Demonstratie). Per uitvoerende faciliteit: een wachtwoord bij elke ondertekening (de standaard, `strict`) of eenmaal per sessie (`session`, met een duur van 15, 30, 60 of 240 minuten), met een optionele tweede factor. Een sessie eindigt bij een time-out, afmelden of een rolwijziging. Het scherm waarschuwt dat de modus eenmaal per sessie afwijkt van wat 21 CFR Part 11 (11.200(a)(1)) verwacht voor latere ondertekeningen, dus het kwaliteitssysteem van de klant beslist.
- **Biometrische ondertekening** (WebAuthn, Touch ID of Windows Hello) is een optionele bevestiging. Elke persoon registreert zijn eigen apparaat en het wachtwoord werkt altijd ook. De serverversie van de biometrische aanroepen is geschreven, maar de schermen gebruiken hem nog niet.
- **Niet gerealiseerd:** beperking van afmelden op afstand per netwerk, verlopen van een ondertekeningssessie bij vergrendeling van het werkstation, SMS en hardwaresleutels als tweede factor, een beleidsopslag aan de serverkant.
- **Waar u het beheert.** [Sessiebeveiliging](#screen-session_security).
### Sessiebeveiliging {#ch1-session}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > Sessiebeveiliging

**Status:** Gedeeltelijk. Time-out bij inactiviteit Gerealiseerd (browser). Sessie bewaard door de server Gepland.

- **Time-out bij inactiviteit.** Een organisatiebrede standaard in [Sessiebeveiliging](#screen-session_security), te kiezen uit 5, 10, 15, 20, 30 of 60 minuten. De standaard is 15. Een uitvoerend laboratorium kan een eigen waarde instellen in het [Faciliteitenwoordenboek](#screen-facility-dictionary). Wanneer een casus is geopend, geldt de waarde van het laboratorium; elders (Start, Werklijst) geldt de waarde van de organisatie. Bij een time-out wordt de persoon afgemeld en blijven niet-opgeslagen concepten bewaard, ze worden niet verwijderd.
- **Hetzelfde account, tweede tabblad.** Opnieuw aanmelden als dezelfde gebruiker in een ander tabblad vervangt de eerdere sessie in dezelfde browser, met een melding.
- **Regel van de server.** De server beëindigt ook een sessie waarvan het token is verlopen, zodat een gesloten of vastgelopen browser er geen open kan houden.
- **Opslag in de browser.** Als een API-server is geconfigureerd, worden geen patiëntgegevens naar de opslag van de browser geschreven. Alleen weergavevoorkeuren, werkstationinstellingen (scanstation, weergaveprofiel, vensterposities) en de aanmeldsessie raken die opslag.
- **Transport en paginabescherming.** De gegenereerde headers stellen een strikte Content-Security-Policy in (geen inline script, geen `eval`, geen framing), HSTS op https-implementaties, `nosniff`, een beleid `no-referrer` (adressen kunnen casus-id's bevatten) en een beperkte Permissions-Policy. Verslag-HTML wordt gesaneerd voordat hij wordt getoond. De browser bezit geen AI-, terminologie- of leverancierssleutel, en een test laat de build mislukken als er een in de front-end verschijnt.
- **Foutrapporten.** Crashrapporten kunnen naar Sentry of naar de eigen verzamelaar van een ziekenhuis, **standaard uit**. Een rapport bevat alleen een foutnaam, een opgeschoond bericht (geen geciteerde tekst, e-mailadressen of reeksen van drie of meer cijfers), hooguit tien stackframes, de route met numerieke segmenten vervangen, en een referentie. Het vereist twee instellingen in `config.json` en, voor een Amerikaanse klant, een ondertekende Business Associate Agreement met de aanbieder, of voor de EU en het VK een verwerkersovereenkomst en gegevensopslag in de EU. Zelf hosten voorkomt beide.
- **Waar u het beheert.** [Sessiebeveiliging](#screen-session_security) en [Faciliteitenwoordenboek](#screen-facility-dictionary).

### Supporttoegang {#ch1-support}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > Supporttoegang

**Status:** Gedeeltelijk. Browserkant Gerealiseerd. Serverkant Gepland.

Het ziekenhuis, als verwerkingsverantwoordelijke, beslist of ForMedrixAI-support bij zijn gegevens mag. "Supporttoegang" betekent een Superadmin-sessie die een organisatie bereikt waarvan de persoon geen medewerker is.

- **Beleid per organisatie.** Uitgeschakeld (support krijgt niets, ook Superadmin niet), **Goedkeuring vereist** (de standaard) of Altijd toegestaan. Bij Goedkeuring vereist vraagt support per ticket toegang, met een reden van minstens 10 tekens. Een goedkeurder in het ziekenhuis (niet de aanvrager) keurt goed of af. Een goedkeuring duurt zolang het toegangsvenster van de organisatie (30 minuten, 1, 2, 4 of 8 uur; de standaard is 2) of korter als support haar beëindigt of het ziekenhuis haar intrekt.
- **De eigen auditstroom van het ziekenhuis.** Gescheiden van het hoofdauditlogboek: aanvragen, besluiten, verlopen, geweigerde openingen, openen en bewerken van casus, elke lijst of zoekopdracht die casus openbaarde (casus-id's; namen van zoekcriteria, nooit waarden), beleidswijzigingen en exports. Elke vermelding is met een hash gekoppeld aan de vorige, zodat een gewijzigde of verwijderde vermelding de keten verbreekt, en het scherm toont de controle op manipulatie. Exporteren kan als CSV of JSON.
- **Machtigingen.** `config:support-access:policy`, `config:support-access:approve` en `config:support-audit:view`, standaard toegekend aan Beheerder. Het openen van de casus van een andere organisatie vereist ook `platform:cross-tenant-cases:view`, die alleen Superadmin kan hebben, en wordt geaudit.
- **Niet gerealiseerd (werk aan de serverkant):** het oorspronkelijke IP-adres en land (de browser legt ze leeg vast), melding per e-mail en webhook aan goedkeurders (vandaag een bericht in de toepassing), beëindiging van de toegang zodra het ticket sluit, PDF-export van de stroom (CSV en JSON bestaan; een PDF-functie is geschreven in de browser), de stroom in een eigen alleen-toevoegentabel per tenant, en supportsessietokens die aan het ticket en de vervaltijd zijn gebonden.
- **Waar u het beheert.** [Supporttoegang](#screen-support_access).

### Auditregistratie {#ch1-audit}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > Auditregistratie

**Status:** Gedeeltelijk. Browserkant Gerealiseerd. Serveropslag Gepland.

- **Wat wordt vastgelegd.** Handelingen van gebruikers, ondertekeningen, amendementen, spraakgebeurtenissen, systeemgebeurtenissen en AI-aanroepen. Elke controle van een machtiging met hoog risico wordt vastgelegd, toegestaan of geweigerd. Configuratiewijzigingen door een bevoegd persoon worden geaudit. Sommige leggen de oude en nieuwe waarden vast (bijvoorbeeld het AI-leveranciersbeleid en overschrijvingen van de ondertekeningsbevoegdheid); voor veel instellingen bevat het logboek alleen de vermelding dat de machtigingscontrole was toegestaan, niet de nieuwe waarde. Zie [Systeemlogboeken](#screen-audit-log) voor wat elke vermelding bevat.
- **Geen patiëntgegevens in het detail.** De `detail`-tekst van het auditlogboek is letterlijk Engels en is zo opgebouwd dat hij geen namen van patiënten, geboortedata, MRN's of klinische waarden bevat. Hij gebruikt identificaties en configuratienamen. Wachtwoorden, codes en geheimen worden nooit vastgelegd.
- **Serverontwerp.** Alleen-toevoegentabellen (alleen invoeg- en selectierechten), elke auditrij geschreven in dezelfde transactie als de wijziging die ze vastlegt, een met hash gekoppelde stroom voor supporttoegang en point-in-time-back-ups. Geëxporteerde auditarchieven op onveranderlijke opslag zijn een optie per ziekenhuis. **Gepland:** niets daarvan bestaat totdat de server is gebouwd. De browserversie bewaart het logboek in demonstratieopslag.
- **Bewaring.** Zie [Gegevensbewaring](#ch1-retention).
- **Waar u het leest.** [Systeemlogboeken](#screen-audit-log), met de weergaven voor interfaces en financiën [Systeemlogboeken: interfaces](#screen-audit-interfaces) en [Systeemlogboeken: financieel](#screen-audit-financial).

### Afschermen van patiëntgegevens in schermafbeeldingen voor support {#ch1-phi}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > Afschermen van patiëntgegevens in schermafbeeldingen voor support

**Status:** Gerealiseerd.

Wanneer een gebruiker een Verbeteringsverzoek verstuurt, maakt de app een schermafbeelding en dekt ze elk element af dat als patiëntgegevens is getagd voordat de afbeelding de browser verlaat. Alles wat een naam, geboortedatum, MRN of nationale identificatie van een patiënt, een accessie- of casusnummer, of contact- of verzekeringsgegevens van een patiënt toont, is met zijn soort getagd als `data-phi`. Toasts die een casus noemen, zijn verpakt zodat ze ook worden afgedekt. Namen van medewerkers worden niet als patiëntgegevens behandeld. Een test leest elk bronbestand en laat de build mislukken bij een niet-getagde plaats, zonder uitzonderingenlijst. Beperkingen om rekening mee te houden: vrije tekst die toevallig een identificatie bevat (auditdetail, redenen van interface-uitzonderingen) kan door geen enkele codecontrole worden herkend, dus die cellen worden in hun geheel afgedekt; en de controle leest namen, geen typen, dus een waarde die via een generieke lijst wordt doorgegeven, kan worden gemist (zo'n geval is gevonden en opgelost in Batch 368, waarna twintig schermen in een browser zijn gecontroleerd).

### AI-leveranciersbeleid en hostingregio's {#ch1-ai-policy}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > AI-leveranciersbeleid en hostingregio's

**Status:** Gedeeltelijk. Controle in de browser Gerealiseerd. Controle door de serverproxy Gepland.

- **Waarom.** Sommige jurisdicties noemen welke AI-leveranciers zijn toegestaan of verboden. PathScribe is leveranciersneutraal en controleert elke AI-aanroep voordat hij wordt verzonden.
- **De regel.** Per jurisdictie, en optioneel per faciliteit: de toegestane AI-diensten en de toegestane hostingregio's voor elke dienst. Zonder regel is elke dienst toegestaan. Een regel van een faciliteit beperkt de regel van haar jurisdictie en de aanroep moet beide doorstaan. Waar een regel regio's beperkt, wordt een aanroep waarvan de regio niet is vastgelegd, geweigerd. De diensten worden benoemd naar de vorm van het verzoek: gestructureerde berichten (Anthropic), chatvoltooiingen (OpenAI), beheerde chatvoltooiingen (Azure OpenAI), modelgateway (AWS Bedrock), gestructureerde inhoud (Google Gemini) en aangepast (een zelf gehost model). De geconfigureerde hostingregio wordt opgeslagen bij de instelling van de AI-aanbieder.
- **Bij weigering.** De functie gaat verder zonder AI en zegt waar mogelijk "AI is niet beschikbaar voor deze jurisdictie". De aanroep wordt nooit in plaats daarvan naar een andere leverancier verstuurd.
- **De server moet de controle herhalen.** Een controle in de browser kan worden omzeild, dus de AI-proxy van de server moet op elke route dezelfde controle uitvoeren en is degene die telt. Hij moet de dienst en de regio kiezen uit de opgeslagen instelling, nooit uit de body van het verzoek, antwoorden met `403` en code `AI_VENDOR_NOT_ALLOWED`, en de weigering auditen. **Gepland.**
- **Sleutels.** De browser bezit nooit een sleutel van een AI-leverancier. In productie staan de sleutels in de geheimenopslag van de server (bijvoorbeeld Azure Key Vault). De opgeslagen instelling bevat de aanbieder, het model, het endpoint en de naam van de deployment, nooit een sleutel.
- **Wat de server ook zou moeten doen (Gepland):** elke AI-aanroep auditen (wie, casus, gecontroleerde faciliteit en jurisdictie, dienst, model, hostingregio, functie, tokens, uitkomst; nooit de prompt, die patiëntgegevens kan bevatten), een limiet per gebruiker en organisatie instellen, en controleren of voor de gekozen aanbieder een Business Associate Agreement of verwerkersovereenkomst bestaat.
- **Bekende leemte.** In de browser stuurt een aanbiederinstelling `mock` AI-verzoeken via de proxy naar de Anthropic-route, zodat een demonstratielocatie met de instelling `mock` de proxy toch aanroept. Een jurisdictie die Anthropic niet toestaat, weigert dit.
- **Menselijke beoordeling.** AI-uitvoer is een suggestie. De schermen die haar gebruiken, tonen haar zodat de clinicus haar kan accepteren of afwijzen; zie het AI-hoofdstuk (hoofdstuk 5).
- **Waar u het beheert.** De kaart AI-leveranciersbeleid en de kaart hostingregio's op het tabblad [AI-gedrag](#screen-tab-ai). Het wijzigen van een regel vereist `config:ai-vendor-policy:manage` (standaard Beheerder en Laboratoriumdirecteur) en elke wijziging wordt geaudit als `AI_VENDOR_POLICY_CHANGED`.

### Gegevensbewaring {#ch1-retention}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > Gegevensbewaring

**Status:** Gedeeltelijk. De instellingen zijn Gerealiseerd. **Niets verwijdert nog gegevens op grond daarvan**; de opschoontaak is werk aan de serverkant.

[Gegevensbewaring](#screen-retention) bevat vier termijnen: AI-suggesties (standaard 90 dagen), auditlogboeken (standaard 365 dagen), casusmomentopnamen (standaard 7 jaar) en het verslagarchief (standaard 10 jaar). Het scherm waarschuwt dat de minimale bewaartermijn van het auditlogboek 90 dagen is en dat verkortingen tot onder de wettelijke minima de goedkeuring van de compliance officer van de instelling vereisen. Opslaan vereist `config:retention-policy:manage`. De bewaring van fysieke monsters en blokken wordt afgehandeld door de vernietigingswachtrij en de Bewaarblokkades op casusniveau, die de jurisdictie volgen (RCPath voor het VK, CAP en CLIA voor de VS). Onveranderlijke verslagdocumenten in blobopslag vormen zelf een bescherming tegen verwijdering. Bewaartermijnen voor back-ups: Nog niet gespecificeerd.

### HIPAA en CLIA: de maatregelen die het product heeft {#ch1-regulatory}
Breadcrumb: Start > Beheerdershandleiding > Systeemoverzicht en architectuur > Beveiligingsmodel > HIPAA en CLIA: de maatregelen die het product heeft

**Status:** Gedeeltelijk. De tabel noemt maatregelen die in de browserbuild bestaan. Geen enkele maatregel beschermt echte patiëntgegevens zolang de serverkant niet bestaat, en het gebruik van deze maatregelen maakt een laboratorium **niet conform** HIPAA, CLIA of enige andere wet. Conformiteit hangt af van het beleid, de contracten, de hosting en het kwaliteitssysteem van het laboratorium.

| Gebied | Wat PathScribe heeft | Status | Waar |
|---|---|---|---|
| Unieke gebruikersidentiteit | Personeelsrecords, met single sign-on gekoppeld via het permanente subject van de provider | Gedeeltelijk | [Medewerkers](#screen-staff-members) |
| Toegangsbeheer (minimale rechten) | Machtigingen en rollen, bereik per faciliteit, geen omzeiling voor welke rol dan ook, privacy van casus | Demonstratie | [Rollen](#screen-staff-roles) |
| Automatisch afmelden | Time-out bij inactiviteit (standaard van de organisatie, overschrijving per laboratorium); concepten blijven bewaard | Gerealiseerd (browser) | [Sessiebeveiliging](#screen-session_security) |
| Authenticatie van personen | Single sign-on, MFA van de provider gecontroleerd aan de hand van het token, step-up bij een handtekening, optionele apparaatcontrole | Gedeeltelijk | [Sessiebeveiliging](#screen-session_security) |
| Auditcontroles | Auditlogboek van handelingen, controles met hoog risico en configuratiewijzigingen; met hash gekoppelde supportstroom | Gedeeltelijk | [Systeemlogboeken](#screen-audit-log) |
| Beveiliging van verzending | https vereist voor elk serveradres, HSTS, strikt inhoudsbeleid; wederzijdse TLS voor de site-agent | Gerealiseerd (browser en headers). Server gepland | [Netwerk](#ch1-prereq-network) |
| Toegang van leveranciers | Door het ziekenhuis beheerde, aan een ticket gekoppelde, tijdelijke supporttoegang met een eigen audit | Gedeeltelijk | [Supporttoegang](#screen-support_access) |
| Minimaal noodzakelijk in hulpmiddelen | Patiëntgegevens afgeschermd in schermafbeeldingen voor support; geen patiënttekst in webadressen, fouten of hubberichten; crashrapporten opgeschoond | Gerealiseerd | [Afschermen](#ch1-phi) |
| Derden die patiëntgegevens verwerken | AI-leveranciersbeleid per jurisdictie, regiobeperkingen, sleutels beheerd door de server; Business Associate Agreement of verwerkersovereenkomst nodig voor elke aanbieder | Gedeeltelijk | [AI-gedrag](#screen-tab-ai) |
| Integriteit van het verslag | Eén onveranderlijk, gehasht (SHA-256) verslagdocument per vrijgave, ongewijzigd verzonden via elk kanaal; geversioneerde casusopslag met detectie van conflicten | Gerealiseerd (contract); server gepland | Hoofdstuk 6 |
| Gegevensbewaring | Configureerbare termijnen; vernietigingswachtrij en Bewaarblokkades voor monsters | Gedeeltelijk | [Gegevensbewaring](#screen-retention) |
| CLIA: ondertekeningsbevoegdheid | Deelnametypen en ondertekeningsregels per land bepalen wie mag ondertekenen, met geauditeerde lokale overschrijvingen | Gerealiseerd | [Deelnametypen](#screen-participation_types), [Ondertekeningsregels per land](#screen-country_signing_rules) |
| CLIA: werklast en competentie in de cytologie | Een dagelijkse werklastlimiet voor GYN-cytologiescreening, met overschrijvingen per medewerker en faciliteit, en het doorsturen van de ondertekeningen van een nieuwe cytotechnoloog naar een supervisor voor medeondertekening totdat competentiebeoordelingen zijn vastgelegd | Gerealiseerd (browser). De server registreert de screeningtijd met zijn eigen klok; gepland | [Dagelijkse werklastlimiet](#screen-cytology_workload_cap), [Regels per land en laboratorium](#screen-cytology_compliance_features) |
| Faciliteitsidentiteit op verslagen | Een faciliteitsrecord bevat haar CLIA- of ISO 15189-nummer, getoond in verslagkoppen | Gerealiseerd | [Faciliteitenwoordenboek](#screen-facility-dictionary) |

**Niet gerealiseerd of niet gespecificeerd:** versleuteling in rust voor de SQL Server-database (in de repository is geen instelling of eis beschreven; de blobcontainers zijn gespecificeerd als versleuteld in rust); een specificatie voor back-up en disaster recovery; een tamper-evident auditopslag aan de serverkant; een onafhankelijke penetratietest of beveiligingscertificering (er is er geen vastgelegd in de repository); en elke verklaring van conformiteit.
