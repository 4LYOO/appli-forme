"""Remplace les valeurs provisoires de data/foods.json par celles de la table Ciqual officielle (ANSES).

Usage :
  1. Télécharger la table Ciqual (XLSX ou CSV) depuis https://ciqual.anses.fr/ (rubrique Téléchargement).
  2. python3 tools/ciqual_extract.py chemin/vers/Table_Ciqual.xlsx
  3. Relire docs/CIQUAL_CORRESPONDANCES.md (aliment de l'appli → aliment Ciqual retenu, score de confiance).

Chaque aliment de l'appli est rapproché de l'aliment Ciqual le plus proche (mots communs, mots « cuit/cru »).
Si aucune correspondance n'est assez sûre, la valeur provisoire est conservée et signalée.
"""
import csv, json, pathlib, re, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
STOP = {'de', 'du', 'des', 'la', 'le', 'les', 'et', 'a', 'au', 'aux', 'en', 'pour', 'type', 'avec', 'l', 'd'}
# Indices de recherche quand le nom de l'appli est trop différent de celui de Ciqual
HINTS = {
  'emmental-fromage-rape': 'emmental', 'oeuf-dur-ou-a-la-coque': 'oeuf dur', 'oeufs-brouilles': 'oeuf brouille',
  'omelette-nature-avec-matiere-grasse': 'omelette nature', 'skyr-nature': 'skyr', 'fromage-blanc-3': 'fromage blanc nature 3',
  'fromage-blanc-0': 'fromage blanc nature 0', 'boisson-au-soja': 'boisson soja nature', 'proteine-en-poudre-whey': 'proteine lactoserum poudre',
  'legumes-varies-cuits': 'legumes cuits melange', 'riz-cru-pour-les-preparations': 'riz blanc cru', 'pates-seches-pour-les-preparations': 'pates seches crues',
  'lentilles-seches-pour-les-preparations': 'lentille verte seche', 'pois-chiches-en-boite-egouttes': 'pois chiche appertise egoutte',
  'haricots-rouges-en-boite-egouttes': 'haricot rouge appertise egoutte', 'biscuits-secs-type-petit-beurre': 'petit beurre',
  'pate-a-tartiner-chocolat-noisette': 'pate a tartiner chocolat noisette', 'chocolat-noir-70': 'chocolat noir 70',
}

def norm(s):
  s = unicodedata.normalize('NFD', str(s).lower())
  s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('œ', 'oe')
  return re.sub(r'[^a-z0-9 ]+', ' ', s)

def toks(s):
  return [w.rstrip('s') for w in norm(s).split() if w not in STOP and len(w) > 1]

def num(v):
  if v is None: return None
  s = str(v).strip().replace(',', '.')
  if s in ('', '-', 'traces'): return 0.0 if s == 'traces' else None
  s = s.lstrip('<').strip()
  try: return float(s)
  except ValueError: return None

def read_table(path):
  p = pathlib.Path(path)
  if p.suffix.lower() in ('.xlsx', '.xlsm'):
    import openpyxl
    ws = openpyxl.load_workbook(p, read_only=True, data_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    head, data = [str(h or '') for h in rows[0]], rows[1:]
  else:
    raw = p.read_bytes().decode('utf-8', errors='replace')
    dialect = csv.Sniffer().sniff(raw[:5000], delimiters=';,\t')
    rows = list(csv.reader(raw.splitlines(), dialect))
    head, data = rows[0], rows[1:]
  col = lambda *keys: next(i for i, h in enumerate(head) if all(k in norm(h) for k in keys))
  c_name = col('alim', 'nom', 'fr')
  c_kcal = col('energie', 'kcal')
  c_p = col('proteines')
  c_g = col('glucides')
  c_l = col('lipides')
  out = []
  for r in data:
    if not r or not r[c_name]: continue
    out.append({'name': str(r[c_name]), 'kcal': num(r[c_kcal]), 'p': num(r[c_p]), 'g': num(r[c_g]), 'l': num(r[c_l])})
  return out

def best_match(food, table):
  query = toks(HINTS.get(food['id']) or re.sub(r'\(.*?\)', '', food['name']))
  q = set(query)
  best, score = None, 0.0
  for row in table:
    if row['kcal'] is None: continue
    t = set(toks(row['name']))
    inter = len(q & t)
    if not inter: continue
    s = inter / len(q) - 0.04 * len(t - q)  # couvre la requête, pénalise les mots en trop
    if 'cuit' in q and 'cru' in t: s -= 0.5
    if 'cru' in q and 'cuit' in t: s -= 0.5
    if s > score: best, score = row, s
  return best, score

def main(path):
  table = read_table(path)
  foods_path = ROOT / 'data' / 'foods.json'
  data = json.loads(foods_path.read_text())
  lines = ['# Correspondances avec la table Ciqual', '', f'Source : {pathlib.Path(path).name} — {len(table)} aliments lus.', '',
           '| Aliment de l\'appli | Aliment Ciqual retenu | Confiance | kcal avant → après |', '|---|---|---|---|']
  updated = kept = 0
  for f in data['foods']:
    row, score = best_match(f, table)
    if row and score >= 0.75:
      before = f['kcal']
      f.update({'kcal': round(row['kcal']), 'p': round(row['p'] or 0, 1), 'g': round(row['g'] or 0, 1), 'l': round(row['l'] or 0, 1), 'ciqual': row['name']})
      updated += 1
      lines.append(f"| {f['name']} | {row['name']} | {score:.2f} | {before} → {f['kcal']} |")
    else:
      kept += 1
      lines.append(f"| {f['name']} | **non remplacé** ({row['name'] if row else 'aucun'}) | {score:.2f} | {f['kcal']} (provisoire) |")
  data['source'] = f'Table Ciqual (ANSES) pour {updated} aliments ; {kept} valeurs provisoires conservées (voir docs/CIQUAL_CORRESPONDANCES.md).'
  data['provisional'] = kept > 0
  foods_path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
  (ROOT / 'docs' / 'CIQUAL_CORRESPONDANCES.md').write_text('\n'.join(lines) + '\n')
  print(f'{updated} aliments mis à jour, {kept} conservés.')

if __name__ == '__main__':
  if len(sys.argv) != 2: sys.exit(__doc__)
  main(sys.argv[1])
