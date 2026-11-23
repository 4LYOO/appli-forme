// Idées repas : « je ne sais pas quoi manger » → une liste simple par moment de la journée,
// avec temps, prix par portion, calories et protéines ; recette en un tap ; noter ou mettre dans la liste de courses.
import * as db from '../db.js';
import { h, mount, why, fmt, toast, sheet, clear, stepper } from '../ui.js';
import { icon } from '../icons.js';
import { todayISO, nowMinutes } from '../lib/dates.js';
import { RECIPES, CATEGORIES } from '../data/recipes.js';
import { SHOP, FOOD_TO_SHOP } from '../data/shop.js';
import { recipeTotals, recipeCost } from '../lib/shopping.js';
import { loadFoods } from './meals.js';
import { refresh } from '../main.js';

let cat = null;
let filters = new Set();
let sort = 'toi';

const FILTERS = [
  { id: 'rapide', label: '⚡ ≤ 10 min', test: (r) => r.time <= 10 },
  { id: 'prix', label: '€ Petit prix', test: (r) => r.cost <= (r.cat === 'collation' ? 0.5 : 0.9) },
  { id: 'emporter', label: '🎒 À emporter', test: (r) => r.tags.includes('emporter') },
  { id: 'froid', label: '❄ Sans cuisson', test: (r) => r.tags.includes('froid') },
  { id: 'proteine', label: '💪 Protéiné', test: (r) => r.p >= (r.cat === 'collation' ? 15 : 25) },
  { id: 'avance', label: '📦 Pour plusieurs jours', test: (r) => r.tags.includes('avance') },
];

function defaultCat() {
  const m = nowMinutes();
  if (m < 9 * 60 + 30) return 'petitdej';
  if (m < 11 * 60) return 'collation';
  if (m < 14 * 60) return 'dejeuner';
  if (m < 18 * 60 + 30) return 'collation';
  if (m < 21 * 60) return 'diner';
  return 'collation';
}

export async function enrich() {
  const foods = await loadFoods();
  const byId = new Map(foods.map((f) => [f.id, f]));
  const prices = await db.kvGet('prices', {});
  return { byId, prices, list: RECIPES.map((r) => { const t = recipeTotals(r, byId); return { ...r, kcal: t.kcal, p: t.p, cost: recipeCost(r, SHOP, FOOD_TO_SHOP, prices) }; }) };
}

export async function render(root) {
  cat = cat || defaultCat();
  const { byId, list } = await enrich();
  const plan = await db.kvGet('shopPlan', { recipes: [] });
  const inPlan = new Map((plan.recipes || []).map((x) => [x.id, x.portions]));

  const listEl = h('div');
  const draw = () => {
    clear(listEl);
    let rs = list.filter((r) => r.cat === cat && [...filters].every((f) => FILTERS.find((x) => x.id === f).test(r)));
    // « Pour toi » : beaucoup de calories et de protéines pour peu d'argent et de temps (prise de masse, petit budget)
    const score = (r) => r.kcal / Math.max(0.2, r.cost) / 10 + r.p * 2 - r.time * 0.6;
    rs.sort(sort === 'prix' ? (a, b) => a.cost - b.cost : sort === 'temps' ? (a, b) => a.time - b.time : sort === 'kcal' ? (a, b) => b.kcal - a.kcal : (a, b) => score(b) - score(a));
    if (!rs.length) { mount(listEl, h('p.muted.small', { style: { padding: '20px 4px' } }, 'Aucune idée avec tous ces filtres : enlève-en un.')); return; }
    mount(listEl, h('div.small.muted', { style: { margin: '4px 4px 8px' } }, `${rs.length} idée${rs.length > 1 ? 's' : ''}`),
      h('div.list', rs.map((r) => h('div.list-item', { role: 'button', tabindex: '0', onclick: () => recipeSheet(r, byId) },
        h('div.grow',
          h('div', { style: { fontWeight: 650 } }, r.name),
          h('div.small.muted.num', `${r.time} min · ${fmt.kg(r.cost, 2)} € · ${fmt.int(r.kcal)} kcal · ${fmt.int(r.p)} g prot.`),
          inPlan.has(r.id) ? h('div.tiny.accent', `Dans ta liste : ${inPlan.get(r.id)} portion${inPlan.get(r.id) > 1 ? 's' : ''}`) : null),
        h('button.icon-btn', { 'aria-label': `Ajouter ${r.name} à la liste de courses`, onclick: async (e) => { e.stopPropagation(); await addToPlan(r.id, r.tags.includes('avance') ? 3 : 1); toast(`${r.name} ajouté aux courses`); refresh(); } }, icon('plus'))))));
  };

  const segCat = h('div.seg', CATEGORIES.map((c) => h(`button${c.id === cat ? '.on' : ''}`, { onclick: (e) => { cat = c.id; segCat.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.target.classList.add('on'); draw(); } }, c.label)));
  const chipsEl = h('div.tabs', FILTERS.map((f) => h(`button${filters.has(f.id) ? '.on' : ''}`, { onclick: (e) => { filters.has(f.id) ? filters.delete(f.id) : filters.add(f.id); e.target.classList.toggle('on'); draw(); } }, f.label)));
  const segSort = h('div.seg', [['toi', 'Pour toi'], ['prix', 'Moins cher'], ['temps', 'Rapide'], ['kcal', '+ kcal']].map(([id, l]) =>
    h(`button${id === sort ? '.on' : ''}`, { onclick: (e) => { sort = id; segSort.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.target.classList.add('on'); draw(); } }, l)));

  mount(root,
    h('div.page-head', h('div', h('h1', 'Idées repas'), h('div.sub', 'Tu ne sais pas quoi manger ? Choisis.'))),
    segCat,
    h('div', { style: { marginTop: '10px' } }, h('button.btn.btn-primary', { onclick: () => {
      const pool = list.filter((r) => r.cat === cat && [...filters].every((f) => FILTERS.find((x) => x.id === f).test(r)));
      if (pool.length) recipeSheet(pool[Math.floor(Math.random() * pool.length)], byId, true);
    } }, '🎲 Choisis pour moi')),
    h('div', { style: { margin: '12px 0 8px' } }, chipsEl),
    segSort,
    h('div', { style: { marginTop: '8px' } }, listEl),
    h('p.tiny.muted', { style: { marginTop: '12px' } }, 'Prix par portion = ce que coûtent les quantités utilisées (prix indicatifs d\'enseignes discount, modifiables dans Courses).'),
    why(['densite', 'budget']));
  draw();
}

export async function addToPlan(id, portions) {
  const plan = await db.kvGet('shopPlan', { recipes: [], extras: {}, have: [], checked: [], manual: [] });
  plan.recipes = plan.recipes || [];
  const ex = plan.recipes.find((x) => x.id === id);
  if (ex) ex.portions += portions; else plan.recipes.push({ id, portions });
  await db.kvSet('shopPlan', plan);
}

function recipeSheet(r, byId, random = false) {
  let n = 1;
  const body = h('div');
  const slot = CATEGORIES.find((c) => c.id === r.cat).slot;
  const draw = () => {
    clear(body);
    const t = recipeTotals(r, byId, n);
    mount(body,
      h('div.kpis',
        h('div.kpi', h('div.label', `Pour ${n} portion${n > 1 ? 's' : ''}`), h('div.value', fmt.int(t.kcal), h('span.unit', 'kcal'))),
        h('div.kpi', h('div.label', 'Protéines · prix'), h('div.value', fmt.int(t.p), h('span.unit', `g · ${fmt.kg(r.cost * n, 2)} €`)))),
      h('div.section-title', 'Ingrédients'),
      h('div.list', t.items.map((i) => h('div.list-item', h('span.grow', i.name), h('span.small.muted.num', `${fmt.int(i.grams)} g`)))),
      h('div.section-title', `Préparation · ${r.time} min`),
      h('ol.small', { style: { paddingLeft: '20px', margin: 0, lineHeight: 1.5 } }, r.steps.map((s) => h('li', { style: { marginBottom: '6px' } }, s))));
  };
  sheet(r.name, (close) => h('div.stack',
    random ? h('div.coach', '🎲 Proposé au hasard parmi tes filtres. Pas envie ? Relance depuis l\'écran Idées.') : null,
    h('div.row.between', h('span.small.muted', 'Portions'), stepper(1, { min: 1, max: 8, onChange: (v) => { n = v; draw(); } })),
    body,
    h('div.btn-row',
      h('button.btn.btn-primary', { onclick: async () => {
        const items = recipeTotals(r, byId, 1).items;
        const total = { kcal: items.reduce((x, i) => x + i.kcal, 0), p: Math.round(items.reduce((x, i) => x + i.p, 0) * 10) / 10, g: 0, l: 0 };
        try { await db.put('meals', { date: todayISO(), slot: nowSlot(slot), name: r.name, items, total, ts: Date.now() }); toast('Noté dans tes repas (1 portion)'); close(); } catch {}
      } }, 'Je le mange'),
      h('button.btn', { onclick: async () => { await addToPlan(r.id, n); toast(`${n} portion${n > 1 ? 's' : ''} dans ta liste de courses`); close(); refresh(); } }, '+ Courses'))));
  draw();
}

function nowSlot(def) {
  if (def !== 'c16') return def;
  const m = nowMinutes();
  return m < 13 * 60 ? 'c10' : m < 19 * 60 ? 'c16' : 'coucher';
}
