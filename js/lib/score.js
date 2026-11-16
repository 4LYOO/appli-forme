// Score du jour et recommandation de séance. Voir SPEC D6 et RECHERCHE.md §5.
// Pondérations = choix de conception (preuve faible), affichés tels quels dans « Pourquoi ? ».

export const WEIGHTS = { sleep: 0.35, energy: 0.2, soreness: 0.15, stress: 0.15, motivation: 0.15 };
const INVERTED = new Set(['soreness', 'stress']); // 5 = beaucoup de courbatures / de stress

export const QUESTIONS = [
  { id: 'sleep', label: 'Ta nuit', low: 'Très mauvaise', high: 'Excellente' },
  { id: 'energy', label: 'Énergie', low: 'À plat', high: 'En forme' },
  { id: 'soreness', label: 'Courbatures', low: 'Aucune', high: 'Fortes' },
  { id: 'stress', label: 'Stress', low: 'Serein', high: 'Très stressé' },
  { id: 'motivation', label: 'Motivation', low: 'Nulle', high: 'Au top' },
];

/**
 * Score 0-100. Chaque réponse 1-5 est ramenée à 0-1 (inversée pour courbatures et stress).
 * Une réponse manquante est ignorée et les poids sont renormalisés.
 * sleepImported (1-5, issue de l'import CSV en phase 2) remplace la réponse « nuit » si présente.
 */
export function computeScore(answers, sleepImported = null) {
  const a = { ...answers };
  if (sleepImported != null) a.sleep = sleepImported;
  let tot = 0, wsum = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    const v = a[k];
    if (v == null) continue;
    let x = (Math.min(5, Math.max(1, v)) - 1) / 4;
    if (INVERTED.has(k)) x = 1 - x;
    tot += w * x; wsum += w;
  }
  if (!wsum) return null;
  return Math.round((tot / wsum) * 100);
}

export const LEVELS = {
  complete: { label: 'Séance complète', short: 'Complète' },
  allegee: { label: 'Séance allégée', short: 'Allégée' },
  mini: { label: 'Mini-séance (facultative)', short: 'Mini' },
  mobilite: { label: 'Mobilité 10 min', short: 'Mobilité' },
  repos: { label: 'Repos', short: 'Repos' },
};

/**
 * Recommandation selon le score et le jour.
 * Week-end : ≥ 70 complète, 50-69 allégée, 35-49 mobilité, < 35 repos.
 * Semaine : ≥ 65 mini-séance facultative, 40-64 mobilité, < 40 repos.
 * Garde-fou sommeil : nuit à 1/5 → jamais « complète » (Lamon 2021 : récupération réduite).
 */
export function recommend(score, { weekend, sleep = null, trainedYesterday = false } = {}) {
  if (score == null) return null;
  let level;
  if (weekend) {
    level = score >= 70 ? 'complete' : score >= 50 ? 'allegee' : score >= 35 ? 'mobilite' : 'repos';
    if (level === 'complete' && sleep === 1) level = 'allegee';
  } else {
    level = score >= 65 ? 'mini' : score >= 40 ? 'mobilite' : 'repos';
    if (level === 'mini' && (sleep === 1 || trainedYesterday)) level = 'mobilite';
  }
  const reasons = [];
  if (sleep != null && sleep <= 2) reasons.push('nuit difficile');
  if (score >= 70) reasons.push('bons signaux de récupération');
  else if (score < 50) reasons.push('récupération incomplète');
  return { level, ...LEVELS[level], reasons };
}
