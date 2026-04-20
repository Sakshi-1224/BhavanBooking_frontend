import React from 'react';
import { X, User, Phone, Mail, Calendar, Clock, CreditCard, ShieldCheck, Home, Info, CheckCircle, AlertCircle } from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
};

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING_CLERK_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PENDING_ADMIN_APPROVAL: 'bg-orange-100 text-orange-800 border-orange-200',
    PENDING_ADVANCE_PAYMENT: 'bg-blue-100 text-blue-800 border-blue-200',
    AWAITING_CASH_PAYMENT: 'bg-purple-100 text-purple-800 border-purple-200',
    CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
    CHECKED_IN: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    CHECKED_OUT: 'bg-teal-100 text-teal-800 border-teal-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${styles[status] || styles.CANCELLED}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

export default function BookingDetailsModal({ booking, onClose }) {
  if (!booking) return null;

  const base = Number(booking.financials?.calculatedAmount || 0);
  const deposit = Number(booking.financials?.securityDeposit || 0);
  const advance = Number(booking.financials?.advanceAmountRequested || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
              Booking Details <StatusBadge status={booking.status} />
            </h2>
            <p className="text-sm text-gray-500 mt-1 font-mono">Ref ID: {booking.id}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Top Row: User & Facility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Card */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User size={16}/> Customer Information</h3>
              <div className="space-y-3">
                <p className="flex items-center gap-3 text-gray-800"><span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={18}/></span> <span className="font-bold text-lg">{booking.user?.fullName || 'N/A'}</span></p>
                <p className="flex items-center gap-3 text-gray-600"><span className="p-2 bg-green-50 text-green-600 rounded-lg"><Phone size={18}/></span> <span>{booking.user?.phone || 'N/A'}</span></p>
                <p className="flex items-center gap-3 text-gray-600"><span className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Mail size={18}/></span> <span>{booking.user?.email || 'No email provided'}</span></p>
              </div>
            </div>

            {/* Facility Card */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Home size={16}/> Facility Requested</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0"><Home size={18}/></span>
                  <div>
                    <p className="font-bold text-lg text-gray-800">{booking.facility?.name}</p>
                    <p className="text-sm text-gray-500">{booking.facility?.facilityType} • {booking.eventType} Event</p>
                    <p className="text-sm font-medium text-blue-600 mt-1">{booking.guestCount} Expected Guests</p>
                  </div>
                </div>
                
                {booking.customDetails && booking.customDetails.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Custom Selections:</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {booking.customDetails.map((item, idx) => (
                        <li key={idx} className="flex justify-between bg-gray-50 p-1.5 rounded">
                          <span>{item.name}</span> <span className="font-bold text-gray-900">x{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle Row: Schedule & KYC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Schedule Card */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Calendar size={16}/> Schedule</h3>
              <div className="relative pl-6 border-l-2 border-gray-100 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[31px] bg-green-100 p-1 rounded-full border-4 border-white"><Clock size={14} className="text-green-600"/></div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Check-In</p>
                  <p className="font-bold text-gray-900">{formatDate(booking.schedule?.startTime)}</p>
                  {booking.schedule?.actualCheckInTime && <p className="text-xs text-green-600 mt-1 font-semibold flex items-center gap-1"><CheckCircle size={12}/> Arrived: {formatDate(booking.schedule.actualCheckInTime)}</p>}
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] bg-red-100 p-1 rounded-full border-4 border-white"><Clock size={14} className="text-red-600"/></div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Check-Out</p>
                  <p className="font-bold text-gray-900">{formatDate(booking.schedule?.endTime)}</p>
                </div>
              </div>
            </div>

            {/* Financials Card */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                Financial Summary
              </h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Base Quote (Rent):</span>
                  <span className="font-bold text-gray-900">₹{base.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-orange-600 border-b border-gray-200 pb-3">
                  <span>Security Deposit (Pay at Check-in):</span>
                  <span className="font-bold">₹{deposit.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="flex justify-between font-bold text-gray-900 pt-1 text-lg">
                  <span>Amount Payable Now:</span>
                  <span className="text-blue-700">₹{base.toLocaleString('en-IN')}</span>
                </div>

                {/* 🚨 DISCLAIMER NOTE 🚨 */}
                <div className="mt-3 bg-orange-100/50 p-3 rounded border border-orange-200">
                  <p className="text-xs text-orange-800 font-medium leading-tight">
                    * Note: The refundable security deposit of <strong className="font-bold">₹{deposit.toLocaleString('en-IN')}</strong> is not included in the online payment. It will be collected separately at the time of check-in at the desk.
                  </p>
                </div>

                {/* ADVANCE & PAYMENT INFO */}
                {advance > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Advance Required:</span>
                      <span>₹{advance.toLocaleString('en-IN')}</span>
                    </div>
                    
                    {/* Show Amount Paid if they have actually paid it */}
                    {booking.financials?.paymentStatus !== 'PENDING' && (
                      <div className="flex justify-between items-center text-green-700 font-bold bg-green-100/50 p-2.5 rounded-lg border border-green-200">
                        <span>Amount Paid Upfront:</span>
                        <span>₹{booking.financials?.paymentStatus === 'COMPLETED' ? 
                          base.toLocaleString('en-IN') : 
                          advance.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* CANCELLATION & REFUND BREAKDOWN */}
                {['PENDING_CANCELLATION', 'CANCELLED'].includes(booking.status) && (
                  <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                    <h5 className="font-extrabold text-red-800 text-xs uppercase tracking-wider flex items-center gap-1 border-b border-red-200 pb-2">
                      <AlertCircle size={14} /> Cancellation Settlement
                    </h5>
                    
                    <div className="flex justify-between text-red-700 text-sm font-medium">
                      <span>Cancellation Fee (Retained by Bhavan):</span>
                      <span>₹{(advance - Number(booking.financials?.refundAmount || 0)).toLocaleString('en-IN')}</span>
                    </div>
                    
                    <div className="flex justify-between text-green-700 font-bold text-base bg-white p-3 rounded-lg border border-green-200 mt-2 shadow-sm">
                      <span>Refund Eligible Amount:</span>
                      <span>₹{Number(booking.financials?.refundAmount || 0).toLocaleString('en-IN')}</span>
                    </div>

                    {/* STATUS OF THE REFUND */}
                    <div className="pt-2 text-right">
                      {booking.financials?.refundAmount > 0 ? (
                        booking.financials?.paymentStatus === 'REFUNDED' ? (
                          <span className="text-green-600 text-xs font-bold flex items-center justify-end gap-1 bg-green-100 px-2 py-1 rounded inline-flex">
                            <CheckCircle size={14}/> REFUND COMPLETED
                          </span>
                        ) : (
                          <span className="text-orange-600 text-xs font-bold flex items-center justify-end gap-1 bg-orange-100 px-2 py-1 rounded inline-flex">
                            <Clock size={14}/> REFUND PENDING APPROVAL
                          </span>
                        )
                      ) : (
                        <span className="text-gray-500 text-xs font-bold bg-gray-200 px-2 py-1 rounded inline-flex">
                          NO REFUND APPLICABLE
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
        
      </div>
    </div>
  );
}