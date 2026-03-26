'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Portal from '@/components/Portal';
import LottiePlayer from '@/components/LottiePlayer';
import { 
  UserPlus, 
  Search, 
  Mail, 
  Shield, 
  User as UserIcon,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertTriangle as AlertTriangleIcon
} from 'lucide-react';

interface DBUser {
  id: string;
  id_number: string | null;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('faculty');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DBUser | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<DBUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // New user form state
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'faculty',
    id_number: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('user')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('Supabase error details:', supabaseError);
        throw new Error(supabaseError.message || 'Failed to fetch users from database');
      }
      
      setUsers(data || []);
    } catch (err) {
      console.error('Error in fetchUsers:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('user')
        .insert([
          {
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            email: newUser.email,
            password: newUser.password,
            role: newUser.role,
            id_number: newUser.id_number || null
          }
        ]);
      if (error) throw error;

      setShowAddModal(false);
      setNewUser({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'faculty',
        id_number: ''
      });
      fetchUsers();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add user';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('user')
        .update({
          first_name: selectedUser.first_name,
          last_name: selectedUser.last_name,
          email: selectedUser.email,
          role: selectedUser.role,
          id_number: selectedUser.id_number || null
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const found = users.find(u => u.id === id) || null;
    setUserToDelete(found);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      // Cascade delete WFH data owned by this user to satisfy FKs
      const { data: reports, error: reportsError } = await supabase
        .from('wfh_reports')
        .select('id')
        .eq('user_id', userToDelete.id);
      if (reportsError) throw reportsError;

      const reportIds = (reports || []).map(r => r.id);

      if (reportIds.length > 0) {
        const { data: entries, error: entriesError } = await supabase
          .from('wfh_entries')
          .select('id')
          .in('report_id', reportIds);
        if (entriesError) throw entriesError;

        const entryIds = (entries || []).map(e => e.id);

        if (entryIds.length > 0) {
          const { data: items } = await supabase
            .from('wfh_instruction_items')
            .select('id')
            .in('entry_id', entryIds);

          if (items && items.length > 0) {
            const itemIds = items.map(i => i.id);
            const { error: bulletsError } = await supabase
              .from('wfh_instruction_bullets')
              .delete()
              .in('item_id', itemIds);
            if (bulletsError) throw bulletsError;
          }

          const stepResults = await Promise.all([
            supabase.from('wfh_instruction_items').delete().in('entry_id', entryIds),
            supabase.from('wfh_accomplishments').delete().in('entry_id', entryIds),
            supabase.from('wfh_issues').delete().in('entry_id', entryIds),
          ]);
          for (const r of stepResults) {
            if (r.error) throw r.error;
          }

          const { error: entriesDeleteError } = await supabase
            .from('wfh_entries')
            .delete()
            .in('report_id', reportIds);
          if (entriesDeleteError) throw entriesDeleteError;
        }

        const { error: reportsDeleteError } = await supabase
          .from('wfh_reports')
          .delete()
          .in('id', reportIds);
        if (reportsDeleteError) throw reportsDeleteError;
      }

      const { error } = await supabase.from('user').delete().eq('id', userToDelete.id);

      if (error) throw error;
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user (cascade):', err);
      const errorMsg = err && typeof err === 'object' && 'message' in err ? (err as any).message : 'Unknown error';
      alert('Error deleting user: ' + errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (user: DBUser) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = user.role ? user.role.trim().toLowerCase() === activeTab : false;
    return matchesSearch && matchesRole;
  });

  const TABS = [
    { id: 'faculty', label: 'Faculty' },
    { id: 'chair', label: 'Chair' },
    { id: 'dean', label: 'Dean' },
    { id: 'admin', label: 'Admin' },
  ];

  const roles = [
    { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'dean', label: 'Dean', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'chair', label: 'Chair', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'faculty', label: 'Faculty', color: 'bg-green-100 text-green-700 border-green-200' },
  ];

  return (
    <DashboardLayout allowedRoles={['admin']} title="Account Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary-soft px-4 py-2.5 gap-2"
            >
              <UserPlus className="w-4 h-4" /> Add New User
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-orange-600 text-orange-700 bg-orange-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">User</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">ID Number</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Joined Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        <p className="text-gray-500 font-medium">Loading user data...</p>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                          <UserIcon className="w-6 h-6" />
                        </div>
                        <p className="text-gray-500 font-medium">There are no users in the system yet.</p>
                        <p className="text-sm text-gray-400">Click &ldquo;Add New User&rdquo; to get started.</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                          <UserIcon className="w-6 h-6" />
                        </div>
                        <p className="text-gray-500 font-medium">No users found matching your criteria</p>
                        <p className="text-sm text-gray-400">Try adjusting your search or checking a different role tab.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-bold border border-orange-100">
                            {user.first_name[0]}{user.last_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-none">{user.first_name} {user.last_name}</p>
                            <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-1">
                                <Mail className="w-3 h-3" /> {user.email}
                              </p>
                              {user.id_number && <p className="text-xs text-gray-400 mt-1">ID: {user.id_number}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-600">{user.id_number || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                          roles.find(r => r.value === user.role)?.color || 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal(user)}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-orange-600 transition-all border border-transparent hover:border-gray-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-red-600 transition-all border border-transparent hover:border-gray-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Add New User</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-white/70 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">First Name</label>
                  <input
                    required
                    type="text"
                    className="input-soft"
                    placeholder="Enter first name"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">Last Name</label>
                  <input
                    required
                    type="text"
                    className="input-soft"
                    placeholder="Enter last name"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    required
                    type="email" 
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="name@university.edu"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">ID Number</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Optional"
                    value={newUser.id_number}
                    onChange={(e) => setNewUser({...newUser, id_number: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">System Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white appearance-none cursor-pointer"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    >
                      <option value="faculty">Faculty</option>
                      <option value="chair">Department Chair</option>
                      <option value="dean">Dean</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Password</label>
                <input 
                  required
                  type="password" 
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Set initial password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" /> Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
                  <Edit2 className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Edit User</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-white/70 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">First Name</label>
                  <input 
                    required
                    type="text" 
                    className="input-soft"
                    placeholder="Enter first name"
                    value={selectedUser.first_name}
                    onChange={(e) => setSelectedUser({...selectedUser, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">Last Name</label>
                  <input 
                    required
                    type="text" 
                    className="input-soft"
                    placeholder="Enter last name"
                    value={selectedUser.last_name}
                    onChange={(e) => setSelectedUser({...selectedUser, last_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    required
                    type="email" 
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="name@university.edu"
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase">ID Number</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      value={selectedUser.id_number || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, id_number: e.target.value})}
                    />
                  </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">System Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white appearance-none cursor-pointer"
                      value={selectedUser.role}
                      onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                    >
                      <option value="faculty">Faculty</option>
                      <option value="chair">Department Chair</option>
                      <option value="dean">Dean</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" /> Update User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="text-center space-y-2">
                <LottiePlayer path="/delete.json" className="mx-auto w-24 h-24" name="admin-user-delete" />
                <h3 className="text-lg font-semibold text-slate-900">Delete User</h3>
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
                {userToDelete && (
                  <p className="text-sm font-semibold text-slate-900">
                    {userToDelete.first_name} {userToDelete.last_name}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
                  onClick={() => {
                    if (deleting) return;
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium shadow-sm shadow-red-600/20 disabled:opacity-50"
                  onClick={confirmDeleteUser}
                >
                  {deleting ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </DashboardLayout>
  );
}
