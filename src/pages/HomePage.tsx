import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MessageCircle,
  PackageCheck,
  Truck,
} from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext';
import {
  buildGeneralEnquiryMessage,
  buildWhatsAppUrl,
  buildWholesaleQuoteMessage,
  trackWhatsAppClick,
} from '../lib/whatsapp';
import { ProductCard } from '../components/ProductCard';
import { SmartImage } from '../components/SmartImage';
import heroPackagingImage from '../assets/images/hero_packaging_collection_1794679094459.jpg';
import paperBagsImage from '../assets/images/cat_paper_bags_1794679095036.jpg';

export function HomePage() {
  const { navigate, bootstrap, bootstrapLoading } = useApp();
  const content = bootstrap?.content;
  const settings = bootstrap?.settings;
  const categories = bootstrap?.categories || [];
  const featuredProducts = bootstrap?.featuredProducts || [];

  useDocumentMeta(
    content?.seoTitle || 'Eimesly Packages – Smart Packaging Solutions for Every Business',
    content?.seoDescription
  );

  const generalWhatsappUrl = buildWhatsAppUrl(
    settings,
    buildGeneralEnquiryMessage(settings)
  );
  const wholesaleWhatsappUrl = buildWhatsAppUrl(
    settings,
    buildWholesaleQuoteMessage({
      productName: 'Wholesale Packaging Supply',
      requiredQuantity: 'Bulk Order',
      location: settings?.address || 'Kigali, Rwanda',
      template: settings?.whatsappWholesaleMessage,
    })
  );

  const benefits = [
    {
      icon: PackageCheck,
      title: 'Quality Products',
      desc: 'Practical, food-grade coffee cups, plastic iced drink cups, straws, and containers suited for hospitality service.',
    },
    {
      icon: Building2,
      title: 'Wholesale & Retail Supply',
      desc: 'Flexible ordering whether you need single retail packs or commercial bulk cartons.',
    },
    {
      icon: Truck,
      title: 'Reliable Service',
      desc: 'Dedicated team in Kigali supporting restaurants, cafés, hotels, and catering operations.',
    },
    {
      icon: MessageCircle,
      title: 'Instant WhatsApp Ordering',
      desc: 'Browse our catalogue and click Order Now to send your product details directly to our WhatsApp sales desk.',
    },
  ];

  const whyPoints = [
    {
      title: 'Diverse Product Selection',
      desc: 'From insulated hot coffee cups and clear plastic iced drink cups to drinking straws, takeaway boxes, and carrier bags.',
    },
    {
      title: 'Wholesale & Retail Options',
      desc: 'Accessible quantities for independent shops alongside tailored bulk quotations for high-volume buyers.',
    },
    {
      title: 'Business-Focused Packaging Solutions',
      desc: 'Practical sizes and materials selected specifically for cafés, restaurants, hotels, supermarkets, and caterers.',
    },
    {
      title: 'Direct WhatsApp Ordering',
      desc: 'Order immediately via WhatsApp without creating an account or filling out complicated checkout forms.',
    },
    {
      title: 'Responsive Customer Support',
      desc: 'Reach our Kigali supply team via WhatsApp, phone, or direct enquiry forms whenever you need assistance.',
    },
    {
      title: 'Reliable Supply Continuity',
      desc: 'Consistent stock coordination and transparent lead times for recurring hospitality operations.',
    },
  ];

  return (
    <div className="bg-[#FFFFFF]">
      {/* A. Hero Section */}
      <section className="bg-[#F3EEE6] border-b border-[#202020]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
                {settings?.address || 'Kigali, Rwanda'} · {settings?.parentCompany || 'EIMESLY LTD'}
              </p>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#202020] leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                {content?.heroHeadline || 'Smart Packaging Solutions for Every Business'}
              </h1>
              <p className="text-base sm:text-lg text-[#202020]/75 leading-relaxed max-w-xl">
                {content?.heroSubtext ||
                  'Discover quality food packaging products designed for cafés, restaurants, hotels, catering businesses, and retailers. Order directly via WhatsApp.'}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/shop')}
                  className="px-6 py-3.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                >
                  EXPLORE PRODUCTS
                  <ArrowRight className="w-4 h-4" />
                </button>
                {wholesaleWhatsappUrl ? (
                  <a
                    href={wholesaleWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackWhatsAppClick({
                        eventType: 'wholesale_quote',
                        sourcePage: 'home_hero',
                      })
                    }
                    className="px-6 py-3.5 text-sm font-semibold border border-[#202020] text-[#202020] bg-transparent rounded-md hover:bg-[#202020] hover:text-[#FFFFFF] transition-colors whitespace-nowrap"
                  >
                    REQUEST A WHOLESALE QUOTE
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/request-quote')}
                    className="px-6 py-3.5 text-sm font-semibold border border-[#202020] text-[#202020] bg-transparent rounded-md hover:bg-[#202020] hover:text-[#FFFFFF] transition-colors whitespace-nowrap"
                  >
                    REQUEST A WHOLESALE QUOTE
                  </button>
                )}
                {generalWhatsappUrl ? (
                  <a
                    href={generalWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackWhatsAppClick({
                        eventType: 'whatsapp_contact',
                        sourcePage: 'home_hero',
                      })
                    }
                    className="px-5 py-3.5 text-sm font-semibold bg-[#B58B61] text-[#FFFFFF] rounded-md hover:bg-[#9f764e] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4" />
                    CONTACT US VIA WHATSAPP
                  </a>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#202020] shadow-lg">
                <SmartImage
                  src={
                    content?.heroImageUrl ||
                    heroPackagingImage
                  }
                  alt="Eimesly Packages food-service packaging collection"
                  eager
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B. Business Benefits */}
      <section className="border-b border-[#202020]/10 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-[#F3EEE6] text-[#B58B61] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#202020]">
                      {b.title}
                    </h2>
                    <p className="mt-1 text-xs text-[#202020]/70 leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* C. Shop by Categories */}
      <section className="py-16 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
                Product Range
              </p>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#202020] tracking-tight">
                Shop by Categories
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className="text-sm font-semibold text-[#202020] hover:text-[#B58B61] inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
            >
              View All Categories
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {bootstrapLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-[4/3] rounded-lg bg-[#F5F5F5] animate-pulse"
                />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-[#F5F5F5] border border-[#202020]/10 rounded-lg p-10 text-center">
              <p className="text-sm text-[#202020]/70">
                No product categories are currently published.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {categories.map((cat) => (
                <a
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/categories/${cat.slug}`);
                  }}
                  className="group bg-[#F5F5F5] border border-[#202020]/10 rounded-lg overflow-hidden flex flex-col hover:border-[#B58B61] transition-colors"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-[#F3EEE6]">
                    <SmartImage
                      src={cat.imageUrl}
                      alt={cat.name}
                      fallbackLabel={cat.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3.5 bg-[#FFFFFF] flex-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#202020] group-hover:text-[#B58B61] transition-colors line-clamp-1">
                      {cat.name}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#202020]/40 group-hover:text-[#B58B61] shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* D. Featured Products */}
      <section className="py-16 bg-[#F5F5F5] border-y border-[#202020]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
                Featured Catalogue
              </p>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#202020] tracking-tight">
                Featured Packaging Products
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="text-sm font-semibold text-[#202020] hover:text-[#B58B61] inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
            >
              Browse Full Catalogue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {bootstrapLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-80 rounded-lg bg-[#FFFFFF] border border-[#202020]/10 animate-pulse"
                />
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-12 text-center">
              <p className="text-sm text-[#202020]/70">
                No featured products are currently configured.
              </p>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="mt-4 px-5 py-2.5 text-sm font-medium bg-[#202020] text-[#FFFFFF] rounded-md"
              >
                View All Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredProducts.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* E. Wholesale Section */}
      <section className="py-16 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F3EEE6] border border-[#202020]/10 rounded-xl p-8 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
                Commercial & Bulk Supply
              </p>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#202020] tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {content?.wholesaleHeadline ||
                  'Your Reliable Wholesale Packaging Partner'}
              </h2>
              <p className="text-base text-[#202020]/75 leading-relaxed max-w-2xl">
                {content?.wholesaleDescription ||
                  'Whether you manage a restaurant, café, hotel, supermarket, or catering business, Eimesly Packages provides packaging solutions to support your operations.'}
              </p>
              <div className="pt-2 flex flex-wrap gap-3.5">
                {wholesaleWhatsappUrl ? (
                  <a
                    href={wholesaleWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackWhatsAppClick({
                        eventType: 'wholesale_quote',
                        sourcePage: 'home_wholesale',
                      })
                    }
                    className="px-5 py-3 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4 text-[#B58B61]" />
                    Request a Wholesale Quote
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/wholesale')}
                    className="px-5 py-3 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors whitespace-nowrap"
                  >
                    Request a Wholesale Quote
                  </button>
                )}
                {generalWhatsappUrl ? (
                  <a
                    href={generalWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackWhatsAppClick({
                        eventType: 'whatsapp_contact',
                        sourcePage: 'home_wholesale',
                      })
                    }
                    className="px-5 py-3 text-sm font-semibold border border-[#202020]/30 bg-[#FFFFFF] text-[#202020] rounded-md hover:bg-[#F5F5F5] transition-colors whitespace-nowrap"
                  >
                    Contact Us via WhatsApp
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/contact')}
                    className="px-5 py-3 text-sm font-semibold border border-[#202020]/30 bg-[#FFFFFF] text-[#202020] rounded-md hover:bg-[#F5F5F5] transition-colors whitespace-nowrap"
                  >
                    Contact Our Team
                  </button>
                )}
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#FFFFFF] border border-[#202020]/10">
                <SmartImage
                  src={paperBagsImage}
                  alt="Wholesale kraft carrier bags and food packaging"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* F. Why Choose Eimesly Packages? */}
      <section className="py-16 bg-[#FFFFFF] border-t border-[#202020]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
              Built for Hospitality & Retail
            </p>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#202020] tracking-tight">
              Why Choose Eimesly Packages?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
            {whyPoints.map((pt) => (
              <div key={pt.title} className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2
                    className="w-5 h-5 text-[#B58B61] shrink-0"
                    strokeWidth={1.75}
                  />
                  <h3 className="text-base font-semibold text-[#202020]">
                    {pt.title}
                  </h3>
                </div>
                <p className="text-sm text-[#202020]/70 leading-relaxed pl-7.5">
                  {pt.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* G. Promotional Banner */}
      <section className="bg-[#202020] text-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight max-w-xl"
            style={{ textWrap: 'balance' }}
          >
            {content?.promoBannerHeadline ||
              'Everything Your Business Needs for Better Packaging.'}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-6 py-3.5 text-sm font-semibold bg-[#B58B61] text-[#FFFFFF] rounded-md hover:bg-[#9f764e] transition-colors whitespace-nowrap shrink-0"
          >
            {content?.promoBannerButtonText || 'EXPLORE OUR PRODUCTS'}
          </button>
        </div>
      </section>

      {/* H. Customer Enquiries */}
      <section className="py-16 bg-[#F5F5F5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
            Bulk Orders & Special Requirements
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#202020] tracking-tight">
            Planning a Bulk Order or Custom Packaging Run?
          </h2>
          <p className="text-base text-[#202020]/75 max-w-2xl mx-auto leading-relaxed">
            Message our Kigali sales team on WhatsApp or share your packaging specifications and estimated quantities for a tailored wholesale quotation.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3.5">
            {generalWhatsappUrl ? (
              <a
                href={generalWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackWhatsAppClick({
                    eventType: 'whatsapp_contact',
                    sourcePage: 'home_enquiries',
                  })
                }
                className="px-6 py-3 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-[#B58B61]" />
                Chat on WhatsApp
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/request-quote')}
              className="px-6 py-3 text-sm font-semibold border border-[#202020]/25 bg-[#FFFFFF] text-[#202020] rounded-md hover:bg-[#F3EEE6] transition-colors"
            >
              Request a Wholesale Quote
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
