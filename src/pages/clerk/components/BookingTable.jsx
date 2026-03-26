import { Eye, LogIn, Clock, LogOut as LogOutIcon, FileText, CheckCircle } from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
};

export default function BookingTable({ bookings, isProcessing, handleVerify, openModal, setViewIdModal, onFetchInvoice }) {
  if (bookings.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center">
        <CheckCircle size={48} className="text-green-400 mb-4" />
        <p className="text-lg font-medium">No bookings found for this category.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b">
            <th className="p-4 font-medium">Ref ID</th>
            <th className="p-4 font-medium">Dates</th>
            <th className="p-4 font-medium">Details</th>
            <th className="p-4 font-medium">Financials</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-gray-100">
          {bookings.map((booking) => {
            const schedule = booking.schedule || {};
            const financials = booking.financials || {};
            const total = Number(financials.calculatedAmount) + Number(financials.securityDeposit);
            const paid = financials.paymentStatus === 'COMPLETED' ? total : (financials.paymentStatus === 'PARTIAL' ? Number(financials.advanceAmountRequested) : 0);

            // --- DATE LOCK LOGIC ---
            const checkInDate = new Date(schedule.startTime);
            const today = new Date();
            checkInDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);
            const isCheckInDay = today >= checkInDate;

            return(
              <tr key={booking.id} className="hover:bg-gray-50 transition">
                <td className="p-4 text-gray-900 font-mono text-xs">{booking.id.substring(0, 8).toUpperCase()}</td>
                <td className="p-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span className="text-green-700 font-medium">In: {formatDate(schedule.startTime)}</span>
                    <span className="text-red-700 font-medium">Out: {formatDate(schedule.endTime)}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-gray-900">{booking.eventType}</div>
                  <div className="text-gray-500 text-xs mt-1">{booking.guestCount} Guests</div>
                </td>
                <td className="p-4">
                  <div className="font-bold text-gray-900">Total: ₹{total ? total.toLocaleString('en-IN') : 0}</div>
                  <div className="text-green-600 font-medium text-xs mt-1">Paid: ₹{paid.toLocaleString('en-IN')}</div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full block w-max bg-gray-100 text-gray-800">
                    {booking.status.replace(/_/g, ' ')}
                  </span>
                </td>
                
                {/* ACTION COLUMN */}
                <td className="p-4">
                  <div className="flex flex-col gap-2">
                    
                    {/* STANDARD WORKFLOW BUTTONS */}
                    <div className="flex flex-wrap gap-2">
                      {booking.status === 'PENDING_CLERK_REVIEW' && (
                        <button onClick={() => handleVerify(booking.id)} disabled={isProcessing === booking.id} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs transition">Verify</button>
                      )}
                      
                      {booking.status === 'PENDING_ADVANCE_PAYMENT' && (
                        <button onClick={() => openModal('recordAdvance', booking)} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded text-xs transition shadow-sm">
                          Record Cash Advance
                        </button>
                      )}
                      
                      {booking.status === 'CHECKED_IN' && (
                        <button onClick={() => openModal('checkout', booking)} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1"><LogOutIcon size={14}/> Check-Out</button>
                      )}
                      
                      {booking.status === 'CHECKED_OUT' && (
                        <button onClick={() => onFetchInvoice(booking)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1"><FileText size={14}/> View Bill</button>
                      )}
                    </div>

                    {/* --- CONFIRMED BOOKING ACTIONS (Payment & Check-in) --- */}
                    {booking.status === 'CONFIRMED' && (
                      <div className="flex flex-col gap-2">
                        
                        {/* 1. Collect Remaining Cash (Available Anytime) */}
                        {financials.paymentStatus === 'PARTIAL' && (
                          <button 
                            onClick={() => openModal('recordRemaining', booking)} 
                            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold px-3 py-2 rounded text-xs transition border border-yellow-300 w-full text-center"
                          >
                            Collect Remaining Cash
                          </button>
                        )}

                        {/* 2. Check-In (Date Locked) */}
                        {isCheckInDay ? (
                          <button 
                            onClick={() => openModal('checkin', booking)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs flex items-center justify-center gap-1 shadow-sm transition w-full"
                          >
                            <LogIn size={14}/> Check-In Guest
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 font-semibold italic bg-gray-50 px-2 py-1.5 rounded border text-center w-full block">
                            Check-in unlocks on {new Date(schedule.startTime).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* KYC VIEW BUTTONS */}
                    {booking.verification?.aadharFrontImageUrl && (
                      <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
                        <button 
                          onClick={() => setViewIdModal(booking.verification.aadharFrontImageUrl)}
                          className="flex-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2 py-1.5 rounded border border-blue-200 flex items-center justify-center gap-1 transition"
                        >
                          <Eye size={12} /> Front ID
                        </button>
                        
                        {booking.verification?.aadharBackImageUrl && (
                          <button 
                            onClick={() => setViewIdModal(booking.verification.aadharBackImageUrl)}
                            className="flex-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2 py-1.5 rounded border border-blue-200 flex items-center justify-center gap-1 transition"
                          >
                            <Eye size={12} /> Back ID
                          </button>
                        )}
                      </div>
                    )}

                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
}