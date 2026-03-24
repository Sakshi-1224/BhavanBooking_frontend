import { Info, Clock, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';

export default function BookingWidget({
  facility, availability, partialAvailability, isCustomMode, needsEndDate, hasRoom, isOnlyMiniHall,
  startDate, setStartDate, endDate, setEndDate, bookingOption, setBookingOption,
  formData, handleChange, handleCheckAvailability, handleBookNow, isChecking, isSubmitting, isStaff
}) {

  // Reset availability when dates change
  const onDateChange = (setter, value) => {
    setter(value);
    // Passing null logic up is handled by parent or we just don't do it here and let useEffect in parent handle it. 
    // Wait, let's keep the parent's reset logic by calling the setters passed down if needed, but it's easier to just use the setters.
  };

  return (
    <div className="sticky top-28 bg-white border rounded-xl shadow-xl p-6">
      <h3 className="text-xl font-bold mb-4 border-b pb-2">Price Summary</h3>
      
      {availability?.pricing ? (
        <div className="flex flex-col mb-6 bg-gray-50 p-4 rounded-lg border">
          <div className="flex justify-between items-center text-gray-600 mb-2">
            <span className="text-sm">Calculated Base Amount:</span>
            <span className="font-semibold">₹{Number(availability.pricing.baseCalculatedAmount).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center text-gray-600 mb-3 border-b border-gray-200 pb-3">
            <span className="text-sm">Security Deposit (Refundable):</span>
            <span className="font-semibold">₹{Number(availability.pricing.securityDepositRequired).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-baseline gap-1 mt-1">
            <span className="text-gray-800 font-bold">Total Required:</span>
            <span className="text-3xl font-extrabold text-blue-700">₹{Number(availability.pricing.estimatedTotal).toLocaleString('en-IN')}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
           <div className="flex justify-between items-center text-gray-600 mb-2">
              <span className="text-sm">Starting from:</span>
              <span className="font-semibold">₹{facility?.baseRate ? parseInt(facility.baseRate).toLocaleString('en-IN') : '0'}/day</span>
            </div>
          <p className="text-sm text-yellow-800 mt-2 text-center">
            Please select your dates and click <strong>"Check Availability"</strong> to see the exact pricing based on your selections.
          </p>
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden mb-4 bg-gray-50">
        {needsEndDate ? (
          <div className="flex border-b bg-white">
            <div className="w-1/2 p-3 border-r">
              <label className="block text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                <Calendar size={14} /> Check-in Date
              </label>
              <input 
                type="date" value={startDate} 
                onChange={(e) => onDateChange(setStartDate, e.target.value)} 
                min={new Date().toISOString().split('T')[0]} 
                className="w-full text-sm outline-none mt-2 bg-transparent cursor-pointer" 
              />
            </div>
            <div className="w-1/2 p-3">
              <label className="block text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                <Calendar size={14} /> Check-out Date
              </label>
              <input 
                type="date" value={endDate} 
                onChange={(e) => onDateChange(setEndDate, e.target.value)} 
                min={startDate || new Date().toISOString().split('T')[0]} 
                className="w-full text-sm outline-none mt-2 bg-transparent cursor-pointer" 
              />
            </div>
          </div>
        ) : (
          <div className="p-3 border-b bg-white">
            <label className="block text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
              <Calendar size={14} /> Event Date
            </label>
            <input 
              type="date" value={startDate} 
              onChange={(e) => onDateChange(setStartDate, e.target.value)} 
              min={new Date().toISOString().split('T')[0]} 
              className="w-full text-sm outline-none mt-2 bg-transparent cursor-pointer" 
            />
          </div>
        )}

        {isCustomMode ? (
          <div className="p-3 border-b bg-indigo-50 text-indigo-800 text-xs">
            <Clock size={14} className="inline mr-1 mb-0.5" />
            <strong>Timing is locked based on selected items.</strong><br/>
            {hasRoom ? "10:00 AM to 08:00 AM (Next Day)" : isOnlyMiniHall ? "06:00 PM to 11:00 PM" : "08:00 AM to 11:00 PM"}
          </div>
        ) : (
          <>
            {facility.pricingType === 'TIERED' && (
              <div className="p-3 border-b bg-white">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Duration</label>
                <select value={bookingOption} onChange={e => onDateChange(setBookingOption, e.target.value)} className="w-full text-sm outline-none bg-transparent">
                  <option value="">-- Select Duration --</option>
                  <option value="1_day">1 Day (10:00 AM - Next Day 10:00 AM)</option>
                  <option value="2_days">2 Days (10:00 AM - Day 3 10:00 AM)</option>
                  <option value="3_days">3 Days (10:00 AM - Day 4 10:00 AM)</option>
                </select>
              </div>
            )}

            {facility.pricingType === 'SLOT' && facility.pricingDetails?.half_day && (
              <div className="p-3 border-b bg-white">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Time Slot</label>
                <select value={bookingOption} onChange={e => onDateChange(setBookingOption, e.target.value)} className="w-full text-sm outline-none bg-transparent">
                  <option value="">-- Select Time Slot --</option>
                  <option value="morning">Morning Half-Day (08:00 AM - 04:00 PM)</option>
                  <option value="evening">Evening Half-Day (04:00 PM - 11:00 PM)</option>
                  <option value="full">Full Day (08:00 AM - 11:00 PM)</option>
                </select>
              </div>
            )}

            {facility.pricingType === 'SLOT' && facility.pricingDetails?.duration_hours && (
              <div className="p-3 border-b bg-white">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Time Slot (6 Hours)</label>
                <select value={bookingOption} onChange={e => onDateChange(setBookingOption, e.target.value)} className="w-full text-sm outline-none bg-transparent">
                  <option value="">-- Select Time Slot --</option>
                  <option value="morning">Morning Slot (10:00 AM - 04:00 PM)</option>
                  <option value="evening">Evening Slot (05:00 PM - 11:00 PM)</option>
                </select>
              </div>
            )}

            {(facility.pricingType === 'FIXED' || facility.pricingType === 'HOURLY' || facility.facilityType === 'ROOM') && (
              <div className="p-3 border-b bg-indigo-50 text-indigo-800 text-xs">
                <Clock size={14} className="inline mr-1 mb-0.5" />
                <strong>Timing: </strong> 
                {facility.facilityType === 'ROOM' ? "10:00 AM - 08:00 AM (Next Day)" : 
                 facility.pricingType === 'HOURLY' ? "06:00 PM - 11:00 PM (Evening Slot)" : 
                 "08:00 AM – 08:00 AM (Next Day)"}
              </div>
            )}
          </>
        )}

        {formData.startTime && formData.endTime && (
          <div className="p-3 bg-gray-100 border-b text-xs text-gray-600">
            <p><strong>Overall Check-in:</strong> {new Date(formData.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short'})}</p>
            <p><strong>Overall Check-out:</strong> {new Date(formData.endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short'})}</p>
          </div>
        )}

        <div className="flex border-b bg-white">
            <div className="w-1/2 p-3 border-r">
                <label className="block text-xs font-bold text-gray-700 uppercase">Guests</label>
                <input type="number" min="1" name="guestCount" value={formData.guestCount} onChange={handleChange} className="w-full text-sm outline-none mt-1 bg-transparent" />
            </div>
            <div className="w-1/2 p-3">
                <label className="block text-xs font-bold text-gray-700 uppercase">Event Type</label>
                <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full text-sm outline-none mt-1 bg-transparent">
                    <option value="Marriage">Marriage</option>
                    <option value="Meeting">Meeting / Conference</option>
                    <option value="Other">Other</option>
                </select>
            </div>
        </div>
      </div>

      {/* Submission Buttons */}
      {partialAvailability ? (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex gap-2 items-start mb-2">
              <AlertTriangle size={20} className="text-yellow-600 shrink-0" />
              <h3 className="font-bold text-yellow-800 text-sm">Partially Booked!</h3>
            </div>
            <p className="text-xs text-yellow-700 mb-3">{partialAvailability.message}</p>
            <p className="text-xs text-red-800 font-semibold mb-1 border-t border-yellow-200 pt-2">Already Booked:</p>
            <ul className="text-xs text-red-600 list-disc pl-4 mb-3">
              {partialAvailability.unavailableComponents?.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <p className="text-xs text-green-800 font-semibold mb-1 border-t border-yellow-200 pt-2">What you get:</p>
            <ul className="text-xs text-green-700 list-disc pl-4 mb-3">
              {partialAvailability.availableAlternatives?.map((item, i) => <li key={i}>{item.name}</li>)}
            </ul>
          </div>
          <button onClick={() => handleBookNow(true)} disabled={isSubmitting} className="w-full py-3 rounded-lg text-white font-semibold bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50">
            {isSubmitting ? 'Submitting...' : 'Book Remaining Spaces'}
          </button>
        </div>
      ) : availability?.isAvailable ? (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 text-green-700 rounded-md flex items-center gap-2 mb-2">
            <CheckCircle size={18}/> <span className="font-semibold text-sm">Dates are available!</span>
          </div>
          <button onClick={() => handleBookNow(false)} disabled={isSubmitting} className="w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 transition disabled:opacity-50 shadow-lg">
            {isSubmitting ? 'Submitting...' : isStaff ? 'Request Staff Booking' : 'Request to Book'}
          </button>
        </div>
      ) : (
        <>
          <button onClick={handleCheckAvailability} disabled={isChecking} className="w-full py-3 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50">
            {isChecking ? 'Checking...' : 'Check Availability'}
          </button>
          
          {availability && !availability.isAvailable && !partialAvailability && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0" />
              <p>{availability.message || 'These dates are completely booked.'}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}