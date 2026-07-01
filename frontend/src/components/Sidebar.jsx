import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid,
  Building2,
  Building,
  ShoppingBag,
  BadgeDollarSign,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  X,
  TrendingUp,
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutGrid },
    { name: 'Purchase Companies', path: '/purchase-companies', icon: Building2 },
    { name: 'Sales Companies', path: '/sales-companies', icon: Building },
    { name: 'Purchases', path: '/purchases', icon: ShoppingBag },
    { name: 'Sales', path: '/sales', icon: BadgeDollarSign },
    { name: 'Payments', path: '/payments', icon: Receipt },
    { name: 'Expenses', path: '/expenses', icon: Wallet },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLinkClick = () => {
    if (isOpen) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800/60 bg-slate-900/95 p-5 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">Bikkina Trades</h1>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest glow-text">Enterprise ERP</span>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-850 bg-slate-950 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/10 to-violet-600/10 border-l-4 border-indigo-500 text-indigo-400 font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      : 'text-slate-400 hover:bg-slate-850 hover:text-white border-l-4 border-transparent'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="pt-4 border-t border-slate-800/60">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
