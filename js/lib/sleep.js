// Lecture des notes du journal de sommeil (format texte « Nuit se terminant le JJ/MM/AAAA »).
// Une nuit par date ; plusieurs notes peuvent être collées d'un coup.

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

/** "22:25", "22h25", "7h", "07 h 05" → minutes depuis minuit */
export function parseClock(s) {
  const m = String(s).match(/(\d{1,2})\s*[:hH]\s*(\d{2})?/);
  if (!m) return null;
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

/** "20 min", "1 h", "1h30", "45" → minutes */
export function parseDuration(s) {
  const t = norm(String(s));
  if (/^(non|aucun|aucune|0)$/.test(t)) return 0;
  const hm = t.match(/(\d+)\s*h\s*(\d+)?/);
  if (hm) return +hm[1] * 60 + (hm[2] ? +hm[2] : 0);
  const m = t.match(/(\d+)/);
  return m ? +m[1] : null;
}

// Clé (texte normalisé de l'étiquette) → champ
const FIELDS = [
  [/^mise au lit/, 'bed', 'clock'],
  [/essaye de dormir|essaie de dormir|eteint/, 'tryAt', 'clock'],
  [/avant l'endormissement|endormissement/, 'latency', 'dur'],
  [/nombre de reveils/, 'awakenings', 'int'],
  [/duree totale.*reveils|duree des reveils/, 'waso', 'dur'],
  [/reveil definitif/, 'finalWake', 'clock'],
  [/heure de lever|lever/, 'outOfBed', 'clock'],
  [/sieste/, 'naps', 'text'],
  [/fond sonore/, 'noise', 'text'],
  [/conditions inhabituelles/, 'conditions', 'text'],
  [/donormyl|produit|medicament|somnifere/, 'medication', 'text'],
  [/impression generale/, 'impression', 'text'],
];

const IMPRESSION = [
  [/tres bonne|excellente/, 5], [/tres mauvaise|horrible|nulle/, 1], [/bonne/, 4], [/moyenne|correcte|bof/, 3], [/mauvaise/, 2],
];

/** Durée entre deux heures en minutes, en passant minuit si besoin. */
const span = (a, b) => (a == null || b == null ? null : (b - a + 1440) % 1440);

export function parseSleepNotes(text) {
  const blocks = String(text).split(/(?=nuit se terminant)/i).filter((b) => /nuit se terminant/i.test(b));
  const nights = [];
  for (const b of blocks) {
    const d = b.match(/nuit se terminant le\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/i);
    if (!d) continue;
    const y = d[3].length === 2 ? 2000 + +d[3] : +d[3];
    const date = `${y}-${String(d[2]).padStart(2, '0')}-${String(d[1]).padStart(2, '0')}`;
    const n = { date, raw: b.trim() };
    for (const line of b.split(/\n/)) {
      const m = line.replace(/^[\s*•\-–·]+/, '').match(/^([^:]+?)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = norm(m[1]), val = m[2].trim();
      const f = FIELDS.find(([re]) => re.test(key));
      if (!f || n[f[1]] !== undefined) continue;
      if (f[2] === 'clock') n[f[1]] = parseClock(val);
      else if (f[2] === 'dur') n[f[1]] = parseDuration(val);
      else if (f[2] === 'int') n[f[1]] = parseInt(val, 10) || 0;
      else n[f[1]] = val;
    }
    // Indicateurs classiques d'un agenda du sommeil (TCC-I)
    const start = n.tryAt ?? n.bed;
    const inBedSpan = span(start, n.finalWake);
    n.tst = inBedSpan == null ? null : Math.max(0, inBedSpan - (n.latency || 0) - (n.waso || 0)); // temps de sommeil total
    n.tib = span(n.bed ?? start, n.outOfBed ?? n.finalWake); // temps passé au lit
    n.efficiency = n.tst != null && n.tib ? Math.round((n.tst / n.tib) * 100) : null;
    n.medicationTaken = n.medication ? !/^(non|aucun|rien|0)\b/i.test(norm(n.medication)) : false;
    n.impressionScore = n.impression ? (IMPRESSION.find(([re]) => re.test(norm(n.impression)))?.[1] ?? null) : null;
    n.quality = quality(n);
    nights.push(n);
  }
  // Une nuit par date : la dernière collée l'emporte
  return [...new Map(nights.map((x) => [x.date, x])).values()];
}

/**
 * Qualité 1-5 pour le score du jour : l'impression générale d'abord,
 * corrigée si la nuit est courte (< 6 h) ou peu efficace (< 75 %).
 */
export function quality(n) {
  let q = n.impressionScore;
  if (q == null) {
    if (n.tst == null) return null;
    q = n.tst >= 450 ? 4 : n.tst >= 390 ? 3 : n.tst >= 300 ? 2 : 1;
  }
  if (n.tst != null && n.tst < 360) q -= 1;
  if (n.efficiency != null && n.efficiency < 75) q -= 1;
  return Math.max(1, Math.min(5, q));
}

export const fmtDuration = (min) => (min == null ? '–' : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`);
