# 💰 Finanční liga

Týmová hra pro třídu o **finanční gramotnosti**, ve které si žáci peníze **vydělávají řešením matematických příkladů**.
Učitel hru řídí z počítače (projektor), týmy po 3 hrají na **mobilech**. Běží jako čistě statická stránka – žádný vlastní server ani registrace.

## Jak se hraje

Každý **rok** hry má 5 kroků:

1. **Událost roku** (projektor i mobily) – např. inflace, recese, daňová reforma, technologický boom. Mění úroky, daně, odměny i výnosy podniků.
2. **Práce** (3–5 min) – každý žák na mobilu řeší příklady. Vybírá obtížnost: 🟢 100 Kč / 🟡 250 Kč / 🔴 500 Kč; chyba u střední a těžké úlohy stojí 50 / 150 Kč. Každá 3. správná odpověď v řadě = bonus.
3. **Rozhodování** (1–5 min) – tým společně hospodaří. Každý člen má **roli**:
   - 💼 **Ředitel** – kupuje a prodává podniky (kavárna, dílna, startup, nemovitost),
   - 🏦 **Finančník** – spoří (úrok) a půjčuje si (úvěr),
   - 🛡️ **Správce** – pojištění proti náhodným škodám a školení (+15 % odměn za úroveň).
4. **Vyúčtování** – úroky, výnosy podniků, daň z příjmů, životní náklady, náhodná událost týmu (škoda / dotace). Učitel ukáže „poučení“ k události.
5. Další rok…

**Vyhrává se plněním tajných cílů**, ne bohatstvím (např. „Rezerva do nouze“, „Bez dluhů“, „Diverzifikace“, „Matematický mozek“). Při shodě rozhoduje čisté jmění. Na konci je prostor pro diskusi.

## Průběh hodiny

1. Učitel na počítači otevře adresu hry → **Učitel → Vytvořit novou hru**. Zobrazí se QR kód a kód hry.
2. Žáci naskenují QR kód, zadají jméno a **vytvoří tým / přidají se** (max. 3). Nepřiřazené učitel rozdělí tlačítkem *Rozdělit po 3*.
3. V lobby lze nastavit počet let, délku fází, startovní kapitál a **okruhy učiva** (zaškrtávací políčka).
4. *Spustit hru*. Dál učitel jen ťuká na velké tlačítko (fáze Práce a Rozhodování se po uplynutí času přepnou samy, lze přidat +30 s).
5. Doporučená délka: 6 let ≈ 50–60 min (4 min práce + 2,5 min rozhodování + události).

Když se učiteli zavře okno, hra se dá obnovit (*Pokračovat v rozehrané hře*); telefony se připojí zpět samy. Hru drží v paměti učitelský počítač – po dobu hry ho nezavírejte ani neuspávejte.

## Pokrytí učiva

| Okruh | Typy úloh |
|---|---|
| Základní poznatky | výrok, pravdivost, definice×věta×axiom, nutná/postačující podmínka, obrácená věta a obměna, protipříklad, metody důkazu, kvantifikované výroky |
| Množiny | inkluze, rovnost, ∪ ∩ ∖, doplněk, počet prvků, počet podmnožin, intervaly, tři množiny |
| Výroková logika | pravdivostní hodnoty, tabulky, negace (De Morgan, kvantifikátory), tautologie, ekvivalence |
| Číselné obory | ℕ ℤ ℚ ℝ, absolutní hodnota, dělitelnost, NSD/NSN, prvočísla, počet dělitelů, zbytky |
| Mocniny | celý/záporný/racionální exponent, odmocniny, částečné odmocnění, usměrnění |
| Výrazy | mnohočleny, vzorce, rozklad, definiční obor, krácení, sčítání/násobení lomených výrazů, mocniny a odmocniny výrazů |
| Rovnice a nerovnice | lineární + soustavy, kvadratické (D, Viètovy vztahy, parametr), součinový/podílový tvar, absolutní hodnota, neznámá ve jmenovateli a pod odmocninou (s „pastmi“ – kořen, který nevyhovuje), exponenciální, logaritmické, goniometrické |

Každý okruh má 3 obtížnosti. Úlohy se generují náhodně a **vyhodnocuje je učitelský počítač** (žák ve svém telefonu správnou odpověď nemá). Číselné odpovědi lze zadat i zlomkem (`3/4`) nebo desetinným číslem (`0,75`).

## Když se telefony nepřipojí

Spojení mezi telefony a učitelským počítačem je **přímé (WebRTC, knihovna PeerJS)**; veřejný PeerJS server slouží jen k „seznámení“ zařízení. Obvykle to funguje na školní Wi-Fi i na mobilních datech. Pokud ne:

- zkuste, aby žáci byli na **stejné Wi-Fi** jako učitel, případně naopak na **mobilních datech**,
- některé školní sítě WebRTC blokují (tzv. client isolation / přísný firewall). Pomůže **TURN server** – zapište ho do `config.js` (`iceServers`). Pro školní použití lze pronajmout nebo provozovat vlastní (např. coturn),
- pokud by veřejný PeerJS server nebyl dostupný, lze provozovat vlastní (`npx peer --port 9000`) a zapsat ho do `config.js` (`peer`).

## Struktura

- `index.html`, `style.css`, `main.js` – rozcestník a vzhled
- `tasks.js` – generátory matematických úloh (sem lze snadno přidávat další funkcí `reg(okruh, obtížnosti, název, funkce)`)
- `engine.js` – pravidla hry (ekonomika, události, role, tajné cíle); ladit čísla lze v konstantách na začátku souboru
- `host.js` – obrazovka učitele + „server“ hry; `player.js` – obrazovka žáka; `net.js` – spojení
- `metodika.html`, `manifest.webmanifest`, `og.png` – metodika a náhled při sdílení odkazu
- `test/` – testy
- `lib/` – PeerJS a generátor QR kódů (přibaleno, hra nepotřebuje žádné CDN)

## Ladění ekonomiky

V `engine.js`: `EVENTS` (události), `ASSETS` (podniky, výnosy a rizika), `BASE`/`PEN` (odměny a pokuty za úlohy), `LIVING` (životní náklady), `GOALS` (tajné cíle a jejich prahy).
