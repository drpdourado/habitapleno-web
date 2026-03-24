// Service Worker Robust para HabitaPleno PWA
// Em conformidade com os requisitos de auditoria do Chrome (Lighthouse/PWA)

const CACHE_NAME = 'habita-pleno-pwa-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json',
  '/pwa-habita-icon.png',
  '/LogoSistema.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Tenta cachear, mas não trava se algum falhar
        return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('Cache warning:', err));
      })
  );
  self.skipWaiting();
});

// Ativação do Service Worker (Limpeza de caches antigos)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  // Ignora requisições de API de terceiros ou Firebase se necessário
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna cache ou busca na rede
        return response || fetch(event.request).then(networkResponse => {
            // Só guarda no cache se for um arquivo estático do nosso domínio
            if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
        });
      }).catch(() => {
        // Fallback básico se a rede falhar e não estiver no cache
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});
