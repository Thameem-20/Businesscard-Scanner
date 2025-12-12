'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Lock, Key, AlertCircle, CheckCircle, Download } from 'lucide-react';

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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
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

