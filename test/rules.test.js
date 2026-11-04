// Invarianty pravidel hry (node test/rules.test.js)
globalThis.Tasks = require('../tasks.js');
const E = require('../engine.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('✗', m); } else console.log('✓', m); };
function mk(n = 3) {
  const S = E.newState(); const ids = [];
  for (let i = 0; i < n; i++) { const id = 'p' + i; const p = E.joinPlayer(S, id, 'Hráč' + i); ids.push(p.id); }
  const t = E.mkTeam(S, 'Tým'); for (const id of ids) E.joinTeam(S, id, t.id);
  return { S, ids, t };
}
{ const { S, t } = mk(3); ok(E.living(S, t) === Math.round((300 + 130 * 3) * S.priceIndex / 10) * 10, 'životní náklady rostou s počtem členů');
  const s1 = mk(1); ok(E.living(s1.S, s1.t) < E.living(S, t), 'menší tým platí méně'); }
ok(E.satFactor(1) === 1 && E.satFactor(2) < 1 && E.satFactor(10) >= 0.4, 'saturace trhu klesá, ale ne pod 40 %');
{ const { S, ids, t } = mk(3); E.startGame(S); const m0 = t.money; const n0 = E.net(t);
  ok(typeof m0 === 'number' && m0 >= 0, 'start: peníze nezáporné');
  ok(n0 === m0 + 0 || Math.abs(n0 - m0) < 1, 'start: čisté jmění = hotovost'); }
ok(E.INS_PRICE === undefined || E.INS_PRICE >= 300, 'pojištění není podhodnocené');
console.log(fail ? `\nSELHALO: ${fail}` : '\nVše v pořádku'); process.exit(fail ? 1 : 0);
