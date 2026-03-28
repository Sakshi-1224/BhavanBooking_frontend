import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { Edit2, Plus, Trash2, Percent, Save, Clock, X } from 'lucide-react';

export default function AdminFacilitiesView() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tax State
  const [taxSettings, setTaxSettings] = useState({ cgstPercentage: 2.5, sgstPercentage: 2.5 });
  const [isUpdatingTaxes, setIsUpdatingTaxes] = useState(false);

  // Facility Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    facilityType: 'ROOM', // Based on DTO: ROOM, HALL, LAWN, CUSTOM
    capacity: 0,
    baseRate: 0,
    securityDeposit: 0,
    pricingType: 'FIXED', // Based on logic: FIXED, HOURLY, TIERED, SLOT
  });

  
  // Slot Configuration & Included Facilities State
  const [pricingDetails, setPricingDetails] = useState({
    slotType: 'FIXED', 
    durationHours: 1,
    slots: [],
    included_facilities: [] // 🚨 ADD THIS LINE
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [facRes, taxRes] = await Promise.all([
        api.get('/facilities'),
        api.get('/settings/taxes').catch(() => null)
      ]);
      setFacilities(facRes.data.data);
      if (taxRes && taxRes.data.data) {
        setTaxSettings({
          cgstPercentage: Number(taxRes.data.data.cgstPercentage),
          sgstPercentage: Number(taxRes.data.data.sgstPercentage)
        });
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaxes = async (e) => {
    e.preventDefault();
    setIsUpdatingTaxes(true);
    try {
      await api.patch('/settings/taxes', taxSettings);
      toast.success('Tax settings updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update taxes');
    } finally {
      setIsUpdatingTaxes(false);
    }
  };

  const handleOpenModal = (facility = null) => {
    setImageFiles([]);
    if (facility) {
      setEditingId(facility.id);
      setFormData({
        name: facility.name,
        description: facility.description,
        facilityType: facility.facilityType,
        capacity: facility.capacity || facility.maxCapacity || 0,
        baseRate: facility.baseRate,
        securityDeposit: facility.securityDeposit || 0,
        pricingType: facility.pricingType || 'FIXED',
      });
      
      // Load existing pricing details if SLOT type
      if (facility.pricingDetails) {
        setPricingDetails({
          slotType: facility.pricingDetails.slotType || 'FIXED',
          durationHours: facility.pricingDetails.durationHours || 1,
          slots: facility.pricingDetails.slots || [],
          included_facilities: facility.pricingDetails.included_facilities || []
        });
      } else {
        setPricingDetails({ slotType: 'FIXED', durationHours: 1, slots: [] });
      }

      setImagePreviews(Array.isArray(facility.images) ? facility.images : []);
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '', facilityType: 'ROOM', capacity: 0, baseRate: 0, securityDeposit: 0, pricingType: 'FIXED' });
      setPricingDetails({ slotType: 'FIXED', durationHours: 1, slots: [] });
      setImagePreviews([]);
    }
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setImageFiles(files);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
    }
  };

  // --- SLOT BUILDER HANDLERS ---
  const addSlot = () => {
    setPricingDetails(prev => ({
      ...prev,
      slots: [...prev.slots, { id: crypto.randomUUID(), label: '', startTime: '08:00', endTime: '15:00', price: formData.baseRate }]
    }));
  };

  const removeSlot = (id) => {
    setPricingDetails(prev => ({
      ...prev,
      slots: prev.slots.filter(s => s.id !== id)
    }));
  };

  const updateSlot = (id, field, value) => {
    setPricingDetails(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      
      // Append Images
     if (imageFiles.length > 0) {
        // 1. User selected NEW files. Append them for backend Multer.
        imageFiles.forEach((file) => data.append('images', file)); 
      } else if (imagePreviews.length > 0) {
        data.append('existingImages', JSON.stringify(imagePreviews));
      }
      // Inject Slot data if pricing type is SLOT
    // --- DYNAMIC PRICING DETAILS PAYLOAD BUILDER ---
      const payloadPricingDetails = {};

      // 1. If it's a Package/Complex, add the selected inclusions
      if (formData.facilityType === 'PACKAGE' || formData.facilityType === 'COMPLEX') {
        payloadPricingDetails.included_facilities = pricingDetails.included_facilities || [];
      }

      // 2. If it's a Slot, add the time slot rules
      if (formData.pricingType === 'SLOT') {
        payloadPricingDetails.slotType = pricingDetails.slotType;
        if (pricingDetails.slotType === 'FLEXIBLE') {
          payloadPricingDetails.durationHours = Number(pricingDetails.durationHours);
        } else {
          payloadPricingDetails.slots = pricingDetails.slots.map(s => ({
            id: s.id, label: s.label, startTime: s.startTime, endTime: s.endTime, price: Number(s.price)
          }));
        }
      }

      // 3. Only append the object if it actually has data
      if (Object.keys(payloadPricingDetails).length > 0) {
        data.append('pricingDetails', JSON.stringify(payloadPricingDetails));
      }
      // ------------------------------------------------
      if (editingId) {
        await api.patch(`/facilities/${editingId}`, data);
        toast.success('Facility updated successfully!');
      } else {
        await api.post('/facilities', data);
        toast.success('Facility created successfully!');
      }
      
      setModalOpen(false);
      fetchData(); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving facility');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this facility?')) return;
    try {
      await api.delete(`/facilities/${id}`);
      toast.success('Facility deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete facility');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings and inventory...</div>;

  return (
    <div className="space-y-6">
      
      {/* TAX SETTINGS CARD (Unchanged) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Percent size={20} className="text-blue-600"/> Global Tax Settings (GST)
        </h2>
        <form onSubmit={handleUpdateTaxes} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-1">CGST Percentage (%)</label>
            <input type="number" step="0.01" required value={taxSettings.cgstPercentage} onChange={e => setTaxSettings({...taxSettings, cgstPercentage: Number(e.target.value)})} className="w-full border p-2 rounded-md bg-gray-50 focus:bg-white focus:ring-blue-500" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-1">SGST Percentage (%)</label>
            <input type="number" step="0.01" required value={taxSettings.sgstPercentage} onChange={e => setTaxSettings({...taxSettings, sgstPercentage: Number(e.target.value)})} className="w-full border p-2 rounded-md bg-gray-50 focus:bg-white focus:ring-blue-500" />
          </div>
          <div className="flex-none">
            <button type="submit" disabled={isUpdatingTaxes} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md flex items-center gap-2 font-semibold transition disabled:opacity-50">
              <Save size={16}/> {isUpdatingTaxes ? 'Saving...' : 'Update Taxes'}
            </button>
          </div>
        </form>
      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold text-gray-800">Manage Inventory & Pricing</h2>
          <button onClick={() => handleOpenModal()} className="bg-green-600 hover:bg-green-700 transition text-white px-4 py-2 rounded-md flex items-center gap-2 font-semibold">
            <Plus size={16}/> Add Facility
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600 text-sm">
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Price Calculation</th>
                <th className="p-3 font-semibold">Base Rate (₹)</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map(fac => (
                <tr key={fac.id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-3 font-bold text-gray-800">{fac.name}</td>
                  <td className="p-3 text-sm text-gray-600"><span className="bg-gray-200 px-2 py-1 rounded text-xs font-bold">{fac.facilityType}</span></td>
                  <td className="p-3 text-sm font-semibold text-blue-600">{fac.pricingType}</td>
                  <td className="p-3 font-bold text-green-700">₹{fac.baseRate}</td>
                  <td className="p-3 flex gap-3">
                    <button onClick={() => handleOpenModal(fac)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded transition"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(fac.id)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded transition"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">{editingId ? 'Edit Facility' : 'Add New Facility'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Facility Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-blue-500" />
              </div>

             <div className="grid grid-cols-2 gap-4">
  
  {/* Facility Type */}
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">
      Facility Type
    </label>
    <select
      value={formData.facilityType}
      onChange={e => setFormData({...formData, facilityType: e.target.value})}
      className="w-full border p-2.5 rounded-md bg-white"
    >
      <option value="ROOM">Room</option>
      <option value="HALL">Hall</option>
      <option value="LAWN">Lawn</option>
      <option value="PACKAGE">Package</option>
      <option value="COMPLEX">Complex (Full Bhavan)</option>
    </select>
  </div>

  {/* Capacity */}
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">
      Capacity
    </label>
    <input
      type="number"
      required
      value={formData.capacity}
      onChange={e => setFormData({...formData,  capacity: e.target.value === "" ? "" : Number(e.target.value)})}
      className="w-full border p-2.5 rounded-md focus:ring-blue-500"
    />
  </div>

</div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
                <div>
                  <label className="block text-sm font-bold text-green-700 mb-1">Standard Base Rate (₹)</label>
                  <input type="number" required value={formData.baseRate} onChange={e => setFormData({...formData, baseRate: e.target.value === "" ? "" : Number(e.target.value)})} className="w-full border p-2.5 rounded-md font-bold focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-orange-700 mb-1">Security Deposit (₹)</label>
                  <input type="number" required value={formData.securityDeposit} onChange={e => setFormData({...formData, securityDeposit: e.target.value === "" ? "" : Number(e.target.value)})} className="w-full border p-2.5 rounded-md font-bold focus:ring-orange-500" />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Pricing Logic</label>
                 <select value={formData.pricingType} onChange={e => setFormData({...formData, pricingType: e.target.value})} className="w-full border p-2.5 rounded-md bg-white">
                    <option value="FIXED">Fixed (Per Day)</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="TIERED">Tiered</option>
                    <option value="SLOT">Time Slots (Shifts)</option>
                 </select>
               
              </div>


              {/* DYNAMIC INCLUSIONS UI (Only for Packages/Complexes) */}
              {(formData.facilityType === 'PACKAGE' || formData.facilityType === 'COMPLEX') && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <label className="block text-sm font-bold text-orange-800 mb-2">Included Facilities in this Package</label>
                  <p className="text-xs text-orange-700 mb-3">Select the individual facilities below. If someone books this package, the selected rooms/halls will be automatically blocked from being booked separately!</p>
                  
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {facilities
                      .filter(f => f.id !== editingId && f.facilityType !== 'PACKAGE' && f.facilityType !== 'COMPLEX') // Don't show packages inside packages!
                      .map(fac => {
                        const isChecked = pricingDetails.included_facilities?.includes(fac.name);
                        return (
                          <label key={fac.id} className={`flex items-center gap-2 text-sm p-2 rounded border cursor-pointer transition ${isChecked ? 'bg-orange-100 border-orange-400 font-bold text-orange-900 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setPricingDetails(prev => {
                                  const current = prev.included_facilities || [];
                                  if (e.target.checked) return { ...prev, included_facilities: [...current, fac.name] };
                                  return { ...prev, included_facilities: current.filter(n => n !== fac.name) };
                                });
                              }}
                              className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                            />
                            <span className="truncate">{fac.name}</span>
                          </label>
                        );
                      })
                    }
                  </div>
                </div>
              )}

              {/* DYNAMIC SLOT BUILDER UI */}
              {formData.pricingType === 'SLOT' && (
                <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-blue-800 flex items-center gap-2"><Clock size={18}/> Slot Configuration</h3>
                    <select value={pricingDetails.slotType} onChange={e => setPricingDetails({...pricingDetails, slotType: e.target.value})} className="text-sm border p-1 rounded">
                      <option value="FIXED">Fixed Shifts (e.g., Morning/Evening)</option>
                      <option value="FLEXIBLE">Flexible Duration</option>
                    </select>
                  </div>

                  {pricingDetails.slotType === 'FLEXIBLE' ? (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Required Duration (Hours)</label>
                      <input type="number" min="1" value={pricingDetails.durationHours} onChange={e => setPricingDetails({...pricingDetails, durationHours: e.target.value})} className="w-full border p-2 rounded-md" />
                      <p className="text-xs text-gray-500 mt-1">Users must book exactly this many continuous hours.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pricingDetails.slots.map((slot, idx) => (
                        <div key={slot.id} className="flex gap-2 items-center bg-white p-2 rounded shadow-sm border">
                          <input type="text" placeholder="Label (e.g. Morning Shift)" value={slot.label} onChange={e => updateSlot(slot.id, 'label', e.target.value)} className="w-1/3 border p-1 text-sm rounded" />
                          <input type="time" required value={slot.startTime} onChange={e => updateSlot(slot.id, 'startTime', e.target.value)} className="border p-1 text-sm rounded" />
                          <span className="text-gray-400">to</span>
                          <input type="time" required value={slot.endTime} onChange={e => updateSlot(slot.id, 'endTime', e.target.value)} className="border p-1 text-sm rounded" />
                          <input type="number" placeholder="Price (₹)" value={slot.price} onChange={e => updateSlot(slot.id, 'price', e.target.value)} className="w-1/4 border p-1 text-sm rounded font-bold text-green-700" />
                          <button type="button" onClick={() => removeSlot(slot.id)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded"><X size={16}/></button>
                        </div>
                      ))}
                      <button type="button" onClick={addSlot} className="text-sm text-blue-700 font-bold flex items-center gap-1 hover:underline">
                        <Plus size={14}/> Add New Shift/Slot
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* IMAGE UPLOAD SECTION */}
              <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-5 text-center">
                <label className="block text-sm font-bold text-gray-700 mb-3">Facility Images</label>
                {imagePreviews?.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-3 justify-center">
                    {imagePreviews.map((src, index) => (
                      <img key={index} src={src} alt="Preview" className="h-24 w-24 object-cover rounded-md shadow-sm border border-gray-200"/>
                    ))}
                  </div>
                )}
                <input type="file" multiple accept="image/jpeg, image/png, image/webp" onChange={handleImageChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-3 rounded-md focus:ring-blue-500" />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 bg-gray-200 text-gray-800 font-bold rounded-md hover:bg-gray-300 transition">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition shadow-md">Save Facility</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}