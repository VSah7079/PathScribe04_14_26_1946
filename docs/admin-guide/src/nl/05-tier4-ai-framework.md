---
chapter: 5
id: ch5
title: Niveau 4: Het ingebedde AI-framework van PathScribe
---

# Niveau 4: Het ingebedde AI-framework van PathScribe {#ch5}

Niveau 4 omvat alle instellingen die bepalen of, waar en hoe PathScribe kunstmatige intelligentie (AI) gebruikt, en de controles waarmee een patholoog de regie over de uitkomst houdt. Lees dit hoofdstuk met één feit in gedachten: het framework is smaller dan zijn opzet. PathScribe roept een extern taalmodel aan voor hulp bij verslagen en dictaat, en neemt uitslagen over van beeldanalyseproducten van leveranciers. Het bevat geen computervisie-engine, geen tumordetector, geen celteller, geen biomarkerscorer, geen zelfstandige engine voor natuurlijketaalverwerking (NLP) en geen hulpmiddel om modelgewichten te kalibreren. Elk daarvan is hieronder gemarkeerd als **Niet gerealiseerd**, met het dichtstbijzijnde onderdeel dat wel bestaat.

De productieomgeving draait op Microsoft SQL Server achter een ASP.NET Core API. De meeste schermen in dit hoofdstuk werken vandaag nog op de demonstratiegegevens in de browser. De statusregel van elk scherm geeft aan hoe ver het servercontract reikt.

## Hoe Niveau 4 wordt ingericht {#ch5-setup-order}
Breadcrumb: Start > Configuratie > AI-gedrag

Rond eerst Niveau 1 tot en met 3 af. Niveau 4 leest faciliteiten, artsen, monstertypen en codesystemen uit die niveaus. Werk de schermen daarna in deze volgorde af. Deel 4 van elk scherm herhaalt de eigen voorwaarden.

1. [AI-gedrag (tabblad)](#screen-tab-ai): kies de AI-dienst en het model, stel het leveranciersbeleid, de betrouwbaarheidsdrempel en de standaardinstelling voor de Orchestrator in.
2. [Validatiestudies (tabblad)](#screen-tab-validation): het beginpunt voor het bewijs dat een model werkt voor uw gegevens.
3. [Validatiestudies: Studies](#screen-validation-studies): maak een studie aan, keur haar goed en activeer haar.
4. [Validatiestudies: Rapporten](#screen-validation-reports): sluit een studie af en druk het rapport af waarmee zij wordt beoordeeld.
5. [AI-instructies](#screen-ai_instructions): keur de tekst goed die de klinische discrepantiecontrole naar het model stuurt.
6. [Regels voor klinische discrepantie](#screen-clinical_mismatch_rules): stel in wanneer een discrepantie een waarschuwing geeft, wordt vastgelegd of het ondertekenen blokkeert.
7. [AI-extractie van historie](#screen-history_extraction): schakel de adviserende lezing van historische casus in.
8. [Smart Capture](#screen-smart_capture): de schakelaar voor het prototype van factuursuggesties en de bijbehorende checklist voor productie.

[Validatiestudies: Dashboard](#screen-validation-dashboard) is een pagina voor dagelijks gebruik en maakt geen deel uit van de inrichting. Voor een faciliteitsoverschrijving van een model zijn een gepubliceerd verslagsjabloon en een geslaagde studie nodig. Rond daarom [Hoofdstuk 6](#ch6) over de sjablonen af voordat u op een faciliteitsoverschrijving vertrouwt.

**Status van de zes gebieden uit de opzet**

| Gebied | Status | Waar het wordt ingesteld |
|---|---|---|
| AI-infrastructuur en modelarchitectuur | Gerealiseerd voor de schermen en instellingen; Gedeeltelijk voor de serverkant (zie elk scherm) | Configuratie, tabblad **AI-gedrag**; Faciliteitenwoordenboek, tabblad **AI & prestaties** ([Hoofdstuk 2](#screen-facility-dictionary)) |
| Hulp bij monsterregistratie en uitsnijden met computervisie | Niet gerealiseerd. Er bestaan wel een leverancierswoordenboek en een regelgebaseerd factuurprototype | Leveranciersintegraties, categorie beeldvorming bij het uitsnijden ([Hoofdstuk 4](#screen-vendor_integrations)); [Smart Capture](#screen-smart_capture) |
| NLP- en autostructureringsengine | Gedeeltelijk. Afzonderlijke functies bestaan; er is geen zelfstandige engine | [AI-extractie van historie](#screen-history_extraction); de tabbladen Spraak en Macro's ([Hoofdstuk 4](#screen-tab-voice)); hulpmiddelen op de verslagpagina |
| AI-beeldanalyse voor digitale pathologie | Gedeeltelijk. Het overnemen van leveranciersuitslagen bestaat. Tumordetectie, celtelling en biomarkerscoring zijn Niet gerealiseerd | Leveranciersintegraties, categorieën AI voor digitale pathologie en preparaatviewers ([Hoofdstuk 4](#screen-vendor_integrations)); tabblad AI-discordantie van Kwaliteitsborging ([Hoofdstuk 4](#screen-quality-assurance)) |
| Regels voor slimme kwaliteitscontrole en anomaliedetectie | Gerealiseerd voor de schermen; Demonstratie voor de serverkant van AI-instructies | [Regels voor klinische discrepantie](#screen-clinical_mismatch_rules); [AI-instructies](#screen-ai_instructions); Regels voor abnormale triggers ([Hoofdstuk 3](#screen-abnormal_trigger_rules)) |
| AI-governance, drempels met een mens in de lus, kalibratie | Gerealiseerd voor governance en drempels. Kalibratie van gewichten: bestaat niet | [AI-instructies](#screen-ai_instructions); [Validatiestudies](#screen-tab-validation); paneel Modelversies op het tabblad AI-gedrag |

## AI-infrastructuur en modelarchitectuur {#ch5-ai-infrastructure}
Breadcrumb: Start > Configuratie > AI-gedrag

**Status:** Gerealiseerd voor de instellingenschermen. Gedeeltelijk voor de server: de productieaanroepen zijn beschreven en enkele zijn nog niet aangesloten (vermeld bij elk scherm).

Dit onderdeel legt uit hoe een AI-aanroep wordt gedaan en wie bepaalt wat die gebruikt. Het scherm dat dit alles instelt, [AI-gedrag (tabblad)](#screen-tab-ai), volgt hierna.

**De AI-proxy.** De browser bewaart nooit een AI-sleutel. Hij roept de eigen routes `/api/ai/...` van PathScribe aan en de server voegt de sleutel toe uit een geheimenopslag, zoals Azure Key Vault. Er bestaan routes voor Anthropic, Google Gemini (genereren, streamen en modellijst), OpenAI, Azure OpenAI (`/api/ai/azure/chat/completions`), een eigen eindpunt, AWS Bedrock (aanroepen en aanroepen met stream) en de terminologieopzoekingen van UMLS en de National Library of Medicine. De server moet voor elke aanroep een auditvermelding schrijven (zonder de prompttekst) en het aantal aanroepen per aanroeper beperken. De proxy die de ontwikkelbuild gebruikt, bestaat niet in productie. Het roteren van een API-sleutel gebeurt door de support van ForMedrixAI in de geheimenopslag van de server. Geen enkel scherm stelt een sleutel in of toont er een.

**Providers.** Het scherm toont namen van leveranciers. Intern wordt elke provider opgeslagen onder een id die is genoemd naar het protocol dat zij spreekt.

| Weergegeven als | Opgeslagen id | Aangeboden modellen (het eerste is de standaard wanneer u de provider kiest) |
|---|---|---|
| Anthropic (Claude) | `structured_messages` | `claude-sonnet-4-6` (aanbevolen), `claude-opus-4-8` (hoogste nauwkeurigheid), `claude-haiku-4-5` (snelste) |
| OpenAI (GPT-4) | `chat_completions` | `gpt-4o` (aanbevolen), `gpt-4-turbo`, `gpt-4` |
| Azure OpenAI | `chat_completions_managed` | `gpt-4o` (Azure), `gpt-4-turbo` (Azure) |
| AWS Bedrock | `model_gateway` | `anthropic.claude-sonnet-4-6-v1:0`, `anthropic.claude-opus-4-8-v1:0`, `amazon.nova-pro-v1:0` |
| Google (Gemini) | `structured_content` | `gemini-1.5-flash` (aanbevolen), `gemini-1.5-pro` |
| Zelf gehost / eigen eindpunt | `custom` | `custom` |
| Simulatie, demomodus | `mock` | `mock-v1` |

Als het opgeslagen provider-id niet een van deze is, gebruikt PathScribe `structured_messages`. Een providerinstelling `mock` of een onbekende waarde stuurt de aanroep nog steeds via de proxy naar de route van Anthropic (een openlijk vermeld gedrag van de proxy, geen demosnelweg). Bedrock vraagt om een serverroute die aanvragen ondertekent en een genormaliseerde stream teruggeeft; die route maakt deel uit van het proxycontract.

**Welke instelling voorrang heeft.** PathScribe bepaalt de AI-configuratie in deze volgorde: een persoonlijke overschrijving (alleen in een ontwikkelaarsweergave; geen enkel scherm stelt die in voor een beheerder), dan de labinstelling van de organisatie, dan de standaardwaarden van de build `VITE_AI_PROVIDER`, `VITE_AI_MODEL`, `VITE_AI_PROXY_URL`, `VITE_AI_GATEWAY_REGION` (standaard `us-east-1`), `VITE_AI_HOSTING_REGION` en `VITE_AI_MAX_TOKENS` (standaard 1000). De organisatie-instelling wordt opgeslagen onder de sleutel `pathscribe_ai_org_config`.

**Welk model elke taak gebruikt.**

| Taak | Gebruikt model | Opmerkingen |
|---|---|---|
| Hulp bij verslag en tekst (Generate Narrative, Suggest Synoptic Fields, macrosuggesties, scan op kritieke uitslagen, sjabloontoewijzing) | Het standaardmodel van de organisatie, of het eigen model van het uitvoerend laboratorium als dat is ingesteld in het Faciliteitenwoordenboek, tabblad **AI & prestaties** | Een faciliteit mag alleen een model kiezen waarvoor voor die faciliteit een gerapporteerde studie met oordeel GESLAAGD bestaat ([Validatiestudies: Rapporten](#screen-validation-reports)). De tokenlimiet en het aanvraagformaat van de faciliteit gaan met het model mee. |
| Verfijning van dictaat | Het standaardmodel van de hele organisatie van het type Spraakdictaat | Geen faciliteitslaag. Een spraakmodel wordt alleen standaard met een studie met oordeel GESLAAGD. In te stellen op het tabblad Spraak ([Hoofdstuk 4](#screen-tab-voice)). |
| AI-toewijzing van synoptische sjablonen en uitsnijdsjablonen | Zoals hulp bij verslagen | De betrouwbaarheidsdrempel voor deze twee ligt in de code vast op 60; er is geen instelling. De toewijzing voor het uitsnijden valt terug op het standaardsjabloon voor weefsel. |

**Leveranciersbeleid.** Eén regel per jurisdictie, en eventueel één engere regel per faciliteit, bepaalt welke AI-diensten en hostingregio's voor werk op die plaats mogen worden gebruikt. Een aanroep moet de regel van de jurisdictie en de regel van de faciliteit doorstaan. Zonder regel is elke dienst toegestaan. Binnen een regel kunnen de toegestane diensten alle diensten of een lijst zijn, en elke toegestane dienst kan een lijst met toegestane regio's hebben; zonder lijst is elke regio toegestaan. Een aanroep waarvan de regio niet is vastgelegd, wordt geweigerd waar regio's zijn beperkt. Een weigering valt nooit terug op een andere dienst: de functie gaat verder zonder AI en toont "AI is not available for this jurisdiction". De simulatieprovider is altijd toegestaan. De server moet een geweigerde aanroep beantwoorden met 403 en de code `AI_VENDOR_NOT_ALLOWED`, en vastleggen als `AI_CALL_REFUSED`.

**AI-auditlogboek.** Elke AI-aanroep schrijft een registratie van: casus, onderdeel, provider, model, status (voltooid, fout, geannuleerd of geweigerd), aantal tokens, benodigde tijd, hostingregio, jurisdictie, faciliteit en functie. Het logboek bevat de laatste 2000 vermeldingen en wordt in de browser bewaard totdat de server het vastlegt. Geen enkel scherm toont het.

**Orchestrator-modus.** De Orchestrator-modus schrijft een verslagtekst in vier vaste stappen in plaats van met één aanvraag. De engine in `src/orchestrator/` is de werkende code. [AI-gedrag (tabblad)](#screen-tab-ai) stelt de standaard van de organisatie in en een faciliteit kan die overschrijven. De formulering en volgorde van de stappen zijn niet te bewerken.

### AI-gedrag (tabblad) {#screen-tab-ai}
Breadcrumb: Start > Configuratie > AI-gedrag

**Status:** Gerealiseerd

**1. Navigatie:** Configuratie, tabblad **AI-gedrag**
**2. Onderhoudsonderdeel:** AI-gedrag (het hele tabblad)

**3. Zakelijk doel en reikwijdte.** Dit tabblad bevat de AI-instellingen van de organisatie: welke AI-engine in gebruik is, of AI draait voor macroscopisch en microscopisch werk, hoe betrouwbaar een suggestie moet zijn voordat zij wordt getoond of ingevoegd, welke dienst en welk model achter de aanroepen zitten, waar het leveranciersbeleid aanroepen naartoe laat gaan, of de Orchestrator-modus aan staat en welke modelversies beschikbaar zijn. Alles geldt voor de hele organisatie. Een faciliteit kan alleen het model en de schakelaar voor het automatische concept van de verslagtekst overschrijven, op haar eigen record in het [Faciliteitenwoordenboek](#screen-facility-dictionary).

**4. Voorwaarden en afhankelijkheden.** De scopes van het leveranciersbeleid zijn de jurisdicties en faciliteiten die u al hebt gedefinieerd, dus richt die eerst in. Slaat u de faciliteiten over, dan kan het beleidsonderdeel alleen de eigen jurisdictie van het lab aanbieden, zodat er geen faciliteitsregel kan worden opgesteld.

Setup step: Tier 4, step 1
Requires: [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Validatiestudies (tabblad)](#screen-tab-validation), [AI-instructies](#screen-ai_instructions), [Regels voor klinische discrepantie](#screen-clinical_mismatch_rules), [AI-extractie van historie](#screen-history_extraction)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: tab-ai - Tabblad AI-gedrag: badge AI-engine, gedragsschakelaars, providerinstellingen, leveranciersbeleid, Orchestrator-configuratie en Modelversies]

**6. Veldreferentie.** De onderdelen staan van boven naar beneden in deze volgorde. Wijzigingen in de eerste groep worden opgeslagen terwijl u ze aanbrengt.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Badge **AI-engine** | Alleen-lezenbadge | Niet van toepassing | Toont het model-id dat nu in gebruik is, of "Simulatie — demomodus" met een label **DEMO** wanneer de simulatieprovider is gekozen. | Niet van toepassing |
| **Macroscopie-gestuurde AI**, **Ingeschakeld** | Ja/nee-selectievakje (`grossEnabled`) | Optioneel | Wanneer uit, slaan het afronden van het uitsnijden en de assistentiepolling de AI-beoordeling van de macroscopische beschrijving over. | Aan |
| **Microscopie-gestuurde AI**, **Ingeschakeld** | Ja/nee-selectievakje (`microscopicEnabled`) | Optioneel | Wanneer uit, slaan de wijzigingsworkflow, het synoptische zijpaneel en de assistentiepolling AI-werk aan de microscopische tekst over. | Aan |
| **Betrouwbaarheidsdrempel** | Schuifregelaar, geheel getal 0 tot 100 (`confidenceThreshold`) | Optioneel | Het deel betrouwbaarheid dat een suggestie nodig heeft. Het synoptische zijpaneel en de badge voor de beoordeling van het synoptisch verslag gebruiken de drempel om suggesties te markeren. Een model kan een eigen waarde hebben in zijn venster **Instellingen** (hieronder). Wordt opgeslagen zodra u de waarde wijzigt. | 75 |
| **Geavanceerd**: Suggesties automatisch invoegen op of boven de betrouwbaarheidsdrempel | Ja/nee-selectievakje (`autoInsertSuggestions`) | Optioneel | Wanneer aan, vult het synoptische zijpaneel een suggestie in het veld in zonder te wachten tot de patholoog haar accepteert, als de betrouwbaarheid de drempel haalt. | Uit |
| **Geavanceerd**: Betrouwbaarheidsscores tonen in de editor | Ja/nee-selectievakje (`showConfidenceScores`) | Optioneel | Wordt alleen opgeslagen. Geen enkel ander scherm leest de waarde vandaag, dus wijzigen heeft geen effect. | Aan |
| **Geavanceerd**: Macro’s voorstellen op basis van de diagnosecontext | Ja/nee-selectievakje (`macroSuggestions`) | Optioneel | Wordt alleen opgeslagen. Geen enkel ander scherm leest de waarde vandaag, dus wijzigen heeft geen effect. | Uit |
| **Geavanceerd**: AI-suggesties filteren op subspecialisme | Ja/nee-selectievakje (`subspecialtyRouting`) | Optioneel | Wordt alleen opgeslagen. Geen enkel ander scherm leest de waarde vandaag, dus wijzigen heeft geen effect. | Aan |
| **Terugzetten naar standaardwaarden** | Knop | Niet van toepassing | Zet alle gedragsinstellingen hierboven terug op hun standaardwaarden. Wijzigt de provider, het leveranciersbeleid en de Orchestrator-schakelaar niet. | Niet van toepassing |

#### AI-providerinstellingen
Breadcrumb: Start > Configuratie > AI-gedrag

Wordt getoond met de kop **AI-provider - Organisatie-instellingen** en alleen aan een persoon met de rol admin, pathologist-admin of superadmin. Anderen zien een opmerking dat de provider door de beheerder wordt beheerd. Een waarschuwingsvak herinnert u eraan dat casustekst het systeem verlaat naar de gekozen dienst. Velden die niet gelden voor de gekozen provider zijn verborgen.

[SCREENSHOT PLACEHOLDER: tab-ai-provider - AI-providerinstellingen met provider, model en hostingregio]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **AI-provider** | Keuze, gegroepeerd in **Productieproviders** en **Ontwikkeling & demo** | Verplicht | Kiest de dienst. Een provider kiezen zet **Model** op het eerste model van die provider. Een korte aanwijzing onder het veld beschrijft de provider. | Anthropic (Claude) wanneer er niets is opgeslagen |
| **Model** | Keuze uit de lijst van de provider (tabel hierboven) | Verplicht | Het model-id dat bij elke aanroep wordt meegestuurd. | Eerste model van de provider |
| **Azure-resource-eindpunt** | https-link; plaatsaanduiding `https://my-org.openai.azure.com` | Verplicht voor Azure OpenAI | Het adres van uw Azure-resource. Alleen getoond voor Azure OpenAI. | Geen |
| **Implementatienaam** | Tekst | Optioneel | De Azure-implementatie die wordt aangeroepen. Wordt alleen bewaard als ook een eindpunt is ingesteld. Alleen getoond voor Azure OpenAI. | Geen |
| **AWS-regio** | Tekst | Optioneel | De Bedrock-regio. Alleen getoond voor AWS Bedrock. | `us-east-1` |
| **Hostingregio** | Tekst; plaatsaanduiding `eu-west-1` | Optioneel | De regio waar de leverancier de aanroep verwerkt, zoals de leverancier haar noemt. Wordt bij elke aanroep vastgelegd zodat het leveranciersbeleid haar kan controleren. Getoond voor elke provider behalve AWS Bedrock en Simulatie. | Leeg (regio niet vastgelegd) |
| **Basis-URL van eindpunt** | https-link | Verplicht voor Eigen eindpunt | Het basisadres van een met OpenAI compatibele dienst. PathScribe stuurt aanvragen naar `/chat/completions` onder dit adres. Alleen getoond voor Zelf gehost / eigen eindpunt. | Geen |
| Beleidswaarschuwing | Alleen-lezenbericht | Niet van toepassing | Verschijnt voordat u een dienst of regio opslaat die een regel van een jurisdictie of faciliteit in het beleid hieronder niet toestaat. | Niet van toepassing |
| **Organisatieconfiguratie opslaan** | Knop | Niet van toepassing | Slaat de organisatie-instelling op. Vereist `config:ai-provider:manage`. Verlaat u het tabblad met niet-opgeslagen wijzigingen, dan krijgt u een waarschuwing. | Niet van toepassing |
| **Verbinding testen** | Knop | Niet van toepassing | Stuurt één testaanvraag (functie `connection-test`, 20 tokens, met het verzoek om het exacte antwoord "PathScribe AI connection OK"). Het resultaat luidt Wordt getest, Verbinding OK of Mislukt met de fout. | Niet van toepassing |
| **Override wissen** | Knop | Niet van toepassing | Verschijnt alleen in de ontwikkelaarsweergave, waar een persoonlijke overschrijving kan worden ingesteld. Wordt niet getoond aan een beheerder. | Niet van toepassing |

#### Waar PathScribe gegevens bewaart
Breadcrumb: Start > Configuratie > AI-gedrag

Een alleen-lezenkaart.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **Database** | Alleen-lezentekst | Niet van toepassing | De regio van de database, overgenomen uit `/api/config` van de server. Toont **Niet opgegeven** wanneer de server haar niet geeft (de demonstratie heeft geen server). | Niet opgegeven |
| **Bestandsopslag (verslagen, exports)** | Alleen-lezentekst | Niet van toepassing | De regio van de bestandsopslag, uit dezelfde bron. | Niet opgegeven |
| **AI-dienst** | Alleen-lezentekst | Niet van toepassing | De hostingregio die is ingesteld in de AI-providerinstellingen. | Niet vastgelegd |

#### AI-leveranciersbeleid
Breadcrumb: Start > Configuratie > AI-gedrag

Een tabel met regels: één rij voor de eigen jurisdictie van het lab en één voor elke faciliteit die u bedient, plus een bediening **Instellingsregel toevoegen**. Een faciliteitsregel beperkt de regel van haar jurisdictie. De auditgebeurtenis voor een wijziging is `AI_VENDOR_POLICY_CHANGED` (voor en na).

[SCREENSHOT PLACEHOLDER: tab-ai-vendor-policy - Regeltabel van het AI-leveranciersbeleid en regeleditor]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **Jurisdictie of instelling** | Alleen-lezentekst (faciliteit getoond als faciliteit en jurisdictie) | Niet van toepassing | De scope van de regel. | De jurisdictie van het lab, plus elke bediende faciliteit |
| **Toegestaan** | Alleen-lezentekst: **Geen regel: elke dienst**, **Elke dienst**, of de lijst met diensten | Niet van toepassing | Wat de regel toestaat. | Geen regel: elke dienst |
| **Gebruikte dienst** | Alleen-lezentekst | Niet van toepassing | Toont de dienst, het model en de regio die nu in gebruik zijn en of deze scope ze toestaat: **Toegestaan**, **Niet toegestaan: dienst**, **Niet toegestaan: regio** of **Niet toegestaan: regio niet vastgelegd**. | Niet van toepassing |
| **Acties**: **Bewerken**, **Regel verwijderen** | Knoppen | Niet van toepassing | **Bewerken** opent de regeleditor hieronder. **Regel verwijderen** verwijdert de regel, zodat de scope weer elke dienst toestaat. | Niet van toepassing |
| **Instellingsregel toevoegen**, **Kies een instelling…** | Keuze uit bediende faciliteiten | Optioneel | Start een regel voor één faciliteit. | Geen |
| **Elke dienst toestaan** | Ja/nee-selectievakje | Optioneel | Staat alle diensten toe. Wanneer uit, vinkt u de toe te staan diensten aan. | Aan voor een nieuwe regel |
| Toegestane diensten | Eén selectievakje per AI-dienst | Verplicht wanneer **Elke dienst toestaan** uit staat | Er moet minstens één dienst zijn toegestaan, anders wordt het opslaan geweigerd (**Sta minstens één dienst toe, of verwijder de regel.**). | Geen |
| **Toegestane regio’s voor** (dienst) | Tekst, regio's gescheiden door komma's, bijvoorbeeld `eu-west-1, uksouth` | Optioneel | Laat leeg om elke regio toe te staan. Regio's worden getrimd, in kleine letters gezet en ontdubbeld. Een lege invoer, of regio's bij een dienst die niet is toegestaan, worden geweigerd. | Leeg (elke regio) |
| **Regel opslaan** | Knop | Niet van toepassing | Slaat de regel op. Het resultaat luidt **Opgeslagen** of de reden van de weigering. | Niet van toepassing |

#### Orchestrator-configuratie
Breadcrumb: Start > Configuratie > AI-gedrag

Een inklapbaar onderdeel. De badge **AAN — klik om te wisselen** of **UIT — klik om te wisselen** is de standaard voor de hele organisatie voor de Orchestrator-modus.

[SCREENSHOT PLACEHOLDER: tab-ai-orchestrator - Orchestrator-configuratie met de vier generatiestappen]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Aan/uit-schakelaar | Ja/nee-schakelaar | Optioneel | De standaard van de organisatie. Een faciliteit kan die overschrijven met **Automatisch conceptverslag** (Organisatiestandaard overnemen, Ingeschakeld voor deze faciliteit, Uitgeschakeld voor deze faciliteit) in het Faciliteitenwoordenboek, tabblad **AI & prestaties**. Opslaan vereist `config:ai-provider:manage`. | AAN |
| Samenvatting van de stappen | Alleen-lezentekst, "N van 4 generatiestappen actief" | Niet van toepassing | Telt de actieve stappen. | 4 van 4 |
| Stapkaarten | Alleen-lezen: stapnaam, **ACTIEF** of **UITGESCHAKELD**, **AI-instructie**, **Contextvelden** | Niet van toepassing | Vier vaste stappen worden in volgorde uitgevoerd: Administratieve en klinische kop, Monster en macroscopische beschrijving, Samenvatting van synoptische gegevens, Aanvullend onderzoek en eindconclusie. Eerdere stappen geven context aan latere. | Vast in de code |

#### Modelversies
Breadcrumb: Start > Configuratie > AI-gedrag

Een inklapbaar onderdeel met de markering **Alleen beheerders** dat het modellenpaneel bevat.

[SCREENSHOT PLACEHOLDER: tab-ai-models - Tabel Modelversies]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **Model** | Alleen-lezentekst | Niet van toepassing | De naam van het model. | Niet van toepassing |
| **Leverancier** | Alleen-lezentekst | Niet van toepassing | De maker van het model. | Niet van toepassing |
| **Type** | Alleen-lezen: Alleen macroscopie, Alleen microscopie, Macro + micro, Alleen diagnose, Spraakdictaat | Niet van toepassing | Waarvoor het model dient. | Niet van toepassing |
| **Nauwkeurigheid** | Alleen-lezenpercentage | Niet van toepassing | Het benchmarkcijfer dat voor het model is vastgelegd. | Niet van toepassing |
| **Verwerkte dossiers** | Alleen-lezen geheel getal | Niet van toepassing | Casus die het model voor uw organisatie heeft verwerkt. | 0 voor een nieuw overgenomen model |
| **Status** | Alleen-lezen: Actief, Bèta, Ingetrokken | Niet van toepassing | Een model dat uit de ForMedrixAI-winkel is overgenomen, begint als Bèta. | Niet van toepassing |
| **Goedgekeurde instellingen** | Alleen-lezenlijst | Niet van toepassing | Faciliteiten waarvan het vastgezette model dit model is. | Niet van toepassing |
| **Standaard** | Alleen-lezenmarkering | Niet van toepassing | Het standaardmodel van de organisatie. | Niet van toepassing |
| **Als standaard instellen** | Knop | Niet van toepassing | Maakt het model de standaard. Een spraakmodel kan niet de standaard worden zonder een gerapporteerde studie met oordeel GESLAAGD. | Niet van toepassing |
| **Uit gebruik nemen** | Knop, daarna een bevestiging | Niet van toepassing | Neemt het model uit gebruik. De bevestiging noemt de faciliteiten die eraan zijn vastgezet. Het standaardmodel kan niet uit gebruik worden genomen. | Niet van toepassing |
| **Instellingen** | Knop | Niet van toepassing | Opent het venster Modelinstellingen hieronder. | Niet van toepassing |

##### Venster Modelinstellingen
Breadcrumb: Start > Configuratie > AI-gedrag

[SCREENSHOT PLACEHOLDER: tab-ai-model-settings - Venster Modelinstellingen]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **Langste antwoord (tokens)** | Geheel getal 50 tot 8000 | Optioneel | Het maximum dat het model in één antwoord mag schrijven. Leeg gebruikt de organisatie-instelling. | Leeg |
| **Betrouwbaarheidsdrempel (%)** | Geheel getal 0 tot 100 | Optioneel | De eigen drempel van dit model. Leeg gebruikt de **Betrouwbaarheidsdrempel** van de organisatie. | Leeg |

Al het andere wordt geweigerd met "Voer gehele getallen binnen de getoonde bereiken in, of laat het veld leeg". Dit zijn de enige twee overschrijvingen per model die bestaan.

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Het tabblad is alleen-lezen voor een persoon die geen van deze vier heeft: `config:ai-behavior:manage` (gedragsinstellingen en **Terugzetten naar standaardwaarden**), `config:ai-provider:manage` (providerinstellingen en de Orchestrator-schakelaar), `config:ai-model:manage` (een model als standaard instellen, bijwerken, uit gebruik nemen en overnemen) en `config:ai-vendor-policy:manage` (het leveranciersbeleid). Het AI-providerpaneel vereist ook de rol admin, pathologist-admin of superadmin; dat is een rolcontrole, geen controle van een machtiging. Admin en Lab Director hebben de vier machtigingen standaard via de configuratiegroepen, en Superadmin heeft alles (behalve `config:ai-prompt:approve`, om functiescheiding achtergehouden). De wijziging van het leveranciersbeleid wordt vastgelegd als `AI_VENDOR_POLICY_CHANGED`. Een wijziging van de gedragsinstellingen legt alleen de machtigingscontrole vast, niet wat er is gewijzigd.

**Bekende beperkingen.**
- `showConfidenceScores`, `macroSuggestions` en `subspecialtyRouting` worden opgeslagen en door niets anders gelezen.
- De gedragsinstellingen en het leveranciersbeleid hebben servercontracten (`CONFIG_SERVICES_API.md`, `AI_VENDOR_POLICY_API.md`; modellen in `MODELS_API.md`). Zolang de server niet is aangesloten, werken ze op de demonstratiegegevens in de browser.
- Formulering, volgorde en veldtoewijzing van de stappen in de Orchestrator-configuratie zijn Gepland: het scherm meldt "Volgorde van stappen en veldtoewijzing worden in een toekomstige release configureerbaar".
- De AI-spellingcontrole is stopgezet en heeft geen instelling.
- Geen enkele instelling schakelt de AI-scan op kritieke uitslagen afzonderlijk uit. Die volgt de provider, het leveranciersbeleid en de [Regels voor abnormale triggers](#screen-abnormal_trigger_rules).
- De betrouwbaarheidsondergrens voor een bevinding "Abnormaal" is 50 (Batch 655). Het is een constante in de code, nog geen instelling, dus een laboratorium kan haar hier niet wijzigen.
- **Het venster Codes (Batch 656).** Elke voorgestelde medische code wordt op twee manieren bevestigd: door de code zelf op te zoeken en, naast elkaar, aan de hand van de eigen bewoording van de AI; een van beide bevestigt haar. Een code waarvan het opzoeken mislukt, blijft buiten de lijst en wordt in een notitie meegeteld, zoals voorheen. SNOMED CT-controles lopen via de serverroute die `UMLS_API_KEY` bevat; start de ontwikkelserver opnieuw op nadat u `.env` hebt bewerkt.

## Monsterregistratie en computervisie-assistentie bij het uitsnijden {#ch5-specimen-vision}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Smart Capture

**Status:** Niet gerealiseerd voor computervisie. Twee verwante onderdelen bestaan wel en worden hier beschreven zodat niemand ze voor computervisie aanziet.

PathScribe heeft geen computervisie-engine voor monsters. Niets in het product leest een foto van een monster, een cassette of een preparaat om het te identificeren, blokken te tellen, een laesie te meten of te volgen. De dichtstbijzijnde onderdelen die wel bestaan, zijn deze.

- **Het leverancierswoordenboek voor beeldvorming bij het uitsnijden.** Een lijst met leveranciers van beeldvorming (bijvoorbeeld PAX-it!/PAXcam, PathoZoom en MacroPATH, genoemd in de commentaartekst van de interface) en hoe elk te bereiken is: naam, hoe de koppeling wordt geauthenticeerd (geen, ondertekende link, OAuth 2-bearertoken of wederzijdse TLS), het https-basisadres, en of de leverancier telepathologie ondersteunt. Het is één categorie (`gross_imaging`) van [Leveranciersintegraties](#screen-vendor_integrations) in [Hoofdstuk 4](#ch4), dat de velden beschrijft. Het bevat alleen adressen en voert geen beeldanalyse uit. De cameraknop voor het uitsnijden in de casus legt alleen een foto vast; hij slaat de afbeelding inline op, wat als niet-conform is aangemerkt, en het verplaatsen naar deze leverancierscategorie is uitgesteld.
- **Macroscopie-apparatuur** ([Hoofdstuk 2](#screen-grossing_hardware)) voor weegschalen, camera's en barcodeapparatuur.
- **[Smart Capture](#screen-smart_capture)**, hieronder. Ondanks de naam roept het geen AI-model aan en bekijkt het geen afbeelding. Het is een vaste regelset die factuurregels voorstelt.

### Smart Capture {#screen-smart_capture}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Smart Capture

**Status:** Gerealiseerd (prototype). Het werkt op de demonstratiegegevens en heeft een servercontract (`SIGNATURES_SMART_CAPTURE_API.md`), en het casuspaneel draagt het label "Prototype, niet op compliance beoordeeld".

**1. Navigatie:** Configuratie, tabblad **Systeem** > groep **Labmaterialen & workflows**
**2. Onderhoudsonderdeel:** Smart Capture

**3. Zakelijk doel en reikwijdte.** Smart Capture stelt voor een casus Current Procedural Terminology (CPT)-factuurregels voor op basis van de woorden in de monsterbeschrijving, het aantal blokken en het aantal kleuringen. De regels zijn vast en voorzien van een versie (`sim-rules-1.0`): SC-LEVEL (88302 tot 88309 naar niveau van het monster), SC-SPECIAL (88312), SC-IHC-FIRST en SC-IHC-ADDL (88342 en 88341) en SC-DECAL (88311). Het is geen AI en geen computervisie. De stroom is voorstellen, beoordelen (elke regel accepteren of afwijzen), goedkeuren (een patholoog bevestigt) en exporteren. In de demonstratie gaat de export naar een gesimuleerde engine. Dit scherm schakelt het prototype in of uit en legt de checklist voor productie vast die compleet moet zijn voordat een export naar een echte interface-engine is toegestaan.

**4. Voorwaarden en afhankelijkheden.** De regels vereisen dat CPT voor de jurisdictie is ingeschakeld in Codesystemen. Slaat u dat over, dan stelt het paneel niets voor en meldt het `CPT_OFF`.

Setup step: Tier 4, step 8
Requires: [Codesystemen](#screen-code_systems)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-smart_capture - Smart Capture-prototypeschakelaar, productiechecklist en exportpoort]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **Het Smart Capture-paneel aanbieden in de factuurbeoordeling** | Ja/nee-schakelaar | Optioneel | Wanneer uit, wordt het Smart Capture-paneel niet aangeboden in het factuurpaneel van de casus. Vastgelegd in het audit als "Smart Capture Prototype Switched". | Aan |
| **Klinische validatie uitgevoerd** | Ja/nee-vinkje; legt vast wie het zette en wanneer | Optioneel | Item van de productiechecklist. Het uitvinken van een van de zes sluit de exportpoort. Vastgelegd in het audit als "Smart Capture Checklist Changed". | Niet aangevinkt |
| **Beveiligingsbeoordeling uitgevoerd** | Ja/nee-vinkje; legt vast wie en wanneer | Optioneel | Item van de productiechecklist. | Niet aangevinkt |
| **Privacybeoordeling uitgevoerd** | Ja/nee-vinkje; legt vast wie en wanneer | Optioneel | Item van de productiechecklist. | Niet aangevinkt |
| **Juridische beoordeling uitgevoerd** | Ja/nee-vinkje; legt vast wie en wanneer | Optioneel | Item van de productiechecklist. | Niet aangevinkt |
| **Beoordeling van facturatie- en coderingsbeleid uitgevoerd** | Ja/nee-vinkje; legt vast wie en wanneer | Optioneel | Item van de productiechecklist. | Niet aangevinkt |
| **Echt ontvangend systeem getest** | Ja/nee-vinkje; legt vast wie en wanneer | Optioneel | Item van de productiechecklist. | Niet aangevinkt |
| **Export naar een echte interface-engine toestaan** | Ja/nee-schakelaar | Optioneel | Uitgeschakeld totdat alle zes vinkjes zijn gezet. Wanneer uit, gaat de export alleen naar de gesimuleerde engine. Vastgelegd in het audit als "Smart Capture Production Gate Changed". | Uit |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Een instelling wijzigen: `config:smart-capture:manage` (standaard Admin en Lab Director). In de casus gaan `billing:smart-capture:review`, `billing:smart-capture:approve` en `billing:smart-capture:send` naar de rol Pathologist. Elke wijziging hierboven wordt vastgelegd in het audit.

**Bekende beperkingen.** De regels zijn een prototype en niet op compliance beoordeeld; de vinkjes leggen vast dat iemand zegt dat de beoordeling is uitgevoerd en voeren zelf geen beoordeling uit. Niets gebruikt AI of afbeeldingen. De export naar een echte interface-engine is alleen een poort: er is geen echt ontvangend systeem aangesloten.

## NLP- en autostructureringsengine {#ch5-nlp}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > AI-extractie van historie

**Status:** Gedeeltelijk. Afzonderlijke taalfuncties bestaan. Een zelfstandige NLP- of autostructureringsengine bestaat niet en er is geen scherm voor.

Wat vandaag bestaat; elk onderdeel stuurt tekst naar het model dat op [AI-gedrag (tabblad)](#screen-tab-ai) is gekozen en valt onder het leveranciersbeleid:

- **Extractie van historie** ([AI-extractie van historie](#screen-history_extraction)): leest historische casus en vult gestructureerde velden in als adviserende informatie.
- **Suggest Synoptic from Narrative**: op de verslagpagina, vult synoptische velden in vanuit de verslagtekst. Elke suggestie heeft een betrouwbaarheid van 0 tot 100 en een citaat uit de brontekst. Werkt in de Orchestrator-modus en de assistentiemodus.
- **Generate Narrative from Synoptic**: op de verslagpagina, schrijft de verslagtekst vanuit de synoptische gegevens. Alleen in de Orchestrator-modus.
- **Toewijzing van synoptische sjablonen**: het model stelt voor welk synoptisch sjabloon een casus nodig heeft, met een vaste betrouwbaarheidsdrempel van 60.
- **Scan op kritieke uitslagen** bij het ondertekenen: een scan van alleen de verslagtekst die rekening houdt met ontkenning.
- **Verfijning van dictaat** (tabblad Spraak, [Hoofdstuk 4](#screen-tab-voice)) en **macrosuggestie** (tabblad Macro's, [Hoofdstuk 4](#screen-tab-macros)).

Niet gerealiseerd: een algemene pijplijn van vrije tekst naar gestructureerde gegevens buiten de bovenstaande functies, een scherm om er een in te stellen, en elk getraind klinisch NLP-model van PathScribe zelf. De eerdere Computational Sidecar is op 18 oktober 2026 stopgezet.

### AI-extractie van historie {#screen-history_extraction}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > AI-extractie van historie

**Status:** Gedeeltelijk. Het scherm en de regels werken op de demonstratiegegevens en het servercontract is beschreven (`HISTORY_AI_EXTRACTION_API.md`), maar niets is geprobeerd tegen een echte server. De samenvattingshook voor de assistentiemodus is niet gerealiseerd.

**1. Navigatie:** Configuratie, tabblad **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** AI-extractie van historie

**3. Zakelijk doel en reikwijdte.** Wanneer een patholoog een historische casus opent, kan het model de tekst van de Einddiagnose en de microscopische beschrijving lezen en waarden voorstellen voor de velden van een gestructureerd sjabloon. De resultaten dragen het label "Door AI geëxtraheerd, niet geverifieerd" en zijn alleen adviserend: verslagen, afdrukken, het register, facturatie, regels en exports gebruiken ze nooit (een test in de code bewaakt dit). Het doet twee modelaanroepen per casus (het sjabloon kiezen, daarna de velden invullen) en laat elk veld met een betrouwbaarheid onder 30 vallen (vast in de code). Resultaten worden in de cache bewaard op basis van een hash van de brontekst, en een mislukte run wordt opnieuw geprobeerd de volgende keer dat de casus wordt geopend. De auditgebeurtenis `HISTORY_EXTRACTION_RUN` bevat geen patiëntentekst.

**4. Voorwaarden en afhankelijkheden.** De functie vereist een werkende AI-dienst en de faciliteitenlijst. Zonder AI-dienst, of met een dienst die het leveranciersbeleid weigert, wordt niets geëxtraheerd en toont de casus geen adviserende gegevens.

Setup step: Tier 4, step 7
Requires: [AI-gedrag (tabblad)](#screen-tab-ai), [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-history_extraction - Scope, status en nauwkeurigheidskaart van AI-extractie van historie]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **Geldt voor** | Keuze: **Onderneming (alle vestigingen)** of één actieve faciliteit | Verplicht | De scope die u bekijkt en wijzigt. | Onderneming |
| Statuskaart | Alleen-lezen **Aan** of **Uit** | Niet van toepassing | De instelling die geldt voor de gekozen scope. Bepaald als de eigen instelling van de faciliteit, dan de instelling van de onderneming, dan uit. | Uit |
| Bronlabel | Alleen-lezen: **Ingebouwde standaard**, **Instelling van de onderneming** of **Eigen instelling van deze vestiging** | Niet van toepassing | Waar de status vandaan komt. | Ingebouwde standaard |
| **Inschakelen** / **Uitschakelen** | Knop | Niet van toepassing | Zet de status voor de gekozen scope. | Niet van toepassing |
| **Instelling van de onderneming gebruiken** | Knop | Niet van toepassing | Verschijnt alleen wanneer de gekozen faciliteit een eigen vermelding heeft. Verwijdert die zodat de faciliteit de onderneming volgt. | Niet van toepassing |
| **Nauwkeurigheid tot nu toe** | Alleen-lezenkaart: gelezen verslagen, geëxtraheerde velden, als fout gemarkeerd | Niet van toepassing | Telt, voor de gekozen scope, hoeveel verslagen zijn gelezen, hoeveel velden zijn geëxtraheerd en hoeveel een patholoog als fout heeft gemarkeerd. | 0 |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Wijzigen: `config:history-extraction:manage` (Admin en Lab Director). In de casus gaan `ai:history-extraction:run` en `ai:history-extraction:flag` naar Pathologist, Fellow en Resident, en `case:clinical-history:record` gaat naar deze drie en Pathologist Assistant. Het leveranciersbeleid is van toepassing en weigert een niet-toegestane dienst met `vendorNotAllowed`. Het uitvoeren van een extractie wordt vastgelegd als `HISTORY_EXTRACTION_RUN`.

**Bekende beperkingen.** Ontworpen als alleen adviserend. De samenvattingshook voor de assistentiemodus is Niet gerealiseerd. De afkapwaarde van 30 punten voor de betrouwbaarheid heeft geen instelling.

## AI-beeldanalyse voor digitale pathologie {#ch5-dp-ai}
Breadcrumb: Start > Configuratie > Systeem > Labmaterialen & workflows > Leveranciersintegraties

**Status:** Gedeeltelijk. Het ontvangen en tonen van uitslagen van leveranciersproducten bestaat. Tumordetectie, celtelling en biomarkerscoring door PathScribe zelf zijn **Niet gerealiseerd**.

PathScribe analyseert geen beelden. Het legt vast wat het product van een leverancier meldt. Het dichtstbijzijnde onderdeel bij een AI-analysemodule is deze keten, die in andere hoofdstukken wordt ingesteld:

- **Leverancierswoordenboek** (categorie AI voor digitale pathologie in [Leveranciersintegraties](#screen-vendor_integrations), [Hoofdstuk 4](#ch4)): naam van de leverancier, productnaam, modaliteit (vrije tekst), een selectievakje **FDA-goedgekeurd** (een momentopname die een beheerder vastlegt, geen controle) en een actief-schakelaar. Het is vooraf gevuld met Paige Prostate, Ibex Prostate Detect, PathAI AISight Dx, Proscia Concentriq AP-Dx, Hologic Genius Digital Diagnostics (cervixcytologie) en BD FocalPoint GS (gemarkeerd als niet goedgekeurd, omdat het een premarket approval is en geen 510(k)-clearance). Leveranciers van preparaatviewers (sjablonen voor startadressen) en scanbatches van whole slide images staan ernaast.
- **Uitslagregistratie**: een status (besteld, voltooid, mislukt of time-out), bevindingen (een vrijetekstlabel, een betrouwbaarheid van 0 tot 1 en een optionele regio), biomarkeruitslagen als vrije tekst (naam en waarde), en een triagerangorde van het preparaat met een beoordelingsaanbeveling in de stijl van de kwintielen van BD.
- **Opname**: een uitslag van een leverancier komt binnen als inkomende gebeurtenis van de interface-engine. In de demonstratie plaatst het voltooien van een batch Cytologie-beeldvorming automatisch een AI-screeningsopdracht bij de eerste actieve leverancier van cervixcytologie.
- **Badge op de cytologiewerklijst en concordantievraag**: het antwoord van de patholoog wordt vastgelegd. Een onenigheid leidt tot een openstaande tekortkoming en start nooit zelf een corrigerende actie.
- **Tabblad AI-discordantie van Kwaliteitsborging** ([Hoofdstuk 4](#screen-quality-assurance)): een discordantierapport per leverancier en een rapport van vastgelopen uitslagen. De time-out voor een vastgelopen uitslag wordt daar ingesteld (hele uren 1 tot 720, standaard 24).

Niet gerealiseerd: een tumordetector, celteller of biomarkerscorer van PathScribe zelf, en elke bediening die de analyse van een leverancier afstemt. De echte leveranciersintegraties zijn niet afgerond. Het contract is `DIGITAL_PATHOLOGY_API.md`. Verwante inrichting: Cytologie-instrumentatie ([Hoofdstuk 3](#screen-cytology_instrumentation)).

## Regels voor slimme kwaliteitscontrole en detectie van diagnostische anomalieën {#ch5-smart-qc}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Regels voor klinische discrepantie

**Status:** Gerealiseerd voor de regelschermen. Demonstratie voor de serverkant van AI-instructies. Er is geen enkele module "anomaliedetectie"; de onderstaande controles staan los van elkaar en elk is beschreven waar het wordt ingesteld.

- **Klinische discrepantiecontrole** ([Regels voor klinische discrepantie](#screen-clinical_mismatch_rules) en [AI-instructies](#screen-ai_instructions), dit hoofdstuk): het model vergelijkt de klinische indicatie en historie met de diagnose, en de regels bepalen wat een resultaat doet.
- **Regels voor abnormale triggers** ([Hoofdstuk 3](#screen-abnormal_trigger_rules)): afzonderlijke regels met de ernstniveaus Abnormaal, Kritiek en Maligne. De vooraf gevulde regels zijn Margestatus, Perineurale invasie, Lymfklierstatus en Lymfovasculaire invasie.
- **Scan van de verslagtekst op kritieke uitslagen**: het model scant de verslagtekst bij het ondertekenen, houdt rekening met ontkenning en stuurt alleen verslagtekst. Het heeft geen eigen instelling.
- **Beleid voor discordantietrends van kwaliteitsborging** ([Hoofdstuk 4](#screen-qa_trend_policy)), het tabblad **AI-discordantie** ([Hoofdstuk 4](#screen-quality-assurance)) en **Regels voor cytologie-QC** ([Hoofdstuk 4](#screen-cytology_qc_rules)).

Niet gerealiseerd: een statistische of door machine learning gestuurde anomaliedetector die doorlooptijden, volumes of uitslagen over casus heen bewaakt.

### Regels voor klinische discrepantie {#screen-clinical_mismatch_rules}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > Regels voor klinische discrepantie

**Status:** Gerealiseerd. Het werkt op de demonstratiegegevens en heeft een servercontract (`CONFIG_SERVICES_API.md`, `/api/clinical/clinical-mismatch-rule/*`).

**1. Navigatie:** Configuratie, tabblad **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** Regels voor klinische discrepantie

**3. Zakelijk doel en reikwijdte.** Bij het ondertekenen vergelijkt het model wat de clinicus het lab heeft meegedeeld met wat de patholoog heeft gediagnosticeerd, en geeft het een soort discrepantie en een betrouwbaarheid van 0 tot 100 terug. Deze regels zetten die betrouwbaarheid om in een uitkomst. Onder de weergavedrempel wordt het resultaat verworpen. Vanaf de weergavedrempel tot de actiedrempel is het laag risico: de patholoog ziet een waarschuwing en het QA-logboek legt het vast. Vanaf de actiedrempel geldt de actie van de regel: **Blokkeren** maakt het hoog risico en houdt het ondertekenen tegen totdat een beslissing is vastgelegd, **Waarschuwen** geeft een waarschuwing en **Registreren** legt het vast. Beslissingen worden vastgelegd als RESOLVED, UNRESOLVED of DEFERRED. De volledige workflow staat in `docs/product/CLINICAL_MISMATCH_CHECK.md`. Eén regel per soort discrepantie geldt voor alle monstertypen, en u kunt een regel toevoegen voor één monstertype.

**4. Voorwaarden en afhankelijkheden.** De controle roept de AI-dienst aan die op het tabblad AI-gedrag is ingesteld, en de regels per monstertype kiezen uit de actieve monstertypen. Zonder AI-dienst, of met een dienst die het leveranciersbeleid weigert, draait de controle niet. Slaat u het Specimenwoordenboek over, dan is de lijst **Een regel voor één specimentype** leeg.

Setup step: Tier 4, step 6
Requires: [AI-gedrag (tabblad)](#screen-tab-ai), [Specimenwoordenboek](#screen-specimens)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-clinical_mismatch_rules - Tabel met regels voor klinische discrepantie en bediening om een regel toe te voegen]

**6. Veldreferentie.** Drempels worden opgeslagen wanneer u het vak verlaat of op Enter drukt. De actie wordt opgeslagen wanneer u haar kiest.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **Soort discrepantie** | Alleen-lezen: onverwachte maligniteit, doodsoorzaak, locatie of orgaan, verwachte maligniteit niet gevonden, overig | Niet van toepassing | Eén rij per soort voor alle monstertypen, plus eventuele rijen per monstertype. | Niet van toepassing |
| **Specimentype** | Alleen-lezen: alle specimentypes, of één type uit het Specimenwoordenboek | Niet van toepassing | De scope van de rij. | Alle specimentypes |
| **Waarschuwing vanaf** | Geheel getal 0 tot 100 (weergavedrempel, %) | Verplicht | Resultaten hieronder worden onderdrukt. | 60 voor elke soort |
| **Actie vanaf** | Geheel getal 0 tot 100 (actiedrempel, %) | Optioneel | Moet minstens gelijk zijn aan **Waarschuwing vanaf**. Leeg betekent dat de actie begint bij de waarde van **Waarschuwing vanaf**. | onverwachte maligniteit 70, doodsoorzaak 70, locatie of orgaan 65, verwachte maligniteit niet gevonden leeg, overig 65 |
| **Actie** | Keuze: **Blokkeren**, **Waarschuwen**, **Registreren** | Verplicht | Wat er gebeurt vanaf **Actie vanaf**. | onverwachte maligniteit Blokkeren, doodsoorzaak Blokkeren, locatie of orgaan Blokkeren, verwachte maligniteit niet gevonden Registreren, overig Registreren |
| **Verwijderen** | Knop | Niet van toepassing | Verwijdert een regel voor een monstertype. De regel voor alle monsters van een soort kan niet worden verwijderd. | Niet van toepassing |
| **Een regel voor één specimentype** | Keuze van soort en keuze van actief specimentype | Optioneel | Maakt een regel die begint als kopie van de regel voor alle typen van die soort. Een tweede regel voor dezelfde soort en hetzelfde specimentype wordt geweigerd. | Geen |
| **Amendementen, correcties en addenda** | Ja/nee-selectievakje | Optioneel | Wanneer aan, geldt "Een afwijking met hoog risico houdt de vrijgave tegen tot een beslissing is vastgelegd" ook voor amendementen, correcties en addenda. | Aan |

Een geweigerde invoer toont een van deze problemen: drempel buiten het bereik, actie onder weergave, dubbel, standaard kan niet worden verwijderd, onbekende actie of onbekende categorie.

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`. Het bekijken: `config:clinical-mismatch-rules:view` (standaard Pathologist, QA Reviewer en Lab Director). Het wijzigen: `config:clinical-mismatch-rules:manage`, dat `view` vereist en geen standaardrol heeft, dus ken het bewust toe. Zonder `manage` is het scherm alleen-lezen. Wijzigingen worden vastgelegd als `CLINICAL_MISMATCH_RULE_CHANGED`. `case:clinical-mismatch:record` (een beslissing vastleggen bij het ondertekenen) gaat naar Pathologist en Fellow. Functiescheiding: niemand mag `config:clinical-mismatch-rules:manage` samen met `config:ai-prompt:approve` hebben, en Superadmin is hiervan niet uitgezonderd.

**Bekende beperkingen.** Het model kan het mis hebben; de drempels zijn de controle van het lab over hoe vaak een patholoog wordt onderbroken. Een discrepantie bij het ondertekenen is adviserend, tenzij de actie van een regel **Blokkeren** is.

## AI-governance, drempels met een mens in de lus en kalibratie {#ch5-governance}
Breadcrumb: Start > Configuratie > Validatiestudies

**Status:** Gerealiseerd voor governance en drempels. Kalibratie van gewichten: bestaat niet.

De controles van PathScribe houden een persoon tussen het model en het dossier.

- **Goedgekeurde instructies.** De tekst die de klinische discrepantiecontrole naar het model stuurt, heeft versies en een tweede persoon moet haar goedkeuren ([AI-instructies](#screen-ai_instructions)).
- **Bewijs.** Een validatiestudie meet hoe vaak pathologen de suggesties van het model ongewijzigd accepteren, en een oordeel GESLAAGD is wat een faciliteit in staat stelt een model vast te zetten of een spraakmodel de standaard te laten worden ([Validatiestudies](#screen-tab-validation)).
- **Drempels.** Elke drempel in het product staat hier vermeld.

| Drempel | Waarde | Waar ingesteld |
|---|---|---|
| Betrouwbaarheidsdrempel (suggesties) | 0 tot 100, standaard 75 | Tabblad **AI-gedrag**; overschrijving per model in **Modelinstellingen** |
| Automatisch invoegen op of boven de drempel | Standaard uit | Tabblad **AI-gedrag**, **Geavanceerd** |
| Weergave- en actiedrempels van klinische discrepantie | 0 tot 100, weergave standaard 60 | [Regels voor klinische discrepantie](#screen-clinical_mismatch_rules) |
| Toewijzing van synoptische sjablonen en uitsnijdsjablonen | Vast 60 | Code; geen instelling |
| Afkapwaarde voor velden bij extractie van historie | Vast 30 | Code; geen instelling |
| Streefpercentage voor acceptatie van een studie en maximale gemiddelde bewerkingsverhouding | Standaard 70% en 30% | [Validatiestudies: Studies](#screen-validation-studies) |
| Vastgelopen AI-screeninguitslag | Hele uren 1 tot 720, standaard 24 | Tabblad **AI-discordantie** van kwaliteitsborging ([Hoofdstuk 4](#screen-quality-assurance)) |

**Kalibratie van gewichten en instellingen alleen voor intern gebruik.** Er is nergens in PathScribe een instelling voor kalibratie van modelgewichten, fine-tuning of herkalibratie, en geen enkele AI-instelling is beperkt tot medewerkers van ForMedrixAI. Een zoekopdracht in de code vindt alleen kalibratie van apparatuur en van cytologie, die geen verband houden met AI. Geen enkele machtiging in de catalogus is voor AI als alleen-platform gemarkeerd. Twee verwante feiten zijn goed om te weten. De API-sleutel wordt geroteerd door de support van ForMedrixAI in de geheimenopslag van de server, en er is geen scherm voor. De modelcatalogus die de ForMedrixAI-winkel aanbiedt, is eigendom van het platform, en daarvoor is ook geen scherm voor medewerkers. Omdat zo'n instelling niet bestaat, bevat dit hoofdstuk geen onderdeel dat als alleen intern ForMedrixAI is gemarkeerd.

### AI-instructies {#screen-ai_instructions}
Breadcrumb: Start > Configuratie > Systeem > Beheer & compliance > AI-instructies

**Status:** Demonstratie. De regels draaien in de browser op geïnjecteerde opslag en de service heeft geen eigen serverroute (`HTTP_SERVICES_REMAINING.md`).

**1. Navigatie:** Configuratie, tabblad **Systeem** > groep **Beheer & compliance**
**2. Onderhoudsonderdeel:** AI-instructies

**3. Zakelijk doel en reikwijdte.** De klinische discrepantiecontrole stuurt het model een instructietekst. Dit scherm beheert die tekst voor elk van drie disciplines: Histologie, Cytologie en Autopsie (getoond als tabbladen). Een wijziging loopt via bewerken en daarna goedkeuring door een andere persoon, zodat niemand alleen kan wijzigen wat het model te horen krijgt. Het blok met casusgegevens en het JSON-antwoordformaat liggen vast in de code en kunnen hier niet worden bewerkt. Alleen de goedgekeurde versie wordt gebruikt. Versie 0 is de ingebouwde tekst van PathScribe.

**4. Voorwaarden en afhankelijkheden.** De tekst wordt gebruikt door de controle op de dienst van het tabblad AI-gedrag, dus de AI-dienst wordt eerst ingericht. Slaat u die over, dan heeft een goedgekeurde tekst niets om op te draaien en meldt **Deze tekst testen** dat de AI niet beschikbaar is.

Setup step: Tier 4, step 5
Requires: [AI-gedrag (tabblad)](#screen-tab-ai)
Unlocks: [Regels voor klinische discrepantie](#screen-clinical_mismatch_rules)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: system-ai_instructions - Disciplinetabbladen van AI-instructies met de kaarten In gebruik, Wacht op goedkeuring, Bewerken, Testen en Geschiedenis]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Disciplinetabbladen | Keuze: Histologie, Cytologie, Autopsie | Verplicht | Elke discipline heeft een eigen tekst en geschiedenis. | Histologie |
| **In gebruik: versie N** | Alleen-lezentekst | Niet van toepassing | De goedgekeurde versie die de controle nu gebruikt. | Versie 0 (ingebouwde tekst) |
| **Wacht op goedkeuring** | Alleen-lezentekst | Niet van toepassing | De wachtende versie, indien aanwezig. Een nieuwe bewerking trekt de vorige wachtende versie in. | Geen |
| **Goedkeuren** | Knop | Niet van toepassing | Maakt de wachtende versie de versie in gebruik. Geweigerd voor iedereen die de tekst sinds de laatste goedkeuring heeft bewerkt (SELF_APPROVAL). Vereist `config:ai-prompt:approve`. | Niet van toepassing |
| Reden voor afwijzing | Tekst | Verplicht om af te wijzen | De reden wordt bewaard in de geschiedenis. | Geen |
| **Afwijzen** | Knop | Niet van toepassing | Uitgeschakeld totdat een reden is ingevoerd. De goedgekeurde versie blijft in gebruik. | Niet van toepassing |
| Tekst bewerken | Tekstvak, maximaal 6000 tekens, met een teller | Verplicht | Mag niet leeg zijn, niet langer dan 6000 tekens en moet verschillen van de huidige tekst (anders: leeg, te lang of ongewijzigd). | De tekst in gebruik |
| **Opslaan voor goedkeuring** | Knop | Niet van toepassing | Maakt een nieuwe wachtende versie. | Niet van toepassing |
| **Klinische indicatie** | Tekst | Optioneel | Voorbeeldinvoer voor de test. Gevuld vanuit een ingebouwd voorbeeld. | Voorbeeldtekst |
| **Klinische voorgeschiedenis** | Tekst | Optioneel | Voorbeeldinvoer voor de test. | Voorbeeldtekst |
| **Bevindingen** | Tekst | Optioneel | Voorbeeldinvoer voor de test. | Voorbeeldtekst |
| **Diagnose** | Tekst | Optioneel | Voorbeeldinvoer voor de test. | Voorbeeldtekst |
| **Door de patholoog bevestigde maligne bevinding** | Ja/nee-selectievakje | Optioneel | Voorbeeldinvoer voor de test. | Uit |
| **Deze tekst testen** | Knop | Niet van toepassing | Laat de wachtende of bewerkte tekst eenmaal op het voorbeeld draaien. Het resultaat is discrepantie, geen, niet toegestaan (door het leveranciersbeleid) of niet beschikbaar. | Niet van toepassing |
| Geschiedenis | Alleen-lezenlijst | Niet van toepassing | Elke versie met haar status: wacht op goedkeuring, in gebruik, afgewezen, vervangen of vervangen vóór goedkeuring. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: `screen:configuration:open`, plus `config:ai-prompt:edit` of `config:ai-prompt:approve`. Het weergeven van versies vereist `config:ai-prompt:view` (QA Reviewer en Lab Director). `config:ai-prompt:edit` heeft geen ingebouwde rol en vereist `view`. `config:ai-prompt:approve` gaat alleen naar Lab Director en wordt onthouden aan Superadmin; het vereist `view`. Superadmin heeft `view` en `edit`. Functiescheiding: `config:ai-prompt:approve` mag niet samen met `config:clinical-mismatch-rules:manage` worden gehouden. Vastgelegd als `AI_PROMPT_EDITED`, `AI_PROMPT_APPROVED` en `AI_PROMPT_REJECTED`.

**Bekende beperkingen.** De serverkant is Niet gerealiseerd. Een persoon die alleen `view` heeft, zoals een QA Reviewer, kan het scherm niet openen, ook al zou de lijst voor hem laden.

### Validatiestudies (tabblad) {#screen-tab-validation}
Breadcrumb: Start > Configuratie > Validatiestudies

**Status:** Gerealiseerd. Het werkt op de demonstratiegegevens en heeft een servercontract (`QUALITY_API.md`, `/api/validation-studies/...`).

**1. Navigatie:** Configuratie, tabblad **Validatiestudies**
**2. Onderhoudsonderdeel:** Validatiestudies (het hele tabblad)

**3. Zakelijk doel en reikwijdte.** Een validatiestudie verzamelt bewijs dat een AI-model werkt op uw eigen casus. Pathologen werken zoals gewoonlijk; bij het ondertekenen legt PathScribe voor elke AI-suggestie vast of zij ongewijzigd is geaccepteerd en hoeveel zij is bewerkt. De signalen zijn geanonimiseerd. Wanneer de studie wordt gesloten, beoordeelt het rapport het model, en alleen een oordeel GESLAAGD laat een faciliteit dat model vastzetten. Het tabblad heeft drie subtabbladen, **Studies**, **Dashboard** en **Rapporten**, gekozen met `?section=studies`, `dashboard` of `reports`. De studies zijn adviserend: `validationMode` is altijd adviserend. Een banner meldt dat, en een schakelaar **Hoe dit werkt — met een voorbeeld** legt het proces uit.

**4. Voorwaarden en afhankelijkheden.** Een studie valideert een model dat op het tabblad AI-gedrag is gekozen en schrijft faciliteiten in uit het Faciliteitenwoordenboek. Slaat u de modellen en de faciliteiten over, dan heeft het studieformulier niets om uit te kiezen.

Setup step: Tier 4, step 2
Requires: [AI-gedrag (tabblad)](#screen-tab-ai), [Faciliteitenwoordenboek](#screen-facility-dictionary)
Unlocks: [Validatiestudies: Studies](#screen-validation-studies)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: tab-validation - Tabblad Validatiestudies met de adviesbanner en de drie subtabbladen]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Adviesbanner | Alleen-lezentekst | Niet van toepassing | Meldt dat een studie adviserend is. | Niet van toepassing |
| **Hoe dit werkt — met een voorbeeld** | Schakelaar | Optioneel | Toont of verbergt de uitgewerkte uitleg. | Verborgen |
| Subtabbladen **Studies**, **Dashboard**, **Rapporten** | Keuze | Verplicht | Opent het bijbehorende scherm hieronder. | Studies |

**7. Machtigingen.** Het tabblad verschijnt alleen voor een persoon met de rol admin, pathologist-admin of superadmin. Dat is een rolcontrole, geen controle van een machtiging. Binnen het tabblad is het alleen-lezen zonder `config:validation-studies:manage` en `validation:approval:record`. Beide worden door Admin en Lab Director gehouden via de configuratiegroep voor kwaliteit. De rol Lab Director staat niet in de rolcontrole, dus hij heeft de machtigingen maar kan het tabblad niet openen.

**Bekende beperkingen.** Zie [Validatiestudies: Studies](#screen-validation-studies).

### Validatiestudies: Studies {#screen-validation-studies}
Breadcrumb: Start > Configuratie > Validatiestudies > Studies

**Status:** Gerealiseerd.

**1. Navigatie:** Configuratie, tabblad **Validatiestudies** > subtabblad **Studies**
**2. Onderhoudsonderdeel:** Studies

**3. Zakelijk doel en reikwijdte.** De lijst met studies en het formulier om er een aan te maken. Een studie doorloopt de statussen concept, in afwachting van goedkeuring, goedgekeurd, actief, gesloten en gerapporteerd. De knoppen hangen af van de status: een concept heeft **Bewerken**, **Indienen ter beoordeling** en **Verwijderen**; een studie in afwachting heeft **Goedkeuring vastleggen**; een goedgekeurde studie heeft **Activeren** (geweigerd zonder METC-referentie); een actieve studie heeft **Studie sluiten**.

**4. Voorwaarden en afhankelijkheden.** Het studieformulier kiest een model van het tabblad AI-gedrag, actieve faciliteiten en ingeschreven pathologen (gefilterd op de gekozen faciliteiten), en optioneel gepubliceerde verslagsjablonen. Slaat u de artsen over, dan is de lijst **Ingeschreven pathologen** leeg en kan een studie niet worden opgeslagen. Gepubliceerde sjablonen worden ingericht in [Hoofdstuk 6](#ch6); zijn er geen, laat dan **Rapportsjablonen** leeg om alle sjablonen mee te nemen.

Setup step: Tier 4, step 3
Requires: [Validatiestudies (tabblad)](#screen-tab-validation), [AI-gedrag (tabblad)](#screen-tab-ai), [Faciliteitenwoordenboek](#screen-facility-dictionary), [Artsen](#screen-physicians)
Unlocks: [Validatiestudies: Rapporten](#screen-validation-reports), [Validatiestudies: Dashboard](#screen-validation-dashboard)

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: validation-studies - Lijst met validatiestudies met Nieuwe studie]

**6. Veldreferentie.**

#### Formulier Nieuwe studie / Studie bewerken
Breadcrumb: Start > Configuratie > Validatiestudies > Studies

[SCREENSHOT PLACEHOLDER: validation-studies-new - Formulier Nieuwe studie]

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **Studienaam** | Tekst | Verplicht | De naam die in de lijst en op het rapport wordt getoond. | Geen |
| **Beschrijving** | Tekst | Optioneel | Doel van de studie. | Geen |
| **Te valideren AI-model** | Keuze uit modellen | Verplicht | Vergrendeld wanneer u bewerkt. Een link **Blader door de ForMedrixAI-winkel** (alleen nieuwe studies) opent het winkelvenster hieronder. | Geen |
| **Streefacceptatiegraad** | Schuifregelaar 50% tot 100%, stap 5 | Verplicht | Het deel van de suggesties dat ongewijzigd wordt geaccepteerd en een oordeel GESLAAGD oplevert. | 70% |
| **Maximale gemiddelde bewerkingsratio** | Schuifregelaar 10% tot 90%, stap 5 | Verplicht | Het maximum dat de pathologen suggesties gemiddeld mogen bewerken voor een oordeel GESLAAGD. | 30% |
| **Startdatum** | Datum | Verplicht | Wanneer de studie begint. | Vandaag |
| **METC-/ethiek-referentie** | Tekst | Optioneel | Getoond op het formulier maar niet opgeslagen. De referentie wordt vastgelegd bij de goedkeuringsstap. | Geen |
| **Deelnemende faciliteiten** | Keuze uit actieve faciliteiten, meerdere | Verplicht | Signalen tellen alleen voor deze. | Geen |
| **Ingeschreven pathologen** | Keuze uit pathologen, meerdere, gefilterd op de gekozen faciliteiten | Verplicht | Alleen hun ondertekeningen genereren signalen. De eerst gekozene wordt de hoofdonderzoeker; hiervoor is geen veld. | Geen |
| **Rapportsjablonen** | Keuze uit gepubliceerde sjablonen, meerdere | Optioneel | Leeg betekent alle sjablonen. | Alle sjablonen |

#### Venster Indienen voor ethiek-/METC-toetsing
Breadcrumb: Start > Configuratie > Validatiestudies > Studies

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **Naam ethiek-/METC-commissie** | Tekst | Verplicht | De commissie waaraan de studie wordt voorgelegd. | Geen |
| **Ingediend door** | Tekst | Verplicht | Wie haar heeft ingediend. | Geen |
| **Verwachte beoordelingsdatum** | Datum | Optioneel | Wanneer een besluit wordt verwacht. | Geen |
| **Notities voor de commissie** | Tekst | Optioneel | Vrije notities. | Geen |

#### Venster Commissiegoedkeuring vastleggen
Breadcrumb: Start > Configuratie > Validatiestudies > Studies

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **METC-/ethiek-referentienummer** | Tekst | Verplicht | Zonder dit kan de studie niet worden geactiveerd. | Geen |
| **Goedgekeurd door** | Tekst | Verplicht | De goedkeurende persoon of instantie. | Geen |
| **Goedkeuringsdatum** | Datum | Verplicht | De datum van goedkeuring. | Vandaag |
| **Referentie commissienotulen** | Tekst | Optioneel | Waar de notulen zijn gearchiveerd. | Geen |
| **Voorwaarden verbonden aan goedkeuring** | Tekst | Optioneel | Eventuele voorwaarden. | Geen |

#### Venster ForMedrixAI Store
Breadcrumb: Start > Configuratie > Validatiestudies > Studies

Toont modellen die ForMedrixAI na eigen regressietests heeft gepubliceerd en die uw organisatie niet heeft overgenomen. Elke rij toont het model, de publicatiedatum en het benchmarkcijfer van ForMedrixAI, en een knop **Overnemen**.

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| **Overnemen** | Knop | Niet van toepassing | Voegt het model als Bèta aan uw organisatie toe, nooit als standaard, met nul casus, totdat uw eigen studie het bevestigt. Weigeringen: winkel niet gelicentieerd, geen organisatie, niet in de catalogus, al overgenomen. | Niet van toepassing |

**7. Machtigingen.** `config:validation-studies:manage` dekt aanmaken, bijwerken, ter beoordeling indienen, activeren, sluiten en verwijderen. `validation:approval:record` dekt het vastleggen van de commissiegoedkeuring. Het overnemen van een model vereist `config:ai-model:manage`. Admin en Lab Director hebben de eerste twee standaard. De studiegebeurtenissen worden vastgelegd als `validation_study_created`, `_submitted`, `_approval_recorded`, `_activated`, `_closed` en `_deleted`. Het opslaan van een bewerking logt `validation_study_created`, en bij activering wordt de letterlijke naam `admin` als persoon vastgelegd.

**Bekende beperkingen.** De licentiecontrole van de winkel is een simulatie die altijd slaagt, en autorisatie van het abonnement is openstaand werk (PS-59). De METC-referentie op het studieformulier wordt niet opgeslagen. Het formulier legt geen tweede beoordelaar vast, alleen een commissienaam.

### Validatiestudies: Dashboard {#screen-validation-dashboard}
Breadcrumb: Start > Configuratie > Validatiestudies > Dashboard

**Status:** Gerealiseerd.

**1. Navigatie:** Configuratie, tabblad **Validatiestudies** > subtabblad **Dashboard**
**2. Onderhoudsonderdeel:** Dashboard

**3. Zakelijk doel en reikwijdte.** Een alleen-lezenweergave van hoe een lopende of gesloten studie ervoor staat. Gebruik haar om de acceptatiegraad te volgen voordat de studie sluit.

**4. Voorwaarden en afhankelijkheden.** Het toont gegevens zodra een studie actief is en pathologen casus hebben ondertekend. Zonder actieve studie is de studielijst leeg.

Setup step: Reference, not part of setup
Requires: [Validatiestudies: Studies](#screen-validation-studies)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: validation-dashboard - Validatiedashboard met de studiekeuze en de prestatietabel]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Studiekeuze | Keuze uit actieve of gesloten studies | Verplicht | Kiest de getoonde studie. | De eerste studie |
| Vastgelegde cases | Alleen-lezen geheel getal | Niet van toepassing | Casus met minstens één signaal. | 0 |
| Sectiesignalen | Alleen-lezen geheel getal | Niet van toepassing | Suggesties die bij het ondertekenen zijn vastgelegd. | 0 |
| Acceptatiegraad ten opzichte van streefwaarde | Alleen-lezenpercentage | Niet van toepassing | Vergeleken met de **Streefacceptatiegraad** van de studie. | Niet van toepassing |
| Onveranderd geaccepteerd | Alleen-lezenpercentage | Niet van toepassing | Suggesties die zijn aangehouden zoals geschreven. | Niet van toepassing |
| **Sectie**, **Signalen**, **Acceptatie**, **Gemiddelde bewerkingsratio**, **Meest voorkomende bewerking** | Tabelkolommen | Niet van toepassing | Prestaties per verslagsectie. | Niet van toepassing |
| Adviesmelding | Alleen-lezentekst | Niet van toepassing | Meldt dat de cijfers adviserend zijn. | Niet van toepassing |

**7. Machtigingen.** Het scherm openen: dezelfde tabbladregels als [Validatiestudies (tabblad)](#screen-tab-validation). Niets op de pagina wijzigt gegevens.

**Bekende beperkingen.** Geen bekend.

### Validatiestudies: Rapporten {#screen-validation-reports}
Breadcrumb: Start > Configuratie > Validatiestudies > Rapporten

**Status:** Gerealiseerd.

**1. Navigatie:** Configuratie, tabblad **Validatiestudies** > subtabblad **Rapporten**
**2. Onderhoudsonderdeel:** Rapporten

**3. Zakelijk doel en reikwijdte.** Maakt het afgedrukte rapport dat een gesloten studie beoordeelt. Het oordeel is GESLAAGD wanneer de acceptatiegraad minstens de streefwaarde is en de gemiddelde bewerkingsratio hoogstens het maximum; VOORWAARDELIJK GESLAAGD wanneer de acceptatiegraad minstens 85% van de streefwaarde is; anders NADERE BEOORDELING. **Rapport genereren en afdrukken** opent een afdrukvenster, legt de uitvoer vast in het auditspoor, zet de studie op gerapporteerd en slaat het eindoordeel één keer op. Het oordeel wordt daarna nooit herberekend. Alleen een gerapporteerde studie met oordeel GESLAAGD, waarvan de faciliteit onder de deelnemers valt, laat die faciliteit het model vastzetten als haar AI-overschrijving.

**4. Voorwaarden en afhankelijkheden.** Een rapport vereist een gesloten studie. Sluit u haar niet, dan verschijnt de studie niet in de lijst.

Setup step: Tier 4, step 4
Requires: [Validatiestudies: Studies](#screen-validation-studies)
Unlocks: Geen.

**5. Scherm.**

[SCREENSHOT PLACEHOLDER: validation-reports - Voorbeeld van het validatierapport en Rapport genereren en afdrukken]

**6. Veldreferentie.**

| Veldnaam | Gegevenstype / indeling | Verplicht/Optioneel | Beschrijving en bedrijfslogica | Systeemstandaard |
|---|---|---|---|---|
| Studiekeuze | Keuze uit gesloten of gerapporteerde studies | Verplicht | Kiest de studie om te bekijken. | De eerste studie |
| Rapportvoorbeeld | Alleen-lezen | Niet van toepassing | De cijfers en het oordeel zoals ze worden afgedrukt. | Niet van toepassing |
| **Rapport genereren en afdrukken** | Knop | Niet van toepassing | Drukt af, legt vast als `validation_report_generated`, zet de status op gerapporteerd en slaat het eindoordeel op. | Niet van toepassing |

**7. Machtigingen.** Dezelfde tabbladregels als [Validatiestudies (tabblad)](#screen-tab-validation). Het genereren van het rapport gebruikt `config:validation-studies:manage`.

**Bekende beperkingen.** Het oordeel is definitief zodra het is opgeslagen; een onjuist oordeel kan niet vanuit het scherm opnieuw worden berekend.

