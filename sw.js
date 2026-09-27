/*
 * Service Worker — Fênix | Rota da Independência
 *
 * Este app não faz nenhuma chamada de rede em tempo de uso (sem CDN, sem
 * API, tudo local). Por isso o service worker aqui tem um trabalho simples:
 * guardar uma cópia do "shell" do app (o HTML, o manifest e os ícones) para
 * que, depois da primeira visita, o app abra normalmente mesmo sem internet.
 *
 * Estratégia: cache-first para os arquivos do próprio app; qualquer coisa
 * fora dessa lista (não deveria acontecer, já que não há chamadas externas)
 * cai para a rede, e se a rede falhar, cai para o que já estiver em cache.
 */

const CACHE_NAME = 'fenix-rota-independencia-v1';
const ARQUIVOS_DO_SHELL = [
  './fenix-rota-da-independencia.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(ARQUIVOS_DO_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(
        nomes.filter(function (nome) { return nome !== CACHE_NAME; })
             .map(function (nome) { return caches.delete(nome); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (respostaEmCache) {
      if (respostaEmCache) return respostaEmCache;
      return fetch(event.request)
        .then(function (respostaDaRede) {
          // guarda uma cópia para a próxima vez que ficar offline
          const copia = respostaDaRede.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copia); });
          return respostaDaRede;
        })
        .catch(function () {
          // sem rede e sem cache para isto: não há o que fazer além de deixar falhar
          return respostaEmCache;
        });
    })
  );
});
