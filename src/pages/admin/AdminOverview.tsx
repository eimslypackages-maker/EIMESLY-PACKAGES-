import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  FolderTree,
  Mail,
  Package,
} from 'lucide-react';
import { useApp, useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import {
  formatDate,
  formatRwf,
  ORDER_STATUS_LABELS,
} from '../../lib/format';
import { AdminLayout } from './AdminLayout';
import type { Enquiry, Order, Product } from '../../shared/types';

interface OverviewResponse {
  metrics: {
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalEnquiries: number;
    pendingQuotations: number;
    verifiedRevenue: number;
    recordedSalesTotal: number;
  };
  salesSeries: Array<{ date: string; sales: number; orders: number }>;
  recentOrders: Order[];
  recentEnquiries: Enquiry[];
  bestSellingProducts: Array<{
    productName: string;
    sku: string;
    units: number;
    revenue: number;
  }>;
  lowStockProducts: Product[];
}

export function AdminOverview() {
  const { navigate } = useApp();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useDocumentMeta('Admin Dashboard | Eimesly Packages');

  useEffect(() => {
    apiFetch<OverviewResponse>('/api/admin/overview')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const m = data?.metrics;
  const maxSales = Math.max(
    1,
    ...(data?.salesSeries.map((s) => s.sales) || [1])
  );

  return (
    <AdminLayout title="Dashboard Overview">
      {loading || !data || !m ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-[#FFFFFF] rounded-lg border border-[#202020]/10 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Products (Active / Total)</span>
                <Package className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.activeProducts} / {m.totalProducts}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                {m.totalCategories} categories
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Orders (Pending / Total)</span>
                <ClipboardList className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.pendingOrders} / {m.totalOrders}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                {m.completedOrders} completed
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Enquiries & Pending Quotes</span>
                <Mail className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.totalEnquiries} / {m.pendingQuotations}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60">
                Active leads & quote pipeline
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Verified Paid Revenue</span>
                <FolderTree className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {formatRwf(m.verifiedRevenue)}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                Recorded orders: {formatRwf(m.recordedSalesTotal)}
              </p>
            </div>
          </div>

          {/* Sales Overview Chart + Low Stock Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-[#202020]">
                    7-Day Verified Sales Overview
                  </h2>
                  <p className="text-xs text-[#202020]/60">
                    Based on confirmed paid orders in RWF
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/reports')}
                  className="text-xs font-semibold text-[#B58B61] inline-flex items-center gap-1 hover:underline"
                >
                  Full Reports
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-48 flex items-end gap-3 pt-4">
                {data.salesSeries.map((pt) => {
                  const pct = Math.max(
                    4,
                    Math.round((pt.sales / maxSales) * 100)
                  );
                  return (
                    <div
                      key={pt.date}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                    >
                      <span className="text-[11px] font-mono text-[#202020]/65 tabular-nums">
                        {pt.orders > 0 ? `${pt.orders} ord` : ''}
                      </span>
                      <div
                        className="w-full max-w-[42px] bg-[#B58B61] rounded-t transition-all"
                        style={{ height: `${pt.sales > 0 ? pct : 4}%` }}
                        title={`${pt.date}: ${formatRwf(pt.sales)} (${pt.orders} orders)`}
                      />
                      <span className="text-[11px] text-[#202020]/60 tabular-nums">
                        {pt.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#202020]">
                  Low-Stock Alerts
                </h2>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>

              {data.lowStockProducts.length === 0 ? (
                <p className="text-sm text-[#202020]/65">
                  No confirmed inventory items are currently below threshold.
                </p>
              ) : (
                <div className="divide-y divide-[#202020]/10">
                  {data.lowStockProducts.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="py-2.5 flex items-center justify-between text-sm"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-[#202020] truncate">
                          {p.name}
                        </p>
                        <p className="text-xs font-mono text-[#202020]/55">
                          {p.sku}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-amber-700 tabular-nums shrink-0">
                        {p.stockQuantity} left
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate('/admin/inventory')}
                className="w-full py-2 text-xs font-semibold border border-[#202020]/20 rounded-md hover:bg-[#F5F5F5]"
              >
                Manage Inventory
              </button>
            </div>
          </div>

          {/* Recent Orders, Enquiries, Best Sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#202020]">
                  Recent Orders
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/admin/orders')}
                  className="text-xs font-semibold text-[#B58B61]"
                >
                  View All
                </button>
              </div>
              {data.recentOrders.length === 0 ? (
                <p className="text-xs text-[#202020]/60">No orders yet.</p>
              ) : (
                <div className="divide-y divide-[#202020]/10">
                  {data.recentOrders.map((o) => (
                    <div
                      key={o.id}
                      className="py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-mono font-semibold text-[#202020]">
                          {o.orderNumber}
                        </p>
                        <p className="text-[#202020]/65 truncate">
                          {o.customerName} ·{' '}
                          {ORDER_STATUS_LABELS[o.orderStatus] || o.orderStatus}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums shrink-0">
                        {o.totalAmount > 0 ? formatRwf(o.totalAmount) : 'Quote'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#202020]">
                  Recent Enquiries
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/admin/enquiries')}
                  className="text-xs font-semibold text-[#B58B61]"
                >
                  View All
                </button>
              </div>
              {data.recentEnquiries.length === 0 ? (
                <p className="text-xs text-[#202020]/60">No enquiries yet.</p>
              ) : (
                <div className="divide-y divide-[#202020]/10">
                  {data.recentEnquiries.map((eqItem) => (
                    <div key={eqItem.id} className="py-2.5 text-xs space-y-0.5">
                      <p className="font-semibold text-[#202020] truncate">
                        {eqItem.subject}
                      </p>
                      <p className="text-[#202020]/65">
                        {eqItem.fullName} · {formatDate(eqItem.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#202020]">
                Best-Selling Products
              </h2>
              {data.bestSellingProducts.length === 0 ? (
                <p className="text-xs text-[#202020]/60">
                  No product sales recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-[#202020]/10">
                  {data.bestSellingProducts.map((bs, idx) => (
                    <div
                      key={idx}
                      className="py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#202020] truncate">
                          {bs.productName}
                        </p>
                        <p className="text-[#202020]/55 tabular-nums">
                          {bs.units} units ordered
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums shrink-0">
                        {formatRwf(bs.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
