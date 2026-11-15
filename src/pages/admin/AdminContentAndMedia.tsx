import React, { useEffect, useState } from 'react';
import { Copy, Edit2, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { useApp, useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import { fileToCompressedBase64, uploadImageFile } from '../../lib/upload';
import { SmartImage } from '../../components/SmartImage';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { AdminLayout } from './AdminLayout';
import type { WebsiteContent } from '../../shared/types';

export function AdminContent() {
  const { refreshBootstrap } = useApp();
  const [content, setContent] = useState<WebsiteContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useDocumentMeta('Website Content Management | Eimesly Packages Admin');

  useEffect(() => {
    apiFetch<WebsiteContent>('/api/admin/content')
      .then(setContent)
      .catch(console.error);
  }, []);

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !content) return;
    setUploading(true);
    try {
      const res = await uploadImageFile(file, 'Homepage Hero Banner');
      setContent({ ...content, heroImageUrl: res.url });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/api/admin/content', {
        method: 'PUT',
        body: JSON.stringify(content),
      });
      await refreshBootstrap();
      setMessage('Website content and SEO metadata updated.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Website Content & Customization">
      {!content ? (
        <div className="h-48 bg-[#FFFFFF] rounded-lg animate-pulse" />
      ) : (
        <form
          onSubmit={handleSave}
          className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-6 space-y-6 max-w-4xl"
        >
          {message && (
            <div className="p-3 bg-[#F3EEE6] text-sm text-[#202020] rounded-md">
              {message}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              Homepage Hero & Banners
            </h2>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Hero Headline
              </label>
              <input
                type="text"
                value={content.heroHeadline}
                onChange={(e) =>
                  setContent({ ...content, heroHeadline: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm border border-[#202020]/20 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Hero Supporting Text
              </label>
              <textarea
                rows={2}
                value={content.heroSubtext}
                onChange={(e) =>
                  setContent({ ...content, heroSubtext: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm border border-[#202020]/20 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2">
                Hero Banner Image
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-36 h-24 rounded overflow-hidden border bg-[#F5F5F5]">
                  <SmartImage src={content.heroImageUrl} alt="Hero banner" />
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[#202020]/20 rounded-md cursor-pointer hover:bg-[#F5F5F5]">
                  <Upload className="w-4 h-4 text-[#B58B61]" />
                  <span>
                    {uploading ? 'Uploading...' : 'Upload New Hero Image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={handleHeroUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Wholesale Section Headline
                </label>
                <input
                  type="text"
                  value={content.wholesaleHeadline}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      wholesaleHeadline: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Promotional Banner Headline
                </label>
                <input
                  type="text"
                  value={content.promoBannerHeadline}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      promoBannerHeadline: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              About Us & Footer Copy
            </h2>
            <div>
              <label className="block text-xs font-semibold mb-1">
                About Us Description
              </label>
              <textarea
                rows={4}
                value={content.aboutDescription}
                onChange={(e) =>
                  setContent({ ...content, aboutDescription: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm border border-[#202020]/20 rounded-md"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Mission
                </label>
                <textarea
                  rows={3}
                  value={content.aboutMission}
                  onChange={(e) =>
                    setContent({ ...content, aboutMission: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Vision
                </label>
                <textarea
                  rows={3}
                  value={content.aboutVision}
                  onChange={(e) =>
                    setContent({ ...content, aboutVision: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Footer Description
              </label>
              <textarea
                rows={2}
                value={content.footerDescription}
                onChange={(e) =>
                  setContent({ ...content, footerDescription: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm border border-[#202020]/20 rounded-md"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              Search Engine Optimization (SEO)
            </h2>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Homepage SEO Title
              </label>
              <input
                type="text"
                value={content.seoTitle}
                onChange={(e) =>
                  setContent({ ...content, seoTitle: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm border border-[#202020]/20 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Homepage Meta Description
              </label>
              <textarea
                rows={2}
                value={content.seoDescription}
                onChange={(e) =>
                  setContent({ ...content, seoDescription: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm border border-[#202020]/20 rounded-md"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || uploading}
            className="px-6 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
          >
            {saving ? 'Saving Content...' : 'Save Website Content'}
          </button>
        </form>
      )}
    </AdminLayout>
  );
}

interface MediaRow {
  id: number;
  filename: string;
  mimeType: string;
  altText: string;
  folder?: string;
  url: string;
}

const MEDIA_FOLDERS = ['general', 'products', 'categories', 'banners', 'payments'];

export function AdminMedia() {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [folderFilter, setFolderFilter] = useState('all');
  const [uploadFolder, setUploadFolder] = useState('products');
  const [editing, setEditing] = useState<MediaRow | null>(null);
  const [editAltText, setEditAltText] = useState('');
  const [editFolder, setEditFolder] = useState('general');
  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useDocumentMeta('Media Library | Eimesly Packages Admin');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<MediaRow[]>('/api/admin/media');
      setItems(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        await uploadImageFile(f, f.name, uploadFolder);
      }
      await load();
    } finally {
      setUploading(false);
    }
  };

  const handleReplace = async (
    id: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { dataBase64, mimeType } = await fileToCompressedBase64(file);
      await apiFetch(`/api/admin/media/${id}/replace`, {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          mimeType,
          dataBase64,
        }),
      });
      await load();
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    await apiFetch(`/api/admin/media/${editing.id}`, {
      method: 'PUT',
      body: JSON.stringify({ altText: editAltText, folder: editFolder }),
    });
    setEditing(null);
    await load();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiFetch(`/api/admin/media/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setItems((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete media asset'
      );
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter(
    (m) => folderFilter === 'all' || (m.folder || 'general') === folderFilter
  );

  return (
    <AdminLayout title="Media Management">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {['all', ...MEDIA_FOLDERS].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFolderFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize ${
                  folderFilter === f
                    ? 'bg-[#202020] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] border border-[#202020]/15 text-[#202020]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
              className="px-3 py-2 text-xs bg-[#FFFFFF] border border-[#202020]/20 rounded-md capitalize"
            >
              {MEDIA_FOLDERS.map((f) => (
                <option key={f} value={f}>
                  Folder: {f}
                </option>
              ))}
            </select>
            <label className="px-4 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md inline-flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Upload Images'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 bg-[#FFFFFF] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-12 text-center text-sm text-[#202020]/65">
            No media assets found in this folder. Upload product or banner images above.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-[#F5F5F5]">
                  <SmartImage src={m.url} alt={m.altText || m.filename} />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs font-medium truncate">{m.filename}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#B58B61]">
                    {m.folder || 'general'}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(m.url);
                        setCopiedId(m.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className="text-[11px] font-semibold text-[#B58B61] inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedId === m.id ? 'Copied' : 'URL'}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Edit alt text & folder"
                        onClick={() => {
                          setEditing(m);
                          setEditAltText(m.altText || '');
                          setEditFolder(m.folder || 'general');
                        }}
                        className="p-1 text-[#202020]/60 hover:text-[#202020]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <label
                        title="Replace image file"
                        className="p-1 text-[#202020]/60 hover:text-[#202020] cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleReplace(m.id, e)}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('');
                          setDeleteTarget(m);
                        }}
                        aria-label={`Delete ${m.filename}`}
                        title="Delete image permanently"
                        className="p-1 text-[#202020]/50 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#202020]/10">
              <h3 className="text-base font-bold text-[#202020]">
                Edit Media Details
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMeta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Alt Text (Accessibility & SEO)
                </label>
                <input
                  type="text"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Folder
                </label>
                <select
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF] capitalize"
                >
                  {MEDIA_FOLDERS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm border border-[#202020]/20 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete Media Image"
        itemLabel={
          deleteTarget
            ? `${deleteTarget.filename} (${deleteTarget.folder || 'general'})`
            : ''
        }
        description="Deleting this image permanently removes it from the media library. Any product, category, or page referencing its URL will no longer display it."
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
