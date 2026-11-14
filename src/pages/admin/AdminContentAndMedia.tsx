import React, { useEffect, useState } from 'react';
import { Copy, Trash2, Upload } from 'lucide-react';
import { useApp, useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import { uploadImageFile } from '../../lib/upload';
import { SmartImage } from '../../components/SmartImage';
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
  url: string;
}

export function AdminMedia() {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

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
        await uploadImageFile(f);
      }
      await load();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <AdminLayout title="Media Management">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[#202020]/70">
            Upload and manage product photos, banners, and reference media.
          </p>
          <label className="px-4 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md inline-flex items-center gap-2 cursor-pointer">
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

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 bg-[#FFFFFF] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-12 text-center text-sm text-[#202020]/65">
            No uploaded media assets yet. Upload product or banner images above.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {items.map((m) => (
              <div
                key={m.id}
                className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-[#F5F5F5]">
                  <SmartImage src={m.url} alt={m.altText || m.filename} />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs font-medium truncate">{m.filename}</p>
                  <div className="flex items-center justify-between gap-2">
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
                      {copiedId === m.id ? 'Copied' : 'Copy URL'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="p-1 text-[#202020]/50 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
