import { useState } from 'react';
import { Check, Copy, MessageCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AVAILABILITY_LABELS, formatRwf } from '../lib/format';
import {
  buildProductOrderMessage,
  buildWhatsAppUrl,
  derivePackagingUnits,
  trackWhatsAppClick,
} from '../lib/whatsapp';
import type { Product } from '../shared/types';
import { SmartImage } from './SmartImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate, bootstrap } = useApp();
  const settings = bootstrap?.settings;
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const primaryImage = product.images?.[0] || '';
  const sizeSpec =
    product.sizes && product.sizes.length > 0
      ? product.sizes.slice(0, 2).join(' / ')
      : product.packagingQuantity || product.material;

  const availabilityLabel =
    AVAILABILITY_LABELS[product.availabilityStatus] || 'Available';

  const defaultSize = product.sizes?.[0] || '';
  const defaultUnit = derivePackagingUnits(product)[0] || 'Pack';
  const defaultQty = Math.max(1, product.moq || 1);

  const orderMessage = buildProductOrderMessage({
    product,
    selectedSize: defaultSize,
    quantity: defaultQty,
    packagingUnit: defaultUnit,
    currency: settings?.currency || 'RWF',
    template: settings?.whatsappDefaultOrderMessage,
  });

  const whatsappUrl = buildWhatsAppUrl(settings, orderMessage);

  const handleTrackOrderClick = () => {
    trackWhatsAppClick({
      eventType: 'product_order',
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      selectedSize: defaultSize,
      quantity: defaultQty,
      sourcePage: 'product_card',
    });
  };

  const handleCopyMessage = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderMessage).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <>
      <article className="group bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <a
          href={`/products/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/products/${product.slug}`);
          }}
          className="block aspect-[4/3] w-full bg-[#F5F5F5] overflow-hidden"
        >
          <SmartImage
            src={primaryImage}
            alt={product.name}
            fallbackLabel={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </a>

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-[#202020]/60">
            <span className="truncate">{product.categoryName || 'Packaging'}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{availabilityLabel}</span>
          </div>

          <h3 className="mt-1.5 text-base font-semibold text-[#202020] leading-snug line-clamp-2">
            <a
              href={`/products/${product.slug}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/products/${product.slug}`);
              }}
              className="hover:text-[#B58B61] transition-colors"
            >
              {product.name}
            </a>
          </h3>

          {sizeSpec && (
            <p className="mt-1 text-xs text-[#202020]/65 line-clamp-1">
              {sizeSpec}
            </p>
          )}

          <div className="mt-auto pt-3 space-y-2.5">
            <p className="text-sm font-semibold text-[#202020] tabular-nums">
              {product.unitPrice !== null
                ? formatRwf(product.unitPrice)
                : 'Price on Request'}
            </p>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTrackOrderClick}
                className="w-full py-2.5 px-3 text-xs font-semibold uppercase tracking-wide bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#B58B61]" />
                ORDER NOW
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  handleTrackOrderClick();
                  setFallbackOpen(true);
                }}
                className="w-full py-2.5 px-3 text-xs font-semibold uppercase tracking-wide bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#B58B61]" />
                ORDER NOW
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(`/products/${product.slug}`)}
              className="w-full py-1.5 text-xs font-medium text-[#202020]/70 hover:text-[#B58B61] transition-colors text-center"
            >
              Select Options & Specifications
            </button>
          </div>
        </div>
      </article>

      {fallbackOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4"
          onClick={() => setFallbackOpen(false)}
        >
          <div
            className="bg-[#FFFFFF] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#202020]/10">
              <h3 className="text-base font-bold text-[#202020]">
                Order Message Ready
              </h3>
              <button
                type="button"
                onClick={() => setFallbackOpen(false)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#202020]/75">
              Our WhatsApp Business number has not been configured in System Settings yet. Copy your order summary below or contact our team directly.
            </p>
            <pre className="p-3 bg-[#F5F5F5] border border-[#202020]/10 rounded-md text-xs text-[#202020] whitespace-pre-wrap font-sans">
              {orderMessage}
            </pre>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="px-4 py-2 text-xs font-semibold border border-[#202020]/20 rounded-md inline-flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Order Message'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFallbackOpen(false);
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
    </>
  );
}
