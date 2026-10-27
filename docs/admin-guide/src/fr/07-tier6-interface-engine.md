---
chapter: 7
id: ch7
title: Niveau 6 : moteur d'interface et intégrations de systèmes externes
---

# Niveau 6 : moteur d'interface et intégrations de systèmes externes {#ch7}

Ce chapitre décrit comment PathScribe échange des messages avec d'autres systèmes : le dossier patient informatisé (DPI) de l'hôpital, un système d'information de laboratoire (SIL), les laboratoires de référence, les systèmes de facturation, les registres et les outils de reporting. Il décrit aussi les écrans qu'un administrateur utilise pour surveiller ces échanges et traiter ceux qui échouent.

Lisez le statut de chaque partie avant de planifier un projet qui en dépend. Une grande partie de ce niveau est un contrat qui est rédigé et un côté navigateur qui est réalisé, alors que le serveur et le moteur d'interface situé à l'autre extrémité ne sont pas encore connectés. Lorsqu'un élément n'est pas réalisé, la section indique **Non réalisé** ou **Prévu** et nomme ce qui existe de plus proche.

**La règle de ce chapitre.** PathScribe décide ce qui est envoyé et quand. Le moteur d'interface décide comment : le texte HL7, la connexion, les nouvelles tentatives sur la ligne et le vocabulaire propre à chaque éditeur. PathScribe ne traduit jamais les noms de champs ni les codes d'un éditeur, et il ne prétend pas être un connecteur certifié pour un DPI quel qu'il soit.

## L'ordre de configuration du niveau 6 {#ch7-order}
Breadcrumb: Accueil > Configuration > Système > Intégrations

Le niveau 6 est en grande partie facultatif. Un laboratoire qui utilise PathScribe seul, sans SIL, sans flux vers un registre et sans outil de reporting, peut l'ignorer entièrement. N'effectuez les étapes ci-dessous que pour les intégrations que vous utilisez, dans cet ordre. Chaque étape nomme les écrans qui doivent être configurés d'abord (niveaux 1 à 5), et la même information figure dans l'encadré « Ordre de configuration » de chaque écran.

1. [Correspondance des codes de spécimen](#screen-crosswalk) : faites correspondre les codes de prélèvement propres à chaque établissement expéditeur à votre Dictionnaire des spécimens, afin que les demandes entrantes soient résolues. Nécessite le Dictionnaire des établissements et le Dictionnaire des spécimens.
2. [Dictionnaire d’interface](#screen-interface_dictionary) (personnel ForMedrixAI uniquement) : décrivez les champs propres à un éditeur. Les clients n'effectuent pas cette étape ; elle figure ici pour que la numérotation soit complète.
3. [Réception SIL (mode Assistance)](#screen-assist_lis_polling) : pour un laboratoire dont le SIL est propriétaire du dossier et où PathScribe apporte une assistance avec des brouillons d'IA. Nécessite Comportement de l'IA et la Bibliothèque synoptique.
4. [Flux de rapports (Power BI)](#screen-bi_feed) : permettez à un outil de reporting de lire les données de PathScribe. Nécessite les établissements exécutants du Dictionnaire des établissements.
5. [Correspondances de champs de migration](#screen-migration_field_mappings) : faites correspondre les noms de champs d'un système ancien, avant tout import d'historique.
6. [Tâches de migration de données historiques](#screen-migration-jobs) : importez un fichier d'un système ancien et vérifiez la tâche. Nécessite l'étape 5.

Les écrans de surveillance ([Journaux système : interfaces](#screen-audit-interfaces), [Moteurs d'interface](#screen-interface-engines), [File DLQ d'interface sortante](#screen-outbound-interface-dlq), [Envois sortants](#screen-outbound-dispatches) et la [File d’envoi](#screen-outbound-queue)) et les outils de test ([Aperçu des messages d'interface sortants](#screen-outbound_message_preview), [Boîte d’envoi simulée](#screen-simulated_mail), [Moteur d’interface simulé](#screen-mock-interface-engine) et [DPI simulé](#screen-mock-emr)) ne sont pas des étapes de configuration. Chacun indique `Reference, not part of setup` et énumère ce qui doit exister pour qu'il affiche des données.

## Ce que ce niveau contient et ne contient pas {#ch7-status}
Breadcrumb: Accueil > Configuration > Système > Intégrations

| Partie du plan | Statut | Ce qui existe aujourd'hui |
|---|---|---|
| Architecture du moteur d'interface | Partiel | Le contrat de messages et le côté navigateur sont réalisés. Le moteur (BridgeLink) et les points d'accès serveur dont il a besoin sont Prévu. Voir [Comment le moteur d'interface s'insère](#ch7-architecture). |
| HL7 v2.x sortant (ADT, ORU, ORM) | Partiel | PathScribe envoie un message JSON que le moteur transforme en HL7, sauf trois messages qu'il construit lui-même en texte HL7. Voir [Types de messages](#ch7-hl7-types). |
| HL7 v2.x entrant | Partiel | Les processeurs existent et vous pouvez les tester avec des messages collés. Aucun récepteur ne reçoit encore de message HL7 réel. |
| Point d'accès FHIR R4 et identifiants client OAuth2 | Non réalisé | Aucun point d'accès et aucun écran de configuration. Voir [FHIR R4 et OAuth2](#ch7-fhir). |
| Intégration DPI (Epic, Cerner, MEDITECH, AthenaHealth) | Non réalisé | Aucun connecteur d'éditeur, certifié ou non. Voir [Intégration DPI](#ch7-ehr). |
| Envoi et retour de résultats avec un laboratoire de référence | Partiel | Les manifestes de transmission sont envoyés et une charge utile de résultat est traitée. Aucun point d'accès entrant ne reçoit encore de résultat. Voir [Interfaces avec les laboratoires de référence](#ch7-reflab). |
| Surveillance des interfaces, files d'erreurs et retraitement | Réalisé (côté navigateur) | Les écrans et leurs capacités fonctionnent. Le signal de présence du moteur et les nouvelles tentatives côté moteur sont Prévu. Voir [Surveillance](#ch7-monitoring). |

## Comment le moteur d'interface s'insère {#ch7-architecture}
Breadcrumb: Accueil > Configuration > Système > Intégrations

**Statut :** Partiel

### Le terme « PathScribe Interface Engine » {#ch7-pie-term}
Breadcrumb: Accueil > Configuration > Système > Intégrations

Le plan de ce guide appelle la couche d'interface le PathScribe Interface Engine (PIE). Ce nom n'apparaît ni dans le produit, ni dans ses écrans, ni dans ses documents de conception, et ce guide n'invente pas de nom de produit. Le produit comporte deux éléments qui, ensemble, assurent le travail décrit par le plan :

- **Le côté PathScribe.** Des services de l'application décident quoi envoyer et quand, construisent le message JSON, le mettent en file, enregistrent le résultat et permettent à un administrateur de le renvoyer, de le retenir ou de le libérer. Tout ce que ce chapitre décrit et sur quoi vous pouvez cliquer se trouve de ce côté.
- **Le moteur d'interface.** La conception retient BridgeLink, un fork open source de Mirth Connect, comme moteur. Il transforme le JSON de PathScribe en HL7 (ou en un autre format), tient son propre magasin de messages, envoie au système destinataire et reçoit les réponses. BridgeLink est le nom de travail dans les documents de conception (`INTERFACE_ENGINE_EDGE.md`). Ses modèles de canaux sont Prévu, non réalisés.

### Où le moteur s'exécute {#ch7-hosting}
Breadcrumb: Accueil > Configuration > Système > Intégrations

Le moteur est une seule image de conteneur utilisée à deux endroits, choisis pour chaque hôpital (décision D6). ForMedrixAI peut l'héberger dans la région du locataire, ou il peut être installé sur une machine virtuelle à l'intérieur de l'hôpital. L'écran [Moteurs d'interface](#screen-interface-engines) indique lequel des deux s'applique à chaque moteur (**Hébergé** ou **Sur site**). L'image, ses modèles de canaux et ses points d'accès de santé sont Prévu, avec l'équipe serveur.

Les messages HL7 ne transitent pas par le bus de messages SQL Server (décision D1). Le serveur API remet un message au moteur sous la forme d'une tâche de type `interface.dispatch`, et le moteur conserve le HL7 dans son propre magasin de messages.

### Ce qui fonctionne aujourd'hui et ce qui est Prévu {#ch7-today}
Breadcrumb: Accueil > Configuration > Système > Intégrations

| Élément | Statut | Ce que cela signifie pour vous |
|---|---|---|
| Messages sortants, enveloppe JSON | Réalisé (côté navigateur) | Le navigateur envoie `{queueEntryId, transactionType, dispatchedAt, payload}` à l'adresse indiquée dans le paramètre de build `VITE_INTERFACE_RECEIVER_ENDPOINT`. Dans un build de production, l'adresse doit être en `https` ; une adresse absente ou en HTTP simple est refusée avant tout envoi. Le délai d'attente est de 15 secondes. |
| Ce qui compte comme envoyé | Réalisé (côté navigateur) | Toute réponse 2xx marque le message comme envoyé. Il n'existe pas encore d'accusé de réception HL7 (ACK). Un dépassement de délai, un moteur injoignable et un rejet sont trois erreurs différentes sur les écrans. |
| Version de démonstration | Démonstration | Sans adresse de moteur définie, un moteur simulé reçoit chaque message et le conserve dans une liste. Voir [Moteur d’interface simulé](#screen-mock-interface-engine). |
| Événements entrants des instruments | Réalisé (côté navigateur) | Quatre webhooks existent pour le Cassette Engine : exception de bloc, résultat d'envoi de cassette, emplacement du matériel et état du graveur. Ils utilisent un secret partagé dans l'en-tête `X-API-Key`, avec une signature HMAC facultative. |
| Messages HL7 entrants | Non réalisé | Les processeurs ADT et de gestion des patients existent et sont testés, mais rien ne reçoit de message HL7 réel pour les appeler. |
| Points d'accès serveur pour le moteur (`POST /api/interface/inbound`, `POST /api/interface/outbound-acks`, `POST /api/interface/heartbeat`, `GET /api/interface/engines`) | Prévu | Rédigés sous forme de contrat (phase 2e). Ils ajoutent la remise, les résultats réglés par accusé de réception, les fenêtres de nouvelle tentative, les messages en échec définitif et l'état du moteur. |
| Identifiants de moteur par locataire | Prévu | Identifiants client OAuth2 ou TLS mutuel pour chaque moteur de locataire. Voir [FHIR R4 et OAuth2](#ch7-fhir). |

**Fenêtres de nouvelle tentative prévues.** Le contrat indique que les messages entrants attendent 10 secondes, 30 secondes, 1 minute, 5 minutes, puis 15 minutes, avec un message en échec définitif après 24 heures. Les messages sortants sont renvoyés à 1, 5, 15 et 60 minutes, puis toutes les heures, pendant 24 heures. Les soumissions aux registres sont conservées pendant 72 heures. Un accusé de réception AA est envoyé ; CA est envoyé ou attend l'accusé de réception applicatif ; AR et CE sont retentés dans la fenêtre ; AE et CR échouent immédiatement. Un résultat en échec définitif retient les messages suivants du même dossier. Rien de tout cela ne fonctionne encore. Aujourd'hui, un envoi en échec attend qu'un administrateur le renvoie.

### Paramètres d'interface d'établissement enregistrés mais non utilisés {#ch7-facility-settings}
Breadcrumb: Accueil > Configuration > Système > Intégrations

L'éditeur d'établissement (niveau 1, [Dictionnaire des établissements](#screen-facility-dictionary)) comporte un onglet **Intégration SIL**. Il enregistre une adresse de moteur, une version HL7, un type d'authentification (aucun, basique, OAuth2 ou clé API), un indicateur qui précise si un identifiant a été fourni, si le SIL est propriétaire des statuts de dossier, si PathScribe autorise les actions après validation, ainsi que les identifiants de routage de l'établissement expéditeur et destinataire et un canal sortant de remplacement. Ces paramètres sont enregistrés avec l'établissement. Aucun chemin d'envoi ne les lit aujourd'hui. Un message va à l'unique adresse au niveau du déploiement indiquée plus haut. L'identifiant n'est jamais enregistré : seul un indicateur Oui/Non l'est.

## HL7 v2.x entrant et sortant {#ch7-hl7}
Breadcrumb: Accueil > Configuration > Système > Intégrations

**Statut :** Partiel

### Types de messages {#ch7-hl7-types}
Breadcrumb: Accueil > Configuration > Système > Intégrations

Aucun écran ne permet d'activer ou de désactiver des types de messages. Les types ci-dessous sont fixés par le produit. Cette partie énumère uniquement ce que le code prend en charge. Tout ce qui n'est pas listé n'est pas pris en charge.

**Sortant.** PathScribe met en file ces types de transaction. Le moteur construit le HL7 pour tous, sauf les trois marqués « PathScribe construit le HL7 ».

| Type de transaction | Ce qu'il transporte | Forme HL7 |
|---|---|---|
| `A08` | Mise à jour des données démographiques du patient | Le moteur construit ADT^A08. Le sexe est envoyé sous la forme M, F, U ou A pour indéterminé dans PID-8 (le code A est une hypothèse en attente de confirmation par les systèmes destinataires). Pour les sites du Royaume-Uni, le code NHS est M pour 1, F pour 2, I pour 9, U pour X. |
| `A40` | Fusion de patients | Le moteur construit ADT^A40 |
| `A47` | Changement d'identifiant du patient | Le moteur construit ADT^A47 |
| `ORU_R01` | Résultat de pathologie final, modifié ou corrigé | Le moteur construit ORU^R01. Pour la pathologie électronique américaine (niveau 7), PathScribe construit lui-même un ORU^R01 v2.5.1. |
| `LIS_SYNC` | Données du dossier et résultat synoptique d'un dossier en mode Assistance, pour le SIL | Le moteur le construit |
| `ORDER_CREATED` | Une nouvelle demande | Le moteur la construit |
| `ACCESSION_EVENT` | Une demande accessionnée, ou une anomalie d'accession | Le moteur le construit |
| `REGISTRY_REPORT`, `CANCER_REGISTRY_REPORT` | Soumissions aux registres (niveau 7) | Le moteur les construit. Les accusés de réception reviennent. |
| `REPORT_DELIVERY` | Un PDF de compte rendu signé pour télécopie électronique ou dépôt de fichier | Le moteur ou le service de remise |
| `PRINT_JOB` | Un PDF de compte rendu que le moteur doit imprimer | Le moteur |
| `REFERRAL_MANIFEST` | Le manifeste d'un lot de transmission pour un laboratoire de référence | Le moteur le construit. Les résultats reviennent. |
| `MOLECULAR_ORDER` | Une demande d'analyse moléculaire ou une demande d'instrument | Le moteur la construit |
| `WSI_SCAN_MANIFEST` | Les lames chargées dans un lot de numérisation de lames entières | Le moteur le construit. L'état de numérisation des lames revient. |
| `BLOCK_ORDER` | Les demandes de coloration d'un bloc pour un instrument d'inclusion ou de coloration | PathScribe construit le HL7 : ORM^O01 |
| `SLIDE_ORDER`, `SPECIMEN_LABEL` | Une demande de lame ; une étiquette de contenant de prélèvement | Le moteur le construit |
| `MATERIAL_SCAN_EVENT` | Un scan de code-barres d'une cassette ou d'une lame | Le moteur le construit |
| `CHARGE_DFT` | Un acte facturable pour le système de facturation | PathScribe construit le HL7 : DFT^P03 |
| `CHARGE_JSON` | Un acte facturable sous forme de webhook de facturation JSON | JSON, pas de HL7 |
| `FINANCIAL_CLASS` | Charge utile de classe financière pour un moteur de facturation | Une charge utile d'aperçu tant que les formats n'existent pas |
| `CRITICAL_ALERT` | Canaux d'alerte critique après la mise en service | Non raccordé. Rien ne le produit aujourd'hui. |

Le « ORM » du plan est donc l'ORM^O01 que PathScribe construit pour les demandes de bloc envoyées à un instrument. PathScribe ne construit lui-même aucun ORM pour un DPI ou un SIL. Le moteur décide du HL7 en lequel un message de demande créée se transforme, et il n'existe aucun écran pour ajouter un type de message.

**Entrant.** Ces processeurs existent dans l'application. Aucun n'est connecté à un récepteur réel, sauf les webhooks d'instruments ci-dessus. Vous pouvez leur faire traiter un message collé avec le [Moteur d’interface simulé](#screen-mock-interface-engine) dans la version de démonstration.

| Famille | Messages | Statut |
|---|---|---|
| Admission, sortie et transfert (`adtParser.ts`) | A01, A03, A04, A08, A02, A09, A10, A05, A06, A07, A11, A12, A13, A31 | Processeur réalisé ; aucun récepteur |
| Gestion des patients (`patientManagementParser.ts`) | A40 fusion, A24 rattachement, A47 changement d'identifiant, A43 déplacement | Processeur réalisé ; aucun récepteur. Un message qui ne peut pas être rapproché est mis en file comme exception d'interface, jamais deviné. |
| Changements de séjour (`processVisitMessage.ts`) | A45, A50, A34 | Processeur réalisé ; aucun récepteur |
| Statut des demandes du SIL (l'adaptateur du mode Assistance) | ORU^R01, ORM^O01, OML^O21 | Statut uniquement. Vous pouvez en coller un dans [Réception SIL (mode Assistance)](#screen-assist_lis_polling). |
| Événements JSON | Résultat HPV, exception de bloc, emplacement du matériel, résultat de transmission, résultats d'une série moléculaire, état de numérisation de lames entières | Processeurs réalisés ; les webhooks d'instruments sont la seule voie en service |

**Les demandes entrantes ne sont pas analysées à partir de HL7.** Le service de réception des demandes prend une demande structurée, non un message ORM ; une demande HL7 réelle provenant d'un DPI n'est donc pas acceptée aujourd'hui. La [Correspondance des codes de spécimen](#screen-crosswalk) résout les codes d'une demande dès que celle-ci atteint le service.

**Adaptateurs d'éditeurs.** Les adaptateurs pour Cerebro et Vantage sont volontairement des coquilles vides qui ne font rien.

### Correspondance des codes de spécimen {#screen-crosswalk}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Types de commandes et règles entrantes

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Types de commandes et règles entrantes (le nom du menu). Le titre à l'écran est **Correspondance des codes de spécimen**.

**3. Objectif métier et périmètre.** Un système expéditeur utilise ses propres codes pour les prélèvements, et un même code peut avoir des sens différents selon le système expéditeur. Cet écran fait correspondre le code de chaque établissement expéditeur à une entrée du Dictionnaire des spécimens. Chaque demande entrante est vérifiée par rapport à ce tableau. Lorsqu'aucune entrée ne correspond, PathScribe ne bloque pas la demande. Il crée une entrée marquée **Auto-appris — en attente de révision**, crée une entrée en attente dans le Dictionnaire des spécimens afin que la demande puisse suivre son cours, et met en file une exception d'interface de type `unmapped_order_code` qu'une personne doit résoudre. Vous révisez ici les entrées auto-apprises, ou vous ajoutez une entrée réelle à l'avance pour qu'un code connu n'ait jamais à être appris.

**4. Prérequis et dépendances.** La liste **Établissement** est le Dictionnaire des établissements et la liste **Correspond à** est le Dictionnaire des spécimens ; les deux sont donc configurés d'abord. Si vous les ignorez, les listes sont vides et une correspondance ne peut pas être enregistrée, car l'établissement, le code externe et le type de spécimen sont tous obligatoires.

Setup step: Tier 6, step 1
Requires: [Dictionnaire des établissements](#screen-facility-dictionary), [Dictionnaire des spécimens](#screen-specimens)
Unlocks: [Journaux système : interfaces](#screen-audit-interfaces)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-crosswalk - Liste de la Correspondance des codes de spécimen avec les boutons Ajouter un mappage, Importer une feuille de calcul et Exporter]

**6. Référence des champs.**

La liste.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Établissement | Texte (lecture seule) | Sans objet | L'établissement expéditeur dont provient le code. | Sans objet |
| Code externe | Texte (lecture seule) | Sans objet | Le code de prélèvement propre au système expéditeur. | Sans objet |
| Correspond à | Texte (lecture seule) | Sans objet | L'entrée du Dictionnaire des spécimens à laquelle le code correspond. | Sans objet |
| Source | **Confirmé par l'administrateur** ou **Auto-appris — en attente de révision** | Sans objet | Les entrées **Auto-appris** ont été créées par le système lorsqu'aucune entrée ne correspondait. Une bannière de décompte au-dessus de la liste indique combien sont en attente de révision. | Sans objet |
| Bannière En attente de révision | Nombre et lien | Sans objet | Affichée lorsque des exceptions de code de demande non mappé sont en attente. Le lien **Voir les codes non mappés dans la file d'audit** ouvre Journaux système, Interfaces, filtré sur `unmapped_order_code`. | Masquée lorsque le nombre est 0 |
| Ajouter un mappage | Bouton | Sans objet | Ouvre le panneau Ajouter une correspondance. | Sans objet |
| Importer une feuille de calcul | Bouton, fichier CSV | Sans objet | Lit un fichier CSV avec les colonnes Facility, ExternalCode et ResolvesTo et affiche un aperçu avant que quoi que ce soit soit enregistré. | Sans objet |
| Exporter | Bouton | Sans objet | Télécharge `SpecimenCodeCrosswalk.csv` avec les colonnes Facility, ExternalCode, ResolvesTo et Source. L'export est consigné dans le journal d'audit. | Sans objet |

Le panneau Ajouter une correspondance.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Établissement | Liste de choix issue du [Dictionnaire des établissements](#screen-facility-dictionary) | Obligatoire | L'établissement expéditeur. Le même code est autorisé dans deux établissements différents. | Vide |
| Code externe | Texte | Obligatoire | Le code exactement tel que l'expéditeur l'utilise. La recherche de correspondance ignore les majuscules et les minuscules. L'exemple affiché est `TISSUE-01`. | Vide |
| Site (facultatif) | Liste de choix de sites, ou **Tous les sites** | Facultatif | Limite la correspondance à un site. Une nouvelle correspondance enregistrée sans site s'applique à tous les sites. | Tous les sites |
| Correspond au type de spécimen | Liste de choix avec recherche issue du [Dictionnaire des spécimens](#screen-specimens), qui recherche dans les noms et les synonymes | Obligatoire | L'entrée en laquelle devient une demande portant ce code. | Vide |
| Enregistrer la correspondance | Bouton | Sans objet | Refusé avec un message si le même établissement, le même code et le même site correspondent déjà à une entrée (« Facility already maps external code to entry »). | Sans objet |

L'aperçu de la feuille de calcul.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Ligne de synthèse | Texte | Sans objet | Les lignes prêtes, combien mettent à jour une correspondance existante, combien sont nouvelles et combien sont ignorées à cause d'erreurs. | Sans objet |
| Erreurs de ligne | Liste de textes | Sans objet | Un nom d'établissement qui ne correspond à aucun établissement, un code externe vide, ou un nom de spécimen qui ne correspond à aucune entrée du Dictionnaire des spécimens. Les noms sont comparés par nom, sans tenir compte de la casse. Une ligne en erreur est ignorée, jamais devinée. | Sans objet |
| Appliquer l'importation | Bouton | Sans objet | Enregistre chaque ligne sans erreur. Une ligne dont l'établissement et le code existent déjà met à jour le type de spécimen de cette correspondance. Les lignes importées n'ont pas de site. | Désactivé lorsque toutes les lignes sont en erreur |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Ajouter, importer et mettre à jour des correspondances : `config:crosswalk:manage` (risque élevé). Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut ; le Superadmin détient toutes les capacités (sauf `config:ai-prompt:approve`, retirée pour la séparation des tâches (le Directeur de laboratoire approuve les instructions de l'IA ; le support de ForMedrixAI ne le fait jamais)). Sans elle, l'écran est en lecture seule. Résoudre une exception de code non mappé depuis la fenêtre de révision crée la même entrée.

**Limites connues.** Le nom du menu (**Types de commandes et règles entrantes**) diffère du titre à l'écran (**Correspondance des codes de spécimen**) ; les deux désignent le même écran. La liste n'offre ni modification ni suppression, seulement l'ajout et la mise à jour par feuille de calcul. Aucun récepteur ne reçoit encore de demande HL7 réelle ; les entrées sont donc utilisées lorsqu'une demande atteint le service de réception des demandes, et non à partir d'un message sur la ligne.
### Réception SIL (mode Assistance) {#screen-assist_lis_polling}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Réception SIL (mode Assistance)

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Réception SIL (mode Assistance)

**3. Objectif métier et périmètre.** En mode Assistance, le SIL externe est propriétaire du dossier. Ses mises à jour parviennent à PathScribe de trois façons, par interrogation, par un message HL7 v2 ou par un webhook JSON, et toutes passent par une seule file d'attente intermédiaire. Lorsque le SIL signale Macroscopie terminée, l'IA choisit les modèles synoptiques et rédige les champs qu'elle peut à partir du texte de macroscopie. Lorsque le SIL signale Microscopie/Diagnostic terminé, elle rédige le reste à partir du diagnostic. Cet écran contient les paramètres, une zone de test pour les messages collés, la file d'attente intermédiaire et le journal des exécutions.

**Ce qui est réalisé et ce qui ne l'est pas.** Réalisés : les paramètres, la correspondance des statuts, la zone de test, la file d'attente intermédiaire avec ses nouvelles tentatives, le journal des exécutions et les règles de rédaction de l'IA. Simulés dans la version de démonstration : le calendrier (l'application interroge à l'intervalle enregistré tant qu'elle est ouverte et que l'interrogation est activée, et l'écran affiche une note **Planification simulée** avec la dernière et la prochaine exécution) et le SIL que **Interroger maintenant** interroge. Non réalisés : un récepteur réel pour les messages HL7 ou webhook, et un champ pour l'adresse du SIL à interroger. L'écran n'a pas de tel champ.

**4. Prérequis et dépendances.** L'étape d'IA utilise les commutateurs de Comportement de l’IA et les modèles synoptiques. Si **IA désactivée dans Comportement de l'IA** s'applique, une mise à jour ne modifie que le texte du dossier et aucun brouillon n'est produit. Seul un dossier en mode Assistance est traité ; un dossier qui n'est pas en mode Assistance est ignoré avec le résultat **Pas un dossier en mode Assistance**.

Setup step: Tier 6, step 3
Requires: [Comportement de l’IA](#screen-tab-ai), [Bibliothèque synoptique](#screen-tab-protocols)
Unlocks: [Journaux système : interfaces](#screen-audit-interfaces)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-assist_lis_polling - Réception SIL (mode Assistance) avec l'interrogation, la correspondance des statuts, la zone de test, la file d'attente intermédiaire et l'activité]

**6. Référence des champs.**

Interrogation et correspondance des statuts.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Interroger le SIL selon un calendrier | Commutateur Oui/Non. Le libellé indique **Interrogation planifiée activée** ou **Interrogation planifiée désactivée**. | Facultatif | Active l'interrogation planifiée. Sur le serveur de production, le calendrier s'exécute sur le serveur PathScribe. **Interroger maintenant** fonctionne que ce paramètre soit activé ou non. | Désactivé |
| Interroger toutes les (minutes) | Nombre entier de 1 à 1440 | Obligatoire | L'intervalle entre deux interrogations planifiées. Une valeur hors de la plage ou une fraction est refusée avec « The interval must be a whole number of minutes from 1 to 1440. » | 5 |
| Statut SIL (chaque ligne) | Texte | Obligatoire | L'un des termes de statut propres à votre SIL, par exemple `GROSSED`. La comparaison ignore les espaces aux extrémités et les majuscules/minuscules. Un statut vide est refusé. Le même statut ne peut pas figurer deux fois. | Quatre lignes, ci-dessous |
| Étape (chaque ligne) | Choix entre **Macroscopie terminée** ou **Microscopie/Diagnostic terminé** | Obligatoire | Ce que le statut signifie. Macroscopie terminée déclenche un brouillon au stade de la macroscopie. Microscopie/Diagnostic terminé déclenche un brouillon complet. Un statut absent de la liste ne déclenche rien. | Macroscopie terminée sur une nouvelle ligne |
| Supprimer | Bouton | Sans objet | Supprime la ligne. Sans aucune ligne, l'écran indique « No LIS statuses mapped. Nothing will trigger an AI draft. » | Sans objet |
| + Ajouter un statut | Bouton | Sans objet | Ajoute une ligne vide. | Sans objet |
| Annuler les modifications, Enregistrer | Boutons | Sans objet | Les deux restent désactivés tant que rien n'a changé. Quitter l'écran avec des modifications non enregistrées demande d'abord une confirmation. | Sans objet |

Les quatre lignes par défaut sont `GROSS_COMPLETE` et `GROSSED` (Macroscopie terminée), et `MICRO_COMPLETE` et `DX_COMPLETE` (Microscopie/Diagnostic terminé).

Tester un message entrant.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Format du message | Choix entre **Message HL7 v2** ou **Webhook JSON** | Obligatoire | Quel adaptateur lit le texte collé. | Message HL7 v2 |
| Charger l'exemple | Bouton | Sans objet | Remplit la zone avec un exemple pour le format choisi. | Sans objet |
| Message entrant | Texte libre | Obligatoire | Le message tel que le SIL l'enverrait. Il passe par le même adaptateur et la même file d'attente intermédiaire qu'un message réel et il est traité immédiatement. Un message illisible affiche un motif, par exemple « This isn't an HL7 v2 message (it must start with an MSH segment). » | Vide |
| Envoyer vers la file d'attente | Bouton | Sans objet | Affiche « Staged: n, Handled now: n » ou le motif. | Sans objet |

Ce que lisent les adaptateurs. Un message HL7 doit être un ORU^R01, un ORM^O01 ou un OML^O21 ; tout autre type est refusé. Une mise à jour est créée par segment OBR. Le numéro d'accession est OBR-3, sinon OBR-2, sinon ORC-3. Le statut est ORC-5, sinon OBR-25. L'heure est OBR-22, sinon MSH-7, et une heure sans décalage est lue comme UTC ; demandez donc au SIL d'envoyer un décalage. Le texte provient de OBX-5 selon le code LOINC de OBX-3 : `22634-0` macroscopie, `22635-7` microscopie et `22637-3` diagnostic final. Un corps JSON est un objet ou une liste, avec `accession`, `status` et `updatedAt` (ISO 8601) obligatoires, et `grossText`, `microscopicText`, `diagnosisText`, `placerOrderNumber` et `fillerOrderNumber` facultatifs. Les numéros de demande sont repris dans le résultat synoptique.

File d'attente intermédiaire.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Ligne de décomptes | Texte | Sans objet | Les décomptes En attente, Échec et Traité. | Sans objet |
| Relancer les échecs | Bouton | Sans objet | Relance chaque entrée en échec qui a fait moins de 5 tentatives. Désactivé lorsqu'aucune n'a échoué. | Sans objet |
| Reçu, Source, N° d'accession, Statut SIL, État, Résultat, Tentatives | Colonnes en lecture seule | Sans objet | La source est **Interrogation**, **Message HL7 v2** ou **Webhook JSON**. L'état est **En attente**, **Échec** ou **Traité**. Le résultat est l'issue ou l'erreur. Le numéro d'accession est balisé comme donnée patient pour le masquage. La liste affiche les 25 lignes les plus récentes. Une entrée n'est plus retentée après 5 tentatives. Les 200 événements traités les plus récents sont conservés. | Sans objet |

Activité.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Interroger maintenant | Bouton | Sans objet | Interroge immédiatement le SIL pour obtenir les changements. | Sans objet |
| Ligne du curseur | Texte | Sans objet | « Changes up to (time) have been handled » ou « The LIS hasn't been polled yet. » | Sans objet |
| Tableau des exécutions | Colonnes en lecture seule : Heure, Déclencheur, Depuis le SIL, Nouveaux en file, Brouillons IA, Texte seul, Ignorés, Échecs | Sans objet | Le déclencheur est **Interroger maintenant**, **Calendrier**, **Message entrant** ou **Relance**. Le journal conserve les 20 dernières exécutions. | Sans objet |
| Dernière interrogation | Colonnes en lecture seule : N° d'accession, Statut SIL, Étape, Résultat, Détails | Sans objet | Une ligne par dossier dans l'exécution la plus récente. Un résultat est l'un des suivants : Brouillon IA préparé ; Aucun changement depuis le dernier brouillon ; Dossier absent de PathScribe ; Déjà signé ; Échec (nouvelle tentative prévue) ; Statut non associé ; Pas un dossier en mode Assistance ; Texte mis à jour, IA désactivée dans Comportement de l'IA ; Texte mis à jour, brouillon déjà terminé. Les détails donnent les nouveaux brouillons, les champs suggérés et les changements de modèle à réviser. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Enregistrer les paramètres : `config:assist-polling:manage` (risque élevé). Interroger maintenant, message de test et Relancer les échecs : `assist:lis-message:ingest` (risque élevé, audité) ; l'interrogation planifiée relève du système et n'est pas contrôlée. Les rôles Administrateur et Directeur de laboratoire détiennent les deux par défaut.

**Limites connues.** La source d'interrogation et le calendrier sont simulés dans la version de démonstration, et aucun récepteur ne reçoit de message HL7 ou webhook d'un SIL réel. L'adaptateur HL7 lit le statut dans ORC-5, puis OBR-25, et le code source décrit cela comme un paramètre propre à chaque site, mais l'écran n'a aucun contrôle pour cela. Un dossier signé n'est jamais modifié. Une macroscopie tardive ou modifiée après le brouillon complet ne met à jour que le texte.

### Aperçu des messages d'interface sortants {#screen-outbound_message_preview}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Aperçu des messages d'interface sortants

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Aperçu des messages d'interface sortants

**3. Objectif métier et périmètre.** Un outil de vérification. Il construit le message JSON que PathScribe mettrait en file pour le moteur d'interface, pour un patient ou un dossier réel, l'affiche et vous permet de le télécharger sous forme de fichier. Utilisez-le pour donner à un analyste d'interface un exemple réel sur lequel s'appuyer, ou pour vérifier ce que le moteur recevra avant la construction d'un canal. Il n'envoie rien et ne met rien en file. Il prévisualise quatre types de messages seulement : ADT^A08, ADT^A40, ADT^A47 et ORU^R01.

**4. Prérequis et dépendances.** Rien n'est à configurer d'abord. Il faut un dossier patient existant (pour les types ADT) ou un dossier avec un compte rendu synoptique finalisé (pour le résultat). Sans cela, l'écran indique que le patient est introuvable ou que le constructeur de charge utile n'a rien renvoyé.

Setup step: Reference, not part of setup
Requires: Aucun, c'est un point de départ.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-outbound_message_preview - Sélecteur du type de message, champs d'identifiant et sortie JSON]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Type de message | Choix entre ADT^A08 Demographic Update, ADT^A40 Merge Patient, ADT^A47 Change Identifier, ORU^R01 Pathology Result | Obligatoire | Détermine les champs qui apparaissent ci-dessous. Le modifier efface la sortie. | ADT^A08 |
| ID du patient (A08) | Texte, un identifiant de dossier patient | Obligatoire pour A08 | Le patient dont la mise à jour démographique est construite. Balisé comme donnée patient. | Vide |
| ID du patient antérieur (fusionné) (A40) | Texte | Obligatoire pour A40 | Le dossier qui a été absorbé par la fusion. | Vide |
| ID du patient survivant (A40) | Texte | Obligatoire pour A40 | Le dossier qui subsiste. | Vide |
| ID du patient temporaire/hors ligne (A47) | Texte | Obligatoire pour A47 | Le dossier temporaire dont l'identifiant est corrigé. | Vide |
| ID du patient confirmé (A47) | Texte | Obligatoire pour A47 | Le dossier confirmé. | Vide |
| Code de motif (A47) | Texte | Obligatoire pour A47 | Pourquoi l'identifiant change. | Vide |
| Notes (A47) | Texte | Obligatoire pour A47 | Une note en texte libre. | Vide |
| ID du cas (ORU^R01) | Texte | Obligatoire pour ORU | Le dossier. Balisé comme numéro d'accession. | Vide |
| ID de l'instance synoptique (ORU^R01) | Texte | Obligatoire pour ORU | Un compte rendu synoptique finalisé de ce dossier. | Vide |
| État du résultat (ORU^R01) | Choix entre **Final**, **Corrigé**, **Addenda** | Obligatoire pour ORU | L'état du résultat prévisualisé. | Final |
| Aperçu du paquet | Bouton | Sans objet | Construit et affiche le JSON. Désactivé tant que les champs obligatoires du type choisi ne sont pas remplis. | Sans objet |
| Download JSON | Bouton | Sans objet | Enregistre le message affiché sous `<type>_<time>.json`. Le téléchargement est consigné dans le journal d'audit. | Sans objet |

Deux avertissements apparaissent à l'écran et sont exacts. Pour A40 et A47, les nombres de dossiers et de séjours réorientés s'affichent à 0, car l'aperçu n'effectue pas la fusion. Pour ORU^R01, le PDF du compte rendu et le texte narratif du compte rendu s'affichent comme absents, car ils nécessitent la chaîne de génération des comptes rendus dont cet écran ne dispose pas. Tous les autres champs ont la forme que le moteur recevrait. L'aperçu ORU nécessite aussi que le dossier soit en mode de compte rendu orchestrateur, et un PDF manquant est signalé par « The report PDF isn't available for this result ».

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Construire un aperçu et le télécharger : `config:interface-preview:view` (risque élevé). Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut.

**Limites connues.** Le sous-titre de l'écran indique « PathScribe never builds or sends HL7 itself ». Ce n'est pas tout à fait exact : PathScribe construit du HL7 pour les demandes de bloc (ORM^O01), les actes facturables (DFT^P03) et les résultats de pathologie électronique américains. Cet écran prévisualise uniquement le JSON. Les quatre types sont les seuls qu'il peut prévisualiser ; les autres types de transaction de [Types de messages](#ch7-hl7-types) ne peuvent pas être prévisualisés ici. Le message envoyé peut être consulté après coup dans [Envois sortants](#screen-outbound-dispatches) pour les événements de création de demande.

### [FORMEDRIXAI INTERNAL ONLY] Dictionnaire d’interface {#screen-interface_dictionary}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Dictionnaire d’interface

> 🔒 **Paramètre restreint interne ForMedrixAI**
> **Périmètre :** personnel interne de service et de déploiement uniquement.
> **Explication :** Un profil d'éditeur décide quels champs du message HL7, JSON ou FHIR propre à un éditeur sont copiés sur un dossier en tant que champs d'extension. Un profil erroné, ou modifié sans test, placerait une mauvaise valeur sur un dossier ou en omettrait une obligatoire, et le dossier est un document médical. Seul le personnel ForMedrixAI construit et publie les profils, de sorte que chacun est testé avec un échantillon réel et versionné. Les trois capacités qui le protègent sont réservées à la plateforme, détenues par le rôle Superadmin et non attribuables par un hôpital. La section n'est visible pour personne qui ne les détient pas.

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Dictionnaire d’interface

**3. Objectif métier et périmètre.** Le Dictionnaire d’interface contient les profils d'éditeurs. Un profil indique, pour un éditeur ou un appareil et un type de message, où se trouve chaque champ de l'éditeur dans le message et en quel champ d'extension (`ext.name`) du dossier il devient, avec une conversion facultative, une valeur par défaut, une traduction de codes et un indicateur d'obligation. Un profil suit un cycle de vie fixe : brouillon, test, publication, puis éventuellement retour en arrière ou désactivation. Le même moteur de correspondance est destiné à lire les messages réels, de sorte qu'un profil puisse ajouter des champs d'éditeur sans nouvelle version du code.

**Réalisé et non réalisé.** Réalisés : la création de profils, la modification des correspondances, le test avec un message d'exemple, la publication, le retour en arrière, la désactivation et le garde-fou de périmètre. Simulé : le panneau **Appliquer à un dossier**, qui applique un message collé à un dossier afin que le panneau Champs fournisseur puisse être consulté. Une bannière indique « Nothing is received from a vendor in this build. » Aucun profil d'éditeur n'est préchargé, la liste est donc vide au départ. Un profil ne peut remplir qu'un champ d'extension. Tout le reste nécessite une nouvelle version du code (voir le tableau de périmètre ci-dessous).

**4. Prérequis et dépendances.** Aucun dans ce guide. Un message d'exemple de l'éditeur est nécessaire pour tester.

Setup step: Tier 6, step 2
Requires: Aucun, c'est un point de départ.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-interface_dictionary - Liste des profils d'éditeurs, éditeur de correspondances, panneau de test et versions]

**6. Référence des champs.**

Nouveau profil d'éditeur.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Fournisseur ou appareil | Texte | Obligatoire | Le nom de l'éditeur. Un nom déjà utilisé est refusé. | Vide |
| Format du message | Choix entre **HL7 v2**, **JSON**, **FHIR** | Obligatoire | Détermine la syntaxe de l'emplacement dans chaque correspondance. | HL7 v2 |
| Type de message | Texte. Exemples affichés : `ORU^R01` (HL7), `Observation` (FHIR), facultatif pour JSON | Obligatoire pour HL7 et FHIR | Un profil HL7 nécessite un type tel que `ORU^R01`. Un profil FHIR nécessite un type de ressource tel que `Observation`. Un message d'un autre type est refusé. | Vide |
| Créer le profil | Bouton | Sans objet | Crée le profil sans version en service. | Sans objet |

Une correspondance (une ligne chacune dans la copie de travail, intitulée **Mapping n**).

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Emplacement dans le message | Texte, sous la forme utilisée par le format : `ZAB-3` ou `OBX[2]-5.1` (HL7), `result.lotNumber` (JSON), `Observation.component[0].valueString` (FHIR) | Obligatoire | L'emplacement de la valeur. Un emplacement qui n'est pas écrit sous la forme du format est refusé. Un emplacement qui se termine sur un groupe et non sur une valeur échoue au test. Une pastille **Segment fournisseur (Z)** s'affiche lorsqu'un emplacement HL7 se trouve dans un segment Z. | Vide |
| Champ d’extension | Texte : `ext.` puis un nom qui commence par une lettre minuscule, composé uniquement de lettres et de chiffres, jusqu'à 40 caractères | Obligatoire | Le champ du dossier qui reçoit la valeur. Une partie de la structure propre du dossier est refusée (« needs a code release »). Deux correspondances ne peuvent pas remplir le même champ. | `ext.` |
| Nom affiché sur le dossier | Texte | Obligatoire | Le libellé qu'un utilisateur voit dans le panneau Champs fournisseur. | Vide |
| Type | Choix entre Texte, Nombre, Date, Date et heure, Oui / non, Code | Obligatoire | La valeur est vérifiée par rapport au type lors du test. | Texte |
| Conversion | Choix entre Aucune, Supprimer les espaces, Minuscules, Majuscules, Date HL7 vers ISO, Date et heure HL7 vers ISO | Facultatif | Les conversions de date nécessitent le type Date ou Date et heure. | Aucune |
| Valeur par défaut si absente | Texte | Facultatif | Utilisée lorsque le message n'a pas de valeur. Elle doit convenir au type. | Vide |
| Traduction des codes | Texte : `vendor value = shown value`, séparées par des virgules. Exemple `F=Female, M=Male` | Facultatif | Chaque entrée a besoin des deux côtés. Une valeur sans traduction affiche **no translation for this value** dans le test. | Vide |
| Obligatoire (le test échoue sans elle) | Case à cocher Oui/Non | Facultatif | Un message sans valeur pour une correspondance obligatoire échoue au test. | Désactivé |
| Ajouter une correspondance, Supprimer, Enregistrer les correspondances | Boutons | Sans objet | Les modifications s'appliquent uniquement à la copie de travail. Enregistrez avant de tester ou de publier. | Sans objet |

Test, publication et versions.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Message d’exemple | Texte libre (balisé comme donnée patient) | Obligatoire pour tester | Un échantillon fourni par l'éditeur. Il n'est pas enregistré ; seuls les décomptes sont conservés. | Vide |
| Lancer le test | Bouton | Sans objet | Affiche, pour chaque correspondance, le champ d'extension, la valeur et le résultat : **Associé**, **Valeur par défaut utilisée**, **Absent du message**, **Valeur obligatoire manquante** ou **Problem**. Le résumé indique « Mapped n, required missing n, problems n. » | Sans objet |
| Publier | Bouton | Sans objet | Nécessite une copie de travail enregistrée avec au moins une correspondance, aucun problème de correspondance et un test réussi plus récent que la dernière modification. La version en service devient la version précédente. | Sans objet |
| Tableau des versions | Lecture seule : Version, Statut, Quand, Par | Sans objet | Le statut est **Brouillon**, **Testé**, **En service**, **Remplacé** ou **Désactivé**. | Sans objet |
| Commencer un nouveau brouillon | Bouton | Sans objet | Copie la version en service dans une nouvelle copie de travail. Une seule copie de travail peut être ouverte par éditeur. | Sans objet |
| Revenir en arrière | Bouton | Sans objet | Publie la version antérieure comme une nouvelle version. | Sans objet |
| Désactiver | Bouton | Sans objet | Retire le profil afin qu'aucune version ne soit en service. | Sans objet |
| Dossier (Appliquer à un dossier) | Texte, un identifiant de dossier (numéro d'accession) | Obligatoire | Le dossier qui reçoit les champs du message collé, lu avec la version en service. Démonstration uniquement, libellé **Simulé**. | Vide |

Le tableau de périmètre affiché à l'écran énumère ce que la correspondance peut traiter (les codes de l'éditeur, les formats de date et d'heure, les noms affichés sur le dossier, les éléments JSON ou FHIR supplémentaires, les valeurs obligatoires et par défaut, les tests et le versionnement, les segments Z HL7 propres à un éditeur) et ce qui nécessite une nouvelle version du code (identité du patient, détails de la demande et de l'accession, prélèvements, blocs et lames, contenu du diagnostic et du compte rendu, validation et modification, règles de facturation et d'actes facturables, règles de flux de travail et d'acheminement, et un nouveau type de message).

**7. Autorisations.** Les trois sont réservées à la plateforme : `platform:interface-dictionary:manage` (créer, modifier, tester, désactiver, revenir en arrière), `platform:interface-dictionary:publish` (publier ; nécessite manage) et `platform:interface-dictionary:simulate` (appliquer à un dossier dans la version de démonstration ; nécessite manage). Seul le rôle Superadmin les détient. Un hôpital ne peut pas les accorder à ses propres rôles. Sans manage, la section est masquée. Une modification refusée indique « Only ForMedrixAI staff can change vendor profiles. »

**Limites connues.** Aucun profil d'éditeur n'est préchargé et aucun message réel n'est encore lu au moyen d'un profil. L'en-tête de section dans le code appelle cela un Message Mapper ; il n'existe pas de nom de menu de ce type.
## Point d'accès FHIR R4 et identifiants client OAuth2 {#ch7-fhir}
Breadcrumb: Accueil > Configuration > Système > Intégrations

**Statut :** Non réalisé

PathScribe n'a aucun point d'accès FHIR R4. Il ne publie pas de serveur FHIR, n'accepte aucune ressource FHIR d'un autre système et n'a aucun écran pour configurer une adresse de base FHIR, un identifiant client, un secret client ou une adresse de jeton. Il n'existe pas non plus d'écran de configuration des identifiants client OAuth2. Ne planifiez pas une mise en service qui dépend de l'un ou de l'autre.

Ce qui existe de plus proche, afin que vous sachiez de quoi une question peut porter :

| Quoi | De quoi il s'agit | Statut |
|---|---|---|
| Service de dossiers pour une source FHIR (`FHIRCaseService.ts`) | Une ébauche de code pour lire des dossiers depuis un serveur FHIR. L'adresse de base est un espace réservé et la fonction qui obtient un jeton d'accès déclenche une erreur. Elle n'est raccordée à aucun écran ni paramètre. | Non réalisé |
| FHIR comme format de message dans le [Dictionnaire d’interface](#screen-interface_dictionary) | Un profil d'éditeur peut être rédigé pour une ressource FHIR telle que `Observation`, et le test lit un échantillon collé. Rien ne reçoit de message FHIR d'un éditeur. | Partiel, ForMedrixAI uniquement |
| Type d'authentification dans l'éditeur d'établissement | L'onglet **Intégration SIL** permet de choisir `OAuth2` comme type d'authentification pour la connexion du moteur d'un établissement. C'est un choix enregistré. Aucun code ne le lit. | Enregistré uniquement |
| Identifiants client OAuth2, ou TLS mutuel, pour le moteur de chaque locataire | Le contrat qui décrit comment le moteur s'authentifie auprès de l'API PathScribe (`INTERFACE_ENGINE_EDGE.md`). | Prévu |
| Connexion du personnel par OpenID Connect (OIDC) | Authentification unique pour les personnes, et non pour les messages de système à système. Traité au niveau 1. | Réalisé (côté navigateur) |
| Jetons du [Flux de rapports (Power BI)](#screen-bi_feed) | Des jetons porteurs que PathScribe émet, affiche une seule fois et ne conserve que sous forme d'empreinte. Ce ne sont pas des jetons OAuth2. | Partiel |

La page [DPI simulé](#screen-mock-emr) contient la remarque « Production uses FHIR R4 API to sync with LIS ». Rien dans le code ne soutient cette phrase. Considérez-la comme une intention de conception.

## Intégration DPI : Epic, Cerner, MEDITECH et AthenaHealth {#ch7-ehr}
Breadcrumb: Accueil > Configuration > Système > Intégrations

**Statut :** Non réalisé

PathScribe n'a de connecteur pour aucun DPI, certifié ou non. Il ne figure dans la place de marché d'aucun éditeur et n'a passé la validation d'aucun éditeur selon les éléments de preuve de ce guide. Tout ce qu'un DPI envoie ou reçoit passe par le moteur d'interface, que l'équipe d'interface de l'hôpital configure, et PathScribe ne voit que les messages décrits dans [Types de messages](#ch7-hl7-types). Ne présentez pas PathScribe à un client comme « certifié Epic », « certifié Cerner » ou similaire.

| DPI | Ce qui existe dans PathScribe | Ce qui n'existe pas |
|---|---|---|
| Epic | Un préréglage de format d'identifiant nommé **Epic Beaker** (numéro d'accession et motif de code-barres 2D de lame). Défini dans l'onglet Formats d'identifiants de l'éditeur d'établissement, niveau 1. | Un connecteur, un profil de message propre à Epic, une certification, un enregistrement d'application FHIR. |
| Cerner | Un préréglage de format d'identifiant nommé **Cerner PathNet**. | Idem. |
| MEDITECH | Un préréglage de format d'identifiant nommé **MEDITECH**. | Idem. |
| AthenaHealth | Rien. Le nom n'apparaît ni dans le code, ni dans les écrans, ni dans les documents de conception. | Tout. |

La même liste de préréglages contient aussi Generic, CoPath, Sunquest et Custom. Un préréglage décide seulement quels motifs d'accession et de code-barres la zone de saisie par scan reconnaît. Il n'échange de message avec rien.

**À quoi ressemble aujourd'hui une intégration DPI.** Un DPI ne peut atteindre PathScribe que par le moteur, sous la forme des messages sortants de [Types de messages](#ch7-hl7-types) (résultats, mises à jour de patients, événements de demandes, événements d'accession) et de processeurs entrants qui ne sont pas encore connectés à un récepteur réel. Le [Dictionnaire d’interface](#screen-interface_dictionary) ne contient aucun profil d'éditeur préchargé pour un DPI. La [Correspondance des codes de spécimen](#screen-crosswalk) fait correspondre les codes de prélèvement d'un DPI dès qu'une demande atteint le service de réception des demandes. Le DPI conserve l'autorité sur l'identité du patient : un message A40, A24, A47 ou A43 qui ne peut pas être rapproché est mis en file comme exception d'interface pour une personne, jamais deviné. Voir [Journaux système : interfaces](#screen-audit-interfaces).

### DPI simulé {#screen-mock-emr}
Breadcrumb: Accueil > DPI simulé

**Statut :** Démonstration

**1. Navigation :** une fenêtre ouverte depuis un dossier dans la version de démonstration, à l'adresse `/mock-emr?case=<reference>`. Elle n'est construite que lorsque les outils de démonstration sont activés (`__DEMO_TOOLS__`) ; un build qui communique avec un serveur API ne l'inclut pas.
**2. Élément de maintenance :** DPI simulé

**3. Objectif métier et périmètre.** Un substitut à la vue patient d'un DPI, afin qu'une démonstration puisse montrer la fenêtre compagnon du DPI à côté d'un dossier. Il recherche le patient du dossier par numéro de dossier médical dans les dossiers de démonstration et affiche un résumé clinique fixe. Il ne lit aucun DPI réel et porte la mention **DÉMO : DONNÉES SYNTHÉTIQUES**. Si le numéro de dossier ne correspond à aucun patient, il indique **Aucun patient trouvé** plutôt que d'afficher un mauvais patient.

**4. Prérequis et dépendances.** Aucun. Il faut un dossier avec un patient dans les données de démonstration.

Setup step: Reference, not part of setup
Requires: Aucun, c'est un point de départ.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-mock-emr - Vue patient du DPI simulé avec le badge de démonstration]

**6. Référence des champs.** Une page en lecture seule. Rien ne peut y être modifié.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom du patient, MRN, date de naissance, sexe | Texte (lecture seule, balisé comme donnée patient) | Sans objet | Issus du dossier de démonstration rapproché. La date de naissance indique « non renseignée » lorsqu'elle est absente. Un badge NHS s'affiche lorsqu'un numéro NHS est vérifié. | Sans objet |
| Séjour, Statut, Service | Texte (lecture seule) | Sans objet | Valeurs de démonstration fixes (Admis, service 4B Urologie). | Fixe |
| Résumé clinique : Problèmes actifs, Médicaments | Texte (lecture seule) | Sans objet | Texte de démonstration fixe, non issu du patient. | Fixe |
| Remarque d'intégration | Texte (lecture seule) | Sans objet | La phrase sur FHIR R4. Voir la remarque sous [FHIR R4 et OAuth2](#ch7-fhir). | Fixe |

**7. Autorisations.** Il n'y a aucune capacité et la route n'a pas de garde d'écran. La page n'existe que dans une version de démonstration.

**Limites connues.** Données synthétiques uniquement, et le résumé clinique est identique pour tous les patients. Ce n'est pas une intégration.

## Interfaces avec les laboratoires de référence {#ch7-reflab}
Breadcrumb: Accueil > Configuration > Système > Intégrations

**Statut :** Partiel

Un laboratoire de référence est un établissement auquel vous envoyez des prélèvements pour des analyses sous-traitées, par exemple en biologie moléculaire ou en immunohistochimie. PathScribe prend en charge l'envoi avec un manifeste et le retour avec un message de résultat. Le côté sortant est réalisé ; le côté entrant a un processeur mais pas de point d'accès.

Il n'existe pas d'écran appelé « interface de laboratoire de référence ». La configuration est répartie sur des écrans que vous avez déjà :

1. **Faites du laboratoire un établissement.** Dans le [Dictionnaire des établissements](#screen-facility-dictionary), ajoutez le laboratoire et attribuez-lui le rôle **Laboratoire de référence (destination d'envoi sortant)**. Ce rôle le rend sélectionnable comme destination d'un lot de transmission. Seul un établissement actif doté du rôle est proposé.
2. **Associez-le aux analyses qu'il réalise.** Dans le [Catalogue diagnostique](#screen-stains), une analyse **Moléculaire** énumère les laboratoires de référence autorisés à la réaliser et indique lequel est le laboratoire par défaut. Le laboratoire par défaut doit être l'un des laboratoires autorisés. Le lien n'est conservé que pour la catégorie Moléculaire, et une demande complémentaire pour cette analyse renseigne le laboratoire par défaut et ne propose que les laboratoires autorisés.
3. **Envoyez.** Les lots de transmission sont créés dans [Gestion des lots](#screen-batch-management) avec le nœud de traitement **Envoi externe** et un établissement de destination. Lorsque le lot termine le rapprochement, PathScribe met en file un message `REFERRAL_MANIFEST` et crée automatiquement l'enregistrement de suivi. Un échec à ce stade ne bloque jamais l'achèvement du lot lui-même. Le manifeste contient l'identifiant du lot, le code-barres maître, l'établissement de destination, l'analyse demandée, la priorité (**STAT** ou **Routine**), les éléments (identifiant d'affichage, type de matériel, numéro d'accession du dossier et étiquette du prélèvement) et les éventuelles demandes d'analyse moléculaire envoyées en sous-traitance. PathScribe décide quoi et quand ; le moteur décide du transport.
4. **Surveillez l'envoi.** Le message apparaît dans la [File d’envoi](#screen-outbound-queue) sous le flux **Envois externes**, et dans la [File DLQ d'interface sortante](#screen-outbound-interface-dlq) sous la file **Bordereau d’envoi**, où un message en échec est renvoyé.
5. **Recevez le retour.** Un message de résultat (`ReferralResultEventPayload`) contient l'identifiant du lot et soit un résultat **discrete** (texte), soit une pièce jointe **pdf_attachment** (un lien vers un PDF), jamais les deux, et éventuellement les résultats de chaque demande d'analyse moléculaire envoyée en sous-traitance. Le processeur vérifie la forme, trouve le lot, enregistre le résultat et marque le lot **result_received**, puis applique les résultats codés aux demandes d'analyse moléculaire. Le statut d'un lot ne progresse que dans un sens : envoyé, en transit, livré, résultat reçu. Une personne peut définir manuellement en transit et livré ; résultat reçu n'est défini que lorsqu'un résultat arrive.

**Ce qui n'est pas réalisé.** Aucun point d'accès ne reçoit de message de résultat ; aucun résultat n'arrive donc de lui-même d'un laboratoire de référence. Le processeur ne mémorise les identifiants des messages qu'il a traités qu'en mémoire vive, de sorte qu'un redémarrage les oublie. Il renvoie l'une de quatre réponses : appliqué, déjà appliqué, suivi introuvable ou charge utile invalide. Il n'existe aucun échantillon de test pour un résultat de transmission dans le [Moteur d’interface simulé](#screen-mock-interface-engine). Le vocabulaire propre à un laboratoire de référence (ses noms d'analyses et ses codes de résultat) n'est pas traduit par PathScribe ; c'est le moteur qui en est responsable.

## Surveillance des interfaces, files d'erreurs et retraitement {#ch7-monitoring}
Breadcrumb: Accueil > Qualité et conformité

**Statut :** Réalisé (côté navigateur)

Tout ce dont un administrateur a besoin pour voir ce qui a échoué, et pour le renvoyer, le retenir ou le libérer, se trouve sur les écrans de cette partie. Ils fonctionnent aujourd'hui avec les données de démonstration et avec les services du serveur API. Ce que le moteur apporte lorsqu'il est connecté (un signal de présence, des résultats réglés par accusé de réception et des fenêtres de nouvelle tentative automatiques) est Prévu. Voir [Ce qui fonctionne aujourd'hui et ce qui est Prévu](#ch7-today).

### Règles de retraitement en un coup d'œil {#ch7-reprocessing}
Breadcrumb: Accueil > Qualité et conformité

Un message en échec n'est jamais écarté, et rien n'est renvoyé aujourd'hui sans qu'une personne appuie sur un bouton. Les règles ci-dessous sont celles que le code applique.

| Situation | Où elle apparaît | Ce que vous pouvez faire | Capacité |
|---|---|---|---|
| Un message patient entrant n'a pas pu être rapproché (A40, A24, A47, A43) | [Journaux système : interfaces](#screen-audit-interfaces), Exceptions d'interface | L'examiner, associer les patients manuellement ou transférer des dossiers, ou le rejeter. Le message n'est jamais deviné. | Aucune dédiée. Voir les limites connues à cet endroit. |
| Un code de demande entrant ne correspond à aucune entrée du Dictionnaire des spécimens | Exceptions d'interface, type `unmapped_order_code` | **Associer et lier** crée l'entrée de la [Correspondance des codes de spécimen](#screen-crosswalk), ou rejeter. | `config:crosswalk:manage` pour l'entrée |
| Un message sortant n'a pas pu être envoyé | [File DLQ d'interface sortante](#screen-outbound-interface-dlq), et la [File d’envoi](#screen-outbound-queue) sous **Échec** | **Réessayer l'envoi** ou **Envoyer maintenant** l'envoie de nouveau au moteur. | `interface:outbound:resend` |
| Un message ne doit pas encore partir | File d’envoi, **En attente** ou **Échec** | **Suspendre** avec un motif, puis **Libérer**. Un message retenu n'est envoyé par aucune autre action : la nouvelle tentative indique « Held on the Outbound Queue screen: release it there first. » | `interface:outbound:hold`, `interface:outbound:release` |
| Un message a échoué après ses nouvelles tentatives automatiques | File d’envoi, **Abandonné après échecs** | **Réessayer**, ou **Annuler la charge** pour un élément de facturation. | `interface:outbound:resend`, `interface:outbound:retract` |
| Un registre a rejeté une soumission | File d’envoi, **Rejeté** | **Réessayer** (soumettre de nouveau) avec un motif, ou **Marquer non déclarable** avec un motif. | `interface:outbound:resend`, `interface:outbound:mark-not-reportable` |
| Un acte facturable doit partir plus tôt ou être annulé | File d’envoi, éléments de facturation | **Libérer maintenant** ou **Annuler la charge**. | `interface:outbound:override-release`, `interface:outbound:retract` |
| Une impression, une télécopie ou un dépôt de fichier de compte rendu a échoué après ses nouvelles tentatives | Exceptions de remise, en haut de la File DLQ d'interface sortante | Renvoyer depuis sa propre file (la File d'impression, ou la remise des comptes rendus). Il disparaît de la liste lorsqu'il passe. | `interface:outbound:resend` pour la remise des comptes rendus |
| Un acte facturable en file a échoué | Le sous-onglet DLQ sortante de Journaux système, Financier (niveau 7) | Voir [Journaux système : financier](#screen-audit-financial). | Voir cet écran |

**Les rôles intégrés.** Le rôle Administrateur détient toutes les capacités `interface:outbound:*`, `interface:engine-status:view` et `jobs:server-job:view`. Le Directeur de laboratoire n'en détient aucune et n'a pas l'écran File d’envoi. Le Réviseur AQ ouvre uniquement l'écran du journal d'audit et les exports. Le Superadmin détient toutes les capacités (sauf `config:ai-prompt:approve`, retirée pour la séparation des tâches (le Directeur de laboratoire approuve les instructions de l'IA ; le support de ForMedrixAI ne le fait jamais)). Il n'existe pas de rôle intégré d'analyste d'interface : un hôpital en crée un et lui accorde les capacités qu'il souhaite (le fichier de valeurs initiales le dit).

**Ce que fait un renvoi.** Un renvoi reconstruit le message à partir de l'enregistrement et l'envoie. Si l'enregistrement auquel il se rapporte n'existe plus, rien n'est envoyé et l'écran indique « Not sent: the message couldn't be built ». Un résultat sans PDF de compte rendu est retenu, non envoyé, et part avec le PDF lors d'une nouvelle tentative ultérieure. Chaque action qui modifie un message est consignée dans le journal d'audit, une entrée par message, et le texte d'audit ne contient jamais de nom de patient. La nouvelle tentative au niveau de la ligne (le moteur qui retente une connexion) relève du moteur, et non de PathScribe.

### Journaux système : interfaces {#screen-audit-interfaces}
Breadcrumb: Accueil > Qualité et conformité > Journaux système > Journal des interfaces

**Statut :** Réalisé

**1. Navigation :** Accueil > **Qualité et conformité** > **Journaux système** > onglet **Journal des interfaces** (le nom de l'onglet à l'écran), à l'adresse `/audit?tab=interfaces`.
**2. Élément de maintenance :** Journaux système : interfaces

**3. Objectif métier et périmètre.** L'endroit unique pour voir ce qui s'est mal passé à la frontière avec les autres systèmes. Il comporte cinq sous-onglets : **Exceptions d'interface** (messages entrants qui n'ont pas pu être traités), **File DLQ d'interface sortante** (messages sortants en échec ou en attente), **Envois sortants** (la trace des événements de création de demande), **File d'impression** et **Moteurs** (état des moteurs d'interface, affiché uniquement avec `interface:engine-status:view`). Une ligne au-dessus des sous-onglets résume les moteurs et ouvre **Moteurs** en un clic. L'onglet affiche un badge avec le nombre d'exceptions en attente.

Ce chapitre décrit ici les Exceptions d'interface et les quatre autres sous-onglets sur leurs propres écrans : [File DLQ d'interface sortante](#screen-outbound-interface-dlq), [Envois sortants](#screen-outbound-dispatches) et [Moteurs d'interface](#screen-interface-engines). Le sous-onglet File d'impression n'est pas décrit dans ce guide ; voir les questions ouvertes.

**4. Prérequis et dépendances.** Rien n'est configuré ici. La liste se remplit lorsqu'une exception d'interface est levée. Les exceptions de code de demande non mappé apparaissent lorsque la [Correspondance des codes de spécimen](#screen-crosswalk) n'a aucune entrée pour un code.

Setup step: Reference, not part of setup
Requires: [Correspondance des codes de spécimen](#screen-crosswalk)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-audit-interfaces - Onglet Journal des interfaces avec le sous-onglet Exceptions d'interface, pastilles de statut et recherche]

**6. Référence des champs.**

Sous-onglet Exceptions d'interface.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Pastilles de statut | Choix entre **Tout**, **En attente**, **Résolue**, **Rejetée**, chacune avec un nombre | Facultatif | Filtre la liste. | Tout |
| Recherche | Texte, exemple affiché « Rechercher type d'événement, motif… » | Facultatif | Recherche dans le type d'événement et le motif. Le lien de la Correspondance des codes de spécimen ouvre cet onglet avec une recherche sur `unmapped_order_code`. | Vide |
| Exporter en CSV | Bouton | Sans objet | Télécharge la liste filtrée. Aucun nom de patient, numéro de dossier médical ni date de naissance n'est inclus. Audité. | Sans objet |
| Associer un patient | Bouton, affiché lorsque l'utilisateur appartient à une organisation | Sans objet | Ouvre l'outil d'accès d'urgence pour réassocier l'identité d'un patient en mode dégradé. Une action rare et restreinte. | Sans objet |
| Horodatage | Date et heure (lecture seule) | Sans objet | Quand l'exception a été levée. | Sans objet |
| Type d'événement | Badge de texte (lecture seule), par exemple `A40`, `A24`, `A47`, `A43`, `unmapped_order_code` | Sans objet | Le type de message. Une pastille de référence support figure à côté. | Sans objet |
| Motif | Texte (lecture seule, balisé comme donnée patient) | Sans objet | Le motif exact pour lequel le message n'a pas pu être traité, par exemple « MRG-5 does not match any known Encounter. » | Sans objet |
| Patient source, Patient cible | Texte (lecture seule, balisé comme numéro de dossier médical) | Sans objet | Les identifiants extraits avant l'échec. Un tiret lorsqu'aucun n'a pu être lu. | Sans objet |
| Statut | Bouton **Examiner** tant que l'exception est en attente ; badge **Résolue** ou **Rejetée** ensuite | Sans objet | **Examiner** ouvre la fenêtre ci-dessous. | En attente |
| Pied de liste | « Affichage de n sur n exceptions d'interface » | Sans objet | Les nombres affichés et totaux. | Sans objet |

#### Fenêtre Examiner l'exception d'interface
Breadcrumb: Accueil > Qualité et conformité > Journaux système > Journal des interfaces > Examiner l'exception d'interface

Ce que la fenêtre propose dépend du type d'événement. Rejeter est disponible pour tous les types.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Patient source, Patient cible | Texte (lecture seule) | Sans objet | Les deux patients nommés par le message. « Patient identity could not be resolved » apparaît avec l'identifiant brut lorsque le rapprochement a échoué. | Sans objet |
| Dossiers actifs du patient source (A43 uniquement) | Liste de cases à cocher de dossiers avec prélèvement, établissement et statut | Facultatif | Choisissez quels dossiers, le cas échéant, sont transférés au patient cible. | Aucun sélectionné |
| Transférer les dossiers sélectionnés (A43 uniquement) | Bouton | Sans objet | Transfère chaque dossier sélectionné et enregistre l'exception comme résolue avec une note indiquant combien ont été transférés et les éventuels échecs. Désactivé tant qu'un dossier n'est pas sélectionné et que les deux patients ne sont pas connus. | Sans objet |
| Recherche et listes de choix de patients (A40, A24, A47) | Zone de recherche et liste de choix, une pour chaque côté. A47 n'a que le côté source, « Patient dont l'identifiant est corrigé ». A40 affiche « Patient précédent (fusionné) » et « Patient conservé ». A24 affiche « Premier dossier patient » et « Second dossier patient ». | Obligatoire | Choisissez le ou les dossiers que le message visait. « Nothing is guessed. » | Vide |
| Appliquer (A40, A24, A47) | Bouton, « Appliquer A40 » et ainsi de suite | Sans objet | Applique manuellement le message aux patients que vous avez choisis. | Sans objet |
| Code de commande brut, Normalisé, Système de codage (`unmapped_order_code`) | Texte (lecture seule) | Sans objet | Ce qui est arrivé et comment cela a été normalisé. | Sans objet |
| Associer à une entrée du dictionnaire des spécimens (`unmapped_order_code`) | Liste de choix avec recherche | Obligatoire pour associer | L'entrée en laquelle ce code doit être résolu. | Vide |
| Associer et lier (`unmapped_order_code`) | Bouton | Sans objet | Crée directement l'entrée de la [Correspondance des codes de spécimen](#screen-crosswalk), de sorte que les demandes ultérieures portant exactement ce code soient résolues et ne répètent pas l'exception. Une exception levée avant que le suivi des établissements existe ne peut pas être associée ici ; ajoutez l'entrée dans la Correspondance des codes de spécimen, puis rejetez. | Sans objet |
| Rejeter — Aucune action requise | Bouton | Sans objet | Clôt l'exception sans changement. Utilisez-le une fois l'identité correcte confirmée en amont, par exemple par un renvoi corrigé du DPI. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:audit-log:open`. Exporter la liste : `audit:interface-log:export` (risque élevé). Associer un patient : `patient:break-glass:rebind` (risque élevé ; le rôle Administrateur la détient par défaut). Les rôles Administrateur, Directeur de laboratoire et Réviseur AQ ouvrent par défaut l'écran du journal d'audit. Voir [Règles de retraitement en un coup d'œil](#ch7-reprocessing) pour les autres sous-onglets.

**Limites connues.** Résoudre, rejeter et associer une exception d'interface n'a pas de capacité propre : toute personne qui peut ouvrir l'écran peut le faire. L'exception issue d'un message HL7 entrant ne peut apparaître que lorsque le message est traité, et aucun récepteur réel n'existe encore ; dans la version de démonstration, les exceptions proviennent donc du simulateur [Moteur d’interface simulé](#screen-mock-interface-engine). L'examen d'un type d'événement autre que les cinq ci-dessus ne propose que Rejeter.
### Moteurs d'interface {#screen-interface-engines}
Breadcrumb: Accueil > Qualité et conformité > Journaux système > Journal des interfaces > Moteurs

**Statut :** Partiel

**1. Navigation :** Journaux système, onglet **Journal des interfaces**, sous-onglet **Moteurs**. Le sous-onglet n'apparaît que pour les personnes disposant de `interface:engine-status:view`.
**2. Élément de maintenance :** Moteurs d'interface (le titre à l'écran)

**3. Objectif métier et périmètre.** Une liste unique des moteurs d'interface de chaque hôpital, qui indique si leurs récepteurs sont actifs, ce qui est en attente et ce qui a échoué. Elle s'actualise chaque minute et comporte un bouton **Actualiser**. Elle est en lecture seule : les canaux sont démarrés et arrêtés sur le moteur lui-même, et les messages sortants en échec sont renvoyés depuis la [File DLQ d'interface sortante](#screen-outbound-interface-dlq) (le bouton **Ouvrir Sortant** y mène).

**Ce qui est réalisé et ce qui est Prévu.** L'écran et les règles d'état sont réalisés. Les données proviennent du signal de présence du moteur, que le moteur envoie toutes les 60 secondes à un point d'accès Prévu (`POST /api/interface/heartbeat` ; la liste est `GET /api/interface/engines`). D'ici là, la version de démonstration affiche quatre moteurs d'exemple, un pour chaque statut, avec un badge **Simulé**, et indique « There is no interface engine in the demo. » Lorsqu'aucun moteur n'est enregistré, la liste indique « No interface engine has been registered yet. »

**4. Prérequis et dépendances.** Rien n'est configuré ici. Un moteur doit être installé et enregistré par ForMedrixAI ; cela est Prévu.

Setup step: Reference, not part of setup
Requires: Aucun, c'est un point de départ.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-interface-engines - Moteurs d'interface avec statut, canaux, messages en file et messages en échec définitif]

**6. Référence des champs.** Une page en lecture seule.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Ligne de synthèse | Texte, « Interface engines: ... » | Sans objet | Décomptes : en ligne, dégradés, hors ligne, à vérifier, récepteurs arrêtés, messages en attente. | Sans objet |
| Statut | **En ligne**, **Dégradé**, **Hors ligne**, **À vérifier** (lecture seule) | Sans objet | Hors ligne : aucun signal de présence depuis 180 secondes, selon l'horloge du serveur. Dégradé : PathScribe est inaccessible depuis le moteur, le certificat expire dans moins de 14 jours, l'espace disque libre est inférieur à 15 pour cent, un canal est en erreur, en pause ou arrêté, ou un message attend depuis plus de 15 minutes. À vérifier : sinon en bon état, mais un canal contient des messages en échec définitif. En ligne : aucune de ces situations. | Sans objet |
| Hébergement | **Hébergé** ou **Sur site** | Sans objet | L'endroit où le moteur s'exécute (décision D6). | Sans objet |
| Version, Dernière connexion | Texte | Sans objet | La version du moteur, et « Jamais connecté » lorsqu'il n'y en a pas. | Sans objet |
| Joint PathScribe | Texte | Sans objet | **Joint PathScribe**, ou « Can't reach PathScribe: storing messages to forward ». | Sans objet |
| Espace disque libre, Expiration du certificat | Pourcentage, date | Sans objet | Les deux données de santé ci-dessus. | Sans objet |
| Canal | Texte | Sans objet | Le canal du moteur. | Sans objet |
| Sens | **Entrant (écouteur)** ou **Sortant** | Sans objet | | Sans objet |
| État | **Démarré**, **En pause**, **Arrêté**, **Erreur** | Sans objet | Une ligne de problème du canal l'explique : Waiting more than n minutes ; Dead letters to resolve ; In error ; Paused, queue kept ; Stopped. | Sans objet |
| En attente, Plus ancien en attente, Messages en échec définitif | Nombre, minutes, nombre | Sans objet | Profondeur de la file, ancienneté du plus ancien message en attente et nombre de messages en échec définitif. | Sans objet |
| Totaux | Texte | Sans objet | Messages en attente, messages en échec définitif et récepteurs arrêtés, tous moteurs confondus. | Sans objet |
| Actualiser, Ouvrir Sortant | Boutons | Sans objet | | Sans objet |

**7. Autorisations.** `interface:engine-status:view` (risque standard ; nécessite `screen:audit-log:open`). Le rôle Administrateur la détient par défaut ; un hôpital peut l'accorder à ses analystes d'interface. Une personne qui ne la détient pas ne voit pas le sous-onglet, et une lecture refusée indique « You don't have permission to see the interface engines. »

**Limites connues.** Aucun moteur ne transmet encore de données ; la liste réelle est donc vide tant que le point d'accès du signal de présence et l'image du moteur n'existent pas (Prévu, phase 2e). Les seuils de santé sont fixés dans le code et ne sont pas paramétrables.

### File DLQ d'interface sortante {#screen-outbound-interface-dlq}
Breadcrumb: Accueil > Qualité et conformité > Journaux système > Journal des interfaces > File DLQ d'interface sortante

**Statut :** Réalisé

**1. Navigation :** Journaux système, onglet **Journal des interfaces**, sous-onglet **File DLQ d'interface sortante**.
**2. Élément de maintenance :** File DLQ d'interface sortante

**3. Objectif métier et périmètre.** Une file des messages en échec définitif (DLQ) est la liste des messages qui n'ont pas pu être envoyés. Cet écran affiche les messages d'interface sortants en échec et en attente, une file à la fois, et vous permet de les renvoyer. **Envoyer maintenant** et **Réessayer** envoient le message au moteur d'interface. Les boutons **Simuler** sont une aide au test et n'envoient jamais rien. Un acte facturable en échec figure dans la DLQ financière distincte ([Journaux système : financier](#screen-audit-financial)). Le panneau des exceptions de remise (ci-dessous) se trouve en haut.

**4. Prérequis et dépendances.** Rien n'est configuré ici. Un message apparaît après l'échec d'un envoi sortant. Si `VITE_INTERFACE_RECEIVER_ENDPOINT` n'est pas défini, le moteur de démonstration accepte ou rejette selon son mode de réponse (voir [Moteur d’interface simulé](#screen-mock-interface-engine)).

Setup step: Reference, not part of setup
Requires: Aucun, c'est un point de départ.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-outbound-interface-dlq - File DLQ d'interface sortante avec le sélecteur de file, les lignes en échec et les exceptions de remise]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| File | Choix entre huit files : Résultat de pathologie (ORU^R01) ; Résultat de cytologie (ORU^R01) ; ADT patient (A08/A40/A47) ; Synchronisation LIS en mode assisté ; Événements d’enregistrement (enregistré / non-conformité) ; Diffusion des comptes rendus (télécopie, dépôt de fichier) ; Bordereau d’envoi ; Demande moléculaire / instrument | Obligatoire | Sélectionne la file. Les deux premières colonnes d'identifiant et de type changent en conséquence (par exemple Dossier et État du résultat ; Patient source et Type d'événement ; Code-barres du lot et Priorité ; Prélèvement ou code-barres et Analyse ; Numéro d'accession et Canal et compte rendu). Changer de file efface les messages de résultat. | Résultat de pathologie |
| En échec : identifiant, type | Texte (lecture seule, balisé comme donnée patient) | Sans objet | L'enregistrement et son type. | Sans objet |
| En échec : Erreur | Texte (lecture seule) | Sans objet | L'une des valeurs **Envoi rejeté**, **Délai d'envoi dépassé**, **Moteur inaccessible** ou **Inconnu**, avec le message en dessous. | Sans objet |
| En échec : Tentatives | Nombre | Sans objet | Combien de fois il a été renvoyé. « (max exceeded) » s'affiche lorsque l'entrée porte cet indicateur. L'envoi propre au navigateur ne définit jamais cet indicateur aujourd'hui. | Sans objet |
| En échec : Réessayer l'envoi | Bouton | Sans objet | Renvoie. La réponse s'affiche à côté : « Sent and accepted by the interface engine » ; « Not sent: the reason is in the Error column » ; « Held: the report PDF isn't available yet » ; « Not sent: the message couldn't be built » ; « That message is no longer in the queue » ; « Held on the Outbound Queue screen: release it there first » ; ou « You don't have permission to resend interface messages. » | Sans objet |
| En échec : Capturer comme CAPA | Bouton | Sans objet | Enregistre l'échec comme un élément d'action corrective et préventive (CAPA). La ligne affiche ensuite **Captured**. | Sans objet |
| En file : identifiant, type, Mis en file le | Lecture seule | Sans objet | Les messages en attente de départ. | Sans objet |
| En file : Envoyer maintenant | Bouton | Sans objet | Envoie le message maintenant. | Sans objet |
| En file : Simuler un rejet, Simuler un dépassement de délai, Simuler une indisponibilité | Boutons | Sans objet | Fabriquent un échec de ce type pour les tests. Ils ne reflètent jamais un envoi réel. | Sans objet |
| Exceptions de remise (n) | Liste en lecture seule : Dossier, Canal, Tentatives, Dernière erreur, Solution de repli, Abandon | Sans objet | Impressions, télécopies et dépôts de fichiers qui ont encore échoué après leurs nouvelles tentatives automatiques. Les canaux de repli d'une règle s'affichent sous la forme « Sent by ... ». Les rôles Administrateur et Directeur de laboratoire reçoivent un message lorsqu'une exception est ajoutée. Une remise qui aboutit lors d'un renvoi quitte la liste au balayage suivant. « No delivery exceptions. » lorsque la liste est vide. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:audit-log:open`. Envoyer maintenant, Réessayer l'envoi et les boutons Simuler : `interface:outbound:resend` (risque élevé, audité). Le rôle Administrateur la détient par défaut. Un hôpital peut l'accorder à son propre rôle d'analyste d'interface. Capturer comme CAPA n'a pas de capacité propre.

**Limites connues.** Le sous-titre indique « sept files » mais l'écran en propose huit. Il n'y a pas de nouvelle tentative automatique dans le navigateur : un message en échec attend une personne. Les fenêtres de nouvelle tentative prévues figurent dans [Ce qui fonctionne aujourd'hui et ce qui est Prévu](#ch7-today).

### Envois sortants {#screen-outbound-dispatches}
Breadcrumb: Accueil > Qualité et conformité > Journaux système > Journal des interfaces > Envois sortants

**Statut :** Réalisé

**1. Navigation :** Journaux système, onglet **Journal des interfaces**, sous-onglet **Envois sortants**.
**2. Élément de maintenance :** Envois sortants

**3. Objectif métier et périmètre.** La trace de chaque événement de création de demande que PathScribe a envoyé au moteur d'interface (catégorie E), avec son résultat. C'est un enregistrement, non une file d'échecs. Les envois en échec de résultats et de mises à jour de patients figurent dans la [File DLQ d'interface sortante](#screen-outbound-interface-dlq). Ouvrez une ligne pour voir le JSON exact qui a été envoyé. PathScribe envoie du JSON ; le moteur construit le message HL7 à partir de celui-ci.

**4. Prérequis et dépendances.** Rien n'est configuré ici. Des lignes apparaissent lorsqu'un message de demande créée est envoyé.

Setup step: Reference, not part of setup
Requires: Aucun, c'est un point de départ.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-outbound-dispatches - Tableau des envois sortants et volet du contenu]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtre de statut | Choix entre **Tous**, **Livré**, **Échec**, **Résultat inconnu** | Facultatif | Filtre le tableau. Résultat inconnu signifie que le message a été enregistré mais qu'aucun résultat n'est revenu. | Tous |
| Recherche | Texte, « Search message ID or accession... » | Facultatif | Recherche dans l'identifiant du message et le numéro d'accession. | Vide |
| Horodatage | Date et heure (lecture seule) | Sans objet | Quand il a été envoyé. | Sans objet |
| ID du message | Texte (lecture seule) | Sans objet | L'identifiant du message. | Sans objet |
| Accession | Texte (lecture seule, balisé comme donnée patient) | Sans objet | Le dossier. | Sans objet |
| Catégorie | Texte, **E : demande** | Sans objet | La catégorie de la transaction. | Sans objet |
| Type de message | Texte (lecture seule) | Sans objet | Le type de transaction. | Sans objet |
| Établissement demandeur | Texte (lecture seule) | Sans objet | L'établissement dont provient la demande. | Sans objet |
| Statut | **Livré**, **Échec**, **Résultat inconnu**, avec « n tentatives » | Sans objet | Le résultat. | Sans objet |
| Volet du contenu sortant | JSON en lecture seule avec **Copier le contenu** | Sans objet | Le JSON exact envoyé, et l'erreur en cas d'échec. Copier le place dans le presse-papiers. | Sans objet |
| Pied de liste | « Showing n of n outbound dispatches » | Sans objet | | Sans objet |

**7. Autorisations.** Ouvrir : `screen:audit-log:open`. Il n'y a aucune capacité sur le tableau ni sur le bouton de copie. Les rôles Administrateur, Directeur de laboratoire et Réviseur AQ ouvrent par défaut l'écran du journal d'audit.

**Limites connues.** Seuls les événements de création de demande figurent dans cette trace. Les autres types de transaction se trouvent dans la DLQ tant qu'ils échouent et dans la [File d’envoi](#screen-outbound-queue).

### File d’envoi {#screen-outbound-queue}
Breadcrumb: Accueil > Qualité et conformité > File d’envoi

**Statut :** Réalisé

**1. Navigation :** Accueil > **Qualité et conformité** > **File d’envoi**, à l'adresse `/outbound-queue`.
**2. Élément de maintenance :** File d’envoi

**3. Objectif métier et périmètre.** Tous les messages sortants au même endroit : suspendez, libérez ou relancez-les, et corrigez ce qu'un registre a rejeté. Elle rassemble dix flux (Résultats, ADT patient, Enregistrement, Synchro LIS, Facturation, Remise des rapports, Résultats de cytologie, Envois externes, Commandes moléculaires, Registre) et affiche pour chaque message sa destination (Moteur d’interface, Système de facturation, Partenaire LIS, Service de remise ou Registre), le transport que le moteur utilise (REST + mTLS, SFTP, Portal upload, PHIN-MS, Direct TCP ou HTTPS API, qui ne s'affichent que dans le libellé de la destination) et son état. PathScribe décide ce qui est libéré et quand ; le moteur assure le transport.

**4. Prérequis et dépendances.** La file lit le moment d'envoi d'un message, et son délai de déclaration, dans les [Horaires d'envoi](#screen-delivery_schedules) : l'horaire propre à l'établissement exécutant, sinon celui de l'entreprise, sinon la valeur par défaut du flux. Sans horaire, un message suit la valeur par défaut du flux. Les éléments de facturation suivent aussi les paramètres de libération de la facturation, et les éléments de registre les paramètres du registre, tous deux au niveau 7.

Setup step: Reference, not part of setup
Requires: [Horaires d'envoi](#screen-delivery_schedules)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-outbound-queue - File d'envoi avec filtres de flux, tuiles de délais, colonne d'état et barre d'actions]

**6. Référence des champs.**

Filtres et tuiles.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtrer par flux | Dix pastilles à bascule | Facultatif | N'affiche que les flux choisis. | Tous les flux |
| Établissement | Liste de choix, **Tous les établissements** ou un établissement | Facultatif | Limite à un établissement. | Tous les établissements |
| Rechercher par numéro d’enregistrement | Texte | Facultatif | Recherche dans le numéro d'accession. | Vide |
| Tuile À réviser | Bascule avec nombre | Facultatif | Affiche les éléments de facturation mis de côté pour une personne (**À réviser : code CPT non associé**, **no technical-component facility**, **delta charge from an amended case**) et les éléments de registre qui nécessitent une révision (un champ obligatoire vide, aucun établissement exécutant, aucun profil d'État, une règle d'État telle que « No ICD-O-3 code on the case »). | Désactivée |
| Tuile Charges différentielles | Nombre | Sans objet | Actes facturables issus de dossiers modifiés. | Sans objet |
| Tuiles des délais de déclaration | Nombres, **En retard** et **Échéance proche** | Sans objet | Délais de déclaration aux registres. | Sans objet |
| Trier par, sens | Choix entre Flux, État, Heure de mise en file, Heure prévue, Tentatives, Délai de déclaration ; croissant ou décroissant | Facultatif | L'ordre par défaut place d'abord les rejetés, puis les abandonnés après échecs, les échecs, les suspendus, les en attente, les envoyés, les accusés de réception, les non déclarables, les annulés. | Ordre d'état |

La liste.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Sélectionner (ligne et tout sélectionner) | Case à cocher | Facultatif | Choisit des messages pour une action groupée. Le décompte indique « Sélectionnés : n ». | Aucun |
| Flux, Accession, Destination | Texte (lecture seule) | Sans objet | Le flux, le dossier et la destination avec son transport. | Sans objet |
| État | L'un des états **En attente**, **Suspendu**, **Envoyé**, **Accusé de réception**, **Échec**, **Abandonné après échecs**, **Rejeté**, **Non déclarable**, **Annulé** | Sans objet | En attente : en file, part à l'heure prévue. Suspendu : une personne l'a arrêté. Envoyé : le moteur l'a reçu. Accusé de réception : le destinataire a confirmé. Échec : un envoi a échoué. Abandonné après échecs : a échoué après ses nouvelles tentatives automatiques. Rejeté : un registre l'a renvoyé avec des erreurs. Non déclarable et Annulé sont clos. | Sans objet |
| Tentatives, Prévu, Échéance, Détail | Lecture seule | Sans objet | Le détail contient le motif de suspension (« Suspendu : ... »), l'erreur, une date de libération prévue, une date de correction à rendre, « Libéré avant l’heure prévue (utilisateur id) », « Corrige un message précédent », ou le motif du registre. | Sans objet |

Les actions, qui s'appliquent aux messages sélectionnés et vérifient la capacité une seule fois pour la sélection. Chaque message obtient son propre résultat ; le refus pour l'un n'arrête pas les autres.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Suspendre | Bouton, puis un panneau | Motif obligatoire | Autorisé pour En attente et Échec. Motif : Indisponibilité du destinataire, Maintenance du destinataire, Vérification des données, Revue de facturation, Doublon possible ou Autre. Une note facultative de 200 caractères au maximum, avec l'exemple affiché « No patient details ». | Sans objet |
| Libérer | Bouton | Sans objet | Autorisé pour Suspendu. Le remet dans la file. | Sans objet |
| Réessayer | Bouton, puis un panneau pour un message rejeté | Motif obligatoire en cas de rejet | Autorisé pour Échec, Abandonné après échecs et Rejeté. Un message rejeté nécessite le motif de sa correction : Données corrigées, Codage corrigé, Corrigé par le pathologiste ou Autre. | Sans objet |
| Marquer non déclarable | Bouton, puis un panneau | Motif obligatoire | Autorisé pour Rejeté. Motif : Not a reportable condition, Outside the registry's jurisdiction, Already reported ou Autre. Plus rien n'est envoyé. | Sans objet |
| Annuler la charge | Bouton, puis un panneau | Motif obligatoire | Éléments de facturation uniquement ; autorisé pour En attente, Suspendu, Échec et Abandonné après échecs. Motif : Case amended, Case retracted, Duplicate charge ou Autre. Définitif. | Sans objet |
| Libérer maintenant | Bouton | Sans objet | Éléments de facturation uniquement ; autorisé pour En attente et Suspendu. Envoie avant l'heure prévue et enregistre l'identifiant de l'utilisateur. | Sans objet |

Un refus est signalé sous forme de décompte : non autorisé, n'est plus dans la file, non suspendable, non suspendu, non réessayable, non rejeté, non annulable, non libérable, motif obligatoire, ou non envoyé (voir la colonne Détail). Le résumé indique « Changed: n » et « Not applicable to the state: n. »

**7. Autorisations.** Ouvrir : `screen:outbound-queue:open`. Réessayer : `interface:outbound:resend`. Suspendre : `interface:outbound:hold`. Libérer : `interface:outbound:release`. Marquer non déclarable : `interface:outbound:mark-not-reportable`. Annuler la charge : `interface:outbound:retract`. Libérer maintenant : `interface:outbound:override-release`. Toutes sont à risque élevé et auditées. Chacune des cinq autres que « resend » nécessite la capacité d'écran. Le rôle Administrateur les détient toutes ainsi que l'écran par défaut. Le Directeur de laboratoire et le Réviseur AQ n'ont pas l'écran. Suspendre et libérer sont vérifiés une seule fois pour une sélection groupée.

**Limites connues.** La file contient les messages que le côté PathScribe connaît. Savoir si un message a atteint son destinataire dépend de l'accusé de réception du moteur, qui est Prévu : aujourd'hui, toute réponse 2xx compte comme envoyée. Accusé de réception n'apparaît que pour les flux qui comportent un accusé de réception (registre). Le transport indiqué dans la destination est un libellé, car le moteur est responsable du transport.

## Autres intégrations et outils de test {#ch7-other}
Breadcrumb: Accueil > Configuration > Système > Intégrations

**Statut :** Partiel

Ces écrans relèvent du niveau 6 mais ne concernent pas le moteur d'interface : un flux de rapports pour les outils d'analyse, l'import de l'historique d'un système ancien, et les outils de démonstration qui remplacent des systèmes non connectés.

### Flux de rapports (Power BI) {#screen-bi_feed}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Flux de rapports (Power BI)

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Flux de rapports (Power BI)

**3. Objectif métier et périmètre.** Permet à Power BI, Excel, Tableau ou à un script de lire les données de PathScribe par une API de reporting située sur le serveur API. Ils ne se connectent jamais à la base de données. Vous choisissez ce que le flux propose (jeux de données et établissements exécutants), émettez un jeton pour chaque outil, et excluez les données identifiantes sauf si une personne nommée les a approuvées. Par défaut, un jeton est désidentifié : les noms, les numéros de dossier médical, les dates de naissance et les textes libres sont supprimés, les dates sont réduites au mois, et les âges de 90 ans et plus s'affichent comme 90+.

**Ce qui est réalisé et ce qui ne l'est pas.** Réalisés : les paramètres, l'enregistrement de l'approbation, la création, le remplacement et la révocation des jetons, le catalogue des champs et le test d'extraction. Un jeton n'est affiché qu'une seule fois ; PathScribe n'en conserve qu'une empreinte et ne peut plus le montrer. Non connecté : le flux lui-même. L'appel de lecture, `GET /api/bi/v1/{dataset}` avec `Authorization: Bearer psbi_...`, est un contrat rédigé et l'élément de travail serveur PS-787. Dans la version de démonstration, les paramètres et les jetons sont conservés dans le navigateur, et **Tester une extraction** ne fait que simuler la réponse du serveur (elle ne renvoie aucune ligne). Une bannière l'indique.

**4. Prérequis et dépendances.** Un jeton ne peut être limité qu'à des établissements qui ont le rôle de laboratoire exécutant ; ces établissements viennent donc en premier. Si vous les ignorez, l'écran indique « No performing-lab facilities are set up », et un jeton ne peut pas être créé car au moins un établissement doit être proposé.

Setup step: Tier 6, step 4
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-bi_feed - Paramètres du flux de rapports, approbation des jetons identifiés, liste des jetons, test d'extraction et catalogue des champs]

**6. Référence des champs.**

Ce que le flux propose.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Le flux de rapports est activé | Commutateur Oui/Non | Facultatif | Tant qu'il est désactivé, tous les jetons sont refusés et de nouveaux jetons ne peuvent pas être créés. | Désactivé |
| Jeux de données | Cases à cocher : Audit summaries, Billing events, Cases and turnaround, Quality and discordance, Specimens, Workload and productivity. Ceux qui peuvent identifier un patient portent la mention « can identify a patient » (dossiers, prélèvements, facturation, qualité). | Facultatif | Les jeux de données que tout jeton peut lire. Les synthèses d'audit sont des décomptes quotidiens sans détail d'utilisateur ni de patient. La charge de travail ne contient aucune donnée patient. | Aucune case cochée |
| Établissements de laboratoire exécutants | Cases à cocher | Facultatif | Les établissements que le flux propose. Un jeton peut être limité à certains d'entre eux et ne peut jamais atteindre un établissement dont la case n'est pas cochée. | Aucune case cochée |
| Annuler les modifications, Enregistrer les paramètres | Boutons | Sans objet | Désactivés tant que rien n'a changé. | Sans objet |

Jetons identifiés.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Approuvé par | Texte, jusqu'à 80 caractères | Obligatoire pour enregistrer | La personne nommée qui a approuvé les données identifiantes. | Vide |
| Motif | Texte, jusqu'à 500 caractères | Obligatoire pour enregistrer | Pourquoi des données identifiantes sont nécessaires. | Vide |
| Enregistrer l’approbation | Bouton | Sans objet | Enregistre l'approbation, avec la personne qui l'a enregistrée et la date. Des jetons identifiés peuvent ensuite être créés. | Sans objet |
| Retirer l’approbation | Bouton | Sans objet | La supprime. Un jeton identifié ne reçoit alors plus rien d'identifiant tant qu'une nouvelle approbation n'est pas enregistrée. Refusé avec « There is no approval on record to withdraw » lorsqu'il n'y en a pas. | Sans objet |

Un nouveau jeton.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte, jusqu'à 60 caractères. Exemple affiché « Quality dashboard ». | Obligatoire | Unique parmi les jetons actifs de l'établissement (« Another active workstation at this facility has that name » est le libellé affiché par l'écran). | Vide |
| Ce que le jeton reçoit | Choix entre **Désidentifié** ou **Identifié** | Obligatoire | Identifié est verrouillé tant qu'aucune approbation n'est enregistrée. Identifié n'a d'effet que pour les jeux de données dossiers, prélèvements, facturation et qualité ; pour les autres jeux de données, il est refusé. | Désidentifié |
| Jeux de données que ce jeton peut lire | Cases à cocher des jeux de données que le flux propose | Obligatoire (au moins un) | Un jeu de données que le flux ne propose pas est refusé. | Aucun |
| Établissements que ce jeton peut lire | Cases à cocher des établissements que le flux propose | Facultatif | N'en cochez aucun pour tous les établissements que le flux propose. | Aucun |
| Créer le jeton | Bouton | Sans objet | Affiche le jeton une seule fois avec Copier. Le texte « Copy this token now ... It is shown only once. » Un jeton commence par `psbi_` et dure 365 jours. | Sans objet |

La liste des jetons et le test d'extraction.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom, Jeux de données, Établissements, Mode, Jeton, Dernière extraction, Statut | Colonnes en lecture seule | Sans objet | Jeton affiche les quatre derniers caractères et la date d'expiration. Le statut est **Actif**, **Expire bientôt** (dans les 30 jours), **Jeton expiré** ou **Révoqué**. Dernière extraction affiche le jeu de données, les lignes et l'heure. | Sans objet |
| Nouveau jeton (remplacer) | Bouton sur une ligne | Sans objet | Émet un jeton de remplacement. Le jeton précédent continue de fonctionner pendant 24 heures afin que l'outil puisse être mis à jour. | Sans objet |
| Révoquer | Bouton, puis Motif et Note | Motif obligatoire | Motifs : Peut-être compromise, Inscrite par erreur, Déplacée vers un autre site, Machine remplacée, Machine retirée, Autre. Une note est obligatoire pour Autre et facultative sinon. **Révoquer maintenant** confirme. Un jeton révoqué cesse de fonctionner immédiatement. | Sans objet |
| Jeton (Tester une extraction) | Texte | Obligatoire | Un jeton collé. | Vide |
| Jeu de données (Tester une extraction) | Choix de jeux de données | Obligatoire | Le jeu de données à demander. | Premier jeu de données |
| Extraire | Bouton | Sans objet | Affiche la réponse que le serveur donnerait : Accepté (lignes et champs, et le mode), ou Refusé parce qu'il n'a pas la forme d'un jeton de flux, qu'aucun jeton ne correspond, qu'il est révoqué, qu'il est expiré, que le jeu de données n'est pas autorisé, que le flux est désactivé, qu'un jeton identifié n'a pas d'approbation, ou que le jeton a effectué 60 extractions dans la dernière minute. | Sans objet |
| Catalogue des champs | Tableau en lecture seule : Champ, Type, Flux désidentifié | Sans objet | Chaque champ de chaque jeu de données tel qu'un analyste voit la colonne. La dernière colonne affiche **Conservé**, **Retiré** ou **Réduit au mois**. | Sans objet |

L'API de lecture renvoie 1 000 lignes par page par défaut et au plus 10 000.

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Paramètres : `config:bi-feed:manage`. Créer, remplacer et révoquer des jetons et Tester une extraction : `config:bi-feed-tokens:manage`. Enregistrer et retirer l'approbation du mode identifié : `config:bi-feed-identified:approve`. Les trois sont à risque élevé. Les rôles Administrateur et Directeur de laboratoire les détiennent par défaut ; la personne qui crée un jeton identifié et la personne qui l'approuve peuvent donc être la même, sauf si un hôpital les sépare dans le Dictionnaire des rôles.

**Limites connues.** Le flux n'est pas encore servi ; dans la version de démonstration, seuls les paramètres et les jetons fonctionnent. Pendant le chargement des données, et dans certains messages de problème, l'écran indique « workstation » alors qu'il s'agit d'un jeton de flux (une erreur de formulation dans le texte). La limite de 60 extractions par minute du jeton et sa durée de vie de 365 jours sont fixées dans le code.
### Correspondances de champs de migration {#screen-migration_field_mappings}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Correspondances de champs de migration

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Correspondances de champs de migration

**3. Objectif métier et périmètre.** Fait correspondre les noms de champs source propres à un SIL ancien aux champs cibles de migration de PathScribe, pour chaque système source. Un client qui possède plusieurs établissements peut migrer depuis plus d'un système ancien ; chaque correspondance appartient donc à un seul système source. L'import des dossiers historiques lit ces correspondances. Un champ source sans correspondance est signalé à l'import et n'est pas copié.

**4. Prérequis et dépendances.** Rien n'est à configurer d'abord. L'import de [Tâches de migration de données historiques](#screen-migration-jobs) nécessite au moins une correspondance active pour le système source. Si vous l'ignorez, l'import indique « This source system has no active field mappings. »

Setup step: Tier 6, step 5
Requires: Aucun, c'est un point de départ.
Unlocks: [Tâches de migration de données historiques](#screen-migration-jobs)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-migration_field_mappings - Liste des correspondances de champs de migration avec le filtre de système source et Ajouter un mappage]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtre de système source | Liste de choix, **Tous les systèmes source** ou un système | Facultatif | Filtre la liste. | Tous les systèmes source |
| Ligne de liste | Lecture seule : champ source, champ cible, catégorie, et **Inactif** lorsqu'elle est désactivée | Sans objet | Une correspondance par ligne, avec **Modifier**. « No field mappings on file. » lorsque la liste est vide. | Sans objet |
| Ancien système source | Texte, exemple affiché `LegacyLIS-Cerner` | Obligatoire | Le nom du système ancien. La liste des systèmes source de l'import est construite à partir de ces noms. | Vide |
| Catégorie | Choix entre Données démographiques, Détail d'accession, Texte macro/micro, Codage SNOMED/ICD-O, Inventaire lames/blocs, Archive de rapports PDF, Champ synoptique discret | Obligatoire | Détermine les champs cibles proposés. | Première catégorie |
| Nom du champ source | Texte, exemple affiché `PT_FNAME` | Obligatoire | Le nom du champ ou de la colonne de l'ancien système, tel qu'il apparaît dans l'en-tête du fichier ou dans le JSON. | Vide |
| Champ cible | Liste de choix des champs de la catégorie | Obligatoire | Données démographiques : prénom, nom, date de naissance, MRN, sexe. Détail d'accession : numéro d'accession ancien, date d'accession, nom du médecin prescripteur, nom de l'établissement, description du prélèvement. Texte macro/micro : description macroscopique, description microscopique, diagnostic final. Codage : codes SNOMED, codes ICD-O. Inventaire lames/blocs : identifiants de blocs, identifiants de lames. Archive PDF : URL du compte rendu archivé. Champ synoptique : champs synoptiques. | Aucun sélectionné |
| Remarque de transformation (facultatif) | Texte, exemple affiché « e.g. convert MM/DD/YYYY to ISO » | Facultatif | Une note pour la personne qui lit la correspondance. | Vide |
| Ajouter un mappage, Modifier, Enregistrer, Annuler | Boutons et fenêtre | Sans objet | Une seconde correspondance active pour le même système source et le même champ source est refusée : « A mapping for (field) already exists for (system). » | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter et modifier : `config:migration-mappings:manage` (risque élevé). Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut. La même capacité protège le lancement d'un import.

**Limites connues.** La Remarque de transformation est un simple commentaire : aucun code ne l'applique ; une date dans un autre format n'est donc pas convertie en rédigeant une note. L'indicateur actif d'une correspondance est enregistré et respecté par l'import, mais la fenêtre n'a pas de commutateur pour le modifier ; une nouvelle correspondance est donc toujours active. Il n'y a pas de bouton de suppression.

### Tâches de migration de données historiques {#screen-migration-jobs}
Breadcrumb: Accueil > Configuration > Tâches de migration

**Statut :** Partiel

**1. Navigation :** l'adresse `/migration-jobs`, accessible à toute personne qui a l'écran Configuration. Aucune entrée de menu ne l'ouvre ; donnez donc l'adresse à vos administrateurs.
**2. Élément de maintenance :** Tâches de migration de données historiques

**3. Objectif métier et périmètre.** Le suivi des statuts et la validation croisée des tâches de migration depuis un SIL ancien, et la fenêtre **Importer un fichier hérité** qui en démarre une. Une tâche indique combien d'enregistrements ont réussi, échoué ou nécessitent une révision, et rapproche ce décompte de celui que le système source a annoncé. Les correspondances ambiguës de patients trouvées pendant l'import sont envoyées dans la file existante de Révision des correspondances de patients et ne sont pas suivies séparément ici.

**Ce qui est réalisé et ce qui est Simulé.** Réalisés : la lecture d'un fichier, l'application des correspondances, la validation, le rapprochement avec les patients, l'enregistrement de la tâche et de ses résultats par enregistrement, et le rapprochement des décomptes. Simulé : l'import s'exécute dans le navigateur, et les dossiers brouillons qu'il crée sont marqués **Simulé**. Une bannière indique qu'un import en masse côté serveur le remplace. Le fichier lui-même n'est pas conservé.

**4. Prérequis et dépendances.** Le système source doit avoir des correspondances de champs actives ; les [Correspondances de champs de migration](#screen-migration_field_mappings) viennent donc d'abord. Si vous les ignorez, la liste des systèmes dans la fenêtre est vide (« No source system has active field mappings yet »).

Setup step: Tier 6, step 6
Requires: [Correspondances de champs de migration](#screen-migration_field_mappings)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-migration-jobs - Liste des tâches de migration avec les étiquettes de statut et le bouton Importer un fichier hérité]

**6. Référence des champs.**

La liste et le détail.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Importer un fichier hérité | Bouton | Sans objet | Ouvre la fenêtre d'import. Grisé sans la capacité. | Sans objet |
| Ligne de tâche | Lecture seule : système source, étiquette de statut, étiquette **Simulé**, badge **Cross-validation discrepancy**, décomptes « n ok, n échec, n révision » | Sans objet | Cliquez pour ouvrir le détail. Le statut est **En attente**, **En cours**, **Terminé**, **Terminé avec erreurs** ou **Échec**. « No migration jobs on file. » lorsque la liste est vide. | Sans objet |
| Validation croisée | Texte | Sans objet | **Reconciled** (traités sur annoncés), **Discrepancy** (annoncés, traités et combien manquent ou sont en trop), ou « No claimed source count on file, cannot reconcile ». | Sans objet |
| Décomptes | Texte | Sans objet | Réussis, échoués, à réviser, sur le total traité. | Sans objet |
| Enregistrements nécessitant une attention | Liste : dossier brouillon ou message d'erreur | Sans objet | Les enregistrements échoués affichent l'erreur ; les correspondances ambiguës affichent **Nécessite une révision MPI**. | Sans objet |
| Enregistrements | Liste du résultat de chaque enregistrement, avec **Réussi**, **Échec** ou **Vérification MPI requise** | Sans objet | Le résultat de chaque enregistrement et l'identifiant de son dossier brouillon. | Sans objet |

La fenêtre Importer un fichier hérité.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Système source | Liste de choix des systèmes ayant des correspondances actives | Obligatoire | « Choose a source system. » | Aucun |
| Fichier hérité (CSV ou JSON) | Fichier, `.csv`, `.tsv`, `.txt` ou `.json`, jusqu'à 2 000 enregistrements | Obligatoire | Un CSV nécessite une ligne d'en-tête avec les noms de champs de l'ancien système. Le JSON est une liste d'enregistrements, ou un objet avec une liste `records`. Les valeurs imbriquées sont écartées et comptées. Plus de 2 000 enregistrements est refusé. | Aucun |
| Nombre d’enregistrements annoncé par le système source (facultatif) | Nombre entier | Facultatif | Si vous le connaissez, la tâche le rapproche des enregistrements traités. | Vide |
| Créer des dossiers brouillons à partir des enregistrements réussis | Case à cocher Oui/Non | Facultatif | Crée un dossier brouillon marqué **Simulé** pour chaque enregistrement réussi, en ignorant un numéro d'accession ancien déjà importé (« Already imported » fait échouer cet enregistrement). | Activé |
| Lancer l’importation | Bouton | Sans objet | Exécute et affiche : les décomptes, les enregistrements ignorés car déjà importés, les dossiers brouillons créés (Simulé) et les champs source qu'aucune correspondance ne couvre. Un bouton **Voir la tâche** ouvre la tâche. | Sans objet |

Autres refus : le fichier est vide ou n'est pas du JSON valide, la première ligne n'a pas de noms de champs, le fichier n'a aucun enregistrement, et « You do not have permission to import legacy records. »

**7. Autorisations.** Ouvrir : `screen:configuration:open` (la route est protégée par l'écran Configuration). Importer : `config:migration-mappings:manage` (risque élevé, audité). Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut.

**Limites connues.** La route n'a pas d'entrée de navigation. L'import est Simulé dans le navigateur ; les imports volumineux ou de production attendent l'import en masse côté serveur. Le plafond de 2 000 enregistrements est fixé dans le code.

### Boîte d’envoi simulée {#screen-simulated_mail}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Boîte d’envoi simulée

**Statut :** Démonstration

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Boîte d’envoi simulée

**3. Objectif métier et périmètre.** Aucun service de messagerie n'est connecté dans la version de démonstration. Chaque e-mail que le système aurait envoyé (un suivi, une invitation à une RCP (tumor board), un événement de révision de modèle, un ticket d'assistance) est conservé ici, avec l'étiquette **Simulé**, afin que vous puissiez voir ce qui aurait été envoyé. Rien ne quitte le navigateur. Une notification indique « E-mail simulé enregistré, non envoyé » et renvoie ici.

**4. Prérequis et dépendances.** Aucun. Des éléments apparaissent lorsqu'une fonctionnalité envoie un e-mail.

Setup step: Reference, not part of setup
Requires: Aucun, c'est un point de départ.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-simulated_mail - Liste de la boîte d'envoi simulée et un message ouvert]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Décompte | Texte, « n e-mail(s) simulé(s) » | Sans objet | Les éléments conservés. La boîte d'envoi conserve les 200 plus récents. | Sans objet |
| Enregistré, Type, À, Sujet | Colonnes en lecture seule | Sans objet | Le type est **E-mail** ou **Événement de modèle**. Un destinataire que le serveur choisirait affiche « (chosen by the server) ». | Sans objet |
| Ouvrir | Bouton | Sans objet | Affiche À, Cc, Sujet, corps et Pièces jointes, avec la note « Simulated: this message was not sent to anyone. » | Sans objet |
| Vider la boîte d’envoi | Bouton, avec une confirmation | Sans objet | Supprime tous les e-mails simulés de ce navigateur. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. La section s'affiche comme modifiable pour toute personne détenant `config:vendor-integrations:manage` ; le bouton Vider n'a pas de capacité.

**Limites connues.** Démonstration uniquement. Une version serveur envoie de vrais e-mails par son service de messagerie et ne conserve aucune liste simulée.

### Moteur d’interface simulé {#screen-mock-interface-engine}
Breadcrumb: Accueil > Moteur d’interface simulé

**Statut :** Démonstration

**1. Navigation :** l'adresse `/dev/mock-interface-engine`, dans la version de démonstration uniquement (`__DEMO_TOOLS__`). Un build qui communique avec un serveur API ne l'inclut pas. La page n'a pas d'entrée de menu.
**2. Élément de maintenance :** Moteur d’interface simulé (PS-239)

**3. Objectif métier et périmètre.** Un outil pour les développeurs et les démonstrations. Il répond à la place de systèmes qui n'existent pas encore, de sorte que vous puissiez envoyer une liste de travail moléculaire, un lot de numérisation de lames entières ou tout autre message d'interface et voir une réponse réaliste : un succès, un rejet précis ou une connexion bloquée. La page s'ouvre avec l'avertissement « Developer tool, not real functionality. » Elle comporte quatre parties : les paramètres de réponse, un simulateur de messages entrants, un journal de ce que le moteur simulé a reçu et un simulateur de réponses de registre.

**4. Prérequis et dépendances.** Aucun. Il faut la version de démonstration.

Setup step: Reference, not part of setup
Requires: Aucun, c'est un point de départ.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-mock-interface-engine - Paramètres du moteur d'interface simulé, simulateur de messages entrants, journal du moteur et simulateur de réponses de registre]

**6. Référence des champs.**

Paramètres de réponse.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Commutateur d'activation et statut | Bouton, avec le statut « intercepting real dispatch calls », « starting » ou « not intercepting » | Facultatif | Démarre ou arrête l'intercepteur dans le navigateur pour l'appel de liste de travail moléculaire. | Désactivé |
| Mode de réponse | Choix entre **Toujours réussir**, **Toujours échouer**, **Délai d’attente dépassé** | Obligatoire | Réussir répond HTTP 200. Échouer répond avec le statut ci-dessous. Le délai d'attente ne répond jamais, de sorte que l'envoi reste sur « Dispatching... ». | Toujours réussir |
| Statut HTTP d’échec | Nombre entier | Facultatif | Affiché pour Toujours échouer. Une valeur vide ou nulle revient à 500. | 500 |
| Répondre à la place du scanner de lames | Case à cocher Oui/Non | Facultatif | Une fois un lot de numérisation accepté, signale chaque lame comme en cours de numérisation puis numérisée, afin que la numérisation des lames puisse être présentée de bout en bout. | Activé |
| Résultats de l’automate moléculaire | Choix entre **Positif**, **Négatif**, **Aucun résultat** | Facultatif | Une fois une liste de travail moléculaire acceptée, signale cet appel pour chaque prélèvement de patient, avec des témoins conformes aux attentes. | Aucun résultat |

Les trois panneaux.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Simulateur de messages entrants : Message d'exemple | Liste de choix de 14 exemples : A01 admission ; A01 admission avec numéro NHS vérifié ; A08 mise à jour ; A24 rattachement ; A34 fusion (ancienne forme) ; A40 fusion ; A40 avec patients inconnus (va dans la file des exceptions) ; A43 déplacement d'un séjour ; A45 déplacement d'un séjour (au niveau du séjour) ; A47 changement d'identifiant ; A50 changement de numéro de séjour ; et trois événements (bloc endommagé ou perdu, résultat HPV reçu, matériel déplacé vers le stockage) | Facultatif | **Charger l'exemple** remplit la zone. | Aucun |
| Simulateur de messages entrants : Message (HL7 ou événement JSON) | Texte libre, balisé comme donnée patient | Obligatoire | Un message ou un événement à faire traiter par les mêmes processeurs qu'un récepteur réel utiliserait. | Vide |
| Simulateur de messages entrants : Traiter le message | Bouton | Sans objet | Affiche **Traité** ou **Non appliqué**. Un message qui ne peut pas être rapproché est mis en file comme exception d'interface : « Ouvrez Audit, Journal d'erreurs, Interfaces pour le lier manuellement. » Étiquette **Simulé**. | Sans objet |
| Reçu par le moteur d'interface simulé | Liste en lecture seule : Quand, Type de message, Résultat (**Accepté**, **Rejeté**, **Délai dépassé**), Ouvrir | Sans objet | Sans adresse de moteur définie, chaque message sortant arrive ici au lieu de quitter le navigateur. **Ouvrir** affiche le message ; **Vider la liste** la vide. | Sans objet |
| Recevoir un accusé de réception du registre : Registre, Statut, Réponse | Listes de choix | Obligatoire | Choisissez ce que le registre répondrait à une soumission envoyée : Accepté, Accepté avec avertissements, Rejeté (peut être corrigé), Rejeté (définitif) ou Aucune réponse. **Recevoir** la fait passer par la fonction que le point d'accès entrant réel utilisera. Avec Aucune réponse, la soumission reste en attente d'une réponse. | Aucun |

**7. Autorisations.** La route est protégée par l'écran Configuration (`screen:configuration:open`). Il n'y a aucune capacité sur les commandes.

**Limites connues.** Démonstration uniquement. Ses paramètres sont conservés dans le navigateur et ne sont pas partagés. Les modes Toujours échouer et Délai d'attente dépassé agissent sur l'appel de liste de travail moléculaire que l'intercepteur traite ; le moteur simulé du journal suit le même mode de réponse pour les autres messages. Il n'a pas d'exemple pour un résultat de transmission ; le retour de résultats d'un laboratoire de référence ne peut donc pas être présenté ici.
