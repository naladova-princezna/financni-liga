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
  <ul class="facts"><li>1 vyučovací hodina</li><li>2–30 žáků</li><li>bez instalace</li><li>zdarma</li></ul>
  <div class="landing-grid">
    <div class="card"><h2>Učitel</h2><p class="mut">Spustíš na počítači s projektorem. Žáci se připojí telefony přes QR kód – bez registrace a bez instalace.</p><button class="btn big" data-l="teacher">Vytvořit novou hru</button><button class="btn big ghost" data-l="demo">🤖 Vyzkoušet demo bez telefonů</button></div>
    <div class="card"><h2>Žák</h2><p class="mut">Zadej kód hry z projektoru (nebo naskenuj QR kód).</p><input id="codeIn" class="codein" maxlength="5" placeholder="KÓD" autocomplete="off" autocapitalize="characters"><button class="btn big ghost" data-l="join">Připojit se</button></div>
  </div>
  <div class="steps lite">
    <div class="step"><b>1</b><span><h4>Událost</h4>Inflace, recese, daně – pravidla se mění.</span></div>
    <div class="step"><b>2</b><span><h4>Počítej</h4>Správný příklad = peníze týmu.</span></div>
    <div class="step"><b>3</b><span><h4>Rozhodněte</h4>Investujte, spořte, pojistěte se.</span></div>
    <div class="step"><b>4</b><span><h4>Tajný cíl</h4>Vyhrává splněný cíl, ne jen nejvíc peněz.</span></div>
  </div>
  <div class="why lite">
    <p><b>Pro učitele</b>Všech 7 okruhů středoškolské matematiky ve 3 obtížnostech, hodnocení automaticky.</p>
    <p><b>Pro žáky</b>Zažijí, co dělá inflace s úsporami a proč se vyplatí rezerva a pojištění.</p>
    <p><b>Diagnostika</b>Na konci uvidíte, která témata třídě nešla, a stáhnete CSV.</p>
  </div>
  <p class="fine">Žádná registrace ani vlastní server. Jména a odpovědi putují šifrovaně jen mezi telefony a učitelským počítačem; veřejný zprostředkovací server (PeerJS) vidí pouze anonymní kód hry.</p>
  <p class="foot"><a href="metodika.html">Metodický list pro učitele</a></p>
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
