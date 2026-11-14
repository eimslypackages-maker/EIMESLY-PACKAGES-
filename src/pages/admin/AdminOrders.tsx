import React, { useEffect, useState } from 'react';
import { Download, Eye, Plus, Printer, Trash2, X } from 'lucide-react';
import { useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import {
  formatDateTime,
  formatRwf,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../../lib/format';
import { AdminLayout } from './AdminLayout';
import type {
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
} from '../../shared/types';

interface DraftOrderItem {
  productId: string;
  productName: string;
  sku: string;
  selectedSize: string;
  quantity: number;
  unitPrice: number;
}

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);

  const [orderStatus, setOrderStatus] = useState<OrderStatus>('new_order');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [paymentReference, setPaymentReference] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [saving, setSaving] = useState(false);

  // Record WhatsApp Order modal state
  const [recordOpen, setRecordOpen] = useState(false);
  const [recCustomerName, setRecCustomerName] = useState('');
  const [recPhone, setRecPhone] = useState('');
  const [recEmail, setRecEmail] = useState('');
  const [recBusinessName, setRecBusinessName] = useState('');
  const [recAddress, setRecAddress] = useState('Confirmed via WhatsApp');
  const [recDistrict, setRecDistrict] = useState('Kigali');
  const [recOrderType, setRecOrderType] = useState<'retail' | 'wholesale'>('retail');
  const [recOrderStatus, setRecOrderStatus] = useState<OrderStatus>('confirmed');
  const [recPaymentStatus, setRecPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [recPaymentReference, setRecPaymentReference] = useState('');
  const [recDeliveryFee, setRecDeliveryFee] = useState('0');
  const [recDeductStock, setRecDeductStock] = useState(true);
  const [recNotes, setRecNotes] = useState('');
  const [recItems, setRecItems] = useState<DraftOrderItem[]>([
    {
      productId: '',
      productName: '',
      sku: '',
      selectedSize: '',
      quantity: 1,
      unitPrice: 0,
    },
  ]);
  const [recSaving, setRecSaving] = useState(false);
  const [recError, setRecError] = useState('');

  useDocumentMeta('Order Management | Eimesly Packages Admin');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Order[]>('/api/admin/orders');
      setOrders(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const openRecordModal = async () => {
    setRecError('');
    setRecCustomerName('');
    setRecPhone('');
    setRecEmail('');
    setRecBusinessName('');
    setRecAddress('Confirmed via WhatsApp');
    setRecDistrict('Kigali');
    setRecOrderType('retail');
    setRecOrderStatus('confirmed');
    setRecPaymentStatus('unpaid');
    setRecPaymentReference('');
    setRecDeliveryFee('0');
    setRecDeductStock(true);
    setRecNotes('');
    setRecItems([
      {
        productId: '',
        productName: '',
        sku: '',
        selectedSize: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
    setRecordOpen(true);

    if (catalogProducts.length === 0) {
      try {
        const prods = await apiFetch<Product[]>('/api/admin/products');
        setCatalogProducts(prods);
      } catch (err) {
        console.error('Failed to load product catalog:', err);
      }
    }
  };

  const handleProductPick = (index: number, prodIdStr: string) => {
    const prod = catalogProducts.find((p) => String(p.id) === prodIdStr);
    setRecItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (!prod) {
          return { ...item, productId: '' };
        }
        const suggestedPrice =
          recOrderType === 'wholesale'
            ? prod.wholesalePrice ?? prod.unitPrice ?? 0
            : prod.unitPrice ?? prod.wholesalePrice ?? 0;
        return {
          productId: String(prod.id),
          productName: prod.name,
          sku: prod.sku,
          selectedSize: prod.sizes[0] || '',
          quantity: Math.max(1, prod.moq || 1),
          unitPrice: suggestedPrice,
        };
      })
    );
  };

  const updateDraftItem = (
    index: number,
    patch: Partial<DraftOrderItem>
  ) => {
    setRecItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleCreateWhatsAppOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecError('');
    const validItems = recItems.filter((it) => it.productName.trim().length > 0);
    if (validItems.length === 0) {
      setRecError('Add at least one product line item.');
      return;
    }

    setRecSaving(true);
    try {
      await apiFetch('/api/admin/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: recCustomerName,
          phone: recPhone,
          email: recEmail,
          businessName: recBusinessName,
          deliveryAddress: recAddress,
          district: recDistrict,
          orderType: recOrderType,
          orderStatus: recOrderStatus,
          paymentStatus: recPaymentStatus,
          paymentReference: recPaymentReference,
          deliveryFee: Number(recDeliveryFee || 0),
          deductStock: recDeductStock,
          internalNotes: recNotes,
          items: validItems.map((it) => ({
            productId: it.productId ? Number(it.productId) : null,
            productName: it.productName,
            sku: it.sku,
            selectedSize: it.selectedSize,
            quantity: Math.max(1, Number(it.quantity || 1)),
            unitPrice: Math.max(0, Number(it.unitPrice || 0)),
          })),
        }),
      });
      setRecordOpen(false);
      await loadOrders();
    } catch (err: unknown) {
      setRecError(
        err instanceof Error ? err.message : 'Unable to record WhatsApp order'
      );
    } finally {
      setRecSaving(false);
    }
  };

  const openOrder = (o: Order) => {
    setSelected(o);
    setOrderStatus(o.orderStatus);
    setPaymentStatus(o.paymentStatus);
    setPaymentReference(o.paymentReference || '');
    setInternalNotes(o.internalNotes || '');
    setCustomerName(o.customerName);
    setPhone(o.phone);
    setDeliveryAddress(o.deliveryAddress);
    setDistrict(o.district);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/orders/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          orderStatus,
          paymentStatus,
          paymentReference,
          internalNotes,
          customerName,
          phone,
          deliveryAddress,
          district,
        }),
      });
      await loadOrders();
      setSelected(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    const csv = await apiFetch<string>('/api/admin/orders/export');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eimesly-orders.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleQuickStatus = async (id: number, nextStatus: OrderStatus) => {
    try {
      await apiFetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ orderStatus: nextStatus }),
      });
      setConfirmCancelId(null);
      await loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = orders.filter((o) => {
    if (statusFilter && o.orderStatus !== statusFilter) return false;
    if (typeFilter && o.orderType !== typeFilter) return false;
    if (dateFrom) {
      if (new Date(o.createdAt) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      if (new Date(o.createdAt) > new Date(`${dateTo}T23:59:59.999Z`)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        (o.businessName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const recSubtotal = recItems.reduce(
    (sum, it) => sum + Math.max(1, it.quantity) * Math.max(0, it.unitPrice),
    0
  );
  const recTotal = recSubtotal + Math.max(0, Number(recDeliveryFee || 0));

  return (
    <AdminLayout title="Order Management">
      <div className="space-y-4">
        <div className="px-4 py-3 bg-[#F3EEE6] border border-[#202020]/10 rounded-lg text-xs text-[#202020]/80 flex flex-wrap items-center justify-between gap-2 no-print">
          <span>
            This ledger stores confirmed WhatsApp and direct B2B orders recorded by staff. Storefront WhatsApp button clicks are tracked separately under Reports & Analytics.
          </span>
        </div>

        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, customer, phone..."
              className="w-56 px-3 py-1.5 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md"
            >
              <option value="">All Types</option>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md"
            >
              <option value="">All Statuses</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From date"
              className="px-2.5 py-1.5 text-xs border border-[#202020]/15 rounded-md"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To date"
              className="px-2.5 py-1.5 text-xs border border-[#202020]/15 rounded-md"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2 text-xs font-semibold border border-[#202020]/20 bg-[#FFFFFF] rounded-md inline-flex items-center gap-2 hover:bg-[#F5F5F5] whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              Export Orders (CSV)
            </button>
            <button
              type="button"
              onClick={openRecordModal}
              className="px-4 py-2 text-xs font-semibold bg-[#202020] text-[#FFFFFF] rounded-md inline-flex items-center gap-1.5 hover:bg-[#333333] whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Record WhatsApp Order
            </button>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden no-print">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] text-xs uppercase tracking-wider text-[#202020]/65">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Order Status</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#202020]/60">
                      Loading orders...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#202020]/60 space-y-2">
                      <p>No confirmed orders recorded yet.</p>
                      <button
                        type="button"
                        onClick={openRecordModal}
                        className="px-4 py-2 text-xs font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                      >
                        Record First WhatsApp Order
                      </button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-[#F5F5F5]/60">
                      <td className="py-3 px-4">
                        <p className="font-mono text-xs font-semibold">
                          {o.orderNumber}
                        </p>
                        <p className="text-[11px] text-[#202020]/55 tabular-nums">
                          {formatDateTime(o.createdAt)}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#202020]">
                          {o.customerName}
                        </p>
                        <p className="text-xs text-[#202020]/60">
                          {o.phone}
                          {o.businessName ? ` · ${o.businessName}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs capitalize">
                        {o.orderType}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        {ORDER_STATUS_LABELS[o.orderStatus] || o.orderStatus}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {PAYMENT_STATUS_LABELS[o.paymentStatus] ||
                          o.paymentStatus}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums">
                        {o.totalAmount > 0
                          ? formatRwf(o.totalAmount)
                          : 'Quote / Pending'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {o.orderStatus === 'new_order' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(o.id, 'confirmed')}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#B58B61] text-[#FFFFFF] rounded hover:bg-[#9f764e]"
                            >
                              Confirm
                            </button>
                          )}
                          {!['completed', 'cancelled'].includes(o.orderStatus) && (
                            confirmCancelId === o.id ? (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatus(o.id, 'cancelled')}
                                  className="px-2 py-1 text-[11px] font-semibold bg-red-600 text-white rounded"
                                >
                                  Cancel Order
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmCancelId(null)}
                                  className="px-2 py-1 text-[11px] border border-[#202020]/20 rounded"
                                >
                                  No
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmCancelId(o.id)}
                                className="px-2 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() => openOrder(o)}
                            className="px-3 py-1 text-xs font-semibold border border-[#202020]/20 rounded hover:bg-[#F5F5F5] inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record WhatsApp Order Modal */}
      {recordOpen && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202020]/10">
              <div>
                <h2 className="text-lg font-bold text-[#202020]">
                  Record Confirmed WhatsApp Order
                </h2>
                <p className="text-xs text-[#202020]/60">
                  Log an agreed WhatsApp or wholesale order into the ledger and optionally deduct warehouse stock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecordOpen(false)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md">
                {recError}
              </div>
            )}

            <form onSubmit={handleCreateWhatsAppOrder} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Customer Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={recCustomerName}
                    onChange={(e) => setRecCustomerName(e.target.value)}
                    placeholder="e.g. Jean Paul Mugisha"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    WhatsApp / Phone Number *
                  </label>
                  <input
                    required
                    type="text"
                    value={recPhone}
                    onChange={(e) => setRecPhone(e.target.value)}
                    placeholder="+250 788 ..."
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Business Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={recBusinessName}
                    onChange={(e) => setRecBusinessName(e.target.value)}
                    placeholder="Cafe / Hotel / Restaurant"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Customer Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={recEmail}
                    onChange={(e) => setRecEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Delivery / Collection Location
                  </label>
                  <input
                    type="text"
                    value={recAddress}
                    onChange={(e) => setRecAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={recDistrict}
                    onChange={(e) => setRecDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Order Type
                  </label>
                  <select
                    value={recOrderType}
                    onChange={(e) =>
                      setRecOrderType(e.target.value as 'retail' | 'wholesale')
                    }
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Order Status
                  </label>
                  <select
                    value={recOrderStatus}
                    onChange={(e) =>
                      setRecOrderStatus(e.target.value as OrderStatus)
                    }
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                  >
                    {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Payment Status
                  </label>
                  <select
                    value={recPaymentStatus}
                    onChange={(e) =>
                      setRecPaymentStatus(e.target.value as PaymentStatus)
                    }
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                  >
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Delivery Fee (RWF)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={recDeliveryFee}
                    onChange={(e) => setRecDeliveryFee(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202020]/70">
                    Ordered Products
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setRecItems((prev) => [
                        ...prev,
                        {
                          productId: '',
                          productName: '',
                          sku: '',
                          selectedSize: '',
                          quantity: 1,
                          unitPrice: 0,
                        },
                      ])
                    }
                    className="px-3 py-1 text-xs font-semibold border border-[#202020]/20 rounded hover:bg-[#F5F5F5] inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Line Item
                  </button>
                </div>

                <div className="space-y-2.5">
                  {recItems.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-[#202020]/15 rounded-lg space-y-2.5 bg-[#F5F5F5]/40"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-semibold mb-1">
                            Select Catalogue Product
                          </label>
                          <select
                            value={it.productId}
                            onChange={(e) =>
                              handleProductPick(idx, e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-[#202020]/20 rounded bg-[#FFFFFF]"
                          >
                            <option value="">Custom / Manual Item...</option>
                            {catalogProducts.map((p) => (
                              <option key={p.id} value={String(p.id)}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold mb-1">
                            Product Name *
                          </label>
                          <input
                            required
                            type="text"
                            value={it.productName}
                            onChange={(e) =>
                              updateDraftItem(idx, { productName: e.target.value })
                            }
                            placeholder="Product description"
                            className="w-full px-2.5 py-1.5 text-xs border border-[#202020]/20 rounded bg-[#FFFFFF]"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold mb-1">
                            Size / Variant
                          </label>
                          <input
                            type="text"
                            value={it.selectedSize}
                            onChange={(e) =>
                              updateDraftItem(idx, { selectedSize: e.target.value })
                            }
                            placeholder="e.g. 8 oz"
                            className="w-full px-2.5 py-1.5 text-xs border border-[#202020]/20 rounded bg-[#FFFFFF]"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          {recItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setRecItems((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              title="Remove item"
                              className="p-1.5 text-red-700 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center">
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">
                            SKU
                          </label>
                          <input
                            type="text"
                            value={it.sku}
                            onChange={(e) =>
                              updateDraftItem(idx, { sku: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-[#202020]/20 rounded bg-[#FFFFFF] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">
                            Quantity *
                          </label>
                          <input
                            required
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) =>
                              updateDraftItem(idx, {
                                quantity: Math.max(1, Number(e.target.value || 1)),
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-[#202020]/20 rounded bg-[#FFFFFF] tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">
                            Agreed Unit Price (RWF)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={it.unitPrice}
                            onChange={(e) =>
                              updateDraftItem(idx, {
                                unitPrice: Math.max(0, Number(e.target.value || 0)),
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-[#202020]/20 rounded bg-[#FFFFFF] tabular-nums"
                          />
                        </div>
                        <div className="text-right pt-4 text-xs font-semibold tabular-nums">
                          {formatRwf(
                            Math.max(1, it.quantity) * Math.max(0, it.unitPrice)
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Payment Reference / Internal Notes
                  </label>
                  <input
                    type="text"
                    value={recPaymentReference}
                    onChange={(e) => setRecPaymentReference(e.target.value)}
                    placeholder="MoMo Ref / Receipt # (optional)"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md mb-2"
                  />
                  <textarea
                    rows={2}
                    value={recNotes}
                    onChange={(e) => setRecNotes(e.target.value)}
                    placeholder="WhatsApp conversation summary or delivery notes..."
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>

                <div className="p-4 bg-[#F3EEE6] rounded-lg space-y-2.5 text-sm">
                  <div className="flex justify-between text-xs text-[#202020]/70">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatRwf(recSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#202020]/70">
                    <span>Delivery Fee</span>
                    <span className="tabular-nums">
                      {formatRwf(Math.max(0, Number(recDeliveryFee || 0)))}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#202020]/15 flex justify-between font-bold">
                    <span>Order Total</span>
                    <span className="tabular-nums">{formatRwf(recTotal)}</span>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs pt-1 text-[#202020]">
                    <input
                      type="checkbox"
                      checked={recDeductStock}
                      onChange={(e) => setRecDeductStock(e.target.checked)}
                    />
                    Deduct quantities from warehouse inventory
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordOpen(false)}
                  className="px-4 py-2 text-sm border border-[#202020]/20 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recSaving}
                  className="px-6 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                >
                  {recSaving ? 'Saving Order...' : 'Save Confirmed Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Existing Order Details & Edit Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202020]/10">
              <div>
                <h2 className="text-lg font-bold font-mono text-[#202020]">
                  Order {selected.orderNumber}
                </h2>
                <p className="text-xs text-[#202020]/60">
                  Recorded {formatDateTime(selected.createdAt)} ·{' '}
                  {selected.orderType.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded-md inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-1 text-[#202020]/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-[#202020]/10 rounded-lg divide-y divide-[#202020]/10">
              {(selected.items || []).map((it) => (
                <div
                  key={it.id}
                  className="p-3.5 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-[#202020]">
                      {it.productName}
                    </p>
                    <p className="text-xs text-[#202020]/60">
                      SKU: {it.sku || '—'} · Qty: {it.quantity}
                      {it.selectedSize ? ` · ${it.selectedSize}` : ''}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {it.lineTotal > 0 ? formatRwf(it.lineTotal) : 'Price on Review'}
                  </span>
                </div>
              ))}
              <div className="p-3.5 bg-[#F5F5F5] flex justify-between text-sm font-bold">
                <span>Recorded Total</span>
                <span className="tabular-nums">
                  {selected.totalAmount > 0
                    ? formatRwf(selected.totalAmount)
                    : 'Pending Quote'}
                </span>
              </div>
            </div>

            {/* Update Form */}
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Order Status
                  </label>
                  <select
                    value={orderStatus}
                    onChange={(e) =>
                      setOrderStatus(e.target.value as OrderStatus)
                    }
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                  >
                    {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(e.target.value as PaymentStatus)
                    }
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                  >
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Tx ID / Receipt #"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Internal Admin Notes
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 no-print">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 text-sm border border-[#202020]/20 rounded-md"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                >
                  {saving ? 'Updating...' : 'Save Order Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
