# Forme

Application web personnelle (PWA) de suivi nutrition, prise de masse et musculation au poids du corps, qui s'adapte aux données réelles de son utilisateur. 100 % locale (IndexedDB), hors ligne, sans framework ni étape de build.

- Cahier des charges et décisions : [SPEC.md](SPEC.md)
- Base scientifique et niveaux de preuve : [RECHERCHE.md](RECHERCHE.md) · textes du bouton « Pourquoi ? » : [SOURCES.md](SOURCES.md)
- Simulations des calculs sur 8 semaines : [docs/SIMULATIONS.md](docs/SIMULATIONS.md)

## Développement
- `node --test tests/*.test.js` : tests des calculs et de la structure (aucune dépendance).
- `node tools/simulate.mjs --write` : régénère docs/SIMULATIONS.md.
- `node tools/gen_sources.mjs` : régénère SOURCES.md depuis `js/data/sources.js`.
- `python3 tools/build_foods.py` : régénère `data/foods.json`.
- Tout nouveau fichier de l'appli doit être ajouté à la liste `ASSETS` de `sw.js` (un test le vérifie).

Déploiement : chaque push sur `main` lance les tests puis publie sur GitHub Pages (`.github/workflows/deploy.yml`).
