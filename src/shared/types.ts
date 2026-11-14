export type UserRole =
  | 'super_admin'
  | 'business_manager'
  | 'sales_staff'
  | 'inventory_manager'
  | 'customer';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  businessName: string;
  deliveryAddress: string;
  district: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export type AvailabilityStatus =
  | 'in_stock'
  | 'made_to_order'
  | 'out_of_stock'
  | 'sample_listing';

export interface Product {
  id: number;
  categoryId: number | null;
  categoryName?: string;
  categorySlug?: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  material: string;
  brand: string;
  sizes: string[];
  colors: string[];
  packagingQuantity: string;
  unitPrice: number | null;
  wholesalePrice: number | null;
  moq: number;
  stockQuantity: number;
  lowStockThreshold: number;
  availabilityStatus: AvailabilityStatus;
  images: string[];
  isFeatured: boolean;
  isActive: boolean;
  isSample: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus =
  | 'new_order'
  | 'confirmed'
  | 'processing'
  | 'ready_for_collection'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'refunded';

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number | null;
  productName: string;
  sku: string;
  selectedSize: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number | null;
  orderType: 'retail' | 'wholesale';
  customerName: string;
  phone: string;
  email: string;
  businessName: string;
  deliveryAddress: string;
  district: string;
  orderNotes: string;
  internalNotes: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  orderStatus: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  hasUnpricedItems: boolean;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export type QuotationStatus =
  | 'new'
  | 'under_review'
  | 'quotation_sent'
  | 'accepted'
  | 'rejected'
  | 'completed';

export interface Quotation {
  id: number;
  quoteNumber: string;
  userId: number | null;
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  productInterested: string;
  productId: number | null;
  estimatedQuantity: number;
  preferredSize: string;
  additionalRequirements: string;
  referenceImageUrl: string;
  status: QuotationStatus;
  proposedUnitPrice: number | null;
  proposedQuantity: number | null;
  proposedTotal: number | null;
  adminNotes: string;
  validUntil: string;
  convertedOrderId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Enquiry {
  id: number;
  enquiryType: 'contact' | 'wholesale' | 'custom_packaging';
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  assignedTo: number | null;
  adminNotes: string;
  createdAt: string;
}

export interface InventoryMovement {
  id: number;
  productId: number;
  productName?: string;
  sku?: string;
  movementType: 'addition' | 'reduction' | 'adjustment' | 'order_deduction';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  reason: string;
  performedBy: number | null;
  actorEmail?: string;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  actorId: number | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface WebsiteSettings {
  companyName: string;
  parentCompany: string;
  logoUrl: string;
  faviconUrl: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  city: string;
  country: string;
  mapLat: string;
  mapLng: string;
  mapEmbedUrl: string;
  currency: string;
  instagramUrl: string;
  facebookUrl: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  deliveryNotes: string;
  enableMobileMoney: boolean;
  mobileMoneyInstructions: string;
  enableBankTransfer: boolean;
  bankTransferInstructions: string;
  enableCashOnDelivery: boolean;
  maintenanceMode: boolean;
  googleAnalyticsId: string;
  facebookPixelId: string;
  googleSearchConsoleTag: string;
}

export interface WebsiteContent {
  heroHeadline: string;
  heroSubtext: string;
  heroImageUrl: string;
  wholesaleHeadline: string;
  wholesaleDescription: string;
  promoBannerHeadline: string;
  promoBannerButtonText: string;
  aboutHeading: string;
  aboutDescription: string;
  aboutMission: string;
  aboutVision: string;
  aboutValues: string[];
  footerDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  sku: string;
  image: string;
  selectedSize: string;
  quantity: number;
  unitPrice: number | null;
  wholesalePrice: number | null;
  moq: number;
  packagingQuantity: string;
}
