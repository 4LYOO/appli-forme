// Courses : repas de la semaine + produits cochés dans le catalogue → liste par rayon, prix par magasin,
// total, budget, part des besoins couverte. Pensé petit budget et prise de masse.
import * as db from '../db.js';
import { h, mount, why, fmt, toast, sheet, clear, confirmSheet } from '../ui.js';
import { icon } from '../icons.js';
import { RECIPES } from '../data/recipes.js';
import { SHOP, RAYONS, BASIC_BASKET, FOOD_TO_SHOP, STORES, storePrice, availableIn } from '../data/shop.js';
import { buildList, bestValue } from '../lib/shopping.js';
import { effectiveTargets } from '../state.js';
import { enrich } from './ideas.js';
import { go, refresh } from '../main.js';

const EMPTY = { recipes: [], extras: {}, have: [], checked: [], manual: [] };
const euros = (x) => `${fmt.kg(x, 2)} €`;
const RAYON_ICON = { 'Fruits & légumes': 'apple', Frais: 'fridge', 'Épicerie': 'wheat', 'Surgelés': 'snowflake', Boulangerie: 'bread', Boissons: 'cup', Autres: 'list' };

async function getPlan() { return { ...EMPTY, ...(await db.kvGet('shopPlan', EMPTY)) }; }
async function savePlan(p) { try { await db.kvSet('shopPlan', p); } catch {} }
async function pricing() {
  const [overrides, store] = await Promise.all([db.kvGet('prices', {}), db.kvGet('store', 'tous')]);
  const prices = Object.fromEntries(Object.keys(SHOP).map((id) => [id, storePrice(id, store, overrides)]));
  return { overrides, store, prices, storeObj: STORES.find((s) => s.id === store) || STORES[0] };
}

export async function render(root) {
  const [plan, P, budget, t, E] = await Promise.all([getPlan(), pricing(), db.kvGet('budget', null), effectiveTargets(), enrich()]);
  const recipesById = new Map(RECIPES.map((r) => [r.id, r]));
  const enriched = new Map(E.list.map((r) => [r.id, r]));
  const L = buildList(plan, recipesById, SHOP, FOOD_TO_SHOP, P.prices);
  const checked = new Set(plan.checked);
  const cover = L.kcal / ((t?.kcal || 2900) * 7);
  const toBuy = L.lines.filter((l) => !l.have);
  const bought = toBuy.filter((l) => checked.has(l.id)).length;
  const update = async (fn) => { const p = await getPlan(); fn(p); await savePlan(p); refresh(); };

  // ----- Résumé -----
  const R = 30, C = 2 * Math.PI * R, pc = Math.min(1, cover);
  const summary = h('div.card.hero',
    h('div.row', { style: { alignItems: 'flex-start' } },
      h('div.grow',
        h('div.eyebrow', 'Total estimé'),
        h('div', { style: { fontSize: '40px', fontWeight: 760, letterSpacing: '-0.03em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' } }, euros(L.total)),
        h('div.small.muted', toBuy.length ? `${bought}/${toBuy.length} produits dans le panier` : 'Liste vide')),
      h('div.ring-wrap', { title: 'Part des besoins de la semaine', html: `<svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="${R}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"/><circle cx="36" cy="36" r="${R}" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="${pc > 0 ? 'round' : 'butt'}" stroke-dasharray="${C * pc} ${C}"/></svg>` },
        h('span.val', `${Math.round(cover * 100)}%`))),
    h('div.small.muted', { style: { marginTop: '8px' } }, L.lines.length ? `≈ ${fmt.int(L.kcal / 7)} kcal et ${fmt.int(L.prot / 7)} g de protéines par jour sur 7 jours, soit ${Math.round(cover * 100)} % de tes besoins.` : 'Ajoute des repas ou des produits : la liste se remplit toute seule.'),
    h('div', { style: { marginTop: '12px' } },
      h('div.row.between', h('span.small', budget ? `Budget ${euros(budget)}` : 'Pas de budget fixé'), h('button.why', { onclick: () => budgetSheet(budget) }, budget ? 'Modifier' : 'Fixer')),
      budget ? h(`div.meter${L.total > budget ? '.over' : ''}`, h('i', { style: { width: `${Math.min(100, (L.total / budget) * 100)}%` } })) : null,
      budget ? h('div.tiny.muted', { style: { marginTop: '4px' } }, L.total > budget ? `${euros(L.total - budget)} au-dessus du budget` : `Il reste ${euros(budget - L.total)}`) : null));

  const tiles = h('div.action-tiles',
    h('button.action-tile', { onclick: () => catalogSheet() }, h('span.tile-ico', icon('list')), h('div', h('strong', 'Ajouter des produits'), h('br'), h('span', `${Object.keys(SHOP).length} produits à cocher`))),
    h('button.action-tile', { onclick: () => go('idees') }, h('span.tile-ico', icon('ideas')), h('div', h('strong', 'Ajouter des repas'), h('br'), h('span', 'Depuis les idées'))));

  // ----- Repas choisis -----
  const meals = plan.recipes.length ? h('details.card', { style: { marginTop: '12px' } },
    h('summary.row.between', { style: { fontWeight: 650 } }, h('span', `Repas de la semaine · ${plan.recipes.reduce((x, r) => x + r.portions, 0)} portions`), h('span.small.muted', euros(plan.recipes.reduce((x, r) => x + (enriched.get(r.id)?.cost || 0) * r.portions, 0)))),
    h('div', { style: { marginTop: '8px' } }, plan.recipes.map((x) => {
      const r = enriched.get(x.id); if (!r) return null;
      return h('div.item-row', { style: { padding: '10px 0' } },
        h('div.grow', h('div.item-name', r.name), h('div.item-sub', `${euros(r.cost * x.portions)} · ${fmt.int(r.kcal * x.portions)} kcal`)),
        qty(x.portions, () => update((p) => { const y = p.recipes.find((z) => z.id === x.id); y.portions--; p.recipes = p.recipes.filter((z) => z.portions > 0); }),
          () => update((p) => { p.recipes.find((z) => z.id === x.id).portions++; })));
    }))) : null;

  // ----- Panier de base -----
  const basketCost = BASIC_BASKET.reduce((s, [id, n]) => s + P.prices[id] * n, 0);
  const hasBasket = BASIC_BASKET.every(([id]) => (plan.extras[id] || 0) > 0);
  const basket = h('div.card', { style: { marginTop: '12px' } },
    h('div.row', h('span.tile-ico', icon('leaf')),
      h('div.grow', h('div', { style: { fontWeight: 650 } }, 'Panier de base petit budget'), h('div.small.muted', `${BASIC_BASKET.length} produits · ≈ ${euros(basketCost)} · ≈ 2 900 kcal/j`)),
      hasBasket ? h('button.btn.btn-sm', { onclick: () => update((p) => { for (const [id] of BASIC_BASKET) delete p.extras[id]; }) }, 'Retirer')
        : h('button.btn.btn-sm.btn-primary', { onclick: () => update((p) => { for (const [id, n] of BASIC_BASKET) p.extras[id] = Math.max(p.extras[id] || 0, n); }) }, 'Ajouter')),
    why('budget'));

  // ----- Liste par rayon -----
  const listEl = h('div');
  for (const ray of [...RAYONS, 'Autres']) {
    const ls = toBuy.filter((l) => l.rayon === ray).sort((a, b) => checked.has(a.id) - checked.has(b.id) || a.name.localeCompare(b.name));
    if (!ls.length) continue;
    mount(listEl, h('div.rayon-head', icon(RAYON_ICON[ray] || 'list'), ray, h('span.count', `${ls.filter((l) => checked.has(l.id)).length}/${ls.length}`)),
      h('div.list', ls.map((l) => itemRow(l, checked.has(l.id), update, P))));
  }
  const have = L.lines.filter((l) => l.have);

  mount(root,
    h('div.page-head', h('div', h('h1', 'Courses'), h('div.sub', P.storeObj.id === 'tous' ? 'Prix indicatifs moyens' : `Prix estimés chez ${P.storeObj.name}`)),
      h('button.store-chip', { onclick: () => storeSheet(P.store) }, icon('store'), P.storeObj.id === 'tous' ? 'Magasin' : P.storeObj.name)),
    summary, tiles, meals, basket,
    toBuy.length ? h('div.tiny.muted', { style: { margin: '18px 6px 0' } }, 'Touche le rond quand c\'est dans le panier, le prix pour le corriger, « J\'en ai » si tu l\'as déjà.') : null,
    listEl,
    have.length ? h('div', h('div.rayon-head', icon('home'), 'Déjà à la maison', h('span.count', 'non compté')),
      h('div.list', have.map((l) => h('div.item-row', h('div.grow', h('div.item-name.muted', l.name)), h('button.btn.btn-sm', { onclick: () => update((p) => { p.have = p.have.filter((x) => x !== l.id); }) }, 'À acheter'))))) : null,
    L.lines.length ? h('div.btn-row', { style: { marginTop: '16px' } },
      h('button.btn', { onclick: () => shareList(L, checked) }, icon('share'), 'Partager'),
      h('button.btn', { onclick: async () => { if (await confirmSheet('Nouvelle semaine ?', 'La liste et les repas choisis seront vidés. Tes prix, ton magasin et ton budget sont gardés.', 'Vider la liste')) { await savePlan({ ...EMPTY }); refresh(); } } }, icon('trash'), 'Vider')) : null,
    bestValueCard(P, update),
    h('div.list', { style: { marginTop: '12px' } }, h('button.list-item', { onclick: aidSheet }, h('span.tile-ico', icon('info')), h('span.grow', 'Coup dur ? Aides alimentaires', h('br'), h('span.small.muted', 'Où trouver de quoi manger gratuitement ou à petit prix')), h('span.chev', icon('chevron')))));
}

function qty(n, onMinus, onPlus) {
  return h('div.qty', h('button', { 'aria-label': 'Moins', onclick: onMinus }, icon('minus')), h('span', String(n)), h('button', { 'aria-label': 'Plus', onclick: onPlus }, icon('plus')));
}

function itemRow(l, isChecked, update, P) {
  const sub = l.manual ? 'ajouté à la main' : `${l.pack} · ${euros(l.unit)} l'unité`;
  const minus = () => update((p) => { if ((p.extras[l.id] || 0) > 0) { p.extras[l.id]--; if (!p.extras[l.id]) delete p.extras[l.id]; } else p.have = [...new Set([...(p.have || []), l.id])]; });
  const plus = () => update((p) => { p.extras[l.id] = (p.extras[l.id] || 0) + 1; });
  return h(`div.item-row${isChecked ? '.done' : ''}`, { style: { alignItems: 'flex-start' } },
    h(`button.checkc${isChecked ? '.on' : ''}`, { style: { marginTop: '2px' }, 'aria-label': `${isChecked ? 'Retirer du panier' : 'Dans le panier'} : ${l.name}`, onclick: () => update((p) => { const s = new Set(p.checked); s.has(l.id) ? s.delete(l.id) : s.add(l.id); p.checked = [...s]; }) }, icon('check')),
    h('div.grow',
      h('div.row.between', { style: { alignItems: 'baseline' } }, h('div.item-name', l.name),
        h('button.price', { style: { background: 'none', border: 0, padding: 0, color: 'var(--text)' }, 'aria-label': `Prix de ${l.name}`, onclick: () => {
          if (l.manual) return;
          const v = prompt(`Prix d'un « ${l.pack} » de ${l.name} dans ton magasin (€) :`, String(l.unit).replace('.', ','));
          const x = parseFloat(String(v || '').replace(',', '.'));
          if (x >= 0) db.kvSet('prices', { ...P.overrides, [l.id]: x }).then(() => { toast('Prix enregistré'); refresh(); }).catch(() => {});
        } }, euros(l.cost))),
      h('div.item-sub', sub),
      h('div.row', { style: { marginTop: '8px', gap: '8px' } },
        l.manual ? null : qty(l.packs, minus, plus),
        l.manual ? h('button.btn.btn-sm', { onclick: () => update((p) => { p.manual = p.manual.filter((m) => `m:${m.name}` !== l.id); }) }, icon('close'), 'Retirer')
          : h('button.btn.btn-sm', { style: { minHeight: '36px' }, 'aria-label': `J'ai déjà : ${l.name}`, onclick: () => update((p) => { p.have = [...new Set([...(p.have || []), l.id])]; }) }, icon('home'), 'J\'en ai'))));
}

// ----- Catalogue : cocher des produits, par magasin et par rayon -----
async function catalogSheet() {
  const P = await pricing();
  let store = P.store, ray = 'Tous', q = '';
  const plan = await getPlan();
  const counts = { ...plan.extras };
  const listEl = h('div'), storeRow = h('div.tabs'), rayRow = h('div.tabs');
  const doneBtn = h('button.btn.btn-primary');
  const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const drawDone = () => {
    const n = Object.values(counts).reduce((a, b) => a + (b > 0 ? 1 : 0), 0);
    const total = Object.entries(counts).reduce((a, [id, c]) => a + (c > 0 ? c * storePrice(id, store, P.overrides) : 0), 0);
    doneBtn.textContent = `Valider · ${n} produit${n > 1 ? 's' : ''} · ${euros(total)}`;
  };
  const drawStores = () => { clear(storeRow); for (const s of STORES) storeRow.append(h(`button${s.id === store ? '.on' : ''}`, { onclick: () => { store = s.id; drawStores(); drawList(); } }, s.id === 'tous' ? 'Tous' : s.name)); };
  const drawRays = () => { clear(rayRow); for (const r of ['Tous', ...RAYONS]) rayRow.append(h(`button${r === ray ? '.on' : ''}`, { onclick: () => { ray = r; drawRays(); drawList(); } }, r !== 'Tous' ? icon(RAYON_ICON[r]) : null, r)); };
  const drawList = () => {
    clear(listEl);
    const st = STORES.find((s) => s.id === store);
    const items = Object.entries(SHOP).filter(([id, s]) => (ray === 'Tous' || s.rayon === ray) && availableIn(id, store) && (!q || norm(s.name).includes(norm(q))))
      .sort((a, b) => a[1].rayon.localeCompare(b[1].rayon) || a[1].name.localeCompare(b[1].name));
    if (st?.brand) listEl.append(h('div.coach', { style: { marginBottom: '10px' } }, `Chez ${st.name}, cherche la gamme premier prix « ${st.brand} » : souvent 20 à 40 % moins cher.`));
    if (st?.discount) listEl.append(h('div.coach', { style: { marginBottom: '10px' } }, `Gamme plus courte chez ${st.name} : quelques produits rares y sont masqués.`));
    let cur = null;
    const box = h('div.list');
    for (const [id, s] of items) {
      if (ray === 'Tous' && s.rayon !== cur) { cur = s.rayon; box.append(h('div.rayon-head', { style: { margin: '14px 14px 6px' } }, icon(RAYON_ICON[cur]), cur)); }
      const c = counts[id] || 0;
      const right = h('div');
      const drawRight = () => {
        clear(right);
        const n = counts[id] || 0;
        right.append(n ? qty(n, () => { counts[id] = n - 1; drawRight(); drawDone(); }, () => { counts[id] = n + 1; drawRight(); drawDone(); })
          : h('button.icon-btn.accent-fill', { style: { width: '36px', height: '36px' }, 'aria-label': `Ajouter ${s.name}`, onclick: () => { counts[id] = 1; drawRight(); drawDone(); } }, icon('plus')));
      };
      drawRight();
      box.append(h('div.item-row', h('div.grow', h('div.item-name', s.name), h('div.item-sub', `${s.pack} · ${euros(storePrice(id, store, P.overrides))}${s.kcal ? ` · ${fmt.int((s.g * s.kcal) / 100 / storePrice(id, store, P.overrides))} kcal/€` : ''}`)), right));
      void c;
    }
    if (q.trim()) listEl.append(h('button.why.row', { style: { marginBottom: '8px' }, onclick: async () => {
      const v = prompt(`Prix estimé de « ${q.trim()} » (€, facultatif) :`, '');
      const p = await getPlan();
      p.manual.push({ name: q.trim(), price: parseFloat(String(v || '').replace(',', '.')) || 0 });
      await savePlan(p); toast(`« ${q.trim()} » ajouté à la liste`);
    } }, icon('plus'), `Ajouter « ${q.trim()} » à la main`));
    listEl.append(items.length ? box : h('p.small.muted', 'Aucun produit dans le catalogue : ajoute-le à la main ci-dessus.'));
  };

  const { close } = sheet('Ajouter des produits', h('div.stack',
    h('div.small.muted', 'Mon magasin'), storeRow,
    h('div.search-field', icon('search'), h('input.input', { type: 'search', placeholder: 'Chercher un produit', oninput: (e) => { q = e.target.value; drawList(); } })),
    rayRow, listEl,
    h('div.sticky-done', doneBtn)), { full: true });
  doneBtn.onclick = async () => {
    const p = await getPlan();
    p.extras = Object.fromEntries(Object.entries(counts).filter(([, c]) => c > 0));
    await savePlan(p);
    if (store !== P.store) await db.kvSet('store', store).catch(() => {});
    close(); toast('Liste mise à jour'); refresh();
  };
  drawStores(); drawRays(); drawList(); drawDone();
}

function storeSheet(cur) {
  sheet('Mon magasin', (close) => h('div.stack',
    h('p.small.muted', 'Les prix sont ajustés au niveau de prix moyen de l\'enseigne (estimation). Corrige un prix en le touchant dans la liste : ta correction est gardée.'),
    h('div.list', STORES.map((s) => h('button.list-item', { onclick: async () => { await db.kvSet('store', s.id).catch(() => {}); close(); refresh(); } },
      h('span.tile-ico', icon('store')), h('div.grow', h('div', { style: { fontWeight: 650 } }, s.id === 'tous' ? 'Tous les magasins' : s.name),
        h('div.small.muted', s.id === 'tous' ? 'Prix moyens' : `${s.mult === 1 ? 'Parmi les moins chers' : s.mult < 1 ? 'Discount, gamme plus courte' : `≈ +${Math.round((s.mult - 1) * 100)} % en moyenne`}${s.brand ? ` · premier prix « ${s.brand} »` : ''}`)),
      s.id === cur ? h('span.accent', icon('check')) : null)))));
}

function bestValueCard(P, update) {
  const best = bestValue(SHOP, P.prices, 10);
  return h('details.card', { style: { marginTop: '12px' } },
    h('summary', { style: { fontWeight: 650 } }, 'Les plus rentables pour prendre du poids'),
    h('p.small.muted', { style: { margin: '8px 0' } }, 'Calories et protéines pour 1 € dépensé.'),
    h('div', best.map((b) => h('div.item-row', { style: { padding: '10px 0' } },
      h('div.grow', h('div.item-name', b.name), h('div.item-sub', `${fmt.int(b.kcalPerEuro)} kcal/€ · ${fmt.int(b.protPerEuro)} g prot./€`)),
      h('button.icon-btn', { style: { width: '36px', height: '36px' }, 'aria-label': `Ajouter ${b.name}`, onclick: () => update((p) => { p.extras[b.id] = (p.extras[b.id] || 0) + 1; }) }, icon('plus'))))),
    why('budget'));
}

function budgetSheet(cur) {
  let v = cur || '';
  sheet('Budget de la semaine', (close) => h('div.stack',
    h('input.input.input-big', { type: 'number', inputmode: 'decimal', placeholder: '€', value: v, oninput: (e) => (v = e.target.value) }),
    h('button.btn.btn-primary', { onclick: async () => { const x = parseFloat(String(v).replace(',', '.')); try { await db.kvSet('budget', x > 0 ? x : null); close(); refresh(); } catch {} } }, 'Enregistrer'),
    h('p.small.muted', 'Repère : le panier de base coûte environ 30 € pour une semaine complète.')));
}

async function shareList(L, checked) {
  const lines = L.lines.filter((l) => !l.have && !checked.has(l.id));
  const text = `Courses (≈ ${euros(lines.reduce((t, l) => t + l.cost, 0))})\n` + lines.map((l) => `- ${l.name}${l.manual ? '' : ` : ${l.packs} × ${l.pack}`} (${euros(l.cost)})`).join('\n');
  try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Liste copiée'); } }
  catch (e) { if (e.name !== 'AbortError') toast('Impossible de partager'); }
}

function aidSheet() {
  sheet('Aides alimentaires', h('div.stack',
    h('p.small', 'Si l\'argent manque, ces aides existent pour ça :'),
    h('div.list',
      h('div.list-item', h('div.grow', h('strong', 'Restos du Cœur, Secours populaire, Croix-Rouge'), h('div.small.muted', 'Colis ou repas gratuits. Cherche « Restos du Cœur » et ta ville pour le centre le plus proche.'))),
      h('div.list-item', h('div.grow', h('strong', 'Épiceries sociales et solidaires'), h('div.small.muted', 'Produits à 10-30 % du prix. Accès via le CCAS de ta mairie ou une assistante sociale.'))),
      h('div.list-item', h('div.grow', h('strong', 'CCAS de ta mairie'), h('div.small.muted', 'Aides d\'urgence, bons alimentaires, orientation vers les épiceries solidaires.'))),
      h('div.list-item', h('div.grow', h('strong', 'Si tu es étudiant : CROUS'), h('div.small.muted', 'Repas à 1 € au resto U pour les boursiers et étudiants en difficulté, aides d\'urgence.')))),
    h('p.tiny.muted', 'Les légumineuses sèches, les flocons d\'avoine, le riz et les pâtes restent les calories les moins chères : l\'appli les met en avant.')));
}
