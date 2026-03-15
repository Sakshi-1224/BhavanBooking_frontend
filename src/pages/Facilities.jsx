import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../store/useAuthStore';
import { Search, Globe, Menu, UserCircle, Star, Heart } from 'lucide-react';

// Utility function to assign beautiful placeholder images based on facility type
const getPlaceholderImage = (type, index) => {
  const images = {
    COMPLEX: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800',
    ],
    ROOM: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800',
      'https://th.bing.com/th/id/OIP.MbzYEKYFH5B2DN-eKKhtNgHaHa?w=178&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
      'https://images.unsplash.com/photo-1505691938895-1758d7def51a?auto=format&fit=crop&q=80&w=800'
    ],
    HALL: [
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80&w=800'
    ],
    LAWN: [
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=800'
    ],
    PACKAGE: [
      '/images/hall.jpg',
      '/images/room.jpg'
    ],
    ITEM: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800' // Mattress
    ]
  };

  const typeImages = images[type] || images['ROOM'];
  return typeImages[index % typeImages.length];
};

export default function Facilities() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const response = await api.get('/facilities');
        setFacilities(response.data.data);
      } catch (error) {
        toast.error('Failed to load facilities');
      } finally {
        setLoading(false);
      }
    };
    fetchFacilities();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/user/login');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Airbnb-Style Sticky Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Area */}
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => navigate('/facilities')}>
              <span className="text-red-500 font-bold text-2xl tracking-tighter">Bhavan<span className="text-gray-900">Book</span></span>
            </div>

            {/* Middle Search Bar (Mock) */}
           
            {/* Right User Menu */}
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm font-medium hover:bg-gray-100 px-4 py-2 rounded-full cursor-pointer transition">
                Bhavan your home
              </span>
              <Globe size={18} className="text-gray-700 cursor-pointer" />
              
              <div className="flex items-center gap-2 border shadow-sm rounded-full p-2 pl-3 hover:shadow-md transition cursor-pointer group relative">
                <Menu size={18} className="text-gray-600" />
                <UserCircle size={30} className="text-gray-500" />
                
                {/* Simple Dropdown Menu */}
                <div className="absolute right-0 top-12 w-48 bg-white border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-3 border-b text-sm font-semibold text-gray-800">Hi, {user?.fullName}</div>
                      <div className="px-4 py-3 hover:bg-gray-50 text-sm cursor-pointer font-medium" onClick={() => navigate('/my-bookings')}>My Bookings</div>
                      <div className="px-4 py-3 hover:bg-gray-50 text-sm cursor-pointer" onClick={handleLogout}>Log out</div>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-3 hover:bg-gray-50 text-sm cursor-pointer font-semibold" onClick={() => navigate('/user/login')}>Log in</div>
                      <div className="px-4 py-3 hover:bg-gray-50 text-sm cursor-pointer" onClick={() => navigate('/user/register')}>Sign up</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. Category Filter Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-8 overflow-x-auto no-scrollbar border-b">
        {['Rooms', 'Halls', 'Lawns', 'Packages', 'Complex', 'Extras'].map((cat) => (
          <div key={cat} className="flex flex-col items-center gap-2 cursor-pointer text-gray-500 hover:text-black border-b-2 border-transparent hover:border-black pb-2 transition whitespace-nowrap">
            <span className="text-sm font-medium">{cat}</span>
          </div>
        ))}
      </div>

      {/* 3. Main Image Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-gray-200 h-12 w-12"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 gap-y-10">
            {facilities.map((facility, index) => (
              <div 
                key={facility.id} 
                onClick={() => navigate(`/book/${facility.id}`)}
                className="group cursor-pointer flex flex-col gap-3"
              >
                {/* Image Container with aspect-square */}
                <div className="aspect-square w-full relative overflow-hidden rounded-xl bg-gray-200">
                  <img 
                    src={getPlaceholderImage(facility.facilityType, index)} 
                    alt={facility.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Heart Icon Toggle */}
                  <button className="absolute top-3 right-3 text-white hover:scale-110 active:scale-95 transition drop-shadow-md">
                    <Heart size={24} className="fill-black/20 stroke-white stroke-[1.5]" />
                  </button>
                  {/* Small badge for facility type */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm text-xs font-bold text-gray-800 uppercase tracking-wider">
                    {facility.facilityType}
                  </div>
                </div>

                {/* Info Text below image */}
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900 truncate pr-4">{facility.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-800 shrink-0">
                      <Star size={14} className="fill-gray-900" />
                      <span>{4.5 + (index % 5) * 0.1}</span> {/* Mock rating */}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm truncate">{facility.description}</p>
                  
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-semibold text-gray-900">₹{parseInt(facility.baseRate).toLocaleString('en-IN')}</span> 
                    <span className="text-gray-500 text-sm">
                      {facility.pricingType === 'HOURLY' ? '/ hour' : facility.pricingType === 'TIERED' ? '/ day' : '/ slot'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}