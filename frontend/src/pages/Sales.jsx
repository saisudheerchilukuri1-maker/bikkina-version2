import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, Plus, Edit, Trash2, X, Calendar, AlertCircle } from 'lucide-react';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [purchases, setPurchases] = useState([]); // List of purchases for stock linking
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [selectedSaleId, setSelectedSaleId] = useState(null);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    salesCompany: '',
    purchaseInvoice: '', // Links to Purchase Invoice ObjectId
    productName: '',
    quantity: '',
    rate: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const resSales = await api.get('/api/sales');
      setSales(resSales.data);
      setFilteredSales(resSales.data);

      const resCustomers = await api.get('/api/sales-companies');
      setCustomers(resCustomers.data);

      // Fetch purchases where remaining quantity is greater than 0
      const resPurchases = await api.get('/api/purchases');
      setPurchases(resPurchases.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sales database.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  useEffect(() => {
    const results = sales.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.salesCompany?.name && s.salesCompany.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredSales(results);
  }, [searchTerm, sales]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // If user selects a purchase invoice in form, auto-fill product name
      if (name === 'purchaseInvoice' && value) {
        const linkedPurchase = purchases.find((p) => p._id === value);
        if (linkedPurchase) {
          updated.productName = linkedPurchase.productName;
        }
      }
      return updated;
    });
  };

  const handleOpenAddModal = () => {
    setModalType('add');
    setFormData({
      invoiceNumber: '',
      salesCompany: '',
      purchaseInvoice: '',
      productName: '',
      quantity: '',
      rate: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (s) => {
    setModalType('edit');
    setSelectedSaleId(s._id);
    setFormData({
      invoiceNumber: s.invoiceNumber,
      salesCompany: s.salesCompany?._id || '',
      purchaseInvoice: s.purchaseInvoice?._id || '',
      productName: s.productName,
      quantity: s.quantity,
      rate: s.rate,
      date: s.date ? new Date(s.date).toISOString().split('T')[0] : '',
      notes: s.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const quantityToSell = Number(formData.quantity);
    const selectedPurchase = purchases.find((p) => p._id === formData.purchaseInvoice);

    if (modalType === 'add' && selectedPurchase && selectedPurchase.remainingQuantity < quantityToSell) {
      setError(`Over-selling restricted! Only ${selectedPurchase.remainingQuantity} units remain in Purchase Invoice ${selectedPurchase.invoiceNumber}.`);
      return;
    }

    if (modalType === 'edit' && selectedPurchase) {
      // Find the original sale quantity to compute difference correctly
      const originalSale = sales.find((s) => s._id === selectedSaleId);
      const originalQty = originalSale ? originalSale.quantity : 0;
      const extraRequired = quantityToSell - originalQty;

      if (selectedPurchase.remainingQuantity < extraRequired) {
        setError(`Over-selling restricted! Only ${selectedPurchase.remainingQuantity} additional units remain in Purchase Invoice. Max allowed quantity for this edit: ${originalQty + selectedPurchase.remainingQuantity}`);
        return;
      }
    }

    const submitData = {
      ...formData,
      quantity: quantityToSell,
      rate: Number(formData.rate),
    };

    try {
      if (modalType === 'add') {
        await api.post('/api/sales', submitData);
      } else {
        await api.put(`/api/sales/${selectedSaleId}`, submitData);
      }
      setShowModal(false);
      fetchSalesData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record sale invoice.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this sale? This will restore the stock levels and revert outstanding balances.')) {
      try {
        await api.delete(`/api/sales/${id}`);
        fetchSalesData();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete sale.');
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

  const calculatedTotal = (Number(formData.quantity) || 0) * (Number(formData.rate) || 0);
  
  // Find current selected purchase invoice for live stock checks in form
  const selectedPurchaseObj = purchases.find((p) => p._id === formData.purchaseInvoice);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Sales Invoices</h1>
          <p className="text-sm text-slate-400 mt-1">Record outgoing sales, stock deductions, and customer receivables.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 hover:opacity-95 active:scale-[0.98] transition-all"
        >
          <Plus className="h-5 w-5" />
          Log Sales Invoice
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
          placeholder="Search by invoice number, product or customer..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900/40 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-all"
        />
      </div>

      {/* Sales Table */}
      <div className="glass rounded-3xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No sales records found. Log a sale to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/20 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Invoice details</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Product & Linked Purchase</th>
                  <th className="py-4 px-6 text-right">Invoice value</th>
                  <th className="py-4 px-6 text-center">Payment Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {filteredSales.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white">{s.invoiceNumber}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(s.date).toLocaleDateString('en-IN')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-200">
                      {s.salesCompany?.name || 'Unknown Customer'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-200">{s.productName}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Qty Sold: <span className="font-bold text-green-400">{s.quantity}</span>
                        <span className="text-slate-500 mx-1.5">|</span>
                        <span>Pur Invoice: {s.purchaseInvoice?.invoiceNumber || '-'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="font-bold text-white">{formatCurrency(s.totalAmount)}</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">Rate: {formatCurrency(s.rate)}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          s.paymentStatus === 'Paid'
                            ? 'bg-green-500/10 text-green-400'
                            : s.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {s.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-350 hover:bg-slate-700 hover:text-white transition-all"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
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
              {modalType === 'add' ? 'Log Sales Invoice' : 'Update Sales Details'}
            </h2>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-semibold text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
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
                    placeholder="e.g. SAL-001"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500 transition-all disabled:opacity-50"
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
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-green-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Customer Company <span className="text-red-500">*</span>
                </label>
                <select
                  name="salesCompany"
                  required
                  disabled={modalType === 'edit'}
                  value={formData.salesCompany}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-green-500 transition-all"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Link to Purchase stock (MANDATORY) <span className="text-red-500">*</span>
                </label>
                <select
                  name="purchaseInvoice"
                  required
                  disabled={modalType === 'edit'}
                  value={formData.purchaseInvoice}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-green-500 transition-all"
                >
                  <option value="">Select Stock Source Invoice</option>
                  {purchases
                    .filter((p) => p.remainingQuantity > 0 || (modalType === 'edit' && p._id === formData.purchaseInvoice))
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.invoiceNumber} - {p.productName} ({p.remainingQuantity} units left)
                      </option>
                    ))}
                </select>
              </div>

              {selectedPurchaseObj && (
                <div className="rounded-xl bg-indigo-500/5 p-4 border border-indigo-500/10 text-xs text-indigo-300 space-y-1">
                  <div className="font-semibold uppercase tracking-wider text-[10px]">Stock Ledger Verification:</div>
                  <div className="flex justify-between">
                    <span>Original Purchased Quantity:</span>
                    <span className="font-bold text-white">{selectedPurchaseObj.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Remaining Stock:</span>
                    <span className="font-extrabold text-green-400">{selectedPurchaseObj.remainingQuantity}</span>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Quantity to Sell <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    placeholder="e.g. 30"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Selling Rate per Unit (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="rate"
                    required
                    min="0"
                    value={formData.rate}
                    onChange={handleInputChange}
                    placeholder="e.g. 600"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500 transition-all"
                  />
                </div>
              </div>

              {/* Total calculations */}
              <div className="flex items-center justify-between rounded-xl bg-slate-950/40 p-4 border border-slate-800/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Sales Value</span>
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
                  placeholder="Delivery terms, vehicle details, consignee..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500 transition-all resize-none"
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
                  className="rounded-xl bg-gradient-to-r from-green-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-95 transition-all"
                >
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
