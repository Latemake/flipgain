import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const browser=await chromium.launch();
const url=process.env.FLIPGAIN_TEST_URL||'http://127.0.0.1:5174/';
const server=process.env.FLIPGAIN_TEST_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'],{stdio:'ignore',windowsHide:true,env:{...process.env,VITE_MARKET_API:'https://market-test.invalid'}});
const next=p=>p.locator('#step-form button[type=submit]').click();
const fixture=()=>({query:'Kukirin G2 Pro',condition:'fair',fetchedAt:new Date().toISOString(),sources:[{name:'Tori',status:'ok',count:3},{name:'Huuto.net: huutokaupat',status:'ok',count:3}],items:[300,320,400,240,250,260].map((price,index)=>({id:String(index+1),source:index<3?'Tori':'Huuto.net',type:index<3?'asking':'auction',title:`Kukirin G2 Pro – testivertailu ${index+1}`,price,url:index<3?`https://www.tori.fi/recommerce/forsale/item/${index+1}`:`https://www.huuto.net/kohteet/test/${index+1}`,condition:'Testissä vastaava kunto',closedAt:null}))});
try {
  if(server){let ready=false;for(let i=0;i<40;i++){if(server.exitCode!==null)throw new Error('Testipalvelin ei käynnistynyt porttiin 5174.');try{ready=(await fetch(url)).ok;}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,250));}if(!ready)throw new Error('Testipalvelimen käynnistys aikakatkaistiin.');}
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  let failure=true;
  await page.route('**/api/market?*',async route=>{
    requests.push(route.request().url());
    await route.fulfill({status:failure?503:200,contentType:'application/json',body:JSON.stringify(failure?{error:'Hintalähteisiin ei saada yhteyttä.'}:fixture())});
  });
  await page.goto(url);await page.locator('#name').fill('Kukirin G2 Pro');await next(page);await page.locator('input[value=electronics]').check();await next(page);await page.locator('input[value=fair]').check();await page.locator('#details').fill('Yksityinen kuvaus');await next(page);
  assert.equal(requests.length,0);
  await page.locator('#fetch-market').click();await page.locator('#market-status').filter({hasText:'ei saada yhteyttä'}).waitFor();assert.equal(await page.locator('#use-market').count(),0);
  failure=false;await page.locator('#fetch-market').click();await page.locator('#use-market').waitFor();
  assert.match(await page.locator('#use-market').innerText(),/250/);
  await page.locator('#use-market').click();assert.match(await page.locator('#market-status').innerText(),/rastita vahvistus/);
  for(const id of ['4','5','6'])await page.locator(`[data-market-id="${id}"]`).uncheck();
  assert.match(await page.locator('#use-market').innerText(),/320/);
  await page.locator('#live-confirm').check();await page.locator('#use-market').click();await page.locator('input[value=profit]').check();await next(page);await page.locator('#buy').fill('200');await next(page);await page.locator('#analyze').click();
  assert.match(await page.locator('.price').innerText(),/320/);assert.match(await page.locator('.net-grid').first().innerText(),/120/);
  assert.equal(await page.locator('.market-comparable').count(),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'market-preview.png',fullPage:true,animations:'disabled'});
  for(const request of requests){const params=new URL(request).searchParams;assert.deepEqual([...params.keys()],['q','condition']);assert.equal(params.get('q'),'Kukirin G2 Pro');}
  assert.ok(!(await page.evaluate(()=>localStorage.getItem('flipgain-draft-v3'))).includes('marketReport'));
  await page.locator('#save-result').click();await page.locator('#toast').filter({hasText:'Tallennettu'}).waitFor();await page.locator('#my-items').click();await page.locator('[data-open]').click();await page.locator('#fetch-market').waitFor();assert.equal(await page.locator('.price').count(),0);
  await page.locator('#fetch-market').click();await page.locator('#use-market').waitFor();await page.locator('#live-confirm').check();
  await page.clock.setFixedTime(new Date(Date.now()+16*60*1000));await page.locator('#use-market').click();assert.match(await page.locator('#market-status').innerText(),/vanhentunut/);
  assert.deepEqual(errors,[]);
  console.log('Passed: retry after outage, source selection, separate asks and bids, confirmation, median/costs, no private details sent, mobile layout, source data not persisted, saved estimates require fresh lookup, stale quotes rejected.');
}finally{await browser.close();server?.kill();}
