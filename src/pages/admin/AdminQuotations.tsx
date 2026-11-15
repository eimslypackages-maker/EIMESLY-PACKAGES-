import React, { useEffect, useState } from 'react';
import {
  ArrowRightCircle,
  CheckCircle2,
  Eye,
  Plus,
  Printer,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import {
  formatDate,
  formatRwf,
  QUOTATION_STATUS_LABELS,
} from '../../lib/format';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { AdminLayout } from './AdminLayout';
import type {
  Quotation,
  QuotationLineItem,
  QuotationStatus,
} from '../../shared/types';

function emptyLineItem(): QuotationLineItem {
  return {
    productName: '',
    sku: '',
    size: '',
    quantity: 1,
    unitPrice: 0,
    lineTotal: 0,
  };
}

export function AdminQuotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Review / Edit state
  const [status, setStatus] = useState<QuotationStatus>('new');
  const [items, setItems] = useState<QuotationLineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [proposedUnitPrice, setProposedUnitPrice] = useState('');
  const [proposedQuantity, setProposedQuantity] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Create new quotation state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newValidUntil, setNewValidUntil] = useState('');
  const [newDiscount, setNewDiscount] = useState('0');
  const [newNotes, setNewNotes] = useState('');
  const [newItems, setNewItems] = useState<QuotationLineItem[]>([emptyLineItem()]);
  const [creating, setCreating] = useState(false);

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
    const existingItems =
      Array.isArray(q.items) && q.items.length > 0
        ? q.items
        : [
            {
              productName: q.productInterested,
              sku: '',
              size: q.preferredSize || '',
              quantity: q.proposedQuantity ?? q.estimatedQuantity,
              unitPrice: q.proposedUnitPrice ?? 0,
              lineTotal:
                (q.proposedUnitPrice ?? 0) *
                (q.proposedQuantity ?? q.estimatedQuantity),
            },
          ];
    setItems(existingItems);
    setDiscountAmount(String(q.discountAmount || 0));
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

  const updateItemRow = (
    list: QuotationLineItem[],
    setter: React.Dispatch<React.SetStateAction<QuotationLineItem[]>>,
    idx: number,
    patch: Partial<QuotationLineItem>
  ) => {
    setter(
      list.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, ...patch };
        next.lineTotal =
          Math.max(1, Number(next.quantity || 1)) *
          Math.max(0, Number(next.unitPrice || 0));
        return next;
      })
    );
  };

  const itemsSubtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const netProposedTotal = Math.max(
    0,
    itemsSubtotal - Math.max(0, Number(discountAmount || 0))
  );

  const handleSave = async (
    e: React.FormEvent,
    overrideStatus?: QuotationStatus
  ) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFeedback('');
    try {
      const cleanItems = items.filter((it) => it.productName.trim() !== '');
      const firstUnit = cleanItems[0]?.unitPrice ?? (proposedUnitPrice !== '' ? Number(proposedUnitPrice) : null);
      const totalQty =
        cleanItems.reduce((s, it) => s + it.quantity, 0) ||
        (proposedQuantity !== '' ? Number(proposedQuantity) : null);
      const discount = Math.max(0, Math.round(Number(discountAmount || 0)));

      const updated = await apiFetch<Quotation>(
        `/api/admin/quotations/${selected.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status: overrideStatus ?? status,
            items: cleanItems,
            discountAmount: discount,
            proposedUnitPrice: firstUnit,
            proposedQuantity: totalQty,
            proposedTotal:
              cleanItems.length > 0
                ? netProposedTotal
                : firstUnit !== null && totalQty !== null
                  ? Math.max(0, firstUnit * totalQty - discount)
                  : null,
            validUntil,
            adminNotes,
          }),
        }
      );
      setSelected(updated);
      setStatus(updated.status);
      await loadQuotations();
      setFeedback('Quotation saved.');
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const cleanItems = newItems.filter((it) => it.productName.trim() !== '');
      await apiFetch('/api/admin/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customerName: newCustomerName,
          companyName: newCompanyName,
          phone: newPhone,
          email: newEmail,
          validUntil: newValidUntil,
          discountAmount: Number(newDiscount || 0),
          adminNotes: newNotes,
          items: cleanItems,
          status: 'quotation_sent',
        }),
      });
      setCreateOpen(false);
      setNewCustomerName('');
      setNewCompanyName('');
      setNewPhone('');
      setNewEmail('');
      setNewValidUntil('');
      setNewDiscount('0');
      setNewNotes('');
      setNewItems([emptyLineItem()]);
      await loadQuotations();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiFetch(`/api/admin/quotations/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setQuotations((prev) =>
        prev.filter((item) => item.id !== deleteTarget.id)
      );
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      await loadQuotations();
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete quotation'
      );
    } finally {
      setDeleting(false);
    }
  };

  const newSubtotal = newItems.reduce((s, it) => s + it.lineTotal, 0);
  const newNetTotal = Math.max(
    0,
    newSubtotal - Math.max(0, Number(newDiscount || 0))
  );

  return (
    <AdminLayout title="Wholesale & Quotation Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 no-print">
          <p className="text-sm text-[#202020]/70">
            Create custom quotations, configure wholesale pricing & discounts, approve or reject requests, and convert accepted quotes to orders.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Quotation
          </button>
        </div>

        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden no-print">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] text-xs uppercase tracking-wider text-[#202020]/65">
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Customer / Company</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4 text-right">Est. Qty</th>
                  <th className="py-3 px-4">Expiry</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Proposed Total</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]/10">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#202020]/60">
                      Loading quotations...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#202020]/60">
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
                        {q.proposedQuantity ?? q.estimatedQuantity}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#202020]/65">
                        {q.validUntil || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        {QUOTATION_STATUS_LABELS[q.status] || q.status}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums">
                        {q.proposedTotal !== null
                          ? formatRwf(q.proposedTotal)
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openQuote(q)}
                            className="px-3 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded hover:bg-[#F5F5F5] inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Manage
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError('');
                              setDeleteTarget(q);
                            }}
                            aria-label={`Delete quotation ${q.quoteNumber}`}
                            title="Delete quotation permanently"
                            className="p-1.5 text-[#202020]/50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Review / Edit Quotation Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202020]/10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B58B61]">
                  Eimesly Packages · Commercial Quotation
                </p>
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
                  Print / PDF
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
              <div className="p-3 bg-[#F3EEE6] text-sm text-[#202020] rounded-md no-print">
                {feedback}
              </div>
            )}

            {selected.additionalRequirements && (
              <div className="bg-[#F5F5F5] rounded-lg p-3.5 text-xs space-y-1">
                <p>
                  <strong>Customer Notes:</strong> {selected.additionalRequirements}
                </p>
              </div>
            )}

            {selected.referenceImageUrl && (
              <div>
                <p className="text-xs font-semibold mb-1">Reference Image:</p>
                <img
                  src={selected.referenceImageUrl}
                  alt="Customer reference"
                  className="max-h-36 rounded border"
                />
              </div>
            )}

            <form onSubmit={(e) => handleSave(e)} className="space-y-4">
              {/* Multi-item table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#202020]/70">
                    Quotation Line Items
                  </label>
                  <button
                    type="button"
                    onClick={() => setItems([...items, emptyLineItem()])}
                    className="text-xs font-semibold text-[#B58B61] inline-flex items-center gap-1 no-print"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Line Item
                  </button>
                </div>

                <div className="border border-[#202020]/10 rounded-md divide-y divide-[#202020]/10">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <input
                        type="text"
                        placeholder="Product / Specification *"
                        value={it.productName}
                        onChange={(e) =>
                          updateItemRow(items, setItems, idx, {
                            productName: e.target.value,
                          })
                        }
                        className="col-span-4 px-2.5 py-1.5 border border-[#202020]/20 rounded"
                      />
                      <input
                        type="text"
                        placeholder="Size"
                        value={it.size}
                        onChange={(e) =>
                          updateItemRow(items, setItems, idx, {
                            size: e.target.value,
                          })
                        }
                        className="col-span-2 px-2 py-1.5 border border-[#202020]/20 rounded"
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItemRow(items, setItems, idx, {
                            quantity: Number(e.target.value || 1),
                          })
                        }
                        className="col-span-2 px-2 py-1.5 border border-[#202020]/20 rounded tabular-nums"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Unit RWF"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItemRow(items, setItems, idx, {
                            unitPrice: Number(e.target.value || 0),
                          })
                        }
                        className="col-span-2 px-2 py-1.5 border border-[#202020]/20 rounded tabular-nums"
                      />
                      <div className="col-span-2 flex items-center justify-between gap-1 font-semibold tabular-nums">
                        <span>{formatRwf(it.lineTotal)}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setItems(items.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-[#202020]/45 hover:text-red-600 no-print"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Discount (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Net Quotation Total
                  </label>
                  <div className="px-3 py-2 text-sm bg-[#F5F5F5] border border-[#202020]/10 rounded-md font-bold tabular-nums">
                    {formatRwf(netProposedTotal)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Quotation Notes & Terms
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#202020]/10 no-print">
                <div className="flex flex-wrap items-center gap-2">
                  {!selected.convertedOrderId && (
                    <>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={(e) => handleSave(e, 'accepted')}
                        className="px-3 py-2 text-xs font-semibold bg-emerald-700 text-[#FFFFFF] rounded-md inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={(e) => handleSave(e, 'rejected')}
                        className="px-3 py-2 text-xs font-semibold border border-red-300 text-red-700 rounded-md inline-flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={converting}
                        onClick={handleConvert}
                        className="px-3.5 py-2 text-xs font-semibold bg-[#B58B61] text-[#FFFFFF] rounded-md inline-flex items-center gap-1.5 hover:bg-[#9f764e]"
                      >
                        <ArrowRightCircle className="w-4 h-4" />
                        {converting ? 'Converting...' : 'Convert to Order'}
                      </button>
                    </>
                  )}
                  {selected.convertedOrderId && (
                    <span className="text-xs font-semibold text-[#B58B61]">
                      Converted to Order #{selected.convertedOrderId}
                    </span>
                  )}
                </div>

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

      {/* Create New Quotation Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202020]/10">
              <h2 className="text-lg font-bold text-[#202020]">
                Create Wholesale Quotation
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Customer Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Company / Business Name
                  </label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Phone Number *
                  </label>
                  <input
                    required
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#202020]/70">
                    Quotation Items
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewItems([...newItems, emptyLineItem()])}
                    className="text-xs font-semibold text-[#B58B61] inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="border border-[#202020]/10 rounded-md divide-y divide-[#202020]/10">
                  {newItems.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <input
                        required
                        type="text"
                        placeholder="Product Name *"
                        value={it.productName}
                        onChange={(e) =>
                          updateItemRow(newItems, setNewItems, idx, {
                            productName: e.target.value,
                          })
                        }
                        className="col-span-4 px-2.5 py-1.5 border border-[#202020]/20 rounded"
                      />
                      <input
                        type="text"
                        placeholder="Size"
                        value={it.size}
                        onChange={(e) =>
                          updateItemRow(newItems, setNewItems, idx, {
                            size: e.target.value,
                          })
                        }
                        className="col-span-2 px-2 py-1.5 border border-[#202020]/20 rounded"
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItemRow(newItems, setNewItems, idx, {
                            quantity: Number(e.target.value || 1),
                          })
                        }
                        className="col-span-2 px-2 py-1.5 border border-[#202020]/20 rounded tabular-nums"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Unit RWF"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItemRow(newItems, setNewItems, idx, {
                            unitPrice: Number(e.target.value || 0),
                          })
                        }
                        className="col-span-2 px-2 py-1.5 border border-[#202020]/20 rounded tabular-nums"
                      />
                      <div className="col-span-2 flex items-center justify-between gap-1 font-semibold tabular-nums">
                        <span>{formatRwf(it.lineTotal)}</span>
                        {newItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setNewItems(newItems.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-[#202020]/45 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Valid Until Date
                  </label>
                  <input
                    type="date"
                    value={newValidUntil}
                    onChange={(e) => setNewValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Discount (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Net Quotation Total
                  </label>
                  <div className="px-3 py-2 text-sm bg-[#F5F5F5] border border-[#202020]/10 rounded-md font-bold tabular-nums">
                    {formatRwf(newNetTotal)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Terms & Notes
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 text-sm border border-[#202020]/20 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                >
                  {creating ? 'Creating...' : 'Create Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete Quotation Record"
        itemLabel={
          deleteTarget
            ? `Quotation ${deleteTarget.quoteNumber} — ${deleteTarget.customerName}`
            : ''
        }
        description="Deleting this quotation will permanently remove the quote request, pricing lines, and notes from the database."
        deleting={deleting}
        error={deleteError}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError('');
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </AdminLayout>
  );
}
