import { Router } from 'express';
import { asc, desc, eq, inArray } from 'drizzle-orm';
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
} from '../../db/schema.ts';
import {
  DEFAULT_WEBSITE_CONTENT,
  DEFAULT_WEBSITE_SETTINGS,
} from '../../db/seed.ts';
import {
  AuthRequest,
  requireAuth,
  requireRole,
  STAFF_ROLES,
  UserRole,
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
    ] = await Promise.all([
      db.select().from(products),
      db.select().from(categories),
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(orderItems),
      db.select().from(enquiries).orderBy(desc(enquiries.createdAt)),
      db.select().from(quotations).orderBy(desc(quotations.createdAt)),
    ]);

    const totalProducts = allProducts.length;
    const activeProducts = allProducts.filter((p) => p.isActive).length;
    const totalCategories = allCategories.length;
    const totalOrders = allOrders.length;
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

    const verifiedRevenue = allOrders
      .filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled')
      .reduce((acc, o) => acc + o.totalAmount, 0);

    const recordedSalesTotal = allOrders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((acc, o) => acc + o.totalAmount, 0);

    // Best-selling products
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
      .slice(0, 5);

    const lowStockProducts = allProducts.filter(
      (p) =>
        p.availabilityStatus !== 'sample_listing' &&
        p.stockQuantity <= p.lowStockThreshold
    );

    // Build last 7 days sales series
    const chartMap = new Map<string, { date: string; sales: number; orders: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      chartMap.set(iso, { date: iso, sales: 0, orders: 0 });
    }
    for (const o of allOrders) {
      if (o.orderStatus === 'cancelled') continue;
      const iso = new Date(o.createdAt).toISOString().slice(0, 10);
      const bucket = chartMap.get(iso);
      if (bucket) {
        bucket.orders += 1;
        if (o.paymentStatus === 'paid') {
          bucket.sales += o.totalAmount;
        }
      }
    }

    res.json({
      metrics: {
        totalProducts,
        activeProducts,
        totalCategories,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalEnquiries,
        pendingQuotations,
        verifiedRevenue,
        recordedSalesTotal,
      },
      salesSeries: Array.from(chartMap.values()),
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
  requireRole(['super_admin', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const b = req.body || {};
      if (!b.name || !b.sku) {
        return res.status(400).json({ error: 'Product name and SKU are required' });
      }
      const slug = b.slug ? slugify(b.slug) : `${slugify(b.name)}-${Date.now().toString().slice(-4)}`;
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
  requireRole(['super_admin', 'business_manager']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body || {};
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

      if (!updated) return res.status(404).json({ error: 'Product not found' });

      await recordAuditLog({
        actor: req.appUser,
        action: 'update_product',
        entityType: 'product',
        entityId: id,
        details: { name: updated.name, sku: updated.sku },
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
  requireRole(['super_admin', 'business_manager']),
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
  requireRole(['super_admin', 'business_manager']),
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
  requireRole(['super_admin', 'business_manager']),
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
  requireRole(['super_admin', 'business_manager']),
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
  requireRole(['super_admin', 'business_manager']),
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
  requireRole(['super_admin', 'business_manager', 'sales_staff']),
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
  requireRole(['super_admin', 'business_manager', 'sales_staff']),
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

adminRouter.put(
  '/orders/:id',
  requireRole(['super_admin', 'business_manager', 'sales_staff']),
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
  requireRole(['super_admin', 'business_manager', 'sales_staff']),
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

adminRouter.put(
  '/quotations/:id',
  requireRole(['super_admin', 'business_manager', 'sales_staff']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body || {};
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
      const proposedTotal =
        b.proposedTotal !== null &&
        b.proposedTotal !== '' &&
        b.proposedTotal !== undefined
          ? Math.max(0, Math.round(Number(b.proposedTotal)))
          : proposedUnitPrice !== null && proposedQuantity !== null
            ? proposedUnitPrice * proposedQuantity
            : null;

      const [updated] = await db
        .update(quotations)
        .set({
          status: b.status !== undefined ? String(b.status) : undefined,
          proposedUnitPrice:
            b.proposedUnitPrice !== undefined ? proposedUnitPrice : undefined,
          proposedQuantity:
            b.proposedQuantity !== undefined ? proposedQuantity : undefined,
          proposedTotal:
            b.proposedTotal !== undefined ||
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
  requireRole(['super_admin', 'business_manager', 'sales_staff']),
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

      const qty = quote.proposedQuantity ?? quote.estimatedQuantity;
      const unitPrice = quote.proposedUnitPrice ?? 0;
      const total = quote.proposedTotal ?? unitPrice * qty;
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
          orderNotes: `Converted from quotation ${quote.quoteNumber}. ${quote.additionalRequirements}`,
          paymentMethod: 'arrange_direct',
          paymentStatus: 'unpaid',
          orderStatus: 'confirmed',
          subtotal: total,
          deliveryFee: 0,
          totalAmount: total,
          hasUnpricedItems: unitPrice === 0,
        })
        .returning();

      await db.insert(orderItems).values({
        orderId: newOrder.id,
        productId: quote.productId,
        productName: quote.productInterested,
        sku: '',
        selectedSize: quote.preferredSize,
        quantity: qty,
        unitPrice,
        lineTotal: total,
      });

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
  requireRole(['super_admin', 'business_manager', 'sales_staff']),
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
  requireRole(['super_admin', 'business_manager', 'sales_staff']),
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
  requireRole(['super_admin', 'business_manager', 'sales_staff']),
  async (_req, res) => {
    try {
      const [allUsers, allOrders] = await Promise.all([
        db.select().from(users).orderBy(desc(users.createdAt)),
        db.select().from(orders).orderBy(desc(orders.createdAt)),
      ]);

      const customerMap = new Map<
        string,
        {
          key: string;
          name: string;
          phone: string;
          email: string;
          businessName: string;
          orderCount: number;
          totalSpent: number;
          lastOrderDate: string | null;
          isRegistered: boolean;
        }
      >();

      for (const u of allUsers) {
        if (u.role !== 'customer') continue;
        const key = u.email || u.phone || `u-${u.id}`;
        customerMap.set(key, {
          key,
          name: u.fullName || u.email,
          phone: u.phone,
          email: u.email,
          businessName: u.businessName,
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: null,
          isRegistered: true,
        });
      }

      for (const o of allOrders) {
        const key = o.email || o.phone || o.customerName;
        const cur = customerMap.get(key) || {
          key,
          name: o.customerName,
          phone: o.phone,
          email: o.email,
          businessName: o.businessName,
          orderCount: 0,
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

      res.json(Array.from(customerMap.values()));
    } catch (err) {
      console.error('Admin customers failed:', err);
      res.status(500).json({ error: 'Failed to load customers' });
    }
  }
);

// 8. Inventory Management
adminRouter.get(
  '/inventory',
  requireRole(['super_admin', 'business_manager', 'inventory_manager']),
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
  requireRole(['super_admin', 'business_manager', 'inventory_manager']),
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
  requireRole(['super_admin', 'business_manager', 'inventory_manager']),
  async (req, res) => {
    try {
      const fromStr = req.query.from ? String(req.query.from) : '';
      const toStr = req.query.to ? String(req.query.to) : '';
      const fromDate = fromStr ? new Date(fromStr) : null;
      const toDate = toStr ? new Date(`${toStr}T23:59:59.999Z`) : null;

      const [allOrders, allItems, allProds, allCats, allQuotes] =
        await Promise.all([
          db.select().from(orders).orderBy(desc(orders.createdAt)),
          db.select().from(orderItems),
          db.select().from(products),
          db.select().from(categories),
          db.select().from(quotations),
        ]);

      const filteredOrders = allOrders.filter((o) => {
        const d = new Date(o.createdAt);
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

      res.json({
        summary: {
          totalOrders: activeOrders.length,
          paidOrdersCount: paidOrders.length,
          verifiedRevenue: paidOrders.reduce((s, o) => s + o.totalAmount, 0),
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
          totalQuotations: allQuotes.length,
          acceptedQuotations: allQuotes.filter((q) =>
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
        },
        productSales: Array.from(productSalesMap.values()).sort(
          (a, b) => b.revenue - a.revenue
        ),
        categorySales: Array.from(categorySalesMap.values()).sort(
          (a, b) => b.revenue - a.revenue
        ),
        outstandingOrders,
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

adminRouter.delete(
  '/media/:id',
  requireRole(['super_admin', 'business_manager']),
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
  requireRole(['super_admin']),
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
  requireRole(['super_admin', 'business_manager']),
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

// 12. Users & Roles (Super Admin only)
adminRouter.get(
  '/users',
  requireRole(['super_admin']),
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

adminRouter.put(
  '/users/:id/role',
  requireRole(['super_admin']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { role, isActive } = req.body || {};
      const validRoles: UserRole[] = [
        'super_admin',
        'business_manager',
        'sales_staff',
        'inventory_manager',
        'customer',
      ];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      if (id === req.appUser!.id && role && role !== 'super_admin') {
        return res
          .status(400)
          .json({ error: 'You cannot demote your own active Super Admin account' });
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

      if (!updated) return res.status(404).json({ error: 'User not found' });

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
  requireRole(['super_admin', 'business_manager']),
  async (_req, res) => {
    try {
      const rows = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(150);
      res.json(rows);
    } catch (err) {
      console.error('Audit logs fetch failed:', err);
      res.status(500).json({ error: 'Failed to load audit logs' });
    }
  }
);
