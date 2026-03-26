'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Shield, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const passwordInputRef = useRef<HTMLInputElement>(null);
  // Forgot password removed per request

  // Forgot password removed per request

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Real-time email validation
  useEffect(() => {
    if (email && !emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  }, [email]);

  // Real-time password validation
  useEffect(() => {
    if (password && password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
    } else {
      setPasswordError('');
    }
  }, [password]);

  const validateForm = () => {
    let isValid = true;

    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Redirect will happen automatically via AuthProvider
    } else {
      setError(result.message);
      // Shake animation for error
      if (passwordInputRef.current) {
        passwordInputRef.current.classList.add('animate-shake');
        setTimeout(() => {
          if (passwordInputRef.current) {
            passwordInputRef.current.classList.remove('animate-shake');
          }
        }, 500);
      }
    }

    setLoading(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Forgot password removed per request

  return (
    <div className="min-h-screen flex">
      {/* Left Panel – Gradient Brand */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-400 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/10"></div>
        <div className="absolute top-1/2 left-1/4 w-40 h-40 rounded-full bg-white/5"></div>

        <div className="relative z-10 text-center max-w-sm">
          <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 border-2 border-gray-200 shadow-2xl">
            <img src="/CITE.png" alt="CITE Logo" className="w-20 h-20 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight mb-3">
            CITE Report Portal
          </h1>
          <p className="text-orange-100 text-base font-medium leading-relaxed">
            College of Information Technology Educators
          </p>
          <div className="mt-8 pt-8 border-t border-white/20">
            <p className="text-orange-200 text-sm">Nueva Vizcaya State University</p>
          </div>
        </div>
      </div>

      {/* Right Panel – Form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-6 sm:p-10">
        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-24 h-24 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <img src="/CITE.png" alt="CITE" className="w-18 h-18 object-contain" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">CITE Report Portal</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-2.5 mb-5 animate-in fade-in duration-200" role="alert">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                Email address
                {emailError && <span className="text-red-500 text-xs font-normal ml-1">— {emailError}</span>}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('')}
                placeholder="your.email@university.edu"
                className={`input-soft ${emailError ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-500/10' : ''}`}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                Password
                {passwordError && <span className="text-red-500 text-xs font-normal ml-1">— {passwordError}</span>}
              </label>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  placeholder="••••••••"
                  className={`input-soft pr-10 ${passwordError ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-500/10' : ''}`}
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!emailError || !!passwordError}
              className="w-full btn-primary-soft py-3.5 mt-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            No account?{' '}
            <a href="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Create one here
            </a>
          </p>

          <p className="text-xs text-gray-400 text-center mt-8">
            &copy; {new Date().getFullYear()} Nueva Vizcaya State University
          </p>
        </div>
      </div>

      {/* Forgot password removed per request */}

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
