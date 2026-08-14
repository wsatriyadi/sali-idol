/* Firebase Cloud Messaging service worker (background notifications).
 * Config di-inject dari env saat build ke placeholder di bawah.
 * Karena SW tidak bisa baca process.env, isi manual dari Firebase console
 * atau samakan dengan NEXT_PUBLIC_FIREBASE_* Anda. */

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBJBAplhT2oKNuVGnBQRjBp85ItfOBb2oc",
  authDomain: "saliidol.firebaseapp.com",
  projectId: "saliidol",
  storageBucket: "saliidol.firebasestorage.app",
  messagingSenderId: "610150506448",
  appId: "1:610150506448:web:e29267ddd2f737f99aa3d5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "SALI IDOL";
  const options = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  };
  self.registration.showNotification(title, options);
});
