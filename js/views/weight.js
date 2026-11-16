// Poids : pesée du matin, courbe (pesées + tendance), moyenne 7 jours, rythme hebdomadaire.
import * as db from '../db.js';
import { h, mount, why, fmt, toast, confirmSheet } from '../ui.js';
import { todayISO, addDays, diffDays, shortDate } from '../lib/dates.js';
import { trendSeries, movingAverage7, weeklyRate, rateStatus } from '../lib/weight.js';
import { targetGainRange } from '../lib/nutrition.js';
import { refresh } from '../main.js';

let range = 30;

export async function render(root, params) {
  const today = todayISO();
  const entries = (await db.getAll('weights')).sort((a, b) => (a.date < b.date ? -1 : 1));
  const series = trendSeries(entries);
  const last = series.at(-1);
  const ma = movingAverage7(entries, today);
  const r = weeklyRate(entries, today, 14);
  const status = rateStatus(r.ok ? r.rate : null, last?.trend);
  const todayEntry = entries.find((e) => e.date === today);
  const goal = targetGainRange(last?.trend ?? 58);

  let kg = todayEntry?.kg ?? '';
  const input = h('input.input.input-big', { type: 'number', inputmode: 'decimal', step: '0.1', placeholder: last ? fmt.kg(last.kg) : '58,0', value: kg,
    oninput: (e) => (kg = parseFloat(e.target.value.replace(',', '.'))) });
  async function save() {
    if (!(kg > 25 && kg < 250)) { toast('Poids invalide'); return; }
    try { await db.put('weights', { date: today, kg: Math.round(kg * 10) / 10, ts: Date.now() }); toast('Pesée enregistrée'); refresh(); } catch {}
  }

  mount(root, 
    h('div.page-head', h('div', h('h1', 'Poids'), h('div.sub', 'Pèse-toi au réveil, après les toilettes'))),
    h('div.card#saisie', h('div.card-head', h('h2', todayEntry ? 'Pesée du jour ✓' : 'Pesée du jour')), input,
      h('div', { style: { marginTop: '10px' } }, h('button.btn.btn-primary', { onclick: save }, todayEntry ? 'Corriger' : 'Enregistrer'))),
  );

  if (!entries.length) {
    mount(root, h('div.card', h('p.muted', 'Ta courbe apparaîtra après quelques pesées. Une pesée par jour est idéale, mais 4-5 par semaine suffisent.')));
    return;
  }

  mount(root, 
    h('div.card',
      h('div.kpis',
        h('div.kpi', h('div.label', 'Tendance'), h('div.value', fmt.kg(last.trend), h('span.unit', 'kg'))),
        h('div.kpi', h('div.label', 'Moyenne 7 jours'), h('div.value', ma ? fmt.kg(ma) : '–', h('span.unit', 'kg'))),
        h('div.kpi', h('div.label', 'Rythme (14 j)'), h('div.value', r.ok ? fmt.signed(r.rate, 2) : '–', h('span.unit', 'kg/sem'))),
        h('div.kpi', h('div.label', 'Statut'), h('div', { style: { fontWeight: 700, marginTop: '4px' } }, status.label))),
      h('p.small.muted', { style: { marginTop: '10px' } }, `Cible : +${fmt.kg(goal.min, 2)} à +${fmt.kg(goal.max, 2)} kg par semaine (0,25-0,5 % du poids). ${r.ok ? `Calculé sur ${r.n} pesées.` : 'Il faut au moins 5 pesées sur 7 jours.'}`),
      h('div.row', why(['tendance', 'surplus']))),
    chartCard(series),
    h('div.section-title', 'Dernières pesées'),
    h('div.list', [...entries].reverse().slice(0, 14).map((e) => h('div.list-item',
      h('span.grow', shortDate(e.date)), h('strong.num', `${fmt.kg(e.kg)} kg`),
      h('button.icon-btn', { 'aria-label': `Supprimer la pesée du ${shortDate(e.date)}`, style: { width: '36px', height: '36px', fontSize: '18px' },
        onclick: async () => { if (await confirmSheet('Supprimer cette pesée ?', `${shortDate(e.date)} : ${fmt.kg(e.kg)} kg`, 'Supprimer', true)) { try { await db.del('weights', e.date); refresh(); } catch {} } } }, '×')))),
  );
  if (params.focus === 'saisie') setTimeout(() => input.focus(), 100);
}

function chartCard(series) {
  const wrap = h('div');
  const tip = h('div.chart-tip', ' ');
  const seg = h('div.seg', [[30, '1 mois'], [90, '3 mois'], [0, 'Tout']].map(([d, l]) =>
    h(`button${range === d ? '.on' : ''}`, { onclick: (e) => { range = d; seg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.target.classList.add('on'); draw(); } }, l)));

  function draw() {
    wrap.innerHTML = '';
    const end = todayISO();
    const start = range ? addDays(end, -(range - 1)) : series[0].date;
    const pts = series.filter((p) => p.date >= start);
    if (pts.length < 2) { wrap.append(h('p.small.muted', { style: { padding: '40px 0', textAlign: 'center' } }, 'Pas encore assez de pesées sur cette période.')); return; }
    const W = 360, H = 220, L = 36, R = 8, T = 10, B = 24;
    const days = Math.max(1, diffDays(start, end));
    const vals = pts.flatMap((p) => [p.kg, p.trend]);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = Math.max(0.3, (hi - lo) * 0.15); lo -= pad; hi += pad;
    const x = (d) => L + (diffDays(start, d) / days) * (W - L - R);
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const step = (hi - lo) > 4 ? 1 : 0.5;
    let grid = '';
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(step < 1 ? 1 : 0).replace('.', ',')}</text>`;
    const ticks = [start, addDays(start, Math.round(days / 2)), end].map((d, i) => `<text x="${x(d)}" y="${H - 6}" text-anchor="${['start', 'middle', 'end'][i]}">${shortDate(d)}</text>`).join('');
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.trend).toFixed(1)}`).join('');
    const dots = pts.map((p) => `<circle class="raw" cx="${x(p.date).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="3.5"/>`).join('');
    const svg = h('div', { html: `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe de poids : pesées et tendance">
      <g class="grid axis">${grid}</g><g class="axis">${ticks}</g>${dots}<path class="trend" d="${path}"/>
      <line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/><circle class="hl" r="5" fill="var(--accent)" stroke="#000" stroke-width="2" visibility="hidden"/></svg>` }).firstChild;
    const cross = svg.querySelector('.cross'), hl = svg.querySelector('.hl');
    const pick = (ev) => {
      const rect = svg.getBoundingClientRect();
      const cx = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left) * (W / rect.width);
      let best = pts[0];
      for (const p of pts) if (Math.abs(x(p.date) - cx) < Math.abs(x(best.date) - cx)) best = p;
      cross.setAttribute('x1', x(best.date)); cross.setAttribute('x2', x(best.date)); cross.setAttribute('visibility', 'visible');
      hl.setAttribute('cx', x(best.date)); hl.setAttribute('cy', y(best.trend)); hl.setAttribute('visibility', 'visible');
      tip.textContent = `${shortDate(best.date)} · pesée ${fmt.kg(best.kg)} kg · tendance ${fmt.kg(best.trend, 2)} kg`;
    };
    svg.addEventListener('pointerdown', pick); svg.addEventListener('pointermove', (e) => e.buttons && pick(e)); svg.addEventListener('touchmove', pick, { passive: true });
    wrap.append(svg);
  }
  draw();
  return h('div.card',
    h('div.card-head', h('h2', 'Courbe'), seg),
    wrap, tip,
    h('div.legend', h('span', h('i', { style: { background: '#6b6b70' } }), 'Pesées'), h('span', h('i', { style: { background: 'var(--accent)' } }), 'Tendance lissée')),
    h('p.tiny.muted', { style: { marginTop: '6px' } }, 'Touche la courbe pour voir une date.'));
}
