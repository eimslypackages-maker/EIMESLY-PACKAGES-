import React, { useEffect, useState } from 'react';
import { Plus, Upload, X } from 'lucide-react';
import { useApp, useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import { formatDateTime, ROLE_LABELS } from '../../lib/format';
import { uploadImageFile } from '../../lib/upload';
import { sanitizeWhatsAppPhone } from '../../lib/whatsapp';
import { AdminLayout } from './AdminLayout';
import type {
  AuditLog,
  UserProfile,
  UserRole,
  WebsiteSettings,
} from '../../shared/types';

export function AdminUsers() {
  const { user: currentUser } = useApp();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('sales_staff');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [myNewPassword, setMyNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  useDocumentMeta('Staff & User Management | Eimesly Packages Admin');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<UserProfile[]>('/api/admin/users');
      setUsers(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRole = async (id: number, nextRole: UserRole, isActive: boolean) => {
    setSavingId(id);
    setError('');
    try {
      await apiFetch(`/api/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: nextRole, isActive }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update role');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, phone, password, role }),
      });
      setCreateOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRole('sales_staff');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleSetMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    setError('');
    setSavingPw(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword: myNewPassword }),
      });
      setMyNewPassword('');
      setPwMsg(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save password');
    } finally {
      setSavingPw(false);
    }
  };

  const assignableRoles = Object.entries(ROLE_LABELS).filter(
    ([k]) => currentUser?.role === 'super_admin' || k !== 'super_admin'
  );

  return (
    <AdminLayout title="Staff & User Management">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#202020]/70">
            Create staff accounts, assign operational roles, and manage access status.
          </p>
          <button
            type="button"
            onClick={() => {
              setError('');
              setCreateOpen(true);
            }}
            className="px-4 py-2 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Staff Account
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md">
            {error}
          </div>
        )}

        <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] text-xs uppercase tracking-wider text-[#202020]/65">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#202020]/60">
                      Loading users...
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const lockedSuperAdmin =
                      u.role === 'super_admin' &&
                      currentUser?.role !== 'super_admin';
                    return (
                      <tr key={u.id}>
                        <td className="py-3 px-4 font-medium">
                          {u.fullName || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs">{u.email}</td>
                        <td className="py-3 px-4 text-xs">{u.phone || '—'}</td>
                        <td className="py-3 px-4">
                          <select
                            value={u.role}
                            disabled={
                              savingId === u.id ||
                              u.id === currentUser?.id ||
                              lockedSuperAdmin
                            }
                            onChange={(e) =>
                              updateRole(
                                u.id,
                                e.target.value as UserRole,
                                u.isActive
                              )
                            }
                            className="px-2.5 py-1.5 text-xs border border-[#202020]/20 rounded-md bg-[#FFFFFF] disabled:opacity-50"
                          >
                            {Object.entries(ROLE_LABELS).map(([k, v]) => (
                              <option
                                key={k}
                                value={k}
                                disabled={
                                  k === 'super_admin' &&
                                  currentUser?.role !== 'super_admin'
                                }
                              >
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            disabled={
                              savingId === u.id ||
                              u.id === currentUser?.id ||
                              lockedSuperAdmin
                            }
                            onClick={() => updateRole(u.id, u.role, !u.isActive)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md border disabled:opacity-50 ${
                              u.isActive
                                ? 'border-[#202020]/20 text-[#202020]'
                                : 'border-red-300 text-red-700 bg-red-50'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form
          onSubmit={handleSetMyPassword}
          className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-5 space-y-3 max-w-xl"
        >
          <div>
            <h2 className="text-sm font-bold text-[#202020]">
              Set or Update My Admin Password ({currentUser?.email})
            </h2>
            <p className="text-xs text-[#202020]/65 mt-0.5">
              Set a backup password (8+ characters) so you can sign in with email and password in addition to Google Sign-In.
            </p>
          </div>
          {pwMsg && (
            <div className="p-2.5 bg-[#F3EEE6] text-xs text-[#202020] rounded">
              {pwMsg}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <input
              required
              minLength={8}
              type="password"
              value={myNewPassword}
              onChange={(e) => setMyNewPassword(e.target.value)}
              placeholder="New password (8+ characters)"
              className="flex-1 min-w-[220px] px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
            />
            <button
              type="submit"
              disabled={savingPw}
              className="px-4 py-2 text-xs font-semibold bg-[#202020] text-[#FFFFFF] rounded-md whitespace-nowrap"
            >
              {savingPw ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#202020]/10">
              <h2 className="text-base font-bold text-[#202020]">
                Create Staff Account
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Work Email *
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Assigned Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                >
                  {assignableRoles.map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Initial Password (8+ characters) *
                </label>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export function AdminSettings() {
  const { refreshBootstrap } = useApp();
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [msg, setMsg] = useState('');

  useDocumentMeta('System Settings | Eimesly Packages Admin');

  useEffect(() => {
    apiFetch<WebsiteSettings>('/api/admin/settings')
      .then(setSettings)
      .catch(console.error);
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setUploadingLogo(true);
    try {
      const res = await uploadImageFile(file, 'Company Logo', 'banners');
      setSettings({ ...settings, logoUrl: res.url });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setUploadingFavicon(true);
    try {
      const res = await uploadImageFile(file, 'Site Favicon', 'banners');
      setSettings({ ...settings, faviconUrl: res.url });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMsg('');
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      await refreshBootstrap();
      setMsg('System settings saved.');
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="System Settings">
      {!settings ? (
        <div className="h-48 bg-[#FFFFFF] rounded-lg animate-pulse" />
      ) : (
        <form
          onSubmit={handleSave}
          className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg p-6 space-y-6 max-w-4xl"
        >
          {msg && (
            <div className="p-3 bg-[#F3EEE6] text-sm text-[#202020] rounded-md">
              {msg}
            </div>
          )}

          {/* Brand, Logo & Favicon */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              Company Identity, Logo & Favicon
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) =>
                    setSettings({ ...settings, companyName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Parent Company
                </label>
                <input
                  type="text"
                  value={settings.parentCompany}
                  onChange={(e) =>
                    setSettings({ ...settings, parentCompany: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) =>
                    setSettings({ ...settings, currency: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                {settings.logoUrl && (
                  <img
                    src={settings.logoUrl}
                    alt="Company logo"
                    className="h-12 w-auto border rounded p-1 bg-[#F5F5F5]"
                  />
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[#202020]/20 rounded-md cursor-pointer hover:bg-[#F5F5F5]">
                  <Upload className="w-4 h-4 text-[#B58B61]" />
                  <span>
                    {uploadingLogo ? 'Uploading...' : 'Upload Company Logo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingLogo}
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                {settings.faviconUrl && (
                  <img
                    src={settings.faviconUrl}
                    alt="Favicon"
                    className="h-9 w-9 object-contain border rounded p-1 bg-[#F5F5F5]"
                  />
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[#202020]/20 rounded-md cursor-pointer hover:bg-[#F5F5F5]">
                  <Upload className="w-4 h-4 text-[#B58B61]" />
                  <span>
                    {uploadingFavicon ? 'Uploading...' : 'Upload Browser Favicon'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingFavicon}
                    onChange={handleFaviconUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Contact, Social & Location */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              Contact, Location & Social Links
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                  placeholder="+250 ..."
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) =>
                    setSettings({ ...settings, email: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  City & Country
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={settings.city || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, city: e.target.value })
                    }
                    placeholder="Kigali"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                  <input
                    type="text"
                    value={settings.country || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, country: e.target.value })
                    }
                    placeholder="Rwanda"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Business Address
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Map Latitude (Optional)
                </label>
                <input
                  type="text"
                  value={settings.mapLat}
                  onChange={(e) =>
                    setSettings({ ...settings, mapLat: e.target.value })
                  }
                  placeholder="-1.9441"
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Map Longitude (Optional)
                </label>
                <input
                  type="text"
                  value={settings.mapLng}
                  onChange={(e) =>
                    setSettings({ ...settings, mapLng: e.target.value })
                  }
                  placeholder="30.0619"
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={settings.instagramUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, instagramUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Facebook URL
                </label>
                <input
                  type="url"
                  value={settings.facebookUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, facebookUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Ordering Configuration */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              WhatsApp Direct Ordering Configuration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Default Country Code
                </label>
                <input
                  type="text"
                  value={settings.whatsappCountryCode || '250'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsappCountryCode: e.target.value.replace(/[^0-9]/g, ''),
                    })
                  }
                  placeholder="250"
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">
                  Official WhatsApp Business Number
                </label>
                <input
                  type="text"
                  value={settings.whatsappNumber}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappNumber: e.target.value })
                  }
                  placeholder="e.g. 250788000000 or 0788000000"
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md font-mono"
                />
              </div>
            </div>

            {(() => {
              const sanitized = sanitizeWhatsAppPhone(
                settings.whatsappCountryCode,
                settings.whatsappNumber
              );
              return (
                <div className="p-3 bg-[#F3EEE6] border border-[#202020]/10 rounded-md text-xs text-[#202020] flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Active WhatsApp Redirect Target:{' '}
                    {sanitized ? (
                      <strong className="font-mono">https://wa.me/{sanitized}</strong>
                    ) : (
                      <strong className="text-red-700">
                        Not configured — storefront Order Message Ready popups will warn users and disable Send Order until configured
                      </strong>
                    )}
                  </span>
                </div>
              );
            })()}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Product Order Closing Note / Template
                </label>
                <textarea
                  rows={2}
                  value={settings.whatsappDefaultOrderMessage || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsappDefaultOrderMessage: e.target.value,
                    })
                  }
                  placeholder="Please confirm availability and provide payment and delivery information."
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
                <p className="mt-1 text-[11px] text-[#202020]/60">
                  Used as the closing line in Order Now messages, or supply full custom placeholders: {'{product}'}, {'{sku}'}, {'{size}'}, {'{variation}'}, {'{quantity}'}, {'{price}'}, {'{total}'}.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Wholesale Quote Closing Note / Template
                </label>
                <textarea
                  rows={2}
                  value={settings.whatsappWholesaleMessage || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsappWholesaleMessage: e.target.value,
                    })
                  }
                  placeholder="Please send me your wholesale prices and quotation."
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
                <p className="mt-1 text-[11px] text-[#202020]/60">
                  Optional placeholders for custom wholesale templates: {'{product}'}, {'{quantity}'}, {'{business}'}, {'{location}'}.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  General WhatsApp Contact Message
                </label>
                <textarea
                  rows={2}
                  value={settings.whatsappGeneralMessage || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsappGeneralMessage: e.target.value,
                    })
                  }
                  placeholder="Hello Eimesly Packages! I would like to enquire about your packaging products and availability."
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>

              <p className="text-xs text-[#202020]/60 pt-1">
                Private wholesale prices are kept internal to Admin Management and are never displayed publicly on the storefront.
              </p>
            </div>
          </div>

          {/* Collection Point & Order Records */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              Kigali Collection Point & Internal Order Records
            </h2>
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(settings.collectionPointEnabled)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      collectionPointEnabled: e.target.checked,
                    })
                  }
                />
                Enable Customer Order Collection Point in Kigali
              </label>
              {settings.collectionPointEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={settings.collectionAddress || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        collectionAddress: e.target.value,
                      })
                    }
                    placeholder="Collection warehouse / shop address"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                  <input
                    type="text"
                    value={settings.collectionHours || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        collectionHours: e.target.value,
                      })
                    }
                    placeholder="Collection hours (e.g. Mon-Sat 08:00-18:00)"
                    className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Delivery & Dispatch Notes (Shown on Product & Wholesale Info)
                </label>
                <input
                  type="text"
                  value={settings.deliveryNotes || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, deliveryNotes: e.target.value })
                  }
                  placeholder="Same-day dispatch across Kigali for confirmed orders..."
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Manual Order Reference Prefix
                </label>
                <input
                  type="text"
                  value={settings.orderNumberPrefix || 'EP'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      orderNumberPrefix: e.target.value.toUpperCase().slice(0, 6),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Quotation & Enquiry Alert Email
                </label>
                <input
                  type="email"
                  value={settings.notificationEmail || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notificationEmail: e.target.value,
                    })
                  }
                  placeholder="orders@eimeslypackages.com"
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.notifyOnNewQuotation !== false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    notifyOnNewQuotation: e.target.checked,
                  })
                }
              />
              Notify Staff on New Formal Quotation Requests
            </label>
          </div>

          {/* Analytics & Maintenance */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              Analytics & Maintenance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Google Analytics Measurement ID
                </label>
                <input
                  type="text"
                  value={settings.googleAnalyticsId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      googleAnalyticsId: e.target.value,
                    })
                  }
                  placeholder="G-XXXXXXXXXX"
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Google Search Console Verification
                </label>
                <input
                  type="text"
                  value={settings.googleSearchConsoleTag || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      googleSearchConsoleTag: e.target.value,
                    })
                  }
                  placeholder="Verification token"
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Facebook Pixel ID
                </label>
                <input
                  type="text"
                  value={settings.facebookPixelId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      facebookPixelId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md font-mono"
                />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-amber-800 font-medium">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenanceMode: e.target.checked,
                  })
                }
              />
              Enable Storefront Maintenance Mode (Admin console stays online)
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || uploadingLogo || uploadingFavicon}
            className="px-6 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
          >
            {saving ? 'Saving Settings...' : 'Save System Settings'}
          </button>
        </form>
      )}
    </AdminLayout>
  );
}

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentMeta('Audit Logs | Eimesly Packages Admin');

  useEffect(() => {
    apiFetch<AuditLog[]>('/api/admin/audit-logs')
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Administrative Audit Logs">
      <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] uppercase tracking-wider text-[#202020]/65">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#202020]/60">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#202020]/60">
                    No administrative actions logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 px-4 text-[#202020]/65 whitespace-nowrap">
                      {formatDateTime(l.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 font-medium">{l.actorEmail}</td>
                    <td className="py-2.5 px-4">{l.actorRole}</td>
                    <td className="py-2.5 px-4 font-mono">{l.action}</td>
                    <td className="py-2.5 px-4">
                      {l.entityType} {l.entityId ? `#${l.entityId}` : ''}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#202020]/70 max-w-xs truncate">
                      {JSON.stringify(l.details)}
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
