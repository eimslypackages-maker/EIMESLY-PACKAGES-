import { MapPin, Mail, Phone, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  buildGeneralEnquiryMessage,
  buildWhatsAppUrl,
  trackWhatsAppClick,
} from '../lib/whatsapp';

export function Footer() {
  const { navigate, bootstrap } = useApp();
  const settings = bootstrap?.settings;
  const content = bootstrap?.content;
  const categories = bootstrap?.categories || [];

  const whatsappUrl = buildWhatsAppUrl(
    settings,
    buildGeneralEnquiryMessage(settings)
  );

  return (
    <footer className="bg-[#202020] text-[#FFFFFF] border-t border-[#202020] no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand & Overview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.companyName || 'Eimesly Packages'}
                  className="h-8 w-auto object-contain bg-white rounded px-1.5 py-0.5"
                />
              ) : null}
              <span className="text-lg font-bold tracking-tight text-[#FFFFFF]">
                {settings?.companyName || 'Eimesly Packages'}
              </span>
            </div>
            <p className="text-sm text-[#FFFFFF]/75 leading-relaxed">
              {content?.footerDescription ||
                'Eimesly Packages (EIMESLY LTD) supplies food packaging products, disposable cups, drinking straws, takeaway containers, and hospitality supplies from Kigali, Rwanda.'}
            </p>
            <p className="text-xs text-[#B58B61] font-medium">
              Operated by {settings?.parentCompany || 'EIMESLY LTD'}
            </p>
          </div>

          {/* Column 2: Product Categories */}
          <div>
            <h3 className="text-sm font-semibold text-[#FFFFFF] mb-4">
              Product Categories
            </h3>
            <ul className="space-y-2.5">
              {categories.slice(0, 8).map((cat) => (
                <li key={cat.id}>
                  <a
                    href={`/categories/${cat.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/categories/${cat.slug}`);
                    }}
                    className="text-sm text-[#FFFFFF]/70 hover:text-[#B58B61] transition-colors"
                  >
                    {cat.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: EIMESLY PACKAGES Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-[#FFFFFF] mb-4">
              EIMESLY PACKAGES
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', to: '/' },
                { label: 'Shop', to: '/shop' },
                { label: 'About Us', to: '/about' },
                { label: 'Wholesale', to: '/wholesale' },
                { label: 'Contact Us', to: '/contact' },
                { label: 'Request a Quote', to: '/request-quote' },
                { label: 'FAQ', to: '/faq' },
              ].map((item) => (
                <li key={item.to}>
                  <a
                    href={item.to}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(item.to);
                    }}
                    className="text-sm text-[#FFFFFF]/70 hover:text-[#B58B61] transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact & WhatsApp */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#FFFFFF] mb-4">
              Contact & Location
            </h3>
            <div className="space-y-3 text-sm text-[#FFFFFF]/75">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#B58B61] shrink-0 mt-0.5" />
                <span>{settings?.address || 'Kigali, Rwanda'}</span>
              </div>
              {settings?.phone ? (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#B58B61] shrink-0" />
                  <a
                    href={`tel:${settings.phone}`}
                    className="hover:text-[#FFFFFF]"
                  >
                    {settings.phone}
                  </a>
                </div>
              ) : null}
              {settings?.email ? (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#B58B61] shrink-0" />
                  <a
                    href={`mailto:${settings.email}`}
                    className="hover:text-[#FFFFFF]"
                  >
                    {settings.email}
                  </a>
                </div>
              ) : null}
              {whatsappUrl ? (
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-[#B58B61] shrink-0" />
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackWhatsAppClick({
                        eventType: 'whatsapp_contact',
                        sourcePage: 'footer',
                      })
                    }
                    className="hover:text-[#FFFFFF]"
                  >
                    Order via WhatsApp Business
                  </a>
                </div>
              ) : null}
            </div>

            {(settings?.instagramUrl || settings?.facebookUrl) && (
              <div className="pt-2 flex items-center gap-4 text-sm">
                {settings.instagramUrl && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFFFFF]/75 hover:text-[#B58B61] transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {settings.facebookUrl && (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFFFFF]/75 hover:text-[#B58B61] transition-colors"
                  >
                    Facebook
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#FFFFFF]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#FFFFFF]/60">
          <p>
            © {new Date().getFullYear()} {settings?.companyName || 'Eimesly Packages'} ({settings?.parentCompany || 'EIMESLY LTD'}). Kigali, Rwanda.
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-5 sm:gap-6">
            <a
              href="/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                navigate('/privacy-policy');
              }}
              className="hover:text-[#FFFFFF] transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms-and-conditions"
              onClick={(e) => {
                e.preventDefault();
                navigate('/terms-and-conditions');
              }}
              className="hover:text-[#FFFFFF] transition-colors"
            >
              Terms & Conditions
            </a>
            <a
              href="/admin/login"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin/login');
              }}
              className="text-[#FFFFFF]/55 hover:text-[#B58B61] transition-colors"
            >
              Admin Control
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
