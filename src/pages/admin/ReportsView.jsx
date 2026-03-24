import { useState, useEffect } from 'react';
import { Calendar, DollarSign, FileText, Printer, Loader2, TrendingUp } from 'lucide-react';
import api from '../../api/axios'; // Adjust path if needed based on where you save this
import { toast } from 'react-toastify';

export default function ReportsView() {
  // Default to the current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const currentDay = today.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(currentDay);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = async (e) => {
    if (e) e.preventDefault();
    if (!fromDate || !toDate) return toast.warn('Please select both dates');
    if (new Date(fromDate) > new Date(toDate)) return toast.warn('From Date cannot be after To Date');

    setIsLoading(true);
    try {
      const response = await api.get('/bookings/report', {
        params: { fromDate, toDate }
      });
      setReportData(response.data.data);
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch report');
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically fetch report on first load for the current month
  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="bg-white shadow-sm rounded-lg border overflow-hidden p-6 print:p-0 print:border-none print:shadow-none">
      
      {/* Hide controls when printing */}
      <div className="print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={24} className="text-blue-600" /> Revenue & Booking Analytics
        </h2>

        <form onSubmit={fetchReport} className="flex flex-col sm:flex-row items-end gap-4 mb-8 bg-gray-50 p-4 rounded-lg border">
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">From Date</label>
            <input 
              type="date" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)} 
              className="w-full px-3 py-2 border rounded-md"
              required 
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">To Date</label>
            <input 
              type="date" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)} 
              className="w-full px-3 py-2 border rounded-md"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} 
            Generate Report
          </button>

          {reportData && (
             <button 
               type="button" 
               onClick={() => window.print()}
               className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-bold transition flex items-center justify-center gap-2 sm:ml-auto"
             >
               <Printer size={18} /> Print
             </button>
          )}
        </form>
      </div>

      {/* --- REPORT DISPLAY AREA --- */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-500">
          <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
          <p>Compiling data...</p>
        </div>
      ) : reportData ? (
        <div id="printable-report">
          {/* Print Header (Only visible on paper) */}
          <div className="hidden print:block text-center mb-6 border-b pb-4">
             <h1 className="text-2xl font-bold uppercase">Bhavan Booking Report</h1>
             <p className="text-gray-600">Period: {new Date(fromDate).toLocaleDateString('en-IN')} to {new Date(toDate).toLocaleDateString('en-IN')}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-bold text-sm uppercase tracking-wider mb-1">Total Bookings</p>
                <p className="text-4xl font-extrabold text-blue-900">{reportData.summary.totalBookings}</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full"><Calendar size={32} className="text-blue-700" /></div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-green-800 font-bold text-sm uppercase tracking-wider mb-1">Total Value</p>
                <p className="text-4xl font-extrabold text-green-900">₹{reportData.summary.totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
              </div>
              <div className="bg-green-200 p-3 rounded-full"><DollarSign size={32} className="text-green-700" /></div>
            </div>
          </div>

          {/* Data Table */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">Booking Ledger</h3>
            {reportData.bookings.length === 0 ? (
              <p className="text-gray-500 italic text-center py-8">No bookings found in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="p-3 font-bold text-gray-700">Ref ID</th>
                      <th className="p-3 font-bold text-gray-700">Booking Date</th>
                      <th className="p-3 font-bold text-gray-700">Status</th>
                      <th className="p-3 font-bold text-gray-700 text-right">Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.bookings.map((b) => (
                      <tr key={b.bookingId} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs text-gray-600">{b.bookingId.substring(0, 8).toUpperCase()}</td>
                        <td className="p-3">{new Date(b.bookingDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td className="p-3">
                           <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-gray-200 text-gray-800 uppercase">
                             {b.status.replace(/_/g, ' ')}
                           </span>
                        </td>
                        <td className="p-3 text-right font-semibold">₹{b.paymentAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
      
      {/* Global print styles for this component */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}