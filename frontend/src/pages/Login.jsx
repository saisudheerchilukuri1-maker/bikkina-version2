import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { login, updateProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (isLogin) {
      const res = await login(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message);
      }
    } else {
      // Register logic
      try {
        const { data } = await api.post('/api/auth/register', {
          name,
          email,
          password,
        });
        
        // Auto update profile (which logs in the user)
        updateProfile(data);
        setSuccessMsg('Account created successfully! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } catch (err) {
        setError(err.response?.data?.message || 'Registration failed. Try again.');
      }
    }
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      // Check if admin user exists, if not seed it first
      try {
        await api.post('/api/auth/register', {
          name: 'Demo Admin',
          email: 'admin@erp.com',
          password: 'password123',
          businessInfo: {
            name: 'Bikkina Trades',
            phone: '+91 99999 88888',
            address: 'Main Road, Kakinada, Andhra Pradesh, India',
            gstin: '37AAAAA1111A1Z0',
          },
        });
      } catch (e) {
        // user already exists, ignore
      }

      const res = await login('admin@erp.com', 'password123');
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Demo login setup failed.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"></div>

      <div className="w-full max-w-md glass rounded-3xl p-8 relative z-10 shadow-2xl">
        <div className="flex flex-col items-center pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            {isLogin ? 'Access Bikkina Trades ERP dashboard' : 'Setup your professional ledger accounts'}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-medium text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-medium text-emerald-400">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Mail className="h-4.5 w-4.5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="font-semibold text-indigo-400 hover:text-indigo-300"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        {/* Demo login option */}
        {isLogin && (
          <div className="mt-6 border-t border-slate-800/60 pt-5">
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full rounded-xl border border-dashed border-indigo-500/30 hover:border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10 py-3 text-xs font-semibold text-indigo-400 tracking-wide transition-all"
            >
              Sign In with Demo Account (admin@erp.com / password123)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
