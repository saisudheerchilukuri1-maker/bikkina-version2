import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  FileText,
  Search,
  Calendar,
  Printer,
  Download,
  Filter,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Building,
} from 'lucide-react';

const Reports = () => {
  const [reportType, setReportType] = useState('purchases'); // purchases, sales, expenses, outstandings, profits
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [companyId, setCompanyId] = useState('');
  
  // Data lists for filters
  const [purchaseCompanies, setPurchaseCompanies] = useState([]);
  const [salesCompanies, setSalesCompanies] = useState([]);

  // Report Results
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load companies for the filter dropdown
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const suppliers = await api.get('/api/purchase-companies');
        setPurchaseCompanies(suppliers.data);

        const customers = await api.get('/api/sales-companies');
        setSalesCompanies(customers.data);
      } catch (err) {
        console.error('Error loading filter dropdowns:', err);
      }
    };
    loadFilterData();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        type: reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        invoiceNumber: invoiceNumber || undefined,
        companyId: companyId || undefined,
      };

      const { data } = await api.get('/api/reports', { params });
      setReportData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error generating report.');
    }
    setLoading(false);
  };

  useEffect(() => {
    setCompanyId(''); // clear selected company on report type switch
    setReportData([]);
  }, [reportType]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    let headers = [];
    let rows = [];
    let filename = `${reportType}_report.csv`;

    if (reportType === 'purchases') {
      headers = ['Date', 'Invoice Number', 'Supplier', 'Product', 'Quantity', 'Rate', 'Total Value', 'Status'];
      rows = reportData.map((p) => [
        new Date(p.date).toLocaleDateString('en-IN'),
        p.invoiceNumber,
        p.purchaseCompany?.name || 'Unknown',
        p.productName,
        p.quantity,
        p.rate,
        p.totalAmount,
        p.paymentStatus,
      ]);
    } else if (reportType === 'sales') {
      headers = ['Date', 'Invoice Number', 'Customer', 'Product', 'Quantity', 'Rate', 'Total Value', 'Status'];
      rows = reportData.map((s) => [
        new Date(s.date).toLocaleDateString('en-IN'),
        s.invoiceNumber,
        s.salesCompany?.name || 'Unknown',
        s.productName,
        s.quantity,
        s.rate,
        s.totalAmount,
        s.paymentStatus,
      ]);
    } else if (reportType === 'expenses') {
      headers = ['Date', 'Expense Title', 'Category', 'Description', 'Amount'];
      rows = reportData.map((e) => [
        new Date(e.date).toLocaleDateString('en-IN'),
        e.title,
        e.category,
        e.notes || '',
        e.amount,
      ]);
    } else if (reportType === 'outstandings') {
      headers = ['Party Name', 'Party Type', 'Contact Phone', 'Outstanding Balance'];
      const payables = reportData.payables || [];
      const receivables = reportData.receivables || [];
      rows = [
        ...payables.map((p) => [p.companyName, 'Supplier (Payable)', p.phone, p.amount]),
        ...receivables.map((r) => [r.companyName, 'Customer (Receivable)', r.phone, r.amount]),
      ];
    } else if (reportType === 'profits') {
      headers = ['Metric Category', 'Financial Value'];
      rows = [
        ['Total Sales Revenue', reportData.totalRevenue || 0],
        ['Cost of Goods Sold (COGS)', reportData.totalCOGS || 0],
        ['Gross Trading Profit', reportData.grossProfit || 0],
        ['Operating Expenses', reportData.totalExpenses || 0],
        ['Net Cash Profit', reportData.netProfit || 0],
      ];
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodeUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodeUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center no-print">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Report Generator</h1>
          <p className="text-sm text-slate-400 mt-1">Export company outstandings, trading profit logs, and custom tax registers.</p>
        </div>

        {reportData && (
          <div className="flex items-center gap-3 self-start">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl border border-slate-850 bg-slate-900/40 hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-350 hover:text-white transition-all"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-xl bg-indigo-650 hover:bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/10 transition-all"
            >
              <Download className="h-4 w-4" />
              Excel (CSV)
            </button>
          </div>
        )}
      </div>

      {/* Reports Segment Switcher */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-900/40 border border-slate-850 p-1.5 max-w-3xl no-print">
        {[
          { key: 'purchases', name: 'Purchases' },
          { key: 'sales', name: 'Sales' },
          { key: 'expenses', name: 'Expenses' },
          { key: 'outstandings', name: 'Outstandings' },
          { key: 'profits', name: 'Profit Statement' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setReportType(tab.key)}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              reportType === tab.key
                ? 'bg-slate-800 text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Printable Report Header */}
      <div className="hidden print-only text-center mb-6">
        <h1 className="text-2xl font-bold text-black uppercase tracking-widest">bikkina trades audit report</h1>
        <h2 className="text-base font-bold text-slate-700 uppercase tracking-wider mt-1">{reportType} report statement</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Generated on: {new Date().toLocaleDateString('en-IN')}
          {startDate && ` | Period: ${startDate}`} {endDate && ` to ${endDate}`}
        </p>
      </div>

      {/* Filters Control Panel */}
      <div className="glass rounded-3xl p-6 border border-slate-800/60 no-print">
        <div className="flex items-center gap-2 border-b border-slate-800/40 pb-3.5 mb-5 text-indigo-400">
          <Filter className="h-4.5 w-4.5" />
          <span className="text-xs font-bold uppercase tracking-wider">Report Filters</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Start Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Calendar className="h-4 w-4" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              End Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Calendar className="h-4 w-4" />
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Conditional dropdown based on type */}
          {['purchases', 'sales'].includes(reportType) && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Filter by Company
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-2.5 px-3 text-xs text-white outline-none focus:border-indigo-500 transition-all"
              >
                <option value="">All Companies</option>
                {reportType === 'purchases'
                  ? purchaseCompanies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))
                  : salesCompanies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
              </select>
            </div>
          )}

          {/* Conditional invoice search input */}
          {['purchases', 'sales'].includes(reportType) && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Invoice Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. PUR-001"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/20 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex items-end mt-4 sm:mt-0">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full rounded-xl bg-indigo-650 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/10 transition-all"
            >
              {loading ? 'Compiling...' : 'Fetch Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Report results statement render */}
      <div className="glass rounded-3xl overflow-hidden print:border print:border-slate-300">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : reportData.length === 0 && !reportData.payables && !reportData.netProfit ? (
          <div className="text-center py-12 text-slate-500 no-print">
            Click 'Fetch Report' to retrieve statements.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Purchase / Sales Report Table */}
            {['purchases', 'sales'].includes(reportType) && (
              <table className="w-full text-left border-collapse print:text-black">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/20 text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-slate-800 print:border-black">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Invoice #</th>
                    <th className="py-4 px-6">{reportType === 'purchases' ? 'Supplier' : 'Customer'}</th>
                    <th className="py-4 px-6">Product</th>
                    <th className="py-4 px-6 text-right">Quantity</th>
                    <th className="py-4 px-6 text-right">Rate</th>
                    <th className="py-4 px-6 text-right">Total Amount</th>
                    <th className="py-4 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm print:divide-slate-350">
                  {reportData.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-900/10">
                      <td className="py-4 px-6 text-slate-300 print:text-black">
                        {new Date(row.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-4 px-6 font-bold text-white print:text-black">{row.invoiceNumber}</td>
                      <td className="py-4 px-6 font-semibold text-slate-200 print:text-black">
                        {reportType === 'purchases'
                          ? row.purchaseCompany?.name
                          : row.salesCompany?.name}
                      </td>
                      <td className="py-4 px-6 text-slate-300 print:text-black">{row.productName}</td>
                      <td className="py-4 px-6 text-right font-medium text-slate-200 print:text-black">{row.quantity}</td>
                      <td className="py-4 px-6 text-right text-slate-400 print:text-black">{formatCurrency(row.rate)}</td>
                      <td className="py-4 px-6 text-right font-bold text-white print:text-black">{formatCurrency(row.totalAmount)}</td>
                      <td className="py-4 px-6 text-center">
                        <span className="print:text-black font-bold uppercase text-xs">{row.paymentStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Expenses Report Table */}
            {reportType === 'expenses' && (
              <table className="w-full text-left border-collapse print:text-black">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/20 text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-slate-800 print:border-black">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Title</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Notes</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm print:divide-slate-350">
                  {reportData.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-900/10">
                      <td className="py-4 px-6 text-slate-300 print:text-black">
                        {new Date(row.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-4 px-6 font-bold text-white print:text-black">{row.title}</td>
                      <td className="py-4 px-6 text-slate-200 print:text-black">{row.category}</td>
                      <td className="py-4 px-6 text-slate-400 italic print:text-black">{row.notes || '-'}</td>
                      <td className="py-4 px-6 text-right font-extrabold text-red-400 print:text-black">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Outstanding Statement Table */}
            {reportType === 'outstandings' && (
              <div className="grid gap-6 p-6 md:grid-cols-2 print:grid-cols-2">
                <div>
                  <h3 className="text-base font-bold text-red-400 tracking-wide border-b border-slate-800 pb-2 mb-3 flex items-center gap-1.5 uppercase">
                    <ArrowDownLeft className="h-4.5 w-4.5" /> Outstandings Payable (Suppliers)
                  </h3>
                  <div className="space-y-3">
                    {reportData.payables?.length === 0 ? (
                      <p className="text-slate-500 text-xs py-4 text-center">No payables outstanding.</p>
                    ) : (
                      reportData.payables?.map((comp) => (
                        <div key={comp._id} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-850/40">
                          <div>
                            <span className="font-semibold text-slate-200 print:text-black block">{comp.companyName}</span>
                            <span className="text-[10px] text-slate-400 font-medium print:text-slate-650">Ph: {comp.phone}</span>
                          </div>
                          <span className="font-bold text-red-400 print:text-black">{formatCurrency(comp.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-green-400 tracking-wide border-b border-slate-800 pb-2 mb-3 flex items-center gap-1.5 uppercase">
                    <ArrowUpRight className="h-4.5 w-4.5" /> Outstandings Receivable (Customers)
                  </h3>
                  <div className="space-y-3">
                    {reportData.receivables?.length === 0 ? (
                      <p className="text-slate-500 text-xs py-4 text-center">No receivables outstanding.</p>
                    ) : (
                      reportData.receivables?.map((comp) => (
                        <div key={comp._id} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-850/40">
                          <div>
                            <span className="font-semibold text-slate-200 print:text-black block">{comp.companyName}</span>
                            <span className="text-[10px] text-slate-400 font-medium print:text-slate-650">Ph: {comp.phone}</span>
                          </div>
                          <span className="font-bold text-green-400 print:text-black">{formatCurrency(comp.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Profits Statement Panel */}
            {reportType === 'profits' && (
              <div className="p-6 max-w-xl mx-auto space-y-4 print:text-black">
                <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 mb-2">
                  <TrendingUp className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-bold text-white print:text-black uppercase tracking-wider">Audit Profit & Loss Statement</h3>
                </div>

                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                    <span className="text-slate-350 print:text-black font-medium">Gross Sales Revenue</span>
                    <span className="font-bold text-green-400 print:text-black">{formatCurrency(reportData.totalRevenue)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                    <span className="text-slate-350 print:text-black font-medium">Cost of Goods Sold (COGS)</span>
                    <span className="font-bold text-red-400 print:text-black">-{formatCurrency(reportData.totalCOGS)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800 bg-slate-900/20 px-3 rounded-lg print:bg-transparent">
                    <span className="text-white print:text-black font-semibold uppercase tracking-wider text-xs">Gross Trading Profit</span>
                    <span className="font-extrabold text-base text-indigo-400 print:text-black">{formatCurrency(reportData.grossProfit)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                    <span className="text-slate-350 print:text-black font-medium font-semibold">Less: Operating Expenses</span>
                    <span className="font-bold text-red-400 print:text-black">-{formatCurrency(reportData.totalExpenses)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-4 rounded-xl border border-emerald-500/10 print:bg-transparent print:border-black print:text-black">
                    <span className="text-emerald-400 print:text-black font-bold uppercase tracking-widest text-xs">Net Cash Profit</span>
                    <span className="font-black text-xl text-emerald-400 print:text-black">{formatCurrency(reportData.netProfit)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
