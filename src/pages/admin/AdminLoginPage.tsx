import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useApp, useDocumentMeta } from '../../context/AppContext';
import { apiFetch, setLocalSessionToken } from '../../lib/api';
import type { UserProfile, UserRole } from '../../shared/types';

const STAFF_ROLES: UserRole[] = [
  'super_admin',
  'business_owner',
  'business_manager',
  'sales_staff',
  'inventory_manager',
];

export function AdminLoginPage() {
  const {
    user,
    authReady,
    bootstrap,
    navigate,
    signInWithGoogle,
    loginWithEmail,
    refreshUser,
    logout,
  } = useApp();

  useDocumentMeta('Admin Control | Eimesly Packages');

  const [hasSuperAdmin, setHasSuperAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [fullName, setFullName] = useState('');
  const [forgotMode, setForgotMode] = useState<'none' | 'request' | 'reset'>('none');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const logoUrl = bootstrap?.settings?.logoUrl;

  useEffect(() => {
    apiFetch<{ hasSuperAdmin: boolean }>('/api/auth/setup-status')
      .then((res) => setHasSuperAdmin(res.hasSuperAdmin))
      .catch(() => setHasSuperAdmin(true));
  }, []);

  useEffect(() => {
    if (authReady && user && STAFF_ROLES.includes(user.role)) {
      navigate('/admin/dashboard');
    }
  }, [authReady, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
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
        setLocalSessionToken(res.token, rememberSession);
        await refreshUser();
        navigate('/admin/dashboard');
      } else {
        const u = await loginWithEmail(email, password, rememberSession);
        if (!STAFF_ROLES.includes(u.role)) {
          setError(
            'This account does not have administrative permissions. Contact your Super Admin.'
          );
          return;
        }
        navigate('/admin/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      if (forgotMode === 'request') {
        const res = await apiFetch<{ message: string }>(
          '/api/auth/forgot-password',
          {
            method: 'POST',
            body: JSON.stringify({ email }),
          }
        );
        setInfoMessage(res.message);
      } else if (forgotMode === 'reset') {
        const res = await apiFetch<{ message: string }>(
          '/api/auth/reset-password',
          {
            method: 'POST',
            body: JSON.stringify({ token: resetToken, newPassword }),
          }
        );
        setInfoMessage(res.message);
        setForgotMode('none');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password recovery failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const u = await signInWithGoogle();
      if (!u) return;
      if (hasSuperAdmin === false && u.role === 'customer') {
        await apiFetch('/api/auth/claim-initial-admin', { method: 'POST' });
        await refreshUser();
        navigate('/admin/dashboard');
        return;
      }
      if (!STAFF_ROLES.includes(u.role)) {
        setError(
          'Your Google account does not have administrative access.'
        );
        return;
      }
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed';
      if (msg.includes('popup-blocked')) {
        setError(
          'Your browser blocked the Google sign-in popup. Allow popups for this site or open this page in a new tab and try again.'
        );
      } else if (msg.includes('unauthorized-domain')) {
        setError(
          'Google Sign-In popup is not authorized on this preview domain. Open the primary app URL or sign in using an administrator email and password.'
        );
      } else if (msg.includes('popup-closed-by-user')) {
        setError('Google Sign-In was cancelled before completing.');
      } else {
        setError(msg);
      }
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
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to claim admin role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#202020] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Eimesly Packages"
                className="h-10 w-auto object-contain rounded border border-[#202020]/10 p-1"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#F3EEE6] text-[#B58B61] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B58B61]">
                Eimesly Packages
              </p>
              <h1 className="text-2xl font-bold text-[#202020] leading-tight">
                {hasSuperAdmin === false
                  ? 'Initial Admin Control Setup'
                  : 'Admin Control'}
              </h1>
            </div>
          </div>
          <p className="text-sm text-[#202020]/70">
            {hasSuperAdmin === false
              ? 'No Super Admin account has been configured yet. Create the initial Super Admin account to unlock the management system.'
              : 'Secure staff and management portal for Eimesly Packages operations.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="p-3 bg-[#F3EEE6] border border-[#B58B61]/30 text-[#202020] text-sm rounded-md">
            {infoMessage}
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

        {forgotMode !== 'none' ? (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#202020]">
                {forgotMode === 'request'
                  ? 'Forgot Password Recovery'
                  : 'Complete Password Reset'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setForgotMode('none');
                  setError('');
                }}
                className="text-xs font-semibold text-[#B58B61] hover:underline"
              >
                Back to Sign In
              </button>
            </div>

            {forgotMode === 'request' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                    Administrator Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@eimeslypackages.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                >
                  {loading ? 'Submitting...' : 'Request Password Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotMode('reset')}
                  className="w-full text-xs text-[#202020]/65 hover:text-[#202020] underline"
                >
                  Already have a reset token? Enter it here
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                    Reset Token *
                  </label>
                  <input
                    required
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                    New Password (8+ characters) *
                  </label>
                  <input
                    required
                    minLength={8}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </>
            )}
          </form>
        ) : (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              className="w-full py-2.5 px-4 text-sm font-semibold border border-[#202020]/25 bg-[#F3EEE6]/50 text-[#202020] rounded-md hover:bg-[#F3EEE6] transition-colors"
            >
              {hasSuperAdmin === false
                ? 'Continue with Google (Claim Initial Super Admin)'
                : 'Sign In with Google'}
            </button>

            <div className="relative flex items-center justify-center">
              <span className="border-t border-[#202020]/10 w-full" />
              <span className="px-3 text-xs text-[#202020]/50 bg-[#FFFFFF] shrink-0">
                or sign in with email & password
              </span>
              <span className="border-t border-[#202020]/10 w-full" />
            </div>

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
                  Email Address *
                </label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    required
                    minLength={8}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-[#202020]/55 hover:text-[#202020]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-[#202020]/75 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="rounded border-[#202020]/30"
                  />
                  Remember session
                </label>
                {hasSuperAdmin !== false && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setForgotMode('request');
                    }}
                    className="font-semibold text-[#B58B61] hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {loading
                  ? 'Authenticating...'
                  : hasSuperAdmin === false
                    ? 'Create Super Admin Account'
                    : 'Secure Login'}
              </button>
            </form>
          </>
        )}

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
