export const conditions = { new: 'Uudenveroinen', good: 'Hyvä', fair: 'Käytön jälkiä', poor: 'Viallinen / korjattava' };
export const goals = { profit: 'Paras hinta', quick: 'Nopea kauppa', trade: 'Vaihtokauppa' };
export function money(value) {
  return new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}
export function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function median(values) {
  const sorted = [...values].sort((a,b) => a-b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
}
export function valueProduct(product, comparables = []) {
  const buy = product.buy === '' || product.buy == null ? null : Number(product.buy);
  const expenses = Number(product.expenses || 0);
  const fee = Number(product.fee || 0);
  if ((buy !== null && (!Number.isFinite(buy) || buy < 0)) || !Number.isFinite(expenses) || expenses < 0 || !Number.isFinite(fee) || fee < 0 || fee >= 100) throw new Error('Tarkista kulut. Palkkion on oltava alle 100 %.');
  const usable = comparables.filter(c => Number.isFinite(c.price) && c.price > 0 && c.price <= 1000000 && c.currency === 'EUR' && c.comparable === true);
  if (usable.length < 3) return { sufficient: false, comparables: usable, needed: 3 - usable.length, buy, expenses, fee };
  const typical = median(usable.map(c => c.price));
  // A transparent asking-price strategy, not a predicted transaction price.
  const ask = Math.max(1, Math.round(typical * (product.goal === 'quick' ? .9 : 1)));
  const net = ask * (1-fee/100) - expenses;
  return { sufficient: true, comparables: usable, typical, ask, low: Math.min(...usable.map(c=>c.price)), high: Math.max(...usable.map(c=>c.price)), net, profit: buy === null ? null : net-buy, buy, expenses, fee, breakEven: buy === null ? null : (buy+expenses)/(1-fee/100) };
}
export function draftListing(product, valuation) {
  return [product.name, '', `Kunto: ${conditions[product.condition] || product.condition}.`, product.details, product.location ? `Sijainti: ${product.location}.` : '', valuation.sufficient ? `Hintapyyntö: ${money(valuation.ask)}.` : '', product.goal === 'trade' ? `Myös vaihto kiinnostaa${product.tradeInterest ? ': '+product.tradeInterest : ''}.` : ''].filter(line => line !== undefined).join('\n').trim();
}
