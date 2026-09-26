import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Warehouse, Plus, Loader2, MapPin, ArrowRight, ShieldCheck, Activity, Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import InputField from '../components/InputField';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const gradients = [
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-pink-600',
  'from-emerald-600 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-cyan-600',
  'from-indigo-600 to-violet-600'
];

export default function Warehouses() {
  const { token } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '', description: '' });

  const authFetch = (url, opts = {}) => fetch(url, { 
    ...opts, 
    headers: { 
      ...opts.headers, 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    }
  });

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API}/warehouses`);
      if (res.ok) {
        const data = await res.json();
        setWarehouses(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWarehouses(); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${API}/warehouses`, { method: 'POST', body: JSON.stringify(formData) });
      if (res.ok) {
        toast.success('Warehouse facility added');
        setModalOpen(false);
        loadWarehouses();
      } else {
        toast.error('Failed to create warehouse');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Warehouse className="text-blue-600" size={24} />
            Logistics Facilities & Warehouses
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage distribution hubs, transit docks, and storage sectors</p>
        </div>

        <button
          onClick={() => { setFormData({ name: '', location: '', description: '' }); setModalOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:shadow-md transition active:scale-95"
        >
          <Plus size={16} />
          Add Facility
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-9 h-9 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {warehouses.map((w, i) => {
            const gradient = gradients[i % gradients.length];
            const fillPcts = [78, 64, 89, 45, 92, 58];
            const pct = fillPcts[i % fillPcts.length];
            return (
              <motion.div 
                key={w.id} 
                whileHover={{ y: -3 }} 
                transition={{ duration: 0.2 }}
                className="relative bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col justify-between"
              >
                <div className={`h-2 w-full bg-gradient-to-r ${gradient}`} />
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active Hub
                        </span>
                        <h3 className="text-base font-bold text-gray-900">{w.name}</h3>
                        <div className="flex items-center text-gray-500 mt-1 text-xs">
                          <MapPin size={14} className="mr-1 text-slate-400" />
                          <span>{w.location || 'Central Depot'}</span>
                        </div>
                      </div>
                      
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} text-white shadow-xs`}>
                        <Warehouse size={20} />
                      </div>
                    </div>

                    {w.description && (
                      <p className="text-gray-500 mt-3 text-xs line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {w.description}
                      </p>
                    )}
                  </div>

                  {/* Utilization Progress Meter */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-gray-600">
                      <span className="text-[11px] text-gray-500">Bay Occupancy</span>
                      <span className={pct > 85 ? 'text-amber-600 font-bold' : 'text-gray-800'}>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                      <div 
                        style={{ width: `${pct}%` }} 
                        className={`h-full rounded-full transition-all ${
                          pct > 85 ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                        }`} 
                      />
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <Link
                      to="/"
                      className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      View Live Operations <ArrowRight size={13} />
                    </Link>
                    <span className="text-[11px] text-gray-400 font-mono">ID: #{w.id}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Warehouse Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register New Warehouse Facility">
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField 
            label="Facility Name" 
            value={formData.name} 
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
            placeholder="e.g. South Bay Distribution Center" 
            required 
          />
          <InputField 
            label="Physical Sector / Location" 
            value={formData.location} 
            onChange={(e) => setFormData({...formData, location: e.target.value})} 
            placeholder="e.g. Building C - Gate 12" 
            required 
          />
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Operational Description</label>
            <textarea 
              rows={3}
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              placeholder="e.g. Cross-docking facility for high-priority outbound cargo..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button 
              type="button" 
              onClick={() => setModalOpen(false)} 
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:shadow-md transition"
            >
              Save Facility
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
