// Recettes et courses : calories, coût par portion, liste de courses chiffrée. Fonctions pures.

const round1 = (x) => Math.round(x * 10) / 10;

/** Éléments (format repas de l'appli) et totaux d'une recette pour n portions. */
export function recipeItems(recipe, foodsById, portions = 1) {
  return recipe.ingredients.map(([id, g]) => {
    const f = foodsById.get(id);
    const grams = g * portions;
    if (!f) return { name: id, label: `${Math.round(grams)} g`, grams, kcal: 0, p: 0, g: 0, l: 0 };
    const k = grams / 100;
    return { foodId: id, name: f.name, label: `${Math.round(grams)} g`, grams: Math.round(grams), kcal: Math.round(f.kcal * k), p: round1(f.p * k), g: round1(f.g * k), l: round1(f.l * k) };
  });
}

export function recipeTotals(recipe, foodsById, portions = 1) {
  const items = recipeItems(recipe, foodsById, portions);
  return { kcal: items.reduce((t, i) => t + i.kcal, 0), p: round1(items.reduce((t, i) => t + i.p, 0)), items };
}

/** Grammes de chaque produit à acheter pour une liste d'(aliment, grammes). */
export function shopNeeds(pairs, foodToShop) {
  const need = new Map();
  const unpriced = [];
  for (const [foodId, grams] of pairs) {
    const map = foodToShop[foodId];
    if (!map) { unpriced.push(foodId); continue; }
    for (const [shopId, factor] of map) need.set(shopId, (need.get(shopId) || 0) + grams * factor);
  }
  return { need, unpriced };
}

/** Prix d'un produit (prix modifié par l'utilisateur prioritaire). */
export const priceOf = (shop, id, overrides = {}) => (overrides[id] ?? shop[id]?.price ?? 0);

/** Coût d'une portion : au prorata des grammes réellement utilisés (pas des paquets entiers). */
export function recipeCost(recipe, shop, foodToShop, overrides = {}) {
  const { need } = shopNeeds(recipe.ingredients, foodToShop);
  let c = 0;
  for (const [id, g] of need) if (shop[id]) c += (g / shop[id].g) * priceOf(shop, id, overrides);
  return Math.round(c * 100) / 100;
}

/**
 * Liste de courses de la semaine.
 * plan : { recipes: [{ id, portions }], extras: { shopId: nbPaquets }, have: [shopId], manual: [{ name, price }] }
 * Retourne { lines: [{ id, name, rayon, pack, packs, grams, unit, cost, have, fromRecipes, extra }], total, kcal, prot, unpriced }
 */
export function buildList(plan, recipesById, shop, foodToShop, overrides = {}) {
  const pairs = [];
  for (const { id, portions } of plan.recipes || []) {
    const r = recipesById.get(id);
    if (r) for (const [f, g] of r.ingredients) pairs.push([f, g * portions]);
  }
  const { need, unpriced } = shopNeeds(pairs, foodToShop);
  const ids = new Set([...need.keys(), ...Object.keys(plan.extras || {}).filter((k) => plan.extras[k] > 0)]);
  const have = new Set(plan.have || []);
  const lines = [];
  for (const id of ids) {
    const s = shop[id]; if (!s) continue;
    const grams = need.get(id) || 0;
    const packsForRecipes = grams > 0 ? Math.max(1, Math.ceil(grams / s.g - 0.05)) : 0; // 5 % de tolérance
    const extra = (plan.extras || {})[id] || 0;
    // Le reste d'un paquet entamé par les recettes compte dans les paquets ajoutés à part (panier de base…)
    const packs = extra ? Math.max(packsForRecipes, extra, Math.ceil((grams + extra * s.g) / s.g - 0.15)) : packsForRecipes; // ≤ 15 % de dépassement : pas de paquet en plus
    const unit = priceOf(shop, id, overrides);
    lines.push({ id, name: s.name, rayon: s.rayon, pack: s.pack, packs, grams: Math.round(grams), unit, cost: Math.round(packs * unit * 100) / 100,
      have: have.has(id), fromRecipes: packsForRecipes, extra, kcal: (packs * s.g * s.kcal) / 100, prot: (packs * s.g * (s.prot || 0)) / 100 });
  }
  for (const m of plan.manual || []) lines.push({ id: `m:${m.name}`, name: m.name, rayon: 'Autres', pack: '', packs: 1, unit: m.price || 0, cost: m.price || 0, have: false, manual: true, kcal: 0, prot: 0 });
  const buy = lines.filter((l) => !l.have);
  return {
    lines,
    total: Math.round(buy.reduce((t, l) => t + l.cost, 0) * 100) / 100,
    kcal: Math.round(lines.reduce((t, l) => t + l.kcal, 0)), // ce que la liste apporte (y compris ce qu'on a déjà)
    prot: Math.round(lines.reduce((t, l) => t + l.prot, 0)),
    unpriced: [...new Set(unpriced)],
  };
}

/** Meilleurs rapports calories/prix et protéines/prix (produits « rentables » pour une prise de masse). */
export function bestValue(shop, overrides = {}, n = 12) {
  return Object.entries(shop).filter(([, s]) => s.kcal > 0)
    .map(([id, s]) => { const pr = priceOf(shop, id, overrides); return { id, name: s.name, kcalPerEuro: Math.round((s.g * s.kcal) / 100 / pr), protPerEuro: Math.round((s.g * (s.prot || 0)) / 100 / pr) }; })
    .sort((a, b) => (b.kcalPerEuro + b.protPerEuro * 20) - (a.kcalPerEuro + a.protPerEuro * 20)).slice(0, n);
}
