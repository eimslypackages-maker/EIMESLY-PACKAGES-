import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Edit2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp, useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import { uploadImageFile } from '../../lib/upload';
import { SmartImage } from '../../components/SmartImage';
import { AdminLayout } from './AdminLayout';
import type { Category } from '../../shared/types';

export function AdminCategories() {
  const { refreshBootstrap } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useDocumentMeta('Category Management | Eimesly Packages Admin');

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Category[]>('/api/admin/categories');
      setCategories(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setName('');
    setSlug('');
    setDescription('');
    setImageUrl('');
    setIsActive(true);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description);
    setImageUrl(cat.imageUrl);
    setIsActive(cat.isActive);
    setError('');
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadImageFile(file, name || file.name);
      setImageUrl(uploaded.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name,
        slug: slug || undefined,
        description,
        imageUrl,
        isActive,
        sortOrder: editId ? undefined : categories.length + 1,
      };
      if (editId) {
        await apiFetch(`/api/admin/categories/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      await loadCategories();
      await refreshBootstrap();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const moveOrder = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const copy = [...categories];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    setCategories(copy);
    await apiFetch('/api/admin/categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds: copy.map((c) => c.id) }),
    });
    await refreshBootstrap();
  };

  const handleDelete = async (cat: Category) => {
    await apiFetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
    await loadCategories();
    await refreshBootstrap();
  };

  return (
    <AdminLayout title="Category Management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-[#202020]/70">
            Reorder, activate, or manage packaging product categories.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>

        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] text-xs uppercase tracking-wider text-[#202020]/65">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#202020]/60">
                      Loading categories...
                    </td>
                  </tr>
                ) : (
                  categories.map((cat, idx) => (
                    <tr key={cat.id} className="hover:bg-[#F5F5F5]/60">
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveOrder(idx, -1)}
                            className="p-1 border border-[#202020]/15 rounded disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === categories.length - 1}
                            onClick={() => moveOrder(idx, 1)}
                            className="p-1 border border-[#202020]/15 rounded disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-9 rounded overflow-hidden bg-[#F5F5F5] shrink-0">
                            <SmartImage src={cat.imageUrl} alt={cat.name} />
                          </div>
                          <div>
                            <p className="font-semibold text-[#202020]">
                              {cat.name}
                            </p>
                            <p className="text-xs text-[#202020]/60 line-clamp-1">
                              {cat.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{cat.slug}</td>
                      <td className="py-3 px-4 text-xs">
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(cat)}
                            className="p-1.5 text-[#202020]/70 hover:text-[#202020]"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202020]/10">
              <h2 className="text-lg font-bold text-[#202020]">
                {editId ? 'Edit Category' : 'Create Category'}
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
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Category Name *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  URL Slug (optional)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated if blank"
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2">
                  Category Image
                </label>
                <div className="flex items-center gap-4">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={name}
                      className="w-16 h-12 object-cover rounded border"
                    />
                  )}
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border border-[#202020]/20 rounded-md cursor-pointer hover:bg-[#F5F5F5]">
                    <Upload className="w-4 h-4 text-[#B58B61]" />
                    <span>{uploading ? 'Uploading...' : 'Upload from Device'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Category Active on Storefront
              </label>
              <div className="pt-3 border-t border-[#202020]/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm border border-[#202020]/20 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
