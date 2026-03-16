import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Users, MapPin, Info, Clock, Plus, Minus, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../store/useAuthStore';

// Utility to handle timezone offsets for datetime-local inputs
const toLocalISOString = (date) => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function BookingWizard() {
  const { facilityId } = useParams();
  const isCustomMode = facilityId === 'custom';
  
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [facility, setFacility] = useState(null);
  const [extraItems, setExtraItems] = useState([]); 
  const [selectedExtras, setSelectedExtras] = useState({}); 
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    guestCount: 1,
    eventType: 'Marriage'
  });

  const [availability, setAvailability] = useState(null);
  const [partialAvailability, setPartialAvailability] = useState(null); 
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initial Load of Facilities
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const response = await api.get('/facilities');
        const facilities = response.data.data;
        
        if (isCustomMode) {
          setFacility({
            id: 'custom',
            name: 'Build Your Custom Booking',
            description: 'Select the specific facilities you need by ticking the boxes below.',
            baseRate: 0,
            pricingType: 'MIXED'
          });
          const customOptions = facilities.filter(f => f.facilityType !== 'PACKAGE' && f.facilityType !== 'COMPLEX');
          setExtraItems(customOptions.map(item => ({ ...item, isAvailableForDates: true })));
        
        } else {
          const found = facilities.find(f => f.id === facilityId);
          if (found) setFacility(found);
          else toast.error('Facility not found');
          
          let extras = [];
          if (found?.name?.toLowerCase().includes('complete bhavan')) {
             extras = facilities.filter(f => f.name.toLowerCase().includes('mini hall'));
          }

          setExtraItems(extras.map(item => ({ ...item, isAvailableForDates: true })));
        }
      } catch (error) {
        toast.error('Failed to load details');
      } finally {
        setLoading(false);
      }
    };
    fetchFacilities();
  }, [facilityId, isCustomMode]);

  // 2. Dynamic Live Availability Check for Items
  useEffect(() => {
    const checkItemAvailability = async () => {
      if (formData.startTime && formData.endTime) {
        try {
          const response = await api.get(`/facilities?startDate=${formData.startTime}&endDate=${formData.endTime}`);
          const updatedFacilities = response.data.data;
          
          setExtraItems(prevItems => 
            prevItems.map(item => {
              const updatedItem = updatedFacilities.find(f => f.id === item.id);
              return updatedItem ? { ...item, isAvailableForDates: updatedItem.isAvailableForDates } : item;
            })
          );

          setSelectedExtras(prev => {
            const newSelected = { ...prev };
            let itemsRemoved = false;
            for (const id in newSelected) {
              const updatedItem = updatedFacilities.find(f => f.id === id);
              if (updatedItem && updatedItem.isAvailableForDates === false) {
                delete newSelected[id];
                itemsRemoved = true;
              }
            }
            if (itemsRemoved) toast.warn("Some selected items were removed because they are not available for these new dates.");
            return newSelected;
          });

        } catch (error) {
          console.error("Failed to check live availability", error);
        }
      } else {
        setExtraItems(prevItems => prevItems.map(item => ({ ...item, isAvailableForDates: true })));
      }
    };

    const timeoutId = setTimeout(() => {
      checkItemAvailability();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.startTime, formData.endTime]);


  // 3. SMART TIMING LOGIC
  useEffect(() => {
    if (!formData.startTime || !facility) return;

    const startDate = new Date(formData.startTime);
    let newEndDate = formData.endTime ? new Date(formData.endTime) : null;

    if (facility.name?.includes('Day Room')) {
      const forcedStart = new Date(startDate);
      forcedStart.setHours(10, 0, 0, 0); 
      const forcedEnd = new Date(forcedStart);
      forcedEnd.setDate(forcedEnd.getDate() + 1);
      forcedEnd.setHours(8, 0, 0, 0); 

      if (formData.startTime !== toLocalISOString(forcedStart) || formData.endTime !== toLocalISOString(forcedEnd)) {
        setFormData(prev => ({ ...prev, startTime: toLocalISOString(forcedStart), endTime: toLocalISOString(forcedEnd) }));
      }
      return; 
    }

    if (facility.pricingType === 'SLOT' && facility.pricingDetails?.duration_hours) {
      const durationMs = facility.pricingDetails.duration_hours * 60 * 60 * 1000;
      const exactEndDate = new Date(startDate.getTime() + durationMs);
      if (formData.endTime !== toLocalISOString(exactEndDate)) {
        setFormData(prev => ({ ...prev, endTime: toLocalISOString(exactEndDate) }));
      }
      return; 
    }

    if (facility.name === 'Meeting Hall') {
      const suggestedStart = new Date(startDate);
      if (suggestedStart.getHours() < 18) {
        suggestedStart.setHours(18, 0, 0, 0);
        if (formData.startTime !== toLocalISOString(suggestedStart)) {
           setFormData(prev => ({ ...prev, startTime: toLocalISOString(suggestedStart) }));
        }
      }
      if (!newEndDate) {
        const defaultEnd = new Date(suggestedStart);
        defaultEnd.setHours(suggestedStart.getHours() + 5);
        setFormData(prev => ({ ...prev, endTime: toLocalISOString(defaultEnd) }));
      }
      return;
    }

    if (!newEndDate || newEndDate <= startDate) {
      const nextDay = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      setFormData(prev => ({ ...prev, endTime: toLocalISOString(nextDay) }));
    }
  }, [formData.startTime, facility]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setAvailability(null);
    setPartialAvailability(null);
  };

  // NEW: Checkbox Handler
  const handleCheckboxChange = (id, isChecked) => {
    setSelectedExtras(prev => {
      if (isChecked) {
        return { ...prev, [id]: 1 }; // Default quantity to 1 when checked
      } else {
        const { [id]: _, ...rest } = prev; // Remove item if unchecked
        return rest;
      }
    });
    setAvailability(null);
    setPartialAvailability(null);
  };

  // Quantity Handler (Only used for items like Mattresses)
  const handleQuantityChange = (id, delta) => {
    setSelectedExtras(prev => {
      const current = prev[id] || 1;
      const next = Math.max(1, current + delta); // Prevent dropping below 1 via this button
      return { ...prev, [id]: next };
    });
    setAvailability(null);
    setPartialAvailability(null);
  };

  const buildPayload = (isBookingPartial = false) => {
    const userSelectedCustoms = Object.entries(selectedExtras).map(([id, quantity]) => ({
      facilityId: id,
      quantity
    }));

    if (isCustomMode) return { ...formData, customFacilities: userSelectedCustoms };

    if (isBookingPartial && partialAvailability) {
      const remainingCustoms = partialAvailability.availableAlternatives.map(alt => ({
        facilityId: alt.facilityId,
        quantity: alt.quantity || 1
      }));
      return { ...formData, customFacilities: [...remainingCustoms, ...userSelectedCustoms] };
    }

    return { facilityId, ...formData, customFacilities: userSelectedCustoms };
  };

  const handleCheckAvailability = async () => {
    if (!formData.startTime || !formData.endTime) return toast.warn('Please select both start and end times.');
    if (isCustomMode && Object.keys(selectedExtras).length === 0) return toast.warn('Please select at least one item for your custom booking.');
    
    setIsChecking(true);
    setPartialAvailability(null);
    try {
      const response = await api.post('/bookings/check-availability', buildPayload(false));
      const data = response.data.data;
      
      if (data.isAvailable) {
        setAvailability(data);
        toast.success('Dates are available!');
      } else if (data.isPartiallyAvailable) {
        setPartialAvailability(data);
        toast.warn('Package is partially booked. Review remaining options.');
      } else {
        setAvailability(data);
        toast.error(data.message || 'Dates are currently fully booked.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error checking availability');
    } finally {
      setIsChecking(false);
    }
  };

  const handleBookNow = async (isBookingPartial = false) => {
    if (!isAuthenticated) {
      toast.info('Please log in to complete your booking.');
      return navigate('/user/login');
    }

    setIsSubmitting(true);
    try {
      await api.post('/bookings', buildPayload(isBookingPartial));
      toast.success('Booking requested successfully!');
      navigate('/my-bookings'); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !facility) return <div className="p-20 text-center text-xl text-gray-500">Loading facility data...</div>;

  const extrasTotal = Object.entries(selectedExtras).reduce((total, [id, quantity]) => {
    const item = extraItems.find(i => i.id === id);
    return total + (item ? parseInt(item.baseRate) * quantity : 0);
  }, 0);

  const liveTotal = isCustomMode ? extrasTotal : parseInt(facility.baseRate) + extrasTotal;

  const isStrictSlot = facility.pricingType === 'SLOT' && facility.pricingDetails?.duration_hours;
  const isDayRoom = facility.name?.includes('Day Room');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-12">
      
      {/* Left Column: Info & Add-ons */}
      <div className="md:w-2/3">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{facility.name}</h1>
        <p className="text-gray-600 leading-relaxed text-lg border-b pb-6 mb-6">{facility.description}</p>
        
        {extraItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {isCustomMode ? 'Select your facilities' : 'Add Extras to your booking'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {extraItems.map(item => {
                const isMiniHall = item.name.toLowerCase().includes('mini hall');
                const isSoldOut = item.isAvailableForDates === false;
                const isSelected = !!selectedExtras[item.id];
                
                return (
                  <div key={item.id} className={`border rounded-lg p-4 flex justify-between items-center transition shadow-sm ${isSoldOut ? 'bg-gray-100 opacity-60 cursor-not-allowed grayscale' : (isSelected ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white hover:shadow-md hover:border-blue-200')}`}>
                    
                    {/* Checkbox and Label */}
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        id={`facility-${item.id}`}
                        checked={isSelected}
                        onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                        disabled={isSoldOut}
                        className="w-5 h-5 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div>
                        <label htmlFor={`facility-${item.id}`} className={`font-semibold cursor-pointer ${isSoldOut ? 'text-gray-500 line-through' : (isMiniHall ? 'text-orange-800' : 'text-gray-800')}`}>
                          {item.name} {isMiniHall && !isSoldOut && <span className="text-[10px] uppercase font-bold bg-orange-200 text-orange-800 px-2 py-0.5 rounded ml-2">Premium Add-on</span>}
                        </label>
                        <p className="text-sm text-gray-500">₹{parseInt(item.baseRate).toLocaleString('en-IN')} {item.pricingType === 'HOURLY' ? '/ hr' : ''}</p>
                        {isSoldOut && <p className="text-xs font-bold text-red-600 mt-1">Sold out for these dates</p>}
                      </div>
                    </div>
                    
                    {/* Quantity Selector ONLY for items that allow multiple (like Extra Mattress) */}
                    {isSelected && item.pricingType === 'PER_ITEM' && (
                      <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-white shadow-sm">
                        <button onClick={() => handleQuantityChange(item.id, -1)} disabled={selectedExtras[item.id] <= 1} className="text-gray-500 hover:text-gray-800 disabled:opacity-30"><Minus size={14}/></button>
                        <span className="font-bold w-4 text-center text-sm">{selectedExtras[item.id]}</span>
                        <button onClick={() => handleQuantityChange(item.id, 1)} className="text-gray-500 hover:text-gray-800"><Plus size={14}/></button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!isCustomMode && extraItems.length === 0 && (
           <div className="p-4 bg-blue-50 text-blue-800 rounded-lg flex items-start gap-3">
              <Package className="shrink-0 mt-1" />
              <div>
                <h3 className="font-bold">Standard Package</h3>
                <p className="text-sm mt-1">This is a fixed package. The items included cannot be customized or removed.</p>
              </div>
           </div>
        )}
      </div>

      {/* Right Column: Booking Widget */}
      <div className="md:w-1/3 relative">
        <div className="sticky top-28 bg-white border rounded-xl shadow-xl p-6">
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-3xl font-bold text-gray-900">₹{liveTotal.toLocaleString('en-IN')}</span>
            <span className="text-gray-500 text-sm ml-1">{isCustomMode ? 'custom total' : (extrasTotal > 0 ? 'base + extras' : 'base rate')}</span>
          </div>

          {!isCustomMode && (isStrictSlot || isDayRoom || facility.name === 'Meeting Hall') && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-md flex items-start gap-2 text-indigo-800 text-xs">
              <Clock size={16} className="shrink-0 mt-0.5" />
              <p>
                <strong>Timing Rules:</strong><br/>
                {isDayRoom && "Check-in is locked to 10:00 AM, Check-out is locked to 8:00 AM the next day."}
                {isStrictSlot && `This package is strictly valid for exactly ${facility.pricingDetails.duration_hours} hours.`}
                {facility.name === 'Meeting Hall' && "Available 6:00 PM – 11:00 PM. Extra hours will incur additional charges."}
              </p>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden mb-4">
            <div className="flex border-b">
              <div className={`w-1/2 p-3 border-r ${isDayRoom ? 'bg-gray-100' : ''}`}>
                <label className="block text-xs font-bold text-gray-700 uppercase">Check-in</label>
                <input 
                  type={isDayRoom ? "date" : "datetime-local"} 
                  name="startTime" 
                  value={isDayRoom ? formData.startTime.split('T')[0] : formData.startTime} 
                  onChange={handleChange} 
                  min={new Date().toISOString().split('T')[0]} 
                  className="w-full text-sm outline-none mt-1 bg-transparent" 
                />
                {isDayRoom && <div className="text-xs text-indigo-600 font-bold mt-1">@ 10:00 AM</div>}
              </div>
              <div className={`w-1/2 p-3 ${(isStrictSlot || isDayRoom) ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                <label className="block text-xs font-bold text-gray-700 uppercase">Check-out</label>
                {isDayRoom ? (
                  <>
                    <input type="date" disabled value={formData.endTime.split('T')[0]} className="w-full text-sm outline-none mt-1 bg-transparent cursor-not-allowed text-gray-500" />
                    <div className="text-xs text-indigo-600 font-bold mt-1">@ 08:00 AM</div>
                  </>
                ) : (
                  <input 
                    type="datetime-local" 
                    name="endTime" 
                    value={formData.endTime} 
                    onChange={handleChange} 
                    disabled={isStrictSlot} 
                    className={`w-full text-sm outline-none mt-1 bg-transparent ${isStrictSlot ? 'cursor-not-allowed text-gray-500' : ''}`} 
                  />
                )}
              </div>
            </div>
            <div className="p-3 border-b">
              <label className="block text-xs font-bold text-gray-700 uppercase">Guests</label>
              <input type="number" min="1" name="guestCount" value={formData.guestCount} onChange={handleChange} className="w-full text-sm outline-none mt-1" />
            </div>
            <div className="p-3">
              <label className="block text-xs font-bold text-gray-700 uppercase">Event Type</label>
              <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full text-sm outline-none mt-1 bg-transparent">
                <option value="Marriage">Marriage</option>
                <option value="Meeting">Meeting / Conference</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

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
          ) 
          
          : availability?.isAvailable ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 text-green-700 rounded-md flex items-center gap-2 mb-2">
                <CheckCircle size={18}/> <span className="font-semibold text-sm">Dates are available!</span>
              </div>
              <button onClick={() => handleBookNow(false)} disabled={isSubmitting} className="w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 transition disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Request to Book'}
              </button>
              <div className="pt-4 border-t space-y-2 text-sm text-gray-700">
                <div className="flex justify-between font-bold"><span>Total Required</span><span>₹{availability.pricing?.estimatedTotal?.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          ) 
          
          : (
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
      </div>
    </div>
  );
}