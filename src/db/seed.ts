import { eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { categories, products, siteSettings } from './schema.ts';
import type { WebsiteContent, WebsiteSettings } from '../shared/types.ts';

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  companyName: 'Eimesly Packages',
  parentCompany: 'EIMESLY LTD',
  logoUrl: '',
  faviconUrl: '',
  phone: '',
  whatsappNumber: '0786616377',
  whatsappCountryCode: '250',
  whatsappDefaultOrderMessage:
    'Please confirm availability and provide payment and delivery information.',
  whatsappWholesaleMessage:
    'Please send me your wholesale prices and quotation.',
  whatsappGeneralMessage:
    'Hello Eimesly Packages! I would like to enquire about your packaging products and availability.',
  showWholesalePricesPublicly: false,
  email: '',
  address: 'Kigali, Rwanda',
  city: 'Kigali',
  country: 'Rwanda',
  mapLat: '',
  mapLng: '',
  mapEmbedUrl: '',
  currency: 'RWF',
  instagramUrl: '',
  facebookUrl: '',
  deliveryNotes:
    'Delivery and collection arrangements are confirmed directly with our team on WhatsApp.',
  collectionPointEnabled: true,
  collectionAddress: 'Kigali, Rwanda',
  collectionHours: '',
  orderNumberPrefix: 'EP-',
  notificationEmail: '',
  notifyOnNewQuotation: true,
  maintenanceMode: false,
  googleAnalyticsId: '',
  facebookPixelId: '',
  googleSearchConsoleTag: '',
};

export const DEFAULT_WEBSITE_CONTENT: WebsiteContent = {
  heroHeadline: 'Smart Packaging Solutions for Every Business',
  heroSubtext:
    'Discover quality coffee cups, clear plastic cups for iced drinks, drinking straws, takeaway containers, and food-service packaging for cafés, restaurants, hotels, caterers, and retailers.',
  heroImageUrl: '/src/assets/images/hero_packaging_collection_1794679094459.jpg',
  wholesaleHeadline: 'Your Reliable Wholesale Packaging Partner',
  wholesaleDescription:
    'Whether you manage a restaurant, café, hotel, supermarket, or catering business, Eimesly Packages provides hot and cold packaging solutions with direct WhatsApp ordering and tailored bulk quotes.',
  promoBannerHeadline: 'Everything Your Business Needs for Better Packaging.',
  promoBannerButtonText: 'EXPLORE OUR PRODUCTS',
  aboutHeading: 'About Eimesly Packages',
  aboutDescription:
    'Eimesly Packages is a packaging supply business focused on providing practical and quality packaging solutions for businesses and individuals. We specialize in coffee cups, clear plastic cups for iced drinks, paper and plastic drinking straws, takeaway containers, and other food-service packaging supplies.\n\nOur goal is to make packaging products accessible to cafés, restaurants, hotels, retailers, and other businesses through direct WhatsApp ordering and reliable customer service.',
  aboutMission:
    'To supply practical, food-grade packaging products that help hospitality businesses, retailers, and event organizers operate smoothly across Rwanda and the wider region.',
  aboutVision:
    'To become the trusted partner for commercial and retail food-service packaging across East Africa through consistent product availability and attentive service.',
  aboutValues: [
    'Practical product quality suited for daily food-service operations',
    'Direct, responsive wholesale and retail ordering on WhatsApp',
    'Flexible supply for growing cafés, restaurants, and enterprises',
    'Honest specifications and transparent quotation workflows',
  ],
  footerDescription:
    'Eimesly Packages (EIMESLY LTD) supplies food packaging products, coffee cups, plastic cups for iced drinks, drinking straws, takeaway containers, and hospitality supplies from Kigali, Rwanda.',
  seoTitle: 'Eimesly Packages – Smart Packaging Solutions for Every Business',
  seoDescription:
    'Discover quality food packaging products in Kigali, Rwanda. Coffee cups, plastic cups for iced drinks, paper & plastic drinking straws, takeaway containers, and wholesale packaging by Eimesly Packages.',
  seoKeywords:
    'Packaging suppliers in Rwanda, Coffee cups in Kigali, Plastic cups for iced drinks Rwanda, Drinking straws Kigali, Takeaway containers Rwanda, Food packaging supplies Rwanda, Wholesale packaging Rwanda',
};

const INITIAL_CATEGORIES = [
  {
    name: 'Coffee Cups',
    slug: 'coffee-cups',
    description: 'Single-wall, double-wall, and rippled paper cups for espresso, specialty coffee, and hot beverages.',
    imageUrl: '/src/assets/images/cat_coffee_cups_1794679093987.jpg',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Plastic Iced Drink Cups',
    slug: 'plastic-iced-drink-cups',
    description: 'Crystal-clear PET and PP plastic cups for iced coffee, smoothies, milkshakes, bubble tea, and fresh juices.',
    imageUrl: '/src/assets/images/plastic_iced_drink_cups_1794680181117.jpg',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Drinking Straws',
    slug: 'drinking-straws',
    description: 'Plastic and kraft paper drinking straws in standard iced drink, smoothie, boba, and individually wrapped formats.',
    imageUrl: '/src/assets/images/plastic_drinking_straws_1794680182650.jpg',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Takeaway Containers',
    slug: 'takeaway-containers',
    description: 'Hinged meal boxes, kraft salad bowls, and leak-resistant takeaway containers for restaurants and catering.',
    imageUrl: '/src/assets/images/cat_takeaway_containers_1794679094185.jpg',
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Food Packaging',
    slug: 'food-packaging',
    description: 'Deli wraps, burger boxes, noodle cartons, and greaseproof liners for daily kitchen service.',
    imageUrl: '/src/assets/images/cat_takeaway_containers_1794679094185.jpg',
    sortOrder: 5,
    isActive: true,
  },
  {
    name: 'Paper Bags',
    slug: 'paper-bags',
    description: 'Twisted-handle kraft carrier bags, flat-handle takeaway bags, and bakery SOS bags.',
    imageUrl: '/src/assets/images/cat_paper_bags_1794679095036.jpg',
    sortOrder: 6,
    isActive: true,
  },
  {
    name: 'Cup Lids',
    slug: 'cup-lids',
    description: 'Hot coffee sip-through lids plus crystal-clear flat straw-slot and dome lids for plastic iced drink cups.',
    imageUrl: '/src/assets/images/plastic_iced_drink_cups_1794680181117.jpg',
    sortOrder: 7,
    isActive: true,
  },
  {
    name: 'Disposable Cutlery',
    slug: 'disposable-cutlery',
    description: 'Smooth birchwood forks, spoons, knives, and wrapped takeaway cutlery kits.',
    imageUrl: '/src/assets/images/cat_cutlery_napkins_1794679095359.jpg',
    sortOrder: 8,
    isActive: true,
  },
  {
    name: 'Napkins & Tissue',
    slug: 'napkins-tissue',
    description: 'Unbleached kraft dinner napkins, cocktail serviettes, and dispenser tissues for cafés and hotels.',
    imageUrl: '/src/assets/images/cat_cutlery_napkins_1794679095359.jpg',
    sortOrder: 9,
    isActive: true,
  },
  {
    name: 'Custom Packaging',
    slug: 'custom-packaging',
    description: 'Branded hot & iced cups, carrier bags, and takeaway sleeves tailored for hospitality and retail identities.',
    imageUrl: '/src/assets/images/hero_packaging_collection_1794679094459.jpg',
    sortOrder: 10,
    isActive: true,
  },
  {
    name: 'Other Supplies',
    slug: 'other-supplies',
    description: 'Corrugated cup sleeves, 2-cup & 4-cup carriers, wooden stirrers, and portion pots.',
    imageUrl: '/src/assets/images/hero_packaging_collection_1794679094459.jpg',
    sortOrder: 11,
    isActive: true,
  },
];

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const [sentinelRows, existingSettings, existingContent, catCountRows, prodCountRows] =
        await Promise.all([
          db
            .select({ key: siteSettings.key })
            .from(siteSettings)
            .where(eq(siteSettings.key, 'bootstrap_initialized_v1'))
            .limit(1),
          db
            .select({ key: siteSettings.key })
            .from(siteSettings)
            .where(eq(siteSettings.key, 'settings'))
            .limit(1),
          db
            .select({ key: siteSettings.key })
            .from(siteSettings)
            .where(eq(siteSettings.key, 'content'))
            .limit(1),
          db.select({ count: sql<number>`count(*)::int` }).from(categories),
          db.select({ count: sql<number>`count(*)::int` }).from(products),
        ]);

      const isAlreadyInitialized =
        sentinelRows.length > 0 ||
        existingSettings.length > 0 ||
        existingContent.length > 0 ||
        (catCountRows[0]?.count ?? 0) > 0 ||
        (prodCountRows[0]?.count ?? 0) > 0;

      if (!isAlreadyInitialized) {
        // One-time initial setup for a brand-new empty database only.
        // Never re-run after initialization so admin deletions and edits are preserved.
        for (const cat of INITIAL_CATEGORIES) {
          await db
            .insert(categories)
            .values(cat)
            .onConflictDoNothing({ target: categories.slug });
        }

        const allCats = await db.select().from(categories);
        const catMap = new Map<string, number>();
        for (const c of allCats) catMap.set(c.slug, c.id);

        const sampleProducts = [
        {
          categoryId: catMap.get('coffee-cups') ?? null,
          name: 'Double-Wall Kraft Coffee Cup',
          slug: 'double-wall-kraft-coffee-cup',
          sku: 'EP-CC-101',
          description:
            'Insulated double-wall kraft paper cup designed for hot coffee, tea, and specialty lattes without requiring an external sleeve. Sample catalogue listing ready for admin price and stock configuration.',
          material: 'Food-grade Kraft Paperboard (PE/PLA lined)',
          brand: 'Eimesly Packages',
          sizes: ['8 oz (240 ml)', '12 oz (355 ml)', '16 oz (475 ml)'],
          colors: ['Natural Kraft', 'Matte White'],
          packagingQuantity: '50 pcs / sleeve',
          unitPrice: 8000,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: [
            '/src/assets/images/cat_coffee_cups_1794679093987.jpg',
            '/src/assets/images/hero_packaging_collection_1794679094459.jpg',
          ],
          isFeatured: true,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('plastic-iced-drink-cups') ?? null,
          name: 'Clear PET Plastic Cups for Iced Drinks',
          slug: 'clear-pet-plastic-cups-iced-drinks',
          sku: 'EP-IC-102',
          description:
            'Crystal-clear crack-resistant PET plastic cold cups crafted for iced coffee, fresh juices, milkshakes, and chilled beverages with optional flat or dome straw lids. Sample catalogue listing ready for admin price and stock configuration.',
          material: 'Crystal Clear Food-Grade PET Plastic',
          brand: 'Eimesly Packages',
          sizes: ['12 oz (360 ml)', '16 oz (475 ml)', '20 oz (590 ml)', '24 oz (700 ml)'],
          colors: ['Crystal Clear'],
          packagingQuantity: '50 pcs / sleeve',
          unitPrice: 12500,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: [
            '/src/assets/images/plastic_iced_drink_cups_1794680181117.jpg',
            '/src/assets/images/hero_packaging_collection_1794679094459.jpg',
          ],
          isFeatured: true,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('plastic-iced-drink-cups') ?? null,
          name: 'Clear U-Shaped Boba & Smoothie Plastic Cup',
          slug: 'clear-u-shaped-boba-smoothie-plastic-cup',
          sku: 'EP-IC-103',
          description:
            'Rounded bottom crystal-clear PP/PET iced beverage cup suited for smoothies, iced lattes, and boba tea service in cafés and juice bars. Sample catalogue listing ready for admin configuration.',
          material: 'Crystal Clear Food-Grade PP / PET Plastic',
          brand: 'Eimesly Packages',
          sizes: ['12 oz (360 ml)', '16 oz (500 ml)', '22 oz (650 ml)'],
          colors: ['Crystal Clear'],
          packagingQuantity: '50 pcs / sleeve',
          unitPrice: 14500,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: [
            '/src/assets/images/plastic_iced_drink_cups_1794680181117.jpg',
          ],
          isFeatured: true,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('drinking-straws') ?? null,
          name: 'Plastic Drinking Straws (Iced Drinks, Smoothie & Wrapped)',
          slug: 'plastic-drinking-straws-iced-drinks',
          sku: 'EP-DS-202',
          description:
            'Food-grade polypropylene plastic drinking straws suited for iced coffee, fresh juices, smoothies, and milkshakes, available unwrapped or individually hygienically wrapped. Sample catalogue listing ready for admin configuration.',
          material: 'Food-Grade Polypropylene (PP) Plastic',
          brand: 'Eimesly Packages',
          sizes: [
            '6mm Iced Drink (210mm)',
            '8mm Smoothie (210mm)',
            '12mm Boba / Pearl (210mm)',
            'Individually Wrapped 6mm',
          ],
          colors: ['Crystal Clear', 'Matte Black', 'Assorted Colors'],
          packagingQuantity: '250 pcs / box',
          unitPrice: 15500,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: [
            '/src/assets/images/plastic_drinking_straws_1794680182650.jpg',
            '/src/assets/images/cat_drinking_straws_1794679094373.jpg',
          ],
          isFeatured: true,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('drinking-straws') ?? null,
          name: 'Natural Kraft Paper Drinking Straws',
          slug: 'natural-kraft-paper-drinking-straws',
          sku: 'EP-DS-201',
          description:
            'Multi-ply spiral-wound paper drinking straws built to hold structure in cold beverages, iced coffee, and fresh juices. Sample catalogue listing ready for admin configuration.',
          material: 'Unbleached Food-Safe Paper',
          brand: 'Eimesly Packages',
          sizes: ['6mm Standard (197mm)', '8mm Smoothie (210mm)', '12mm Boba (210mm)'],
          colors: ['Natural Kraft', 'Crisp White'],
          packagingQuantity: '250 pcs / box',
          unitPrice: 11500,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: ['/src/assets/images/cat_drinking_straws_1794679094373.jpg'],
          isFeatured: false,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('takeaway-containers') ?? null,
          name: 'Sugarcane Bagasse Hinged Meal Box',
          slug: 'sugarcane-bagasse-hinged-meal-box',
          sku: 'EP-TC-301',
          description:
            'Sturdy molded fiber clamshell container suitable for hot restaurant meals, grilled dishes, and event catering. Sample catalogue listing ready for admin configuration.',
          material: 'Molded Sugarcane Bagasse Fiber',
          brand: 'Eimesly Packages',
          sizes: ['600 ml Single', '900 ml Single', '1000 ml 3-Compartment'],
          colors: ['Natural Ivory'],
          packagingQuantity: '50 pcs / pack',
          unitPrice: 18000,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: ['/src/assets/images/cat_takeaway_containers_1794679094185.jpg'],
          isFeatured: true,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('takeaway-containers') ?? null,
          name: 'Kraft Salad Bowl with Clear Lid',
          slug: 'kraft-salad-bowl-clear-lid',
          sku: 'EP-TC-304',
          description:
            'Round kraft takeaway bowl paired with a snug transparent lid for salads, poke bowls, pasta, and cold deli items. Sample catalogue listing ready for admin configuration.',
          material: 'Kraft Paperboard + Clear PET/PP Lid',
          brand: 'Eimesly Packages',
          sizes: ['500 ml', '750 ml', '1000 ml', '1300 ml'],
          colors: ['Natural Kraft'],
          packagingQuantity: '50 sets / pack',
          unitPrice: 19500,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: ['/src/assets/images/cat_takeaway_containers_1794679094185.jpg'],
          isFeatured: false,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('paper-bags') ?? null,
          name: 'Twisted-Handle Kraft Carrier Bag',
          slug: 'twisted-handle-kraft-carrier-bag',
          sku: 'EP-PB-401',
          description:
            'Reinforced gusseted kraft paper carrier bag with twisted handles for restaurant takeaway orders, bakeries, and retail boutiques. Sample catalogue listing.',
          material: 'Heavyweight Kraft Paper',
          brand: 'Eimesly Packages',
          sizes: ['Small (22x11x28 cm)', 'Medium (26x14x32 cm)', 'Wide Base Takeaway (32x20x32 cm)'],
          colors: ['Brown Kraft', 'White Kraft'],
          packagingQuantity: '50 pcs / bundle',
          unitPrice: 22000,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: ['/src/assets/images/cat_paper_bags_1794679095036.jpg'],
          isFeatured: true,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('cup-lids') ?? null,
          name: 'Clear Flat & Dome Lids for Plastic Iced Cups',
          slug: 'clear-flat-dome-lids-iced-cups',
          sku: 'EP-CL-502',
          description:
            'Precision-fit crystal-clear flat straw-slot lids and dome lids designed for 12 oz to 24 oz PET plastic iced drink cups. Sample catalogue listing.',
          material: 'Crystal Clear Food-Grade PET Plastic',
          brand: 'Eimesly Packages',
          sizes: [
            '92mm Flat Straw-Slot Lid (12 oz)',
            '98mm Flat Straw-Slot Lid (16–24 oz)',
            '98mm Dome Lid with Straw Hole',
          ],
          colors: ['Crystal Clear'],
          packagingQuantity: '100 pcs / sleeve',
          unitPrice: 7500,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: ['/src/assets/images/plastic_iced_drink_cups_1794680181117.jpg'],
          isFeatured: true,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('cup-lids') ?? null,
          name: 'Sip-Through Dome Coffee Cup Lids',
          slug: 'sip-through-dome-coffee-cup-lids',
          sku: 'EP-CL-501',
          description:
            'Precision-fit dome sip lids engineered for 80mm and 90mm rim paper coffee cups to prevent spills during takeaway transit. Sample catalogue listing.',
          material: 'Food-Grade PP / CPLA',
          brand: 'Eimesly Packages',
          sizes: ['80mm (Fits 8 oz)', '90mm (Fits 12/16 oz)'],
          colors: ['Matte Black', 'White'],
          packagingQuantity: '100 pcs / sleeve',
          unitPrice: 6500,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: ['/src/assets/images/cat_coffee_cups_1794679093987.jpg'],
          isFeatured: false,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('disposable-cutlery') ?? null,
          name: 'Birchwood Disposable Cutlery Set',
          slug: 'birchwood-disposable-cutlery-set',
          sku: 'EP-DC-601',
          description:
            'Smooth-finished natural birchwood forks, spoons, and knives suitable for hot and cold takeaway meals and catering events. Sample catalogue listing.',
          material: 'Natural Birchwood',
          brand: 'Eimesly Packages',
          sizes: ['160mm Fork', '160mm Spoon', '165mm Knife', '3-in-1 Kit + Napkin'],
          colors: ['Natural Wood'],
          packagingQuantity: '100 pcs / pack',
          unitPrice: 9500,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: ['/src/assets/images/cat_cutlery_napkins_1794679095359.jpg'],
          isFeatured: true,
          isActive: true,
          isSample: true,
        },
        {
          categoryId: catMap.get('napkins-tissue') ?? null,
          name: 'Unbleached Embossed Kraft Napkins & Cup Sleeves',
          slug: 'unbleached-embossed-kraft-napkins-sleeves',
          sku: 'EP-NT-701',
          description:
            'Soft 2-ply unbleached kraft dinner napkins and corrugated kraft cup sleeves for cafés, restaurants, and hotels. Sample catalogue listing.',
          material: 'Unbleached Virgin / Recycled Paper Fiber',
          brand: 'Eimesly Packages',
          sizes: ['24x24cm Cocktail', '33x33cm Lunch', 'Corrugated Cup Sleeve (8-16 oz)'],
          colors: ['Natural Kraft'],
          packagingQuantity: '100 pcs / pack',
          unitPrice: 12000,
          wholesalePrice: null,
          moq: 1,
          stockQuantity: 0,
          lowStockThreshold: 10,
          availabilityStatus: 'sample_listing',
          images: ['/src/assets/images/cat_cutlery_napkins_1794679095359.jpg'],
          isFeatured: false,
          isActive: true,
          isSample: true,
        },
      ];

        for (const prod of sampleProducts) {
          await db
            .insert(products)
            .values(prod)
            .onConflictDoNothing({ target: products.sku });
        }
      }

      // Ensure default settings & content rows exist if missing (without overwriting existing values)
      if (existingSettings.length === 0) {
        await db
          .insert(siteSettings)
          .values({
            key: 'settings',
            value: DEFAULT_WEBSITE_SETTINGS as unknown as Record<string, unknown>,
          })
          .onConflictDoNothing();
      }

      if (existingContent.length === 0) {
        await db
          .insert(siteSettings)
          .values({
            key: 'content',
            value: DEFAULT_WEBSITE_CONTENT as unknown as Record<string, unknown>,
          })
          .onConflictDoNothing();
      }

      if (sentinelRows.length === 0) {
        await db
          .insert(siteSettings)
          .values({
            key: 'bootstrap_initialized_v1',
            value: {
              initialized: true,
              initializedAt: new Date().toISOString(),
            },
          })
          .onConflictDoNothing();
      }
    } catch (err) {
      seedPromise = null;
      console.error('Database seed error:', err);
    }
  })();

  return seedPromise;
}
