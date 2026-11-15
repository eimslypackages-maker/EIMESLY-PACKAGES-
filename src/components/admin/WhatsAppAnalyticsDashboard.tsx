import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  FolderTree,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import {
  AVAILABILITY_LABELS,
  downloadCsv,
  formatDateTime,
  formatRwf,
} from '../../lib/format';
import type { WhatsAppClickEventType } from '../../shared/types';

export interface WhatsAppAnalyticsResponse {
  summary: {
    totalClicks: number;
    productOrderClicks: number;
    wholesaleQuoteClicks: number;
    whatsappContactClicks: number;
    totalRequestedQuantity: number;
    uniqueProductsEnquired: number;
    topCategoryName: string;
    topCategoryClicks: number;
    topProductName: string;
    topProductClicks: number;
    confirmedOrderRevenue: number;
    confirmedOrderUnits: number;
  };
  dailyTrends: Array<{
    date: string;
    label: string;
    productOrder: number;
    wholesaleQuote: number;
    contact: number;
    total: number;
    requestedQty: number;
  }>;
  popularCategories: Array<{
    categoryId: number | null;
    categoryName: string;
    totalClicks: number;
    productOrderClicks: number;
    wholesaleQuoteClicks: number;
    totalQuantityRequested: number;
    uniqueProducts: number;
    sharePercent: number;
    recordedUnitsSold: number;
    recordedRevenue: number;
  }>;
  topEnquiredProducts: Array<{
    productId: number | null;
    productName: string;
    sku: string;
    categoryName: string;
    unitPrice: number | null;
    stockQuantity: number;
    availabilityStatus: string;
    orderClicks: number;
    quoteClicks: number;
    totalClicks: number;
    totalQuantityRequested: number;
    avgQuantityPerClick: number;
    topSizes: string[];
    recordedUnitsSold: number;
    recordedRevenue: number;
  }>;
  sourceBreakdown: Array<{
    source: string;
    clicks: number;
    sharePercent: number;
  }>;
  recentEvents: Array<{
    id: number;
    eventType: WhatsAppClickEventType;
    productName: string;
    sku: string;
    categoryName: string;
    selectedSize: string;
    quantity: number;
    sourcePage: string;
    createdAt: string;
  }>;
  categories: Array<{ id: number; name: string }>;
}

type TimeframeOption = '7' | '14' | '30' | '90' | 'all';
type EventFilterOption = 'all' | WhatsAppClickEventType;
type ProductSortOption = 'clicks' | 'quantity' | 'sales';

const TIMEFRAME_OPTIONS: Array<{ value: TimeframeOption; label: string }> = [
  { value: '7', label: '7 Days' },
  { value: '14', label: '14 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

const EVENT_TYPE_OPTIONS: Array<{ value: EventFilterOption; label: string }> = [
  { value: 'all', label: 'All Clicks' },
  { value: 'product_order', label: 'Product Order Now' },
  { value: 'wholesale_quote', label: 'Wholesale Quote' },
  { value: 'whatsapp_contact', label: 'General Chat' },
];

const EVENT_LABELS: Record<WhatsAppClickEventType, string> = {
  product_order: 'Product Order Now',
  wholesale_quote: 'Wholesale Quote',
  whatsapp_contact: 'General Chat',
};

export function WhatsAppAnalyticsDashboard({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [days, setDays] = useState<TimeframeOption>('30');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [eventType, setEventType] = useState<EventFilterOption>('all');
  const [search, setSearch] = useState('');
  const [productSort, setProductSort] = useState<ProductSortOption>('clicks');
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);

  const [data, setData] = useState<WhatsAppAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const params = new URLSearchParams({
          days,
          categoryId,
          eventType,
        });
        const res = await apiFetch<WhatsAppAnalyticsResponse>(
          `/api/admin/whatsapp-analytics?${params.toString()}`
        );
        setData(res);
        setInspectedDate(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load WhatsApp enquiry analytics.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, categoryId, eventType]
  );

  useEffect(() => {
    void loadAnalytics(false);
  }, [loadAnalytics]);

  const query = search.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    const list = data.topEnquiredProducts.filter(
      (p) =>
        !query ||
        p.productName.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.categoryName.toLowerCase().includes(query)
    );
    return [...list].sort((a, b) => {
      if (productSort === 'quantity') {
        return (
          b.totalQuantityRequested - a.totalQuantityRequested ||
          b.totalClicks - a.totalClicks
        );
      }
      if (productSort === 'sales') {
        return (
          b.recordedRevenue - a.recordedRevenue ||
          b.recordedUnitsSold - a.recordedUnitsSold ||
          b.totalClicks - a.totalClicks
        );
      }
      return (
        b.totalClicks - a.totalClicks ||
        b.totalQuantityRequested - a.totalQuantityRequested
      );
    });
  }, [data, query, productSort]);

  const filteredRecentEvents = useMemo(() => {
    if (!data) return [];
    return data.recentEvents.filter(
      (ev) =>
        !query ||
        ev.productName.toLowerCase().includes(query) ||
        ev.sku.toLowerCase().includes(query) ||
        ev.categoryName.toLowerCase().includes(query) ||
        ev.sourcePage.toLowerCase().includes(query)
    );
  }, [data, query]);

  const maxDailyTotal = useMemo(() => {
    if (!data?.dailyTrends.length) return 1;
    return Math.max(1, ...data.dailyTrends.map((d) => d.total));
  }, [data]);

  const activeDayBucket = useMemo(() => {
    if (!data?.dailyTrends.length) return null;
    if (inspectedDate) {
      return (
        data.dailyTrends.find((d) => d.date === inspectedDate) ||
        data.dailyTrends[data.dailyTrends.length - 1]
      );
    }
    const latestWithClicks = [...data.dailyTrends]
      .reverse()
      .find((d) => d.total > 0);
    return latestWithClicks || data.dailyTrends[data.dailyTrends.length - 1];
  }, [data, inspectedDate]);

  const handleExportCsv = () => {
    if (!data) return;
    downloadCsv(
      `eimesly-whatsapp-analytics-${days}d.csv`,
      [
        'Product Name',
        'SKU',
        'Category',
        'Order Now Clicks',
        'Wholesale Quote Clicks',
        'Total Clicks',
        'Total Qty Requested',
        'Avg Qty / Click',
        'Top Requested Sizes',
        'Confirmed Units Sold',
        'Confirmed Revenue (RWF)',
        'Current Stock',
      ],
      filteredProducts.map((p) => [
        p.productName,
        p.sku,
        p.categoryName,
        p.orderClicks,
        p.quoteClicks,
        p.totalClicks,
        p.totalQuantityRequested,
        p.avgQuantityPerClick,
        p.topSizes.join('; '),
        p.recordedUnitsSold,
        p.recordedRevenue,
        p.stockQuantity,
      ])
    );
  };

  const s = data?.summary;
  const avgQtyPerProductClick = useMemo(() => {
    if (!s) return '0.0';
    const productClicks = s.productOrderClicks + s.wholesaleQuoteClicks;
    if (productClicks <= 0) return '0.0';
    return (s.totalRequestedQuantity / productClicks).toFixed(1);
  }, [s]);

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6'}>
      {/* Toolbar */}
      <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4 space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {TIMEFRAME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  days === opt.value
                    ? 'bg-[#202020] text-[#FFFFFF]'
                    : 'bg-[#F5F5F5] text-[#202020]/80 hover:bg-[#F3EEE6]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAnalytics(true)}
              disabled={refreshing}
              className="px-3 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded-md inline-flex items-center gap-1.5 hover:bg-[#F5F5F5] disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!data || filteredProducts.length === 0}
              className="px-3.5 py-1.5 text-xs font-semibold bg-[#202020] text-[#FFFFFF] rounded-md inline-flex items-center gap-1.5 hover:bg-[#202020]/90 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#202020]/10">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#202020]/15 rounded-md text-[#202020]"
            >
              <option value="all">All Categories</option>
              {(data?.categories || []).map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
              <option value="uncategorized">General / Uncategorized</option>
            </select>

            <select
              aria-label="Filter by WhatsApp action type"
              value={eventType}
              onChange={(e) =>
                setEventType(e.target.value as EventFilterOption)
              }
              className="px-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#202020]/15 rounded-md text-[#202020]"
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#202020]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by product or SKU..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#202020]/15 rounded-md text-[#202020]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadAnalytics(true)}
            className="px-3 py-1 text-xs font-semibold bg-red-700 text-[#FFFFFF] rounded whitespace-nowrap shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {loading || !data || !s ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 bg-[#FFFFFF] border border-[#202020]/10 rounded-lg animate-pulse"
              />
            ))}
          </div>
          <div className="h-64 bg-[#FFFFFF] border border-[#202020]/10 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-56 bg-[#FFFFFF] border border-[#202020]/10 rounded-lg animate-pulse" />
            <div className="h-56 bg-[#FFFFFF] border border-[#202020]/10 rounded-lg animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* 4-Column Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Total WhatsApp Clicks</span>
                <MessageCircle className="w-4 h-4 text-[#16A34A]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {s.totalClicks}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                {s.productOrderClicks} order · {s.wholesaleQuoteClicks} quote ·{' '}
                {s.whatsappContactClicks} chat
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Requested Quantity</span>
                <TrendingUp className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#202020] tabular-nums">
                {s.totalRequestedQuantity.toLocaleString('en-US')}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                Avg {avgQtyPerProductClick} / click · {s.uniqueProductsEnquired}{' '}
                products
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Top Popular Category</span>
                <FolderTree className="w-4 h-4 text-[#B58B61]" />
              </div>
              <p className="mt-2 text-lg font-bold text-[#202020] truncate">
                {s.topCategoryName}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                {s.topCategoryClicks} product clicks in window
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-[#202020]/60">
                <span>Most Enquired Item</span>
                <Package className="w-4 h-4 text-[#202020]" />
              </div>
              <p className="mt-2 text-lg font-bold text-[#202020] truncate">
                {s.topProductName}
              </p>
              <p className="mt-1 text-xs text-[#202020]/60 tabular-nums">
                {s.topProductClicks} clicks · {s.confirmedOrderUnits} units sold (
                {formatRwf(s.confirmedOrderRevenue)})
              </p>
            </div>
          </div>

          {s.totalClicks === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-10 text-center space-y-2">
              <MessageCircle className="w-8 h-8 text-[#B58B61] mx-auto" />
              <h3 className="text-sm font-bold text-[#202020]">
                No WhatsApp Clicks Recorded for This Filter
              </h3>
              <p className="text-xs text-[#202020]/65 max-w-md mx-auto">
                Storefront clicks from Order Now, Request Wholesale Quote, and
                WhatsApp chat links are captured automatically via{' '}
                <span className="font-mono">trackWhatsAppClick</span>. Try
                expanding the timeframe or resetting category filters.
              </p>
            </div>
          ) : (
            <>
              {/* Daily Enquiry Trends Chart */}
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#202020]">
                      Daily WhatsApp Enquiry Trends (Last{' '}
                      {data.dailyTrends.length} Days)
                    </h2>
                    <p className="text-xs text-[#202020]/60">
                      Intent distribution across Order Now, Wholesale Quote, and
                      General Chat clicks
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#202020]/80">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#16A34A]" />
                      Product Order Now
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#B58B61]" />
                      Wholesale Quote
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#202020]" />
                      General Chat
                    </span>
                  </div>
                </div>

                {activeDayBucket && (
                  <div className="bg-[#F5F5F5] border border-[#202020]/10 rounded-md px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#202020] tabular-nums">
                      {activeDayBucket.label} ({activeDayBucket.date})
                    </span>
                    <span className="text-[#202020]/75 tabular-nums">
                      Total: <strong className="text-[#202020]">{activeDayBucket.total}</strong>{' '}
                      · Order Now: <strong className="text-[#16A34A]">{activeDayBucket.productOrder}</strong>{' '}
                      · Wholesale: <strong className="text-[#B58B61]">{activeDayBucket.wholesaleQuote}</strong>{' '}
                      · Chat: <strong>{activeDayBucket.contact}</strong> · Qty
                      Requested: <strong>{activeDayBucket.requestedQty}</strong>
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto pb-1">
                  <div
                    className="h-48 flex items-end gap-1.5 pt-4 min-w-[520px]"
                    role="img"
                    aria-label="Daily WhatsApp click breakdown bar chart"
                  >
                    {data.dailyTrends.map((day, idx) => {
                      const heightPct =
                        day.total > 0
                          ? Math.max(8, Math.round((day.total / maxDailyTotal) * 100))
                          : 0;
                      const orderFlex = day.productOrder;
                      const quoteFlex = day.wholesaleQuote;
                      const chatFlex = day.contact;
                      const isSelected = activeDayBucket?.date === day.date;
                      const showLabel =
                        data.dailyTrends.length <= 14 ||
                        idx % 3 === 0 ||
                        idx === data.dailyTrends.length - 1;

                      return (
                        <button
                          key={day.date}
                          type="button"
                          onMouseEnter={() => setInspectedDate(day.date)}
                          onFocus={() => setInspectedDate(day.date)}
                          onClick={() => setInspectedDate(day.date)}
                          title={`${day.label}: ${day.total} clicks (${day.productOrder} order, ${day.wholesaleQuote} quote, ${day.contact} chat)`}
                          className={`flex-1 flex flex-col items-center justify-end h-full gap-1.5 group focus:outline-none ${
                            isSelected ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                          }`}
                        >
                          <span className="text-[10px] font-mono text-[#202020]/65 tabular-nums h-3.5">
                            {day.total > 0 ? day.total : ''}
                          </span>
                          <div className="w-full flex-1 flex items-end justify-center">
                            {day.total > 0 ? (
                              <div
                                className={`w-full max-w-[26px] rounded-t overflow-hidden flex flex-col justify-end transition-all ${
                                  isSelected
                                    ? 'ring-2 ring-[#B58B61] ring-offset-1'
                                    : ''
                                }`}
                                style={{ height: `${heightPct}%` }}
                              >
                                {chatFlex > 0 && (
                                  <div
                                    className="w-full bg-[#202020]"
                                    style={{ flexGrow: chatFlex }}
                                  />
                                )}
                                {quoteFlex > 0 && (
                                  <div
                                    className="w-full bg-[#B58B61]"
                                    style={{ flexGrow: quoteFlex }}
                                  />
                                )}
                                {orderFlex > 0 && (
                                  <div
                                    className="w-full bg-[#16A34A]"
                                    style={{ flexGrow: orderFlex }}
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="w-full max-w-[26px] h-1 bg-[#F5F5F5] rounded-t" />
                            )}
                          </div>
                          <span className="text-[10px] text-[#202020]/55 tabular-nums whitespace-nowrap h-3.5">
                            {showLabel ? day.label : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Popular Categories & Click Sources */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-[#202020]">
                        Popular Packaging Categories
                      </h2>
                      <p className="text-xs text-[#202020]/60">
                        Ranked by customer WhatsApp enquiries & confirmed sales
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[#202020]/60 tabular-nums">
                      {data.popularCategories.length} active
                    </span>
                  </div>

                  {data.popularCategories.length === 0 ? (
                    <p className="text-xs text-[#202020]/60 py-6 text-center">
                      No product-linked category clicks in this timeframe.
                    </p>
                  ) : (
                    <div className="space-y-3.5">
                      {data.popularCategories.map((cat) => (
                        <div key={cat.categoryName} className="space-y-1.5">
                          <div className="flex items-baseline justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <span className="font-semibold text-[#202020] truncate">
                                {cat.categoryName}
                              </span>
                              <span className="ml-2 text-[#202020]/55 tabular-nums">
                                {cat.uniqueProducts} products ·{' '}
                                {cat.totalQuantityRequested.toLocaleString(
                                  'en-US'
                                )}{' '}
                                units requested
                              </span>
                            </div>
                            <span className="font-mono font-bold text-[#202020] tabular-nums shrink-0">
                              {cat.totalClicks} ({cat.sharePercent}%)
                            </span>
                          </div>

                          <div className="h-2 w-full bg-[#F5F5F5] rounded overflow-hidden flex">
                            {cat.productOrderClicks > 0 && (
                              <div
                                className="bg-[#16A34A] h-full"
                                style={{
                                  width: `${Math.max(
                                    3,
                                    Math.round(
                                      (cat.productOrderClicks /
                                        Math.max(
                                          1,
                                          data.popularCategories[0].totalClicks
                                        )) *
                                        100
                                    )
                                  )}%`,
                                }}
                                title={`Order Now: ${cat.productOrderClicks}`}
                              />
                            )}
                            {cat.wholesaleQuoteClicks > 0 && (
                              <div
                                className="bg-[#B58B61] h-full"
                                style={{
                                  width: `${Math.max(
                                    3,
                                    Math.round(
                                      (cat.wholesaleQuoteClicks /
                                        Math.max(
                                          1,
                                          data.popularCategories[0].totalClicks
                                        )) *
                                        100
                                    )
                                  )}%`,
                                }}
                                title={`Wholesale Quote: ${cat.wholesaleQuoteClicks}`}
                              />
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#202020]/55 tabular-nums">
                            <span>
                              {cat.productOrderClicks} order ·{' '}
                              {cat.wholesaleQuoteClicks} wholesale
                            </span>
                            <span>
                              Recorded Sales: {cat.recordedUnitsSold} units ·{' '}
                              {formatRwf(cat.recordedRevenue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-[#202020]">
                        Enquiry Entry Sources
                      </h2>
                      <p className="text-xs text-[#202020]/60">
                        Where storefront visitors trigger WhatsApp actions
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[#202020]/60 tabular-nums">
                      {s.totalClicks} clicks
                    </span>
                  </div>

                  {data.sourceBreakdown.length === 0 ? (
                    <p className="text-xs text-[#202020]/60 py-6 text-center">
                      No source breakdown available.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {data.sourceBreakdown.map((src) => (
                        <div key={src.source} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-[#202020]">
                              {src.source}
                            </span>
                            <span className="font-mono font-semibold text-[#202020] tabular-nums">
                              {src.clicks} clicks ({src.sharePercent}%)
                            </span>
                          </div>
                          <div className="h-2 bg-[#F5F5F5] rounded overflow-hidden">
                            <div
                              className="h-full bg-[#202020]"
                              style={{
                                width: `${Math.max(4, src.sharePercent)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Enquired & Top-Selling Products Table */}
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#202020]/10 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#202020]">
                      Top-Enquired Products & Confirmed Sales Correlation
                    </h2>
                    <p className="text-xs text-[#202020]/60">
                      Compare WhatsApp customer demand against recorded orders
                      and live warehouse stock
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        ['clicks', 'Most Enquired'],
                        ['quantity', 'Requested Qty'],
                        ['sales', 'Confirmed Sales'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setProductSort(key)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                          productSort === key
                            ? 'bg-[#B58B61] text-[#FFFFFF]'
                            : 'bg-[#F5F5F5] text-[#202020]/75 hover:bg-[#F3EEE6]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F5F5F5] border-b border-[#202020]/10 text-[#202020]/65">
                        <th className="py-2.5 px-4">Product & Category</th>
                        <th className="py-2.5 px-4 text-right">Order Clicks</th>
                        <th className="py-2.5 px-4 text-right">
                          Wholesale Clicks
                        </th>
                        <th className="py-2.5 px-4 text-right">Total Clicks</th>
                        <th className="py-2.5 px-4 text-right">
                          Qty Requested
                        </th>
                        <th className="py-2.5 px-4">Popular Sizes</th>
                        <th className="py-2.5 px-4 text-right">
                          Confirmed Sales
                        </th>
                        <th className="py-2.5 px-4 text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#202020]/10">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-8 text-center text-[#202020]/60"
                          >
                            No product enquiries match the current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p, idx) => (
                          <tr
                            key={`${p.productId ?? p.productName}-${idx}`}
                            className="hover:bg-[#F5F5F5]/60 transition-colors"
                          >
                            <td className="py-3 px-4 min-w-[200px]">
                              <p className="font-semibold text-[#202020]">
                                {p.productName}
                              </p>
                              <p className="text-[11px] text-[#202020]/55">
                                {p.categoryName}
                                {p.sku ? (
                                  <span className="font-mono">
                                    {' '}
                                    · {p.sku}
                                  </span>
                                ) : null}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-[#16A34A] font-semibold">
                              {p.orderClicks}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-[#B58B61] font-semibold">
                              {p.quoteClicks}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#202020]">
                              {p.totalClicks}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              <span className="font-semibold text-[#202020]">
                                {p.totalQuantityRequested.toLocaleString(
                                  'en-US'
                                )}
                              </span>
                              <span className="block text-[11px] text-[#202020]/55">
                                ~{p.avgQuantityPerClick}/click
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#202020]/75 max-w-[180px]">
                              {p.topSizes.length > 0
                                ? p.topSizes.join(' · ')
                                : 'Standard'}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                              <span className="font-semibold text-[#202020]">
                                {formatRwf(p.recordedRevenue)}
                              </span>
                              <span className="block text-[11px] text-[#202020]/55">
                                {p.recordedUnitsSold} units
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                              <span className="font-semibold text-[#202020]">
                                {p.stockQuantity}
                              </span>
                              <span className="block text-[11px] text-[#202020]/55">
                                {AVAILABILITY_LABELS[p.availabilityStatus] ||
                                  p.availabilityStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Click Log */}
              <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#202020]/10 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-[#202020]">
                    Recent Tracked Clicks (Latest {filteredRecentEvents.length})
                  </h2>
                  <span className="text-[11px] text-[#202020]/55">
                    Live log from storefront Order Now & Quote CTAs
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F5F5F5] border-b border-[#202020]/10 text-[#202020]/65">
                        <th className="py-2.5 px-4">Timestamp</th>
                        <th className="py-2.5 px-4">Action</th>
                        <th className="py-2.5 px-4">Product</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4">Size</th>
                        <th className="py-2.5 px-4 text-right">Qty</th>
                        <th className="py-2.5 px-4">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#202020]/10">
                      {filteredRecentEvents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-6 text-center text-[#202020]/60"
                          >
                            No click events match your search filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRecentEvents.map((ev) => (
                          <tr key={ev.id}>
                            <td className="py-2.5 px-4 text-[#202020]/65 whitespace-nowrap tabular-nums">
                              {formatDateTime(ev.createdAt)}
                            </td>
                            <td className="py-2.5 px-4 font-semibold whitespace-nowrap">
                              <span
                                className={
                                  ev.eventType === 'product_order'
                                    ? 'text-[#16A34A]'
                                    : ev.eventType === 'wholesale_quote'
                                      ? 'text-[#B58B61]'
                                      : 'text-[#202020]'
                                }
                              >
                                {EVENT_LABELS[ev.eventType] || ev.eventType}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-medium text-[#202020]">
                              {ev.productName}
                            </td>
                            <td className="py-2.5 px-4 text-[#202020]/70">
                              {ev.categoryName}
                            </td>
                            <td className="py-2.5 px-4 text-[#202020]/70">
                              {ev.selectedSize || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                              {ev.quantity || 1}
                            </td>
                            <td className="py-2.5 px-4 text-[#202020]/70">
                              {ev.sourcePage}
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
        </>
      )}
    </div>
  );
}
