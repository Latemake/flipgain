import {fetchMarket} from './market.js';
import {cleanQuery,searchName} from '../src/market-data.js';
export default {
  async fetch(request,env={},ctx={waitUntil:()=>{}}) {
    const url=new URL(request.url),origin=request.headers.get('Origin');
    const allowed=(env.ALLOWED_ORIGINS||'https://latemake.github.io,http://localhost:5173,http://127.0.0.1:5173').split(',');
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
    if(origin && origin!==url.origin && !allowed.includes(origin))return Response.json({error:'Alkuperä ei ole sallittu.'},{status:403,headers});
    if(origin)headers['Access-Control-Allow-Origin']=origin;
    const reply=(body,status=200)=>Response.json(body,{status,headers});
    if(url.pathname==='/health')return reply({ok:true,ai:false});
    if(url.pathname!=='/api/market')return reply({error:'Ei löytynyt.'},404);
    if(request.method!=='GET')return reply({error:'Vain GET on sallittu.'},405);
    if([...url.searchParams.keys()].some(k=>!['q','condition'].includes(k)))return reply({error:'Tuntematon hakuehto.'},400);
    const query=cleanQuery(url.searchParams.get('q')),condition=url.searchParams.get('condition');
    if(query.length<3||query.length>140||searchName(query).split(' ').length<2||/[\u0000-\u001f<>]/.test(query)||!['new','good','fair','poor'].includes(condition))return reply({error:'Anna merkki ja tarkka malli sekä kunto.'},400);
    // Bounded requests to fixed marketplace hosts; never accept arbitrary URLs or credentials.
    const cache=globalThis.caches?.default;
    const cacheUrl=new URL('/cache/market-v2',url.origin);cacheUrl.searchParams.set('q',query.toLowerCase());cacheUrl.searchParams.set('condition',condition);
    const key=new Request(cacheUrl);
    try {
      const cached=await cache?.match(key);
      if(cached)return reply(await cached.json());
      const report=await fetchMarket(query,condition);
      if(report.sources.every(s=>s.status==='error'))return reply({error:'Hintalähteisiin ei saada yhteyttä. Yritä myöhemmin uudelleen.',sources:report.sources},503);
      if(cache && report.sources.every(s=>s.status==='ok'))ctx.waitUntil(cache.put(key,Response.json(report,{headers:{'Cache-Control':'public, max-age=900'}})));
      return reply(report);
    } catch {return reply({error:'Hintahaku epäonnistui. Yritä hetken kuluttua uudelleen.'},503);}
  }
};
