import React, { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2, Upload, X } from 'lucide-react';
import { useApp, useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import { AVAILABILITY_LABELS, formatRwf } from '../../lib/format';
import { uploadImageFile } from '../../lib/upload';
import { SmartImage } from '../../components/SmartImage';
import { AdminLayout } from './AdminLayout';
import type { AvailabilityStatus, Category, Product } from '../../shared/types';

interface ProductFormState {
  id?: number;
  categoryId: string;
  name: string;
  sku: string;
  description: string;
  material: string;
  brand: string;
  sizesText: string;
  colorsText: string;
  packagingQuantity: string;
  unitPrice: string;
  wholesalePrice: string;
  moq: string;
  stockQuantity: string;
  lowStockThreshold: string;
  availabilityStatus: AvailabilityStatus;
  images: string[];
  isFeatured: boolean;
  isActive: boolean;
  isSample: boolean;
}

const EMPTY_FORM: ProductFormState = {
  categoryId: '',
  name: '',
  sku: '',
  description: '',
  material: '',
  brand: 'Eimesly Packages',
  sizesText: '',
  colorsText: '',
  packagingQuantity: '',
  unitPrice: '',
  wholesalePrice: '',
  moq: '1',
  stockQuantity: '0',
  lowStockThreshold: '10',
  availabilityStatus: 'in_stock',
  images: [],
  isFeatured: false,
  isActive: true,
  isSample: false,
};

export function AdminProducts() {
  const { refreshBootstrap } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useDocumentMeta('Product Management | Eimesly Packages Admin');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        apiFetch<Product[]>('/api/admin/products'),
        apiFetch<Category[]>('/api/admin/categories'),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setError('');
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0] ? String(categories[0].id) : '',
    });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setError('');
    setForm({
      id: p.id,
      categoryId: p.categoryId ? String(p.categoryId) : '',
      name: p.name,
      sku: p.sku,
      description: p.description,
      material: p.material,
      brand: p.brand,
      sizesText: (p.sizes || []).join(', '),
      colorsText: (p.colors || []).join(', '),
      packagingQuantity: p.packagingQuantity,
      unitPrice: p.unitPrice !== null ? String(p.unitPrice) : '',
      wholesalePrice: p.wholesalePrice !== null ? String(p.wholesalePrice) : '',
      moq: String(p.moq || 1),
      stockQuantity: String(p.stockQuantity || 0),
      lowStockThreshold: String(p.lowStockThreshold || 10),
      availabilityStatus: p.availabilityStatus,
      images: p.images || [],
      isFeatured: p.isFeatured,
      isActive: p.isActive,
      isSample: p.isSample,
    });
    setModalOpen(true);
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const file of files) {
        const res = await uploadImageFile(file, form.name || file.name);
        urls.push(res.url);
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      name: form.name,
      sku: form.sku,
      description: form.description,
      material: form.material,
      brand: form.brand,
      sizes: form.sizesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      colors: form.colorsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      packagingQuantity: form.packagingQuantity,
      unitPrice: form.unitPrice !== '' ? Number(form.unitPrice) : null,
      wholesalePrice:
        form.wholesalePrice !== '' ? Number(form.wholesalePrice) : null,
      moq: Number(form.moq || 1),
      stockQuantity: Number(form.stockQuantity || 0),
      lowStockThreshold: Number(form.lowStockThreshold || 10),
      availabilityStatus: form.availabilityStatus,
      images: form.images,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      isSample: form.isSample,
    };

    try {
      if (form.id) {
        await apiFetch(`/api/admin/products/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      await loadData();
      await refreshBootstrap();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    try {
      await apiFetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
      await loadData();
      await refreshBootstrap();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = products.filter(
    (p) =>
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Product Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by product name or SKU..."
            className="w-full sm:max-w-xs px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md"
          />
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] text-xs uppercase tracking-wider text-[#202020]/65">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#202020]/60">
                      Loading products...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#202020]/60">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F5F5F5]/60">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded overflow-hidden bg-[#F5F5F5] shrink-0">
                            <SmartImage src={p.images?.[0]} alt={p.name} />
                          </div>
                          <div>
                            <p className="font-semibold text-[#202020]">
                              {p.name}
                            </p>
                            <p className="text-xs text-[#202020]/55">
                              {p.isFeatured ? 'Featured · ' : ''}
                              {p.isActive ? 'Visible' : 'Hidden'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{p.sku}</td>
                      <td className="py-3 px-4 text-xs">{p.categoryName}</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {p.unitPrice !== null
                          ? formatRwf(p.unitPrice)
                          : 'On Request'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {p.stockQuantity}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {AVAILABILITY_LABELS[p.availabilityStatus] ||
                          p.availabilityStatus}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${p.name}`}
                            className="p-1.5 text-[#202020]/70 hover:text-[#202020]"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            aria-label={`Delete ${p.name}`}
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

      {/* Product Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202020]/10">
              <h2 className="text-lg font-bold text-[#202020]">
                {form.id ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Product Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    SKU *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Material
                  </label>
                  <input
                    type="text"
                    value={form.material}
                    onChange={(e) =>
                      setForm({ ...form, material: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Packaging Quantity
                  </label>
                  <input
                    type="text"
                    value={form.packagingQuantity}
                    onChange={(e) =>
                      setForm({ ...form, packagingQuantity: e.target.value })
                    }
                    placeholder="e.g. 50 pcs / pack"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Available Sizes (comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.sizesText}
                    onChange={(e) =>
                      setForm({ ...form, sizesText: e.target.value })
                    }
                    placeholder="8 oz, 12 oz, 16 oz"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Available Colors (comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.colorsText}
                    onChange={(e) =>
                      setForm({ ...form, colorsText: e.target.value })
                    }
                    placeholder="Natural Kraft, Matte White"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Unit Price (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.unitPrice}
                    onChange={(e) =>
                      setForm({ ...form, unitPrice: e.target.value })
                    }
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Wholesale (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.wholesalePrice}
                    onChange={(e) =>
                      setForm({ ...form, wholesalePrice: e.target.value })
                    }
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    MOQ
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.moq}
                    onChange={(e) => setForm({ ...form, moq: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stockQuantity}
                    onChange={(e) =>
                      setForm({ ...form, stockQuantity: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Status
                  </label>
                  <select
                    value={form.availabilityStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        availabilityStatus: e.target.value as AvailabilityStatus,
                      })
                    }
                    className="w-full px-2.5 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="made_to_order">Made to Order</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="sample_listing">Sample Listing</option>
                  </select>
                </div>
              </div>

              {/* Multi-image Upload */}
              <div>
                <label className="block text-xs font-semibold mb-2">
                  Product Images (Upload from Desktop or Mobile)
                </label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {form.images.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-md overflow-hidden border border-[#202020]/15 bg-[#F5F5F5]"
                    >
                      <SmartImage src={url} alt={`Product ${idx + 1}`} />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            images: form.images.filter((_, i) => i !== idx),
                          })
                        }
                        className="absolute top-1 right-1 p-0.5 bg-[#202020] text-[#FFFFFF] rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[#202020]/20 rounded-md cursor-pointer hover:bg-[#F5F5F5]">
                  <Upload className="w-4 h-4 text-[#B58B61]" />
                  <span>
                    {uploading ? 'Uploading...' : 'Upload Images from Device'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    onChange={handleUploadImages}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                  />
                  Active on Storefront
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) =>
                      setForm({ ...form, isFeatured: e.target.checked })
                    }
                  />
                  Featured on Homepage
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isSample}
                    onChange={(e) =>
                      setForm({ ...form, isSample: e.target.checked })
                    }
                  />
                  Mark as Sample Listing
                </label>
              </div>

              <div className="pt-4 border-t border-[#202020]/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium border border-[#202020]/20 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-6 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
