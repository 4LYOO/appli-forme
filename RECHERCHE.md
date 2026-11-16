# Recherche — base scientifique des règles de l'appli

Pour chaque règle : la source, ce qu'elle montre, et un **niveau de preuve** :
- **Fort** : méta-analyses d'essais contrôlés ou recommandations officielles fondées sur des revues systématiques, résultats cohérents.
- **Modéré** : quelques essais contrôlés, revues narratives d'experts reconnus, ou extrapolation raisonnable d'études solides.
- **Faible** : avis d'experts, livres, pratique de terrain, mécanisme plausible, ou règle de conception propre à l'appli.

Ce fichier sert de base à SOURCES.md et aux textes du bouton « Pourquoi ? ». Vérifié le 16/11/2026 ; les références marquées *(à vérifier)* le seront avant d'apparaître dans l'appli.

> Remarque générale : presque toutes les études de prise de muscle portent sur de jeunes adultes (souvent déjà entraînés) en salle. L'appli applique ces résultats à un débutant maigre qui s'entraîne au poids du corps : c'est une extrapolation raisonnable, mais une extrapolation.

---

## 1. Énergie et poids

| Règle | Source | Ce qu'elle montre | Preuve |
|---|---|---|---|
| Estimation de départ = Mifflin-St Jeor × facteur d'activité | Mifflin et al., 1990, *Am J Clin Nutr* 51:241-247 ; Frankenfield et al., 2005, *J Am Diet Assoc* (revue systématique) | Équation la plus juste parmi les courantes chez l'adulte non obèse (≈ ±10 % chez la majorité des personnes). Le facteur d'activité ajoute une erreur supplémentaire. Chez une personne au « métabolisme rapide », l'erreur peut être plus grande → d'où l'adaptation. | **Fort** (équation) / **Faible** (facteurs d'activité) |
| Dépense réelle estimée par bilan énergétique (apports − variation de poids) | Hall et al., 2011, *Lancet* 378:826-837 ; Thomas et al., 2013 | Le poids évolue selon le bilan énergétique ; la règle des 7 700 kcal/kg est une approximation acceptable sur quelques semaines mais pas sur des mois (adaptations métaboliques). Hall montre qu'il faut des modèles dynamiques pour le long terme → l'appli recalcule chaque semaine sur une fenêtre glissante. | **Fort** (principe) / **Modéré** (7 700 kcal/kg en prise de masse) |
| Densité énergétique de la prise de poids | Hall, 2008, *Int J Obes* ; Forbes (relation masse grasse/masse maigre) | Chez une personne maigre, une part plus grande du poids gagné est de la masse maigre (≈ 1 800 kcal/kg stockés) que de la graisse (≈ 9 400 kcal/kg). 7 700 kcal/kg peut donc **surestimer** l'énergie stockée → dépense légèrement sous-estimée. L'appli reste à 7 700 (demandé, prudent), avec possibilité de réglage. | **Modéré** |
| Tendance lissée plutôt que pesée brute | Variations quotidiennes d'eau/glycogène/contenu digestif de 0,5-1,5 kg (bien documentées) ; lissage exponentiel (Walker, *The Hacker's Diet*) | Il faut lisser plusieurs jours pour voir une tendance de 0,2 kg/semaine. | **Modéré** (principe) / **Faible** (choix précis du lissage) |
| Erreurs de saisie des apports | Lichtman et al., 1992, *NEJM* ; nombreuses études de sous-déclaration | Les apports déclarés sont souvent sous-estimés. Avantage de la méthode adaptative : une erreur **constante** de saisie s'annule (la dépense « observée » est calibrée sur ta propre façon de saisir). Les jours non saisis, eux, faussent tout → exclus. | **Fort** |
| Cible de prise ≈ 0,25-0,5 %/sem, surplus 10-20 % | Iraki, Fitschen, Espinar & Helms, 2019, *Sports* 7(7):154 | Revue narrative (pas méta-analyse) pour culturistes en prise de masse : 0,25-0,5 %/sem, surplus ≈ 10-20 %, les débutants pouvant viser le haut. | **Modéré** (avis d'experts fondé sur études indirectes) |
| Un surplus est utile pour maximiser l'hypertrophie, sans excès | Slater et al., 2019, *Front Nutr* 6:131 | Un surplus favorise la prise de muscle, mais au-delà d'un certain niveau il ajoute surtout du gras ; propose de surveiller la composition (tour de taille). Peu d'essais directs. | **Modéré** |
| Surveiller le tour de taille pour la prise de gras | Lien tour de taille ↔ graisse abdominale bien établi en épidémiologie ; aucune étude de son usage pour piloter une prise de masse | Indicateur simple et utile, mais imprécis à l'échelle de 1 mois (±1 cm d'erreur de mesure). | **Faible** à **modéré** |
| Stagnation → +150-200 kcal ; prise trop rapide → réduire | Dérivé des sources ci-dessus | **Pas de source directe** pour le pas de 150-200 kcal. C'est un pas de pratique courante (assez petit pour ne pas « surcorriger » vu le bruit du poids). | **Faible** (règle de conception) |
| Mensurations et photos pour distinguer muscle et gras | Pratique de coaching ; validité limitée des mensurations | Faute de DEXA, combinaison bras/torse/cuisses (muscle) vs taille (gras) : signal grossier mais utile sur plusieurs mois. | **Faible** |

## 2. Protéines et nutrition végétarienne

| Règle | Source | Ce qu'elle montre | Preuve |
|---|---|---|---|
| 1,6 g/kg/j minimum, jusqu'à 2,2 g/kg | Morton et al., 2018, *Br J Sports Med* 52:376-384 | Méta-analyse de 49 essais : bénéfice des protéines sur la masse maigre plafonnant vers 1,62 g/kg/j (IC 95 % jusqu'à ≈ 2,2). Pour 58 kg : 93-128 g/j. | **Fort** |
| ≈ 4 prises de ≈ 0,4 g/kg | Schoenfeld & Aragon, 2018, *J Int Soc Sports Nutr* 15:10 | Proposition fondée sur les études de synthèse protéique aiguë : 0,4 g/kg par repas sur ≥ 4 repas pour atteindre 1,6 g/kg. Pour 58 kg : ≈ 23-30 g par prise. | **Modéré** |
| Collation protéinée 30-40 g avant le coucher (ex. fromage blanc, skyr) | Trommelen & van Loon, 2016, *Nutrients* 8:763 ; Snijders et al., 2015, *J Nutr* 145:1178 ; Snijders et al., 2019, *Front Nutr* 6:17 (revue) | Les protéines prises avant le coucher sont digérées et utilisées la nuit. L'essai de 12 semaines (2015) montre plus de gains, **mais** le groupe recevait aussi plus de protéines au total. À apport quotidien égal, l'avantage propre au moment est incertain. Pour toi, l'intérêt principal est pratique : c'est une prise de plus pour atteindre l'objectif. | **Modéré** (protéines en plus) / **Faible** (moment précis) |
| Protéines végétales : qualité et combinaisons | Hevia-Larraín et al., 2021, *Sports Med* 51:1317 ; Jäger et al., 2017, ISSN position stand (protéines), *JISSN* 14:20 | À 1,6 g/kg, un régime végétalien riche en protéines (soja) donne la même hypertrophie qu'un régime omnivore chez des débutants (12 semaines). Les protéines végétales ont moins de leucine/lysine → varier (légumineuses + céréales), privilégier soja, œufs et laitages si consommés, viser le haut de la fourchette. | **Modéré** à **fort** |
| Surveiller B12 et fer | ANSES (avis et références nutritionnelles ; repères végétariens) ; Institute of Medicine, 2001 (besoins en fer ×1,8 chez les végétariens) ; Pawlak et al., 2014 (B12) | B12 absente des végétaux : supplémentation conseillée si peu/pas de produits animaux ; fer non héminique moins absorbé (vitamine C l'améliore, thé/café au repas la réduisent). L'appli **ne prescrit pas** : elle rappelle d'en parler au médecin / de faire un bilan. | **Fort** |
| Créatine monohydrate 3-5 g/j (option) | Kreider et al., 2017, ISSN position stand (créatine), *JISSN* 14:18 ; Kaviani et al., 2020, *Int J Environ Res Public Health* 17:3041 ; Burke et al., 2003 | Complément le plus étudié pour la force et la masse maigre, sûr chez l'adulte en bonne santé. Les végétariens ont des réserves musculaires plus basses et en tirent souvent un bénéfice plus marqué. Prise de 1-2 kg d'eau intracellulaire au début (à savoir pour lire la courbe de poids !). | **Fort** (efficacité, sécurité) / **Modéré** (avantage végétarien) |
| Base d'aliments : table Ciqual | ANSES, table de composition nutritionnelle Ciqual (version 2020 ou plus récente, licence ouverte Etalab) | Référence française officielle de composition des aliments. | **Fort** (données de référence) |

## 3. Appétit difficile

| Règle | Source | Ce qu'elle montre | Preuve |
|---|---|---|---|
| Aliments denses en énergie | Rolls, 2009, *Physiol Behav* (densité énergétique) | À volume égal, les aliments denses (oléagineux, huiles, fruits secs, beurres de cacahuète, fromages) font manger plus de calories ; les aliments peu denses rassasient davantage. | **Fort** (sens inverse, très étudié en perte de poids) |
| Calories liquides (smoothies, lait) | DiMeglio & Mattes, 2000, *Int J Obes* 24:794 ; Pan & Hu, 2011 (revue) | Les calories liquides sont moins bien compensées par une baisse des apports solides que les calories solides. | **Modéré** |
| Repas et collations à heures fixes plutôt qu'à la faim | **Pas de bonne source directe chez l'adulte sain en prise de masse.** Logique : signaux de faim faibles ; et lien avec les intentions de mise en œuvre (cf. §6). | Règle de bon sens pratique, à présenter comme telle. | **Faible** |

## 4. Entraînement

| Règle | Source | Ce qu'elle montre | Preuve |
|---|---|---|---|
| Le volume hebdomadaire par muscle est le levier principal, à gains décroissants | Schoenfeld, Ogborn & Krieger, 2017, *J Sports Sci* 35:1073 ; Pelland, Remmert, Robinson, Hinson & Zourdos, 2024, préprint SportRxiv (version publiée dans *Sports Medicine*, à vérifier) | Relation dose-réponse positive entre séries hebdomadaires et hypertrophie, avec rendements décroissants. Pelland compte les séries indirectes pour une fraction (0,5), méthode reprise par l'appli. | **Fort** |
| ≈ 10 séries/muscle/semaine au départ | Schoenfeld 2017 (≥ 10 séries > moins de 5) ; Baz-Valle et al., 2022, *J Hum Kinet* | Point de départ raisonnable pour un débutant ; augmenter selon la réponse. | **Modéré** |
| À volume égal, la fréquence compte peu → 2 séances le week-end suffisent | Schoenfeld, Grgic & Krieger, 2019, *J Sports Sci* 37:1286 ; Pelland 2024 | Pas d'effet notable de la fréquence sur l'hypertrophie une fois le volume égalisé ; la fréquence aide un peu la force. Limite pratique : au-delà de ~8-10 séries par muscle et par séance, la qualité des séries baisse (fatigue) → la mini-séance de semaine permet de répartir. | **Modéré** à **fort** |
| Séries de travail à 0-3 répétitions en réserve (RIR) | Robinson et al., 2024, *Sports Med* 54:2209 ; Refalo et al., 2023, *Sports Med* | L'hypertrophie augmente quand on s'approche de l'échec, mais aller à l'échec complet n'apporte pas clairement plus. 0-3 RIR est la zone recommandée. | **Modéré** |
| Notation RIR après chaque série | Zourdos et al., 2016, *J Strength Cond Res* 30:267 ; Helms et al., 2016 | Échelle RIR valide, plus précise près de l'échec et chez les personnes expérimentées ; les débutants sous-estiment souvent leur réserve → l'appli le signale et propose de tester une série jusqu'à l'échec technique de temps en temps. | **Modéré** |
| Le poids du corps est valable : pompes ≈ développé couché à effort égal | Kikuchi & Nakazato, 2017, *J Exerc Sci Fit* 15:37 ; Calatayud et al., 2015, *J Strength Cond Res* 29:246 ; Kotarsky et al., 2018, *J Strength Cond Res* 32:651 | Kikuchi : pompes et développé à charge légère → hypertrophie similaire (8 semaines). Calatayud : gains de force similaires à activation égale. Kotarsky : les pompes progressives améliorent la force (4 semaines trop courtes pour mesurer l'hypertrophie). | **Modéré** |
| Les charges légères fonctionnent si l'effort est élevé | Schoenfeld et al., 2017, *J Strength Cond Res* 31:3508 (méta-analyse) | Hypertrophie similaire entre charges lourdes et légères quand les séries sont proches de l'échec. Justifie des fourchettes larges (8-20 reps) au poids du corps. | **Fort** |
| Progressions de callisthénie (inclinées → pompes → déclinées → archer…) | Low, *Overcoming Gravity*, 2e éd., 2016 | Progressions structurées par levier et difficulté. Livre de référence, pas d'étude. | **Faible** |
| Progression « double » (sommet de fourchette → niveau suivant) ; stagnation 2-3 séances → variante/tempo | Helms et al., *The Muscle and Strength Pyramids : Training* ; pratique de coaching | Méthode standard, cohérente avec le principe de surcharge progressive, mais non comparée à d'autres méthodes en essais. | **Faible** |
| Séance allégée en cas de baisse liée à un mauvais sommeil / score bas | Craven et al., 2022, *Sports Med* 52:2669 (méta-analyse sommeil et performance) ; Larsen et al., 2021, *Sports Med* (autorégulation) | Le manque de sommeil réduit la performance physique ; l'autorégulation donne des résultats au moins égaux à une programmation fixe. Les seuils précis sont des choix de conception. | **Modéré** (principe) / **Faible** (seuils) |
| Retour par muscle (congestion, courbatures, douleur) pour ajuster les séries | Israetel, Hoffmann et al., *Scientific Principles of Hypertrophy Training*, 2021 ; méthode RP | **Pas de validation scientifique publiée** de cet algorithme. Les courbatures sont un mauvais indicateur de croissance ; la douleur articulaire, elle, est un bon signal d'arrêt. L'appli s'en sert prudemment (petits pas de ±1-2 séries). | **Faible** |
| Décharge toutes les 6-8 semaines | Bell et al., 2023, *Sports Med Open* (consensus Delphi sur la décharge) ; Coleman et al., 2024, *PeerJ* 12:e16777 | Décharge = pratique courante, consensus d'entraîneurs, mais l'essai de Coleman (1 semaine d'arrêt à mi-parcours) ne montre aucun gain d'hypertrophie et un peu moins de force. → L'appli déclenche la décharge **sur signes de fatigue** et ne fait que la proposer après 8 semaines. | **Faible** |

## 5. Sommeil et récupération

| Règle | Source | Ce qu'elle montre | Preuve |
|---|---|---|---|
| Le sommeil compte dans le score et l'autorégulation | Lamon et al., 2021, *Physiol Rep* 9:e14660 ; Craven et al., 2022 | Une nuit blanche réduit la synthèse protéique musculaire de 18 % (13 participants, nuit blanche totale, pas une mauvaise nuit ordinaire) et modifie cortisol (+21 %) et testostérone (−24 %). La perte de sommeil, même partielle, baisse la performance. | **Modéré** |
| Score du jour par questionnaire subjectif | Saw, Main & Gastin, 2016, *Br J Sports Med* 50:281 | Les mesures subjectives (humeur, fatigue, courbatures, stress) réagissent mieux à la charge d'entraînement que beaucoup de mesures objectives. **Aucune formule de score validée** : pondérations de l'appli = choix de conception. | **Modéré** (principe) / **Faible** (formule) |
| Conseils fondés sur la TCC-I : horaires réguliers, contrôle du stimulus, restriction du temps au lit | Edinger et al., 2021, *J Clin Sleep Med* 17:255 (recommandation AASM) | La TCC-I multimodale est le traitement recommandé (recommandation forte) de l'insomnie chronique ; contrôle du stimulus et restriction du temps au lit sont efficaces seuls. **L'hygiène du sommeil seule n'est pas recommandée** comme traitement. La restriction du temps au lit doit être encadrée → l'appli renvoie vers un professionnel pour cela. | **Fort** |
| Couper la caféine tôt | Drake et al., 2013, *J Clin Sleep Med* 9:1195 | 400 mg de caféine même 6 h avant le coucher réduisent le sommeil d'environ 1 h. | **Modéré** |
| Lumière le matin | Revue : Blume, Garbazza & Spitschan, 2019, *Somnologie* | La lumière du matin avance l'horloge biologique et aide à s'endormir plus tôt ; peu d'essais chez l'insomniaque. | **Faible** à **modéré** |

## 6. Habitudes et discipline

| Règle | Source | Ce qu'elle montre | Preuve |
|---|---|---|---|
| L'automatisme se construit en semaines ou mois ; un jour manqué ne compromet pas l'habitude → séries tolérantes | Lally et al., 2010, *Eur J Soc Psychol* 40:998 ; Singh et al., 2024, *Healthcare* (revue systématique) | Médiane 66 jours (18 à 254 selon les personnes, 96 participants) ; manquer une occasion n'affecte pas la formation de l'habitude. La revue de 2024 confirme : 2 à 5 mois en général. | **Modéré** |
| Intentions de mise en œuvre (« si… alors… ») | Gollwitzer & Sheeran, 2006, *Adv Exp Soc Psychol* 38:69 | Méta-analyse de 94 études : effet moyen à important (d ≈ 0,65) sur l'atteinte des objectifs. | **Fort** |
| Indices fixes, empilement d'habitudes, « journée minimale » | Clear, *Atomic Habits*, 2018 ; Wood & Neal (habitudes et indices contextuels) | Livre de vulgarisation synthétisant la recherche sur les habitudes ; l'idée d'indice contextuel stable est bien étayée, le reste est pratique. | **Faible** à **modéré** |
| Ton non culpabilisant | Recherche sur l'auto-compassion et l'autorégulation (ex. Sirois, 2015) | La culpabilité et l'autocritique favorisent l'abandon ; l'auto-compassion aide à reprendre après un écart. | **Modéré** |
| Auto-surveillance (pesée, saisie) | Burke, Wang & Sevick, 2011, *J Am Diet Assoc* (revue) | L'auto-surveillance améliore l'atteinte des objectifs de poids — études surtout en perte de poids. | **Modéré** (transposé à la prise) |

## 7. Corrélations personnelles

| Règle | Source | Ce qu'elle montre | Preuve |
|---|---|---|---|
| Ne rien conclure sur trop peu de données ; afficher le nombre de jours | Statistique élémentaire (n-de-1) ; Schork, 2015, *Nature* (essais personnalisés) | Avec ≥ 20-30 couples de jours, une corrélation |r| ≥ 0,4 commence à être interprétable ; en dessous, l'appli dit « pas encore assez de données ». Corrélation ≠ causalité, à rappeler. | **Fort** (principe statistique) |

## 8. Ouvrages de référence pour la logique d'ensemble
- Helms, Valdez & Morgan, *The Muscle and Strength Pyramids* (Nutrition et Training), 2e éd., 2019 — **faible** (livres d'experts, mais très alignés sur la littérature).
- Israetel, Hoffmann, Case & Feather, *Scientific Principles of Hypertrophy Training*, 2021 — **faible**.

---

## Règles sans bonne source (assumées comme choix de conception)
1. Taille du pas de +150-200 kcal en cas de stagnation.
2. Repas « à heures fixes plutôt qu'à la faim ».
3. Formule du score du jour (pondérations et seuils).
4. Algorithme de retour par muscle (RP).
5. Décharge à intervalle fixe (preuves plutôt contre la version systématique).
6. Seuils d'autorégulation (« baisse sur 2-3 séances »).

Dans l'appli, le bouton « Pourquoi ? » de ces conseils dira explicitement : « Règle pratique, pas de preuve directe — basée sur… ».

## Points d'attention propres à l'utilisateur
- **IMC ≈ 17** : en dessous de la norme. La prise de poids est prioritaire et un rythme un peu rapide (jusqu'à ~0,5 kg/sem) est acceptable au début. Si la prise reste impossible malgré des apports mesurés élevés et réguliers (> 3 500 kcal/j par exemple), en reparler au médecin.
- **Créatine** : si démarrée, marquer la date dans l'appli (saut de poids d'eau de 1-2 kg à exclure de l'interprétation).
