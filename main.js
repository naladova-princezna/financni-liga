/* main.js – rozcestník: učitel / žák */
(function () {
'use strict';
const $ = s => document.querySelector(s);
const q = new URLSearchParams(location.search);
const code = (q.get('r') || '').trim().toUpperCase();
if (code) { document.body.classList.add('is-player'); Player.init(code); return; }

document.body.classList.add('is-landing');
$('#app').innerHTML = `<div class="landing">
  <div class="logo big">💰 Finanční liga</div>
  <p class="lead">Matematika, která se vyplácí. Týmy po třech si na mobilech <b>vydělávají řešením příkladů</b> a pak moudře hospodaří – s inflací, úroky, daněmi i pojištěním.</p>
  <ul class="facts"><li>⏱ 1 vyučovací hodina</li><li>👥 2–30 žáků v týmech po 3</li><li>📱 bez instalace a registrace</li><li>🆓 zdarma</li></ul>
  <div class="landing-grid">
    <div class="card"><h2>👩‍🏫 Učitel</h2><p class="mut">Spustíš na počítači s projektorem. Žáci se připojí telefony přes QR kód – bez registrace a bez instalace.</p><button class="btn big" data-l="teacher">Vytvořit novou hru</button><button class="btn big ghost" data-l="demo">🤖 Vyzkoušet demo bez telefonů</button></div>
    <div class="card"><h2>📱 Žák</h2><p class="mut">Zadej kód hry z projektoru (nebo naskenuj QR kód).</p><input id="codeIn" class="codein" maxlength="5" placeholder="KÓD" autocomplete="off" autocapitalize="characters"><button class="btn big ghost" data-l="join">Připojit se</button></div>
  </div>
  <h2 class="lh">Jak hodina vypadá</h2>
  <div class="steps">
    <div class="step"><b>1</b><span><h4>🌍 Událost roku</h4>Inflace, recese, daňová reforma… Mění pravidla pro všechny týmy.</span></div>
    <div class="step"><b>2</b><span><h4>🧮 Počítej a vydělávej</h4>Každý příklad na mobilu = peníze týmu. Těžší úloha, víc peněz, ale i riziko pokuty.</span></div>
    <div class="step"><b>3</b><span><h4>🤝 Rozhodněte se</h4>Ředitel, Finančník a Správce spolu investují, spoří, půjčují si a pojišťují se.</span></div>
    <div class="step"><b>4</b><span><h4>🎯 Tajný cíl</h4>Nevyhrává ten nejbohatší, ale tým, který splní svůj tajný cíl.</span></div>
  </div>
  <h2 class="lh">Pro koho a proč</h2>
  <div class="why">
    <div class="card"><h4>📚 Pro učitele matematiky</h4><p class="mut">Všech 7 okruhů středoškolské matematiky (výroky, množiny, logika, číselné obory, mocniny, výrazy, rovnice a nerovnice) ve 3 obtížnostech. Úlohy se generují a vyhodnocují automaticky.</p></div>
    <div class="card"><h4>💡 Pro finanční gramotnost</h4><p class="mut">Žáci na vlastní kůži zažijí, co dělá inflace s úsporami, proč se vyplatí rezerva a pojištění a jak souvisí riziko s výnosem.</p></div>
    <div class="card"><h4>🔍 Diagnostika zdarma</h4><p class="mut">Na konci uvidíte, <b>která témata třídě nešla</b>, a stáhnete výsledky žáků v CSV.</p></div>
    <div class="card"><h4>🔒 Bez účtů a dat</h4><p class="mut">Žádná registrace a žádný vlastní server. Jména a odpovědi putují šifrovaně jen mezi telefony a učitelským počítačem; veřejný zprostředkovací server (PeerJS) vidí pouze anonymní kód hry.</p></div>
  </div>
  <p class="foot"><a href="metodika.html">📖 Metodický list pro učitele</a> · zdarma · funguje v prohlížeči na jakémkoli telefonu</p>
</div>`;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-l]'); if (!b) return;
  if (b.dataset.l === 'teacher' || b.dataset.l === 'demo') { document.body.classList.remove('is-landing'); document.body.classList.add('is-host'); Host.start({ demo: b.dataset.l === 'demo' }); }
  if (b.dataset.l === 'join') {
    const c = ($('#codeIn').value || '').trim().toUpperCase(); if (!c) return;
    const u = new URL(location.href); u.search = ''; u.searchParams.set('r', c); const br = q.get('broker'); if (br) u.searchParams.set('broker', br); location.href = u.toString();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'codeIn') document.querySelector('[data-l=join]').click(); });
})();
