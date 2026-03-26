'use client';

import DeanLayout from '@/components/DeanLayout';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Lock, Briefcase, Save, Eye, EyeOff } from 'lucide-react';

export default function DeanProfilePage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState(user?.position || '');
  const [idNumber, setIdNumber] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const fullName = user?.name?.trim() || '';
    if (!fullName) {
      setFirstName('');
      setLastName('');
      setPosition(user?.position || '');
      return;
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    const first = parts[0] || '';
    const last = parts.length > 1 ? parts.slice(1).join(' ') : '';
    setFirstName(first);
    setLastName(last);
    setPosition(user?.position || '');
  }, [user]);
  
  useEffect(() => {
    const loadIdNumber = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user')
        .select('id_number')
        .eq('id', user.id)
        .single();
      if (data?.id_number) setIdNumber(data.id_number);
    };
    loadIdNumber();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('user')
        .update({
          first_name: firstName,
          last_name: lastName,
          position: position,
          id_number: idNumber || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUser();
      alert('Profile updated successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to update profile: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    try {
      setLoading(true);

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        alert('Current password is incorrect!');
        return;
      }

      // Update password in users table
      const { error: updateError } = await supabase
        .from('user')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password changed successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to change password: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DeanLayout title="Profile Settings">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your account information and security</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <div className="card-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Personal Information</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="input-soft"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="input-soft"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Position</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="e.g. Dean of CITE"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">ID Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="input-soft"
                  placeholder="e.g. 2026-12345"
                />
                <p className="text-xs text-gray-500">You may include dashes (e.g. 2026-12345).</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input-soft bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary-soft px-6 py-2.5 gap-2"
                >
                  {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="card-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Change Password</h3>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Enter new password (min. 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary-soft px-6 py-2.5 gap-2"
                >
                  {loading ? 'Updating...' : <><Lock className="w-4 h-4" /> Change Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DeanLayout>
  );
}
