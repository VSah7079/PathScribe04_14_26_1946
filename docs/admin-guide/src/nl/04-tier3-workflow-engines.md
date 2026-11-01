---
chapter: 4
id: ch4
title: Niveau 3: Workflow-engines en operationele configuratie (als derde inrichten)
---

# Niveau 3: Workflow-engines en operationele configuratie (als derde inrichten) {#ch4}

Niveau 3 is het deel van Configuratie dat bepaalt hoe het werk verloopt zodra de mensen, locaties, apparaten en woordenboeken van niveau 1 en 2 bestaan: waarheen een casus wordt gerouteerd, welke opdrachten en macro's een werkplek aanbiedt, hoe een casus vóór en na autorisatie wordt vastgehouden voor beoordeling, en hoe doorlooptijd en kwaliteit worden gemeten. Richt dit als derde in. De meeste schermen hier lezen een woordenboek uit niveau 1 of niveau 2 (een faciliteit, een subspecialisme, een monstertype) en tonen een lege keuzelijst zolang dat woordenboek niet is gevuld.

Lees dit voordat u begint. Vier zaken wijken af van wat de schermtitels van het product doen vermoeden.

- **Er is geen "Order Entry workflow template" en geen "Accessioning workflow template".** Het gedrag bij accessie is verdeeld over instellingen die worden beschreven waar ze zich bevinden; [Waar de accessie-instellingen zich bevinden](#ch4-accession-settings) somt ze op. **Niet gerealiseerd.**
- **Verschillende schermen bewaren hun waarden in de browser van de computer waarmee ze zijn ingesteld** (Zaakroutering, Routeringsregels, Actieregister, Inktvalidatiemodus, Opvolging, Correlatie biopsie-resectie, Bijdrage-instellingen en de implementatieschakelaars op het tabblad Spraak). De status van het scherm vermeldt dit. Zulke instellingen zijn pas zichtbaar op andere werkstations wanneer de versie met de API-server bestaat.
- **Digitale pathologie is grotendeels een leveranciers-woordenboek.** PathScribe bevat een lijst van leveranciers en een opstartadres voor de viewer; het heeft geen scannerdriver en toont zelf geen beelden van preparaten. Zie [Digitale pathologie](#ch4-digital-pathology).
- **Bijna elke instelling voor autorisatie en kwaliteit heeft een standaard voor de organisatie en een afwijking per laboratorium.** De afwijking stelt u in op het bewerkvenster van Faciliteitsconfiguratie ([Faciliteitswoordenboek](#screen-facility-dictionary)) of binnen het scherm zelf.

Configureer niveau 3 in deze volgorde. Elk inrichtingsscherm heeft een kader Inrichtingsvolgorde met dezelfde informatie, en de builder controleert dat geen scherm een scherm vereist dat er pas na komt. Schermen die als naslag zijn gemarkeerd, zijn dagelijkse pagina's en geen onderdeel van de inrichting.

1. [Routeringsregels](#screen-routing_rules): trefwoordregels die een casus naar een pool van een subspecialisme sturen.
2. [Zaakroutering](#screen-case_routing): de instellingen voor poolroutering en de uitgebreidere regeleditor.
3. [Actieregister (tabblad)](#screen-tab-actions): de opdrachten, hun sneltoetsen en spraakzinnen.
4. [Actiegroepen](#screen-action_groups): benoemde bundels opdrachten voor een werkstation.
5. [Macro's (tabblad)](#screen-tab-macros): gedeelde tekstmacro's en de import van Word-AutoText.
6. [Spraak (tabblad)](#screen-tab-voice): schakelaars voor spraakherkenning, persoonlijke spraakinstellingen en het voetpedaal.
7. [Grossing-routeoverrides](#screen-grossing_route_overrides): een vaste uitsnijroute voor een faciliteit en monstertype.
8. [Inktvalidatiemodus](#screen-inking_validation_mode): waarschuwen of afdwingen bij problemen met inkten.
9. [Leveranciersintegraties](#screen-vendor_integrations): leveranciers voor digitale pathologie, WSI-viewer, beeldopslag en macroscopische beeldvorming.
10. [Collegiale toetsing vóór aftekenen](#screen-peer_review_gate): waar de autorisatie wacht op een collegiale toetsing.
11. [Concordantiebeoordeling voorlopig vs. definitief](#screen-concordance_review_settings): vergelijking van voorlopige en definitieve diagnose.
12. [Vrijgavebuffer na ondertekening](#screen-release_buffer): het terugroepvenster na autorisatie.
13. [Ondertekeningsregels per land](#screen-country_signing_rules): nationale regels per deelnametype (alleen platformbeheerder).
14. [Revisieredenen](#screen-revision_reasons): welke redenen voor een aanvulling of correctie een CAPA aanbevelen.
15. [Tumor board-regels voor automatische markering](#screen-tumor_board_rules): wat een casus op de lijst voor een board plaatst.
16. [Venster biopsie–resectie](#screen-biopsy_resection_correlation): het venster van biopsie naar resectie.
17. [Cytologie-histologiecorrelatie](#screen-cytology_histology_correlation): het venster van cytologie naar biopsie.
18. [Opvolging](#screen-follow_up_tracking): waarschuwingen en e-mail aan de clinicus voor vervolgonderzoek dat niet is aangekomen.
19. [Kritieke intraoperatieve uitslagen](#screen-intraop_critical_results): vriescoupe-uitslagen die rechtstreeks naar de chirurg gaan.
20. [OK-suite-terminals](#screen-or_suite_terminals): schermen in de operatiekamer en hun tokens.
21. [Weergaveprofielen (Facility Ops-dashboards)](#screen-display_profiles): wandschermen voor het dashboard Facility Ops.
22. [KA-configuratiecentrum](#screen-qa_config_center): KA-activiteiten, steekproeven en triggers voor CAPA.
23. [Beleid voor discrepantietrends](#screen-qa_trend_policy): wanneer herhaalde discordantie wordt gemarkeerd.
24. [TAT-configuratie (tabblad)](#screen-tab-tat): doorlooptijddoelen.
25. [Prestatiedoelen](#screen-performance_targets): de getallen waaraan een patholoog wordt gemeten.
26. [Cytologie-KC-regels](#screen-cytology_qc_rules): wie wordt geselecteerd voor collegiale toetsing in de cytologie.
27. [Steekproefpercentages cytologie-KC](#screen-cytology_qc_settings): de percentages voor willekeurige selectie.
28. [Dagelijkse werklastlimiet cytologie](#screen-cytology_workload_cap): de dagelijkse limiet aan preparaten en de screeningdag.
29. [Bijdrage-instellingen](#screen-contribution_settings): de pagina Mijn bijdrage.
30. [Feedback](#screen-feedback): de KA-feedbackknop.
31. [Onderzoeksfeed](#screen-research_feed): de PubMed-kop op Start.
32. [Redenen aan de werkbank](#screen-bench_reasons): de aantikbare redenen aan de werkbank, in de woorden van uw lab.

Naslagpagina's, geen onderdeel van de inrichting: [Batchbeheer](#screen-batch-management), [Inbedstation](#screen-embedding-station), [Microtomie-werkstation](#screen-microtomy-workstation), [Objectglaasjes-distributiestation](#screen-slide-distribution-station), [Start](#screen-home), [Lockbox-afgifte](#screen-lockbox-drop-off), [Kwaliteitsborging](#screen-quality-assurance), [Margeafwijkingen beoordelen](#screen-margin-exception-review) en [Cytologie-KC-wachtrij](#screen-cytology-qc-queue).

## Order Entry en accessie: routering en actiebundels {#ch4-order-entry}
Breadcrumb: Start > Configuratie

Dit deel behandelt de instellingen die bepalen waarheen een casus gaat nadat hij is aangemaakt en welke opdrachten een werkstation aanbiedt. Lees eerst [Waar de accessie-instellingen zich bevinden](#ch4-accession-settings): PathScribe heeft geen enkel scherm "Order Entry workflow template", en die sectie beschrijft wat er in de plaats daarvan bestaat.

### Waar de accessie-instellingen zich bevinden {#ch4-accession-settings}
Breadcrumb: Start > Configuratie > Systeem

**Status:** Gedeeltelijk

In PathScribe bestaat vandaag geen configureerbaar scherm "Order Entry workflow template" of "Accessioning workflow template". **Niet gerealiseerd.** Het scherm Accessie (Start > Accessie) haalt zijn gedrag uit de onderstaande woordenboeken en regels, die elk op een eigen scherm worden ingesteld. Het scherm Accessie zelf heeft geen eigen instellingenpagina. De lijst is afgeleid van de services die het scherm Accessie aanroept.

| Wat het bij accessie wijzigt | Waar u het instelt | Hoofdstuk |
|---|---|---|
| De indeling van het accessienummer | [Zaakmaskerconfiguratie](#screen-case_mask_config) | Niveau 1 |
| Welke velden moeten zijn ingevuld voordat de casus kan worden geaccessioneerd (pagina-id's `accession` en `clinicalHistory`) | [Verplichte velden](#screen-field_requirements) | Niveau 1 |
| De lijst met afdelingen, en het uitsnijdsjabloon waarmee een afdeling begint | [Afdelingen](#screen-departments) | Niveau 2 |
| De keuzelijst met monsters en de keuzelijst met containers | [Specimenwoordenboek](#screen-specimens) en [Containertypen](#screen-container_types) | Niveau 2 |
| De keuzelijst met aanvragende artsen | [Artsen](#screen-physicians) | Niveau 2 |
| De tekortkomingen die bij de intake kunnen worden gemeld | [Specimentekortkomingen](#screen-deficiencies) | Niveau 2 |
| De uitsnijroute die een monster bij accessie krijgt, wanneer een faciliteitsspecifieke afwijking van toepassing is | [Grossing-routeoverrides](#screen-grossing_route_overrides) | Niveau 3 |
| Naar welke pool een niet-toegewezen casus wordt gerouteerd (dit gebeurt wanneer het uitsnijden is voltooid, niet bij accessie) | [Zaakroutering](#screen-case_routing) en [Routeringsregels](#screen-routing_rules) | Niveau 3 |

Inkomende orders van de interface-engine worden gekoppeld met de conversietabel voor monstercodes, ingesteld op Ordertypen & inkomende regels in niveau 6. De serveraanroepen voor inkomende orders, de conversietabel, concepten en de uitgaande accessiewachtrij staan beschreven in `docs/architecture/ACCESSIONING_API.md`.

**Bekende beperkingen.** Gepland: een sjabloon dat deze instellingen per workflow bundelt. Er is geen datum vastgesteld. Tot die tijd wijzigt u elke instelling op het eigen scherm.

### Routeringsregels {#screen-routing_rules}
Breadcrumb: Start > Configuratie > Systeem > Integraties > Routeringsregels

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Integraties**
**2. Beheeronderdeel:** Routeringsregels

**3. Doel en bereik.** Een routeringsregel stuurt een casus naar een pool van een subspecialisme door woorden in de beschrijving van het monster te vergelijken. Dit scherm is de eenvoudige editor voor de trefwoordregels: één regel is een pool, een lijst met trefwoorden, een prioriteit en een notitie. Regels worden in volgorde van prioriteit gecontroleerd en de eerste overeenkomst wint. PathScribe levert acht ingebouwde regels mee (colorectaal, bovenste maag-darmkanaal, hepatobiliair en pancreas, mamma, urogenitaal, gynaecologisch, dermatopathologie, hematopathologie; prioriteiten 10 tot en met 60). Ingebouwde regels kunnen worden bewerkt en uitgeschakeld maar niet verwijderd. Dezelfde regels worden ook getoond, met meer opties (koppeling op monstertype, een uitvoerend laboratorium, terugvalpools per laboratorium), op [Zaakroutering](#screen-case_routing); beide schermen lezen en schrijven één opgeslagen lijst.

**4. Vereisten en afhankelijkheden.** Een regel verwijst naar een pool, en een pool is een subspecialisme waarvoor **Pool / Werkgroep** is ingeschakeld. Slaat u de subspecialismen over, dan is de lijst **Routeren naar pool** leeg, verschijnt een waarschuwing en kan een regel niet worden opgeslagen.

Setup step: Tier 3, step 1
Requires: [Subspecialismen](#screen-subspecialties)
Unlocks: [Zaakroutering](#screen-case_routing)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-routing_rules - Lijst met routeringsregels met het vak Routering testen, zoeken en filter]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Routering testen (beschrijving van het monster) | Tekst | Optioneel | Typ een beschrijving en selecteer **Testen**. Het scherm toont de pool van de eerste overeenkomende actieve regel en de notitie en prioriteit van die regel, of een waarschuwing dat geen enkele regel overeenkomt en de casus naar de terugvalpool zou gaan. Het test alleen trefwoordregels en altijd als een algemene regelset (er wordt geen uitvoerend laboratorium toegepast). | Leeg |
| Trefwoorden of notities zoeken | Tekst | Optioneel | Filtert de lijst op trefwoord of notitietekst. | Leeg |
| Routeringsregels filteren | Keuze: Alle, Actief, Inactief, Alleen aangepast | Optioneel | Filtert de lijst. **Alleen aangepast** verbergt de ingebouwde regels. | Alle |
| Prio. | Geheel getal | Niet van toepassing | Prioriteit, getoond in de lijst. Lager wordt eerst gecontroleerd. | Niet van toepassing |
| Routeert naar pool | Poolnaam | Niet van toepassing | De doelpool, getoond in de lijst. | Niet van toepassing |
| Trefwoorden | Chips | Niet van toepassing | De eerste acht trefwoorden, daarna "+N meer". | Niet van toepassing |
| Notitie | Tekst | Niet van toepassing | De notitie van de regel. | Niet van toepassing |
| Status (schakelaar in de lijst) | Schakelaar Actief / Inactief | Optioneel | Schakelt de regel direct in of uit. Wijzigingen worden automatisch opgeslagen. | Niet van toepassing |
| Bewerken, Dupliceren, Verwijderen | Rijknoppen | Niet van toepassing | **Dupliceren** opent het venster **Routeringsregel toevoegen** vooraf ingevuld met een kopie van de regel. **Verwijderen** (alleen aangepaste regels) vraagt om bevestiging en verwijdert de regel. Ingebouwde regels tonen geen **Verwijderen**. | Niet van toepassing |

#### Venster Routeringsregel toevoegen en Regel bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Routeren naar pool | Keuzelijst met actieve subspecialismen waarvoor Pool / Werkgroep is ingeschakeld (uit [Subspecialismen](#screen-subspecialties)) | Verplicht | De pool waarheen de casus gaat. Toont "Selecteer een pool" wanneer leeg. | De eerste pool in de lijst |
| Trefwoorden | Getypte woorden, toegevoegd met **Toevoegen** of Enter, getoond als chips | Verplicht (ten minste één) | Als een beschrijving van een monster een van de trefwoorden bevat, komt de regel overeen. Vergelijken is niet hoofdlettergevoelig en gedeeltelijk, en leestekens worden genegeerd. Een trefwoord dat al in de lijst staat, wordt geweigerd. Trefwoorden worden in kleine letters opgeslagen. | Geen |
| Prioriteit | Geheel getal | Verplicht | Lager wordt eerst gecontroleerd. Het venster weigert een prioriteit die al door een andere regel wordt gebruikt ("Prioriteit N wordt al gebruikt door een andere regel"). Ingebouwde regels gebruiken 10 tot en met 60. | 100 |
| Notitie (optioneel) | Tekst | Optioneel | Vrije tekst voor de beheerder. Doorzoekbaar in de lijst. | Leeg |
| Status | Schakelaar Actief / Inactief | Optioneel | Een inactieve regel wordt bij het routeren overgeslagen. | Actief |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Toevoegen, bewerken, dupliceren, verwijderen, in- of uitschakelen: `config:case-routing:manage` (hoog risico, dus elke controle wordt vastgelegd in het auditlogboek). Beheerder en Laboratoriumdirecteur hebben deze standaard; Superbeheerder heeft de volledige catalogus behalve `config:ai-prompt:approve`, die wordt onthouden met het oog op functiescheiding (de Laboratoriumdirecteur keurt AI-instructies goed; ForMedrixAI-support nooit).
**Bekende beperkingen.** De regels staan in de demonstratieopslag van de browser; er bestaat nog geen servercontract voor routeringsregels (de serveraanroepen `routing-rules` in `docs/architecture/ROUTING_API.md` zijn voor een andere functie: de koppelingen voor faciliteit, arts en protocol). Dit scherm kan geen uitvoerend laboratorium instellen en niet op monstertype koppelen; gebruik daarvoor [Zaakroutering](#screen-case_routing). De prioriteitscontrole, die een dubbele prioriteit weigert, wordt op Zaakroutering niet toegepast.

### Zaakroutering {#screen-case_routing}
Breadcrumb: Start > Configuratie > Systeem > Integraties > Zaakroutering

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Integraties**
**2. Beheeronderdeel:** Zaakroutering

**3. Doel en bereik.** Zaakroutering bepaalt hoe een casus zonder toegewezen patholoog bij een pool van een subspecialisme terechtkomt. Het scherm bevat de hoofdschakelaar, de terugvalpool (één algemene pool en een optionele afwijking voor elk uitvoerend laboratorium), de routeringsregels met begrenzing op monstertype en uitvoerend laboratorium, een testvak en een knop die elke niet-toegewezen casus nu routeert. Het diagram "Hoe routering werkt" op het scherm geeft de volgorde: een casus komt binnen, PathScribe controleert op een directe toewijzing (een casus die al een patholoog heeft, blijft ongemoeid), dan de eigen regels van het laboratorium, dan de algemene regels, dan de terugvalpool van het laboratorium, dan de algemene terugvalpool, en als die er niet is wordt de casus gemarkeerd voor handmatige toewijzing. Een pool die op Subspecialismen is gemarkeerd als Standaard / Catch-All gaat voor de terugvalpools die hier zijn ingesteld.

**Wanneer routering wordt uitgevoerd.** Routering wordt uitgevoerd wanneer het uitsnijden van een casus is voltooid (een STAT-casus gebruikt het STAT-pad), en alleen de eerste keer dat het echte diagnostische werk eraan begint. Het wordt niet uitgevoerd bij accessie. Een casus zonder monsters wordt niet gerouteerd.

**4. Vereisten en afhankelijkheden.** Pools komen uit [Subspecialismen](#screen-subspecialties) (Pool / Werkgroep ingeschakeld), monstertypen uit het [Specimenwoordenboek](#screen-specimens) en uitvoerende laboratoria uit het [Faciliteitswoordenboek](#screen-facility-dictionary) (faciliteiten met de rol uitvoerend laboratorium). Slaat u de pools over, dan toont het scherm "Geen actieve pools gevonden" en kan geen terugval worden gekozen; slaat u de faciliteiten over, dan zijn de tabel per laboratorium en de keuzelijsten voor laboratoria leeg.

Setup step: Tier 3, step 2
Requires: [Routeringsregels](#screen-routing_rules), [Subspecialismen](#screen-subspecialties), [Specimenwoordenboek](#screen-specimens), [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-case_routing - Zaakroutering met het diagram, de terugvalpool, de regeltabel en de handmatige uitvoering]

**6. Veldoverzicht.**

#### Routeringsconfiguratie

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Automatische poolroutering | Selectievakje Ja/Nee | Optioneel | Indien ingeschakeld worden casus zonder LIS-toewijzing gerouteerd op monstertype. Indien uitgeschakeld geeft de routering "unrouted" terug en blijft de casus niet toegewezen. | Aan |
| STAT-zaken worden onmiddellijk gerouteerd | Selectievakje Ja/Nee | Optioneel | Indien uitgeschakeld wordt een STAT-casus bij het voltooien van het uitsnijden helemaal niet gerouteerd (het resultaat is "STAT immediate routing is disabled"). | Aan |
| Toewijzingstime-out (seconden) | Geheel getal, 0 tot en met 3600 | Optioneel | Op het scherm beschreven als hoe lang PathScribe wacht tot het LIS een toewijzing biedt voordat naar een pool wordt gerouteerd; 0 routeert onmiddellijk. De waarde wordt opgeslagen maar geen routeringscode leest haar vandaag, dus zij heeft geen effect. | 300 |
| Algemene terugvalpool | Keuzelijst met actieve pools zonder uitvoerend laboratorium (uit [Subspecialismen](#screen-subspecialties)), plus "Geen (handmatige toewijzing vereist)" | Optioneel | Waarheen een casus gaat wanneer geen regel overeenkomt en geen terugval van het laboratorium of Standaard / Catch-All-pool van toepassing is. | Algemene pathologie (`general`) |
| Terugvalpool-overschrijving (één rij per uitvoerend laboratorium) | Keuzelijst met pools die algemeen zijn of bij dat laboratorium horen, plus "Algemene standaard gebruiken" | Optioneel | Een terugvalpool voor casus van dat uitvoerende laboratorium. Een Standaard / Catch-All-pool die op Subspecialismen is gemarkeerd, gaat voor deze overschrijving, en de overschrijving gaat voor de algemene terugval. | Algemene standaard gebruiken |
| Routeringsconfiguratie opslaan | Knop | Niet van toepassing | Slaat de schakelaars, de time-out en de terugvalpools op. Regels worden apart opgeslagen terwijl u ze wijzigt. | Niet van toepassing |

#### Tabel Routeringsregels

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoeken op trefwoord of notitie | Tekst | Optioneel | Filtert de lijst. | Leeg |
| Filteren op status | Keuze: Alle, Actief, Inactief | Optioneel | Filtert de lijst. | Alle |
| Filteren op laboratorium | Keuze: Alle laboratoria, Alleen algemeen, of één uitvoerend laboratorium | Optioneel | Filtert de lijst. | Alle laboratoria |
| Prioriteit, Overeenkomst, Pool, Uitvoerend laboratorium, Status | Kolommen | Niet van toepassing | Overeenkomst toont "N specimentypen" wanneer de regel monstertypen koppelt, anders de eerste vier trefwoorden. De lijst toont eerst labspecifieke regels, dan algemene regels, elk op prioriteit. Ingebouwde regels dragen een label **INGEBOUWD**. | Niet van toepassing |
| Bewerken, Dupliceren, Deactiveren / Reactiveren | Rijknoppen | Niet van toepassing | Hier is geen verwijderfunctie (gebruik [Routeringsregels](#screen-routing_rules) om een aangepaste regel te verwijderen). **Dupliceren** opent het venster **Routeringsregel toevoegen** met een kopie. | Niet van toepassing |
| + Routeringsregel toevoegen | Knop | Niet van toepassing | Opent het onderstaande venster. | Niet van toepassing |

#### Venster Routeringsregel toevoegen en Routeringsregel bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Gekoppelde specimentypen | Controlelijst met actieve items van het [Specimenwoordenboek](#screen-specimens), met een zoekvak | Verplicht tenzij een trefwoord is ingevoerd | De deterministische overeenkomst: een monster dat uit het Specimenwoordenboek is gekozen, wordt op zijn id gekoppeld. Het venster telt hoeveel er zijn geselecteerd. | Geen geselecteerd |
| Trefwoordterugval | Door komma's gescheiden woorden | Verplicht tenzij een monstertype is gekoppeld | Wordt alleen gebruikt voor een monster dat geen item in het Specimenwoordenboek heeft (handmatig of verouderd item). Niet hoofdlettergevoelig, gedeeltelijke overeenkomst. | Leeg |
| Doelpool | Keuzelijst met actieve pools, getoond als "Naam, Algemeen" of "Naam, lab". Wanneer een uitvoerend laboratorium is gekozen, worden alleen algemene pools en de pools van dat laboratorium aangeboden | Verplicht | De pool waarheen de casus gaat. Foutmelding: "Een doelpool is vereist." | Geen |
| Prioriteit | Geheel getal, ten minste 1 | Verplicht | Lager wordt eerst gecontroleerd binnen de labspecifieke laag en binnen de algemene laag. Foutmelding: "Prioriteit moet een positief getal zijn." Dit venster weigert geen prioriteit die een andere regel al gebruikt. | 100 |
| Uitvoerend laboratorium | Keuzelijst met uitvoerende laboratoria, of "Algemeen (gecontroleerd voor elk laboratorium)" | Optioneel | Een labspecifieke regel wordt vóór algemene regels gecontroleerd voor de eigen casus van dat laboratorium. | Algemeen |
| Notitie | Tekst | Optioneel | Vrije tekst, doorzoekbaar. | Leeg |
| Status | Schakelaar Actief / Inactief | Optioneel | Een inactieve regel wordt overgeslagen. | Actief |

#### Routering testen

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Specimenwoordenboekitem | Keuzelijst met actieve monsteritems, of "Geen (test in plaats daarvan de trefwoordterugval)" | Optioneel | Test de overeenkomst op monstertype. | Geen |
| Specimenbeschrijving | Tekst | Optioneel | Test de trefwoordterugval. | Leeg |
| Als uitvoerend laboratorium | Keuzelijst met uitvoerende laboratoria, of "Alleen algemeen" | Optioneel | Test als casus van dat laboratorium. Het resultaat noemt de pool, of de overeenkomst op monstertype of op trefwoord was, en het laboratorium van de regel. | Alleen algemeen |

#### Handmatige routeringsuitvoering

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Niet-toegewezen zaken nu routeren | Knop | Niet van toepassing | Routeert elke casus die geen toegewezen patholoog heeft, nog niet in een pool zit en niet is gefinaliseerd. Vereist `case:routing:run`; zonder deze machtiging wordt niets uitgevoerd. Daarna toont het scherm de aantallen Gerouteerd, Overgeslagen en Mislukt en per casus een regel met de reden. Nuttig na het wijzigen van regels of na een LIS-storing. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. De configuratie en regels wijzigen: `config:case-routing:manage` (hoog risico, wordt vastgelegd in het auditlogboek). De handmatige routering uitvoeren: `case:routing:run` (hoog risico, wordt vastgelegd in het auditlogboek). Beheerder en Laboratoriumdirecteur hebben beide standaard; Superbeheerder heeft de volledige catalogus behalve `config:ai-prompt:approve`, die wordt onthouden met het oog op functiescheiding (de Laboratoriumdirecteur keurt AI-instructies goed; ForMedrixAI-support nooit).
**Bekende beperkingen.** Demonstratie: regels en configuratie staan in de demonstratieopslag van de browser en er is nog geen servercontract. **Toewijzingstime-out** wordt opgeslagen maar niet gebruikt. Routering wordt alleen uitgevoerd bij het voltooien van het uitsnijden; bij accessie vindt geen routering plaats.
### Actiegroepen {#screen-action_groups}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Actiegroepen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Beheeronderdeel:** Actiegroepen

**3. Doel en bereik.** Een actiegroep is een benoemde bundel opdrachten uit het Actieregister (bijvoorbeeld "Objectglaasje/blok loggen"). Een werkstationgroep verwijst naar actiegroepen voor de acties die zij standaard toestaat en de acties die zij mag toevoegen. Een actie kan tot meer dan één groep behoren.

**4. Vereisten en afhankelijkheden.** De groepen kiezen uit de opdrachten die op het tabblad [Actieregister](#screen-tab-actions) staan. Een groep kan niet worden opgeslagen zonder geselecteerde actie.

Setup step: Tier 3, step 4
Requires: [Actieregister](#screen-tab-actions)
Unlocks: [Werkstationgroepen](#screen-workstation_groups)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-action_groups - Lijst met actiegroepen met zoeken en Actiegroep toevoegen]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Actiegroepen zoeken | Tekst | Optioneel | Filtert de lijst op groepsnaam. | Leeg |
| Naam (lijst) | Tekst | Niet van toepassing | De naam van de groep. | Niet van toepassing |
| Acties (lijst) | Tekst | Niet van toepassing | De eerste drie actienamen, daarna "+N meer". | Niet van toepassing |
| Status (lijst) | Actief / Inactief | Niet van toepassing | Getoond in de lijst. **Deactiveren** en **Reactiveren** wijzigen dit direct. | Niet van toepassing |
| Bewerken, Dupliceren, Deactiveren / Reactiveren | Rijknoppen | Niet van toepassing | **Dupliceren** opent **Actiegroep toevoegen** vooraf ingevuld met dezelfde acties en een kopienaam. Er is geen verwijderfunctie. | Niet van toepassing |

#### Venster Actiegroep toevoegen en Bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam | Tekst | Verplicht | De naam van de groep. Foutmelding: "Vereist". | Geen |
| Acties | Controlelijst met elke actie uit het Actieregister, getoond als "Label (categorie)", met een zoekvak | Verplicht (ten minste één) | De opdrachten in de bundel. Foutmelding: "Selecteer ten minste één actie". | Geen geselecteerd |
| Actief | Schakelaar Actief / Inactief | Optioneel | Een inactieve groep blijft bewaard maar wordt als Inactief gemarkeerd. | Actief |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Toevoegen, bewerken, dupliceren, deactiveren, reactiveren: `config:action-groups:manage` (hoog risico, wordt vastgelegd in het auditlogboek; gecontroleerd in de service). Beheerder en Laboratoriumdirecteur hebben deze standaard.
**Bekende beperkingen.** Geen bekend. De versie met de API-server wordt beschreven in `docs/architecture/CONFIG_SERVICES_API.md` (`IActionGroupService`).

## Uitsnijdsjablonen, spraakmacro's en autotekstbibliotheken {#ch4-grossing-macros}
Breadcrumb: Start > Configuratie

Dit deel behandelt de opdrachten, tekstsneltoetsen en spraakinstellingen die het uitsnijden en dicteren versnellen, en de twee besturingen voor het uitsnijden (routeoverrides en de controle op inkten). De drie uitsnijroutes (Route A Standaard weefselsnijden, Route B Vloeistof-/celblok-snijden, Route C Alleen histologie / Directe triage) zijn ingebouwd en kunnen niet worden uitgebreid. De beginroute van een afdeling stelt u in op [Afdelingen](#screen-departments). De uitsnijdsjablonen zelf zijn verslagsjablonen die als niet-diagnostisch zijn gemarkeerd; ze worden opgesteld op het [tabblad Rapportsjablonen](#screen-tab-templates), niet hier.

### Actieregister (tabblad) {#screen-tab-actions}
Breadcrumb: Start > Configuratie > Actieregister

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Actieregister**
**2. Beheeronderdeel:** Systeemactieregister

**3. Doel en bereik.** Het Actieregister toont elke opdracht die PathScribe kan uitvoeren met een sneltoets of met spraak (bijvoorbeeld "huidige cassette afdrukken"). De lijst met opdrachten ligt vast in het product; u kunt hier geen opdracht toevoegen of hernoemen. Per opdracht kunt u de sneltoets, de gesproken triggerzinnen en de werkplekprofielen waartoe zij is beperkt wijzigen. De eigen aangeleerde spraakzinnen van een persoon zijn een persoonlijke instelling en worden hier niet gewijzigd.

**4. Vereisten en afhankelijkheden.** Geen voor het tabblad zelf. [Actiegroepen](#screen-action_groups) kiezen opdrachten uit deze lijst, dus een opdracht die hier niet staat, kan niet worden gebundeld.

Setup step: Tier 3, step 3
Requires: Geen, dit is een startpunt.
Unlocks: [Actiegroepen](#screen-action_groups)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: tab-actions - Systeemactieregister met zoeken, categoriefilter en knoppen Bewerken]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Acties of spraakopdrachten zoeken | Tekst | Optioneel | Filtert op actienaam of op een triggerzin. | Leeg |
| Categorieknoppen | Eén knop per categorie, plus **Alle** | Optioneel | Toont slechts één categorie. | Alle |
| Actie | Tekst (alleen-lezen) | Niet van toepassing | De naam van de opdracht, met daaronder de vereiste rol. Een opdracht die in het product is uitgeschakeld, toont een label **Uitgeschakeld** en de knop **Bewerken** is grijs. | Niet van toepassing |
| Sneltoets (lijst) | Toetsencombinatie (alleen-lezen) | Niet van toepassing | De huidige sneltoets. Een opdracht die door de eigen toets van een scherm kan worden verborgen, toont ook "Alt+J, dan (toets)", waarmee zij altijd bereikbaar is. | Niet van toepassing |
| Spraakopdrachten (lijst) | Zinnen (alleen-lezen) | Niet van toepassing | De gesproken zinnen. | Niet van toepassing |
| Sjabloon downloaden | Knop | Niet van toepassing | Downloadt `pathscribe_system_config.csv` met elke opdracht (ID, label, categorie, sneltoets, spraakopdrachten). De download wordt vastgelegd als export. | Niet van toepassing |
| Bulkimport | Knop voor CSV-bestand | Niet van toepassing | Leest dezelfde bestandsindeling terug. Alleen de kolommen Sneltoets en Spraakopdrachten worden toegepast, per bestaand opdracht-ID. Rijen met een onbekend ID, een herhaald ID, een gewijzigd label of gewijzigde categorie, een uitgeschakelde opdracht, een in het bestand herhaalde sneltoets of een gereserveerde sneltoets worden overgeslagen, en een samenvatting toont de eerste vijf van elke uitkomst. Spraakopdrachten in het bestand worden gescheiden door puntkomma's. Nieuwe rijen worden niet geaccepteerd. | Niet van toepassing |

#### Venster Actie bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Sneltoets | Toetsencombinatie, vastgelegd door op de toetsen te drukken | Optioneel | Klik op het veld en druk op de combinatie. Een combinatie die al door een andere opdracht wordt gebruikt, toont een foutmelding met de naam van die opdracht en een aanbod met één klik **Gebruik in plaats daarvan (suggestie)**; **Wijzigingen opslaan** is uitgeschakeld zolang de foutmelding zichtbaar is. **Wissen** verwijdert de sneltoets. | De ingebouwde sneltoets van de opdracht |
| Spraakopdrachten | Door komma's gescheiden zinnen | Optioneel | De gesproken zinnen die de opdracht uitvoeren. | De ingebouwde zinnen van de opdracht |
| Werkplekprofielen | Selectievakjes: elk functioneel gebied van Histologie, Cytologie, Moleculair en Autopsie | Optioneel | Beperkt de opdracht tot de gekozen werkplekprofielen. Laat alles uitgevinkt om haar overal toe te staan. | Geen aangevinkt (overal toegestaan) |

**7. Machtigingen.** Het tabblad openen: `screen:configuration:open`. Een sneltoets, trigger of werkplekprofiel wijzigen (bewerken of bulkimport): `config:actions:manage` (hoog risico, wordt vastgelegd in het auditlogboek; gecontroleerd in de service). Beheerder en Laboratoriumdirecteur hebben deze standaard. Aangeleerde spraakopdrachten zijn de eigen instelling van een persoon en vereisen geen machtiging.
**Opdrachten die zijn toegevoegd sinds de handleiding voor het eerst werd geschreven (Batches 650 tot en met 665).** Samenwerker toevoegen (Ctrl+Alt+Shift+0; vereist `case:team:manage` voor de casus, net als het venster Casusteam, en een cytotechnoloog kan niet als Consulent worden toegevoegd); Veld bewerken (Alt+E) en Annuleren (Ctrl+Alt+J), die eerder in de lijst stonden en nu daadwerkelijk werken; Addendum toevoegen; Aftekenen en volgende; Samenwerkingszaken (Ctrl+Alt+F, voorheen "Mijn casussen filteren"); Ga naar rij (Alt+7) en Casus openen op accessienummer (Alt+8) op de Werklijst; en Help weergeven, dat van Alt+V naar **F1** is verplaatst (Alt+V is Volledige weergave op het verslagscherm, en de knop Help werkt altijd). Elke opdracht drukt op dezelfde knop als de muis, dus zij is grijs op grond van dezelfde machtiging: Casus aftekenen, Afronden en Aftekenen en volgende vereisen `surgical:report:sign-out`; Accepteren vereist `case:pool:claim`; Doorgeven vereist `case:pool:pass`. Negenentwintig geregistreerde opdrachten hebben nog steeds geen schermhandler; elk is met zijn reden vermeld in `docs/product/KNOWN_GAPS.md`, en een buildtest mislukt wanneer een nieuwe opdracht wordt geregistreerd zonder listener en zonder vermelde reden. Het bericht aan de samenwerker is een toepassingsmelding die namens de persoon wordt verzonden, dus er is geen berichtenmachtiging voor nodig; het wordt in het Engels opgeslagen, net als het bericht met het verzoek om beoordeling.
**Bekende beperkingen.** Demonstratie: het register staat in de demonstratieopslag van de browser en in `docs/architecture/` bestaat er geen servercontract voor. De lijst met opdrachten is code, geen gegevens. De bulkimport waarschuwt niet voor een sneltoets die botst met een opdracht buiten het bestand; alleen het venster Bewerken controleert dat.

### Macro's (tabblad) {#screen-tab-macros}
Breadcrumb: Start > Configuratie > Macro's

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Macro's**
**2. Beheeronderdeel:** Mijn macro's (tekstmacro's en de import van Word-AutoText)

**3. Doel en bereik.** Een macro is een blok opgemaakte tekst dat wordt uitgevouwen wanneer iemand de sneltoets ervan (bijvoorbeeld `;normcolon`) in de verslageditor typt en op de spatiebalk drukt. Macro's bestaan op een van drie niveaus: Onderneming (elke faciliteit), Instelling (één uitvoerend laboratorium) of Persoonlijk (één persoon). Iedereen kan persoonlijke macro's en macro's voor de faciliteit bijhouden; macro's voor de onderneming en de persoonlijke macro's van anderen zijn alleen voor beheerders. Hier wordt ook een autotekstbibliotheek geladen: **Importeren uit Word** leest de AutoText- en Building Blocks-vermeldingen van een Word-sjabloon.

**4. Vereisten en afhankelijkheden.** Macro's voor de faciliteit worden ondergebracht bij een uitvoerend laboratorium uit het [Faciliteitswoordenboek](#screen-facility-dictionary); slaat u dat over, dan is de lijst met faciliteiten leeg en kan een macro voor de faciliteit niet worden opgeslagen. De lijst met lettertypen van de editor ligt vast in het tabblad en leest [Goedgekeurde lettertypen](#screen-fonts) niet.

Setup step: Tier 3, step 5
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: tab-macros - Tabblad Macro's met links de lijst en rechts de macro-editor]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Niveautabbladen | **Alle** (alleen beheerders), **Onderneming**, **Instelling**, **Persoonlijk**, elk met een aantal | Optioneel | **Alle** toont elke macro gegroepeerd: eerst Onderneming, dan elke faciliteit, dan elke persoon, op naam gesorteerd. Een beheerder opent op **Alle**; anderen openen op **Onderneming**. | Alle (beheerders) of Onderneming |
| Selecteer een instelling | Keuzelijst met uitvoerende laboratoria | Optioneel | Getoond op het tabblad **Instelling**; de lijst blijft leeg totdat een faciliteit is gekozen. | Geen |
| Macrolijst | Knoppen met naam en sneltoets | Niet van toepassing | Selecteert een macro om te bewerken. | Niet van toepassing |
| + Nieuw | Knop | Niet van toepassing | Start een nieuwe macro op het huidige niveau. | Niet van toepassing |
| Importeren uit Word | Bestandsknop, accepteert `.dotx`, `.dotm`, `.docx`, `.docm` | Optioneel | Opent het onderstaande importvenster. | Niet van toepassing |

#### Macro-editor

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Macronaam | Tekst | Verplicht | De naam van de macro. | Geen |
| Triggersnelkoppeling | Tekst die met `;` begint | Verplicht | In de editor getypt, gevolgd door een spatie, om uit te vouwen. Een sneltoets die niet met `;` begint, wordt geweigerd ("De trigger moet beginnen met “;”"). | Geen |
| Zichtbaarheid | Keuze: Onderneming, Instelling, Persoonlijk | Verplicht | Onderneming wordt alleen aan beheerders aangeboden (rollen admin, pathologist-admin, superadmin). Iemand zonder rechten op de macro ziet haar alleen-lezen ("Alleen een beheerder kan deze macro wijzigen."). | Het eerste niveau dat de persoon mag gebruiken |
| Instelling | Keuzelijst met uitvoerende laboratoria | Verplicht wanneer Zichtbaarheid Instelling is | Het uitvoerende laboratorium waartoe de macro behoort. | Geen |
| Inhoud | Editor voor opgemaakte tekst | Optioneel | De tekst die de sneltoets vervangt. Aangeboden lettertypen: Arial, Times New Roman, Courier New, Roboto. | Leeg |
| Verwijderen | Knop | Niet van toepassing | Vraagt "Macro (naam) verwijderen?" en deactiveert de macro (zij verdwijnt uit de lijst). Alleen getoond wanneer u haar mag bewerken. | Niet van toepassing |
| Macro maken / Wijzigingen opslaan | Knop | Niet van toepassing | Slaat op. Uitgeschakeld totdat er iets is gewijzigd. | Niet van toepassing |

#### Venster Importeren uit Word

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Controlelijst met vermeldingen | Eén selectievakje per AutoText- of Building Block-vermelding, met een voorbeeld van 100 tekens | Optioneel | Toont hoeveel vermeldingen zijn gevonden. **AutoText**-vermeldingen zijn aangevinkt; andere typen Building Blocks (voorbladen, koptekst, tabellen) staan in de lijst maar zijn niet aangevinkt. Vermeldingen zonder tekst worden bij de import overgeslagen. | AutoText-vermeldingen aangevinkt |
| Importeren als | Keuze: Persoonlijk, Instelling, Onderneming | Verplicht | Het niveau waarop de geïmporteerde macro's worden gemaakt. | Persoonlijk |
| Instelling | Keuzelijst met uitvoerende laboratoria | Verplicht wanneer Importeren als Instelling is | Foutmelding "Selecteer bij welke instelling deze geïmporteerde macro's horen." indien leeg. | Geen |
| N macro's importeren | Knop | Niet van toepassing | Maakt één macro per aangevinkte vermelding met de categorie Aangepast. De sneltoets wordt gegenereerd uit de naam van de vermelding en uniek gemaakt. | Niet van toepassing |

**7. Machtigingen.** Het tabblad openen: `screen:configuration:open`. Iedereen mag zonder machtiging zijn eigen persoonlijke macro's maken en wijzigen. Voor het maken of wijzigen van een macro voor de onderneming of de faciliteit, of van de persoonlijke macro van een ander, is `config:macros:manage` nodig (hoog risico, wordt vastgelegd in het auditlogboek; gecontroleerd in de service). Beheerder en Laboratoriumdirecteur hebben deze standaard.
**Bekende beperkingen.** De lijst met lettertypen van de editor is een vaste lijst van vier lettertypen, niet het woordenboek Goedgekeurde lettertypen. Het verwijderen van een macro deactiveert haar; er is geen scherm om er een te reactiveren. Zinnen die met spraak worden geactiveerd staan los hiervan en staan op het [tabblad Spraak](#screen-tab-voice).

### Spraak (tabblad) {#screen-tab-voice}
Breadcrumb: Start > Configuratie > Spraak

**Status:** Gedeeltelijk

**1. Navigatie:** Configuratietabblad **Spraak**
**2. Beheeronderdeel:** Spraakintegratie, Gebruikersinstellingen, Spraakverwerkingsregels, Voetpedaal

**3. Doel en bereik.** Eén tabblad met vier gebieden. Het eerste (Spraakintegratie) is een implementatieschakelaar voor iedereen. De andere drie zijn persoonlijk of per werkstation: het regionale accentprofiel, de eigen spraakmacro's van de persoon (gesproken zin naar resulterende tekst, "Spraak- en dictee-macro's" genoemd) en de koppelingen van het voetpedaal van deze computer.

**4. Vereisten en afhankelijkheden.** Geen. De spraakopdrachten zelf worden gedefinieerd in het [Actieregister](#screen-tab-actions).

Setup step: Tier 3, step 6
Requires: [Actieregister](#screen-tab-actions)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: tab-voice - Tabblad Spraak met Spraakintegratie, accent, microfoongevoeligheid, spraakmacro's en voetpedaal]

**6. Veldoverzicht.**

#### Spraakintegratie (voor de hele implementatie)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Spraakopdrachten en dictaat | Schakelaar Aan / Uit | Optioneel | Indien uit, is de microfoonknop grijs en is spraak voor niemand beschikbaar. De AI-verfijning van dictaat is automatisch beschikbaar als voor de implementatie een AI-sleutel is geconfigureerd. De omgevingsinstelling `VITE_VOICE_ENABLED=false` verwijdert spraak volledig en heeft voorrang op deze schakelaar. | Aan |
| Engelse commando’s in andere talen bij benadering herkennen | Schakelaar Aan / Uit | Optioneel | Wanneer iemand in het Frans, Duits, Nederlands of Koreaans dicteert en niets in die taal overeenkomt, kan een bijna-treffer toch als Engelse opdracht worden uitgevoerd. Zet dit uit zodra de eigen opdrachten van de taal aanwezig zijn. Exacte Engelse zinnen werken nog steeds. | Aan |
| AI-verfijningsinstructies per taal | Alleen-lezen uitklaplijst | Niet van toepassing | Toont de exacte instructies die naar de AI worden gestuurd wanneer die gedicteerde tekst verfijnt, per Engelse spellingsconventie en per andere taal. Vermeldingen die nog niet door een moedertaalspreker zijn gecontroleerd, zijn gemarkeerd met "moedertaalbeoordeling nodig". | Niet van toepassing |

#### Gebruikersinstellingen

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Regionaal accentprofiel | Keuze uit 15 Engelse accentprofielen en Frans (Frankrijk), Duits, Nederlands (België), Nederlands (Nederland), Spaans (Spanje) en Koreaans | Optioneel | Stelt de taal in waarop de spraakengine luistert. Bewaard per aangemelde persoon. Nederlands (België) toont een opmerking dat geen Belgische spreker het heeft getest. | Standaard Engels (VS) |
| Microfoongevoeligheid | Schuifregelaar, getoond op 85% | Niet van toepassing | Alleen weergave. De schuifregelaar is met niets verbonden; de versterking wordt door de browser geregeld. | 85% (weergave) |

#### Spraak- en dictee-macro's

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Stem testen | Knop | Niet van toepassing | Luistert en toont "Gehoord: (tekst)" zodat de persoon de microfoon kan controleren. | Niet van toepassing |
| Bulkimport | Knop voor CSV-bestand | Optioneel | Eén macro per regel in de vorm `name, resulting text`. Alles na een tweede komma wordt weggelaten. | Niet van toepassing |
| Macro toevoegen | Knop | Niet van toepassing | Voegt een lege rij toe in bewerkingsmodus, eigendom van de aangemelde persoon. | Niet van toepassing |
| Macro's zoeken | Tekst | Optioneel | Filtert op gesproken naam of resulterende tekst. | Leeg |
| Statusfilter | Keuze: Alle statussen, Alleen actieve, Alleen inactieve | Optioneel | Filtert de lijst. | Alle statussen |
| Naam | Tekst | In de praktijk verplicht | De gesproken zin. | Nieuwe macro: leeg |
| Resulterende tekst | Tekst | Optioneel | De tekst die wordt geschreven wanneer de zin wordt gehoord. | Leeg |
| Status | Schakelaar Actief / Inactief, alleen bewerkbaar in bewerkingsmodus | Optioneel | Een inactieve macro wordt niet gebruikt. | Actief |
| Bewerken, Opslaan, Verwijderen (prullenbakpictogram) | Rijknoppen | Niet van toepassing | **Verwijderen** verwijdert de rij direct zonder bevestiging. | Niet van toepassing |

#### Voetpedaal (dit werkstation)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Pedaal 1, primaire actie | Gekoppelde toets of pedaalknop | Optioneel | Druk-om-te-spreken bij autorisatie, aantal stukken bevestigen bij inbedding. | Niet gekoppeld |
| Pedaal 2, verder / volgende | Gekoppelde toets of pedaalknop | Optioneel | Volgend veld bij autorisatie, volgende afdrukken of etsen bij microtomie. | Niet gekoppeld |
| Pedaal 3, pauze / laatste segment herhalen | Gekoppelde toets of pedaalknop | Optioneel | Alleen dictaat bij autorisatie. Pauze werkt zodra het is gekoppeld; Herhalen vereist ook toegang tot de microfoon, waarom in de eerste autorisatiesessie kan worden gevraagd. | Niet gekoppeld |
| Koppelen, Opnieuw koppelen, Annuleren, Wissen | Knoppen | Niet van toepassing | **Koppelen** wacht op de volgende druk op het echte pedaal en slaat op wat het verstuurt (een toetsenbordtoets of een knop van het type gamepad). De koppeling hoort bij de browser van deze computer, niet bij het account van de persoon. | Niet van toepassing |

**7. Machtigingen.** Het tabblad openen: `screen:configuration:open`. De schakelaars van Spraakintegratie vereisen `config:voice:manage` (hoog risico, wordt vastgelegd in het auditlogboek; gecontroleerd wanneer de instelling wordt opgeslagen, en zonder deze machtiging toont het gebied alleen weergave). Accent, spraakmacro's en voetpedaal zijn persoonlijk of per werkstation en vereisen geen machtiging. Beheerder en Laboratoriumdirecteur hebben `config:voice:manage` standaard.
**Bekende beperkingen.** De twee implementatieschakelaars worden opgeslagen in de bewaarde systeemconfiguratie van de browser. Er bestaat een servercontract voor systeemconfiguratie (`docs/architecture/DICTIONARIES_CONFIG_API.md`, `ISystemConfigService`) maar dit tabblad roept het nog niet aan, dus met de API-server verbonden blijven de schakelaars niet bewaard tussen sessies. Spraakmacro's hebben een servercontract (`docs/architecture/MACROS_API.md`). Microfoongevoeligheid is alleen weergave. Er is geen scherm om gedeelde spraakmacro's (voor de onderneming of de faciliteit) te publiceren; het tabblad beheert de eigen macro's van de aangemelde persoon.
### Grossing-routeoverrides {#screen-grossing_route_overrides}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Grossing-routeoverrides

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Beheeronderdeel:** Grossing-routeoverrides

**3. Doel en bereik.** Een override bepaalt dat voor één faciliteit één monstertype altijd een benoemde uitsnijroute gebruikt. Na accessie stelt PathScribe voor elk monster een uitsnijdsjabloon voor. Een monster dat overeenkomt met een actieve override (dezelfde faciliteit en exact hetzelfde monstertype) krijgt de route van de override met 100 procent zekerheid en wordt helemaal niet naar de AI gestuurd. Alles wat niet in de lijst staat, gebruikt de normale routering.

**4. Vereisten en afhankelijkheden.** De faciliteit komt uit het [Faciliteitswoordenboek](#screen-facility-dictionary) en het monstertype moet exact overeenkomen met het typeveld van een item in het [Specimenwoordenboek](#screen-specimens) (bij het typen worden de bekende typen aangeboden). Slaat u de faciliteiten over, dan is de lijst Faciliteit leeg.

Setup step: Tier 3, step 7
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary), [Specimenwoordenboek](#screen-specimens)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-grossing_route_overrides - Lijst met Grossing-routeoverrides en Override toevoegen]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Faciliteit (lijst) | Faciliteitsnaam | Niet van toepassing | De faciliteit waarop de override van toepassing is. | Niet van toepassing |
| Monstertype (lijst) | Tekst | Niet van toepassing | Het monstertype waarop de override van toepassing is. | Niet van toepassing |
| Overschrijvende route (lijst) | Routenaam | Niet van toepassing | De route die het monster krijgt. | Niet van toepassing |
| Status (lijst) | Actief / Inactief | Niet van toepassing | Alleen actieve overrides worden toegepast. | Niet van toepassing |
| Bewerken, Verwijderen | Rijknoppen | Niet van toepassing | **Verwijderen** verwijdert de override direct zonder bevestiging. Zet de override op Inactief om haar te bewaren. | Niet van toepassing |

#### Venster Grossing-routeoverride toevoegen en Bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Faciliteit | Keuzelijst met faciliteiten (uit [Faciliteitswoordenboek](#screen-facility-dictionary)) | Verplicht | Bij accessie gekoppeld aan de faciliteit van de casus. | De eerste faciliteit in de lijst |
| Monstertype | Tekst met suggesties uit de typewaarden van het Specimenwoordenboek | Verplicht | Moet exact gelijk zijn aan het type in het Specimenwoordenboek (de overeenkomst is exact). Foutmelding "Vereist" wanneer leeg. Een waarde die met geen enkel woordenboektype overeenkomt, wordt geaccepteerd en komt eenvoudigweg nooit overeen. | Geen |
| Overschrijvende route | Keuze: Standaard weefselsnijden (Route A), Vloeistof-/celblok-snijden (Route B), Alleen histologie / Directe triage (Route C) | Verplicht | De route die het monster krijgt. | Standaard weefselsnijden (Route A) |
| Status | Schakelaar Actief / Inactief | Optioneel | Een inactieve override wordt genegeerd. | Actief |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Toevoegen, bewerken, verwijderen: `config:grossing-routes:manage` (hoog risico, wordt vastgelegd in het auditlogboek; gecontroleerd in de service). Beheerder en Laboratoriumdirecteur hebben deze standaard.
**Bekende beperkingen.** De demonstratiegegevens bevatten één override (Nier naar Route C bij faciliteit `c-westside`). De override wordt alleen toegepast door het voorstel voor een uitsnijdsjabloon dat na accessie wordt uitgevoerd. Een route die op afdelingsniveau is gekozen ([Afdelingen](#screen-departments)) wordt niet door een override gewijzigd.

### Inktvalidatiemodus {#screen-inking_validation_mode}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Inktvalidatiemodus

**Status:** Gedeeltelijk

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Beheeronderdeel:** Inktvalidatiemodus

**3. Doel en bereik.** De gestructureerde controle op inkten kijkt naar elke snijrand van een casus wanneer iemand **Uitsnijden afronden** selecteert en nogmaals bij de autorisatie. Zij vindt drie soorten problemen: een snijrand die niet als onderzocht is gemarkeerd (ernst 2), een snijrand zonder vastgelegde inkt (ernst 2) en een inktkleurcode die niet in het actieve woordenboek met inktkleuren staat (ernst 3). Op dit scherm kiest u voor één faciliteit tussen **Alleen waarschuwen** en **Strikt afdwingen**.

**Wat de code vandaag doet (gecontroleerd in de broncode).** De schermtekst zegt dat Strikt afdwingen **Uitsnijden afronden** hard blokkeert bij een probleem met ernst 2. De poort die Uitsnijden afronden tegenhoudt, doet dat in geen van beide modi:
- Ernst 3 (niet-gekoppelde inktkleur) blokkeert Uitsnijden afronden altijd. Bij de autorisatie blokkeert het, of vraagt het om een override van iemand met `case:inking-gate:override`.
- Ernst 2 bij Uitsnijden afronden toont een bevestiging **Doorgaan met adviesnotitie** en laat het uitsnijden daarna voltooien, in beide modi.
- Het enige zichtbare verschil is vandaag de melding op het scherm Uitsnijden: "Strikt afdwingen: hieronder getoonde problemen blokkeren de autorisatie totdat ze zijn gecorrigeerd" tegenover "Waarschuwen en adviseren: hieronder getoonde problemen blokkeren de autorisatie niet".
- Als het woordenboek met inktkleuren niet kan worden geladen, weigert de poort door te gaan (palet niet beschikbaar).
Het verschil tussen de schermtekst en de poort wordt voor Pete vermeld in `open-questions/ch4.md`.

**4. Vereisten en afhankelijkheden.** De controle vergelijkt vastgelegde inktkleuren met de actieve inktkleuren. Slaat u [Inktkleuren](#screen-ink_colors) over, dan is elke vastgelegde inktkleur niet gekoppeld (ernst 3), wat Uitsnijden afronden blokkeert. Faciliteiten komen uit het [Faciliteitswoordenboek](#screen-facility-dictionary).

Setup step: Tier 3, step 8
Requires: [Inktkleuren](#screen-ink_colors), [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-inking_validation_mode - Inktvalidatiemodus met de keuzelijst Faciliteit en twee opties]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Faciliteit | Keuzelijst met faciliteiten | Verplicht | De modus wordt per faciliteit opgeslagen. Wanneer u een andere faciliteit kiest, wordt de opgeslagen modus daarvan geladen. | De eerste faciliteit in de lijst |
| Inktvalidatiemodus | Keuze (keuzerondje): Alleen waarschuwen, Strikt afdwingen | Verplicht | Alleen waarschuwen: problemen met ernst 2 worden gemarkeerd maar blokkeren nooit (de standaard). Strikt afdwingen: op het scherm beschreven als het blokkeren van Uitsnijden afronden bij ernst 2; zie "Wat de code vandaag doet" hierboven. Ernst 3 blokkeert altijd. | Alleen waarschuwen |
| Opslaan | Knop | Niet van toepassing | Pas beschikbaar na een wijziging. Toont "Opgeslagen." of "U heeft geen toestemming om dit te wijzigen." Een wijziging wordt in het auditlogboek vastgelegd als "Inking validation mode changed" met de oude en nieuwe modus. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. De modus wijzigen: `config:inking-validation-mode:manage` (hoog risico, wordt vastgelegd in het auditlogboek; gecontroleerd in de service voor die faciliteit). Beheerder en Laboratoriumdirecteur hebben deze standaard. Een stop met ernst 3 bij de autorisatie overschrijven: `case:inking-gate:override`, in handen van Beheerder en Laboratoriumdirecteur.
**Bekende beperkingen.** Gedeeltelijk om de bovenstaande reden: de modus wordt opgeslagen en getoond, maar Strikt afdwingen voegt geen harde stop toe bij Uitsnijden afronden. De instelling staat in de opslag van locatie-instellingen van de browser; in `docs/architecture/` bestaat nog geen servercontract voor locatie-instellingen.

## Histologiewerklijsten, inbed-, microtomie- en kleuringsstations {#ch4-histology}
Breadcrumb: Start > Batchbeheer

Dit deel behandelt de werkbankschermen van de histologieworkflow. Het zijn dagelijkse werkbankschermen, geen beheerschermen, dus elk gebruikt de naslagindeling: wat het toont, wat eerst moet zijn geconfigureerd en welke instellingen het gedrag wijzigen. Er is geen apart configuratiescherm voor de stations zelf. Het gedrag van een station wordt ingesteld op schermen in andere hoofdstukken: de schermen [Scanstations](#screen-scan_stations) en [Printerprofielen](#screen-printer_profiles) (welke printer een station gebruikt), de [Labelontwerper](#screen-label_designer) (wat het afgedrukte etiket toont), [Verplichte velden](#screen-field_requirements) (welke velden moeten zijn ingevuld, per pagina: `batchManagement`, `embedding`, `microtomy`, `slideDistribution`) en het [tabblad Spraak](#screen-tab-voice) (voetpedaal). Een kleuringsstation heeft geen eigen scherm: kleuringsruns zijn charges (zie Batchbeheer) en de lijst met kleuringen is de [Diagnostische catalogus](#screen-stains).

### Batchbeheer {#screen-batch-management}
Breadcrumb: Start > Batchbeheer

**Status:** Gerealiseerd

**1. Navigatie:** Start > **Batchbeheer** (niet in Configuratie). Wordt geopend met `screen:batch-management:open`.
**2. Beheeronderdeel:** Niet van toepassing. Dit is een werkbankhub.

**3. Doel en bereik.** Batchbeheer volgt groepen cassettes en preparaten via de verwerkingsknooppunten (Decalcificatie / Speciale verwerking, Verwerking, Inbedding, Microtomie / Snijden, Kleuring, Eindcontrole, Externe doorverwijzing, Cytologie-verwerking, Cytologie-kleuring, Cytologie-beeldvorming) op basis van de barcode van de container. Het biedt scannen voor de chain of custody, afstemming en een reeks wachtrij- en rapportpagina's die via tegels worden bereikt. Een charge is een container (een kleuringsrek, een mandje van de weefselprocessor, een archiefopslagtray, een decalcificatievat of een ad-hocbatch) met een hoofdbarcode en een manifest van de items die erin zijn gescand.

**4. Vereisten en afhankelijkheden.** Het scherm leest de scanstationinstelling van deze computer (om het doelwerkstation vooraf in te vullen en de Vernietigingswachtrij en In afwachting te beperken tot de faciliteit van het station), de reagenscharges en kleuringen voor kleurings- en cytologiecharges, en de faciliteiten met de rol Referentielaboratorium voor doorverwijzingscharges. Zonder deze gegevens wordt de pagina wel geopend, maar blijven de bijbehorende velden van **Nieuwe container** leeg.

Setup step: Reference, not part of setup
Requires: [Scanstations](#screen-scan_stations), [Faciliteitswoordenboek](#screen-facility-dictionary), [Reagens- en oplossingslots](#screen-reagent_lots), [Diagnostische catalogus](#screen-stains), [Verplichte velden](#screen-field_requirements)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-batch-management - Batchbeheer met knooppunttegels, hulpmiddeltegels en de lijst met actieve charges]

**6. Veldoverzicht.** Dit is een naslagpagina: de tabellen vermelden besturingselementen, kolommen en filters.

#### Hubpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Knooppunttegels (één per verwerkingsknooppunt) | Tegel met het aantal open charges | Optioneel | Selecteer een tegel om alleen charges op dat knooppunt te tonen; selecteer hem opnieuw om te herstellen. | Geen filter |
| Scan of voer een hoofdbatchbarcode in | Tekst of scannerinvoer | Optioneel | Een batchbarcode opent die charge. Een gescande code `CONT-` of `RACK-` die overeenkomt met een beschikbaar herbruikbaar rek opent **Nieuwe container** met dat rek ingevuld. Een rek dat al is uitgecheckt, of een onbekende code, toont een foutmelding en een toon. | Leeg |
| Nieuwe container | Knop | Niet van toepassing | Opent het onderstaande venster. | Niet van toepassing |
| Actief & in reconciliatie | Lijst met aantal | Niet van toepassing | Open charges, met aantal items en STAT-markering. | Niet van toepassing |
| Voltooid & afgebroken | Lijst met aantal | Niet van toepassing | Gesloten charges. | Niet van toepassing |
| Hulpmiddeltegels | Vernietiging, Afvalregistratierapport, Bewaarblokkades, In afwachting, Etiketten herdrukken, Glaasjes scannen, Graveermonitor, Apparatuurlogboek | Niet van toepassing | Elke tegel opent een van de hieronder beschreven pagina's. | Niet van toepassing |

#### Venster Nieuwe container

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Containertype | Keuze: Kleuringsrek, Mandje van de weefselprocessor, Archiefopslagtray, Decalcificatievat, Ad-hocbatch | Verplicht | Het soort drager. Een lijst met herbruikbare rekken wordt gefilterd op rekken van dit type die Beschikbaar zijn. | Kleuringsrek |
| Doelwerkstation | Keuzelijst met scanstations, of "Geen station" | Optioneel | Wanneer u een station kiest, wordt het Verwerkingsknooppunt ingesteld op de eigen fase van het station. Als het station normaal een ander knooppunt is, vraagt een waarschuwing u dit te controleren. | De stationinstelling van deze computer |
| Verwerkingsknooppunt | Keuze uit de tien knooppunten | Verplicht | Bepaalt welke van de onderstaande extra velden verschijnen. | Decalcificatie / Speciale verwerking, of afgeleid van het station |
| Protocol / runparameters | Tekst | Verplicht (vergrendeld) | Bijvoorbeeld "Standard H&E Overnight Run". Kan in Verplichte velden niet worden uitgeschakeld. | Geen |
| Prioriteit | Keuze: Routine, STAT | Verplicht | Markeert de charge. | Routine |
| Oplossingstype | Keuze: EDTA, 10% NBF (fixatievenster), Snelle decalcificatie (mierenzuur/HCl) | Verplicht op een decalcificatieknooppunt | De decalcificatieoplossing. | Eerste optie |
| Doelduur / waarschuwingstimer | Uren en minuten | Verplicht op een decalcificatieknooppunt (vergrendeld) | Stelt de timer in. Een waarschuwing verschijnt 15 minuten vóór het doel. | 4 uur 0 min |
| Bestemming referentielaboratorium | Keuzelijst met faciliteiten met de rol Referentielaboratorium | Verplicht op een knooppunt Externe doorverwijzing (vergrendeld) | Waarheen de charge gaat. Als er geen bestaat, zegt het venster dat u er eerst een moet toevoegen in de faciliteitsinstellingen. | Geen |
| Aangevraagde test / panel (optioneel) | Tekst | Optioneel (kan verplicht worden gemaakt) | De test die bij het referentielaboratorium is aangevraagd. | Leeg |
| Kleuringsprotocol | Keuzelijst met kleuringen (uit [Diagnostische catalogus](#screen-stains)) | Verplicht op een knooppunt Cytologie-kleuring (vergrendeld) | De kleuring waarvoor de charge is. | Geen |
| Gebruikte reagens-/oplossingscharges | Controlelijst met actieve lots (uit [Reagens- en oplossingslots](#screen-reagent_lots)) | Optioneel (kan verplicht worden gemaakt) op een knooppunt Kleuring | Legt de lots voor de run vast. Kan later worden gescand. | Geen |
| Modus voor containeridentificatie | Keuze: Wegwerpetiket, Herbruikbaar rek | Verplicht | Wegwerp: het systeem genereert een etiket voor eenmalig gebruik met tijdstempel. Herbruikbaar: een bestaand gegraveerd rek wordt gebruikt en er wordt geen etiket afgedrukt. | Wegwerpetiket |
| Rek-ID | Scan of tekst | Verplicht voor Herbruikbaar rek (vergrendeld) | Het rek dat moet worden uitgecheckt. | Leeg |
| Genereren en afdrukken / Sessie starten | Knop | Niet van toepassing | Maakt de charge aan. Toont "Nog vereist: (velden)" totdat de verplichte velden zijn ingevuld. Bij een wegwerpetiket toont de volgende stap de hoofdbatchbarcode met **Afdrukken**; bij een rek staat er dat het rek nu is uitgecheckt en er niets wordt afgedrukt. **Verder, items scannen** opent de charge. | Niet van toepassing |

#### Detailpagina van de charge

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Scan een cassette- of preparaatbarcode | Scannerinvoer (klikken is niet nodig) | Optioneel | Voegt het item toe aan het manifest. Wordt met een melding geweigerd wanneer de code met geen enkele cassette of geen enkel preparaat overeenkomt, al in deze charge zit of in een andere actieve charge zit. | Niet van toepassing |
| Manifest | Lijst met aantal | Niet van toepassing | Items in de charge, elk met **Verplaatsen** (naar een andere actieve charge) en **Verwijderen**. | Niet van toepassing |
| Afstemming starten | Knop | Niet van toepassing | Start verificatie buiten het proces: scan elk fysiek item wanneer het de drager verlaat. Items tonen Overeenkomend, Ontbrekend of Onverwacht. | Niet van toepassing |
| Charge voltooien | Knop | Niet van toepassing | Uitgeschakeld zolang items ontbreken of onverwacht zijn (de tooltip geeft de aantallen), en geweigerd zolang een onderbreking van de koudeketen niet is bevestigd. | Niet van toepassing |
| Supervisor-override (Overschrijven en voltooien) | Link en venster met een verplichte **Reden** | Reden verplicht | Voltooit met afwijkingen. Vastgelegd op naam van de persoon. Vereist `batch:reconciliation:override`. | Niet van toepassing |
| Charge afbreken | Knop en venster met een verplichte **Reden** | Reden verplicht | De charge en het manifest blijven bewaard voor audit, worden als Afgebroken gemarkeerd en nemen geen scans meer aan. Vereist `batch:run:abort`. | Niet van toepassing |
| Bevestigen (onderbreking van de koudeketen) | Knop en venster met een verplichte **Notitie** | Notitie verplicht | Getoond wanneer een slimme container een temperatuur buiten het bereik heeft gemeld. Vereist `batch:cold-chain-excursion:acknowledge`. | Niet van toepassing |
| Overdragen naar verwerking | Knop | Niet van toepassing | Verplaatst de items naar een nieuwe verwerkingscharge. | Niet van toepassing |
| Rek vrijgeven | Knop | Niet van toepassing | Zet een herbruikbaar rek terug op Beschikbaar. | Niet van toepassing |
| Doorverwijzingsstatus | Tekst | Niet van toepassing | Voor een doorverwijzingscharge: verzonden, onderweg, afgeleverd, resultaat ontvangen (met een link wanneer het resultaat een PDF is). | Niet van toepassing |
| Instrumentrapporten; paneel Koudeketen | Tekst | Niet van toepassing | Status van het cytologie-instrument; temperatuurmetingen voor een charge in een slimme container. | Niet van toepassing |

#### Vernietigingswachtrij

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Scan een cassette- of preparaatbarcode | Scannerinvoer | Optioneel | Vernietigt het item direct en toont kort een bevestiging. Vereist `retention:material:dispose`. | Niet van toepassing |
| In aanmerking voor vernietiging | Lijst met aantal | Niet van toepassing | Blokken en preparaten waarvan de bewaartermijn is verstreken, zonder actieve blokkade en nog niet vernietigd, telkens opnieuw berekend uit de casusgegevens. Beperkt tot de faciliteit van het station; zonder ingesteld scanstation worden alle locaties getoond. | Niet van toepassing |

#### Afvalregistratierapport

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Filteren op faciliteit | Keuzelijst | Optioneel | Beperkt het rapport. | Alle faciliteiten |
| Filteren op materiaaltype | Keuzelijst | Optioneel | Beperkt het rapport. | Alle materiaaltypen |
| Vanaf datum, Tot datum | Datums | Optioneel | Beperkt op datum van vernietiging. | Leeg |
| Totaal vernietigd | Getal | Niet van toepassing | Aantal getoonde rijen. | Niet van toepassing |
| Kolommen | Vernietigd, Type, Item-ID, Casus, Monster, Vernietigd door, Locatie | Niet van toepassing | Eén rij per vernietigd item. | Niet van toepassing |
| Exporteren | Knop | Niet van toepassing | Downloadt een CSV met dezelfde kolommen. Vereist `retention:disposal-report:export`. | Niet van toepassing |

#### Bewaarblokkades

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Casus, reden of persoon zoeken | Tekst | Optioneel | Filtert de lijst. | Leeg |
| Kolommen | Casus, Reden, Notitie, Geplaatst door, Geplaatst, Acties | Niet van toepassing | Eén rij per actieve blokkade ("N actieve blokkades"). | Niet van toepassing |
| Opheffen | Knop en venster met een **Notitie bij opheffing** | Notitie verplicht | Heft de blokkade op. Vereist `case:retention-hold:release`. | Niet van toepassing |
| CSV exporteren | Knop | Niet van toepassing | Vereist `retention:holds-queue:export`. | Niet van toepassing |

#### In afwachting

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Scan of typ om te zoeken | Tekst of scanner | Optioneel | Filtert op cassette- of preparaat-id, casus of monster. **Wissen** herstelt. | Leeg |
| Vernieuwen | Knop | Niet van toepassing | Berekent de wachtrij opnieuw. | Niet van toepassing |
| Wacht op laden in charge | Lijst gegroepeerd per casus | Niet van toepassing | Cassettes en preparaten die zijn afgedrukt of gegraveerd maar niet in een actieve charge zijn gescand, telkens opnieuw afgeleid uit de casusgegevens. Beperkt tot de faciliteit van het station; zonder ingesteld station worden alle faciliteiten getoond. | Niet van toepassing |

#### Etiketten herdrukken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Geaccessioneerd vanaf, Geaccessioneerd tot | Datums | Optioneel | Zoekt casus op accessiedatum. | Leeg |
| Accessienummer vanaf, Accessienummer tot | Tekst | Optioneel | Zoekt casus op een reeks accessienummers. Ten minste één van de vier is nodig; een leeg filter vindt niets. | Leeg |
| Casus zoeken | Knop | Niet van toepassing | Toont de gevonden casus, oudste eerst, elk met een selectievakje **Herdrukken** en zijn monsters. | Niet van toepassing |
| Etiketten | Selectievakjes: Cassettes, Monstercontainers, Aanvraagformulier | Optioneel | Welke soorten etiketten worden afgedrukt. | Geen aangevinkt |
| Cassetteprinter | Keuzelijst met printers | Verplicht wanneer cassettes zijn gekozen | Foutmelding "Kies eerst de cassetteprinter." | Geen |
| Etiketten herdrukken | Knop | Niet van toepassing | Drukt één etiket tegelijk af (ongeveer 0,25 seconde na elkaar) en toont de voortgang. Elk etiket wordt vastgelegd in het auditlogboek. Vereist `label:batch:reprint` (standaard in handen van Histotechnoloog en Beheerder). Daarna toont een samenvatting Afgedrukt, mislukt en tegengehouden door de beveiliging voor afdrukken op verzoek, en **N mislukte etiketten opnieuw proberen**. | Niet van toepassing |

#### Glaasjes scannen

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Scanwachtrij | Tabel: Kiezen, Casus, Preparaat, Prioriteit, Gerouteerd naar, Rek / positie | Niet van toepassing | Preparaten die op het Objectglaasjes-distributiestation naar Digitaal zijn gerouteerd. | Niet van toepassing |
| Preparaatscanner | Keuzelijst met apparatuur van het soort "Slide scanner" (uit [Apparatuur](#screen-equipment)) | Verplicht | Als er geen bestaat, zegt de pagina dat u ze moet toevoegen in Configuratie, Apparatuur. | Geen |
| N preparaten laden | Knop | Niet van toepassing | Maakt een scancharge op de scanner aan. Vereist `wsi:scan-batch:load`. | Niet van toepassing |
| Scancharges | Tabel: Charge, Scanner, Status, Voortgang, Geladen, Acties | Niet van toepassing | De voortgang toont gescand, mislukt en wachtend. Een charge die niet is verzonden, toont "Niet verzonden (code, tijd)" met een nieuwe poging. Mislukte beeldcontroles tonen de reden. | Niet van toepassing |
| Verzenden, Eruit halen | Knoppen | Niet van toepassing | **Verzenden** (`wsi:scan-batch:send`) stuurt het scanmanifest naar de interface-engine. **Eruit halen** (`wsi:scan-batch:unload`) sluit de charge zodra elk preparaat een resultaat heeft; preparaten die niet zijn gescand, keren terug naar de wachtrij. | Niet van toepassing |

#### Graveermonitor

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Filteren op organisatie | Keuzelijst | Optioneel | Beperkt de apparaten. | Alle organisaties |
| Apparaten | Kaarten met status, waarschuwingen, voorraadwaarschuwingen per cassettekleur en "Gemeld (tijd)" | Niet van toepassing | Een alleen-lezen samenvatting die ongeveer elke 30 seconden wordt vernieuwd. Een label **Gesimuleerd** verschijnt wanneer geen live bron is geconfigureerd. | Niet van toepassing |
| Diagnostiek van de engine starten | Link | Niet van toepassing | Opent de eigen diagnostiekpagina van de cassette-engine wanneer het apparaat een link meldt. | Niet van toepassing |

#### Apparatuurlogboek

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Apparatuurtabel | Elk actief instrument met zijn onderhouds- en kalibratiestatus | Niet van toepassing | Rijen met een servicewaarschuwing zijn gemarkeerd. Apparatuur toevoegen of wijzigen kan op [Apparatuur](#screen-equipment). | Niet van toepassing |
| Logboekvermelding | Knop per instrument | Niet van toepassing | Legt onderhoud of kalibratie vast. Vereist `equipment:maintenance:record` (in handen van Histotechnoloog, Cytotechnoloog, Moleculair technoloog, Beheerder en Laboratoriumdirecteur). | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:batch-management:open` (Histotechnoloog, Cytotechnoloog, Moleculair technoloog en Beheerder). Histotechnoloog, Cytotechnoloog en Moleculair technoloog beginnen ook met `batch:reconciliation:override`, `batch:run:abort`, `batch:cold-chain-excursion:acknowledge` (alle hoog risico, vastgelegd in het auditlogboek), `retention:material:dispose`, `retention:disposal-report:export`, `retention:holds-queue:export` en de drie machtigingen `wsi:scan-batch:*`. Beheerder opent het scherm maar heeft geen van deze; Beheerder heeft wel `label:batch:reprint` en `equipment:maintenance:record`. `case:retention-hold:release` is in handen van elke casusrol (Patholoog, Fellow, Arts-assistent, Patholoog-assistent, Accessioner en de drie technologenrollen).
**Bekende beperkingen.** De Graveermonitor leest een Firebase-verzameling (`engraver_devices`) wanneer Firebase is geconfigureerd en toont anders gesimuleerde apparaten; Firebase is niet de productiedatabase en dit wordt vervangen. De `README.md` in `src/pages/BatchManagement/` zegt nog steeds dat de wachtrij Bewaarblokkades niet is gerealiseerd; de pagina en de tegel bestaan wel. Charges zijn Gerealiseerd (`IBatchService` in `docs/architecture/CASE_WORKFLOWS_API.md`).
### Inbedstation {#screen-embedding-station}
Breadcrumb: Start > Inbedstation

**Status:** Gerealiseerd

**1. Navigatie:** Start > **Inbedstation**. Wordt geopend met `screen:embedding:open` (Histotechnoloog en Patholoog-assistent).
**2. Beheeronderdeel:** Niet van toepassing. Dit is een werkbankscherm.

**3. Doel en bereik.** Het werkbankscherm voor het inbedden. Een analist scant een cassette, controleert het aantal stukjes weefsel aan de hand van het uitsnijden, legt de gietmal en de oriëntatie vast, meldt elke discrepantie, groepeert blokken die één monster delen en drukt zo nodig het cassette-etiket opnieuw af.

**4. Vereisten en afhankelijkheden.** Voor het afdrukken van cassette-etiketten is een scanstation nodig dat voor deze computer is ingesteld, met afdrukken ingeschakeld en een printerprofiel voor cassettes; zonder dat zegt het printerpaneel "Dit station is niet geconfigureerd voor het echt afdrukken van cassette-etiketten." Het etiketvoorbeeld gebruikt de etiketindeling van de [Labelontwerper](#screen-label_designer). Welke invoer verplicht is, komt uit [Verplichte velden](#screen-field_requirements) (pagina `embedding`).

Setup step: Reference, not part of setup
Requires: [Scanstations](#screen-scan_stations), [Printerprofielen](#screen-printer_profiles), [Labelontwerper](#screen-label_designer), [Verplichte velden](#screen-field_requirements)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-embedding-station - Inbedstation met blokoverzicht, aantal stukjes en afdrukpaneel voor cassettes]

**6. Veldoverzicht.** Naslagpagina: de besturingselementen op het scherm.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Scan een cassette-barcode | Scanner of tekst | Verplicht om te beginnen | Laadt het blok. Scans die met `STATION:` beginnen, worden genegeerd. | Leeg |
| Contextbalk | Accessie, Patiënt, Geboortedatum, Preparaat/Blok, Type | Niet van toepassing | Patiëntvelden zijn getagd als patiëntgegevens zodat schermafbeeldingen kunnen worden geredigeerd. **Volgende cassette scannen** wist het scherm. | Niet van toepassing |
| Blokken van het preparaat | Lijst | Niet van toepassing | De blokken van het monster en hun status, met het huidige blok gemarkeerd. | Niet van toepassing |
| Waargenomen aantal; Bevestigen | Geheel getal | Verplicht tenzij optioneel gemaakt in Verplichte velden | Verificatie aantal weefselstukjes ten opzichte van het verwachte aantal van het uitsnijden. | Leeg |
| Standaard malmaat | Keuze: 7 × 7 mm, 15 × 15 mm, 24 × 24 mm, 24 × 30 mm, Megagietmal | Optioneel (kan verplicht worden gemaakt) | Vastgelegd op het blok. | Geen |
| Oriëntatie-instructies | Vrije tekst, met snelle invullingen "Op de rand inbedden", "Epitheeloppervlak naar beneden", "Dwarsdoorsnede naar boven" | Optioneel (kan verplicht worden gemaakt) | Vastgelegd op het blok. | Leeg |
| Discrepantiemelding | Knoppen met één aanraking: Ontbrekend weefsel/Lege cassette, Extra weefsel gevonden, Ongeopende cassette/Onverwerkt weefsel, Beschadigde cassette/Gebroken scharnier | Optioneel | Markeert het blok; toont "Laatst gemeld: (reden) (door naam)". | Geen |
| Waarschuwingsmarkeringen | Minuscuul weefsel, Fragiel, Decalcificatie vereist | Optioneel | Markeert het blok. | Uit |
| Multi-cassette / Gesplitst blok | Keuze uit andere niet-gegroepeerde blokken van hetzelfde monster | Optioneel | **Groeperen als gesplitste cassettes** koppelt ze. | Geen |
| Blokopmerkingen | Lade met **Opmerking**-tekst en **Opmerking toevoegen** | Optioneel (tekst kan verplicht worden gemaakt) | Opmerkingen bij het blok. | Leeg |
| Cassette opnieuw afdrukken | Knop, daarna een venster met een keuzelijst **Reden** | Reden verplicht | Redenen: Parafine-opbouw, Vervaagde barcode, Mechanische storing, Anders. Het aantal en de laatste reden worden getoond. | Niet van toepassing |
| Apparaatstatus, Etiketvoorbeeld | Weergave | Niet van toepassing | De status van de printer en een voorbeeld van het cassette-etiket. | Niet van toepassing |
| Voetpedaal | Hardware | Optioneel | Pedaal 1 bevestigt het aantal stukjes (zie [tabblad Spraak](#screen-tab-voice)). | Niet gekoppeld |

**7. Machtigingen.** Het scherm openen: `screen:embedding:open`. Beschermde stappen (opnieuw afdrukken, opmerkingen) worden met de persoon vastgelegd; er is geen aparte configuratiemachtiging van toepassing.
**Bekende beperkingen.** De lijsten met redenen voor opnieuw afdrukken, malmaten en discrepanties liggen vast in het product en zijn niet te bewerken.

### Microtomie-werkstation {#screen-microtomy-workstation}
Breadcrumb: Start > Microtomie-werkstation

**Status:** Gerealiseerd

**1. Navigatie:** Start > **Microtomie-werkstation**. Wordt geopend met `screen:microtomy:open` (Histotechnoloog).
**2. Beheeronderdeel:** Niet van toepassing. Dit is een werkbankscherm.

**3. Doel en bereik.** Het werkbankscherm voor het snijden van coupes. Een analist scant een blok (of voor cytologie een decanteer- of vloeistofcontainer), voegt de te snijden preparaten toe per kleuring en niveau, drukt preparaatetiketten af of etst ze, één voor één of als batch, drukt opnieuw af met een reden, meldt een blok als op en volgt de facturatie voor het blok.

**4. Vereisten en afhankelijkheden.** De keuzelijst met kleuringen is de [Diagnostische catalogus](#screen-stains). Voor het afdrukken van preparaatetiketten is een scanstation met preparaatafdruk en een printerprofiel nodig. Verplichte invoer komt uit [Verplichte velden](#screen-field_requirements) (pagina `microtomy`).

Setup step: Reference, not part of setup
Requires: [Scanstations](#screen-scan_stations), [Printerprofielen](#screen-printer_profiles), [Diagnostische catalogus](#screen-stains), [Verplichte velden](#screen-field_requirements)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-microtomy-workstation - Microtomie-werkstation met objectglaasjesraster en afdrukpaneel]

**6. Veldoverzicht.** Naslagpagina: de besturingselementen op het scherm.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Scan een blok- of decanteer-/vloeistofcontainerbarcode | Scanner of tekst | Verplicht om te beginnen | Laadt het blok. | Leeg |
| Blokoverzicht | Weergave | Niet van toepassing | Status, aantal stukjes, weefsel, blokopmerkingen, eerdere preparaatgeschiedenis en, voor een matrixblok, de kernen erin met positie en monster. | Niet van toepassing |
| Objectglaasjesraster | Tabel: Niveau, Kleuring, Afdrukstatus, Acties | Niet van toepassing | Eén rij per preparaat. **Afdrukken** drukt er één af; **Opnieuw afdrukken** vereist een reden; **Verwijderen** van een afgedrukt preparaat vereist een reden voor annulering. Een **Controle**-preparaat kan worden gekoppeld. | Niet van toepassing |
| Kleuring (preparaat toevoegen) | Keuzelijst met zoekfunctie | Verplicht (kan worden uitgeschakeld) | De kleuring voor een nieuw preparaat. | Geen |
| Duplicaten | Geheel getal | Optioneel | Hoeveel van dezelfde kleuring. | 1 |
| Niveaudiepte | Getal in µm | Optioneel (kan verplicht worden gemaakt) | Diepte van de snede. **+ Niveau** snijdt een extra niveau van dezelfde kleuring. | Leeg |
| Reden voor opnieuw afdrukken | Keuze: Storing, Bekrast glas, Misdruk, Anders | Reden verplicht | Vastgelegd bij het preparaat. | Geen |
| Reden voor annulering (afgedrukt preparaat) | Keuze: Beschadigde coupe, Per ongeluk besteld, Weefsel op, Anders | Reden verplicht | Annulering van een preparaat dat al is afgedrukt. | Geen |
| Afdrukmodus | Keuze: Op verzoek, Batch | Optioneel | Op verzoek gebruikt **Volgende afdrukken/etsen** voor het volgende niet-afgedrukte preparaat; Batch drukt de aangevinkte preparaten af met een voortgangsvenster. | Op verzoek |
| Opmerkingen bij preparaat en blok | Lade met **Opmerking** en een selectievakje "Deze opmerking op het fysieke etiket afdrukken" | Optioneel (tekst kan verplicht worden gemaakt) | Een opmerking bij een preparaat kan op het etiket worden afgedrukt. | Leeg |
| Blok op | Knop en venster met een verplichte **Notitie** | Notitie verplicht | Stuurt een e-mail naar de aanvragende patholoog en blokkeert het snijden totdat die destructief snijden goedkeurt of de order annuleert of wijzigt. Goedkeuring vereist `add-on:exception:approve-destructive-cut`. | Niet van toepassing |
| Specimenvloeistof-/decanteerpaneel | Totaal volume (mL); Uiterlijk: Helder, Bloederig, Troebel; Decanteeropbrengst: Laag, Matig, Hoog | Optioneel | Invoer voor cytologievloeistoffen. Toont een voorgestelde voorbereiding met **Suggestie accepteren**. | Leeg |
| Facturatiepaneel | Weergave | Niet van toepassing | Kosten voor de preparaten van het blok, met waarschuwingen voor kosten die op goedkeuring wachten; **Volledige facturatiecontrole** vereist de machtiging voor facturatiecontrole. | Niet van toepassing |
| Voetpedaal | Hardware | Optioneel | Pedaal 2 drukt het volgende preparaat af of etst het (zie [tabblad Spraak](#screen-tab-voice)). | Niet gekoppeld |

**7. Machtigingen.** Het scherm openen: `screen:microtomy:open`. Destructief snijden goedkeuren: `add-on:exception:approve-destructive-cut` (Patholoog, Fellow, Arts-assistent). Volledige facturatiecontrole: `billing:applied-code:review`.
**Bekende beperkingen.** De lijsten met redenen liggen vast in het product.

### Objectglaasjes-distributiestation {#screen-slide-distribution-station}
Breadcrumb: Start > Objectglaasjes-distributiestation

**Status:** Gerealiseerd

**1. Navigatie:** Start > **Objectglaasjes-distributiestation**. Wordt geopend met `screen:slide-distribution:open` (Histotechnoloog).
**2. Beheeronderdeel:** Niet van toepassing. Dit is een werkbankscherm.

**3. Doel en bereik.** Het scherm voor het uitgeven van preparaten. Een analist scant preparaten in een werkwachtrij en routeert ze daarna elk naar een fysieke uitgifte (een patholoog of pool, met een map, tray of koerierszak) of naar een digitale scanner (een rek en een slot), en legt scanuitzonderingen vast.

**4. Vereisten en afhankelijkheden.** Pathologen en pools komen uit de personeelslijst en uit de pools van [Subspecialismen](#screen-subspecialties). Scanners zijn apparatuur van het soort "Slide scanner" op [Apparatuur](#screen-equipment); zonder scanners zegt de keuzelijst dat er geen zijn ingesteld. Verplichte invoer komt uit [Verplichte velden](#screen-field_requirements) (pagina `slideDistribution`).

Setup step: Reference, not part of setup
Requires: [Apparatuur](#screen-equipment), [Subspecialismen](#screen-subspecialties), [Verplichte velden](#screen-field_requirements)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-slide-distribution-station - Objectglaasjes-distributiestation met wachtrij en bestemmingspaneel]

**6. Veldoverzicht.** Naslagpagina: de besturingselementen op het scherm.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Scan een preparaat- of blok-/cassettebarcode | Scanner of tekst | Optioneel | De wachtrij groeit voortdurend. | Leeg |
| Werkwachtrij | Lijst met aantal | Niet van toepassing | Preparaten met kleuring, status en routering; **Verwijderen uit wachtrij** verwijdert er één. Kan worden gegroepeerd per subspecialismepool of Niet toegewezen. | Niet van toepassing |
| Bestemmingsmodus | Keuze: Fysieke uitgifte, Digitale scanner | Verplicht | Kiest de vorm van de bestemming. | Fysieke uitgifte |
| Patholoog of pool | Keuzelijst met zoekfunctie | Verplicht (kan worden uitgeschakeld) | Wie het preparaat ontvangt. | Geen |
| Objectglaasjesmap-ID, Traynummer, Koerier-transportzak | Tekst | Optioneel (elk kan verplicht worden gemaakt) | Details over de fysieke locatie. **Fysieke routering bevestigen** slaat op. | Leeg |
| Scannerinstrument | Keuzelijst met preparaatscanners | Verplicht voor Digitaal | De scanner. | Geen |
| Rek-ID, Slotpositie | Tekst | Optioneel (elk kan verplicht worden gemaakt) | Positie op de scanner. **Scannerroutering bevestigen** slaat op en zet het preparaat in de scanwachtrij. | Leeg |
| Actief objectglaasje, Bewaringsketen | Weergave | Niet van toepassing | De status en geschiedenis van het geselecteerde preparaat. | Niet van toepassing |
| Vervangend etiket aanvragen | Knop en venster met **Reden** | Reden verplicht | Redenen: Beschadigd etiket, Onleesbare barcode, Uitgelopen afdruk, Anders. Bewaard in de registratie van de chain of custody. | Niet van toepassing |
| Scanuitzonderingenlogboek | Onopgeloste scans met **Oplossen** en een optionele **Notitie** | Optioneel (notitie kan verplicht worden gemaakt) | Redenen: Onleesbare barcode, Niet-toegewezen accessie, Ontbrekend objectglaasje. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:slide-distribution:open`. Er is geen aparte configuratiemachtiging van toepassing.
**Bekende beperkingen.** De lijsten met redenen liggen vast in het product. Achter het routeringsgegevensmodel (Objectglaasjesmap, Tray, Koerier-transportzak) zit geen woordenboek; de waarden zijn vrije tekst.

## Digitale pathologie, integratie van WSI-scanners en viewerinstellingen {#ch4-digital-pathology}
Breadcrumb: Start > Configuratie > Systeem

Dit deel behandelt wat PathScribe vandaag voor digitale pathologie biedt. Wees precies over de omvang. Er zijn twee onderdelen. Ten eerste de leveranciers-woordenboeken op [Leveranciersintegraties](#screen-vendor_integrations), dat lijsten met namen en webadressen zijn. Ten tweede de wachtrij voor het scannen van preparaten op [Batchbeheer](#screen-batch-management), die een scanmanifest naar de interface-engine stuurt en een status terugkrijgt. **Niet gerealiseerd:** een leverancierspecifieke scannerdriver of een leveranciersconnector. Geen enkel scherm configureert een scanner anders dan door hem te benoemen als Apparatuur van het soort "Slide scanner" op [Apparatuur](#screen-equipment). Het openen van de beeldviewer wordt beschreven onder Leveranciersintegraties. De mock-viewerpagina is uitsluitend een demonstratie.

### Leveranciersintegraties {#screen-vendor_integrations}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Leveranciersintegraties

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Beheeronderdeel:** Leveranciersintegraties (vier categorieën in een lijst links: Digitale pathologie / AI, WSI-viewers, Beeldbeheersystemen, Macro-beeldvorming & telepathologie)

**3. Doel en bereik.** Eén scherm bevat vier woordenboeken van externe producten. Elk is een lijst met **Toevoegen**, **Bewerken**, **Deactiveren / Reactiveren** en een schakelaar **Inactief tonen**. Items worden nooit verwijderd. De lijsten zijn referentiegegevens: keuzelijsten en links die andere onderdelen van PathScribe lezen. De lijsten Digitale pathologie / AI, Beeldbeheersystemen en Macro-beeldvorming zijn namen en instellingen die worden vastgelegd en getoond; het product bevat geen leverancierspecifieke connector die erop werkt. Alleen de lijst WSI-viewers heeft een werkend gebruik: de **Opstart-URL-sjabloon** ervan wordt vanuit een casus geopend met de knop **Openen in viewer**.

**4. Vereisten en afhankelijkheden.** Geen, behalve de toegang van de persoon. Voeg hier een WSI-viewer toe voordat preparaten in een externe viewer kunnen worden geopend; scannerhardware is een aparte lijst (Apparatuur).

Setup step: Tier 3, step 9
Requires: Geen.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-vendor_integrations - Leveranciersintegraties met de vier categorieën en de lijst WSI-viewers]

**6. Veldoverzicht.**

#### Digitale pathologie / AI (venster Toevoegen en Bewerken)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Leveranciersnaam | Tekst | Verplicht | Opslaan is uitgeschakeld wanneer leeg. | Geen |
| Productnaam | Tekst | Verplicht | Opslaan is uitgeschakeld wanneer leeg. | Geen |
| Modaliteit | Tekst | Verplicht | Bijvoorbeeld het klinische gebied dat het product dekt. Opslaan is uitgeschakeld wanneer leeg. | Geen |
| FDA-goedgekeurd | Selectievakje | Optioneel | Getoond naast het item in de lijst. | Uit |
| Inactief tonen | Schakelaar | Optioneel | Toont items die zijn gedeactiveerd. | Uit |

De demonstratiegegevens bevatten zes items: Paige Prostate, Ibex Prostate Detect, PathAI AISight Dx, Proscia Concentriq AP-Dx, Hologic Genius Digital Diagnostics (alle FDA-goedgekeurd) en BD FocalPoint GS Imaging System (niet als goedgekeurd gemarkeerd).

#### WSI-viewers (venster Toevoegen en Bewerken)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam (leveranciers-/productnaam) | Tekst | Verplicht | Opslaan is uitgeschakeld wanneer leeg. | Geen |
| Opstart-URL-sjabloon | Webadres dat het token `{{wsiUniqueId}}` bevat | Optioneel | PathScribe vervangt het token door de unieke id van het preparaat en opent het resultaat in een bijbehorend venster. Een waarschuwing verschijnt wanneer de tekst het token mist. Een item zonder sjabloon toont "geen URL geconfigureerd" en kan niet worden gestart. | Leeg |
| Inactief tonen | Schakelaar | Optioneel | | Uit |

Alle demonstratie-items hebben een leeg sjabloon, behalve `[DEMO ONLY] Sample WSI Viewer`, dat naar een adres op example.com wijst en geen echte viewer is.

#### Beeldbeheersystemen (venster Toevoegen en Bewerken)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam | Tekst | Verplicht | Opslaan is uitgeschakeld wanneer leeg. | Geen |
| Implementatie | Keuze: Enterprise IMS, On-Prem File Server | Optioneel | Waar de beeldopslag draait. | Enterprise IMS |
| Authenticatie | Keuze: Geen, Signed URL, OAuth 2.0 Bearer, mTLS | Optioneel | Hoe de opslag wordt bereikt. Alleen de keuze wordt vastgelegd. | Geen |
| Basis-URL | Tekst | Optioneel | Adres van de opslag. Het venster waarschuwt dat u geen tokens of geheimen moet opnemen. Een item zonder adres toont "geen basis-URL". | Leeg |

#### Macro-beeldvorming & telepathologie (venster Toevoegen en Bewerken)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam | Tekst | Verplicht | Opslaan is uitgeschakeld wanneer leeg. | Geen |
| Authenticatie | Keuze (dezelfde vier als hierboven) | Optioneel | Alleen vastgelegd. | Geen |
| Basis-URL | https-webadres | Optioneel | Een adres dat niet https is, toont een foutmelding en Opslaan is uitgeschakeld. | Leeg |
| Ondersteunt live telepathologie | Selectievakje | Optioneel | De lijst toont "geschikt voor telepathologie" of "alleen statisch". Niets buiten deze lijst leest het. | Uit |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Toevoegen, bewerken, deactiveren: `config:vendor-integrations:manage` (standaard Beheerder en Laboratoriumdirecteur). Anderen zien de lijsten alleen-lezen.
**Bekende beperkingen.** Het contract staat in `docs/architecture/DIGITAL_PATHOLOGY_API.md`. **Alleen demonstratie: Mock WSI Viewer.** Een route `/wsi-viewer?caseId=` opent `MockWsiViewerPage`, die een melding "mock", de identiteit van de casus en een lege plaatsaanduiding toont waar een preparaat zou staan. Zij bestaat alleen wanneer de build de demonstratiehulpmiddelen heeft ingeschakeld, wordt door een test uit productiebuilds uitgesloten en is geen instelling van een beheerder. PathScribe zelf toont geen enkel whole-slide-beeld. Geen enkel leveranciersrecord wordt door de AI of de scanwachtrij gelezen.

## Instellingen voor autorisatie, beoordeling, kwaliteit en operaties van de patholoog {#ch4-signout}
Breadcrumb: Start > Configuratie > Systeem

Dit deel behandelt elke instelling die de autorisatie vormgeeft en de schermen voor kwaliteit, doorlooptijd en operaties eromheen. De schermen zijn gegroepeerd als: regels voor autorisatie en beoordeling; intraoperatief en weergave; doorlooptijd; kwaliteitsborging en cytologie-KC; en overig (bijdrage, feedback, onderzoeksfeed). De dagelijkse pagina's (Start, Kwaliteitsborging, Lockbox-afgifte, Margeafwijkingen beoordelen, Cytologie-KC-wachtrij) zijn naslagpagina's en staan aan het eind van het deel.

Bijna elk scherm hieronder volgt hetzelfde patroon: een standaard voor de organisatie die elk uitvoerend laboratorium kan overnemen of overschrijven op het bewerkvenster **Faciliteitsconfiguratie** ([Faciliteitswoordenboek](#screen-facility-dictionary), niveau 1). Het uitvoerende laboratorium is het laboratorium dat de casus autoriseert, te vinden via de aanvragende faciliteit. Alle instellingen zijn configuratie met hoog risico: standaard hebben alleen Beheerder en Laboratoriumdirecteur (en de superbeheerder van ForMedrixAI) de machtiging om ze te wijzigen, en wie die niet heeft, ziet het scherm alleen-lezen.

### Collegiale toetsing vóór aftekenen {#screen-peer_review_gate}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Collegiale toetsing vóór aftekenen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Collegiale toetsing vóór aftekenen

**3. Doel en bereik.** Een eerste maligniteit (beoordeeld op basis van eerdere casus van de patiënt) wordt altijd aanbevolen voor een onafhankelijke collegiale toetsing. Dit scherm bepaalt waar de autorisatie ook **wacht** op die toetsing. Het staat standaard uit. De meest specifieke instelling wint: afdeling, dan uitvoerend laboratorium, dan de organisatie. Wanneer de poort aan staat, kan een patholoog voor dringende zorg toch autoriseren vóór de toetsing, onder opgave van een reden; de toetsing is dan binnen 24 uur verschuldigd.

**4. Vereisten en afhankelijkheden.** De rijen komen uit de uitvoerende laboratoria ([Faciliteitswoordenboek](#screen-facility-dictionary)) en uit de subspecialismen ([Subspecialismen](#screen-subspecialties), getoond als "Afdeling"). Zonder deze is alleen de schakelaar voor de organisatie beschikbaar.

Setup step: Tier 3, step 10
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary), [Subspecialismen](#screen-subspecialties)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-peer_review_gate - Collegiale toetsing vóór aftekenen met de schakelaar voor de organisatie en twee tabellen]

**6. Veldoverzicht.** Elke wijziging wordt direct opgeslagen en toont "Opgeslagen".

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Aftekenen wacht in de hele organisatie op de collegiale toetsing | Selectievakje | Optioneel | De instelling voor de hele organisatie. | Uit |
| Uitvoerend laboratorium (tabel Per instelling): Aftekenen wacht op toetsing | Keuze per laboratorium: Overnemen, Aan, Uit | Optioneel | Overnemen gebruikt de instelling van de organisatie. | Overnemen |
| Afdeling (tabel Per afdeling): Aftekenen wacht op toetsing | Keuze per subspecialisme: Overnemen, Aan, Uit | Optioneel | Overnemen gebruikt de instelling van het laboratorium. | Overnemen |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:peer-review:manage` (hoog risico, wordt vastgelegd in het auditlogboek; Beheerder en Laboratoriumdirecteur). 
**Bekende beperkingen.** Er bestaat een serverversie (`QUALITY_SETTINGS_API.md`, `QUALITY_API.md`); de demonstratie bewaart de instellingen in de browser.
### Concordantiebeoordeling voorlopig vs. definitief {#screen-concordance_review_settings}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Concordantiebeoordeling voorlopig vs. definitief

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Concordantiebeoordeling voorlopig vs. definitief

**3. Doel en bereik.** Regelt de automatische vergelijking van een voorlopige bevinding (bijvoorbeeld een diagnose op een vriescoupe) met de definitieve diagnose, en een optioneel controlescherm bij de autorisatie. De patholoog neemt altijd zelf de beslissing over de concordantie; deze twee instellingen bepalen alleen of het systeem helpt die naar boven te brengen.

**4. Vereisten en afhankelijkheden.** Geen voor de standaard van de organisatie. Een uitzondering op laboratoriumniveau stelt u in op het bewerkvenster Faciliteitsconfiguratie ([Faciliteitswoordenboek](#screen-facility-dictionary)).

Setup step: Tier 3, step 11
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-concordance_review_settings - Concordantiebeoordeling voorlopig vs. definitief met twee schakelaars]

**6. Veldoverzicht.** Elke schakelaar wordt direct opgeslagen en toont "Opgeslagen".

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Automatische vergelijking inschakelen | Schakelaar | Optioneel | Het systeem vergelijkt een voorlopige bevinding met de bijbehorende definitieve diagnose en markeert een echte discordantie voor beoordeling door de patholoog. Het beoordeelt zelf nooit een uitslag. | Aan |
| Controlescherm vereisen bij ondertekening | Schakelaar | Optioneel | Een extra scherm toont de vergelijking tussen voorlopig en definitief voordat de autorisatie kan worden afgerond. | Aan |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:concordance-review:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** De instelling wordt ook per laboratorium op de faciliteitsrecord bewaard. Er bestaat een serverversie (`QUALITY_SETTINGS_API.md`).

### Vrijgavebuffer na ondertekening {#screen-release_buffer}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Vrijgavebuffer na ondertekening

**Status:** Gedeeltelijk

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Vrijgavebuffer (titel op het scherm: Vrijgavebuffer na ondertekening)

**3. Doel en bereik.** Een tijdelijke blokkade tussen autorisatie en daadwerkelijke externe vrijgave. Zolang het verslag onder **Wacht op vrijgave** wordt vastgehouden, kan de autoriserende patholoog het terugroepen en corrigeren zonder formele aanvulling. Dit zijn de standaardwaarden voor de hele organisatie. Een uitvoerend laboratorium kan ze overnemen of op het bewerkvenster Faciliteitsconfiguratie eigen waarden instellen voor ingeschakeld, duur en STAT-omzeiling; het watermerk en de afdrukbeperking gelden alleen voor de hele organisatie.

**Wat de code vandaag doet (gecontroleerd in de broncode).** Het tijdstip van autorisatie dat de doorlooptijdrapporten voedt, wordt nog steeds bij de autorisatie vastgelegd. Een apart tijdstip "vrijgegeven op" wordt vastgelegd wanneer de blokkade eindigt. De blokkade wordt beëindigd door een timer die in elk geopend PathScribe-scherm loopt (en een achtergrondcontrole op elk geopend scherm). Een planner aan de serverzijde die een casus vrijgeeft die niemand open heeft, is gepland met de API-server en is **niet gerealiseerd**, dus de vrijgave kan te laat komen wanneer geen scherm open is. 

**4. Vereisten en afhankelijkheden.** Geen voor de standaardwaarden. Afwijkingen per laboratorium: [Faciliteitswoordenboek](#screen-facility-dictionary).

Setup step: Tier 3, step 12
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-release_buffer - Instellingen van de Vrijgavebuffer na ondertekening]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Vrijgavebuffer na ondertekening inschakelen | Schakelaar | Optioneel | Een ondertekend verslag wordt voor de duur van de buffer vastgehouden onder Wacht op vrijgave, tenzij een omzeiling van toepassing is. | Aan |
| Bufferduur | Geheel aantal minuten, 1 tot en met 30 | Verplicht | Een waarde buiten het bereik wordt begrensd. | 10 |
| Buffer omzeilen voor STAT-casussen | Schakelaar | Optioneel | STAT-casus worden direct vrijgegeven. | Aan |
| Watermerk-bannertekst | Tekst | Optioneel | Diagonaal getekend over elke weergave op het scherm van een verslag dat op vrijgave wacht, en naar de PDF-renderer gestuurd. PathScribe stuurt de tekst; het kan niet controleren of de aparte renderer haar tekent. | PENDING FINAL RELEASE - DO NOT DISTRIBUTE |
| Afdrukbeleid tijdens de vrijgavevertraging | Keuze: Toestaan, Waarschuwen en bevestigen, Uitzondering door leidinggevende, Blokkeren | Optioneel | Wat er gebeurt wanneer iemand een verslag afdrukt dat nog in zijn vrijgavevertraging zit (Batch 654; het vervangt de oude schakelaar "Intern afdrukken op papier beperken"). **Toestaan** drukt direct af. **Waarschuwen en bevestigen** waarschuwt dat de kopie een concept met watermerk is en vraagt de persoon dit te bevestigen. **Uitzondering door leidinggevende** laat alleen een persoon met `print:release-hold:override` afdrukken, en die moet een reden opgeven; iedereen anders wordt geweigerd. **Blokkeren** staat geen afdruk toe totdat het verslag is vrijgegeven. Elke afgedrukte kopie draagt nog steeds het watermerk voor vrijgave in behandeling. Een oude instelling Aan werd Waarschuwen en bevestigen; Uit werd Toestaan. De instelling geldt voor de hele organisatie en is grijs zolang de vrijgavevertraging is uitgeschakeld. | Waarschuwen en bevestigen |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:release-buffer:manage` (hoog risico; Beheerder en Laboratoriumdirecteur). Een verslag afdrukken tijdens de vrijgavevertraging onder Uitzondering door leidinggevende: `print:release-hold:override` ("Een verslag afdrukken tijdens de vrijgavevertraging (uitzondering door leidinggevende)"; Laboratoriumdirecteur en Beheerder hebben deze standaard; geef haar aan elke andere rol die vastgehouden verslagen moet afdrukken).
**Bekende beperkingen.** Gedeeltelijk vanwege het bovenstaande punt over de planner. De server-job voor de vrijgavesweep, die een verslag vrijgeeft dat niemand open heeft staan, is ontworpen (`docs/architecture/RELEASE_SWEEP_SERVER_JOB.md`: één sweep per minuut; een gemist venster geeft te laat vrij en de casus wordt gemarkeerd) en is **niet gebouwd**. Wanneer hij is gebouwd, geeft hij nooit een verslag vrij dat onder een vasthouding voor chirurgische aftekening valt; hij markeert de casus dan voor een persoon. Er bestaat een serverversie van de instellingen (`REPORTS_API.md`).

### Ondertekeningsregels per land {#screen-country_signing_rules}
Breadcrumb: Start > Configuratie > Systeem > Klinische lookups > Ondertekeningsregels per land

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Klinische lookups**. Alleen intern: een beheerder van een klant ziet het scherm alleen-lezen.
**2. Beheeronderdeel:** Ondertekeningsregels per land

**3. Doel en bereik.** De nationale regels voor elk deelnametype: de lokale titel, of het mag autoriseren, of het werk een medeondertekening nodig heeft en of het de hele casus mag inzien. Elk laboratorium in het land neemt de regels over, tenzij het onder Deelnametypen een eigen uitzondering heeft. De regels leggen nationale regelgeving vast, dus alleen de platformbeheerder van ForMedrixAI kan ze wijzigen. Elke opslag vereist een reden en wordt vastgelegd in het auditlogboek.

**4. Vereisten en afhankelijkheden.** De rijen zijn de deelnametypen.

Setup step: Tier 3, step 13
Requires: [Deelnametypen](#screen-participation_types)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-country_signing_rules - Ondertekeningsregels per land met één kaart per deelnametype]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Land | Keuzelijst: US, CA, GB (Engeland en Wales), GB (Schotland), GB (Noord-Ierland), IE, AU, NZ, KR, BE, NL, DE, FR, ES | Verplicht | Wisselen met niet-opgeslagen wijzigingen wordt geblokkeerd ("Sla uw wijzigingen op of verwerp ze voordat u van land wisselt"). | GB (Engeland en Wales) |
| Aanbieden in dit land / Hier niet meer aanbieden | Knop op een kaart waarvan het type niet globaal is | Optioneel | Voegt het type toe aan het land of verwijdert het. Het verwijderen van het laatste land wordt geweigerd (deactiveer in plaats daarvan het type). | Niet van toepassing |
| Lokale titel | Tekst | Optioneel | De naam van het land voor het type. De plaatsaanduiding toont de platformtitel. | Leeg (platformtitel) |
| Mag afronden / aftekenen | Keuze: Platformstandaard (waarde), Ja, Nee | Optioneel | Of het type mag autoriseren. | Platformstandaard |
| Medeondertekening vereist | Keuze: Platformstandaard, Ja, Nee | Optioneel | Of het werk van het type een medeondertekening nodig heeft. | Platformstandaard |
| Mag de hele casus inzien | Keuze: Platformstandaard, Ja, Nee | Optioneel | | Platformstandaard |
| Regelgevende grondslag | Tekst met meerdere regels | Optioneel | De regel van de toezichthouder of beroepsvereniging die de instelling volgt. | Leeg |
| Reden voor de wijziging | Tekst | Verplicht om op te slaan | Foutmelding "Geef een reden voor de wijziging op." Getoond met "Laatst gewijzigd door (naam) op (datum). Reden". | Leeg |
| Wijzigingen verwerpen, Wijzigingen opslaan | Knoppen | Niet van toepassing | **Wijzigingen opslaan** meldt een gedeeltelijke mislukking ("eerder opgeslagen typen zijn behouden en gelogd"). | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `platform:signing-rules:manage` (alleen platform, hoog risico; alleen de superbeheerder van ForMedrixAI). Beheerder en Laboratoriumdirecteur kunnen het niet wijzigen.
**Bekende beperkingen.** Contract in `docs/architecture/LAB_DICTIONARIES_API.md`.

### Revisieredenen {#screen-revision_reasons}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Revisieredenen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Revisieredenen

**3. Doel en bereik.** Toont de redenen die een patholoog kiest bij het aanvullen of corrigeren van een vrijgegeven verslag, en laat de beheerder markeren welke betekenen dat het oorspronkelijke verslag de klinische behandeling kan hebben beïnvloed. Het vrijgeven van een revisie met een gemarkeerde reden beveelt de KA-verantwoordelijke een CAPA aan. Dit scherm schakelt alleen de markering om; het voegt geen redenen toe en hernoemt ze niet.

**4. Vereisten en afhankelijkheden.** Geen.

Setup step: Tier 3, step 14
Requires: Geen.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-revision_reasons - Revisieredenen in twee groepen met een schakelaar voor klinisch significant]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Wijzigingsredenen (diagnostische revisie), Correctieredenen (administratief) | Twee lijsten | Niet van toepassing | Meegeleverde redenen. Wijziging: Diagnostic Interpretation Revision, Surgical Margin Re-evaluation, Pathologic Staging Change, Specimen/Site Reclassification. Correctie: Typographical Error, Patient/Demographic Information Update, Ordering Provider Update, Specimen Labeling Correction. | Niet van toepassing |
| Reden, Beschrijving | Tekst | Niet van toepassing | Hier alleen-lezen. Inactieve redenen tonen een label "Inactief". | Niet van toepassing |
| Klinisch significant | Schakelaar per reden | Optioneel | Aan toont "Beveelt een CAPA aan", uit toont "Geen CAPA". | Aan voor de vier wijzigingsredenen, uit voor de vier correctieredenen |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:revision-reasons:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** In het product zijn de beginwaarden: diagnose, snijrand, stadium en herclassificatie van weefsel aan; administratieve correcties uit (`revisionReasonRules.ts`). De service staat toe redenen toe te voegen, te bewerken, te deactiveren en te reactiveren, maar dit scherm heeft daarvoor geen knop; dat wordt voor Pete vermeld in `open-questions/ch4.md`. Contract: `docs/architecture/LAB_DICTIONARIES_API.md`.

### Redenen aan de werkbank {#screen-bench_reasons}
Breadcrumb: Start > Configuratie > Systeem > Beheer en compliance > Redenen aan de werkbank

**Status:** Gebouwd (batch 736)

**1. Navigatie:** configuratietabblad **Systeem** > groep **Beheer en compliance**
**2. Onderhoudsitem:** Redenen aan de werkbank

**3. Doel en reikwijdte.** De redenen die medewerkers aan de werkbank aantikken in plaats van typen, in vijf groepen: microtoom (blok uitgeput); aanvullende orders bij een uitgeput blok (order en antwoord van de patholoog, inclusief goedkeuring van destructief snijden); batch afbreken; batch afronden met afwijkingen; koudeketenafwijking. Elk lab formuleert ze op zijn eigen manier. Een reden houdt bij herformulering haar **code**; elk record en elke auditregel bewaart de code naast de tekst, zodat rapporten (kolom **Redencode** in het rapport afstemmingsafwijkingen) haar voor en na herformulering op dezelfde manier tellen. Een notitie blijft optioneel.

**4. Voorwaarden en afhankelijkheden.** Geen. De standaardredenen worden in alle zes talen geleverd.

Setup step: Tier 3, step 32
Requires: None.
Unlocks: None.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-bench_reasons - Redenen aan de werkbank in vijf groepen]

**6. Velden.** Formulering (met **Herformuleren**; een standaardreden verschijnt in de taal van elke gebruiker, een geherformuleerde zoals ingevoerd), Code (alleen-lezen, verandert nooit), ↑ / ↓ (volgorde), **Standaardformulering gebruiken**, **Intrekken** / **Herstellen**, **Reden toevoegen**.

**7. Rechten.** Scherm openen: `screen:configuration:open`. Wijzigen: `config:bench-reasons:manage` (hoog risico; beheerder en labdirecteur).
**Bekende beperkingen.** Eén lijst voor de hele organisatie; een locatie kan nog geen eigen formulering hebben.

### Tumor board-regels voor automatische markering {#screen-tumor_board_rules}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Tumor board-regels voor automatische markering

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Tumor board-regels (titel op het scherm: Tumor board-regels voor automatische markering)

**3. Doel en bereik.** Bij de autorisatie plaatst PathScribe een casus op de lijst voor een tumor board wanneer een regel overeenkomt met het ondertekende verslag, en legt vast waarom. Er zijn vier namen van boards: Breast MDT, GI MDT, Thoracic MDM en Gyn-Onc. Er bestaan twee soorten regels. Een margeregel plaatst de casus op de lijst wanneer een snijrand dichterbij ligt dan een drempel. Een regel voor diagnose en biomarker plaatst de casus op de lijst wanneer elk criterium overeenkomt. Waarden voor de onderneming kunnen voor één faciliteit worden overschreven of uitgezet. Een aparte vergrendeling voor batches sluit de casuslijst van een board vóór de vergadering af.

**4. Vereisten en afhankelijkheden.** Overschrijvingen per faciliteit gebruiken het [Faciliteitswoordenboek](#screen-facility-dictionary). Criteria worden gekoppeld op veldlabel en bewoording in het ondertekende verslag, dus test een regel op een echt verslagsjabloon voordat u erop vertrouwt.

Setup step: Tier 3, step 15
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-tumor_board_rules - Tumor board-regels voor automatische markering met margeregels, criteriaregels, vergrendeling en faciliteitsoverschrijvingen]

**6. Veldoverzicht.** Foutmeldingen verschijnen boven de kaarten.

#### Ondernemingsbasis (margeregels)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Regellijst (bord en omschrijving) | Eén rij per bord | Niet van toepassing | Vier meegeleverde regels, één per bord, "Close or positive margin (< 1mm)". | Niet van toepassing |
| Margedrempel (mm) | Getal groter dan 0 | Verplicht | Foutmelding "Voer een margedrempel groter dan 0 in." | 1 |
| Actief | Selectievakje | Optioneel | Zet de regel uit voor de onderneming. | Aan |
| Opslaan | Knop | Niet van toepassing | Pas beschikbaar na een wijziging. | Niet van toepassing |

#### Regels voor diagnose en biomarker

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Omschrijving van de regel | Tekst, 1 tot en met 80 tekens | Verplicht | De reden die wordt vastgelegd wanneer een casus op de lijst wordt geplaatst. | Leeg |
| Bord | Keuzelijst met de vier boards | Verplicht | Foutmelding "Kies een bord." | Niet van toepassing |
| Type van criterium (n) | Keuze: Diagnose bevat, Biomarkerresultaat, Marge kleiner dan (mm) | Verplicht | Elk criterium moet overeenkomen. Een regel heeft 1 tot en met 6 criteria en ten minste één diagnose- of biomarkercriterium. | Niet van toepassing |
| Diagnosetekst voor criterium (n) | Tekst, 2 tot en met 60 tekens | Verplicht voor een diagnosecriterium | | Leeg |
| Biomarker; Resultaat voor criterium (n) | Twee tekstvakken, elk tot 60 tekens | Verplicht voor een biomarkercriterium | | Leeg |
| Margedrempel (criterium) | Getal groter dan 0 | Verplicht voor een margecriterium | | Leeg |
| Actief | Selectievakje | Optioneel | | Aan |
| + Regel toevoegen, + Criterium toevoegen, Criterium verwijderen, Verwijderen, Opslaan, Annuleren | Knoppen | Niet van toepassing | Ten hoogste 25 regels voor diagnose en biomarker ("De limiet van 25 ... is bereikt"). | Geen regels |

#### Vergrendeling van batches

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Vergrendeling (uren vóór de vergadering) | Getal, 0 of meer | Verplicht | Wijzigingen in de planning worden binnen dit venster geweigerd. Zelftoewijzing door de presentator werkt nog tot en na de vergadering. | 48 |

#### Faciliteitsoverschrijvingen

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Faciliteit | Keuzelijst | Verplicht | Foutmelding "Kies een faciliteit." | Eerste faciliteit |
| Regel | Keuzelijst met de margeregels en de criteriaregels | Verplicht | De regel die wordt overschreven. | Eerste regel |
| Margedrempel (mm) | Getal groter dan 0 | Verplicht voor een margeregel | Niet gebruikt voor een criteriaregel. | De waarde van de regel |
| Actief | Selectievakje | Optioneel | Uit schakelt de regel uit bij die faciliteit (de lijst toont "uitgeschakeld"). | Aan |
| Naar bord doorsturen | Keuzelijst, of "Het bord van de regel zelf" | Optioneel | Stuurt de casus bij die faciliteit naar een ander bord. | Het bord van de regel zelf |
| Opslaan, Annuleren, Verwijderen | Knoppen | Niet van toepassing | | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:tumor-board-rules:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Contract: `docs/architecture/TUMOR_BOARD_API.md`. De lijst met boards ligt vast in het product.

### Venster biopsie–resectie {#screen-biopsy_resection_correlation}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Venster biopsie–resectie

**Status:** Gedeeltelijk

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Correlatie biopsie-resectie (titel op het scherm: Venster voor correlatie biopsie–resectie)

**3. Doel en bereik.** Hoe lang na een chirurgische biopsie een latere resectie van dezelfde patiënt als correlatiekandidaat wordt gezocht, en vanaf welke datum dat venster begint. Een resectie komt overeen wanneer zij binnen het venster is afgenomen of ontvangen. Stel het in voor de onderneming, voor elke jurisdictie en voor elke faciliteit; de meest specifieke instelling wint. Het scherm is hetzelfde besturingselement als [Cytologie-histologiecorrelatie](#screen-cytology_histology_correlation), op de chirurgische instellingen.

**4. Vereisten en afhankelijkheden.** Overschrijvingen per faciliteit gebruiken het [Faciliteitswoordenboek](#screen-facility-dictionary).

Setup step: Tier 3, step 16
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: [Opvolging](#screen-follow_up_tracking)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-biopsy_resection_correlation - Venster voor correlatie biopsie–resectie met standaard voor de organisatie, regels per jurisdictie en afwijkingen per faciliteit]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Standaard voor de organisatie: Venster (dagen) | Geheel getal 1 tot en met 1825 | Verplicht | Foutmelding "Voer een geheel aantal dagen in tussen 1 en 1825." | 180 |
| Standaard voor de organisatie: Begint vanaf | Keuze: Afnamedatum, Datum van ontvangst in het lab, (autorisatie) | Verplicht | De datum waarvan het venster begint. De keuze voor autorisatie heet op het scherm "Aftekening van de cytologie", ook hier. | Afnamedatum |
| Opslaan | Knop | Niet van toepassing | | Niet van toepassing |
| Per rechtsgebied: + Regel voor rechtsgebied toevoegen | Keuzelijst met jurisdicties zonder regel, Venster (dagen), Begint vanaf; Opslaan, Annuleren, Verwijderen | Optioneel | Een regel per jurisdictie. De lijst toont "N dagen vanaf: (aanknopingspunt)". | Geen |
| Afwijkingen per instelling: + Afwijking voor instelling toevoegen | Keuzelijst met faciliteiten, Venster (dagen), Begint vanaf; Opslaan, Annuleren, Verwijderen | Optioneel | "Kies een instelling." is de foutmelding wanneer er geen is gekozen. | Geen |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:biopsy-resection-correlation:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Gedeeltelijk: de service is een mock in de browseropslag, geëxporteerd uit `services/index.ts`; er is geen serverversie. Het cytologievenster heeft er wel een (Gerealiseerd). Het label "Aftekening van de cytologie" op het biopsiescherm wordt vermeld in `open-questions/ch4.md`.

### Cytologie-histologiecorrelatie {#screen-cytology_histology_correlation}
Breadcrumb: Start > Configuratie > Cytologie > Correlatievenster

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Cytologie** > **Correlatievenster**
**2. Beheeronderdeel:** Correlatievenster (titel op het scherm: Venster voor cyto-histologische correlatie)

**3. Doel en bereik.** Hoe lang na een afwijkende uitslag van cervixcytologie een latere biopsie als correlatiekandidaat wordt gezocht, en vanaf welke datum het venster begint. De klinische klok begint wanneer de cellen worden afgenomen, dus de afname is de standaard. Een biopsie komt overeen wanneer zij binnen het venster is afgenomen of ontvangen. Stel het in voor de onderneming, voor elke jurisdictie en voor elke faciliteit; de meest specifieke wint. Het chirurgische equivalent is [Venster biopsie–resectie](#screen-biopsy_resection_correlation).

**4. Vereisten en afhankelijkheden.** Overschrijvingen per faciliteit gebruiken het [Faciliteitswoordenboek](#screen-facility-dictionary).

Setup step: Tier 3, step 17
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: [Opvolging](#screen-follow_up_tracking)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_histology_correlation - Venster voor cyto-histologische correlatie met regels per jurisdictie en faciliteit]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Standaard voor de organisatie: Venster (dagen) | Geheel getal 1 tot en met 1825 | Verplicht | Foutmelding "Voer een geheel aantal dagen in tussen 1 en 1825." | 180 |
| Standaard voor de organisatie: Begint vanaf | Keuze: Afnamedatum, Datum van ontvangst in het lab, Aftekening van de cytologie | Verplicht | Foutmelding "Kies de datum waarop het venster begint." | Afnamedatum |
| Opslaan | Knop | Niet van toepassing | | Niet van toepassing |
| Per rechtsgebied: + Regel voor rechtsgebied toevoegen | Keuzelijst met jurisdicties (alleen die zonder regel), Venster (dagen), Begint vanaf; Opslaan, Annuleren, Verwijderen | Optioneel | De lijst toont "N dagen vanaf: (aanknopingspunt)". Zonder regels: "Geen regels per rechtsgebied. Alle rechtsgebieden gebruiken de standaard van de organisatie." | Geen |
| Afwijkingen per instelling: + Afwijking voor instelling toevoegen | Keuzelijst met faciliteiten, Venster (dagen), Begint vanaf; Opslaan, Annuleren, Verwijderen | Optioneel | Foutmelding "Kies een instelling." | Geen |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:cytology-histology-correlation:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Contract: `docs/architecture/CYTOLOGY_API.md` (`ICytologyHistologyCorrelationSettingsService`).

### Opvolging {#screen-follow_up_tracking}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Opvolging

**Status:** Gedeeltelijk

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Opvolging

**3. Doel en bereik.** Bepaalt wanneer het laboratorium wordt gewaarschuwd voor een verwacht vervolgmonster dat niet is aangekomen, en of medewerkers de aanvragende clinicus daarover per e-mail mogen benaderen. De vervolgvensters zelf stelt u in op [Cytologie-histologiecorrelatie](#screen-cytology_histology_correlation) en [Venster biopsie–resectie](#screen-biopsy_resection_correlation). Een e-mail aan een clinicus wordt nooit automatisch verzonden: een gebruiker controleert elke e-mail en drukt op Verzenden.

**4. Vereisten en afhankelijkheden.** Overschrijvingen per faciliteit gebruiken het [Faciliteitswoordenboek](#screen-facility-dictionary). Zonder de correlatievensters is er niets om voor te waarschuwen.

Setup step: Tier 3, step 18
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary), [Venster biopsie–resectie](#screen-biopsy_resection_correlation), [Cytologie-histologiecorrelatie](#screen-cytology_histology_correlation)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-follow_up_tracking - Opvolging met de kaart voor de organisatie en afwijkingen per faciliteit]

**6. Veldoverzicht.** De kaart voor de organisatie en elke overschrijving per faciliteit gebruiken dezelfde vier velden.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoveel dagen vóór de vervaldatum waarschuwen | Geheel getal 0 tot en met 365 | Verplicht | 0 waarschuwt pas als het achterstallig is. Foutmelding "Voer een geheel aantal dagen in van 0 tot 365." | 30 |
| Medewerkers toestaan de aanvragende arts te mailen | Selectievakje | Optioneel | Voegt de actie "Aanvragende arts mailen" toe. | Uit |
| Onderwerp van de e-mail (leeg = standaardtekst) | Tekst tot 200 tekens | Optioneel | Standaardtekst: "Vervolgmateriaal gevraagd: {{accession}}". | Leeg |
| E-mailbericht (leeg = standaardtekst) | Tekst tot 4.000 tekens | Optioneel | Alleen deze tijdelijke aanduidingen worden ingevuld: accession, windowStart, dueDate, clinicianName, labName, senderName. Er is bewust geen tijdelijke aanduiding voor de naam of diagnose van de patiënt. Een onbekende tijdelijke aanduiding wordt geweigerd. | Leeg |
| Opslaan | Knop | Niet van toepassing | Uitgeschakeld zolang een waarde ongeldig is. | Niet van toepassing |
| Uitzonderingen per instelling: Faciliteit, Uitzondering toevoegen, Verwijderen | Keuzelijst en knoppen | Optioneel | Een overschrijving per faciliteit staat in de lijst als "N dagen vooraf waarschuwen · e-mail aan arts aan/uit". Elke faciliteit zonder overschrijving gebruikt de kaart voor de organisatie. | Geen |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:follow-up-tracking:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Gedeeltelijk: de instellingen worden opgeslagen door een service in de browseropslag (`followUpSettings.ts`); de serverservice voor opvolging geeft instellingen terug bij zijn lijst maar heeft er geen schrijfactie voor. De wachtrij voor opvolging staat in `docs/architecture/` onder de kwaliteits-API.
### Kritieke intraoperatieve uitslagen {#screen-intraop_critical_results}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Kritieke intraoperatieve uitslagen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Beheeronderdeel:** Kritieke intraoperatieve uitslagen (titel op het scherm: Kritieke intraoperatieve uitslagen)

**3. Doel en bereik.** Een woordenboek van vriescoupe-uitslagen die de opererende chirurg rechtstreeks moeten bereiken. Een monster komt overeen met een item via zijn voorlopige categorie of via een term in de vriescoupediagnose (ontkennende formuleringen worden genegeerd). Een overeenkomst markeert de mondelinge melding als kritieke uitslag, die de patholoog bevestigt of opheft. Items worden nooit verwijderd; ze worden gedeactiveerd.

**4. Vereisten en afhankelijkheden.** Geen. De categorieën zijn de vier voorlopige categorieën van de werklijst Peroperatief.

Setup step: Tier 3, step 19
Requires: Geen.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-intraop_critical_results - Woordenboek van kritieke intraoperatieve uitslagen]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Itemlijst | Naam, omschrijving, "Categorieën: ... Termen: ...", label Inactief | Niet van toepassing | Vier standaarditems: Maligniteit op vriescoupe (categorie Maligne); Positieve of krappe marge (termen); Atypisch of verdacht voor maligniteit (categorie Atypisch / verdacht); Positieve lymfeklier (termen). | Niet van toepassing |
| **Inactieve items tonen** | Schakelaar | Optioneel | | Uit |
| **+ Item toevoegen**, **Bewerken**, **Deactiveren** / **Heractiveren** | Knoppen | Niet van toepassing | Het venster staat hieronder. Zonder de machtiging toont het scherm "U kunt dit woordenboek bekijken maar niet wijzigen." | Niet van toepassing |

#### Venster Kritieke uitslag toevoegen en Kritieke uitslag bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam | Tekst | Verplicht | Melding "Geef een naam en minstens één term of categorie." totdat er een naam en een overeenkomst zijn. | Leeg |
| Omschrijving | Tekst | Optioneel | | Leeg |
| Termen | Tekst, één per regel of gescheiden door komma's | Verplicht als er geen categorie is | Gezocht als hele woorden, hoofdletterongevoelig. | Leeg |
| Overeenkomende voorlopige categorieën | Selectievakjes: Benigne, Maligne, Atypisch / verdacht, Uitgesteld | Verplicht als er geen term is | | Geen aangevinkt |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:intraop-critical-results:manage` (hoog risico, wordt geaudit; alleen Beheerder, de Laboratoriumdirecteur heeft deze standaard niet; wordt gecontroleerd in de service).
**Bekende beperkingen.** Contract: `docs/architecture/INTRAOP_CRITICAL_RESULTS_API.md`. Dit scherm staat niet in de tabel van sectie naar machtiging (`configSectionAccess.ts`), dus het vertrouwt alleen op de controle in de service; het scherm opent alleen-lezen voor iemand zonder de machtiging.

### OK-suite-terminals {#screen-or_suite_terminals}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > OK-suite-terminals

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Beheeronderdeel:** OK-suite-terminals

**3. Doel en bereik.** Registreert het wand- of bureaudisplay in elk operatiekamercomplex dat het Intraoperatieve dashboard toont. Elke terminal is gebonden aan één bestaande locatie, zodat twee faciliteiten elk een "OK 1" kunnen hebben zonder naamconflict. Een terminal kan worden aangemerkt als geschikt voor het Overzicht meerdere OK's (voor een leidinggevende verpleegkundige, laboratoriumcontactpersoon of rondgaande omloop). De toegang verloopt via een weergavetoken (zie hieronder), niet via de aanmelding van een persoon.

**4. Vereisten en afhankelijkheden.** Faciliteiten en hun locaties (de lijst met ruimten) komen uit het [Faciliteitswoordenboek](#screen-facility-dictionary) (de Locaties in het bewerkvenster van de faciliteit). De keuzelijst Locatie blijft leeg totdat een faciliteit is gekozen.

Setup step: Tier 3, step 20
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-or_suite_terminals - Lijst met OK-suite-terminals]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Terminallijst | Naam, locatie, "Meerdere OK's toegestaan", label Inactief | Niet van toepassing | | Niet van toepassing |
| **+ Terminal toevoegen**, **Bewerken**, **Deactiveren** / **Reactiveren**, **Inactief tonen** | Knoppen en schakelaar | Niet van toepassing | | Inactief tonen uit |
| **Weergavetoken** | Knop per terminal | Niet van toepassing | Opent het venster hieronder. | Niet van toepassing |

#### Venster OK-terminal toevoegen en OK-terminal bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Terminal-/stationsidentiteit | Tekst (voorbeeld OR-Suite-04) | Verplicht | | Leeg |
| Faciliteit | Keuzelijst | Verplicht | Door te kiezen worden de locaties van die faciliteit geladen. | Geen |
| Locatie (OK) | Keuzelijst met de locaties van de faciliteit | Verplicht | De terminal is gebonden aan deze locatie. | Geen |
| Kan meerdere-OK-overzicht bekijken (leidinggevende verpleegkundige, laboratoriumcontactpersoon, rondgaande omloop) | Selectievakje | Optioneel | | Uit |

#### Venster Weergavetoken (gedeeld met Weergaveprofielen)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Status van het token | Tekst | Niet van toepassing | "Geen token uitgegeven. Dit scherm kan niet starten.", "Token eindigend op (hint) is geldig tot (datum)", "Token verlopen op (datum)" of "Token ingetrokken op (datum)". | Niet van toepassing |
| Geldig voor | Keuze: 30, 90, 180, 365, 730 dagen | Verplicht | Geldigheidsduur van een nieuw token. | 365 dagen |
| **Token uitgeven** / **Nieuw token uitgeven** | Knop | Niet van toepassing | Toont het nieuwe token eenmalig ("Nieuw token - kopieer het nu"; het wordt niet opnieuw getoond). Alleen een vingerafdruk wordt bewaard. Een nieuw token uitgeven stopt het oude direct. | Niet van toepassing |
| **Intrekken** | Knop | Niet van toepassing | Maakt het display binnen een minuut leeg. Uitgeschakeld als het token al is ingetrokken. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Toevoegen, bewerken, deactiveren: `config:or-suite-terminals:manage`. Een token uitgeven of intrekken: dezelfde machtiging (hoog risico; Beheerder en Laboratoriumdirecteur). 
**Bekende beperkingen.** Contract: `docs/architecture/DISPLAY_ACCESS_API.md` (tokenaanroepen). Het Intraoperatieve dashboard dat de terminal toont, is een scherm van de werkomgeving en valt buiten de lijst van dit hoofdstuk.

### Weergaveprofielen (Facility Ops-dashboards) {#screen-display_profiles}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Weergaveprofielen (Facility Ops-dashboards)

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Beheeronderdeel:** Weergaveprofielen (Facility Ops-dashboards) (titel op het scherm: Weergaveprofielen (facilitaire operatiedashboards))

**3. Doel en bereik.** Een register van de wanddisplays die het Facility Ops-dashboard tonen. Elk profiel koppelt een display aan één uitvoerend laboratorium en aan één of meer van vijf afdelingsweergaven, en kan met een timer tussen de weergaven wisselen. De knop **Facilitair operatiedashboard openen** opent de dashboardpagina. Er wordt geen fysieke hardwarekoppeling gecontroleerd of afgedwongen: het apparaatveld is een notitie. De toegang tot een display wordt geregeld door het Weergavetoken (zie het venster onder [OK-suite-terminals](#screen-or_suite_terminals)).

**4. Vereisten en afhankelijkheden.** De uitvoerende laboratoria komen uit het [Faciliteitswoordenboek](#screen-facility-dictionary).

Setup step: Tier 3, step 21
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-display_profiles - Lijst met weergaveprofielen en de knop Facilitair operatiedashboard openen]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Profiellijst | Naam, lab, weergaven, interval | Niet van toepassing | | Niet van toepassing |
| **Facilitair operatiedashboard openen** | Knop | Niet van toepassing | Opent `/facility-ops-dashboard`. | Niet van toepassing |
| **+ Weergaveprofiel toevoegen**, **Bewerken**, **Deactiveren** / **Heractiveren**, **Toon inactieve** | Knoppen en schakelaar | Niet van toepassing | | Toon inactieve uit |
| **Weergavetoken** | Knop per profiel | Niet van toepassing | Het tokenvenster dat bij OK-suite-terminals is beschreven. | Niet van toepassing |

#### Venster Weergaveprofiel toevoegen en Weergaveprofiel bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Weergavenaam | Tekst (voorbeeld "Histologiebank 3 - Wanddisplay") | Verplicht | | Leeg |
| Uitvoerend laboratorium | Keuzelijst met actieve uitvoerende laboratoria | Verplicht | | Geen |
| Toegewezen dashboardweergave(n) | Selectievakjes: Uitsnijden & ontvangst; Inbedden & microtomie; Kleuring & IHC; Doorsturen & referentielaboratorium; Diagnostische ondertekening / scanner | Verplicht (minstens één) | Bij meer dan één weergave wisselt het profiel tussen de weergaven. | Geen aangevinkt |
| Carrouselinterval (seconden) | Geheel getal (voorbeeld 20) | Optioneel | Tijd per weergave als er meer dan één is toegewezen. | Leeg |
| Apparaattoken / MAC / IP (optioneel) | Tekst | Optioneel | Alleen een inventarisnotitie; de toegang wordt geregeld door het Weergavetoken. | Leeg |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Toevoegen, bewerken, deactiveren, een token uitgeven of intrekken: `config:display-profiles:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Contract: `docs/architecture/INTRAOP_OPS_API.md` en `DISPLAY_ACCESS_API.md`. Het register bevat alleen gegevens: PathScribe controleert niet of een fysiek display bij een profiel hoort.

### KA-configuratiecentrum {#screen-qa_config_center}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > KA-configuratiecentrum

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** KA-configuratiecentrum

**3. Doel en bereik.** Legt de kwaliteitsborgingsactiviteiten vast die een lab uitvoert. Een activiteit is gebouwd op een van twee archetypen: **Beoordeling-met-uitkomst** (een casus wordt beoordeeld en gewaardeerd, bijvoorbeeld de correlatie tussen vriescoupe en definitieve diagnose) of **Toezicht / Toewijzing** (een zorgverlener staat onder toezicht gedurende een aantal casus of een periode, bijvoorbeeld FPPE). **Standaard**activiteiten worden door PathScribe samengesteld voor de jurisdictie van het lab; ze kunnen niet worden uitgeschakeld of tot aangepaste activiteiten worden gemaakt, en alleen hun steekproef, CAPA-trigger en vergelijkbare instellingen kunnen worden geconfigureerd. **Aangepaste** activiteiten zijn van het lab zelf; de snellere weg is een standaard of aangepaste activiteit dupliceren, omdat de beoordelingsvelden dan kant-en-klaar zijn. Niets opent automatisch een CAPA: een trigger beveelt er alleen een aan bij de kwaliteitsverantwoordelijke, die deze bevestigt of afwijst.

Standaard beoordelingsactiviteiten zijn onder meer: Correlatie vriescoupe en definitieve diagnose, Cytologie-histologiecorrelatie, Bevestiging van afwijkende/kritieke bevinding, Secundaire screening van GYN-cytologie, Collegiale toetsing van chirurgische casus na ondertekening, Correlatie van chirurgische biopsie met resectie, Collegiale toetsing vóór ondertekening, Klinisch-pathologische correlatie en Correlatie van extern consult. De lijst die verschijnt, hangt af van de jurisdictie.

**4. Vereisten en afhankelijkheden.** De CAPA-trigger noemt een tekortkomingstype uit [Specimentekortkomingen](#screen-deficiencies). De verwachte casusmix gebruikt [Subspecialismen](#screen-subspecialties).

Setup step: Tier 3, step 22
Requires: [Specimentekortkomingen](#screen-deficiencies), [Subspecialismen](#screen-subspecialties)
Unlocks: [TAT-configuratie (tabblad)](#screen-tab-tat), [Beleid voor discrepantietrends](#screen-qa_trend_policy)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-qa_config_center - KA-configuratiecentrum met de tabbladen Standaard en Aangepast]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Tabbladen Standaard, Aangepast | Tabbladen | Niet van toepassing | Standaard toont alleen de activiteiten die voor de jurisdictie gelden ("Geen standaardactiviteiten van toepassing op (jurisdictie)" anders). | Standaard |
| Activiteitenlijst | Naam, Archetype, Jurisdicties ("Alle" of een lijst), Steekproef %, CAPA-trigger, Status, Acties | Niet van toepassing | CAPA-trigger luidt "(ernstniveaus) → (tekortkoming)" met "(alleen na vrijgave)". | Niet van toepassing |
| **Configureren** (standaard), **Bewerken** (aangepast), **Dupliceren**, **Deactiveren** / **Reactiveren** | Rijknoppen | Niet van toepassing | Deactiveren wordt voor een standaardactiviteit geweigerd. | Niet van toepassing |
| **+ Aangepaste activiteit toevoegen** | Knop, daarna een keuzescherm | Niet van toepassing | Kies **Nieuwe beoordeling-met-uitkomst-activiteit** of **Nieuwe toezicht/toewijzing-activiteit**, of Annuleren. Het keuzescherm raadt aan om in plaats daarvan te dupliceren. | Niet van toepassing |

#### Venster Configureren, Bewerken en Dupliceren

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam | Tekst | Verplicht | Alleen-lezen bij een standaardactiviteit. Een duplicaat begint als "(naam) (Kopie)". | Leeg |
| Beschrijving | Tekst | Optioneel | Alleen-lezen bij een standaardactiviteit. | Leeg |
| Beoordelingsvelden | Veldeditor (beoordelingsarchetype) | Verplicht (minstens één veld) | Alleen-lezen bij een standaardactiviteit en bij een duplicaat ("van dupliceren - hier alleen-lezen"). Elk veld heeft een label, een type (Korte tekst, Lange tekst, Getal, Enkele keuze, Meerkeuze, Keuzelijst), een tip, Verplicht, en opties voor een keuzetype; velden kunnen omhoog en omlaag worden verplaatst. Een opgeslagen veld kan worden hernoemd of optioneel gemaakt, maar niet worden verwijderd of van type veranderen, en een opgeslagen optie kan niet worden verwijderd: eerdere beoordelingen behouden hun antwoorden. Nieuwe velden kunnen altijd worden toegevoegd. | Eén veld Notities |
| Feedback over onderwijs en onboarding vastleggen | Selectievakje (beoordelingsarchetype) | Optioneel | Uitgeschakeld bij een standaardactiviteit. | Uit |
| Steekproefpercentage | Getal 0 tot 100 (beoordelingsarchetype) | Optioneel | Aandeel van de in aanmerking komende casus dat willekeurig wordt geselecteerd. Leeg betekent geen automatische steekproef. | Leeg |
| CAPA-trigger: een CAPA aanbevelen wanneer | Selectievakjes: laag, gemiddeld, hoog (ernst van de discrepantie) | Optioneel | De ernst van de discrepantie wordt altijd vastgelegd; dit bepaalt alleen of een CAPA wordt aanbevolen. | Geen |
| CAPA-trigger: tekortkomingstype | Keuzelijst uit Specimentekortkomingen, of "Geen tekortkomingstype geselecteerd" | Optioneel | De tekortkoming die de aanbeveling noemt. | Geen |
| Alleen voor beoordelingen na vrijgave van het verslag | Selectievakje | Optioneel | | Uit |
| Verwachte zakenmix (optioneel) | Minimumaantallen per subspecialisme (toezichtarchetype) | Optioneel | "+ Subspecialismedoel toevoegen…" voegt een rij toe met **Minimumaantal** en **Verwijderen**. Leeg toont alleen de werkelijke dekking, zonder verwachting. | Leeg |
| Status | Schakelaar Actief / Inactief | Optioneel | | Actief |
| **Toevoegen** / **Duplicaat maken** / **Wijzigingen opslaan**, **Annuleren** | Knoppen | Niet van toepassing | | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:qa-types:manage` (hoog risico; Beheerder en Laboratoriumdirecteur; de vergrendeling van standaardactiviteiten wordt ook in de service afgedwongen).
**Bekende beperkingen.** Contract: `docs/architecture/QUALITY_API.md`.

### Beleid voor discrepantietrends {#screen-qa_trend_policy}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Beleid voor discrepantietrends

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Beleid voor discrepantietrends (titel op het scherm: Beleid voor discrepantietrends)

**3. Doel en bereik.** Bepaalt wanneer herhaalde grote discrepanties aan de Laboratoriumdirecteur worden gemeld, voor het beoordeelde werk van een patholoog of voor een preparaattype ongeacht wie het las. Een patroon is een aanbeveling: het opent nooit een CAPA. Het beleid van de organisatie geldt voor elk uitvoerend laboratorium dat geen eigen beleid heeft; beoordelingen worden getoetst aan het beleid van het laboratorium dat de casus uitvoerde.

**4. Vereisten en afhankelijkheden.** De beoordelingen komen uit de KA-activiteiten in het [KA-configuratiecentrum](#screen-qa_config_center). Het beleid per lab gebruikt de uitvoerende laboratoria in het [Faciliteitswoordenboek](#screen-facility-dictionary).

Setup step: Tier 3, step 23
Requires: [KA-configuratiecentrum](#screen-qa_config_center), [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-qa_trend_policy - Beleid voor discrepantietrends met het beleid van de organisatie en het beleid per uitvoerend laboratorium]

**6. Veldoverzicht.** Dezelfde velden staan in het blok van de organisatie en bij elk uitvoerend laboratorium waarvoor "(lab) heeft een eigen beleid" is aangevinkt.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Het beoordeelde werk van elke patholoog volgen | Selectievakje | Optioneel | | Aan |
| Elk preparaattype volgen (processignaal) | Selectievakje | Optioneel | | Aan |
| Periode (maanden) | Geheel getal 1 tot 36 | Verplicht | Hoe ver terug beoordelingen worden geteld. | 3 |
| Minimum aantal beoordelingen in de periode | Geheel getal, minstens 1 | Verplicht | Daaronder wordt niets getoetst; dit beschermt medewerkers met een laag volume en in deeltijd. | 20 |
| Ernstniveaus die als groot tellen | Selectievakjes: laag, gemiddeld, hoog | Verplicht (minstens één) | Het ernstniveau van de beoordelaar bij een afwijkende beoordeling. | hoog |
| Grote discrepanties die een melding geven | Geheel getal | Verplicht | 0 schakelt dit criterium uit. | 3 |
| Percentage grote discrepanties dat een melding geeft (%) | Getal 0 tot 100 | Verplicht | Van de beoordelingen in de periode. 0 schakelt dit criterium uit. Met beide criteria op 0 wordt het beleid geweigerd ("Stel een aantal of een percentage in"). | 10 |
| Wanneer een drempel wordt overschreden | Keuze: De laboratoriumdirecteur om een beslissing vragen, Alleen op de trendlijst vermelden | Verplicht | Geen van beide keuzes opent een CAPA. | De laboratoriumdirecteur om een beslissing vragen |
| (Lab) heeft een eigen beleid | Selectievakje per uitvoerend laboratorium | Optioneel | Door het aan te vinken verschijnen dezelfde velden voor dat lab. | Uit |
| **Beleid opslaan** | Knop | Niet van toepassing | Toont "Opgeslagen" of de reden waarom het niet is opgeslagen. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:qa-trend-policy:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Contract: `docs/architecture/QUALITY_SETTINGS_API.md`.

### TAT-configuratie (tabblad) {#screen-tab-tat}
Breadcrumb: Start > Configuratie > TAT-configuratie

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **TAT-configuratie** (opent voor mensen die `config:tat-targets:manage` hebben; het tabblad is omgeven door een sectiepoort).
**2. Beheeronderdeel:** TAT-configuratie (titel op het scherm: TAT-configuratie)

**3. Doel en bereik.** Stelt de doelen voor de doorlooptijd in per type, urgentie, faciliteit, monster en subspecialisme. De meest specifieke overeenkomende regel wint wanneer een casus wordt gemeten. Een casus valt terug op een ingebouwde systeemstandaard wanneer geen aangepaste regel past. De doelen bepalen de markeringen op tijd en te laat in Zoeken, de kwaliteitsdashboards en het Peroperatieve bord (waarschuwingstijd voor de vriescoupe).

**Volgorde van oplossing (meest specifiek eerst):** Faciliteit + Monster + Urgentie; Faciliteit + Monster; Faciliteit + Subspecialisme + Urgentie; Faciliteit + Subspecialisme; alleen Faciliteit; alleen Monster; Systeemstandaard (terugval). Een **Oplossingssimulator** toont welke regel wint voor een bepaalde casus.

**4. Vereisten en afhankelijkheden.** De keuzelijsten voor het bereik komen uit het [Faciliteitswoordenboek](#screen-facility-dictionary), het [Specimenwoordenboek](#screen-specimens) en [Subspecialismen](#screen-subspecialties). KA-activiteiten verschijnen als extra TAT-typen zodra ze bestaan in het [KA-configuratiecentrum](#screen-qa_config_center).

Setup step: Tier 3, step 24
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary), [Specimenwoordenboek](#screen-specimens), [Subspecialismen](#screen-subspecialties), [KA-configuratiecentrum](#screen-qa_config_center)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: tab-tat - Lijst met TAT-configuratie met filters, hiërarchie en simulator]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Regellijst | Tabel: Type, Doel, Urgentie, Bereik, Notities, Status, Acties | Niet van toepassing | Regels gegroepeerd als "Onderneming (n)" en per uitvoerend lab. Een rij toont het doel, de urgentie (STAT, Routine, Alle), het bereik, "waarschuwing bij N min" voor de vriescoupe en "Rol: ..." voor consulttypen. | Niet van toepassing |
| Typefilter | Keuzelijst: Alle typen, elk TAT-type, elke KA-activiteit | Optioneel | | Alle typen |
| Filteren op uitvoerend lab, Filteren op aanvragende instelling | Keuzelijsten | Optioneel | | Alle |
| **Inactieve tonen** | Schakelaar | Optioneel | | Uit |
| **+ Regel toevoegen**, **Bewerken**, **Dupliceren**, **Verwijderen** | Knoppen | Niet van toepassing | **Verwijderen** wordt voor een systeemstandaard geweigerd; schakel die in plaats daarvan uit. **Dupliceren** begint een nieuwe regel vanuit een bestaande. | Niet van toepassing |
| Simulator | Knop en paneel | Niet van toepassing | Zie de simulatortabel hieronder. | Niet van toepassing |

#### Venster TAT-regel toevoegen en TAT-regel bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| TAT-type | Keuzelijst in twee groepen. Klinische workflow: Eerste aanraking, Totale zaak, Vriescoupe, Koude ischemie, Macroscopie, Ondertekening, Consult - Mijn reactie, Consult - Wachten op reactie, Autopsie-PAD, Autopsie-FAD. KA-activiteiten: elke activiteit uit het KA-configuratiecentrum | Verplicht | Foutmelding "TAT-type is verplicht". | Eerste aanraking |
| Doeluren | Getal, stap 0,25, minstens 0,1 | Verplicht | Foutmelding "Doeluren moeten groter zijn dan 0". Toont "= (opgemaakt)". | Geen |
| Waarschuwen als er nog zoveel minuten resten | Geheel aantal minuten | Optioneel | Alleen Vriescoupe. Het Peroperatieve bord wordt op dit punt oranje. Moet boven 0 en onder het doel liggen. | 5 |
| Urgentie | Keuze: Alle (Routine + STAT), Alleen routine, Alleen STAT | Optioneel | | Alle |
| Van toepassing op: Uitvoerend lab | Keuzelijst of "Alle uitvoerende labs" | Optioneel | | Alle |
| Van toepassing op: Aanvragende instelling | Keuzelijst of "Alle aanvragende instellingen" | Optioneel | | Alle |
| Van toepassing op: Specimentype | Keuzelijst of "Alle specimentypen" | Optioneel | | Alle |
| Van toepassing op: Subspecialisme | Keuzelijst of "Alle subspecialismen" | Optioneel | | Alle |
| Van toepassing op: Rol | Keuze: Alle rollen, Assistent in opleiding, Fellow, Patholoog, Externe beoordelaar | Optioneel | Gebruikt door de consulttypen. | Alle |
| Beheerdersnotities | Tekst | Optioneel | Geen invloed op de overeenkomst. | Leeg |
| Status | Actief / Inactief | Optioneel | Een actieve regel met dezelfde combinatie van type en urgentie wordt geweigerd ("Er bestaat al een actieve regel voor deze combinatie"). | Actief |
| **Regel toevoegen** / **Wijzigingen opslaan**, **Annuleren** | Knoppen | Niet van toepassing | Een live regel zegt waarop de regel van toepassing is, of "Dit is een systeemstandaard - geldt voor alle zaken". | Niet van toepassing |

#### Oplossingssimulator

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Uitvoerend lab, Aanvragende instelling, Specimen, Subspecialisme | Keuzelijsten ("Geen specifiek ...") | Optioneel | De casus die u test. | Geen |
| Urgentie | Keuze | Optioneel | | Routine |
| Resultaat per type | Badge voor elk type, de winnende regel, "systeemstandaard" of "aangepaste regel", of "Geen overeenkomende regel" | Niet van toepassing | | Niet van toepassing |

De ingebouwde standaarden (id's die met `sys-` beginnen, in uren): Eerste aanraking 4 routine, 1 STAT; Totale zaak 24 routine, 4 STAT; Vriescoupe 0,5 routine, 0,33 STAT; Koude ischemie 1; Macroscopie 4 routine, 2 STAT; Ondertekening 4 routine, 2 STAT; Consultreactie en Wachten op reactie 24 (Assistent in opleiding), 48 (Patholoog), 120 (Extern). Ze kunnen worden bewerkt en uitgeschakeld, maar nooit worden verwijderd. Als u er een uitschakelt, verdwijnt die uit de volgorde van oplossing; zorg er dus voor dat een aangepaste regel het gat opvult.

**7. Machtigingen.** Het tabblad openen: `config:tat-targets:manage` via de sectiepoort (hoog risico; Beheerder en Laboratoriumdirecteur). 
**Bekende beperkingen.** Contract: `docs/architecture/TAT_AND_DELEGATION_API.md`. De ingebouwde lijst wordt ook door de API-server als standaardwaarden aangemaakt.
### Prestatiedoelen {#screen-performance_targets}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Prestatiedoelen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Prestatiedoelen (titel op het scherm: Prestatiedoelen)

**3. Doel en bereik.** De getallen waaraan elke patholoog wordt gemeten. Een wijziging wordt direct opgeslagen. Het productiviteitsdashboard meet casus en RVU's aan deze doelen; alleen de maandelijkse doelen voor casus en RVU's staan daar, de andere worden bewaard voor rapporten.

**4. Vereisten en afhankelijkheden.** Geen.

Setup step: Tier 3, step 25
Requires: Geen.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-performance_targets - Tabel met prestatiedoelen en toevoegformulier]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Doel (naam) | Tekst | Verplicht bij toevoegen | Foutmelding "Geef het doel een naam." Ingebouwde rijen hebben het label "Ingebouwd". | Niet van toepassing |
| Waarde | Getal, groter dan nul | Verplicht | Foutmelding "Voer een waarde groter dan nul in." Een percentage boven 100 wordt geweigerd. | Zie hieronder |
| Eenheid | Keuze: Casussen, RVU's, Procent, Uren | Verplicht | | Zie hieronder |
| Periode | Keuze: Dagelijks, Wekelijks, Maandelijks, Driemaandelijks, Jaarlijks | Verplicht | | Zie hieronder |
| **Verwijderen** | Knop per rij | Niet van toepassing | Ingebouwde doelen kunnen niet worden verwijderd. | Niet van toepassing |
| Een doel toevoegen: Naam van het doel, Waarde, eenheid, periode, **Doel toevoegen** | Formulier | Verplicht | Foutmelding "Er bestaat al een doel met die naam." | Leeg |

De vijf beginrijen: Casussen per maand 120 casussen maandelijks (ingebouwd); Routine-TAT 48 uur maandelijks (ingebouwd); STAT-TAT 4 uur maandelijks (ingebouwd); QC-ondertekeningspercentage 98 procent driemaandelijks (ingebouwd); Maandelijkse RVU's 350 RVU's maandelijks (niet ingebouwd).

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:tat-targets:manage` (dezelfde machtiging als het tabblad TAT; hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Contract: `docs/architecture/CONFIG_DICTIONARIES_API.md`. De rijen "Routine-TAT" en "STAT-TAT" hier staan los van de doorlooptijdregels per casus op het tabblad [TAT-configuratie (tabblad)](#screen-tab-tat); het product koppelt ze niet.

### Cytologie-KC-regels {#screen-cytology_qc_rules}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Cytologie-KC-regels

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Beheeronderdeel:** Cytologie-KC-regels (titel op het scherm: Cytologie QC-toewijzingsregels)

**3. Doel en bereik.** De geautomatiseerde regels die cytologische casus selecteren, toewijzen en doorsturen voor collegiale toetsing in het kader van kwaliteitscontrole. Een regel zegt welke casus hij omvat (criteria), hoeveel ervan worden geselecteerd (bemonsteringslogica), hoe dringend de beoordeling is (prioriteitsniveau en SLA) en wie mag beoordelen. Regels worden geëvalueerd van de hoogste evaluatieprioriteit naar beneden. Regels kunnen niet worden verwijderd; ze worden gedeactiveerd. Het resulterende werk staat in de [Cytologie-KC-wachtrij](#screen-cytology-qc-queue).

De demonstratiegegevens bevatten benoemde regels voor de VS (CLIA-gerichte herscreening van hoogrisico-Pap, 100 procent), het VK (NHS / RCPath snelle herscreening, 20 procent), de EU (ISO 15189 collegiale toetsing door een patholoog, 2 procent) en een willekeurige herscreening van negatieve ondertekeningen door een cytotechnoloog (10 procent).

**4. Vereisten en afhankelijkheden.** Er wordt niets afgedwongen. Het criterium uitvoerende faciliteit wordt getypt als een lijst van faciliteits-id's (het is geen keuzelijst), dus neem de id's uit het [Faciliteitswoordenboek](#screen-facility-dictionary). De percentages voor willekeurige selectie op [Steekproefpercentages cytologie-KC](#screen-cytology_qc_settings) staan los van deze regels.

Setup step: Tier 3, step 26
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary)
Unlocks: [Cytologie-KC-wachtrij](#screen-cytology-qc-queue)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-cytology_qc_rules - Lijst met Cytologie QC-toewijzingsregels]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Regellijst | Naam, "Prioriteit N", prioriteitsniveau, label Inactief | Niet van toepassing | | Niet van toepassing |
| **+ Regel toevoegen**, **Bewerken**, **Dupliceren**, **Deactiveren** / **Reactiveren**, **Inactieve tonen** | Knoppen en schakelaar | Niet van toepassing | **Dupliceren** noemt de kopie "(naam) (Kopie)". | Inactieve tonen uit |

#### Venster QC-regel toevoegen en QC-regel bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Regelnaam | Tekst | Verplicht | | Leeg |
| Beschrijving | Tekst | Optioneel | | Leeg |
| Evaluatieprioriteit (hogere wordt eerst geëvalueerd) | Geheel getal | Verplicht | | 50 |
| SLA (uren) | Getal | Verplicht | De tijd die is toegestaan om de beoordeling af te ronden. | 24 |
| Prioriteitsniveau peer review | Keuze: Prioriteit 1 - Hoge escalatie, Prioriteit 2 - Gerichte hoge gevolgen, Prioriteit 3 - Routine willekeurig | Verplicht | | Prioriteit 3 - Routine willekeurig |
| Actief | Selectievakje | Optioneel | | Aan |
| Bemonsteringslogica | Keuze: Percentage, Interval (elke Nde geval), Vast volume (eerste N gevallen) | Verplicht | Bij de keuze hoort één getalveld: Percentage %, Elke Nde casus, Eerste N casus. | Percentage, 10 procent |
| Jurisdicties | Selectievakjes van landen | Optioneel | Laat alles uitgevinkt om de regel in elke jurisdictie toe te passen. | Geen aangevinkt |
| ID's uitvoerende faciliteiten | Door komma's gescheiden tekst | Optioneel | | Leeg |
| Rol van de zorgverlener | Selectievakjes: Patholoog, Cytotechnoloog | Optioneel | Geldt voor casus die door die rol zijn beoordeeld. | Geen aangevinkt |
| Status van inwerken | Selectievakjes: Nieuwe medewerker, Proeftijd | Optioneel | Geldt voor medewerkers die worden ingewerkt. | Geen aangevinkt |
| In aanmerking komende beoordelaarsrollen | Door komma's gescheiden tekst | Optioneel | Wie de beoordeling mag krijgen toegewezen. | Leeg |
| Specimencategorie | Selectievakjes: GYN Pap, Niet-GYN-vloeistof, Dunnenaaldaspiratie (FNA) | Optioneel | | Geen aangevinkt |
| Adequaatheid | Selectievakjes: Voldoende, Onvoldoende, Beperkt | Optioneel | | Geen aangevinkt |
| Resultaatfilter | Keuze: Elk resultaat, Alleen negatief, Alleen niet-negatief | Optioneel | | Elk resultaat |
| Hoogrisico-markeringen | Door komma's gescheiden tekst | Optioneel | | Leeg |
| Bethesda-classificaties | Door komma's gescheiden tekst | Optioneel | | Leeg |
| SNOMED-conceptcodes | Door komma's gescheiden tekst | Optioneel | | Leeg |
| **Opslaan**, **Annuleren** | Knoppen | Niet van toepassing | | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:cytology-qc-rules:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Contract: `docs/architecture/CYTOLOGY_QC_API.md`.

### Steekproefpercentages cytologie-KC {#screen-cytology_qc_settings}
Breadcrumb: Start > Configuratie > Cytologie > QC-steekproefpercentage

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Cytologie** > **QC-steekproefpercentage**
**2. Beheeronderdeel:** QC-steekproefpercentage (titel op het scherm: Cytologie QC willekeurige selectiepercentages)

**3. Doel en bereik.** Twee onafhankelijke percentages: het percentage negatieve GYN-resultaten en het percentage niet-negatieve GYN-resultaten dat willekeurig voor de QC-pool wordt geselecteerd. Er is een standaard voor de organisatie en er zijn optionele overschrijvingen per faciliteit en per medewerker. Een overschrijving voor een medewerker gaat boven een overschrijving voor een faciliteit, die boven de standaard van de organisatie gaat. Gebruik een overschrijving voor een medewerker voor een hoger percentage bij een nieuwe medewerker of student.

**4. Vereisten en afhankelijkheden.** Faciliteiten ([Faciliteitswoordenboek](#screen-facility-dictionary)) en medewerkers ([Medewerkers](#screen-staff-members)) voor de overschrijvingen.

Setup step: Tier 3, step 27
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary), [Medewerkers](#screen-staff-members)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_qc_settings - QC-steekproefpercentages met overschrijvingen per faciliteit en per medewerker]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Bedrijfsstandaard: Negatief | Getal 0 tot 100 (procent) | Verplicht | | 10 |
| Bedrijfsstandaard: Niet-negatief | Getal 0 tot 100 (procent) | Verplicht | | 10 |
| **Opslaan** | Knop | Niet van toepassing | Toont "Niet-opgeslagen wijziging" totdat het is opgeslagen. | Niet van toepassing |
| Faciliteitsoverrides: **+ Override toevoegen** | Keuzelijst met faciliteiten; percentages Negatief en Niet-negatief; **Opslaan**, **Annuleren**, **Verwijderen** | Optioneel | Een overschrijving kan een percentage leeg laten om het over te nemen ("(waarde)% (overgenomen)"). De lijst luidt "Neg x, Niet-neg y". | Geen ("Geen faciliteitsoverrides") |
| Overrides per personeelslid: **+ Override toevoegen** | Keuzelijst met medewerkers; percentages Negatief en Niet-negatief; **Opslaan**, **Annuleren**, **Verwijderen** | Optioneel | Gaat boven elke overschrijving voor een faciliteit. | Geen ("Geen personeelsoverrides") |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:cytology-qc-rates:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Contract: `docs/architecture/CYTOLOGY_API.md` (`ICytologyQcSettingsService`).

### Dagelijkse werklastlimiet cytologie {#screen-cytology_workload_cap}
Breadcrumb: Start > Configuratie > Cytologie > Dagelijkse werklastlimiet

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Cytologie** > **Dagelijkse werklastlimiet**
**2. Beheeronderdeel:** Dagelijkse werklastlimiet (titel op het scherm: Dagelijkse werklastlimiet cytologie)

**3. Doel en bereik.** Het maximumaantal GYN-cytologiepreparaten dat een cytotechnoloog op één dag mag screenen (de CLIA-werklastgrens), met dezelfde drie niveaus als de QC-percentages: standaard van de organisatie, overschrijvingen per faciliteit en overschrijvingen per medewerker (de medewerker gaat boven de faciliteit). Het stelt ook het tijdstip in waarop de screeningdag begint, voor het aftekenen van de uren aan het einde van de dag en het werklastrapport. De limiet zelf wordt over een voortschrijdende periode van 24 uur gecontroleerd en gebruikt het begin van de dag niet.

**4. Vereisten en afhankelijkheden.** Faciliteiten en medewerkers voor de overschrijvingen. Een tijdzone van het lab wordt ingesteld in de Systeeminstellingen (buiten dit hoofdstuk).

Setup step: Tier 3, step 28
Requires: [Faciliteitswoordenboek](#screen-facility-dictionary), [Medewerkers](#screen-staff-members)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_workload_cap - Dagelijkse werklastlimiet met begin van de dag en overschrijvingen]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Bedrijfsstandaard (preparaten / dag) | Geheel getal 1 tot 100 | Verplicht | Foutmelding "Het maximum moet een heel aantal preparaten van 1 tot 100 zijn." | 100 |
| **Opslaan** | Knop | Niet van toepassing | Toont "Niet-opgeslagen wijziging". | Niet van toepassing |
| De screeningdag begint om | Keuzelijst met uren | Verplicht | Standaard middernacht; 6:00 uur houdt een nachtdienst van 22:00 tot 6:00 uur op één datum. Een wijziging geldt vanaf nu; eerdere dagen houden de begintijd die toen gold. Foutmelding "U hebt geen toestemming om dit te wijzigen." | Middernacht |
| Faciliteitsoverrides: **+ Override toevoegen** | Keuzelijst met faciliteiten, Daglimiet (1 tot 100); **Opslaan**, **Annuleren**, **Verwijderen** | Optioneel | Als elke faciliteit er al een heeft: "Elke faciliteit heeft al een override. Verwijder er een om die opnieuw in te stellen." | Geen |
| Overrides per personeelslid: **+ Override toevoegen** | Keuzelijst met medewerkers, Daglimiet (1 tot 100); **Opslaan**, **Annuleren**, **Verwijderen** | Optioneel | Gebruik een lagere limiet voor een nieuwe medewerker of student. | Geen |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:cytology-workload-cap:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Contract: `docs/architecture/CYTOLOGY_API.md` (`ICytologyWorkloadCapSettingsService`).

### Bijdrage-instellingen {#screen-contribution_settings}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Bijdrage-instellingen

**Status:** Gedeeltelijk

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Bijdrage-instellingen (titel op het scherm: Instellingen bijdrage-dashboard)

**3. Doel en bereik.** Regelt wat pathologen zien op hun eigen pagina **Mijn bijdrage** en in welke tijdzone de maandelijkse en jaar-tot-heden-gegevens (aantallen casus en RVU) worden gegroepeerd. Beheerders, patholoog-beheerders en superbeheerders zien altijd de vergelijkingsgegevens met collega's en de instelling; de schakelaar voor collega's bepaalt alleen wat de gewone patholoog van zichzelf ten opzichte van anderen ziet. De opslag is altijd UTC; de tijdzone bepaalt alleen aan welke dag of maand een ondertekende casus wordt toegewezen (een ondertekening om 23.00 uur telt mee voor diezelfde dag).

**4. Vereisten en afhankelijkheden.** Geen.

Setup step: Tier 3, step 29
Requires: Geen.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-contribution_settings - Instellingen bijdrage-dashboard met tijdzone en vergelijking met collega's]

**6. Veldoverzicht.** Elke wijziging wordt direct opgeslagen en toont "Opgeslagen".

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Tijdzone van de instelling | Keuzelijst: Eastern, Central, Mountain, Arizona (geen zomertijd), Pacific, Alaska, Hawaii (geen zomertijd) (allemaal VS), Britse tijd, UTC | Verplicht | Een lijst van negen; andere zones kunnen niet worden gekozen. | Arizona-tijd (VS, geen zomertijd) |
| Toon gemiddelden van collega's en vergelijkingen met best presterende collega's aan pathologen | Selectievakje ("Zichtbaarheid vergelijking met collega's") | Optioneel | Uit: pathologen zien alleen hun eigen aantallen casus en de voortgang naar de doelen van de instelling. Aan: ook geanonimiseerde gemiddelden van collega's en cijfers van de best presterende collega's worden getoond. | Uit |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:contribution-settings:manage` (hoog risico; Beheerder en Laboratoriumdirecteur; wordt gecontroleerd wanneer de wijziging wordt opgeslagen).
**Bekende beperkingen.** Gedeeltelijk: de waarden worden bewaard door het systeemconfiguratiearchief van de app, dat vandaag naar de opslag van de browser schrijft. Opslag op de server, zodat elk werkstation dezelfde instellingen ziet, is gepland (PS-345, `systemConfigStore.ts`) en het servercontract voor de systeemconfiguratie bestaat in `docs/architecture/DICTIONARIES_CONFIG_API.md`. Tot die tijd wordt een instelling die op de ene computer is gemaakt niet op een andere gezien. Het volgen van RVU's per casus buiten deze schakelaar om is niet gerealiseerd (het wacht op juridische beoordeling en compliancebeoordeling).

### Feedback {#screen-feedback}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Feedback

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Feedback

**3. Doel en bereik.** Met de QA-feedbackknop melden testers een probleem vanaf elk scherm, met een schermafbeelding en zonder patiëntgegevens. Dit scherm bepaalt wanneer de knop verschijnt en wie de meldingen ontvangt. Standaard is de knop verborgen op een productie-instantie en zichtbaar op een validatie-instantie.

**4. Vereisten en afhankelijkheden.** Geen.

Setup step: Tier 3, step 30
Requires: Geen.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-feedback - Feedbackinstellingen met de drie modi en de lijsten met ontvangers]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| QA-feedbackknop | Keuze (keuzerondje): Standaard voor deze instantie, Altijd getoond, Altijd verborgen | Verplicht | Een regel zegt of dit een productie- of validatie-instantie is en wat de standaard is. Foutmelding "Kies wanneer de knop wordt getoond." | Standaard voor deze instantie |
| QA-ontvangers | E-mailadressen gescheiden door komma's | Verplicht zodra de knop wordt getoond | Foutmelding "Voeg minstens één ontvanger toe: de knop wordt op deze instantie getoond en de feedback zou nergens heen kunnen." Een ongeldig adres wordt geweigerd. | Leeg |
| Kopie aan beheerder (cc) | E-mailadressen gescheiden door komma's | Optioneel | | Leeg |
| **Opslaan** | Knop | Niet van toepassing | Toont "Opgeslagen" of de reden. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:feedback:manage` (hoog risico; Beheerder en Laboratoriumdirecteur; de knop Opslaan is afgeschermd door een machtiging).
**Bekende beperkingen.** Contract: `docs/architecture/CONFIG_DICTIONARIES_API.md`.

### Onderzoeksfeed {#screen-research_feed}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Onderzoeksfeed

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Beheeronderdeel:** Onderzoeksfeed

**3. Doel en bereik.** De literatuurkop op het dashboard Start. De artikelen komen rechtstreeks van NCBI PubMed, gesorteerd op publicatiedatum. Het is een geautomatiseerde feed, geen samengestelde of beoordeelde selectie, en mag nooit aan clinici worden gepresenteerd als richtlijn. De feed wordt door de browser van de gebruiker rechtstreeks bij NCBI opgehaald; een feed die faalt toont niets en houdt het dashboard nooit tegen.

**4. Vereisten en afhankelijkheden.** De browser van het werkstation moet NCBI kunnen bereiken.

Setup step: Tier 3, step 31
Requires: Geen.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-research_feed - Instellingen van de Onderzoeksfeed met de status van het ophalen]

**6. Veldoverzicht.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Laatste succesvolle ophaling; Laatste poging | Weergave | Niet van toepassing | Toont "Nooit" vóór het eerste succes. | Niet van toepassing |
| Feed op het dashboard weergeven | Selectievakje | Optioneel | | Aan |
| Zoekopdracht | Tekst (PubMed-syntaxis) | Verplicht | Foutmelding "De zoekopdracht mag niet leeg zijn." De uitsluitingen voor ingetrokken publicaties, preprints, redactionele artikelen, opmerkingen en brieven zijn het enige kwaliteitsfilter van de feed; als u ze verwijdert, kan een ingetrokken artikel verschijnen. | digital pathology OR synoptic reporting, Engels, met uitsluiting van ingetrokken publicaties, preprints, redactionele artikelen, opmerkingen en brieven |
| Artikel-URL | https-adres met `{PMID}` | Verplicht | Moet `{PMID}` bevatten en https zijn op een goedgekeurde host (nih.gov, nlm.nih.gov, doi.org). | https://pubmed.ncbi.nlm.nih.gov/{PMID}/ |
| API-eindpunt | https-adres | Verplicht | Basis-URL van NCBI eUtils, zonder afsluitende schuine streep, alleen goedgekeurde host. Wijzig dit alleen als NCBI de service verplaatst. | https://eutils.ncbi.nlm.nih.gov/entrez/eutils |
| **Standaardwaarden herstellen**, **Opslaan** | Knoppen | Niet van toepassing | Na het opslaan: "Opgeslagen. Al gecachte artikelen worden binnen 24 uur vernieuwd." | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:research-feed:manage` (hoog risico; Beheerder en Laboratoriumdirecteur).
**Bekende beperkingen.** Contract: `docs/architecture/REFERRAL_RESEARCH_API.md` (de instellingen). Het ophalen van de artikelen zelf is een aanroep van de browser naar NCBI, zonder PathScribe-server ertussen.

## Dagelijkse pagina's die door deze instellingen worden aangestuurd {#ch4-reference-pages}
Breadcrumb: Start

Deze vijf pagina's zijn pagina's van de werkomgeving of van een wachtrij, geen beheerschermen. Ze worden beschreven zodat een beheerder weet wat elke pagina toont, wie haar kan openen en welke instelling haar wijzigt. Geen ervan maakt deel uit van de inrichting.

### Start {#screen-home}
Breadcrumb: Start

**Status:** Gerealiseerd

**1. Navigatie:** De pagina die na het aanmelden wordt getoond (`/`).
**2. Beheeronderdeel:** Niet van toepassing. Dit is een startpagina.

**3. Doel en bereik.** Een reeks tegels, één per plek waar de aangemelde persoon heen mag. Een tegel verschijnt alleen als minstens één van de schermen waartoe hij leidt aan een van de rollen van de persoon is toegekend. Een persoon zonder enig scherm ziet "Geen van uw rollen geeft u al toegang tot een scherm. Vraag uw beheerder u er een toe te wijzen." Een voettekst toont de copyrightregel en de echte systeemstatus: een gekleurde stip met "Wordt gecontroleerd", daarna "Operationeel", "Verminderd" of "Niet beschikbaar", of "Status niet beschikbaar" als de controle zelf mislukt. De status komt uit de gezondheidscontrole van de API-server (`GET /api/health/health-status/check`), uitgevoerd bij het openen van Home en opnieuw wanneer het tabblad na vijf minuten weer zichtbaar wordt (nooit op een timer). Ze meldt vier vaste onderdelen (database, berichtenverkeer, wachtrijen, interface-engine) zonder patiëntgegevens, en de server bepaalt de totaalstatus. In de demo is er geen server, dus de status is als gesimuleerd gemarkeerd. De voettekst doet geen conformiteitsverklaring.

**4. Vereisten en afhankelijkheden.** De toegang wordt bepaald door de rol en de machtiging die in Hoofdstuk 2 zijn ingericht (medewerkersrollen) en door de standaardmachtigingen. Er is geen eigen instelling voor tegels.

Setup step: Reference, not part of setup
Requires: [Rollen](#screen-staff-roles)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-home - Start met de tegels voor één rol]

**6. Kolommen, filters en knoppen.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Welkom terug, (naam) | Tekst | Niet van toepassing | | Niet van toepassing |
| Opname | Tegel | Niet van toepassing | Opent Opname. Vereist `screen:accession:open` (PA, Accessioner). | Niet van toepassing |
| Werklijst | Tegel | Niet van toepassing | Opent de Werklijst en de weergaven Cytologie-KC en Chirurgische KA. Getoond als een van `screen:worklist:open`, `screen:cytology-qc-queue:open`, `screen:surgical-qa-worklist:open` is toegekend. | Niet van toepassing |
| Zoeken | Tegel | Niet van toepassing | `screen:search:open`. | Niet van toepassing |
| Peroperatieve wachtrij | Tegel | Niet van toepassing | `screen:intraop-queue:open` (Patholoog, Fellow, Assistent in opleiding, PA). | Niet van toepassing |
| Lockbox-afgifte | Tegel | Niet van toepassing | `screen:lockbox-drop-off:open` (Accessioner, Beheerder). | Niet van toepassing |
| Mijn bijdrage | Tegel | Niet van toepassing | `screen:my-contributions:open` (Patholoog, Fellow, Assistent in opleiding, PA, Laboratoriumdirecteur). | Niet van toepassing |
| Werkplekbijdragen | Tegel | Niet van toepassing | `screen:bench-contributions:open` (Accessioner en de technoloogrollen). | Niet van toepassing |
| Pathologie-werkruimte | Hubtegel | Niet van toepassing | Leidt naar Cytologie-werkruimte, Microtomie, Inbedding, Objectglaasjes-distributie, Moleculair, Batchbeheer en Margeafwijkingen beoordelen. Getoond als een ervan is toegekend. | Niet van toepassing |
| Kwaliteit & Compliance | Hubtegel | Niet van toepassing | Leidt naar Auditlogboek, Kwaliteitsborging, Registeruitzonderingen, Autopsiedashboards en de Uitgaande wachtrij. Een badge toont hoeveel registermeldingen een persoon nodig hebben. | Niet van toepassing |
| Tumor board/MDO | Tegel | Niet van toepassing | `screen:tumor-board:open` (Patholoog, Fellow, Assistent in opleiding, PA). | Niet van toepassing |
| Configuratie | Tegel | Niet van toepassing | `screen:configuration:open` (Beheerder, Sjabloonauteur, Sjabloongoedkeurder, Laboratoriumdirecteur). | Niet van toepassing |

**7. Machtigingen.** Elke tegel heeft de hierboven genoemde schermmachtiging; er is geen machtiging voor Start zelf. Elke aangemelde persoon bereikt Start.
**Bekende beperkingen.** Aanvullende bestellingen en de weergaven voor KA na ondertekening zijn geen tegels: het zijn een actie op een casus en weergaven binnen de Werklijst. Facility Ops-dashboards staan niet op Start.
### Lockbox-afgifte {#screen-lockbox-drop-off}
Breadcrumb: Start > Lockbox-afgifte

**Status:** Gerealiseerd

**1. Navigatie:** Start > **Lockbox-afgifte** (`/lockbox-drop-off`).
**2. Beheeronderdeel:** Niet van toepassing. Dit is een scherm van de werkomgeving.

**3. Doel en bereik.** Een kiosk voor monsters die buiten werktijd in de lockbox zijn achtergelaten. De medewerker scant elke container; PathScribe schrijft een onveranderlijk ontvangstbewijs "In lockbox ontvangen", met een tijdelijk record als er geen aanvraag past. Het ochtendteam werkt vanuit de **Nachtmap** totdat elk ontvangstbewijs is geaccessioneerd. Er zijn twee tabbladen: **Afgifte** en **Nachtmap**.

**4. Vereisten en afhankelijkheden.** De lijsten met aanvragende klanten en artsen op het formulier voor het tijdelijke record komen uit [Faciliteitsconfiguratie](#screen-clients) en [Artsen](#screen-physicians). Een barcode komt overeen met een aanvraag wanneer er een aanvraag mee bestaat; zonder aanvraag wordt een tijdelijk record bewaard en wordt er geen accessienummer aangemaakt.

Setup step: Reference, not part of setup
Requires: [Faciliteitsconfiguratie](#screen-clients), [Artsen](#screen-physicians)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-lockbox-drop-off - Lockbox-afgifte met scanveld en Nachtmap]

**6. Kolommen, filters en knoppen.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Scan de barcode van de container | Scannerinvoer, daarna Enter | Verplicht | Er hoeft verder niets bevestigd te worden. Een barcode die al eerder is ontvangen toont het eerdere ontvangstbewijs en maakt geen nieuw aan. | Leeg |
| Urgent | Schakelaar | Optioneel | Markeert het ontvangstbewijs als "Urgent, hoge prioriteit". | Uit |
| Terugbelnummer (optioneel) | Tekst | Optioneel | Getoond bij Urgent. | Leeg |
| Ontvangstkaart | Aanvragende instelling ("Niet vastgelegd" als er geen is), Aanvragend arts, Ontvangen, Ontvangen door, Terugbelnummer | Niet van toepassing | Eindigt met "Scan de volgende container." | Niet van toepassing |
| Formulier voor het tijdelijke record ("Geen openstaande aanvraag voor deze barcode") | Barcode; Aanvragende klant (of "Niet in de lijst of onbekend" plus een klant in vrije tekst); Aanvragend arts; Tijdstip van afgifte | Optioneel (elk veld) | Het tijdstip van afgifte begint op de huidige tijd; wijzig het alleen als de afgifte eerder was. **Afgifte vastleggen** slaat op; **Annuleren** verwerpt. | Huidige tijd |
| Nachtmap: Vernieuwen | Knop | Niet van toepassing | | Niet van toepassing |
| Overzicht Doorlooptijd tot ontvangst (QA) | Nu wachtend, Langste wachttijd, Geaccessioneerd, Mediaan, Gemiddelde, Langste, Mediaan urgent | Niet van toepassing | Van de afgifte in de lockbox tot de accessie. "Nog geen gegevens" als er niets is. | Niet van toepassing |
| Tabel van de Nachtmap | Kolommen: Accessienummer of tijdelijk record, Prioriteit, Aanvragende instelling, Ontvangen, Ontvangen door, Wachttijd, Status, Acties | Niet van toepassing | Status: Aanvraag gekoppeld, Tijdelijk record niet gekoppeld, Tijdelijk record aan een aanvraag gekoppeld. Leeg: "Er wacht niets." | Niet van toepassing |
| Aan aanvraag koppelen | Knop, daarna Echt aanvraag- of accessienummer en **Koppelen** / **Annuleren** | Verplicht om te koppelen | Vereist `lockbox:placeholder:resolve`. | Niet van toepassing |
| Als geaccessioneerd markeren | Knop | Niet van toepassing | Vereist `lockbox:folder:review`. | Niet van toepassing |
| Accessie openen | Knop | Niet van toepassing | Opent Accessie voor het ontvangstbewijs. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:lockbox-drop-off:open` (Accessioner en Beheerder; standaardrisico; openen wordt niet geaudit). Een ontvangstbewijs scannen en vastleggen: `lockbox:specimen:receive` (hoog risico, wordt geaudit; Accessioner). Nachtmap, overzicht en Als geaccessioneerd markeren: `lockbox:folder:review` (Accessioner, en Beheerder voor het toezicht). Een tijdelijk record koppelen: `lockbox:placeholder:resolve` (Accessioner).
**Bekende beperkingen.** Contract: `docs/architecture/LOCKBOX_API.md`. Ontvangstbewijzen bevatten geen patiëntgegevens. In de demonstratie begint de map met zes voorbeeldontvangstbewijzen (twee spoed, één al geaccessioneerd); **Volledige reset** onder **Demo reset** verwijdert alles wat op het scherm is gedaan en laadt een nieuwe set.

### Kwaliteitsborging {#screen-quality-assurance}
Breadcrumb: Start > Kwaliteit & Compliance > Kwaliteitsborging

**Status:** Gerealiseerd

**1. Navigatie:** Start > **Kwaliteit & Compliance** > **Kwaliteitsborging** (`/quality-assurance`; in het adres kan een pijler worden genoemd, `?pillar=`).
**2. Beheeronderdeel:** Niet van toepassing. Dit is een werkwachtrij.

**3. Doel en bereik.** De werkwachtrij voor kwaliteit. Zij is ingedeeld in acht "pijlers". **Operations** houdt afwijkingen van de norm en klinische kwaliteitsindicatoren bij. **Financieel** houdt facturerings- en coderingsafwijkingen bij die bij de ondertekening zijn gemeld. **CAPA-engine** beheert de levenscyclus van corrigerende maatregelen: een correctie sluit niet vanzelf, ze wordt hier geëscaleerd totdat iemand bevestigt dat ze heeft gewerkt, met periodieke managementbeoordeling. **Cytologie-QA** en **QA-dashboard** rapporteren de beoordelingsactiviteit, **Inspectiemodus** verpakt die als auditbewijs, **Enterprise-rollup** is een samenvatting over alle labs heen, en **Activiteiten** toont de KA-activiteiten die in het [KA-configuratiecentrum](#screen-qa_config_center) zijn vastgelegd.

**4. Vereisten en afhankelijkheden.** Tekortkomingstypen komen uit [Specimentekortkomingen](#screen-deficiencies); activiteiten en CAPA-triggers uit het [KA-configuratiecentrum](#screen-qa_config_center); patronen uit het [Beleid voor discrepantietrends](#screen-qa_trend_policy); achterstallige opvolgingen uit [Opvolging](#screen-follow_up_tracking).

Setup step: Reference, not part of setup
Requires: [KA-configuratiecentrum](#screen-qa_config_center), [Beleid voor discrepantietrends](#screen-qa_trend_policy), [Specimentekortkomingen](#screen-deficiencies)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-quality-assurance - Kwaliteitsborging met pijlertabbladen en tegels]

**6. Kolommen, filters en knoppen.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Pijlertabbladen | Operations, Financieel, CAPA-engine, Cytologie-QA, Enterprise-rollup, QA-dashboard, Inspectiemodus, Activiteiten | Niet van toepassing | | Operations |
| Tegels van Operations | Afwijkingen (met "N achterstallig"), Opvolging niet ontvangen, Vriescoupe-koppeling, Discordantie, Doorlooptijd contrasignering, Bevoegdheidsbeoordeling, Afwijking na finalisatie, Patiëntmatch-beoordeling, Patiëntbeheer, Toegangsverzoeken, AI-discordantie | Niet van toepassing | Elke tegel opent zijn lijst. Afwijkingen zijn verdeeld in Dossierniveau en Specimenniveau. | Afwijkingen |
| Acties van Operations | Afwijking melden, Escaleren naar CAPA, Onmiddellijke inperking, Effectiviteit verifiëren, Managementbeoordeling starten | Niet van toepassing | **Afwijking melden**: dossier-id (Opzoeken), optioneel specimen, Type afwijking, "Wat is waargenomen". **Escaleren naar CAPA**: Oplossingstype, Corrigerende actie, Grondoorzaak, Preventieve actie (optioneel), Vervaldatum effectiviteitscontrole; het item gaat naar Verificatie in afwachting, niet naar Gesloten. **Onmiddellijke inperking**: "Wat er is gedaan"; sluit direct, zonder grondoorzaak of latere controle. **Effectiviteit verifiëren**: "Heeft de corrigerende actie daadwerkelijk gewerkt?" met Effectief - Sluiten of Herhaald - Heropenen. | Niet van toepassing |
| Tegels van de CAPA-engine | Aanbevolen, Discrepantiepatronen, Geëscaleerd naar CAPA, Gesloten, Managementbeoordelingen | Niet van toepassing | **Aanbevolen**: CAPA-aanbevelingen uit KA-activiteiten (met de eigenaar) die een kwaliteitsverantwoordelijke bevestigt of afwijst. **Discrepantiepatronen**: alleen getoond aan houders van `qa:pathologist-trend:view`. Een herhaald item toont "Heropend na een mislukte effectiviteitscontrole". | Aanbevolen |
| Tegels van Financieel | Facturatieafwijkingen, Opgelost, Coderingsbeoordelingspool, Verrichtingen wachtend op goedkeuring, Mislukte verzendingen ("in Config") | Niet van toepassing | **Facturatieafwijking oplossen**: Reden voor oplossing, daarna **Verder naar correctie**. **Coderingsbeoordelingspool**: Beoordelen met Beoordelingsresultaat (Geen probleem gevonden of Facturatieafwijking melden), de verrichting en Notities auditor. **Correctie starten** opent de facturatiecorrectie. Mislukte verzendingen opent de Uitgaande wachtrij in Configuratie. | Facturatieafwijkingen |
| Exporteren | Knop op lijsten | Niet van toepassing | Elke lijst heeft een eigen exportmachtiging. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:quality-assurance:open` (Beheerder, Laboratoriumdirecteur, QA Reviewer). Een Directiebeoordeling indienen: `qa:management-review:submit` (hoog risico, vereist het scherm Kwaliteitsborging; wordt toegekend met de andere acties voor kwaliteitstekortkomingen; Batch 659). Een wijziging die terugkomt met "niet opgeslagen" laat het venster nu open met wat was getypt. CAPA-aanbevelingen beslissen: `qa:capa-recommendation:decide` (Beheerder, Laboratoriumdirecteur, QA Reviewer). Discrepantiepatronen zien en erover beslissen: `qa:pathologist-trend:view` en `qa:pathologist-trend:decide` (standaard alleen Laboratoriumdirecteur). Een opvolging vastleggen: `qa:follow-up:record` (Beheerder, Laboratoriumdirecteur, QA Reviewer). Exports: één machtiging per lijst (`qa:deficiencies:export`, `qa:management-reviews:export`, `qa:billing-deficiencies:export`, `qa:inspection-evidence:export` en andere; allemaal hoog risico; Beheerder en QA Reviewer hebben de meeste). Facturatie corrigeren: `billing:applied-code:correct`.
**Bekende beperkingen.** "Payer and Pre-Auth Audits" zijn niet gerealiseerd (er bestaat geen detectie), dus Financieel heeft geen zodanig tabblad. Een CAPA wordt nooit automatisch geopend: elke aanbeveling wacht op een persoon. Contract: `docs/architecture/QUALITY_API.md`.

### Margeafwijkingen beoordelen {#screen-margin-exception-review}
Breadcrumb: Start > Pathologie-werkruimte > Margeafwijkingen beoordelen

**Status:** Gerealiseerd

**1. Navigatie:** Start > **Pathologie-werkruimte** > **Margeafwijkingen beoordelen** (`/margin-exception-review`).
**2. Beheeronderdeel:** Niet van toepassing. Dit is een werkwachtrij.

**3. Doel en bereik.** Toont margeafstanden die in vrije tekst zijn opgegeven en die PathScribe niet met voldoende zekerheid in een getal kon omzetten, zodat een persoon de echte afstand kan vastleggen of het item met een reden kan afwijzen.

**4. Vereisten en afhankelijkheden.** De items komen uit synoptische verslagen (Hoofdstuk 6) waarvan het margeveld vrije tekst is.

Setup step: Reference, not part of setup
Requires: Geen.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-margin-exception-review - Lijst Margeafwijkingen beoordelen]

**6. Kolommen, filters en knoppen.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Rij | Patiëntnaam en accessie; veldlabel; de ruwe tekst; de reden | Niet van toepassing | Redenen: Nog geen antwoord gegeven; Geen getal gevonden in de tekst; Er is een getal gevonden, maar omringd door tekst die deze parser niet vertrouwt. | Niet van toepassing |
| Margeafstand (mm) | Getal, 0 of meer, stap 0,1 | Verplicht om op te lossen | Foutmelding "Voer een margeafstand van 0 of meer in." | Leeg |
| **Oplossen** | Knop | Niet van toepassing | Slaat de vastgelegde afstand op. Vereist `case:margin-exception:resolve`. | Niet van toepassing |
| **Afwijzen** | Knop, daarna een venster met **Waarom dit veld geen afstand kan geven** | Verplichte reden | **Afwijzen** of Annuleren. De persoon en de reden worden vastgelegd. | Niet van toepassing |
| **Casus openen** | Knop | Niet van toepassing | Opent het verslag en keert hier terug. | Niet van toepassing |
| Lege lijst | Tekst | Niet van toepassing | "Geen openstaande margeafstand-uitzonderingen." | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:margin-exception-review:open` (Patholoog, Fellow, Assistent in opleiding, PA). Oplossen of afwijzen: `case:margin-exception:resolve` (hoog risico; dezelfde rollen).
**Bekende beperkingen.** Geen enkel configuratiescherm stelt de parser in; de regel zit in het product.

### Cytologie-KC-wachtrij {#screen-cytology-qc-queue}
Breadcrumb: Start > Werklijst > Cytologie-KC

**Status:** Gerealiseerd

**1. Navigatie:** Start > **Werklijst**, weergave **Cytologie-KC** (`/cytology-qc-queue` verwijst door naar de weergave in de Werklijst). Titel: Cytologie QC peer review-wachtrij.
**2. Beheeronderdeel:** Niet van toepassing. Dit is een werkwachtrij.

**3. Doel en bereik.** Het beoordelingswerk dat voortkomt uit de [Cytologie-KC-regels](#screen-cytology_qc_rules) en de [Steekproefpercentages cytologie-KC](#screen-cytology_qc_settings). Elk item is een casus die voor collegiale toetsing is geselecteerd, met een termijn uit de SLA van de regel. Twee weergaven: **Wachtrij** en **Compliance**.

**4. Vereisten en afhankelijkheden.** Zonder QC-regels wordt niets geselecteerd. De beoordelaarsgroep voor een item komt uit de in aanmerking komende beoordelaarsrollen van de regel.

Setup step: Reference, not part of setup
Requires: [Cytologie-KC-regels](#screen-cytology_qc_rules)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-cytology-qc-queue - Cytologie QC peer review-wachtrij]

**6. Kolommen, filters en knoppen.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Wachtrij / Compliance | Tabbladen | Niet van toepassing | Compliance toont het QC-compliancepaneel. | Wachtrij |
| Alle items, Escalaties & afwijkingen, Routine & willekeurig | Tabbladen | Niet van toepassing | Filtert de wachtrij. | Alle items |
| Rij | Casus, regelnaam, prioriteitsniveau, SLA-status, "Geselecteerd door (redenen)", "Beoordelaarsgroep (rollen)" | Niet van toepassing | SLA-status: Op tijd, SLA nadert, SLA overschreden. | Niet van toepassing |
| **Casus openen** | Knop | Niet van toepassing | | Niet van toepassing |
| **Aan mij toewijzen** | Knop | Niet van toepassing | Geweigerd als u de casus zelf hebt ondertekend ("een andere patholoog moet hem beoordelen") of als u niet tot de beoordelaarsgroep behoort. | Niet van toepassing |
| **Overeenstemming vastleggen**, **Afwijking vastleggen** | Knoppen | Niet van toepassing | Leggen de beoordeling vast. Een afwijking opent een venster voor de details. Vereist `cytology:qc-review:record`. Een casus die "Toegewezen aan een andere beoordelaar" is, toont geen knoppen. | Niet van toepassing |
| **Escaleren** | Knop en venster ("Deze achterstallige beoordeling escaleren?") met **Reden** | Verplichte reden | Zet een achterstallige beoordeling zonder toewijzing terug in de wachtrij. | Niet van toepassing |
| **Supervisor-omzeiling** | Knop en venster ("QC-beoordeling voor deze casus overslaan?") met **Motivering** | Verplichte motivering | Keurt de casus goed zonder QC-beoordeling om klinische vertraging te voorkomen. De naam en de motivering worden in het auditlogboek bewaard. | Niet van toepassing |
| Leeg | Tekst | Niet van toepassing | "Geen gevallen in deze wachtrij." | Niet van toepassing |

**7. Machtigingen.** De weergave openen: `screen:cytology-qc-queue:open` (Patholoog, Fellow). Een beoordeling vastleggen of escaleren: `cytology:qc-review:record` (Patholoog, Fellow; hoog risico). Supervisor-omzeiling: `cytology:qc-review:bypass` (hoog risico; standaard door geen enkele rol gehouden, alleen door de superbeheerder van ForMedrixAI; een beheerder moet haar toewijzen).
**Bekende beperkingen.** Contract: `docs/architecture/CYTOLOGY_QC_API.md`.
