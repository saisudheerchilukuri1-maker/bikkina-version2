import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, Calendar, User, Building } from 'lucide-react';

const Navbar = ({ setSidebarOpen }) => {
  const { user } = useAuth();

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800/60 bg-slate-900/65 px-4 md:px-8 backdrop-blur-md">
      {/* Left side: burger menu + business name */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {user && user.businessInfo && (
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Building className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-slate-100">
              {user.businessInfo.name || 'Bikkina Trades'}
            </span>
          </div>
        )}
      </div>

      {/* Right side: calendar date + profile pill */}
      <div className="flex items-center gap-6">
        <div className="hidden items-center gap-2 text-xs font-semibold text-slate-400 tracking-wide md:flex">
          <Calendar className="h-4 w-4 text-indigo-400" />
          <span>{formattedDate}</span>
        </div>

        {user && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-2">
            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-xs font-bold text-white shadow-md">
              {(user.name || 'Admin').charAt(0).toUpperCase()}
            </div>
            <div className="hidden flex-col items-start leading-tight sm:flex">
              <span className="text-xs font-bold text-white">{user.name || 'Admin'}</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Owner
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
