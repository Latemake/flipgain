import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from './handler.js';
import {groundAnalysis,collectSources} from './analysis.js';

const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/k9sAAAAASUVORK5CYII=';
const product={photo,name:'Testimalli',condition:'good',details:'',goal:'trade',tradeInterest:'',location:'Helsinki',buy:'80',expenses:'5',fee:'0'};
const env={OPENAI_API_KEY:'test-only-not-a-real-key',ALLOWED_ORIGINS:'https://latemake.github.io'};
const request=(route,body,origin='https://latemake.github.io')=>new Request('http://localhost/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
test('unconfigured backend reports unavailable instead of a fake analysis',async()=>{
  const health=await handleRequest(new Request('http://localhost/api/health'),{env:{}});assert.equal((await health.json()).ready,false);
  const response=await handleRequest(request('analyze',{product}),{env:{}});assert.equal(response.status,503);
});
test('rejects foreign origins and invalid input before provider calls',async()=>{
  const fetchImpl=()=>{throw new Error('must not call provider');};
  assert.equal((await handleRequest(request('analyze',{product},'https://untrusted.example'),{env,fetchImpl})).status,403);
  for(const bad of [{...product,photo:'https://example.com/photo.jpg'},{...product,fee:100},{...product,location:''},{...product,buy:-2}])assert.equal((await handleRequest(request('analyze',{product:bad}),{env,fetchImpl})).status,400);
});
test('only evidence-linked listings survive grounding and duplicates are excluded',()=>{
  const item={title:'Model',price:100,url:'https://example.com/item/1',currency:'EUR',condition:'Hyvä',priceType:'asking',comparable:true};
  const result=groundAnalysis({summary:'',sellability:'',risks:[],comparables:[item,{...item,url:item.url+'?utm_source=search'},{...item,url:'https://made-up.example/item/2'}],trades:[{...item,url:'javascript:alert(1)'}]},[{url:item.url}], 'trade');
  assert.equal(result.comparables.length,1);assert.equal(result.trades.length,0);
});
test('reads native search sources and citation annotations',()=>{
  const sources=collectSources({output:[{type:'web_search_call',action:{sources:[{url:'https://example.com/one',title:'One'}]}},{type:'message',content:[{annotations:[{type:'url_citation',url:'https://example.com/two',title:'Two'}]}]}]});assert.equal(sources.length,2);
});
test('provider request uses image and web search with secrets confined to the server',async()=>{
  let sent;
  const analysis={summary:'Vertailutietoa ei löytynyt.',sellability:'Ei riittävää tietoa.',comparables:[],trades:[],risks:[]};
  const fetchImpl=async(url,options)=>{sent=JSON.parse(options.body);assert.equal(url,'https://api.openai.com/v1/responses');return Response.json({status:'completed',output:[{type:'web_search_call',action:{sources:[]}},{type:'message',content:[{type:'output_text',text:JSON.stringify(analysis)}]}]});};
  const response=await handleRequest(request('analyze',{product}),{env,fetchImpl});assert.equal(response.status,200);assert.equal(sent.store,false);assert.equal(sent.tools[0].type,'web_search');assert.equal(sent.input[0].content[1].image_url,photo);assert.equal(sent.text.format.strict,true);assert.ok(!(await response.text()).includes(env.OPENAI_API_KEY));
});
test('provider failures have useful errors and do not leak credentials',async()=>{
  const fetchImpl=async()=>new Response('private provider details',{status:401});
  const response=await handleRequest(request('identify',{photo}),{env,fetchImpl});assert.equal(response.status,502);assert.ok(!(await response.text()).includes('private provider details'));
});
