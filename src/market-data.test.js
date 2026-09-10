import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesModel,marketSummary,MARKET_TTL} from './market-data.js';
import {estimate} from './valuation.js';
import {parseHuuto,parseTori,fetchMarket} from '../server/market.js';
import worker from '../server/worker.js';
const now=Date.parse('2026-09-09T19:00:00Z');
const row=(id,price,type='asking')=>({id:String(id),price,type,title:'Kukirin G2 Pro',source:type==='asking'?'Tori':'Huuto.net',url:type==='asking'?`https://www.tori.fi/recommerce/forsale/item/${id}`:`https://www.huuto.net/kohteet/test/${id}`});
const report=items=>({query:'Kukirin G2 Pro',condition:'fair',fetchedAt:new Date(now).toISOString(),items});
test('title matching rejects parts, other model versions and numeric collisions',()=>{
  assert.ok(matchesModel('KuKirin G2Pro sähköpotkulauta','kukirin g2 pro','fair'));
  for(const title of ['Kukirin G2 Max','Kukirin G3 Pro','Kukirin G2 Pro laturi','Latausportti Kukirin G2 Pro','Kukirin G2 Pro akku','Kukirin G2 Pro rikkinäinen','Kukirin G2 Pro 2 kpl'])assert.equal(matchesModel(title,'kukirin g2 pro','fair'),false,title);
  assert.equal(matchesModel('iPhone 13 Pro','iphone 13','good'),false);
  assert.equal(matchesModel('iPhone 13 256GB','iphone 13 128 gb','good'),false);
});
test('auction results require actual bids, ended time and met reserve',()=>{
  const base={id:1,title:'Kukirin G2 Pro',saleMethod:'auction',bidderCount:2,currentPrice:320,hasReservePrice:false,closingTime:'2026-09-08T12:00:00Z',links:{alternative:'https://www.huuto.net/kohteet/test/1'}};
  const parse=overrides=>parseHuuto({items:[{...base,...overrides}]},'kukirin g2 pro','fair','closed',now).items;
  assert.equal(parse({})[0].price,320);
  for(const changes of [{bidderCount:0},{hasReservePrice:true,hasReservePriceExceeded:false},{closingTime:'2026-09-10T00:00:00Z'},{closingTime:'2025-01-01T00:00:00Z'},{saleMethod:'buy-now'},{currentPrice:null},{hasReservePrice:undefined}])assert.equal(parse(changes).length,0);
});
test('median keeps asking and auction prices separate, prefers three auction outcomes',()=>{
  const items=[row(1,300),row(2,320),row(3,9000),row(4,250,'auction'),row(5,270,'auction')];
  let s=marketSummary(report(items),items.map(i=>i.id),now);assert.equal(s.basis,'asking');assert.equal(s.median,320);assert.equal(s.auction.median,260);
  items.push(row(6,260,'auction'));s=marketSummary(report(items),items.map(i=>i.id),now);assert.equal(s.basis,'auction');assert.equal(s.median,260);
  assert.equal(marketSummary(report(items),['1','2'],now).median,310);
  assert.throws(()=>marketSummary(report(items),['1'],now+MARKET_TTL+1),/vanhentunut/);
});
test('live valuation preserves market price, costs and requires current evidence and confirmation',()=>{
  const p={name:'Kukirin G2 Pro',condition:'fair',category:'electronics',goal:'profit',buy:'200',expenses:'10',fee:'5',priceBasis:'live',marketReport:report([row(1,320)]),marketSelected:['1'],liveConfirmed:'yes',age:'9'};
  const r=estimate(p,{now});assert.equal(r.ask,320);assert.equal(r.net,294);assert.equal(r.profit,94);
  assert.throws(()=>estimate({...p,liveConfirmed:''},{now}));assert.throws(()=>estimate({...p,name:'iPhone 13'},{now}));assert.throws(()=>estimate({...p,marketSelected:[]},{now}));
});
test('Tori parser excludes retailers and verifies selected condition filters',()=>{
  const doc={id:1,heading:'Kukirin G2 Pro',flags:['private'],trade_type:'Myydään',price:{amount:390,currency_code:'EUR'},canonical_url:'https://www.tori.fi/recommerce/forsale/item/1'};
  const data={docs:[doc,{...doc,id:2,flags:['retailer']},{...doc,id:3,heading:'Kukirin G2 Pro akku'}],filters:[{name:'condition',filter_items:['2','3','4'].map(value=>({value,selected:true}))}]};
  const html=()=>`<script type="application/json" data-react-query-state>${Buffer.from(JSON.stringify({queries:[{state:{data}}]})).toString('base64')}</script>`;
  assert.equal(parseTori(html(),'kukirin g2 pro','fair').items.length,1);
  data.filters=[];assert.throws(()=>parseTori(html(),'kukirin g2 pro','fair'),/kuntosuodatusta/);
  assert.throws(()=>parseTori('<html>blocked</html>','kukirin g2 pro','fair'));
});
test('partial source failures are explicit, no fake prices on failure',async()=>{
  const r=await fetchMarket('kukirin g2 pro','fair',{now,fetcher:async url=>{if(url.hostname==='www.tori.fi')throw Error('unavailable');return Response.json({items:[],totalCount:0});}});
  assert.deepEqual(r.items,[]);assert.equal(r.sources[0].status,'error');assert.equal(r.sources[1].status,'ok');
});
test('worker rejects arbitrary URLs, bad input, foreign origins and writes before fetching',async()=>{
  for(const [path,init,status] of [['/api/market?q=x&condition=good',{},400],['/api/market?q=iphone+13&condition=good&url=http://localhost',{},400],['/api/market?q=iphone+13&condition=good',{method:'POST'},405],['/api/market?q=iphone+13&condition=good',{headers:{Origin:'https://foreign.example'}},403]])assert.equal((await worker.fetch(new Request('https://worker.example'+path,init))).status,status);
});
