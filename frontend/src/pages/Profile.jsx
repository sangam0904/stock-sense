import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Building2, Briefcase, Camera, Upload, 
  Trash2, ShieldCheck, Key, CheckCircle2, Loader2, Warehouse, Sparkles, LogOut
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const AVATAR_PRESETS = [
  { label: 'Executive', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face' },
  { label: 'Operations Lead', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face' },
  { label: 'Warehouse Specialist', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face' },
  { label: 'Engineer', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face' }
];

export default function Profile() {
  const { user, token, updateUser, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [warehouses, setWarehouses] = useState([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Profile Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
    role: '',
    department: '',
    phone: '',
    primary_warehouse_id: '',
    bio: ''
  });

  // Password state
  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || '',
        role: user.role || 'Inventory Manager',
        department: user.department || 'Supply Chain Operations',
        phone: user.phone || '+1 (555) 382-9901',
        primary_warehouse_id: user.primary_warehouse_id || '',
        bio: user.bio || 'Managing incoming shipments, floor counts, and internal stock allocations.'
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await fetch(`${API}/warehouses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWarehouses(Array.isArray(data) ? data : (data.data || []));
        }
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    };
    if (token) fetchWarehouses();
  }, [token]);

  // Handle local file upload (Any image)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size must be under 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target.result;
      setFormData(prev => ({ ...prev, avatar: base64Url }));
      toast.success('Image loaded! Click "Save Changes" to apply.');
    };
    reader.readAsDataURL(file);
  };

  // Submit Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          avatar: formData.avatar,
          role: formData.role,
          department: formData.department,
          phone: formData.phone,
          primary_warehouse_id: formData.primary_warehouse_id ? Number(formData.primary_warehouse_id) : null,
          bio: formData.bio
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      updateUser(data.user);
      toast.success('Profile and picture updated successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Submit Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passData.currentPassword,
          newPassword: passData.newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');

      toast.success('Password changed successfully!');
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }} 
      className="max-w-5xl mx-auto space-y-6 pb-12"
    >
      <PageHeader 
        title="My Profile & Account Settings" 
        subtitle="Manage your personal details, operational role, and custom avatar photo" 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Quick Info Card */}
        <div className="space-y-6">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-blue-100 overflow-hidden text-center p-6 relative">
            <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 -mx-6 -mt-6 mb-12 relative flex items-center justify-center">
              <span className="text-white/40 text-xs uppercase tracking-widest font-mono font-bold">StockSense Staff ID</span>
            </div>

            {/* Profile Avatar Circle */}
            <div className="relative inline-block -mt-20 mb-4 group">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-xl mx-auto">
                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-extrabold">
                      {formData.name ? formData.name.substring(0, 2).toUpperCase() : 'US'}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload trigger overlay button */}
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:scale-110 active:scale-95 transition"
                title="Upload Photo"
              >
                <Camera size={16} />
              </button>
            </div>

            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload} 
            />

            <h3 className="text-xl font-bold text-gray-800">{formData.name || 'User'}</h3>
            <p className="text-xs font-semibold text-blue-600 mt-0.5">{formData.role || 'Inventory Manager'}</p>
            <p className="text-xs text-gray-400 mt-1">{formData.email}</p>

            {/* Avatar Actions */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Upload size={14} />
                Upload Any Photo
              </button>

              {formData.avatar && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                  className="w-full py-1.5 px-3 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition flex items-center justify-center gap-1"
                >
                  <Trash2 size={13} />
                  Reset to Initials
                </button>
              )}
            </div>

            {/* Presets */}
            <div className="mt-4 pt-3 border-t border-gray-100 text-left">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Or Choose a Preset Avatar</p>
              <div className="flex items-center justify-between gap-2">
                {AVATAR_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, avatar: p.url }))}
                    className="w-10 h-10 rounded-full border-2 border-transparent hover:border-blue-500 overflow-hidden hover:scale-105 transition shadow-xs"
                    title={p.label}
                  >
                    <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats / Security Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-md border border-blue-100 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-500" />
              Role & Permissions
            </h4>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Security Clearance</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Full Manager</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stock Authorization</span>
                <span className="font-semibold text-gray-800">Inbound & Outbound</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ledger Audit Access</span>
                <span className="font-semibold text-gray-800">Unrestricted</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <LogOut size={14} />
              Sign Out of Account
            </button>
          </div>
        </div>

        {/* Right Column: Profile Form & Password Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Form */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-blue-100 p-6 md:p-8">
            <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Personal & Operational Details</h3>
                <p className="text-xs text-gray-400">Update your details shown across invoices, ledger sign-offs, and transfers</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField 
                  label="Full Name" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g. John Miller" 
                  required 
                />

                <InputField 
                  label="Email Address" 
                  value={formData.email} 
                  disabled
                  placeholder="name@company.com" 
                />

                <InputField 
                  label="Job Title / Role" 
                  value={formData.role} 
                  onChange={e => setFormData({ ...formData, role: e.target.value })} 
                  placeholder="e.g. Senior Inventory Lead" 
                />

                <InputField 
                  label="Department" 
                  value={formData.department} 
                  onChange={e => setFormData({ ...formData, department: e.target.value })} 
                  placeholder="e.g. Logistics & Supply Chain" 
                />

                <InputField 
                  label="Phone / Mobile" 
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                  placeholder="+1 (555) 000-0000" 
                />

                <SelectField 
                  label="Primary Assigned Warehouse"
                  placeholder="Select Primary Base..."
                  value={formData.primary_warehouse_id}
                  onChange={e => setFormData({ ...formData, primary_warehouse_id: e.target.value })}
                  options={warehouses.map(w => ({ value: w.id, label: `${w.name} (${w.location || 'Hub'})` }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Operational Bio / Notes</label>
                <textarea 
                  rows={3}
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief description of your operational duties, shifts, or certifications..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm bg-white shadow-xs"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 transition flex items-center gap-2"
                >
                  {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-blue-100 p-6 md:p-8">
            <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Key size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Security & Password</h3>
                <p className="text-xs text-gray-400">Update your sign-in credentials</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              <InputField 
                label="Current Password" 
                type="password" 
                value={passData.currentPassword} 
                onChange={e => setPassData({ ...passData, currentPassword: e.target.value })} 
                placeholder="Enter current password" 
                required 
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField 
                  label="New Password" 
                  type="password" 
                  value={passData.newPassword} 
                  onChange={e => setPassData({ ...passData, newPassword: e.target.value })} 
                  placeholder="At least 6 characters" 
                  required 
                />

                <InputField 
                  label="Confirm New Password" 
                  type="password" 
                  value={passData.confirmPassword} 
                  onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })} 
                  placeholder="Repeat new password" 
                  required 
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow transition flex items-center gap-2 disabled:opacity-60"
                >
                  {isChangingPass ? <Loader2 size={16} className="animate-spin" /> : null}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
