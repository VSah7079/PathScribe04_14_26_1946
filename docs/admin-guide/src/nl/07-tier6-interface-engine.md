---
chapter: 7
id: ch7
title: Niveau 6: Interface-engine en integraties met externe systemen
---

# Niveau 6: Interface-engine en integraties met externe systemen {#ch7}

Dit hoofdstuk beschrijft hoe PathScribe berichten uitwisselt met andere systemen: het elektronisch patiëntendossier (EPD) van het ziekenhuis, een laboratoriuminformatiesysteem (LIS), referentielaboratoria, factureringssystemen, registers en rapportagetools. Het beschrijft ook de schermen waarmee een beheerder die uitwisselingen bewaakt en de mislukte uitwisselingen afhandelt.

Lees de status van elk onderdeel voordat u er een project omheen plant. Een groot deel van dit niveau is een contract dat is geschreven en een browserkant die is gebouwd, terwijl de server en de interface-engine aan de andere kant nog niet zijn aangesloten. Waar iets niet is gerealiseerd, staat in de sectie **Niet gerealiseerd** of **Gepland** en wordt het dichtstbijzijnde onderdeel genoemd dat wel bestaat.

**De regel van dit hoofdstuk.** PathScribe bepaalt wat er wordt verzonden en wanneer. De interface-engine bepaalt hoe: de HL7-tekst, de verbinding, de nieuwe pogingen op de lijn en de eigen terminologie van de leverancier. PathScribe vertaalt nooit veldnamen of codes van een leverancier en beweert niet een gecertificeerde connector voor een EPD te zijn.

## De volgorde van inrichting voor niveau 6 {#ch7-order}
Breadcrumb: Start > Configuratie > Systeem > Integraties

Niveau 6 is grotendeels optioneel. Een laboratorium dat PathScribe zelfstandig gebruikt, zonder LIS, zonder registerfeed en zonder rapportagetool, kan het hele niveau overslaan. Voer de onderstaande stappen alleen uit voor de integraties die u gebruikt, in deze volgorde. Bij elke stap staan de schermen die eerst moeten zijn ingericht (niveaus 1 tot en met 5). Dezelfde informatie staat in het kader Inrichtingsvolgorde op elk scherm.

1. [Specimencode-koppeling](#screen-crosswalk): koppel de eigen specimencodes van elke verzendende faciliteit aan uw Specimenwoordenboek, zodat inkomende aanvragen worden herkend. Vereist het Faciliteitenwoordenboek en het Specimenwoordenboek.
2. [Interfacewoordenboek](#screen-interface_dictionary) (alleen voor medewerkers van ForMedrixAI): beschrijf de eigen velden van een leverancier. Klanten voeren deze stap niet uit; zij staat in de lijst zodat de nummering compleet is.
3. [LIS-ontvangst (Assist-modus)](#screen-assist_lis_polling): voor een laboratorium waarvan het LIS eigenaar van de casus is en PathScribe ondersteunt met AI-concepten. Vereist AI-gedrag en de Synoptische bibliotheek.
4. [Rapportagefeed (Power BI)](#screen-bi_feed): laat een rapportagetool PathScribe-gegevens lezen. Vereist de faciliteiten met uitvoerend laboratorium in het Faciliteitenwoordenboek.
5. [Migratie-veldkoppelingen](#screen-migration_field_mappings): koppel de veldnamen van een legacysysteem, vóór elke import van historische gegevens.
6. [Historische gegevensmigratietaken](#screen-migration-jobs): importeer een legacybestand en controleer de taak. Vereist stap 5.
7. [Inlezen aanvraagbonnen](#screen-requisition_ingestion): in batches gescande papieren aanvraagbonnen via de barcode op elke pagina aan hun casus koppelen. Vereist de aflevermap van de scanner (of het systeem dat scans stuurt).

De bewakingsschermen ([Systeemlogboeken: interfaces](#screen-audit-interfaces), [Interface-engines](#screen-interface-engines), [Uitgaande interface-DLQ](#screen-outbound-interface-dlq), [Uitgaande verzendingen](#screen-outbound-dispatches) en de [Uitgaande wachtrij](#screen-outbound-queue)) en de testtools ([Voorbeeld van uitgaande interfaceberichten](#screen-outbound_message_preview), [Gesimuleerde postvak-uit](#screen-simulated_mail), [Gesimuleerde interface-engine](#screen-mock-interface-engine) en [Mock EMR](#screen-mock-emr)) zijn geen inrichtingsstappen. Elk scherm vermeldt `Reference, not part of setup` en noemt wat er moet bestaan om gegevens te tonen.

## Wat dit niveau wel en niet bevat {#ch7-status}
Breadcrumb: Start > Configuratie > Systeem > Integraties

| Onderdeel van de opzet | Status | Wat er vandaag bestaat |
|---|---|---|
| Architectuur van de interface-engine | Gedeeltelijk | Het berichtcontract en de browserkant zijn gebouwd. De engine (BridgeLink) en de serverendpoints die hij nodig heeft zijn Gepland. Zie [Hoe de interface-engine past](#ch7-architecture). |
| Uitgaand HL7 v2.x (ADT, ORU, ORM) | Gedeeltelijk | PathScribe verstuurt een JSON-bericht dat de engine tot HL7 omzet, behalve drie berichten die het zelf als HL7-tekst opbouwt. Zie [Berichttypen](#ch7-hl7-types). |
| Inkomend HL7 v2.x | Gedeeltelijk | De processors bestaan en u kunt ze testen met geplakte berichten. Er ontvangt nog geen listener een live HL7-bericht. |
| FHIR R4-endpoint en OAuth2-clientreferenties | Niet gerealiseerd | Geen endpoint en geen inrichtingsscherm. Zie [FHIR R4 en OAuth2](#ch7-fhir). |
| EPD-integratie (Epic, Cerner, MEDITECH, AthenaHealth) | Niet gerealiseerd | Geen leveranciersconnector, gecertificeerd of niet. Zie [EPD-integratie](#ch7-ehr). |
| Verzending naar en ontvangst terug van referentielaboratoria | Gedeeltelijk | Verzendlijsten van doorverwijzingen worden verstuurd en een uitslagpayload wordt verwerkt. Er ontvangt nog geen inkomend endpoint een uitslag. Zie [Interfaces met referentielaboratoria](#ch7-reflab). |
| Interfacebewaking, foutwachtrijen en opnieuw verwerken | Gerealiseerd (browserkant) | De schermen en hun bevoegdheden werken. De heartbeat van de engine en nieuwe pogingen aan de kant van de engine zijn Gepland. Zie [Bewaking](#ch7-monitoring). |

## Hoe de interface-engine past {#ch7-architecture}
Breadcrumb: Start > Configuratie > Systeem > Integraties

**Status:** Gedeeltelijk

### De term "PathScribe Interface Engine" {#ch7-pie-term}
Breadcrumb: Start > Configuratie > Systeem > Integraties

In de opzet van deze handleiding heet de interfacelaag de PathScribe Interface Engine (PIE). Die naam komt niet voor in het product, in de schermen of in de ontwerpdocumenten, en deze handleiding verzint geen productnaam. Het product heeft twee onderdelen die samen het werk doen dat de opzet beschrijft:

- **De PathScribe-kant.** Services in de toepassing bepalen wat er wordt verzonden en wanneer, bouwen het JSON-bericht, zetten het in de wachtrij, leggen de uitkomst vast en laten een beheerder het opnieuw verzenden, aanhouden of vrijgeven. Alles in dit hoofdstuk waarop u kunt klikken, staat aan deze kant.
- **De interface-engine.** Het ontwerp gebruikt BridgeLink, een opensourcefork van Mirth Connect, als engine. Hij zet de JSON van PathScribe om in HL7 (of een ander formaat), heeft een eigen berichtenopslag, verstuurt naar het ontvangende systeem en ontvangt antwoorden. BridgeLink is de werknaam in de ontwerpdocumenten (`INTERFACE_ENGINE_EDGE.md`). De kanaalsjablonen zijn Gepland, niet gebouwd.

### Waar de engine draait {#ch7-hosting}
Breadcrumb: Start > Configuratie > Systeem > Integraties

De engine is één containerimage dat op twee plaatsen wordt gebruikt, te kiezen per ziekenhuis (besluit D6). ForMedrixAI kan hem hosten in de regio van de tenant, of hij kan worden geïnstalleerd op een virtuele machine in het ziekenhuis. Het scherm [Interface-engines](#screen-interface-engines) toont van welk van de twee elke engine is (**Gehost** of **Op locatie**). Het image, de kanaalsjablonen en de healthendpoints zijn Gepland, bij het serverteam.

HL7-berichten reizen niet over de SQL Server-berichtenbus (besluit D1). De API-server geeft een bericht aan de engine door als taak van het soort `interface.dispatch`, en de engine bewaart HL7 in zijn eigen berichtenopslag.

### Wat vandaag draait en wat Gepland is {#ch7-today}
Breadcrumb: Start > Configuratie > Systeem > Integraties

| Onderdeel | Status | Wat het voor u betekent |
|---|---|---|
| Uitgaande berichten, JSON-envelop | Gerealiseerd (browserkant) | De browser post `{queueEntryId, transactionType, dispatchedAt, payload}` naar het adres in de build-instelling `VITE_INTERFACE_RECEIVER_ENDPOINT`. In een productiebuild moet het adres `https` zijn; een ontbrekend adres of een adres met gewoon HTTP wordt geweigerd voordat er iets wordt verzonden. De wachttijd is 15 seconden. |
| Wat als verzonden geldt | Gerealiseerd (browserkant) | Elk 2xx-antwoord markeert het bericht als verzonden. Er is nog geen HL7-bevestiging (ACK). Een time-out, een onbereikbare engine en een afwijzing zijn drie verschillende fouten op de schermen. |
| Demonstratiebuild | Demonstratie | Zonder ingesteld engineadres ontvangt een gesimuleerde engine elk bericht en bewaart het in een lijst. Zie [Gesimuleerde interface-engine](#screen-mock-interface-engine). |
| Inkomende gebeurtenissen van instrumenten | Gerealiseerd (browserkant) | Er bestaan vier webhooks voor de Cassette Engine: blokuitzondering, uitkomst van cassetteverzending, materiaallocatie en status van de graveermachine. Zij gebruiken een gedeeld geheim in de header `X-API-Key`, met een optionele HMAC-handtekening. |
| Inkomende HL7-berichten | Niet gerealiseerd | De processors voor ADT en patiëntbeheer bestaan en zijn getest, maar niets ontvangt een live HL7-bericht en roept ze aan. |
| Serverendpoints voor de engine (`POST /api/interface/inbound`, `POST /api/interface/outbound-acks`, `POST /api/interface/heartbeat`, `GET /api/interface/engines`) | Gepland | Vastgelegd als contract (fase 2e). Zij voegen overdracht, uitkomsten die door een bevestiging zijn afgehandeld, termijnen voor nieuwe pogingen, dead letters en enginestatus toe. |
| Engineauthenticatie per tenant | Gepland | OAuth2-clientreferenties of mutual TLS per tenantengine. Zie [FHIR R4 en OAuth2](#ch7-fhir). |

**Geplande termijnen voor nieuwe pogingen.** Het contract bepaalt dat inkomende berichten 10 seconden, 30 seconden, 1 minuut, 5 minuten en daarna 15 minuten wachten, met een dead letter na 24 uur. Uitgaande berichten worden opnieuw verzonden na 1, 5, 15 en 60 minuten, daarna elk uur, gedurende 24 uur. Registerinzendingen worden 72 uur bewaard. Een bevestiging van AA wordt verzonden; CA wordt verzonden of wacht op de applicatiebevestiging; AR en CE worden binnen de termijn opnieuw geprobeerd; AE en CR mislukken onmiddellijk. Een uitslag die als dead letter is aangemerkt, houdt latere berichten voor dezelfde casus tegen. Dit draait nog niet. Vandaag wacht een mislukte verzending tot een beheerder haar opnieuw verzendt.

### Instellingen voor faciliteitsinterfaces die worden opgeslagen maar niet gebruikt {#ch7-facility-settings}
Breadcrumb: Start > Configuratie > Systeem > Integraties

De Faciliteitseditor (niveau 1, [Faciliteitenwoordenboek](#screen-facility-dictionary)) heeft een tabblad **LIS-integratie**. Het slaat een engineadres op, de HL7-versie, het type authenticatie (geen, basic, OAuth2 of API-sleutel), een vlag die zegt of er een referentie is ingericht, of het LIS de casusstatussen beheert, of PathScribe handelingen na de finalisatie toestaat, en de routeringsidentificaties voor de verzendende en de ontvangende faciliteit en een overschrijving van het uitgaande kanaal. Deze instellingen worden bij de faciliteit opgeslagen. Geen enkel verzendpad leest ze vandaag. Een bericht gaat naar het ene adres op implementatieniveau hierboven. De referentie wordt nooit opgeslagen: alleen een vlag Ja/Nee.

## Inkomend en uitgaand HL7 v2.x {#ch7-hl7}
Breadcrumb: Start > Configuratie > Systeem > Integraties

**Status:** Gedeeltelijk

### Berichttypen {#ch7-hl7-types}
Breadcrumb: Start > Configuratie > Systeem > Integraties

Er is geen scherm waarmee u berichttypen in- of uitschakelt. De onderstaande typen liggen vast in het product. Dit deel noemt alleen wat de code ondersteunt. Wat niet wordt genoemd, wordt niet ondersteund.

**Uitgaand.** PathScribe zet deze transactietypen in de wachtrij. De engine bouwt de HL7 voor alle typen behalve de drie die als "PathScribe builds HL7" zijn gemarkeerd.

| Transactietype | Wat het bevat | HL7-vorm |
|---|---|---|
| `A08` | Wijziging van patiëntgegevens | Engine bouwt ADT^A08. Geslacht wordt in PID-8 verzonden als M, F, U of A voor onbepaald (de code A is een aanname in afwachting van bevestiging met de ontvangende systemen). Voor Britse locaties is de NHS-code M naar 1, F naar 2, I naar 9, U naar X. |
| `A40` | Samenvoeging van patiënten | Engine bouwt ADT^A40 |
| `A47` | Wijziging van patiëntidentificatie | Engine bouwt ADT^A47 |
| `ORU_R01` | Definitieve, aangevulde of gecorrigeerde pathologie-uitslag | Engine bouwt ORU^R01. Voor Amerikaanse elektronische pathologie (niveau 7) bouwt PathScribe zelf een ORU^R01 v2.5.1. |
| `LIS_SYNC` | Casusgegevens en het synoptische resultaat van een Assist-casus, voor het LIS | Engine bouwt het |
| `ORDER_CREATED` | Een nieuwe aanvraag | Engine bouwt het |
| `ACCESSION_EVENT` | Een aanvraag die is geaccessioneerd, of een accessietekortkoming | Engine bouwt het |
| `REGISTRY_REPORT`, `CANCER_REGISTRY_REPORT` | Registerinzendingen (niveau 7) | Engine bouwt het. Bevestigingen komen terug. |
| `REPORT_DELIVERY` | Een ondertekende verslag-PDF voor e-fax of bestandsafgifte | Engine of afleverservice |
| `PRINT_JOB` | Een verslag-PDF die de engine afdrukt | Engine |
| `REFERRAL_MANIFEST` | De verzendlijst van een doorverwijsbatch voor een referentielaboratorium | Engine bouwt het. Uitslagen komen terug. |
| `MOLECULAR_ORDER` | Een aanvraag voor een moleculaire assay of een instrumentaanvraag | Engine bouwt het |
| `WSI_SCAN_MANIFEST` | De preparaten die in een scanbatch voor whole slide imaging zijn geladen | Engine bouwt het. De scanstatus van de preparaten komt terug. |
| `BLOCK_ORDER` | De kleuringsaanvragen van één blok voor een inbed- of kleuringsinstrument | PathScribe builds HL7: ORM^O01 |
| `SLIDE_ORDER`, `SPECIMEN_LABEL` | Een preparaataanvraag; een label voor een monstercontainer | Engine bouwt het |
| `MATERIAL_SCAN_EVENT` | Een barcodescan van een cassette of een preparaat | Engine bouwt het |
| `CHARGE_DFT` | Een kostenregel voor het factureringssysteem | PathScribe builds HL7: DFT^P03 |
| `CHARGE_JSON` | Een kostenregel als JSON-webhook voor facturering | JSON, geen HL7 |
| `FINANCIAL_CLASS` | Payload voor de financiële klasse voor een factureringsengine | Een voorbeeldpayload totdat de formaten bestaan |
| `CRITICAL_ALERT` | Kanalen voor kritieke meldingen na de livegang | Niet aangesloten. Niets produceert het vandaag. |

De "ORM" in de opzet is dus de ORM^O01 die PathScribe bouwt voor blokaanvragen aan een instrument. PathScribe bouwt zelf geen ORM voor een EPD of een LIS. De engine bepaalt in welke HL7 een bericht over een aangemaakte aanvraag wordt omgezet, en er is geen scherm om een berichttype toe te voegen.

**Inkomend.** Deze processors bestaan in de toepassing. Geen ervan is aangesloten op een live listener, behalve de instrumentwebhooks hierboven. In de demonstratiebuild kunt u een geplakt bericht erdoorheen halen met de [Gesimuleerde interface-engine](#screen-mock-interface-engine).

| Familie | Berichten | Status |
|---|---|---|
| Opname, ontslag en overplaatsing (`adtParser.ts`) | A01, A03, A04, A08, A02, A09, A10, A05, A06, A07, A11, A12, A13, A31 | Processor gebouwd; geen listener |
| Patiëntbeheer (`patientManagementParser.ts`) | A40 samenvoegen, A24 koppelen, A47 wijziging van identificatie, A43 verplaatsen | Processor gebouwd; geen listener. Een bericht dat niet kan worden gekoppeld, wordt als interface-uitzondering in de wachtrij gezet en nooit geraden. |
| Bezoekwijzigingen (`processVisitMessage.ts`) | A45, A50, A34 | Processor gebouwd; geen listener |
| Status van LIS-aanvragen (de Assist-adapter) | ORU^R01, ORM^O01, OML^O21 | Alleen status. U kunt er een plakken in [LIS-ontvangst (Assist-modus)](#screen-assist_lis_polling). |
| JSON-gebeurtenissen | HPV-uitslag, blokuitzondering, materiaallocatie, doorverwijsuitslag, uitslagen van moleculaire runs, scanstatus van whole slide imaging | Processors gebouwd; de instrumentwebhooks zijn de enige live route |

**Inkomende aanvragen worden niet uit HL7 geparseerd.** De service voor aanvraagontvangst neemt een gestructureerde aanvraag aan, geen ORM-bericht, dus een live HL7-aanvraag van een EPD wordt vandaag niet geaccepteerd. De [Specimencode-koppeling](#screen-crosswalk) zet de codes van een aanvraag om zodra een aanvraag de service bereikt.

**Leveranciersadapters.** Adapters voor Cerebro en Vantage zijn bewust stubs die niets doen.

### Specimencode-koppeling {#screen-crosswalk}
Breadcrumb: Start > Configuratie > Systeem > Integraties > Ordertypen & inkomende regels

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Integraties**
**2. Onderhoudsonderdeel:** Ordertypen & inkomende regels (de menunaam). De titel op het scherm is **Specimencode-koppeling**.

**3. Doel en bereik.** Een verzendend systeem gebruikt eigen codes voor specimens, en dezelfde code kan bij verschillende verzendende systemen iets anders betekenen. Dit scherm koppelt de code van elke verzendende faciliteit aan één item in het Specimenwoordenboek. Elke inkomende aanvraag wordt aan deze tabel getoetst. Als er geen item overeenkomt, blokkeert PathScribe de aanvraag niet. Het maakt een item aan dat is gemarkeerd als **Automatisch aangeleerd: wacht op beoordeling**, maakt een openstaand item in het Specimenwoordenboek aan zodat de aanvraag kan doorlopen, en zet een interface-uitzondering van het type `unmapped_order_code` in de wachtrij zodat iemand die oplost. U beoordeelt de automatisch aangeleerde items hier, of u voegt vooraf een echt item toe zodat een bekende code nooit hoeft te worden aangeleerd.

**4. Vereisten en afhankelijkheden.** De lijst **Faciliteit** is het Faciliteitenwoordenboek en de lijst **Komt overeen met** is het Specimenwoordenboek, dus beide worden eerst ingericht. Als u ze overslaat, zijn de lijsten leeg en kan een koppeling niet worden opgeslagen, omdat faciliteit, externe code en specimentype alle drie verplicht zijn.

Setup step: Tier 6, step 1
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Specimenwoordenboek](#screen-specimens)
Unlocks: [Systeemlogboeken: interfaces](#screen-audit-interfaces)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-crosswalk - Lijst van de Specimencode-koppeling met de knoppen Koppeling toevoegen, Spreadsheet importeren en Exporteren]

**6. Veldreferentie.**

De lijst.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Faciliteit | Tekst (alleen-lezen) | Niet van toepassing | De verzendende faciliteit waarvan de code afkomstig is. | Niet van toepassing |
| Externe code | Tekst (alleen-lezen) | Niet van toepassing | De eigen specimencode van het verzendende systeem. | Niet van toepassing |
| Komt overeen met | Tekst (alleen-lezen) | Niet van toepassing | Het item in het Specimenwoordenboek waaraan de code is gekoppeld. | Niet van toepassing |
| Bron | **Bevestigd door beheerder** of **Automatisch aangeleerd: wacht op beoordeling** | Niet van toepassing | **Automatisch aangeleerde** items zijn door het systeem aangemaakt toen er geen item overeenkwam. Een tellerbanner boven de lijst zegt hoeveel items op beoordeling wachten. | Niet van toepassing |
| Banner Wacht op beoordeling | Aantal en koppeling | Niet van toepassing | Wordt getoond wanneer er uitzonderingen voor niet-gekoppelde ordercodes openstaan. De koppeling **Niet-gekoppelde stubs bekijken in auditwachtrij** opent Systeemlogboeken, Interfaces, gefilterd op `unmapped_order_code`. | Verborgen wanneer het aantal 0 is |
| Koppeling toevoegen | Knop | Niet van toepassing | Opent het paneel Koppeling toevoegen. | Niet van toepassing |
| Spreadsheet importeren | Knop, CSV-bestand | Niet van toepassing | Leest een CSV met de kolommen Facility, ExternalCode en ResolvesTo en toont een voorbeeld voordat er iets wordt opgeslagen. | Niet van toepassing |
| Exporteren | Knop | Niet van toepassing | Downloadt `SpecimenCodeCrosswalk.csv` met de kolommen Facility, ExternalCode, ResolvesTo en Source. De export wordt in het auditlogboek vastgelegd. | Niet van toepassing |

Het paneel Koppeling toevoegen.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Faciliteit | Keuzelijst uit het [Faciliteitenwoordenboek](#screen-facility-dictionary) | Verplicht | De verzendende faciliteit. Dezelfde code bij twee verschillende faciliteiten is toegestaan. | Leeg |
| Externe code | Tekst | Verplicht | De code precies zoals de afzender die gebruikt. Bij het vergelijken wordt het verschil tussen hoofdletters en kleine letters genegeerd. De plaatsaanduiding toont `TISSUE-01`. | Leeg |
| Locatie (optioneel) | Keuzelijst met locaties, of **Alle locaties** | Optioneel | Beperkt de koppeling tot één locatie. Een nieuwe koppeling die zonder locatie wordt opgeslagen, geldt voor alle locaties. | Alle locaties |
| Komt overeen met specimentype | Doorzoekbare keuzelijst uit het [Specimenwoordenboek](#screen-specimens), doorzoekt namen en synoniemen | Verplicht | Het item dat een aanvraag met deze code wordt. | Leeg |
| Koppeling opslaan | Knop | Niet van toepassing | Wordt met een melding geweigerd als dezelfde faciliteit, code en locatie al aan een item zijn gekoppeld ("Faciliteit koppelt externe code al aan item"). | Niet van toepassing |

Het voorbeeld van de spreadsheet.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Samenvattingsregel | Tekst | Niet van toepassing | Het aantal rijen dat gereed is, hoeveel een bestaande koppeling bijwerken, hoeveel nieuw zijn en hoeveel met fouten zijn overgeslagen. | Niet van toepassing |
| Rijfouten | Tekstlijst | Niet van toepassing | Een faciliteitsnaam die met geen enkele faciliteit overeenkomt, een lege externe code, of een specimennaam die met geen enkel item in het Specimenwoordenboek overeenkomt. Namen worden op naam vergeleken, zonder onderscheid tussen hoofdletters en kleine letters. Een rij met een fout wordt overgeslagen, nooit geraden. | Niet van toepassing |
| Import toepassen | Knop | Niet van toepassing | Slaat elke rij zonder fout op. Een rij waarvan de faciliteit en code al bestaan, werkt het specimentype van die koppeling bij. Geïmporteerde rijen hebben geen locatie. | Uitgeschakeld wanneer elke rij een fout heeft |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Koppelingen toevoegen, importeren en bijwerken: `config:crosswalk:manage` (hoog risico). Beheerder en Laboratoriumdirecteur hebben die standaard; Superbeheerder heeft elke bevoegdheid behalve `config:ai-prompt:approve`, die wordt onthouden met het oog op functiescheiding (de Laboratoriumdirecteur keurt AI-instructies goed; ForMedrixAI-support nooit). Zonder deze machtiging is het scherm alleen-lezen. Het oplossen van een uitzondering voor een niet-gekoppelde code vanuit het beoordelingsvenster maakt hetzelfde item aan.

**Bekende beperkingen.** De menunaam (**Ordertypen & inkomende regels**) verschilt van de titel op het scherm (**Specimencode-koppeling**); beide zijn hetzelfde scherm. Er is geen bewerken of verwijderen in de lijst, alleen toevoegen en bijwerken via een spreadsheet. Een live HL7-aanvraag wordt nog door geen enkele listener ontvangen, dus items worden gebruikt wanneer een aanvraag de service voor aanvraagontvangst bereikt, niet uit een bericht van de lijn.
### LIS-ontvangst (Assist-modus) {#screen-assist_lis_polling}
Breadcrumb: Start > Configuratie > Systeem > Integraties > LIS-ontvangst (Assist-modus)

**Status:** Gedeeltelijk

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Integraties**
**2. Onderhoudsonderdeel:** LIS-ontvangst (Assist-modus)

**3. Doel en bereik.** In de assistentiemodus is het externe LIS eigenaar van de casus. Zijn wijzigingen bereiken PathScribe op drie manieren: door bevraging, door een HL7 v2-bericht of door een JSON-webhook, en alle drie lopen via één ontvangstwachtrij. Wanneer het LIS Macroscopie voltooid meldt, kiest de AI de synoptische sjablonen en stelt zij de velden op die zij uit de macroscopische tekst kan afleiden. Wanneer het LIS Microscopie/diagnose voltooid meldt, stelt zij de rest op uit de diagnose. Dit scherm bevat de instellingen, een testvak voor geplakte berichten, de ontvangstwachtrij en het runlogboek.

**Wat is gebouwd en wat niet.** Gebouwd: de instellingen, de statuskoppeling, het testvak, de ontvangstwachtrij met zijn nieuwe pogingen, het runlogboek en de regels voor het opstellen door de AI. Gesimuleerd in de demonstratie: de planning (de app bevraagt op het opgeslagen interval zolang zij geopend is en bevraging aan staat, en het scherm toont een melding **Gesimuleerde planning** met de laatste en de volgende run) en het LIS dat **Nu bevragen** aanroept. Niet gebouwd: een live listener voor HL7- of webhookberichten, en een veld voor het adres van het te bevragen LIS. Het scherm heeft zo'n veld niet.

**4. Vereisten en afhankelijkheden.** De AI-stap gebruikt de schakelaars van AI-gedrag en de synoptische sjablonen. Als **AI uitgeschakeld in AI-gedrag** van toepassing is, wijzigt een update alleen de casustekst en wordt er geen concept gemaakt. Alleen een casus in de assistentiemodus wordt verwerkt; een casus die niet in de assistentiemodus staat, wordt overgeslagen met het resultaat **Geen Assist-zaak**.

Setup step: Tier 6, step 3
Requires: [AI-gedrag](#screen-tab-ai), [Synoptische bibliotheek](#screen-tab-protocols)
Unlocks: [Systeemlogboeken: interfaces](#screen-audit-interfaces)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-assist_lis_polling - LIS-ontvangst (Assist-modus) met Bevraging, statuskoppeling, testvak, ontvangstwachtrij en activiteit]

**6. Veldreferentie.**

Bevraging en statuskoppeling.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| LIS volgens schema bevragen | Ja/nee-schakelaar. Het label luidt **Geplande bevraging aan** of **Geplande bevraging uit**. | Optioneel | Zet de geplande bevraging aan. Op de productieserver draait het schema op de PathScribe-server. **Nu bevragen** werkt of dit nu aan of uit staat. | Uit |
| Bevragen elke (minuten) | Geheel getal van 1 tot 1440 | Verplicht | De tijd tussen geplande bevragingen. Een waarde buiten het bereik of een breuk wordt geweigerd met "Het interval moet een geheel aantal minuten zijn van 1 tot 1440." | 5 |
| LIS-status (elke rij) | Tekst | Verplicht | Een van de eigen statuswoorden van uw LIS, bijvoorbeeld `GROSSED`. Bij het vergelijken worden spaties aan de uiteinden en het verschil tussen hoofdletters en kleine letters genegeerd. Een lege status wordt geweigerd. Dezelfde status kan niet twee keer in de lijst staan. | Vier rijen, hieronder |
| Mijlpaal (elke rij) | Keuze uit **Macroscopie voltooid** of **Microscopie/diagnose voltooid** | Verplicht | Wat de status betekent. Macroscopie voltooid start een concept voor de macroscopiefase. Microscopie/diagnose voltooid start een volledig concept. Een status die niet in de lijst staat, start niets. | Macroscopie voltooid bij een nieuwe rij |
| Verwijderen | Knop | Niet van toepassing | Verwijdert de rij. Zonder rijen zegt het scherm "Geen LIS-statussen gekoppeld. Niets zal een AI-concept starten." | Niet van toepassing |
| + Status toevoegen | Knop | Niet van toepassing | Voegt een lege rij toe. | Niet van toepassing |
| Wijzigingen verwerpen, Opslaan | Knoppen | Niet van toepassing | Beide blijven uitgeschakeld totdat er iets wijzigt. Als u het scherm met niet-opgeslagen wijzigingen verlaat, wordt eerst gevraagd wat u wilt doen. | Niet van toepassing |

De vier standaardrijen zijn `GROSS_COMPLETE` en `GROSSED` (Macroscopie voltooid), en `MICRO_COMPLETE` en `DX_COMPLETE` (Microscopie/diagnose voltooid).

Een inkomend bericht testen.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Berichtformaat | Keuze uit **HL7 v2-bericht** of **JSON-webhook** | Verplicht | Welke adapter de geplakte tekst leest. | HL7 v2-bericht |
| Voorbeeld laden | Knop | Niet van toepassing | Vult het vak met een voorbeeld voor het gekozen formaat. | Niet van toepassing |
| Inkomend bericht | Vrije tekst | Verplicht | Het bericht zoals het LIS het zou verzenden. Het loopt door dezelfde adapter en ontvangstwachtrij als een echt bericht en wordt direct verwerkt. Een bericht dat niet kan worden gelezen, toont een reden, bijvoorbeeld "Dit is geen HL7 v2-bericht (het moet beginnen met een MSH-segment)." | Leeg |
| Naar de wachtrij sturen | Knop | Niet van toepassing | Toont "In wachtrij: n, Nu verwerkt: n" of de reden. | Niet van toepassing |

Wat de adapters lezen. Een HL7-bericht moet een ORU^R01, ORM^O01 of OML^O21 zijn; elk ander type wordt geweigerd. Per OBR-segment wordt één update gemaakt. Het accessienummer is OBR-3, anders OBR-2, anders ORC-3. De status is ORC-5, anders OBR-25. De tijd is OBR-22, anders MSH-7, en een tijd zonder offset wordt als UTC gelezen, dus vraag het LIS een offset mee te sturen. De tekst komt uit OBX-5 op basis van de LOINC-code in OBX-3: `22634-0` macroscopisch, `22635-7` microscopisch en `22637-3` definitieve diagnose. Een JSON-body is één object of een lijst, met `accession`, `status` en `updatedAt` (ISO 8601) verplicht, en `grossText`, `microscopicText`, `diagnosisText`, `placerOrderNumber` en `fillerOrderNumber` optioneel. De ordernummers worden overgenomen in het synoptische resultaat.

Ontvangstwachtrij.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Tellerregel | Tekst | Niet van toepassing | De aantallen Wachtend, Mislukt en Verwerkt. | Niet van toepassing |
| Mislukte opnieuw proberen | Knop | Niet van toepassing | Probeert elke mislukte vermelding opnieuw die minder dan 5 pogingen heeft gehad. Uitgeschakeld wanneer er niets is mislukt. | Niet van toepassing |
| Ontvangen, Bron, Accessienummer, LIS-status, Status, Resultaat, Pogingen | Alleen-lezen kolommen | Niet van toepassing | Bron is **Bevraging**, **HL7 v2-bericht** of **JSON-webhook**. Status is **Wachtend**, **Mislukt** of **Verwerkt**. Resultaat is de uitkomst of de fout. Het accessienummer is getagd als patiëntgegeven voor redactie. De lijst toont de nieuwste 25 rijen. Een vermelding wordt na 5 pogingen niet meer opnieuw geprobeerd. De nieuwste 200 verwerkte gebeurtenissen worden bewaard. | Niet van toepassing |

Activiteit.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Nu bevragen | Knop | Niet van toepassing | Vraagt het LIS direct om wijzigingen. | Niet van toepassing |
| Cursorregel | Tekst | Niet van toepassing | "Wijzigingen tot (tijd) zijn verwerkt" of "Het LIS is nog niet bevraagd." | Niet van toepassing |
| Runtabel | Alleen-lezen kolommen: Tijd, Aanleiding, Van het LIS, Nieuw in wachtrij, AI-concepten, Alleen tekst, Overgeslagen, Mislukt | Niet van toepassing | Aanleiding is **Nu bevragen**, **Schema**, **Inkomend bericht** of **Nieuwe poging**. Het logboek bewaart de laatste 20 runs. | Niet van toepassing |
| Laatste bevraging | Alleen-lezen kolommen: Accessienummer, LIS-status, Mijlpaal, Resultaat, Details | Niet van toepassing | Eén rij per casus in de nieuwste run. Een resultaat is een van: AI-concept voorbereid; Geen wijziging sinds het laatste concept; Zaak niet in PathScribe; Al afgetekend; Mislukt (wordt opnieuw geprobeerd); Status niet gekoppeld; Geen Assist-zaak; Tekst bijgewerkt, AI uitgeschakeld in AI-gedrag; Tekst bijgewerkt, concept al voltooid. De details geven nieuwe concepten, voorgestelde velden en sjabloonwijzigingen die te beoordelen zijn. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Instellingen opslaan: `config:assist-polling:manage` (hoog risico). Nu bevragen, testbericht en Mislukte opnieuw proberen: `assist:lis-message:ingest` (hoog risico, gecontroleerd via het auditlogboek); de geplande bevraging is die van het systeem en wordt niet gecontroleerd. Beheerder en Laboratoriumdirecteur hebben beide standaard.

**Bekende beperkingen.** De bron van de bevraging en de planning worden gesimuleerd in de demonstratiebuild, en geen enkele listener ontvangt een HL7- of webhookbericht van een echt LIS. De HL7-adapter leest de status uit ORC-5, daarna OBR-25, en de broncode beschrijft dit als een instelling per locatie, maar het scherm heeft er geen bediening voor. Een afgetekende casus wordt nooit gewijzigd. Een late of aangevulde macroscopie na het volledige concept werkt alleen de tekst bij.

### Voorbeeld van uitgaande interfaceberichten {#screen-outbound_message_preview}
Breadcrumb: Start > Configuratie > Systeem > Integraties > Voorbeeld van uitgaande interfaceberichten

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Integraties**
**2. Onderhoudsonderdeel:** Voorbeeld van uitgaande interfaceberichten

**3. Doel en bereik.** Een controletool. Hij bouwt het JSON-bericht dat PathScribe voor één echte patiënt of casus voor de interface-engine in de wachtrij zou zetten, toont het en laat u het als bestand downloaden. Gebruik hem om een interfaceanalist een echt voorbeeld te geven om op voort te bouwen, of om te controleren wat de engine zal ontvangen voordat een kanaal is gebouwd. Hij verzendt niets en zet niets in de wachtrij. Hij toont alleen vier berichttypen: ADT^A08, ADT^A40, ADT^A47 en ORU^R01.

**4. Vereisten en afhankelijkheden.** Er hoeft eerst niets te worden ingericht. Hij heeft een bestaand patiëntdossier nodig (voor de ADT-typen) of een casus met een gefinaliseerd synoptisch verslag (voor de uitslag). Zonder een van beide meldt het scherm dat de patiënt niet is gevonden of dat de payloadbouwer niets heeft teruggegeven.

Setup step: Reference, not part of setup
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-outbound_message_preview - Keuze van het berichttype, id-velden en de JSON-uitvoer]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Berichttype | Keuze uit ADT^A08 — Demografische update, ADT^A40 — Patiënt samenvoegen, ADT^A47 — Identificatie wijzigen, ORU^R01 — Pathologieresultaat | Verplicht | Bepaalt welke velden hieronder verschijnen. Wijzigen wist de uitvoer. | ADT^A08 |
| Patiënt-ID (A08) | Tekst, een id van een patiëntdossier | Verplicht voor A08 | De patiënt voor wie de demografische update wordt gebouwd. Getagd als patiëntgegeven. | Leeg |
| Vorige (samengevoegde) patiënt-ID (A40) | Tekst | Verplicht voor A40 | Het dossier dat is samengevoegd. | Leeg |
| Overblijvende patiënt-ID (A40) | Tekst | Verplicht voor A40 | Het dossier dat blijft bestaan. | Leeg |
| Tijdelijke patiënt-ID (A47) | Tekst | Verplicht voor A47 | Het tijdelijke dossier waarvan de identificatie wordt gecorrigeerd. | Leeg |
| Bevestigde patiënt-ID (A47) | Tekst | Verplicht voor A47 | Het bevestigde dossier. | Leeg |
| Redencode (A47) | Tekst | Verplicht voor A47 | Waarom de identificatie wijzigt. | Leeg |
| Notities (A47) | Tekst | Verplicht voor A47 | Een opmerking in vrije tekst. | Leeg |
| Casus-ID (ORU^R01) | Tekst | Verplicht voor ORU | De casus. Getagd als accessienummer. | Leeg |
| Synoptische instantie-ID (ORU^R01) | Tekst | Verplicht voor ORU | Een gefinaliseerd synoptisch verslag van die casus. | Leeg |
| Uitslagstatus (ORU^R01) | Keuze uit **Definitief**, **Gecorrigeerd**, **Addendum** | Verplicht voor ORU | De status van de uitslag waarvan u het voorbeeld bekijkt. | Definitief |
| Pakket bekijken | Knop | Niet van toepassing | Bouwt en toont de JSON. Uitgeschakeld totdat de verplichte velden voor het gekozen type zijn ingevuld. | Niet van toepassing |
| JSON downloaden | Knop | Niet van toepassing | Slaat het getoonde bericht op als `<type>_<time>.json`. De download wordt in het auditlogboek vastgelegd. | Niet van toepassing |

Twee waarschuwingen verschijnen op het scherm en zijn juist. Bij A40 en A47 staan de aantallen omgezette casus en contacten op 0, omdat het voorbeeld de samenvoeging niet uitvoert. Bij ORU^R01 ontbreken de verslag-PDF en de verslagtekst, omdat zij de renderpijplijn voor verslagen nodig hebben die dit scherm niet heeft. Elk ander veld heeft de vorm die de engine zou ontvangen. Het ORU-voorbeeld vereist bovendien dat de casus in de rapportagemodus orchestrator staat, en een ontbrekende PDF wordt gemeld als "Er is geen pdf van het verslag voor deze uitslag".

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Een voorbeeld bouwen en downloaden: `config:interface-preview:view` (hoog risico). Beheerder en Laboratoriumdirecteur hebben die standaard.

**Bekende beperkingen.** De eigen ondertitel van het scherm zegt "PathScribe never builds or sends HL7 itself". Dat klopt niet helemaal: PathScribe bouwt HL7 voor blokaanvragen (ORM^O01), kostenregels (DFT^P03) en Amerikaanse uitslagen voor elektronische pathologie. Dit scherm toont alleen de JSON. De vier typen zijn de enige die het kan tonen; de andere transactietypen in [Berichttypen](#ch7-hl7-types) kunnen hier niet worden bekeken. Het verzonden bericht is achteraf te zien in [Uitgaande verzendingen](#screen-outbound-dispatches) voor gebeurtenissen waarbij een aanvraag wordt aangemaakt.

### [FORMEDRIXAI INTERNAL ONLY] Interfacewoordenboek {#screen-interface_dictionary}
Breadcrumb: Start > Configuratie > Systeem > Integraties > Interfacewoordenboek

> 🔒 **Beperkte interne instelling van ForMedrixAI**
> **Bereik:** alleen intern service- en implementatiepersoneel.
> **Toelichting:** Een leveranciersprofiel bepaalt welke velden van het eigen HL7-, JSON- of FHIR-bericht van een leverancier als extensievelden op een casus worden overgenomen. Een profiel dat onjuist is, of dat zonder test is gewijzigd, zou de verkeerde waarde op een casus zetten of een verplichte waarde laten vallen, en het casusdossier is een medisch dossier. Alleen medewerkers van ForMedrixAI bouwen en publiceren profielen, zodat elk profiel wordt getest met een echt voorbeeld en een versie krijgt. De drie bevoegdheden die het beveiligen zijn alleen voor het platform, worden gehouden door de rol Superbeheerder en kunnen niet door een ziekenhuis worden toegewezen. De sectie is niet zichtbaar voor wie ze niet heeft.

**Status:** Gedeeltelijk

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Integraties**
**2. Onderhoudsonderdeel:** Interfacewoordenboek

**3. Doel en bereik.** Het Interfacewoordenboek bevat leveranciersprofielen. Een profiel zegt, voor één leverancier of apparaat en één berichttype, waar elk veld van de leverancier in het bericht staat en welk extensieveld (`ext.name`) op de casus het wordt, met een optionele omzetting, een standaardwaarde, een codevertaling en een vlag voor verplicht. Een profiel doorloopt een vaste levensloop: concept, test, publiceren, en later terugdraaien of uitschakelen. Dezelfde koppelingsengine is bedoeld om live berichten te lezen, zodat een profiel velden van een leverancier kan toevoegen zonder een code-release.

**Gebouwd en niet gebouwd.** Gebouwd: profielen maken, koppelingen bewerken, de test met een voorbeeldbericht, publiceren, terugdraaien, uitschakelen en de bewaking van het bereik. Gesimuleerd: het paneel **Op een casus toepassen**, dat een geplakt bericht op een casus toepast zodat het paneel Leveranciersvelden te zien is. Een banner zegt "In deze versie wordt niets van een leverancier ontvangen." Er zijn geen leveranciersprofielen vooraf geladen, dus de lijst begint leeg. Een profiel kan alleen een extensieveld vullen. Al het andere vereist een code-release (zie de bereiktabel hieronder).

**4. Vereisten en afhankelijkheden.** Geen in deze handleiding. Voor het testen is een voorbeeldbericht van de leverancier nodig.

Setup step: Tier 6, step 2
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-interface_dictionary - Lijst met leveranciersprofielen, koppelingeneditor, testpaneel en versies]

**6. Veldreferentie.**

Nieuw leveranciersprofiel.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Leverancier of apparaat | Tekst | Verplicht | De naam van de leverancier. Een naam die al in gebruik is, wordt geweigerd. | Leeg |
| Berichtformaat | Keuze uit **HL7 v2**, **JSON**, **FHIR** | Verplicht | Bepaalt de syntaxis van de plaats in elke koppeling. | HL7 v2 |
| Berichttype | Tekst. Plaatsaanduidingen: `ORU^R01` (HL7), `Observation` (FHIR), optioneel voor JSON | Verplicht voor HL7 en FHIR | Een HL7-profiel heeft een type nodig zoals `ORU^R01`. Een FHIR-profiel heeft een brontype nodig zoals `Observation`. Een bericht van een ander type wordt geweigerd. | Leeg |
| Profiel maken | Knop | Niet van toepassing | Maakt het profiel zonder live versie. | Niet van toepassing |

Een koppeling (elk één rij in de werkversie, met de titel **Koppeling n**).

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Plaats in het bericht | Tekst, in de vorm die het formaat gebruikt: `ZAB-3` of `OBX[2]-5.1` (HL7), `result.lotNumber` (JSON), `Observation.component[0].valueString` (FHIR) | Verplicht | De plaats van de waarde. Een plaats die niet in de vorm van het formaat is geschreven, wordt geweigerd. Een plaats die op een groep eindigt en niet op een waarde, laat de test mislukken. Een chip **Leverancierssegment (Z)** verschijnt wanneer een HL7-plaats in een Z-segment ligt. | Leeg |
| Extensieveld | Tekst: `ext.` gevolgd door een naam die met een kleine letter begint, alleen letters en cijfers, tot 40 tekens | Verplicht | Het veld op de casus dat de waarde ontvangt. Een deel van de eigen structuur van de casus wordt geweigerd ("vereist een code-release"). Twee koppelingen kunnen niet hetzelfde veld vullen. | `ext.` |
| Naam getoond op de casus | Tekst | Verplicht | Het label dat een gebruiker ziet in het paneel Leveranciersvelden. | Leeg |
| Type | Keuze uit Tekst, Getal, Datum, Datum en tijd, Ja / nee, Code | Verplicht | De waarde wordt in de test aan het type getoetst. | Tekst |
| Omzetting | Keuze uit Geen, Spaties verwijderen, Kleine letters, Hoofdletters, HL7-datum naar ISO, HL7-datum en -tijd naar ISO | Optioneel | De datumomzettingen vereisen het type Datum of Datum en tijd. | Geen |
| Standaardwaarde indien afwezig | Tekst | Optioneel | Wordt gebruikt wanneer het bericht geen waarde heeft. Zij moet bij het type passen. | Leeg |
| Codevertaling | Tekst: `vendor value = shown value`, gescheiden door komma's. Voorbeeld `F=Female, M=Male` | Optioneel | Elke vermelding heeft beide kanten nodig. Een waarde zonder vertaling toont **geen vertaling voor deze waarde** in de test. | Leeg |
| Verplicht (zonder deze waarde mislukt de test) | Ja/nee-selectievakje | Optioneel | Een bericht zonder waarde voor een verplichte koppeling laat de test mislukken. | Uit |
| Koppeling toevoegen, Verwijderen, Koppelingen opslaan | Knoppen | Niet van toepassing | Wijzigingen gelden alleen voor de werkversie. Sla op vóór het testen of publiceren. | Niet van toepassing |

Testen, publiceren en versies.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Voorbeeldbericht | Vrije tekst (getagd als patiëntgegeven) | Verplicht om te testen | Een voorbeeld van de leverancier. Het wordt niet opgeslagen; alleen de aantallen worden bewaard. | Leeg |
| Test uitvoeren | Knop | Niet van toepassing | Toont per koppeling het extensieveld, de waarde en het resultaat: **Gekoppeld**, **Standaardwaarde gebruikt**, **Niet in het bericht**, **Verplichte waarde ontbreekt** of **Probleem**. De samenvatting luidt "Gekoppeld: n, verplicht ontbrekend: n, problemen: n." | Niet van toepassing |
| Publiceren | Knop | Niet van toepassing | Vereist een opgeslagen werkversie met minstens één koppeling, geen koppelingsproblemen en een geslaagde test die nieuwer is dan de laatste wijziging. De live versie wordt de vorige versie. | Niet van toepassing |
| Versietabel | Alleen-lezen: Versie, Status, Wanneer, Door | Niet van toepassing | Status is **Concept**, **Getest**, **Live**, **Vervangen** of **Uitgeschakeld**. | Niet van toepassing |
| Nieuw concept beginnen | Knop | Niet van toepassing | Kopieert de live versie naar een nieuwe werkversie. Per leverancier kan maar één werkversie tegelijk open zijn. | Niet van toepassing |
| Terugdraaien | Knop | Niet van toepassing | Publiceert de eerdere versie als nieuwe versie. | Niet van toepassing |
| Uitschakelen | Knop | Niet van toepassing | Zet het profiel buiten gebruik zodat geen enkele versie live is. | Niet van toepassing |
| Casus (Op een casus toepassen) | Tekst, een casus-id (accessienummer) | Verplicht | De casus die de velden uit het geplakte bericht ontvangt, gelezen met de live versie. Alleen demo, gemarkeerd als **Gesimuleerd**. | Leeg |

De bereiktabel op het scherm noemt wat met koppelen kan worden geregeld (de codes van de leverancier, datum- en tijdformaten, op de casus getoonde namen, extra JSON- of FHIR-elementen, verplichte waarden en standaardwaarden, testen en versiebeheer, de eigen HL7 Z-segmenten van een leverancier) en wat een code-release vereist (patiëntidentiteit, aanvraag- en accessiegegevens, specimens en blokken en preparaten, diagnose en verslaginhoud, autorisatie en wijziging, facturerings- en kostenregels, workflow- en routeringsregels, en een nieuw soort bericht).

**7. Machtigingen.** Alle drie zijn alleen voor het platform: `platform:interface-dictionary:manage` (maken, bewerken, testen, uitschakelen, terugdraaien), `platform:interface-dictionary:publish` (publiceren; vereist manage) en `platform:interface-dictionary:simulate` (op een casus toepassen in de demonstratie; vereist manage). Alleen de rol Superbeheerder heeft ze. Een ziekenhuis kan ze niet aan zijn eigen rollen toekennen. Zonder manage is de sectie verborgen. Een geweigerde wijziging zegt "Alleen ForMedrixAI-medewerkers kunnen leveranciersprofielen wijzigen."

**Bekende beperkingen.** Er is geen leveranciersprofiel vooraf geladen en er wordt nog geen live bericht via een profiel gelezen. De sectiekop in de code noemt dit een Message Mapper; zo'n menunaam bestaat niet.
## FHIR R4-endpoint en OAuth2-clientreferenties {#ch7-fhir}
Breadcrumb: Start > Configuratie > Systeem > Integraties

**Status:** Niet gerealiseerd

PathScribe heeft geen FHIR R4-endpoint. Het publiceert geen FHIR-server, accepteert geen FHIR-resource van een ander systeem en heeft geen scherm om een FHIR-basisadres, een client-id, een clientgeheim of een tokenadres in te stellen. Er is ook geen inrichtingsscherm voor OAuth2-clientreferenties. Plan geen livegang die van een van beide afhangt.

Wat er het dichtst bij komt, zodat u weet waar een vraag over kan gaan:

| Wat | Wat het is | Status |
|---|---|---|
| Casusservice voor een FHIR-bron (`FHIRCaseService.ts`) | Een steiger om casus uit een FHIR-server te lezen. Het basisadres is een plaatshouder en de functie die een toegangstoken ophaalt, geeft een fout. Het is niet aan een scherm of instelling gekoppeld. | Niet gerealiseerd |
| FHIR als berichtformaat in het [Interfacewoordenboek](#screen-interface_dictionary) | Een leveranciersprofiel kan worden geschreven voor een FHIR-resource zoals `Observation`, en de test leest een geplakt voorbeeld. Niets ontvangt een FHIR-bericht van een leverancier. | Gedeeltelijk, alleen ForMedrixAI |
| Type authenticatie in de Faciliteitseditor | Op het tabblad **LIS-integratie** kunt u `OAuth2` kiezen als type authenticatie voor de engineverbinding van een faciliteit. Het is een opgeslagen keuze. Geen code leest haar. | Alleen opgeslagen |
| OAuth2-clientreferenties, of mutual TLS, voor de engine van elke tenant | Het contract voor hoe de engine zich bij de PathScribe API legitimeert (`INTERFACE_ENGINE_EDGE.md`). | Gepland |
| Aanmelden van medewerkers via OpenID Connect (OIDC) | Single sign-on voor mensen, niet voor berichten tussen systemen. Behandeld in niveau 1. | Gerealiseerd (browserkant) |
| Tokens voor de [Rapportagefeed (Power BI)](#screen-bi_feed) | Bearer-tokens die PathScribe uitgeeft, eenmaal toont en alleen als vingerafdruk bewaart. Het zijn geen OAuth2-tokens. | Gedeeltelijk |

De pagina [Mock EMR](#screen-mock-emr) bevat de opmerking "Production uses FHIR R4 API to sync with LIS". Niets in de code onderbouwt die zin. Beschouw haar als een ontwerpintentie.

## EPD-integratie: Epic, Cerner, MEDITECH en AthenaHealth {#ch7-ehr}
Breadcrumb: Start > Configuratie > Systeem > Integraties

**Status:** Niet gerealiseerd

PathScribe heeft geen connector voor enig EPD, gecertificeerd of niet. Het staat in geen enkele marktplaats van een leverancier en heeft volgens het bewijs in deze handleiding geen enkele validatie van een leverancier doorstaan. Wat een EPD ook verstuurt of ontvangt, loopt via de interface-engine, die het interfaceteam van het ziekenhuis inricht, en PathScribe ziet alleen de berichten in [Berichttypen](#ch7-hl7-types). Beschrijf PathScribe aan een klant niet als "Epic-gecertificeerd", "Cerner-gecertificeerd" of iets dergelijks.

| EPD | Wat er in PathScribe bestaat | Wat er niet bestaat |
|---|---|---|
| Epic | Een voorinstelling voor het identificatieformaat met de naam **Epic Beaker** (accessienummer en een patroon voor een 2D-preparaatbarcode). Ingesteld op het tabblad Identificatieformaten van de Faciliteitseditor, niveau 1. | Een connector, een Epic-specifiek berichtprofiel, een certificering, een registratie van een FHIR-app. |
| Cerner | Een voorinstelling voor het identificatieformaat met de naam **Cerner PathNet**. | Hetzelfde. |
| MEDITECH | Een voorinstelling voor het identificatieformaat met de naam **MEDITECH**. | Hetzelfde. |
| AthenaHealth | Niets. De naam komt niet voor in de code, de schermen of de ontwerpdocumenten. | Alles. |

Dezelfde lijst voorinstellingen bevat ook Generic, CoPath, Sunquest en Custom. Een voorinstelling bepaalt alleen welke accessie- en barcodepatronen het scanvak herkent. Zij wisselt met niets een bericht uit.

**Hoe een EPD-integratie er vandaag uitziet.** Een EPD kan PathScribe alleen via de engine bereiken, als de uitgaande berichten in [Berichttypen](#ch7-hl7-types) (uitslagen, patiëntwijzigingen, aanvraaggebeurtenissen, accessiegebeurtenissen) en als inkomende processors die nog niet op een live listener zijn aangesloten. Het [Interfacewoordenboek](#screen-interface_dictionary) heeft geen vooraf geladen leveranciersprofiel voor enig EPD. De [Specimencode-koppeling](#screen-crosswalk) koppelt de specimencodes van een EPD zodra een aanvraag de service voor aanvraagontvangst bereikt. Het EPD behoudt het gezag over de patiëntidentiteit: een A40-, A24-, A47- of A43-bericht dat niet kan worden gekoppeld, wordt als interface-uitzondering voor een persoon in de wachtrij gezet en nooit geraden. Zie [Systeemlogboeken: interfaces](#screen-audit-interfaces).

### Mock EMR {#screen-mock-emr}
Breadcrumb: Start > Mock EMR

**Status:** Demonstratie

**1. Navigatie:** Een venster dat in de demonstratiebuild vanuit een casus wordt geopend, op het adres `/mock-emr?case=<reference>`. Het wordt alleen gebouwd wanneer de demonstratietools aan staan (`__DEMO_TOOLS__`); een build die met een API-server communiceert, bevat het niet.
**2. Onderhoudsonderdeel:** Mock EMR

**3. Doel en bereik.** Een vervanger voor de patiëntweergave van een EPD, zodat een demonstratie het EPD-begeleidende venster naast een casus kan tonen. Het zoekt de patiënt van de casus op met het dossiernummer in de demonstratiecasus en toont een vaste klinische samenvatting. Het leest geen echt EPD en is gemarkeerd met **DEMO: SYNTHETISCHE GEGEVENS**. Als het dossiernummer met geen enkele patiënt overeenkomt, zegt het **Geen patiënt gevonden** in plaats van een verkeerde patiënt te tonen.

**4. Vereisten en afhankelijkheden.** Geen. Het heeft een casus met een patiënt in de demonstratiegegevens nodig.

Setup step: Reference, not part of setup
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-mock-emr - Patiëntweergave van de Mock EMR met de demobadge]

**6. Veldreferentie.** Een alleen-lezen pagina. Niets erop kan worden gewijzigd.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Patiëntnaam, MRN, geboortedatum, geslacht | Tekst (alleen-lezen, getagd als patiëntgegeven) | Niet van toepassing | Uit de gekoppelde demonstratiecasus. De geboortedatum luidt "niet geregistreerd" wanneer die ontbreekt. Een NHS-badge verschijnt wanneer een NHS-nummer is geverifieerd. | Niet van toepassing |
| Opname, Status, Afdeling | Tekst (alleen-lezen) | Niet van toepassing | Vaste demonstratiewaarden (Opgenomen, afdeling 4B Urologie). | Vast |
| Klinische samenvatting: Actieve problemen, Medicatie | Tekst (alleen-lezen) | Niet van toepassing | Vaste demonstratietekst, niet afkomstig van de patiënt. | Vast |
| Integratienotitie | Tekst (alleen-lezen) | Niet van toepassing | De zin over FHIR R4. Zie de opmerking onder [FHIR R4 en OAuth2](#ch7-fhir). | Vast |

**7. Machtigingen.** Er is geen bevoegdheid en de route heeft geen schermpoort. De pagina bestaat alleen in een demonstratiebuild.

**Bekende beperkingen.** Alleen synthetische gegevens, en de klinische samenvatting is voor elke patiënt hetzelfde. Het is geen integratie.

## Interfaces met referentielaboratoria {#ch7-reflab}
Breadcrumb: Start > Configuratie > Systeem > Integraties

**Status:** Gedeeltelijk

Een referentielaboratorium is een faciliteit waarnaar u specimens stuurt voor uitbesteed onderzoek, bijvoorbeeld moleculair onderzoek of doorgestuurde immunohistochemie. PathScribe ondersteunt het verzenden met een verzendlijst en het terugontvangen met een uitslagbericht. De uitgaande kant is gebouwd; de inkomende kant heeft een processor maar geen endpoint.

Er is geen scherm met de naam "interface voor referentielaboratorium". De inrichting is verdeeld over schermen die u al hebt:

1. **Maak het laboratorium een faciliteit.** Voeg in het [Faciliteitenwoordenboek](#screen-facility-dictionary) het laboratorium toe en geef het de rol **Referentielaboratorium (bestemming van uitgaande doorverwijzing)**. Die rol maakt het selecteerbaar als bestemming van een doorverwijsbatch. Alleen een actieve faciliteit met de rol wordt aangeboden.
2. **Koppel het aan de onderzoeken die het uitvoert.** In de [Diagnostische catalogus](#screen-stains) noemt een **Moleculair** onderzoek de referentielaboratoria die het mogen uitvoeren en welke de standaard is. De standaard moet een van de goedgekeurde laboratoria zijn. De koppeling wordt alleen bewaard voor de categorie Moleculair, en een aanvullende aanvraag voor dat onderzoek vult de standaard in en biedt alleen de goedgekeurde laboratoria aan.
3. **Verzenden.** Doorverwijsbatches worden gemaakt in [Batchbeheer](#screen-batch-management) met het verwerkingsknooppunt **Externe doorverwijzing** en een bestemmingsfaciliteit. Wanneer de batch de afstemming voltooit, zet PathScribe een `REFERRAL_MANIFEST`-bericht in de wachtrij en maakt het automatisch het volgrecord aan. Een fout hierbij blokkeert de eigen afronding van de batch nooit. De verzendlijst bevat het batch-id, de masterbarcode, de bestemmingsfaciliteit, het aangevraagde onderzoek, de prioriteit (**STAT** of **Routine**), de items (weergave-id, materiaaltype, accessienummer van de casus en specimenlabel) en eventuele moleculaire aanvragen die worden doorgestuurd. PathScribe bepaalt wat en wanneer; de engine bepaalt het transport.
4. **Volg de verzending.** Het bericht verschijnt in de [Uitgaande wachtrij](#screen-outbound-queue) onder de stroom **Verwijzingen**, en in de [Uitgaande interface-DLQ](#screen-outbound-interface-dlq) onder de wachtrij **Verzendlijst**, waar een mislukt bericht opnieuw wordt verzonden.
5. **Terugontvangen.** Een uitslagbericht (`ReferralResultEventPayload`) bevat het batch-id en ofwel een **discrete** uitslag (tekst) ofwel een **pdf_attachment** (een koppeling naar een PDF), nooit beide, en optioneel de uitslagen voor elke moleculaire aanvraag die is doorgestuurd. De processor controleert de vorm, vindt de batch, legt de uitslag vast en markeert de batch als **result_received**, en past daarna gecodeerde uitslagen toe op de moleculaire aanvragen. De status van een batch gaat alleen vooruit: verzonden, onderweg, afgeleverd, uitslag ontvangen. Een persoon kan onderweg en afgeleverd met de hand instellen; uitslag ontvangen wordt alleen ingesteld wanneer er een uitslag binnenkomt.

**Wat niet is gebouwd.** Geen endpoint ontvangt een uitslagbericht, dus er komt geen uitslag uit eigen beweging van een referentielaboratorium binnen. De processor onthoudt de bericht-id's die hij heeft verwerkt alleen in het geheugen, dus een herstart vergeet ze. Hij geeft een van vier antwoorden: toegepast, al toegepast, volgrecord niet gevonden of ongeldige payload. Er is geen testvoorbeeld voor een doorverwijsuitslag in de [Gesimuleerde interface-engine](#screen-mock-interface-engine). De eigen terminologie van een referentielaboratorium (zijn onderzoeksnamen en uitslagcodes) wordt door PathScribe niet vertaald; de engine is daar eigenaar van.

## Interfacebewaking, foutwachtrijen en opnieuw verwerken {#ch7-monitoring}
Breadcrumb: Start > Kwaliteit & Compliance

**Status:** Gerealiseerd (browserkant)

Alles wat een beheerder nodig heeft om te zien wat is mislukt, en om het opnieuw te verzenden, aan te houden of vrij te geven, staat op de schermen in dit deel. Zij werken vandaag met de demonstratiegegevens en met de services voor de API-server. Wat de engine toevoegt wanneer hij is aangesloten (een heartbeat, uitkomsten die door een bevestiging zijn afgehandeld en automatische termijnen voor nieuwe pogingen) is Gepland. Zie [Wat vandaag draait en wat Gepland is](#ch7-today).

### Regels voor opnieuw verwerken in één oogopslag {#ch7-reprocessing}
Breadcrumb: Start > Kwaliteit & Compliance

Een mislukt bericht wordt nooit weggegooid, en er wordt vandaag niets opnieuw verzonden zonder dat een persoon op een knop drukt. De onderstaande regels zijn wat de code afdwingt.

| Situatie | Waar het verschijnt | Wat u kunt doen | Bevoegdheid |
|---|---|---|---|
| Een inkomend patiëntbericht kon niet worden gekoppeld (A40, A24, A47, A43) | [Systeemlogboeken: interfaces](#screen-audit-interfaces), Interface-uitzonderingen | Beoordeel het, koppel de patiënten met de hand of verplaats casus, of wijs het af. Het bericht wordt nooit geraden. | Geen specifieke. Zie de bekende beperkingen daar. |
| Een inkomende ordercode heeft geen overeenkomst in het Specimenwoordenboek | Interface-uitzonderingen, type `unmapped_order_code` | **Koppelen & linken** maakt het item in de [Specimencode-koppeling](#screen-crosswalk) aan, of wijs af. | `config:crosswalk:manage` voor het item |
| Een uitgaand bericht kon niet worden verzonden | [Uitgaande interface-DLQ](#screen-outbound-interface-dlq), en de [Uitgaande wachtrij](#screen-outbound-queue) als **Mislukt** | **Verzending opnieuw proberen** of **Nu verzenden** stuurt het opnieuw naar de engine. | `interface:outbound:resend` |
| Een bericht moet nog niet weg | Uitgaande wachtrij, **Wachtend** of **Mislukt** | **Aanhouden** met een reden, daarna **Vrijgeven**. Een aangehouden bericht wordt door geen enkele andere actie verzonden: opnieuw proberen zegt "Aangehouden in de uitgaande wachtrij: geef het daar eerst vrij." | `interface:outbound:hold`, `interface:outbound:release` |
| Een bericht is mislukt na zijn automatische nieuwe pogingen | Uitgaande wachtrij, **Definitief mislukt** | **Opnieuw proberen**, of **Charge intrekken** voor een factureringsitem. | `interface:outbound:resend`, `interface:outbound:retract` |
| Een register heeft een inzending afgewezen | Uitgaande wachtrij, **Afgewezen** | **Opnieuw proberen** (opnieuw indienen) met een reden, of **Markeren als niet meldingsplichtig** met een reden. | `interface:outbound:resend`, `interface:outbound:mark-not-reportable` |
| Een kostenregel moet eerder weg of worden geannuleerd | Uitgaande wachtrij, factureringsitems | **Nu vrijgeven** of **Charge intrekken**. | `interface:outbound:override-release`, `interface:outbound:retract` |
| Het afdrukken, faxen of afleveren als bestand van een verslag is mislukt na de nieuwe pogingen | Verzenduitzonderingen, bovenaan de Uitgaande interface-DLQ | Verzend opnieuw vanuit de eigen wachtrij (de Afdrukwachtrij, of Verslagverzending). Het verdwijnt uit de lijst wanneer het doorgaat. | `interface:outbound:resend` voor verslagverzending |
| Een kostenregel in de wachtrij is mislukt | Het subtabblad Uitgaande DLQ van Systeemlogboeken, Financieel (niveau 7) | Zie [Systeemlogboeken: financieel](#screen-audit-financial). | Zie dat scherm |

**De ingebouwde rollen.** Beheerder heeft alle bevoegdheden `interface:outbound:*`, `interface:engine-status:view` en `jobs:server-job:view`. Laboratoriumdirecteur heeft er geen en heeft het scherm Uitgaande wachtrij niet. De QA-beoordelaar opent alleen het scherm van het auditlogboek en de exports. Superbeheerder heeft elke bevoegdheid behalve `config:ai-prompt:approve`, die wordt onthouden met het oog op functiescheiding (de Laboratoriumdirecteur keurt AI-instructies goed; ForMedrixAI-support nooit). Er is geen ingebouwde rol Interfaceanalist: een ziekenhuis maakt er een en geeft die de bevoegdheden die het wil (het seedbestand zegt dat).

**Wat een nieuwe verzending doet.** Een nieuwe verzending bouwt het bericht opnieuw op uit het record en post het. Als het record waarnaar het verwijst niet meer bestaat, wordt er niets verzonden en zegt het scherm "Niet verzonden: het bericht kon niet worden opgebouwd". Een uitslag waarvoor nog geen verslag-PDF bestaat, wordt aangehouden, niet verzonden, en gaat bij een latere nieuwe poging samen met de PDF mee. Elke actie die een bericht wijzigt, wordt vastgelegd in het auditlogboek, één vermelding per bericht, en de audittekst bevat nooit een patiëntnaam. De nieuwe poging op de lijn (de engine die een verbinding opnieuw probeert) is van de engine, niet van PathScribe.

### Systeemlogboeken: interfaces {#screen-audit-interfaces}
Breadcrumb: Start > Kwaliteit & Compliance > Systeemlogboeken > Interfacelogboek

**Status:** Gerealiseerd

**1. Navigatie:** Start > **Kwaliteit & Compliance** > **Systeemlogboeken** > tabblad **Interfacelogboek** (de tabnaam op het scherm), op `/audit?tab=interfaces`.
**2. Onderhoudsonderdeel:** Systeemlogboeken: interfaces

**3. Doel en bereik.** De ene plaats om te zien wat er is misgegaan aan de grens met andere systemen. Het heeft vijf subtabbladen: **Interface-uitzonderingen** (inkomende berichten die niet konden worden verwerkt), **Uitgaande interface-DLQ** (uitgaande berichten die zijn mislukt of wachten), **Uitgaande verzendingen** (het spoor van gebeurtenissen waarbij een aanvraag wordt aangemaakt), **Afdrukwachtrij** en **Engines** (status van de interface-engine, alleen getoond met `interface:engine-status:view`). Een regel boven de subtabbladen vat de engines samen en opent **Engines** met één klik. Het tabblad toont een badge met het aantal openstaande uitzonderingen.

Dit hoofdstuk documenteert Interface-uitzonderingen hier en de andere vier subtabbladen op hun eigen schermen: [Uitgaande interface-DLQ](#screen-outbound-interface-dlq), [Uitgaande verzendingen](#screen-outbound-dispatches) en [Interface-engines](#screen-interface-engines). Het subtabblad Afdrukwachtrij wordt in deze handleiding niet gedocumenteerd; zie de openstaande vragen.

**4. Vereisten en afhankelijkheden.** Hier wordt niets ingericht. De lijst vult zich wanneer een interface-uitzondering ontstaat. Uitzonderingen voor niet-gekoppelde ordercodes verschijnen wanneer de [Specimencode-koppeling](#screen-crosswalk) geen item voor een code heeft.

Setup step: Reference, not part of setup
Requires: [Specimencode-koppeling](#screen-crosswalk)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-audit-interfaces - Tabblad Interfacelogboek met het subtabblad Interface-uitzonderingen, statuslabels en zoekvak]

**6. Veldreferentie.**

Subtabblad Interface-uitzonderingen.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Statuslabels | Keuze uit **Alle**, **In behandeling**, **Opgelost**, **Afgewezen**, elk met een aantal | Optioneel | Filtert de lijst. | Alle |
| Zoeken | Tekst, plaatsaanduiding "Zoek gebeurtenistype, reden…" | Optioneel | Vergelijkt met het gebeurtenistype en de reden. De koppeling van de Specimencode-koppeling opent dit tabblad doorzocht op `unmapped_order_code`. | Leeg |
| Exporteren als CSV | Knop | Niet van toepassing | Downloadt de gefilterde lijst. Er is geen patiëntnaam, dossiernummer of geboortedatum in opgenomen. Gecontroleerd via het auditlogboek. | Niet van toepassing |
| Patiënt koppelen | Knop, getoond wanneer de gebruiker bij een organisatie hoort | Niet van toepassing | Opent de break-glass-tool om een tijdelijke patiëntidentiteit opnieuw te koppelen. Een zeldzame, beperkte handeling. | Niet van toepassing |
| Tijdstempel | Datum en tijd (alleen-lezen) | Niet van toepassing | Wanneer de uitzondering ontstond. | Niet van toepassing |
| Gebeurtenistype | Tekstbadge (alleen-lezen), bijvoorbeeld `A40`, `A24`, `A47`, `A43`, `unmapped_order_code` | Niet van toepassing | Het soort bericht. Een chip met een supportreferentie staat ernaast. | Niet van toepassing |
| Reden | Tekst (alleen-lezen, getagd als patiëntgegeven) | Niet van toepassing | De exacte reden waarom het niet kon worden verwerkt, bijvoorbeeld "MRG-5 does not match any known Encounter." | Niet van toepassing |
| Bronpatiënt, Doelpatiënt | Tekst (alleen-lezen, getagd als dossiernummer) | Niet van toepassing | De identificaties die vóór de fout zijn gehaald. Een streepje wanneer er geen kon worden gelezen. | Niet van toepassing |
| Status | Knop **Beoordelen** zolang de uitzondering openstaat; badge **Opgelost** of **Afgewezen** daarna | Niet van toepassing | **Beoordelen** opent het venster hieronder. | In behandeling |
| Voettekst | "n van n interface-uitzonderingen weergegeven" | Niet van toepassing | De getoonde en totale aantallen. | Niet van toepassing |

#### Venster Interface-uitzondering beoordelen
Breadcrumb: Start > Kwaliteit & Compliance > Systeemlogboeken > Interfacelogboek > Interface-uitzondering beoordelen

Wat het venster biedt, hangt af van het gebeurtenistype. Afwijzen is voor elk type beschikbaar.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Bronpatiënt, Doelpatiënt | Tekst (alleen-lezen) | Niet van toepassing | De twee patiënten die het bericht noemde. "De patiëntidentiteit kon niet worden opgelost." verschijnt met de ruwe identificatie wanneer het koppelen mislukte. | Niet van toepassing |
| Actieve dossiers van de bronpatiënt (alleen A43) | Lijst met selectievakjes van casus met specimen, faciliteit en status | Optioneel | Kies welke casus, indien van toepassing, naar de doelpatiënt gaan. | Geen geselecteerd |
| Geselecteerde dossiers verplaatsen (alleen A43) | Knop | Niet van toepassing | Verplaatst elke geselecteerde casus en legt de uitzondering vast als opgelost met een notitie over hoeveel er zijn verplaatst en eventuele fouten. Uitgeschakeld totdat een casus is geselecteerd en beide patiënten bekend zijn. | Niet van toepassing |
| Zoek- en patiëntkeuzelijsten (A40, A24, A47) | Zoekvak en keuzelijst, één voor elke kant. A47 heeft alleen de bronkant, "Patiënt wiens identificatie wordt gecorrigeerd". A40 toont "Vorige patiënt (wordt samengevoegd)" en "Overblijvende patiënt". A24 toont "Eerste patiëntdossier" en "Tweede patiëntdossier". | Verplicht | Kies het dossier of de dossiers die het bericht bedoelde. "Er wordt niets gegokt." | Leeg |
| Toepassen (A40, A24, A47) | Knop, "A40 toepassen" enzovoort | Niet van toepassing | Past het bericht met de hand toe op de patiënten die u hebt gekozen. | Niet van toepassing |
| Ruwe ordercode, Genormaliseerd, Coderingssysteem (`unmapped_order_code`) | Tekst (alleen-lezen) | Niet van toepassing | Wat er binnenkwam en hoe het is genormaliseerd. | Niet van toepassing |
| Koppelen aan specimenwoordenboekvermelding (`unmapped_order_code`) | Doorzoekbare keuzelijst | Verplicht om te koppelen | Het item waaraan deze code moet worden gekoppeld. | Leeg |
| Koppelen & linken (`unmapped_order_code`) | Knop | Niet van toepassing | Maakt het item in de [Specimencode-koppeling](#screen-crosswalk) direct aan, zodat latere aanvragen met precies deze code worden herkend en de uitzondering niet herhalen. Een uitzondering die is ontstaan voordat het bijhouden van de faciliteit bestond, kan hier niet worden gekoppeld; voeg het item toe in de Specimencode-koppeling en wijs daarna af. | Niet van toepassing |
| Afwijzen — Geen actie nodig | Knop | Niet van toepassing | Sluit de uitzondering zonder wijziging. Gebruik dit zodra de juiste identiteit stroomopwaarts is bevestigd, bijvoorbeeld door een gecorrigeerde nieuwe verzending van het EPD. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:audit-log:open`. De lijst exporteren: `audit:interface-log:export` (hoog risico). Patiënt koppelen: `patient:break-glass:rebind` (hoog risico; Beheerder heeft die standaard). Beheerder, Laboratoriumdirecteur en QA-beoordelaar openen standaard het scherm van het auditlogboek. Zie [Regels voor opnieuw verwerken in één oogopslag](#ch7-reprocessing) voor de andere subtabbladen.

**Bekende beperkingen.** Het oplossen, afwijzen en koppelen van een interface-uitzondering heeft geen eigen bevoegdheid: iedereen die het scherm kan openen, kan ze uitvoeren. De uitzondering van een inkomend HL7-bericht kan pas verschijnen wanneer het bericht wordt verwerkt, en er bestaat nog geen live listener, dus in de demonstratiebuild komen uitzonderingen van de simulator van de [Gesimuleerde interface-engine](#screen-mock-interface-engine). Beoordelen voor een ander gebeurtenistype dan de vijf hierboven biedt alleen Afwijzen.
### Interface-engines {#screen-interface-engines}
Breadcrumb: Start > Kwaliteit & Compliance > Systeemlogboeken > Interfacelogboek > Engines

**Status:** Gedeeltelijk

**1. Navigatie:** Systeemlogboeken, tabblad **Interfacelogboek**, subtabblad **Engines**. Het subtabblad verschijnt alleen voor mensen met `interface:engine-status:view`.
**2. Onderhoudsonderdeel:** Interface-engines (de titel op het scherm)

**3. Doel en bereik.** Eén lijst van de interface-engine van elk ziekenhuis, die zegt of de listeners actief zijn, wat er wacht en wat er is mislukt. De lijst wordt elke minuut vernieuwd en heeft een knop **Vernieuwen**. Hij is alleen-lezen: kanalen worden op de engine zelf gestart en gestopt, en mislukte uitgaande berichten worden opnieuw verzonden vanuit de [Uitgaande interface-DLQ](#screen-outbound-interface-dlq) (de knop **Uitgaand openen** gaat daarheen).

**Wat is gebouwd en wat Gepland is.** Het scherm en de statusregels zijn gebouwd. De gegevens komen van de heartbeat van de engine, die de engine elke 60 seconden post naar een endpoint dat Gepland is (`POST /api/interface/heartbeat`; de lijst is `GET /api/interface/engines`). Tot die tijd toont de demonstratie vier voorbeeldengines, één voor elke status, met een badge **Gesimuleerd**, en zegt "In de demo is geen interface-engine." Als er geen engine is geregistreerd, zegt de lijst "Er is nog geen interface-engine geregistreerd."

**4. Vereisten en afhankelijkheden.** Hier wordt niets ingericht. Een engine moet door ForMedrixAI worden geïnstalleerd en geregistreerd; dat is Gepland.

Setup step: Reference, not part of setup
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-interface-engines - Interface-engines met status, kanalen, wachtende berichten en dead letters]

**6. Veldreferentie.** Een alleen-lezen pagina.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Samenvattingsregel | Tekst, "Interface-engines: ..." | Niet van toepassing | Aantallen: online, verminderd, offline, die aandacht vragen, listeners uit, berichten wachtend. | Niet van toepassing |
| Status | **Online**, **Verminderd**, **Offline**, **Aandacht nodig** (alleen-lezen) | Niet van toepassing | Offline: geen heartbeat gedurende 180 seconden, volgens de klok van de server. Verminderd: PathScribe kan vanaf de engine niet worden bereikt, het certificaat verloopt over minder dan 14 dagen, de vrije schijfruimte is minder dan 15 procent, een kanaal is in fout, gepauzeerd of gestopt, of een bericht heeft langer dan 15 minuten gewacht. Aandacht nodig: voor het overige gezond, maar een kanaal heeft dead letters. Online: niets van dit alles. | Niet van toepassing |
| Hosting | **Gehost** of **Op locatie** | Niet van toepassing | Waar de engine draait (besluit D6). | Niet van toepassing |
| Versie, Laatste melding | Tekst | Niet van toepassing | De engineversie, en "Nooit gemeld" wanneer er geen is. | Niet van toepassing |
| Bereikt PathScribe | Tekst | Niet van toepassing | **Bereikt PathScribe**, of "Bereikt PathScribe niet: berichten worden opgeslagen om door te sturen". | Niet van toepassing |
| Schijfruimte vrij, Certificaat verloopt | Percentage, datum | Niet van toepassing | De twee gezondheidsinvoeren hierboven. | Niet van toepassing |
| Kanaal | Tekst | Niet van toepassing | Het kanaal van de engine. | Niet van toepassing |
| Richting | **Inkomend (listener)** of **Uitgaand** | Niet van toepassing | | Niet van toepassing |
| Status | **Gestart**, **Gepauzeerd**, **Gestopt**, **Fout** | Niet van toepassing | Een regel met het kanaalprobleem legt het uit: Wacht meer dan n minuten; Definitief mislukte berichten af te handelen; Fout; Gepauzeerd, wachtrij bewaard; Gestopt. | Niet van toepassing |
| Wachtend, Langst wachtend, Definitief mislukt | Getal, minuten, getal | Niet van toepassing | Wachtrijlengte, leeftijd van het langst wachtende bericht en het aantal berichten dat definitief is mislukt. | Niet van toepassing |
| Totalen | Tekst | Niet van toepassing | Wachtende berichten, dead letters en listeners die uit staan, over alle engines. | Niet van toepassing |
| Vernieuwen, Uitgaand openen | Knoppen | Niet van toepassing | | Niet van toepassing |

**7. Machtigingen.** `interface:engine-status:view` (standaard risico; vereist `screen:audit-log:open`). Beheerder heeft die standaard; een ziekenhuis kan haar toekennen aan zijn interfaceanalisten. Wie haar niet heeft, ziet het subtabblad niet, en een geweigerde leesactie zegt "U hebt geen toestemming om de interface-engines te zien."

**Bekende beperkingen.** Nog geen enkele engine meldt zich, dus de echte lijst is leeg totdat het heartbeat-endpoint en het engine-image bestaan (Gepland, fase 2e). De gezondheidsgrenzen liggen vast in de code en hebben geen instelling.

### Uitgaande interface-DLQ {#screen-outbound-interface-dlq}
Breadcrumb: Start > Kwaliteit & Compliance > Systeemlogboeken > Interfacelogboek > Uitgaande interface-DLQ

**Status:** Gerealiseerd

**1. Navigatie:** Systeemlogboeken, tabblad **Interfacelogboek**, subtabblad **Uitgaande interface-DLQ**.
**2. Onderhoudsonderdeel:** Uitgaande interface-DLQ

**3. Doel en bereik.** Een dead-letter queue (DLQ) is de lijst van berichten die niet konden worden verzonden. Dit scherm toont mislukte en wachtende uitgaande interfaceberichten voor één wachtrij tegelijk en laat u ze opnieuw verzenden. **Nu verzenden** en **Opnieuw proberen** sturen het bericht naar de interface-engine. De knoppen **Simuleren** zijn een testhulp en verzenden nooit. Een mislukte kostenregel staat in de afzonderlijke financiële DLQ ([Systeemlogboeken: financieel](#screen-audit-financial)). Het paneel met verzenduitzonderingen (hieronder) staat bovenaan.

**4. Vereisten en afhankelijkheden.** Hier wordt niets ingericht. Een bericht verschijnt nadat een uitgaande verzending is mislukt. Als `VITE_INTERFACE_RECEIVER_ENDPOINT` niet is ingesteld, accepteert of weigert de demonstratie-engine volgens zijn antwoordmodus (zie [Gesimuleerde interface-engine](#screen-mock-interface-engine)).

Setup step: Reference, not part of setup
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-outbound-interface-dlq - Uitgaande interface-DLQ met wachtrijkeuze, mislukte rijen en verzenduitzonderingen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Wachtrij | Keuze uit acht wachtrijen: Pathologieresultaat (ORU^R01); Cytologie-uitslag (ORU^R01); Patiënt-ADT (A08/A40/A47); Assist-modus LIS-synchronisatie; Accessiegebeurtenissen (geaccessioneerd / tekortkoming); Verslagverzending (e-fax, bestandslevering); Verzendlijst; Moleculaire / instrumentaanvraag | Verplicht | Kiest de wachtrij. De eerste twee kolommen voor identificatie en soort veranderen mee (bijvoorbeeld Casus en Uitslagstatus; Bronpatiënt en Gebeurtenistype; Batchbarcode en Prioriteit; Monster of barcode en Assay; Accessienummer en Kanaal · verslag). Het wisselen van wachtrij wist de uitkomstmeldingen. | Pathologieresultaat |
| Mislukt: identificatie, soort | Tekst (alleen-lezen, getagd als patiëntgegeven) | Niet van toepassing | Het record en zijn soort. | Niet van toepassing |
| Mislukt: Fout | Tekst (alleen-lezen) | Niet van toepassing | Een van **Verzending afgewezen**, **Time-out bij verzending**, **Engine onbereikbaar** of **Onbekend**, met de melding eronder. | Niet van toepassing |
| Mislukt: Pogingen | Getal | Niet van toepassing | Hoe vaak het opnieuw is verzonden. "(maximum overschreden)" verschijnt wanneer de vermelding die vlag heeft. De eigen verzending van de browser zet de vlag vandaag nooit. | Niet van toepassing |
| Mislukt: Verzending opnieuw proberen | Knop | Niet van toepassing | Verzendt opnieuw. Het antwoord verschijnt ernaast: "Verzonden en aanvaard door de interface-engine"; "Niet verzonden: de reden staat in de kolom Fout"; "Vastgehouden: de pdf van het verslag is nog niet beschikbaar"; "Niet verzonden: het bericht kon niet worden opgebouwd"; "Dat bericht staat niet meer in de wachtrij"; "Aangehouden in de uitgaande wachtrij: geef het daar eerst vrij"; of "U hebt geen toestemming om interfaceberichten opnieuw te verzenden." | Niet van toepassing |
| Mislukt: Vastleggen als CAPA | Knop | Niet van toepassing | Legt de fout vast als een item voor corrigerende en preventieve actie (CAPA). De rij toont daarna **Vastgelegd**. | Niet van toepassing |
| In wachtrij: identificatie, soort, In wachtrij sinds | Alleen-lezen | Niet van toepassing | Berichten die wachten om te worden verzonden. | Niet van toepassing |
| In wachtrij: Nu verzenden | Knop | Niet van toepassing | Verzendt het bericht nu. | Niet van toepassing |
| In wachtrij: Afwijzing simuleren, Time-out simuleren, Onbereikbaarheid simuleren | Knoppen | Niet van toepassing | Fabriceren een fout van die soort om te testen. Zij weerspiegelen nooit een echte verzending. | Niet van toepassing |
| Verzenduitzonderingen (n) | Alleen-lezen lijst: Casus, Kanaal, Pogingen, Laatste fout, Terugvaloptie, Opgegeven | Niet van toepassing | Afdrukken, faxen en bestandsafgiften die na hun automatische nieuwe pogingen nog steeds zijn mislukt. De terugvalkanalen van een regel verschijnen als "Verzonden via ...". Beheerder en Laboratoriumdirecteur krijgen een bericht wanneer er een bijkomt. Een verzending die bij een nieuwe verzending slaagt, verdwijnt bij de volgende controleronde uit de lijst. "No delivery exceptions." wanneer de lijst leeg is. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:audit-log:open`. Nu verzenden, Verzending opnieuw proberen en de knoppen Simuleren: `interface:outbound:resend` (hoog risico, gecontroleerd via het auditlogboek). Beheerder heeft die standaard. Een ziekenhuis kan haar toekennen aan zijn eigen rol voor interfaceanalist. Vastleggen als CAPA heeft geen eigen bevoegdheid.

**Bekende beperkingen.** De ondertitel zegt "seven queues", maar het scherm biedt er acht. Er is geen automatische nieuwe poging in de browser: een mislukt bericht wacht op een persoon. De geplande termijnen voor nieuwe pogingen staan in [Wat vandaag draait en wat Gepland is](#ch7-today).

### Uitgaande verzendingen {#screen-outbound-dispatches}
Breadcrumb: Start > Kwaliteit & Compliance > Systeemlogboeken > Interfacelogboek > Uitgaande verzendingen

**Status:** Gerealiseerd

**1. Navigatie:** Systeemlogboeken, tabblad **Interfacelogboek**, subtabblad **Uitgaande verzendingen**.
**2. Onderhoudsonderdeel:** Uitgaande verzendingen

**3. Doel en bereik.** Het spoor van elke gebeurtenis waarbij een aanvraag wordt aangemaakt die PathScribe naar de interface-engine heeft verzonden (categorie E), met de uitkomst. Het is een registratie, geen foutwachtrij. Mislukte verzendingen van uitslagen en patiëntwijzigingen staan in de [Uitgaande interface-DLQ](#screen-outbound-interface-dlq). Open een rij om de exacte JSON te zien die is verzonden. PathScribe verzendt JSON; de engine bouwt daaruit het HL7-bericht.

**4. Vereisten en afhankelijkheden.** Hier wordt niets ingericht. Rijen verschijnen wanneer een bericht over een aangemaakte aanvraag wordt verzonden.

Setup step: Reference, not part of setup
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-outbound-dispatches - Tabel Uitgaande verzendingen en payloadlade]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Statusfilter | Keuze uit **Alle**, **Afgeleverd**, **Mislukt**, **Resultaat onbekend** | Optioneel | Filtert de tabel. Resultaat onbekend betekent dat het bericht is vastgelegd maar dat er geen uitkomst terugkwam. | Alle |
| Zoeken | Tekst, "Zoek op bericht-ID of registratienummer..." | Optioneel | Vergelijkt met het bericht-id en het accessienummer. | Leeg |
| Tijdstempel | Datum en tijd (alleen-lezen) | Niet van toepassing | Wanneer het is verzonden. | Niet van toepassing |
| Bericht-ID | Tekst (alleen-lezen) | Niet van toepassing | Het id van het bericht. | Niet van toepassing |
| Registratienummer | Tekst (alleen-lezen, getagd als patiëntgegeven) | Niet van toepassing | De casus. | Niet van toepassing |
| Categorie | Tekst, **E: aanvraag** | Niet van toepassing | De categorie van de transactie. | Niet van toepassing |
| Berichttype | Tekst (alleen-lezen) | Niet van toepassing | Het transactietype. | Niet van toepassing |
| Aanvragende instelling | Tekst (alleen-lezen) | Niet van toepassing | De faciliteit waarvan de aanvraag kwam. | Niet van toepassing |
| Status | **Afgeleverd**, **Mislukt**, **Resultaat onbekend**, met "n pogingen" | Niet van toepassing | De uitkomst. | Niet van toepassing |
| Lade Verzonden payload | Alleen-lezen JSON met **Payload kopiëren** | Niet van toepassing | De exacte JSON die is verzonden, en de fout als het mislukte. Kopiëren zet hem op het klembord. | Niet van toepassing |
| Voettekst | "n van n uitgaande verzendingen weergegeven" | Niet van toepassing | | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:audit-log:open`. Er is geen bevoegdheid op de tabel of de kopieerknop. Beheerder, Laboratoriumdirecteur en QA-beoordelaar openen standaard het scherm van het auditlogboek.

**Bekende beperkingen.** Alleen gebeurtenissen waarbij een aanvraag wordt aangemaakt staan in dit spoor. Andere transactietypen staan in de DLQ zolang zij mislukken en in de [Uitgaande wachtrij](#screen-outbound-queue).

### Uitgaande wachtrij {#screen-outbound-queue}
Breadcrumb: Start > Kwaliteit & Compliance > Uitgaande wachtrij

**Status:** Gerealiseerd

**1. Navigatie:** Start > **Kwaliteit & Compliance** > **Uitgaande wachtrij**, op `/outbound-queue`.
**2. Onderhoudsonderdeel:** Uitgaande wachtrij

**3. Doel en bereik.** Elk uitgaand bericht op één plek: houd het aan, geef het vrij of probeer het opnieuw, en corrigeer wat een register heeft afgewezen. Het brengt tien stromen samen (Resultaten, Patiënt-ADT, Accessie, LIS-synchronisatie, Facturatie, Rapportbezorging, Cytologieresultaten, Verwijzingen, Moleculaire orders, Register) en toont de bestemming van elk bericht (Interface-engine, Factureringssysteem, LIS-partner, Bezorgdienst of Register), het transport dat de engine gebruikt (REST + mTLS, SFTP, Portaaluploaden, PHIN-MS, Directe TCP-verbinding of HTTPS-API, die alleen als onderdeel van het label van de bestemming worden getoond) en de status. PathScribe bepaalt wat wanneer wordt vrijgegeven; de engine verzorgt het transport.

**4. Vereisten en afhankelijkheden.** De wachtrij leest wanneer een bericht vertrekt, en zijn meldingstermijn, uit de [Verzendschema's](#screen-delivery_schedules): het eigen schema van de faciliteit met uitvoerend laboratorium, anders dat van de onderneming, anders de standaard van de stroom. Zonder schema volgt een bericht de standaard van de stroom. Facturatie-items volgen bovendien de instellingen voor facturatievrijgave, en registeritems de registerinstellingen, beide in niveau 7.

Setup step: Reference, not part of setup
Requires: [Verzendschema's](#screen-delivery_schedules)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-outbound-queue - Uitgaande wachtrij met stroomfilters, termijntegels, statuskolom en actiebalk]

**6. Veldreferentie.**

Filters en tegels.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Filteren op stroom | Tien schakelchips | Optioneel | Toont alleen de gekozen stromen. | Alle stromen |
| Faciliteit | Keuzelijst, **Alle faciliteiten** of één faciliteit | Optioneel | Beperkt tot een faciliteit. | Alle faciliteiten |
| Zoeken op accessienummer | Tekst | Optioneel | Vergelijkt met het accessienummer. | Leeg |
| Tegel Te controleren | Schakelaar met aantal | Optioneel | Toont facturatie-items die voor een persoon zijn geparkeerd (**Controle nodig: CPT-code niet gekoppeld**, **geen faciliteit voor de technische component**, **delta-charge van een gewijzigde casus**) en register-items die moeten worden nagekeken (een verplicht veld is leeg, geen uitvoerende faciliteit, geen staatsprofiel, een staatsregel zoals "Geen ICD-O-3-code bij de casus"). | Uit |
| Tegel Delta-charges | Aantal | Niet van toepassing | Kostenregels van gewijzigde casus. | Niet van toepassing |
| Tegels Meldingstermijnen | Aantallen, **Te laat** en **Binnenkort verschuldigd** | Niet van toepassing | Meldingstermijnen van registers. | Niet van toepassing |
| Sorteren op, richting | Keuze uit Stroom, Status, Tijd in wachtrij, Geplande tijd, Pogingen, Meldingstermijn; oplopend of aflopend | Optioneel | De standaardvolgorde zet eerst afgewezen, dan definitief mislukt, mislukt, aangehouden, wachtend, verzonden, bevestigd, niet meldingsplichtig, ingetrokken. | Volgorde van status |

De lijst.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Selecteren (rij en alles selecteren) | Selectievakje | Optioneel | Kiest berichten voor een bulkactie. Het aantal luidt "Geselecteerd: n". | Geen |
| Stroom, Accessie, Bestemming | Tekst (alleen-lezen) | Niet van toepassing | De stroom, de casus en de bestemming met het transport. | Niet van toepassing |
| Status | Een van **Wachtend**, **Aangehouden**, **Verzonden**, **Bevestigd**, **Mislukt**, **Definitief mislukt**, **Afgewezen**, **Niet meldingsplichtig**, **Ingetrokken** | Niet van toepassing | Wachtend: in de wachtrij, gaat op zijn tijd weg. Aangehouden: een persoon heeft het gestopt. Verzonden: de engine heeft het. Bevestigd: de ontvanger heeft bevestigd. Mislukt: een verzending is mislukt. Definitief mislukt: mislukt na de automatische nieuwe pogingen. Afgewezen: een register heeft het met fouten teruggestuurd. Niet meldingsplichtig en Ingetrokken zijn gesloten. | Niet van toepassing |
| Pogingen, Gepland, Termijn, Details | Alleen-lezen | Niet van toepassing | Details bevat de reden van het aanhouden ("Aangehouden: ..."), de fout, een geplande vrijgavedatum, een uiterste datum voor correctie, "Eerder vrijgegeven dan gepland (gebruiker id)", "Wijzigt een eerder bericht", of de reden van het register. | Niet van toepassing |

Acties, die gelden voor de geselecteerde berichten en de bevoegdheid eenmaal voor de selectie controleren. Elk bericht krijgt zijn eigen resultaat; een weigering voor één bericht stopt de rest niet.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Aanhouden | Knop, daarna een paneel | Reden verplicht | Toegestaan voor Wachtend en Mislukt. Reden: Storing bij ontvanger, Onderhoud bij ontvanger, Gegevens controleren, Factuurcontrole, Mogelijk dubbel of Anders. Een optionele notitie van maximaal 200 tekens, met de plaatsaanduiding "Geen patiëntgegevens". | Niet van toepassing |
| Vrijgeven | Knop | Niet van toepassing | Toegestaan voor Aangehouden. Zet het terug in de wachtrij. | Niet van toepassing |
| Opnieuw proberen | Knop, daarna een paneel voor een afgewezen bericht | Reden verplicht bij afgewezen | Toegestaan voor Mislukt, Definitief mislukt en Afgewezen. Een afgewezen bericht vraagt de reden van de correctie: Gegevens gecorrigeerd, Codering gecorrigeerd, Gecorrigeerd door patholoog of Anders. | Niet van toepassing |
| Markeren als niet meldingsplichtig | Knop, daarna een paneel | Reden verplicht | Toegestaan voor Afgewezen. Reden: Geen meldingsplichtige aandoening, Buiten het rechtsgebied van het register, Al gemeld of Anders. Er wordt niets meer verzonden. | Niet van toepassing |
| Charge intrekken | Knop, daarna een paneel | Reden verplicht | Alleen facturatie-items; toegestaan voor Wachtend, Aangehouden, Mislukt en Definitief mislukt. Reden: Casus gewijzigd, Casus ingetrokken, Dubbele charge of Anders. Eindstatus. | Niet van toepassing |
| Nu vrijgeven | Knop | Niet van toepassing | Alleen facturatie-items; toegestaan voor Wachtend en Aangehouden. Verzendt vóór het schema en legt het id van de gebruiker vast. | Niet van toepassing |

Een weigering wordt als aantal gemeld: niet toegestaan, niet meer in de wachtrij, kan niet worden aangehouden, niet aangehouden, kan niet opnieuw worden geprobeerd, niet afgewezen, kan niet worden ingetrokken, kan niet worden vrijgegeven, reden vereist, of niet verzonden (zie de kolom Details). De samenvatting zegt "Gewijzigd: n" en "Niet van toepassing op de status: n."

**7. Machtigingen.** Openen: `screen:outbound-queue:open`. Opnieuw proberen: `interface:outbound:resend`. Aanhouden: `interface:outbound:hold`. Vrijgeven: `interface:outbound:release`. Markeren als niet meldingsplichtig: `interface:outbound:mark-not-reportable`. Charge intrekken: `interface:outbound:retract`. Nu vrijgeven: `interface:outbound:override-release`. Alle zijn hoog risico en worden gecontroleerd via het auditlogboek. Elk van de vijf behalve resend vereist de bevoegdheid voor het scherm. Beheerder heeft ze allemaal en het scherm standaard. Laboratoriumdirecteur en QA-beoordelaar hebben het scherm niet. Aanhouden en vrijgeven worden voor een bulkselectie eenmaal gecontroleerd.

**Bekende beperkingen.** De wachtrij bevat de berichten die de PathScribe-kant kent. Of een bericht zijn ontvanger heeft bereikt, hangt af van de bevestiging van de engine, die Gepland is: vandaag telt elk 2xx-antwoord als verzonden. Bevestigd verschijnt alleen voor stromen die een bevestiging meebrengen (register). Het transport dat in de bestemming wordt genoemd, is een label, omdat de engine eigenaar van het transport is.

## Overige integraties en testtools {#ch7-other}
Breadcrumb: Start > Configuratie > Systeem > Integraties

**Status:** Gedeeltelijk

Deze schermen horen bij niveau 6 maar gaan niet over de interface-engine: een rapportagefeed voor analysetools, de import van de historie van een legacysysteem, en de demonstratietools die systemen vervangen die niet zijn aangesloten.

### Rapportagefeed (Power BI) {#screen-bi_feed}
Breadcrumb: Start > Configuratie > Systeem > Integraties > Rapportagefeed (Power BI)

**Status:** Gedeeltelijk

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Integraties**
**2. Onderhoudsonderdeel:** Rapportagefeed (Power BI)

**3. Doel en bereik.** Laat Power BI, Excel, Tableau of een script PathScribe-gegevens lezen via een rapportage-API op de API-server. Zij maken nooit verbinding met de database. U kiest wat de feed aanbiedt (datasets en faciliteiten met uitvoerend laboratorium), geeft per tool één token uit en houdt identificerende gegevens buiten tenzij een met naam genoemde persoon ze heeft goedgekeurd. Standaard is een token gede-identificeerd: namen, dossiernummers, geboortedata en vrije tekst worden verwijderd, datums worden teruggebracht tot de maand en leeftijden van 90 en ouder verschijnen als 90+.

**Wat is gebouwd en wat niet.** Gebouwd: de instellingen, het goedkeuringsrecord, het aanmaken, vervangen en intrekken van tokens, de veldencatalogus en de ophaaltest. Een token wordt eenmaal getoond; PathScribe bewaart alleen een vingerafdruk en kan het niet opnieuw tonen. Niet aangesloten: de feed zelf. De leesaanroep, `GET /api/bi/v1/{dataset}` met `Authorization: Bearer psbi_...`, is een beschreven contract en het serverwerkitem PS-787. In de demonstratiebuild worden de instellingen en tokens in de browser bewaard, en **Ophaalactie testen** simuleert alleen hoe de server zou antwoorden (er komen geen rijen terug). Een banner zegt dat.

**4. Vereisten en afhankelijkheden.** Een token kan alleen worden beperkt tot faciliteiten met de rol uitvoerend laboratorium, dus die faciliteiten komen eerst. Als u ze overslaat, zegt het scherm "Er zijn geen uitvoerende laboratoriumvestigingen ingesteld" en kan geen token worden aangemaakt, omdat minstens één faciliteit moet worden aangeboden.

Setup step: Tier 6, step 4
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-bi_feed - Instellingen van de rapportagefeed, goedkeuring van geïdentificeerde tokens, tokenlijst, ophaaltest en veldencatalogus]

**6. Veldreferentie.**

Wat de feed aanbiedt.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Rapportagefeed staat aan | Ja/nee-schakelaar | Optioneel | Zolang hij uit staat, wordt elk token geweigerd en kunnen geen nieuwe tokens worden aangemaakt. | Uit |
| Datasets | Selectievakjes: Auditsamenvattingen, Factureringsgebeurtenissen, Dossiers en doorlooptijden, Kwaliteit en discordantie, Specimens, Werklast en productiviteit. Die een patiënt kunnen identificeren, zijn getagd met "kan een patiënt identificeren" (casus, specimens, facturatie, kwaliteit). | Optioneel | De datasets die een token mag lezen. Auditsamenvattingen zijn dagelijkse aantallen zonder gebruikers- of patiëntdetails. Werklast bevat geen patiëntgegevens. | Geen aangevinkt |
| Uitvoerende laboratoriumvestigingen | Selectievakjes | Optioneel | De faciliteiten die de feed aanbiedt. Een token kan tot enkele ervan worden beperkt en kan nooit een faciliteit bereiken die niet is aangevinkt. | Geen aangevinkt |
| Wijzigingen verwerpen, Instellingen opslaan | Knoppen | Niet van toepassing | Uitgeschakeld totdat er iets wijzigt. | Niet van toepassing |

Geïdentificeerde tokens.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Goedgekeurd door | Tekst, tot 80 tekens | Verplicht om vast te leggen | De met naam genoemde persoon die identificerende gegevens heeft goedgekeurd. | Leeg |
| Reden | Tekst, tot 500 tekens | Verplicht om vast te leggen | Waarom identificerende gegevens nodig zijn. | Leeg |
| Goedkeuring vastleggen | Knop | Niet van toepassing | Legt de goedkeuring vast, met wie haar heeft vastgelegd en wanneer. Daarna kunnen geïdentificeerde tokens worden aangemaakt. | Niet van toepassing |
| Goedkeuring intrekken | Knop | Niet van toepassing | Verwijdert haar. Een geïdentificeerd token krijgt dan niets identificerends totdat een nieuwe goedkeuring is vastgelegd. Geweigerd met "Er is geen goedkeuring vastgelegd om in te trekken" wanneer er geen is. | Niet van toepassing |

Een nieuw token.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam | Tekst, tot 60 tekens. Plaatsaanduiding "Kwaliteitsdashboard". | Verplicht | Uniek onder de actieve tokens van de faciliteit ("Een ander actief werkstation in deze faciliteit heeft die naam" is de formulering die het scherm toont). | Leeg |
| Wat het token ontvangt | Keuze uit **Gede-identificeerd** of **Geïdentificeerd** | Verplicht | Geïdentificeerd is vergrendeld totdat een goedkeuring is vastgelegd. Geïdentificeerd is alleen van belang voor de datasets dossiers, specimens, facturatie en kwaliteit; voor andere datasets wordt het geweigerd. | Gede-identificeerd |
| Datasets die dit token mag lezen | Selectievakjes van de datasets die de feed aanbiedt | Verplicht (minstens één) | Een dataset die de feed niet aanbiedt, wordt geweigerd. | Geen |
| Vestigingen die dit token mag lezen | Selectievakjes van de faciliteiten die de feed aanbiedt | Optioneel | Vink niets aan voor alle faciliteiten die de feed aanbiedt. | Geen |
| Token aanmaken | Knop | Niet van toepassing | Toont het token eenmaal met Kopiëren. De formulering "Kopieer dit token nu ... Het wordt maar één keer getoond." Een token begint met `psbi_` en blijft 365 dagen geldig. | Niet van toepassing |

De tokenlijst en de ophaaltest.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam, Datasets, Vestigingen, Modus, Token, Laatst opgehaald, Status | Alleen-lezen kolommen | Niet van toepassing | Token toont de laatste vier tekens en de vervaldatum. Status is **Actief**, **Verloopt binnenkort** (binnen 30 dagen), **Token verlopen** of **Ingetrokken**. Laatst opgehaald toont de dataset, de rijen en de tijd. | Niet van toepassing |
| Nieuw token (vervangen) | Knop op een rij | Niet van toepassing | Geeft een vervangend token uit. Het vorige token blijft 24 uur werken zodat de tool kan worden bijgewerkt. | Niet van toepassing |
| Intrekken | Knop, daarna Reden en Notitie | Reden verplicht | Redenen: Mogelijk gecompromitteerd, Per vergissing ingeschreven, Naar een andere site verplaatst, Machine vervangen, Machine buiten gebruik, Andere. Een notitie is verplicht voor Andere en anders optioneel. **Nu intrekken** bevestigt. Een ingetrokken token werkt direct niet meer. | Niet van toepassing |
| Token (Ophaalactie testen) | Tekst | Verplicht | Een geplakt token. | Leeg |
| Dataset (Ophaalactie testen) | Keuze uit datasets | Verplicht | De dataset waarom wordt gevraagd. | Eerste dataset |
| Ophalen | Knop | Niet van toepassing | Toont hoe de server zou antwoorden: Geaccepteerd (rijen en velden, en de modus), of Geweigerd omdat het niet de vorm van een feedtoken heeft, geen token overeenkomt, het is ingetrokken, het is verlopen, de dataset niet is toegestaan, de feed uit staat, een geïdentificeerd token geen goedkeuring heeft, of het token de afgelopen minuut 60 keer is opgehaald. | Niet van toepassing |
| Veldencatalogus | Alleen-lezen tabel: Veld, Type, Gede-identificeerde feed | Niet van toepassing | Elk veld van elke dataset zoals een analist de kolom ziet. De laatste kolom toont **Behouden**, **Verwijderd** of **Teruggebracht tot de maand**. | Niet van toepassing |

De lees-API geeft standaard 1.000 rijen per pagina terug en hoogstens 10.000.

**7. Machtigingen.** Openen: `screen:configuration:open`. Instellingen: `config:bi-feed:manage`. Tokens aanmaken, vervangen en intrekken en Ophaalactie testen: `config:bi-feed-tokens:manage`. De goedkeuring voor geïdentificeerde gegevens vastleggen en intrekken: `config:bi-feed-identified:approve`. Alle drie zijn hoog risico. Beheerder en Laboratoriumdirecteur hebben ze standaard, dus de persoon die een geïdentificeerd token aanmaakt en de persoon die het goedkeurt kunnen dezelfde persoon zijn, tenzij een ziekenhuis ze scheidt in het Rollenwoordenboek.

**Bekende beperkingen.** De feed wordt nog niet geleverd; in de demonstratiebuild werken alleen de instellingen en tokens. Terwijl de gegevens laden, en in sommige probleemmeldingen, zegt het scherm "werkstation" waar een feedtoken wordt bedoeld (een formuleringsfout in de tekst). De limiet van 60 keer ophalen per minuut en de levensduur van 365 dagen liggen vast in de code.
### Inlezen aanvraagbonnen {#screen-requisition_ingestion}
Breadcrumb: Start > Configuratie > Systeem > Integraties > Inlezen aanvraagbonnen

**Status:** Gedeeltelijk

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Integraties**
**2. Onderhoudsonderdeel:** Inlezen aanvraagbonnen

**3. Doel en bereik.** Papieren aanvraagbonnen worden door de afdelingsscanner in batches naar een map op het ziekenhuisnetwerk of naar een documentsysteem van derden (een ECM, de documentopslag van het LIS, een scandienst) gescand, of door een ander systeem naar de PathScribe-API gestuurd. Elke map of elk systeem is een bron, ingesteld via zijn adres; er kunnen er zoveel zijn als nodig. PathScribe leest de accessiebarcode op elke pagina en koppelt de scan aan zijn casus, alleen als verwijzing: de casus houdt een koppeling naar het bestand op zijn locatie, de bijbehorende pagina's, de barcode, het tijdstip en de bron, en PathScribe bewaart geen kopie. Een pagina zonder barcode hoort bij de aanvraagbon ervoor; een scheidingsblad sluit een aanvraagbon af en hoort bij geen enkele casus. Een scan die bij geen casus past, wacht in de wachtrij met niet-gekoppelde aanvraagbonnen onder Accessie > **📥 Inbox aanvraagbonnen**, waar medewerkers hem koppelen door het accessienummer te scannen of te typen, of hem met een reden verwerpen.

**Wat gebouwd is en wat niet.** Gebouwd: deze instelling, de regels voor koppelen en groeperen van pagina's, de inbox aanvraagbonnen, de knop **📄 Aanvraagbon** van de casus op het verslagscherm en het audittrail. In de demonstratieversie leest de browser een map met fictieve pdf's wanneer iemand op **Nu inlezen** drukt. Niet gebouwd: de geplande servertaak die uw share leest (`requisition.ingest`), het lezen van een gedrukt nummer zonder barcode (OCR) en de API waarnaar een verzendend systeem scans stuurt. Alleen pdf's worden gelezen; elk ander bestand wordt geweigerd en in de samenvatting van de run genoemd.

**Meerdere uitvoerende faciliteiten.** Elke bron hoort bij één uitvoerende faciliteit (het veld **Uitvoerende faciliteit**), of bij **Alle faciliteiten** voor een scanner die alle laboratoria delen. De scans van een bron wachten in de wachtrij van die faciliteit, en elke machtiging hieronder wordt voor die faciliteit gecontroleerd: wie aan één laboratorium is toegewezen (Personeel → zijn faciliteiten), ziet, start en behandelt alleen de scanners en scans van dat laboratorium, en alleen wie voor alle faciliteiten werkt, kan een gedeelde bron toevoegen of wijzigen. **＋ Bron toevoegen** voegt een scanner toe; met de knoppen boven het formulier wisselt u tussen de bronnen. Koppelen gebeurt organisatiebreed: een accessienummer staat voor één casus, dus een aanvraagbon die in het ene laboratorium is gescand, vindt ook een casus die in een ander wordt uitgevoerd.

**Werking (serverloos).** Elke bron wordt gelezen door een geplande taak die één batch verwerkt en stopt; in de cloud van PathScribe draait niets voortdurend. Een documentsysteem van derden wordt op zijn https-adres gelezen, een verzendend systeem stuurt naar de PathScribe-API. Een map op het ziekenhuisnetwerk wordt gelezen door de PathScribe-**site-agent** die daar al voor printers en shares is geïnstalleerd ([Site-agents](#screen-site_agents)): die leest de barcodes op het ziekenhuisnetwerk en stuurt PathScribe alleen de bestandsverwijzing, pagina's en barcodes, zodat de pdf het ziekenhuis nooit verlaat. Het ophalen van aanvraagbonnen door de site-agent is nog niet gebouwd. De controle op ontbrekende aanvraagbonnen draait elk uur.

**4. Vereisten en afhankelijkheden.** De scanner slaat pdf's (één bestand kan veel aanvraagbonnen bevatten) op in een map die de API-server kan lezen, en de accessie-etiketten op de aanvraagbonnen dragen het accessienummer als Code 128- of Code 39-barcode.

Setup step: Tier 6, step 7
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-requisition_ingestion - the requisition source, schedule and separator barcode]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / formaat | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Deze bron lezen | Ja/Nee-schakelaar | Optioneel | Zolang hij uit staat, leest de taak deze bron niet. | Aan |
| Naam | Tekst | Verplicht | Getoond in de inbox aanvraagbonnen. | Requisition scanner drop folder |
| Uitvoerende faciliteit | Keuze: **Alle faciliteiten** of een uitvoerend laboratorium | Verplicht | Van wie deze scanner is: zijn scans wachten in de wachtrij van die faciliteit, en de machtigingen worden ervoor gecontroleerd. | De demonstratiebron: Desert Valley Medical Center; een nieuwe bron: het eerste uitvoerende laboratorium |
| Herkomst van de scans | Keuze uit **Een map op het ziekenhuisnetwerk waarin de scanner opslaat**, **Een documentsysteem van derden dat PathScribe op zijn adres leest** of **Een systeem dat scans naar de PathScribe-API stuurt** | Verplicht | Bepaalt wat het volgende veld bevat. Voeg per map of systeem een bron toe; er kunnen er zoveel zijn als nodig. | Een map op het ziekenhuisnetwerk waarin de scanner opslaat |
| Adres van de map / Adres van het systeem (https) / Verzendend systeem | Tekst | Verplicht | Een map: een netwerkpad (bijvoorbeeld `\\server\requisitions\inbox`) of een smb://-, nfs://-, file://- of https://-adres. Een systeem van derden (een ECM, de documentopslag van het LIS, een scandienst): zijn https-adres; de server leest daar nieuwe scans met toegangsgegevens die op de API-server zijn ingesteld, nooit in de browser. Een verzendend systeem: zijn naam, zoals het zich bij de API identificeert. Een adres van de verkeerde vorm wordt rood gemarkeerd en kan niet worden opgeslagen. | `\\lab-scan01\requisitions\inbox` (demonstratie) |
| Lezen elke (minuten) | Geheel getal, 1 tot 1.440 | Verplicht | Hoe vaak de taak de bron leest. | 15 |
| Barcode van het scheidingsblad | Tekst | Verplicht | De barcode op het blad tussen aanvraagbonnen in één batchscan. | `PATHSCRIBE-SEPARATOR` |
| Opslaan | Knop | Niet van toepassing | Uitgeschakeld zolang er niets verandert of een veld ongeldig is. Toont "Laatst opgeslagen" met het tijdstip en de persoon. | Niet van toepassing |

**Verwachte aanvraagbonnen.** De tweede kaart van dit scherm bepaalt welke casussen een gescande aanvraagbon zouden moeten hebben, voor de organisatie (**Standaard van de organisatie**) of voor één uitvoerende faciliteit (een faciliteit volgt de standaard tot haar eigen instelling is opgeslagen).

| Veldnaam | Gegevenstype / formaat | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Geldt voor | Keuze: **Standaard van de organisatie** of een uitvoerend laboratorium | Verplicht | Welke instelling wordt bewerkt. | Standaard van de organisatie |
| Een gescande aanvraagbon wordt verwacht voor | Selectievakjes: **Elektronische ZIS-/LIS-aanvraag**, **Ingevoerd bij accessie, zonder geïmporteerde aanvraag**, **Externe casus / contractcasus**, **Accessie bij storing**, **Lockbox-afgifte** | Optioneel | Een casus moet er een hebben als de aanvraag op een aangevinkte manier binnenkwam. Een elektronische ZIS-/LIS-aanvraag is de aanvraag (het aanvraagbericht) en heeft standaard geen papier nodig. Een casus die vanuit een geïmporteerde aanvraag is geaccessioneerd, telt als elektronisch. | Alles aangevinkt behalve Elektronische ZIS-/LIS-aanvraag |
| Casus markeren na (uren) | Geheel getal, 0 tot 720 | Verplicht | Uren na accessie zonder gekoppelde bon voordat de casus wordt gemarkeerd. 0 markeert meteen. Blokkeert het werk nooit. | 24 |
| Scan zonder casus markeren na (uren) | Geheel getal, 0 tot 720 | Verplicht | Uren dat een scan in de wachtrij mag wachten voordat hij rood ‘Nog geen casus’ wordt gemarkeerd en bovenaan komt: mogelijk een specimen dat niet is ontvangen, kwijt is of niet is geaccessioneerd. | 24 |
| Verwachtingen opslaan | Knop | Niet van toepassing | Slaat de getoonde instelling op. Vastgelegd (Requisition Expectation Saved). | Niet van toepassing |

Een gemarkeerde casus verschijnt onder **Casussen zonder aanvraagbon** in de inbox aanvraagbonnen, toont **⚠ Aanvraagbon ontbreekt** op het verslagscherm en krijgt een casusafwijking **Missing Requisition** (geregistreerd door System), gevolgd in de afwijkingenstroom en de kwaliteitsrapporten. De scan koppelen sluit de markering en de afwijking (oplossing **Requisition Received or Not Required**); net als **Geen papieren aanvraagbon** met een reden (Elektronische aanvraag aanwezig, Mondelinge aanvraag, gedocumenteerd, Aanvraag in een ander dossier, Anders). De controle loopt mee met het inlezen: op de server als geplande taak, in de demonstratie telkens wanneer de inbox opent of op **Nu inlezen** wordt gedrukt. Auditgebeurtenissen: Requisition Missing, Requisition Received, Requisition Waived, Requisition Without Case.

**De wachtrij met niet-gekoppelde aanvraagbonnen (quarantaine).** Een scan waarvan de barcode bij geen casus past of onleesbaar is, komt er automatisch in (Requisition Quarantined). Medewerkers openen **Bekijken** om de pagina's te bekijken en koppelen hem dan: door het accessienummer te scannen of te typen, door een patiëntnaam of patiëntnummer te typen om te zoeken (de lijst **Gevonden casussen**, binnen hun eigen toegang), of met **Nieuwe casus uit deze scan**, dat Accessie opent met de scan erbij; bij het opslaan wordt hij aan de nieuwe casus gekoppeld (vereist `case:accession:create`). Elke koppeling wordt vastgelegd (Requisition Re-associated), met de vermelding of ze getypt, via zoeken gevonden of nieuw aangemaakt is.

**7. Machtigingen.** Openen: `screen:configuration:open`. De bron wijzigen: `config:requisition-ingestion:manage` (hoog risico, vastgelegd; standaard Admin). In de inbox aanvraagbonnen: `requisition:inbox:review` (openen en een wachtende scan bekijken), `requisition:inbox:resolve` (koppelen of verwerpen), `requisition:ingestion:run` (Nu inlezen); de rollen die Accessie openen, hebben standaard alle drie. Vanuit de casus: `case:requisition:view` (de rollen met toegang tot casussen). Het auditlogboek toont Requisition Matched, Requisition Quarantined, Requisition Re-associated, Requisition Discarded, Requisition Viewed en Requisition Source Saved, zonder bestandsnaam en zonder patiëntnaam. De opdrachten van de inbox aanvraagbonnen staan in de lijst met acties (Configuratie → Actieregister en Personeel → Rollen, groep **Requisition Inbox**): naar de inbox gaan, nu inlezen (Alt+G of met de stem in de inbox), een gescande aanvraagbon bekijken, een niet-gekoppelde aanvraagbon koppelen, verwerpen, de aanvraagbon van de casus tonen. Accessiemedewerkers hebben ze standaard allemaal; de rollen met toegang tot casussen het tonen van de aanvraagbon. Een toegekende opdracht verruimt nooit wat de machtigingen hierboven toestaan.

**Bekende beperkingen.** Er is nog geen afdrukbaar scheidingsblad: druk de barcode af met een willekeurig etikettenprogramma. Wordt een bestand op zijn locatie verplaatst of verwijderd, dan kan de aanvraagbon van de casus niet meer worden geopend, omdat PathScribe geen kopie bewaart.

### Migratie-veldkoppelingen {#screen-migration_field_mappings}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Migratie-veldkoppelingen

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Labmaterialen & workflows**
**2. Onderhoudsonderdeel:** Migratie-veldkoppelingen

**3. Doel en bereik.** Koppelt de eigen bronveldnamen van een legacy-LIS aan de doelvelden voor migratie van PathScribe, per bronsysteem. Een klant met meerdere instellingen kan vanuit meer dan één legacysysteem migreren, dus elke koppeling hoort bij één bronsysteem. De import van historische records leest deze koppelingen. Een bronveld zonder koppeling wordt bij de import gemeld en niet gekopieerd.

**4. Vereisten en afhankelijkheden.** Er hoeft eerst niets te worden ingericht. De import in [Historische gegevensmigratietaken](#screen-migration-jobs) heeft minstens één actieve koppeling voor het bronsysteem nodig. Als u dit overslaat, zegt de import "Dit bronsysteem heeft geen actieve veldkoppelingen."

Setup step: Tier 6, step 5
Requires: Geen, dit is een startpunt.
Unlocks: [Historische gegevensmigratietaken](#screen-migration-jobs)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-migration_field_mappings - Lijst Migratie-veldkoppelingen met bronsysteemfilter en Koppeling toevoegen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Bronsysteemfilter | Keuzelijst, **Alle bronsystemen** of één systeem | Optioneel | Filtert de lijst. | Alle bronsystemen |
| Lijstrij | Alleen-lezen: bronveld, doelveld, categorie, en **Inactief** wanneer uitgeschakeld | Niet van toepassing | Eén koppeling per rij, met **Bewerken**. "Geen veldkoppelingen geregistreerd." wanneer de lijst leeg is. | Niet van toepassing |
| Legacy bronsysteem | Tekst, plaatsaanduiding `LegacyLIS-Cerner` | Verplicht | De naam van het legacysysteem. De lijst met bronsystemen van de import wordt uit deze namen opgebouwd. | Leeg |
| Categorie | Keuze uit Demografische gegevens, Accessiedetail, Macro-/microtekst, SNOMED/ICD-O-codering, Objectglaasje-/blokinventaris, PDF-rapportarchief, Discreet synoptisch veld | Verplicht | Bepaalt welke doelvelden worden aangeboden. | Eerste categorie |
| Bronveldnaam | Tekst, plaatsaanduiding `PT_FNAME` | Verplicht | De naam van het legacyveld of de kolom, zoals die in de koptekst van het bestand of in de JSON staat. | Leeg |
| Doelveld | Keuzelijst met de velden van de categorie | Verplicht | Demografische gegevens: voornaam, achternaam, geboortedatum, MRN, geslacht. Accessiedetail: legacy accessienummer, accessiedatum, naam van de aanvragend arts, faciliteitsnaam, omschrijving van het specimen. Macro-/microtekst: macroscopische beschrijving, microscopische beschrijving, definitieve diagnose. Codering: SNOMED-codes, ICD-O-codes. Objectglaasje-/blokinventaris: blok-id's, preparaat-id's. PDF-archief: URL van het gearchiveerde verslag. Synoptisch veld: synoptische velden. | Geen geselecteerd |
| Transformatienotitie (optioneel) | Tekst, plaatsaanduiding "bijv. converteer MM/DD/JJJJ naar ISO" | Optioneel | Een notitie voor de persoon die de koppeling leest. | Leeg |
| Koppeling toevoegen, Bewerken, Opslaan, Annuleren | Knoppen en venster | Niet van toepassing | Een tweede actieve koppeling voor hetzelfde bronsysteem en hetzelfde bronveld wordt geweigerd: "Er bestaat al een koppeling voor (veld) bij (systeem)." | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen en bewerken: `config:migration-mappings:manage` (hoog risico). Beheerder en Laboratoriumdirecteur hebben die standaard. Dezelfde bevoegdheid beveiligt het uitvoeren van een import.

**Bekende beperkingen.** De Transformatienotitie is alleen een opmerking: geen enkele code past haar toe, dus een datum in een ander formaat wordt niet omgezet door een notitie te schrijven. De vlag actief op een koppeling wordt opgeslagen en door de import gerespecteerd, maar het venster heeft geen schakelaar om haar te wijzigen, dus een nieuwe koppeling is altijd actief. Er is geen verwijderknop.

### Historische gegevensmigratietaken {#screen-migration-jobs}
Breadcrumb: Start > Configuratie > Historische gegevensmigratietaken

**Status:** Gedeeltelijk

**1. Navigatie:** Het adres `/migration-jobs`, beschikbaar voor iedereen die het scherm Configuratie heeft. Er is geen menu-item dat het opent, dus geef uw beheerders het adres.
**2. Onderhoudsonderdeel:** Historische gegevensmigratietaken

**3. Doel en bereik.** Status- en kruisvalidatierapportage voor migratietaken van een legacy-LIS, en het venster **Verouderd bestand importeren** dat er een start. Een taak meldt hoeveel records zijn geslaagd, mislukt of beoordeling nodig hebben, en stemt het aantal af op het aantal dat het bronsysteem opgaf. Dubbelzinnige patiëntkoppelingen die tijdens de import worden gevonden, gaan naar de bestaande wachtrij voor patiëntmatchbeoordeling en worden hier niet apart bijgehouden.

**Wat is gebouwd en wat Gesimuleerd is.** Gebouwd: een bestand lezen, de koppelingen toepassen, valideren, aan patiënten koppelen, de taak en zijn resultaten per record vastleggen, en het afstemmen. Gesimuleerd: de import draait in de browser, en de conceptcasus die hij aanmaakt, zijn gemarkeerd als **Gesimuleerd**. Een banner zegt dat een bulkimport op de server hem vervangt. Het bestand zelf wordt niet bewaard.

**4. Vereisten en afhankelijkheden.** Het bronsysteem moet actieve veldkoppelingen hebben, dus [Migratie-veldkoppelingen](#screen-migration_field_mappings) komt eerst. Als u dit overslaat, is de lijst met systemen in het venster leeg ("Nog geen enkel bronsysteem heeft actieve veldkoppelingen").

Setup step: Tier 6, step 6
Requires: [Migratie-veldkoppelingen](#screen-migration_field_mappings)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-migration-jobs - Lijst met migratietaken met statuslabels en de knop Verouderd bestand importeren]

**6. Veldreferentie.**

De lijst en het detail.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Verouderd bestand importeren | Knop | Niet van toepassing | Opent het importvenster. Grijs zonder de bevoegdheid. | Niet van toepassing |
| Taakrij | Alleen-lezen: bronsysteem, statuslabel, label **Gesimuleerd**, badge **Kruisvalidatieafwijking**, aantallen "n ok, n mislukt, n te beoordelen" | Niet van toepassing | Klik om het detail te openen. Status is **In afwachting**, **Actief**, **Voltooid**, **Voltooid met fouten** of **Mislukt**. "Geen migratietaken aanwezig." wanneer de lijst leeg is. | Niet van toepassing |
| Kruisvalidatie | Tekst | Niet van toepassing | **Afgestemd** (verwerkt van opgegeven), **Afwijking** (opgegeven, verwerkt en hoeveel ontbrekend of extra), of "Geen opgegeven bronaantal aanwezig, afstemmen niet mogelijk". | Niet van toepassing |
| Aantallen | Tekst | Niet van toepassing | Geslaagd, mislukt, te beoordelen, van het totaal verwerkt. | Niet van toepassing |
| Records die aandacht nodig hebben | Lijst: conceptcasus of foutmelding | Niet van toepassing | Mislukte records tonen de fout; dubbelzinnige koppelingen tonen **MPI-beoordeling vereist**. | Niet van toepassing |
| Records | Lijst van elk recordresultaat, met **Geslaagd**, **Mislukt** of **MPI-controle nodig** | Niet van toepassing | De uitkomst van elk record en het id van zijn conceptcasus. | Niet van toepassing |

Het venster Verouderd bestand importeren.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Bronsysteem | Keuzelijst met systemen met actieve koppelingen | Verplicht | "Kies een bronsysteem." | Geen |
| Verouderd bestand (CSV of JSON) | Bestand, `.csv`, `.tsv`, `.txt` of `.json`, tot 2.000 records | Verplicht | Een CSV heeft een koprij met de veldnamen van het oude systeem nodig. JSON is een lijst met records, of een object met een lijst `records`. Geneste waarden worden weggelaten en geteld. Meer dan 2.000 records wordt geweigerd. | Geen |
| Door het bronsysteem opgegeven aantal records (optioneel) | Geheel getal | Optioneel | Als u het weet, stemt de taak het af op de verwerkte records. | Leeg |
| Conceptdossiers aanmaken uit geslaagde records | Ja/nee-selectievakje | Optioneel | Maakt voor elk record dat slaagt een conceptcasus aan, gemarkeerd als **Gesimuleerd**, en slaat een legacy accessienummer over dat al is geïmporteerd ("Al geïmporteerd" laat dat record mislukken). | Aan |
| Import starten | Knop | Niet van toepassing | Voert uit en toont: aantallen, records die zijn overgeslagen omdat ze al zijn geïmporteerd, aangemaakte conceptcasus (gesimuleerd) en bronvelden die geen koppeling dekt. Een knop **Taak bekijken** opent de taak. | Niet van toepassing |

Andere weigeringen: het bestand is leeg of geen geldige JSON, de eerste rij heeft geen veldnamen, het bestand heeft geen records, en "U hebt geen toestemming om oude records te importeren."

**7. Machtigingen.** Openen: `screen:configuration:open` (de route wordt beveiligd door het scherm Configuratie). Importeren: `config:migration-mappings:manage` (hoog risico, gecontroleerd via het auditlogboek). Beheerder en Laboratoriumdirecteur hebben die standaard.

**Bekende beperkingen.** De route heeft geen navigatie-item. De import is Gesimuleerd in de browser; grote of productie-imports wachten op de bulkimport op de server. De limiet van 2.000 records ligt vast in de code.

### Gesimuleerde postvak-uit {#screen-simulated_mail}
Breadcrumb: Start > Configuratie > Systeem > Integraties > Gesimuleerde postvak-uit

**Status:** Demonstratie

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Integraties**
**2. Onderhoudsonderdeel:** Gesimuleerde postvak-uit

**3. Doel en bereik.** In de demonstratiebuild is geen mailservice aangesloten. Elke e-mail die het systeem zou hebben verzonden (een opvolging, een uitnodiging voor het tumor board, een gebeurtenis bij sjabloonbeoordeling, een supportticket) wordt hier bewaard, gemarkeerd als **Gesimuleerd**, zodat u kunt zien wat er zou zijn verzonden. Er verlaat niets de browser. Een melding zegt "Gesimuleerde e-mail vastgelegd, niet verstuurd" en verwijst hiernaartoe.

**4. Vereisten en afhankelijkheden.** Geen. Items verschijnen wanneer een functie e-mail verzendt.

Setup step: Reference, not part of setup
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-simulated_mail - Lijst van de Gesimuleerde postvak-uit en een geopend bericht]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Aantal | Tekst, "n gesimuleerde e-mail(s)" | Niet van toepassing | De bewaarde items. De postvak-uit bewaart de nieuwste 200. | Niet van toepassing |
| Vastgelegd, Soort, Aan, Onderwerp | Alleen-lezen kolommen | Niet van toepassing | Soort is **E-mail** of **Sjabloongebeurtenis**. Een ontvanger die de server zou kiezen, toont "(bepaald door de server)". | Niet van toepassing |
| Openen | Knop | Niet van toepassing | Toont Aan, Cc, Onderwerp, tekst en Bijlagen, met de opmerking "Gesimuleerd: dit bericht is aan niemand verstuurd." | Niet van toepassing |
| Postvak-uit legen | Knop, met een bevestiging | Niet van toepassing | Verwijdert elke gesimuleerde e-mail uit deze browser. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. De sectie toont zich als bewerkbaar voor iedereen die `config:vendor-integrations:manage` heeft; er is geen bevoegdheid op de knop Postvak-uit legen.

**Bekende beperkingen.** Alleen demonstratie. Een serverbuild verstuurt echte e-mail via zijn mailservice en bewaart geen gesimuleerde lijst.

### Gesimuleerde interface-engine {#screen-mock-interface-engine}
Breadcrumb: Start > Gesimuleerde interface-engine

**Status:** Demonstratie

**1. Navigatie:** Het adres `/dev/mock-interface-engine`, alleen in de demonstratiebuild (`__DEMO_TOOLS__`). Een build die met een API-server communiceert, bevat het niet. De pagina heeft geen menu-item.
**2. Onderhoudsonderdeel:** Gesimuleerde interface-engine (PS-239)

**3. Doel en bereik.** Een tool voor ontwikkelaars en demonstraties. Hij antwoordt in de plaats van systemen die nog niet bestaan, zodat u een moleculaire werklijst kunt verzenden, een scanbatch voor whole slide imaging of een ander interfacebericht, en een realistisch antwoord ziet: succes, een specifieke afwijzing of een vastgelopen verbinding. De pagina opent met de waarschuwing "Developer tool, not real functionality." Hij heeft vier delen: de antwoordinstellingen, een simulator voor inkomende berichten, een logboek van wat de gesimuleerde engine heeft ontvangen en een simulator voor antwoorden van een register.

**4. Vereisten en afhankelijkheden.** Geen. Hij heeft de demonstratiebuild nodig.

Setup step: Reference, not part of setup
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-mock-interface-engine - Instellingen van de Gesimuleerde interface-engine, simulator voor inkomende berichten, enginelogboek en simulator voor registerantwoorden]

**6. Veldreferentie.**

Antwoordinstellingen.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Schakelaar Ingeschakeld en status | Knop, met de status "echte verzendaanroepen worden onderschept", "wordt gestart" of "geen onderschepping" | Optioneel | Start of stopt de interceptor in de browser voor de aanroep van de moleculaire werklijst. | Uit |
| Antwoordmodus | Keuze uit **Altijd slagen**, **Altijd mislukken**, **Time-out** | Verplicht | Slagen antwoordt met HTTP 200. Mislukken antwoordt met de status hieronder. Time-out antwoordt nooit, dus de verzending blijft op "Verzenden...". | Altijd slagen |
| HTTP-foutstatus | Geheel getal | Optioneel | Getoond bij Altijd mislukken. Een lege of nulwaarde keert terug naar 500. | 500 |
| Antwoorden namens de glaasjesscanner | Ja/nee-selectievakje | Optioneel | Nadat een scanbatch is aanvaard, meldt elk preparaat als bezig met scannen en daarna als gescand, zodat het scannen van preparaten van begin tot eind kan worden getoond. | Aan |
| Uitslagen van het moleculaire instrument | Keuze uit **Positief**, **Negatief**, **Geen uitslagen** | Optioneel | Nadat een moleculaire werklijst is aanvaard, meldt die uitslag voor elk patiëntmonster, met controles zoals verwacht. | Geen uitslagen |

De drie panelen.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Simulator voor inkomende berichten: Voorbeeldbericht | Keuzelijst met 14 voorbeelden: A01 opname; A01 opname met geverifieerd NHS-nummer; A08 bijwerken; A24 koppelen; A34 samenvoegen (oudere vorm); A40 samenvoegen; A40 met onbekende patiënten (gaat naar de uitzonderingswachtrij); A43 een bezoek verplaatsen; A45 een bezoek verplaatsen (bezoekniveau); A47 identificatie wijzigen; A50 bezoeknummer wijzigen; en drie gebeurtenissen (blok beschadigd of kwijt, HPV-uitslag ontvangen, materiaal naar opslag verplaatst) | Optioneel | **Voorbeeld laden** vult het vak. | Geen |
| Simulator voor inkomende berichten: Bericht (HL7 of JSON-gebeurtenis) | Vrije tekst, getagd als patiëntgegeven | Verplicht | Een bericht of gebeurtenis om door dezelfde processors te halen die een live listener zou gebruiken. | Leeg |
| Simulator voor inkomende berichten: Bericht verwerken | Knop | Niet van toepassing | Toont **Verwerkt** of **Niet toegepast**. Een bericht dat niet kan worden gekoppeld, wordt als interface-uitzondering in de wachtrij gezet: "Open Audit, Foutenlogboek, Interfaces om het handmatig te koppelen." Gemarkeerd als **Gesimuleerd**. | Niet van toepassing |
| Ontvangen door de gesimuleerde interface-engine | Alleen-lezen lijst: Wanneer, Berichttype, Resultaat (**Geaccepteerd**, **Afgewezen**, **Time-out**), Openen | Niet van toepassing | Zonder ingesteld engineadres komt elk uitgaand bericht hier terecht in plaats van de browser te verlaten. **Openen** toont het bericht; **Lijst wissen** maakt haar leeg. | Niet van toepassing |
| Een registerbevestiging ontvangen: Register, Status, Antwoord | Keuzelijsten | Verplicht | Kies wat het register zou zeggen over een verzonden inzending: Geaccepteerd, Geaccepteerd met waarschuwingen, Afgewezen (kan worden gecorrigeerd), Afgewezen (definitief) of Geen antwoord. **Ontvangen** voert het uit via de functie die het echte inkomende endpoint zal gebruiken. Bij Geen antwoord blijft de inzending wachten op een antwoord. | Geen |

**7. Machtigingen.** De route wordt beveiligd door het scherm Configuratie (`screen:configuration:open`). Er is geen bevoegdheid op de bedieningselementen.

**Bekende beperkingen.** Alleen demonstratie. De instellingen worden in de browser bewaard en niet gedeeld. De modi Altijd mislukken en Time-out werken in op de aanroep van de moleculaire werklijst die de interceptor afhandelt; de gesimuleerde engine in het logboek volgt dezelfde antwoordmodus voor andere berichten. Er is geen voorbeeld voor een doorverwijsuitslag, dus het terugontvangen van een referentielaboratorium kan hier niet worden getoond.
