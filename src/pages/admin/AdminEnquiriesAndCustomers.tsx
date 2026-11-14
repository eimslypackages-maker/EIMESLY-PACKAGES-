import { useEffect, useState } from 'react';
import { useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import { formatDate, formatDateTime, formatRwf } from '../../lib/format';
import { AdminLayout } from './AdminLayout';
import type { Enquiry } from '../../shared/types';

export function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useDocumentMeta('Customer Enquiries | Eimesly Packages Admin');

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
  key: string;
  name: string;
  phone: string;
  email: string;
  businessName: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  isRegistered: boolean;
}

export function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentMeta('Customer Management | Eimesly Packages Admin');

  useEffect(() => {
    apiFetch<CustomerRow[]>('/api/admin/customers')
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Customer Management">
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
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#202020]/60">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#202020]/60">
                    No customer records yet.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
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
                    <td className="py-3 px-4 text-right font-semibold tabular-nums">
                      {formatRwf(c.totalSpent)}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#202020]/65">
                      {c.lastOrderDate ? formatDate(c.lastOrderDate) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
