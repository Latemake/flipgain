import {cleanQuery,matchesModel,safeListingUrl} from '../src/market-data.js';
const toriConditions={new:['2'],good:['2','3','4'],fair:['2','3','4'],poor:['5']};
const huutoConditions={new:'like-new',good:'good',fair:'acceptable',poor:'weak'};
export function searchUrls(query,condition) {
  const tori=new URL('https://www.tori.fi/recommerce/forsale/search');
  tori.searchParams.set('q',query);tori.searchParams.set('trade_type','1');
  for(const value of toriConditions[condition])tori.searchParams.append('condition',value);
  const huuto=status=>{const u=new URL('https://api.huuto.net/1.1/items');Object.entries({words:query,status,condition:huutoConditions[condition],seller_type:'user',limit:'50',sort:'newest',sellstyle:status==='open'?'buy-now':'auction'}).forEach(([k,v])=>u.searchParams.set(k,v));return u;};
  return [tori,huuto('open'),huuto('closed')];
}
export function parseTori(html,query,condition) {
  const encoded=html.match(/<script[^>]*data-react-query-state[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if(!encoded)throw new Error('Torin hakusivun rakenne muuttui.');
  const state=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded.trim()),c=>c.charCodeAt(0))));
  const data=state.queries?.find(q=>Array.isArray(q.state?.data?.docs))?.state.data;
  if(!data)throw new Error('Torin hintatiedot puuttuvat.');
  const selected=data.filters?.find(f=>f.name==='condition')?.filter_items?.filter(f=>f.selected).map(f=>String(f.value));
  if(!selected || selected.length!==toriConditions[condition].length || !toriConditions[condition].every(v=>selected.includes(v)))throw new Error('Torin kuntosuodatusta ei voitu vahvistaa.');
  const items=data.docs.slice(0,60).filter(d=>d.flags?.includes('private') && d.trade_type==='Myydään' && d.price?.currency_code==='EUR' && matchesModel(d.heading,query,condition)).map(d=>({id:`tori-${d.id}`,source:'Tori',title:String(d.heading).slice(0,200),url:safeListingUrl(d.canonical_url,'Tori'),price:Number(d.price.amount),type:'asking',condition:['good','fair'].includes(condition)?'Kuin uusi–kohtalainen. Tarkista ilmoituksen kunto.':'Valittu kuntoluokka (hakusuodatin)',closedAt:null}));
  return {items:items.filter(validItem),scanned:data.docs.length,truncated:data.metadata?.is_end_of_paging===false || (data.metadata?.num_results||0)>data.docs.length};
}
function validItem(i){return i.url&&Number.isFinite(i.price)&&i.price>0&&i.price<=1000000;}
export function parseHuuto(data,query,condition,status,now=Date.now()) {
  if(!Array.isArray(data.items))throw new Error('Huuto.netin hintatiedot puuttuvat.');
  const items=data.items.slice(0,50).filter(i=>{
    if(!matchesModel(i.title,query,condition))return false;
    if(status==='open')return i.saleMethod==='buy-now' && Date.parse(i.closingTime)>now;
    const age=now-Date.parse(i.closingTime);
    return i.saleMethod==='auction' && Number(i.bidderCount)>0 && (i.hasReservePrice===false || i.hasReservePriceExceeded===true) && Number.isFinite(age) && age>=0 && age<=90*86400000;
  }).map(i=>({id:`huuto-${i.id}`,source:'Huuto.net',title:String(i.title).slice(0,200),url:safeListingUrl(i.links?.alternative,'Huuto.net'),price:Number(status==='open'?i.buyNowPrice:i.currentPrice),type:status==='open'?'asking':'auction',condition:'Valittu kuntoluokka (hakusuodatin)',closedAt:status==='closed'?i.closingTime:null}));
  return {items:items.filter(validItem),scanned:data.items.length,truncated:data.totalCount>data.items.length};
}
async function limitedText(response,max=2500000) {
  if(!response.ok)throw new Error(`Lähde vastasi ${response.status}.`);
  const reader=response.body.getReader(),chunks=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw new Error('Liian suuri vastaus.');}chunks.push(value);}
  const all=new Uint8Array(length);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(all);
}
export async function fetchMarket(query,condition,{fetcher=fetch,now=Date.now()}={}) {
  query=cleanQuery(query);
  const urls=searchUrls(query,condition), names=['Tori','Huuto.net: pyyntihinnat','Huuto.net: huutokaupat'];
  const results=await Promise.allSettled(urls.map(async(url,index)=>{
    const response=await fetcher(url,{signal:AbortSignal.timeout(12000),redirect:'manual',headers:{Accept:index?'application/json':'text/html','User-Agent':'Flipgain/1.0 (+https://latemake.github.io/flipgain/)'}});
    const text=await limitedText(response);return index?parseHuuto(JSON.parse(text),query,condition,index===1?'open':'closed',now):parseTori(text,query,condition);
  }));
  const seen=new Set(),items=[],sources=[];
  results.forEach((r,index)=>{sources.push({name:names[index],status:r.status==='fulfilled'?'ok':'error',error:r.status==='rejected'?String(r.reason?.message||'Hakuhäiriö').slice(0,180):null,count:r.status==='fulfilled'?r.value.items.length:0,scanned:r.status==='fulfilled'?r.value.scanned:0,truncated:r.status==='fulfilled'&&r.value.truncated});if(r.status==='fulfilled')for(const item of r.value.items)if(!seen.has(item.id)){seen.add(item.id);items.push(item);}});
  return {query,condition,fetchedAt:new Date(now).toISOString(),items,sources};
}
