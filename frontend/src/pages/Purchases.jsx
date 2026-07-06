import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, Plus, Edit, Trash2, X, Calendar, DollarSign, Archive } from 'lucide-react';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);
  
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    purchaseCompany: '',
    productName: '',
    quantity: '',
    rate: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const resPurchases = await api.get('/api/purchases');
      setPurchases(resPurchases.data);
      setFilteredPurchases(resPurchases.data);

      const resCompanies = await api.get('/api/purchase-companies');
      setCompanies(resCompanies.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchase records.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  useEffect(() => {
    const results = purchases.filter(
      (p) =>
        p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.purchaseCompany?.name &&
          p.purchaseCompany.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredPurchases(results);
  }, [searchTerm, purchases]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAddModal = () => {
    setModalType('add');
    setFormData({
      invoiceNumber: '',
      purchaseCompany: '',
      productName: '',
      quantity: '',
      rate: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (p) => {
    setModalType('edit');
    setSelectedPurchaseId(p._id);
    setFormData({
      invoiceNumber: p.invoiceNumber,
      purchaseCompany: p.purchaseCompany?._id || '',
      productName: p.productName,
      quantity: p.quantity,
      rate: p.rate,
      date: p.date ? new Date(p.date).toISOString().split('T')[0] : '',
      notes: p.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const submitData = {
      ...formData,
      quantity: Number(formData.quantity),
      rate: Number(formData.rate),
    };

    try {
      if (modalType === 'add') {
        await api.post('/api/purchases', submitData);
      } else {
        await api.put(`/api/purchases/${selectedPurchaseId}`, submitData);
      }
      setShowModal(false);
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record purchase.');
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        'Are you sure you want to delete this purchase? This will revert supplier ledger totals and stock in hand.'
      )
    ) {
      try {
        await api.delete(`/api/purchases/${id}`);
        fetchPurchases();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete purchase. Ensure no items have been sold from this invoice.');
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

  // Compute live Total Amount in form
  const calculatedTotal = (Number(formData.quantity) || 0) * (Number(formData.rate) || 0);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Purchase Invoices</h1>
          <p className="text-sm text-slate-400 mt-1">Record incoming stock, purchase transactions, and supplier liabilities.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:opacity-95 active:scale-[0.98] transition-all"
        >
          <Plus className="h-5 w-5" />
          Log Purchase Invoice
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
          placeholder="Search by invoice number, product or supplier..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900/40 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
        />
      </div>

      {/* Purchases Table */}
      <div className="glass rounded-3xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No purchase records found. Record a purchase to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/20 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Invoice details</th>
                  <th className="py-4 px-6">Supplier</th>
                  <th className="py-4 px-6">Product details</th>
                  <th className="py-4 px-6 text-right">Invoice value</th>
                  <th className="py-4 px-6 text-center">Payment Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {filteredPurchases.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white">{p.invoiceNumber}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(p.date).toLocaleDateString('en-IN')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-200">
                      {p.purchaseCompany?.name || 'Unknown supplier'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-200">{p.productName}</div>
                      <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold mt-1">
                        <Archive className="h-3.5 w-3.5 shrink-0" />
                        <span>Stock Rem: {p.remainingQuantity} / {p.quantity}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="font-bold text-white">{formatCurrency(p.totalAmount)}</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">Rate: {formatCurrency(p.rate)}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          p.paymentStatus === 'Paid'
                            ? 'bg-green-500/10 text-green-400'
                            : p.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-350 hover:bg-slate-700 hover:text-white transition-all"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p._id)}
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
              {modalType === 'add' ? 'Log Purchase Invoice' : 'Update Purchase Details'}
            </h2>

            {error && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    required
                    disabled={modalType === 'edit'}
                    value={formData.invoiceNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. PUR-001"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Supplier Company <span className="text-red-500">*</span>
                </label>
                <select
                  name="purchaseCompany"
                  required
                  disabled={modalType === 'edit'}
                  value={formData.purchaseCompany}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                >
                  <option value="">Select Supplier</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="productName"
                  required
                  value={formData.productName}
                  onChange={handleInputChange}
                  placeholder="e.g. Cement Bags, Steel Bars..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    placeholder="e.g. 100"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Rate per Unit (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="rate"
                    required
                    min="0"
                    value={formData.rate}
                    onChange={handleInputChange}
                    placeholder="e.g. 450"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Total calculation indicator */}
              <div className="flex items-center justify-between rounded-xl bg-slate-950/40 p-4 border border-slate-800/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Total Amount</span>
                <span className="text-base font-extrabold text-white">{formatCurrency(calculatedTotal)}</span>
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
                  placeholder="Payment details, credit period, cargo info..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all resize-none"
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
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-95 transition-all"
                >
                  Record Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
