import type { Product } from '../shared/types';
import coffeeCupsImage from '../assets/images/cat_coffee_cups_1794679093987.jpg';
import takeawayContainersImage from '../assets/images/cat_takeaway_containers_1794679094185.jpg';
import drinkingStrawsImage from '../assets/images/cat_drinking_straws_1794679094373.jpg';
import paperBagsImage from '../assets/images/cat_paper_bags_1794679095036.jpg';
import cutleryNapkinsImage from '../assets/images/cat_cutlery_napkins_1794679095359.jpg';

// Illustrative catalogue entries for the static GitHub Pages storefront.
// These are not inventory records: prices and stock are intentionally unset.
export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 9001, categoryId: 1, categoryName: 'Coffee Cups', categorySlug: 'coffee-cups',
    name: 'Hot Paper Coffee Cups', slug: 'sample-hot-paper-coffee-cups', sku: 'SAMPLE-001',
    description: 'Paper cups for serving hot coffee, tea, and other takeaway drinks. Contact us to enquire about available sizes and pack options.',
    material: 'Paper', brand: 'Eimesly Packages', sizes: [], colors: [],
    packagingQuantity: 'Pack sizes on request', unitPrice: null, wholesalePrice: null,
    moq: 1, stockQuantity: 0, lowStockThreshold: 0, availabilityStatus: 'sample_listing',
    images: [coffeeCupsImage], isFeatured: true, isActive: true, isSample: true,
  },
  {
    id: 9002, categoryId: 1, categoryName: 'Coffee Cups', categorySlug: 'coffee-cups',
    name: 'Clear Plastic Cold Drink Cups', slug: 'sample-clear-plastic-cold-drink-cups', sku: 'SAMPLE-002',
    description: 'Clear cups for cold drinks, juices, iced coffee, and refreshments. Contact us to enquire about available options.',
    material: 'Plastic', brand: 'Eimesly Packages', sizes: [], colors: [],
    packagingQuantity: 'Pack sizes on request', unitPrice: null, wholesalePrice: null,
    moq: 1, stockQuantity: 0, lowStockThreshold: 0, availabilityStatus: 'sample_listing',
    images: [coffeeCupsImage], isFeatured: true, isActive: true, isSample: true,
  },
  {
    id: 9003, categoryId: 2, categoryName: 'Takeaway Containers', categorySlug: 'takeaway-containers',
    name: 'Takeaway Food Containers', slug: 'sample-takeaway-food-containers', sku: 'SAMPLE-003',
    description: 'Food packaging containers for takeaway meals, delivery, and catering. Contact us to enquire about available styles and sizes.',
    material: 'Food packaging material', brand: 'Eimesly Packages', sizes: [], colors: [],
    packagingQuantity: 'Pack sizes on request', unitPrice: null, wholesalePrice: null,
    moq: 1, stockQuantity: 0, lowStockThreshold: 0, availabilityStatus: 'sample_listing',
    images: [takeawayContainersImage], isFeatured: true, isActive: true, isSample: true,
  },
  {
    id: 9004, categoryId: 3, categoryName: 'Drinking Straws', categorySlug: 'drinking-straws',
    name: 'Drinking Straws', slug: 'sample-drinking-straws', sku: 'SAMPLE-004',
    description: 'Drinking straws for cafés, restaurants, juice bars, and events. Contact us to enquire about available options.',
    material: 'Enquire for material options', brand: 'Eimesly Packages', sizes: [], colors: [],
    packagingQuantity: 'Pack sizes on request', unitPrice: null, wholesalePrice: null,
    moq: 1, stockQuantity: 0, lowStockThreshold: 0, availabilityStatus: 'sample_listing',
    images: [drinkingStrawsImage], isFeatured: true, isActive: true, isSample: true,
  },
  {
    id: 9005, categoryId: 4, categoryName: 'Paper Bags', categorySlug: 'paper-bags',
    name: 'Kraft Paper Bags', slug: 'sample-kraft-paper-bags', sku: 'SAMPLE-005',
    description: 'Paper carrier bags for takeaway food, retail packaging, and customer orders. Contact us to enquire about available options.',
    material: 'Paper', brand: 'Eimesly Packages', sizes: [], colors: [],
    packagingQuantity: 'Pack sizes on request', unitPrice: null, wholesalePrice: null,
    moq: 1, stockQuantity: 0, lowStockThreshold: 0, availabilityStatus: 'sample_listing',
    images: [paperBagsImage], isFeatured: true, isActive: true, isSample: true,
  },
  {
    id: 9006, categoryId: 5, categoryName: 'Cutlery & Napkins', categorySlug: 'cutlery-napkins',
    name: 'Disposable Cutlery Sets', slug: 'sample-disposable-cutlery-sets', sku: 'SAMPLE-006',
    description: 'Disposable cutlery options for takeaway meals, catering, and food service. Contact us to enquire about available options.',
    material: 'Enquire for material options', brand: 'Eimesly Packages', sizes: [], colors: [],
    packagingQuantity: 'Pack sizes on request', unitPrice: null, wholesalePrice: null,
    moq: 1, stockQuantity: 0, lowStockThreshold: 0, availabilityStatus: 'sample_listing',
    images: [cutleryNapkinsImage], isFeatured: true, isActive: true, isSample: true,
  },
  {
    id: 9007, categoryId: 5, categoryName: 'Cutlery & Napkins', categorySlug: 'cutlery-napkins',
    name: 'Paper Napkins', slug: 'sample-paper-napkins', sku: 'SAMPLE-007',
    description: 'Paper napkins for restaurants, cafés, catering, and events. Contact us to enquire about available options.',
    material: 'Paper', brand: 'Eimesly Packages', sizes: [], colors: [],
    packagingQuantity: 'Pack sizes on request', unitPrice: null, wholesalePrice: null,
    moq: 1, stockQuantity: 0, lowStockThreshold: 0, availabilityStatus: 'sample_listing',
    images: [cutleryNapkinsImage], isFeatured: true, isActive: true, isSample: true,
  },
];
