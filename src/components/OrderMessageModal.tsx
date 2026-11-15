import { useState } from 'react';
import { AlertTriangle, Check, Copy, MessageCircle, X } from 'lucide-react';
import {
  calculateCombinedOrderTotal,
  calculateLineTotal,
  formatOrderDateDDMMYYYY,
  formatOrderRwf,
  formatQuantityWithUnit,
  type OrderLineSummaryItem,
} from '../lib/whatsapp';

interface OrderMessageModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  productName?: string;
  sku?: string;
  selectedSize?: string;
  selectedVariation?: string;
  unitPrice?: number | null;
  quantity?: number;
  packagingUnit?: string;
  orderDate?: string;
  items?: OrderLineSummaryItem[];
  currency?: string;
  showTotalSummary?: boolean;
  message: string;
  whatsappUrl: string;
  onSendClick?: () => void;
  primaryButtonLabel?: string;
  copyButtonLabel?: string;
}

export function OrderMessageModal({
  open,
  onClose,
  title = 'Order Message Ready',
  productName,
  sku,
  selectedSize,
  selectedVariation,
  unitPrice,
  quantity = 1,
  packagingUnit = 'Pack',
  orderDate,
  items,
  currency = 'RWF',
  showTotalSummary = true,
  message,
  whatsappUrl,
  onSendClick,
  primaryButtonLabel = 'Send Order',
  copyButtonLabel = 'Copy Order Message',
}: OrderMessageModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const effectiveDate = orderDate || formatOrderDateDDMMYYYY();

  const summaryRows: OrderLineSummaryItem[] =
    items && items.length > 0
      ? items
      : productName
      ? [
          {
            name: productName,
            sku,
            selectedSize,
            selectedVariation,
            unitPrice,
            quantity,
            packagingUnit,
          },
        ]
      : [];

  const hasSummary = showTotalSummary && summaryRows.length > 0;
  const computedTotal = hasSummary
    ? calculateCombinedOrderTotal(summaryRows)
    : null;
  const grandTotalDisplay = formatOrderRwf(computedTotal, currency);
  const unpricedItems = summaryRows.filter(
    (r) => r.unitPrice === null || r.unitPrice === undefined
  );

  const handleCopy = async () => {
    let success = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(message);
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success && typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = message;
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

  return (
    <div
      className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-modal-title"
    >
      <div
        className="bg-[#FFFFFF] rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-[#202020]/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#202020]/10">
          <div className="min-w-0">
            <h3
              id="order-modal-title"
              className="text-base font-bold text-[#202020]"
            >
              {title}
            </h3>
            {productName && (
              <p className="mt-1 text-xs text-[#202020]/65 truncate tabular-nums">
                {productName}
                {sku ? ` · ${sku}` : ''}
                {selectedSize ? ` · ${selectedSize}` : ''}
                {selectedVariation ? ` · ${selectedVariation}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order summary"
            className="p-1.5 text-[#202020]/60 hover:text-[#202020] rounded shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {whatsappUrl ? (
          <p className="text-xs text-[#202020]/75 leading-relaxed">
            Review your order summary and message below, then click{' '}
            <strong className="text-[#202020]">{primaryButtonLabel}</strong> to
            open WhatsApp with your complete order ready to send.
          </p>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                WhatsApp Business number is not configured
              </p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                An administrator must set the official WhatsApp Business number
                in Admin → System Settings before direct WhatsApp ordering can
                be sent. You can copy your complete order message below.
              </p>
            </div>
          </div>
        )}

        {hasSummary && (
          <section
            aria-label="Customer Order Summary"
            className="space-y-4"
          >
            {/* Order Header */}
            <div className="pb-3 border-b border-[#B58B61]/35 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#8C6843]">
                  EIMESLY PACKAGES
                </p>
                <p className="text-base font-bold tracking-tight text-[#202020] uppercase mt-0.5">
                  CUSTOMER ORDER
                </p>
              </div>
              <p className="text-xs font-medium text-[#202020]/80 tabular-nums">
                Order Date:{' '}
                <strong className="text-[#202020]">{effectiveDate}</strong>
              </p>
            </div>

            {/* 5-Column Order Items Table */}
            <div className="border border-[#202020]/12 rounded-lg overflow-hidden bg-[#FFFFFF]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF7F2] border-b border-[#B58B61]/30 text-[11px] font-bold uppercase tracking-wider text-[#202020]/80">
                      <th className="py-2.5 pl-3.5 pr-2">Item Name</th>
                      <th className="py-2.5 px-2 whitespace-nowrap">Size</th>
                      <th className="py-2.5 px-2 whitespace-nowrap">Qty</th>
                      <th className="py-2.5 px-2 text-right whitespace-nowrap">
                        Unit Price
                      </th>
                      <th className="py-2.5 pl-2 pr-3.5 text-right whitespace-nowrap">
                        Total Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202020]/10 text-xs sm:text-sm">
                    {summaryRows.map((row, idx) => {
                      const lineTotal = calculateLineTotal(
                        row.unitPrice,
                        row.quantity
                      );
                      return (
                        <tr key={`${row.sku || row.name}-${idx}`}>
                          <td className="py-3 pl-3.5 pr-2 font-medium text-[#202020]">
                            <span>{row.name}</span>
                            {row.selectedVariation && (
                              <span className="block text-[11px] text-[#202020]/60">
                                {row.selectedVariation}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap text-[#202020]/85">
                            {row.selectedSize?.trim() || 'Standard'}
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap tabular-nums text-[#202020]">
                            {formatQuantityWithUnit(
                              row.quantity,
                              row.packagingUnit || 'Pack'
                            )}
                          </td>
                          <td className="py-3 px-2 text-right whitespace-nowrap tabular-nums text-[#202020]/85">
                            {formatOrderRwf(row.unitPrice, currency)}
                          </td>
                          <td className="py-3 pl-2 pr-3.5 text-right whitespace-nowrap tabular-nums font-semibold text-[#202020]">
                            {formatOrderRwf(lineTotal, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {unpricedItems.length > 0 && (
              <p className="text-xs text-[#8C6843] bg-[#FAF7F2] border border-[#B58B61]/35 rounded-md px-3.5 py-2.5 leading-relaxed">
                {unpricedItems.map((i) => i.name).join(', ')}{' '}
                {unpricedItems.length === 1 ? 'is' : 'are'} marked{' '}
                <strong>Price on Request</strong>. The final order amount will
                be confirmed directly on WhatsApp.
              </p>
            )}

            {/* Separate Prominent GRAND TOTAL Box */}
            <div className="rounded-lg border-2 border-[#B58B61]/55 bg-[#FAF7F2] px-4 py-4 flex items-center justify-between gap-4">
              <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#202020]">
                GRAND TOTAL:
              </span>
              <span className="text-xl sm:text-2xl font-bold text-[#8C6843] tabular-nums tracking-tight whitespace-nowrap shrink-0">
                {grandTotalDisplay}
              </span>
            </div>
          </section>
        )}

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#202020]/55">
            WhatsApp Order Message
          </p>
          <pre className="p-3.5 bg-[#F5F5F5] border border-[#202020]/10 rounded-md text-xs text-[#202020] whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
            {message}
          </pre>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 text-xs font-semibold border border-[#202020]/20 text-[#202020] rounded-md hover:bg-[#F5F5F5] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? 'Copied' : copyButtonLabel}
          </button>

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                onSendClick?.();
                onClose();
              }}
              className="px-5 py-2.5 text-xs font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#B58B61]" />
              {primaryButtonLabel}
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Configure WhatsApp Business number in Admin → System Settings to enable sending"
              className="px-5 py-2.5 text-xs font-semibold bg-[#202020]/35 text-[#FFFFFF] rounded-md cursor-not-allowed inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {primaryButtonLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
