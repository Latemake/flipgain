import {marketSummary,priceTypes,cleanQuery,safeListingUrl} from './market-data.js';
import {money} from './valuation.js';
import {publishedMarketEndpoint} from './market-config.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const marketEndpoint=import.meta.env.VITE_MARKET_API || publishedMarketEndpoint;
export function liveFields(product) {
  if(!marketEndpoint)return '';
  return `<section class="live-market"><span class="eyebrow">HAE OIKEITA VERTAILUHINTOJA</span><h2>Mitä samasta mallista pyydetään?</h2><p>Hae Torin yksityisten myyjien pyyntihinnat ja Huuto.netin hinnat. Päättyneiden huutokauppojen voittavat tarjoukset eritellään.</p><button type="button" class="button primary wide" id="fetch-market">Hae hintatiedot</button><p class="field-hint">Hakua painamalla lähetät tuotteen nimen ja kuntoluokan hintapalvelulle sekä hakuehdot Torille ja Huuto.netille. Kuvausta tai hankintahintaa ei lähetetä. Haku ei maksa mitään.</p><div id="market-status" role="status" aria-live="polite"></div><div id="market-report">${product.marketReport?reportHtml(product):''}</div></section>`;
}
function stats(summary){return `<div class="net-grid">${['asking','auction'].map(type=>{const g=summary[type];return `<div><span>${type==='asking'?'Pyyntihinnat':'Voittavat tarjoukset'} · ${g.count} kpl</span><strong>${g.count?money(g.median):'Ei havaintoja'}</strong><small>${g.count?`Mediaani · ${money(g.low)}–${money(g.high)}`:'Toteutunutta hintaa ei päätellä pyynnöstä'}</small></div>`;}).join('')}</div>`;}
export function reportHtml(product,readOnly=false) {
  const r=product.marketReport;if(!r)return '';
  let s;try{s=marketSummary(r,product.marketSelected);}catch{return '<p class="error">Hintahaku vanheni. Hae hinnat uudelleen.</p>';}
  return `<p class="field-hint">Haettu ${esc(new Date(r.fetchedAt).toLocaleString('fi-FI'))}. Tarkastetaan rajattu hakutulossivu kustakin lähteestä; tämä ei kata koko markkinaa.</p><ul class="source-status">${r.sources.map(x=>`<li>${esc(x.name)}: ${x.status==='error'?'haku epäonnistui':`${x.count} mahdollista vertailua${x.truncated?' · lisää tuloksia voi olla lähteessä':''}`}</li>`).join('')}</ul>${stats(s)}<p class="field-hint">Voittava tarjous ei vahvista maksua tai kaupan loppuunsaattamista. Facebookista ei haeta hintoja. Torin vertailuissa voi olla omaasi parempikuntoisia tuotteita.</p>${r.items.length?`<h3>${readOnly?'Arvioon valitut ilmoitukset':'Tarkista vertailuilmoitukset'}</h3>${!readOnly?'<p>Poista eri versiot, paketit ja tuotteet, joiden kunto poikkeaa liikaa. Akun kuntoa, ajomäärää ja kuvauksen yksityiskohtia ei tulkita automaattisesti.</p>':''}<div class="market-comparables">${r.items.filter(i=>!readOnly||product.marketSelected?.includes(i.id)).map(i=>`<article class="market-comparable">${!readOnly?`<input type="checkbox" class="comparable-check" aria-label="Ota mukaan: ${esc(i.title)}" data-market-id="${esc(i.id)}" ${product.marketSelected?.includes(i.id)?'checked':''}>`:''}<div><a href="${esc(safeListingUrl(i.url,i.source)||'#')}" target="_blank" rel="noopener noreferrer">${esc(i.title)} ↗</a><small>${esc(i.source)} · ${esc(priceTypes[i.type])}</small><small>${esc(i.condition)}${i.closedAt?` · Päättynyt ${esc(new Date(i.closedAt).toLocaleDateString('fi-FI'))}`:''}</small></div><strong>${money(i.price)}</strong></article>`).join('')}</div>${s.count<3?'<p class="service-note">Alle kolme vertailua: lähtöhinta on hyvin epävarma. Yksi ilmoitus ei osoita markkina-arvoa.</p>':''}${!readOnly?`<label class="reference-confirmation"><input id="live-confirm" type="checkbox" ${product.liveConfirmed==='yes'?'checked':''}><span>Tarkistin, että valitut ilmoitukset vastaavat riittävän hyvin tuotteeni versiota ja kuntoa.</span></label><button class="button secondary wide" id="use-market" type="button" ${!s.count?'disabled':''}>Käytä ${s.basis==='auction'?'voittavien tarjousten':'pyyntihintojen'} ${s.count===1?'hintaa':'mediaania'}${s.count?' '+money(s.median):''}</button>`:''}`:'<p class="service-note">Sopivia vertailuja ei löytynyt. Tarkista merkin ja mallin kirjoitusasu. Emme korvaa puuttuvia hintoja arvauksella.</p>'}`;
}
export function bindLiveMarket(product,{changed,applied}) {
  const fetchButton=document.querySelector('#fetch-market');if(!fetchButton)return;
  const host=document.querySelector('#market-report'),status=document.querySelector('#market-status');
  const bindReport=()=>{
    host.querySelectorAll('[data-market-id]').forEach(input=>input.onchange=()=>{product.marketSelected=[...host.querySelectorAll('[data-market-id]:checked')].map(n=>n.dataset.marketId);product.liveConfirmed='';if(product.priceBasis==='live')product.priceBasis='';changed();host.innerHTML=reportHtml(product);bindReport();});
    host.querySelector('#live-confirm')?.addEventListener('change',e=>{product.liveConfirmed=e.target.checked?'yes':'';if(!e.target.checked&&product.priceBasis==='live')product.priceBasis='';changed();});
    host.querySelector('#use-market')?.addEventListener('click',()=>{if(product.liveConfirmed!=='yes'){status.textContent='Tarkista ilmoitusten sopivuus ja rastita vahvistus.';return;}try{if(!marketSummary(product.marketReport,product.marketSelected).count)throw new Error('Valitse vähintään yksi vertailu.');product.priceBasis='live';applied();}catch(e){status.textContent=e.message;}});
  };
  bindReport();
  fetchButton.onclick=async()=>{
    fetchButton.disabled=true;status.textContent='Haetaan pyyntihintoja ja päättyneitä huutokauppoja…';host.innerHTML='';delete product.marketReport;product.marketSelected=[];product.liveConfirmed='';if(product.priceBasis==='live')product.priceBasis='';changed();
    try{
      const u=new URL('/api/market',marketEndpoint);u.searchParams.set('q',cleanQuery(product.name));u.searchParams.set('condition',product.condition);
      const response=await fetch(u,{signal:AbortSignal.timeout(20000),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
      if(!response.ok){let message='Hintahaku ei ole käytettävissä. Yritä myöhemmin uudelleen.';try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
      const report=await response.json();
      if(cleanQuery(report.query).toLowerCase()!==cleanQuery(product.name).toLowerCase()||report.condition!==product.condition||!Array.isArray(report.items)||!Array.isArray(report.sources))throw new Error('Hintahaun vastausta ei voitu vahvistaa.');
      product.marketReport=report;product.marketSelected=report.items.map(i=>i.id);marketSummary(report,product.marketSelected);
      if(!host.isConnected)return;
      status.textContent=report.items.length?'Haku valmis. Tarkista vertailut alta.':'Haku valmis. Sopivia vertailuja ei löytynyt.';host.innerHTML=reportHtml(product);bindReport();changed();
    }catch(error){delete product.marketReport;product.marketSelected=[];if(status.isConnected)status.textContent=error.name==='TimeoutError'?'Haku kesti liian kauan. Yritä uudelleen.':error.message;}finally{fetchButton.disabled=false;}
  };
}
