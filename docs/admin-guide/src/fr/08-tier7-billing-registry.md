---
chapter: 8
id: ch8
title: Niveau 7 : facturation, gestion du cycle de revenus et déclaration aux registres
---

# Niveau 7 : facturation, gestion du cycle de revenus et déclaration aux registres {#ch8}

Ce chapitre explique comment PathScribe décide de ce qu'il facture, à quel moment des frais peuvent quitter le système et à quels registres du cancer et du dépistage un dossier est déclaré. Il traite aussi des références de paiement qu'utilise la charge utile des frais et de la page Journaux système où vous suivez les événements financiers.

Lisez d'abord ces trois points, car ils fixent ce que vous pouvez et ne pouvez pas attendre.

1. **Ce que PathScribe fait de l'argent.** PathScribe détermine chaque frais une seule fois, à la finalisation, sous la forme d'un enregistrement figé : code CPT ou HCPCS, unités de valeur relative (RVU) et modificateur. Il ne conserve aucun tarif. **Grilles tarifaires : Non réalisé.** Il n'existe aucun champ de montant en dollars, de prix ou de tarif de payeur dans les règles de facturation. La charge utile des frais ne contient aucun montant en dollars. Le remboursement est calculé par votre système de facturation ou par le moteur d'interfaces, pas par PathScribe.
2. **Ce que PathScribe fait des registres.** PathScribe décide si un dossier est à déclarer, vérifie les données obligatoires et construit une charge utile JSON structurée. Il n'écrit pas lui-même de XML NAACCR, de XML COSD ni aucun autre format d'échange de registre. Le moteur d'interfaces (celui de ForMedrixAI, livré avec PathScribe) traduit et transmet. Aucune spécification de registre du produit n'est confirmée par rapport à la spécification publiée par le registre lui-même, sauf si la section le dit.
3. **La plus grande partie de ce chapitre est en Démonstration aujourd'hui.** Le stockage de production est Microsoft SQL Server derrière une API ASP.NET Core. Les services qui sont derrière ces écrans sont des services de démonstration conservés dans le navigateur, et les contrats d'API de `docs/architecture` ne disent rien qui indique qu'ils aient été essayés avec un vrai serveur. Chaque écran porte son propre statut.

## Ordre de configuration du niveau 7

Configurez les écrans dans cet ordre. Le cadre « Ordre de configuration » de chaque écran indique ce qu'il exige.

1. [Dictionnaire des modificateurs CPT](#screen-modifier_dictionary) : la liste des modificateurs que propose le Dictionnaire de facturation.
2. [Table des codes RVU](#screen-rvu_code_map) : la liste des codes CPT et des valeurs relatives vers laquelle pointe chaque règle de facturation.
3. [Dictionnaire de facturation (saisie des frais)](#screen-billing_dictionary) : les règles de facturation versionnées.
4. [Règles d'édition NCCI (regroupement)](#screen-ncci_edit_rules) : les paires de regroupement (vous les téléversez ; aucune n'est fournie).
5. [Approbations de règles de facturation en attente](#screen-pending_approvals) : une seconde personne approuve les étapes 1 à 4 avant que quoi que ce soit prenne effet.
6. [Déclencheurs de libération des frais](#screen-billing_type_triggers) : l'étape du dossier à laquelle chaque type de facturation crée ses frais.
7. [Libération de la facturation](#screen-billing_release) : les règles de retenue et de lot pour les frais prêts.
8. [Dictionnaire principal des types de paiement](#screen-master_payment_types) : les catégories de paiement.
9. [Correspondance des paiements par juridiction](#screen-jurisdiction_payment_mappings) : les régimes de payeurs locaux associés à ces catégories.
10. [Aperçu de l'export de facturation](#screen-dft_export_preview) : vérifiez ce qu'enverrait un vrai dossier.
11. [Rapports du registre du cancer](#screen-cancer_registry_settings) : le registre par établissement et l'approbation de mise en production.
12. [Registre du cancer britannique (COSD)](#screen-cosd_destination) : paramètres de la destination pour l'Angleterre.
13. [Pathologie électronique (États-Unis)](#screen-us_epath) : profils d'États pour le flux ePath américain.
14. [Signalement au registre cytologique](#screen-cytology_registry) : paramètres du programme de dépistage du col de l'utérus.
15. [Fichiers de lot des registres](#screen-batch_registry_feed) : envois de fichiers aux registres.

L'[onglet financier des Journaux système](#screen-audit-financial) est une page de référence. Il ne fait pas partie de la configuration.

Non réalisés dans ce chapitre : les grilles tarifaires, les suggestions de facturation par IA ou en langage naturel à partir du texte du compte rendu, le X12 837P, les sorties KVDT et SESAM-Vitale, les fichiers de lots XML NAACCR, ainsi que la déclaration de qualité MIPS et MACRA.

## Architecture du moteur de facturation {#ch8-billing-architecture}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus

**Comment des frais sont modélisés.** PathScribe répartit des frais en une composante technique, une composante professionnelle, ou les deux ensemble. Le produit appelle ces éléments des types de facturation :

| Type de facturation | Libellé à l'écran | Ce qu'il couvre | Modificateur appliqué |
|---|---|---|---|
| TC | Technique (TC) | Travail de laboratoire : macroscopie, traitement, lames, colorations | `-TC` |
| 26 | Professionnel (26 Prof.) | L'interprétation du pathologiste | `-26` |
| Global | Combiné (Global) | Les deux parties facturées ensemble | Aucun |

PathScribe applique le modificateur d'après le type de facturation, sans exception : TC prend `-TC`, 26 prend `-26`, Global n'en prend aucun. Les autres modificateurs sont purement informatifs.

**Quand des frais sont créés.** Par défaut, la composante technique est créée lorsque le prélèvement est dégrossi. Les composantes professionnelle et globale sont créées à la validation finale. Vous pouvez modifier cela pour toute l'entreprise ou pour un seul site dans [Déclencheurs de libération des frais](#screen-billing_type_triggers).

**Les frais sont figés une fois créés.** À la finalisation, PathScribe détermine les frais une seule fois sous la forme d'un enregistrement de frais immuable qui conserve un instantané du CPT, du HCPCS, des RVU et du modificateur. Les modifications ultérieures d'une règle de facturation ne changent pas des frais déjà créés. Une correction après la validation passe par une paire avoir et refacturation, pas par une modification.

**Les règles de facturation sont versionnées.** Une règle de facturation est identifiée par le code de facturation, le périmètre et la version. Les versions sont uniquement ajoutées. Les statuts sont DRAFT, PENDING_APPROVAL, ACTIVE, REJECTED et RETIRED. La personne qui rédige ou soumet une version ne peut pas l'approuver (le principe des quatre yeux, appliqué dans les services). À l'approbation, la nouvelle version prend effet et la version qu'elle remplace prend fin.

**Périmètre.** Une règle s'applique à toute l'entreprise ou à un seul Site. Le mot Site est utilisé sur ces écrans, pas Établissement.

**Dossiers partagés entre laboratoires.** Lorsque la composante technique est réalisée dans un autre laboratoire que la lecture professionnelle, le dossier porte un établissement de composante technique et l'établissement exécutant. La décision de libération vérifie ce point (voir [Libération de la facturation](#screen-billing_release)).

**Où vont les frais.** Les frais prêts vont dans la file d'envoi. Des frais au statut PENDING_APPROVAL ou HOLD sont ignorés par le balayage d'envoi. Le moteur d'interfaces assure le transport, la traduction et les nouvelles tentatives. PathScribe décide seulement de ce qui est libéré et du moment.

**Approbation facultative des frais.** Des frais peuvent être retenus pour approbation. La capacité d'approbation `billing:charge:approve` est vérifiée par laboratoire exécutant. Elle figure dans le catalogue des capacités, mais aucun rôle intégré ne la détient par défaut ; attribuez-la donc par [Rôles](#screen-staff-roles) si vous utilisez l'approbation des frais.

### Déclencheurs de libération des frais (TC/26/Global) {#screen-billing_type_triggers}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus > Déclencheurs de libération des frais (TC/26/Global)

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Références financières et de revenus**
**2. Élément de maintenance :** Déclencheurs de libération des frais (TC/26/Global)

**3. Objectif métier et périmètre.** Définit l'étape du dossier à laquelle chaque type de facturation crée ses frais. Les valeurs par défaut sont : TC au dégrossissage du prélèvement, 26 et Global à la validation du dossier. Vous pouvez remplacer une valeur par défaut pour toute l'entreprise ou pour un seul site. Un site sans remplacement propre utilise le paramètre de l'entreprise.

**4. Prérequis et dépendances.** Un remplacement de site ne peut être défini que pour un site existant ; configurez donc d'abord les établissements. Sans site dans la liste, vous pouvez quand même définir des déclencheurs pour toute l'entreprise.

Setup step: Tier 7, step 6
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: [Libération de la facturation](#screen-billing_release)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-billing_type_triggers - Déclencheurs de libération des frais avec une liste d'étapes par type de facturation]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Sélecteur de périmètre | Choix : Entreprise ou un Site | Obligatoire | Choisit les déclencheurs que vous consultez et modifiez. | Entreprise |
| Déclencheur technique (TC) | Choix d'étapes du dossier | Obligatoire | L'étape à laquelle les frais techniques sont créés. L'enregistrement de la liste déroulante est immédiat. | Prélèvement dégrossi (`SPECIMEN_GROSSED`) |
| Déclencheur professionnel (26 Prof.) | Choix d'étapes du dossier | Obligatoire | L'étape à laquelle les frais professionnels sont créés. Enregistrement immédiat. | Dossier validé (`CASE_SIGNED_OUT`) |
| Déclencheur combiné (Global) | Choix d'étapes du dossier | Obligatoire | L'étape à laquelle les frais globaux sont créés. Enregistrement immédiat. | Dossier validé (`CASE_SIGNED_OUT`) |
| Rétablir les valeurs par défaut | Bouton | Facultatif | Supprime le remplacement pour le périmètre choisi et le ramène à la valeur par défaut intégrée. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:billing-triggers:manage`. Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut. Chaque modification écrit un événement d'audit (« Charge release trigger changed », « Charge release triggers reset to default »).

**Limites connues.** Démonstration : service de démonstration uniquement. Une modification de déclencheur concerne les frais créés à partir de ce moment et ne change pas les frais déjà créés.

## Règles de saisie des frais, correspondance CPT/HCPCS et grilles tarifaires {#ch8-charge-capture}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus

**Grilles tarifaires : Non réalisé.** Le plan demande des grilles tarifaires. Il n'existe aucun écran, contrat ni champ pour un montant en dollars, un prix ou un tarif propre à un payeur. Une règle de facturation ne porte que le code CPT, le code HCPCS et les valeurs RVU de travail, de charges d'exploitation (PE) et de responsabilité civile (MP). Les éléments les plus proches qui existent sont les valeurs RVU du [Dictionnaire de facturation](#screen-billing_dictionary) et de la [Table des codes RVU](#screen-rvu_code_map). Le contrôle appelé `ZERO_FEE_MAPPING_ERROR` est libellé comme un contrôle de tarif, mais il recherche des frais déterminés avec zéro RVU pour le travail, les PE et les MP et sans avis de suppression.

**Chargement en masse de codes.** Pour charger en masse des listes de codes CPT, HCPCS ou autres, utilisez [Import de codes (en masse)](#screen-code_import). Il est documenté avec les autres références.

**Codage automatique.** Voir le paragraphe sur le statut sous [Moteur de codage automatique et règles de retenue de facturation](#ch8-autocoding-holds).

### Dictionnaire des modificateurs CPT {#screen-modifier_dictionary}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus > Dictionnaire des modificateurs CPT

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Références financières et de revenus**
**2. Élément de maintenance :** Dictionnaire des modificateurs CPT

**3. Objectif métier et périmètre.** La liste des codes de modificateurs CPT (par exemple 26, TC, 59, XS) que propose l'onglet Règles de codage du Dictionnaire de facturation. Les modificateurs saisis ici sont informatifs. PathScribe ne vérifie ni n'ajoute aucun modificateur autre que la règle fixe TC et 26 décrite dans l'introduction du chapitre.

Les descriptions fournies sont des espaces réservés tels que « Modificateur 59 », marqués synthétiques, car le texte de l'American Medical Association (AMA) est soumis à licence. Si vous détenez une licence, chargez vos propres descriptions.

**4. Prérequis et dépendances.** C'est un point de départ. Chaque modification devient une nouvelle version en attente d'approbation ; une seconde personne disposant des droits d'approbation est donc nécessaire avant qu'une modification prenne effet.

Setup step: Tier 7, step 1
Requires: Aucun, c'est un point de départ.
Unlocks: [Dictionnaire de facturation (saisie des frais)](#screen-billing_dictionary), [Approbations de règles de facturation en attente](#screen-pending_approvals)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-modifier_dictionary - Dictionnaire des modificateurs CPT avec la version active et la liste des codes]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Libellé de la version | Texte, lecture seule | Sans objet | La version active du dictionnaire. Identifiant de version fournie `modifier-v-seed-2026`. Une seconde version sous licence, en attente, est également fournie. | Version fournie |
| Code | Texte, lecture seule | Sans objet | Le code du modificateur. Fournis : 26, TC, 22, 52, 53, 59, XE, XS, XP, XU, 76, 77, 90, 91, 92 (15 codes). | 15 codes fournis |
| Description | Texte | Obligatoire lors de la modification d'une ligne | La description affichée au personnel. L'enregistrement crée une nouvelle version au statut PENDING_APPROVAL ; elle n'est jamais activée automatiquement. | « Modificateur {code} » (synthétique) |
| Statut de la licence | Texte, lecture seule | Sans objet | Affiche `synthetic` pour les espaces réservés fournis. | synthetic |
| Téléverser un CSV | Fichier, CSV | Facultatif | Remplace le dictionnaire à partir d'un fichier comportant les colonnes Code et Description. Modèle : `ModifierDictionaryTemplate.csv`. Crée une version en attente. | Aucun |
| Confirmation de la licence | Case à cocher | Obligatoire pour téléverser | Vous confirmez détenir le droit d'utiliser les descriptions téléversées. Le téléversement n'a pas lieu sans cette confirmation. | Non cochée |
| Libellé de la version pour le téléversement | Texte | Facultatif | Donne un nom à la version en attente. | Aucun |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Créer ou modifier : `config:billing-modifiers:manage`. Approuver, rejeter ou activer une version : `config:billing-tables:approve`, utilisée dans [Approbations de règles de facturation en attente](#screen-pending_approvals). Les rôles Administrateur et Directeur de laboratoire détiennent les deux par défaut. La personne qui a soumis une version ne peut pas l'approuver.

**Limites connues.** Le dictionnaire n'est qu'une liste. Aucun écran ni aucun contrôle n'impose un modificateur sur des frais. Le texte fourni est synthétique.

### Table des codes RVU (productivité) {#screen-rvu_code_map}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus > Table des codes RVU (productivité)

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Références financières et de revenus**
**2. Élément de maintenance :** Table des codes RVU (productivité)

**3. Objectif métier et périmètre.** Une petite liste choisie de codes CPT avec leurs unités de valeur relative, utilisée pour la productivité des pathologistes (RVU de travail) et comme liste source dans laquelle le Dictionnaire de facturation choisit les codes CPT. Ce n'est pas un système de facturation et elle ne contient aucun montant en dollars. Les données fournies sont un sous-ensemble du fichier de valeurs relatives du barème des honoraires médicaux 2026 du CMS, intitulé « CMS 2026 (April update) » (identifiant de version `rvu-v-seed-2026`). Plusieurs lignes n'ont pas de RVU de travail et s'affichent comme Non vérifié.

**4. Prérequis et dépendances.** C'est un point de départ. Une version en attente ou rejetée n'est jamais utilisée pour déterminer des frais ; rien de ce que vous téléversez ne compte donc tant qu'une seconde personne ne l'a pas approuvé.

Setup step: Tier 7, step 2
Requires: Aucun, c'est un point de départ.
Unlocks: [Dictionnaire de facturation (saisie des frais)](#screen-billing_dictionary), [Approbations de règles de facturation en attente](#screen-pending_approvals)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-rvu_code_map - Table des codes RVU avec téléversement et modification]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Version | Texte, lecture seule | Sans objet | Le libellé de la version active. | CMS 2026 (April update) |
| Rechercher | Texte | Facultatif | Filtre le tableau. | Aucun |
| Téléverser un CSV | Fichier, CSV | Facultatif | Colonnes : Code ou HCPCS, Description, WorkRVU. Respecte le code de statut du CMS (seules les lignes A, R et T sont payables) et ignore les lignes de modificateurs. Les lignes téléversées voient leur niveau déduit de la description (prélèvement par défaut) et le type de facturation Global. Crée une version en attente. Modèle : `RvuCodeMapTemplate.csv`. | Aucun |
| Libellé de la version pour le téléversement | Texte | Facultatif | Donne un nom à la version en attente. | Aucun |

#### Fenêtre de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Code | Texte | Obligatoire | Le code CPT. Verrouillé lorsque vous modifiez une ligne existante. Un code en double est refusé. | Aucun |
| Code de facturation | Texte | Obligatoire | Le code de facturation PathScribe. Verrouillé lors de la modification. | Aucun |
| Description | Texte | Facultatif | Description en clair. | Aucun |
| Niveau | Choix : prélèvement, bloc, coloration, décantation | Obligatoire | L'élément auquel le code est rapporté. | prélèvement |
| Type de composante | Choix : TC, 26, Global | Obligatoire | Le type de facturation auquel cette ligne s'applique. | Global |
| RVU de travail | Nombre positif | Facultatif | Laissez vide pour marquer la ligne Non vérifié. | Vide |
| RVU PE | Nombre | Facultatif | RVU des charges d'exploitation. | Vide |
| RVU MP | Nombre | Facultatif | RVU de responsabilité civile. | Vide |
| HCPCS | Texte | Facultatif | Code de niveau II, s'il y en a un. | Vide |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier ou téléverser : `config:billing-rvu:manage`. Approuver : `config:billing-tables:approve`. Les rôles Administrateur et Directeur de laboratoire détiennent les deux par défaut. Le principe des quatre yeux s'applique.

**Limites connues.** La liste est un sous-ensemble choisi, pas le fichier complet du CMS. La sélection du code de base au niveau du prélèvement (88302, 88305, 88309) ne peut pas être déduite des données du dossier ; elle n'est donc pas automatique.

### Dictionnaire de facturation (saisie des frais) {#screen-billing_dictionary}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus > Dictionnaire de facturation (saisie des frais)

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Références financières et de revenus**
**2. Élément de maintenance :** Dictionnaire de facturation (saisie des frais)

**3. Objectif métier et périmètre.** La liste versionnée des règles de facturation. Chaque règle relie un code de facturation PathScribe à un code CPT, à un code HCPCS facultatif, à un type de facturation et à des valeurs RVU, pour l'entreprise ou pour un seul site. Une substitution de site remplace la règle de l'entreprise pour ce site. Les frais sont déterminés à partir de ces règles lorsqu'un dossier est finalisé.

**4. Prérequis et dépendances.** Le sélecteur CPT lit la Table des codes RVU et les cases à cocher des modificateurs lisent le Dictionnaire des modificateurs CPT. Si vous les ignorez, la recherche CPT est vide et aucun modificateur n'est proposé.

Setup step: Tier 7, step 3
Requires: [Table des codes RVU](#screen-rvu_code_map), [Dictionnaire des modificateurs CPT](#screen-modifier_dictionary)
Unlocks: [Approbations de règles de facturation en attente](#screen-pending_approvals), [Libération de la facturation](#screen-billing_release)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-billing_dictionary - Tableau du Dictionnaire de facturation avec sélecteur de site]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Consultation | Choix : Entreprise ou un Site | Obligatoire | Les règles de qui le tableau affiche. | Entreprise |
| Code de facturation | Texte, colonne | Sans objet | Le code de facturation PathScribe. | Aucun |
| CPT | Texte, colonne | Sans objet | Le code CPT. | Aucun |
| Description | Texte, colonne | Sans objet | La description de la règle. | Aucun |
| RVU (Travail) | Nombre, colonne | Sans objet | RVU de travail. Un indicateur « Table des codes : N » s'affiche lorsque le RVU enregistré diffère de la Table des codes RVU. | Aucun |
| Date d'effet | Date, colonne | Sans objet | La date de début de la version active. | Aucun |
| Périmètre | Texte, colonne | Sans objet | À l'échelle de l'entreprise, Substitution de site ou Hérité. | Aucun |
| Statut | Texte, colonne | Sans objet | Le statut de la version. | Aucun |
| Versions | Nombre, colonne | Sans objet | Le nombre de versions existantes. | Aucun |
| Actions | Boutons | Facultatif | Historique, Dupliquer, Nouvelle version. | Sans objet |

#### Fenêtre Nouvelle version, onglet Facturation et RVU

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Code de facturation | Texte | Obligatoire pour un nouveau code | Le code auquel cette règle appartient. | Aucun |
| Périmètre | Choix : Entreprise ou un Site | Obligatoire | Là où la règle s'applique. | Le périmètre consulté |
| Pays | Choix : US, UK, AU, CA, les 27 États de l'UE, NZ | Facultatif | Le pays auquel le code est destiné. | Aucun |
| Code HCPCS | Recherche | Facultatif | Recherche dans le dictionnaire HCPCS de niveau II du domaine public intégré. | Vide |
| Code CPT | Recherche dans les entrées de la Table des codes RVU | Obligatoire | Le code CPT à facturer. | Aucun |
| Description | Texte | Facultatif | Description de la règle. | Vide |
| Niveau | Choix : prélèvement, bloc, coloration, décantation | Obligatoire | L'élément auquel le code est rapporté. | prélèvement |
| Type de composante | Choix : TC, 26, Global | Obligatoire | Le type de facturation. | Global |
| RVU de travail, PE, MP | Nombres | Facultatif | Les trois valeurs RVU. | Vide |
| Date d'effet | Date | Obligatoire | Date de début de la version. | Aucun |
| Motif du changement | Texte | Obligatoire lorsque le périmètre a déjà des versions | Conservé avec la version pour l'audit. | Vide |
| Notes | Texte | Facultatif | Notes libres. | Vide |

#### Fenêtre Nouvelle version, onglet Règles de codage

Ces éléments sont informatifs et ne sont jamais appliqués.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Modificateurs généralement associés | Cases à cocher issues du Dictionnaire des modificateurs CPT | Facultatif | Rappel des modificateurs qui accompagnent souvent ce code. | Aucune cochée |
| Règle de quantité | Texte | Facultatif | Conseil sur les unités. | Vide |
| Règle de regroupement | Texte | Facultatif | Conseil sur le regroupement. Les paires NCCI sont conservées dans [Règles d'édition NCCI](#screen-ncci_edit_rules). | Vide |
| Exigences de documentation | Texte séparé par des virgules | Facultatif | Ce que le dossier devrait montrer. | Vide |
| Avis de suppression | Texte | Facultatif | Indique qu'une règle à zéro RVU est voulue, afin que le contrôle de tarif nul reste silencieux. | Vide |

#### Fenêtre Historique

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Version | Nombre, colonne | Sans objet | Numéro de version. | Aucun |
| CPT | Texte, colonne | Sans objet | Le CPT de cette version. | Aucun |
| RVU (Travail) | Nombre, colonne | Sans objet | RVU de travail. | Aucun |
| Date d'effet, Date de fin | Dates, colonnes | Sans objet | La période pendant laquelle la version s'est appliquée. | Aucun |
| Statut | Texte, colonne | Sans objet | DRAFT, PENDING_APPROVAL, ACTIVE, REJECTED ou RETIRED. | Aucun |
| Motif du changement | Texte, colonne | Sans objet | Le motif saisi. | Aucun |
| Actions | Boutons | Facultatif | Dupliquer. Soumettre pour approbation (versions DRAFT). Retirer (versions ACTIVE). | Sans objet |

Une nouvelle version est toujours enregistrée en DRAFT. **Soumettre pour approbation** la fait passer à PENDING_APPROVAL.

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Créer, soumettre et retirer : `config:billing-rules:manage`. Approuver ou rejeter : `config:billing-tables:approve`. Les rôles Administrateur et Directeur de laboratoire détiennent les deux par défaut. Des événements d'audit sont écrits pour les soumissions, approbations et rejets (« Billing rule submitted for approval »).

**Limites connues.** Il n'existe aucun champ de prix ou de tarif (voir Grilles tarifaires ci-dessus). Les règles de codage sont de simples conseils.
## Moteur de codage automatique et règles de retenue de facturation {#ch8-autocoding-holds}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus

**Moteur de codage automatique : Partiel.** Ce qui est réalisé repose sur des règles et est toujours confirmé par une personne :

- Des codes suggérés à partir des données structurées du dossier : catégories de colorations, 88312 pour une coloration spéciale, 88342 et +88341 pour l'immunohistochimie par prélèvement, et 88331 ou 88332 pour une coupe congelée.
- Une liste de repli de codes par défaut. Elle n'est pas prête pour la facturation.
- La saisie manuelle de codes dans la fenêtre des codes et dans le panneau de révision de la facturation.

**Non réalisé :** les suggestions issues du texte du compte rendu par IA ou par traitement du langage naturel. Ce travail dépend de l'avis des juristes et de la conformité. Les codes de base des prélèvements (88302, 88305, 88309) ne sont pas déterminés automatiquement. L'écran de configuration le plus proche est [Smart Capture](#screen-smart_capture).

**Contrôles de facturation à la validation.** À la validation, PathScribe exécute six contrôles et enregistre une non-conformité pour chaque constat :

| Déclencheur | Code | Gravité |
|---|---|---|
| A | `UNSUPPORTED_CPT_LEVEL` | COMPLIANCE_WARNING |
| B | `NCCI_BUNDLING_VIOLATION` (uniquement les paires dont l'indicateur de modificateur est 0) | CRITICAL_REJECTION_RISK |
| C | `MISSING_DIAGNOSTIC_ICD10` | CRITICAL_REJECTION_RISK |
| D | `UNATTACHED_ANCILLARY_ORDER` | COMPLIANCE_WARNING |
| E | `MODIFIER_MISMATCH` | CRITICAL_REJECTION_RISK |
| F | `ZERO_FEE_MAPPING_ERROR` | REVENUE_LEAKAGE |

`MISSING_CHARGE`, `POST_SIGNOUT_CORRECTION` et `BLOCK_DELETED` sont levés en dehors de la validation. Ces contrôles n'empêchent jamais le pathologiste de valider. Une notification indique que des éléments de facturation ont été signalés à l'AQ et les constats vont à l'AQ. Ils bloquent en revanche l'export : un dossier ne peut pas être exporté tant qu'une non-conformité est OPEN ou UNDER_REVIEW. Les statuts sont OPEN, UNDER_REVIEW, RESOLVED et OVERRIDDEN_WITH_JUSTIFICATION.

### Règles d'édition NCCI (regroupement) {#screen-ncci_edit_rules}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus > Règles d'édition NCCI (regroupement)

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Références financières et de revenus**
**2. Élément de maintenance :** Règles d'édition NCCI (regroupement)

**3. Objectif métier et périmètre.** Conserve les paires acte-acte de la National Correct Coding Initiative (NCCI) : un code de la colonne 1 et un code de la colonne 2 qui ne peuvent pas être facturés ensemble. Une paire dont l'indicateur de modificateur est 0 lève une non-conformité à la validation. Les vraies données du CMS ne sont pas fournies. Les données fournies sont une paire synthétique (88305 avec 88300, indicateur 0, trimestre `DEMO`) et l'écran affiche un avertissement. Le titulaire de la licence téléverse le CSV.

**4. Prérequis et dépendances.** C'est un point de départ. Un téléversement ou une modification devient un import en attente ; une approbation est donc nécessaire avant que les paires soient utilisées.

Setup step: Tier 7, step 4
Requires: Aucun, c'est un point de départ.
Unlocks: [Approbations de règles de facturation en attente](#screen-pending_approvals)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-ncci_edit_rules - Règles d'édition NCCI avec l'avertissement sur les données synthétiques et le tableau des paires]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Version du trimestre | Texte, par exemple `2026Q3` | Obligatoire pour téléverser | Donne un nom à l'import. | Aucun |
| Téléverser un CSV | Fichier, CSV | Facultatif | Colonnes : Column 1, Column 2, Indicateur de modificateur (0, 1 ou 9), Date d'entrée en vigueur, Date de suppression. Modèle : `NcciPtpEditTemplate.csv`. Crée un import en attente. | Aucun |
| Tableau des paires | Tableau, lecture seule | Sans objet | Column 1, Column 2, indicateur, dates de l'import actif. | Une paire synthétique |
| Avertissement sur les données synthétiques | Avis | Sans objet | Affiché tant que l'import actif est le jeu synthétique fourni. | Affiché |

#### Fenêtre de modification

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Indicateur de modificateur | Choix : 0 jamais contournable, 1 contournable avec un modificateur, 9 l'édition ne s'applique pas | Obligatoire | Seules les paires 0 lèvent une non-conformité à la validation. | Valeur actuelle |
| Date de suppression | Date | Facultatif | La date à laquelle la paire cesse de s'appliquer. | Vide |

Chaque modification renvoie le tableau entier comme un nouvel import PENDING_APPROVAL nommé « Manual edit » avec la paire.

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Téléverser ou modifier : `config:billing-ncci:manage`. Approuver : `config:billing-tables:approve`. Les rôles Administrateur et Directeur de laboratoire détiennent les deux par défaut.

**Limites connues.** Aucune donnée NCCI réelle n'est fournie. Les indicateurs 1 et 9 ne lèvent pas de non-conformité.

### Approbations de règles de facturation en attente {#screen-pending_approvals}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus > Approbations de règles de facturation en attente

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Références financières et de revenus**
**2. Élément de maintenance :** Approbations de règles de facturation en attente

**3. Objectif métier et périmètre.** La file d'approbation par une seconde personne. Les versions de règles de facturation, les versions du dictionnaire des modificateurs, les imports NCCI, les versions RVU et les tâches d'import de codes y attendent. Rien ne prend effet tant qu'une personne autre que celle qui l'a soumis ne l'a pas approuvé.

**4. Prérequis et dépendances.** La file n'affiche que les éléments soumis par les écrans précédents. La personne qui approuve a besoin de la capacité d'approbation et ne doit pas être celle qui a soumis l'élément.

Setup step: Tier 7, step 5
Requires: [Dictionnaire des modificateurs CPT](#screen-modifier_dictionary), [Table des codes RVU](#screen-rvu_code_map), [Dictionnaire de facturation (saisie des frais)](#screen-billing_dictionary), [Règles d'édition NCCI](#screen-ncci_edit_rules)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-pending_approvals - Tableaux Approbations de règles de facturation en attente et Mises à jour de dictionnaire en attente]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Code de facturation | Texte, colonne | Sans objet | Tableau des règles : le code de la règle. | Aucun |
| CPT | Texte, colonne | Sans objet | Tableau des règles. | Aucun |
| RVU (Travail) | Nombre, colonne | Sans objet | Tableau des règles. | Aucun |
| Date d'effet | Date, colonne | Sans objet | Tableau des règles. | Aucun |
| Périmètre | Texte, colonne | Sans objet | Tableau des règles. | Aucun |
| Rédigé par | Texte, colonne | Sans objet | Tableau des règles : la personne qui a rédigé. | Aucun |
| Soumis par | Texte, colonne | Sans objet | Tableau des règles : la personne qui a soumis. | Aucun |
| Motif du changement | Texte, colonne | Sans objet | Tableau des règles. | Aucun |
| Dictionnaire | Texte, colonne | Sans objet | Tableau des dictionnaires : quel dictionnaire (import de codes, modificateurs, NCCI, RVU). | Aucun |
| Étiquette | Texte, colonne | Sans objet | Tableau des dictionnaires : libellé de la version ou de la tâche. | Aucun |
| Approuver | Bouton | Facultatif | Active l'élément. Pour un import de codes, applique toute la tâche. Si vous l'avez soumis, le bouton est verrouillé et une indication en explique la raison. | Sans objet |
| Refuser | Bouton | Facultatif | Ouvre une zone de motif ; **Confirmer le rejet** met fin à l'élément. | Sans objet |
| Motif du rejet | Texte | Obligatoire pour rejeter | Conservé avec la décision. | Vide |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Approuver et rejeter : `config:billing-tables:approve`. Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut. Les décisions écrivent des événements d'audit.

**Limites connues.** Dans un système à une seule personne, personne ne peut approuver, car la personne qui a soumis un élément ne peut pas l'approuver elle-même.

### Libération de la facturation {#screen-billing_release}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Libération de la facturation

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Administration et conformité**
**2. Élément de maintenance :** Libération de la facturation

**3. Objectif métier et périmètre.** Les règles de retenue. Chaque règle indique quels frais elle concerne et ce qu'il faut en faire : les libérer immédiatement, les retenir pendant un certain temps ou les libérer dans un lot planifié, avec ou sans révision manuelle. La règle correspondante la plus précise l'emporte. PathScribe décide du quoi et du quand. Le moteur d'interfaces transporte le message.

**Points de spécificité :** établissement 100, type de facturation 8, types de dossier 4, site demandeur 4, pathologiste 2, modification 1.

**Quand aucune règle ne correspond :** libération à l'étape, révision manuelle activée, libération automatique activée.

**S'applique toujours :** un changement de type modification est mis de côté pour révision ; des frais dont le CPT n'a pas de correspondance sont mis de côté (`unmappedCpt`) ; un dossier partagé sans établissement technique est mis de côté (`missingTechnicalFacility`).

**4. Prérequis et dépendances.** Une règle peut nommer un établissement ou un site demandeur ; configurez-les donc d'abord. Un lot planifié est envoyé selon un calendrier défini dans Horaires d'envoi.

Setup step: Tier 7, step 7
Requires: [Dictionnaire des établissements](#screen-facility-dictionary), [Déclencheurs de libération des frais](#screen-billing_type_triggers), [Horaires d'envoi](#screen-delivery_schedules)
Unlocks: [Aperçu de l'export de facturation](#screen-dft_export_preview)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-billing_release - Liste des règles de libération de la facturation avec le panneau Essayer un frais]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Type de facturation | Choix : TC, 26, Global, tous | Obligatoire | Critère. | tous |
| Types de dossier | Liste séparée par des virgules | Facultatif | Critère. | Vide (tous) |
| Site demandeur | Choix de sites | Facultatif | Critère. | Tout |
| Pathologiste principal | Choix de membres du personnel | Facultatif | Critère. | Tout |
| Modification | Choix : tous, original, modifié | Obligatoire | Critère. | tous |
| Mode de libération | Choix : DYNAMIC_WITH_HOLD, SCHEDULED_BATCH | Obligatoire | Libération après une retenue, ou au lot suivant. | DYNAMIC_WITH_HOLD |
| Durée de retenue (minutes) | Nombre entier, de 0 à 43 200 | Obligatoire pour une retenue | La durée de retenue avant la libération. | 0 |
| Planification du lot | Paramètres de planification | Obligatoire pour un lot | L'éditeur démarre sur chaque semaine, du lundi au vendredi, 22:00, America/New_York. | Voir ci-contre |
| Libération automatique à l'échéance | Oui/Non | Facultatif | Libérer à la fin de la retenue. | Activé |
| Révision manuelle requise | Oui/Non | Facultatif | Une personne révise avant la libération. | Activé |
| Essayer un frais | Panneau de test | Facultatif | Exécute la décision pour un exemple de frais et affiche la règle qui a correspondu. | Sans objet |

Les contrôles de règle lèvent ces codes de problème : `billingTypeInvalid`, `modeInvalid`, `holdInvalid`, `batchRequired`, `amendmentInvalid`, `caseTypesInvalid`. Trois règles d'entreprise (TC, 26, Global) sont fournies, chacune DYNAMIC_WITH_HOLD, 0 minute, libération automatique activée, révision manuelle activée.

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:billing-release:manage`. Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut. Les enregistrements sont audités. Libérer, retenir, rappeler et renvoyer des messages sont des capacités d'interface distinctes (`interface:outbound:release`, `hold`, `retract`, `resend`), détenues par l'Administrateur.

**Limites connues.** Relié à la file d'envoi dans le service de démonstration uniquement.

### Aperçu de l'export de facturation {#screen-dft_export_preview}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus > Aperçu de l'export de facturation

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Références financières et de revenus**
**2. Élément de maintenance :** Aperçu de l'export de facturation

**3. Objectif métier et périmètre.** Recherchez un dossier et voyez ce que PathScribe enverrait à la facturation. La charge utile JSON est ce que PathScribe envoie. Le texte HL7 DFT^P03 est un aperçu de ce que le moteur d'interfaces construirait. PathScribe ne produit ni n'envoie de HL7. Le X12 837P, le KVDT et le SESAM-Vitale n'existent pas.

**4. Prérequis et dépendances.** Il vous faut un dossier finalisé avec des frais. Si le dossier a une non-conformité de facturation ouverte, l'export est bloqué.

Setup step: Tier 7, step 10
Requires: [Dictionnaire de facturation (saisie des frais)](#screen-billing_dictionary), [Libération de la facturation](#screen-billing_release), [Correspondance des paiements par juridiction](#screen-jurisdiction_payment_mappings)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-dft_export_preview - Aperçu de l'export de facturation avec la charge utile JSON et l'aperçu HL7]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Identifiant du dossier ou numéro d'accession | Texte | Obligatoire | Le dossier à prévisualiser. | Vide |
| Charge utile JSON | Texte, lecture seule | Sans objet | La charge utile du webhook plus la classe financière. | Aucun |
| Aperçu HL7 DFT^P03 | Texte, lecture seule | Sans objet | Illustration uniquement. | Aucun |
| Envoyer au moteur de facturation | Bouton | Facultatif | Envoie au moteur simulé (badge « Simulé »). Bloqué tant qu'une non-conformité est ouverte. | Sans objet |
| Envoyer la classe financière (aperçu) | Bouton | Facultatif | Affiche la charge utile de la classe financière. | Sans objet |

**7. Autorisations.** Ouvrir et utiliser : `config:interface-preview:view`. Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut.

**Limites connues.** L'envoi est simulé. Aucun vrai moteur de facturation n'est connecté.

## Configuration du registre du cancer {#ch8-cancer-registry}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire

**Ce qui existe.** PathScribe compte 14 définitions de registres du cancer et 12 définitions de registres de dépistage du col de l'utérus. Chaque registre du cancer est marqué `configurable`, ce qui signifie que la spécification n'est pas vérifiée par rapport à la spécification publiée par le registre. Parmi les registres de dépistage, trois sont marqués vérifiés : le système britannique de gestion du dépistage du col de l'utérus (CSMS), PALGA aux Pays-Bas et le Registre national australien de dépistage du cancer (NCSR).

| Identifiant du registre du cancer | Format d'échange nommé |
|---|---|
| `naaccr_us` | NAACCR XML |
| `epath_npcr_us` | HL7 v2 ORU |
| `cpac_canada` | NAACCR XML |
| `cosd_uk` | COSD XML (GB_EW) |
| `phs_scotland` | HL7 v2 ORU |
| `nicr_northern_ireland` | HL7 v2 ORU |
| `ncri_ireland` | HL7 v2 ORU |
| `nkr_netherlands` | Protocole PALGA |
| `inca_france` | CDA CR-ACP |
| `adt_gekid_germany` | oBDS XML |
| `bcr_belgium` | HD-S4S JSON |
| `aihw_australia` | HL7 v2 ORU |
| `nz_cancer_registry` | HL7 v2 ORU |
| `kccr_korea` | HL7 v2 ORU |

**Ce que signifie chaque format aujourd'hui.** PathScribe construit une charge utile JSON structurée. Le format nommé est la cible vers laquelle le moteur d'interfaces traduirait. PathScribe n'écrit ni NAACCR XML, ni COSD XML, ni oBDS, ni CDA, ni les autres formats. **Il n'existe aucun registre du cancer ni aucun registre de dépistage pour l'Espagne**, bien que l'Espagne soit une juridiction du produit. **NAACCR XML en fichier de lot : Non réalisé.** **MIPS et MACRA : Non réalisé** (voir [Déclaration de la qualité et de la santé publique](#ch8-quality-reporting)).

**Règles de déclaration intégrées.**

- Le déclencheur est uniquement la validation en anatomie pathologique chirurgicale. La cytologie ne déclenche jamais de déclaration au registre du cancer. La déclaration est de type envoi sans attente de retour et ne retient jamais la validation.
- Données obligatoires : date de naissance, date du diagnostic, diagnostic principal et code CIM-O. Un registre qui s'appuie sur un identifiant de patient exige aussi cet identifiant. Une déclaration dont des données manquent est retenue sous `HOLD_MISSING_MANDATORY_DATA` et apparaît dans Exceptions de registre.
- Caractère déclarable : seules les exclusions NAACCR documentées sont réalisées (carcinome in situ du col de l'utérus et CIN III, néoplasie intraépithéliale prostatique III, et carcinome basocellulaire et épidermoïde de la peau). La liste n'est pas exhaustive.
- Verrou d'envoi : une instance de validation n'envoie jamais de vrais dossiers. Une instance de production retient une déclaration jusqu'à l'approbation de la mise en production pour ce registre.
- Refus du patient : le paramètre **Respecter le refus du patient** est désactivé par défaut. Lorsqu'il est désactivé, un patient qui a refusé est quand même déclaré et le journal d'audit l'enregistre.

### Déclaration au registre du cancer {#screen-cancer_registry_settings}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Rapports du registre du cancer

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Rapports du registre du cancer

**3. Objectif métier et périmètre.** Choisit le registre du cancer auquel l'entreprise déclare par défaut et permet à un établissement de le remplacer. Contient aussi l'approbation de mise en production de chaque registre. Chaque ligne de registre affiche son badge de statut de spécification, ses juridictions, son identifiant et son format d'échange.

**4. Prérequis et dépendances.** Les dérogations par établissement se choisissent dans la liste des établissements ; configurez-les donc d'abord. Sans registre choisi, aucune déclaration au registre du cancer n'est produite.

Setup step: Tier 7, step 11
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: [Fichiers de lot des registres](#screen-batch_registry_feed), [Registre du cancer britannique (COSD)](#screen-cosd_destination), [Pathologie électronique (États-Unis)](#screen-us_epath)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-cancer_registry_settings - Registre par défaut de l'entreprise, dérogations par établissement et panneau de connexion au registre]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Registre par défaut de l'entreprise | Choix : Aucun plus les 14 registres | Obligatoire | Le registre utilisé pour tout établissement sans dérogation. | Aucun (les données de démonstration fournies attribuent `naaccr_us` à Metro General) |
| Respecter le refus du patient | Case à cocher | Facultatif | Lorsqu'elle est cochée, un patient qui a refusé n'est pas déclaré. | Désactivée |
| Enregistrer | Bouton | Facultatif | Enregistre les deux champs ci-dessus. | Sans objet |
| Registre (mise en production) | Choix | Obligatoire lorsque plusieurs registres sont utilisés | Choisit le registre que le panneau de connexion ci-dessous affiche. | Le premier utilisé |
| Ajouter la dérogation | Bouton | Facultatif | Ouvre une nouvelle ligne de dérogation par établissement. | Sans objet |
| Établissement | Choix d'établissements | Obligatoire pour une dérogation | L'établissement auquel la dérogation s'applique. | Aucun |
| Registre | Choix parmi les 14 registres | Obligatoire pour une dérogation | Le registre de cet établissement. | Aucun |
| Enregistrer, Annuler, Retirer | Boutons | Facultatif | Enregistrer ou abandonner une dérogation, ou retirer une dérogation enregistrée. | Sans objet |

#### Panneau de connexion au registre (mise en production)

Le même panneau apparaît dans [Signalement au registre cytologique](#screen-cytology_registry). Il fait passer un registre par En attente, En test, Validé et En production. Une instance a l'un de deux rôles. Une instance de validation n'envoie jamais de données réelles et exécute seulement la suite de tests. Une instance de production n'envoie de vrais résultats qu'aux registres en production dont l'approbation est à jour ; sinon les résultats sont retenus et rattrapés à l'approbation.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Version et statut du modèle | Texte, lecture seule | Sans objet | La version du modèle du registre et son caractère à jour ou non. | Aucun |
| Ce qui a changé | Liste, lecture seule | Sans objet | Les changements depuis la version que vous avez confirmée en dernier. | Aucun |
| Référence de l'accord | Texte | Obligatoire pour enregistrer | La référence de l'accord de partage des données. **Enregistrer l'accord** l'enregistre. | Vide |
| Lancer la suite de tests | Bouton (instance de validation) | Facultatif | Exécute les cas de test synthétiques (patients `SYN-`) : 3 de dépistage et 2 de cancer. Au moins 1 résultat accepté est nécessaire (`REGISTRY_GO_LIVE_MIN_TEST_ACCEPTS`). | Sans objet |
| Exporter le dossier de validation | Bouton (instance de validation) | Facultatif | Télécharge le fichier du dossier de validation. | Sans objet |
| Fichier du dossier de validation | Fichier JSON (instance de production) | Facultatif | Importe un dossier exporté depuis une instance de validation. | Aucun |
| Vérifications préalables à la mise en production | Liste, lecture seule | Sans objet | `agreementRecorded`, `templateCurrent`, `validationRecord`, `testEvidence`, `specificationConfirmed`, `codesMapped`, `identifierHold`, `overridesReviewed`. | Aucun |
| Référence de validation des tests par le registre | Texte | Facultatif | La propre référence de validation du registre. | Vide |
| Spécification confirmée | Case à cocher | Obligatoire pour les registres `configurable` | Vous confirmez la spécification par rapport à celle du registre. | Non cochée |
| Demander la mise en production | Bouton | Facultatif | Démarre l'approbation. | Sans objet |
| J'approuve en tant que | Choix : Administrateur du site, Directeur de laboratoire, Délégué du directeur de laboratoire | Obligatoire pour approuver | La qualité au titre de laquelle vous approuvez. | Aucun |
| Approuver avec mes identifiants | Bouton | Facultatif | Vous demande de ressaisir vos identifiants, puis enregistre l'approbation. | Sans objet |
| Retirer la demande, Arrêter la déclaration en production | Boutons | Facultatif | Annuler une demande en attente, ou arrêter un registre en production. | Sans objet |
| Partie du modèle | Choix | Obligatoire pour une règle locale | La partie du modèle qu'une modification locale touche. | Aucun |
| Ce que fait la règle | Texte | Obligatoire pour une règle locale | Décrit la modification locale ou la règle de l'adaptateur. | Vide |
| Ajouter la règle, Retirer, Confirmer la revue | Boutons | Facultatif | Gérer les règles locales et confirmer qu'elles ont été revues. | Sans objet |
| La personne qui demande la mise en production peut aussi l'approuver | Oui/Non (production uniquement) | Facultatif | Autorise le demandeur à approuver. | Activé |
| Approbations exigées | Nombre entier, de 1 à 3 (production uniquement) | Facultatif | Le nombre d'approbations nécessaires. | 1 |
| Historique des mises en production | Liste, lecture seule | Sans objet | Chaque demande, approbation et arrêt. | Aucun |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier les paramètres du registre : `config:cancer-registry:manage`. Exécuter la suite de tests : `registry:test-suite:run`. Approuver la mise en production : `registry:live-register:approve`. L'Administrateur les détient par défaut ; le Directeur de laboratoire ne détient pas `config:cancer-registry:manage` et détient l'approbation de mise en production par sa propre attribution initiale. L'approbation exige une nouvelle saisie des identifiants.

**Limites connues.** La saisie CIM-O-3 reste ouverte : l'onglet CIM-O de la fenêtre des codes enregistre des identifiants de morphologie SNOMED, pas des codes tels que `8500/3`. Les spécifications des registres ne sont pas vérifiées. Cet écran n'a pas de capacité de modification au niveau de la section dans le tableau d'accès ; ses boutons se grisent par les boutons de capacité.
### Registre du cancer britannique (COSD) {#screen-cosd_destination}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Registre du cancer britannique (COSD)

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Administration et conformité**
**2. Élément de maintenance :** Registre du cancer britannique (COSD)

**3. Objectif métier et périmètre.** Paramètres de destination pour le Cancer Outcomes and Services Dataset (COSD), affiché à l'écran sous la forme COSD (Angleterre). Vous définissez le libellé du mode d'envoi, le délai de correction et les dates non ouvrées, une fois pour l'entreprise et, si vous le souhaitez, une fois par établissement. Les noms d'éléments du panneau de vérification relèvent du modèle simplifié de PathScribe, pas du schéma officiel du COSD.

**4. Prérequis et dépendances.** Choisissez d'abord le registre COSD dans l'écran du registre du cancer. Supprimer l'entrée d'un établissement le ramène aux paramètres de l'entreprise.

Setup step: Tier 7, step 12
Requires: [Rapports du registre du cancer](#screen-cancer_registry_settings)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-cosd_destination - Paramètres de destination COSD avec panneau de vérification et calculateur de l'échéance de correction]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Périmètre | Entreprise ou un établissement | Obligatoire | Une entrée par périmètre. | Entreprise |
| Mode d'envoi | Choix : restMtls, sftp, portalUpload | Obligatoire | Un simple libellé. Le moteur d'interfaces conserve l'adresse et les identifiants. | API sécurisée (restMtls) |
| Jours ouvrés pour corriger | Nombre entier, de 1 à 30 | Obligatoire | Les jours ouvrés accordés pour corriger une soumission rejetée. | 5 |
| Jours non ouvrés | Liste de dates, AAAA-MM-JJ | Facultatif | Les jours qui ne sont pas comptés comme jours ouvrés. Aucun n'est supposé. | Aucun |
| Utiliser les paramètres de l'entreprise | Bouton | Facultatif | Entrées d'établissement uniquement ; revient aux paramètres de l'entreprise. | Sans objet |

#### Vérifier un exemple de soumission

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Numéro NHS | Texte | Obligatoire | Le patient d'exemple. | Vide |
| Date de naissance | Date | Obligatoire | Exemple. | Vide |
| Date du diagnostic | Date | Obligatoire | Exemple. | Vide |
| CIM-O-3 | Texte | Obligatoire | Exemple. | Vide |
| Diagnostic principal | Texte | Obligatoire | Exemple. | Vide |

#### Quand une correction est-elle due ?

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rejeté le | Date | Obligatoire | Compte les jours ouvrés de correction à partir de cette date, en ignorant les week-ends et vos dates non ouvrées. | Vide |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:cosd-destination:manage`. Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut.

**Limites connues.** Les éléments restant à confirmer par rapport à la vraie spécification COSD sont : les noms d'éléments, la liste des éléments obligatoires, les valeurs des listes de codes, les règles de dates, l'enveloppe de soumission, les codes de rejet et le début du délai de correction.

### Pathologie électronique (États-Unis) {#screen-us_epath}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Pathologie électronique (États-Unis)

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Administration et conformité**
**2. Élément de maintenance :** Pathologie électronique (États-Unis)

**3. Objectif métier et périmètre.** Déclaration de pathologie électronique (ePath) aux registres du cancer des États américains. Un message de base générique du National Program of Cancer Registries (NPCR) (HL7 v2.5.1 ORU^R01) est adapté par un profil d'État et envoyé par un transport (PHIN-MS, SFTP, TCP direct ou une API HTTPS). L'État est choisi d'après celui de l'établissement exécutant, jamais d'après l'adresse du patient. Seul un profil d'exemple, signalé comme tel, est fourni.

**4. Prérequis et dépendances.** L'établissement doit avoir son État renseigné dans le dictionnaire des établissements. Sans établissement ni profil, la déclaration est mise de côté (`routing:noFacility`, `routing:noProfile`) et la validation n'est pas retenue.

Setup step: Tier 7, step 13
Requires: [Dictionnaire des établissements](#screen-facility-dictionary), [Rapports du registre du cancer](#screen-cancer_registry_settings)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-us_epath - Liste des profils ePath américains et affectations]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Périmètre d'affectation | Entreprise ou un établissement | Obligatoire | Là où un profil s'applique. Un établissement se rabat sur un profil pour son propre État, puis sur la valeur par défaut de l'entreprise. | Entreprise |
| Profil affecté | Choix de profils | Obligatoire | Le profil utilisé. | Aucun |

#### Fenêtre du profil

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| État | Deux lettres | Obligatoire | L'État auquel le profil est destiné. | Aucun |
| Nom | Texte | Facultatif | Nom affiché. | Vide |
| Champs obligatoires | Liste de codes segment-champ tels que `PID-11` | Facultatif | Doivent être renseignés. Jamais `MSH`. Ne peuvent pas recouper les champs facultatifs. | Aucun |
| Champs facultatifs | Liste de codes segment-champ | Facultatif | Envoyés lorsqu'ils sont présents. | Aucun |
| Transport | Choix : PHIN-MS, SFTP, TCP direct, API HTTPS | Obligatoire | Libellé du transport pour le moteur d'interfaces. | Aucun |
| Quel établissement détermine l'État | Choix : établissement de la composante technique, établissement de lecture | Obligatoire | Choisit l'établissement dont l'État sélectionne le profil. | Composante technique |
| Uniquement les rapports finaux | Oui/Non | Facultatif | Contrôle. | Désactivé |
| Morphologie CIM-O requise | Oui/Non | Facultatif | Contrôle. | Désactivé |
| SNOMED requis | Oui/Non | Facultatif | Contrôle. | Désactivé |
| Identifiant du prélèvement requis | Oui/Non | Facultatif | Contrôle. | Désactivé |
| NPI du prestataire requis | Oui/Non | Facultatif | Contrôle. Échoue sur les dossiers de démonstration, qui n'ont pas de NPI. | Désactivé |
| Champs propres à l'État | Lignes de champ, mode (obligatoire ou fixe), valeur | Facultatif | Règles supplémentaires de l'État. | Aucun |

Une déclaration qui échoue à un contrôle est retenue pour révision (`HOLD_EPATH_PROFILE`).

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:us-epath:manage`. Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut.

**Limites connues.** Les identifiants OBR et OBX sont des valeurs par défaut, à confirmer par rapport au guide du NPCR. Aucun profil d'État n'est vérifié.

### Signalement au registre cytologique {#screen-cytology_registry}
Breadcrumb: Accueil > Configuration > Cytologie > Déclaration au registre

**Statut :** Démonstration

**1. Navigation :** onglet **Cytologie** de Configuration > section **Déclaration au registre**
**2. Élément de maintenance :** Déclaration au registre

**3. Objectif métier et périmètre.** Déclaration du programme de dépistage du col de l'utérus, distincte des registres du cancer. Un résultat de dépistage ne déclenche jamais de déclaration au registre du cancer. Il existe 12 définitions : `csms_uk`, `nicsp_northern_ireland`, `sccrs_scotland`, `cervicalcheck_ireland`, `palga_netherlands`, `germany_okfe`, `france_crcdc`, `belgium_chr`, `ncsr_australia`, `ncsp_new_zealand`, `canada_provincial` et `kncsp_kccr_korea`. Il n'existe aucun registre de dépistage pour les États-Unis ni pour l'Espagne. La correspondance de chaque registre relie vos catégories de cytologie aux codes du registre pour la qualité du prélèvement, l'interprétation principale, l'interprétation supplémentaire et la recommandation.

**4. Prérequis et dépendances.** Le tableau de correspondance liste vos catégories d'interprétation de cytologie ; elles passent donc en premier. Si vous les ignorez, le tableau est vide.

Setup step: Tier 7, step 14
Requires: [Interprétation et recommandations](#screen-cytology_categories), [Système de nomenclature](#screen-cytology_nomenclature), [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: [Fichiers de lot des registres](#screen-batch_registry_feed)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_registry - Signalement au registre cytologique avec registre par défaut de l'entreprise, dérogations et tableau de correspondance]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Registre par défaut de l'entreprise | Choix : Aucun plus les 12 registres | Obligatoire | Utilisé par tout établissement sans dérogation. | Aucun |
| Enregistrer | Bouton | Facultatif | Enregistre la valeur par défaut. | Sans objet |
| Ajouter la dérogation | Bouton | Facultatif | Démarre une dérogation par établissement. | Sans objet |
| Établissement | Choix d'établissements | Obligatoire pour une dérogation | L'établissement. | Aucun |
| Registre | Choix parmi les 12 registres | Obligatoire pour une dérogation | Le registre qui lui correspond. | Aucun |
| Enregistrer, Annuler, Configurer, Retirer | Boutons | Facultatif | Enregistrer ou abandonner une dérogation, ouvrir sa configuration ou la retirer. | Sans objet |

#### Configuration du registre

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Registre | Choix | Obligatoire | Le registre en cours de configuration. | Le premier |
| Retenir un résultat tant que chaque catégorie qu'il utilise n'a pas de code de registre | Case à cocher | Facultatif | Désactivée pour les registres intégrés. | Désactivée |
| Retenir un résultat sauf si le patient a un identifiant vérifié | Case à cocher | Facultatif | Affichée uniquement lorsque le registre a un format d'identifiant. | Désactivée |
| Catégorie | Texte, colonne | Sans objet | Votre catégorie de cytologie. | Aucun |
| Champ | Texte, colonne | Sans objet | Qualité du prélèvement, interprétation principale, interprétation supplémentaire ou recommandation. | Aucun |
| Code du registre | Texte | Facultatif | Le code du registre. | Vide |
| Libellé du registre | Texte | Facultatif | Le libellé du registre, pour les registres qui codent par du texte. | Vide |
| Enregistrer la configuration du registre | Bouton | Facultatif | Enregistre la correspondance. | Sans objet |

Le **panneau de connexion au registre** est décrit sous [Rapports du registre du cancer](#screen-cancer_registry_settings). Ici, il utilise les capacités de dépistage.

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:screening-registry:manage`. Exécuter la suite de tests : `registry:test-suite:run`. Approuver la mise en production : `registry:live-register:approve`. L'Administrateur les détient par défaut. Le Directeur de laboratoire ne détient pas `config:screening-registry:manage` par défaut.

**Limites connues.** Trois registres sont marqués vérifiés (CSMS, PALGA, NCSR) ; les autres sont configurables et non vérifiés. L'Allemagne, la France et la Belgique sont des registres à fichiers de lot (voir Fichiers de lot des registres).

### Fichiers de lot des registres {#screen-batch_registry_feed}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Fichiers de lot des registres

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Fichiers de lot des registres

**3. Objectif métier et périmètre.** Pour un registre qui reçoit des fichiers plutôt que des messages, un profil de lot indique quels enregistrements y figurent, comment le fichier est organisé et comment il est nommé. Formats : CSV, XML et NAACCR XML. **NAACCR XML figure dans la liste mais est Non réalisé** : le profil NAACCR fourni est désactivé. Un profil d'exemple est fourni (fondé sur `germany_okfe`, CSV, séparateur `;`, 10 colonnes, désactivé) et n'est pas une spécification de programme. Les structures réelles de programmes sont Non réalisées.

**4. Prérequis et dépendances.** Un lot est généré selon le calendrier de Horaires d'envoi et envoyé par le moteur d'interfaces en SFTP. Choisissez d'abord le registre dans l'écran du cancer ou de la cytologie.

Setup step: Tier 7, step 15
Requires: [Rapports du registre du cancer](#screen-cancer_registry_settings), [Signalement au registre cytologique](#screen-cytology_registry), [Horaires d'envoi](#screen-delivery_schedules)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-batch_registry_feed - Cartes de profils des fichiers de lot des registres]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| En attente | Compteurs, lecture seule | Sans objet | **Voir ce qui attend** affiche les éléments en attente, à échéance, retenus, hors délai et le prochain fichier. | Aucun |
| Générer le fichier maintenant | Bouton | Facultatif | Génère un fichier à la main. Il se télécharge une seule fois et n'est jamais conservé. Un manifeste liste le SHA-256, la séquence, les décomptes et les enregistrements retenus. | Sans objet |
| Activer, Désactiver | Bouton | Facultatif | Active le profil. | Désactivé |
| Modifier | Bouton | Facultatif | Ouvre l'éditeur du profil. | Sans objet |
| Retirer | Bouton | Facultatif | Indisponible pour les profils fournis. | Sans objet |
| Statut de l'exécution | Texte, lecture seule | Sans objet | awaitingAck, accepted, partlyRejected ou rejected. | Aucun |

#### Éditeur du profil

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom du programme | Texte | Obligatoire | Donne un nom au programme. | Vide |
| Registre | Choix parmi les 26 registres (dépistage et cancer) | Obligatoire | Quel registre. | Aucun |
| Format du fichier | Choix : CSV, XML, NAACCR XML | Obligatoire | NAACCR XML est refusé (`formatNotAvailable`). | CSV |
| Séparateur | Choix : virgule, point-virgule, tabulation | Obligatoire pour le CSV | Séparateur de colonnes. | Virgule |
| La première ligne contient les en-têtes | Oui/Non | Facultatif | Écrit une ligne d'en-têtes. | Activé |
| Protéger contre les formules de tableur | Oui/Non | Facultatif | Protège le texte qui commence comme une formule. | Activé |
| Élément racine et élément d'enregistrement XML | Texte, deux zones | Obligatoire pour le XML | Des noms valides et différents. | Results, Result |
| Code dans le nom du fichier | Texte, de 1 à 20 lettres, chiffres, traits d'union ou tirets bas | Facultatif | Le code du programme dans le nom du fichier. | Vide |
| Modèle de nom de fichier | Texte utilisant {program} {date} {time} {seq} | Obligatoire | Doit contenir {date} ou {seq}. | `{program}_{date}_{seq}` |
| Colonnes | Liste : champ (15 champs), En-tête, Obligatoire, monter, descendre, supprimer, Ajouter une colonne | Obligatoire | Chaque champ une seule fois. Un enregistrement auquel manque une colonne obligatoire est retenu sous `REGISTRY_NOT_READY`. | Aucun |
| Aperçu en direct | Texte, lecture seule | Sans objet | Affiche la structure du fichier. | Aucun |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Gérer les profils : `config:batch-registry-feed:manage` (Administrateur et Directeur de laboratoire). Générer un fichier : `registry:batch-file:generate` (Administrateur, et elle exige la première capacité).

**Limites connues.** Un renvoi d'un seul enregistrement depuis Exceptions de registre envoie encore un message pour un programme de lot. Le calendrier provient de Horaires d'envoi. La livraison SFTP relève du moteur d'interfaces.

## Déclaration de la qualité et de la santé publique (MIPS/MACRA) {#ch8-quality-reporting}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire

**Statut :** Non réalisé

PathScribe n'a aucune mesure, aucun écran, aucun export ni aucun contrat pour le Merit-based Incentive Payment System (MIPS), le Medicare Access and CHIP Reauthorization Act (MACRA) ou le Quality Payment Program. Une recherche dans le code source et les documents n'en a trouvé aucun. Rien ici ne calcule une mesure de qualité ni ne construit un fichier de soumission.

**Les éléments les plus proches qui existent :**

- Le [Flux de reporting](#screen-bi_feed) envoie les données des dossiers à un outil d'informatique décisionnelle, dans lequel vous pouvez construire vos propres mesures.
- Exports : les utilisateurs disposant de la capacité adéquate peuvent télécharger des exports depuis l'application, et l'[onglet financier des Journaux système](#screen-audit-financial) exporte les événements de facturation en CSV.
- La déclaration aux registres du cancer et du dépistage du col de l'utérus (ci-dessus) est la déclaration de santé publique qui est réalisée, dans les limites décrites.

## Correspondances de paiement par juridiction, types de paiement principaux et journal financier {#ch8-payment-reference}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus

PathScribe décrit qui paie en deux couches. Un **type de paiement principal** est une catégorie utilisée partout (par exemple l'assurance commerciale). Une **correspondance de paiement par juridiction** indique qu'un régime local (par exemple `DE_GKV`) appartient à une catégorie et pour quel format sortant il est prévu. La classe financière qui accompagne des frais est construite à partir des deux. Les formats sortants nommés dans la correspondance ne sont que des libellés : le X12 837P, le KVDT et le SESAM-Vitale sont Prévus et aucun n'est généré.

### Dictionnaire principal des types de paiement {#screen-master_payment_types}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus > Dictionnaire principal des types de paiement

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Références financières et de revenus**
**2. Élément de maintenance :** Dictionnaire principal des types de paiement

**3. Objectif métier et périmètre.** Les catégories de paiement qu'utilisent les correspondances, l'accession et la charge utile des frais. Onze sont fournies : SELF_PAY, PATIENT_COPAY_GAP, COMMERCIAL_INSURANCE, MUTUELLE_COMPLEMENTARY, STATUTORY_SOCIAL_HEALTH, PUBLIC_UNIVERSAL_BENEFIT, PUBLIC_NHS (libellé d'identifiant « NHS Number »), RECIPROCAL_INTERNATIONAL, SPONSOR_CLINICAL_TRIAL, OCCUPATIONAL_WORKERS_COMP (libellé d'identifiant « Claim # ») et DIRECT_CONTRACT_INSTITUTIONAL.

**4. Prérequis et dépendances.** C'est un point de départ pour le paiement. Les correspondances ne peuvent choisir ici qu'un type actif.

Setup step: Tier 7, step 8
Requires: Aucun, c'est un point de départ.
Unlocks: [Correspondance des paiements par juridiction](#screen-jurisdiction_payment_mappings)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-master_payment_types - Liste du Dictionnaire principal des types de paiement]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| ID | Texte | Obligatoire | Conservé en majuscules, les espaces deviennent des tirets bas. Verrouillé après sa création, car les correspondances s'y réfèrent. Un doublon est refusé. | Aucun |
| Nom d'affichage | Texte | Obligatoire | Le nom que voit le personnel. | Aucun |
| Nécessite un ID d'abonné | Oui/Non | Facultatif | Le personnel doit saisir un numéro d'abonné ou de police. | Désactivé |
| Libellé de l'ID d'abonné | Texte | Facultatif | Le libellé de ce numéro (par exemple « Claim # »). | Vide |
| Nécessite un garant | Choix : requis, facultatif, non requis | Obligatoire | Si un garant est nécessaire. | non requis |
| Prend en charge la facturation partagée | Oui/Non | Facultatif | Si les parties technique et professionnelle peuvent aller à des payeurs différents. | Désactivé |
| Remarques | Texte | Facultatif | Notes libres. | Vide |
| Actif | Oui/Non | Facultatif | Boutons **Désactiver** et **Réactiver**. | Actif |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:payment-types:manage`. Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut.

**Limites connues.** La désactivation d'un type n'est pas vérifiée par rapport aux correspondances qui l'utilisent.

### Correspondance des paiements par juridiction {#screen-jurisdiction_payment_mappings}
Breadcrumb: Accueil > Configuration > Système > Références financières et de revenus > Correspondance des paiements par juridiction

**Statut :** Démonstration

**1. Navigation :** onglet **Système** de Configuration > groupe **Références financières et de revenus**
**2. Élément de maintenance :** Correspondance des paiements par juridiction

**3. Objectif métier et périmètre.** Associe chaque régime de payeur local à un type de paiement principal. L'onglet « Données patient externe » de l'Accession les lit (sélecteur Juridiction principale), et la charge utile de la classe financière les utilise. Treize lignes sont fournies : US_MEDICARE, US_COMMERCIAL, CA_OHIP (code pays CA_ON), UK_NHS_TRUST, DE_GKV, DE_BG, FR_CPAM, FR_MUTUELLE, NL_BASIS, BE_MUT, AU_MBS, NZ_ACC et KR_NHIS. **Il n'y a aucune ligne pour l'Espagne, l'Écosse, l'Irlande du Nord ni l'Irlande**, bien que le code définisse 14 juridictions dont l'Espagne.

**4. Prérequis et dépendances.** La liste des types principaux doit d'abord contenir la catégorie. Seuls les types actifs sont proposés.

Setup step: Tier 7, step 9
Requires: [Dictionnaire principal des types de paiement](#screen-master_payment_types), [Aperçu par juridiction](#screen-jurisdiction_overview)
Unlocks: [Aperçu de l'export de facturation](#screen-dft_export_preview)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-jurisdiction_payment_mappings - Liste de la Correspondance des paiements par juridiction avec filtre par pays]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtre par pays | Choix de pays | Facultatif | Réduit la liste. | Tous |
| Afficher les inactifs | Interrupteur Oui/Non | Facultatif | Inclut les lignes inactives. | Désactivé |
| Code pays | Texte | Obligatoire | Conservé en majuscules. Texte libre, non vérifié par rapport à la liste des juridictions. | Aucun |
| Code de schéma local | Texte | Obligatoire | Conservé en majuscules. | Aucun |
| Terminologie d'affichage locale | Texte | Obligatoire | Le nom que voit le personnel. | Aucun |
| Type de paiement principal | Choix de types principaux actifs | Obligatoire | La catégorie. | Aucun |
| Format sortant principal | Texte | Obligatoire | Un libellé tel que X12 837P. Aucun fichier n'est généré. | Aucun |
| Remarques | Texte | Facultatif | Notes libres. | Vide |
| Actif | Oui/Non | Facultatif | Les lignes inactives sont masquées dans le sélecteur Juridiction principale. | Actif |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:payment-mappings:manage`. Les rôles Administrateur et Directeur de laboratoire la détiennent par défaut.

**Limites connues.** Il n'y a pas de contrôle de doublon sur le code pays et le code de schéma. Les sorties X12 837P, KVDT et SESAM-Vitale sont Prévues.
### Journaux système : Facturation {#screen-audit-financial}
Breadcrumb: Accueil > Journaux système > Facturation

**Statut :** Démonstration

**1. Navigation :** page **Journaux système** > onglet **Facturation**
**2. Élément de maintenance :** Sans objet, il s'agit d'une page de journal.

**3. Objectif métier et périmètre.** Une vue en lecture seule des événements de facturation et des frais sortants en échec ou en file d'attente. Elle comporte deux sous-onglets : **Journaux de facturation** et **File d'échec sortante** (file des messages en échec définitif, la liste des frais dont l'envoi a échoué).

**4. Prérequis et dépendances.** Elle n'affiche des données qu'une fois que des frais existent.

Setup step: Reference, not part of setup
Requires: [Dictionnaire de facturation (saisie des frais)](#screen-billing_dictionary), [Libération de la facturation](#screen-billing_release)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-audit-financial - Onglet Facturation des Journaux système, filtres et résultats des Journaux de facturation]

**6. Référence des champs.**

#### Filtres des Journaux de facturation

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Numéro de dossier | Texte | Facultatif | Filtre. | Vide |
| Nom du patient | Texte | Facultatif | Filtre. | Vide |
| Plage de noms de patients (A–Z) | Deux lettres | Facultatif | Filtre. | Vide |
| ID patient (IPP, MPI) | Texte | Facultatif | Filtre. | Vide |
| Date de l'événement de facturation de, à | Dates | Facultatif | Filtre sur la date de l'événement. | Vide |
| Date de service de, à | Dates | Facultatif | Filtre. | Vide |
| Date de signature du rapport de, à | Dates | Facultatif | Filtre. | Vide |
| Type | Choix : Charge, Crédit, Déficience, Révision de code, Envoi, Modification, Audit | Facultatif | Filtre. | Tous |
| Type de facturation | Choix | Facultatif | Filtre. | Tous |
| Statut | Choix : Brouillon, En attente d'approbation, Approuvé, Exporté, Rejeté, En attente | Facultatif | Filtre. | Tous |
| Personnel, Pathologiste signataire, Établissement prescripteur | Recherches (Parcourir) | Facultatif | Filtres. | Vide |
| Recherche dans le texte du détail | Texte | Facultatif | Recherche dans le texte du détail. | Vide |
| Requêtes enregistrées | Choix et Enregistrer | Facultatif | Conservées comme paramètres personnels. | Aucune |
| Effacer, Rechercher | Boutons | Facultatif | Réinitialiser ou exécuter. | Sans objet |
| Exporter en CSV | Bouton | Facultatif | Exige `audit:billing-log:export`. | Sans objet |

#### Résultats des Journaux de facturation

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Dossier, Patient, ID patient | Colonnes | Sans objet | Les données du patient sont balisées comme informations de santé protégées. | Aucun |
| Horodatage, Type, Type de facturation, Statut, Événement, Détail | Colonnes | Sans objet | L'événement. | Aucun |
| Personnel, Pathologiste, Établissement | Colonnes | Sans objet | Qui et où. | Aucun |

La recherche affiche au plus 50 dossiers. Un message « Case limit reached » apparaît lorsque davantage de dossiers correspondent.

#### File d'échec sortante

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtre par laboratoire | Choix, « Tous les laboratoires exécutants » | Facultatif | Limite les deux tableaux. | Tous les laboratoires exécutants |
| En échec : Dossier, Laboratoire exécutant, Composante, Erreur, Nouvelles tentatives | Colonnes | Sans objet | Codes d'erreur : `MISSING_ICD10`, `MISSING_PROVIDER_NPI`, `DISPATCH_TIMEOUT`, `DISPATCH_REJECTED`. Les deux derniers n'apparaissent qu'avec les boutons de test. | Aucun |
| Corriger et réessayer : Enregistrer et remettre en file | Bouton | Facultatif | Rattache au dossier un code CIM-10 ou le NPI du prestataire (audité) et remet en file. | Sans objet |
| Corriger et réessayer : Réessayer l'envoi | Bouton | Facultatif | Réessaie. | Sans objet |
| CAPA : Capturer comme CAPA | Bouton | Facultatif | Lève une non-conformité de type `def-outbound-dispatch-failure`. | Sans objet |
| En file : Dossier, Laboratoire exécutant, Composante, Déclencheur | Colonnes | Sans objet | Les frais en attente d'envoi. | Aucun |
| Simuler un délai dépassé, Simuler un rejet | Boutons | Facultatif | Pour les tests uniquement. L'envoi réel n'est pas réalisé. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:audit-log:open`, détenue par défaut par l'Administrateur, le Directeur de laboratoire et le Réviseur AQ. Exporter les journaux de facturation en CSV : `audit:billing-log:export`. La même page comporte les onglets Journal d'audit, Journal des erreurs, Journal des interfaces, Assurance qualité, Alertes critiques, Liens de consultation et Tâches du serveur ; voir [Journaux des interfaces](#screen-audit-interfaces) et [Journal d'audit](#screen-audit-log).

**Limites connues.** La simulation d'envoi est une aide aux tests. Aucun système de facturation réel ne reçoit de frais.
