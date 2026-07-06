import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Printer,
  Download,
  Building2,
  TrendingDown,
  Info,
} from 'lucide-react';

const CompanyLedger = () => {
  const { type, id } = useParams(); // type: 'purchase' or 'sales', id: companyId
  const navigate = useNavigate();

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const printAreaRef = useRef();

  const fetchLedger = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint =
        type === 'purchase'
          ? `/api/purchase-companies/${id}/ledger`
          : `/api/sales-companies/${id}/ledger`;
      const { data } = await api.get(endpoint);
      setLedgerData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ledger records.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLedger();
  }, [type, id]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!ledgerData || !ledgerData.ledger) return;

    const headers = [
      'Date',
      'Transaction Type',
      'Invoice Number',
      'Description',
      'Debit (Dr)',
      'Credit (Cr)',
      'Running Balance',
      'Remarks',
    ];

    const rows = ledgerData.ledger.map((item) => [
      new Date(item.date).toLocaleDateString('en-IN'),
      item.type,
      item.invoiceNumber,
      item.description.replace(/,/g, ' '), // replace commas to prevent csv breaking
      item.debit,
      item.credit,
      item.runningBalance,
      (item.remarks || '').replace(/,/g, ' '),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodeUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodeUri);
    link.setAttribute(
      'download',
      `${ledgerData.company.name.replace(/\s+/g, '_')}_ledger.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !ledgerData) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-red-400 font-semibold">{error || 'Ledger data unavailable.'}</p>
        <button
          onClick={() => navigate(type === 'purchase' ? '/purchase-companies' : '/sales-companies')}
          className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-350 hover:text-white transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { company, ledger, totals } = ledgerData;

  return (
    <div className="space-y-6" ref={printAreaRef}>
      {/* Top Navigation bar */}
      <div className="flex items-center justify-between gap-4 no-print">
        <button
          onClick={() => navigate(type === 'purchase' ? '/purchase-companies' : '/sales-companies')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          Back to {type === 'purchase' ? 'Suppliers' : 'Customers'}
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-slate-850 bg-slate-900/40 hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:text-white"
          >
            <Printer className="h-4 w-4" />
            Print Ledger
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/10 transition-all"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Printable header info */}
      <div className="hidden print-only text-center mb-6">
        <h1 className="text-2xl font-bold text-black uppercase tracking-wider">Account Ledger</h1>
        <p className="text-sm text-slate-700">Company wise chronological transactions statement</p>
      </div>

      {/* Company details Section */}
      <div className="glass rounded-3xl p-6 border border-slate-800/60 print:border-black print:text-black">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 shrink-0 print:border print:border-indigo-500/20">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white print:text-black tracking-wide">
                  {company.name}
                </h2>
                <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 print:text-slate-700">
                  <span>Type:</span>
                  <span className={type === 'purchase' ? 'text-indigo-400' : 'text-green-400'}>
                    {type === 'purchase' ? 'Supplier / Purchase' : 'Customer / Sales'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-300 print:text-black">
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                <span>{company.phone}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4.5 w-4.5 text-slate-500 mt-0.5 shrink-0" />
                <span>{company.address}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 border-t border-slate-800/60 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6 border-slate-850">
            {company.gstNumber && (
              <div className="text-sm">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-slate-700">
                  GST Number
                </span>
                <span className="font-semibold text-indigo-400 uppercase">{company.gstNumber}</span>
              </div>
            )}
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-slate-700">
                Business Notes
              </span>
              <p className="text-sm text-slate-300 print:text-black italic bg-slate-950/20 print:bg-transparent rounded-xl p-3 border border-slate-800/40 print:border-none">
                {company.notes || 'No specific terms or logs recorded.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <div className="glass rounded-2xl p-5 print:border print:border-slate-300 print:text-black">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {type === 'purchase' ? 'Total Purchased' : 'Total Sales'}
          </span>
          <h3 className="text-xl font-bold mt-1 text-white print:text-black">
            {formatCurrency(type === 'purchase' ? totals.totalPurchase : totals.totalSales)}
          </h3>
        </div>

        <div className="glass rounded-2xl p-5 print:border print:border-slate-300 print:text-black">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {type === 'purchase' ? 'Total Paid' : 'Total Received'}
          </span>
          <h3 className="text-xl font-bold mt-1 text-green-400 print:text-black">
            {formatCurrency(type === 'purchase' ? totals.totalPaid : totals.totalReceived)}
          </h3>
        </div>

        <div className="glass rounded-2xl p-5 print:border print:border-slate-300 print:text-black">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Outstanding Balance
          </span>
          <h3 className="text-xl font-extrabold mt-1 text-red-400 print:text-black">
            {formatCurrency(totals.outstandingBalance)}
          </h3>
        </div>

        {type === 'purchase' && (
          <div className="glass rounded-2xl p-5 print:border print:border-slate-300 print:text-black">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Stock In Hand (Rods/Bags)
            </span>
            <h3 className="text-xl font-bold mt-1 text-indigo-400 print:text-black">
              {totals.remainingQuantity} <span className="text-xs font-normal text-slate-400">rem.</span>
              <span className="text-xs font-normal text-slate-500 ml-1.5">/ {totals.quantityPurchased} purchased</span>
            </h3>
          </div>
        )}
      </div>

      {/* Ledger statement table */}
      <div className="glass rounded-3xl overflow-hidden print:border print:border-slate-300">
        <div className="border-b border-slate-800/60 bg-slate-900/10 py-4 px-6 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-white">Chronological Transaction Log</h3>
          </div>
          <span className="text-xs text-slate-400">Sorted oldest to newest (FIFO running balance)</span>
        </div>

        {ledger.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No transactions found for this company ledger yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse print:text-black">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/20 text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-slate-800 print:border-black">
                  <th className="py-4 px-5">Date</th>
                  <th className="py-4 px-4">Invoice #</th>
                  <th className="py-4 px-5">Description</th>
                  <th className="py-4 px-4 text-right">Debit (Dr)</th>
                  <th className="py-4 px-4 text-right">Credit (Cr)</th>
                  <th className="py-4 px-5 text-right">Running Balance</th>
                  <th className="py-4 px-4 no-print">Remarks</th>
                  <th className="py-4 px-4 text-center no-print">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm print:divide-slate-300">
                {ledger.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-900/10 transition-colors hover:print:bg-transparent">
                    <td className="py-4 px-5 whitespace-nowrap text-slate-300 print:text-black">
                      {new Date(item.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-300 print:text-black">{item.invoiceNumber}</td>
                    <td className="py-4 px-5 max-w-xs truncate text-slate-200 print:text-black" title={item.description}>
                      {item.description}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-red-400 print:text-black">
                      {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-green-400 print:text-black">
                      {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                    </td>
                    <td className="py-4 px-5 text-right font-bold text-slate-200 print:text-black">
                      {formatCurrency(item.runningBalance)}
                    </td>
                    <td className="py-4 px-4 text-slate-400 italic max-w-xs truncate no-print" title={item.remarks}>
                      {item.remarks || '-'}
                    </td>
                    <td className="py-4 px-4 text-center no-print">
                      {item.attachment ? (
                        <a
                          href={item.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded bg-indigo-500/10 hover:bg-indigo-500 hover:text-white px-2.5 py-1 text-xs font-semibold text-indigo-400 transition-all"
                        >
                          View Link
                        </a>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Accounting guide info footer */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 p-4 text-xs text-indigo-300 max-w-2xl no-print">
        <Info className="h-4.5 w-4.5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Understanding Ledger Debit / Credit Principles:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-400">
            <li>For <span className="text-white font-medium">Suppliers</span>: Purchases increase what you owe (Credited), Payments decrease what you owe (Debited).</li>
            <li>For <span className="text-white font-medium">Customers</span>: Sales increase what they owe you (Debited), Payments decrease what they owe you (Credited).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CompanyLedger;
