import type {
  Product,
  WebsiteSettings,
  WhatsAppClickEventType,
} from '../shared/types';

export function sanitizeWhatsAppPhone(
  countryCode?: string,
  whatsappNumber?: string
): string {
  const rawNumber = String(whatsappNumber || '').replace(/[^0-9]/g, '');
  if (!rawNumber) return '';
  const cleanCode = String(countryCode || '250').replace(/[^0-9]/g, '');

  if (rawNumber.startsWith('0')) {
    const stripped = rawNumber.replace(/^0+/, '');
    return cleanCode ? `${cleanCode}${stripped}` : stripped;
  }

  if (cleanCode && rawNumber.startsWith(cleanCode) && rawNumber.length >= cleanCode.length + 7) {
    return rawNumber;
  }

  if (cleanCode && rawNumber.length <= 9) {
    return `${cleanCode}${rawNumber}`;
  }

  return rawNumber;
}

export function buildWhatsAppUrl(
  settings: Partial<WebsiteSettings> | null | undefined,
  message: string
): string {
  const phone = sanitizeWhatsAppPhone(
    settings?.whatsappCountryCode,
    settings?.whatsappNumber
  );
  if (!phone) return '';
  const trimmedMsg = message.trim();
  return trimmedMsg
    ? `https://wa.me/${phone}?text=${encodeURIComponent(trimmedMsg)}`
    : `https://wa.me/${phone}`;
}

export function derivePackagingUnits(
  product: Pick<Product, 'packagingQuantity'>
): string[] {
  const units: string[] = [];
  const pq = (product.packagingQuantity || '').toLowerCase();
  if (pq.includes('carton')) units.push('Carton');
  if (pq.includes('box')) units.push('Box');
  if (pq.includes('sleeve')) units.push('Sleeve');
  if (pq.includes('pack')) units.push('Pack');
  if (pq.includes('roll')) units.push('Roll');
  if (pq.includes('bundle')) units.push('Bundle');

  for (const fallback of ['Pack', 'Sleeve', 'Box', 'Carton', 'Unit']) {
    if (!units.includes(fallback)) units.push(fallback);
  }
  return units;
}

export function formatQuantityWithUnit(quantity: number, unit: string): string {
  const qty = Math.max(1, Math.round(quantity));
  if (qty === 1) return `1 ${unit}`;
  if (unit.toLowerCase() === 'box') return `${qty} Boxes`;
  return `${qty} ${unit}s`;
}

function isGreetingTemplate(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return (
    lower.startsWith('hello eimesly') ||
    lower.includes('i would like to order the following product') ||
    lower.includes('interested in purchasing your products in bulk')
  );
}

export interface OrderLineSummaryItem {
  name: string;
  sku?: string;
  selectedSize?: string;
  selectedVariation?: string;
  unitPrice: number | null | undefined;
  quantity: number;
  packagingUnit?: string;
}

export function formatOrderRwf(
  amount: number | null | undefined,
  currency = 'RWF'
): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return 'Price on Request';
  }
  const num = Number(amount);
  if (!Number.isFinite(num)) return 'Price on Request';
  return `${currency} ${Math.round(num).toLocaleString('en-US')}`;
}

export function calculateLineTotal(
  unitPrice: number | null | undefined,
  quantity: number
): number | null {
  if (unitPrice === null || unitPrice === undefined) return null;
  const price = Number(unitPrice);
  if (Number.isNaN(price) || !Number.isFinite(price)) return null;
  const safeQty = Math.max(1, Math.round(Number(quantity) || 1));
  return Math.round(price * safeQty);
}

export function calculateCombinedOrderTotal(
  items: Array<{ unitPrice: number | null | undefined; quantity: number }>
): number | null {
  if (!items.length) return null;
  let total = 0;
  for (const item of items) {
    const lineTotal = calculateLineTotal(item.unitPrice, item.quantity);
    if (lineTotal === null) {
      return null;
    }
    total += lineTotal;
  }
  return total;
}

export function calculatePricedItemsSubtotal(
  items: Array<{ unitPrice: number | null | undefined; quantity: number }>
): { pricedSubtotal: number; hasPricedItems: boolean; hasUnpricedItems: boolean } {
  let pricedSubtotal = 0;
  let hasPricedItems = false;
  let hasUnpricedItems = false;
  for (const item of items) {
    const lineTotal = calculateLineTotal(item.unitPrice, item.quantity);
    if (lineTotal === null) {
      hasUnpricedItems = true;
    } else {
      hasPricedItems = true;
      pricedSubtotal += lineTotal;
    }
  }
  return { pricedSubtotal, hasPricedItems, hasUnpricedItems };
}

export function formatOrderDateDDMMYYYY(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function buildMultiProductOrderMessage(params: {
  items: OrderLineSummaryItem[];
  orderDate?: string;
  currency?: string;
  template?: string;
}): string {
  const { items, orderDate, currency = 'RWF', template } = params;
  if (!items.length) return '';

  const effectiveDate = orderDate || formatOrderDateDDMMYYYY();
  const trimmedTemplate = template?.trim() || '';
  const closingNote =
    trimmedTemplate &&
    !isGreetingTemplate(trimmedTemplate) &&
    !trimmedTemplate.includes('{product}')
      ? trimmedTemplate
      : 'Please confirm availability and provide payment and delivery information.';

  const { pricedSubtotal, hasPricedItems, hasUnpricedItems } =
    calculatePricedItemsSubtotal(items);
  const combinedTotal = calculateCombinedOrderTotal(items);
  const grandTotalText = formatOrderRwf(combinedTotal, currency);

  const lines = [
    '*EIMESLY PACKAGES – CUSTOMER ORDER*',
    `*Order Date: ${effectiveDate}*`,
    '',
    'Item Name | Size | Qty | Unit Price | Total Price',
  ];

  items.forEach((item, index) => {
    const sizeText = item.selectedSize?.trim() || 'Standard';
    const variationSuffix = item.selectedVariation?.trim()
      ? ` (${item.selectedVariation.trim()})`
      : '';
    const skuSuffix = item.sku?.trim() ? ` [${item.sku.trim()}]` : '';
    const itemNameLabel = `${index + 1}. ${item.name}${variationSuffix}${skuSuffix}`;
    const qtyText = formatQuantityWithUnit(
      item.quantity,
      item.packagingUnit || 'Pack'
    );
    const unitPriceText = formatOrderRwf(item.unitPrice, currency);
    const lineTotal = calculateLineTotal(item.unitPrice, item.quantity);
    const totalPriceText = formatOrderRwf(lineTotal, currency);

    lines.push(
      `${itemNameLabel} | ${sizeText} | ${qtyText} | ${unitPriceText} | ${totalPriceText}`
    );
  });

  lines.push('');
  if (hasUnpricedItems && hasPricedItems) {
    lines.push(
      `Priced Items Subtotal: ${formatOrderRwf(pricedSubtotal, currency)}`
    );
  }
  lines.push(`*GRAND TOTAL: ${grandTotalText}*`);
  if (hasUnpricedItems) {
    lines.push(
      'Note: Items marked Price on Request will have the final order amount confirmed on WhatsApp.'
    );
  }
  lines.push('');
  lines.push(closingNote);
  lines.push('');
  lines.push('Thank you.');

  return lines.join('\n');
}

export function buildProductOrderMessage(params: {
  product: Pick<Product, 'name' | 'sku' | 'unitPrice'>;
  selectedSize?: string;
  selectedVariation?: string;
  quantity: number;
  packagingUnit?: string;
  orderDate?: string;
  currency?: string;
  template?: string;
  items?: OrderLineSummaryItem[];
}): string {
  const {
    product,
    selectedSize,
    selectedVariation,
    quantity,
    packagingUnit = 'Pack',
    orderDate,
    currency = 'RWF',
    template,
    items,
  } = params;

  const effectiveDate = orderDate || formatOrderDateDDMMYYYY();

  if (items && items.length > 0) {
    return buildMultiProductOrderMessage({
      items,
      orderDate: effectiveDate,
      currency,
      template,
    });
  }

  const safeQty = Math.max(1, Math.round(Number(quantity) || 1));
  const qtyText = formatQuantityWithUnit(safeQty, packagingUnit);
  const priceText = formatOrderRwf(product.unitPrice, currency);
  const computedTotal = calculateLineTotal(product.unitPrice, safeQty);
  const grandTotalText = formatOrderRwf(computedTotal, currency);

  if (template && template.includes('{product}')) {
    const rendered = template
      .replace(/\{product\}/g, product.name)
      .replace(/\{sku\}/g, product.sku)
      .replace(/\{size\}/g, selectedSize || 'Standard')
      .replace(/\{variation\}/g, selectedVariation || 'Standard')
      .replace(/\{quantity\}/g, qtyText)
      .replace(/\{price\}/g, priceText)
      .replace(/\{total\}/g, grandTotalText)
      .trim();

    if (template.includes('{total}')) {
      return rendered;
    }
    return `${rendered}\n\n*GRAND TOTAL: ${grandTotalText}*`;
  }

  return buildMultiProductOrderMessage({
    items: [
      {
        name: product.name,
        sku: product.sku,
        selectedSize,
        selectedVariation,
        unitPrice: product.unitPrice,
        quantity: safeQty,
        packagingUnit,
      },
    ],
    orderDate: effectiveDate,
    currency,
    template,
  });
}

export function buildWholesaleQuoteMessage(params: {
  productName?: string;
  requiredQuantity?: string | number;
  businessName?: string;
  location?: string;
  selectedSize?: string;
  template?: string;
}): string {
  const {
    productName = 'Packaging Supplies',
    requiredQuantity = 'Bulk Order',
    businessName,
    location,
    selectedSize,
    template,
  } = params;

  if (template && template.includes('{product}')) {
    return template
      .replace(/\{product\}/g, productName)
      .replace(/\{quantity\}/g, String(requiredQuantity))
      .replace(/\{business\}/g, businessName || 'Not specified')
      .replace(/\{location\}/g, location || 'Kigali, Rwanda')
      .trim();
  }

  const trimmedTemplate = template?.trim() || '';
  const closingNote =
    trimmedTemplate && !isGreetingTemplate(trimmedTemplate)
      ? trimmedTemplate
      : 'Please send me your wholesale prices and quotation.';

  const lines = [
    'Hello Eimesly Packages!',
    '',
    'I am interested in purchasing your products in bulk.',
    '',
    `Product: ${productName}${selectedSize ? ` (${selectedSize})` : ''}`,
    `Required Quantity: ${requiredQuantity}`,
    `Business Name: ${businessName?.trim() || 'Optional / Individual Buyer'}`,
    `Location: ${location?.trim() || 'Kigali, Rwanda'}`,
    '',
    closingNote,
    '',
    'Thank you.',
  ];

  return lines.join('\n');
}

export function buildGeneralEnquiryMessage(
  settings: Partial<WebsiteSettings> | null | undefined,
  customPrompt?: string
): string {
  if (customPrompt?.trim()) return customPrompt.trim();
  return (
    settings?.whatsappGeneralMessage?.trim() ||
    'Hello Eimesly Packages! I would like to enquire about your packaging products and availability.'
  );
}

export function trackWhatsAppClick(payload: {
  eventType: WhatsAppClickEventType;
  productId?: number | null;
  productName?: string;
  sku?: string;
  selectedSize?: string;
  quantity?: number;
  sourcePage: string;
}) {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/whatsapp-click', blob);
      return;
    }
    fetch('/api/analytics/whatsapp-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never interrupt user WhatsApp navigation
  }
}
