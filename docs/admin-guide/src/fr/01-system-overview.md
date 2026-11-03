---
chapter: 1
id: ch1
title: Vue d'ensemble et architecture du système
---

# Vue d'ensemble et architecture du système {#ch1}

Ce chapitre s'adresse à l'administrateur ou à l'ingénieur qui prépare un déploiement de PathScribe. Il présente les composants de PathScribe, la circulation des données entre eux, ce qu'un site doit fournir et les contrôles de sécurité. Il décrit ce que le produit fait aujourd'hui. Tout ce qui n'est pas réalisé est signalé par **Prévu** ou **Non réalisé**, et le chapitre indique où se trouve la fonctionnalité en service la plus proche.

## Comment utiliser ce guide {#ch1-how-to-use}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Comment utiliser ce guide

**Statut :** Réalisé (ce guide et le bouton Aide de l'application).

**Les chapitres suivent l'ordre de configuration.** Le chapitre 2 traite du niveau 1, le chapitre 3 du niveau 2, et ainsi de suite jusqu'au chapitre 8, qui traite du niveau 7. Le chapitre N documente le niveau N-1. Si vous configurez un site du premier chapitre au dernier, chaque écran que vous atteignez trouve déjà configurés les écrans dont il dépend. Le chapitre 9 contient les annexes (référence du journal d'audit et glossaire).

**Chaque écran comporte un encadré Ordre de configuration.** Chaque écran de maintenance de ce guide porte trois lignes :

- **Setup step:** la place de l'écran dans l'ordre, par exemple « Niveau 2, étape 6 ». Un écran qui est un journal, une file d'attente ou un tableau de bord utilisé au quotidien indique « Référence, ne fait pas partie de la configuration ».
- **Requires:** les écrans qui doivent être configurés d'abord. Chacun est un lien. Le guide indique aussi ce qui se passe si vous l'omettez (une liste déroulante vide ou un enregistrement refusé).
- **Unlocks:** ce que l'écran rend possible une fois configuré.

**La page de l'ordre de configuration.** [Ordre de configuration](setup-sequence.html) (`setup-sequence.html`) liste chaque écran dans l'ordre où vous devez le configurer, à partir de ces trois lignes. Utilisez-la comme liste de contrôle pour un nouveau site.

**Le bouton Aide.** **Réalisé.** Un bouton **Aide** se trouve en haut à droite de chaque écran de Configuration et ouvre ce guide, dans une fenêtre séparée qui mémorise sa position (un nouvel onglet si le navigateur refuse une fenêtre), à la section propre à cet écran, de sorte que les modifications non enregistrées ne sont pas perdues. Il suit l'onglet et la section de la barre latérale ouverts : dans le Dictionnaire des rôles de l'onglet Personnel, il ouvre la section [Dictionnaire des rôles](#screen-staff-roles), et dans **Système > Services**, il ouvre [Services](#screen-departments). L'écran Migration Jobs en comporte un sous son titre. Le bouton ouvre `go.html#<screen id>`, où `<screen id>` est l'identifiant de l'écran dans ce guide (par exemple `screen-departments`) ; `go.html` est produit par la génération du guide et trouve la bonne page de chapitre. Les écrans hors de Configuration qui ont une section dans ce guide (le Journal d'audit, la Gestion des lots, le Dépôt Lockbox et d'autres) s'ouvrent par un bouton en forme de livre ouvert dans la barre supérieure, à côté du microphone. Un test échoue si un onglet ou une section de Configuration n'a pas de section dans ce guide, de sorte qu'un nouvel écran ne peut pas être livré sans documentation.

**Mots d'état.** Chaque écran et chaque partie de ce chapitre utilise l'un des cinq mots fixes suivants :

| Statut | Signification |
|---|---|
| **Réalisé** | Fonctionne sur les données de démonstration et dispose d'un contrat de service écrit (`docs/architecture/*_API.md`) pour le serveur de production. |
| **Démonstration** | Fonctionne uniquement sur les données de démonstration, dans le navigateur. La partie serveur de production n'est pas encore connectée. |
| **Partiel** | Une partie de ce que dit le titre est réalisée. La section indique exactement laquelle. |
| **Prévu** | Non réalisé. Un court paragraphe indique ce qui est envisagé et ce que l'on sait du calendrier. |
| **Non réalisé** | Demandé, mais aucun écran ni contrat n'existe. La section le dit en une phrase et nomme l'élément existant le plus proche. |

Lisez « Réalisé » avec précaution. Cela signifie que la partie navigateur fonctionne et que le contrat du serveur est écrit. Cela ne signifie pas que le serveur de production existe. La partie suivante de ce chapitre indique l'état actuel du serveur de production.

**FORMEDRIXAI INTERNAL ONLY.** Certains paramètres ne peuvent être modifiés que par les ingénieurs de déploiement ou de service de ForMedrixAI. Il s'agit des capacités du domaine `platform:`, ou de toute capacité marquée `platformOnly`, et des écrans montrés uniquement à ce personnel. Dans ce guide, leur titre commence par `[FORMEDRIXAI INTERNAL ONLY]` et la section s'ouvre sur un encadré qui indique qui peut modifier le paramètre et pourquoi il est restreint. L'édition client du guide omet ces sections. L'édition interne les conserve. Si vous êtes administrateur chez un client et que vous ne voyez pas un paramètre mentionné par un ingénieur de ForMedrixAI, il s'agit probablement de l'un d'eux.

## Synthèse {#ch1-executive-summary}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Synthèse

**Statut :** Partiel. L'application navigateur est réalisée. Le serveur API de production, le schéma de base de données et les services permanents sont définis dans des contrats écrits et ne sont pas encore réalisés (voir [L'état du produit aujourd'hui](#ch1-current-state)).

PathScribe est un système d'information de laboratoire (SIL) et de compte rendu de pathologie clinique assisté par IA, édité par ForMedrixAI LLC. Il est conçu pour les États-Unis, le Royaume-Uni, l'UE et d'autres marchés, et ses écrans sont traduits en six langues (anglais, français, allemand, néerlandais, coréen et espagnol ; les traductions autres que l'anglais doivent encore être relues par des locuteurs natifs avant tout usage clinique).

Un dossier fonctionne selon l'un de deux modes, décidé dossier par dossier :

- **CoPilot.** PathScribe est une couche de saisie de données synoptiques au-dessus d'un SIL hôte. Le SIL hôte est propriétaire du dossier et du compte rendu final, et PathScribe lui renvoie les données synoptiques structurées.
- **Orchestration.** PathScribe est propriétaire du dossier de bout en bout, comme un SIL léger, y compris le texte narratif assisté par IA. Ce mode sert aux dossiers d'activité externe qui n'ont pas de SIL hôte.

Ce que contrôle un administrateur, c'est la configuration : le personnel et les rôles, les dictionnaires et les tables de consultation, les règles de flux de travail, le comportement de l'IA, les modèles de compte rendu, les interfaces et les règles de facturation. Les chapitres suivants documentent ces écrans dans l'ordre de configuration d'un site.

Trois faits comptent pour la planification :

1. **La base de données de production est Microsoft SQL Server**, accessible par un serveur API PathScribe construit sur ASP.NET Core, avec des mises à jour en direct par SignalR. PathScribe n'utilise pas Firebase comme base de données de production. Quelques fichiers Firebase subsistent dans le dépôt, issus de travaux antérieurs, et doivent être remplacés.
2. **L'hébergement est au choix du client ou de ForMedrixAI.** La conception utilise des composants standard (conteneurs, SQL Server, certificats TLS) et ne dépend pas d'un seul fournisseur de cloud. Un site peut utiliser un cloud public, un cloud privé ou souverain, ou son propre centre de données.
3. **PathScribe ne peut pas encore être déployé en production.** L'application navigateur est suffisamment complète pour être présentée et testée par rapport aux contrats. Le serveur qui conserverait les données réelles de patients n'est pas réalisé. Prévoyez un premier déploiement comme un projet mené conjointement avec ForMedrixAI, et non comme une installation.

## Plan d'architecture {#ch1-architecture}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Plan d'architecture

**Statut :** Partiel. Chaque composant ci-dessous porte son propre statut.

### Les composants {#ch1-parts}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Plan d'architecture > Les composants

| Composant | Ce que c'est | Statut |
|---|---|---|
| **Application navigateur** | Une application web monopage React et TypeScript, servie sous forme de fichiers statiques. Elle ne détient aucune clé et, lorsqu'un serveur API est configuré, n'écrit aucune donnée de patient dans le stockage du navigateur. Une seule génération sert tous les sites : les paramètres de chaque site proviennent d'un fichier `config.json` placé à côté de `index.html`. | Réalisé |
| **Serveur API PathScribe** | ASP.NET Core. Il applique les autorisations, conserve la session de connexion, exécute les transactions de base de données et les tâches planifiées, et appelle les fournisseurs d'IA, le moteur de rendu des comptes rendus et le moteur d'interfaces. | Prévu. Les contrats sont écrits dans `docs/architecture/*_API.md`. Le dépôt ne contient aucun code serveur. |
| **Hub de mises à jour en direct** | Un hub SignalR sur le serveur API, à l'adresse `/hubs/live`. Il signale aux écrans ouverts que quelque chose a changé, en utilisant uniquement des identifiants et jamais de texte de patient. | Prévu. La partie navigateur est réalisée et testée avec un hub de test. |
| **Base de données** | Microsoft SQL Server. | Prévu. Le dépôt ne contient ni schéma ni scripts. |
| **Moteur d'interfaces** | BridgeLink, un fork open source de Mirth Connect (un serveur Java). PathScribe lui transmet un message JSON ; le moteur construit et envoie les messages HL7 et reçoit les réponses. | Partiel. Le contrat de messages est écrit. Le moteur n'est pas encore déployé ni connecté, et la version de démonstration utilise un moteur simulé. |
| **Proxy d'IA et fournisseurs d'IA** | Le serveur API transmet les requêtes d'IA au fournisseur configuré et ajoute la clé du fournisseur, que le navigateur ne détient jamais. | Partiel. La partie navigateur et le contrôle des fournisseurs par juridiction sont réalisés. Les routes du serveur sont Prévu. |
| **Moteur de rendu des comptes rendus** | Un service qui transforme un compte rendu libéré en PDF, avec Chromium sans interface piloté par Playwright. | Prévu. Seul un substitut de développement existe. |
| **Agent de site** | Un service Windows installé sur chaque site. Il se connecte vers l'extérieur en HTTPS, imprime les comptes rendus et les étiquettes sur des imprimantes réseau et écrit des fichiers sur des partages Windows. | Partiel. Les écrans d'administration et le contrat sont réalisés. L'agent lui-même est Prévu. |
| **Passerelles d'impression de poste de travail** | QZ Tray ou l'agent de poste de travail PathScribe, exécuté sur un ordinateur de paillasse pour imprimer les étiquettes sur l'imprimante voisine. | QZ Tray : Réalisé (les étiquettes s'impriment par son intermédiaire). Agent de poste de travail : Réalisé (partie navigateur). |
| **Visionneuses d'imagerie de lame entière (WSI)** | L'application de visualisation propre au fournisseur (par exemple Leica, Roche ou Hamamatsu). PathScribe suit les lots de numérisation et ouvre la visionneuse du fournisseur dans un nouvel onglet du navigateur pour la lame voulue. Il ne dessine jamais les images de lames. | Réalisé (lien de lancement). Les mises à jour d'état des lots de numérisation nécessitent le hub. |

### Circulation des données {#ch1-data-flow}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Plan d'architecture > Circulation des données

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

Comment le lire :

1. **Du navigateur au serveur API.** Chaque action passe par le serveur API avec l'identité de l'utilisateur connecté. Les contrôles d'autorisation du navigateur ne font que masquer des boutons ; c'est le serveur qui décide. Le serveur renvoie des codes d'erreur fixes (`NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`) et n'envoie jamais de texte susceptible de nommer un patient. Les noms et identifiants de patients circulent dans le corps d'une requête, jamais dans une adresse web.
2. **Du serveur API au hub, puis aux navigateurs.** Une fois qu'une modification de la base de données est validée, le serveur écrit un événement dans une table d'envoi (outbox) au cours de la même transaction. Un répartiteur le publie ensuite par le hub. L'événement ne porte que des identifiants. Un écran qui le reçoit relit les données par l'appel normal, soumis au contrôle des autorisations. Les premiers écrans à l'utiliser sont le Live Board du bloc opératoire et la file peropératoire ; l'objectif de conception est de moins de 500 millisecondes entre la validation et le second tableau. Sans hub, les mêmes écrans interrogent le serveur à intervalles réguliers (toutes les 15 secondes sur les écrans peropératoires).
3. **Du serveur API à l'IA.** Le navigateur appelle `/api/ai/...` sur sa propre origine. Le serveur ajoute la clé du fournisseur, vérifie la politique de fournisseur et de région de la juridiction, transmet la requête et écrit un enregistrement d'audit qui ne contient aucun texte de requête.
4. **Du serveur API au moteur d'interfaces.** Le serveur API envoie une enveloppe JSON avec un type de transaction (15 types sortants sont listés dans `INTERFACE_TRANSACTIONS.md`). Le moteur la convertit en HL7 et l'envoie. PathScribe ne construit jamais lui-même le HL7 destiné au réseau. Le trafic HL7 reste dans le magasin de messages propre au moteur, et non dans le bus de messages de PathScribe.
5. **Du serveur API à l'agent de site.** L'agent de site est le seul moyen pour un serveur hébergé dans le cloud d'atteindre une imprimante ou un partage à l'intérieur de l'hôpital. Il se connecte vers le serveur en HTTPS avec un certificat client, de sorte qu'aucune ouverture de pare-feu entrante n'est nécessaire.
6. **Comptes rendus.** Le serveur génère chaque PDF qui quitte PathScribe, conserve un document immuable et haché par libération, et envoie ce même document par chaque canal. Le navigateur affiche un aperçu conçu pour correspondre à ce qui est envoyé.

### Hébergement et montée en charge {#ch1-hosting}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Plan d'architecture > Hébergement et montée en charge

**Statut :** Prévu. Il s'agit de la conception décrite dans `DEPLOYMENT_READINESS_REVIEW.md` ; rien n'en a été déployé.

- **Deux modes d'hébergement pris en charge.** Un cloud public, avec la base de données gérée et l'hébergement de conteneurs du fournisseur lorsqu'ils conviennent. Ou un paquet portable : les mêmes conteneurs sur Kubernetes ou Docker dans un cloud privé, un cloud souverain ou le centre de données de l'hôpital. Le paquet est validé une fois, puis chaque lieu d'hébergement reçoit une liste de contrôle de qualification d'installation.
- **Composants permanents.** L'API (au moins une instance active), la base de données (jamais mise en pause automatique en production), le hub de mises à jour en direct, le moteur de rendu des comptes rendus et le moteur d'interfaces qui maintient les connexions HL7. Une mise à l'échelle à zéro n'est compatible ni avec un rafraîchissement d'écran à la seconde ni avec les dossiers STAT la nuit. Les tâches récurrentes (nouvelles tentatives, minuteries de libération, contrôles d'expiration) peuvent s'exécuter sous forme de courtes tâches planifiées.
- **Montée en charge du hub.** Le SaaS partagé utilise Azure SignalR Service. Le cloud privé et l'hébergement sur site utilisent un backplane Redis, ou une instance unique. Sans Azure SignalR Service, l'équilibreur de charge exige des sessions persistantes (sticky sessions) et des WebSockets activés, avec un délai d'inactivité supérieur à 15 secondes. L'équipe de développement doit encore confirmer cette matrice.
- **Le moteur d'interfaces fonctionne dans les deux cas** (décidé le 13 oct. 2026) : hébergé par ForMedrixAI dans la région du locataire, ou installé à l'hôpital, à partir de la même image de conteneur.
- **Une génération, plusieurs sites.** `npm run build:server` produit la génération destinée à la production. Elle ne contient ni compte de démonstration ni outil de démonstration. Les adresses et les paramètres de connexion de chaque site se trouvent dans son `config.json` (37 paramètres, listés dans `RUNTIME_SETTINGS`), servi avec `Cache-Control: no-store`. PathScribe refuse de démarrer, et nomme les paramètres erronés, si le fichier enfreint une règle (par exemple une adresse qui n'est pas en `https://`).
- **En-têtes de sécurité du navigateur.** La Content-Security-Policy, HSTS et les autres en-têtes sont générés pour nginx, IIS et Azure App Service, Azure Static Web Apps, Azure Front Door, ou sous forme de simple liste, à partir d'une définition unique dans `deploy/security-headers/`. Après avoir modifié une adresse dans `config.json`, relancez le générateur pour que la nouvelle adresse soit autorisée.
- **Les modifications de schéma** sont des scripts SQL versionnés, appliqués par la chaîne de livraison et jamais au démarrage de l'application, et chaque modification laisse la base de données utilisable par la version précédente.

## L'état du produit aujourd'hui {#ch1-current-state}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > L'état du produit aujourd'hui

**Statut :** Démonstration pour presque tous les écrans de données ; voir le tableau ci-dessous pour les exceptions.

Lisez cette partie avant de promettre une date de mise en service à un client. Elle a été vérifiée par rapport au dépôt le 21 oct. 2026.

**Ce qui fonctionne aujourd'hui.** L'application navigateur fonctionne sur des **services de démonstration conservés dans le navigateur**. Environ 170 dossiers de services dans `src/services/` suivent un même schéma : une interface, une version de démonstration qui conserve ses données dans le navigateur et (pour presque tous) une version serveur qui appelle l'API. L'application choisit la version serveur lorsque `VITE_API_BASE_URL` est défini dans `config.json`, et la version de démonstration dans le cas contraire. Lorsqu'un serveur API est configuré, les données de démonstration sont conservées en mémoire et ne sont pas écrites dans le stockage du navigateur.

**Ce qui est connecté à une API de production.** Rien. Les versions serveur existent dans le code du navigateur et disposent de tests avec faux serveur qui vérifient chaque route, mais le serveur API qui y répondrait n'est pas dans le dépôt et n'a pas été construit (le travail est confié à l'équipe en Inde, à partir des contrats). Rien n'a été essayé avec un vrai serveur. Des versions côté serveur existent dans le code du navigateur pour tous les services sauf trois :

| Service sans version serveur pour l'instant | Raison |
|---|---|
| Registre des actions (reconnaissance vocale et raccourcis clavier) | Synchrone et en mémoire. Seuls ses paramètres enregistrés iraient au serveur, par le service de configuration. |
| Service d'instructions d'IA | Ses règles s'exécutent dans le navigateur sur un stockage injecté ; le stockage passe par les services de configuration et d'audit. |
| Service du dictionnaire d'interface | Idem : les règles s'exécutent dans le navigateur. Le stockage passe par les services de configuration et d'audit. |

Les mises à jour en direct utilisent déjà SignalR dans le navigateur (`signalRLiveUpdateService.ts`), mais le hub n'est pas réalisé.

**Ce qui bloque un déploiement en production** (d'après la revue de préparation, état au lot 641) :

| Point bloquant | État |
|---|---|
| Serveur API et schéma SQL Server | Ouvert. Non commencé. |
| Stockage d'objets (blob) pour les PDF de comptes rendus, les exports et les libérations retenues | Contrat écrit. Stockage et points d'accès ouverts. |
| Tâches planifiées côté serveur (une dizaine de minuteries) | Ouvert. Tant qu'une tâche n'est pas déplacée, le navigateur l'exécute pendant qu'une personne est connectée. `VITE_SERVER_JOBS` confie une tâche au serveur par son nom. |
| Service de rendu des comptes rendus | Modèle de cytologie terminé. Le service hébergé est ouvert. |
| Connexion par le serveur (backend-for-frontend), configuration du fournisseur d'identité à l'exécution | Configuration à l'exécution terminée. La partie serveur est ouverte. |
| Moteur d'interfaces, permanent, avec les règles de périphérie | Contrat écrit. Hébergement et points d'accès ouverts. |
| Agent de site | Contrat et écrans terminés. L'agent est ouvert. |
| Hub et mises à jour poussées | Partie navigateur terminée. Le hub est ouvert. |
| Retirer les anciennes fonctions Vercel `api/`, les services Firebase et `functions/` | Ouvert. Trois écrans (Moniteur de graveurs, liste des défauts AQ, historique du suivi du matériel) lisent encore des services reposant sur Firebase. |

Autres points ouverts que doit connaître un administrateur :

- **Le navigateur applique les autorisations aujourd'hui, et l'application côté serveur n'est pas réalisée.** Les contrôles de capacités s'exécutent dans les services du navigateur. Un serveur doit répéter chaque contrôle avant de conserver des données réelles de patients. Voir [Modèle de sécurité](#ch1-security).
- **Aucun test avec lecteur d'écran par une personne n'a été effectué.** Les contrôles d'accessibilité automatisés (règles WCAG 2.1 A et AA, dans Chromium) réussissent, mais personne n'a encore testé avec NVDA ou VoiceOver (PS-687).
- **Firefox n'a pas été passé dans la suite automatisée** de l'espace de génération. Une vérification manuelle dans Chrome, Edge et Firefox est ouverte (PS-718).
- **Les traductions** en français, allemand, néerlandais, coréen et espagnol doivent être relues par des locuteurs natifs avant tout usage clinique.
- **La chaîne d'intégration continue** est écrite mais ne s'exécute qu'une fois le dépôt placé sur GitHub (prévu pour fin octobre 2026).
## Prérequis système {#ch1-prerequisites}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Prérequis système

**Statut :** Partiel. Le dépôt contient les exigences logicielles, réseau et navigateur. Il ne contient **aucune donnée de dimensionnement** pour les serveurs, le stockage de la base de données, la bande passante, la sauvegarde ou la reprise. Lorsque cette partie indique « Non encore spécifié », aucune valeur n'existe dans le dépôt et aucune n'est inventée ici ; les points ouverts figurent dans le fichier de questions ouvertes du chapitre, que ForMedrixAI doit trancher avant qu'un client planifie sa capacité.

### Matériel serveur et hébergement {#ch1-prereq-hardware}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Prérequis système > Matériel serveur et hébergement

| Élément | Ce que dit le dépôt |
|---|---|
| Taille du serveur API (processeur, mémoire, nombre d'instances) | Non encore spécifié. La conception demande au moins une instance active, avec la logique métier dans des bibliothèques de classes et une image de conteneur. |
| Taille du hub (SignalR) et nombre de connexions | Non encore spécifié. Le test de recette utilise au moins 50 tableaux connectés. |
| Moteur de rendu des comptes rendus | Un groupe actif de 2 à 4 processus de navigateur Chromium (commencer par 2), un délai d'expiration de 5 secondes par compte rendu, un navigateur recyclé après 500 rendus, aucune sortie réseau, un `/dev/shm` plus grand et environ 100 Mo de polices (y compris CJK). Processeur et mémoire par instance : Non encore spécifié. |
| Moteur d'interfaces | BridgeLink, un serveur Java à exécution prolongée, sous forme de conteneur. Taille : Non encore spécifié. |
| Plateforme de conteneurs | Kubernetes ou Docker pour le paquet portable ; l'hébergement de conteneurs du fournisseur pour un cloud public. Versions : Non encore spécifié. |
| Courtier de messages | Aucun. Le bus de messages est constitué de tables de la base de données SQL Server, derrière une interface (`IMessageBus`). RabbitMQ ou une file d'attente cloud ne serait ajouté que si les tests de charge montrent que les tables constituent un goulot d'étranglement. |
| Outils de génération (pour les ingénieurs qui construisent le front-end) | Node.js 24.x (`engines` dans `package.json`). Inutile sur un serveur de production, qui sert des fichiers statiques. |

### Base de données {#ch1-prereq-database}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Prérequis système > Base de données

**Statut :** Prévu. Le dépôt ne contient ni schéma, ni scripts, ni code de base de données.

- **Moteur.** Microsoft SQL Server. Le même moteur fonctionne comme Azure SQL Database (sans serveur ou provisionné), SQL Server sur une machine virtuelle, SQL Server dans des conteneurs Linux (images Microsoft officielles pour 2017 à 2025 ; hôtes Linux x86-64 uniquement ; une licence est requise) ou AWS RDS for SQL Server.
- **Ne mettez jamais en pause automatique une base de données de production.** Une base en pause transforme le premier écran du matin, ou un dossier STAT la nuit, en requête échouée. La pause automatique n'est acceptable que pour les locataires de test et de formation. Sur Azure SQL sans serveur, elle se désactive avec `-1`.
- **Point de départ pour la taille.** La revue de préparation recommande un minimum de 2 cœurs virtuels pour un locataire de production « jusqu'à ce que les tests de charge disent le contraire ». C'est une recommandation, non une exigence testée. Stockage, mémoire, IOPS et croissance par dossier : Non encore spécifié.
- **Modifications de schéma.** Scripts versionnés appliqués par la chaîne de livraison avant le démarrage du conteneur API, jamais au démarrage de l'application.
- **Sauvegardes.** La restauration à un instant donné est la conception retenue pour les tables d'audit. Calendrier de sauvegarde, conservation, objectif de temps de reprise et objectif de point de reprise : Non encore spécifié.
- **Remarque AWS.** AWS n'offre pas de SQL Server sans serveur, et un changement de classe d'instance entraîne une interruption (raccourcie par Multi-AZ). Le coût de la licence s'applique.
- **Stockage d'objets (blob)** pour les PDF de comptes rendus, les exports et les libérations retenues : Azure Blob ou un stockage compatible S3, par locataire, privé, chiffré au repos et situé dans la région d'hébergement du locataire (contrat : `BLOB_STORAGE_API.md`). PathScribe ne stocke ni images ni pièces jointes, seulement des liens vers le système d'imagerie du laboratoire.

### Réseau {#ch1-prereq-network}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Prérequis système > Réseau

| Besoin | Détail |
|---|---|
| TLS partout | Chaque adresse de serveur dans `config.json` doit être en `https://`. Le simple `http://` n'est autorisé que vers le même ordinateur dans une génération de développement, ou pour un déploiement interne qui définit `"https": false` dans son fichier d'origines des en-têtes de sécurité (ce qui supprime alors HSTS). |
| Navigateur vers l'API et le hub | HTTPS vers le serveur API. WebSockets (`wss://`) vers `/hubs/live`. Laissez activés les Server-Sent Events et l'interrogation longue comme solutions de repli, car certains proxys hospitaliers bloquent les WebSockets. Les équilibreurs de charge exigent des WebSockets activés et un délai d'inactivité supérieur à 15 secondes. |
| Adresses autorisées | Les adresses de `config.json` (API, fournisseurs d'identité, hub, moteur de rendu, récepteur d'interfaces, points d'accès d'IA et de terminologie, supervision des erreurs) deviennent la Content-Security-Policy du navigateur. Relancez le générateur d'en-têtes après toute modification. |
| Fournisseur d'identité | Accessible depuis le navigateur (et depuis le serveur, une fois que le serveur gère la connexion). Adresses de redirection pour Microsoft Entra ID : `https://<pathscribe host>/auth/callback/microsoft` et `https://<pathscribe host>/auth/signing/microsoft`. |
| Agent de site | HTTPS sortant (port 443) uniquement, sur son propre nom d'hôte (par exemple `agent.<tenant domain>`) qui exige un certificat client. Aucune ouverture de pare-feu entrante. Un proxy qui inspecte le TLS doit laisser passer cet hôte sans y toucher, car l'inspection invalide le certificat client. |
| Portée de l'agent de site (définie localement par l'informatique de l'hôpital) | Les sous-réseaux d'imprimantes, les ports d'imprimantes (par défaut 9100, 515, 631 et 443), les racines UNC des partages et les hôtes depuis lesquels des documents peuvent être téléchargés. PathScribe ne peut pas modifier cette liste. |
| Liaison HL7 | Les demandes entrantes et les résultats sortants passent par le moteur d'interfaces. La liaison est sécurisée par un VPN de site à site ou par MLLP sur TLS. Un message n'est acquitté qu'une fois stocké durablement. |
| Adresse sortante fixe | Les dépôts de fichiers SFTP exigent une adresse IP sortante fixe pour la liste d'autorisation de l'hôpital (une passerelle NAT ou une sortie de pare-feu) et une clé d'hôte épinglée. |
| Télécopie électronique et courriel | Une passerelle SMTP sur le port 587 avec authentification. |
| Bande passante et latence | Non encore spécifié. L'objectif de conception pour un rafraîchissement d'écran courant est de 800 ms au 95e centile entre la validation et l'affichage ; pour les tableaux du bloc opératoire, moins de 500 ms. Le premier chargement de page fait 0,70 Mo compressé (objectif 1 Mo). |
| Région d'hébergement | Une région est choisie par déploiement. Le point d'accès `/api/config` du serveur API peut indiquer les régions de la base de données et du stockage d'objets, que l'onglet Comportement de l'IA affiche (voir [Comportement de l'IA](#screen-tab-ai)). Ce point d'accès est Prévu. |

### Poste de travail client {#ch1-prereq-workstation}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Prérequis système > Poste de travail client

**Statut :** Réalisé, avec les vérifications ouvertes indiquées.

- **Navigateurs pris en charge** (décidé le 15 oct. 2026) : les versions actuelles de Chrome, Microsoft Edge et Firefox. **Safari n'est pas pris en charge.** Les tests automatisés s'exécutent dans Chromium (le moteur de Chrome et d'Edge). Firefox n'est exécuté que sur demande, ne l'a pas encore été dans l'espace de génération, et une vérification manuelle dans les trois navigateurs est ouverte (PS-718). Dans Chrome et Edge, les listes déroulantes sont dessinées sous forme de panneaux stylisés ; Firefox affiche sa propre liste. Le comportement est le même.
- **Fonctionnalités du navigateur utilisées.** WebAssembly (le correcteur orthographique), Web Workers et (lorsque la personne les accorde) la caméra, le microphone et la capture d'écran, pour les photographies de macroscopie, la dictée et les captures d'écran des demandes d'amélioration. L'en-tête Permissions-Policy les autorise pour PathScribe uniquement.
- **Impression d'étiquettes depuis un ordinateur de paillasse.** QZ Tray (Réalisé) ou l'agent de poste de travail PathScribe (Réalisé, partie navigateur) doit s'exécuter sur l'ordinateur. Ils n'écoutent que sur l'ordinateur lui-même : l'agent de poste de travail sur `wss://127.0.0.1` ports 9100 à 9102, et QZ Tray sur `localhost` ports 8181, 8282, 8383 et 8484. Si la page ne peut pas joindre QZ Tray, l'étiquette s'ouvre dans la fenêtre d'impression du navigateur et un message indique que l'imprimante d'étiquettes n'est pas connectée.
- **Autoriser l'accès au réseau local.** Chrome et Edge demandent l'autorisation de la personne pour les adresses locales. L'informatique de l'hôpital peut approuver PathScribe à l'avance avec la politique `LocalNetworkAccessAllowedForUrls`.
- **Invites de QZ Tray.** QZ Tray demande « Allow this website to use your printers? » tant que les demandes d'impression ne sont pas signées avec le certificat du client. La signature est **Prévu** (elle nécessite le serveur API). D'ici là, la personne peut recevoir cette demande une fois par poste de travail. La décision (16 oct. 2026) est d'utiliser un certificat auto-signé par client, qui a une date d'expiration que l'informatique doit renouveler et redéployer ; voir `docs/product/QZ_TRAY_CERTIFICATE_GUIDE.md`. Les étapes pour chaque outil de gestion des appareils sont marquées « Test first » parce qu'elles n'ont pas été exécutées sur un poste pilote.
- **Imprimantes d'étiquettes.** Imprimantes thermiques qui acceptent le ZPL. Les imprimantes de comptes rendus du réseau sont atteintes par l'agent de site. L'impression réseau des comptes rendus ne fonctionne pas depuis le navigateur aujourd'hui.
- **Lecteurs d'écran.** Les contrôles d'accessibilité automatisés réussissent ; les tests par une personne avec NVDA ou VoiceOver sont ouverts (PS-687).
- **Langues.** Anglais, français, allemand, néerlandais, coréen et espagnol, ainsi que le vocabulaire du néerlandais belge et du français belge.
- **Taille d'écran, processeur et mémoire minimaux :** Non encore spécifié.
- **Visionneuses d'imagerie de lame entière.** La visionneuse du fournisseur doit être installée ou accessible depuis le poste de travail selon les exigences de ce fournisseur. PathScribe se contente d'ouvrir la visionneuse dans un nouvel onglet, à l'aide d'un modèle d'adresse de lancement que vous saisissez une fois pour chaque visionneuse, avec le code-barres de la lame renseigné. Elle se configure dans [Intégrations fournisseurs](#screen-vendor_integrations). PathScribe ne fournit aucune adresse de visionneuse.

## Modèle de sécurité {#ch1-security}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité

**Statut :** Partiel. Presque chaque contrôle ci-dessous est réalisé dans le navigateur et dispose d'un contrat serveur écrit. Le serveur qui doit répéter chaque contrôle n'est pas réalisé (voir [L'état du produit aujourd'hui](#ch1-current-state)). Un contrôle dans le navigateur est une simple commodité ; c'est le contrôle du serveur qui fait foi. Ne décrivez aucun contrôle ici comme protégeant des données réelles de patients tant que la partie serveur n'existe pas.

Cette partie indique ce que fait chaque contrôle. Elle ne dit pas que son utilisation rend un laboratoire conforme à une loi ou à une norme. Ce sont les politiques, les contrats et le système qualité propres au laboratoire qui en décident.

### Authentification unique {#ch1-sso}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > Authentification unique

**Statut :** Partiel. OpenID Connect (OIDC) : partie navigateur Réalisé. Partie serveur Prévu.

- **Protocole.** OpenID Connect, flux avec code d'autorisation et PKCE, l'application étant enregistrée comme client public de type application monopage (sans secret client). Il est générique et fonctionne donc avec Microsoft Entra ID, Okta, Ping et Keycloak. Microsoft Entra ID est la première cible. L'autorité Entra doit nommer un locataire : `/common`, `/organizations` et `/consumers` sont refusés, car ils laisseraient entrer n'importe quel compte Microsoft.
- La connexion **Google** n'est pas proposée, car le point d'accès de jetons de Google exige un secret client. Un hôpital qui utilise Google Workspace peut fédérer Google par Entra ID ou Okta.
- **Personne n'est créé par une connexion.** Seul le personnel déjà provisionné et actif peut se connecter. L'identité est rapprochée d'une fiche de personnel par le sujet permanent du fournisseur (le `oid` d'Entra, sinon `sub`), jamais par l'adresse e-mail seule. La première connexion peut établir le lien par l'adresse e-mail si celle-ci est fiable (vérifiée, ou autorité Entra propre à un locataire) ; un paramètre permet de le désactiver afin qu'un administrateur relie chaque compte. Les refus (non provisionné, inactif, ambigu, déjà relié, aucun accès à l'application) sont affichés avec un message clair et consignés dans l'audit. Voir [Membres du personnel](#screen-staff-members).
- Les **versions de démonstration** proposent aussi la connexion par mot de passe. Une génération de production (`VITE_AUTH_MODE` défini à `sso`) ne contient aucun compte de démonstration.
- **Jetons.** Aujourd'hui, le navigateur conserve les jetons dans `sessionStorage` (cet onglet uniquement, perdus à la fermeture de l'onglet). **Prévu pour la production** (décidé les 3 et 15 oct. 2026) : le serveur API conserve les jetons et le navigateur ne reçoit qu'un cookie de session `HttpOnly`, `Secure`, `SameSite` avec un en-tête anti-falsification. Le navigateur ne transporte jamais de JWT, et le hub utilise le même cookie. Cela exige un stockage de session partagé (SQL Server ou Redis) sur le serveur.
- **Enregistrer l'application dans Entra ID** (étapes pour l'informatique de l'hôpital, tirées de `AUTHENTICATION_OIDC.md`) : un enregistrement à locataire unique avec la plateforme Application monopage et les deux adresses de redirection listées sous [Réseau](#ch1-prereq-network), sans secret client, la revendication facultative `email` dans le jeton d'identité, et une étendue d'API exposée accordée à l'application.
- **Comptes et rôles issus de l'annuaire.** La synchronisation automatique des comptes (SCIM : arrivées, modifications et départs) est **Prévu** pour la phase serveur. L'association des groupes de l'annuaire aux rôles PathScribe est **Prévu** pour après la première version. Lorsqu'elle existera, un groupe ne pourra accorder que des rôles de paillasse, jamais Admin, Lab Director, Template Approver ni rien qui comporte une autorité de signature, et chaque association exigera l'approbation d'un second administrateur. Aujourd'hui, les rôles sont attribués à la main dans [Membres du personnel](#screen-staff-members) et [Rôles](#screen-staff-roles).

#### SAML 2.0 {#ch1-saml}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > Authentification unique > SAML 2.0

**Statut :** Non réalisé.

PathScribe n'a ni connexion SAML 2.0, ni bibliothèque SAML, ni écran SAML. Une recherche dans l'ensemble du dépôt ne trouve le mot que dans deux documents de conception. L'élément en service le plus proche est l'OIDC, ci-dessus. L'orientation documentée pour l'hébergement SaaS partagé est que les hôpitaux se connectent par un courtier d'identité PathScribe (Microsoft Entra ID External ID), qui parle SAML ou OIDC à l'annuaire de l'hôpital et de l'OIDC simple à PathScribe, de sorte que « PathScribe ne manipule jamais SAML ». Ce courtier est **Prévu** et n'est pas réalisé. Un déploiement en cloud privé ou dédié se connecte directement à l'Entra ID de l'hôpital par OIDC. Un hôpital qui ne peut offrir que du SAML aujourd'hui doit le signaler à ForMedrixAI pendant la planification, ou fédérer le SAML dans Entra ID ou Okta, qui parlent alors OIDC à PathScribe.

### Contrôle d'accès basé sur les rôles {#ch1-rbac}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > Contrôle d'accès basé sur les rôles

**Statut :** Démonstration. Les contrôles s'exécutent dans les services du navigateur. L'application côté serveur (`AUTHORIZATION_API.md`, phase 4) est **Prévu**.

- **Capacités.** Tout ce que PathScribe applique est une capacité nommée sous la forme `domain:object:verb`, par exemple `config:retention-policy:manage`. Le catalogue (`capabilityCatalog.ts`) est la seule liste et contient environ 320 capacités (322 au moment de la rédaction ; le nombre augmente avec les versions). Une capacité n'est ajoutée qu'avec son contrôle, et un test fait échouer la génération si une capacité n'a pas de contrôle. Chaque capacité a un niveau de risque. Pour une capacité à **risque élevé**, chaque contrôle lors d'une action est écrit dans le journal d'audit, qu'il soit autorisé ou refusé, et chaque export est à risque élevé.
- **Rôles.** Un rôle est un ensemble de capacités. Un membre du personnel détient un ou plusieurs rôles et une affectation d'établissements (une affectation vide signifie tous les établissements). Le périmètre appartient à l'affectation, non au rôle. Un contrôle réussit seulement lorsqu'un rôle détenu accorde la capacité, que chaque capacité qu'elle exige est aussi accordée et que l'action se situe dans les établissements de la personne. Un refus donne un motif (non accordée, exigence non accordée, hors périmètre, établissement inconnu).
- **Rôles intégrés.** Seize : Pathologist, Resident, Fellow, Pathologist's Assistant, Admin, Physician, OR Staff, Template Author, Template Approver, Lab Director, QA Reviewer, Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist et Superadmin. Physician et OR Staff sont des entrées d'annuaire sans accès à l'application. Les valeurs initiales suivent le principe du moindre privilège : un Pathologist ne détient par défaut aucune capacité de configuration. Un administrateur peut modifier les rôles et en ajouter dans [Rôles](#screen-staff-roles), sauf Superadmin.
- **Aucun contournement pour aucun rôle.** Superadmin est un rôle auquel des capacités sont accordées comme à tout autre, et le contrôle n'a aucun raccourci pour lui. Admin n'implique rien non plus. Superadmin détient toutes les capacités sauf `config:ai-prompt:approve` (l'approbation des instructions de l'IA) : elle lui est retirée pour la séparation des tâches, de sorte que seul le laboratoire (le Directeur de laboratoire) approuve ce que sa propre IA reçoit comme instructions, et que le support de ForMedrixAI ne le fait jamais.
- **Superadmin est réservé au support de ForMedrixAI.** Il n'est détenu que par une connexion de support. Un hôpital ne peut ni l'attribuer, ni le modifier, ni le voir dans le sélecteur de rôles du personnel, et une fiche de personnel qui le nomme n'en tire rien. La source côté serveur de cette identité (le locataire d'identité propre à ForMedrixAI) est **Prévu**.
- **Capacités réservées à la plateforme.** Six capacités du domaine `platform:` ne comptent que pour Superadmin (consultation de dossiers entre locataires, organismes de référence, règles de signature, et gestion, publication et simulation du dictionnaire d'interface). Un rôle d'hôpital ne peut pas les détenir. Leurs écrans sont marqués `[FORMEDRIXAI INTERNAL ONLY]` dans ce guide.
- **Frontière entre locataires.** Chaque utilisateur et chaque dossier porte un `organisationId`. L'accès entre locataires est limité à l'accès de support (ci-dessous). L'application se fait aujourd'hui dans le navigateur ; une couche de requêtes côté serveur qui l'applique est Prévu.
- **Confidentialité des dossiers.** Une personne qui ne peut pas ouvrir un dossier reçoit le même message neutre que pour un dossier qui n'existe pas. Un numéro d'accession saisi ou collé ne prouve rien, et un message ne transforme un numéro en lien que si le lecteur peut ouvrir ce dossier. Le serveur doit donner la même réponse (par exemple `404`) pour « ce dossier n'existe pas » et « vous n'avez pas le droit de le voir », sans aucune différence dans le corps, les en-têtes ou le temps de réponse.
- **Écrans.** Chaque écran a sa propre capacité `screen:<name>:open`. L'accueil et les hubs n'affichent que les tuiles que la personne peut ouvrir, et la route contrôle à nouveau.
- Les **commandes vocales et clavier** ne sont pas un contrôle d'accès et ne servent jamais à accorder un accès.
- **Où l'administrer.** [Rôles](#screen-staff-roles), [Membres du personnel](#screen-staff-members) et l'[onglet Personnel](#screen-tab-staff). Les modifications de rôles et de capacités sont consignées dans l'audit.

### Authentification multifacteur et réauthentification à la signature {#ch1-mfa}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > Authentification multifacteur et réauthentification à la signature

**Statut :** Partiel. Partie navigateur Réalisé. L'authentificateur des comptes de démonstration est **Simulé**. Partie serveur Prévu.

- **Utilisateurs en authentification unique.** Le fournisseur d'identité demande le second facteur. PathScribe lit le jeton d'identité et accepte la MFA lorsque `amr` contient `mfa`, ou nomme des méthodes de deux familles différentes (connaissance, possession, inhérence), ou lorsque `acr` nomme une classe multifacteur. Un mot de passe seul n'est pas de la MFA. Si l'organisation exige la MFA et que le jeton ne l'indique pas, la connexion est refusée avec un message clair. Le fournisseur doit être paramétré pour envoyer ces revendications (Entra : une politique d'accès conditionnel qui exige la MFA ; Okta : une politique d'authentification avec un facteur de possession ; Keycloak : associer le niveau d'authentification à `acr` et ajouter un mappeur `amr`).
- **Politique par organisation.** Dans [Sécurité de session](#screen-session_security) : qui est sollicité (personne, les rôles qui signent des comptes rendus, ou tout le monde ; par défaut personne), combien de minutes avant qu'une signature exige un nouveau code (1 à 720, par défaut 30), et combien d'heures avant que le second facteur expire et que la session se termine (1 à 72, par défaut 12). Enregistré avec `config:session-security:manage` et consigné dans l'audit.
- **Renforcement à la signature.** Lorsque le dernier second facteur est plus ancien que le délai de renforcement, la signature redemande : un nouveau code pour les sessions par mot de passe, ou une nouvelle connexion auprès du fournisseur (`prompt=login`) dont le jeton doit à nouveau attester la MFA.
- **Comptes de démonstration.** Un authentificateur temporel **Simulé** (RFC 6238) avec des codes de récupération affichés une seule fois. Il n'existe que dans la version de démonstration. Une génération serveur n'a aucun facteur simulé : une personne qui n'utilise pas l'authentification unique et à qui la MFA est demandée est informée qu'elle est indisponible et ne peut pas se connecter. La réinitialisation d'une inscription exige `auth:mfa-enrolment:reset`.
- **Verrouillage.** Cinq codes erronés verrouillent le contrôle pendant 15 minutes. Cinq connexions par mot de passe échouées verrouillent une adresse e-mail pendant 15 minutes. Ces compteurs sont conservés dans le navigateur aujourd'hui ; le serveur devra les conserver. Avec l'authentification unique, le fournisseur applique son propre verrouillage.
- **Politique d'authentification à la signature** (Réalisé, Démonstration). Par établissement exécutant : un mot de passe à chaque signature (par défaut, `strict`) ou une fois par session (`session`, avec une durée de 15, 30, 60 ou 240 minutes), avec un second facteur facultatif. Une session se termine à l'expiration du délai, à la déconnexion ou lors d'un changement de rôle. L'écran avertit que le mode une fois par session s'écarte de ce que 21 CFR Part 11 (11.200(a)(1)) attend pour les signatures suivantes, de sorte que c'est le système qualité du client qui décide.
- La **signature biométrique** (WebAuthn, Touch ID ou Windows Hello) est une confirmation facultative. Chaque personne inscrit son propre appareil et le mot de passe fonctionne toujours aussi. La version serveur des appels biométriques est écrite, mais les écrans ne l'utilisent pas encore.
- **Non réalisé :** restriction de déconnexion à distance par réseau, expiration d'une session de signature au verrouillage du poste de travail, seconds facteurs par SMS et par clé matérielle, magasin de politiques côté serveur.
- **Où l'administrer.** [Sécurité de session](#screen-session_security).
### Sécurité de session {#ch1-session}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > Sécurité de session

**Statut :** Partiel. Expiration par inactivité Réalisé (navigateur). Session conservée par le serveur Prévu.

- **Expiration par inactivité.** Une valeur par défaut pour toute l'organisation dans [Sécurité de session](#screen-session_security), à choisir parmi 5, 10, 15, 20, 30 ou 60 minutes. La valeur par défaut est 15. Un laboratoire exécutant peut définir sa propre valeur dans le [Répertoire des établissements](#screen-facility-dictionary). Lorsqu'un dossier est ouvert, la valeur du laboratoire s'applique ; ailleurs (Accueil, liste de travail), c'est la valeur de l'organisation. À l'expiration, la personne est déconnectée, et les brouillons non enregistrés sont conservés, non supprimés.
- **Même compte, second onglet.** Se reconnecter avec le même utilisateur dans un autre onglet remplace la session précédente dans le même navigateur, avec une invite.
- **Règle du serveur.** Le serveur met aussi fin à une session dont le jeton a expiré, de sorte qu'un navigateur fermé ou figé ne peut pas en garder une ouverte.
- **Stockage du navigateur.** Lorsqu'un serveur API est configuré, aucune donnée de patient n'est écrite dans le stockage du navigateur. Seuls les préférences d'affichage, les paramètres de poste de travail (poste de numérisation, profil d'affichage, positions des fenêtres) et la session de connexion y touchent.
- **Protection du transport et des pages.** Les en-têtes générés définissent une Content-Security-Policy stricte (pas de script en ligne, pas de `eval`, pas d'encadrement), HSTS sur les déploiements en https, `nosniff`, une politique `no-referrer` (les adresses peuvent contenir des identifiants de dossier) et une Permissions-Policy restreinte. Le HTML des comptes rendus est assaini avant son affichage. Le navigateur ne détient aucune clé d'IA, de terminologie ou de fournisseur, et un test fait échouer la génération si l'une d'elles apparaît dans le front-end.
- **Rapports d'erreur.** Les rapports de plantage peuvent être envoyés à Sentry ou au collecteur propre d'un hôpital, **désactivés par défaut**. Un rapport ne contient qu'un nom d'erreur, un message nettoyé (sans texte cité, adresse e-mail ni suite de trois chiffres ou plus), au plus dix cadres de pile, la route dont les segments numériques sont remplacés, et une référence. Il nécessite deux paramètres dans `config.json` et, pour un client américain, un Business Associate Agreement signé avec le fournisseur, ou, pour l'UE et le Royaume-Uni, un accord de traitement des données et un hébergement des données dans l'UE. L'auto-hébergement évite les deux.
- **Où l'administrer.** [Sécurité de session](#screen-session_security) et [Répertoire des établissements](#screen-facility-dictionary).

### Accès du support {#ch1-support}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > Accès du support

**Statut :** Partiel. Partie navigateur Réalisé. Partie serveur Prévu.

L'hôpital, en tant que responsable du traitement des données, décide si le support de ForMedrixAI peut accéder à ses données. « Accès du support » désigne une session Superadmin qui accède à une organisation dont la personne n'est pas membre du personnel.

- **Politique par organisation.** Désactivé (le support n'obtient rien, y compris Superadmin), **Approbation requise** (la valeur par défaut), ou Toujours autorisé. Avec Approbation requise, le support demande l'accès pour chaque ticket avec un motif d'au moins 10 caractères. Un approbateur de l'hôpital (qui n'est pas le demandeur) approuve ou rejette. Une approbation dure la fenêtre d'accès de l'organisation (30 minutes, 1, 2, 4 ou 8 heures ; la valeur par défaut est 2) ou moins si le support y met fin ou si l'hôpital la révoque.
- **Le flux d'audit propre à l'hôpital.** Distinct du journal d'audit principal : demandes, décisions, expirations, ouvertures refusées, ouvertures et modifications de dossiers, chaque liste ou recherche ayant divulgué des dossiers (identifiants de dossier ; noms des critères de recherche, jamais les valeurs), modifications de politique et exports. Chaque entrée est chaînée par hachage à la précédente, de sorte qu'une entrée modifiée ou supprimée rompt la chaîne, et l'écran affiche le contrôle d'intégrité. L'export est en CSV ou en JSON.
- **Capacités.** `config:support-access:policy`, `config:support-access:approve` et `config:support-audit:view`, attribuées d'origine à Admin. L'ouverture d'un dossier d'une autre organisation exige aussi `platform:cross-tenant-cases:view`, que seul Superadmin peut détenir, et elle est consignée dans l'audit.
- **Non réalisé (travail côté serveur) :** l'adresse IP d'origine et le pays (le navigateur les enregistre vides), la notification par e-mail et par webhook aux approbateurs (aujourd'hui un message dans l'application), la fin de l'accès à la clôture du ticket, l'export PDF du flux (le CSV et le JSON existent ; une fonction PDF est écrite dans le navigateur), le flux dans sa propre table en ajout seul par locataire, et des jetons de session de support liés au ticket et à l'expiration.
- **Où l'administrer.** [Accès du support](#screen-support_access).

### Journalisation d'audit {#ch1-audit}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > Journalisation d'audit

**Statut :** Partiel. Partie navigateur Réalisé. Stockage serveur Prévu.

- **Ce qui est consigné.** Les actions des utilisateurs, les signatures, les amendements, les événements vocaux, les événements système et les appels d'IA. Chaque contrôle de capacité à risque élevé est consigné, qu'il soit autorisé ou refusé. Les modifications de configuration par une personne autorisée sont consignées dans l'audit. Certaines enregistrent les anciennes et les nouvelles valeurs (par exemple la politique des fournisseurs d'IA et les dérogations d'autorité de signature) ; pour beaucoup de paramètres, le journal ne contient que l'entrée indiquant que le contrôle de capacité a été autorisé, et non la nouvelle valeur. Voir [Journaux système](#screen-audit-log) pour le contenu de chaque entrée.
- **Aucune donnée de patient dans le détail.** Le texte de `detail` de l'audit est en anglais littéral et est conçu pour ne contenir aucun nom de patient, date de naissance, MRN ni valeur clinique. Il utilise des identifiants et des noms de configuration. Les mots de passe, les codes et les secrets ne sont jamais consignés.
- **Conception côté serveur.** Tables en ajout seul (autorisations d'insertion et de sélection uniquement), chaque ligne d'audit écrite dans la même transaction que la modification qu'elle consigne, un flux chaîné par hachage pour l'accès du support, et des sauvegardes à un instant donné. Des archives d'audit exportées sur un stockage immuable sont une option propre à chaque hôpital. **Prévu :** rien de tout cela n'existe tant que le serveur n'est pas réalisé. La version navigateur conserve le journal dans le stockage de démonstration.
- **Conservation.** Voir [Conservation des données](#ch1-retention).
- **Où le consulter.** [Journaux système](#screen-audit-log), avec les vues d'interfaces et financière [Journaux système : interfaces](#screen-audit-interfaces) et [Journaux système : financier](#screen-audit-financial).

### Masquage des données de patients dans les captures d'écran du support {#ch1-phi}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > Masquage des données de patients dans les captures d'écran du support

**Statut :** Réalisé.

Lorsqu'un utilisateur envoie une demande d'amélioration (Enhancement Request), l'application prend une capture d'écran et recouvre chaque élément balisé comme donnée de patient avant que l'image ne quitte le navigateur. Tout ce qui affiche un nom de patient, une date de naissance, un MRN ou un identifiant national, un numéro d'accession ou de dossier, ou un détail de contact ou d'assurance du patient est balisé `data-phi` avec son type. Les notifications qui nomment un dossier sont enveloppées pour être elles aussi recouvertes. Les noms du personnel ne sont pas traités comme des données de patients. Un test lit chaque fichier source et fait échouer la génération en cas d'emplacement non balisé, sans liste d'exceptions. Limites à prévoir : un texte libre qui contient par hasard un identifiant (détail d'audit, motifs d'exception d'interface) ne peut être reconnu par aucun contrôle du code, de sorte que ces cellules sont recouvertes en entier ; et le contrôle lit des noms, non des types, de sorte qu'une valeur transmise par une liste générique peut échapper au balisage (un cas de ce genre a été trouvé et corrigé au lot 368, puis vingt écrans ont été vérifiés dans un navigateur).

**Écrans de paillasse (Batches 759 et 760).** Les écrans de paillasse (inclusion, microtome, préparation cytologique, constructeur de demandes complémentaires, revue des exceptions de marges, gestion des lots moléculaires) et les écrans de lecture cytologique n’affichent ni nom, ni date de naissance, ni IPP du patient : seulement le numéro d’enregistrement, la source du prélèvement (ou le type de flacon) et les identifiants de lames. Un dossier externe affiche aussi son ID de dossier externe, saisi à l’enregistrement. Un identifiant saisi au lieu d’être scanné est accepté et consigné comme « Manual Entry » dans le journal d’audit. Rien à configurer.

### Politique des fournisseurs d'IA et régions d'hébergement {#ch1-ai-policy}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > Politique des fournisseurs d'IA et régions d'hébergement

**Statut :** Partiel. Contrôle dans le navigateur Réalisé. Contrôle du proxy serveur Prévu.

- **Pourquoi.** Certaines juridictions nomment les fournisseurs d'IA autorisés ou interdits. PathScribe est neutre vis-à-vis des fournisseurs et contrôle chaque appel d'IA avant de l'envoyer.
- **La règle.** Pour chaque juridiction, et facultativement pour chaque établissement : les services d'IA autorisés, et les régions d'hébergement autorisées pour chaque service. Sans règle, tous les services sont autorisés. Une règle d'établissement restreint celle de sa juridiction, et l'appel doit satisfaire les deux. Lorsqu'une règle limite les régions, un appel dont la région n'est pas enregistrée est refusé. Les services sont nommés selon la forme de la requête : messages structurés (Anthropic), complétions de conversation (OpenAI), complétions de conversation gérées (Azure OpenAI), passerelle de modèles (AWS Bedrock), contenu structuré (Google Gemini) et personnalisé (un modèle auto-hébergé). La région d'hébergement configurée est enregistrée avec le paramètre du fournisseur d'IA.
- **En cas de refus.** La fonctionnalité continue sans IA et affiche « AI is not available for this jurisdiction » lorsque c'est possible. L'appel n'est jamais envoyé à un autre fournisseur à la place.
- **Le serveur doit répéter le contrôle.** Un contrôle dans le navigateur peut être contourné ; le proxy d'IA du serveur doit donc effectuer le même contrôle sur chaque route, et c'est lui qui compte. Il doit choisir le service et la région d'après le paramètre enregistré, jamais d'après le corps de la requête, répondre `403` avec le code `AI_VENDOR_NOT_ALLOWED`, et consigner le refus dans l'audit. **Prévu.**
- **Clés.** Le navigateur ne détient jamais de clé de fournisseur d'IA. En production, les clés se trouvent dans le coffre de secrets du serveur (par exemple Azure Key Vault). Le paramètre enregistré contient le fournisseur, le modèle, le point d'accès et le nom du déploiement, jamais une clé.
- **Ce que le serveur devrait aussi faire (Prévu) :** consigner dans l'audit chaque appel d'IA (qui, dossier, établissement et juridiction contrôlés, service, modèle, région d'hébergement, fonctionnalité, jetons, résultat ; jamais la requête, qui peut contenir des données de patients), limiter le débit par utilisateur et par organisation, et vérifier qu'un Business Associate Agreement ou un accord de traitement des données est en place pour le fournisseur choisi.
- **Écart déclaré.** Dans le navigateur, un paramètre de fournisseur `mock` envoie les requêtes d'IA vers la route Anthropic par le proxy ; un site de démonstration réglé sur `mock` appelle donc quand même le proxy. Une juridiction qui n'autorise pas Anthropic le refuse.
- **Relecture humaine.** La sortie de l'IA est une suggestion. Les écrans qui l'utilisent la présentent au clinicien pour qu'il l'accepte ou la rejette ; voir le chapitre sur l'IA (chapitre 5).
- **Où l'administrer.** La carte de politique des fournisseurs d'IA et la carte des régions d'hébergement de l'onglet [Comportement de l'IA](#screen-tab-ai). Modifier une règle exige `config:ai-vendor-policy:manage` (Admin et Lab Director par défaut), et chaque modification est consignée dans l'audit sous `AI_VENDOR_POLICY_CHANGED`.

### Conservation des données {#ch1-retention}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > Conservation des données

**Statut :** Partiel. Les paramètres sont Réalisé. **Aucune purge de données n'est encore effectuée selon ces paramètres** ; la tâche de purge relève du travail côté serveur.

[Conservation des données](#screen-retention) contient quatre durées : suggestions de l'IA (par défaut 90 jours), journaux d'audit (par défaut 365 jours), instantanés de dossiers (par défaut 7 ans) et archive des comptes rendus (par défaut 10 ans). L'écran avertit que la conservation minimale du journal d'audit est de 90 jours et que toute réduction en dessous des minimums réglementaires exige la validation du responsable de la conformité de l'établissement. L'enregistrement exige `config:retention-policy:manage`. La conservation des prélèvements physiques et des blocs est gérée par la file d'élimination et par les blocages de conservation au niveau du dossier, qui suivent la juridiction (RCPath pour le Royaume-Uni, CAP et CLIA pour les États-Unis). Les documents de comptes rendus immuables dans le stockage d'objets constituent leur propre protection contre la suppression. Durées de conservation des sauvegardes : Non encore spécifié.

### HIPAA et CLIA : les contrôles dont dispose le produit {#ch1-regulatory}
Breadcrumb: Accueil > Guide de l'administrateur > Vue d'ensemble et architecture du système > Modèle de sécurité > HIPAA et CLIA : les contrôles dont dispose le produit

**Statut :** Partiel. Le tableau liste les contrôles qui existent dans la version navigateur. Aucun contrôle ne protège de données réelles de patients tant que la partie serveur n'existe pas, et **l'utilisation de ces contrôles ne rend pas un laboratoire conforme** à HIPAA, à CLIA ni à aucune autre loi. La conformité dépend des politiques, des contrats, de l'hébergement et du système qualité du laboratoire.

| Domaine | Ce que PathScribe offre | Statut | Où |
|---|---|---|---|
| Identité unique de l'utilisateur | Fiches du personnel, avec authentification unique rapprochée par le sujet permanent du fournisseur | Partiel | [Membres du personnel](#screen-staff-members) |
| Contrôle d'accès (moindre privilège) | Capacités et rôles, périmètre d'établissement, aucun contournement pour aucun rôle, confidentialité des dossiers | Démonstration | [Rôles](#screen-staff-roles) |
| Déconnexion automatique | Expiration par inactivité (valeur par défaut de l'organisation, dérogation par laboratoire) ; les brouillons sont conservés | Réalisé (navigateur) | [Sécurité de session](#screen-session_security) |
| Authentification de la personne | Authentification unique, MFA du fournisseur vérifiée d'après le jeton, renforcement à la signature, contrôle facultatif de l'appareil | Partiel | [Sécurité de session](#screen-session_security) |
| Contrôles d'audit | Journal d'audit des actions, des contrôles à risque élevé et des modifications de configuration ; flux de support chaîné par hachage | Partiel | [Journaux système](#screen-audit-log) |
| Sécurité de la transmission | https exigé pour chaque adresse de serveur, HSTS, politique de contenu stricte ; TLS mutuel pour l'agent de site | Réalisé (navigateur et en-têtes). Serveur Prévu | [Réseau](#ch1-prereq-network) |
| Accès des fournisseurs | Accès du support contrôlé par l'hôpital, lié à un ticket et limité dans le temps, avec son propre audit | Partiel | [Accès du support](#screen-support_access) |
| Minimum nécessaire dans les outils | Données de patients masquées dans les captures d'écran du support ; aucun texte de patient dans les adresses web, les erreurs ou les messages du hub ; rapports de plantage nettoyés | Réalisé | [Masquage](#ch1-phi) |
| Tiers traitant des données de patients | Politique des fournisseurs d'IA par juridiction, limites de région, clés détenues par le serveur ; Business Associate Agreement ou accord de traitement des données nécessaire pour chaque fournisseur | Partiel | [Comportement de l'IA](#screen-tab-ai) |
| Intégrité des comptes rendus | Un document de compte rendu immuable et haché (SHA-256) par libération, envoyé sans modification par chaque canal ; enregistrements de dossiers versionnés avec détection des conflits | Réalisé (contrat) ; serveur Prévu | Chapitre 6 |
| Conservation des données | Durées configurables ; file d'élimination et blocages de conservation pour les prélèvements | Partiel | [Conservation des données](#screen-retention) |
| CLIA : autorité de signature | Les types de participation et les règles de signature par pays déterminent qui peut signer, avec des dérogations locales consignées dans l'audit | Réalisé | [Types de participation](#screen-participation_types), [Règles de signature par pays](#screen-country_signing_rules) |
| CLIA : charge de travail et compétence en cytologie | Une limite quotidienne de charge de travail pour le dépistage en cytologie GYN, avec dérogations par membre du personnel et par établissement, et l'acheminement des signatures d'un nouveau cytotechnicien vers un superviseur pour contre-signature jusqu'à ce que les évaluations de compétence soient documentées | Réalisé (navigateur). Le serveur enregistre le temps de dépistage avec sa propre horloge ; Prévu | [Plafond de charge quotidienne](#screen-cytology_workload_cap), [Règles nationales et du laboratoire](#screen-cytology_compliance_features) |
| Identité de l'établissement sur les comptes rendus | Une fiche d'établissement contient son numéro CLIA ou ISO 15189, affiché dans les en-têtes des comptes rendus | Réalisé | [Répertoire des établissements](#screen-facility-dictionary) |

**Non réalisé ou non spécifié :** le chiffrement au repos de la base de données SQL Server (aucun paramètre ni aucune exigence n'est écrit dans le dépôt ; les conteneurs de stockage d'objets sont spécifiés comme chiffrés au repos) ; une spécification de sauvegarde et de reprise après sinistre ; un stockage d'audit côté serveur à preuve d'altération ; un test d'intrusion indépendant ou une certification de sécurité (aucun n'est consigné dans le dépôt) ; et toute déclaration de conformité.
