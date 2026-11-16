// Assiettes types : composées d'aliments de la base (par nom) et de grammes de référence (taille « normale »).
// L'utilisateur choisit seulement Petite (×0,7) / Normale (×1) / Grosse (×1,4).
export const SIZES = [
  { id: 'S', label: 'Petite', k: 0.7 },
  { id: 'M', label: 'Normale', k: 1 },
  { id: 'L', label: 'Grosse', k: 1.4 },
];

export const PLATES = [
  // Petit-déjeuner
  { id: 'p_porridge', slots: ['petitdej'], name: 'Porridge avoine, lait, banane, beurre de cacahuète',
    items: [['Flocons d\'avoine', 60], ['Lait entier', 250], ['Banane', 120], ['Beurre de cacahuète', 16]] },
  { id: 'p_tartines', slots: ['petitdej'], name: 'Tartines beurre-confiture + bol de lait',
    items: [['Baguette', 100], ['Beurre', 10], ['Confiture', 20], ['Lait demi-écrémé', 300]] },
  { id: 'p_skyr_granola', slots: ['petitdej', 'coucher', 'c16'], name: 'Skyr, granola et fruits rouges',
    items: [['Skyr nature', 150], ['Granola', 50], ['Fruits rouges (surgelés)', 80]] },
  { id: 'p_oeufs_pain', slots: ['petitdej', 'diner'], name: 'Œufs brouillés et pain complet',
    items: [['Œufs brouillés', 165], ['Pain complet', 70]] },
  // Repas
  { id: 'p_riz_lentilles', slots: ['midi', 'diner'], name: 'Riz, lentilles et légumes',
    items: [['Riz blanc cuit', 200], ['Lentilles vertes cuites', 150], ['Légumes variés cuits', 150], ['Huile d\'olive', 10]] },
  { id: 'p_pates_fromage', slots: ['midi', 'diner'], name: 'Pâtes sauce tomate et fromage râpé',
    items: [['Pâtes cuites', 250], ['Sauce tomate', 100], ['Emmental / fromage râpé', 30], ['Huile d\'olive', 5]] },
  { id: 'p_curry_pc', slots: ['midi', 'diner'], name: 'Curry de pois chiches et riz',
    items: [['Curry de pois chiches', 300], ['Riz blanc cuit', 180]] },
  { id: 'p_tofu_riz', slots: ['midi', 'diner'], name: 'Tofu sauté, riz et légumes',
    items: [['Tofu ferme nature', 100], ['Riz blanc cuit', 200], ['Poêlée de légumes (avec huile)', 150]] },
  { id: 'p_bowl_quinoa', slots: ['midi'], name: 'Bowl quinoa, pois chiches, feta, avocat',
    items: [['Quinoa cuit', 180], ['Pois chiches cuits', 100], ['Feta', 30], ['Avocat', 75], ['Huile d\'olive', 10]] },
  { id: 'p_omelette', slots: ['diner', 'midi'], name: 'Omelette 3 œufs, pommes de terre, salade',
    items: [['Omelette nature (avec matière grasse)', 165], ['Pommes de terre cuites à l\'eau', 200], ['Salade verte', 50], ['Huile d\'olive', 5]] },
  { id: 'p_chili', slots: ['midi', 'diner'], name: 'Chili sin carne et riz',
    items: [['Chili sin carne', 300], ['Riz blanc cuit', 180], ['Emmental / fromage râpé', 20]] },
  { id: 'p_dahl', slots: ['midi', 'diner'], name: 'Dahl de lentilles, riz et naan/pain',
    items: [['Dahl de lentilles', 300], ['Riz blanc cuit', 150], ['Baguette', 60]] },
  { id: 'p_wrap', slots: ['midi'], name: 'Wraps houmous, falafels, crudités',
    items: [['Tortilla de blé (wrap)', 120], ['Houmous', 60], ['Falafels', 100], ['Carottes râpées', 50]] },
  { id: 'p_sandwich', slots: ['midi'], name: 'Sandwich œuf-fromage + fruit',
    items: [['Baguette', 125], ['Œuf dur ou à la coque', 100], ['Emmental / fromage râpé', 30], ['Beurre', 10], ['Pomme', 150]] },
  // Collations
  { id: 'p_smoothie', slots: ['c10', 'c16', 'coucher', 'petitdej'], name: 'Smoothie prise de masse (lait, banane, avoine, beurre de cacahuète)',
    items: [['Lait entier', 300], ['Banane', 120], ['Flocons d\'avoine', 40], ['Beurre de cacahuète', 16]] },
  { id: 'p_amandes_dattes', slots: ['c10', 'c16'], name: 'Amandes et dattes',
    items: [['Amandes', 30], ['Dattes', 40]] },
  { id: 'p_sandwich_bc', slots: ['c10', 'c16'], name: 'Sandwich beurre de cacahuète-banane',
    items: [['Pain de mie complet', 50], ['Beurre de cacahuète', 32], ['Banane', 120]] },
  { id: 'p_fb_coucher', slots: ['coucher'], name: 'Fromage blanc, miel et noix (30-40 g de protéines)',
    items: [['Fromage blanc 3 %', 300], ['Miel', 10], ['Noix', 20]] },
  { id: 'p_skyr_coucher', slots: ['coucher'], name: 'Grand skyr et banane',
    items: [['Skyr nature', 300], ['Banane', 120]] },
  { id: 'p_lait_biscuits', slots: ['c16', 'c10'], name: 'Lait chocolaté et biscuits',
    items: [['Lait chocolaté', 250], ['Biscuits secs (type petit-beurre)', 32]] },
  { id: 'p_pain_choco', slots: ['c16', 'c10'], name: 'Pain et chocolat',
    items: [['Baguette', 60], ['Chocolat noir 70 %', 20]] },
];

// Estimation rapide quand on n'a ni le temps ni le détail (SPEC : saisie en quelques taps).
// La méthode adaptative calibre ensuite la dépense sur TA façon de saisir (RECHERCHE.md §1).
export const QUICK = {
  repas: [
    { id: 'leger', label: 'Repas léger', kcal: 450, p: 15 },
    { id: 'normal', label: 'Repas normal', kcal: 700, p: 25 },
    { id: 'copieux', label: 'Repas copieux', kcal: 950, p: 35 },
    { id: 'tres_copieux', label: 'Très copieux / resto', kcal: 1250, p: 40 },
  ],
  collation: [
    { id: 'petite', label: 'Petite collation', kcal: 150, p: 5 },
    { id: 'moyenne', label: 'Collation moyenne', kcal: 300, p: 10 },
    { id: 'grosse', label: 'Grosse collation', kcal: 500, p: 18 },
  ],
};

// Idées de collations à emporter (journée hors de chez soi, sans frigo). Densité = kcal par portion.
export const SNACK_IDEAS = [
  { name: 'Amandes + dattes', why: 'Se garde des jours dans le sac, ≈ 300 kcal sans volume.' },
  { name: 'Sandwich beurre de cacahuète-banane', why: '≈ 500 kcal, se prépare en 2 min le matin.' },
  { name: 'Mélange fruits secs et oléagineux', why: 'Très dense : une grosse poignée ≈ 220 kcal.' },
  { name: 'Bouteille de lait chocolaté UHT ou boisson soja', why: 'Calories liquides : moins rassasiantes, faciles à boire (DiMeglio & Mattes 2000).' },
  { name: 'Œufs durs (2)', why: '≈ 140 kcal et 12 g de protéines. Tiennent la matinée au frais d\'un sac isotherme.' },
  { name: 'Fromage à pâte dure (comté, emmental)', why: 'Riche en protéines et en énergie, supporte quelques heures hors frigo.' },
  { name: 'Barres de céréales + banane', why: 'Simple, se trouve partout en gare.' },
  { name: 'Pain + chocolat noir', why: '≈ 280 kcal, classique et efficace.' },
  { name: 'Gourde de compote + biscuits', why: 'Facile à avaler même sans faim.' },
  { name: 'Smoothie maison en bouteille isotherme', why: 'Jusqu\'à 600-700 kcal préparés la veille.' },
];
