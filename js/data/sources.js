// Sources des conseils (bouton « Pourquoi ? »). Détail dans RECHERCHE.md ; SOURCES.md est généré depuis ce fichier
// (node tools/gen_sources.mjs). niveau : 'fort' | 'modere' | 'faible'.

export const SOURCES = {
  mifflin: {
    title: 'Estimation de départ des besoins', niveau: 'fort',
    text: 'L\'équation de Mifflin-St Jeor est la plus juste des formules courantes (souvent à ±10 %). Le facteur d\'activité est plus approximatif : c\'est pour ça que l\'appli remplacera la formule par ta dépense réelle.',
    refs: ['Mifflin et al., 1990, Am J Clin Nutr 51:241', 'Frankenfield et al., 2005, J Am Diet Assoc (revue systématique)'],
  },
  surplus: {
    title: 'Surplus et rythme de prise', niveau: 'modere',
    text: 'Viser +0,25 à 0,5 % du poids par semaine avec un surplus d\'environ 10-20 % : assez pour construire du muscle, sans prendre surtout du gras. En débutant, le haut de la fourchette est acceptable.',
    refs: ['Iraki, Fitschen, Espinar & Helms, 2019, Sports 7:154 (revue narrative)', 'Slater et al., 2019, Front Nutr 6:131'],
  },
  bilan: {
    title: 'Dépense réelle par bilan énergétique', niveau: 'fort',
    text: 'Ton poids suit la différence entre ce que tu manges et ce que tu dépenses. En comparant tes apports et ta tendance de poids sur 2-3 semaines, on mesure TA dépense. Une erreur de saisie constante s\'annule ; les jours non saisis, eux, faussent le calcul.',
    refs: ['Hall et al., 2011, Lancet 378:826', 'Approximation 7 700 kcal/kg : valable à l\'échelle de semaines'],
  },
  tendance: {
    title: 'Pourquoi une tendance plutôt que la pesée du jour', niveau: 'modere',
    text: 'Le poids varie de 0,5 à 1,5 kg d\'un jour à l\'autre (eau, sel, digestion). Pour voir +0,2 kg par semaine, il faut lisser : l\'appli utilise une moyenne exponentielle et une régression sur 14 jours.',
    refs: ['Variations hydriques quotidiennes bien documentées', 'Lissage exponentiel : Walker, The Hacker\'s Diet'],
  },
  proteines: {
    title: 'Protéines : 1,6 à 2,2 g/kg/j', niveau: 'fort',
    text: 'Méta-analyse de 49 essais : le gain de muscle lié aux protéines plafonne vers 1,6 g/kg/j, jusqu\'à 2,2 g/kg pour couvrir tout le monde. En végétarien, viser plutôt le haut.',
    refs: ['Morton et al., 2018, Br J Sports Med 52:376', 'Hevia-Larraín et al., 2021, Sports Med 51:1317'],
  },
  repartition: {
    title: 'Répartir les protéines en 4 prises ou plus', niveau: 'modere',
    text: 'Environ 0,4 g/kg par prise sur au moins 4 prises permet d\'atteindre l\'objectif quotidien en stimulant le muscle plusieurs fois par jour.',
    refs: ['Schoenfeld & Aragon, 2018, J Int Soc Sports Nutr 15:10'],
  },
  coucher: {
    title: 'Collation protéinée avant le coucher', niveau: 'modere',
    text: '30-40 g de protéines lentes (fromage blanc, skyr) avant de dormir sont utilisées pendant la nuit. L\'avantage du moment précis est incertain ; pour toi, c\'est surtout une prise de plus pour atteindre l\'objectif.',
    refs: ['Trommelen & van Loon, 2016, Nutrients 8:763', 'Snijders et al., 2015, J Nutr 145:1178', 'Snijders et al., 2019, Front Nutr 6:17'],
  },
  vegetarien: {
    title: 'Qualité des protéines végétariennes', niveau: 'modere',
    text: 'Bien combiné, un régime végétarien permet la même prise de muscle. Varie légumineuses + céréales, et appuie-toi sur œufs, laitages et soja, plus riches en acides aminés essentiels.',
    refs: ['Hevia-Larraín et al., 2021, Sports Med 51:1317', 'Jäger et al., 2017, ISSN (protéines), JISSN 14:20'],
  },
  b12fer: {
    title: 'Vitamine B12 et fer', niveau: 'fort',
    text: 'La B12 vient des produits animaux : œufs et laitages en apportent, mais un dosage chez le médecin est utile. Le fer végétal s\'absorbe moins : vitamine C au repas, thé et café à distance.',
    refs: ['ANSES, références nutritionnelles et repères végétariens', 'Institute of Medicine, 2001 (fer)', 'Pawlak et al., 2014 (B12)'],
  },
  creatine: {
    title: 'Créatine monohydrate (option)', niveau: 'fort',
    text: '3 à 5 g par jour, tous les jours : le complément le plus étudié pour la force et la masse musculaire, sûr chez l\'adulte en bonne santé. Les végétariens en tirent souvent plus de bénéfice. Attends-toi à +1-2 kg d\'eau au début.',
    refs: ['Kreider et al., 2017, ISSN (créatine), JISSN 14:18', 'Kaviani et al., 2020, Int J Environ Res Public Health 17:3041'],
  },
  densite: {
    title: 'Aliments denses en énergie', niveau: 'fort',
    text: 'À volume égal, les aliments denses (oléagineux, huiles, fruits secs, fromages) apportent beaucoup plus de calories sans remplir l\'estomac. Idéal quand l\'appétit manque.',
    refs: ['Rolls, 2009, Physiol Behav (densité énergétique)'],
  },
  liquides: {
    title: 'Calories liquides', niveau: 'modere',
    text: 'Les calories bues (lait, smoothies) rassasient moins que les solides : le corps compense mal en mangeant moins ensuite. Pratique pour ajouter 300 à 700 kcal.',
    refs: ['DiMeglio & Mattes, 2000, Int J Obes 24:794'],
  },
  heures_fixes: {
    title: 'Manger à heures fixes plutôt qu\'à la faim', niveau: 'faible',
    text: 'Règle pratique, pas de preuve directe : quand la faim est un mauvais signal, un horaire fixe (associé à une intention « si… alors… ») évite de sauter des prises.',
    refs: ['Règle de conception, cohérente avec Gollwitzer & Sheeran, 2006'],
  },
  saisie_rapide: {
    title: 'Saisie approximative : pourquoi ça marche quand même', niveau: 'modere',
    text: 'Pas besoin de peser ton riz. Ce qui compte, c\'est de saisir chaque jour de la même façon : si tu sous-estimes toujours un peu, la dépense calculée par l\'appli s\'ajuste à ta façon de saisir. Un jour non saisi est bien plus gênant qu\'un jour approximatif.',
    refs: ['Hall et al., 2011, Lancet (bilan énergétique)', 'Lichtman et al., 1992, NEJM (erreurs de déclaration)'],
  },
  score: {
    title: 'Score du jour', niveau: 'faible',
    text: 'Les questionnaires de ressenti (sommeil, énergie, courbatures, stress, motivation) suivent bien la fatigue. Mais la formule du score (sommeil 35 %, énergie 20 %, les 3 autres 15 %) et ses seuils sont un choix de l\'appli, pas une formule validée.',
    refs: ['Saw, Main & Gastin, 2016, Br J Sports Med 50:281', 'Pondérations : règle de conception'],
  },
  sommeil_muscle: {
    title: 'Sommeil et récupération', niveau: 'modere',
    text: 'Une nuit blanche réduit la synthèse des protéines musculaires d\'environ 18 % (petite étude, 13 personnes), et le manque de sommeil baisse la performance. Après une très mauvaise nuit, l\'appli ne propose jamais de séance complète.',
    refs: ['Lamon et al., 2021, Physiol Rep 9:e14660', 'Craven et al., 2022, Sports Med 52:2669'],
  },
  tcci: {
    title: 'Conseils de sommeil (TCC-I)', niveau: 'fort',
    text: 'Pour l\'insomnie, ce qui marche le mieux : heure de lever fixe, lit réservé au sommeil (se lever si on ne dort pas au bout de 20 min), et un programme de TCC-I. L\'hygiène du sommeil seule ne suffit pas.',
    refs: ['Edinger et al., 2021, J Clin Sleep Med 17:255 (recommandation AASM)'],
  },
  cafeine: {
    title: 'Couper la caféine tôt', niveau: 'modere',
    text: 'De la caféine prise même 6 h avant le coucher peut réduire le sommeil d\'environ 1 h. Avec un coucher vers 22h, dernier café vers 14h.',
    refs: ['Drake et al., 2013, J Clin Sleep Med 9:1195'],
  },
  volume: {
    title: 'Le volume par muscle est le levier principal', niveau: 'fort',
    text: 'Plus de séries par muscle et par semaine = plus de muscle, avec des gains qui diminuent. À volume égal, la fréquence compte peu : 2 bonnes séances le week-end suffisent, la mini-séance de semaine est un bonus (environ 10 séries par muscle avec 1 mini-séance).',
    refs: ['Schoenfeld, Ogborn & Krieger, 2017, J Sports Sci 35:1073', 'Pelland et al., 2024 (méta-régressions volume et fréquence)', 'Schoenfeld, Grgic & Krieger, 2019, J Sports Sci 37:1286'],
  },
  rir: {
    title: 'Répétitions en réserve (RIR)', niveau: 'modere',
    text: 'Les séries proches de l\'échec (0 à 3 répétitions en réserve) font plus progresser. Noter ton RIR permet à l\'appli de savoir si tu forces assez. Les débutants sous-estiment souvent leur réserve.',
    refs: ['Robinson et al., 2024, Sports Med 54:2209', 'Zourdos et al., 2016, J Strength Cond Res 30:267'],
  },
  poids_du_corps: {
    title: 'Le poids du corps, ça marche', niveau: 'modere',
    text: 'À effort égal, des pompes font progresser autant que le développé couché, et les charges légères font autant grossir le muscle que les lourdes si les séries sont proches de l\'échec.',
    refs: ['Kikuchi & Nakazato, 2017, J Exerc Sci Fit 15:37', 'Kotarsky et al., 2018, J Strength Cond Res 32:651', 'Schoenfeld et al., 2017, J Strength Cond Res 31:3508'],
  },
  progression: {
    title: 'Progression exercice par exercice', niveau: 'faible',
    text: 'Quand toutes tes séries atteignent le haut de la fourchette, tu passes à la variante plus difficile ; si tu stagnes 3 séances, on change de tempo ou de variante. Méthode standard des entraîneurs, non comparée en essais.',
    refs: ['Low, Overcoming Gravity, 2016', 'Helms et al., The Muscle and Strength Pyramids : Training'],
  },
  autoregulation: {
    title: 'Séance allégée les jours difficiles', niveau: 'modere',
    text: 'Adapter la séance à ta forme du jour donne des résultats au moins aussi bons qu\'un programme fixe. Une séance allégée = 40 % de séries en moins et 3 répétitions en réserve : tu gardes l\'habitude sans creuser la fatigue.',
    refs: ['Larsen et al., 2021, Sports Med (autorégulation)', 'Seuils : règle de conception'],
  },
  retour_muscle: {
    title: 'Retour par muscle', niveau: 'faible',
    text: 'Méthode de terrain (RP) : congestion, courbatures et douleurs guident l\'ajout ou le retrait d\'1 à 2 séries par semaine. Pas validée en essais : l\'appli fait de petits pas, et une douleur articulaire est toujours prise au sérieux.',
    refs: ['Israetel et al., Scientific Principles of Hypertrophy Training, 2021'],
  },
  decharge: {
    title: 'Semaine de décharge', niveau: 'faible',
    text: 'Une décharge systématique n\'a pas montré de bénéfice pour le muscle (et un peu moins de force) dans le seul essai disponible. L\'appli la propose donc seulement en cas de fatigue persistante, ou en option après 8 semaines.',
    refs: ['Coleman et al., 2024, PeerJ 12:e16777', 'Bell et al., 2023, Sports Med Open (consensus)'],
  },
  habitudes: {
    title: 'Séries tolérantes', niveau: 'modere',
    text: 'Une habitude met en moyenne 66 jours à devenir automatique (de 18 à 254 selon les personnes), et manquer un jour ne la compromet pas. Ici, un jour manqué isolé ne remet jamais ta série à zéro : seule la régularité compte.',
    refs: ['Lally et al., 2010, Eur J Soc Psychol 40:998', 'Singh et al., 2024 (revue systématique)'],
  },
  intentions: {
    title: 'Intentions de mise en œuvre', niveau: 'fort',
    text: 'Décider à l\'avance « S\'il est 16h, alors je prends ma collation » augmente nettement les chances de le faire (méta-analyse de 94 études).',
    refs: ['Gollwitzer & Sheeran, 2006, Adv Exp Soc Psychol 38:69'],
  },
  journee_minimale: {
    title: 'Journée minimale', niveau: 'faible',
    text: 'Garder un minimum même les mauvais jours (3 repas, 1 collation, le questionnaire) entretient l\'indice et l\'identité « je suis quelqu\'un qui mange assez ». Idée tirée d\'Atomic Habits, cohérente avec la recherche sur les habitudes.',
    refs: ['Clear, Atomic Habits, 2018', 'Lally et al., 2010'],
  },
  ciqual: {
    title: 'Base d\'aliments', niveau: 'fort',
    text: 'Valeurs de la table Ciqual 2020 de l\'ANSES, la référence française de composition des aliments, pour 123 des 140 aliments de l\'appli. Les 17 autres (skyr, edamame, plats végétariens maison…) n\'ont pas d\'équivalent fiable dans Ciqual : ce sont des moyennes estimées.',
    refs: ['ANSES, table de composition nutritionnelle Ciqual 2020', 'Énergie absente de certaines lignes : recalculée selon le règlement (UE) n° 1169/2011'],
  },
  rattrapage: {
    title: 'Rattrapage de la veille', niveau: 'modere',
    text: 'Ton poids suit le bilan sur plusieurs jours, pas jour par jour. Si hier tu as mangé moins que prévu, la moitié du manque (300 kcal au plus) est ajoutée aujourd\'hui. On ne retire jamais rien après un gros jour : chez toi, manger plus n\'est pas le risque.',
    refs: ['Hall et al., 2011, Lancet (bilan énergétique)', 'Règle de report : choix de conception'],
  },
  plan_jour: {
    title: 'Plan de fin de journée', niveau: 'faible',
    text: 'Ce qu\'il te reste à manger est réparti sur tes prises restantes, et l\'appli te propose tes propres plats (ceux que tu manges vraiment) pour y arriver. Décider à l\'avance de quoi manger augmente les chances de le faire.',
    refs: ['Gollwitzer & Sheeran, 2006 (intentions de mise en œuvre)', 'Répartition : règle de conception'],
  },
  creneaux: {
    title: 'Créneaux souvent sautés', niveau: 'faible',
    text: 'Si une collation est sautée plus de 6 jours sur 10, la moitié de ses calories passe sur les prises que tu fais vraiment. Mieux vaut un plan adapté à ta vraie journée qu\'un plan idéal jamais suivi.',
    refs: ['Lally et al., 2010 (habitudes)', 'Règle de conception'],
  },
  mini_rattrapage: {
    title: 'Mini-séance ciblée', niveau: 'modere',
    text: 'C\'est le volume total de la semaine par muscle qui compte, pas le jour où il est fait. La mini-séance de semaine cible donc les muscles qui ont le plus de retard sur leurs ≈ 10 séries.',
    refs: ['Pelland et al., 2024', 'Schoenfeld, Grgic & Krieger, 2019'],
  },
  off: {
    title: 'Code-barres et Open Food Facts', niveau: 'modere',
    text: 'Le code-barres donne le produit exact (marque, recette) et les valeurs de son étiquette, saisies par les contributeurs d\'Open Food Facts. C\'est la saisie la plus précise pour un produit emballé. Le produit est ensuite gardé sur ton iPhone et reste disponible hors ligne.',
    refs: ['Open Food Facts (base libre, licence ODbL)', 'Étiquetage nutritionnel obligatoire : règlement (UE) n° 1169/2011'],
  },
  budget: {
    title: 'Prendre du poids avec un petit budget', niveau: 'faible',
    text: 'Les calories les moins chères sont les féculents secs (riz, pâtes, flocons d\'avoine, farine), les légumineuses sèches, l\'huile, le lait et le beurre de cacahuète ; les œufs, les lentilles et le lait apportent aussi des protéines à bas prix. Les prix de l\'appli sont des estimations (enseignes discount) : corrige-les avec ceux de ton magasin.',
    refs: ['Calcul de l\'appli : calories et protéines par euro, à partir de Ciqual et de prix indicatifs', 'Combinaison légumineuses + céréales : Jäger et al., 2017 (ISSN)'],
  },
  sauvegarde: {
    title: 'Pourquoi sauvegarder chaque semaine', niveau: 'faible',
    text: 'Tes données ne quittent jamais ton iPhone. Si tu supprimes l\'appli de l\'écran d\'accueil ou si iOS fait le ménage, seule une sauvegarde permet de tout récupérer.',
    refs: ['Fonctionnement du stockage des applis web sur iOS'],
  },
};

export const NIVEAUX = { fort: 'Preuve forte', modere: 'Preuve modérée', faible: 'Preuve faible' };
