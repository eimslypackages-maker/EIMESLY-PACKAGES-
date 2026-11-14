import React, { useEffect, useState } from 'react';
import { LogOut, Package, FileText, User } from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import {
  formatDate,
  formatRwf,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  QUOTATION_STATUS_LABELS,
} from '../lib/format';
import type { Order, Quotation } from '../shared/types';

export function CustomerAuthPage({
  mode,
}: {
  mode: 'login' | 'register' | 'reset';
}) {
  const {
    user,
    navigate,
    signInWithGoogle,
    loginWithEmail,
    registerWithEmail,
  } = useApp();

  useDocumentMeta(
    mode === 'login'
      ? 'Customer Sign In | Eimesly Packages'
      : mode === 'reset'
        ? 'Reset Password | Eimesly Packages'
        : 'Create Account | Eimesly Packages'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [forgotMode, setForgotMode] = useState(mode === 'reset');
  const [resetTokenMode, setResetTokenMode] = useState(mode === 'reset');
  const [resetToken, setResetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  });
  const [resetMsg, setResetMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'reset') {
      setForgotMode(true);
      setResetTokenMode(true);
    } else {
      setForgotMode(false);
      setResetTokenMode(false);
    }
  }, [mode]);

  useEffect(() => {
    if (user) {
      navigate('/account');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMsg('');
    setLoading(true);
    try {
      if (forgotMode && resetTokenMode) {
        const res = await apiFetch<{ message: string }>(
          '/api/auth/reset-password',
          {
            method: 'POST',
            body: JSON.stringify({ token: resetToken, newPassword: password }),
          }
        );
        setResetMsg(res.message);
        setPassword('');
        setResetToken('');
      } else if (forgotMode) {
        const res = await apiFetch<{ message: string }>(
          '/api/auth/forgot-password',
          {
            method: 'POST',
            body: JSON.stringify({ email }),
          }
        );
        setResetMsg(res.message);
      } else if (mode === 'login') {
        await loginWithEmail(email, password);
        navigate('/account');
      } else {
        await registerWithEmail({
          email,
          password,
          fullName,
          phone,
          businessName,
        });
        navigate('/account');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/account');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F5F5F5] min-h-[75vh] py-12 px-4">
      <div className="max-w-md mx-auto bg-[#FFFFFF] border border-[#202020]/10 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
            Customer Portal
          </p>
          <h1 className="mt-1.5 text-2xl font-bold text-[#202020]">
            {forgotMode
              ? resetTokenMode
                ? 'Set New Password'
                : 'Reset Password'
              : mode === 'login'
                ? 'Sign In to Your Account'
                : 'Create Customer Account'}
          </h1>
          <p className="mt-1 text-sm text-[#202020]/70">
            Track orders, manage delivery details, and review saved quotations. Guest checkout remains available anytime.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md">
            {error}
          </div>
        )}
        {resetMsg && (
          <div className="p-3 bg-[#F3EEE6] border border-[#B58B61]/40 text-[#202020] text-sm rounded-md">
            {resetMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && !forgotMode && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                    Phone Number *
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>
            </>
          )}

          {(!forgotMode || !resetTokenMode) && (
            <div>
              <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                Email Address *
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
              />
            </div>
          )}

          {forgotMode && resetTokenMode && (
            <div>
              <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                Reset Token *
              </label>
              <input
                required
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Paste your password reset token"
                className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md font-mono"
              />
            </div>
          )}

          {(!forgotMode || resetTokenMode) && (
            <div>
              <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                {resetTokenMode ? 'New Password *' : 'Password *'}
              </label>
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] disabled:opacity-50"
          >
            {loading
              ? 'Please wait...'
              : forgotMode
                ? resetTokenMode
                  ? 'Update Password'
                  : 'Request Password Reset'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
          </button>
        </form>

        {!forgotMode && (
          <>
            <div className="relative flex items-center justify-center">
              <span className="border-t border-[#202020]/10 w-full" />
              <span className="px-3 text-xs text-[#202020]/50 bg-[#FFFFFF] shrink-0">
                or
              </span>
              <span className="border-t border-[#202020]/10 w-full" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              className="w-full py-2.5 px-4 text-sm font-medium border border-[#202020]/20 rounded-md hover:bg-[#F5F5F5] transition-colors"
            >
              Continue with Google
            </button>
          </>
        )}

        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#202020]/75">
          {mode !== 'register' && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (mode === 'reset') {
                    navigate('/login');
                  } else {
                    setForgotMode(!forgotMode);
                    setResetTokenMode(false);
                  }
                }}
                className="hover:text-[#B58B61] underline"
              >
                {forgotMode ? 'Back to Sign In' : 'Forgot password?'}
              </button>
              {forgotMode && (
                <button
                  type="button"
                  onClick={() => setResetTokenMode(!resetTokenMode)}
                  className="hover:text-[#B58B61] underline"
                >
                  {resetTokenMode ? 'Request token instead' : 'Have a reset token?'}
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              navigate(mode === 'register' ? '/login' : '/register')
            }
            className="hover:text-[#B58B61] font-semibold"
          >
            {mode === 'register'
              ? 'Already have an account? Sign In'
              : 'New customer? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerDashboardPage({
  initialTab = 'overview',
}: {
  initialTab?: 'overview' | 'orders' | 'quotations' | 'profile';
}) {
  const { user, authReady, navigate, logout, refreshUser } = useApp();
  const [tab, setTab] = useState(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.deliveryAddress || ''
  );
  const [district, setDistrict] = useState(user?.district || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useDocumentMeta('Customer Dashboard | Eimesly Packages');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (authReady && !user) {
      navigate('/login');
    }
  }, [authReady, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || '');
    setPhone(user.phone || '');
    setBusinessName(user.businessName || '');
    setDeliveryAddress(user.deliveryAddress || '');
    setDistrict(user.district || '');

    setLoading(true);
    Promise.all([
      apiFetch<Order[]>('/api/auth/account/orders'),
      apiFetch<Quotation[]>('/api/auth/account/quotations'),
    ])
      .then(([ord, q]) => {
        setOrders(ord);
        setQuotations(q);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await apiFetch('/api/auth/account/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          phone,
          businessName,
          deliveryAddress,
          district,
        }),
      });
      await refreshUser();
      setSaveMsg('Profile and delivery information saved.');
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || !user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="h-48 bg-[#F5F5F5] rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] min-h-[75vh]">
      <div className="bg-[#F3EEE6] border-b border-[#202020]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
              Customer Account
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#202020]">
              Welcome, {user.fullName || user.email}
            </h1>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="px-4 py-2 text-sm font-medium border border-[#202020]/20 bg-[#FFFFFF] rounded-md inline-flex items-center gap-2 self-start sm:self-auto hover:bg-[#F5F5F5]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 pb-6 border-b border-[#202020]/10">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'orders', label: `Orders (${orders.length})`, icon: Package },
            {
              id: 'quotations',
              label: `Quotations (${quotations.length})`,
              icon: FileText,
            },
            { id: 'profile', label: 'Profile & Delivery', icon: User },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as typeof tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md inline-flex items-center gap-2 transition-colors ${
                  tab === t.id
                    ? 'bg-[#202020] text-[#FFFFFF]'
                    : 'bg-[#F5F5F5] text-[#202020]/80 hover:bg-[#F3EEE6]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          {tab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-5 border border-[#202020]/10 rounded-lg">
                  <p className="text-xs text-[#202020]/60">Total Orders</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {orders.length}
                  </p>
                </div>
                <div className="p-5 border border-[#202020]/10 rounded-lg">
                  <p className="text-xs text-[#202020]/60">
                    Quotation Requests
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {quotations.length}
                  </p>
                </div>
                <div className="p-5 border border-[#202020]/10 rounded-lg">
                  <p className="text-xs text-[#202020]/60">Default District</p>
                  <p className="mt-1 text-lg font-semibold">
                    {user.district || 'Not set'}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#202020] mb-4">
                  Recent Orders
                </h2>
                {orders.length === 0 ? (
                  <p className="text-sm text-[#202020]/65">
                    You have not placed any orders yet.
                  </p>
                ) : (
                  <div className="border border-[#202020]/10 rounded-lg divide-y divide-[#202020]/10">
                    {orders.slice(0, 3).map((o) => (
                      <div
                        key={o.id}
                        className="p-4 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-mono text-sm font-semibold">
                            {o.orderNumber}
                          </p>
                          <p className="text-xs text-[#202020]/60">
                            {formatDate(o.createdAt)} ·{' '}
                            {ORDER_STATUS_LABELS[o.orderStatus] || o.orderStatus}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/order-confirmation/${o.orderNumber}`)
                          }
                          className="px-3.5 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded-md hover:bg-[#F5F5F5]"
                        >
                          Track / View Order
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div className="space-y-4">
              {loading ? (
                <div className="h-32 bg-[#F5F5F5] rounded-lg animate-pulse" />
              ) : orders.length === 0 ? (
                <div className="p-10 bg-[#F5F5F5] rounded-lg text-center space-y-3">
                  <p className="text-sm text-[#202020]/70">
                    No order history found.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/shop')}
                    className="px-5 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                orders.map((o) => (
                  <div
                    key={o.id}
                    className="border border-[#202020]/10 rounded-lg p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-[#202020]">
                          {o.orderNumber}
                        </p>
                        <p className="text-xs text-[#202020]/60">
                          {formatDate(o.createdAt)} ·{' '}
                          {ORDER_STATUS_LABELS[o.orderStatus] || o.orderStatus} ·{' '}
                          Payment:{' '}
                          {PAYMENT_STATUS_LABELS[o.paymentStatus] ||
                            o.paymentStatus}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold tabular-nums">
                          {o.totalAmount > 0
                            ? formatRwf(o.totalAmount)
                            : 'Confirmed on Review'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/order-confirmation/${o.orderNumber}`)
                          }
                          className="px-3 py-1.5 text-xs font-semibold border border-[#202020]/20 rounded-md hover:bg-[#F5F5F5]"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'quotations' && (
            <div className="space-y-4">
              {quotations.length === 0 ? (
                <div className="p-10 bg-[#F5F5F5] rounded-lg text-center space-y-3">
                  <p className="text-sm text-[#202020]/70">
                    You have not submitted any quotation requests yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/request-quote')}
                    className="px-5 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                  >
                    Request a Quote
                  </button>
                </div>
              ) : (
                quotations.map((q) => (
                  <div
                    key={q.id}
                    className="border border-[#202020]/10 rounded-lg p-5 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-[#202020]">
                          {q.quoteNumber}
                        </p>
                        <p className="text-sm font-medium text-[#202020]">
                          {q.productInterested} (Qty: {q.estimatedQuantity})
                        </p>
                        <p className="text-xs text-[#202020]/60">
                          Submitted {formatDate(q.createdAt)} · Status:{' '}
                          {QUOTATION_STATUS_LABELS[q.status] || q.status}
                        </p>
                      </div>
                      {q.proposedTotal !== null && (
                        <div className="text-right">
                          <p className="text-xs text-[#202020]/60">
                            Proposed Total
                          </p>
                          <p className="text-sm font-bold tabular-nums">
                            {formatRwf(q.proposedTotal)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="max-w-xl border border-[#202020]/10 rounded-lg p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-[#202020]">
                Profile & Default Delivery Information
              </h2>
              {saveMsg && (
                <div className="p-3 bg-[#F3EEE6] text-sm text-[#202020] rounded-md">
                  {saveMsg}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                    District / City
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
