import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderTree,
  MessageCircle,
  Package,
  ShoppingBag,
  Users,
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
    totalCustomers: number;
    retailOrders: number;
    wholesaleOrders: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalEnquiries: number;
    pendingQuotations: number;
    confirmedPaidRevenue: number;
    recordedSalesTotal: number;
    outstandingBalances: number;
    lowStockCount: number;
    totalEnquiryClicks: number;
    productOrderClicks: number;
    wholesaleQuoteClicks: number;
    whatsappContactClicks: number;
  };
  salesSeries: Array<{ date: string; sales: number; orders: number }>;
  dailyClickSeries: Array<{
    date: string;
    clicks: number;
    productOrders: number;
    wholesaleQuotes: number;
    contacts: number;
  }>;
  monthlySales: Array<{ month: string; sales: number; orders: number }>;
  wholesaleVsRetail: {
    retailOrders: number;
    retailRevenue: number;
    wholesaleOrders: number;
    wholesaleRevenue: number;
  };
  popularEnquiredProducts: Array<{
    productName: string;
    sku: string;
    orderClicks: number;
    quoteClicks: number;
    totalClicks: number;
  }>;
  inventoryStatus: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    madeToOrder: number;
    sampleListing: number;
  };
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

  useDocumentMeta('Admin Control Dashboard | Eimesly Packages');

  useEffect(() => {
    apiFetch<OverviewResponse>('/api/admin/overview')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const m = data?.metrics;
  const maxDailySales = Math.max(
    1,
    ...(data?.salesSeries.map((s) => s.sales) || [1])
  );
  const maxMonthlySales = Math.max(
    1,
    ...(data?.monthlySales.map((s) => s.sales) || [1])
  );
  const maxDailyClicks = Math.max(
    1,
    ...(data?.dailyClickSeries.map((c) => c.clicks) || [1])
  );

  const totalTypeRev =
    (data?.wholesaleVsRetail.retailRevenue || 0) +
    (data?.wholesaleVsRetail.wholesaleRevenue || 0);
  const wholesaleShare =
    totalTypeRev > 0
      ? Math.round(
          ((data?.wholesaleVsRetail.wholesaleRevenue || 0) / totalTypeRev) * 100
        )
      : 0;
  const retailShare = totalTypeRev > 0 ? 100 - wholesaleShare : 0;

  const invTotal = data
    ? Math.max(
        1,
        data.inventoryStatus.inStock +
          data.inventoryStatus.lowStock +
          data.inventoryStatus.outOfStock +
          data.inventoryStatus.madeToOrder +
          data.inventoryStatus.sampleListing
      )
    : 1;

  return (
    <AdminLayout title="Dashboard Overview">
      {loading || !data || !m ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-[#FFFFFF] rounded-lg border border-[#202020]/10 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* 12 Primary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Total Products</span>
                <Package className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.totalProducts}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                {m.activeProducts} active on storefront
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Total Categories</span>
                <FolderTree className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.totalCategories}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60">
                Catalogue classifications
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Total Customers</span>
                <Users className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.totalCustomers}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60">
                Recorded & B2B buyers
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Low-Stock Alerts</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-700 tabular-nums">
                {m.lowStockCount}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60">
                Items at or below threshold
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Retail Orders</span>
                <ShoppingBag className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.retailOrders}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                {formatRwf(data.wholesaleVsRetail.retailRevenue)}
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Wholesale Orders</span>
                <ClipboardList className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.wholesaleOrders}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                {formatRwf(data.wholesaleVsRetail.wholesaleRevenue)}
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Pending Orders</span>
                <ClipboardList className="w-4 h-4 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.pendingOrders}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                Of {m.totalOrders} manually recorded orders
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Completed Orders</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.completedOrders}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60">
                Delivered or collected
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Confirmed Paid Revenue</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#202020] tabular-nums">
                {formatRwf(m.confirmedPaidRevenue)}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                {formatRwf(m.recordedSalesTotal)} recorded order total
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Outstanding Balances</span>
                <ClipboardList className="w-4 h-4 text-amber-600" />
              </div>
              <p className="mt-2 text-xl font-bold text-amber-700 tabular-nums">
                {formatRwf(m.outstandingBalances)}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60">
                Recorded orders awaiting payment
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Pending Quotations</span>
                <FileText className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.pendingQuotations}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60">
                Open RFQ pipeline
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>WhatsApp Clicks (Intent)</span>
                <MessageCircle className="w-4 h-4 text-[#16A34A]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {m.totalEnquiryClicks}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                {m.productOrderClicks} order · {m.wholesaleQuoteClicks} quote · {m.whatsappContactClicks} chat
              </p>
            </div>
          </div>

          {/* Daily Sales & Monthly Sales Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-[#202020]">
                    Recorded Orders Value (Last 7 Days)
                  </h2>
                  <p className="text-xs text-[#202020]/60">
                    Manually logged WhatsApp & B2B orders in RWF
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/reports')}
                  className="text-xs font-semibold text-[#B58B61] inline-flex items-center gap-1 hover:underline"
                >
                  Reports <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="h-44 flex items-end gap-3 pt-2">
                {data.salesSeries.map((pt) => {
                  const pct = Math.max(
                    4,
                    Math.round((pt.sales / maxDailySales) * 100)
                  );
                  return (
                    <div
                      key={pt.date}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                    >
                      <span className="text-[10px] font-mono text-[#202020]/65 tabular-nums">
                        {pt.orders > 0 ? `${pt.orders}` : ''}
                      </span>
                      <div
                        className="w-full max-w-[38px] bg-[#B58B61] rounded-t transition-all"
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

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-[#202020]">
                    Monthly Confirmed Sales (Last 6 Months)
                  </h2>
                  <p className="text-xs text-[#202020]/60">
                    Monthly non-cancelled recorded order revenue
                  </p>
                </div>
                <span className="text-xs font-mono text-[#202020]/60">RWF</span>
              </div>
              <div className="h-44 flex items-end gap-3 pt-2">
                {data.monthlySales.map((pt) => {
                  const pct = Math.max(
                    4,
                    Math.round((pt.sales / maxMonthlySales) * 100)
                  );
                  return (
                    <div
                      key={pt.month}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                    >
                      <span className="text-[10px] font-mono text-[#202020]/65 tabular-nums">
                        {pt.orders > 0 ? `${pt.orders}` : ''}
                      </span>
                      <div
                        className="w-full max-w-[44px] bg-[#202020] rounded-t transition-all"
                        style={{ height: `${pt.sales > 0 ? pct : 4}%` }}
                        title={`${pt.month}: ${formatRwf(pt.sales)} (${pt.orders} orders)`}
                      />
                      <span className="text-[11px] text-[#202020]/60 tabular-nums">
                        {pt.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Wholesale vs Retail, WhatsApp Click Activity, Inventory Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#202020]">
                Wholesale vs Retail Recorded Sales
              </h2>
              <div className="h-3 w-full rounded-full bg-[#F5F5F5] overflow-hidden flex">
                <div
                  className="bg-[#202020] h-full"
                  style={{ width: `${wholesaleShare}%` }}
                  title={`Wholesale: ${wholesaleShare}%`}
                />
                <div
                  className="bg-[#B58B61] h-full"
                  style={{ width: `${retailShare}%` }}
                  title={`Retail: ${retailShare}%`}
                />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#202020]" />
                    Wholesale ({data.wholesaleVsRetail.wholesaleOrders} orders)
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatRwf(data.wholesaleVsRetail.wholesaleRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#B58B61]" />
                    Retail ({data.wholesaleVsRetail.retailOrders} orders)
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatRwf(data.wholesaleVsRetail.retailRevenue)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#202020]">
                    WhatsApp Activity (Last 7 Days)
                  </h2>
                  <p className="text-[11px] text-[#202020]/55">
                    Storefront Order Now & Quote button clicks
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/reports')}
                  className="text-xs font-semibold text-[#B58B61]"
                >
                  Details
                </button>
              </div>
              <div className="h-24 flex items-end gap-2 pt-2">
                {data.dailyClickSeries.map((pt) => {
                  const pct = Math.max(
                    6,
                    Math.round((pt.clicks / maxDailyClicks) * 100)
                  );
                  return (
                    <div
                      key={pt.date}
                      className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                    >
                      <span className="text-[10px] font-mono text-[#202020]/65 tabular-nums">
                        {pt.clicks > 0 ? pt.clicks : ''}
                      </span>
                      <div
                        className="w-full max-w-[26px] bg-[#16A34A] rounded-t"
                        style={{ height: `${pt.clicks > 0 ? pct : 6}%` }}
                        title={`${pt.date}: ${pt.clicks} clicks (${pt.productOrders} product, ${pt.wholesaleQuotes} wholesale, ${pt.contacts} contact)`}
                      />
                      <span className="text-[10px] text-[#202020]/55 tabular-nums">
                        {pt.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {data.popularEnquiredProducts.length > 0 && (
                <div className="pt-2 border-t border-[#202020]/10 space-y-1.5">
                  <p className="text-[11px] font-semibold text-[#202020]/65">
                    Most Enquired Products on WhatsApp
                  </p>
                  {data.popularEnquiredProducts.slice(0, 3).map((ep, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs gap-2"
                    >
                      <span className="truncate text-[#202020]">
                        {ep.productName}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-[#202020]/80 shrink-0">
                        {ep.totalClicks} clicks
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#202020]">
                  Inventory Status
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/admin/inventory')}
                  className="text-xs font-semibold text-[#B58B61]"
                >
                  Inventory
                </button>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  {
                    label: 'Healthy In Stock',
                    count: data.inventoryStatus.inStock,
                    color: 'bg-emerald-700',
                  },
                  {
                    label: 'Low Stock Alert',
                    count: data.inventoryStatus.lowStock,
                    color: 'bg-amber-600',
                  },
                  {
                    label: 'Out of Stock',
                    count: data.inventoryStatus.outOfStock,
                    color: 'bg-red-600',
                  },
                  {
                    label: 'Made to Order',
                    count: data.inventoryStatus.madeToOrder,
                    color: 'bg-[#B58B61]',
                  },
                  {
                    label: 'Sample Catalogue Listings',
                    count: data.inventoryStatus.sampleListing,
                    color: 'bg-[#202020]/40',
                  },
                ].map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{row.label}</span>
                      <span className="font-semibold tabular-nums">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#F5F5F5] rounded overflow-hidden">
                      <div
                        className={`h-full ${row.color}`}
                        style={{
                          width: `${Math.round((row.count / invTotal) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Best Sellers, Recent Orders & Low Stock / Enquiries */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#202020]">
                Best-Selling Recorded Products
              </h2>
              {data.bestSellingProducts.length === 0 ? (
                <p className="text-xs text-[#202020]/60">
                  No confirmed orders recorded yet.
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
                          {bs.units} units recorded
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

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#202020]">
                  Recent Recorded Orders
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
                <p className="text-xs text-[#202020]/60">No orders recorded yet.</p>
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
                  Low-Stock Items & Recent Enquiries
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/admin/enquiries')}
                  className="text-xs font-semibold text-[#B58B61]"
                >
                  Enquiries
                </button>
              </div>
              {data.lowStockProducts.length > 0 && (
                <div className="bg-[#F3EEE6] rounded p-3 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    Low Stock Alerts
                  </p>
                  {data.lowStockProducts.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-xs text-[#202020]"
                    >
                      <span className="truncate pr-2">{p.name}</span>
                      <span className="font-bold text-amber-800 tabular-nums shrink-0">
                        {p.stockQuantity} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {data.recentEnquiries.length === 0 ? (
                <p className="text-xs text-[#202020]/60">No enquiries yet.</p>
              ) : (
                <div className="divide-y divide-[#202020]/10">
                  {data.recentEnquiries.slice(0, 4).map((eqItem) => (
                    <div key={eqItem.id} className="py-2 text-xs space-y-0.5">
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
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
