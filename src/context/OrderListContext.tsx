import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  derivePackagingUnits,
  formatOrderDateDDMMYYYY,
} from '../lib/whatsapp';
import type { Product } from '../shared/types';

export interface OrderListItem {
  key: string;
  productId: number;
  slug: string;
  name: string;
  sku: string;
  image: string;
  selectedSize: string;
  selectedVariation: string;
  packagingUnit: string;
  moq: number;
  unitPrice: number | null;
  quantity: number;
  availableSizes: string[];
  availableVariations: string[];
  availableUnits: string[];
}

export interface AddToOrderInput {
  product: Product;
  selectedSize?: string;
  selectedVariation?: string;
  packagingUnit?: string;
  quantity?: number;
}

interface OrderAddedToast {
  key: string;
  productName: string;
  quantity: number;
  packagingUnit: string;
  updatedExisting: boolean;
}

interface StoredOrderState {
  items: OrderListItem[];
  orderDate: string | null;
}

interface OrderListContextValue {
  items: OrderListItem[];
  orderDate: string;
  totalItemCount: number;
  totalUnits: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (input: AddToOrderInput) => { key: string; updatedExisting: boolean };
  updateItemQuantity: (key: string, quantity: number) => void;
  updateItemOptions: (
    key: string,
    updates: {
      selectedSize?: string;
      selectedVariation?: string;
      packagingUnit?: string;
    }
  ) => void;
  removeItem: (key: string) => void;
  clearOrder: () => void;
  toast: OrderAddedToast | null;
  dismissToast: () => void;
}

const STORAGE_KEY = 'eimesly_whatsapp_order_list_v1';

function buildItemKey(
  productId: number,
  selectedSize: string,
  selectedVariation: string,
  packagingUnit: string
): string {
  return [
    productId,
    selectedSize.trim().toLowerCase(),
    selectedVariation.trim().toLowerCase(),
    packagingUnit.trim().toLowerCase(),
  ].join('::');
}

function normalizeStoredItems(rawList: unknown[]): OrderListItem[] {
  return rawList
    .filter(
      (entry): entry is OrderListItem =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof (entry as OrderListItem).productId === 'number' &&
        typeof (entry as OrderListItem).name === 'string' &&
        typeof (entry as OrderListItem).quantity === 'number'
    )
    .map((entry) => ({
      ...entry,
      selectedSize: String(entry.selectedSize || ''),
      selectedVariation: String(entry.selectedVariation || ''),
      packagingUnit: String(entry.packagingUnit || 'Pack'),
      moq: Math.max(1, Math.round(Number(entry.moq) || 1)),
      quantity: Math.max(1, Math.round(Number(entry.quantity) || 1)),
      unitPrice:
        entry.unitPrice === null || entry.unitPrice === undefined
          ? null
          : Number(entry.unitPrice),
      availableSizes: Array.isArray(entry.availableSizes)
        ? entry.availableSizes
        : [],
      availableVariations: Array.isArray(entry.availableVariations)
        ? entry.availableVariations
        : [],
      availableUnits: Array.isArray(entry.availableUnits)
        ? entry.availableUnits
        : ['Pack'],
      key:
        entry.key ||
        buildItemKey(
          entry.productId,
          String(entry.selectedSize || ''),
          String(entry.selectedVariation || ''),
          String(entry.packagingUnit || 'Pack')
        ),
    }));
}

function loadStoredOrderState(): StoredOrderState {
  if (typeof window === 'undefined') {
    return { items: [], orderDate: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], orderDate: null };
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      const items = normalizeStoredItems(parsed);
      return {
        items,
        orderDate: items.length > 0 ? formatOrderDateDDMMYYYY() : null,
      };
    }

    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
      const items = normalizeStoredItems(parsed.items);
      const storedDate =
        typeof parsed.orderDate === 'string' && parsed.orderDate.trim()
          ? parsed.orderDate.trim()
          : null;
      return {
        items,
        orderDate: items.length > 0 ? storedDate || formatOrderDateDDMMYYYY() : null,
      };
    }

    return { items: [], orderDate: null };
  } catch {
    return { items: [], orderDate: null };
  }
}

const OrderListContext = createContext<OrderListContextValue | null>(null);

export function OrderListProvider({ children }: { children: React.ReactNode }) {
  const [orderState, setOrderState] = useState<StoredOrderState>(() =>
    loadStoredOrderState()
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState<OrderAddedToast | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orderState));
    } catch {
      // Ignore storage quota errors
    }
  }, [orderState]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(
    () => setIsDrawerOpen((prev) => !prev),
    []
  );
  const dismissToast = useCallback(() => setToast(null), []);

  const addItem = useCallback((input: AddToOrderInput) => {
    const { product } = input;
    const availableUnits = derivePackagingUnits(product);
    const availableSizes = Array.isArray(product.sizes) ? product.sizes : [];
    const availableVariations = Array.isArray(product.colors) ? product.colors : [];

    const selectedSize =
      input.selectedSize !== undefined
        ? input.selectedSize
        : availableSizes[0] || '';
    const selectedVariation =
      input.selectedVariation !== undefined
        ? input.selectedVariation
        : availableVariations[0] || '';
    const packagingUnit = input.packagingUnit || availableUnits[0] || 'Pack';
    const moq = Math.max(1, Math.round(Number(product.moq) || 1));
    const incomingQty = Math.max(
      moq,
      Math.round(Number(input.quantity ?? moq) || moq)
    );
    const key = buildItemKey(
      product.id,
      selectedSize,
      selectedVariation,
      packagingUnit
    );

    let updatedExisting = false;
    let finalQty = incomingQty;

    setOrderState((prev) => {
      const nextDate =
        prev.items.length === 0 || !prev.orderDate
          ? formatOrderDateDDMMYYYY()
          : prev.orderDate;

      const existingIndex = prev.items.findIndex((item) => item.key === key);
      if (existingIndex >= 0) {
        updatedExisting = true;
        const nextItems = [...prev.items];
        const existing = nextItems[existingIndex];
        finalQty = existing.quantity + incomingQty;
        nextItems[existingIndex] = {
          ...existing,
          name: product.name,
          sku: product.sku,
          slug: product.slug,
          image: product.images?.[0] || existing.image,
          unitPrice: product.unitPrice,
          moq,
          quantity: finalQty,
          availableSizes,
          availableVariations,
          availableUnits,
        };
        return { items: nextItems, orderDate: nextDate };
      }

      return {
        orderDate: nextDate,
        items: [
          ...prev.items,
          {
            key,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            sku: product.sku,
            image: product.images?.[0] || '',
            selectedSize,
            selectedVariation,
            packagingUnit,
            moq,
            unitPrice: product.unitPrice,
            quantity: incomingQty,
            availableSizes,
            availableVariations,
            availableUnits,
          },
        ],
      };
    });

    setToast({
      key,
      productName: product.name,
      quantity: finalQty,
      packagingUnit,
      updatedExisting,
    });

    return { key, updatedExisting };
  }, []);

  const updateItemQuantity = useCallback((key: string, quantity: number) => {
    setOrderState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.key !== key) return item;
        const minQty = Math.max(1, item.moq || 1);
        const safeQty = Number.isNaN(quantity)
          ? minQty
          : Math.max(minQty, Math.floor(quantity));
        return { ...item, quantity: safeQty };
      }),
    }));
  }, []);

  const updateItemOptions = useCallback(
    (
      key: string,
      updates: {
        selectedSize?: string;
        selectedVariation?: string;
        packagingUnit?: string;
      }
    ) => {
      setOrderState((prev) => {
        const currentIndex = prev.items.findIndex((i) => i.key === key);
        if (currentIndex < 0) return prev;
        const current = prev.items[currentIndex];
        const nextSize =
          updates.selectedSize !== undefined
            ? updates.selectedSize
            : current.selectedSize;
        const nextVariation =
          updates.selectedVariation !== undefined
            ? updates.selectedVariation
            : current.selectedVariation;
        const nextUnit =
          updates.packagingUnit !== undefined
            ? updates.packagingUnit
            : current.packagingUnit;

        const nextKey = buildItemKey(
          current.productId,
          nextSize,
          nextVariation,
          nextUnit
        );

        if (nextKey === key) return prev;

        const duplicateIndex = prev.items.findIndex(
          (i, idx) => idx !== currentIndex && i.key === nextKey
        );

        if (duplicateIndex >= 0) {
          const nextItems = [...prev.items];
          const target = nextItems[duplicateIndex];
          nextItems[duplicateIndex] = {
            ...target,
            quantity: target.quantity + current.quantity,
          };
          nextItems.splice(currentIndex, 1);
          return { ...prev, items: nextItems };
        }

        const nextItems = [...prev.items];
        nextItems[currentIndex] = {
          ...current,
          key: nextKey,
          selectedSize: nextSize,
          selectedVariation: nextVariation,
          packagingUnit: nextUnit,
        };
        return { ...prev, items: nextItems };
      });
    },
    []
  );

  const removeItem = useCallback((key: string) => {
    setOrderState((prev) => {
      const nextItems = prev.items.filter((item) => item.key !== key);
      return {
        items: nextItems,
        orderDate: nextItems.length > 0 ? prev.orderDate : null,
      };
    });
  }, []);

  const clearOrder = useCallback(() => {
    setOrderState({ items: [], orderDate: null });
  }, []);

  const items = orderState.items;
  const orderDate = orderState.orderDate || formatOrderDateDDMMYYYY();
  const totalItemCount = items.length;
  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  return (
    <OrderListContext.Provider
      value={{
        items,
        orderDate,
        totalItemCount,
        totalUnits,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        addItem,
        updateItemQuantity,
        updateItemOptions,
        removeItem,
        clearOrder,
        toast,
        dismissToast,
      }}
    >
      {children}
    </OrderListContext.Provider>
  );
}

export function useOrderList() {
  const ctx = useContext(OrderListContext);
  if (!ctx) {
    throw new Error('useOrderList must be used inside OrderListProvider');
  }
  return ctx;
}
