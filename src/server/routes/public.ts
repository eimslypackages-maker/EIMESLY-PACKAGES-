import { Router } from 'express';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  categories,
  enquiries,
  mediaAssets,
  products,
  quotations,
  siteSettings,
  whatsappClicks,
} from '../../db/schema.ts';
import {
  DEFAULT_WEBSITE_CONTENT,
  DEFAULT_WEBSITE_SETTINGS,
  ensureSeeded,
} from '../../db/seed.ts';
import { optionalAuth, type AuthRequest } from '../../middleware/auth.ts';

export const publicRouter = Router();

function sanitizePublicProduct<
  T extends { wholesalePrice: number | null; costPrice: number | null }
>(p: T): T {
  return {
    ...p,
    wholesalePrice: null,
    costPrice: null,
  };
}

async function getSettingValue<T>(key: string, fallback: T): Promise<T> {
  const rows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  if (rows.length === 0) return fallback;
  return { ...fallback, ...(rows[0].value as Partial<T>) };
}

publicRouter.get('/bootstrap', async (_req, res) => {
  try {
    await ensureSeeded();
    const [settings, content, activeCategories, featuredRows] = await Promise.all([
      getSettingValue('settings', DEFAULT_WEBSITE_SETTINGS),
      getSettingValue('content', DEFAULT_WEBSITE_CONTENT),
      db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(asc(categories.sortOrder), asc(categories.id)),
      db
        .select()
        .from(products)
        .where(and(eq(products.isActive, true), eq(products.isFeatured, true)))
        .orderBy(desc(products.createdAt))
        .limit(8),
    ]);

    const catById = new Map(activeCategories.map((c) => [c.id, c]));
    const featuredProducts = featuredRows.map((p) => {
      const cat = p.categoryId ? catById.get(p.categoryId) : undefined;
      return sanitizePublicProduct({
        ...p,
        categoryName: cat?.name ?? 'Uncategorized',
        categorySlug: cat?.slug ?? '',
      });
    });

    res.json({
      settings,
      content,
      categories: activeCategories,
      featuredProducts,
    });
  } catch (err) {
    console.error('Bootstrap failed:', err);
    res.status(500).json({ error: 'Failed to load storefront data' });
  }
});

publicRouter.get('/categories', async (_req, res) => {
  try {
    await ensureSeeded();
    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.id));

    const prodCounts = await db
      .select({
        categoryId: products.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(products)
      .where(eq(products.isActive, true))
      .groupBy(products.categoryId);

    const countMap = new Map<number, number>();
    for (const r of prodCounts) {
      if (r.categoryId !== null) countMap.set(r.categoryId, r.count);
    }

    res.json(
      cats.map((c) => ({
        ...c,
        productCount: countMap.get(c.id) ?? 0,
      }))
    );
  } catch (err) {
    console.error('Categories fetch failed:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

publicRouter.get('/products/suggestions', async (req, res) => {
  try {
    await ensureSeeded();
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const pattern = `%${q}%`;
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        unitPrice: products.unitPrice,
        images: products.images,
      })
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          or(
            ilike(products.name, pattern),
            ilike(products.sku, pattern),
            ilike(products.material, pattern),
            ilike(products.description, pattern)
          )
        )
      )
      .limit(6);
    res.json(rows);
  } catch (err) {
    console.error('Search suggestions failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

publicRouter.get('/products', async (req, res) => {
  try {
    await ensureSeeded();
    const categorySlug = String(req.query.category || '').trim();
    const search = String(req.query.search || '').trim();
    const material = String(req.query.material || '').trim();
    const size = String(req.query.size || '').trim();
    const availability = String(req.query.availability || '').trim();
    const brand = String(req.query.brand || '').trim();
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
    const sort = String(req.query.sort || 'featured');
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(20, Math.max(1, Number(req.query.limit || 20)));

    const [_settings, allCats, allActive] = await Promise.all([
      getSettingValue('settings', DEFAULT_WEBSITE_SETTINGS),
      db.select().from(categories),
      db.select().from(products).where(eq(products.isActive, true)),
    ]);
    const catById = new Map(allCats.map((c) => [c.id, c]));
    const catBySlug = new Map(allCats.map((c) => [c.slug, c]));

    // Facets computed from all active products
    const materialsSet = new Set<string>();
    const sizesSet = new Set<string>();
    const brandsSet = new Set<string>();
    for (const p of allActive) {
      if (p.material) materialsSet.add(p.material);
      if (p.brand) brandsSet.add(p.brand);
      for (const s of p.sizes || []) {
        if (s) sizesSet.add(s);
      }
    }

    // Filter in memory for rich JSONB array + multi-field matching
    let filtered = allActive.map((p) => {
      const cat = p.categoryId ? catById.get(p.categoryId) : undefined;
      return sanitizePublicProduct({
        ...p,
        categoryName: cat?.name ?? 'Uncategorized',
        categorySlug: cat?.slug ?? '',
      });
    });

    if (categorySlug) {
      const targetCat = catBySlug.get(categorySlug);
      filtered = targetCat
        ? filtered.filter((p) => p.categoryId === targetCat.id)
        : [];
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          (p.sizes || []).some((s) => s.toLowerCase().includes(q))
      );
    }

    if (material) {
      filtered = filtered.filter((p) => p.material === material);
    }

    if (brand) {
      filtered = filtered.filter((p) => p.brand === brand);
    }

    if (size) {
      filtered = filtered.filter((p) => (p.sizes || []).includes(size));
    }

    if (availability) {
      filtered = filtered.filter((p) => p.availabilityStatus === availability);
    }

    if (minPrice !== null && !Number.isNaN(minPrice)) {
      filtered = filtered.filter(
        (p) => p.unitPrice !== null && p.unitPrice >= minPrice
      );
    }

    if (maxPrice !== null && !Number.isNaN(maxPrice)) {
      filtered = filtered.filter(
        (p) => p.unitPrice !== null && p.unitPrice <= maxPrice
      );
    }

    // Sorting
    if (sort === 'featured') {
      filtered.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    } else if (sort === 'newest') {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sort === 'price_asc') {
      filtered.sort(
        (a, b) =>
          (a.unitPrice ?? Number.MAX_SAFE_INTEGER) -
          (b.unitPrice ?? Number.MAX_SAFE_INTEGER)
      );
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => (b.unitPrice ?? -1) - (a.unitPrice ?? -1));
    } else if (sort === 'alpha') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const items = filtered.slice((safePage - 1) * limit, safePage * limit);

    res.json({
      items,
      pagination: {
        total,
        page: safePage,
        limit,
        totalPages,
      },
      facets: {
        materials: Array.from(materialsSet).sort(),
        sizes: Array.from(sizesSet).sort(),
        brands: Array.from(brandsSet).sort(),
      },
    });
  } catch (err) {
    console.error('Products fetch failed:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

publicRouter.get('/products/:slug', async (req, res) => {
  try {
    await ensureSeeded();
    const slug = req.params.slug;
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const p = rows[0];
    let category = null;
    if (p.categoryId) {
      const catRows = await db
        .select()
        .from(categories)
        .where(eq(categories.id, p.categoryId))
        .limit(1);
      category = catRows[0] ?? null;
    }

    const relatedRows = p.categoryId
      ? await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.categoryId, p.categoryId),
              eq(products.isActive, true)
            )
          )
          .limit(5)
      : [];

    const related = relatedRows
      .filter((r) => r.id !== p.id)
      .slice(0, 4)
      .map((r) =>
        sanitizePublicProduct({
          ...r,
          categoryName: category?.name ?? 'Uncategorized',
          categorySlug: category?.slug ?? '',
        })
      );

    res.json({
      product: sanitizePublicProduct({
        ...p,
        categoryName: category?.name ?? 'Uncategorized',
        categorySlug: category?.slug ?? '',
      }),
      related,
    });
  } catch (err) {
    console.error('Product detail failed:', err);
    res.status(500).json({ error: 'Failed to load product details' });
  }
});

// Media upload & serving (works on desktop & mobile without external bucket keys)
publicRouter.post('/media/upload', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { filename, mimeType, dataBase64, altText, folder } = req.body || {};
    if (!filename || !mimeType || !dataBase64) {
      return res.status(400).json({ error: 'Missing image file payload' });
    }
    const allowedMime = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ];
    if (!allowedMime.includes(String(mimeType).toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported image format' });
    }
    const cleanBase64 = String(dataBase64).replace(/^data:[^;]+;base64,/, '');
    const byteSize = Buffer.byteLength(cleanBase64, 'base64');
    if (byteSize > 5 * 1024 * 1024) {
      return res
        .status(400)
        .json({ error: 'Image must be smaller than 5 MB' });
    }

    const [inserted] = await db
      .insert(mediaAssets)
      .values({
        filename: String(filename).slice(0, 180),
        mimeType: String(mimeType),
        dataBase64: cleanBase64,
        altText: String(altText || filename).slice(0, 200),
        folder: String(folder || 'general').slice(0, 60),
        uploadedBy: req.appUser?.id ?? null,
      })
      .returning({
        id: mediaAssets.id,
        filename: mediaAssets.filename,
        mimeType: mediaAssets.mimeType,
        altText: mediaAssets.altText,
        folder: mediaAssets.folder,
      });

    res.status(201).json({
      id: inserted.id,
      url: `/api/media/${inserted.id}`,
      filename: inserted.filename,
      altText: inserted.altText,
      folder: inserted.folder,
    });
  } catch (err) {
    console.error('Media upload failed:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

publicRouter.get('/media/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).end();
    }
    const rows = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);
    if (rows.length === 0) return res.status(404).end();
    const asset = rows[0];
    const buffer = Buffer.from(asset.dataBase64, 'base64');
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);
  } catch (err) {
    console.error('Serve media failed:', err);
    res.status(500).end();
  }
});

async function resolveExistingProductId(rawId: unknown): Promise<number | null> {
  const num = Number(rawId);
  if (!Number.isInteger(num) || num <= 0 || num > 2147483647) {
    return null;
  }
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, num))
    .limit(1);
  return existing.length > 0 ? existing[0].id : null;
}

function clampPgInt(raw: unknown, fallback = 1, min = 1): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(2147483647, Math.max(min, Math.round(num)));
}

// WhatsApp Click & Enquiry Analytics (non-blocking tracking, not treated as confirmed sales)
publicRouter.post('/analytics/whatsapp-click', async (req, res) => {
  try {
    const b = req.body || {};
    const eventType = ['product_order', 'wholesale_quote', 'whatsapp_contact'].includes(
      String(b.eventType)
    )
      ? String(b.eventType)
      : 'whatsapp_contact';

    const resolvedProductId = await resolveExistingProductId(b.productId);

    await db.insert(whatsappClicks).values({
      eventType,
      productId: resolvedProductId,
      productName: String(b.productName || '').slice(0, 180),
      sku: String(b.sku || '').slice(0, 80),
      selectedSize: String(b.selectedSize || '').slice(0, 80),
      quantity: clampPgInt(b.quantity, 1, 1),
      sourcePage: String(b.sourcePage || '').slice(0, 120),
    });

    res.status(201).json({ recorded: true });
  } catch (err) {
    console.error('WhatsApp click log failed:', err);
    res.status(200).json({ recorded: false });
  }
});

// Quotations
publicRouter.post('/quotations', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      customerName,
      companyName,
      phone,
      email,
      productInterested,
      productId,
      estimatedQuantity,
      preferredSize,
      additionalRequirements,
      referenceImageUrl,
    } = req.body || {};

    if (!customerName || !phone || !productInterested) {
      return res.status(400).json({
        error: 'Name, phone number, and product interested in are required',
      });
    }

    const quoteNumber = `EPQ-${Date.now().toString().slice(-6)}-${Math.floor(
      100 + Math.random() * 900
    )}`;
    const resolvedProductId = await resolveExistingProductId(productId);

    const [created] = await db
      .insert(quotations)
      .values({
        quoteNumber,
        userId: req.appUser?.id ?? null,
        customerName: String(customerName).trim(),
        companyName: String(companyName || '').trim(),
        phone: String(phone).trim(),
        email: String(email || '').trim(),
        productInterested: String(productInterested).trim(),
        productId: resolvedProductId,
        estimatedQuantity: clampPgInt(estimatedQuantity, 1, 1),
        preferredSize: String(preferredSize || '').trim(),
        additionalRequirements: String(additionalRequirements || '').trim(),
        referenceImageUrl: String(referenceImageUrl || '').trim(),
        status: 'new',
      })
      .returning();

    res.status(201).json({ quotation: created });
  } catch (err) {
    console.error('Quotation creation failed:', err);
    res.status(500).json({ error: 'Failed to submit quotation request' });
  }
});

// Contact & Wholesale Enquiries
publicRouter.post('/enquiries', async (req, res) => {
  try {
    const {
      enquiryType,
      fullName,
      businessName,
      email,
      phone,
      subject,
      message,
    } = req.body || {};

    if (!fullName || !phone || !subject || !message) {
      return res.status(400).json({
        error: 'Full name, phone number, subject, and message are required',
      });
    }

    const [created] = await db
      .insert(enquiries)
      .values({
        enquiryType: String(enquiryType || 'contact'),
        fullName: String(fullName).trim(),
        businessName: String(businessName || '').trim(),
        email: String(email || '').trim(),
        phone: String(phone).trim(),
        subject: String(subject).trim(),
        message: String(message).trim(),
        status: 'new',
      })
      .returning();

    res.status(201).json({ enquiry: created });
  } catch (err) {
    console.error('Enquiry creation failed:', err);
    res.status(500).json({ error: 'Failed to submit enquiry' });
  }
});
