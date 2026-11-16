// Repas : saisie rapide sans peser (portions visuelles, assiettes types, favoris, estimation rapide, photo du plat).
import * as db from '../db.js';
import { h, mount, why, fmt, progressBar, toast, sheet, clear, chips, pickImage, resizeImage, confirmSheet } from '../ui.js';
import { todayISO, addDays, longDate, nowMinutes } from '../lib/dates.js';
import { SLOTS, slotById, slotTargets, sumMacros, foodMacros, scaleMacros } from '../lib/nutrition.js';
import { PLATES, SIZES, QUICK, SNACK_IDEAS } from '../data/plates.js';
import { getDay, effectiveTargets, habitsForSlot } from '../state.js';
import { go, refresh } from '../main.js';

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
function itemFromFood(food, grams, label) {
  const m = foodMacros(food, grams);
  return { foodId: food.id, name: food.name, label: label || `${Math.round(grams)} g`, grams: Math.round(grams), kcal: Math.round(m.kcal), p: round1(m.p), g: round1(m.g), l: round1(m.l) };
}
function plateItems(plate, k) {
  return plate.items.map(([n, g]) => { const f = foodByName(n); return f ? itemFromFood(f, g * k) : null; }).filter(Boolean);
}
const roundTotal = (t) => ({ kcal: Math.round(t.kcal), p: round1(t.p), g: round1(t.g || 0), l: round1(t.l || 0) });

/** Copie d'un repas existant (« Refaire »). */
export async function repeatMeal(entry, date, slot) {
  const { id, ...rest } = entry;
  try {
    const nid = await db.put('meals', { ...rest, date, slot: slot || entry.slot, ts: Date.now() });
    toast(`${entry.name} ajouté`, { action: 'Annuler', onAction: async () => { await db.del('meals', nid); refresh(); } });
  } catch {}
}

function autoSnackSlot() {
  const m = nowMinutes();
  return m < 13 * 60 ? 'c10' : m < 19 * 60 ? 'c16' : 'coucher';
}

export async function render(root, params) {
  await loadFoods();
  const date = params.date || todayISO();
  const [day, t] = await Promise.all([getDay(date), effectiveTargets()]);
  const isToday = date === todayISO();

  mount(root, 
    h('div.page-head', h('div', h('h1', 'Repas'), h('div.sub', isToday ? 'Aujourd\'hui' : longDate(date)))),
    h('div.daynav',
      h('button.icon-btn', { 'aria-label': 'Jour précédent', onclick: () => go('repas', { date: addDays(date, -1) }) }, '‹'),
      h('span.label', longDate(date)),
      h('button.icon-btn', { 'aria-label': 'Jour suivant', disabled: isToday, onclick: () => go('repas', { date: addDays(date, 1) }) }, '›')),
    h('div.card', progressBar(day.totals.kcal, t.kcal, { label: 'Calories', unit: ' kcal' }), progressBar(day.totals.p, t.protein, { label: 'Protéines', unit: ' g' })),
    h('div.section-title', 'Prises de la journée'),
  );

  const photoUrls = [];
  for (const s of SLOTS) {
    const entries = day.meals.filter((m) => m.slot === s.id);
    const st = slotTargets(t, s.id);
    const tot = sumMacros(entries.map((e) => e.total));
    const habits = entries.length ? [] : await habitsForSlot(s.id, 1);
    const card = h(`div.slot${!entries.length && isToday && params.slot === s.id ? '.now' : ''}`,
      h('div.slot-head',
        h('div', h('div.slot-title', s.label), h('div.slot-meta', `${s.time.replace(':', 'h')} · objectif ≈ ${fmt.int(st.kcal)} kcal · ${st.protein} g`)),
        entries.length ? h('div.slot-meta', { style: { textAlign: 'right' } }, h('strong', { style: { color: 'var(--text)' } }, fmt.int(tot.kcal)), ' kcal', h('br'), `${fmt.int(tot.p)} g prot.`) : null),
      await Promise.all(entries.map(async (e) => {
        let img = null;
        if (e.photoId) { const ph = await db.get('photos', e.photoId); if (ph) { const u = URL.createObjectURL(ph.blob); photoUrls.push(u); img = h('img.thumb', { src: u, alt: '' }); } }
        return h('div.entry', { role: 'button', tabindex: '0', onclick: () => entrySheet(e) }, img,
          h('div.entry-name', e.name, h('span.muted', e.items.map((i) => i.label === 'estimation' ? 'estimation rapide' : `${i.name} (${i.label})`).join(', '))),
          h('div.entry-kcal', `${fmt.int(e.total.kcal)} kcal`, h('br'), h('span.muted', `${fmt.int(e.total.p)} g`)));
      })),
      h('div.slot-actions',
        h('button.btn.btn-primary', { onclick: () => addSheet({ date, slot: s.id }) }, '+ Ajouter'),
        habits[0] ? h('button.btn', { onclick: async () => { await repeatMeal(habits[0].last, date, s.id); refresh(); } }, `↻ ${short(habits[0].name)}`) : null));
    mount(root, card);
  }

  const complete = !!day.day.complete;
  mount(root, 
    h('div.card', { style: { marginTop: '12px' } },
      h('label.row', h('input', { type: 'checkbox', checked: complete, style: { width: '24px', height: '24px', accentColor: 'var(--accent)' },
        onchange: async (e) => { try { await db.put('days', { ...(await db.get('days', date)), date, complete: e.target.checked }); toast(e.target.checked ? 'Journée marquée complète' : 'Marque retirée'); } catch {} } }),
      h('span.grow', 'J\'ai tout noté aujourd\'hui (même approximativement)')),
      h('p.tiny.muted', { style: { marginTop: '6px' } }, 'Les jours complets servent à calculer ta dépense réelle. Une journée avec les 3 repas notés compte automatiquement.'),
      why('saisie_rapide', 'Pourquoi c\'est important ?')),
    h('div.section-title', 'Idées'),
    h('div.list',
      h('button.list-item', { onclick: ideasSheet }, h('span.grow', 'Collations faciles à emporter'), h('span.chev', '›')),
      h('button.list-item', { onclick: denseSheet }, h('span.grow', 'Aliments les plus riches en calories'), h('span.chev', '›')),
      h('button.list-item', { onclick: () => addSheet({ date, slot: null, recipe: true }) }, h('span.grow', 'Nouvelle préparation (plat cuisiné à l\'avance)'), h('span.chev', '›'))),
  );

  if (params.slot) {
    const slot = params.slot === 'auto-collation' ? autoSnackSlot() : params.slot;
    if (slotById(slot)) setTimeout(() => addSheet({ date, slot }), 50);
    history.replaceState(null, '', `?page=repas${params.date ? `&date=${params.date}` : ''}`);
  }
}

const short = (s, n = 26) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// ---------- Feuille d'ajout ----------
async function addSheet({ date, slot, recipe = false }) {
  const s = slot ? slotById(slot) : null;
  const cart = [];
  let photoId = null, photoUrl = null, plateName = null, asFav = false, portions = 4, recipeName = '';
  const tabsEl = h('div.tabs');
  const pane = h('div');
  const cartEl = h('div.cart');
  const favs = (await db.getAll('favorites')).sort((a, b) => (b.uses || 0) - (a.uses || 0));
  const habits = slot ? await habitsForSlot(slot, 6) : [];
  const usage = await foodUsage();

  const tabs = recipe ? [['aliments', 'Ingrédients']] : [
    ...(habits.length || favs.length ? [['favoris', 'Mes repas']] : []),
    ['assiettes', 'Assiettes types'], ['aliments', 'Aliments'], ['rapide', 'Estimation rapide']];
  let tab = tabs[0][0];

  function renderTabs() {
    clear(tabsEl);
    for (const [id, label] of tabs) tabsEl.append(h(`button${id === tab ? '.on' : ''}`, { onclick: () => { tab = id; renderTabs(); renderPane(); } }, label));
  }

  const add = (items, name) => {
    cart.push(...items.map((i) => ({ ...i, _k: Math.random() })));
    if (name && cart.length === items.length) plateName = name; else if (cart.length !== items.length) plateName = null;
    renderCart();
  };

  function renderPane() {
    clear(pane);
    if (tab === 'favoris') {
      if (habits.length) {
        pane.append(h('div.section-title', 'Tes habitudes pour ce créneau'));
        for (const hb of habits) pane.append(h('div.pick',
          h('div.pick-main', h('div.pick-name', hb.name), h('div.pick-sub', `${fmt.int(hb.last.total.kcal)} kcal · ${fmt.int(hb.last.total.p)} g · ${hb.count}× en 60 j`)),
          h('button.chip', { onclick: () => add(hb.last.items, hb.name) }, '+')));
      }
      if (favs.length) {
        pane.append(h('div.section-title', 'Favoris et préparations'));
        for (const f of favs) pane.append(favRow(f, (k) => add(f.items.map((i) => scaleItem(i, k)), f.name)));
      }
    } else if (tab === 'assiettes') {
      const list = [...PLATES].sort((a, b) => (slot && b.slots.includes(slot)) - (slot && a.slots.includes(slot)));
      pane.append(h('p.small.muted', 'Choisis la taille à l\'œil : pas besoin de peser.'));
      for (const p of list) {
        const base = sumMacros(plateItems(p, 1));
        pane.append(h('div.pick', h('div.pick-main',
          h('div.pick-name', p.name), h('div.pick-sub', `Normale ≈ ${fmt.int(base.kcal)} kcal · ${fmt.int(base.p)} g de protéines`),
          h('div.portion-chips', SIZES.map((sz) => h('button.chip', { onclick: () => add(plateItems(p, sz.k), `${p.name}${sz.id === 'M' ? '' : ` (${sz.label.toLowerCase()})`}`) }, sz.label))))));
      }
    } else if (tab === 'aliments') {
      const input = h('input.input', { type: 'search', placeholder: 'Rechercher (ex. riz, skyr, amandes)', autocomplete: 'off', enterkeyhint: 'search' });
      const results = h('div');
      const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');
      const show = () => {
        clear(results);
        const q = norm(input.value.trim());
        let list;
        if (q) { const words = q.split(/\s+/); list = FOODS.filter((f) => words.every((w) => norm(f.name + ' ' + f.cat).includes(w))); }
        else list = [...FOODS].sort((a, b) => (usage.get(b.id) || 0) - (usage.get(a.id) || 0));
        if (!q && usage.size) results.append(h('div.section-title', 'Les plus utilisés d\'abord'));
        for (const f of list.slice(0, 40)) results.append(foodRow(f, (item) => add([item])));
        if (!list.length) results.append(h('p.muted.small', 'Aucun aliment trouvé. Utilise l\'estimation rapide.'));
      };
      input.addEventListener('input', show);
      pane.append(h('div.search', input), results);
      show();
    } else if (tab === 'rapide') {
      const kinds = s && !s.main ? QUICK.collation : QUICK.repas;
      pane.append(h('p.small.muted', 'Pas le temps ou pas le détail ? Une estimation régulière vaut mieux qu\'un oubli.'), why('saisie_rapide'),
        h('div.stack-sm', kinds.map((q) => h('button.btn', { onclick: () => add([{ name: q.label, label: 'estimation', kcal: q.kcal, p: q.p, g: 0, l: 0 }], q.label) },
          q.label, h('span.muted.small', ` ≈ ${q.kcal} kcal · ${q.p} g`)))));
      let k = null, p = null, n = '';
      pane.append(h('div.section-title', 'Ou saisis les chiffres (ex. étiquette)'),
        h('div.stack',
          h('input.input', { placeholder: 'Nom (facultatif)', oninput: (e) => (n = e.target.value) }),
          h('div.grid2',
            h('input.input', { type: 'number', inputmode: 'numeric', placeholder: 'kcal', oninput: (e) => (k = +e.target.value) }),
            h('input.input', { type: 'number', inputmode: 'decimal', placeholder: 'protéines (g)', oninput: (e) => (p = +String(e.target.value).replace(',', '.')) })),
          h('button.btn', { onclick: () => { if (k > 0) add([{ name: n || 'Saisie manuelle', label: 'chiffres saisis', kcal: Math.round(k), p: p || 0, g: 0, l: 0 }], n || null); else toast('Indique au moins les calories'); } }, 'Ajouter')));
    }
  }

  function renderCart() {
    clear(cartEl);
    const tot = sumMacros(cart);
    if (recipe) {
      mount(cartEl, 
        h('div.cart-items', cart.length ? cart.map((i) => h('div.ci', h('span', `${i.name} — ${i.label}`), h('button', { 'aria-label': 'Retirer', onclick: () => { cart.splice(cart.indexOf(i), 1); renderCart(); } }, '×'))) : h('span.muted', 'Ajoute les ingrédients de toute la préparation (les paquets entiers, par exemple).')),
        h('div.grid2',
          h('input.input', { placeholder: 'Nom (ex. Dahl du dimanche)', value: recipeName, oninput: (e) => (recipeName = e.target.value) }),
          h('label.row', h('span.small.muted', 'Portions'), h('input.input', { type: 'number', inputmode: 'numeric', value: portions, min: 1, style: { width: '80px' }, oninput: (e) => (portions = Math.max(1, +e.target.value || 1)) }))),
        h('p.small.muted', { style: { margin: '8px 0' } }, `Total ${fmt.int(tot.kcal)} kcal → ${fmt.int(tot.kcal / portions)} kcal et ${fmt.int(tot.p / portions)} g de protéines par portion`),
        h('button.btn.btn-primary', { disabled: !cart.length, onclick: saveRecipe }, 'Enregistrer la préparation'));
      return;
    }
    const thumb = photoUrl ? h('img.thumb', { src: photoUrl, alt: 'Photo du plat' }) : null;
    mount(cartEl, 
      cart.length ? h('div.cart-items', cart.map((i) => h('div.ci', h('span', `${i.name} — ${i.label}`), h('span.row', `${fmt.int(i.kcal)} kcal`, h('button', { 'aria-label': 'Retirer', onclick: () => { cart.splice(cart.indexOf(i), 1); plateName = null; renderCart(); } }, '×'))))) : null,
      h('div.row', thumb,
        h('button.btn.btn-sm', { onclick: takePhoto }, photoUrl ? 'Changer la photo' : '📷 Photo du plat'),
        h('label.row.small', { style: { marginLeft: 'auto' } }, h('input', { type: 'checkbox', checked: asFav, style: { width: '20px', height: '20px', accentColor: 'var(--accent)' }, onchange: (e) => (asFav = e.target.checked) }), '★ Favori')),
      h('button.btn.btn-primary', { style: { marginTop: '10px' }, disabled: !cart.length, onclick: save },
        cart.length ? `Enregistrer · ${fmt.int(tot.kcal)} kcal · ${fmt.int(tot.p)} g` : 'Choisis ce que tu as mangé'));
  }

  async function takePhoto() {
    const f = await pickImage(); if (!f) return;
    try {
      const blob = await resizeImage(f);
      if (photoId) await db.del('photos', photoId);
      photoId = await db.put('photos', { blob, date, ts: Date.now() });
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(blob);
      renderCart();
    } catch (e) { toast(`Photo non enregistrée : ${e.message}`); }
  }

  async function save() {
    const items = cart.map(({ _k, ...i }) => i);
    const name = plateName || (items.length === 1 ? items[0].name : items.slice(0, 3).map((i) => i.name).join(' + ') + (items.length > 3 ? '…' : ''));
    const total = roundTotal(sumMacros(items));
    try {
      const nid = await db.put('meals', { date, slot, name, items, total, photoId, ts: Date.now() });
      if (asFav) await db.put('favorites', { name, items, total, portions: 1, photoId, slots: [slot], uses: 1, created: Date.now() });
      saved = true;
      close();
      toast(`${short(name)} enregistré`, { action: 'Annuler', onAction: async () => { await db.del('meals', nid); refresh(); } });
      refresh();
    } catch {}
  }

  async function saveRecipe() {
    const n = Math.max(1, portions);
    const items = cart.map(({ _k, ...i }) => scaleItem(i, 1 / n));
    const total = roundTotal(sumMacros(items));
    try {
      await db.put('favorites', { name: recipeName || 'Préparation', items, total, portions: n, recipe: true, uses: 0, created: Date.now() });
      saved = true; close(); toast('Préparation enregistrée : retrouve-la dans « Mes repas »'); refresh();
    } catch {}
  }

  let saved = false;
  const { close } = sheet(recipe ? 'Nouvelle préparation' : `Ajouter · ${s.label}`, h('div', tabsEl, pane, cartEl), { full: true,
    onClose: () => { if (!saved && photoId) db.del('photos', photoId).catch(() => {}); if (photoUrl) URL.revokeObjectURL(photoUrl); } });
  renderTabs(); renderPane(); renderCart();
}

function scaleItem(i, k) {
  return { ...i, grams: i.grams ? Math.round(i.grams * k) : i.grams, label: k === 1 ? i.label : `${i.label} ×${String(round1(k)).replace('.', ',')}`,
    kcal: Math.round(i.kcal * k), p: round1(i.p * k), g: round1((i.g || 0) * k), l: round1((i.l || 0) * k) };
}

function favRow(f, onAdd) {
  const k = [0.5, 1, 1.5, 2];
  return h('div.pick', h('div.pick-main',
    h('div.pick-name', f.recipe ? `🍲 ${f.name}` : `★ ${f.name}`),
    h('div.pick-sub', `${f.recipe ? '1 portion' : '×1'} ≈ ${fmt.int(f.total.kcal)} kcal · ${fmt.int(f.total.p)} g`),
    h('div.portion-chips', k.map((x) => h('button.chip', { onclick: async () => { onAdd(x); await db.put('favorites', { ...f, uses: (f.uses || 0) + 1, lastUsed: Date.now() }).catch(() => {}); } }, String(x).replace('.', ',') + (f.recipe ? (x > 1 ? ' portions' : ' portion') : '×'))),
      h('button.chip', { 'aria-label': 'Supprimer ce favori', onclick: async (e) => { if (await confirmSheet('Supprimer ?', `Supprimer « ${f.name} » de tes favoris ?`, 'Supprimer', true)) { await db.del('favorites', f.id); e.target.closest('.pick').remove(); } } }, '🗑'))));
}

function foodRow(f, onAdd) {
  const sub = `${f.kcal} kcal · ${String(f.p).replace('.', ',')} g prot. pour 100 g`;
  return h('div.pick', h('div.pick-main',
    h('div.pick-name', f.name), h('div.pick-sub', sub),
    h('div.portion-chips',
      f.portions.map((p) => h('button.chip', { onclick: () => onAdd(itemFromFood(f, p.g, p.label)) }, p.label)),
      h('button.chip', { onclick: () => {
        const v = prompt(`${f.name} : quantité en grammes`, '100');
        const g = parseFloat(String(v || '').replace(',', '.'));
        if (g > 0) onAdd(itemFromFood(f, g));
      } }, 'g'))));
}

async function foodUsage() {
  const from = addDays(todayISO(), -60);
  const meals = await db.byDateRange('meals', from, todayISO());
  const m = new Map();
  for (const e of meals) for (const i of e.items) if (i.foodId) m.set(i.foodId, (m.get(i.foodId) || 0) + 1);
  return m;
}

// ---------- Détail d'une entrée ----------
async function entrySheet(e) {
  let url = null;
  if (e.photoId) { const ph = await db.get('photos', e.photoId); if (ph) url = URL.createObjectURL(ph.blob); }
  sheet(e.name, (close) => h('div.stack',
    url ? h('img.thumb-lg', { src: url, alt: 'Photo du plat' }) : null,
    h('div.kpis', h('div.kpi', h('div.label', 'Calories'), h('div.value', fmt.int(e.total.kcal), h('span.unit', 'kcal'))),
      h('div.kpi', h('div.label', 'Protéines'), h('div.value', fmt.int(e.total.p), h('span.unit', 'g')))),
    h('div.list', e.items.map((i) => h('div.list-item', h('span.grow', i.name, h('br'), h('span.small.muted', i.label)), h('span.small.muted', `${fmt.int(i.kcal)} kcal · ${fmt.int(i.p)} g`)))),
    h('button.btn', { onclick: async () => { try { await db.put('favorites', { name: e.name, items: e.items, total: e.total, portions: 1, photoId: e.photoId, slots: [e.slot], uses: 1, created: Date.now() }); toast('Ajouté aux favoris'); close(); } catch {} } }, '★ Ajouter aux favoris'),
    h('button.btn', { onclick: async () => {
      const f = await pickImage(); if (!f) return;
      try { const blob = await resizeImage(f); const pid = await db.put('photos', { blob, date: e.date, ts: Date.now() }); await db.put('meals', { ...e, photoId: pid }); close(); refresh(); } catch (er) { toast(`Photo non enregistrée : ${er.message}`); }
    } }, url ? 'Changer la photo' : '📷 Ajouter une photo'),
    h('button.btn.btn-danger', { onclick: async () => {
      if (!(await confirmSheet('Supprimer ce repas ?', e.name, 'Supprimer', true))) return;
      try { await db.del('meals', e.id); close(); toast('Repas supprimé', { action: 'Annuler', onAction: async () => { await db.put('meals', e); refresh(); } }); refresh(); } catch {}
    } }, 'Supprimer')), { onClose: () => url && URL.revokeObjectURL(url) });
}

// ---------- Idées ----------
function ideasSheet() {
  sheet('Collations à emporter', h('div.stack',
    h('p.small.muted', 'Tu passes la journée dehors : prépare la veille, garde dans le sac, mange à heure fixe.'),
    h('div.list', SNACK_IDEAS.map((s) => h('div.list-item', h('div.grow', h('div', { style: { fontWeight: 600 } }, s.name), h('div.small.muted', s.why))))),
    h('div.row', why(['densite', 'liquides', 'heures_fixes']))));
}

function denseSheet() {
  const rows = FOODS.filter((f) => f.tags.includes('dense')).map((f) => {
    const p = f.portions[Math.min(1, f.portions.length - 1)];
    return { f, p, kcal: (f.kcal * p.g) / 100 };
  }).sort((a, b) => b.kcal - a.kcal).slice(0, 20);
  sheet('Riches en calories', h('div.stack',
    h('p.small.muted', 'Calories par portion courante : beaucoup d\'énergie pour peu de volume.'),
    h('div.list', rows.map(({ f, p, kcal }) => h('div.list-item', h('span.grow', f.name, h('br'), h('span.small.muted', p.label)), h('strong.num', `${fmt.int(kcal)} kcal`)))),
    why('densite')));
}
