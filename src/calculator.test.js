import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from './calculator.js';
const base = { buy:85,sale:140,shipping:7,repairs:0,fee:0,condition:'good',demand:'high' };
test('deducts all costs including percentage fee',()=>{const r=calculate({...base,fee:10,repairs:4});assert.equal(r.profit,30);assert.equal(r.costs,110);assert.ok(Math.abs(r.breakEven-96/.9)<.001);});
test('handles a loss and a sale with zero costs',()=>{assert.equal(calculate({...base,sale:70}).profit,-22);assert.equal(calculate({...base,buy:0,shipping:0}).roi,null);});
test('handles 100 percent fee without Infinity',()=>assert.equal(calculate({...base,fee:100}).breakEven,null));
test('rejects invalid financial inputs',()=>{for(const bad of [-1,NaN,Infinity]) assert.throws(()=>calculate({...base,buy:bad}));assert.throws(()=>calculate({...base,fee:101}));});
test('ease is based only on declared demand and condition',()=>{assert.equal(calculate(base).ease,'Hyvä');assert.equal(calculate({...base,condition:'poor'}).ease,'Haastava');assert.equal(calculate({...base,demand:'medium'}).ease,'Kohtalainen');});
