import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Receipt, 
  Package, 
  RefreshCw, 
  Scale, 
  FileSpreadsheet, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { dataService } from '../lib/dataService';
import { formatINR, generateFinancialReportPDF } from '../lib/pdfGenerator';
import { exportFinancialReportToExcel } from '../lib/excelExporter';
import { Shop } from '../types/database';

interface ReportsProps {
  shop: Shop | null;
}

export const Reports: React.FC<ReportsProps> = ({ shop }) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly' | 'compare'>('monthly');
  const [loading, setLoading] = useState(true);

  // Daily report date
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState<any>(null);

  // Monthly report selection
  const curYear = new Date().getFullYear();
  const curMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState<number>(curMonth);
  const [selectedYear, setSelectedYear] = useState<number>(curYear);
  const [monthlyData, setMonthlyData] = useState<any>(null);

  // Yearly report
  const [yearlyData, setYearlyData] = useState<any[]>([]);

  // Month Comparison
  const [compareMonthA, setCompareMonthA] = useState<number>(curMonth);
  const [compareYearA, setCompareYearA] = useState<number>(curYear);
  const [dataA, setDataA] = useState<any>(null);

  const [compareMonthB, setCompareMonthB] = useState<number>(curMonth === 0 ? 11 : curMonth - 1);
  const [compareYearB, setCompareYearB] = useState<number>(curMonth === 0 ? curYear - 1 : curYear);
  const [dataB, setDataB] = useState<any>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const loadDaily = async () => {
    setLoading(true);
    try {
      const data = await dataService.getDailyReport(selectedDay);
      setDailyData(data);
    } catch (err) {
      console.error('Error fetching daily report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthly = async () => {
    setLoading(true);
    try {
      const data = await dataService.getMonthlyFinancialReport(selectedYear, selectedMonth);
      setMonthlyData(data);
    } catch (err) {
      console.error('Error fetching monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadYearly = async () => {
    setLoading(true);
    try {
      const monthsList = [];
      for (let m = 0; m < 12; m++) {
        const mRep = await dataService.getMonthlyFinancialReport(selectedYear, m);
        monthsList.push({
          month: monthNames[m].substring(0, 3),
          sales: mRep.total_sales,
          expenses: mRep.total_expenses,
          cogs: mRep.cogs,
          grossProfit: mRep.gross_profit,
          netProfit: mRep.net_profit,
        });
      }
      setYearlyData(monthsList);
    } catch (err) {
      console.error('Error fetching yearly report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompare = async () => {
    setLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        dataService.getMonthlyFinancialReport(compareYearA, compareMonthA),
        dataService.getMonthlyFinancialReport(compareYearB, compareMonthB),
      ]);
      setDataA(resA);
      setDataB(resB);
    } catch (err) {
      console.error('Error comparing months:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === 'daily') loadDaily();
    else if (reportType === 'monthly') loadMonthly();
    else if (reportType === 'yearly') loadYearly();
    else if (reportType === 'compare') loadCompare();
  }, [reportType, selectedDay, selectedMonth, selectedYear, compareMonthA, compareYearA, compareMonthB, compareYearB]);

  const handleExportPDF = () => {
    if (!shop) return;
    const rep = reportType === 'monthly' ? monthlyData : (reportType === 'daily' ? dailyData : {
      title: `${selectedYear} Yearly Performance`,
      total_sales: yearlyData.reduce((s, it) => s + it.sales, 0),
      total_bills: 0,
      total_items_sold: 0,
      cogs: yearlyData.reduce((s, it) => s + it.cogs, 0),
      gross_profit: yearlyData.reduce((s, it) => s + it.grossProfit, 0),
      total_expenses: yearlyData.reduce((s, it) => s + it.expenses, 0),
      net_profit: yearlyData.reduce((s, it) => s + it.netProfit, 0),
    });

    const doc = generateFinancialReportPDF(rep, shop);
    doc.save(`Stationery_Report_${reportType.toUpperCase()}.pdf`);
  };

  const handleExportExcel = () => {
    const rep = reportType === 'monthly' ? monthlyData : (reportType === 'daily' ? dailyData : {
      title: `${selectedYear} Yearly Performance`,
      total_sales: yearlyData.reduce((s, it) => s + it.sales, 0),
      total_bills: 0,
      total_items_sold: 0,
      cogs: yearlyData.reduce((s, it) => s + it.cogs, 0),
      gross_profit: yearlyData.reduce((s, it) => s + it.grossProfit, 0),
      total_expenses: yearlyData.reduce((s, it) => s + it.expenses, 0),
      net_profit: yearlyData.reduce((s, it) => s + it.netProfit, 0),
    });

    exportFinancialReportToExcel(rep, `Stationery_${reportType}_Report.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Financial & Managerial Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade reporting distinguishing Cost of Goods Sold (COGS), Gross Margin and Net Operating Profits.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shadow-xs"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector Pill */}
      <div className="flex items-center space-x-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs max-w-xl text-xs font-semibold">
        <button
          onClick={() => setReportType('daily')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            reportType === 'daily' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Daily Report
        </button>
        <button
          onClick={() => setReportType('monthly')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            reportType === 'monthly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Monthly P&L
        </button>
        <button
          onClick={() => setReportType('yearly')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            reportType === 'yearly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Yearly Statement
        </button>
        <button
          onClick={() => setReportType('compare')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            reportType === 'compare' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Compare Months
        </button>
      </div>

      {/* FILTER BAR FOR DATE / MONTH / YEAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        {reportType === 'daily' && (
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Select Date:</span>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-hidden"
            />
          </div>
        )}

        {reportType === 'monthly' && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-hidden"
              >
                {monthNames.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-hidden"
              >
                {[curYear - 1, curYear, curYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {reportType === 'yearly' && (
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Financial Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-hidden"
            >
              {[curYear - 2, curYear - 1, curYear].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {reportType === 'compare' && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-blue-700">Month A:</span>
              <select
                value={compareMonthA}
                onChange={(e) => setCompareMonthA(parseInt(e.target.value))}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
              >
                {monthNames.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
              </select>
              <select
                value={compareYearA}
                onChange={(e) => setCompareYearA(parseInt(e.target.value))}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
              >
                {[curYear - 1, curYear].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <span className="text-slate-400 font-bold">VS</span>

            <div className="flex items-center space-x-2">
              <span className="font-bold text-indigo-700">Month B:</span>
              <select
                value={compareMonthB}
                onChange={(e) => setCompareMonthB(parseInt(e.target.value))}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
              >
                {monthNames.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
              </select>
              <select
                value={compareYearB}
                onChange={(e) => setCompareYearB(parseInt(e.target.value))}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
              >
                {[curYear - 1, curYear].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-500 font-mono">
          * Calculated strictly from actual ledger transactions
        </div>
      </div>

      {/* REPORT CONTENT BODY */}
      {reportType === 'daily' && dailyData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-500">Day Total Sales</span>
              <h3 className="text-2xl font-extrabold text-blue-700 mt-1">{formatINR(dailyData.totalSales)}</h3>
              <p className="text-xs text-slate-500 mt-1">{dailyData.totalBills} Bills Generated</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-500">Units Dispatched</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{dailyData.totalItemsSold} Items</h3>
              <p className="text-xs text-slate-500 mt-1">Across all stationery categories</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-500">Total Discounts Given</span>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{formatINR(dailyData.totalDiscounts)}</h3>
              <p className="text-xs text-slate-500 mt-1">Special item & counter discounts</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-500">GST Collected</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{formatINR(dailyData.totalTax)}</h3>
              <p className="text-xs text-slate-500 mt-1">CGST & SGST payable</p>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Payment Methods Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold uppercase">Cash</span>
                <p className="text-base font-extrabold text-slate-900 mt-1">{formatINR(dailyData.paymentBreakdown.cash || 0)}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold uppercase">UPI / QR</span>
                <p className="text-base font-extrabold text-slate-900 mt-1">{formatINR(dailyData.paymentBreakdown.upi || 0)}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold uppercase">Card</span>
                <p className="text-base font-extrabold text-slate-900 mt-1">{formatINR(dailyData.paymentBreakdown.card || 0)}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold uppercase">Split</span>
                <p className="text-base font-extrabold text-slate-900 mt-1">{formatINR(dailyData.paymentBreakdown.split || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportType === 'monthly' && monthlyData && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-500">Gross Sales Revenue</span>
              <h3 className="text-2xl font-extrabold text-blue-700 mt-1">{formatINR(monthlyData.total_sales)}</h3>
              <p className="text-xs text-slate-500 mt-1">{monthlyData.total_bills} Total Customer Bills</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-500">Cost of Goods Sold (COGS)</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{formatINR(monthlyData.cogs)}</h3>
              <p className="text-xs text-slate-500 mt-1">Exact purchase price of sold stock</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-500">Gross Trading Profit</span>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{formatINR(monthlyData.gross_profit)}</h3>
              <p className="text-xs text-slate-500 mt-1">Sales minus COGS</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-500">ESTIMATED NET PROFIT</span>
              <h3 className={`text-2xl font-extrabold mt-1 ${monthlyData.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatINR(monthlyData.net_profit)}
              </h3>
              <p className="text-xs text-slate-500 mt-1">After deducting shop rent & expenses</p>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-800">
              Profit & Loss Statement for {monthNames[selectedMonth]} {selectedYear}
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              <div className="p-3.5 flex justify-between font-bold text-slate-800 bg-slate-50">
                <span>Revenue From Operations (Sales)</span>
                <span>{formatINR(monthlyData.total_sales)}</span>
              </div>
              <div className="p-3.5 flex justify-between text-slate-600 pl-8">
                <span>Less: Cost of Goods Sold (COGS)</span>
                <span>- {formatINR(monthlyData.cogs)}</span>
              </div>
              <div className="p-3.5 flex justify-between font-extrabold text-blue-800 bg-blue-50/50">
                <span>GROSS PROFIT</span>
                <span>{formatINR(monthlyData.gross_profit)}</span>
              </div>
              <div className="p-3.5 flex justify-between text-slate-600 pl-8">
                <span>Less: Operating Expenses (Rent, EB, Staff, Transport)</span>
                <span>- {formatINR(monthlyData.total_expenses)}</span>
              </div>
              <div className="p-4 flex justify-between font-extrabold text-base text-emerald-700 bg-emerald-50/60">
                <span>NET PROFIT FOR THE PERIOD</span>
                <span>{formatINR(monthlyData.net_profit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportType === 'yearly' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-4">
              Annual Month-wise Performance Comparison ({selectedYear})
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    formatter={(val: any) => [`₹${val}`, '']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="Sales Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netProfit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {reportType === 'compare' && dataA && dataB && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Month A */}
            <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-xs space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="font-bold text-sm text-blue-700">
                  {monthNames[compareMonthA]} {compareYearA}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                  Period A
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-slate-600">Sales:</span><span className="font-bold">{formatINR(dataA.total_sales)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">COGS:</span><span className="font-bold">{formatINR(dataA.cogs)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Gross Margin:</span><span className="font-bold text-blue-600">{formatINR(dataA.gross_profit)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Expenses:</span><span className="font-bold text-red-600">{formatINR(dataA.total_expenses)}</span></div>
                <div className="flex justify-between font-extrabold text-sm pt-2 border-t border-slate-100"><span className="text-slate-800">Net Profit:</span><span className="text-emerald-600">{formatINR(dataA.net_profit)}</span></div>
              </div>
            </div>

            {/* Month B */}
            <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-xs space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="font-bold text-sm text-indigo-700">
                  {monthNames[compareMonthB]} {compareYearB}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                  Period B
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-slate-600">Sales:</span><span className="font-bold">{formatINR(dataB.total_sales)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">COGS:</span><span className="font-bold">{formatINR(dataB.cogs)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Gross Margin:</span><span className="font-bold text-blue-600">{formatINR(dataB.gross_profit)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Expenses:</span><span className="font-bold text-red-600">{formatINR(dataB.total_expenses)}</span></div>
                <div className="flex justify-between font-extrabold text-sm pt-2 border-t border-slate-100"><span className="text-slate-800">Net Profit:</span><span className="text-emerald-600">{formatINR(dataB.net_profit)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

