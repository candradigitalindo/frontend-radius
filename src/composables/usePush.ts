// Web push (PWA) via Firebase Cloud Messaging — modular SDK.
//
// Firebase web config is read from build-time env (VITE_FIREBASE_*). The service
// worker (public/firebase-messaging-sw.js) receives the same config via query
// string on registration, so nothing is hardcoded. Push stays inert until the
// env vars are filled — pushConfigured() guards the UI.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { portalApi } from '../api'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

export type EnableResult = { ok: boolean; reason?: 'not_configured' | 'unsupported' | 'denied' | 'no_token' | 'error' }

let currentToken: string | null = null

/** True when all Firebase web config + VAPID key are present at build time. */
export function pushConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    vapidKey
  )
}

/** Current browser notification permission, or 'unsupported'. */
export function pushPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

function serviceWorkerUrl(): string {
  const p = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || '',
    authDomain: firebaseConfig.authDomain || '',
    projectId: firebaseConfig.projectId || '',
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId: firebaseConfig.appId || '',
  })
  return `/firebase-messaging-sw.js?${p.toString()}`
}

function getApp(): FirebaseApp {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig as Record<string, string>)
}

/**
 * Requests notification permission, obtains an FCM token, registers it with the
 * backend, and wires foreground message handling. Idempotent.
 */
export async function enablePush(): Promise<EnableResult> {
  try {
    if (!pushConfigured()) return { ok: false, reason: 'not_configured' }
    if (!('serviceWorker' in navigator) || typeof Notification === 'undefined') {
      return { ok: false, reason: 'unsupported' }
    }
    if (!(await isSupported().catch(() => false))) return { ok: false, reason: 'unsupported' }

    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return { ok: false, reason: 'denied' }

    const reg = await navigator.serviceWorker.register(serviceWorkerUrl())
    await navigator.serviceWorker.ready

    const messaging = getMessaging(getApp())
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg })
    if (!token) return { ok: false, reason: 'no_token' }
    currentToken = token

    await portalApi.registerPush({ fcm_token: token, device_type: 'web' })

    onMessage(messaging, (payload) => {
      const n = payload.notification
      if (n && Notification.permission === 'granted') {
        new Notification(n.title || 'Notifikasi', { body: n.body || '', icon: '/favicon.svg' })
      }
    })

    return { ok: true }
  } catch (e) {
    console.error('[push] enable failed', e)
    return { ok: false, reason: 'error' }
  }
}

/** Unregisters the current token from the backend (best-effort). */
export async function disablePush(): Promise<void> {
  if (!currentToken) return
  try {
    await portalApi.unregisterPush({ fcm_token: currentToken })
  } catch { /* best-effort */ }
  currentToken = null
}
