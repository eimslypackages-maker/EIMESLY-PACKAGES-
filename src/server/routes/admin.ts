import crypto from 'node:crypto';
import { Router } from 'express';
import { asc, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  auditLogs,
  categories,
  enquiries,
  inventoryMovements,
  mediaAssets,
  orderItems,
  orders,
  products,
  quotations,
  siteSettings,
  users,
  whatsappClicks,
} from '../../db/schema.ts';
import type { QuotationLineItemRecord } from '../../db/schema.ts';
import {
  DEFAULT_WEBSITE_CONTENT,
  DEFAULT_WEBSITE_SETTINGS,
} from '../../db/seed.ts';
import { hashPassword } from '../../lib/auth-crypto.ts';
import {
  type AuthRequest,
  requireAuth,
  requireRole,
  STAFF_ROLES,
  type UserRole,
} from '../../middleware/auth.ts';
import { recordAuditLog } from '../audit.ts';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(STAFF_ROLES));

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 1. Dashboard Overview
adminRouter.get('/overview', async (_req, res) => {
  try {
    const [
      allProducts,
      allCategories,
      allOrders,
      allItems,
      allEnquiries,
      allQuotations,
      allUsers,
      allClicks,
    ] = await Promise.all([
      db.select().from(products),
      db.select().from(categories),
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(orderItems),
      db.select().from(enquiries).orderBy(desc(enquiries.createdAt)),
      db.select().from(quotations).orderBy(desc(quotations.createdAt)),
      db.select({ id: users.id, role: users.role }).from(users),
      db.select().from(whatsappClicks).orderBy(desc(whatsappClicks.createdAt)),
    ]);

    const totalProducts = allProducts.length;
    const activeProducts = allProducts.filter((p) => p.isActive).length;
    const totalCategories = allCategories.length;
    const totalOrders = allOrders.length;
    const retailOrdersList = allOrders.filter(
      (o) => o.orderType === 'retail' && o.orderStatus !== 'cancelled'
    );
    const wholesaleOrdersList = allOrders.filter(
      (o) => o.orderType === 'wholesale' && o.orderStatus !== 'cancelled'
    );
    const retailOrders = retailOrdersList.length;
    const wholesaleOrders = wholesaleOrdersList.length;

    const pendingOrders = allOrders.filter(
      (o) => !['completed', 'cancelled'].includes(o.orderStatus)
    ).length;
    const completedOrders = allOrders.filter(
      (o) => o.orderStatus === 'completed'
    ).length;
    const totalEnquiries = allEnquiries.length;
    const pendingQuotations = allQuotations.filter((q) =>
      ['new', 'under_review', 'quotation_sent'].includes(q.status)
    ).length;

    // Customer count: registered customers + manually recorded buyer phones/emails
    const customerKeys = new Set<string>();
    for (const u of allUsers) {
      if (u.role === 'customer') customerKeys.add(`u-${u.id}`);
    }
    for (const o of allOrders) {
      if (o.userId) {
        customerKeys.add(`u-${o.userId}`);
      } else {
        customerKeys.add(`g-${o.email || o.phone || o.customerName}`);
      }
    }
    const totalCustomers = customerKeys.size;

    const confirmedPaidRevenue = allOrders
      .filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled')
      .reduce((acc, o) => acc + o.totalAmount, 0);

    const recordedSalesTotal = allOrders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((acc, o) => acc + o.totalAmount, 0);

    const outstandingBalances = allOrders
      .filter((o) => o.orderStatus !== 'cancelled' && o.paymentStatus !== 'paid')
      .reduce((acc, o) => acc + Math.max(0, o.totalAmount), 0);

    // WhatsApp Click / Enquiry Analytics (not confirmed sales)
    const totalEnquiryClicks = allClicks.length;
    const productOrderClicks = allClicks.filter(
      (c) => c.eventType === 'product_order'
    ).length;
    const wholesaleQuoteClicks = allClicks.filter(
      (c) => c.eventType === 'wholesale_quote'
    ).length;
    const whatsappContactClicks = allClicks.filter(
      (c) => c.eventType === 'whatsapp_contact'
    ).length;

    const clicksByProductMap = new Map<
      string,
      { productName: string; sku: string; orderClicks: number; quoteClicks: number; totalClicks: number }
    >();
    for (const c of allClicks) {
      if (!c.productName) continue;
      const key = c.sku || c.productName;
      const cur = clicksByProductMap.get(key) || {
        productName: c.productName,
        sku: c.sku,
        orderClicks: 0,
        quoteClicks: 0,
        totalClicks: 0,
      };
      cur.totalClicks += 1;
      if (c.eventType === 'product_order') cur.orderClicks += 1;
      if (c.eventType === 'wholesale_quote') cur.quoteClicks += 1;
      clicksByProductMap.set(key, cur);
    }
    const popularEnquiredProducts = Array.from(clicksByProductMap.values())
      .sort((a, b) => b.totalClicks - a.totalClicks)
      .slice(0, 6);

    // Best-selling products (from manually recorded confirmed orders)
    const salesByProduct = new Map<
      string,
      { productName: string; sku: string; units: number; revenue: number }
    >();
    for (const it of allItems) {
      const key = it.sku || it.productName;
      const cur = salesByProduct.get(key) || {
        productName: it.productName,
        sku: it.sku,
        units: 0,
        revenue: 0,
      };
      cur.units += it.quantity;
      cur.revenue += it.lineTotal;
      salesByProduct.set(key, cur);
    }
    const bestSellingProducts = Array.from(salesByProduct.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 6);

    const lowStockProducts = allProducts.filter(
      (p) =>
        p.availabilityStatus !== 'sample_listing' &&
        p.stockQuantity <= p.lowStockThreshold
    );

    const inventoryStatus = {
      inStock: allProducts.filter(
        (p) =>
          p.availabilityStatus === 'in_stock' &&
          p.stockQuantity > p.lowStockThreshold
      ).length,
      lowStock: allProducts.filter(
        (p) =>
          p.availabilityStatus !== 'sample_listing' &&
          p.stockQuantity > 0 &&
          p.stockQuantity <= p.lowStockThreshold
      ).length,
      outOfStock: allProducts.filter(
        (p) =>
          p.availabilityStatus === 'out_of_stock' ||
          (p.availabilityStatus !== 'sample_listing' &&
            p.availabilityStatus !== 'made_to_order' &&
            p.stockQuantity === 0)
      ).length,
      madeToOrder: allProducts.filter(
        (p) => p.availabilityStatus === 'made_to_order'
      ).length,
      sampleListing: allProducts.filter(
        (p) => p.availabilityStatus === 'sample_listing'
      ).length,
    };

    // Last 7 days daily sales & WhatsApp click series
    const chartMap = new Map<string, { date: string; sales: number; orders: number }>();
    const clickChartMap = new Map<
      string,
      {
        date: string;
        clicks: number;
        productOrders: number;
        wholesaleQuotes: number;
        contacts: number;
      }
    >();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      chartMap.set(iso, { date: iso, sales: 0, orders: 0 });
      clickChartMap.set(iso, {
        date: iso,
        clicks: 0,
        productOrders: 0,
        wholesaleQuotes: 0,
        contacts: 0,
      });
    }
    for (const o of allOrders) {
      if (o.orderStatus === 'cancelled') continue;
      const iso = new Date(o.createdAt).toISOString().slice(0, 10);
      const bucket = chartMap.get(iso);
      if (bucket) {
        bucket.orders += 1;
        bucket.sales += o.totalAmount;
      }
    }
    for (const c of allClicks) {
      const iso = new Date(c.createdAt).toISOString().slice(0, 10);
      const bucket = clickChartMap.get(iso);
      if (bucket) {
        bucket.clicks += 1;
        if (c.eventType === 'product_order') bucket.productOrders += 1;
        else if (c.eventType === 'wholesale_quote') bucket.wholesaleQuotes += 1;
        else bucket.contacts += 1;
      }
    }

    // Last 6 months monthly sales series
    const monthMap = new Map<string, { month: string; sales: number; orders: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, {
        month: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        sales: 0,
        orders: 0,
      });
    }
    for (const o of allOrders) {
      if (o.orderStatus === 'cancelled') continue;
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthMap.get(key);
      if (bucket) {
        bucket.orders += 1;
        bucket.sales += o.totalAmount;
      }
    }

    res.json({
      metrics: {
        totalProducts,
        activeProducts,
        totalCategories,
        totalCustomers,
        retailOrders,
        wholesaleOrders,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalEnquiries,
        pendingQuotations,
        confirmedPaidRevenue,
        recordedSalesTotal,
        outstandingBalances,
        lowStockCount: lowStockProducts.length,
        totalEnquiryClicks,
        productOrderClicks,
        wholesaleQuoteClicks,
        whatsappContactClicks,
      },
      salesSeries: Array.from(chartMap.values()),
      dailyClickSeries: Array.from(clickChartMap.values()),
      monthlySales: Array.from(monthMap.values()),
      wholesaleVsRetail: {
        retailOrders,
        retailRevenue: retailOrdersList.reduce((acc, o) => acc + o.totalAmount, 0),
        wholesaleOrders,
        wholesaleRevenue: wholesaleOrdersList.reduce(
          (acc, o) => acc + o.totalAmount,
          0
        ),
      },
      popularEnquiredProducts,
      inventoryStatus,
      recentOrders: allOrders.slice(0, 6),
      recentEnquiries: allEnquiries.slice(0, 6),
      bestSellingProducts,
      lowStockProducts,
    });
  } catch (err) {
    console.error('Admin overview failed:', err);
    res.status(500).json({ error: 'Failed to load dashboard overview' });
  }
});

// 1b. Dedicated WhatsApp Enquiry & Popularity Analytics
adminRouter.get('/whatsapp-analytics', async (req, res) => {
  try {
    const daysParam = String(req.query.days || '30');
    const categoryIdParam = String(req.query.categoryId || 'all');
    const eventTypeParam = String(req.query.eventType || 'all');

    const [allClicks, allProducts, allCategories, allOrders, allOrderItems] =
      await Promise.all([
        db.select().from(whatsappClicks).orderBy(desc(whatsappClicks.createdAt)),
        db.select().from(products),
        db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
        db.select().from(orders),
        db.select().from(orderItems),
      ]);

    const prodById = new Map(allProducts.map((p) => [p.id, p]));
    const prodBySku = new Map(
      allProducts.filter((p) => p.sku).map((p) => [p.sku.toLowerCase(), p])
    );
    const catById = new Map(allCategories.map((c) => [c.id, c]));

    let cutoffDate: Date | null = null;
    if (daysParam !== 'all') {
      const n = Math.max(1, Math.min(365, Number(daysParam) || 30));
      cutoffDate = new Date();
      cutoffDate.setHours(0, 0, 0, 0);
      cutoffDate.setDate(cutoffDate.getDate() - (n - 1));
    }

    const activeOrderIds = new Set(
      allOrders
        .filter((o) => {
          if (o.orderStatus === 'cancelled') return false;
          if (cutoffDate && new Date(o.createdAt) < cutoffDate) return false;
          return true;
        })
        .map((o) => o.id)
    );

    const resolveProduct = (
      productId: number | null | undefined,
      sku?: string | null
    ) => {
      if (productId && prodById.has(productId)) return prodById.get(productId);
      if (sku && prodBySku.has(sku.toLowerCase())) {
        return prodBySku.get(sku.toLowerCase());
      }
      return undefined;
    };

    // Correlate confirmed sales per product & per category
    const salesByProductKey = new Map<string, { units: number; revenue: number }>();
    const salesByCategoryId = new Map<string, { units: number; revenue: number }>();
    let confirmedOrderRevenue = 0;
    let confirmedOrderUnits = 0;

    for (const it of allOrderItems) {
      if (!activeOrderIds.has(it.orderId)) continue;
      confirmedOrderUnits += it.quantity;
      confirmedOrderRevenue += it.lineTotal;

      const prod = resolveProduct(it.productId, it.sku);
      const prodKey = prod ? `id:${prod.id}` : `name:${it.sku || it.productName}`;
      const pSale = salesByProductKey.get(prodKey) || { units: 0, revenue: 0 };
      pSale.units += it.quantity;
      pSale.revenue += it.lineTotal;
      salesByProductKey.set(prodKey, pSale);

      const catKey =
        prod?.categoryId && catById.has(prod.categoryId)
          ? String(prod.categoryId)
          : 'uncategorized';
      const cSale = salesByCategoryId.get(catKey) || { units: 0, revenue: 0 };
      cSale.units += it.quantity;
      cSale.revenue += it.lineTotal;
      salesByCategoryId.set(catKey, cSale);
    }

    // Filter clicks
    const filteredClicks = allClicks.filter((c) => {
      if (cutoffDate && new Date(c.createdAt) < cutoffDate) return false;
      if (eventTypeParam !== 'all' && c.eventType !== eventTypeParam) {
        return false;
      }
      if (categoryIdParam !== 'all') {
        const prod = resolveProduct(c.productId, c.sku);
        const resolvedCatId = prod?.categoryId ? String(prod.categoryId) : 'uncategorized';
        if (resolvedCatId !== categoryIdParam) return false;
      }
      return true;
    });

    const totalClicks = filteredClicks.length;
    const productOrderClicks = filteredClicks.filter(
      (c) => c.eventType === 'product_order'
    ).length;
    const wholesaleQuoteClicks = filteredClicks.filter(
      (c) => c.eventType === 'wholesale_quote'
    ).length;
    const whatsappContactClicks = filteredClicks.filter(
      (c) => c.eventType === 'whatsapp_contact'
    ).length;
    const totalRequestedQuantity = filteredClicks.reduce(
      (sum, c) => sum + (c.productName ? Math.max(1, c.quantity || 1) : 0),
      0
    );

    // Daily trends (always show continuous daily buckets; 14d or 30d window for readability)
    const chartDays =
      daysParam === '7' ? 7 : daysParam === '14' ? 14 : 30;
    const trendMap = new Map<
      string,
      {
        date: string;
        label: string;
        productOrder: number;
        wholesaleQuote: number;
        contact: number;
        total: number;
        requestedQty: number;
      }
    >();
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      trendMap.set(iso, {
        date: iso,
        label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        productOrder: 0,
        wholesaleQuote: 0,
        contact: 0,
        total: 0,
        requestedQty: 0,
      });
    }
    for (const c of filteredClicks) {
      const iso = new Date(c.createdAt).toISOString().slice(0, 10);
      const bucket = trendMap.get(iso);
      if (bucket) {
        bucket.total += 1;
        if (c.productName) bucket.requestedQty += Math.max(1, c.quantity || 1);
        if (c.eventType === 'product_order') bucket.productOrder += 1;
        else if (c.eventType === 'wholesale_quote') bucket.wholesaleQuote += 1;
        else bucket.contact += 1;
      }
    }

    // Aggregate by product and by category
    const productAgg = new Map<
      string,
      {
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
        sizeCounts: Map<string, number>;
        recordedUnitsSold: number;
        recordedRevenue: number;
      }
    >();

    const categoryAgg = new Map<
      string,
      {
        categoryId: number | null;
        categoryName: string;
        totalClicks: number;
        productOrderClicks: number;
        wholesaleQuoteClicks: number;
        totalQuantityRequested: number;
        productKeys: Set<string>;
        recordedUnitsSold: number;
        recordedRevenue: number;
      }
    >();

    const sourceMap = new Map<string, number>();

    const normalizeSourceLabel = (src: string): string => {
      const s = (src || '').trim();
      if (!s) return 'Other';
      if (s === '/') return 'Home Page';
      if (s === '/shop') return 'Shop Catalogue';
      if (s === '/wholesale' || s === 'wholesale_page') return 'Wholesale Page';
      if (s === '/contact' || s === 'contact_page') return 'Contact Page';
      if (s === 'product_card') return 'Product Cards';
      if (s === 'product_detail' || s.startsWith('/products/')) return 'Product Detail Page';
      if (s.startsWith('/categories/')) return 'Category Page';
      if (s === 'navbar') return 'Top Navigation';
      if (s === 'footer') return 'Footer';
      return s;
    };

    for (const c of filteredClicks) {
      const srcLabel = normalizeSourceLabel(c.sourcePage);
      sourceMap.set(srcLabel, (sourceMap.get(srcLabel) || 0) + 1);

      if (!c.productName) continue;
      const prod = resolveProduct(c.productId, c.sku);
      const cat =
        prod?.categoryId && catById.has(prod.categoryId)
          ? catById.get(prod.categoryId)
          : undefined;
      const categoryName = cat?.name ?? 'General / Uncategorized';
      const catKey = cat ? String(cat.id) : 'uncategorized';

      const prodKey = prod ? `id:${prod.id}` : `name:${c.sku || c.productName}`;
      const existingProd = productAgg.get(prodKey) || {
        productId: prod?.id ?? c.productId ?? null,
        productName: prod?.name ?? c.productName,
        sku: prod?.sku ?? c.sku,
        categoryName,
        unitPrice: prod?.unitPrice ?? null,
        stockQuantity: prod?.stockQuantity ?? 0,
        availabilityStatus: prod?.availabilityStatus ?? 'in_stock',
        orderClicks: 0,
        quoteClicks: 0,
        totalClicks: 0,
        totalQuantityRequested: 0,
        sizeCounts: new Map<string, number>(),
        recordedUnitsSold: salesByProductKey.get(prodKey)?.units ?? 0,
        recordedRevenue: salesByProductKey.get(prodKey)?.revenue ?? 0,
      };
      existingProd.totalClicks += 1;
      existingProd.totalQuantityRequested += Math.max(1, c.quantity || 1);
      if (c.eventType === 'product_order') existingProd.orderClicks += 1;
      if (c.eventType === 'wholesale_quote') existingProd.quoteClicks += 1;
      if (c.selectedSize) {
        existingProd.sizeCounts.set(
          c.selectedSize,
          (existingProd.sizeCounts.get(c.selectedSize) || 0) + 1
        );
      }
      productAgg.set(prodKey, existingProd);

      const catSale = salesByCategoryId.get(catKey) || { units: 0, revenue: 0 };
      const existingCat = categoryAgg.get(catKey) || {
        categoryId: cat?.id ?? null,
        categoryName,
        totalClicks: 0,
        productOrderClicks: 0,
        wholesaleQuoteClicks: 0,
        totalQuantityRequested: 0,
        productKeys: new Set<string>(),
        recordedUnitsSold: catSale.units,
        recordedRevenue: catSale.revenue,
      };
      existingCat.totalClicks += 1;
      existingCat.totalQuantityRequested += Math.max(1, c.quantity || 1);
      if (c.eventType === 'product_order') existingCat.productOrderClicks += 1;
      if (c.eventType === 'wholesale_quote') existingCat.wholesaleQuoteClicks += 1;
      existingCat.productKeys.add(prodKey);
      categoryAgg.set(catKey, existingCat);
    }

    const totalProductClicks = Array.from(categoryAgg.values()).reduce(
      (s, c) => s + c.totalClicks,
      0
    );

    const popularCategories = Array.from(categoryAgg.values())
      .map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        totalClicks: c.totalClicks,
        productOrderClicks: c.productOrderClicks,
        wholesaleQuoteClicks: c.wholesaleQuoteClicks,
        totalQuantityRequested: c.totalQuantityRequested,
        uniqueProducts: c.productKeys.size,
        sharePercent:
          totalProductClicks > 0
            ? Math.round((c.totalClicks / totalProductClicks) * 100)
            : 0,
        recordedUnitsSold: c.recordedUnitsSold,
        recordedRevenue: c.recordedRevenue,
      }))
      .sort((a, b) => b.totalClicks - a.totalClicks);

    const topEnquiredProducts = Array.from(productAgg.values())
      .map((p) => {
        const topSizes = Array.from(p.sizeCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([size, count]) => `${size} (${count})`);
        return {
          productId: p.productId,
          productName: p.productName,
          sku: p.sku,
          categoryName: p.categoryName,
          unitPrice: p.unitPrice,
          stockQuantity: p.stockQuantity,
          availabilityStatus: p.availabilityStatus,
          orderClicks: p.orderClicks,
          quoteClicks: p.quoteClicks,
          totalClicks: p.totalClicks,
          totalQuantityRequested: p.totalQuantityRequested,
          avgQuantityPerClick:
            p.totalClicks > 0
              ? Number((p.totalQuantityRequested / p.totalClicks).toFixed(1))
              : 0,
          topSizes,
          recordedUnitsSold: p.recordedUnitsSold,
          recordedRevenue: p.recordedRevenue,
        };
      })
      .sort(
        (a, b) =>
          b.totalClicks - a.totalClicks ||
          b.totalQuantityRequested - a.totalQuantityRequested
      );

    const sourceBreakdown = Array.from(sourceMap.entries())
      .map(([source, clicks]) => ({
        source,
        clicks,
        sharePercent: totalClicks > 0 ? Math.round((clicks / totalClicks) * 100) : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    const recentEvents = filteredClicks.slice(0, 25).map((c) => {
      const prod = resolveProduct(c.productId, c.sku);
      const cat =
        prod?.categoryId && catById.has(prod.categoryId)
          ? catById.get(prod.categoryId)
          : undefined;
      return {
        id: c.id,
        eventType: c.eventType,
        productName: c.productName || 'General Enquiry',
        sku: c.sku,
        categoryName: c.productName ? (cat?.name ?? 'Uncategorized') : 'General',
        selectedSize: c.selectedSize,
        quantity: c.quantity,
        sourcePage: normalizeSourceLabel(c.sourcePage),
        createdAt: c.createdAt,
      };
    });

    res.json({
      summary: {
        totalClicks,
        productOrderClicks,
        wholesaleQuoteClicks,
        whatsappContactClicks,
        totalRequestedQuantity,
        uniqueProductsEnquired: topEnquiredProducts.length,
        topCategoryName: popularCategories[0]?.categoryName ?? '—',
        topCategoryClicks: popularCategories[0]?.totalClicks ?? 0,
        topProductName: topEnquiredProducts[0]?.productName ?? '—',
        topProductClicks: topEnquiredProducts[0]?.totalClicks ?? 0,
        confirmedOrderRevenue,
        confirmedOrderUnits,
      },
      dailyTrends: Array.from(trendMap.values()),
      popularCategories,
      topEnquiredProducts,
      sourceBreakdown,
      recentEvents,
      categories: allCategories.map((c) => ({ id: c.id, name: c.name })),
    });
  } catch (err) {
    console.error('WhatsApp analytics failed:', err);
    res.status(500).json({ error: 'Failed to load WhatsApp analytics' });
  }
});

// 2. Product Management
adminRouter.get('/products', async (_req, res) => {
  try {
    const [allProds, allCats] = await Promise.all([
      db.select().from(products).orderBy(desc(products.createdAt)),
      db.select().from(categories),
    ]);
    const catMap = new Map(allCats.map((c) => [c.id, c]));
    res.json(
      allProds.map((p) => {
        const cat = p.categoryId ? catMap.get(p.categoryId) : undefined;
        return {
          ...p,
          categoryName: cat?.name ?? 'Uncategorized',
        };
      })
    );
  } catch (err) {
    console.error('Admin products fetch failed:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

adminRouter.post(
  '/products',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const b = req.body || {};
      if (!b.name || !b.sku) {
        return res.status(400).json({ error: 'Product name and SKU are required' });
      }
      const slug = b.slug
        ? slugify(b.slug)
        : `${slugify(b.name)}-${Date.now().toString().slice(-4)}`;
      const [created] = await db
        .insert(products)
        .values({
          categoryId: b.categoryId ? Number(b.categoryId) : null,
          name: String(b.name).trim(),
          slug,
          sku: String(b.sku).trim(),
          description: String(b.description || '').trim(),
          material: String(b.material || '').trim(),
          brand: String(b.brand || 'Eimesly Packages').trim(),
          sizes: Array.isArray(b.sizes) ? b.sizes : [],
          colors: Array.isArray(b.colors) ? b.colors : [],
          packagingQuantity: String(b.packagingQuantity || '').trim(),
          unitPrice:
            b.unitPrice !== null && b.unitPrice !== '' && b.unitPrice !== undefined
              ? Math.max(0, Math.round(Number(b.unitPrice)))
              : null,
          wholesalePrice:
            b.wholesalePrice !== null &&
            b.wholesalePrice !== '' &&
            b.wholesalePrice !== undefined
              ? Math.max(0, Math.round(Number(b.wholesalePrice)))
              : null,
          costPrice:
            b.costPrice !== null && b.costPrice !== '' && b.costPrice !== undefined
              ? Math.max(0, Math.round(Number(b.costPrice)))
              : null,
          moq: Math.max(1, Number(b.moq || 1)),
          stockQuantity: Math.max(0, Number(b.stockQuantity || 0)),
          lowStockThreshold: Math.max(0, Number(b.lowStockThreshold || 10)),
          availabilityStatus: String(b.availabilityStatus || 'in_stock'),
          images: Array.isArray(b.images) ? b.images : [],
          isFeatured: Boolean(b.isFeatured),
          isActive: b.isActive !== undefined ? Boolean(b.isActive) : true,
          isSample: Boolean(b.isSample),
        })
        .returning();

      await recordAuditLog({
        actor: req.appUser,
        action: 'create_product',
        entityType: 'product',
        entityId: created.id,
        details: { name: created.name, sku: created.sku },
      });

      res.status(201).json(created);
    } catch (err: unknown) {
      console.error('Create product failed:', err);
      res.status(400).json({
        error:
          err instanceof Error && err.message.includes('unique')
            ? 'A product with that SKU or slug already exists'
            : 'Failed to create product',
      });
    }
  }
);

adminRouter.put(
  '/products/:id',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body || {};
      const existingRows = await db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);
      if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      const prevProd = existingRows[0];

      const [updated] = await db
        .update(products)
        .set({
          categoryId:
            b.categoryId !== undefined
              ? b.categoryId
                ? Number(b.categoryId)
                : null
              : undefined,
          name: b.name !== undefined ? String(b.name).trim() : undefined,
          slug: b.slug !== undefined ? slugify(String(b.slug)) : undefined,
          sku: b.sku !== undefined ? String(b.sku).trim() : undefined,
          description:
            b.description !== undefined ? String(b.description).trim() : undefined,
          material:
            b.material !== undefined ? String(b.material).trim() : undefined,
          brand: b.brand !== undefined ? String(b.brand).trim() : undefined,
          sizes: Array.isArray(b.sizes) ? b.sizes : undefined,
          colors: Array.isArray(b.colors) ? b.colors : undefined,
          packagingQuantity:
            b.packagingQuantity !== undefined
              ? String(b.packagingQuantity).trim()
              : undefined,
          unitPrice:
            b.unitPrice === null || b.unitPrice === ''
              ? null
              : b.unitPrice !== undefined
                ? Math.max(0, Math.round(Number(b.unitPrice)))
                : undefined,
          wholesalePrice:
            b.wholesalePrice === null || b.wholesalePrice === ''
              ? null
              : b.wholesalePrice !== undefined
                ? Math.max(0, Math.round(Number(b.wholesalePrice)))
                : undefined,
          costPrice:
            b.costPrice === null || b.costPrice === ''
              ? null
              : b.costPrice !== undefined
                ? Math.max(0, Math.round(Number(b.costPrice)))
                : undefined,
          moq: b.moq !== undefined ? Math.max(1, Number(b.moq)) : undefined,
          stockQuantity:
            b.stockQuantity !== undefined
              ? Math.max(0, Number(b.stockQuantity))
              : undefined,
          lowStockThreshold:
            b.lowStockThreshold !== undefined
              ? Math.max(0, Number(b.lowStockThreshold))
              : undefined,
          availabilityStatus:
            b.availabilityStatus !== undefined
              ? String(b.availabilityStatus)
              : undefined,
          images: Array.isArray(b.images) ? b.images : undefined,
          isFeatured:
            b.isFeatured !== undefined ? Boolean(b.isFeatured) : undefined,
          isActive: b.isActive !== undefined ? Boolean(b.isActive) : undefined,
          isSample: b.isSample !== undefined ? Boolean(b.isSample) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      const priceChanged =
        prevProd.unitPrice !== updated.unitPrice ||
        prevProd.wholesalePrice !== updated.wholesalePrice ||
        prevProd.costPrice !== updated.costPrice;

      await recordAuditLog({
        actor: req.appUser,
        action: priceChanged ? 'update_product_price' : 'update_product',
        entityType: 'product',
        entityId: id,
        details: {
          name: updated.name,
          sku: updated.sku,
          ...(priceChanged
            ? {
                unitPrice: [prevProd.unitPrice, updated.unitPrice],
                wholesalePrice: [prevProd.wholesalePrice, updated.wholesalePrice],
                costPrice: [prevProd.costPrice, updated.costPrice],
              }
            : {}),
        },
      });

      res.json(updated);
    } catch (err) {
      console.error('Update product failed:', err);
      res.status(400).json({ error: 'Failed to update product' });
    }
  }
);

adminRouter.delete(
  '/products/:id',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const [deleted] = await db
        .delete(products)
        .where(eq(products.id, id))
        .returning();
      if (!deleted) return res.status(404).json({ error: 'Product not found' });

      await recordAuditLog({
        actor: req.appUser,
        action: 'delete_product',
        entityType: 'product',
        entityId: id,
        details: { name: deleted.name, sku: deleted.sku },
      });

      res.json({ success: true });
    } catch (err) {
      console.error('Delete product failed:', err);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
);

// 3. Category Management
adminRouter.get('/categories', async (_req, res) => {
  try {
    const cats = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id));
    res.json(cats);
  } catch (err) {
    console.error('Admin categories failed:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

adminRouter.post(
  '/categories',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const b = req.body || {};
      if (!b.name) {
        return res.status(400).json({ error: 'Category name is required' });
      }
      const slug = b.slug ? slugify(b.slug) : slugify(b.name);
      const [created] = await db
        .insert(categories)
        .values({
          name: String(b.name).trim(),
          slug,
          description: String(b.description || '').trim(),
          imageUrl: String(b.imageUrl || '').trim(),
          sortOrder: Number(b.sortOrder || 0),
          isActive: b.isActive !== undefined ? Boolean(b.isActive) : true,
        })
        .returning();

      await recordAuditLog({
        actor: req.appUser,
        action: 'create_category',
        entityType: 'category',
        entityId: created.id,
        details: { name: created.name },
      });

      res.status(201).json(created);
    } catch (err) {
      console.error('Create category failed:', err);
      res.status(400).json({ error: 'Failed to create category (duplicate slug?)' });
    }
  }
);

adminRouter.put(
  '/categories/:id',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body || {};
      const [updated] = await db
        .update(categories)
        .set({
          name: b.name !== undefined ? String(b.name).trim() : undefined,
          slug: b.slug !== undefined ? slugify(String(b.slug)) : undefined,
          description:
            b.description !== undefined ? String(b.description).trim() : undefined,
          imageUrl:
            b.imageUrl !== undefined ? String(b.imageUrl).trim() : undefined,
          sortOrder:
            b.sortOrder !== undefined ? Number(b.sortOrder) : undefined,
          isActive: b.isActive !== undefined ? Boolean(b.isActive) : undefined,
        })
        .where(eq(categories.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Category not found' });

      await recordAuditLog({
        actor: req.appUser,
        action: 'update_category',
        entityType: 'category',
        entityId: id,
        details: { name: updated.name },
      });

      res.json(updated);
    } catch (err) {
      console.error('Update category failed:', err);
      res.status(400).json({ error: 'Failed to update category' });
    }
  }
);

adminRouter.post(
  '/categories/reorder',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const { orderedIds } = req.body || {};
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: 'orderedIds array required' });
      }
      for (let i = 0; i < orderedIds.length; i++) {
        await db
          .update(categories)
          .set({ sortOrder: i + 1 })
          .where(eq(categories.id, Number(orderedIds[i])));
      }
      await recordAuditLog({
        actor: req.appUser,
        action: 'reorder_categories',
        entityType: 'category',
        details: { orderedIds },
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Reorder categories failed:', err);
      res.status(500).json({ error: 'Failed to reorder categories' });
    }
  }
);

adminRouter.delete(
  '/categories/:id',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const [deleted] = await db
        .delete(categories)
        .where(eq(categories.id, id))
        .returning();
      if (!deleted) return res.status(404).json({ error: 'Category not found' });

      await recordAuditLog({
        actor: req.appUser,
        action: 'delete_category',
        entityType: 'category',
        entityId: id,
        details: { name: deleted.name },
      });

      res.json({ success: true });
    } catch (err) {
      console.error('Delete category failed:', err);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  }
);

// 4. Order Management
adminRouter.get(
  '/orders',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (_req, res) => {
    try {
      const allOrders = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt));
      const ids = allOrders.map((o) => o.id);
      const allItems = ids.length
        ? await db
            .select()
            .from(orderItems)
            .where(inArray(orderItems.orderId, ids))
        : [];
      const itemMap = new Map<number, typeof allItems>();
      for (const it of allItems) {
        const list = itemMap.get(it.orderId) ?? [];
        list.push(it);
        itemMap.set(it.orderId, list);
      }
      res.json(
        allOrders.map((o) => ({
          ...o,
          items: itemMap.get(o.id) ?? [],
        }))
      );
    } catch (err) {
      console.error('Admin orders failed:', err);
      res.status(500).json({ error: 'Failed to load orders' });
    }
  }
);

adminRouter.get(
  '/orders/export',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (_req, res) => {
    try {
      const allOrders = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt));
      const header = [
        'Order Number',
        'Date',
        'Type',
        'Customer Name',
        'Business Name',
        'Phone',
        'District',
        'Order Status',
        'Payment Status',
        'Payment Method',
        'Subtotal (RWF)',
        'Delivery Fee (RWF)',
        'Total (RWF)',
      ];
      const csvEscape = (val: unknown) =>
        `"${String(val ?? '').replace(/"/g, '""')}"`;
      const lines = [
        header.join(','),
        ...allOrders.map((o) =>
          [
            o.orderNumber,
            new Date(o.createdAt).toISOString(),
            o.orderType,
            o.customerName,
            o.businessName,
            o.phone,
            o.district,
            o.orderStatus,
            o.paymentStatus,
            o.paymentMethod,
            o.subtotal,
            o.deliveryFee,
            o.totalAmount,
          ]
            .map(csvEscape)
            .join(',')
        ),
      ];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="eimesly-orders.csv"'
      );
      res.send(lines.join('\n'));
    } catch (err) {
      console.error('Export orders failed:', err);
      res.status(500).json({ error: 'Export failed' });
    }
  }
);

adminRouter.post(
  '/orders',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (req: AuthRequest, res) => {
    try {
      const b = req.body || {};
      const customerName = String(b.customerName || '').trim();
      const phone = String(b.phone || '').trim();
      if (!customerName || !phone) {
        return res
          .status(400)
          .json({ error: 'Customer name and phone number are required' });
      }
      if (!Array.isArray(b.items) || b.items.length === 0) {
        return res
          .status(400)
          .json({ error: 'At least one product line item is required' });
      }

      const settingsRows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'settings'))
        .limit(1);
      const prefix =
        String(
          (settingsRows[0]?.value as { orderNumberPrefix?: string } | undefined)
            ?.orderNumberPrefix || 'EP'
        ).trim() || 'EP';
      const orderNumber = `${prefix}-WA-${Date.now().toString().slice(-6)}`;

      const normalizedItems: Array<{
        productId: number | null;
        productName: string;
        sku: string;
        selectedSize: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }> = [];

      let subtotal = 0;
      for (const raw of b.items) {
        const qty = Math.max(1, Math.round(Number(raw.quantity || 1)));
        const unitPrice = Math.max(0, Math.round(Number(raw.unitPrice || 0)));
        const lineTotal = qty * unitPrice;
        subtotal += lineTotal;
        normalizedItems.push({
          productId: raw.productId ? Number(raw.productId) : null,
          productName: String(raw.productName || 'Packaging Product').trim(),
          sku: String(raw.sku || '').trim(),
          selectedSize: String(raw.selectedSize || '').trim(),
          quantity: qty,
          unitPrice,
          lineTotal,
        });
      }

      const deliveryFee = Math.max(0, Math.round(Number(b.deliveryFee || 0)));
      const totalAmount = subtotal + deliveryFee;

      const [created] = await db
        .insert(orders)
        .values({
          orderNumber,
          userId: null,
          orderType: b.orderType === 'wholesale' ? 'wholesale' : 'retail',
          customerName,
          phone,
          email: String(b.email || '').trim(),
          businessName: String(b.businessName || '').trim(),
          deliveryAddress: String(b.deliveryAddress || 'Confirmed via WhatsApp').trim(),
          district: String(b.district || 'Kigali').trim(),
          orderNotes: String(b.orderNotes || 'Manually recorded WhatsApp order').trim(),
          internalNotes: String(b.internalNotes || '').trim(),
          paymentMethod: String(b.paymentMethod || 'whatsapp_direct'),
          paymentStatus: String(b.paymentStatus || 'unpaid'),
          paymentReference: String(b.paymentReference || '').trim(),
          orderStatus: String(b.orderStatus || 'confirmed'),
          subtotal,
          deliveryFee,
          totalAmount,
          hasUnpricedItems: totalAmount === 0,
        })
        .returning();

      const insertedItems = await db
        .insert(orderItems)
        .values(
          normalizedItems.map((it) => ({
            orderId: created.id,
            ...it,
          }))
        )
        .returning();

      if (b.deductStock !== false) {
        const productIds = normalizedItems
          .map((it) => it.productId)
          .filter((id): id is number => id !== null && id > 0);
        if (productIds.length > 0) {
          const prodRows = await db
            .select()
            .from(products)
            .where(inArray(products.id, productIds));
          const prodMap = new Map(prodRows.map((p) => [p.id, p]));
          for (const item of normalizedItems) {
            if (!item.productId) continue;
            const prod = prodMap.get(item.productId);
            if (prod && prod.stockQuantity > 0) {
              const nextStock = Math.max(0, prod.stockQuantity - item.quantity);
              await db
                .update(products)
                .set({
                  stockQuantity: nextStock,
                  availabilityStatus:
                    nextStock === 0 && prod.availabilityStatus === 'in_stock'
                      ? 'out_of_stock'
                      : prod.availabilityStatus,
                  updatedAt: new Date(),
                })
                .where(eq(products.id, prod.id));

              await db.insert(inventoryMovements).values({
                productId: prod.id,
                movementType: 'order_deduction',
                quantityChange: -Math.min(prod.stockQuantity, item.quantity),
                previousStock: prod.stockQuantity,
                newStock: nextStock,
                reason: `WhatsApp Order ${orderNumber}`,
                performedBy: req.appUser!.id,
              });
            }
          }
        }
      }

      await recordAuditLog({
        actor: req.appUser,
        action: 'record_whatsapp_order',
        entityType: 'order',
        entityId: created.orderNumber,
        details: {
          customerName: created.customerName,
          orderType: created.orderType,
          totalAmount: created.totalAmount,
        },
      });

      res.status(201).json({ ...created, items: insertedItems });
    } catch (err) {
      console.error('Record WhatsApp order failed:', err);
      res.status(400).json({ error: 'Failed to record WhatsApp order' });
    }
  }
);

adminRouter.put(
  '/orders/:id',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body || {};
      const [updated] = await db
        .update(orders)
        .set({
          orderStatus: b.orderStatus !== undefined ? String(b.orderStatus) : undefined,
          paymentStatus:
            b.paymentStatus !== undefined ? String(b.paymentStatus) : undefined,
          paymentReference:
            b.paymentReference !== undefined
              ? String(b.paymentReference)
              : undefined,
          internalNotes:
            b.internalNotes !== undefined ? String(b.internalNotes) : undefined,
          customerName:
            b.customerName !== undefined ? String(b.customerName) : undefined,
          phone: b.phone !== undefined ? String(b.phone) : undefined,
          deliveryAddress:
            b.deliveryAddress !== undefined ? String(b.deliveryAddress) : undefined,
          district: b.district !== undefined ? String(b.district) : undefined,
          subtotal:
            b.subtotal !== undefined ? Math.max(0, Number(b.subtotal)) : undefined,
          deliveryFee:
            b.deliveryFee !== undefined
              ? Math.max(0, Number(b.deliveryFee))
              : undefined,
          totalAmount:
            b.totalAmount !== undefined
              ? Math.max(0, Number(b.totalAmount))
              : undefined,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Order not found' });

      await recordAuditLog({
        actor: req.appUser,
        action: 'update_order',
        entityType: 'order',
        entityId: updated.orderNumber,
        details: {
          orderStatus: updated.orderStatus,
          paymentStatus: updated.paymentStatus,
        },
      });

      res.json(updated);
    } catch (err) {
      console.error('Update order failed:', err);
      res.status(400).json({ error: 'Failed to update order' });
    }
  }
);

// 5. Quotation Management
adminRouter.get(
  '/quotations',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (_req, res) => {
    try {
      const rows = await db
        .select()
        .from(quotations)
        .orderBy(desc(quotations.createdAt));
      res.json(rows);
    } catch (err) {
      console.error('Admin quotations failed:', err);
      res.status(500).json({ error: 'Failed to load quotations' });
    }
  }
);

adminRouter.post(
  '/quotations',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (req: AuthRequest, res) => {
    try {
      const b = req.body || {};
      if (!b.customerName || !b.phone) {
        return res
          .status(400)
          .json({ error: 'Customer name and phone number are required' });
      }
      const rawItems: QuotationLineItemRecord[] = Array.isArray(b.items)
        ? b.items.map((it: Partial<QuotationLineItemRecord>) => {
            const quantity = Math.max(1, Math.round(Number(it.quantity || 1)));
            const unitPrice = Math.max(0, Math.round(Number(it.unitPrice || 0)));
            return {
              productName: String(it.productName || '').trim() || 'Packaging Item',
              sku: String(it.sku || '').trim(),
              size: String(it.size || '').trim(),
              quantity,
              unitPrice,
              lineTotal: quantity * unitPrice,
            };
          })
        : [];

      const discountAmount = Math.max(0, Math.round(Number(b.discountAmount || 0)));
      const itemsSubtotal = rawItems.reduce((s, it) => s + it.lineTotal, 0);
      const proposedUnitPrice =
        b.proposedUnitPrice !== null &&
        b.proposedUnitPrice !== '' &&
        b.proposedUnitPrice !== undefined
          ? Math.max(0, Math.round(Number(b.proposedUnitPrice)))
          : rawItems[0]?.unitPrice ?? null;
      const proposedQuantity =
        b.proposedQuantity !== null &&
        b.proposedQuantity !== '' &&
        b.proposedQuantity !== undefined
          ? Math.max(1, Math.round(Number(b.proposedQuantity)))
          : rawItems.reduce((s, it) => s + it.quantity, 0) ||
            Math.max(1, Math.round(Number(b.estimatedQuantity || 1)));

      const computedTotal =
        rawItems.length > 0
          ? Math.max(0, itemsSubtotal - discountAmount)
          : proposedUnitPrice !== null && proposedQuantity !== null
            ? Math.max(0, proposedUnitPrice * proposedQuantity - discountAmount)
            : null;

      const quoteNumber = `EPQ-${Date.now().toString().slice(-6)}-${Math.floor(
        100 + Math.random() * 900
      )}`;

      const productInterested =
        String(b.productInterested || '').trim() ||
        rawItems.map((it) => `${it.productName} (${it.quantity})`).join(', ') ||
        'Custom Wholesale Quotation';

      const [created] = await db
        .insert(quotations)
        .values({
          quoteNumber,
          customerName: String(b.customerName).trim(),
          companyName: String(b.companyName || '').trim(),
          phone: String(b.phone).trim(),
          email: String(b.email || '').trim(),
          productInterested,
          estimatedQuantity: Math.max(1, Number(b.estimatedQuantity || proposedQuantity || 1)),
          preferredSize: String(b.preferredSize || rawItems[0]?.size || '').trim(),
          additionalRequirements: String(b.additionalRequirements || '').trim(),
          status: String(b.status || 'quotation_sent'),
          items: rawItems,
          discountAmount,
          proposedUnitPrice,
          proposedQuantity,
          proposedTotal:
            b.proposedTotal !== null &&
            b.proposedTotal !== '' &&
            b.proposedTotal !== undefined
              ? Math.max(0, Math.round(Number(b.proposedTotal)))
              : computedTotal,
          adminNotes: String(b.adminNotes || '').trim(),
          validUntil: String(b.validUntil || '').trim(),
        })
        .returning();

      await recordAuditLog({
        actor: req.appUser,
        action: 'create_quotation',
        entityType: 'quotation',
        entityId: created.quoteNumber,
        details: {
          customerName: created.customerName,
          proposedTotal: created.proposedTotal,
        },
      });

      res.status(201).json(created);
    } catch (err) {
      console.error('Create quotation failed:', err);
      res.status(400).json({ error: 'Failed to create quotation' });
    }
  }
);

adminRouter.put(
  '/quotations/:id',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body || {};

      const hasItems = Array.isArray(b.items);
      const rawItems: QuotationLineItemRecord[] | undefined = hasItems
        ? b.items.map((it: Partial<QuotationLineItemRecord>) => {
            const quantity = Math.max(1, Math.round(Number(it.quantity || 1)));
            const unitPrice = Math.max(0, Math.round(Number(it.unitPrice || 0)));
            return {
              productName: String(it.productName || '').trim() || 'Packaging Item',
              sku: String(it.sku || '').trim(),
              size: String(it.size || '').trim(),
              quantity,
              unitPrice,
              lineTotal: quantity * unitPrice,
            };
          })
        : undefined;

      const discountAmount =
        b.discountAmount !== undefined
          ? Math.max(0, Math.round(Number(b.discountAmount || 0)))
          : undefined;

      const proposedUnitPrice =
        b.proposedUnitPrice !== null &&
        b.proposedUnitPrice !== '' &&
        b.proposedUnitPrice !== undefined
          ? Math.max(0, Math.round(Number(b.proposedUnitPrice)))
          : null;
      const proposedQuantity =
        b.proposedQuantity !== null &&
        b.proposedQuantity !== '' &&
        b.proposedQuantity !== undefined
          ? Math.max(1, Math.round(Number(b.proposedQuantity)))
          : null;

      let proposedTotal: number | null | undefined;
      if (rawItems && rawItems.length > 0) {
        const sub = rawItems.reduce((s, it) => s + it.lineTotal, 0);
        proposedTotal = Math.max(0, sub - (discountAmount ?? 0));
      } else if (
        b.proposedTotal !== null &&
        b.proposedTotal !== '' &&
        b.proposedTotal !== undefined
      ) {
        proposedTotal = Math.max(0, Math.round(Number(b.proposedTotal)));
      } else if (proposedUnitPrice !== null && proposedQuantity !== null) {
        proposedTotal = Math.max(
          0,
          proposedUnitPrice * proposedQuantity - (discountAmount ?? 0)
        );
      } else {
        proposedTotal = null;
      }

      const [updated] = await db
        .update(quotations)
        .set({
          status: b.status !== undefined ? String(b.status) : undefined,
          items: rawItems !== undefined ? rawItems : undefined,
          discountAmount: discountAmount !== undefined ? discountAmount : undefined,
          proposedUnitPrice:
            b.proposedUnitPrice !== undefined ? proposedUnitPrice : undefined,
          proposedQuantity:
            b.proposedQuantity !== undefined ? proposedQuantity : undefined,
          proposedTotal:
            b.proposedTotal !== undefined ||
            hasItems ||
            (proposedUnitPrice !== null && proposedQuantity !== null)
              ? proposedTotal
              : undefined,
          adminNotes:
            b.adminNotes !== undefined ? String(b.adminNotes) : undefined,
          validUntil:
            b.validUntil !== undefined ? String(b.validUntil) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Quotation not found' });

      await recordAuditLog({
        actor: req.appUser,
        action: 'update_quotation',
        entityType: 'quotation',
        entityId: updated.quoteNumber,
        details: { status: updated.status, proposedTotal: updated.proposedTotal },
      });

      res.json(updated);
    } catch (err) {
      console.error('Update quotation failed:', err);
      res.status(400).json({ error: 'Failed to update quotation' });
    }
  }
);

adminRouter.post(
  '/quotations/:id/convert',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const rows = await db
        .select()
        .from(quotations)
        .where(eq(quotations.id, id))
        .limit(1);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      const quote = rows[0];
      if (quote.convertedOrderId) {
        return res
          .status(400)
          .json({ error: 'This quotation has already been converted to an order' });
      }

      const lineItems = Array.isArray(quote.items) && quote.items.length > 0
        ? quote.items
        : [
            {
              productName: quote.productInterested,
              sku: '',
              size: quote.preferredSize,
              quantity: quote.proposedQuantity ?? quote.estimatedQuantity,
              unitPrice: quote.proposedUnitPrice ?? 0,
              lineTotal:
                quote.proposedTotal ??
                (quote.proposedUnitPrice ?? 0) *
                  (quote.proposedQuantity ?? quote.estimatedQuantity),
            },
          ];

      const rawSubtotal = lineItems.reduce((s, it) => s + it.lineTotal, 0);
      const total =
        quote.proposedTotal !== null
          ? quote.proposedTotal
          : Math.max(0, rawSubtotal - (quote.discountAmount || 0));

      const orderNumber = `EP-Q-${Date.now().toString().slice(-6)}`;

      const [newOrder] = await db
        .insert(orders)
        .values({
          orderNumber,
          userId: quote.userId,
          orderType: 'wholesale',
          customerName: quote.customerName,
          phone: quote.phone,
          email: quote.email,
          businessName: quote.companyName,
          deliveryAddress: 'To be confirmed with customer',
          district: 'Kigali',
          orderNotes: `Converted from quotation ${quote.quoteNumber}.${quote.discountAmount ? ` Discount applied: RWF ${quote.discountAmount}.` : ''} ${quote.additionalRequirements}`.trim(),
          paymentMethod: 'arrange_direct',
          paymentStatus: 'unpaid',
          orderStatus: 'confirmed',
          subtotal: rawSubtotal,
          deliveryFee: 0,
          totalAmount: total,
          hasUnpricedItems: total === 0,
        })
        .returning();

      await db.insert(orderItems).values(
        lineItems.map((it) => ({
          orderId: newOrder.id,
          productId: quote.items?.length ? null : quote.productId,
          productName: it.productName,
          sku: it.sku || '',
          selectedSize: it.size || '',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.lineTotal,
        }))
      );

      const [updatedQuote] = await db
        .update(quotations)
        .set({
          status: 'completed',
          convertedOrderId: newOrder.id,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id))
        .returning();

      await recordAuditLog({
        actor: req.appUser,
        action: 'convert_quotation_to_order',
        entityType: 'quotation',
        entityId: quote.quoteNumber,
        details: { orderNumber: newOrder.orderNumber },
      });

      res.json({ quotation: updatedQuote, order: newOrder });
    } catch (err) {
      console.error('Convert quotation failed:', err);
      res.status(500).json({ error: 'Failed to convert quotation to order' });
    }
  }
);



// 6. Enquiries Management
adminRouter.get(
  '/enquiries',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (_req, res) => {
    try {
      const rows = await db
        .select()
        .from(enquiries)
        .orderBy(desc(enquiries.createdAt));
      res.json(rows);
    } catch (err) {
      console.error('Admin enquiries failed:', err);
      res.status(500).json({ error: 'Failed to load enquiries' });
    }
  }
);

adminRouter.put(
  '/enquiries/:id',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body || {};
      const [updated] = await db
        .update(enquiries)
        .set({
          status: b.status !== undefined ? String(b.status) : undefined,
          adminNotes:
            b.adminNotes !== undefined ? String(b.adminNotes) : undefined,
        })
        .where(eq(enquiries.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Enquiry not found' });

      await recordAuditLog({
        actor: req.appUser,
        action: 'update_enquiry',
        entityType: 'enquiry',
        entityId: id,
        details: { status: updated.status },
      });

      res.json(updated);
    } catch (err) {
      console.error('Update enquiry failed:', err);
      res.status(400).json({ error: 'Failed to update enquiry' });
    }
  }
);

// 7. Customer Management
adminRouter.get(
  '/customers',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (_req, res) => {
    try {
      const [allUsers, allOrders, allQuotes] = await Promise.all([
        db.select().from(users).orderBy(desc(users.createdAt)),
        db.select().from(orders).orderBy(desc(orders.createdAt)),
        db.select().from(quotations),
      ]);

      const customerMap = new Map<
        string,
        {
          id: number | null;
          key: string;
          name: string;
          phone: string;
          email: string;
          businessName: string;
          deliveryAddress: string;
          district: string;
          orderCount: number;
          quoteCount: number;
          totalSpent: number;
          lastOrderDate: string | null;
          isRegistered: boolean;
        }
      >();

      for (const u of allUsers) {
        if (u.role !== 'customer') continue;
        const key = u.email || u.phone || `u-${u.id}`;
        customerMap.set(key, {
          id: u.id,
          key,
          name: u.fullName || u.email,
          phone: u.phone,
          email: u.email,
          businessName: u.businessName,
          deliveryAddress: u.deliveryAddress,
          district: u.district,
          orderCount: 0,
          quoteCount: 0,
          totalSpent: 0,
          lastOrderDate: null,
          isRegistered: true,
        });
      }

      for (const o of allOrders) {
        const key = o.email || o.phone || o.customerName;
        const cur = customerMap.get(key) || {
          id: o.userId ?? null,
          key,
          name: o.customerName,
          phone: o.phone,
          email: o.email,
          businessName: o.businessName,
          deliveryAddress: o.deliveryAddress,
          district: o.district,
          orderCount: 0,
          quoteCount: 0,
          totalSpent: 0,
          lastOrderDate: null,
          isRegistered: false,
        };
        cur.orderCount += 1;
        if (o.orderStatus !== 'cancelled') {
          cur.totalSpent += o.totalAmount;
        }
        if (!cur.lastOrderDate) {
          cur.lastOrderDate = new Date(o.createdAt).toISOString();
        }
        customerMap.set(key, cur);
      }

      for (const q of allQuotes) {
        const key = q.email || q.phone || q.customerName;
        const cur = customerMap.get(key);
        if (cur) {
          cur.quoteCount += 1;
        }
      }

      res.json(Array.from(customerMap.values()));
    } catch (err) {
      console.error('Admin customers failed:', err);
      res.status(500).json({ error: 'Failed to load customers' });
    }
  }
);

adminRouter.put(
  '/customers/:id',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Customer account not found' });
      }
      if (rows[0].role !== 'customer') {
        return res
          .status(403)
          .json({ error: 'Use Users & Roles to edit staff accounts' });
      }
      const b = req.body || {};
      const [updated] = await db
        .update(users)
        .set({
          fullName:
            b.fullName !== undefined ? String(b.fullName).trim() : undefined,
          phone: b.phone !== undefined ? String(b.phone).trim() : undefined,
          businessName:
            b.businessName !== undefined
              ? String(b.businessName).trim()
              : undefined,
          deliveryAddress:
            b.deliveryAddress !== undefined
              ? String(b.deliveryAddress).trim()
              : undefined,
          district:
            b.district !== undefined ? String(b.district).trim() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          phone: users.phone,
          businessName: users.businessName,
          deliveryAddress: users.deliveryAddress,
          district: users.district,
        });

      await recordAuditLog({
        actor: req.appUser,
        action: 'update_customer',
        entityType: 'customer',
        entityId: id,
        details: { fullName: updated.fullName, phone: updated.phone },
      });

      res.json(updated);
    } catch (err) {
      console.error('Customer update failed:', err);
      res.status(400).json({ error: 'Failed to update customer' });
    }
  }
);

adminRouter.get(
  '/customers/history',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'sales_staff']),
  async (req, res) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : null;
      const email = String(req.query.email || '').trim().toLowerCase();
      const phone = String(req.query.phone || '').trim();

      const orderConds = [];
      const quoteConds = [];
      if (userId) {
        orderConds.push(eq(orders.userId, userId));
        quoteConds.push(eq(quotations.userId, userId));
      }
      if (email) {
        orderConds.push(eq(orders.email, email));
        quoteConds.push(eq(quotations.email, email));
      }
      if (phone) {
        orderConds.push(eq(orders.phone, phone));
        quoteConds.push(eq(quotations.phone, phone));
      }

      const [custOrders, custQuotes] = await Promise.all([
        orderConds.length
          ? db
              .select()
              .from(orders)
              .where(or(...orderConds))
              .orderBy(desc(orders.createdAt))
          : Promise.resolve([]),
        quoteConds.length
          ? db
              .select()
              .from(quotations)
              .where(or(...quoteConds))
              .orderBy(desc(quotations.createdAt))
          : Promise.resolve([]),
      ]);

      res.json({ orders: custOrders, quotations: custQuotes });
    } catch (err) {
      console.error('Customer history failed:', err);
      res.status(500).json({ error: 'Failed to load customer history' });
    }
  }
);

// 8. Inventory Management
adminRouter.get(
  '/inventory',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'inventory_manager']),
  async (_req, res) => {
    try {
      const [allProds, movements] = await Promise.all([
        db.select().from(products).orderBy(asc(products.name)),
        db
          .select()
          .from(inventoryMovements)
          .orderBy(desc(inventoryMovements.createdAt))
          .limit(100),
      ]);
      const prodMap = new Map(allProds.map((p) => [p.id, p]));
      res.json({
        products: allProds,
        movements: movements.map((m) => ({
          ...m,
          productName: prodMap.get(m.productId)?.name ?? 'Deleted Product',
          sku: prodMap.get(m.productId)?.sku ?? '',
        })),
      });
    } catch (err) {
      console.error('Inventory load failed:', err);
      res.status(500).json({ error: 'Failed to load inventory' });
    }
  }
);

adminRouter.post(
  '/inventory/adjust',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'inventory_manager']),
  async (req: AuthRequest, res) => {
    try {
      const { productId, movementType, quantity, reason } = req.body || {};
      const pid = Number(productId);
      const qty = Math.abs(Math.round(Number(quantity || 0)));
      if (!pid || qty <= 0) {
        return res
          .status(400)
          .json({ error: 'Valid product and positive quantity are required' });
      }
      const rows = await db
        .select()
        .from(products)
        .where(eq(products.id, pid))
        .limit(1);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      const prod = rows[0];
      const prev = prod.stockQuantity;
      let next = prev;
      let delta = 0;

      if (movementType === 'addition') {
        next = prev + qty;
        delta = qty;
      } else if (movementType === 'reduction') {
        next = Math.max(0, prev - qty);
        delta = next - prev;
      } else {
        // adjustment sets exact stock level
        next = qty;
        delta = next - prev;
      }

      const [updated] = await db
        .update(products)
        .set({
          stockQuantity: next,
          availabilityStatus:
            next > 0
              ? 'in_stock'
              : prod.availabilityStatus === 'made_to_order'
                ? 'made_to_order'
                : 'out_of_stock',
          isSample: false,
          updatedAt: new Date(),
        })
        .where(eq(products.id, pid))
        .returning();

      const [movement] = await db
        .insert(inventoryMovements)
        .values({
          productId: pid,
          movementType: String(movementType || 'adjustment'),
          quantityChange: delta,
          previousStock: prev,
          newStock: next,
          reason: String(reason || 'Manual stock update').trim(),
          performedBy: req.appUser!.id,
        })
        .returning();

      await recordAuditLog({
        actor: req.appUser,
        action: 'adjust_inventory',
        entityType: 'product',
        entityId: prod.sku,
        details: { movementType, previous: prev, next, reason },
      });

      res.json({ product: updated, movement });
    } catch (err) {
      console.error('Inventory adjust failed:', err);
      res.status(500).json({ error: 'Failed to update stock' });
    }
  }
);

// 9. Reports & Analytics
adminRouter.get(
  '/reports',
  requireRole(['super_admin', 'business_owner', 'business_manager', 'inventory_manager']),
  async (req, res) => {
    try {
      const fromStr = req.query.from ? String(req.query.from) : '';
      const toStr = req.query.to ? String(req.query.to) : '';
      const fromDate = fromStr ? new Date(fromStr) : null;
      const toDate = toStr ? new Date(`${toStr}T23:59:59.999Z`) : null;

      const [allOrders, allItems, allProds, allCats, allQuotes, allClicks] =
        await Promise.all([
          db.select().from(orders).orderBy(desc(orders.createdAt)),
          db.select().from(orderItems),
          db.select().from(products),
          db.select().from(categories),
          db.select().from(quotations).orderBy(desc(quotations.createdAt)),
          db.select().from(whatsappClicks).orderBy(desc(whatsappClicks.createdAt)),
        ]);

      const filteredOrders = allOrders.filter((o) => {
        const d = new Date(o.createdAt);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });

      const filteredQuotes = allQuotes.filter((q) => {
        const d = new Date(q.createdAt);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });

      const filteredClicks = allClicks.filter((c) => {
        const d = new Date(c.createdAt);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });

      const orderIdSet = new Set(filteredOrders.map((o) => o.id));
      const filteredItems = allItems.filter((it) => orderIdSet.has(it.orderId));

      const activeOrders = filteredOrders.filter(
        (o) => o.orderStatus !== 'cancelled'
      );
      const paidOrders = activeOrders.filter((o) => o.paymentStatus === 'paid');
      const outstandingOrders = activeOrders.filter((o) =>
        ['unpaid', 'pending', 'partially_paid'].includes(o.paymentStatus)
      );
      const wholesaleOrders = activeOrders.filter(
        (o) => o.orderType === 'wholesale'
      );
      const retailOrders = activeOrders.filter((o) => o.orderType === 'retail');

      const prodMap = new Map(allProds.map((p) => [p.id, p]));
      const catMap = new Map(allCats.map((c) => [c.id, c]));

      const productSalesMap = new Map<
        string,
        { name: string; sku: string; units: number; revenue: number }
      >();
      const categorySalesMap = new Map<
        string,
        { category: string; units: number; revenue: number }
      >();

      for (const it of filteredItems) {
        const key = it.sku || it.productName;
        const pEntry = productSalesMap.get(key) || {
          name: it.productName,
          sku: it.sku,
          units: 0,
          revenue: 0,
        };
        pEntry.units += it.quantity;
        pEntry.revenue += it.lineTotal;
        productSalesMap.set(key, pEntry);

        const prod = it.productId ? prodMap.get(it.productId) : undefined;
        const catName =
          (prod?.categoryId ? catMap.get(prod.categoryId)?.name : null) ||
          'Uncategorized';
        const cEntry = categorySalesMap.get(catName) || {
          category: catName,
          units: 0,
          revenue: 0,
        };
        cEntry.units += it.quantity;
        cEntry.revenue += it.lineTotal;
        categorySalesMap.set(catName, cEntry);
      }

      // WhatsApp Enquiry Clicks Analytics
      const clickProductMap = new Map<
        string,
        {
          productName: string;
          sku: string;
          orderClicks: number;
          quoteClicks: number;
          totalClicks: number;
          totalQuantityRequested: number;
        }
      >();
      for (const c of filteredClicks) {
        if (!c.productName) continue;
        const key = c.sku || c.productName;
        const entry = clickProductMap.get(key) || {
          productName: c.productName,
          sku: c.sku,
          orderClicks: 0,
          quoteClicks: 0,
          totalClicks: 0,
          totalQuantityRequested: 0,
        };
        entry.totalClicks += 1;
        entry.totalQuantityRequested += c.quantity || 1;
        if (c.eventType === 'product_order') entry.orderClicks += 1;
        if (c.eventType === 'wholesale_quote') entry.quoteClicks += 1;
        clickProductMap.set(key, entry);
      }

      // Monthly series (last 6 months)
      const monthMap = new Map<
        string,
        { month: string; orders: number; retail: number; wholesale: number }
      >();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(key, {
          month: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          orders: 0,
          retail: 0,
          wholesale: 0,
        });
      }
      for (const o of activeOrders) {
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthMap.get(key);
        if (bucket) {
          bucket.orders += 1;
          if (o.orderType === 'wholesale') bucket.wholesale += o.totalAmount;
          else bucket.retail += o.totalAmount;
        }
      }

      // Inventory valuation report
      const inventoryReport = allProds.map((p) => {
        const unitCost = p.costPrice ?? p.unitPrice ?? 0;
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category:
            (p.categoryId ? catMap.get(p.categoryId)?.name : null) ||
            'Uncategorized',
          stockQuantity: p.stockQuantity,
          lowStockThreshold: p.lowStockThreshold,
          costPrice: p.costPrice,
          unitPrice: p.unitPrice,
          valuation: p.stockQuantity * unitCost,
          availabilityStatus: p.availabilityStatus,
        };
      });
      const inventoryValuation = inventoryReport.reduce(
        (sum, r) => sum + r.valuation,
        0
      );

      // Customer report
      const custAgg = new Map<
        string,
        {
          customerName: string;
          businessName: string;
          phone: string;
          orderCount: number;
          totalSpend: number;
        }
      >();
      for (const o of activeOrders) {
        const key = o.email || o.phone || o.customerName;
        const entry = custAgg.get(key) || {
          customerName: o.customerName,
          businessName: o.businessName,
          phone: o.phone,
          orderCount: 0,
          totalSpend: 0,
        };
        entry.orderCount += 1;
        entry.totalSpend += o.totalAmount;
        custAgg.set(key, entry);
      }

      res.json({
        summary: {
          totalOrders: activeOrders.length,
          paidOrdersCount: paidOrders.length,
          confirmedPaidRevenue: paidOrders.reduce((s, o) => s + o.totalAmount, 0),
          recordedSales: activeOrders.reduce((s, o) => s + o.totalAmount, 0),
          outstandingAmount: outstandingOrders.reduce(
            (s, o) => s + o.totalAmount,
            0
          ),
          wholesaleCount: wholesaleOrders.length,
          wholesaleValue: wholesaleOrders.reduce(
            (s, o) => s + o.totalAmount,
            0
          ),
          retailCount: retailOrders.length,
          retailValue: retailOrders.reduce((s, o) => s + o.totalAmount, 0),
          totalQuotations: filteredQuotes.length,
          acceptedQuotations: filteredQuotes.filter((q) =>
            ['accepted', 'completed'].includes(q.status)
          ).length,
          lowStockCount: allProds.filter(
            (p) =>
              p.availabilityStatus !== 'sample_listing' &&
              p.stockQuantity <= p.lowStockThreshold
          ).length,
          outOfStockCount: allProds.filter(
            (p) =>
              p.availabilityStatus === 'out_of_stock' ||
              (p.availabilityStatus !== 'sample_listing' && p.stockQuantity === 0)
          ).length,
          inventoryValuation,
          totalWhatsappClicks: filteredClicks.length,
          productOrderClicks: filteredClicks.filter(
            (c) => c.eventType === 'product_order'
          ).length,
          wholesaleQuoteClicks: filteredClicks.filter(
            (c) => c.eventType === 'wholesale_quote'
          ).length,
          whatsappContactClicks: filteredClicks.filter(
            (c) => c.eventType === 'whatsapp_contact'
          ).length,
        },
        productSales: Array.from(productSalesMap.values()).sort(
          (a, b) => b.revenue - a.revenue
        ),
        categorySales: Array.from(categorySalesMap.values()).sort(
          (a, b) => b.revenue - a.revenue
        ),
        whatsappTopProducts: Array.from(clickProductMap.values()).sort(
          (a, b) => b.totalClicks - a.totalClicks
        ),
        whatsappRecentClicks: filteredClicks.slice(0, 50),
        outstandingOrders,
        monthlySeries: Array.from(monthMap.values()),
        inventoryReport,
        quotationsReport: filteredQuotes,
        customersSummary: Array.from(custAgg.values()).sort(
          (a, b) => b.totalSpend - a.totalSpend
        ),
      });
    } catch (err) {
      console.error('Reports failed:', err);
      res.status(500).json({ error: 'Failed to generate reports' });
    }
  }
);

// 10. Media Library
adminRouter.get('/media', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: mediaAssets.id,
        filename: mediaAssets.filename,
        mimeType: mediaAssets.mimeType,
        altText: mediaAssets.altText,
        folder: mediaAssets.folder,
        createdAt: mediaAssets.createdAt,
      })
      .from(mediaAssets)
      .orderBy(desc(mediaAssets.createdAt));
    res.json(
      rows.map((r) => ({
        ...r,
        url: `/api/media/${r.id}`,
      }))
    );
  } catch (err) {
    console.error('Media list failed:', err);
    res.status(500).json({ error: 'Failed to load media library' });
  }
});

adminRouter.put(
  '/media/:id',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body || {};
      const [updated] = await db
        .update(mediaAssets)
        .set({
          altText:
            b.altText !== undefined ? String(b.altText).slice(0, 200) : undefined,
          folder:
            b.folder !== undefined ? String(b.folder).slice(0, 60) : undefined,
        })
        .where(eq(mediaAssets.id, id))
        .returning({
          id: mediaAssets.id,
          filename: mediaAssets.filename,
          mimeType: mediaAssets.mimeType,
          altText: mediaAssets.altText,
          folder: mediaAssets.folder,
          createdAt: mediaAssets.createdAt,
        });
      if (!updated) return res.status(404).json({ error: 'Media asset not found' });
      res.json({ ...updated, url: `/api/media/${updated.id}` });
    } catch (err) {
      console.error('Media update failed:', err);
      res.status(400).json({ error: 'Failed to update media asset' });
    }
  }
);

adminRouter.post(
  '/media/:id/replace',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { filename, mimeType, dataBase64 } = req.body || {};
      if (!filename || !mimeType || !dataBase64) {
        return res.status(400).json({ error: 'Missing replacement image payload' });
      }
      const cleanBase64 = String(dataBase64).replace(/^data:[^;]+;base64,/, '');
      const [updated] = await db
        .update(mediaAssets)
        .set({
          filename: String(filename).slice(0, 180),
          mimeType: String(mimeType),
          dataBase64: cleanBase64,
        })
        .where(eq(mediaAssets.id, id))
        .returning({
          id: mediaAssets.id,
          filename: mediaAssets.filename,
          mimeType: mediaAssets.mimeType,
          altText: mediaAssets.altText,
          folder: mediaAssets.folder,
        });
      if (!updated) return res.status(404).json({ error: 'Media asset not found' });

      await recordAuditLog({
        actor: req.appUser,
        action: 'replace_media',
        entityType: 'media',
        entityId: id,
        details: { filename: updated.filename },
      });

      res.json({ ...updated, url: `/api/media/${updated.id}` });
    } catch (err) {
      console.error('Media replace failed:', err);
      res.status(400).json({ error: 'Failed to replace media asset' });
    }
  }
);

adminRouter.delete(
  '/media/:id',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
      await recordAuditLog({
        actor: req.appUser,
        action: 'delete_media',
        entityType: 'media',
        entityId: id,
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Media delete failed:', err);
      res.status(500).json({ error: 'Failed to delete media' });
    }
  }
);

// 11. Settings & Website Content
adminRouter.get('/settings', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'settings'))
      .limit(1);
    res.json({
      ...DEFAULT_WEBSITE_SETTINGS,
      ...(rows[0]?.value ?? {}),
    });
  } catch (err) {
    console.error('Settings get failed:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

adminRouter.put(
  '/settings',
  requireRole(['super_admin', 'business_owner']),
  async (req: AuthRequest, res) => {
    try {
      const value = {
        ...DEFAULT_WEBSITE_SETTINGS,
        ...(req.body || {}),
      };
      await db
        .insert(siteSettings)
        .values({
          key: 'settings',
          value: value as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: {
            value: value as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          },
        });

      await recordAuditLog({
        actor: req.appUser,
        action: 'update_settings',
        entityType: 'settings',
        entityId: 'settings',
      });

      res.json(value);
    } catch (err) {
      console.error('Settings save failed:', err);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  }
);

adminRouter.get('/content', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'content'))
      .limit(1);
    res.json({
      ...DEFAULT_WEBSITE_CONTENT,
      ...(rows[0]?.value ?? {}),
    });
  } catch (err) {
    console.error('Content get failed:', err);
    res.status(500).json({ error: 'Failed to load website content' });
  }
});

adminRouter.put(
  '/content',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const value = {
        ...DEFAULT_WEBSITE_CONTENT,
        ...(req.body || {}),
      };
      await db
        .insert(siteSettings)
        .values({
          key: 'content',
          value: value as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: {
            value: value as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          },
        });

      await recordAuditLog({
        actor: req.appUser,
        action: 'update_content',
        entityType: 'content',
        entityId: 'content',
      });

      res.json(value);
    } catch (err) {
      console.error('Content save failed:', err);
      res.status(500).json({ error: 'Failed to save website content' });
    }
  }
);

// 12. Users & Roles (Super Admin & Business Owner)
adminRouter.get(
  '/users',
  requireRole(['super_admin', 'business_owner']),
  async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: users.id,
          uid: users.uid,
          email: users.email,
          fullName: users.fullName,
          phone: users.phone,
          businessName: users.businessName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));
      res.json(rows);
    } catch (err) {
      console.error('Users list failed:', err);
      res.status(500).json({ error: 'Failed to load users' });
    }
  }
);

adminRouter.post(
  '/users',
  requireRole(['super_admin', 'business_owner']),
  async (req: AuthRequest, res) => {
    try {
      const { email, password, fullName, phone, role } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required' });
      }
      if (!password || String(password).length < 8) {
        return res
          .status(400)
          .json({ error: 'Password must be at least 8 characters' });
      }
      const validRoles: UserRole[] = [
        'super_admin',
        'business_owner',
        'business_manager',
        'sales_staff',
        'inventory_manager',
        'customer',
      ];
      const assignedRole = (role || 'sales_staff') as UserRole;
      if (!validRoles.includes(assignedRole)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      if (
        assignedRole === 'super_admin' &&
        req.appUser!.role !== 'super_admin'
      ) {
        return res.status(403).json({
          error: 'Only a Super Admin can create another Super Admin account',
        });
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);
      if (existing.length > 0) {
        return res
          .status(409)
          .json({ error: 'An account with this email already exists' });
      }

      const [created] = await db
        .insert(users)
        .values({
          uid: `local_${crypto.randomUUID()}`,
          email: cleanEmail,
          passwordHash: hashPassword(String(password)),
          fullName: String(fullName || '').trim(),
          phone: String(phone || '').trim(),
          role: assignedRole,
          isActive: true,
        })
        .returning({
          id: users.id,
          uid: users.uid,
          email: users.email,
          fullName: users.fullName,
          phone: users.phone,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        });

      await recordAuditLog({
        actor: req.appUser,
        action: 'create_user',
        entityType: 'user',
        entityId: created.id,
        details: { email: created.email, role: created.role },
      });

      res.status(201).json(created);
    } catch (err) {
      console.error('Create staff user failed:', err);
      res.status(400).json({ error: 'Failed to create staff account' });
    }
  }
);

adminRouter.put(
  '/users/:id/role',
  requireRole(['super_admin', 'business_owner']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { role, isActive } = req.body || {};
      const validRoles: UserRole[] = [
        'super_admin',
        'business_owner',
        'business_manager',
        'sales_staff',
        'inventory_manager',
        'customer',
      ];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      if (id === req.appUser!.id && role && role !== req.appUser!.role) {
        return res
          .status(400)
          .json({ error: 'You cannot change your own active administrative role' });
      }

      const targetRows = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (targetRows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (
        (targetRows[0].role === 'super_admin' || role === 'super_admin') &&
        req.appUser!.role !== 'super_admin'
      ) {
        return res.status(403).json({
          error: 'Only a Super Admin can modify or assign the Super Admin role',
        });
      }

      const [updated] = await db
        .update(users)
        .set({
          role: role ?? undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          uid: users.uid,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
        });

      await recordAuditLog({
        actor: req.appUser,
        action: 'update_user_role',
        entityType: 'user',
        entityId: id,
        details: { role: updated.role, isActive: updated.isActive },
      });

      res.json(updated);
    } catch (err) {
      console.error('Update user role failed:', err);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

// 13. Audit Logs
adminRouter.get(
  '/audit-logs',
  requireRole(['super_admin', 'business_owner', 'business_manager']),
  async (_req, res) => {
    try {
      const rows = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(200);
      res.json(rows);
    } catch (err) {
      console.error('Audit logs fetch failed:', err);
      res.status(500).json({ error: 'Failed to load audit logs' });
    }
  }
);
