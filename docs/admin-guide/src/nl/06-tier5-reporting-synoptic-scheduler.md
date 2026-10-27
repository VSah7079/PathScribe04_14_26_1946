---
chapter: 6
id: ch6
title: Niveau 5: Rapportage, synoptische formulieren en configuratie van de planner
---

# Niveau 5: Rapportage, synoptische formulieren en configuratie van de planner {#ch6}

Dit hoofdstuk beschrijft hoe een vrijgegeven rapport eruitziet, welke gestructureerde (synoptische) formulieren pathologen invullen en hoe een vrijgegeven rapport wordt verzonden, afgedrukt en ingepland. Het beschrijft 15 schermen in vier delen. Drie onderdelen uit de opzet zijn niet gerealiseerd en elk is gemarkeerd waar het ter sprake komt: een leveringskanaal naar een patiëntenportaal, het automatisch laden van versies van CAP-protocollen en een nachtelijke taakplanner die een beheerder kan configureren. In elke sectie worden de dichtstbijzijnde werkende voorzieningen genoemd.

**Volgorde van inrichting voor dit niveau.** Doe eerst niveau 1 tot en met niveau 4 (in het bijzonder faciliteiten, artsen, rollen en site-agents). Werk daarna dit niveau in deze volgorde af. Het kader "Inrichtingsvolgorde" van elk scherm herhaalt de plaats van dat scherm in de lijst.

1. [Goedgekeurde lettertypen](#screen-fonts): kies welke lettertypen de rapporteditors aanbieden.
2. [Documentstijl](#screen-document_style): stel de standaardtekststijl, het paginaformaat en de marges van het laboratorium voor rapporten in.
3. [Sjabloonbeoordeling](#screen-template_governance): bepaal wie synoptische sjablonen mag goedkeuren en publiceren.
4. [Onderdelenbibliotheek](#screen-templates-parts): bouw of kopieer de herbruikbare koppen, inhoudsdelen en voetteksten.
5. [Rapportsjablonen](#screen-templates-templates): stel rapportsjablonen samen uit onderdelen en publiceer ze.
6. [Routeringsregels](#screen-templates-routing): kies welk sjabloon een casus gebruikt voor een faciliteit, arts of protocol.
7. [Beoordelingswachtrij](#screen-protocols-review): breng synoptische protocollen door concept, beoordeling en goedkeuring.
8. [Actieve protocollen](#screen-protocols-active): controleer en onderhoud de gepubliceerde synoptische protocollen.
9. [Routeringsregels voor afdrukbestemmingen](#screen-print_routing_rules): bepaal naar welke printer een vrijgegeven rapport gaat.
10. [Leveringsconfiguratieregels](#screen-delivery_rules): bepaal hoe elk vrijgegeven rapport wordt verzonden (uitslagbericht, afdrukken, e-fax, bestandsdepot).
11. [Verzendschema's](#screen-delivery_schedules): bepaal wanneer er iets wordt verzonden.

Schermen die geen deel uitmaken van de inrichting en dus geen stapnummer hebben: de twee tabbladpagina's ([tabblad Rapportsjablonen](#screen-tab-templates) en [tabblad Synoptische bibliotheek](#screen-tab-protocols)), [Alle protocollen](#screen-protocols-all) en [Mijn exports](#screen-my-exports).

**Leveringskanalen in het kort.** Elk kanaal wordt met zijn beperkingen opnieuw beschreven in [Deel 3](#ch6-scheduled-delivery).

| Kanaal | Status | Wat er bestaat |
|---|---|---|
| Afdrukwachtrij | Gerealiseerd | Leveringsregels sturen een afdrukopdracht; routeringsregels voor afdrukken kiezen de printer; het scherm Afdrukwachtrij beheert de opdrachten. |
| Uitslagbericht naar de koppelingsengine (elektronisch) | Gerealiseerd | Het standaardkanaal. |
| E-fax | Gerealiseerd | Wordt verzonden naar de interfaceserver, die de PDF doorgeeft aan een e-mail-naar-faxgateway. |
| Bestandsdepot | Gerealiseerd | Wordt verzonden naar de interfaceserver, die het bestand wegschrijft naar een map of SFTP-bestemming die op die server is ingericht. |
| Beveiligde e-mail | Demonstratie | Een persoon verstuurt vanuit een venster een aan een casus gekoppeld bericht; de e-mail gaat naar de [Gesimuleerde postvak-uit](#screen-simulated_mail). Het is geen kanaal van een leveringsregel. |
| Patiënten- of verwijzerportaal | Niet gerealiseerd | Er bestaat geen portaalkanaal. |

**Waar de hulpmiddelen voor batch- en nachtelijke taken zijn.** Batchafdrukken en de nachtelijke taakplanner zijn niet één scherm. [Deel 4](#ch6-batch-jobs) noemt de schermen die bestaan en waar elk is beschreven.

## Rapportsjabloonontwerper en inrichting van huisstijl {#ch6-report-templates}
Breadcrumb: Start > Configuratie > Rapportsjablonen

Een rapport wordt opgebouwd uit drie soorten **onderdelen** (kop, inhoud, voettekst). Een **sjabloon** plaatst onderdelen in vijf vakken (kop van pagina 1, kop van pagina 2 en verder, inhoud, voettekst van pagina 2 en verder, voettekst van pagina 1). **Routeringsregels** bepalen welk sjabloon een casus krijgt. De standaardlettertypen, het paginaformaat en de marges van het laboratorium liggen daaronder.

**Hoe een sjabloon voor een casus wordt gekozen.** De router probeert deze stappen in volgorde en stopt bij de eerste overeenkomst: eerst een poort voor voorlopige rapporten; dan een overschrijving per faciliteit (Pass 0); dan, voor een aangesloten faciliteit zonder eigen regel, de overschrijving van de bovenliggende onderneming (Pass 0a); dan een voorkeur van een arts (Pass 0b); dan een overeenkomst met een synoptisch protocol, waarbij door de beheerder gedefinieerde regels vóór de ingebouwde tabel worden gecontroleerd (Pass 1); dan de terugval op het subspecialisme (Pass 2); dan de terugval op de gouden standaard (Pass 3). Binnen één regeltype gaat een regel voor één uitvoerend laboratorium voor op een algemene regel voor dezelfde faciliteit of arts.

**Lagen van de tekststijl.** De tekststijl van een rapport komt uit drie lagen; de meest specifieke wint: de standaard van het laboratorium (Documentstijl) wordt overschreven door het eigen paneel Stijl van een sjabloon, dat wordt overschreven door de labelopmaak van een component in de inspecteur.

**Huisstijl.** De rapportkop haalt het logo, de naam van de laboratoriumdirecteur en het accreditatienummer uit de afdeling, met terugval op de faciliteit en daarna op de onderneming. Die velden worden op andere schermen ingesteld; dit hoofdstuk herhaalt ze niet:
- Huisstijl van de afdeling: [Afdelingswoordenboek](#screen-departments) (Naam labdirecteur, accreditatienummer, URL kopregel-logo).
- Huisstijl en rapportageopties van de faciliteit: [Faciliteitsconfiguratie](#screen-clients) en [Faciliteitswoordenboek](#screen-facility-dictionary).

PathScribe slaat alleen het adres van een gehost logobestand op, nooit het beeld zelf. Een kopgedeelte waarbij **Instellingslogo weergeven** is ingeschakeld, gebruikt dat adres.

### Tabblad Rapportsjablonen {#screen-tab-templates}
Breadcrumb: Start > Configuratie > Rapportsjablonen

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Rapportsjablonen**
**2. Onderhoudsonderdeel:** Het tabblad zelf, met de subtabbladen **Rapportsjablonen**, **Onderdelenbibliotheek** en **Routeringsregels**.

**3. Doel en reikwijdte.** Het tabblad groepeert de drie schermen die de opmaak van rapporten bepalen: de sjabloonlijst, de herbruikbare onderdelenbibliotheek en de routeringsregels voor sjablonen. De tabbladpagina heeft zelf geen velden. De knoppen van de subtabbladen zijn de enige bedieningselementen.

**4. Vereisten en afhankelijkheden.** Het tabblad opent voor iedereen met `screen:configuration:open`. Elk subtabblad is vervolgens beperkt door zijn eigen machtiging, zodat iemand zonder die machtiging de lijst ziet maar niets kan wijzigen.

Setup step: Reference, not part of setup
Requires: [Documentstijl](#screen-document_style)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: tab-templates - Tabblad Rapportsjablonen met de drie subtabbladen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Rapportsjablonen (subtabblad) | Knop | Niet van toepassing | Opent de [sjabloonlijst](#screen-templates-templates). | Geselecteerd |
| Onderdelenbibliotheek (subtabblad) | Knop | Niet van toepassing | Opent de [onderdelenbibliotheek](#screen-templates-parts). | Niet geselecteerd |
| Routeringsregels (subtabblad) | Knop | Niet van toepassing | Opent de [routeringsregels voor sjablonen](#screen-templates-routing). | Niet geselecteerd |

**7. Machtigingen.** Het tabblad openen: `screen:configuration:open`. De acties van elk subtabblad gebruiken hun eigen machtigingen, die op het subtabblad staan vermeld.
**Bekende beperkingen.** Geen bekend.

### Onderdelenbibliotheek {#screen-templates-parts}
Breadcrumb: Start > Configuratie > Rapportsjablonen > Onderdelenbibliotheek

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Rapportsjablonen** > subtabblad **Onderdelenbibliotheek**
**2. Onderhoudsonderdeel:** Rapportonderdelen (kop, inhoud, voettekst)

**3. Doel en reikwijdte.** Een onderdeel is één herbruikbaar blok van een rapport: een **kop** (huisstijl van de instelling, accessienummer, patiëntgegevens), een **inhoudsonderdeel** (diagnose, macroscopische beschrijving, microscopie, synoptische gegevens) of een **voettekst** (paginanummers, vertrouwelijkheidsmelding, regel met patiëntidentiteit). Onderdelen worden hier eenmaal gebouwd en in een willekeurig aantal sjablonen geplaatst. Een onderdeel kan algemeen zijn (aangeboden aan elk uitvoerend laboratorium) of bij één uitvoerend laboratorium horen. De bibliotheek bevat ingebouwde onderdelen, die met de badge **Ingebouwd** worden getoond. Ingebouwde onderdelen kunnen niet worden bewerkt of gearchiveerd; dupliceer er een om het te wijzigen.

**4. Vereisten en afhankelijkheden.** Onderdelen hebben geen andere onderdelen nodig, maar de tekststijl van het laboratorium en de uitvoerende laboratoria waarnaar ze verwijzen moeten eerst bestaan. Als u de inrichting van de faciliteit overslaat, biedt de lijst Uitvoerend lab alleen Algemeen aan.

Setup step: Tier 5, step 4
Requires: [Documentstijl](#screen-document_style), [Faciliteitsconfiguratie](#screen-clients)
Unlocks: [Rapportsjablonen](#screen-templates-templates)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: templates-parts - Onderdelenbibliotheek met gegroepeerde koppen, inhoudsdelen en voetteksten]

**Wat het scherm toont.** Gearchiveerde onderdelen worden in de lijst verborgen. Onderdelen worden gegroepeerd onder Kopteksten, Inhoud en Voetteksten. Elke kaart toont de naam, een statusbadge (Concept, Gepubliceerd of Gearchiveerd), de badge Ingebouwd waar die van toepassing is, het uitvoerend laboratorium, en het type, het specialisme en de omschrijving. Een kaart biedt **Bewerken** (niet bij ingebouwde onderdelen), **Dupliceren** en **Archiveren** met een bevestiging Ja/Nee (niet bij ingebouwde onderdelen).

**6. Veldreferentie.**

Bedieningselementen van de lijst:

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoeken | Tekst | Optioneel | Filtert de lijst op de naam van het onderdeel. | Leeg |
| Typefilter | Keuze: Alle, Kopteksten, Inhoud, Voetteksten | Optioneel | Toont één soort onderdeel. | Alle |
| Labfilter | Keuze: alle laboratoria, Algemeen, of één uitvoerend laboratorium | Optioneel | Toont onderdelen voor één laboratorium. | Alle |
| Nieuw onderdeel | Knop | Niet van toepassing | Opent de typekeuze voor het onderdeel (kop, inhoud of voettekst) en daarna de onderdeelbouwer. | Niet van toepassing |

#### Onderdeelbouwer {#ch6-part-builder}
Breadcrumb: Start > Configuratie > Rapportsjablonen > Onderdelenbibliotheek > Onderdeelbouwer

[SCREENSHOT PLACEHOLDER: templates-parts-builder - Onderdeelbouwer met canvas, palet en inspecteur]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Onderdeeltype | Keuze: Kopgedeelte, Hoofdgedeelte, Voettekstgedeelte | Verplicht | Wordt eenmaal gekozen, bij het aanmaken van het onderdeel. Bepaalt in welk vak het onderdeel kan worden geplaatst. | Geen |
| Naam | Tekst | Verplicht | Wordt getoond in de bibliotheek en in het sjabloonvak. Klik op de naam om die te bewerken. | `New Header Part`, `New Body Part` of `New Footer Part` |
| Specialisme | Tekst | Optioneel | Groepeert het onderdeel. `General` betekent elk specialisme. | Leeg (getoond als Algemeen) |
| Omschrijving | Tekst | Optioneel | Korte notitie op de bibliotheekkaart. | Leeg |
| Norm | Keuze: Geen, CAP, RCPath, Aangepast | Optioneel | Alleen een label. Het legt de bron van de opmaak vast en laadt of controleert geen protocol. | Geen |
| Uitvoerend lab | Keuze: Algemeen (elk uitvoerend laboratorium), of één uitvoerend laboratorium | Optioneel | Een laboratoriumspecifiek onderdeel wordt alleen aangeboden voor de sjablonen van dat laboratorium. | Algemeen |
| Raster | Schakelaar: Raster aan / Raster uit | Optioneel | Toont of verbergt het opmaakraster op het canvas. Alleen weergave. | Aan |
| Componenten (canvas) | Slepen vanuit het palet | Optioneel | De inhoud van het onderdeel. Zie de inspecteurvelden onder [Rapportsjablonen](#screen-templates-templates). Het aantal componenten wordt getoond. | Leeg |
| Opslagstatus | Indicator: Niet opgeslagen, Bezig met opslaan, Opgeslagen, Fout | Niet van toepassing | Het onderdeel wordt tijdens het bewerken opgeslagen. | Niet van toepassing |
| Publiceren | Knop | Niet van toepassing | Maakt het onderdeel beschikbaar voor sjablonen (alleen gepubliceerde onderdelen kunnen worden geplaatst). Er geldt een controle op de definitieve diagnose; zie de sjablooneditor. | Concept |

**7. Machtigingen.** Openen: `screen:configuration:open`. Aanmaken, opslaan, archiveren, dupliceren: `config:report-template:manage`. Publiceren: `config:report-template:publish`. Beide zijn hoog risico en worden geaudit. Beheerder en Laboratoriumdirecteur hebben beide; Sjabloonauteur heeft manage; Sjabloongoedkeurder heeft publish.
**Sjabloonvariabelen voor geslacht van de patiënt en NHS-nummer (Batch 662).** Verslagsjablonen drukken `{{patient.sexAtBirth}}` af en kunnen `{{patient.nhsNumber}}` gebruiken. Geslacht wordt nog steeds met dezelfde code opgeslagen (M, F, U) plus I voor onbepaald, dus sjablonen die `patient.sex == 'M'` testen blijven werken. Het label op de patiëntbanner toont alleen "traced" wanneer de opgeslagen NHS Number Status Indicator 01 is.
**Bekende beperkingen.** Het veld Norm is een label. Het koppelt een onderdeel niet aan een CAP- of RCPath-protocol.

### Rapportsjablonen {#screen-templates-templates}
Breadcrumb: Start > Configuratie > Rapportsjablonen > Rapportsjablonen

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Rapportsjablonen** > subtabblad **Rapportsjablonen**
**2. Onderhoudsonderdeel:** Rapportsjablonen

**3. Doel en reikwijdte.** Een rapportsjabloon bepaalt de structuur van een rapport: welke kop-, inhouds- en voettekstonderdelen het gebruikt, in welke vakken, en (optioneel) de door AI ondersteunde generatiestappen van het laboratorium ervoor. Een sjabloon is Concept, Gepubliceerd of Gearchiveerd. Alleen een gepubliceerd sjabloon kan door routering worden gekozen. De lijst toont elk sjabloon met zijn status, een badge **AI** wanneer AI-generatie aanstaat, een badge **STANDAARD** bij de standaardlay-out voor chirurgische pathologie, het aantal actieve vakken en het tijdstip van de laatste wijziging.

**4. Vereisten en afhankelijkheden.** Sjablonen worden opgebouwd uit gepubliceerde onderdelen, dus de onderdelenbibliotheek komt eerst. Als u die overslaat, toont de onderdeelkiezer in de editor "Geen gepubliceerde onderdelen gevonden". De tekststijl van het laboratorium moet zijn ingesteld, zodat het paneel Stijl van het sjabloon een standaard heeft om op terug te vallen.

Setup step: Tier 5, step 5
Requires: [Onderdelenbibliotheek](#screen-templates-parts), [Documentstijl](#screen-document_style)
Unlocks: [Routeringsregels](#screen-templates-routing)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: templates-templates - Lijst met rapportsjablonen met statusfilter, zoekveld, Vanuit standaard en Nieuw sjabloon]

**6. Veldreferentie.**

Bedieningselementen van de lijst:

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Statusfilter | Keuze: Alle, Gepubliceerd, Concept, Gearchiveerd, elk met een aantal | Optioneel | Toont één status. | Alle |
| Zoeken | Tekst | Optioneel | Filtert op naam. | Leeg |
| Nieuw sjabloon (leeg beginnen) | Knop | Niet van toepassing | Maakt een leeg concept aan en opent de editor. | Niet van toepassing |
| Vanuit standaard (standaardsjabloon gebruiken) | Knop | Niet van toepassing | Kopieert de standaardlay-out voor chirurgische pathologie als nieuw concept met de naam `My Surgical Pathology Report`. | Niet van toepassing |
| Bewerken | Knop op een conceptrij | Niet van toepassing | Opent de editor. | Niet van toepassing |
| Dupliceren | Knop | Niet van toepassing | Maakt een kopie met de naam `Copy of <name>`. | Niet van toepassing |
| Verwijderen / archiveren | Knop met bevestiging Ja/Nee | Niet van toepassing | Een concept wordt verwijderd; een gepubliceerd sjabloon wordt gearchiveerd. | Niet van toepassing |

#### Sjablooneditor {#ch6-template-editor}
Breadcrumb: Start > Configuratie > Rapportsjablonen > Rapportsjablonen > Sjablooneditor

[SCREENSHOT PLACEHOLDER: templates-templates-editor - Sjablooneditor met paneel Onderdelenbibliotheek, paginavakken en voorbeeld]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Sjabloonnaam | Tekst | Verplicht | Klik om te bewerken. Wordt opgeslagen wanneer u het vak verlaat. | De naam die bij het aanmaken is opgegeven |
| Regel met specialisme en norm | Alleen-lezen tekst | Niet van toepassing | Toont het specialisme van het sjabloon en de bijbehorende norm (CAP, RCPath of Aangepast). Een leeg sjabloon begint als `general` en `custom`. | `general`, `custom` |
| Status | Concept, Gepubliceerd of Gearchiveerd | Niet van toepassing | **Publiceren** zet een concept op Gepubliceerd. Publiceren is uitgeschakeld wanneer het sjabloon meer dan één veld heeft dat als Definitieve diagnose is gemarkeerd. | Concept |
| Filter uitvoerend lab (paneel Onderdelenbibliotheek) | Keuze: Alle labs (algemeen + elk lab), Algemeen, of één lab | Optioneel | Beperkt de aangeboden onderdelen. | Alle labs |
| Onderdelen zoeken | Tekst | Optioneel | Filtert de gepubliceerde onderdelen. | Leeg |
| Vak: Kop pagina 1 | Eén kopgedeelte | Optioneel | Kop op de eerste pagina. | Leeg |
| Vak: Kop pagina 2+ | Eén kopgedeelte, of "hetzelfde als pagina 1" | Optioneel | Kop op de latere pagina's. | Leeg |
| Vak: Inhoud | Geordende lijst met inhoudsonderdelen | Optioneel | Sleep om de volgorde te wijzigen. Inhoudsonderdelen lopen door over alle pagina's. Elk onderdeel kan met de vakschakelaar worden uitgezet zonder het te verwijderen. | Leeg |
| Vak: Voettekst pagina 2+ | Eén voettekstonderdeel | Optioneel | Voettekst op de latere pagina's. | Leeg |
| Vak: Voettekst pagina 1 | Eén voettekstonderdeel | Optioneel | Voettekst op de eerste pagina. | Leeg |
| Stijl (lettertype) | Keuze uit de goedgekeurde lettertypen | Optioneel | Standaardtekststijl op sjabloonniveau voor kop, inhoud of voettekst. Valt terug op de standaard van het laboratorium wanneer leeg. | Standaard van het laboratorium |
| Stijl (lettergrootte, pt) | Getal | Optioneel | Idem. Groottes zijn in punten. | Standaard van het laboratorium |
| Stijl (vet, onderstrepen) | Schakelaars | Optioneel | Idem. | Uit |
| Stijl (teksttransformatie) | Keuze: Zoals getypt, Beginhoofdletters, HOOFDLETTERS | Optioneel | Idem. | Zoals getypt |
| Voorbeeld | Knop | Niet van toepassing | Toont het sjabloon met fictieve casusgegevens, het aantal pagina's en de fictieve context. | Niet van toepassing |
| Marges van het voorbeeld (boven, rechts, onder, links, mm) | Getal | Optioneel | Alleen voor dit voorbeeld. Het echte paginaformaat en de echte marges van het laboratorium worden ingesteld in Documentstijl. | De instelling van het laboratorium |
| Paginaformaat van het voorbeeld | Keuze: A4, US Letter, US Legal, A3, B5 | Optioneel | Alleen voor dit voorbeeld. | De instelling van het laboratorium |

#### Inspecteur: velden van de geselecteerde component {#ch6-template-inspector}
Breadcrumb: Start > Configuratie > Rapportsjablonen > Rapportsjablonen > Sjablooneditor > Inspecteur

De inspecteur toont de eigenschappen van wat u op het canvas selecteert. In de onderdeelbouwer wordt dezelfde inspecteur gebruikt.

[SCREENSHOT PLACEHOLDER: templates-templates-inspector - Inspecteurpaneel voor een geselecteerd veld]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Label | Tekst | Optioneel | Het afgedrukte label van het veld. | Leeg |
| Breedte | Kolommen van 12 | Optioneel | Sleep de greep op het canvas voor een fijnere instelling. | Bepaald door het componenttype |
| Verplicht | Ja/nee-schakelaar | Optioneel | Het veld moet worden ingevuld. | Uit |
| Verbergen wanneer leeg | Ja/nee-schakelaar | Optioneel | Laat het veld weg uit het afgedrukte rapport wanneer het geen waarde heeft. | Uit |
| Pagina-einde vóór dit veld | Ja/nee-schakelaar | Optioneel | Begint een nieuwe pagina. | Uit |
| Veld voor definitieve diagnose | Ja/nee-schakelaar | Optioneel | Markeert het veld dat de definitieve diagnose bevat. Een sjabloon mag er maar één hebben. | Uit |
| Opnemen in FHIR-export | Ja/nee-schakelaar | Optioneel | Wordt bij het veld opgeslagen. Er is geen scherm voor FHIR-export gerealiseerd; zie [Hoofdstuk 7](#ch7). | Uit |
| Tonen wanneer (zichtbaarheid) | Conditielijst met AND/OR | Optioneel | Condities op andere velden: is gelijk aan, is niet gelijk aan, bevat, is leeg, is niet leeg, groter dan, kleiner dan, enzovoort. | Altijd getoond |
| Positie van het label | Keuze: Boven het veld, Naast het veld, Verborgen | Optioneel | Opmaak van het label. | Boven |
| Lettergrootte van het label (pt), vet, onderstrepen, teksttransformatie | Getal en schakelaars | Optioneel | Labelopmaak op componentniveau. Wint van de stijlen van het sjabloon en van het laboratorium. | Overgenomen |
| Bindingssleutel | Tekst | Verplicht voor gebonden velden | Het casusgegevensveld dat een tekstveld, keuzelijst, getal, datum, afbeelding of gegevensalinea leest. | Geen |
| Tekstveld: plaatshouder, maximale lengte, validatiepatroon (regex) | Tekst, getal, tekst | Optioneel | Invoerbeperkingen op een tekstveld. | Leeg |
| Keuzelijst: opties | Eén `value|Label` per regel | Verplicht | De keuzes. | Leeg |
| Keuzelijst: meervoudige selectie toestaan, vrije tekstinvoer toestaan | Schakelaars | Optioneel | | Uit |
| Getal: eenheid, eenheidopties, aantal decimalen, minimum, maximum | Tekst en getallen | Optioneel | | Leeg |
| Datum: indeling, standaard de datum van vandaag | Keuze: Datum, Datum en tijd, Alleen jaar; schakelaar | Optioneel | | Datum, uit |
| Berekend: expressie, uitvoertype, eenheid | Tekst; keuze Tekst, Getal, Datum | Verplicht | Een waarde die uit andere velden wordt berekend. | Geen |
| Vast label: tekst, variant, vet, cursief | Tekst; keuze Kop 1, 2, 3, Lopende tekst, Bijschrift | Verplicht | Vaste kop of tekst. | Lopende tekst |
| Blok met opgemaakte tekst: inhoud, lettergrootte (px), tekstuitlijning | Tekst, getal, keuze Links, Gecentreerd, Rechts | Optioneel | Vaste tekst, in elk rapport gelijk. | Leeg |
| Gegevensalinea: bindingssleutel, opgemaakte tekst, AI toestaan deze alinea te schrijven | Tekst en schakelaars | Optioneel | Een vak dat uit casusgegevens wordt gevuld. | AI schrijven uit |
| Ingesloten afbeelding: bindingssleutel of statische afbeeldings-URL, alternatieve tekst, bijschrift, uitlijning, breedte, hoogte (px) | Tekst, getallen | Optioneel | Een gehost afbeeldingsadres, nooit een geüpload bestand. | Automatische grootte |
| Sectie: afdrukkop, inklapbaar, ingeklapt beginnen | Tekst en schakelaars | Optioneel | Een groep velden. | Uit |
| Kolomindeling: aantal kolommen, kolomafstand (px) | Getallen | Optioneel | De kolommen waarover de inhoud loopt. | Geen |
| Herhaalgroep: herhalen over, itemalias, minimumaantal items, maximumaantal items | Tekst, getallen | Optioneel | Herhaalt de inhoud voor elk item in een lijst. | Geen |
| Als-blok: onderliggende elementen tonen wanneer, Anders-tak | Conditielijst | Optioneel | Toont de inhoud wanneer de conditie geldt. | Geen |
| Schakelblok: schakelen op, gevallen (label van het geval, wanneer) | Veld en conditielijst | Optioneel | Toont de inhoud van het overeenkomende geval. | Geen |
| Pagina-einde: gedrag bij einde | Keuze: Automatisch, Altijd afbreken, Afbreken vermijden | Optioneel | | Automatisch |
| Sjabloonverwijzing: ID van het gerefereerde sjabloon, naam, contextoverschrijvingen | Tekst | Optioneel | Voegt de inhoud van een ander sjabloon in. | Geen |
| Kop: instellingslogo weergeven, patiëntnaam weergeven, accessienummer weergeven, paginabereik, hoogte (px), aangepaste HTML | Schakelaars, keuze Alle pagina's, Alleen pagina 1, Alleen pagina 2+; getal; tekst | Optioneel | Schakelaars voor de inhoud van de kop. | Uit, alle pagina's |
| Voettekst: paginanummers weergeven, indeling van het paginanummer, paginabereik, hoogte (px), aangepaste HTML | Schakelaar, tekst, keuze, getal, tekst | Optioneel | Schakelaars voor de inhoud van de voettekst. | Uit, alle pagina's |
| AI-generatie: door AI ondersteunde generatie inschakelen, systeeminstructie, temperatuur, maximaal aantal tokens | Schakelaar, tekst, getal, getal | Optioneel | AI-instellingen per sectie die de orkestratiemodus gebruikt. Ingericht in [Hoofdstuk 5](#ch5). | Uit |

**7. Machtigingen.** Openen: `screen:configuration:open`. Aanmaken, opslaan, dupliceren, verwijderen, archiveren: `config:report-template:manage`. Publiceren: `config:report-template:publish`. Beide hoog risico, geaudit. Houders zoals bij de onderdelenbibliotheek.
**Bekende beperkingen.** Controles op de definitieve diagnose worden in de editor uitgevoerd vóór het publiceren. De levenscyclus van sjablonen is hier Concept, Gepubliceerd, Gearchiveerd; er is geen beoordelingsstap zoals bij het synoptische sjabloon (zie [Sjabloonbeoordeling](#screen-template_governance)).
### Routeringsregels {#screen-templates-routing}
Breadcrumb: Start > Configuratie > Rapportsjablonen > Routeringsregels

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Rapportsjablonen** > subtabblad **Routeringsregels**
**2. Onderhoudsonderdeel:** Routeringsregels voor sjablonen

**3. Doel en reikwijdte.** Regels overschrijven de standaardketen (protocol, dan subspecialisme, dan de gouden standaard) voor specifieke faciliteiten, artsen of synoptische protocollen. Met een **Protocoltoewijzing** wijst u een nieuw of gewijzigd synoptisch protocol aan een sjabloon toe zonder softwarerelease. Dit is niet hetzelfde scherm als [Routeringsregels](#screen-routing_rules) onder Systeem, dat casussen naar pathologen routeert.

**4. Vereisten en afhankelijkheden.** Regels verwijzen naar gepubliceerde sjablonen, faciliteiten, artsen en protocollen. Als u de sjablonen overslaat, is de lijst Rapportsjabloon leeg. Een protocoltoewijzing kiest uit de protocollen in de synoptische bibliotheek en is daarom het nuttigst na werk in de [Beoordelingswachtrij](#screen-protocols-review); een regel kan later worden toegevoegd.

Setup step: Tier 5, step 6
Requires: [Rapportsjablonen](#screen-templates-templates), [Faciliteitsconfiguratie](#screen-clients), [Artsen](#screen-physicians)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: templates-routing - Routeringsregels voor sjablonen met de secties faciliteit, arts en protocol en het testpaneel]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Instelling-overrides | Lijst met regels | Optioneel | Pass 0 en Pass 0a. Een aangesloten faciliteit zonder eigen regel gebruikt die van de bovenliggende onderneming. | Geen |
| Artsvoorkeuren | Lijst met regels | Optioneel | Pass 0b. | Geen |
| Protocoltoewijzingen | Lijst met regels | Optioneel | Pass 1. Ze vullen de ingebouwde protocoltabel aan en gaan erbovenop voor. | Geen (alleen de ingebouwde tabel) |
| Prioriteitspaneel | Alleen-lezen lijst | Niet van toepassing | Toont elke pass en of die door de beheerder wordt gedefinieerd of door de beheerder kan worden uitgebreid; de pass die de laatste test heeft opgelost, wordt gemarkeerd. | Niet van toepassing |
| Regel inschakelen / uitschakelen | Schakelaar op elke rij | Optioneel | Een uitgeschakelde regel wordt overgeslagen. | Ingeschakeld |
| Verwijderen | Knop met bevestiging | Niet van toepassing | | Niet van toepassing |

#### Een regel toevoegen of bewerken {#ch6-routing-rule-window}
Breadcrumb: Start > Configuratie > Rapportsjablonen > Routeringsregels > Regel toevoegen

[SCREENSHOT PLACEHOLDER: templates-routing-rule - Venster Faciliteitsrouteringsregel toevoegen]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Faciliteit, arts of protocol | Keuzelijst | Verplicht | Op welke entiteit de regel van toepassing is. Het label volgt de sectie die u hebt geopend. | Geen |
| Uitvoerend lab | Keuze: Algemeen (elk uitvoerend laboratorium), of één lab | Optioneel | Een regel voor een lab wordt voor de eigen casussen van dat lab eerder gecontroleerd dan een algemene regel. | Algemeen |
| Rapportsjabloon | Keuzelijst met sjablonen | Verplicht | Het sjabloon dat de entiteit altijd gebruikt. | Geen |
| Opmerking | Tekst | Optioneel | Waarom de overschrijving bestaat. | Leeg |

#### Sjabloonroutering testen {#ch6-routing-test}
Breadcrumb: Start > Configuratie > Rapportsjablonen > Routeringsregels > Test

[SCREENSHOT PLACEHOLDER: templates-routing-test - Paneel Sjabloonroutering testen]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Uitvoerende instelling | Keuzelijst | Optioneel | De faciliteit van de casus. | Alle |
| Aanvragende arts | Keuzelijst | Optioneel | | Alle |
| Subspecialisme | Keuzelijst | Optioneel | | Alle |
| Synoptisch sjabloon-ID | Keuzelijst | Optioneel | | Geen |
| Routering testen | Knop | Niet van toepassing | Toont het gekozen sjabloon en de pass die het koos. Bij een dubbelzinnig resultaat worden de kandidaten opgesomd. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, wijzigen, verwijderen: `config:template-routing:manage` (hoog risico, geaudit). Beheerder en Laboratoriumdirecteur hebben deze; Sjabloonauteur en Sjabloongoedkeurder niet.
**Bekende beperkingen.** De tabellen voor subspecialisme en gouden standaard (Pass 2 en 3) zijn ingebouwd en kunnen hier niet worden bewerkt. De poort voor voorlopige rapporten is ingebouwd.

### Goedgekeurde lettertypen {#screen-fonts}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Goedgekeurde lettertypen

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** Goedgekeurde lettertypen

**3. Doel en reikwijdte.** Bepaalt welke lettertypen de vrijetekst-editors aan pathologen aanbieden in hun werkbalk (de rapporteditor, de narratieve editor, de macro-editors en de opmerkingenvensters lezen de lijst). Een lettertype dat is uitgeschakeld, blijft in de lijst staan maar wordt voor gebruikers verborgen. De pool is vast: 14 lettertypen in drie groepen. U kunt hier geen lettertypenaam toevoegen.

**4. Vereisten en afhankelijkheden.** Geen. Deze instelling filtert alleen een werkbalk. Ze wijzigt het standaardlettertype van het laboratorium voor rapporten niet; dat wordt ingesteld in [Documentstijl](#screen-document_style), dat een eigen, kortere lijst van zeven lettertypen aanbiedt en deze lijst niet leest.

Setup step: Tier 5, step 1
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-fonts - Goedgekeurde lettertypen met zoekveld en schakelaars per lettertype]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Lettertypen zoeken | Tekst | Optioneel | Filtert de 14 lettertypen op naam. | Leeg |
| Teller | Alleen-lezen tekst, "N van 14 ingeschakeld" | Niet van toepassing | | Niet van toepassing |
| Lettertypeschakelaar (één per lettertype) | Ja/nee-schakelaar, getoond als Actief of Inactief | Optioneel | Aan betekent dat het lettertype in de werkbalken van de editors verschijnt. De pool: Serif (Times New Roman, Georgia, Garamond, Palatino), Sans-Serif (Arial, Helvetica, Calibri, Verdana, Trebuchet MS, Tahoma, Roboto), Monospace (Courier New, Consolas, Lucida Console). | Aan voor Arial, Times New Roman en Courier New; uit voor de rest |
| Bewaking van het laatste lettertype | Melding "Er moet minstens één lettertype ingeschakeld blijven" | Niet van toepassing | Het laatste ingeschakelde lettertype kan niet worden uitgezet. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Wijzigen: `config:report-appearance:manage` (hoog risico, geaudit). Zonder deze machtiging is de sectie grijs en alleen-lezen. Beheerder en Laboratoriumdirecteur hebben haar standaard.
**Bekende beperkingen.** Geen bekend.

### Documentstijl {#screen-document_style}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Documentstijl

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** Documentstijl

**3. Doel en reikwijdte.** Stelt de standaardtekststijl van het laboratorium in voor de kop, de inhoud en de voettekst van elk rapport, en het paginaformaat en de afdrukmarges van het laboratorium. Het eigen paneel Stijl van een sjabloon overschrijft de standaard voor dat sjabloon, en de labelopmaak van een component overschrijft beide. Groottes worden opgeslagen in punten, de grootte die wordt afgedrukt, en er wordt niets kleiner dan 8 pt afgedrukt. Een stijl die is opgeslagen voordat er punten bestonden, wordt in pixels bewaard (elke pixel wordt als 0,75 pt afgedrukt) en blijft afdrukken zoals voorheen totdat u hem omzet.

**4. Vereisten en afhankelijkheden.** Geen. Doe dit voordat u sjablonen bouwt, zodat elk sjabloon met de juiste standaard begint.

Setup step: Tier 5, step 2
Requires: Geen, dit is een startpunt.
Unlocks: [Onderdelenbibliotheek](#screen-templates-parts), [Rapportsjablonen](#screen-templates-templates)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-document_style - Documentstijl met stijlen voor kop, inhoud en voettekst en pagina-instelling]

**6. Veldreferentie.** Dezelfde vijf stijlvelden komen één keer voor bij kop, inhoud en voettekst.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Lettertype (kop, inhoud, voettekst) | Keuze: Arial, Helvetica, Times New Roman, Georgia, Calibri, Verdana, Courier New | Optioneel | Het standaardrapportlettertype voor dat gebied. | Arial |
| Lettergrootte (pt) | Aantal punten, minimaal 8 | Optioneel | De afgedrukte grootte. Getoond als "Lettergrootte (px, opgeslagen vóór punten)" met een hint wanneer de stijl nog in pixels is. | Inhoud 10, kop 11, voettekst 10 |
| Vet | Ja/nee-schakelaar | Optioneel | | Kop aan; inhoud en voettekst uit |
| Onderstrepen | Ja/nee-schakelaar | Optioneel | | Uit |
| Tekst transformeren | Keuze: Zoals getypt, Beginhoofdletters, HOOFDLETTERS | Optioneel | | Zoals getypt |
| Voorbeeld | Alleen-lezen voorbeeldtekst | Niet van toepassing | Toont de gekozen stijl direct. | Niet van toepassing |
| Omzetten naar punten | Knop, alleen getoond bij een stijl die in pixels is opgeslagen | Niet van toepassing | Opent een bevestiging met elke grootte en waarmee die gaat afdrukken. De getallen blijven gelijk en betekenen nu punten, zodat de tekst groter wordt afgedrukt. Vastgelegd in het auditlogboek. | Niet van toepassing |
| Paginaformaat | Keuze: A4 (210 x 297 mm), US Letter (216 x 279), US Legal (216 x 356), A3 (297 x 420), B5 (176 x 250) | Optioneel | Het papierformaat van het laboratorium. Het sjabloonvoorbeeld opent ermee. | A4 |
| Marge boven, rechts, onder, links (mm) | Geheel getal van 5 tot 50 | Optioneel | Afdrukmarges. | Boven 25, rechts 20, onder 25, links 20 |

**7. Machtigingen.** Openen: `screen:configuration:open`. Wijzigen: `config:report-appearance:manage` (hoog risico, geaudit), gecontroleerd in de service en op het scherm. Beheerder en Laboratoriumdirecteur hebben haar.
**Bekende beperkingen.** De ontwikkelrenderer voor rapporten (`functions/`) drukt nog altijd A4 af en leest het paginaformaat van het laboratorium nog niet; de instelling wordt meegestuurd in de renderlading, zodat de productieserver haar kan gebruiken. Paginaformaat en marges zijn beleid van het laboratorium, bepaald door het printerpapier, en geen persoonlijke keuze.

### Sjabloonbeoordeling {#screen-template_governance}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Sjabloonbeoordeling

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** Sjabloonbeoordeling

**3. Doel en reikwijdte.** Bepaalt wie op deze locatie **synoptische sjablonen** (de synoptische bibliotheek) mag goedkeuren en publiceren. Het regelt geen rapportsjablonen, die een eigen eenvoudige levenscyclus van concept, publiceren en archiveren hebben. Er gelden twee instellingen en een vaste regel: een diagnostisch synoptisch sjabloon kan niet worden gepubliceerd onder 80% SNOMED-dekking op veldniveau. Procedurele sjablonen, zoals checklists voor het uitsnijden, zijn uitgezonderd omdat ze nooit worden gecodeerd.

**4. Vereisten en afhankelijkheden.** De ingebouwde rollen Sjabloonauteur, Sjabloongoedkeurder, Laboratoriumdirecteur en Beheerder doen het werk, dus de rollen van het personeel worden eerst ingericht. Als u dit overslaat, kan niemand een sjabloon goedkeuren, omdat goedkeuring de machtigingen van een goedkeurder vereist.

Setup step: Tier 5, step 3
Requires: [Rollen](#screen-staff-roles)
Unlocks: [Beoordelingswachtrij](#screen-protocols-review), [Actieve protocollen](#screen-protocols-active)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-template_governance - Sjabloonbeoordeling met zelfgoedkeuring en vereiste beoordelaars]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zelfgoedkeuring van sjablonen toestaan | Ja/nee-schakelaar | Optioneel | Uit (aanbevolen): een auteur kan een sjabloon dat hij heeft gemaakt of bewerkt niet goedkeuren of publiceren. Elke persoon die het sjabloon heeft opgeslagen, telt als auteur. Zet dit alleen aan voor solopraktijken, kleine locaties of tests. | Uit |
| Vereiste beoordelaars | Keuze: 1, 2 of 3 onafhankelijke beoordelaars | Optioneel | Goedkeuringen die een sjabloon nodig heeft voordat het kan worden gepubliceerd. Elke goedkeuring moet komen van een andere Sjabloongoedkeurder, Laboratoriumdirecteur of Beheerder die niet een van de auteurs is (tenzij zelfgoedkeuring aanstaat). | 1 |
| SNOMED-drempel | Alleen-lezen tekst, 80% | Niet van toepassing | Getoond in de ondertitel. Niet te bewerken. | 80% |

**7. Machtigingen.** Openen: `screen:configuration:open`. Wijzigen: `config:template-governance:manage` (hoog risico, geaudit; de wijziging wordt vastgelegd met de oude en nieuwe waarden). Beheerder heeft haar standaard; Laboratoriumdirecteur niet, dus verleen haar in Personeel > Rollen als de Laboratoriumdirecteur dit moet beheren. Zonder deze machtiging toont het scherm een melding dat u de instellingen kunt bekijken maar niet kunt wijzigen.
**Bekende beperkingen.** Geen bekend.

## Inrichting van de CAP-module voor synoptische rapportage {#ch6-synoptic}
Breadcrumb: Start > Configuratie > Synoptische bibliotheek

De synoptische bibliotheek bevat de gestructureerde checklists (protocollen) die pathologen invullen voor kanker en andere rapportage. Ze staat los van rapportsjablonen: een protocol bepaalt de vragen en hun codering, een rapportsjabloon bepaalt hoe een rapport eruitziet. Het scherm Routeringsregels koppelt de twee.

**Wat er vandaag werkelijk in de bibliotheek staat (lees dit eerst).** In de demonstratiegegevens bevat het register 36 protocollen: 32 Gepubliceerd, 3 In beoordeling en 1 Concept. Naar bron zijn er 23 `Custom` en 13 `PathScribe`. **Geen enkel protocol is een gelicentieerde CAP- of RCPath-checklist.** De namen CAP, RCPath en ICCR bestaan alleen als bronlabels in het venster Uploaden en als namen van toezichthoudende instanties. De 19 items met de naam "Generic Template" (borst, long, prostaat, colon, nier, Wilms, melanoom en andere) zijn tijdelijke aanduidingen met versie `0.1.0-generic`. De rest bestaat uit twee generieke synoptische testformulieren, PathScribe-formulieren zoals Mohs en halsklierdissectie, formulieren voor medische lever, placenta en niertransplantatie, macroscopisch onderzoek bij autopsie, de drie routes voor het uitsnijden volgens de gouden standaard en vijf cytologische rapportagesystemen (Bethesda schildklier, Milan speekselklier, Paris urinewegen, Papanicolaou pancreaticobiliair, lymfeklier-FNA). Een ziekenhuis dat een CAP-protocol nodig heeft, moet dit verkrijgen onder de eigen licentie van CAP en het via de onderstaande routes binnenbrengen.

**Hoe een protocolversie binnenkomt en weer verdwijnt.**

| Stap | Status | Wat er bestaat |
|---|---|---|
| Een PathScribe-protocolbestand (JSON) importeren | Gerealiseerd | **Protocol uploaden** leest het bestand, controleert het en slaat het op als concept. Het doorloopt daarna de beoordeling zoals elk ander concept. |
| Een elektronische CAP-checklist (eCC, SDC XML) of een Excel-werkmap controleren | Gedeeltelijk | De indeling van het bestand wordt gecontroleerd en het aantal secties en vragen wordt getoond. Importeren is nog niet mogelijk en de inhoud wordt niet geverifieerd aan CAP of RCPath. |
| Een protocol bouwen in de editor | Gerealiseerd | **Bouwen / Aanpassen** begint vanaf nul of vanaf een kopie van een bestaand protocol. |
| Een nieuwe versie van een bestaand protocol laden | Gerealiseerd | **Nieuwe versie** opent de editor met het volgende versienummer. Bij het publiceren wordt de versie waaruit het voortkomt gearchiveerd. |
| Automatische nachtelijke synchronisatie van updates van CAP, RCPath of ICCR | Niet gerealiseerd | Het scherm Toezichthoudende organen heeft per orgaan een schakelaar Automatische synchronisatie, en het venster Uploaden en de meldingsteksten noemen een nachtelijke synchronisatie, maar in deze build bestaat er geen synchronisatietaak en staat er geen in de lijst met servertaken. Het meldingscontract (`TEMPLATE_NOTIFICATIONS_API.md`) beschrijft de berichten die een toekomstige synchronisatietaak zou verzenden. Laad updates tot die tijd handmatig. |
| Een protocol buiten gebruik stellen | Gerealiseerd | **Archiveren** haalt het uit nieuwe rapporten; reeds geschreven rapporten behouden hun inhoud. **Herstellen als concept** brengt het terug voor beoordeling en opnieuw publiceren. |

**Levenscyclus.** Concept, In beoordeling, Wijzigingen vereist, Goedgekeurd, Gepubliceerd, Gearchiveerd. De namen van de acties volgen de bron: voor CAP is de goedkeuringsstap **Accepteren** en de publicatiestap **Vrijgeven**; voor RCPath zijn ze **Bekrachtigen** en **Publiceren**; voor Custom, PathScribe en ICCR zijn ze **Goedkeuren** en **Publiceren**. De governance (zelfgoedkeuring, aantal beoordelaars, de 80%-regel voor SNOMED) wordt ingesteld in [Sjabloonbeoordeling](#screen-template_governance).

### Tabblad Synoptische bibliotheek {#screen-tab-protocols}
Breadcrumb: Start > Configuratie > Synoptische bibliotheek

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Synoptische bibliotheek**
**2. Onderhoudsonderdeel:** Het tabblad, met drie subpagina's: **Actieve protocollen** (gevalideerde checklists die in gebruik zijn), **Beoordelingswachtrij** (klaargezet voor goedkeuring) en **Alle protocollen** (volledige bibliotheek).

**3. Doel en reikwijdte.** Eén plaats voor de hele levenscyclus van een protocol. Het tabblad heeft zelf geen velden; de drie navigatie-items openen de onderstaande subpagina's.

**4. Vereisten en afhankelijkheden.** Opent voor iedereen met `screen:configuration:open`. Welke toezichthoudende instanties in de bibliotheek verschijnen, wordt ingesteld in [Toezichthoudende organen](#screen-governing_bodies).

Setup step: Reference, not part of setup
Requires: [Toezichthoudende organen](#screen-governing_bodies)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: tab-protocols - Tabblad Synoptische bibliotheek met Actief, Beoordelingswachtrij en Alle protocollen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Actieve protocollen | Navigatie-item, "Gevalideerde checklists die in gebruik zijn" | Niet van toepassing | Opent [Actieve protocollen](#screen-protocols-active). | Geselecteerd |
| Beoordelingswachtrij | Navigatie-item, "Klaargezet voor goedkeuring" | Niet van toepassing | Opent de [Beoordelingswachtrij](#screen-protocols-review). | Niet geselecteerd |
| Alle protocollen | Navigatie-item, "Volledige bibliotheek" | Niet van toepassing | Opent [Alle protocollen](#screen-protocols-all). | Niet geselecteerd |

**7. Machtigingen.** Openen: `screen:configuration:open`. Acties gebruiken de protocolmachtigingen die op elke subpagina staan vermeld.
**Bekende beperkingen.** Geen bekend.

### Beoordelingswachtrij {#screen-protocols-review}
Breadcrumb: Start > Configuratie > Synoptische bibliotheek > Beoordelingswachtrij

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Synoptische bibliotheek** > **Beoordelingswachtrij**
**2. Onderhoudsonderdeel:** Protocollen die op publicatie wachten

**3. Doel en reikwijdte.** Toont elk protocol in een toestand vóór publicatie (In beoordeling, Wijzigingen vereist, Goedgekeurd), gegroepeerd naar anatomische categorie, met een telblok voor elke toestand. Een banner herhaalt de regel: sjablonen hebben vóór publicatie minstens 80% SNOMED-dekking en klinische autorisatie nodig. Klik op een kaart om de beoordelaar (In beoordeling, Goedgekeurd) of de editor (Wijzigingen vereist) te openen. Conceptprotocollen verschijnen hier niet; u vindt ze in Alle protocollen.

**4. Vereisten en afhankelijkheden.** Vereist de beoordelingsinstellingen en de rollen die het werk doen. Als u ze overslaat, wordt goedkeuring geweigerd omdat de persoon de machtiging mist, of omdat één auteur zijn eigen werk probeert goed te keuren.

Setup step: Tier 5, step 7
Requires: [Sjabloonbeoordeling](#screen-template_governance), [Rollen](#screen-staff-roles), [Toezichthoudende organen](#screen-governing_bodies)
Unlocks: [Actieve protocollen](#screen-protocols-active)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: protocols-review - Beoordelingswachtrij met aantallen per toestand en kaarten]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoeken | Tekst | Optioneel | Komt overeen met protocolnaam, categorie of bron. | Leeg |
| Toestandsblokken | Alleen-lezen aantallen: In beoordeling, Wijzigingen vereist, Goedgekeurd | Niet van toepassing | | Niet van toepassing |
| Protocol uploaden | Knop | Niet van toepassing | Opent het [venster Uploaden](#ch6-upload-window). | Niet van toepassing |
| Bouwen / Aanpassen | Knop | Niet van toepassing | Opent het [venster Bouwen](#ch6-build-window). | Niet van toepassing |
| Kaart: naam, versie, bronbadge, type, eigenaar | Alleen-lezen tekst | Niet van toepassing | Protocolgegevens. | Niet van toepassing |
| Kaart: badge van de levenscyclus | Alleen-lezen: In beoordeling, Wijzigingen vereist, Goedgekeurd | Niet van toepassing | | Niet van toepassing |
| Kaart: beoordelingsnotitie | Alleen-lezen tekst | Niet van toepassing | De laatste notitie van de beoordelaar, getoond met een retour- of waarschuwingsmarkering. | Leeg |
| Kaartactie | Opent de beoordelaar ("Beoordelaar openen", of "Beoordelaar openen om te publiceren" bij Goedgekeurd) of de editor ("Editor openen om wijzigingen door te voeren") | Niet van toepassing | | Niet van toepassing |

#### Acties van de beoordelaar {#ch6-reviewer-actions}
De beoordelaarspagina (geopend vanaf een kaart) verplaatst een protocol tussen toestanden. Elke verplaatsing vraagt om bevestiging en, bij een terugsturing, om een reden.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Markeren als in beoordeling | Knop | Niet van toepassing | Zet een concept in de beoordelingswachtrij. | Niet van toepassing |
| Goedkeuren (CAP: Accepteren; RCPath: Bekrachtigen) | Knop met bevestiging en optionele slotopmerkingen | Optionele opmerkingen | Vereist `config:protocol:approve`. Een persoon die het sjabloon heeft gemaakt of bewerkt, kan het niet goedkeuren tenzij zelfgoedkeuring aanstaat, en kan niet tweemaal goedkeuren. | Niet van toepassing |
| Publiceren (CAP: Vrijgeven) | Knop met bevestiging | Niet van toepassing | Vereist `config:protocol:publish`, het vereiste aantal onafhankelijke goedkeuringen en voor een diagnostisch sjabloon minstens 80% SNOMED-dekking op veldniveau. Publiceren maakt het in één keer beschikbaar voor alle pathologen. | Niet van toepassing |
| Wijzigingen vereist | Knop met verplichte reden | Verplichte reden | Stuurt het protocol terug naar de auteur. Vereist `config:protocol:approve`. | Niet van toepassing |
| Terugzetten naar concept | Knop | Niet van toepassing | Zet een protocol terug naar concept. | Niet van toepassing |

**7. Machtigingen.** Concept maken, importeren, bouwen, opslaan, indienen: `config:protocol:draft`. Goedkeuren en terugsturen voor wijzigingen: `config:protocol:approve`. Publiceren: `config:protocol:publish`. Buiten gebruik stellen (archiveren, herstellen): `config:protocol:retire`. Alle hoog risico en geaudit. Sjabloonauteur heeft draft; Sjabloongoedkeurder heeft approve, publish en retire; Beheerder heeft alle vier; Laboratoriumdirecteur heeft alle behalve draft. Indienen, terugsturen, goedkeuren en publiceren sturen elk een melding (naar goedkeurders, de auteur enzovoort).
**Bekende beperkingen.** De beoordelaar en de editor zijn aparte pagina's over de volle breedte (`/template-review/:id`, `/template-editor/:id`). Hun referentie per veld valt buiten de 15 schermen van dit hoofdstuk; zie [Velden van de sjablooneditor](#ch6-protocol-editor).
### Actieve protocollen {#screen-protocols-active}
Breadcrumb: Start > Configuratie > Synoptische bibliotheek > Actieve protocollen

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Synoptische bibliotheek** > **Actieve protocollen**
**2. Onderhoudsonderdeel:** Gepubliceerde protocollen

**3. Doel en reikwijdte.** De checklists die op dit moment in de synoptische rapportageworkflow worden aangeboden (toestand Gepubliceerd), gegroepeerd per categorie en te filteren op Chirurgische pathologie, Niet-GYN-cytologie, GYN-cytologie of Snijden. Klik op een rij om die uit te klappen voor statistieken, de voortgangsweergave van de levenscyclus en acties.

**4. Vereisten en afhankelijkheden.** Protocollen komen in deze lijst doordat ze vanuit de beoordelingswachtrij worden gepubliceerd, dus werk eerst de wachtrij af. Als u dit overslaat, is de lijst leeg ("Geen protocollen gevonden").

Setup step: Tier 5, step 8
Requires: [Beoordelingswachtrij](#screen-protocols-review), [Toezichthoudende organen](#screen-governing_bodies)
Unlocks: [Routeringsregels](#screen-templates-routing)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: protocols-active - Actieve protocollen gegroepeerd per categorie met een uitgeklapte rij]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Groepsfilter | Keuze: Alle, Chirurgische pathologie, Niet-GYN-cytologie, GYN-cytologie, Snijden, elk met een aantal | Optioneel | | Alle |
| Zoeken | Tekst | Optioneel | Komt overeen met naam, categorie of bron. | Leeg |
| Protocol uploaden | Knop | Niet van toepassing | Opent het [venster Uploaden](#ch6-upload-window). | Niet van toepassing |
| Bouwen / Aanpassen | Knop | Niet van toepassing | Opent het [venster Bouwen](#ch6-build-window). | Niet van toepassing |
| Rij: naam, versie, bronbadge, type, badge van de levenscyclus | Alleen-lezen tekst | Niet van toepassing | | Niet van toepassing |
| Secties | Alleen-lezen getal | Niet van toepassing | Een schatting: het aantal velden gedeeld door 7, afgerond, minimaal 1. Het is geen telling van de werkelijke secties van het protocol. | Niet van toepassing |
| Velden | Alleen-lezen getal | Niet van toepassing | | Niet van toepassing |
| Laatst gewijzigd | Alleen-lezen tekst | Niet van toepassing | | Niet van toepassing |
| Eigenaar | Alleen-lezen tekst | Niet van toepassing | | Niet van toepassing |
| SNOMED CT-dekking, ICD-10/11-dekking | Alleen-lezen balken, procent | Niet van toepassing | Dekking van de codering op veldniveau. | Niet van toepassing |
| Protocol bekijken | Knop | Niet van toepassing | Opent de alleen-lezen beoordelaar. | Niet van toepassing |
| Dupliceren | Knop | Niet van toepassing | Opent de editor met een kopie (een nieuw protocol). | Niet van toepassing |
| JSON exporteren | Knop | Niet van toepassing | Downloadt het protocol als PathScribe-JSON-bestand; de export wordt geaudit. | Niet van toepassing |
| Nieuwe versie | Knop | Niet van toepassing | Opent de editor op de volgende versie. Bij het publiceren van de nieuwe versie wordt deze gearchiveerd. | Niet van toepassing |
| Archiveren | Knop met bevestiging | Niet van toepassing | Haalt het uit nieuwe rapporten. Een gepubliceerd protocol toont een sterkere waarschuwing. Reeds geschreven rapporten behouden hun inhoud. Vereist `config:protocol:retire`. | Niet van toepassing |

**7. Machtigingen.** Zoals bij de [Beoordelingswachtrij](#screen-protocols-review). Bekijken en exporteren vereisen alleen het scherm.
**Bekende beperkingen.** Het aantal Secties is een schatting.

### Alle protocollen {#screen-protocols-all}
Breadcrumb: Start > Configuratie > Synoptische bibliotheek > Alle protocollen

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Synoptische bibliotheek** > **Alle protocollen**
**2. Onderhoudsonderdeel:** De volledige bibliotheek

**3. Doel en reikwijdte.** Elk protocol in elke toestand, gegroepeerd per categorie. Dit is de enige plaats om concepten en gearchiveerde protocollen te vinden en om een gearchiveerd protocol te herstellen.

**4. Vereisten en afhankelijkheden.** Niets, behalve dat de bibliotheek inhoud moet hebben.

Setup step: Reference, not part of setup
Requires: [Beoordelingswachtrij](#screen-protocols-review)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: protocols-all - Alle protocollen met statusfilterknoppen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Statusfilter | Keuze: Alle, Gepubliceerd, Goedgekeurd, In beoordeling, Wijzigingen vereist, Concept, Gearchiveerd, elk met een aantal | Optioneel | **Alle** verbergt gearchiveerde protocollen; ze verschijnen alleen onder **Gearchiveerd**. | Alle |
| Zoeken | Tekst | Optioneel | Komt overeen met naam, categorie of bron. | Leeg |
| Protocol uploaden, Bouwen / Aanpassen | Knoppen | Niet van toepassing | Zoals hierboven. | Niet van toepassing |
| Rij: naam, versie, bron, type, badge van de levenscyclus, beoordelingsnotitie | Alleen-lezen | Niet van toepassing | | Niet van toepassing |
| Reviewer openen | Knop, niet bij Gepubliceerd of Gearchiveerd | Niet van toepassing | | Niet van toepassing |
| Editor openen | Knop, niet bij Gepubliceerd of Gearchiveerd | Niet van toepassing | | Niet van toepassing |
| Dupliceren, JSON exporteren, Archiveren | Knoppen | Niet van toepassing | Zoals bij Actieve protocollen (Dupliceren en Archiveren worden niet aangeboden bij een gearchiveerde rij). | Niet van toepassing |
| Herstellen als concept | Knop, alleen bij gearchiveerde rijen | Niet van toepassing | Brengt een gearchiveerd protocol terug als concept; het moet opnieuw door de beoordeling. | Niet van toepassing |

**7. Machtigingen.** Zoals bij de Beoordelingswachtrij.
**Bekende beperkingen.** Geen bekend.

#### Venster Uploaden {#ch6-upload-window}
Breadcrumb: Start > Configuratie > Synoptische bibliotheek > Protocol uploaden

[SCREENSHOT PLACEHOLDER: protocols-upload - Venster Protocol uploaden met toezichthoudend orgaan en zone om bestanden neer te zetten]

Ondertitel: "Handmatig uploaden, de terugvaloptie als de nachtelijke synchronisatie een update mist". Een waarschuwing meldt dat een geïmporteerd protocol als concept wordt opgeslagen en ter beoordeling moet worden ingediend en goedgekeurd voordat het kan worden gepubliceerd.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Toezichthoudend orgaan | Keuze: CAP, RCPath, ICCR, RCPA, Overig | Verplicht | Wordt vastgelegd als bron van het concept. | CAP |
| Bestand | JSON-, XML- of XLSX-bestand, tot 10 MB, neergezet of gezocht | Verplicht | Wordt gelezen en gecontroleerd zodra het is gekozen. | Geen |
| Resultaat van de indelingscontrole | Alleen-lezen lijst | Niet van toepassing | Meldt of de indeling geldig is, noemt problemen en stelt altijd dat de inhoud niet is geverifieerd aan CAP of RCPath. Alleen een PathScribe-JSON-protocol kan worden geïmporteerd. Een CAP-eCC-formulier (SDC XML) of een Excel-werkmap wordt gecontroleerd maar "kan hier worden gecontroleerd, maar nog niet worden geïmporteerd". | Niet van toepassing |
| Importeren als concept | Knop | Niet van toepassing | Slaat het concept op. Geweigerd als er al een protocol met dezelfde naam bestaat, of zonder `config:protocol:draft`. | Uitgeschakeld totdat het bestand kan worden geïmporteerd |

#### Venster Bouwen / Aanpassen {#ch6-build-window}
Breadcrumb: Start > Configuratie > Synoptische bibliotheek > Bouwen / Aanpassen

[SCREENSHOT PLACEHOLDER: protocols-build - Venster Bouwen / Aanpassen]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Vanaf nul beginnen | Keuze | Optioneel | Opent de editor op een leeg sjabloon. | Niet van toepassing |
| Zoeken naar bestaand sjabloon | Tekst | Optioneel | Zoekt op naam, bron of categorie. | Leeg |
| Bestaand sjabloon | Keuze uit de bibliotheek, elk met versie en aantal velden | Optioneel | Het sjabloon dat moet worden gekopieerd. | Geen |
| Dit sjabloon aanpassen | Knop | Niet van toepassing | Opent de editor op een kopie. | Niet van toepassing |

#### Velden van de sjablooneditor {#ch6-protocol-editor}
Breadcrumb: Start > Configuratie > Synoptische bibliotheek > Sjablooneditor

[SCREENSHOT PLACEHOLDER: protocols-editor - Synoptische sjablooneditor met metadata, secties en velden]

De editor is een pagina over de volle breedte. Het blok **Sjabloonmetadata** staat hieronder; secties en velden hebben veel verdere instellingen (veldtype, antwoordopties met SNOMED- en ICD-codering, condities, telregels, rapportagerollen pT, pN, pM, FIGO-stadium en blokidentificatie). De volledige referentie voor die pagina is een openstaande vraag voor de handleiding.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Sjabloonnaam | Tekst | Verplicht | Moet uniek zijn onder de niet-gearchiveerde protocollen. | Leeg |
| Anatomische categorie | Keuze uit categorieknoppen | Optioneel | Groepeert het protocol in de lijsten. | Leeg |
| Bron / Overkoepelende instantie | Keuze uit bronknoppen | Verplicht | Bepaalt de namen van de acties (Accepteren, Bekrachtigen, Goedkeuren). | Custom |
| Classificatiesysteem | Tekst | Optioneel | Voor cytologische systemen, bijvoorbeeld de editie van Bethesda. | Leeg |
| Editie stadiëring | Tekst | Optioneel | Bijvoorbeeld `AJCC 8th`. | Leeg |
| Versie | Hoofd-, tussen- en patchnummers met ophoogknoppen | Verplicht | Wordt bij Nieuwe versie automatisch opgehoogd. | `1.0.0` |
| Concept opslaan | Knop | Niet van toepassing | Vereist `config:protocol:draft`. | Niet van toepassing |
| Indienen ter beoordeling | Knop met bevestiging | Niet van toepassing | Zet het sjabloon in de beoordelingswachtrij en meldt het aan beheerders en klinische leidinggevenden. U kunt het niet bewerken totdat het is teruggestuurd. | Niet van toepassing |

## Geplande rapportengine en regels voor automatische distributie {#ch6-scheduled-delivery}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance

Drie instellingen bepalen wat er na de ondertekening met een rapport gebeurt: **Leveringsconfiguratieregels** kiezen de kanalen, **Routeringsregels voor afdrukbestemmingen** kiezen de printer voor het afdrukkanaal en **Verzendschema's** kiezen het tijdstip. Een vierde scherm, **Mijn exports**, toont de bestanden die een persoon heeft aangevraagd.

**Status per kanaal.**

| Kanaal | Status | Wat er vandaag bestaat |
|---|---|---|
| Fax | Gerealiseerd | Een leveringsregel kan een kanaal instellen op E-fax met een faxnummer (7 tot 15 cijfers, optioneel met voorafgaand `+`). PathScribe stuurt de ondertekende PDF en de bijbehorende gegevens als bericht `REPORT_DELIVERY` naar de interfaceserver; de server geeft die door aan een e-mail-naar-faxgateway. De gateway wordt op de server ingericht, niet in PathScribe. Als de server geen faxkanaal heeft, antwoordt die met 503 en mislukt de levering met die reden. Contract: `REPORT_DELIVERY_API.md`; ontwikkelontvanger: `functions/report_delivery.py`. Maximale PDF-grootte 20 MB. |
| Portaal | Niet gerealiseerd | Er is geen portaalkanaal in de leveringsregels. Het faciliteitsrecord heeft een keuze **Bezorgmethode** (E-mail, Fax, Portaal, HL7) die wordt opgeslagen, maar waar niets naar kijkt wanneer een rapport wordt verzonden. |
| Beveiligde e-mail | Demonstratie | Geen kanaal van een leveringsregel. Een persoon start vanuit een venster een aan een casus gekoppeld beveiligd bericht; het wordt bezorgd in de [Gesimuleerde postvak-uit](#screen-simulated_mail) en er verlaat niets het gebouw. Een echt e-mailkanaal is niet gekoppeld. |
| Afdrukwachtrij | Gerealiseerd | Het afdrukkanaal maakt een afdrukopdracht aan. De printer komt uit de routeringsregels voor afdrukken, anders uit de eigen standaardbestemming van de faciliteit. Opdrachten worden beheerd op het scherm Afdrukwachtrij (zie [Deel 4](#ch6-batch-jobs)). |
| Elektronisch (uitslagbericht) | Gerealiseerd | Het uitslagbericht naar de koppelingsengine. Het is de standaard wanneer geen regel overeenkomt. |
| Bestandsdepot | Gerealiseerd | De server schrijft de PDF naar een map of SFTP-bestemming. De regel noemt de bestemming; de server bewaart het adres en de aanmeldgegevens ervan. |

### Leveringsconfiguratieregels {#screen-delivery_rules}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Leveringsconfiguratieregels

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** Leveringsconfiguratieregels

**3. Doel en reikwijdte.** Bepaalt hoe elk vrijgegeven rapport wordt verzonden: via het uitslagbericht, afgedrukt, gefaxt, neergezet op een bestandsbestemming, of vastgehouden voor handmatig ophalen. Een regel komt overeen op basis van zorgverlener, aanvragende instelling, patiëntlocatie (point of care) en rapporttype. De regel die met de meeste velden overeenkomt, wint. Wanneer niets overeenkomt, gaat het rapport **Alleen elektronisch**. Het scherm bevat ook de instelling voor automatische nieuwe pogingen van de locatie en een testpaneel.

**4. Vereisten en afhankelijkheden.** Regels verwijzen naar zorgverleners, faciliteiten en locaties, en een afdrukkanaal heeft een plaats nodig om af te drukken. Als u de faciliteiten en artsen overslaat, zijn de criterialijsten leeg. Als u de routering voor afdrukken overslaat, valt een afdrukopdracht terug op de eigen standaardbestemming van de faciliteit.

Setup step: Tier 5, step 10
Requires: [Faciliteitsconfiguratie](#screen-clients), [Artsen](#screen-physicians), [Routeringsregels voor afdrukbestemmingen](#screen-print_routing_rules)
Unlocks: [Verzendschema's](#screen-delivery_schedules)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-delivery_rules - Leveringsconfiguratieregels met de regeltabel, de instelling voor nieuwe pogingen en het testpaneel]

**6. Veldreferentie.**

Bedieningselementen van het scherm:

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Regeltabel: criteria, kanalen, opmerking | Alleen-lezen lijst | Niet van toepassing | Criteria worden gelezen als Zorgverlener, Faciliteit, Locatie en Rapport, of "Komt overeen met elke case (laagste prioriteit)". Kanalen worden gelezen als lijsten Primair, Secundair en Reserve, of "Er wordt niets verzonden". | Leeg: elke casus wordt opgelost naar Alleen elektronisch |
| Regel toevoegen | Knop | Niet van toepassing | Opent het regelvenster. | Niet van toepassing |
| Bewerken, Verwijderen | Rijknoppen | Niet van toepassing | | Niet van toepassing |
| Automatische nieuwe pogingen: wachttijd voor elke poging (minuten) | Hele minuten gescheiden door komma's, elk 1 tot 1.440, maximaal 10 | Optioneel | Een afdrukopdracht, fax of bestandsdepot die mislukt, wordt na elke wachttijd achtereenvolgens opnieuw geprobeerd. Na de laatste poging gaat de levering naar de leveringsuitzonderingen, ontvangen Beheerder en Laboratoriumdirecteur een bericht en worden de reservekanalen van de regel gebruikt. Leeg betekent geen nieuwe pogingen. | `1, 5, 15` |
| Nieuwe pogingen opslaan | Knop | Niet van toepassing | Vereist `config:delivery-rules:manage`. | Niet van toepassing |

#### Een leveringsregel toevoegen of bewerken {#ch6-delivery-rule-window}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Leveringsconfiguratieregels > Regel toevoegen

[SCREENSHOT PLACEHOLDER: system-delivery_rules-edit - Venster Leveringsregel toevoegen met criteria en kanalen]

Elk criterium is optioneel. Een regel waarvan er geen is ingesteld, komt overeen met elke casus, maar alleen als overeenkomst met de laagste prioriteit. Het venster waarschuwt hiervoor.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zorgverlener | Keuzelijst met artsen | Optioneel | | Elke zorgverlener |
| Aanvragende instelling | Keuzelijst met faciliteiten | Optioneel | | Elke faciliteit |
| Patiëntlocatie (point of care) | Keuzelijst met locaties | Optioneel | | Elke locatie |
| Rapporttype | Keuze: Voorlopig, Definitief, Gecorrigeerd, Addendum | Optioneel | | Elk rapporttype |
| Kanaal: elektronisch (uitslagbericht naar de koppelingsengine) | Keuze: Uit, Primair, Secundair, Reserve | Optioneel | Primaire en secundaire kanalen gaan direct. Reservekanalen gaan wanneer een primaire afdrukopdracht, fax of bestandsdepot nergens heen kan of na de nieuwe pogingen nog steeds mislukt. | Uit |
| Kanaal: afdrukken | Idem | Optioneel | | Uit |
| Kanaal: e-fax | Idem | Optioneel | | Uit |
| Kanaal: bestandsdepot | Idem | Optioneel | | Uit |
| Faxnummer | Tekst, 7 tot 15 cijfers met optioneel `+` | Optioneel | Laat leeg om de aanvragende arts te faxen, of zonder faxnummer de aanvragende instelling. | Leeg |
| Bestemming van de bestandslevering | Tekst, de naam van de bestemming zoals ingericht op de interfaceserver | Verplicht wanneer Bestandsdepot aanstaat | De map of SFTP-server en de aanmeldgegevens worden op de server bewaard, niet in PathScribe. | Leeg |
| Opmerking | Tekst | Optioneel | Waarom de regel bestaat. | Leeg |

Een reserve zonder primair kanaal wordt geweigerd ("Een reservekanaal heeft een primair kanaal nodig."). Een faxnummer dat niet 7 tot 15 cijfers heeft, of een bestandsdepot zonder bestemming, wordt geweigerd.

#### Leveringsresolutie testen {#ch6-delivery-test}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Leveringsconfiguratieregels > Test

[SCREENSHOT PLACEHOLDER: system-delivery_rules-test - Paneel Leveringsresolutie testen]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zorgverlener, aanvragende instelling, patiëntlocatie, rapporttype | Keuzelijsten, zoals hierboven | Optioneel | De casusgegevens die moeten worden getest. | Alle |
| Oplossen | Knop | Niet van toepassing | Toont de overeenkomende regel, de opgeloste actie (Alleen elektronisch, Alleen afdrukken, Dubbele levering, Onderdrukken) en het kanaalplan. Zonder overeenkomst meldt het dat de standaard Alleen elektronisch geldt. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Regels toevoegen, wijzigen, verwijderen en nieuwe pogingen opslaan: `config:delivery-rules:manage` (hoog risico, geaudit). Beheerder en Laboratoriumdirecteur hebben haar. Het opnieuw verzenden van een mislukte levering gebruikt de schermen Afdrukwachtrij of Uitgaand en hun eigen machtigingen.
**Bekende beperkingen.** Fax en bestandsdepot vereisen dat die kanalen en bestemmingen op de interfaceserver zijn ingericht. Portaal is Niet gerealiseerd. Beveiligde e-mail is hier geen kanaal.

### Verzendschema's {#screen-delivery_schedules}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Verzendschema's

**Status:** Gedeeltelijk

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** Verzendschema's

**3. Doel en reikwijdte.** Stelt per feed in **wanneer** er iets wordt verzonden, voor de hele onderneming, met een optionele overschrijving voor een uitvoerende faciliteit. Registers krijgen elk een eigen schema. PathScribe bepaalt wanneer een item zijn wachtrij mag verlaten; de koppelingsengine bepaalt hoe het wordt verzonden. Feeds: rapportlevering, factuurlevering, uitslagenfeed, opnamefeed (ADT), accessiefeed, LIS-synchronisatie, register. **Gedeeltelijk:** het schema wordt opgeslagen, opgelost en geëvalueerd, en de uitgaande wachtrij toont per item het geplande tijdstip en de markering voor de meldingstermijn. Het contract bepaalt dat de productieserver dezelfde regels moet toepassen voordat een item wordt doorgegeven; een browser- of ontwikkelbuild houdt een verzending niet vast tot het tijdstip is bereikt.

**4. Vereisten en afhankelijkheden.** Een overschrijving per faciliteit kiest uit de faciliteiten, dus die komen eerst. Als u dit overslaat, kan alleen het schema van de onderneming worden ingesteld.

Setup step: Tier 5, step 11
Requires: [Faciliteitsconfiguratie](#screen-clients), [Leveringsconfiguratieregels](#screen-delivery_rules)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-delivery_schedules - Verzendschema's per feed met bereik onderneming en faciliteit]

**6. Veldreferentie.**

Bedieningselementen van het scherm:

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Schema's voor | Keuze: Hele onderneming, of één uitvoerende faciliteit | Optioneel | Het bereik dat wordt bewerkt. | Hele onderneming |
| Feedkaart: samenvatting en bron | Alleen-lezen tekst | Niet van toepassing | De samenvatting leest bijvoorbeeld "Bundel ma, wo om 06:00 (America/New_York)". De bron leest "Geen schema ingesteld: direct verzonden", "Volgt het schema van de onderneming" of "Ingesteld voor deze locatie". | Direct verzonden |
| Registerkaarten | Eén kaart per register | Optioneel | Elk register heeft een eigen schema en leent nooit dat van een ander. | 240 minuten vasthouden na ondertekening; een amendement zet het opnieuw in de wachtrij |
| Bewerken, Instellen voor deze locatie, Onderneming volgen | Knoppen | Niet van toepassing | Maken of verwijderen een overschrijving per faciliteit. Door de overschrijving te verwijderen volgt de faciliteit de onderneming. | Niet van toepassing |

#### Schema-editor {#ch6-schedule-editor}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Verzendschema's > Bewerken

[SCREENSHOT PLACEHOLDER: system-delivery_schedules-edit - Schema-editor]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Hoe het wordt verzonden | Keuze: Direct verzenden, Alleen binnen vaste uren, Gebundeld op vaste tijden, Vasthouden tot de definitieve ondertekening, Bij ondertekening na een beoordelingsperiode | Verplicht | | Direct verzenden |
| Uren waarop items mogen worden verzonden | Rijen met Dagen, Van, Tot (24-uurs); Uren toevoegen / Verwijderen | Verplicht voor vaste uren | Elke rij moet op dezelfde dag eindigen na het begin. | Geen |
| Frequentie (hoe vaak) | Keuze: Dagelijks, Wekelijks, Maandelijks | Verplicht voor bundel | | Geen |
| Bundeldagen | Weekdagen ma tot zo | Verplicht voor wekelijks | | Geen |
| Dagen van de maand | Getallen 1 tot 28, gescheiden door komma's | Verplicht voor maandelijks | | Geen |
| Bundeltijden (24-uurs) | Tijden zoals `06:00, 22:00` | Verplicht voor bundel | | Geen |
| Sluitingstijd (optioneel) | Tijd, 24-uurs | Optioneel | Items die na dit tijdstip op een dag met een run zijn ondertekend, wachten op de volgende run. Leeg gebruikt het tijdstip van de run. | Leeg |
| Beoordelingsperiode (minuten na ondertekening) | Geheel getal, 1 tot 10.080 | Verplicht voor beoordelingsperiode | Stem haar af op het venster voor QA en amendementen. | Geen |
| Dagen zonder verzending | Datums `YYYY-MM-DD`, gescheiden door komma's | Optioneel | Bijvoorbeeld feestdagen. Geldt voor uren en bundel. | Leeg |
| Tijdzone | IANA-naam, bijvoorbeeld `America/New_York` | Verplicht | De bovenstaande tijden worden in deze zone gelezen. | Geen |
| Meldingstermijn (dagen na ondertekening) | Geheel getal, 1 tot 3.650 | Optioneel | De wachtrij markeert casussen die er dichtbij (binnen 3 dagen) of voorbij zijn. | Leeg |
| Een amendement zet het item terug in de wachtrij | Ja/nee-schakelaar | Optioneel | Een gecorrigeerd rapport wordt volgens dit schema opnieuw verzonden. Standaard aan voor registers. | Uit, behalve registers |
| Schema opslaan | Knop | Niet van toepassing | Geweigerd als het ongeldig is of zonder machtiging. | Niet van toepassing |

#### Een schema uitproberen {#ch6-schedule-test}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Verzendschema's > Een schema uitproberen

[SCREENSHOT PLACEHOLDER: system-delivery_schedules-test - Paneel Een schema uitproberen]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Feed | Keuze uit feeds | Verplicht | | Geen |
| Uitvoerende faciliteit | Keuze, of Geen (schema van de onderneming) | Optioneel | | Geen |
| Register | Keuze | Verplicht voor de feed Register | | Geen |
| Datum en tijd (in de tijdzone van het schema) | Datum en tijd | Verplicht | | Nu |
| De casus is definitief ondertekend | Ja/nee | Optioneel | | Nee |
| Ondertekend op | Datum en tijd | Optioneel | | Leeg |
| Controleren | Knop | Niet van toepassing | Antwoordt "Het wordt verzonden" of "Het wacht", met de reden en de eerstvolgende gelegenheid. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Wijzigen: `config:delivery-schedules:manage` (hoog risico, geaudit per feed, faciliteit, register en soort; geen patiëntgegevens). Beheerder en Laboratoriumdirecteur hebben haar.
**Bekende beperkingen.** Registerbestemmingen, verplichte velden, goedkeuring voor ingebruikname en transport horen bij de eigen inrichting van het register, niet bij het schema. Zie `DELIVERY_SCHEDULES_API.md`.
### Routeringsregels voor afdrukbestemmingen {#screen-print_routing_rules}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Routeringsregels voor afdrukbestemmingen

**Status:** Gerealiseerd

**1. Navigatie:** tabblad Configuratie **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** Routeringsregels voor afdrukbestemmingen

**3. Doel en reikwijdte.** Bepaalt naar welke netwerkprinter de afdrukopdracht van een vrijgegeven rapport gaat. Het bereik van een regel is een niveau: **Werkstation / Gebruiker**, **Locatie**, **Klantaccount (aanvragende instelling)** of **Instelling (uitvoerend laboratorium)**. Het meest specifieke niveau met een overeenkomende, actieve regel wint volledig van minder specifieke niveaus. Binnen een niveau kan een regel worden beperkt naar preparaat- of casustype en naar gebeurtenistrigger. Wanneer niets overeenkomt, gaat de opdracht naar de eigen standaardbestemming van de faciliteit.

**4. Vereisten en afhankelijkheden.** Een regel noemt een printer die via een site-agent of via een adres wordt bereikt, en een bereik dat uit werkstations, locaties en faciliteiten wordt gekozen. Als u de site-agents overslaat, kan alleen een printeradres worden opgegeven. Een regel voor een faciliteit moet de printers van de eigen site-agent van die faciliteit gebruiken.

Setup step: Tier 5, step 9
Requires: [Site-agents](#screen-site_agents), [Faciliteitsconfiguratie](#screen-clients), [Werkstations](#screen-workstations)
Unlocks: [Leveringsconfiguratieregels](#screen-delivery_rules)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-print_routing_rules - Routeringsregels voor afdrukbestemmingen met tabel en testpaneel]

**6. Veldreferentie.**

Bedieningselementen van het scherm:

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Regeltabel: bereik, criteria, bestemming, opmerking | Alleen-lezen lijst | Niet van toepassing | Criteria luiden "Preparaat: ...", "Trigger: ..." of "Komt overeen met elke opdracht op dit niveau". | Leeg: opdrachten gebruiken de standaardbestemming van elke faciliteit |
| Regel toevoegen, Bewerken, Verwijderen | Knoppen | Niet van toepassing | | Niet van toepassing |

#### Een routeringsregel voor afdrukken toevoegen of bewerken {#ch6-print-rule-window}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Routeringsregels voor afdrukbestemmingen > Regel toevoegen

[SCREENSHOT PLACEHOLDER: system-print_routing_rules-edit - Venster Routeringsregel voor afdrukken toevoegen]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Bereikniveau | Keuze: Werkstation / Gebruiker, Locatie, Klantaccount (aanvragende instelling), Instelling (uitvoerend laboratorium) | Verplicht | | Geen |
| Bereik | Id van werkstation of gebruiker (tekst, bijvoorbeeld `ws-fgh-theatre2-01`), of een keuzelijst met locaties of faciliteiten | Verplicht | Er verschijnt een waarschuwing wanneer het ontbreekt. | Geen |
| Preparaat-/Casustype | Keuze: Routine chirurgisch, Vriescoupe, Cytologie | Optioneel | | Elk preparaat-/casustype |
| Gebeurtenistrigger | Keuze: Eerste ondertekening, Gewijzigde ondertekening (gecorrigeerd/addendum), Voorlopig | Optioneel | | Elke gebeurtenistrigger |
| Afdrukbestemming: printer | Keuze: Printer van de site-agent, of Printeradres (rechtstreeks verzonden) | Verplicht | Een direct adres werkt alleen vanaf een PathScribe-server binnen het ziekenhuisnetwerk; gebruik vanuit de cloud een printer van de site-agent. | Geen |
| Locatie (uitvoerend laboratorium) | Keuzelijst | Verplicht voor een printer van een site-agent | | Geen |
| Printer | Keuzelijst met de rapportprinters van de site-agent | Verplicht voor een printer van een site-agent | Vereist de machtiging om de printers van die locatie te zien. | Geen |
| Adres | IP-adres of hostnaam, zonder `http://` of pad | Verplicht voor een direct adres | | Geen |
| Protocol | Keuze: IPP, LPR/LPD, Raw (poort 9100) | Verplicht voor een direct adres | | Geen |
| Poort | Geheel getal 1 tot 65535 | Optioneel | | De standaardpoort van het protocol |
| IPP-pad | Tekst | Optioneel, alleen IPP | | `/ipp/print` |
| LPR-wachtrij | Tekst | Optioneel, alleen LPR/LPD | | `lp` |
| Naam | Tekst | Optioneel | Een herkenbare naam voor de printer. | Leeg |
| Opmerking | Tekst | Optioneel | Waarom de regel bestaat. | Leeg |

#### Resolutie van de afdrukbestemming testen {#ch6-print-test}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Routeringsregels voor afdrukbestemmingen > Test

[SCREENSHOT PLACEHOLDER: system-print_routing_rules-test - Paneel Resolutie van de afdrukbestemming testen]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Id van werkstation / gebruiker | Tekst | Optioneel | | Leeg |
| Locatie, aanvragende instelling, uitvoerende faciliteit | Keuzelijsten | Optioneel | | Alle |
| Preparaat-/casustype, gebeurtenistrigger | Keuzes | Optioneel | | Alle |
| Oplossen | Knop | Niet van toepassing | Toont de overeenkomende regel en het niveau ervan, en de opgeloste bestemming. Zonder overeenkomst meldt het dat de opdracht zou terugvallen op de standaardbestemming van de faciliteit. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, wijzigen, verwijderen: `config:print-routing:manage` (hoog risico, geaudit). Het noemen van de printer van de agent van een locatie wordt op die locatie gecontroleerd, evenals het zien van de printers ervan. Beheerder en Laboratoriumdirecteur hebben haar.
**Bekende beperkingen.** De standaardbestemming en afdrukmodus van de faciliteit (benoemde QZ Tray-printer, overdracht aan de koppelingsengine of direct netwerkafdrukken) en het papierformaat worden ingesteld op het tabblad Afdrukken van het faciliteitsrecord in het [Faciliteitswoordenboek](#screen-facility-dictionary), niet hier. Direct netwerkafdrukken vereist een PathScribe-server of site-agent binnen het ziekenhuisnetwerk; een browser kan geen printersocket openen.

### Mijn exports {#screen-my-exports}
Breadcrumb: Start > Mijn exports

**Status:** Demonstratie

**1. Navigatie:** De exportknop in de bovenbalk, die het aantal exports toont dat klaarstaat om te downloaden. De knop verschijnt alleen wanneer een API-server is gekoppeld; open in de demonstratie de pagina op `/my-exports`.
**2. Onderhoudsonderdeel:** De eigen exportbestanden van de aangemelde persoon

**3. Doel en reikwijdte.** Grote exports (QA-, audit-, vernietigings- en zoekrapporten) worden als achtergrondtaken voorbereid. De persoon vraagt de export aan, krijgt bericht wanneer het bestand klaar is en downloadt het hier. Bestanden worden 7 dagen bewaard en alleen de persoon die ze heeft aangevraagd kan ze downloaden. In deze demonstratie worden exports direct gedownload, dus de lijst is normaal gesproken leeg. Een banner markeert de gesimuleerde server: exports worden in de browser voorbereid en alleen tot het afmelden bewaard. Het API-contract is `ASYNC_EXPORT_API.md`; met de PathScribe-server gekoppeld wordt een grote export daar voorbereid en verschijnt hij hier wanneer hij klaar is.

**4. Vereisten en afhankelijkheden.** Geen om het te openen. Een export verschijnt alleen als de eigen exportmachtiging ervan is verleend (bijvoorbeeld `qa:deficiencies:export`); verleen die dus in de rollen van het personeel aan de mensen die ze nodig hebben.

Setup step: Reference, not part of setup
Requires: [Rollen](#screen-staff-roles)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-my-exports - Lijst Mijn exports met status, rijen en download]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Export | Alleen-lezen tekst | Niet van toepassing | De titel van de export. | Niet van toepassing |
| Aangevraagd | Alleen-lezen datum en tijd | Niet van toepassing | | Niet van toepassing |
| Status | Alleen-lezen: Wacht, Wordt voorbereid, Klaar, Mislukt, Geannuleerd, Verlopen | Niet van toepassing | | Niet van toepassing |
| Rijen | Alleen-lezen getal | Niet van toepassing | | Niet van toepassing |
| Verwijderd na | Alleen-lezen datum | Niet van toepassing | Zeven dagen na de aanvraag. | Niet van toepassing |
| Acties: Downloaden, Annuleren | Knoppen | Niet van toepassing | Downloaden wanneer Klaar; Annuleren terwijl Wacht of Wordt voorbereid. | Niet van toepassing |
| Vernieuwen | Knop | Niet van toepassing | | Niet van toepassing |
| Exports langer laten duren (om het wachten uit te proberen) | Ja/nee-schakelaar, alleen getoond op de gesimuleerde server | Optioneel | Een demonstratiebediening. | Uit |

**7. Machtigingen.** De pagina vereist alleen een aangemelde persoon en toont de eigen exports van die persoon. Elke export wordt aangevraagd onder een eigen machtiging `...:export`, die hoog risico is en wordt geaudit als `DOCUMENT_EXPORTED` met het aantal rijen.
**Bekende beperkingen.** De serverkant is niet gekoppeld. Configuratie-exports (woordenboeken, conversietabellen, de artsenlijst) zijn klein, blijven in de browser en verschijnen hier niet. Geplande runs van opgeslagen rapporten (pagina Zoeken, Rapport > Schema's) zijn Gesimuleerd en versturen niets; ze hebben een eigen contract in `SCHEDULED_REPORTS_API.md`.

## Inrichting van batchafdrukken en de nachtelijke taakplanner {#ch6-batch-jobs}
Breadcrumb: Start > Configuratie

**Status van dit deel:** Gedeeltelijk. Er is geen enkel scherm "batchafdrukken en nachtelijke taakplanner", en een beheerder kan geen geplande taak aanmaken of bewerken. Wat er bestaat, staat hieronder, met het hoofdstuk dat elk scherm beschrijft.

| Onderdeel | Status | Waar het wordt geconfigureerd | Waar het is beschreven |
|---|---|---|---|
| Afdrukwachtrij (vasthouden, vrijgeven, annuleren, opnieuw proberen, omleiden, bulkacties) | Gerealiseerd | Opdrachten worden beheerd in Systeemlogboeken > Koppelingen > Afdrukwachtrij. Printers en routering worden ingesteld in [Routeringsregels voor afdrukbestemmingen](#screen-print_routing_rules) en op het tabblad Afdrukken van de faciliteit. | [Systeemlogboeken: koppelingen](#screen-audit-interfaces) |
| Samenvoegen van afdrukbatches ("Batch nu uitvoeren") | Gedeeltelijk | Een knop op het scherm Afdrukwachtrij met een begin en einde van het venster (24-uurs tijden, gelezen als UTC) en een groeperingskeuze (Klantaccount of Leverroute). Het groepeert in de wachtrij staande, niet-gekoppelde opdrachten die in het venster zijn ondertekend onder gedeelde batch-id's. Het draait alleen wanneer iemand op de knop drukt. Een terugkerende taak met de naam `print.batchAggregation` verschijnt in de lijst met servertaken zonder vast interval, maar in deze build is geen tijdschema ingesteld. | [Systeemlogboeken: koppelingen](#screen-audit-interfaces) |
| Etiketten opnieuw afdrukken per batch | Gerealiseerd | Batchbeheer > Etiketten herdrukken: zoek casussen op accessiedatum of -nummer, kies cassettes, monstercontainers of aanvraagformulieren, kies een cassetteprinter en druk één etiket tegelijk opnieuw af. Elk etiket wordt geaudit; mislukte etiketten kunnen opnieuw worden geprobeerd. Vereist `label:batch:reprint`. | [Batchbeheer](#screen-batch-management) |
| Geplande exports | Demonstratie | Opgeslagen zoekrapporten voor casussen kunnen worden gepland (dagelijks, wekelijks of maandelijks) via de pagina Zoeken, Rapport > Schema's. Een run wordt gesimuleerd en verstuurt niets. Grote exports draaien als achtergrondtaken en staan in [Mijn exports](#screen-my-exports). | `SCHEDULED_REPORTS_API.md`, `ASYNC_EXPORT_API.md` |
| Servertaken (wachtrijstatus, dead letters, opnieuw in de wachtrij zetten) | Gerealiseerd, alleen lezen en opnieuw in de wachtrij zetten | Systeemlogboeken > Servertaken. Toont de taaksoorten (koppelingsverzending, leveringspoging, afdrukverzending, vrijgave van vastgehouden rapporten, kostenverzending, exportopbouw, gebeurtenis) en de terugkerende taken met hoe vaak elk draait. Vereist `jobs:server-job:view`; het opnieuw in de wachtrij zetten van een dead-lettertaak vereist `jobs:server-job:requeue`. | [Systeemlogboeken](#screen-audit-log) |
| Nachtelijke taakplanner (taken aanmaken, bewerken, in- of uitschakelen) | Niet gerealiseerd | Terugkerende taken liggen vast op de API-server. Het scherm Servertaken toont ze en laat hun status zien, maar heeft geen bediening om een tijdstip te wijzigen of er een uit te zetten. | Niet van toepassing |
| Nachtelijke protocolsynchronisatie (CAP, RCPath, ICCR) | Niet gerealiseerd | Zie [Synoptische bibliotheek](#ch6-synoptic). | Niet van toepassing |

**Terugkerende taken die de server vandaag toont** (minuten tussen de runs): sweep voor nieuwe leveringspogingen (0,5), sweep voor aflopende vrijgave (0,25), verlopen van consultlinks (5), escalatie van verouderde registeritems (60), dagelijkse meldingen voor opvolging (1440), verlopen van supporttoegang (5), sweep voor cytologie-histologiecorrelatie (1440), LIS-polling (eigen schema), afdrukbatchaggregatie (eigen schema), SLA-bewaking van cytologie-ROSE (5), opschoning van de berichtenbus (1440).

**Volgorde van inrichting voor batchwerk.** Voor servertaken valt niets te configureren. Rond voor afdrukken eerst de [Routeringsregels voor afdrukbestemmingen](#screen-print_routing_rules) af en controleer dan de Afdrukwachtrij. Richt voor het opnieuw afdrukken van etiketten eerst de cassetteprinter in onder Printerprofielen. Verleen `label:batch:reprint` en de machtigingen `print:job:*` in de rollen van het personeel aan de mensen die dit uitvoeren.
