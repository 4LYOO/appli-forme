// Génère SOURCES.md à partir de js/data/sources.js (source unique de vérité).
import { writeFileSync } from 'node:fs';
import { SOURCES, NIVEAUX } from '../js/data/sources.js';

let md = '# Sources des conseils\n\nFichier généré par `node tools/gen_sources.mjs` à partir de `js/data/sources.js` — ces textes sont ceux du bouton « Pourquoi ? » dans l\'appli. Détail et analyse : RECHERCHE.md.\n\n';
for (const [id, s] of Object.entries(SOURCES)) {
  md += `## ${s.title}\n*${NIVEAUX[s.niveau]}* · identifiant \`${id}\`\n\n${s.text}\n\n${s.refs.map((r) => `- ${r}`).join('\n')}\n\n`;
}
writeFileSync(new URL('../SOURCES.md', import.meta.url), md);
console.log(Object.keys(SOURCES).length, 'sources');
