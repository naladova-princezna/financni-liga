/* net.js – společné pomocné funkce pro spojení (PeerJS / WebRTC) */
(function (root) {
'use strict';
const Net = {
  params: new URLSearchParams(location.search),
  alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  newCode() { let s = ''; for (let i = 0; i < 5; i++) s += this.alphabet[Math.floor(Math.random() * this.alphabet.length)]; return s; },
  peerId(code) { return 'finliga-' + String(code).toUpperCase(); },
  makePeer(id) {
    const cfg = root.FL_CONFIG || {}; const o = { debug: 0 };
    const b = this.params.get('broker');                     // ?broker=localhost:9000 – jen pro testování
    if (b) { const [h, p] = b.split(':'); o.host = h; o.port = +p || 9000; o.path = '/'; o.secure = false; }
    else if (cfg.peer) Object.assign(o, cfg.peer);
    o.config = { iceCandidatePoolSize: 2, iceServers: cfg.iceServers || [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:global.stun.twilio.com:3478' }] };
    return id ? new root.Peer(id, o) : new root.Peer(o);
  },
  joinUrl(code) {
    const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('r', code);
    const b = this.params.get('broker'); if (b) u.searchParams.set('broker', b);
    return u.toString();
  },
  qrSvg(text) { const q = root.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 10, scalable: true }); },
  fmtTime(ms) { ms = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(ms / 60) + ':' + String(ms % 60).padStart(2, '0'); },
};
root.Net = Net;
})(window);
