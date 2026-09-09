import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/k9sAAAAASUVORK5CYII=','base64');
const url=process.env.FLIPGAIN_TEST_URL||'http://127.0.0.1:5173/';
const next=page=>page.locator('#step-form button[type=submit]').click();
async function fillProduct(page,automatic=false,trade=true) {
  await page.locator('#photo-input').setInputFiles({name:'test-product.png',mimeType:'image/png',buffer:photo});
  await page.locator('#photo-next').click();
  await page.locator('#name').waitFor();
  if(automatic)assert.equal(await page.locator('#name').inputValue(),'Testituote');
  await page.locator('#name').fill('Testituote');await next(page);
  await page.locator('input[value=good]').check();await next(page);
  await page.locator('#details').fill('Toimiva. Mukana latausjohto.');await next(page);
  await page.locator(`input[value=${trade?'trade':'quick'}]`).check();await next(page);
  if(trade){await page.locator('#tradeInterest').fill('Pelikonsoli');await next(page);}
  await page.locator('#location').fill('Helsinki');await next(page);
  await page.locator('#buy').fill('80');await page.locator('.extra-costs summary').click();
  await page.locator('#expenses').fill('10');await page.locator('#fee').fill('5');await next(page);
}
try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/health',route=>route.fulfill({json:{ready:false}}));
  await page.goto(url);await page.locator('#choose-photo').waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('Sony WH-1000XM4'));
  await page.screenshot({path:'mobile-preview.png',fullPage:true});
  await page.locator('#photo-input').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('not a photo')});
  await page.locator('#error').filter({hasText:'Valitse JPG'}).waitFor();
  await fillProduct(page);
  await page.locator('[data-edit=name]').click();assert.equal(await page.locator('#name').inputValue(),'Testituote');
  await page.waitForFunction(()=>new Promise(resolve=>{const request=indexedDB.open('flipgain-items-v2');request.onsuccess=()=>{const db=request.result;const read=db.transaction('items').objectStore('items').get('draft');read.onsuccess=()=>{const ready=read.result?.screen==='name';db.close();resolve(ready);};};}));
  await page.reload();await page.locator('#resume').click();assert.equal(await page.locator('#name').inputValue(),'Testituote');
  await next(page);await next(page);await next(page);await next(page);await next(page);await next(page);await next(page);
  await page.locator('#analyze').click();
  for(let i=0;i<3;i++)await page.locator(`[name=price${i}]`).fill(String(100+i*20));
  await next(page);assert.match(await page.locator('.price').innerText(),/120/);assert.match(await page.locator('.net-grid').innerText(),/24/);
  assert.match(await page.locator('.trade-section').innerText(),/Vahvistettuja vaihtokohteita ei ole/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'result-preview.png',fullPage:true});
  await page.locator('#save-result').click();await page.locator('#toast').filter({hasText:'Tallennettu'}).waitFor();
  await page.reload();await page.locator('#my-items').click();await page.locator('.saved-item').waitFor();assert.equal(await page.locator('.saved-item').count(),1);
  await page.locator('[data-open]').click();assert.match(await page.locator('.price').innerText(),/120/);
  await page.locator('#my-items').click();await page.locator('[data-delete]').click();await page.waitForFunction(()=>!document.querySelector('.saved-item'));
  await page.locator('#close-dialog').click();await page.locator('#new-product').click();
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'desktop-preview.png',fullPage:true});
  assert.deepEqual(errors,[]);await context.close();

  // External AI responses are mocked ONLY in this browser test. No fixtures ship to the app.
  if(!process.env.FLIPGAIN_TEST_URL){
    const autoContext=await browser.newContext({viewport:{width:390,height:844}});const auto=await autoContext.newPage();
    await auto.route('**/api/health',route=>route.fulfill({json:{ready:true}}));
    await auto.route('**/api/identify',route=>route.fulfill({json:{name:'Testituote',note:'Vahvista tarkka malli.',confidence:'medium'}}));
    const comparablePrices=[100,120,140].map((price,i)=>({title:'Testituote',price,url:`https://example.com/item/${i}`,currency:'EUR',condition:'Hyvä',priceType:'asking',comparable:true}));
    await auto.route('**/api/analyze',route=>route.fulfill({json:{summary:'Testivastaus',sellability:'Arvio edellyttää lisätietoa.',comparables:comparablePrices,trades:[],risks:['Testaa toiminta.'],sources:[],searchedAt:new Date().toISOString()}}));
    await auto.goto(url);await auto.waitForFunction(()=>document.querySelector('.privacy-note').textContent.includes('lähetetään OpenAI'));
    await fillProduct(auto,true,false);await auto.locator('#analyze').click();await auto.locator('.price').waitFor();assert.match(await auto.locator('.price').innerText(),/108/);
    await auto.locator('#edit-result').click();
    await auto.unroute('**/api/analyze');await auto.route('**/api/analyze',route=>route.fulfill({status:503,json:{error:'Analyysipalvelu ei ole käytettävissä.'}}));
    await auto.locator('#analyze').click();await auto.locator('#error').filter({hasText:'Analyysipalvelu'}).waitFor();assert.equal(await auto.locator('.price').count(),0);
    await autoContext.close();
  }
  console.log('Browser checks passed: upload validation, guided flow, edit, draft resume, real-price calculation, trade empty state, save/reload/delete, mobile overflow, and API success/error states.');
}finally{await browser.close();}
