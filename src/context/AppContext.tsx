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
  CartItem,
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
  loginWithEmail: (email: string, password: string) => Promise<UserProfile>;
  registerWithEmail: (data: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    businessName?: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserProfile | null>;
  bootstrap: BootstrapData | null;
  bootstrapLoading: boolean;
  refreshBootstrap: () => Promise<void>;
  cart: CartItem[];
  addToCart: (item: CartItem, openDrawer?: boolean) => void;
  updateCartQty: (productId: number, selectedSize: string, quantity: number) => void;
  removeFromCart: (productId: number, selectedSize: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const CART_STORAGE_KEY = 'eimesly_cart_v1';

function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
    () => window.location.pathname + window.location.search
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(loadCartFromStorage);
  const [isCartOpen, setCartOpen] = useState(false);

  const navigate = useCallback((to: string) => {
    const target = to.startsWith('/') ? to : `/${to}`;
    if (window.location.pathname + window.location.search !== target) {
      window.history.pushState({}, '', target);
      setPath(target);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname + window.location.search);
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
    return refreshUser();
  }, [refreshUser]);

  const loginWithEmail = useCallback(
    async (email: string, password: string): Promise<UserProfile> => {
      const res = await apiFetch<{ token: string; user: UserProfile }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      setLocalSessionToken(res.token);
      setUser(res.user);
      return res.user;
    },
    []
  );

  const registerWithEmail = useCallback(
    async (payload: {
      email: string;
      password: string;
      fullName: string;
      phone: string;
      businessName?: string;
    }): Promise<UserProfile> => {
      const res = await apiFetch<{ token: string; user: UserProfile }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      setLocalSessionToken(res.token);
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

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  const addToCart = useCallback((item: CartItem, openDrawer = true) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) =>
          c.productId === item.productId &&
          c.selectedSize === item.selectedSize
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + item.quantity,
        };
        return updated;
      }
      return [...prev, item];
    });
    if (openDrawer) setCartOpen(true);
  }, []);

  const updateCartQty = useCallback(
    (productId: number, selectedSize: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) =>
          prev.filter(
            (c) =>
              !(c.productId === productId && c.selectedSize === selectedSize)
          )
        );
        return;
      }
      setCart((prev) =>
        prev.map((c) =>
          c.productId === productId && c.selectedSize === selectedSize
            ? { ...c, quantity }
            : c
        )
      );
    },
    []
  );

  const removeFromCart = useCallback(
    (productId: number, selectedSize: string) => {
      setCart((prev) =>
        prev.filter(
          (c) => !(c.productId === productId && c.selectedSize === selectedSize)
        )
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const unit =
      item.wholesalePrice && item.quantity >= item.moq && item.moq > 1
        ? item.wholesalePrice
        : item.unitPrice ?? 0;
    return sum + unit * item.quantity;
  }, 0);

  return (
    <AppContext.Provider
      value={{
        path,
        navigate,
        user,
        authReady,
        signInWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        refreshUser,
        bootstrap,
        bootstrapLoading,
        refreshBootstrap,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setCartOpen,
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
