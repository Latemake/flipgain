import { photoSchema,productSchema } from './schemas.js';
import { analyzeProduct,identifyPhoto,ServiceError } from './analysis.js';

const MAX_BODY=3_100_000;
const hits=new Map();
let daily={day:'',count:0};
function limited(ip,env) {
  const now=Date.now(),day=new Date().toISOString().slice(0,10);
  for(const [key,item] of hits)if(item.until<now)hits.delete(key);
  if(daily.day!==day)daily={day,count:0};
  const entry=hits.get(ip)||{count:0,until:now+3600000};
  if(entry.count>=20||daily.count>=Number(env.ANALYSIS_DAILY_LIMIT||100))return true;
  entry.count++;daily.count++;hits.set(ip,entry);return false;
}
export async function handleRequest(request,{env=process.env,fetchImpl=fetch}={}) {
  const origin=request.headers.get('origin');
  const allowed=(env.ALLOWED_ORIGINS||'http://127.0.0.1:5173,http://localhost:5173,https://latemake.github.io').split(',').map(s=>s.trim());
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  const send=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowed.includes(origin))return send({error:'Tämä sivusto ei voi käyttää analyysipalvelua.'},403);
  if(origin){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type';}
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const route=new URL(request.url).pathname.replace(/\/$/,'');
  if(route==='/api/health'&&request.method==='GET')return send({ready:Boolean(env.OPENAI_API_KEY)});
  if(!['/api/identify','/api/analyze'].includes(route))return send({error:'Tuntematon toiminto.'},404);
  if(request.method!=='POST')return send({error:'Käytä POST-pyyntöä.'},405);
  if(!env.OPENAI_API_KEY)return send({error:'Automaattinen analyysi ei ole vielä käytössä. Voit lisätä vertailuilmoitusten hinnat itse.'},503);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return send({error:'Virheellinen tiedostomuoto.'},415);
  if(Number(request.headers.get('content-length')||0)>MAX_BODY)return send({error:'Kuva on liian suuri.'},413);
  let text='';
  try {
    const reader=request.body?.getReader();if(!reader)return send({error:'Tuotetiedot puuttuvat.'},400);
    let length=0;const decoder=new TextDecoder();
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BODY){await reader.cancel();return send({error:'Kuva on liian suuri.'},413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
  }catch{return send({error:'Tuotetietoja ei voitu lukea.'},400);}
  let data;try{data=JSON.parse(text);}catch{return send({error:'Tuotetiedot eivät ole kelvolliset.'},400);}
  const validation=route==='/api/identify'?photoSchema.safeParse(data?.photo):productSchema.safeParse(data?.product);
  if(!validation.success)return send({error:'Tarkista tuotekuva, nimi, kunto, paikkakunta ja kulut.'},400);
  // Only trust proxy IP headers when explicitly configured for the deployment platform.
  const ip=env.TRUST_PROXY==='true'?(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim():'shared';
  if(limited(ip,env))return send({error:'Analyysien käyttöraja on täynnä. Yritä myöhemmin uudelleen.'},429);
  try {return send(route==='/api/identify'?await identifyPhoto(validation.data,{env,fetchImpl}):await analyzeProduct(validation.data,{env,fetchImpl}));}
  catch(error){return send({error:error instanceof ServiceError?error.message:'Analyysi ei onnistunut. Yritä uudelleen tai lisää vertailuilmoitukset itse.'},error instanceof ServiceError?error.status:502);}
}
