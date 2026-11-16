// Estimation adaptative de la dépense (bilan énergétique, Hall 2011) et diagnostic de stagnation.
// Utilisée par l'appli en phase 2 ; déjà testée sur données simulées (docs/SIMULATIONS.md).
import { addDays, diffDays } from './dates.js';
import { linreg } from './weight.js';
import { KCAL_PER_KG, round10 } from './nutrition.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/**
 * days : [{ date, kcal, complete }]   weights : [{ date, kg }]
 * prior : dépense de référence (formule au départ, puis estimation de la semaine précédente)
 * chained : true si prior est une estimation précédente → lissage supplémentaire (k = 0,6) contre le bruit.
 * Fenêtre glissante de 28 jours se terminant à endDate (moins de bruit que 21 j : ±60 kcal au lieu de ±100).
 * Retourne { tdee, observed, weight (0-1), confidence, nComplete, nWeigh, slopeKgWeek, meanIntake }.
 */
export function estimateTDEE({ days, weights, prior, endDate, window = 28, chained = false, kcalPerKg = KCAL_PER_KG }) {
  const from = addDays(endDate, -(window - 1));
  const d = days.filter((x) => x.date >= from && x.date <= endDate && x.complete && x.kcal > 0);
  const w = weights.filter((x) => x.date >= from && x.date <= endDate);
  const nComplete = d.length, nWeigh = w.length;
  const meanIntake = nComplete ? d.reduce((t, x) => t + x.kcal, 0) / nComplete : null;
  const reg = linreg(w.map((x) => [diffDays(from, x.date), x.kg]));
  const span = w.length ? diffDays(w[0].date < w[w.length - 1].date ? w[0].date : w[w.length - 1].date, endDate) : 0;

  let observed = null;
  if (meanIntake != null && reg && nWeigh >= 4 && span >= 10) observed = meanIntake - reg.slope * kcalPerKg;

  // Confiance : quantité de jours complets ET de pesées, plus régularité des pesées.
  const fIntake = clamp((nComplete - 8) / (18 - 8), 0, 1);
  const fWeigh = clamp((nWeigh - 5) / (14 - 5), 0, 1);
  const weight = observed == null ? 0 : fIntake * fWeigh;
  const k = chained ? 0.6 : 1;
  const tdee = observed == null ? prior : prior + k * weight * (observed - prior);
  const confidence = weight >= 0.75 ? 'bonne' : weight >= 0.4 ? 'moyenne' : weight > 0 ? 'faible' : 'aucune';
  return {
    tdee: Math.round(tdee), observed: observed == null ? null : Math.round(observed), weight: +weight.toFixed(2), confidence,
    nComplete, nWeigh, window, meanIntake: meanIntake == null ? null : Math.round(meanIntake),
    slopeKgWeek: reg ? +(reg.slope * 7).toFixed(3) : null,
  };
}

/**
 * Nouvel objectif calorique hebdomadaire = dépense estimée + surplus pour le rythme visé,
 * avec des pas limités (+250 / −150 kcal par semaine) pour rester digeste, et une zone morte de ±60 kcal
 * (on ne change pas l'objectif pour du bruit).
 */
export function weeklyTarget({ tdee, currentTarget, goalKgWeek = 0.3, confidence = 'bonne', kcalPerKg = KCAL_PER_KG }) {
  const ideal = tdee + (goalKgWeek * kcalPerKg) / 7;
  const diff = ideal - currentTarget;
  let step = Math.abs(diff) < 60 ? 0 : clamp(diff, -150, 250);
  // Asymétrie voulue (IMC bas, appétit faible) : on ne baisse l'objectif qu'avec une confiance « bonne ».
  if (step < 0 && confidence !== 'bonne') step = 0;
  return { ideal: round10(ideal), target: round10(currentTarget + step), change: round10(step) };
}

/**
 * Diagnostic de stagnation : UNE cause probable et UNE action (SPEC §3).
 * stats : { rate (kg/sem sur 14 j), weightKg, adherence (apport moyen / objectif, jours complets),
 *           missingDays (jours incomplets sur 14), sleepAvg (1-5 ou null), sessionsDone, sessionsPlanned }
 */
export function diagnose(stats) {
  const { rate, weightKg = 58, adherence, missingDays = 0, sleepAvg = null, sessionsDone = null, sessionsPlanned = null } = stats;
  if (rate == null) return { status: 'inconnu', message: 'Pas encore assez de pesées pour juger.' };
  const lo = 0.0025 * weightKg;
  if (rate > 0.5) return { status: 'trop_rapide', cause: 'surplus', action: 'Réduis d\'environ 150 kcal/j (par exemple une collation plus légère) et surveille ton tour de taille.' };
  if (rate >= lo) return { status: 'ok', message: 'Rythme dans la cible : on ne change rien.' };

  // Stagnation : on cherche dans l'ordre la cause la plus probable.
  if (missingDays >= 5) return { status: 'stagnation', cause: 'saisie', action: `${missingDays} jours incomplets sur 14 : l'estimation est fragile. Priorité : noter les 3 repas chaque jour, même approximativement, pendant 1 semaine.` };
  if (adherence != null && adherence < 0.93) return { status: 'stagnation', cause: 'apport', action: `Tes apports sont à ${Math.round(adherence * 100)} % de l'objectif. Plutôt que manger plus aux repas, ajoute une collation dense et facile (ex. smoothie lait-banane-avoine-beurre de cacahuète, ≈ 600 kcal).` };
  if (sleepAvg != null && sleepAvg <= 2.5) return { status: 'stagnation', cause: 'sommeil', action: 'Ton sommeil a été mauvais : il peut freiner récupération et appétit. Priorité cette semaine : heure de lever fixe et caféine coupée avant 14h. Apports maintenus.' };
  if (sessionsPlanned && sessionsDone != null && sessionsDone < sessionsPlanned * 0.5) return { status: 'stagnation', cause: 'seances', action: 'Peu de séances faites : la prise risque d\'être plus grasse que musculaire. Priorité : les 2 séances du week-end.' };
  return { status: 'stagnation', cause: 'depense', action: 'Tu manges ce qui est prévu mais le poids ne bouge pas : ta dépense est plus haute qu\'estimé. +150 à 200 kcal/j, de préférence en collation dense.' };
}
