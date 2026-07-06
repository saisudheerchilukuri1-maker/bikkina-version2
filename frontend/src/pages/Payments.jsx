import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, Plus, Trash2, X, Calendar, DollarSign, Image as ImageIcon } from 'lucide-react';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal & form states
  const [showModal, setShowModal] = useState(false);
  const [purchaseCompanies, setPurchaseCompanies] = useState([]);
  const [salesCompanies, setSalesCompanies] = useState([]);
  const [invoices, setInvoices] = useState([]); // List of outstanding invoices for selected company
  
  const [formData, setFormData] = useState({
    companyType: 'PurchaseCompany', // or 'SalesCompany'
    purchaseCompany: '',
    salesCompany: '',
    purchaseInvoice: '', // optional invoice link
    salesInvoice: '', // optional invoice link
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    notes: '',
    receiptImage: '',
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const resPayments = await api.get('/api/payments');
      setPayments(resPayments.data);
      setFilteredPayments(resPayments.data);

      const resSuppliers = await api.get('/api/purchase-companies');
      setPurchaseCompanies(resSuppliers.data);

      const resCustomers = await api.get('/api/sales-companies');
      setSalesCompanies(resCustomers.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments database.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    const results = payments.filter((p) => {
      const partyName =
        p.companyType === 'PurchaseCompany'
          ? p.purchaseCompany?.name
          : p.salesCompany?.name;
      return (
        p.paymentMode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (partyName && partyName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
    setFilteredPayments(results);
  }, [searchTerm, payments]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // If switching company type, clear selected companies and invoices
      if (name === 'companyType') {
        updated.purchaseCompany = '';
        updated.salesCompany = '';
        updated.purchaseInvoice = '';
        updated.salesInvoice = '';
        setInvoices([]);
      }

      return updated;
    });
  };

  // Fetch invoices when company changes in form
  useEffect(() => {
    const fetchCompanyInvoices = async () => {
      const compId =
        formData.companyType === 'PurchaseCompany'
          ? formData.purchaseCompany
          : formData.salesCompany;

      if (!compId) {
        setInvoices([]);
        return;
      }

      try {
        if (formData.companyType === 'PurchaseCompany') {
          const { data } = await api.get(`/api/purchase-companies/${compId}/ledger`);
          // Filter outstanding purchases
          const outstandingPurchases = data.ledger.filter(
            (item) => item.type === 'Purchase' && item.credit > item.debit
          );
          // Let's fetch actual Purchases list to check accurate pending amount
          const res = await api.get('/api/purchases');
          const companyPurchases = res.data.filter(
            (p) => p.purchaseCompany?._id === compId && p.paymentStatus !== 'Paid'
          );
          setInvoices(companyPurchases);
        } else {
          const res = await api.get('/api/sales');
          const companySales = res.data.filter(
            (s) => s.salesCompany?._id === compId && s.paymentStatus !== 'Paid'
          );
          setInvoices(companySales);
        }
      } catch (err) {
        console.error('Error fetching invoices for allocation:', err);
      }
    };

    fetchCompanyInvoices();
  }, [formData.purchaseCompany, formData.salesCompany, formData.companyType]);

  // Handle receipt image upload & base64 encoding
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, receiptImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const paymentVal = Number(formData.amount);

    // Validation checks
    if (formData.companyType === 'PurchaseCompany' && formData.purchaseInvoice) {
      const selectedInv = invoices.find((inv) => inv._id === formData.purchaseInvoice);
      if (selectedInv && paymentVal > selectedInv.pendingAmount) {
        setError(`Payment amount exceeds the selected invoice pending balance (${formatCurrency(selectedInv.pendingAmount)}).`);
        return;
      }
    } else if (formData.companyType === 'SalesCompany' && formData.salesInvoice) {
      const selectedInv = invoices.find((inv) => inv._id === formData.salesInvoice);
      if (selectedInv && paymentVal > selectedInv.pendingAmount) {
        setError(`Receipt amount exceeds the selected invoice pending balance (${formatCurrency(selectedInv.pendingAmount)}).`);
        return;
      }
    }

    const payload = {
      companyType: formData.companyType,
      amount: paymentVal,
      paymentDate: formData.paymentDate,
      paymentMode: formData.paymentMode,
      notes: formData.notes,
      receiptImage: formData.receiptImage,
    };

    if (formData.companyType === 'PurchaseCompany') {
      payload.purchaseCompany = formData.purchaseCompany;
      if (formData.purchaseInvoice) payload.purchaseInvoice = formData.purchaseInvoice;
    } else {
      payload.salesCompany = formData.salesCompany;
      if (formData.salesInvoice) payload.salesInvoice = formData.salesInvoice;
    }

    try {
      await api.post('/api/payments', payload);
      setShowModal(false);
      fetchPayments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit payment.');
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        'Warning! Deleting this payment will revert all invoice allocations and outstanding balances. Are you sure?'
      )
    ) {
      try {
        await api.delete(`/api/payments/${id}`);
        fetchPayments();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to revert payment.');
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

  const handleViewReceipt = (receiptBase64) => {
    if (!receiptBase64) return;
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`
        <html>
          <head>
            <title>Receipt Preview</title>
            <style>
              body {
                margin: 0;
                background: #0b0f19;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: white;
              }
              img {
                max-width: 90%;
                max-height: 80%;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1);
              }
              .container {
                text-align: center;
              }
              a {
                display: inline-block;
                margin-top: 20px;
                background: #6366f1;
                color: white;
                text-decoration: none;
                font-size: 13px;
                font-weight: bold;
                padding: 10px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
                transition: background 0.2s;
              }
              a:hover {
                background: #4f46e5;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${receiptBase64}" alt="Receipt Upload" />
              <br/>
              <a href="${receiptBase64}" download="payment_receipt">Download Image</a>
            </div>
          </body>
        </html>
      `);
      newTab.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Payments Ledger</h1>
          <p className="text-sm text-slate-400 mt-1">Record supplier payouts, customer receipts, and settle ledgers.</p>
        </div>
        <button
          onClick={() => {
            setError('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 hover:opacity-95 active:scale-[0.98] transition-all"
        >
          <Plus className="h-5 w-5" />
          Record Transaction
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
          placeholder="Search by company or payment mode..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900/40 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
        />
      </div>

      {/* Payments Table */}
      <div className="glass rounded-3xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No payment transactions logged.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/20 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Payment Date</th>
                  <th className="py-4 px-6">Company / Type</th>
                  <th className="py-4 px-6">Settlement Allocation</th>
                  <th className="py-4 px-6">Payment Mode</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6 text-center">Receipt</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {filteredPayments.map((p) => {
                  const partyName =
                    p.companyType === 'PurchaseCompany'
                      ? p.purchaseCompany?.name
                      : p.salesCompany?.name;
                  const isDebit = p.companyType === 'PurchaseCompany';
                  return (
                    <tr key={p._id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap text-slate-300">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{partyName || 'Unknown company'}</div>
                        <span
                          className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase mt-1 ${
                            isDebit
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-green-500/10 text-green-400'
                          }`}
                        >
                          {isDebit ? 'Payout (Supplier)' : 'Receipt (Customer)'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-350 font-medium">
                        {p.purchaseInvoice
                          ? `Invoice: ${p.purchaseInvoice.invoiceNumber}`
                          : p.salesInvoice
                          ? `Invoice: ${p.salesInvoice.invoiceNumber}`
                          : p.allocations?.length > 0
                          ? `FIFO settled (${p.allocations.length} invoices)`
                          : 'General Advance'}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-200">{p.paymentMode}</td>
                      <td
                        className={`py-4 px-6 text-right font-extrabold text-base ${
                          isDebit ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {isDebit ? '-' : '+'}{formatCurrency(p.amount)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {p.receiptImage ? (
                          <button
                            onClick={() => handleViewReceipt(p.receiptImage)}
                            type="button"
                            className="inline-flex rounded bg-indigo-500/10 hover:bg-indigo-500 hover:text-white px-2.5 py-1 text-xs font-semibold text-indigo-400 transition-all"
                          >
                            Show Attachment
                          </button>
                        ) : (
                          <span className="text-slate-655">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleDelete(p._id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all mx-auto"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
              Record Payment Transaction
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
                    Account Type
                  </label>
                  <select
                    name="companyType"
                    value={formData.companyType}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-amber-500 transition-all"
                  >
                    <option value="PurchaseCompany">Supplier Payout (Dr)</option>
                    <option value="SalesCompany">Customer Receipt (Cr)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Transaction Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    required
                    value={formData.paymentDate}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Select Business Party <span className="text-red-500">*</span>
                </label>
                {formData.companyType === 'PurchaseCompany' ? (
                  <select
                    name="purchaseCompany"
                    required
                    value={formData.purchaseCompany}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-amber-500 transition-all"
                  >
                    <option value="">Choose Supplier</option>
                    {purchaseCompanies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} (Pending: {formatCurrency(c.totals.pendingAmount)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    name="salesCompany"
                    required
                    value={formData.salesCompany}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-amber-500 transition-all"
                  >
                    <option value="">Choose Customer</option>
                    {salesCompanies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} (Pending: {formatCurrency(c.totals.pendingAmount)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Settle Specific Invoice dropdown */}
              {(formData.purchaseCompany || formData.salesCompany) && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Allocate to Specific Invoice (Optional)
                  </label>
                  {formData.companyType === 'PurchaseCompany' ? (
                    <select
                      name="purchaseInvoice"
                      value={formData.purchaseInvoice}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-amber-500 transition-all"
                    >
                      <option value="">FIFO Auto-allocation (Recommended)</option>
                      {invoices.map((inv) => (
                        <option key={inv._id} value={inv._id}>
                          {inv.invoiceNumber} - Pending: {formatCurrency(inv.pendingAmount)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      name="salesInvoice"
                      value={formData.salesInvoice}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-amber-500 transition-all"
                    >
                      <option value="">FIFO Auto-allocation (Recommended)</option>
                      {invoices.map((inv) => (
                        <option key={inv._id} value={inv._id}>
                          {inv.invoiceNumber} - Pending: {formatCurrency(inv.pendingAmount)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Amount to Pay (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0.01"
                    step="any"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="e.g. 5000"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white outline-none focus:border-amber-500 transition-all"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Account</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Receipt Attachment (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 py-3.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-all">
                    <ImageIcon className="h-4.5 w-4.5" />
                    <span>Upload Image Receipt</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.receiptImage && (
                    <div className="relative h-11 w-11 rounded-lg overflow-hidden border border-slate-800 shrink-0">
                      <img src={formData.receiptImage} alt="Receipt preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, receiptImage: '' })}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 text-red-400 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
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
                  placeholder="UTR number, Cheque date, bank transfer reference..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-all resize-none"
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
                  className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-95 transition-all"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
