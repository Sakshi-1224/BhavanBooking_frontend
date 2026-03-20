// src/components/InvoicePrintView.jsx
import React from 'react';
import { Printer, X } from 'lucide-react';

// Simple utility to convert numbers to Indian Rupee Words (Optional enhancement)
const numberToWords = (num) => {
  return "Rupees " + Number(num).toLocaleString('en-IN') + " Only";
};

export default function InvoicePrintView({ invoice, booking, onClose }) {
  if (!invoice || !booking) return null;

  // Calculate the raw taxable base (Base + Extras + Post-event Deductions like electricity)
  const totalTaxable = Number(invoice.baseAmount) + Number(invoice.totalAdditionalAmount) + Number(invoice.totalDeductions);
  const grandTotal = totalTaxable + Number(invoice.cgstAmount) + Number(invoice.sgstAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto p-4 sm:p-8 print:p-0 print:bg-white">
      
      <div className="bg-white w-full max-w-4xl shadow-2xl relative print:shadow-none">
        
        {/* Action Buttons (Hidden when printing) */}
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
              body * { visibility: hidden; }
              #printable-invoice-area, #printable-invoice-area * { visibility: visible; }
              #printable-invoice-area { position: absolute; left: 0; top: 0; width: 100%; }
            }
          `}
        </style>

        {/* ACTUAL INVOICE CONTENT */}
        <div id="printable-invoice-area" className="p-8 text-[13px] text-black leading-tight border-2 border-black m-4 print:m-0 print:border-none">
          
          <div className="text-center font-bold text-xl border-b-2 border-black py-2 tracking-widest uppercase">
            Tax Invoice
          </div>

          {/* HEADER ROW */}
          <div className="flex border-b-2 border-black">
            <div className="w-1/2 border-r-2 border-black p-3">
              <h2 className="font-extrabold text-lg text-red-700 print:text-black">MAHARASHTRA MANDAL, RAIPUR</h2>
              <p>G.E. ROAD, CHOUBEY COLONY,</p>
              <p>RAIPUR</p>
              <p className="mt-3"><strong>PAN:</strong> AABTM5711H</p>
              <p><strong>GSTIN/UIN:</strong> 22AABTM5711H1ZY</p>
              <p><strong>State Name:</strong> Chhattisgarh, Code: 22</p>
              <p><strong>Contact:</strong> 0771-2254434, +91-76470-83603</p>
              <p><strong>E-Mail:</strong> maharashtramandalraipur@gmail.com</p>
            </div>
            
            <div className="w-1/2 flex flex-col">
              <div className="border-b-2 border-black p-3 flex justify-between h-1/2">
                <div>
                  <p className="text-gray-600 font-semibold mb-1">Invoice No.</p>
                  <p className="font-bold text-base">{invoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600 font-semibold mb-1">Dated</p>
                  <p className="font-bold text-base">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</p>
                </div>
              </div>
              <div className="p-3 h-1/2">
                <p className="text-gray-600 font-semibold mb-1">Ref. No.</p>
                <p className="font-bold text-base">BHAWAN / {booking.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* PARTY DETAILS */}
          <div className="border-b-2 border-black p-3">
            <p>Party: <strong className="text-base ml-2">{invoice.customerName.toUpperCase()}</strong></p>
            <p className="mt-1">{invoice.billingAddress || "RAIPUR"}</p>
            <p className="mt-1">CONT NO. {invoice.customerPhone}</p>
            <p className="mt-1">State Name: Chhattisgarh, Code: 22</p>
            <p>Place of Supply: Chhattisgarh</p>
          </div>

          {/* ITEMS TABLE */}
          <table className="w-full text-left border-b-2 border-black">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100 print:bg-transparent">
                <th className="border-r-2 border-black p-2 w-12 text-center">SI No.</th>
                <th className="border-r-2 border-black p-2">Particulars</th>
                <th className="border-r-2 border-black p-2 w-24 text-center">HSN/SAC</th>
                <th className="border-r-2 border-black p-2 w-20 text-center">GST Rate</th>
                <th className="border-r-2 border-black p-2 w-20 text-center">Qty</th>
                <th className="border-r-2 border-black p-2 w-24 text-right">Rate</th>
                <th className="border-r-2 border-black p-2 w-12 text-center">per</th>
                <th className="p-2 w-32 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="h-[300px] align-top">
                <td className="border-r-2 border-black p-2 text-center">1</td>
                <td className="border-r-2 border-black p-3">
                  <p className="font-bold mb-2">BOOKING & FACILITY CHARGES</p>
                  <p className="text-xs font-semibold whitespace-pre-wrap uppercase text-gray-700">{booking?.facility?.name || booking?.eventType}</p>
                  <p className="text-[11px] uppercase mt-1 mb-4 text-gray-600">PROGRAM DATE: {new Date(booking?.schedule?.startTime).toLocaleDateString('en-IN')}</p>
                  
                  {/* Additional Deductions Map */}
                  {Number(invoice.electricityCharges) > 0 && <p className="text-[11px] mb-1">• Electricity Charges ({invoice.electricityUnitsConsumed} units)</p>}
                  {Number(invoice.cleaningCharges) > 0 && <p className="text-[11px] mb-1">• Cleaning / Maintenance Charges</p>}
                  {Number(invoice.generatorCharges) > 0 && <p className="text-[11px] mb-1">• Generator Charges</p>}
                  {invoice.damagesAndPenalties?.map((p, i) => <p key={i} className="text-[11px] mb-1">• Penalty: {p.reason}</p>)}
                  
                  <div className="mt-8 text-right pr-4 space-y-2">
                    <p className="font-bold">CGST @ 2.5%</p>
                    <p className="font-bold">SGST @ 2.5%</p>
                  </div>
                </td>
                <td className="border-r-2 border-black p-2 text-center">9963</td>
                <td className="border-r-2 border-black p-2 text-center">5%</td>
                <td className="border-r-2 border-black p-2 text-center">1</td>
                <td className="border-r-2 border-black p-2 text-right">{totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td className="border-r-2 border-black p-2 text-center"></td>
                <td className="p-2 text-right">
                  <p className="mb-[118px]">{totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  <div className="space-y-2">
                    <p>{Number(invoice.cgstAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                    <p>{Number(invoice.sgstAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  </div>
                </td>
              </tr>
              <tr className="border-t-2 border-black bg-gray-50 print:bg-transparent">
                <td colSpan="7" className="border-r-2 border-black p-2 text-right font-extrabold text-base">Total</td>
                <td className="p-2 text-right font-extrabold text-base">{grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              </tr>
            </tbody>
          </table>

          {/* LOWER SECTION */}
          <div className="p-3 border-b-2 border-black flex justify-between items-center">
             <div>
               <p className="text-gray-600 font-semibold mb-1">Amount Chargeable (in words)</p>
               <p className="font-bold italic">{numberToWords(grandTotal)}</p>
             </div>
             <div className="text-right italic font-semibold mr-4">E. & O.E</div>
          </div>

          {/* BANK DETAILS & SIGNATURE */}
          <div className="flex">
            <div className="w-1/2 border-r-2 border-black p-3">
              <p className="font-bold underline mb-2">Company's Bank Details</p>
              <table className="text-xs w-full">
                <tbody>
                  <tr><td className="py-1 w-32 text-gray-600">A/c Holder's Name</td><td className="font-bold">: MAHARASHTRA MANDAL</td></tr>
                  <tr><td className="py-1 text-gray-600">Bank Name</td><td className="font-bold">: BANK OF INDIA</td></tr>
                  <tr><td className="py-1 text-gray-600">A/c No.</td><td className="font-bold">: 935220110000406</td></tr>
                  <tr><td className="py-1 text-gray-600">Branch & IFS Code</td><td className="font-bold">: PACHPEDI NAKA & BKID0009352</td></tr>
                </tbody>
              </table>
            </div>
            
            <div className="w-1/2 p-3 flex flex-col justify-between">
              <div>
                <p className="font-bold underline mb-1">Declaration</p>
                <p className="text-xs text-gray-600 italic">We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.</p>
              </div>
              <div className="text-right mt-12">
                <p className="font-bold">for MAHARASHTRA MANDAL, RAIPUR</p>
                <p className="mt-8 text-gray-500 italic">Authorised Signatory</p>
              </div>
            </div>
          </div>
          
          <div className="text-center text-[10px] text-gray-500 py-1 border-t-2 border-black bg-gray-100 print:bg-transparent">
             This is a Computer Generated Invoice
          </div>

        </div>
      </div>
    </div>
  );
}