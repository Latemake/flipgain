import {findReference} from './market-references.js';
import {marketSummary,cleanQuery} from './market-data.js';
export const conditions={new:'Uudenveroinen',good:'Hyvä',fair:'Kulunut mutta toimiva',poor:'Viallinen / korjattava'};
export const priceBases={live:'Haetut markkinahinnat',reference:'Tallennettu mallikohtainen vertailu',market:'Oma tieto käytetyn hintatasosta',formula:'Vain karkea arvonalenemislaskelma'};
export const goals={profit:'Paras hinta',quick:'Nopea kauppa',trade:'Vaihtokauppa'};
// These are deliberately broad product-planning assumptions, not market statistics.
export const categories={
  electronics:{label:'Elektroniikka',retention:.78,decay:.20,spread:.30},
  furniture:{label:'Huonekalut ja sisustus',retention:.65,decay:.07,spread:.35},
  tools:{label:'Työkalut ja koneet',retention:.75,decay:.09,spread:.30},
  sports:{label:'Urheilu ja harrastukset',retention:.70,decay:.12,spread:.30},
  clothing:{label:'Vaatteet ja asusteet',retention:.50,decay:.12,spread:.40},
  other:{label:'Muu käyttöesine',retention:.60,decay:.12,spread:.40},
  collectible:{label:'Keräily, antiikki tai taide',unsupported:true},
};
export const conditionFactors={new:1,good:.85,fair:.60,poor:.15};
export function money(value){return new Intl.NumberFormat('fi-FI',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(value);}
const round=value=>Math.round((value+Number.EPSILON)*100)/100;
function number(value,label,{optional=false,max=1_000_000}={}){
  if(value===''||value===undefined||value===null){if(optional)return null;throw new Error(`${label} puuttuu.`);}
  const parsed=Number(value);if(!Number.isFinite(parsed)||parsed<0||parsed>max)throw new Error(`Tarkista ${label.toLowerCase()}.`);return parsed;
}
export function estimate(product,{now=Date.now()}={}){
  const category=Object.hasOwn(categories,product.category)?categories[product.category]:null;
  if(!category||!Object.hasOwn(conditionFactors,product.condition)||!Object.hasOwn(goals,product.goal))throw new Error('Valitse tuoteryhmä, kunto ja tavoite.');
  const buy=number(product.buy,'Hankintahinta',{optional:true});
  const expenses=number(product.expenses??0,'Myyntikulut');
  const fee=number(product.fee??0,'Välityspalkkio',{max:99.9});
  const basis={buy,expenses,fee,version:4};
  if(product.priceBasis==='live'){
    if(product.liveConfirmed!=='yes'||cleanQuery(product.marketReport?.query).toLowerCase()!==cleanQuery(product.name).toLowerCase()||product.marketReport?.condition!==product.condition)throw new Error('Hae hinnat ja vahvista vertailujen sopivuus.');
    const market=marketSummary(product.marketReport,product.marketSelected,now);
    if(!market.count)throw new Error('Valitse vähintään yksi vertailuilmoitus.');
    const typical=round(market.median),ask=round(typical*(product.goal==='quick'?.9:1)),net=round(ask*(1-fee/100)-expenses);
    return {...basis,sufficient:true,method:'live',market,typical,ask,net,profit:buy===null?null:round(net-buy),low:market.low,high:market.high,breakEven:buy===null?null:round((buy+expenses)/(1-fee/100))};
  }
  if(product.priceBasis==='market'||product.priceBasis==='reference'){
    const reference=product.priceBasis==='reference'?findReference(product,now):null;
    if(product.priceBasis==='reference'&&(!reference||product.referenceConfirmed!=='yes'))throw new Error('Tarkista vertailuilmoituksen sopivuus ja vahvista hintaperuste uudelleen.');
    const typical=reference?reference.price:number(product.marketPrice,'Käytetyn tuotteen hintataso');
    if(typical<=0)throw new Error('Käytetyn hintatason pitää olla suurempi kuin nolla.');
    const ask=round(typical*(product.goal==='quick'?.9:1));
    const net=round(ask*(1-fee/100)-expenses);
    return {...basis,sufficient:true,method:product.priceBasis,source:reference,typical,ask,net,profit:buy===null?null:round(net-buy),breakEven:buy===null?null:round((buy+expenses)/(1-fee/100)),low:null,high:null};
  }
  if(product.priceBasis!=='formula')throw new Error('Valitse hintaperuste. Vanhaa yleiskaavaa ei käytetä automaattisesti.');
  if(category.unsupported)return {...basis,sufficient:false,reason:'Keräilyesineen, antiikin tai taiteen arvoa ei voi päätellä uushinnasta ja iästä. Tarkista saman esineen toteutuneet kaupat tai pyydä asiantuntijan arvio.'};
  const reference=number(product.referencePrice,'Hinta uutena');
  if(reference<=0)throw new Error('Hinnan uutena pitää olla suurempi kuin nolla.');
  const age=number(product.age,'Ikä',{max:100});
  const ageFactor=Math.exp(-category.decay*age);
  const factor=category.retention*ageFactor*conditionFactors[product.condition];
  const typical=round(reference*factor);
  const low=round(typical*(1-category.spread)),high=round(Math.min(reference,typical*(1+category.spread)));
  const ask=round(typical*(product.goal==='quick'?.9:1));
  const net=round(ask*(1-fee/100)-expenses);
  const lowNet=round(low*(1-fee/100)-expenses);
  return {...basis,sufficient:true,method:'formula',reference,age,typical,low,high,ask,net,lowNet,profit:buy===null?null:round(net-buy),lowProfit:buy===null?null:round(lowNet-buy),breakEven:buy===null?null:round((buy+expenses)/(1-fee/100)),factor,ageFactor};
}
export function assessTrade(valuation,{resale,cash=0,direction='pay',costs=0,fee=0}){
  if(!valuation.sufficient)throw new Error('Laske ensin oman tuotteesi arvio.');
  const target=number(resale,'Vaihtotuotteen jälleenmyyntiarvio');
  const extra=number(cash,'Väliraha'),expenses=number(costs,'Vaihtotuotteen myyntikulut');
  const percentage=number(fee,'Vaihtotuotteen välityspalkkio',{max:99.9});
  if(!['pay','receive'].includes(direction))throw new Error('Valitse välirahan suunta.');
  const net=round(target*(1-percentage/100)-expenses+(direction==='receive'?extra:-extra));
  return {net,advantage:round(net-valuation.net),profit:valuation.buy===null?null:round(net-valuation.buy),maxCash:round(target*(1-percentage/100)-expenses-valuation.net)};
}
export function guidance(product){
  const risks=[];
  let ease;
  if(product.condition==='poor'){ease='Korjaustarve voi rajata ostajia. Selvitä vika ja varaosien saatavuus ennen hinnan päättämistä.';risks.push('Kerro viasta täsmällisesti. Korjattavan tuotteen todellinen arvo voi olla myös nolla.');}
  else if(product.category==='furniture'){ease='Noudon ja kuljetuksen järjestäminen voi vaikuttaa kauppaan enemmän kuin pieni hinnanalennus.';}
  else{ease='Toimivuuden osoittaminen, selkeä kuvaus ja sopiva toimitustapa helpottavat ostajan päätöstä. Mallikohtainen kysyntä ei ole tiedossa.';}
  if(product.category==='electronics')risks.push('Tarkista toiminta, akun kunto, mahdolliset käyttäjälukitukset ja mukana tulevat laturit.');
  if(product.category==='clothing')risks.push('Ilmoita mitat, materiaalit, tahrat ja kulumat. Merkkituotteessa myös aitouden osoittaminen auttaa.');
  if(product.category==='sports')risks.push('Huomioi sesonki, koko ja turvallisuuteen vaikuttavat kulumat.');
  if(product.category==='tools')risks.push('Testaa toiminta ja huomioi akkujen, terien sekä muiden kulutusosien kunto.');
  if(product.category==='furniture')risks.push('Lisää mitat, materiaalit ja tieto purkamisesta. Varmista noutoon sopiva kuljetus.');
  risks.push('Tarkista saman mallin ja vastaavan kunnon ilmoitukset ennen julkaisua. Hintatiedot eivät takaa toteutuvaa kauppaa.');
  return {ease,risks};
}
export function draftListing(product,valuation){
  return [product.name,'',`Kunto: ${conditions[product.condition]}.`,product.details||'',product.age!==''&&product.age!=null?`Ikä noin ${product.age} vuotta.`:'',valuation.sufficient?`Hintapyyntö: ${money(valuation.ask)}.`:'',product.goal==='trade'?'Myös vaihtoa voi ehdottaa.':''].join('\n').trim();
}
