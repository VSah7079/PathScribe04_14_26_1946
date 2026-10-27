---
chapter: 5
id: ch5
title: Niveau 4 : Le cadre d'IA intégré de PathScribe
---

# Niveau 4 : Le cadre d'IA intégré de PathScribe {#ch5}

Le niveau 4 couvre tous les paramètres qui décident si PathScribe utilise l'intelligence artificielle (IA), où et comment, ainsi que les contrôles qui laissent le pathologiste maître du résultat. Lisez ce chapitre en gardant un fait à l'esprit : le cadre est plus étroit que son plan. PathScribe appelle un modèle de langage externe pour l'aide à la rédaction des comptes rendus et à la dictée, et il intègre les résultats de produits d'analyse d'images de fournisseurs. Il ne contient ni moteur de vision par ordinateur, ni détecteur de tumeurs, ni compteur de cellules, ni outil de score de biomarqueurs, ni moteur autonome de traitement automatique du langage naturel (TALN), ni outil de calibration des poids d'un modèle. Chacun de ces éléments est indiqué **Non réalisé** ci-dessous, avec ce qui s'en rapproche et qui existe.

La production fonctionne sur Microsoft SQL Server, derrière une API ASP.NET Core. La plupart des écrans de ce chapitre fonctionnent aujourd'hui sur les données de démonstration du navigateur, et la ligne de statut de chaque écran indique jusqu'où va son contrat serveur.

## Comment le niveau 4 est configuré {#ch5-setup-order}
Breadcrumb: Accueil > Configuration > Comportement de l'IA

Terminez d'abord les niveaux 1 à 3. Le niveau 4 en lit les établissements, les médecins, les types de prélèvement et les systèmes de codes. Parcourez ensuite les écrans dans l'ordre suivant. La partie 4 de chaque écran rappelle ses propres prérequis.

1. [Comportement de l'IA (onglet)](#screen-tab-ai) : choisissez le service d'IA et le modèle, définissez la politique des fournisseurs, le seuil de confiance et la valeur par défaut de l'orchestrateur.
2. [Études de validation (onglet)](#screen-tab-validation) : le point d'entrée des preuves qu'un modèle fonctionne avec vos données.
3. [Études de validation : Études](#screen-validation-studies) : créez, approuvez et activez une étude.
4. [Études de validation : Rapports](#screen-validation-reports) : clôturez une étude et imprimez le rapport qui l'évalue.
5. [Instructions de l'IA](#screen-ai_instructions) : approuvez le texte que la vérification de discordance clinique envoie au modèle.
6. [Règles de discordance clinique](#screen-clinical_mismatch_rules) : définissez quand une discordance alerte, est consignée ou bloque la validation.
7. [Extraction IA de l'historique](#screen-history_extraction) : activez la lecture consultative des dossiers antérieurs.
8. [Smart Capture](#screen-smart_capture) : l'interrupteur du prototype de suggestion de facturation et sa liste de contrôle de mise en production.

[Études de validation : Tableau de bord](#screen-validation-dashboard) est une page d'usage quotidien et ne fait pas partie de la configuration. La dérogation d'un établissement pour un modèle exige un modèle de compte rendu publié et une étude réussie ; terminez donc le [Chapitre 6](#ch6) consacré aux modèles avant de vous appuyer sur une dérogation d'établissement.

**Statut des six domaines du plan**

| Domaine | Statut | Où il est configuré |
|---|---|---|
| Infrastructure d'IA et architecture des modèles | Réalisé pour les écrans et les paramètres ; Partiel pour le côté serveur (voir chaque écran) | Configuration, onglet **Comportement de l'IA** ; Dictionnaire des établissements, onglet **IA et performance** ([Chapitre 2](#screen-facility-dictionary)) |
| Suivi des prélèvements et aide à la macroscopie par vision par ordinateur | Non réalisé. Un dictionnaire de fournisseurs et un prototype de facturation fondé sur des règles existent | Intégrations fournisseurs, catégorie imagerie de macroscopie ([Chapitre 4](#screen-vendor_integrations)) ; [Smart Capture](#screen-smart_capture) |
| Moteur de TALN et de structuration automatique | Partiel. Des fonctions isolées existent ; pas de moteur autonome | [Extraction IA de l'historique](#screen-history_extraction) ; onglets Voix et Macros ([Chapitre 4](#screen-tab-voice)) ; outils de la page de compte rendu |
| Analyse d'images de pathologie numérique par IA | Partiel. L'intégration des résultats des fournisseurs existe. La détection de tumeurs, le comptage de cellules et le score de biomarqueurs sont Non réalisés | Intégrations fournisseurs, catégories IA de pathologie numérique et visionneuses de lames ([Chapitre 4](#screen-vendor_integrations)) ; onglet Discordance IA de l'Assurance qualité ([Chapitre 4](#screen-quality-assurance)) |
| Règles de contrôle qualité intelligent et de détection d'anomalies | Réalisé pour les écrans ; Démonstration pour le côté serveur des Instructions de l'IA | [Règles de discordance clinique](#screen-clinical_mismatch_rules) ; [Instructions de l'IA](#screen-ai_instructions) ; Règles de déclenchement anormal ([Chapitre 3](#screen-abnormal_trigger_rules)) |
| Gouvernance de l'IA, seuils avec intervention humaine, calibration | Réalisé pour la gouvernance et les seuils. Calibration des poids : n'existe pas | [Instructions de l'IA](#screen-ai_instructions) ; [Études de validation](#screen-tab-validation) ; panneau Versions du modèle de l'onglet Comportement de l'IA |

## Infrastructure d'IA et architecture des modèles {#ch5-ai-infrastructure}
Breadcrumb: Accueil > Configuration > Comportement de l'IA

**Statut :** Réalisé pour les écrans de paramètres. Partiel pour le serveur : les appels de production sont décrits, et quelques-uns ne sont pas encore connectés (indiqués sous chaque écran).

Cette section explique comment un appel d'IA est effectué et qui décide de ce qu'il utilise. L'écran qui règle tout cela, [Comportement de l'IA (onglet)](#screen-tab-ai), suit.

**Le proxy d'IA.** Le navigateur ne détient jamais de clé d'IA. Il appelle les routes `/api/ai/...` propres à PathScribe, et le serveur ajoute la clé depuis un coffre de secrets tel qu'Azure Key Vault. Des routes existent pour Anthropic, Google Gemini (génération, flux et liste des modèles), OpenAI, Azure OpenAI (`/api/ai/azure/chat/completions`), un point de terminaison personnalisé, AWS Bedrock (invocation et invocation en flux) et les recherches terminologiques UMLS et National Library of Medicine. Le serveur doit écrire une entrée d'audit pour chaque appel (sans le texte de la requête) et limiter le débit des appelants. Le proxy qu'utilise la version de développement n'existe pas en production. La rotation d'une clé d'API est effectuée par le support ForMedrixAI dans le coffre de secrets du serveur. Aucun écran ne définit ni n'affiche de clé.

**Fournisseurs.** L'écran affiche des noms de fournisseurs. En interne, chacun est enregistré sous un identifiant nommé d'après le protocole qu'il parle.

| Affiché comme | Identifiant enregistré | Modèles proposés (le premier est celui par défaut quand vous choisissez le fournisseur) |
|---|---|---|
| Anthropic (Claude) | `structured_messages` | `claude-sonnet-4-6` (recommandé), `claude-opus-4-8` (précision maximale), `claude-haiku-4-5` (le plus rapide) |
| OpenAI (GPT-4) | `chat_completions` | `gpt-4o` (recommandé), `gpt-4-turbo`, `gpt-4` |
| Azure OpenAI | `chat_completions_managed` | `gpt-4o` (Azure), `gpt-4-turbo` (Azure) |
| AWS Bedrock | `model_gateway` | `anthropic.claude-sonnet-4-6-v1:0`, `anthropic.claude-opus-4-8-v1:0`, `amazon.nova-pro-v1:0` |
| Google (Gemini) | `structured_content` | `gemini-1.5-flash` (recommandé), `gemini-1.5-pro` |
| Auto-hébergé / Point de terminaison personnalisé | `custom` | `custom` |
| Mock, mode démo | `mock` | `mock-v1` |

Si l'identifiant de fournisseur enregistré ne figure pas parmi ceux-ci, PathScribe utilise `structured_messages`. Un fournisseur réglé sur `mock` ou sur une valeur inconnue envoie quand même l'appel vers la route Anthropic par le proxy (un comportement documenté du proxy, pas un raccourci de démonstration). Bedrock exige une route serveur qui signe les requêtes et renvoie un flux normalisé ; cette route fait partie du contrat du proxy.

**Quel paramètre l'emporte.** PathScribe résout la configuration de l'IA dans cet ordre : une dérogation personnelle (vue développeur uniquement ; aucun écran ne la définit pour un administrateur), puis le paramètre de laboratoire de l'organisation, puis les valeurs par défaut de la version : `VITE_AI_PROVIDER`, `VITE_AI_MODEL`, `VITE_AI_PROXY_URL`, `VITE_AI_GATEWAY_REGION` (par défaut `us-east-1`), `VITE_AI_HOSTING_REGION` et `VITE_AI_MAX_TOKENS` (par défaut 1000). Le paramètre de l'organisation est enregistré sous la clé `pathscribe_ai_org_config`.

**Quel modèle chaque tâche utilise.**

| Tâche | Modèle utilisé | Remarques |
|---|---|---|
| Aide à la rédaction du compte rendu et du récit (Generate Narrative, Suggest Synoptic Fields, suggestions de macros, recherche des constats critiques, affectation de modèle) | Le modèle par défaut de l'organisation, ou le modèle propre à l'établissement exécutant s'il en a un dans le Dictionnaire des établissements, onglet **IA et performance** | Un établissement ne peut choisir qu'un modèle qui a une étude rapportée évaluée PASS pour cet établissement ([Études de validation : Rapports](#screen-validation-reports)). La limite de jetons de l'établissement et le format de requête accompagnent le modèle. |
| Affinage de la dictée | Le modèle par défaut de l'ensemble de l'organisation, de type Dictée vocale | Aucune couche établissement. Un modèle vocal ne devient le modèle par défaut qu'avec une étude évaluée PASS. Défini dans l'onglet Voix ([Chapitre 4](#screen-tab-voice)). |
| Affectation de modèle synoptique et de macroscopie par IA | Comme l'aide à la rédaction | Le seuil de confiance de ces deux affectations est fixé à 60 dans le code ; il n'y a aucun paramètre. L'affectation de macroscopie se rabat sur le modèle de tissu standard. |

**Politique des fournisseurs.** Une règle par juridiction, et facultativement une règle plus étroite par établissement, indique quels services d'IA et quelles régions d'hébergement peuvent être utilisés pour le travail à cet endroit. Un appel doit satisfaire la règle de la juridiction et celle de l'établissement. Sans règle, tous les services sont autorisés. Dans une règle, les services autorisés peuvent être tous ou une liste, et chaque service autorisé peut porter une liste de régions autorisées ; sans liste, toute région convient. Un appel dont la région n'est pas enregistrée est refusé là où les régions sont limitées. Un refus ne bascule jamais vers un autre service : la fonctionnalité continue sans IA et affiche « AI is not available for this jurisdiction ». Le fournisseur mock est toujours autorisé. Le serveur doit répondre à un appel refusé par 403 et le code `AI_VENDOR_NOT_ALLOWED`, et l'auditer sous `AI_CALL_REFUSED`.

**Journal d'audit de l'IA.** Chaque appel d'IA écrit un enregistrement de : dossier, section, fournisseur, modèle, statut (terminé, erreur, annulé ou refusé), nombre de jetons, durée, région d'hébergement, juridiction, établissement et fonctionnalité. Le journal conserve les 2000 dernières entrées et reste dans le navigateur tant que le serveur ne l'enregistre pas. Aucun écran ne l'affiche.

**Mode orchestrateur.** Le mode orchestrateur écrit le récit d'un compte rendu en quatre étapes fixes au lieu d'une seule requête. Le moteur de `src/orchestrator/` est le code actif. [Comportement de l'IA (onglet)](#screen-tab-ai) définit la valeur par défaut de l'organisation, et un établissement peut la remplacer. Le libellé et l'ordre des étapes ne sont pas modifiables.

### Comportement de l'IA (onglet) {#screen-tab-ai}
Breadcrumb: Accueil > Configuration > Comportement de l'IA

**Statut :** Réalisé

**1. Navigation :** onglet **Comportement de l'IA** de Configuration
**2. Élément de maintenance :** Comportement de l'IA (l'onglet entier)

**3. Objectif métier et périmètre.** Cet onglet contient les paramètres d'IA de l'organisation : quel moteur d'IA est utilisé, si l'IA intervient pour la macroscopie et la microscopie, quel degré de confiance une suggestion doit atteindre pour être affichée ou insérée, quel service et quel modèle se trouvent derrière les appels, où la politique des fournisseurs permet d'envoyer les appels, si le mode orchestrateur est activé, et quelles versions de modèle sont disponibles. Tout s'applique à l'ensemble de l'organisation. Un établissement ne peut remplacer que le modèle et l'interrupteur de rédaction automatique du récit, sur sa propre fiche du [Dictionnaire des établissements](#screen-facility-dictionary).

**4. Prérequis et dépendances.** Les périmètres de la politique des fournisseurs sont les juridictions et les établissements que vous avez déjà définis ; configurez-les donc d'abord. Si vous ignorez les établissements, la section de politique ne peut proposer que la juridiction propre du laboratoire, et aucune règle d'établissement ne peut être écrite.

Setup step: Tier 4, step 1
Requires: [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: [Études de validation (onglet)](#screen-tab-validation), [Instructions de l'IA](#screen-ai_instructions), [Règles de discordance clinique](#screen-clinical_mismatch_rules), [Extraction IA de l'historique](#screen-history_extraction)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: tab-ai - Onglet Comportement de l'IA : badge Moteur IA, interrupteurs de comportement, paramètres du fournisseur, politique des fournisseurs, Configuration de l'orchestrateur et Versions du modèle]

**6. Référence des champs.** Les sections apparaissent de haut en bas dans cet ordre. Les modifications du premier groupe s'enregistrent au fur et à mesure.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Badge **Moteur IA** | Badge en lecture seule | Sans objet | Affiche l'identifiant du modèle en cours d'utilisation, ou « Mock - Demo Mode » avec une pastille **DÉMO** quand le fournisseur mock est sélectionné. | Sans objet |
| **IA pilotée par la macroscopie**, **Activé** | Case à cocher oui/non (`grossEnabled`) | Facultatif | Désactivée, la fin de la macroscopie et la scrutation d'assistance ignorent l'évaluation de la description macroscopique par l'IA. | Activé |
| **IA pilotée par la microscopie**, **Activé** | Case à cocher oui/non (`microscopicEnabled`) | Facultatif | Désactivée, le flux de correction, le panneau latéral synoptique et la scrutation d'assistance ignorent le travail de l'IA sur le texte microscopique. | Activé |
| **Seuil de confiance** | Curseur, nombre entier de 0 à 100 (`confidenceThreshold`) | Facultatif | Le niveau de confiance qu'une suggestion doit atteindre. Le panneau latéral synoptique et le badge de relecture du compte rendu synoptique l'utilisent pour repérer les suggestions. Un modèle peut avoir sa propre valeur dans sa fenêtre **Paramètres** (ci-dessous). S'enregistre quand vous le modifiez. | 75 |
| **Avancé** : Insérer automatiquement les suggestions au seuil de confiance ou au-delà | Case à cocher oui/non (`autoInsertSuggestions`) | Facultatif | Activée, le panneau latéral synoptique inscrit une suggestion dans le champ sans attendre que le pathologiste l'accepte, si sa confiance atteint le seuil. | Désactivé |
| **Avancé** : Afficher les scores de confiance dans l'éditeur | Case à cocher oui/non (`showConfidenceScores`) | Facultatif | Enregistré uniquement. Aucun autre écran ne le lit aujourd'hui ; le modifier n'a donc aucun effet. | Activé |
| **Avancé** : Suggérer des macros selon le contexte du diagnostic | Case à cocher oui/non (`macroSuggestions`) | Facultatif | Enregistré uniquement. Aucun autre écran ne le lit aujourd'hui ; le modifier n'a donc aucun effet. | Désactivé |
| **Avancé** : Filtrer les suggestions de l'IA par sous-spécialité | Case à cocher oui/non (`subspecialtyRouting`) | Facultatif | Enregistré uniquement. Aucun autre écran ne le lit aujourd'hui ; le modifier n'a donc aucun effet. | Activé |
| **Réinitialiser aux valeurs par défaut** | Bouton | Sans objet | Remet tous les paramètres de comportement ci-dessus à leurs valeurs par défaut. Ne modifie ni le fournisseur, ni la politique des fournisseurs, ni l'interrupteur de l'orchestrateur. | Sans objet |

#### Paramètres du fournisseur d'IA
Breadcrumb: Accueil > Configuration > Comportement de l'IA

Affiché sous le titre **Fournisseur d'IA - Paramètres de l'organisation** uniquement à une personne dont le rôle est admin, pathologiste-admin ou superadmin. Toute autre personne voit une note indiquant que le fournisseur est géré par l'administrateur. Un encadré d'avertissement rappelle que le texte des dossiers quitte le système pour le service choisi. Les champs qui ne s'appliquent pas au fournisseur choisi sont masqués.

[SCREENSHOT PLACEHOLDER: tab-ai-provider - Paramètres du fournisseur d'IA avec fournisseur, modèle et région d'hébergement]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Fournisseur d'IA** | Choix, groupé en **Fournisseurs de production** et **Développement et démo** | Obligatoire | Sélectionne le service. Choisir un fournisseur règle **Modèle** sur le premier modèle de ce fournisseur. Une courte indication sous le champ décrit le fournisseur. | Anthropic (Claude) quand rien n'est enregistré |
| **Modèle** | Choix dans la liste du fournisseur (tableau ci-dessus) | Obligatoire | L'identifiant du modèle envoyé à chaque appel. | Premier modèle du fournisseur |
| **Point de terminaison de ressource Azure** | Lien https ; texte indicatif `https://my-org.openai.azure.com` | Obligatoire pour Azure OpenAI | L'adresse de votre ressource Azure. Affiché uniquement pour Azure OpenAI. | Aucun |
| **Nom de déploiement** | Texte | Facultatif | Le déploiement Azure à appeler. Conservé uniquement si un point de terminaison est aussi défini. Affiché uniquement pour Azure OpenAI. | Aucun |
| **Région AWS** | Texte | Facultatif | La région Bedrock. Affichée uniquement pour AWS Bedrock. | `us-east-1` |
| **Région d'hébergement** | Texte ; texte indicatif `eu-west-1` | Facultatif | La région où le fournisseur traite l'appel, telle que le fournisseur la nomme. Enregistrée à chaque appel afin que la politique des fournisseurs puisse la vérifier. Affichée pour tous les fournisseurs sauf AWS Bedrock et Mock. | Vide (région non enregistrée) |
| **URL de base du point de terminaison** | Lien https | Obligatoire pour Personnalisé | L'adresse de base d'un service compatible OpenAI. PathScribe envoie ses requêtes à `/chat/completions` sous cette adresse. Affiché uniquement pour Auto-hébergé / Point de terminaison personnalisé. | Aucun |
| Avertissement de politique | Message en lecture seule | Sans objet | Apparaît avant l'enregistrement d'un service ou d'une région que la règle d'une juridiction ou d'un établissement de la politique ci-dessous n'autorise pas. | Sans objet |
| **Enregistrer la config. de l'organisation** | Bouton | Sans objet | Enregistre le paramètre de l'organisation. Exige `config:ai-provider:manage`. Si vous quittez l'onglet avec des modifications non enregistrées, vous en êtes averti. | Sans objet |
| **Tester la connexion** | Bouton | Sans objet | Envoie une requête de test (fonctionnalité `connection-test`, 20 jetons, demandant la réponse exacte « PathScribe AI connection OK »). Le résultat indique Test en cours, Connexion OK ou Échec avec l'erreur. | Sans objet |
| **Effacer la dérogation** | Bouton | Sans objet | Apparaît uniquement dans la vue développeur, où une dérogation personnelle peut être définie. Non affiché à un administrateur. | Sans objet |

#### Où PathScribe conserve les données
Breadcrumb: Accueil > Configuration > Comportement de l'IA

Une carte en lecture seule.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Base de données** | Texte en lecture seule | Sans objet | La région de la base de données, tirée de `/api/config` du serveur. Affiche **Non communiqué** quand le serveur ne la fournit pas (la démonstration n'a pas de serveur). | Non communiqué |
| **Stockage des fichiers (comptes rendus, exports)** | Texte en lecture seule | Sans objet | La région du stockage des fichiers, de la même source. | Non communiqué |
| **Service d'IA** | Texte en lecture seule | Sans objet | La région d'hébergement définie dans les Paramètres du fournisseur d'IA. | Non enregistrée |

#### Politique des fournisseurs d'IA
Breadcrumb: Accueil > Configuration > Comportement de l'IA

Un tableau de règles, une ligne pour la juridiction propre du laboratoire et une pour chaque établissement que vous desservez, plus un contrôle **Ajouter une règle d'établissement**. Une règle d'établissement restreint la règle de sa juridiction. L'événement d'audit d'une modification est `AI_VENDOR_POLICY_CHANGED` (avant et après).

[SCREENSHOT PLACEHOLDER: tab-ai-vendor-policy - Tableau des règles de la politique des fournisseurs d'IA et éditeur de règle]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Juridiction ou établissement** | Texte en lecture seule (établissement affiché comme établissement et juridiction) | Sans objet | Le périmètre de la règle. | La juridiction du laboratoire, plus chaque établissement desservi |
| **Autorisés** | Texte en lecture seule : **Aucune règle : tous les services**, **Tous les services**, ou la liste des services | Sans objet | Ce que la règle permet. | Aucune règle : tous les services |
| **Service en service** | Texte en lecture seule | Sans objet | Affiche le service, le modèle et la région actuellement utilisés et si ce périmètre les autorise : **Autorisé**, **Non autorisé : service**, **Non autorisé : région** ou **Non autorisé : région non enregistrée**. | Sans objet |
| **Actions** : **Modifier**, **Supprimer la règle** | Boutons | Sans objet | **Modifier** ouvre l'éditeur de règle ci-dessous. **Supprimer la règle** supprime la règle, si bien que le périmètre autorise de nouveau tous les services. | Sans objet |
| **Ajouter une règle d'établissement**, **Choisir un établissement…** | Choix parmi les établissements desservis | Facultatif | Commence une règle pour un établissement. | Aucun |
| **Autoriser tous les services** | Case à cocher oui/non | Facultatif | Autorise tous les services. Désactivée, cochez les services à autoriser. | Activé pour une nouvelle règle |
| Services autorisés | Une case à cocher par service d'IA | Obligatoire quand **Autoriser tous les services** est désactivé | Au moins un service doit être autorisé, sinon l'enregistrement est refusé (**Autorisez au moins un service, ou supprimez la règle.**). | Aucun |
| **Régions autorisées pour** (service) | Texte, régions séparées par des virgules, par exemple `eu-west-1, uksouth` | Facultatif | Laissez vide pour autoriser toute région. Les régions sont rognées, converties en minuscules et dédoublonnées. Une entrée vide, ou des régions sur un service non autorisé, sont refusées. | Vide (toute région) |
| **Enregistrer la règle** | Bouton | Sans objet | Enregistre la règle. Le résultat indique **Enregistré** ou la raison du refus. | Sans objet |

#### Configuration de l'orchestrateur
Breadcrumb: Accueil > Configuration > Comportement de l'IA

Une section repliable. Le badge **ACTIVÉ — cliquer pour basculer** ou **DÉSACTIVÉ — cliquer pour basculer** est la valeur par défaut de l'ensemble de l'organisation pour le mode orchestrateur.

[SCREENSHOT PLACEHOLDER: tab-ai-orchestrator - Configuration de l'orchestrateur avec les quatre étapes de génération]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Interrupteur ACTIVÉ/DÉSACTIVÉ | Interrupteur oui/non | Facultatif | La valeur par défaut de l'organisation. Un établissement peut la remplacer avec **Rédaction automatique du compte rendu** (Hériter du paramètre par défaut de l'organisation, Activé pour cet établissement, Désactivé pour cet établissement) dans le Dictionnaire des établissements, onglet **IA et performance**. L'enregistrement exige `config:ai-provider:manage`. | ACTIVÉ |
| Résumé des étapes | Texte en lecture seule, « N étape(s) de génération active(s) sur 4 » | Sans objet | Compte les étapes actives. | 4 sur 4 |
| Cartes d'étape | Lecture seule : nom de l'étape, **ACTIF** ou **DÉSACTIVÉ**, **Instruction IA**, **Champs de contexte** | Sans objet | Quatre étapes fixes s'exécutent dans l'ordre : En-tête administratif et clinique, Prélèvement et description macroscopique, Synthèse des données synoptiques, Examens complémentaires et diagnostic final. Les étapes précédentes fournissent du contexte aux suivantes. | Fixé dans le code |

#### Versions du modèle
Breadcrumb: Accueil > Configuration > Comportement de l'IA

Une section repliable marquée **Administrateurs uniquement** qui contient le panneau des modèles.

[SCREENSHOT PLACEHOLDER: tab-ai-models - Tableau des versions du modèle]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Modèle** | Texte en lecture seule | Sans objet | Le nom du modèle. | Sans objet |
| **Fournisseur** | Texte en lecture seule | Sans objet | Le fabricant du modèle. | Sans objet |
| **Type** | Lecture seule : Macroscopie uniquement, Microscopie uniquement, Macro + Micro, Diagnostic uniquement, Dictée vocale | Sans objet | À quoi sert le modèle. | Sans objet |
| **Précision** | Pourcentage en lecture seule | Sans objet | Le chiffre de référence enregistré pour le modèle. | Sans objet |
| **Dossiers traités** | Nombre entier en lecture seule | Sans objet | Les dossiers que le modèle a traités pour votre organisation. | 0 pour un modèle récemment adopté |
| **Statut** | Lecture seule : Actif, Bêta, Retiré | Sans objet | Un modèle adopté depuis la boutique ForMedrixAI commence en Bêta. | Sans objet |
| **Établissements approuvés** | Liste en lecture seule | Sans objet | Les établissements dont le modèle épinglé est celui-ci. | Sans objet |
| **Par défaut** | Marque en lecture seule | Sans objet | Le modèle par défaut de l'organisation. | Sans objet |
| **Définir par défaut** | Bouton | Sans objet | Fait du modèle le modèle par défaut. Un modèle vocal ne peut pas devenir le modèle par défaut sans une étude rapportée évaluée PASS. | Sans objet |
| **Retirer** | Bouton, puis une confirmation | Sans objet | Retire le modèle. La confirmation nomme les établissements qui lui sont épinglés. Le modèle par défaut ne peut pas être retiré. | Sans objet |
| **Paramètres** | Bouton | Sans objet | Ouvre la fenêtre Paramètres du modèle ci-dessous. | Sans objet |

##### Fenêtre Paramètres du modèle
Breadcrumb: Accueil > Configuration > Comportement de l'IA

[SCREENSHOT PLACEHOLDER: tab-ai-model-settings - Fenêtre Paramètres du modèle]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Réponse la plus longue (jetons)** | Nombre entier de 50 à 8000 | Facultatif | Le maximum que le modèle peut écrire en une réponse. Vide, le paramètre de l'organisation s'applique. | Vide |
| **Seuil de confiance (%)** | Nombre entier de 0 à 100 | Facultatif | Le seuil propre à ce modèle. Vide, le **Seuil de confiance** de l'organisation s'applique. | Vide |

Toute autre valeur est refusée avec « Enter whole numbers within the ranges shown, or leave the field blank ». Ce sont les deux seules dérogations par modèle qui existent.

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. L'onglet est en lecture seule pour une personne qui ne détient aucune de ces quatre capacités : `config:ai-behavior:manage` (paramètres de comportement et **Réinitialiser aux valeurs par défaut**), `config:ai-provider:manage` (paramètres du fournisseur et interrupteur de l'orchestrateur), `config:ai-model:manage` (définir par défaut, mettre à jour, retirer et adopter un modèle) et `config:ai-vendor-policy:manage` (la politique des fournisseurs). Le panneau Fournisseur d'IA exige aussi le rôle admin, pathologiste-admin ou superadmin, ce qui est un contrôle de rôle, et non un contrôle de capacité. Admin et Lab Director détiennent les quatre capacités par défaut grâce aux groupes de configuration, et Superadmin détient tout (sauf `config:ai-prompt:approve`, retirée pour la séparation des tâches). La modification de la politique des fournisseurs est auditée sous `AI_VENDOR_POLICY_CHANGED`. Une modification des paramètres de comportement n'enregistre que le contrôle d'autorisation, pas ce qui a changé.

**Limites connues.**
- `showConfidenceScores`, `macroSuggestions` et `subspecialtyRouting` sont enregistrés et ne sont lus par rien d'autre.
- Les paramètres de comportement et la politique des fournisseurs ont des contrats serveur (`CONFIG_SERVICES_API.md`, `AI_VENDOR_POLICY_API.md` ; modèles dans `MODELS_API.md`). Tant que le serveur n'est pas connecté, ils fonctionnent sur les données de démonstration du navigateur.
- Le libellé, l'ordre et la correspondance des champs des étapes dans la Configuration de l'orchestrateur sont Prévus : l'écran indique « configurable in a future release ».
- Le correcteur orthographique par IA a été retiré et n'a aucun paramètre.
- Aucun paramètre ne désactive à lui seul la recherche de constats critiques par l'IA. Elle suit le fournisseur, la politique des fournisseurs et les [Règles de déclenchement anormal](#screen-abnormal_trigger_rules).
- Le seuil de confiance pour un constat « Anormal » est de 50 (Batch 655). C'est une constante dans le code, pas encore un paramètre ; un laboratoire ne peut donc pas le modifier ici.
- **La fenêtre Codes (Batch 656).** Chaque code médical suggéré est confirmé de deux façons : par la recherche du code lui-même et, en parallèle, par la formulation propre à l'IA ; l'une ou l'autre le confirme. Un code dont la recherche échoue reste hors de la liste et est compté dans une note, comme auparavant. Les vérifications SNOMED CT passent par la route serveur qui détient `UMLS_API_KEY` ; redémarrez le serveur de développement après avoir modifié `.env`.
## Suivi des prélèvements et aide à la macroscopie par vision par ordinateur {#ch5-specimen-vision}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Smart Capture

**Statut :** Non réalisé pour la vision par ordinateur. Deux éléments voisins existent et sont décrits ici pour que personne ne les prenne pour cela.

PathScribe n'a pas de moteur de vision par ordinateur pour les prélèvements. Rien dans le produit ne lit la photographie d'un prélèvement, d'une cassette ou d'une lame pour l'identifier, compter les blocs, mesurer une lésion ou la suivre. Ce qui s'en rapproche et qui existe est ceci.

- **Le dictionnaire des fournisseurs d'imagerie de macroscopie.** Une liste de fournisseurs d'imagerie (par exemple PAX-it!/PAXcam, PathoZoom et MacroPATH, nommés dans le commentaire de l'interface) et la manière de joindre chacun : nom, mode d'authentification du lien (aucun, lien signé, jeton porteur OAuth 2 ou TLS mutuel), l'adresse de base https, et si le fournisseur prend en charge la télépathologie. C'est une catégorie (`gross_imaging`) des [Intégrations fournisseurs](#screen-vendor_integrations) du [Chapitre 4](#ch4), qui en documente les champs. Il ne contient que des adresses et n'effectue aucune analyse d'image. Le contrôle de caméra de macroscopie dans le dossier est une simple prise de photo ; il enregistre l'image dans le dossier lui-même, ce qui est signalé comme non conforme, et son transfert vers cette catégorie de fournisseur est différé.
- **Matériel de macroscopie** ([Chapitre 2](#screen-grossing_hardware)) pour les balances, les caméras et les lecteurs de codes-barres.
- **[Smart Capture](#screen-smart_capture)**, ci-dessous. Malgré son nom, il n'appelle aucun modèle d'IA et n'examine aucune image. C'est un ensemble de règles fixes qui suggère des lignes de facturation.

### Smart Capture {#screen-smart_capture}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Smart Capture

**Statut :** Réalisé (prototype). Il fonctionne sur les données de démonstration et dispose d'un contrat serveur (`SIGNATURES_SMART_CAPTURE_API.md`), et le panneau du dossier porte la mention « Prototype, non validé sur le plan réglementaire ».

**1. Navigation :** onglet **Système** de Configuration > groupe **Matériel et flux de travail du laboratoire**
**2. Élément de maintenance :** Smart Capture

**3. Objectif métier et périmètre.** Smart Capture suggère des lignes de facturation Current Procedural Terminology (CPT) pour un dossier à partir des mots de la description du prélèvement, du nombre de blocs et du nombre de colorations. Les règles sont fixes et versionnées (`sim-rules-1.0`) : SC-LEVEL (88302 à 88309 selon le niveau du prélèvement), SC-SPECIAL (88312), SC-IHC-FIRST et SC-IHC-ADDL (88342 et 88341) et SC-DECAL (88311). Ce n'est ni de l'IA ni de la vision par ordinateur. Le flux est : suggérer, relire (accepter ou rejeter chaque ligne), approuver (un pathologiste confirme) et exporter. Dans la démonstration, l'export va vers un moteur simulé. Cet écran active ou désactive le prototype et enregistre la liste de contrôle de production qui doit être complète avant qu'un export vers un véritable moteur d'interface soit autorisé.

**4. Prérequis et dépendances.** Les règles exigent que CPT soit activé pour la juridiction dans Systèmes de codage. Sans cela, le panneau ne suggère rien et signale `CPT_OFF`.

Setup step: Tier 4, step 8
Requires: [Systèmes de codage](#screen-code_systems)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-smart_capture - Interrupteur du prototype Smart Capture, liste de contrôle de production et verrou d'export]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Proposer le panneau Smart Capture dans la revue de facturation** | Interrupteur oui/non | Facultatif | Désactivé, le panneau Smart Capture n'est pas proposé dans le panneau Facturation du dossier. Audité sous « Smart Capture Prototype Switched ». | Activé |
| **Validation clinique effectuée** | Coche oui/non ; enregistre qui a coché et quand | Facultatif | Élément de la liste de contrôle de production. Décocher l'un des six ferme le verrou d'export. Audité sous « Smart Capture Checklist Changed ». | Non coché |
| **Revue de sécurité effectuée** | Coche oui/non ; enregistre qui et quand | Facultatif | Élément de la liste de contrôle de production. | Non coché |
| **Revue de confidentialité effectuée** | Coche oui/non ; enregistre qui et quand | Facultatif | Élément de la liste de contrôle de production. | Non coché |
| **Revue juridique effectuée** | Coche oui/non ; enregistre qui et quand | Facultatif | Élément de la liste de contrôle de production. | Non coché |
| **Revue de la politique de facturation et de codage effectuée** | Coche oui/non ; enregistre qui et quand | Facultatif | Élément de la liste de contrôle de production. | Non coché |
| **Système récepteur réel testé** | Coche oui/non ; enregistre qui et quand | Facultatif | Élément de la liste de contrôle de production. | Non coché |
| **Autoriser l’export vers un vrai moteur d’interface** | Interrupteur oui/non | Facultatif | Désactivé tant que les six coches ne sont pas posées. Désactivé, l'export va uniquement vers le moteur simulé. Audité sous « Smart Capture Production Gate Changed ». | Désactivé |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier un paramètre : `config:smart-capture:manage` (Admin et Lab Director par défaut). Dans le dossier, `billing:smart-capture:review`, `billing:smart-capture:approve` et `billing:smart-capture:send` vont au rôle Pathologist. Chaque modification ci-dessus est auditée.

**Limites connues.** Les règles sont un prototype et n'ont pas été validées sur le plan réglementaire ; les coches enregistrent que quelqu'un déclare la revue effectuée et ne réalisent aucune revue. Rien n'utilise l'IA ou des images. L'export vers un véritable moteur d'interface n'est qu'un verrou : aucun système récepteur réel n'est connecté.

## Moteur de TALN et de structuration automatique {#ch5-nlp}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Extraction IA de l'historique

**Statut :** Partiel. Des fonctions de langage isolées existent. Un moteur de TALN ou de structuration automatique autonome n'existe pas, et il n'y a pas d'écran pour en configurer un.

Ce qui existe aujourd'hui, chaque élément envoyant du texte au modèle choisi dans [Comportement de l'IA (onglet)](#screen-tab-ai) et étant soumis à la politique des fournisseurs :

- **Extraction de l'historique** ([Extraction IA de l'historique](#screen-history_extraction)) : lit des dossiers antérieurs et remplit des champs structurés à titre consultatif.
- **Suggest Synoptic from Narrative** : sur la page de compte rendu, remplit les champs synoptiques à partir du récit. Chaque suggestion porte une confiance de 0 à 100 et une citation du texte source. Fonctionne en mode Orchestrateur et en mode Assistance.
- **Generate Narrative from Synoptic** : sur la page de compte rendu, rédige le récit à partir des données synoptiques. Mode Orchestrateur uniquement.
- **Affectation de modèle synoptique** : le modèle propose quel modèle synoptique un dossier exige, avec un seuil de confiance fixe de 60.
- **Recherche de constats critiques** à la validation : une recherche tenant compte des négations, sur le texte du récit uniquement.
- **Affinage de la dictée** (onglet Voix, [Chapitre 4](#screen-tab-voice)) et **suggestion de macros** (onglet Macros, [Chapitre 4](#screen-tab-macros)).

Non réalisé : un pipeline général de texte libre vers données structurées au-delà des fonctions ci-dessus, un écran pour en configurer un, et tout modèle de TALN clinique entraîné propre à PathScribe. Le Computational Sidecar précédent a été retiré le 18 octobre 2026.

### Extraction IA de l'historique {#screen-history_extraction}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Extraction IA de l'historique

**Statut :** Partiel. L'écran et les règles fonctionnent sur les données de démonstration et le contrat serveur est rédigé (`HISTORY_AI_EXTRACTION_API.md`), mais rien n'a été essayé sur un véritable serveur. Le point d'accroche de synthèse pour le mode Assistance n'est pas réalisé.

**1. Navigation :** onglet **Système** de Configuration > groupe **Administration et conformité**
**2. Élément de maintenance :** Extraction IA de l'historique

**3. Objectif métier et périmètre.** Quand un pathologiste ouvre un dossier antérieur, le modèle peut lire son Diagnostic final et son texte microscopique et proposer des valeurs pour les champs d'un modèle structuré. Les résultats portent la mention « Extrait par l'IA, non vérifié » et sont purement consultatifs : les comptes rendus, l'impression, le registre, la facturation, les règles et les exports ne les utilisent jamais (un test du code le garantit). Il effectue deux appels au modèle par dossier (choisir le modèle, puis remplir les champs) et écarte tout champ dont la confiance est inférieure à 30 (fixé dans le code). Les résultats sont mis en cache par une empreinte du texte source, et une exécution en échec est retentée à la prochaine ouverture du dossier. L'événement d'audit `HISTORY_EXTRACTION_RUN` ne contient aucun texte de patient.

**4. Prérequis et dépendances.** La fonctionnalité exige un service d'IA opérationnel et la liste des établissements. Sans service d'IA, ou avec un service que la politique des fournisseurs refuse, rien n'est extrait et le dossier n'affiche aucune donnée consultative.

Setup step: Tier 4, step 7
Requires: [Comportement de l'IA (onglet)](#screen-tab-ai), [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-history_extraction - Périmètre de l'extraction IA de l'historique, état et carte de précision]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **S'applique à** | Choix : **Entreprise (tous les établissements)** ou un établissement actif | Obligatoire | Le périmètre que vous consultez et modifiez. | Entreprise |
| Carte d'état | **Activé** ou **Désactivé** en lecture seule | Sans objet | Le paramètre en vigueur pour le périmètre choisi. Résolu comme le paramètre propre à l'établissement, puis le paramètre de l'entreprise, puis désactivé. | Désactivé |
| Étiquette de source | Lecture seule : **Défaut intégré**, **Réglage de l'entreprise** ou **Réglage propre à cet établissement** | Sans objet | D'où vient l'état. | Défaut intégré |
| **Activer** / **Désactiver** | Bouton | Sans objet | Définit l'état pour le périmètre choisi. | Sans objet |
| **Utiliser le réglage de l'entreprise** | Bouton | Sans objet | Apparaît uniquement quand l'établissement choisi a sa propre entrée. La supprime pour que l'établissement suive l'entreprise. | Sans objet |
| **Précision à ce jour** | Carte en lecture seule : comptes rendus lus, champs extraits, signalés comme erronés | Sans objet | Compte, pour le périmètre choisi, combien de comptes rendus ont été lus, combien de champs ont été extraits et combien un pathologiste a signalés comme erronés. | 0 |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. Modifier : `config:history-extraction:manage` (Admin et Lab Director). Dans le dossier, `ai:history-extraction:run` et `ai:history-extraction:flag` vont à Pathologist, Fellow et Resident, et `case:clinical-history:record` va à ces trois rôles et à Pathologist Assistant. La politique des fournisseurs s'applique et refuse un service non autorisé avec `vendorNotAllowed`. L'exécution d'une extraction est auditée sous `HISTORY_EXTRACTION_RUN`.

**Limites connues.** Consultatif uniquement par conception. Le point d'accroche de synthèse du mode Assistance est Non réalisé. Le seuil de confiance de 30 points n'a aucun paramètre.

## Analyse d'images de pathologie numérique par IA {#ch5-dp-ai}
Breadcrumb: Accueil > Configuration > Système > Matériel et flux de travail du laboratoire > Intégrations fournisseurs

**Statut :** Partiel. La réception et l'affichage des résultats de produits de fournisseurs existent. La détection de tumeurs, le comptage de cellules et le score de biomarqueurs effectués par PathScribe lui-même sont **Non réalisés**.

PathScribe n'analyse pas d'images. Il enregistre ce que rapporte le produit d'un fournisseur. Ce qui se rapproche le plus d'un module d'analyse par IA est la chaîne suivante, configurée dans d'autres chapitres :

- **Dictionnaire des fournisseurs** (catégorie IA de pathologie numérique dans les [Intégrations fournisseurs](#screen-vendor_integrations), [Chapitre 4](#ch4)) : nom du fournisseur, nom du produit, modalité (texte libre), une case **Homologué FDA** (un enregistrement ponctuel d'un administrateur, pas une vérification) et un interrupteur d'activation. Il est initialisé avec Paige Prostate, Ibex Prostate Detect, PathAI AISight Dx, Proscia Concentriq AP-Dx, Hologic Genius Digital Diagnostics (cytologie cervicale) et BD FocalPoint GS (marqué non homologué, car il relève d'une approbation préalable à la commercialisation et non d'une autorisation 510(k)). Les fournisseurs de visionneuses de lames (modèles d'adresses de lancement) et les lots de numérisation d'images de lames entières se trouvent à côté.
- **Enregistrement de résultat** : un statut (demandé, terminé, en échec ou expiré), des constats (une étiquette en texte libre, une confiance de 0 à 1 et une région facultative), des résultats de biomarqueurs en texte libre (nom et valeur), et un rang de tri des lames avec une recommandation de relecture dans le style des quintiles de BD.
- **Intégration** : un résultat de fournisseur arrive comme un événement entrant du moteur d'interfaces. Dans la démonstration, la finalisation d'un lot Imagerie cytologique place automatiquement une demande de dépistage par IA auprès du premier fournisseur actif de cytologie cervicale.
- **Badge de la liste de travail de cytologie et invite de concordance** : la réponse du pathologiste est enregistrée. Un désaccord ouvre une non-conformité et ne lance jamais une action corrective de lui-même.
- **Onglet Discordance de l'IA de l'AQ** ([Chapitre 4](#screen-quality-assurance)) : un rapport de discordance par fournisseur et un rapport des résultats bloqués. Le délai d'expiration d'un résultat bloqué y est défini (heures entières de 1 à 720, 24 par défaut).

Non réalisé : un détecteur de tumeurs, un compteur de cellules ou un outil de score de biomarqueurs propres à PathScribe, et tout contrôle qui règle l'analyse d'un fournisseur. Les véritables intégrations de fournisseurs ne sont pas finalisées. Le contrat est `DIGITAL_PATHOLOGY_API.md`. Configuration connexe : Instrumentation de cytologie ([Chapitre 3](#screen-cytology_instrumentation)).

## Règles de contrôle qualité intelligent et de détection d'anomalies diagnostiques {#ch5-smart-qc}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Règles de discordance clinique

**Statut :** Réalisé pour les écrans de règles. Démonstration pour le côté serveur des Instructions de l'IA. Il n'existe pas de module unique de « détection d'anomalies » ; les contrôles ci-dessous sont distincts et chacun est documenté là où il est configuré.

- **Vérification de discordance clinique** ([Règles de discordance clinique](#screen-clinical_mismatch_rules) et [Instructions de l'IA](#screen-ai_instructions), ce chapitre) : le modèle compare l'indication clinique et les antécédents avec le diagnostic, et les règles décident de ce que fait un résultat.
- **Règles de déclenchement anormal** ([Chapitre 3](#screen-abnormal_trigger_rules)) : des règles distinctes avec les niveaux de gravité Anormal, Critique et Malin. Les règles initiales sont Statut des marges, Invasion périnerveuse, Statut des ganglions lymphatiques et Invasion lymphovasculaire.
- **Recherche de constats critiques dans le récit** : le modèle analyse le récit à la validation, en tenant compte des négations, et n'envoie que le texte du récit. Elle n'a aucun paramètre propre.
- **Politique de tendance de discordance de l'AQ** ([Chapitre 4](#screen-qa_trend_policy)), l'onglet **Discordance de l'IA** ([Chapitre 4](#screen-quality-assurance)) et les **Règles CQ de cytologie** ([Chapitre 4](#screen-cytology_qc_rules)).

Non réalisé : un détecteur d'anomalies statistique ou par apprentissage automatique qui surveille les délais de rendu, les volumes ou les résultats d'un dossier à l'autre.

### Règles de discordance clinique {#screen-clinical_mismatch_rules}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Règles de discordance clinique

**Statut :** Réalisé. Il fonctionne sur les données de démonstration et dispose d'un contrat serveur (`CONFIG_SERVICES_API.md`, `/api/clinical/clinical-mismatch-rule/*`).

**1. Navigation :** onglet **Système** de Configuration > groupe **Administration et conformité**
**2. Élément de maintenance :** Règles de discordance clinique

**3. Objectif métier et périmètre.** À la validation, le modèle compare ce que le clinicien a communiqué au laboratoire avec ce que le pathologiste a diagnostiqué, et renvoie un type de discordance et une confiance de 0 à 100. Ces règles transforment cette confiance en un résultat. En dessous du seuil d'affichage, le résultat est écarté. Du seuil d'affichage jusqu'au seuil d'action, le risque est faible : le pathologiste voit une alerte et le journal d'AQ l'enregistre. À partir du seuil d'action, l'action de la règle s'applique : **Bloquer** en fait un risque élevé et retient la validation jusqu'à l'enregistrement d'une décision, **Avertir** alerte, et **Consigner** l'enregistre. Les décisions sont enregistrées comme RESOLVED, UNRESOLVED ou DEFERRED. Le flux complet se trouve dans `docs/product/CLINICAL_MISMATCH_CHECK.md`. Une règle par type de discordance couvre tous les types de prélèvement, et vous pouvez ajouter une règle pour un type de prélèvement.

**4. Prérequis et dépendances.** La vérification appelle le service d'IA configuré dans l'onglet Comportement de l'IA, et les règles par type de prélèvement puisent dans les types de prélèvement actifs. Sans service d'IA, ou avec un service que la politique des fournisseurs refuse, la vérification ne s'exécute pas. Si vous ignorez le Dictionnaire des spécimens, la liste **Ajouter une règle pour un type de prélèvement** est vide.

Setup step: Tier 4, step 6
Requires: [Comportement de l'IA (onglet)](#screen-tab-ai), [Dictionnaire des spécimens](#screen-specimens)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-clinical_mismatch_rules - Tableau des Règles de discordance clinique et contrôle d'ajout de règle]

**6. Référence des champs.** Les seuils s'enregistrent quand vous quittez la zone ou appuyez sur Entrée. L'action s'enregistre quand vous la choisissez.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Type de discordance** | Lecture seule : malignité inattendue, cause du décès, siège ou organe, malignité attendue absente, autre | Sans objet | Une ligne par type pour tous les types de prélèvement, plus les éventuelles lignes par type de prélèvement. | Sans objet |
| **Type de prélèvement** | Lecture seule : tous les types de prélèvement, ou un type du Dictionnaire des spécimens | Sans objet | Le périmètre de la ligne. | Tous les types de prélèvement |
| **Alerte à partir de** | Nombre entier de 0 à 100 (seuil d'affichage, %) | Obligatoire | Les résultats inférieurs à ce seuil sont supprimés. | 60 pour chaque type |
| **Action à partir de** | Nombre entier de 0 à 100 (seuil d'action, %) | Facultatif | Doit être au moins égal à **Alerte à partir de**. Vide, l'action commence à la valeur de **Alerte à partir de**. | malignité inattendue 70, cause du décès 70, siège ou organe 65, malignité attendue absente vide, autre 65 |
| **Action** | Choix : **Bloquer**, **Avertir**, **Consigner** | Obligatoire | Ce qui se passe à partir de **Action à partir de**. | malignité inattendue Bloquer, cause du décès Bloquer, siège ou organe Bloquer, malignité attendue absente Consigner, autre Consigner |
| **Supprimer** | Bouton | Sans objet | Supprime une règle par type de prélèvement. La règle tous prélèvements d'un type ne peut pas être supprimée. | Sans objet |
| **Ajouter une règle pour un type de prélèvement** | Choix du type et choix d'un type de prélèvement actif | Facultatif | Crée une règle qui commence comme une copie de la règle tous types de ce type de discordance. Une seconde règle pour le même type de discordance et le même type de prélèvement est refusée. | Aucun |
| **Amendements, corrections et addendums** | Case à cocher oui/non | Facultatif | Activée, « Une discordance à haut risque retient la diffusion jusqu'à l'enregistrement d'une décision » s'applique aussi aux amendements, corrections et addendums. | Activé |

Une saisie refusée affiche l'un de ces problèmes : seuil hors limites, action inférieure à l'affichage, doublon, suppression de la règle par défaut impossible, action inconnue ou catégorie inconnue.

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`. La voir : `config:clinical-mismatch-rules:view` (Pathologist, QA Reviewer et Lab Director par défaut). La modifier : `config:clinical-mismatch-rules:manage`, qui exige `view` et n'a aucun rôle par défaut ; accordez-la donc délibérément. Sans `manage`, l'écran est en lecture seule. Les modifications sont auditées sous `CLINICAL_MISMATCH_RULE_CHANGED`. `case:clinical-mismatch:record` (enregistrer une décision à la validation) va à Pathologist et Fellow. Séparation des tâches : personne ne peut détenir `config:clinical-mismatch-rules:manage` avec `config:ai-prompt:approve`, et Superadmin n'est pas exempté.

**Limites connues.** Le modèle peut se tromper ; les seuils sont le moyen dont dispose le laboratoire pour maîtriser à quel point un pathologiste est interrompu. Une discordance à la validation est consultative, sauf si l'action d'une règle est **Bloquer**.

## Gouvernance de l'IA, seuils avec intervention humaine et calibration {#ch5-governance}
Breadcrumb: Accueil > Configuration > Études de validation

**Statut :** Réalisé pour la gouvernance et les seuils. Calibration des poids : n'existe pas.

Les contrôles de PathScribe maintiennent une personne entre le modèle et le dossier.

- **Instructions approuvées.** Le texte que la vérification de discordance clinique envoie au modèle est versionné, et une seconde personne doit l'approuver ([Instructions de l'IA](#screen-ai_instructions)).
- **Preuves.** Une étude de validation mesure à quelle fréquence les pathologistes acceptent sans modification les suggestions du modèle, et une évaluation PASS est ce qui permet à un établissement d'épingler un modèle ou à un modèle vocal de devenir le modèle par défaut ([Études de validation](#screen-tab-validation)).
- **Seuils.** Chaque seuil du produit est listé ici.

| Seuil | Valeur | Où il est défini |
|---|---|---|
| Seuil de confiance (suggestions) | 0 à 100, 75 par défaut | Onglet **Comportement de l'IA** ; dérogation par modèle dans **Paramètres du modèle** |
| Insertion automatique au seuil ou au-delà | Désactivée par défaut | Onglet **Comportement de l'IA**, **Avancé** |
| Seuils d'affichage et d'action de la discordance clinique | 0 à 100, affichage 60 par défaut | [Règles de discordance clinique](#screen-clinical_mismatch_rules) |
| Affectation de modèle synoptique et de macroscopie | Fixe, 60 | Code ; aucun paramètre |
| Seuil de champ de l'extraction de l'historique | Fixe, 30 | Code ; aucun paramètre |
| Taux d'acceptation cible d'une étude et ratio moyen maximal de modification | 70 % et 30 % par défaut | [Études de validation : Études](#screen-validation-studies) |
| Résultat de dépistage par IA bloqué | Heures entières de 1 à 720, 24 par défaut | Onglet **Discordance de l'IA** de l'AQ ([Chapitre 4](#screen-quality-assurance)) |

**Calibration des poids et paramètres réservés au personnel interne.** Il n'existe nulle part dans PathScribe de paramètre de calibration, d'ajustement fin ou de recalibration des poids d'un modèle, et aucun paramètre d'IA n'est limité au personnel de ForMedrixAI. Une recherche dans le code ne trouve que la calibration des équipements et de la cytologie, sans rapport. Aucune capacité du catalogue n'est marquée réservée à la plateforme pour l'IA. Deux faits connexes méritent d'être connus. La clé d'API est renouvelée par le support ForMedrixAI dans le coffre de secrets du serveur, et il n'y a pas d'écran pour cela. Le catalogue de modèles que propose la boutique ForMedrixAI appartient à la plateforme, et il n'y a pas non plus d'écran du personnel pour le gérer. Comme aucun paramètre de ce genre n'existe, ce chapitre n'a aucune section marquée ForMedrixAI internal only.
### Instructions de l'IA {#screen-ai_instructions}
Breadcrumb: Accueil > Configuration > Système > Administration et conformité > Instructions de l'IA

**Statut :** Démonstration. Les règles s'exécutent dans le navigateur sur un stockage injecté et le service n'a pas de route serveur propre (`HTTP_SERVICES_REMAINING.md`).

**1. Navigation :** onglet **Système** de Configuration > groupe **Administration et conformité**
**2. Élément de maintenance :** Instructions de l'IA

**3. Objectif métier et périmètre.** La vérification de discordance clinique envoie au modèle un texte d'instructions. Cet écran contrôle ce texte pour chacune de trois disciplines : Chirurgicale, Cytologie et Autopsie (affichées sous forme d'onglets). Une modification passe par la rédaction, puis par l'approbation d'une autre personne, de sorte que nul ne peut changer seul ce que l'on dit au modèle. Le bloc de données du dossier et le format de réponse JSON sont fixés dans le code et ne peuvent pas être modifiés ici. Seule la version approuvée est utilisée. La version 0 est le texte intégré de PathScribe.

**4. Prérequis et dépendances.** Le texte est utilisé par la vérification sur le service de l'onglet Comportement de l'IA ; le service d'IA se configure donc d'abord. Sans cela, un texte approuvé n'a rien sur quoi s'exécuter, et **Tester ce texte** signale l'IA comme indisponible.

Setup step: Tier 4, step 5
Requires: [Comportement de l'IA (onglet)](#screen-tab-ai)
Unlocks: [Règles de discordance clinique](#screen-clinical_mismatch_rules)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: system-ai_instructions - Onglets de discipline des Instructions de l'IA avec les cartes En vigueur, En attente d'approbation, Modifier, Tester et Historique]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Onglets de discipline | Choix : Chirurgicale, Cytologie, Autopsie | Obligatoire | Chaque discipline a son propre texte et son propre historique. | Chirurgicale |
| **En vigueur : version N** | Texte en lecture seule | Sans objet | La version approuvée que la vérification utilise actuellement. | Version 0 (texte intégré) |
| **En attente d'approbation** | Texte en lecture seule | Sans objet | La version en attente, le cas échéant. Une nouvelle modification retire la précédente version en attente. | Aucune |
| **Approuver** | Bouton | Sans objet | Fait de la version en attente celle en vigueur. Refusé à toute personne ayant modifié le texte depuis la dernière approbation (SELF_APPROVAL). Exige `config:ai-prompt:approve`. | Sans objet |
| Motif du rejet | Texte | Obligatoire pour rejeter | Le motif est conservé dans l'historique. | Aucun |
| **Rejeter** | Bouton | Sans objet | Désactivé tant qu'un motif n'est pas saisi. La version approuvée reste en vigueur. | Sans objet |
| Modifier le texte | Zone de texte, jusqu'à 6000 caractères, avec un compteur | Obligatoire | Ne doit pas être vide, ne pas dépasser 6000 caractères et différer du texte actuel (sinon : vide, trop long ou inchangé). | Le texte en vigueur |
| **Enregistrer pour approbation** | Bouton | Sans objet | Crée une nouvelle version en attente. | Sans objet |
| **Indication clinique** | Texte | Facultatif | Donnée d'exemple pour le test. Remplie à partir d'un exemple intégré. | Texte d'exemple |
| **Antécédents cliniques** | Texte | Facultatif | Donnée d'exemple pour le test. | Texte d'exemple |
| **Constatations** | Texte | Facultatif | Donnée d'exemple pour le test. | Texte d'exemple |
| **Diagnostic** | Texte | Facultatif | Donnée d'exemple pour le test. | Texte d'exemple |
| **Constatation maligne confirmée par le pathologiste** | Case à cocher oui/non | Facultatif | Donnée d'exemple pour le test. | Désactivé |
| **Tester ce texte** | Bouton | Sans objet | Exécute une fois le texte en attente ou modifié sur l'exemple. Le résultat est discordance, aucune, non autorisé (par la politique des fournisseurs) ou indisponible. | Sans objet |
| Historique | Liste en lecture seule | Sans objet | Chaque version avec son statut : en attente, approuvée, rejetée, remplacée ou retirée. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : `screen:configuration:open`, plus `config:ai-prompt:edit` ou `config:ai-prompt:approve`. Lister les versions exige `config:ai-prompt:view` (QA Reviewer et Lab Director). `config:ai-prompt:edit` n'a aucun rôle intégré et exige `view`. `config:ai-prompt:approve` va uniquement à Lab Director et est refusée à Superadmin ; elle exige `view`. Superadmin détient `view` et `edit`. Séparation des tâches : `config:ai-prompt:approve` ne peut pas être détenue avec `config:clinical-mismatch-rules:manage`. Audité sous `AI_PROMPT_EDITED`, `AI_PROMPT_APPROVED` et `AI_PROMPT_REJECTED`.

**Limites connues.** Le côté serveur est Non réalisé. Une personne qui ne détient que `view`, comme un QA Reviewer, ne peut pas ouvrir l'écran bien que la liste se chargerait pour elle.

### Études de validation (onglet) {#screen-tab-validation}
Breadcrumb: Accueil > Configuration > Études de validation

**Statut :** Réalisé. Il fonctionne sur les données de démonstration et dispose d'un contrat serveur (`QUALITY_API.md`, `/api/validation-studies/...`).

**1. Navigation :** onglet **Études de validation** de Configuration
**2. Élément de maintenance :** Études de validation (l'onglet entier)

**3. Objectif métier et périmètre.** Une étude de validation rassemble des preuves qu'un modèle d'IA fonctionne sur vos propres dossiers. Les pathologistes travaillent comme d'habitude ; à la validation, PathScribe enregistre, pour chaque suggestion de l'IA, si elle a été acceptée sans modification et dans quelle mesure elle a été modifiée. Les signaux sont désidentifiés. À la clôture de l'étude, le rapport évalue le modèle, et seule une évaluation PASS permet à un établissement d'épingler ce modèle. L'onglet comporte trois sous-onglets, **Études**, **Tableau de bord** et **Rapports**, choisis par `?section=studies`, `dashboard` ou `reports`. Les études sont consultatives : `validationMode` est toujours consultatif. Un bandeau le dit, et un bouton **Comment cela fonctionne — avec un exemple** explique le processus.

**4. Prérequis et dépendances.** Une étude valide un modèle choisi dans l'onglet Comportement de l'IA et inscrit des établissements du Dictionnaire des établissements. Si vous ignorez les modèles et les établissements, le formulaire d'étude n'a rien à proposer.

Setup step: Tier 4, step 2
Requires: [Comportement de l'IA (onglet)](#screen-tab-ai), [Dictionnaire des établissements](#screen-facility-dictionary)
Unlocks: [Études de validation : Études](#screen-validation-studies)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: tab-validation - Onglet Études de validation avec le bandeau consultatif et les trois sous-onglets]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Bandeau consultatif | Texte en lecture seule | Sans objet | Indique qu'une étude est consultative. | Sans objet |
| **Comment cela fonctionne — avec un exemple** | Bouton à bascule | Facultatif | Affiche ou masque l'explication détaillée. | Masquée |
| Sous-onglets **Études**, **Tableau de bord**, **Rapports** | Choix | Obligatoire | Ouvre l'écran correspondant ci-dessous. | Études |

**7. Autorisations.** L'onglet n'apparaît que pour une personne dont le rôle est admin, pathologiste-admin ou superadmin. C'est un contrôle de rôle, et non un contrôle de capacité. À l'intérieur, l'onglet est en lecture seule sans `config:validation-studies:manage` et `validation:approval:record`. Admin et Lab Director détiennent les deux par le groupe de configuration de la qualité. Le rôle Lab Director ne figure pas dans le contrôle de rôle ; il détient donc les capacités mais ne peut pas ouvrir l'onglet.

**Limites connues.** Voir [Études de validation : Études](#screen-validation-studies).

### Études de validation : Études {#screen-validation-studies}
Breadcrumb: Accueil > Configuration > Études de validation > Études

**Statut :** Réalisé.

**1. Navigation :** onglet **Études de validation** de Configuration > sous-onglet **Études**
**2. Élément de maintenance :** Études

**3. Objectif métier et périmètre.** La liste des études et le formulaire pour en créer une. Une étude passe par les états brouillon, en attente d'approbation, approuvée, active, clôturée et rapportée. Les boutons dépendent de l'état : un brouillon a **Modifier**, **Soumettre pour examen** et **Supprimer** ; une étude en attente a **Enregistrer l'approbation** ; une étude approuvée a **Activer** (refusé sans référence CER) ; une étude active a **Clôturer l'étude**.

**4. Prérequis et dépendances.** Le formulaire d'étude choisit un modèle de l'onglet Comportement de l'IA, des établissements actifs et des pathologistes inscrits (filtrés selon les établissements choisis), et facultativement des modèles de compte rendu publiés. Si vous ignorez les médecins, la liste **Pathologistes inscrits** est vide et une étude ne peut pas être enregistrée. Les modèles publiés se configurent au [Chapitre 6](#ch6) ; s'il n'y en a aucun, laissez **Modèles de rapport** vide pour inclure tous les modèles.

Setup step: Tier 4, step 3
Requires: [Études de validation (onglet)](#screen-tab-validation), [Comportement de l'IA (onglet)](#screen-tab-ai), [Dictionnaire des établissements](#screen-facility-dictionary), [Médecins](#screen-physicians)
Unlocks: [Études de validation : Rapports](#screen-validation-reports), [Études de validation : Tableau de bord](#screen-validation-dashboard)

**5. Écran.**

[SCREENSHOT PLACEHOLDER: validation-studies - Liste des études de validation avec Nouvelle étude]

**6. Référence des champs.**

#### Formulaire Nouvelle étude / Modifier l'étude
Breadcrumb: Accueil > Configuration > Études de validation > Études

[SCREENSHOT PLACEHOLDER: validation-studies-new - Formulaire Nouvelle étude]

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Nom de l'étude** | Texte | Obligatoire | Le nom affiché dans la liste et sur le rapport. | Aucun |
| **Description** | Texte | Facultatif | Objet de l'étude. | Aucun |
| **Modèle d'IA en cours de validation** | Choix de modèles | Obligatoire | Verrouillé à la modification. Un lien **Parcourez la boutique ForMedrixAI** (nouvelles études uniquement) ouvre la fenêtre de la boutique ci-dessous. | Aucun |
| **Taux d'acceptation cible** | Curseur de 50 % à 100 %, pas de 5 | Obligatoire | La part de suggestions acceptées sans modification qui vaut un PASS. | 70 % |
| **Ratio moyen d'édition maximal** | Curseur de 10 % à 90 %, pas de 5 | Obligatoire | Le maximum dont les pathologistes peuvent modifier les suggestions, en moyenne, pour un PASS. | 30 % |
| **Date de début** | Date | Obligatoire | Quand l'étude commence. | Aujourd'hui |
| **Référence CER / éthique** | Texte | Facultatif | Affichée sur le formulaire mais non enregistrée. La référence est enregistrée à l'étape d'approbation. | Aucun |
| **Établissements participants** | Choix d'établissements actifs, plusieurs | Obligatoire | Les signaux ne comptent que pour ceux-ci. | Aucun |
| **Pathologistes inscrits** | Choix de pathologistes, plusieurs, filtrés selon les établissements choisis | Obligatoire | Seules leurs validations génèrent des signaux. Le premier choisi devient l'investigateur principal ; il n'y a pas de champ pour cela. | Aucun |
| **Modèles de rapport** | Choix de modèles publiés, plusieurs | Facultatif | Vide signifie tous les modèles. | Tous les modèles |

#### Fenêtre Soumettre pour examen éthique / CER
Breadcrumb: Accueil > Configuration > Études de validation > Études

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Nom du comité d'éthique / CER** | Texte | Obligatoire | Le comité auquel l'étude est soumise. | Aucun |
| **Soumis par** | Texte | Obligatoire | Qui l'a soumise. | Aucun |
| **Date d'examen prévue** | Date | Facultatif | Quand une décision est attendue. | Aucun |
| **Notes pour le comité** | Texte | Facultatif | Notes libres. | Aucun |

#### Fenêtre Enregistrer l'approbation du comité
Breadcrumb: Accueil > Configuration > Études de validation > Études

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Numéro de référence CER / éthique** | Texte | Obligatoire | Sans lui, l'étude ne peut pas être activée. | Aucun |
| **Approuvé par** | Texte | Obligatoire | La personne ou l'instance qui approuve. | Aucun |
| **Date d'approbation** | Date | Obligatoire | La date d'approbation. | Aujourd'hui |
| **Référence du procès-verbal du comité** | Texte | Facultatif | Où le procès-verbal est classé. | Aucun |
| **Conditions liées à l'approbation** | Texte | Facultatif | Les éventuelles conditions. | Aucun |

#### Fenêtre Boutique ForMedrixAI
Breadcrumb: Accueil > Configuration > Études de validation > Études

Liste les modèles que ForMedrixAI a publiés après ses propres tests de régression et que votre organisation n'a pas adoptés. Chaque ligne indique le modèle, sa date de publication et le chiffre de référence de ForMedrixAI, ainsi qu'un bouton **Adopter**.

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| **Adopter** | Bouton | Sans objet | Ajoute le modèle à votre organisation en Bêta, jamais par défaut, avec zéro dossier, jusqu'à ce que votre propre étude le confirme. Refus : boutique sans licence, aucune organisation, absent du catalogue, déjà adopté. | Sans objet |

**7. Autorisations.** `config:validation-studies:manage` couvre la création, la mise à jour, la soumission pour examen, l'activation, la clôture et la suppression. `validation:approval:record` couvre l'enregistrement de l'approbation du comité. Adopter un modèle exige `config:ai-model:manage`. Admin et Lab Director détiennent par défaut les deux premières. Les événements d'étude sont audités sous `validation_study_created`, `_submitted`, `_approval_recorded`, `_activated`, `_closed` et `_deleted`. L'enregistrement d'une modification consigne `validation_study_created`, et l'activation enregistre le nom littéral `admin` comme personne.

**Limites connues.** Le contrôle de licence de la boutique est une simulation qui réussit toujours, et l'autorisation d'abonnement est un chantier ouvert (PS-59). La référence CER du formulaire d'étude n'est pas enregistrée. Le formulaire n'enregistre pas de second relecteur, seulement un nom de comité.

### Études de validation : Tableau de bord {#screen-validation-dashboard}
Breadcrumb: Accueil > Configuration > Études de validation > Tableau de bord

**Statut :** Réalisé.

**1. Navigation :** onglet **Études de validation** de Configuration > sous-onglet **Tableau de bord**
**2. Élément de maintenance :** Tableau de bord

**3. Objectif métier et périmètre.** Une vue en lecture seule de l'avancement d'une étude en cours ou clôturée. Servez-vous-en pour suivre le taux d'acceptation avant la clôture de l'étude.

**4. Prérequis et dépendances.** Elle affiche des données dès qu'une étude est active et que des pathologistes ont validé des dossiers. Sans étude active, la liste des études est vide.

Setup step: Reference, not part of setup
Requires: [Études de validation : Études](#screen-validation-studies)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: validation-dashboard - Tableau de bord de validation avec le sélecteur d'étude et le tableau de performance]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Sélecteur d'étude | Choix d'études actives ou clôturées | Obligatoire | Choisit l'étude affichée. | La première étude |
| Cas capturés | Nombre entier en lecture seule | Sans objet | Dossiers avec au moins un signal. | 0 |
| Signaux de section | Nombre entier en lecture seule | Sans objet | Suggestions enregistrées à la validation. | 0 |
| Taux d'acceptation par rapport à la cible | Pourcentage en lecture seule | Sans objet | Comparé au **Taux d'acceptation cible** de l'étude. | Sans objet |
| Accepté sans modification | Pourcentage en lecture seule | Sans objet | Suggestions conservées telles quelles. | Sans objet |
| **Section**, **Signaux**, **Acceptation**, **Ratio d'édition moyen**, **Modification la plus fréquente** | Colonnes du tableau | Sans objet | Performance par section de compte rendu. | Sans objet |
| Avis consultatif | Texte en lecture seule | Sans objet | Indique que les chiffres sont consultatifs. | Sans objet |

**7. Autorisations.** Ouvrir l'écran : les mêmes règles d'onglet que [Études de validation (onglet)](#screen-tab-validation). Rien sur la page ne modifie de données.

**Limites connues.** Aucune connue.

### Études de validation : Rapports {#screen-validation-reports}
Breadcrumb: Accueil > Configuration > Études de validation > Rapports

**Statut :** Réalisé.

**1. Navigation :** onglet **Études de validation** de Configuration > sous-onglet **Rapports**
**2. Élément de maintenance :** Rapports

**3. Objectif métier et périmètre.** Produit le rapport imprimé qui évalue une étude clôturée. L'évaluation est PASS quand le taux d'acceptation est au moins égal à la cible et que le ratio moyen d'édition est au plus égal au maximum ; CONDITIONAL PASS quand le taux d'acceptation atteint au moins 85 % de la cible ; sinon FURTHER REVIEW. **Générer et imprimer le rapport** ouvre une fenêtre d'impression, enregistre la sortie dans la piste d'audit, fait passer l'étude à rapportée et enregistre l'évaluation finale une seule fois. L'évaluation n'est jamais recalculée ensuite. Seule une étude rapportée évaluée PASS, dont l'établissement figure parmi les participants, permet à cet établissement d'épingler le modèle comme sa dérogation d'IA.

**4. Prérequis et dépendances.** Un rapport exige une étude clôturée. Si vous ne la clôturez pas, l'étude n'apparaît pas dans la liste.

Setup step: Tier 4, step 4
Requires: [Études de validation : Études](#screen-validation-studies)
Unlocks: Aucun.

**5. Écran.**

[SCREENSHOT PLACEHOLDER: validation-reports - Aperçu du rapport de validation et Générer et imprimer le rapport]

**6. Référence des champs.**

| Nom du champ | Type de données / format | Obligatoire/Facultatif | Description et logique métier | Valeur par défaut du système |
|---|---|---|---|---|
| Sélecteur d'étude | Choix d'études clôturées ou rapportées | Obligatoire | Choisit l'étude à prévisualiser. | La première étude |
| Aperçu du rapport | Lecture seule | Sans objet | Les chiffres et l'évaluation tels qu'ils seront imprimés. | Sans objet |
| **Générer et imprimer le rapport** | Bouton | Sans objet | Imprime, audite sous `validation_report_generated`, passe à rapportée et enregistre l'évaluation finale. | Sans objet |

**7. Autorisations.** Les mêmes règles d'onglet que [Études de validation (onglet)](#screen-tab-validation). La génération du rapport utilise `config:validation-studies:manage`.

**Limites connues.** L'évaluation est définitive une fois enregistrée ; une évaluation erronée ne peut pas être recalculée depuis l'écran.
