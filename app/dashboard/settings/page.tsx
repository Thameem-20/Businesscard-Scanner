'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Lock, Key, AlertCircle, CheckCircle, Download, Globe } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Integration settings state
  const [crmApiKey, setCrmApiKey] = useState('');
  const [crmEndpoint, setCrmEndpoint] = useState('');
  const [integrationsSuccess, setIntegrationsSuccess] = useState('');
  const [exporting, setExporting] = useState(false);
  const [scanCountry, setScanCountry] = useState('');
  const [countrySelect, setCountrySelect] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [scanCountryLoading, setScanCountryLoading] = useState(true);
  const [scanCountrySaving, setScanCountrySaving] = useState(false);
  const [scanCountrySuccess, setScanCountrySuccess] = useState('');
  const [scanCountryError, setScanCountryError] = useState('');

  const fetchScanCountry = async () => {
    try {
      const response = await fetch('/api/settings/scan-country');
      const data = await response.json();
      if (response.ok) {
        const saved = data.scanCountry || '';
        setScanCountry(saved);

        if (!saved) {
          setCountrySelect('');
          setCustomCountry('');
        } else if (COUNTRIES.includes(saved as (typeof COUNTRIES)[number])) {
          setCountrySelect(saved);
          setCustomCountry('');
        } else {
          setCountrySelect('__custom__');
          setCustomCountry(saved);
        }
      }
    } catch (err) {
      console.error('Failed to fetch scan country:', err);
    } finally {
      setScanCountryLoading(false);
    }
  };

  const handleSaveScanCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanCountrySaving(true);
    setScanCountrySuccess('');
    setScanCountryError('');

    const valueToSave =
      countrySelect === '__custom__' ? customCountry.trim() : countrySelect;

    if (countrySelect === '__custom__' && !valueToSave) {
      setScanCountryError('Enter a custom country or network name');
      setScanCountrySaving(false);
      return;
    }

    try {
      const response = await fetch('/api/settings/scan-country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanCountry: valueToSave }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save scan country');
      }

      setScanCountry(valueToSave);

      setScanCountrySuccess(
        valueToSave
          ? `New cards will be tagged as ${valueToSave}.`
          : 'Scan country cleared. New cards will not be categorized.'
      );
      setTimeout(() => setScanCountrySuccess(''), 4000);
    } catch (err: any) {
      setScanCountryError(err.message || 'Failed to save scan country');
    } finally {
      setScanCountrySaving(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchScanCountry();
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) return null;

  const isAdmin = (session.user as any)?.role === 'admin';

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntegrationsSuccess('');
    setError('');

    setLoading(true);
    try {
      // TODO: Implement integration settings save
      // This is a placeholder for future CRM integration
      setIntegrationsSuccess('Integration settings saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save integration settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/cards/export-pdf', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to export PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-cards-export-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Business cards exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to export PDF');
      setTimeout(() => setError(''), 5000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full pb-32 md:pb-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Name</label>
              <Input 
                type="text" 
                value={session.user?.name || ''} 
                disabled 
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Email</label>
              <Input 
                type="email" 
                value={session.user?.email || ''} 
                disabled 
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Role</label>
              <Input 
                type="text" 
                value={(session.user as any)?.role || 'user'} 
                disabled 
                className="bg-gray-50 capitalize"
              />
            </div>
          </CardContent>
        </Card>

        {/* Scan Country */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Scan Country
            </CardTitle>
            <CardDescription>
              Set the country or network for new cards you scan (e.g. Saudi Arabia, WCA).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveScanCountry} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Country / Network
                </label>
                <select
                  value={countrySelect}
                  onChange={(e) => setCountrySelect(e.target.value)}
                  disabled={scanCountryLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">No country (uncategorized)</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                  <option value="__custom__">Custom (enter manually)</option>
                </select>
              </div>

              {countrySelect === '__custom__' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Custom name
                  </label>
                  <Input
                    type="text"
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value)}
                    placeholder="e.g. WCA, GLN, Saudi Arabia"
                    maxLength={100}
                    disabled={scanCountryLoading}
                  />
                </div>
              )}

              <p className="text-xs text-gray-500">
                Change this before scanning when collecting cards from a different country or network.
              </p>

              {scanCountryError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="text-red-600 h-4 w-4 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{scanCountryError}</p>
                </div>
              )}

              {scanCountrySuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="text-green-600 h-4 w-4 flex-shrink-0" />
                  <p className="text-green-700 text-sm">{scanCountrySuccess}</p>
                </div>
              )}

              <Button type="submit" disabled={scanCountrySaving || scanCountryLoading} className="w-full md:w-auto">
                {scanCountrySaving ? 'Saving...' : 'Save Scan Country'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="text-red-600 h-4 w-4 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="text-green-600 h-4 w-4 flex-shrink-0" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Export Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Business Cards
            </CardTitle>
            <CardDescription>
              Export all business cards from your organization to PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Download all business cards in your organization as a PDF document with images and card details.
              </p>

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="text-green-600 h-4 w-4 flex-shrink-0" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="text-red-600 h-4 w-4 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <Button 
                onClick={handleExportPDF} 
                disabled={exporting} 
                className="w-full md:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export to PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Integration Settings (Admin Only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                CRM Integration
              </CardTitle>
              <CardDescription>
                Configure Zybo Tech CRM integration settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveIntegrations} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    CRM API Key
                  </label>
                  <Input
                    type="password"
                    value={crmApiKey}
                    onChange={(e) => setCrmApiKey(e.target.value)}
                    placeholder="Enter CRM API key"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    CRM Endpoint URL
                  </label>
                  <Input
                    type="url"
                    value={crmEndpoint}
                    onChange={(e) => setCrmEndpoint(e.target.value)}
                    placeholder="https://api.zybotech.com/v1"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Integration settings are currently in development. 
                    Business cards will be synced to your CRM automatically once configured.
                  </p>
                </div>

                {integrationsSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle className="text-green-600 h-4 w-4 flex-shrink-0" />
                    <p className="text-green-700 text-sm">{integrationsSuccess}</p>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading ? 'Saving...' : 'Save Integration Settings'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

