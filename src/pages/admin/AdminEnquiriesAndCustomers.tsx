import React, { useEffect, useState } from 'react';
import { Download, Edit2, Eye, X } from 'lucide-react';
import { useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import {
  downloadCsv,
  formatDate,
  formatDateTime,
  formatRwf,
  ORDER_STATUS_LABELS,
  QUOTATION_STATUS_LABELS,
} from '../../lib/format';
import { AdminLayout } from './AdminLayout';
import type { Enquiry, Order, Quotation } from '../../shared/types';

export function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useDocumentMeta('Customer & Wholesale Enquiries | Eimesly Packages Admin');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Enquiry[]>('/api/admin/enquiries');
      setEnquiries(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateEnquiry = async (
    id: number,
    status: string,
    adminNotes: string
  ) => {
    setSavingId(id);
    try {
      await apiFetch(`/api/admin/enquiries/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, adminNotes }),
      });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout title="Customer & Wholesale Enquiries">
      <div className="space-y-4">
        {loading ? (
          <div className="h-40 bg-[#FFFFFF] rounded-lg animate-pulse" />
        ) : enquiries.length === 0 ? (
          <div className="p-10 bg-[#FFFFFF] border border-[#202020]/10 rounded-lg text-center text-sm text-[#202020]/65">
            No enquiries submitted yet.
          </div>
        ) : (
          enquiries.map((eq) => (
            <div
              key={eq.id}
              className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-[#B58B61]">
                    {eq.enquiryType.replace('_', ' ')} ·{' '}
                    {formatDateTime(eq.createdAt)}
                  </p>
                  <h2 className="text-base font-bold text-[#202020] mt-0.5">
                    {eq.subject}
                  </h2>
                  <p className="text-xs text-[#202020]/70 mt-0.5">
                    {eq.fullName}
                    {eq.businessName ? ` (${eq.businessName})` : ''} · {eq.phone}
                    {eq.email ? ` · ${eq.email}` : ''}
                  </p>
                </div>

                <select
                  value={eq.status}
                  disabled={savingId === eq.id}
                  onChange={(e) =>
                    updateEnquiry(eq.id, e.target.value, eq.adminNotes)
                  }
                  className="px-3 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <p className="text-sm text-[#202020]/85 bg-[#F5F5F5] p-3.5 rounded-md">
                {eq.message}
              </p>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}

interface CustomerRow {
  id: number | null;
  key: string;
  name: string;
  phone: string;
  email: string;
  businessName: string;
  deliveryAddress: string;
  district: string;
  orderCount: number;
  quoteCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  isRegistered: boolean;
}

export function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // History modal
  const [historyTarget, setHistoryTarget] = useState<CustomerRow | null>(null);
  const [historyData, setHistoryData] = useState<{
    orders: Order[];
    quotations: Quotation[];
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<CustomerRow | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBusiness, setEditBusiness] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [saving, setSaving] = useState(false);

  useDocumentMeta('Customer Management | Eimesly Packages Admin');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<CustomerRow[]>('/api/admin/customers');
      setCustomers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openHistory = async (c: CustomerRow) => {
    setHistoryTarget(c);
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const params = new URLSearchParams();
      if (c.id) params.set('userId', String(c.id));
      if (c.email) params.set('email', c.email);
      if (c.phone) params.set('phone', c.phone);
      const res = await apiFetch<{ orders: Order[]; quotations: Quotation[] }>(
        `/api/admin/customers/history?${params.toString()}`
      );
      setHistoryData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openEdit = (c: CustomerRow) => {
    setEditTarget(c);
    setEditFullName(c.name);
    setEditPhone(c.phone);
    setEditBusiness(c.businessName);
    setEditAddress(c.deliveryAddress || '');
    setEditDistrict(c.district || '');
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget?.id) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/customers/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: editFullName,
          phone: editPhone,
          businessName: editBusiness,
          deliveryAddress: editAddress,
          district: editDistrict,
        }),
      });
      setEditTarget(null);
      await loadCustomers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.businessName.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const exportCsv = () => {
    downloadCsv(
      'eimesly-customers.csv',
      [
        'Name',
        'Type',
        'Business',
        'Phone',
        'Email',
        'Orders',
        'Quotations',
        'Total Purchases (RWF)',
        'Last Order Date',
      ],
      filtered.map((c) => [
        c.name,
        c.isRegistered ? 'Registered' : 'Guest',
        c.businessName,
        c.phone,
        c.email,
        c.orderCount,
        c.quoteCount,
        c.totalSpent,
        c.lastOrderDate || '',
      ])
    );
  };

  return (
    <AdminLayout title="Customer Management">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name, business, phone, or email..."
            className="w-full sm:max-w-sm px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="px-4 py-2 text-xs font-semibold border border-[#202020]/20 bg-[#FFFFFF] rounded-md inline-flex items-center gap-1.5 hover:bg-[#F5F5F5]"
          >
            <Download className="w-4 h-4" />
            Export Customers CSV
          </button>
        </div>

        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] text-xs uppercase tracking-wider text-[#202020]/65">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-right">Orders</th>
                  <th className="py-3 px-4 text-right">Quotes</th>
                  <th className="py-3 px-4 text-right">Total Purchases</th>
                  <th className="py-3 px-4">Last Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]/10">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#202020]/60">
                      Loading customers...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#202020]/60">
                      No matching customers found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.key} className="hover:bg-[#F5F5F5]/60">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#202020]">{c.name}</p>
                        <p className="text-[11px] text-[#202020]/55">
                          {c.isRegistered ? 'Registered Account' : 'Guest Buyer'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {c.businessName || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs">{c.phone || '—'}</td>
                      <td className="py-3 px-4 text-xs">{c.email || '—'}</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {c.orderCount}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {c.quoteCount}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums">
                        {formatRwf(c.totalSpent)}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#202020]/65">
                        {c.lastOrderDate ? formatDate(c.lastOrderDate) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openHistory(c)}
                            title="Order & quotation history"
                            className="px-2.5 py-1 text-xs font-semibold border border-[#202020]/20 rounded hover:bg-[#F5F5F5] inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            History
                          </button>
                          {c.isRegistered && c.id && (
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              title="Edit customer details"
                              className="p-1.5 text-[#202020]/70 hover:text-[#202020]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Customer History Modal */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202020]/10">
              <div>
                <h2 className="text-base font-bold text-[#202020]">
                  {historyTarget.name}
                </h2>
                <p className="text-xs text-[#202020]/60">
                  {historyTarget.businessName || 'Direct Buyer'} ·{' '}
                  {historyTarget.phone} · {historyTarget.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading || !historyData ? (
              <p className="text-sm text-[#202020]/60">Loading history...</p>
            ) : (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202020]/70 mb-2">
                    Orders ({historyData.orders.length})
                  </h3>
                  {historyData.orders.length === 0 ? (
                    <p className="text-xs text-[#202020]/60">No orders yet.</p>
                  ) : (
                    <div className="border border-[#202020]/10 rounded divide-y divide-[#202020]/10 text-xs">
                      {historyData.orders.map((o) => (
                        <div
                          key={o.id}
                          className="p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-mono font-semibold">
                              {o.orderNumber}
                            </p>
                            <p className="text-[#202020]/60">
                              {formatDate(o.createdAt)} ·{' '}
                              {ORDER_STATUS_LABELS[o.orderStatus] || o.orderStatus}
                            </p>
                          </div>
                          <span className="font-semibold tabular-nums">
                            {formatRwf(o.totalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202020]/70 mb-2">
                    Quotation History ({historyData.quotations.length})
                  </h3>
                  {historyData.quotations.length === 0 ? (
                    <p className="text-xs text-[#202020]/60">
                      No quotations submitted.
                    </p>
                  ) : (
                    <div className="border border-[#202020]/10 rounded divide-y divide-[#202020]/10 text-xs">
                      {historyData.quotations.map((q) => (
                        <div
                          key={q.id}
                          className="p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-mono font-semibold">
                              {q.quoteNumber}
                            </p>
                            <p className="text-[#202020]/60">
                              {q.productInterested} ·{' '}
                              {QUOTATION_STATUS_LABELS[q.status] || q.status}
                            </p>
                          </div>
                          <span className="font-semibold tabular-nums">
                            {q.proposedTotal !== null
                              ? formatRwf(q.proposedTotal)
                              : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#202020]/10">
              <h2 className="text-base font-bold text-[#202020]">
                Edit Customer Information
              </h2>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editBusiness}
                  onChange={(e) => setEditBusiness(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-sm border border-[#202020]/20 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
