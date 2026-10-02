'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, X, CheckCircle, Power, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CountrySelect } from '@/components/country-select';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  departments?: string;
  department_ids?: number[];
}

interface Department {
  id: number;
  name: string;
  country?: string | null;
}

type OrgRole = 'admin' | 'manager' | 'user';

function roleBadgeClass(role: string) {
  if (role === 'admin') return 'bg-purple-100 text-purple-800';
  if (role === 'manager') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
}

interface Organization {
  id: number;
  name: string;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentCountry, setNewDepartmentCountry] = useState('');
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);
  const [addingDepartment, setAddingDepartment] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user' as OrgRole,
    organizationId: '',
    departmentIds: [] as number[],
  });
  const [editForm, setEditForm] = useState({
    role: 'user' as OrgRole,
    departmentIds: [] as number[],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchUsers();
      fetchDepartments();
      // Only fetch organizations if user is admin (needed for adding users)
      const userRole = (session?.user as any)?.role;
      if (userRole === 'admin') {
        fetchOrganizations();
      }
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/list');
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments/list');
      const data = await response.json();
      if (data.departments) {
        setDepartments(data.departments);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations/list');
      const data = await response.json();
      if (data.organizations) {
        setOrganizations(data.organizations);
        // Set default organization
        const defaultOrg = (session?.user as any)?.organizationId;
        if (defaultOrg) {
          setFormData((prev) => ({ ...prev, organizationId: defaultOrg.toString() }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId: formData.organizationId ? parseInt(formData.organizationId) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccess('User created successfully!');
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'user',
        organizationId: formData.organizationId,
        departmentIds: [],
      });
      // Close modal after a short delay to show success message
      setTimeout(() => {
        setShowForm(false);
        setSuccess('');
        setError('');
      }, 1500);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const toggleDepartment = (
    departmentId: number,
    selected: number[],
    setter: (ids: number[]) => void
  ) => {
    setter(
      selected.includes(departmentId)
        ? selected.filter((id) => id !== departmentId)
        : [...selected, departmentId]
    );
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;
    setAddingDepartment(true);
    setError('');
    try {
      const response = await fetch(
        editingDepartmentId ? '/api/departments/update' : '/api/departments/create',
        {
          method: editingDepartmentId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            departmentId: editingDepartmentId,
            name: newDepartmentName.trim(),
            country: newDepartmentCountry.trim() || null,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save department');
      setNewDepartmentName('');
      setNewDepartmentCountry('');
      setEditingDepartmentId(null);
      setSuccess(editingDepartmentId ? 'Department updated' : 'Department created');
      setTimeout(() => setSuccess(''), 3000);
      fetchDepartments();
    } catch (err: any) {
      setError(err.message || 'Failed to create department');
    } finally {
      setAddingDepartment(false);
    }
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      role: (['admin', 'manager', 'user'].includes(user.role) ? user.role : 'user') as OrgRole,
      departmentIds: user.department_ids || [],
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setError('');
    try {
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          role: editForm.role,
          departmentIds: editForm.departmentIds,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update user');
      setSuccess('User updated');
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    setTogglingUserId(userId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          isActive: !currentStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status');
      }

      setSuccess(data.message || 'User status updated successfully!');
      fetchUsers();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
      setTimeout(() => setError(''), 5000);
    } finally {
      setTogglingUserId(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) return null;

  const isAdmin = (session.user as any)?.role === 'admin';

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full w-full">
      <div className="h-full w-full">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Team</h1>
            <p className="text-gray-600">
              {isAdmin
                ? 'Manage roles and departments in your organization'
                : 'View users in your organization'}
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 md:w-auto w-full"
            >
              <UserPlus size={20} />
              <span>Add User</span>
            </Button>
          )}
        </div>

        {isAdmin && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Departments</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {departments.length === 0 && (
                <p className="text-sm text-gray-500">No departments yet. Add Sales or another team.</p>
              )}
              {departments.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  onClick={() => {
                    setEditingDepartmentId(department.id);
                    setNewDepartmentName(department.name);
                    setNewDepartmentCountry(department.country || '');
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    editingDepartmentId === department.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {department.name}
                  {department.country ? ` · ${department.country}` : ''}
                </button>
              ))}
            </div>
            <form onSubmit={handleAddDepartment} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Input
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                placeholder="Add department (e.g. Sales)"
              />
              <CountrySelect
                value={newDepartmentCountry}
                onChange={setNewDepartmentCountry}
                emptyLabel="Department country"
              />
              <Button type="submit" disabled={addingDepartment || !newDepartmentName.trim()}>
                {editingDepartmentId ? 'Save' : 'Add'}
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              New cards scanned by people in this department use its country unless they change it in Settings.
              {editingDepartmentId ? (
                <>
                  {' '}
                  <button
                    type="button"
                    className="text-indigo-600 font-medium"
                    onClick={() => {
                      setEditingDepartmentId(null);
                      setNewDepartmentName('');
                      setNewDepartmentCountry('');
                    }}
                  >
                    Cancel edit
                  </button>
                </>
              ) : (
                ' Click a department to edit it.'
              )}
            </p>
          </div>
        )}

        {/* Add User Modal */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account for your organization
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                <X className="text-red-600 h-4 w-4 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
                <CheckCircle className="text-green-600 h-4 w-4 flex-shrink-0" />
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Enter password"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as OrgRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="user">User — own cards only</option>
                  <option value="manager">Manager — assigned departments</option>
                  <option value="admin">Admin — all cards</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departments
                </label>
                <div className="space-y-2 max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {departments.length === 0 && (
                    <p className="text-sm text-gray-500">Add a department first.</p>
                  )}
                  {departments.map((department) => (
                    <label key={department.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.departmentIds.includes(department.id)}
                        onChange={() =>
                          toggleDepartment(department.id, formData.departmentIds, (departmentIds) =>
                            setFormData({ ...formData, departmentIds })
                          )
                        }
                      />
                      {department.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Users are stamped with their first department. Managers see every selected department.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <select
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="">Select organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setError('');
                    setSuccess('');
                    setFormData({
                      email: '',
                      password: '',
                      name: '',
                      role: 'user',
                      organizationId: formData.organizationId,
                      departmentIds: [],
                    });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Create User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="text-green-600 h-5 w-5 flex-shrink-0" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <X className="text-red-600 h-5 w-5 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Mobile & Tablet: Card Layout */}
        <div className="lg:hidden space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                  <p className="text-sm text-gray-600 truncate mt-1">{user.email}</p>
                </div>
                <span
                  className={`ml-3 px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${roleBadgeClass(user.role)}`}
                >
                  {user.role}
                </span>
              </div>
              {user.departments && (
                <p className="text-xs text-gray-500 mb-2">{user.departments}</p>
              )}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  Created: {new Date(user.created_at).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditUser(user)}
                      className="flex items-center gap-1.5"
                    >
                      <Pencil size={14} />
                      <span>Edit</span>
                    </Button>
                  )}
                  {isAdmin && user.role !== 'admin' && (
                    <Button
                      variant={user.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleStatus(user.id, user.is_active)}
                      disabled={togglingUserId === user.id || user.id === (session?.user as any)?.id}
                      className="flex items-center gap-1.5"
                    >
                      <Power size={14} />
                      <span>{user.is_active ? 'Deactivate' : 'Activate'}</span>
                    </Button>
                  )}
                </div>
              </div>
              {user.is_active === false && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-red-600 font-medium">Inactive</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop: Table Layout */}
        {users.length > 0 && (
          <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departments
                  </th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  {isAdmin && (
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleBadgeClass(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 xl:px-6 py-4 text-sm text-gray-500">
                      {user.departments || '—'}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditUser(user)}
                            className="flex items-center gap-1.5"
                          >
                            <Pencil size={14} />
                            <span>Edit</span>
                          </Button>
                        )}
                        {isAdmin && user.role !== 'admin' && (
                          <Button
                            variant={user.is_active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleToggleStatus(user.id, user.is_active)}
                            disabled={togglingUserId === user.id || user.id === (session?.user as any)?.id}
                            className="flex items-center gap-1.5"
                          >
                            <Power size={14} />
                            <span>{user.is_active ? 'Deactivate' : 'Activate'}</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit {editingUser?.name}</DialogTitle>
              <DialogDescription>
                Change this user&apos;s role and department access
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as OrgRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="user">User — own cards only</option>
                  <option value="manager">Manager — assigned departments</option>
                  <option value="admin">Admin — all cards</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Departments</label>
                <div className="space-y-2 max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {departments.map((department) => (
                    <label key={department.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={editForm.departmentIds.includes(department.id)}
                        onChange={() =>
                          toggleDepartment(department.id, editForm.departmentIds, (departmentIds) =>
                            setEditForm({ ...editForm, departmentIds })
                          )
                        }
                      />
                      {department.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

