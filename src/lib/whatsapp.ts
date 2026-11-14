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

export function buildProductOrderMessage(params: {
  product: Pick<Product, 'name' | 'sku' | 'unitPrice'>;
  selectedSize?: string;
  selectedVariation?: string;
  quantity: number;
  packagingUnit?: string;
  currency?: string;
  template?: string;
}): string {
  const {
    product,
    selectedSize,
    selectedVariation,
    quantity,
    packagingUnit = 'Pack',
    currency = 'RWF',
    template,
  } = params;

  const qtyText = formatQuantityWithUnit(quantity, packagingUnit);
  const priceText =
    product.unitPrice !== null && product.unitPrice !== undefined
      ? `${currency} ${product.unitPrice.toLocaleString('en-US')}`
      : 'Price on Request';

  if (template && template.includes('{product}')) {
    return template
      .replace(/\{product\}/g, product.name)
      .replace(/\{sku\}/g, product.sku)
      .replace(/\{size\}/g, selectedSize || 'Standard')
      .replace(/\{variation\}/g, selectedVariation || 'Standard')
      .replace(/\{quantity\}/g, qtyText)
      .replace(/\{price\}/g, priceText);
  }

  const lines = [
    'Hello Eimesly Packages!',
    '',
    'I would like to order the following product:',
    '',
    `Product: ${product.name}`,
    `SKU: ${product.sku}`,
  ];

  if (selectedSize) {
    lines.push(`Size: ${selectedSize}`);
  }
  if (selectedVariation) {
    lines.push(`Variation: ${selectedVariation}`);
  }
  lines.push(`Quantity: ${qtyText}`);
  lines.push(`Displayed Retail Price: ${priceText}`);
  lines.push('');
  lines.push(
    template?.trim() ||
      'Please confirm availability and provide payment and delivery information.'
  );
  lines.push('');
  lines.push('Thank you.');

  return lines.join('\n');
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
      .replace(/\{location\}/g, location || 'Kigali, Rwanda');
  }

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
    template?.trim() || 'Please send me your wholesale prices and quotation.',
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
