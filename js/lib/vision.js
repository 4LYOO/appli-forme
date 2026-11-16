// Reconnaissance des aliments sur photo : construction de la requête et lecture de la réponse (pures, testées).
// L'appel réseau est dans js/ai.js (SDK Anthropic officiel).

export const VISION_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom court en français, ex. « Croissant », « Compote de pommes », « Café au lait »' },
          brand: { type: ['string', 'null'], description: 'Marque si elle est lisible sur un emballage, sinon null' },
          barcode: { type: ['string', 'null'], description: 'Code-barres seulement si tous les chiffres sont lisibles, sinon null' },
          match_id: { type: ['string', 'null'], description: 'Identifiant de la liste fournie si un aliment correspond, sinon null' },
          grams: { type: 'number', description: 'Quantité estimée en grammes (ou ml pour une boisson)' },
          portion_label: { type: 'string', description: 'Portion en mots simples, ex. « 1 croissant », « 1 pot de 90 g », « 1 grand bol »' },
          kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' },
          confidence: { type: 'string', enum: ['faible', 'moyenne', 'bonne'] },
        },
        required: ['name', 'brand', 'barcode', 'match_id', 'grams', 'portion_label', 'kcal', 'protein', 'carbs', 'fat', 'confidence'],
        additionalProperties: false,
      },
    },
    note: { type: 'string', description: 'Une phrase courte en français : ce qui est incertain (taille, ingrédients cachés, huile…)' },
  },
  required: ['items', 'note'],
  additionalProperties: false,
};

/** Consigne système : stable (mise en cache possible). La liste d'aliments de l'appli sert de référence. */
export function systemPrompt(foods) {
  return [
    'Tu aides un jeune homme végétarien (œufs et laitages acceptés) qui veut prendre du poids à noter ce qu\'il mange, à partir d\'une photo.',
    'Repère chaque aliment ou boisson visible séparément (ex. un croissant, une compote, un café au lait = 3 éléments). Ne compte pas la vaisselle ni les emballages vides.',
    'Pour chaque élément : estime la quantité réellement présente (taille de l\'assiette, du bol, du verre, des couverts et des mains comme repères ; une compote en gourde ou en pot fait souvent 90 à 100 g ; un croissant 45 à 60 g). Pour une boisson, compte 1 ml = 1 g.',
    'Si une marque est lisible sur l\'emballage, donne-la. Ne l\'invente jamais.',
    'Si l\'élément correspond à un aliment de la liste ci-dessous, donne son identifiant dans match_id ; sinon null. Donne aussi tes propres valeurs (kcal, protéines, glucides, lipides) pour la quantité estimée, d\'après les tables françaises (Ciqual) ou l\'étiquette si elle est visible.',
    'Si l\'utilisateur précise ce que c\'est, sa précision l\'emporte sur ce que tu vois.',
    'Sois honnête sur la confiance : « faible » si la quantité ou l\'aliment est douteux.',
    '',
    'Liste des aliments de l\'appli (identifiant : nom) :',
    ...foods.map((f) => `${f.id} : ${f.name}`),
  ].join('\n');
}

export function userText(hint, slotLabel) {
  return `Prise : ${slotLabel || 'repas'}.${hint ? ` L'utilisateur précise : « ${hint} ».` : ''} Liste chaque élément avec sa quantité et ses apports.`;
}

const round1 = (x) => Math.round(x * 10) / 10;

/**
 * Transforme la réponse en éléments du panier. Si l'aliment est reconnu dans la base de l'appli, les valeurs
 * pour 100 g de la base sont utilisées avec la quantité estimée (plus fiables) ; sinon, les valeurs de l'IA.
 */
export function toCartItems(result, foods) {
  const byId = new Map(foods.map((f) => [f.id, f]));
  return (result?.items || []).filter((it) => it && it.grams > 0).map((it) => {
    const f = it.match_id ? byId.get(it.match_id) : null;
    const g = Math.round(it.grams);
    const base = f
      ? { foodId: f.id, kcal: Math.round((f.kcal * g) / 100), p: round1((f.p * g) / 100), g: round1((f.g * g) / 100), l: round1((f.l * g) / 100), source: 'base' }
      : { kcal: Math.round(it.kcal), p: round1(it.protein), g: round1(it.carbs), l: round1(it.fat), source: 'ia' };
    return { name: it.brand && !it.name.includes(it.brand) ? `${it.name} — ${it.brand}` : it.name, label: it.portion_label || `${g} g`, grams: g,
      ...base, brand: it.brand || null, barcode: it.barcode || null, confidence: it.confidence, ai: true };
  });
}

/** Coût indicatif par photo (dollars), pour l'information de l'utilisateur. Image ≈ 1 600 jetons, consigne ≈ 3 500. */
export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (le plus précis)', costPerPhoto: 0.03 },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (rapide)', costPerPhoto: 0.015 },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (le moins cher)', costPerPhoto: 0.001 },
];
