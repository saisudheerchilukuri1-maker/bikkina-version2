import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Settings as SettingsIcon, User, Lock, Building, Check, AlertCircle } from 'lucide-react';

const Settings = () => {
  const { user, updateProfile } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState('business'); // business, profile, password

  // Business Profile States
  const [businessName, setBusinessName] = useState(user?.businessInfo?.name || '');
  const [businessPhone, setBusinessPhone] = useState(user?.businessInfo?.phone || '');
  const [businessAddress, setBusinessAddress] = useState(user?.businessInfo?.address || '');
  const [businessGstin, setBusinessGstin] = useState(user?.businessInfo?.gstin || '');

  // User Profile States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status indicators
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        businessInfo: {
          name: businessName,
          phone: businessPhone,
          address: businessAddress,
          gstin: businessGstin,
        },
      };

      const { data } = await api.put('/api/auth/me', payload);
      updateProfile(data);
      setSuccess('Profile & Business settings updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating settings.');
    }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Double check current password.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide">System Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your invoice headers, security profiles, and system behaviors.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Navigation Sidebar */}
        <div className="flex flex-col gap-2 rounded-2xl bg-slate-900/40 border border-slate-850 p-2 h-fit">
          {[
            { key: 'business', name: 'Business Information', icon: Building },
            { key: 'profile', name: 'User Profile', icon: User },
            { key: 'password', name: 'Change Password', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setError('');
                  setSuccess('');
                }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all text-left ${
                  activeTab === tab.key
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-450 hover:bg-slate-850/50 hover:text-white'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Form area */}
        <div className="md:col-span-3 glass rounded-3xl p-6 border border-slate-800/60 h-fit">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-semibold text-red-400">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-xs font-semibold text-green-400">
              <Check className="h-4.5 w-4.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Business Info Form */}
          {activeTab === 'business' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <h2 className="text-base font-bold text-white tracking-wide border-b border-slate-800/60 pb-3 mb-4">
                Configure Business Details
              </h2>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Business / Shop Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Vertex Trading Corporation"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    GSTIN Registration Number
                  </label>
                  <input
                    type="text"
                    value={businessGstin}
                    onChange={(e) => setBusinessGstin(e.target.value)}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Business Support Contact
                </label>
                <input
                  type="text"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Corporate / Billing Address
                </label>
                <textarea
                  rows="3"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="Billing street address, city, state, ZIP..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          )}

          {/* User Profile Form */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <h2 className="text-base font-bold text-white tracking-wide border-b border-slate-800/60 pb-3 mb-4">
                Owner Account Profile
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Admin Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}

          {/* Password Form */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h2 className="text-base font-bold text-white tracking-wide border-b border-slate-800/60 pb-3 mb-4">
                Secure Account Credentials
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Changing...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
