import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Warehouse, Plus, Loader2, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import InputField from '../components/InputField';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const gradients = [
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-pink-400',
  'from-emerald-500 to-teal-400',
  'from-amber-500 to-orange-400'
];

export default function Warehouses() {
  const { token } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '', description: '' });

  const authFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});

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
        toast.success('Warehouse created');
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader title="Warehouses" subtitle="Manage your storage locations" action={() => { setFormData({name:'',location:'',description:''}); setModalOpen(true); }} actionLabel="Add Warehouse" actionIcon={Plus} />
      
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((w, i) => {
            const gradient = gradients[i % gradients.length];
            return (
              <motion.div key={w.id} whileHover={{ scale: 1.03 }} className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 overflow-hidden group">
                <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${gradient}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{w.name}</h3>
                      <div className="flex items-center text-gray-500 mt-2 text-sm">
                        <MapPin size={16} className="mr-1" />
                        {w.location || 'No location'}
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${gradient} text-white shadow-md relative`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40 blur-md rounded-full group-hover:opacity-60 transition-opacity`} />
                      <Warehouse size={24} className="relative z-10" />
                    </div>
                  </div>
                  {w.description && <p className="text-gray-600 mt-4 text-sm line-clamp-2">{w.description}</p>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Warehouse">
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <InputField label="Location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} required />
          <InputField label="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg hover:brightness-110">Save</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
