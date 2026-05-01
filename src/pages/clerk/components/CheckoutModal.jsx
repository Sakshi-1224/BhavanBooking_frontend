import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertTriangle, LogOut as LogOutIcon, Plus, Trash2, Receipt, CreditCard } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../../api/axios';
import useSettingsStore from '../../../store/useSettingsStore';

export default function CheckoutModal({ booking, onClose, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingInvoice, setIsFetchingInvoice] = useState(true);
  const [invoiceData, setInvoiceData] = useState(null);
const { settings } = useSettingsStore();
  // Default fallback tax rate (10%) just in case the API completely fails
  const defaultTaxRate = settings ? ((Number(settings.cgstPercentage) + Number(settings.sgstPercentage)) / 100) : 0.10;
  const [taxRate, setTaxRate] = useState(defaultTaxRate);

  const [formData, setFormData] = useState({
    penalties: [], additionalItems: [], additionalItemName: '', additionalItemAmount: '', penaltyReason: '', penaltyAmount: '',
    electricityUnitsConsumed: '', cleaningCharges: '', generatorCharges: '', discountAmount: '',
    invoiceType: 'GENERAL', customerName: '', customerEmail: '', customerPhone: '', billingAddress: '',
    settlementMode: 'ONLINE',
  });

  useEffect(() => {
    const fetchDraftAndSettings = async () => {
      try {
        const response = await api.get(`/billing/${booking.id}/invoice`);
        const invoice = response.data.data.invoice;
        setInvoiceData(invoice);

        const draftBase = Number(invoice.baseAmount) || 0;
        const draftAdditional = Number(invoice.totalAdditionalAmount) || 0;
        const draftDiscount = Number(invoice.discountAmount) || 0;
        
        // Match backend draft logic
        const draftTaxable = Math.max(0, draftBase + draftAdditional - draftDiscount);
        
        const draftCgst = Number(invoice.cgstAmount) || 0;
        const draftSgst = Number(invoice.sgstAmount) || 0;

        if (draftTaxable > 0 && invoice.invoiceType !== 'DONATION') {
           const calculatedRate = (draftCgst + draftSgst) / draftTaxable;
           setTaxRate(calculatedRate);
        }

        setFormData(prev => ({ ...prev, 
          electricityUnitsConsumed: invoice.electricityUnitsConsumed || '', cleaningCharges: invoice.cleaningCharges || '',
          generatorCharges: invoice.generatorCharges || '', discountAmount: invoice.discountAmount || '',
          penalties: invoice.damagesAndPenalties || [], additionalItems: invoice.additionalItems || [],
          invoiceType: invoice.invoiceType || 'GENERAL', customerName: invoice.customerName || booking?.user?.fullName || '',
          customerEmail: invoice.customerEmail || booking?.user?.email || '', customerPhone: invoice.customerPhone || booking?.user?.phone || '',
          billingAddress: invoice.billingAddress || '',
          settlementMode: invoice.settlementMode || (booking?.bookingSource === 'WALK_IN' ? 'CASH' : 'ONLINE'),
        }));
      } catch (error) {
        try {
          const settingsRes = await api.get('/settings/taxes');
          const { cgstPercentage, sgstPercentage } = settingsRes.data.data || settingsRes.data;
          
          if (cgstPercentage !== undefined && sgstPercentage !== undefined) {
             const dynamicRate = (Number(cgstPercentage) + Number(sgstPercentage)) / 100;
             setTaxRate(dynamicRate);
          }
        } catch (settingsError) {
          console.error("Failed to fetch live tax settings:", settingsError);
        }

        setFormData(prev => ({ ...prev, invoiceType: 'GENERAL', customerName: booking?.user?.fullName || '', customerEmail: booking?.user?.email || '', customerPhone: booking?.user?.phone || '', settlementMode: booking?.bookingSource === 'WALK_IN' ? 'CASH' : 'ONLINE' }));
      } finally { 
        setIsFetchingInvoice(false); 
      }
    };
    fetchDraftAndSettings();
  }, [booking]);

  const removeArrayItem = (key, index) => setFormData(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));

  // --- PERFECTED LIVE PREVIEW MATH (MIRRORS BACKEND EXACTLY) ---
  const base = Number(booking.financials?.calculatedAmount || 0);
  const deposit = Number(booking.financials?.securityDeposit || 0);
  
  // Extras
  const typedExtra = Number(formData.additionalItemAmount || 0);
  const totalExtras = (formData.additionalItems || []).reduce((sum, i) => sum + Number(i.amount), 0) + typedExtra;
  const electricityRate = settings?.electricityRate || 14;
  // Utilities & Penalties
  const electricityCharges = Number(formData.electricityUnitsConsumed || 0) * electricityRate;
  const cleaningCharges = Number(formData.cleaningCharges || 0);
  const generatorCharges = Number(formData.generatorCharges || 0);
  const typedPenalty = Number(formData.penaltyAmount || 0);
  const totalPenalties = (formData.penalties || []).reduce((sum, p) => sum + Number(p.amount), 0) + typedPenalty;
  
  const totalUtilitiesAndPenalties = electricityCharges + cleaningCharges + generatorCharges + totalPenalties;

  // Discount
  const discount = Number(formData.discountAmount || 0);
  
  // Taxable: Base + Extras + Utilities/Penalties - Discount
  const taxable = Math.max(0, base + totalExtras + totalUtilitiesAndPenalties - discount);
  
  // Tax Calculation
  const taxes = formData.invoiceType === 'DONATION' ? 0 : taxable * taxRate; 
  
  // Grand Total is now simply Taxable + Taxes
  const grandTotalCost = taxable + taxes;
  const invoiceDueDays = settings?.invoiceDueDays || 7;
  const totalPaid = base + deposit;
  const netDifference = totalPaid - grandTotalCost;
  const refundDue = netDifference > 0 ? netDifference : 0;
  const balanceDue = netDifference < 0 ? Math.abs(netDifference) : 0;

  // Strict Online Refund Restriction Logic
  const hasOnlinePayment = 
    booking?.bookingSource === 'ONLINE' ||
    booking?.paymentMode === 'ONLINE' ||
    booking?.payments?.some(p => p.paymentMode === 'ONLINE' || p.method === 'ONLINE') ||
    booking?.transactions?.some(t => t.paymentMode === 'ONLINE' || t.method === 'ONLINE');

  const showOnlineOption = balanceDue > 0 || (refundDue > 0 && hasOnlinePayment);

  useEffect(() => {
    if (!showOnlineOption && formData.settlementMode === 'ONLINE') {
      setFormData(prev => ({ ...prev, settlementMode: 'CASH' }));
    }
  }, [showOnlineOption, formData.settlementMode]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      let finalPenalties = [...formData.penalties];
      if (formData.penaltyReason && formData.penaltyAmount) finalPenalties.push({ reason: formData.penaltyReason, amount: Number(formData.penaltyAmount) });
      let finalExtras = [...formData.additionalItems];
      if (formData.additionalItemName && formData.additionalItemAmount) finalExtras.push({ name: formData.additionalItemName, amount: Number(formData.additionalItemAmount) });

      const dueDate = new Date(); 
      dueDate.setDate(dueDate.getDate() + invoiceDueDays); 

      const payload = {
        bookingId: booking.id, 
        electricityUnitsConsumed: Number(formData.electricityUnitsConsumed || 0),
        cleaningCharges: Number(formData.cleaningCharges || 0), 
        generatorCharges: Number(formData.generatorCharges || 0),
        damagesAndPenalties: finalPenalties, 
        additionalItems: finalExtras, 
        discountAmount: Number(formData.discountAmount || 0), 
        invoiceType: formData.invoiceType,
        settlementMode: formData.settlementMode, 
      };

      if (formData.settlementMode === 'ONLINE') {
        payload.dueDate = dueDate.toISOString();
      }

      if (formData.invoiceType === 'DONATION') {
        Object.assign(payload, { customerName: formData.customerName, customerEmail: formData.customerEmail, customerPhone: formData.customerPhone, billingAddress: formData.billingAddress });
      }
      
      await api.post(`/billing/draft-invoice`, payload);
      toast.success('Draft invoice submitted to Admin for approval!');
      onSuccess();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to submit invoice'); } finally { setIsProcessing(false); }
  };

  if (isFetchingInvoice) return ( <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white p-12 rounded-xl flex flex-col items-center"><Loader2 className="animate-spin text-orange-500 mb-4" size={48} /><p>Loading...</p></div></div> );
  if (invoiceData?.approvalStatus === 'PENDING_ADMIN_APPROVAL') return ( <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white p-10 rounded-xl max-w-md w-full text-center"><CheckCircle className="mx-auto text-green-500 mb-4" size={64} /><h3 className="text-xl font-bold">Invoice Pending Admin Approval</h3><button onClick={onClose} className="mt-8 px-6 py-2 bg-gray-100 rounded-md">Close Window</button></div></div> );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">Draft Final Invoice & Check-Out</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {invoiceData?.approvalStatus === 'REJECTED' && (<div className="bg-red-50 p-4 rounded"><AlertTriangle size={18} /> Admin Remarks: {invoiceData.adminRemarks}</div>)}
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 shadow-sm">
                <h3 className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2"><Receipt size={16}/> Invoice Type</h3>
                <div className="flex gap-4 mb-4">
                  <label><input type="radio" value="GENERAL" checked={formData.invoiceType === 'GENERAL'} onChange={(e) => setFormData({...formData, invoiceType: e.target.value})} className="mr-2"/>General (GST Applied)</label>
                  <label><input type="radio" value="DONATION" checked={formData.invoiceType === 'DONATION'} onChange={(e) => setFormData({...formData, invoiceType: e.target.value})} className="mr-2"/>Donation (No GST)</label>
                </div>
                {formData.invoiceType === 'DONATION' && (
                  <div className="space-y-2 pt-2 border-t border-purple-200">
                    <input required placeholder="Name" value={formData.customerName} onChange={e=>setFormData({...formData, customerName:e.target.value})} className="w-full p-2 border rounded text-sm"/>
                    <div className="flex gap-2">
                      <input required placeholder="Phone" value={formData.customerPhone} onChange={e=>setFormData({...formData, customerPhone:e.target.value})} className="w-full p-2 border rounded text-sm"/>
                      <input required placeholder="Email" type="email" value={formData.customerEmail} onChange={e=>setFormData({...formData, customerEmail:e.target.value})} className="w-full p-2 border rounded text-sm"/>
                    </div>
                    <textarea required placeholder="Billing Address" value={formData.billingAddress} onChange={e=>setFormData({...formData, billingAddress:e.target.value})} className="w-full p-2 border rounded text-sm"></textarea>
                  </div>
                )}
              </div>

              {/* Utilities Block */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 shadow-sm">
                <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2"><LogOutIcon size={16}/> Utilities & Services</h3>
                <div className="space-y-4">
                  <div><label className="block text-xs font-bold mb-1">Elec Units (₹{electricityRate}/unit)</label><input type="number" required value={formData.electricityUnitsConsumed} onChange={(e) => setFormData({...formData, electricityUnitsConsumed: e.target.value})} className="w-full p-2 border rounded" /></div>
                  <div className="flex gap-4">
                      <div className="flex-1"><label className="block text-xs font-bold mb-1">Cleaning (₹)</label><input type="number" value={formData.cleaningCharges} onChange={(e) => setFormData({...formData, cleaningCharges: e.target.value})} className="w-full p-2 border rounded" /></div>
                      <div className="flex-1"><label className="block text-xs font-bold mb-1">Generator (₹)</label><input type="number" value={formData.generatorCharges} onChange={(e) => setFormData({...formData, generatorCharges: e.target.value})} className="w-full p-2 border rounded" /></div>
                  </div>
                </div>
              </div>

              {/* Extras Block */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                 <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Plus size={16}/> Extras</h3>
                 {(formData.additionalItems || []).map((item, i) => (
                    <div key={i} className="flex justify-between bg-white p-2 border rounded mb-2"><span>{item.name}</span><span className="flex items-center gap-2">₹{item.amount} <button type="button" onClick={() => removeArrayItem('additionalItems', i)}><Trash2 size={16} className="text-red-500"/></button></span></div>
                 ))}
                 <div className="flex gap-2">
                    <input placeholder="Item" value={formData.additionalItemName} onChange={e => setFormData({...formData, additionalItemName: e.target.value})} className="flex-1 p-2 border rounded text-sm" />
                    <input placeholder="₹" type="number" value={formData.additionalItemAmount} onChange={e => setFormData({...formData, additionalItemAmount: e.target.value})} className="w-20 p-2 border rounded text-sm" />
                    <button type="button" onClick={() => { if(formData.additionalItemName && formData.additionalItemAmount) setFormData(p => ({...p, additionalItems: [...p.additionalItems, {name: p.additionalItemName, amount: Number(p.additionalItemAmount)}], additionalItemName: '', additionalItemAmount: ''})) }} className="bg-blue-600 text-white px-3 rounded text-sm font-bold">Add</button>
                 </div>
              </div>

              {/* Discount Block */}
              <div className="bg-green-50 p-4 rounded-lg border shadow-sm">
                <label className="block text-xs font-bold mb-1 text-green-800">Discount Amount (₹)</label>
                <input type="number" value={formData.discountAmount} onChange={(e) => setFormData({...formData, discountAmount: e.target.value})} className="w-full p-2 border rounded" />
              </div>

            </div>

            {/* LIVE PREVIEW COLUMN */}
            <div className="bg-gray-900 text-white p-6 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xl border-b border-gray-700 pb-3 mb-5 text-blue-300">Live Bill Preview</h3>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex justify-between"><span>Base Booking:</span><span>₹{base.toLocaleString('en-IN')}</span></div>
                  {totalExtras > 0 && <div className="flex justify-between text-blue-200"><span>Extra Items:</span><span>+ ₹{totalExtras.toLocaleString('en-IN')}</span></div>}
                  {totalUtilitiesAndPenalties > 0 && <div className="flex justify-between text-orange-300"><span>Utilities & Penalties:</span><span>+ ₹{totalUtilitiesAndPenalties.toLocaleString('en-IN')}</span></div>}
                  {discount > 0 && <div className="flex justify-between text-green-400"><span>Discount:</span><span>- ₹{discount.toLocaleString('en-IN')}</span></div>}
                  
                  <div className="flex justify-between text-white border-t border-gray-700 pt-2"><span>Taxable Amount:</span><span>₹{taxable.toLocaleString('en-IN')}</span></div>
                  
                  <div className="flex justify-between">
                    <span>Taxes ({(taxRate * 100).toFixed(1)}%):</span>
                    <span>{formData.invoiceType === 'DONATION' ? '₹0 (Donation)' : `+ ₹${taxes.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}</span>
                  </div>
                  
                  <div className="border-t border-gray-700 my-4"></div>
                  <div className="flex justify-between font-bold text-lg text-white"><span>Grand Total:</span><span>₹{grandTotalCost.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between text-green-400"><span>Paid Upfront:</span><span>₹{totalPaid.toLocaleString('en-IN')}</span></div>
                </div>
              </div>

              <div>
                <div className="mt-8 pt-6 border-t border-gray-700 text-center mb-6">
                   {refundDue > 0 ? (
                      <div className="bg-green-900/40 text-green-400 p-4 rounded-xl border border-green-700/50">
                        <span className="block text-xs uppercase mb-1 font-bold">To be refunded to user</span>
                        <span className="text-3xl font-extrabold">₹{refundDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                      </div>
                   ) : balanceDue > 0 ? (
                      <div className="bg-red-900/40 text-red-400 p-4 rounded-xl border border-red-700/50">
                        <span className="block text-xs uppercase mb-1 font-bold">Balance Due (User Pays)</span>
                        <span className="text-3xl font-extrabold">₹{balanceDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                      </div>
                   ) : (
                      <div className="bg-gray-800 text-gray-300 p-4 rounded-xl border border-gray-600">
                        <span className="text-2xl font-bold">Fully Settled (₹0)</span>
                      </div>
                   )}
                </div>

                {(refundDue > 0 || balanceDue > 0) && (
                  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mt-4">
                    <h3 className="text-sm font-bold text-gray-200 mb-3 flex items-center gap-2">
                      <CreditCard size={16}/> Settlement Mode
                    </h3>
                    <p className="text-xs text-gray-400 mb-3">
                      Select how this {refundDue > 0 ? 'refund' : 'payment'} will be processed.
                    </p>
                    <div className="flex gap-4">
                      {showOnlineOption && (
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="radio" value="ONLINE" checked={formData.settlementMode === 'ONLINE'} onChange={(e) => setFormData({...formData, settlementMode: e.target.value})} className="accent-blue-500"/>
                          <span className={formData.settlementMode === 'ONLINE' ? 'text-white' : 'text-gray-400'}>Online (Auto)</span>
                        </label>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="radio" value="CASH" checked={formData.settlementMode === 'CASH'} onChange={(e) => setFormData({...formData, settlementMode: e.target.value})} className="accent-blue-500"/>
                        <span className={formData.settlementMode === 'CASH' ? 'text-white' : 'text-gray-400'}>Cash (Manual)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="radio" value="QR" checked={formData.settlementMode === 'QR'} onChange={(e) => setFormData({...formData, settlementMode: e.target.value})} className="accent-blue-500"/>
                        <span className={formData.settlementMode === 'QR' ? 'text-white' : 'text-gray-400'}>QR/UPI (Manual)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="pt-6 border-t flex justify-end">
            <button type="submit" disabled={isProcessing} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">
              {isProcessing ? 'Processing...' : 'Submit Invoice for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}