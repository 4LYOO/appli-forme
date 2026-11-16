// Open Food Facts (base collaborative et libre des produits emballés, très fournie en France).
// API publique sans clé : https://world.openfoodfacts.org/api/v2/product/{code}.json
// Fonctions pures de lecture des réponses (testées) + appels réseau minces.

export const OFF_FIELDS = 'code,product_name,product_name_fr,generic_name_fr,brands,quantity,serving_size,serving_quantity,product_quantity,nutriments,image_front_small_url';

const num = (x) => (x === undefined || x === null || x === '' || isNaN(+x) ? null : +x);

/** Convertit un produit OFF en aliment de l'appli (valeurs pour 100 g ou 100 ml) avec des portions simples. */
export function productToFood(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal == null && num(n['energy_100g']) != null) kcal = num(n['energy_100g']) / 4.184; // kJ → kcal
  if (kcal == null) return null;
  const name = (p.product_name_fr || p.product_name || p.generic_name_fr || 'Produit').trim();
  const brand = (p.brands || '').split(',')[0].trim() || null;
  const portions = [];
  const serving = num(p.serving_quantity);
  if (serving && serving > 0 && serving < 2000) portions.push({ label: `1 portion (${Math.round(serving)} g)`, g: serving });
  const pack = num(p.product_quantity);
  if (pack && pack > 0 && pack <= 1000 && pack !== serving) portions.push({ label: `Le paquet entier (${Math.round(pack)} g)`, g: pack });
  portions.push({ label: '100 g', g: 100 });
  return {
    id: `off-${p.code}`, code: String(p.code), cat: 'Mes produits', name: brand ? `${name} — ${brand}` : name, brand,
    kcal: Math.round(kcal), p: round1(num(n['proteins_100g']) ?? 0), g: round1(num(n['carbohydrates_100g']) ?? 0), l: round1(num(n['fat_100g']) ?? 0),
    portions, tags: ['produit'], source: 'Open Food Facts', image: p.image_front_small_url || null,
  };
}
const round1 = (x) => Math.round(x * 10) / 10;

export const isBarcode = (s) => /^\d{8}$|^\d{12,14}$/.test(String(s).trim());

export async function fetchProduct(code, fetchImpl = fetch) {
  const r = await fetchImpl(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`);
  if (!r.ok && r.status !== 404) throw new Error(`Open Food Facts indisponible (${r.status})`);
  const j = await r.json();
  if (j.status !== 1 && !j.product) return null;
  return productToFood(j.product);
}

/** Recherche par nom et marque (pour un produit reconnu sur la photo). */
export async function searchProducts(query, fetchImpl = fetch) {
  const u = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&lc=fr&cc=fr&fields=${OFF_FIELDS}`;
  const r = await fetchImpl(u);
  if (!r.ok) throw new Error(`Recherche Open Food Facts indisponible (${r.status})`);
  const j = await r.json();
  return (j.products || []).map(productToFood).filter(Boolean);
}
