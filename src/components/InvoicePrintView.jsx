import React from 'react';
import { Printer, X } from 'lucide-react';

// Advanced Indian Number to Words Converter
const numToWords = (num) => {
  const single = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const double = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const formatTens = (num) => {
    if (num < 10) return single[num];
    if (num < 20) return double[num - 10];
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + single[num % 10] : "");
  };
  
  if (num === 0) return "Zero";
  let words = "";
  if (Math.floor(num / 10000000) > 0) { words += formatTens(Math.floor(num / 10000000)) + " Crore "; num %= 10000000; }
  if (Math.floor(num / 100000) > 0) { words += formatTens(Math.floor(num / 100000)) + " Lakh "; num %= 100000; }
  if (Math.floor(num / 1000) > 0) { words += formatTens(Math.floor(num / 1000)) + " Thousand "; num %= 1000; }
  if (Math.floor(num / 100) > 0) { words += formatTens(Math.floor(num / 100)) + " Hundred "; num %= 100; }
  if (num > 0) { words += (words !== "" ? "and " : "") + formatTens(num); }
  return words.trim();
};

const getAmountInWords = (amount) => {
  const parts = amount.toFixed(2).toString().split(".");
  const rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);
  
  let str = `Indian Rupees ${numToWords(rupees)}`;
  if (paise > 0) str += ` and ${numToWords(paise)} paise`;
  return str + " Only";
};

export default function InvoicePrintView({ invoice, booking, onClose }) {
  if (!invoice || !booking) return null;

  // Exact Database Numbers
  const base = Number(invoice.baseAmount) || 0;
  const additional = Number(invoice.totalAdditionalAmount) || 0;
  const discount = Number(invoice.discountAmount) || 0;
  
  // Taxable Goods/Services
  const taxableAmount = Math.max(0, base + additional - discount);
  const cgst = Number(invoice.cgstAmount) || 0;
  const sgst = Number(invoice.sgstAmount) || 0;
  const totalTax = cgst + sgst;
  const invoiceGoodsTotal = taxableAmount + totalTax;

  const cgstRate = taxableAmount > 0 ? Number(((cgst / taxableAmount) * 100).toFixed(2)) : 0;
  const sgstRate = taxableAmount > 0 ? Number(((sgst / taxableAmount) * 100).toFixed(2)) : 0;
  const totalGstRate = cgstRate + sgstRate;

  // Post-Event Non-Taxable Deductions
  const electricity = Number(invoice.electricityCharges) || 0;
  const cleaning = Number(invoice.cleaningCharges) || 0;
  const generator = Number(invoice.generatorCharges) || 0;
  const penaltiesTotal = invoice.damagesAndPenalties?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const totalDeductions = electricity + cleaning + generator + penaltiesTotal;

  const securityDeposit = Number(invoice.securityDepositHeld) || 0;
  const totalPaidUpfront = base + securityDeposit;
  const grandTotalCost = invoiceGoodsTotal + totalDeductions;
  
  const refundDue = Number(invoice.finalRefundAmount) || 0;
  const balanceDue = Number(invoice.additionalBalanceDue) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto p-4 sm:p-8 print:p-0 print:bg-white">
      
      <div className="bg-white w-full max-w-[850px] shadow-2xl relative print:shadow-none">
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-3 p-4 bg-gray-100 border-b print:hidden sticky top-0 z-10">
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-md shadow hover:bg-blue-700 font-bold">
            <Printer size={18} /> Print / Save PDF
          </button>
          <button onClick={onClose} className="flex items-center gap-2 bg-gray-300 text-gray-800 px-5 py-2.5 rounded-md shadow hover:bg-gray-400 font-bold">
            <X size={18} /> Close
          </button>
        </div>

  {/* Global Print Styles */}
        <style>
          {`
            @media print {
              /* 1. Hide everything else on the screen */
              body * { visibility: hidden; }
              
              /* 2. Make only the invoice area visible */
              #printable-invoice-area, #printable-invoice-area * { visibility: visible; }
              
              /* 3. Force the invoice to the top-left of the paper */
              #printable-invoice-area { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%; 
              }
              
              /* 4. THE FIX: Force the background to only be 1 page tall so it doesn't print extra copies/blank pages */
              html, body {
                height: 100vh;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden;
              }
              
              @page { margin: 10mm; }
            }
          `}
        </style>

        {/* TALLY STYLE INVOICE BODY */}
        <div id="printable-invoice-area" className="p-4 text-[12px] text-black leading-tight m-4 print:m-0">
          
        <div className="text-center font-bold text-lg mb-1 tracking-wider uppercase">
  {invoice.invoiceType === 'DONATION' ? 'Donation Receipt' : 'Tax Invoice'}
</div>

          <div className="border border-black flex flex-col">
            
            {/* 1. Header Block */}
            <div className="flex border-b border-black">
              {/* Left Side: Company Details */}
              <div className="w-1/2 border-r border-black p-2">
                <h2 className="font-extrabold text-sm mb-1">MAHARASHTRA MANDAL, RAIPUR</h2>
                <p>G.E. ROAD, CHOUBEY COLONY,</p>
                <p>RAIPUR</p>
                <p className="mt-2"><strong>PAN:</strong> AABTM5711H</p>
                <p><strong>GSTIN/UIN:</strong> 22AABTM5711H1ZY</p>
                <p>State Name: Chhattisgarh, Code: 22</p>
                <p>Contact: 0771-2254434, +91-76470-83603</p>
                <p>E-Mail: maharashtramandalraipur@gmail.com</p>
              </div>
              
              {/* Right Side: Invoice Numbers */}
              <div className="w-1/2 flex flex-col">
                <div className="flex justify-between border-b border-black h-1/2">
                  <div className="p-2 border-r border-black w-1/2">
                    <p className="text-[10px] font-semibold">Invoice No.</p>
                    <p className="font-bold">{invoice.invoiceNumber}</p>
                  </div>
                  <div className="p-2 w-1/2">
                    <p className="text-[10px] font-semibold">Dated</p>
                    <p className="font-bold">{new Date(invoice.invoiceDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}).replace(/ /g, '-')}</p>
                  </div>
                </div>
                <div className="flex justify-between h-1/2">
                  <div className="p-2 border-r border-black w-1/2">
                    <p className="text-[10px] font-semibold">Ref. No.</p>
                    <p className="font-bold">BHAWAN / {booking.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="p-2 w-1/2">
                    <p className="text-[10px] font-semibold">Other References</p>
                    <p></p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Party Details Block */}
            <div className="border-b border-black p-2">
              <p>Party: <strong className="ml-2 uppercase">{invoice.customerName}</strong></p>
              <p className="ml-10">{invoice.billingAddress || "RAIPUR"}</p>
              <p className="ml-10 mt-1 uppercase">CONT NO. {invoice.customerPhone}</p>
              <div className="flex justify-between mt-1 ml-10 pr-10">
                 <p>State Name: Chhattisgarh, Code: 22</p>
                 <p>Place of Supply: Chhattisgarh</p>
              </div>
            </div>

            {/* 3. Main Item Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black bg-gray-50 print:bg-transparent">
                  <th className="border-r border-black p-1 text-center w-10">SI<br/>No.</th>
                  <th className="border-r border-black p-1">Particulars</th>
                  <th className="border-r border-black p-1 text-center w-20">HSN/SAC</th>
                  <th className="border-r border-black p-1 text-center w-16">GST<br/>Rate</th>
                  <th className="border-r border-black p-1 text-center w-16">Quantity</th>
                  <th className="border-r border-black p-1 text-right w-24">Rate<br/>(Incl. of Tax)</th>
                  <th className="border-r border-black p-1 text-right w-20">Rate</th>
                  <th className="border-r border-black p-1 text-center w-10">per</th>
                  <th className="p-1 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                
                {/* --- ROW 1: MAIN ITEM DETAILS --- */}
                <tr className="align-top">
                  <td className="border-r border-black p-1 text-center">1</td>
                  <td className="border-r border-black p-2">
                    <p className="font-bold mb-1">BOOKING & FACILITY CHARGES</p>
                    <p className="uppercase text-gray-800 font-semibold">{booking?.facility?.name || booking?.eventType}</p>
                    <p className="uppercase text-gray-700">PROGRAM DATE-{new Date(booking?.schedule?.startTime).toLocaleDateString('en-IN')}</p>
                    
                    {invoice.additionalItems?.length > 0 && (
                      <div className="mt-2">
                        <p className="font-bold text-[11px] underline mb-0.5">EXTRA ITEMS INCLUDED:</p>
                        {invoice.additionalItems.map((item, i) => (
                          <p key={i} className="text-[11px] text-gray-800 uppercase">• {item.name}</p>
                        ))}
                      </div>
                    )}
                    
                    {discount > 0 && <p className="font-bold text-[11px] text-gray-800 mt-2 uppercase">- DISCOUNT APPLIED</p>}
                  </td>
                <td className="border-r border-black p-1 text-center">{invoice.invoiceType === 'DONATION' ? 'N/A' : '9963'}</td>
<td className="border-r border-black p-1 text-center">{invoice.invoiceType === 'DONATION' ? '0%' : `${totalGstRate}%`}</td>
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="border-r border-black p-1 text-right"></td>
                  <td className="border-r border-black p-1 text-right">{taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="p-1 text-right">{taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>

                {/* --- ROW 2: CGST ALIGNMENT --- */}
                <tr className="align-top">
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="border-r border-black p-1 text-right pr-4 font-bold pt-6">CGST</td>
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="border-r border-black p-1 text-right"></td>
                  <td className="border-r border-black p-1 text-right"></td>
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="p-1 text-right pt-6">{cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>

                {/* --- ROW 3: SGST ALIGNMENT & SPACING FILLER --- */}
                <tr className="align-top h-[70px]">
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="border-r border-black p-1 text-right pr-4 font-bold">SGST</td>
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="border-r border-black p-1 text-right"></td>
                  <td className="border-r border-black p-1 text-right"></td>
                  <td className="border-r border-black p-1 text-center"></td>
                  <td className="p-1 text-right">{sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>

                {/* --- ROW 4: DEDUCTIONS --- */}
                {totalDeductions > 0 && (
                  <tr className="border-t border-black bg-gray-50 print:bg-transparent">
                    <td colSpan="8" className="border-r border-black p-2">
                       <p className="font-bold uppercase text-[11px]">Post-Event Deductions (Non-Taxable):</p>
                       <div className="flex gap-4 mt-1 text-[11px]">
                         {electricity > 0 && <span>• Electricity ({invoice.electricityUnitsConsumed} units)</span>}
                         {cleaning > 0 && <span>• Cleaning</span>}
                         {generator > 0 && <span>• Generator</span>}
                         {penaltiesTotal > 0 && <span>• Penalties</span>}
                       </div>
                    </td>
                    <td className="p-2 text-right font-bold text-gray-800">{totalDeductions.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                )}
                
                <tr className="border-t border-black">
                  <td colSpan="8" className="border-r border-black p-1 text-right font-extrabold text-sm pr-4">Total</td>
                  <td className="p-1 text-right font-extrabold text-sm">{(invoiceGoodsTotal + totalDeductions).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>

            {/* 4. Amount in Words */}
            <div className="border-b border-black p-2 flex justify-between">
               <div className="w-3/4">
                 <p className="text-[10px] font-semibold text-gray-600 mb-0.5">Amount Chargeable (in words)</p>
                 <p className="font-bold italic">{getAmountInWords(invoiceGoodsTotal + totalDeductions)}</p>
               </div>
               <div className="w-1/4 text-right italic font-semibold pt-4">E. & O.E</div>
            </div>

            {/* 5. Tally Tax Table */}
            <table className="w-full text-center border-b border-black text-[11px] border-collapse">
               <thead>
                  <tr className="bg-gray-50 print:bg-transparent">
                     <th rowSpan="2" className="border-r border-b border-black p-1">HSN/SAC</th>
                     <th rowSpan="2" className="border-r border-b border-black p-1 text-right pr-2">Taxable<br/>Value</th>
                     <th colSpan="2" className="border-r border-b border-black p-1">CGST</th>
                     <th colSpan="2" className="border-r border-b border-black p-1">SGST/UTGST</th>
                     <th rowSpan="2" className="border-b border-black p-1 text-right pr-2">Total<br/>Tax Amount</th>
                  </tr>
                  <tr className="bg-gray-50 print:bg-transparent">
                     <th className="border-r border-b border-black p-1">Rate</th>
                     <th className="border-r border-b border-black p-1 text-right pr-2">Amount</th>
                     <th className="border-r border-b border-black p-1">Rate</th>
                     <th className="border-r border-b border-black p-1 text-right pr-2">Amount</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
   <td className="border-r border-black p-1">{invoice.invoiceType === 'DONATION' ? 'N/A' : '9963'}</td>
   <td className="border-r border-black p-1 text-right pr-2">{taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
   <td className="border-r border-black p-1">{invoice.invoiceType === 'DONATION' ? '0%' : `${cgstRate}%`}</td>
   <td className="border-r border-black p-1 text-right pr-2">{cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
   <td className="border-r border-black p-1">{invoice.invoiceType === 'DONATION' ? '0%' : `${sgstRate}%`}</td>
   <td className="border-r border-black p-1 text-right pr-2">{sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
   <td className="p-1 text-right pr-2">{totalTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
</tr>
                  <tr className="border-t border-black font-bold">
                     <td className="border-r border-black p-1 text-right pr-2">Total</td>
                     <td className="border-r border-black p-1 text-right pr-2">{taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                     <td className="border-r border-black p-1"></td>
                     <td className="border-r border-black p-1 text-right pr-2">{cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                     <td className="border-r border-black p-1"></td>
                     <td className="border-r border-black p-1 text-right pr-2">{sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                     <td className="p-1 text-right pr-2">{totalTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
               </tbody>
            </table>

            {/* 6. Tax Amount in Words */}
            <div className="border-b border-black p-2">
               <p className="text-[10px] font-semibold text-gray-600 mb-0.5">Tax Amount (in words)</p>
               <p className="font-bold italic">{getAmountInWords(totalTax)}</p>
            </div>

            {/* 7. SETTLEMENT SUMMARY */}
            <div className="border-b border-black p-2 bg-gray-50 print:bg-transparent">
              <h3 className="font-bold underline mb-1 text-[11px] uppercase">Final Settlement Overview</h3>
              <div className="flex justify-between text-[11px]">
                 <div className="w-1/3">
                    <p className="flex justify-between pr-4"><span>Grand Total Event Cost:</span> <strong>₹{grandTotalCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></p>
                    <p className="flex justify-between pr-4 border-b border-gray-400 pb-1"><span>Total Paid Upfront:</span> <strong>₹{totalPaidUpfront.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></p>
                 </div>
                 <div className="w-1/3 text-center border-l border-r border-gray-300 px-2 flex flex-col justify-center">
                    {refundDue > 0 ? (
                       <p className="font-bold text-sm text-green-700">REFUND: ₹{refundDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                    ) : balanceDue > 0 ? (
                       <p className="font-bold text-sm text-red-700">BALANCE OWED: ₹{balanceDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                    ) : (
                       <p className="font-bold text-sm">FULLY SETTLED (₹0.00)</p>
                    )}
                 </div>
              </div>
            </div>

            {/* 8. Bank Details & Signature */}
            <div className="flex bg-white">
              <div className="w-1/2 border-r border-black p-2">
                <p className="font-bold underline text-[11px] mb-1">Company's Bank Details</p>
                <table className="text-[10px] w-full">
                  <tbody>
                    <tr><td className="py-0.5 w-24 text-gray-600">A/c Holder's Name</td><td className="font-bold">: MAHARASHTRA MANDAL</td></tr>
                    <tr><td className="py-0.5 text-gray-600">Bank Name</td><td className="font-bold">: BANK OF INDIA</td></tr>
                    <tr><td className="py-0.5 text-gray-600">A/c No.</td><td className="font-bold">: 935220110000406</td></tr>
                    <tr><td className="py-0.5 text-gray-600">Branch & IFS Code</td><td className="font-bold">: PACHPEDI NAKA RAIPUR & BKID0009352</td></tr>
                    <tr><td className="py-0.5 text-gray-600">Company's PAN</td><td className="font-bold">: AABTM5711H</td></tr>
                  </tbody>
                </table>
              </div>
              
              <div className="w-1/2 flex flex-col justify-between">
                <div className="p-2 border-b border-black">
                  <p className="font-bold underline text-[11px] mb-0.5">Declaration</p>
                  <p className="text-[10px] italic">We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.</p>
                </div>
                
                <div className="p-2 text-right relative h-[90px]">
                  <p className="font-bold text-[11px] absolute top-2 right-2">for MAHARASHTRA MANDAL, RAIPUR</p>
                  {invoice.adminSignatureUrl ? (
                    <img 
                      src={invoice.adminSignatureUrl} 
                      alt="Admin Signature" 
                      className="absolute bottom-6 right-2 h-12 object-contain"
                    />
                  ) : (
                    <p className="absolute bottom-6 right-2 text-gray-400 italic text-[10px]">Authorised Signatory</p>
                  )}
                  <p className="font-semibold text-[10px] absolute bottom-2 right-2">Authorised Signatory</p>
                </div>
              </div>
            </div>

          </div>

          <div className="text-center text-[9px] text-gray-500 py-1 mt-1">
             This is a Computer Generated Invoice
          </div>

        </div>
      </div>
    </div>
  );
}