// Petits utilitaires d'interface, sans framework.
import { SOURCES, NIVEAUX } from './data/sources.js';

/** h('div.card#id', {onclick}, enfants…) */
export function h(sel, props, ...children) {
  if (props == null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) { children.unshift(props); props = {}; }
  const [, tag = 'div', rest = ''] = sel.match(/^([a-z0-9]*)(.*)$/i);
  const el = document.createElement(tag || 'div');
  for (const part of rest.match(/[.#][^.#]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'class') el.className += ' ' + v;
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

export function mount(el, ...children) { append(el, children); return el; }

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const fmt = {
  int: (x) => (x == null || isNaN(x) ? '–' : Math.round(x).toLocaleString('fr-FR')),
  kg: (x, d = 1) => (x == null ? '–' : x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })),
  signed: (x, d = 2) => (x == null ? '–' : (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })),
};

export function clear(el) { while (el.firstChild) el.firstChild.remove(); return el; }

// ---------- Bandeaux et messages ----------
export function toast(msg, { action, onAction, ms = 3500 } = {}) {
  const host = document.getElementById('toasts');
  const t = h('div.toast', { role: 'status' }, h('span', msg),
    action && h('button.toast-action', { onclick: () => { onAction?.(); t.remove(); } }, action));
  host.append(t);
  setTimeout(() => t.remove(), ms);
}

export function banner(id, { kind = 'info', text, action, onAction, dismiss = true }) {
  const host = document.getElementById('banners');
  host.querySelector(`[data-id="${id}"]`)?.remove();
  const b = h(`div.banner.banner-${kind}`, { 'data-id': id, role: kind === 'error' ? 'alert' : 'status' },
    h('span.banner-icon', { 'aria-hidden': 'true' }, kind === 'error' ? '⚠' : 'ℹ'),
    h('span.banner-text', text),
    action && h('button.banner-action', { onclick: () => onAction?.(b) }, action),
    dismiss && h('button.banner-close', { 'aria-label': 'Fermer', onclick: () => b.remove() }, '×'));
  host.append(b);
  return b;
}
export const removeBanner = (id) => document.querySelector(`#banners [data-id="${id}"]`)?.remove();

// ---------- Feuille (panneau du bas) ----------
export function sheet(title, content, { full = false, onClose } = {}) {
  const close = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 200); onClose?.(); };
  const body = h('div.sheet-body');
  const panel = h(`div.sheet${full ? '.sheet-full' : ''}`, { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div.sheet-head', h('h2', title), h('button.icon-btn', { 'aria-label': 'Fermer', onclick: close }, '×')),
    body);
  const wrap = h('div.sheet-wrap', { onclick: (e) => { if (e.target === wrap) close(); } }, panel);
  append(body, [typeof content === 'function' ? content(close) : content]);
  document.body.append(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  return { close, body };
}

export function confirmSheet(title, text, okLabel = 'Confirmer', danger = false) {
  return new Promise((resolve) => {
    let done = false;
    const s = sheet(title, (close) => h('div.stack',
      h('p', text),
      h(`button.btn${danger ? '.btn-danger' : '.btn-primary'}`, { onclick: () => { done = true; resolve(true); close(); } }, okLabel),
      h('button.btn', { onclick: () => close() }, 'Annuler')), { onClose: () => { if (!done) resolve(false); } });
    return s;
  });
}

// ---------- « Pourquoi ? » ----------
export function why(id, label = 'Pourquoi ?') {
  return h('button.why', { type: 'button', onclick: (e) => { e.stopPropagation(); showWhy(id); } }, label);
}

export function showWhy(ids) {
  const list = [].concat(ids).map((i) => SOURCES[i]).filter(Boolean);
  sheet('Pourquoi ?', h('div.stack', list.map((s) => h('div.why-item',
    h('h3', s.title),
    h(`span.badge.badge-${s.niveau}`, NIVEAUX[s.niveau]),
    h('p', s.text),
    h('ul.refs', s.refs.map((r) => h('li', r)))))));
}

// ---------- Contrôles ----------
/** Rangée de pastilles 1-5 (ou options libres). */
export function chips(options, value, onChange, { cls = '' } = {}) {
  const row = h(`div.chips${cls ? '.' + cls : ''}`, { role: 'radiogroup' });
  const render = () => {
    clear(row);
    for (const o of options) {
      const v = typeof o === 'object' ? o.value : o;
      const l = typeof o === 'object' ? o.label : String(o);
      row.append(h('button.chip', { type: 'button', role: 'radio', 'aria-checked': String(v === value), class: v === value ? 'on' : '',
        onclick: () => { value = v === value && o.toggle ? null : v; render(); onChange(value); } }, l));
    }
  };
  render();
  return row;
}

export function stepper(value, { min = 0, max = 999, step = 1, onChange, unit = '' } = {}) {
  const out = h('output.stepper-val', String(value));
  const set = (v) => { value = Math.min(max, Math.max(min, v)); out.textContent = String(value) + unit; onChange?.(value); };
  set(value);
  return h('div.stepper',
    h('button.stepper-btn', { type: 'button', 'aria-label': 'Moins', onclick: () => set(value - step) }, '−'),
    out,
    h('button.stepper-btn', { type: 'button', 'aria-label': 'Plus', onclick: () => set(value + step) }, '+'));
}

export function progressBar(value, target, { label, unit = '' } = {}) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return h('div.progress',
    h('div.progress-head', h('span.progress-label', label),
      h('span.progress-num', h('strong', fmt.int(value)), ` / ${fmt.int(target)}${unit}`)),
    h('div.progress-track', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(Math.round(target)), 'aria-valuenow': String(Math.round(value)), 'aria-label': label },
      h('div.progress-fill', { style: { width: pct + '%' } })));
}

/** Redimensionne une photo (≈ 1080 px, JPEG) avant stockage. */
export async function resizeImage(file, max = 1080, quality = 0.8) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Photo illisible'))), 'image/jpeg', quality));
}

/** Choisir une photo (appareil photo ou galerie). */
export function pickImage() {
  return new Promise((resolve) => {
    const i = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    i.addEventListener('change', () => { resolve(i.files[0] || null); i.remove(); });
    document.body.append(i);
    i.click();
  });
}

export function pickFile(accept) {
  return new Promise((resolve) => {
    const i = h('input', { type: 'file', accept, style: { display: 'none' } });
    i.addEventListener('change', () => { resolve(i.files[0] || null); i.remove(); });
    document.body.append(i);
    i.click();
  });
}
