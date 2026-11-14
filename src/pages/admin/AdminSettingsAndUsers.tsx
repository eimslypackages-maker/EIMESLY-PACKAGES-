import React, { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { useApp, useDocumentMeta } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import { formatDateTime, ROLE_LABELS } from '../../lib/format';
import { uploadImageFile } from '../../lib/upload';
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

  useDocumentMeta('User & Role Management | Eimesly Packages Admin');

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

  const updateRole = async (id: number, role: UserRole, isActive: boolean) => {
    setSavingId(id);
    try {
      await apiFetch(`/api/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role, isActive }),
      });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout title="User & Role Management">
      <div className="bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#202020]/10 bg-[#F5F5F5] text-xs uppercase tracking-wider text-[#202020]/65">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]/10">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#202020]/60">
                    Loading users...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4 font-medium">
                      {u.fullName || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        disabled={savingId === u.id || u.id === currentUser?.id}
                        onChange={(e) =>
                          updateRole(u.id, e.target.value as UserRole, u.isActive)
                        }
                        className="px-2.5 py-1.5 text-xs border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
                      >
                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        disabled={savingId === u.id || u.id === currentUser?.id}
                        onClick={() => updateRole(u.id, u.role, !u.isActive)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                          u.isActive
                            ? 'border-[#202020]/20 text-[#202020]'
                            : 'border-red-300 text-red-700 bg-red-50'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
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

export function AdminSettings() {
  const { refreshBootstrap } = useApp();
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
      const res = await uploadImageFile(file, 'Company Logo');
      setSettings({ ...settings, logoUrl: res.url });
    } finally {
      setUploadingLogo(false);
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

          {/* Brand & Logo */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              Company Identity
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

            <div className="flex items-center gap-4">
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
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={settings.whatsappNumber}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappNumber: e.target.value })
                  }
                  placeholder="2507..."
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

          {/* Delivery & Payments */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              Delivery & Payment Configuration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Standard Delivery Fee (RWF)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.deliveryFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      deliveryFee: Number(e.target.value || 0),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Free Delivery Threshold (RWF, 0 = disabled)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.freeDeliveryThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      freeDeliveryThreshold: Number(e.target.value || 0),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.enableMobileMoney}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enableMobileMoney: e.target.checked,
                    })
                  }
                />
                Enable Mobile Money Option
              </label>
              {settings.enableMobileMoney && (
                <input
                  type="text"
                  value={settings.mobileMoneyInstructions}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      mobileMoneyInstructions: e.target.value,
                    })
                  }
                  placeholder="Verified MoMo pay code / instructions..."
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              )}

              <label className="inline-flex items-center gap-2 text-sm block">
                <input
                  type="checkbox"
                  checked={settings.enableBankTransfer}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enableBankTransfer: e.target.checked,
                    })
                  }
                />
                Enable Bank Transfer Option
              </label>
              {settings.enableBankTransfer && (
                <input
                  type="text"
                  value={settings.bankTransferInstructions}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bankTransferInstructions: e.target.value,
                    })
                  }
                  placeholder="Bank name, account title, and reference instructions..."
                  className="w-full px-3 py-2 text-sm border border-[#202020]/20 rounded-md"
                />
              )}

              <label className="inline-flex items-center gap-2 text-sm block">
                <input
                  type="checkbox"
                  checked={settings.enableCashOnDelivery}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enableCashOnDelivery: e.target.checked,
                    })
                  }
                />
                Enable Cash on Delivery
              </label>
            </div>
          </div>

          {/* Analytics & Maintenance */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#202020] border-b border-[#202020]/10 pb-2">
              Analytics & Maintenance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            disabled={saving || uploadingLogo}
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
