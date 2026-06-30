'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  LogOut,
  Building2,
  ChevronRight,
  LayoutGrid,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OrganizationSummary {
  id: number;
  name: string;
  total_users: number;
  total_cards: number;
  cards_on_date: number;
}

export default function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/superadmin-panel');
    } else if (status === 'authenticated') {
      if ((session?.user as { role?: string })?.role !== 'superadmin') {
        router.replace('/dashboard/cards');
      }
    }
  }, [status, session, router]);

  const fetchOrganizations = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`/api/superadmin/overview?date=${today}`);
    const data = await res.json();
    if (res.ok) {
      setOrganizations(data.organizations || []);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as { role?: string })?.role === 'superadmin') {
      fetchOrganizations();
    }
  }, [status, session, fetchOrganizations]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewOrgName('');
      setShowAddOrg(false);
      await fetchOrganizations();
    } catch {
      // handled silently; child pages can show errors
    } finally {
      setSaving(false);
    }
  };

  const isOrgActive = (orgId: number) => pathname.includes(`/organizations/${orgId}`);
  const isHome = pathname === '/superadmin-panel/dashboard';

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400" />
      </div>
    );
  }

  if (status !== 'authenticated') return null;

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Super Admin</h1>
            <p className="text-xs text-slate-500 truncate max-w-[140px]">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <Link
          href="/superadmin-panel/dashboard"
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            isHome
              ? 'bg-amber-500/15 text-amber-400 font-medium'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-4 h-4 flex-shrink-0" />
          All Organizations
        </Link>

        <div className="pt-4 pb-2 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Organizations
          </p>
        </div>

        {organizations.map((org) => (
          <Link
            key={org.id}
            href={`/superadmin-panel/dashboard/organizations/${org.id}`}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
              isOrgActive(org.id)
                ? 'bg-amber-500/15 text-amber-400 font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{org.name}</span>
            </div>
            <span className="text-xs text-slate-600 group-hover:text-slate-400 flex-shrink-0">
              {org.total_cards}
            </span>
          </Link>
        ))}

        {organizations.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-600">No organizations yet</p>
        )}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddOrg(true)}
          className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/superadmin-panel' })}
          className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900 fixed inset-y-0 left-0 z-30">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-slate-900 border-r border-slate-800 z-50 flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <Shield className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-white text-sm">Super Admin</span>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      <Dialog open={showAddOrg} onOpenChange={setShowAddOrg}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrg} className="space-y-4 pt-2">
            <Input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Organization name"
              className="bg-slate-800 border-slate-600 text-white"
              autoFocus
            />
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
