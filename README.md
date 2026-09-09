# Flipgain

Sivusto: https://latemake.github.io/flipgain/

GitHub Pages julkaisee `main`-haaran `docs`-kansion. Päivitä sivusto ajamalla `npm test` ja `npm run build:pages`, lisää muutokset Git-commitiin ja puske `main` GitHubiin. `docs/.nojekyll` ohittaa Jekyll-käsittelyn. Julkaisu käyttää GitHubin omaa Pages-työnkulkua.

Suomenkielinen selainprototyyppi oman tuotteen jälleenmyynnin suunnitteluun.

## Käynnistä

```sh
npm install
npm run dev
```

Avaa terminaalissa näkyvä paikallinen osoite. Tuotantokäännös: `npm run build`. Laskennan testit: `npm test`.

## Toiminnot

- Tuotteen hankinta- ja myyntihinta, toimitus, kunnostus sekä prosenttipohjainen välityspalkkio.
- Voitto, tuotto suhteessa kokonaiskustannuksiin ja kulut kattava myyntihinta.
- Myyntihinnan herkkyysvertailu (−15 %, oma oletus, +15 %).
- Kuntoon ja käyttäjän kysyntäarvioon perustuva yksinkertainen myynnin helppouden luokitus.
- Laskelmien tallennus, avaaminen ja poistaminen selaimen localStoragessa.
- Kolme kuvitteellista esimerkkiä. Kuvitukset ovat projektin omia SVG-kuvia.

## Rajaus ja jatkokehitys

Prototyyppi ei hae markkinadataa eikä arvioi hintaa itsenäisesti. Myyntikanavan valinta ei muuta hintaa tai palkkiota automaattisesti. Kaikki hinnat ja kulut ovat käyttäjän oletuksia; veroja tai oman työn hintaa ei lasketa. Tallennukset ovat selainkohtaisia, eivät pilvipalvelussa.

Vaihtokaupan voi mallintaa manuaalisesti arvioimalla saadun tuotteen jälleenmyyntihinnan ja lisäämällä maksettavan välirahan kuluihin. Erillinen kahden tuotteen vaihtoanalyysi on jatkokehitystä.

Tuotantoversio tarvitsee luvallisen markkinatietolähteen, vertailutuotteiden tunnistuksen, pyynti- ja toteutuneiden hintojen erottelun sekä aineistoon perustuvan kysyntä- ja myyntiaika-arvion. Google Fonts on ulkoinen fonttilähde; järjestelmän varafontit toimivat ilman verkkoyhteyttä.
