---
chapter: 4
id: ch4
title: Niveau 3 : Moteurs de flux de travail et configuration opérationnelle (à configurer en troisième)
---

# Niveau 3 : Moteurs de flux de travail et configuration opérationnelle (à configurer en troisième) {#ch4}

Le niveau 3 est la partie de la Configuration qui décide comment le travail circule une fois que les personnes, les sites, les appareils et les dictionnaires des niveaux 1 et 2 existent : où un dossier est acheminé, quelles commandes et quelles macros un poste de paillasse propose, comment un dossier est retenu pour relecture avant et après la validation, et comment le délai de rendu et la qualité sont mesurés. Configurez-le en troisième. La plupart des écrans de cette partie lisent un dictionnaire du niveau 1 ou du niveau 2 (un établissement, une sous-spécialité, un type de prélèvement) et affichent une liste de choix vide tant que ce dictionnaire n'est pas renseigné.

Lisez ce qui suit avant de commencer. Quatre points diffèrent de ce que les titres d'écran du produit laissent penser.

- **Il n'existe pas de « modèle de flux de saisie des demandes » ni de « modèle de flux d'accession ».** Le comportement de l'accession est réparti entre des paramètres documentés là où ils se trouvent ; [Où se trouvent les paramètres d'accession](#ch4-accession-settings) les énumère. **Non réalisé.**
- **Plusieurs écrans conservent leurs valeurs dans le navigateur de l'ordinateur utilisé pour les définir** (Acheminement des dossiers, Règles d'acheminement, Registre des actions, Mode de validation de l'encrage, Suivi des contrôles, Fenêtre biopsie–pièce opératoire, Tableau de bord des contributions, et les commutateurs de déploiement de l'onglet Voix). Le statut de l'écran l'indique. Des paramètres de ce type ne sont pas vus par les autres postes de travail tant que la version avec serveur API n'existe pas.
- **La pathologie numérique est surtout un dictionnaire de fournisseurs.** PathScribe liste des fournisseurs et une adresse de lancement du visualiseur ; il n'a pas de pilote de scanner et n'affiche pas lui-même les images de lames. Voir [Pathologie numérique](#ch4-digital-pathology).
- **Presque chaque paramètre de validation et de qualité a une valeur par défaut de l'organisation et une dérogation par laboratoire.** La dérogation se fait dans la fenêtre de modification de la configuration de l'établissement ([Dictionnaire des établissements](#screen-facility-dictionary)) ou dans l'écran lui-même.

Configurez le niveau 3 dans cet ordre. Chaque écran de configuration comporte un encadré Ordre de configuration qui donne la même information, et le générateur vérifie qu'aucun écran n'en exige un qui vient après lui. Les écrans marqués référence sont des pages d'usage quotidien et ne font pas partie de la configuration.

1. [Règles d'acheminement](#screen-routing_rules) : règles par mots-clés qui envoient un dossier vers un pool de sous-spécialité.
2. [Acheminement des dossiers](#screen-case_routing) : les paramètres d'affectation aux pools et l'éditeur de règles plus complet.
3. [Registre des actions (onglet)](#screen-tab-actions) : les commandes, leurs raccourcis et leurs phrases vocales.
4. [Groupes d'actions](#screen-action_groups) : des ensembles nommés de commandes pour un poste de travail.
5. [Macros (onglet)](#screen-tab-macros) : les macros de texte partagées et l'import AutoText de Word.
6. [Voix (onglet)](#screen-tab-voice) : les commutateurs de reconnaissance vocale, les paramètres vocaux personnels et la pédale.
7. [Dérogations de voie d'examen macroscopique](#screen-grossing_route_overrides) : un circuit de macroscopie fixe pour un établissement et un type de prélèvement.
8. [Mode de validation de l'encrage](#screen-inking_validation_mode) : avertir ou imposer en cas de problème d'encre.
9. [Intégrations fournisseurs](#screen-vendor_integrations) : fournisseurs de pathologie numérique, de visualiseur WSI, de stockage d'images et d'imagerie de macroscopie.
10. [Relecture avant validation](#screen-peer_review_gate) : où la validation attend une relecture par un pair.
11. [Révision de concordance préliminaire vs finale](#screen-concordance_review_settings) : comparaison entre le diagnostic préliminaire et le diagnostic final.
12. [Tampon de libération après signature](#screen-release_buffer) : la fenêtre de rappel après la validation.
13. [Règles de signature par pays](#screen-country_signing_rules) : règles nationales par type de participation (administrateur de plateforme uniquement).
14. [Motifs de révision](#screen-revision_reasons) : quels motifs d'amendement et de correction recommandent une CAPA.
15. [Règles de signalement automatique RCP](#screen-tumor_board_rules) : ce qui inscrit un dossier à une réunion.
16. [Fenêtre biopsie–pièce opératoire](#screen-biopsy_resection_correlation) : la fenêtre entre la biopsie et la résection.
17. [Corrélation cytologie-histologie](#screen-cytology_histology_correlation) : la fenêtre entre la cytologie et la biopsie.
18. [Suivi des contrôles](#screen-follow_up_tracking) : avertissements et e-mail au clinicien pour les suivis qui ne sont pas arrivés.
19. [Résultats peropératoires critiques](#screen-intraop_critical_results) : résultats de coupes congelées transmis directement au chirurgien.
20. [Terminaux de la suite opératoire](#screen-or_suite_terminals) : les écrans de bloc opératoire et leurs jetons.
21. [Profils d'affichage (tableaux de bord des opérations de l'établissement)](#screen-display_profiles) : écrans muraux pour le tableau de bord Opérations de l'établissement.
22. [Centre de configuration AQ](#screen-qa_config_center) : activités AQ, échantillonnage et déclencheurs de CAPA.
23. [Politique de tendance de discordance](#screen-qa_trend_policy) : quand une discordance répétée est signalée.
24. [Configuration du TAT (onglet)](#screen-tab-tat) : objectifs de délai de rendu.
25. [Objectifs de performance](#screen-performance_targets) : les chiffres sur lesquels un pathologiste est évalué.
26. [Règles CQ de cytologie](#screen-cytology_qc_rules) : qui est sélectionné pour la relecture par un pair en cytologie.
27. [Taux de sélection aléatoire QC](#screen-cytology_qc_settings) : les pourcentages d'échantillonnage aléatoire.
28. [Plafond de charge quotidienne](#screen-cytology_workload_cap) : la limite quotidienne de lames et la journée de dépistage.
29. [Tableau de bord des contributions](#screen-contribution_settings) : la page Ma contribution.
30. [Retours](#screen-feedback) : le bouton de retour d'information AQ.
31. [Flux de recherche](#screen-research_feed) : le titre PubMed sur l'Accueil.
32. [Motifs du poste de travail](#screen-bench_reasons) : les motifs à toucher au poste, formulés par votre laboratoire.

Pages de référence, ne faisant pas partie de la configuration : [Gestion des lots](#screen-batch-management), [Poste d'inclusion](#screen-embedding-station), [Poste de microtomie](#screen-microtomy-workstation), [Poste de distribution des lames](#screen-slide-distribution-station), [Accueil](#screen-home), [Dépôt Lockbox](#screen-lockbox-drop-off), [Assurance qualité](#screen-quality-assurance), [Révision des exceptions de marge](#screen-margin-exception-review) et [File de relecture QC en cytologie](#screen-cytology-qc-queue).

## Saisie des demandes et accession : acheminement et ensembles d'actions {#ch4-order-entry}
Breadcrumb: Accueil > Configuration

Cette partie couvre les paramètres qui décident où va un dossier après sa création et quelles commandes un poste de travail propose. Lisez d'abord [Où se trouvent les paramètres d'accession](#ch4-accession-settings) : PathScribe n'a pas d'écran unique « modèle de flux de saisie des demandes », et cette section indique ce qui existe à la place.

### Où se trouvent les paramètres d'accession {#ch4-accession-settings}
Breadcrumb: Accueil > Configuration > Système

**Statut :** Partiel

Il n'existe aujourd'hui dans PathScribe aucun écran configurable de « modèle de flux de saisie des demandes » ou de « modèle de flux d'accession ». **Non réalisé.** L'écran Accession (Accueil > Accession) tire son comportement des dictionnaires et des règles ci-dessous, chacun configuré sur son propre écran. L'écran Accession lui-même n'a pas de page de paramètres propre. La liste est établie d'après les services que l'écran Accession appelle.

| Ce que cela modifie à l'accession | Où le configurer | Chapitre |
|---|---|---|
| Le format du numéro d'accession | [Configuration du masque de dossier](#screen-case_mask_config) | Niveau 1 |
| Quels champs doivent être renseignés avant que le dossier puisse être enregistré en accession (ids de page `accession` et `clinicalHistory`) | [Champs obligatoires](#screen-field_requirements) | Niveau 1 |
| La liste des services, et le modèle de macroscopie sur lequel démarre un service | [Services](#screen-departments) | Niveau 2 |
| La liste de choix des prélèvements et la liste de choix des contenants | [Dictionnaire des spécimens](#screen-specimens) et [Types de contenants](#screen-container_types) | Niveau 2 |
| La liste de choix des médecins prescripteurs | [Médecins](#screen-physicians) | Niveau 2 |
| Les motifs de non-conformité qui peuvent être signalés à la réception | [Non-conformités des spécimens](#screen-deficiencies) | Niveau 2 |
| Le circuit de macroscopie attribué à un prélèvement à l'accession, lorsqu'une dérogation propre à un établissement s'applique | [Dérogations de voie d'examen macroscopique](#screen-grossing_route_overrides) | Niveau 3 |
| Vers quel pool un dossier non attribué est acheminé (cela s'exécute à la fin de la macroscopie, pas à l'accession) | [Acheminement des dossiers](#screen-case_routing) et [Règles d'acheminement](#screen-routing_rules) | Niveau 3 |

Les demandes entrantes du moteur d'interfaces sont rapprochées au moyen de la table de correspondance des codes de prélèvement, configurée dans Types de demandes et Règles entrantes au niveau 6. Les appels serveur pour les demandes entrantes, la table de correspondance, les brouillons et la file d'envoi de l'accession sont décrits dans `docs/architecture/ACCESSIONING_API.md`.

**Limites connues.** Prévu : un modèle qui regroupe ces paramètres par flux de travail. Aucune date n'est fixée. D'ici là, chaque paramètre se modifie sur son propre écran.

### Règles d'acheminement {#screen-routing_rules}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Règles d'acheminement

**Statut :** Démonstration

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Règles d'acheminement

**3. Objectif métier et périmètre.** Une règle de routage envoie un dossier vers un pool de sous-spécialité en recherchant des mots dans la description du prélèvement. Cet écran est l'éditeur simple des règles par mots-clés : une règle est un pool, une liste de mots-clés, une priorité et une remarque. Les règles sont vérifiées par ordre de priorité et la première qui correspond l'emporte. PathScribe fournit huit règles intégrées (colorectal, tube digestif haut, hépatobiliaire et pancréatique, sein, génito-urinaire, gynécologique, dermatopathologie, hématopathologie ; priorités de 10 à 60). Les règles intégrées peuvent être modifiées et désactivées, mais pas supprimées. Les mêmes règles sont aussi affichées, avec plus d'options (correspondance par type de prélèvement, laboratoire exécutant, pools de repli par laboratoire), dans [Acheminement des dossiers](#screen-case_routing) ; les deux écrans lisent et écrivent une seule liste enregistrée.

**4. Prérequis et dépendances.** Une règle pointe vers un pool, et un pool est une sous-spécialité pour laquelle **Pool / Groupe de travail** est activé. Si vous ignorez les sous-spécialités, la liste **Router vers le groupe** est vide, un avertissement s'affiche et une règle ne peut pas être enregistrée.

Setup step: Tier 3, step 1
Requires: [Sous-spécialités](#screen-subspecialties)
Unlocks: [Acheminement des dossiers](#screen-case_routing)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-routing_rules - Liste des règles de routage avec la zone Tester le routage, la recherche et le filtre]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Tester le routage (description du prélèvement) | Texte | Facultatif | Saisissez une description et sélectionnez **Tester**. L'écran affiche le pool de la première règle active qui correspond, ainsi que la remarque et la priorité de la règle, ou un avertissement indiquant qu'aucune règle ne correspond et que le dossier irait vers le pool de repli. Il teste uniquement les règles par mots-clés, et toujours comme un jeu de règles global (aucun laboratoire exécutant n'est appliqué). | Vide |
| Rechercher des mots-clés ou des remarques | Texte | Facultatif | Filtre la liste selon le texte d'un mot-clé ou d'une remarque. | Vide |
| Filtrer les règles de routage | Choix : Toutes, Actives, Inactives, Personnalisées uniquement | Facultatif | Filtre la liste. **Personnalisées uniquement** masque les règles intégrées. | Toutes |
| Prio. | Nombre entier | Sans objet | Priorité, affichée dans la liste. La plus basse est vérifiée en premier. | Sans objet |
| Route vers le groupe | Nom du pool | Sans objet | Le pool de destination, affiché dans la liste. | Sans objet |
| Mots-clés | Pastilles | Sans objet | Les huit premiers mots-clés, puis « +N de plus ». | Sans objet |
| Remarque | Texte | Sans objet | La remarque de la règle. | Sans objet |
| Statut (commutateur de la liste) | Commutateur Actif / Inactif | Facultatif | Active ou désactive la règle immédiatement. Les modifications sont enregistrées automatiquement. | Sans objet |
| Modifier, Dupliquer, Supprimer | Boutons de ligne | Sans objet | **Dupliquer** ouvre la fenêtre **Ajouter une règle de routage** préremplie avec une copie de la règle. **Supprimer** (règles personnalisées uniquement) demande une confirmation et supprime la règle. Les règles intégrées n'affichent pas **Supprimer**. | Sans objet |

#### Fenêtre Ajouter une règle de routage et Modifier la règle

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Router vers le groupe | Liste de choix des sous-spécialités actives pour lesquelles Pool / Groupe de travail est activé (depuis [Sous-spécialités](#screen-subspecialties)) | Obligatoire | Le pool vers lequel va le dossier. Affiche « Sélectionnez un groupe » lorsqu'elle est vide. | Le premier pool de la liste |
| Mots-clés | Mots saisis et ajoutés avec **Ajouter** ou Entrée, affichés sous forme de pastilles | Obligatoire (au moins un) | Si une description de prélèvement contient l'un des mots-clés, la règle correspond. La correspondance ne tient pas compte de la casse, accepte les correspondances partielles et ignore la ponctuation. Un mot-clé déjà présent dans la liste est refusé. Les mots-clés sont enregistrés en minuscules. | Aucun |
| Priorité | Nombre entier | Obligatoire | La plus basse est vérifiée en premier. La fenêtre refuse une priorité déjà utilisée par une autre règle (« La priorité N est déjà utilisée par une autre règle »). Les règles intégrées utilisent 10 à 60. | 100 |
| Remarque (facultatif) | Texte | Facultatif | Texte libre destiné à l'administrateur. Recherchable dans la liste. | Vide |
| Statut | Commutateur Actif / Inactif | Facultatif | Une règle inactive est ignorée lors du routage. | Actif |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Ajouter, modifier, dupliquer, supprimer, activer ou désactiver : `config:case-routing:manage` (risque élevé, donc chaque contrôle est audité). Admin et Directeur de laboratoire la détiennent par défaut ; Superadmin détient l'ensemble du catalogue (sauf `config:ai-prompt:approve`, retirée pour la séparation des tâches (le Directeur de laboratoire approuve les instructions de l'IA ; le support de ForMedrixAI ne le fait jamais)).
**Limites connues.** Les règles sont conservées dans le stockage de démonstration du navigateur ; il n'existe pas encore de contrat serveur pour les règles de routage (les appels serveur `routing-rules` de `docs/architecture/ROUTING_API.md` concernent une autre fonctionnalité, les tables de correspondance des établissements, des médecins et des protocoles). Cet écran ne peut pas définir un laboratoire exécutant ni faire correspondre par type de prélèvement ; utilisez [Acheminement des dossiers](#screen-case_routing) pour cela. Sa vérification de priorité, qui refuse une priorité en double, n'est pas appliquée dans Acheminement des dossiers.

### Acheminement des dossiers {#screen-case_routing}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Acheminement des dossiers

**Statut :** Démonstration

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Acheminement des dossiers

**3. Objectif métier et périmètre.** L'acheminement des dossiers décide comment un dossier sans pathologiste attribué parvient à un pool de sous-spécialité. L'écran contient le commutateur général, le pool de repli (un pool global et une dérogation facultative pour chaque laboratoire exécutant), les règles de routage avec ciblage par type de prélèvement et par laboratoire exécutant, une zone de test et un bouton qui achemine maintenant tous les dossiers non attribués. Le schéma à l'écran « Fonctionnement de l'acheminement » donne l'ordre : un dossier arrive, PathScribe recherche une affectation directe (un dossier qui a déjà un pathologiste est laissé tel quel), puis les règles propres au laboratoire, puis les règles globales, puis le pool de repli du laboratoire, puis le pool de repli global, et s'il n'y en a pas, le dossier est signalé pour une affectation manuelle. Un pool marqué Par défaut / Fourre-tout dans Sous-spécialités est prioritaire sur les replis définis ici.

**Quand l'acheminement s'exécute.** L'acheminement s'exécute lorsque la macroscopie d'un dossier est terminée (un dossier STAT suit la voie STAT), uniquement la première fois que le vrai travail diagnostique commence sur ce dossier. Il ne s'exécute pas à l'accession. Un dossier sans prélèvement n'est pas acheminé.

**4. Prérequis et dépendances.** Les pools proviennent de [Sous-spécialités](#screen-subspecialties) (Pool / Groupe de travail activé), les types de prélèvement du [Dictionnaire des spécimens](#screen-specimens) et les laboratoires exécutants du [Dictionnaire des établissements](#screen-facility-dictionary) (établissements ayant le rôle de laboratoire exécutant). Si vous ignorez les pools, l'écran affiche « Aucun pool actif trouvé » et aucun repli ne peut être choisi ; si vous ignorez les établissements, le tableau par laboratoire et les listes de choix de laboratoires sont vides.

Setup step: Tier 3, step 2
Requires: [Règles d'acheminement](#screen-routing_rules), [Sous-spécialités](#screen-subspecialties), [Dictionnaire des spécimens](#screen-specimens), [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-case_routing - Acheminement des dossiers avec le schéma, le pool de repli, le tableau des règles et l'exécution manuelle]

**6. Référence des champs.**

#### Configuration de l'acheminement

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Acheminement automatique vers les pools | Case à cocher Oui/Non | Facultatif | Lorsqu'elle est cochée, les dossiers sans affectation SIL sont acheminés selon le type de prélèvement. Lorsqu'elle est décochée, l'acheminement renvoie « non acheminé » et le dossier reste non attribué. | Cochée |
| Les dossiers STAT sont acheminés immédiatement | Case à cocher Oui/Non | Facultatif | Lorsqu'elle est décochée, un dossier STAT n'est pas acheminé du tout à la fin de la macroscopie (le résultat est « L'acheminement immédiat des dossiers STAT est désactivé »). | Cochée |
| Délai d'affectation (secondes) | Nombre entier, de 0 à 3600 | Facultatif | Décrit à l'écran comme la durée pendant laquelle PathScribe attend que le SIL attribue le dossier avant de l'acheminer vers un pool ; 0 achemine immédiatement. La valeur est enregistrée, mais aucun code d'acheminement ne la lit aujourd'hui : elle n'a donc aucun effet. | 300 |
| Pool de repli global | Liste de choix des pools actifs sans laboratoire exécutant (depuis [Sous-spécialités](#screen-subspecialties)), plus « Aucun (affectation manuelle requise) » | Facultatif | Où va un dossier lorsqu'aucune règle ne correspond et qu'aucun repli de laboratoire ni aucun pool Par défaut / Fourre-tout ne s'applique. | Pathologie générale (`general`) |
| Remplacement du pool de repli (une ligne par laboratoire exécutant) | Liste de choix des pools globaux ou appartenant à ce laboratoire, plus « Utiliser la valeur globale par défaut » | Facultatif | Un pool de repli pour les dossiers de ce laboratoire exécutant. Un pool Par défaut / Fourre-tout marqué dans Sous-spécialités l'emporte sur cette dérogation, et la dérogation l'emporte sur le repli global. | Utiliser la valeur globale par défaut |
| Enregistrer la configuration d'acheminement | Bouton | Sans objet | Enregistre les commutateurs, le délai et les pools de repli. Les règles sont enregistrées séparément, au fur et à mesure que vous les modifiez. | Sans objet |

#### Tableau des règles d'acheminement

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher par mot-clé ou note | Texte | Facultatif | Filtre la liste. | Vide |
| Filtrer par statut | Choix : Tous, Actives, Inactives | Facultatif | Filtre la liste. | Tous |
| Filtrer par laboratoire | Choix : Tous les laboratoires, Global uniquement, ou un laboratoire exécutant | Facultatif | Filtre la liste. | Tous les laboratoires |
| Priorité, Correspondance, Pool, Laboratoire exécutant, Statut | Colonnes | Sans objet | Correspondance affiche « N types de spécimens » lorsque la règle associe des types de prélèvement, sinon les quatre premiers mots-clés. La liste affiche d'abord les règles propres à un laboratoire, puis les règles globales, chacune par priorité. Les règles intégrées portent un badge **INTÉGRÉ**. | Sans objet |
| Modifier, Dupliquer, Désactiver / Réactiver | Boutons de ligne | Sans objet | Il n'y a pas de suppression ici (utilisez [Règles d'acheminement](#screen-routing_rules) pour supprimer une règle personnalisée). **Dupliquer** ouvre la fenêtre **Ajouter une règle d'acheminement** avec une copie. | Sans objet |
| + Ajouter une règle d'acheminement | Bouton | Sans objet | Ouvre la fenêtre ci-dessous. | Sans objet |

#### Fenêtre Ajouter une règle d'acheminement et Modifier la règle d'acheminement

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Types de spécimens associés | Liste à cocher des entrées actives du [Dictionnaire des spécimens](#screen-specimens), avec une zone de recherche | Obligatoire sauf si un mot-clé est saisi | La correspondance déterministe : un prélèvement choisi dans le Dictionnaire des spécimens est mis en correspondance par son id. La fenêtre indique combien sont sélectionnés. | Aucun sélectionné |
| Repli par mot-clé | Mots séparés par des virgules | Obligatoire sauf si un type de prélèvement est associé | Utilisé uniquement pour un prélèvement qui n'a pas d'entrée dans le Dictionnaire des spécimens (saisie manuelle ou ancienne). Ne tient pas compte de la casse, correspondance partielle. | Vide |
| Pool de destination | Liste de choix des pools actifs, affichés sous la forme « Nom, Global » ou « Nom, laboratoire ». Lorsqu'un laboratoire exécutant est choisi, seuls les pools globaux et ceux de ce laboratoire sont proposés | Obligatoire | Le pool vers lequel va le dossier. Erreur : « Un pool de destination est requis. » | Aucun |
| Priorité | Nombre entier, au moins 1 | Obligatoire | La plus basse est vérifiée en premier dans le niveau propre au laboratoire et dans le niveau global. Erreur : « La priorité doit être un nombre positif. » Cette fenêtre ne refuse pas une priorité déjà utilisée par une autre règle. | 100 |
| Laboratoire exécutant | Liste de choix des laboratoires exécutants, ou « Global (vérifié pour tous les laboratoires) » | Facultatif | Une règle propre à un laboratoire est vérifiée avant les règles globales pour les dossiers de ce laboratoire. | Global |
| Remarque | Texte | Facultatif | Texte libre, recherchable. | Vide |
| Statut | Commutateur Actif / Inactif | Facultatif | Une règle inactive est ignorée. | Actif |

#### Tester l'acheminement

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Entrée du dictionnaire des spécimens | Liste de choix des entrées de prélèvement actives, ou « Aucune (tester plutôt le repli par mot-clé) » | Facultatif | Teste la correspondance par type de prélèvement. | Aucune |
| Description du spécimen | Texte | Facultatif | Teste le repli par mot-clé. | Vide |
| En tant que laboratoire réalisateur | Liste de choix des laboratoires exécutants, ou « Global uniquement » | Facultatif | Teste comme un dossier de ce laboratoire. Le résultat indique le pool, si la correspondance s'est faite par type de prélèvement ou par mot-clé, et le laboratoire de la règle. | Global uniquement |

#### Exécution manuelle de l'acheminement

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Acheminer les dossiers non attribués maintenant | Bouton | Sans objet | Achemine chaque dossier qui n'a pas de pathologiste attribué, n'est pas déjà dans un pool et n'est pas finalisé. Exige `case:routing:run` ; sans elle, rien ne s'exécute. Ensuite, l'écran affiche les nombres Acheminés, Ignorés et En échec, et une ligne par dossier avec le motif. Utile après une modification des règles ou après une panne du SIL. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier la configuration et les règles : `config:case-routing:manage` (risque élevé, audité). Lancer l'acheminement manuel : `case:routing:run` (risque élevé, audité). Admin et Directeur de laboratoire détiennent les deux par défaut ; Superadmin détient l'ensemble du catalogue (sauf `config:ai-prompt:approve`, retirée pour la séparation des tâches (le Directeur de laboratoire approuve les instructions de l'IA ; le support de ForMedrixAI ne le fait jamais)).
**Limites connues.** Démonstration : les règles et la configuration sont conservées dans le stockage de démonstration du navigateur et il n'existe pas encore de contrat serveur. **Délai d'affectation** est enregistré mais n'est pas utilisé. L'acheminement ne s'exécute qu'à la fin de la macroscopie ; il n'y a pas d'acheminement à l'accession.

### Groupes d'actions {#screen-action_groups}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Groupes d'actions

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Groupes d'actions

**3. Objectif métier et périmètre.** Un groupe d'actions est un ensemble nommé de commandes du Registre des actions (par exemple « Consigner une lame / un bloc »). Un groupe de postes de travail fait référence à des groupes d'actions pour les actions qu'il autorise par défaut et celles qu'il peut ajouter. Une action peut appartenir à plusieurs groupes.

**4. Prérequis et dépendances.** Les groupes choisissent parmi les commandes listées dans l'onglet [Registre des actions](#screen-tab-actions). Un groupe ne peut pas être enregistré sans aucune action sélectionnée.

Setup step: Tier 3, step 4
Requires: [Registre des actions](#screen-tab-actions)
Unlocks: [Groupes de postes de travail](#screen-workstation_groups)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-action_groups - Liste des groupes d'actions avec la recherche et Ajouter un groupe d'actions]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher des groupes d'actions | Texte | Facultatif | Filtre la liste selon le nom du groupe. | Vide |
| Nom (liste) | Texte | Sans objet | Le nom du groupe. | Sans objet |
| Actions (liste) | Texte | Sans objet | Les noms des trois premières actions, puis « +N de plus ». | Sans objet |
| Statut (liste) | Actif / Inactif | Sans objet | Affiché dans la liste. **Désactiver** et **Réactiver** le modifient immédiatement. | Sans objet |
| Modifier, Dupliquer, Désactiver / Réactiver | Boutons de ligne | Sans objet | **Dupliquer** ouvre **Ajouter un groupe d'actions** prérempli avec les mêmes actions et un nom de copie. Il n'y a pas de suppression. | Sans objet |

#### Fenêtre Ajouter un groupe d'actions et Modifier

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Le nom du groupe. Erreur : « Requis ». | Aucun |
| Actions | Liste à cocher de chaque action du Registre des actions, affichée sous la forme « Libellé (catégorie) », avec une zone de recherche | Obligatoire (au moins une) | Les commandes de l'ensemble. Erreur : « Sélectionnez au moins une action ». | Aucune sélectionnée |
| Actif | Commutateur Actif / Inactif | Facultatif | Un groupe inactif est conservé mais marqué Inactif. | Actif |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Ajouter, modifier, dupliquer, désactiver, réactiver : `config:action-groups:manage` (risque élevé, audité ; vérifié dans le service). Admin et Directeur de laboratoire la détiennent par défaut.
**Limites connues.** Aucune connue. La version avec serveur API est décrite dans `docs/architecture/CONFIG_SERVICES_API.md` (`IActionGroupService`).

## Modèles de macroscopie, macros vocales et bibliothèques de texte automatique {#ch4-grossing-macros}
Breadcrumb: Accueil > Configuration

Cette partie couvre les commandes, les raccourcis de texte et les paramètres vocaux qui accélèrent la macroscopie et la dictée, ainsi que les deux contrôles de macroscopie (dérogations de circuit et contrôle de l'encrage). Les trois circuits de macroscopie (circuit A Tissu standard, circuit B Liquide / Bloc cellulaire, circuit C Histologie seule / Tri direct) sont intégrés et ne peuvent pas être complétés. Le circuit de départ d'un service se définit dans [Services](#screen-departments). Les modèles de macroscopie eux-mêmes sont des modèles de compte rendu marqués comme non diagnostiques ; ils se rédigent dans l'[onglet Modèles de compte rendu](#screen-tab-templates), pas ici.

### Registre des actions (onglet) {#screen-tab-actions}
Breadcrumb: Accueil > Configuration > Registre des actions

**Statut :** Démonstration

**1. Navigation :** onglet Configuration **Registre des actions**
**2. Élément de maintenance :** Registre des actions système

**3. Objectif métier et périmètre.** Le Registre des actions liste chaque commande que PathScribe peut exécuter par raccourci clavier ou par la voix (par exemple « imprimer la cassette courante »). La liste des commandes est fixée dans le produit ; vous ne pouvez pas ajouter ni renommer une commande ici. Pour chaque commande, vous pouvez modifier le raccourci clavier, les phrases de déclenchement vocal et les profils de poste auxquels elle est limitée. Les phrases vocales apprises par une personne sont un paramètre personnel et ne sont pas modifiées ici.

**4. Prérequis et dépendances.** Aucun pour l'onglet lui-même. Les [Groupes d'actions](#screen-action_groups) choisissent des commandes dans cette liste : une commande qui n'y figure pas ne peut donc pas être regroupée.

Setup step: Tier 3, step 3
Requires: Aucun, c'est un point de départ.
Unlocks: [Groupes d'actions](#screen-action_groups)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: tab-actions - Registre des actions système avec la recherche, le filtre de catégorie et les boutons Modifier]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher des actions ou des déclencheurs vocaux | Texte | Facultatif | Filtre selon le nom de l'action ou une phrase de déclenchement. | Vide |
| Boutons de catégorie | Un bouton par catégorie, plus **Toutes** | Facultatif | Affiche une seule catégorie. | Toutes |
| Action | Texte (lecture seule) | Sans objet | Le nom de la commande, avec en dessous le rôle requis. Une commande désactivée dans le produit affiche un badge **Désactivée** et son bouton **Modifier** est grisé. | Sans objet |
| Raccourci (liste) | Combinaison de touches (lecture seule) | Sans objet | Le raccourci actuel. Une commande qui peut être masquée par la touche propre à un écran affiche aussi « Alt+J, puis (touche) », qui l'atteint toujours. | Sans objet |
| Déclencheurs vocaux (liste) | Phrases (lecture seule) | Sans objet | Les phrases prononcées. | Sans objet |
| Télécharger le modèle | Bouton | Sans objet | Télécharge `pathscribe_system_config.csv` avec chaque commande (ID, libellé, catégorie, raccourci, déclencheurs vocaux). Le téléchargement est consigné comme un export. | Sans objet |
| Import groupé | Bouton de fichier CSV | Sans objet | Relit le même format de fichier. Seules les colonnes Raccourci et Déclencheurs vocaux sont appliquées, selon l'ID de commande existant. Les lignes avec un ID inconnu, un ID répété, un libellé ou une catégorie modifié, une commande désactivée, un raccourci répété dans le fichier ou un raccourci réservé sont ignorées, et un récapitulatif liste les cinq premières de chaque résultat. Les déclencheurs vocaux du fichier sont séparés par des points-virgules. Les nouvelles lignes ne sont pas acceptées. | Sans objet |

#### Fenêtre Modifier l'action

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Raccourci | Combinaison de touches, enregistrée en appuyant sur les touches | Facultatif | Cliquez dans le champ et appuyez sur la combinaison. Une combinaison déjà utilisée par une autre commande affiche une erreur qui nomme cette commande et une proposition **Utiliser (suggestion) à la place** en un clic ; **Enregistrer les modifications** est désactivé tant que l'erreur s'affiche. **Effacer** supprime le raccourci. | Le raccourci intégré de la commande |
| Déclencheurs vocaux | Phrases séparées par des virgules | Facultatif | Les phrases prononcées qui exécutent la commande. | Les phrases intégrées de la commande |
| Profils de poste | Cases à cocher : chaque domaine fonctionnel de l'Histologie, de la Cytologie, de la Biologie moléculaire et de l'Autopsie | Facultatif | Limite la commande aux profils de poste choisis. Laissez tout décoché pour l'autoriser partout. | Aucun coché (autorisée partout) |

**7. Autorisations.** Ouvrir l'onglet : `screen:configuration:open`. Modifier un raccourci, un déclencheur ou un profil de poste (modification ou import groupé) : `config:actions:manage` (risque élevé, audité ; vérifié dans le service). Admin et Directeur de laboratoire la détiennent par défaut. Les commandes vocales apprises sont un paramètre propre à chaque personne et n'exigent aucune capacité.
**Commandes ajoutées depuis la rédaction initiale du guide (Batches 650 à 665).** Ajouter un collaborateur (Ctrl+Alt+Shift+0 ; exige `case:team:manage` sur le dossier, comme la fenêtre Équipe du dossier, et un cytotechnicien ne peut pas être ajouté comme Consultant) ; Modifier le champ (Alt+E) et Annuler (Ctrl+Alt+J), qui figuraient déjà dans la liste et agissent désormais ; Ajouter un addendum ; Signer et passer au suivant ; Dossiers en collaboration (Ctrl+Alt+F, anciennement « Filtrer mes dossiers ») ; Aller à la ligne (Alt+7) et Ouvrir un dossier par numéro d'accession (Alt+8) dans la Liste de travail ; et Afficher l'aide, qui est passée d'Alt+V à **F1** (Alt+V est Vue complète sur l'écran du compte rendu, et le bouton Aide fonctionne toujours). Chaque commande actionne le même bouton que la souris ; elle est donc grisée par la même capacité : Signer le dossier, Finaliser et Signer et passer au suivant exigent `surgical:report:sign-out` ; Accepter exige `case:pool:claim` ; Passer exige `case:pool:pass`. Vingt-neuf commandes enregistrées n'ont toujours aucun gestionnaire d'écran ; chacune est listée avec sa raison dans `docs/product/KNOWN_GAPS.md`, et un test de génération échoue lorsqu'une nouvelle commande est enregistrée sans écouteur et sans raison listée. Le message au collaborateur est un avis d'application envoyé au nom de la personne ; il n'exige donc aucune autorisation de messagerie ; il est conservé en anglais, comme le message de demande de révision.
**Limites connues.** Démonstration : le registre est conservé dans le stockage de démonstration du navigateur et aucun contrat serveur n'existe pour lui dans `docs/architecture/`. La liste des commandes est du code, pas des données. L'import groupé n'avertit pas d'un raccourci qui entre en conflit avec une commande extérieure au fichier ; seule la fenêtre Modifier le vérifie.

### Macros (onglet) {#screen-tab-macros}
Breadcrumb: Accueil > Configuration > Macros

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Macros**
**2. Élément de maintenance :** Mes macros (macros de texte et import AutoText de Word)

**3. Objectif métier et périmètre.** Une macro est un bloc de texte mis en forme qui se développe lorsqu'une personne saisit son raccourci (par exemple `;normcolon`) dans l'éditeur de compte rendu et appuie sur Espace. Les macros existent à l'un de trois niveaux : Entreprise (tous les établissements), Établissement (un laboratoire exécutant) ou Personnel (une personne). Chacun peut conserver des macros personnelles et d'établissement ; les macros d'entreprise et les macros personnelles d'autres personnes sont réservées aux administrateurs. C'est aussi ici que se charge une bibliothèque de texte automatique : **Importer depuis Word** lit les entrées AutoText et Blocs de construction d'un modèle Word.

**4. Prérequis et dépendances.** Les macros d'établissement sont classées sous un laboratoire exécutant du [Dictionnaire des établissements](#screen-facility-dictionary) ; si vous l'ignorez, la liste des établissements est vide et une macro d'établissement ne peut pas être enregistrée. La liste des polices de l'éditeur est fixée dans l'onglet et ne lit pas les [Polices approuvées](#screen-fonts).

Setup step: Tier 3, step 5
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: tab-macros - Onglet Macros avec la liste à gauche et l'éditeur de macro à droite]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Onglets de niveau | **Toutes** (administrateurs uniquement), **Entreprise**, **Établissement**, **Personnel**, chacun avec un compteur | Facultatif | **Toutes** liste chaque macro regroupée par Entreprise, puis par établissement, puis par personne, triée par nom. Un administrateur ouvre sur **Toutes** ; les autres ouvrent sur **Entreprise**. | Toutes (administrateurs) ou Entreprise |
| Sélectionner un établissement | Liste de choix des laboratoires exécutants | Facultatif | Affichée dans l'onglet **Établissement** ; la liste reste vide tant qu'un établissement n'est pas choisi. | Aucun |
| Liste des macros | Boutons indiquant le nom et le raccourci | Sans objet | Sélectionne une macro à modifier. | Sans objet |
| + Nouveau | Bouton | Sans objet | Démarre une nouvelle macro au niveau courant. | Sans objet |
| Importer depuis Word | Bouton de fichier, accepte `.dotx`, `.dotm`, `.docx`, `.docm` | Facultatif | Ouvre la fenêtre d'import ci-dessous. | Sans objet |

#### Éditeur de macro

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom de la macro | Texte | Obligatoire | Le nom de la macro. | Aucun |
| Raccourci de déclenchement | Texte commençant par `;` | Obligatoire | Saisi dans l'éditeur, puis Espace, pour développer. Un raccourci qui ne commence pas par `;` est refusé (« Le déclencheur doit commencer par « ; » »). | Aucun |
| Visibilité | Choix : Entreprise, Établissement, Personnel | Obligatoire | Entreprise n'est proposé qu'aux administrateurs (rôles admin, pathologiste-admin, superadmin). Une personne sans droits sur la macro la voit en lecture seule (« Seul un administrateur peut modifier cette macro. »). | Le premier niveau que la personne peut utiliser |
| Établissement | Liste de choix des laboratoires exécutants | Obligatoire lorsque la Visibilité est Établissement | Le laboratoire exécutant auquel appartient la macro. | Aucun |
| Contenu | Éditeur de texte enrichi | Facultatif | Le texte qui remplace le raccourci. Polices proposées : Arial, Times New Roman, Courier New, Roboto. | Vide |
| Supprimer | Bouton | Sans objet | Demande « Supprimer la macro (nom) ? » et désactive la macro (elle quitte la liste). Affiché uniquement lorsque vous pouvez la modifier. | Sans objet |
| Créer la macro / Enregistrer les modifications | Bouton | Sans objet | Enregistre. Désactivé tant que rien n'a changé. | Sans objet |

#### Fenêtre Importer depuis Word

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Liste à cocher des entrées | Une case par entrée AutoText ou Bloc de construction, avec un aperçu de 100 caractères | Facultatif | Indique combien d'entrées ont été trouvées. Les entrées **AutoText** sont cochées ; les autres types de blocs de construction (pages de garde, en-têtes, tableaux) sont listés mais non cochés. Les entrées sans texte sont ignorées à l'import. | Entrées AutoText cochées |
| Importer en tant que | Choix : Personnel, Établissement, Entreprise | Obligatoire | Le niveau auquel les macros importées sont créées. | Personnel |
| Établissement | Liste de choix des laboratoires exécutants | Obligatoire lorsque Importer en tant que est Établissement | Erreur « Sélectionnez l'établissement auquel appartiennent ces macros importées. » si vide. | Aucun |
| Importer N macros | Bouton | Sans objet | Crée une macro par entrée cochée, avec la catégorie Personnalisée. Le raccourci est généré à partir du nom de l'entrée et rendu unique. | Sans objet |

**7. Autorisations.** Ouvrir l'onglet : `screen:configuration:open`. Chacun peut créer et modifier ses propres macros personnelles sans capacité. Créer ou modifier une macro d'entreprise ou d'établissement, ou la macro personnelle d'une autre personne, exige `config:macros:manage` (risque élevé, audité ; vérifié dans le service). Admin et Directeur de laboratoire la détiennent par défaut.
**Limites connues.** La liste des polices de l'éditeur est une liste fixe de quatre polices, pas le dictionnaire des Polices approuvées. Supprimer une macro la désactive ; il n'existe aucun écran pour en réactiver une. Les phrases déclenchées par la voix sont distinctes et se trouvent dans l'[onglet Voix](#screen-tab-voice).

### Voix (onglet) {#screen-tab-voice}
Breadcrumb: Accueil > Configuration > Voix

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Voix**
**2. Élément de maintenance :** Intégration vocale, Paramètres utilisateur, Règles de traitement de la parole, Pédale

**3. Objectif métier et périmètre.** Un onglet à quatre zones. La première (Intégration vocale) est un commutateur de déploiement pour tout le monde. Les trois autres sont personnelles ou propres à un poste de travail : le profil d'accent régional, les macros vocales de la personne (phrase prononcée vers texte obtenu, appelées « Macros vocales et de dictée ») et les associations de la pédale de cet ordinateur.

**4. Prérequis et dépendances.** Aucun. Les commandes vocales elles-mêmes sont définies dans le [Registre des actions](#screen-tab-actions).

Setup step: Tier 3, step 6
Requires: [Registre des actions](#screen-tab-actions)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: tab-voice - Onglet Voix avec Intégration vocale, accent, sensibilité du micro, macros de dictée et pédale]

**6. Référence des champs.**

#### Intégration vocale (pour tout le déploiement)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Commandes vocales et dictée | Commutateur Activé / Désactivé | Facultatif | Lorsqu'il est désactivé, le bouton du microphone est grisé et la voix est indisponible pour tout le monde. Le raffinement de la dictée par IA est disponible automatiquement si le déploiement a une clé d'IA configurée. Le paramètre d'environnement `VITE_VOICE_ENABLED=false` supprime entièrement la voix et prévaut sur ce commutateur. | Activé |
| Reconnaître les commandes anglaises de façon approximative dans les autres langues | Commutateur Activé / Désactivé | Facultatif | Lorsqu'une personne dicte en français, en allemand, en néerlandais ou en coréen et que rien dans cette langue ne correspond, une approximation peut quand même être exécutée comme une commande anglaise. Désactivez-le une fois que les commandes propres à la langue sont en place. Les phrases anglaises exactes fonctionnent toujours. | Activé |
| Instructions de raffinement par IA, par langue | Liste dépliable en lecture seule | Sans objet | Affiche les instructions exactes envoyées à l'IA lorsqu'elle raffine un texte dicté, par convention d'orthographe anglaise et par autre langue. Les entrées qui n'ont pas encore été vérifiées par un locuteur natif sont signalées « relecture par un locuteur natif nécessaire ». | Sans objet |

#### Paramètres utilisateur

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Profil d'accent régional | Choix parmi 15 profils d'accent anglais, plus français (France), allemand, néerlandais (Belgique), néerlandais (Pays-Bas), espagnol (Espagne) et coréen | Facultatif | Définit la langue que le moteur de reconnaissance vocale écoute. Conservé par personne connectée. Néerlandais (Belgique) affiche une note indiquant qu'aucun locuteur belge ne l'a testé. | Anglais standard (États-Unis) |
| Sensibilité du micro | Curseur, affiché à 85 % | Sans objet | Affichage seulement. Le curseur n'est relié à rien ; le gain est géré par le navigateur. | 85 % (affichage) |

#### Macros vocales et de dictée

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Tester la voix | Bouton | Sans objet | Écoute et affiche « Entendu : (texte) » afin que la personne puisse vérifier le microphone. | Sans objet |
| Import groupé | Bouton de fichier CSV | Facultatif | Une macro par ligne, sous la forme `name, resulting text`. Tout ce qui suit une seconde virgule est supprimé. | Sans objet |
| Ajouter une macro | Bouton | Sans objet | Ajoute une ligne vide en mode modification, appartenant à la personne connectée. | Sans objet |
| Rechercher des macros | Texte | Facultatif | Filtre selon le nom prononcé ou le texte obtenu. | Vide |
| Filtre de statut | Choix : Tous les statuts, Actives uniquement, Inactives uniquement | Facultatif | Filtre la liste. | Tous les statuts |
| Nom | Texte | Obligatoire en pratique | La phrase prononcée. | Nouvelle macro : vide |
| Texte résultant | Texte | Facultatif | Le texte écrit lorsque la phrase est entendue. | Vide |
| Statut | Bascule Actif / Inactif, modifiable uniquement en mode modification | Facultatif | Une macro inactive n'est pas utilisée. | Actif |
| Modifier, Enregistrer, Supprimer (icône de corbeille) | Boutons de ligne | Sans objet | **Supprimer** retire la ligne immédiatement, sans confirmation. | Sans objet |

#### Pédale (ce poste de travail)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Pédale 1, Action principale | Touche ou bouton de pédale associé | Facultatif | Appuyer pour parler à la validation, confirmer le nombre de pièces à l'inclusion. | Non associée |
| Pédale 2, Avancer / Suivant | Touche ou bouton de pédale associé | Facultatif | Champ suivant à la validation, imprimer ou graver le suivant en microtomie. | Non associée |
| Pédale 3, Pause / Relire le dernier segment | Touche ou bouton de pédale associé | Facultatif | Dictée de validation uniquement. La pause fonctionne une fois la pédale associée ; la relecture exige aussi l'accès au microphone, qui peut être demandé lors de la première séance de validation. | Non associée |
| Associer, Réassocier, Annuler, Effacer | Boutons | Sans objet | **Associer** attend le prochain appui sur la vraie pédale et enregistre ce qu'elle envoie (une touche de clavier ou un bouton de type manette). L'association appartient au navigateur de cet ordinateur, pas au compte de la personne. | Sans objet |

**7. Autorisations.** Ouvrir l'onglet : `screen:configuration:open`. Les commutateurs de l'Intégration vocale exigent `config:voice:manage` (risque élevé, audité ; vérifié à l'enregistrement du paramètre, et la zone s'affiche en lecture seule sans elle). L'accent, les macros vocales et la pédale sont personnels ou propres à un poste de travail et n'exigent aucune capacité. Admin et Directeur de laboratoire détiennent `config:voice:manage` par défaut.
**Limites connues.** Les deux commutateurs de déploiement sont enregistrés dans la configuration système stockée dans le navigateur. Un contrat serveur pour la configuration système existe (`docs/architecture/DICTIONARIES_CONFIG_API.md`, `ISystemConfigService`) mais cet onglet ne l'appelle pas encore : avec le serveur API connecté, les commutateurs ne sont donc pas conservés d'une session à l'autre. Les macros vocales ont un contrat serveur (`docs/architecture/MACROS_API.md`). La Sensibilité du micro est un affichage seulement. Il n'existe aucun écran pour publier des macros vocales partagées (d'entreprise ou d'établissement) ; l'onglet gère celles de la personne connectée.

### Dérogations de voie d'examen macroscopique {#screen-grossing_route_overrides}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Dérogations de voie d'examen macroscopique

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Dérogations de voie d'examen macroscopique

**3. Objectif métier et périmètre.** Une dérogation indique que, pour un établissement, un type de prélèvement utilise toujours une voie de macroscopie nommée. Après l'accession, PathScribe propose un modèle de macroscopie pour chaque prélèvement. Un prélèvement qui correspond à une dérogation active (même établissement et exactement le même type de prélèvement) prend la voie de la dérogation avec une confiance de 100 pour cent et n'est pas du tout envoyé à l'IA. Tout ce qui n'est pas listé suit l'acheminement normal.

**4. Prérequis et dépendances.** L'établissement provient du [Dictionnaire des établissements](#screen-facility-dictionary) et le type de prélèvement doit correspondre exactement au champ type d'une entrée du [Dictionnaire des spécimens](#screen-specimens) (la saisie propose les types connus). Si vous ignorez les établissements, la liste Établissement est vide.

Setup step: Tier 3, step 7
Requires: [Dictionnaire des établissements](#screen-facility-dictionary), [Dictionnaire des spécimens](#screen-specimens)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-grossing_route_overrides - Liste des dérogations de voie d'examen macroscopique et Ajouter une dérogation]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Établissement (liste) | Nom de l'établissement | Sans objet | L'établissement auquel s'applique la dérogation. | Sans objet |
| Type de spécimen (liste) | Texte | Sans objet | Le type de prélèvement auquel s'applique la dérogation. | Sans objet |
| Itinéraire de dérogation (liste) | Nom de la voie | Sans objet | La voie attribuée au prélèvement. | Sans objet |
| Statut (liste) | Actif / Inactif | Sans objet | Seules les dérogations actives sont appliquées. | Sans objet |
| Modifier, Supprimer | Boutons de ligne | Sans objet | **Supprimer** supprime la dérogation immédiatement, sans confirmation. Passez la dérogation à Inactif pour la conserver. | Sans objet |

#### Fenêtre Ajouter une dérogation d'itinéraire d'examen macroscopique et Modifier

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Établissement | Liste de choix des établissements (depuis le [Dictionnaire des établissements](#screen-facility-dictionary)) | Obligatoire | Mis en correspondance avec l'établissement du dossier à l'accession. | Le premier établissement de la liste |
| Type de spécimen | Texte avec suggestions tirées des valeurs de type du Dictionnaire des spécimens | Obligatoire | Doit être identique au type du Dictionnaire des spécimens (la correspondance est exacte). Erreur « Requis » lorsque vide. Une valeur qui ne correspond à aucun type du dictionnaire est acceptée et ne correspond simplement jamais. | Aucun |
| Itinéraire de dérogation | Choix : Examen macroscopique de tissu standard (Itinéraire A), Examen macroscopique de liquide / bloc cellulaire (Itinéraire B), Histologie uniquement / Triage direct (Itinéraire C) | Obligatoire | La voie que reçoit le prélèvement. | Examen macroscopique de tissu standard (Itinéraire A) |
| Statut | Commutateur Actif / Inactif | Facultatif | Une dérogation inactive est ignorée. | Actif |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Ajouter, modifier, supprimer : `config:grossing-routes:manage` (risque élevé, audité ; vérifié dans le service). Admin et Directeur de laboratoire la détiennent par défaut.
**Limites connues.** Les données de démonstration contiennent une dérogation (Rein vers la voie C à l'établissement `c-westside`). La dérogation n'est appliquée que par la proposition de modèle de macroscopie qui s'exécute après l'accession. Une voie choisie au niveau d'un service ([Services](#screen-departments)) n'est pas modifiée par une dérogation.

### Mode de validation de l'encrage {#screen-inking_validation_mode}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Mode de validation de l'encrage

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Mode de validation de l'encrage

**3. Objectif métier et périmètre.** Le contrôle structuré de l'encrage examine chaque marge d'un dossier lorsqu'une personne sélectionne **Terminer la macroscopie**, puis de nouveau à la validation. Il détecte trois sortes de problèmes : une marge non marquée comme examinée (gravité 2), une marge sans encre enregistrée (gravité 2) et un code de couleur d'encre qui ne figure pas dans le dictionnaire actif des couleurs d'encre (gravité 3). Cet écran choisit, pour un établissement, entre **Avertissement seulement** et **Application stricte**.

**Ce que fait le code aujourd'hui (vérifié dans la source).** Le texte de l'écran indique que l'Application stricte bloque définitivement **Terminer la macroscopie** en cas de problème de gravité 2. Le contrôle qui arrête Terminer la macroscopie ne le fait dans aucun des deux modes :
- La gravité 3 (couleur d'encre non associée) bloque toujours Terminer la macroscopie. À la validation, elle bloque, ou demande une dérogation à une personne détenant `case:inking-gate:override`.
- La gravité 2 à Terminer la macroscopie affiche une confirmation **Continuer avec une note consultative**, puis laisse la macroscopie se terminer, dans les deux modes.
- La seule différence visible aujourd'hui est l'avis affiché sur l'écran Macroscopie : « Application stricte : les problèmes indiqués ci-dessous bloqueront la validation tant qu'ils ne seront pas corrigés » contre « Avertissement et avis : les problèmes indiqués ci-dessous ne bloquent pas la validation ».
- Si le dictionnaire des couleurs d'encre ne peut pas être chargé, le contrôle refuse de poursuivre (palette indisponible).
La différence entre le texte de l'écran et le contrôle est listée pour Pete dans `open-questions/ch4.md`.

**4. Prérequis et dépendances.** Le contrôle compare les couleurs d'encre enregistrées aux couleurs d'encre actives. Si vous ignorez [Couleurs d'encre](#screen-ink_colors), chaque couleur d'encre enregistrée est non associée (gravité 3), ce qui bloque Terminer la macroscopie. Les établissements proviennent du [Dictionnaire des établissements](#screen-facility-dictionary).

Setup step: Tier 3, step 8
Requires: [Couleurs d'encre](#screen-ink_colors), [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-inking_validation_mode - Mode de validation de l'encrage avec la liste de choix des établissements et les deux options]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Établissement | Liste de choix des établissements | Obligatoire | Le mode est enregistré par établissement. Choisir un autre établissement charge son mode enregistré. | Le premier établissement de la liste |
| Mode de validation de l'encrage | Choix (boutons radio) : Avertissement seulement, Application stricte | Obligatoire | Avertissement seulement : les problèmes de gravité 2 sont signalés mais ne bloquent jamais (valeur par défaut). Application stricte : décrite à l'écran comme bloquant Terminer la macroscopie en cas de gravité 2 ; voir « Ce que fait le code aujourd'hui » ci-dessus. La gravité 3 bloque toujours. | Avertissement seulement |
| Enregistrer | Bouton | Sans objet | Activé uniquement après une modification. Affiche « Enregistré. » ou « Vous n'avez pas l'autorisation de modifier ceci. » Une modification est écrite dans le journal d'audit sous la forme « Mode de validation de l'encrage modifié » avec l'ancien et le nouveau mode. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier le mode : `config:inking-validation-mode:manage` (risque élevé, audité ; vérifié dans le service pour cet établissement). Admin et Directeur de laboratoire la détiennent par défaut. Passer outre un blocage de gravité 3 à la validation : `case:inking-gate:override`, détenue par Admin et Directeur de laboratoire.
**Limites connues.** Partiel pour la raison ci-dessus : le mode est enregistré et affiché, mais l'Application stricte n'ajoute aucun blocage définitif à Terminer la macroscopie. Le paramètre est conservé dans le stockage des paramètres de site du navigateur ; aucun contrat serveur pour les paramètres de site n'existe encore dans `docs/architecture/`.

## Listes de travail d'histologie, postes d'inclusion, de microtomie et de coloration {#ch4-histology}
Breadcrumb: Accueil > Gestion des lots

Cette partie couvre les écrans de paillasse du flux de travail d'histologie. Ce sont des écrans de travail quotidien, pas des écrans de maintenance : chacun utilise donc la présentation de référence : ce qu'il affiche, ce qu'il faut configurer d'abord, et quels paramètres modifient son comportement. Il n'existe pas d'écran de configuration distinct pour les postes eux-mêmes. Le comportement d'un poste se définit dans des écrans d'autres chapitres : les écrans [Postes de numérisation](#screen-scan_stations) et [Profils d'imprimante](#screen-printer_profiles) (quelle imprimante un poste utilise), le [Concepteur d'étiquettes](#screen-label_designer) (ce qu'affiche l'étiquette imprimée), [Champs obligatoires](#screen-field_requirements) (quels champs doivent être renseignés, par page : `batchManagement`, `embedding`, `microtomy`, `slideDistribution`) et l'[onglet Voix](#screen-tab-voice) (pédale). Un poste de coloration n'a pas d'écran propre : les cycles de coloration sont des lots (voir Gestion des lots), et la liste des colorations est le [Catalogue diagnostique](#screen-stains).

### Gestion des lots {#screen-batch-management}
Breadcrumb: Accueil > Gestion des lots

**Statut :** Réalisé

**1. Navigation :** Accueil > **Gestion des lots** (pas dans Configuration). S'ouvre avec `screen:batch-management:open`.
**2. Élément de maintenance :** Sans objet. C'est un hub de travail.

**3. Objectif métier et périmètre.** La Gestion des lots suit des groupes de cassettes et de lames à travers les étapes de traitement (Décalcification / Traitement spécial, Traitement, Inclusion, Microtomie / Coupe, Coloration, Vérification finale, Envoi externe, Traitement cytologique, Coloration cytologique, Imagerie cytologique) par code-barres de contenant. Elle assure la numérisation de la chaîne de conservation, la réconciliation, et un ensemble de pages de files et de rapports accessibles depuis des tuiles. Un lot est un contenant (un portoir de coloration, un panier de processeur de tissus, un plateau d'archivage, un récipient de décalcification ou un lot ad hoc) avec un code-barres maître et un manifeste des éléments qui y ont été numérisés.

**4. Prérequis et dépendances.** L'écran lit le poste de numérisation défini pour cet ordinateur (pour préremplir le poste de travail cible et pour limiter la File d'élimination et le Chargement en attente à l'établissement du poste), les lots de réactifs et les colorations pour les lots de coloration et de cytologie, et les établissements ayant le rôle de Laboratoire de référence pour les lots d'envoi. Sans aucun de ces éléments, la page s'ouvre quand même, mais les champs correspondants de **Nouveau contenant** restent vides.

Setup step: Reference, not part of setup
Requires: [Postes de numérisation](#screen-scan_stations), [Dictionnaire des établissements](#screen-facility-dictionary), [Lots de réactifs et de solutions](#screen-reagent_lots), [Catalogue diagnostique](#screen-stains), [Champs obligatoires](#screen-field_requirements)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-batch-management - Gestion des lots avec les tuiles d'étapes, les tuiles d'outils et la liste des lots actifs]

**6. Référence des champs.** Cette page est une page de référence : les tableaux listent les commandes, les colonnes et les filtres.

#### Page du hub

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Tuiles d'étapes (une par étape de traitement) | Tuile avec le nombre de lots ouverts | Facultatif | Sélectionnez une tuile pour n'afficher que les lots à cette étape ; sélectionnez-la de nouveau pour réinitialiser. | Aucun filtre |
| Scanner ou saisir un code-barres de lot maître | Texte ou saisie par scanner | Facultatif | Un code-barres de lot ouvre ce lot. Un code `CONT-` ou `RACK-` scanné qui correspond à un portoir réutilisable disponible ouvre **Nouveau contenant** avec ce portoir renseigné. Un portoir déjà sorti, ou un code inconnu, affiche une erreur et émet un signal sonore. | Vide |
| Nouveau contenant | Bouton | Sans objet | Ouvre la fenêtre ci-dessous. | Sans objet |
| Actifs et en réconciliation | Liste avec compteur | Sans objet | Lots ouverts, avec le nombre d'éléments et l'indicateur STAT. | Sans objet |
| Terminés et interrompus | Liste avec compteur | Sans objet | Lots clos. | Sans objet |
| Tuiles d'outils | Élimination, Rapport de traitement des déchets, Conservations en attente, Chargement en attente, Réimpression d'étiquettes, Numérisation des lames, Moniteur graveur, Carnet des équipements | Sans objet | Chacune ouvre l'une des pages décrites ci-dessous. | Sans objet |

#### Fenêtre Nouveau contenant

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Type de contenant | Choix : Portoir de coloration, Panier de processeur de tissus, Plateau d'archivage, Récipient de décalcification, Lot ad hoc | Obligatoire | Le genre de support. La liste des portoirs réutilisables est filtrée sur les portoirs de ce type qui sont Disponibles. | Portoir de coloration |
| Poste de travail cible | Liste de choix des postes de numérisation, ou « Aucune station » | Facultatif | Choisir un poste définit l'Étape de traitement d'après l'étape propre au poste. Si le poste correspond normalement à une autre étape, un avertissement vous invite à vérifier. | Le poste défini pour cet ordinateur |
| Étape de traitement | Choix parmi les dix étapes | Obligatoire | Détermine lesquels des champs supplémentaires ci-dessous s'affichent. | Décalcification / Traitement spécial, ou d'après le poste |
| Protocole / Paramètres d'exécution | Texte | Obligatoire (verrouillé) | Par exemple « Cycle H&E standard de nuit ». Ne peut pas être désactivé dans Champs obligatoires. | Aucun |
| Priorité | Choix : Routine, STAT | Obligatoire | Marque le lot. | Routine |
| Type de solution | Choix : EDTA, FNT 10 % (fenêtre de fixation), Décalcification rapide (acide formique/HCl) | Obligatoire à une étape de décalcification | La solution de décalcification. | Première option |
| Durée cible / Minuterie d'alerte | Heures et minutes | Obligatoire à une étape de décalcification (verrouillé) | Définit la minuterie. Une alerte d'avertissement s'affiche 15 minutes avant la cible. | 4 h 0 min |
| Laboratoire de référence de destination | Liste de choix des établissements ayant le rôle de Laboratoire de référence | Obligatoire à une étape d'envoi externe (verrouillé) | Où va le lot. S'il n'en existe aucun, la fenêtre indique d'en ajouter un d'abord dans les paramètres de l'établissement. | Aucun |
| Examen / Panel demandé (facultatif) | Texte | Facultatif (peut être rendu obligatoire) | L'examen demandé au laboratoire de référence. | Vide |
| Protocole de coloration | Liste de choix des colorations (depuis le [Catalogue diagnostique](#screen-stains)) | Obligatoire à une étape de coloration cytologique (verrouillé) | La coloration à laquelle le lot est destiné. | Aucun |
| Lots de réactifs / solutions utilisés | Liste à cocher des lots actifs (depuis [Lots de réactifs et de solutions](#screen-reagent_lots)) | Facultatif (peut être rendu obligatoire) à une étape de coloration | Enregistre les lots du cycle. Peuvent être scannés plus tard. | Aucun |
| Mode d'identification du contenant | Choix : Étiquette jetable, Portoir réutilisable | Obligatoire | Jetable : le système génère une étiquette horodatée à usage unique. Réutilisable : un portoir gravé existant est utilisé et aucune étiquette n'est imprimée. | Étiquette jetable |
| ID du portoir | Scan ou texte | Obligatoire pour Portoir réutilisable (verrouillé) | Le portoir à sortir. | Vide |
| Générer et imprimer / Démarrer la séance | Bouton | Sans objet | Crée le lot. Affiche « Encore requis : (champs) » tant que les champs obligatoires ne sont pas renseignés. Pour une étiquette jetable, l'étape suivante affiche le Code-barres du lot maître avec **Imprimer** ; pour un portoir, elle indique que le portoir est maintenant sorti et que rien n'est imprimé. **Continuer, scanner les éléments** ouvre le lot. | Sans objet |

#### Page de détail du lot

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Scanner un code-barres de cassette ou de lame | Saisie par scanner (aucun clic nécessaire) | Facultatif | Ajoute l'élément au manifeste. Rejeté avec un message lorsque le code ne correspond à aucune cassette ni lame, figure déjà dans ce lot ou se trouve dans un autre lot actif. | Sans objet |
| Manifeste | Liste avec compteur | Sans objet | Éléments du lot, chacun avec **Déplacer** (vers un autre lot actif) et **Retirer**. | Sans objet |
| Démarrer la réconciliation | Bouton | Sans objet | Lance la vérification hors processus : scannez chaque élément physique à sa sortie du support. Les éléments affichent Apparié, Manquant ou Inattendu. | Sans objet |
| Terminer le lot | Bouton | Sans objet | Désactivé tant que des éléments sont manquants ou inattendus (l'infobulle donne les nombres), et refusé tant qu'un écart de chaîne du froid n'est pas pris en compte. | Sans objet |
| Forçage superviseur (Forcer et terminer) | Lien et fenêtre avec un **Motif** obligatoire | Motif obligatoire | Termine malgré les écarts. Consigné au nom de la personne. Exige `batch:reconciliation:override`. | Sans objet |
| Interrompre le lot | Bouton et fenêtre avec un **Motif** obligatoire | Motif obligatoire | Le lot et le manifeste sont conservés pour l'audit, marqués Interrompu, et n'acceptent plus de scans. Exige `batch:run:abort`. | Sans objet |
| Accuser réception (écart de chaîne du froid) | Bouton et fenêtre avec une **Note** obligatoire | Note obligatoire | Affiché lorsqu'un contenant intelligent a signalé une température hors plage. Exige `batch:cold-chain-excursion:acknowledge`. | Sans objet |
| Transférer vers le traitement | Bouton | Sans objet | Déplace les éléments vers un nouveau lot de Traitement. | Sans objet |
| Libérer le portoir | Bouton | Sans objet | Remet un portoir réutilisable à l'état Disponible. | Sans objet |
| Statut d'envoi | Texte | Sans objet | Pour un lot d'envoi : expédié, en transit, livré, résultat reçu (avec un lien lorsque le résultat est un PDF). | Sans objet |
| Rapports d'instruments ; Panneau de chaîne du froid | Texte | Sans objet | État de l'instrument de cytologie ; relevés de température d'un lot placé dans un contenant intelligent. | Sans objet |

#### File d'élimination

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Scanner un code-barres de cassette ou de lame | Saisie par scanner | Facultatif | Élimine l'élément immédiatement et affiche brièvement une confirmation. Exige `retention:material:dispose`. | Sans objet |
| Éligibles à l'élimination | Liste avec compteur | Sans objet | Blocs et lames dont la durée de conservation est écoulée, sans blocage actif et pas déjà éliminés, recalculés à chaque fois à partir des données du dossier. Limitée à l'établissement du poste ; sans poste de numérisation défini, tous les lieux s'affichent. | Sans objet |

#### Rapport de traitement des déchets

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtrer par établissement | Liste de choix | Facultatif | Limite le rapport. | Tous les établissements |
| Filtrer par type de matériau | Liste de choix | Facultatif | Limite le rapport. | Tous les types de matériau |
| Date de début, Date de fin | Dates | Facultatif | Limite selon la date d'élimination. | Vide |
| Total éliminé | Nombre | Sans objet | Nombre de lignes affichées. | Sans objet |
| Colonnes | Éliminé, Type, ID de l'élément, Dossier, Prélèvement, Éliminé par, Emplacement | Sans objet | Une ligne par élément éliminé. | Sans objet |
| Exporter | Bouton | Sans objet | Télécharge un CSV avec les mêmes colonnes. Exige `retention:disposal-report:export`. | Sans objet |

#### Conservations en attente

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher dossier, motif ou personne | Texte | Facultatif | Filtre la liste. | Vide |
| Colonnes | Dossier, Motif, Note, Placée par, Placée le, Actions | Sans objet | Une ligne par blocage actif (« N blocages actifs »). | Sans objet |
| Lever | Bouton et fenêtre avec une **Note de levée** | Note obligatoire | Lève le blocage. Exige `case:retention-hold:release`. | Sans objet |
| Exporter en CSV | Bouton | Sans objet | Exige `retention:holds-queue:export`. | Sans objet |

#### Chargement en attente

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Scannez ou saisissez pour rechercher | Texte ou scanner | Facultatif | Filtre par id de cassette ou de lame, dossier ou prélèvement. **Effacer** réinitialise. | Vide |
| Actualiser | Bouton | Sans objet | Recalcule la file. | Sans objet |
| En attente de chargement dans un lot | Liste regroupée par dossier | Sans objet | Cassettes et lames imprimées ou gravées mais non scannées dans un lot actif, déduites à chaque fois des données du dossier. Limitée à l'établissement du poste ; sans poste défini, tous les établissements s'affichent. | Sans objet |

#### Réimpression d'étiquettes

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Enregistré du, Enregistré au | Dates | Facultatif | Recherche les dossiers par date d'accession. | Vide |
| Numéro d'enregistrement du, Numéro d'enregistrement au | Texte | Facultatif | Recherche les dossiers par plage de numéros d'accession. Au moins un des quatre est nécessaire ; un filtre vide ne trouve rien. | Vide |
| Rechercher les dossiers | Bouton | Sans objet | Liste les dossiers trouvés, du plus ancien au plus récent, chacun avec une case **Réimprimer** et ses prélèvements. | Sans objet |
| Étiquettes | Cases à cocher : Cassettes, Contenants de prélèvement, Demande | Facultatif | Quels types d'étiquettes imprimer. | Aucune cochée |
| Imprimante de cassettes | Liste de choix des imprimantes | Obligatoire lorsque des cassettes sont choisies | Erreur « Choisissez d'abord l'imprimante de cassettes. » | Aucune |
| Réimprimer les étiquettes | Bouton | Sans objet | Imprime une étiquette à la fois (à environ 0,25 seconde d'intervalle), avec l'avancement. Chaque étiquette est auditée. Exige `label:batch:reprint` (détenue par Histotechnicien et Admin par défaut). Ensuite, un récapitulatif affiche Imprimées, en échec et bloquées par la protection de l'impression à la demande, et **Relancer N étiquettes en échec**. | Sans objet |

#### Numérisation des lames

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| File de numérisation | Tableau : Choisir, Dossier, Lame, Priorité, Orientée vers, Portoir / emplacement | Sans objet | Lames orientées vers le numérique au poste de distribution des lames. | Sans objet |
| Scanner de lames | Liste de choix des équipements de type « Scanner de lames » (depuis [Équipements](#screen-equipment)) | Obligatoire | S'il n'en existe aucun, la page indique d'en ajouter dans Configuration, Équipements. | Aucun |
| Charger N lames | Bouton | Sans objet | Crée un lot de numérisation sur le scanner. Exige `wsi:scan-batch:load`. | Sans objet |
| Lots de numérisation | Tableau : Lot, Scanner, Statut, Avancement, Chargé, Actions | Sans objet | L'avancement indique les lames numérisées, en échec et en attente. Un lot qui n'a pas été envoyé affiche « Non envoyé (code, heure) » avec une relance. Les échecs du CQ d'image indiquent le motif. | Sans objet |
| Envoyer, Décharger | Boutons | Sans objet | **Envoyer** (`wsi:scan-batch:send`) envoie le manifeste de numérisation au moteur d'interfaces. **Décharger** (`wsi:scan-batch:unload`) clôt le lot une fois que chaque lame a un résultat ; les lames qui n'ont pas été numérisées retournent dans la file. | Sans objet |

#### Moniteur graveur

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtrer par organisation | Liste de choix | Facultatif | Limite les appareils. | Toutes les organisations |
| Appareils | Cartes avec statut, avertissements, avertissements de consommables par couleur de cassette et « Signalé (heure) » | Sans objet | Un récapitulatif en lecture seule actualisé environ toutes les 30 secondes. Un badge **Simulé** s'affiche lorsqu'aucune source en direct n'est configurée. | Sans objet |
| Lancer les diagnostics du moteur | Lien | Sans objet | Ouvre la page de diagnostic propre au moteur de cassettes lorsque l'appareil signale un lien. | Sans objet |

#### Carnet des équipements

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Tableau des équipements | Chaque instrument actif avec son état de maintenance et d'étalonnage | Sans objet | Les lignes avec une alerte d'entretien sont mises en évidence. L'ajout ou la modification d'équipements se fait dans [Équipements](#screen-equipment). | Sans objet |
| Nouvelle entrée | Bouton par instrument | Sans objet | Consigne une maintenance ou un étalonnage. Exige `equipment:maintenance:record` (détenue par Histotechnicien, Cytotechnicien, Technologue en biologie moléculaire, Admin et Directeur de laboratoire). | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:batch-management:open` (Histotechnicien, Cytotechnicien, Technologue en biologie moléculaire et Admin). Histotechnicien, Cytotechnicien et Technologue en biologie moléculaire démarrent aussi avec `batch:reconciliation:override`, `batch:run:abort`, `batch:cold-chain-excursion:acknowledge` (toutes à risque élevé, auditées), `retention:material:dispose`, `retention:disposal-report:export`, `retention:holds-queue:export` et les trois capacités `wsi:scan-batch:*`. Admin ouvre l'écran mais n'en détient aucune ; Admin détient bien `label:batch:reprint` et `equipment:maintenance:record`. `case:retention-hold:release` est détenue par chaque rôle de dossier (Pathologiste, Fellow, Interne, AP, Accessioneur et les trois rôles de technologue).
**Limites connues.** Le Moniteur graveur lit une collection Firebase (`engraver_devices`) lorsque Firebase est configuré et affiche des appareils simulés dans le cas contraire ; Firebase n'est pas la base de données de production et cela sera remplacé. Le `README.md` de `src/pages/BatchManagement/` indique encore que la file des conservations en attente n'est pas réalisée ; la page et la tuile existent. Les lots sont Réalisés (`IBatchService` dans `docs/architecture/CASE_WORKFLOWS_API.md`).

### Poste d'inclusion {#screen-embedding-station}
Breadcrumb: Accueil > Poste d'inclusion

**Statut :** Réalisé

**1. Navigation :** Accueil > **Poste d'inclusion**. S'ouvre avec `screen:embedding:open` (Histotechnicien et AP).
**2. Élément de maintenance :** Sans objet. C'est un écran de paillasse.

**3. Objectif métier et périmètre.** L'écran de paillasse d'inclusion. Un technicien scanne une cassette, vérifie le nombre de fragments par rapport à la macroscopie, enregistre le moule et l'orientation, signale tout écart, regroupe les blocs qui partagent un même prélèvement et réimprime l'étiquette de la cassette si nécessaire.

**4. Prérequis et dépendances.** L'impression des étiquettes de cassettes exige un poste de numérisation défini pour cet ordinateur avec l'impression activée et un profil d'imprimante de cassettes ; sans cela, le panneau de l'imprimante indique « Ce poste n'est pas configuré pour l'impression réelle d'étiquettes de cassettes. » L'aperçu de l'étiquette utilise la mise en page du [Concepteur d'étiquettes](#screen-label_designer). Les saisies obligatoires proviennent de [Champs obligatoires](#screen-field_requirements) (page `embedding`).

Setup step: Reference, not part of setup
Requires: [Postes de numérisation](#screen-scan_stations), [Profils d'imprimante](#screen-printer_profiles), [Concepteur d'étiquettes](#screen-label_designer), [Champs obligatoires](#screen-field_requirements)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-embedding-station - Poste d'inclusion avec le résumé du bloc, le nombre de fragments et le panneau d'impression des cassettes]

**6. Référence des champs.** Page de référence : les commandes de l'écran.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Scanner un code-barres de cassette | Scanner ou texte | Obligatoire pour commencer | Charge le bloc. Les scans commençant par `STATION:` sont ignorés. | Vide |
| Barre de contexte | Accession, Patient, DDN, Prélèvement/Bloc, Type | Sans objet | Les champs du patient sont balisés comme données patient pour le masquage des captures d'écran. **Scanner la cassette suivante** efface l'écran. | Sans objet |
| Blocs du prélèvement | Liste | Sans objet | Les blocs du prélèvement et leur statut, le bloc courant étant marqué. | Sans objet |
| Nombre observé ; Confirmer | Nombre entier | Obligatoire sauf s'il est rendu facultatif dans Champs obligatoires | Vérification du nombre de fragments par rapport au nombre attendu issu de la macroscopie. | Vide |
| Taille de moule de base | Choix : 7x7mm, 15x15mm, 24x24mm, 24x30mm, Méga-moule | Facultatif (peut être rendu obligatoire) | Enregistrée sur le bloc. | Aucune |
| Instructions d'orientation | Texte libre, avec saisies rapides « Inclure sur la tranche », « Surface épithéliale vers le bas », « Coupe transversale vers le haut » | Facultatif (peut être rendu obligatoire) | Enregistrées sur le bloc. | Vide |
| Signalement d'un écart | Boutons à un seul clic : Tissu manquant/Cassette vide, Tissu supplémentaire trouvé, Cassette non ouverte/Tissu non traité, Cassette endommagée/Charnière cassée | Facultatif | Signale le bloc ; affiche « Dernier signalement : (motif) (par nom) ». | Aucun |
| Indicateurs d'alerte | Tissu minuscule, Fragile, Décalcification requise | Facultatif | Marque le bloc. | Désactivés |
| Multi-cassette / Bloc scindé | Choix parmi les autres blocs non groupés du même prélèvement | Facultatif | **Grouper comme cassettes scindées** les relie. | Aucun |
| Commentaires du bloc | Tiroir avec le texte du **Commentaire** et **Ajouter un commentaire** | Facultatif (le texte peut être rendu obligatoire) | Commentaires sur le bloc. | Vide |
| Réimpression de cassette | Bouton, puis une fenêtre avec une liste de choix **Motif** | Motif obligatoire | Motifs : Accumulation de paraffine, Code-barres effacé, Bourrage mécanique, Autre. Le nombre et le dernier motif sont affichés. | Sans objet |
| État de l'appareil, Aperçu de l'étiquette | Affichage | Sans objet | L'état de l'imprimante et un aperçu de l'étiquette de la cassette. | Sans objet |
| Pédale | Matériel | Facultatif | La pédale 1 confirme le nombre de fragments (voir l'[onglet Voix](#screen-tab-voice)). | Non associée |

**7. Autorisations.** Ouvrir l'écran : `screen:embedding:open`. Les étapes protégées (réimpression, commentaires) sont consignées avec la personne ; aucune capacité de configuration distincte ne s'applique.
**Limites connues.** Les listes des motifs de réimpression, des tailles de moule et des écarts sont fixées dans le produit et ne sont pas modifiables.

### Poste de microtomie {#screen-microtomy-workstation}
Breadcrumb: Accueil > Poste de microtomie

**Statut :** Réalisé

**1. Navigation :** Accueil > **Poste de microtomie**. S'ouvre avec `screen:microtomy:open` (Histotechnicien).
**2. Élément de maintenance :** Sans objet. C'est un écran de paillasse.

**3. Objectif métier et périmètre.** L'écran de paillasse de coupe. Un technicien scanne un bloc (ou un contenant de décantation ou de liquide pour la cytologie), ajoute les lames à couper par coloration et par niveau, imprime ou grave les étiquettes de lames une par une ou par lot, réimprime avec un motif, signale un bloc comme épuisé et surveille la facturation du bloc.

**4. Prérequis et dépendances.** La liste de choix des colorations est le [Catalogue diagnostique](#screen-stains). L'impression des étiquettes de lames exige un poste de numérisation avec impression de lames et un profil d'imprimante. Les saisies obligatoires proviennent de [Champs obligatoires](#screen-field_requirements) (page `microtomy`).

Setup step: Reference, not part of setup
Requires: [Postes de numérisation](#screen-scan_stations), [Profils d'imprimante](#screen-printer_profiles), [Catalogue diagnostique](#screen-stains), [Champs obligatoires](#screen-field_requirements)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-microtomy-workstation - Poste de microtomie avec la grille des lames et le panneau d'impression]

**6. Référence des champs.** Page de référence : les commandes de l'écran.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Scanner un code-barres de bloc ou de contenant de décantation/liquide | Scanner ou texte | Obligatoire pour commencer | Charge le bloc. | Vide |
| Résumé du bloc | Affichage | Sans objet | Statut, nombre de fragments, tissu, commentaires du bloc, historique des lames précédentes et, pour un bloc matriciel, les carottes qu'il contient avec leur position et leur prélèvement. | Sans objet |
| Grille des lames | Tableau : Niveau, Coloration, Statut d'impression, Actions | Sans objet | Une ligne par lame. **Imprimer** en imprime une ; **Réimprimer** exige un motif ; **Retirer** une lame imprimée exige un motif d'annulation. Une lame **Contrôle** peut être appariée. | Sans objet |
| Coloration (ajout d'une lame) | Liste de choix avec recherche | Obligatoire (peut être désactivé) | La coloration d'une nouvelle lame. | Aucune |
| Doublons | Nombre entier | Facultatif | Combien de lames de la même coloration. | 1 |
| Profondeur du niveau | Nombre en µm | Facultatif (peut être rendu obligatoire) | Profondeur de la coupe. **+ Niveau** coupe un autre niveau de la même coloration. | Vide |
| Motif de réimpression | Choix : Bourrage, Verre rayé, Erreur d'impression, Autre | Motif obligatoire | Consigné avec la lame. | Aucun |
| Motif d'annulation (lame imprimée) | Choix : Coupe endommagée, Demandé par erreur, Tissu épuisé, Autre | Motif obligatoire | Annulation d'une lame déjà imprimée. | Aucun |
| Mode d'impression | Choix : À la demande, Par lot | Facultatif | À la demande utilise **Imprimer/Graver la suivante** pour la lame suivante non imprimée ; Par lot imprime les lames cochées avec une fenêtre d'avancement. | À la demande |
| Commentaires de lame et de bloc | Tiroir avec **Commentaire** et une case « Imprimer ce commentaire sur l'étiquette physique » | Facultatif (le texte peut être rendu obligatoire) | Un commentaire sur une lame peut être imprimé sur l'étiquette. | Vide |
| Bloc épuisé | Bouton et fenêtre avec une **Note** obligatoire | Note obligatoire | Envoie un e-mail au pathologiste prescripteur et bloque la coupe jusqu'à ce qu'il approuve la coupe destructive ou annule ou modifie la demande. L'approbation exige `add-on:exception:approve-destructive-cut`. | Sans objet |
| Panneau Prélèvement liquide / Décantation | Volume total (mL) ; Aspect : Clair, Sanglant, Trouble ; Rendement de décantation : Faible, Modéré, Élevé | Facultatif | Saisies de liquides en cytologie. Affiche une préparation suggérée avec **Accepter la suggestion**. | Vide |
| Panneau de facturation | Affichage | Sans objet | Actes facturables des lames du bloc, avec des avertissements pour les actes en attente d'approbation ; **Vérification complète de la facturation** exige l'autorisation de vérification de la facturation. | Sans objet |
| Pédale | Matériel | Facultatif | La pédale 2 imprime ou grave la lame suivante (voir l'[onglet Voix](#screen-tab-voice)). | Non associée |

**7. Autorisations.** Ouvrir l'écran : `screen:microtomy:open`. Approuver la coupe destructive : `add-on:exception:approve-destructive-cut` (Pathologiste, Fellow, Interne). Vérification complète de la facturation : `billing:applied-code:review`.
**Limites connues.** Les listes de motifs sont fixées dans le produit.

### Poste de distribution des lames {#screen-slide-distribution-station}
Breadcrumb: Accueil > Poste de distribution des lames

**Statut :** Réalisé

**1. Navigation :** Accueil > **Poste de distribution des lames**. S'ouvre avec `screen:slide-distribution:open` (Histotechnicien).
**2. Élément de maintenance :** Sans objet. C'est un écran de paillasse.

**3. Objectif métier et périmètre.** L'écran de remise des lames. Un technicien scanne des lames dans une file de travail, puis oriente chacune soit vers une sortie physique (un pathologiste ou un pool, avec un dossier, un plateau ou un sac de coursier), soit vers un scanner numérique (un portoir et un emplacement), et consigne les exceptions de scan.

**4. Prérequis et dépendances.** Les pathologistes et les pools proviennent de la liste du personnel et des pools de [Sous-spécialités](#screen-subspecialties). Les scanners sont des équipements de type « Scanner de lames » dans [Équipements](#screen-equipment) ; sans eux, la liste de choix indique qu'aucun n'est configuré. Les saisies obligatoires proviennent de [Champs obligatoires](#screen-field_requirements) (page `slideDistribution`).

Setup step: Reference, not part of setup
Requires: [Équipements](#screen-equipment), [Sous-spécialités](#screen-subspecialties), [Champs obligatoires](#screen-field_requirements)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-slide-distribution-station - Poste de distribution des lames avec la file et le panneau de destination]

**6. Référence des champs.** Page de référence : les commandes de l'écran.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Scanner un code-barres de lame ou de bloc/cassette | Scanner ou texte | Facultatif | La file s'allonge en continu. | Vide |
| File de travail | Liste avec compteur | Sans objet | Lames avec coloration, statut et orientation ; **Retirer de la file** en retire une. Peut être regroupée par pool de sous-spécialité ou Non attribuées. | Sans objet |
| Mode de destination | Choix : Sortie physique, Scanner numérique | Obligatoire | Choisit le formulaire de destination. | Sortie physique |
| Pathologiste ou pool | Liste de choix avec recherche | Obligatoire (peut être désactivé) | Qui reçoit la lame. | Aucun |
| ID du dossier de lames, Numéro de plateau, Sac de transport coursier | Texte | Facultatif (chacun peut être rendu obligatoire) | Détail de l'emplacement physique. **Confirmer l'orientation physique** enregistre. | Vide |
| Instrument scanner | Liste de choix des scanners de lames | Obligatoire pour le numérique | Le scanner. | Aucun |
| ID du portoir, Position de l'emplacement | Texte | Facultatif (chacun peut être rendu obligatoire) | Position sur le scanner. **Confirmer l'orientation vers le scanner** enregistre et place la lame dans la file de numérisation. | Vide |
| Lame active, Chaîne de traçabilité | Affichage | Sans objet | Le statut et l'historique de la lame sélectionnée. | Sans objet |
| Déclencher une étiquette de remplacement | Bouton et fenêtre avec **Motif** | Motif obligatoire | Motifs : Étiquette endommagée, Code-barres illisible, Impression maculée, Autre. Conservé dans l'enregistrement de la chaîne de traçabilité. | Sans objet |
| Journal des exceptions de scan | Scans non résolus avec **Résoudre** et une **Note** facultative | Facultatif (la note peut être rendue obligatoire) | Motifs : Code-barres illisible, Accession non assignée, Lame manquante. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:slide-distribution:open`. Aucune capacité de configuration distincte ne s'applique.
**Limites connues.** Les listes de motifs sont fixées dans le produit. Le modèle de données d'orientation (Dossier de lames, Plateau, Sac de transport coursier) n'a pas de dictionnaire derrière lui ; les valeurs sont du texte libre.

## Pathologie numérique, intégration des scanners WSI et paramètres du visualiseur {#ch4-digital-pathology}
Breadcrumb: Accueil > Configuration > Système

Cette partie couvre ce que PathScribe offre aujourd'hui pour la pathologie numérique. Soyez précis sur l'étendue. Il y a deux éléments. Premièrement, les dictionnaires de fournisseurs de [Intégrations fournisseurs](#screen-vendor_integrations), qui sont des listes de noms et d'adresses web. Deuxièmement, la file de numérisation des lames de [Gestion des lots](#screen-batch-management), qui envoie un manifeste de numérisation au moteur d'interfaces et en reçoit un statut en retour. **Non réalisé :** un pilote de scanner propre à un fournisseur ou un connecteur de fournisseur. Aucun écran ne configure un scanner autrement qu'en le nommant comme Équipement de type « Scanner de lames » dans [Équipements](#screen-equipment). PathScribe n'a pas de visionneuse de lames : une lame numérisée affiche l'aperçu de son scanner et s'ouvre dans l'application de pathologie numérique du laboratoire, configurée sous **Images des lames** dans Intégrations fournisseurs (lot 750). La page de visualiseur simulé est une démonstration seulement.

### Intégrations fournisseurs {#screen-vendor_integrations}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Intégrations fournisseurs

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Intégrations fournisseurs (quatre catégories dans une liste à gauche : Pathologie numérique / IA, Visualiseurs WSI, Systèmes de gestion d'images, Imagerie macroscopique et télépathologie)

**3. Objectif métier et périmètre.** Un seul écran contient quatre dictionnaires de produits externes. Chacun est une liste avec **Ajouter**, **Modifier**, **Désactiver / Réactiver** et un commutateur **Afficher les inactifs**. Les entrées ne sont jamais supprimées. Les listes sont des données de référence : des listes de choix et des liens que d'autres parties de PathScribe lisent. Les listes Pathologie numérique / IA, Systèmes de gestion d'images et Imagerie macroscopique sont des noms et des paramètres qui sont enregistrés et affichés ; le produit ne contient aucun connecteur propre à un fournisseur qui agisse sur eux. Seule la catégorie Visualiseurs WSI a un usage effectif : ses paramètres **Images des lames** donnent l'adresse qui ouvre une lame dans l'application de pathologie numérique du laboratoire et l'adresse de l'aperçu de la lame, et le **Modèle d'URL de lancement** de sa liste sert lorsqu'aucune adresse de visionneuse n'y est définie.

**4. Prérequis et dépendances.** Aucun autre que l'accès de la personne. Définissez l'adresse de visionneuse des Images des lames (ou un visualiseur WSI avec un modèle de lancement) avant que des lames puissent être ouvertes dans l'application du laboratoire ; le matériel des scanners est une liste distincte (Équipements).

Setup step: Tier 3, step 9
Requires: Aucun, c'est un point de départ.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-vendor_integrations - Intégrations fournisseurs avec les quatre catégories et la liste des visualiseurs WSI]

**6. Référence des champs.**

#### Pathologie numérique / IA (fenêtre d'ajout et de modification)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom du fournisseur | Texte | Obligatoire | Enregistrer est désactivé lorsque vide. | Aucun |
| Nom du produit | Texte | Obligatoire | Enregistrer est désactivé lorsque vide. | Aucun |
| Modalité | Texte | Obligatoire | Par exemple le domaine clinique couvert par le produit. Enregistrer est désactivé lorsque vide. | Aucun |
| Homologué FDA | Case à cocher | Facultatif | Affiché à côté de l'entrée dans la liste. | Décochée |
| Afficher les inactifs | Commutateur | Facultatif | Affiche les entrées qui ont été désactivées. | Désactivé |

Les données de démonstration contiennent six entrées : Paige Prostate, Ibex Prostate Detect, PathAI AISight Dx, Proscia Concentriq AP-Dx, Hologic Genius Digital Diagnostics (toutes homologuées FDA) et BD FocalPoint GS Imaging System (non marqué comme homologué).

#### Visualiseurs WSI (fenêtre d'ajout et de modification)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom (fournisseur / nom du produit) | Texte | Obligatoire | Enregistrer est désactivé lorsque vide. | Aucun |
| Modèle d'URL de lancement | Adresse web contenant le jeton `{{wsiUniqueId}}` | Facultatif | PathScribe remplace le jeton par l'identifiant de la lame. Utilisé seulement lorsqu'aucune adresse de visionneuse n'est définie dans Images des lames : la première entrée active avec une adresse https utilisable ouvre la lame. Un avertissement s'affiche lorsque le texte ne contient pas le jeton. | Vide |
| Afficher les inactifs | Commutateur | Facultatif | | Désactivé |

Toutes les entrées de démonstration ont un modèle vide (l'entrée de démonstration example.com a été retirée au lot 750).

#### Images des lames (Visualiseurs WSI, au-dessus de la liste)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Adresse de la visionneuse | Adresse web https contenant `{{slideId}}`, et facultativement `{{accession}}` | Facultatif | Ouvre la lame dans l'application de pathologie numérique du laboratoire, dans une fenêtre séparée qui garde sa place sur chaque poste de travail. Elle ne doit contenir ni nom d'utilisateur, ni mot de passe, ni nom de patient ; la connexion relève de cette application. L'ouverture est tracée dans le journal d'audit et exige `case:slide-image:open`. | La valeur `VITE_SLIDE_VIEWER_URL_TEMPLATE` du déploiement, si elle est définie |
| Adresse de l'image d'aperçu | Adresse web https contenant `{{slideId}}`, et facultativement `{{accession}}` | Facultatif | L'aperçu de la lame fourni par le scanner ou le système d'images, affiché tel quel avec « Aperçu de référence. Pas pour le diagnostic. » une fois la lame numérisée. Ajoutez son hôte à la politique de sécurité (img-src). | La valeur `VITE_SLIDE_THUMBNAIL_URL_TEMPLATE` du déploiement, si elle est définie |
| Établissements disposant de leur propre système | Un établissement, puis les deux mêmes adresses | Facultatif | Pour un établissement disposant de son propre scanner ou de sa propre application ; vide : l'adresse du laboratoire est utilisée. | Aucun |

L'enregistrement exige `config:vendor-integrations:manage`. Sans adresse de visionneuse, l'utilisateur voit « Aucune adresse de visionneuse n'est définie. Adressez-vous à votre administrateur. » en ouvrant une lame. Chaque poste de travail choisit où s'ouvre la fenêtre des lames depuis le menu du poste de travail (Fenêtre des images de lames, Définir la position).

#### Systèmes de gestion d'images (fenêtre d'ajout et de modification)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Enregistrer est désactivé lorsque vide. | Aucun |
| Déploiement | Choix : IMS d'entreprise, Serveur de fichiers local | Facultatif | Où le stockage d'images s'exécute. | IMS d'entreprise |
| Authentification | Choix : Aucune, URL signée, Jeton porteur OAuth 2.0, mTLS | Facultatif | Comment le stockage est atteint. Seul le choix est enregistré. | Aucune |
| URL de base | Texte | Facultatif | Adresse du stockage. La fenêtre avertit de ne pas inclure de jetons ni de secrets. Une entrée sans adresse affiche « aucune URL de base ». | Vide |

#### Imagerie macroscopique et télépathologie (fenêtre d'ajout et de modification)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Enregistrer est désactivé lorsque vide. | Aucun |
| Authentification | Choix (les quatre mêmes que ci-dessus) | Facultatif | Enregistrée seulement. | Aucune |
| URL de base | Adresse web https | Facultatif | Une adresse qui n'est pas en https affiche une erreur et Enregistrer est désactivé. | Vide |
| Prend en charge la télépathologie en direct | Case à cocher | Facultatif | La liste affiche « compatible télépathologie » ou « statique uniquement ». Rien en dehors de cette liste ne la lit. | Décochée |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Ajouter, modifier, désactiver : `config:vendor-integrations:manage` (Admin et Directeur de laboratoire par défaut). Les autres voient les listes en lecture seule.
**Limites connues.** Le contrat se trouve dans `docs/architecture/DIGITAL_PATHOLOGY_API.md`. **Démonstration seulement : visualiseur WSI simulé.** Une route `/wsi-viewer?caseId=` ouvre `MockWsiViewerPage`, qui affiche un avis « simulé », l'identité du dossier et un espace vide à l'endroit où apparaîtrait une lame. Elle n'existe que lorsque la version a les outils de démonstration activés, est exclue des versions de production par un test et n'est pas un paramètre d'administrateur. Aucune image de lame entière n'est affichée par PathScribe lui-même. Aucun enregistrement de fournisseur n'est lu par l'IA ou par la file des scanners.

## Paramètres de validation par le pathologiste, de relecture, de qualité et d'exploitation {#ch4-signout}
Breadcrumb: Accueil > Configuration > Système

Cette partie couvre chaque paramètre qui façonne la validation et les écrans de qualité, de délai de rendu et d'exploitation qui l'entourent. Les écrans sont regroupés ainsi : règles de validation et de relecture ; peropératoire et affichage ; délai de rendu ; assurance qualité et CQ en cytologie ; et autres (contribution, retour d'information, fil de recherche). Les pages d'usage quotidien (Accueil, Assurance qualité, Boîte de dépôt, Revue des exceptions de marge, File de CQ en cytologie) sont des pages de référence et se trouvent à la fin de la partie.

Presque chaque écran ci-dessous suit un même schéma : une valeur par défaut de l'organisation que chaque laboratoire exécutant peut hériter ou remplacer dans la fenêtre de modification de la **Configuration de l'établissement** ([Dictionnaire des établissements](#screen-facility-dictionary), niveau 1). Le laboratoire exécutant est le laboratoire qui valide le dossier, déterminé à partir de l'établissement prescripteur. Tous relèvent d'une configuration à risque élevé : seuls Admin et Directeur de laboratoire (et le super-administrateur ForMedrixAI) détiennent par défaut l'autorisation de les modifier, et une personne qui ne l'a pas voit l'écran en lecture seule.

### Relecture par un pair avant validation {#screen-peer_review_gate}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Relecture avant validation

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Relecture avant validation

**3. Objectif métier et périmètre.** Une première tumeur maligne (jugée d'après les dossiers antérieurs du patient) fait toujours l'objet d'une recommandation de relecture indépendante par un pair. Cet écran décide où la validation **attend** aussi cette relecture. Il est désactivé par défaut. Le paramètre le plus précis l'emporte : le service, puis le laboratoire exécutant, puis l'organisation. Lorsque la barrière est activée, un pathologiste peut quand même valider avant la relecture pour des soins urgents, en indiquant un motif ; la relecture est alors due dans un délai de 24 heures.

**4. Prérequis et dépendances.** Les lignes proviennent des laboratoires exécutants ([Dictionnaire des établissements](#screen-facility-dictionary)) et des sous-spécialités ([Sous-spécialités](#screen-subspecialties), affichées sous « Département »). Sans eux, seul le commutateur de l'organisation est disponible.

Setup step: Tier 3, step 10
Requires: [Dictionnaire des établissements](#screen-facility-dictionary), [Sous-spécialités](#screen-subspecialties)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-peer_review_gate - Relecture par un pair avant validation avec le commutateur de l'organisation et deux tableaux]

**6. Référence des champs.** Chaque modification est enregistrée immédiatement et affiche « Enregistré ».

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| La validation attend la relecture par un pair dans toute l'organisation | Case à cocher | Facultatif | Le paramètre valable pour toute l'organisation. | Désactivé |
| Laboratoire exécutant (tableau Par établissement) : la validation attend la relecture | Choix par laboratoire : Hériter, Activé, Désactivé | Facultatif | Hériter utilise le paramètre de l'organisation. | Hériter |
| Département (tableau Par département) : la validation attend la relecture | Choix par sous-spécialité : Hériter, Activé, Désactivé | Facultatif | Hériter utilise le paramètre du laboratoire. | Hériter |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:peer-review:manage` (risque élevé, audité ; Admin et Directeur de laboratoire). 
**Limites connues.** Une version avec serveur existe (`QUALITY_SETTINGS_API.md`, `QUALITY_API.md`) ; la démonstration conserve les paramètres dans le navigateur.

### Révision de concordance préliminaire vs finale {#screen-concordance_review_settings}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Révision de concordance préliminaire vs finale

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Révision de concordance préliminaire vs finale

**3. Objectif métier et périmètre.** Contrôle la comparaison automatique d'un résultat préliminaire (par exemple un diagnostic sur coupe congelée) avec le diagnostic final, ainsi qu'un écran de revue facultatif à la validation. Le pathologiste prend toujours la décision de concordance ; ces deux paramètres décident seulement si le système aide à la faire apparaître.

**4. Prérequis et dépendances.** Aucun pour la valeur par défaut de l'organisation. Une exception au niveau du laboratoire se définit dans la fenêtre de modification de la Configuration de l'établissement ([Dictionnaire des établissements](#screen-facility-dictionary)).

Setup step: Tier 3, step 11
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-concordance_review_settings - Examen de concordance préliminaire vs final avec deux commutateurs]

**6. Référence des champs.** Chaque commutateur est enregistré immédiatement et affiche « Enregistré ».

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Activer la comparaison automatique | Commutateur | Facultatif | Le système compare un résultat préliminaire avec le diagnostic final correspondant et signale une véritable discordance à l'attention du pathologiste. Il ne note jamais lui-même un résultat. | Activé |
| Exiger l'écran de vérification à la signature | Commutateur | Facultatif | Un écran supplémentaire affiche la comparaison entre le préliminaire et le final avant que la validation puisse se terminer. | Activé |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:concordance-review:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Le paramètre est aussi enregistré par laboratoire dans la fiche de l'établissement. Une version avec serveur existe (`QUALITY_SETTINGS_API.md`).

### Tampon de libération après signature {#screen-release_buffer}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Tampon de libération après signature

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Tampon de libération après signature (titre à l'écran : Délai de rétention après signature)

**3. Objectif métier et périmètre.** Une retenue temporaire entre la validation et la véritable diffusion externe. Tant que le compte rendu est retenu en **En attente de diffusion**, le pathologiste signataire peut le rappeler et le corriger sans amendement formel. Ce sont les valeurs par défaut de toute l'organisation. Un laboratoire exécutant peut les hériter ou définir ses propres valeurs d'activation, de durée et de contournement STAT dans la fenêtre de modification de la Configuration de l'établissement ; le filigrane et la restriction d'impression ne valent que pour toute l'organisation.

**Ce que fait le code aujourd'hui (vérifié dans la source).** L'heure de validation qui alimente les rapports de délai de rendu est toujours enregistrée à la validation. Une heure distincte de « diffusion » est enregistrée lorsque la retenue prend fin. La retenue est levée par un minuteur qui s'exécute dans n'importe quel écran PathScribe ouvert (et par un balayage en arrière-plan sur n'importe quel écran ouvert). Un ordonnanceur côté serveur qui diffuserait un dossier que personne n'a ouvert est prévu avec le serveur API et **n'est pas réalisé** : la diffusion peut donc être tardive lorsqu'aucun écran n'est ouvert. 

**4. Prérequis et dépendances.** Aucun pour les valeurs par défaut. Dérogations par laboratoire : [Dictionnaire des établissements](#screen-facility-dictionary).

Setup step: Tier 3, step 12
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-release_buffer - Paramètres du délai de rétention après signature]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Activer le délai de rétention après signature | Commutateur | Facultatif | Un compte rendu signé est retenu en En attente de diffusion pendant la durée du délai, sauf si un contournement s'applique. | Activé |
| Durée du délai | Nombre entier de minutes, de 1 à 30 | Obligatoire | Une valeur hors de la plage est ramenée à la limite. | 10 |
| Contourner le délai pour les cas STAT | Commutateur | Facultatif | Les dossiers STAT sont diffusés immédiatement. | Activé |
| Texte de la bannière de filigrane | Texte | Facultatif | Tracé en diagonale sur toute vue à l'écran d'un compte rendu En attente de diffusion et envoyé au moteur de rendu PDF. PathScribe envoie le texte ; il ne peut pas vérifier que le moteur de rendu distinct le trace. | PENDING FINAL RELEASE - DO NOT DISTRIBUTE |
| Politique d’impression pendant le délai de diffusion | Choix : Autoriser, Avertir et confirmer, Dérogation du superviseur, Bloquer | Facultatif | Ce qui se passe lorsqu'une personne imprime un compte rendu encore dans son délai de diffusion (Batch 654 ; elle remplace l'ancien commutateur « Restreindre l'impression papier interne »). **Autoriser** imprime aussitôt. **Avertir et confirmer** avertit que la copie est un brouillon filigrané et demande à la personne de confirmer. **Dérogation du superviseur** permet d'imprimer uniquement à une personne détenant `print:release-hold:override`, qui doit indiquer un motif ; toutes les autres sont refusées. **Bloquer** n'autorise aucune impression avant la diffusion du compte rendu. Toute copie imprimée porte toujours le filigrane d'attente de diffusion. Un ancien réglage activé est devenu Avertir et confirmer ; désactivé est devenu Autoriser. Le paramètre s'applique à toute l'organisation et est grisé tant que le délai de diffusion est désactivé. | Avertir et confirmer |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:release-buffer:manage` (risque élevé ; Admin et Directeur de laboratoire). Imprimer un compte rendu pendant son délai de diffusion sous Dérogation du superviseur : `print:release-hold:override` (« Imprimer un compte rendu pendant son délai de diffusion (dérogation du superviseur) » ; Directeur de laboratoire et Admin la détiennent par défaut ; accordez-la à tout autre rôle qui doit imprimer des comptes rendus retenus).
**Limites connues.** Partiel en raison du point sur l'ordonnanceur ci-dessus. La tâche serveur de balayage de diffusion, qui diffuserait un compte rendu que personne n'a ouvert, est conçue (`docs/architecture/RELEASE_SWEEP_SERVER_JOB.md` : un balayage par minute ; une fenêtre manquée diffuse en retard et le dossier est signalé) et **n'est pas réalisée**. Lorsqu'elle sera réalisée, elle ne diffusera jamais un compte rendu soumis à une retenue de signature chirurgicale ; elle signale plutôt le dossier à une personne. Une version avec serveur des paramètres existe (`REPORTS_API.md`).

### Règles de signature par pays {#screen-country_signing_rules}
Breadcrumb: Accueil > Configuration > Système > Références cliniques > Règles de signature par pays

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Références cliniques**. Interne uniquement : un administrateur client voit l'écran en lecture seule.
**2. Élément de maintenance :** Règles de signature par pays

**3. Objectif métier et périmètre.** Les règles nationales de chaque type de participation : son intitulé local, s'il peut valider, si son travail exige une contre-signature et s'il peut consulter tout le dossier. Chaque laboratoire du pays hérite des règles, sauf s'il a sa propre exception sous Types de participation. Les règles traduisent la réglementation nationale : seul l'administrateur de la plateforme ForMedrixAI peut donc les modifier. Chaque enregistrement exige un motif et est écrit dans le journal d'audit.

**4. Prérequis et dépendances.** Les lignes sont les types de participation.

Setup step: Tier 3, step 13
Requires: [Types de participation](#screen-participation_types)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-country_signing_rules - Règles de signature par pays avec une carte par type de participation]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Pays | Liste de choix : US, CA, GB (Angleterre et pays de Galles), GB (Écosse), GB (Irlande du Nord), IE, AU, NZ, KR, BE, NL, DE, FR, ES | Obligatoire | Changer de pays avec des modifications non enregistrées est bloqué (« Enregistrez ou annulez vos modifications avant de changer de pays »). | GB (Angleterre et pays de Galles) |
| Proposer dans ce pays / Ne plus proposer ici | Bouton sur une carte dont le type n'est pas global | Facultatif | Ajoute ou retire le type pour le pays. Retirer le dernier pays est refusé (désactivez plutôt le type). | Sans objet |
| Intitulé local | Texte | Facultatif | Le nom du type dans le pays. Le texte indicatif affiche l'intitulé de la plateforme. | Vide (intitulé de la plateforme) |
| Peut valider / signer | Choix : Valeur par défaut de la plateforme (valeur), Oui, Non | Facultatif | Si le type peut valider. | Valeur par défaut de la plateforme |
| Contresignature requise | Choix : Valeur par défaut de la plateforme, Oui, Non | Facultatif | Si le travail du type exige une contre-signature. | Valeur par défaut de la plateforme |
| Peut consulter tout le dossier | Choix : Valeur par défaut de la plateforme, Oui, Non | Facultatif | | Valeur par défaut de la plateforme |
| Fondement réglementaire | Texte sur plusieurs lignes | Facultatif | La règle de l'autorité de régulation ou du collège que suit le paramètre. | Vide |
| Motif de la modification | Texte | Obligatoire pour enregistrer | Erreur « Indiquez un motif de modification. » Affiché avec « Dernière modification par (nom) le (date). Motif ». | Vide |
| Annuler les modifications, Enregistrer les modifications | Boutons | Sans objet | **Enregistrer les modifications** signale un échec partiel (« les types enregistrés avant ont été conservés et audités »). | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `platform:signing-rules:manage` (réservée à la plateforme, risque élevé ; super-administrateur ForMedrixAI uniquement). Admin et Directeur de laboratoire ne peuvent pas la modifier.
**Limites connues.** Contrat dans `docs/architecture/LAB_DICTIONARIES_API.md`.

### Motifs de révision {#screen-revision_reasons}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Motifs de révision

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Motifs de révision

**3. Objectif métier et périmètre.** Liste les motifs qu'un pathologiste choisit lorsqu'il amende ou corrige un compte rendu diffusé, et permet à l'administrateur de marquer ceux qui signifient que le compte rendu initial a pu affecter la prise en charge clinique. La diffusion d'une révision pour un motif marqué recommande une CAPA au responsable AQ. Cet écran ne fait que basculer le marqueur ; il n'ajoute ni ne renomme de motifs.

**4. Prérequis et dépendances.** Aucun.

Setup step: Tier 3, step 14
Requires: Aucun.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-revision_reasons - Motifs de révision en deux groupes avec un commutateur cliniquement significatif]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Motifs d'amendement (révision diagnostique), Motifs de correction (administrative) | Deux listes | Sans objet | Motifs initiaux. Amendement : Révision de l'interprétation diagnostique, Réévaluation des marges chirurgicales, Changement de stadification pathologique, Reclassification du prélèvement/du site. Correction : Erreur typographique, Mise à jour des informations patient/démographiques, Mise à jour du prescripteur, Correction de l'étiquetage du prélèvement. | Sans objet |
| Motif, Description | Texte | Sans objet | Lecture seule ici. Les motifs inactifs affichent une étiquette « Inactif ». | Sans objet |
| Cliniquement significatif | Commutateur par motif | Facultatif | Activé affiche « Recommande une CAPA », désactivé affiche « Pas de CAPA ». | Activé pour les quatre motifs d'amendement, désactivé pour les quatre motifs de correction |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:revision-reasons:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Dans le produit, les valeurs de départ sont : diagnostic, marge, stade et reclassification du tissu activés ; corrections administratives désactivées (`revisionReasonRules.ts`). Le service permet d'ajouter, de modifier, de désactiver et de réactiver des motifs, mais cet écran n'a pas de bouton pour cela ; ce point est listé pour Pete dans `open-questions/ch4.md`. Contrat : `docs/architecture/LAB_DICTIONARIES_API.md`.

### Motifs du poste de travail {#screen-bench_reasons}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Motifs du poste de travail

**Statut :** Réalisé (lot 736)

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Motifs du poste de travail

**3. Objectif métier et périmètre.** Les motifs que le personnel touche au poste au lieu de les saisir, en cinq groupes : Microtome (bloc épuisé) ; commandes complémentaires sur un bloc épuisé (commande et réponse du pathologiste, y compris l'approbation de la coupe destructive) ; abandon de lot ; lot terminé avec écarts ; rupture de la chaîne du froid. Chaque laboratoire les formule à sa façon. Un motif garde son **code** quand il est reformulé, et chaque enregistrement et entrée d'audit conserve le code à côté du texte : les rapports (colonne **Code du motif** du rapport des écarts de rapprochement) comptent le motif de la même façon avant et après reformulation. Une note reste facultative.

**4. Prérequis et dépendances.** Aucun. Les motifs par défaut sont fournis dans les six langues.

Setup step: Tier 3, step 32
Requires: None.
Unlocks: None.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-bench_reasons - Motifs du poste en cinq groupes]

**6. Champs.** Formulation (avec **Reformuler** ; un motif par défaut s'affiche dans la langue de chaque utilisateur, un motif reformulé tel que saisi), Code (lecture seule, ne change jamais), ↑ / ↓ (ordre), **Reprendre la formulation par défaut**, **Retirer** / **Rétablir**, **Ajouter un motif**.

**7. Permissions.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:bench-reasons:manage` (risque élevé ; Admin et directeur de laboratoire).
**Limites connues.** Une liste pour toute l'organisation ; un site ne peut pas encore avoir sa propre formulation.

### Règles de signalement automatique RCP {#screen-tumor_board_rules}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Règles de signalement automatique RCP

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Règles de signalement automatique RCP (titre à l'écran : Règles de signalement automatique RCP)

**3. Objectif métier et périmètre.** À la validation, PathScribe inscrit un dossier à une RCP lorsqu'une règle correspond au compte rendu signé, et en consigne la raison. Il existe quatre noms de comité : RCP Sein, RCP Digestive, RCP Thoracique et RCP Gynéco-Oncologie. Deux sortes de règles existent. Une règle de marge inscrit le dossier lorsqu'une marge est plus proche qu'un seuil. Une règle de diagnostic et de biomarqueur inscrit le dossier lorsque tous les critères correspondent. Les valeurs de l'entreprise peuvent être remplacées ou désactivées pour un établissement. Un verrouillage de lot distinct fige la liste des dossiers d'un comité avant sa réunion.

**4. Prérequis et dépendances.** Les dérogations d'établissement utilisent le [Dictionnaire des établissements](#screen-facility-dictionary). Les critères sont mis en correspondance par libellé de champ et par formulation dans le compte rendu signé : testez donc une règle sur un vrai modèle de compte rendu avant de vous y fier.

Setup step: Tier 3, step 15
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-tumor_board_rules - Règles de signalement automatique RCP avec les règles de marge, les règles de critères, le verrouillage et les dérogations d'établissement]

**6. Référence des champs.** Les erreurs s'affichent au-dessus des cartes.

#### Référence entreprise (règles de marge)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Liste des règles (comité et description) | Une ligne par comité | Sans objet | Quatre règles initiales, une par comité, « Marge proche ou positive (< 1mm) ». | Sans objet |
| Seuil de marge (mm) | Nombre supérieur à 0 | Obligatoire | Erreur « Saisissez un seuil de marge supérieur à 0. » | 1 |
| Actif | Case à cocher | Facultatif | Désactive la règle pour l'entreprise. | Activé |
| Enregistrer | Bouton | Sans objet | Activé uniquement après une modification. | Sans objet |

#### Règles de diagnostic et de biomarqueur

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Description de la règle | Texte, de 1 à 80 caractères | Obligatoire | Le motif consigné lorsqu'un dossier est inscrit. | Vide |
| Comité | Liste de choix des quatre comités | Obligatoire | Erreur « Choisissez un comité. » | Sans objet |
| Type du critère (n) | Choix : Le diagnostic contient, Résultat de biomarqueur, Marge inférieure à (mm) | Obligatoire | Chaque critère doit correspondre. Une règle comporte de 1 à 6 critères et au moins un critère de diagnostic ou de biomarqueur. | Sans objet |
| Texte de diagnostic du critère (n) | Texte, de 2 à 60 caractères | Obligatoire pour un critère de diagnostic | | Vide |
| Biomarqueur ; Résultat du critère (n) | Deux zones de texte, chacune jusqu'à 60 caractères | Obligatoire pour un critère de biomarqueur | | Vide |
| Seuil de marge (critère) | Nombre supérieur à 0 | Obligatoire pour un critère de marge | | Vide |
| Actif | Case à cocher | Facultatif | | Activé |
| + Ajouter une règle, + Ajouter un critère, Retirer le critère, Supprimer, Enregistrer, Annuler | Boutons | Sans objet | Au plus 25 règles de diagnostic et de biomarqueur (« La limite de 25 ... est atteinte »). | Aucune règle |

#### Verrouillage des lots

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Verrouillage (heures avant la réunion) | Nombre, 0 ou plus | Obligatoire | Les modifications de planification sont refusées dans cette fenêtre. L'auto-affectation du présentateur fonctionne toujours jusqu'à la réunion et après. | 48 |

#### Dérogations d'établissement

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Établissement | Liste de choix | Obligatoire | Erreur « Choisissez un établissement. » | Premier établissement |
| Règle | Liste de choix des règles de marge et des règles de critères | Obligatoire | La règle à remplacer. | Première règle |
| Seuil de marge (mm) | Nombre supérieur à 0 | Obligatoire pour une règle de marge | Non utilisé pour une règle de critères. | La valeur de la règle |
| Actif | Case à cocher | Facultatif | Désactivé : la règle est désactivée dans cet établissement (la liste affiche « désactivé »). | Activé |
| Orienter vers le comité | Liste de choix, ou « Le comité propre à la règle » | Facultatif | Envoie le dossier vers un autre comité dans cet établissement. | Le comité propre à la règle |
| Enregistrer, Annuler, Supprimer | Boutons | Sans objet | | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:tumor-board-rules:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Contrat : `docs/architecture/TUMOR_BOARD_API.md`. La liste des comités est fixée dans le produit.

### Fenêtre biopsie–pièce opératoire {#screen-biopsy_resection_correlation}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Fenêtre biopsie–pièce opératoire

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Fenêtre biopsie–pièce opératoire (titre à l'écran : Fenêtre de corrélation biopsie–pièce opératoire)

**3. Objectif métier et périmètre.** Combien de temps après une biopsie chirurgicale une résection ultérieure du même patient est recherchée comme candidate à la corrélation, et à partir de quelle date cette fenêtre commence. Une résection correspond lorsqu'elle est prélevée ou reçue dans la fenêtre. Définissez-la pour l'entreprise, pour chaque juridiction et pour chaque établissement ; le paramètre le plus précis l'emporte. L'écran est le même contrôle que [Corrélation cytologie-histologie](#screen-cytology_histology_correlation), appliqué aux paramètres chirurgicaux.

**4. Prérequis et dépendances.** Les dérogations d'établissement utilisent le [Dictionnaire des établissements](#screen-facility-dictionary).

Setup step: Tier 3, step 16
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: [Suivi des contrôles](#screen-follow_up_tracking)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-biopsy_resection_correlation - Fenêtre de corrélation biopsie–pièce opératoire avec la valeur par défaut de l'entreprise, les règles par juridiction et les dérogations d'établissement]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Valeur par défaut de l'entreprise : Fenêtre (jours) | Nombre entier de 1 à 1825 | Obligatoire | Erreur « Saisissez un nombre entier de jours entre 1 et 1825. » | 180 |
| Valeur par défaut de l'entreprise : À partir de | Choix : Date de prélèvement, Date de réception au laboratoire, (validation) | Obligatoire | La date à partir de laquelle la fenêtre commence. Le choix de la validation est libellé « Signature de la cytologie » à l'écran, même ici. | Date de prélèvement |
| Enregistrer | Bouton | Sans objet | | Sans objet |
| Par juridiction : + Ajouter une règle de juridiction | Liste de choix des juridictions sans règle, Fenêtre (jours), À partir de ; Enregistrer, Annuler, Supprimer | Facultatif | Une règle par juridiction. La liste affiche « N jours à partir de (ancre) ». | Aucune |
| Exceptions par établissement : + Ajouter une exception d'établissement | Liste de choix des établissements, Fenêtre (jours), À partir de ; Enregistrer, Annuler, Supprimer | Facultatif | « Choisissez un établissement. » est l'erreur lorsqu'aucun n'est choisi. | Aucune |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:biopsy-resection-correlation:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Partiel : le service est une simulation à stockage navigateur exportée depuis `services/index.ts` ; il n'y a pas de version avec serveur. La fenêtre de cytologie en a une (Réalisé). Le libellé « Signature de la cytologie » qui apparaît sur l'écran de biopsie est listé dans `open-questions/ch4.md`.

### Corrélation cytologie-histologie {#screen-cytology_histology_correlation}
Breadcrumb: Accueil > Configuration > Cytologie > Fenêtre de corrélation

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > **Fenêtre de corrélation**
**2. Élément de maintenance :** Fenêtre de corrélation (titre à l'écran : Fenêtre de corrélation cyto-histologique)

**3. Objectif métier et périmètre.** Combien de temps après un résultat anormal de cytologie cervicale une biopsie ultérieure est recherchée comme candidate à la corrélation, et à partir de quelle date la fenêtre commence. L'horloge clinique démarre lorsque les cellules sont prélevées : le prélèvement est donc la valeur par défaut. Une biopsie correspond lorsqu'elle est prélevée ou reçue dans la fenêtre. Définissez-la pour l'entreprise, pour chaque juridiction et pour chaque établissement ; le plus précis l'emporte. L'équivalent chirurgical est [Fenêtre biopsie–pièce opératoire](#screen-biopsy_resection_correlation).

**4. Prérequis et dépendances.** Les dérogations d'établissement utilisent le [Dictionnaire des établissements](#screen-facility-dictionary).

Setup step: Tier 3, step 17
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: [Suivi des contrôles](#screen-follow_up_tracking)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_histology_correlation - Fenêtre de corrélation cyto-histologique avec les règles par juridiction et par établissement]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Valeur par défaut de l'entreprise : Fenêtre (jours) | Nombre entier de 1 à 1825 | Obligatoire | Erreur « Saisissez un nombre entier de jours entre 1 et 1825. » | 180 |
| Valeur par défaut de l'entreprise : À partir de | Choix : Date de prélèvement, Date de réception au laboratoire, Signature de la cytologie | Obligatoire | Erreur « Choisissez la date de début de la fenêtre. » | Date de prélèvement |
| Enregistrer | Bouton | Sans objet | | Sans objet |
| Par juridiction : + Ajouter une règle de juridiction | Liste de choix des juridictions (uniquement celles sans règle), Fenêtre (jours), À partir de ; Enregistrer, Annuler, Supprimer | Facultatif | La liste affiche « N jours à partir de (ancre) ». Sans règle : « Toutes les juridictions utilisent la valeur par défaut de l'entreprise. » | Aucune |
| Exceptions par établissement : + Ajouter une exception d'établissement | Liste de choix des établissements, Fenêtre (jours), À partir de ; Enregistrer, Annuler, Supprimer | Facultatif | Erreur « Choisissez un établissement. » | Aucune |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:cytology-histology-correlation:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Contrat : `docs/architecture/CYTOLOGY_API.md` (`ICytologyHistologyCorrelationSettingsService`).

### Suivi des contrôles {#screen-follow_up_tracking}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Suivi des contrôles

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Suivi des contrôles

**3. Objectif métier et périmètre.** Définit quand le laboratoire est averti d'un prélèvement de suivi attendu qui n'est pas arrivé, et si le personnel peut écrire au clinicien prescripteur à ce sujet. Les fenêtres de suivi elles-mêmes se définissent dans [Corrélation cytologie-histologie](#screen-cytology_histology_correlation) et [Fenêtre biopsie–pièce opératoire](#screen-biopsy_resection_correlation). Un e-mail au clinicien n'est jamais envoyé automatiquement : un utilisateur relit chacun d'eux et appuie sur Envoyer.

**4. Prérequis et dépendances.** Les dérogations d'établissement utilisent le [Dictionnaire des établissements](#screen-facility-dictionary). Sans les fenêtres de corrélation, il n'y a rien à signaler.

Setup step: Tier 3, step 18
Requires: [Dictionnaire des établissements](#screen-facility-dictionary), [Fenêtre biopsie–pièce opératoire](#screen-biopsy_resection_correlation), [Corrélation cytologie-histologie](#screen-cytology_histology_correlation)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-follow_up_tracking - Suivi des contrôles avec la carte de l'entreprise et les dérogations d'établissement]

**6. Référence des champs.** La carte de l'entreprise et chaque dérogation d'établissement utilisent les quatre mêmes champs.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Avertir ce nombre de jours avant l'échéance | Nombre entier de 0 à 365 | Obligatoire | 0 n'avertit qu'une fois l'échéance dépassée. Erreur « Saisissez un nombre entier de jours entre 0 et 365. » | 30 |
| Autoriser le personnel à écrire au clinicien prescripteur | Case à cocher | Facultatif | Ajoute l'action « Écrire au clinicien prescripteur ». | Désactivée |
| Objet de l'e-mail (vide = formulation intégrée) | Texte jusqu'à 200 caractères | Facultatif | Intégré : « Follow-up specimen requested: {{accession}} ». | Vide |
| Message de l'e-mail (vide = formulation intégrée) | Texte jusqu'à 4 000 caractères | Facultatif | Seuls ces champs variables sont renseignés : accession, windowStart, dueDate, clinicianName, labName, senderName. Il n'y a volontairement aucun champ variable pour le nom du patient ou le diagnostic. Un champ variable inconnu est refusé. | Vide |
| Enregistrer | Bouton | Sans objet | Désactivé tant qu'une valeur n'est pas valide. | Sans objet |
| Exceptions par établissement : Établissement, Ajouter une exception, Supprimer | Liste de choix et boutons | Facultatif | Une dérogation d'établissement s'affiche sous la forme « Avertir N jours avant, e-mail au clinicien activé/désactivé ». Chaque établissement sans dérogation utilise la carte de l'entreprise. | Aucune |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:follow-up-tracking:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Partiel : les paramètres sont enregistrés par un service à stockage navigateur (`followUpSettings.ts`) ; le service de suivi côté serveur renvoie les paramètres avec sa liste mais n'a pas d'écriture pour eux. La file de suivi se trouve dans `docs/architecture/` sous l'API qualité.

### Résultats peropératoires critiques {#screen-intraop_critical_results}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Résultats peropératoires critiques

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Résultats peropératoires critiques (titre à l'écran : Résultats peropératoires critiques)

**3. Objectif métier et périmètre.** Un dictionnaire des résultats de coupes congelées qui doivent parvenir directement au chirurgien opérateur. Un prélèvement correspond à une entrée par sa catégorie préliminaire ou par un terme de son diagnostic extemporané (les formulations négatives sont ignorées). Une correspondance signale le compte rendu oral comme résultat critique, que le pathologiste confirme ou retire. Les entrées ne sont jamais supprimées ; elles sont désactivées.

**4. Prérequis et dépendances.** Aucun. Les catégories sont les quatre catégories préliminaires de la liste de travail peropératoire.

Setup step: Tier 3, step 19
Requires: Aucun.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-intraop_critical_results - Dictionnaire des résultats peropératoires critiques]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Liste des entrées | Nom, description, « Catégories : ... Termes : ... », étiquette Inactive | Sans objet | Quatre entrées initiales : Tumeur maligne sur coupe congelée (catégorie Malin) ; Marge positive ou proche (termes) ; Atypique ou suspect de malignité (catégorie Atypique / suspect) ; Ganglion lymphatique positif (termes). | Sans objet |
| Afficher les entrées inactives | Commutateur | Facultatif | | Désactivé |
| + Ajouter une entrée, Modifier, Désactiver / Réactiver | Boutons | Sans objet | La fenêtre est ci-dessous. Sans l'autorisation, l'écran indique « Vous pouvez consulter ce dictionnaire mais pas le modifier. » | Sans objet |

#### Fenêtre Ajouter un résultat critique et Modifier le résultat critique

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Message « Indiquez un nom et au moins un terme ou une catégorie. » tant qu'un nom et une correspondance n'existent pas. | Vide |
| Description | Texte | Facultatif | | Vide |
| Termes | Texte, un par ligne ou séparés par des virgules | Obligatoire s'il n'y a pas de catégorie | Recherchés comme mots entiers, sans tenir compte de la casse. | Vide |
| Catégories préliminaires correspondantes | Cases à cocher : Bénin, Malin, Atypique / suspect, Différé | Obligatoire s'il n'y a pas de terme | | Aucune cochée |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:intraop-critical-results:manage` (risque élevé, audité ; Admin uniquement, Directeur de laboratoire ne la détient pas par défaut ; vérifié dans le service).
**Limites connues.** Contrat : `docs/architecture/INTRAOP_CRITICAL_RESULTS_API.md`. Cet écran ne figure pas dans la table section-capacité (`configSectionAccess.ts`) : il s'appuie donc uniquement sur le contrôle du service ; l'écran s'ouvre en lecture seule pour une personne sans l'autorisation.

### Terminaux de la suite opératoire {#screen-or_suite_terminals}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Terminaux de la suite opératoire

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Terminaux de la suite opératoire

**3. Objectif métier et périmètre.** Enregistre l'écran mural ou de bureau de chaque salle d'opération qui affiche le Tableau de bord peropératoire. Chaque terminal est lié à un Lieu existant, de sorte que deux établissements peuvent chacun avoir une « SO 1 » sans conflit de noms. Un terminal peut être marqué comme éligible à la Vue d'ensemble multi-salles (pour une infirmière responsable, un agent de liaison du laboratoire ou un circulant itinérant). L'accès se fait par un jeton d'affichage (ci-dessous), pas par la connexion d'une personne.

**4. Prérequis et dépendances.** Les établissements et leurs lieux (la liste des salles) proviennent du [Dictionnaire des établissements](#screen-facility-dictionary) (les Lieux de la fenêtre de modification de l'établissement). La liste de choix des Lieux reste vide tant qu'un établissement n'est pas choisi.

Setup step: Tier 3, step 20
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-or_suite_terminals - Liste des terminaux de la suite opératoire]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Liste des terminaux | Nom, lieu, « Éligible multi-salles », étiquette Inactif | Sans objet | | Sans objet |
| + Ajouter un terminal, Modifier, Désactiver / Réactiver, Afficher les inactifs | Boutons et commutateur | Sans objet | | Afficher les inactifs désactivé |
| Jeton d'affichage | Bouton par terminal | Sans objet | Ouvre la fenêtre ci-dessous. | Sans objet |

#### Fenêtre Ajouter un terminal de salle d'opération et Modifier le terminal de salle d'opération

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Identité du terminal / poste | Texte (exemple OR-Suite-04) | Obligatoire | | Vide |
| Établissement | Liste de choix | Obligatoire | Le sélectionner charge les lieux de cet établissement. | Aucun |
| Lieu (salle d'opération) | Liste de choix des lieux de l'établissement | Obligatoire | Le terminal est lié à ce Lieu. | Aucun |
| Peut consulter la vue d'ensemble multi-salles (infirmière responsable, agent de liaison du laboratoire, circulant itinérant) | Case à cocher | Facultatif | | Décochée |

#### Fenêtre du jeton d'affichage (partagée avec Profils d'affichage)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| État du jeton | Texte | Sans objet | « Aucun jeton émis. Cet écran ne peut pas démarrer. », « Le jeton se terminant par (indice) est valable jusqu'au (date) », « Jeton expiré le (date) » ou « Jeton révoqué le (date) ». | Sans objet |
| Validité | Choix : 30, 90, 180, 365, 730 jours | Obligatoire | Durée de validité d'un nouveau jeton. | 365 jours |
| Émettre un jeton / Émettre un nouveau jeton | Bouton | Sans objet | Affiche le nouveau jeton une seule fois (« Nouveau jeton — copiez-le maintenant » ; il ne sera plus affiché). Seule une empreinte est conservée. Émettre un nouveau jeton invalide immédiatement l'ancien. | Sans objet |
| Révoquer | Bouton | Sans objet | Éteint l'écran en moins d'une minute. Désactivé lorsque déjà révoqué. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Ajouter, modifier, désactiver : `config:or-suite-terminals:manage`. Émettre ou révoquer un jeton : la même autorisation (risque élevé ; Admin et Directeur de laboratoire). 
**Limites connues.** Contrat : `docs/architecture/DISPLAY_ACCESS_API.md` (appels de jeton). Le Tableau de bord peropératoire que le terminal affiche est un écran de travail extérieur à la liste de ce chapitre.

### Profils d'affichage (tableaux de bord des opérations de l'établissement) {#screen-display_profiles}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Profils d'affichage (tableaux de bord des opérations de l'établissement)

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Profils d'affichage (titre à l'écran : Profils d'affichage (tableaux de bord des opérations))

**3. Objectif métier et périmètre.** Un registre des écrans muraux qui affichent le Tableau de bord des opérations de l'établissement. Chaque profil associe un écran à un laboratoire exécutant et à une ou plusieurs des cinq vues de service, et peut alterner entre les vues selon une minuterie. Le bouton **Ouvrir le tableau de bord des opérations** ouvre la page du tableau de bord. Aucune liaison matérielle physique n'est vérifiée ni appliquée : le champ d'appareil est une note. L'accès à un écran est contrôlé par son Jeton d'affichage (voir la fenêtre sous [Terminaux de la suite opératoire](#screen-or_suite_terminals)).

**4. Prérequis et dépendances.** Les laboratoires exécutants proviennent du [Dictionnaire des établissements](#screen-facility-dictionary).

Setup step: Tier 3, step 21
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-display_profiles - Liste des profils d'affichage avec le bouton Ouvrir le tableau de bord des opérations]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Liste des profils | Nom, laboratoire, vues, intervalle | Sans objet | | Sans objet |
| Ouvrir le tableau de bord des opérations | Bouton | Sans objet | Ouvre `/facility-ops-dashboard`. | Sans objet |
| + Ajouter un profil d'affichage, Modifier, Désactiver / Réactiver, Afficher les inactifs | Boutons et commutateur | Sans objet | | Afficher les inactifs désactivé |
| Jeton d'affichage | Bouton par profil | Sans objet | La fenêtre de jeton décrite sous Terminaux de la suite opératoire. | Sans objet |

#### Fenêtre Ajouter un profil d'affichage et Modifier le profil d'affichage

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom de l'affichage | Texte (exemple « Paillasse d'histologie 3 — Écran mural ») | Obligatoire | | Vide |
| Laboratoire exécutant | Liste de choix des laboratoires exécutants actifs | Obligatoire | | Aucun |
| Vue(s) de tableau de bord assignée(s) | Cases à cocher : Macroscopie et réception ; Inclusion et microtomie ; Coloration et IHC ; Envois externes et laboratoire de référence ; Validation diagnostique / Scanner | Obligatoire (au moins une) | Plus d'une vue fait alterner le profil. | Aucune cochée |
| Intervalle du carrousel (secondes) | Nombre entier (exemple 20) | Facultatif | Durée par vue lorsque plus d'une est assignée. | Vide |
| Jeton d'appareil / MAC / IP (facultatif) | Texte | Facultatif | Une note d'inventaire seulement ; l'accès est contrôlé par le Jeton d'affichage. | Vide |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Ajouter, modifier, désactiver, émettre ou révoquer un jeton : `config:display-profiles:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Contrat : `docs/architecture/INTRAOP_OPS_API.md` et `DISPLAY_ACCESS_API.md`. Le registre ne contient que des données : PathScribe ne vérifie pas qu'un écran physique correspond à un profil.

### Centre de configuration AQ {#screen-qa_config_center}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Centre de configuration AQ

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Centre de configuration AQ

**3. Objectif métier et périmètre.** Définit les activités d'assurance qualité qu'un laboratoire réalise. Une activité repose sur l'un de deux archétypes : **Révision avec résultat** (un dossier est relu et noté, par exemple Corrélation coupe congelée / finale) ou **Supervision / Affectation** (un prestataire est supervisé sur un nombre de dossiers ou une période, par exemple FPPE). Les activités **Standard** sont sélectionnées par PathScribe pour la juridiction du laboratoire ; elles ne peuvent pas être désactivées ni transformées en activités personnalisées, et seuls leur échantillonnage, leur déclencheur de CAPA et des paramètres similaires peuvent être configurés. Les activités **Personnalisé** sont celles du laboratoire ; la voie la plus rapide est de dupliquer une activité standard ou personnalisée, car ses champs de relecture sont déjà préétablis. Rien n'ouvre une CAPA automatiquement : un déclencheur ne fait qu'en recommander une au responsable AQ, qui la confirme ou la rejette.

Les activités de relecture standard comprennent : Corrélation coupe congelée / finale, Corrélation cytologie-histologie, Confirmation d'un résultat anormal/critique, Second dépistage de cytologie GYN, Relecture par un pair chirurgicale après validation, Corrélation biopsie-résection chirurgicale, Relecture par un pair avant validation, Corrélation clinico-pathologique et Corrélation de consultation extérieure. La liste affichée dépend de la juridiction.

**4. Prérequis et dépendances.** Le déclencheur de CAPA désigne un type de non-conformité de [Non-conformités des spécimens](#screen-deficiencies). La répartition attendue des dossiers utilise [Sous-spécialités](#screen-subspecialties).

Setup step: Tier 3, step 22
Requires: [Non-conformités des spécimens](#screen-deficiencies), [Sous-spécialités](#screen-subspecialties)
Unlocks: [Configuration du TAT](#screen-tab-tat), [Politique de tendance de discordance](#screen-qa_trend_policy)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-qa_config_center - Centre de configuration AQ avec les onglets Standard et Personnalisé]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Onglets Standard, Personnalisé | Onglets | Sans objet | Standard n'affiche que les activités qui s'appliquent à la juridiction (sinon « Aucune activité standard ne s'applique à (juridiction) »). | Standard |
| Liste des activités | Nom, Archétype, Juridictions (« Toutes » ou une liste), % d'échantillonnage, Déclencheur CAPA, Statut, Actions | Sans objet | Le Déclencheur CAPA se lit « (gravités) → (non-conformité) » avec « (après diffusion uniquement) ». | Sans objet |
| Configurer (standard), Modifier (personnalisée), Dupliquer, Désactiver / Réactiver | Boutons de ligne | Sans objet | Désactiver est refusé pour une activité standard. | Sans objet |
| + Ajouter une activité personnalisée | Bouton, puis un sélecteur | Sans objet | Choisissez **Nouvelle activité de révision avec résultat** ou **Nouvelle activité de supervision/affectation**, ou Annuler. Le sélecteur recommande plutôt de dupliquer. | Sans objet |

#### Fenêtre Configurer, Modifier et Dupliquer

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Lecture seule sur une activité standard. Un doublon commence par « (nom) (Copie) ». | Vide |
| Description | Texte | Facultatif | Lecture seule sur une activité standard. | Vide |
| Champs de révision | Éditeur de champs (archétype de révision) | Obligatoire (au moins un champ) | Lecture seule sur une activité standard et sur un doublon (« issus de la duplication — lecture seule ici »). Chaque champ a un libellé, un type (Texte court, Texte long, Nombre, Choix unique, Choix multiple, Liste déroulante), une indication, Obligatoire, et des options pour un type à choix ; les champs peuvent être montés et descendus. Un champ enregistré peut être renommé ou rendu facultatif mais pas supprimé ni changé de type, et une option enregistrée ne peut pas être supprimée : les relectures passées conservent leurs réponses. De nouveaux champs peuvent être ajoutés à tout moment. | Un seul champ Notes |
| Recueillir les commentaires sur l'enseignement et l'intégration | Case à cocher (archétype de révision) | Facultatif | Désactivée sur une activité standard. | Décochée |
| Pourcentage d'échantillonnage | Nombre de 0 à 100 (archétype de révision) | Facultatif | Fraction des dossiers éligibles sélectionnés aléatoirement. Vide signifie aucun échantillonnage automatique. | Vide |
| Déclencheur CAPA — recommander une CAPA lorsque | Cases à cocher : faible, moyen, élevé (gravité de la discordance) | Facultatif | La gravité de la discordance est toujours enregistrée ; cela décide seulement si une CAPA est recommandée. | Aucune |
| Déclencheur CAPA : Type de non-conformité | Liste de choix issue de Non-conformités des spécimens, ou « Aucun type de non-conformité sélectionné » | Facultatif | La non-conformité que nomme la recommandation. | Aucun |
| Uniquement pour les relectures après la diffusion du compte rendu | Case à cocher | Facultatif | | Décochée |
| Répartition attendue des dossiers (facultatif) | Nombres minimaux par sous-spécialité (archétype de supervision) | Facultatif | « + Ajouter une cible de sous-spécialité… » ajoute une ligne avec **Nombre minimal** et **Supprimer**. Vide : seule la couverture réelle est affichée, sans attente. | Vide |
| Statut | Commutateur Actif / Inactif | Facultatif | | Actif |
| Ajouter / Créer un doublon / Enregistrer les modifications, Annuler | Boutons | Sans objet | | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:qa-types:manage` (risque élevé ; Admin et Directeur de laboratoire ; le verrou des activités standard est aussi appliqué dans le service).
**Limites connues.** Contrat : `docs/architecture/QUALITY_API.md`.

### Politique de tendance de discordance {#screen-qa_trend_policy}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Politique de tendance de discordance

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Politique de tendance de discordance (titre à l'écran : Politique de tendance de discordance)

**3. Objectif métier et périmètre.** Décide quand des discordances majeures répétées sont signalées au Directeur de laboratoire, soit pour le travail relu d'un pathologiste, soit pour un type de prélèvement quel que soit le lecteur. Une tendance est une recommandation : elle n'ouvre jamais de CAPA. La politique de l'organisation s'applique à chaque laboratoire exécutant qui n'a pas la sienne ; les relectures sont jugées selon la politique du laboratoire qui a traité le dossier.

**4. Prérequis et dépendances.** Les relectures proviennent des activités AQ du [Centre de configuration AQ](#screen-qa_config_center). Les politiques de laboratoire utilisent les laboratoires exécutants du [Dictionnaire des établissements](#screen-facility-dictionary).

Setup step: Tier 3, step 23
Requires: [Centre de configuration AQ](#screen-qa_config_center), [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-qa_trend_policy - Politique de tendance de discordance avec la politique de l'organisation et les politiques des laboratoires exécutants]

**6. Référence des champs.** Les mêmes champs figurent dans le bloc de l'organisation et dans chaque laboratoire exécutant dont la case « (laboratoire) a sa propre politique » est cochée.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Suivre le travail relu de chaque pathologiste | Case à cocher | Facultatif | | Activé |
| Suivre chaque type de prélèvement (signal de processus) | Case à cocher | Facultatif | | Activé |
| Période (mois) | Nombre entier de 1 à 36 | Obligatoire | Jusqu'où remontent les relectures comptées. | 3 |
| Relectures minimales sur la période | Nombre entier, au moins 1 | Obligatoire | En dessous, rien n'est jugé ; cela protège le personnel à faible volume ou à temps partiel. | 20 |
| Gravités comptées comme majeures | Cases à cocher : faible, moyen, élevé | Obligatoire (au moins une) | La gravité indiquée par le relecteur sur une relecture discordante. | élevé |
| Discordances majeures déclenchant le signalement | Nombre entier | Obligatoire | 0 désactive ce critère. | 3 |
| Taux de discordances majeures déclenchant le signalement (%) | Nombre de 0 à 100 | Obligatoire | Parmi les relectures de la période. 0 désactive ce critère. Si les deux critères sont à 0, la politique est refusée (« Indiquez un nombre ou un taux »). | 10 |
| Lorsqu'un seuil est franchi | Choix : Demander une décision au directeur du laboratoire, Le noter uniquement dans la liste des tendances | Obligatoire | Aucun des deux choix n'ouvre de CAPA. | Demander au directeur du laboratoire |
| (Laboratoire) a sa propre politique | Case à cocher par laboratoire exécutant | Facultatif | La cocher fait apparaître les mêmes champs pour ce laboratoire. | Décochée |
| Enregistrer la politique | Bouton | Sans objet | Affiche « Enregistré » ou la raison pour laquelle l'enregistrement a échoué. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:qa-trend-policy:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Contrat : `docs/architecture/QUALITY_SETTINGS_API.md`.

### Configuration du TAT (onglet) {#screen-tab-tat}
Breadcrumb: Accueil > Configuration > Configuration du TAT

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Configuration du TAT** (s'ouvre pour les personnes qui détiennent `config:tat-targets:manage` ; l'onglet est protégé par un verrou de section).
**2. Élément de maintenance :** Configuration du TAT (titre à l'écran : Configuration du délai de traitement)

**3. Objectif métier et périmètre.** Définit les objectifs de délai de rendu par type, urgence, établissement, prélèvement et sous-spécialité. La règle correspondante la plus spécifique l'emporte lorsqu'un dossier est mesuré. Un dossier se rabat sur une valeur système par défaut intégrée lorsqu'aucune règle personnalisée ne correspond. Les objectifs pilotent les marques dans les délais et en retard dans la Recherche, les tableaux de bord qualité et le tableau peropératoire (délai d'alerte de la coupe congelée).

**Ordre de résolution (le plus spécifique d'abord) :** Établissement + Échantillon + Urgence ; Établissement + Échantillon ; Établissement + Sous-spécialité + Urgence ; Établissement + Sous-spécialité ; Établissement uniquement ; Échantillon uniquement ; Valeur système par défaut (repli). Un **Simulateur de résolution** indique quelle règle l'emporte pour un dossier donné.

**4. Prérequis et dépendances.** Les sélecteurs de portée proviennent du [Dictionnaire des établissements](#screen-facility-dictionary), du [Dictionnaire des spécimens](#screen-specimens) et de [Sous-spécialités](#screen-subspecialties). Les activités AQ apparaissent comme types de TAT supplémentaires une fois qu'elles existent dans le [Centre de configuration AQ](#screen-qa_config_center).

Setup step: Tier 3, step 24
Requires: [Dictionnaire des établissements](#screen-facility-dictionary), [Dictionnaire des spécimens](#screen-specimens), [Sous-spécialités](#screen-subspecialties), [Centre de configuration AQ](#screen-qa_config_center)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: tab-tat - Liste de configuration du TAT avec les filtres, la hiérarchie et le simulateur]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Liste des règles | Tableau : Type, Cible, Urgence, Portée, Notes, Statut, Actions | Sans objet | Règles regroupées sous la forme « Entreprise (n) » et par laboratoire exécutant. Une ligne indique la cible, l'urgence (STAT, Routine, Toutes), la portée, « alerte à N min » pour la coupe congelée, et « Rôle : ... » pour les types de consultation. | Sans objet |
| Filtre de type | Liste de choix : Tous les types, chaque type de TAT, chaque activité AQ | Facultatif | | Tous les types |
| Filtrer par laboratoire exécutant, Filtrer par établissement prescripteur | Listes de choix | Facultatif | | Tous |
| Afficher les inactifs | Commutateur | Facultatif | | Désactivé |
| + Ajouter une règle, Modifier, Dupliquer, Supprimer | Boutons | Sans objet | **Supprimer** est refusé pour une valeur système par défaut ; désactivez-la plutôt. **Dupliquer** crée une nouvelle règle à partir d'une règle existante. | Sans objet |
| Simulateur | Bouton et panneau | Sans objet | Voir le tableau du simulateur ci-dessous. | Sans objet |

#### Fenêtre Ajouter une règle de délai et Modifier la règle de délai

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Type de délai | Liste de choix en deux groupes. Flux clinique : Premier contact, Dossier complet, Coupe congelée, Ischémie froide, Macroscopie, Validation finale, Consultation — Ma réponse, Consultation — En attente de réponse, PAD d'autopsie, FAD d'autopsie. Activités AQ : chaque activité du Centre de configuration AQ | Obligatoire | Erreur « Le type de délai est requis ». | Premier contact |
| Heures cibles | Nombre, pas de 0,25, au moins 0,1 | Obligatoire | Erreur « Les heures cibles doivent être supérieures à 0 ». Affiche « = (mis en forme) ». | Aucune |
| Alerter quand il reste ce nombre de minutes | Nombre entier de minutes | Facultatif | Coupe congelée uniquement. Le tableau peropératoire passe à l'orange à ce moment. Doit être supérieur à 0 et inférieur à la cible. | 5 |
| Urgence | Choix : Toutes (Routine + STAT), Routine uniquement, STAT uniquement | Facultatif | | Toutes |
| S'applique à : Laboratoire exécutant | Liste de choix ou « Tous les laboratoires exécutants » | Facultatif | | Tous |
| S'applique à : Établissement prescripteur | Liste de choix ou « Tous les établissements prescripteurs » | Facultatif | | Tous |
| S'applique à : Type d'échantillon | Liste de choix ou « Tous les types d'échantillons » | Facultatif | | Tous |
| S'applique à : Sous-spécialité | Liste de choix ou « Toutes les sous-spécialités » | Facultatif | | Toutes |
| S'applique à : Rôle | Choix : Tous les rôles, Résident, Fellow, Pathologiste, Réviseur externe | Facultatif | Utilisé par les types de consultation. | Tous |
| Notes de l'administrateur | Texte | Facultatif | Sans effet sur la correspondance. | Vide |
| Statut | Actif / Inactif | Facultatif | Une règle active avec la même combinaison de type et d'urgence est refusée (« Une règle active existe déjà pour cette combinaison »). | Actif |
| Ajouter la règle / Enregistrer les modifications, Annuler | Boutons | Sans objet | Une ligne en direct indique à quoi la règle s'applique, ou « Il s'agit d'une valeur système par défaut — s'applique à tous les dossiers ». | Sans objet |

#### Simulateur de résolution

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Laboratoire exécutant, Établissement prescripteur, Échantillon, Sous-spécialité | Listes de choix (« Aucun ... spécifique ») | Facultatif | Le dossier à tester. | Aucun |
| Urgence | Choix | Facultatif | | Routine |
| Résultat par type | Badge pour chaque type, la règle gagnante, « valeur système par défaut » ou « règle personnalisée », ou « Aucune règle correspondante » | Sans objet | | Sans objet |

Les valeurs par défaut intégrées (ids commençant par `sys-`, en heures) : Premier contact 4 routine, 1 STAT ; Dossier complet 24 routine, 4 STAT ; Coupe congelée 0,5 routine, 0,33 STAT ; Ischémie froide 1 ; Macroscopie 4 routine, 2 STAT ; Validation finale 4 routine, 2 STAT ; Réponse à la consultation et En attente 24 (Résident), 48 (Pathologiste), 120 (Externe). Elles peuvent être modifiées et désactivées, jamais supprimées. En désactiver une la retire de l'ordre de résolution : assurez-vous donc qu'une règle personnalisée comble l'écart.

**7. Autorisations.** Ouvrir l'onglet : `config:tat-targets:manage` par le verrou de section (risque élevé ; Admin et Directeur de laboratoire). 
**Limites connues.** Contrat : `docs/architecture/TAT_AND_DELEGATION_API.md`. La liste intégrée est aussi initialisée par le serveur API.

### Objectifs de performance {#screen-performance_targets}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Objectifs de performance

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Objectifs de performance (titre à l'écran : Objectifs de performance)

**3. Objectif métier et périmètre.** Les chiffres sur lesquels chaque pathologiste est évalué. Une modification est enregistrée immédiatement. Le tableau de bord Productivité compare les cas et les RVU à ces objectifs ; seuls les objectifs mensuels de cas et de RVU y apparaissent, les autres sont conservés pour les rapports.

**4. Prérequis et dépendances.** Aucun.

Setup step: Tier 3, step 25
Requires: Aucun.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-performance_targets - Tableau des objectifs de performance avec le formulaire d'ajout]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Objectif (nom) | Texte | Obligatoire à l'ajout | Erreur « Donnez un nom à l'objectif. » Les lignes intégrées portent un badge « Intégré ». | Sans objet |
| Valeur | Nombre supérieur à zéro | Obligatoire | Erreur « Saisissez une valeur supérieure à zéro. » Un pourcentage supérieur à 100 est refusé. | Voir ci-dessous |
| Unité | Choix : Cas, RVU, Pour cent, Heures | Obligatoire | | Voir ci-dessous |
| Période | Choix : Quotidien, Hebdomadaire, Mensuel, Trimestriel, Annuel | Obligatoire | | Voir ci-dessous |
| Supprimer | Bouton par ligne | Sans objet | Les objectifs intégrés ne peuvent pas être supprimés. | Sans objet |
| Ajouter un objectif : Nom de l'objectif, Valeur, unité, période, Ajouter l'objectif | Formulaire | Obligatoire | Erreur « Un objectif portant ce nom existe déjà. » | Vide |

Les cinq lignes de départ : Cas par mois 120 cas par mois (intégré) ; TAT routine 48 heures par mois (intégré) ; TAT STAT 4 heures par mois (intégré) ; Taux de validation CQ 98 pour cent par trimestre (intégré) ; RVU mensuels 350 RVU par mois (non intégré).

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:tat-targets:manage` (la même autorisation que l'onglet TAT ; risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Contrat : `docs/architecture/CONFIG_DICTIONARIES_API.md`. Les lignes « TAT routine » et « TAT STAT » ici sont distinctes des règles de délai de rendu par dossier de l'onglet [Configuration du TAT](#screen-tab-tat) ; le produit ne les relie pas.

### Règles CQ de cytologie {#screen-cytology_qc_rules}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Règles CQ de cytologie

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Règles CQ de cytologie (titre à l'écran : Règles d'assurance qualité en cytologie)

**3. Objectif métier et périmètre.** Les règles automatisées qui échantillonnent, attribuent et acheminent les dossiers de cytologie pour la relecture par un pair de contrôle qualité. Une règle indique quels dossiers elle couvre (critères), combien d'entre eux sélectionner (logique d'échantillonnage), quelle est l'urgence de la relecture (niveau de priorité et délai) et qui peut relire. Les règles sont évaluées de la Priorité d'évaluation la plus élevée à la plus basse. Les règles ne peuvent pas être supprimées ; elles sont désactivées. Le travail qui en résulte est la [File de relecture QC en cytologie](#screen-cytology-qc-queue).

Les données de démonstration contiennent des règles nommées pour les États-Unis (nouveau dépistage ciblé de frottis à haut risque CLIA, 100 pour cent), le Royaume-Uni (nouveau dépistage rapide NHS / RCPath, 20 pour cent), l'UE (relecture par un pair du pathologiste ISO 15189, 2 pour cent) et un nouveau dépistage aléatoire des validations négatives du cytotechnicien (10 pour cent).

**4. Prérequis et dépendances.** Aucun n'est imposé. Le critère de l'établissement réalisateur se saisit sous forme d'une liste d'ids d'établissements (ce n'est pas une liste de choix) : prenez donc les ids dans le [Dictionnaire des établissements](#screen-facility-dictionary). Les taux de sélection aléatoire de [Taux de sélection aléatoire QC](#screen-cytology_qc_settings) sont distincts de ces règles.

Setup step: Tier 3, step 26
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: [File de relecture QC en cytologie](#screen-cytology-qc-queue)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-cytology_qc_rules - Liste des règles d'assurance qualité en cytologie]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Liste des règles | Nom, « Priorité N », niveau de priorité, étiquette Inactive | Sans objet | | Sans objet |
| + Ajouter une règle, Modifier, Dupliquer, Désactiver / Réactiver, Afficher les inactifs | Boutons et commutateur | Sans objet | **Dupliquer** nomme la copie « (nom) (Copie) ». | Afficher les inactifs désactivé |

#### Fenêtre Ajouter une règle QC et Modifier la règle QC

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom de la règle | Texte | Obligatoire | | Vide |
| Description | Texte | Facultatif | | Vide |
| Priorité d'évaluation (la plus élevée est évaluée en premier) | Nombre entier | Obligatoire | | 50 |
| Délai (heures) | Nombre | Obligatoire | Le temps alloué pour terminer la relecture. | 24 |
| Niveau de priorité de relecture | Choix : Priorité 1 — Escalade élevée, Priorité 2 — Ciblée à conséquence élevée, Priorité 3 — Aléatoire de routine | Obligatoire | | Priorité 3 — Aléatoire de routine |
| Actif | Case à cocher | Facultatif | | Activé |
| Logique d'échantillonnage | Choix : Pourcentage, Intervalle (tous les N cas), Volume fixe (les N premiers cas) | Obligatoire | Une zone numérique suit le choix : Taux %, Tous les N cas, N premiers cas. | Pourcentage, 10 pour cent |
| Juridictions | Cases à cocher de pays | Facultatif | Ne cochez rien pour appliquer la règle dans toutes les juridictions. | Aucune cochée |
| IDs des établissements réalisateurs | Texte séparé par des virgules | Facultatif | | Vide |
| Rôle du prestataire | Cases à cocher : Pathologiste, Cytotechnologue | Facultatif | S'applique aux dossiers lus par ce rôle. | Aucune cochée |
| Statut d'intégration | Cases à cocher : Nouvelle recrue, Période d'essai | Facultatif | S'applique au personnel en cours d'intégration. | Aucune cochée |
| Rôles de relecteurs éligibles | Texte séparé par des virgules | Facultatif | Qui peut se voir attribuer la relecture. | Vide |
| Catégorie de prélèvement | Cases à cocher : Frottis gynécologique, Liquide non gynécologique, Cytoponction à l'aiguille fine (FNA) | Facultatif | | Aucune cochée |
| Adéquation | Cases à cocher : Satisfaisant, Insatisfaisant, Limité | Facultatif | | Aucune cochée |
| Filtre de résultat | Choix : Tout résultat, Négatif uniquement, Non négatif uniquement | Facultatif | | Tout résultat |
| Indicateurs à haut risque | Texte séparé par des virgules | Facultatif | | Vide |
| Classifications de Bethesda | Texte séparé par des virgules | Facultatif | | Vide |
| Codes de concept SNOMED | Texte séparé par des virgules | Facultatif | | Vide |
| Enregistrer, Annuler | Boutons | Sans objet | | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:cytology-qc-rules:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Contrat : `docs/architecture/CYTOLOGY_QC_API.md`.

### Taux de sélection aléatoire QC {#screen-cytology_qc_settings}
Breadcrumb: Accueil > Configuration > Cytologie > Taux de sélection aléatoire QC

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > **Taux de sélection aléatoire QC**
**2. Élément de maintenance :** Taux de sélection aléatoire QC (titre à l'écran : Taux de sélection aléatoire pour le CQ en cytologie)

**3. Objectif métier et périmètre.** Deux taux indépendants : le pourcentage de résultats GYN négatifs et le pourcentage de résultats GYN non négatifs sélectionnés au hasard pour le pool de CQ. Il existe une valeur par défaut de l'entreprise, ainsi que des substitutions facultatives par établissement et par membre du personnel. Une substitution du personnel l'emporte sur une substitution d'établissement, qui l'emporte sur la valeur par défaut de l'entreprise. Utilisez une substitution du personnel pour un taux plus élevé pour un nouvel employé ou un étudiant.

**4. Prérequis et dépendances.** Les établissements ([Dictionnaire des établissements](#screen-facility-dictionary)) et le personnel ([Membres du personnel](#screen-staff-members)) pour les substitutions.

Setup step: Tier 3, step 27
Requires: [Dictionnaire des établissements](#screen-facility-dictionary), [Membres du personnel](#screen-staff-members)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_qc_settings - Taux de sélection aléatoire QC avec les substitutions par établissement et par membre du personnel]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Valeur par défaut de l'entreprise : Négatif | Nombre de 0 à 100 (pour cent) | Obligatoire | | 10 |
| Valeur par défaut de l'entreprise : Non négatif | Nombre de 0 à 100 (pour cent) | Obligatoire | | 10 |
| Enregistrer | Bouton | Sans objet | Affiche « Modification non enregistrée » jusqu'à l'enregistrement. | Sans objet |
| Substitutions d'établissement : + Ajouter une substitution | Liste de choix des établissements ; taux Négatif et Non négatif ; Enregistrer, Annuler, Supprimer | Facultatif | Une substitution peut laisser un taux vide pour l'hériter (« (valeur) % (hérité) »). La liste se lit « Nég x, Non-nég y ». | Aucune (« Aucune substitution d'établissement ») |
| Substitutions par membre du personnel : + Ajouter une substitution | Liste de choix des membres du personnel ; taux Négatif et Non négatif ; Enregistrer, Annuler, Supprimer | Facultatif | L'emporte sur toute substitution d'établissement. | Aucune (« Aucune substitution de personnel ») |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:cytology-qc-rates:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Contrat : `docs/architecture/CYTOLOGY_API.md` (`ICytologyQcSettingsService`).

### Plafond de charge quotidienne {#screen-cytology_workload_cap}
Breadcrumb: Accueil > Configuration > Cytologie > Plafond de charge quotidienne

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > **Plafond de charge quotidienne**
**2. Élément de maintenance :** Plafond de charge quotidienne (titre à l'écran : Plafond quotidien de charge de travail en cytologie)

**3. Objectif métier et périmètre.** Le nombre maximal de lames de cytologie GYN qu'un cytotechnicien peut examiner en une journée (la limite de charge de travail CLIA), avec les mêmes trois niveaux que les taux de CQ : valeur par défaut de l'entreprise, substitutions d'établissement et substitutions par membre du personnel (le personnel l'emporte sur l'établissement). Il définit aussi l'heure de début de la journée de dépistage, pour la validation des heures en fin de journée et le rapport de charge de travail. La limite elle-même est vérifiée sur 24 heures glissantes et n'utilise pas le début de journée.

**4. Prérequis et dépendances.** Les établissements et le personnel pour les substitutions. Un fuseau horaire du laboratoire se définit dans les paramètres Système (hors de ce chapitre).

Setup step: Tier 3, step 28
Requires: [Dictionnaire des établissements](#screen-facility-dictionary), [Membres du personnel](#screen-staff-members)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_workload_cap - Plafond de charge quotidienne avec le début de journée et les substitutions]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Valeur par défaut de l'entreprise (lames / jour) | Nombre entier de 1 à 100 | Obligatoire | Erreur « Le plafond doit être un nombre entier de lames entre 1 et 100. » | 100 |
| Enregistrer | Bouton | Sans objet | Affiche « Modification non enregistrée ». | Sans objet |
| La journée de lecture commence à | Liste de choix des heures | Obligatoire | Minuit par défaut ; 6 h garde une garde de nuit de 22 h à 6 h sur une seule date. Un changement s'applique à partir de maintenant ; les jours précédents gardent l'heure en vigueur à ce moment-là. Erreur « Vous n'avez pas l'autorisation de modifier ce réglage. » | Minuit |
| Substitutions d'établissement : + Ajouter une substitution | Liste de choix des établissements, Limite quotidienne (1 à 100) ; Enregistrer, Annuler, Supprimer | Facultatif | Lorsque chaque établissement en a déjà une : « Chaque établissement a déjà une substitution. Supprimez-en une pour la redéfinir. » | Aucune |
| Substitutions par membre du personnel : + Ajouter une substitution | Liste de choix des membres du personnel, Limite quotidienne (1 à 100) ; Enregistrer, Annuler, Supprimer | Facultatif | Utilisez un plafond plus bas pour un nouvel employé ou un étudiant. | Aucune |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:cytology-workload-cap:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Contrat : `docs/architecture/CYTOLOGY_API.md` (`ICytologyWorkloadCapSettingsService`).

### Tableau de bord des contributions {#screen-contribution_settings}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Tableau de bord des contributions

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Tableau de bord des contributions (titre à l'écran : Paramètres du tableau de bord de contribution)

**3. Objectif métier et périmètre.** Contrôle ce que les pathologistes voient sur leur propre page **Ma contribution**, et dans quel fuseau horaire sont regroupés les indicateurs mensuels et du cumul annuel (nombres de dossiers et RVU). Les administrateurs, les pathologistes-administrateurs et les super-administrateurs voient toujours les données de comparaison entre pairs et à l'échelle de l'établissement ; le commutateur des pairs ne contrôle que la vue du simple pathologiste sur lui-même par rapport aux autres. Le stockage est toujours en UTC ; le fuseau horaire décide seulement à quel jour ou à quel mois un dossier validé est attribué (une validation à 23 h compte pour ce même jour).

**4. Prérequis et dépendances.** Aucun.

Setup step: Tier 3, step 29
Requires: Aucun.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-contribution_settings - Paramètres du tableau de bord de contribution avec le fuseau horaire et la comparaison entre pairs]

**6. Référence des champs.** Chaque modification est enregistrée immédiatement et affiche « Enregistré ».

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Fuseau horaire de l'établissement | Liste de choix : Heure de l'Est, Heure centrale, Heure des Rocheuses, Heure de l'Arizona (pas d'heure d'été), Heure du Pacifique, Heure de l'Alaska, Heure d'Hawaï (pas d'heure d'été) (toutes États-Unis), Heure du Royaume-Uni, UTC | Obligatoire | Une liste de neuf ; les autres fuseaux ne peuvent pas être choisis. | Heure de l'Arizona (États-Unis, pas d'heure d'été) |
| Afficher les moyennes des pairs et les comparaisons avec les meilleurs performeurs aux pathologistes | Case à cocher (« Visibilité de la comparaison entre pairs ») | Facultatif | Désactivé : les pathologistes ne voient que leur propre nombre de dossiers et leur progression vers les objectifs institutionnels. Activé : des chiffres anonymisés de moyenne des pairs et de meilleur performeur s'affichent aussi. | Désactivé |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:contribution-settings:manage` (risque élevé ; Admin et Directeur de laboratoire ; vérifié lorsque la modification est enregistrée).
**Limites connues.** Partiel : les valeurs sont conservées par le stockage de configuration système de l'application, qui écrit aujourd'hui dans le stockage du navigateur. Un stockage sur serveur afin que chaque poste de travail voie les mêmes paramètres est prévu (PS-345, `systemConfigStore.ts`) et le contrat serveur de configuration système existe dans `docs/architecture/DICTIONARIES_CONFIG_API.md`. D'ici là, un paramètre défini sur un ordinateur n'est pas vu sur un autre. Le suivi des RVU par dossier au-delà de ce commutateur n'est pas réalisé (il attend une revue juridique et de conformité).

### Retours {#screen-feedback}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Retours

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Retours

**3. Objectif métier et périmètre.** Le bouton de retour QA permet aux testeurs de signaler un problème depuis n'importe quel écran, avec une capture d'écran et sans données patient. Cet écran choisit quand le bouton s'affiche et qui reçoit les signalements. Par défaut, le bouton est masqué sur une instance de production et affiché sur une instance de validation.

**4. Prérequis et dépendances.** Aucun.

Setup step: Tier 3, step 30
Requires: Aucun.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-feedback - Paramètres des retours avec les trois modes et les listes de destinataires]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Bouton de retour QA | Choix (boutons radio) : Par défaut pour cette instance, Toujours affiché, Toujours masqué | Obligatoire | Une ligne indique s'il s'agit d'une instance de production ou de validation et quelle est la valeur par défaut. Erreur « Choisissez quand le bouton s'affiche. » | Par défaut pour cette instance |
| Destinataires QA | Adresses e-mail séparées par des virgules | Obligatoire dès que le bouton s'affiche | Erreur « Ajoutez au moins un destinataire : le bouton s'affiche sur cette instance et les retours n'auraient nulle part où aller. » Une adresse non valide est refusée. | Vide |
| Copie administrateur (cc) | Adresses e-mail séparées par des virgules | Facultatif | | Vide |
| Enregistrer | Bouton | Sans objet | Affiche « Enregistré » ou la raison. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:feedback:manage` (risque élevé ; Admin et Directeur de laboratoire ; le bouton Enregistrer est soumis à l'autorisation).
**Limites connues.** Contrat : `docs/architecture/CONFIG_DICTIONARIES_API.md`.

### Flux de recherche {#screen-research_feed}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Flux de recherche

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Flux de recherche

**3. Objectif métier et périmètre.** Le titre de littérature du tableau de bord d'accueil. Les articles proviennent directement de NCBI PubMed, triés par date de publication. C'est un flux automatisé, pas une sélection organisée ou révisée, et il ne doit jamais être présenté aux cliniciens comme une recommandation. Le flux est récupéré par le navigateur de l'utilisateur directement auprès de NCBI ; un flux en échec n'affiche rien et n'interrompt jamais le tableau de bord.

**4. Prérequis et dépendances.** Le navigateur du poste de travail doit pouvoir joindre NCBI.

Setup step: Tier 3, step 31
Requires: Aucun.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-research_feed - Paramètres du flux de recherche avec l'état de la récupération]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Dernière récupération réussie ; Dernière tentative | Affichage | Sans objet | Affiche « Jamais » avant le premier succès. | Sans objet |
| Afficher le flux sur le tableau de bord | Case à cocher | Facultatif | | Activé |
| Requête de recherche | Texte (syntaxe PubMed) | Obligatoire | Erreur « La requête de recherche ne peut pas être vide. » Les exclusions pour les publications rétractées, les prépublications, les éditoriaux, les commentaires et les lettres sont le seul filtre de qualité du flux ; les supprimer peut faire apparaître un article rétracté. | digital pathology OR synoptic reporting, English, excluding retracted, preprint, editorial, comment and letter |
| URL de l'article | Adresse https avec `{PMID}` | Obligatoire | Doit contenir `{PMID}` et être en https sur un hôte approuvé (nih.gov, nlm.nih.gov, doi.org). | https://pubmed.ncbi.nlm.nih.gov/{PMID}/ |
| Point de terminaison API | Adresse https | Obligatoire | URL de base eUtils de NCBI, sans barre oblique finale, hôte approuvé uniquement. Ne la modifiez que si NCBI déplace le service. | https://eutils.ncbi.nlm.nih.gov/entrez/eutils |
| Restaurer les valeurs par défaut, Enregistrer | Boutons | Sans objet | Après un enregistrement : « Les articles déjà en cache seront actualisés dans les 24 heures. » | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:research-feed:manage` (risque élevé ; Admin et Directeur de laboratoire).
**Limites connues.** Contrat : `docs/architecture/REFERRAL_RESEARCH_API.md` (les paramètres). La récupération des articles elle-même est un appel du navigateur à NCBI, sans serveur PathScribe entre les deux.

## Pages d'usage quotidien que ces paramètres pilotent {#ch4-reference-pages}
Breadcrumb: Accueil

Ces cinq pages sont des pages de travail ou de files, pas des écrans de maintenance. Elles sont décrites pour que l'administrateur sache ce que chacune affiche, qui peut l'ouvrir et quel paramètre la modifie. Aucune ne fait partie de la configuration.

### Accueil {#screen-home}
Breadcrumb: Accueil

**Statut :** Réalisé

**1. Navigation :** La page affichée après la connexion (`/`).
**2. Élément de maintenance :** Sans objet. C'est une page d'accueil.

**3. Objectif métier et périmètre.** Un ensemble de tuiles, une par endroit où la personne connectée peut aller. Une tuile ne s'affiche que si au moins l'un des écrans auxquels elle mène est accordé à l'un des rôles de la personne. Une personne sans aucun écran voit « Aucun de vos rôles ne vous donne encore accès à un écran. Demandez à votre administrateur de vous en attribuer un. » Un pied de page affiche la mention de copyright et l'état réel du système : un point coloré avec « Vérification », puis « Opérationnel », « Dégradé » ou « Indisponible », ou « État indisponible » lorsque la vérification elle-même échoue. L'état provient du contrôle de santé du serveur d'API (`GET /api/health/health-status/check`), effectué à l'ouverture de l'accueil puis de nouveau lorsque l'onglet redevient visible après cinq minutes (jamais sur minuterie). Il rapporte quatre composants fixes (base de données, messagerie, files d'attente, moteur d'interfaçage) sans aucune donnée patient, et le serveur décide de l'état global. Dans la démo, il n'y a pas de serveur : l'état est signalé comme simulé. Le pied de page ne fait aucune déclaration de conformité.

**4. Prérequis et dépendances.** L'accès est défini par le rôle et la capacité configurés au chapitre 2 (rôles du personnel) et par les capacités initiales. Il n'y a pas de paramètre de tuile propre.

Setup step: Reference, not part of setup
Requires: [Rôles du personnel](#screen-staff-roles)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-home - Accueil avec les tuiles d'un rôle]

**6. Colonnes, filtres et boutons.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Bon retour, (nom) | Texte | Sans objet | | Sans objet |
| Accession | Tuile | Sans objet | Ouvre Accession. Exige `screen:accession:open` (AP, Accessioneur). | Sans objet |
| Liste de travail | Tuile | Sans objet | Ouvre la Liste de travail, ainsi que les vues CQ en cytologie et AQ chirurgicale. Affichée si l'une de `screen:worklist:open`, `screen:cytology-qc-queue:open`, `screen:surgical-qa-worklist:open` est détenue. | Sans objet |
| Recherche | Tuile | Sans objet | `screen:search:open`. | Sans objet |
| File peropératoire | Tuile | Sans objet | `screen:intraop-queue:open` (Pathologiste, Fellow, Interne, AP). | Sans objet |
| Dépôt Lockbox | Tuile | Sans objet | `screen:lockbox-drop-off:open` (Accessioneur, Admin). | Sans objet |
| Ma contribution | Tuile | Sans objet | `screen:my-contributions:open` (Pathologiste, Fellow, Interne, AP, Directeur de laboratoire). | Sans objet |
| Contributions au poste de travail | Tuile | Sans objet | `screen:bench-contributions:open` (Accessioneur et les rôles de technologue). | Sans objet |
| Espace de travail Pathologie | Tuile de hub | Sans objet | Mène à Espace de travail Cytologie, Microtomie, Inclusion, Distribution des lames, Moléculaire, Gestion des lots et Révision des exceptions de marge. S'affiche si l'un d'eux est accordé. | Sans objet |
| Qualité et conformité | Tuile de hub | Sans objet | Mène à Journal d'audit, Assurance qualité, Exceptions de registre, Tableaux de bord d'autopsie et File d'envoi. Un badge indique combien de soumissions au registre nécessitent une intervention humaine. | Sans objet |
| RCP | Tuile | Sans objet | `screen:tumor-board:open` (Pathologiste, Fellow, Interne, AP). | Sans objet |
| Configuration | Tuile | Sans objet | `screen:configuration:open` (Admin, Auteur de modèles, Approbateur de modèles, Directeur de laboratoire). | Sans objet |

**7. Autorisations.** Chaque tuile a la capacité d'écran nommée ci-dessus ; il n'existe pas de capacité pour l'Accueil lui-même. Toute personne connectée accède à l'Accueil.
**Limites connues.** Les Commandes complémentaires et les vues AQ après validation ne sont pas des tuiles : ce sont une action sur un dossier et des vues dans la Liste de travail. Les tableaux de bord des opérations de l'établissement ne sont pas sur l'Accueil.

### Dépôt Lockbox {#screen-lockbox-drop-off}
Breadcrumb: Accueil > Dépôt Lockbox

**Statut :** Réalisé

**1. Navigation :** Accueil > **Dépôt Lockbox** (`/lockbox-drop-off`).
**2. Élément de maintenance :** Sans objet. C'est un écran de travail.

**3. Objectif métier et périmètre.** Une borne pour les prélèvements laissés dans la boîte de dépôt en dehors des heures de travail. La personne scanne chaque contenant ; PathScribe écrit un récépissé « Reçu dans la lockbox » non modifiable, avec un enregistrement provisoire lorsqu'aucune demande ne correspond. L'équipe du matin travaille à partir du **Dossier de nuit** jusqu'à ce que chaque récépissé soit enregistré en accession. Il comporte deux onglets : **Dépôt** et **Dossier de nuit**.

**4. Prérequis et dépendances.** Les listes de clients prescripteurs et de médecins du formulaire de l'enregistrement provisoire proviennent de [Clients](#screen-clients) et de [Médecins](#screen-physicians). Un code-barres correspond à une demande lorsqu'une demande qui le porte existe ; sans demande, un enregistrement provisoire est conservé et aucun numéro d'accession n'est créé.

Setup step: Reference, not part of setup
Requires: [Clients](#screen-clients), [Médecins](#screen-physicians)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-lockbox-drop-off - Zone de scan du Dépôt Lockbox et Dossier de nuit]

**6. Colonnes, filtres et boutons.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Scannez le code-barres du contenant | Saisie par scanner, puis Entrée | Obligatoire | Rien d'autre à confirmer. Un code-barres déjà reçu affiche le récépissé précédent et n'en crée pas de nouveau. | Vide |
| Urgent | Bascule | Facultatif | Marque le récépissé « Urgent, priorité élevée ». | Désactivée |
| Numéro de rappel (facultatif) | Texte | Facultatif | Affiché lorsque Urgent est activé. | Vide |
| Carte du récépissé | Établissement prescripteur (« Non renseigné » s'il n'y en a pas), Médecin prescripteur, Reçu, Reçu par, Numéro de rappel | Sans objet | Se termine par « Scannez le contenant suivant. » | Sans objet |
| Formulaire de l'enregistrement provisoire (« Aucune commande en attente pour ce code-barres ») | Code-barres ; Client prescripteur (ou « Absent de la liste ou inconnu » plus un client en texte libre) ; Médecin prescripteur ; Heure du dépôt | Facultatif (chaque champ) | L'Heure du dépôt commence à l'heure actuelle ; ne la modifiez que si le dépôt est plus ancien. **Enregistrer le dépôt** enregistre ; **Annuler** abandonne. | Heure actuelle |
| Dossier de nuit : Actualiser | Bouton | Sans objet | | Sans objet |
| Récapitulatif Délai de réception (AQ) | En attente, Attente la plus longue, Accessionnés, Médiane, Moyenne, Plus long, Médiane des urgents | Sans objet | Du dépôt dans la boîte de dépôt jusqu'à l'accession. « Pas encore de données » lorsque vide. | Sans objet |
| Tableau du Dossier de nuit | Colonnes : Numéro d'accession ou enregistrement provisoire, Priorité, Établissement prescripteur, Reçu, Reçu par, Attente, État, Actions | Sans objet | État : Commande rapprochée, Provisoire non rattaché, Provisoire rattaché à une commande. Vide : « Rien n'est en attente. » | Sans objet |
| Rattacher à une commande | Bouton, puis Vrai numéro de commande ou d'accession et **Rattacher** / **Annuler** | Obligatoire pour rattacher | Exige `lockbox:placeholder:resolve`. | Sans objet |
| Marquer comme accessionné | Bouton | Sans objet | Exige `lockbox:folder:review`. | Sans objet |
| Ouvrir l'accession | Bouton | Sans objet | Ouvre Accession pour le récépissé. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:lockbox-drop-off:open` (Accessioneur et Admin ; risque standard ; l'ouverture n'est pas auditée). Scanner et enregistrer un récépissé : `lockbox:specimen:receive` (risque élevé, audité ; Accessioneur). Dossier de nuit, récapitulatif et Marquer comme accessionné : `lockbox:folder:review` (Accessioneur, et Admin pour la supervision). Rattacher un enregistrement provisoire : `lockbox:placeholder:resolve` (Accessioneur).
**Limites connues.** Contrat : `docs/architecture/LOCKBOX_API.md`. Les récépissés ne contiennent aucune donnée patient. Dans la démonstration, le dossier commence avec six récépissés de départ (dont deux urgents et un déjà enregistré) ; **Réinitialisation complète** sous **Réinitialisation de démonstration** supprime tout ce qui a été fait sur l'écran et charge un nouveau jeu.

### Assurance qualité {#screen-quality-assurance}
Breadcrumb: Accueil > Qualité et conformité > Assurance qualité

**Statut :** Réalisé

**1. Navigation :** Accueil > **Qualité et conformité** > **Assurance qualité** (`/quality-assurance` ; un pilier peut être nommé dans l'adresse, `?pillar=`).
**2. Élément de maintenance :** Sans objet. C'est une file de travail.

**3. Objectif métier et périmètre.** La file de travail qualité. Elle est organisée en huit « piliers ». **Opérations** suit les non-conformités et les indicateurs de qualité clinique. **Financier** suit les non-conformités de facturation et de codage soulevées à la validation. **Moteur CAPA** gère le cycle de vie de l'action corrective : une correction ne se clôt pas d'elle-même, elle est escaladée ici jusqu'à ce que quelqu'un confirme qu'elle a fonctionné, avec une revue de direction périodique. **Cytologie QA** et **Tableau de bord QA** rendent compte de l'activité de relecture, **Mode Inspection** la met en forme comme preuve d'audit, **Rollup d'entreprise** est une consolidation entre laboratoires, et **Activités** liste les activités AQ définies dans le [Centre de configuration AQ](#screen-qa_config_center).

**4. Prérequis et dépendances.** Les types de non-conformité proviennent de [Non-conformités des spécimens](#screen-deficiencies) ; les activités et les déclencheurs de CAPA du [Centre de configuration AQ](#screen-qa_config_center) ; les tendances de [Politique de tendance de discordance](#screen-qa_trend_policy) ; les suivis en retard de [Suivi des contrôles](#screen-follow_up_tracking).

Setup step: Reference, not part of setup
Requires: [Centre de configuration AQ](#screen-qa_config_center), [Politique de tendance de discordance](#screen-qa_trend_policy), [Non-conformités des spécimens](#screen-deficiencies)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-quality-assurance - Assurance qualité avec les onglets de piliers et les tuiles]

**6. Colonnes, filtres et boutons.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Onglets de piliers | Opérations, Financier, Moteur CAPA, Cytologie QA, Rollup d'entreprise, Tableau de bord QA, Mode Inspection, Activités | Sans objet | | Opérations |
| Tuiles Opérations | Non-conformités (avec « N en retard »), Suivi non reçu, Liaison extemporanée, Discordance, Délai de contreseing, Revue d'habilitation, Dérive post-finalisation, Revue de concordance patient, Gestion patient, Demandes d'accès, Discordance de l'IA | Sans objet | Chacune ouvre sa liste. Les non-conformités sont réparties en Niveau dossier et Niveau spécimen. | Non-conformités |
| Actions Opérations | Soulever une non-conformité, Escalader vers CAPA, Confinement immédiat, Vérifier l'efficacité, Démarrer une revue de direction | Sans objet | **Soulever une non-conformité** : numéro de dossier (Rechercher), spécimen facultatif, Type de non-conformité, « Ce qui a été observé ». **Escalader vers CAPA** : Type de résolution, Action corrective, Cause racine, Action préventive (facultatif), Échéance du contrôle d'efficacité ; l'élément passe à En attente de vérification, pas à Clos. **Confinement immédiat** : « Ce qui a été fait » ; clôt immédiatement, sans cause racine ni contrôle ultérieur. **Vérifier l'efficacité** : « L'action corrective a-t-elle réellement fonctionné ? » avec Efficace — Clore ou Récidive — Rouvrir. | Sans objet |
| Tuiles Moteur CAPA | Recommandées, Tendances de discordance, Escaladées vers CAPA, Clos, Revues de direction | Sans objet | **Recommandées** : recommandations de CAPA issues des activités AQ (responsable indiqué) qu'un responsable AQ confirme ou rejette. **Tendances de discordance** : affichées uniquement aux détenteurs de `qa:pathologist-trend:view`. Un élément en récidive affiche « Rouverte après l'échec d'un contrôle d'efficacité ». | Recommandées |
| Tuiles Financier | Non-conformités de facturation, Résolues, File de revue de codage, Actes en attente d'approbation, Envois échoués (« dans Config ») | Sans objet | **Résoudre la non-conformité de facturation** : Motif de résolution, puis **Passer à la correction**. **File de revue de codage** : Réviser avec un Résultat de la revue (Aucun problème trouvé ou Soulever une non-conformité de facturation), l'acte et les Notes de l'auditeur. **Démarrer une correction** ouvre la correction de facturation. Envois échoués ouvre la File d'envoi dans Configuration. | Non-conformités de facturation |
| Exporter | Bouton sur les listes | Sans objet | Chaque liste a sa propre capacité d'export. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:quality-assurance:open` (Admin, Directeur de laboratoire, Relecteur AQ). Soumettre une revue de direction : `qa:management-review:submit` (risque élevé, exige l'écran Assurance qualité ; accordée avec les autres actions sur les écarts de qualité ; Batch 659). Une modification qui revient « non enregistrée » laisse désormais la fenêtre ouverte avec ce qui a été saisi. Décider des recommandations de CAPA : `qa:capa-recommendation:decide` (Admin, Directeur de laboratoire, Relecteur AQ). Voir et décider des tendances de discordance : `qa:pathologist-trend:view` et `qa:pathologist-trend:decide` (Directeur de laboratoire uniquement par défaut). Consigner un suivi : `qa:follow-up:record` (Admin, Directeur de laboratoire, Relecteur AQ). Exports : une capacité par liste (`qa:deficiencies:export`, `qa:management-reviews:export`, `qa:billing-deficiencies:export`, `qa:inspection-evidence:export` et d'autres ; toutes à risque élevé ; Admin et Relecteur AQ en détiennent la plupart). Corriger la facturation : `billing:applied-code:correct`.
**Limites connues.** Les « Audits des payeurs et des autorisations préalables » ne sont pas réalisés (aucune détection n'existe) : Financier n'a donc pas un tel onglet. Une CAPA n'est jamais ouverte automatiquement : chaque recommandation attend une personne. Contrat : `docs/architecture/QUALITY_API.md`.

### Révision des exceptions de marge {#screen-margin-exception-review}
Breadcrumb: Accueil > Espace de travail Pathologie > Révision des exceptions de marge

**Statut :** Réalisé

**1. Navigation :** Accueil > **Espace de travail Pathologie** > **Révision des exceptions de marge** (`/margin-exception-review`).
**2. Élément de maintenance :** Sans objet. C'est une file de travail.

**3. Objectif métier et périmètre.** Liste les réponses en texte libre sur la distance de marge que PathScribe n'a pas pu transformer en nombre avec confiance, afin qu'une personne puisse indiquer la distance réelle ou classer l'élément sans suite avec un motif.

**4. Prérequis et dépendances.** Les éléments proviennent de comptes rendus synoptiques (chapitre 6) dont le champ de marge est en texte libre.

Setup step: Reference, not part of setup
Requires: Aucun.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-margin-exception-review - Liste de la Révision des exceptions de marge]

**6. Colonnes, filtres et boutons.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Ligne | Nom du patient et accession ; libellé du champ ; le texte brut ; le motif | Sans objet | Motifs : Aucune réponse donnée pour le moment ; Aucun nombre trouvé dans le texte ; Un nombre a été trouvé, mais entouré d'un texte que cet analyseur ne reconnaît pas avec confiance. | Sans objet |
| Distance de marge (mm) | Nombre, 0 ou plus, pas de 0,1 | Obligatoire pour résoudre | Erreur « Saisissez une distance de marge supérieure ou égale à 0. » | Vide |
| Résoudre | Bouton | Sans objet | Enregistre la distance indiquée. Exige `case:margin-exception:resolve`. | Sans objet |
| Classer sans suite | Bouton, puis une fenêtre avec **Pourquoi ce champ n'a pas de distance à indiquer** | Motif obligatoire | **Classer sans suite** ou Annuler. La personne et le motif sont consignés. | Sans objet |
| Ouvrir le dossier | Bouton | Sans objet | Ouvre le compte rendu et revient ici. | Sans objet |
| Liste vide | Texte | Sans objet | « Aucune exception de distance de marge en attente. » | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:margin-exception-review:open` (Pathologiste, Fellow, Interne, AP). Résoudre ou classer sans suite : `case:margin-exception:resolve` (risque élevé ; les mêmes rôles).
**Limites connues.** Aucun écran de configuration ne règle l'analyseur ; la règle est dans le produit.

### File de relecture QC en cytologie {#screen-cytology-qc-queue}
Breadcrumb: Accueil > Liste de travail > CQ en cytologie

**Statut :** Réalisé

**1. Navigation :** Accueil > **Liste de travail**, vue **CQ en cytologie** (`/cytology-qc-queue` redirige vers la vue de la Liste de travail). Titre : File de relecture QC en cytologie.
**2. Élément de maintenance :** Sans objet. C'est une file de travail.

**3. Objectif métier et périmètre.** Le travail de relecture produit par les [Règles CQ de cytologie](#screen-cytology_qc_rules) et les [taux de sélection aléatoire QC](#screen-cytology_qc_settings). Chaque élément est un dossier sélectionné pour une relecture par un pair, avec une échéance issue du délai de sa règle. Deux vues : **File d'attente** et **Conformité**.

**4. Prérequis et dépendances.** Sans règles de CQ, rien n'est sélectionné. Le groupe de relecteurs d'un élément provient des rôles de relecteurs éligibles de la règle.

Setup step: Reference, not part of setup
Requires: [Règles CQ de cytologie](#screen-cytology_qc_rules)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-cytology-qc-queue - File de relecture QC en cytologie]

**6. Colonnes, filtres et boutons.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| File d'attente / Conformité | Onglets | Sans objet | Conformité affiche le panneau de conformité du CQ. | File d'attente |
| Tous les éléments, Escalades et divergences, Routine et aléatoire | Onglets | Sans objet | Filtre la file. | Tous les éléments |
| Ligne | Dossier, nom de la règle, niveau de priorité, état du délai, « Sélectionné par (motifs) », « Groupe de relecteurs (rôles) » | Sans objet | État du délai : Dans les délais, Délai proche, Délai dépassé. | Sans objet |
| Ouvrir le cas | Bouton | Sans objet | | Sans objet |
| M'attribuer | Bouton | Sans objet | Refusé si vous avez validé le dossier (« un autre pathologiste doit le réviser ») ou si vous ne faites pas partie du groupe de relecteurs. | Sans objet |
| Enregistrer la concordance, Enregistrer une divergence | Boutons | Sans objet | Consignent la relecture. Une divergence ouvre une fenêtre pour les détails. Exige `cytology:qc-review:record`. Un dossier « Attribué à un autre relecteur » n'affiche aucun bouton. | Sans objet |
| Escalader | Bouton et fenêtre (« Escalader cette révision en retard ? ») avec **Motif** | Motif obligatoire | Remet une relecture en retard dans la file, non attribuée. | Sans objet |
| Contournement superviseur | Bouton et fenêtre (« Contourner la révision CQ pour ce cas ? ») avec **Justification** | Justification obligatoire | Approuve le dossier sans relecture CQ pour éviter un retard clinique. Le nom et la justification sont conservés dans le journal d'audit. | Sans objet |
| Vide | Texte | Sans objet | « Aucun cas dans cette file. » | Sans objet |

**7. Autorisations.** Ouvrir la vue : `screen:cytology-qc-queue:open` (Pathologiste, Fellow). Consigner une relecture ou escalader : `cytology:qc-review:record` (Pathologiste, Fellow ; risque élevé). Contournement superviseur : `cytology:qc-review:bypass` (risque élevé ; détenue par aucun rôle par défaut, seulement par le super-administrateur ForMedrixAI ; un administrateur doit l'attribuer).
**Limites connues.** Contrat : `docs/architecture/CYTOLOGY_QC_API.md`.
