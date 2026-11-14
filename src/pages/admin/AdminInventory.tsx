import React, { useEffect, useState } from 'react';
import { ArrowDownUp, X } from 'lucide-react';
import { useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import { AVAILABILITY_LABELS, formatDateTime } from '../../lib/format';
import { AdminLayout } from './AdminLayout';
import type { InventoryMovement, Product } from '../../shared/types';

interface InventoryResponse {
  products: Product[];
  movements: InventoryMovement[];
}

export function AdminInventory() {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<
    'addition' | 'reduction' | 'adjustment'
  >('addition');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useDocumentMeta('Inventory Management | Eimesly Packages Admin');

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<InventoryResponse>('/api/admin/inventory');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    setSaving(true);
    try {
      await apiFetch('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: adjustProduct.id,
          movementType,
          quantity: Number(quantity),
          reason,
        }),
      });
      setAdjustProduct(null);
      setQuantity('');
      setReason('');
      await loadInventory();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const products = (data?.products || []).filter((p) => {
    if (filter === 'low') {
      return (
        p.availabilityStatus !== 'sample_listing' &&
        p.stockQuantity > 0 &&
        p.stockQuantity <= p.lowStockThreshold
      );
    }
    if (filter === 'out') {
      return (
        p.availabilityStatus === 'out_of_stock' ||
        (p.availabilityStatus !== 'sample_listing' && p.stockQuantity === 0)
      );
    }
    return true;
  });

  return (
    <AdminLayout title="Inventory Management">
      <div className="space-y-8">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Products' },
            { id: 'low', label: 'Low-Stock Alerts' },
            { id: 'out', label: 'Out of Stock' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id as typeof filter)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === f.id
                  ? 'bg-[#202020] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] border border-[#202020]/15 text-[#202020]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] text-xs uppercase tracking-wider text-[#202020]/65">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Available Stock</th>
                  <th className="py-3 px-4 text-right">Alert Threshold</th>
                  <th className="py-3 px-4 text-right">Update Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#202020]/60">
                      Loading inventory...
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F5F5F5]/60">
                      <td className="py-3 px-4 font-medium text-[#202020]">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{p.sku}</td>
                      <td className="py-3 px-4 text-xs">
                        {AVAILABILITY_LABELS[p.availabilityStatus] ||
                          p.availabilityStatus}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        {p.stockQuantity}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[#202020]/65">
                        {p.lowStockThreshold}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustProduct(p);
                            setMovementType('addition');
                            setQuantity('');
                            setReason('');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded hover:bg-[#F5F5F5] inline-flex items-center gap-1"
                        >
                          <ArrowDownUp className="w-3.5 h-3.5" />
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Movement History */}
        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#202020]/10">
            <h2 className="text-base font-bold text-[#202020]">
              Stock Movement Audit Trail
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] text-xs uppercase tracking-wider text-[#202020]/65">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Change</th>
                  <th className="py-3 px-4 text-right">Prev → New</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]/10">
                {(data?.movements || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#202020]/60">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  (data?.movements || []).map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 px-4 text-xs text-[#202020]/65">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium">
                        {m.productName} ({m.sku})
                      </td>
                      <td className="py-2.5 px-4 text-xs capitalize">
                        {m.movementType.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums">
                        {m.quantityChange > 0
                          ? `+${m.quantityChange}`
                          : m.quantityChange}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs tabular-nums">
                        {m.previousStock} → {m.newStock}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#202020]/75">
                        {m.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {adjustProduct && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#202020]/10">
              <h2 className="text-base font-bold text-[#202020]">
                Update Stock: {adjustProduct.name}
              </h2>
              <button
                type="button"
                onClick={() => setAdjustProduct(null)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Movement Type
                </label>
                <select
                  value={movementType}
                  onChange={(e) =>
                    setMovementType(
                      e.target.value as 'addition' | 'reduction' | 'adjustment'
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                >
                  <option value="addition">Stock Addition (+)</option>
                  <option value="reduction">Stock Reduction (-)</option>
                  <option value="adjustment">Set Exact Stock Level</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Quantity *
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Reason / Reference *
                </label>
                <input
                  required
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Supplier restock, damaged pack, physical count"
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustProduct(null)}
                  className="px-4 py-2 text-sm border border-[#202020]/20 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                >
                  {saving ? 'Updating...' : 'Save Stock Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
