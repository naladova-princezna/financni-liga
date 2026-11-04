/* ============================================================
   host.js – učitelská obrazovka (projektor) + autoritativní server hry
   ============================================================ */
(function (root) {
'use strict';
const E = root.Engine, T = root.Tasks, Net = root.Net;
const $ = (s, r = document) => r.querySelector(s);
const esc = E.esc, kc = E.kc;
const SAVE_KEY = 'fl_host_v1';
const PHASE = { lobby: 'Lobby', event: 'Událost roku', work: 'Práce – řešte příklady!', decide: 'Rozhodování týmů', result: 'Vyhodnocení roku', final: 'Konec hry' };
const NEXT_LABEL = { lobby: '▶ Spustit hru', event: '⏱ Zahájit práci', work: '⏭ Ukončit práci', decide: '⏭ Uzavřít rok', result: null, final: '🔁 Nová hra' };

const Host = {
  S: null, peer: null, conns: {}, status: 'Připojuji se k serveru…', ready: false, lastRender: 0, tickN: 0, overlay: null,

  /* ---------- start ---------- */
  start() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { }
    if (saved && saved.S && Date.now() - saved.at < 12 * 3600e3 && saved.S.phase !== 'final') {
      $('#app').innerHTML = `<div class="center-card"><h1>💰 Finanční liga</h1><p>Našel jsem rozehranou hru <b>${esc(saved.S.code)}</b> (rok ${saved.S.year || '–'}, ${Object.keys(saved.S.players).length} hráčů).</p>
        <div class="row"><button class="btn big" data-h="resume">↩ Pokračovat v rozehrané hře</button><button class="btn big ghost" data-h="fresh">✨ Začít novou hru</button></div></div>`;
      this.bind();
      this._saved = saved; return;
    }
    this.begin(null);
  },
  begin(saved) {
    if (saved) { this.S = saved.S; Object.values(this.S.players).forEach(p => { p.online = false; p.lastSeen = Date.now(); }); if (this.S.endsAt) this.S.endsAt = Date.now() + 60000; this.restoring = true; }
    else this.S = E.newState(Net.newCode());
    this.bind(); this.openPeer(); this.render();
    clearInterval(this._tick); this._tick = setInterval(() => this.tick(), 1000);
  },
  bind() {
    if (this._bound) return; this._bound = true;
    document.addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (b) this.onClick(b); });
    document.addEventListener('change', e => { const b = e.target.closest('[data-set]'); if (b) this.onSetting(b); });
  },

  /* ---------- síť ---------- */
  openPeer(attempt = 0) {
    const S = this.S; this.status = 'Připojuji se k serveru…';
    try { if (this.peer) this.peer.destroy(); } catch (e) { }
    const peer = this.peer = Net.makePeer(Net.peerId(S.code));
    peer.on('open', () => { this.ready = true; this.status = ''; this.restoring = false; this.render(); });
    peer.on('connection', c => this.onConn(c));
    peer.on('disconnected', () => { this.status = 'Spojení se serverem se ztratilo, obnovuji…'; this.render(); try { peer.reconnect(); } catch (e) { } });
    peer.on('error', err => {
      if (err.type === 'unavailable-id') {
        if (this.restoring && attempt < 6) { this.status = 'Čekám na uvolnění kódu hry…'; this.render(); setTimeout(() => this.openPeer(attempt + 1), 3000); }
        else { S.code = Net.newCode(); this.restoring = false; this.openPeer(); }
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error' || err.type === 'socket-closed') {
        this.status = 'Nelze se spojit se serverem (' + err.type + '). Zkontrolujte připojení k internetu.'; this.render();
        setTimeout(() => { if (!this.ready) this.openPeer(attempt + 1); }, 4000);
      } else console.warn('peer error', err);
    });
  },
  onConn(conn) {
    let pid = null;
    conn.on('data', m => {
      try {
        if (!m || typeof m !== 'object') return;
        if (m.t === 'join') {
          if (String(m.code).toUpperCase() !== this.S.code) { conn.send({ t: 'err', text: 'Špatný kód hry.' }); return; }
          const p = E.joinPlayer(this.S, String(m.token || ''), m.name);
          pid = p.id; if (this.conns[pid] && this.conns[pid] !== conn) { try { this.conns[pid].close(); } catch (e) { } }
          this.conns[pid] = conn; this.changed(); return;
        }
        if (!pid) return;
        const r = E.handle(this.S, pid, m);
        if (r.toast) this.send(pid, { t: 'toast', ...r.toast });
        if (r.changed) this.changed(); else if (m.t !== 'ping') this.send(pid, { t: 's', s: E.viewFor(this.S, pid) });
      } catch (e) { console.error(e); }
    });
    const gone = () => { if (pid && this.conns[pid] === conn) { delete this.conns[pid]; const p = this.S.players[pid]; if (p) p.online = false; this.changed(); } };
    conn.on('close', gone); conn.on('error', gone);
  },
  send(pid, msg) { const c = this.conns[pid]; if (c && c.open) { try { c.send(msg); } catch (e) { } } },
  broadcast() {
    this._bc = null;
    for (const pid of Object.keys(this.conns)) { if (this.S.players[pid]) this.send(pid, { t: 's', s: E.viewFor(this.S, pid) }); }
  },
  changed() {
    if (!this._bc) this._bc = setTimeout(() => this.broadcast(), 60);
    if (!this._rd) this._rd = setTimeout(() => { this._rd = null; this.render(); }, 80);
    if (!this._sv) this._sv = setTimeout(() => { this._sv = null; this.save(); }, 800);
  },
  save() { try { const S = JSON.parse(JSON.stringify(this.S)); localStorage.setItem(SAVE_KEY, JSON.stringify({ S, at: Date.now() })); } catch (e) { } },

  tick() {
    const S = this.S; this.tickN++;
    const now = Date.now(); let dirty = false;
    for (const p of Object.values(S.players)) { if (p.online && now - p.lastSeen > 22000) { p.online = false; dirty = true; } }
    if ((S.phase === 'work' || S.phase === 'decide') && S.endsAt && now >= S.endsAt) { E.next(S); dirty = true; }
    if (this.tickN % 5 === 0) for (const pid of Object.keys(this.conns)) this.send(pid, { t: 'hb', now });
    if (dirty) this.changed();
    const el = $('#h-timer'); if (el) el.textContent = S.endsAt ? Net.fmtTime(S.endsAt - now) : '';
    if (el) el.classList.toggle('warn', !!S.endsAt && S.endsAt - now < 30000);
  },

  /* ---------- ovládání ---------- */
  onClick(b) {
    const S = this.S, a = b.dataset.h;
    if (a === 'resume') { this.begin(this._saved); return; }
    if (a === 'fresh') { localStorage.removeItem(SAVE_KEY); this.begin(null); return; }
    if (a === 'next') {
      if (S.phase === 'final' && !confirm('Začít novou hru se stejnými týmy?')) return;
      const err = E.next(S); if (err) alert(err); this.changed(); return;
    }
    if (a === 'assign') { E.autoAssign(S); this.changed(); return; }
    if (a === 'plus') { if (S.endsAt) S.endsAt += 30000; this.changed(); return; }
    if (a === 'qr') { this.overlay = this.overlay === 'qr' ? null : 'qr'; this.render(true); return; }
    if (a === 'endgame') { if (confirm('Ukončit hru a vrátit se do lobby? Průběh se smaže.')) { E.resetGame(S); this.changed(); } return; }
    if (a === 'kick') { const pid = b.dataset.pid; E.leaveTeam(S, pid); delete S.players[pid]; try { this.conns[pid] && this.conns[pid].close(); } catch (e) { } delete this.conns[pid]; this.changed(); return; }
  },
  onSetting(el) {
    const S = this.S, k = el.dataset.set;
    if (k === 'topic') { const id = el.value; const set = new Set(S.settings.topics); if (el.checked) set.add(id); else set.delete(id); if (!set.size) { set.add(id); el.checked = true; } S.settings.topics = T.TOPICS.map(t => t.id).filter(x => set.has(x)); }
    else S.settings[k] = +el.value;
    this.save(); this.render();
  },

  /* ---------- vykreslení ---------- */
  render(force) {
    const S = this.S; if (!S) return;
    const app = $('#app');
    if (S.phase === 'lobby') {
      if (!$('#lobbyRoot') || force) this.buildLobby(app);
      this.updateLobby();
    } else app.innerHTML = this.gameHtml();
    this.paintOverlay();
  },
  qrBox() {
    const url = Net.joinUrl(this.S.code);
    return `<div class="qrbox"><div class="qr">${Net.qrSvg(url)}</div><div class="code-label">Kód hry</div><div class="code">${this.S.code}</div><div class="joinurl">${esc(url.replace(/^https?:\/\//, ''))}</div></div>`;
  },
  buildLobby(app) {
    const S = this.S;
    app.innerHTML = `<div id="lobbyRoot" class="lobby">
      <div class="lobby-left"><div class="logo">💰 Finanční liga</div><div class="tagline">Počítej. Vydělávej. Investuj. Vyhraj tajný cíl.</div>
        <div id="lobbyQr">${this.qrBox()}</div>
        <ol class="howto"><li>Na mobilu naskenuj QR kód nebo otevři adresu a zadej kód.</li><li>Zadej jméno a vytvoř tým (nebo se přidej k existujícímu) – max. 3 hráči.</li><li>Každý rok: událost → <b>řešení příkladů = výdělek</b> → společné rozhodování.</li></ol>
        <div id="hostStatus" class="status"></div></div>
      <div class="lobby-right">
        <section class="panel"><h3>⚙️ Nastavení hry</h3>
          <div class="settings">
            <label>Počet let<select data-set="years">${[4, 5, 6, 7, 8, 10].map(n => `<option value="${n}" ${S.settings.years === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label>Práce v roce<select data-set="workSec">${[120, 180, 240, 300, 420, 600].map(n => `<option value="${n}" ${S.settings.workSec === n ? 'selected' : ''}>${n / 60} min</option>`).join('')}</select></label>
            <label>Rozhodování<select data-set="decideSec">${[60, 90, 150, 210, 300].map(n => `<option value="${n}" ${S.settings.decideSec === n ? 'selected' : ''}>${n >= 60 ? (n / 60).toString().replace('.', ',') : n} min</option>`).join('')}</select></label>
            <label>Startovní kapitál<select data-set="startMoney">${[1000, 2000, 3000, 5000].map(n => `<option value="${n}" ${S.settings.startMoney === n ? 'selected' : ''}>${kc(n)}</option>`).join('')}</select></label>
          </div>
          <div class="topics">${T.TOPICS.map(t => `<label class="chip"><input type="checkbox" data-set="topic" value="${t.id}" ${S.settings.topics.includes(t.id) ? 'checked' : ''}><span>${t.emoji} ${t.name}</span></label>`).join('')}</div>
        </section>
        <section class="panel grow"><h3>👥 Týmy a hráči <span id="lobbyCount" class="count"></span></h3><div id="lobbyTeams" class="lobby-teams"></div>
          <div class="row"><button class="btn ghost" data-h="assign">🎲 Rozdělit nepřiřazené po 3</button><button id="startBtn" class="btn big" data-h="next">▶ Spustit hru</button></div></section>
      </div></div>`;
  },
  updateLobby() {
    const S = this.S; const players = Object.values(S.players);
    const free = players.filter(p => !p.teamId);
    if (this._qrCode !== S.code) { this._qrCode = S.code; const q = $('#lobbyQr'); if (q) q.innerHTML = this.qrBox(); }
    const st = $('#hostStatus'); if (st) { st.textContent = this.status; st.style.display = this.status ? 'block' : 'none'; }
    const cnt = $('#lobbyCount'); if (cnt) cnt.textContent = `(${players.filter(p => p.online).length} online / ${players.length})`;
    const el = $('#lobbyTeams'); if (!el) return;
    const dot = p => `<span class="dot ${p.online ? 'on' : ''}"></span>`;
    el.innerHTML = (S.teams.map((t, i) => `<div class="lteam" style="--c:${t.color}"><div class="lt-h"><span>${t.emoji}</span><b>${esc(t.name)}</b><span class="mut">${t.members.length}/3</span></div>
      ${t.members.map((id, k) => { const p = S.players[id]; return `<div class="lt-m">${dot(p)} ${E.ROLES[k].emoji} ${esc(p.name)} <button class="x" title="Odebrat" data-h="kick" data-pid="${id}">✕</button></div>`; }).join('')}
      ${t.members.length < 3 ? `<div class="lt-free">volných míst: ${3 - t.members.length}</div>` : ''}</div>`).join(''))
      + (free.length ? `<div class="lteam free"><div class="lt-h"><b>Bez týmu</b><span class="mut">${free.length}</span></div>${free.map(p => `<div class="lt-m">${dot(p)} ${esc(p.name)} <button class="x" data-h="kick" data-pid="${p.id}">✕</button></div>`).join('')}</div>` : '')
      || '<div class="empty">Zatím nikdo. Naskenuj QR kód telefonem 📱</div>';
    const sb = $('#startBtn'); if (sb) sb.disabled = !players.length;
  },

  teamCard(t, mode, rank) {
    const S = this.S; const P = S.players; const net = E.net(t);
    const maxNet = Math.max(1, ...S.teams.map(x => E.net(x))); const pct = Math.max(2, Math.min(100, net / maxNet * 100));
    const assets = E.ASSETS.filter(a => t.assets[a.id].n).map(a => `<span class="as" title="${a.name}">${a.emoji}${t.assets[a.id].n > 1 ? '×' + t.assets[a.id].n : ''}</span>`).join('') || '<span class="mut">žádné podniky</span>';
    const badges = `${t.insuredYear === S.year && S.phase !== 'result' ? '<span class="bd">☂️</span>' : ''}${t.train ? `<span class="bd">🎓${t.train}</span>` : ''}`;
    const members = t.members.map(id => `<span class="mem"><i class="dot ${P[id].online ? 'on' : ''}"></i>${esc(P[id].name)}</span>`).join('');
    let extra = '';
    if (mode === 'work') extra = `<div class="work-line"><span>✅ ${t.yc}</span><span>❌ ${t.yw}</span><span class="earn">+${kc(t.earnedYear)}</span></div>`;
    if (mode === 'result' && t.last) {
      const L = t.last, loc = L.local ? `<div class="loc ${L.local.type}${L.local.insured ? ' safe' : ''}">${L.local.emoji} ${esc(L.local.name)} ${L.local.type === 'loss' ? (L.local.insured ? '– pojištěno ✓' : '−' + kc(L.local.amt)) : '+' + kc(L.local.amt)}</div>` : '';
      extra = `<div class="delta ${L.delta >= 0 ? 'up' : 'down'}">${L.delta >= 0 ? '▲ +' : '▼ '}${kc(L.delta)}</div>${loc}`;
    }
    return `<div class="tcard" style="--c:${t.color}">
      <div class="th"><span class="te">${t.emoji}</span><div class="tn"><b>${esc(t.name)}</b><div class="mems">${members}</div></div>${rank ? `<span class="rank">#${rank}</span>` : ''}</div>
      <div class="tnet"><span>čisté jmění</span><b>${kc(net)}</b></div><div class="bar"><i style="width:${pct}%"></i></div>
      <div class="tstats"><div><span>💵</span>${kc(t.money)}</div><div><span>🐷</span>${kc(t.savings)}</div><div class="${t.loan ? 'neg' : ''}"><span>🏦</span>${t.loan ? '−' + kc(t.loan) : '0 Kč'}</div></div>
      <div class="tassets">${assets}${badges}</div>${extra}</div>`;
  },
  eventCard(compact) {
    const S = this.S, ev = S.event; if (!ev) return '';
    const idxPct = ((S.priceIndex - 1) * 100).toFixed(0);
    const mods = Object.entries(ev.mods || {}).filter(([, v]) => v).map(([k, v]) => `<span class="chip2 ${v > 0 ? 'up' : 'down'}">${E.ASSET_BY[k].emoji} ${v > 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))} %</span>`).join('');
    return `<div class="evcard ${compact ? 'compact' : ''}"><div class="ev-ic">${ev.emoji}</div><div class="ev-b"><div class="ev-k">Událost roku ${S.year}</div><h2>${esc(ev.name)}</h2><p>${esc(ev.text)}</p>
      <div class="chips"><span class="chip2">📈 Inflace <b>${ev.infl} %</b></span><span class="chip2">🐷 Spoření <b>${String(ev.save).replace('.', ',')} %</b></span><span class="chip2">🏦 Úvěr <b>${ev.loan} %</b></span><span class="chip2">🧾 Daň <b>${ev.tax} %</b></span>${ev.rew && ev.rew !== 1 ? `<span class="chip2 ${ev.rew > 1 ? 'up' : 'down'}">⚒️ Odměny ${ev.rew > 1 ? '+' : '−'}${Math.abs(Math.round((ev.rew - 1) * 100))} %</span>` : ''}${ev.trainDiscount ? '<span class="chip2 up">🎓 Školení −50 %</span>' : ''}${mods}<span class="chip2">🛒 Ceny od začátku +${idxPct} %</span></div>
      ${S.phase === 'result' && !compact ? `<div class="lesson">💡 <b>Poučení:</b> ${esc(ev.lesson)}</div>` : ''}</div></div>`;
  },
  gameHtml() {
    const S = this.S; const now = Date.now();
    const online = Object.values(S.players).filter(p => p.online).length;
    const label = NEXT_LABEL[S.phase] === null ? (S.year >= S.settings.years ? '🏁 Vyhodnotit hru' : '➡ Další rok') : NEXT_LABEL[S.phase];
    const dots = Array.from({ length: S.settings.years }, (_, i) => `<i class="${i + 1 < S.year || (i + 1 === S.year && S.phase === 'result') ? 'done' : i + 1 === S.year ? 'cur' : ''}"></i>`).join('');
    const head = `<header class="h-head"><div class="h-l"><div class="logo sm">💰 Finanční liga</div><button class="code-chip" data-h="qr" title="Zobrazit QR kód pro nově příchozí">📱 ${S.code}</button></div>
      <div class="h-c"><div class="years">${dots}</div><div class="phase">${S.phase === 'final' ? PHASE.final : `Rok ${S.year}/${S.settings.years} · ${PHASE[S.phase]}`}</div></div>
      <div class="h-r"><div id="h-timer" class="timer">${S.endsAt ? Net.fmtTime(S.endsAt - now) : ''}</div><div class="online ${online < Object.keys(S.players).length ? 'warn' : ''}">📶 ${online}/${Object.keys(S.players).length}</div></div></header>`;
    let body = '';
    const ranked = S.teams.slice().sort((a, b) => E.net(b) - E.net(a)); const rk = t => ranked.indexOf(t) + 1;
    if (S.phase === 'event') body = `${this.eventCard()}<div class="hint-bar">👀 Přečtěte si událost a domluvte se v týmu. Až budete připraveni, učitel zahájí práci.</div><div class="grid">${S.teams.map(t => this.teamCard(t, 'plain', null)).join('')}</div>`;
    else if (S.phase === 'work') body = `${this.eventCard(true)}<div class="hint-bar big">🧮 Řešte příklady na mobilu – <b>každá správná odpověď = peníze pro tým!</b></div><div class="grid">${S.teams.map(t => this.teamCard(t, 'work', null)).join('')}</div>`;
    else if (S.phase === 'decide') body = `${this.eventCard(true)}<div class="hint-bar big">🤝 Rozhodněte se společně: investovat, spořit, půjčit si, pojistit se, vzdělávat se…</div><div class="grid">${S.teams.map(t => this.teamCard(t, 'plain', null)).join('')}</div>`;
    else if (S.phase === 'result') body = `${this.eventCard()}<div class="grid">${S.teams.map(t => this.teamCard(t, 'result', rk(t))).join('')}</div>`;
    else if (S.phase === 'final') body = this.finalHtml();
    const foot = `<footer class="h-foot">${S.endsAt ? '<button class="btn ghost" data-h="plus">+30 s</button>' : ''}<button class="btn big" data-h="next">${label}</button>${S.phase !== 'final' ? '<button class="btn ghost small" data-h="endgame">✕ Ukončit</button>' : ''}</footer>`;
    return `<div class="host">${head}<main class="h-main">${body}</main>${foot}</div>`;
  },
  finalHtml() {
    const S = this.S; if (!S.final) return '';
    const medal = ['🥇', '🥈', '🥉'];
    const rows = S.final.map(r => {
      const t = S.teams.find(x => x.id === r.teamId), g = E.GOAL_BY[r.goalId];
      return `<div class="frow ${r.goalMet ? 'met' : ''}" style="--c:${t.color}"><div class="fr-rank">${medal[r.rank - 1] || '#' + r.rank}</div><div class="fr-team"><span class="te">${t.emoji}</span><div><b>${esc(t.name)}</b><div class="mems">${t.members.map(id => esc(S.players[id].name)).join(' · ')}</div></div></div>
        <div class="fr-goal"><div>${g.emoji} <b>${g.name}</b></div><div class="mut">${esc(g.desc(S))}</div><div class="${r.goalMet ? 'ok' : 'no'}">${r.goalMet ? '✅ Tajný cíl splněn!' : '❌ Tajný cíl nesplněn'} · ${esc(g.prog(t, S))}</div></div>
        <div class="fr-net"><b>${kc(r.net)}</b><span>čisté jmění</span><span class="mut">${r.correct} ✓ / ${r.wrong} ✗</span></div></div>`;
    }).join('');
    return `<div class="final"><h1>🏆 Výsledky</h1><p class="sub">Vyhrává se plněním tajných cílů – bohatství rozhoduje až při shodě.</p>${rows}
      <div class="lesson big">💬 <b>Diskuse:</b> Která rozhodnutí vám v tomhle roce nejvíc pomohla? Co byste udělali jinak? Jak by vypadala hra při jiné inflaci?</div></div>`;
  },
  paintOverlay() {
    let o = $('#overlay');
    if (this.overlay === 'qr') {
      if (!o) { o = document.createElement('div'); o.id = 'overlay'; document.body.appendChild(o); }
      o.className = 'overlay'; o.innerHTML = `<div class="ov-card">${this.qrBox()}<button class="btn" data-h="qr">Zavřít</button></div>`;
    } else if (o) o.remove();
  },
};
root.Host = Host;
})(window);
