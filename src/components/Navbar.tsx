import React, { useEffect, useRef, useState } from 'react';
import { Menu, MessageCircle, Search, ShoppingBag, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useOrderList } from '../context/OrderListContext';
import { apiFetch } from '../lib/api';
import { formatRwf } from '../lib/format';
import {
  buildGeneralEnquiryMessage,
  buildWhatsAppUrl,
  trackWhatsAppClick,
} from '../lib/whatsapp';

interface Suggestion {
  id: number;
  name: string;
  slug: string;
  sku: string;
  unitPrice?: number | null;
}

export function Navbar() {
  const { path, navigate, bootstrap } = useApp();
  const { totalItemCount, openDrawer } = useOrderList();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const settings = bootstrap?.settings;
  const currentPathname = path.split('?')[0];

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    { label: 'Categories', to: '/categories' },
    { label: 'About Us', to: '/about' },
    { label: 'Wholesale', to: '/wholesale' },
    { label: 'Contact', to: '/contact' },
  ];

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 40);
    }
  }, [searchOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<Suggestion[]>(
          `/api/products/suggestions?q=${encodeURIComponent(trimmed)}`
        );
        setSuggestions(res);
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    setSearchOpen(false);
    setMobileOpen(false);
    if (trimmed) {
      navigate(`/shop?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/shop');
    }
  };

  const whatsappUrl = buildWhatsAppUrl(
    settings,
    buildGeneralEnquiryMessage(settings)
  );

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-[#202020]/10 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 -ml-2 text-[#202020] hover:bg-[#F5F5F5] rounded-md transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#B58B61]"
          >
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.companyName || 'Eimesly Packages'}
                className="h-8 w-auto object-contain"
              />
            ) : null}
            <span className="text-lg font-bold tracking-tight text-[#202020]">
              {settings?.companyName || 'Eimesly Packages'}
            </span>
          </a>
        </div>

        {/* Center Nav Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7"
        >
          {navLinks.map((link) => {
            const active =
              link.to === '/'
                ? currentPathname === '/'
                : currentPathname.startsWith(link.to);
            return (
              <a
                key={link.to}
                href={link.to}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(link.to);
                }}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  active
                    ? 'text-[#202020] border-[#B58B61]'
                    : 'text-[#202020]/75 border-transparent hover:text-[#202020] hover:border-[#202020]/25'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Right Actions: Search + My Order + WhatsApp Us */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Search products"
            className="p-2 text-[#202020]/80 hover:text-[#202020] hover:bg-[#F5F5F5] rounded-md transition-colors"
          >
            <Search className="w-5 h-5" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Open My Order (${totalItemCount} items)`}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              totalItemCount > 0
                ? 'bg-[#FAF7F2] border-[#B58B61] text-[#202020] hover:bg-[#F3EEE6]'
                : 'bg-[#FFFFFF] border-[#202020]/20 text-[#202020] hover:bg-[#F5F5F5]'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-[#B58B61]" strokeWidth={2} />
            <span>My Order</span>
            <span className="tabular-nums font-bold text-[#8C6843]">
              ({totalItemCount})
            </span>
          </button>

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackWhatsAppClick({
                  eventType: 'whatsapp_contact',
                  sourcePage: 'navbar',
                })
              }
              className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-4 h-4 text-[#B58B61]" strokeWidth={2} />
              <span>WhatsApp Us</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-4 h-4 text-[#B58B61]" strokeWidth={2} />
              <span>WhatsApp Us</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-[#202020]/10 bg-[#FFFFFF]">
          <div className="max-w-3xl mx-auto px-4 py-3 relative">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#202020]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search coffee cups, straws, takeaway containers, or SKU..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F5F5F5] border border-[#202020]/10 rounded-md focus:outline-none focus:border-[#B58B61]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 text-sm font-medium bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors whitespace-nowrap shrink-0"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="p-2.5 text-[#202020]/60 hover:text-[#202020]"
              >
                <X className="w-4 h-4" />
              </button>
            </form>

            {suggestions.length > 0 && (
              <div className="mt-2 bg-[#FFFFFF] border border-[#202020]/10 rounded-md shadow-lg divide-y divide-[#202020]/5">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery('');
                      navigate(`/products/${s.slug}`);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-[#F3EEE6]/60 transition-colors"
                  >
                    <span className="text-sm font-medium text-[#202020] truncate pr-4">
                      {s.name}
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-[#202020] tabular-nums">
                        {formatRwf(s.unitPrice)}
                      </span>
                      <span className="text-xs font-mono text-[#202020]/50">
                        {s.sku}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#202020]/10 bg-[#FFFFFF] px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <button
              key={link.to}
              type="button"
              onClick={() => {
                setMobileOpen(false);
                navigate(link.to);
              }}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#202020] hover:bg-[#F3EEE6] rounded-md"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-[#202020]/10 flex flex-col gap-2">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackWhatsAppClick({
                    eventType: 'whatsapp_contact',
                    sourcePage: 'mobile_navbar',
                  });
                  setMobileOpen(false);
                }}
                className="w-full py-2.5 px-4 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md text-center inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-[#B58B61]" />
                WhatsApp Us
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                navigate('/request-quote');
              }}
              className="w-full py-2.5 px-4 text-sm font-medium border border-[#202020]/20 text-[#202020] rounded-md text-center"
            >
              Request Wholesale Quote
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
