import {cleanQuery,searchName,matchesModel,safeListingUrl} from '../src/market-data.js';
export function searchUrls(query,condition) {
  const tori=new URL('https://www.tori.fi/recommerce/forsale/search');
  tori.searchParams.set('q',query);tori.searchParams.set('trade_type','1');
  const huuto=status=>{const u=new URL('https://api.huuto.net/1.1/items');Object.entries({words:query,status,seller_type:'user',limit:'50',sort:'newest',sellstyle:status==='open'?'buy-now':'auction'}).forEach(([k,v])=>u.searchParams.set(k,v));return u;};
  return [tori,huuto('open'),huuto('closed')];
}
export function parseTori(html,query,condition) {
  const encoded=html.match(/<script[^>]*data-react-query-state[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if(!encoded)throw new Error('Torin hakusivun rakenne muuttui.');
  const state=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded.trim()),c=>c.charCodeAt(0))));
  const data=state.queries?.find(q=>Array.isArray(q.state?.data?.docs))?.state.data;
  if(!data)throw new Error('Torin hintatiedot puuttuvat.');
  const items=data.docs.slice(0,60).filter(d=>d.flags?.includes('private') && d.trade_type==='Myydään' && d.price?.currency_code==='EUR' && matchesModel(d.heading,query,condition)).map(d=>({id:`tori-${d.id}`,source:'Tori',title:String(d.heading).slice(0,200),url:safeListingUrl(d.canonical_url,'Tori'),price:Number(d.price.amount),type:'asking',condition:'Kuntoa ei vahvistettu. Tarkista alkuperäinen ilmoitus.',closedAt:null}));
  const paging=data.metadata?.paging;
  return {items:items.filter(validItem),scanned:data.docs.length,truncated:!!paging&&Number(paging.current)<Number(paging.last),nextPage:paging&&Number(paging.current)<Number(paging.last)?Number(paging.current)+1:null};
}
function validItem(i){return i.url&&Number.isFinite(i.price)&&i.price>0&&i.price<=1000000;}
export function parseHuuto(data,query,condition,status,now=Date.now()) {
  if(!Array.isArray(data.items))throw new Error('Huuto.netin hintatiedot puuttuvat.');
  const items=data.items.slice(0,50).filter(i=>{
    if(!matchesModel(i.title,query,condition))return false;
    if(status==='open')return i.saleMethod==='buy-now' && Date.parse(i.closingTime)>now;
    const age=now-Date.parse(i.closingTime);
    return i.saleMethod==='auction' && Number(i.bidderCount)>0 && (i.hasReservePrice===false || i.hasReservePriceExceeded===true) && Number.isFinite(age) && age>=0 && age<=90*86400000;
  }).map(i=>({id:`huuto-${i.id}`,source:'Huuto.net',title:String(i.title).slice(0,200),url:safeListingUrl(i.links?.alternative,'Huuto.net'),price:Number(status==='open'?i.buyNowPrice:i.currentPrice),type:status==='open'?'asking':'auction',condition:'Kuntoa ei vahvistettu. Tarkista alkuperäinen ilmoitus.',closedAt:status==='closed'?i.closingTime:null}));
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
  const searchedAs=searchName(query), urls=searchUrls(searchedAs,condition);
  const read=async(url,json=false)=>{
    const response=await fetcher(url,{signal:AbortSignal.timeout(7500),redirect:'manual',headers:{Accept:json?'application/json':'text/html','User-Agent':'Flipgain/1.0 (+https://latemake.github.io/flipgain/)'}});
    return limitedText(response);
  };
  const toriTask=async()=>{
    const variants=[searchedAs];
    if(/^kukirin g2 pro$/i.test(searchedAs))variants.push('g2pro','kugoo g2 pro');
    const pages=await Promise.allSettled(variants.map(async(name,index)=>{
      const url=searchUrls(name,condition)[0];
      const first=parseTori(await read(url),searchedAs,condition);
      if(index===0&&first.nextPage===2){
        const next=new URL(url);next.searchParams.set('page','2');
        try{const second=parseTori(await read(next),searchedAs,condition);return {...second,items:[...first.items,...second.items],scanned:first.scanned+second.scanned};}
        catch{return {...first,partial:true};}
      }
      return first;
    }));
    const good=pages.filter(p=>p.status==='fulfilled');
    if(!good.length)throw pages[0].reason;
    const unique=new Map(good.flatMap(p=>p.value.items).map(i=>[i.id,i]));
    return {items:[...unique.values()],scanned:good.reduce((n,p)=>n+p.value.scanned,0),truncated:good.some(p=>p.value.truncated),partial:good.length<pages.length||good.some(p=>p.value.partial)};
  };
  const results=await Promise.allSettled([toriTask(),...urls.slice(1).map(async(url,index)=>parseHuuto(JSON.parse(await read(url,true)),searchedAs,condition,index===0?'open':'closed',now))]);
  const names=['Tori','Huuto.net: pyyntihinnat','Huuto.net: huutokaupat'],seen=new Set(),items=[],sources=[];
  results.forEach((r,index)=>{
    const value=r.status==='fulfilled'?r.value:null;
    sources.push({name:names[index],status:value?(value.partial?'partial':'ok'):'error',error:value?null:String(r.reason?.message||'Hakuhäiriö').slice(0,180),count:value?.items.length||0,scanned:value?.scanned||0,truncated:!!value?.truncated});
    if(value)for(const item of value.items)if(!seen.has(item.id)){seen.add(item.id);items.push(item);}
  });
  return {query,searchedAs,condition,fetchedAt:new Date(now).toISOString(),items,sources};
}
