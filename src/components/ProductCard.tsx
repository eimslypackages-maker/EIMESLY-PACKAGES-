import { useState } from 'react';
import { Check, MessageCircle, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useOrderList } from '../context/OrderListContext';
import { AVAILABILITY_LABELS, formatRwf } from '../lib/format';
import {
  buildProductOrderMessage,
  buildWhatsAppUrl,
  derivePackagingUnits,
  trackWhatsAppClick,
} from '../lib/whatsapp';
import type { Product } from '../shared/types';
import { OrderMessageModal } from './OrderMessageModal';
import { SmartImage } from './SmartImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate, bootstrap } = useApp();
  const { addItem, items, openDrawer } = useOrderList();
  const settings = bootstrap?.settings;
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const primaryImage = product.images?.[0] || '';
  const sizeSpec =
    product.sizes && product.sizes.length > 0
      ? product.sizes.slice(0, 2).join(' / ')
      : product.packagingQuantity || product.material;

  const availabilityLabel =
    AVAILABILITY_LABELS[product.availabilityStatus] || 'Available';

  const defaultSize = product.sizes?.[0] || '';
  const defaultVariation = product.colors?.[0] || '';
  const defaultUnit = derivePackagingUnits(product)[0] || 'Pack';
  const defaultQty = Math.max(1, product.moq || 1);

  const existingInOrder = items.filter((i) => i.productId === product.id);
  const existingQty = existingInOrder.reduce((sum, i) => sum + i.quantity, 0);

  const orderMessage = buildProductOrderMessage({
    product,
    selectedSize: defaultSize,
    selectedVariation: defaultVariation,
    quantity: defaultQty,
    packagingUnit: defaultUnit,
    currency: settings?.currency || 'RWF',
    template: settings?.whatsappDefaultOrderMessage,
  });

  const whatsappUrl = buildWhatsAppUrl(settings, orderMessage);

  const handleAddToOrder = () => {
    addItem({
      product,
      selectedSize: defaultSize,
      selectedVariation: defaultVariation,
      packagingUnit: defaultUnit,
      quantity: defaultQty,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

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

          <div className="mt-auto pt-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-[#202020] tabular-nums">
                {formatRwf(product.unitPrice)}
              </p>
              {existingQty > 0 && (
                <button
                  type="button"
                  onClick={openDrawer}
                  className="text-[11px] font-semibold text-[#8C6843] hover:underline tabular-nums whitespace-nowrap"
                >
                  In My Order ({existingQty})
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddToOrder}
              className={`w-full py-2.5 px-3 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                justAdded
                  ? 'bg-[#B58B61] text-[#FFFFFF]'
                  : 'bg-[#202020] text-[#FFFFFF] hover:bg-[#333333]'
              }`}
            >
              {justAdded ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-[#B58B61]" />
              )}
              {justAdded ? 'Added to Order' : 'Add to Order'}
            </button>

            <button
              type="button"
              onClick={() => setOrderModalOpen(true)}
              className="w-full py-2 px-3 text-xs font-semibold uppercase tracking-wide border border-[#202020]/20 text-[#202020] rounded-md hover:bg-[#FAF7F2] hover:border-[#B58B61] transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#B58B61]" />
              ORDER NOW
            </button>

            <button
              type="button"
              onClick={() => navigate(`/products/${product.slug}`)}
              className="w-full py-1 text-xs font-medium text-[#202020]/70 hover:text-[#B58B61] transition-colors text-center"
            >
              Select Options & Specifications
            </button>
          </div>
        </div>
      </article>

      <OrderMessageModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title="Order Message Ready"
        productName={product.name}
        sku={product.sku}
        selectedSize={defaultSize}
        selectedVariation={defaultVariation}
        unitPrice={product.unitPrice}
        quantity={defaultQty}
        packagingUnit={defaultUnit}
        currency={settings?.currency || 'RWF'}
        message={orderMessage}
        whatsappUrl={whatsappUrl}
        onSendClick={handleTrackOrderClick}
      />
    </>
  );
}
