---
chapter: 3
id: ch3
title: Niveau 2 : Répertoires de référence et données cliniques de base (à configurer en deuxième)
---

# Niveau 2 : Répertoires de référence et données cliniques de base (à configurer en deuxième) {#ch3}

Le niveau 2 regroupe les listes dans lesquelles puise le travail quotidien du laboratoire : services, types de spécimens, colorations, protocoles, contenants, couleurs de cassettes, médecins, niveaux de service des clients, ainsi que les listes de codes et de classifications utilisées dans les comptes rendus. Aucune de ces listes ne fonctionne seule. Un type de spécimen renvoie à un service, à une sous-spécialité et à un protocole. Une règle de cassette renvoie à un protocole et à une couleur. Un niveau de service client renvoie à un établissement client. C'est pourquoi le niveau 2 vient après le niveau 1 (les établissements, les personnes et les appareils du [Chapitre 2](#ch2)) et suit son propre ordre.

Configurez le niveau 2 dans l'ordre ci-dessous. Chaque écran comporte un encadré **Ordre de configuration** qui donne la même information, et le générateur vérifie qu'aucun écran n'en exige un qui vient après lui.

1. [Organismes de réglementation](#screen-governing_bodies) : les organismes de normalisation et leurs durées de conservation. Réservé à l'usage interne de ForMedrixAI.
2. [Systèmes de codage](#screen-code_systems) : quels systèmes de codes de diagnostic sont désactivés, facultatifs ou obligatoires dans chaque pays, et les licences que vous détenez.
3. [Services de terminologie](#screen-terminology) : un contrôle de l'état des services de recherche de codes.
4. [Import de codes (en masse)](#screen-code_import) : un import CSV de codes de facturation.
5. [Services](#screen-departments) : la classification générale d'un prélèvement à l'arrivée.
6. [Sous-spécialités](#screen-subspecialties) : les groupes de travail de pathologie et leur acheminement.
7. [Catalogue diagnostique](#screen-stains) : colorations, anticorps, analyses moléculaires, protocoles de coupe et macros de commande rapide.
8. [Dictionnaire des protocoles](#screen-protocols) : le flux de traitement d'un prélèvement.
9. [Types de contenants](#screen-container_types) : les contenants dans lesquels arrivent les prélèvements.
10. [Dictionnaire des spécimens](#screen-specimens) : les types de spécimens, qui relient les listes ci-dessus.
11. [Indicateurs](#screen-flags) : indicateurs de dossier et de prélèvement.
12. [Dictionnaire des emplacements d'actifs](#screen-asset_locations) : emplacements physiques nommés et emplacements de stockage de la morgue.
13. [Chaîne du froid](#screen-cold_chain) : unités de stockage, types de conditions et relevés de température.
14. [Non-conformités des spécimens](#screen-deficiencies) : types de non-conformités et de résolutions.
15. [Cartes d'organes](#screen-organ_maps) : couleurs, motifs et liaisons de questions pour les cartes anatomiques.
16. [Couleurs de cassette](#screen-cassette_colors) : le répertoire des couleurs.
17. [Règles d'acheminement des cassettes](#screen-cassette_routing_rules) : quelle couleur reçoit une cassette.
18. [Couleurs d'encre](#screen-ink_colors) : les couleurs d'encre de marge.
19. [Lots de réactifs et de solutions](#screen-reagent_lots) : lot, péremption et statut de CQ des réactifs.
20. [Médecins](#screen-physicians) : médecins prescripteurs et médecins expéditeurs.
21. [Configuration de l'établissement](#screen-clients) : comptes clients (le même écran que le [Répertoire des établissements](#screen-facility-dictionary)).
22. [Niveaux de service par client](#screen-client_sla) : engagements de délai par client.
23. [Règles de déclenchement anormal](#screen-abnormal_trigger_rules) : les couples champ et valeur qui signalent un dossier.
24. [Onglet Cytologie](#screen-tab-cytology) : la page d'accueil des paramètres de cytologie.
25. [Système de nomenclature](#screen-cytology_nomenclature) : le système de compte rendu que la cytologie utilise.
26. [Interprétation et recommandations](#screen-cytology_categories) : les listes de catégories de cytologie.
27. [Classification non gynécologique (Milan/Paris)](#screen-non_gyn_cytology_categories) : catégories salivaires et urinaires.
28. [Stratégie de dépistage](#screen-cytology_screening_strategy) : co-test ou HPV en première intention, et délais de rappel.
29. [Orientation non gynécologique](#screen-cytology_routing) : la liste de travail vers laquelle va un dossier non gynécologique.
30. [Règles nationales et du laboratoire](#screen-cytology_compliance_features) : plafond de charge de travail, relecture rétrospective, signature en urgence et intervalles de dépistage.
31. [Instrumentation assistée](#screen-cytology_instrumentation) : imagerie de lame entière ou relecture traditionnelle.
32. [Corrélation cyto-histologique (SNOMED)](#screen-snomed_histology_severity_mapping) : les rangs de gravité SNOMED utilisés dans la corrélation.
33. [Cas de recherche et objets des lots](#screen-research_cases) : comment les cas de recherche sont reconnus et tenus hors du travail clinique, et à quoi peut servir un porteur (Batch 728).

Les parties ci-dessous suivent le sujet, non l'ordre de configuration : la [Partie A](#ch3-anatomic-specialties) les spécialités d'anatomie pathologique, la [Partie B](#ch3-specimen-tissue) les prélèvements et les tissus, la [Partie C](#ch3-container-cassette) les contenants, les cassettes et l'encre, la [Partie D](#ch3-stains-protocols) les colorations et les protocoles, la [Partie E](#ch3-code-libraries) les bibliothèques de codes, et la [Partie F](#ch3-physicians-clients) les médecins, les clients et les organismes de réglementation.

**Mots d'état.** Chaque écran affiche l'un des cinq mots d'état de la norme de rédaction : Réalisé, Démonstration, Partiel, Prévu, Non réalisé. Presque tous les répertoires de ce chapitre disposent d'un service de production et d'un contrat d'API écrit, si bien que la plupart sont **Réalisé**. Les exceptions sont nommées à l'écran : les paramètres des [Cartes d'organes](#screen-organ_maps) et la politique des [Systèmes de codage](#screen-code_systems) sont conservés uniquement dans le navigateur, et les relevés de la [Chaîne du froid](#screen-cold_chain) sont simulés.

**Ce que tous les écrans de répertoire ont en commun.**
- Une modification exige la capacité `config:...:manage` propre à l'écran. Sans elle, vous pouvez ouvrir l'écran et voir les données, mais les commandes sont grisées. Les capacités de ce chapitre sont classées à risque élevé, de sorte que chaque vérification (autorisée ou refusée) est inscrite dans le journal d'audit.
- La plupart des répertoires sont tenus par **laboratoire exécutant** ou **Global** (tous les laboratoires). Un nom ou un code doit être unique au sein d'un laboratoire, ou au sein de Global.
- La plupart des listes ne suppriment rien. Une ligne est rendue **Inactif**, ce qui conserve tous les enregistrements qui l'utilisent déjà.
- Un nom ou un code qui provient d'une demande et ne correspond à rien crée une ligne **Non vérifié** (les Services, les Médecins, les Emplacements d'actifs et les Établissements procèdent ainsi). La ligne fonctionne, mais quelqu'un doit la contrôler et sélectionner **Vérifier**.

## Partie A : Spécialités d'anatomie pathologique {#ch3-anatomic-specialties}
Breadcrumb: Accueil > Configuration

Cette partie regroupe les écrans qui définissent les services et les groupes de travail du laboratoire, ainsi que l'onglet Cytologie. PathScribe n'a pas d'écran unique « spécialité ». Les cinq spécialités d'anatomie pathologique sont configurées par plusieurs écrans énumérés ici ; le tableau indique donc pour chacune ce qui existe et ce qui n'existe pas.

| Spécialité | Ce que vous pouvez configurer aujourd'hui | Ce qui n'existe pas |
|---|---|---|
| Pathologie chirurgicale | Le [service](#screen-departments) Tissu chirurgical et son modèle d'examen macroscopique par défaut ; la catégorie de spécimen SURGICAL_TISSUE du [Dictionnaire des spécimens](#screen-specimens) ; les [cartes d'organes](#screen-organ_maps) et les dictionnaires de protocoles et de cassettes des Parties B à D. | Un écran de paramètres « pathologie chirurgicale » distinct. |
| Cytopathologie | Le [service](#screen-departments) Liquides / Cytologie ; les catégories de spécimen GYN_CYTOLOGY et NON_GYN_CYTOLOGY ; tout l'[onglet Cytologie](#screen-tab-cytology) (huit écrans dans ce chapitre et quatre autres dans les Chapitres 4 et 8). | Aucun. C'est la seule spécialité qui dispose de son propre onglet de paramètres. |
| Dermatopathologie | Une [sous-spécialité](#screen-subspecialties) nommée Dermatopathologie (préchargée), et une règle d'acheminement de dossiers intégrée qui lui envoie les mots-clés cutanés. Les cartes des étapes de la chirurgie micrographique de Mohs font partie des [cartes d'organes](#screen-organ_maps). | Un service, une catégorie de spécimen ou un écran de paramètres de dermatopathologie. |
| Hématopathologie | Une [sous-spécialité](#screen-subspecialties) nommée Hématopathologie (préchargée), et une règle d'acheminement de dossiers intégrée qui lui envoie les mots-clés d'hématologie. | Un service, une catégorie de spécimen ou un écran de paramètres d'hématopathologie. |
| Autopsie | La catégorie de spécimen AUTOPSY du [Dictionnaire des spécimens](#screen-specimens) ; les emplacements de stockage de la morgue et une vue d'occupation dans le [Dictionnaire des emplacements d'actifs](#screen-asset_locations) ; les protocoles de coupe d'autopsie du [Dictionnaire des protocoles](#screen-protocols) ; la discipline AUTOPSY des groupes de postes de travail ([Groupes de postes de travail](#screen-workstation_groups)) ; et les types d'objectif de délai de traitement AUTOPSY_PAD et AUTOPSY_FAD de l'[onglet Configuration du TAT](#screen-tab-tat). | Un onglet autopsie ou un écran de maintenance propre à l'autopsie. |

Les règles d'acheminement de dossiers intégrées qui utilisent ces sous-spécialités se trouvent dans [Règles d'acheminement](#screen-routing_rules) (Chapitre 4).

### Services {#screen-departments}
Breadcrumb: Accueil > Configuration > Système > Références cliniques > Services

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Références cliniques**
**2. Élément de maintenance :** Services

**3. Objectif métier et portée.** Un service est la classification générale d'un prélèvement à l'arrivée : par exemple Tissu chirurgical, Liquides / Cytologie, Histologie seule / Consultation. Il détermine avec quel modèle d'examen macroscopique un dossier démarre, si le service conserve les enregistrements pendant une durée différente de celle par défaut de la juridiction, et quel directeur de laboratoire et quel numéro d'accréditation figurent dans l'en-tête de ses comptes rendus. Le lien Masque de dossier de la fenêtre de modification vous mène à [Configuration du masque de dossier](#screen-case_mask_config), où se définit le masque de numéro d'accession du service.

**4. Prérequis et dépendances.** La dérogation de conservation est comparée au plancher défini dans [Organismes de réglementation](#screen-governing_bodies) pour la juridiction en cours. Si aucun organisme n'a de durée de conservation pour la juridiction, il n'y a pas de plancher auquel comparer. La liste des modèles d'examen macroscopique est figée dans le produit (trois choix) ; elle ne dépend donc d'aucun autre écran. Les services sont lus par le [Dictionnaire des spécimens](#screen-specimens) (chaque type de spécimen nomme un service), par le [Dictionnaire des protocoles](#screen-protocols) (un nouveau protocole dans un service de liquides démarre comme une filière de décantation) et par la saisie des demandes, qui crée un service Non vérifié lorsqu'une demande en nomme un qui n'existe pas.

Setup step: Tier 2, step 5
Requires: [Organismes de réglementation](#screen-governing_bodies)
Unlocks: [Dictionnaire des spécimens](#screen-specimens), [Dictionnaire des protocoles](#screen-protocols), [Configuration du masque de dossier](#screen-case_mask_config)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-departments - Liste des services avec recherche, filtre de statut et Ajouter un service]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher | Texte | Facultatif | Restreint la liste selon le nom du service. | Vide |
| Filtre de statut | Choix : Tous, Actif, Inactif, Non vérifié | Facultatif | Les services non vérifiés ont été créés automatiquement à partir d'une demande. | Tous |
| Colonne Service | Texte | Sans objet | Nom et description. | Sans objet |
| Colonne Modèle d'examen macroscopique par défaut | Texte | Sans objet | La filière d'examen macroscopique sur laquelle le service démarre. | Sans objet |
| Colonne Masque de dossier | Texte | Sans objet | Affiche « DEFINED » suivi du masque lorsque le service en a un dans Configuration du masque de dossier. | Sans objet |
| Colonne Dérogation de conservation | Texte | Sans objet | Le nombre de jours de dérogation par type de matériel, le cas échéant. | Sans objet |
| Colonne Statut | Texte | Sans objet | Actif, Inactif ou Non vérifié. Une note de création automatique s'affiche lorsque le service provient d'une demande. | Sans objet |
| + Ajouter un service | Bouton | Sans objet | Ouvre la fenêtre de modification avec un service vide. | Sans objet |
| Vérifier | Bouton de ligne | Sans objet | Affiché uniquement pour les services non vérifiés. Marque le service comme contrôlé. | Sans objet |
| Modifier | Bouton de ligne | Sans objet | Ouvre la fenêtre de modification. | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Le nom du service tel que le personnel le voit à l'accession. | Aucun |
| Description | Texte libre | Facultatif | Les types de prélèvements qui relèvent de ce service. | Aucune |
| Modèle d'examen macroscopique par défaut | Choix : Tissu standard, Liquide / Bloc cellulaire, Histologie seule | Obligatoire | La filière d'examen macroscopique sur laquelle démarre un dossier de ce service. Les trois choix sont figés. Ils sont enregistrés sous les valeurs `grossing_standard_tissue`, `grossing_fluid_cytology` et `grossing_histology_only`. | Tissu standard |
| Masque de dossier | Lien (modification uniquement) | Sans objet | Ouvre [Configuration du masque de dossier](#screen-case_mask_config). | Sans objet |
| Statut | Interrupteur Actif / Inactif | Facultatif | Un service inactif n'est pas proposé à l'arrivée. Si des entrées du Dictionnaire des spécimens nomment encore le service, une fenêtre **Service encore utilisé** vous demande de confirmer avec **Désactiver quand même**. Ces entrées ne sont pas modifiées. | Actif |
| Dérogation de conservation : Bloc, Lame, Tissu humide | Nombre entier de jours supérieur à 0, une case par type de matériel | Facultatif | Une case vide utilise la valeur par défaut de la juridiction. Une valeur inférieure au plancher de l'organisme de réglementation ouvre une fenêtre de confirmation (ci-dessous). | Vide |
| Nom du directeur de laboratoire | Texte | Facultatif | Image de marque de l'en-tête de compte rendu pour ce service. À défaut, l'établissement, puis l'entreprise. | Vide |
| Numéro d'accréditation CLIA / ISO | Texte | Facultatif | Même repli. | Vide |
| URL du logo d'en-tête | Lien https | Facultatif | L'adresse d'une image hébergée. Seule l'adresse est enregistrée, jamais l'image. Doit commencer par `https`. | Vide |

#### Fenêtre de confirmation sous le plancher

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Justification | Texte libre | Obligatoire | Pourquoi ce service conserve les enregistrements moins longtemps que le plancher de l'organisme de réglementation. | Aucune |
| Confirmer la dérogation sous le plancher | Bouton | Sans objet | Enregistre la dérogation et écrit l'événement d'audit « Retention Override Below Floor ». | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Ajouter, modifier, vérifier, désactiver : `config:departments:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** Le seul contrôle de référence à la désactivation porte sur le Dictionnaire des spécimens. La liste des modèles d'examen macroscopique du service est figée à trois choix et ne peut pas être étendue. Les services préchargés sont Tissu chirurgical, Liquides / Cytologie, Histologie seule / Consultation et un service Coupe congelée non vérifié, créé automatiquement.

### Sous-spécialités {#screen-subspecialties}
Breadcrumb: Accueil > Configuration > Système > Références cliniques > Sous-spécialités

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Références cliniques**
**2. Élément de maintenance :** Sous-spécialités

**3. Objectif métier et portée.** Une sous-spécialité est un groupe de travail de pathologie tel que le tube digestif, le sein, la dermatopathologie ou l'hématopathologie. Chacune peut être un **groupe de travail** (les dossiers sont attribués à des pathologistes nommés) ou une **réserve** (tout membre peut prendre un dossier). Une sous-spécialité possède une liste de types de spécimens, une liste de pathologistes et d'internes, et une liste d'établissements. Des règles d'acheminement lui envoient des dossiers, et le sélecteur rapide de distribution des lames énumère celles qui sont actives. Une réserve gérée par le système, nommée Pathologie générale, sert de solution de repli pour les dossiers qui ne correspondent à rien d'autre.

**4. Prérequis et dépendances.** L'onglet Médecins énumère le personnel dont le rôle est Pathologiste ou Interne, et l'onglet Établissements énumère les établissements actifs. Créez d'abord les deux au niveau 1 ([Membres](#screen-staff-members), [Répertoire des établissements](#screen-facility-dictionary)), faute de quoi ces onglets sont vides. Les types de spécimens peuvent être liés ici, ou plus tard depuis l'éditeur du [Dictionnaire des spécimens](#screen-specimens), où chaque type de spécimen nomme une sous-spécialité. Un type de spécimen ne peut appartenir qu'à une seule sous-spécialité.

Setup step: Tier 2, step 6
Requires: [Membres](#screen-staff-members), [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: [Dictionnaire des spécimens](#screen-specimens), [Règles d'acheminement](#screen-routing_rules)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-subspecialties - Liste des sous-spécialités avec recherche, filtre de statut et Ajouter une sous-spécialité]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher | Texte | Facultatif | Restreint la liste selon le nom de la sous-spécialité. | Vide |
| Filtre de statut | Choix : Tous, Actif, Inactif | Facultatif | | Tous |
| Colonne Nom de la sous-spécialité | Texte | Sans objet | Nom avec un point de groupe de travail, un badge SYSTÈME pour la réserve gérée par le système, la description et le laboratoire exécutant. | Sans objet |
| Colonne Statut | Texte | Sans objet | Actif ou Inactif. | Sans objet |
| Modifier | Bouton de ligne | Sans objet | Ouvre la fenêtre de modification. La réserve gérée par le système affiche **Lecture seule** à la place. | Sans objet |
| Pied de page Synchronisation en direct du système | Texte | Sans objet | Le nombre de sous-spécialités affichées. | Sans objet |

#### Fenêtre de modification : volet de gauche

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Unique pour le laboratoire exécutant, ou pour l'ensemble lorsque la sous-spécialité est Global. | Aucun |
| Statut | Interrupteur Actif / Inactif | Facultatif | La désactivation demande une confirmation (ci-dessous). La réactivation affiche un avis indiquant que les liens antérieurs ne sont pas rétablis. | Actif |
| Mode d'attribution | Choix : groupe de travail ou réserve | Obligatoire | Groupe de travail : les dossiers sont attribués à des pathologistes nommés. Réserve : tout membre de la réserve peut prendre un dossier. Les prises de dossier en réserve sont contrôlées lorsqu'un dossier est pris ou accepté. | Groupe de travail |
| Laboratoire exécutant | Choix : Global ou un laboratoire exécutant actif | Facultatif | Proposé pour une réserve. Limite le nom, et l'indicateur fourre-tout, à ce laboratoire. | Global |
| Fourre-tout | Case à cocher | Facultatif | Une sous-spécialité au plus par périmètre de laboratoire est la sous-spécialité fourre-tout. L'enregistrement retire l'indicateur au titulaire précédent. | Désactivé |
| Description | Texte libre | Facultatif | | Aucune |

#### Fenêtre de modification : volet de droite

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Onglet Prélèvements | Liste à cocher des entrées du Dictionnaire des spécimens | Facultatif | Cocher une entrée inscrit cette sous-spécialité sur le type de spécimen. Une entrée qui appartient déjà à une autre sous-spécialité affiche « Actuellement dans : X ». | Aucune case cochée |
| Onglet Médecins | Liste à cocher du personnel ayant le rôle Pathologiste ou Interne | Facultatif | Les membres du groupe de travail. | Aucune case cochée |
| Onglet Établissements | Liste à cocher des établissements actifs | Facultatif | Les établissements que le groupe de travail dessert. Enregistrés comme la liste de clients de la sous-spécialité. | Aucune case cochée |
| Résumé de pied de page | Texte | Sans objet | Le nombre de prélèvements, de médecins et d'établissements cochés. | Sans objet |

#### Fenêtre de confirmation de désactivation

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Liste des incidences | Texte | Sans objet | Énumère les spécimens qui seront dissociés, les médecins qui seront désaffectés, les entrées de Configuration du TAT qui lui sont encore rattachées et les règles d'acheminement qui la ciblent encore. | Sans objet |
| Désactiver et dissocier | Bouton | Sans objet | Désactive la sous-spécialité et supprime les liens avec les spécimens et les médecins. Les entrées de TAT et les règles d'acheminement sont énumérées mais non modifiées. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, désactiver : `config:subspecialties:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** Les sous-spécialités préchargées sont Tube digestif, Sein, Dermatopathologie, Neuro, Hématopathologie, Gynécologie chirurgicale, Uro, Thoracique, une réserve Oncologie et la réserve Pathologie générale gérée par le système. La désactivation d'une sous-spécialité ne supprime pas les règles d'acheminement ni les entrées de TAT qui la nomment encore. Corrigez-les sur leurs propres écrans.

### Onglet Cytologie {#screen-tab-cytology}
Breadcrumb: Accueil > Configuration > Cytologie

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie**
**2. Élément de maintenance :** Paramètres de cytologie (un menu latéral de douze sections)

**3. Objectif métier et portée.** L'onglet Cytologie regroupe tous les paramètres propres à la cytopathologie. C'est un menu latéral de douze sections. Huit sont documentées dans ce chapitre, trois (paramètres de CQ, plafond de charge de travail et corrélation histologique) dans le [Chapitre 4](#screen-cytology_qc_settings), et une (le registre) dans le Chapitre 8. Chaque section vérifie sa propre capacité. Une personne qui ne l'a pas voit la section en lecture seule. Passer d'une section à une autre avec des modifications non enregistrées demande d'abord une confirmation.

| Libellé du menu latéral | Écran |
|---|---|
| Interprétation et recommandations | [Interprétation et recommandations](#screen-cytology_categories) |
| Classification non gynécologique (Milan/Paris) | [Classification non gynécologique](#screen-non_gyn_cytology_categories) |
| Système de nomenclature | [Système de nomenclature](#screen-cytology_nomenclature) |
| Stratégie de dépistage | [Stratégie de dépistage](#screen-cytology_screening_strategy) |
| Orientation non gynécologique | [Orientation non gynécologique](#screen-cytology_routing) |
| Règles nationales et du laboratoire | [Règles nationales et du laboratoire](#screen-cytology_compliance_features) |
| Instrumentation assistée | [Instrumentation assistée](#screen-cytology_instrumentation) |
| Corrélation cyto-histologique (SNOMED) | [Corrélation cyto-histologique (SNOMED)](#screen-snomed_histology_severity_mapping) |
| Paramètres de CQ | [Chapitre 4](#screen-cytology_qc_settings) |
| Plafond de charge de travail | [Chapitre 4](#screen-cytology_workload_cap) |
| Corrélation histologique | [Chapitre 4](#screen-cytology_histology_correlation) |
| Registre | [Chapitre 8](#screen-cytology_registry) |

**4. Prérequis et dépendances.** L'onglet lui-même n'exige rien. Ses dérogations par établissement énumèrent les établissements du [Répertoire des établissements](#screen-facility-dictionary) ; configurez-le donc d'abord.

Setup step: Tier 2, step 24
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: [Système de nomenclature](#screen-cytology_nomenclature), [Interprétation et recommandations](#screen-cytology_categories), [Classification non gynécologique](#screen-non_gyn_cytology_categories), [Stratégie de dépistage](#screen-cytology_screening_strategy), [Orientation non gynécologique](#screen-cytology_routing), [Règles nationales et du laboratoire](#screen-cytology_compliance_features), [Instrumentation assistée](#screen-cytology_instrumentation), [Corrélation cyto-histologique (SNOMED)](#screen-snomed_histology_severity_mapping)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: tab-cytology - Onglet Cytologie avec son menu latéral de sections]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Menu latéral | Liste de douze sections | Sans objet | Sélectionner une section l'ouvre à droite. Une section dont vous n'avez pas la capacité s'ouvre en lecture seule. | Première section |
| Invite de modification non enregistrée | Fenêtre de confirmation | Sans objet | Apparaît lorsque vous quittez une section avec des modifications non enregistrées. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Chaque section indique sa propre capacité. Les rôles Administrateur, Directeur de laboratoire et Superadmin détiennent par défaut les capacités de cytologie, avec une exception nommée dans [Règles nationales et du laboratoire](#screen-cytology_compliance_features).

**Limites connues.** Aucune connue.

### Système de nomenclature {#screen-cytology_nomenclature}
Breadcrumb: Accueil > Configuration > Cytologie > Système de nomenclature

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > menu latéral **Système de nomenclature**
**2. Élément de maintenance :** Système de nomenclature

**3. Objectif métier et portée.** Choisit le système de compte rendu de cytologie que le laboratoire utilise. L'entreprise a une valeur par défaut et chaque établissement peut avoir la sienne. Ce choix détermine la liste de catégories que voient le cytotechnicien et le pathologiste lorsqu'ils interprètent un dossier.

**4. Prérequis et dépendances.** La liste des établissements pour les dérogations provient du [Répertoire des établissements](#screen-facility-dictionary). Si vous l'omettez, **+ Ajouter une dérogation** n'a aucun établissement à proposer. Les listes de catégories de chaque système se modifient dans [Interprétation et recommandations](#screen-cytology_categories).

Setup step: Tier 2, step 25
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: [Interprétation et recommandations](#screen-cytology_categories)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_nomenclature - Valeur par défaut de l'entreprise et dérogations par établissement]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Valeur par défaut de l'entreprise | Choix : Bethesda, BSCC/RCPath, München III, SFCC (Bethesda francisé), PALGA CISOE-A | Obligatoire | Utilisée par tous les établissements sans dérogation propre. L'enregistrement l'écrit. | Bethesda |
| + Ajouter une dérogation | Bouton | Sans objet | Ouvre une ligne pour choisir un établissement et un système. | Sans objet |
| Établissement (ligne de dérogation) | Liste de choix des établissements | Obligatoire | L'établissement concerné par la dérogation. | Aucun |
| Système (ligne de dérogation) | Choix parmi les cinq mêmes systèmes | Obligatoire | Le système de compte rendu que cet établissement utilise. | Aucun |
| Retirer | Bouton de ligne | Sans objet | Retire la dérogation. L'établissement revient à la valeur par défaut de l'entreprise. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:cytology-nomenclature:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut.

**Limites connues.** PALGA CISOE-A peut être choisi ici, mais [Interprétation et recommandations](#screen-cytology_categories) n'a pas d'éditeur de catégories pour ce système.

### Interprétation et recommandations {#screen-cytology_categories}
Breadcrumb: Accueil > Configuration > Cytologie > Interprétation et recommandations

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > menu latéral **Interprétation et recommandations**
**2. Élément de maintenance :** Interprétation et recommandations (le dictionnaire des catégories de cytologie)

**3. Objectif métier et portée.** Contient les listes de catégories à partir desquelles un compte rendu de cytologie est construit, pour le système de nomenclature choisi : qualité du prélèvement, catégorisation générale, interprétation ou résultat, et recommandations. Chaque entrée indique si un pathologiste doit la relire avant la validation et quelle gravité elle suggère à la détection d'anomalies. La liste Bethesda est la référence. La vue SFCC est une copie en lecture seule de Bethesda avec le texte français.

**4. Prérequis et dépendances.** Définissez d'abord le système utilisé dans [Système de nomenclature](#screen-cytology_nomenclature), afin de modifier la liste que les utilisateurs verront. La gravité suggérée est lue par le contrôle de discordance clinique et par la détection d'anomalies lors de la validation d'un dossier. Si vous omettez cet écran, les listes intégrées sont utilisées.

Setup step: Tier 2, step 26
Requires: [Système de nomenclature](#screen-cytology_nomenclature)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_categories - Liste de catégories du système choisi avec onglets de sections]

**6. Référence des champs.**

#### Commandes de la page

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Système de nomenclature | Choix : Bethesda, BSCC/RCPath, München III, SFCC | Obligatoire | La liste en cours de modification. SFCC est en lecture seule et dérivé de Bethesda. PALGA CISOE-A n'est pas proposé ici. | Bethesda |
| Onglets de sections | Onglets : Adéquation du prélèvement, Catégorisation générale, Interprétation / Résultat, Recommandations | Obligatoire | Chaque onglet est une liste de catégories. | Adéquation du prélèvement |
| Afficher les inactifs | Case à cocher | Facultatif | Inclut les catégories désactivées. | Désactivé |
| + Ajouter une catégorie | Bouton | Sans objet | Ouvre la fenêtre d'ajout. Masqué pour SFCC. | Sans objet |
| Exporter les traductions françaises | Bouton | Sans objet | Télécharge la liste Bethesda avec son texte français. L'export est inscrit dans le journal d'audit. | Sans objet |
| Importer les traductions françaises | Bouton | Sans objet | Relit le texte français à partir de l'identifiant de catégorie. | Sans objet |
| Pastilles de ligne | Texte | Sans objet | Relecture par le pathologiste, la gravité suggérée, Inactif et une étiquette « intégré ». | Sans objet |
| Désactiver / Réactiver | Bouton de ligne | Sans objet | Modifie l'indicateur Actif. | Sans objet |
| Modifier | Bouton de ligne | Sans objet | Ouvre la fenêtre de modification. | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Libellé | Texte | Obligatoire | La catégorie telle qu'elle figure dans le compte rendu. | Aucun |
| Libellé français (SFCC) | Texte | Facultatif | Bethesda uniquement. Alimente la vue SFCC. | Vide |
| Abréviation | Texte | Facultatif | | Vide |
| Groupe | Choix | Facultatif | Onglet Interprétation / Résultat uniquement. Regroupe l'entrée. | Aucun |
| Description | Texte libre | Facultatif | | Vide |
| Description française | Texte libre | Facultatif | Bethesda uniquement. | Vide |
| Nécessite une relecture par le pathologiste avant validation finale | Case à cocher | Facultatif | Un cytotechnicien ne peut pas valider seul un dossier portant cette catégorie. | Désactivé |
| Gravité suggérée pour la détection d'anomalies | Choix : aucune, Anormal, Critique, Malin | Facultatif | Une suggestion faite à la détection d'anomalies. Une correspondance est toujours confirmée ou contestée par le pathologiste. | Aucune |
| Actif | Case à cocher | Facultatif | | Activé |

#### Carte Politique des modifications réactionnelles (Bethesda uniquement)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Modifications réactionnelles : qui valide | Texte d'état : cytotechnicien, mixte ou pathologiste | Sans objet | Affiche le réglage actuel des entrées de modifications réactionnelles. | Cytotechnicien |
| Autoriser la validation par un cytotechnicien | Bouton | Sans objet | Supprime l'exigence de relecture sur les entrées de modifications réactionnelles (celles dont l'identifiant commence par `cyto-nonneo-reactive-`). | Sans objet |
| Exiger un pathologiste | Bouton | Sans objet | Définit l'exigence de relecture sur les mêmes entrées. S'applique uniquement aux nouvelles relectures. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier, y compris les deux boutons de politique : `config:cytology-categories:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut.

**Limites connues.** La fenêtre n'affiche pas trois propriétés enregistrées (`usage`, `diagnosticRank` et `isUnsatisfactory`). L'import CSV français fait la correspondance par identifiant et n'ajoute pas de nouvelles catégories.

### Classification non gynécologique (Milan/Paris) {#screen-non_gyn_cytology_categories}
Breadcrumb: Accueil > Configuration > Cytologie > Classification non gynécologique (Milan/Paris)

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > menu latéral **Classification non gynécologique (Milan/Paris)**
**2. Élément de maintenance :** Classification non gynécologique

**3. Objectif métier et portée.** Contient les catégories diagnostiques numérotées des deux systèmes de compte rendu non gynécologiques : le système de Milan (glande salivaire) et le système de Paris (voies urinaires). Chaque catégorie a un numéro, un libellé et un risque de malignité facultatif.

**4. Prérequis et dépendances.** Autonome. Les catégories apparaissent dans le compte rendu de cytologie non gynécologique. Si vous l'omettez, les catégories intégrées sont utilisées.

Setup step: Tier 2, step 27
Requires: Aucun, c'est un point de départ.
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-non_gyn_cytology_categories - Liste des catégories Milan et Paris]

**6. Référence des champs.**

#### Commandes de la page

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Boutons de système | Choix : Milan (glande salivaire), Paris (voies urinaires) | Obligatoire | La liste en cours de modification. | Premier système |
| Afficher les inactifs | Case à cocher | Facultatif | | Désactivé |
| + Ajouter une catégorie | Bouton | Sans objet | Ouvre la fenêtre d'ajout. | Sans objet |
| Désactiver / Réactiver | Bouton de ligne | Sans objet | | Sans objet |
| Modifier | Bouton de ligne | Sans objet | | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Numéro de catégorie | Nombre entier | Obligatoire | Le numéro de la catégorie dans le système. | Aucun |
| Libellé | Texte | Obligatoire | | Aucun |
| Abréviation | Texte | Facultatif | | Vide |
| Description | Texte libre | Facultatif | | Vide |
| Risque de malignité en % | Nombre, de 0 à 100 | Facultatif | Affiché à côté de la catégorie. | Vide |
| Nécessite une relecture par le pathologiste | Case à cocher | Facultatif | | Activé |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:cytology-categories:manage` (risque élevé, audité), la même capacité que [Interprétation et recommandations](#screen-cytology_categories). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut.

**Limites connues.** Aucune connue.

### Stratégie de dépistage {#screen-cytology_screening_strategy}
Breadcrumb: Accueil > Configuration > Cytologie > Stratégie de dépistage

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > menu latéral **Stratégie de dépistage**
**2. Élément de maintenance :** Stratégie de dépistage

**3. Objectif métier et portée.** Définit comment le dépistage du col de l'utérus est réalisé (co-test, HPV en première intention, ou cytologie seule), pour l'entreprise et pour chaque établissement, et contient les délais de rappel et la formulation des rappels pour l'Australie et la Nouvelle-Zélande.

**4. Prérequis et dépendances.** La liste des établissements pour les dérogations provient du [Répertoire des établissements](#screen-facility-dictionary). La carte des délais de rappel est enregistrée dans les paramètres de stratégie ; la même autorisation s'applique donc.

Setup step: Tier 2, step 28
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_screening_strategy - Stratégie par défaut, dérogations par établissement et carte des délais de rappel]

**6. Référence des champs.**

#### Stratégie

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Valeur par défaut de l'entreprise | Choix : Co-test, HPV primaire avec réflexe vers la cytologie, Cytologie seule | Obligatoire | Utilisée par tous les établissements sans dérogation. | Co-test |
| + Ajouter une dérogation | Bouton | Sans objet | Ouvre une ligne pour choisir un établissement et une stratégie. | Sans objet |
| Dérogation par établissement | Liste de choix plus les trois mêmes choix | Obligatoire | | Aucune |
| Retirer | Bouton de ligne | Sans objet | Retire la dérogation. | Sans objet |

#### Carte des délais de rappel

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Pays | Choix : Australie, Nouvelle-Zélande | Obligatoire | Le pays dont vous modifiez les délais et la formulation. Le choix est désactivé tant que le formulaire contient des modifications non enregistrées. | Australie |
| Urgent (HPV 16/18) : De, À | Semaines entières, de 1 à 52 | Facultatif | La première case ne peut pas être postérieure à la seconde. Si les deux sont vides, cela signifie « dès que possible ». | 2 à 4 semaines |
| Standard : De, À | Semaines entières, de 1 à 52 | Facultatif | Mêmes règles. | 6 à 12 semaines |
| Nouveau prélèvement : De, À | Semaines entières, de 1 à 52 | Facultatif | Affiché comme le délai de l'Australie ou celui de la Nouvelle-Zélande selon le pays choisi. | Australie 6 à 12 semaines, Nouvelle-Zélande vide |
| Langue | Choix : anglais, français, allemand, néerlandais, coréen, espagnol | Obligatoire | La langue de la formulation que vous modifiez. | Anglais |
| Formulation : rappel LBC pour le clinicien | Texte libre, jusqu'à 1000 caractères | Facultatif | Vide, le texte intégré est utilisé. Seuls les paramètres substituables `{{type}}` et `{{next}}` sont autorisés. | Vide |
| Formulation : nouveau prélèvement | Texte libre, jusqu'à 1000 caractères | Facultatif | Vide, le texte intégré est utilisé. Aucun paramètre substituable n'est autorisé. | Vide |
| Enregistrer | Bouton | Sans objet | Enregistre les délais et la formulation. Audité sous `RECALL_SETTINGS_CHANGED`. | Sans objet |
| Annuler les modifications | Bouton | Sans objet | Rétablit la carte aux valeurs enregistrées. | Sans objet |
| Rétablir les valeurs par défaut | Bouton | Sans objet | Remet les délais intégrés dans le formulaire. Sélectionnez Enregistrer pour les conserver. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:cytology-screening-strategy:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut.

**Limites connues.** Une règle de dépistage selon l'âge existe dans le service mais n'a pas d'écran. Les délais de rappel n'existent que pour l'Australie et la Nouvelle-Zélande.

### Orientation non gynécologique {#screen-cytology_routing}
Breadcrumb: Accueil > Configuration > Cytologie > Orientation non gynécologique

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > menu latéral **Orientation non gynécologique**
**2. Élément de maintenance :** Orientation non gynécologique

**3. Objectif métier et portée.** Détermine vers quelle liste de travail va un dossier de cytologie non gynécologique : la liste de travail de pathologie chirurgicale ou la liste de travail de cytologie. Les dossiers gynécologiques vont toujours à la liste de travail de cytologie.

**4. Prérequis et dépendances.** Les dérogations utilisent la liste des établissements du [Répertoire des établissements](#screen-facility-dictionary). La catégorie de spécimen non gynécologique du [Dictionnaire des spécimens](#screen-specimens) détermine les dossiers auxquels cela s'applique.

Setup step: Tier 2, step 29
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_routing - Valeur par défaut de l'entreprise et dérogations par établissement]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Valeur par défaut de l'entreprise | Choix : Liste de travail de pathologie chirurgicale, Liste de travail de cytologie | Obligatoire | Où vont les dossiers non gynécologiques, sauf si une dérogation d'établissement s'applique. | Liste de travail de pathologie chirurgicale |
| + Ajouter une dérogation | Bouton | Sans objet | Ouvre une ligne pour choisir un établissement et une liste de travail. | Sans objet |
| Dérogation par établissement | Liste de choix plus les deux choix | Obligatoire | | Aucune |
| Retirer | Bouton de ligne | Sans objet | | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:cytology-routing:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut.

**Limites connues.** Aucune connue.

### Règles nationales et du laboratoire {#screen-cytology_compliance_features}
Breadcrumb: Accueil > Configuration > Cytologie > Règles nationales et du laboratoire

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > menu latéral **Règles nationales et du laboratoire**
**2. Élément de maintenance :** Règles nationales et du laboratoire

**3. Objectif métier et portée.** Active ou désactive trois contrôles de cytologie propres à un pays, pour l'entreprise et pour chaque établissement, et contient les règles d'intervalle de dépistage par pays. Les contrôles font ce qu'ils annoncent. Ils ne suffisent pas, à eux seuls, à rendre un laboratoire conforme à une norme.

**4. Prérequis et dépendances.** Les dérogations par établissement utilisent le [Répertoire des établissements](#screen-facility-dictionary). Chaque fonctionnalité réglée sur Automatique suit le pays de l'établissement ; la Juridiction de l'établissement doit donc être définie.

Setup step: Tier 2, step 30
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_compliance_features - Trois fonctionnalités et la carte des intervalles de dépistage]

**6. Référence des champs.**

#### Fonctionnalités

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Plafond quotidien de charge CLIA | Choix : Automatique, Activé, Désactivé | Obligatoire | Limite le nombre de lames qu'un cytotechnicien dépiste par jour. Automatique signifie Activé pour les établissements américains. | Automatique |
| Relecture rétrospective CAP sur 5 ans | Choix : Automatique, Activé, Désactivé | Obligatoire | Automatique signifie Activé pour les établissements américains. | Automatique |
| Signature des rapports préliminaires urgents | Choix : Automatique, Activé, Désactivé | Obligatoire | Automatique signifie qu'une signature est exigée partout. | Automatique |
| Dérogation par établissement | Liste de choix plus les trois choix, par fonctionnalité | Facultatif | Remplace le réglage de l'entreprise pour un établissement. | Aucune |
| Enregistrer | Bouton | Sans objet | Enregistre les fonctionnalités. Audité. | Sans objet |

#### Carte des intervalles de dépistage

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Code pays | Texte, converti en majuscules | Obligatoire | Par exemple GB_EW, FR. | Aucun |
| À partir de | Nombre entier, 0 ou plus | Obligatoire | Début de la tranche d'âge. | 25 sur une nouvelle ligne |
| Jusqu'à | Nombre entier, non inférieur à À partir de | Obligatoire | Fin de la tranche d'âge. | 64 sur une nouvelle ligne |
| Intervalle (mois) | Nombre entier supérieur à 0 | Obligatoire | L'intervalle de dépistage de la tranche. Utilisé pour le contrôle du respect de l'intervalle (EU-QA-01). Le délai de grâce est de 3 mois. | 36 sur une nouvelle ligne |
| Retirer | Bouton de ligne | Sans objet | | Sans objet |
| Ajouter une règle | Bouton | Sans objet | Ajoute une ligne. | Sans objet |
| Enregistrer | Bouton | Sans objet | Une ligne sans pays, avec un âge négatif, avec une valeur Jusqu'à inférieure à À partir de, ou avec un intervalle inférieur ou égal à 0 est refusée (« invalidRule »). Audité sous « Screening Intervals Updated ». | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:cytology-compliance:manage` (risque élevé, audité). Les rôles Administrateur et Superadmin la détiennent par défaut. **Le Directeur de laboratoire ne la détient pas**, car cette capacité appartient au groupe Administration et non au groupe Cytologie.

**Limites connues.** L'écran n'a pas de blocage en lecture seule : une personne sans la capacité voit des commandes que l'enregistrement refuse ensuite. Les règles d'intervalle préchargées couvrent GB_EW, FR, DE, NL, BE et IE, et sont des exemples à examiner, non une politique nationale.

### Instrumentation assistée {#screen-cytology_instrumentation}
Breadcrumb: Accueil > Configuration > Cytologie > Instrumentation assistée

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > menu latéral **Instrumentation assistée**
**2. Élément de maintenance :** Instrumentation assistée

**3. Objectif métier et portée.** Choisit comment les cytotechniciens relisent les lames : sur des images de lames entières ou de la manière traditionnelle guidée. Avec l'imagerie de lame entière, le dossier affiche l'action **Afficher la lame WSI** et la tuile Numérisations terminées. Avec la modalité traditionnelle, aucune commande d'image ne s'affiche.

**4. Prérequis et dépendances.** Les dérogations utilisent le [Répertoire des établissements](#screen-facility-dictionary).

Setup step: Tier 2, step 31
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_instrumentation - Valeur par défaut de l'entreprise et dérogations par établissement]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Valeur par défaut de l'entreprise | Choix : Imagerie de lame entière (WSI), Guidage traditionnel | Obligatoire | | Imagerie de lame entière |
| + Ajouter une dérogation | Bouton | Sans objet | | Sans objet |
| Dérogation par établissement | Liste de choix plus les deux choix | Obligatoire | | Aucune |
| Retirer | Bouton de ligne | Sans objet | | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:cytology-instrumentation:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut.

**Limites connues.** Aucune connue.

### Corrélation cyto-histologique (SNOMED) {#screen-snomed_histology_severity_mapping}
Breadcrumb: Accueil > Configuration > Cytologie > Corrélation cyto-histologique (SNOMED)

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Cytologie** > menu latéral **Corrélation cyto-histologique (SNOMED)**
**2. Élément de maintenance :** Corrélation cyto-histologique (SNOMED)

**3. Objectif métier et portée.** Associe les codes SNOMED de l'histologie du col de l'utérus à un rang de gravité de 0 à 5, afin qu'un résultat de cytologie puisse être comparé à la biopsie qui a suivi. La liste est livrée avec cinq entrées de test synthétiques. Remplacez-les par vos codes sous licence.

**4. Prérequis et dépendances.** Les rangs sont lus lorsqu'un résultat de cytologie est comparé à l'histologie du col de l'utérus qui l'a suivi. Si vous omettez cet écran, la comparaison n'a aucun rang à utiliser. Pour remplacer les codes de test synthétiques, il faut des codes issus de votre propre édition sous licence de SNOMED CT.

Setup step: Tier 2, step 32
Requires: Aucun, c'est un point de départ.
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-snomed_histology_severity_mapping - Tableau de correspondance entre code SNOMED et rang de gravité]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Code SNOMED | Texte | Obligatoire | Ne peut plus être modifié une fois ajouté. Un code en double est refusé. | Aucun |
| Description | Texte | Obligatoire | | Aucune |
| Rang de gravité | Nombre entier, de 0 à 5 | Obligatoire | La case limite la valeur à 0 à 5. | Aucun |
| Ajouté | Date et utilisateur | Sans objet | Qui a ajouté la ligne et quand. | Sans objet |
| Modifier | Bouton de ligne | Sans objet | Modifie uniquement la description et le rang. | Sans objet |
| Retirer | Bouton de ligne | Sans objet | Demande une confirmation, puis retire la ligne. | Sans objet |
| Ajouter une ligne | Trois cases et un bouton | Sans objet | Les trois mêmes champs que ci-dessus. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:cytology-severity-mapping:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut.

**Limites connues.** La limite de 0 à 5 n'est appliquée que par la case de saisie. Les entrées préchargées sont `TEST-SNOMED-100001` à `100005`.

## Partie B : Dictionnaires de référence des types de spécimens et de tissus {#ch3-specimen-tissue}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire

Cette partie regroupe les listes qui décrivent ce qui arrive au laboratoire et comment cela est suivi : les types de spécimens, les cartes anatomiques, les indicateurs de dossier et de prélèvement, les emplacements physiques nommés, la chaîne du froid et les types de non-conformités.

### Dictionnaire des spécimens {#screen-specimens}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Dictionnaire des spécimens

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Dictionnaire des spécimens

**3. Objectif métier et portée.** La liste de référence des types de spécimens. Chacun nomme le type, l'acte et le site anatomique, et porte le service, la sous-spécialité, le protocole de traitement, les colorations par défaut et un code de facturation de base. La **Catégorie de spécimen** détermine l'orientation vers les listes de travail et le comportement à l'accession (chirurgical, cytologie gynécologique, cytologie non gynécologique, autopsie, moléculaire, avis spécialisé). La saisie des demandes compare le texte du spécimen d'une demande à cette liste. Une correspondance inexacte déclenche une non-conformité.

**4. Prérequis et dépendances.** L'éditeur puise dans trois autres listes : le Service dans [Services](#screen-departments), la Sous-spécialité dans [Sous-spécialités](#screen-subspecialties) et le Protocole de traitement parmi les protocoles actifs du [Dictionnaire des protocoles](#screen-protocols). Si l'une d'elles est omise, la liste de choix correspondante est vide et le type de spécimen est enregistré sans cette valeur. Le protocole fournit aussi le type de cassette, et les [Règles d'acheminement des cassettes](#screen-cassette_routing_rules) se fondent sur le protocole ; un type de spécimen sans protocole ne peut donc correspondre à une règle qui en nomme un. Les Colorations par défaut sont du texte simple et ne sont pas contrôlées par rapport au [Catalogue diagnostique](#screen-stains).

Setup step: Tier 2, step 10
Requires: [Services](#screen-departments), [Sous-spécialités](#screen-subspecialties), [Dictionnaire des protocoles](#screen-protocols)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-specimens - Liste du Dictionnaire des spécimens avec filtres, Télécharger le modèle, Importer une feuille de calcul et Ajouter un spécimen]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher | Texte | Facultatif | | Vide |
| Filtre de type | Choix | Facultatif | | Tous |
| Filtre de statut | Choix | Facultatif | | Tous |
| Colonne Spécimen | Texte | Sans objet | Nom et code. | Sans objet |
| Colonne Type, Procédure, Site | Texte | Sans objet | | Sans objet |
| Colonne Service | Texte | Sans objet | | Sans objet |
| Colonne CPT de base | Texte | Sans objet | | Sans objet |
| Colonne Protocole | Texte | Sans objet | | Sans objet |
| Colonne Fixateur requis | Texte | Sans objet | Indique si un délai de fixation est exigé avant la validation. | Sans objet |
| Colonne Statut | Texte | Sans objet | Sélectionnez-la pour basculer entre Actif et Inactif. Il n'y a pas de confirmation. | Sans objet |
| Modifier, Dupliquer | Boutons de ligne | Sans objet | Dupliquer ouvre une copie dans l'éditeur. | Sans objet |
| Télécharger le modèle | Bouton | Sans objet | Télécharge un CSV avec les colonnes d'import. | Sans objet |
| Importer une feuille de calcul | Bouton | Sans objet | Ouvre la fenêtre Vérifier l'importation (ci-dessous). | Sans objet |
| + Ajouter un spécimen | Bouton | Sans objet | Ouvre l'éditeur avec un type de spécimen vide. | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | | Aucun |
| Code du spécimen | Texte | Facultatif | La clé sur laquelle se fonde la correspondance d'un nouvel import. | Vide |
| Description | Texte libre | Facultatif | | Vide |
| Type | Texte ou choix | Obligatoire | Par exemple Biopsie ou Résection. | Aucun |
| Procédure | Texte ou choix | Obligatoire | | Aucune |
| Catégorie de spécimen | Choix : aucune, SURGICAL_TISSUE, GYN_CYTOLOGY, NON_GYN_CYTOLOGY, AUTOPSY, MOLECULAR, CONSULT, OTHER | Facultatif | Détermine l'orientation vers les listes de travail et le comportement à l'accession. | Aucune |
| Site anatomique | Texte | Facultatif | | Vide |
| Latéralité | Choix : Gauche, Droite, Bilatéral, Ligne médiane, S. O. | Facultatif | | Aucune |
| Sous-spécialité | Liste de choix issue de [Sous-spécialités](#screen-subspecialties) | Facultatif | | Aucune |
| Service | Liste de choix issue de [Services](#screen-departments) | Facultatif | | Aucun |
| Synonymes | Texte, séparé par des virgules | Facultatif | Les autres noms que la demande peut utiliser. | Vide |
| Code CPT de base par défaut | Texte | Facultatif | Texte libre. | Vide |
| Colorations par défaut | Texte, séparé par des virgules | Facultatif | Texte libre, non lié au dictionnaire des colorations. | Vide |
| Notes de traitement | Texte libre | Facultatif | | Vide |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |
| Nécessite un délai de fixation avant validation | Interrupteur Oui/Non | Facultatif | | Désactivé |
| Protocole de traitement | Liste de choix des protocoles actifs | Facultatif | | Aucun |

#### Fenêtre Vérifier l'importation

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Colonnes CSV | Name, Description, Subspecialty, SpecimenCode, Type, Procedure, Site, Laterality, Synonyms, Department, RequiresFixativeTime, Active, DefaultStains, ProcessingNotes | Sans objet | Une ligne correspond à un type de spécimen existant d'abord par SpecimenCode, puis par Name. La sous-spécialité et le service sont mis en correspondance par leur nom. | Sans objet |
| Appliquer N ligne(s) | Bouton | Sans objet | Écrit les lignes affichées. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, importer, activer : `config:specimen-dictionary:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** Deux propriétés enregistrées n'ont pas de champ à l'écran (`defaultComplexity` et `microUpgradeBaseCptCode`). L'enregistrement inscrit l'éditeur comme « admin » dans l'enregistrement, et non la personne connectée. Le Code CPT de base par défaut n'est pas contrôlé par rapport au Dictionnaire de facturation.

### Cartes d'organes {#screen-organ_maps}
Breadcrumb: Accueil > Configuration > Système > Références cliniques > Cartes d'organes

**Statut :** Démonstration

**1. Navigation :** onglet Configuration **Système** > groupe **Références cliniques**
**2. Élément de maintenance :** Cartes d'organes

**3. Objectif métier et portée.** Les cartes anatomiques affichées à côté d'un compte rendu synoptique (cartes de secteurs et de biopsies de la prostate, cadran horaire du sein, polype colorectal, résection rectale et rénale, cavité buccale, curage cervical, étapes de Mohs) sont toujours dessinées à partir des réponses au synoptique. Une carte n'a aucune donnée propre. Cet écran définit l'aspect des cartes et les questions qui les alimentent. Il comporte deux onglets : **Couleurs et motifs** et **Liaisons de carte**.

**4. Prérequis et dépendances.** La liste des périmètres de l'onglet Couleurs et motifs énumère les juridictions et les établissements du [Répertoire des établissements](#screen-facility-dictionary). Si vous l'omettez, seul le niveau entreprise peut être modifié. Les liaisons de carte énumèrent les modèles synoptiques de la [Bibliothèque synoptique](#screen-tab-protocols). Les cartes de la prostate et de Mohs propres à PathScribe n'ont besoin d'aucune liaison. Un modèle rédigé par votre propre laboratoire a besoin d'une liaison avant que sa carte puisse être dessinée.

Setup step: Tier 2, step 15
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: [Bibliothèque synoptique](#screen-tab-protocols)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-organ_maps - Couleurs et motifs avec sélecteur de niveau et aperçu]

**6. Référence des champs.**

#### Onglet Couleurs et motifs

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Niveau | Choix : Entreprise, Juridiction, Établissement | Obligatoire | La couche que vous modifiez. Un établissement hérite de sa juridiction, puis de l'entreprise, puis du schéma intégré. Changer de niveau avec des modifications non enregistrées demande d'abord une confirmation. | Entreprise |
| Choisir une juridiction, Choisir un établissement | Liste de choix | Obligatoire pour ces niveaux | Les juridictions proviennent de la propre juridiction des établissements. | Aucune |
| Affiche (libellé de ligne) | Texte | Sans objet | Une ligne par catégorie ou contour : bénin, non prélevé, tumeur, groupe de grade 1, groupe de grade 2, groupe de grade 3 ou supérieur, extension extraprostatique, marge positive, carcinome invasif, DCIS, calcifications, marge saine, marge proche, marge positive, tumeur résiduelle, invasion périnerveuse, adénome, adénome à la marge, dysplasie à la marge, ENE mineure, ENE majeure. | Sans objet |
| Couleur | Sélecteur de couleur (hexadécimal tel que `#b91c1c`) | Obligatoire en cas de remplacement | | Couleur intégrée |
| Motif | Choix : Uni, Pointillé, Hachuré, Quadrillé, Sans motif | Obligatoire en cas de remplacement | Chaque couleur est associée à un motif afin que la carte soit lisible en noir et blanc. « Sans motif » n'est autorisé que pour bénin et non prélevé. | Motif intégré |
| Libellé de légende | Texte, jusqu'à 40 caractères | Facultatif | Votre propre formulation pour la légende. | Libellé intégré |
| Remplacer ici / Utiliser l'hérité | Bouton de ligne | Sans objet | Déverrouille ou verrouille les valeurs de la ligne à ce niveau. | Utiliser l'hérité |
| Seuils de marge et de distance | Sept lignes, chacune une distance en mm et (pour six d'entre elles) un opérateur de comparaison : ≤ égal ou inférieur, < inférieur, = exactement | Facultatif | Voir le tableau ci-dessous. Chacune a ses propres boutons Remplacer ici et Utiliser l'hérité. | Valeurs intégrées |
| Aperçu | Dessins | Sans objet | Affiche chaque carte avec le schéma provisoire. | Sans objet |
| Supprimer les remplacements de ce niveau | Bouton | Sans objet | Supprime la couche. | Sans objet |
| Enregistrer | Bouton | Sans objet | Enregistre la couche. Refusé avec un motif si une couleur n'est pas hexadécimale, si un motif manque, si un libellé de légende est trop long ou si un seuil est hors plage. | Sans objet |

| Seuil | Plage autorisée (mm) | Valeur intégrée |
|---|---|---|
| Sein : une marge est proche en dessous de (sans opérateur) | 0,1 à 10 | 2 |
| Polype malin : marge atteinte à | 0 à 10 | 1, ≤ |
| CRM rectale : atteinte à | 0 à 10 | 1, ≤ |
| Cavité buccale : marge atteinte à | 0 à 10 | 1, < |
| Cavité buccale : marge proche à | 0 à 20 | 5, ≤ |
| Rein, néphrectomie partielle : marge parenchymateuse atteinte à | 0 à 10 | 0, = |
| Rein, néphrectomie radicale : marge des tissus mous atteinte à | 0 à 10 | 0, = |

Une couche de cavité buccale dont la distance d'atteinte n'est pas inférieure à sa distance de proximité est signalée comme un conflit. Tant qu'il n'est pas corrigé, les cartes de cette couche utilisent la règle de proximité par défaut.

#### Onglet Liaisons de carte

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Modèle synoptique | Liste de choix des modèles | Obligatoire | Le modèle à lier. Une étiquette d'état s'affiche : Questions de carte PathScribe, Liaison de votre laboratoire, Questions de marge à vérifier ou Aucune carte. | Aucun |
| Carte | Choix parmi les neuf cartes | Obligatoire | Le type de carte de ce modèle. | Selon le modèle |
| Sélecteurs de questions | Une liste de choix par entrée de carte, telle que Question de la grille des foyers tumoraux ou Question du côté du prélèvement | Obligatoire pour les entrées dont la carte a besoin | Chacune énumère les questions du modèle. « — non utilisé — » laisse une entrée non liée. | Non utilisé |
| Réponse et Signification sur la carte | Tableau, une ligne par réponse | Obligatoire pour chaque question à choix liée | Indique ce que signifie chaque réponse sur la carte. Au moins une réponse doit avoir une signification. | Ignorer |
| Sélecteurs de colonnes de grille | Une liste de choix par colonne de grille | Obligatoire pour les entrées de grille | Correspondent aux colonnes de la grille (site, % d'atteinte, groupe de grade, etc.). | Non utilisé |
| Questions de marge génériques | Sélecteurs pour l'état de la marge et les marges atteintes, par composante | Obligatoire pour les cartes de marges | Les propres questions de marge du formulaire suivent celles de la carte et sont verrouillées, de sorte que les deux ne peuvent pas se contredire. Une question ne peut servir qu'un seul rôle de marge. | Non utilisé |
| Enregistrer | Bouton | Sans objet | Enregistre la liaison. | Sans objet |
| Supprimer la liaison de votre laboratoire | Bouton | Sans objet | Supprime la liaison. | Sans objet |
| Recommencer | Bouton | Sans objet | Rétablit le brouillon. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier les couleurs, les motifs et les seuils : `config:organ-map-scheme:manage`. Modifier les liaisons : `config:organ-map-bindings:manage`. Les deux sont à risque élevé et auditées. Les rôles Administrateur, Directeur de laboratoire et Superadmin détiennent les deux par défaut. Les boutons sont désactivés sans elles.

**Limites connues.** Les paramètres sont conservés dans le navigateur, et les valeurs chiffrées du dossier dans le dossier. Le contrat d'API (`docs/architecture/ORGAN_MAPPING_API.md`) est une spécification : les points d'accès du serveur ne sont pas encore réalisés, ce qui explique que le statut soit Démonstration. Une liaison enregistrée avant que les marges soient rapportées par composante cesse d'être calculée et vous demande d'attribuer de nouveau chaque question de marge.

### Indicateurs {#screen-flags}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Indicateurs

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Indicateurs (titre de la page « Indicateurs de dossier et de prélèvement »)

**3. Objectif métier et portée.** Un indicateur est une étiquette posée sur un dossier ou sur un seul prélèvement, telle que STAT, Malin ou Confidentiel, avec une gravité de 1 à 5 et une icône. Un indicateur peut aussi restreindre l'impression du compte rendu du dossier. Des indicateurs sont aussi créés par les imports depuis un système d'information de laboratoire (affichés avec un badge « Import SIL »).

**4. Prérequis et dépendances.** Aucun. La restriction de l'impression exige ensuite l'autorisation `report:restricted-case:print` pour imprimer, qui se définit sur l'écran [Rôles](#screen-staff-roles). Les indicateurs créés automatiquement à partir d'un import SIL s'affichent dans une bannière avec un bouton **Examiner** jusqu'à ce que quelqu'un les contrôle.

Setup step: Tier 2, step 11
Requires: Aucun, c'est un point de départ.
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-flags - Liste des indicateurs de dossier et de prélèvement avec filtres et Ajouter un indicateur]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher | Texte | Facultatif | | Vide |
| Filtre de statut | Choix | Facultatif | | Tous |
| Filtre de niveau | Choix : Dossier, Prélèvement | Facultatif | | Tous |
| Colonnes | Nom (avec un badge « Import SIL »), Niveau, Code LIS, Gravité, Statut, Actions | Sans objet | | Sans objet |
| Bannière de création automatique et Examiner | Bannière et bouton | Sans objet | Filtre la liste sur les indicateurs créés à partir d'imports. **Effacer le filtre** le retire. | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | | Aucun |
| Description | Texte libre | Facultatif | | Vide |
| Niveau | Choix : Dossier, Prélèvement | Obligatoire | L'endroit où l'indicateur peut être appliqué. | Dossier |
| Gravité | Choix : 1 Informatif, 2 Faible, 3 Moyen, 4 Élevé, 5 Critique | Obligatoire | | 1 |
| Code LIS | Texte | Facultatif | Associe l'indicateur à un code SIL à l'import. | Vide |
| Icône | Choix : ihc, fish, molecular, flow-cytometry, cytogenetics, micro, coag, generic-lab | Obligatoire | | generic-lab |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |
| Restreint l'impression | Case à cocher | Facultatif | Niveau dossier uniquement. Empêche l'impression du compte rendu par toute personne sans l'autorisation `report:restricted-case:print`. | Désactivé |

Chaque enregistrement demande d'abord « Voulez-vous vraiment appliquer ces modifications ? ».

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, désactiver : `config:case-flags:manage` (risque élevé). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Les enregistrements écrivent les événements d'audit `CONFIG_FLAG_CREATED`, `CONFIG_FLAG_UPDATED` (modifications du nom, de la description et du code LIS uniquement) et `CONFIG_FLAG_DEACTIVATED`.

**Limites connues.** Une propriété enregistrée (`tagClass`) est un reliquat d'une conception antérieure et n'est pas utilisée. Les indicateurs préchargés comprennent STAT, Malin et Confidentiel - Impression restreinte.

### Dictionnaire des emplacements d'actifs {#screen-asset_locations}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Dictionnaire des emplacements d'actifs

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Dictionnaire des emplacements d'actifs

**3. Objectif métier et portée.** La liste encadrée des emplacements physiques (bâtiments, salles, unités de stockage, emplacements de stockage, postes de travail, étagères d'archives) par rapport à laquelle l'historique d'emplacement d'un matériel est contrôlé. Un emplacement saisi à la paillasse qui ne correspond à rien ici crée une entrée Non vérifié. L'onglet **Occupation du stockage mortuaire** indique quels emplacements de stockage de la morgue contiennent actuellement un spécimen d'autopsie.

**4. Prérequis et dépendances.** Aucun. L'onglet d'occupation n'énumère que les emplacements de type Emplacement de stockage ; définissez-en donc d'abord au moins un ici. À défaut, l'onglet d'occupation indique « No real storage_slot locations defined yet ».

Setup step: Tier 2, step 12
Requires: Aucun, c'est un point de départ.
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-asset_locations - Liste du Dictionnaire des emplacements d'actifs]

**6. Référence des champs.**

#### Onglet Dictionnaire

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher | Texte | Facultatif | Correspond au nom ou à la description. | Vide |
| Colonnes | Nom, Type, Parent, Statut, Actions | Sans objet | Une ligne Non vérifié affiche une note de création automatique. | Sans objet |
| + Ajouter un emplacement | Bouton | Sans objet | | Sans objet |
| Vérifier | Bouton de ligne | Sans objet | Affiché pour les lignes Non vérifié. | Sans objet |
| Modifier | Bouton de ligne | Sans objet | | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Par exemple Mortuary Cooler 1 - Tray A. | Aucun |
| Type d'emplacement | Choix : Bâtiment, Salle, Unité de stockage, Emplacement de stockage, Poste de travail, Étagère d'archives, Autre | Obligatoire | Seul Emplacement de stockage apparaît dans l'onglet d'occupation. | Emplacement de stockage |
| Emplacement parent | Liste de choix des autres emplacements | Facultatif | | Aucun |
| Description | Texte libre | Facultatif | | Vide |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |

#### Onglet Occupation du stockage mortuaire

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Emplacement de stockage | Texte | Sans objet | Chaque emplacement de type Emplacement de stockage. | Sans objet |
| Statut | Texte | Sans objet | Occupé ou Disponible, déterminé à partir de l'historique d'emplacement des spécimens des dossiers d'autopsie que vous pouvez voir. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, vérifier : `config:asset-locations:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** La vue d'occupation lit les dossiers que votre propre accès autorise ; deux personnes peuvent donc voir des résultats différents. Les emplacements préchargés comprennent Grossing Station 3, Archive Shelf 12B, Histology Bench 2 (Non vérifié) et deux emplacements de stockage de la morgue.

### Chaîne du froid {#screen-cold_chain}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Chaîne du froid

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Chaîne du froid

**3. Objectif métier et portée.** Définit les plages de température (types de conditions) et les réfrigérateurs et congélateurs (unités de stockage) dont les relevés sont surveillés, et énumère les conteneurs intelligents. Un relevé hors de la plage d'une unité est une excursion : le lot d'un conteneur intelligent est mis en attente et une non-conformité « Cold-Chain Excursion » est ouverte pour examen CAPA.

**4. Prérequis et dépendances.** Une unité de stockage a besoin d'un type de condition ; créez donc d'abord les types. Deux types intégrés existent (Tissu congelé, Tissu frais). La non-conformité ouverte par une excursion utilise le type intégré Cold-Chain Excursion de [Non-conformités des spécimens](#screen-deficiencies). Les conteneurs intelligents sont enregistrés ailleurs (le registre matériel des conteneurs) et apparaissent ici en lecture seule.

Setup step: Tier 2, step 13
Requires: Aucun, c'est un point de départ.
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-cold_chain - Chaîne du froid avec les onglets Unités de stockage, Types de conditions et Conteneurs intelligents]

**6. Référence des champs.**

#### Onglet Unités de stockage

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Colonnes | Nom, Type de condition, Statut, Actions | Sans objet | | Sans objet |
| + Ajouter une unité de stockage | Bouton | Sans objet | | Sans objet |
| Relevés | Bouton de ligne | Sans objet | Ouvre le dernier relevé, le nombre de relevés et d'excursions, un tableau des relevés et la commande **Envoyer le relevé simulé**. | Sans objet |
| Modifier, Désactiver, Réactiver | Boutons de ligne | Sans objet | | Sans objet |

#### Fenêtre d'ajout et de modification d'une unité de stockage

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | | Aucun |
| Type de condition | Liste de choix des types de conditions actifs | Obligatoire | La plage par rapport à laquelle les relevés de l'unité sont contrôlés. | Premier type actif |
| Actif | Case à cocher | Facultatif | | Activé |

#### Onglet Types de conditions

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Colonnes | Nom, Plage autorisée, Statut, Actions | Sans objet | Les types intégrés sont marqués « Intégré ». | Sans objet |
| Supprimer | Bouton de ligne | Sans objet | Demande une confirmation. Non proposé pour les types intégrés. | Sans objet |

#### Fenêtre d'ajout et de modification d'un type de condition

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | | Aucun |
| Maximum autorisé (°C) | Nombre | Obligatoire | Un relevé supérieur à cette valeur est une excursion. | Aucun |
| Minimum autorisé (°C, facultatif) | Nombre inférieur au maximum | Facultatif | Laissez vide lorsque seul un maximum compte, comme pour un congélateur. | Vide |
| Actif | Case à cocher | Facultatif | | Activé |

#### Onglet Conteneurs intelligents

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Conteneur, Type de condition, Lot actuel, Actions | Colonnes en lecture seule | Sans objet | Seuls les conteneurs marqués comme conteneurs intelligents sont listés. **Relevés** ouvre le même panneau de relevés. | Sans objet |

#### Commande Envoyer le relevé simulé

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Température (°C) | Nombre | Obligatoire | Envoyée par le même traitement que celui d'un relevé de capteur, marquée Simulé, avec « Simulated » dans la piste d'audit. | Aucune |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, désactiver, supprimer : `config:cold-chain:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. L'envoi d'un relevé simulé est contrôlé séparément : une personne qui n'a pas l'autorisation voit « You don't have permission to send a simulated reading. »

**Limites connues.** Aucun flux de capteurs n'est connecté. Chaque relevé provient de la commande Simulé et est étiqueté Simulé partout. C'est pourquoi le statut est Partiel : les répertoires des unités et des types sont réalisés, les relevés en direct ne le sont pas. Les types préchargés sont Tissu congelé (au plus -20 °C) et Tissu frais (au plus 8 °C).

### Cas de recherche et objets des lots {#screen-research_cases}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Cas de recherche et objets des lots

**Statut :** Partiel

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Cas de recherche et objets des lots

**3. Objectif métier et portée.** Deux réglages pour le travail qui n'est pas du soin courant.

*Cas de recherche.* En attendant la gestion d'éléments de recherche sans enregistrement, un prélèvement de recherche est enregistré comme un cas rattaché à un patient de recherche fictif. Cette carte indique comment PathScribe reconnaît ces cas : par préfixe de numéro de cas (par exemple `RES`) ou par préfixe d'IPP du patient de recherche (par exemple `RSCH-`). Un cas de recherche est alors :

- exclu des listes de travail cliniques (tuiles et listes ; retrouvez-le avec la Recherche de cas) ;
- exclu des chiffres de délai, de volume et de qualité des tableaux de bord Contribution ;
- jamais transmis au DPI comme résultat (définitif, préliminaire, amendé ou cytologie), ni envoyé par fax ou dépôt de fichier ; le journal d'audit consigne chaque résultat non envoyé et pourquoi ;
- jamais transmis à la facturation : ses actes sont refusés à la file de facturation, et son message de classe financière porte la **classe financière sans facturation**, sans couverture ;
- jamais déclaré à un registre du cancer ou de dépistage ;
- conservé pendant le **nombre de jours** compté à partir de l'enregistrement, puis proposé dans la file d'élimination. Les mises en attente de conservation s'appliquent toujours.

*Objets des lots.* À quoi sert un porteur. Six sont intégrés : Routine, Recherche, Enseignement, Essai clinique, Biobanque, AQ / Validation. Ils peuvent être désactivés mais pas supprimés ; Routine est toujours actif. Ajoutez les objets propres au laboratoire. Un nouveau porteur est Routine sauf choix contraire dans **Nouveau conteneur**. Un objet autre que Routine apparaît dans le détail du lot, et chaque [profil d'affichage](#screen-display_profiles) peut n'afficher que certains objets.

**4. Prérequis et dépendances.** Aucun pour les réglages. Pour la solution de recherche, enregistrez le patient de recherche fictif (avec un IPP commençant par le préfixe) et, le cas échéant, un format de numéro avec le préfixe de recherche.

Setup step: Tier 2, step 33
Requires: Aucun, c'est un point de départ.
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-research_cases - Cartes Cas de recherche et Objets des lots]

**6. Référence des champs.**

#### Carte Cas de recherche

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Traiter les cas correspondants comme des cas de recherche | Case à cocher | Facultatif | Désactivé : aucun cas n'est un cas de recherche. | Activé |
| Préfixes de numéro de cas | Texte, séparé par des virgules | Obligatoire si activé (ceci ou les préfixes IPP) | Correspond si le préfixe du cas est égal ou si son numéro complet commence par l'un d'eux. Sans espace ; 20 caractères au plus. | RES |
| Préfixes IPP du patient de recherche | Texte, séparé par des virgules | Obligatoire si activé (ceci ou les préfixes de numéro) | Correspond si l'IPP du patient commence par l'un d'eux. | RSCH- |
| Classe financière sans facturation | Texte | Obligatoire si activé | Transmise comme type de facturation du compte dans le message de classe financière. | Research - No Charge |
| Conserver le matériel (jours après l'enregistrement) | Nombre entier, 0 à 36500 | Obligatoire | Quand les blocs et lames du cas sont proposés à l'élimination. | 365 |
| Enregistrer | Bouton | Sans objet | Refusé sans l'autorisation ci-dessous ou si une valeur échoue aux contrôles. | Sans objet |

#### Carte Objets des lots

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Lignes d'objet | Nom et case Actif | Sans objet | Les noms intégrés sont affichés dans la langue du lecteur. Le nom d'un objet du laboratoire se modifie sur place (unique, 40 caractères au plus). La case de Routine ne peut pas être décochée. | Six objets intégrés, tous actifs |
| Nouvel objet, Ajouter | Texte et bouton | Facultatif | Ajoute un objet du laboratoire. | Vide |
| Enregistrer | Bouton | Sans objet | Refusé sans l'autorisation ci-dessous, ou si un nom est vide, trop long ou en double. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Enregistrer les cas de recherche : `config:research-cases:manage`. Enregistrer les objets des lots : `config:batch-purposes:manage`. Risque élevé ; Admin, Directeur de laboratoire et Superadmin par défaut.

**Limites connues.** L'écran du compte rendu n'indique pas encore « recherche, pas un compte rendu clinique » ; le cas peut être validé (rien n'est envoyé). Il n'y a pas de liste de travail de recherche. Les chiffres de qualité hors des tableaux de bord Contribution et le flux BI côté serveur ne sont pas encore filtrés. Les éléments de recherche sans enregistrement viendront plus tard.

### Non-conformités des spécimens {#screen-deficiencies}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Non-conformités des spécimens

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Non-conformités des spécimens (deux onglets : Types de non-conformité et Types de résolution)

**3. Objectif métier et portée.** Une non-conformité est un problème consigné concernant un spécimen ou un dossier (un contenant endommagé, une discordance d'étiquette, une prescription manquante). Un type de résolution indique comment elle a été résolue. Cet écran contient les deux listes. Certains types de non-conformité sont ouverts par le système lui-même, par leur identifiant fixe, par exemple Cold-Chain Excursion, Tissue Discrepancy et Block Lost.

**4. Prérequis et dépendances.** La liste de choix Laboratoire exécutant utilise les laboratoires exécutants du [Répertoire des établissements](#screen-facility-dictionary). Laissez-la sur Global et l'option s'applique à tous les laboratoires ; la liste des établissements n'est donc pas requise.

Setup step: Tier 2, step 14
Requires: Aucun, c'est un point de départ.
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-deficiencies - Non-conformités des spécimens avec les onglets Types de non-conformité et Types de résolution]

**6. Référence des champs.**

#### Les deux onglets

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtre de laboratoire | Choix : Tous les laboratoires, Global uniquement, ou un laboratoire exécutant | Facultatif | Affiché lorsque des laboratoires exécutants existent. | Tous les laboratoires |
| Colonnes | Type de non-conformité ou Type de résolution, Description, Niveau (onglet des non-conformités uniquement), Laboratoire exécutant, Statut, Actions | Sans objet | | Sans objet |
| + Ajouter un type de non-conformité, + Ajouter un type de résolution | Bouton | Sans objet | | Sans objet |
| Modifier, Désactiver, Activer | Boutons de ligne | Sans objet | Il n'y a pas de suppression. | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Unique au sein du laboratoire exécutant, ou au sein de Global. Un doublon est refusé avec « already exists ». | Aucun |
| Description | Texte libre | Facultatif | Affichée comme indication lorsque quelqu'un sélectionne l'option. | Vide |
| Niveau | Choix : Spécimen, Dossier/Prescription, Les deux | Obligatoire | Onglet Types de non-conformité uniquement. Spécimen concerne un seul spécimen (contenant endommagé). Dossier/Prescription couvre l'ensemble du dossier (documents manquants). | Les deux |
| Laboratoire exécutant | Liste de choix : Global ou un laboratoire exécutant | Facultatif | Global signifie tous les laboratoires exécutants. | Global |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, désactiver : `config:deficiency-types:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut.

**Limites connues.** Vingt-neuf types de non-conformité et douze types de résolution sont préchargés. La désactivation d'un type que le système ouvre par son identifiant fixe n'est pas bloquée, et ce guide n'a pas vérifié ce que fait alors le système. Cet écran n'a pas de blocage en lecture seule.

## Partie C : Configurations des types de contenants, de cassettes et de lames {#ch3-container-cassette}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire

Cette partie regroupe les contenants dans lesquels arrive un spécimen, les couleurs de cassettes et les règles qui choisissent une couleur, ainsi que les couleurs d'encre utilisées sur les marges.

**Il n'existe pas d'écran de types de lames.** PathScribe n'a pas de dictionnaire de types de lames, ni de liste de choix de types de lames nulle part dans Configuration. Il dispose en revanche du nombre de **Lames** de chaque étape d'une entrée du [Dictionnaire des protocoles](#screen-protocols) (combien de lames une étape coupe), des **Protocoles de coupe** et des **Macros de commande rapide** du [Catalogue diagnostique](#screen-stains) (niveaux et coupes sériées), et de la mise en page des étiquettes du [Concepteur d'étiquettes](#screen-label_designer). Le type de cassette, qui est le format physique du bloc, provient du **Format de traitement** du protocole et non d'un écran de cette partie.

### Types de contenants {#screen-container_types}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Types de contenants

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Types de contenants (titre de la page « Dictionnaire des types de contenants »)

**3. Objectif métier et portée.** La liste des classifications de contenants utilisées à l'accession : un pot de formol de 20 mL prérempli, un pot sec de 60 mL, un seau de 1 litre, un flacon de cytologie en milieu liquide, un tube de milieu RPMI. Chacun a une catégorie, une capacité facultative, un fixateur par défaut facultatif et un indicateur précisant s'il est livré prérempli. La liste est proposée sur la page d'accession et dans la fenêtre de modification du prélèvement.

**4. Prérequis et dépendances.** La liste de choix Fixateur par défaut lit le dictionnaire des fixateurs. Ce dictionnaire est préchargé (quinze fixateurs et milieux) et n'a pas d'écran de maintenance propre ; il n'y a donc rien à configurer d'abord. Laboratoire exécutant utilise les laboratoires exécutants du [Répertoire des établissements](#screen-facility-dictionary) ; laissez-le sur Tous les laboratoires pour éviter cette dépendance.

Setup step: Tier 2, step 9
Requires: Aucun, c'est un point de départ.
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-container_types - Liste du Dictionnaire des types de contenants avec filtres]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher | Texte | Facultatif | Nom ou description. | Vide |
| Filtre de statut | Choix : Tous, Actif, Inactif | Facultatif | | Tous |
| Filtre de laboratoire | Choix : Tous les laboratoires, Global uniquement (aucun laboratoire défini), ou un laboratoire | Facultatif | | Tous les laboratoires |
| Colonnes | Type de contenant, Catégorie, Mappage APLIS, Laboratoire exécutant, Statut, Actions | Sans objet | | Sans objet |
| + Ajouter un type de contenant | Bouton | Sans objet | | Sans objet |
| Modifier, Désactiver, Réactiver | Boutons de ligne | Sans objet | Il n'y a pas de suppression. | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Unique au sein du laboratoire exécutant, ou au sein de Tous les laboratoires. | Aucun |
| Description | Texte libre | Facultatif | Terminologie de paillasse, noms de marque ou usages locaux. | Vide |
| Catégorie | Choix : Histologie (biopsies et résections), Cytologie (liquides et frottis), Milieu spécial (analyses annexes) | Obligatoire | | Histologie |
| Mappage APLIS | Texte | Facultatif | Le type de spécimen pour lequel le contenant est généralement utilisé. Deux contenants ne peuvent pas porter le même mappage au sein d'un laboratoire. | Vide |
| Capacité (mL) | Nombre | Facultatif | Laissez vide si la capacité varie ou n'a pas de sens. | Vide |
| Fixateur par défaut | Liste de choix des fixateurs actifs | Facultatif | « None (dry / bench-filled) » pour un contenant sec. | Aucun |
| Pré-rempli | Interrupteur Oui/Non | Facultatif | Oui : livré prérempli avec le fixateur ci-dessus. Non : rempli à la paillasse ou par le préleveur. | Non |
| Laboratoire exécutant | Liste de choix : Tous les laboratoires ou un laboratoire exécutant | Facultatif | | Tous les laboratoires |
| Notes de logique système | Texte libre | Facultatif | Documentation du comportement prévu. Elle ne fait rien aujourd'hui. | Vide |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, désactiver : `config:container-types:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** Les Notes de logique système sont de la documentation uniquement : rien ne déclenche une page STAT, un minuteur de fixation ou un modificateur de facturation à partir d'un choix de contenant. La liste des fixateurs ne peut être modifiée sur aucun écran. La liste préchargée est plus longue que les « 9 standard defaults » mentionnés dans le sous-titre de la page.

### Couleurs de cassette {#screen-cassette_colors}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Couleurs de cassette

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Couleurs de cassette

**3. Objectif métier et portée.** Le dictionnaire des couleurs de cassettes. Les [Règles d'acheminement des cassettes](#screen-cassette_routing_rules) désignent une couleur par ce dictionnaire ; renommer un nom d'affichage ici met donc à jour chaque règle. Chaque couleur porte aussi sa propre politique de repli : que faire lorsque la trémie de cette couleur n'est pas disponible, soit substituer automatiquement une autre couleur, soit avertir le technicien.

**4. Prérequis et dépendances.** Aucun. La liste de choix Remplacer par énumère les autres couleurs ; une couleur de remplacement doit donc exister d'abord.

Setup step: Tier 2, step 16
Requires: Aucun, c'est un point de départ.
Unlocks: [Règles d'acheminement des cassettes](#screen-cassette_routing_rules)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-cassette_colors - Liste des couleurs de cassette]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtre de laboratoire | Choix : Tous les laboratoires, Global uniquement (aucun laboratoire défini), ou un laboratoire | Facultatif | | Tous les laboratoires |
| Colonnes | Couleur, Clé, Laboratoire exécutant, Politique de repli, Statut, Actions | Sans objet | Le repli s'affiche sous la forme « Auto → nom » ou « Avertir le technicien ». | Sans objet |
| + Ajouter une couleur | Bouton | Sans objet | | Sans objet |
| Modifier, Désactiver, Réactiver | Boutons de ligne | Sans objet | | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Clé | Texte, converti en majuscules avec les espaces remplacés par des traits de soulignement | Obligatoire | La clé stable envoyée au moteur de gravure. Renommer ensuite le nom d'affichage ne la casse jamais. Unique au sein du laboratoire exécutant, ou au sein de Tous les laboratoires. | Aucune |
| Nom d'affichage | Texte | Obligatoire | Unique au sein du laboratoire exécutant, ou au sein de Tous les laboratoires. | Aucun |
| Code hexadécimal | Sélecteur de couleur et texte, code hexadécimal à 6 chiffres tel que `#3B82F6` | Obligatoire | Refusé s'il ne s'agit pas d'un véritable code hexadécimal à 6 chiffres. | Aucun |
| Si la trémie de cette couleur n'est pas disponible | Choix : Substitution automatique, Avertir le technicien | Obligatoire | | Avertir le technicien |
| Remplacer par | Liste de choix des autres couleurs | Obligatoire avec Substitution automatique | La couleur à utiliser à la place. | Aucune |
| Laboratoire exécutant | Liste de choix : Tous les laboratoires ou un laboratoire exécutant | Facultatif | | Tous les laboratoires |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, désactiver : `config:cassette-colors:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** PathScribe décide de la couleur logique qu'une cassette reçoit. Il ne modélise ni les numéros de trémie ni les bacs physiques. Les couleurs préchargées sont Blanc, Bleu, Rouge, Rose, Vert / Grille et Jaune. Le Blanc est préchargé avec Avertir le technicien, comme point d'ancrage vers lequel les autres se replient.

### Règles d'acheminement des cassettes {#screen-cassette_routing_rules}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Règles d'acheminement des cassettes

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Règles d'acheminement des cassettes

**3. Objectif métier et portée.** Détermine la couleur de cassette qu'un bloc reçoit, à partir du protocole, de la priorité de la demande, du poste d'origine, de l'établissement prescripteur et du type de dossier. Toutes les conditions que vous définissez doivent être remplies. Une condition laissée vide correspond à tout, de sorte qu'une règle sans condition est une règle fourre-tout. Lorsque plusieurs règles correspondent, celle dont le poids de priorité est le plus élevé l'emporte, et la règle créée en premier l'emporte en cas d'égalité. Une règle est ignorée en dehors de ses dates Effectif à partir du et Effectif jusqu'au. Le type de cassette (format) n'est jamais défini ici : il provient du format de traitement du protocole retenu.

**4. Prérequis et dépendances.** La liste de choix des protocoles lit le [Dictionnaire des protocoles](#screen-protocols), celle des couleurs lit les [Couleurs de cassette](#screen-cassette_colors), celle des postes d'origine lit les [Postes de numérisation](#screen-scan_stations) et celle des établissements prescripteurs lit le [Répertoire des établissements](#screen-facility-dictionary). Si vous omettez les couleurs, la liste Couleur de cassette est vide et aucune règle ne peut être enregistrée.

Setup step: Tier 2, step 17
Requires: [Dictionnaire des protocoles](#screen-protocols), [Couleurs de cassette](#screen-cassette_colors), [Postes de numérisation](#screen-scan_stations), [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-cassette_routing_rules - Liste des règles d'acheminement des cassettes classées par poids]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Colonnes | Poids, Règle, Conditions, Couleur, Statut, Actions | Sans objet | Triées par poids, le plus élevé en premier. Les conditions se lisent « Protocole : nom », « Priorité : liste », « Poste : nom », « Établissement : nom », « Type de dossier : type » ou « Toutes (fourre-tout) ». | Sans objet |
| + Ajouter une règle | Bouton | Sans objet | | Sans objet |
| Modifier, Dupliquer, Désactiver, Réactiver | Boutons de ligne | Sans objet | Dupliquer ouvre une copie nommée « nom (copie) ». | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom de la règle | Texte | Obligatoire | | Aucun |
| Description | Texte libre | Facultatif | | Vide |
| Protocole | Liste de choix : « Tout protocole » ou un protocole | Facultatif | | Tout protocole |
| Priorité de la demande | Cases à cocher : Standard, Prioritaire, STAT | Facultatif | Plus d'une case cochée signifie l'une quelconque d'entre elles. | Aucune case cochée |
| Poste d'origine | Liste de choix : « N'importe quel poste » ou un poste de numérisation | Facultatif | | N'importe quel poste |
| Établissement prescripteur | Liste de choix : « Tout établissement » ou un établissement | Facultatif | | Tout établissement |
| Type de dossier | Texte | Facultatif | Texte libre, par exemple Consultation ou Laboratoire de référence. Il doit correspondre exactement au type de dossier. | Vide |
| Couleur de cassette | Liste de choix des couleurs | Obligatoire | Une couleur inactive s'affiche avec « (inactive) ». | Aucune |
| Clé du modèle d'impression | Texte | Facultatif | Une clé libre pour une mise en page d'impression. | Vide |
| Poids de priorité | Nombre entier, de 1 à 100 | Obligatoire | Le plus élevé l'emporte lorsque plusieurs règles correspondent. | 10 |
| Effectif à partir du | Date | Facultatif | | Vide |
| Effectif jusqu'au | Date | Facultatif | | Vide |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, dupliquer, désactiver : `config:cassette-routing:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** Une règle peut aussi tester si un spécimen de cytologie est un bloc cellulaire ou un liquide résiduel (une condition de décantation), et la règle préchargée Cell Block l'utilise, mais cette fenêtre n'a pas de champ pour elle ; vous ne pouvez donc pas la définir sur une nouvelle règle. Huit règles sont préchargées, dont STAT Override, Cell Block, Renal Protocol et quatre règles pour petites biopsies.

### Couleurs d'encre {#screen-ink_colors}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Couleurs d'encre

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Couleurs d'encre

**3. Objectif métier et portée.** Le dictionnaire des couleurs par rapport auquel les applications d'encre de marge sont validées à la validation finale, et dans lequel les formulaires de marge et d'encrage de l'écran de macroscopie puisent.

**4. Prérequis et dépendances.** Aucun. Si vous l'omettez, le sélecteur d'encre de la macroscopie est vide et le contrôle d'encrage à la validation finale n'a rien par rapport à quoi valider. La rigueur de ce contrôle (avertissement seul ou application stricte, avertissement seul par défaut) se définit par établissement sur un écran distinct, le mode de validation de l'encrage.

Setup step: Tier 2, step 18
Requires: Aucun, c'est un point de départ.
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-ink_colors - Liste des couleurs d'encre]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Colonnes | Couleur, Code, Statut, Actions | Sans objet | | Sans objet |
| + Ajouter une couleur | Bouton | Sans objet | | Sans objet |
| Modifier, Désactiver, Réactiver | Boutons de ligne | Sans objet | | Sans objet |
| Nom | Texte | Obligatoire | Unique dans toute la liste. | Aucun |
| Code | Texte, tel que `#0000FF` | Obligatoire | Le code validé à la validation finale. Unique dans toute la liste. | Aucun |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, désactiver : `config:ink-color:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** Les couleurs préchargées sont Noir, Bleu, Vert, Jaune, Orange, Rouge et Violet. La case du code est un texte libre ; l'écran n'affiche un échantillon de couleur que lorsque la valeur est un code hexadécimal à 6 chiffres.

## Partie D : Référentiels des protocoles de traitement, des colorations, des anticorps et des colorations spéciales {#ch3-stains-protocols}
Breadcrumb: Accueil > Configuration > Système

Cette partie regroupe les listes de référence de tout ce qui est fait à un prélèvement après la macroscopie : les colorations, les anticorps et les analyses moléculaires, les lots de réactifs utilisés et les protocoles de traitement.

**Où se trouvent les anticorps et les colorations spéciales.** PathScribe n'a ni écran distinct pour les anticorps ni écran distinct pour les colorations spéciales. Les deux sont des entrées du [Catalogue diagnostique](#screen-stains) (le dictionnaire des colorations), distinguées par la **Catégorie** : un anticorps est une entrée de catégorie **IHC** (ou **Immunofluorescence**) qui porte un **Clone d'anticorps** et un **Fournisseur**, et une coloration spéciale est une entrée de catégorie **Coloration spéciale**. Les lots d'anticorps et de trousses de colorations spéciales sont suivis dans [Lots de réactifs et de solutions](#screen-reagent_lots).

### Catalogue diagnostique {#screen-stains}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Catalogue diagnostique

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Catalogue diagnostique (le dictionnaire des colorations). Il comporte quatre onglets : Analyses diagnostiques, Protocoles de coupe, Macros de commande rapide et Cibles maîtresses.

**3. Objectif métier et portée.** Un seul catalogue pour les colorations (de routine, spéciales, immunohistochimie, immunofluorescence, cytologie), les analyses moléculaires (FISH, PCR, NGS) et les autres analyses. Une **Analyse diagnostique** est ce qui est demandé. Un **Protocole de coupe** indique comment le bloc est coupé (par exemple Niveau x 3). Les deux sont séparés volontairement. Une **Macro de commande rapide** réunit un de chaque dans un seul raccourci de commande. Les **Cibles maîtresses** sont la liste des sondes, des gènes et des régions de mutation à partir desquels les analyses moléculaires sont construites.

**4. Prérequis et dépendances.** Les champs moléculaires puisent les laboratoires exécutants et les laboratoires de référence dans le [Répertoire des établissements](#screen-facility-dictionary). Les laboratoires de référence ont besoin du rôle Laboratoire de référence. Les codes de facturation se saisissent comme le code de facturation d'une entrée du Dictionnaire de facturation, jamais comme un code CPT brut, et le Dictionnaire de facturation est configuré plus tard (niveau 7) ; un code saisi ici n'est donc pas contrôlé à l'enregistrement. Si vous omettez le catalogue, le [Dictionnaire des protocoles](#screen-protocols) n'a aucune coloration à placer sur une étape, et les [Lots de réactifs et de solutions](#screen-reagent_lots) n'en ont aucune à laquelle rattacher un lot.

Setup step: Tier 2, step 7
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: [Dictionnaire des protocoles](#screen-protocols), [Lots de réactifs et de solutions](#screen-reagent_lots)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-stains - Catalogue diagnostique avec l'onglet Analyses diagnostiques]

**6. Référence des champs.**

#### Onglet Analyses diagnostiques : liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher | Texte | Facultatif | Correspond au nom ou à la catégorie. | Vide |
| Colonnes | Nom, Catégorie, Clone / Fournisseur, Code de facturation, Délai, Statut, Actions | Sans objet | | Sans objet |
| Exporter | Bouton | Sans objet | Télécharge StainDictionary.csv avec Name, Category, Description, AntibodyClone, Vendor, DefaultTurnaroundHours et Active. L'export est inscrit dans le journal d'audit. | Sans objet |
| Importer une feuille de calcul | Bouton | Sans objet | Lit un CSV avec les mêmes colonnes. Une ligne correspond à une entrée existante par son nom, sans distinction de casse. L'aperçu indique « N nouveaux, M à mettre à jour ». **Appliquer l'import** les écrit. | Sans objet |
| + Ajouter un processus diagnostique | Bouton | Sans objet | | Sans objet |
| Modifier, Dupliquer | Boutons de ligne | Sans objet | | Sans objet |

#### Fenêtre d'analyse diagnostique

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Unique dans tout le catalogue. Un doublon est refusé. | Aucun |
| Catégorie | Choix : Routine, Coloration spéciale, IHC, Immunofluorescence, Moléculaire, Cytologie, Autre | Obligatoire | Détermine lesquels des champs ci-dessous sont affichés. | Routine |
| Description | Texte libre | Facultatif | | Vide |
| Code de facturation par défaut | Texte | Facultatif | Le billingCode d'une entrée du Dictionnaire de facturation. Laissez vide pour utiliser la règle générique IHC ou coloration spéciale. | Vide |
| Unité de facturation autonome | Interrupteur Oui/Non | Facultatif | IHC avec un code de facturation uniquement. Désactivé : la coloration compte quand même dans la séquence IHC première et supplémentaire du prélèvement. Activé : elle ne prend pas de place dans la séquence et ne modifie pas le décompte. | Désactivé |
| Mode d'application du CQ après exécution | Choix : aucune dérogation, Appliqué, Résolution automatique, Hybride | Facultatif | IHC et Coloration spéciale uniquement. Remplace le réglage par défaut de l'instrument du groupe de postes de travail pour un lot qui exécute cette coloration. | Aucune dérogation |
| Exiger une lame témoin de la cible | Interrupteur Oui/Non | Facultatif | IHC et Coloration spéciale uniquement. Impose le contrôle de CQ à la validation finale. | Désactivé |
| Ajouter automatiquement la lame témoin à la création du lot | Interrupteur Oui/Non | Facultatif | Affiché uniquement lorsqu'une lame témoin est exigée. | Désactivé |
| Tissu témoin par défaut | Texte | Facultatif | Affiché uniquement lorsqu'une lame témoin est exigée. Renseigne la description de la lame témoin. Jamais contrôlé. | Vide |
| Clone d'anticorps | Texte | Facultatif | IHC et Immunofluorescence uniquement. | Vide |
| Fournisseur | Texte | Facultatif | IHC et Immunofluorescence uniquement. | Vide |
| Méthodologie | Choix : FISH d'anatomie pathologique, FISH cytogénétique, PCR monogénique / ciblée, Panel NGS | Facultatif | Moléculaire uniquement. | Aucune |
| Réalisé en interne par | Liste à cocher des laboratoires exécutants | Facultatif | Moléculaire uniquement. Une demande complémentaire dans un laboratoire coché propose « en interne » et démarre avec ce choix, et la demande va dans la file de demandes du Centre de travail moléculaire. L'envoi à un laboratoire extérieur est toujours proposé. | Aucune case cochée |
| Laboratoires de référence approuvés pour ce test | Liste à cocher des laboratoires de référence actifs | Facultatif | Moléculaire uniquement. Une demande complémentaire ne propose que ces laboratoires. Si aucun n'est coché, tous les laboratoires de référence actifs sont proposés. | Aucune case cochée |
| Laboratoire par défaut | Liste de choix des laboratoires de référence cochés | Facultatif | Moléculaire uniquement. Renseigné sur une nouvelle demande complémentaire. | Aucun par défaut |
| Cibles par défaut | Zone de recherche et liste de cibles maîtresses | Facultatif | Moléculaire uniquement. Copiées sur chaque nouvelle demande, puis librement modifiables à cet endroit. Les modifier ne change jamais une demande existante. Vous pouvez aussi saisir un nouveau symbole et un détail facultatif et sélectionner **Ajouter au dictionnaire maître**. | Aucune |
| Modèle de facturation | Choix : Base + complément (avec seuil de multiplexage), Multiplicateur par unité, Forfait | Obligatoire pour Moléculaire | Détermine lesquels des champs suivants sont affichés. Seuls les champs utilisés par le modèle choisi sont enregistrés. | Base + complément |
| billingCode de base (1re cible) | Texte | Facultatif | Base + complément uniquement. | Vide |
| billingCode de complément (chaque cible supplémentaire) | Texte | Facultatif | Base + complément uniquement. | Vide |
| billingCode de multiplexage | Texte | Facultatif | Base + complément uniquement. | Vide |
| Seuil de multiplexage | Nombre entier | Facultatif | Base + complément uniquement. | 3 |
| billingCode par unité | Texte | Facultatif | Multiplicateur par unité uniquement. | Vide |
| billingCode du forfait | Texte | Facultatif | Forfait uniquement. | Vide |
| Délai par défaut (heures) | Nombre, 0 ou plus | Facultatif | | Vide |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |

#### Onglet Protocoles de coupe

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Colonnes | Nom, Description, Statut, Actions | Sans objet | | Sans objet |
| + Ajouter un protocole | Bouton | Sans objet | | Sans objet |
| Nom | Texte | Obligatoire | Unique. Un doublon est refusé. | Aucun |
| Description | Texte libre | Facultatif | Ce que signifie la consigne de coupe. | Vide |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |

#### Onglet Macros de commande rapide

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Colonnes | Libellé, Type de coloration, Protocole de coupe, Statut, Actions | Sans objet | | Sans objet |
| + Ajouter une macro | Bouton | Sans objet | | Sans objet |
| Libellé | Texte | Obligatoire | Par exemple « H&E x 3 ». Unique. | Aucun |
| Type de coloration | Liste de choix des analyses diagnostiques | Obligatoire | | Première analyse |
| Protocole de coupe | Liste de choix des protocoles de coupe | Obligatoire | | Premier protocole |
| Ordre de tri | Nombre entier | Facultatif | Sa place dans la liste des raccourcis. | 99 |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |

#### Onglet Cibles maîtresses

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Colonnes | Symbole, Type, Détail, Statut, Actions | Sans objet | | Sans objet |
| + Ajouter une cible | Bouton | Sans objet | | Sans objet |
| Symbole | Texte | Obligatoire | Par exemple ERBB2. Une répétition du même symbole et du même détail est refusée. | Aucun |
| Type | Choix : Sonde (FISH), Gène (NGS), Région de mutation (PCR) | Obligatoire | | Sonde |
| Détail | Texte | Facultatif | Par exemple 17q12 (locus) ou V600E (mutation). | Vide |
| Statut | Interrupteur Actif / Inactif | Facultatif | Une cible inactive reste sur les entrées qui l'utilisent déjà, mais n'est pas proposée lorsque vous recherchez une nouvelle cible par défaut. | Actif |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter et modifier sur les quatre onglets : `config:stain-dictionary:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** L'import et l'export CSV ne portent que sept colonnes. Ils ne portent ni les champs de facturation, ni ceux de CQ, ni les champs moléculaires, et un import ne contrôle pas la valeur de Catégorie par rapport à la liste. Le catalogue préchargé contient des colorations de routine et spéciales, des anticorps IHC avec leurs clones, des marqueurs d'immunofluorescence, des colorations de cytologie et des analyses moléculaires.

### Dictionnaire des protocoles {#screen-protocols}
Breadcrumb: Accueil > Configuration > Système > Références cliniques > Dictionnaire des protocoles

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Références cliniques**
**2. Élément de maintenance :** Dictionnaire des protocoles

**3. Objectif métier et portée.** Un protocole est un flux de traitement autonome et réutilisable. Il n'est pas lié à un seul type de spécimen : vous l'associez depuis le champ **Protocole de traitement** du [Dictionnaire des spécimens](#screen-specimens), et le modifier ici change tous les types de spécimens qui l'utilisent. Un protocole a une ou plusieurs **filières** (par exemple Microscopie optique, Immunofluorescence, Microscopie électronique). Chaque filière a un type de matériau (bloc ou décantation), un fixateur, un format de traitement et des étapes ordonnées. Une étape peut couper des lames, appliquer des colorations ou être une mise en attente. Un protocole peut exiger un tri à la paillasse, avec une liste de contrôle.

**4. Prérequis et dépendances.** Les étapes puisent les colorations dans le [Catalogue diagnostique](#screen-stains). Les listes de choix du fixateur et du format de traitement lisent deux dictionnaires figés qui n'ont pas d'écran de maintenance (quinze fixateurs et milieux, quatre formats : Standard, Mégabloc, Bloc congelé, Grille de résine). Un nouveau protocole prend le fixateur et le format par défaut, et démarre comme une filière de décantation lorsque son service est un service de liquides ([Services](#screen-departments)). Si vous omettez le catalogue, le sélecteur de coloration des étapes est vide.

Setup step: Tier 2, step 8
Requires: [Services](#screen-departments), [Catalogue diagnostique](#screen-stains)
Unlocks: [Dictionnaire des spécimens](#screen-specimens), [Règles d'acheminement des cassettes](#screen-cassette_routing_rules)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-protocols - Liste du Dictionnaire des protocoles avec filtres, Exporter et Importer]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtre de laboratoire | Choix : Tous les laboratoires, Global uniquement (aucun laboratoire défini), ou un laboratoire | Facultatif | | Tous les laboratoires |
| Colonnes | Nom, Laboratoire exécutant, Filières, Utilisé par, Tri requis, Statut, Actions | Sans objet | **Utilisé par** compte les types de spécimens associés au protocole. | Sans objet |
| Exporter | Bouton | Sans objet | Télécharge les protocoles, une ligne par étape. | Sans objet |
| Importer une feuille de calcul | Bouton | Sans objet | Lit un fichier au format de l'export. L'aperçu énumère les colorations sans correspondance et les décomptes non valides. **Appliquer l'import** écrit les protocoles. | Sans objet |
| + Ajouter un protocole | Bouton | Sans objet | | Sans objet |
| Modifier, Dupliquer | Boutons de ligne | Sans objet | Dupliquer ouvre « Ajouter un protocole - cloné de nom ». | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom | Texte | Obligatoire | Unique au sein du laboratoire exécutant, ou au sein de Tous les laboratoires. | Aucun |
| Laboratoire exécutant | Liste de choix : Tous les laboratoires ou un laboratoire exécutant | Facultatif | | Tous les laboratoires |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |
| Description | Texte libre | Facultatif | À quoi il sert et quels types de spécimens y sont associés. | Vide |
| Tri requis à la paillasse | Interrupteur Oui/Non | Facultatif | | Non requis |
| Liste de contrôle du tri | Liste d'étapes de texte | Facultatif | Affichée lorsque le tri est requis. Ajouter une étape et Supprimer. | Vide |
| Bandeau d'utilisation | Texte | Sans objet | Indique quels types de spécimens sont associés au protocole, ou « Not currently mapped from any specimen type ». | Sans objet |
| Historique | Liste des versions antérieures | Sans objet | Afficher et **Restaurer cette version** ramènent le protocole à une version antérieure. | Sans objet |

#### Filière (au moins une est requise)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom de la filière | Texte | Obligatoire | Par exemple Microscopie optique. | Aucun |
| Type de matériau | Choix : Bloc (tissu solide, cassette), Décantation (liquide / cytologie) | Obligatoire | | Bloc |
| Fixateur | Liste de choix des fixateurs | Obligatoire | Une valeur absente du dictionnaire affiche « (not in dictionary) ». | Le fixateur par défaut |
| Format de traitement | Liste de choix des formats | Obligatoire | Le type de cassette. | Le format par défaut |
| Décalcification requise | Interrupteur Oui/Non | Facultatif | | Désactivé |
| Nombre de blocs par défaut ou Nombre de décantations par défaut | Nombre entier supérieur à 0 | Facultatif | Une case vide signifie 1. | Vide |
| Nombre de pièces par défaut | Nombre entier supérieur à 0 | Facultatif | Filières de bloc uniquement. Refusé sur une filière de décantation. | Vide |
| Ajouter une filière, Supprimer la filière | Boutons | Sans objet | | Sans objet |

#### Étape (à l'intérieur d'une filière)

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Action de l'étape | Texte | Facultatif | Par exemple Cut Level 1, Frozen Section. | Vide |
| Colorations | Recherche et liste de sélection des analyses diagnostiques | Facultatif | Recherche par nom ou par catégorie. | Aucune |
| Lames | Nombre entier | Facultatif | | Vide |
| En attente | Interrupteur Oui/Non | Facultatif | Une étape de mise en attente. | Désactivé |
| Ajouter une étape, Supprimer l'étape | Boutons | Sans objet | | Sans objet |

Le bouton **Enregistrer les modifications** est désactivé tant que le nom, chaque nom de filière et les décomptes de chaque filière ne sont pas valides.

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, restaurer une version : `config:processing-protocols:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** Trois propriétés enregistrées par filière et par étape n'ont pas de champ à l'écran : une durée de décalcification, un indicateur « envoyer une demande sortante » sur une étape et une liste de colorations supplémentaires autorisées. Les listes des fixateurs et des formats de traitement ne peuvent être modifiées sur aucun écran. À ne pas confondre avec l'onglet des protocoles de la Bibliothèque synoptique ([Chapitre 6](#screen-tab-protocols)), qui contient des protocoles de compte rendu et non des flux de traitement.

### Lots de réactifs et de solutions {#screen-reagent_lots}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Lots de réactifs et de solutions

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Lots de réactifs et de solutions (titre de la page « Registre des lots de réactifs et solutions »)

**3. Objectif métier et portée.** Un registre des lots de réactifs avec le numéro de lot, la date de péremption et le statut de CQ. Un lot concerne une coloration du catalogue (un anticorps IHC ou une trousse de coloration spéciale) ou l'un des sept réactifs de la chaîne H&E de routine. Lorsque quelqu'un crée un lot de coloration, les lots actifs sont proposés au rattachement.

**4. Prérequis et dépendances.** Un lot de coloration du catalogue puise dans les entrées actives et non routinières du [Catalogue diagnostique](#screen-stains). Si vous omettez le catalogue, la liste Coloration est vide. Les réactifs de la chaîne de routine forment une liste figée et n'exigent rien.

Setup step: Tier 2, step 19
Requires: [Catalogue diagnostique](#screen-stains)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-reagent_lots - Liste du Registre des lots de réactifs et solutions]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher | Texte | Facultatif | Numéro de lot ou coloration. | Vide |
| Filtre de statut | Choix : Tous les statuts, Actif, Inactif | Facultatif | | Tous les statuts |
| Filtre d'état de CQ | Choix : Tous les états de CQ, En attente, Réussi, Échec | Facultatif | | Tous les états de CQ |
| Colonnes | Réactif / Coloration, Numéro de lot, Expiration, Statut CQ, Laboratoire exécutant, Statut, Actions | Sans objet | | Sans objet |
| + Ajouter un lot de réactif | Bouton | Sans objet | | Sans objet |
| Modifier, Désactiver, Réactiver | Boutons de ligne | Sans objet | | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Ce lot concerne | Choix : Coloration du catalogue (IHC / coloration spéciale), Réactif de la chaîne H&E de routine | Obligatoire | Détermine si la liste de choix suivante est Coloration ou Réactif de ligne. | Coloration du catalogue |
| Coloration | Liste de choix des entrées actives et non routinières du catalogue | Obligatoire pour une coloration du catalogue | | Aucune |
| Réactif de ligne | Choix : Hématoxyline, Éosine, Réactif de bleuissement, Différenciateur, Déshydratant (alcool), Clarifiant (xylène), Milieu de montage | Obligatoire pour un réactif de ligne | | Aucun |
| Numéro de lot | Texte | Obligatoire | | Aucun |
| Date d'expiration | Date | Obligatoire | | Aucune |
| Date de réception | Date | Facultatif | | Vide |
| Fournisseur | Texte | Facultatif | | Vide |
| Statut CQ | Choix : En attente, Réussi, Échec | Obligatoire | | En attente |
| Laboratoire exécutant | Liste de choix : Tous les laboratoires (stock partagé) ou un laboratoire exécutant | Facultatif | | Tous les laboratoires |
| Actif | Interrupteur Oui/Non | Facultatif | | Actif |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, désactiver : `config:reagent-lots:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** Le registre enregistre le statut de CQ. Ce guide n'a trouvé aucune règle qui empêche un lot de coloration d'utiliser un lot périmé ou en échec, et la fenêtre du lot de coloration n'énumère que les lots actifs.

## Partie E : Bibliothèques de codes de diagnostic {#ch3-code-libraries}
Breadcrumb: Accueil > Configuration > Système

Cette partie regroupe les paramètres des systèmes de codage et des services qui les interrogent. PathScribe ne contient pas lui-même le contenu de SNOMED CT, de la CIM, de la CIM-O, de LOINC ou des CPT. Chacun est tenu à jour par son propre organisme de normalisation et consulté par l'intermédiaire d'un service.

**Où se trouvent les dictionnaires associés.** La liste des modificateurs CPT est le [Dictionnaire des modificateurs CPT](#screen-modifier_dictionary) et la liste des codes d'actes est le [Dictionnaire de facturation](#screen-billing_dictionary). Les deux sont documentés au [Chapitre 8](#ch8), et non ici. [Import de codes (en masse)](#screen-code_import), plus bas, charge des codes de facturation dans le Dictionnaire de facturation. Il n'importe pas de codes de diagnostic.

### Systèmes de codage {#screen-code_systems}
Breadcrumb: Accueil > Configuration > Système > Références cliniques > Systèmes de codage

**Statut :** Démonstration

**1. Navigation :** onglet Configuration **Système** > groupe **Références cliniques**
**2. Élément de maintenance :** Systèmes de codage

**3. Objectif métier et portée.** Pour chaque pays que vous desservez, indique quels systèmes de codage (CIM-10, CIM-11, CIM-O, SNOMED CT, LOINC, CPT, OPCS-4 et autres) sont **Désactivé**, **Facultatif** ou **Obligatoire**, et à partir de quelle date. Faire passer une région de la CIM-10 à la CIM-11 est un paramètre ici, non une modification du logiciel. Une seconde carte, **Terminologies sous licence**, consigne les licences SNOMED CT et CIM-O-3 que détient votre organisation. Les codes réels saisis dans les [Règles de déclenchement anormal](#screen-abnormal_trigger_rules) ne sont utilisés que tant que la licence correspondante est activée et n'a pas expiré. Jusque-là, des codes de test clairement identifiés sont rattachés.

**4. Prérequis et dépendances.** La liste des pays est constituée de la juridiction propre au laboratoire et de la juridiction de chaque établissement actif ; les établissements sont donc configurés d'abord ([Répertoire des établissements](#screen-facility-dictionary)). Si vous les omettez, seul le pays du laboratoire est listé.

Setup step: Tier 2, step 2
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: [Règles de déclenchement anormal](#screen-abnormal_trigger_rules)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-code_systems - Politique des systèmes de codage par pays et carte Terminologies sous licence]

**6. Référence des champs.**

#### Tableau de politique

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Où | Texte | Sans objet | Une ligne par pays desservi. | Sans objet |
| Utilisés aujourd'hui | Texte | Sans objet | Chaque système avec son rôle actuel, par exemple « ICD-10 : Facultatif », et « (puis Obligatoire à partir de la date) » lorsqu'une règle ultérieure existe. | Sans objet |
| Défini par | Texte | Sans objet | « Par défaut » ou « Défini ici ». | Par défaut |
| Modifier | Bouton de ligne | Sans objet | Ouvre l'éditeur de règles de ce pays. | Sans objet |
| Rétablir les valeurs par défaut | Bouton de ligne | Sans objet | Affiché lorsqu'un enregistrement existe. Le supprime. | Sans objet |

#### Éditeur de règles

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Système de codage | Texte avec suggestions : SNOMED CT, ICD-10, ICD-11, LOINC, ICD-O, CPT, OPCS-4 | Obligatoire | Un identifiant de système. Un futur système peut être saisi comme donnée. | Aucun |
| Rôle | Choix : Désactivé, Facultatif, Obligatoire | Obligatoire | | Facultatif |
| S'applique à partir du | Date | Facultatif | Laissez vide pour une règle qui s'applique maintenant. Pour changer un rôle plus tard, ajoutez une deuxième ligne pour le même système avec une date de début. C'est la dernière ligne entrée en vigueur qui s'applique. | Vide |
| Retirer | Bouton de ligne | Sans objet | | Sans objet |
| + Ajouter une règle | Bouton | Sans objet | Au plus 40 règles par pays. | Sans objet |
| Enregistrer | Bouton | Sans objet | Refusé s'il n'y a aucune règle, si un système ou un rôle est vide ou non valide, si une date n'est pas réelle, si deux lignes d'un même système ont la même date de début, ou s'il y a trop de règles. | Sans objet |
| Annuler | Bouton | Sans objet | | Sans objet |

Un pays sans enregistrement démarre avec tous les systèmes connus en Facultatif, sauf la CIM-11, qui est Désactivée.

#### Carte Terminologies sous licence

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Notre organisation détient cette licence : utiliser les vrais codes | Case à cocher, une pour SNOMED CT et une pour CIM-O-3 | Facultatif | Active les codes réels. | Désactivé |
| Titulaire de la licence | Texte | Obligatoire lorsque la case est cochée | | Vide |
| Édition ou version | Texte | Obligatoire lorsque la case est cochée | | Vide |
| Référence de la licence ou de l'accord | Texte | Obligatoire lorsque la case est cochée | | Vide |
| Dernier jour de validité | Date | Facultatif | Laissez vide si la licence n'expire pas. Après ce jour, les codes de test sont de nouveau utilisés. | Vide |
| Ligne d'état | Texte | Sans objet | L'une des mentions : Licence active ; Licence expirée à une date ; Aucune licence enregistrée ; Licence enregistrée mais désactivée. | Sans objet |
| Enregistrer les licences | Bouton | Sans objet | Refusé avec un motif si une case obligatoire est vide ou si la date n'est pas réelle. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Enregistrer, modifier, rétablir la politique et enregistrer les licences : `config:code-systems:manage` (risque élevé). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Chaque modification de politique est auditée sous `CODE_SYSTEM_POLICY_CHANGED`, avec l'avant et l'après.

**Limites connues.** Les paramètres sont enregistrés, mais rien ne lit encore la politique : la fenêtre Ajouter un code, la validation finale et les messages sortants ne l'utilisent pas (Prévu, `docs/architecture/DIAGNOSIS_CODING.md`). L'écran l'indique sur sa face. La politique est conservée dans le navigateur jusqu'à ce que le serveur API la détienne, ce qui explique que le statut soit Démonstration. PathScribe n'inclut pas le contenu de SNOMED CT ni de la CIM-O-3 : la licence est un accord entre votre organisation et l'organisme qui la délivre.

### Services de terminologie {#screen-terminology}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Services de terminologie

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Services de terminologie

**3. Objectif métier et portée.** Un contrôle de connectivité. Il confirme que PathScribe peut joindre les systèmes de codage utilisés pour la recherche de codes et les suggestions de l'IA : SNOMED CT, CIM-10, CIM-11, LOINC, CIM-O et CPT. Il n'y a rien à ajouter ni à charger ici. Chaque système est tenu à jour par son propre organisme de normalisation et n'est pas versionné dans PathScribe. Les contrôles s'exécutent à l'ouverture de l'écran et lorsque vous sélectionnez **Tout tester**.

**4. Prérequis et dépendances.** La bonne variante de la CIM-10 est choisie d'après vos [Organismes de réglementation](#screen-governing_bodies) actifs : ICD-10-CM pour les États-Unis (CAP), ICD-10 WHO pour le RCPath et l'ICCR, et ICD-10-AM pour le RCPA. Les variantes non américaines et les CPT nécessitent un proxy côté serveur. Lorsqu'une adresse de serveur API est configurée, les recherches ICD-10-CM, ICD-11 et LOINC passent par le serveur, comme décrit dans `docs/architecture/TERMINOLOGY_PROXY_API.md`. SNOMED CT et la CIM-O sont contrôlés par la route UMLS du serveur.

Setup step: Tier 2, step 3
Requires: [Organismes de réglementation](#screen-governing_bodies)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-terminology - Contrôle de connectivité des services de terminologie]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| État global | Texte | Sans objet | « All systems operational » lorsque chaque service est En ligne ou Licence requise. Sinon « Some services need attention ». | Sans objet |
| Dernier contrôle | Heure | Sans objet | | Sans objet |
| Afficher les variables d'environnement | Interrupteur Oui/Non | Facultatif | Affiché à un Superadmin uniquement. Montre la variable d'environnement et la valeur derrière chaque service. | Désactivé |
| Tout tester | Bouton | Sans objet | Relance les contrôles. | Sans objet |
| Service | Texte | Sans objet | SNOMED CT, ICD-10-CM, ICD-11, LOINC, ICD-O, CPT. | Sans objet |
| Détails | Texte | Sans objet | Ce que fournit le service et sa source (par exemple NLM Clinical Tables, gratuit). | Sans objet |
| Statut | Texte | Sans objet | Vérification en cours, En ligne, Dégradé, Hors service, Non configuré ou Licence requise. | Sans objet |
| Variantes ICD-10 selon la région | Avis | Sans objet | Explique le choix de la variante ci-dessus. | Sans objet |
| Licence CPT requise avant la mise en service | Avis | Sans objet | Les CPT sont sous licence de l'AMA et ne peuvent pas être servis par une API publique. Ils nécessitent une licence de l'AMA et un proxy côté serveur. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. L'écran ne modifie aucune donnée et n'a pas de capacité propre. L'interrupteur des variables d'environnement est réservé à un Superadmin.

**Limites connues.** L'écran ne peut ni ajouter un système ni changer une adresse. Les adresses proviennent des variables d'environnement du déploiement.

### Import de codes (en masse) {#screen-code_import}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus > Import de codes (en masse)

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Références financières et de revenus**
**2. Élément de maintenance :** Import de codes

**3. Objectif métier et portée.** Importe des codes de facturation à partir d'un fichier CSV (CPT, HCPCS, NHS OPCS-4 ou codes locaux du laboratoire) dans le [Dictionnaire de facturation](#screen-billing_dictionary). Chaque import devient une tâche. Une seconde personne doit approuver ou rejeter la tâche entière dans [Approbations de règles de facturation en attente](#screen-pending_approvals). Les versions antérieures d'un code restent en vigueur jusqu'à la date d'effet de la nouvelle version. La page comporte trois étapes et un historique des imports.

**4. Prérequis et dépendances.** Rien au niveau 2 n'est nécessaire d'abord. La liste de choix Site énumère vos sites, et **À l'échelle de l'entreprise** applique les codes partout. Rien ne change dans le Dictionnaire de facturation tant qu'une autre personne n'a pas approuvé la tâche ; prévoyez donc un second administrateur.

Setup step: Tier 2, step 4
Requires: Aucun, c'est un point de départ.
Unlocks: [Dictionnaire de facturation](#screen-billing_dictionary), [Approbations de règles de facturation en attente](#screen-pending_approvals)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-code_import - Assistant d'import de codes et historique des imports]

**6. Référence des champs.**

#### Étape 1 : Fichier et périmètre

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Choisir un fichier CSV | Fichier | Obligatoire | Refusé s'il ne s'agit pas d'un CSV, s'il n'a pas de ligne d'en-tête ni de lignes de données, ou s'il est illisible. | Aucun |
| Référentiel de codage | Choix : CPT, HCPCS, Codes locaux du laboratoire, NHS OPCS-4 | Obligatoire | | CPT |
| Pays | Choix regroupé en Pays d'exploitation, Union européenne, Autres, plus « N'importe quel pays » | Obligatoire | Changer le référentiel renseigne un pays : US pour CPT et HCPCS, UK pour NHS OPCS-4, vide pour les codes locaux. | US |
| Site | Liste de choix : À l'échelle de l'entreprise ou un site | Facultatif | | À l'échelle de l'entreprise |
| Note du lot | Texte | Facultatif | Ajoutée au motif de modification de chaque code de l'import. | Vide |

#### Étape 2 : Faire correspondre les colonnes

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Code de facturation | Choix d'une colonne du fichier, ou « Absent du fichier » | Obligatoire | PathScribe suggère des correspondances d'après les noms de colonnes. Une colonne peut renseigner plusieurs champs : une seule colonne « Code » donne souvent à la fois le code de facturation et le code CPT. | Suggérée |
| Code CPT | Choix d'une colonne du fichier | Obligatoire | | Suggérée |
| En vigueur à partir du | Choix d'une colonne du fichier | Obligatoire sauf si une date est donnée pour le fichier | | Suggérée |
| Description, Niveau, Type de facturation (TC / 26 / Global), Code HCPCS, RVU travail, RVU de frais de pratique, RVU de responsabilité civile, Notes | Choix d'une colonne du fichier | Facultatif | | Suggérée |
| Date d'effet pour tout le fichier | Date | Facultatif | Utilisée pour les lignes sans date propre. Remplace la colonne En vigueur à partir du. | Vide |
| Niveau si absent du fichier | Choix : Déduire de la description, ou un niveau | Facultatif | | Déduire de la description |
| Type de facturation si absent du fichier | Choix : Technique (TC), Professionnel (26), Global | Facultatif | | Global |
| Vérifier le fichier | Bouton | Sans objet | Désactivé tant que les champs obligatoires ne sont pas associés. | Sans objet |

#### Étape 3 : Vérifier et importer

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Résumé de l'aperçu | Texte | Sans objet | Le nombre de lignes importables et de lignes refusées. | Sans objet |
| Lignes refusées | Tableau : Ligne, Code de facturation, Motif | Sans objet | Jusqu'à 50 affichées. Motifs : pas de code de facturation, pas de code CPT, une date d'effet incorrecte ou absente, une valeur de RVU incorrecte, une répétition du code de facturation dans le fichier, un type de facturation ou un niveau non reconnu, ou le code a déjà une version en brouillon ou en attente d'approbation. | Sans objet |
| Ignorer ces lignes et importer le reste | Case à cocher | Facultatif | Les lignes refusées bloquent l'import sauf si vous les ignorez. | Désactivé |
| Bouton Importer | Bouton | Sans objet | Enregistre une tâche en attente d'approbation. | Sans objet |

#### Historique des imports

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Colonnes | Fichier / tâche, Référentiel de codage, S'applique à, Codes, Chargé, Statut, Actions | Sans objet | Le statut est En attente d'approbation, Approuvé, Rejeté, Annulé ou Annulé (certains codes retirés). Les tâches ne sont jamais supprimées. | Sans objet |
| Annuler l'import | Bouton de ligne | Sans objet | Tâches approuvées uniquement. Ouvre une zone de motif. | Sans objet |
| Motif de l'annulation | Texte | Obligatoire | | Aucun |
| Confirmer l'annulation | Bouton | Sans objet | Supprime les versions ajoutées par l'import. Une version que des actes facturables ont déjà utilisée est conservée et marquée comme retirée. Les versions antérieures que l'import avait clôturées sont rouvertes. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Importer et annuler : `config:billing-code-import:run` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. L'approbation ou le rejet d'une tâche est effectué par une autre personne dans [Approbations de règles de facturation en attente](#screen-pending_approvals). La personne qui a chargé une tâche ne peut pas l'approuver (principe des quatre yeux).

**Limites connues.** L'import n'apporte que des codes de facturation, non des codes de diagnostic. Le Niveau d'une ligne absente du fichier peut être déduit de la description. Un fichier contenant deux fois le même code de facturation est refusé pour ce code.

## Partie F : Médecins prescripteurs, comptes clients et préférences de distribution {#ch3-physicians-clients}
Breadcrumb: Accueil > Configuration > Système

Cette partie regroupe les personnes et les organisations qui envoient du travail, le délai de rendu promis à chaque client, les règles qui signalent un résultat comme anormal, et les organismes de normalisation qui fixent les durées de conservation. Les préférences de remise des comptes rendus se définissent sur le médecin (moyen de contact préféré) et dans l'onglet Comptes rendus de l'établissement, et non sur un écran distinct.

### Médecins {#screen-physicians}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Médecins

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations**
**2. Élément de maintenance :** Médecins

**3. Objectif métier et portée.** L'annuaire des médecins prescripteurs et expéditeurs et de leurs affiliations à des établissements. Chacun a un **Code médecin** unique et, s'il en a un, un NPI (National Provider Identifier). Les coordonnées, un moyen de contact préféré et un numéro de mobile compatible SMS (utilisé uniquement pour les SMS automatiques d'alerte critique) sont conservés ici. Un nom de médecin qui arrive dans une demande et ne correspond à rien crée une entrée Non vérifié que quelqu'un doit contrôler.

**4. Prérequis et dépendances.** La liste des Affiliations à des établissements lit le [Répertoire des établissements](#screen-facility-dictionary). Si vous l'omettez, la liste est vide et un médecin ne peut pas être rattaché à un client.

Setup step: Tier 2, step 20
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-physicians - Liste des médecins avec recherche, filtre de statut, Exporter et Importer]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher | Texte | Facultatif | Nom, code, NPI ou spécialité. | Vide |
| Filtre de statut | Choix : Tous, Actif, Inactif, Non vérifié | Facultatif | | Tous |
| Colonnes | Médecin (avec code et NPI), Spécialité, Contact (avec le moyen préféré après « via »), Établissements, Statut, Actions | Sans objet | | Sans objet |
| Exporter | Bouton | Sans objet | Télécharge un CSV, comprenant le code médecin, le NPI, le contact, le SMS, le statut et les établissements. | Sans objet |
| Importer une feuille de calcul | Bouton | Sans objet | Une ligne correspond à un médecin existant d'abord par le NPI, puis par le Code médecin. Une ligne qui n'a ni l'un ni l'autre reçoit un nouveau code. L'aperçu indique « N à mettre à jour, M nouveaux » et combien ont reçu un nouveau code. **Appliquer l'import** les écrit. | Sans objet |
| Vérifier | Bouton de ligne | Sans objet | Affiché pour les entrées Non vérifié. | Sans objet |
| Modifier | Bouton de ligne | Sans objet | | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Titre | Choix : Aucun, M., Mme, Mlle, Mx, Dr | Facultatif | | Aucun |
| Suffixe | Choix de valeurs prédéfinies, ou Autre | Facultatif | | Vide |
| Prénom(s) | Texte | Obligatoire | Tous les prénoms et seconds prénoms. | Aucun |
| Nom(s) de famille | Texte | Obligatoire | | Aucun |
| Nom préféré | Texte | Facultatif | Comment le personnel doit l'appeler, si différent. | Vide |
| Code médecin | Texte | Obligatoire | Un identifiant interne, par exemple PHY-0231. Unique dans tout l'annuaire. Un doublon est refusé et nomme le médecin qui le détient. | Aucun |
| Numéro NPI | Texte | Facultatif | Tous les médecins n'en ont pas. Unique lorsqu'il est renseigné. L'écran ne contrôle pas le format à 10 chiffres. | Vide |
| Spécialité | Texte | Facultatif | | Vide |
| Téléphone, Fax | Texte | Facultatif | | Vide |
| Mobile compatible SMS | Texte | Facultatif | Pour les SMS automatiques d'alerte critique uniquement. | Vide |
| Opérateur mobile (États-Unis) | Choix : Inconnu / hors États-Unis, Verizon, AT&T, T-Mobile, US Cellular, Autre | Facultatif | Utilisé pour envoyer le SMS sous forme de courriel à la passerelle de l'opérateur. | Inconnu / hors États-Unis |
| Domaine e-mail vers SMS de l'opérateur | Texte | Facultatif | Affiché lorsque l'opérateur est Autre. | Vide |
| E-mail | Texte | Facultatif | | Vide |
| Moyen de contact préféré | Choix : E-mail, Fax, Téléphone | Obligatoire | | E-mail |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |
| Affiliations à des établissements | Recherche et liste à cocher des établissements | Facultatif | Un médecin peut être rattaché à plusieurs établissements. | Aucune case cochée |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, importer, vérifier, désactiver : `config:physicians:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut.

**Limites connues.** L'écran n'a pas de blocage en lecture seule pour une personne sans la capacité : le service refuse l'enregistrement. Les médecins préchargés sont des enregistrements d'exemple (PHY-0001 et suivants).

### Configuration de l'établissement {#screen-clients}
Breadcrumb: Accueil > Configuration > Système > Intégrations > Configuration de l'établissement

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Intégrations** > **Configuration de l'établissement**
**2. Élément de maintenance :** Configuration de l'établissement (comptes clients)

**3. Objectif métier et portée.** Un compte client est un établissement qui a le rôle Établissement prescripteur externe (une clinique, un hôpital ou un cabinet qui vous envoie des prélèvements) ou le rôle Établissement prescripteur interne. C'est le même écran, avec le même éditeur, que le [Chapitre 2](#ch2) documente comme le [Répertoire des établissements](#screen-facility-dictionary). Tout ce qui concerne ses champs, ses onglets et ses valeurs par défaut y est écrit une seule fois. Cette section ne dit que ce qui compte lorsque vous l'utilisez pour configurer des clients.

**4. Prérequis et dépendances.** Rien ne le précède au niveau 2 : c'est l'écran du niveau 1. Configurez d'abord vos laboratoires exécutants, puis chaque client. Les clients alimentent trois écrans du niveau 2 : [Médecins](#screen-physicians) (affiliations), [Niveaux de service par client](#screen-client_sla) (un niveau par client, associé par l'Autorité d'attribution) et les dérogations par établissement des écrans de cytologie.

Setup step: Tier 2, step 21
Requires: [Répertoire des établissements](#screen-facility-dictionary)
Unlocks: [Niveaux de service par client](#screen-client_sla)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-clients - Liste Configuration de l'établissement avec recherche, filtres et Ajouter un établissement]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Page de liste : recherche, filtres de statut et de rôle, colonnes, + Ajouter un établissement, Vérifier, Modifier, Dupliquer, Désactiver | Voir [Répertoire des établissements](#screen-facility-dictionary) | Sans objet | Dupliquer copie la configuration au niveau de l'organisation dans un nouvel établissement et efface les identifiants. La désactivation d'un établissement encore utilisé ouvre **Établissement encore utilisé** et demande une confirmation. | Sans objet |
| Rôles dans l'onglet Général | Cases à cocher : Laboratoire exécutant, Lieu de soumission interne, Établissement prescripteur interne, Établissement prescripteur externe, Acquisition de prélèvements, Laboratoire de référence | Obligatoire | Un compte client est un rôle de prescripteur. Un laboratoire de référence auquel vous envoyez du travail a besoin du rôle Laboratoire de référence pour apparaître dans le [Catalogue diagnostique](#screen-stains). | Établissement prescripteur externe |
| Autorité d'attribution dans l'onglet Général | Texte, jusqu'à 10 caractères | Obligatoire | Associe les demandes entrantes au client. Les [Niveaux de service par client](#screen-client_sla) sont associés sur le même code. | Vide |
| Onglets de l'éditeur | Général, Intégration SIL, Formats d'identifiants, Rapports, Délai de traitement et escalade, IA et performance, Emplacements, Messagerie sécurisée, Impression, Orthographe | Sans objet | Les champs de chaque onglet figurent dans le [Répertoire des établissements](#screen-facility-dictionary). Emplacements, Messagerie sécurisée, Impression et Orthographe s'affichent après le premier enregistrement de l'établissement. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, dupliquer, activer, désactiver : `config:facilities:manage` (risque élevé, audité). Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** Le même écran figure deux fois dans le plan, sous deux noms. Il est documenté en entier au Chapitre 2 et n'est pas répété ici.

### Niveaux de service par client {#screen-client_sla}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Niveaux de service par client

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Niveaux de service par client

**3. Objectif métier et portée.** Définit le délai de rendu promis à chaque client : les heures jusqu'à la première prise en charge et les heures jusqu'au compte rendu signé, avec des objectifs STAT plus courts facultatifs. Les dossiers sont mesurés à partir de l'heure à laquelle ils ont été reçus. Un dossier encore ouvert au-delà d'un objectif affiche un badge dans la liste de travail. Une case STAT laissée vide utilise l'objectif standard.

**4. Prérequis et dépendances.** La liste **Ajouter** ne propose que les clients qui ont une Autorité d'attribution, qui ne sont pas Inactifs et qui n'ont pas déjà un niveau de service. Configurez d'abord les clients ([Configuration de l'établissement](#screen-clients)). Si vous l'omettez, l'écran indique « Every client already has a service level, or no clients are set up yet. »

Setup step: Tier 2, step 22
Requires: [Configuration de l'établissement](#screen-clients)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-client_sla - Tableau des niveaux de service par client et Ajouter un niveau de service client]

**6. Référence des champs.**

#### Tableau

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Client | Texte | Sans objet | Le nom du client. | Sans objet |
| Première prise en charge (heures) | Nombre supérieur à 0 | Obligatoire | Modifié dans le tableau. Enregistré lorsque vous quittez la case. Ne peut pas être plus long que le rapport signé. | Aucun |
| Rapport signé (heures) | Nombre supérieur à 0 | Obligatoire | | Aucun |
| STAT première prise en charge (heures) | Nombre supérieur à 0, ou vide | Facultatif | Vide, affiche « Comme habituel ». | Vide |
| STAT rapport signé (heures) | Nombre supérieur à 0, ou vide | Facultatif | Vide, affiche « Comme habituel ». | Vide |
| Actif | Case à cocher | Facultatif | | Activé |
| Supprimer | Bouton de ligne | Sans objet | | Sans objet |

#### Ajouter un niveau de service client

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Client | Liste de choix : « nom (autorité) » | Obligatoire | Uniquement les clients sans niveau. | Aucun |
| Première prise en charge (heures) | Nombre supérieur à 0 | Obligatoire | | Aucune |
| Rapport signé (heures) | Nombre supérieur à 0 | Obligatoire | | Aucun |
| Ajouter le niveau de service | Bouton | Sans objet | Refusé avec un motif si le client est absent, a déjà un niveau, si un objectif n'est pas supérieur à 0, ou si la première prise en charge est plus longue que le rapport signé. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, supprimer : `config:tat-targets:manage` (risque élevé, audité), la même capacité que l'onglet Configuration du TAT. Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut. Une personne qui ne l'a pas voit l'écran en lecture seule.

**Limites connues.** L'écran dispose d'un service de production et d'un contrat d'API. Une ancienne liste des écarts le décrit comme limité au navigateur. Un client sans Autorité d'attribution ne peut pas recevoir de niveau.

### Règles de déclenchement anormal {#screen-abnormal_trigger_rules}
Breadcrumb: Accueil > Configuration > Système > Références cliniques > Règles de déclenchement anormal

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Références cliniques**
**2. Élément de maintenance :** Règles de déclenchement anormal (titre de la page « Détection d'anomalies - Règles de déclenchement à haut risque »)

**3. Objectif métier et portée.** Détermine quels couples champ et valeur du synoptique signalent un dossier comme Anormal, Critique ou Malin. Une correspondance est toujours une suggestion que le pathologiste confirme ou conteste à la validation finale, jamais une détermination automatique. Un interrupteur en haut désactive la détection d'anomalies pour toute l'entreprise.

**4. Prérequis et dépendances.** Une règle peut porter de vrais codes SNOMED CT et ICD-O-3, qui ne sont utilisés que tant que la licence correspondante est activée et en cours de validité dans [Systèmes de codage](#screen-code_systems). Jusque-là, PathScribe rattache des codes de test clairement identifiés. L'interrupteur d'entreprise est un interrupteur général : tant qu'il est désactivé, aucun établissement ne peut activer la détection pour lui-même dans sa fiche du [Répertoire des établissements](#screen-facility-dictionary).

Setup step: Tier 2, step 23
Requires: [Systèmes de codage](#screen-code_systems)
Unlocks: Aucune.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-abnormal_trigger_rules - Liste des règles de déclenchement avec l'interrupteur d'entreprise]

**6. Référence des champs.**

#### Commandes de la page

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Activé à l'échelle de l'entreprise | Case à cocher | Facultatif | Désactivé, la détection d'anomalies est désactivée pour chaque établissement. Activé, chaque établissement exécutant reste libre de la restreindre pour lui-même. | Selon la configuration de l'entreprise |
| Filtre de laboratoire | Choix : Tous les laboratoires, Global uniquement, ou un laboratoire | Facultatif | | Tous les laboratoires |
| Colonnes | Libellé du champ, Valeur(s) de déclenchement, Gravité, Description, Laboratoire exécutant, Statut, Actions | Sans objet | | Sans objet |
| + Ajouter une règle de déclenchement | Bouton | Sans objet | | Sans objet |
| Modifier, Dupliquer, Désactiver, Activer | Boutons de ligne | Sans objet | | Sans objet |

#### Fenêtre d'ajout et de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Libellé du champ synoptique | Texte | Obligatoire | Par exemple Margin Status. Doit correspondre au libellé de la question du synoptique. Une règle par libellé au sein du laboratoire exécutant, ou au sein de Global. | Aucun |
| Valeur(s) de déclenchement | Texte, séparé par des virgules | Obligatoire | Par exemple Positive. Au moins une. | Aucune |
| Gravité | Choix : Anormal, Critique, Malin | Obligatoire | | Anormal |
| Description | Texte libre | Facultatif | Affichée au pathologiste comme motif de la suggestion. | Vide |
| Code SNOMED CT | Texte, de 6 à 18 chiffres | Facultatif | Issu de votre édition sous licence. | Vide |
| Terme SNOMED CT | Texte | Obligatoire lorsqu'un code est donné | Le terme tel qu'il figure dans votre édition. | Vide |
| Code ICD-O-3 | Texte de la forme 8500/3 | Facultatif | | Vide |
| Terme ICD-O-3 | Texte | Obligatoire lorsqu'un code est donné | | Vide |
| Laboratoire exécutant | Liste de choix : Global ou un laboratoire exécutant | Facultatif | | Global |
| Statut | Interrupteur Actif / Inactif | Facultatif | | Actif |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, désactiver : `config:abnormal-triggers:manage` (risque élevé, audité). La capacité appartient au groupe Qualité. Les rôles Administrateur, Directeur de laboratoire et Superadmin la détiennent par défaut.

**Limites connues.** Le libellé de champ de la règle est mis en correspondance comme du texte ; une question de synoptique renommée cesse donc de correspondre. L'interrupteur d'entreprise enregistre la configuration de l'entreprise. Quatre règles sont préchargées : Margin Status Positive, Perineural Invasion Present, Lymph Node Status Positive et Lymphovascular Invasion Present.

### [FORMEDRIXAI INTERNAL ONLY] Organismes de réglementation {#screen-governing_bodies}
Breadcrumb: Accueil > Configuration > Système > Références cliniques > Organismes de réglementation

> 🔒 **Paramètre restreint à usage interne ForMedrixAI**
> **Portée :** Personnel interne de service et de déploiement uniquement.
> **Explication :** Cette liste détermine quels organismes de normalisation sont en vigueur et pendant combien de temps chaque organisme indique que le matériel doit être conservé. Les durées de conservation qu'elle contient sont le plancher par rapport auquel la Dérogation de conservation de chaque service est contrôlée, et elles alimentent l'horloge de conservation des blocs, des lames et des tissus humides stockés. Une modification par un utilisateur final pourrait raccourcir une durée légale de conservation ou activer un organisme qui ne s'applique pas au pays du laboratoire ; la modification exige donc la capacité de plateforme `platform:governing-bodies:manage`, détenue uniquement par le Superadmin. Toutes les autres personnes voient la liste en lecture seule avec l'avis « Accès super-administrateur requis ».

**Statut :** Réalisé

**1. Navigation :** onglet Configuration **Système** > groupe **Références cliniques**
**2. Élément de maintenance :** Organismes de réglementation

**3. Objectif métier et portée.** Un organisme de réglementation est un organisme de normalisation ou de réglementation, tel que le CAP, le RCPath, l'ICCR, le RCPA, le CAP-ACP, l'UE (ISO 15189) ou le MSA coréen. Chaque organisme est activé ou désactivé, couvre certaines juridictions et conserve un historique en ajout seul de durées de conservation (jours pour les blocs, les lames et les tissus humides). Une durée de conservation n'est utilisée que si elle provient d'un organisme activé ayant au moins une version qui couvre la juridiction. Des organismes personnalisés peuvent être ajoutés.

**4. Prérequis et dépendances.** C'est un point de départ. Sans version de conservation sur un organisme activé pour la juridiction du laboratoire, il n'y a pas de plancher de conservation, et la dérogation de conservation d'un service n'est donc pas contrôlée. Les services le lisent ([Services](#screen-departments)). La variante de la CIM-10 des [Services de terminologie](#screen-terminology) suit les organismes actifs.

Setup step: Tier 2, step 1
Requires: Aucun, c'est un point de départ.
Unlocks: [Services](#screen-departments), [Services de terminologie](#screen-terminology)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-governing_bodies - Liste des organismes de réglementation avec les interrupteurs Actif et Synchronisation automatique]

**6. Référence des champs.**

#### Page de liste

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Organisme de réglementation | Texte | Sans objet | Abréviation et nom. | Sans objet |
| Région | Texte | Sans objet | Les juridictions que l'organisme couvre. | Sans objet |
| Actif | Interrupteur Oui/Non | Facultatif | Un organisme inactif ne donne aucune durée de conservation et est ignoré par l'aperçu des juridictions. | Voir les valeurs préchargées ci-dessous |
| Synchronisation automatique | Interrupteur Oui/Non | Facultatif | Désactivée tant que l'organisme n'est pas Actif. Enregistrée, mais rien ne la lit encore. | Voir les valeurs préchargées ci-dessous |
| Conservation, Modifier, supprimer (✕) | Boutons de ligne | Sans objet | Conservation ouvre la fenêtre de conservation. Seuls les organismes personnalisés peuvent être modifiés ou supprimés. | Sans objet |
| Ajouter un organisme personnalisé | Bouton | Sans objet | Affiché uniquement après une modification. | Sans objet |
| Enregistrer les modifications | Bouton | Sans objet | Affiché uniquement après une modification, à côté d'une marque « Modifications non enregistrées ». | Sans objet |
| Surveillance de la terminologie - Bientôt disponible | Avis | Sans objet | Une synchronisation nocturne du contenu SNOMED CT et CIM est Prévue. | Sans objet |

#### Fenêtre d'organisme personnalisé

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Abréviation | Texte | Obligatoire | Devient l'identifiant de l'organisme en majuscules. Ne peut plus être modifiée ensuite. Un conflit avec un identifiant existant est refusé. | Aucune |
| Nom complet | Texte | Obligatoire | | Aucun |
| Région | Texte | Facultatif | | Vide |
| Site Web | Texte | Facultatif | | Vide |

Un organisme personnalisé démarre activé avec la Synchronisation automatique désactivée.

#### Fenêtre de conservation

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| S'applique aux juridictions | Pastilles : US, CA, GB_EW, GB_SCT, GB_NIR, IE, AU, NZ, KR, BE, NL, DE, FR, ES | Facultatif | Les juridictions que l'organisme couvre. **Enregistrer les juridictions** conserve la modification. | Selon l'organisme |
| Historique des versions | Liste v1, v2, etc. | Sans objet | En ajout seul et immuable. | Sans objet |
| Nouvelle version : date d'entrée en vigueur | Date | Obligatoire | | Aujourd'hui |
| Nouvelle version : jours pour Bloc, Lame, Tissu humide | Nombres entiers supérieurs à 0 | Obligatoire, les trois | | Aucun |
| Nouvelle version : Source / Citation | Texte | Obligatoire | | Aucune |
| Appliquer rétroactivement à tout le matériel actuellement stocké et non éliminé | Case à cocher | Facultatif | Pour les modifications d'allongement uniquement. | Désactivé |
| Publier la nouvelle version | Bouton | Sans objet | Ajoute la version. | Sans objet |
| Effacer tout l'historique des versions | Bouton | Sans objet | Supprime l'historique. | Sans objet |

Organismes préchargés : CAP (US, activé, synchronisation activée), RCPath (GB_EW, GB_SCT, GB_NIR, activé, synchronisation activée), ICCR (activé, synchronisation activée, sans durées de conservation), RCPA (AU, NZ, désactivé), CAP-ACP (CA, activé, synchronisation désactivée), UE (ISO 15189 ; BE, NL, DE, FR, désactivé) et KR (MSA, désactivé).

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier et enregistrer : `platform:governing-bodies:manage` (plateforme uniquement, risque élevé). Le Superadmin la détient par défaut et aucun autre rôle intégré ne la détient.

**Limites connues.** La synchronisation automatique est enregistrée mais rien d'autre ne la lit, et la synchronisation nocturne des protocoles mentionnée dans le sous-titre de la page est Prévue. Chaque version de conservation enregistre son auteur comme « super-admin », quelle que soit la personne qui l'a publiée.
