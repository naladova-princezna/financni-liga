/* ============================================================
   tasks.js – generátory matematických úloh (maturitní okruhy)
   Úlohy generuje a vyhodnocuje učitelský počítač (host),
   žák dostane jen zadání a možnosti – správná odpověď zůstává u hosta.
   ============================================================ */
(function (root) {
'use strict';

const R = Math.random;
const ri = (a, b) => Math.floor(R() * (b - a + 1)) + a;
const pick = a => a[ri(0, a.length - 1)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const nz = (a, b) => { let x; do { x = ri(a, b); } while (x === 0); return x; };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
const lcm = (a, b) => a / gcd(a, b) * b;
const MINUS = '−';

const N = n => {
  if (typeof n === 'number' && !Number.isInteger(n)) n = +n.toFixed(6);
  return String(n).replace('.', ',').replace('-', MINUS);
};
const SUPm = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const sup = n => String(n).replace(/[0-9-]/g, c => SUPm[c]);
const SUBd = '₀₁₂₃₄₅₆₇₈₉';
const sub = n => String(n).replace(/[0-9]/g, c => SUBd[+c]);
const FR = (a, b) => `<span class="fr"><i>${a}</i><b>${b}</b></span>`;
const SQ = x => '√' + x;

/* racionální čísla [čitatel, jmenovatel] */
const Qn = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
const Qadd = (a, b) => Qn(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const Qmul = (a, b) => Qn(a[0] * b[0], a[1] * b[1]);
const Qv = a => a[0] / a[1];
const rat = a => { const [n, d] = Array.isArray(a) ? a : [a, 1]; if (d === 1) return N(n); return (n < 0 ? MINUS : '') + FR(Math.abs(n), d); };

/* mnohočleny (koeficienty od nejnižšího stupně) */
function term(c, v, e, first) {
  if (c === 0) return '';
  const abs = Math.abs(c), neg = c < 0;
  const body = e === 0 ? N(abs) : (abs === 1 ? '' : N(abs)) + v + (e === 1 ? '' : sup(e));
  if (first) return (neg ? MINUS : '') + body;
  return (neg ? ' ' + MINUS + ' ' : ' + ') + body;
}
function poly(cs, v = 'x') {
  let out = '', first = true;
  for (let e = cs.length - 1; e >= 0; e--) { const t = term(cs[e], v, e, first); if (t) { out += t; first = false; } }
  return out || '0';
}
const lin = (a, b, v = 'x') => poly([b, a], v);
const padd = (p, q) => { const n = Math.max(p.length, q.length), r = []; for (let i = 0; i < n; i++) r.push((p[i] || 0) + (q[i] || 0)); return r; };
const pneg = p => p.map(x => -x);
const pmul = (p, q) => { const r = Array(p.length + q.length - 1).fill(0); p.forEach((a, i) => q.forEach((b, j) => r[i + j] += a * b)); return r; };
const pval = (p, x) => p.reduce((s, c, i) => s + c * Math.pow(x, i), 0);
const fx = r => r === 0 ? 'x' : (r > 0 ? `(x ${MINUS} ${r})` : `(x + ${-r})`);   // činitel (x − r)
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const par = n => n < 0 ? '(' + N(n) + ')' : N(n);                       // záporné číslo do závorky
const xs = a => a === 0 ? 'x' : (a > 0 ? `x ${MINUS} ${a}` : `x + ${-a}`); // x − a (a = kořen)
const ax = a => a === 0 ? 'x' : (a > 0 ? `x + ${a}` : `x ${MINUS} ${-a}`); // x + a

/* ---------- konstruktory úloh ---------- */
function mc(q, correct, wrongs, expl, opts = {}) {
  const seen = new Set([correct]); const w = [];
  for (const x of shuffle(wrongs)) { if (!seen.has(x)) { seen.add(x); w.push(x); } if (w.length >= (opts.n || 3)) break; }
  if (w.length < 1) throw new Error('málo možností: ' + q);
  const choices = opts.keepOrder ? [correct, ...w] : shuffle([correct, ...w]);
  return { type: 'mc', q, choices, correct: choices.indexOf(correct), ansText: correct, expl: expl || '' };
}
function numQ(q, ans, expl, ansText, hint) {
  return { type: 'num', q, ans, ansText: ansText != null ? ansText : N(ans), expl: expl || '', hint: hint || '' };
}
function numMC(q, c, expl, fmt = N, extra = []) {
  const cand = [c + 1, c - 1, c + 2, c - 2, -c, c * 2, c + 10, c - 10, c + 3, c - 3, ...extra].filter(x => x !== c && isFinite(x));
  return mc(q, fmt(c), cand.map(fmt), expl);
}
const FRACHINT = 'Zlomek zapiš jako a/b (např. 3/4) nebo desetinným číslem.';

const TOPICS = [
  { id: 'zaklady', name: 'Základy matematiky', emoji: '📐', hint: 'výrok, definice, věta, důkaz' },
  { id: 'mnoziny', name: 'Množiny', emoji: '🔵', hint: 'inkluze, rovnost, operace' },
  { id: 'logika', name: 'Výroková logika', emoji: '🧠', hint: 'pravdivost, tautologie, negace' },
  { id: 'obory', name: 'Číselné obory', emoji: '🔢', hint: 'ℕ ℤ ℚ ℝ, |x|, dělitelnost' },
  { id: 'mocniny', name: 'Mocniny a odmocniny', emoji: '⚡', hint: 'celý, racionální exponent' },
  { id: 'vyrazy', name: 'Výrazy s proměnnými', emoji: '🧮', hint: 'mnohočleny, lomené výrazy' },
  { id: 'rovnice', name: 'Rovnice a nerovnice', emoji: '⚖️', hint: 'lineární … goniometrické' },
];
const G = {}; TOPICS.forEach(t => G[t.id] = { 1: [], 2: [], 3: [] });
const reg = (topic, diffs, name, fn) => { for (const d of [].concat(diffs)) G[topic][d].push({ name, fn }); };

/* =====================  1. ZÁKLADY MATEMATIKY  ===================== */
const VYROKY = ['Číslo 7 je prvočíslo.', 'Každý čtverec je obdélník.', 'Číslo 15 je sudé.', 'Praha je hlavní město České republiky.', 'Číslo 2 je největší prvočíslo.', 'Trojúhelník má čtyři vrcholy.', 'Číslo 100 je dělitelné čtyřmi.', 'Pro každé reálné číslo x platí x² ≥ 0.', 'Rovnice x + 3 = 3 má řešení x = 0.', 'Součet vnitřních úhlů trojúhelníku je 180°.'];
const NEVYROKY = ['Kolik je 3 + 5?', 'x + 4 = 9', 'Otevři okno!', 'Číslo n je dělitelné třemi.', 'Jaké je dnes počasí?', 'Spočítej obsah čtverce.', '2x > 10', 'Zavři prosím dveře.', 'Je číslo 17 prvočíslo?', 'Číslo x je menší než 5.'];
reg('zaklady', 1, 'výrok', () => mc('Která z následujících vět je <b>výrok</b>?', pick(VYROKY), shuffle(NEVYROKY).slice(0, 3),
  'Výrok je tvrzení, o kterém lze rozhodnout, zda je pravdivé, či nepravdivé. Otázky, rozkazy a výrazy s proměnnou (bez kvantifikátoru) výroky nejsou.'));
reg('zaklady', 1, 'pravdivost', () => {
  const n = ri(12, 99), k = pick([2, 3, 4, 5, 6, 7, 9]); const t = n % k === 0;
  return mc(`Určete pravdivostní hodnotu výroku: „Číslo ${n} je dělitelné číslem ${k}.“`, t ? 'Pravdivý' : 'Nepravdivý', [t ? 'Nepravdivý' : 'Pravdivý'],
    `${n} : ${k} dává zbytek ${n % k}.`, { n: 1, keepOrder: false });
});
const POJMY1 = [
  ['Přesné vymezení nového pojmu pomocí pojmů již známých se nazývá…', 'definice', ['věta', 'důkaz', 'axiom']],
  ['Tvrzení, které přijímáme bez důkazu, se nazývá…', 'axiom', ['definice', 'věta', 'protipříklad']],
  ['Pravdivé tvrzení, které je třeba dokázat, se nazývá…', 'věta', ['axiom', 'definice', 'protipříklad']],
  ['K vyvrácení obecného tvrzení („pro každé…“) stačí najít…', 'jeden protipříklad', ['mnoho příkladů, kdy tvrzení platí', 'jeden příklad, kdy tvrzení platí', 'obrácenou větu']],
  ['Tvrzení „Každé prvočíslo je liché“ vyvrátíme protipříkladem:', 'číslo 2', ['číslo 3', 'číslo 9', 'číslo 15']],
];
const POJMY2 = [
  ['Platí-li věta „A ⇒ B“, je A vzhledem k B…', 'postačující podmínka', ['nutná podmínka', 'nutná i postačující podmínka', 'vyvrácená podmínka']],
  ['Platí-li věta „A ⇒ B“, je B vzhledem k A…', 'nutná podmínka', ['postačující podmínka', 'nutná i postačující podmínka', 'obměna']],
  ['Věta „A ⇔ B“ říká, že A je pro B…', 'nutná i postačující podmínka', ['pouze nutná podmínka', 'pouze postačující podmínka', 'ani nutná, ani postačující podmínka']],
  ['Důkaz, v němž předpokládáme, že tvrzení neplatí, a dojdeme ke sporu, je…', 'důkaz sporem', ['přímý důkaz', 'důkaz obměnou', 'důkaz protipříkladem']],
  ['Důkaz implikace A ⇒ B pomocí implikace ¬B ⇒ ¬A je…', 'nepřímý důkaz (obměnou)', ['přímý důkaz', 'důkaz sporem', 'důkaz protipříkladem']],
  ['Důkaz, který postupuje od předpokladů řadou správných kroků k závěru, se nazývá…', 'přímý důkaz', ['důkaz sporem', 'důkaz obměnou', 'důkaz protipříkladem']],
];
reg('zaklady', 1, 'pojmy1', () => { const [q, c, w] = pick(POJMY1); return mc(q, c, w); });
reg('zaklady', [2, 3], 'pojmy2', () => { const [q, c, w] = pick(POJMY2); return mc(q, c, w); });

const IMPL = [
  ['číslo je dělitelné šesti', 'číslo není dělitelné šesti', 'číslo je sudé', 'číslo není sudé'],
  ['čtyřúhelník je čtverec', 'čtyřúhelník není čtverec', 'čtyřúhelník je obdélník', 'čtyřúhelník není obdélník'],
  ['číslo je dělitelné deseti', 'číslo není dělitelné deseti', 'číslo je dělitelné pěti', 'číslo není dělitelné pěti'],
  ['trojúhelník je rovnostranný', 'trojúhelník není rovnostranný', 'trojúhelník je rovnoramenný', 'trojúhelník není rovnoramenný'],
  ['číslo je přirozené', 'číslo není přirozené', 'číslo je celé', 'číslo není celé'],
];
reg('zaklady', 2, 'obrácená věta', () => {
  const [A, nA, B, nB] = pick(IMPL); const form = (x, y) => `Jestliže ${x}, pak ${y}.`;
  const kind = pick(['obr', 'obm']);
  const ask = kind === 'obr' ? 'obrácená věta' : 'obměna (kontrapozice)';
  const right = kind === 'obr' ? form(B, A) : form(nB, nA);
  const wrongs = [kind === 'obr' ? form(nB, nA) : form(B, A), form(nA, nB), `${cap(A)}, ale ${nB}.`];
  return mc(`Je dána věta: „${form(A, B)}“ Která z vět je její <b>${ask}</b>?`, right, wrongs,
    'Obrácená věta: B ⇒ A. Obměna: ¬B ⇒ ¬A (ta je s původní větou ekvivalentní). Věta ¬A ⇒ ¬B je tzv. opačná.');
});
reg('zaklady', 2, 'protipříklad', () => {
  const k = pick([4, 8, 9, 12, 16, 18, 25]);
  const C = [], W = [];
  for (let n = 2; n <= 60; n++) { (n * n % k === 0 && n % k !== 0 ? C : W).push(n); }
  const c = pick(C), w = shuffle(W).slice(0, 3);
  return mc(`Tvrzení: „Je-li n² dělitelné číslem ${k}, pak je i n dělitelné číslem ${k}.“ Které n je <b>protipříklad</b>?`, String(c), w.map(String),
    `Pro n = ${c} je n² = ${c * c} dělitelné ${k}, ale ${c} dělitelné ${k} není.`);
});
const KVANT = [
  ['∀x ∈ ℝ: x² ≥ 0', true, 'Druhá mocnina reálného čísla není záporná.'],
  ['∀x ∈ ℝ: x² ≥ x', false, 'Protipříklad x = ½: ¼ < ½.'],
  ['∃x ∈ ℕ: x² = 2', false, 'Rovnice x² = 2 nemá v ℕ řešení (√2 je iracionální).'],
  ['∀n ∈ ℕ: n² + n je sudé číslo', true, 'n² + n = n(n + 1) – součin dvou po sobě jdoucích čísel je sudý.'],
  ['∀a, b ∈ ℝ: (a + b)² = a² + b²', false, 'Chybí člen 2ab; protipříklad a = b = 1.'],
  ['∃x ∈ ℝ: x² + 1 = 0', false, 'x² + 1 ≥ 1 > 0 pro všechna reálná x.'],
  ['∀x ∈ ℝ: |x| ≥ x', true, 'Absolutní hodnota je vždy alespoň tak velká jako číslo samo.'],
  ['∀n ∈ ℕ: n² > n', false, 'Protipříklad n = 1: 1 > 1 neplatí.'],
  ['∀x ∈ ℝ: √(x²) = x', false, 'Protipříklad x = −2: √4 = 2 ≠ −2 (platí √(x²) = |x|).'],
  ['∃x ∈ ℝ: x² = 9', true, 'Například x = 3.'],
];
reg('zaklady', 3, 'kvantifikátory', () => { const [s, t, e] = pick(KVANT); return mc(`Rozhodněte o pravdivosti výroku: <b>${s}</b>`, t ? 'Pravdivý' : 'Nepravdivý', [t ? 'Nepravdivý' : 'Pravdivý'], e, { n: 1 }); });
reg('zaklady', 3, 'protipříklad2', () => {
  const C = [{ s: 'Součet dvou iracionálních čísel je iracionální.', c: '√2 + (−√2)', w: ['√2 + √3', 'π + 1', '√2 · √2'] },
  { s: 'Každé číslo dělitelné šesti je dělitelné dvanácti.', c: '18', w: ['24', '36', '60'] },
  { s: 'Pro každé přirozené n je n² + n + 41 prvočíslo.', c: '41', w: ['1', '2', '3'] }];
  const o = pick(C);
  return mc(`Tvrzení: „${o.s}“ Který z příkladů je <b>protipříklad</b>?`, o.c, o.w, 'Protipříklad je konkrétní případ, pro který tvrzení neplatí.');
});

/* =====================  2. MNOŽINY  ===================== */
const U9 = [1, 2, 3, 4, 5, 6, 7, 8, 9], U10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const subset = (U, min, max) => shuffle(U).slice(0, ri(min, max)).sort((a, b) => a - b);
const S = a => a.length ? '{' + a.join(', ') + '}' : '∅';
const uni = (a, b) => [...new Set([...a, ...b])].sort((x, y) => x - y);
const inter = (a, b) => a.filter(x => b.includes(x));
const diff = (a, b) => a.filter(x => !b.includes(x));
reg('mnoziny', 1, 'operace', () => {
  let A, B; do { A = subset(U9, 3, 5); B = subset(U9, 3, 5); } while (!(inter(A, B).length && diff(A, B).length && diff(B, A).length));
  const ops = [['∪', uni(A, B), 'sjednocení – prvky z A nebo z B'], ['∩', inter(A, B), 'průnik – prvky z A i z B'], ['∖', diff(A, B), 'rozdíl – prvky z A, které nejsou v B']];
  const [sym, res, ex] = pick(ops);
  const all = [uni(A, B), inter(A, B), diff(A, B), diff(B, A), uni(diff(A, B), diff(B, A))].map(S);
  return mc(`A = ${S(A)}, B = ${S(B)}. Určete A ${sym} B.`, S(res), all, `A ${sym} B: ${ex}.`);
});
reg('mnoziny', 1, 'inkluze', () => {
  const B = subset(U10, 5, 7), A = shuffle(B).slice(0, ri(2, 3)).sort((a, b) => a - b);
  return mc(`A = ${S(A)}, B = ${S(B)}. Která z relací platí?`, 'A ⊂ B', ['B ⊂ A', 'A = B', 'A ∩ B = ∅', 'A ∪ B = A', 'A ∩ B = B'],
    'Každý prvek množiny A leží v B, ale B má navíc další prvky – A je vlastní podmnožina B.');
});
reg('mnoziny', 2, 'počet prvků', () => {
  const a = ri(8, 20), b = ri(8, 20), c = ri(2, Math.min(a, b) - 2); const k = ri(0, 2);
  if (k === 0) return numQ(`|A| = ${a}, |B| = ${b}, |A ∩ B| = ${c}. Kolik prvků má A ∪ B?`, a + b - c, `|A ∪ B| = |A| + |B| − |A ∩ B| = ${a} + ${b} − ${c}.`);
  if (k === 1) return numQ(`|A| = ${a}, |B| = ${b}, |A ∩ B| = ${c}. Kolik prvků má rozdíl A ∖ B?`, a - c, `|A ∖ B| = |A| − |A ∩ B| = ${a} − ${c}.`);
  return numQ(`|A| = ${a}, |B| = ${b}, |A ∪ B| = ${a + b - c}. Kolik prvků má průnik A ∩ B?`, c, `|A ∩ B| = |A| + |B| − |A ∪ B| = ${a} + ${b} − ${a + b - c}.`);
});
reg('mnoziny', 2, 'podmnožiny', () => { const n = ri(3, 7); return numQ(`Kolik všech podmnožin (včetně prázdné a celé množiny) má množina o ${n} prvcích?`, 2 ** n, `Každý prvek buď v podmnožině je, nebo není: 2${sup(n)} = ${2 ** n}.`); });
reg('mnoziny', 2, 'doplněk', () => {
  let A, B; do { A = subset(U10, 3, 5); B = subset(U10, 3, 5); } while (!inter(A, B).length || uni(A, B).length > 8);
  const comp = x => diff(U10, x);
  const form = pick([0, 1]);
  const right = form === 0 ? comp(A) : comp(uni(A, B));
  const lab = form === 0 ? 'A′' : '(A ∪ B)′';
  const wr = [comp(B), comp(inter(A, B)), A, uni(A, B), inter(comp(A), B), uni(comp(A), comp(B))].map(S);
  return mc(`Je dána množina U = {1, 2, …, 10}, A = ${S(A)}, B = ${S(B)}. Určete ${lab} (doplněk v U).`, S(right), wr, 'Doplněk obsahuje všechny prvky U, které do dané množiny nepatří.');
});
reg('mnoziny', 2, 'zápis vlastností', () => {
  const k = pick([2, 3, 4, 5]), n = ri(14, 26);
  const A = []; for (let x = 1; x <= n; x++) if (x % k === 0) A.push(x);
  const wr = [uni(A, [A[A.length - 1] + 1]), A.slice(0, -1), A.map(x => x - 1), A.map(x => x + 1)].filter(a => a.length).map(S);
  return mc(`Vypište prvky množiny A = {x ∈ ℕ | x ≤ ${n} ∧ x je dělitelné číslem ${k}}.`, S(A), wr, `Násobky čísla ${k} nepřevyšující ${n}.`);
});
const ivStr = i => (i.lc ? '⟨' : '(') + N(i.lo) + '; ' + N(i.hi) + (i.hc ? '⟩' : ')');
function ivInter(a, b) {
  let lo, lc, hi, hc;
  if (a.lo > b.lo) { lo = a.lo; lc = a.lc; } else if (a.lo < b.lo) { lo = b.lo; lc = b.lc; } else { lo = a.lo; lc = a.lc && b.lc; }
  if (a.hi < b.hi) { hi = a.hi; hc = a.hc; } else if (a.hi > b.hi) { hi = b.hi; hc = b.hc; } else { hi = a.hi; hc = a.hc && b.hc; }
  return { lo, lc, hi, hc };
}
function ivUnion(a, b) {
  let lo, lc, hi, hc;
  if (a.lo < b.lo) { lo = a.lo; lc = a.lc; } else if (a.lo > b.lo) { lo = b.lo; lc = b.lc; } else { lo = a.lo; lc = a.lc || b.lc; }
  if (a.hi > b.hi) { hi = a.hi; hc = a.hc; } else if (a.hi < b.hi) { hi = b.hi; hc = b.hc; } else { hi = a.hi; hc = a.hc || b.hc; }
  return { lo, lc, hi, hc };
}
reg('mnoziny', 3, 'intervaly', () => {
  const a = ri(-8, 0), c = a + ri(1, 3), b = c + ri(2, 4), d = b + ri(1, 4);
  const A = { lo: a, lc: R() < .5, hi: b, hc: R() < .5 }, B = { lo: c, lc: R() < .5, hi: d, hc: R() < .5 };
  const isInter = R() < .5; const res = isInter ? ivInter(A, B) : ivUnion(A, B);
  const other = isInter ? ivUnion(A, B) : ivInter(A, B);
  const flip = (i, k) => ({ ...i, [k]: !i[k] });
  const wr = [other, flip(res, 'lc'), flip(res, 'hc'), { ...res, lo: isInter ? a : c }].map(ivStr);
  return mc(`A = ${ivStr(A)}, B = ${ivStr(B)}. Určete A ${isInter ? '∩' : '∪'} B.`, ivStr(res), wr,
    isInter ? 'Průnik: větší dolní mez a menší horní mez; kulatá závorka vyhrává, pokud je mez v jednom z intervalů otevřená.' : 'Sjednocení: menší dolní a větší horní mez; mez patří dovnitř, pokud patří aspoň do jednoho intervalu.');
});
reg('mnoziny', 3, 'tři množiny', () => {
  const A = subset(U10, 4, 6), B = subset(U10, 4, 6), C = subset(U10, 3, 6);
  const forms = [['(A ∪ B) ∩ C', inter(uni(A, B), C)], ['A ∖ (B ∪ C)', diff(A, uni(B, C))], ['(A ∩ B) ∪ C', uni(inter(A, B), C)], ['A ∩ (B ∖ C)', inter(A, diff(B, C))], ['(A ∖ B) ∪ (B ∖ C)', uni(diff(A, B), diff(B, C))]];
  const [name, res] = pick(forms);
  const wr = forms.filter(f => f[0] !== name).map(f => S(f[1])).concat([S(inter(inter(A, B), C)), S(uni(uni(A, B), C))]);
  return mc(`A = ${S(A)}, B = ${S(B)}, C = ${S(C)}. Určete ${name}.`, S(res), wr, 'Nejdřív spočítej výraz v závorce, potom zbývající operaci.');
});

/* =====================  3. VÝROKOVÁ LOGIKA  ===================== */
const OPS = { '∧': (a, b) => a && b, '∨': (a, b) => a || b, '⇒': (a, b) => !a || b, '⇔': (a, b) => a === b };
const Fm = (op, a, b) => ({ op, a, b });
const negF = x => ({ neg: x });
const fstr = (f, top = true) => { if (typeof f === 'string') return f; if (f.neg !== undefined) return '¬' + fstr(f.neg, false); const s = fstr(f.a, false) + ' ' + f.op + ' ' + fstr(f.b, false); return top ? s : '(' + s + ')'; };
const fev = (f, env) => { if (typeof f === 'string') return env[f]; if (f.neg !== undefined) return !fev(f.neg, env); return OPS[f.op](fev(f.a, env), fev(f.b, env)); };
const ROWS = [[1, 1], [1, 0], [0, 1], [0, 0]];
const lit = () => { const a = pick(['p', 'q']); return R() < .4 ? negF(a) : a; };
function randF(depth) {
  const ops = Object.keys(OPS);
  for (let i = 0; i < 200; i++) {
    let f = depth === 1 ? Fm(pick(ops), lit(), lit()) : (R() < .5 ? Fm(pick(ops), Fm(pick(ops), lit(), lit()), lit()) : Fm(pick(ops), lit(), Fm(pick(ops), lit(), lit())));
    const s = fstr(f); if (!s.includes('p') || !s.includes('q') || hasDupe(f)) continue;
    const vals = ROWS.map(([p, q]) => fev(f, { p: !!p, q: !!q }));
    if (vals.some(v => v) && vals.some(v => !v)) return f;
  }
  return Fm('⇒', 'p', 'q');
}
const atomOf = x => typeof x === 'string' ? x : (x.neg !== undefined && typeof x.neg === 'string' ? x.neg : null);
function hasDupe(f) { if (typeof f === 'string') return false; if (f.neg !== undefined) return hasDupe(f.neg); const a = atomOf(f.a), b = atomOf(f.b); if (a && b && a === b) return true; return hasDupe(f.a) || hasDupe(f.b); }
const B01 = b => b ? 1 : 0;
reg('logika', 1, 'hodnota', () => {
  const f = randF(1), p = R() < .5, q = R() < .5; const v = fev(f, { p, q });
  return mc(`Je dáno p = ${B01(p)}, q = ${B01(q)} (1 = pravdivý, 0 = nepravdivý). Jakou pravdivostní hodnotu má výrok <b>${fstr(f)}</b>?`, v ? 'Pravdivý (1)' : 'Nepravdivý (0)', [v ? 'Nepravdivý (0)' : 'Pravdivý (1)'],
    `Dosazením: ${fstr(f)} má hodnotu ${B01(v)}. Připomínka: implikace je nepravdivá jen pro 1 ⇒ 0, konjunkce je pravdivá jen pro 1 ∧ 1, disjunkce je nepravdivá jen pro 0 ∨ 0.`, { n: 1 });
});
reg('logika', 1, 'negace jednoduchá', () => {
  const T = [['Číslo 12 je dělitelné čtyřmi.', 'Číslo 12 není dělitelné čtyřmi.', ['Číslo 12 je dělitelné třemi.', 'Číslo 12 je sudé.', 'Číslo 12 je dělitelné dvanácti.']],
  ['Dnes prší.', 'Dnes neprší.', ['Včera pršelo.', 'Dnes svítí slunce a prší.', 'Zítra bude pršet.']],
  ['Trojúhelník je pravoúhlý.', 'Trojúhelník není pravoúhlý.', ['Trojúhelník je ostroúhlý.', 'Trojúhelník je tupoúhlý.', 'Trojúhelník je rovnostranný.']]];
  const [s, n, w] = pick(T);
  return mc(`Zvolte negaci výroku: „${s}“`, n, w.concat([s]), 'Negace jednoduchého výroku je výrok s opačnou pravdivostní hodnotou.');
});
reg('logika', 2, 'tabulka', () => {
  const f = randF(2); const cnt = ROWS.filter(([p, q]) => fev(f, { p: !!p, q: !!q })).length;
  return numQ(`V kolika řádcích pravdivostní tabulky (pro p, q ∈ {0, 1}) má výrok <b>${fstr(f)}</b> hodnotu 1?`, cnt, 'Vyplň tabulku pro všechny čtyři dvojice (p, q).');
});
reg('logika', 2, 'nepravdivý řádek', () => {
  const op = pick(['⇒', '∨']); const f = Fm(op, 'p', 'q');
  const row = op === '⇒' ? [1, 0] : [0, 0];
  const lab = ([p, q]) => `p = ${p}, q = ${q}`;
  return mc(`Pro které hodnoty p, q je výrok <b>${fstr(f)}</b> nepravdivý?`, lab(row), ROWS.filter(r => r.join() !== row.join()).map(lab),
    op === '⇒' ? 'Implikace je nepravdivá jedině tehdy, když z pravdy plyne nepravda (1 ⇒ 0).' : 'Disjunkce je nepravdivá jedině tehdy, když jsou nepravdivé oba výroky.');
});
const NEG = [
  ['¬(p ∧ q)', '¬p ∨ ¬q', ['¬p ∧ ¬q', 'p ∨ q', 'p ∧ ¬q']],
  ['¬(p ∨ q)', '¬p ∧ ¬q', ['¬p ∨ ¬q', 'p ∧ q', '¬p ∨ q']],
  ['¬(p ⇒ q)', 'p ∧ ¬q', ['¬p ⇒ ¬q', '¬p ∧ q', 'q ⇒ p']],
  ['Každé přirozené číslo je sudé.', 'Existuje přirozené číslo, které je liché.', ['Žádné přirozené číslo není sudé.', 'Každé přirozené číslo je liché.', 'Existuje přirozené číslo, které je sudé.']],
  ['∀x ∈ ℝ: x² > 0', '∃x ∈ ℝ: x² ≤ 0', ['∃x ∈ ℝ: x² < 0', '∀x ∈ ℝ: x² ≤ 0', '∃x ∈ ℝ: x² > 0']],
  ['∃x ∈ ℕ: x² = 20', '∀x ∈ ℕ: x² ≠ 20', ['∃x ∈ ℕ: x² ≠ 20', '∀x ∈ ℕ: x² = 20', '∀x ∈ ℕ: x² > 20']],
  ['Všichni žáci třídy napsali test na jedničku.', 'Aspoň jeden žák třídy nenapsal test na jedničku.', ['Žádný žák třídy nenapsal test na jedničku.', 'Všichni žáci třídy napsali test na dvojku.', 'Aspoň jeden žák třídy napsal test na jedničku.']],
  ['Existuje žák, který má pětku.', 'Žádný žák nemá pětku.', ['Každý žák má pětku.', 'Existuje žák, který nemá pětku.', 'Aspoň jeden žák má čtyřku.']],
];
reg('logika', [2, 3], 'negace', () => { const [f, c, w] = pick(NEG); return mc(`Zvolte správnou <b>negaci</b> výroku: ${f}`, c, w, 'De Morganova pravidla a negace kvantifikátorů: ¬∀ = ∃¬, ¬∃ = ∀¬, ¬(p ∧ q) = ¬p ∨ ¬q, ¬(p ∨ q) = ¬p ∧ ¬q, ¬(p ⇒ q) = p ∧ ¬q.'); });
const TAUT = [['p ∨ ¬p', (p, q) => p || !p], ['(p ∧ q) ⇒ p', (p, q) => !(p && q) || p], ['p ⇒ (p ∨ q)', (p, q) => !p || (p || q)], ['¬(p ∧ ¬p)', (p, q) => !(p && !p)], ['(p ⇒ q) ⇔ (¬q ⇒ ¬p)', (p, q) => (!p || q) === (q || !p)], ['¬(p ∧ q) ⇔ (¬p ∨ ¬q)', (p, q) => (!(p && q)) === (!p || !q)], ['p ⇒ (q ⇒ p)', (p, q) => !p || (!q || p)]];
const NONT = [['p ∧ ¬p', (p, q) => p && !p], ['p ⇒ q', (p, q) => !p || q], ['(p ∨ q) ⇒ p', (p, q) => !(p || q) || p], ['p ⇔ ¬p', (p, q) => p === !p], ['q ⇒ (p ∧ q)', (p, q) => !q || (p && q)], ['(p ⇒ q) ⇒ (q ⇒ p)', (p, q) => !(!p || q) || (!q || p)], ['p ∨ q', (p, q) => p || q], ['¬p ⇒ p', (p, q) => !(!p) || p]];
const isTaut = fn => ROWS.every(([p, q]) => fn(!!p, !!q));
reg('logika', 3, 'tautologie', () => {
  const t = pick(TAUT.filter(x => isTaut(x[1]))), n = shuffle(NONT.filter(x => !isTaut(x[1]))).slice(0, 3);
  return mc('Která z formulí je <b>tautologie</b> (pravdivá při všech hodnotách p, q)?', t[0], n.map(x => x[0]), 'Tautologii poznáš tak, že ve všech řádcích tabulky vyjde 1.');
});
const EQP = [['p ⇒ q', (p, q) => !p || q], ['¬q ⇒ ¬p', (p, q) => q || !p], ['¬p ∨ q', (p, q) => !p || q], ['¬(p ∧ ¬q)', (p, q) => !(p && !q)], ['q ⇒ p', (p, q) => !q || p], ['¬p ⇒ ¬q', (p, q) => p || !q], ['p ∧ ¬q', (p, q) => p && !q], ['p ⇔ q', (p, q) => p === q], ['(p ⇒ q) ∧ (q ⇒ p)', (p, q) => (!p || q) && (!q || p)], ['¬p ∧ ¬q', (p, q) => !p && !q], ['¬(p ∨ q)', (p, q) => !(p || q)], ['¬p ∨ ¬q', (p, q) => !p || !q], ['¬(p ∧ q)', (p, q) => !(p && q)], ['p ∨ q', (p, q) => p || q]];
const tt = fn => ROWS.map(([p, q]) => fn(!!p, !!q) ? 1 : 0).join('');
reg('logika', 3, 'ekvivalence', () => {
  const groups = {}; EQP.forEach(x => (groups[tt(x[1])] = groups[tt(x[1])] || []).push(x));
  const multi = Object.values(groups).filter(g => g.length >= 2);
  const g = pick(multi); const [a, b] = shuffle(g);
  const others = EQP.filter(x => tt(x[1]) !== tt(a[1]));
  return mc(`Která formule je ekvivalentní s formulí <b>${a[0]}</b>?`, b[0], shuffle(others).slice(0, 3).map(x => x[0]), 'Ekvivalentní formule mají stejné pravdivostní hodnoty ve všech řádcích tabulky.');
});

/* =====================  4. ČÍSELNÉ OBORY  ===================== */
const OB = {
  N: ['7', '120', '√49', '3²', '<span>12/3</span>'], Z: [MINUS + '4', MINUS + '15', MINUS + '100', MINUS + '9'],
  Q: [FR(3, 4), MINUS + '2,5', '1,25', MINUS + FR(7, 3), '0,2'], I: ['√2', 'π', '√7', '∛5', '1 + √3'],
};
reg('obory', 1, 'zařazení', () => {
  const k = pick(['I', 'Z', 'Q', 'N']);
  const others = Object.keys(OB).filter(x => x !== k).flatMap(x => OB[x]);
  const q = { I: 'Které z čísel je <b>iracionální</b>?', Z: 'Které z čísel patří do ℤ, ale <b>nepatří</b> do ℕ?', Q: 'Které z čísel je racionální, ale <b>není celé</b>?', N: 'Které z čísel patří do množiny ℕ (přirozená čísla = {1, 2, 3, …})?' }[k];
  return mc(q, pick(OB[k]), others, 'ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ. Iracionální čísla (např. √2, π) nelze zapsat zlomkem celých čísel.');
});
reg('obory', 1, 'absolutní hodnota', () => {
  const a = ri(-9, -1), b = ri(1, 9), c = ri(-9, 9); const k = pick([0, 1]);
  return k ? numQ(`Vypočtěte |${N(a)}| + |${N(c)}|.`, Math.abs(a) + Math.abs(c), 'Absolutní hodnota je vzdálenost od nuly, tedy vždy nezáporné číslo.')
    : numQ(`Vypočtěte |${N(a)} − ${b}| − |${N(c)}|.`, Math.abs(a - b) - Math.abs(c), `|${N(a - b)}| − |${N(c)}| = ${Math.abs(a - b)} − ${Math.abs(c)}.`);
});
reg('obory', 1, 'dělitelnost kritéria', () => {
  const k = pick([3, 4, 6, 9]); const m = k * ri(Math.ceil(100 / k), Math.floor(9999 / k));
  const w = shuffle([1, 2, 3, 4, 5, 6, 7, 8].filter(d => d % k !== 0).flatMap(d => [m + d, m - d])).slice(0, 3);
  const ex = { 3: 'ciferný součet je dělitelný třemi', 4: 'poslední dvojčíslí je dělitelné čtyřmi', 6: 'číslo je sudé a ciferný součet je dělitelný třemi', 9: 'ciferný součet je dělitelný devíti' }[k];
  return mc(`Které z čísel je dělitelné číslem ${k}?`, String(m), w.map(String), `Kritérium dělitelnosti ${k}: ${ex}.`);
});
reg('obory', 1, 'NSD', () => { const g = ri(2, 8); let a = g * ri(2, 9), b = g * ri(2, 9); if (a === b) b += g; return numQ(`Určete největší společný dělitel čísel ${a} a ${b}.`, gcd(a, b), 'Rozložíme na prvočinitele, nebo použijeme Euklidův algoritmus.'); });
reg('obory', 2, 'NSN', () => { let a = ri(4, 18), b = ri(4, 18); if (a === b) b++; return numQ(`Určete nejmenší společný násobek čísel ${a} a ${b}.`, lcm(a, b), `n(a, b) = a·b / D(a, b) = ${a}·${b} / ${gcd(a, b)}.`); });
reg('obory', 2, 'prvočísla', () => { const a = ri(10, 60), b = a + ri(15, 30); let c = 0; for (let i = a; i <= b; i++) if (isPrime(i)) c++; return numQ(`Kolik prvočísel leží v intervalu ⟨${a}; ${b}⟩?`, c, 'Prvočíslo má právě dva kladné dělitele – 1 a samo sebe.'); });
function isPrime(n) { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }
reg('obory', 2, 'počet dělitelů', () => {
  const [p, q] = shuffle([2, 3, 5, 7]).slice(0, 2); const a = ri(1, 4), b = ri(1, 3); const n = p ** a * q ** b;
  return numQ(`Kolik kladných dělitelů má číslo ${n}?`, (a + 1) * (b + 1), `${n} = ${p}${sup(a)} · ${q}${sup(b)}, počet dělitelů je (${a} + 1)(${b} + 1).`);
});
reg('obory', 2, 'porovnání zlomků', () => {
  for (; ;) {
    const fs = []; while (fs.length < 4) { const d = ri(3, 12), n = ri(1, d - 1); if (!fs.some(f => f[0] / f[1] === n / d)) fs.push([n, d]); }
    const mx = fs.reduce((m, f) => f[0] / f[1] > m[0] / m[1] ? f : m);
    if (fs.filter(f => f[0] / f[1] > mx[0] / mx[1] - 0.01).length > 1) continue;
    return mc('Které z čísel je <b>největší</b>?', FR(mx[0], mx[1]), fs.filter(f => f !== mx).map(f => FR(f[0], f[1])), 'Zlomky převedeme na společného jmenovatele nebo na desetinná čísla: ' + fs.map(f => `${f[0]}/${f[1]} ≈ ${(f[0] / f[1]).toFixed(3).replace('.', ',')}`).join('; '));
  }
});
reg('obory', 2, 'zbytek', () => { const n = ri(100, 999), k = ri(7, 19); const neg = R() < .5; const z = neg ? ((-n) % k + k) % k : n % k; return numQ(`Jaký je zbytek (0 ≤ r < ${k}) při dělení čísla ${neg ? MINUS : ''}${n} číslem ${k} v oboru celých čísel?`, z, neg ? `${N(-n)} = ${k}·${par(Math.floor(-n / k))} + ${z}.` : `${n} = ${k}·${Math.floor(n / k)} + ${z}.`); });
reg('obory', 3, 'abs počet', () => {
  const a = ri(-5, 5), b = ri(2, 7), strict = R() < .5;
  return numQ(`Kolik celých čísel x splňuje nerovnici |x ${a < 0 ? '+ ' + (-a) : a > 0 ? MINUS + ' ' + a : ''}| ${strict ? '<' : '≤'} ${b}?`.replace('|x |', '|x|'), strict ? 2 * b - 1 : 2 * b + 1,
    `Vzdálenost x od čísla ${N(a)} je ${strict ? 'menší než' : 'nejvýše'} ${b}: ${strict ? 'x ∈ (' + N(a - b) + '; ' + N(a + b) + ')' : 'x ∈ ⟨' + N(a - b) + '; ' + N(a + b) + '⟩'}.`);
});
reg('obory', 3, 'NSD tří', () => { const g = ri(3, 12); const m = shuffle([2, 3, 4, 5, 6, 7, 9]).slice(0, 3); const [a, b, c] = m.map(x => g * x); return numQ(`Určete největší společný dělitel čísel ${a}, ${b} a ${c}.`, gcd(gcd(a, b), c), 'D(a, b, c) = D(D(a, b), c).'); });
reg('obory', 3, 'násobek na čtverec', () => {
  for (; ;) {
    const ex = [ri(0, 4), ri(0, 3), ri(0, 2), ri(0, 1)]; const ps = [2, 3, 5, 7]; let n = 1, m = 1; ex.forEach((e, i) => { n *= ps[i] ** e; if (e % 2) m *= ps[i]; });
    if (m === 1 || n > 3000 || n < 12) continue;
    return numQ(`Jaké je nejmenší přirozené číslo n, pro které je ${n}·n druhou mocninou přirozeného čísla?`, m, `Rozklad čísla ${n}: prvočísla s lichým exponentem je třeba „doplnit“ – n = ${m}.`);
  }
});

/* =====================  5. MOCNINY A ODMOCNINY  ===================== */
const pw = (b, e) => `${b}<sup>${e}</sup>`;
reg('mocniny', 1, 'pravidla', () => {
  const b = pick([2, 3, 5, 7]), m = ri(2, 9), n = ri(2, 9), p = ri(1, m + n - 1);
  return numQ(`${b}${sup(m)} · ${b}${sup(n)} : ${b}${sup(p)} = ${b}<sup>?</sup> &nbsp; Určete exponent.`, m + n - p, `Při násobení exponenty sčítáme, při dělení odčítáme: ${m} + ${n} − ${p}.`);
});
reg('mocniny', 1, 'výpočet', () => { const b = pick([-5, -4, -3, -2, 2, 3, 4, 5, 10]), e = ri(2, b === 10 ? 4 : 5); return numQ(`Vypočtěte ${b < 0 ? '(' + N(b) + ')' : b}${sup(e)}.`, b ** e, 'Záporné číslo v sudé mocnině dává kladný výsledek, v liché záporný.'); });
reg('mocniny', 1, 'záporný exponent', () => { const b = ri(2, 6), e = ri(1, 3); return numQ(`Vypočtěte ${b}${sup(-e)}.`, 1 / b ** e, `a${sup(-e)} = 1 / a${sup(e)} = 1/${b ** e}.`, rat([1, b ** e]), FRACHINT); });
reg('mocniny', 1, 'odmocnina celá', () => { const k = ri(0, 1); if (k) { const c = ri(2, 12); return numQ(`Vypočtěte √${c * c}.`, c, `${c}² = ${c * c}.`); } const c = ri(2, 6); return numQ(`Vypočtěte ∛${c ** 3}.`, c, `${c}³ = ${c ** 3}.`); });
reg('mocniny', 2, 'částečné odmocnění', () => {
  const k = ri(2, 7), m = pick([2, 3, 5, 6, 7, 10]);
  return mc(`Částečně odmocněte: √${k * k * m}`, `${k}√${m}`, [`${m}√${k}`, `${k * k}√${m}`, `${k}√${m * k}`, `${k + m}√${m}`], `√${k * k * m} = √(${k * k}·${m}) = ${k}√${m}.`);
});
reg('mocniny', 2, 'racionální exponent', () => {
  let q, c, p; do { q = pick([2, 3, 4]); c = q === 4 ? pick([2, 3]) : ri(2, 5); p = ri(1, 4); } while (gcd(p, q) !== 1); const base = c ** q;
  return numQ(`Vypočtěte ${pw(base, p + '/' + q)}.`, c ** p, `${base} = ${c}${sup(q)}, proto ${base}<sup>${p}/${q}</sup> = ${c}${sup(p)} = ${c ** p}.`);
});
reg('mocniny', 2, 'složené', () => {
  const b = pick([2, 3, 5]), m = ri(2, 4), n = ri(2, 3), k = ri(1, 6), p = ri(1, 5);
  return numQ(`(${b}${sup(m)})${sup(n)} · ${b}${sup(k)} : ${b}${sup(p)} = ${b}<sup>?</sup> &nbsp; Určete exponent.`, m * n + k - p, `(${b}${sup(m)})${sup(n)} = ${b}${sup(m * n)}, pak ${m * n} + ${k} − ${p}.`);
});
reg('mocniny', 3, 'záporný racionální exponent', () => {
  let q, c, p; do { q = pick([2, 3]); c = q === 3 ? ri(2, 4) : ri(2, 5); p = ri(1, 3); } while (gcd(p, q) !== 1); const base = c ** q;
  return numQ(`Vypočtěte ${pw(base, MINUS + p + '/' + q)}.`, 1 / c ** p, `${base}<sup>${MINUS}${p}/${q}</sup> = 1 / ${c}${sup(p)} = 1/${c ** p}.`, rat([1, c ** p]), FRACHINT);
});
reg('mocniny', 3, 'výraz s mocninami', () => {
  const mk = () => { let q, c, p; do { q = pick([2, 3]); c = q === 3 ? ri(2, 4) : ri(2, 5); p = pick([-2, -1, 1, 2]); } while (gcd(Math.abs(p), q) !== 1); return { base: c ** q, q, p, v: p > 0 ? [c ** p, 1] : [1, c ** (-p)] }; };
  const A = mk(), B = mk(); const op = pick(['·', '+']);
  const val = op === '·' ? Qmul(A.v, B.v) : Qadd(A.v, B.v);
  const t = o => pw(o.base, (o.p < 0 ? MINUS : '') + Math.abs(o.p) + '/' + o.q);
  return numQ(`Vypočtěte ${t(A)} ${op} ${t(B)}.`, Qv(val), `Každý člen zvlášť: ${rat(A.v)} ${op} ${rat(B.v)} = ${rat(val)}.`, rat(val), FRACHINT);
});
reg('mocniny', 3, 'usměrnění', () => {
  const a = pick([2, 3, 5, 6, 7]), k = ri(2, 9);
  return mc(`Usměrněte zlomek ${FR(k, '√' + a)}.`, FR(`${k}√${a}`, a), [FR(k, a), FR(`√${a}`, k), FR(`${k}√${a}`, a * a), FR(`${k * a}`, `√${a}`)], `Rozšíříme zlomek √${a}: ${k}√${a} / (√${a}·√${a}) = ${k}√${a} / ${a}.`);
});

/* =====================  6. VÝRAZY S PROMĚNNÝMI  ===================== */
const perturb = (cs) => { const r = cs.slice(); const i = ri(0, r.length - 1); r[i] += pick([-2, -1, 1, 2]); return r; };
reg('vyrazy', 1, 'sčítání mnohočlenů', () => {
  const P = [ri(-6, 6), ri(-6, 6), nz(-4, 4)], Q = [ri(-6, 6), ri(-6, 6), nz(-4, 4)]; const minus = R() < .5;
  const res = minus ? padd(P, pneg(Q)) : padd(P, Q); const wrong = minus ? padd(P, Q) : padd(P, pneg(Q));
  const sg = minus ? ' − ' : ' + ';
  const lastErr = minus ? [P[0] - Q[0], P[1] - Q[1], P[2] + Q[2]] : null;
  const wr = [wrong, perturb(res), perturb(res), lastErr || perturb(res)].map(p => poly(p));
  return mc(`Zjednodušte: (${poly(P)})${sg}(${poly(Q)})`, poly(res), wr, minus ? 'Při odčítání změníme znaménka všech členů ve druhé závorce.' : 'Sčítáme členy se stejnou mocninou x.');
});
reg('vyrazy', 1, 'hodnota výrazu', () => { const P = [ri(-6, 6), nz(-5, 5), nz(-3, 3)], x = ri(-4, 4); return numQ(`Vypočtěte hodnotu výrazu ${poly(P)} pro x = ${N(x)}.`, pval(P, x), 'Dosadíme do výrazu a postupujeme podle priorit operací (mocnina, násobení, sčítání).'); });
reg('vyrazy', 2, 'roznásobení', () => {
  const a = nz(-3, 3), b = nz(-6, 6), c = nz(-3, 3), d = nz(-6, 6); const r = pmul([b, a], [d, c]);
  const wr = [[b * d, a * c], [b * d, a * d - b * c, a * c], [b + d, a * d + b * c, a * c], perturb(r)].map(p => poly(p));
  return mc(`Roznásobte: (${lin(a, b)})(${lin(c, d)})`, poly(r), wr, `Každý člen první závorky násobíme každým členem druhé a výsledek sečteme.`);
});
reg('vyrazy', 2, 'vzorce', () => {
  const a = ri(2, 9); const k = pick(['sq+', 'sq-', 'diff']);
  if (k === 'sq+') return mc(`Použijte vzorec: (x + ${a})² =`, poly([a * a, 2 * a, 1]), [poly([a * a, 0, 1]), poly([a, 2, 1]), poly([a * a, -2 * a, 1]), poly([2 * a, a, 1])], '(a + b)² = a² + 2ab + b²');
  if (k === 'sq-') return mc(`Použijte vzorec: (x − ${a})² =`, poly([a * a, -2 * a, 1]), [poly([a * a, 0, 1]), poly([-a * a, 0, 1]), poly([a * a, 2 * a, 1]), poly([-a * a, -2 * a, 1])], '(a − b)² = a² − 2ab + b²');
  return mc(`Použijte vzorec: (x − ${a})(x + ${a}) =`, poly([-a * a, 0, 1]), [poly([a * a, 0, 1]), poly([a * a, -2 * a, 1]), poly([-a * a, 2 * a, 1]), poly([-2 * a, 0, 1])], '(a − b)(a + b) = a² − b²');
});
reg('vyrazy', 2, 'rozklad', () => {
  let p = nz(-8, 8), q = nz(-8, 8); if (p === q) q = q > 0 ? q + 1 : q - 1; if (p === -q) q += 1; if (q === 0) q = 1;
  const f = (a, b) => `${fx(a)}${fx(b)}`; const cs = [p * q, -(p + q), 1];
  return mc(`Rozložte na součin: ${poly(cs)}`, f(p, q), [f(-p, -q), f(p, -q), f(-p, q), f(p + 1, q)], `Hledáme čísla s součinem ${N(p * q)} a součtem ${N(-(p + q))}: ${N(-p)} a ${N(-q)}.`);
});
reg('vyrazy', 2, 'definiční obor', () => {
  let a = ri(1, 7), b = ri(1, 7); if (a === b) b++;
  const [r1, r2] = pick([[a, b], [a, -b], [-a, -b]]); const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
  const den = poly([r1 * r2, -(r1 + r2), 1]); const f = (u, v) => `x ≠ ${N(Math.min(u, v))}, x ≠ ${N(Math.max(u, v))}`;
  return mc(`Pro která x je výraz ${FR(ri(1, 5) + 'x + ' + ri(1, 5), den)} definován? Zvolte, které hodnoty x je třeba <b>vyloučit</b>.`, f(lo, hi),
    [f(-lo, -hi), `x ≠ ${N(r1 + r2)}`, `x ≠ ${N(r1 * r2)}`, f(lo, -hi)], `Jmenovatel nesmí být nula: ${den} = 0 ⇒ ${fx(r1)}${fx(r2)} = 0.`);
});
reg('vyrazy', 2, 'krácení', () => {
  const a = ri(2, 9);
  if (R() < .5) return mc(`Zkraťte (x ≠ ${a}): ${FR(poly([-a * a, 0, 1]), 'x ' + MINUS + ' ' + a)}`, `x + ${a}`, [`x ${MINUS} ${a}`, `x + ${a * a}`, `x ${MINUS} ${a * a}`, `${a}x`], `x² − ${a * a} = (x − ${a})(x + ${a}), činitel (x − ${a}) vykrátíme.`);
  const b = ri(2, 7); return mc(`Zkraťte (x ≠ ${MINUS}${a}): ${FR(poly([a * b, a + b, 1]), 'x + ' + a)}`, `x + ${b}`, [`x + ${a}`, `x ${MINUS} ${b}`, `x + ${a * b}`, `x + ${a + b}`], `Čitatel rozložíme: (x + ${a})(x + ${b}).`);
});
const mono = (p) => p.map(([v, e]) => e === 0 ? '' : v + (e === 1 ? '' : sup(e))).join('') || '1';
reg('vyrazy', 3, 'mocniny výrazů', () => {
  const m = ri(1, 3), n = ri(1, 3), k = ri(2, 3), p = ri(1, 4), q = ri(1, 4);
  const e1 = m * k - p, e2 = n * k - q;
  const f = (x, y) => mono([['a', x], ['b', y]]);
  return mc(`Zjednodušte (a ≠ 0, b ≠ 0): ${FR(`(${mono([['a', m], ['b', n]])})${sup(k)}`, mono([['a', p], ['b', q]]))}`, f(e1, e2), [f(e1 + 1, e2), f(e1, e2 - 1), f(m * k + p, n * k + q), f(m + k - p, n + k - q)].filter(s => s !== f(e1, e2)),
    `Umocníme: a${sup(m * k)}b${sup(n * k)}, pak odečteme exponenty: a${sup(m * k)} : a${sup(p)} = a${sup(e1)}, b${sup(n * k)} : b${sup(q)} = b${sup(e2)}.`);
});
reg('vyrazy', 3, 'součet zlomků', () => {
  const a = ri(1, 6);
  const k = pick([0, 1]);
  const d = `x² ${MINUS} ${a * a}`;
  if (k === 0) return mc(`Sečtěte: ${FR(1, 'x ' + MINUS + ' ' + a)} + ${FR(1, 'x + ' + a)}`, FR('2x', d), [FR(2, d), FR('2x', `x² + ${a * a}`), FR(2, '2x'), FR('2a', d).replace('2a', `${2 * a}`)], `Společný jmenovatel (x − ${a})(x + ${a}) = ${d}; čitatel (x + ${a}) + (x − ${a}) = 2x.`);
  return mc(`Odečtěte: ${FR(1, 'x ' + MINUS + ' ' + a)} ${MINUS} ${FR(1, 'x + ' + a)}`, FR(`${2 * a}`, d), [FR('2x', d), FR(`${2 * a}`, `x² + ${a * a}`), FR(0, d).replace('<i>0</i>', '<i>0</i>'), FR(`${a}`, d)], `Čitatel: (x + ${a}) − (x − ${a}) = ${2 * a}.`);
});
reg('vyrazy', 3, 'součin zlomků', () => {
  const a = ri(2, 7), b = ri(2, 7); if (a === b) return G.vyrazy[3][2].fn();
  return mc(`Zjednodušte (x ≠ ${a}, x ≠ ${MINUS}${b}): ${FR(poly([-a * a, 0, 1]), 'x + ' + b)} · ${FR('x + ' + b, 'x ' + MINUS + ' ' + a)}`, `x + ${a}`, [`x ${MINUS} ${a}`, `(x + ${a})(x + ${b})`, `x² + ${a}`, `x + ${b}`], 'Rozložíme x² − a² a vykrátíme společné činitele (x + b) a (x − a).');
});
reg('vyrazy', 3, 'odmocnina z čtverce', () => {
  const k = nz(-6, 6); const kind = pick([0, 1]);
  if (kind === 0) return mc(`Zjednodušte pro x < 0: √(x²)`, MINUS + 'x', ['x', 'x²', MINUS + 'x²', '|x| + x'], `√(x²) = |x|, a pro x < 0 je |x| = −x.`);
  return mc(`Zjednodušte pro x < ${N(k)}: √((x ${k < 0 ? '+ ' + (-k) : MINUS + ' ' + k})²)`, k < 0 ? `${-k} ${MINUS} x`.replace(/^(\d+) − x$/, `${N(-k)} ${MINUS} x`).replace(/^/, '') : `${k} ${MINUS} x`,
    [k < 0 ? `x + ${-k}` : `x ${MINUS} ${k}`, `x + ${Math.abs(k)}`, `${MINUS}x ${MINUS} ${Math.abs(k)}`], `√(A²) = |A|; pro x < ${N(k)} je výraz v závorce záporný, proto |A| = −A.`);
});

/* =====================  7. ROVNICE A NEROVNICE  ===================== */
const sgn = n => n < 0 ? `${MINUS} ${-n}` : `+ ${n}`;
const FLIP = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };
const eq2 = (a, b, c) => term(a, 'x', 1, true) + term(b, 'y', 1, false) + ' = ' + N(c);
reg('rovnice', 1, 'lineární', () => {
  const x0 = nz(-9, 9); let a = nz(-5, 5), c = nz(-5, 5); while (c === a) c = nz(-5, 5); const b = ri(-9, 9), d = a * x0 + b - c * x0;
  return numQ(`Řešte rovnici ${lin(a, b)} = ${lin(c, d)}.`, x0, `Neznámé převedeme na jednu stranu: ${poly([0, a - c])} = ${N(d - b)}, tedy x = ${N(x0)}.`);
});
reg('rovnice', 2, 'lineární zlomek', () => {
  const a = ri(2, 7), b = ri(-9, 9), d = ri(-9, 9); const x = Qn(d - b, a);
  return numQ(`Řešte rovnici ${lin(a, b)} = ${N(d)}.`, Qv(x), `${a}x = ${N(d - b)}, x = ${rat(x)}.`, rat(x), FRACHINT);
});
reg('rovnice', 1, 'soustava', () => {
  const x0 = ri(1, 5), y0 = ri(1, 5), a1 = ri(1, 3), b1 = ri(1, 3), a2 = ri(1, 3), b2 = ri(-3, -1); const ask = pick([['x + y', x0 + y0], ['x · y', x0 * y0], ['x − y', x0 - y0]]);
  return numQ(`Řešte soustavu rovnic:<br>① ${eq2(a1, b1, a1 * x0 + b1 * y0)}<br>② ${eq2(a2, b2, a2 * x0 + b2 * y0)}<br>Určete <b>${ask[0]}</b>.`, ask[1], `Řešení soustavy: x = ${x0}, y = ${y0}.`);
});
reg('rovnice', 2, 'soustava2', () => {
  let a1, b1, a2, b2; do { a1 = nz(-4, 4); b1 = nz(-4, 4); a2 = nz(-4, 4); b2 = nz(-4, 4); } while (a1 * b2 - a2 * b1 === 0);
  const x0 = ri(-5, 5), y0 = ri(-5, 5); const ask = pick([['x + y', x0 + y0], ['x · y', x0 * y0], ['x − y', x0 - y0], ['2x + y', 2 * x0 + y0]]);
  return numQ(`Řešte soustavu rovnic:<br>① ${eq2(a1, b1, a1 * x0 + b1 * y0)}<br>② ${eq2(a2, b2, a2 * x0 + b2 * y0)}<br>Určete <b>${ask[0]}</b>.`, ask[1], `Řešení soustavy: x = ${N(x0)}, y = ${N(y0)}.`);
});
reg('rovnice', 1, 'lineární nerovnice', () => {
  const a = pick([-5, -4, -3, -2, 2, 3, 4, 5]), k = ri(-6, 6), b = ri(-8, 8), c = a * k + b; const rel = pick(['<', '>', '≤', '≥']);
  const r2 = a > 0 ? rel : FLIP[rel]; const wr = [`x ${FLIP[r2]} ${N(k)}`, `x ${r2} ${N(-k)}`, `x ${r2} ${N(k + 1)}`, `x ${FLIP[r2]} ${N(-k)}`, `x ${r2} ${N(k - 1)}`];
  return mc(`Řešte nerovnici ${lin(a, b)} ${rel} ${N(c)}.`, `x ${r2} ${N(k)}`, wr, a < 0 ? 'Dělíme záporným číslem, proto se obrátí znak nerovnosti.' : 'Dělíme kladným číslem, znak se nemění.');
});
reg('rovnice', [1, 2], 'diskriminant', () => {
  const a = pick([1, 1, 2, 3, -1, -2]), b = ri(-8, 8), c = ri(-6, 6);
  return numQ(`Určete diskriminant rovnice ${poly([c, b, a])} = 0.`, b * b - 4 * a * c, `D = b² − 4ac = ${par(b)}² − 4·${par(a)}·${par(c)}.`);
});
reg('rovnice', 2, 'počet kořenů', () => {
  const cnt = pick([0, 1, 2]); const a = pick([1, 2, 3, -1, -2]); let b, c;
  if (cnt === 1) { const k = nz(-3, 3); b = 2 * a * k; c = a * k * k; } else { do { b = ri(-6, 6); c = ri(-6, 6); } while (cnt === 2 ? b * b - 4 * a * c <= 0 : b * b - 4 * a * c >= 0); }
  const D = b * b - 4 * a * c;
  return mc(`Kolik reálných kořenů má rovnice ${poly([c, b, a])} = 0?`, ['žádný', 'právě jeden', 'právě dva'][cnt], ['žádný', 'právě jeden', 'právě dva', 'nekonečně mnoho'].filter((_, i) => i !== cnt), `D = ${N(D)} ${D > 0 ? '> 0 – dva kořeny' : D === 0 ? '= 0 – jeden (dvojnásobný) kořen' : '< 0 – žádný reálný kořen'}.`);
});
reg('rovnice', 2, 'kvadratická kořeny', () => {
  let r1 = nz(-7, 7), r2 = nz(-7, 7); if (r1 === r2) r2 += r2 > 0 ? 1 : -1; const a = pick([1, 1, 2, -1]);
  const f = (u, v) => { const [x, y] = [Math.min(u, v), Math.max(u, v)]; return `x₁ = ${N(x)}, x₂ = ${N(y)}`; };
  return mc(`Řešte rovnici ${poly([a * r1 * r2, -a * (r1 + r2), a])} = 0.`, f(r1, r2), [f(-r1, -r2), f(r1, -r2), f(-r1, r2), f(r1 + 1, r2), f(r1, r2 - 1)], `Použijeme vzorec x = (−b ± √D) / 2a, nebo rozklad ${fx(r1)}${fx(r2)} = 0.`);
});
reg('rovnice', [2, 3], 'Viètovy vztahy', () => {
  let r1 = nz(-6, 6), r2 = nz(-6, 6); const hard = R() < .5;
  const cs = [r1 * r2, -(r1 + r2), 1];
  const asks = [['x₁ + x₂', r1 + r2, 'Součet kořenů je −b/a.'], ['x₁ · x₂', r1 * r2, 'Součin kořenů je c/a.'], ['x₁² + x₂²', r1 * r1 + r2 * r2, 'x₁² + x₂² = (x₁ + x₂)² − 2x₁x₂.']];
  const o = hard ? asks[2] : asks[ri(0, 1)];
  return numQ(`Kořeny rovnice ${poly(cs)} = 0 označme x₁, x₂. Bez řešení rovnice určete <b>${o[0]}</b>.`, o[1], o[2]);
});
reg('rovnice', 3, 'Viètovy převrácené', () => {
  let r1 = nz(-6, 6), r2 = nz(-6, 6); const a = pick([1, 2]);
  const val = Qn(r1 + r2, r1 * r2); const cs = [a * r1 * r2, -a * (r1 + r2), a];
  return numQ(`Kořeny rovnice ${poly(cs)} = 0 označme x₁, x₂. Bez řešení rovnice určete ${FR(1, 'x₁')} + ${FR(1, 'x₂')}.`, Qv(val), `1/x₁ + 1/x₂ = (x₁ + x₂)/(x₁x₂) = ${rat(Qn(-cs[1], cs[0]))} .`.replace(/ \.$/, '.'), rat(val), FRACHINT);
});
reg('rovnice', 3, 'parametr', () => {
  const m = ri(2, 7), c = m * m;
  if (R() < .5) return mc(`Pro které hodnoty parametru k má rovnice x² + kx + ${c} = 0 právě jeden (dvojnásobný) kořen?`, `k = ${MINUS}${2 * m} nebo k = ${2 * m}`, [`k = ${2 * m}`, `k = ±${m}`, `k = ±${c}`, `k = ${MINUS}${2 * m}`], `D = k² − 4·${c} = 0 ⇒ k² = ${4 * c} ⇒ k = ±${2 * m}.`);
  return mc(`Pro které k nemá rovnice x² + kx + ${c} = 0 žádný reálný kořen?`, `${MINUS}${2 * m} < k < ${2 * m}`, [`k < ${MINUS}${2 * m} nebo k > ${2 * m}`, `k < ${2 * m}`, `k > ${MINUS}${2 * m}`, `${MINUS}${m} < k < ${m}`], `D = k² − ${4 * c} < 0 ⇒ |k| < ${2 * m}.`);
});
/* součinové a podílové nerovnice */
const INF = '∞';
function prodSol(a, b, rel) { // (x−a)(x−b) rel 0, a<b
  const o = N(a), p = N(b);
  return { '>': `(${MINUS}${INF}; ${o}) ∪ (${p}; ${INF})`, '<': `(${o}; ${p})`, '≥': `(${MINUS}${INF}; ${o}⟩ ∪ ⟨${p}; ${INF})`, '≤': `⟨${o}; ${p}⟩` }[rel];
}
function quotSol(n, d, rel) { // (x−n)/(x−d) rel 0
  const lo = Math.min(n, d), hi = Math.max(n, d), L = N(lo), H = N(hi), nLow = n < d;
  if (rel === '>') return `(${MINUS}${INF}; ${L}) ∪ (${H}; ${INF})`;
  if (rel === '<') return `(${L}; ${H})`;
  if (rel === '≥') return nLow ? `(${MINUS}${INF}; ${L}⟩ ∪ (${H}; ${INF})` : `(${MINUS}${INF}; ${L}) ∪ ⟨${H}; ${INF})`;
  return nLow ? `⟨${L}; ${H})` : `(${L}; ${H}⟩`;
}
reg('rovnice', 2, 'součinový tvar', () => {
  let a = ri(-7, 3), b = a + ri(2, 7); const rel = pick(['>', '<', '≥', '≤']);
  const all = ['>', '<', '≥', '≤'].map(r => prodSol(a, b, r));
  return mc(`Řešte nerovnici ${fx(a)}${fx(b)} ${rel} 0.`, prodSol(a, b, rel), all.filter(s => s !== prodSol(a, b, rel)).concat([`(${N(a)}; ${N(b)}⟩`]), 'Nulové body rozdělí osu na intervaly; v každém určíme znaménko součinu. Součin je kladný vně kořenů a záporný mezi nimi.');
});
reg('rovnice', 3, 'podílový tvar', () => {
  let n = ri(-7, 7), d = ri(-7, 7); if (n === d) d += 2; const rel = pick(['>', '<', '≥', '≤']);
  const all = ['>', '<', '≥', '≤'].map(r => quotSol(n, d, r));
  const mine = quotSol(n, d, rel);
  const mis = (rel === '≥' || rel === '≤') ? quotSol(d, n, rel) : null;
  return mc(`Řešte nerovnici ${FR(fx(n).replace(/^\(|\)$/g, ''), fx(d).replace(/^\(|\)$/g, ''))} ${rel} 0.`, mine, all.filter(s => s !== mine).concat(mis ? [mis] : []), 'Nulový bod jmenovatele vždy z řešení vylučujeme (kulatá závorka), nulový bod čitatele patří do řešení jen u ≥ a ≤.');
});
/* absolutní hodnota */
reg('rovnice', 1, 'abs rovnice', () => { const a = ri(-6, 6), b = ri(1, 7); return numQ(`Určete <b>součet</b> všech řešení rovnice |x ${a < 0 ? '+ ' + (-a) : a > 0 ? MINUS + ' ' + a : ''}| = ${b}.`.replace('|x |', '|x|'), 2 * a, `x ${MINUS} ${par(a)} = ±${b}, tedy x = ${N(a - b)} nebo x = ${N(a + b)}. Součet = ${N(2 * a)}.`); });
reg('rovnice', 2, 'abs nerovnice', () => {
  const a = ri(-5, 5), b = ri(1, 6), rel = pick(['<', '>', '≤', '≥']); const lo = N(a - b), hi = N(a + b);
  const S1 = r => ({ '<': `(${lo}; ${hi})`, '≤': `⟨${lo}; ${hi}⟩`, '>': `(${MINUS}${INF}; ${lo}) ∪ (${hi}; ${INF})`, '≥': `(${MINUS}${INF}; ${lo}⟩ ∪ ⟨${hi}; ${INF})` }[r]);
  return mc(`Řešte nerovnici |x ${a < 0 ? '+ ' + (-a) : a > 0 ? MINUS + ' ' + a : ''}| ${rel} ${b}.`.replace('|x |', '|x|'), S1(rel), ['<', '≤', '>', '≥'].filter(r => r !== rel).map(S1).concat([`(${N(-b)}; ${N(b)})`]), 'Vzdálenost x od čísla ' + N(a) + ' porovnáváme s ' + b + ': „menší“ dává interval uvnitř, „větší“ dvě části vně.');
});
reg('rovnice', 2, 'abs lineární', () => {
  let p = ri(-6, 8), q = ri(-8, 6); if (p <= q) { [p, q] = [q + 1, p]; } if (p === q) p++;
  const s = p + q, d = p - q;
  return mc(`Řešte rovnici |2x ${s < 0 ? '+ ' + (-s) : s > 0 ? MINUS + ' ' + s : ''}| = ${d}.`.replace('|2x |', '|2x|'), `x = ${N(q)} nebo x = ${N(p)}`, [`x = ${N(-q)} nebo x = ${N(-p)}`, `x = ${N(p)}`, `x = ${N(q + 1)} nebo x = ${N(p + 1)}`, `x = ${N(p)} nebo x = ${N(-q)}`], `2x = ${N(s)} ± ${d}, tedy x = ${N(q)} nebo x = ${N(p)}.`);
});
reg('rovnice', 3, 'abs dvě', () => {
  if (R() < .5) { const a = ri(-8, 8); let b = ri(-8, 8); if (a === b) b += 3; const v = Qn(a + b, 2); return numQ(`Řešte rovnici |x ${a < 0 ? '+ ' + (-a) : a > 0 ? MINUS + ' ' + a : ''}| = |x ${b < 0 ? '+ ' + (-b) : b > 0 ? MINUS + ' ' + b : ''}|.`.replace(/\|x \|/g, '|x|'), Qv(v), 'Hledáme bod stejně vzdálený od ' + N(a) + ' a ' + N(b) + ' – střed úsečky.', rat(v), FRACHINT); }
  for (let tries = 0; tries < 100; tries++) {
    const a = ri(-5, 5), c = pick([2, 3, -2]), d = ri(-6, 6); const sols = [];
    if (c !== 1) { const x = Qn(a + d, 1 - c); if (Qv(x) >= a) sols.push(x); }
    if (c !== -1) { const x = Qn(a - d, 1 + c); if (Qv(x) <= a) sols.push(x); }
    if (!sols.length) continue; const uniq = []; sols.forEach(s => { if (!uniq.some(u => u[0] === s[0] && u[1] === s[1])) uniq.push(s); });
    const sum = uniq.reduce((s, x) => Qadd(s, x), [0, 1]);
    return numQ(`Určete <b>součet</b> všech řešení rovnice |x ${a < 0 ? '+ ' + (-a) : a > 0 ? MINUS + ' ' + a : ''}| = ${lin(c, d)}.`.replace('|x |', '|x|'), Qv(sum), `Rozlišíme dva případy: x ≥ ${N(a)} (pak |${xs(a)}| = ${xs(a)}) a x < ${N(a)} (pak |${xs(a)}| = −(${xs(a)})). Každý výsledek ověříme podmínkou případu.`, rat(sum), FRACHINT);
  }
  return G.rovnice[3][0].fn();
});
/* neznámá ve jmenovateli / pod odmocninou */
reg('rovnice', 2, 'zlomky', () => {
  for (; ;) {
    const x0 = ri(-6, 6), a = ri(-6, 6), b = ri(-6, 6); if (a === b || x0 === a || x0 === b) continue; const t = nz(-3, 3);
    const k = (x0 - a) * t, m = (x0 - b) * t; if (k === 0 || m === 0 || k === m) continue;
    return numQ(`Řešte rovnici ${FR(N(k), xs(a))} = ${FR(N(m), xs(b))}.`, x0, `Zkřížené násobení: ${N(k)}·(${xs(b)}) = ${N(m)}·(${xs(a)}). Podmínky: x ≠ ${N(a)}, x ≠ ${N(b)}.`);
  }
});
reg('rovnice', 3, 'zlomky past', () => {
  const a = ri(2, 7), c = ri(1, 5) * 2 * (R() < .5 ? 1 : 1) * 1; const trap = R() < .5; const cc = trap ? 2 * a : (ri(-9, 9) === 2 * a ? 2 * a + 1 : ri(-9, 9)); let C = cc; if (!trap && C === 2 * a) C++;
  const q = `Řešte rovnici ${FR(poly([-a * a, 0, 1]), 'x ' + MINUS + ' ' + a)} = ${N(C)}.`;
  const none = 'Rovnice nemá řešení';
  const ans = C === 2 * a ? none : `x = ${N(C - a)}`;
  const wr = [none, `x = ${N(C + a)}`, `x = ${N(a)}`, `x = ${N(-a)}`, `x = ${N(C)}`];
  return mc(q, ans, wr.filter(w => w !== ans), `Po zkrácení x + ${a} = ${N(C)}, tedy x = ${N(C - a)}. Podmínka x ≠ ${a}${C === 2 * a ? ' je ale porušena – řešení nevyhovuje.' : ' je splněna.'}`);
});
reg('rovnice', 2, 'odmocnina', () => { const a = ri(-8, 8), b = ri(2, 7); return numQ(`Řešte rovnici √(${ax(a)}) = ${b}.`, b * b - a, `Umocníme: ${ax(a)} = ${b * b}, tedy x = ${N(b * b - a)}. Zkouška: √${b * b} = ${b}.`); });
reg('rovnice', 3, 'odmocnina past', () => {
  for (; ;) {
    const c = ri(-3, 3), x0 = c + ri(1, 6), a = pick([1, 2, 3]); const b = (x0 - c) ** 2 - a * x0;
    const x1 = 2 * c + a - x0; if (x1 === x0) continue; const valid = [x0]; if (x1 !== x0 && x1 >= c && a * x1 + b >= 0) valid.push(x1);
    const sum = valid.reduce((s, x) => s + x, 0);
    return numQ(`Určete <b>součet</b> všech řešení rovnice √(${lin(a, b)}) = ${xs(c)}.`, sum, `Umocněním vznikne kvadratická rovnice s kořeny ${N(x0)} a ${N(x1)}. Zkouškou ${valid.length === 2 ? 'vyhovují oba' : 'vyhovuje pouze ' + N(x0) + ' (podmínka x ≥ ' + N(c) + ')'}.`);
  }
});
/* exponenciální, logaritmické */
reg('rovnice', 2, 'exponenciální', () => {
  const b = pick([2, 3, 5]); const m = pick([1, 2, 3]), x0 = ri(0, 3), s = ri(-2, 3); const e = m * x0 + s; if (e < 1 || e > 5) return G.rovnice[2].find(g => g.name === 'exponenciální').fn();
  return numQ(`Řešte rovnici ${b}<sup>${lin(m, s)}</sup> = ${b ** e}.`, x0, `${b ** e} = ${b}${sup(e)}, proto ${lin(m, s)} = ${e}, x = ${x0}.`);
});
reg('rovnice', 3, 'exponenciální substituce', () => {
  const b = pick([2, 3]); let p = ri(0, 3), q = ri(0, 3); if (p === q) q = p + 1; const S1 = b ** p + b ** q, P1 = b ** (p + q);
  return numQ(`Určete <b>součet</b> všech řešení rovnice ${b * b}<sup>x</sup> ${MINUS} ${S1}·${b}<sup>x</sup> + ${P1} = 0.`, p + q, `Substituce t = ${b}ˣ: t² ${MINUS} ${S1}t + ${P1} = 0 ⇒ t = ${b ** p} nebo t = ${b ** q} ⇒ x = ${p} nebo x = ${q}.`);
});
reg('rovnice', 3, 'exp zlomek', () => { const k = ri(2, 4); return numQ(`Řešte rovnici (${FR(1, 2)})<sup>x</sup> = ${2 ** k}.`, -k, `(1/2)ˣ = 2⁻ˣ a ${2 ** k} = 2${sup(k)}, tedy −x = ${k}, x = ${-k}.`.replace(`x = ${-k}`, `x = ${N(-k)}`)); });
reg('rovnice', 2, 'logaritmus', () => {
  const t = pick([0, 1, 2]);
  if (t === 0) { const b = pick([2, 3, 5]), k = ri(1, 4); return numQ(`Řešte rovnici log${sub(b)} x = ${k}.`, b ** k, `x = ${b}${sup(k)}.`); }
  if (t === 1) { const b = pick([2, 3]), k = ri(2, 5), a = ri(1, 6); return numQ(`Řešte rovnici log${sub(b)} (x + ${a}) = ${k}.`, b ** k - a, `x + ${a} = ${b}${sup(k)} = ${b ** k}.`); }
  const b = pick([2, 3, 5]), k = ri(1, 3), neg = R() < .5; return numQ(`Vypočtěte log${sub(b)} ${neg ? FR(1, b ** k) : b ** k}.`, neg ? -k : k, `${neg ? '1/' : ''}${b ** k} = ${b}${sup(neg ? -k : k)}.`);
});
reg('rovnice', 3, 'log součet', () => {
  if (R() < .5) { const [x0, a, k] = pick([[4, 2, 3], [8, 4, 5], [2, 1, 1], [16, 8, 7], [4, 3, 2], [8, 6, 4], [8, 7, 3], [16, 12, 6]]); return numQ(`Řešte rovnici log₂ x + log₂ (x ${MINUS} ${a}) = ${k}.`, x0, `x(x − ${a}) = 2${sup(k)} = ${2 ** k}. Kořeny kvadratické rovnice: ${x0} a ${N(a - x0)}; podmínka x > ${a} vyhovuje jen ${x0}.`); }
  const [x0, a, k] = pick([[5, 3, 1], [25, 21, 2], [20, 15, 2], [50, 48, 2], [10, 9, 1]]); return numQ(`Řešte rovnici log x + log (x ${MINUS} ${a}) = ${k}.`, x0, `x(x − ${a}) = 10${sup(k)} = ${10 ** k}. Kořeny: ${x0} a ${a - x0}; podmínka x > ${a} vyhovuje jen ${x0}.`);
});
/* goniometrie */
const rad = d => ({ 0: '0', 30: FR('π', 6), 45: FR('π', 4), 60: FR('π', 3), 90: FR('π', 2), 120: FR('2π', 3), 135: FR('3π', 4), 150: FR('5π', 6), 180: 'π', 210: FR('7π', 6), 225: FR('5π', 4), 240: FR('4π', 3), 270: FR('3π', 2), 300: FR('5π', 3), 315: FR('7π', 4), 330: FR('11π', 6) }[d]);
const D2R = Math.PI / 180;
const GE = [
  ['sin x = ½', d => Math.sin(d * D2R) - .5], ['sin x = ' + FR('√3', 2), d => Math.sin(d * D2R) - Math.sqrt(3) / 2], ['sin x = ' + MINUS + '½', d => Math.sin(d * D2R) + .5], ['sin x = ' + MINUS + FR('√2', 2), d => Math.sin(d * D2R) + Math.sqrt(2) / 2],
  ['cos x = ½', d => Math.cos(d * D2R) - .5], ['cos x = ' + MINUS + '½', d => Math.cos(d * D2R) + .5], ['cos x = ' + FR('√2', 2), d => Math.cos(d * D2R) - Math.sqrt(2) / 2], ['cos x = ' + MINUS + FR('√3', 2), d => Math.cos(d * D2R) + Math.sqrt(3) / 2],
  ['tg x = 1', d => Math.abs(Math.cos(d * D2R)) < 1e-9 ? 9 : Math.tan(d * D2R) - 1], ['tg x = ' + MINUS + '1', d => Math.abs(Math.cos(d * D2R)) < 1e-9 ? 9 : Math.tan(d * D2R) + 1], ['tg x = √3', d => Math.abs(Math.cos(d * D2R)) < 1e-9 ? 9 : Math.tan(d * D2R) - Math.sqrt(3)],
];
const GE_LIN = [
  ['2 sin x − 1 = 0', d => 2 * Math.sin(d * D2R) - 1], ['2 sin x + 1 = 0', d => 2 * Math.sin(d * D2R) + 1], ['√2 sin x − 1 = 0', d => Math.SQRT2 * Math.sin(d * D2R) - 1], ['2 cos x − 1 = 0', d => 2 * Math.cos(d * D2R) - 1],
  ['2 cos x + 1 = 0', d => 2 * Math.cos(d * D2R) + 1], ['√2 cos x + 1 = 0', d => Math.SQRT2 * Math.cos(d * D2R) + 1], ['2 sin x − √3 = 0', d => 2 * Math.sin(d * D2R) - Math.sqrt(3)], ['tg x − 1 = 0', d => Math.abs(Math.cos(d * D2R)) < 1e-9 ? 9 : Math.tan(d * D2R) - 1],
  ['√3 tg x + 3 = 0', d => Math.abs(Math.cos(d * D2R)) < 1e-9 ? 9 : Math.sqrt(3) * Math.tan(d * D2R) + 3],
].map(e => [e[0].replace(/ − /g, ` ${MINUS} `), e[1]]);
const gsol = f => { const r = []; for (let d = 0; d < 360; d += 15) if (Math.abs(f(d)) < 1e-9) r.push(d); return r; };
const degList = (ds, radians) => ds.map(d => radians ? rad(d) : d + '°').join(' a ');
reg('rovnice', 1, 'goniometrické hodnoty', () => {
  const T = [['sin 30°', '½'], ['sin 45°', FR('√2', 2)], ['sin 60°', FR('√3', 2)], ['cos 30°', FR('√3', 2)], ['cos 45°', FR('√2', 2)], ['cos 60°', '½'], ['tg 45°', '1'], ['tg 60°', '√3'], ['tg 30°', FR('√3', 3)], ['sin 90°', '1'], ['cos 90°', '0'], ['cos 180°', MINUS + '1']];
  const [q, a] = pick(T); const pool = ['½', FR('√2', 2), FR('√3', 2), '1', '√3', FR('√3', 3), '0', MINUS + '½', MINUS + '1'];
  return mc(`Určete hodnotu: ${q}`, a, pool, 'Hodnoty goniometrických funkcí pro základní úhly 30°, 45°, 60° patří k základním znalostem.');
});
reg('rovnice', 2, 'goniometrická rovnice', () => {
  const rd = R() < .35; const e = pick(GE), s = gsol(e[1]); const other = GE.filter(x => x !== e).map(x => gsol(x[1])).filter(x => x.length && x.join() !== s.join());
  return mc(`V intervalu ${rd ? '⟨0; 2π)' : '⟨0°; 360°)'} řešte rovnici <b>${e[0]}</b>.`, degList(s, rd), other.map(x => degList(x, rd)), 'Využijeme jednotkovou kružnici a základní hodnoty; sin a cos mají v intervalu obvykle dvě řešení.');
});
reg('rovnice', 2, 'počet řešení gonio', () => {
  const fn = pick(['sin', 'cos']), v = pick([-1, -0.5, 0, 0.5, 1, 1.5, -2]); const cnt = Math.abs(v) > 1 ? 0 : Math.abs(v) === 1 ? 1 : 2;
  return numQ(`Kolik řešení má v intervalu ⟨0; 2π) rovnice ${fn} x = ${N(v)}?`, cnt, 'Funkce sin i cos nabývají hodnot z intervalu ⟨−1; 1⟩. Hodnotu ±1 nabývají jednou za periodu, hodnoty uvnitř dvakrát, ostatní nikdy.');
});
reg('rovnice', 3, 'goniometrická lineární', () => {
  const e = pick(GE_LIN), s = gsol(e[1]), rd = R() < .4;
  const other = GE_LIN.filter(x => x !== e).map(x => gsol(x[1])).filter(x => x.length && x.join() !== s.join());
  return mc(`V intervalu ${rd ? '⟨0; 2π)' : '⟨0°; 360°)'} řešte rovnici <b>${e[0]}</b>.`, degList(s, rd), other.map(x => degList(x, rd)), 'Nejdřív rovnici upravíme na tvar sin x = a (cos x = a, tg x = a) a pak použijeme jednotkovou kružnici.');
});
reg('rovnice', 3, 'goniometrická kvadratická', () => {
  for (; ;) {
    const vals = [-1, -0.5, 0, 0.5, 1]; const t1 = pick(vals), t2 = pick(vals); if (t1 === t2) continue;
    const A = 4, B = -4 * (t1 + t2), C = 4 * t1 * t2; const g = gcd(gcd(A, B), C) || 1; const a = A / g, b = B / g, c = C / g;
    const fn = pick(['sin', 'cos']); const f = d => { const s = fn === 'sin' ? Math.sin(d * D2R) : Math.cos(d * D2R); return a * s * s + b * s + c; };
    const cnt = gsol(f).length; if (!cnt) continue;
        const lhs = (a === 1 ? '' : N(a)) + fn + '²x' + term(b, fn + ' x', 1, false).replace(/^(.)/, '$1') + term(c, '', 0, false);
    return numQ(`Kolik řešení má v intervalu ⟨0°; 360°) rovnice ${lhs.replace(/^\s*\+ /, '')} = 0?`, cnt, `Substituce t = ${fn} x: ${poly([c, b, a], 't')} = 0 ⇒ t = ${N(t1)} nebo t = ${N(t2)}; pro každé t spočítáme řešení v intervalu.`);
  }
});

/* =====================  API  ===================== */
function generate(topic, diff) {
  const list = G[topic] && G[topic][diff]; if (!list || !list.length) throw new Error('není generátor: ' + topic + '/' + diff);
  for (let i = 0; i < 8; i++) {
    const g = pick(list);
    try { const t = g.fn(); t.topic = topic; t.diff = diff; t.gen = g.name; return t; } catch (e) { if (i === 7) throw e; }
  }
}
function parseNum(s) {
  s = String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/,/g, '.');
  let m;
  if ((m = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(s))) return +m[2] === 0 ? NaN : (+m[1]) / (+m[2]);
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return +s;
  return NaN;
}
function checkNum(input, ans) { const v = parseNum(input); return isFinite(v) && Math.abs(v - ans) <= 1e-6 * Math.max(1, Math.abs(ans)); }

root.Tasks = { TOPICS, generate, checkNum, parseNum, _G: G };
if (typeof module !== 'undefined') module.exports = root.Tasks;
})(typeof window !== 'undefined' ? window : globalThis);
