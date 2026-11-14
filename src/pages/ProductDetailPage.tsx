import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  MessageCircle,
  Minus,
  Plus,
  X,
  ZoomIn,
} from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { AVAILABILITY_LABELS, formatRwf } from '../lib/format';
import {
  buildProductOrderMessage,
  buildWhatsAppUrl,
  buildWholesaleQuoteMessage,
  derivePackagingUnits,
  formatQuantityWithUnit,
  trackWhatsAppClick,
} from '../lib/whatsapp';
import { ProductCard } from '../components/ProductCard';
import { SmartImage } from '../components/SmartImage';
import type { Product } from '../shared/types';

interface ProductDetailResponse {
  product: Product;
  related: Product[];
}

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate, bootstrap } = useApp();
  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedVariation, setSelectedVariation] = useState('');
  const [packagingUnit, setPackagingUnit] = useState('Pack');
  const [quantity, setQuantity] = useState(1);
  const [moqError, setMoqError] = useState('');

  // Optional bulk enquiry context for Wholesale Quote button
  const [bulkBusinessName, setBulkBusinessName] = useState('');
  const [bulkLocation, setBulkLocation] = useState('Kigali, Rwanda');

  // Fallback modal when WhatsApp number is not yet configured in settings
  const [fallbackModal, setFallbackModal] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const settings = bootstrap?.settings;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setMoqError('');
    setActiveImageIdx(0);
    apiFetch<ProductDetailResponse>(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          const units = derivePackagingUnits(res.product);
          setSelectedSize(res.product.sizes?.[0] || '');
          setSelectedVariation(res.product.colors?.[0] || '');
          setPackagingUnit(units[0] || 'Pack');
          setQuantity(Math.max(1, res.product.moq || 1));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Product not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const product = data?.product;
  const related = data?.related || [];

  useDocumentMeta(
    product ? `${product.name} | Eimesly Packages` : 'Product Details | Eimesly Packages',
    product?.description
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6 aspect-[4/3] bg-[#F5F5F5] rounded-lg animate-pulse" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-8 bg-[#F5F5F5] rounded w-2/3 animate-pulse" />
            <div className="h-24 bg-[#F5F5F5] rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#202020]">Product Not Found</h1>
        <p className="text-sm text-[#202020]/70">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 text-sm font-medium bg-[#202020] text-[#FFFFFF] rounded-md"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [''];
  const activeImage = images[activeImageIdx] || images[0];
  const packagingUnits = derivePackagingUnits(product);
  const minQty = Math.max(1, product.moq || 1);

  const showWholesalePublic =
    Boolean(settings?.showWholesalePricesPublicly) &&
    product.wholesalePrice !== null;

  const isQuantityValid = quantity >= minQty;
  const effectiveQty = Math.max(minQty, quantity);
  const illustrativeTotal =
    product.unitPrice !== null ? product.unitPrice * effectiveQty : null;

  const orderMessage = buildProductOrderMessage({
    product,
    selectedSize,
    selectedVariation,
    quantity: effectiveQty,
    packagingUnit,
    currency: settings?.currency || 'RWF',
    template: settings?.whatsappDefaultOrderMessage,
  });

  const wholesaleMessage = buildWholesaleQuoteMessage({
    productName: product.name,
    requiredQuantity: formatQuantityWithUnit(effectiveQty, packagingUnit),
    businessName: bulkBusinessName,
    location: bulkLocation,
    selectedSize,
    template: settings?.whatsappWholesaleMessage,
  });

  const orderWaUrl = buildWhatsAppUrl(settings, orderMessage);
  const wholesaleWaUrl = buildWhatsAppUrl(settings, wholesaleMessage);

  const handleQuantityChange = (nextRaw: number) => {
    const val = Number.isNaN(nextRaw) ? minQty : Math.max(1, Math.floor(nextRaw));
    setQuantity(val);
    if (val < minQty) {
      setMoqError(
        `Minimum order quantity for this product is ${minQty} ${packagingUnit}${minQty > 1 ? 's' : ''}.`
      );
    } else {
      setMoqError('');
    }
  };

  const handleOrderClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (!isQuantityValid) {
      e.preventDefault();
      setQuantity(minQty);
      setMoqError(
        `Quantity adjusted to the minimum order quantity (${minQty} ${packagingUnit}${minQty > 1 ? 's' : ''}).`
      );
      return;
    }

    trackWhatsAppClick({
      eventType: 'product_order',
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      selectedSize,
      quantity: effectiveQty,
      sourcePage: 'product_detail',
    });

    if (!orderWaUrl) {
      e.preventDefault();
      setFallbackModal({
        title: 'WhatsApp Order Message Ready',
        message: orderMessage,
      });
    }
  };

  const handleWholesaleClick = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>
  ) => {
    trackWhatsAppClick({
      eventType: 'wholesale_quote',
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      selectedSize,
      quantity: effectiveQty,
      sourcePage: 'product_detail',
    });

    if (!wholesaleWaUrl) {
      e.preventDefault();
      setFallbackModal({
        title: 'Wholesale Quote Message Ready',
        message: wholesaleMessage,
      });
    }
  };

  const handleCopyFallback = () => {
    if (fallbackModal && navigator.clipboard) {
      navigator.clipboard.writeText(fallbackModal.message).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const specSummaryParts = [
    selectedSize || product.sizes?.[0],
    product.packagingQuantity,
    product.material,
  ].filter(Boolean);

  return (
    <div className="bg-[#FFFFFF]">
      {/* Product Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            sku: product.sku,
            description: product.description,
            brand: { '@type': 'Brand', name: product.brand || 'Eimesly Packages' },
            category: product.categoryName,
            ...(product.unitPrice !== null
              ? {
                  offers: {
                    '@type': 'Offer',
                    priceCurrency: 'RWF',
                    price: product.unitPrice,
                  },
                }
              : {}),
          }),
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#202020]/70 hover:text-[#202020] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalogue
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Product Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div
              className="relative aspect-[4/3] w-full bg-[#F5F5F5] rounded-lg overflow-hidden border border-[#202020]/10 cursor-zoom-in group"
              onClick={() => setZoomOpen(true)}
            >
              <SmartImage
                src={activeImage}
                alt={product.name}
                fallbackLabel={product.name}
                eager
              />
              <button
                type="button"
                aria-label="Zoom image"
                className="absolute bottom-3 right-3 p-2 bg-[#FFFFFF]/90 text-[#202020] rounded-md shadow-sm opacity-90 group-hover:opacity-100"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`aspect-[4/3] rounded-md overflow-hidden border-2 transition-colors ${
                      idx === activeImageIdx
                        ? 'border-[#B58B61]'
                        : 'border-transparent hover:border-[#202020]/25'
                    }`}
                  >
                    <SmartImage src={img} alt={`${product.name} view ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Specification & WhatsApp Direct Ordering Module */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#202020]/65">
                <a
                  href={`/categories/${product.categorySlug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/categories/${product.categorySlug}`);
                  }}
                  className="hover:text-[#B58B61] font-medium"
                >
                  {product.categoryName}
                </a>
                <span aria-hidden="true">·</span>
                <span className="font-mono">SKU: {product.sku}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {AVAILABILITY_LABELS[product.availabilityStatus] ||
                    product.availabilityStatus}
                </span>
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#202020] tracking-tight">
                {product.name}
              </h1>

              {specSummaryParts.length > 0 && (
                <p className="mt-1.5 text-sm text-[#202020]/65">
                  {specSummaryParts.join(' · ')}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-baseline gap-4">
                <span className="text-2xl font-bold text-[#202020] tabular-nums">
                  {product.unitPrice !== null
                    ? formatRwf(product.unitPrice)
                    : 'Price on Request'}
                </span>
                {showWholesalePublic && product.wholesalePrice !== null && (
                  <span className="text-sm text-[#B58B61] font-medium tabular-nums">
                    Wholesale: {formatRwf(product.wholesalePrice)} (MOQ {product.moq})
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm sm:text-base text-[#202020]/80 leading-relaxed">
              {product.description}
            </p>

            {/* Specifications Table */}
            <div className="border-y border-[#202020]/10 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {product.material && (
                <div>
                  <span className="text-xs text-[#202020]/55 block">Material</span>
                  <span className="font-medium text-[#202020]">
                    {product.material}
                  </span>
                </div>
              )}
              {product.packagingQuantity && (
                <div>
                  <span className="text-xs text-[#202020]/55 block">
                    Packaging Quantity
                  </span>
                  <span className="font-medium text-[#202020]">
                    {product.packagingQuantity}
                  </span>
                </div>
              )}
              <div>
                <span className="text-xs text-[#202020]/55 block">
                  Minimum Order Quantity (MOQ)
                </span>
                <span className="font-medium text-[#202020] tabular-nums">
                  {minQty} {minQty === 1 ? packagingUnit : `${packagingUnit}s`}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#202020]/55 block">
                  Availability
                </span>
                <span className="font-medium text-[#202020]">
                  {AVAILABILITY_LABELS[product.availabilityStatus] ||
                    product.availabilityStatus}
                </span>
              </div>
            </div>

            {/* Product Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#202020]/70 mb-2">
                  Product Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`px-3.5 py-2 text-sm rounded-md border transition-colors ${
                        selectedSize === s
                          ? 'border-[#202020] bg-[#202020] text-[#FFFFFF] font-medium'
                          : 'border-[#202020]/20 text-[#202020] hover:border-[#202020]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product Variation / Color Selector */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#202020]/70 mb-2">
                  Product Variation
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedVariation(c)}
                      className={`px-3.5 py-2 text-sm rounded-md border transition-colors ${
                        selectedVariation === c
                          ? 'border-[#B58B61] bg-[#F3EEE6] text-[#202020] font-semibold'
                          : 'border-[#202020]/20 text-[#202020] hover:border-[#202020]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Packaging Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#202020]/70 mb-2">
                  Quantity (Min {minQty})
                </label>
                <div className="inline-flex items-center border border-[#202020]/20 rounded-md w-full justify-between">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    aria-label="Decrease quantity"
                    className="p-3 hover:bg-[#F5F5F5]"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={minQty}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(Number(e.target.value))}
                    className="w-20 text-center text-sm font-semibold tabular-nums focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    aria-label="Increase quantity"
                    className="p-3 hover:bg-[#F5F5F5]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#202020]/70 mb-2">
                  Packaging Unit
                </label>
                <select
                  value={packagingUnit}
                  onChange={(e) => setPackagingUnit(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm bg-[#FFFFFF] border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                >
                  {packagingUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {moqError && (
              <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {moqError}
              </p>
            )}

            {/* Order Summary & Primary WhatsApp CTA */}
            <div className="bg-[#F3EEE6]/70 border border-[#202020]/10 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#202020]/75">
                  Selected: <strong className="text-[#202020]">{formatQuantityWithUnit(effectiveQty, packagingUnit)}</strong>
                  {selectedSize ? ` · ${selectedSize}` : ''}
                </span>
                <span className="font-bold text-[#202020] tabular-nums">
                  {illustrativeTotal !== null
                    ? formatRwf(illustrativeTotal)
                    : 'Price on Request'}
                </span>
              </div>

              {orderWaUrl ? (
                <a
                  href={orderWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOrderClick}
                  className="w-full py-3.5 px-6 text-sm font-semibold uppercase tracking-wide bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-[#B58B61]" />
                  ORDER NOW ON WHATSAPP
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleOrderClick}
                  className="w-full py-3.5 px-6 text-sm font-semibold uppercase tracking-wide bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-[#B58B61]" />
                  ORDER NOW ON WHATSAPP
                </button>
              )}

              <p className="text-[11px] text-[#202020]/65 text-center">
                No account or online payment required. Complete your order directly with our Kigali sales team on WhatsApp.
              </p>
            </div>

            {/* Separate Wholesale Quote Section */}
            <div className="border border-[#202020]/15 rounded-lg p-4 space-y-3 bg-[#FFFFFF]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#B58B61]" />
                <h2 className="text-sm font-bold text-[#202020]">
                  Bulk & Commercial Purchasing
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={bulkBusinessName}
                  onChange={(e) => setBulkBusinessName(e.target.value)}
                  placeholder="Business Name (optional)"
                  className="px-3 py-2 text-xs border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                />
                <input
                  type="text"
                  value={bulkLocation}
                  onChange={(e) => setBulkLocation(e.target.value)}
                  placeholder="Location (e.g. Kigali, Rwanda)"
                  className="px-3 py-2 text-xs border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                {wholesaleWaUrl ? (
                  <a
                    href={wholesaleWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleWholesaleClick}
                    className="flex-1 py-2.5 px-4 text-xs font-semibold uppercase tracking-wide bg-[#B58B61] text-[#FFFFFF] rounded-md hover:bg-[#9f764e] transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    REQUEST WHOLESALE QUOTE
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleWholesaleClick}
                    className="flex-1 py-2.5 px-4 text-xs font-semibold uppercase tracking-wide bg-[#B58B61] text-[#FFFFFF] rounded-md hover:bg-[#9f764e] transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    REQUEST WHOLESALE QUOTE
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/request-quote?product=${encodeURIComponent(
                        product.name
                      )}&productId=${product.id}&size=${encodeURIComponent(
                        selectedSize
                      )}`
                    )
                  }
                  className="py-2.5 px-4 text-xs font-medium border border-[#202020]/20 text-[#202020] rounded-md hover:bg-[#F5F5F5] transition-colors"
                >
                  Formal RFQ Form
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-16 pt-12 border-t border-[#202020]/10">
            <h2 className="text-xl sm:text-2xl font-bold text-[#202020] mb-6">
              Related Packaging Products
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Click-to-zoom Image Modal */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#202020]/90 flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Close zoom view"
            className="absolute top-4 right-4 p-2 bg-[#FFFFFF] text-[#202020] rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="max-w-4xl w-full max-h-[85vh] overflow-hidden rounded-lg bg-[#FFFFFF]"
            onClick={(e) => e.stopPropagation()}
          >
            <SmartImage
              src={activeImage}
              alt={product.name}
              className="w-full h-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Fallback Preview Modal when WhatsApp Business number is not configured */}
      {fallbackModal && (
        <div
          className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4"
          onClick={() => setFallbackModal(null)}
        >
          <div
            className="bg-[#FFFFFF] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#202020]/10">
              <h3 className="text-base font-bold text-[#202020]">
                {fallbackModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setFallbackModal(null)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#202020]/75">
              Our WhatsApp Business number can be configured in Admin Settings. You can copy your generated message below or contact our team directly.
            </p>
            <pre className="p-3 bg-[#F5F5F5] border border-[#202020]/10 rounded-md text-xs text-[#202020] whitespace-pre-wrap font-sans">
              {fallbackModal.message}
            </pre>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCopyFallback}
                className="px-4 py-2 text-xs font-semibold border border-[#202020]/20 rounded-md inline-flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Message'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFallbackModal(null);
                  navigate('/contact');
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
