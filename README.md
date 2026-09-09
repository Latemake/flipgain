# Flipgain

Sivusto: https://latemake.github.io/flipgain/

Selaimessa toimiva suomenkielinen myynti- ja vaihtolaskuri. Ei kuvia, taustapalvelinta, API-avaimia tai tekoälykutsuja. Sovellus toimii sivun lataamisen jälkeen myös ilman verkkoyhteyttä. Sivun avaaminen uudelleen vaatii yhteyden GitHub Pagesiin; sovellus ei asenna service workeria.

## Käyttöpolku

1. Tuotteen nimi ja tuoteryhmä.
2. Kuntoluokka ja vapaaehtoinen kuvaus.
3. Ikä ja saman mallin hinta uutena.
4. Tavoite: myynti, nopea kauppa tai vaihto.
5. Oma hankintahinta ja mahdolliset myyntikulut (valinnaiset).
6. Tarkistus ja laskennallinen hintapyyntö, kulut, voitto/tappio sekä ilmoitusteksti.

Tietoja kysytään yksi vaihe kerrallaan. Vaihtolaskuri vertaa käyttäjän antamaa vaihtokohteen jälleenmyyntiarviota, myyntikuluja, palkkiota ja välirahaa suoraan myyntiin. Markkinapaikkalinkit avaavat ulkoisen sivun vain painettaessa.

## Mitä arvio tarkoittaa

Hintapyyntö = käyttäjän antama uushinta × tuoteryhmän lähtökerroin × exp(−arvonalenemiskerroin × ikä vuosina) × kuntokerroin × tavoitekerroin.

Kertoimet ovat tämän työkalun **suunnitteluoletuksia**, eivät markkinadatasta opittuja lukuja. Niiden tarkat arvot ovat `src/valuation.js`-tiedostossa, ja laskentaperusteet näytetään käyttäjälle. Nopean kaupan kerroin on 0,9, muiden 1. Esitetty vaihteluväli on malliin valittu vaihtelu, ei tilastollinen luottamusväli. Todellinen kauppahinta voi poiketa siitä huomattavasti.

Tuotteen nimeä tai vapaata kuvausta ei tulkita hinnan määrittämiseksi. Vapaa kuvaus siirtyy ilmoitustekstiin. Harvinaisuutta, mallikohtaista kysyntää, sesonkihintoja tai uusia myynti-ilmoituksia ei haeta. Keräilylle, antiikille ja taiteelle ei anneta numeerista hinta-arviota yleisellä mallilla. Viallisen tuotteen arvo voi olla nolla. Voittolaskelma ei sisällä veroja tai oman työn hintaa.

## Tallennukset

Luonnos tallentuu localStorageen ja erikseen tallennetut arviot IndexedDB:hen tässä selaimessa. Tuotetietoja ei lähetetä palvelimelle. Edellisen version tallennetut tuotteet voidaan avata tietojen täydentämistä varten; niiden kuvia ei näytetä eikä käytetä. Selaimen tietojen poistaminen poistaa paikalliset tallennukset.

## Kehitys ja julkaisu

```sh
npm ci
npm run dev
npm test
node scripts/browser-check.mjs
npm run build:pages
```

Selaintesti tarvitsee käynnissä olevan Viten ja Playwright Chromiumin (`npx playwright install chromium`). Se testaa koko lomakkeen ilman verkkoyhteyttä ja varmistaa, ettei sovellus tee API-kutsuja. Tuotantotarkistuksen osoitteen voi antaa `FLIPGAIN_TEST_URL`-ympäristömuuttujalla.

GitHub Pages julkaisee `main`-haaran `docs`-kansion. Aja `npm run build:pages` ja puske lähdekoodin sekä `docs`-kansion muutokset. Taustapalvelua ei tarvita. Kaikki fontit ovat laitteen omia, eikä ulkoisia fontti- tai analytiikkapalveluja kutsuta.
