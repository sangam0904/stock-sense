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

const Deliveries = () => {
  const { token } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  
  const [formData, setFormData] = useState({ customer: '', warehouse_id: '', notes: '', items: [] });
  const [validateItems, setValidateItems] = useState([]);

  const authFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});

  const loadData = async () => {
    try {
      setLoading(true);
      const [delRes, prodRes, whRes] = await Promise.all([
        authFetch(`${API}/deliveries`),
        authFetch(`${API}/products`),
        authFetch(`${API}/warehouses`)
      ]);
      if (delRes.ok) setDeliveries(await delRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (whRes.ok) setWarehouses(await whRes.json());
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) return toast.error('Add at least one item');
    try {
      const res = await authFetch(`${API}/deliveries`, { method: 'POST', body: JSON.stringify(formData) });
      if (!res.ok) throw new Error('Create failed');
      toast.success('Delivery created');
      setCreateModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleValidate = async () => {
    try {
      const payload = { items: validateItems.map(i => ({ id: i.id, quantity_delivered: Number(i.quantity_delivered) })) };
      const res = await authFetch(`${API}/deliveries/${selectedDelivery.id}/validate`, { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Validation failed');
      }
      toast.success('Delivery validated successfully');
      setDetailModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePick = async () => {
    try {
      const res = await authFetch(`${API}/deliveries/${selectedDelivery.id}/pick`, { method: 'POST' });
      if (!res.ok) throw new Error('Picking failed');
      toast.success('Items marked as Picked');
      setSelectedDelivery({ ...selectedDelivery, status: 'waiting' });
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePack = async () => {
    try {
      const res = await authFetch(`${API}/deliveries/${selectedDelivery.id}/pack`, { method: 'POST' });
      if (!res.ok) throw new Error('Packing failed');
      toast.success('Items marked as Packed and Ready for shipment');
      setSelectedDelivery({ ...selectedDelivery, status: 'ready' });
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openCreateModal = () => {
    setFormData({ customer: '', warehouse_id: '', notes: '', items: [{ product_id: '', quantity_ordered: 1 }] });
    setCreateModalOpen(true);
  };

  const openDetail = (delivery) => {
    setSelectedDelivery(delivery);
    setValidateItems((delivery.items || []).map(i => ({ ...i, quantity_delivered: i.quantity_ordered })));
    setDetailModalOpen(true);
  };

  const addItemRow = () => setFormData({ ...formData, items: [...formData.items, { product_id: '', quantity_ordered: 1 }] });
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

  const filteredDeliveries = statusFilter ? deliveries.filter(d => d.status === statusFilter) : deliveries;

  const columns = [
    { key: 'reference', label: 'Reference' },
    { key: 'customer', label: 'Customer' },
    { key: 'warehouse_name', label: 'Warehouse', render: (row) => row.warehouse_name || '-' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', label: 'Date', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <PageHeader title="Deliveries" subtitle="Manage outgoing stock to customers" actionLabel="New Delivery" onAction={openCreateModal} />
      
      <div className="w-64">
        <SelectField placeholder="All Statuses" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} 
          options={['draft', 'ready', 'done', 'canceled'].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
          <DataTable columns={columns} data={filteredDeliveries} onRowClick={openDetail} />
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="New Delivery" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Customer" required value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} />
            <SelectField label="Warehouse" required value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})} options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
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
                  <InputField type="number" value={item.quantity_ordered} onChange={e => updateItemRow(idx, 'quantity_ordered', Number(e.target.value))} required />
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
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Delivery ${selectedDelivery?.reference || ''}`} size="lg">
        {selectedDelivery && (
          <div className="space-y-6">
            {/* 3-Step Process Indicator from PDF Specification */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Warehouse Outbound Workflow (PDF Standard)</p>
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2.5 rounded-xl border text-center text-xs font-semibold ${
                  selectedDelivery.status === 'draft' 
                    ? 'bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-blue-400/20' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <p className="font-bold">1. Pick Items</p>
                  <p className="text-[11px] opacity-80">{selectedDelivery.status === 'draft' ? 'Awaiting Pick' : 'Picked'}</p>
                </div>
                <div className={`p-2.5 rounded-xl border text-center text-xs font-semibold ${
                  selectedDelivery.status === 'waiting'
                    ? 'bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-blue-400/20'
                    : selectedDelivery.status === 'ready' || selectedDelivery.status === 'done'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
                }`}>
                  <p className="font-bold">2. Pack Items</p>
                  <p className="text-[11px] opacity-80">
                    {selectedDelivery.status === 'ready' || selectedDelivery.status === 'done' ? 'Packed' : selectedDelivery.status === 'waiting' ? 'Ready to Pack' : 'Pending'}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl border text-center text-xs font-semibold ${
                  selectedDelivery.status === 'ready'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800 ring-2 ring-indigo-400/20'
                    : selectedDelivery.status === 'done'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
                }`}>
                  <p className="font-bold">3. Validate & Ship</p>
                  <p className="text-[11px] opacity-80">{selectedDelivery.status === 'done' ? 'Dispatched' : 'Awaiting Validate'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block">Customer</span><span className="font-semibold text-gray-800">{selectedDelivery.customer}</span></div>
              <div><span className="text-gray-500 block">Status</span><StatusBadge status={selectedDelivery.status} /></div>
              <div><span className="text-gray-500 block">Warehouse</span><span className="font-medium">{selectedDelivery.warehouse_name}</span></div>
              <div><span className="text-gray-500 block">Date</span><span className="font-medium">{new Date(selectedDelivery.created_at).toLocaleString()}</span></div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 border-b pb-2 border-gray-100">Items to Deliver</h4>
              <table className="w-full text-sm text-left">
                <thead className="text-gray-500">
                  <tr><th>Product</th><th>Ordered</th>{selectedDelivery.status !== 'done' && <th>Delivered</th>}</tr>
                </thead>
                <tbody>
                  {validateItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 font-medium">{item.product_name}</td>
                      <td className="py-2">{item.quantity_ordered}</td>
                      {selectedDelivery.status !== 'done' && (
                        <td className="py-2 w-32">
                          <InputField type="number" value={item.quantity_delivered} onChange={e => {
                            const newItems = [...validateItems];
                            newItems[idx].quantity_delivered = e.target.value;
                            setValidateItems(newItems);
                          }} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedDelivery.status !== 'done' && selectedDelivery.status !== 'canceled' && (
              <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-gray-100">
                <div className="flex gap-2">
                  {selectedDelivery.status === 'draft' && (
                    <button 
                      type="button" 
                      onClick={handlePick}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl border border-amber-200 transition"
                    >
                      Step 1: Pick Items
                    </button>
                  )}
                  {selectedDelivery.status === 'waiting' && (
                    <button 
                      type="button" 
                      onClick={handlePack}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition"
                    >
                      Step 2: Pack Items
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setDetailModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">Close</button>
                  <button onClick={handleValidate} className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl shadow font-bold text-sm hover:opacity-95 transition">
                    Validate & Dispatch (Stock -)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default Deliveries;
