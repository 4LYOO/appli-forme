// Adaptation au jour le jour (v1.3) : rattrapage, répartition dynamique des prises, plan de fin de journée,
// créneaux souvent sautés, mini-séance construite sur les muscles en retard. Fonctions pures.
import { addDays } from './dates.js';
import { SLOTS } from './nutrition.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r10 = (x) => Math.round(x / 10) * 10;

/**
 * Rattrapage : c'est le bilan sur plusieurs jours qui fait le poids (Hall 2011). Si la veille est notée en entier
 * et en dessous de l'objectif de plus de 150 kcal, on reporte la moitié du manque, au plus +300 kcal.
 * Jamais de report négatif (IMC bas : on ne retire pas de calories après un gros jour).
 */
export function carryOver({ base, yesterday }) {
  if (!yesterday || !yesterday.complete) return { carry: 0, reason: null };
  const gap = base - yesterday.kcal;
  if (gap <= 150) return { carry: 0, reason: null };
  const carry = r10(clamp(gap * 0.5, 0, 300));
  return { carry, reason: `Hier : ${Math.round(yesterday.kcal)} kcal sur ${base} (${Math.round((yesterday.kcal / base) * 100)} %). La moitié du manque est reportée aujourd'hui.` };
}

/**
 * Fréquence à laquelle chaque créneau est sauté, sur les jours où au moins un repas a été noté (14 derniers jours).
 * Retourne { slotId: { rate, days } }.
 */
export function skipRates(meals, today, window = 14) {
  const from = addDays(today, -window), to = addDays(today, -1);
  const byDate = new Map();
  for (const m of meals) if (m.date >= from && m.date <= to) { if (!byDate.has(m.date)) byDate.set(m.date, new Set()); byDate.get(m.date).add(m.slot); }
  const days = byDate.size;
  const out = {};
  for (const s of SLOTS) {
    let missed = 0;
    for (const set of byDate.values()) if (!set.has(s.id)) missed++;
    out[s.id] = { rate: days ? missed / days : 0, days };
  }
  return out;
}

/**
 * Parts de calories ajustées aux habitudes : un créneau sauté plus de 60 % du temps (sur ≥ 7 jours) ne garde que
 * la moitié de sa part ; le reste est réparti sur les autres. Les protéines du soir (coucher) ne bougent pas.
 */
export function adaptedShares(rates) {
  const sh = {};
  let moved = 0;
  const skipped = [];
  for (const s of SLOTS) {
    const r = rates?.[s.id];
    if (r && r.days >= 7 && r.rate > 0.6 && !s.main) { sh[s.id] = s.share * 0.5; moved += s.share * 0.5; skipped.push(s.id); }
    else sh[s.id] = s.share;
  }
  const keep = SLOTS.filter((s) => !skipped.includes(s.id));
  const tot = keep.reduce((t, s) => t + s.share, 0);
  for (const s of keep) sh[s.id] += moved * (s.share / tot);
  return { shares: sh, skipped };
}

const minutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

/**
 * Répartition dynamique : ce qui reste à manger aujourd'hui est réparti sur les prises restantes, au prorata de leurs parts.
 * Un repas principal non noté reste « à faire » tant que l'heure du repas principal suivant n'est pas passée
 * (souvent : mangé mais pas encore noté) ; une collation, pendant 2 h 30 après son heure.
 * eaten : { slotId: { kcal, p } }   Retourne [{ id, kcal, p }] pour les prises restantes.
 */
export function remainingPlan({ target, eaten, nowMin, shares }) {
  const done = new Set(Object.keys(eaten).filter((k) => eaten[k].kcal > 0));
  const totK = Object.values(eaten).reduce((t, e) => t + e.kcal, 0);
  const totP = Object.values(eaten).reduce((t, e) => t + e.p, 0);
  const mains = SLOTS.filter((s) => s.main);
  const pending = (s) => {
    if (!s.main) return nowMin - minutes(s.time) <= 150;
    const next = mains[mains.indexOf(s) + 1];
    return !next || nowMin < minutes(next.time);
  };
  const left = SLOTS.filter((s) => !done.has(s.id) && pending(s));
  const leftK = Math.max(0, target.kcal - totK), leftP = Math.max(0, target.protein - totP);
  const sp = left.reduce((t, s) => t + s.pshare, 0);
  // Répartition au prorata, mais aucune prise au-delà d'un volume réaliste (SLOT_MAX) : le surplus passe sur les
  // autres prises restantes ; ce qui ne rentre nulle part est rendu dans `overflow` (à boire : lait, smoothie).
  const kc = {};
  let rest = leftK, open = [...left];
  while (rest > 1 && open.length) {
    const sk = open.reduce((t, s) => t + (shares?.[s.id] ?? s.share), 0);
    const capped = [];
    let used = 0;
    for (const s of open) {
      const want = (rest * (shares?.[s.id] ?? s.share)) / sk;
      const room = SLOT_MAX[s.id] - (kc[s.id] || 0);
      const give = Math.min(want, room);
      kc[s.id] = (kc[s.id] || 0) + give; used += give;
      if (give >= room - 0.5) capped.push(s.id);
    }
    rest -= used;
    if (!capped.length) break;
    open = open.filter((s) => !capped.includes(s.id));
  }
  const out = left.map((s) => ({ id: s.id, kcal: r10(kc[s.id] || 0), p: sp ? Math.round((leftP * s.pshare) / sp) : 0 }));
  out.overflow = rest > 1 ? r10(rest) : 0;
  return out;
}

/** Calories maximales réalistes par prise (au-delà, l'appétit ne suit pas et le repas est sauté ou laissé). */
export const SLOT_MAX = { petitdej: 900, c10: 550, midi: 1000, c16: 550, diner: 1000, coucher: 700 };

/**
 * Plan de fin de journée : pour chaque prise restante, choisit une option parmi les candidates (plats de
 * l'utilisateur d'abord) pour que le total colle au reste à manger (calories ET protéines).
 * candidates : { slotId: [{ name, kcal, p, items, habit }] }  (≤ 6 par créneau)
 */
export function suggestPlan(plan, candidates) {
  const slots = plan.filter((s) => (candidates[s.id] || []).length);
  if (!slots.length) return [];
  const goalK = plan.reduce((t, s) => t + s.kcal, 0), goalP = plan.reduce((t, s) => t + s.p, 0);
  let best = null;
  const pick = [];
  const cost = () => {
    const k = pick.reduce((t, c) => t + c.kcal, 0), p = pick.reduce((t, c) => t + c.p, 0);
    let c = Math.abs(k - goalK) / 100 + Math.max(0, goalP - p) / 8;
    for (let i = 0; i < pick.length; i++) c += Math.abs(pick[i].kcal - slots[i].kcal) / 400 - (pick[i].habit ? 1.5 : 0);
    return c;
  };
  (function rec(i) {
    if (i === slots.length) { const c = cost(); if (!best || c < best.c) best = { c, pick: [...pick] }; return; }
    for (const cand of candidates[slots[i].id].slice(0, 6)) { pick.push(cand); rec(i + 1); pick.pop(); }
  })(0);
  return slots.map((s, i) => ({ slot: s.id, target: s, option: best.pick[i] }));
}

/**
 * Mini-séance de semaine construite sur les muscles en retard : on compare le volume déjà fait cette semaine
 * aux cibles et on garde les 3 exercices qui comblent le plus de retard. Après un week-end sans séance,
 * 3 séries par exercice au lieu de 2.
 * pool : [{ ex, muscle }]  (exercice principal par muscle, selon le matériel)
 */
export function catchUpBlocks({ volume, targets, pool, weekendMissed = false }) {
  const deficit = (m) => (targets[m] || 0) - (volume[m] || 0);
  const ranked = [...pool].sort((a, b) => deficit(b.muscle) - deficit(a.muscle)).filter((x) => deficit(x.muscle) > 0).slice(0, 3);
  const chosen = ranked.length ? ranked : pool.slice(0, 3);
  return chosen.map((x, i) => ({ ex: x.ex, sets: weekendMissed ? 3 : 2, pair: 1, why: `${x.muscle} : ${Math.max(0, deficit(x.muscle)).toFixed(1).replace('.', ',').replace(',0', '')} séries de retard` }));
}
