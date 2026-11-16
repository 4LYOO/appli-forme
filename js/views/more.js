// Plus : profil, sauvegarde, rappels (Raccourcis iOS), historique des ajustements, sources, stockage.
import * as db from '../db.js';
import { h, mount, why, fmt, toast, sheet, showWhy, pickFile, confirmSheet } from '../ui.js';
import { todayISO, relativeDays, shortDate } from '../lib/dates.js';
import { SOURCES, NIVEAUX } from '../data/sources.js';
import { getProfile, getTargets, saveNights } from '../state.js';
import { parseSleepNotes, fmtDuration } from '../lib/sleep.js';
import { go, refresh, updateGlobalBanners, APP_VERSION } from '../main.js';

export async function render(root, params) {
  const [profile, targets, last, persist, adjustments, lastSleep, nights] = await Promise.all([getProfile(), getTargets(), db.kvGet('lastBackup'), db.ensurePersistence().catch(() => null), db.getAll('adjustments'), db.kvGet('lastSleepImport'), db.getAll('sleep')]);

  mount(root, 
    h('div.page-head', h('div', h('h1', 'Plus'))),
    h('div.section-title', 'Profil et objectifs'),
    h('div.list',
      h('button.list-item', { onclick: () => go('config') }, h('span.grow', 'Modifier mon profil', h('br'), h('span.small.muted', `${targets?.kcal} kcal · ${targets?.proteinPerKg} g/kg de protéines`)), h('span.chev', '›')),
      h('button.list-item', { onclick: () => adjustmentsSheet(adjustments) }, h('span.grow', 'Historique des ajustements', h('br'), h('span.small.muted', `${adjustments.length} changement${adjustments.length > 1 ? 's' : ''} daté${adjustments.length > 1 ? 's' : ''} et expliqué${adjustments.length > 1 ? 's' : ''}`)), h('span.chev', '›'))),

    h('div.section-title#sommeil', 'Sommeil'),
    h('div.list',
      h('button.list-item', { onclick: () => sleepImportSheet(() => refresh()) }, h('span.grow', 'Importer des nuits (coller la note)', h('br'),
        h('span.small.muted', lastSleep ? `Dernier import ${relativeDays(lastSleep.slice(0, 10))} · ${nights.length} nuit${nights.length > 1 ? 's' : ''}` : 'Aucune nuit importée')), h('span.chev', '›')),
      nights.length ? h('button.list-item', { onclick: () => nightsSheet(nights) }, h('span.grow', 'Mes nuits importées'), h('span.chev', '›')) : null),

    h('div.section-title#sauvegarde', 'Sauvegarde'),
    backupCard(last),

    h('div.section-title#rappels', 'Rappels'),
    h('div.list', h('button.list-item', { onclick: () => remindersSheet(profile) }, h('span.grow', 'Créer mes rappels avec Raccourcis', h('br'), h('span.small.muted', 'Guide pas à pas, 5 minutes')), h('span.chev', '›'))),

    h('div.section-title', 'Sources scientifiques'),
    h('div.list', h('button.list-item', { onclick: sourcesSheet }, h('span.grow', 'Toutes les sources et niveaux de preuve'), h('span.chev', '›'))),

    h('div.section-title', 'Stockage'),
    h('div.card.stack-sm',
      h('p', persist?.persisted ? '✓ Stockage persistant accordé : iOS ne doit pas effacer tes données.' : 'Stockage persistant non accordé : la sauvegarde hebdomadaire est d\'autant plus importante.'),
      persist?.usage?.usage != null ? h('p.small.muted', `Espace utilisé : ${(persist.usage.usage / 1e6).toFixed(1).replace('.', ',')} Mo`) : null,
      h('p.small.muted', 'Tes données restent uniquement sur cet iPhone, dans l\'appli installée (pas dans Safari).')),
    h('p.tiny.muted.center', { style: { marginTop: '24px' } }, `Forme v${APP_VERSION} `),
  );

  if (params.section) setTimeout(() => document.getElementById(params.section)?.scrollIntoView({ block: 'start' }), 50);
}

function backupCard(last) {
  let includePhotos = false;
  return h('div.card.stack',
    h('div.row.between', h('div', h('div.small.muted', 'Dernière sauvegarde'), h('div', { style: { fontWeight: 700, fontSize: '20px' } }, last ? `${shortDate(last.slice(0, 10))} (${relativeDays(last.slice(0, 10))})` : 'jamais')), why('sauvegarde')),
    h('label.row.small', h('input', { type: 'checkbox', style: { width: '20px', height: '20px', accentColor: 'var(--accent)' }, onchange: (e) => (includePhotos = e.target.checked) }), 'Inclure les photos (fichier plus lourd)'),
    h('button.btn.btn-primary', { onclick: () => exportBackup(includePhotos) }, 'Exporter une sauvegarde'),
    h('p.tiny.muted', 'Choisis « Enregistrer dans Fichiers » (iCloud Drive) dans la feuille de partage.'),
    h('button.btn', { onclick: importBackup }, 'Restaurer une sauvegarde…'));
}

async function exportBackup(includePhotos) {
  try {
    const data = await db.exportAll({ includePhotos });
    const name = `forme-sauvegarde-${todayISO()}.json`;
    const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
    let ok = false;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Sauvegarde Forme' }); ok = true; }
      catch (e) { if (e.name === 'AbortError') { toast('Sauvegarde annulée'); return; } throw e; }
    } else {
      const a = h('a', { href: URL.createObjectURL(file), download: name });
      document.body.append(a); a.click(); a.remove(); ok = true;
    }
    if (ok) {
      await db.kvSet('lastBackup', new Date().toISOString());
      toast(`Sauvegarde exportée (${(file.size / 1024).toFixed(0)} Ko)`);
      updateGlobalBanners(); refresh();
    }
  } catch (e) { toast(`Échec de l'export : ${e.message}`, { ms: 6000 }); }
}

async function importBackup() {
  const f = await pickFile('application/json,.json');
  if (!f) return;
  let obj;
  try { obj = JSON.parse(await f.text()); db.validateBackup(obj); }
  catch (e) { toast(`Fichier refusé : ${e.message}`, { ms: 6000 }); return; }
  const n = Object.values(obj.data).reduce((t, r) => t + r.length, 0);
  const ok = await confirmSheet('Restaurer cette sauvegarde ?', `Sauvegarde du ${new Date(obj.exportedAt).toLocaleString('fr-FR')} (${n} éléments). Toutes les données actuelles seront remplacées${obj.includePhotos ? '' : ' (tes photos actuelles sont conservées)'}. Conseil : exporte d'abord une sauvegarde de l'état actuel.`, 'Remplacer mes données', true);
  if (!ok) return;
  try { await db.importAll(obj); toast('Sauvegarde restaurée'); go('aujourdhui', {}, { replace: true }); } catch {}
}

function adjustmentsSheet(list) {
  const rows = [...list].sort((a, b) => b.ts - a.ts);
  sheet('Historique des ajustements', h('div',
    rows.length ? rows.map((a) => h('div.adj', h('div.date', `${shortDate(a.date)} · ${a.kind === 'programme' ? 'programme' : 'nutrition'}`), h('div', { style: { fontWeight: 600 } }, a.title), a.text ? h('p.small.muted', a.text) : null))
      : h('p.muted', 'Aucun ajustement pour l\'instant.')));
}

function sourcesSheet() {
  sheet('Sources', h('div.stack',
    h('p.small.muted', 'Chaque conseil de l\'appli renvoie à l\'une de ces fiches. Le détail est dans RECHERCHE.md du dépôt.'),
    h('div.list', Object.entries(SOURCES).map(([id, s]) => h('button.list-item', { onclick: () => showWhy(id) },
      h('span.grow', s.title), h(`span.badge.badge-${s.niveau}`, NIVEAUX[s.niveau]))))), { full: true });
}

function remindersSheet(profile) {
  const base = location.origin + location.pathname;
  const R = [
    ['06:00', 'Tous les jours', 'Pesée + questionnaire du matin', 'matin'],
    ['06:30', 'Tous les jours', 'Petit-déjeuner avant de partir', 'petitdej'],
    ['10:00', 'Lun-ven', 'Collation de 10h', 'collation'],
    ['16:00', 'Lun-ven', 'Collation de 16h', 'collation'],
    ['20:00', 'Tous les jours', 'Dîner', 'diner'],
    ['21:30', 'Tous les jours', 'Collation du soir (fromage blanc / skyr)', 'coucher'],
    [profile?.sessionTime || '10:00', 'Sam, dim', 'Séance du week-end', 'seance'],
    ['19:30', 'Dimanche', 'Sauvegarde de la semaine', 'sauvegarde'],
  ];
  sheet('Rappels avec Raccourcis', h('div.stack',
    h('p', 'En v1, les rappels passent par l\'app Raccourcis d\'Apple (déjà sur ton iPhone). Une notification apparaît à heure fixe.'),
    h('div.card.stack',
      [['Ouvre Raccourcis → onglet Automatisation → bouton +', ''],
        ['Choisis « Heure de la journée », règle l\'heure et les jours, puis « Exécuter immédiatement »', ''],
        ['Touche « Nouvelle automatisation vide », ajoute l\'action « Afficher la notification »', ''],
        ['Écris le texte du rappel (ex. « Collation de 16h »). Termine.', ''],
        ['Recommence pour chaque ligne du tableau.', '']].map(([t], i) => h('div.guide-step', h('span.n', String(i + 1)), h('span', t)))),
    h('p.small', h('strong', 'Important : '), 'une notification de Raccourcis, une fois touchée, ouvre Raccourcis, et un lien « Ouvrir l\'URL » s\'ouvre dans Safari, PAS dans l\'appli installée (et Safari n\'a pas tes données). Le plus simple : quand la notification arrive, ouvre l\'appli Forme depuis l\'écran d\'accueil. Elle affiche directement la prise du moment.'),
    h('table.reminders', h('thead', h('tr', h('th', 'Heure'), h('th', 'Jours'), h('th', 'Rappel'))),
      h('tbody', R.map(([t, d, l]) => h('tr', h('td.num', t.replace(':', 'h')), h('td', d), h('td', l))))),
    h('p.small.muted', 'Liens directs (utiles plus tard avec de vraies notifications) :'),
    h('div.stack-sm', [...new Set(R.map((r) => r[3]))].map((p) => h('div', h('code', `${base}?page=${p}`)))),
    h('p.small.muted', 'Plus tard : de vraies notifications Web Push qui ouvrent directement l\'appli (petit serveur gratuit), proposées quand la v1 sera stable.'),
    why(['intentions', 'heures_fixes'])), { full: true });
}

// ---------- Import du sommeil (note texte du journal) ----------
export function sleepImportSheet(after) {
  let parsed = [];
  const ta = h('textarea.input', { placeholder: 'Colle ici une ou plusieurs notes « Nuit se terminant le … »', oninput: () => preview() });
  const out = h('div');
  const btn = h('button.btn.btn-primary', { disabled: true }, 'Importer');
  function preview() {
    parsed = parseSleepNotes(ta.value);
    out.innerHTML = '';
    btn.disabled = !parsed.length;
    btn.textContent = parsed.length ? `Importer ${parsed.length} nuit${parsed.length > 1 ? 's' : ''}` : 'Importer';
    if (ta.value.trim() && !parsed.length) out.append(h('p.small.muted', 'Format non reconnu : la note doit commencer par « Nuit se terminant le JJ/MM/AAAA ».'));
    for (const n of parsed) out.append(h('div.list-item', h('span.grow', h('strong', shortDate(n.date)), h('br'),
      h('span.small.muted', `${fmtDuration(n.tst)} de sommeil · efficacité ${n.efficiency ?? '–'} % · ${n.impression || 'impression ?'}${n.medicationTaken ? ' · produit noté' : ''}`)), h('span.badge', `${n.quality ?? '–'}/5`)));
  }
  sheet('Importer mes nuits', (close) => {
    btn.onclick = async () => {
      try { await saveNights(parsed); close(); toast(`${parsed.length} nuit${parsed.length > 1 ? 's' : ''} importée${parsed.length > 1 ? 's' : ''}`); after?.(); } catch {}
    };
    return h('div.stack',
      h('p.small.muted', 'Dans ton journal : copie la note de la nuit, puis colle-la ici. Une nuit déjà importée est remplacée.'),
      navigator.clipboard?.readText ? h('button.btn', { onclick: async () => { try { ta.value = await navigator.clipboard.readText(); preview(); } catch { toast('Accès au presse-papiers refusé : colle à la main'); } } }, 'Coller depuis le presse-papiers') : null,
      ta, out, btn, why(['sommeil_muscle', 'tcci']));
  });
}

function nightsSheet(nights) {
  const rows = [...nights].sort((a, b) => (a.date < b.date ? 1 : -1));
  sheet('Mes nuits', h('div.list', rows.map((n) => h('div.list-item', h('span.grow', h('strong', shortDate(n.date)), h('br'),
    h('span.small.muted', `Au lit ${hhmm(n.bed)} → lever ${hhmm(n.outOfBed)} · sommeil ${fmtDuration(n.tst)} · efficacité ${n.efficiency ?? '–'} %${n.conditions && !/^non$/i.test(n.conditions) ? ` · ${n.conditions}` : ''}`)),
    h('span.badge', `${n.quality ?? '–'}/5`)))), { full: true });
}
const hhmm = (m) => (m == null ? '–' : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`);
