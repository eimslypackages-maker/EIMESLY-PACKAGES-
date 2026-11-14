import React, { useEffect, useState } from 'react';
import { ArrowRightCircle, Eye, Printer, X } from 'lucide-react';
import { useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import {
  formatDate,
  formatRwf,
  QUOTATION_STATUS_LABELS,
} from '../../lib/format';
import { AdminLayout } from './AdminLayout';
import type { Quotation, QuotationStatus } from '../../shared/types';

export function AdminQuotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Quotation | null>(null);

  const [status, setStatus] = useState<QuotationStatus>('new');
  const [proposedUnitPrice, setProposedUnitPrice] = useState('');
  const [proposedQuantity, setProposedQuantity] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [feedback, setFeedback] = useState('');

  useDocumentMeta('Quotation Management | Eimesly Packages Admin');

  const loadQuotations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Quotation[]>('/api/admin/quotations');
      setQuotations(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  const openQuote = (q: Quotation) => {
    setSelected(q);
    setStatus(q.status);
    setProposedUnitPrice(
      q.proposedUnitPrice !== null ? String(q.proposedUnitPrice) : ''
    );
    setProposedQuantity(
      q.proposedQuantity !== null
        ? String(q.proposedQuantity)
        : String(q.estimatedQuantity)
    );
    setValidUntil(q.validUntil || '');
    setAdminNotes(q.adminNotes || '');
    setFeedback('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFeedback('');
    try {
      const unit =
        proposedUnitPrice !== '' ? Number(proposedUnitPrice) : null;
      const qty = proposedQuantity !== '' ? Number(proposedQuantity) : null;
      const total = unit !== null && qty !== null ? unit * qty : null;

      const updated = await apiFetch<Quotation>(
        `/api/admin/quotations/${selected.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status,
            proposedUnitPrice: unit,
            proposedQuantity: qty,
            proposedTotal: total,
            validUntil,
            adminNotes,
          }),
        }
      );
      setSelected(updated);
      await loadQuotations();
      setFeedback('Quotation updated.');
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!selected) return;
    setConverting(true);
    setFeedback('');
    try {
      const res = await apiFetch<{
        quotation: Quotation;
        order: { orderNumber: string };
      }>(`/api/admin/quotations/${selected.id}/convert`, {
        method: 'POST',
      });
      setSelected(res.quotation);
      setStatus(res.quotation.status);
      await loadQuotations();
      setFeedback(`Converted to Order ${res.order.orderNumber}.`);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  return (
    <AdminLayout title="Quotation Management">
      <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] text-xs uppercase tracking-wider text-[#202020]/65">
                <th className="py-3 px-4">Quote #</th>
                <th className="py-3 px-4">Customer / Company</th>
                <th className="py-3 px-4">Product Requested</th>
                <th className="py-3 px-4 text-right">Est. Qty</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Proposed Total</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#202020]/60">
                    Loading quotations...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#202020]/60">
                    No quotation requests yet.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-[#F5F5F5]/60">
                    <td className="py-3 px-4">
                      <p className="font-mono text-xs font-semibold">
                        {q.quoteNumber}
                      </p>
                      <p className="text-[11px] text-[#202020]/55">
                        {formatDate(q.createdAt)}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#202020]">
                        {q.customerName}
                      </p>
                      <p className="text-xs text-[#202020]/60">
                        {q.companyName || q.phone}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs max-w-[220px] truncate">
                      {q.productInterested}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {q.estimatedQuantity}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium">
                      {QUOTATION_STATUS_LABELS[q.status] || q.status}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {q.proposedTotal !== null
                        ? formatRwf(q.proposedTotal)
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openQuote(q)}
                        className="px-3 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded hover:bg-[#F5F5F5] inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202020]/10">
              <div>
                <h2 className="text-lg font-bold font-mono text-[#202020]">
                  Quotation {selected.quoteNumber}
                </h2>
                <p className="text-xs text-[#202020]/60">
                  {selected.customerName} · {selected.companyName || 'Individual'} ·{' '}
                  {selected.phone}
                </p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded-md inline-flex items-center gap-1"
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

            {feedback && (
              <div className="p-3 bg-[#F3EEE6] text-sm text-[#202020] rounded-md">
                {feedback}
              </div>
            )}

            <div className="bg-[#F5F5F5] rounded-lg p-4 space-y-2 text-sm">
              <p>
                <strong>Product:</strong> {selected.productInterested}
              </p>
              <p>
                <strong>Estimated Quantity:</strong> {selected.estimatedQuantity}{' '}
                {selected.preferredSize ? `(${selected.preferredSize})` : ''}
              </p>
              {selected.additionalRequirements && (
                <p>
                  <strong>Requirements:</strong> {selected.additionalRequirements}
                </p>
              )}
              {selected.referenceImageUrl && (
                <div className="pt-2">
                  <p className="text-xs font-semibold mb-1">Reference Image:</p>
                  <img
                    src={selected.referenceImageUrl}
                    alt="Customer reference"
                    className="max-h-40 rounded border"
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Quotation Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as QuotationStatus)
                    }
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                  >
                    {Object.entries(QUOTATION_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Valid Until Date
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Proposed Unit Price (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={proposedUnitPrice}
                    onChange={(e) => setProposedUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Proposed Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={proposedQuantity}
                    onChange={(e) => setProposedQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Calculated Total
                  </label>
                  <div className="px-3 py-2 text-sm bg-[#F5F5F5] border border-[#202020]/10 rounded-md font-semibold tabular-nums">
                    {proposedUnitPrice && proposedQuantity
                      ? formatRwf(
                          Number(proposedUnitPrice) * Number(proposedQuantity)
                        )
                      : '—'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Quotation Notes & Terms
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#202020]/10 no-print">
                {!selected.convertedOrderId ? (
                  <button
                    type="button"
                    disabled={converting}
                    onClick={handleConvert}
                    className="px-4 py-2 text-xs font-semibold bg-[#B58B61] text-[#FFFFFF] rounded-md inline-flex items-center gap-1.5 hover:bg-[#9f764e]"
                  >
                    <ArrowRightCircle className="w-4 h-4" />
                    {converting ? 'Converting...' : 'Convert to Order'}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-[#B58B61]">
                    Already converted to Order #{selected.convertedOrderId}
                  </span>
                )}

                <div className="flex gap-2">
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
                    className="px-5 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                  >
                    {saving ? 'Saving...' : 'Save Quotation'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
