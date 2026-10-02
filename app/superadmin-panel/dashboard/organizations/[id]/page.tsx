'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  CreditCard,
  Users,
  Calendar,
  Pencil,
  BarChart3,
  Flag,
  UserCog,
  Network,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Tab = 'overview' | 'reports' | 'departments' | 'users';

interface OrgStats {
  total_cards: number;
  cards_on_date: number;
  total_users: number;
  active_users: number;
}

interface CountryRow {
  country: string;
  count: number;
}

interface UserCardRow {
  user_id: number;
  name: string;
  email: string;
  total_cards: number;
  cards_on_date: number;
}

interface DailyRow {
  date: string;
  count: number;
}

interface CardRow {
  id: number;
  name: string;
  company: string | null;
  country: string | null;
  email: string | null;
  created_at: string;
  uploaded_by: string;
}

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean | number;
  created_at: string;
  departments?: string;
  department_ids?: number[];
}

interface DepartmentRow {
  id: number;
  name: string;
  card_count?: number;
}

type OrgRole = 'admin' | 'manager' | 'user';

export default function OrganizationDetailPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [countryFilter, setCountryFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [orgName, setOrgName] = useState('');
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [cardsByCountry, setCardsByCountry] = useState<CountryRow[]>([]);
  const [cardsByUser, setCardsByUser] = useState<UserCardRow[]>([]);
  const [filteredCardCount, setFilteredCardCount] = useState<number | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyRow[]>([]);
  const [recentCards, setRecentCards] = useState<CardRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [renamingDept, setRenamingDept] = useState<DepartmentRow | null>(null);
  const [renameDeptName, setRenameDeptName] = useState('');
  const [assigningDept, setAssigningDept] = useState<DepartmentRow | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<OrgRole>('user');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as OrgRole,
    departmentIds: [] as number[],
  });

  const [editingOrg, setEditingOrg] = useState(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'user' as OrgRole,
    isActive: true,
    password: '',
    departmentIds: [] as number[],
  });
  const [saving, setSaving] = useState(false);

  const loadOrg = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ date: filterDate });
      if (countryFilter) qs.set('country', countryFilter);
      if (userFilter) qs.set('userId', userFilter);

      const res = await fetch(`/api/superadmin/organizations/${orgId}?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOrgName(data.organization.name);
      setEditOrgName(data.organization.name);
      setStats(data.stats);
      setCardsByCountry(data.cardsByCountry || []);
      setCardsByUser(data.cardsByUser || []);
      setFilteredCardCount(data.filteredCardCount ?? null);
      setDailyReport(data.dailyReport || []);
      setRecentCards(data.recentCards || []);
      setUsers(data.users || []);
      setDepartments(data.departments || []);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  }, [orgId, filterDate, countryFilter, userFilter]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  const handleUpdateOrg = async () => {
    if (!editOrgName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: parseInt(orgId), name: editOrgName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrgName(editOrgName.trim());
      setEditingOrg(false);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const openEditUser = (user: UserRow) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: (['admin', 'manager', 'user'].includes(user.role) ? user.role : 'user') as OrgRole,
      isActive: user.is_active === true || user.is_active === 1,
      password: '',
      departmentIds: user.department_ids || [],
    });
  };

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: parseInt(orgId), name: newDepartmentName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewDepartmentName('');
      await loadOrg();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to create department');
    } finally {
      setSaving(false);
    }
  };

  const handleRenameDepartment = async () => {
    if (!renamingDept || !renameDeptName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: parseInt(orgId),
          departmentId: renamingDept.id,
          name: renameDeptName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRenamingDept(null);
      await loadOrg();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to rename department');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async (department: DepartmentRow) => {
    if (!confirm(`Delete department "${department.name}"? Users will be unassigned. Cards must be moved first.`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/superadmin/departments?organizationId=${orgId}&departmentId=${department.id}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadOrg();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to delete department');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignMember = async () => {
    if (!assigningDept || !assignUserId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/departments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: parseInt(orgId),
          departmentId: assigningDept.id,
          userId: parseInt(assignUserId),
          role: assignRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssigningDept(null);
      setAssignUserId('');
      await loadOrg();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to assign user');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (departmentId: number, userId: number) => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/superadmin/departments/assign?departmentId=${departmentId}&userId=${userId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadOrg();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to remove user');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createUserForm.name.trim() || !createUserForm.email.trim() || !createUserForm.password) {
      setError('Name, email, and password are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: parseInt(orgId),
          ...createUserForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCreateUser(false);
      setCreateUserForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        departmentIds: [],
      });
      await loadOrg();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          organizationId: parseInt(orgId),
          isActive: userForm.isActive,
          password: userForm.password || undefined,
          departmentIds: userForm.departmentIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingUser(null);
      await loadOrg();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = userFilter
    ? cardsByUser.find((u) => String(u.user_id) === userFilter)
    : null;

  const userCardCounts = new Map(
    cardsByUser.map((u) => [u.user_id, { total: u.total_cards, onDate: u.cards_on_date }])
  );

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'reports', label: 'Cards & Reports', icon: CreditCard },
    { id: 'departments', label: 'Departments', icon: Network },
    { id: 'users', label: 'Users', icon: UserCog },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">{orgName}</h2>
            <button
              onClick={() => setEditingOrg(true)}
              className="text-slate-500 hover:text-amber-400 p-1"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-1">Organization management</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          {activeTab === 'reports' && (
            <>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white max-w-[200px]"
              >
                <option value="">All users</option>
                {cardsByUser.map((u) => (
                  <option key={u.user_id} value={String(u.user_id)}>
                    {u.name} ({u.total_cards})
                  </option>
                ))}
              </select>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">All countries</option>
                <option value="__uncategorized__">Uncategorized</option>
                {cardsByCountry.map((c) => (
                  <option key={c.country} value={c.country}>{c.country} ({c.count})</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CreditCard} label="Total Cards" value={stats?.total_cards ?? 0} />
        <StatCard icon={CreditCard} label={`Cards on ${filterDate}`} value={stats?.cards_on_date ?? 0} highlight />
        <StatCard icon={Users} label="Users" value={stats?.total_users ?? 0} />
        <StatCard icon={Users} label="Active Users" value={stats?.active_users ?? 0} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Cards by User
            </h3>
            {cardsByUser.length === 0 ? (
              <p className="text-slate-500 text-sm">No users yet</p>
            ) : (
              <div className="space-y-2">
                {cardsByUser.map((row) => (
                  <button
                    key={row.user_id}
                    type="button"
                    onClick={() => {
                      setUserFilter(String(row.user_id));
                      setActiveTab('reports');
                    }}
                    className="w-full flex items-center justify-between py-2 border-b border-slate-800 last:border-0 hover:bg-slate-800/40 rounded px-1 -mx-1 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="text-slate-300 text-sm block truncate">{row.name}</span>
                      <span className="text-slate-500 text-xs truncate block">{row.email}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className="text-white font-medium block">{row.total_cards}</span>
                      <span className="text-amber-400/80 text-xs">
                        {row.cards_on_date} on {filterDate}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-slate-500" />
              Cards by Country / Network
            </h3>
            {cardsByCountry.length === 0 ? (
              <p className="text-slate-500 text-sm">No cards yet</p>
            ) : (
              <div className="space-y-2">
                {cardsByCountry.map((row) => (
                  <div key={row.country} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                    <span className="text-slate-300 text-sm">{row.country}</span>
                    <span className="text-white font-medium">{row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              Last 30 Days Activity
            </h3>
            {dailyReport.length === 0 ? (
              <p className="text-slate-500 text-sm">No activity in the last 30 days</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dailyReport.map((row) => (
                  <div key={row.date} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                    <span className="text-slate-300 text-sm">{row.date}</span>
                    <span className={`font-medium ${row.date === filterDate ? 'text-amber-400' : 'text-white'}`}>
                      {row.count} cards
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'reports' && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">
              Cards
              {selectedUser ? ` — ${selectedUser.name}` : ''}
              {countryFilter ? ` — ${countryFilter === '__uncategorized__' ? 'Uncategorized' : countryFilter}` : ''}
              {filterDate ? ` on ${filterDate}` : ''}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {filteredCardCount !== null
                ? `${filteredCardCount} card(s) match filters`
                : `${recentCards.length} card(s) shown`}
              {recentCards.length === 100 && filteredCardCount !== null && filteredCardCount > 100
                ? ' (showing latest 100)'
                : ''}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Company</th>
                  <th className="text-left py-3 px-4">Country</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Added By</th>
                  <th className="text-left py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentCards.map((card) => (
                  <tr key={card.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-white">{card.name}</td>
                    <td className="py-3 px-4 text-slate-400">{card.company || '—'}</td>
                    <td className="py-3 px-4 text-slate-400">{card.country || '—'}</td>
                    <td className="py-3 px-4 text-slate-400">{card.email || '—'}</td>
                    <td className="py-3 px-4 text-slate-400">{card.uploaded_by}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {new Date(card.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {recentCards.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No cards match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'departments' && (
        <section className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Create department</h3>
            <div className="flex gap-2">
              <Input
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                placeholder="e.g. Sales, Main, Operations"
                className="bg-slate-800 border-slate-600 text-white h-9"
              />
              <Button
                onClick={handleAddDepartment}
                disabled={saving || !newDepartmentName.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 h-9"
              >
                Create
              </Button>
            </div>
          </div>

          {departments.length === 0 && (
            <p className="text-slate-500 text-sm">No departments yet.</p>
          )}

          {departments.map((department) => {
            const members = users.filter((user) => user.department_ids?.includes(department.id));
            const managers = members.filter((user) => user.role === 'manager');
            const deptUsers = members.filter((user) => user.role === 'user');
            const admins = members.filter((user) => user.role === 'admin');
            return (
              <div key={department.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-white font-semibold">{department.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {department.card_count || 0} cards · {managers.length} manager(s) · {deptUsers.length} user(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-300"
                      onClick={() => {
                        setAssigningDept(department);
                        setAssignUserId('');
                        setAssignRole('user');
                      }}
                    >
                      Assign person
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-300"
                      onClick={() => {
                        setRenamingDept(department);
                        setRenameDeptName(department.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-red-300"
                      onClick={() => handleDeleteDepartment(department)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <DeptPeople
                    title="Managers"
                    people={managers}
                    empty="No managers assigned"
                    onRemove={(userId) => handleRemoveMember(department.id, userId)}
                    onEdit={openEditUser}
                  />
                  <DeptPeople
                    title="Users"
                    people={deptUsers}
                    empty="No users assigned"
                    onRemove={(userId) => handleRemoveMember(department.id, userId)}
                    onEdit={openEditUser}
                  />
                  <DeptPeople
                    title="Admins in this department"
                    people={admins}
                    empty="No admins assigned"
                    onRemove={(userId) => handleRemoveMember(department.id, userId)}
                    onEdit={openEditUser}
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {activeTab === 'users' && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Users in {orgName}</h3>
                <p className="text-xs text-slate-500 mt-1">{users.length} user(s)</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowCreateUser(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Add user
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {departments.map((department) => (
                <span key={department.id} className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">
                  {department.name}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                placeholder="Add department"
                className="bg-slate-800 border-slate-600 text-white h-9"
              />
              <Button
                onClick={handleAddDepartment}
                disabled={saving || !newDepartmentName.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 h-9"
              >
                Add
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Departments</th>
                  <th className="text-right py-3 px-4">Total Cards</th>
                  <th className="text-right py-3 px-4">On {filterDate}</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Joined</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const counts = userCardCounts.get(user.id);
                  return (
                  <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-white">{user.name}</td>
                    <td className="py-3 px-4 text-slate-400">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                        user.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300'
                          : user.role === 'manager'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{user.departments || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setUserFilter(String(user.id));
                          setActiveTab('reports');
                        }}
                        className="text-white font-medium hover:text-amber-400"
                      >
                        {counts?.total ?? 0}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400/90">
                      {counts?.onDate ?? 0}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        user.is_active === true || user.is_active === 1
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {user.is_active === true || user.is_active === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditUser(user)}
                        className="text-slate-500 hover:text-amber-400 p-1"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">No users in this organization</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Edit org dialog */}
      <Dialog open={editingOrg} onOpenChange={setEditingOrg}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Rename Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={editOrgName}
              onChange={(e) => setEditOrgName(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
            <Button onClick={handleUpdateOrg} disabled={saving} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {editingUser?.role === 'admin' ? 'admin' : editingUser?.role === 'manager' ? 'manager' : 'user'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Field label="Name">
              <Input
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </Field>
            <Field label="Role">
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as OrgRole })}
                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="user">User — own cards only</option>
                <option value="manager">Manager — assigned departments</option>
                <option value="admin">Admin — all cards</option>
              </select>
            </Field>
            <Field label="Departments">
              <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-700 rounded-md p-3">
                {departments.length === 0 && (
                  <p className="text-xs text-slate-500">Add a department above first.</p>
                )}
                {departments.map((department) => (
                  <label key={department.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={userForm.departmentIds.includes(department.id)}
                      onChange={() => {
                        const selected = userForm.departmentIds.includes(department.id)
                          ? userForm.departmentIds.filter((id) => id !== department.id)
                          : [...userForm.departmentIds, department.id];
                        setUserForm({ ...userForm, departmentIds: selected });
                      }}
                    />
                    {department.name}
                  </label>
                ))}
              </div>
            </Field>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={userForm.isActive}
                onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="text-sm text-slate-300">Active account</label>
            </div>
            <Field label="New password (optional)">
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Leave blank to keep current"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </Field>
            <Button onClick={handleUpdateUser} disabled={saving} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Field label="Name">
              <Input
                value={createUserForm.name}
                onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={createUserForm.email}
                onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={createUserForm.password}
                onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </Field>
            <Field label="Role">
              <select
                value={createUserForm.role}
                onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value as OrgRole })}
                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="user">User — own cards only</option>
                <option value="manager">Manager — assigned departments</option>
                <option value="admin">Admin — all cards</option>
              </select>
            </Field>
            <Field label="Departments">
              <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-700 rounded-md p-3">
                {departments.map((department) => (
                  <label key={department.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={createUserForm.departmentIds.includes(department.id)}
                      onChange={() => {
                        const selected = createUserForm.departmentIds.includes(department.id)
                          ? createUserForm.departmentIds.filter((id) => id !== department.id)
                          : [...createUserForm.departmentIds, department.id];
                        setCreateUserForm({ ...createUserForm, departmentIds: selected });
                      }}
                    />
                    {department.name}
                  </label>
                ))}
              </div>
            </Field>
            <Button onClick={handleCreateUser} disabled={saving} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950">
              {saving ? 'Creating...' : 'Create user'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renamingDept} onOpenChange={() => setRenamingDept(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Rename department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={renameDeptName}
              onChange={(e) => setRenameDeptName(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
            <Button onClick={handleRenameDepartment} disabled={saving} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assigningDept} onOpenChange={() => setAssigningDept(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Assign person to {assigningDept?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Field label="Person">
              <select
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assign as">
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value as OrgRole)}
                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="user">User of this department</option>
                <option value="manager">Manager of this department</option>
              </select>
            </Field>
            <Button onClick={handleAssignMember} disabled={saving || !assignUserId} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950">
              {saving ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeptPeople({
  title,
  people,
  empty,
  onRemove,
  onEdit,
}: {
  title: string;
  people: UserRow[];
  empty: string;
  onRemove: (userId: number) => void;
  onEdit: (user: UserRow) => void;
}) {
  return (
    <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{title}</p>
      {people.length === 0 ? (
        <p className="text-xs text-slate-600">{empty}</p>
      ) : (
        <div className="space-y-2">
          {people.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onEdit(user)}
                className="text-left min-w-0"
              >
                <p className="text-sm text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </button>
              <button
                type="button"
                onClick={() => onRemove(user.id)}
                className="text-xs text-slate-500 hover:text-red-300 flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border ${
      highlight ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900 border-slate-800'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${highlight ? 'text-amber-400' : 'text-slate-500'}`} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-amber-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
