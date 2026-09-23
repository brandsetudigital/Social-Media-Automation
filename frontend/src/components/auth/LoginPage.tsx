import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield, UserCheck, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email address or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await login(quickEmail, quickPass);
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans">
      <div className="bg-white rounded-[28px] max-w-5xl w-full shadow-2xl border border-gray-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* LEFT COLUMN: Blue Promo Card (Matching Reference Screenshot) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-[#0172F4] via-[#0165DA] to-[#0052BF] p-8 sm:p-10 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle Ambient Light Orbs */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-300/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Logo */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#0172F4] flex items-center justify-center font-black text-xl shadow-lg shadow-black/10">
                B
              </div>
              <span className="text-2xl font-black tracking-tight text-white">BrandSetu Digital</span>
            </div>

            {/* Motivational Tagline from reference */}
            <p className="text-white/90 text-sm sm:text-base font-normal leading-relaxed max-w-md pt-4">
              Hope, you join the comprehensive range of features that can help your business achieve the goals easily and efficiently
            </p>
          </div>

          {/* 3D Glossy Social Media Artwork */}
          <div className="relative z-10 my-6 flex items-center justify-center">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/40 border border-white/20">
              <img
                src="/login-social-banner.jpg"
                alt="BrandSetu Social Media Automation"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Bottom badge */}
          <div className="relative z-10 text-white/70 text-[11px] font-medium tracking-wide">
            © 2026 BrandSetu Digital. All rights reserved.
          </div>
        </div>

        {/* RIGHT COLUMN: Clean Login Form (Matching Reference Screenshot) */}
        <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Title & Subtitle */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Login to your account
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Enter your email address and password to login.
              </p>
            </div>

            {/* 1-Click Quick Demo Access */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                ⚡ 1-Click Fast Login
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('soumitravajpayee@gmail.com', 'Admin@123')}
                  className="p-2.5 rounded-lg bg-white border border-gray-200 hover:border-[#0172F4] hover:bg-blue-50/40 text-left transition shadow-xs group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 group-hover:text-[#0172F4]">
                    <Shield className="w-3.5 h-3.5 text-[#0172F4]" />
                    <span>Admin</span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5 font-mono">soumitravajpayee@...</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('brandsetudigital@gmail.com', 'setu@123')}
                  className="p-2.5 rounded-lg bg-white border border-gray-200 hover:border-[#0172F4] hover:bg-blue-50/40 text-left transition shadow-xs group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 group-hover:text-[#0172F4]">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>SMM</span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5 font-mono">brandsetudigital@...</p>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-800">
                  Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-[#0172F4]/20 focus:border-[#0172F4] transition shadow-xs"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-800">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-[#0172F4]/20 focus:border-[#0172F4] transition shadow-xs"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0172F4] border-gray-300 focus:ring-[#0172F4]"
                  />
                  <span className="font-medium">Remember Me</span>
                </label>

                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset link has been dispatched to your email.');
                  }}
                  className="font-semibold text-[#0172F4] hover:text-[#005cd3] transition"
                >
                  Forgot Password
                </a>
              </div>

              {/* Log in Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#0172F4] hover:bg-[#005cd3] text-white rounded-lg font-semibold text-sm transition shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <span>{isLoading ? 'Logging in...' : 'Log in'}</span>
              </button>
            </form>

            {/* Bottom Links */}
            <div className="pt-2 text-center space-y-2 text-xs">
              <p className="text-gray-600">
                Don't have a Profile?{' '}
                <a
                  href="#create"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Profile creation is managed by your BrandSetu Administrator.');
                  }}
                  className="font-semibold text-[#0172F4] hover:underline"
                >
                  Create Profile
                </a>
              </p>

              <div>
                <a
                  href="#privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('BrandSetu Digital Privacy Policy: All client data is strictly protected.');
                  }}
                  className="text-gray-400 hover:text-gray-600 font-medium"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
