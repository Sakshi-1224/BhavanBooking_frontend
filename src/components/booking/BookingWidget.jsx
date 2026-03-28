import React from 'react';
import { Calendar, Users, Clock } from 'lucide-react';

export default function BookingWidget({
  facility,
  availability,
  partialAvailability,
  isCustomMode,
  needsEndDate,
  hasRoom,
  isOnlyMiniHall,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  // NEW PROPS FOR TIME SELECTION
  startTimeInput,
  setStartTimeInput,
  
  bookingOption,
  setBookingOption,
  selectedSlot,
  setSelectedSlot,
  formData,
  handleChange,
  handleCheckAvailability,
  handleBookNow,
  isChecking,
  isSubmitting,
  isStaff
}) {

  // Safety checks
  const isTiered = facility?.pricingType === 'TIERED';
  const isSlot = facility?.pricingType === 'SLOT';
  const slotType = facility?.pricingDetails?.slotType;
  const slots = facility?.pricingDetails?.slots || [];

  return (
    <div className="bg-white rounded-2xl shadow-xl border p-6 sticky top-24">
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
        {isCustomMode ? 'Check Custom Availability' : 'Book this Space'}
      </h2>

      <div className="space-y-5">
        
        {/* === CALENDAR DATE SELECTION === */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
            <Calendar size={16} className="text-blue-600"/> 
            {needsEndDate ? 'Check-in Date' : 'Event Date'}
          </label>
          <input 
            type="date" 
            min={new Date().toISOString().split('T')[0]}
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" 
          />
        </div>

        {/* === MULTI-DAY / HOURLY END DATE === */}
        {needsEndDate && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              <Calendar size={16} className="text-orange-500"/> Check-out Date
            </label>
            <input 
              type="date" 
              min={startDate || new Date().toISOString().split('T')[0]}
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" 
              disabled={!startDate}
            />
          </div>
        )}

        {/* === TIERED PRICING (e.g. 1 Day, 2 Days) === */}
        {!isCustomMode && isTiered && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              <Clock size={16} className="text-purple-600"/> Duration
            </label>
            <select 
              value={bookingOption} 
              onChange={(e) => setBookingOption(e.target.value)} 
              className="w-full border p-3 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Duration...</option>
              <option value="1_day">1 Day (10 AM to next day 10 AM)</option>
              <option value="2_days">2 Days (48 Hours)</option>
              <option value="3_days">3 Days (72 Hours)</option>
            </select>
          </div>
        )}

        {/* === DYNAMIC SLOT BUILDER === */}
        {!isCustomMode && isSlot && startDate && (
          <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-blue-600"/> 
              {slotType === 'FIXED' ? 'Select Available Shift' : 'Flexible Duration'}
            </label>

            {slotType === 'FIXED' ? (
              <div className="grid grid-cols-1 gap-3">
                {slots.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No shifts configured by admin.</p>
                ) : (
                  slots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        selectedSlot?.id === slot.id 
                          ? 'border-blue-600 bg-blue-100/50 shadow-sm' 
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <span className="block font-bold text-gray-900">{slot.label}</span>
                      <span className="block text-xs text-gray-600 mt-0.5">
                        {slot.startTime} to {slot.endTime}
                      </span>
                      <span className="block font-extrabold text-green-700 mt-1">
                        ₹{Number(slot.price).toLocaleString('en-IN')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border-2 border-blue-200">
                <span className="block text-sm font-medium text-gray-600">Required Duration: <span className="font-bold text-gray-900">{facility.pricingDetails?.durationHours} Hours</span></span>
                
                {/* 🚨 NEW: Time Picker for Flexible Slots 🚨 */}
                <div className="mt-4">
                   <label className="block text-xs font-bold text-gray-700 mb-1">Select Start Time</label>
                   <input 
                     type="time" 
                     value={startTimeInput} 
                     onChange={(e) => setStartTimeInput(e.target.value)} 
                     className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                   />
                </div>
                
                {startTimeInput && (
                  <p className="text-xs text-green-700 mt-3 font-semibold bg-green-50 p-2 rounded">
                    Check-out will be automatically calculated as {facility.pricingDetails?.durationHours} hours from {startTimeInput}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* === GUEST COUNT === */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
            <Users size={16} className="text-green-600"/> Expected Guests
          </label>
          <input 
            type="number" min="1" max={facility?.capacity || 2000} 
            name="guestCount" value={formData.guestCount} onChange={handleChange} 
            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" 
          />
        </div>
      </div>

      {/* === AVAILABILITY & BOOKING BUTTONS === */}
      <div className="mt-8 space-y-3">
        {(!availability || !availability.isAvailable) && !partialAvailability && (
          <button 
            onClick={handleCheckAvailability} 
            disabled={
              isChecking || 
              !startDate || 
              (needsEndDate && !endDate) || 
              (isSlot && slotType === 'FIXED' && !selectedSlot) ||
              (isSlot && slotType === 'FLEXIBLE' && !startTimeInput) // 🚨 NEW: Disable if time not picked
            } 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-md disabled:opacity-50"
          >
            {isChecking ? 'Checking System...' : 'Check Availability'}
          </button>
        )}

        {availability && availability.isAvailable && (
          <div className="animate-fade-in">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <p className="text-green-800 font-bold flex justify-between">
                <span>Total Amount:</span> 
                <span className="text-xl">₹{availability.pricing?.estimatedTotal?.toLocaleString('en-IN') || 0}</span>
              </p>
              <p className="text-green-600 text-sm mt-1">Includes ₹{availability.pricing?.securityDepositRequired || 0} security deposit.</p>
            </div>
            <button 
              onClick={() => handleBookNow(false)} 
              disabled={isSubmitting} 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold text-lg py-4 rounded-xl transition shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : isStaff ? 'Confirm & Book (Staff)' : 'Proceed to Book'}
            </button>
          </div>
        )}

        {partialAvailability && (
          <div className="animate-fade-in border-2 border-orange-300 bg-orange-50 rounded-xl p-4 mt-4">
            <h3 className="font-bold text-orange-800 mb-2">⚠️ Partial Availability</h3>
            <p className="text-sm text-orange-700 mb-3">Some selected items are booked. We can offer this alternative package:</p>
            <ul className="text-sm space-y-1 mb-4 font-medium text-gray-700 bg-white p-3 rounded border">
               {partialAvailability.availableAlternatives?.map((alt, idx) => (
                 <li key={idx} className="flex justify-between border-b pb-1 last:border-0 last:pb-0">
                   <span>{alt.name}</span> <span className="text-green-600">₹{alt.baseRate}</span>
                 </li>
               ))}
            </ul>
            <p className="text-orange-900 font-bold flex justify-between items-end mb-4">
              <span>New Total (Base):</span> 
              <span className="text-xl">
                ₹{partialAvailability.availableAlternatives?.reduce((sum, alt) => sum + Number(alt.baseRate), 0).toLocaleString('en-IN')}
              </span>
            </p>
            <button 
              onClick={() => handleBookNow(true)} 
              disabled={isSubmitting} 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition shadow disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Accept Partial & Book'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}