// Progression autorégulée, volume par muscle et décharge. Voir SPEC D7-D9, RECHERCHE.md §4.
// Fonctions pures : l'historique est passé en argument.

/**
 * history : séances passées pour CET exercice, de la plus ancienne à la plus récente :
 *   [{ date, level, sets: [{ reps, rir }], fatigued }]  (seules les séries de travail ;
 *   fatigued = séance faite avec un score bas ou après une mauvaise nuit)
 * currentLevel : niveau actuel (index), ex : définition de l'exercice (avec levels[].min/max).
 * Retourne { level, targetReps, decision, message }.
 *   decision : 'debut' | 'monter' | 'descendre' | 'maintenir' | 'continuer' | 'varier' | 'plus_pres' | 'maintenir'
 */
export function nextTarget(ex, history, currentLevel = 0) {
  const lvl = ex.levels[currentLevel];
  const atLevel = history.filter((h) => h.level === currentLevel && h.sets.length);
  if (!atLevel.length) {
    return { level: currentLevel, targetReps: lvl.min + Math.round((lvl.max - lvl.min) / 3), decision: 'debut',
      message: `Premier essai à ce niveau : vise environ ${lvl.min + Math.round((lvl.max - lvl.min) / 3)}, en gardant 1 à 3 répétitions en réserve.` };
  }
  const last = atLevel[atLevel.length - 1];
  const reps = last.sets.map((s) => s.reps);
  const minReps = Math.min(...reps);
  const avgRir = last.sets.reduce((t, s) => t + (s.rir ?? 2), 0) / last.sets.length;

  // 1. Toutes les séries au sommet de la fourchette → niveau suivant.
  if (minReps >= lvl.max) {
    if (currentLevel + 1 < ex.levels.length) {
      const nl = ex.levels[currentLevel + 1];
      return { level: currentLevel + 1, targetReps: nl.min + 1, decision: 'monter',
        message: `Toutes tes séries ont atteint ${lvl.max} : passe à « ${nl.name} », vise ${nl.min + 1} répétitions.` };
    }
    return { level: currentLevel, targetReps: lvl.max, decision: 'varier',
      message: 'Dernier niveau atteint : ralentis la descente (3-4 s) ou ajoute une série. Du matériel (élastiques, barre) ouvrira la suite.' };
  }

  // 1 bis. Niveau trop difficile : meilleure série sous le bas de la fourchette → niveau précédent.
  if (Math.max(...reps) < lvl.min && currentLevel > 0) {
    const pl = ex.levels[currentLevel - 1];
    return { level: currentLevel - 1, targetReps: Math.round((pl.min + pl.max) / 2), decision: 'descendre',
      message: `Moins de ${lvl.min} répétitions : reviens à « ${pl.name} » le temps de construire la base.` };
  }

  // 2. Trop loin de l'échec → s'en rapprocher (Robinson 2024 : 0-3 RIR).
  if (avgRir >= 4) {
    return { level: currentLevel, targetReps: Math.min(lvl.max, Math.max(...reps) + 2), decision: 'plus_pres',
      message: 'Il te restait beaucoup de répétitions en réserve : va plus près de l\'échec (1 à 3 en réserve).' };
  }

  const tot = (h) => h.sets.reduce((t, s) => t + s.reps, 0);
  // 2 bis. Baisse lors d'une séance « fatiguée » (mauvaise nuit, score bas) → on garde la cible, sans conclure.
  if (last.fatigued && atLevel.length >= 2 && tot(last) < tot(atLevel[atLevel.length - 2])) {
    const prevBest = Math.max(...atLevel[atLevel.length - 2].sets.map((s) => s.reps));
    return { level: currentLevel, targetReps: prevBest, decision: 'maintenir',
      message: 'Baisse probablement liée à la fatigue (nuit ou score du jour) : on garde la même cible, rien d\'inquiétant.' };
  }

  // 3. Stagnation : pas de progrès du total sur les 3 dernières séances « normales » à ce niveau.
  const normal = atLevel.filter((h) => !h.fatigued);
  if (normal.length >= 3) {
    const [a, b, c] = normal.slice(-3).map(tot);
    if (c <= a && b <= a) {
      return { level: currentLevel, targetReps: Math.max(...reps), decision: 'varier',
        message: 'Pas de progrès depuis 3 séances : garde le niveau mais descends en 3 s (tempo lent), ou essaie la variante suivante sur 1 série.' };
    }
  }

  // 4. Sinon : +1 répétition sur la meilleure série.
  const target = Math.min(lvl.max, Math.max(...reps) + 1);
  return { level: currentLevel, targetReps: target, decision: 'continuer',
    message: `Vise ${target} répétitions par série (au moins une de plus que la dernière fois sur une série).` };
}

/**
 * Ajuste une séance selon la recommandation du jour.
 * allegee : −40 % de séries (au moins 1), 3 répétitions en réserve.
 */
export function adjustForReadiness(blocks, level) {
  if (level === 'allegee') return blocks.map((b) => ({ ...b, sets: Math.max(1, Math.round(b.sets * 0.6)), rirTarget: 3 }));
  return blocks.map((b) => ({ ...b, rirTarget: 2 }));
}

/**
 * Séries par muscle sur un ensemble de séances.
 * workouts : [{ exercises: [{ ex: id, sets: [{reps, rir}] }] }]
 * exById : (id) => définition. Direct = 1, indirect = 0,5.
 */
export function volumeByMuscle(workouts, exById) {
  const v = {};
  for (const w of workouts) for (const e of w.exercises || []) {
    const def = exById(e.ex); if (!def) continue;
    const n = (e.sets || []).length;
    for (const [m, f] of Object.entries(def.muscles)) v[m] = (v[m] || 0) + n * f;
  }
  return v;
}

/**
 * Ajustement de volume par muscle pour la semaine suivante (inspiré RP, preuve faible → petits pas).
 * fb : { pump: 1-3, soreness: 1-3 (1 aucune, 3 encore présentes à la séance suivante), pain: bool }
 * perf : 'hausse' | 'stable' | 'baisse'
 * Retourne un delta de séries (−2 … +2) et la raison.
 */
export function volumeDelta(fb, perf, currentSets, cap = 20) {
  if (!fb) return { delta: 0, reason: 'Pas de retour : volume maintenu.' };
  if (fb.pain) return { delta: -2, reason: 'Douleur articulaire signalée : −2 séries et vérifie la technique.' };
  if (fb.soreness >= 3 || perf === 'baisse') return { delta: -1, reason: 'Récupération insuffisante (courbatures encore présentes ou performance en baisse) : −1 série.' };
  if (fb.soreness === 1 && fb.pump <= 2 && perf !== 'baisse' && currentSets < cap) return { delta: +1, reason: 'Récupération rapide et stimulus modéré : +1 série.' };
  return { delta: 0, reason: 'Bonne réponse : volume maintenu.' };
}

/** Tendance de performance d'un exercice : compare le total de répétitions (à niveau égal) des 2 dernières séances. */
export function perfTrend(history) {
  if (history.length < 2) return 'stable';
  const [a, b] = history.slice(-2);
  const tot = (h) => h.sets.reduce((t, s) => t + s.reps, 0) + h.level * 100; // monter de niveau = hausse
  if (tot(b) > tot(a)) return 'hausse';
  if (tot(b) < tot(a) * 0.9) return 'baisse';
  return 'stable';
}

/**
 * Faut-il une décharge ? (SPEC D7 : sur fatigue, rappel après 8 semaines)
 * scores : scores des 7 derniers jours ; drops : nb de séances consécutives avec baisse sur ≥ 2 exercices ;
 * weeksSinceDeload : semaines depuis la dernière décharge.
 */
export function deloadAdvice({ scores = [], drops = 0, weeksSinceDeload = 0 }) {
  const low = scores.filter((s) => s != null && s < 50).length;
  if (low >= 4 || drops >= 2) return { needed: true, reason: low >= 4 ? `${low} jours sur 7 avec un score bas` : 'performance en baisse sur 2 séances de suite' };
  if (weeksSinceDeload >= 8) return { needed: false, suggest: true, reason: '8 semaines sans semaine légère : une décharge est possible, pas obligatoire.' };
  return { needed: false };
}
