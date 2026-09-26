import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Plus, Loader2, Eye, Search, Warehouse, 
  AlertTriangle, CheckCircle2, XCircle, SlidersHorizontal, Edit2,
  Layers, FolderPlus, Trash2, Download, BarChart2, ShieldAlert
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import { exportToCSV } from '../utils/exportCsv';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

export default function Products() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productStockLocations, setProductStockLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  const [formData, setFormData] = useState({ 
    id: null,
    name: '', 
    sku: '', 
    category_id: '', 
    unit_of_measure: 'Units', 
    reorder_level: 10,
    initial_stock: '',
    warehouse_id: ''
  });

  const authFetch = (url, opts = {}) => fetch(url, { 
    ...opts, 
    headers: { 
      ...opts.headers, 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    }
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (categoryFilter) queryParams.append('category_id', categoryFilter);

      const [prodRes, catRes, whRes] = await Promise.all([
        authFetch(`${API}/products?${queryParams.toString()}`),
        authFetch(`${API}/categories`),
        authFetch(`${API}/warehouses`)
      ]);
      
      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(Array.isArray(pData) ? pData : (pData.data || []));
      }
      if (catRes.ok) {
        const cData = await catRes.json();
        setCategories(Array.isArray(cData) ? cData : (cData.data || []));
      }
      if (whRes.ok) {
        const wData = await whRes.json();
        setWarehouses(Array.isArray(wData) ? wData : (wData.data || []));
      }
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (token) loadData(); 
  }, [token, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const totalSKUs = products.length;
    const totalUnits = products.reduce((acc, p) => acc + (Number(p.total_stock) || 0), 0);
    const lowStock = products.filter(p => (Number(p.total_stock) || 0) > 0 && (Number(p.total_stock) || 0) <= (Number(p.reorder_level) || 0)).length;
    const outOfStock = products.filter(p => (Number(p.total_stock) || 0) === 0).length;
    return { totalSKUs, totalUnits, lowStock, outOfStock };
  }, [products]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `${API}/products/${formData.id}` : `${API}/products`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        name: formData.name,
        sku: formData.sku,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        unit_of_measure: formData.unit_of_measure,
        reorder_level: Number(formData.reorder_level) || 0
      };

      if (!isEdit && formData.initial_stock && formData.warehouse_id) {
        payload.initial_stock = Number(formData.initial_stock);
        payload.warehouse_id = Number(formData.warehouse_id);
      }

      const res = await authFetch(url, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(`Product ${isEdit ? 'updated' : 'created'} successfully`);
        setModalOpen(false);
        loadData();
      } else {
        const errData = await res.json();
        toast.error(errData.message || 'Failed to save product');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const openDetail = async (prod) => {
    setSelectedProduct(prod);
    setDetailModalOpen(true);
    setLoadingLocations(true);
    try {
      const res = await authFetch(`${API}/products/${prod.id}/stock`);
      if (res.ok) {
        const data = await res.json();
        setProductStockLocations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching stock locations:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return toast.error('Category name required');
    try {
      const res = await authFetch(`${API}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name: newCatName.trim(), description: newCatDesc.trim() })
      });
      if (res.ok) {
        toast.success('Category created successfully');
        setNewCatName('');
        setNewCatDesc('');
        const catRes = await authFetch(`${API}/categories`);
        if (catRes.ok) setCategories(await catRes.json());
      } else {
        toast.error('Failed to create category');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await authFetch(`${API}/categories/${catId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Category deleted');
        const catRes = await authFetch(`${API}/categories`);
        if (catRes.ok) setCategories(await catRes.json());
      } else {
        const err = await res.json();
        toast.error(err.message || 'Cannot delete category');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const columns = [
    { key: 'sku', label: 'SKU / Barcode', render: (row) => (
      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded-md border border-slate-200">
        {row.sku}
      </span>
    )},
    { key: 'name', label: 'Product Name', render: (row) => (
      <span className="font-bold text-gray-900 block">{row.name}</span>
    )},
    { key: 'category_name', label: 'Category', render: (row) => (
      <span className="text-xs font-semibold text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100">
        {row.category_name || 'Unassigned'}
      </span>
    )},
    { key: 'total_stock', label: 'Stock Level & Status', render: (row) => {
      const stock = Number(row.total_stock) || 0;
      const reorder = Number(row.reorder_level) || 10;
      const isLow = stock > 0 && stock <= reorder;
      const isOut = stock === 0;
      
      // Calculate target capacity fill (assume 2.5x reorder as 100%)
      const maxRef = Math.max(reorder * 2.5, 30);
      const fillPct = Math.min(100, Math.round((stock / maxRef) * 100));

      let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      let barClass = "bg-emerald-500";
      let dotColor = "bg-emerald-500";
      let label = "Optimal";
      
      if (isOut) {
        badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
        barClass = "bg-rose-500";
        dotColor = "bg-rose-500 animate-ping";
        label = "Out of Stock";
      } else if (isLow) {
        badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
        barClass = "bg-amber-500";
        dotColor = "bg-amber-500 animate-pulse";
        label = "Low Stock";
      }

      return (
        <div className="space-y-1.5 min-w-[170px]">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold border ${badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              {stock} {row.unit_of_measure}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {label}
            </span>
          </div>

          {/* Micro Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div 
              style={{ width: `${Math.max(5, fillPct)}%` }} 
              className={`h-full rounded-full transition-all ${barClass}`} 
            />
          </div>
        </div>
      );
    }},
    { key: 'reorder_level', label: 'Min Threshold', render: (row) => (
      <span className="text-xs text-gray-500 font-mono font-medium">Min {row.reorder_level} {row.unit_of_measure}</span>
    )},
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => openDetail(row)} 
          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
          title="View Locations Breakdown"
        >
          <Eye size={17} />
        </button>
        <button 
          onClick={() => {
            setFormData({
              id: row.id,
              name: row.name,
              sku: row.sku,
              category_id: row.category_id || '',
              unit_of_measure: row.unit_of_measure || 'Units',
              reorder_level: row.reorder_level || 10,
              initial_stock: '',
              warehouse_id: ''
            });
            setModalOpen(true);
          }}
          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
          title="Edit Specifications"
        >
          <Edit2 size={17} />
        </button>
      </div>
    )}
  ];

  const handleExportCSV = () => {
    if (!products.length) return toast.error('No products available to export');
    const cols = [
      { label: 'SKU Code', key: 'sku' },
      { label: 'Product Name', key: 'name' },
      { label: 'Category', key: (r) => r.category_name || 'Unassigned' },
      { label: 'Total Stock Available', key: 'total_stock' },
      { label: 'Unit of Measure', key: 'unit_of_measure' },
      { label: 'Reorder Level Threshold', key: 'reorder_level' },
      { label: 'Inventory Status', key: (r) => {
        const s = Number(r.total_stock) || 0;
        const ro = Number(r.reorder_level) || 0;
        if (s === 0) return 'OUT_OF_STOCK';
        if (s <= ro) return 'LOW_STOCK';
        return 'OPTIMAL';
      }}
    ];
    exportToCSV(products, cols, 'StockSense_Product_Catalog_Export');
    toast.success('Product catalog exported successfully to CSV / Excel');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="text-blue-600" size={24} />
            Industrial Product Catalog
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage SKU specifications, safety thresholds, and multi-hub stock levels</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold shadow-2xs transition"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-2xs transition"
          >
            <Layers size={15} />
            Categories ({categories.length})
          </button>
          <button
            onClick={() => {
              setFormData({
                id: null,
                name: '',
                sku: '',
                category_id: categories[0]?.id || '',
                unit_of_measure: 'Units',
                reorder_level: 15,
                initial_stock: '',
                warehouse_id: warehouses[0]?.id || ''
              });
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:shadow-md transition active:scale-95"
          >
            <Plus size={16} />
            New Product
          </button>
        </div>
      </div>

      {/* Top Mini-Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total SKUs</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{metrics.totalSKUs}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Volume</p>
          <p className="text-2xl font-extrabold text-indigo-600 mt-0.5">{metrics.totalUnits.toLocaleString()}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Low Stock Warnings</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-0.5">{metrics.lowStock}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Depleted / Zero Stock</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-0.5">{metrics.outOfStock}</p>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
            categoryFilter === ''
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-gray-600 hover:bg-slate-50'
          }`}
        >
          All Categories ({metrics.totalSKUs})
        </button>
        {categories.map((c) => {
          const isSelected = String(categoryFilter) === String(c.id);
          return (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(isSelected ? '' : String(c.id))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-gray-600 hover:bg-slate-50'
              }`}
            >
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by SKU code or product title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-24 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-800 placeholder-gray-400"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-blue-700 transition"
          >
            Search
          </button>
        </form>

        <div className="w-full sm:w-64">
          <SelectField 
            placeholder="Filter by Category" 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)} 
            options={categories.map(c => ({ value: String(c.id), label: c.name }))} 
          />
        </div>
      </div>
      
      {/* Products Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-9 h-9 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <DataTable columns={columns} data={products} emptyMessage="No products match your current filters." />
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={formData.id ? "Edit Product Specifications" : "Create New Product"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField 
              label="Product Name" 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              placeholder="e.g. Industrial Ball Bearing" 
              required 
            />
            <InputField 
              label="SKU / Barcode" 
              value={formData.sku} 
              onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})} 
              placeholder="e.g. BRG-6204" 
              required 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField 
              label="Product Category" 
              placeholder="Select Category..." 
              value={formData.category_id} 
              onChange={(e) => setFormData({...formData, category_id: e.target.value})} 
              options={categories.map(c => ({ value: String(c.id), label: c.name }))} 
              required
            />
            <InputField 
              label="Unit of Measure (UoM)" 
              value={formData.unit_of_measure} 
              onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value})} 
              placeholder="Units, kg, Meters, Boxes..." 
              required 
            />
          </div>

          <div>
            <InputField 
              label="Reordering Rule Threshold (Minimum Stock Level)" 
              type="number" 
              value={formData.reorder_level} 
              onChange={(e) => setFormData({...formData, reorder_level: e.target.value})} 
              placeholder="Minimum stock quantity before alert"
              required 
            />
            <p className="text-[11px] text-gray-400 mt-1">Triggers low stock alerts on the dashboard when total inventory drops below this level.</p>
          </div>

          {/* Initial stock section (Only available on create) */}
          {!formData.id && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-3">
              <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Warehouse size={15} />
                Initial Stock Ingestion (Optional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InputField 
                  label="Initial Quantity" 
                  type="number" 
                  value={formData.initial_stock} 
                  onChange={(e) => setFormData({...formData, initial_stock: e.target.value})} 
                  placeholder="0" 
                />
                <SelectField 
                  label="Target Warehouse" 
                  placeholder="Select Warehouse..." 
                  value={formData.warehouse_id} 
                  onChange={(e) => setFormData({...formData, warehouse_id: e.target.value})} 
                  options={warehouses.map(w => ({ value: String(w.id), label: w.name }))} 
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:shadow-md transition"
            >
              {formData.id ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Breakdown per Location Modal */}
      <Modal 
        isOpen={detailModalOpen} 
        onClose={() => setDetailModalOpen(false)} 
        title={`Stock Distribution: ${selectedProduct?.name || ''}`}
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">SKU Code</p>
              <p className="font-mono font-bold text-sm text-gray-900">{selectedProduct?.sku}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total System Stock</p>
              <p className="font-bold text-base text-blue-600">{selectedProduct?.total_stock || 0} {selectedProduct?.unit_of_measure}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location Breakdown</h4>
            {loadingLocations ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : productStockLocations.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No warehouse inventory recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {productStockLocations.map((loc, i) => (
                  <div key={i} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50 transition">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Warehouse size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-gray-800">{loc.warehouse_name}</p>
                        <p className="text-[11px] text-gray-400">{loc.location || 'Depot'}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-gray-800">
                      {loc.quantity} {selectedProduct?.unit_of_measure}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Manage Categories"
      >
        <div className="space-y-4">
          <form onSubmit={handleCreateCategory} className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Add New Category</h4>
            <InputField 
              label="Category Name" 
              value={newCatName} 
              onChange={(e) => setNewCatName(e.target.value)} 
              placeholder="e.g. Precision Optics" 
              required 
            />
            <InputField 
              label="Description (Optional)" 
              value={newCatDesc} 
              onChange={(e) => setNewCatDesc(e.target.value)} 
              placeholder="e.g. Laser emitters and receivers" 
            />
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Add Category
            </button>
          </form>

          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Existing Categories ({categories.length})</h4>
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {categories.map((cat) => (
                <div key={cat.id} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50 transition">
                  <div>
                    <p className="font-bold text-xs text-gray-800">{cat.name}</p>
                    <p className="text-[11px] text-gray-400 truncate max-w-xs">{cat.description || 'No description'}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Category"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
