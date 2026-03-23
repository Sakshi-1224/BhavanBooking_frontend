import { useState, useEffect } from 'react';
import { CheckCircle, Clock, LogOut, X, LogIn, LogOut as LogOutIcon, UploadCloud, Loader2, AlertTriangle, FileText, Plus, Trash2, Eye } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import InvoicePrintView from '../../components/InvoicePrintView';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
};

export default function ClerkDashboard() {
  const [printModal, setPrintModal] = useState(null);
  const [viewIdModal, setViewIdModal] = useState(null); // <-- NEW STATE FOR ID VIEWER
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING_CLERK_REVIEW');
  const [isProcessing, setIsProcessing] = useState(null);
  
  const [modalType, setModalType] = useState(null); 
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [formData, setFormData] = useState({ 
    penalties: [], 
    additionalItems: [],
    additionalItemName: '',
    additionalItemAmount: '',
    penaltyReason: '',
    penaltyAmount: '',
    electricityUnitsConsumed: '',
    cleaningCharges: '',
    generatorCharges: '',
    discountAmount: ''
  });
  const [invoiceData, setInvoiceData] = useState(null);
  const [isFetchingInvoice, setIsFetchingInvoice] = useState(false);

  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/auth/admin/bookings');
      setBookings(response.data.data);
    } catch (error) { toast.error('Failed to load bookings.'); } 
    finally { setLoading(false); }
  };

  const handleVerify = async (bookingId) => {
    setIsProcessing(bookingId);
    try {
      await api.patch(`/auth/admin/bookings/${bookingId}/verify`);
      toast.success('Booking verified and sent to Admin!');
      fetchBookings();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to verify booking'); } 
    finally { setIsProcessing(null); }
  };

  const openModal = async (type, booking) => {
    setModalType(type);
    setSelectedBooking(booking);
    setInvoiceData(null);
    
    if (type === 'checkin') {
      setFormData({ idDocument: null, penalties: [], additionalItems: [], discountAmount: '' });
    } else if (type === 'checkout') {
      setIsFetchingInvoice(true);
      try {
        const response = await api.get(`/billing/${booking.id}/invoice`);
        const invoice = response.data.data.invoice;
        setInvoiceData(invoice);

        setFormData({
          electricityUnitsConsumed: invoice.electricityUnitsConsumed || '',
          cleaningCharges: invoice.cleaningCharges || '',
          generatorCharges: invoice.generatorCharges || '',
          penaltyReason: '', penaltyAmount: '',
          additionalItemName: '', additionalItemAmount: '',
          discountAmount: invoice.discountAmount || '',
          penalties: invoice.damagesAndPenalties || [],
          additionalItems: invoice.additionalItems || []
        });
      } catch (error) {
        setFormData({ 
          electricityUnitsConsumed: '', cleaningCharges: '', generatorCharges: '', 
          penaltyReason: '', penaltyAmount: '', additionalItemName: '', additionalItemAmount: '', discountAmount: '',
          penalties: [], additionalItems: [] 
        });
      } finally {
        setIsFetchingInvoice(false);
      }
    }
  };

  // --- Dynamic Form Handlers ---
  const handleAddPenalty = () => {
    if (formData.penaltyReason && formData.penaltyAmount) {
      setFormData(prev => ({
        ...prev,
        penalties: [...(prev.penalties || []), { reason: prev.penaltyReason, amount: Number(prev.penaltyAmount) }],
        penaltyReason: '', penaltyAmount: ''
      }));
    }
  };

  const handleAddExtraItem = () => {
    if (formData.additionalItemName && formData.additionalItemAmount) {
      setFormData(prev => ({
        ...prev,
        additionalItems: [...(prev.additionalItems || []), { name: prev.additionalItemName, amount: Number(prev.additionalItemAmount) }],
        additionalItemName: '', additionalItemAmount: ''
      }));
    }
  };

  const removeArrayItem = (key, index) => {
    setFormData(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));
  };

  // --- Live Preview Calculations ---
  let livePreview = null;
  if (modalType === 'checkout' && selectedBooking) {
    const base = Number(selectedBooking.financials?.calculatedAmount || 0);
    const deposit = Number(selectedBooking.financials?.securityDeposit || 0);
    
    const typedExtra = Number(formData.additionalItemAmount || 0);
    const totalExtras = (formData.additionalItems || []).reduce((sum, i) => sum + Number(i.amount), 0) + typedExtra;
    
    const discount = Number(formData.discountAmount || 0);
    const taxable = Math.max(0, base + totalExtras - discount);
    
    const taxes = taxable * 0.05; // 2.5% CGST + 2.5% SGST
    const totalInvoiceAmount = taxable + taxes;

    const electricity = Number(formData.electricityUnitsConsumed || 0) * 14;
    const cleaning = Number(formData.cleaningCharges || 0);
    const generator = Number(formData.generatorCharges || 0);
    
    const typedPenalty = Number(formData.penaltyAmount || 0);
    const totalPenalties = (formData.penalties || []).reduce((sum, p) => sum + Number(p.amount), 0) + typedPenalty;

    const totalDeductions = electricity + cleaning + generator + totalPenalties;
    
    const grandTotalCost = totalInvoiceAmount + totalDeductions;
    const totalPaid = base + deposit;
    const netDifference = totalPaid - grandTotalCost;
    
    livePreview = {
      base, totalExtras, discount, taxable, taxes, totalDeductions, grandTotalCost, totalPaid,
      refundDue: netDifference > 0 ? netDifference : 0,
      balanceDue: netDifference < 0 ? Math.abs(netDifference) : 0
    };
  }

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(selectedBooking.id);
    
    try {
      if (modalType === 'checkin') {
        const checkInForm = new FormData();
        if (!formData.idDocument) {
          setIsProcessing(null);
          return toast.warn("Please upload the guest's ID document.");
        }
        checkInForm.append('aadharImage', formData.idDocument); 

        await api.patch(`/bookings/${selectedBooking.id}/check-in`, checkInForm, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Check-in successful!');
        
      } else {
        let finalPenalties = [...(formData.penalties || [])];
        if (formData.penaltyReason && formData.penaltyAmount) {
          finalPenalties.push({ reason: formData.penaltyReason, amount: Number(formData.penaltyAmount) });
        }

        let finalExtras = [...(formData.additionalItems || [])];
        if (formData.additionalItemName && formData.additionalItemAmount) {
          finalExtras.push({ name: formData.additionalItemName, amount: Number(formData.additionalItemAmount) });
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); 

        const payload = {
          bookingId: selectedBooking.id, 
          dueDate: dueDate.toISOString(), 
          electricityUnitsConsumed: Number(formData.electricityUnitsConsumed || 0),
          cleaningCharges: Number(formData.cleaningCharges || 0),
          generatorCharges: Number(formData.generatorCharges || 0),
          damagesAndPenalties: finalPenalties,
          additionalItems: finalExtras,
          discountAmount: Number(formData.discountAmount || 0) 
        };
        
        await api.post(`/billing/draft-invoice`, payload);
        toast.success('Draft invoice submitted to Admin for approval!');
      }
      
      setModalType(null);
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to complete ${modalType}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.status);
    return b.status === activeTab;
  });

  if (loading) return <div className="p-20 text-center text-xl text-gray-500">Loading clerk workspace...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-green-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="font-bold text-xl tracking-wider">BhavanBook <span className="text-green-300">| Desk</span></div>
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:block">Clerk: {user?.fullName}</span>
            <button onClick={() => { logout(); navigate('/clerk/login'); }} className="flex items-center gap-1 hover:text-green-200 transition"><LogOut size={18} /> Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Booking Queue</h1>
          <div className="flex bg-white rounded-lg shadow-sm p-1 border overflow-x-auto">
            <button onClick={() => setActiveTab('PENDING_CLERK_REVIEW')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition ${activeTab === 'PENDING_CLERK_REVIEW' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-50'}`}>Needs Verification</button>
            <button onClick={() => setActiveTab('ACTIVE')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition ${activeTab === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}`}>Check-in / Out</button>
            <button onClick={() => setActiveTab('ALL')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition ${activeTab === 'ALL' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>All Bookings</button>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <CheckCircle size={48} className="text-green-400 mb-4" />
              <p className="text-lg font-medium">No bookings found for this category.</p>
            </div>
          ) : (
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
                  {filteredBookings.map((booking) => {
                    const schedule = booking.schedule || {};
                    const financials = booking.financials || {};
                    const total = Number(financials.calculatedAmount) + Number(financials.securityDeposit);
                    const paid = financials.paymentStatus === 'COMPLETED' ? total : (financials.paymentStatus === 'PARTIAL' ? Number(financials.advanceAmountRequested) : 0);

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
                        <td className="p-4"><span className={`px-2 py-1 text-xs font-bold rounded-full block w-max bg-gray-100 text-gray-800`}>{booking.status.replace(/_/g, ' ')}</span></td>
                        <td className="p-4 flex flex-wrap gap-2">
                          
                          {/* --- NEW VIEW ID BUTTON --- */}
                          {booking.verification?.aadharImageUrl && (
                            <button 
                              onClick={() => setViewIdModal(booking.verification.aadharImageUrl)} 
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1 shadow-sm transition"
                            >
                              <Eye size={14}/> View ID
                            </button>
                          )}

                          {booking.status === 'PENDING_CLERK_REVIEW' && (
                            <button onClick={() => handleVerify(booking.id)} disabled={isProcessing === booking.id} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs transition">Verify</button>
                          )}
                          
                          {booking.status === 'CONFIRMED' && (
                            financials.paymentStatus === 'COMPLETED' ? (
                              <button onClick={() => openModal('checkin', booking)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1"><LogIn size={14}/> Check-In</button>
                            ) : (
                              <button disabled className="bg-gray-300 text-gray-500 px-3 py-1.5 rounded text-xs flex items-center gap-1 cursor-not-allowed" title="User must pay balance before Check-In."><Clock size={14}/> Awaiting Payment</button>
                            )
                          )}

                          {booking.status === 'CHECKED_IN' && (
                            <button onClick={() => openModal('checkout', booking)} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1"><LogOutIcon size={14}/> Check-Out</button>
                          )}

                          {booking.status === 'CHECKED_OUT' && (
                            <button onClick={async () => {
                                try {
                                  const response = await api.get(`/billing/${booking.id}/invoice`);
                                  setPrintModal({ invoice: response.data.data.invoice, booking });
                                } catch(err) { toast.error("Invoice not found."); }
                              }} 
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1"><FileText size={14}/> View Bill</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DYNAMIC MODALS */}
      {modalType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl shadow-2xl p-6 w-full relative max-h-[90vh] overflow-y-auto ${modalType === 'checkout' ? 'max-w-4xl' : 'max-w-md'}`}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">{modalType === 'checkin' ? 'Guest Check-In' : 'Draft Final Invoice & Check-Out'}</h2>
            
            {modalType === 'checkout' && isFetchingInvoice ? (
               <div className="flex flex-col items-center justify-center py-12"><Loader2 className="animate-spin text-orange-500 mb-4" size={48} /><p className="text-gray-500">Loading billing records...</p></div>
            ) : modalType === 'checkout' && invoiceData?.approvalStatus === 'PENDING_ADMIN_APPROVAL' ? (
               <div className="text-center py-10"><CheckCircle className="mx-auto text-green-500 mb-4" size={64} /><h3 className="text-xl font-bold text-gray-900">Invoice Pending Admin Approval</h3><p className="text-gray-500 mt-2">You have already submitted the billing details. No further action needed.</p><button onClick={() => setModalType(null)} className="mt-8 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition">Close Window</button></div>
            ) : (
              <form onSubmit={handleActionSubmit} className="space-y-6">
                
                {modalType === 'checkin' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><UploadCloud size={16}/> Upload ID Document</label>
                    <input type="file" required accept="image/*,application/pdf" onChange={(e) => setFormData({...formData, idDocument: e.target.files[0]})} className="w-full border rounded-md bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                    <p className="text-xs text-gray-500 mt-2">Accepts PDF, JPG, PNG. (Saved securely to MinIO)</p>
                  </div>
                )}

                {modalType === 'checkout' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT COLUMN: INPUTS */}
                    <div className="space-y-6">
                      {invoiceData?.approvalStatus === 'REJECTED' && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md"><div className="flex items-center gap-2 text-red-800 font-bold mb-1"><AlertTriangle size={18} /> Admin Rejected Draft</div><p className="text-sm text-red-700"><strong>Remarks:</strong> {invoiceData.adminRemarks}</p></div>
                      )}

                      {/* Utilities */}
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 shadow-sm">
                        <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2"><LogOutIcon size={16}/> Utilities & Services</h3>
                        <div className="space-y-4">
                          <div><label className="block text-xs font-bold text-gray-700 mb-1">Electricity Units Consumed (₹14/unit)</label><input type="number" required value={formData.electricityUnitsConsumed} onChange={(e) => setFormData({...formData, electricityUnitsConsumed: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. 50" /></div>
                          <div className="flex gap-4">
                             <div className="flex-1"><label className="block text-xs font-bold text-gray-700 mb-1">Cleaning Chg (₹)</label><input type="number" value={formData.cleaningCharges} onChange={(e) => setFormData({...formData, cleaningCharges: e.target.value})} className="w-full px-3 py-2 border rounded-md" /></div>
                             <div className="flex-1"><label className="block text-xs font-bold text-gray-700 mb-1">Generator Chg (₹)</label><input type="number" value={formData.generatorCharges} onChange={(e) => setFormData({...formData, generatorCharges: e.target.value})} className="w-full px-3 py-2 border rounded-md" /></div>
                          </div>
                        </div>
                      </div>

                      {/* Extra Items */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                        <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Plus size={16}/> Extra Items (e.g., Mattresses)</h3>
                        {(formData.additionalItems || []).map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-sm bg-white p-2 border rounded mb-2 shadow-sm">
                            <span className="font-medium text-gray-700">{item.name}</span>
                            <span className="font-bold flex items-center gap-3">₹{item.amount} <button type="button" onClick={() => removeArrayItem('additionalItems', i)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></span>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input placeholder="Item Name" value={formData.additionalItemName} onChange={e => setFormData({...formData, additionalItemName: e.target.value})} className="flex-1 text-sm px-3 py-2 border rounded-md" />
                          <input placeholder="₹ Amt" type="number" value={formData.additionalItemAmount} onChange={e => setFormData({...formData, additionalItemAmount: e.target.value})} className="w-24 text-sm px-3 py-2 border rounded-md" />
                          <button type="button" onClick={handleAddExtraItem} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-md text-sm font-bold shadow transition">Add</button>
                        </div>
                      </div>

                      {/* Discounts */}
                      <div className="bg-green-50 p-4 rounded-lg border border-green-100 shadow-sm">
                        <h3 className="text-sm font-bold text-green-800 mb-2">Discount / Concession</h3>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Total Discount Amount (₹)</label>
                          <input type="number" min="0" value={formData.discountAmount} onChange={(e) => setFormData({...formData, discountAmount: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:ring-green-500 focus:border-green-500" placeholder="e.g. 1500" />
                        </div>
                      </div>

                      {/* Penalties */}
                      <div className="bg-red-50 p-4 rounded-lg border border-red-100 shadow-sm">
                        <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2"><AlertTriangle size={16}/> Penalties & Damages</h3>
                        {(formData.penalties || []).map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-sm bg-white p-2 border rounded mb-2 shadow-sm">
                            <span className="font-medium text-gray-700">{item.reason}</span>
                            <span className="font-bold flex items-center gap-3">₹{item.amount} <button type="button" onClick={() => removeArrayItem('penalties', i)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></span>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input placeholder="Damage Reason" value={formData.penaltyReason} onChange={e => setFormData({...formData, penaltyReason: e.target.value})} className="flex-1 text-sm px-3 py-2 border rounded-md" />
                          <input placeholder="₹ Amt" type="number" value={formData.penaltyAmount} onChange={e => setFormData({...formData, penaltyAmount: e.target.value})} className="w-24 text-sm px-3 py-2 border rounded-md" />
                          <button type="button" onClick={handleAddPenalty} className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-md text-sm font-bold shadow transition">Add</button>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: LIVE PREVIEW */}
                    <div className="bg-gray-900 text-white p-6 rounded-xl shadow-inner flex flex-col justify-between h-full">
                      <div>
                        <h3 className="font-bold text-xl border-b border-gray-700 pb-3 mb-5 text-blue-300">Live Bill Preview</h3>
                        <div className="space-y-3 text-sm text-gray-300">
                          <div className="flex justify-between"><span>Base Booking:</span><span>₹{livePreview.base.toLocaleString('en-IN')}</span></div>
                          {livePreview.totalExtras > 0 && <div className="flex justify-between text-blue-200"><span>Extra Items Added:</span><span>+ ₹{livePreview.totalExtras.toLocaleString('en-IN')}</span></div>}
                          {livePreview.discount > 0 && <div className="flex justify-between font-bold text-green-400"><span>Discount Applied:</span><span>- ₹{livePreview.discount.toLocaleString('en-IN')}</span></div>}
                          
                          <div className="flex justify-between font-semibold text-white pt-2 border-t border-gray-700 mt-2"><span>Total Taxable Amount:</span><span>₹{livePreview.taxable.toLocaleString('en-IN')}</span></div>
                          <div className="flex justify-between"><span>Taxes (5% GST):</span><span>+ ₹{livePreview.taxes.toLocaleString('en-IN')}</span></div>
                          
                          <div className="border-t border-gray-700 my-4"></div>
                          
                          <div className="flex justify-between text-orange-300"><span>Utilities (Elec/Clean/Gen):</span><span>+ ₹{(livePreview.totalDeductions - ((formData.penalties || []).reduce((s,p)=>s+p.amount,0) + Number(formData.penaltyAmount||0))).toLocaleString('en-IN')}</span></div>
                          {((formData.penalties || []).length > 0 || formData.penaltyAmount) ? (
                             <div className="flex justify-between text-red-400"><span>Penalties/Damages:</span><span>+ ₹{((formData.penalties || []).reduce((s,p)=>s+p.amount,0) + Number(formData.penaltyAmount||0)).toLocaleString('en-IN')}</span></div>
                          ) : null}
                          
                          <div className="border-t border-gray-700 my-4"></div>

                          <div className="flex justify-between font-bold text-lg text-white"><span>Grand Total Event Cost:</span><span>₹{livePreview.grandTotalCost.toLocaleString('en-IN')}</span></div>
                          <div className="flex justify-between font-bold text-green-400 mt-2"><span>Total Paid Upfront:</span><span>₹{livePreview.totalPaid.toLocaleString('en-IN')}</span></div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t-2 border-gray-700 text-center">
                        {livePreview.refundDue > 0 ? (
                           <div className="bg-green-900/40 text-green-400 p-4 rounded-xl border border-green-700/50 shadow-inner">
                             <span className="block text-xs uppercase tracking-wider mb-1 font-bold text-green-500">To be refunded</span>
                             <span className="text-3xl font-extrabold">₹{livePreview.refundDue.toLocaleString('en-IN')}</span>
                           </div>
                        ) : livePreview.balanceDue > 0 ? (
                           <div className="bg-red-900/40 text-red-400 p-4 rounded-xl border border-red-700/50 shadow-inner">
                             <span className="block text-xs uppercase tracking-wider mb-1 font-bold text-red-500">Balance Due (User Pays)</span>
                             <span className="text-3xl font-extrabold">₹{livePreview.balanceDue.toLocaleString('en-IN')}</span>
                           </div>
                        ) : (
                           <div className="bg-gray-800 text-gray-300 p-4 rounded-xl border border-gray-600 shadow-inner">
                             <span className="block text-xs uppercase tracking-wider mb-1 font-bold">Settlement</span>
                             <span className="text-2xl font-bold">Fully Settled (₹0)</span>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 mt-4 border-t flex justify-end">
                  <button type="submit" disabled={isProcessing === selectedBooking?.id} className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-md">
                    {isProcessing === selectedBooking?.id ? 'Processing...' : modalType === 'checkin' ? 'Confirm Check-In' : invoiceData?.approvalStatus === 'REJECTED' ? 'Resubmit Invoice to Admin' : 'Submit Invoice to Admin'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- NEW ID VIEWER MODAL --- */}
      {viewIdModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl relative max-w-4xl w-full p-2">
            <button 
              onClick={() => setViewIdModal(null)} 
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
            >
              <X size={36} />
            </button>
            {/* If the URL is a PDF, use an iframe; otherwise, use an img tag */}
            {viewIdModal.toLowerCase().endsWith('.pdf') ? (
              <iframe 
                src={viewIdModal} 
                className="w-full h-[80vh] rounded-lg border-none" 
                title="Aadhar Document"
              />
            ) : (
              <img 
                src={viewIdModal} 
                alt="Aadhar ID Document" 
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg" 
              />
            )}
          </div>
        </div>
      )}

      {/* INVOICE PRINT MODAL */}
      {printModal && (
        <InvoicePrintView invoice={printModal.invoice} booking={printModal.booking} onClose={() => setPrintModal(null)} />
      )}
    </div>
  );
}