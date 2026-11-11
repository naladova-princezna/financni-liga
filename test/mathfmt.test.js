/* Každý řetězec vygenerovaný úlohou musí projít převodem na TeX a KaTeX ho musí vysázet bez chyby. */
const path = require('path'); const fs = require('fs');
let katex; try { katex = require('katex'); } catch (e) { try { katex = require(path.join(process.env.KATEX_DIR || '', 'katex')); } catch (e2) { console.log('KaTeX (npm i katex) není nainstalován – test přeskočen'); process.exit(0); } }
globalThis.katex = katex;
const M = require('../mathfmt.js'); const T = require('../tasks.js');
let n = 0, bad = 0, seg = 0;
for (let i = 0; i < 120; i++) for (const t of T.TOPICS) for (const d of [1, 2, 3]) {
  const k = T.generate(t.id, d);
  for (const s of [k.q, k.expl, k.ansText, k.hint, ...(k.choices || [])].filter(Boolean)) {
    n++;
    for (const tex of M.texOf(s)) { seg++; try { katex.renderToString(tex, { throwOnError: true, strict: 'error' }); } catch (e) { if (bad++ < 10) console.log('✗', k.gen, tex, e.message.slice(0, 80)); } }
  }
}
console.log(`řetězců ${n}, vzorců ${seg}, chyb ${bad}`); process.exit(bad ? 1 : 0);
