// Looks up packaged food by barcode in the free Open Food Facts database.
export interface Per100 {
  name: string; calories: number; proteinG: number; carbsG: number; fatG: number;
  fiberG: number; sugarG: number; sodiumMg: number; servingG: number | null;
}

export async function lookupBarcode(code: string): Promise<Per100 | null> {
  const fields = 'product_name,brands,nutriments,serving_quantity';
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`, {
    headers: { 'User-Agent': 'VYBE-App/1.0 (Android)' },
  });
  if (!r.ok) return null;
  const j = await r.json();
  if (j.status !== 1 || !j.product) return null;
  const n = j.product.nutriments ?? {};
  const num = (v: any) => (typeof v === 'number' ? v : parseFloat(v)) || 0;
  const kcal = num(n['energy-kcal_100g']) || num(n['energy_100g']) / 4.184;
  if (!kcal) return null;
  return {
    name: [j.product.brands?.split(',')[0], j.product.product_name].filter(Boolean).join(' ') || 'Packaged food',
    calories: kcal, proteinG: num(n.proteins_100g), carbsG: num(n.carbohydrates_100g), fatG: num(n.fat_100g),
    fiberG: num(n.fiber_100g), sugarG: num(n.sugars_100g), sodiumMg: num(n.sodium_100g) * 1000,
    servingG: num(j.product.serving_quantity) || null,
  };
}
