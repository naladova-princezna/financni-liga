/* ============================================================
   mathfmt.js – převod zápisu úloh (české věty + Unicode matematika)
   na sazbu KaTeX. Generátory zůstávají beze změny; číslo, zlomek,
   mocninu, odmocninu, množinový a logický symbol rozpozná tento
   převodník a vysází je jako skutečnou matematiku (čárka jako
   desetinný oddělovač zůstává česká). Text věty se nemění.
   Bez KaTeX (nebo při chybě) se vrací původní řetězec.
   ============================================================ */
(function (root) {
'use strict';
const SYM = {
  '⇒': '\\Rightarrow', '⇔': '\\Leftrightarrow', '¬': '\\neg', '∀': '\\forall', '∃': '\\exists', '∈': '\\in', '∉': '\\notin',
  '⊂': '\\subset', '⊆': '\\subseteq', '∩': '\\cap', '∪': '\\cup', '∖': '\\setminus', '∧': '\\land', '∨': '\\lor',
  '≠': '\\ne', '≥': '\\ge', '≤': '\\le', '≈': '\\approx', '∞': '\\infty', 'π': '\\pi', '∅': '\\emptyset', '±': '\\pm',
  '°': '^{\\circ}', '′': "'", '·': '\\cdot', '⟨': '\\langle', '⟩': '\\rangle', '{': '\\{', '}': '\\}',
  'ℕ': '\\mathbb{N}', 'ℤ': '\\mathbb{Z}', 'ℚ': '\\mathbb{Q}', 'ℝ': '\\mathbb{R}', '−': '-', '+': '+', '=': '=', '<': '<', '>': '>', '/': '/',
  '½': '\\tfrac{1}{2}', '¼': '\\tfrac{1}{4}', '¾': '\\tfrac{3}{4}'
};
const OPEN = new Set(['(', '[', '{', '⟨']), CLOSE = new Set([')', ']', '}', '⟩']);
const SUPM = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', 'ˣ': 'x' };
const SUBM = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
const FUNC = { sin: '\\sin', cos: '\\cos', tg: '\\operatorname{tg}', cotg: '\\operatorname{cotg}', log: '\\log', ln: '\\ln', lim: '\\lim' };
const AMB = new Set(['a', 'i', 'o', 'u', 'k', 's', 'v', 'z']);          // jednopísmenná česká slova
const NOTVAR = new Set(['na', 'ta', 'ty', 'my', 'by', 'ma', 'tak', 'pak', 'ba', 'nu', 'ku', 'mu', 'tu', 'pu', 'ru', 'zu', 'vy', 'du']);
const WORD = /^[A-Za-zÀ-ſ]+/, NUM = /^\d+(?:[,.]\d+)?/, WS = /^(?:\s+|&nbsp;)+/;
const FRAC = /^<span class="fr"><i>([\s\S]*?)<\/i><b>([\s\S]*?)<\/b><\/span>/;
const TAG = /^<\/?[a-zA-Z][^>]*>/;
const cache = new Map();

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

/* najde odpovídající pravou závorku (od pozice i, kde je '(') */
function matchParen(s, i) { let d = 0; for (let j = i; j < s.length; j++) { if (s[j] === '(') d++; else if (s[j] === ')' && --d === 0) return j; } return -1; }

/* lexer: pole tokenů {k, raw, tex?} ; k = hard | num | var | amb | open | close | pipe | comma | colon | ws | text */
function lex(s) {
  const T = []; let i = 0;
  while (i < s.length) {
    const r = s.slice(i); let m, c = r[0];
    if ((m = FRAC.exec(r))) { T.push({ k: 'hard', raw: m[0], tex: '\\dfrac{' + frag(m[1]) + '}{' + frag(m[2]) + '}' }); i += m[0].length; continue; }
    if ((m = /^<sup>([\s\S]*?)<\/sup>/.exec(r))) { T.push({ k: 'sup', raw: m[0], tex: '^{' + expo(m[1]) + '}' }); i += m[0].length; continue; }
    if ((m = TAG.exec(r))) { T.push({ k: 'text', raw: m[0] }); i += m[0].length; continue; }
    if ((m = WS.exec(r))) { T.push({ k: 'ws', raw: m[0] }); i += m[0].length; continue; }
    if ((m = NUM.exec(r))) {
      const t = m[0], prevNum = true;
      T.push({ k: 'num', raw: t, tex: t.replace(/[,.]/, '{,}') }); i += t.length;
      /* 2ab, 3xy: číslo těsně následované 2–3 malými písmeny = součin proměnných */
      const w = /^[a-z]{2,3}(?![A-Za-zÀ-ſ])/.exec(s.slice(i));
      if (w && !FUNC[w[0]]) { T.push({ k: 'var', raw: w[0], tex: w[0].split('').join(' ') }); i += w[0].length; }
      continue;
    }
    if (c === '$') { const e = r.indexOf('$', 1); if (e > 0) { T.push({ k: 'hard', raw: r.slice(0, e + 1), tex: r.slice(1, e) }); i += e + 1; continue; } }
    if (c === '…') { T.push({ k: 'dots', raw: c, tex: '\\ldots' }); i++; continue; }
    if (c === '√' || c === '∛') {
      const rest = s.slice(i + 1); let arg = null, len = 0;
      if (rest[0] === '(') { const e = matchParen(rest, 0); if (e > 0) { arg = rest.slice(1, e); len = e + 1; } }
      if (arg == null && (m = /^(?:\d+(?:,\d+)?|[A-Za-z]|π)/.exec(rest))) { arg = m[0]; len = m[0].length; }
      if (arg != null) { T.push({ k: 'hard', raw: c + rest.slice(0, len), tex: (c === '∛' ? '\\sqrt[3]{' : '\\sqrt{') + frag(arg) + '}' }); i += 1 + len; continue; }
      T.push({ k: 'text', raw: c }); i++; continue;
    }
    if (SUPM[c] !== undefined) { let j = 0, v = ''; while (j < r.length && SUPM[r[j]] !== undefined) v += SUPM[r[j++]]; T.push({ k: 'sup', raw: r.slice(0, j), tex: '^{' + v + '}' }); i += j; continue; }
    if (SUBM[c] !== undefined) { let j = 0, v = ''; while (j < r.length && SUBM[r[j]] !== undefined) v += SUBM[r[j++]]; T.push({ k: 'sup', raw: r.slice(0, j), tex: '_{' + v + '}' }); i += j; continue; }
    if ((m = WORD.exec(r))) {
      const w = m[0]; i += w.length;
      if (FUNC[w]) T.push({ k: 'hard', raw: w, tex: FUNC[w] });
      else if (w.length === 1 && /[A-Za-z]/.test(w)) {
        const sentStart = /(^|[.?!:“„>]\s*)$/.test(s.slice(0, i - 1));
        const amb = AMB.has(w) || /[VKSZOI]/.test(w) || ((w === 'A' || w === 'U') && sentStart);
        T.push({ k: amb ? 'amb' : 'var', raw: w, tex: w });
      }
      else if (/^[a-z]{2,3}$/.test(w) && !NOTVAR.has(w) && /^[abcdkmnpqrtuvxyz]+$/.test(w)) T.push({ k: 'var', raw: w, tex: w.split('').join(' ') });
      else T.push({ k: 'text', raw: w });
      continue;
    }
    i++;
    if (c === 'π') T.push({ k: 'var', raw: c, tex: '\\pi' });
    else if (OPEN.has(c)) T.push({ k: 'open', raw: c, tex: SYM[c] || c });
    else if (CLOSE.has(c)) T.push({ k: 'close', raw: c, tex: SYM[c] || c });
    else if (c === '|') T.push({ k: 'pipe', raw: c, tex: '|' });
    else if (c === ',') T.push({ k: 'comma', raw: c, tex: ',\\;' });
    else if (c === ';') T.push({ k: 'semi', raw: c, tex: ';\\,' });
    else if (c === ':') T.push({ k: 'colon', raw: c, tex: ':' });
    else if (c === '°') T.push({ k: 'sup', raw: c, tex: '^{\\circ}' });
    else if (c === '′') T.push({ k: 'sup', raw: c, tex: "'" });
    else if (SYM[c]) T.push({ k: 'hard', raw: c, tex: SYM[c] });
    else T.push({ k: 'text', raw: c });
  }
  return T;
}

/* sestaví z tokenů text + matematické úseky */
const OPCH = new Set(['=', '+', '<', '>', '/', '-', '\\cdot', '\\Rightarrow', '\\Leftrightarrow', '\\land', '\\lor', '\\cup', '\\cap', '\\setminus']);
function convert(s, force) {
  const T = lex(s); const out = []; let run = [], pend = [];
  const raw = a => a.map(x => x.raw).join('');
  const texOfRun = a => {
    let tex = '';
    for (const x of a) {
      if (x.k === 'ws') continue;
      if (x.k === 'sup') tex += (tex === '' ? '{}' : '') + x.tex;
      else tex += (tex ? ' ' : '') + x.tex;
    }
    return tex;
  };
  /* rozdělí úsek podle nespárovaných závorek; české jednopísmenné spojky nechá textem */
  const emit = a => {
    const parts = []; let cur = [];
    const flush = () => { if (cur.length) parts.push(cur); cur = []; };
    const stack = []; const bad = new Set();
    a.forEach((x, i) => { if (x.k === 'open') stack.push(i); else if (x.k === 'close') { if (stack.length) stack.pop(); else bad.add(i); } });
    stack.forEach(i => bad.add(i));
    for (let i = 0; i < a.length; i++) { if (bad.has(i)) { flush(); parts.push([{ k: 'text', raw: a[i].raw }]); } else cur.push(a[i]); }
    flush();
    for (const p of parts) {
      if (p.length === 1 && p[0].k === 'text') { out.push(p[0].raw); continue; }
      const hard = p.some(x => x.k === 'hard' || x.k === 'sup' || x.k === 'open' || x.k === 'close' || x.k === 'pipe');
      let q = p;
      if (!hard && !force) {
        let sub = [];
        const fl = () => { if (sub.length) { sub2(sub); sub = []; } };
        const sub2 = z => { if (z.some(x => x.k === 'var')) final(z); else out.push(raw(z)); };
        for (const x of p) { if (x.k === 'amb') { fl(); out.push(x.raw); } else sub.push(x); }
        fl();
        continue;
      }
      final(q);
    }
  };
  const final = q => {
    let head = '', tail = '';
    while (q.length && q[0].k === 'ws') { head += q[0].raw; q = q.slice(1); }
    while (q.length && (q[q.length - 1].k === 'ws' || OPCH.has(q[q.length - 1].tex) || q[q.length - 1].k === 'colon' || q[q.length - 1].k === 'semi' || q[q.length - 1].k === 'comma')) { tail = q[q.length - 1].raw + tail; q = q.slice(0, -1); }
    if (head) out.push(head);
    if (q.length) {
      const ok = force || q.some(x => x.k === 'hard' || x.k === 'sup' || x.k === 'var' || x.k === 'open' || x.k === 'close' || x.k === 'pipe');
      if (ok) out.push({ tex: texOfRun(q), raw: raw(q) }); else out.push(raw(q));
    }
    if (tail) out.push(tail);
  };
  const finish = () => { if (run.length) { emit(run); run = []; } if (pend.length) { out.push(raw(pend)); pend = []; } };
  const depth = () => run.reduce((d, x) => d + (x.k === 'open' ? 1 : x.k === 'close' ? -1 : 0), 0);
  const lastRun = () => { for (let i = run.length - 1; i >= 0; i--) if (run[i].k !== 'ws') return run[i]; return null; };
  for (const t of T) {
    const k = t.k;
    if (k === 'hard' || k === 'num' || k === 'var' || k === 'amb') { run.push(...pend); pend = []; run.push(t); }
    else if (k === 'sup') { if (!run.length) { finish(); out.push(t.raw); } else { run.push(...pend, t); pend = []; } }
    else if (k === 'open') pend.push(t);
    else if (k === 'close') { if (run.length && pend.every(x => x.k === 'ws')) { run.push(...pend, t); pend = []; } else { finish(); out.push(t.raw); } }
    else if (k === 'pipe') {
      const last = lastRun();
      if (run.length && last && ['num', 'var', 'amb', 'close', 'sup'].includes(last.k) && pend.every(x => x.k === 'ws')) { run.push(...pend, t); pend = []; } else pend.push(t);
    }
    else if (k === 'comma' || k === 'semi') { if (run.length && depth() > 0) pend.push(t); else { finish(); out.push(t.raw); } }
    else if (k === 'dots') { if (run.length && depth() > 0) { run.push(...pend, t); pend = []; } else { finish(); out.push(t.raw); } }
    else if (k === 'colon') {
      const last = lastRun(); const spaced = run.length && run[run.length - 1].k === 'ws';
      if (run.length && last && (spaced || (last.k === 'hard' && /^\\mathbb/.test(last.tex)))) pend.push(t); else { finish(); out.push(t.raw); }
    }
    else if (k === 'ws') { if (run.length || pend.length) pend.push(t); else out.push(t.raw); }
    else { finish(); out.push(t.raw); }
  }
  finish();
  return out;
}

function expo(e) { const m = /^(−?)(\d+)\/(\d+)$/.exec(e); return m ? (m[1] ? '-' : '') + m[2] + '/' + m[3] : frag(e); }
function frag(s) { return convert(s, true).map(x => typeof x === 'string' ? x : x.tex).join(' '); }

function render(tex) {
  let h = cache.get(tex);
  if (h === undefined) {
    try { h = root.katex.renderToString(tex, { throwOnError: true, output: 'html', strict: 'ignore', trust: false }); }
    catch (e) { h = null; }
    if (cache.size > 4000) cache.clear();
    cache.set(tex, h);
  }
  return h;
}

function html(s) {
  if (s == null || s === '') return s == null ? '' : s;
  s = String(s);
  if (!root.katex) return s;
  if (!/[\dA-Za-z√∛⁰-⁹₀-₉½¼¾π∞]|<span class="fr"/.test(s)) return s;
  try {
    return convert(s).map(x => {
      if (typeof x === 'string') return x;
      const h = render(x.tex); return h ? h : x.raw;
    }).join('');
  } catch (e) { return s; }
}

/* sada všech TeX úseků řetězce (pro testy) */
function texOf(s) { return convert(String(s)).filter(x => typeof x !== 'string').map(x => x.tex); }

const Mathfmt = { html, texOf, convert };
root.Mathfmt = Mathfmt;
if (typeof module !== 'undefined') module.exports = Mathfmt;
})(typeof window !== 'undefined' ? window : globalThis);
