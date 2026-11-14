import React, { useEffect, useState } from 'react';
import { Download, Eye, Printer, X } from 'lucide-react';
import { useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import {
  formatDateTime,
  formatRwf,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../../lib/format';
import { AdminLayout } from './AdminLayout';
import type { Order, OrderStatus, PaymentStatus } from '../../shared/types';

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
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

  const filtered = orders.filter(
    (o) => !statusFilter || o.orderStatus === statusFilter
  );

  return (
    <AdminLayout title="Order Management">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 no-print">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md"
          >
            <option value="">All Order Statuses</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 text-sm font-semibold border border-[#202020]/20 bg-[#FFFFFF] rounded-md inline-flex items-center gap-2 hover:bg-[#F5F5F5]"
          >
            <Download className="w-4 h-4" />
            Export Orders (CSV)
          </button>
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
                    <td colSpan={7} className="py-8 text-center text-[#202020]/60">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-[#F5F5F5]/60">
                      <td className="py-3 px-4">
                        <p className="font-mono text-xs font-semibold">
                          {o.orderNumber}
                        </p>
                        <p className="text-[11px] text-[#202020]/55">
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
                        <button
                          type="button"
                          onClick={() => openOrder(o)}
                          className="px-3 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded hover:bg-[#F5F5F5] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202020]/10">
              <div>
                <h2 className="text-lg font-bold font-mono text-[#202020]">
                  Order {selected.orderNumber}
                </h2>
                <p className="text-xs text-[#202020]/60">
                  Placed {formatDateTime(selected.createdAt)} ·{' '}
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
