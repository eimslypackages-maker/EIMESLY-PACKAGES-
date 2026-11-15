import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import { categories, products } from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed.ts';
import { publicRouter } from './src/server/routes/public.ts';
import { authRouter } from './src/server/routes/auth.ts';
import { adminRouter } from './src/server/routes/admin.ts';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (
      origin &&
      (allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin))
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,PATCH,DELETE,OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type,Authorization'
      );
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
    }
    next();
  });

  // Serve generated studio assets cleanly in both dev and production
  app.use(
    '/src/assets',
    express.static(path.resolve(process.cwd(), 'src/assets'))
  );

  // SEO Endpoints: robots.txt & dynamic sitemap.xml
  app.get('/robots.txt', (req, res) => {
    const baseUrl =
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/*\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      await ensureSeeded();
      const baseUrl =
        process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const [cats, prods] = await Promise.all([
        db
          .select({ slug: categories.slug })
          .from(categories)
          .where(eq(categories.isActive, true)),
        db
          .select({ slug: products.slug, updatedAt: products.updatedAt })
          .from(products)
          .where(eq(products.isActive, true)),
      ]);

      const staticPaths = [
        '/',
        '/shop',
        '/categories',
        '/about',
        '/wholesale',
        '/request-quote',
        '/contact',
        '/faq',
        '/privacy-policy',
        '/terms-and-conditions',
      ];

      const urls = [
        ...staticPaths.map((p) => ({ loc: `${baseUrl}${p}`, priority: p === '/' ? '1.0' : '0.8' })),
        ...cats.map((c) => ({ loc: `${baseUrl}/categories/${c.slug}`, priority: '0.7' })),
        ...prods.map((p) => ({ loc: `${baseUrl}/products/${p.slug}`, priority: '0.8' })),
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map(
          (u) =>
            `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`
        )
        .join('\n')}\n</urlset>`;

      res.type('application/xml').send(xml);
    } catch (err) {
      console.error('Sitemap generation failed:', err);
      res.status(500).end();
    }
  });

  // API Routes
  app.use('/api', publicRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Eimesly Packages server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
