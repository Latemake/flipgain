# Flipgain

Suomenkielinen, puhelimelle sopiva myynti- ja vaihtolaskuri. GitHub Pages julkaisee käyttöliittymän, Cloudflare Worker hakee hintavertailut. Tekoälyä, API-krediittejä, maksullisia hakupalveluja tai käyttäjätiliä ei tarvita.

## Hintahaku

Käyttäjä antaa merkin ja mallin, kuntoluokan sekä halutessaan kuvauksen. Hinnoitteluvaiheessa **Hae hintatiedot** tekee enintään kolme lähdepyyntöä:

- Tori: julkisen hakusivun yksityismyyjien pyyntihinnat. Uudet kauppatuotteet, varaosat ja otsikossa poikkeavat malliversiot suodatetaan. Hyvälle tai kuluneelle tuotteelle etsitään kuntoja ”kuin uusi”, ”hyvä” ja ”kohtalainen”; käyttäjän täytyy tarkistaa ilmoituksen todellinen kunto.
- Huuto.net: julkisen API:n kiinteät pyyntihinnat sekä viimeisen 90 päivän päättyneet huutokaupat valitussa kuntoluokassa. Huutokauppa hyväksytään vain, kun tarjoajia on, sulkemisaika on menneisyydessä ja mahdollinen hintavaraus on ylittynyt. Voittava tarjous ei todista maksua.
- Facebook Marketplace: vain hakulinkki; ei automaattista hintahakua tai väitettä toteutuneista myyntihinnoista.

Lähteistä tarkistetaan rajattu hakutulossivu. Koko markkinan kattavuutta tai tiettyä myyntiaikaa ei väitetä. Torin palvelin voi estää pilvestä tehtävän haun (Cloudflare-testissä saatiin HTTP 403), vaikka paikallinen haku toimii. Lähteen häiriö näytetään erikseen; muiden lähteiden tulokset säilyvät. Suojauksia ei kierretä ulkoisilla välityspalveluilla.

Käyttäjä tarkistaa vertailut, poistaa väärät versiot tai kunnot ja vahvistaa sopivuuden. Arvion lähtötaso on valittujen hintojen mediaani. Vähintään kolme voittavaa tarjousta asetetaan pyyntihintojen edelle; muulloin käytetään pyyntöjä tai niiden puuttuessa saatavilla olevia voittavia tarjouksia. Ryhmiä ei yhdistetä keskiarvoksi. Alle kolmesta havainnosta varoitetaan. Yksittäinen ilmoitus on hyvin epävarma lähtötaso. Nopean kaupan tavoitteessa käyttäjä valitsee 10 prosentin alennuksen; se ei ole mitattu tinkimisvara tai lupaus myyntinopeudesta.

Vapaata kuvausta, akun kuntoa tai kilometrejä ei hinnoitella tekoälyllä. Hintaa ei alenneta toistamiseen yleisellä kuntokertoimella. Muut hintaperusteet säilyvät erillisessä avattavassa osiossa: oma markkinahinta, rajatuille malleille tallennettu lähde ja nimenomaisesti valittu karkea yleiskaava.

## Maksuttomuus ja julkaisu

Käytä vain **Cloudflare Workers Free** -tilausta. Siinä on 100 000 pyyntöä päivässä ja 10 ms CPU-raja. Ilmaisrajan täyttyminen keskeyttää palvelun; tämä projekti ei tilaa maksullista pakettia. AI-, KV-, D1-, R2-, selainrenderöinti- tai muita maksullisia sidoksia ei käytetä. Workersin Cache API säilyttää onnistuneita hakuja 15 minuuttia. Lähteiden omat saatavuus- ja käyttörajat voivat muuttua.

- [Workers Free -hinnoittelu](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workersin rajat](https://developers.cloudflare.com/workers/platform/limits/)
- [Huuto.net API](https://dev.huuto.net/methods.html)
- [Huuto.net API -ehdot](https://dev.huuto.net/api_terms_of_use.html)

Pysyvään käyttöönottoon tarvitaan ylläpitäjän maksuton Cloudflare-tili ja kirjautuminen. Väliaikainen `wrangler deploy --temporary` -julkaisu poistetaan, ellei omistajuutta oteta 60 minuutissa; sitä ei pidä pitää pysyvänä julkaisuna. Julkaistu Worker-osoite tallennetaan tiedostoon `src/market-config.js`. Sen pitää vastata todellista toimivaa julkaisua. Tyhjä osoite piilottaa hakutoiminnon tuotantoversiosta, kunnes pysyvä palvelu on käytettävissä.

```sh
npm ci
npx wrangler login
npm run deploy:market
# Päivitä src/market-config.js julkaisun palauttamalla osoitteella.
npm run build:pages
```

GitHub Pages julkaisee main-haaran docs-kansion. Puske lähdekoodi ja generoitu docs yhdessä. Worker päivitetään erikseen komennolla `npm run deploy:market`. Mukautettua GitHub Actions -työnkulkua ei tarvita. CORS sallii nykyisen GitHub Pages -originin ja paikallisen kehityspalvelun; päivitä wrangler.jsonc, jos sivuston osoite muuttuu.

## Tietojen käsittely

Hintahaku lähettää vain tuotteen nimen ja kuntoluokan hintapalvelulle sekä hakuehdot markkinapaikoille. Kuvaus, hankintahinta, kulut ja muut omat tiedot jäävät selaimeen. Käyttöliittymä kertoo tämän ennen hakupainiketta.

Luonnos tallennetaan localStorageen ja erikseen tallennetut tuotteet IndexedDB:hen. Haettuja ilmoituksia tai niistä laskettuja tuloksia ei tallenneta pysyvästi selaimeen; tallennettu markkina-arvio avataan uuteen hintahakuun. Lähdetiedot vanhenevat 15 minuutissa ja Worker-välimuisti noudattaa samaa aikaa (Huuto.net sallii enintään 24 tuntia). Palvelu ei tallenna myyjien nimiä, kuvia tai yhteystietoja eikä kirjoita hakujen sisältöjä sovelluslokiin. Verkkopalveluntarjoajat voivat käsitellä pyyntöjen teknisiä metatietoja omien käytäntöjensä mukaisesti.

## Kehitys ja testaus

```sh
npm run dev
npm test
npm run test:browser
npm run build:pages
```

Selaintestit tarvitsevat käynnissä olevan Viten portissa 5173 ja Playwright Chromiumin (`npx playwright install chromium`). Markkinahaun testi käynnistää oman Viten porttiin 5174 ja käyttää ainoastaan testissä korvattua hakupalvelua. `FLIPGAIN_TEST_URL` vaihtaa testattavan sivun, jossa uuden haun täytyy silloin olla käytössä. Vanhat manuaaliset laskentapolut testataan ilman verkkoa. Uuden haun testit käyttävät vain testeihin määriteltyjä vastauksia: lähdehäiriöt ja uudelleenyritys, valintojen vaikutus mediaaniin, pyyntöjen ja voittavien tarjousten erottelu, vanheneminen, kustannukset, lähdetietojen tallentamattomuus ja mobiiliasettelu. Testivertailuja ei toimiteta sivuston datana.

Paikallinen Worker: `npm run dev:market`. Käyttöliittymän osoitteen voi ohittaa kehityksessä muuttujalla `VITE_MARKET_API=http://127.0.0.1:8787`. Julkaisun jälkeen varmista myös oikea haku selaimesta; paikallinen tai testivastauksilla läpäisty testi ei osoita, että lähde sallii pilvestä tehdyt pyynnöt.
