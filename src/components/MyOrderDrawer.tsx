import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useOrderList } from '../context/OrderListContext';
import {
  buildMultiProductOrderMessage,
  buildWhatsAppUrl,
  calculateCombinedOrderTotal,
  calculateLineTotal,
  calculatePricedItemsSubtotal,
  formatOrderRwf,
  formatQuantityWithUnit,
  trackWhatsAppClick,
} from '../lib/whatsapp';
import { SmartImage } from './SmartImage';

export function MyOrderDrawer() {
  const { bootstrap, navigate } = useApp();
  const {
    items,
    orderDate,
    totalItemCount,
    totalUnits,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    updateItemQuantity,
    updateItemOptions,
    removeItem,
    clearOrder,
    toast,
    dismissToast,
  } = useOrderList();

  const [copied, setCopied] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [sentConfirmPrompt, setSentConfirmPrompt] = useState(false);
  const [showMessagePreview, setShowMessagePreview] = useState(false);

  const settings = bootstrap?.settings;
  const currency = settings?.currency || 'RWF';

  useEffect(() => {
    if (!isDrawerOpen) {
      setConfirmClearOpen(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  useEffect(() => {
    if (items.length === 0) {
      setConfirmClearOpen(false);
      setSentConfirmPrompt(false);
    }
  }, [items.length]);

  const summaryItems = items.map((item) => ({
    name: item.name,
    sku: item.sku,
    selectedSize: item.selectedSize,
    selectedVariation: item.selectedVariation,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    packagingUnit: item.packagingUnit,
  }));

  const whatsappMessage = buildMultiProductOrderMessage({
    items: summaryItems,
    orderDate,
    currency,
    template: settings?.whatsappDefaultOrderMessage,
  });

  const whatsappUrl = whatsappMessage
    ? buildWhatsAppUrl(settings, whatsappMessage)
    : '';

  const combinedTotal = calculateCombinedOrderTotal(items);
  const { pricedSubtotal, hasPricedItems, hasUnpricedItems } =
    calculatePricedItemsSubtotal(items);
  const grandTotalDisplay = formatOrderRwf(combinedTotal, currency);

  const handleCopyMessage = async () => {
    if (!whatsappMessage) return;
    let success = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(whatsappMessage);
        success = true;
      } catch {
        success = false;
      }
    }
    if (!success && typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = whatsappMessage;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        success = document.execCommand('copy');
      } catch {
        success = false;
      }
      document.body.removeChild(textarea);
    }
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendOrder = () => {
    items.forEach((item) => {
      trackWhatsAppClick({
        eventType: 'product_order',
        productId: item.productId,
        productName: item.name,
        sku: item.sku,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        sourcePage: 'my_order_drawer',
      });
    });
    setSentConfirmPrompt(true);
  };

  return (
    <>
      {/* Subtle non-blocking toast when customer adds an item */}
      {toast && !isDrawerOpen && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 left-4 sm:left-auto z-40 max-w-sm bg-[#202020] text-[#FFFFFF] rounded-lg shadow-xl border border-[#B58B61]/40 px-4 py-3 flex items-center justify-between gap-3 no-print"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#FFFFFF] truncate">
              {toast.updatedExisting ? 'Updated in My Order' : 'Added to My Order'}
            </p>
            <p className="text-[11px] text-[#FFFFFF]/75 truncate tabular-nums">
              {toast.productName} ·{' '}
              {formatQuantityWithUnit(toast.quantity, toast.packagingUnit)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                dismissToast();
                openDrawer();
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-[#B58B61] text-[#FFFFFF] rounded-md hover:bg-[#9f764e] transition-colors whitespace-nowrap"
            >
              My Order ({totalItemCount})
            </button>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss notification"
              className="p-1 text-[#FFFFFF]/60 hover:text-[#FFFFFF]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Slide-over My Order Drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#202020]/55 flex justify-end no-print"
          onClick={closeDrawer}
          role="dialog"
          aria-modal="true"
          aria-labelledby="my-order-drawer-title"
        >
          <div
            className="bg-[#FFFFFF] w-full max-w-2xl h-full flex flex-col shadow-2xl border-l border-[#202020]/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drawer Controls */}
            <div className="px-5 py-3.5 border-b border-[#202020]/10 flex items-center justify-between gap-3 bg-[#FFFFFF]">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShoppingBag className="w-5 h-5 text-[#B58B61] shrink-0" />
                <span className="text-xs font-semibold text-[#202020]/70 tabular-nums">
                  My Order ·{' '}
                  {totalItemCount === 0
                    ? 'Empty'
                    : `${totalItemCount} ${
                        totalItemCount === 1 ? 'item' : 'items'
                      } (${totalUnits} ${totalUnits === 1 ? 'unit' : 'units'})`}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {items.length > 0 && !confirmClearOpen && (
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(true)}
                    className="px-2.5 py-1.5 text-xs font-medium text-[#202020]/70 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap"
                  >
                    Clear Order
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Close My Order"
                  className="p-2 text-[#202020]/65 hover:text-[#202020] hover:bg-[#F5F5F5] rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Explicit Clear Order confirmation bar */}
            {confirmClearOpen && (
              <div className="px-5 py-3 bg-[#FAF7F2] border-b border-[#B58B61]/30 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-[#202020]">
                  Clear all {totalItemCount} products from your order?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(false)}
                    className="px-3 py-1.5 font-medium border border-[#202020]/20 text-[#202020] bg-[#FFFFFF] rounded-md"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearOrder();
                      setConfirmClearOpen(false);
                    }}
                    className="px-3 py-1.5 font-semibold bg-red-600 text-[#FFFFFF] rounded-md hover:bg-red-700"
                  >
                    Yes, Clear
                  </button>
                </div>
              </div>
            )}

            {/* Post-send prompt: only clear if customer confirms starting a new order */}
            {sentConfirmPrompt && items.length > 0 && (
              <div className="px-5 py-3 bg-[#FAF7F2] border-b border-[#B58B61]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div>
                  <p className="font-semibold text-[#202020]">
                    WhatsApp opened with your order
                  </p>
                  <p className="text-[#202020]/70">
                    Start a new order list or keep these items saved.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSentConfirmPrompt(false)}
                    className="px-3 py-1.5 font-medium border border-[#202020]/20 text-[#202020] bg-[#FFFFFF] rounded-md whitespace-nowrap"
                  >
                    Keep Order
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearOrder();
                      setSentConfirmPrompt(false);
                    }}
                    className="px-3 py-1.5 font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] whitespace-nowrap"
                  >
                    Start New Order
                  </button>
                </div>
              </div>
            )}

            {/* Order Summary Header + Items Table */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {items.length === 0 ? (
                <div className="py-16 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#FAF7F2] border border-[#B58B61]/30 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-[#B58B61]" />
                  </div>
                  <div className="space-y-1.5 max-w-xs mx-auto">
                    <h2
                      id="my-order-drawer-title"
                      className="text-base font-bold text-[#202020]"
                    >
                      Your Order List Is Empty
                    </h2>
                    <p className="text-xs text-[#202020]/65 leading-relaxed">
                      Browse our packaging catalogue and click Add to Order on any
                      product to build one combined WhatsApp order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      closeDrawer();
                      navigate('/shop');
                    }}
                    className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Order Header */}
                  <div className="pb-4 border-b border-[#B58B61]/35 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold tracking-[0.14em] uppercase text-[#8C6843]">
                        EIMESLY PACKAGES
                      </p>
                      <h2
                        id="my-order-drawer-title"
                        className="text-lg sm:text-xl font-bold tracking-tight text-[#202020] uppercase mt-0.5"
                      >
                        CUSTOMER ORDER
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-[#202020]/80 tabular-nums">
                      Order Date:{' '}
                      <strong className="text-[#202020]">{orderDate}</strong>
                    </p>
                  </div>

                  {/* 2. Responsive 5-Column Order Items Table */}
                  <div className="border border-[#202020]/12 rounded-lg overflow-hidden bg-[#FFFFFF]">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left border-collapse">
                        <thead>
                          <tr className="bg-[#FAF7F2] border-b border-[#B58B61]/30 text-[11px] font-bold uppercase tracking-wider text-[#202020]/80">
                            <th className="py-3 pl-3.5 pr-2">Item Name</th>
                            <th className="py-3 px-2 whitespace-nowrap">Size</th>
                            <th className="py-3 px-2 whitespace-nowrap">Qty</th>
                            <th className="py-3 px-2 text-right whitespace-nowrap">
                              Unit Price
                            </th>
                            <th className="py-3 pl-2 pr-3.5 text-right whitespace-nowrap">
                              Total Price
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#202020]/10 text-xs sm:text-sm">
                          {items.map((item) => {
                            const minQty = Math.max(1, item.moq || 1);
                            const lineTotal = calculateLineTotal(
                              item.unitPrice,
                              item.quantity
                            );

                            return (
                              <tr key={item.key} className="align-top">
                                {/* Item Name */}
                                <td className="py-3.5 pl-3.5 pr-2">
                                  <div className="flex items-start gap-2.5">
                                    <a
                                      href={`/products/${item.slug}`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        closeDrawer();
                                        navigate(`/products/${item.slug}`);
                                      }}
                                      className="w-10 h-10 rounded bg-[#F5F5F5] border border-[#202020]/10 overflow-hidden shrink-0 hidden sm:block"
                                    >
                                      <SmartImage
                                        src={item.image}
                                        alt={item.name}
                                        fallbackLabel={item.name}
                                      />
                                    </a>
                                    <div className="min-w-0 space-y-1">
                                      <a
                                        href={`/products/${item.slug}`}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          closeDrawer();
                                          navigate(`/products/${item.slug}`);
                                        }}
                                        className="font-semibold text-[#202020] hover:text-[#B58B61] transition-colors leading-snug block"
                                      >
                                        {item.name}
                                      </a>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#202020]/55">
                                        <span className="font-mono">
                                          {item.sku}
                                        </span>
                                        {item.availableVariations.length > 1 ? (
                                          <select
                                            aria-label={`Variation for ${item.name}`}
                                            value={item.selectedVariation}
                                            onChange={(e) =>
                                              updateItemOptions(item.key, {
                                                selectedVariation:
                                                  e.target.value,
                                              })
                                            }
                                            className="px-1.5 py-0.5 text-[11px] bg-[#FAF7F2] border border-[#202020]/15 rounded text-[#202020]"
                                          >
                                            {item.availableVariations.map(
                                              (v) => (
                                                <option key={v} value={v}>
                                                  {v}
                                                </option>
                                              )
                                            )}
                                          </select>
                                        ) : item.selectedVariation ? (
                                          <span>· {item.selectedVariation}</span>
                                        ) : null}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeItem(item.key)}
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#202020]/55 hover:text-red-600 transition-colors pt-0.5"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* Size */}
                                <td className="py-3.5 px-2 whitespace-nowrap">
                                  {item.availableSizes.length > 1 ? (
                                    <select
                                      aria-label={`Size for ${item.name}`}
                                      value={item.selectedSize}
                                      onChange={(e) =>
                                        updateItemOptions(item.key, {
                                          selectedSize: e.target.value,
                                        })
                                      }
                                      className="px-2 py-1 text-xs bg-[#FAF7F2] border border-[#202020]/15 rounded text-[#202020] focus:outline-none focus:border-[#B58B61]"
                                    >
                                      {item.availableSizes.map((s) => (
                                        <option key={s} value={s}>
                                          {s}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-xs sm:text-sm text-[#202020]">
                                      {item.selectedSize || 'Standard'}
                                    </span>
                                  )}
                                </td>

                                {/* Qty */}
                                <td className="py-3.5 px-2 whitespace-nowrap">
                                  <div className="space-y-1">
                                    <div className="inline-flex items-center border border-[#202020]/20 rounded bg-[#FFFFFF]">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateItemQuantity(
                                            item.key,
                                            item.quantity - 1
                                          )
                                        }
                                        disabled={item.quantity <= minQty}
                                        aria-label={`Decrease quantity for ${item.name}`}
                                        className="p-1.5 text-[#202020] hover:bg-[#F5F5F5] disabled:opacity-35 disabled:cursor-not-allowed"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <input
                                        type="number"
                                        min={minQty}
                                        aria-label={`Quantity for ${item.name}`}
                                        value={item.quantity}
                                        onChange={(e) =>
                                          updateItemQuantity(
                                            item.key,
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-10 text-center text-xs font-semibold tabular-nums focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateItemQuantity(
                                            item.key,
                                            item.quantity + 1
                                          )
                                        }
                                        aria-label={`Increase quantity for ${item.name}`}
                                        className="p-1.5 text-[#202020] hover:bg-[#F5F5F5]"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div className="text-[11px] text-[#202020]/60 tabular-nums">
                                      {formatQuantityWithUnit(
                                        item.quantity,
                                        item.packagingUnit
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Unit Price */}
                                <td className="py-3.5 px-2 text-right tabular-nums whitespace-nowrap text-xs sm:text-sm text-[#202020]/85">
                                  {formatOrderRwf(item.unitPrice, currency)}
                                </td>

                                {/* Total Price */}
                                <td className="py-3.5 pl-2 pr-3.5 text-right tabular-nums whitespace-nowrap font-semibold text-xs sm:text-sm text-[#202020]">
                                  {formatOrderRwf(lineTotal, currency)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 4. Separate Prominent Grand Total & Send Order Section */}
            {items.length > 0 && (
              <div className="border-t border-[#B58B61]/35 bg-[#FAF7F2] px-5 py-4 space-y-3.5">
                {hasUnpricedItems && (
                  <div className="p-3 rounded-md bg-[#FFFFFF] border border-[#B58B61]/45 text-xs text-[#202020]/80 leading-relaxed">
                    <p className="font-semibold text-[#8C6843]">
                      Price on Request Items Included
                    </p>
                    <p className="mt-0.5">
                      {items
                        .filter((i) => i.unitPrice === null)
                        .map((i) => i.name)
                        .join(', ')}{' '}
                      {items.filter((i) => i.unitPrice === null).length === 1
                        ? 'is'
                        : 'are'}{' '}
                      marked Price on Request. The final order amount will be
                      confirmed through WhatsApp.
                    </p>
                  </div>
                )}

                {!whatsappUrl && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        WhatsApp Business number is not configured
                      </p>
                      <p className="mt-0.5 text-amber-800">
                        An administrator must set the WhatsApp number in Admin →
                        System Settings. You can copy your complete order message
                        below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Highlighted GRAND TOTAL Summary Box */}
                <div className="rounded-lg border-2 border-[#B58B61]/55 bg-[#FFFFFF] px-4 py-4 space-y-1.5">
                  {hasUnpricedItems && hasPricedItems && (
                    <div className="flex items-center justify-between text-xs text-[#202020]/70 tabular-nums pb-2 border-b border-[#B58B61]/20">
                      <span>Priced Items Subtotal</span>
                      <span className="font-semibold text-[#202020]">
                        {formatOrderRwf(pricedSubtotal, currency)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="block text-sm sm:text-base font-bold uppercase tracking-wider text-[#202020]">
                        GRAND TOTAL:
                      </span>
                      <span className="block text-[11px] text-[#202020]/60 tabular-nums">
                        {totalItemCount}{' '}
                        {totalItemCount === 1 ? 'item' : 'items'} · {totalUnits}{' '}
                        {totalUnits === 1 ? 'unit' : 'units'}
                      </span>
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-[#8C6843] tabular-nums tracking-tight whitespace-nowrap shrink-0">
                      {grandTotalDisplay}
                    </span>
                  </div>
                </div>

                {/* Collapsible WhatsApp Message Preview */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowMessagePreview((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#202020]/70 hover:text-[#202020]"
                  >
                    {showMessagePreview ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    {showMessagePreview
                      ? 'Hide WhatsApp Order Message'
                      : 'Preview WhatsApp Order Message'}
                  </button>

                  {showMessagePreview && (
                    <pre className="mt-2 p-3 bg-[#FFFFFF] border border-[#202020]/10 rounded-md text-xs text-[#202020] whitespace-pre-wrap font-sans leading-relaxed max-h-44 overflow-y-auto">
                      {whatsappMessage}
                    </pre>
                  )}
                </div>

                {/* Primary CTA Row */}
                <div className="space-y-2">
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleSendOrder}
                      className="w-full py-3.5 px-5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4 text-[#B58B61]" />
                      Send Order
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="w-full py-3.5 px-5 text-sm font-semibold bg-[#202020]/35 text-[#FFFFFF] rounded-md cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Send Order
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="py-2.5 px-3 text-xs font-semibold border border-[#202020]/20 bg-[#FFFFFF] text-[#202020] rounded-md hover:bg-[#F5F5F5] transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copied ? 'Copied' : 'Copy Message'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeDrawer();
                        navigate('/shop');
                      }}
                      className="py-2.5 px-3 text-xs font-semibold border border-[#B58B61]/45 bg-[#FFFFFF] text-[#202020] rounded-md hover:bg-[#F3EEE6]/60 transition-colors whitespace-nowrap"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
