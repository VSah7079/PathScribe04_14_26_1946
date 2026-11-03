---
chapter: 2
id: ch2
title: Niveau 1: Primaire systeemvoorwaarden (eerst inrichten)
---

# Niveau 1: Primaire systeemvoorwaarden (eerst inrichten) {#ch2}

Niveau 1 is het deel van de Configuratie waarop alle andere instellingen steunen. Het beantwoordt vier vragen voordat er iets anders kan worden ingericht: welke laboratoriumlocaties er bestaan, wie wat mag doen, welke fysieke apparaten de locaties gebruiken en welke regels voor de hele organisatie gelden. Latere niveaus lezen hieruit. Een afdeling vraagt om een faciliteit. Een verslagsjabloon routeert op rol. Een label wordt afgedrukt via een printerprofiel. Als een scherm van niveau 1 leeg is, tonen de schermen die ervan afhangen lege keuzelijsten of weigeren zij op te slaan.

Richt niveau 1 in deze volgorde in. Elk scherm hieronder heeft een kader **Inrichtingsvolgorde** met dezelfde informatie, en de builder controleert dat geen scherm iets vereist dat later in de volgorde komt.

1. [Faciliteitenwoordenboek](#screen-facility-dictionary): de onderneming, haar uitvoerende laboratoria en aanvragende klanten.
2. [Deelnametypen](#screen-participation_types): de rollen in een casus (primair, arts-assistent, consulent) en wie mag ondertekenen.
3. [Rollen](#screen-staff-roles): wat elke functie mag openen en wijzigen.
4. [Delegatietypen](#screen-delegation_types): de manieren waarop een casus of verslag kan worden overgedragen.
5. [Medewerkers](#screen-staff-members): de personen.
6. [Kwalificatiebeoordeling](#screen-staff-credentialing): beoordelingen van begeleide praktijkuitoefening voor nieuwe medewerkers.
7. [Sessiebeveiliging](#screen-session_security): afmelden bij inactiviteit, tweede factor en afmeldbeleid.
8. [Supporttoegang](#screen-support_access): of de support van ForMedrixAI bij uw gegevens mag.
9. [Apparatuur](#screen-equipment): het register van alle apparaten.
10. [Printerprofielen](#screen-printer_profiles): wat elke labelprinter kan en hoe een browser hem bereikt.
11. [Site-agents](#screen-site_agents): het programma dat op het netwerk van een locatie afdrukt en bestanden verplaatst.
12. [Scanstations](#screen-scan_stations): de werkplekken waarmee een terminal zich kan identificeren.
13. [Afdrukinstellingen](#screen-print_settings): labelformaten, barcoderegels en afdrukgedrag.
14. [Labelontwerper](#screen-label_designer): de opmaak van elk label.
15. [Werkstations](#screen-workstations): geregistreerde computers met een token.
16. [Werkstationgroepen](#screen-workstation_groups): werkplekken gegroepeerd naar discipline en gebied.
17. [Macroscopie-apparatuur](#screen-grossing_hardware): camera's en weegschalen op de macroscopiewerkplekken.
18. [Gegevensbewaring](#screen-retention): hoe lang gegevens worden bewaard.
19. [Zaakmaskerconfiguratie](#screen-case_mask_config): accessienummering.
20. [Verplichte velden](#screen-field_requirements): welke velden een pagina nodig heeft voordat zij kan worden opgeslagen.
21. [Externe bronnen](#screen-external_resources): verwijzingslinks.

Vijf schermen zijn naslag, geen inrichtingsstappen: het [tabblad Systeem](#screen-tab-system), het [tabblad Personeel](#screen-tab-staff), het [Bereikoverzicht](#screen-scope_reference), het [Overzicht per rechtsgebied](#screen-jurisdiction_overview) en het [Gesimuleerde afdruklogboek](#screen-simulated_print).

**Statuswoorden.** Elk scherm toont een van de vijf statuswoorden uit de schrijfstandaard: Gerealiseerd, Demonstratie, Gedeeltelijk, Gepland, Niet gerealiseerd. Op dit moment draaien de meeste gegevensdiensten op de demonstratiegegevens van de browser en wordt de productie-API dienst voor dienst aangesloten. Waar een scherm al een productiedienst en een contract in `docs/architecture` heeft, is het **Gerealiseerd**. Waar het scherm alleen in de browser werkt, of het effect nog nergens wordt toegepast, is het **Demonstratie**.

## Deel A: Beheer van onderneming en faciliteiten {#ch2-enterprise-facilities}
Breadcrumb: Start > Configuratie > Systeem

Dit deel bevat het tabblad Systeem, dat alle schermen uit de delen A, C en D bevat, en het ene scherm dat de structuur van uw organisatie vastlegt.

**Hoe de hiërarchie werkt.** Er is geen apart scherm "Onderneming" en geen type "ziekenhuis" of "kliniek". Alles is een faciliteit in het [Faciliteitenwoordenboek](#screen-facility-dictionary). Een faciliteit die als onderneming is gemarkeerd, is het hoogste niveau (uw organisatie). Andere faciliteiten verwijzen ernaar als hun bovenliggende onderneming en zijn de aangesloten faciliteiten. Wat een faciliteit doet, wordt bepaald door haar rollen (uitvoerend laboratorium, aanvragende faciliteit enzovoort), niet door een type. Locaties (afdeling, kamer, bed) hangen onder één faciliteit. Het [Bereikoverzicht](#screen-scope_reference) geeft aan welke instellingen eenmaal voor de onderneming worden vastgelegd en welke per faciliteit.

**Waar datum, tijd, tijdzone en taal worden ingesteld.** Er is geen enkel scherm voor "globale datum en tijd". Elk wordt op een andere plaats ingesteld:

| Wat | Waar het wordt ingesteld | Bereik |
|---|---|---|
| Tijdzone | Eén keuze **Tijdzone van de instelling** op het instellingenscherm van het [Bijdragedashboard](#screen-contribution_settings). Zij bepaalt in welke dag of maand een afgetekende casus wordt geteld en welk jaar de accessienummering gebruikt. | Hele organisatie. Standaard `America/Phoenix`. |
| Datum- en getalnotatie | Volgt de weergavetaal die in de bovenbalk is gekozen. Het tabblad Identificatieformaten van de faciliteitseditor toont de datumnotatie, tijdnotatie en landinstelling van de jurisdictie, alleen-lezen. | Browser van elke gebruiker. |
| Weergavetaal | De taalknop in de bovenbalk. Keuzes: Engels, Frans, Frans (België), Duits, Nederlands, Nederlands (België), Koreaans, Spaans. Bewaard in de browser als `pathscribe_language`. | Elke gebruiker, elke browser. |
| Verslagtaal | **Verslagtaal** op het tabblad Algemeen van de faciliteit. | Elk uitvoerend laboratorium. |
| Spellingtaal | **Spellingtaal** op het record van de medewerker. | Elke persoon. |
| Updatevenster van de site-agent | Tijden in de lokale tijd van de locatie op het scherm [Site-agents](#screen-site_agents). | Elke locatie. |

Opgeslagen tijden zijn altijd UTC. Niets in niveau 1 verandert dat.

### Tabblad Systeem {#screen-tab-system}
Breadcrumb: Start > Configuratie > Systeem

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem**. Een directe link zoals `/configuration?tab=system&section=print_settings` opent een sectie.
**2. Onderhoudsonderdeel:** Systeem (de container voor elke sectie van Systeem)

**3. Zakelijk doel en bereik.** Het tabblad Systeem bevat de referentiegegevens en bedrijfsinstellingen van het lab. Het heeft zes groepen, getoond als knoppen bovenaan: **Werkstation & hardware**, **Labmaterialen & workflows**, **Klinische lookups**, **Financiële en omzet-lookups**, **Beheer & compliance** en **Integraties**. Als u een groep kiest, staan in de zijbalk links alleen de schermen van die groep. Het tabblad Systeem is het standaardtabblad wanneer Configuratie opent.

**4. Voorwaarden en afhankelijkheden.** Voor het openen van Configuratie is de machtiging `screen:configuration:open` nodig. Elke sectie controleert daarna haar eigen machtiging. Als u die niet hebt, opent de sectie alleen-lezen met een opmerking en zijn de bedieningselementen uitgeschakeld.

Setup step: Reference, not part of setup
Requires: Geen, dit is een startpunt.
Unlocks: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Afdrukinstellingen](#screen-print_settings)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: tab-system - Tabblad Systeem met groepsknoppen en zijbalk]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Groepsknoppen | Zes knoppen | Niet van toepassing | Als u een groep selecteert, toont de zijbalk de secties van die groep en wordt de eerste sectie geopend. | Werkstation & hardware |
| Zijbalk | Lijst met secties | Niet van toepassing | Eén knop per sectie in de actieve groep, gesorteerd op naam. Een sectie die alleen een engineer van ForMedrixAI mag gebruiken, is verborgen tenzij u de bijbehorende platformmachtiging hebt. | Afdrukinstellingen geselecteerd |
| Faciliteit: (selectie) | Keuzelijst met actieve uitvoerende laboratoria, plus **Alle faciliteiten** | Optioneel | Alleen getoond in de groep Werkstation & hardware. Hij filtert Afdrukinstellingen, Printerprofielen, Scanstations, Site-agents, Apparatuur en Macroscopie-apparatuur op één locatie. Hij wordt alleen onthouden totdat u het tabblad Systeem verlaat en wordt niet opgeslagen. | Alle faciliteiten |
| Melding over niet-opgeslagen wijzigingen | Bevestiging | Niet van toepassing | Wie met niet-opgeslagen wijzigingen naar een andere sectie of groep gaat, wordt gevraagd door te gaan met bewerken of de wijzigingen te verwerpen. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. De eigen machtiging van elke sectie staat bij die sectie. Beheerder en Laboratoriumdirecteur hebben de machtiging voor het configuratiescherm standaard.
**Bekende beperkingen.** De faciliteitsselectie blijft niet behouden als u de pagina herlaadt. Werkstations en Werkstationgroepen gebruiken hem niet: Werkstations heeft een eigen faciliteitskolom en Werkstationgroepen een eigen filter Uitvoerend laboratorium.

### Faciliteitenwoordenboek {#screen-facility-dictionary}
Breadcrumb: Start > Configuratie > Systeem > Integraties > Faciliteitsconfiguratie

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Integraties** > **Faciliteitsconfiguratie**. De paginakop luidt "Instellingsconfiguratie". Het is hetzelfde scherm dat hoofdstuk 3 vermeldt als [Faciliteitsconfiguratie](#screen-clients).
**2. Onderhoudsonderdeel:** Faciliteitenwoordenboek

**3. Zakelijk doel en bereik.** Een faciliteit is elke locatie of organisatie die PathScribe kent: uw eigen laboratoria, de klinieken en ziekenhuizen die u monsters sturen en de referentielaboratoria waarnaar u werk doorstuurt. Elke faciliteit heeft haar rollen, contactgegevens, de codes waarmee inkomende aanvragen aan haar worden gekoppeld, haar doorlooptijddoelen, keuzes voor verslagbezorging en afdrukroutering. De organisatie op het hoogste niveau is een faciliteit waarbij **Onderneming** is aangevinkt. Bijna elk ander scherm vraagt om een faciliteit, dus dit is het eerste scherm dat u invult.

**4. Voorwaarden en afhankelijkheden.** Er gaat niets aan vooraf. De lijst Plaats-van-dienstcode op het tabblad Algemeen leest het codewoordenboek en de lijst Model op het tabblad AI & prestaties toont alleen modellen met een geslaagd validatieonderzoek. Beide zijn optioneel. Slaat u de faciliteit over, dan is de faciliteitskeuzelijst van elk ander scherm leeg.

Setup step: Tier 1, step 1
Requires: Geen, dit is een startpunt.
Unlocks: [Deelnametypen](#screen-participation_types), [Delegatietypen](#screen-delegation_types), [Medewerkers](#screen-staff-members), [Apparatuur](#screen-equipment), [Zaakmaskerconfiguratie](#screen-case_mask_config), [Afdelingen](#screen-departments)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: screen-facility-dictionary - Faciliteitenlijst met zoeken, status- en rolfilters en Faciliteit toevoegen]

**6. Veldreferentie.**

#### Lijstpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoeken | Tekst | Optioneel | Komt overeen met faciliteitsnaam, toewijzende instantie, naam en e-mailadres van de contactpersoon. | Leeg |
| Statusfilter | Tabbladen: Alle, Actief, Inactief, Ongeverifieerd | Optioneel | Ongeverifieerde faciliteiten zijn automatisch aangemaakt vanuit een inkomende aanvraag en wachten op controle door iemand. | Alle |
| Rolfilter | Tabbladen: Alle typen, Uitvoerend laboratorium, Aanvragende faciliteit | Optioneel | Beperkt op rol. | Alle typen |
| Aantal resultaten | Tekst (N van M) | Niet van toepassing | Toont hoeveel faciliteiten overeenkomen. | Niet van toepassing |
| Kolom Faciliteit | Tekst | Niet van toepassing | Naam, code van de toewijzende instantie, adres en een markering "aangesloten". | Niet van toepassing |
| Kolom Rollen | Badges | Niet van toepassing | De rollen van de faciliteit en haar jurisdictie. | Niet van toepassing |
| Kolom Contact | Tekst | Niet van toepassing | Naam en e-mailadres van de contactpersoon. | Niet van toepassing |
| Kolom TAT | Tekst | Niet van toepassing | Toont "Nu 1e aanraking", "Nu totaal" of Standaard. | Niet van toepassing |
| Kolom Status | Tekst | Niet van toepassing | Actief, Inactief of Ongeverifieerd. Een opmerking "Automatisch aangemaakt" verschijnt als de faciliteit uit een aanvraag komt. | Niet van toepassing |
| + Faciliteit toevoegen | Knop | Niet van toepassing | Opent de editor met een lege faciliteit. | Niet van toepassing |
| Verifiëren | Rijknop | Niet van toepassing | Alleen getoond bij ongeverifieerde faciliteiten. Markeert de faciliteit als gecontroleerd. | Niet van toepassing |
| Bewerken | Rijknop | Niet van toepassing | Opent de editor. | Niet van toepassing |
| Dupliceren | Rijknop | Niet van toepassing | Kopieert de inrichting op organisatieniveau naar een nieuwe faciliteit. Het wist de toewijzende instantie, het CLIA- of ISO-nummer, het adres en de contactgegevens, de directeur, de verouderde tenant-id's, de autorisaties voor pediatrie, het interface-eindpunt en de inloggegevens. De naam wordt "Kopie van" plus het origineel. | Niet van toepassing |
| Deactiveren / Activeren | Rijknop | Niet van toepassing | Niet getoond bij ongeverifieerde faciliteiten. Wie een faciliteit deactiveert die nog in gebruik is, opent **Instelling nog in gebruik** en wordt om bevestiging gevraagd. Verwijzingen worden niet verwijderd. | Niet van toepassing |

#### Editorvenster: tabblad Algemeen

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam faciliteit | Tekst | Verplicht | Hoe de faciliteit op aanvragen, verslagen en labels verschijnt. Fout: "Faciliteitsnaam is verplicht". | Leeg |
| Toewijzende instantie | Tekst, maximaal 10 tekens, afgedwongen hoofdletters | Verplicht | Inkomende HL7-aanvragen worden aan de faciliteit gekoppeld op deze code, dus zij moet uniek zijn (niet hoofdlettergevoelig). | Leeg |
| Status | Keuze: Actief, Inactief (Ongeverifieerd wordt alleen getoond als dat al is ingesteld) | Verplicht | Inactieve faciliteiten worden niet aangeboden bij nieuw werk. | Actief |
| Rollen | Selectievakjes: Uitvoerend laboratorium, Interne insturende locatie, Interne aanvragende faciliteit, Externe aanvragende faciliteit, Monsterafname, Referentielaboratorium | Verplicht | Minstens de rollen die beschrijven wat de locatie doet. Uitvoerend laboratorium ontgrendelt het tabblad AI & prestaties en de velden hieronder die alleen voor labs gelden. | Externe aanvragende faciliteit |
| Plaats-van-dienstcode | Keuzelijst uit de plaats-van-dienstcodes | Optioneel | Vereist de rol Monsterafname. | Geen |
| CLIA/ISO-accreditatienummer | Tekst | Optioneel | Vereist Uitvoerend laboratorium of Onderneming. Gebruikt in verslagkoppen. | Leeg |
| Naam laboratoriumdirecteur | Tekst | Optioneel | Vereist Uitvoerend laboratorium of Onderneming. Gebruikt in verslagkoppen. | Leeg |
| URL van koplogo | https-link | Optioneel | Vereist Uitvoerend laboratorium of Onderneming. Alleen het adres wordt opgeslagen, nooit de afbeelding. | Leeg |
| Kosten vereisen factureringsgoedkeuring | Keuze: Zoals de onderneming, Aan, Uit | Optioneel | Alleen Uitvoerend laboratorium of Onderneming. "Zoals de onderneming" wordt alleen aan labs buiten de onderneming aangeboden. | Zoals de onderneming |
| Beleid voor addendumpagina: addenda op een aparte pagina afdwingen | Ja/nee-schakelaar | Optioneel | Alleen Uitvoerend laboratorium. | Uit |
| Verslagtaal | Keuze uit de acht weergavetalen | Optioneel | Alleen Uitvoerend laboratorium. De standaard volgt de jurisdictie. | Per jurisdictie |
| Detectie van afwijkingen: ingeschakeld bij deze faciliteit | Ja/nee-schakelaar | Optioneel | Alleen Uitvoerend laboratorium. | Uit |
| Jurisdictie | Keuze uit 14: US, CA, GB_EW, GB_SCT, GB_NIR, IE, AU, NZ, KR, BE, NL, DE, FR, ES | Verplicht | Legt de landregels, datumnotatie, spellingcontrole en patiëntidentificatiestandaard van de faciliteit vast (getoond bij Identificatieformaten). | US |
| Nationale screeningsregister-ID | Tekst | Optioneel | De identificatie van de faciliteit bij een nationaal screeningsregister. | Leeg |
| Etikettering van monsters / blokken | Keuze: alfa (Monster A, B, C en Blok A1, A2, A3) of numeriek (Monster 1, 2, 3 en Blok 1A, 1B, 1C) | Verplicht | Hoe nieuwe monsters en blokken worden genummerd of van letters voorzien. | Alfa |
| Onderneming | Selectievakje: "Dit is een instelling op het hoogste niveau (onderneming)" | Optioneel | Markeert de faciliteit als het hoogste niveau. Ontgrendelt de velden die alleen voor ondernemingen gelden (Interface-engine-verbinding, Beveiligde berichten). | Uit |
| Bovenliggende onderneming | Keuzelijst met andere ondernemingsfaciliteiten | Optioneel | Maakt deze faciliteit een aangesloten faciliteit van die onderneming. | Geen |
| Aanhef contactpersoon | Keuze: Dhr., Mevr., Mevr. (Ms.), Mx., Dr. | Optioneel | Titel van de contactpersoon. | Leeg |
| Achtervoegsel contactpersoon | Keuze uit voorinstellingen, of Overig | Optioneel | Bijvoorbeeld Jr. of MD. | Leeg |
| Voornamen, Familienamen, Voorkeursnaam | Tekst | Optioneel | De contactpersoon. | Leeg |
| E-mail | Tekst, moet "@" bevatten | Optioneel | E-mailadres van de contactpersoon. | Leeg |
| Telefoon, Fax | Tekst | Optioneel | Contactnummers. | Leeg |
| Adres, Plaats, Provincie/regio, Postcode | Tekst | Optioneel | Postadres. | Leeg |

Welke contactvelden verplicht zijn, komt uit [Verplichte velden](#screen-field_requirements) pagina **Instellingseditor**: naam, toewijzende instantie, e-mailadres, telefoon, fax, adres, plaats, regio, postcode en contactpersoon. De voettekst toont wat nog verplicht is.

#### Editorvenster: tabblad LIS-integratie

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Interface-engine-verbinding: eindpunt | Tekst | Verplicht zodra ingericht | Alleen onderneming. Waar PathScribe berichten naartoe stuurt voor de interface-engine. | Leeg |
| HL7-versie | Keuze: 2.3, 2.4, 2.5, 2.5.1, 2.6 | Optioneel | Alleen onderneming. | 2.5.1 |
| Type authenticatie | Keuze: none, basic, oauth2, api_key | Optioneel | Alleen onderneming. | none |
| Inloggegevens ingesteld | Ja/nee | Optioneel | Alleen onderneming. Legt vast dat er een inlogreferentie is ingesteld. Het geheim zelf wordt hier niet ingevoerd. | Nee |
| Het gekoppelde LIS is eigenaar van de belangrijkste casusstatussen | Ja/nee-schakelaar | Optioneel | Alleen onderneming. | Uit |
| Patholoog kan een addendum of amendement rechtstreeks in PathScribe starten | Ja/nee-schakelaar | Optioneel | Alleen onderneming. | Uit |
| Routering van de onderneming overschrijven | Ja/nee-schakelaar | Optioneel | Alleen faciliteiten die geen onderneming zijn. Uit betekent dat de faciliteit de verbinding van haar bovenliggende onderneming overneemt. | Uit |
| ID verzendende faciliteit (MSH-4) | Tekst | Verplicht zodra ingericht | Identificeert de faciliteit in uitgaande HL7. | Leeg |
| ID ontvangende faciliteit (MSH-6) | Tekst | Optioneel | De code van het ontvangende systeem. | Leeg |
| Overschrijving uitgaand kanaal | Tekst | Optioneel | Een ander engine-kanaal voor deze faciliteit. | Leeg |
| Eén gecombineerde PDF per casus verzenden | Ja/nee-schakelaar | Optioneel | Alleen Uitvoerend laboratorium. | Uit |
| Verzending van de anatomische kaart: Anatomische kaart verzenden | Keuze: Uit, Alleen tekst, Tekst en afbeeldingsbestand | Optioneel | Alleen Uitvoerend laboratorium (batch 751). Bij een Assist-casus plaatst PathScribe de anatomische kaart nooit in het verslag. Deze instelling stuurt haar met de synoptische gegevens naar het laboratoriumsysteem: de bevindingen op de kaart als tekstregels en, met een bestand, de kaart die bij het afronden uit de definitieve antwoorden wordt getekend. Apart opgeslagen met `config:organ-map-delivery:manage` en vastgelegd. Een mislukte verzending houdt het afronden nooit tegen; ze verschijnt in de uitgaande wachtrij, met opnieuw proberen. | Uit |
| Verzending van de anatomische kaart: Bestandsindeling | Keuze: PNG-afbeelding, PDF-document | Optioneel | Getoond bij Tekst en afbeeldingsbestand. | PNG-afbeelding |
| Verzending van de anatomische kaart: Bestemming van de bestanden | Tekst | Verplicht bij Tekst en afbeeldingsbestand | Een map, een SFTP-adres of een kanaal van de interface-engine. Nooit een gebruikersnaam of wachtwoord. Bestandsnamen bevatten het accessienummer, het kaarttype en het tijdstip, nooit een patiëntnaam. | Leeg |

#### Editorvenster: tabblad Identificatieformaten

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Overschrijfschakelaar | Ja/nee-schakelaar | Optioneel | Alleen faciliteiten die geen onderneming zijn. Uit gebruikt de formaten van de bovenliggende onderneming. | Uit |
| Formaatrijen | Lijst gegroepeerd als Niveau 1 (zoeken: een preparaatbarcode opent de casus) en Niveau 2 (interne koppeling) | Niet van toepassing | Elke rij heeft een schakelaar voor ingeschakeld, een testvak en een knop om het patroon te tonen. Patronen worden door het systeem vastgelegd en kunnen niet worden bewerkt. | Per jurisdictie |
| LIS-voorinstellingsfilter | Keuze | Optioneel | Beperkt de rijen tot een voorinstelling. | Alle |
| Een scan simuleren | Tekst | Optioneel | Typ of scan een waarde om te zien welk formaat overeenkomt. | Leeg |
| Landinstellingen | Alleen-lezen tekst | Niet van toepassing | Toont de jurisdictie, datumnotatie, tijdnotatie, landinstelling, spellingcontrole en patiëntidentificatiestandaard. | Niet van toepassing |
| Wijzigingen opslaan | Knop | Niet van toepassing | Slaat de overschrijving op. | Niet van toepassing |

#### Editorvenster: tabblad Rapportage

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Rapportformaat | Keuze: PDF, HL7, Beide | Verplicht | Hoe verslagen naar deze faciliteit gaan. | PDF |
| Bezorgmethode | Keuze: E-mail, Fax, Portaal, HL7 | Verplicht | Hoe verslagen haar bereiken. | Portaal |
| Rapporten automatisch vrijgeven bij afronding | Ja/nee-schakelaar | Optioneel | | Uit |
| Rapport kopiëren naar verwijzende arts | Ja/nee-schakelaar | Optioneel | | Uit |

#### Editorvenster: tabblad Doorlooptijd & escalatie

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Doel eerste aanraking | Geheel aantal uren, 1 tot 168 | Optioneel | Leeg gebruikt de systeemstandaard. | Leeg (systeemstandaard 4 uur) |
| Doel totale doorlooptijd casus | Geheel aantal uren, 1 tot 720 | Optioneel | Leeg gebruikt de systeemstandaard. | Leeg (systeemstandaard 24 uur) |
| Escalatieprioriteit | Keuze: high, critical | Optioneel | Prioriteit van een melding over een overschreden termijn. | high |
| Escalatiedoelen | Selectievakjes: Pathologiegroep, Laboratoriumbeheerder, Verwijzend arts | Optioneel | Als er geen is aangevinkt, worden meldingen voor deze faciliteit onderdrukt. Beperkte casus (pediatrie) escaleren altijd op Critical. | Geen |

#### Editorvenster: tabblad AI & prestaties (alleen Uitvoerend laboratorium)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Automatisch conceptverslag | Keuze: inherit, on, off | Optioneel | | Overnemen |
| Overschrijving van time-out bij inactiviteit | Keuze: inherit, 5, 10, 15, 20, 30, 60 minuten | Optioneel | Overschrijft de standaard van de organisatie op [Sessiebeveiliging](#screen-session_security) voor casus bij dit lab. | Overnemen |
| Steekproeffrequentie voor codebeoordeling | Geheel getal, 0 tot 100 | Optioneel | Percentage casus dat voor codebeoordeling wordt getrokken. Leeg betekent geen. Een wijziging wordt in het auditlogboek vastgelegd als "Code review random sampling rate changed". | Leeg |
| Vrijgavebuffer | Keuze: inherit of override | Optioneel | Override toont Buffer ingeschakeld, duur (1 tot 30 minuten) en Omzeilen voor STAT. | Overnemen (standaard bij override 10 minuten) |
| Model | Keuzelijst: inherit, of modellen met een geslaagd validatieonderzoek | Optioneel | Alleen in bewerkmodus. | Overnemen |

#### Editorvenster: tabblad Locaties (alleen in bewerkmodus)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zorgpunt | Tekst | Verplicht | Wordt gekoppeld door afdrukrouteringsregels en werkstations. | Leeg |
| Kamer, Bed, Gebouw, Verdieping | Tekst | Optioneel | Onderdelen van de locatie. | Leeg |
| Locatiestatus | Keuze (HL7-tabel 0306) | Optioneel | | Leeg |
| Type persoonslocatie | Keuze (HL7-tabel 0305) | Optioneel | | Leeg |
| Verifiëren, Activeren, Deactiveren | Knoppen | Niet van toepassing | Locaties die automatisch uit een inkomend PV1-segment zijn aangemaakt, komen binnen als ongeverifieerd. | Niet van toepassing |

#### Editorvenster: tabblad Afdrukken (alleen in bewerkmodus; heeft een eigen Opslaan)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Vrijgegeven verslagen afdrukken | Ja/nee-schakelaar | Optioneel | Alleen Uitvoerend laboratorium. | Uit |
| Verzending | Keuze: Benoemde printer via QZ Tray, Netwerkprinter rechtstreeks, Interface-engine of printserver | Verplicht als afdrukken aan staat | Alleen Uitvoerend laboratorium. | Geen |
| Papierformaat | Keuze: Standaard (Letter), Letter, A4, Legal | Optioneel | Alleen Uitvoerend laboratorium. | Standaard |
| Printernaam | Tekst | Verplicht voor QZ Tray | | Leeg |
| Printersoort | Keuze: Printer van de site-agent, Printeradres | Verplicht voor rechtstreeks | | Geen |
| Protocol | Keuze: RAW 9100, LPR/LPD, IPP | Verplicht voor rechtstreeks | | RAW 9100 |
| Adres, Poort | Tekst, geheel getal 1 tot 65535 | Verplicht voor rechtstreeks | | Leeg, 9100 |
| Wachtrijnaam, IPP-pad, Weergavenaam | Tekst | Optioneel | Wachtrij voor LPR, pad voor IPP. | Leeg |
| Papierlade | Keuze: Standaard van het verslag, Lade 1 briefpapier, Lade 2 gewoon papier | Optioneel | Elke faciliteit. | Standaard van het verslag |
| Zijden | Keuze: Standaard van het verslag, Dubbelzijdig, Enkelzijdig | Optioneel | Elke faciliteit. | Standaard van het verslag |

#### Editorvenster: tabblad Beveiligde berichten (alleen in bewerkmodus, alleen Onderneming)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Gatewayrijen | NHSMAIL, EGRESS, ACCURX, PAUBOX, VIRTRU, ZIX, HEALTHLINK, MEDICAL_OBJECTS, REFERRALNET, KR_HIE | Optioneel | Eén rij per gateway. | Uit |
| Ingeschakeld | Ja/nee-schakelaar | Optioneel | | Uit |
| Standaard | Keuzerondje | Optioneel | De gateway die standaard wordt gebruikt. | Geen |
| Afzenderadres of -ID | Tekst | Optioneel | | Leeg |
| Overeenkomst aanwezig, referentie, ondertekend op, verloopt op | Ja/nee, tekst, datums | Optioneel | Patiëntgegevens gaan alleen uit zolang een overeenkomst van kracht is. | Nee |

#### Editorvenster: tabblad Spelling (alleen in bewerkmodus, alleen Uitvoerend laboratorium)

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Woordenlijst | Tekstlijst | Optioneel | Woorden die de spellingcontrole bij deze faciliteit accepteert. Wijzigingen worden geauditeerd. | Leeg |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, wijzigen, deactiveren, opnieuw activeren en verifiëren: `config:facilities:manage`. Tabblad Afdrukken: `config:print-settings:manage`. Tabblad Beveiligde berichten: `config:secure-messaging:manage`. Beheerder en Laboratoriumdirecteur hebben deze standaard. Wijzigingen op veldniveau die de pagina audit, staan hierboven.
**Bekende beperkingen.** Verzenden via beveiligde berichten is gesimuleerd: `messageService.sendSecureEmail` legt het bericht vast, maar er bestaat nog geen echt gatewaytransport (PS-332). De tekst van het tabblad AI & prestaties wijst voor de standaard van de vrijgavebuffer naar "Configuration > System > LIS Integration", maar die standaard staat op [Vrijgavebuffer na ondertekening](#screen-release_buffer).
### Bereikoverzicht {#screen-scope_reference}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Bereikoverzicht

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance** > **Bereikoverzicht**
**2. Onderhoudsonderdeel:** Bereikoverzicht (alleen-lezen)

**3. Zakelijk doel en bereik.** Een pagina die één vraag beantwoordt: wordt deze instelling eenmaal voor de organisatie vastgelegd, eenmaal per faciliteit, of op meerdere niveaus? Zij definieert ook de woorden onderneming, uitvoerende faciliteit en aanvragende faciliteit. Zij wijzigt niets.

**4. Voorwaarden en afhankelijkheden.** Geen. Zij leest een vaste lijst die in het product wordt bijgehouden. Er staan maar negen instellingen in en de pagina vermeldt dat gebieden die niet zijn opgenomen, niet zijn gecontroleerd.

Setup step: Reference, not part of setup
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-scope_reference - Tabel van het bereikoverzicht en definities]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Wat de woorden betekenen | Drie definities | Niet van toepassing | Onderneming (de hele organisatie), Uitvoerende faciliteit (één laboratoriumlocatie) en Aanvragende faciliteit of klant (wie de casus instuurt). | Niet van toepassing |
| Instellingsgebied | Tekst | Niet van toepassing | De instelling: Beleid voor aanmelden met tweede factor, Tijd tot afmelden bij inactiviteit, Printinstellingen, Afdrukrouteringsregels, Doorlooptijddoelen, Site-agents, Scanstations, Apparatuur, Werkstations. | Niet van toepassing |
| Waar het wordt vastgelegd | Tekst | Niet van toepassing | Een van: Onderneming, Standaard van de onderneming met overschrijving per faciliteit, Elke faciliteit, Meerdere niveaus (de meest specifieke wint). | Niet van toepassing |
| Hoe het werkt | Tekst | Niet van toepassing | Eén zin per instelling. Een link opent het scherm waar de instelling staat. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Er is niets te wijzigen en er is geen machtiging per sectie.
**Bekende beperkingen.** De lijst bevat negen instellingen. Lees een ontbrekende instelling niet als geldend voor de hele onderneming of per faciliteit.

### Overzicht per rechtsgebied {#screen-jurisdiction_overview}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Overzicht per rechtsgebied

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance** > **Overzicht per rechtsgebied**
**2. Onderhoudsonderdeel:** Overzicht per rechtsgebied (alleen-lezen)

**3. Zakelijk doel en bereik.** Eén kaart per land met wat daarvoor is ingericht, zodat u hiaten ziet zonder zeven schermen te openen. Zij toont de landen die landelijke ondertekeningsregels hebben, plus elk land dat een faciliteit of het lab gebruikt. Elke rij heeft een link **Wijzigen** naar het scherm waar die instelling wordt bewerkt. De pagina zegt: "Deze pagina toont alleen wat is ingericht."

**4. Voorwaarden en afhankelijkheden.** Zij leest de faciliteiten, dus voeg die eerst toe. Een lege landkaart betekent dat de faciliteitenlijst of de regels erachter leeg zijn.

Setup step: Reference, not part of setup
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-jurisdiction_overview - Landkaarten met een rij per instelling]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Faciliteiten | Tekstlijst | Niet van toepassing | De faciliteiten in dat land. Een inactieve faciliteit toont "(inactief)". Wijzigen opent [Faciliteitsconfiguratie](#screen-clients). | Niet van toepassing |
| Aangeboden rollen | Aantal | Niet van toepassing | Aangeboden deelnamerollen. Wijzigen opent [Deelnametypen](#screen-participation_types). | Niet van toepassing |
| Ondertekeningsregels | Tekst | Niet van toepassing | Rollen die mogen ondertekenen ("Can sign out") en rollen die medeondertekening nodig hebben ("Needs a countersign"). Wijzigen opent [Ondertekeningsregels per land](#screen-country_signing_rules). | Niet van toepassing |
| Codesystemen | Tekstlijst | Niet van toepassing | Elk systeem met verplicht of optioneel. Wijzigen opent [Codesystemen](#screen-code_systems). | Niet van toepassing |
| Kankerregisters | Tekstlijst | Niet van toepassing | Registers die voor het land zijn ingericht. Wijzigen opent [Kankerregistratierapportage](#screen-cancer_registry_settings). | Niet van toepassing |
| AI-beleid | Tekst | Niet van toepassing | Een van: Geen beperkingen, Alle AI-diensten toegestaan, Toegestaan (een lijst), Beperkt tot aanbieders in de gegevensregio, plus een aantal faciliteitsregels. Wijzigen opent het tabblad AI-gedrag. | Niet van toepassing |
| Bewaarregels van | Tekst | Niet van toepassing | "Opgeslagen voor dit land" of "Ingebouwde standaard". Wijzigen opent [Toezichthoudende organen](#screen-governing_bodies). | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Hier is niets te wijzigen. Elke link Wijzigen vereist de machtiging van het scherm dat zij opent.
**Bekende beperkingen.** Geen bekend.

## Deel B: Gebruikersbeheer, rollen en de machtigingenmatrix {#ch2-users-roles}
Breadcrumb: Start > Configuratie > Personeel

Dit deel gaat over wie zich kan aanmelden en wat elke persoon mag doen. Toegang in PathScribe is opgebouwd uit machtigingen. Een machtiging is één toestemming, geschreven als `domain:object:verb`, bijvoorbeeld `config:roles:manage`. Een rol is een benoemde bundel machtigingen. Een persoon krijgt machtigingen via zijn rollen, beperkt tot de faciliteiten op zijn record. Machtigingen die als hoog risico zijn gemarkeerd, worden bij gebruik in het auditlogboek vastgelegd.

**De machtigingenmatrix.** De matrix is de machtigingenlijst op het scherm Rollen: elke machtiging, gegroepeerd, met een vinkje voor elke rol. De catalogus en de beginindeling liggen vast in het product (`capabilityCatalog.ts` en `capabilitySeeds.ts`). Vier regels zijn van belang als u rollen plant:

- **Ingebouwde rollen.** Pathologist, Resident, Fellow, PA, Admin, Physician, OR Staff, Template Author, Template Approver, Lab Director, QA Reviewer, Superadmin, Accessioner, Histotechnologist, Cytotechnologist en Molecular Technologist worden kant-en-klaar geleverd. Een rol die u zelf toevoegt, begint zonder configuratiemachtigingen.
- **Admin en Lab Director.** Admin heeft elke configuratiemachtiging. Lab Director heeft dezelfde set, behalve twee groepen: de beheergroep (`config:roles:manage`, `config:staff:edit`, `config:staff-access:assign`, `config:staff-password:manage`, `config:field-requirements:manage`, `auth:mfa-enrolment:reset`, `config:demo-data:reset`) en het opstellen van protocollen. Alleen Admin en Superadmin beheren dus rollen, medewerkers en verplichte velden.
- **Superadmin.** Een rol van ForMedrixAI. Zij heeft elke machtiging behalve `config:ai-prompt:approve`, een ziekenhuis kan haar niet wijzigen en een ziekenhuis kan haar niet aan eigen medewerkers toewijzen.
- **Functiescheiding.** `config:clinical-mismatch-rules:manage` en `config:ai-prompt:approve` kunnen niet bij één rol of één persoon samen berusten. Het opslaan wordt geweigerd.

Een geweigerde configuratiewijziging toont de reden `CONFIG_NOT_PERMITTED`. Een sectie die u niet kunt wijzigen, opent alleen-lezen.

### Tabblad Personeel {#screen-tab-staff}
Breadcrumb: Start > Configuratie > Personeel

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Personeel**
**2. Onderhoudsonderdeel:** Personeel (de container voor Medewerkers, Rollen en Kwalificatiebeoordeling)

**3. Zakelijk doel en bereik.** Eén tabblad voor de personeelskant van de configuratie. Het heeft drie subtabbladen: **Medewerkers**, **Rollenwoordenboek** en **Kwalificatiebeoordeling**. Een link zoals `/configuration?tab=staff&section=roles` opent een subtabblad (`members`, `roles` of `credentialing`).

**4. Voorwaarden en afhankelijkheden.** Voor het openen van Configuratie is `screen:configuration:open` nodig. Elk subtabblad controleert zijn eigen machtiging.

Setup step: Reference, not part of setup
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Medewerkers](#screen-staff-members), [Rollen](#screen-staff-roles), [Kwalificatiebeoordeling](#screen-staff-credentialing)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: tab-staff - Tabblad Personeel met zijn drie subtabbladen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Medewerkers | Subtabblad | Niet van toepassing | De personen. Zie [Medewerkers](#screen-staff-members). | Geselecteerd |
| Rollenwoordenboek | Subtabblad | Niet van toepassing | De rollen. Zie [Rollen](#screen-staff-roles). | Niet van toepassing |
| Kwalificatiebeoordeling | Subtabblad | Niet van toepassing | Toewijzingen van begeleide praktijkuitoefening. Zie [Kwalificatiebeoordeling](#screen-staff-credentialing). | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. De machtiging van elk subtabblad staat op het eigen scherm.
**Bekende beperkingen.** Geen bekend.

### Deelnametypen {#screen-participation_types}
Breadcrumb: Start > Configuratie > Systeem > Klinische lookups > Deelnametypen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Klinische lookups** > **Deelnametypen**
**2. Onderhoudsonderdeel:** Deelnametypen

**3. Zakelijk doel en bereik.** Een deelnametype is de rol die een persoon in een casus vervult: primair patholoog, arts-assistent, consulent, macroscopie enzovoort. Hier wordt ook de ondertekeningsbevoegdheid vastgelegd: of die rol het definitieve verslag mag uitgeven, of het verslag medeondertekening nodig heeft, of de persoon de hele casus ziet en of meer dan één persoon die rol kan vervullen. Rollen krijgen daarna de typen waarin hun houders mogen optreden.

**4. Voorwaarden en afhankelijkheden.** Het onderdeel voor de ondertekeningsbevoegdheid per faciliteit vereist dat de faciliteiten bestaan. Het scherm Rollen leest deze lijst voor het tabblad Deelname aan casus, dus leg de typen vast vóór de rollen. Slaat u dit over, dan heeft een rol geen typen om aan te bieden.

Setup step: Tier 1, step 2
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Rollen](#screen-staff-roles), [Medewerkers](#screen-staff-members)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-participation_types - Lijst met deelnametypen met badges voor machtigingen]

**6. Veldreferentie.**

#### Lijstpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoeken | Tekst | Optioneel | Plaatsaanduiding "Deelnametypen zoeken". | Leeg |
| Filter | Tabbladen, beginnend met Alle | Optioneel | | Alle |
| Type, Beschrijving, Mogelijkheden, Status | Kolommen | Niet van toepassing | Mogelijkheden worden getoond als korte badges: Finaliseren, Medeondertekenen, Sjabloon, Volledige weergave, Multi. Een badge "ingebouwd" markeert systeemtypen. | Niet van toepassing |
| Aantal in de voettekst | Tekst | Niet van toepassing | "N actief, M totaal". | Niet van toepassing |
| + Type toevoegen | Knop | Niet van toepassing | Opent de editor. | Niet van toepassing |
| Bewerken, Dupliceren | Rijknoppen | Niet van toepassing | Dupliceren opent een kopie om te bewerken. | Niet van toepassing |

Het product levert deze systeemtypen: primary, resident, attending, grossing, cytotechnologist, consultant, frozen, second_opinion, provisional_hire, biomedical_scientist en bms_advanced_practitioner. Systeemtypen kunnen niet worden verwijderd. Bij een ingebouwd type kunt u het label, de beschrijving en de kleur bewerken. De vlag finalise van `primary` is vergrendeld.

#### Editorvenster

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Label | Tekst | Verplicht | Moet uniek zijn. Fouten: "Label is verplicht" en "Er bestaat al een deelnametype met de naam ...". | Leeg |
| Afkorting | Tekst, maximaal 12 tekens | Verplicht | Moet uniek zijn. Getoond in casuskoppen en lijsten. | Leeg |
| Beschrijving | Tekst | Optioneel | | Leeg |
| Kleur | Vooraf ingestelde kleurstalen of een eigen kleur | Optioneel | | `#8AB4F8` |
| Kan finaliseren / aftekenen | Ja/nee-schakelaar | Optioneel | Deze rol kan het definitieve ondertekende verslag uitgeven. | Uit |
| Medeondertekening vereist | Ja/nee-schakelaar | Optioneel | Verslagen van deze rol moeten door een supervisor (attending) worden medeondertekend. | Uit |
| Kan rapportsjabloon gebruiken | Ja/nee-schakelaar | Optioneel | Aan deze rol kan een verslagsjabloon voor gestructureerde rapportage worden toegewezen. | Uit |
| Kan volledige zaak bekijken | Ja/nee-schakelaar | Optioneel | Volledige toegang tot de casus, inclusief alle monsters en eerdere verslagen. | Uit |
| Staat meerdere per zaak toe | Ja/nee-schakelaar | Optioneel | Meer dan één persoon kan de rol tegelijk in één casus vervullen. | Aan |
| Status | Actief / Inactief | Optioneel | | Actief |
| Aftekenbevoegdheid op instellingsniveau | Eén blok per uitvoerend lab | Optioneel | Elk lab neemt de wettelijke standaard van zijn jurisdictie over, of de platformstandaard. Overschrijf alleen voor een lokale vrijstelling of een bevoegdheidsregeling. | Overgenomen |
| Medeondertekening vereist bij dit lab, Kan finaliseren / aftekenen bij dit lab, Kan volledige zaak bekijken bij dit lab | Ja/nee-overschrijvingen | Optioneel | Elk toont zijn bron: platformstandaard, standaard van de jurisdictie of "Op instellingsniveau overschreven door naam op datum". **Terugzetten naar overgenomen standaard** verwijdert de overschrijving bij het opslaan. | Overgenomen |
| Motivering | Tekst | Optioneel | Wordt met de overschrijving in het auditlogboek vastgelegd. | Leeg |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, bewerken, dupliceren, overschrijven: `config:participation-types:manage` (hoog risico, geauditeerd; overschrijvingen per faciliteit worden met de motivering in het auditlogboek vastgelegd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Geen bekend.

### Rollenwoordenboek {#screen-staff-roles}
Breadcrumb: Start > Configuratie > Personeel > Rollenwoordenboek

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Personeel** > subtabblad **Rollenwoordenboek**
**2. Onderhoudsonderdeel:** Rollen

**3. Zakelijk doel en bereik.** Een rol is een bundel machtigingen en een lijst van de deelnametypen waarin haar houders mogen optreden. Dit scherm is de machtigingenmatrix: u vinkt aan welke machtigingen elke rol heeft en u voegt eigen rollen toe. Het bevat ook de set spraak- en toetsenbordopdrachten voor de rol; die is een gemak en geen toegangsbeheer.

**4. Voorwaarden en afhankelijkheden.** Het tabblad Deelname aan casus toont de deelnametypen, dus leg die eerst vast. Slaat u dit over, dan biedt het tabblad geen typen aan. De rollen worden daarna voor personen gekozen op het scherm Medewerkers.

Setup step: Tier 1, step 3
Requires: [Deelnametypen](#screen-participation_types)
Unlocks: [Medewerkers](#screen-staff-members), [Supporttoegang](#screen-support_access)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: staff-roles - Lijst van het Rollenwoordenboek met casus- en configuratietoegang]

**6. Veldreferentie.**

#### Lijstpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoeken | Tekst | Optioneel | Plaatsaanduiding "Rollen zoeken". | Leeg |
| Rol | Badge en naam | Niet van toepassing | Markeert ingebouwde rollen en rollen die "beheerd worden door ForMedrixAI". | Niet van toepassing |
| Beschrijving | Tekst | Niet van toepassing | | Niet van toepassing |
| Casustoegang | Ja/nee | Niet van toepassing | Of de rol aan casus werkt. | Niet van toepassing |
| Configuratietoegang | Ja/nee | Niet van toepassing | Of de rol Configuratie opent. | Niet van toepassing |
| Machtigingen | Aantal (n van totaal) | Niet van toepassing | | Niet van toepassing |
| Opdrachten | Balk | Niet van toepassing | Ingeschakelde spraak- en toetsenbordopdrachten. | Niet van toepassing |
| Bewerken / Bekijken, Dupliceren | Rijknoppen | Niet van toepassing | Een rol die u niet kunt wijzigen, opent als Bekijken. Dupliceren dwingt af dat de kopie een eigen rol is (niet ingebouwd). | Niet van toepassing |

#### Rolvenster

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam | Tekst | Verplicht | | Leeg |
| Kleur | Kleurkiezer | Optioneel | | `#8AB4F8` |
| Beschrijving | Tekst | Optioneel | | Leeg |
| Casustoegang | Selectievakje | Optioneel | | Uit |
| Configuratietoegang | Selectievakje | Optioneel | | Uit |
| Tabblad Machtigingen | Selectievakjes, gegroepeerd | Optioneel | Eén vakje per machtiging. Machtigingen met hoog risico dragen een label **Geauditeerd**. Een vakje toont "Vereist" als het van een andere machtiging afhangt en "Vereist door" als andere ervan afhangen. | Geen aangevinkt |
| Tabblad Opdrachten | Selectievakjes | Optioneel | Spraak- en toetsenbordopdrachten voor de rol. Zij regelen geen toegang. | Standaard van de rol |
| Tabblad Deelname aan casus | Selectievakjes van actieve deelnametypen | Optioneel | De typen waarin de houders van deze rol mogen optreden. Een rol Cytotechnologist kan geen typen van patholoog hebben. | Geen |
| Tabblad Actiereferentie | Alleen-lezen lijst | Niet van toepassing | Een spiekbriefje van de acties. | Niet van toepassing |

Opslaan wordt, met een melding, in deze gevallen geweigerd: u hebt geen toestemming; een machtiging is niet geldig; de wijziging zou `config:clinical-mismatch-rules:manage` en `config:ai-prompt:approve` samen bij één rol of bij een rol van één persoon brengen (functiescheiding); de wijziging zou geen toewijsbare rol met `config:roles:manage` overlaten (minstens één moet haar behouden); de rol is Superadmin (alleen-lezen); of een rol Cytotechnologist krijgt een deelnametype van patholoog. Een wijziging in de machtigingen van een rol wordt in het auditlogboek vastgelegd als "Role capabilities changed".

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, bewerken, dupliceren: `config:roles:manage` (hoog risico, geauditeerd). Admin en Superadmin hebben deze standaard. Lab Director niet.
**Bekende beperkingen.** Superadmin kan niet door een ziekenhuis worden gewijzigd. Een eigen rol begint zonder configuratiemachtigingen, dus vink aan wat haar personen nodig hebben.

### Medewerkers {#screen-staff-members}
Breadcrumb: Start > Configuratie > Personeel > Medewerkers

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Personeel** > subtabblad **Medewerkers**
**2. Onderhoudsonderdeel:** Medewerkers

**3. Zakelijk doel en bereik.** Het record van elke persoon die in PathScribe werkt: naam, contactgegevens, rollen, de faciliteiten waar zij werken, beroepsidentificaties, handtekening, aanmeldwachtwoord en status. Rollen bepalen wat zij kunnen doen. Faciliteiten beperken waar die machtigingen gelden.

**4. Voorwaarden en afhankelijkheden.** De lijst Faciliteiten leest het Faciliteitenwoordenboek en de lijst Rol leest het scherm Rollen. Subspecialismen komen uit het subspecialismenwoordenboek in [Subspecialismen](#screen-subspecialties). Slaat u de rollen over, dan kan een persoon niet worden opgeslagen: minstens één rol is verplicht.

Setup step: Tier 1, step 5
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Rollen](#screen-staff-roles)
Unlocks: [Kwalificatiebeoordeling](#screen-staff-credentialing), [Sessiebeveiliging](#screen-session_security), [Supporttoegang](#screen-support_access)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: staff-members - Medewerkerslijst gegroepeerd naar primaire rol]

**6. Veldreferentie.**

#### Lijstpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoeken | Tekst | Optioneel | Komt overeen met naam, e-mailadres, kwalificaties, NPI, GMC-nummer, vergunning en telefoon. | Leeg |
| Rolfilter | Keuzelijst met rollen (Physician is uitgesloten) | Optioneel | Een groep "Geen overeenkomende rol" toont personen van wie de rol niet meer bestaat. | Alle |
| Medewerker | Naam, kwalificaties, badges | Niet van toepassing | Badges Ped. en Orch., en "+N" voor extra rollen. Gegroepeerd naar primaire rol, met een aantal. | Niet van toepassing |
| E-mail, Rol, Subspecialismen, Status | Kolommen | Niet van toepassing | | Niet van toepassing |
| Medewerker toevoegen | Knop | Niet van toepassing | Vereist `config:staff-access:assign`. | Niet van toepassing |

#### Editorvenster

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Voornaam, Tweede voornaam, Achternaam | Tekst | Verplicht volgens Verplichte velden | Zie de opmerking onder de tabel. | Leeg |
| E-mail | Tekst in de vorm naam@domein.tld | Verplicht volgens Verplichte velden | Gecontroleerd met het patroon `\S+@\S+\.\S+`. | Leeg |
| Rol(len) | Selectievakjes | Verplicht | Minstens één. Physician en rollen die niet kunnen worden toegewezen, worden niet aangeboden. Vergrendeld zonder `config:staff-access:assign`. | Geen |
| Telefoon | Tekst | Optioneel | | Leeg |
| Subspecialismen | Keuzelijst uit het subspecialismenwoordenboek | Optioneel | | Geen |
| Kwalificaties | Tekst | Optioneel | Bijvoorbeeld MD. | Leeg |
| NPI | Tekst | Optioneel | Nummer van een zorgverlener in de Verenigde Staten. | Leeg |
| GMC-nummer | Tekst | Optioneel | Registratienummer in het Verenigd Koninkrijk. | Leeg |
| Vergunningsnummer | Tekst | Optioneel | | Leeg |
| Spraakprofiel | Keuze uit de spraakprofielen | Optioneel | | Leeg |
| Spellingtaal | Keuze uit talen | Optioneel | De taal die voor de spellingcontrole van deze persoon wordt gebruikt. | Leeg |
| Reviewergroepen voor cytologie-kwaliteitscontrole | Tekst, door komma's gescheiden rolcodes, afgedwongen hoofdletters | Optioneel | | Leeg |
| Faciliteiten | Selectievakjes | Optioneel | Leeg betekent alle faciliteiten. Het beperkt waar de machtigingen van de persoon gelden. Het verandert niet welke casus zij kunnen openen. Sinds Batch 653 geldt de beperking ook voor acties op casusniveau, op basis van de aanvragende faciliteit van de casus; een casus zonder geregistreerde faciliteit wordt voor een tot een faciliteit beperkte persoon nog steeds geweigerd, dus corrigeer de faciliteit van de aanvraag. Een persoon zonder faciliteitsbeperking merkt geen verandering. | Leeg (alle) |
| Pediatrische toegang | Ja/nee-schakelaar | Optioneel | Vereist `config:staff-access:assign`. | Uit |
| Orchestration-toegang | Ja/nee-schakelaar | Optioneel | Vereist `config:staff-access:assign`. | Uit |
| Pincode voor snelle authenticatie | Vier cijfers | Optioneel | Alleen getoond als de persoon de rol OR Staff heeft. | Leeg |
| Kwalificaties per jurisdictie | Rijen | Optioneel | Elke rij: Type (IBMS_ASD, UK_HO_REGISTERED_FORENSIC_PATHOLOGIST, MEDICOLEGAL_APPOINTMENT, NL_KCA_ADVANCED, DE_ZYTO_ASSISTENT_ADV), Uitgevende instantie, Jurisdictie, Ingangsdatum (verplicht), Vervaldatum (optioneel, niet vóór de ingangsdatum). | Geen |
| Aanmeldwachtwoord | Tekst, 12 tot 128 tekens | Optioneel | Alleen bij bewerken. Geweigerd als het gelekt, gangbaar of patroonmatig is. Opties: "moet bij de volgende aanmelding worden gewijzigd" en verwijderen. Vereist `config:staff-password:manage`. | Geen |
| Gekoppelde aanmeldaccounts | Lijst | Niet van toepassing | Alleen bij bewerken. **Ontkoppelen** verwijdert een koppeling met een externe identiteit. | Geen |
| Status | Schakelaar Actief / Inactief | Optioneel | | Actief |
| Link naar handtekeningafbeelding | https-link | Optioneel | Een voorbeeld wordt getoond. PathScribe bewaart de link, niet de afbeelding. | Leeg |

Welke van voornaam, tweede voornaam, achternaam, rol, subspecialismen, faciliteiten, e-mailadres, telefoon, kwalificaties, NPI, GMC-nummer, vergunning en handtekening verplicht zijn, wordt vastgelegd op [Verplichte velden](#screen-field_requirements), pagina **Personeel**. Rol is altijd verplicht.

Bij het opslaan worden de bovenstaande machtigingen gecontroleerd en wordt een wijziging geweigerd die de functiescheiding doorbreekt. Het wijzigen van rollen, faciliteiten of de toegangsvlaggen schrijft "Staff access changed" naar het auditlogboek. Het wijzigen van kwalificaties schrijft "Staff credentials changed".

**7. Machtigingen.** Openen: `screen:configuration:open`. Het record bewerken: `config:staff:edit`. Rollen, faciliteiten, toegangsvlaggen en kwalificaties: `config:staff-access:assign` (vereist `config:staff:edit`). Wachtwoorden: `config:staff-password:manage`. Allemaal hoog risico. Admin en Superadmin hebben deze standaard.
**Bekende beperkingen.** De pincode voor snelle authenticatie is alleen voor de rol OR Staff.
### Delegatietypen {#screen-delegation_types}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Delegatietypen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance** > **Delegatietypen**
**2. Onderhoudsonderdeel:** Delegatietypen

**3. Zakelijk doel en bereik.** Een delegatietype is een benoemde manier om een casus of verslag aan iemand anders over te dragen: opnieuw toewijzen, naar een pool sturen, een tweede mening vragen, voor beoordeling in het onderwijs verzenden. Elk type geeft aan of het eigendom overgaat, of een notitie nodig is en of meerdere personen het kunnen ontvangen.

**4. Voorwaarden en afhankelijkheden.** De keuze Uitvoerend laboratorium leest het Faciliteitenwoordenboek. Slaat u dit over, dan wordt alleen **Alle laboratoria** aangeboden.

Setup step: Tier 1, step 4
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Verplichte velden](#screen-field_requirements)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-delegation_types - Lijst met delegatietypen met labfilter]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Labfilter | Keuzelijst: Alle, Globaal of een lab | Optioneel | Beperkt de lijst. | Alle |
| Label | Tekst | Verplicht | | Leeg |
| ID | Tekst, hoofdletters, maximaal 24 tekens | Verplicht | Tijdens het typen afgeleid van het label. Vergrendeld nadat het type is aangemaakt. | Afgeleid |
| Beschrijving | Tekst | Verplicht | | Leeg |
| CPT-hint | Tekst | Optioneel | | Leeg |
| Uitvoerend laboratorium | Keuzelijst | Optioneel | | Alle laboratoria |
| Accentkleur | Vooraf ingestelde kleurstalen | Optioneel | | Eerste voorinstelling |
| Actief | Ja/nee-schakelaar | Optioneel | | Aan |
| Draagt eigendom over | Ja/nee-schakelaar | Optioneel | | Uit |
| Vereist notitie | Ja/nee-schakelaar | Optioneel | De afzender moet een notitie schrijven. | Uit |
| Staat meerdere ontvangers toe | Ja/nee-schakelaar | Optioneel | | Uit |
| Verwijderen | Rijknop | Niet van toepassing | Alleen eigen typen. Vraagt Ja of Nee. | Niet van toepassing |

Het product levert zeven systeemtypen: REASSIGN, POOL, SECOND_OPINION, CASUAL_REVIEW (inactief), TUMOR_BOARD (inactief), TEACHING en CONSULT_EXT. Bij een systeemtype is alleen de schakelaar Actief toegestaan. Eigen typen kunnen worden bewerkt en verwijderd.

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, bewerken, verwijderen, schakelen: `config:delegation-types:manage` (hoog risico, geauditeerd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** De ondertitel van het scherm zegt dat een systeemtype kan worden "gedupliceerd naar een nieuw eigen type", maar er bestaat geen knop Dupliceren. Voeg een nieuw type toe om een variant te maken.

### Kwalificatiebeoordeling {#screen-staff-credentialing}
Breadcrumb: Start > Configuratie > Personeel > Kwalificatiebeoordeling

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Personeel** > subtabblad **Kwalificatiebeoordeling**
**2. Onderhoudsonderdeel:** Kwalificatiebeoordeling

**3. Zakelijk doel en bereik.** Twee soorten toewijzing van begeleide praktijkuitoefening. Een **Focused Professional Practice Evaluation (FPPE)** koppelt een nieuw aangestelde patholoog aan een begeleider totdat een vast aantal casus of dagen is beoordeeld. Een toewijzing voor de **competentie van de cytotechnoloog** koppelt een nieuwe cytotechnoloog aan een supervisor totdat een aantal beoordelingen is gedaan. Beide verschijnen als tabellen Actief en Voltooid met een faciliteitsfilter.

**4. Voorwaarden en afhankelijkheden.** De gekozen personen moeten al bestaan bij [Medewerkers](#screen-staff-members) en het lab in het [Faciliteitenwoordenboek](#screen-facility-dictionary). Slaat u deze over, dan zijn de keuzelijsten leeg.

Setup step: Tier 1, step 6
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Medewerkers](#screen-staff-members)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: staff-credentialing - Tabellen met FPPE-toewijzingen en toewijzingen voor de competentie van de cytotechnoloog]

**6. Veldreferentie.**

#### FPPE-toewijzing

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Voorlopige aanstelling | Keuzelijst met medewerkers | Verplicht | De persoon die wordt beoordeeld. | Geen |
| Begeleider | Keuzelijst met medewerkers | Verplicht | Moet een andere persoon zijn. | Geen |
| Uitvoerend laboratorium | Keuzelijst | Verplicht | | Geen |
| Bereik van het subspecialisme | Keuzelijst | Optioneel | Beperkt de beoordeling tot één subspecialisme. | Alle |
| Beoordeling eindigt op | Keuze: aantal casus, duur, een van beide | Verplicht | | Een van beide |
| Aantal casus | Geheel getal | Verplicht indien gebruikt | Moet groter zijn dan 0. | 20 |
| Duur | Geheel aantal dagen | Verplicht indien gebruikt | Moet groter zijn dan 0. | 90 |
| Nu voltooien | Rijknop | Niet van toepassing | Beëindigt de beoordeling eerder. | Niet van toepassing |
| Faciliteitsfilter | Keuzelijst | Optioneel | Filtert beide tabellen. | Alle |

#### Toewijzing voor de competentie van de cytotechnoloog

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Nieuwe cytotechnoloog | Keuzelijst met medewerkers | Verplicht | | Geen |
| Supervisor | Keuzelijst met medewerkers | Verplicht | | Geen |
| Uitvoerend laboratorium | Keuzelijst | Optioneel | | Geen |
| Bereik van het subspecialisme | Keuzelijst | Optioneel | | Alle |
| Vereiste beoordelingen | Geheel getal | Verplicht | | 2 |

**7. Machtigingen.** Openen: `screen:configuration:open`. FPPE: `config:fppe:manage`. Competentie van de cytotechnoloog: `config:cytotech-competency:manage`. Beide hoog risico, geauditeerd. Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** De tabel met de competentie van de cytotechnoloog toont datums in de eigen notatie van de browser, niet in de weergavetaal.

### Sessiebeveiliging {#screen-session_security}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Sessiebeveiliging

**Status:** Gedeeltelijk

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance** > **Sessiebeveiliging**
**2. Onderhoudsonderdeel:** Sessiebeveiliging

**3. Zakelijk doel en bereik.** Vier controles voor de hele organisatie over hoe mensen bewijzen wie zij zijn: de tijd tot afmelden bij inactiviteit, biometrische hercontroles, het beleid voor een tweede factor (MFA) en het beleid voor authenticatie bij het aftekenen van verslagen. Een uitvoerende faciliteit kan de inactiviteitstijd (op het tabblad AI & prestaties van de faciliteit) en het aftekenbeleid overschrijven.

**4. Voorwaarden en afhankelijkheden.** De overschrijvingen per faciliteit en de inschrijvingstabel lezen het Faciliteitenwoordenboek en de medewerkerslijst. Slaat u deze over, dan is de tabel met overschrijvingen leeg, maar de standaarden van de organisatie werken nog.

Setup step: Tier 1, step 7
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Medewerkers](#screen-staff-members)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-session_security - Kaarten voor time-out bij inactiviteit, biometrie, MFA en aftekenbeleid]

**6. Veldreferentie.**

#### Time-out bij inactiviteit

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Standaard van de organisatie | Keuze: 5, 10, 15, 20, 30, 60 minuten | Verplicht | Wordt opgeslagen zodra u het wijzigt. Een waarschuwing verschijnt 60 seconden vóór het afmelden. Een overschrijving per faciliteit vervangt hem voor dat lab. | 15 minuten |

#### Biometrisch beleid

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Ingeschakeld | Ja/nee-schakelaar | Optioneel | Een implementatie kan het uitgeschakeld afdwingen. | Uit |
| Frequentie | Keuze: per_sign_off, per_session, per_days, never | Optioneel | Hoe vaak opnieuw wordt gecontroleerd. | per_sign_off |
| Dagen | Geheel getal, 1 tot 365 | Verplicht voor per_days | | 30 |

#### MFA-beleid

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Modus | Keuze: off, signing_roles, all | Verplicht | Wie een tweede factor moet gebruiken. | off |
| Minuten voor step-up | Geheel getal, 1 tot 720 | Optioneel | Hoe lang een controle van de tweede factor geldig blijft. | 30 |
| Sessieduur in uren | Geheel getal, 1 tot 72 | Optioneel | | 12 |
| Inschrijvingstabel | Lijst met **Inschrijving resetten** | Niet van toepassing | Resetten vereist `auth:mfa-enrolment:reset`. | Niet van toepassing |

#### Aftekenbeleid

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Standaard van de onderneming | Keuze: strict, session | Verplicht | Hoe een verslag bij het aftekenen wordt geauthenticeerd. | strict |
| Time-out | Keuze: 15, 30, 60, 240 minuten | Optioneel | | 30 minuten |
| Tweede factor | Ja/nee-schakelaar | Optioneel | | Uit |
| Overschrijvingen per faciliteit vergrendelen | Ja/nee-schakelaar | Optioneel | Voorkomt dat een faciliteit het beleid wijzigt. | Uit |
| Overschrijvingen per faciliteit | Tabel, een rij per uitvoerende faciliteit | Optioneel | | Overnemen |
| Exporteren | CSV-knop | Niet van toepassing | | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Wijzigen: `config:session-security:manage` (hoog risico, geauditeerd). Een MFA-inschrijving resetten: `auth:mfa-enrolment:reset`. Admin en Lab Director hebben de eerste. Alleen Admin en Superadmin hebben de tweede.
**Bekende beperkingen.** De authenticator is in de demonstratie gesimuleerd. Bij single sign-on vraagt de identiteitsprovider om de tweede factor. Het scherm van het aftekenbeleid zegt dat het beperken van afmelden op afstand de API-server nodig heeft en is uitgesteld. Het scherm waarschuwt dat authenticatie bij het aftekenen verband houdt met 21 CFR Part 11 (11.200); de instelling bepaalt wat wordt gevraagd en maakt een lab niet op zichzelf compliant.

### Supporttoegang {#screen-support_access}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Supporttoegang

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance** > **Supporttoegang**
**2. Onderhoudsonderdeel:** Supporttoegang

**3. Zakelijk doel en bereik.** U beslist of de support van ForMedrixAI bij de gegevens van uw organisatie mag. Het scherm legt het beleid vast, toont aanvragen die op goedkeuring wachten en actieve toegang, en houdt een afzonderlijk register bij van alles wat de support deed. "Supporttoegang" betekent dat een Superadmin-sessie een organisatie bereikt waarvan die persoon geen medewerker is. Uw eigen gebruikers worden nooit geraakt.

**4. Voorwaarden en afhankelijkheden.** Iemand moet kunnen goedkeuren: een lid van uw organisatie met `config:support-access:approve`, die niet de aanvrager is. Richt eerst rollen en personen in. Als niemand kan goedkeuren en het beleid Goedkeuring vereist is, blijven aanvragen onbeantwoord.

Setup step: Tier 1, step 8
Requires: [Rollen](#screen-staff-roles), [Medewerkers](#screen-staff-members)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-support_access - Beleid, openstaande aanvragen, actieve toegang en supportactiviteit]

**6. Veldreferentie.**

#### Beleid

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Beleid voor supporttoegang | Keuze: Uitgeschakeld, Goedkeuring vereist, Altijd toegestaan | Verplicht | Uitgeschakeld: de support kan uw gegevens niet openen, tonen of doorzoeken. Goedkeuring vereist: de support vraagt per ticket toegang met een reden en een goedkeurder keurt goed. Altijd toegestaan: geen aanvraag nodig, alles wordt nog steeds vastgelegd. | Goedkeuring vereist |
| Toegangsvenster | Keuze: 30 minuten, 1, 2, 4, 8 uur | Verplicht | Hoe lang een goedkeuring duurt. De support of u kunt hem eerder beëindigen. | 2 uur |
| Beleid opslaan | Knop | Niet van toepassing | | Niet van toepassing |

#### Aanvragen en actieve toegang

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Wacht op goedkeuring | Tabel | Niet van toepassing | Kolommen: Supportmedewerker, Ticket, Reden, Aangevraagd. Knoppen **Goedkeuren** en **Afwijzen**. U kunt uw eigen aanvraag niet goedkeuren. | Niet van toepassing |
| Actieve supporttoegang | Tabel | Niet van toepassing | Kolommen: Supportmedewerker, Ticket, Goedgekeurd door, Resterende tijd. Knop **Intrekken**. | Niet van toepassing |

#### Supportactiviteit

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Audittabel | Tabel | Niet van toepassing | Kolommen: Tijdstempel, Naam supportmedewerker, Herkomst-IP, Herkomstland, Ticket-ID, Ondernomen actie, Casus-ID's, Detail. Elke vermelding is door een hash aan de vorige gekoppeld, zodat een gewijzigde of verwijderde vermelding verschijnt als "Record altered at entry N". | Niet van toepassing |
| CSV exporteren, JSON exporteren, PDF exporteren | Knoppen | Niet van toepassing | Vereist `config:support-audit:view`. | Niet van toepassing |

#### [FORMEDRIXAI INTERNAL ONLY] Paneel Supporttoegang aanvragen {#screen-support_access-request}

> 🔒 **Interne beperkte instelling van ForMedrixAI**
> **Bereik:** Alleen intern service- en implementatiepersoneel.
> **Toelichting:** Dit paneel verschijnt alleen bij een Superadmin-sessie, dat is een supportaanmelding van ForMedrixAI. Het opent een aan een ticket gebonden venster op de gegevens van een klantorganisatie. Een beheerder van de klant ziet het nooit, en een wijziging hier door een ander dan de support zou iemand toegang geven tot beschermde gezondheidsgegevens zonder goedkeuring van de klant.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Organisatie | Keuzelijst | Verplicht | De klant die wordt bereikt. | Geen |
| Supportticketnummer | Tekst | Verplicht | Bijvoorbeeld SUP-1234. | Leeg |
| Reden | Tekst, minstens 10 tekens | Verplicht | Wat moet worden bekeken en waarom. | Leeg |
| Toegang aanvragen, Toegang beëindigen | Knoppen | Niet van toepassing | | Niet van toepassing |
| Ticket gesloten (gesimuleerd) | Knop | Niet van toepassing | Simuleert dat het ticketsysteem het ticket sluit: beëindigt de toegang en legt dit vast. Er is geen ticketsysteem gekoppeld. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Beleid en venster instellen: `config:support-access:policy`. Goedkeuren, afwijzen, intrekken: `config:support-access:approve`. De audit bekijken en exporteren: `config:support-audit:view`. Allemaal hoog risico. Admin en Superadmin hebben deze standaard. De goedkeurder moet tot de organisatie behoren en kan niet de aanvrager zijn, ook al heeft een Superadmin elke machtiging.
**Bekende beperkingen.** De browserversie is compleet, maar de serverkant is niet gekoppeld: de beleidspoort, aan tickets gebonden sessies, de alleen-toevoegen audittabel, de melding aan goedkeurders en de PDF-export zijn gespecificeerd in `AUTHORIZATION_API.md` en nog niet gerealiseerd. De meldings-e-mail is gesimuleerd. Het herkomst-IP en -land in de audit kunnen alleen door de server naar waarheid worden vastgelegd, dus in de browserversie zijn zij niet echt.

## Deel C: Koppelingen voor werkstations, printers, labelgenerator en scanners {#ch2-hardware}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware

Dit deel gaat over de fysieke kant: het register van apparaten, de printers en het programma dat ze aanstuurt, de werkplekken die scannen en afdrukken, en de regels voor labels. De meeste van deze schermen staan in de groep **Werkstation & hardware**, die boven de zijbalk een gedeelde selectie **Faciliteit** toont. Kies daar eenmaal een locatie en Afdrukinstellingen, Printerprofielen, Scanstations, Site-agents, Apparatuur en Macroscopie-apparatuur tonen allemaal die locatie. Werkstationgroepen staat in de groep **Labmaterialen & workflows**.

**Voorgestelde volgorde.** Registreer eerst de apparaten (Apparatuur), geef daarna aan wat elke printer kan (Printerprofielen), installeer en configureer dan de site-agent, benoem daarna de werkplekken (Scanstations), stel dan de afdrukregels en de labelopmaak in, registreer vervolgens computers en groepeer de werkplekken.

**Wat een label nodig heeft.** Een afgedrukt label doorloopt vier onderdelen. Afdrukinstellingen kiest het labelformaat, het barcodetype en het printerprofiel. De Labelontwerper legt de velden op. Printerprofielen geeft aan hoe een browser de printer bereikt. Het tabblad Afdrukken van de faciliteitseditor en de site-agent geven aan waar verslagen en labels op het netwerk van de locatie naartoe gaan. Zonder API-server komt niets bij een echte printer: elke afdruk wordt vastgelegd in het [Logboek gesimuleerde afdrukken](#screen-simulated_print).

### Apparatuur {#screen-equipment}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware > Apparatuur

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Werkstation & hardware** > **Apparatuur**
**2. Onderhoudsonderdeel:** Apparatuur

**3. Zakelijk doel en bereik.** Eén register van elk apparaat in het lab: analysers, kleurautomaten, weefselprocessors, coupescanners, camera's, weegschalen, etikettenprinters, graveermachines en opslageenheden. Elk item hoort bij één uitvoerend lab en kan bij één scanstation staan. Andere schermen verwijzen naar het register: een printerprofiel koppelt aan een etikettenprinter, macroscopie-apparatuur koppelt aan een camera of weegschaal en een moleculaire batch richt zich op een actieve analyser. Een servicelogboek legt onderhoud, kalibratie en storingen vast.

**4. Voorwaarden en afhankelijkheden.** De lijst Uitvoerend laboratorium leest het Faciliteitenwoordenboek en de lijst Scanstation leest [Scanstations](#screen-scan_stations) voor dat lab. Slaat u de faciliteit over, dan kan het item niet worden opgeslagen. Het scanstation is optioneel en kan later worden ingesteld.

Setup step: Tier 1, step 9
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Printerprofielen](#screen-printer_profiles), [Macroscopie-apparatuur](#screen-grossing_hardware)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-equipment - Apparatuurregister met filters voor soort en status]

**6. Veldreferentie.**

#### Lijstpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoeken | Tekst | Optioneel | Naam, code, merk, model of serienummer. | Leeg |
| Soortfilter | Keuzelijst: Alle soorten, of één soort | Optioneel | | Alle soorten |
| Statusfilter | Tabbladen, beginnend met Alle | Optioneel | | Alle |
| Kolommen | Apparatuur, Code, Soort, Merk en model, Uitvoerend laboratorium, Scanstation, Service, Instellingen, Status, Acties | Niet van toepassing | Service toont Actueel, Binnenkort gepland, Achterstallig, Nog niet uitgevoerd, Niet gepland of Storing, met de volgende vervaldatum. Instellingen linkt naar het printerprofiel of het record van macroscopie-apparatuur dat het apparaat gebruikt. | Niet van toepassing |
| + Apparatuur toevoegen, Bewerken, Logboek, Deactiveren / Reactiveren | Knoppen | Niet van toepassing | Deactiveren, niet verwijderen, omdat batches en afgedrukte labels de code dragen. | Niet van toepassing |

#### Venster Toevoegen en bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Code | Tekst, letters, cijfers, "_" en "-" | Verplicht | Het ID dat andere records dragen, bijvoorbeeld PANTHER_02 op een moleculaire batch en de barcode van zijn deck. Moet uniek zijn. Kan na het aanmaken niet worden gewijzigd. | Leeg |
| Naam | Tekst | Verplicht | | Leeg |
| Soort | Keuze: Analyser, Kleurautomaat, Weefselprocessor, Processor voor vloeibare cytologie, Coupescanner, Camera, Weegschaal, Etikettenprinter, Graveermachine, Opslageenheid, Overig | Verplicht | Actieve analysers zijn wat moleculaire batches kunnen kiezen. | Analyser |
| Merk, Model | Tekst | Optioneel | | Leeg |
| Serienummer | Tekst | Optioneel | | Leeg |
| Uitvoerend laboratorium | Keuzelijst | Verplicht | Wijzigen wist het scanstation. | Geselecteerde locatie |
| Scanstation | Keuzelijst met stations in dat lab | Optioneel | Waar het staat. Bij een analyser controleert de verzending van de werklijst dat deze vanaf dit station wordt verstuurd. Een station in een ander lab wordt geweigerd. | Geen |
| Kalibratie elke (dagen) | Geheel getal, 1 tot 3650 | Optioneel | Leeg betekent geen schema. Vervaldatums tellen vanaf de laatste geslaagde vermelding in het servicelogboek. | Leeg |
| Onderhoud elke (dagen) | Geheel getal, 1 tot 3650 | Optioneel | Dezelfde regel. | Leeg |
| Laagste temperatuur (°C), Hoogste temperatuur (°C) | Getallen, laagste onder hoogste; beide mogen leeg zijn | Optioneel | Batch 730: het bereik voor een temperatuurcontrole in het apparatuurlogboek. Een meting erbuiten is afgekeurd; het bereik wordt bij elke registratie overgenomen. | Leeg |
| Neemt grootformaatcoupes | Selectievakje, alleen kleurautomaten en coupescanners | Optioneel | Batch 732: het apparaat neemt grootformaatcoupes (megablokken). Coupedistributie stuurt een grootformaatcoupe alleen naar een scanner waarbij dit is aangevinkt. | Niet aangevinkt |
| QC-aftekening | Keuzelijst, alleen kleurautomaten en preparaatscanners: Standaard van het lab, Automatisch accepteren, Aftekening door het instrument (interface-engine), Aftekening in PathScribe | Optioneel | Batch 763: hoe de uitvoer van dit instrument wordt afgetekend voordat de preparaten worden uitgegeven (kleurautomaat) of de beelden worden geopend (scanner). Zie [Kleur- en scan-QC](#screen-stain_qc). | Standaard van het lab |
| Status | Actief / Inactief | Optioneel | | Actief |
| Deckindeling | Rijen, alleen analysers | Optioneel | De posities op het deck van de analyser. Elke rij: Deck of bay, Positie-ID (letters, cijfers, "_", geen twee gelijke) en Neemt op (Extractieplaat, Reagenscartridge, Monsterbuizenrek; minstens één). Rekken laden biedt alleen posities aan die passen. Het positie-ID wordt op de barcode van de decklocatie afgedrukt. | Geen |

#### Venster Servicelogboek

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Geschiedenis | Tabel: Datum, Type, Resultaat, Door, Opmerkingen | Niet van toepassing | Vermeldingen kunnen niet worden gewijzigd of verwijderd. Corrigeer een fout met een nieuwe vermelding. Een opmerking "Open storing" blijft staan totdat een geslaagde reparatie of functiecontrole is vastgelegd. | Niet van toepassing |
| Type | Keuze: Onderhoud, Kalibratie, Functiecontrole, Reparatie, Storing | Verplicht | | Onderhoud |
| Uitgevoerd op | Datum | Verplicht | Mag niet in de toekomst liggen. | Vandaag |
| Uitgevoerd door | Tekst | Verplicht | Medewerker of servicetechnicus. | Uw naam |
| Resultaat | Keuze: Geslaagd, Afgekeurd, Niet van toepassing | Verplicht | | Geslaagd |
| Opmerkingen | Tekst | Verplicht bij een mislukking of storing | | Leeg |

#### Kleuringsrekken

Batch 737. Getoond onder het register wanneer het lab herbruikbare kleuringsrekken heeft (gegraveerde RACK-id's). Elke rij is een rek met het vakje **Neemt grootformaatglaasjes**, direct opgeslagen (vereist `config:equipment:manage`). Batchbeheer weigert een grootformaatglaasje (gesneden uit een megablok) dat gescand wordt op een kleuringsdrager die geen grootformaatglaasjes neemt; een wegwerpdrager neemt ze wanneer **Neemt grootformaatglaasjes (megablokken)** is aangevinkt in Nieuwe container. De demo heeft één zo'n rek, RACK-STAIN-LF-01.

Batch 761: een rek wordt run na run hergebruikt. Bij de microtoom start het scannen van een geregistreerd rek waarvan de laatste run gesloten is een nieuwe run, zonder formulier; Chargebeheer opent het als nieuwe run (Nieuwe container, vooraf ingevuld). Een rek waarvan de laatste run verzegeld of op de kleurautomaat gezet maar nooit gesloten is, wordt tegengehouden met een waarschuwing. Die run sluiten bij de microtoom is een afstemmingsoverride (`batch:reconciliation:override`), vastgelegd met de reden "Reusable rack scanned for a new run; the last run on it was never closed."

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, bewerken, deactiveren: `config:equipment:manage`. Een vermelding in het servicelogboek vastleggen: `equipment:maintenance:record`. Beide hoog risico. Admin en Lab Director hebben beide. De rollen Histotechnologist, Cytotechnologist en Molecular Technologist hebben ook de machtiging voor het logboek.
**Bekende beperkingen.** Vervaldatums van service worden berekend in de tijdzone van de faciliteit op de instellingen van het Bijdragedashboard.
### Kleur- en scan-QC {#screen-stain_qc}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware > Kleur- en scan-QC

**Status:** Gedeeltelijk

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Werkstation & hardware** > **Kleur- en scan-QC**
**2. Onderhoudsonderdeel:** Kleur- en scan-QC

**3. Zakelijk doel en bereik.** Batch 763, het QC-controlepunt na het kleuren en vóór de verdeling. Als een kleurrun klaar is, wachten de preparaten op QC: het rek kan niet worden uitgecheckt en de preparaten worden bij Preparaatverdeling niet uitgegeven tot de run is afgetekend. Een gescand beeld kan op dezelfde manier wachten voordat de Patholoog het kan openen. Elke kleurautomaat en scanner wordt op een van drie manieren afgetekend: **Automatisch accepteren** (direct vrijgegeven, gelogd als automatisch geaccepteerd), **Aftekening door het instrument (interface-engine)** (optie A: het eigen QC-resultaat van het instrument, verzonden via de interface-engine, geeft de run vrij of houdt hem vast; bij een scanner zijn eigen beeldcontrole) of **Aftekening in PathScribe** (optie B: een analist tekent af bij het QC-controlepunt van Preparaatverdeling). Dit scherm stelt de standaarden in; de eigen modus van een instrument wordt ingesteld bij [Apparatuur](#screen-equipment) (QC-aftekening) en gaat voor op de standaard.

**4. Voorwaarden en afhankelijkheden.** De lijst met instrumenten leest [Apparatuur](#screen-equipment): kleurautomaten en preparaatscanners. Aftekening door het instrument vraagt de interface van de kleurautomaat (zijn aftekenbericht via de interface-engine); zonder die interface tekent een supervisor in plaats daarvan af.

Setup step: Tier 1, step 22
Requires: [Apparatuur](#screen-equipment)
Unlocks: None.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-stain-qc - De QC-standaarden en de lijst met kleurautomaten en scanners met hun modus]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Kleurautomaten | Keuzelijst: Automatisch accepteren, Aftekening door het instrument (interface-engine), Aftekening in PathScribe | Verplicht | De standaard voor een kleurautomaat zonder eigen modus. | Aftekening in PathScribe |
| Preparaatscanners | Dezelfde keuzelijst | Verplicht | De standaard voor een scanner zonder eigen modus. Bij aftekening door het instrument wordt een beeld dat de eigen controle van de scanner doorstond vrijgegeven; elk ander beeld wordt vastgehouden. | Automatisch accepteren |
| QC-standaarden opslaan | Knop | Niet van toepassing | Gelogd als Stain QC Settings Saved. | Niet van toepassing |
| Kleurautomaten en scanners | Tabel: Instrument, Soort, QC-aftekening | Niet van toepassing | De modus van elk instrument, met "standaard" als het er zelf geen heeft. | Niet van toepassing |

Bij het controlepunt wordt een afgekeurd preparaat gemarkeerd met **Opnieuw kleuren** (status QC Failed) of **Opnieuw snijden** (Recut Requested) en een reden: Zwakke kleuring, Overkleuring, Ongelijkmatige kleuring, Controle afgekeurd, Luchtbel onder dekglas, Gevouwen weefsel, Anders. Een beeld wordt vrijgegeven of met een reden teruggestuurd om opnieuw te scannen: Onscherp, Weefsel gemist, Fout bij samenvoegen, Vuil op het preparaat, Anders. Het auditlogboek toont Stain QC Pending, Passed, Failed, Instrument Result Ignored; Image QC Pending, Passed, Failed.

**7. Machtigingen.** Openen: `screen:configuration:open`. Standaarden opslaan: `config:stain-qc:manage` (Beheerder, Laboratoriumdirecteur). Bij het controlepunt: `stain:qc:sign-off` en `scan:image-qc:sign-off` (de rollen die Preparaatverdeling openen, Laboratoriumdirecteur); `stain:qc:override` om een run af te tekenen die wacht op aftekening door zijn kleurautomaat (Laboratoriumdirecteur). Alle met hoog risico.
**Bekende beperkingen.** De afkeurredenen zijn een vaste lijst; QC-criteria per kleuring zijn niet gerealiseerd. De serverroutes en het aftekenkanaal van de interface-engine zijn gepland.

### Printerprofielen {#screen-printer_profiles}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware > Printerprofielen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Werkstation & hardware** > **Printerprofielen**
**2. Onderhoudsonderdeel:** Printerprofielen

**3. Zakelijk doel en bereik.** Een printerprofiel legt vast wat een etikettenprinter werkelijk kan (resolutie, ondersteuning van DataMatrix en GS1, modulegrootte) en hoe een browser hem bereikt (de brug). PathScribe gebruikt het om het juiste labelsjabloon te kiezen en om een opdracht die de printer niet aankan te weigeren voordat die wordt verzonden.

**4. Voorwaarden en afhankelijkheden.** De lijst Apparaat in register leest [Apparatuur](#screen-equipment) en biedt alleen etikettenprinters aan. De lijst Faciliteit leest het Faciliteitenwoordenboek. Slaat u Apparatuur over, dan wordt het profiel nog wel opgeslagen, maar niet aan een apparaat gekoppeld. Een apparaat dat geen etikettenprinter is, wordt geweigerd: "Het apparaat in het register moet een etikettenprinter zijn."

Setup step: Tier 1, step 10
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Apparatuur](#screen-equipment)
Unlocks: [Afdrukinstellingen](#screen-print_settings), [Scanstations](#screen-scan_stations), [Labelontwerper](#screen-label_designer)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-printer_profiles - Tabel met printerprofielen]

**6. Veldreferentie.**

#### Lijstpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Kolommen | Printer-ID, Model, Leverancier, Brug, Faciliteit, Apparaat in register, DPI, GS1 / DataMatrix, Status, Acties | Niet van toepassing | GS1 / DataMatrix toont Beide, Alleen DataMatrix, Alleen GS1 of een streepje. Een gedeelde printer toont "Globaal". | Niet van toepassing |
| + Printerprofiel toevoegen, Bewerken, Dupliceren, Verwijderen | Knoppen | Niet van toepassing | Verwijderen wist het profiel. | Niet van toepassing |

#### Venster Toevoegen en bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Printer-ID | Tekst | Verplicht | Bijvoorbeeld ZEBRA-192.168.12.85. | Leeg |
| Model | Tekst | Verplicht | Bijvoorbeeld ZT411. | Leeg |
| Leverancier | Keuze: Zebra (ZPL), Citizen, SATO, Leica CEREBRO, Sakura Tissue-Tek, Overig | Optioneel | | Zebra (ZPL) |
| ZPL-versie | Tekst | Optioneel | Bijvoorbeeld 7.0. | Leeg |
| Brugtype | Keuze: QZ Tray, Zebra Browser Print, BarTender Automation, Direct via Interface Engine, PathScribe Agent, OS-afdrukdialoogvenster | Verplicht | Hoe een browser de printer op deze locatie bereikt. | OS-afdrukdialoogvenster |
| Agentpoort | Geheel getal, 1024 tot 65535 | Optioneel | Getoond bij de brug PathScribe Agent. Laat leeg, tenzij IT de agent van zijn standaardpoorten (9100 tot 9102) heeft verplaatst. | Leeg |
| Faciliteit | Keuzelijst, of Globaal | Optioneel | Een gedeelde netwerkprinter die vanaf meerdere locaties wordt gebruikt, heeft geen enkele eigenaar: laat op Globaal staan. | Geselecteerde locatie, of Globaal |
| Apparaat in register | Keuzelijst uit Apparatuur | Optioneel | De fysieke printer. | Niet gekoppeld |
| DPI | Geheel getal | Verplicht | | 300 |
| Maximale afdrukdichtheid | Geheel getal | Verplicht | | 300 |
| DataMatrix-moduleformaat | Geheel getal, in dots | Verplicht | Beïnvloedt de scanbaarheid bij de resolutie van deze printer. | 4 |
| IP-adres | Tekst | Optioneel | Bijvoorbeeld 192.168.12.85. | Leeg |
| Poort | Geheel getal | Optioneel | | 9100 |
| Ondersteunt DataMatrix | Ja/nee-schakelaar | Optioneel | | Aan |
| Ondersteunt GS1 | Ja/nee-schakelaar | Optioneel | | Aan |
| Actief | Ja/nee-schakelaar | Optioneel | | Aan |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, bewerken, dupliceren, verwijderen: `config:printers:manage` (hoog risico, geauditeerd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Alleen een profiel met de brug QZ Tray verstuurt op dit moment daadwerkelijk labels. Elke andere brug valt terug op het afdrukdialoogvenster van de browser.

### Site-agents {#screen-site_agents}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware > Site-agents

**Status:** Gedeeltelijk

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Werkstation & hardware** > **Site-agents**. Kies eerst een locatie in de faciliteitsselectie.
**2. Onderhoudsonderdeel:** Site-agents

**3. Zakelijk doel en bereik.** Een site-agent is een PathScribe-programma dat op het netwerk van een locatie is geïnstalleerd. Het drukt verslagen en labels af op de printers van de locatie en schrijft en haalt bestanden op in de netwerkmappen van de locatie. Dit scherm schrijft agents in, stelt in welke printers en mappen een agent mag gebruiken, trekt een agent in en stelt het tijdvenster in waarin hij zichzelf mag bijwerken.

**4. Voorwaarden en afhankelijkheden.** Een agent hoort bij een uitvoerend lab, dus voeg eerst de faciliteit toe. Het scherm toont "Kies een locatie (een uitvoerend laboratorium)" totdat u er een kiest. De printer-ID's die hier worden ingesteld, zijn de bestemmings-ID's waarnaar Werkstations en het tabblad Afdrukken van de faciliteitseditor verwijzen.

Setup step: Tier 1, step 11
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Werkstations](#screen-workstations), [Scanstations](#screen-scan_stations)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-site_agents - Agents, agentprinters, bestandsmappen en updatevenster]

**6. Veldreferentie.**

#### Agents

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Nieuwe inschrijvingscode | Knop | Niet van toepassing | Maakt een eenmalige code die u bij het installeren van de agent invoert. Hij verloopt, wordt één keer getoond en kan worden gekopieerd. Vereist `config:site-agents:enroll`. | Niet van toepassing |
| Agenttabel | Machine, Status, Versie, Laatst gemeld, Certificaat verloopt, Printers, Acties | Niet van toepassing | Status is Online, Aandacht nodig, Offline of Ingetrokken. Printers toont "N van M bereikbaar". | Niet van toepassing |
| Intrekken | Rijknop | Niet van toepassing | Sluit de agent onmiddellijk af. | Niet van toepassing |
| Reden voor intrekking | Keuze: Mogelijk gecompromitteerd, Per vergissing ingeschreven, Naar een andere site verplaatst, Machine vervangen, Machine buiten gebruik, Andere | Verplicht | | Geen |
| Opmerking | Tekst, maximaal 500 tekens | Verplicht bij Andere | | Leeg |

#### Agentprinters

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Printer-ID | Tekst | Verplicht | Moet uniek zijn op de locatie. | printer-1, printer-2 enzovoort |
| Naam | Tekst | Optioneel | | Leeg |
| Soort | Keuze: Verslag, Etiket | Verplicht | Etikettenprinters gebruiken alleen Raw 9100. | Verslag |
| Protocol | Keuze: Raw 9100, LPR, IPP, IPPS (bevestigt afdrukken) | Verplicht | IPPS heeft de voorkeur: de printer bevestigt elk verslag. Raw 9100 en LPR kunnen alleen bevestigen dat het is verzonden. | IPPS |
| Adres | IP-adres of hostnaam | Verplicht | IPv6 wordt nog niet ondersteund. | Leeg |
| Poort | Geheel getal, 1 tot 65535 | Verplicht | | Per protocol: 9100, 515, 631 |
| LPR-wachtrij | Tekst | Optioneel | Getoond bij LPR. | Leeg |
| IPP-pad | Tekst | Optioneel | Getoond bij IPP en IPPS. | Leeg |
| Printer toevoegen, Verwijderen | Knoppen | Niet van toepassing | Toevoegen vereist `config:site-agent-config:manage`. | Niet van toepassing |

#### Bestandsmappen

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Richting | Schrijven of Ophalen | Verplicht | Ingesteld door **Schrijfmap toevoegen** of **Ophaalmap toevoegen**. | Per knop |
| Map-ID | Tekst | Verplicht | Moet uniek zijn op de locatie. | share-1, share-2 |
| Pad van de map | Tekst zoals \\server\share\folder | Verplicht | | Leeg |
| Bestandspatroon | Bestandsnaampatroon zoals *.hl7 | Verplicht bij ophalen | Alleen een naam, geen mappen. PDF's en afbeeldingen worden niet opgehaald: zij blijven links. | Leeg |
| Ongewijzigd sinds (s) | Geheel aantal seconden | Verplicht bij ophalen | Minstens 5 seconden. | 30 |
| Grootste bestand (MB) | Geheel getal, 1 tot 500 | Verplicht bij ophalen | | 50 |
| Na overdracht | Keuze: Verplaatsen naar "processed", Verwijderen | Verplicht bij ophalen | Het verwijderen van klinische bestanden wordt afgeraden. | Verplaatsen naar processed |
| Overdragen aan | Keuze: PathScribe-import (Aanvragen of Resultaten), Kanaal van de interface-engine | Verplicht bij ophalen | | Kanaal van de interface-engine |
| Engine-kanaal | Tekst, met suggesties | Verplicht bij een kanaal | | Leeg |
| Geweigerde bestanden naar | Mapnaam met letters, cijfers, spaties, - of _ (maximaal 64 tekens) | Verplicht bij ophalen | | rejected |
| Naam van de referentie | Tekst | Optioneel | De naam van de vermelding die het wachtwoord van de map bevat. Wachtwoorden worden nooit in PathScribe ingevoerd. | Leeg |

#### Agentupdates

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Updatevenster van, tot | Tijd zoals 02:00, in de lokale tijd van de locatie | Optioneel | Geef beide tijden of geen van beide. Zij mogen niet gelijk zijn. Het venster mag over middernacht lopen. Zonder venster werkt de agent bij wanneer de server dat zegt. | Geen venster |
| Printers en mappen opslaan, Verwerpen | Knoppen | Niet van toepassing | De agent neemt een opgeslagen wijziging direct over. Een opmerking "Niet-opgeslagen wijzigingen" blijft staan totdat u opslaat. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Agents inschrijven en intrekken: `config:site-agents:enroll`. Printers, mappen, updatevenster: `config:site-agent-config:manage`. Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** In de demonstratie kan geen enkele agent zich inschrijven, dus de agentlijst is leeg. U kunt wel een code maken en printers en mappen instellen. Productie gebruikt het servercontract in `SITE_AGENT_API.md`. De agent weigert elke printer buiten de subnetten en poorten die uw IT op zijn machine heeft toegestaan.

### Scanstations {#screen-scan_stations}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware > Scanstations

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Werkstation & hardware** > **Scanstations**
**2. Onderhoudsonderdeel:** Scanstations

**3. Zakelijk doel en bereik.** De fysieke werkplekken waarmee een terminal zich kan identificeren, bij het aanmelden en in de bovenbalk, en waarnaar een afgedrukt stationslabel halverwege de workflow overschakelt. Er zijn aanvankelijk acht stations ingericht. Naam, barcode en workflowfase kunt u zelf instellen. Apparatuur kan bij een station staan en Werkstationgroepen groeperen stations.

**4. Voorwaarden en afhankelijkheden.** De lijst Faciliteit leest het Faciliteitenwoordenboek (alleen uitvoerende laboratoria). Een station dat afdrukken ondersteunt, heeft een cassette- en objectglasprinterprofiel uit [Printerprofielen](#screen-printer_profiles) nodig. Slaat u dit over, dan wordt het opslaan geweigerd: "Vereist als Ondersteunt afdrukken aan staat."

Setup step: Tier 1, step 12
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Printerprofielen](#screen-printer_profiles)
Unlocks: [Afdrukinstellingen](#screen-print_settings), [Werkstationgroepen](#screen-workstation_groups), [Macroscopie-apparatuur](#screen-grossing_hardware)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-scan_stations - Lijst met scanstations met Label afdrukken en Alle actieve stationslabels afdrukken]

**6. Veldreferentie.**

#### Lijstpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoeken | Tekst | Optioneel | Naam of barcode. | Leeg |
| Statusfilter | Keuze: Alle, Actief, Inactief | Optioneel | | Alle |
| Kolommen | Station, Barcode, Faciliteit, Workflowfase, Status, Acties | Niet van toepassing | | Niet van toepassing |
| Label afdrukken, Alle actieve stationslabels afdrukken | Knoppen | Niet van toepassing | Drukken het barcodelabel van het station af. | Niet van toepassing |
| + Scanstation toevoegen, Bewerken, Deactiveren / Reactiveren | Knoppen | Niet van toepassing | Deactiveren, niet verwijderen. | Niet van toepassing |

#### Venster Toevoegen en bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Stationsnaam | Tekst | Verplicht | Bijvoorbeeld Macroscopiestation 4. | Leeg |
| Barcode | Tekst | Verplicht | Op het label van het station afgedrukt als `STATION:` plus de code. Bijvoorbeeld GROSSING-04. | Leeg |
| Faciliteit | Keuzelijst met uitvoerende laboratoria | Verplicht | Het lab waar de werkplek staat, niet een verwijzende faciliteit. | Geselecteerde locatie |
| Workflowfase | Keuze: Registratie, Macroscopie, Weefselverwerking, Inbedding, Microtomie / Snijden, Kleuring, Archivering van coupes, Overig | Verplicht | | Registratie |
| Printer-IP | Tekst | Optioneel | De etikettenprinter in het netwerk op deze werkplek. Los van het printerprofiel. | Leeg |
| Ondersteunt graveren | Ja/nee-schakelaar | Optioneel | Graveerapparatuur zoals Leica CEREBRO. Het verzenden naar de graveermachine is een plaatsvervanger totdat de leveranciersintegratie is gebouwd. | Uit |
| Ondersteunt afdrukken | Ja/nee-schakelaar | Optioneel | Drukt hier cassette- en objectglaslabels met GS1 DataMatrix af. | Uit |
| Cassette-/objectglasprinterprofiel | Keuzelijst met printerprofielen | Verplicht als Ondersteunt afdrukken aan staat | | Geen |
| Status | Actief / Inactief | Optioneel | | Actief |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, bewerken, deactiveren: `config:scan-stations:manage` (hoog risico, geauditeerd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Het verzenden naar een graveermachine is een plaatsvervanger.

### Afdrukinstellingen {#screen-print_settings}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware > Afdrukinstellingen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Werkstation & hardware** > **Afdrukinstellingen** (de sectie waarmee het tabblad Systeem opent)
**2. Onderhoudsonderdeel:** Afdrukinstellingen

**3. Zakelijk doel en bereik.** Het standaard afdrukgedrag van labels voor het lab: elk cassettelabel afdrukken zodra het wordt geregistreerd, of in een batch; de labelformaten; het barcodetype en de voorvoegsels; naar welk printerprofiel elke soort label gaat; en de fysieke opmaak van cassette- en objectglaslabels. Zonder gekozen faciliteit bewerkt u de systeemstandaard. Als u een faciliteit kiest, ziet u haar instellingen: totdat u een overschrijving maakt, neemt zij de systeemstandaard over en is zij alleen-lezen. **+ Faciliteitoverride maken** kopieert de standaard zodat de faciliteit kan afwijken en **Terugzetten naar systeemstandaard** verwijdert de overschrijving. Een faciliteit bewaart alleen de velden waarop zij wil afwijken.

**4. Voorwaarden en afhankelijkheden.** De drie keuzelijsten voor printerprofielen lezen [Printerprofielen](#screen-printer_profiles). Slaat u deze over, dan biedt elke keuzelijst alleen "Afdrukdialoogvenster van de browser gebruiken". De faciliteitsselectie leest het Faciliteitenwoordenboek.

Setup step: Tier 1, step 13
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Printerprofielen](#screen-printer_profiles), [Scanstations](#screen-scan_stations)
Unlocks: [Labelontwerper](#screen-label_designer)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-print_settings - Kaarten van Afdrukinstellingen met de banner voor de faciliteitsoverschrijving]

**6. Veldreferentie.** Elk bedieningselement slaat op zodra u het wijzigt. Een opmerking "Opslaan" verschijnt tijdens het opslaan.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Afdrukgedrag bij uitsnijden | Keuze: Op aanvraag (per blok/container), Batch (per zaak/order) | Verplicht | Op aanvraag drukt elk cassettelabel af zodra het tijdens de macroscopie wordt geregistreerd. Batch stelt het afdrukken uit tot één actie per casus. | Op aanvraag |
| Afdrukgedrag bij de microtoom | Keuze: Op aanvraag, Blok, Batch | Optioneel | Batch 758. Hoe de microtoom objectglaasetiketten afdrukt, los van het uitsnijden. Op aanvraag: één etiket tegelijk, elk op zijn objectglaasje gescand voordat het volgende wordt afgedrukt. Blok: bij het scannen van een blok worden alle etiketten afgedrukt en in willekeurige volgorde teruggescand. Batch: de analist vinkt de objectglaasjes aan en drukt ze samen af. In elke modus wordt doorgaan naar het volgende blok tegengehouden zolang etiketten van dit blok niet gescand zijn, tot elk gescand, opnieuw gesneden of ongeldig gemaakt is, of de analist doorgaat (vastgelegd). Zolang hier niets is gekozen, volgt de microtoom de instelling van het uitsnijden. | Zoals uitsnijden |
| Op-aanvraag-waarborgen afdwingen | Ja/nee-schakelaar | Optioneel | Als dit aan staat, ligt de standaard voor het hele lab vast en kunnen medewerkers die registreren een casus niet op Batch zetten. | Uit |
| Scanverificatie vereisen | Ja/nee-schakelaar | Optioneel | Vereist dat de barcode van de nieuwe cassette of container wordt gescand voordat naar het volgende blok wordt gegaan. | Uit |
| Om een reden vragen wanneer een verslag opnieuw wordt afgedrukt | Ja/nee-schakelaar | Optioneel | Een herafdruk van een afgedrukt verslag vereist een reden, die samen met de afdruk in het auditlogboek wordt bewaard. | Uit |
| Containerlabelgrootte | Keuze uit voorinstellingen voor labelformaat (formaten voor aanvraagformulieren op volledige pagina worden niet aangeboden) | Verplicht | Standaardmonster (CLSI AUTO12, 2,0 bij 1,0 in), Secundaire cassette-/objectglasoverlay (1,0 bij 0,25 in), Middelgrote container (3,0 bij 2,0 in), Grote chirurgische container (4,0 bij 2,0 in), Aanvraagsticker (4,0 bij 2,0 in), Aanvraag- / transportzak (4,0 bij 6,0 in). | Standaardmonster |
| Aanvraaglabelgrootte | Keuze uit alle voorinstellingen, inclusief Aanvraagformulier op volledige pagina US Letter en A4 | Verplicht | Het stickervel voor aanvragen. | Aanvraag- / transportzak (4,0 bij 6,0 in) |
| Containerlabel-printerprofiel | Keuzelijst met profielen, of Afdrukdialoogvenster van de browser gebruiken | Optioneel | Met een QZ Tray-profiel gaan containerlabels rechtstreeks naar die thermische printer. | Afdrukdialoogvenster van de browser gebruiken |
| Moleculair label-printerprofiel | Hetzelfde | Optioneel | Voor labels van moleculaire platen, rekken, monsters en decklocaties. | Afdrukdialoogvenster van de browser gebruiken |
| Aanvraaglabel-printerprofiel | Hetzelfde | Optioneel | Voor het stickervel voor aanvragen. | Afdrukdialoogvenster van de browser gebruiken |
| Containerbarcodesymbologie | Keuze: Code 128 (1D), QR-code (2D), DataMatrix (2D) | Verplicht | Toegepast op de labels met de hoofdbatchbarcode van Batchbeheer. | Code 128 |
| Voorvoegsel voor wegwerplabels | Tekst, maximaal 12 tekens, hoofdletters | Verplicht | Afgedrukt als voorvoegsel-TYPE-JJJJMMDD-XXXX. | CONT |
| Voorvoegsel voor herbruikbare rekken | Tekst, maximaal 12 tekens, hoofdletters | Verplicht | Afgedrukt als voorvoegsel-TYPE-NN. | RACK |
| GS1-GTIN (cassette-/objectglaasjeslabels) | Tekst, maximaal 14 tekens | Verplicht voor het afdrukken van GS1 DataMatrix | De waarde AI(01) op elk GS1 DataMatrix-label van cassettes en objectglaasjes. Vereist een GS1-bedrijfsvoorvoegsel dat is geregistreerd voor ForMedrixAI LLC (GS1 US of de regionale lidorganisatie). Standaard leeg: elke echte GS1-afdruk wordt met een fout geweigerd totdat u er een invoert. | Leeg |
| Cassette-etiketlay-out: voorinstelling | Keuze: cassette van 45 graden (ongeveer 28,2 bij 8,0 mm), cassette van 35 graden (ongeveer 28,5 bij 7,0 mm) | Optioneel | Vult de vier vakken hieronder. | 45 graden |
| Vlakbreedte (mm) | Getal, minstens 1 | Verplicht | Fysieke breedte van het cassettevlak. | 28,2 |
| Vlakhoogte (mm) | Getal, minstens 1 | Verplicht | | 8,0 |
| Barcode-modulegrootte (mm) | Getal, minstens 0,05 | Verplicht | | 0,25 |
| Tekstregelhoogte (mm) | Getal, minstens 0,5 | Verplicht | | 1,4 |
| Passcontrole van de cassette-indeling | Waarschuwing of bericht "er is ruimte", en een live voorbeeld op 10 keer schaal | Niet van toepassing | Waarschuwt wanneer de barcode of tekst niet op het ingestelde vlak past. | Niet van toepassing |
| Een echte testafdruk verzenden | Keuzelijst met printerprofielen, Test-GTIN, **Testafdruk verzenden** | Optioneel | Drukt voorbeeldgegevens af via een echt profiel. Houd het resultaat tegen een echte cassette voordat u het gebruikt. | Geen |
| Opmaak van objectglaslabels: Breedte van het vlak, Hoogte van het vlak, Modulegrootte barcode, Teksthoogte (mm) | Getallen (minima 1, 1, 0,05, 0,5) | Verplicht | Deze bepalen de dotgroottes en de tekstpositie in het objectglaslabel dat wordt afgedrukt. Heeft een eigen voorbeeld, passcontrole en testafdruk. | 20,0, 8,0, 0,2, 1,2 |
| Containertypecodes | Eén tekstvak (maximaal 8 tekens, hoofdletters) per type: Kleuringsrek, Weefselprocessormand, Archiefbak, Ontkalkingsvat, Ad-hocbatch | Verplicht | De korte code in elke hoofdbatchbarcode. | STAIN, PROC, TRAY, DECAL, ADHOC |

**7. Machtigingen.** Openen: `screen:configuration:open`. Wijzigen: `config:print-settings:manage` (hoog risico, geauditeerd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Alleen een QZ Tray-profiel verzendt rechtstreeks. Elke andere brug valt terug op het afdrukdialoogvenster van de browser. Een faciliteit zonder overschrijving kan niet worden bewerkt. Controleer de afmetingen van de cassette aan de hand van de echte cassette, want een verkeerd formaat drukt voorbij de rand af.
### Labelontwerper {#screen-label_designer}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware > Labelontwerper

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Werkstation & hardware** > **Labelontwerper**
**2. Onderhoudsonderdeel:** Labelontwerper

**3. Zakelijk doel en bereik.** Een sleep-en-neerzet-editor voor de opmaak van elk label: u plaatst velden op een label van vast formaat, stelt hun exacte positie en grootte in en bepaalt wanneer elk veld verschijnt. Opmaken worden per labeltype bewaard, als standaard van de onderneming en, bij sommige typen, als overschrijving per faciliteit. Een opmaak kan als printercode worden geëxporteerd om op een printer of in een viewer te testen vóór gebruik.

**4. Voorwaarden en afhankelijkheden.** De keuze voor een overschrijving per faciliteit leest het Faciliteitenwoordenboek. Afdrukinstellingen kiest welke printer het label ontvangt, dus richt dat eerst in. Slaat u de faciliteiten over, dan wordt alleen de Bedrijfsstandaard aangeboden.

Setup step: Tier 1, step 14
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Afdrukinstellingen](#screen-print_settings)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-label_designer - Labelcanvas, beschikbare velden en inspecteur]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Labeltype | Keuze: Aanvraag, Monster (container), Blok (cassette), Preparaat, Decanteercontainer, Moleculair monster, Moleculaire plaat, Moleculair rek, Moleculaire decklocatie | Verplicht | Elk type heeft een vast labelformaat: 101,6 bij 152,4 mm, 50,8 bij 25,4, 25,4 bij 12,7, 25,4 bij 9,5, 50,8 bij 25,4, 25,4 bij 12,7, 50,8 bij 19,05, 38,1 bij 12,7, 38,1 bij 12,7 (in die volgorde). Het formaat is niet te bewerken. | Aanvraag |
| Bereik | Keuze: Bedrijfsstandaard, of een faciliteit "(override)" | Verplicht | Alleen Aanvraag, Monster en Decanteren staan een overschrijving per faciliteit toe. Blok, Preparaat en de vier moleculaire typen tonen **Bedrijfsstandaard — Vergrendeld** en kunnen alleen bij de standaard van de onderneming worden bewerkt. | Bedrijfsstandaard |
| Beschikbare velden | Lijst | Niet van toepassing | Velden voor dit labeltype die nog niet op het canvas staan. Sleep er een naar het canvas. "Alle velden geplaatst" verschijnt als er geen meer over zijn. | Niet van toepassing |
| Canvas | Sleep-en-neerzetgebied | Niet van toepassing | Live voorbeeld met voorbeeldgegevens, op ware grootte van het label. Sleep een veld om het te verplaatsen, of sleep een greep om de grootte te wijzigen (hulptekst "Sleep om het formaat te wijzigen"). Grepen verschijnen alleen op het geselecteerde veld. Een barcodeveld tekent een echte voorbeeldbarcode; als de barcode niet getekend kan worden, toont het veld in plaats daarvan "barcode-weergave mislukt". | Niet van toepassing |
| Inspector | Paneel | Niet van toepassing | De instellingen van het geselecteerde veld. Als er niets is geselecteerd, staat er "Selecteer een geplaatst veld om het te bewerken." | Niet van toepassing |
| X (mm), Y (mm) | Getal | Verplicht | Positie van het geselecteerde veld. Een veld blijft binnen het label. | Waar neergezet |
| Breedte (mm), Hoogte (mm) | Getal | Verplicht | Grootte van het geselecteerde veld. | Standaard van het veld |
| Lettergrootte (mm) | Getal | Verplicht voor tekstvelden | | Standaard van het veld |
| Dit veld tonen | Keuze: Altijd, Voorwaarde | Verplicht | Voorwaarde toont een tweede keuze: een ander veld, dan "wanneer dat veld een waarde heeft", "wanneer dat veld leeg is" of "wanneer dat veld gelijk is aan" met een **Te vergelijken waarde**. | Altijd |
| Voorbeeld met dat veld leeg | Selectievakje | Optioneel | Toont het label zoals het wordt afgedrukt wanneer het geteste veld leeg is. | Uit |
| Veld verwijderen | Knop | Niet van toepassing | Haalt het geselecteerde veld van het canvas. | Niet van toepassing |
| Passend maken | Knop | Niet van toepassing | Verschijnt wanneer een veld voorbij de rand gaat. Opslaan wordt geweigerd totdat dit is verholpen: "Niet opgeslagen: een veld steekt buiten de rand van het etiket." | Niet van toepassing |
| Indeling opslaan | Knop | Niet van toepassing | Slaat op voor het gekozen type en bereik. Meldingen: "Bedrijfsstandaard opgeslagen." of "Vestigingsoverride opgeslagen."; als het opslaan mislukt om een reden die het scherm niet kan noemen, "Onbekende fout bij het opslaan van deze indeling." | Niet van toepassing |
| Terugzetten naar standaard | Knop | Niet van toepassing | Verwijdert de opgeslagen opmaak voor dat type en bereik en maakt het canvas leeg. De melding luidt "Indeling teruggezet naar standaard." | Niet van toepassing |
| Versiegeschiedenis | Knop en lijst | Niet van toepassing | Elke keer opslaan is een versie, getoond als "Versie N, opgeslagen wanneer door wie". **Deze versie herstellen** slaat haar op als de nieuwste versie. De lijst heeft de kop "Opgeslagen versies van deze indeling". Een indeling die nog nooit is opgeslagen, toont "Deze indeling is nog niet opgeslagen." | Niet van toepassing |
| ZPL exporteren, Exporteer EPL, Exporteer DPL | Knoppen | Niet van toepassing | Toont printercode die uit de opmaak is vertaald. Test haar in de viewer die het scherm noemt (labelary.com) op 203 dpi, of op uw eigen printer. Barcodeopdrachten verschillen enigszins tussen printermodellen. Het resultaat verschijnt in een vak met de kop "Geëxporteerde ZPL" (bij EPL en DPL staat in een opmerking dat het een beginpunt is). Selecteer de tekst om te kopiëren. ZPL is de taal die PathScribe verzendt (via QZ Tray). **EPL en DPL zijn alleen exporttekst**: PathScribe stuurt ze nooit naar een printer, dus u kopieert of bewaart de tekst en verzendt die zelf. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Wijzigen, terugzetten, herstellen: `config:label-layouts:manage` (hoog risico, geauditeerd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Export is een beginpunt om te testen, geen garantie dat elk printermodel hem identiek afdrukt. Het vak heeft de kop "Geëxporteerde ZPL", ook nadat u Exporteer EPL of Exporteer DPL hebt gekozen; lees de opmerking boven de tekst om te zien welke taal het bevat. De afmetingen van cassettes en objectglaasjes voor de afdruk zelf komen ook uit [Afdrukinstellingen](#screen-print_settings).

### Werkstations {#screen-workstations}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware > Werkstations

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Werkstation & hardware** > **Werkstations**
**2. Onderhoudsonderdeel:** Werkstations

**3. Zakelijk doel en bereik.** Een register van elke computer die afdrukt of een PathScribe-agent draait. Elke computer krijgt een langlopend token en is gebonden aan de faciliteit, ruimte en rol waarin hij werkt, zodat afdrukroutering hem kan aanspreken. Een computer kan ook als "Deze computer" worden gemarkeerd, zodat de browser weet welk werkstation hij is.

**4. Voorwaarden en afhankelijkheden.** De lijst Faciliteit leest het Faciliteitenwoordenboek. De gebonden printers zijn de bestemmings-ID's uit de printerlijst van de site-agent, dus richt eerst [Site-agents](#screen-site_agents) in. Slaat u dit over, dan kunt u elk ID typen, maar het komt bij het afdrukken met niets overeen.

Setup step: Tier 1, step 15
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Site-agents](#screen-site_agents)
Unlocks: [Routeringsregels voor afdrukbestemmingen](#screen-print_routing_rules)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-workstations - Werkstationlijst met tokenstatus en Werkstation registreren]

**6. Veldreferentie.**

#### Lijstpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Kolommen | Werkstation, Faciliteit, Ruimte, Rol, Printers, Token, Laatst gezien, Status, Acties | Niet van toepassing | Status is Actief, Verloopt binnenkort (binnen 30 dagen), Token verlopen of Ingetrokken. Token toont de laatste tekens en de vervaldatum. Een ingetrokken rij toont wie hem heeft ingetrokken en waarom. | Niet van toepassing |
| Werkstation registreren | Knop | Niet van toepassing | Opent het formulier. | Niet van toepassing |
| Bewerken | Rijknop | Niet van toepassing | | Niet van toepassing |
| Nieuw token | Rijknop | Niet van toepassing | Geeft een nieuw token uit. Het vorige token blijft 24 uur werken zodat de agent kan worden bijgewerkt. | Niet van toepassing |
| Intrekken | Rijknop | Niet van toepassing | Kies een reden (Mogelijk gecompromitteerd, Per vergissing ingeschreven, Naar een andere site verplaatst, Machine vervangen, Machine buiten gebruik, Andere). Bij Andere is een opmerking verplicht. Het token werkt onmiddellijk niet meer. | Niet van toepassing |
| Deze computer gebruiken / Deze computer niet meer gebruiken | Rijknop | Niet van toepassing | Bindt deze browser aan het werkstation. | Niet van toepassing |
| Een token testen | Tekst en knop **Controleren** | Optioneel | Toont hoe de server een geplakt token zou beantwoorden: Geaccepteerd, of Geweigerd als verlopen, ingetrokken, onbekend of onjuist opgebouwd. | Leeg |

#### Registratie- en bewerkformulier

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam | Tekst, maximaal 60 tekens | Verplicht | Moet uniek zijn onder de actieve werkstations van de faciliteit. | Leeg |
| Faciliteit | Keuzelijst | Verplicht | | Geen |
| Ruimte | Tekst, maximaal 60 tekens | Optioneel | Bijvoorbeeld Macroscopieruimte 2. | Leeg |
| Zorgpunt | Tekst, maximaal 60 tekens | Optioneel | Afdrukrouteringsregels voor een locatie komen hiermee overeen. | Leeg |
| Discipline | Keuze: Histologie, Cytologie, Moleculair, Autopsie | Optioneel | | Niet ingesteld |
| Functioneel gebied | Keuzelijst voor die discipline | Optioneel | Moet bij de discipline horen. | Niet ingesteld |
| Verslagprinter, Etiketprinter | Tekst met suggesties | Optioneel | Een bestemmings-ID uit de printerlijst van de site-agent. | Niet ingesteld |
| Registreren en token tonen, Opslaan | Knoppen | Niet van toepassing | Het nieuwe token wordt één keer getoond: kopieer het naar de agent van het werkstation. PathScribe bewaart alleen een vingerafdruk en kan het niet opnieuw tonen. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Registreren, bewerken: `config:workstations:manage`. Nieuw token, intrekken, een token testen: `config:workstation-tokens:manage`. Allemaal hoog risico. Registreren, wijzigen, vernieuwen en intrekken, en geweigerde aanmeldingen van agents, worden in het auditlogboek vastgelegd. Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Een token blijft 365 dagen geldig tenzij het wordt vervangen. In de demonstratie worden tokens in de browser gecontroleerd; in productie controleert de API-server ze. Een aanmelding van een agent in de demonstratie is gelabeld als Gesimuleerd.

### Werkstationgroepen {#screen-workstation_groups}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Werkstationgroepen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Labmaterialen & workflows** > **Werkstationgroepen**
**2. Onderhoudsonderdeel:** Werkstationgroepen

**3. Zakelijk doel en bereik.** Een werkstationgroep bundelt scanstations naar discipline en functioneel gebied, begrenst ze tot een uitvoerend lab en bepaalt wat wordt geladen wanneer een analist er een selecteert: de kwaliteitscontrolemodus, een standaard actiegroep, een standaardactie en een optionele eigen pagina.

**4. Voorwaarden en afhankelijkheden.** De lijst Uitvoerend laboratorium leest het Faciliteitenwoordenboek. De lijst Standaard actiegroep leest [Actiegroepen](#screen-action_groups) en de lijst Standaardactie leest het actieregister; beide zijn optioneel en bieden zonder hen "Geen" aan. Voor het groeperen van stations moeten [Scanstations](#screen-scan_stations) bestaan. Autopsie heeft nog geen functionele gebieden, dus een groep Autopsie kan niet worden opgeslagen (zie PS-261).

Setup step: Tier 1, step 16
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Scanstations](#screen-scan_stations)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-workstation_groups - Lijst met werkstationgroepen met zoeken]

**6. Veldreferentie.**

#### Lijstpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Zoeken | Tekst | Optioneel | Naam of functioneel gebied. | Leeg |
| Kolommen | Naam, Discipline / Gebied, Uitvoerend lab, QC-modus, Status, Acties | Niet van toepassing | | Niet van toepassing |
| Werkstationgroep toevoegen, Bewerken, Deactiveren / Reactiveren | Knoppen | Niet van toepassing | | Niet van toepassing |

#### Venster Toevoegen en bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Naam | Tekst | Verplicht | Bijvoorbeeld Groep macroscopiewerkplekken. | Leeg |
| Discipline | Keuze: HISTOLOGY, CYTOLOGY, MOLECULAR, AUTOPSY | Verplicht | Bepaalt welke functionele gebieden worden aangeboden. | HISTOLOGY |
| Functioneel gebied | Keuzelijst voor de discipline | Verplicht | | Geen |
| Uitvoerend laboratorium | Keuzelijst | Verplicht | | Geen |
| QC-handhavingsmodus | Keuze: Automatisch oplossen, Afgedwongen, Hybride | Optioneel | | Niet ingesteld |
| Standaard actiegroep | Keuzelijst | Optioneel | | Geen |
| Standaardactie (wordt geactiveerd bij volgende scan) | Keuzelijst | Optioneel | | Geen |
| Toegewezen paginaroute | Tekst zoals /microtomy-workstation | Optioneel | Laat leeg totdat er een echte pagina voor de werkplek bestaat. | Leeg |
| Actief | Ja/nee-schakelaar | Optioneel | | Aan |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, bewerken, deactiveren: `config:workstation-groups:manage` (hoog risico, geauditeerd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Autopsie heeft geen functionele gebieden en kan dus nog niet worden gebruikt.

### Macroscopie-apparatuur {#screen-grossing_hardware}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware > Macroscopie-apparatuur

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Werkstation & hardware** > **Macroscopie-apparatuur**
**2. Onderhoudsonderdeel:** Macroscopie-apparatuur

**3. Zakelijk doel en bereik.** Camera's en weegschalen op de macroscopiewerkplekken, en hoe PathScribe elk daarvan bereikt. Het fysieke apparaat wordt gekozen uit het apparatuurregister.

**4. Voorwaarden en afhankelijkheden.** De lijst Apparaat in register leest [Apparatuur](#screen-equipment) en de lijst Scanstation leest [Scanstations](#screen-scan_stations). Slaat u Apparatuur over, dan is het apparaat niet gekoppeld. Een apparaat van de verkeerde soort wordt geweigerd.

Setup step: Tier 1, step 17
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary), [Apparatuur](#screen-equipment), [Scanstations](#screen-scan_stations)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-grossing_hardware - Lijst met macroscopie-apparatuur]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Kolommen | Naam, Soort, Verbinding, Apparaat in register, Scanstation, Status, Acties | Niet van toepassing | Melding bij een lege lijst: "Geen macroscopie-apparatuur voor deze faciliteit." | Niet van toepassing |
| + Macroscopie-apparatuur toevoegen, Bewerken, Deactiveren / Reactiveren | Knoppen | Niet van toepassing | | Niet van toepassing |
| Soort | Keuze: Camera, Weegschaal | Verplicht | | Camera |
| Naam | Tekst | Verplicht | Bijvoorbeeld Macrocamera macroscopiestation 3. | Leeg |
| Verbinding | Keuze: Browser (geen installatie), PathScribe Agent, Handmatige invoer | Verplicht | Camera: Browser of Agent. Weegschaal: Agent of Handmatige invoer. Andere combinaties worden geweigerd. Browser bereikt een standaard USB-camera rechtstreeks. Handmatige invoer betekent dat het gewicht in het macroscopiesjabloon wordt getypt. | Browser (geen installatie) |
| Adres van de PathScribe Agent | https-link zoals https://127.0.0.1:9100 | Verplicht bij Agent | Moet met https:// beginnen. | Leeg |
| Apparaat in register | Keuzelijst uit Apparatuur van dezelfde soort | Optioneel | | Niet gekoppeld |
| Scanstation | Keuzelijst, of Elk station | Optioneel | | Elk station |
| Status | Actief / Inactief | Optioneel | | Actief |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, bewerken, deactiveren: `config:grossing-hardware:manage` (hoog risico, geauditeerd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Geen bekend.

### Logboek gesimuleerde afdrukken {#screen-simulated_print}
Breadcrumb: Start > Configuratie > Systeem > Werkstation & hardware > Gesimuleerde afdruk

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Werkstation & hardware** > **Gesimuleerde afdruk**
**2. Onderhoudsonderdeel:** Logboek gesimuleerde afdrukken (alleen-lezen, met een wisknop)

**3. Zakelijk doel en bereik.** Zonder API-server worden labels en verslagen niet naar een echte printer verzonden. Elke afdruk wordt hier vastgelegd als Gesimuleerd, zodat u kunt zien wat er zou zijn afgedrukt, waar en hoeveel. Niets wat hier staat, heeft een printer bereikt. Met een schakelaar laat u gesimuleerde afdrukken mislukken, om het faalpad te testen.

**4. Voorwaarden en afhankelijkheden.** Geen. Het toont wat de afdrukschermen opleveren, dus druk eerst iets af.

Setup step: Reference, not part of setup
Requires: [Printerprofielen](#screen-printer_profiles)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-simulated_print - Tabel van het logboek gesimuleerde afdrukken]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Gesimuleerde afdrukken laten mislukken | Selectievakje | Optioneel | Laat elke gesimuleerde afdruk mislukken, zodat u de foutmelding kunt testen. | Uit |
| Aantal | Tekst | Niet van toepassing | "N gesimuleerde afdrukken". | Niet van toepassing |
| Logboek wissen | Knop | Niet van toepassing | Vraagt om bevestiging en wist dan elk record. Kan niet ongedaan worden gemaakt. | Niet van toepassing |
| Wanneer | Datum en tijd | Niet van toepassing | In de notatie van de weergavetaal. | Niet van toepassing |
| Wat | Tekst | Niet van toepassing | Afdruk via locatie-agent, Gravure van objectglas of cassette, Etiket, Moleculair etiket, Netwerkafdrukopdracht, Verslag, Etiket voor een scan. | Niet van toepassing |
| Verzonden via | Tekst | Niet van toepassing | De gebruikte route. | Niet van toepassing |
| Bestemming | Tekst | Niet van toepassing | | Niet van toepassing |
| Kopieën | Geheel getal | Niet van toepassing | | Niet van toepassing |
| Resultaat | Tekst | Niet van toepassing | "Gesimuleerd: naar printer verzonden" of "Gesimuleerd: mislukt". | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. De machtiging van de sectie is `config:printers:manage`. Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Het logboek wordt in de eigen opslag van de browser bewaard, dus per browser en niet gedeeld. Het wordt vervangen door echt afdrukken wanneer de API-server is gekoppeld.

## Deel D: Algemene systeemvoorkeuren, datum/tijd/tijdzone, monster- en accessienummering {#ch2-global-preferences}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance

Dit deel bevat de regels voor de hele organisatie: hoe lang gegevens worden bewaard, hoe accessienummers worden opgebouwd, welke velden pagina's verplicht stellen en de verwijzingslinks die medewerkers zien. Er is geen enkel scherm "algemene voorkeuren". Voor datum, tijd, tijdzone en taal zie de tabel in [Deel A](#ch2-enterprise-facilities): de tijdzone is één keuze voor de hele organisatie op de instellingen van het [Bijdragedashboard](#screen-contribution_settings), de datumnotatie volgt de weergavetaal en verslag- en spellingtalen worden op de faciliteit en de persoon ingesteld. Het alleen-lezen [Overzicht per rechtsgebied](#screen-jurisdiction_overview) staat in Deel A.

### Gegevensbewaring {#screen-retention}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Gegevensbewaring

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance** > **Gegevensbewaring**
**2. Onderhoudsonderdeel:** Gegevensbewaring

**3. Zakelijk doel en bereik.** De eigen bewaartermijnen van het lab: hoe lang PathScribe AI-suggesties, het auditlogboek, casussnapshots en het verslagarchief moet bewaren. Het scherm legt het beleid vast. Overschrijvingen op afdelingsniveau en de minimumtermijnen van de toezichthoudende instanties worden ingesteld op [Afdelingen](#screen-departments) en [Toezichthoudende organen](#screen-governing_bodies).

**4. Voorwaarden en afhankelijkheden.** Geen. Raadpleeg het gegevensbeheerbeleid van uw instelling voordat u een termijn verkort.

Setup step: Tier 1, step 18
Requires: Geen, dit is een startpunt.
Unlocks: [Afdelingen](#screen-departments)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-retention - Vier bewaartermijnen met Wijzigingen opslaan en Terugzetten naar standaard]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| AI-suggesties | Geheel aantal dagen, 30 tot 730 | Verplicht | Door AI gegenereerde veldsuggesties en betrouwbaarheidsscores die per casus worden bewaard. | 90 dagen |
| Auditlogboeken | Geheel aantal dagen, 90 tot 3650 | Verplicht | Alle gebruikersacties, aftekeningen, amendementen, spraakgebeurtenissen en systeemgebeurtenissen. Het minimum is 90 dagen. Verkorting onder de wettelijke minima vereist akkoord van uw compliance officer. | 365 dagen |
| Zaaksnapshots | Geheel aantal jaren, 1 tot 30 | Verplicht | Volledige casusgegevens, vastgelegd bij elke finalisatie en aftekening. | 7 jaar |
| Rapportarchief | Geheel aantal jaren, 1 tot 30 | Verplicht | Afgetekende verslagen die worden bewaard voor medisch-juridische en pathologische beoordeling. | 10 jaar |
| Wijzigingen opslaan | Knop | Niet van toepassing | Toont "Bewaarbeleid bijgewerkt. Gaat in bij de volgende opschoningscyclus." Een waarde buiten het bereik wordt tijdens het typen genegeerd. | Niet van toepassing |
| Terugzetten naar standaard | Knop | Niet van toepassing | Zet de vier standaardwaarden in de vakken. U moet nog steeds Wijzigingen opslaan selecteren. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Wijzigen: `config:retention-policy:manage` (hoog risico, geauditeerd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Het beleid wordt alleen in de browser opgeslagen. Er is nog geen opschoontaak die het leest: er wordt niets verwijderd of anders bewaard vanwege het beleid (PS-345). De melding "gaat in bij de volgende opschoningscyclus" beschrijft het beoogde gedrag, niet een gerealiseerd gedrag.
### Zaakmaskerconfiguratie {#screen-case_mask_config}
Breadcrumb: Start > Configuratie > Systeem > Integraties > Zaakmaskerconfiguratie

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Integraties** > **Zaakmaskerconfiguratie**
**2. Onderhoudsonderdeel:** Zaakmaskerconfiguratie (accessienummering)

**3. Zakelijk doel en bereik.** Een zaakmasker is het patroon van een accessienummer: een voorvoegsel, het jaar en een oplopend volgnummer, bijvoorbeeld `MFT26-0029`. Elk masker heeft een eigen voorvoegsel, patroon en teller en hoort bij één bereik: de onderneming, een faciliteit met een uitvoerend lab of een afdeling. Wanneer een casus wordt geaccessioneerd, zoekt PathScribe in deze volgorde naar een masker: de afdeling, dan het uitvoerend lab, dan de onderneming. Een casus zonder masker ergens in die keten gebruikt het standaardpatroon `O` plus een jaartal van twee cijfers, een streepje en een volgnummer van vier cijfers. Een accessienummer is permanent en gebonden aan fysiek weefsel en de chain of custody, dus het opslaan van een masker wijzigt het patroon alleen voor de toekomst en zet de teller nooit terug.

**4. Voorwaarden en afhankelijkheden.** De bereiken Faciliteit en Onderneming lezen het Faciliteitenwoordenboek. Een afdelingsbereik leest [Afdelingen](#screen-departments), dat in een later niveau wordt ingericht. Slaat u de faciliteit over, dan kan geen masker voor een faciliteit of onderneming worden toegevoegd; casus gebruiken dan het standaardpatroon. Een bereik dat al een masker heeft, wordt niet opnieuw aangeboden: gebruik Bewerken.

Setup step: Tier 1, step 19
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Afdelingen](#screen-departments)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-case_mask_config - Zaakmaskers gegroepeerd naar Onderneming, Faciliteit en Afdeling]

**6. Veldreferentie.**

#### Lijstpagina

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Groepen | Onderneming, Faciliteit, Afdeling | Niet van toepassing | Elke groep toont haar maskers, of "Nog geen dossiermasker op niveau van het bereik gedefinieerd". | Niet van toepassing |
| Kolommen | Voorvoegsel, Maskerpatroon, Huidige reeks, Jaarlijks resetten, Acties | Niet van toepassing | | Niet van toepassing |
| + Dossiermasker toevoegen, Bewerken, Verwijderen | Knoppen | Niet van toepassing | Verwijderen werkt onmiddellijk en heeft geen bevestiging. | Niet van toepassing |

#### Venster Toevoegen en bewerken

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Bereik | Keuze: Afdeling, Onderneming, Faciliteit (uitvoerend lab), daarna een keuzelijst van die soort | Verplicht | Vergrendeld bij bewerken. Bij toevoegen blijft elk uitvoerend lab met een masker weg: "Elke echte uitvoerend-lab-faciliteit heeft al een eigen dossiermasker." | Afdeling |
| Voorvoegsel | Tekst | Verplicht | Bijvoorbeeld MFT. | Leeg |
| Maskerpatroon | Tekst met tokens `{PREFIX}`, `{YEAR:4}`, `{YEAR:2}`, `{SEQ:N}` | Verplicht | Bijvoorbeeld `{PREFIX}{YEAR:2}-{SEQ:4}` geeft `MFT26-0029`. | `{PREFIX}{YEAR:2}-{SEQ:4}` |
| Reekscijfers | Geheel getal, 1 of meer | Verplicht | Gebruikt als het patroon geen expliciet aantal cijfers heeft. | 4 |
| Reeks jaarlijks resetten | Ja/nee-schakelaar | Optioneel | Begint de reeks elk nieuw jaar bij 1, in de tijdzone van de instelling, nooit in de tijdzone van het apparaat. | Aan |
| Voorbeeld volgend nummer | Knop | Niet van toepassing | Toont het volgende nummer zonder er een te gebruiken. | Niet van toepassing |
| Huidige reeks, laatste reset, laatst bijgewerkt door | Alleen-lezen tekst | Niet van toepassing | Getoond bij bewerken. | Niet van toepassing |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, bewerken, verwijderen: `config:case-masks:manage` (hoog risico, geauditeerd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Het jaar en de jaarlijkse reset gebruiken de tijdzone van de instelling van de organisatie (instellingen van het [Bijdragedashboard](#screen-contribution_settings)). Het voorbeeld bij **Voorbeeld volgend nummer** wordt opgebouwd met de tijdzone van de browser die u gebruikt, dus rond de jaarwisseling kan het een ander jaar tonen dan het nummer dat een casus werkelijk zou krijgen.

### Verplichte velden {#screen-field_requirements}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Verplichte velden

**Status:** Demonstratie

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance** > **Verplichte velden**
**2. Onderhoudsonderdeel:** Verplichte velden

**3. Zakelijk doel en bereik.** Kiest voor uw organisatie welke velden elke pagina nodig heeft voordat zij kan worden opgeslagen. Sommige velden zijn vergrendeld als altijd verplicht, met de reden erbij, omdat een record zonder deze velden onveilig of onbruikbaar is. De rest kunt u aan- of uitzetten. Pagina's nemen de keuze over wanneer zij opslaan: bijvoorbeeld Medewerkers en de faciliteitseditor lezen hier hun verplichte velden.

**4. Voorwaarden en afhankelijkheden.** Het scherm geldt voor de organisatie van de aangemelde persoon. Een persoon zonder gekoppelde organisatie ziet de standaardwaarden en kan ze niet wijzigen. Er hoeft niets anders eerst te worden ingesteld.

Setup step: Tier 1, step 20
Requires: Geen, dit is een startpunt.
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-field_requirements - Paginakiezer en gegroepeerde schakelaars Verplicht met vergrendelde velden]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Pagina | Keuzelijst met 16 pagina's: Opname, Aanvullende bestellingen, Batchbeheer, Klinische gegevens (cytologie), Cytologiescreening, Inbedstation, Instellingseditor, Uitsnijden, Intraoperatieve consultatie, Berichten, Microtoomwerkstation, Moleculaire plaatbouwer, Moleculaire rekbelading, Casusverslag, Glaasjesdistributiestation, Personeel | Verplicht | Toont de velden van één pagina, in groepen. | Opname |
| Instellingen voor (organisatie) | Tekst | Niet van toepassing | De organisatie die u wijzigt. | Uw organisatie |
| Verplicht | Selectievakje, één per veld | Optioneel | Zet de eis aan of uit. Een opmerking "Gewijzigd ten opzichte van standaard" verschijnt als u hem hebt gewijzigd. | Per veld |
| Altijd verplicht | Vergrendelde badge en reden | Niet van toepassing | Het veld kan niet worden uitgezet. De reden wordt getoond, bijvoorbeeld dat laboratoriumnormen twee patiëntidentificaties vereisen. | Vergrendeld |
| Hints | Tekst onder een veld | Niet van toepassing | Bijvoorbeeld "Gecontroleerd bij elk specimen", "Wordt automatisch ingevuld als het leeg blijft" of een voorwaarde zoals "Alleen cytologie- en FNA-casus". | Niet van toepassing |

Geslacht op de pagina Accessie is een vergrendeld verplicht veld zonder standaardwaarde (Batch 661): de accessiemedewerker moet het kiezen. De Reden van systeemuitval op de pagina Accessie is verplicht, en verzenden is geblokkeerd zonder die reden (Batch 658).

Een geweigerde wijziging toont een van: "Dat veld is altijd verplicht.", "U hebt geen toestemming om verplichte velden te wijzigen.", "U kunt alleen de instellingen van uw eigen organisatie wijzigen.", "Dat veld kan niet worden geconfigureerd." of "Die pagina kan niet worden geconfigureerd." Elke wijziging die u maakt, wordt met de pagina, het veld en de nieuwe waarde in het auditlogboek vastgelegd.

**7. Machtigingen.** Openen: `screen:configuration:open`. Wijzigen: `config:field-requirements:manage` (beheergroep). Admin en Superadmin hebben deze standaard. Lab Director niet en ziet het scherm alleen-lezen: "U kunt deze instellingen zien, maar niet wijzigen."
**Bekende beperkingen.** In de demonstratie worden instellingen in de opslag van de browser bewaard. De productieserver heeft alleen een contract voor de machtigingscontrole (`AUTHORIZATION_API.md`), niet voor het opslaan van de instellingen. Het uitschakelen van een protocolvereiste bij Uitsnijden stuurt monsters die zonder protocol zijn afgerond naar een tweede beoordeling.

### Externe bronnen {#screen-external_resources}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Externe bronnen

**Status:** Gerealiseerd

**1. Navigatie:** Configuratietabblad **Systeem** > groep **Beheer & compliance** > **Externe bronnen**
**2. Onderhoudsonderdeel:** Externe bronnen

**3. Zakelijk doel en bereik.** De verwijzingslinks in het paneel Bronnen: CAP-protocollen, de WHO-classificatie, interne laboratoriumsystemen en dergelijke. De Snelle links op de schermen Zoeken en Auditlogboek komen uit deze lijst (Batch 659), dus een link die u hier toevoegt, verschijnt daar. Een link voor de hele onderneming is voor iedereen zichtbaar. Een link voor één lab is alleen zichtbaar bij het uitvoerend lab waaraan hij is gekoppeld.

**4. Voorwaarden en afhankelijkheden.** Een link voor één lab heeft een uitvoerend lab uit het Faciliteitenwoordenboek nodig. Slaat u dit over, dan kunnen alleen links voor de hele onderneming worden opgeslagen: "Selecteer een uitvoerend lab voor een labgebonden bron."

Setup step: Tier 1, step 21
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-external_resources - Bronnenlijst gegroepeerd naar Protocollen, Referenties en Systemen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Lijst | Bronnen gegroepeerd per categorie | Niet van toepassing | Elke rij toont zijn titel, link en bereik: "Organisatiebreed" of "Lab: naam". Melding bij een lege lijst: "Nog geen externe bronnen geconfigureerd." | Niet van toepassing |
| + Bron toevoegen, Bewerken, Verwijderen | Knoppen | Niet van toepassing | Verwijderen vraagt "(titel) verwijderen? Dit kan niet ongedaan worden gemaakt." | Niet van toepassing |
| Titel | Tekst | Verplicht | Bijvoorbeeld CAP-kankerprotocollen. | Leeg |
| URL | Webadres dat begint met https:// of http:// | Verplicht | Fout: "Voer een geldige URL in, inclusief https://". | Leeg |
| Categorie | Keuze: Protocollen, Referenties, Systemen | Verplicht | | Protocollen |
| Bereik | Keuze: Organisatiebreed, Specifiek uitvoerend lab | Verplicht | | Organisatiebreed |
| Uitvoerend lab | Keuzelijst | Verplicht bij een bereik voor één lab | | Geen |

**7. Machtigingen.** Openen: `screen:configuration:open`. Toevoegen, bewerken, verwijderen: `config:external-resources:manage` (hoog risico, geauditeerd). Admin en Lab Director hebben deze standaard.
**Bekende beperkingen.** Alleen het adres wordt opgeslagen. PathScribe controleert niet of de link werkt.
