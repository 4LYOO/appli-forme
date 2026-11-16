# Cahier des charges — Appli Forme (nutrition, prise de masse, musculation)

> Application web personnelle, pour un seul utilisateur, qui s'adapte réellement à son corps, à ses progrès comme à ses stagnations.
> Ce document est la référence du projet. Il est tenu à jour à chaque phase.
> En cas de conflit entre les chiffres de la section « Fonctionnalités » et ceux de la section « Exigence de qualité et base scientifique », **cette dernière prévaut** (voir aussi RECHERCHE.md).

Statut : **v1.1 (refonte suite aux retours du 16/11) en test sur iPhone** (voir §10).

---

## 1. Qui je suis
- Homme, 184 cm, 58 kg (IMC ≈ 17,1 : sous le seuil de 18,5), né le 09/12/2002 (23 ans, 24 le 9 décembre ; l'âge est recalculé automatiquement).
- Bilans médicaux normaux : métabolisme rapide, n'a jamais dépassé 65 kg, même pendant des périodes de musculation et de gros repas.
- Objectif : prendre du poids et du muscle durablement (65 kg puis au-delà), retrouver un physique athlétique, transformer la motivation en discipline.
- Végétarien. Mange des œufs et des produits laitiers.
- Journée type : départ 7h, retour 19h (train, sans voiture). Petit-déjeuner avant de partir, déjeuner 12h-13h (préparé à l'avance), dîner vers 20h. Coucher visé entre 21h30 et 22h30, réveil vers 6h, objectif 7h30 de sommeil (→ extinction vers 22h30 au plus tard).
- Sport : possible le week-end ; en semaine, au mieux 15-20 min entre 19h et 20h.
- Aucun matériel, pas de salle.
- Sommeil difficile, suivi dans une AUTRE web app (journal de sommeil), séparée, qui exporte chaque nuit sous forme de note texte (voir D26).
- Pas de Mac : uniquement un iPhone 15 Pro et Claude Code.

## 2. Contraintes techniques
- PWA installable sur l'écran d'accueil de l'iPhone (manifest, service worker, hors ligne), hébergée gratuitement sur GitHub Pages depuis ce dépôt, déployée par GitHub Actions.
- HTML/CSS/JavaScript vanilla en modules ES, sans framework et si possible sans étape de build.
- Données 100 % locales dans IndexedDB, avec `navigator.storage.persist()`. Export/import JSON complet, rappel de sauvegarde chaque semaine, date de la dernière sauvegarde toujours visible. **Aucune perte de données silencieuse** : tout échec d'enregistrement est affiché clairement.
- Interface en français, mode sombre (noir/gris foncé, une seule couleur d'accent), optimisée iPhone 15 Pro : zones sûres, barre d'onglets en bas, boutons à portée du pouce, gros chiffres, saisie en quelques taps.
- Chaque recommandation s'appuie sur une source listée dans SOURCES.md et consultable dans l'appli (bouton « Pourquoi ? » sur chaque conseil : source + niveau de preuve en une phrase).

## 3. Adaptation à mon corps (le cœur de l'appli)
- **Dépense réelle** : après 2 à 3 semaines de données, estimer la dépense énergétique réelle à partir des apports saisis et de l'évolution de la moyenne de poids (bilan énergétique, ≈ 7 700 kcal/kg), remplacer progressivement la formule théorique, recalculer les objectifs chaque semaine, afficher un niveau de confiance selon la quantité et la régularité des données.
- **Stagnation** : si la tendance de poids progresse trop lentement sur deux semaines, chercher la cause probable dans les données (apports sous l'objectif, jours non saisis, sommeil dégradé, séances manquées) et proposer UNE action concrète. Si c'est l'apport : +150 à 200 kcal/j, de préférence via des collations denses et faciles. Si la prise est trop rapide, proposer de réduire légèrement. (Seuils : voir §8, décision D2.)
- **Entraînement autorégulé** : progression propre à chaque exercice (toutes les séries en haut de fourchette → niveau suivant ; stagnation sur 2-3 séances → changement de variante ou de tempo ; baisse avec mauvais sommeil ou score bas → séance allégée). Décharge toutes les 6 à 8 semaines ou en cas de fatigue persistante (voir D7). Volume ajusté par groupe musculaire selon les progrès.
- **Mes habitudes** : repérer les repas et créneaux sautés, les aliments réellement mangés et appréciés, proposer en priorité ce qui marche ; adapter les heures de rappel aux horaires réels.
- **Mes corrélations** : après quelques semaines, montrer ce qui fonctionne pour MOI (performances après bonne/mauvaise nuit, sommeil et appétit, jours où les calories sont atteintes), avec prudence statistique : rien sur trop peu de données, nombre de jours analysés toujours indiqué.
- **Composition** : mensurations mensuelles (bras, torse, taille, cuisses) et photos stockées en local, pour distinguer prise de muscle et de gras et ajuster le surplus.
- **Historique des ajustements** : chaque changement d'objectif ou de programme est daté et expliqué (ex. « +150 kcal : moyenne stable depuis 14 jours, apports à 92 % de l'objectif »), consultable dans l'appli.

## 4. Fonctionnalités v1
1. **Configuration initiale** : âge, taille, poids, niveau d'activité → estimation de départ (Mifflin-St Jeor × facteur d'activité) + surplus ; protéines 1,6 à 2,2 g/kg. Valeurs modifiables, puis affinées par l'adaptation.
2. **Écran « Aujourd'hui »** : questionnaire du matin en 20 secondes (qualité de la nuit en un tap si pas encore importée, énergie, courbatures, stress, motivation de 1 à 5, poids facultatif) → score du jour → recommandation : séance complète, séance allégée, mobilité 10 min ou repos. Objectifs du jour (calories, protéines, repas restants).
3. **Repas** : matin, midi, soir et collations (vers 10h, 16h, avant le coucher). Saisie rapide : favoris en un tap avec macros précalculées, recettes préparées à l'avance, base locale d'aliments végétariens (extrait Ciqual ANSES en JSON), portions simples. Barres de progression calories et protéines. Liste d'aliments riches en calories et d'idées de collations à emporter.
4. **Poids** : pesée du matin, courbe avec moyenne sur 7 jours, tendance hebdomadaire.
5. **Musculation à la maison sans matériel** : full body au poids du corps, 2 séances le week-end (40-50 min) + mini-séance facultative de 15-20 min en semaine selon le score. Bibliothèque d'exercices avec consignes, niveaux de progression (pompes inclinées → pompes → pompes déclinées → pompes archer, etc.), minuteur de repos, historique, ≈ 10 séries par groupe musculaire et par semaine au départ. Saisie après chaque série : répétitions faites + répétitions en réserve (RIR) en un tap. Retour par muscle après la séance (congestion, courbatures, douleur articulaire). Prévoir l'ajout futur de matériel (élastiques, barre de traction, haltères).
6. **Import du sommeil** : note texte du journal de sommeil collée dans l'appli, champs reconnus par leur libellé (voir D26), sans doublons (une nuit par date ; une réimportation remplace), date du dernier import visible, rappel d'import hebdomadaire. Pas de saisie du sommeil ici (hormis la qualité en un tap du questionnaire si la nuit n'est pas importée). Alimente score du jour, autorégulation, corrélations, et quelques conseils issus de la TCC-I.
7. **Discipline** : « journée minimale » (3 repas + 1 collation + questionnaire) pour garder la série même les mauvais jours ; un jour manqué ne remet pas la série à zéro ; intentions de mise en œuvre (« s'il est 16h, je prends ma collation ») ; bilan du dimanche (tendance du poids, dépense estimée, moyennes calories et protéines, séances faites, sommeil moyen, ajustements de la semaine, UN conseil prioritaire). Jamais de ton culpabilisant.
8. **Rappels** : v1 = guide intégré pour créer des automatisations Raccourcis iOS (heure fixe → notification qui ouvre l'URL de la bonne page, ex. `?page=collation`). Plus tard : vraies notifications Web Push via Cloudflare Workers + cron (à proposer quand la v1 sera stable).
   Rappels voulus : petit-déjeuner 6h30, collation 10h, collation 16h, dîner 20h, collation avant le coucher à 21h30, pesée le matin (6h), séances samedi et dimanche à 10h (heure par défaut, modifiable dans le profil), import du sommeil et bilan le dimanche soir.

### Ajout de l'utilisateur (16/11/2026) : saisie des repas sans peser
- Pas le temps, et pas le détail des grammes (« 80 ou 100 g de riz ? »). → La saisie ne demande **jamais** de grammes par défaut :
  - **portions visuelles** par aliment (petite / normale / grosse assiette, 1 pot, 1 poignée, 1 c. à soupe…), les grammes restent cachés ;
  - **assiettes types** (ex. « Riz, lentilles et légumes ») en 3 tailles : petite / normale / grosse ;
  - **estimation rapide** : « repas léger / normal / copieux », « petite / moyenne / grosse collation » ;
  - **habitudes** : ce que tu manges souvent à ce créneau, à refaire en un tap ;
  - **préparations** : un plat cuisiné à l'avance, saisi une fois (paquets entiers), puis « 1 portion » en un tap.
- **Photo du plat** : jointe au repas (stockée localement), affichée dans la journée et sur les favoris. La reconnaissance automatique par IA demanderait un serveur et une clé d'API payante : proposée plus tard (phase 3), pas en v1.
- Justification : la méthode adaptative calibre la dépense sur la façon de saisir ; une saisie régulière et approximative vaut mieux qu'une saisie précise mais irrégulière (RECHERCHE.md §1).

### Retours de l'utilisateur après le 1er essai (16/11/2026)
- « Pas ergonomique, mal adapté à l'iPhone » → précisé : **trop de défilement** et **ajout de repas pénible**.
- « Tout est éparpillé, j'ai été perdu au lancement ».
- Design apprécié, mais **turquoise au lieu de vert-citron** et **effet verre (Liquid Glass)**, plus pro.
- **Photo des plats** : « je prends en photo, j'indique ce que c'est et ça l'enregistre ».
- Objectifs : gardés tels quels.
- Journal de sommeil : il exporte une **note texte** (pas un CSV), format « Nuit se terminant le JJ/MM/AAAA » + lignes « libellé : valeur ».

## 5. Règles scientifiques (détail et niveaux de preuve dans RECHERCHE.md)
- Prise de poids cible ≈ 0,25 à 0,5 % du poids/semaine, surplus 10-20 % au-dessus de la maintenance ; débutant : haut de fourchette acceptable ; surveiller le tour de taille.
- Protéines 1,6-2,2 g/kg/j, ≈ 4 prises de 0,4 g/kg ; collation protéinée 30-40 g avant le coucher.
- Végétarien : qualité des protéines (légumineuses + céréales, œufs, laitages, soja), B12 et fer ; créatine monohydrate 3-5 g/j proposée en option.
- Appétit difficile : aliments denses, calories liquides, repas à heures fixes.
- Volume hebdomadaire par muscle = levier principal, gains décroissants ; fréquence secondaire à volume égal.
- Séries de travail à 0-3 RIR.
- Le poids du corps est valable à effort égal ; progressions de callisthénie.
- Retour par muscle pour ajuster les séries (méthode inspirée de RP).
- Sommeil : intégré au score et à l'autorégulation ; conseils TCC-I.
- Habitudes : séries tolérantes, indices fixes, empilement, intentions de mise en œuvre.

## 6. Exigence de qualité
- Niveau des meilleures applis (MacroFactor pour la dépense adaptative, Hevy/Strong pour la saisie des séances, RP Hypertrophy pour le volume par muscle), centré sur un seul utilisateur.
- Chaque écran sert au quotidien ; toute fonctionnalité qui n'aide ni à progresser ni à gagner du temps est proposée au retrait.
- Calculs (dépense adaptative, progression, score du jour) testés avec des données fictives sur 8 semaines : stagnation, mauvais sommeil, jours non saisis ; résultats montrés.

## 7. Méthode de travail
- Par phases : plan → phase 1 (configuration, Aujourd'hui, repas, poids, sauvegarde) → déploiement → retours → suite. Adaptation et import du sommeil en phase 2, quand il y aura des données.
- Tests uniquement sur iPhone : après chaque phase, URL + courte liste de vérifications.
- Commits petits et clairs ; SPEC.md tenu à jour.
- Points bloquants → question ; sinon choix raisonnables notés ci-dessous.

---

## 8. Décisions prises (choix raisonnables, modifiables)

| # | Décision | Raison |
|---|----------|--------|
| D1 | **Surplus de départ = 15 % de la maintenance estimée** (≈ 400 kcal pour ~2 700 kcal), borné à 300-500 kcal. | Concilie « 300-500 kcal » et « 10-20 % » (Iraki 2019). |
| D2 | **Cible de prise : 0,25 à 0,5 %/sem (≈ 0,15 à 0,3 kg/sem), visée au milieu-haut (≈ 0,25 kg)**. Stagnation si la tendance progresse de **< 0,15 kg/sem sur 14 jours** (au lieu de 0,25 kg : la section scientifique prévaut). Proposition de réduire si **> 0,5 kg/sem sur 14 jours** ou si le tour de taille augmente nettement plus vite que les autres mensurations. Entre 0,3 et 0,5 kg/sem : aucune action (IMC bas, débutant : toléré). | Hiérarchie demandée ; IMC 17 → prise un peu rapide acceptable. |
| D3 | **Tendance de poids = moyenne mobile exponentielle** (lissage type « Hacker's Diet », α ≈ 0,1) affichée en plus de la moyenne simple sur 7 jours ; la pente est calculée par régression sur la tendance. | Moins sensible aux jours sans pesée et aux variations d'eau que la moyenne simple. |
| D4 | **Dépense adaptative** : TDEE = apport moyen − (Δ tendance × densité énergétique) / jours. Densité énergétique de la prise de poids : 7 700 kcal/kg par défaut (demandé), avec note dans RECHERCHE.md (la prise chez un débutant maigre contient une part de maigre plus coûteuse en énergie de construction mais moins dense ; 7 700 reste une approximation raisonnable à l'échelle de semaines). Fusion bayésienne simple : poids de l'estimation observée croissant avec le nombre de jours complets (0 avant 14 jours, plein à ~28 jours), changement limité à ±150 kcal/semaine. | MacroFactor-like, robuste, jamais de saut brutal. |
| D5 | **Jour « complet »** = au moins les 3 repas principaux saisis (ou journée marquée « saisie complète »). Les jours incomplets sont exclus du calcul de la dépense, et réduisent la confiance. | Évite de sous-estimer la dépense à cause d'oublis. |
| D6 | **Score du jour (0-100)** = combinaison pondérée et transparente : sommeil (35 %), énergie (20 %), courbatures (15 %, inversées), stress (15 %, inversé), motivation (15 %). Seuils : ≥ 70 séance complète, 50-69 allégée, 35-49 mobilité 10 min, < 35 repos. Pondérations et seuils non validés scientifiquement (niveau de preuve faible, dit dans « Pourquoi ? »), ajustables plus tard par les corrélations personnelles. | Les questionnaires subjectifs sont sensibles à la fatigue (Saw 2016), mais aucune formule n'est validée. |
| D7 | **Décharge déclenchée par la fatigue** (score bas ≥ 4 jours sur 7, ou baisse de performance sur ≥ 2 séances consécutives sur plusieurs exercices), avec rappel proposé après 8 semaines sans décharge, plutôt qu'une décharge systématique toutes les 6 semaines. | Preuves faibles pour la décharge systématique (Coleman 2024). |
| D8 | **Progression « double »** : fourchette de répétitions par exercice (ex. 8-15 au poids du corps) ; toutes les séries au sommet de la fourchette à ≤ 2 RIR → niveau suivant ; au poids du corps, l'échelle de charge est la variante de l'exercice (ou le tempo). | Standard pour la callisthénie. |
| D9 | **Volume** : départ 10 séries/muscle/semaine (2 séances × 5), +1 à 2 séries la semaine suivante si retour « peu de congestion, pas de courbatures, pas de douleur » et performance en hausse ; maintien sinon ; −1 à 2 séries si douleur articulaire ou courbatures persistantes. Plafond ~16-20 séries. Séries « indirectes » comptées pour 0,5. | Inspiré de RP / Pelland 2024 (comptage fractionnaire). |
| D10 | **Base d'aliments** : extrait Ciqual (licence Etalab) d'environ 150-250 aliments végétariens courants, converti une seule fois en JSON statique versionné dans le dépôt ; portions simples (« 1 bol », « 1 poignée », « 1 pot ») associées à des grammes. | Pas d'étape de build, fonctionne hors ligne. |
| D11 | **Pas de framework, pas de build** ; tests des calculs en JavaScript pur exécutés avec Node (`node --test`) dans GitHub Actions avant le déploiement. Les modules de calcul sont purs (sans DOM) pour être testables. | Fiabilité des calculs. |
| D12 | **Photos** stockées en local dans IndexedDB (redimensionnées ~1080 px, JPEG), exclues de l'export JSON par défaut (option « inclure les photos ») pour garder des sauvegardes légères. | Taille des sauvegardes. |
| D13 | **Sauvegarde** : export via la feuille de partage iOS (`navigator.share` avec fichier) → « Enregistrer dans Fichiers » ; repli en téléchargement. | Seule voie fiable sur iPhone. |
| D15 | **Activité par défaut « modérément actif » (×1,55)** → départ 2 890 kcal / 116 g de protéines (2,0 g/kg). | Journées dehors avec trajets à pied, historique de non-prise de poids ; mieux vaut partir un peu haut que perdre 3 semaines. |
| D16 | **Estimation adaptative, réglages après simulation (docs/SIMULATIONS.md)** : fenêtre de 28 jours ; estimation chaînée d'une semaine à l'autre et lissée (k = 0,6) ; objectif = dépense + surplus pour +0,3 kg/sem ; pas de +250 / −150 kcal par semaine, zone morte de ±60 kcal ; **baisse uniquement si confiance « bonne »** (asymétrie volontaire : IMC bas). Premier ajustement possible dès 14 jours si confiance ≥ moyenne. Diagnostic « apport » si apports < 93 % de l'objectif. | Les premières versions (fenêtre 21 j, pas de +200) étaient trop lentes et trop bruitées en simulation. |
| D17 | **Séances « fatiguées »** (séance allégée, score < 50 ou nuit ≤ 2/5) : une baisse de performance n'y est pas comptée comme une stagnation ; la cible est maintenue. | Évite de changer de variante à cause d'une mauvaise semaine de sommeil. |
| D18 | **Niveaux de départ** : pompes classiques, pompes piquées inclinées, rowing sous table genoux pliés, squat au poids du corps, fentes bulgares, pont fessier, planche. Si la meilleure série est sous le bas de la fourchette, l'appli redescend d'un niveau automatiquement. | Pas de test de niveau à faire : l'appli s'ajuste dès la 1re séance. |
| D19 | **Volume** : séance A (sam.) et B (dim.) ≈ 21 séries chacune en super-séries (A1/A2…), mini-séance 6 séries. ≈ 8-11 séries par grand muscle avec 1 mini-séance. Ajustement après chaque séance : ±1-2 séries sur l'exercice principal du muscle, pour la prochaine séance du même type (2 à 6 séries par exercice). | RP-like à petits pas. |
| D20 | **Rappels** : une notification Raccourcis ne peut pas ouvrir l'appli installée (un lien s'ouvre dans Safari, dont les données sont séparées). → Le guide conseille une simple notification, et l'appli met en avant la prise du moment quand on l'ouvre. Les liens `?page=` restent disponibles pour les futures notifications Web Push. | Limite d'iOS. |
| D21 | **Base d'aliments provisoire** : ciqual.anses.fr était en maintenance le 16/11/2026 → 136 aliments végétariens avec des valeurs moyennes proches de Ciqual, saisies à la main et vérifiées (cohérence 4/4/9 kcal par g). Signalé dans l'appli. À remplacer par l'extrait officiel en phase 2. | Ne pas bloquer la v1. |
| D22 | **Design « verre liquide »** : fond sombre avec halos turquoise/bleu fixes, cartes translucides à liseré lumineux, barre d'onglets flottante floutée, feuilles floutées, icônes au trait (style SF Symbols), accent turquoise `#3EE0D0`. Flou réservé à la barre d'onglets, aux feuilles et aux bandeaux (fluidité). | Demande de l'utilisateur. |
| D23 | **Aujourd'hui = une seule action** : carte « Maintenant » (check-in le matin, puis la prochaine prise avec Photo / Ajouter et les habitudes en 1 tap), 2 anneaux (calories, protéines), la journée en une ligne de 7 pastilles, une ligne de score, un conseil. Le check-in s'ouvre dans une feuille. Carte « Comment ça marche » à la 1re ouverture. | « Trop de défilement », « perdu au lancement ». |
| D24 | **Ajout de repas sans onglets ni panier par défaut** : photo en haut, recherche, puis « Mes plats » (vignettes photo, 1 tap = enregistré), estimation rapide (1 tap), assiettes types (1 tap par taille). Le panier n'apparaît que si l'on compose avec des aliments. Annuler toujours possible ; quantité réelle ajustable après coup (×0,5 à ×2). | « Ajout de repas pénible ». |
| D25 | **Photo → nom → enregistré** : la photo est prise d'abord, on tape ce que c'est, on choisit une quantité (plat connu, estimation ou assiette) ; le plat est mémorisé avec sa photo dans « Mes plats » et revient en 1 tap. Pas de reconnaissance automatique (IA) en v1. | Demande de l'utilisateur. |
| D26 | **Import du sommeil par note texte collée** (Plus → Sommeil, ou depuis le check-in) : calcul du temps de sommeil, du temps au lit, de l'efficacité, prise d'un produit, conditions ; qualité 1-5 = impression générale, −1 si < 6 h, −1 si efficacité < 75 %. Une nuit importée remplace la question « nuit » du check-in. Rappel si pas d'import depuis 7 jours. | Format réel du journal. |
| D14 | Écriture IndexedDB **vérifiée** (transaction `oncomplete`), bandeau d'erreur rouge persistant sinon ; vérification au démarrage que le stockage est persistant, avec avertissement si refusé (sur iOS, l'installation sur l'écran d'accueil est nécessaire). | « Aucune perte silencieuse ». |

## 9. Points ouverts
- Heure des séances du week-end : 10h par défaut, à confirmer.

## 10. Avancement
| Phase | Contenu | État |
|---|---|---|
| 0 | PWA (manifest, service worker hors ligne), IndexedDB vérifiée, tests Node, déploiement GitHub Actions → Pages | ✅ |
| 1 | Configuration, Aujourd'hui (questionnaire, score, objectifs, prochain repas, journée minimale, intention, conseil), Repas (portions visuelles, assiettes types, estimation rapide, habitudes, favoris, préparations, photo), Poids (tendance, 7 j, rythme, courbe), Sauvegarde (export/import, rappel hebdo), « Pourquoi ? », guide Raccourcis, historique des ajustements | ✅ |
| 1b | Séance : programme A/B/mini, 11 exercices à niveaux, saisie répétitions + RIR, minuteur, retour par muscle, volume par muscle, progression automatique, mobilité 10 min | ✅ |
| 1.1 | Refonte : verre liquide turquoise, Aujourd'hui en une action, ajout de repas en 1 tap, photo → nom → plat mémorisé, import de la note de sommeil | ✅ |
| 2 | Dépense adaptative dans l'appli (le calcul est déjà écrit et simulé), diagnostic de stagnation, corrélations sommeil, bilan du dimanche, mensurations et photos de composition, Ciqual officiel | à faire |
| 3 | Corrélations personnelles, horaires de rappel adaptés, Web Push (Cloudflare Workers), reconnaissance des plats par photo (option) | à faire |
