import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useApp, useDocumentMeta } from '../../context/AppContext';
import { apiFetch, setLocalSessionToken } from '../../lib/api';
import type { UserProfile } from '../../shared/types';

const STAFF_ROLES = [
  'super_admin',
  'business_manager',
  'sales_staff',
  'inventory_manager',
];

export function AdminLoginPage() {
  const {
    user,
    authReady,
    navigate,
    signInWithGoogle,
    loginWithEmail,
    refreshUser,
    logout,
  } = useApp();

  useDocumentMeta('Administrator Sign In | Eimesly Packages');

  const [hasSuperAdmin, setHasSuperAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ hasSuperAdmin: boolean }>('/api/auth/setup-status')
      .then((res) => setHasSuperAdmin(res.hasSuperAdmin))
      .catch(() => setHasSuperAdmin(true));
  }, []);

  useEffect(() => {
    if (authReady && user && STAFF_ROLES.includes(user.role)) {
      navigate('/admin');
    }
  }, [authReady, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (hasSuperAdmin === false) {
        const res = await apiFetch<{ token: string; user: UserProfile }>(
          '/api/auth/bootstrap-super-admin',
          {
            method: 'POST',
            body: JSON.stringify({ email, password, fullName }),
          }
        );
        setLocalSessionToken(res.token);
        await refreshUser();
        navigate('/admin');
      } else {
        const u = await loginWithEmail(email, password);
        if (!STAFF_ROLES.includes(u.role)) {
          setError(
            'This account does not have administrative permissions. Contact your Super Admin.'
          );
          return;
        }
        navigate('/admin');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const u = await signInWithGoogle();
      if (!u) return;
      if (hasSuperAdmin === false && u.role === 'customer') {
        await apiFetch('/api/auth/claim-initial-admin', { method: 'POST' });
        await refreshUser();
        navigate('/admin');
        return;
      }
      if (!STAFF_ROLES.includes(u.role)) {
        setError(
          'Your Google account is currently a Customer account without admin access.'
        );
        return;
      }
      navigate('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimIfSignedIn = async () => {
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/claim-initial-admin', { method: 'POST' });
      await refreshUser();
      navigate('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to claim admin role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#202020] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="space-y-2">
          <div className="w-10 h-10 rounded-lg bg-[#F3EEE6] text-[#B58B61] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
            Eimesly Packages Administration
          </p>
          <h1 className="text-2xl font-bold text-[#202020]">
            {hasSuperAdmin === false
              ? 'Initial Super Admin Setup'
              : 'Admin Console Sign In'}
          </h1>
          <p className="text-sm text-[#202020]/70">
            {hasSuperAdmin === false
              ? 'No Super Admin account has been configured yet. Create the initial Super Admin account to manage the storefront.'
              : 'Restricted to authorized Eimesly Packages administrators and staff.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md">
            {error}
          </div>
        )}

        {user && !STAFF_ROLES.includes(user.role) && (
          <div className="p-4 bg-[#F3EEE6] border border-[#B58B61]/30 rounded-md space-y-2 text-sm">
            <p className="text-[#202020]">
              Signed in as <strong>{user.email}</strong> (Role: {user.role}).
            </p>
            {hasSuperAdmin === false ? (
              <button
                type="button"
                onClick={handleClaimIfSignedIn}
                disabled={loading}
                className="w-full py-2 px-3 bg-[#202020] text-[#FFFFFF] font-semibold rounded-md text-xs"
              >
                Activate Initial Super Admin for {user.email}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => logout()}
                className="text-xs font-semibold underline text-[#202020]"
              >
                Sign out and switch account
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasSuperAdmin === false && (
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
          )}

          <div>
            <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
              Administrator Email *
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
              Password *
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] disabled:opacity-50"
          >
            {loading
              ? 'Authenticating...'
              : hasSuperAdmin === false
                ? 'Create Super Admin Account'
                : 'Sign In to Admin Console'}
          </button>
        </form>

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
          className="w-full py-2.5 px-4 text-sm font-medium border border-[#202020]/20 rounded-md hover:bg-[#F5F5F5]"
        >
          {hasSuperAdmin === false
            ? 'Continue with Google (Claim Initial Super Admin)'
            : 'Sign In with Google'}
        </button>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-[#202020]/65 hover:text-[#202020]"
          >
            Return to Public Storefront
          </button>
        </div>
      </div>
    </div>
  );
}
