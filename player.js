/* ============================================================
   player.js – obrazovka hráče (mobil)
   ============================================================ */
(function (root) {
'use strict';
const E = root.Engine, T = root.Tasks, Net = root.Net;
const $ = (s, r = document) => r.querySelector(s);
const esc = E.esc, kc = E.kc;
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
const TOPIC = Object.fromEntries(T.TOPICS.map(t => [t.id, t]));
const DIFF = { 1: { e: '🟢', n: 'Lehká' }, 2: { e: '🟡', n: 'Střední' }, 3: { e: '🔴', n: 'Těžká' } };
const ROLE = Object.fromEntries(E.ROLES.map((r, i) => [r.key, { ...r, idx: i }]));
const PHASE_TXT = { lobby: 'Čekárna', event: 'Událost roku', work: 'Práce', decide: 'Rozhodování', result: 'Vyúčtování', final: 'Konec hry' };

const Player = {
  code: '', token: '', name: '', peer: null, conn: null, S: null, offset: 0, gen: 0, connected: false, lastMsg: 0, status: '', tab: 'game', ui: { creating: false, emoji: E.TEAM_EMOJI[0] }, _sig: '', pending: false, helped: {}, openSecs: {},

  init(code) {
    this.code = code;
    this.token = LS.get('fl_tok_' + code) || (Math.random().toString(36).slice(2) + Date.now().toString(36));
    LS.set('fl_tok_' + code, this.token);
    this.name = LS.get('fl_name') || '';
    document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) this.onClick(b); });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const id = e.target && e.target.id;
      if (id === 'nameIn') this.onClick({ dataset: { a: 'setname' } });
      else if (id === 'numIn') this.onClick({ dataset: { a: 'submit' } });
      else if (id === 'teamName') this.onClick({ dataset: { a: 'create' } });
    });
    setInterval(() => this.tick(), 500);
    setInterval(() => { if (this.connected) this.send({ t: 'ping' }); }, 5000);
    setInterval(() => { if (this.connected && Date.now() - this.lastMsg > 16000) this.lost(this.gen, 'Spojení ztraceno.'); }, 3000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.name && !this.connected) { this.connect(); } });
    if (this.name) this.connect();
    this.render();
  },

  /* ---------- síť ---------- */
  connect() {
    const gen = ++this.gen; clearTimeout(this._retry); clearTimeout(this._to);
    this.connected = false; this.status = `Připojuji se ke hře ${this.code}…`; this.render();
    try { this.peer && this.peer.destroy(); } catch (e) { }
    let peer; try { peer = this.peer = Net.makePeer(); } catch (e) { return this.lost(gen, 'Nepodařilo se spustit spojení.'); }
    this._to = setTimeout(() => { if (gen === this.gen && !this.connected) this.lost(gen, 'Spojení trvá příliš dlouho… Zkouším znovu.'); }, 15000);
    peer.on('open', () => {
      if (gen !== this.gen) return;
      const c = this.conn = peer.connect(Net.peerId(this.code), { reliable: true, serialization: 'json' });
      c.on('open', () => { if (gen !== this.gen) return; this.connected = true; this.lastMsg = Date.now(); clearTimeout(this._to); c.send({ t: 'join', code: this.code, token: this.token, name: this.name }); });
      c.on('data', m => this.onMsg(m, gen));
      c.on('close', () => this.lost(gen, 'Spojení s učitelem se přerušilo.'));
      c.on('error', () => this.lost(gen, 'Chyba spojení.'));
    });
    peer.on('error', e => { if (gen !== this.gen) return; this.lost(gen, e.type === 'peer-unavailable' ? `Hra s kódem ${this.code} nebyla nalezena. Zkontroluj kód, nebo počkej, až učitel hru spustí.` : `Chyba spojení (${e.type}).`); });
  },
  lost(gen, msg) {
    if (gen !== this.gen) return;
    this.connected = false; this.status = msg; this.render();
    clearTimeout(this._retry); this._retry = setTimeout(() => this.connect(), 3000);
  },
  send(m) { if (this.conn && this.conn.open) { try { this.conn.send(m); return true; } catch (e) { } } return false; },
  onMsg(m, gen) {
    if (gen !== this.gen || !m) return; this.lastMsg = Date.now();
    if (m.t === 's') { this.S = m.s; this.offset = m.s.now - Date.now(); this.pending = false; this.status = ''; this.render(); if (m.s.res && m.s.res.id !== this._lastRes) { this._lastRes = m.s.res.id; try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(m.s.res.ok ? 30 : [60, 40, 60]); } catch (e) { } } }
    else if (m.t === 'toast') this.toast(m.text, m.ok);
    else if (m.t === 'err') { this.status = m.text; this.render(); }
  },
  toast(text, ok) {
    let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.className = 'toast ' + (ok ? 'ok' : 'bad'); t.textContent = text; t.style.opacity = 1;
    clearTimeout(this._tt); this._tt = setTimeout(() => { t.style.opacity = 0; }, 2600);
  },

  /* ---------- akce ---------- */
  onClick(b) {
    const d = b.dataset, a = d.a, S = this.S;
    switch (a) {
      case 'setname': { const v = ($('#nameIn') || {}).value || ''; if (!v.trim()) { this.toast('Napiš své jméno.', false); return; } this.name = v.trim().slice(0, 16); LS.set('fl_name', this.name); this.connect(); break; }
      case 'create-open': this.ui.creating = true; this.render(); break;
      case 'cancel': this.ui.creating = false; this.render(); break;
      case 'emoji': this.ui.emoji = d.e; document.querySelectorAll('.em').forEach(x => x.classList.toggle('sel', x.dataset.e === d.e)); break;
      case 'create': { const v = ($('#teamName') || {}).value || ''; this.send({ t: 'team:create', name: v, emoji: this.ui.emoji }); this.ui.creating = false; break; }
      case 'join': this.send({ t: 'team:join', teamId: d.t }); break;
      case 'leave': this.send({ t: 'team:leave' }); break;
      case 'get': this.send({ t: 'task:get', diff: +d.d }); break;
      case 'ans': if (this.pending || !S.task) return; this.pending = true; document.querySelectorAll('.choice').forEach(x => x.disabled = true); b.classList && b.classList.add('picked'); this.send({ t: 'task:answer', id: S.task.id, a: +d.i }); break;
      case 'submit': { if (this.pending || !S || !S.task) return; const v = ($('#numIn') || {}).value || ''; if (!v.trim()) { this.toast('Napiš odpověď.', false); return; } this.pending = true; const btn = $('#subBtn'); if (btn) btn.disabled = true; this.send({ t: 'task:answer', id: S.task.id, a: v }); break; }
      case 'key': { const i = $('#numIn'); if (i) { i.value += d.k; i.focus(); } break; }
      case 'skip': this.send({ t: 'task:skip' }); break;
      case 'next': this.send({ t: 'task:next' }); break;
      case 'act': this.send({ t: 'act', a: d.act, arg: d.arg }); break;
      case 'ready': this.send({ t: 'ready' }); break;
      case 'help': this.helped[d.k] = 1; LS.set('fl_help_' + d.k, '1'); this._sig = ''; this.render(); break;
      case 'sec': this.openSecs[d.k] = !this.openSecs[d.k]; this._sig = ''; this.render(); break;
      case 'suggest': this.send({ t: 'suggest', k: d.k }); break;
      case 'tab': this.tab = d.tab; this.render(); break;
    }
  },

  /* ---------- vykreslování ---------- */
  tick() {
    const S = this.S, el = $('#ph-timer'); if (!S || !el) return;
    if (!S.endsAt && !S.paused) { el.textContent = ''; return; }
    if (S.paused) { el.textContent = '⏸ pauza'; return; }
    const left = S.endsAt - (Date.now() + this.offset); el.textContent = '⏱ ' + Net.fmtTime(left); el.classList.toggle('warn', left < 30000);
  },
  render() {
    const app = $('#app');
    if (!this.name) {
      if (!$('#nameIn')) { app.innerHTML = `<div class="phone center"><div class="logo">💰 Finanční liga</div><div class="card"><h2>Připojuješ se ke hře <span class="codebig">${esc(this.code)}</span></h2><label class="fld">Jak ti máme říkat?<input id="nameIn" maxlength="16" placeholder="Tvoje jméno" autocomplete="nickname"></label><button class="btn big" data-a="setname">Vstoupit do hry →</button></div></div>`; setTimeout(() => { const i = $('#nameIn'); i && i.focus(); }, 50); }
      return;
    }
    if (!this.S) { app.innerHTML = `<div class="phone center"><div class="logo">💰 Finanční liga</div><div class="card"><div class="spinner"></div><p>${esc(this.status || 'Připojuji se…')}</p><p class="mut">Hra: <b>${esc(this.code)}</b> · ${esc(this.name)}</p><button class="btn ghost" onclick="Player.name='';localStorage.removeItem('fl_name');Player.gen++;Player.render()">Změnit jméno</button></div></div>`; this._sig = ''; return; }
    if (!$('#ph-main')) { app.innerHTML = `<div class="phone"><div id="ph-top"></div><div id="ph-banner"></div><div id="ph-main"></div><nav id="ph-tabs"></nav></div>`; this._sig = ''; }
    this.paintTop(); this.paintTabs();
    const bn = $('#ph-banner'); const msg = !this.connected ? `⚠️ ${this.status || 'Spojení přerušeno'} – připojuji znovu…` : '';
    bn.innerHTML = msg ? `<div class="banner">${esc(msg)}</div>` : '';
    const sig = this.sig(); if (sig !== this._sig) { this._sig = sig; const m = $('#ph-main'); m.innerHTML = this.mainHtml(); m.scrollTop = 0; if (this.tab === 'game' && this.S.task && this.S.task.type === 'num') setTimeout(() => { const i = $('#numIn'); i && i.focus(); }, 80); }
  },
  sig() {
    const S = this.S, t = S.team; const base = this.tab + '|' + S.phase + '|' + S.year + '|' + (S.event ? S.event.id : '');
    if (this.tab === 'team') return base + JSON.stringify([t, S.prices]);
    if (this.tab === 'goal') return base + JSON.stringify([S.goal, S.teams.map(x => x.net)]);
    if (!t) return base + (this.ui.creating ? '|create' : JSON.stringify(S.teams));
    switch (S.phase) {
      case 'lobby': return base + JSON.stringify(S.teams);
      case 'work': return base + '|' + !!S.paused + '|' + S.diffs + '|' + S.teams.map(x => x.net) + '|' + (S.task ? S.task.id : '-') + '|' + (S.res ? S.res.id : '-') + '|' + S.me.diff + '|' + t.train;
      case 'decide': return base + JSON.stringify([this.openSecs, t.money, t.savings, t.loan, t.assets, t.train, t.insured, S.me.role, t.members.length, t.sugg, t.log.length, t.ready]);
      case 'result': return base + JSON.stringify([t.last, S.teams.map(x => x.net)]);
      case 'event': return base + '|' + (LS.get('fl_help_event') || this.helped.event ? 1 : 0);
      case 'final': return base + JSON.stringify(S.final);
      default: return base;
    }
  },
  paintTop() {
    const S = this.S, t = S.team; const el = $('#ph-top');
    const html = t ? `<div class="ph-top" style="--c:${t.color}"><div class="ph-team">${t.emoji} <b>${esc(t.name)}</b></div><div class="ph-money">💵 ${kc(t.money)}</div></div><div class="ph-sub"><span>${S.phase === 'lobby' ? 'Čekárna' : `Rok ${S.year}/${S.years} · ${PHASE_TXT[S.phase]}`}</span><span id="ph-timer" class="ph-timer"></span></div>`
      : `<div class="ph-top"><div class="ph-team">👋 <b>${esc(S.me.name)}</b></div><div class="ph-money mut">hra ${esc(S.code)}</div></div>`;
    if (el._h !== html) { el._h = html; el.innerHTML = html; if (t) { if (this._m != null && t.money !== this._m) { const mm = el.querySelector('.ph-money'); if (mm) mm.classList.add(t.money > this._m ? 'flash-up' : 'flash-down'); } this._m = t.money; } }
  },
  paintTabs() {
    const S = this.S, el = $('#ph-tabs'); if (!S.team) { el.innerHTML = ''; return; }
    const tabs = [['game', '🎮', 'Hra'], ['team', '📊', 'Tým'], ['goal', '🎯', 'Cíl']];
    const html = tabs.map(([k, ic, n]) => `<button class="${this.tab === k ? 'on' : ''}" data-a="tab" data-tab="${k}"><span>${ic}</span>${n}</button>`).join('');
    if (el._h !== html) { el._h = html; el.innerHTML = html; }
  },
  mainHtml() {
    if (this.tab === 'team') return this.teamHtml();
    if (this.tab === 'goal') return this.goalHtml();
    return this.gameHtml();
  },

  /* ----- čekárna / týmy ----- */
  lobbyHtml() {
    const S = this.S; const t = S.team;
    if (t) {
      return `<div class="card"><h2>${t.emoji} ${esc(t.name)}</h2><p class="mut">Čekáte na zahájení hry. Tým má ${t.members.length}/3 hráče.</p>
        ${t.members.map(m => `<div class="mrow">${ROLE[m.role].emoji} <b>${esc(m.name)}</b> <span class="mut">${ROLE[m.role].name}</span> <i class="dot ${m.online ? 'on' : ''}"></i></div>`).join('')}
        <p class="mut small">Role se přidělují podle pořadí vstupu do týmu. 💼 Ředitel kupuje podniky, 🏦 Finančník spoří a půjčuje, 🛡️ Správce řeší pojištění a školení.</p>
        ${S.phase === 'lobby' ? '<button class="btn ghost" data-a="leave">↩ Opustit tým</button>' : ''}</div>`;
    }
    if (this.ui.creating) {
      return `<div class="card"><h2>Nový tým</h2><label class="fld">Název týmu<input id="teamName" maxlength="18" placeholder="např. Zlatí tygři" autocomplete="off"></label>
        <div class="fld">Znak týmu<div class="emojis">${E.TEAM_EMOJI.map(e => `<button class="em ${e === this.ui.emoji ? 'sel' : ''}" data-a="emoji" data-e="${e}">${e}</button>`).join('')}</div></div>
        <div class="row"><button class="btn big" data-a="create">Vytvořit tým</button><button class="btn ghost" data-a="cancel">Zpět</button></div></div>`;
    }
    const avail = S.teams.filter(x => x.members.length < S.maxTeam);
    return `<div class="card"><h2>Vyber si tým</h2><p class="mut">${S.phase === 'lobby' ? 'Vytvoř nový tým, nebo se přidej ke kamarádům (max. 3 hráči).' : 'Hra už běží – přidej se do týmu s volným místem.'}</p>
      ${avail.length ? avail.map(x => `<div class="lteam" style="--c:${x.color}"><div class="lt-h"><span>${x.emoji}</span><b>${esc(x.name)}</b><span class="mut">${x.members.length}/3</span></div><div class="mut small">${x.members.map(m => esc(m.name)).join(', ') || 'prázdný'}</div><button class="btn sm" data-a="join" data-t="${x.id}">Přidat se</button></div>`).join('') : '<p class="empty">Zatím žádný tým s volným místem.</p>'}
      ${S.phase === 'lobby' ? '<button class="btn big" data-a="create-open">➕ Vytvořit nový tým</button>' : ''}</div>`;
  },

  /* ----- hra ----- */
  evChips(ev) {
    const mods = Object.entries(ev.mods || {}).filter(([, v]) => v).map(([k, v]) => `<span class="chip2 ${v > 0 ? 'up' : 'down'}">${E.ASSET_BY[k].emoji} ${v > 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))} %</span>`).join('');
    return `<div class="chips"><span class="chip2">📈 Inflace <b>${ev.infl} %</b></span><span class="chip2">🐷 Spoření <b>${String(ev.save).replace('.', ',')} %</b></span><span class="chip2">🏦 Úvěr <b>${ev.loan} %</b></span><span class="chip2">🧾 Daň <b>${ev.tax} %</b></span>${ev.rew && ev.rew !== 1 ? `<span class="chip2 ${ev.rew > 1 ? 'up' : 'down'}">⚒️ Odměny ${ev.rew > 1 ? '+' : '−'}${Math.abs(Math.round((ev.rew - 1) * 100))} %</span>` : ''}${ev.trainDiscount ? '<span class="chip2 up">🎓 Školení −50 %</span>' : ''}${mods}</div>`;
  },
  evCard(S) { const ev = S.event; return `<div class="card ev"><div class="ev-ic">${ev.emoji}</div><div class="ev-k">Událost roku ${S.year}</div><h2>${esc(ev.name)}</h2><p>${esc(ev.text)}</p>${this.evChips(ev)}</div>`; },
  roleCard(S) {
    const r = ROLE[S.me.role]; if (!r) return '';
    return `<div class="card role"><div class="role-ic">${r.emoji}</div><div><b>Tvoje role: ${r.name}</b><div class="mut small">${r.does}</div></div></div>`;
  },
  gameHtml() {
    const S = this.S, t = S.team;
    if (!t || S.phase === 'lobby') return this.lobbyHtml();
    const hc = (k, html) => (S.year === 1 && !this.helped[k] && !LS.get('fl_help_' + k)) ? `<div class="card help"><b>💡 Jak na to</b>${html}<button class="btn sm" data-a="help" data-k="${k}">Rozumím</button></div>` : '';
    this._hc = hc;
    switch (S.phase) {
      case 'event': return `${hc('event', '<p>Každý rok začíná <b>událostí</b>, která mění pravidla (úroky, daně, výnosy). Pak <b>řešíte příklady</b> = vyděláváte, a nakonec se tým <b>společně rozhodne</b>, co s penězi.</p>')}${this.evCard(S)}${this.roleCard(S)}<div class="card"><p>👀 Přečtěte si událost a <b>domluvte se v týmu</b>, co to pro vás znamená. Učitel brzy zahájí práci.</p></div>`;
      case 'work': return this.workHtml();
      case 'decide': return this.decideHtml();
      case 'result': return this.resultHtml();
      case 'final': return this.finalHtml();
    }
    return '';
  },
  reward(d, task) { const S = this.S, f = task && task.type === 'mc' && task.choices.length === 2 ? .5 : 1; return Math.round(f * E.BASE[d] * (1 + E.TRAIN_BONUS * S.team.train) * ((S.event && S.event.rew) || 1) / 10) * 10; },
  rankHtml(S) {
    const me = S.team; if (!me || S.teams.length < 2) return '';
    const sorted = [...S.teams].sort((a, b) => b.net - a.net), lead = sorted[0];
    const i = sorted.filter(x => x.net > me.net).length; // shodné jmění = sdílené pořadí
    if (sorted.every(x => x.net === lead.net)) return '<div class="rank">🏁 Všichni jste zatím vyrovnaní – rozhodnou příklady!</div>';
    const rest = sorted.filter(x => x.id !== me.id), gap = i === 0 ? me.net - Math.max(...rest.map(x => x.net)) : lead.net - me.net;
    return `<div class="rank ${i === 0 ? 'first' : ''}">🏁 <b>${i + 1}. místo z ${sorted.length}</b> · ${i === 0 ? 'vedete o ' + kc(gap) : 'ztráta na ' + lead.emoji + ' ' + esc(lead.name) + ': ' + kc(gap)}</div>`;
  },
  workHtml() {
    const S = this.S, task = S.task, res = S.res;
    const hw = this._hc ? this._hc('work', '<p>Vyber obtížnost: čím těžší úloha, tím víc vyděláš, ale chyba stojí pokutu. Počítej na papír. Peníze jdou celému týmu.</p>') : '';
    if (S.paused) return '<div class="card center-t"><div class="big-e">⏸</div><h2>Pauza</h2><p class="mut">Učitel hru pozastavil. Za chvíli pokračujeme.</p></div>';
    const rk = this.rankHtml(S);
    if (task) {
      const tp = TOPIC[task.topic] || { emoji: '📐', name: '' };
      let ans;
      if (task.type === 'mc') ans = `<div class="choices">${task.choices.map((c, i) => `<button class="choice" data-a="ans" data-i="${i}"><span class="ci">${'ABCD'[i]}</span><span class="ct">${c}</span></button>`).join('')}</div>`;
      else ans = `<div class="numans"><input id="numIn" type="text" inputmode="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Tvoje odpověď"><div class="keys">${['−', '/', ','].map(k => `<button data-a="key" data-k="${k === '−' ? '-' : k}">${k}</button>`).join('')}</div><button id="subBtn" class="btn big" data-a="submit">Odeslat odpověď</button></div>${task.hint ? `<p class="mut small">${esc(task.hint)}</p>` : ''}`;
      return `${rk}<div class="card task"><div class="tk-h"><span class="chip2">${task.review ? '🔁 Procvičení · ' : ''}${tp.emoji} ${tp.name}</span><span class="dchip d${task.diff}">${DIFF[task.diff].e} +${this.reward(task.diff, task)} Kč</span></div><div class="q">${task.q}</div>${ans}<button class="link" data-a="skip">Přeskočit (−${E.SKIP_FEE} Kč)</button></div>`;
    }
    if (res) {
      return `${rk}<div class="card res ${res.ok ? 'ok' : 'bad'}"><div class="res-h">${res.ok ? '✅ Správně!' : '❌ Chyba'}</div><div class="qecho">${res.q}</div>
        <div class="res-m">${res.ok ? `+${kc(res.reward)}${res.bonus ? ` <span class="bonus">🔥 série +${kc(res.bonus)}</span>` : ''}` : (res.pen ? `−${kc(res.pen)}` : 'Bez pokuty')}</div>
        ${res.ok ? '' : `<div class="correct">Správná odpověď: <b>${res.ansText}</b></div>`}${res.expl ? `<div class="expl">💡 ${res.expl}</div>` : ''}
        ${res.tip ? `<div class="tip">${res.tip}</div>` : ''}
        ${S.me.streak ? `<div class="streak">🔥 Série: ${S.me.streak}${S.me.streak % E.STREAK_EVERY ? ` (ještě ${E.STREAK_EVERY - S.me.streak % E.STREAK_EVERY} do bonusu)` : ''}</div>` : ''}
        <button class="btn big" data-a="next">Další úloha →</button></div>`;
    }
    return `${hw}${rk}<div class="card"><h2>Vyber si úlohu</h2><p class="mut">Čím těžší úloha, tím víc vyděláš – ale chyba stojí peníze.</p>
      <div class="diffs">${[1, 2, 3].filter(d => S.diffs.includes(d)).map(d => `<button class="diff d${d} ${S.me.diff === d ? 'last' : ''}" data-a="get" data-d="${d}"><span class="dn">${DIFF[d].e} ${DIFF[d].n}</span><span class="dr">+${this.reward(d)} Kč</span><span class="dp">${E.PEN[d] ? 'chyba −' + E.PEN[d] + ' Kč' : 'chyba bez pokuty'}</span></button>`).join('')}</div>
      <p class="mut small">🔥 Každá ${E.STREAK_EVERY}. správná odpověď v řadě = bonus ${kc(E.STREAK_BONUS)}. Společně vyděláváte pro tým${S.team.train ? ` · 🎓 školení +${Math.round(E.TRAIN_BONUS * S.team.train * 100)} %` : ''}.</p>
      <div class="mini">✅ ${S.me.correct} · ❌ ${S.me.wrong} · vydělal/a jsi ${kc(S.me.earned)}</div></div>`;
  },
  decideHtml() {
    const S = this.S, t = S.team, pr = S.prices, ev = S.event, me = S.me;
    const myIdx = t.members.findIndex(m => m.id === me.id);
    const can = key => { const i = ROLE[key].idx; return myIdx === i || t.members.length <= i; };
    const who = key => { const m = t.members[ROLE[key].idx]; return m ? esc(m.name) : ''; };
    const mine = { ceo: can('ceo'), cfo: can('cfo'), adm: can('adm') };
    // Vlastník položky klikne na akci, ostatní jen „navrhnou“ (kolega uvidí návrh).
    const sg = k => { const a = t.sugg[k] || []; return `<button class="btn sm ghost sugg ${a.includes(me.name) ? 'on' : ''}" data-a="suggest" data-k="${k}">💬 Navrhnout${a.length ? ' · ' + a.length : ''}</button>`; };
    const act = (key, k, label, action, arg, ok, cls = '') => mine[key] ? `<button class="btn sm ${cls}" data-a="act" data-act="${action}" data-arg="${arg}" ${ok ? '' : 'disabled'}>${label}</button>` : '';
    const assets = E.ASSETS.map(a => { const o = t.assets[a.id], price = pr.assets[a.id];
      return `<div class="item"><div class="ai">${a.emoji}</div><div class="ib"><b>${a.name}</b><span class="mut small">${kc(price)} · výnos ~${Math.round(a.mean * 100)} % · riziko ${a.risk}${o.n ? ' · máte ' + o.n + '×' : ''}${o.n > 0 ? ' · další −' + Math.round((1 - Math.max(.4, 1 - .12 * o.n)) * 100) + ' %' : ''}</span></div>
        <div class="ia">${mine.ceo ? `<button class="btn sm" data-a="act" data-act="buy" data-arg="${a.id}" ${t.money >= price ? '' : 'disabled'}>Koupit</button>${o.n ? `<button class="btn sm ghost" data-a="act" data-act="sell" data-arg="${a.id}">Prodat</button>` : ''}` : sg('buy:' + a.id)}</div></div>`; }).join('');
    const savings = `<div class="item col"><div class="ib"><b>🐷 Spořicí účet</b><span class="mut small">${kc(t.savings)} · úrok ${String(ev.save).replace('.', ',')} % (inflace ${ev.infl} %)</span></div>
        <div class="ia wrap">${mine.cfo ? `${act('cfo', 0, 'Vložit 1 000', 'deposit', 1000, t.money >= 1000)}${act('cfo', 0, 'Vložit vše', 'deposit', 'all', t.money > 0)}${t.savings > 0 ? act('cfo', 0, 'Vybrat vše', 'withdraw', 'all', true, 'ghost') : ''}` : sg('deposit')}</div></div>
      <div class="item col"><div class="ib"><b>🏦 Úvěr</b><span class="mut small">dluh ${kc(t.loan)} · úrok ${ev.loan} % · limit ${kc(pr.maxLoan)}</span></div>
        <div class="ia wrap">${mine.cfo ? `${act('cfo', 0, 'Půjčit 1 000', 'borrow', 1000, t.loan + 1000 <= pr.maxLoan)}${act('cfo', 0, 'Půjčit 3 000', 'borrow', 3000, t.loan + 3000 <= pr.maxLoan)}${t.loan > 0 ? act('cfo', 0, 'Splatit vše', 'repay', 'all', t.money > 0, 'ghost') : ''}` : sg('repay')}</div></div>`;
    const admin = `<div class="item"><div class="ib"><b>☂️ Pojištění</b><span class="mut small">${kc(pr.insurance)} · kryje náhodnou škodu · ${t.insured ? '<b class="okc">máte ✓</b>' : 'zatím ne'}</span></div>
        <div class="ia">${mine.adm ? act('adm', 0, t.insured ? 'Pojištěno' : 'Pojistit', 'insure', 1, !t.insured && t.money >= pr.insurance) : sg('insure')}</div></div>
      <div class="item"><div class="ib"><b>🎓 Školení ${t.train}/3</b><span class="mut small">odměny +15 % za úroveň · ${t.train < 3 ? kc(pr.train[t.train]) : 'maximum'}</span></div>
        <div class="ia">${mine.adm ? act('adm', 0, t.train < 3 ? 'Školit' : 'Max', 'train', 1, t.train < 3 && t.money >= pr.train[t.train]) : sg('train')}</div></div>`;
    const SEC = { ceo: ['💼', 'Podniky', assets], cfo: ['🏦', 'Spoření a úvěr', savings], adm: ['🛡️', 'Pojištění a školení', admin] };
    const order = ['ceo', 'cfo', 'adm'].sort((a, b) => (mine[b] ? 1 : 0) - (mine[a] ? 1 : 0));
    const open = k => mine[k] || this.openSecs[k];
    const secs = order.map(k => { const [e, n, body] = SEC[k];
      return mine[k] ? `<section class="sec own"><div class="sec-h"><span>${e} ${n}</span><span class="you">tvoje oblast</span></div>${body}</section>`
        : `<section class="sec ${open(k) ? 'open' : ''}"><button class="sec-h btn-plain" data-a="sec" data-k="${k}"><span>${e} ${n}</span><span class="lockd">${ROLE[k].emoji} ${who(k)} ${open(k) ? '▾' : '▸'}</span></button>${open(k) ? body : ''}</section>`; }).join('');
    const log = t.log.filter(l => l.y === S.year).map(l => `<div class="lg">${esc(l.text)}</div>`).join('');
    return `<div class="evline top">🐷 Spoření <b>${kc(t.savings)}</b> · 🏦 Dluh <b>${kc(t.loan)}</b></div>
      <div class="evline">${ev.emoji} <b>${esc(ev.name)}</b> · inflace ${ev.infl} % · spoření ${String(ev.save).replace('.', ',')} % · úvěr ${ev.loan} % · daň ${ev.tax} %</div>
      ${secs}
      ${log ? `<div class="loglist">${log}</div>` : ''}
      <button class="btn big ${t.ready ? 'ghost' : ''}" data-a="ready">${t.ready ? '↩ Ještě něco změníme' : '✅ Jsme hotovi'}</button>`;
  },
  resultHtml() {
    const S = this.S, t = S.team, L = t.last; if (!L) return '<div class="card"><p>Vyhodnocuji…</p></div>';
    const lines = L.lines.map(l => `<div class="ln ${l.kind}"><span>${l.label}${l.note ? `<small>${esc(l.note)}</small>` : ''}</span><b>${l.kind === 'ok' ? '✓' : l.kind === 'info' ? kc(l.amt) : (l.amt >= 0 ? '+' : '') + kc(l.amt)}</b></div>`).join('');
    const board = S.teams.slice().sort((a, b) => b.net - a.net).map((x, i) => `<div class="brow ${x.id === t.id ? 'me' : ''}"><span>${i + 1}.</span><span>${x.emoji} ${esc(x.name)}</span><b>${kc(x.net)}</b></div>`).join('');
    return `<div class="card"><h2>Rok ${S.year} – vyúčtování</h2><div class="ledger">${lines}</div>
      <div class="netline ${L.delta >= 0 ? 'up' : 'down'}"><span>Čisté jmění</span><b>${kc(L.startNet)} → ${kc(L.endNet)}</b><em>${L.delta >= 0 ? '▲ +' : '▼ '}${kc(L.delta)}</em></div></div>
      ${S.event ? `<div class="card lesson">💡 <b>Poučení:</b> ${esc(S.event.lesson)}</div>` : ''}
      <div class="card"><h3>Pořadí týmů</h3>${board}</div>`;
  },
  finalHtml() {
    const S = this.S, f = S.final || []; const mine = f.find(r => r.teamId === S.team.id);
    const medal = ['🥇', '🥈', '🥉'];
    return `<div class="card final-me ${mine && mine.goalMet ? 'ok' : ''}"><div class="big-e">${mine ? medal[mine.rank - 1] || '🏁' : '🏁'}</div><h2>${mine ? mine.rank + '. místo' : 'Konec hry'}</h2>
      ${mine ? `<p>${mine.goalEmoji} <b>${mine.goalName}</b>: ${esc(mine.goalDesc)}</p><p class="${mine.goalMet ? 'okc' : 'noc'}">${mine.goalMet ? '✅ Tajný cíl splněn!' : '❌ Tajný cíl nesplněn.'}</p><p>Čisté jmění: <b>${kc(mine.net)}</b></p>` : ''}</div>
      ${(S.awards || []).length ? `<div class="card"><h3>🏅 Ocenění</h3>${S.awards.map(a => `<div class="mrow">${a.emoji} <span><b>${a.title}</b><br><span class="${a.name === S.me.name ? 'okc' : 'mut'}">${esc(a.name)}${a.name === S.me.name ? ' – to jsi ty! 🎉' : ''} · ${esc(a.detail)}</span></span></div>`).join('')}</div>` : ''}
      <div class="card"><h3>Tvoje statistika</h3><p>✅ ${S.me.correct} správně · ❌ ${S.me.wrong} chyb · vydělal/a jsi ${kc(S.me.earned)}</p>${this.myTopics()}</div>
      <div class="card"><h3>Celkové pořadí</h3>${f.map(r => `<div class="brow ${r.teamId === S.team.id ? 'me' : ''}"><span>${medal[r.rank - 1] || r.rank + '.'}</span><span>${r.emoji} ${esc(r.name)}<small>${r.goalEmoji} ${r.goalName} ${r.goalMet ? '✅' : '❌'}</small></span><b>${kc(r.net)}</b></div>`).join('')}</div>`;
  },

  myTopics() {
    const S = this.S, rows = T.TOPICS.map(t => ({ t, x: S.stats[t.id] })).filter(r => r.x && r.x.c + r.x.w).map(r => ({ ...r, pct: Math.round(100 * r.x.c / (r.x.c + r.x.w)) }));
    if (!rows.length) return '';
    const worst = rows.slice().sort((a, b) => a.pct - b.pct)[0];
    return `<div class="topicrep">${rows.map(r => `<div class="tr"><span>${r.t.emoji} ${r.t.name}</span><div class="tbar"><i style="width:${r.pct}%;background:${r.pct >= 75 ? 'var(--green)' : r.pct >= 50 ? 'var(--gold)' : 'var(--red)'}"></i></div><b>${r.pct} %</b></div>`).join('')}</div>${worst.pct < 75 ? `<p class="mut small">Procvič si: <b>${worst.t.emoji} ${worst.t.name}</b>.</p>` : '<p class="okc small">Všechna témata zvládáš na jedničku! 🌟</p>'}`;
  },
  /* ----- záložky ----- */
  teamHtml() {
    const S = this.S, t = S.team; const pr = S.prices;
    const rows = [['💵 Hotovost', kc(t.money)], ['🐷 Spoření', kc(t.savings)], ['🏦 Dluh', t.loan ? '−' + kc(t.loan) : kc(0)]]
      .concat(E.ASSETS.filter(a => t.assets[a.id].n).map(a => [`${a.emoji} ${a.name} ×${t.assets[a.id].n}`, kc(t.assets[a.id].value)]))
      .concat([['☂️ Pojištění letos', t.insured ? 'ano' : 'ne'], ['🎓 Školení', t.train + ' / 3']]);
    const hist = t.history.length ? `<div class="hist">${t.history.map((n, i) => `<div><span>rok ${i + 1}</span><b>${kc(n)}</b></div>`).join('')}</div>` : '';
    return `<div class="card"><h2>${t.emoji} ${esc(t.name)}</h2>
      <div class="bigno">${kc(t.net)}</div><div class="mut">čisté jmění · po zohlednění inflace (ceny +${Math.round((S.priceIndex - 1) * 100)} %) odpovídá dnešní hodnota jen <b>${kc(t.real)}</b></div><div class="kv">${rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>
      <p class="mut small">Letos vyděláno: ${kc(t.earnedYear)} · správně ${t.correct}, chyb ${t.wrong}. Životní náklady týmu letos: ${kc(t.living)} (rostou s inflací a počtem členů).</p>${hist}</div>
      <div class="card"><h3>Tým</h3>${t.members.map(m => `<div class="mrow">${ROLE[m.role].emoji} <b>${esc(m.name)}</b> <span class="mut">${ROLE[m.role].name}</span> <i class="dot ${m.online ? 'on' : ''}"></i></div>`).join('')}</div>`;
  },
  goalHtml() {
    const S = this.S, g = S.goal;
    if (!g) return '<div class="card"><h2>🎯 Tajný cíl</h2><p>Tajný cíl dostanete při startu hry. Ostatní týmy ho neznají – vyhrává se jeho plněním, ne jen bohatstvím.</p></div>';
    return `<div class="card goal ${g.ok ? 'ok' : ''}"><div class="big-e">${g.emoji}</div><div class="secret">🤫 TAJNÉ – neukazujte ostatním týmům</div><h2>${g.name}</h2><p>${esc(g.desc)}</p>
      <div class="gp ${g.ok ? 'okc' : ''}">${g.ok ? '✅ Zatím splněno' : '⏳ Zatím nesplněno'} · ${esc(g.prog)}</div><p class="mut small">Cíl se kontroluje až na konci hry. Hlídejte si, abyste ho na konci splňovali.</p></div>
      <div class="card"><h3>Pořadí týmů</h3>${S.teams.slice().sort((a, b) => b.net - a.net).map((x, i) => `<div class="brow ${x.id === S.team.id ? 'me' : ''}"><span>${i + 1}.</span><span>${x.emoji} ${esc(x.name)}</span><b>${kc(x.net)}</b></div>`).join('')}</div>`;
  },
};
root.Player = Player;
})(window);
