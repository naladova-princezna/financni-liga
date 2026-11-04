// Nezávislá numerická kontrola algebraických úloh: správná volba musí být ekvivalentní zadání, ostatní ne.
globalThis.Tasks = require('../tasks.js'); const T = Tasks;
const sup = { '⁻': '-', '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
function toJs(s) {
  s = s.replace(/<span class="fr"><i>(.*?)<\/i><b>(.*?)<\/b><\/span>/g, '(($1)/($2))').replace(/<[^>]+>/g, '');
  s = s.replace(/−/g, '-').replace(/·/g, '*').replace(/&nbsp;/g, ' ');
  s = s.replace(/([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, m => '**' + [...m].map(c => sup[c]).join(''));
  s = s.replace(/(\d)\s*([a-z(])/g, '$1*$2').replace(/([a-z)])\s*\(/g, '$1*(').replace(/\)\s*([a-z\d])/g, ')*$1').replace(/([a-z])\s*([a-z])/g, '$1*$2');
  s = s.replace(/\*\*-/g, '**@').replace(/(^|[(+\-*/])\s*-/g, '$1 -1*').replace(/\*\*@/g, '**-');
  return s;
}
const ev = (s, vars) => { try { return Function(...Object.keys(vars), 'return (' + toJs(s) + ')')(...Object.values(vars)); } catch (e) { return NaN; } };
let bad = 0, checked = 0;
const pts = [{ x: 3.7, a: 1.3, b: 2.1 }, { x: -2.3, a: 0.7, b: 1.9 }, { x: 5.1, a: 2.2, b: 0.6 }];
for (let n = 0; n < 4000; n++) {
  const t = T.generate('vyrazy', 1 + n % 3); if (t.type !== 'mc') continue;
  const m = String(t.q).match(/^(?:Zjednodušte(?: \([^)]*\))?|Sečtěte|Použijte vzorec|Rozložte na součin|Zjednodušte pro [^:]*): (.*?)(?: =)?$/); if (!m) continue;
  if (/√/.test(m[1]) || /\|/.test(m[1])) continue;
  const expr = m[1]; checked++;
  const eq = c => pts.every(p => { const u = ev(expr, p), v = ev(c, p); return isFinite(u) && isFinite(v) && Math.abs(u - v) < 1e-6 * (1 + Math.abs(u)); });
  const good = t.choices.filter(eq);
  if (good.length !== 1 || t.choices[t.correct] !== good[0]) { bad++; if (bad < 8) console.log('✗', t.gen, '|', t.q.replace(/<[^>]+>/g, ' '), '|', t.choices.map(c => c.replace(/<[^>]+>/g, ' ')), '→', t.ansText.replace(/<[^>]+>/g, ' ')); }
}
// √(A²) s podmínkou x < c: ověření v bodě x = c − 1,5
for (let n = 0; n < 600; n++) {
  const t = T.generate('vyrazy', 3); if (t.gen !== 'odmocnina z čtverce') continue;
  const m = t.q.match(/pro x < (−?\d+): √\((.*)\)$/); if (!m) continue; checked++;
  const x = parseFloat(m[1].replace('−', '-')) - 1.5, truth = Math.abs(ev(m[2].replace(/²$/, ''), { x }));
  const good = t.choices.filter(c => Math.abs(ev(c, { x }) - truth) < 1e-9);
  if (good.length !== 1 || t.choices[t.correct] !== good[0]) { bad++; console.log('✗ sqrt', t.q, t.choices, t.ansText); }
}
console.log(`zkontrolováno ${checked}, chyb ${bad}`); process.exit(bad ? 1 : 0);
