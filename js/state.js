// Accès aux données de haut niveau (profil, objectifs, journées), utilisé par les écrans.
import * as db from './db.js';
import { todayISO, addDays, ageOn } from './lib/dates.js';
import { initialTargets, minimumDay, dayTotals } from './lib/nutrition.js';
import { trendSeries } from './lib/weight.js';

export const DEFAULT_PROFILE = {
  sex: 'H', birthdate: '2002-12-09', heightCm: 184, weightKg: 58, activity: 'modere',
  eggs: true, dairy: true, bedtime: '22:30', wake: '06:00', sessionTime: '10:00',
  job: 'Monteur chaussure', physicalJob: true, jobDays: 5, upperBodyJob: true, healthActive: 260, goalKg: 65,
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

/** Données du cap de poids : départ, poids actuel (tendance si pesées), rythme mesuré. */
export async function goalData() {
  const { goalProgress } = await import('./lib/goal.js');
  const { trendSeries, weeklyRate } = await import('./lib/weight.js');
  const p = (await getProfile()) || {};
  const entries = (await db.getAll('weights')).sort((a, b) => (a.date < b.date ? -1 : 1));
  const last = trendSeries(entries).at(-1);
  const today = todayISO();
  const r = weeklyRate(entries, today, 14);
  const startKg = p.startKg ?? entries[0]?.kg ?? p.weightKg ?? 58;
  const currentKg = last?.trend ?? p.weightKg ?? startKg;
  return { ...goalProgress({ startKg, currentKg, goalKg: p.goalKg ?? 65, rate: r.ok ? r.rate : null, today }), currentKg, startKg, weighed: !!last };
}

export const ageNow = (p) => ageOn(p.birthdate, todayISO());

export function computeInitial(p, weightKg = p.weightKg) {
  return initialTargets({ sex: p.sex, weightKg, heightCm: p.heightCm, age: ageNow(p), activity: p.activity, surplusPct: p.surplusPct ?? 0.15, proteinPerKg: p.proteinPerKg ?? 2.0,
    healthActive: p.healthActive ?? null, physicalJobDays: p.physicalJob ? (p.jobDays ?? 5) : 0, sessionsPerWeek: 2 });
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

// ---------- Sommeil ----------
export async function getNight(date) { return db.get('sleep', date); }

/** Enregistre des nuits importées (une par date : remplace l'existante). */
export async function saveNights(nights) {
  const ops = nights.map((n) => ['sleep', 'put', { ...n, importedAt: Date.now() }]);
  ops.push(['kv', 'put', { k: 'lastSleepImport', v: new Date().toISOString() }]);
  await db.batch(ops);
}

// ---------- Moteur hebdomadaire (phase 2) ----------
import { dailyIntake, runWeekly, weekReview, compositionSignal } from './lib/weekly.js';

export async function loadHistory(days = 120) {
  const to = todayISO(), from = addDays(to, -days);
  const [meals, dayRecs, weights, sleep, workouts, adjustments, measures, targets, firstDay] = await Promise.all([
    db.byDateRange('meals', from, to), db.getAll('days'), db.getAll('weights'), db.getAll('sleep'), db.getAll('workouts'),
    db.getAll('adjustments'), db.getAll('measures'), getTargets(), db.kvGet('firstDay')]);
  const intake = dailyIntake(meals, dayRecs, firstDay && firstDay > from ? firstDay : from, to);
  weights.sort((a, b) => (a.date < b.date ? -1 : 1));
  const checkins = dayRecs.filter((d) => d.checkin).map((d) => ({ date: d.date, ...d.checkin }));
  return { intake, weights, sleep, workouts, adjustments, measures, targets, firstDay, checkins };
}

/**
 * Lancé à l'ouverture : au plus une fois par semaine, à partir de 14 jours d'utilisation.
 * Applique le nouvel objectif, le note dans l'historique, et le garde pour la carte « Ajustement de la semaine ».
 */
export async function maybeRunWeekly() {
  const H = await loadHistory();
  if (!H.targets) return null;
  const state = (await db.kvGet('adaptState')) || {};
  const comp = compositionSignal(H.measures);
  const r = runWeekly({ today: todayISO(), firstDay: H.firstDay, intake: H.intake, weights: H.weights, sleep: H.sleep, targets: H.targets, state, goalKgWeek: comp.goal ?? 0.3 });
  if (!r.due) return null;
  const ops = [['kv', 'put', { k: 'adaptState', v: r.state }],
    ['kv', 'put', { k: 'lastWeekly', v: { date: todayISO(), title: r.title, text: r.text, change: r.change, prevKcal: H.targets.kcal, tdee: r.est.tdee, confidence: r.est.confidence, seen: false } }],
    ['adjustments', 'put', { date: todayISO(), ts: Date.now(), kind: 'adaptatif', title: r.title, text: r.text }]];
  if (r.change) ops.push(['kv', 'put', { k: 'targets', v: { ...H.targets, kcal: r.target, source: 'adaptatif', tdee: r.est.tdee, updated: todayISO() } }]);
  await db.batch(ops);
  return r;
}

export async function undoWeekly() {
  const lw = await db.kvGet('lastWeekly');
  const t = await getTargets();
  if (!lw || !lw.change) return;
  await db.batch([
    ['kv', 'put', { k: 'targets', v: { ...t, kcal: lw.prevKcal, source: 'manuel', updated: todayISO() } }],
    ['kv', 'put', { k: 'lastWeekly', v: { ...lw, change: 0, undone: true, seen: true } }],
    ['adjustments', 'put', { date: todayISO(), ts: Date.now(), kind: 'manuel', title: `Ajustement annulé : retour à ${lw.prevKcal} kcal`, text: 'Annulé à la main.' }]]);
}

export async function reviewFor(date) {
  const H = await loadHistory(60);
  return { review: weekReview({ date, ...H, targets: await effectiveTargets() }), H };
}

export { compositionSignal };

// ---------- Adaptation au jour le jour (v1.3) ----------
import { carryOver, skipRates, adaptedShares, remainingPlan, suggestPlan } from './lib/daily.js';
import { SLOTS as _SLOTS, sumMacros as _sum } from './lib/nutrition.js';
import { PLATES, QUICK } from './data/plates.js';

/** Objectif du jour = objectif de base + rattrapage de la veille. */
export async function todayTargets(date = todayISO()) {
  const t = await effectiveTargets();
  if (!t) return null;
  const y = addDays(date, -1);
  const [ym, yd] = await Promise.all([db.byDate('meals', y), db.get('days', y)]);
  const yk = _sum(ym.map((m) => m.total)).kcal;
  const complete = ym.length > 0 && (yd?.complete || ['petitdej', 'midi', 'diner'].every((s) => ym.some((m) => m.slot === s)));
  const c = carryOver({ base: t.kcal, yesterday: ym.length ? { kcal: yk, complete } : null });
  return { ...t, base: t.kcal, kcal: t.kcal + c.carry, carry: c.carry, carryReason: c.reason };
}

/** Parts de calories ajustées aux créneaux réellement suivis. */
export async function habitShares(date = todayISO()) {
  const meals = await db.byDateRange('meals', addDays(date, -14), addDays(date, -1));
  return adaptedShares(skipRates(meals, date));
}

/** Options pour un créneau : plats habituels d'abord, puis favoris, assiettes types et estimations. */
export async function slotCandidates(slot, foods) {
  const habits = await habitsForSlot(slot, 4);
  const favs = (await db.getAll('favorites')).filter((f) => !f.slots || f.slots.includes(slot));
  const out = [];
  const seen = new Set();
  const push = (c) => { if (!seen.has(c.name)) { seen.add(c.name); out.push(c); } };
  for (const hb of habits) {
    push({ name: hb.name, kcal: hb.last.total.kcal, p: hb.last.total.p, items: hb.last.items, photoId: hb.last.photoId, habit: true });
    const k = 1.5, items = hb.last.items.map((i) => ({ ...i, label: `${i.label} ×1,5`, kcal: Math.round(i.kcal * k), p: Math.round(i.p * k * 10) / 10, g: Math.round((i.g || 0) * k * 10) / 10, l: Math.round((i.l || 0) * k * 10) / 10 }));
    push({ name: `${hb.name} ×1,5`, kcal: Math.round(hb.last.total.kcal * k), p: Math.round(hb.last.total.p * k), items, photoId: hb.last.photoId, habit: true });
  }
  for (const f of favs) push({ name: f.name, kcal: f.total.kcal, p: f.total.p, items: f.items, photoId: f.photoId, habit: false });
  const byName = (n) => foods.find((f) => f.name === n);
  for (const pl of PLATES.filter((x) => x.slots.includes(slot))) {
    for (const k of [1, 1.4]) {
      const items = pl.items.map(([n, g]) => { const f = byName(n); if (!f) return null; const q = g * k / 100; return { foodId: f.id, name: f.name, label: `${Math.round(g * k)} g`, grams: Math.round(g * k), kcal: Math.round(f.kcal * q), p: Math.round(f.p * q * 10) / 10, g: Math.round(f.g * q * 10) / 10, l: Math.round(f.l * q * 10) / 10 }; }).filter(Boolean);
      const t = _sum(items);
      push({ name: k === 1 ? pl.name : `${pl.name} (grosse)`, kcal: Math.round(t.kcal), p: Math.round(t.p), items });
    }
  }
  const main = _SLOTS.find((s) => s.id === slot)?.main;
  for (const q of main ? QUICK.repas : QUICK.collation) push({ name: q.label, kcal: q.kcal, p: q.p, items: [{ name: q.label, label: 'estimation', kcal: q.kcal, p: q.p, g: 0, l: 0 }] });
  return out;
}

/** Plan complet du jour : objectif, prises restantes avec cibles dynamiques, et suggestions. */
export async function dayPlan(date, foods, nowMin) {
  const [t, hs, day] = await Promise.all([todayTargets(date), habitShares(date), getDay(date)]);
  const eaten = {};
  for (const m of day.meals) { eaten[m.slot] = eaten[m.slot] || { kcal: 0, p: 0 }; eaten[m.slot].kcal += m.total.kcal; eaten[m.slot].p += m.total.p; }
  const plan = remainingPlan({ target: t, eaten, nowMin, shares: hs.shares });
  const cands = {};
  for (const s of plan) cands[s.id] = (await slotCandidates(s.id, foods)).slice(0, 8);
  // On limite la recherche : habitudes et 5 meilleures options proches de la cible du créneau
  for (const s of plan) cands[s.id] = cands[s.id].sort((a, b) => (b.habit - a.habit) || Math.abs(a.kcal - s.kcal) - Math.abs(b.kcal - s.kcal)).slice(0, 5);
  return { targets: t, plan, suggestions: suggestPlan(plan, cands), skipped: hs.skipped, day };
}
