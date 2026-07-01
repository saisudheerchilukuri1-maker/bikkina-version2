import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { Search, Plus, BookOpen, Edit, Trash2, X } from 'lucide-react';

const PurchaseCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    gstNumber: '',
    notes: '',
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/purchase-companies');
      setCompanies(data);
      setFilteredCompanies(data);
      
      // Auto-trigger ledger redirect if query param is set
      const ledgerId = searchParams.get('ledger');
      if (ledgerId) {
        navigate(`/ledger/purchase/${ledgerId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchase companies.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, [searchParams]);

  useEffect(() => {
    const results = companies.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.gstNumber && c.gstNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCompanies(results);
  }, [searchTerm, companies]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAddModal = () => {
    setModalType('add');
    setFormData({ name: '', phone: '', address: '', gstNumber: '', notes: '' });
    setError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (company) => {
    setModalType('edit');
    setSelectedCompanyId(company._id);
    setFormData({
      name: company.name,
      phone: company.phone,
      address: company.address,
      gstNumber: company.gstNumber || '',
      notes: company.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (modalType === 'add') {
        await api.post('/api/purchase-companies', formData);
      } else {
        await api.put(`/api/purchase-companies/${selectedCompanyId}`, formData);
      }
      setShowModal(false);
      fetchCompanies();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving company.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company? All linked purchases must be deleted first.')) {
      try {
        await api.delete(`/api/purchase-companies/${id}`);
        fetchCompanies();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete company. Ensure no purchases/payments are linked.');
      }
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Purchase Companies</h1>
          <p className="text-sm text-slate-400 mt-1">Manage wholesale suppliers, purchase ledgers, and outstandings.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 active:scale-[0.98] transition-all"
        >
          <Plus className="h-5 w-5" />
          Add Supplier
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by company name, phone or GST..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900/40 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
        />
      </div>

      {/* Companies Table */}
      <div className="glass rounded-3xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No purchase companies found. Add a company to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/20 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Company Name</th>
                  <th className="py-4 px-6">Contact Info</th>
                  <th className="py-4 px-6 text-right">Total Purchased</th>
                  <th className="py-4 px-6 text-right">Total Paid</th>
                  <th className="py-4 px-6 text-right">Pending Balance</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {filteredCompanies.map((company) => (
                  <tr key={company._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white">{company.name}</div>
                      {company.gstNumber && (
                        <div className="text-xs text-indigo-400 font-semibold mt-0.5 uppercase tracking-wider">
                          GST: {company.gstNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-200">{company.phone}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{company.address}</div>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-slate-200">
                      {formatCurrency(company.totals.purchaseAmount)}
                      <div className="text-[10px] text-slate-400 font-medium">Qty: {company.totals.quantityPurchased}</div>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-green-400">
                      {formatCurrency(company.totals.paidAmount)}
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-red-400">
                      {formatCurrency(company.totals.pendingAmount)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => navigate(`/ledger/purchase/${company._id}`)}
                          title="Open Ledger"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"
                        >
                          <BookOpen className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(company)}
                          title="Edit"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(company._id)}
                          title="Delete"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
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
              {modalType === 'add' ? 'Add Supplier Company' : 'Edit Supplier Details'}
            </h2>

            {error && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Steel Supplier Inc"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 99999 88888"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  required
                  rows="2"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street name, City, State, ZIP..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Bank details, payment terms, or custom logs..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all resize-none"
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
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-95 transition-all"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseCompanies;
