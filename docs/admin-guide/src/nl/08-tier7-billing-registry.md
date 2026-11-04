---
chapter: 8
id: ch8
title: Niveau 7: Facturatie, omzetcyclusbeheer en registermeldingen
---

# Niveau 7: Facturatie, omzetcyclusbeheer en registermeldingen {#ch8}

Dit hoofdstuk beschrijft hoe PathScribe bepaalt wat er in rekening wordt gebracht, wanneer een kostenpost het systeem mag verlaten en aan welke kanker- en screeningsregisters een casus wordt gemeld. Het behandelt ook de betalingslookups die de kostenpayload gebruikt en de pagina Systeemlogboeken waarin u financiële gebeurtenissen volgt.

Lees eerst deze drie punten, want zij bepalen wat u wel en niet mag verwachten.

1. **Wat PathScribe met geld doet.** PathScribe zet elke kostenpost eenmalig, bij de finalisatie, om in een vast record: CPT- of HCPCS-code, relatieve waarde-eenheden (RVU) en modifier. PathScribe bewaart geen prijzen. **Tarieflijsten: Niet gerealiseerd.** Nergens in de facturatieregels bestaat een veld voor een dollarbedrag, prijs of tarief per betaler. De kostenpayload bevat geen dollarbedragen. De vergoeding wordt berekend door uw facturatiesysteem of door de interface-engine, niet door PathScribe.
2. **Wat PathScribe met registers doet.** PathScribe bepaalt of een casus meldingsplichtig is, controleert de verplichte gegevens en bouwt een gestructureerde JSON-payload. PathScribe schrijft zelf geen NAACCR XML, COSD XML of ander registerformaat. De interface-engine (de engine van ForMedrixAI, meegeleverd met PathScribe) vertaalt en verzendt. Geen enkele registerspecificatie in het product is getoetst aan de eigen gepubliceerde specificatie van het register, tenzij de sectie dat zegt.
3. **Het grootste deel van dit hoofdstuk is vandaag Demonstratie.** De productieopslag is Microsoft SQL Server achter een ASP.NET Core API. De services achter deze schermen zijn demonstratieservices die in de browser worden bewaard, en de API-contracten in `docs/architecture` vermelden nergens dat iets tegen een echte server is beproefd. Elk scherm vermeldt zijn eigen status.

## Volgorde van inrichting voor niveau 7

Richt de schermen in deze volgorde in. Het kader "Inrichtingsvolgorde" van elk scherm toont wat dat scherm vereist.

1. [CPT-modifierwoordenboek](#screen-modifier_dictionary): de modifierlijst die het Facturatiewoordenboek aanbiedt.
2. [RVU-codetabel](#screen-rvu_code_map): de lijst met CPT-codes en relatieve waarden waarnaar elke facturatieregel verwijst.
3. [Facturatiewoordenboek (kostenregistratie)](#screen-billing_dictionary): de facturatieregels met versiebeheer.
4. [NCCI-bewerkingsregels](#screen-ncci_edit_rules): de bundelingsparen (u uploadt ze zelf; er worden er geen meegeleverd).
5. [Openstaande goedkeuringen facturatieregels](#screen-pending_approvals): een tweede persoon keurt stap 1 tot en met 4 goed voordat iets van kracht wordt.
6. [Kostenvrijgavetriggers](#screen-billing_type_triggers): de casusmijlpaal waarop elk facturatietype zijn kostenpost aanmaakt.
7. [Facturatievrijgave](#screen-billing_release): aanhoud- en batchregels voor kostenposten die gereed zijn.
8. [Hoofdwoordenboek betalingstypen](#screen-master_payment_types): de betalingscategorieën.
9. [Jurisdictiebetalingstoewijzing](#screen-jurisdiction_payment_mappings): lokale betalersstelsels gekoppeld aan die categorieën.
10. [Voorbeeld facturatie-export](#screen-dft_export_preview): controleer wat een echte casus zou verzenden.
11. [Kankerregistratierapportage](#screen-cancer_registry_settings): het register per faciliteit en de goedkeuring voor livegang.
12. [Brits kankerregister (COSD)](#screen-cosd_destination): bestemmingsinstellingen voor Engeland.
13. [Elektronische pathologie (VS)](#screen-us_epath): staatsprofielen voor de Amerikaanse ePath-feed.
14. [Registerrapportage cytologie](#screen-cytology_registry): instellingen voor het bevolkingsonderzoek naar baarmoederhalskanker.
15. [Batchbestanden voor registers](#screen-batch_registry_feed): bestandsgebaseerde registerleveringen.

Het [financiële tabblad van Systeemlogboeken](#screen-audit-financial) is een naslagpagina. Het maakt geen deel uit van de inrichting.

Niet gerealiseerd in dit hoofdstuk: tarieflijsten, AI- of natuurlijketaalsuggesties voor facturatie op basis van verslagtekst, X12 837P, uitvoer voor KVDT en SESAM-Vitale, NAACCR XML-batchbestanden, en kwaliteitsrapportage voor MIPS en MACRA.

## Architectuur van de facturatie-engine {#ch8-billing-architecture}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups

**Hoe een kostenpost wordt gemodelleerd.** PathScribe splitst een kostenpost in een technische component, een professionele component, of beide samen. Het product noemt dit facturatietypen:

| Facturatietype | Label op het scherm | Wat het dekt | Modifierset |
|---|---|---|---|
| TC | Technisch (TC) | Laboratoriumwerk: uitsnijden, verwerking, preparaten, kleuringen | `-TC` |
| 26 | Professioneel (26 prof.) | De interpretatie door de patholoog | `-26` |
| Global | Gecombineerd (Global) | Beide delen samen gefactureerd | Geen van beide |

PathScribe bepaalt de modifier zonder uitzonderingen uit het facturatietype: TC krijgt `-TC`, 26 krijgt `-26`, Global krijgt er geen. Andere modifiers zijn uitsluitend informatief.

**Wanneer een kostenpost wordt aangemaakt.** Standaard wordt de technische component aangemaakt wanneer het monster wordt uitgesneden. De professionele en de globale component worden aangemaakt bij de definitieve ondertekening. U kunt dit wijzigen voor de hele onderneming of voor één locatie bij [Kostenvrijgavetriggers](#screen-billing_type_triggers).

**Kostenposten liggen vast zodra ze zijn aangemaakt.** Bij de finalisatie zet PathScribe de kostenpost eenmalig om in een onveranderlijk kostenrecord dat een momentopname van CPT, HCPCS, RVU en modifier bewaart. Latere wijzigingen in een facturatieregel veranderen een reeds gemaakte kostenpost niet. Een correctie na ondertekening gebruikt een paar van een creditering en een herfacturering, geen wijziging.

**Facturatieregels hebben versiebeheer.** Een facturatieregel wordt geïdentificeerd door facturatiecode, bereik en versie. Versies worden alleen toegevoegd. De statussen zijn DRAFT, PENDING_APPROVAL, ACTIVE, REJECTED en RETIRED. De persoon die een versie opstelt of indient, kan die niet goedkeuren (het vierogenprincipe, afgedwongen in de services). Bij goedkeuring gaat de nieuwe versie van kracht en eindigt de versie die zij vervangt.

**Bereik.** Een regel geldt onderneming-breed of voor één locatie. Op deze schermen wordt het woord Locatie gebruikt, niet Faciliteit.

**Gesplitste casus.** Wanneer de technische component in een ander laboratorium wordt uitgevoerd dan de professionele beoordeling, bevat de casus een faciliteit voor de technische component en de uitvoerende faciliteit. De vrijgavebeslissing controleert dit (zie [Facturatievrijgave](#screen-billing_release)).

**Waar kostenposten naartoe gaan.** Gereedstaande kostenposten gaan naar de Uitgaande wachtrij. Een kostenpost met de status PENDING_APPROVAL of HOLD wordt door de uitgaande sweep overgeslagen. De interface-engine zorgt voor transport, vertaling en nieuwe pogingen. PathScribe bepaalt alleen wat er wordt vrijgegeven en wanneer.

**Optionele goedkeuring van kostenposten.** Een kostenpost kan ter goedkeuring worden aangehouden. De goedkeuringsmachtiging `billing:charge:approve` wordt per uitvoerend laboratorium gecontroleerd. Zij staat in de machtigingencatalogus, maar geen enkele ingebouwde rol heeft haar standaard. Verleen haar dus via [Rollen](#screen-staff-roles) als u goedkeuring van kostenposten gebruikt.

### Kostenvrijgavetriggers (TC/26/Global) {#screen-billing_type_triggers}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups > Kostenvrijgavetriggers (TC/26/Global)

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Financiële en omzet-lookups**
**2. Onderhoudsonderdeel:** Kostenvrijgavetriggers (TC/26/Global)

**3. Zakelijk doel en bereik.** Bepaalt de casusmijlpaal waarop elk facturatietype zijn kostenpost aanmaakt. De standaardwaarden zijn: TC bij monster uitgesneden, 26 en Global bij casus ondertekend. U kunt een standaardwaarde overschrijven voor de hele onderneming of voor één locatie. Een locatie zonder eigen uitzondering gebruikt de instelling van de onderneming.

**4. Voorwaarden en afhankelijkheden.** Een locatie-uitzondering kan alleen worden ingesteld voor een locatie die bestaat, dus richt eerst de faciliteiten in. Zonder locatie in de lijst kunt u nog wel triggers voor de hele onderneming instellen.

Setup step: Tier 7, step 6
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Facturatievrijgave](#screen-billing_release)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-billing_type_triggers - Kostenvrijgavetriggers met per facturatietype een lijst van mijlpalen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Bereikkeuze | Keuze uit Onderneming of één Locatie | Verplicht | Bepaalt van wie u de triggers bekijkt en wijzigt. | Onderneming |
| Trigger Technisch (TC) | Keuze uit casusmijlpalen | Verplicht | De mijlpaal waarop de technische kostenpost wordt aangemaakt. Het kiezen in de keuzelijst wordt direct opgeslagen. | Specimen gesneden (`SPECIMEN_GROSSED`) |
| Trigger Professioneel (26 prof.) | Keuze uit casusmijlpalen | Verplicht | De mijlpaal waarop de professionele kostenpost wordt aangemaakt. Wordt direct opgeslagen. | Zaak afgemeld (`CASE_SIGNED_OUT`) |
| Trigger Gecombineerd (Global) | Keuze uit casusmijlpalen | Verplicht | De mijlpaal waarop de globale kostenpost wordt aangemaakt. Wordt direct opgeslagen. | Zaak afgemeld (`CASE_SIGNED_OUT`) |
| Terugzetten naar standaard | Knop | Optioneel | Verwijdert de uitzondering voor het gekozen bereik en zet het terug naar de ingebouwde standaard. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:billing-triggers:manage`. Beheerder en Laboratoriumdirecteur hebben deze standaard. Elke wijziging schrijft een auditgebeurtenis ("Charge release trigger changed", "Charge release triggers reset to default").

**Bekende beperkingen.** Alleen demonstratieservice. Een wijziging van een trigger geldt voor kostenposten die daarna worden aangemaakt en verandert reeds aangemaakte kostenposten niet.

## Regels voor kostenregistratie, CPT/HCPCS-koppeling en tarieflijsten {#ch8-charge-capture}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups

**Tarieflijsten: Niet gerealiseerd.** De opzet vraagt om tarieflijsten. Er is geen scherm, contract of veld voor een dollarbedrag, prijs of betalerspecifiek tarief. Een facturatieregel bevat alleen de CPT-code, de HCPCS-code en de RVU-waarden voor werk, praktijkkosten (PE) en aansprakelijkheid (MP). Het dichtstbijzijnde dat bestaat zijn de RVU-waarden in het [Facturatiewoordenboek](#screen-billing_dictionary) en de [RVU-codetabel](#screen-rvu_code_map). De controle `ZERO_FEE_MAPPING_ERROR` is geformuleerd als een tariefcontrole, maar toetst op een kostenpost die is uitgekomen op nul RVU voor werk, PE en MP en geen onderdrukkingsadvies heeft.

**Codes in bulk laden.** Gebruik [Code-import (bulk)](#screen-code_import) om CPT-, HCPCS- of andere codelijsten in bulk te laden. Het staat bij de andere lookups beschreven.

**Automatisch coderen.** Zie de statusalinea onder [Auto-codeermodule en aanhoudregels voor facturatie](#ch8-autocoding-holds).

### CPT-modifierwoordenboek {#screen-modifier_dictionary}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups > CPT-modifierwoordenboek

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Financiële en omzet-lookups**
**2. Onderhoudsonderdeel:** CPT-modifierwoordenboek

**3. Zakelijk doel en bereik.** De lijst met CPT-modifiercodes (bijvoorbeeld 26, TC, 59, XS) die het tabblad Coderingsregels van het Facturatiewoordenboek aanbiedt. De modifiers hier zijn informatief. PathScribe controleert of voegt geen modifier toe, behalve de vaste TC- en 26-regel uit de inleiding van dit hoofdstuk.

De meegeleverde omschrijvingen zijn plaatshouders zoals "Modifier 59", als synthetisch gemarkeerd, omdat de tekst van de American Medical Association (AMA) onder licentie valt. Als u een licentie hebt, laadt u uw eigen omschrijvingen.

**4. Voorwaarden en afhankelijkheden.** Dit is een startpunt. Elke wijziging wordt een nieuwe versie die op goedkeuring wacht, dus een tweede persoon met goedkeuringsrechten is nodig voordat een wijziging van kracht wordt.

Setup step: Tier 7, step 1
Requires: Geen, dit is een startpunt.
Unlocks: [Facturatiewoordenboek (kostenregistratie)](#screen-billing_dictionary), [Openstaande goedkeuringen facturatieregels](#screen-pending_approvals)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-modifier_dictionary - CPT-modifierwoordenboek met actieve versie en codelijst]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Versielabel | Tekst, alleen-lezen | Niet van toepassing | De actieve woordenboekversie. Seed-versie-id `modifier-v-seed-2026`. Een tweede, openstaande gelicentieerde versie is ook meegeleverd. | Seed-versie |
| Code | Tekst, alleen-lezen | Niet van toepassing | De modifiercode. Meegeleverd: 26, TC, 22, 52, 53, 59, XE, XS, XP, XU, 76, 77, 90, 91, 92 (15 codes). | 15 meegeleverde codes |
| Omschrijving | Tekst | Verplicht bij het bewerken van een rij | De omschrijving die medewerkers zien. Opslaan maakt een nieuwe versie met de status PENDING_APPROVAL; die wordt nooit automatisch geactiveerd. | "Modifier {code}" (synthetisch) |
| Licentiestatus | Tekst, alleen-lezen | Niet van toepassing | Toont `synthetic` voor de meegeleverde plaatshouders. | synthetic |
| CSV uploaden | Bestand, CSV | Optioneel | Vervangt het woordenboek door een bestand met de kolommen Code en Description. Sjabloon: `ModifierDictionaryTemplate.csv`. Maakt een openstaande versie. | Geen |
| Licentiebevestiging | Selectievakje | Verplicht om te uploaden | U bevestigt dat u het recht hebt de geüploade omschrijvingen te gebruiken. Zonder dit gaat de upload niet door. | Niet aangevinkt |
| Versielabel voor de upload | Tekst | Optioneel | Geeft de openstaande versie een naam. | Geen |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Aanmaken of bewerken: `config:billing-modifiers:manage`. Een versie goedkeuren, afwijzen of activeren: `config:billing-tables:approve`, gebruikt bij [Openstaande goedkeuringen facturatieregels](#screen-pending_approvals). Beheerder en Laboratoriumdirecteur hebben beide standaard. De persoon die een versie heeft ingediend, kan die niet goedkeuren.

**Bekende beperkingen.** Het woordenboek is alleen een lijst. Geen enkel scherm of enkele controle dwingt een modifier af op een kostenpost. De meegeleverde tekst is synthetisch.

### RVU-codetabel (productiviteit) {#screen-rvu_code_map}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups > RVU-codetabel (productiviteit)

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Financiële en omzet-lookups**
**2. Onderhoudsonderdeel:** RVU-codetabel (productiviteit)

**3. Zakelijk doel en bereik.** Een kleine samengestelde lijst met CPT-codes en hun relatieve waarde-eenheden, gebruikt voor de productiviteit van de patholoog (werk-RVU) en als bronlijst waaruit het Facturatiewoordenboek CPT-codes kiest. Het is geen facturatiesysteem en bevat geen dollarbedragen. De seed is een deelverzameling van het relatieve-waardenbestand van de CMS-tariefstelling voor artsen 2026, gelabeld "CMS 2026 (April update)" (versie-id `rvu-v-seed-2026`). Meerdere rijen hebben geen werk-RVU en worden getoond als Niet geverifieerd.

**4. Voorwaarden en afhankelijkheden.** Dit is een startpunt. Een openstaande of afgewezen versie wordt nooit gebruikt om een kostenpost vast te stellen, dus niets wat u uploadt telt mee totdat een tweede persoon het goedkeurt.

Setup step: Tier 7, step 2
Requires: Geen, dit is een startpunt.
Unlocks: [Facturatiewoordenboek (kostenregistratie)](#screen-billing_dictionary), [Openstaande goedkeuringen facturatieregels](#screen-pending_approvals)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-rvu_code_map - RVU-codetabel met upload en bewerken]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Versie | Tekst, alleen-lezen | Niet van toepassing | Het label van de actieve versie. | CMS 2026 (April update) |
| Zoeken | Tekst | Optioneel | Filtert de tabel. | Geen |
| CSV uploaden | Bestand, CSV | Optioneel | Kolommen: Code of HCPCS, Description, WorkRVU. Respecteert de CMS-statuscode (alleen rijen met A, R en T zijn betaalbaar) en slaat modifierrijen over. Van geüploade rijen wordt het niveau afgeleid uit de omschrijving (standaard specimen) en het facturatietype is Global. Maakt een openstaande versie. Sjabloon: `RvuCodeMapTemplate.csv`. | Geen |
| Versielabel voor de upload | Tekst | Optioneel | Geeft de openstaande versie een naam. | Geen |

#### Bewerkvenster

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Code | Tekst | Verplicht | De CPT-code. Vergrendeld wanneer u een bestaande rij bewerkt. Een dubbele code wordt geweigerd. | Geen |
| Facturatiecode | Tekst | Verplicht | De PathScribe-facturatiecode. Vergrendeld bij het bewerken. | Geen |
| Omschrijving | Tekst | Optioneel | Gewone omschrijving. | Geen |
| Niveau | Keuze: specimen, block, stain, decant | Verplicht | Waartegen de code wordt geteld. | specimen |
| Componenttype | Keuze: TC, 26, Global | Verplicht | Het facturatietype waarop deze rij van toepassing is. | Global |
| Werk-RVU | Positief getal | Optioneel | Laat leeg om de rij als Niet geverifieerd te markeren. | Leeg |
| RVU PE | Getal | Optioneel | RVU voor praktijkkosten. | Leeg |
| RVU MP | Getal | Optioneel | RVU voor aansprakelijkheid. | Leeg |
| HCPCS | Tekst | Optioneel | Code van niveau II als die van toepassing is. | Leeg |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Bewerken of uploaden: `config:billing-rvu:manage`. Goedkeuren: `config:billing-tables:approve`. Beheerder en Laboratoriumdirecteur hebben beide standaard. Het vierogenprincipe is van toepassing.

**Bekende beperkingen.** De lijst is een samengestelde deelverzameling, niet het volledige CMS-bestand. De keuze van de basiscode op specimenniveau (88302, 88305, 88309) kan niet uit de casusgegevens worden afgeleid en is daarom niet automatisch.

### Facturatiewoordenboek (kostenregistratie) {#screen-billing_dictionary}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups > Facturatiewoordenboek (kostenregistratie)

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Financiële en omzet-lookups**
**2. Onderhoudsonderdeel:** Facturatiewoordenboek (kostenregistratie)

**3. Zakelijk doel en bereik.** De lijst met facturatieregels met versiebeheer. Elke regel koppelt een PathScribe-facturatiecode aan een CPT-code, een optionele HCPCS-code, een facturatietype en RVU-waarden, voor de onderneming of voor één locatie. Een locatie-uitzondering vervangt voor die locatie de regel van de onderneming. Kostenposten worden uit deze regels vastgesteld wanneer een casus wordt gefinaliseerd.

**4. Voorwaarden en afhankelijkheden.** De CPT-kiezer leest de RVU-codetabel en de modifier-selectievakjes lezen het CPT-modifierwoordenboek. Slaat u ze over, dan is het zoeken naar CPT leeg en worden geen modifiers aangeboden.

Setup step: Tier 7, step 3
Requires: [RVU-codetabel](#screen-rvu_code_map), [CPT-modifierwoordenboek](#screen-modifier_dictionary)
Unlocks: [Openstaande goedkeuringen facturatieregels](#screen-pending_approvals), [Facturatievrijgave](#screen-billing_release)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-billing_dictionary - Facturatiewoordenboek met locatiekeuze]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Bekijken | Keuze uit Onderneming of één Locatie | Verplicht | Van wie de tabel de regels toont. | Onderneming |
| Facturatiecode | Tekst, kolom | Niet van toepassing | De PathScribe-facturatiecode. | Geen |
| CPT | Tekst, kolom | Niet van toepassing | De CPT-code. | Geen |
| Omschrijving | Tekst, kolom | Niet van toepassing | De omschrijving van de regel. | Geen |
| RVU (werk) | Getal, kolom | Niet van toepassing | Werk-RVU. Een markering "Code Map: N" verschijnt wanneer de opgeslagen RVU afwijkt van de RVU-codetabel. | Geen |
| Geldig vanaf | Datum, kolom | Niet van toepassing | De datum waarop de actieve versie begint. | Geen |
| Bereik | Tekst, kolom | Niet van toepassing | Organisatiebreed, Locatie-override of Overgeërfd. | Geen |
| Status | Tekst, kolom | Niet van toepassing | De versiestatus. | Geen |
| Versies | Getal, kolom | Niet van toepassing | Hoeveel versies er bestaan. | Geen |
| Acties | Knoppen | Optioneel | Geschiedenis, Dupliceren, Nieuwe versie. | Niet van toepassing |

#### Venster Nieuwe versie, tabblad Facturatie en RVU

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Facturatiecode | Tekst | Verplicht voor een nieuwe code | De code waartoe deze regel behoort. | Geen |
| Bereik | Keuze uit Onderneming of een Locatie | Verplicht | Waar de regel van toepassing is. | Het bekeken bereik |
| Land | Keuze: US, UK, AU, CA, de 27 EU-lidstaten, NZ | Optioneel | Het land waarvoor de code bedoeld is. | Geen |
| HCPCS-code | Zoeken | Optioneel | Zoekt in het ingebouwde HCPCS-woordenboek van niveau II dat in het publieke domein valt. | Leeg |
| CPT-code | Zoeken in items van de RVU-codetabel | Verplicht | De CPT-code die wordt gefactureerd. | Geen |
| Omschrijving | Tekst | Optioneel | Omschrijving van de regel. | Leeg |
| Niveau | Keuze: specimen, block, stain, decant | Verplicht | Waartegen de code wordt geteld. | specimen |
| Componenttype | Keuze: TC, 26, Global | Verplicht | Het facturatietype. | Global |
| RVU werk, PE, MP | Getallen | Optioneel | De drie RVU-waarden. | Leeg |
| Geldig vanaf | Datum | Verplicht | Begindatum van de versie. | Geen |
| Reden voor wijziging | Tekst | Verplicht als het bereik al versies heeft | Bewaard bij de versie voor de audit. | Leeg |
| Notities | Tekst | Optioneel | Vrije notities. | Leeg |

#### Venster Nieuwe versie, tabblad Coderingsregels

Deze zijn informatief en worden nooit afgedwongen.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Vaak geassocieerde modifiers | Selectievakjes uit het CPT-modifierwoordenboek | Optioneel | Herinnering aan modifiers die vaak bij deze code horen. | Niets aangevinkt |
| Aantalregel | Tekst | Optioneel | Advies over aantallen. | Leeg |
| Bundelingsregel | Tekst | Optioneel | Advies over bundeling. NCCI-paren staan bij [NCCI-bewerkingsregels](#screen-ncci_edit_rules). | Leeg |
| Documentatie-eisen | Tekst met komma's als scheidingsteken | Optioneel | Wat het dossier moet laten zien. | Leeg |
| Onderdrukkingsadvies | Tekst | Optioneel | Markeert een regel met nul RVU als bedoeld, zodat de controle op nultarief stil blijft. | Leeg |

#### Venster Geschiedenis

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Versie | Getal, kolom | Niet van toepassing | Versienummer. | Geen |
| CPT | Tekst, kolom | Niet van toepassing | CPT van die versie. | Geen |
| RVU (werk) | Getal, kolom | Niet van toepassing | Werk-RVU. | Geen |
| Geldig vanaf, Geldig tot | Datums, kolommen | Niet van toepassing | De periode waarin de versie gold. | Geen |
| Status | Tekst, kolom | Niet van toepassing | DRAFT, PENDING_APPROVAL, ACTIVE, REJECTED of RETIRED. | Geen |
| Reden voor wijziging | Tekst, kolom | Niet van toepassing | De ingevoerde reden. | Geen |
| Acties | Knoppen | Optioneel | Dupliceren. Indienen ter goedkeuring (DRAFT-versies). Intrekken (ACTIVE-versies). | Niet van toepassing |

Een nieuwe versie wordt altijd als DRAFT opgeslagen. **Indienen ter goedkeuring** zet haar op PENDING_APPROVAL.

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Aanmaken, indienen en intrekken: `config:billing-rules:manage`. Goedkeuren of afwijzen: `config:billing-tables:approve`. Beheerder en Laboratoriumdirecteur hebben beide standaard. Auditgebeurtenissen worden geschreven voor ingediend, goedgekeurd en afgewezen ("Billing rule submitted for approval").

**Bekende beperkingen.** Er is geen prijs- of tariefveld (zie Tarieflijsten hierboven). Coderingsregels zijn alleen advies.
## Auto-codeermodule en aanhoudregels voor facturatie {#ch8-autocoding-holds}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups

**Auto-codeermodule: Gedeeltelijk.** Wat is gerealiseerd, is regelgebaseerd en wordt altijd door een persoon bevestigd:

- Voorgestelde codes op basis van gestructureerde casusgegevens: kleuringscategorieën, 88312 voor een speciale kleuring, 88342 en +88341 voor immunohistochemie per monster, en 88331 of 88332 voor een vriescoupe.
- Een terugvallijst met standaardcodes. Deze is niet gereed voor facturatie.
- Handmatige code-invoer in het codevenster en in het paneel voor facturatiecontrole.

**Niet gerealiseerd:** suggesties op basis van de verslagtekst door AI of natuurlijketaalverwerking. Dat werk wacht op advies van juristen en compliance. Basiscodes voor monsters (88302, 88305, 88309) worden niet automatisch bepaald. Het dichtstbijzijnde configuratiescherm is [Smart Capture](#screen-smart_capture).

**Facturatiecontroles bij ondertekening.** Bij ondertekening voert PathScribe zes controles uit en registreert het voor elke bevinding een deficiëntie:

| Trigger | Code | Ernst |
|---|---|---|
| A | `UNSUPPORTED_CPT_LEVEL` | COMPLIANCE_WARNING |
| B | `NCCI_BUNDLING_VIOLATION` (alleen paren met modifierindicator 0) | CRITICAL_REJECTION_RISK |
| C | `MISSING_DIAGNOSTIC_ICD10` | CRITICAL_REJECTION_RISK |
| D | `UNATTACHED_ANCILLARY_ORDER` | COMPLIANCE_WARNING |
| E | `MODIFIER_MISMATCH` | CRITICAL_REJECTION_RISK |
| F | `ZERO_FEE_MAPPING_ERROR` | REVENUE_LEAKAGE |

`MISSING_CHARGE`, `POST_SIGNOUT_CORRECTION` en `BLOCK_DELETED` worden buiten de ondertekening om gemeld. Deze controles verhinderen nooit dat de patholoog ondertekent. Een melding zegt dat facturatiepunten voor QA zijn gemarkeerd en de bevindingen gaan naar QA. Zij blokkeren wel de export: een casus kan niet worden geëxporteerd zolang een deficiëntie OPEN of UNDER_REVIEW is. De statussen zijn OPEN, UNDER_REVIEW, RESOLVED en OVERRIDDEN_WITH_JUSTIFICATION.

### NCCI-bewerkingsregels (bundeling) {#screen-ncci_edit_rules}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups > NCCI-bewerkingsregels (bundeling)

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Financiële en omzet-lookups**
**2. Onderhoudsonderdeel:** NCCI-bewerkingsregels (bundeling)

**3. Zakelijk doel en bereik.** Bevat de procedure-tot-procedureparen van de National Correct Coding Initiative (NCCI): een code van kolom 1 en een code van kolom 2 die niet samen mogen worden gefactureerd. Een paar met modifierindicator 0 veroorzaakt bij ondertekening een deficiëntie. Echte CMS-gegevens worden niet meegeleverd. De seed is één synthetisch paar (88305 met 88300, indicator 0, kwartaal `DEMO`) en het scherm toont een waarschuwing. De licentiehouder uploadt de CSV.

**4. Voorwaarden en afhankelijkheden.** Dit is een startpunt. Een upload of wijziging wordt een openstaande import, dus goedkeuring is nodig voordat de paren worden gebruikt.

Setup step: Tier 7, step 4
Requires: Geen, dit is een startpunt.
Unlocks: [Openstaande goedkeuringen facturatieregels](#screen-pending_approvals)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-ncci_edit_rules - NCCI-bewerkingsregels met waarschuwing over synthetische gegevens en paartabel]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Kwartaalversie | Tekst, bijvoorbeeld `2026Q3` | Verplicht om te uploaden | Geeft de import een naam. | Geen |
| CSV uploaden | Bestand, CSV | Optioneel | Kolommen: Column 1, Column 2, Modifier Indicator (0, 1 of 9), Effective Date, Deletion Date. Sjabloon: `NcciPtpEditTemplate.csv`. Maakt een openstaande import. | Geen |
| Paartabel | Tabel, alleen-lezen | Niet van toepassing | Kolom 1, kolom 2, indicator en data van de actieve import. | Eén synthetisch paar |
| Waarschuwing synthetische gegevens | Melding | Niet van toepassing | Wordt getoond zolang de actieve import de synthetische seed is. | Getoond |

#### Bewerkvenster

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Modifierindicator | Keuze: 0 nooit omzeilen, 1 omzeilbaar met een modifier, 9 edit is niet van toepassing | Verplicht | Alleen paren met 0 veroorzaken bij ondertekening een deficiëntie. | Huidige waarde |
| Verwijderdatum | Datum | Optioneel | De datum waarop het paar niet meer geldt. | Leeg |

Elke wijziging verzendt de hele tabel opnieuw als een nieuwe import met de status PENDING_APPROVAL, genaamd "Manual edit" met het paar.

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Uploaden of bewerken: `config:billing-ncci:manage`. Goedkeuren: `config:billing-tables:approve`. Beheerder en Laboratoriumdirecteur hebben beide standaard.

**Bekende beperkingen.** Er worden geen echte NCCI-gegevens meegeleverd. Indicatoren 1 en 9 veroorzaken geen deficiëntie.

### Openstaande goedkeuringen facturatieregels {#screen-pending_approvals}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups > Openstaande goedkeuringen facturatieregels

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Financiële en omzet-lookups**
**2. Onderhoudsonderdeel:** Openstaande goedkeuringen facturatieregels

**3. Zakelijk doel en bereik.** De goedkeuringswachtrij voor de tweede persoon. Versies van facturatieregels, versies van het modifierwoordenboek, NCCI-imports, RVU-versies en code-importtaken wachten hier. Niets wordt van kracht totdat een andere persoon dan de indiener het goedkeurt.

**4. Voorwaarden en afhankelijkheden.** De wachtrij toont alleen items die de eerdere schermen hebben ingediend. De goedkeurder heeft de goedkeuringsmachtiging nodig en mag niet de indiener zijn.

Setup step: Tier 7, step 5
Requires: [CPT-modifierwoordenboek](#screen-modifier_dictionary), [RVU-codetabel](#screen-rvu_code_map), [Facturatiewoordenboek (kostenregistratie)](#screen-billing_dictionary), [NCCI-bewerkingsregels](#screen-ncci_edit_rules)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-pending_approvals - Tabellen Openstaande goedkeuringen facturatieregels en Openstaande woordenboekwijzigingen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Facturatiecode | Tekst, kolom | Niet van toepassing | Regeltabel: de code van de regel. | Geen |
| CPT | Tekst, kolom | Niet van toepassing | Regeltabel. | Geen |
| RVU (werk) | Getal, kolom | Niet van toepassing | Regeltabel. | Geen |
| Ingangsdatum | Datum, kolom | Niet van toepassing | Regeltabel. | Geen |
| Bereik | Tekst, kolom | Niet van toepassing | Regeltabel. | Geen |
| Opgesteld door | Tekst, kolom | Niet van toepassing | Regeltabel: de persoon die de regel heeft opgesteld. | Geen |
| Ingediend door | Tekst, kolom | Niet van toepassing | Regeltabel: de persoon die de regel heeft ingediend. | Geen |
| Reden voor wijziging | Tekst, kolom | Niet van toepassing | Regeltabel. | Geen |
| Woordenboek | Tekst, kolom | Niet van toepassing | Woordenboektabel: welk woordenboek (code-import, modifier, NCCI, RVU). | Geen |
| Label | Tekst, kolom | Niet van toepassing | Woordenboektabel: het label van de versie of taak. | Geen |
| Goedkeuren | Knop | Optioneel | Activeert het item. Bij een code-import wordt de hele taak toegepast. Als u het item zelf hebt ingediend, is de knop vergrendeld en legt een hint uit waarom. | Niet van toepassing |
| Afwijzen | Knop | Optioneel | Opent een vak voor de reden; met **Afwijzing bevestigen** beëindigt u het item. | Niet van toepassing |
| Reden van afwijzing | Tekst | Verplicht om af te wijzen | Bewaard bij de beslissing. | Leeg |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Goedkeuren en afwijzen: `config:billing-tables:approve`. Beheerder en Laboratoriumdirecteur hebben deze standaard. Beslissingen schrijven auditgebeurtenissen.

**Bekende beperkingen.** In een systeem met één gebruiker kan niemand goedkeuren, omdat de indiener zijn eigen item niet kan goedkeuren.

### Facturatievrijgave {#screen-billing_release}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Facturatievrijgave

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** Facturatievrijgave

**3. Zakelijk doel en bereik.** De aanhoudregels. Elke regel zegt op welke kostenposten zij van toepassing is en wat ermee moet gebeuren: direct vrijgeven, een tijd aanhouden of vrijgeven in een geplande batch, met of zonder handmatige controle. De meest specifieke passende regel wint. PathScribe bepaalt wat en wanneer. De interface-engine verplaatst het bericht.

**Specificiteitspunten:** faciliteit 100, facturatietype 8, casustypen 4, aanvragende locatie 4, patholoog 2, amendement 1.

**Als geen regel past:** vrijgeven op de mijlpaal, handmatige controle aan, automatische vrijgave aan.

**Geldt altijd:** een amendementswijziging wordt voor controle geparkeerd; een kostenpost waarvan de CPT geen koppeling heeft, wordt geparkeerd (`unmappedCpt`); een gesplitste casus zonder technische faciliteit wordt geparkeerd (`missingTechnicalFacility`).

**4. Voorwaarden en afhankelijkheden.** Een regel kan een faciliteit of aanvragende locatie noemen, dus richt die eerst in. Een geplande batch wordt verzonden volgens een tijdschema dat in Verzendschema's is vastgelegd.

Setup step: Tier 7, step 7
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Kostenvrijgavetriggers](#screen-billing_type_triggers), [Verzendschema's](#screen-delivery_schedules)
Unlocks: [Voorbeeld facturatie-export](#screen-dft_export_preview)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-billing_release - Regellijst van Facturatievrijgave met paneel Een kost uitproberen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Facturatietype | Keuze: TC, 26, Global, any | Verplicht | Criterium. | any |
| Casustypen | Lijst met komma's als scheidingsteken | Optioneel | Criterium. | Leeg (alle) |
| Aanvragende locatie | Keuze uit locaties | Optioneel | Criterium. | Alle |
| Primaire patholoog | Keuze uit medewerkers | Optioneel | Criterium. | Alle |
| Amendement | Keuze: any, original, amended | Verplicht | Criterium. | any |
| Vrijgavemodus | Keuze: DYNAMIC_WITH_HOLD, SCHEDULED_BATCH | Verplicht | Vrijgeven na een aanhouding, of bij de volgende batch. | DYNAMIC_WITH_HOLD |
| Aanhoudduur (minuten) | Geheel getal, 0 tot 43.200 | Verplicht voor een aanhouding | Hoe lang wordt aangehouden vóór de vrijgave. | 0 |
| Batchschema | Schema-instellingen | Verplicht voor een batch | De editor begint bij wekelijks, maandag tot en met vrijdag, 22:00, America/New_York. | Zie links |
| Automatisch vrijgeven na voltooiing | Ja/Nee | Optioneel | Vrijgeven wanneer de aanhouding eindigt. | Aan |
| Handmatige controle vereist | Ja/Nee | Optioneel | Een persoon controleert vóór de vrijgave. | Aan |
| Een kost uitproberen | Testpaneel | Optioneel | Voert de beslissing uit voor een voorbeeldkostenpost en toont de regel die paste. | Niet van toepassing |

De regelcontroles geven deze probleemcodes: `billingTypeInvalid`, `modeInvalid`, `holdInvalid`, `batchRequired`, `amendmentInvalid`, `caseTypesInvalid`. Drie regels voor de onderneming (TC, 26, Global) zijn meegeleverd, elk DYNAMIC_WITH_HOLD, 0 minuten, automatische vrijgave aan, handmatige controle aan.

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:billing-release:manage`. Beheerder en Laboratoriumdirecteur hebben deze standaard. Opslaan wordt geaudit. Berichten vrijgeven, aanhouden, terugtrekken en opnieuw verzenden zijn afzonderlijke interfacemachtigingen (`interface:outbound:release`, `hold`, `retract`, `resend`), die Beheerder heeft.

**Bekende beperkingen.** Alleen in de demonstratieservice gekoppeld aan de Uitgaande wachtrij.

### Voorbeeld facturatie-export {#screen-dft_export_preview}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups > Voorbeeld facturatie-export

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Financiële en omzet-lookups**
**2. Onderhoudsonderdeel:** Voorbeeld facturatie-export

**3. Zakelijk doel en bereik.** Zoek een casus op en zie wat PathScribe voor facturatie zou verzenden. De JSON-payload is wat PathScribe verzendt. De HL7 DFT^P03-tekst is een voorbeeld van wat de interface-engine zou bouwen. PathScribe maakt of verzendt geen HL7. X12 837P, KVDT en SESAM-Vitale bestaan niet.

**4. Voorwaarden en afhankelijkheden.** U hebt een gefinaliseerde casus met kostenposten nodig. Als de casus een openstaande facturatiedeficiëntie heeft, is de export geblokkeerd.

Setup step: Tier 7, step 10
Requires: [Facturatiewoordenboek (kostenregistratie)](#screen-billing_dictionary), [Facturatievrijgave](#screen-billing_release), [Jurisdictiebetalingstoewijzing](#screen-jurisdiction_payment_mappings)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-dft_export_preview - Voorbeeld facturatie-export met JSON-payload en HL7-voorbeeld]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Casus-id of accessienummer | Tekst | Verplicht | De casus waarvan u een voorbeeld wilt zien. | Leeg |
| JSON-payload | Tekst, alleen-lezen | Niet van toepassing | De webhookpayload plus de financiële klasse. | Geen |
| HL7 DFT^P03-voorbeeld | Tekst, alleen-lezen | Niet van toepassing | Alleen ter illustratie. | Geen |
| Naar facturatie-engine sturen | Knop | Optioneel | Verzendt naar de gesimuleerde engine (label "Gesimuleerd"). Geblokkeerd zolang een deficiëntie openstaat. | Niet van toepassing |
| Financiële klasse sturen (voorbeeld) | Knop | Optioneel | Toont de payload van de financiële klasse. | Niet van toepassing |

**7. Machtigingen.** Openen en gebruiken: `config:interface-preview:view`. Beheerder en Laboratoriumdirecteur hebben deze standaard.

**Bekende beperkingen.** Het verzenden is gesimuleerd. Er is geen echte facturatie-engine gekoppeld.

## Configuratie van kankerregisters {#ch8-cancer-registry}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows

**Wat er bestaat.** PathScribe heeft 14 definities van kankerregisters en 12 definities van registers voor baarmoederhalsscreening. Elk kankerregister is gemarkeerd als `configurable`, wat betekent dat de specificatie niet is getoetst aan de gepubliceerde specificatie van het register. Van de screeningsregisters zijn er drie als geverifieerd gemarkeerd: het Britse beheersysteem voor baarmoederhalsscreening (CSMS), PALGA in Nederland en het Australische National Cancer Screening Register (NCSR).

| Id kankerregister | Genoemd verzendformaat |
|---|---|
| `naaccr_us` | NAACCR XML |
| `epath_npcr_us` | HL7 v2 ORU |
| `cpac_canada` | NAACCR XML |
| `cosd_uk` | COSD XML (GB_EW) |
| `phs_scotland` | HL7 v2 ORU |
| `nicr_northern_ireland` | HL7 v2 ORU |
| `ncri_ireland` | HL7 v2 ORU |
| `nkr_netherlands` | PALGA protocol |
| `inca_france` | CDA CR-ACP |
| `adt_gekid_germany` | oBDS XML |
| `bcr_belgium` | HD-S4S JSON |
| `aihw_australia` | HL7 v2 ORU |
| `nz_cancer_registry` | HL7 v2 ORU |
| `kccr_korea` | HL7 v2 ORU |

**Wat elk formaat vandaag betekent.** PathScribe bouwt één gestructureerde JSON-payload. Het genoemde formaat is het doel waarnaar de interface-engine zou vertalen. PathScribe schrijft geen NAACCR XML, COSD XML, oBDS, CDA of de andere formaten. **Er is geen kankerregister en geen screeningsregister voor Spanje**, hoewel Spanje in het product een jurisdictie is. **NAACCR XML als batchbestand: Niet gerealiseerd.** **MIPS en MACRA: Niet gerealiseerd** (zie [Kwaliteits- en volksgezondheidsrapportage](#ch8-quality-reporting)).

**Ingebouwde meldingsregels.**

- De trigger is uitsluitend de ondertekening van chirurgische pathologie. Cytologie veroorzaakt nooit een kankermelding. Melden gebeurt zonder terugkoppeling (fire-and-forget) en houdt de ondertekening nooit tegen.
- Verplichte gegevens: geboortedatum, diagnosedatum, primaire diagnose en ICD-O-code. Een register dat op een patiëntidentificatie werkt, heeft ook die identificatie nodig. Een melding met ontbrekende gegevens wordt aangehouden als `HOLD_MISSING_MANDATORY_DATA` en verschijnt bij Registeruitzonderingen.
- Meldingsplicht: alleen de gedocumenteerde NAACCR-uitzonderingen zijn ingebouwd (carcinoma in situ van de cervix en CIN III, prostatische intra-epitheliale neoplasie III, en basaalcel- en plaveiselcelcarcinoom van de huid). De lijst is niet uitputtend.
- Verzendpoort: een validatie-instantie verzendt nooit echte casus. Een productie-instantie houdt een melding aan totdat de livegang voor dat register is goedgekeurd.
- Opt-out van de patiënt: de instelling **Honours opt-out** staat standaard uit. Als de instelling uit staat, wordt een patiënt die zich heeft afgemeld toch gemeld en legt het auditlogboek dat vast.

### Kankerregistratierapportage {#screen-cancer_registry_settings}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Kankerregistratierapportage

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Onderhoudsonderdeel:** Kankerregistratierapportage

**3. Zakelijk doel en bereik.** Kiest aan welk kankerregister de onderneming standaard meldt en laat een faciliteit dit overschrijven. Het bevat ook de goedkeuring voor livegang van elk register. Elke registerrij toont zijn specificatiestatuslabel, zijn jurisdicties, zijn identificatie en zijn verzendformaat.

**4. Voorwaarden en afhankelijkheden.** De uitzonderingen per faciliteit kiezen uit de faciliteitenlijst, dus richt eerst de faciliteiten in. Zonder gekozen register wordt geen kankermelding gemaakt.

Setup step: Tier 7, step 11
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Batchbestanden voor registers](#screen-batch_registry_feed), [Brits kankerregister (COSD)](#screen-cosd_destination), [Elektronische pathologie (VS)](#screen-us_epath)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-cancer_registry_settings - Standaardregister van de onderneming, uitzonderingen per faciliteit en paneel Registerverbinding]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Ondernemingsstandaard (register) | Keuze uit Geen plus de 14 registers | Verplicht | Het register dat wordt gebruikt voor elke faciliteit zonder uitzondering. | Geen (de demonstratieseed zet Metro General op `naaccr_us`) |
| Honours opt-out | Selectievakje | Optioneel | Indien aangevinkt, wordt een patiënt die zich heeft afgemeld niet gemeld. | Uit |
| Opslaan | Knop | Optioneel | Slaat de twee bovenstaande velden op. | Niet van toepassing |
| Register (livegang) | Keuze | Verplicht als meer dan één register in gebruik is | Kiest welk register het verbindingspaneel hieronder toont. | Het eerste in gebruik |
| Overschrijving toevoegen | Knop | Optioneel | Opent een nieuwe rij voor een uitzondering per faciliteit. | Niet van toepassing |
| Faciliteit | Keuze uit faciliteiten | Verplicht voor een uitzondering | De faciliteit waarop de uitzondering van toepassing is. | Geen |
| Register | Keuze uit de 14 registers | Verplicht voor een uitzondering | Het register voor die faciliteit. | Geen |
| Opslaan, Annuleren, Verwijderen | Knoppen | Optioneel | Een uitzondering opslaan of verwerpen, of een opgeslagen uitzondering verwijderen. | Niet van toepassing |

#### Paneel Registerverbinding (livegang)

Hetzelfde paneel verschijnt bij [Registerrapportage cytologie](#screen-cytology_registry). Het leidt een register door Pending, Testing, Validated en Live. Een instantie heeft een van twee rollen. Een validatie-instantie verzendt nooit echte gegevens en voert alleen de testsuite uit. Een productie-instantie verzendt echte uitslagen alleen naar live registers met een geldige goedkeuring; anders worden uitslagen aangehouden en bij goedkeuring ingehaald.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Sjabloonversie en status | Tekst, alleen-lezen | Niet van toepassing | De versie van het registersjabloon en of die actueel is. | Geen |
| Wat er is gewijzigd | Lijst, alleen-lezen | Niet van toepassing | Wijzigingen sinds de versie die u het laatst hebt bevestigd. | Geen |
| Verwijzing naar de overeenkomst | Tekst | Verplicht om vast te leggen | De verwijzing naar de overeenkomst voor gegevensdeling. **Overeenkomst vastleggen** slaat die op. | Leeg |
| Testsuite uitvoeren | Knop (validatie-instantie) | Optioneel | Voert de synthetische testcasus uit (`SYN-`-patiënten): 3 screening en 2 kanker. Ten minste 1 geaccepteerde uitslag is nodig (`REGISTRY_GO_LIVE_MIN_TEST_ACCEPTS`). | Niet van toepassing |
| Validatierecord exporteren | Knop (validatie-instantie) | Optioneel | Downloadt het bestand met het validatierecord. | Niet van toepassing |
| Bestand met validatierecord | JSON-bestand (productie-instantie) | Optioneel | Importeert een record dat uit een validatie-instantie is geëxporteerd. | Geen |
| Controles voor livegang | Lijst, alleen-lezen | Niet van toepassing | `agreementRecorded`, `templateCurrent`, `validationRecord`, `testEvidence`, `specificationConfirmed`, `codesMapped`, `identifierHold`, `overridesReviewed`. | Geen |
| Verwijzing naar de testgoedkeuring van het register | Tekst | Optioneel | De eigen goedkeuringsverwijzing van het register voor de test. | Leeg |
| Specificatie bevestigd | Selectievakje | Verplicht voor registers met `configurable` | U bevestigt de specificatie aan de hand van die van het register zelf. | Niet aangevinkt |
| Livegang aanvragen | Knop | Optioneel | Start de goedkeuring. | Niet van toepassing |
| Ik keur goed als | Keuze: Sitebeheerder, Laboratoriumdirecteur, Gedelegeerde van de laboratoriumdirecteur | Verplicht om goed te keuren | De hoedanigheid waarin u goedkeurt. | Geen |
| Goedkeuren met mijn inloggegevens | Knop | Optioneel | Vraagt u uw inloggegevens opnieuw in te voeren en legt dan de goedkeuring vast. | Niet van toepassing |
| Aanvraag intrekken, Livemelding stoppen | Knoppen | Optioneel | Een openstaande aanvraag annuleren, of een live register stoppen. | Niet van toepassing |
| Onderdeel van het sjabloon | Keuze | Verplicht voor een lokale regel | Welk deel van het sjabloon een lokale wijziging raakt. | Geen |
| Wat de regel doet | Tekst | Verplicht voor een lokale regel | Beschrijft de lokale wijziging of adapterregel. | Leeg |
| Regel toevoegen, Verwijderen, Beoordeling bevestigen | Knoppen | Optioneel | Lokale regels beheren en bevestigen dat ze zijn beoordeeld. | Niet van toepassing |
| De persoon die livegang aanvraagt, mag die ook goedkeuren | Ja/Nee (alleen productie) | Optioneel | Staat toe dat de aanvrager goedkeurt. | Aan |
| Vereiste goedkeuringen | Geheel getal, 1 tot 3 (alleen productie) | Optioneel | Hoeveel goedkeuringen nodig zijn. | 1 |
| Geschiedenis van livegang | Lijst, alleen-lezen | Niet van toepassing | Elke aanvraag, goedkeuring en stopzetting. | Geen |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. De registerinstellingen wijzigen: `config:cancer-registry:manage`. De testsuite uitvoeren: `registry:test-suite:run`. Livegang goedkeuren: `registry:live-register:approve`. Beheerder heeft deze standaard; de Laboratoriumdirecteur heeft `config:cancer-registry:manage` niet, en heeft de goedkeuring voor livegang via een eigen seed. Goedkeuring vereist het opnieuw invoeren van inloggegevens.

**Bekende beperkingen.** Het vastleggen van ICD-O-3 is nog open: het tabblad ICD-O van het codevenster bewaart SNOMED-morfologie-identificaties, geen codes zoals `8500/3`. De registerspecificaties zijn niet geverifieerd. Dit scherm heeft in de toegangstabel geen machtiging voor wijzigingen op sectieniveau; de knoppen worden grijs via de machtigingsknoppen.
### Brits kankerregister (COSD) {#screen-cosd_destination}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Brits kankerregister (COSD)

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** Brits kankerregister (COSD)

**3. Zakelijk doel en bereik.** Bestemmingsinstellingen voor de Cancer Outcomes and Services Dataset (COSD), op het scherm getoond als COSD (Engeland). U stelt het transportlabel, het correctievenster en de niet-werkdagen eenmaal in voor de onderneming en eventueel eenmaal per faciliteit. De elementnamen in het controlepaneel zijn het vereenvoudigde model van PathScribe, niet het officiële COSD-schema.

**4. Voorwaarden en afhankelijkheden.** Kies eerst het COSD-register op het scherm voor kankerregisters. Wanneer u het item van een faciliteit verwijdert, valt die faciliteit terug op de instellingen van de onderneming.

Setup step: Tier 7, step 12
Requires: [Kankerregistratierapportage](#screen-cancer_registry_settings)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-cosd_destination - COSD-bestemmingsinstellingen met controlepaneel en calculator voor de correctietermijn]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Bereik | Onderneming of één faciliteit | Verplicht | Eén item per bereik. | Onderneming |
| Transport | Keuze: restMtls, sftp, portalUpload | Verplicht | Alleen een label. De interface-engine bewaart het adres en de inloggegevens. | Beveiligde API (restMtls) |
| Werkdagen voor correctie | Geheel getal, 1 tot 30 | Verplicht | Aantal werkdagen om een geweigerde indiening te corrigeren. | 5 |
| Niet-werkdagen | Lijst met data, JJJJ-MM-DD | Optioneel | Dagen die niet als werkdag tellen. Er wordt er geen aangenomen. | Geen |
| Verwijderen | Knop | Optioneel | Alleen items van faciliteiten; zet terug naar de instellingen van de onderneming. | Niet van toepassing |

#### Een voorbeeldindiening controleren

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| NHS-nummer | Tekst | Verplicht | De voorbeeldpatiënt. | Leeg |
| Geboortedatum | Datum | Verplicht | Voorbeeld. | Leeg |
| Diagnosedatum | Datum | Verplicht | Voorbeeld. | Leeg |
| ICD-O-3 | Tekst | Verplicht | Voorbeeld. | Leeg |
| Primaire diagnose | Tekst | Verplicht | Voorbeeld. | Leeg |

#### Wanneer is een correctie verschuldigd?

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Geweigerd op | Datum | Verplicht | Telt de werkdagen voor correctie vooruit, waarbij weekenden en uw niet-werkdagen worden overgeslagen. | Leeg |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:cosd-destination:manage`. Beheerder en Laboratoriumdirecteur hebben deze standaard.

**Bekende beperkingen.** De punten die nog aan de echte COSD-specificatie moeten worden getoetst, zijn: elementnamen, de lijst met verplichte items, waarden van codelijsten, datumregels, de indieningsenvelop, weigeringscodes en het begin van het correctievenster.

### Elektronische pathologie (VS) {#screen-us_epath}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Elektronische pathologie (VS)

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** Elektronische pathologie (VS)

**3. Zakelijk doel en bereik.** Elektronische pathologierapportage (ePath) aan Amerikaanse staatskankerregisters. Een generiek basisbericht van het National Program of Cancer Registries (NPCR) (HL7 v2.5.1 ORU^R01) wordt aangepast door een staatsprofiel en verzonden via een transport (PHIN-MS, SFTP, Direct TCP of een HTTPS-API). De staat wordt gekozen uit de staat van de uitvoerende faciliteit, nooit uit het adres van de patiënt. Er wordt alleen een als voorbeeld gelabeld profiel meegeleverd.

**4. Voorwaarden en afhankelijkheden.** De staat van de faciliteit moet in het faciliteitenwoordenboek zijn ingesteld. Zonder faciliteit of profiel wordt de melding geparkeerd (`routing:noFacility`, `routing:noProfile`) en wordt de ondertekening niet aangehouden.

Setup step: Tier 7, step 13
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Kankerregistratierapportage](#screen-cancer_registry_settings)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-us_epath - Lijst met ePath-profielen voor de VS en toewijzingen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Toewijzingsbereik | Onderneming of één faciliteit | Verplicht | Waar een profiel van toepassing is. Een faciliteit valt terug op een profiel voor haar eigen staat en daarna op de standaard van de onderneming. | Onderneming |
| Toegewezen profiel | Keuze uit profielen | Verplicht | Het profiel dat wordt gebruikt. | Geen |

#### Profielvenster

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Staat | Twee letters | Verplicht | De staat waarvoor het profiel is. | Geen |
| Naam | Tekst | Optioneel | Weergavenaam. | Leeg |
| Verplichte velden | Lijst met codes van segmentvelden zoals `PID-11` | Optioneel | Moeten zijn ingevuld. Nooit `MSH`. Mogen niet overlappen met Optionele velden. | Geen |
| Optionele velden | Lijst met codes van segmentvelden | Optioneel | Verzonden wanneer aanwezig. | Geen |
| Transport | Keuze: PHIN-MS, SFTP, Direct TCP, HTTPS API | Verplicht | Transportlabel voor de interface-engine. | Geen |
| Welke faciliteit de staat bepaalt | Keuze: faciliteit van de technische component, beoordelende faciliteit | Verplicht | Kiest de faciliteit waarvan de staat het profiel selecteert. | Technische component |
| Alleen definitief verslag | Ja/Nee | Optioneel | Controle. | Uit |
| ICD-O-morfologie vereist | Ja/Nee | Optioneel | Controle. | Uit |
| SNOMED vereist | Ja/Nee | Optioneel | Controle. | Uit |
| Monsteridentificatie vereist | Ja/Nee | Optioneel | Controle. | Uit |
| NPI van de zorgverlener vereist | Ja/Nee | Optioneel | Controle. Mislukt bij demonstratiecasus, die geen NPI hebben. | Uit |
| Staatspecifieke velden | Rijen met veld, modus (verplicht of vast), waarde | Optioneel | Extra staatsregels. | Geen |

Een melding die een controle niet doorstaat, wordt voor beoordeling aangehouden (`HOLD_EPATH_PROFILE`).

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:us-epath:manage`. Beheerder en Laboratoriumdirecteur hebben deze standaard.

**Bekende beperkingen.** De OBR- en OBX-identificaties zijn standaardwaarden, die nog aan de NPCR-gids moeten worden getoetst. Geen enkel staatsprofiel is geverifieerd.

### Registerrapportage cytologie {#screen-cytology_registry}
Breadcrumb: Start > Configuratie > Cytologie > Registerrapportage

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Cytologie** > sectie **Registerrapportage**
**2. Onderhoudsonderdeel:** Registerrapportage

**3. Zakelijk doel en bereik.** Rapportage van het bevolkingsonderzoek naar baarmoederhalskanker, gescheiden van de kankerregisters. Een screeninguitslag veroorzaakt nooit een kankermelding. Er zijn 12 definities: `csms_uk`, `nicsp_northern_ireland`, `sccrs_scotland`, `cervicalcheck_ireland`, `palga_netherlands`, `germany_okfe`, `france_crcdc`, `belgium_chr`, `ncsr_australia`, `ncsp_new_zealand`, `canada_provincial` en `kncsp_kccr_korea`. Er is geen screeningsregister voor de VS of Spanje. De koppeling van elk register verbindt uw cytologiecategorieën met de codes van het register voor adequaatheid, primaire interpretatie, aanvullende interpretatie en aanbeveling.

**4. Voorwaarden en afhankelijkheden.** De koppeltabel toont uw cytologische interpretatiecategorieën, dus die komen eerst. Slaat u ze over, dan is de tabel leeg.

Setup step: Tier 7, step 14
Requires: [Interpretatie en aanbevelingen](#screen-cytology_categories), [Nomenclatuursysteem](#screen-cytology_nomenclature), [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Batchbestanden voor registers](#screen-batch_registry_feed)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_registry - Registerrapportage cytologie met standaard van de onderneming, uitzonderingen en koppeltabel]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Ondernemingsstandaard (register) | Keuze uit Geen plus de 12 registers | Verplicht | Gebruikt door elke faciliteit zonder uitzondering. | Geen |
| Opslaan | Knop | Optioneel | Slaat de standaard op. | Niet van toepassing |
| Overschrijving toevoegen | Knop | Optioneel | Start een uitzondering voor een faciliteit. | Niet van toepassing |
| Faciliteit | Keuze uit faciliteiten | Verplicht voor een uitzondering | De faciliteit. | Geen |
| Register | Keuze uit de 12 registers | Verplicht voor een uitzondering | Het register ervoor. | Geen |
| Opslaan, Annuleren, Configureren, Verwijderen | Knoppen | Optioneel | Een uitzondering opslaan of verwerpen, de configuratie ervan openen, of haar verwijderen. | Niet van toepassing |

#### Registerconfiguratie

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Register | Keuze | Verplicht | Het register dat wordt geconfigureerd. | Het eerste |
| Een uitslag aanhouden totdat elke categorie die hij gebruikt een registercode heeft | Selectievakje | Optioneel | Uitgeschakeld voor ingebouwde registers. | Uit |
| Een uitslag aanhouden tenzij de patiënt een geverifieerde identificatie heeft | Selectievakje | Optioneel | Alleen getoond wanneer het register een identificatieformaat heeft. | Uit |
| Categorie | Tekst, kolom | Niet van toepassing | Uw cytologiecategorie. | Geen |
| Veld | Tekst, kolom | Niet van toepassing | Adequaatheid, primaire interpretatie, aanvullende interpretatie of aanbeveling. | Geen |
| Registercode | Tekst | Optioneel | De code van het register. | Leeg |
| Registertekst | Tekst | Optioneel | De tekst van het register, voor registers die tekstcodering gebruiken. | Leeg |
| Registerconfiguratie opslaan | Knop | Optioneel | Slaat de koppeling op. | Niet van toepassing |

Het **paneel Registerverbinding** wordt beschreven bij [Kankerregistratierapportage](#screen-cancer_registry_settings). Hier gebruikt het de screeningsmachtigingen.

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:screening-registry:manage`. De testsuite uitvoeren: `registry:test-suite:run`. Livegang goedkeuren: `registry:live-register:approve`. Beheerder heeft deze standaard. De Laboratoriumdirecteur heeft `config:screening-registry:manage` standaard niet.

**Bekende beperkingen.** Drie registers zijn als geverifieerd gemarkeerd (CSMS, PALGA, NCSR); de andere zijn configureerbaar en niet geverifieerd. Duitsland, Frankrijk en België zijn registers met batchbestanden (zie Batchbestanden voor registers).

### Batchbestanden voor registers {#screen-batch_registry_feed}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Batchbestanden voor registers

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Onderhoudsonderdeel:** Batchbestanden voor registers

**3. Zakelijk doel en bereik.** Voor een register dat bestanden afneemt in plaats van berichten, bepaalt een batchprofiel welke records erin gaan, hoe het bestand is opgebouwd en hoe het heet. Formaten: CSV, XML en NAACCR XML. **NAACCR XML staat in de lijst maar is Niet gerealiseerd**: het meegeleverde NAACCR-profiel is uitgeschakeld. Eén voorbeeldprofiel wordt meegeleverd (gebaseerd op `germany_okfe`, CSV, scheidingsteken `;`, 10 kolommen, uit) en is geen programmaspecificatie. Echte programma-indelingen zijn Niet gerealiseerd.

**4. Voorwaarden en afhankelijkheden.** Een batch wordt gemaakt volgens het tijdschema in Verzendschema's en door de interface-engine via SFTP verzonden. Kies eerst het register op het scherm voor kanker of cytologie.

Setup step: Tier 7, step 15
Requires: [Kankerregistratierapportage](#screen-cancer_registry_settings), [Registerrapportage cytologie](#screen-cytology_registry), [Verzendschema's](#screen-delivery_schedules)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-batch_registry_feed - Profielkaarten van Batchbestanden voor registers]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Wachtend | Tellers, alleen-lezen | Niet van toepassing | **Wachtende bekijken** toont wachtend, nu verschuldigd, achtergehouden, achterstallig en volgend bestand. | Geen |
| Bestand nu maken | Knop | Optioneel | Maakt handmatig een bestand. Het wordt eenmaal gedownload en nooit opgeslagen. Een manifest vermeldt SHA-256, volgnummer, aantallen en achtergehouden records. | Niet van toepassing |
| Inschakelen, Uitschakelen | Knop | Optioneel | Schakelt het profiel in. | Uit |
| Bewerken | Knop | Optioneel | Opent de profieleditor. | Niet van toepassing |
| Verwijderen | Knop | Optioneel | Niet beschikbaar voor meegeleverde profielen. | Niet van toepassing |
| Uitvoerstatus | Tekst, alleen-lezen | Niet van toepassing | awaitingAck, accepted, partlyRejected of rejected. | Geen |

#### Profieleditor

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Programmanaam | Tekst | Verplicht | Geeft het programma een naam. | Leeg |
| Register | Keuze uit alle 26 registers (screening en kanker) | Verplicht | Welk register. | Geen |
| Bestandsformaat | Keuze: CSV, XML, NAACCR XML | Verplicht | NAACCR XML wordt geweigerd (`formatNotAvailable`). | CSV |
| Scheidingsteken | Keuze: komma, puntkomma, tab | Verplicht voor CSV | Kolomscheiding. | Komma |
| Eerste rij bevat koppen | Ja/Nee | Optioneel | Schrijft een kopregel. | Aan |
| Beschermen tegen spreadsheetformules | Ja/Nee | Optioneel | Beveiligt tekst die op een formule lijkt te beginnen. | Aan |
| XML-hoofdelement en recordelement | Tekst, twee vakken | Verplicht voor XML | Geldige en verschillende namen. | Results, Result |
| Code in bestandsnaam | Tekst, 1 tot 20 letters, cijfers, koppelteken of underscore | Optioneel | De programmacode in de bestandsnaam. | Leeg |
| Patroon van de bestandsnaam | Tekst met {program} {date} {time} {seq} | Verplicht | Moet {date} of {seq} bevatten. | `{program}_{date}_{seq}` |
| Kolommen | Lijst: veld (15 velden), Kop, Verplicht, omhoog, omlaag, verwijderen, Kolom toevoegen | Verplicht | Elk veld eenmaal. Een record waarin een verplichte kolom ontbreekt, wordt achtergehouden als `REGISTRY_NOT_READY`. | Geen |
| Live voorbeeld | Tekst, alleen-lezen | Niet van toepassing | Toont de indeling van het bestand. | Geen |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Profielen beheren: `config:batch-registry-feed:manage` (Beheerder en Laboratoriumdirecteur). Een bestand maken: `registry:batch-file:generate` (Beheerder, en daarvoor is de eerste machtiging nodig).

**Bekende beperkingen.** Het opnieuw verzenden van één record vanuit Registeruitzonderingen verzendt voor een batchprogramma nog steeds een bericht. Het schema komt uit Verzendschema's. De levering via SFTP is een taak van de interface-engine.

## Kwaliteits- en volksgezondheidsrapportage (MIPS/MACRA) {#ch8-quality-reporting}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows

**Status:** Niet gerealiseerd

PathScribe heeft geen maatstaf, scherm, export of contract voor het Merit-based Incentive Payment System (MIPS), de Medicare Access and CHIP Reauthorization Act (MACRA) of het Quality Payment Program. Een zoekopdracht in de broncode en de documenten vond er geen. Niets hier berekent een kwaliteitsmaatstaf of bouwt een indieningsbestand.

**Het dichtstbijzijnde dat bestaat:**

- De [Rapportagefeed](#screen-bi_feed) stuurt casusgegevens naar een business-intelligencetool, waarin u uw eigen maatstaven kunt bouwen.
- Exports: gebruikers met de juiste machtiging kunnen exports uit de applicatie downloaden, en het [financiële tabblad van Systeemlogboeken](#screen-audit-financial) exporteert facturatiegebeurtenissen als CSV.
- Registermelding voor kanker en baarmoederhalsscreening (hierboven) is de rapportage voor de volksgezondheid die is gerealiseerd, binnen de beschreven beperkingen.

## Jurisdictiebetalingstoewijzingen, hoofdbetalingstypen en het financiële logboek {#ch8-payment-reference}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups

PathScribe beschrijft in twee lagen wie betaalt. Een **hoofdbetalingstype** is een categorie die overal wordt gebruikt (bijvoorbeeld commerciële verzekering). Een **jurisdictiebetalingstoewijzing** zegt dat een lokaal stelsel (bijvoorbeeld `DE_GKV`) bij één categorie hoort en voor welk uitgaand formaat het bedoeld is. De financiële klasse die bij een kostenpost hoort, wordt uit beide opgebouwd. De uitgaande formaten die bij de toewijzing staan, zijn alleen labels: X12 837P, KVDT en SESAM-Vitale zijn Gepland en geen ervan wordt gegenereerd.

### Hoofdwoordenboek betalingstypen {#screen-master_payment_types}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups > Hoofdwoordenboek betalingstypen

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Financiële en omzet-lookups**
**2. Onderhoudsonderdeel:** Hoofdwoordenboek betalingstypen

**3. Zakelijk doel en bereik.** De betalingscategorieën die koppelingen, accessie en de kostenpayload gebruiken. Elf zijn meegeleverd: SELF_PAY, PATIENT_COPAY_GAP, COMMERCIAL_INSURANCE, MUTUELLE_COMPLEMENTARY, STATUTORY_SOCIAL_HEALTH, PUBLIC_UNIVERSAL_BENEFIT, PUBLIC_NHS (identificatielabel "NHS Number"), RECIPROCAL_INTERNATIONAL, SPONSOR_CLINICAL_TRIAL, OCCUPATIONAL_WORKERS_COMP (identificatielabel "Claim #") en DIRECT_CONTRACT_INSTITUTIONAL.

**4. Voorwaarden en afhankelijkheden.** Dit is een startpunt voor betaling. Koppelingen kunnen hier alleen een actief type kiezen.

Setup step: Tier 7, step 8
Requires: Geen, dit is een startpunt.
Unlocks: [Jurisdictiebetalingstoewijzing](#screen-jurisdiction_payment_mappings)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-master_payment_types - Lijst van het Hoofdwoordenboek betalingstypen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Id | Tekst | Verplicht | Opgeslagen in hoofdletters, spaties worden underscores. Na het aanmaken vergrendeld, omdat koppelingen ernaar verwijzen. Een duplicaat wordt geweigerd. | Geen |
| Weergavenaam | Tekst | Verplicht | De naam die medewerkers zien. | Geen |
| Vereist verzekerdennummer | Ja/Nee | Optioneel | Medewerkers moeten een verzekerden- of polisnummer invoeren. | Uit |
| Label verzekerdennummer | Tekst | Optioneel | Het label voor dat nummer (bijvoorbeeld "Claim #"). | Leeg |
| Vereist garantsteller | Keuze: required, optional, not required | Verplicht | Of een garantsteller nodig is. | not required |
| Ondersteunt gesplitste facturering | Ja/Nee | Optioneel | Of technische en professionele delen naar verschillende betalers mogen gaan. | Uit |
| Notities | Tekst | Optioneel | Vrije notities. | Leeg |
| Actief | Ja/Nee | Optioneel | Knoppen **Deactiveren** en **Reactiveren**. | Actief |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:payment-types:manage`. Beheerder en Laboratoriumdirecteur hebben deze standaard.

**Bekende beperkingen.** Het deactiveren van een type wordt niet getoetst aan de koppelingen die het gebruiken.

### Jurisdictiebetalingstoewijzing {#screen-jurisdiction_payment_mappings}
Breadcrumb: Start > Configuratie > Systeem > Financiële en omzet-lookups > Jurisdictiebetalingstoewijzing

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Financiële en omzet-lookups**
**2. Onderhoudsonderdeel:** Jurisdictiebetalingstoewijzing

**3. Zakelijk doel en bereik.** Koppelt elk lokaal betalersstelsel aan een hoofdbetalingstype. Het tabblad "Externe patiëntgegevens" van Accessie leest deze koppelingen (keuzelijst Primaire jurisdictie), en de payload van de financiële klasse gebruikt ze. Dertien rijen zijn meegeleverd: US_MEDICARE, US_COMMERCIAL, CA_OHIP (landcode CA_ON), UK_NHS_TRUST, DE_GKV, DE_BG, FR_CPAM, FR_MUTUELLE, NL_BASIS, BE_MUT, AU_MBS, NZ_ACC en KR_NHIS. **Er is geen rij voor Spanje, Schotland, Noord-Ierland of Ierland**, hoewel de code 14 jurisdicties definieert, waaronder Spanje.

**4. Voorwaarden en afhankelijkheden.** De lijst met hoofdtypen moet eerst de categorie bevatten. Alleen actieve typen worden aangeboden.

Setup step: Tier 7, step 9
Requires: [Hoofdwoordenboek betalingstypen](#screen-master_payment_types), [Overzicht per rechtsgebied](#screen-jurisdiction_overview)
Unlocks: [Voorbeeld facturatie-export](#screen-dft_export_preview)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-jurisdiction_payment_mappings - Lijst van Jurisdictiebetalingstoewijzing met landenfilter]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Landenfilter | Keuze uit landen | Optioneel | Beperkt de lijst. | Alle |
| Inactieve tonen | Ja/Nee-schakelaar | Optioneel | Neemt inactieve rijen mee. | Uit |
| Landcode | Tekst | Verplicht | Opgeslagen in hoofdletters. Vrije tekst, niet getoetst aan de lijst met jurisdicties. | Geen |
| Code van het lokale stelsel | Tekst | Verplicht | Opgeslagen in hoofdletters. | Geen |
| Lokale weergaveterminologie | Tekst | Verplicht | De naam die medewerkers zien. | Geen |
| Hoofdbetalingstype | Keuze uit actieve hoofdtypen | Verplicht | De categorie. | Geen |
| Primair uitgaand formaat | Tekst | Verplicht | Een label zoals X12 837P. Er wordt geen bestand gegenereerd. | Geen |
| Notities | Tekst | Optioneel | Vrije notities. | Leeg |
| Actief | Ja/Nee | Optioneel | Inactieve rijen worden verborgen in de keuzelijst Primaire jurisdictie. | Actief |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:payment-mappings:manage`. Beheerder en Laboratoriumdirecteur hebben deze standaard.

**Bekende beperkingen.** Er is geen controle op duplicaten van landcode en stelselcode. Uitvoer voor X12 837P, KVDT en SESAM-Vitale is Gepland.
### Systeemlogboeken: Financieel {#screen-audit-financial}
Breadcrumb: Start > Systeemlogboeken > Financieel

**Status:** Demonstratie

**1. Navigatie:** Pagina **Systeemlogboeken** > tabblad **Financieel**
**2. Onderhoudsonderdeel:** Niet van toepassing, dit is een logboekpagina.

**3. Zakelijk doel en bereik.** Een alleen-lezen overzicht van facturatiegebeurtenissen en van mislukte of in de wachtrij geplaatste uitgaande kostenposten. Het heeft twee subtabbladen: **Factureringslogboeken** en **Uitgaande DLQ** (dead letter queue, de lijst met kostenposten die niet konden worden verzonden).

**4. Voorwaarden en afhankelijkheden.** Het toont pas gegevens nadat er kostenposten bestaan.

Setup step: Reference, not part of setup
Requires: [Facturatiewoordenboek (kostenregistratie)](#screen-billing_dictionary), [Facturatievrijgave](#screen-billing_release)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-audit-financial - Tabblad Financieel van Systeemlogboeken, filters en resultaten van Factureringslogboeken]

**6. Veldreferentie.**

#### Filters van Factureringslogboeken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Dossiernummer | Tekst | Optioneel | Filter. | Leeg |
| Patiëntnaam | Tekst | Optioneel | Filter. | Leeg |
| Bereik patiëntnaam (A-Z) | Twee letters | Optioneel | Filter. | Leeg |
| Patiënt-id (MRN/MPI) | Tekst | Optioneel | Filter. | Leeg |
| Datum facturatiegebeurtenis van, tot | Data | Optioneel | Filter op de datum van de gebeurtenis. | Leeg |
| Datum van dienstverlening van, tot | Data | Optioneel | Filter. | Leeg |
| Datum ondertekening verslag van, tot | Data | Optioneel | Filter. | Leeg |
| Type | Keuze: Kosten, Credit, Tekortkoming, Codebeoordeling, Verzending, Wijziging, Audit | Optioneel | Filter. | Alle |
| Facturatietype | Keuze | Optioneel | Filter. | Alle |
| Status | Keuze: Concept, In afwachting van goedkeuring, Goedgekeurd, Geëxporteerd, Afgewezen, In de wacht | Optioneel | Filter. | Alle |
| Personeel, Ondertekenende patholoog, Aanvragende instelling | Opzoekvelden (Bladeren) | Optioneel | Filters. | Leeg |
| Zoeken in detailtekst | Tekst | Optioneel | Doorzoekt de detailtekst. | Leeg |
| Opgeslagen zoekopdrachten | Keuze en Opslaan | Optioneel | Bewaard als persoonlijke instellingen. | Geen |
| Wissen, Zoeken | Knoppen | Optioneel | Herstellen of uitvoeren. | Niet van toepassing |
| CSV exporteren | Knop | Optioneel | Vereist `audit:billing-log:export`. | Niet van toepassing |

#### Resultaten van Factureringslogboeken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Casus, Patiënt, Patiënt-id | Kolommen | Niet van toepassing | Patiëntgegevens worden gemarkeerd als beschermde gezondheidsinformatie. | Geen |
| Tijdstempel, Type, Facturatietype, Status, Gebeurtenis, Detail | Kolommen | Niet van toepassing | De gebeurtenis. | Geen |
| Personeel, Patholoog, Faciliteit | Kolommen | Niet van toepassing | Wie en waar. | Geen |

De zoekopdracht toont maximaal 50 casus. Er verschijnt een melding "Case limit reached" wanneer er meer overeenkomen.

#### Uitgaande DLQ

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Labfilter | Keuze, "Alle uitvoerende laboratoria" | Optioneel | Beperkt beide tabellen. | Alle uitvoerende laboratoria |
| Mislukt: Casus, Uitvoerend lab, Component, Fout, Nieuwe pogingen | Kolommen | Niet van toepassing | Foutcodes: `MISSING_ICD10`, `MISSING_PROVIDER_NPI`, `DISPATCH_TIMEOUT`, `DISPATCH_REJECTED`. De laatste twee verschijnen alleen via de testknoppen. | Geen |
| Herstellen & opnieuw proberen: Opslaan & opnieuw in wachtrij plaatsen | Knop | Optioneel | Koppelt een ICD-10-code of NPI van de zorgverlener aan de casus (geaudit) en plaatst die opnieuw in de wachtrij. | Niet van toepassing |
| Herstellen & opnieuw proberen: Verzending opnieuw proberen | Knop | Optioneel | Probeert het opnieuw. | Niet van toepassing |
| CAPA: Vastleggen als CAPA | Knop | Optioneel | Registreert een deficiëntie van het type `def-outbound-dispatch-failure`. | Niet van toepassing |
| In wachtrij: Casus, Uitvoerend lab, Component, Trigger | Kolommen | Niet van toepassing | Kostenposten die wachten op verzending. | Geen |
| Time-out simuleren, Afwijzing simuleren | Knoppen | Optioneel | Alleen om te testen. Echte verzending is niet gerealiseerd. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:audit-log:open`, standaard bij Beheerder, Laboratoriumdirecteur en QA-beoordelaar. Facturatielogboeken exporteren naar CSV: `audit:billing-log:export`. Dezelfde pagina heeft de tabbladen Auditlogboek, Foutenlogboek, Interfacelogboek, Kwaliteitsborging, Kritieke meldingen, Consultlinks en Servertaken; zie [Interfacelogboeken](#screen-audit-interfaces) en [Auditlogboek](#screen-audit-log).

**Bekende beperkingen.** De verzendsimulatie is een hulpmiddel voor tests. Geen enkel live facturatiesysteem ontvangt kostenposten.
