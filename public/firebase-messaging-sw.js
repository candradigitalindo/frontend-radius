/* Firebase Cloud Messaging service worker — web push / PWA background messages.
 *
 * The Firebase web config is passed via query string when the page registers
 * this worker (see src/composables/usePush.ts), so no keys are hardcoded here.
 * Uses the compat builds because service workers can't import ES modules reliably.
 */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

const params = new URL(self.location).searchParams
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
}

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {}
    self.registration.showNotification(n.title || 'Notifikasi', {
      body: n.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: payload.data || {},
    })
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow('/')
    })
  )
})
