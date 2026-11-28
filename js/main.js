// Point d'entrée : routeur, bandeaux globaux, service worker.
import * as db from './db.js';
import { h, banner, removeBanner, clear, toast } from './ui.js';
import { todayISO, diffDays, relativeDays } from './lib/dates.js';
import { ICONS, icon } from './icons.js';

document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon]; });

export const APP_VERSION = '1.11.1';

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
new MutationObserver((ms) => { if (!tabbar.classList.contains('dragging') && ms.some((m) => m.target.tagName === 'A')) syncIndicator(); }).observe(tabbar, { subtree: true, attributes: true, attributeFilter: ['class'] });
window.addEventListener('resize', syncIndicator);
requestAnimationFrame(syncIndicator);

function currentTab() { return TAB_ORDER.indexOf(new URLSearchParams(location.search).get('page') || 'aujourdhui'); }
const view = document.getElementById('view');
const W = () => window.innerWidth;
let animating = false;

/** Transition glissée : l'ancienne page sort pendant que la nouvelle se prépare, puis la nouvelle entre. */
async function goTab(i, dir, fromX = 0) {
  if (i < 0 || i >= TAB_ORDER.length || animating) return;
  animating = true;
  document.body.classList.add('swiping');
  const out = view.animate([{ transform: `translate3d(${fromX}px,0,0)`, opacity: 1 }, { transform: `translate3d(${-dir * W() * 0.45}px,0,0)`, opacity: 0 }],
    { duration: 170, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
  await Promise.all([out.finished, go(TAB_ORDER[i])]);
  out.cancel();
  view.style.transform = '';
  const inn = view.animate([{ transform: `translate3d(${dir * W() * 0.35}px,0,0)`, opacity: 0 }, { transform: 'translate3d(0,0,0)', opacity: 1 }],
    { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  await inn.finished.catch(() => {});
  document.body.classList.remove('swiping');
  animating = false;
}

// 1) Glisser horizontalement sur le contenu : la page suit le doigt (1:1), décision à la vitesse ou à la distance
const NO_SWIPE = '.tabs, .seg, .chart, input, textarea, select, .quick-repeat, .stepper, .qty, .no-swipe, .daybar';
let sx = 0, sy = 0, st = 0, lastX = 0, lastT = 0, vx = 0, mode = null, raf = 0, curDx = 0;
view.addEventListener('touchstart', (e) => {
  mode = null;
  if (animating || e.touches.length !== 1 || document.querySelector('.sheet-wrap') || e.target.closest(NO_SWIPE) || currentTab() < 0) { mode = 'off'; return; }
  const t = e.touches[0]; sx = lastX = t.clientX; sy = t.clientY; st = lastT = performance.now(); vx = 0; curDx = 0;
}, { passive: true });
view.addEventListener('touchmove', (e) => {
  if (mode === 'off') return;
  const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
  if (!mode) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    mode = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'off';
    if (mode === 'h') document.body.classList.add('swiping');
    else return;
  }
  e.preventDefault(); // geste horizontal : pas de défilement vertical en même temps
  const now = performance.now();
  vx = (t.clientX - lastX) / Math.max(1, now - lastT); lastX = t.clientX; lastT = now;
  const i = currentTab();
  const edge = (dx > 0 && i === 0) || (dx < 0 && i === TAB_ORDER.length - 1);
  curDx = edge ? dx * 0.25 : dx; // résistance au bord
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; view.style.transform = `translate3d(${curDx}px,0,0)`; view.style.opacity = String(1 - Math.min(0.35, Math.abs(curDx) / W() * 0.6)); });
}, { passive: false });
view.addEventListener('touchend', () => {
  if (mode !== 'h') { mode = null; return; }
  mode = null;
  cancelAnimationFrame(raf); raf = 0;
  const i = currentTab(), dir = curDx < 0 ? 1 : -1;
  const target = i + dir;
  const go_ = (Math.abs(curDx) > W() * 0.22 || Math.abs(vx) > 0.45) && Math.sign(vx || curDx) === Math.sign(curDx) && target >= 0 && target < TAB_ORDER.length;
  view.style.opacity = '';
  if (go_) { const x = curDx; view.style.transform = ''; goTab(target, dir, x); }
  else {
    const back = view.animate([{ transform: `translate3d(${curDx}px,0,0)` }, { transform: 'translate3d(0,0,0)' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
    view.style.transform = '';
    back.finished.then(() => document.body.classList.remove('swiping')).catch(() => {});
  }
});
view.addEventListener('touchcancel', () => { mode = null; view.style.transform = ''; view.style.opacity = ''; document.body.classList.remove('swiping'); });

// 0) Barre compacte en faisant défiler vers le bas, normale en remontant (comme les barres iOS 26)
let lastY = window.scrollY, miniRaf = 0;
function setMini(on) { tabbar.classList.toggle('mini', on); }
window.addEventListener('scroll', () => {
  if (miniRaf) return;
  miniRaf = requestAnimationFrame(() => {
    miniRaf = 0;
    const y = window.scrollY, dy = y - lastY;
    if (y < 40 || dy < -8) setMini(false);
    else if (dy > 8 && y > 120) setMini(true);
    if (Math.abs(dy) > 8 || y < 40) lastY = y;
  });
}, { passive: true });
tabbar.addEventListener('touchstart', () => setMini(false), { passive: true });
window.addEventListener('popstate', () => setMini(false));
new MutationObserver(() => setMini(false)).observe(document.getElementById('view'), { childList: true });
// L'indicateur suit la taille de la barre pendant la transition compacte/normale
let rzT = 0;
new ResizeObserver(() => { if (tabbar.classList.contains('dragging')) return; tabbar.classList.add('resizing'); syncIndicator(); clearTimeout(rzT); rzT = setTimeout(() => tabbar.classList.remove('resizing'), 80); }).observe(tabbar);

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
