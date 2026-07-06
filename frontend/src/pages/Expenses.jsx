import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, Plus, Trash2, X, Calendar } from 'lucide-react';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Rent',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const categories = [
    'Rent',
    'Salary',
    'Electricity / Utility',
    'Logistics / Transport',
    'Office Supplies',
    'Marketing',
    'Taxes / Licensing',
    'Miscellaneous',
  ];

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/expenses');
      setExpenses(data);
      setFilteredExpenses(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load expenses database.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    const results = expenses.filter(
      (e) =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredExpenses(results);
  }, [searchTerm, expenses]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAddModal = () => {
    setFormData({
      title: '',
      amount: '',
      category: 'Rent',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/expenses', {
        ...formData,
        amount: Number(formData.amount),
      });
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log expense.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense? This cannot be undone.')) {
      try {
        await api.delete(`/api/expenses/${id}`);
        fetchExpenses();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete expense.');
      }
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const totalExpenseSum = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Business Expenses</h1>
          <p className="text-sm text-slate-400 mt-1">Track operating costs, rent, employee salaries, and overheads.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 hover:opacity-95 active:scale-[0.98] transition-all"
        >
          <Plus className="h-5 w-5" />
          Log Expense
        </button>
      </div>

      {/* Stats summary & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title or category..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/40 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
          />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 px-5 py-3.5 flex items-center justify-between min-w-[200px]">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filtered Total</span>
          <span className="text-lg font-bold text-red-400">{formatCurrency(totalExpenseSum)}</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass rounded-3xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No expense records logged.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/20 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Expense Title</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Expense Date</th>
                  <th className="py-4 px-6">Description / Notes</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {filteredExpenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-white">{exp.title}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-slate-350">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span>{new Date(exp.date).toLocaleDateString('en-IN')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-400 italic max-w-xs truncate" title={exp.notes}>
                      {exp.notes || '-'}
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-base text-red-400">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDelete(exp._id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all mx-auto"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass rounded-3xl p-6 relative shadow-2xl border border-slate-800 animate-scale-up">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold text-white tracking-wide mb-6">
              Record Operating Expense
            </h2>

            {error && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Expense Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Rent for warehouse B"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-red-500 transition-all"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Date Paid <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-red-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Amount Paid (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="e.g. 15000"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Description / Notes
                </label>
                <textarea
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Paid to land-lord, bank transaction number..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500 transition-all resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-850 hover:bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-350 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-red-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-95 transition-all"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
