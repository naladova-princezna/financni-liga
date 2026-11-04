/* Volitelné nastavení spojení. Výchozí hodnoty fungují bez jakékoli registrace.
   - peer:       vlastní PeerJS server (např. { host: 'muj-peer.example.cz', port: 443, path: '/', secure: true })
   - iceServers: vlastní STUN/TURN servery. TURN pomůže ve školních sítích, kde mobily
                 nemohou komunikovat napřímo (viz README, sekce „Když se telefony nepřipojí“). */
window.FL_CONFIG = {
  peer: null,
  iceServers: null,
  // Příklad TURN:
  // iceServers: [
  //   { urls: 'stun:stun.l.google.com:19302' },
  //   { urls: 'turn:turn.example.cz:3478', username: 'uzivatel', credential: 'heslo' }
  // ]
};
