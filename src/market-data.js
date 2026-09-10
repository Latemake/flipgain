export const MARKET_TTL = 15 * 60 * 1000;
export const priceTypes = {asking:'Pyyntihinta', auction:'Päättyneen huutokaupan voittava tarjous'};
export const cleanQuery = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
export function searchName(value){
  let name=cleanQuery(value).replace(/\b(?:ku\s*kirin|kugoo\s*kirin)\b/ig,'Kukirin').replace(/\bg\s*2\s*[- ]?\s*pro\b/ig,'G2 Pro');
  if(/^g2 pro$/i.test(name))name='Kukirin G2 Pro';
  return name;
}
const words = value => cleanQuery(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(?:ku\s*kirin|kugoo\s*kirin|kugoo)\b/g,'kukirin').replace(/(\d)\s+(gb|tb)\b/g,'$1$2').replace(/g\s+(\d)/g,'g$1').replace(/(g\d)(pro|max|master|ultra)/g,'$1 $2').match(/[a-z0-9]+/g) || [];
// Conservative title matching; the user must still check condition and configuration.
export function matchesModel(title, query, condition) {
  const t = words(title), q = words(searchName(query));
  if(q.length < 2 || !q.every(w => t.includes(w))) return false;
  const variants = ['pro','max','mini','plus','ultra','master','lite','air'];
  if(variants.some(w=>t.includes(w) && !q.includes(w))) return false;
  if(t.some(w=>/^(?:g\d+|\d+(?:gb|tb)|20\d{2})$/.test(w) && q.some(v=>/^(?:g\d+|\d+(?:gb|tb)|20\d{2})$/.test(v) && v.replace(/\d+/g,'#')===w.replace(/\d+/g,'#')) && !q.includes(w))) return false;
  const parts = /^(?:varaos\w*|laturi\w*|latausport\w*|kontroller\w*|jarru\w*|rengas\w*|renkaa\w*|sisaren\w*|ulkoreng\w*|tayskumi\w*|tubeless|kumi|lokasuo\w*|etalokasuo\w*|etulokasuo\w*|takalokasuo\w*|naytto|nayton|suojakuor\w*|kuoret|kotelo|kaapel\w*|virtaluk\w*|kaasuvip\w*|kaasukahv\w*|painikepaneel\w*|ajovalo\w*|etuvalo\w*|penkki|istuin|akku|moottori|seisontatuki|taittomekanis\w*|lukitussalpa|pystyputki)$/;
  if(t.some(w=>parts.test(w) && !q.includes(w))) return false;
  if(t.some(w=>['ostetaan','halutaan','vuokrataan','paketti','kpl','myyty','varattu'].includes(w))) return false;
  const broken=t.some(w=>/^(rikki|viallinen|korjattava|varaosiksi|rikkinainen)$/.test(w)) || /\bei (toimi|kaynnisty|lataa)\b/.test(t.join(' '));
  if(condition!=='poor' && broken)return false;
  return true;
}
export function safeListingUrl(value, source) {
  try { const u=new URL(value); const valid=source==='Tori'?u.hostname==='www.tori.fi' && /^\/recommerce\/forsale\/item\/\d+$/.test(u.pathname):source==='Huuto.net' && u.hostname==='www.huuto.net' && /^\/kohteet\/(?:[^/]+\/)?\d+$/.test(u.pathname); return valid && ['https:','http:'].includes(u.protocol)?`https://${u.hostname}${u.pathname}`:null; } catch { return null; }
}
export function marketSummary(report, selected, now=Date.now()) {
  const age=now-Date.parse(report?.fetchedAt);
  if(!Number.isFinite(age)||age<0||age>MARKET_TTL)throw new Error('Hintahaku on vanhentunut. Hae hinnat uudelleen.');
  const ids=new Set(selected || []), seen=new Set();
  const items=(report.items||[]).filter(i=>ids.has(i.id)&&!seen.has(i.id)&&seen.add(i.id)&&safeListingUrl(i.url,i.source)&&Number.isFinite(i.price)&&i.price>0&&i.price<=1000000);
  const group=type=>{
    const rows=items.filter(i=>i.type===type), prices=rows.map(i=>i.price).sort((a,b)=>a-b), n=prices.length;
    return {count:n,median:n?(prices[Math.floor((n-1)/2)]+prices[Math.floor(n/2)])/2:null,low:n?prices[0]:null,high:n?prices[n-1]:null,items:rows};
  };
  const asking=group('asking'),auction=group('auction');
  // Prefer at least three auction outcomes. Never blend asks and winning bids.
  const basis=auction.count>=3?'auction':asking.count?'asking':'auction';
  const chosen=basis==='auction'?auction:asking;
  return {asking,auction,basis,...chosen};
}
