# Flipgain

Sivusto: https://latemake.github.io/flipgain/

Selaimessa toimiva suomenkielinen myynti- ja vaihtolaskuri. Ei kuvia, taustapalvelinta, API-avaimia tai tekoälykutsuja. Laskenta toimii myös ilman verkkoyhteyttä sivun lataamisen jälkeen.

## Hinnoittelun korjaus

Yleinen uushintaan, ikään ja kuntoluokkaan perustuva kaava ei tuottanut riittävää tuotekohtaista hintasuositusta. Se saattoi esimerkiksi aliarvioida KuKirin G2 Pron. Sitä ei enää käytetä automaattisesti.

Hintaperuste valitaan erikseen:

1. **Tallennettu mallikohtainen vertailu.** Julkinen yksittäinen myynti-ilmoitus, lähde ja tarkastuspäivä. Käyttäjä vahvistaa version ja kunnon vertailukelpoisuuden. Kyse on pyyntihinnasta, ei toteutuneesta kaupasta tai markkinamediaanista.
2. **Käyttäjän tieto vastaavan käytetyn hinnasta.** Esimerkiksi käyttäjän antamasta 320 eurosta ei enää vähennetä uushintakaavan ikä- ja kuntokertoimia uudelleen. Tämä on käyttäjän oletus, ei sivuston itsenäisesti vahvistama hinta.
3. **Vain karkea laskelma.** Erikseen valittava vanha arvonalenemiskaava. Tulos on selvästi merkitty yleiskaavan tulokseksi, ei tuotekohtaiseksi hintasuositukseksi. Keräilylle, antiikille ja taiteelle yleiskaava ei anna hintaa.

Nopean kaupan tavoite alentaa valittua lähtöhintaa 10 %. Tämä on hinnoittelustrategia, ei lupaus myyntinopeudesta. Nettotuotto vähentää annetut kulut ja palkkion. Voitto vähentää myös hankintahinnan; tuntematon hankintahinta ei ole nolla. Veroja ja oman työn arvoa ei huomioida.

## Vertailuaineiston rajaus

`src/market-references.js` sisältää tällä hetkellä **yhden suomalaisen KuKirin G2 Pro -vertailuilmoituksen**, ei kattavaa tuotetietokantaa. [Nettimoto-ilmoituksen](https://www.nettimoto.com/kugoo/wish-01/3422985) pyyntihinta oli tarkasteltaessa 349 €. Tieto tallennettiin 9.9.2026. Ilmoituksen saatavuutta ei tarkisteta automaattisesti sivustoa käytettäessä.

Vertailua ei ehdoteta eri G2-mallille, varaosille, eri nimessä ilmoitetulle vuosimallille tai vialliseksi merkitylle tuotteelle. Vertailu vanhenee 30 päivän jälkeen, jolloin hintaperuste on valittava uudelleen. Tieto on staattisesti mukana julkaisussa, joten ylläpitäjän täytyy tarkistaa ja julkaista päivitykset. Muille malleille ei väitetä löytyneen hintatietoa.

Vapaata kuvausta ei tulkita tekoälyllä eikä esimerkiksi lommoa, ajomäärää, akun kuntoa tai vaihdettuja jarrupaloja muuteta automaattisesti euroiksi. Käyttäjän on arvioitava vertailun sopivuus. Tiedossa oleva hintataso koskee käyttäjän omaa tuotetta nykyisessä kunnossa. Nimen, tuoteryhmän tai kuntoluokan muuttaminen tyhjentää vanhan hintaperusteen, jotta toisen tuotteen hinta ei siirry vahingossa mukaan.

## Käyttö ja tallennus

Tuote, kunto ja hintaperuste kysytään vaiheittain. Uushintaa ja ikää kysytään vain erikseen valittua yleiskaavaa varten. Tuloksessa näkyvät lähtötieto, nettotuotto, vaihtotarjouksen laskuri ja kopioitava ilmoitusteksti.

Luonnos tallentuu localStorageen ja erikseen tallennetut arviot IndexedDB:hen. Tietoja ei lähetetä palvelimelle. Edellisen hinnoitteluversion tallennukset avataan uuden hintaperusteen valintaan, eivät suoraan vanhaan hintaehdotukseen. Markkinapaikkalinkit avaavat ulkoisen palvelun vain painettaessa.

## Kehitys ja julkaisu

```sh
npm ci
npm run dev
npm test
node scripts/browser-check.mjs
npm run build:pages
```

Selaintesti tarvitsee käynnissä olevan Viten ja Playwright Chromiumin (`npx playwright install chromium`). Testit tarkistavat myös 320 €:n käyttäjähinnan säilymisen, 349 €:n lähteen alkuperän, väärien mallien ja vanhentuneiden lähteiden hylkäyksen sekä verkkokutsuttoman käyttöpolun. Julkisen sivuston testi käyttää `FLIPGAIN_TEST_URL`-ympäristömuuttujaa.

GitHub Pages julkaisee `main`-haaran `docs`-kansion. Aja `npm run build:pages` ja puske lähdekoodin sekä `docs`-kansion muutokset. Kaikki fontit ovat laitteen omia. Sivun avaaminen uudelleen vaatii yhteyden GitHub Pagesiin; service workeria ei käytetä.
