import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  MessageCircle,
  Minus,
  Plus,
  ZoomIn,
  X,
} from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { AVAILABILITY_LABELS, formatRwf } from '../lib/format';
import { ProductCard } from '../components/ProductCard';
import { SmartImage } from '../components/SmartImage';
import type { Product } from '../shared/types';

interface ProductDetailResponse {
  product: Product;
  related: Product[];
}

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate, addToCart, bootstrap } = useApp();
  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  const settings = bootstrap?.settings;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setActiveImageIdx(0);
    apiFetch<ProductDetailResponse>(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setSelectedSize(res.product.sizes?.[0] || '');
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
  const wholesaleApplies =
    product.wholesalePrice !== null &&
    product.moq > 1 &&
    quantity >= product.moq;
  const effectiveUnitPrice = wholesaleApplies
    ? product.wholesalePrice
    : product.unitPrice;

  const handleAddToCart = (goToCheckout = false) => {
    addToCart(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        sku: product.sku,
        image: images[0] || '',
        selectedSize,
        quantity,
        unitPrice: product.unitPrice,
        wholesalePrice: product.wholesalePrice,
        moq: product.moq || 1,
        packagingQuantity: product.packagingQuantity,
      },
      !goToCheckout
    );
    if (goToCheckout) {
      navigate('/checkout');
    }
  };

  const cleanWhatsapp = (settings?.whatsappNumber || '').replace(/[^0-9]/g, '');
  const whatsappMessage = encodeURIComponent(
    `Hello Eimesly Packages, I would like to enquire about ${product.name} (SKU: ${product.sku})${selectedSize ? `, Size: ${selectedSize}` : ''}, Quantity: ${quantity}.`
  );

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

          {/* Right: Contiguous Purchase & Specification Module */}
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

              <div className="mt-4 flex flex-wrap items-baseline gap-4">
                <span className="text-2xl font-bold text-[#202020] tabular-nums">
                  {effectiveUnitPrice !== null
                    ? formatRwf(effectiveUnitPrice)
                    : 'Price on Request'}
                </span>
                {product.wholesalePrice !== null && (
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
              {product.colors && product.colors.length > 0 && (
                <div>
                  <span className="text-xs text-[#202020]/55 block">
                    Available Colors
                  </span>
                  <span className="font-medium text-[#202020]">
                    {product.colors.join(', ')}
                  </span>
                </div>
              )}
              <div>
                <span className="text-xs text-[#202020]/55 block">
                  Minimum Order Quantity (MOQ)
                </span>
                <span className="font-medium text-[#202020] tabular-nums">
                  {product.moq} {product.moq === 1 ? 'unit / pack' : 'units / packs'}
                </span>
              </div>
            </div>

            {/* Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#202020]/70 mb-2">
                  Select Size / Variant
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

            {/* Quantity + Primary Purchase Actions */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center border border-[#202020]/20 rounded-md">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="p-3 hover:bg-[#F5F5F5]"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Number(e.target.value || 1)))
                    }
                    className="w-16 text-center text-sm font-semibold tabular-nums focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="p-3 hover:bg-[#F5F5F5]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddToCart(false)}
                  className="flex-1 min-w-[160px] py-3 px-6 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors"
                >
                  Add to Cart
                </button>

                <button
                  type="button"
                  onClick={() => handleAddToCart(true)}
                  className="py-3 px-6 text-sm font-semibold bg-[#B58B61] text-[#FFFFFF] rounded-md hover:bg-[#9f764e] transition-colors"
                >
                  Buy Now
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                  className="py-2.5 px-4 text-sm font-medium border border-[#202020]/25 text-[#202020] rounded-md hover:bg-[#F3EEE6] transition-colors"
                >
                  Request a Bulk Quote
                </button>

                {cleanWhatsapp ? (
                  <a
                    href={`https://wa.me/${cleanWhatsapp}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 text-sm font-medium border border-[#202020]/25 text-[#202020] rounded-md hover:bg-[#F5F5F5] transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-[#B58B61]" />
                    WhatsApp Enquiry
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/contact')}
                    className="py-2.5 px-4 text-sm font-medium border border-[#202020]/25 text-[#202020] rounded-md hover:bg-[#F5F5F5] transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-[#B58B61]" />
                    Enquire About Product
                  </button>
                )}
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
    </div>
  );
}
