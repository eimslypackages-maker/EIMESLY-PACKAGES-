import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  businessName: text('business_name').notNull().default(''),
  deliveryAddress: text('delivery_address').notNull().default(''),
  district: text('district').notNull().default(''),
  role: text('role').notNull().default('customer'), // super_admin | business_manager | sales_staff | inventory_manager | customer
  isActive: boolean('is_active').notNull().default(true),
  resetToken: text('reset_token'),
  resetTokenExpires: timestamp('reset_token_expires'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sku: text('sku').notNull().unique(),
  description: text('description').notNull().default(''),
  material: text('material').notNull().default(''),
  brand: text('brand').notNull().default('Eimesly Packages'),
  sizes: jsonb('sizes').$type<string[]>().notNull().default([]),
  colors: jsonb('colors').$type<string[]>().notNull().default([]),
  packagingQuantity: text('packaging_quantity').notNull().default(''),
  unitPrice: integer('unit_price'),
  wholesalePrice: integer('wholesale_price'),
  moq: integer('moq').notNull().default(1),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(10),
  availabilityStatus: text('availability_status')
    .notNull()
    .default('sample_listing'), // in_stock | made_to_order | out_of_stock | sample_listing
  images: jsonb('images').$type<string[]>().notNull().default([]),
  isFeatured: boolean('is_featured').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  orderType: text('order_type').notNull().default('retail'), // retail | wholesale
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull().default(''),
  businessName: text('business_name').notNull().default(''),
  deliveryAddress: text('delivery_address').notNull(),
  district: text('district').notNull(),
  orderNotes: text('order_notes').notNull().default(''),
  internalNotes: text('internal_notes').notNull().default(''),
  paymentMethod: text('payment_method').notNull().default('arrange_direct'),
  paymentStatus: text('payment_status').notNull().default('unpaid'), // unpaid | pending | partially_paid | paid | refunded
  paymentReference: text('payment_reference').notNull().default(''),
  orderStatus: text('order_status').notNull().default('new_order'), // new_order | confirmed | processing | ready_for_collection | out_for_delivery | completed | cancelled
  subtotal: integer('subtotal').notNull().default(0),
  deliveryFee: integer('delivery_fee').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  hasUnpricedItems: boolean('has_unpriced_items').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  productName: text('product_name').notNull(),
  sku: text('sku').notNull().default(''),
  selectedSize: text('selected_size').notNull().default(''),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull().default(0),
  lineTotal: integer('line_total').notNull().default(0),
});

export const quotations = pgTable('quotations', {
  id: serial('id').primaryKey(),
  quoteNumber: text('quote_number').notNull().unique(),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  customerName: text('customer_name').notNull(),
  companyName: text('company_name').notNull().default(''),
  phone: text('phone').notNull(),
  email: text('email').notNull().default(''),
  productInterested: text('product_interested').notNull(),
  productId: integer('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  estimatedQuantity: integer('estimated_quantity').notNull().default(1),
  preferredSize: text('preferred_size').notNull().default(''),
  additionalRequirements: text('additional_requirements').notNull().default(''),
  referenceImageUrl: text('reference_image_url').notNull().default(''),
  status: text('status').notNull().default('new'), // new | under_review | quotation_sent | accepted | rejected | completed
  proposedUnitPrice: integer('proposed_unit_price'),
  proposedQuantity: integer('proposed_quantity'),
  proposedTotal: integer('proposed_total'),
  adminNotes: text('admin_notes').notNull().default(''),
  validUntil: text('valid_until').notNull().default(''),
  convertedOrderId: integer('converted_order_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const enquiries = pgTable('enquiries', {
  id: serial('id').primaryKey(),
  enquiryType: text('enquiry_type').notNull().default('contact'), // contact | wholesale | custom_packaging
  fullName: text('full_name').notNull(),
  businessName: text('business_name').notNull().default(''),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('new'), // new | in_progress | resolved
  assignedTo: integer('assigned_to').references(() => users.id, {
    onDelete: 'set null',
  }),
  adminNotes: text('admin_notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inventoryMovements = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  movementType: text('movement_type').notNull(), // addition | reduction | adjustment | order_deduction
  quantityChange: integer('quantity_change').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  reason: text('reason').notNull().default(''),
  performedBy: integer('performed_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mediaAssets = pgTable('media_assets', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  dataBase64: text('data_base64').notNull(),
  altText: text('alt_text').notNull().default(''),
  uploadedBy: integer('uploaded_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  actorEmail: text('actor_email').notNull().default(''),
  actorRole: text('actor_role').notNull().default(''),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull().default(''),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  inventoryMovements: many(inventoryMovements),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const inventoryMovementsRelations = relations(
  inventoryMovements,
  ({ one }) => ({
    product: one(products, {
      fields: [inventoryMovements.productId],
      references: [products.id],
    }),
    actor: one(users, {
      fields: [inventoryMovements.performedBy],
      references: [users.id],
    }),
  })
);
