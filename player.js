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
  code: '', token: '', name: '', peer: null, conn: null, S: null, offset: 0, gen: 0, connected: false, lastMsg: 0, status: '', tab: 'game', ui: { creating: false, emoji: E.TEAM_EMOJI[0] }, _sig: '', pending: false, helped: {}, openSecs: {}, showWhy: false, _lockAt: 0,

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
    if (m.t === 's') { this.S = m.s; this.offset = m.s.now - Date.now(); this.pending = false; this.status = ''; this._lockAt = m.s.me.lock ? Date.now() + m.s.me.lock : 0; this.render(); this.tick(); if (m.s.res && m.s.res.id !== this._lastRes) { this._lastRes = m.s.res.id; this.fx(m.s.res.ok); try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(m.s.res.ok ? 30 : [60, 40, 60]); } catch (e) { } } }
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
      case 'again': this.showWhy = false; this.send({ t: 'task:get', diff: +d.d }); break;
      case 'why': this.showWhy = !this.showWhy; this._sig = ''; this.render(); break;
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
    const S = this.S; if (!S) return;
    const bar = $('#ph-bar i'); if (bar) { if (S.total && S.endsAt && !S.paused) { const left = S.endsAt - (Date.now() + this.offset), tot = Math.max(S.total, left); bar.style.width = Math.max(0, Math.min(100, left / tot * 100)) + '%'; bar.parentNode.classList.toggle('warn', left < 30000); } else bar.style.width = S.paused ? '100%' : '0%'; }
    const ab = $('#againBtn'); if (ab) { const r = this._lockAt - Date.now(); if (r > 0) { ab.disabled = true; ab.textContent = '⏳ ' + Math.ceil(r / 1000) + ' s'; } else if (ab.disabled) { ab.disabled = false; ab.textContent = DIFF[S.me.diff || 1].e + ' Další úloha'; } }
    const el = $('#ph-timer'); if (!el) return;
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
    if (this.S.phase === 'final' && !this._rained) { this._rained = true; const mine = (this.S.final || []).find(r => r.teamId === (this.S.team && this.S.team.id)); if (!mine || mine.rank <= 3) this.rain(); }
    const fk = this.S.res ? this.S.me.correct + ':' + this.S.me.wrong + ':' + this.S.res.id : ''; if (fk !== this._fxk) { this._fxk = fk; this.showWhy = false; this._fire = !!fk; }
    const sig = this.sig(); if (sig !== this._sig) { this._sig = sig; const m = $('#ph-main'); m.innerHTML = this.mainHtml(); m.scrollTop = 0; if (this.tab === 'game' && this.S.task && this.S.task.type === 'num') setTimeout(() => { const i = $('#numIn'); i && i.focus(); }, 80); }
  },
  sig() {
    const S = this.S, t = S.team; const base = this.tab + '|' + S.phase + '|' + S.year + '|' + (S.event ? S.event.id : '');
    if (this.tab === 'team') return base + JSON.stringify([t, S.prices]);
    if (this.tab === 'goal') return base + JSON.stringify([S.goal, S.teams.map(x => x.net)]);
    if (!t) return base + (this.ui.creating ? '|create' : JSON.stringify(S.teams));
    switch (S.phase) {
      case 'lobby': return base + JSON.stringify(S.teams);
      case 'work': return base + '|' + !!S.paused + '|' + S.diffs + '|' + S.teams.map(x => x.net) + '|' + (S.task ? S.task.id : '-') + '|' + (S.res ? S.res.id : '-') + '|' + this.showWhy + '|' + S.me.diff + '|' + t.train;
      case 'decide': return base + JSON.stringify([this.openSecs, t.money, t.savings, t.loan, t.assets, t.train, t.insured, S.me.role, t.members.length, t.sugg, t.log.length, t.ready]);
      case 'result': return base + JSON.stringify([t.last, S.teams.map(x => x.net), this.showWhy]);
      case 'event': return base + '|' + (LS.get('fl_help_event') || this.helped.event ? 1 : 0);
      case 'final': return base + JSON.stringify(S.final);
      default: return base;
    }
  },
  paintTop() {
    const S = this.S, t = S.team; const el = $('#ph-top');
    const html = t ? `<div class="ph-top" style="--c:${t.color}"><div class="ph-team">${t.emoji} <b>${esc(t.name)}</b></div><div class="ph-money">💵 ${kc(t.money)}</div></div><div class="ph-sub"><span>${S.phase === 'lobby' ? 'Čekárna' : `Rok ${S.year}/${S.years} · ${PHASE_TXT[S.phase]}`}</span><span id="ph-timer" class="ph-timer"></span></div>${S.phase === 'work' || S.phase === 'decide' ? '<div id="ph-bar" class="pbar"><i></i></div>' : ''}`
      : `<div class="ph-top"><div class="ph-team">👋 <b>${esc(S.me.name)}</b></div><div class="ph-money mut">hra ${esc(S.code)}</div></div>`;
    if (el._h !== html) { el._h = html; el.innerHTML = html; if (t) { if (this._m != null && t.money !== this._m) { const mm = el.querySelector('.ph-money'); if (mm) mm.classList.add(t.money > this._m ? 'flash-up' : 'flash-down'); } this._m = t.money; } }
  },
  rain() {
    const w = document.createElement('div'); w.className = 'rain'; const em = ['🪙', '🎉', '⭐', '💚', '✨', '🏆'];
    for (let i = 0; i < 46; i++) { const e = document.createElement('span'); e.textContent = em[i % em.length]; e.style.left = Math.random() * 100 + '%'; e.style.animationDelay = Math.random() * 1.6 + 's'; e.style.animationDuration = 2.6 + Math.random() * 2 + 's'; e.style.fontSize = 18 + Math.random() * 22 + 'px'; w.appendChild(e); }
    document.body.appendChild(w); setTimeout(() => w.remove(), 6000);
  },
  fx(ok) {
    const c = $('#resCard'); if (!c || !ok) return;
    const em = ['🪙', '✨', '💚', '🪙', '⭐'];
    for (let i = 0; i < 20; i++) { const e = document.createElement('span'), a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 130; e.className = 'pt'; e.textContent = em[i % em.length]; e.style.setProperty('--dx', Math.cos(a) * r + 'px'); e.style.setProperty('--dy', Math.sin(a) * r - 70 + 'px'); e.style.setProperty('--d', Math.random() * .18 + 's'); c.appendChild(e); }
    setTimeout(() => c.querySelectorAll('.pt').forEach(x => x.remove()), 1500);
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
  evChips(ev, idx) {
    const T = (ic, n, l, cls = '') => `<div class="etile ${cls}"><span class="ei">${ic}</span><b>${n}</b><small>${l}</small></div>`;
    const pc = v => String(v).replace('.', ',') + ' %', sg = v => (v > 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(v * 100)) + ' %';
    const mods = Object.entries(ev.mods || {}).filter(([, v]) => v).map(([k, v]) => T(E.ASSET_BY[k].emoji, sg(v), 'výnos', v > 0 ? 'up' : 'down')).join('');
    return `<div class="etiles">${T('📈', pc(ev.infl), 'inflace')}${T('🐷', pc(ev.save), 'spoření')}${T('🏦', pc(ev.loan), 'úvěr')}${T('🧾', pc(ev.tax), 'daň')}${ev.rew && ev.rew !== 1 ? T('⚒️', sg(ev.rew - 1), 'odměny', ev.rew > 1 ? 'up' : 'down') : ''}${ev.trainDiscount ? T('🎓', '−50 %', 'školení', 'up') : ''}${mods}${idx != null ? T('🛒', '+' + idx + ' %', 'ceny od startu') : ''}</div>`;
  },
  evCard(S) { const ev = S.event, first = String(ev.text).split(/(?<=[.!?])\s/)[0]; return `<div class="card ev big"><div class="ev-ic">${ev.emoji}</div><h2>${esc(ev.name)}</h2><p class="mut">${esc(first)}</p>${this.evChips(ev)}</div>`; },
  roleCard(S) {
    const r = ROLE[S.me.role]; if (!r) return '';
    return `<div class="card role"><div class="role-ic">${r.emoji}</div><div><b>Tvoje role: ${r.name}</b><div class="mut small">${r.does}</div></div></div>`;
  },
  gameHtml() {
    const S = this.S, t = S.team;
    if (!t || S.phase === 'lobby') return this.lobbyHtml();
    const hc = (k, html) => (S.year === 1 && !this.helped[k] && !LS.get('fl_help_' + k)) ? `<div class="card help">${html}<button class="btn sm" data-a="help" data-k="${k}">Jdeme na to</button></div>` : '';
    this._hc = hc;
    switch (S.phase) {
      case 'event': return `${hc('event', '<p class="icohelp">🌍 Událost <i>→</i> 🧮 Počítej <i>→</i> 🤝 Rozhodni</p>')}${this.evCard(S)}${this.roleCard(S)}<div class="card"><p>👀 Přečtěte si událost a <b>domluvte se v týmu</b>, co to pro vás znamená. Učitel brzy zahájí práci.</p></div>`;
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
    if (S.paused) return '<div class="card center-t pausec"><div class="big-e">⏸</div><h2>Pauza</h2></div>';
    const rk = this.rankHtml(S);
    const pips = () => { const n = S.me.streak % S.streakEvery; return `<div class="pips" title="Série">🔥${Array.from({ length: S.streakEvery }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}<em>+${S.streakBonus}</em></div>`; };
    if (task) {
      const tp = TOPIC[task.topic] || { emoji: '📐', name: '' };
      let ans;
      if (task.type === 'mc') ans = `<div class="choices">${task.choices.map((c, i) => `<button class="choice" data-a="ans" data-i="${i}"><span class="ci">${'ABCD'[i]}</span><span class="ct">${c}</span></button>`).join('')}</div>`;
      else ans = `<div class="numans"><input id="numIn" type="text" inputmode="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Tvoje odpověď"><div class="keys">${['−', '/', ','].map(k => `<button data-a="key" data-k="${k === '−' ? '-' : k}">${k}</button>`).join('')}</div><button id="subBtn" class="btn big" data-a="submit">Odeslat</button></div>${task.hint ? `<p class="mut small">${esc(task.hint)}</p>` : ''}`;
      return `${rk}<div class="card task d${task.diff}"><div class="tk-h"><span class="chip2">${task.review ? '🔁 ' : ''}${tp.emoji} ${tp.name}</span><span class="dchip d${task.diff}">${DIFF[task.diff].e} +${this.reward(task.diff, task)}</span></div><div class="q">${task.q}</div>${ans}<div class="tk-f">${pips()}<button class="link" data-a="skip">Přeskočit −${E.SKIP_FEE}</button></div></div>`;
    }
    if (res) {
      const d = S.me.diff || 1;
      return `${rk}<div class="card res ${res.ok ? 'ok' : 'bad'}" id="resCard"><div class="res-ic">${res.ok ? '✓' : '✗'}</div>
        <div class="res-m">${res.ok ? '+' + kc(res.reward) : (res.pen ? '−' + kc(res.pen) : '0 Kč')}</div>
        ${res.bonus ? `<div class="bonus-pop">🔥 Série! +${kc(res.bonus)}</div>` : ''}
        ${res.ok ? '' : `<div class="correct"><small>správně:</small> <b>${res.ansText}</b></div>`}
        ${pips()}
        ${(res.expl || res.tip) ? `<button class="link why" data-a="why">💡 ${this.showWhy ? 'Skrýt' : 'Proč?'}</button>${this.showWhy ? `<div class="expl"><div class="qecho">${res.q}</div>${res.expl ? res.expl : ''}${res.tip ? `<div class="tip">${res.tip}</div>` : ''}</div>` : ''}` : ''}
        <button class="btn big" id="againBtn" data-a="again" data-d="${d}">${DIFF[d].e} Další úloha</button>
        <button class="link" data-a="next">změnit obtížnost</button></div>`;
    }
    return `${rk}<div class="picker"><div class="pk-t">Vyber si úlohu</div>
      <div class="diffs3">${[1, 2, 3].filter(d => S.diffs.includes(d)).map(d => `<button class="diff d${d} ${S.me.diff === d ? 'last' : ''}" data-a="get" data-d="${d}"><span class="dn">${DIFF[d].e}</span><span class="dr">+${this.reward(d)}</span><span class="dp">chyba −${E.PEN[d]}</span></button>`).join('')}</div>
      <div class="pk-f">${pips()}<span class="mini">✅ ${S.me.correct} · ❌ ${S.me.wrong}</span></div></div>`;
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
    const RISK = { 'nízké': 1, 'střední': 2, 'vysoké': 3 };
    const assets = `<div class="atiles">${E.ASSETS.map(a => { const o = t.assets[a.id], price = pr.assets[a.id], rk = RISK[a.risk] || 2;
      return `<div class="atile ${o.n ? 'own' : ''}"><div class="a-top"><span class="a-e">${a.emoji}</span>${o.n ? `<span class="a-n">×${o.n}</span>` : ''}</div><b>${a.name}</b>
        <div class="a-m"><span class="yield">+${Math.round(a.mean * 100)} %</span><span class="risk" title="riziko ${a.risk}">${[1, 2, 3].map(k => `<i class="${k <= rk ? 'on r' + rk : ''}"></i>`).join('')}</span></div>
        ${mine.ceo ? `<button class="btn sm" data-a="act" data-act="buy" data-arg="${a.id}" ${t.money >= price ? '' : 'disabled'}>Koupit ${kc(price)}</button>${o.n ? `<button class="link sell" data-a="act" data-act="sell" data-arg="${a.id}">prodat 1×</button>` : ''}` : sg('buy:' + a.id)}</div>`; }).join('')}</div>`;
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
      <div class="emini"><b>${ev.emoji} ${esc(ev.name)}</b><span>📈 ${ev.infl} %</span><span>🐷 ${String(ev.save).replace('.', ',')} %</span><span>🏦 ${ev.loan} %</span><span>🧾 ${ev.tax} %</span></div>
      ${secs}
      ${log ? `<div class="loglist">${log}</div>` : ''}
      <button class="btn big ${t.ready ? 'ghost' : ''}" data-a="ready">${t.ready ? '↩ Ještě něco změníme' : '✅ Jsme hotovi'}</button>`;
  },
  resultHtml() {
    const S = this.S, t = S.team, L = t.last; if (!L) return '<div class="card center-t"><div class="spinner"></div></div>';
    const up = L.delta >= 0, mx = Math.max(1, ...S.teams.map(x => Math.max(0, x.net)));
    const lines = L.lines.filter(l => l.kind !== 'info').map(l => `<div class="ln ${l.kind}"><span>${l.label}${this.showWhy && l.note ? `<small>${esc(l.note)}</small>` : ''}</span><b>${l.kind === 'ok' ? '✓' : (l.amt >= 0 ? '+' : '') + kc(l.amt)}</b></div>`).join('');
    const board = S.teams.slice().sort((a, b) => b.net - a.net).map((x, i) => `<div class="brow2 ${x.id === t.id ? 'me' : ''}"><span class="bn">${x.emoji}</span><div class="bb"><i style="width:${Math.max(4, Math.round(100 * Math.max(0, x.net) / mx))}%;background:${x.color}"></i></div><b>${kc(x.net)}</b></div>`).join('');
    return `<div class="card yr ${up ? 'up' : 'down'}"><div class="yr-h">Rok ${S.year}</div><div class="yr-big">${up ? '▲' : '▼'} ${kc(Math.abs(L.delta))}</div><div class="yr-net">${kc(L.startNet)} → <b>${kc(L.endNet)}</b></div></div>
      <div class="card"><div class="board2">${board}</div></div>
      <div class="card"><div class="ledger">${lines}</div>${S.event ? `<button class="link why" data-a="why">💡 ${this.showWhy ? 'Skrýt' : 'Poučení a detaily'}</button>${this.showWhy ? `<div class="expl">${esc(S.event.lesson)}</div>` : ''}` : ''}</div>`;
  },
  finalHtml() {
    const S = this.S, f = S.final || []; const mine = f.find(r => r.teamId === S.team.id);
    const medal = ['🥇', '🥈', '🥉'];
    return `<div class="card final-me ${mine && mine.goalMet ? 'ok' : ''}"><div class="big-e">${mine ? medal[mine.rank - 1] || '🏁' : '🏁'}</div><h2>${mine ? mine.rank + '. místo' : 'Konec hry'}</h2>
      ${mine ? `<p>${mine.goalEmoji} <b>${mine.goalName}</b>: ${esc(mine.goalDesc)}</p><p class="${mine.goalMet ? 'okc' : 'noc'}">${mine.goalMet ? '✅ Tajný cíl splněn!' : '❌ Tajný cíl nesplněn.'}</p><p>Čisté jmění: <b>${kc(mine.net)}</b></p>` : ''}</div>
      ${(S.awards || []).length ? `<div class="card"><h3>🏅 Ocenění</h3>${S.awards.map(a => `<div class="mrow">${a.emoji} <span><b>${a.title}</b><br><span class="${a.name === S.me.name ? 'okc' : 'mut'}">${esc(a.name)}${a.name === S.me.name ? ' – to jsi ty! 🎉' : ''} · ${esc(a.detail)}</span></span></div>`).join('')}</div>` : ''}
      <div class="stat3"><div><b>${S.me.correct}</b><small>✅ správně</small></div><div><b>${S.me.wrong}</b><small>❌ chyb</small></div><div><b>${kc(S.me.earned)}</b><small>💰 vyděláno</small></div></div>${this.myTopics() ? `<div class="card">${this.myTopics()}</div>` : ''}
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
