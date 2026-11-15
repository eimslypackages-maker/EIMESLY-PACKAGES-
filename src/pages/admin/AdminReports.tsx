import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import {
  AVAILABILITY_LABELS,
  downloadCsv,
  formatDate,
  formatRwf,
  QUOTATION_STATUS_LABELS,
} from '../../lib/format';
import { AdminLayout } from './AdminLayout';
import { WhatsAppAnalyticsDashboard } from '../../components/admin/WhatsAppAnalyticsDashboard';
import type { Order, Quotation } from '../../shared/types';

interface ReportsResponse {
  summary: {
    totalOrders: number;
    paidOrdersCount: number;
    confirmedPaidRevenue: number;
    recordedSales: number;
    outstandingAmount: number;
    wholesaleCount: number;
    wholesaleValue: number;
    retailCount: number;
    retailValue: number;
    totalQuotations: number;
    acceptedQuotations: number;
    lowStockCount: number;
    outOfStockCount: number;
    inventoryValuation: number;
    totalWhatsappClicks: number;
    productOrderClicks: number;
    wholesaleQuoteClicks: number;
    whatsappContactClicks: number;
  };
  productSales: Array<{
    name: string;
    sku: string;
    units: number;
    revenue: number;
  }>;
  categorySales: Array<{
    category: string;
    units: number;
    revenue: number;
  }>;
  whatsappTopProducts: Array<{
    productName: string;
    sku: string;
    orderClicks: number;
    quoteClicks: number;
    totalClicks: number;
    totalQuantityRequested: number;
  }>;
  whatsappRecentClicks: Array<{
    id: number;
    eventType: string;
    productId: number | null;
    productName: string;
    sku: string;
    selectedSize: string;
    quantity: number;
    sourcePage: string;
    createdAt: string;
  }>;
  outstandingOrders: Order[];
  monthlySeries: Array<{
    month: string;
    orders: number;
    retail: number;
    wholesale: number;
  }>;
  inventoryReport: Array<{
    id: number;
    name: string;
    sku: string;
    category: string;
    stockQuantity: number;
    lowStockThreshold: number;
    costPrice: number | null;
    unitPrice: number | null;
    valuation: number;
    availabilityStatus: string;
  }>;
  quotationsReport: Quotation[];
  customersSummary: Array<{
    customerName: string;
    businessName: string;
    phone: string;
    orderCount: number;
    totalSpend: number;
  }>;
}

export function AdminReports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preset, setPreset] = useState<
    'all' | 'daily' | 'weekly' | 'monthly' | 'annual'
  >('all');
  const [activeReport, setActiveReport] = useState<
    | 'sales'
    | 'whatsapp'
    | 'inventory'
    | 'quotations'
    | 'customers'
  >('sales');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useDocumentMeta('Reports & Analytics | Eimesly Packages Admin');

  const applyPreset = (p: typeof preset) => {
    setPreset(p);
    const now = new Date();
    const toIso = now.toISOString().slice(0, 10);
    if (p === 'all') {
      setFrom('');
      setTo('');
    } else if (p === 'daily') {
      setFrom(toIso);
      setTo(toIso);
    } else if (p === 'weekly') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      setFrom(start.toISOString().slice(0, 10));
      setTo(toIso);
    } else if (p === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(start.toISOString().slice(0, 10));
      setTo(toIso);
    } else if (p === 'annual') {
      const start = new Date(now.getFullYear(), 0, 1);
      setFrom(start.toISOString().slice(0, 10));
      setTo(toIso);
    }
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    apiFetch<ReportsResponse>(`/api/admin/reports?${params.toString()}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [from, to]);

  const exportActiveCsv = () => {
    if (!data) return;
    if (activeReport === 'sales') {
      downloadCsv(
        `eimesly-sales-report-${preset}.csv`,
        ['Product Name', 'SKU', 'Units Ordered', 'Recorded Revenue (RWF)'],
        data.productSales.map((p) => [p.name, p.sku, p.units, p.revenue])
      );
    } else if (activeReport === 'whatsapp') {
      downloadCsv(
        `eimesly-whatsapp-enquiries-${preset}.csv`,
        [
          'Product Name',
          'SKU',
          'Order Now Clicks',
          'Wholesale Quote Clicks',
          'Total Clicks',
          'Total Quantity Requested',
        ],
        data.whatsappTopProducts.map((w) => [
          w.productName,
          w.sku,
          w.orderClicks,
          w.quoteClicks,
          w.totalClicks,
          w.totalQuantityRequested,
        ])
      );
    } else if (activeReport === 'inventory') {
      downloadCsv(
        'eimesly-inventory-valuation.csv',
        ['SKU', 'Product', 'Category', 'Stock', 'Status', 'Valuation (RWF)'],
        data.inventoryReport.map((i) => [
          i.sku,
          i.name,
          i.category,
          i.stockQuantity,
          i.availabilityStatus,
          i.valuation,
        ])
      );
    } else if (activeReport === 'quotations') {
      downloadCsv(
        `eimesly-quotations-${preset}.csv`,
        ['Quote #', 'Customer', 'Company', 'Product', 'Qty', 'Status', 'Proposed Total'],
        data.quotationsReport.map((q) => [
          q.quoteNumber,
          q.customerName,
          q.companyName,
          q.productInterested,
          q.proposedQuantity ?? q.estimatedQuantity,
          q.status,
          q.proposedTotal ?? '',
        ])
      );
    } else if (activeReport === 'customers') {
      downloadCsv(
        `eimesly-customers-report-${preset}.csv`,
        ['Customer', 'Business', 'Phone', 'Orders', 'Total Spend (RWF)'],
        data.customersSummary.map((c) => [
          c.customerName,
          c.businessName,
          c.phone,
          c.orderCount,
          c.totalSpend,
        ])
      );
    }
  };

  const s = data?.summary;
  const q = search.trim().toLowerCase();

  return (
    <AdminLayout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Date Range & Presets */}
        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', 'All Time'],
                ['daily', 'Daily Sales'],
                ['weekly', 'Weekly Sales'],
                ['monthly', 'Monthly Sales'],
                ['annual', 'Annual Sales'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                  preset === id
                    ? 'bg-[#202020] text-[#FFFFFF]'
                    : 'bg-[#F5F5F5] text-[#202020]/80 hover:bg-[#F3EEE6]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-[#202020]/20 rounded-md"
            />
            <span className="text-xs text-[#202020]/50">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-[#202020]/20 rounded-md"
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded-md inline-flex items-center gap-1.5 hover:bg-[#F5F5F5]"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={exportActiveCsv}
              className="px-3.5 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded-md inline-flex items-center gap-1.5 hover:bg-[#F5F5F5]"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Report Type Switcher + Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['sales', 'Retail, Wholesale & Product/Category Sales'],
                ['whatsapp', 'WhatsApp Enquiries & Outstanding Balances'],
                ['inventory', 'Inventory & Valuation'],
                ['quotations', 'Quotations Report'],
                ['customers', 'Customer Report'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveReport(id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md border ${
                  activeReport === id
                    ? 'bg-[#B58B61] text-[#FFFFFF] border-[#B58B61]'
                    : 'bg-[#FFFFFF] text-[#202020] border-[#202020]/15 hover:bg-[#F5F5F5]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter report rows..."
            className="w-56 px-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#202020]/15 rounded-md"
          />
        </div>

        {loading || !s || !data ? (
          <div className="h-48 bg-[#FFFFFF] rounded-lg animate-pulse" />
        ) : (
          <>
            {/* Executive Summary Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
                <p className="text-xs text-[#202020]/60">Confirmed Paid Revenue</p>
                <p className="mt-1.5 text-xl font-bold tabular-nums">
                  {formatRwf(s.confirmedPaidRevenue)}
                </p>
                <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                  {s.paidOrdersCount} paid of {s.totalOrders} recorded orders
                </p>
              </div>
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
                <p className="text-xs text-[#202020]/60">Outstanding Balances</p>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-amber-700">
                  {formatRwf(s.outstandingAmount)}
                </p>
                <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                  Recorded sales: {formatRwf(s.recordedSales)}
                </p>
              </div>
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
                <p className="text-xs text-[#202020]/60">Wholesale vs Retail</p>
                <p className="mt-1.5 text-sm font-bold tabular-nums">
                  Wholesale: {s.wholesaleCount} ({formatRwf(s.wholesaleValue)})
                </p>
                <p className="mt-1 text-xs font-medium text-[#202020]/70 tabular-nums">
                  Retail: {s.retailCount} ({formatRwf(s.retailValue)})
                </p>
              </div>
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
                <p className="text-xs text-[#202020]/60">WhatsApp Clicks & Inventory</p>
                <p className="mt-1.5 text-sm font-bold tabular-nums">
                  WhatsApp Clicks: {s.totalWhatsappClicks}
                </p>
                <p className="mt-1 text-xs text-[#202020]/65 tabular-nums">
                  Valuation: {formatRwf(s.inventoryValuation)} · Low: {s.lowStockCount}
                </p>
              </div>
            </div>

            {activeReport === 'sales' && (
              <>
                {/* Monthly Wholesale vs Retail Chart */}
                <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#202020]">
                      Monthly Retail vs Wholesale Revenue Trend
                    </h2>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-[#202020] rounded-sm" /> Wholesale
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-[#B58B61] rounded-sm" /> Retail
                      </span>
                    </div>
                  </div>
                  <div className="h-44 flex items-end gap-4 pt-2">
                    {data.monthlySeries.map((ms) => {
                      const maxMonth = Math.max(
                        1,
                        ...data.monthlySeries.map((x) => x.retail + x.wholesale)
                      );
                      const wPct = Math.round((ms.wholesale / maxMonth) * 100);
                      const rPct = Math.round((ms.retail / maxMonth) * 100);
                      return (
                        <div
                          key={ms.month}
                          className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                        >
                          <div className="w-full max-w-[44px] flex flex-col justify-end h-32 gap-0.5">
                            {ms.retail > 0 && (
                              <div
                                className="w-full bg-[#B58B61] rounded-t"
                                style={{ height: `${Math.max(4, rPct)}%` }}
                                title={`Retail: ${formatRwf(ms.retail)}`}
                              />
                            )}
                            {ms.wholesale > 0 && (
                              <div
                                className="w-full bg-[#202020]"
                                style={{ height: `${Math.max(4, wPct)}%` }}
                                title={`Wholesale: ${formatRwf(ms.wholesale)}`}
                              />
                            )}
                            {ms.retail === 0 && ms.wholesale === 0 && (
                              <div className="w-full bg-[#F5F5F5] h-1" />
                            )}
                          </div>
                          <span className="text-[11px] text-[#202020]/65">
                            {ms.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Product & Category Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[#202020]/10">
                      <h2 className="text-sm font-bold text-[#202020]">
                        Product Performance Report
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#F5F5F5] border-b border-[#202020]/10 text-[#202020]/65">
                            <th className="py-2.5 px-4">Product</th>
                            <th className="py-2.5 px-4 text-right">Units</th>
                            <th className="py-2.5 px-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#202020]/10">
                          {data.productSales
                            .filter(
                              (p) =>
                                !q ||
                                p.name.toLowerCase().includes(q) ||
                                p.sku.toLowerCase().includes(q)
                            )
                            .map((p, i) => (
                              <tr key={i}>
                                <td className="py-2.5 px-4 font-medium">
                                  {p.name}
                                </td>
                                <td className="py-2.5 px-4 text-right tabular-nums">
                                  {p.units}
                                </td>
                                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                                  {formatRwf(p.revenue)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[#202020]/10">
                      <h2 className="text-sm font-bold text-[#202020]">
                        Category Performance Report
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#F5F5F5] border-b border-[#202020]/10 text-[#202020]/65">
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4 text-right">Units</th>
                            <th className="py-2.5 px-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#202020]/10">
                          {data.categorySales
                            .filter(
                              (c) => !q || c.category.toLowerCase().includes(q)
                            )
                            .map((c, i) => (
                              <tr key={i}>
                                <td className="py-2.5 px-4 font-medium">
                                  {c.category}
                                </td>
                                <td className="py-2.5 px-4 text-right tabular-nums">
                                  {c.units}
                                </td>
                                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                                  {formatRwf(c.revenue)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeReport === 'whatsapp' && (
              <div className="space-y-6">
                <WhatsAppAnalyticsDashboard embedded />

                {/* Outstanding Balances on Manually Recorded Orders */}
                <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#202020]/10 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-[#202020]">
                      Outstanding Balances on Recorded Orders
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          `eimesly-outstanding-balances-${preset}.csv`,
                          ['Order #', 'Date', 'Customer', 'Payment Status', 'Amount (RWF)'],
                          data.outstandingOrders.map((o) => [
                            o.orderNumber,
                            o.createdAt,
                            o.customerName,
                            o.paymentStatus,
                            o.totalAmount,
                          ])
                        )
                      }
                      className="px-3 py-1 text-xs font-semibold border border-[#202020]/20 rounded hover:bg-[#F5F5F5] inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Balances CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#F5F5F5] border-b border-[#202020]/10 text-[#202020]/65">
                          <th className="py-2.5 px-4">Order #</th>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Customer</th>
                          <th className="py-2.5 px-4">Payment Status</th>
                          <th className="py-2.5 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#202020]/10">
                        {data.outstandingOrders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-[#202020]/60">
                              No outstanding balances on recorded orders.
                            </td>
                          </tr>
                        ) : (
                          data.outstandingOrders
                            .filter(
                              (o) =>
                                !q ||
                                o.orderNumber.toLowerCase().includes(q) ||
                                o.customerName.toLowerCase().includes(q)
                            )
                            .map((o) => (
                              <tr key={o.id}>
                                <td className="py-2.5 px-4 font-mono font-semibold">
                                  {o.orderNumber}
                                </td>
                                <td className="py-2.5 px-4 tabular-nums">
                                  {formatDate(o.createdAt)}
                                </td>
                                <td className="py-2.5 px-4">{o.customerName}</td>
                                <td className="py-2.5 px-4 capitalize">
                                  {o.paymentStatus.replace('_', ' ')}
                                </td>
                                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                                  {formatRwf(o.totalAmount)}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeReport === 'inventory' && (
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#202020]/10 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#202020]">
                    Inventory Stock & Valuation Report
                  </h2>
                  <span className="text-xs font-bold tabular-nums">
                    Total Valuation: {formatRwf(s.inventoryValuation)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F5F5F5] border-b border-[#202020]/10 text-[#202020]/65">
                        <th className="py-2.5 px-4">SKU</th>
                        <th className="py-2.5 px-4">Product</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Stock</th>
                        <th className="py-2.5 px-4 text-right">Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#202020]/10">
                      {data.inventoryReport
                        .filter(
                          (item) =>
                            !q ||
                            item.name.toLowerCase().includes(q) ||
                            item.sku.toLowerCase().includes(q)
                        )
                        .map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5 px-4 font-mono">{item.sku}</td>
                            <td className="py-2.5 px-4 font-medium">{item.name}</td>
                            <td className="py-2.5 px-4">{item.category}</td>
                            <td className="py-2.5 px-4">
                              {AVAILABILITY_LABELS[item.availabilityStatus] ||
                                item.availabilityStatus}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                              {item.stockQuantity}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                              {formatRwf(item.valuation)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === 'quotations' && (
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#202020]/10">
                  <h2 className="text-sm font-bold text-[#202020]">
                    Quotations Pipeline Report ({data.quotationsReport.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F5F5F5] border-b border-[#202020]/10 text-[#202020]/65">
                        <th className="py-2.5 px-4">Quote #</th>
                        <th className="py-2.5 px-4">Customer / Company</th>
                        <th className="py-2.5 px-4">Product</th>
                        <th className="py-2.5 px-4 text-right">Qty</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Proposed Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#202020]/10">
                      {data.quotationsReport
                        .filter(
                          (qt) =>
                            !q ||
                            qt.quoteNumber.toLowerCase().includes(q) ||
                            qt.customerName.toLowerCase().includes(q) ||
                            qt.productInterested.toLowerCase().includes(q)
                        )
                        .map((qt) => (
                          <tr key={qt.id}>
                            <td className="py-2.5 px-4 font-mono font-semibold">
                              {qt.quoteNumber}
                            </td>
                            <td className="py-2.5 px-4">
                              {qt.customerName}
                              {qt.companyName ? ` (${qt.companyName})` : ''}
                            </td>
                            <td className="py-2.5 px-4">{qt.productInterested}</td>
                            <td className="py-2.5 px-4 text-right tabular-nums">
                              {qt.proposedQuantity ?? qt.estimatedQuantity}
                            </td>
                            <td className="py-2.5 px-4">
                              {QUOTATION_STATUS_LABELS[qt.status] || qt.status}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                              {qt.proposedTotal !== null
                                ? formatRwf(qt.proposedTotal)
                                : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === 'customers' && (
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#202020]/10">
                  <h2 className="text-sm font-bold text-[#202020]">
                    Customer Purchasing Report ({data.customersSummary.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F5F5F5] border-b border-[#202020]/10 text-[#202020]/65">
                        <th className="py-2.5 px-4">Customer</th>
                        <th className="py-2.5 px-4">Business</th>
                        <th className="py-2.5 px-4">Phone</th>
                        <th className="py-2.5 px-4 text-right">Orders</th>
                        <th className="py-2.5 px-4 text-right">Total Spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#202020]/10">
                      {data.customersSummary
                        .filter(
                          (c) =>
                            !q ||
                            c.customerName.toLowerCase().includes(q) ||
                            c.businessName.toLowerCase().includes(q) ||
                            c.phone.toLowerCase().includes(q)
                        )
                        .map((c, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-4 font-medium">
                              {c.customerName}
                            </td>
                            <td className="py-2.5 px-4">{c.businessName || '—'}</td>
                            <td className="py-2.5 px-4">{c.phone || '—'}</td>
                            <td className="py-2.5 px-4 text-right tabular-nums">
                              {c.orderCount}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                              {formatRwf(c.totalSpend)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
