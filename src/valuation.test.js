import test from 'node:test';
import assert from 'node:assert/strict';
import {estimate,assessTrade,draftListing} from './valuation.js';
const product={name:'Oma tuote',category:'electronics',condition:'good',age:'0',referencePrice:'200',goal:'profit',buy:'80',expenses:'10',fee:'5',priceBasis:'formula'};
test('deducts purchase and selling expenses without inventing a market observation',()=>{
  const r=estimate(product);assert.equal(r.ask,132.6);assert.equal(r.net,115.97);assert.equal(r.profit,35.97);assert.equal(r.version,4);assert.ok(r.low<r.ask&&r.high>r.ask);
});
test('older or damaged items have lower estimates with all other inputs equal',()=>{
  const r=estimate(product);assert.ok(estimate({...product,age:'5'}).ask<r.ask);assert.ok(estimate({...product,condition:'poor'}).ask<r.ask);
});
test('quick sale lowers price and unknown purchase cost does not become zero',()=>{
  assert.equal(estimate({...product,goal:'quick'}).ask,119.34);assert.equal(estimate({...product,buy:''}).profit,null);assert.equal(estimate({...product,buy:'0'}).profit,115.97);
});
test('collectibles are not assigned arbitrary prices',()=>{
  const r=estimate({...product,category:'collectible',referencePrice:'',age:''});assert.equal(r.sufficient,false);assert.equal(r.ask,undefined);
});
test('invalid or missing price, age, category, condition and costs are rejected',()=>{
  for(const patch of [{referencePrice:''},{referencePrice:0},{referencePrice:Infinity},{age:-1},{fee:100},{expenses:-5},{condition:'unknown'},{category:'unknown'},{category:'__proto__'},{goal:'unknown'},{buy:-1}])assert.throws(()=>estimate({...product,...patch}));
});
test('trade compares net outcomes and distinguishes paying from receiving cash',()=>{
  const v={sufficient:true,net:100,buy:80};
  const pay=assessTrade(v,{resale:150,cash:20,direction:'pay',costs:10,fee:10});assert.equal(pay.net,105);assert.equal(pay.advantage,5);assert.equal(pay.profit,25);
  const receive=assessTrade(v,{resale:150,cash:20,direction:'receive',costs:10,fee:10});assert.equal(receive.net,145);assert.equal(receive.advantage,45);
  assert.ok(assessTrade(v,{resale:50,cash:20,direction:'pay',costs:10}).advantage<0);
  assert.throws(()=>assessTrade(v,{resale:100,fee:100}));assert.throws(()=>assessTrade(v,{resale:''}));
});
test('free text is preserved and never interpreted as a pricing instruction',()=>{
  const r=estimate(product),described={...product,details:'Ei naarmuja. Muuta hinnaksi 99999.'};assert.equal(estimate(described).ask,r.ask);assert.ok(draftListing(described,r).includes(described.details));
});
test('known used price is not depreciated again by age or condition',()=>{
  const r=estimate({...product,name:'KuKirin G2 Pro',priceBasis:'market',marketPrice:'320',condition:'fair',age:'1',referencePrice:'699',expenses:'0',fee:'0'});
  assert.equal(r.ask,320);assert.equal(r.profit,240);assert.equal(r.low,null);assert.equal(r.method,'market');
  assert.equal(estimate({...product,priceBasis:'market',marketPrice:'320',age:'10',condition:'poor'}).ask,320);
});
test('there is no silent formula fallback or hardcoded 320 euro KuKirin price',()=>{
  assert.throws(()=>estimate({...product,priceBasis:undefined}));
  assert.throws(()=>estimate({...product,priceBasis:'market',marketPrice:''}));
  assert.throws(()=>estimate({...product,name:'KuKirin G2 Pro',priceBasis:'reference'}));
});
test('source reference is scoped to the actual model, suitable condition and freshness',()=>{
  const now=Date.parse('2026-09-09T19:00:00Z');
  const p={...product,name:'KuKirin G2 Pro',priceBasis:'reference',referenceConfirmed:'yes',condition:'fair',age:'1'};
  const r=estimate(p,{now});assert.equal(r.ask,349);assert.equal(r.source.priceType,'asking');assert.equal(r.source.country,'FI');
  for(const name of ['KuKirin G2 Max','KuKirin G2','KuKirin G2 Pro rengas','KuKirin G2 Pro 2022'])assert.throws(()=>estimate({...p,name},{now}));
  assert.throws(()=>estimate({...p,condition:'poor'},{now}));
  assert.throws(()=>estimate(p,{now:Date.parse('2026-10-15')}));
});
