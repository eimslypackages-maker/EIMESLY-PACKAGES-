import { auth } from './firebase';

let localSessionToken: string | null = null;

export function setLocalSessionToken(token: string | null) {
  localSessionToken = token;
  if (token) {
    try {
      sessionStorage.setItem('eimesly_session_token', token);
    } catch {
      // ignore storage failure
    }
  } else {
    try {
      sessionStorage.removeItem('eimesly_session_token');
    } catch {
      // ignore
    }
  }
}

export function getLocalSessionToken(): string | null {
  if (localSessionToken) return localSessionToken;
  try {
    localSessionToken = sessionStorage.getItem('eimesly_session_token');
  } catch {
    localSessionToken = null;
  }
  return localSessionToken;
}

export async function getActiveAuthToken(): Promise<string | null> {
  const local = getLocalSessionToken();
  if (local) return local;
  const fbUser = auth.currentUser;
  if (fbUser) {
    return fbUser.getIdToken();
  }
  return null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getActiveAuthToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return (await res.text()) as unknown as T;
}
