export function calculate({ buy, sale, shipping, repairs, fee, condition, demand }) {
  const values = [buy, sale, shipping, repairs, fee].map(Number);
  if (values.some(v => !Number.isFinite(v) || v < 0) || values[4] > 100) throw new Error('Tarkista hinnat ja kulut. Välityspalkkion on oltava 0–100 %.');
  const [b, s, sh, r, f] = values;
  const costs = b + sh + r + s * f / 100;
  const profit = s - costs;
  return { sale: s, costs, profit, roi: costs > 0 ? profit / costs * 100 : null, breakEven: f < 100 ? (b + sh + r) / (1 - f / 100) : null, ease: demand === 'high' && condition !== 'poor' ? 'Hyvä' : demand === 'low' || condition === 'poor' ? 'Haastava' : 'Kohtalainen' };
}
