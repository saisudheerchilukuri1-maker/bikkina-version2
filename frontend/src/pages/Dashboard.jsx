import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  TrendingUp,
  ShoppingBag,
  BadgeDollarSign,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Building2,
  Building,
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading dashboard statistics.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-red-400 font-semibold">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { metrics, recentTransactions, topCompanies } = data || {};

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const cards = [
    {
      title: "Today's Purchases",
      value: formatCurrency(metrics.todayPurchases),
      gradient: "from-blue-600 to-indigo-600 shadow-blue-500/10",
      icon: ShoppingBag,
    },
    {
      title: "Today's Sales",
      value: formatCurrency(metrics.todaySales),
      gradient: "from-green-600 to-teal-600 shadow-teal-500/10",
      icon: BadgeDollarSign,
    },
    {
      title: "Today's Expenses",
      value: formatCurrency(metrics.todayExpenses),
      gradient: "from-red-600 to-pink-600 shadow-pink-500/10",
      icon: Wallet,
    },
    {
      title: "Outstanding Payables",
      value: formatCurrency(metrics.outstandingPayables),
      gradient: "from-amber-600 to-orange-600 shadow-orange-500/10",
      icon: ArrowDownLeft,
    },
    {
      title: "Outstanding Receivables",
      value: formatCurrency(metrics.outstandingReceivables),
      gradient: "from-violet-600 to-purple-600 shadow-purple-500/10",
      icon: ArrowUpRight,
    },
    {
      title: "Total Net Profit",
      value: formatCurrency(metrics.netProfit),
      gradient: "from-emerald-600 to-cyan-600 shadow-emerald-500/10",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title & Refresh */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time overview of your trading accounts & stock levels.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 self-start rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Grid Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-tr ${card.gradient} p-6 text-white shadow-lg`}
            >
              {/* Background abstract decoration */}
              <div className="absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-white/10 blur-xl"></div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                  {card.title}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  {card.value}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lower Sections */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Transactions (Span 2) */}
        <div className="lg:col-span-2 glass rounded-3xl p-6">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4">
            <h2 className="text-lg font-bold text-white tracking-wide">Recent Transactions</h2>
            <Link to="/reports" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2">Type</th>
                  <th className="py-3 px-2">Party/Category</th>
                  <th className="py-3 px-2">Date</th>
                  <th className="py-3 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500">
                      No recent transactions found. Create invoices or payments to see records.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx, idx) => {
                    const isCredit = ['Purchase', 'Payment Paid', 'Expense'].includes(tx.type);
                    return (
                      <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3.5 px-2">
                          <span
                            className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${
                              tx.type === 'Sale'
                                ? 'bg-green-500/10 text-green-400'
                                : tx.type === 'Purchase'
                                ? 'bg-blue-500/10 text-blue-400'
                                : tx.type.startsWith('Payment')
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 font-medium text-slate-200">{tx.party}</td>
                        <td className="py-3.5 px-2 text-xs text-slate-400">
                          {new Date(tx.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className={`py-3.5 px-2 text-right font-semibold ${isCredit ? 'text-red-400' : 'text-green-400'}`}>
                          {isCredit ? '-' : '+'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Companies */}
        <div className="space-y-6">
          {/* Top Purchase Companies */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Building2 className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-wide">Top Suppliers</h2>
            </div>
            
            <div className="space-y-3.5">
              {topCompanies.purchases.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-2">No suppliers registered.</p>
              ) : (
                topCompanies.purchases.map((comp) => (
                  <div key={comp._id} className="flex items-center justify-between text-sm">
                    <Link to={`/purchase-companies?ledger=${comp._id}`} className="font-medium text-slate-300 hover:text-indigo-400 transition-colors">
                      {comp.name}
                    </Link>
                    <span className="font-semibold text-slate-200">{formatCurrency(comp.totals.purchaseAmount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Sales Companies */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-400">
                <Building className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-wide">Top Customers</h2>
            </div>

            <div className="space-y-3.5">
              {topCompanies.sales.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-2">No customers registered.</p>
              ) : (
                topCompanies.sales.map((comp) => (
                  <div key={comp._id} className="flex items-center justify-between text-sm">
                    <Link to={`/sales-companies?ledger=${comp._id}`} className="font-medium text-slate-300 hover:text-green-400 transition-colors">
                      {comp.name}
                    </Link>
                    <span className="font-semibold text-slate-200">{formatCurrency(comp.totals.salesAmount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
