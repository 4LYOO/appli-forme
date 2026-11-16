// Dates locales au format ISO "AAAA-MM-JJ". Arithmétique en UTC pour éviter les pièges de l'heure d'été.

const pad = (n) => String(n).padStart(2, '0');

export function toISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayISO = () => toISO(new Date());

function toUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export const addDays = (iso, n) => fromUTC(toUTC(iso) + n * 86400000);

/** Nombre de jours de a à b (b − a). */
export const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000);

/** 0 = dimanche … 6 = samedi */
export const weekday = (iso) => new Date(toUTC(iso)).getUTCDay();

export const isWeekend = (iso) => [0, 6].includes(weekday(iso));

/** Lundi de la semaine contenant iso. */
export const mondayOf = (iso) => addDays(iso, -((weekday(iso) + 6) % 7));

export function ageOn(birthISO, onISO = todayISO()) {
  const [by, bm, bd] = birthISO.split('-').map(Number);
  const [y, m, d] = onISO.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age--;
  return age;
}

/** Liste des dates de from à to inclus. */
export function range(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function longDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  const j = JOURS[weekday(iso)];
  return `${j[0].toUpperCase()}${j.slice(1)} ${d}${d === 1 ? 'er' : ''} ${MOIS[m - 1]}`;
}

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export function shortDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MOIS_COURTS[m - 1]}`;
}

export const dayName = (iso) => JOURS[weekday(iso)];

/** "il y a 3 jours", "aujourd'hui"… */
export function relativeDays(iso, ref = todayISO()) {
  const n = diffDays(iso, ref);
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return 'hier';
  return `il y a ${n} jours`;
}

/** Minutes depuis minuit pour "HH:MM". */
export const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export const nowMinutes = (d = new Date()) => d.getHours() * 60 + d.getMinutes();
