import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let app: App | null = null;

function getAdminApp(): App | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;

  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }
  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

/** Kirim notif FCM ke satu token. Return true jika terkirim. */
export async function sendFcmNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const adminApp = getAdminApp();
  if (!adminApp) {
    console.warn("Firebase Admin belum dikonfigurasi — notif dilewati");
    return false;
  }
  try {
    await getMessaging(adminApp).send({
      token,
      notification: { title, body },
      data,
      webpush: {
        notification: { title, body, icon: "/icon-192.png" },
      },
    });
    return true;
  } catch (e) {
    console.error("Kirim FCM gagal:", e);
    return false;
  }
}
