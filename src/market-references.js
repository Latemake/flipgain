// Manually reviewed public asking-price references bundled with the static site.
// One listing is not a market valuation or proof of a completed sale.
export const references=[{
  id:'kukirin-g2-pro-2025-nettimoto-3422985',
  aliases:['kukiring2pro','kugoog2pro','kugookiring2pro','kukiring2pro2025','kugookukiring2pro'],
  model:'KuKirin G2 Pro',
  price:349,
  currency:'EUR',
  priceType:'asking',
  observedAt:'2026-09-09',
  validDays:30,
  country:'FI',
  year:2025,
  mileage:1659,
  conditions:['good','fair'],
  url:'https://www.nettimoto.com/kugoo/wish-01/3422985',
  title:'KuKirin G2 Pro, 2025 – Nettimoto',
  note:'Käytetty lauta, 1 659 km. Ilmoituksessa mainitaan kulumia, lommo sekä renkaiden ja jarrun huoltotarpeita. Moottori ja akku ilmoitettu toimiviksi.',
}];
export function modelKey(name){return String(name||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');}
export function findReference(product,now=Date.now()){
  return references.find(reference=>{
    const ageDays=(now-Date.parse(reference.observedAt+'T00:00:00Z'))/86400000;
    return reference.aliases.includes(modelKey(product.name))&&reference.conditions.includes(product.condition)&&['electronics','sports'].includes(product.category)&&ageDays>=0&&ageDays<=reference.validDays;
  })||null;
}
