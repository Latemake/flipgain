import test from 'node:test';
import assert from 'node:assert/strict';
import {valueProduct,median,safeUrl} from './valuation.js';
const product={buy:'80',expenses:'10',fee:'5',goal:'profit'};
const comps=[100,120,140].map(price=>({price,currency:'EUR',comparable:true}));
test('recommends the median and deducts actual costs',()=>{
  const result=valueProduct(product,comps);assert.equal(result.ask,120);assert.equal(result.net,104);assert.equal(result.profit,24);assert.equal(median([150,100]),125);
});
test('insufficient evidence never produces a guessed price',()=>{
  for(const data of [[],comps.slice(0,2),[...comps.slice(0,2),{price:200,currency:'USD',comparable:true}],[...comps.slice(0,2),{price:200,currency:'EUR',comparable:false}]])assert.equal(valueProduct(product,data).sufficient,false);
});
test('unknown purchase price is different from a free product',()=>{
  assert.equal(valueProduct({...product,buy:''},comps).profit,null);assert.equal(valueProduct({...product,buy:'0'},comps).profit,104);
});
test('quick-sale strategy is explicit and losses are preserved',()=>{
  const result=valueProduct({...product,goal:'quick',buy:200},comps);assert.equal(result.ask,108);assert.ok(result.profit<0);
});
test('rejects bad costs and unsafe links',()=>{
  assert.throws(()=>valueProduct({...product,fee:100},comps));assert.throws(()=>valueProduct({...product,buy:-1},comps));assert.equal(safeUrl('javascript:alert(1)'),null);assert.equal(safeUrl('https://user:secret@example.com'),null);
});
