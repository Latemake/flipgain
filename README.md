# Flipgain

Sivusto: https://latemake.github.io/flipgain/

Tuotekuvasta alkava suomenkielinen ohjattu käyttöpolku. Ei demotuotteita tai esitäytettyjä hintoja.

## Nykyinen julkaisu

GitHub Pages tarjoaa selaimessa toimivan käyttöliittymän. Kuvan lisääminen, yksi kysymys kerrallaan etenevä lomake, omiin vertailuilmoituksiin perustuva hintapyyntö, ilmoitusteksti sekä paikalliset tallennukset toimivat ilman palvelinta.

**Automaattista kuvantunnistusta ja verkkohakua ei ole vielä aktivoitu tuotantoon.** Niiden toteutus on `server/`-kansiossa. Aktivointi vaatii julkaistun Node-palvelimen ja palvelimelle asetetun OpenAI API-avaimen. Käyttöliittymä ilmoittaa puuttuvasta palvelusta ja tarjoaa omien vertailuilmoitusten lisäämisen. Se ei näytä keksittyä AI-analyysiä.

## Kehitys

Node.js 22.9+ (suositus 22 LTS).

```sh
npm ci
npm run dev
```

Palvelimen käynnistys toisessa terminaalissa:

```sh
npm run server
```

Vite välittää `/api`-pyynnöt paikalliseen porttiin 8787. Ilman avainta `/api/health` palauttaa `ready: false` ja käyttöliittymä tarjoaa käsin täytettävää hintavertailua.

## Automaattisen analyysin käyttöönotto

1. Julkaise tämä repositorio Node.js-palveluna valitsemassasi hosting-palvelussa. Build: `npm ci && npm run build`. Start: `node server/index.js`. Aseta `HOST=0.0.0.0` ja palvelun vaatima `PORT`.
2. Lisää `OPENAI_API_KEY` hosting-palvelun **salaisiin ympäristömuuttujiin**. Älä lisää sitä GitHub-repoon, selaimeen tai `VITE_`-muuttujaan. Mallin oletus on `gpt-5.4-mini`, vaihdettavissa `OPENAI_MODEL`-muuttujalla.
3. Aseta `ALLOWED_ORIGINS` sisältämään tarkka selainosoitteen origin, esimerkiksi `https://latemake.github.io`. Jos koko sivusto toimii samalla Node-palvelimella, lisää sen oma origin listaan.
4. Jos käyttöliittymä jää GitHub Pagesiin, aseta build-ympäristöön `VITE_ANALYSIS_API=https://oma-palvelin.example/api`, aja `npm run build:pages` ja puske muutokset GitHubiin. Samalta Node-palvelimelta tarjottu käyttöliittymä käyttää `/api`-polkua automaattisesti.
5. Varmista `/api/health` ja tee oikealla tuotteella kuvatunnistus sekä lähteistetty hintahaku. Aitoa API-kutsua ei ole vielä voitu testata ilman avainta.

Esimerkkiasetukset `.env.example`-tiedostossa. Paikallinen `.env` luetaan palvelimen käynnistyessä, ja Git ohittaa sen.

## Analyysin periaatteet

- Tuotteen nimi tunnistetaan kuvasta ja vahvistetaan käyttäjällä.
- OpenAI Responses API hakee julkisia verkkolähteitä. Facebookin kirjautumisen takaisia ilmoituksia tai kaikkia Torin ilmoituksia ei voida luvata saataville. Ei kirjautumisen ohittamista eikä suoraviivaista markkinapaikkaskrapausta.
- Numeeriseen vertailuun hyväksytään vain lähdehaussa esiintyneen URL:n omaavat, saman mallin ja vastaavan kunnon EUR-pyyntihinnat. Lähde-URL:n tarkistus vähentää keksittyjä linkkejä; se ei yksin takaa tekoälyn poimiman hinnan oikeellisuutta. Käyttäjä voi tarkistaa lähteen.
- Hintapyyntö on vähintään kolmen vertailun mediaani. Nopean kaupan vaihtoehto vähentää mediaanista 10 %. Tämä on avoin hinnoittelusääntö, ei myyntihintaennuste. Ilman riittäviä vertailuja ei anneta hintaa.
- Voitto on hintapyyntö miinus myyntikulut, prosenttipalkkio ja hankintahinta. Tuntematonta hankintahintaa ei käsitellä nollana. Verot ja oman työn hinta eivät sisälly.
- Vaihtokohteet ovat lähteistettyjä myynti-ilmoituksia. Myyjän vaihtohalukkuutta, välirahaa ja voittoa ei oleteta vahvistetuiksi. Ilman lähteitä ei näytetä keksittyjä tradeja.

## Tiedot ja käyttörajat

Kuvat pienennetään selaimessa ja tallennukset säilyvät IndexedDB:ssä tällä laitteella. Analyysipalvelu ei kirjoita kuvia levylle tai tietokantaan; OpenAI-kutsuissa käytetään `store:false`. Tämä ei ole lupaus kolmannen osapuolen nollasäilytyksestä. Käyttäjälle näytetään tiedonsiirto ennen tunnistusta.

Palvelimessa on pyyntökoon rajoitus, CORS-allowlist ja prosessikohtainen käyttöraja. `ANALYSIS_DAILY_LIMIT` on oletuksena 100 pyyntöä prosessia kohti vuorokaudessa. Se nollautuu prosessin uudelleenkäynnistyksessä eikä ole hajautettu rahankäyttöraja. Ennen avointa laajaa käyttöä kytke palveluntarjoajan käyttöbudjetti sekä pysyvä, instanssien yhteinen käyttörajoitus tai käyttäjäkirjautuminen. `TRUST_PROXY=true` vain jos hosting-palvelin ylikirjoittaa asiakkaan lähettämät IP-headerit luotettavasti.

## Tarkistukset ja julkaisu

```sh
npm test
npm run build
node scripts/browser-check.mjs
npm run build:pages
```

Selaintesti tarvitsee käynnissä olevan Viten sekä Playwright Chromiumin (`npx playwright install chromium`). Se testaa kuvavalinnan, lomakkeen, luonnoksen jatkamisen, hintalaskennan, tallennukset ja mobiilin. AI-palvelun vastaukset korvataan testissä testivastauksilla; nämä eivät sisälly julkisen sovelluksen aineistoon. Oikean ulkoisen API:n testi on erikseen tehtävä käyttöönotossa.

GitHub Pages julkaisee `main`-haaran `docs`-kansion. Aja `npm run build:pages`, lisää lähdekoodi ja `docs` Git-commitiin ja puske `main` GitHubiin.

Toteutuksen API-lähteet: [kuvasyötteet](https://developers.openai.com/api/docs/guides/images-vision), [verkkohaku](https://developers.openai.com/api/docs/guides/tools-web-search), [rakenteinen vastaus](https://developers.openai.com/api/docs/guides/structured-outputs).
