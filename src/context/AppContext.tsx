import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  apiFetch,
  getActiveAuthToken,
  getLocalSessionToken,
  setLocalSessionToken,
} from '../lib/api';
import type {
  Category,
  Product,
  UserProfile,
  WebsiteContent,
  WebsiteSettings,
} from '../shared/types';

interface BootstrapData {
  settings: WebsiteSettings;
  content: WebsiteContent;
  categories: Category[];
  featuredProducts: Product[];
}

interface AppContextValue {
  path: string;
  navigate: (to: string) => void;
  user: UserProfile | null;
  authReady: boolean;
  signInWithGoogle: () => Promise<UserProfile | null>;
  loginWithEmail: (
    email: string,
    password: string,
    remember?: boolean
  ) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserProfile | null>;
  bootstrap: BootstrapData | null;
  bootstrapLoading: boolean;
  refreshBootstrap: () => Promise<void>;
}

const APP_BASE_PATH = '/EIMESLY-PACKAGES-';

function getAppPath() {
  const pathname = window.location.pathname;
  const appPath = pathname.startsWith(APP_BASE_PATH)
    ? pathname.slice(APP_BASE_PATH.length) || '/'
    : pathname;
  return appPath + window.location.search;
}

function getBrowserPath(to: string) {
  const target = to.startsWith('/') ? to : `/${to}`;
  return `${APP_BASE_PATH}${target === '/' ? '/' : target}`;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    const fullTitle = title.includes('Eimesly')
      ? title
      : `${title} | Eimesly Packages`;
    document.title = fullTitle;
    if (description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', description);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
      const twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) twDesc.setAttribute('content', description);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', fullTitle);
  }, [title, description]);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState<string>(
    () => getAppPath()
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);

  const navigate = useCallback((to: string) => {
    const target = to.startsWith('/') ? to : `/${to}`;
    const browserTarget = getBrowserPath(target);
    if (window.location.pathname + window.location.search !== browserTarget) {
      window.history.pushState({}, '', browserTarget);
      setPath(target);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      setPath(getAppPath());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const data = await apiFetch<BootstrapData>('/api/bootstrap');
      setBootstrap(data);
    } catch (err) {
      console.error('Failed to load storefront bootstrap:', err);
    } finally {
      setBootstrapLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  useEffect(() => {
    const s = bootstrap?.settings;
    if (!s) return;

    if (s.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = s.faviconUrl;
    }

    if (s.googleSearchConsoleTag) {
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="google-site-verification"]'
      );
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'google-site-verification';
        document.head.appendChild(meta);
      }
      meta.content = s.googleSearchConsoleTag;
    }

    if (
      s.googleAnalyticsId &&
      /^(G|GT|UA|AW)-[A-Za-z0-9-]+$/.test(s.googleAnalyticsId.trim()) &&
      !document.getElementById('eimesly-ga-script')
    ) {
      const gaId = s.googleAnalyticsId.trim();
      const script = document.createElement('script');
      script.id = 'eimesly-ga-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
      document.head.appendChild(script);
      const inline = document.createElement('script');
      inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(gaId)});`;
      document.head.appendChild(inline);
    }
  }, [bootstrap?.settings]);

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    const token = await getActiveAuthToken();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const data = await apiFetch<{ user: UserProfile }>('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setLocalSessionToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser || getLocalSessionToken()) {
        await refreshUser();
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [refreshUser]);

  const signInWithGoogle = useCallback(async (): Promise<UserProfile | null> => {
    setLocalSessionToken(null);
    await signInWithPopup(auth, googleAuthProvider);
    const data = await apiFetch<{ user: UserProfile }>('/api/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithEmail = useCallback(
    async (
      email: string,
      password: string,
      remember = true
    ): Promise<UserProfile> => {
      const res = await apiFetch<{ token: string; user: UserProfile }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      setLocalSessionToken(res.token, remember);
      setUser(res.user);
      return res.user;
    },
    []
  );

  const logout = useCallback(async () => {
    setLocalSessionToken(null);
    try {
      await signOut(auth);
    } catch {
      // ignore if signed in via local session
    }
    setUser(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        path,
        navigate,
        user,
        authReady,
        signInWithGoogle,
        loginWithEmail,
        logout,
        refreshUser,
        bootstrap,
        bootstrapLoading,
        refreshBootstrap,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
