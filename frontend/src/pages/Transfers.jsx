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

const Transfers = () => {
  const { token } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  
  const [formData, setFormData] = useState({ from_warehouse_id: '', to_warehouse_id: '', notes: '', items: [] });

  const authFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});

  const loadData = async () => {
    try {
      setLoading(true);
      const [transRes, prodRes, whRes] = await Promise.all([
        authFetch(`${API}/transfers`),
        authFetch(`${API}/products`),
        authFetch(`${API}/warehouses`)
      ]);
      if (transRes.ok) setTransfers(await transRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (whRes.ok) setWarehouses(await whRes.json());
    } catch (err) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) return toast.error('Add at least one item');
    if (formData.from_warehouse_id === formData.to_warehouse_id) return toast.error('Source and destination warehouses must be different');
    try {
      const res = await authFetch(`${API}/transfers`, { method: 'POST', body: JSON.stringify(formData) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Create failed');
      }
      toast.success('Transfer created');
      setCreateModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleValidate = async () => {
    try {
      const res = await authFetch(`${API}/transfers/${selectedTransfer.id}/validate`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Validation failed');
      }
      toast.success('Transfer validated successfully');
      setDetailModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openCreateModal = () => {
    setFormData({ from_warehouse_id: '', to_warehouse_id: '', notes: '', items: [{ product_id: '', quantity: 1 }] });
    setCreateModalOpen(true);
  };

  const openDetail = (transfer) => {
    setSelectedTransfer(transfer);
    setDetailModalOpen(true);
  };

  const addItemRow = () => setFormData({ ...formData, items: [...formData.items, { product_id: '', quantity: 1 }] });
  const removeItemRow = (idx) => {
    const newItems = [...formData.items];
    newItems.splice(idx, 1);
    setFormData({ ...formData, items: newItems });
  };
  const updateItemRow = (idx, field, val) => {
    const newItems = [...formData.items];
    newItems[idx][field] = val;
    setFormData({ ...formData, items: newItems });
  };

  const columns = [
    { key: 'reference', label: 'Reference' },
    { key: 'from_warehouse_name', label: 'From' },
    { key: 'to_warehouse_name', label: 'To' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', label: 'Date', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <PageHeader title="Internal Transfers" subtitle="Move stock between warehouses" actionLabel="New Transfer" onAction={openCreateModal} />
      
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
          <DataTable columns={columns} data={transfers} onRowClick={openDetail} />
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="New Transfer" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="From Warehouse" required value={formData.from_warehouse_id} onChange={e => setFormData({...formData, from_warehouse_id: e.target.value})} options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
            <SelectField label="To Warehouse" required value={formData.to_warehouse_id} onChange={e => setFormData({...formData, to_warehouse_id: e.target.value})} options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
          </div>
          <InputField label="Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          
          <div className="border-t pt-4 mt-4 border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Items</h4>
              <button type="button" onClick={addItemRow} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus className="w-4 h-4"/> Add Item</button>
            </div>
            {formData.items.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-end">
                <div className="flex-1">
                  <SelectField value={item.product_id} onChange={e => updateItemRow(idx, 'product_id', e.target.value)} required options={products.map(p => ({ value: p.id, label: p.name }))} placeholder="Select Product" />
                </div>
                <div className="w-32">
                  <InputField type="number" value={item.quantity} onChange={e => updateItemRow(idx, 'quantity', Number(e.target.value))} required />
                </div>
                <button type="button" onClick={() => removeItemRow(idx)} className="mb-2 p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow">Create</button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Transfer ${selectedTransfer?.reference || ''}`} size="lg">
        {selectedTransfer && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block">From</span><span className="font-medium">{selectedTransfer.from_warehouse_name}</span></div>
              <div><span className="text-gray-500 block">To</span><span className="font-medium">{selectedTransfer.to_warehouse_name}</span></div>
              <div><span className="text-gray-500 block">Status</span><StatusBadge status={selectedTransfer.status} /></div>
              <div><span className="text-gray-500 block">Date</span><span className="font-medium">{new Date(selectedTransfer.created_at).toLocaleString()}</span></div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 border-b pb-2 border-gray-100">Items</h4>
              <table className="w-full text-sm text-left">
                <thead className="text-gray-500">
                  <tr><th>Product</th><th>Quantity</th></tr>
                </thead>
                <tbody>
                  {(selectedTransfer.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0">
                      <td className="py-2">{item.product_name}</td>
                      <td className="py-2">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedTransfer.status === 'draft' && (
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setDetailModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={handleValidate} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow">Validate Transfer</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default Transfers;
