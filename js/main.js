// Point d'entrée : routeur, bandeaux globaux, service worker.
import * as db from './db.js';
import { h, banner, removeBanner, clear, toast } from './ui.js';
import { todayISO, diffDays, relativeDays } from './lib/dates.js';
import { ICONS, icon } from './icons.js';

document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon]; });

export const APP_VERSION = '1.8.0';

const VIEWS = {
  aujourdhui: () => import('./views/today.js'),
  repas: () => import('./views/meals.js'),
  seance: () => import('./views/training.js'),
  poids: () => import('./views/weight.js'),
  idees: () => import('./views/ideas.js'),
  courses: () => import('./views/courses.js'),
  plus: () => import('./views/more.js'),
  config: () => import('./views/setup.js'),
};

// Liens directs (Raccourcis iOS) → onglet + paramètres.
const ALIASES = {
  matin: ['aujourdhui', { focus: 'questionnaire' }],
  questionnaire: ['aujourdhui', { focus: 'questionnaire' }],
  petitdej: ['repas', { slot: 'petitdej' }],
  midi: ['repas', { slot: 'midi' }],
  dejeuner: ['repas', { slot: 'midi' }],
  diner: ['repas', { slot: 'diner' }],
  collation: ['repas', { slot: 'auto-collation' }],
  coucher: ['repas', { slot: 'coucher' }],
  pesee: ['poids', { focus: 'saisie' }],
  sauvegarde: ['plus', { section: 'sauvegarde' }],
  rappels: ['plus', { section: 'rappels' }],
  bilan: ['aujourdhui', {}],
  recettes: ['idees', {}],
  liste: ['courses', {}],
};

let current = null;

export function go(page, params = {}, { replace = false } = {}) {
  const q = new URLSearchParams({ page, ...params });
  const url = `?${q}`;
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  return route();
}

export async function refresh() { return route(true); }

async function route(keepScroll = false) {
  const q = new URLSearchParams(location.search);
  let page = q.get('page') || 'aujourdhui';
  const params = Object.fromEntries(q.entries());
  if (ALIASES[page]) { const [p, extra] = ALIASES[page]; page = p; Object.assign(params, extra); }
  if (!VIEWS[page]) page = 'aujourdhui';

  const profile = await db.kvGet('profile');
  if (!profile && page !== 'config') page = 'config';

  document.querySelectorAll('#tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === page));
  document.getElementById('tabbar').classList.toggle('hidden', page === 'config');
  const root = document.getElementById('view');
  const y = window.scrollY;
  const mod = await VIEWS[page]();
  const frag = h('div');
  current = page;
  try { await mod.render(frag, params); }
  catch (e) { console.error(e); frag.append(h('div.card', h('h2', 'Oups'), h('p.muted', `Erreur d'affichage : ${e.message}`))); }
  if (current !== page) return;
  // Réglages : bulle en haut à droite de chaque écran (comme un profil)
  const head = frag.querySelector('.page-head');
  if (head && page !== 'plus' && page !== 'config') {
    head.append(h('button.avatar-btn', { 'aria-label': 'Profil et réglages', onclick: () => go('plus') }, icon('user')));
  } else if (head && page === 'plus') {
    head.prepend(h('button.icon-btn', { 'aria-label': 'Retour', onclick: () => (history.length > 1 ? history.back() : go('aujourdhui')) }, '‹'));
  }
  clear(root).append(...frag.childNodes);
  window.scrollTo(0, keepScroll ? y : 0);
}

// ---------- Erreurs : jamais silencieuses ----------
db.onDbError((e, what) => {
  console.error('DB', what, e);
  const quota = e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || ''));
  banner('db-error', { kind: 'error',
    text: quota ? 'Espace de stockage plein : la dernière saisie n\'a PAS été enregistrée. Supprime des photos ou exporte une sauvegarde.'
      : `La dernière saisie n'a PAS été enregistrée (${e?.message || e?.name || 'erreur inconnue'}). Réessaie ; si ça continue, exporte une sauvegarde.`,
    action: 'Sauvegarder', onAction: () => go('plus', { section: 'sauvegarde' }) });
});
window.addEventListener('unhandledrejection', (ev) => console.error('Promesse rejetée', ev.reason));

// ---------- Navigation ----------
document.getElementById('tabbar').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-tab]');
  if (!a) return;
  e.preventDefault();
  go(a.dataset.tab);
});
window.addEventListener('popstate', () => route());

// ---------- Bandeaux globaux ----------
export async function updateGlobalBanners() {
  const isStandalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS && !isStandalone && !sessionStorage.getItem('safari-ok')) {
    banner('safari', { text: 'Tu es dans Safari. Installe l\'appli : bouton Partager → « Sur l\'écran d\'accueil ». Attention : Safari et l\'appli installée ont des données séparées.',
      action: 'Compris', onAction: (b) => { sessionStorage.setItem('safari-ok', '1'); b.remove(); }, dismiss: false });
  }

  const p = await db.ensurePersistence().catch(() => ({ supported: false }));
  await db.kvSet('persist', { ...p, usage: undefined, checked: Date.now() }).catch(() => {});
  if (p.supported && !p.persisted && isStandalone) {
    banner('persist', { text: 'iOS n\'a pas (encore) accordé le stockage persistant. Sauvegarde chaque semaine pour ne rien perdre.' });
  }

  const lastSleep = await db.kvGet('lastSleepImport');
  if (lastSleep && diffDays(lastSleep.slice(0, 10), todayISO()) >= 7) {
    banner('sleep', { text: 'Pas d\'import de sommeil depuis une semaine.', action: 'Importer', onAction: () => go('plus', { section: 'sommeil' }) });
  }

  const last = await db.kvGet('lastBackup');
  const first = await db.kvGet('firstDay');
  if (first) {
    const ref = last ? last.slice(0, 10) : first;
    if (diffDays(ref, todayISO()) >= 7) {
      banner('backup', { text: last ? `Dernière sauvegarde ${relativeDays(last.slice(0, 10))}. Pense à sauvegarder.` : 'Aucune sauvegarde pour l\'instant. Fais-en une maintenant.',
        action: 'Sauvegarder', onAction: () => go('plus', { section: 'sauvegarde' }) });
    } else removeBanner('backup');
  }
}

// ---------- Service worker (hors ligne + mises à jour) ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const ask = (w) => banner('update', { text: 'Nouvelle version de l\'appli disponible.', action: 'Mettre à jour',
      onAction: () => w.postMessage('skipWaiting') });
    if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch((e) => console.warn('SW', e));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

// Rafraîchir l'écran quand on revient dans l'appli (l'heure a pu changer de créneau).
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else if (Date.now() - hiddenAt > 5 * 60 * 1000 && !document.querySelector('.sheet-wrap')) refresh();
});

db.kvGet('aiKey').then((k) => k && db.del('kv', 'aiKey')).catch(() => {}); // reconnaissance IA payante retirée (v1.5) : on efface une éventuelle clé
route().then(updateGlobalBanners).catch((e) => {
  document.getElementById('view').textContent = `Impossible de démarrer : ${e.message}`;
});
export { toast };

// =====================================================================
// Navigation par gestes : glisser sur l'écran ou le long de la barre d'onglets
// =====================================================================
const TAB_ORDER = ['aujourdhui', 'repas', 'idees', 'courses', 'seance', 'poids'];
const tabbar = document.getElementById('tabbar');
const indicator = document.createElement('div');
indicator.id = 'tab-indicator';
tabbar.prepend(indicator);

function placeIndicator(el) {
  if (!el) { indicator.style.opacity = '0'; return; }
  indicator.style.opacity = '1';
  indicator.style.width = `${el.offsetWidth}px`;
  indicator.style.transform = `translateX(${el.offsetLeft}px)`;
}
export function syncIndicator() { placeIndicator(tabbar.querySelector('a.on')); }
new MutationObserver(syncIndicator).observe(tabbar, { subtree: true, attributes: true, attributeFilter: ['class'] });
window.addEventListener('resize', syncIndicator);
requestAnimationFrame(syncIndicator);

let lastIndex = 0;
function currentTab() { return TAB_ORDER.indexOf(new URLSearchParams(location.search).get('page') || 'aujourdhui'); }
async function goTab(i, dir) {
  if (i < 0 || i >= TAB_ORDER.length) return;
  const view = document.getElementById('view');
  await go(TAB_ORDER[i]);
  view.classList.remove('enter-from-right', 'enter-from-left');
  void view.offsetWidth;
  view.classList.add(dir > 0 ? 'enter-from-right' : 'enter-from-left');
  lastIndex = i;
}

// 1) Glisser horizontalement sur le contenu
const NO_SWIPE = '.tabs, .seg, .chart, input, textarea, select, .quick-repeat, .stepper, .qty, .no-swipe, .daybar';
let sx = 0, sy = 0, st = 0, tracking = false;
const view = document.getElementById('view');
view.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1 || document.querySelector('.sheet-wrap') || e.target.closest(NO_SWIPE) || currentTab() < 0) { tracking = false; return; }
  const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); tracking = true;
}, { passive: true });
view.addEventListener('touchmove', (e) => {
  if (!tracking) return;
  const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
  if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { tracking = false; view.style.transform = ''; return; }
  if (Math.abs(dx) > 10) { view.style.transition = 'none'; view.style.transform = `translateX(${dx * 0.25}px)`; }
}, { passive: true });
view.addEventListener('touchend', (e) => {
  if (!tracking) return;
  tracking = false;
  const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
  view.style.transition = 'transform 0.2s'; view.style.transform = '';
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - st < 700) {
    const i = currentTab();
    goTab(dx < 0 ? i + 1 : i - 1, dx < 0 ? 1 : -1);
  }
}, { passive: true });

// 2) Glisser le doigt le long de la barre : l'indicateur suit, l'onglet s'ouvre au relâchement
let barTarget = null;
function tabAt(x) {
  const links = [...tabbar.querySelectorAll('a[data-tab]')];
  return links.find((a) => { const r = a.getBoundingClientRect(); return x >= r.left && x <= r.right; }) || null;
}
tabbar.addEventListener('touchstart', (e) => { barTarget = tabAt(e.touches[0].clientX); tabbar.classList.add('dragging'); placeIndicator(barTarget); }, { passive: true });
tabbar.addEventListener('touchmove', (e) => { const a = tabAt(e.touches[0].clientX); if (a && a !== barTarget) { barTarget = a; placeIndicator(a); navigator.vibrate?.(5); } }, { passive: true });
tabbar.addEventListener('touchend', (e) => {
  tabbar.classList.remove('dragging');
  if (!barTarget) return syncIndicator();
  e.preventDefault();
  const from = currentTab(), to = TAB_ORDER.indexOf(barTarget.dataset.tab);
  if (to !== from) goTab(to, to > from ? 1 : -1); else syncIndicator();
  barTarget = null;
});
