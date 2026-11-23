import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RECIPES } from '../js/data/recipes.js';
import { SHOP, FOOD_TO_SHOP, BASIC_BASKET } from '../js/data/shop.js';
import { recipeTotals, recipeCost, buildList, bestValue } from '../js/lib/shopping.js';

const foods = JSON.parse(readFileSync(new URL('../data/foods.json', import.meta.url))).foods;
const byId = new Map(foods.map((f) => [f.id, f]));
const recipesById = new Map(RECIPES.map((r) => [r.id, r]));

test('chaque recette : ingrédients connus, prix calculable, valeurs plausibles', () => {
  const ids = new Set();
  for (const r of RECIPES) {
    assert.ok(!ids.has(r.id), `id en double ${r.id}`); ids.add(r.id);
    for (const [f] of r.ingredients) { assert.ok(byId.has(f), `${r.id} : aliment ${f}`); assert.ok(FOOD_TO_SHOP[f], `${r.id} : pas de prix pour ${f}`); }
    const t = recipeTotals(r, byId);
    const cost = recipeCost(r, SHOP, FOOD_TO_SHOP);
    const min = r.cat === 'collation' ? 150 : 350;
    assert.ok(t.kcal >= min && t.kcal <= 1400, `${r.id} : ${t.kcal} kcal`);
    assert.ok(cost > 0 && cost < 4, `${r.id} : ${cost} €`);
  }
  for (const cat of ['petitdej', 'collation', 'dejeuner', 'diner']) assert.ok(RECIPES.filter((r) => r.cat === cat).length >= 15, cat);
});

test('porridge : calories et coût attendus', () => {
  const r = recipesById.get('porridge-banane');
  const t = recipeTotals(r, byId);
  assert.ok(t.kcal > 600 && t.kcal < 800, `${t.kcal}`);
  const c = recipeCost(r, SHOP, FOOD_TO_SHOP);
  assert.ok(c > 0.6 && c < 1.2, `${c} €`);
  assert.equal(recipeCost(r, SHOP, FOOD_TO_SHOP, { avoine: 0 }) < c, true); // prix modifié pris en compte
});

test('liste de courses : agrège, arrondit au paquet, exclut ce qu\'on a déjà', () => {
  // 4 portions de riz-lentilles : 4 × 200 g de riz cuit = 320 g de riz sec → 1 paquet de 1 kg
  const plan = { recipes: [{ id: 'riz-lentilles-carottes', portions: 4 }, { id: 'curry-pois-chiches', portions: 3 }], extras: { lait_entier: 3 }, have: ['huile'], manual: [{ name: 'Sauce soja', price: 1.5 }] };
  const L = buildList(plan, recipesById, SHOP, FOOD_TO_SHOP);
  const line = (id) => L.lines.find((l) => l.id === id);
  assert.equal(line('riz').packs, 1); // 4×80 + 3×80 = 560 g de riz sec
  assert.equal(line('pois_chiches').packs, 2); // 3 × 150 g pour des boîtes de 265 g
  assert.equal(line('lait_entier').packs, 3);
  assert.equal(line('huile').have, true);
  assert.ok(!L.lines.filter((l) => !l.have).some((l) => l.id === 'huile'));
  const expected = L.lines.filter((l) => !l.have).reduce((t, l) => t + l.cost, 0);
  assert.ok(Math.abs(L.total - expected) < 0.01);
  assert.ok(L.lines.some((l) => l.manual && l.name === 'Sauce soja'));
  // riz : 560 g pour les recettes + 1 paquet de base → 1 560 g → 2 paquets (et non 1 + 1 + reste perdu)
  const L2 = buildList({ ...plan, extras: { riz: 1 } }, recipesById, SHOP, FOOD_TO_SHOP);
  assert.equal(L2.lines.find((l) => l.id === 'riz').packs, 2);
  const L3 = buildList({ recipes: [{ id: 'riz-lentilles-carottes', portions: 1 }], extras: { riz: 1 } }, recipesById, SHOP, FOOD_TO_SHOP);
  assert.equal(L3.lines.find((l) => l.id === 'riz').packs, 1); // 80 g + 1 kg : 8 % de plus, on n'achète pas un 2e kilo
  const L4 = buildList({ recipes: [{ id: 'riz-lentilles-carottes', portions: 1 }], extras: { lentilles: 1 } }, recipesById, SHOP, FOOD_TO_SHOP);
  assert.equal(L4.lines.find((l) => l.id === 'lentilles').packs, 1); // 60 g + 500 g : 12 % de plus
});

test('panier de base : environ une semaine de besoins pour un petit budget', () => {
  const L = buildList({ extras: Object.fromEntries(BASIC_BASKET) }, recipesById, SHOP, FOOD_TO_SHOP);
  assert.ok(L.kcal / 7 > 2500 && L.kcal / 7 < 3300, `${L.kcal / 7} kcal/j`);
  assert.ok(L.total < 35, `${L.total} €`);
  assert.ok(bestValue(SHOP).slice(0, 5).some((b) => ['huile', 'avoine', 'farine', 'riz', 'pates', 'lentilles'].includes(b.id)));
});
