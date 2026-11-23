const VERSAO = 'fit-v1.3.3-20261123';
const ARQUIVOS = [
  './',
  './index.html',
  './privacidade.html',
  './manifest.webmanifest',
  './src/Program.js',
  './src/ui/styles/styles.css',
  './src/ui/styles/material-symbols-rounded.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './src/apoio/apoio.css',
  './src/apoio/stk-pkt-doacao.js',
  './src/apoio/stk-pkt-feedback.js',
  './src/apoio/stk-pkt-qrcode.js',
  './src/apoio/stk-pkt-ponte.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('fit-') && k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

/* Página: rede primeiro (pega a versão nova), cache se estiver offline. Demais arquivos: cache primeiro. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSAO).then(x => x.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const c = res.clone(); caches.open(VERSAO).then(x => x.put(req, c)); return res; })));
});
