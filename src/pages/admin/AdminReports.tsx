import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import { downloadCsv, formatDate, formatRwf } from '../../lib/format';
import { AdminLayout } from './AdminLayout';
import type { Order } from '../../shared/types';

interface ReportsResponse {
  summary: {
    totalOrders: number;
    paidOrdersCount: number;
    verifiedRevenue: number;
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
  outstandingOrders: Order[];
}

export function AdminReports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preset, setPreset] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'annual'>('all');
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

  const exportSummary = () => {
    if (!data) return;
    downloadCsv(
      `eimesly-sales-report-${preset}.csv`,
      ['Product Name', 'SKU', 'Units Ordered', 'Recorded Revenue (RWF)'],
      data.productSales.map((p) => [p.name, p.sku, p.units, p.revenue])
    );
  };

  const s = data?.summary;

  return (
    <AdminLayout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Date Range & Presets */}
        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', 'All Time'],
                ['daily', 'Daily (Today)'],
                ['weekly', 'Weekly (7 Days)'],
                ['monthly', 'Monthly'],
                ['annual', 'Annual'],
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
              onClick={exportSummary}
              className="px-3.5 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded-md inline-flex items-center gap-1.5 hover:bg-[#F5F5F5]"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {loading || !s || !data ? (
          <div className="h-48 bg-[#FFFFFF] rounded-lg animate-pulse" />
        ) : (
          <>
            {/* Key Report Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
                <p className="text-xs text-[#202020]/60">Verified Paid Revenue</p>
                <p className="mt-1.5 text-xl font-bold tabular-nums">
                  {formatRwf(s.verifiedRevenue)}
                </p>
                <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                  {s.paidOrdersCount} paid of {s.totalOrders} orders
                </p>
              </div>
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
                <p className="text-xs text-[#202020]/60">Outstanding Payments</p>
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
                  W: {s.wholesaleCount} ({formatRwf(s.wholesaleValue)})
                </p>
                <p className="mt-1 text-xs font-medium text-[#202020]/70 tabular-nums">
                  R: {s.retailCount} ({formatRwf(s.retailValue)})
                </p>
              </div>
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
                <p className="text-xs text-[#202020]/60">Quotes & Inventory</p>
                <p className="mt-1.5 text-sm font-bold tabular-nums">
                  Quotes: {s.acceptedQuotations} / {s.totalQuotations} accepted
                </p>
                <p className="mt-1 text-xs text-[#202020]/65 tabular-nums">
                  Low stock: {s.lowStockCount} · Out: {s.outOfStockCount}
                </p>
              </div>
            </div>

            {/* Product & Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#202020]/10">
                  <h2 className="text-sm font-bold text-[#202020]">
                    Product Sales Report
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
                      {data.productSales.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-6 text-center text-[#202020]/60"
                          >
                            No product sales in selected period.
                          </td>
                        </tr>
                      ) : (
                        data.productSales.map((p, i) => (
                          <tr key={i}>
                            <td className="py-2.5 px-4 font-medium">{p.name}</td>
                            <td className="py-2.5 px-4 text-right tabular-nums">
                              {p.units}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                              {formatRwf(p.revenue)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#202020]/10">
                  <h2 className="text-sm font-bold text-[#202020]">
                    Category Sales Report
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
                      {data.categorySales.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-6 text-center text-[#202020]/60"
                          >
                            No category sales in selected period.
                          </td>
                        </tr>
                      ) : (
                        data.categorySales.map((c, i) => (
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Outstanding Payments */}
            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#202020]/10">
                <h2 className="text-sm font-bold text-[#202020]">
                  Outstanding Payments Report
                </h2>
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
                        <td
                          colSpan={5}
                          className="py-6 text-center text-[#202020]/60"
                        >
                          No outstanding payments.
                        </td>
                      </tr>
                    ) : (
                      data.outstandingOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="py-2.5 px-4 font-mono font-semibold">
                            {o.orderNumber}
                          </td>
                          <td className="py-2.5 px-4">
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
          </>
        )}
      </div>
    </AdminLayout>
  );
}
