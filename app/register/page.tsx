'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    id_number: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    position: '',
    role: 'faculty',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // DB-only registration per request (no Supabase Auth)
      const { data: existingUser, error: checkError } = await supabase
        .from('user')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();
      if (checkError) {
        setError(checkError.message || 'Failed to check existing user');
        setLoading(false);
        return;
      }
      if (existingUser) {
        setError('Email already in use');
        setLoading(false);
        return;
      }
      const { error: insertError } = await supabase
        .from('user')
        .insert([{
          id_number: formData.id_number,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          password: formData.password,
          position: formData.position,
          role: formData.role,
        }]);
      if (insertError) {
        setError(insertError.message || 'Failed to save profile');
        setLoading(false);
        return;
      }
      router.push('/login?registered=true');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register account';
      console.error('Registration error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `input-soft ${
      focusedField === field ? '' : ''
    }`;

  return (
    <div className="min-h-screen flex">
      {/* Left Panel – Gradient Brand */}
      <div className="hidden lg:flex lg:w-[38%] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-400 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-28 -right-28 w-80 h-80 rounded-full bg-white/10"></div>
        <div className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-white/5"></div>

        <div className="relative z-10 text-center max-w-xs">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-7 border-2 border-gray-200 shadow-2xl">
            <img src="/CITE.png" alt="CITE Logo" className="w-16 h-16 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight mb-3">
            Join CITE Portal
          </h1>
          <p className="text-orange-100 text-sm font-medium leading-relaxed">
            Create your account to submit and track WFH accomplishment reports
          </p>
          <div className="mt-8 pt-6 border-t border-white/20 space-y-2">
            {['Submit WFH Reports', 'Track Approval Status', 'View Announcements'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-orange-100 text-xs">
                <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel – Form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-24 h-24 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <img src="/CITE.png" alt="CITE" className="w-18 h-18 object-contain" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">CITE Report Portal</h1>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create your account</h2>
            <p className="text-gray-500 text-sm mt-1">Fill in your details to get started</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-2.5 mb-5 animate-in fade-in duration-200" role="alert">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 block">First Name</label>
                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange}
                  onFocus={() => setFocusedField('first_name')} onBlur={() => setFocusedField('')}
                  placeholder="Juan" className={inputClass('first_name')} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 block">Last Name</label>
                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange}
                  onFocus={() => setFocusedField('last_name')} onBlur={() => setFocusedField('')}
                  placeholder="Dela Cruz" className={inputClass('last_name')} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 block">ID Number</label>
                <input type="text" name="id_number" value={formData.id_number} onChange={handleChange}
                  onFocus={() => setFocusedField('id_number')} onBlur={() => setFocusedField('')}
                  placeholder="221-0510" className={inputClass('id_number')} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 block">Position</label>
                <input type="text" name="position" value={formData.position} onChange={handleChange}
                  onFocus={() => setFocusedField('position')} onBlur={() => setFocusedField('')}
                  placeholder="Instructor I" className={inputClass('position')} required />
              </div>
            </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 block">System Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white appearance-none cursor-pointer"
            >
              <option value="faculty">Faculty</option>
              <option value="chair">Department Chair</option>
              <option value="dean">Dean</option>
              <option value="admin">Admin</option>
            </select>
          </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 block">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField('')}
                placeholder="your.email@university.edu" className={inputClass('email')} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 block">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                    onChange={handleChange} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField('')}
                    placeholder="••••••••" className={inputClass('password') + ' pr-10'} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 block">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} name="confirm_password"
                    value={formData.confirm_password} onChange={handleChange}
                    onFocus={() => setFocusedField('confirm_password')} onBlur={() => setFocusedField('')}
                    placeholder="••••••••" className={inputClass('confirm_password') + ' pr-10'} required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary-soft py-3.5 mt-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">Create Account</span>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-gray-400 text-center mt-4">
            &copy; {new Date().getFullYear()} Nueva Vizcaya State University
          </p>
        </div>
      </div>
    </div>
  );
}
