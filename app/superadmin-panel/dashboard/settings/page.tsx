'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuperAdminSettingsPage() {
  const [mfaEmailOtp, setMfaEmailOtp] = useState(false);
  const [mailConfigured, setMailConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/superadmin/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMfaEmailOtp(Boolean(data.mfaEmailOtp));
      setMailConfigured(Boolean(data.mailConfigured));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaEmailOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(mfaEmailOtp
        ? 'Email OTP is now required for admin, manager, and user logins.'
        : 'Email OTP is turned off.');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-slate-400 text-sm mt-1">Security controls for organization logins</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Email OTP (MFA)</h3>
            <p className="text-slate-400 text-sm mt-1">
              When enabled, admins, managers, and users must enter a 6-digit code emailed after their password.
              Super admin login is never asked for a code.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="h-10 flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-400" />
          </div>
        ) : (
          <>
            <label className="flex items-center justify-between gap-4 bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3">
              <span className="text-sm text-slate-200">Require email OTP on login</span>
              <input
                type="checkbox"
                checked={mfaEmailOtp}
                onChange={(e) => setMfaEmailOtp(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <p className="text-xs text-slate-500">
              {mailConfigured
                ? 'SMTP is configured on the server.'
                : 'SMTP is not configured yet. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and MAIL_FROM before enabling.'}
            </p>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              {saving ? 'Saving...' : 'Save settings'}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
