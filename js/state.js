// Accès aux données de haut niveau (profil, objectifs, journées), utilisé par les écrans.
import * as db from './db.js';
import { todayISO, addDays, ageOn } from './lib/dates.js';
import { initialTargets, minimumDay, dayTotals } from './lib/nutrition.js';
import { trendSeries } from './lib/weight.js';

export const DEFAULT_PROFILE = {
  sex: 'H', birthdate: '2002-12-09', heightCm: 184, weightKg: 58, activity: 'modere',
  eggs: true, dairy: true, bedtime: '22:30', wake: '06:00', sessionTime: '10:00',
};

export const DEFAULT_INTENTIONS = [
  { slot: 'petitdej', text: 'Quand mon réveil sonne à 6h, je mets le lait à chauffer avant même de me doucher.' },
  { slot: 'c10', text: 'S\'il est 10h, je mange ce que j\'ai mis dans la poche avant de mon sac.' },
  { slot: 'midi', text: 'Quand je prépare mon déjeuner la veille, j\'ajoute une source de protéines et une cuillère d\'huile.' },
  { slot: 'c16', text: 'S\'il est 16h, je prends ma collation, même sans faim.' },
  { slot: 'diner', text: 'Quand je pose mon assiette du dîner, je me sers aussi un verre de lait.' },
  { slot: 'coucher', text: 'Quand j\'éteins la télé ou l\'écran, je prends mon fromage blanc avant de me brosser les dents.' },
];

export async function getProfile() { return db.kvGet('profile'); }
export async function getTargets() { return db.kvGet('targets'); }

export async function saveProfileAndTargets(profile, targets, reason) {
  const prev = await getTargets();
  const date = todayISO();
  const ops = [['kv', 'put', { k: 'profile', v: profile }], ['kv', 'put', { k: 'targets', v: { ...targets, updated: date } }]];
  if (!prev || prev.kcal !== targets.kcal || prev.protein !== targets.protein) {
    ops.push(['adjustments', 'put', {
      date, ts: Date.now(), kind: prev ? 'manuel' : 'initial',
      title: prev ? `Objectifs modifiés : ${targets.kcal} kcal, ${targets.protein} g de protéines` : `Objectifs de départ : ${targets.kcal} kcal, ${targets.protein} g de protéines`,
      text: reason,
    }]);
  }
  if (!(await db.kvGet('firstDay'))) ops.push(['kv', 'put', { k: 'firstDay', v: date }]);
  await db.batch(ops);
}

export const ageNow = (p) => ageOn(p.birthdate, todayISO());

export function computeInitial(p, weightKg = p.weightKg) {
  return initialTargets({ sex: p.sex, weightKg, heightCm: p.heightCm, age: ageNow(p), activity: p.activity, surplusPct: p.surplusPct ?? 0.15, proteinPerKg: p.proteinPerKg ?? 2.0 });
}

/** Objectifs effectifs du jour : protéines recalculées sur la tendance de poids actuelle. */
export async function effectiveTargets() {
  const t = await getTargets();
  if (!t) return null;
  const w = await latestTrend();
  const kg = w ?? (await getProfile())?.weightKg;
  return { ...t, protein: Math.round((t.proteinPerKg ?? 2) * kg) };
}

export async function latestTrend() {
  const ws = await db.getAll('weights');
  if (!ws.length) return null;
  return trendSeries(ws).at(-1).trend;
}

export async function getDay(date) {
  const [meals, day, weight] = await Promise.all([db.byDate('meals', date), db.get('days', date), db.get('weights', date)]);
  meals.sort((a, b) => a.ts - b.ts);
  return { date, meals, day: day || { date }, weight, totals: dayTotals(meals), minimum: minimumDay(meals, !!day?.checkin) };
}

/** Ensemble des dates où la journée minimale est atteinte (pour les séries). */
export async function metDates(days = 120) {
  const from = addDays(todayISO(), -days);
  const [meals, ds] = await Promise.all([db.byDateRange('meals', from, todayISO()), db.getAll('days')]);
  const byDate = new Map();
  for (const m of meals) { if (!byDate.has(m.date)) byDate.set(m.date, []); byDate.get(m.date).push(m); }
  const checkins = new Set(ds.filter((d) => d.checkin).map((d) => d.date));
  const met = new Set();
  for (const [d, ms] of byDate) if (minimumDay(ms, checkins.has(d)).met) met.add(d);
  return met;
}

/** Repas les plus fréquents pour un créneau (habitudes) : regroupés par nom, triés par usage. */
export async function habitsForSlot(slot, limit = 4) {
  const from = addDays(todayISO(), -60);
  const meals = (await db.byDateRange('meals', from, todayISO())).filter((m) => m.slot === slot);
  const map = new Map();
  for (const m of meals) {
    const k = m.name;
    const e = map.get(k) || { name: k, count: 0, last: m };
    e.count++; if (m.ts > e.last.ts) e.last = m;
    map.set(k, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last.ts - a.last.ts).slice(0, limit);
}

export async function logAdjustment(title, text, kind = 'info') {
  await db.put('adjustments', { date: todayISO(), ts: Date.now(), kind, title, text });
}
