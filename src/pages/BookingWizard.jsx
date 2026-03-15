import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Users, MapPin, CheckCircle, Info, Clock } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../store/useAuthStore';

// Utility to format JS Date to 'YYYY-MM-DDThh:mm' for datetime-local inputs
const toLocalISOString = (date) => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000; // offset in milliseconds
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

// Placeholder Gallery Generator
const getGalleryImages = (type) => {
  const images = {
    COMPLEX: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80&w=800'
    ]
  };
  return images[type] || [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1598928506311-c55dd58315cb?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1505691938895-1758d7def51a?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1560185016-8c3f592ba9f5?auto=format&fit=crop&q=80&w=800'
  ];
};

export default function BookingWizard() {
  const { facilityId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    guestCount: 1,
    eventType: 'Meeting'
  });

  const [availability, setAvailability] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchFacility = async () => {
      try {
        const response = await api.get('/facilities');
        const found = response.data.data.find(f => f.id === facilityId);
        if (found) setFacility(found);
        else toast.error('Facility not found');
      } catch (error) {
        toast.error('Failed to load facility details');
      } finally {
        setLoading(false);
      }
    };
    fetchFacility();
  }, [facilityId]);

  // --- SMART DATE LOGIC ---
  useEffect(() => {
    if (!formData.startTime || !facility) return;

    const startDate = new Date(formData.startTime);
    let newEndDate = formData.endTime ? new Date(formData.endTime) : null;

    // RULE 1: STRICT FIXED SLOTS (e.g., Exactly 6 Hours)
    if (facility.pricingType === 'SLOT' && facility.pricingDetails?.duration_hours) {
      const durationMs = facility.pricingDetails.duration_hours * 60 * 60 * 1000;
      const exactEndDate = new Date(startDate.getTime() + durationMs);
      setFormData(prev => ({ ...prev, endTime: toLocalISOString(exactEndDate) }));
    } 
    // RULE 2: HOURLY (Minimum Base Hours, e.g., 5 Hours)
    else if (facility.pricingType === 'HOURLY' && facility.pricingDetails?.base_hours) {
      const minDurationMs = facility.pricingDetails.base_hours * 60 * 60 * 1000;
      const minEndDate = new Date(startDate.getTime() + minDurationMs);
      
      // If user hasn't set an end time, or set one that is too short, auto-adjust it
      if (!newEndDate || newEndDate < minEndDate) {
        setFormData(prev => ({ ...prev, endTime: toLocalISOString(minEndDate) }));
      }
    } 
    // RULE 3: DAILY OR DEFAULT (Tiered, Fixed)
    else {
      const nextDay = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      if (!newEndDate || newEndDate <= startDate) {
        setFormData(prev => ({ ...prev, endTime: toLocalISOString(nextDay) }));
      }
    }
  }, [formData.startTime, facility]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (['startTime', 'endTime'].includes(e.target.name)) {
      setAvailability(null); // Reset quote when dates change
    }
  };

  const handleCheckAvailability = async () => {
    if (!formData.startTime || !formData.endTime) {
      return toast.warn('Please select both start and end times.');
    }
    
    setIsChecking(true);
    try {
      const response = await api.post('/bookings/check-availability', {
        facilityId,
        startTime: formData.startTime,
        endTime: formData.endTime
      });
      
      setAvailability(response.data.data);
      if (response.data.data.isAvailable) toast.success('Dates are available!');
      else toast.error('Dates are currently booked.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error checking availability');
    } finally {
      setIsChecking(false);
    }
  };

  const handleBookNow = async () => {
    if (!isAuthenticated) {
      toast.info('Please log in to complete your booking.');
      return navigate('/user/login');
    }

    setIsSubmitting(true);
    try {
      await api.post('/bookings', { facilityId, ...formData });
      toast.success('Booking requested successfully!');
      navigate('/dashboard'); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-20 text-center text-xl">Loading facility details...</div>;
  if (!facility) return <div className="p-20 text-center text-xl">Facility not found.</div>;

  const gallery = getGalleryImages(facility.facilityType);
  
  // Disable the end time input entirely if this facility is a strict fixed-hour slot
  const isFixedSlot = facility.pricingType === 'SLOT' && facility.pricingDetails?.duration_hours;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title & Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{facility.name}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 font-medium">
          <span className="flex items-center gap-1"><Star size={16} className="fill-gray-900 text-gray-900"/> 4.8</span>
          <span className="underline cursor-pointer"><MapPin size={16} className="inline mr-1"/> Raipur, Chhattisgarh</span>
          <span className="bg-gray-200 px-2 py-1 rounded text-gray-800">{facility.facilityType}</span>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[60vh] rounded-xl overflow-hidden mb-10">
        <img src={gallery[0]} alt="Main" className="col-span-2 row-span-2 w-full h-full object-cover" />
        <img src={gallery[1]} alt="Sub 1" className="col-span-1 row-span-1 w-full h-full object-cover" />
        <img src={gallery[2]} alt="Sub 2" className="col-span-1 row-span-1 w-full h-full object-cover" />
        <img src={gallery[3]} alt="Sub 3" className="col-span-1 row-span-1 w-full h-full object-cover" />
        <img src={gallery[4]} alt="Sub 4" className="col-span-1 row-span-1 w-full h-full object-cover" />
      </div>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Left Column: Rules & Info */}
        <div className="md:w-2/3">
          <div className="border-b pb-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">About this space</h2>
            <p className="text-gray-600 leading-relaxed text-lg">{facility.description}</p>
          </div>
          
          <div className="border-b pb-6 mb-6 space-y-4">
            <div className="flex items-start gap-4">
              <Users size={28} className="text-gray-700" />
              <div>
                <h3 className="font-semibold text-gray-900">Great for Gatherings</h3>
                <p className="text-gray-500 text-sm">Accommodates {facility.maxCapacity || 'large groups'} comfortably.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock size={28} className="text-gray-700" />
              <div>
                <h3 className="font-semibold text-gray-900">Booking Rule</h3>
                <p className="text-gray-500 text-sm">
                  {isFixedSlot 
                    ? `This package is strictly for a ${facility.pricingDetails.duration_hours}-hour block.` 
                    : facility.pricingType === 'HOURLY' 
                      ? `Minimum ${facility.pricingDetails?.base_hours || 1} hours required.` 
                      : 'Standard daily booking rules apply.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking Widget */}
        <div className="md:w-1/3 relative">
          <div className="sticky top-28 bg-white border rounded-xl shadow-xl p-6">
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-2xl font-bold text-gray-900">₹{parseInt(facility.baseRate).toLocaleString('en-IN')}</span>
              <span className="text-gray-500 text-sm">
                {facility.pricingType === 'HOURLY' ? '/ hour base' : ' base rate'}
              </span>
            </div>

            <div className="border rounded-lg overflow-hidden mb-4">
              <div className="flex border-b">
                <div className="w-1/2 p-3 border-r">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Check-in</label>
                  <input 
                    type="datetime-local" 
                    name="startTime" 
                    value={formData.startTime} 
                    onChange={handleChange} 
                    min={toLocalISOString(new Date())} // Prevent past dates
                    className="w-full text-sm outline-none mt-1 text-gray-700" 
                  />
                </div>
                <div className={`w-1/2 p-3 ${isFixedSlot ? 'bg-gray-50 cursor-not-allowed' : ''}`}>
                  <label className="block text-xs font-bold text-gray-700 uppercase">Check-out</label>
                  <input 
                    type="datetime-local" 
                    name="endTime" 
                    value={formData.endTime} 
                    onChange={handleChange} 
                    disabled={isFixedSlot} // Locks the field if it's a 6-hour package
                    className={`w-full text-sm outline-none mt-1 text-gray-700 ${isFixedSlot ? 'bg-gray-50 cursor-not-allowed' : ''}`} 
                  />
                </div>
              </div>
              
              <div className="p-3 border-b">
                <label className="block text-xs font-bold text-gray-700 uppercase">Guests</label>
                <input type="number" min="1" name="guestCount" value={formData.guestCount} onChange={handleChange} className="w-full text-sm outline-none mt-1 text-gray-700" />
              </div>
              <div className="p-3">
                <label className="block text-xs font-bold text-gray-700 uppercase">Event Type</label>
                <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full text-sm outline-none mt-1 text-gray-700 bg-transparent">
                  <option value="Marriage">Marriage</option>
                  <option value="Meeting">Meeting / Conference</option>
                  <option value="Cultural Event">Cultural Event</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            {!availability?.isAvailable ? (
              <button 
                onClick={handleCheckAvailability} 
                disabled={isChecking}
                className="w-full py-3 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
              >
                {isChecking ? 'Checking...' : 'Check Availability'}
              </button>
            ) : (
              <div className="space-y-4">
                <button 
                  onClick={handleBookNow} 
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Request to Book'}
                </button>
                <p className="text-center text-xs text-gray-500">You won't be charged yet</p>
                
                <div className="pt-4 border-t space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Base Amount Calculated</span>
                    <span>₹{availability.pricing.baseCalculatedAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Deposit</span>
                    <span>₹{parseInt(availability.pricing.securityDepositRequired).toLocaleString('en-IN')}</span>
                  </div>
                 
                </div>
              </div>
            )}
            
            {availability && !availability.isAvailable && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-start gap-2">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p>{availability.message}</p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}