---
chapter: 6
id: ch6
title: Niveau 5 : Comptes rendus, formulaires synoptiques et configuration du planificateur
---

# Niveau 5 : Comptes rendus, formulaires synoptiques et configuration du planificateur {#ch6}

Ce chapitre décrit l'aspect d'un compte rendu validé, les formulaires structurés (synoptiques) que remplissent les pathologistes, ainsi que la manière dont un compte rendu validé est envoyé, imprimé et planifié. Il documente 15 écrans répartis en quatre parties. Trois éléments du plan ne sont pas réalisés, et chacun est signalé à l'endroit où il apparaît : un canal de diffusion par portail patient, le chargement automatisé des versions de protocoles du CAP, et un planificateur de tâches nocturnes qu'un administrateur pourrait configurer. Les fonctions existantes les plus proches sont citées dans chaque section.

**Ordre de configuration de ce niveau.** Faites d'abord les niveaux 1 à 4 (en particulier les établissements, les médecins, les rôles et les agents de site). Parcourez ensuite ce niveau dans l'ordre suivant. L'encadré « Ordre de configuration » de chaque écran rappelle sa place dans la liste.

1. [Polices approuvées](#screen-fonts) : choisissez les polices que proposent les éditeurs de comptes rendus.
2. [Style du document](#screen-document_style) : définissez le style de texte par défaut des comptes rendus du laboratoire, le format de page et les marges.
3. [Revue des modèles](#screen-template_governance) : décidez qui peut approuver et publier les modèles synoptiques.
4. [Bibliothèque de parties](#screen-templates-parts) : construisez ou copiez les en-têtes, corps et pieds de page réutilisables.
5. [Modèles de rapport](#screen-templates-templates) : assemblez les parties en modèles de compte rendu et publiez-les.
6. [Règles de routage](#screen-templates-routing) : choisissez le modèle utilisé par un dossier selon l'établissement, le médecin ou le protocole.
7. [File de révision](#screen-protocols-review) : faites passer les protocoles synoptiques par les étapes de brouillon, de relecture et d'approbation.
8. [Protocoles actifs](#screen-protocols-active) : vérifiez et maintenez les protocoles synoptiques publiés.
9. [Règles de routage des destinations d'impression](#screen-print_routing_rules) : décidez vers quelle imprimante part un compte rendu validé.
10. [Règles de configuration de la diffusion](#screen-delivery_rules) : décidez comment chaque compte rendu validé est envoyé (message de résultat, impression, e-fax, dépôt de fichier).
11. [Horaires d'envoi](#screen-delivery_schedules) : décidez quand les envois partent.

Écrans qui ne font pas partie de la configuration et n'ont donc pas de numéro d'étape : les deux pages à onglets ([onglet Modèles de rapport](#screen-tab-templates) et [onglet Bibliothèque synoptique](#screen-tab-protocols)), [Tous les protocoles](#screen-protocols-all) et [Mes exportations](#screen-my-exports).

**Les canaux de diffusion en un coup d'œil.** Chacun est décrit à nouveau, avec ses limites, dans la [Partie 3](#ch6-scheduled-delivery).

| Canal | Statut | Ce qui existe |
|---|---|---|
| File d'impression | Réalisé | Les règles de diffusion envoient un travail d'impression ; les règles de routage d'impression choisissent l'imprimante ; l'écran File d'impression gère les travaux. |
| Message de résultat vers le moteur d'interfaces (électronique) | Réalisé | Le canal par défaut. |
| E-fax | Réalisé | Envoyé au serveur d'interfaces, qui transmet le PDF à une passerelle de messagerie vers fax. |
| Dépôt de fichier | Réalisé | Envoyé au serveur d'interfaces, qui écrit le fichier dans un dossier ou sur une cible SFTP configurés sur ce serveur. |
| Messagerie sécurisée | Démonstration | Une personne envoie depuis une fenêtre un message lié à un dossier ; le courrier va dans la [Boîte d’envoi simulée](#screen-simulated_mail). Ce n'est pas un canal des règles de diffusion. |
| Portail patient ou prescripteur | Non réalisé | Aucun canal de portail n'existe. |

**Où se trouvent les outils de traitement par lots et de tâches nocturnes.** L'impression par lots et le planificateur de tâches nocturnes ne forment pas un seul écran. La [Partie 4](#ch6-batch-jobs) liste les écrans qui existent et indique où chacun est documenté.

## Éditeur de modèles de compte rendu et configuration de l'identité visuelle {#ch6-report-templates}
Breadcrumb: Accueil > Configuration > Modèles de rapport

Un compte rendu est construit à partir de trois types de **parties** (en-tête, corps, pied de page). Un **modèle** place des parties dans cinq emplacements (en-tête de la page 1, en-tête des pages 2 et suivantes, corps, pied de page des pages 2 et suivantes, pied de page de la page 1). Les **règles de routage** décident du modèle que reçoit un dossier. Les polices par défaut du laboratoire, le format de page et les marges se trouvent en dessous de l'ensemble.

**Comment un modèle est choisi pour un dossier.** Le routeur essaie les étapes suivantes dans l'ordre et s'arrête à la première qui correspond : d'abord un contrôle pour les comptes rendus préliminaires ; puis une dérogation d'établissement (Passe 0) ; puis, pour un établissement affilié sans règle propre, la dérogation de son entreprise parente (Passe 0a) ; puis une préférence de médecin (Passe 0b) ; puis une correspondance de protocole synoptique, où les règles définies par l'administrateur sont vérifiées avant la table intégrée (Passe 1) ; puis le modèle de repli par sous-spécialité (Passe 2) ; puis le modèle de repli de référence (Passe 3). Pour un même type de règle, une règle propre à un laboratoire exécutant l'emporte sur une règle Globale pour le même établissement ou le même médecin.

**Couches de style de texte.** Le style de texte d'un compte rendu provient de trois couches ; la plus spécifique l'emporte : le style par défaut du laboratoire (Style du document) est remplacé par le panneau Style propre au modèle, lui-même remplacé par la mise en forme du libellé d'un composant dans l'inspecteur.

**Identité visuelle.** L'en-tête du compte rendu reprend son logo, le nom du directeur de laboratoire et le numéro d'accréditation du service, à défaut de l'établissement, puis de l'entreprise. Ces champs se définissent dans d'autres écrans ; ce chapitre ne les répète pas :
- Identité visuelle du service : [Dictionnaire des services](#screen-departments) (Nom du directeur de laboratoire, numéro d'accréditation, URL du logo d'en-tête).
- Identité visuelle de l'établissement et options de compte rendu : [Configuration de l'établissement](#screen-clients) et [Dictionnaire des établissements](#screen-facility-dictionary).

PathScribe ne conserve que l'adresse d'une image de logo hébergée, jamais l'image. Une partie d'en-tête dont l'option **Afficher le logo de l'établissement** est activée l'utilise.

### Onglet Modèles de rapport {#screen-tab-templates}
Breadcrumb: Accueil > Configuration > Modèles de rapport

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Modèles de rapport**
**2. Élément de maintenance :** L'onglet lui-même, avec les sous-onglets **Modèles de rapport**, **Bibliothèque de parties** et **Règles de routage**.

**3. Objectif métier et périmètre.** L'onglet regroupe les trois écrans qui définissent la mise en page des comptes rendus : la liste des modèles, la bibliothèque de parties réutilisables et les règles de routage des modèles. La page à onglets n'a aucun champ propre. Les boutons des sous-onglets sont les seuls contrôles.

**4. Prérequis et dépendances.** L'onglet s'ouvre pour toute personne disposant de `screen:configuration:open`. Chaque sous-onglet est ensuite limité par sa propre capacité : une personne qui ne la possède pas voit la liste mais ne peut rien modifier.

Setup step: Reference, not part of setup
Requires: [Style du document](#screen-document_style)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: tab-templates - Onglet Modèles de rapport avec les trois sous-onglets]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Modèles de rapport (sous-onglet) | Bouton | Sans objet | Ouvre la [liste des modèles](#screen-templates-templates). | Sélectionné |
| Bibliothèque de parties (sous-onglet) | Bouton | Sans objet | Ouvre la [bibliothèque de parties](#screen-templates-parts). | Non sélectionné |
| Règles de routage (sous-onglet) | Bouton | Sans objet | Ouvre les [règles de routage des modèles](#screen-templates-routing). | Non sélectionné |

**7. Autorisations.** Ouvrir l'onglet : `screen:configuration:open`. Les actions de chaque sous-onglet utilisent leurs propres capacités, indiquées sur le sous-onglet.
**Limites connues.** Aucune limite connue.

### Bibliothèque de parties {#screen-templates-parts}
Breadcrumb: Accueil > Configuration > Modèles de rapport > Bibliothèque de parties

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Modèles de rapport** > sous-onglet **Bibliothèque de parties**
**2. Élément de maintenance :** Parties de compte rendu (en-tête, corps, pied de page)

**3. Objectif métier et périmètre.** Une partie est un bloc réutilisable d'un compte rendu : un **en-tête** (identité visuelle de l'établissement, numéro d'accession, données démographiques du patient), une partie de **corps** (diagnostic, description macroscopique, microscopie, données synoptiques) ou un **pied de page** (numéros de page, mention de confidentialité, ligne d'identité du patient). Les parties se construisent une fois ici et se placent dans un nombre quelconque de modèles. Une partie peut être Globale (proposée à tous les laboratoires exécutants) ou appartenir à un seul laboratoire exécutant. La bibliothèque est livrée avec des parties intégrées, signalées par un badge **Intégré**. Les parties intégrées ne peuvent être ni modifiées ni archivées ; dupliquez-en une pour la changer.

**4. Prérequis et dépendances.** Les parties n'ont pas besoin d'autres parties, mais le style de texte du laboratoire et les laboratoires exécutants auxquels elles se rapportent doivent exister au préalable. Si vous sautez la configuration des établissements, la liste Laboratoire exécutant ne propose que Global.

Setup step: Tier 5, step 4
Requires: [Style du document](#screen-document_style), [Configuration de l'établissement](#screen-clients)
Unlocks: [Modèles de rapport](#screen-templates-templates)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: templates-parts - Bibliothèque de parties avec en-têtes, corps et pieds de page regroupés]

**Ce que l'écran affiche.** Les parties archivées sont masquées de la liste. Les parties sont regroupées sous En-têtes, Corps et Pieds de page. Chaque fiche indique le nom, un badge de statut (Brouillon, Publié ou Archivé), le badge Intégré le cas échéant, le laboratoire exécutant, ainsi que le type, la spécialité et la description. Une fiche propose **Modifier** (pas sur les parties intégrées), **Dupliquer** et **Archiver** avec une confirmation Oui/Non (pas sur les parties intégrées).

**6. Référence des champs.**

Contrôles de la liste :

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Recherche | Texte | Facultatif | Filtre la liste selon le nom de la partie. | Vide |
| Filtre de type | Choix : Toutes, En-têtes, Corps, Pieds de page | Facultatif | Affiche un seul type de partie. | Toutes |
| Filtre de laboratoire | Choix : tous les laboratoires, Global, ou un laboratoire exécutant | Facultatif | Affiche les parties d'un seul laboratoire. | Tous |
| Nouvelle partie | Bouton | Sans objet | Ouvre le sélecteur de type de partie (en-tête, corps ou pied de page), puis l'éditeur de partie. | Sans objet |

#### Éditeur de partie {#ch6-part-builder}
Breadcrumb: Accueil > Configuration > Modèles de rapport > Bibliothèque de parties > Éditeur de partie

[SCREENSHOT PLACEHOLDER: templates-parts-builder - Éditeur de partie avec zone de travail, palette et inspecteur]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Type de partie | Choix : Partie d'en-tête, Partie de corps, Partie de pied de page | Obligatoire | Choisi une seule fois, à la création de la partie. Détermine dans quel emplacement la partie peut être placée. | Aucune |
| Nom | Texte | Obligatoire | Affiché dans la bibliothèque et dans l'emplacement du modèle. Cliquez sur le nom pour le modifier. | `New Header Part`, `New Body Part` ou `New Footer Part` |
| Spécialité | Texte | Facultatif | Regroupe la partie. `General` signifie toutes les spécialités. | Vide (affiché comme General) |
| Description | Texte | Facultatif | Courte note affichée sur la fiche de la bibliothèque. | Vide |
| Norme | Choix : Aucune, CAP, RCPath, Personnalisée | Facultatif | Une simple étiquette. Elle indique la source de la mise en page et ne charge ni ne vérifie aucun protocole. | Aucune |
| Laboratoire exécutant | Choix : Global (tous les laboratoires exécutants), ou un laboratoire exécutant | Facultatif | Une partie propre à un laboratoire n'est proposée que pour les modèles de ce laboratoire. | Global |
| Grille | Commutateur : Grille activée / Grille désactivée | Facultatif | Affiche ou masque la grille de mise en page sur la zone de travail. Affichage uniquement. | Activée |
| Composants (zone de travail) | Glisser depuis la palette | Facultatif | Le contenu de la partie. Voir les champs de l'inspecteur sous [Modèles de rapport](#screen-templates-templates). Le nombre de composants est affiché. | Vide |
| État d'enregistrement | Indicateur : Non enregistré, Enregistrement, Enregistré, Erreur | Sans objet | La partie s'enregistre au fil de vos modifications. | Sans objet |
| Publier | Bouton | Sans objet | Rend la partie disponible pour les modèles (seules les parties publiées peuvent être placées). Un contrôle du diagnostic final s'applique ; voir l'éditeur de modèle. | Brouillon |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Créer, enregistrer, archiver, dupliquer : `config:report-template:manage`. Publier : `config:report-template:publish`. Les deux sont à risque élevé et sont auditées. Administrateur et Directeur de laboratoire détiennent les deux ; Auteur de modèles détient manage ; Approbateur de modèles détient publish.
**Variables de modèle pour le sexe du patient et le numéro NHS (Batch 662).** Les modèles de compte rendu impriment `{{patient.sexAtBirth}}` et peuvent utiliser `{{patient.nhsNumber}}`. Le sexe reste enregistré avec le même code (M, F, U) auquel s'ajoute I pour indéterminé ; les modèles qui testent `patient.sex == 'M'` continuent donc de fonctionner. Le badge de la bannière du patient n'affiche « tracé » que lorsque l'indicateur de statut du numéro NHS enregistré est 01.

**Limites connues.** Le champ Norme est une étiquette. Il ne relie pas une partie à un protocole du CAP ou du RCPath.

### Modèles de rapport {#screen-templates-templates}
Breadcrumb: Accueil > Configuration > Modèles de rapport > Modèles de rapport

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Modèles de rapport** > sous-onglet **Modèles de rapport**
**2. Élément de maintenance :** Modèles de compte rendu

**3. Objectif métier et périmètre.** Un modèle de compte rendu définit la structure d'un compte rendu : quelles parties d'en-tête, de corps et de pied de page il utilise, dans quels emplacements, et (facultativement) les étapes de génération assistée par IA du laboratoire pour ce modèle. Un modèle est Brouillon, Publié ou Archivé. Seul un modèle publié peut être choisi par le routage. La liste affiche chaque modèle avec son statut, un badge **IA** lorsque la génération par IA est activée, un badge **STANDARD** sur la mise en page chirurgicale standard, le nombre d'emplacements actifs et l'heure de la dernière mise à jour.

**4. Prérequis et dépendances.** Les modèles sont construits à partir de parties publiées : la Bibliothèque de parties vient donc en premier. Si vous la sautez, le sélecteur de parties de l'éditeur affiche « No published parts found ». Le style de texte du laboratoire doit être défini pour que le panneau Style du modèle ait une valeur par défaut sur laquelle se rabattre.

Setup step: Tier 5, step 5
Requires: [Bibliothèque de parties](#screen-templates-parts), [Style du document](#screen-document_style)
Unlocks: [Règles de routage](#screen-templates-routing)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: templates-templates - Liste des modèles de rapport avec filtre de statut, recherche, À partir du standard et Nouveau modèle]

**6. Référence des champs.**

Contrôles de la liste :

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtre de statut | Choix : Tous, Publié, Brouillon, Archivé, chacun avec un décompte | Facultatif | Affiche un seul statut. | Tous |
| Recherche | Texte | Facultatif | Filtre selon le nom. | Vide |
| Nouveau modèle (Démarrer à vide) | Bouton | Sans objet | Crée un brouillon vide et ouvre l'éditeur. | Sans objet |
| À partir du standard (Utiliser le modèle standard) | Bouton | Sans objet | Copie la mise en page standard d'anatomie pathologique chirurgicale comme nouveau brouillon nommé `My Surgical Pathology Report`. | Sans objet |
| Modifier | Bouton sur une ligne de brouillon | Sans objet | Ouvre l'éditeur. | Sans objet |
| Dupliquer | Bouton | Sans objet | Crée une copie nommée `Copy of <name>`. | Sans objet |
| Supprimer / Archiver | Bouton avec confirmation Oui/Non | Sans objet | Un brouillon est supprimé ; un modèle publié est archivé. | Sans objet |

#### Éditeur de modèle {#ch6-template-editor}
Breadcrumb: Accueil > Configuration > Modèles de rapport > Modèles de rapport > Éditeur de modèle

[SCREENSHOT PLACEHOLDER: templates-templates-editor - Éditeur de modèle avec panneau Bibliothèque de parties, emplacements de page et aperçu]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom du modèle | Texte | Obligatoire | Cliquez pour modifier. Enregistré lorsque vous quittez la zone. | Le nom donné à la création |
| Ligne de spécialité et de norme | Texte en lecture seule | Sans objet | Affiche la spécialité du modèle et sa norme (CAP, RCPath ou Personnalisée). Un modèle vierge commence avec `general` et `custom`. | `general`, `custom` |
| Statut | Brouillon, Publié ou Archivé | Sans objet | **Publier** fait passer un brouillon à Publié. Publier est désactivé lorsque le modèle comporte plus d'un champ marqué Diagnostic final. | Brouillon |
| Filtre de laboratoire exécutant (panneau Bibliothèque de parties) | Choix : Tous les laboratoires (Global + chaque laboratoire), Global, ou un laboratoire | Facultatif | Restreint les parties proposées. | Tous les laboratoires |
| Recherche de partie | Texte | Facultatif | Filtre les parties publiées. | Vide |
| Emplacement : En-tête de la page 1 | Une partie d'en-tête | Facultatif | En-tête de la première page. | Vide |
| Emplacement : En-tête des pages 2+ | Une partie d'en-tête, ou « identique à la Page 1 » | Facultatif | En-tête des pages suivantes. | Vide |
| Emplacement : Corps | Liste ordonnée de parties de corps | Facultatif | Glissez pour réordonner. Les parties de corps se poursuivent sur toutes les pages. Chacune peut être désactivée avec le commutateur de l'emplacement sans être retirée. | Vide |
| Emplacement : Pied de page des pages 2+ | Une partie de pied de page | Facultatif | Pied de page des pages suivantes. | Vide |
| Emplacement : Pied de page de la page 1 | Une partie de pied de page | Facultatif | Pied de page de la première page. | Vide |
| Style (Police de caractères) | Choix parmi les polices approuvées | Facultatif | Style de texte par défaut au niveau du modèle pour l'en-tête, le corps ou le pied de page. Revient à la valeur par défaut du laboratoire lorsqu'il est vide. | Valeur par défaut du laboratoire |
| Style (Taille de police, pt) | Nombre | Facultatif | Idem. Les tailles sont en points. | Valeur par défaut du laboratoire |
| Style (Gras, Souligné) | Commutateurs | Facultatif | Idem. | Désactivé |
| Style (Transformation du texte) | Choix : Tel que saisi, Première lettre en majuscule, MAJUSCULES | Facultatif | Idem. | Tel que saisi |
| Aperçu | Bouton | Sans objet | Affiche le modèle avec des données de dossier fictives, le nombre de pages et le contexte fictif. | Sans objet |
| Marges de l'aperçu (Haut, Droite, Bas, Gauche, mm) | Nombre | Facultatif | Pour cet aperçu uniquement. Le format de page et les marges réels du laboratoire se définissent dans Style du document. | Le paramètre du laboratoire |
| Format de page de l'aperçu | Choix : A4, US Letter, US Legal, A3, B5 | Facultatif | Pour cet aperçu uniquement. | Le paramètre du laboratoire |

#### Inspecteur : champs du composant sélectionné {#ch6-template-inspector}
Breadcrumb: Accueil > Configuration > Modèles de rapport > Modèles de rapport > Éditeur de modèle > Inspecteur

L'inspecteur affiche les propriétés de ce que vous sélectionnez sur la zone de travail. Le même inspecteur est utilisé dans l'éditeur de partie.

[SCREENSHOT PLACEHOLDER: templates-templates-inspector - Panneau Inspecteur pour un champ sélectionné]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Libellé | Texte | Facultatif | Le libellé imprimé du champ. | Vide |
| Largeur | Colonnes sur 12 | Facultatif | Faites glisser la poignée sur la zone de travail pour un réglage plus fin. | Fixée par le type de composant |
| Obligatoire | Commutateur Oui/Non | Facultatif | Le champ doit être renseigné. | Désactivé |
| Masquer si vide | Commutateur Oui/Non | Facultatif | Omet le champ du compte rendu imprimé lorsqu'il n'a pas de valeur. | Désactivé |
| Saut de page avant ce champ | Commutateur Oui/Non | Facultatif | Commence une nouvelle page. | Désactivé |
| Champ du diagnostic final | Commutateur Oui/Non | Facultatif | Marque le champ qui porte le diagnostic final. Un modèle ne peut en avoir qu'un. | Désactivé |
| Inclure dans l'export FHIR | Commutateur Oui/Non | Facultatif | Conservé avec le champ. Aucun écran d'export FHIR n'est réalisé ; voir le [Chapitre 7](#ch7). | Désactivé |
| Afficher quand (visibilité) | Liste de conditions avec ET/OU | Facultatif | Conditions portant sur d'autres champs : égal à, différent de, contient, est vide, n'est pas vide, supérieur à, inférieur à, etc. | Toujours affiché |
| Position du libellé | Choix : Au-dessus du champ, À côté du champ, Masqué | Facultatif | Mise en forme du libellé. | Au-dessus |
| Taille de police du libellé (pt), Gras, Souligné, Transformation du texte | Nombre et commutateurs | Facultatif | Mise en forme du libellé au niveau du composant. Prévaut sur les styles du modèle et du laboratoire. | Hérité |
| Clé de liaison | Texte | Obligatoire pour les champs liés | Le champ de données du dossier que lit un champ Texte, Liste déroulante, Nombre, Date, Image ou Paragraphe de données. | Aucune |
| Champ texte : Texte indicatif, Longueur maximale, Motif de validation (regex) | Texte, nombre, texte | Facultatif | Limites de saisie d'un champ texte. | Vide |
| Liste déroulante : Options | Un `value|Label` par ligne | Obligatoire | Les choix. | Vide |
| Liste déroulante : Autoriser la sélection multiple, Autoriser la saisie libre | Commutateurs | Facultatif | | Désactivé |
| Nombre : Unité, Options d'unité, Décimales, Min, Max | Texte et nombres | Facultatif | | Vide |
| Date : Format, Date du jour par défaut | Choix : Date, Date et heure, Année seule ; commutateur | Facultatif | | Date, désactivé |
| Calculé : Expression, Type de sortie, Unité | Texte ; choix Texte, Nombre, Date | Obligatoire | Une valeur calculée à partir d'autres champs. | Aucune |
| Libellé statique : Texte, Variante, Gras, Italique | Texte ; choix Titre 1, 2, 3, Corps, Légende | Obligatoire | Titre ou texte fixe. | Corps |
| Bloc de texte enrichi : Contenu, Taille de police (px), Alignement du texte | Texte, nombre, choix Gauche, Centré, Droite | Facultatif | Texte rédigé fixe, identique dans chaque compte rendu. | Vide |
| Paragraphe de données : Clé de liaison, Mise en forme du texte enrichi, Autoriser l'IA à rédiger ce paragraphe | Texte et commutateurs | Facultatif | Un emplacement rempli à partir des données du dossier. | Rédaction par l'IA désactivée |
| Image intégrée : Clé de liaison ou URL d'image statique, Texte alternatif, Légende, Alignement, Largeur, Hauteur (px) | Texte, nombres | Facultatif | Une adresse d'image hébergée, jamais un fichier téléversé. | Taille automatique |
| Section : Titre imprimé, Repliable, Démarrer replié | Texte et commutateurs | Facultatif | Un groupe de champs. | Désactivé |
| Disposition en colonnes : Nombre de colonnes, Espacement des colonnes (px) | Nombres | Facultatif | Les colonnes sur lesquelles le contenu se répartit. | Aucune |
| Groupe répété : Itérer sur, Alias d'élément, Éléments min., Éléments max. | Texte, nombres | Facultatif | Répète son contenu pour chaque élément d'une liste. | Aucune |
| Bloc Si : Afficher les enfants quand, Branche Sinon | Liste de conditions | Facultatif | Affiche le contenu lorsque la condition est remplie. | Aucune |
| Bloc Switch : Switch sur, Cas (Libellé du cas, Quand) | Champ et liste de conditions | Facultatif | Affiche le contenu du cas correspondant. | Aucune |
| Saut de page : Comportement du saut | Choix : Automatique, Toujours couper, Éviter de couper | Facultatif | | Automatique |
| Référence de modèle : ID du modèle référencé, nom, Remplacements de contexte | Texte | Facultatif | Insère le contenu d'un autre modèle. | Aucune |
| En-tête : Afficher le logo de l'établissement, Afficher le nom du patient, Afficher le numéro d'accession, Portée des pages, Hauteur (px), HTML personnalisé | Commutateurs, choix Toutes les pages, Page 1 uniquement, Pages 2 et suivantes uniquement ; nombre ; texte | Facultatif | Commutateurs du contenu de l'en-tête. | Désactivé, toutes les pages |
| Pied de page : Afficher les numéros de page, Format du numéro de page, Portée des pages, Hauteur (px), HTML personnalisé | Commutateur, texte, choix, nombre, texte | Facultatif | Commutateurs du contenu du pied de page. | Désactivé, toutes les pages |
| Génération par IA : Activer la génération assistée par IA, Instruction système, Température, Nombre maximal de jetons | Commutateur, texte, nombre, nombre | Facultatif | Paramètres d'IA propres à chaque section utilisés par le mode Orchestration. Configurés dans le [Chapitre 5](#ch5). | Désactivé |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Créer, enregistrer, dupliquer, supprimer, archiver : `config:report-template:manage`. Publier : `config:report-template:publish`. Les deux sont à risque élevé et sont auditées. Mêmes détenteurs que pour la Bibliothèque de parties.
**Limites connues.** Les contrôles du diagnostic final s'exécutent dans l'éditeur avant la publication. Le cycle de vie des modèles est ici Brouillon, Publié, Archivé ; il n'existe pas d'étape de relecture comme pour les modèles synoptiques (voir [Revue des modèles](#screen-template_governance)).

### Règles de routage {#screen-templates-routing}
Breadcrumb: Accueil > Configuration > Modèles de rapport > Règles de routage

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Modèles de rapport** > sous-onglet **Règles de routage**
**2. Élément de maintenance :** Règles de routage des modèles

**3. Objectif métier et périmètre.** Les règles remplacent la chaîne par défaut (protocole, puis sous-spécialité, puis modèle de référence) pour des établissements, des médecins ou des protocoles synoptiques précis. Une **Correspondance de protocole** permet de relier un protocole synoptique nouveau ou modifié à un modèle sans publier une nouvelle version du logiciel. Ce n'est pas le même écran que les [Règles de routage](#screen-routing_rules) sous Système, qui acheminent les dossiers vers les pathologistes.

**4. Prérequis et dépendances.** Les règles désignent des modèles publiés, des établissements, des médecins et des protocoles. Si vous sautez les modèles, la liste Modèle de rapport est vide. Une correspondance de protocole choisit parmi les protocoles de la Bibliothèque synoptique ; elle est donc plus utile une fois le travail de la [File de révision](#screen-protocols-review) effectué ; une règle peut être ajoutée plus tard.

Setup step: Tier 5, step 6
Requires: [Modèles de rapport](#screen-templates-templates), [Configuration de l'établissement](#screen-clients), [Médecins](#screen-physicians)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: templates-routing - Règles de routage des modèles avec les sections établissement, médecin et protocole et le panneau de test]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Dérogations par établissement | Liste de règles | Facultatif | Passe 0 et Passe 0a. Un établissement affilié sans règle propre utilise celle de son entreprise parente. | Aucune |
| Préférences des médecins | Liste de règles | Facultatif | Passe 0b. | Aucune |
| Correspondances de protocole | Liste de règles | Facultatif | Passe 1. Elles complètent la table de protocoles intégrée et ont priorité sur elle. | Aucune (table intégrée uniquement) |
| Panneau des priorités | Liste en lecture seule | Sans objet | Affiche chaque passe et indique si elle est définie par l'administrateur ou extensible par l'administrateur ; la passe qui a résolu le dernier test est mise en évidence. | Sans objet |
| Activer / Désactiver la règle | Commutateur sur chaque ligne | Facultatif | Une règle désactivée est ignorée. | Activée |
| Supprimer | Bouton avec confirmation | Sans objet | | Sans objet |

#### Ajouter ou modifier une règle {#ch6-routing-rule-window}
Breadcrumb: Accueil > Configuration > Modèles de rapport > Règles de routage > Ajouter la règle

[SCREENSHOT PLACEHOLDER: templates-routing-rule - Fenêtre Ajouter une règle de routage d'établissement]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Établissement, Médecin ou Protocole | Liste de choix | Obligatoire | L'entité à laquelle la règle s'applique. Le libellé suit la section que vous avez ouverte. | Aucune |
| Laboratoire exécutant | Choix : Global (tous les laboratoires exécutants), ou un laboratoire | Facultatif | Une règle propre à un laboratoire est vérifiée avant une règle Globale pour les dossiers de ce laboratoire. | Global |
| Modèle de rapport | Liste de modèles | Obligatoire | Le modèle que l'entité utilise toujours. | Aucune |
| Remarque | Texte | Facultatif | Pourquoi la dérogation existe. | Vide |

#### Tester le routage des modèles {#ch6-routing-test}
Breadcrumb: Accueil > Configuration > Modèles de rapport > Règles de routage > Tester

[SCREENSHOT PLACEHOLDER: templates-routing-test - Panneau Tester le routage des modèles]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Établissement exécutant | Liste de choix | Facultatif | L'établissement du dossier. | Tous |
| Médecin prescripteur | Liste de choix | Facultatif | | Tous |
| Sous-spécialité | Liste de choix | Facultatif | | Toutes |
| ID de modèle synoptique | Liste de choix | Facultatif | | Aucun |
| Tester le routage | Bouton | Sans objet | Affiche le modèle choisi et la passe qui l'a choisi. Un résultat ambigu liste les candidats. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, supprimer : `config:template-routing:manage` (risque élevé, auditée). Administrateur et Directeur de laboratoire la détiennent ; Auteur de modèles et Approbateur de modèles ne la détiennent pas.
**Limites connues.** Les tables de sous-spécialité et de modèle de référence (Passes 2 et 3) sont intégrées et ne peuvent pas être modifiées ici. Le contrôle des comptes rendus préliminaires est intégré.

### Polices approuvées {#screen-fonts}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Polices approuvées

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Polices approuvées

**3. Objectif métier et périmètre.** Détermine les polices que les éditeurs de texte libre proposent aux pathologistes dans leur barre d'outils (l'éditeur de compte rendu, l'éditeur de texte narratif, les éditeurs de macros et les fenêtres de commentaires lisent la liste). Une police désactivée reste dans la liste mais est masquée aux utilisateurs. Le choix est fixé à 14 polices réparties en trois groupes. Vous ne pouvez pas ajouter ici un nom de police.

**4. Prérequis et dépendances.** Aucun. Ce paramètre ne fait que filtrer une barre d'outils. Il ne modifie pas la police de compte rendu par défaut du laboratoire ; celle-ci se définit dans [Style du document](#screen-document_style), qui propose sa propre liste plus courte de sept polices et ne lit pas cette liste.

Setup step: Tier 5, step 1
Requires: Aucun, c'est un point de départ.
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-fonts - Polices approuvées avec recherche et commutateurs par police]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Rechercher des polices | Texte | Facultatif | Filtre les 14 polices selon leur nom. | Vide |
| Badge de décompte | Texte en lecture seule, « N sur 14 activées » | Sans objet | | Sans objet |
| Commutateur de police (un par police) | Commutateur Oui/Non, affiché Actif ou Inactif | Facultatif | Activé signifie que la police apparaît dans les barres d'outils des éditeurs. Le choix : Serif (Times New Roman, Georgia, Garamond, Palatino), Sans-Serif (Arial, Helvetica, Calibri, Verdana, Trebuchet MS, Tahoma, Roboto), Monospace (Courier New, Consolas, Lucida Console). | Activé pour Arial, Times New Roman et Courier New ; désactivé pour les autres |
| Protection de la dernière police | Message « Au moins une police doit rester activée » | Sans objet | La dernière police activée ne peut pas être désactivée. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:report-appearance:manage` (risque élevé, auditée). La section est grisée en lecture seule sans elle. Administrateur et Directeur de laboratoire la détiennent par défaut.
**Limites connues.** Aucune limite connue.

### Style du document {#screen-document_style}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Style du document

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Style du document

**3. Objectif métier et périmètre.** Définit le style de texte par défaut du laboratoire pour l'en-tête, le corps et le pied de page de chaque compte rendu, ainsi que le format de page et les marges d'impression du laboratoire. Le panneau Style propre à un modèle remplace la valeur par défaut pour ce modèle, et la mise en forme du libellé d'un composant remplace les deux. Les tailles sont conservées en points, la taille qui s'imprime, et rien ne s'imprime en dessous de 8 pt. Un style enregistré avant l'existence des points est conservé en pixels (chaque pixel s'imprime à 0,75 pt) et continue de s'imprimer comme avant jusqu'à ce que vous le convertissiez.

**4. Prérequis et dépendances.** Aucun. Faites-le avant de construire les modèles afin que chaque modèle parte de la bonne valeur par défaut.

Setup step: Tier 5, step 2
Requires: Aucun, c'est un point de départ.
Unlocks: [Bibliothèque de parties](#screen-templates-parts), [Modèles de rapport](#screen-templates-templates)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-document_style - Style du document avec les styles d'en-tête, de corps et de pied de page et la mise en page]

**6. Référence des champs.** Les mêmes cinq champs de style apparaissent une fois chacun pour l'en-tête, le corps et le pied de page.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Police de caractères (en-tête, corps, pied de page) | Choix : Arial, Helvetica, Times New Roman, Georgia, Calibri, Verdana, Courier New | Facultatif | La police de compte rendu par défaut pour cette zone. | Arial |
| Taille de police (pt) | Nombre de points, minimum 8 | Facultatif | La taille imprimée. Affiché sous la forme « Taille de police (px, enregistrée avant les points) » avec une indication lorsque le style est encore en pixels. | Corps 10, en-tête 11, pied de page 10 |
| Gras | Commutateur Oui/Non | Facultatif | | En-tête activé ; corps et pied de page désactivés |
| Souligné | Commutateur Oui/Non | Facultatif | | Désactivé |
| Transformation du texte | Choix : Tel que saisi, Première lettre en majuscule, MAJUSCULES | Facultatif | | Tel que saisi |
| Aperçu | Texte d'exemple en lecture seule | Sans objet | Affiche le style choisi en direct. | Sans objet |
| Convertir en points | Bouton, affiché uniquement pour un style enregistré en pixels | Sans objet | Ouvre une confirmation qui liste chaque taille et la taille à laquelle elle s'imprimera. Les nombres restent les mêmes et signifient désormais des points, de sorte que le texte s'imprime plus grand. Consigné dans le journal d'audit. | Sans objet |
| Format de page | Choix : A4 (210 x 297 mm), US Letter (216 x 279), US Legal (216 x 356), A3 (297 x 420), B5 (176 x 250) | Facultatif | Le format de papier du laboratoire. L'aperçu du modèle s'ouvre avec ce format. | A4 |
| Marge haute, droite, basse, gauche (mm) | Nombre entier de 5 à 50 | Facultatif | Marges d'impression. | Haut 25, Droite 20, Bas 25, Gauche 20 |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:report-appearance:manage` (risque élevé, auditée), vérifiée dans le service aussi bien que sur l'écran. Administrateur et Directeur de laboratoire la détiennent.
**Limites connues.** Le moteur de rendu de comptes rendus de développement (`functions/`) imprime toujours en A4 et ne lit pas encore le format de page du laboratoire ; le paramètre est envoyé dans les données de rendu afin que le serveur de production puisse l'utiliser. Le format de page et les marges sont une règle du laboratoire, déterminée par le papier de l'imprimante, et non un choix personnel.

### Revue des modèles {#screen-template_governance}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Revue des modèles

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Revue des modèles

**3. Objectif métier et périmètre.** Définit qui peut approuver et publier les **modèles synoptiques** (la Bibliothèque synoptique) sur ce site. Elle ne régit pas les modèles de compte rendu, qui ont leur propre cycle de vie simple de brouillon, de publication et d'archivage. Deux paramètres s'appliquent, plus une règle fixe : un modèle synoptique diagnostique ne peut pas être publié en dessous de 80 % de couverture SNOMED au niveau des champs. Les modèles de procédure, tels que les listes de contrôle de macroscopie, en sont exemptés car ils ne sont jamais codés.

**4. Prérequis et dépendances.** Les rôles intégrés Auteur de modèles, Approbateur de modèles, Directeur de laboratoire et Administrateur font le travail ; les rôles du Personnel sont donc configurés en premier. Si vous sautez cette étape, personne ne peut approuver un modèle, car l'approbation exige les capacités d'approbateur.

Setup step: Tier 5, step 3
Requires: [Rôles](#screen-staff-roles)
Unlocks: [File de révision](#screen-protocols-review), [Protocoles actifs](#screen-protocols-active)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-template_governance - Revue des modèles avec auto-approbation et relecteurs requis]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Autoriser l'auto-approbation des modèles | Commutateur Oui/Non | Facultatif | Désactivé (recommandé) : un auteur ne peut pas approuver ni publier un modèle qu'il a rédigé ou modifié. Toute personne ayant enregistré le modèle compte comme auteur. À n'activer que pour les cabinets individuels, les petits sites ou les tests. | Désactivé |
| Relecteurs requis | Choix : 1, 2 ou 3 relecteurs indépendants | Facultatif | Les approbations dont un modèle a besoin avant de pouvoir être publié. Chacune doit provenir d'un Approbateur de modèles, Directeur de laboratoire ou Administrateur différent qui n'est pas l'un de ses auteurs (sauf si l'auto-approbation est activée). | 1 |
| Seuil SNOMED | Texte en lecture seule, 80 % | Sans objet | Affiché dans le sous-titre. Non modifiable. | 80 % |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:template-governance:manage` (risque élevé, auditée ; la modification est consignée avec les anciennes et les nouvelles valeurs). Administrateur la détient par défaut ; Directeur de laboratoire ne la détient pas : accordez-la dans Personnel > Rôles si le Directeur de laboratoire doit la gérer. Sans elle, l'écran affiche un avis indiquant que vous pouvez consulter les paramètres mais pas les modifier.
**Limites connues.** Aucune limite connue.

## Configuration du module de compte rendu synoptique du CAP {#ch6-synoptic}
Breadcrumb: Accueil > Configuration > Bibliothèque synoptique

La Bibliothèque synoptique contient les listes de contrôle structurées (protocoles) que les pathologistes remplissent pour les comptes rendus de cancérologie et autres. Elle est distincte des modèles de compte rendu : un protocole définit les questions et leur codage, un modèle de compte rendu définit l'aspect d'un compte rendu. L'écran Règles de routage relie les deux.

**Ce que contient réellement la bibliothèque aujourd'hui (à lire en premier).** Sur les données de démonstration, le registre contient 36 protocoles : 32 Publiés, 3 En révision et 1 Brouillon. Selon la source, 23 sont `Custom` et 13 sont `PathScribe`. **Aucun n'est une liste de contrôle CAP ou RCPath sous licence.** Les noms CAP, RCPath et ICCR n'existent que comme étiquettes de source dans la fenêtre de téléversement et comme noms d'organismes de réglementation. Les 19 listes de contrôle de démonstration (sein, poumon, prostate, côlon, rein, Wilms, mélanome et autres) portent des noms simples comme « Colon resection » et la mention « Texte de démonstration », à la version `0.1.0-generic` ; elles ne peuvent pas être copiées, et une version client ne les contient pas. Les autres sont deux formulaires synoptiques génériques de test, des formulaires PathScribe tels que Mohs et curage ganglionnaire cervical, des formulaires de pathologie hépatique médicale, de placenta et de transplantation rénale, l'examen macroscopique d'autopsie, les trois voies de référence de macroscopie et cinq systèmes de compte rendu de cytologie (thyroïde Bethesda, glandes salivaires Milan, voies urinaires Paris, voies pancréatobiliaires Papanicolaou, ponction ganglionnaire à l'aiguille fine). Un hôpital qui a besoin d'un protocole du CAP doit l'obtenir sous la licence propre du CAP et l'intégrer par les voies ci-dessous.

**Comment une version de protocole entre et sort.**

| Étape | Statut | Ce qui existe |
|---|---|---|
| Importer un fichier de protocole PathScribe (JSON) | Réalisé | **Téléverser un protocole** lit le fichier, le contrôle et l'enregistre comme brouillon. Il passe ensuite par la relecture comme tout autre brouillon. |
| Contrôler une liste de contrôle électronique du CAP (eCC, SDC XML) ou un classeur Excel | Partiel | Le format du fichier est contrôlé et le nombre de sections et de questions est affiché. Il ne peut pas encore être importé, et son contenu n'est pas vérifié par rapport au CAP ou au RCPath. |
| Construire un protocole dans l'éditeur | Réalisé | **Créer / Personnaliser** part de zéro ou d'une copie d'un protocole existant. |
| Charger une nouvelle version d'un protocole existant | Réalisé | **Nouvelle version** ouvre l'éditeur avec le numéro de version suivant. Sa publication archive la version dont il provient. |
| Synchronisation nocturne automatique des mises à jour du CAP, du RCPath ou de l'ICCR | Non réalisé | L'écran Organismes de réglementation comporte un commutateur Synchronisation automatique par organisme, et la fenêtre de téléversement ainsi que les textes de notification mentionnent une synchronisation nocturne, mais aucune tâche de synchronisation n'existe dans cette version et aucune ne figure dans la liste des tâches du serveur. Le contrat de notification (`TEMPLATE_NOTIFICATIONS_API.md`) décrit les messages qu'enverrait une future tâche de synchronisation. D'ici là, chargez les mises à jour à la main. |
| Retirer un protocole | Réalisé | **Archiver** le retire des nouveaux comptes rendus ; les comptes rendus déjà rédigés conservent leur contenu. **Restaurer en brouillon** le ramène pour relecture et nouvelle publication. |

**Cycle de vie.** Brouillon, En révision, Modifications requises, Approuvé, Publié, Archivé. Les noms d'action suivent la source : pour le CAP, l'étape d'approbation est **Accepter** et l'étape de publication **Diffuser** ; pour le RCPath, elles sont **Ratifier** et **Publier** ; pour Custom, PathScribe et ICCR, elles sont **Approuver** et **Publier**. La gouvernance (auto-approbation, nombre de relecteurs, règle SNOMED de 80 %) se définit dans [Revue des modèles](#screen-template_governance).

### Onglet Bibliothèque synoptique {#screen-tab-protocols}
Breadcrumb: Accueil > Configuration > Bibliothèque synoptique

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Bibliothèque synoptique**
**2. Élément de maintenance :** L'onglet, avec trois sous-pages : **Protocoles actifs** (listes de contrôle validées et en cours d’utilisation), **File de révision** (en attente d’approbation) et **Tous les protocoles** (bibliothèque complète).

**3. Objectif métier et périmètre.** Un point unique pour tout le cycle de vie des protocoles. L'onglet n'a aucun champ propre ; ses trois entrées de navigation ouvrent les sous-pages ci-dessous.

**4. Prérequis et dépendances.** S'ouvre pour toute personne disposant de `screen:configuration:open`. Les organismes de réglementation qui apparaissent dans la bibliothèque se définissent dans [Organismes de réglementation](#screen-governing_bodies).

Setup step: Reference, not part of setup
Requires: [Organismes de réglementation](#screen-governing_bodies)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: tab-protocols - Onglet Bibliothèque synoptique avec Actifs, File de révision et Tous les protocoles]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Protocoles actifs | Entrée de navigation, « Listes de contrôle validées et en cours d’utilisation » | Sans objet | Ouvre les [Protocoles actifs](#screen-protocols-active). | Sélectionné |
| File de révision | Entrée de navigation, « En attente d’approbation » | Sans objet | Ouvre la [File de révision](#screen-protocols-review). | Non sélectionné |
| Tous les protocoles | Entrée de navigation, « Bibliothèque complète » | Sans objet | Ouvre [Tous les protocoles](#screen-protocols-all). | Non sélectionné |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Les actions utilisent les capacités de protocole indiquées sur chaque sous-page.
**Limites connues.** Aucune limite connue.

### File de révision {#screen-protocols-review}
Breadcrumb: Accueil > Configuration > Bibliothèque synoptique > File de révision

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Bibliothèque synoptique** > **File de révision**
**2. Élément de maintenance :** Protocoles en attente avant publication

**3. Objectif métier et périmètre.** Liste chaque protocole dans un état antérieur à la publication (En révision, Modifications requises, Approuvé), regroupé par catégorie anatomique, avec une tuile de décompte pour chaque état. Un bandeau rappelle la règle : les modèles exigent au moins 80 % de couverture SNOMED et une validation clinique avant publication. Cliquez sur une fiche pour ouvrir le réviseur (En révision, Approuvé) ou l'éditeur (Modifications requises). Les protocoles à l'état de brouillon n'apparaissent pas ici ; trouvez-les dans Tous les protocoles.

**4. Prérequis et dépendances.** Nécessite les paramètres de revue et les rôles qui font le travail. Si vous les sautez, l'approbation est refusée parce que la personne n'a pas la capacité, ou parce qu'un auteur unique tente d'approuver son propre travail.

Setup step: Tier 5, step 7
Requires: [Revue des modèles](#screen-template_governance), [Rôles](#screen-staff-roles), [Organismes de réglementation](#screen-governing_bodies)
Unlocks: [Protocoles actifs](#screen-protocols-active)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: protocols-review - File de révision avec décomptes par état et fiches]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Recherche | Texte | Facultatif | Correspond au nom du protocole, à la catégorie ou à la source. | Vide |
| Tuiles d'état | Décomptes en lecture seule : En révision, Modifications requises, Approuvé | Sans objet | | Sans objet |
| Téléverser un protocole | Bouton | Sans objet | Ouvre la [fenêtre de téléversement](#ch6-upload-window). | Sans objet |
| Créer / Personnaliser | Bouton | Sans objet | Ouvre la [fenêtre de création](#ch6-build-window). | Sans objet |
| Fiche : nom, version, badge de source, type, propriétaire | Texte en lecture seule | Sans objet | Données du protocole. | Sans objet |
| Fiche : badge de cycle de vie | Lecture seule : En révision, Modifications requises, Approuvé | Sans objet | | Sans objet |
| Fiche : note de relecture | Texte en lecture seule | Sans objet | La dernière note du relecteur, affichée avec un marqueur de retour ou d'avertissement. | Vide |
| Action de la fiche | Ouvre le réviseur (« Ouvrir le réviseur », ou « Ouvrir l'évaluateur pour publier » lorsque Approuvé) ou l'éditeur (« Ouvrir l'éditeur pour traiter les modifications ») | Sans objet | | Sans objet |

#### Actions du réviseur {#ch6-reviewer-actions}
La page du réviseur (ouverte depuis une fiche) fait passer un protocole d'un état à un autre. Chaque passage demande une confirmation et, pour un retour, un motif.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Passer en révision | Bouton | Sans objet | Place un brouillon dans la file de révision. | Sans objet |
| Approuver (CAP : Accepter ; RCPath : Ratifier) | Bouton avec confirmation et notes finales facultatives | Notes facultatives | Nécessite `config:protocol:approve`. Une personne qui a rédigé ou modifié le modèle ne peut pas l'approuver sauf si l'auto-approbation est activée, et ne peut pas approuver deux fois. | Sans objet |
| Publier (CAP : Diffuser) | Bouton avec confirmation | Sans objet | Nécessite `config:protocol:publish`, le nombre requis d'approbations indépendantes et au moins 80 % de couverture SNOMED au niveau des champs pour un modèle diagnostique. La publication le met à la disposition de tous les pathologistes en même temps. | Sans objet |
| Modifications requises | Bouton avec motif obligatoire | Motif obligatoire | Renvoie le protocole à l'auteur. Nécessite `config:protocol:approve`. | Sans objet |
| Réinitialiser en brouillon | Bouton | Sans objet | Remet un protocole à l'état de brouillon. | Sans objet |

**7. Autorisations.** Rédiger, importer, créer, enregistrer, soumettre : `config:protocol:draft`. Approuver et renvoyer pour modifications : `config:protocol:approve`. Publier : `config:protocol:publish`. Retirer (archiver, restaurer) : `config:protocol:retire`. Toutes sont à risque élevé et auditées. Auteur de modèles détient draft ; Approbateur de modèles détient approve, publish et retire ; Administrateur détient les quatre ; Directeur de laboratoire détient toutes sauf draft. Soumettre, renvoyer, approuver et publier envoient chacun une notification (aux approbateurs, à l'auteur, etc.).
**Limites connues.** Le réviseur et l'éditeur sont des pages complètes distinctes (`/template-review/:id`, `/template-editor/:id`). Leur référence champ par champ ne fait pas partie des 15 écrans de ce chapitre ; voir [Champs de l'éditeur de modèle](#ch6-protocol-editor).

### Protocoles actifs {#screen-protocols-active}
Breadcrumb: Accueil > Configuration > Bibliothèque synoptique > Protocoles actifs

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Bibliothèque synoptique** > **Protocoles actifs**
**2. Élément de maintenance :** Protocoles publiés

**3. Objectif métier et périmètre.** Les listes de contrôle actuellement proposées dans le flux de compte rendu synoptique (état Publié), regroupées par catégorie et filtrées par Anatomopathologie chirurgicale, Cytologie non gynécologique, Cytologie GYN ou Découpage. Cliquez sur une ligne pour la développer et afficher les statistiques, le suivi du cycle de vie et les actions.

**4. Prérequis et dépendances.** Les protocoles arrivent dans cette liste en étant publiés depuis la file de révision : traitez donc d'abord la file. Si vous la sautez, la liste est vide (« Aucun protocole trouvé »).

Setup step: Tier 5, step 8
Requires: [File de révision](#screen-protocols-review), [Organismes de réglementation](#screen-governing_bodies)
Unlocks: [Règles de routage](#screen-templates-routing)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: protocols-active - Protocoles actifs regroupés par catégorie avec une ligne développée]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtre de groupe | Choix : Tous, Anatomopathologie chirurgicale, Cytologie non gynécologique, Cytologie GYN, Découpage, chacun avec un décompte | Facultatif | | Tous |
| Recherche | Texte | Facultatif | Correspond au nom, à la catégorie ou à la source. | Vide |
| Téléverser un protocole | Bouton | Sans objet | Ouvre la [fenêtre de téléversement](#ch6-upload-window). | Sans objet |
| Créer / Personnaliser | Bouton | Sans objet | Ouvre la [fenêtre de création](#ch6-build-window). | Sans objet |
| Ligne : nom, version, badge de source, type, badge de cycle de vie | Texte en lecture seule | Sans objet | | Sans objet |
| Sections | Nombre en lecture seule | Sans objet | Une estimation : le nombre de champs divisé par 7, arrondi, minimum 1. Ce n'est pas un décompte des sections réelles du protocole. | Sans objet |
| Champs | Nombre en lecture seule | Sans objet | | Sans objet |
| Dernière modification | Texte en lecture seule | Sans objet | | Sans objet |
| Propriétaire | Texte en lecture seule | Sans objet | | Sans objet |
| Couverture SNOMED CT, couverture CIM-10/11 | Barres en lecture seule, pourcentage | Sans objet | Couverture du codage au niveau des champs. | Sans objet |
| Voir le protocole | Bouton | Sans objet | Ouvre le réviseur en lecture seule. | Sans objet |
| Dupliquer | Bouton | Sans objet | Ouvre l'éditeur avec une copie (un nouveau protocole). | Sans objet |
| Exporter le JSON | Bouton | Sans objet | Télécharge le protocole sous forme de fichier JSON PathScribe ; l'export est audité. | Sans objet |
| Nouvelle version | Bouton | Sans objet | Ouvre l'éditeur sur la version suivante. La publication de la nouvelle version archive celle-ci. | Sans objet |
| Archiver | Bouton avec confirmation | Sans objet | Le retire des nouveaux comptes rendus. Un protocole publié affiche un avertissement plus fort. Les comptes rendus déjà rédigés conservent leur contenu. Nécessite `config:protocol:retire`. | Sans objet |

**7. Autorisations.** Comme pour la [File de révision](#screen-protocols-review). Consulter et exporter ne nécessitent que l'accès à l'écran.
**Limites connues.** Le chiffre des Sections est une estimation.

### Tous les protocoles {#screen-protocols-all}
Breadcrumb: Accueil > Configuration > Bibliothèque synoptique > Tous les protocoles

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Bibliothèque synoptique** > **Tous les protocoles**
**2. Élément de maintenance :** La bibliothèque complète

**3. Objectif métier et périmètre.** Tous les protocoles dans tous les états, regroupés par catégorie. C'est le seul endroit où trouver les brouillons et les protocoles archivés et où restaurer un protocole archivé.

**4. Prérequis et dépendances.** Aucun, si ce n'est que la bibliothèque doit avoir du contenu.

Setup step: Reference, not part of setup
Requires: [File de révision](#screen-protocols-review)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: protocols-all - Tous les protocoles avec les pastilles de filtre de statut]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Filtre de statut | Choix : Tous, Publié, Approuvé, En révision, Modifications requises, Brouillon, Archivé, chacun avec un décompte | Facultatif | **Tous** masque les protocoles archivés ; ils ne s'affichent que sous **Archivé**. | Tous |
| Recherche | Texte | Facultatif | Correspond au nom, à la catégorie ou à la source. | Vide |
| Téléverser un protocole, Créer / Personnaliser | Boutons | Sans objet | Comme ci-dessus. | Sans objet |
| Ligne : nom, version, source, type, badge de cycle de vie, note de relecture | Lecture seule | Sans objet | | Sans objet |
| Ouvrir le réviseur | Bouton, absent sur Publié ou Archivé | Sans objet | | Sans objet |
| Ouvrir l'éditeur | Bouton, absent sur Publié ou Archivé | Sans objet | | Sans objet |
| Dupliquer, Exporter le JSON, Archiver | Boutons | Sans objet | Comme sur Protocoles actifs (Dupliquer et Archiver ne sont pas proposés sur une ligne archivée). | Sans objet |
| Restaurer en brouillon | Bouton, lignes archivées uniquement | Sans objet | Ramène un protocole archivé comme brouillon ; il doit repasser par la relecture. | Sans objet |

**7. Autorisations.** Comme pour la File de révision.
**Limites connues.** Aucune limite connue.

#### Fenêtre de téléversement {#ch6-upload-window}
Breadcrumb: Accueil > Configuration > Bibliothèque synoptique > Téléverser un protocole

[SCREENSHOT PLACEHOLDER: protocols-upload - Fenêtre Téléverser un protocole avec organisme de réglementation et zone de dépôt de fichier]

Sous-titre : « Téléversement manuel — solution de secours en cas d'échec de la synchronisation nocturne ». Un avertissement indique qu'un protocole importé est enregistré comme brouillon et doit être soumis à la relecture et approuvé avant de pouvoir être publié.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Organisme régulateur | Choix : CAP, RCPath, ICCR, RCPA, Autre | Obligatoire | Consigné comme source du brouillon. | CAP |
| Fichier | Fichier JSON, XML ou XLSX, jusqu'à 10 Mo, déposé ou parcouru | Obligatoire | Lu et contrôlé dès qu'il est choisi. | Aucun |
| Résultat du contrôle de format | Liste en lecture seule | Sans objet | Indique si le format est valide, liste les problèmes, et précise toujours que le contenu n'est pas vérifié par rapport au CAP ou au RCPath. Seul un protocole JSON PathScribe peut être importé. Un formulaire XML CAP eCC (SDC) ou un classeur Excel est contrôlé mais « peut être contrôlé ici mais pas encore importé ». | Sans objet |
| Importer comme brouillon | Bouton | Sans objet | Enregistre le brouillon. Refusé si un protocole du même nom existe, ou sans `config:protocol:draft`. | Désactivé tant que le fichier n'est pas importable |

#### Fenêtre Créer / Personnaliser {#ch6-build-window}
Breadcrumb: Accueil > Configuration > Bibliothèque synoptique > Créer / Personnaliser

[SCREENSHOT PLACEHOLDER: protocols-build - Fenêtre Créer / Personnaliser]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Commencer à zéro | Choix | Facultatif | Ouvre l'éditeur sur un modèle vierge. | Sans objet |
| Recherche de modèle existant | Texte | Facultatif | Recherche par nom, source ou catégorie. | Vide |
| Modèle existant | Choix dans la bibliothèque, chacun indiquant la version et le nombre de champs | Facultatif | Le modèle à copier. | Aucun |
| Personnaliser ce modèle | Bouton | Sans objet | Ouvre l'éditeur sur une copie. | Sans objet |

#### Champs de l'éditeur de modèle {#ch6-protocol-editor}
Breadcrumb: Accueil > Configuration > Bibliothèque synoptique > Éditeur de modèle

[SCREENSHOT PLACEHOLDER: protocols-editor - Éditeur de modèle synoptique avec métadonnées, sections et champs]

L'éditeur est une page complète. Son bloc **Métadonnées du modèle** figure ci-dessous ; les sections et les champs portent de nombreux autres paramètres (type de champ, options de réponse avec codage SNOMED et CIM, conditions, règles de décompte, rôles de compte rendu pT, pN, pM, stade FIGO et identifiant de bloc). La référence complète de cette page est une question ouverte pour le guide.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Nom du modèle | Texte | Obligatoire | Doit être unique parmi les protocoles non archivés. | Vide |
| Catégorie anatomique | Choix parmi des pastilles de catégorie | Facultatif | Regroupe le protocole dans les listes. | Vide |
| Source / Organisme de référence | Choix parmi des pastilles de source | Obligatoire | Détermine les noms d'action (Accepter, Ratifier, Approuver). | Custom |
| Système de classification | Texte | Facultatif | Pour les systèmes de cytologie, par exemple l'édition de Bethesda. | Vide |
| Édition de la classification | Texte | Facultatif | Par exemple `AJCC 8th`. | Vide |
| Version | Numéros majeur, mineur et de correctif avec boutons d'incrémentation | Obligatoire | Incrémentée automatiquement par Nouvelle version. | `1.0.0` |
| Enregistrer le brouillon | Bouton | Sans objet | Nécessite `config:protocol:draft`. | Sans objet |
| Soumettre à la révision | Bouton avec confirmation | Sans objet | Place le modèle dans la File de révision et prévient les administrateurs et les responsables cliniques. Vous ne pouvez plus le modifier tant qu'il n'a pas été renvoyé. | Sans objet |

## Moteur de comptes rendus planifiés et règles de diffusion automatique {#ch6-scheduled-delivery}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité

Trois paramètres déterminent ce qu'il advient d'un compte rendu après la signature : les **Règles de configuration de la diffusion** choisissent les canaux, les **Règles de routage des destinations d'impression** choisissent l'imprimante pour le canal d'impression, et les **Horaires d'envoi** choisissent le moment. Un quatrième écran, **Mes exportations**, liste les fichiers qu'une personne a demandés.

**État des canaux, un par un.**

| Canal | Statut | Ce qui existe aujourd'hui |
|---|---|---|
| Fax | Réalisé | Une règle de diffusion peut définir un canal sur E-fax avec un numéro de fax (7 à 15 chiffres, `+` initial facultatif). PathScribe envoie le PDF signé et ses détails au serveur d'interfaces sous la forme d'un message `REPORT_DELIVERY` ; le serveur le transmet à une passerelle de messagerie vers fax. La passerelle est configurée sur le serveur, pas dans PathScribe. Si le serveur n'a pas de canal de fax, il répond 503 et la diffusion échoue avec ce motif. Contrat : `REPORT_DELIVERY_API.md` ; récepteur de développement : `functions/report_delivery.py`. Taille maximale du PDF 20 Mo. |
| Portail | Non réalisé | Il n'y a pas de canal de portail dans les règles de diffusion. La fiche Établissement comporte un choix **Mode de livraison** (E-mail, Fax, Portail, HL7) qui est conservé mais que rien ne lit lors de l'envoi d'un compte rendu. |
| Messagerie sécurisée | Démonstration | Ce n'est pas un canal des règles de diffusion. Une personne lance depuis une fenêtre un message sécurisé lié à un dossier ; il est remis dans la [Boîte d’envoi simulée](#screen-simulated_mail) et rien ne quitte le bâtiment. Aucun canal de messagerie réel n'est connecté. |
| File d'impression | Réalisé | Le canal Impression crée un travail d'impression. L'imprimante provient des règles de routage d'impression, à défaut de la destination par défaut de l'établissement. Les travaux se gèrent dans l'écran File d'impression (voir la [Partie 4](#ch6-batch-jobs)). |
| Électronique (message de résultat) | Réalisé | Le message de résultat vers le moteur d'interfaces. C'est la valeur par défaut lorsqu'aucune règle ne correspond. |
| Dépôt de fichier | Réalisé | Le serveur écrit le PDF dans un dossier ou sur une cible SFTP. La règle nomme la cible ; le serveur conserve son adresse et ses identifiants de connexion. |

### Règles de configuration de la diffusion {#screen-delivery_rules}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Règles de configuration de la diffusion

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Règles de configuration de la diffusion

**3. Objectif métier et périmètre.** Décide comment chaque compte rendu validé est envoyé : par le message de résultat, imprimé, télécopié, déposé sur une cible de fichier, ou retenu pour une récupération manuelle. Une règle porte sur le prescripteur, l'établissement demandeur, l'emplacement du patient (point de service) et le type de compte rendu. La règle qui correspond au plus grand nombre de champs l'emporte. Lorsqu'aucune règle ne correspond, le compte rendu part en **Électronique uniquement**. L'écran contient aussi le paramètre de nouvelles tentatives automatiques du site et un panneau de test.

**4. Prérequis et dépendances.** Les règles désignent des prescripteurs, des établissements et des emplacements, et un canal d'impression a besoin d'un endroit où imprimer. Si vous sautez les établissements et les médecins, les listes de critères sont vides. Si vous sautez le routage d'impression, un travail d'impression se rabat sur la destination par défaut de l'établissement.

Setup step: Tier 5, step 10
Requires: [Configuration de l'établissement](#screen-clients), [Médecins](#screen-physicians), [Règles de routage des destinations d'impression](#screen-print_routing_rules)
Unlocks: [Horaires d'envoi](#screen-delivery_schedules)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-delivery_rules - Règles de configuration de la diffusion avec le tableau des règles, le paramètre de nouvelles tentatives et le panneau de test]

**6. Référence des champs.**

Contrôles de l'écran :

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Tableau des règles : Critères, Canaux, Remarque | Liste en lecture seule | Sans objet | Les critères se lisent Prescripteur, Établissement, Emplacement et Compte rendu, ou « Correspond à tous les dossiers (priorité la plus basse) ». Les canaux se lisent sous forme de listes Principal, Secondaire et Secours, ou « Rien n’est envoyé ». | Vide : chaque dossier se résout en Électronique uniquement |
| Ajouter une règle | Bouton | Sans objet | Ouvre la fenêtre de règle. | Sans objet |
| Modifier, Supprimer | Boutons de ligne | Sans objet | | Sans objet |
| Nouvelles tentatives automatiques : délai avant chacune (minutes) | Minutes entières séparées par des virgules, chacune de 1 à 1,440, 10 au maximum | Facultatif | Une impression, une télécopie ou un dépôt de fichier qui échoue est retenté après chaque délai, dans l'ordre. Après la dernière tentative, l'envoi passe dans les exceptions de diffusion, un message est envoyé à Administrateur et Directeur de laboratoire, et les canaux de secours de la règle sont utilisés. Vide signifie aucune nouvelle tentative. | `1, 5, 15` |
| Enregistrer les tentatives | Bouton | Sans objet | Nécessite `config:delivery-rules:manage`. | Sans objet |

#### Ajouter ou modifier une règle de diffusion {#ch6-delivery-rule-window}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Règles de configuration de la diffusion > Ajouter une règle

[SCREENSHOT PLACEHOLDER: system-delivery_rules-edit - Fenêtre Ajouter une règle de diffusion avec critères et canaux]

Chaque critère est facultatif. Une règle sans aucun critère correspond à tous les dossiers, mais seulement comme correspondance de priorité la plus basse. La fenêtre en avertit.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Prescripteur | Liste de médecins | Facultatif | | Tout prescripteur |
| Établissement demandeur | Liste d'établissements | Facultatif | | Tout établissement |
| Emplacement du patient (point de service) | Liste d'emplacements | Facultatif | | Tout emplacement |
| Type de rapport | Choix : Préliminaire, Final, Corrigé, Addendum | Facultatif | | Tout type de rapport |
| Canal : Électronique (message de résultat vers le moteur d'interfaces) | Choix : Désactivé, Principal, Secondaire, Secours | Facultatif | Les canaux principaux et secondaires partent aussitôt. Les canaux de secours partent lorsqu'une impression, une télécopie ou un dépôt de fichier principal n'a nulle part où aller ou échoue encore après ses nouvelles tentatives. | Désactivé |
| Canal : Impression | Idem | Facultatif | | Désactivé |
| Canal : Télécopie électronique | Idem | Facultatif | | Désactivé |
| Canal : Dépôt de fichier | Idem | Facultatif | | Désactivé |
| Numéro de télécopie | Texte, 7 à 15 chiffres avec `+` facultatif | Facultatif | Laissez vide pour télécopier au médecin prescripteur, ou, sans numéro de télécopie, à l'établissement demandeur. | Vide |
| Cible du dépôt de fichier | Texte, le nom de la cible tel qu'il est défini sur le serveur d'interfaces | Obligatoire lorsque Dépôt de fichier est activé | Le dossier ou le serveur SFTP et ses identifiants de connexion sont conservés sur le serveur, pas dans PathScribe. | Vide |
| Remarque | Texte | Facultatif | Pourquoi la règle existe. | Vide |

Un canal de secours sans canal principal est refusé (« Un canal de secours nécessite un canal principal. »). Un numéro de télécopie qui n'a pas 7 à 15 chiffres, ou un dépôt de fichier sans cible, est refusé.

#### Tester la résolution de la diffusion {#ch6-delivery-test}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Règles de configuration de la diffusion > Tester

[SCREENSHOT PLACEHOLDER: system-delivery_rules-test - Panneau Tester la résolution de la diffusion]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Prescripteur, Établissement demandeur, Emplacement du patient, Type de rapport | Sélecteurs, comme ci-dessus | Facultatif | Les détails du dossier à tester. | Tous |
| Résoudre | Bouton | Sans objet | Affiche la règle correspondante, l'action résolue (Électronique uniquement, Impression uniquement, Double envoi, Suppression) et le plan des canaux. En l'absence de correspondance, il indique que la valeur par défaut Électronique uniquement s'applique. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, supprimer des règles et enregistrer les tentatives : `config:delivery-rules:manage` (risque élevé, auditée). Administrateur et Directeur de laboratoire la détiennent. Renvoyer une diffusion en échec passe par les écrans File d'impression ou Envois sortants et leurs propres capacités.
**Limites connues.** Le fax et le dépôt de fichier exigent que ces canaux et ces cibles soient configurés sur le serveur d'interfaces. Portail est Non réalisé. La messagerie sécurisée n'est pas un canal ici.

### Horaires d'envoi {#screen-delivery_schedules}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Horaires d'envoi

**Statut :** Partiel

**1. Navigation :** onglet de Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Horaires d'envoi

**3. Objectif métier et périmètre.** Définit **quand** les envois partent, par flux, pour toute l'entreprise, avec une dérogation facultative pour un établissement exécutant. Chaque registre a son horaire. PathScribe décide quand un élément peut quitter sa file ; le moteur d'interfaces décide comment il est envoyé. Flux : Envoi des rapports, Envoi de la facturation, Flux de résultats, Flux d'admissions (ADT), Flux d'enregistrement, Synchronisation LIS, Registre. **Partiel :** l'horaire est conservé, résolu et évalué, et la file d'envoi affiche pour chaque élément son heure prévue et l'indicateur d'échéance de déclaration. Le contrat prévoit que le serveur de production doit appliquer les mêmes règles avant de transmettre un élément ; une version navigateur ou de développement ne retient pas un envoi jusqu'à son heure.

**4. Prérequis et dépendances.** Une dérogation d'établissement choisit parmi les établissements, qui viennent donc en premier. Si vous sautez cette étape, seul l'horaire de l'entreprise peut être défini.

Setup step: Tier 5, step 11
Requires: [Configuration de l'établissement](#screen-clients), [Règles de configuration de la diffusion](#screen-delivery_rules)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-delivery_schedules - Horaires d'envoi par flux avec portée entreprise et établissement]

**6. Référence des champs.**

Contrôles de l'écran :

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Horaires pour | Choix : Toute l'entreprise, ou un établissement exécutant | Facultatif | La portée en cours de modification. | Toute l'entreprise |
| Fiche de flux : résumé et source | Texte en lecture seule | Sans objet | Le résumé se lit par exemple « Lot lun., mer. à 06:00 (America/New_York) ». La source se lit « Aucun horaire défini : envoi immédiat », « Suit l'horaire de l'entreprise » ou « Défini pour cet établissement ». | Envoi immédiat |
| Fiches de registre | Une fiche par registre | Facultatif | Chaque registre a son propre horaire et n'emprunte jamais celui d'un autre. | Retenir 240 minutes après la signature ; une modification remet en file |
| Modifier, Définir pour cet établissement, Suivre l'entreprise | Boutons | Sans objet | Créent ou suppriment une dérogation d'établissement. La supprimer fait suivre l'entreprise à l'établissement. | Sans objet |

#### Éditeur d'horaire {#ch6-schedule-editor}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Horaires d'envoi > Modifier

[SCREENSHOT PLACEHOLDER: system-delivery_schedules-edit - Éditeur d'horaire]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Mode d'envoi | Choix : Envoyer immédiatement, Uniquement pendant des plages horaires, En lot à des heures fixes, Retenir jusqu'à la signature finale, À la signature, après une période de revue | Obligatoire | | Envoyer immédiatement |
| Plages où les éléments peuvent partir | Lignes de Jours, De, À (24 heures) ; Ajouter une plage / Retirer | Obligatoire pour des plages horaires | Chacune doit se terminer après son début le même jour. | Aucune |
| Fréquence (À quelle fréquence) | Choix : Tous les jours, Chaque semaine, Chaque mois | Obligatoire pour un lot | | Aucune |
| Jours du lot | Jours de la semaine lun. à dim. | Obligatoire pour l'hebdomadaire | | Aucune |
| Jours du mois | Nombres de 1 à 28, séparés par des virgules | Obligatoire pour le mensuel | | Aucune |
| Heures du lot (24 h) | Heures telles que `06:00, 22:00` | Obligatoire pour un lot | | Aucune |
| Heure limite (facultative) | Heure, 24 heures | Facultatif | Les éléments signés après cette heure un jour d'exécution attendent l'exécution suivante. Vide utilise l'heure d'exécution. | Vide |
| Période de revue (minutes après la signature) | Nombre entier, 1 à 10,080 | Obligatoire pour la période de revue | Alignez-la sur la fenêtre de contrôle qualité et de modification. | Aucune |
| Jours sans envoi | Dates `YYYY-MM-DD`, séparées par des virgules | Facultatif | Par exemple les jours fériés. S'applique aux plages horaires et au lot. | Vide |
| Fuseau horaire | Nom IANA, par exemple `America/New_York` | Obligatoire | Les heures ci-dessus sont lues dans ce fuseau horaire. | Aucun |
| Délai de déclaration (jours après la signature) | Nombre entier, 1 à 3,650 | Facultatif | La file signale les dossiers proches de cette échéance (à moins de 3 jours) ou qui l'ont dépassée. | Vide |
| Une modification remet l'élément en file | Commutateur Oui/Non | Facultatif | Un rapport corrigé est renvoyé selon cet horaire. Activé par défaut pour les registres. | Désactivé, sauf pour les registres |
| Enregistrer l'horaire | Bouton | Sans objet | Refusé s'il est invalide ou sans autorisation. | Sans objet |

#### Essayer un horaire {#ch6-schedule-test}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Horaires d'envoi > Essayer un horaire

[SCREENSHOT PLACEHOLDER: system-delivery_schedules-test - Panneau Essayer un horaire]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Flux | Choix de flux | Obligatoire | | Aucun |
| Établissement exécutant | Choix, ou Aucun (horaire de l'entreprise) | Facultatif | | Aucun |
| Registre | Choix | Obligatoire pour le flux Registre | | Aucun |
| Date et heure (dans le fuseau horaire de l'horaire) | Date et heure | Obligatoire | | Maintenant |
| Le dossier est signé définitivement | Oui/Non | Facultatif | | Non |
| Signé le | Date et heure | Facultatif | | Vide |
| Vérifier | Bouton | Sans objet | Répond « Il part. » ou « Il attend. », avec le motif et la prochaine occasion. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Modifier : `config:delivery-schedules:manage` (risque élevé, auditée uniquement par flux, établissement, registre et type ; aucune donnée patient). Administrateur et Directeur de laboratoire la détiennent.
**Limites connues.** Les destinations de registre, les champs obligatoires, l'approbation de mise en service et le transport relèvent de la configuration propre au registre, pas de l'horaire. Voir `DELIVERY_SCHEDULES_API.md`.

### Règles de routage des destinations d'impression {#screen-print_routing_rules}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Règles de routage des destinations d'impression

**Statut :** Réalisé

**1. Navigation :** onglet de Configuration **Système** > groupe **Administration et conformité**
**2. Élément de maintenance :** Règles de routage des destinations d'impression

**3. Objectif métier et périmètre.** Décide vers quelle imprimante réseau part le travail d'impression d'un compte rendu validé. La portée d'une règle est un niveau : **Poste de travail / Utilisateur**, **Emplacement**, **Compte client (établissement prescripteur)** ou **Établissement (laboratoire exécutant)**. Le niveau le plus spécifique qui comporte au moins une règle active correspondante l'emporte d'emblée sur les niveaux moins spécifiques. Au sein d'un niveau, une règle peut être restreinte par prélèvement ou type de dossier et par déclencheur d'événement. Lorsqu'aucune règle ne correspond, le travail va à la destination par défaut de l'établissement.

**4. Prérequis et dépendances.** Une règle désigne une imprimante atteinte par un agent de site ou par son adresse, et une portée tirée des postes de travail, des emplacements et des établissements. Si vous sautez les agents de site, seule une adresse d'imprimante peut être indiquée. Une règle d'établissement doit utiliser les imprimantes d'agent de site propres à cet établissement.

Setup step: Tier 5, step 9
Requires: [Agents de site](#screen-site_agents), [Configuration de l'établissement](#screen-clients), [Postes de travail](#screen-workstations)
Unlocks: [Règles de configuration de la diffusion](#screen-delivery_rules)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-print_routing_rules - Règles de routage des destinations d'impression avec tableau et panneau de test]

**6. Référence des champs.**

Contrôles de l'écran :

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Tableau des règles : Portée, Critères, Destination, Remarque | Liste en lecture seule | Sans objet | Les critères se lisent « Prélèvement : ... », « Déclencheur : ... », ou « Correspond à tous les travaux de ce niveau ». | Vide : les travaux utilisent la destination par défaut de chaque établissement |
| Ajouter une règle, Modifier, Supprimer | Boutons | Sans objet | | Sans objet |

#### Ajouter ou modifier une règle de routage d'impression {#ch6-print-rule-window}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Règles de routage des destinations d'impression > Ajouter une règle

[SCREENSHOT PLACEHOLDER: system-print_routing_rules-edit - Fenêtre Ajouter une règle de routage d'impression]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Niveau de portée | Choix : Poste de travail / Utilisateur, Emplacement, Compte client (établissement prescripteur), Établissement (laboratoire exécutant) | Obligatoire | | Aucun |
| Portée | Identifiant de poste de travail ou d'utilisateur (texte, par exemple `ws-fgh-theatre2-01`), ou une liste d'emplacements ou d'établissements | Obligatoire | Un avertissement s'affiche lorsqu'elle est absente. | Aucune |
| Prélèvement / Type de dossier | Choix : Chirurgie de routine, Extemporané, Cytologie | Facultatif | | Tout prélèvement ou type de dossier |
| Déclencheur d'événement | Choix : Validation initiale, Validation modifiée (Correction/Addendum), Préliminaire | Facultatif | | Tout déclencheur d'événement |
| Destination d'impression : Imprimante | Choix : Imprimante de l'agent de site, ou Adresse de l'imprimante (envoi direct) | Obligatoire | Une adresse directe ne fonctionne que depuis un serveur PathScribe situé dans le réseau de l'hôpital ; depuis le cloud, utilisez une imprimante d'agent de site. | Aucune |
| Site (laboratoire exécutant) | Liste de choix | Obligatoire pour une imprimante d'agent de site | | Aucun |
| Imprimante | Liste des imprimantes de comptes rendus de l'agent de site | Obligatoire pour une imprimante d'agent de site | Nécessite l'autorisation de voir les imprimantes de ce site. | Aucune |
| Adresse | Adresse IP ou nom d'hôte, sans `http://` ni chemin | Obligatoire pour une adresse directe | | Aucune |
| Protocole | Choix : IPP, LPR/LPD, Raw (port 9100) | Obligatoire pour une adresse directe | | Aucun |
| Port | Nombre entier de 1 à 65535 | Facultatif | | La valeur par défaut du protocole |
| Chemin IPP | Texte | Facultatif, IPP uniquement | | `/ipp/print` |
| File LPR | Texte | Facultatif, LPR/LPD uniquement | | `lp` |
| Nom | Texte | Facultatif | Un nom d'usage pour l'imprimante. | Vide |
| Remarque | Texte | Facultatif | Pourquoi la règle existe. | Vide |

#### Tester la résolution de la destination d'impression {#ch6-print-test}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Règles de routage des destinations d'impression > Tester

[SCREENSHOT PLACEHOLDER: system-print_routing_rules-test - Panneau Tester la résolution de la destination d'impression]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| ID de poste de travail / d'utilisateur | Texte | Facultatif | | Vide |
| Emplacement, Établissement prescripteur, Établissement exécutant | Sélecteurs | Facultatif | | Tous |
| Prélèvement / Type de dossier, Déclencheur d'événement | Choix | Facultatif | | Tous |
| Résoudre | Bouton | Sans objet | Affiche la règle correspondante et son niveau, ainsi que la destination résolue. En l'absence de correspondance, il indique que le travail se rabattrait sur la destination par défaut de l'établissement. | Sans objet |

**7. Autorisations.** Ouvrir : `screen:configuration:open`. Ajouter, modifier, supprimer : `config:print-routing:manage` (risque élevé, auditée). La désignation de l'imprimante d'agent d'un site est vérifiée à ce site, de même que la consultation de ses imprimantes. Administrateur et Directeur de laboratoire la détiennent.
**Limites connues.** La destination par défaut de l'établissement et son mode d'impression (imprimante nommée QZ Tray, transmission au moteur d'interfaces, ou impression réseau directe), ainsi que son format de papier, se définissent dans l'onglet Impression de la fiche de l'établissement dans le [Dictionnaire des établissements](#screen-facility-dictionary), et non ici. L'impression réseau directe exige un serveur PathScribe ou un agent de site situé dans le réseau de l'hôpital ; un navigateur ne peut pas ouvrir de connexion vers une imprimante.

### Mes exportations {#screen-my-exports}
Breadcrumb: Accueil > Mes exportations

**Statut :** Démonstration

**1. Navigation :** Le bouton des exportations dans la barre supérieure, qui affiche le nombre d'exportations prêtes à télécharger. Le bouton n'apparaît que lorsqu'un serveur API est connecté ; dans la démonstration, ouvrez la page à l'adresse `/my-exports`.
**2. Élément de maintenance :** Les fichiers d'exportation de la personne connectée

**3. Objectif métier et périmètre.** Les exportations volumineuses (rapports d'AQ, d'audit, d'élimination et de recherche) sont préparées comme des tâches en arrière-plan. La personne en fait la demande, est prévenue lorsque le fichier est prêt, et le télécharge ici. Les fichiers sont conservés 7 jours et seule la personne qui les a demandés peut les télécharger. Dans cette démonstration, les exportations se téléchargent immédiatement, de sorte que la liste est normalement vide. Un bandeau signale le serveur simulé : les exportations sont préparées dans le navigateur et ne sont conservées que jusqu'à la déconnexion. Le contrat d'API est `ASYNC_EXPORT_API.md` ; lorsque le serveur PathScribe est connecté, une exportation volumineuse y est préparée et apparaît ici lorsqu'elle est prête.

**4. Prérequis et dépendances.** Aucun pour l'ouvrir. Une exportation n'apparaît que si sa propre capacité d'exportation a été accordée (par exemple `qa:deficiencies:export`) ; accordez-les donc dans les rôles du Personnel aux personnes qui en ont besoin.

Setup step: Reference, not part of setup
Requires: [Rôles](#screen-staff-roles)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: screen-my-exports - Liste Mes exportations avec statut, lignes et téléchargement]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Exportation | Texte en lecture seule | Sans objet | Le titre de l'exportation. | Sans objet |
| Demandée | Date et heure en lecture seule | Sans objet | | Sans objet |
| Statut | Lecture seule : En attente, En préparation, Prête, Échec, Annulée, Expirée | Sans objet | | Sans objet |
| Lignes | Nombre en lecture seule | Sans objet | | Sans objet |
| Supprimée après | Date en lecture seule | Sans objet | Sept jours après la demande. | Sans objet |
| Actions : Télécharger, Annuler | Boutons | Sans objet | Télécharger lorsque Prête ; Annuler pendant En attente ou En préparation. | Sans objet |
| Actualiser | Bouton | Sans objet | | Sans objet |
| Allonger les exportations (pour essayer l’attente) | Commutateur Oui/Non, affiché uniquement sur le serveur simulé | Facultatif | Une commande de démonstration. | Désactivé |

**7. Autorisations.** La page n'exige qu'une personne connectée, et liste les exportations de cette personne uniquement. Chaque exportation est demandée sous sa propre capacité `...:export`, à risque élevé et auditée sous la forme `DOCUMENT_EXPORTED` avec le nombre de lignes.
**Limites connues.** Le côté serveur n'est pas connecté. Les exportations de configuration (dictionnaires, tables de correspondance, liste des médecins) sont petites, restent dans le navigateur et n'apparaissent pas ici. Les exécutions planifiées de rapports enregistrés (page Recherche, Rapport > Planifications) sont Simulées et n'envoient rien ; elles ont leur propre contrat dans `SCHEDULED_REPORTS_API.md`.

## Configuration de l'impression par lots et du planificateur de tâches nocturnes {#ch6-batch-jobs}
Breadcrumb: Accueil > Configuration

**État de cette partie :** Partiel. Il n'existe aucun écran unique « impression par lots et planificateur de tâches nocturnes », et un administrateur ne peut ni créer ni modifier une tâche planifiée. Ce qui existe figure ci-dessous, avec le chapitre qui documente chaque écran.

| Élément | Statut | Où il se configure | Où il est documenté |
|---|---|---|---|
| File d'impression (suspendre, libérer, annuler, réessayer, rediriger, actions groupées) | Réalisé | Les travaux se gèrent dans Journaux système > Interfaces > File d'impression. Les imprimantes et le routage se définissent dans les [Règles de routage des destinations d'impression](#screen-print_routing_rules) et dans l'onglet Impression de l'établissement. | [Journaux système : interfaces](#screen-audit-interfaces) |
| Regroupement des impressions par lots (« Lancer le lot maintenant ») | Partiel | Un bouton de l'écran File d'impression avec un début et une fin de plage (heures sur 24 heures, lues en UTC) et un choix de regroupement (Compte client ou Voie de livraison). Il regroupe sous des identifiants de lot communs les travaux en file, non transmis par interface, signés dans la plage. Il ne s'exécute que lorsque quelqu'un appuie dessus. Une tâche récurrente nommée `print.batchAggregation` apparaît dans la liste des tâches du serveur sans intervalle fixe, mais aucun calendrier n'est défini dans cette version. | [Journaux système : interfaces](#screen-audit-interfaces) |
| Réimpression d'étiquettes par lot | Réalisé | Gestion des lots > Réimpression d’étiquettes : trouvez des dossiers par date ou numéro d'accession, choisissez des cassettes, des contenants de prélèvement ou des demandes, choisissez une imprimante de cassettes, réimprimez une étiquette à la fois. Chaque étiquette est auditée ; les étiquettes en échec peuvent être réessayées. Nécessite `label:batch:reprint`. | [Gestion des lots](#screen-batch-management) |
| Exportations planifiées | Démonstration | Les rapports de recherche de dossiers enregistrés peuvent être planifiés (chaque jour, chaque semaine ou chaque mois) depuis la page Recherche, Rapport > Planifications. Une exécution est simulée et n'envoie rien. Les exportations volumineuses s'exécutent comme des tâches en arrière-plan et sont listées dans [Mes exportations](#screen-my-exports). | `SCHEDULED_REPORTS_API.md`, `ASYNC_EXPORT_API.md` |
| Tâches du serveur (santé des files, messages en échec définitif, remise en file) | Réalisé, lecture et remise en file uniquement | Journaux système > Tâches du serveur. Affiche les types de tâches (envoi d'interface, tentative de diffusion, envoi d'impression, libération d'un compte rendu retenu, envoi d'acte facturable, construction d'exportation, événement) et les tâches récurrentes avec la fréquence de chacune. Nécessite `jobs:server-job:view` ; la remise en file d'une tâche en échec définitif nécessite `jobs:server-job:requeue`. | [Journaux système](#screen-audit-log) |
| Planificateur de tâches nocturnes (créer, modifier, activer ou désactiver des tâches) | Non réalisé | Les tâches récurrentes sont fixées sur le serveur API. L'écran Tâches du serveur les liste et montre leur état de santé, mais n'a aucun contrôle pour changer une heure ou en désactiver une. | Sans objet |
| Synchronisation nocturne des protocoles (CAP, RCPath, ICCR) | Non réalisé | Voir [Bibliothèque synoptique](#ch6-synoptic). | Sans objet |

**Tâches récurrentes que le serveur liste aujourd'hui** (minutes entre deux exécutions) : balayage des nouvelles tentatives de diffusion (0.5), balayage des libérations arrivées à échéance (0.25), expiration des liens de consultation (5), escalade des registres en souffrance (60), alertes quotidiennes de suivi (1440), expiration des accès de support (5), balayage de corrélation cytologie-histologie (1440), interrogation du SIL (son propre horaire), regroupement des lots d'impression (son propre horaire), surveillance du SLA de ROSE en cytologie (5), purge du bus de messages (1440).

**Ordre de configuration pour le travail par lots.** Il n'y a rien à configurer pour les tâches du serveur. Pour l'impression, terminez les [Règles de routage des destinations d'impression](#screen-print_routing_rules), puis vérifiez la File d'impression. Pour la réimpression d'étiquettes, configurez d'abord l'imprimante de cassettes dans Profils d'imprimante. Accordez `label:batch:reprint` et les capacités `print:job:*` dans les rôles du Personnel aux personnes qui exécutent ces tâches.
