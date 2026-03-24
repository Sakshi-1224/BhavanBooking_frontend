import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../store/useAuthStore';

// Import our new components
import StaffBookingForm from '../components/booking/StaffBookingForm';
import FacilityExtrasList from '../components/booking/FacilityExtrasList';
import BookingWidget from '../components/booking/BookingWidget';

const toLocalISOString = (date) => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function BookingWizard() {
  const { facilityId } = useParams();
  const isCustomMode = facilityId === 'custom';
  
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuthStore();
  const isStaff = role === 'ADMIN' || role === 'CLERK';

  const [facility, setFacility] = useState(null);
  const [extraItems, setExtraItems] = useState([]); 
  const [selectedExtras, setSelectedExtras] = useState({}); 
  const [loading, setLoading] = useState(true);
  
  // State for Image Gallery
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingOption, setBookingOption] = useState(''); 

  const [formData, setFormData] = useState({ startTime: '', endTime: '', guestCount: 1, eventType: 'Marriage' });
  const [customerData, setCustomerData] = useState({ fullName: '', email: '', mobile: '', address: '' });
  
  const [availability, setAvailability] = useState(null);
  const [partialAvailability, setPartialAvailability] = useState(null); 
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const response = await api.get('/facilities');
        const facilities = response.data.data;
        
        if (isCustomMode) {
          setFacility({
            id: 'custom', name: 'Build Your Custom Booking',
            description: 'Select the specific facilities you need. Timings are fixed automatically as per management rules.',
            baseRate: 0, pricingType: 'MIXED'
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
      } catch (error) { toast.error('Failed to load details'); } finally { setLoading(false); }
    };
    fetchFacilities();
  }, [facilityId, isCustomMode]);

  let isOnlyMiniHall = false;
  let hasRoom = false;

  if (isCustomMode) {
    const selectedIds = Object.keys(selectedExtras);
    if (selectedIds.length === 1 && extraItems.find(i => i.id === selectedIds[0])?.name.toLowerCase().includes('mini hall')) {
      isOnlyMiniHall = true;
    }
    selectedIds.forEach(id => { if (extraItems.find(i => i.id === id)?.facilityType === 'ROOM') hasRoom = true; });
  }

  let needsEndDate = false;
  if (isCustomMode) { needsEndDate = Object.keys(selectedExtras).length > 0 && !isOnlyMiniHall; } 
  else if (facility) { if (facility.pricingType === 'FIXED' || facility.facilityType === 'ROOM') needsEndDate = true; }

  useEffect(() => {
    if (!startDate || !facility) return;
    const start = new Date(startDate);
    let end = new Date(startDate);
    let isValid = false;

    if (needsEndDate) {
      if (!endDate) { setFormData(prev => ({ ...prev, startTime: '', endTime: '' })); return; }
      end = new Date(endDate);
      if (isCustomMode) {
          if (hasRoom) { start.setHours(10, 0); end.setHours(8, 0); } else { start.setHours(8, 0); end.setHours(8, 0); }
          isValid = true;
      } else {
          if (facility.facilityType === 'ROOM') { start.setHours(10, 0); end.setHours(8, 0); } else { start.setHours(8, 0); end.setHours(8, 0); }
          isValid = true;
      }
    } else {
      if (isCustomMode && isOnlyMiniHall) { start.setHours(18, 0); end.setHours(23, 0); isValid = true; } 
      else if (!isCustomMode) {
          if (facility.pricingType === 'TIERED') {
            if (bookingOption === '1_day') { start.setHours(10, 0); end.setDate(end.getDate() + 1); end.setHours(10, 0); isValid = true; }
            else if (bookingOption === '2_days') { start.setHours(10, 0); end.setDate(end.getDate() + 2); end.setHours(10, 0); isValid = true; }
            else if (bookingOption === '3_days') { start.setHours(10, 0); end.setDate(end.getDate() + 3); end.setHours(10, 0); isValid = true; }
          } 
          else if (facility.pricingType === 'SLOT' && facility.pricingDetails?.half_day) {
            if (bookingOption === 'morning') { start.setHours(8, 0); end.setHours(16, 0); isValid = true; }
            else if (bookingOption === 'evening') { start.setHours(16, 0); end.setHours(23, 0); isValid = true; }
            else if (bookingOption === 'full') { start.setHours(8, 0); end.setHours(23, 0); isValid = true; }
          }
          else if (facility.pricingType === 'SLOT' && facility.pricingDetails?.duration_hours) {
            const dur = facility.pricingDetails.duration_hours;
            if (bookingOption === 'morning') { start.setHours(10, 0); end.setHours(10 + dur, 0); isValid = true; }
            else if (bookingOption === 'evening') { start.setHours(17, 0); end.setHours(17 + dur, 0); isValid = true; }
          }
          else if (facility.pricingType === 'HOURLY') { start.setHours(18, 0); end.setHours(23, 0); isValid = true; }
      }
    }

    if (isValid) {
      if (end <= start) {
         toast.error("Check-out must be after check-in.");
         setFormData(prev => ({ ...prev, startTime: '', endTime: '' })); return;
      }
      setFormData(prev => ({ ...prev, startTime: toLocalISOString(start), endTime: toLocalISOString(end) }));
    } else { setFormData(prev => ({ ...prev, startTime: '', endTime: '' })); }
  }, [startDate, endDate, bookingOption, facility, isCustomMode, needsEndDate, hasRoom, isOnlyMiniHall]);

  useEffect(() => {
    const checkItemAvailability = async () => {
      if (formData.startTime && formData.endTime) {
        try {
          const response = await api.get(`/facilities?startDate=${formData.startTime}&endDate=${formData.endTime}`);
          const updatedFacilities = response.data.data;
          setExtraItems(prevItems => prevItems.map(item => {
              const updatedItem = updatedFacilities.find(f => f.id === item.id);
              return updatedItem ? { ...item, isAvailableForDates: updatedItem.isAvailableForDates } : item;
          }));

          setSelectedExtras(prev => {
            const newSelected = { ...prev };
            let itemsRemoved = false;
            for (const id in newSelected) {
              const updatedItem = updatedFacilities.find(f => f.id === id);
              if (updatedItem && updatedItem.isAvailableForDates === false) { delete newSelected[id]; itemsRemoved = true; }
            }
            if (itemsRemoved) toast.warn("Some selected items were removed because they are not available for these dates.");
            return newSelected;
          });
        } catch (error) { console.error("Failed to check live availability", error); }
      } else { setExtraItems(prevItems => prevItems.map(item => ({ ...item, isAvailableForDates: true }))); }
    };
    const timeoutId = setTimeout(() => { checkItemAvailability(); }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.startTime, formData.endTime]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setAvailability(null); setPartialAvailability(null);
  };

  const handleCheckboxChange = (id, isChecked) => {
    setSelectedExtras(prev => {
      if (isChecked) return { ...prev, [id]: 1 };
      const { [id]: _, ...rest } = prev; return rest;
    });
    setAvailability(null); setPartialAvailability(null);
  };

  const handleQuantityChange = (id, delta) => {
    setSelectedExtras(prev => {
      const current = prev[id] || 1; const next = Math.max(1, current + delta); return { ...prev, [id]: next };
    });
    setAvailability(null); setPartialAvailability(null);
  };

  const safeSetStartDate = (val) => { setStartDate(val); setAvailability(null); setPartialAvailability(null); };
  const safeSetEndDate = (val) => { setEndDate(val); setAvailability(null); setPartialAvailability(null); };
  const safeSetBookingOption = (val) => { setBookingOption(val); setAvailability(null); setPartialAvailability(null); };

  const buildPayload = (isBookingPartial = false) => {
    const userSelectedCustoms = Object.entries(selectedExtras).map(([id, quantity]) => ({ facilityId: id, quantity }));
    if (isCustomMode) return { ...formData, customFacilities: userSelectedCustoms };
    if (isBookingPartial && partialAvailability) {
      const remainingCustoms = partialAvailability.availableAlternatives.map(alt => ({ facilityId: alt.facilityId, quantity: alt.quantity || 1 }));
      return { ...formData, customFacilities: [...remainingCustoms, ...userSelectedCustoms] };
    }
    return { facilityId, ...formData, customFacilities: userSelectedCustoms };
  };

  const handleCheckAvailability = async () => {
    if (!formData.startTime || !formData.endTime) return toast.warn('Please complete the date and time selection.');
    if (isCustomMode && Object.keys(selectedExtras).length === 0) return toast.warn('Please select at least one item.');
    
    setIsChecking(true); setPartialAvailability(null);
    try {
      const response = await api.post('/bookings/check-availability', buildPayload(false));
      const data = response.data.data;
      if (data.isAvailable) { setAvailability(data); toast.success('Dates are available!'); } 
      else if (data.isPartiallyAvailable) { setPartialAvailability(data); toast.warn('Package is partially booked.'); } 
      else { setAvailability(data); toast.error(data.message || 'Dates are currently fully booked.'); }
    } catch (error) { toast.error(error.response?.data?.message || 'Error checking availability'); } 
    finally { setIsChecking(false); }
  };

  const handleBookNow = async (isBookingPartial = false) => {
    if (!isAuthenticated) { toast.info('Please log in to complete your booking.'); return navigate('/user/login'); }
    if (isStaff && (!customerData.fullName || !customerData.mobile)) { return toast.warn("Please provide guest's full name and mobile."); }

    setIsSubmitting(true);
    try {
      let finalPayload = buildPayload(isBookingPartial);
      let endpoint = isStaff ? '/bookings/on-behalf' : '/bookings';
      if (isStaff) finalPayload = { ...finalPayload, ...customerData };

      const response = await api.post(endpoint, finalPayload);
      toast.success('Booking requested successfully!');
      
      if (response.data?.data?.isNewUser) toast.info(`A new account was created for ${customerData.fullName}. Credentials sent via SMS/Email.`);

      if (role === 'ADMIN') navigate('/admin/dashboard');
      else if (role === 'CLERK') navigate('/clerk/dashboard');
      else navigate('/my-bookings'); 

    } catch (error) { toast.error(error.response?.data?.message || 'Failed to submit booking'); } 
    finally { setIsSubmitting(false); }
  };

  if (loading || !facility) return <div className="p-20 text-center text-xl text-gray-500">Loading facility data...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-12">
      <div className="md:w-2/3">
        
        {/* --- MAIN FACILITY INTERACTIVE IMAGE GALLERY --- */}
        {!isCustomMode && Array.isArray(facility.images) && facility.images.length > 0 && (
          <div className="mb-6">
            <div className="rounded-2xl overflow-hidden shadow-md h-64 sm:h-96 relative group bg-gray-100 mb-3">
              <img 
                src={facility.images[currentImageIndex]} 
                alt={facility.name} 
                className="w-full h-full object-cover transition-opacity duration-300"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
              <div className="absolute bottom-4 left-4 text-white">
                 <span className="bg-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow">
                   {facility.facilityType}
                 </span>
              </div>
            </div>

            {facility.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 snap-x hide-scrollbar">
                {facility.images.map((img, idx) => (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 transition-all snap-start ${
                      currentImageIndex === idx 
                        ? 'border-blue-600 opacity-100 shadow-md' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`Thumbnail ${idx + 1}`} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{facility.name}</h1>
        <p className="text-gray-600 leading-relaxed text-lg border-b pb-6 mb-6">{facility.description}</p>
        
        {isStaff && <StaffBookingForm customerData={customerData} setCustomerData={setCustomerData} />}
        
        <FacilityExtrasList 
          extraItems={extraItems} 
          selectedExtras={selectedExtras} 
          isCustomMode={isCustomMode} 
          handleCheckboxChange={handleCheckboxChange} 
          handleQuantityChange={handleQuantityChange} 
        />
      </div>

      <div className="md:w-1/3 relative">
        <BookingWidget 
          facility={facility} availability={availability} partialAvailability={partialAvailability} 
          isCustomMode={isCustomMode} needsEndDate={needsEndDate} hasRoom={hasRoom} isOnlyMiniHall={isOnlyMiniHall}
          startDate={startDate} setStartDate={safeSetStartDate} 
          endDate={endDate} setEndDate={safeSetEndDate} 
          bookingOption={bookingOption} setBookingOption={safeSetBookingOption}
          formData={formData} handleChange={handleChange} 
          handleCheckAvailability={handleCheckAvailability} handleBookNow={handleBookNow} 
          isChecking={isChecking} isSubmitting={isSubmitting} isStaff={isStaff}
        />
      </div>
    </div>
  );
}