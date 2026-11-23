// Liste de courses : repas choisis pour la semaine → produits à acheter, arrondis au paquet, avec prix indicatifs,
// total, budget, et part des besoins de la semaine couverte. Pensé petit budget et prise de masse.
import * as db from '../db.js';
import { h, mount, why, fmt, toast, sheet, clear, confirmSheet } from '../ui.js';
import { icon } from '../icons.js';
import { RECIPES } from '../data/recipes.js';
import { SHOP, RAYONS, BASIC_BASKET } from '../data/shop.js';
import { FOOD_TO_SHOP } from '../data/shop.js';
import { buildList, bestValue, priceOf } from '../lib/shopping.js';
import { effectiveTargets } from '../state.js';
import { enrich } from './ideas.js';
import { go, refresh } from '../main.js';

const EMPTY = { recipes: [], extras: {}, have: [], checked: [], manual: [] };
const euros = (x) => `${fmt.kg(x, 2)} €`;

async function getPlan() { return { ...EMPTY, ...(await db.kvGet('shopPlan', EMPTY)) }; }
async function savePlan(p) { try { await db.kvSet('shopPlan', p); } catch {} }

export async function render(root) {
  const [plan, prices, budget, t, E] = await Promise.all([getPlan(), db.kvGet('prices', {}), db.kvGet('budget', null), effectiveTargets(), enrich()]);
  const recipesById = new Map(RECIPES.map((r) => [r.id, r]));
  const enriched = new Map(E.list.map((r) => [r.id, r]));
  const L = buildList(plan, recipesById, SHOP, FOOD_TO_SHOP, prices);
  const checked = new Set(plan.checked);
  const weekNeed = (t?.kcal || 2900) * 7;
  const cover = L.kcal / weekNeed;

  const update = async (fn) => { const p = await getPlan(); fn(p); await savePlan(p); refresh(); };

  // ----- En-tête : total, budget, couverture -----
  const head = h('div.card.hero',
    h('div.row.between',
      h('div', h('div.eyebrow', 'Total estimé'), h('div.big', { style: { fontSize: '44px' } }, euros(L.total))),
      h('button.btn.btn-sm', { onclick: () => budgetSheet(budget) }, budget ? `Budget ${budget} €` : 'Fixer un budget')),
    budget ? h('div.progress', { style: { marginTop: '10px' } }, h('div.progress-track', h('div.progress-fill', { style: { width: `${Math.min(100, (L.total / budget) * 100)}%`, background: L.total > budget ? 'var(--danger)' : '' } })),
      h('div.small.muted', { style: { marginTop: '4px' } }, L.total > budget ? `${euros(L.total - budget)} au-dessus du budget` : `Il reste ${euros(budget - L.total)}`)) : null,
    L.lines.length ? h('p.small', { style: { marginTop: '10px' } },
      `Ta liste apporte ≈ ${fmt.int(L.kcal)} kcal et ${fmt.int(L.prot)} g de protéines (paquets entiers) : `,
      h('strong', `${Math.round(cover * 100)} % de tes besoins de la semaine`),
      cover < 0.8 ? ' (complète avec le panier de base ou d\'autres repas).' : '.') : null);

  // ----- Repas de la semaine -----
  const mealsCard = h('div.card',
    h('div.card-head', h('h2', 'Mes repas de la semaine'), h('button.btn.btn-sm', { style: { whiteSpace: 'nowrap' }, onclick: () => go('idees') }, '+ Idées')),
    plan.recipes.length ? h('div', plan.recipes.map((x) => {
      const r = enriched.get(x.id); if (!r) return null;
      return h('div.pick',
        h('div.pick-main', h('div.pick-name', r.name), h('div.pick-sub', `${euros(r.cost * x.portions)} · ${fmt.int(r.kcal * x.portions)} kcal`)),
        h('div.row', h('button.icon-btn', { 'aria-label': 'Une portion de moins', onclick: () => update((p) => { const y = p.recipes.find((z) => z.id === x.id); y.portions--; p.recipes = p.recipes.filter((z) => z.portions > 0); }) }, '−'),
          h('strong.num', { style: { minWidth: '22px', textAlign: 'center' } }, String(x.portions)),
          h('button.icon-btn', { 'aria-label': 'Une portion de plus', onclick: () => update((p) => { p.recipes.find((z) => z.id === x.id).portions++; }) }, '+')));
    })) : h('p.small.muted', 'Choisis des repas dans Idées (bouton +) : leurs ingrédients s\'ajoutent ici automatiquement, au bon nombre de paquets.'));

  // ----- Panier de base -----
  const basketCost = BASIC_BASKET.reduce((s, [id, n]) => s + priceOf(SHOP, id, prices) * n, 0);
  const basketKcal = BASIC_BASKET.reduce((s, [id, n]) => s + (SHOP[id].g * n * SHOP[id].kcal) / 100, 0);
  const hasBasket = BASIC_BASKET.every(([id]) => (plan.extras[id] || 0) > 0);
  const basketCard = h('div.card',
    h('div.card-head', h('div', h('h2', 'Panier de base petit budget'), h('div.small.muted', `≈ ${euros(basketCost)} pour ≈ ${fmt.int(basketKcal / 7)} kcal par jour pendant 7 jours`)), why('budget')),
    h('p.small.muted', 'Les produits qui donnent le plus de calories et de protéines par euro : flocons, riz, pâtes, lentilles, pois chiches, lait entier, œufs, beurre de cacahuète, bananes, pain, fromage blanc, emmental, légumes.'),
    h('div', { style: { marginTop: '10px' } }, hasBasket
      ? h('button.btn', { onclick: () => update((p) => { for (const [id] of BASIC_BASKET) delete p.extras[id]; }) }, 'Retirer le panier de base')
      : h('button.btn.btn-primary', { onclick: () => update((p) => { for (const [id, n] of BASIC_BASKET) p.extras[id] = Math.max(p.extras[id] || 0, n); }) }, '+ Ajouter le panier de base')));

  // ----- Liste par rayon -----
  const listCard = h('div');
  const toBuy = L.lines.filter((l) => !l.have);
  const have = L.lines.filter((l) => l.have);
  if (L.lines.length) {
    const rayons = [...RAYONS, 'Autres'];
    for (const ray of rayons) {
      const ls = toBuy.filter((l) => l.rayon === ray).sort((a, b) => checked.has(a.id) - checked.has(b.id) || a.name.localeCompare(b.name));
      if (!ls.length) continue;
      mount(listCard, h('div.section-title', ray), h('div.list', ls.map((l) => lineRow(l, checked.has(l.id), update, prices))));
    }
    if (have.length) mount(listCard, h('div.section-title', 'Déjà à la maison (pas compté)'), h('div.list', have.map((l) => h('div.list-item',
      h('span.grow.muted', l.name), h('button.btn.btn-sm', { onclick: () => update((p) => { p.have = p.have.filter((x) => x !== l.id); }) }, 'À acheter')))));
  }

  let manName = '', manPrice = '';
  mount(root,
    h('div.page-head', h('div', h('h1', 'Courses'), h('div.sub', 'Ta liste, calculée à partir de tes repas'))),
    head,
    mealsCard,
    basketCard,
    L.lines.length ? h('div', h('div.section-title', `À acheter · ${toBuy.length} produit${toBuy.length > 1 ? 's' : ''}`), h('p.tiny.muted', { style: { margin: '0 6px' } }, 'Coche en magasin. Touche le prix pour le corriger. 🏠 = je l\'ai déjà.')) : null,
    listCard,
    L.unpriced.length ? h('p.tiny.muted', { style: { marginTop: '8px' } }, `Sans prix (non comptés) : ${L.unpriced.join(', ')}`) : null,
    h('div.card', { style: { marginTop: '12px' } },
      h('div.small.muted', { style: { marginBottom: '8px' } }, 'Ajouter un produit à la main'),
      h('div.row', h('input.input.grow', { placeholder: 'Ex. sauce soja', oninput: (e) => (manName = e.target.value) }),
        h('input.input', { type: 'number', inputmode: 'decimal', step: '0.1', placeholder: '€', style: { width: '80px' }, oninput: (e) => (manPrice = e.target.value) }),
        h('button.icon-btn.accent-fill', { 'aria-label': 'Ajouter', onclick: () => { if (!manName.trim()) return; update((p) => { p.manual.push({ name: manName.trim(), price: parseFloat(String(manPrice).replace(',', '.')) || 0 }); }); } }, icon('plus')))),
    h('div.btn-row', { style: { marginTop: '12px' } },
      h('button.btn', { onclick: () => shareList(L, checked) }, 'Partager la liste'),
      h('button.btn', { onclick: async () => { if (await confirmSheet('Nouvelle semaine ?', 'La liste et les repas choisis seront vidés. Tes prix et ton budget sont gardés.', 'Vider la liste')) { await savePlan({ ...EMPTY }); refresh(); } } }, 'Nouvelle semaine')),
    bestValueCard(prices, update),
    h('div.list', { style: { marginTop: '16px' } }, h('button.list-item', { onclick: aidSheet }, h('span.grow', 'Coup dur ? Aides alimentaires', h('br'), h('span.small.muted', 'Où trouver de quoi manger gratuitement ou à petit prix')), h('span.chev', '›'))),
  );
}

function lineRow(l, isChecked, update, prices) {
  return h('div.list-item', { style: isChecked ? { opacity: 0.45 } : {} },
    h('input', { type: 'checkbox', checked: isChecked, 'aria-label': `Acheté : ${l.name}`, style: { width: '24px', height: '24px', accentColor: 'var(--accent)', flex: 'none' },
      onchange: (e) => update((p) => { const s = new Set(p.checked); e.target.checked ? s.add(l.id) : s.delete(l.id); p.checked = [...s]; }) }),
    h('div.grow', h('div', { style: { fontWeight: 600, textDecoration: isChecked ? 'line-through' : 'none' } }, l.name),
      h('div.small.muted', l.manual ? 'ajouté à la main' : `${l.packs} × ${l.pack}`)),
    h('button.btn.btn-sm.num', { 'aria-label': `Prix de ${l.name}`, onclick: () => {
      if (l.manual) return;
      const v = prompt(`Prix d'un « ${l.pack} » de ${l.name} dans ton magasin (€) :`, String(l.unit).replace('.', ','));
      const x = parseFloat(String(v || '').replace(',', '.'));
      if (x >= 0) db.kvSet('prices', { ...prices, [l.id]: x }).then(() => { toast('Prix enregistré pour les prochaines fois'); refresh(); }).catch(() => {});
    } }, euros(l.cost)),
    !l.manual ? h('button.icon-btn', { 'aria-label': `J'ai déjà : ${l.name}`, style: { width: '36px', height: '36px', fontSize: '16px' }, onclick: () => update((p) => { p.have = [...new Set([...(p.have || []), l.id])]; }) }, '🏠')
      : h('button.icon-btn', { 'aria-label': `Retirer ${l.name}`, style: { width: '36px', height: '36px' }, onclick: () => update((p) => { p.manual = p.manual.filter((m) => `m:${m.name}` !== l.id); }) }, icon('close')));
}

function bestValueCard(prices, update) {
  const best = bestValue(SHOP, prices, 10);
  return h('details.card', { style: { marginTop: '12px' } },
    h('summary', { style: { fontWeight: 650 } }, 'Les plus rentables pour prendre du poids'),
    h('p.small.muted', { style: { margin: '8px 0' } }, 'Calories et protéines pour 1 € dépensé. En haut de la liste : de quoi manger plus sans dépenser plus.'),
    h('div.list', best.map((b) => h('div.list-item',
      h('span.grow', b.name, h('br'), h('span.small.muted.num', `${fmt.int(b.kcalPerEuro)} kcal/€ · ${fmt.int(b.protPerEuro)} g prot./€`)),
      h('button.icon-btn', { 'aria-label': `Ajouter ${b.name}`, onclick: () => update((p) => { p.extras[b.id] = (p.extras[b.id] || 0) + 1; }) }, icon('plus'))))),
    why('budget'));
}

function budgetSheet(cur) {
  let v = cur || '';
  sheet('Budget courses de la semaine', (close) => h('div.stack',
    h('input.input.input-big', { type: 'number', inputmode: 'decimal', placeholder: '€', value: v, oninput: (e) => (v = e.target.value) }),
    h('button.btn.btn-primary', { onclick: async () => { const x = parseFloat(String(v).replace(',', '.')); try { await db.kvSet('budget', x > 0 ? x : null); close(); refresh(); } catch {} } }, 'Enregistrer'),
    h('p.small.muted', 'Indicatif : le panier de base coûte environ 30 € pour une semaine complète.')));
}

async function shareList(L, checked) {
  const lines = L.lines.filter((l) => !l.have && !checked.has(l.id));
  const text = `Courses (≈ ${euros(lines.reduce((t, l) => t + l.cost, 0))})\n` + lines.map((l) => `☐ ${l.name}${l.manual ? '' : ` — ${l.packs} × ${l.pack}`} (${euros(l.cost)})`).join('\n');
  try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Liste copiée'); } }
  catch (e) { if (e.name !== 'AbortError') toast('Impossible de partager'); }
}

function aidSheet() {
  sheet('Aides alimentaires', h('div.stack',
    h('p.small', 'Si l\'argent manque, ces aides existent pour ça, sans avoir à se justifier longuement :'),
    h('div.list',
      h('div.list-item', h('div.grow', h('strong', 'Restos du Cœur, Secours populaire, Croix-Rouge'), h('div.small.muted', 'Colis ou repas gratuits. Cherche « Restos du Cœur » + ta ville pour le centre le plus proche.'))),
      h('div.list-item', h('div.grow', h('strong', 'Épiceries sociales et solidaires'), h('div.small.muted', 'Produits à 10-30 % du prix. Accès via le CCAS de ta mairie ou une assistante sociale.'))),
      h('div.list-item', h('div.grow', h('strong', 'CCAS de ta mairie'), h('div.small.muted', 'Aides d\'urgence, bons alimentaires, orientation vers les épiceries solidaires.'))),
      h('div.list-item', h('div.grow', h('strong', 'Si tu es étudiant : CROUS'), h('div.small.muted', 'Repas à 1 € au resto U pour les boursiers et étudiants en difficulté, aides d\'urgence.')))),
    h('p.tiny.muted', 'Les légumineuses sèches, les flocons d\'avoine, le riz et les pâtes restent les calories les moins chères : l\'appli les met en avant.')));
}
