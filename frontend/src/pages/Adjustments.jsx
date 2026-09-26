import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import StatusBadge from '../components/StatusBadge';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const Adjustments = () => {
  const { token } = useAuth();
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  
  const [formData, setFormData] = useState({ warehouse_id: '', reason: '', notes: '', items: [] });

  const authFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});

  const loadData = async () => {
    try {
      setLoading(true);
      const [adjRes, prodRes, whRes] = await Promise.all([
        authFetch(`${API}/adjustments`),
        authFetch(`${API}/products`),
        authFetch(`${API}/warehouses`)
      ]);
      if (adjRes.ok) setAdjustments(await adjRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (whRes.ok) setWarehouses(await whRes.json());
    } catch (err) {
      toast.error('Failed to load adjustments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) return toast.error('Add at least one item');
    try {
      // Calculate differences for submission
      const payload = {
        ...formData,
        items: formData.items.map(i => ({ ...i, difference: Number(i.counted_qty) - Number(i.recorded_qty) }))
      };
      const res = await authFetch(`${API}/adjustments`, { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Create failed');
      toast.success('Adjustment created');
      setCreateModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleValidate = async () => {
    try {
      const res = await authFetch(`${API}/adjustments/${selectedAdjustment.id}/validate`, { method: 'POST' });
      if (!res.ok) throw new Error('Validation failed');
      toast.success('Adjustment validated successfully');
      setDetailModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openCreateModal = () => {
    setFormData({ warehouse_id: '', reason: '', notes: '', items: [{ product_id: '', recorded_qty: 0, counted_qty: 0 }] });
    setCreateModalOpen(true);
  };

  const openDetail = (adj) => {
    setSelectedAdjustment(adj);
    setDetailModalOpen(true);
  };

  const addItemRow = () => setFormData({ ...formData, items: [...formData.items, { product_id: '', recorded_qty: 0, counted_qty: 0 }] });
  const removeItemRow = (idx) => {
    const newItems = [...formData.items];
    newItems.splice(idx, 1);
    setFormData({ ...formData, items: newItems });
  };
  
  const handleProductSelect = async (idx, productId) => {
    const newItems = [...formData.items];
    newItems[idx].product_id = productId;
    
    // Fetch recorded stock if warehouse is selected
    if (formData.warehouse_id && productId) {
      try {
        const res = await authFetch(`${API}/stock?product_id=${productId}&warehouse_id=${formData.warehouse_id}`);
        if (res.ok) {
          const data = await res.json();
          const stock = data.length > 0 ? data[0].quantity : 0;
          newItems[idx].recorded_qty = stock;
          newItems[idx].counted_qty = stock; // default to match
        }
      } catch (err) { console.error('Failed to fetch stock'); }
    }
    setFormData({ ...formData, items: newItems });
  };

  const updateCountedQty = (idx, val) => {
    const newItems = [...formData.items];
    newItems[idx].counted_qty = Number(val);
    setFormData({ ...formData, items: newItems });
  };

  const columns = [
    { key: 'reference', label: 'Reference' },
    { key: 'warehouse_name', label: 'Warehouse', render: (row) => row.warehouse_name || '-' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', label: 'Date', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <PageHeader title="Inventory Adjustments" subtitle="Log discrepancies and update stock counts" actionLabel="New Adjustment" onAction={openCreateModal} />
      
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
          <DataTable columns={columns} data={adjustments} onRowClick={openDetail} />
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="New Adjustment" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Warehouse" required value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})} options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
            <InputField label="Reason" required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="e.g. Annual Cycle Count" />
          </div>
          <InputField label="Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          
          <div className="border-t pt-4 mt-4 border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-sm text-gray-500">Note: Select warehouse first to auto-fetch recorded stock</h4>
              <button type="button" onClick={addItemRow} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus className="w-4 h-4"/> Add Item</button>
            </div>
            {formData.items.map((item, idx) => {
              const diff = item.counted_qty - item.recorded_qty;
              return (
              <div key={idx} className="flex gap-2 mb-2 items-end">
                <div className="flex-1">
                  <SelectField value={item.product_id} onChange={e => handleProductSelect(idx, e.target.value)} required options={products.map(p => ({ value: p.id, label: p.name }))} placeholder="Select Product" />
                </div>
                <div className="w-24">
                  <InputField label="Recorded" type="number" value={item.recorded_qty} readOnly disabled />
                </div>
                <div className="w-24">
                  <InputField label="Counted" type="number" value={item.counted_qty} onChange={e => updateCountedQty(idx, e.target.value)} required />
                </div>
                <div className="w-20 pt-8 text-center text-sm font-medium">
                  <span className={diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}>{diff > 0 ? '+' : ''}{diff}</span>
                </div>
                <button type="button" onClick={() => removeItemRow(idx)} className="mb-2 p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>
            )})}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow">Create</button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Adjustment ${selectedAdjustment?.reference || ''}`} size="lg">
        {selectedAdjustment && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block">Reason</span><span className="font-medium">{selectedAdjustment.reason}</span></div>
              <div><span className="text-gray-500 block">Warehouse</span><span className="font-medium">{selectedAdjustment.warehouse_name}</span></div>
              <div><span className="text-gray-500 block">Status</span><StatusBadge status={selectedAdjustment.status} /></div>
              <div><span className="text-gray-500 block">Date</span><span className="font-medium">{new Date(selectedAdjustment.created_at).toLocaleString()}</span></div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 border-b pb-2 border-gray-100">Items</h4>
              <table className="w-full text-sm text-left">
                <thead className="text-gray-500">
                  <tr><th>Product</th><th>Recorded</th><th>Counted</th><th>Diff</th></tr>
                </thead>
                <tbody>
                  {(selectedAdjustment.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0">
                      <td className="py-2">{item.product_name}</td>
                      <td className="py-2">{item.recorded_qty}</td>
                      <td className="py-2">{item.counted_qty}</td>
                      <td className={`py-2 font-medium ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {item.difference > 0 ? '+' : ''}{item.difference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedAdjustment.status === 'draft' && (
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setDetailModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={handleValidate} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow">Validate Adjustment</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default Adjustments;
