/* ============================================================
   engine.js – pravidla hry (bez sítě a bez DOM, lze testovat v Node)
   Stav hry (S) je čistě JSON; autoritativní kopii drží učitelský počítač.
   ============================================================ */
(function (root) {
'use strict';
const Tasks = root.Tasks;
const MINUS = '−';

/* ---------- konstanty ---------- */
const ROLES = [
  { key: 'ceo', name: 'Ředitel', emoji: '💼', does: 'kupuje a prodává podniky' },
  { key: 'cfo', name: 'Finančník', emoji: '🏦', does: 'spoří a řeší úvěry' },
  { key: 'adm', name: 'Správce', emoji: '🛡️', does: 'pojištění a školení' },
];
const TEAM_COLORS = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#cc5de8', '#ff922b', '#20c997', '#f06595', '#748ffc', '#a9e34b', '#e599f7', '#66d9e8'];
const TEAM_EMOJI = ['🦊', '🐼', '🦁', '🐙', '🦉', '🐯', '🐸', '🦄', '🐧', '🦈', '🐺', '🦖'];
const ASSETS = [
  { id: 'cafe', name: 'Kavárna', emoji: '☕', price: 1500, mean: .10, sd: .04, risk: 'nízké', desc: 'Malý stabilní podnik.' },
  { id: 'shop', name: 'Dílna', emoji: '🛠️', price: 3000, mean: .13, sd: .12, risk: 'střední', desc: 'Řemeslná výroba, výnos kolísá víc.' },
  { id: 'tech', name: 'Technologický startup', emoji: '💻', price: 5000, mean: .16, sd: .40, risk: 'vysoké', desc: 'Vysoký výnos, ale i reálná šance na ztrátu.' },
  { id: 'home', name: 'Nemovitost k pronájmu', emoji: '🏠', price: 8000, mean: .05, sd: .01, risk: 'nízké', desc: 'Nájemné ~5 % a hodnota roste s inflací.', appreciates: true },
];
const ASSET_BY = Object.fromEntries(ASSETS.map(a => [a.id, a]));
const LIVING = 700;            // základní roční životní náklady týmu
const MAX_LOAN = 6000;
const INS_PRICE = 300;           // ≈ očekávaná škoda (40 % × ~1 075 Kč × 70 % pravděp. ztráty)
const SAT = 0.12;                // každý další kus téhož podniku vynáší o 12 % méně (nasycení trhu)
const satFactor = n => { let s = 0; for (let i = 0; i < n; i++) s += Math.max(.4, 1 - SAT * i); return s / n; };
const TRAIN_PRICE = [1000, 1800, 2600];
const TRAIN_BONUS = 0.15;
const BASE = { 1: 100, 2: 250, 3: 500 };
const PEN = { 1: 30, 2: 60, 3: 150 }; const GUESS_LOCK = [0, 3000, 8000]; // pauza po chybě: 3 s, od druhé chyby po sobě 8 s
const SKIP_FEE = 20;
const STREAK_EVERY = 3, STREAK_BONUS = 50;
const MAX_TEAM = 3;

const EVENTS = [
  { id: 'calm', emoji: '🌤️', name: 'Klidná ekonomika', text: 'Ceny rostou pomalu, banky nabízejí běžné úroky.', infl: 2, save: 2.5, loan: 7, tax: 15, mods: {}, lesson: 'Při nízké inflaci si úspory zachovají hodnotu, ale úrok na spořicím účtu je malý.' },
  { id: 'infl', emoji: '🔥', name: 'Rostoucí inflace', text: 'Ceny prudce rostou. Peníze „v kapse“ ztrácejí hodnotu.', infl: 9, save: 3, loan: 9, tax: 15, mods: { home: .04 }, lesson: 'Je-li inflace vyšší než úrok z úspor, reálná hodnota úspor klesá. Reálná aktiva (např. nemovitosti) inflaci často dohánějí.' },
  { id: 'boom', emoji: '🚀', name: 'Hospodářský růst', text: 'Firmy expandují, lidé více utrácejí. Zaměstnavatelé platí lépe.', infl: 3, save: 3, loan: 6, tax: 15, mods: { cafe: .06, shop: .08, tech: .12 }, rew: 1.15, lesson: 'V době růstu se vyplácí podnikat – ale i rizika bývají podceňována.' },
  { id: 'crisis', emoji: '📉', name: 'Recese', text: 'Poptávka klesá a firmy šetří. Odměny za práci klesají.', infl: 1, save: 1, loan: 8, tax: 15, mods: { cafe: -.09, shop: -.10, tech: -.30, home: -.03 }, rew: .85, lesson: 'Diverzifikace a finanční rezerva pomáhají přežít špatná léta.' },
  { id: 'taxup', emoji: '🧾', name: 'Daňová reforma', text: 'Vláda zvyšuje daň z příjmů na 25 %.', infl: 2, save: 2.5, loan: 7, tax: 25, mods: {}, lesson: 'Daně snižují čistý příjem. Vždy porovnávej výnos až po zdanění.' },
  { id: 'taxdown', emoji: '✂️', name: 'Snížení daní', text: 'Daň z příjmů klesá na 10 %. Zbývá vám víc z vydělaného.', infl: 2, save: 2.5, loan: 7, tax: 10, mods: {}, lesson: 'Nižší daně zvyšují čistý příjem domácností i firem.' },
  { id: 'rates', emoji: '🏦', name: 'Centrální banka zvyšuje sazby', text: 'Spoření se vyplácí, ale úvěry jsou výrazně dražší.', infl: 4, save: 5.5, loan: 12, tax: 15, mods: { home: -.04, tech: -.08 }, lesson: 'Vysoké úroky odměňují střadatele a trestají dlužníky.' },
  { id: 'tech', emoji: '🤖', name: 'Technologický boom', text: 'Investoři milují technologie. Startupy bohatnou.', infl: 3, save: 2.5, loan: 7, tax: 15, mods: { tech: .30, shop: .03 }, lesson: 'Vysoké výnosy lákají – bubliny ale často splaskávají. Nesázej vše na jednu kartu.' },
  { id: 'energy', emoji: '⛽', name: 'Energetická krize', text: 'Drahá energie zvyšuje ceny a ubírá marže výrobě.', infl: 7, save: 3, loan: 9, tax: 15, mods: { shop: -.08, cafe: -.04 }, lesson: 'Inflace způsobená náklady zasáhne hlavně podniky s velkou spotřebou energie.' },
  { id: 'mortgage', emoji: '🏘️', name: 'Bydlení je v kurzu', text: 'Ceny nemovitostí rostou, hypotéky jsou levné.', infl: 3, save: 2, loan: 5, tax: 15, mods: { home: .07 }, lesson: 'Nízké sazby podporují poptávku po bydlení, ale zvyšují ceny.' },
  { id: 'edu', emoji: '🎓', name: 'Dotace na vzdělávání', text: 'Stát hradí polovinu ceny školení.', infl: 2, save: 2.5, loan: 7, tax: 15, mods: {}, trainDiscount: .5, lesson: 'Investice do vzdělání patří mezi nejvýnosnější – zvyšují budoucí příjem.' },
  { id: 'labor', emoji: '🧑‍💼', name: 'Nedostatek odborníků', text: 'Firmy shání kvalifikované lidi, odměny rostou o 30 %.', infl: 4, save: 3, loan: 8, tax: 15, mods: {}, rew: 1.3, lesson: 'Kvalifikovaná práce je vzácná, a proto dobře placená.' },
];
const DISC = {
  calm: 'Proč se vyplatí spořit, i když je úrok nízký? Co by se stalo, kdyby inflace byla 8 %?',
  infl: 'Co se stalo s reálnou hodnotou vašich úspor? Které z vašich aktiv inflaci „dohání“ a proč?',
  boom: 'Proč je v době růstu snadné podcenit riziko? Co byste dělali, kdyby po boomu přišla recese?',
  crisis: 'Kdo z vás měl rezervu a kdo musel sáhnout po úvěru? Jak by vypadal rok bez diverzifikace?',
  taxup: 'Kolik z vydělaných peněz vám stát vzal? Vyplatí se podnikat i při vyšší dani?',
  taxdown: 'Co udělá nižší daň s motivací pracovat a investovat? Co může stát přijít o?',
  rates: 'Komu zvýšení sazeb pomáhá a komu škodí? Měli jste dluh? Co s ním teď?',
  tech: 'Je vysoký výnos „zadarmo“? Jak poznat bublinu? Kolik z majetku je rozumné dát do rizikových aktiv?',
  energy: 'Proč inflace nezasáhne všechny stejně? Kdo je na tom hůř – podnik s velkou spotřebou energie, nebo nemovitost?',
  mortgage: 'Proč nízké úroky zvedají ceny nemovitostí? Je výhodné se kvůli investici zadlužit?',
  edu: 'Proč patří vzdělání mezi nejvýnosnější investice? Čím se liší od koupě podniku?',
  labor: 'Proč jsou kvalifikovaní lidé dobře placení? Co z toho plyne pro vaše vlastní studium?',
};
const LOCAL_EVENTS = [
  { id: 'fire', emoji: '🔥', name: 'Požár v dílně', type: 'loss', amount: 1200, text: 'Škoda na vybavení.' },
  { id: 'car', emoji: '🚗', name: 'Porucha firemního auta', type: 'loss', amount: 700, text: 'Nutná oprava.' },
  { id: 'theft', emoji: '🕵️', name: 'Krádež vybavení', type: 'loss', amount: 900, text: 'Zloději odnesli techniku.' },
  { id: 'flood', emoji: '🌊', name: 'Zatopený sklep', type: 'loss', amount: 1500, text: 'Voda zničila zásoby.' },
  { id: 'grant', emoji: '🎁', name: 'Dotace pro malé podnikatele', type: 'gain', amount: 800, text: 'Stát vám přispěl.' },
  { id: 'bonus', emoji: '🏆', name: 'Vyhráli jste soutěž', type: 'gain', amount: 600, text: 'Výhra v regionální soutěži.' },
];
const kc = n => { n = Math.round(n); return (n < 0 ? MINUS : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Kč'; };

/* ---------- pomocné ---------- */
const uid = () => Math.random().toString(36).slice(2, 8);
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = a => a[rnd(0, a.length - 1)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const round10 = n => Math.round(n / 10) * 10;
const round50 = n => Math.round(n / 50) * 50;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- tajné cíle ---------- */
const nAssets = t => ASSETS.reduce((s, a) => s + t.assets[a.id].n, 0);
const nKinds = t => ASSETS.filter(a => t.assets[a.id].n > 0).length;
const acc = t => (t.correct + t.wrong) ? t.correct / (t.correct + t.wrong) : 0;
const GOALS = [
  { id: 'saver', emoji: '🐷', name: 'Rezerva do nouze', desc: S => `Skonči hru s úsporami na spořicím účtu alespoň ${kc(1000 * S.settings.years)}.`, check: (t, S) => t.savings >= 1000 * S.settings.years, prog: (t, S) => `${kc(t.savings)} / ${kc(1000 * S.settings.years)}` },
  { id: 'debtfree', emoji: '🕊️', name: 'Bez dluhů', desc: () => 'Skonči hru bez jakéhokoli dluhu a s alespoň 2 podniky.', check: t => t.loan === 0 && nAssets(t) >= 2, prog: t => `dluh ${kc(t.loan)}, podniků ${nAssets(t)}` },
  { id: 'entre', emoji: '🏭', name: 'Podnikatel', desc: () => 'Skonči hru s alespoň 4 podniky.', check: t => nAssets(t) >= 4, prog: t => `podniků ${nAssets(t)} / 4` },
  { id: 'diver', emoji: '🧺', name: 'Diverzifikace', desc: () => 'Skonči hru s podniky alespoň 3 různých druhů.', check: t => nKinds(t) >= 3, prog: t => `druhů ${nKinds(t)} / 3` },
  { id: 'insured', emoji: '☂️', name: 'Opatrný hospodář', desc: S => `Měj pojištění alespoň ${Math.max(1, S.settings.years - 1)} z ${S.settings.years} let.`, check: (t, S) => t.insuredCount >= Math.max(1, S.settings.years - 1), prog: (t, S) => `${t.insuredCount} / ${Math.max(1, S.settings.years - 1)} let` },
  { id: 'edu', emoji: '🎓', name: 'Celoživotní vzdělávání', desc: () => 'Dosáhni nejvyšší úrovně školení (3).', check: t => t.train >= 3, prog: t => `úroveň ${t.train} / 3` },
  { id: 'math', emoji: '🧠', name: 'Matematický mozek', desc: S => `Vyřešte správně alespoň ${8 * S.settings.years} úloh s úspěšností alespoň 70 %.`, check: (t, S) => t.correct >= 8 * S.settings.years && acc(t) >= .7, prog: (t, S) => `${t.correct} / ${8 * S.settings.years} správně, ${Math.round(acc(t) * 100)} %` },
  { id: 'rich', emoji: '💎', name: 'Bohatý tým', desc: S => `Skonči s čistým jměním alespoň ${kc(3500 * S.settings.years)}.`, check: (t, S) => net(t) >= 3500 * S.settings.years, prog: (t, S) => `${kc(net(t))} / ${kc(3500 * S.settings.years)}` },
];
const GOAL_BY = Object.fromEntries(GOALS.map(g => [g.id, g]));

/* ---------- stav ---------- */
function newState(code) {
  return {
    v: 1, code, phase: 'lobby', year: 0, settings: { years: 6, workSec: 240, decideSec: 150, startMoney: 2000, diffs: [1, 2, 3], topics: Tasks.TOPICS.map(t => t.id) },
    players: {}, teams: [], topicStats: {}, awards: null, paused: false, pauseLeft: 0, event: null, usedEvents: [], priceIndex: 1, endsAt: 0, final: null, tcount: 0,
  };
}
function econ(S) {
  return { netStart: S.settings.startMoney, money: S.settings.startMoney, savings: 0, loan: 0, assets: Object.fromEntries(ASSETS.map(a => [a.id, { n: 0, value: 0 }])), train: 0, insuredYear: 0, insuredCount: 0, ready: false, log: [], sugg: {}, earnedYear: 0, earnedTotal: 0, correct: 0, wrong: 0, yc: 0, yw: 0, last: null, history: [], goal: null };
}
function assetValue(t) { return ASSETS.reduce((s, a) => s + t.assets[a.id].value, 0); }
function net(t) { return Math.round(t.money + t.savings + assetValue(t) - t.loan); }
const teamOf = (S, pid) => { const p = S.players[pid]; return p && p.teamId ? S.teams.find(t => t.id === p.teamId) : null; };
function roleIdx(t, pid) { return t.members.indexOf(pid); }
function canDo(t, pid, key) { const idx = ROLES.findIndex(r => r.key === key); const my = roleIdx(t, pid); return my === idx || t.members.length <= idx; }

function joinPlayer(S, token, name) {
  let p = Object.values(S.players).find(x => x.token === token);
  name = String(name || '').trim().slice(0, 16) || 'Hráč';
  if (!p) { p = { id: 'p' + uid(), token, name, teamId: null, online: true, lastSeen: Date.now(), streak: 0, correct: 0, wrong: 0, earned: 0, task: null, lastRes: null, recent: [], diff: 1, stats: {}, best: 0, hard: 0, wrongRun: 0, okRun: 0 }; S.players[p.id] = p; }
  else { p.name = name; p.online = true; p.lastSeen = Date.now(); }
  return p;
}
function mkTeam(S, name, emoji) {
  const i = S.teams.length; const used = new Set(S.teams.map(t => t.emoji));
  const t = Object.assign({ id: 't' + (++S.tcount), name: String(name || '').trim().slice(0, 18) || 'Tým ' + (i + 1), emoji: (emoji && !used.has(emoji)) ? emoji : (TEAM_EMOJI.find(e => !used.has(e)) || '⭐'), color: TEAM_COLORS[S.tcount % TEAM_COLORS.length], members: [] }, econ(S));
  S.teams.push(t); return t;
}
function leaveTeam(S, pid) {
  const p = S.players[pid]; if (!p || !p.teamId) return;
  const t = S.teams.find(x => x.id === p.teamId); p.teamId = null;
  if (t) { t.members = t.members.filter(m => m !== pid); if (!t.members.length && S.phase === 'lobby') S.teams = S.teams.filter(x => x !== t); }
}
function joinTeam(S, pid, tid) {
  const p = S.players[pid], t = S.teams.find(x => x.id === tid); if (!p || !t) return 'Tým neexistuje.';
  if (p.teamId === tid) return null;
  if (t.members.length >= MAX_TEAM) return 'Tým je už plný (max. 3 hráči).';
  leaveTeam(S, pid); t.members.push(pid); p.teamId = tid; return null;
}
function autoAssign(S) {
  const free = shuffle(Object.values(S.players).filter(p => !p.teamId));
  for (const p of free) {
    let t = S.teams.filter(x => x.members.length < MAX_TEAM).sort((a, b) => b.members.length - a.members.length)[0];
    if (!t) t = mkTeam(S);
    t.members.push(p.id); p.teamId = t.id;
  }
  /* přeřazení zbytků: pokud jsou 2 týmy s 1 hráčem a jinak plné, nech to být */
}

/* ---------- průběh hry ---------- */
function startGame(S) {
  autoAssign(S);
  S.teams = S.teams.filter(t => t.members.length);
  if (!S.teams.length) return 'Nikdo se zatím nepřipojil.';
  const goals = shuffle(GOALS);
  S.teams.forEach((t, i) => { Object.assign(t, econ(S)); t.goal = goals[i % goals.length].id; });
  Object.values(S.players).forEach(resetPlayer);
  S.topicStats = {}; S.awards = null; S.paused = false;
  S.year = 1; S.priceIndex = 1; S.usedEvents = []; S.final = null; drawEvent(S);
  S.phase = 'event'; S.endsAt = 0; return null;
}
function resetPlayer(p) { p.streak = 0; p.correct = 0; p.wrong = 0; p.earned = 0; p.task = null; p.lastRes = null; p.stats = {}; p.best = 0; p.hard = 0; p.wrongRun = 0; p.okRun = 0; }
function drawEvent(S) {
  let ev;
  if (S.year === 1) ev = EVENTS[0];
  else { let pool = EVENTS.filter(e => !S.usedEvents.includes(e.id) && e.id !== 'calm'); if (!pool.length) { S.usedEvents = []; pool = EVENTS.filter(e => e.id !== 'calm'); } ev = pick(pool); }
  S.usedEvents.push(ev.id); S.event = JSON.parse(JSON.stringify(ev)); S.event.q = DISC[ev.id] || '';
  S.teams.forEach(t => { t.sugg = {}; t.ready = false; }); Object.values(S.players).forEach(p => { p.yn = 0; });
  S.priceIndex = +(S.priceIndex * (1 + ev.infl / 100)).toFixed(4);
}
function next(S) {
  const now = Date.now();
  switch (S.phase) {
    case 'lobby': return startGame(S);
    case 'event': S.paused = false; S.phase = 'work'; S.endsAt = now + S.settings.workSec * 1000; break;
    case 'work': S.paused = false; Object.values(S.players).forEach(p => { p.task = null; }); S.phase = 'decide'; S.teams.forEach(t => { t.ready = false; }); S.endsAt = now + S.settings.decideSec * 1000; break;
    case 'decide': S.paused = false; resolveYear(S); S.phase = 'result'; S.endsAt = 0; break;
    case 'result':
      if (S.year >= S.settings.years) { finalize(S); S.phase = 'final'; }
      else { S.year++; drawEvent(S); Object.values(S.players).forEach(p => { p.lastRes = null; }); S.phase = 'event'; }
      S.endsAt = 0; break;
    case 'final': return resetGame(S);
  }
  return null;
}
function togglePause(S) {
  if (S.phase !== 'work' && S.phase !== 'decide') return;
  if (!S.paused) { S.paused = true; S.pauseLeft = Math.max(0, S.endsAt - Date.now()); S.endsAt = 0; }
  else { S.paused = false; S.endsAt = Date.now() + S.pauseLeft; }
}
function resetGame(S) {
  S.phase = 'lobby'; S.year = 0; S.event = null; S.final = null; S.priceIndex = 1; S.endsAt = 0;
  S.teams.forEach(t => Object.assign(t, econ(S)));
  Object.values(S.players).forEach(resetPlayer); S.topicStats = {}; S.awards = null; S.paused = false;
  return null;
}
/* životní náklady rostou s počtem členů – malé týmy nejsou znevýhodněné */
function living(S, t) { return round10((300 + 130 * t.members.length) * S.priceIndex); }
function prices(S) {
  const idx = S.priceIndex, ev = S.event || EVENTS[0];
  return {
    assets: Object.fromEntries(ASSETS.map(a => [a.id, round50(a.price * idx)])),
    insurance: round10(INS_PRICE * idx),
    train: TRAIN_PRICE.map(p => round50(p * idx * (ev.trainDiscount || 1))),
    living: round10(LIVING * idx),
    maxLoan: MAX_LOAN,
  };
}

/* ---------- vyhodnocení roku ---------- */
function resolveYear(S) {
  const ev = S.event, pr = prices(S);
  for (const t of S.teams) {
    const L = []; const add = (label, amt, kind, extra) => L.push(Object.assign({ label, amt: Math.round(amt), kind: kind || (amt >= 0 ? 'in' : 'out') }, extra || {}));
    const start = t.netStart;
    add('Příjem z úloh (už připsáno v hotovosti)', t.earnedYear, 'info');
    let taxable = t.earnedYear; const lv = living(S, t); const sat = n => satFactor(n);
    const pay = (amt) => { t.money -= amt; if (t.money < 0) { t.loan += -t.money; t.money = 0; return true; } return false; };
    /* spoření */
    if (t.savings > 0) { const i = Math.round(t.savings * ev.save / 100); t.savings += i; taxable += Math.max(0, i); add(`Úrok ze spoření (${String(ev.save).replace('.', ',')} %)`, i, 'in', { note: 'připsáno na spořicí účet' }); }
    /* podniky */
    for (const a of ASSETS) {
      const o = t.assets[a.id]; if (!o.n) continue;
      let ret;
      const sf = satFactor(o.n), satNote = sf < .999 ? ` · nasycení trhu −${Math.round((1 - sf) * 100)} %` : '';
      if (a.appreciates) { ret = a.mean * sf + (ev.mods[a.id] || 0) * .5; const inc = Math.round(o.value * ret); t.money += inc; taxable += Math.max(0, inc); const gain = Math.round(o.value * ev.infl / 100); o.value += gain; add(`${a.emoji} ${a.name} ×${o.n} – nájem`, inc, 'in', satNote ? { note: satNote.slice(3) } : null); add(`${a.emoji} růst hodnoty nemovitosti`, gain, 'info', { note: `+${ev.infl} % (inflace)` }); continue; }
      ret = Math.max(-.6, Math.min(1.2, a.mean * sf + (ev.mods[a.id] || 0) + a.sd * gauss()));
      const inc = Math.round(o.value * ret); t.money += inc; taxable += Math.max(0, inc);
      add(`${a.emoji} ${a.name} ×${o.n}`, inc, inc >= 0 ? 'in' : 'out', { note: `výnos ${(ret * 100).toFixed(1).replace('.', ',').replace('-', MINUS)} %${satNote}` });
    }
    /* úvěr */
    if (t.loan > 0) { const li = Math.round(t.loan * ev.loan / 100); const over = pay(li); add(`Úrok z úvěru (${ev.loan} %)`, -li, 'out', over ? { note: 'nedostatek peněz → přidáno k úvěru' } : null); }
    /* daň */
    const tax = Math.round(taxable * ev.tax / 100); if (tax > 0) { const over = pay(tax); add(`Daň z příjmů (${ev.tax} % z ${kc(taxable)})`, -tax, 'out', over ? { note: 'nedostatek peněz → přidáno k úvěru' } : null); }
    /* živobytí */
    { const over = pay(lv); add(`Životní náklady týmu (${t.members.length} čl.)`, -lv, 'out', over ? { note: 'nedostatek peněz → přidáno k úvěru' } : null); }
    /* místní událost */
    let local = null;
    if (Math.random() < .4) {
      const e = pick(Math.random() < .7 ? LOCAL_EVENTS.filter(x => x.type === 'loss') : LOCAL_EVENTS.filter(x => x.type === 'gain'));
      const amt = round50(e.amount * S.priceIndex);
      if (e.type === 'loss') {
        if (t.insuredYear === S.year) { local = { ...e, amt, insured: true }; add(`${e.emoji} ${e.name} – škoda ${kc(amt)} uhradila pojišťovna`, 0, 'ok'); }
        else { const over = pay(amt); local = { ...e, amt, insured: false }; add(`${e.emoji} ${e.name} (neslo pojištěno)`, -amt, 'out', over ? { note: 'nedostatek peněz → přidáno k úvěru' } : null); }
      } else { t.money += amt; local = { ...e, amt }; add(`${e.emoji} ${e.name}`, amt, 'in'); }
    }
    t.money = Math.round(t.money);
    const endNet = net(t);
    t.history.push(endNet); t.netStart = endNet;
    t.last = { year: S.year, lines: L, startNet: start, endNet, delta: endNet - start, earned: t.earnedYear, local, yc: t.yc, yw: t.yw };
    t.earnedYear = 0; t.yc = 0; t.yw = 0;
  }
}
function awards(S) {
  const ps = Object.values(S.players).filter(p => p.teamId); const A = [];
  const best = (fn, min) => ps.filter(p => fn(p) >= min).sort((a, b) => fn(b) - fn(a))[0];
  const n = p => p.correct + p.wrong;
  let w;
  if ((w = best(p => p.earned, 1))) A.push({ emoji: '💰', title: 'Největší výdělkář', name: w.name, detail: kc(w.earned) });
  if ((w = best(p => n(p) >= 8 ? p.correct / n(p) : 0, .01))) A.push({ emoji: '🎯', title: 'Přesný střelec', name: w.name, detail: Math.round(100 * w.correct / n(w)) + ' % úspěšnost' });
  if ((w = best(p => p.best, 3))) A.push({ emoji: '🔥', title: 'Král série', name: w.name, detail: w.best + ' správně v řadě' });
  if ((w = best(p => p.hard, 1))) A.push({ emoji: '🧗', title: 'Odvážlivec', name: w.name, detail: w.hard + '× vyřešená těžká úloha' });
  if ((w = best(p => n(p), 1))) A.push({ emoji: '⚡', title: 'Nejvíc úloh', name: w.name, detail: n(w) + ' úloh' });
  return A;
}
function finalize(S) {
  S.awards = awards(S);
  const rows = S.teams.map(t => { const g = GOAL_BY[t.goal]; return { teamId: t.id, net: net(t), goalId: t.goal, goalMet: !!(g && g.check(t, S)), correct: t.correct, wrong: t.wrong }; });
  rows.sort((a, b) => (b.goalMet - a.goalMet) || (b.net - a.net));
  rows.forEach((r, i) => r.rank = i + 1); S.final = rows;
}
function goalState(S, t) { const g = GOAL_BY[t.goal]; if (!g) return null; return { id: g.id, emoji: g.emoji, name: g.name, desc: g.desc(S), ok: !!g.check(t, S), prog: g.prog(t, S) }; }

/* ---------- úlohy ---------- */
function giveTask(S, pid, diff) {
  const p = S.players[pid]; if (S.phase !== 'work') return 'Teď nelze řešit úlohy.';
  if (S.paused) return 'Hra je pozastavena.';
  if (!teamOf(S, pid)) return 'Nejdřív vstup do týmu.';
  if (p.lockUntil && Date.now() < p.lockUntil) return `Přečti si řešení – další úloha za ${Math.ceil((p.lockUntil - Date.now()) / 1000)} s.`;
  diff = [1, 2, 3].includes(+diff) ? +diff : 1; const okd = S.settings.diffs && S.settings.diffs.length ? S.settings.diffs : [1, 2, 3]; if (!okd.includes(diff)) diff = okd.reduce((b, d) => Math.abs(d - diff) < Math.abs(b - diff) ? d : b, okd[0]); p.diff = diff; p.lastRes = null;
  const topics = S.settings.topics.length ? S.settings.topics : Tasks.TOPICS.map(t => t.id);
  let t, tries = 0; p.rg = p.rg || [];
  // pestrost: nezopakovat zadání (40 posledních), stejný typ úlohy (4 poslední) ani stejné téma dvakrát po sobě
  // opakování nejslabšího tématu (aspoň 2 pokusy a ≥ 40 % chyb) – každá třetí úloha zhruba
  const weak = Object.entries(p.stats).filter(([k, v]) => topics.includes(k) && v.c + v.w >= 2 && v.w / (v.c + v.w) >= .4).sort((a, b) => b[1].w / (b[1].c + b[1].w) - a[1].w / (a[1].c + a[1].w))[0];
  const review = weak && Math.random() < .3 ? weak[0] : null;
  do { const tp = review && tries < 6 ? review : topics.length > 1 && tries < 12 ? pick(topics.filter(x => x !== p.lastTopic)) : pick(topics); t = Tasks.generate(tp, diff); tries++; }
  while ((p.recent.includes(t.q) || (p.rg.includes(t.topic + ':' + t.gen) && tries < 14)) && tries < 20);
  p.recent.push(t.q); if (p.recent.length > 40) p.recent.shift();
  if (review && t.topic === review) t.review = true;
  p.rg.push(t.topic + ':' + t.gen); if (p.rg.length > 4) p.rg.shift(); p.lastTopic = t.topic;
  t.id = uid(); p.task = t; return null;
}
function answerTask(S, pid, m) {
  const p = S.players[pid], t = teamOf(S, pid);
  if (S.phase !== 'work') return { err: 'Čas na práci vypršel.' };
  if (S.paused) return { err: 'Hra je pozastavena.' };
  if (!p || !p.task || p.task.id !== m.id) return { err: 'Tahle úloha už neplatí.' };
  const task = p.task; let ok = false;
  if (task.type === 'mc') ok = +m.a === task.correct; else ok = Tasks.checkNum(m.a, task.ans);
  p.yn = (p.yn || 0) + 1;
  const res = { id: task.id, ok, diff: task.diff, topic: task.topic, ansText: task.ansText, expl: task.expl, q: task.q, reward: 0, pen: 0, bonus: 0 };
  const ts = S.topicStats[task.topic] = S.topicStats[task.topic] || { c: 0, w: 0 }, ps = p.stats[task.topic] = p.stats[task.topic] || { c: 0, w: 0 };
  if (ok) { ts.c++; ps.c++; p.okRun++; p.wrongRun = 0; if (task.diff === 3) p.hard++; } else { ts.w++; ps.w++; p.wrongRun++; p.okRun = 0; }
  if (ok) {
    const mult = (1 + TRAIN_BONUS * t.train) * ((S.event && S.event.rew) || 1);
    const f = task.type === 'mc' && task.choices.length === 2 ? .5 : 1; // ano/ne se dá tipovat → poloviční odměna
    res.reward = round10(BASE[task.diff] * mult * f); p.streak++; t.correct++; t.yc++; p.correct++;
    if (p.streak % STREAK_EVERY === 0) res.bonus = STREAK_BONUS;
    const tot = res.reward + res.bonus; t.money += tot; t.earnedYear += tot; t.earnedTotal += tot; p.earned += tot;
  } else { p.streak = 0; t.wrong++; t.yw++; p.wrong++; res.pen = Math.min(PEN[task.diff], t.money); t.money -= res.pen; p.lockUntil = Date.now() + (p.wrongRun >= 2 ? GUESS_LOCK[2] : GUESS_LOCK[1]); }
  if (p.streak > p.best) p.best = p.streak;
  if (!ok && p.wrongRun >= 2 && task.diff >= 2) res.tip = 'Dvě chyby po sobě – zkus teď lehčí úlohu a zahřej se. 🙂';
  else if (ok && p.okRun >= 4 && task.diff < 3) res.tip = 'Jde ti to skvěle! Zkus těžší úlohu – vyděláš víc. 🚀';
  res.streak = p.streak; p.task = null; p.lastRes = res; return { res };
}

/* ---------- akce v rozhodovací fázi ---------- */
function act(S, pid, m) {
  const err = text => ({ changed: false, toast: { ok: false, text } });
  const okk = text => { const t0 = teamOf(S, pid); if (t0) { t0.log.push({ y: S.year, text: `${S.players[pid].name}: ${text}` }); if (t0.log.length > 8) t0.log.shift(); } return { changed: true, toast: { ok: true, text } }; };
  if (S.phase !== 'decide') return err('Rozhodovat se dá jen ve fázi „Rozhodování“.');
  const t = teamOf(S, pid); if (!t) return err('Nejsi v týmu.');
  const pr = prices(S), a = m.a, arg = m.arg;
  const need = key => { if (!canDo(t, pid, key)) { const r = ROLES.find(x => x.key === key); return `Tohle může jen ${r.emoji} ${r.name} (${S.players[t.members[ROLES.indexOf(r)]].name}).`; } return null; };
  let e;
  switch (a) {
    case 'buy': { if ((e = need('ceo'))) return err(e); const A = ASSET_BY[arg]; if (!A) return err('Neznámý podnik.'); const price = pr.assets[A.id]; if (t.money < price) return err('Nemáte dost peněz (' + kc(price) + ').'); t.money -= price; t.assets[A.id].n++; t.assets[A.id].value += price; return okk(`${A.emoji} ${A.name} koupen za ${kc(price)}.`); }
    case 'sell': { if ((e = need('ceo'))) return err(e); const A = ASSET_BY[arg]; if (!A || !t.assets[A.id].n) return err('Nic k prodeji.'); const o = t.assets[A.id]; const each = o.value / o.n; const get = Math.round(each * .9); o.n--; o.value = Math.round(o.value - each); t.money += get; return okk(`${A.emoji} ${A.name} prodán za ${kc(get)} (90 % hodnoty).`); }
    case 'deposit': { if ((e = need('cfo'))) return err(e); const amt = arg === 'all' ? t.money : Math.min(+arg, t.money); if (!(amt > 0)) return err('Nemáte co vložit.'); t.money -= amt; t.savings += amt; return okk(`Na spořicí účet vloženo ${kc(amt)}.`); }
    case 'withdraw': { if ((e = need('cfo'))) return err(e); const amt = arg === 'all' ? t.savings : Math.min(+arg, t.savings); if (!(amt > 0)) return err('Na spořicím účtu nic není.'); t.savings -= amt; t.money += amt; return okk(`Ze spoření vybráno ${kc(amt)}.`); }
    case 'borrow': { if ((e = need('cfo'))) return err(e); const amt = +arg; if (!(amt > 0)) return err('Neplatná částka.'); if (t.loan + amt > pr.maxLoan) return err(`Maximální úvěr je ${kc(pr.maxLoan)}.`); t.loan += amt; t.money += amt; return okk(`Půjčeno ${kc(amt)} (úrok ${S.event.loan} % ročně).`); }
    case 'repay': { if ((e = need('cfo'))) return err(e); const amt = arg === 'all' ? Math.min(t.money, t.loan) : Math.min(+arg, t.money, t.loan); if (!(amt > 0)) return err('Není co splácet, nebo chybí peníze.'); t.loan -= amt; t.money -= amt; return okk(`Splaceno ${kc(amt)}.`); }
    case 'insure': { if ((e = need('adm'))) return err(e); if (t.insuredYear === S.year) return err('Pojištěno už máte.'); if (t.money < pr.insurance) return err('Nemáte dost peněz (' + kc(pr.insurance) + ').'); t.money -= pr.insurance; t.insuredYear = S.year; t.insuredCount++; return okk(`Pojištění na letošní rok za ${kc(pr.insurance)}.`); }
    case 'train': { if ((e = need('adm'))) return err(e); if (t.train >= 3) return err('Máte nejvyšší úroveň školení.'); const price = pr.train[t.train]; if (t.money < price) return err('Nemáte dost peněz (' + kc(price) + ').'); t.money -= price; t.train++; return okk(`Školení úrovně ${t.train} za ${kc(price)}: odměny +${Math.round(TRAIN_BONUS * t.train * 100)} %.`); }
  }
  return err('Neznámá akce.');
}

/* ---------- zpracování zpráv od hráčů ---------- */
function handle(S, pid, m) {
  const p = S.players[pid]; if (!p) return { changed: false };
  p.lastSeen = Date.now(); p.online = true;
  const err = text => ({ changed: false, toast: { ok: false, text } });
  switch (m.t) {
    case 'ping': return { changed: false };
    case 'team:create': { if (S.phase !== 'lobby') return err('Tým lze vytvořit jen před startem.'); leaveTeam(S, pid); const t = mkTeam(S, m.name || '', TEAM_EMOJI.includes(m.emoji) ? m.emoji : null); t.members.push(pid); p.teamId = t.id; return { changed: true }; }
    case 'team:join': { const e = joinTeam(S, pid, m.teamId); return e ? err(e) : { changed: true }; }
    case 'team:leave': { if (S.phase !== 'lobby') return err('Po startu už nelze měnit tým.'); leaveTeam(S, pid); return { changed: true }; }
    case 'task:get': { const e = giveTask(S, pid, m.diff); return e ? err(e) : { changed: true }; }
    case 'task:answer': { const r = answerTask(S, pid, m); return r.err ? err(r.err) : { changed: true }; }
    case 'task:skip': { const t = teamOf(S, pid); if (S.phase === 'work' && t && p.task) { const fee = Math.min(SKIP_FEE, t.money); t.money -= fee; p.task = null; p.streak = 0; p.lastRes = null; return { changed: true, toast: { ok: false, text: `Přeskočeno (−${fee} Kč).` } }; } return { changed: false }; }
    case 'suggest': { const t = teamOf(S, pid); const k = String(m.k || '').slice(0, 24); if (S.phase !== 'decide' || !t || !k) return { changed: false }; const a = t.sugg[k] = t.sugg[k] || []; const i = a.indexOf(p.name); if (i >= 0) a.splice(i, 1); else a.push(p.name); if (!a.length) delete t.sugg[k]; return { changed: true }; }
    case 'ready': { const t = teamOf(S, pid); if (S.phase !== 'decide' || !t) return { changed: false }; t.ready = !t.ready; return { changed: true }; }
    case 'task:next': { p.lastRes = null; return { changed: true }; }
    case 'act': return act(S, pid, m);
  }
  return { changed: false };
}

/* ---------- pohled pro hráče (bez tajných dat) ---------- */
function publicTeam(S, t) { return { earned: Math.round(t.earnedYear || 0), id: t.id, name: t.name, emoji: t.emoji, color: t.color, net: net(t), members: t.members.map(id => ({ id, name: S.players[id].name, online: S.players[id].online })) }; }
function viewFor(S, pid) {
  const p = S.players[pid], t = teamOf(S, pid);
  const v = { paused: S.paused, code: S.code, phase: S.phase, year: S.year, years: S.settings.years, now: Date.now(), endsAt: S.endsAt, event: S.event, priceIndex: S.priceIndex, prices: prices(S), teams: S.teams.map(x => publicTeam(S, x)), topics: S.settings.topics, maxTeam: MAX_TEAM };
  v.diffs = S.settings.diffs || [1, 2, 3];
  v.total = S.phase === 'work' ? S.settings.workSec * 1000 : S.phase === 'decide' ? S.settings.decideSec * 1000 : 0;
  v.me = { id: pid, name: p.name, teamId: p.teamId, role: t ? (ROLES[roleIdx(t, pid)] || ROLES[0]).key : null, streak: p.streak, correct: p.correct, wrong: p.wrong, earned: p.earned, diff: p.diff };
  v.me.lock = Math.max(0, (p.lockUntil || 0) - Date.now()); v.streakEvery = STREAK_EVERY; v.streakBonus = STREAK_BONUS;
  if (t) {
    v.team = { id: t.id, name: t.name, emoji: t.emoji, color: t.color, money: Math.round(t.money), savings: Math.round(t.savings), loan: Math.round(t.loan), assets: t.assets, train: t.train, insured: t.insuredYear === S.year && S.phase !== 'lobby', insuredCount: t.insuredCount, earnedYear: t.earnedYear, correct: t.correct, wrong: t.wrong, yc: t.yc, living: living(S, t), ready: !!t.ready, net: net(t), real: Math.round(net(t) / S.priceIndex), log: t.log, sugg: t.sugg, last: t.last, history: t.history, members: t.members.map((id, i) => ({ id, name: S.players[id].name, online: S.players[id].online, role: ROLES[i].key })) };
    v.goal = S.phase === 'lobby' ? null : goalState(S, t);
  }
  if (p.task) { const k = p.task; v.task = { id: k.id, type: k.type, q: k.q, choices: k.choices || null, hint: k.hint || '', diff: k.diff, topic: k.topic }; }
  v.stats = p.stats; v.topicStats = S.topicStats;
  if (p.lastRes) v.res = p.lastRes;
  if (S.phase === 'final') v.awards = S.awards;
  if (S.phase === 'final' && S.final) v.final = S.final.map(r => { const tt = S.teams.find(x => x.id === r.teamId); const g = GOAL_BY[r.goalId]; return { ...r, name: tt.name, emoji: tt.emoji, color: tt.color, goalName: g.name, goalEmoji: g.emoji, goalDesc: g.desc(S) }; });
  return v;
}

root.Engine = { DISC, ROLES, ASSETS, ASSET_BY, EVENTS, GOALS, GOAL_BY, TRAIN_PRICE, TRAIN_BONUS, BASE, PEN, GUESS_LOCK, SKIP_FEE, MAX_TEAM, STREAK_EVERY, STREAK_BONUS, TEAM_EMOJI, newState, joinPlayer, mkTeam, joinTeam, leaveTeam, autoAssign, startGame, next, prices, net, assetValue, teamOf, goalState, handle, viewFor, kc, esc, living, satFactor, resetGame, togglePause, resetPlayer, giveTask, answerTask, act, resolveYear, canDo, publicTeam };
if (typeof module !== 'undefined') module.exports = root.Engine;
})(typeof window !== 'undefined' ? window : globalThis);
