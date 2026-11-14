export function formatRwf(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Price on Request';
  return `RWF ${amount.toLocaleString('en-US')}`;
}

export function formatDate(iso: string | Date | undefined | null): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | Date | undefined | null): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AVAILABILITY_LABELS: Record<string, string> = {
  in_stock: 'In Stock',
  made_to_order: 'Made to Order',
  out_of_stock: 'Out of Stock',
  sample_listing: 'Sample Catalogue Item',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new_order: 'New Order',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready_for_collection: 'Ready for Collection',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  pending: 'Pending',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  refunded: 'Refunded',
};

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  under_review: 'Under Review',
  quotation_sent: 'Quotation Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  completed: 'Completed',
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  business_manager: 'Business Manager',
  sales_staff: 'Sales Staff',
  inventory_manager: 'Inventory Manager',
  customer: 'Customer',
};

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
