// Repas : saisie en un tap (mes plats en photo, estimation rapide, assiettes types), recherche d'aliments,
// et flux photo : « je prends en photo, je dis ce que c'est, c'est enregistré » (le plat est mémorisé avec sa photo).
import * as db from '../db.js';
import { h, mount, why, fmt, progressBar, toast, sheet, clear, pickImage, resizeImage, confirmSheet } from '../ui.js';
import { icon } from '../icons.js';
import { todayISO, addDays, longDate, nowMinutes } from '../lib/dates.js';
import { SLOTS, slotById, slotTargets, sumMacros, foodMacros, currentSlot } from '../lib/nutrition.js';
import { PLATES, SIZES, QUICK, SNACK_IDEAS } from '../data/plates.js';
import { getDay, effectiveTargets, habitsForSlot, todayTargets, dayPlan } from '../state.js';
import { go, refresh } from '../main.js';
import { fetchProduct, searchProducts, isBarcode } from '../lib/off.js';

let FOODS = null;
export async function loadFoods() {
  if (!FOODS) {
    const r = await fetch('data/foods.json');
    if (!r.ok) throw new Error('Base d\'aliments introuvable');
    FOODS = (await r.json()).foods;
  }
  return FOODS;
}
const foodByName = (n) => FOODS.find((f) => f.name === n);
const round1 = (x) => Math.round(x * 10) / 10;
const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');
const short = (s, n = 26) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function itemFromFood(food, grams, label) {
  const m = foodMacros(food, grams);
  return { foodId: food.id, name: food.name, label: label || `${Math.round(grams)} g`, grams: Math.round(grams), kcal: Math.round(m.kcal), p: round1(m.p), g: round1(m.g), l: round1(m.l) };
}
function plateItems(plate, k) {
  return plate.items.map(([n, g]) => { const f = foodByName(n); return f ? itemFromFood(f, g * k) : null; }).filter(Boolean);
}
const roundTotal = (t) => ({ kcal: Math.round(t.kcal), p: round1(t.p), g: round1(t.g || 0), l: round1(t.l || 0) });
function scaleItem(i, k) {
  return { ...i, grams: i.grams ? Math.round(i.grams * k) : i.grams, label: k === 1 ? i.label : `${i.label} ×${String(round1(k)).replace('.', ',')}`,
    kcal: Math.round(i.kcal * k), p: round1(i.p * k), g: round1((i.g || 0) * k), l: round1((i.l || 0) * k) };
}

/** Enregistre directement une option proposée par le plan du jour. */
export async function logOption(date, slot, opt) {
  const total = roundTotal(sumMacros(opt.items));
  try {
    const nid = await db.put('meals', { date, slot, name: opt.name, items: opt.items, total, photoId: opt.photoId || null, ts: Date.now() });
    toast(`${short(opt.name)} · ${fmt.int(total.kcal)} kcal`, { action: 'Annuler', onAction: async () => { await db.del('meals', nid); refresh(); } });
  } catch {}
}

/** Copie d'un repas existant (« Refaire »). */
export async function repeatMeal(entry, date, slot) {
  const { id, ...rest } = entry;
  try {
    const nid = await db.put('meals', { ...rest, date, slot: slot || entry.slot, ts: Date.now() });
    toast(`${short(entry.name)} ajouté`, { action: 'Annuler', onAction: async () => { await db.del('meals', nid); refresh(); } });
  } catch {}
}

function autoSnackSlot() {
  const m = nowMinutes();
  return m < 13 * 60 ? 'c10' : m < 19 * 60 ? 'c16' : 'coucher';
}

// ======================= Écran Repas =======================
export async function render(root, params) {
  await loadFoods();
  const date = params.date || todayISO();
  const isToday = date === todayISO();
  const [day, t0] = await Promise.all([getDay(date), isToday ? todayTargets(date) : effectiveTargets()]);
  const t = t0;
  const dyn = isToday ? new Map((await dayPlan(date, FOODS, nowMinutes())).plan.map((x) => [x.id, x])) : new Map();
  const now = isToday ? currentSlot(nowMinutes(), new Set(day.meals.map((m) => m.slot))) : null;

  mount(root,
    h('div.page-head', h('div', h('h1', 'Repas'), h('div.sub', isToday ? 'Aujourd\'hui' : longDate(date))),
      h('div.row',
        h('button.icon-btn', { 'aria-label': 'Jour précédent', onclick: () => go('repas', { date: addDays(date, -1) }) }, '‹'),
        h('button.icon-btn', { 'aria-label': 'Jour suivant', disabled: isToday, style: isToday ? { opacity: 0.3 } : {}, onclick: () => go('repas', { date: addDays(date, 1) }) }, '›'))),
    h('div.card', progressBar(day.totals.kcal, t.kcal, { label: 'Calories', unit: ' kcal' }), progressBar(day.totals.p, t.protein, { label: 'Protéines', unit: ' g' })),
    h('div', { style: { height: '12px' } }));

  const urls = [];
  for (const s of SLOTS) {
    const entries = day.meals.filter((m) => m.slot === s.id);
    const st = dyn.get(s.id) ? { kcal: dyn.get(s.id).kcal, protein: dyn.get(s.id).p } : slotTargets(t, s.id);
    const tot = sumMacros(entries.map((e) => e.total));
    const rows = await Promise.all(entries.map(async (e) => {
      let img = null;
      if (e.photoId) { const ph = await db.get('photos', e.photoId); if (ph) { const u = URL.createObjectURL(ph.blob); urls.push(u); img = h('img.thumb', { src: u, alt: '' }); } }
      return h('button.entry', { onclick: () => entrySheet(e) }, img, h('span.entry-name', e.name), h('span.entry-kcal', `${fmt.int(e.total.kcal)} kcal · ${fmt.int(e.total.p)} g`));
    }));
    mount(root, h(`div.slot${s.id === now ? '.now' : ''}`,
      h('div.slot-head',
        h('div.grow', h('div.slot-title', s.label), h('div.slot-meta', `${s.time.replace(':', 'h')} · ≈ ${fmt.int(st.kcal)} kcal · ${st.protein} g`)),
        entries.length ? h('div.slot-kcal', h('strong', fmt.int(tot.kcal)), ' kcal', h('br'), `${fmt.int(tot.p)} g`) : null,
        h('button.icon-btn.accent-fill', { 'aria-label': `Ajouter : ${s.label}`, onclick: () => openAdd({ date, slot: s.id }) }, icon('plus'))),
      rows));
  }

  const complete = !!day.day.complete;
  mount(root,
    h('div.list', { style: { marginTop: '16px' } },
      h('label.list-item', h('input', { type: 'checkbox', checked: complete, style: { width: '22px', height: '22px', accentColor: 'var(--accent)' },
        onchange: async (e) => { try { await db.put('days', { ...(await db.get('days', date)), date, complete: e.target.checked }); toast(e.target.checked ? 'Journée marquée complète' : 'Marque retirée'); } catch {} } }),
      h('span.grow', 'J\'ai tout noté aujourd\'hui', h('br'), h('span.tiny.muted', 'Sert au calcul de ta dépense réelle'))),
      h('button.list-item', { onclick: () => moreSheet(date) }, h('span.grow', 'Idées, aliments denses, préparations'), h('span.chev', icon('chevron')))));

  if (params.slot) {
    const slot = params.slot === 'auto-collation' ? autoSnackSlot() : params.slot;
    if (slotById(slot)) setTimeout(() => openAdd({ date, slot }), 50);
    history.replaceState(null, '', `?page=repas${params.date ? `&date=${params.date}` : ''}`);
  }
}

// ======================= Mes plats =======================
/** Plats mémorisés (favoris, avec ou sans photo) + habitudes du créneau, dédoublonnés par nom. */
async function myDishes(slot) {
  const favs = (await db.getAll('favorites')).sort((a, b) => (b.lastUsed || b.created || 0) - (a.lastUsed || a.created || 0) || (b.uses || 0) - (a.uses || 0));
  const habits = slot ? await habitsForSlot(slot, 8) : [];
  const out = [];
  const seen = new Set();
  for (const hb of habits) {
    const fav = favs.find((f) => f.name === hb.name);
    out.push(fav ? { ...fav, kind: 'fav' } : { kind: 'habit', name: hb.name, items: hb.last.items, total: hb.last.total, photoId: hb.last.photoId });
    seen.add(hb.name);
  }
  for (const f of favs) if (!seen.has(f.name)) { out.push({ ...f, kind: 'fav' }); seen.add(f.name); }
  return out;
}

async function photoURL(id, bag) {
  if (!id) return null;
  const ph = await db.get('photos', id).catch(() => null);
  if (!ph) return null;
  const u = URL.createObjectURL(ph.blob); bag.push(u); return u;
}

// ======================= Feuille d'ajout =======================
/**
 * openAdd({ date, slot, photo, recipe })
 * photo : true → ouvre l'appareil photo tout de suite (l'appel à pickImage doit rester synchrone avec le tap).
 */
export function openAdd({ date = todayISO(), slot, photo = false, recipe = false }) {
  const photoPromise = photo ? pickImage() : null;
  buildAdd({ date, slot, recipe, photoPromise });
}

async function buildAdd({ date, slot, recipe, photoPromise }) {
  await loadFoods();
  const s = slot ? slotById(slot) : null;
  const bag = [];
  const cart = [];
  let photoId = null, photoUrl = null, photoBlob = null, dishName = '', query = '', saved = false, portions = 4, recipeName = '';
  const dishes = recipe ? [] : await myDishes(slot);
  const usage = await foodUsage();
  const ALL = [...(await db.getAll('products')).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)), ...FOODS];
  const scanEl = h('div');

  const photoEl = h('div');
  const searchEl = h('div.search-field', icon('search'), h('input.input', { type: 'search', placeholder: recipe ? 'Ajouter un ingrédient' : 'Chercher un plat ou un aliment', autocomplete: 'off', enterkeyhint: 'search',
    oninput: (e) => { query = e.target.value.trim(); renderContent(); } }));
  const content = h('div');
  const cartEl = h('div.cart');

  // ----- photo -----
  async function setPhoto(file) {
    if (!file) return;
    try {
      const blob = await resizeImage(file);
      if (photoId) await db.del('photos', photoId).catch(() => {});
      photoId = await db.put('photos', { blob, date, ts: Date.now() });
      photoBlob = blob;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(blob);
      renderPhoto();
      setTimeout(() => photoEl.querySelector('input')?.focus(), 100);
    } catch (e) { toast(`Photo non enregistrée : ${e.message}`); }
  }
  function renderPhoto() {
    clear(photoEl);
    if (recipe) return;
    if (!photoUrl) {
      mount(photoEl, h('button.photo-cta', { onclick: () => pickImage().then(setPhoto) }, icon('camera'),
        h('div', h('div', { style: { fontWeight: 650 } }, 'Prendre le repas en photo'), h('div.small.muted', 'Puis dis ce que c\'est : il sera mémorisé pour la prochaine fois'))),
        h('button.why.row', { onclick: () => pickImage().then(scanBarcode) }, icon('barcode'), 'Scanner un code-barres (produit emballé)'));
      return;
    }
    mount(photoEl, h('div.photo-box',
      h('img', { src: photoUrl, alt: 'Photo du plat' }),
      h('div.grow.stack-sm',
        h('input.input', { placeholder: 'C\'est quoi ? (ex. Pâtes au pesto)', value: dishName, oninput: (e) => { dishName = e.target.value; renderCart(); } }),
        h('div.row.wrap',
          h('div.tiny.muted.grow', 'Puis choisis la quantité ci-dessous.'),
          h('button.btn.btn-sm', { onclick: () => photoBlob && scanBarcode(photoBlob) }, icon('barcode'), 'Code-barres')))));
  }

  // ----- code-barres → Open Food Facts -----
  async function scanBarcode(file) {
    if (!file) return;
    clear(scanEl); mount(scanEl, h('div.coach', 'Lecture du code-barres…'));
    let code = null;
    try { const { readBarcode } = await import('../barcode.js'); code = await readBarcode(file); } catch (e) { console.error(e); }
    if (!code) {
      clear(scanEl);
      const v = prompt('Code-barres illisible sur la photo. Tape les chiffres sous les barres (ou annule) :', '');
      if (!v || !isBarcode(v)) { mount(scanEl, h('div.coach', 'Pas de code-barres lu. Rapproche-toi (barres nettes, bien éclairées) ou cherche le produit par son nom.')); return; }
      code = v.trim();
    }
    await showProduct(code);
  }
  async function showProduct(code) {
    clear(scanEl); mount(scanEl, h('div.coach', `Code ${code} : recherche du produit…`));
    let prod = await db.get('products', code).catch(() => null);
    if (!prod) {
      try { prod = await fetchProduct(code); } catch (e) { clear(scanEl); mount(scanEl, h('div.coach', `${e.message} (il faut internet la première fois ; ensuite le produit est gardé sur ton iPhone)`)); return; }
      if (!prod) { clear(scanEl); mount(scanEl, h('div.coach', `Produit ${code} inconnu d'Open Food Facts. Utilise la recherche ou une estimation.`)); return; }
    }
    await db.put('products', { ...prod, lastUsed: Date.now() }).catch(() => {});
    clear(scanEl);
    mount(scanEl, h('div.card.accent-border', h('div.small.muted', `Open Food Facts · ${code}`), foodRow(prod), why('off')));
  }

  /** Recherche gratuite par nom dans Open Food Facts (produits de marque absents de la base). */
  async function offSearch(q, box) {
    clear(box); mount(box, h('div.coach', `Recherche « ${q} » dans Open Food Facts…`));
    try {
      const list = await searchProducts(q);
      clear(box);
      if (!list.length) { mount(box, h('p.small.muted', 'Aucun produit trouvé. Le code-barres reste le plus sûr.')); return; }
      for (const p of list) await db.put('products', { ...p, lastUsed: 0 }).catch(() => {});
      mount(box, h('div.section-title', 'Open Food Facts'), list.map(foodRow));
    } catch (e) { clear(box); mount(box, h('p.small.muted', `${e.message} (il faut internet)`)); }
  }

  // ----- enregistrer -----
  async function commit(items, defaultName, dish = null) {
    const name = (dishName.trim() || defaultName || 'Repas').slice(0, 80);
    const total = roundTotal(sumMacros(items));
    const pid = photoId || dish?.photoId || null;
    try {
      const nid = await db.put('meals', { date, slot, name, items, total, photoId: pid, ts: Date.now() });
      // Mémoriser le plat (photo et/ou nom donné) pour le refaire en un tap
      if (photoId || dishName.trim()) {
        const favs = await db.getAll('favorites');
        const ex = favs.find((f) => norm(f.name) === norm(name));
        await db.put('favorites', { ...(ex || { created: Date.now(), uses: 0, portions: 1, slots: [slot] }), name, items, total, photoId: photoId || ex?.photoId || null, dish: true, uses: (ex?.uses || 0) + 1, lastUsed: Date.now() });
      } else if (dish?.kind === 'fav') {
        await db.put('favorites', { ...stripKind(dish), uses: (dish.uses || 0) + 1, lastUsed: Date.now() });
      }
      saved = true; close();
      toast(`${short(name)} · ${fmt.int(total.kcal)} kcal`, { action: 'Annuler', onAction: async () => { await db.del('meals', nid); refresh(); } });
      refresh();
    } catch {}
  }
  const stripKind = ({ kind, ...d }) => d;

  async function saveRecipe() {
    const n = Math.max(1, portions);
    const items = cart.map(({ _k, ...i }) => scaleItem(i, 1 / n));
    try {
      await db.put('favorites', { name: recipeName || 'Préparation', items, total: roundTotal(sumMacros(items)), portions: n, recipe: true, uses: 0, created: Date.now() });
      saved = true; close(); toast('Préparation enregistrée : elle apparaît dans « Mes plats »'); refresh();
    } catch {}
  }

  // ----- contenu -----
  async function dishTile(d) {
    const u = await photoURL(d.photoId, bag);
    return h('button.tile', { onclick: () => commit(d.items, d.name, d) },
      u ? h('img.tile-img', { src: u, alt: '' }) : h('div.tile-img', d.name.trim()[0]?.toUpperCase() || '?'),
      h('span.tile-name', d.name), h('span.tile-sub', `${fmt.int(d.total.kcal)} kcal${d.recipe ? ' · 1 portion' : ''}`));
  }

  function plateRow(p) {
    const base = sumMacros(plateItems(p, 1));
    return h('div.pick', h('div.pick-main',
      h('div.pick-name', p.name), h('div.pick-sub', `Normale ≈ ${fmt.int(base.kcal)} kcal · ${fmt.int(base.p)} g`),
      h('div.portion-chips', SIZES.map((sz) => h('button.chip', { onclick: () => commit(plateItems(p, sz.k), `${p.name}${sz.id === 'M' ? '' : ` (${sz.label.toLowerCase()})`}`) }, sz.label)))));
  }

  function dishRow(d) {
    return h('div.pick', h('div.pick-main',
      h('div.pick-name', d.name), h('div.pick-sub', `×1 ≈ ${fmt.int(d.total.kcal)} kcal · ${fmt.int(d.total.p)} g`),
      h('div.portion-chips', [0.5, 1, 1.5, 2].map((k) => h('button.chip', { onclick: () => commit(d.items.map((i) => scaleItem(i, k)), k === 1 ? d.name : `${d.name} ×${String(k).replace('.', ',')}`, d) }, `×${String(k).replace('.', ',')}`)))));
  }

  function foodRow(f) {
    return h('div.pick', h('div.pick-main',
      h('div.pick-name', f.name), h('div.pick-sub', `${f.kcal} kcal · ${String(f.p).replace('.', ',')} g prot. / 100 g`),
      h('div.portion-chips',
        f.portions.map((p) => h('button.chip', { onclick: () => addToCart(itemFromFood(f, p.g, p.label)) }, p.label)),
        h('button.chip', { onclick: () => { const v = prompt(`${f.name} : quantité en grammes`, '100'); const g = parseFloat(String(v || '').replace(',', '.')); if (g > 0) addToCart(itemFromFood(f, g)); } }, 'g'))));
  }

  function addToCart(item) { cart.push({ ...item, _k: Math.random() }); renderCart(); toast(`${item.name} ajouté à l'assiette`, { ms: 1500 }); }

  async function renderContent() {
    clear(content);
    const q = norm(query);
    const words = q.split(/\s+/).filter(Boolean);
    const match = (txt) => words.every((w) => norm(txt).includes(w));
    if (recipe) {
      const list = q ? ALL.filter((f) => match(f.name + ' ' + f.cat)) : [...ALL].sort((a, b) => (usage.get(b.id) || 0) - (usage.get(a.id) || 0) || (b.name.includes('préparations') - a.name.includes('préparations')));
      mount(content, h('p.small.muted', { style: { margin: '10px 0' } }, 'Ajoute TOUS les ingrédients de la préparation (paquets entiers), puis indique le nombre de portions.'), list.slice(0, 40).map(foodRow));
      return;
    }
    if (!q) {
      if (dishes.length) {
        mount(content, h('div.section-title', 'Mes plats'), h('div.tile-grid', await Promise.all(dishes.slice(0, 9).map(dishTile))),
          dishes.length > 9 ? h('button.why', { onclick: allDishes }, `Voir mes ${dishes.length} plats`) : null);
      }
      const kinds = s && !s.main ? QUICK.collation : QUICK.repas.slice(0, 3);
      mount(content,
        h('div.section-title', 'Estimation rapide'),
        h('div.quick-row', kinds.map((k) => h('button', { onclick: () => commit([{ name: k.label, label: 'estimation', kcal: k.kcal, p: k.p, g: 0, l: 0 }], k.label) }, k.label.replace(/^(Repas|Collation) /, '').replace(/^\w/, (c) => c.toUpperCase()), h('span', `≈ ${k.kcal} kcal`)))),
        h('div.row', why('saisie_rapide', 'Pourquoi une estimation suffit ?')),
        h('div.section-title', 'Assiettes types'),
        PLATES.filter((p) => !slot || p.slots.includes(slot)).slice(0, 6).map(plateRow),
        h('p.tiny.muted', { style: { marginTop: '8px' } }, 'Cherche un aliment ci-dessus pour composer ton assiette.'));
      return;
    }
    const ds = dishes.filter((d) => match(d.name));
    const ps = PLATES.filter((p) => match(p.name));
    const fs = ALL.filter((f) => match(f.name + ' ' + f.cat)).sort((a, b) => (usage.get(b.id) || 0) - (usage.get(a.id) || 0)).slice(0, 30);
    if (ds.length) mount(content, h('div.section-title', 'Mes plats'), ds.map(dishRow));
    if (ps.length) mount(content, h('div.section-title', 'Assiettes types'), ps.map(plateRow));
    if (fs.length) mount(content, h('div.section-title', 'Aliments et produits (à composer)'), fs.map(foodRow));
    if (!ds.length && !ps.length && !fs.length) mount(content, h('p.muted.small', { style: { marginTop: '12px' } }, 'Rien trouvé dans l\'appli.'));
    if (query.trim().length >= 3) {
      const box = h('div');
      mount(content, h('button.why.row', { onclick: () => offSearch(query.trim(), box) }, icon('search'), `Chercher « ${query.trim()} » dans Open Food Facts (produits de marque)`), box);
    }
  }
  function allDishes() { clear(content); mount(content, h('div.section-title', 'Tous mes plats'), dishes.map(dishRow)); }

  function renderCart() {
    clear(cartEl);
    if (!cart.length) return;
    const tot = sumMacros(cart);
    const list = h('div.cart-items', cart.map((i) => h('div.ci', h('span', `${i.name} — ${i.label}`), h('span.row', `${fmt.int(i.kcal)} kcal`,
      h('button', { 'aria-label': 'Retirer', onclick: () => { cart.splice(cart.indexOf(i), 1); renderCart(); } }, '×')))));
    if (recipe) {
      mount(cartEl, list,
        h('div.grid2', h('input.input', { placeholder: 'Nom (ex. Dahl du dimanche)', value: recipeName, oninput: (e) => (recipeName = e.target.value) }),
          h('label.row', h('span.small.muted', 'Portions'), h('input.input', { type: 'number', inputmode: 'numeric', value: portions, min: 1, style: { width: '80px' }, oninput: (e) => { portions = Math.max(1, +e.target.value || 1); } }))),
        h('p.small.muted', { style: { margin: '8px 0' } }, `Par portion ≈ ${fmt.int(tot.kcal / portions)} kcal et ${fmt.int(tot.p / portions)} g de protéines`),
        h('button.btn.btn-primary', { onclick: saveRecipe }, 'Enregistrer la préparation'));
      return;
    }
    mount(cartEl, list, h('button.btn.btn-primary', { onclick: () => {
      const items = cart.map(({ _k, ...i }) => i);
      commit(items, items.length === 1 ? items[0].name : items.slice(0, 3).map((i) => i.name.replace(/ \(.*\)$/, '')).join(' + '));
    } }, `Enregistrer l'assiette · ${fmt.int(tot.kcal)} kcal · ${fmt.int(tot.p)} g`));
  }

  const { close } = sheet(recipe ? 'Nouvelle préparation' : `Ajouter · ${s.label}`, h('div.stack', photoEl, scanEl, searchEl, content, cartEl), { full: true,
    onClose: () => { if (!saved && photoId) db.del('photos', photoId).catch(() => {}); if (photoUrl) URL.revokeObjectURL(photoUrl); bag.forEach((u) => URL.revokeObjectURL(u)); } });
  renderPhoto(); renderContent(); renderCart();
  if (photoPromise) photoPromise.then(setPhoto);
}

async function foodUsage() {
  const from = addDays(todayISO(), -60);
  const meals = await db.byDateRange('meals', from, todayISO());
  const m = new Map();
  for (const e of meals) for (const i of e.items) if (i.foodId) m.set(i.foodId, (m.get(i.foodId) || 0) + 1);
  return m;
}

// ======================= Détail d'une entrée =======================
async function entrySheet(e) {
  let url = null;
  if (e.photoId) { const ph = await db.get('photos', e.photoId); if (ph) url = URL.createObjectURL(ph.blob); }
  const base = e.base || e.items;
  const curK = e.k || 1;
  sheet(e.name, (close) => h('div.stack',
    url ? h('img.thumb-lg', { src: url, alt: 'Photo du plat' }) : null,
    h('div.kpis', h('div.kpi', h('div.label', 'Calories'), h('div.value', fmt.int(e.total.kcal), h('span.unit', 'kcal'))),
      h('div.kpi', h('div.label', 'Protéines'), h('div.value', fmt.int(e.total.p), h('span.unit', 'g')))),
    h('div', h('div.small.muted', { style: { marginBottom: '6px' } }, 'Quantité réelle'),
      h('div.chips', [0.5, 0.75, 1, 1.25, 1.5, 2].map((k) => h(`button.chip${k === curK ? '.on' : ''}`, { onclick: async () => {
        const items = base.map((i) => scaleItem(i, k));
        try { await db.put('meals', { ...e, base, k, items, total: roundTotal(sumMacros(items)) }); close(); refresh(); } catch {}
      } }, `×${String(k).replace('.', ',')}`)))),
    h('div.list', e.items.map((i) => h('div.list-item', h('span.grow', i.name, h('br'), h('span.small.muted', i.label)), h('span.small.muted', `${fmt.int(i.kcal)} kcal · ${fmt.int(i.p)} g`)))),
    h('div.btn-row',
      h('button.btn', { onclick: async () => { try { await db.put('favorites', { name: e.name, items: e.items, total: e.total, portions: 1, photoId: e.photoId, slots: [e.slot], uses: 1, created: Date.now(), dish: true }); toast('Ajouté à Mes plats'); close(); } catch {} } }, icon('star'), 'Mes plats'),
      h('button.btn', { onclick: async () => {
        const f = await pickImage(); if (!f) return;
        try { const blob = await resizeImage(f); const pid = await db.put('photos', { blob, date: e.date, ts: Date.now() }); await db.put('meals', { ...e, photoId: pid }); close(); refresh(); } catch (er) { toast(`Photo non enregistrée : ${er.message}`); }
      } }, icon('camera'), url ? 'Changer' : 'Photo')),
    h('button.btn.btn-danger', { onclick: async () => {
      if (!(await confirmSheet('Supprimer ce repas ?', e.name, 'Supprimer', true))) return;
      try { await db.del('meals', e.id); close(); toast('Repas supprimé', { action: 'Annuler', onAction: async () => { await db.put('meals', e); refresh(); } }); refresh(); } catch {}
    } }, 'Supprimer')), { onClose: () => url && URL.revokeObjectURL(url) });
}

// ======================= Idées et préparations =======================
async function moreSheet(date) {
  await loadFoods();
  const dense = FOODS.filter((f) => f.tags.includes('dense')).map((f) => {
    const p = f.portions[Math.min(1, f.portions.length - 1)];
    return { f, p, kcal: (f.kcal * p.g) / 100 };
  }).sort((a, b) => b.kcal - a.kcal).slice(0, 15);
  const favs = await db.getAll('favorites');
  sheet('Idées et préparations', (close) => h('div.stack',
    h('button.btn.btn-primary', { onclick: () => { close(); openAdd({ date, recipe: true }); } }, '+ Nouvelle préparation (plat cuisiné à l\'avance)'),
    favs.length ? h('div', h('div.section-title', 'Mes plats et préparations'), h('div.list', favs.map((f) => h('div.list-item',
      h('span.grow', f.name, h('br'), h('span.small.muted', `${fmt.int(f.total.kcal)} kcal${f.recipe ? ' / portion' : ''}`)),
      h('button.icon-btn', { 'aria-label': `Supprimer ${f.name}`, onclick: async (ev) => { if (await confirmSheet('Supprimer ?', `Retirer « ${f.name} » de Mes plats ?`, 'Supprimer', true)) { await db.del('favorites', f.id); ev.target.closest('.list-item').remove(); } } }, icon('close')))))) : null,
    h('div.section-title', 'Collations à emporter'),
    h('div.list', SNACK_IDEAS.map((s) => h('div.list-item', h('div.grow', h('div', { style: { fontWeight: 600 } }, s.name), h('div.small.muted', s.why))))),
    h('div.section-title', 'Les plus riches en calories'),
    h('div.list', dense.map(({ f, p, kcal }) => h('div.list-item', h('span.grow', f.name, h('br'), h('span.small.muted', p.label)), h('strong.num', `${fmt.int(kcal)} kcal`)))),
    why(['densite', 'liquides', 'heures_fixes']),
    h('p.tiny.muted', 'Valeurs nutritionnelles : table Ciqual 2020 (ANSES) pour la plupart des aliments ; produits emballés : Open Food Facts.')), { full: true });
}
