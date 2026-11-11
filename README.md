# 💰 Finanční liga

Týmová hra pro třídu o **finanční gramotnosti**, ve které si žáci peníze **vydělávají řešením matematických příkladů**.
Inspirováno formátem Climate Rules: učitel hru řídí z počítače (projektor), týmy po 3 hrají na **mobilech**.
Běží jako čistě statická stránka – stačí **GitHub Pages**, žádný vlastní server ani registrace.

## Novinky – 8. kolo (srozumitelný závod, stabilní připojení, správná matematika)

- 🏁 **Závod týmů** má na projektoru nadpis „Závod týmů o největší jmění“, vysvětlení („kdo má víc peněz, je víc vpředu“), jména týmů u drah a popisky konců dráhy.
- 📐 **Matematická sazba KaTeX** (`lib/katex/`, funguje offline): zlomky, mocniny včetně racionálních exponentů, odmocniny, množinové a logické symboly, intervaly, absolutní hodnota, logaritmy a goniometrie se vysází jako skutečná matematika. Převod z textu zadání dělá `mathfmt.js` (generátory úloh zůstaly beze změny, česká desetinná čárka se zachovává). Ve zdrojích úloh lze navíc psát explicitní TeX mezi `$…$`. Test: `NODE_PATH=…/node_modules node test/mathfmt.test.js` (potřebuje `npm i katex`).
- 📶 **Spolehlivější připojení telefonu:** odstraněna syntaxe, kterou starší iPhony (Safari < 16.4) nepřečtou a stránka po načtení „spadla“; připojení po neúspěchu znovu používá spojení se serverem místo budování od nuly, ukazuje kroky 1/3–3/3, po dvou neúspěších nabídne tlačítko *Zkusit znovu* s tipy (Wi‑Fi × mobilní data, VPN). Při neočekávané chybě se zobrazí hláška s tlačítkem *Načíst znovu*, ne prázdná stránka. Více STUN serverů; TURN lze nastavit v `config.js`.

## Novinky v této verzi

- 🤖 **Demo bez telefonů** (úvodní stránka) a tlačítko *Přidat boty* v lobby – učitel si hru vyzkouší sám.
- ⏸ **Pauza** ve fázi práce i rozhodování.
- 🔍 **Diagnostika:** na konci přehled úspěšnosti podle témat s doporučením, co zopakovat; osobní přehled pro žáka; **export výsledků žáků do CSV**.
- 💬 **Otázky do diskuse** ke každé události roku, 🏅 ocenění na konci hry.
- 💬 **Návrhy v týmu** – členové bez role mohou držiteli role navrhnout krok; přehled „co jste letos udělali“.
- 📉 **Reálná hodnota majetku** po zohlednění inflace; tipy k volbě obtížnosti (po dvou chybách lehčí, po sérii těžší).
- 📖 `metodika.html` – metodický list (časový plán, role, události, cíle) k vytištění.
- ✅ `test/` – kontrola generátorů úloh (`node test/tasks.test.js`) a simulace ekonomiky (`node test/economy.sim.js`).

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

## Nasazení na GitHub Pages (5 minut)

1. Na GitHubu vytvoř nový **veřejný** repozitář (např. `financni-liga`).
2. Nahraj do něj **celý obsah této složky** (včetně složky `lib/` a souboru `.nojekyll`). Přes web: *Add file → Upload files*.
3. *Settings → Pages → Build and deployment → Source: Deploy from a branch*, větev `main`, složka `/ (root)` → *Save*.
4. Za minutu je hra na `https://TVOJE-JMENO.github.io/financni-liga/`.

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

### Novinky – 3. kolo (ekonom, učitel, UX, UI)
- **Ekonomika:** pojištění 300 Kč, nasycení trhu (každý další kus téhož majetku vynáší o 12 % méně), životní náklady podle počtu členů týmu, přeladěné výnosy dílny a tech, méně lokálních událostí.
- **Učitel:** výběr povolených obtížností, u každého týmu počet vyřešených úloh na člena a upozornění na neaktivní, tlačítko „Všichni hotovi“, celá obrazovka pro projektor.
- **UX:** týmové tlačítko „Jsme hotovi“, jednorázové nápovědy v 1. roce, vysvětlení nasycení trhu, blesk při změně peněz.
- **UI:** dotykové cíle ≥ 44 px, viditelný focus, větší písmo na projektoru, podpora vyššího kontrastu.
- **Testy:** `node test/rules.test.js` (invarianty pravidel) vedle `tasks.test.js` a `economy.sim.js`.

### Novinky – 4. kolo (marketing, didaktik, znuděný žák, matematik)
- **Matematika:** opravena chybná správná odpověď u úlohy √((x+k)²) pro x < −k (hra uznávala 4 − x místo −x − 4); nesmyslný distraktor „vyvrácená podmínka“ nahrazen. Nový `test/algebra.verify.js` nezávisle numericky ověřuje ~2 000 algebraických úloh (správná je právě jedna volba).
- **Žák:** úlohy se neopakují (40 posledních zadání, stejný typ max. 1× za 4 úlohy, téma nikdy 2× po sobě); na telefonu je živé pořadí týmů.
- **Didaktik:** každá zhruba třetí úloha se vrací k žákovu nejslabšímu tématu (značka „🔁 Procvičení“).
- **Proti tipování:** chyba v lehké úloze stojí 30 Kč, ano/ne úlohy dávají poloviční odměnu, po chybě následuje pauza 3 s (8 s po druhé chybě po sobě) na přečtení řešení.
- **Marketing:** úvod uvádí délku, počet žáků a požadavky; rozlišení hlavního a vedlejšího tlačítka; přesné vyjádření k ochraně dat (veřejný PeerJS broker vidí jen anonymní kód hry).


### Vizuál – 5. kolo (zelený fintech styl)
- Tmavě zelené přechody s limetkovým akcentem, skleněné karty, velké zaoblení, pilulková tlačítka, font **Plus Jakarta Sans** (SIL Open Font License, uložen lokálně v `lib/fonts/`, takže funguje i offline).
- Barvy jsou tokeny na začátku `style.css` (`--lime`, `--bg`, `--panel`…), změna palety je otázka pár řádků.

### Minimalistický redesign – 6. kolo
- Rozhodování na telefonu: nahoře vždy vidět hotovost, pak jen **tvoje oblast** (ostatní role jsou sbalené a jde u nich jen „💬 Navrhnout“), kratší popisy, méně tlačítek.
- Plochý, klidný vzhled: méně rámečků a ozdob, limetková jen pro peníze a hlavní akci, zašedlé nedostupné akce.
- Úvodní stránka zkrácena na to podstatné (hlavní akce, 4 kroky, 3 přínosy).

### Pro těkavou pozornost – 7. kolo
- **Okamžitá odměna:** správná odpověď = velké ✓, částka a výbuch mincí; chyba = zatřesení a červené −. Série ukazují tři plamínkové body.
- **Méně čtení:** výběr obtížnosti jsou tři barevné dlaždice s jedinou číslicí; událost je obří ikona a dlaždice čísel; podniky jsou dlaždice s výnosem a „semafory“ rizika; vysvětlení řešení je schované za „💡 Proč?“.
- **Plynulost:** „Další úloha“ je jedno velké tlačítko (stejná obtížnost), po chybě krátké odpočítávání místo hlášky. Tenký pruh času nahoře se zbarví do červena.
- **Projektor:** kruhový časovač a **závodní dráha** týmů místo odstavce textu; vyúčtování roku je jedno velké ▲/▼ a sloupcový žebříček; na konci padá konfeti.
- **Opravy:** týmy už nemají stejné zvíře, číslo „1 340“ se čte s mezerou.
