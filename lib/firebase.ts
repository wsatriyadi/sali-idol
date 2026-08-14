"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function isConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function getApp(): FirebaseApp | null {
  if (!isConfigured()) return null;
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

/** Minta izin notif + ambil FCM token. Return null jika unsupported/gagal. */
export async function requestFcmToken(): Promise<string | null> {
  try {
    if (typeof window === "undefined") return null;
    if (!isConfigured()) return null;
    if (!(await isSupported())) return null;
    if (!("Notification" in window)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const app = getApp();
    if (!app) return null;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const messaging: Messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (e) {
    console.warn("FCM token gagal:", e);
    return null;
  }
}

/** Listener pesan foreground. */
export async function onForegroundMessage(cb: (payload: any) => void) {
  try {
    if (!isConfigured() || !(await isSupported())) return;
    const app = getApp();
    if (!app) return;
    onMessage(getMessaging(app), cb);
  } catch {
    /* ignore */
  }
}
