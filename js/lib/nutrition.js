// Calculs nutritionnels purs (sans DOM). Voir RECHERCHE.md §1 et §2.

export const KCAL_PER_KG = 7700; // approximation demandée (Hall 2011 : valable à l'échelle de semaines)

export const ACTIVITY_LEVELS = [
  { id: 'sedentaire', factor: 1.2, label: 'Sédentaire', hint: 'Assis toute la journée, pas de sport' },
  { id: 'leger', factor: 1.375, label: 'Légèrement actif', hint: 'Un peu de marche, 1-2 séances/sem' },
  { id: 'modere', factor: 1.55, label: 'Modérément actif', hint: 'Beaucoup de marche (trajets) + 2-3 séances/sem' },
  { id: 'actif', factor: 1.725, label: 'Très actif', hint: 'Travail physique ou sport presque tous les jours' },
];

/** Métabolisme de base, Mifflin-St Jeor (1990). */
export function mifflin({ sex = 'H', weightKg, heightCm, age }) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'F' ? -161 : 5);
}

export const round10 = (x) => Math.round(x / 10) * 10;

/**
 * Dépense détaillée (plus précise que le seul facteur d'activité quand on connaît son activité réelle) :
 *  - métabolisme de base × 1,2 : base + digestion (≈ 10 %) + petits gestes du quotidien ;
 *  - énergie active de l'app Santé (pas, marche) : moyenne par jour ;
 *  - travail manuel physique, non compté par les pas (bras, port de charges, station debout) : ≈ 250 kcal par jour travaillé ;
 *  - séances : ≈ 250 kcal par séance de 45 min au poids du corps.
 * Valeurs moyennes par jour sur la semaine. Estimations (preuve faible) : l'adaptation recale ensuite sur tes données.
 */
export function maintenanceDetailed({ bmr, healthActive = 0, physicalJobDays = 0, sessionsPerWeek = 2, jobKcal = 250, sessionKcal = 250 }) {
  const parts = [
    { id: 'base', label: 'Métabolisme de base et digestion', kcal: Math.round(bmr * 1.2) },
    { id: 'pas', label: 'Marche et pas (app Santé)', kcal: Math.round(healthActive) },
    { id: 'travail', label: `Travail physique (${physicalJobDays} j/7)`, kcal: Math.round((jobKcal * physicalJobDays) / 7) },
    { id: 'seances', label: `Séances (${sessionsPerWeek}/sem)`, kcal: Math.round((sessionKcal * sessionsPerWeek) / 7) },
  ];
  return { total: parts.reduce((t, p) => t + p.kcal, 0), parts };
}

/**
 * Objectifs de départ.
 * Surplus = 15 % de la maintenance, borné à 300-500 kcal (SPEC D1).
 * Protéines = g/kg × poids (défaut 2,0 g/kg : haut de fourchette conseillé chez le végétarien).
 */
export function initialTargets({ sex, weightKg, heightCm, age, activity = 'modere', surplusPct = 0.15, proteinPerKg = 2.0, healthActive = null, physicalJobDays = 0, sessionsPerWeek = 2 }) {
  const bmr = mifflin({ sex, weightKg, heightCm, age });
  let factor = (ACTIVITY_LEVELS.find((a) => a.id === activity) || ACTIVITY_LEVELS[2]).factor;
  let maintenance = bmr * factor, detail = null;
  if (healthActive != null && healthActive > 0) {
    detail = maintenanceDetailed({ bmr, healthActive, physicalJobDays, sessionsPerWeek });
    maintenance = detail.total;
    factor = Math.round((maintenance / bmr) * 100) / 100;
  }
  const surplus = Math.min(500, Math.max(300, maintenance * surplusPct));
  return {
    bmr: Math.round(bmr),
    factor,
    maintenance: round10(maintenance),
    surplus: round10(surplus),
    kcal: round10(maintenance + surplus),
    proteinPerKg,
    protein: Math.round(proteinPerKg * weightKg),
    detail,
  };
}

/** Fourchette de prise visée, en kg/sem : 0,25-0,5 % du poids (Iraki 2019). */
export function targetGainRange(weightKg) {
  return { min: +(weightKg * 0.0025).toFixed(2), max: +(weightKg * 0.005).toFixed(2) };
}

// Créneaux de repas. share = part des calories, pshare = part des protéines.
// 4+ prises protéinées ≈ 0,4 g/kg, et 30-40 g au coucher (RECHERCHE.md §2).
export const SLOTS = [
  { id: 'petitdej', label: 'Petit-déjeuner', short: 'Petit-déj', time: '06:30', main: true, share: 0.2, pshare: 0.18 },
  { id: 'c10', label: 'Collation de 10h', short: '10h', time: '10:00', main: false, share: 0.1, pshare: 0.075 },
  { id: 'midi', label: 'Déjeuner', short: 'Midi', time: '12:30', main: true, share: 0.25, pshare: 0.2 },
  { id: 'c16', label: 'Collation de 16h', short: '16h', time: '16:00', main: false, share: 0.1, pshare: 0.075 },
  { id: 'diner', label: 'Dîner', short: 'Dîner', time: '20:00', main: true, share: 0.25, pshare: 0.2 },
  { id: 'coucher', label: 'Collation du soir', short: 'Soir', time: '21:30', main: false, share: 0.1, pshare: 0.27 },
];

export const slotById = (id) => SLOTS.find((s) => s.id === id);

export function slotTargets(targets, slotId) {
  const s = slotById(slotId);
  return { kcal: round10(targets.kcal * s.share), protein: Math.round(targets.protein * s.pshare) };
}

/** Macros d'un aliment (valeurs pour 100 g) pour une quantité en grammes. */
export function foodMacros(food, grams) {
  const f = grams / 100;
  return { kcal: food.kcal * f, p: food.p * f, g: food.g * f, l: food.l * f };
}

export function sumMacros(items) {
  const t = { kcal: 0, p: 0, g: 0, l: 0 };
  for (const it of items) {
    t.kcal += it.kcal || 0; t.p += it.p || 0; t.g += it.g || 0; t.l += it.l || 0;
  }
  return t;
}

export function scaleMacros(m, k) {
  return { kcal: m.kcal * k, p: m.p * k, g: (m.g || 0) * k, l: (m.l || 0) * k };
}

/** Totaux d'une journée à partir des entrées de repas. */
export function dayTotals(entries) {
  return sumMacros(entries.map((e) => e.total));
}

/**
 * Journée minimale (SPEC §4.7) : 3 repas principaux + au moins 1 collation + questionnaire du matin.
 */
export function minimumDay(entries, hasCheckin) {
  const done = new Set(entries.map((e) => e.slot));
  const mains = SLOTS.filter((s) => s.main).map((s) => ({ id: s.id, label: s.short, done: done.has(s.id) }));
  const snack = SLOTS.some((s) => !s.main && done.has(s.id));
  const items = [
    { id: 'checkin', label: 'Questionnaire', done: !!hasCheckin },
    ...mains,
    { id: 'collation', label: '1 collation', done: snack },
  ];
  return { items, met: items.every((i) => i.done), count: items.filter((i) => i.done).length, total: items.length };
}

/** Jour « complet » pour l'estimation de la dépense (SPEC D5). */
export function isCompleteDay(entries, markedComplete = false) {
  if (markedComplete) return true;
  const done = new Set(entries.map((e) => e.slot));
  return SLOTS.filter((s) => s.main).every((s) => done.has(s.id));
}

/**
 * Créneau à mettre en avant selon l'heure : le premier créneau non saisi dont l'heure
 * est passée depuis moins de 2 h, sinon le prochain à venir.
 */
export function currentSlot(minutes, doneSlots = new Set()) {
  const t = (s) => { const [h, m] = s.time.split(':').map(Number); return h * 60 + m; };
  const pending = SLOTS.filter((s) => !doneSlots.has(s.id));
  const recent = pending.filter((s) => t(s) <= minutes && minutes - t(s) <= 150);
  if (recent.length) return recent[recent.length - 1].id;
  const next = pending.find((s) => t(s) > minutes);
  return next ? next.id : (pending.length ? pending[pending.length - 1].id : null);
}
