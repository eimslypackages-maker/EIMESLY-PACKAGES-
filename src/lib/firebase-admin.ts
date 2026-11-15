import fs from 'node:fs';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function loadFirebaseConfig(): { projectId?: string } {
  try {
    const configUrl = new URL('../../firebase-applet-config.json', import.meta.url);
    return JSON.parse(fs.readFileSync(configUrl, 'utf8')) as { projectId?: string };
  } catch {
    return {};
  }
}

const firebaseConfig = loadFirebaseConfig();

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT,
  });
}

export const adminAuth = getAuth();
