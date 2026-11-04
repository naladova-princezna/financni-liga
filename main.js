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
  <p class="lead">Týmová hra pro celou třídu. Peníze se tu <b>vydělávají matematikou</b> – a pak je třeba moudře využít.</p>
  <div class="landing-grid">
    <div class="card"><h2>👩‍🏫 Učitel</h2><p class="mut">Hru spustíš na počítači s projektorem. Žáci se připojí telefony přes QR kód.</p><button class="btn big" data-l="teacher">Vytvořit novou hru</button></div>
    <div class="card"><h2>📱 Žák</h2><p class="mut">Zadej kód hry z projektoru (nebo naskenuj QR kód).</p><input id="codeIn" class="codein" maxlength="5" placeholder="KÓD" autocomplete="off" autocapitalize="characters"><button class="btn big" data-l="join">Připojit se</button></div>
  </div>
  <ul class="feat"><li>🧮 7 okruhů středoškolské matematiky</li><li>👥 týmy po 3 s rolemi</li><li>📈 inflace, úroky, daně, pojištění</li><li>🎯 tajné cíle místo „kdo má víc“</li></ul>
</div>`;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-l]'); if (!b) return;
  if (b.dataset.l === 'teacher') { document.body.classList.remove('is-landing'); document.body.classList.add('is-host'); Host.start(); }
  if (b.dataset.l === 'join') {
    const c = ($('#codeIn').value || '').trim().toUpperCase(); if (!c) return;
    const u = new URL(location.href); u.search = ''; u.searchParams.set('r', c); const br = q.get('broker'); if (br) u.searchParams.set('broker', br); location.href = u.toString();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'codeIn') document.querySelector('[data-l=join]').click(); });
})();
