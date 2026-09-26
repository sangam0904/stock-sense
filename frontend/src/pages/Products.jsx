import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Plus, Loader2, Eye, Search, Warehouse, 
  AlertTriangle, CheckCircle2, XCircle, SlidersHorizontal, Edit2,
  Layers, FolderPlus, Trash2, Download
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
        // Reload categories
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
    { key: 'sku', label: 'SKU / Code', render: (row) => (
      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded-md border border-slate-200">
        {row.sku}
      </span>
    )},
    { key: 'name', label: 'Product Name', render: (row) => (
      <span className="font-semibold text-gray-900 block">{row.name}</span>
    )},
    { key: 'category_name', label: 'Category', render: (row) => (
      <span className="text-xs text-gray-600 bg-blue-50/60 px-2.5 py-1 rounded-lg border border-blue-100">
        {row.category_name || 'Unassigned'}
      </span>
    )},
    { key: 'total_stock', label: 'Total Stock Available', render: (row) => {
      const stock = row.total_stock || 0;
      const isLow = stock > 0 && stock <= row.reorder_level;
      const isOut = stock === 0;
      
      let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      let dotColor = "bg-emerald-500";
      
      if (isOut) {
        badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
        dotColor = "bg-rose-500 animate-ping";
      } else if (isLow) {
        badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
        dotColor = "bg-amber-500 animate-pulse";
      }

      return (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeClass}`}>
            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
            {stock} {row.unit_of_measure}
          </span>
          {isLow && <span className="text-[10px] text-amber-600 font-bold uppercase">Low Stock</span>}
          {isOut && <span className="text-[10px] text-rose-600 font-bold uppercase">Out of Stock</span>}
        </div>
      );
    }},
    { key: 'reorder_level', label: 'Reorder Threshold', render: (row) => (
      <span className="text-xs text-gray-500 font-medium">Min {row.reorder_level} {row.unit_of_measure}</span>
    )},
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex items-center gap-1">
        <button 
          onClick={() => openDetail(row)} 
          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
          title="View Stock Breakdown per Location"
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
          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
          title="Edit Product"
        >
          <Edit2 size={16} />
        </button>
      </div>
    )}
  ];

  const handleExportCSV = () => {
    if (!products.length) return toast.error('No products to export');
    const exportColumns = [
      { label: 'SKU / Code', key: 'sku' },
      { label: 'Product Name', key: 'name' },
      { label: 'Category', key: (p) => p.category_name || 'Unassigned' },
      { label: 'Total Stock', key: (p) => p.total_stock || 0 },
      { label: 'Unit of Measure', key: 'unit_of_measure' },
      { label: 'Reorder Level', key: 'reorder_level' },
      { label: 'Stock Status', key: (p) => {
        const stock = p.total_stock || 0;
        if (stock === 0) return 'Out of Stock';
        if (stock <= p.reorder_level) return 'Low Stock';
        return 'In Stock';
      }}
    ];
    exportToCSV(products, exportColumns, 'StockSense_Products_Catalog');
    toast.success('Product inventory exported as CSV/Excel');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          title="Product Catalog & Stock Rules" 
          subtitle="Manage items, SKU codes, reorder rules, and location-based availability" 
        />
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-xl text-sm font-bold shadow-xs transition"
            title="Export complete inventory catalog to CSV / Excel"
          >
            <Download size={17} />
            Export CSV
          </button>
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl text-sm font-bold shadow-xs transition"
          >
            <Layers size={17} />
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
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition active:scale-95"
          >
            <Plus size={18} />
            Create Product
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-blue-100 shadow-sm flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
          <input
            type="text"
            placeholder="Search by SKU code or product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow hover:bg-blue-700 transition"
          >
            Search
          </button>
        </form>

        <div className="w-full sm:w-64">
          <SelectField 
            placeholder="All Product Categories" 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)} 
            options={categories.map(c => ({ value: c.id, label: c.name }))} 
          />
        </div>
      </div>
      
      {/* Products Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
          <DataTable columns={columns} data={products} emptyMessage="No products match your search." />
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
              options={categories.map(c => ({ value: c.id, label: c.name }))} 
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
                  options={warehouses.map(w => ({ value: w.id, label: w.name }))} 
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button 
              type="button" 
              onClick={() => setModalOpen(false)} 
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition"
            >
              Save Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Product Details & Location Stock Breakdown Modal */}
      <Modal 
        isOpen={detailModalOpen} 
        onClose={() => setDetailModalOpen(false)} 
        title="Product Details & Location Stock"
      >
        {selectedProduct && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-gray-900">{selectedProduct.name}</h4>
                <p className="font-mono text-xs font-bold text-blue-700 mt-0.5">SKU: {selectedProduct.sku}</p>
              </div>
              <span className="text-xs font-semibold bg-white border border-gray-200 px-3 py-1 rounded-full shadow-xs">
                {selectedProduct.category_name || 'Category'}
              </span>
            </div>

            {/* Reorder Status Alert Box */}
            {(() => {
              const stock = selectedProduct.total_stock || 0;
              const isOut = stock === 0;
              const isLow = stock > 0 && stock <= selectedProduct.reorder_level;

              if (isOut) {
                return (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                    <XCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs">
                      <p className="font-bold text-rose-800">Critical Stock Outage</p>
                      <p className="text-rose-700 mt-0.5">Current stock is 0 {selectedProduct.unit_of_measure}. Minimum threshold is {selectedProduct.reorder_level}. Create a vendor receipt immediately.</p>
                    </div>
                  </div>
                );
              }
              if (isLow) {
                return (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs">
                      <p className="font-bold text-amber-800">Low Stock Reordering Triggered</p>
                      <p className="text-amber-700 mt-0.5">Current stock ({stock}) has fallen below the reorder point of {selectedProduct.reorder_level} {selectedProduct.unit_of_measure}. Recommended reorder batch: {selectedProduct.reorder_level * 2} {selectedProduct.unit_of_measure}.</p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-800">Stock Availability Healthy</p>
                    <p className="text-emerald-700 mt-0.5">Current level ({stock} {selectedProduct.unit_of_measure}) comfortably exceeds minimum reorder threshold of {selectedProduct.reorder_level}.</p>
                  </div>
                </div>
              );
            })()}

            {/* Stock Availability Per Location (From PDF specification!) */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <Warehouse size={15} className="text-blue-600" />
                Stock Availability Per Location
              </h5>

              {loadingLocations ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
              ) : productStockLocations.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center text-xs text-gray-500">
                  No warehouse allocations found for this item.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-xs">
                  {productStockLocations.map((loc, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs font-semibold text-gray-800">{loc.warehouse_name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-md">
                        {loc.quantity} {selectedProduct.unit_of_measure}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setDetailModalOpen(false)} 
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Category Management Modal (PDF Specification: Product Categories) */}
      <Modal isOpen={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Manage Product Categories" size="md">
        <div className="space-y-5">
          {/* Quick Create Category Form */}
          <form onSubmit={handleCreateCategory} className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <FolderPlus size={15} className="text-blue-600" />
              Add New Category
            </h4>
            <div className="space-y-2">
              <InputField 
                label="Category Name" 
                placeholder="e.g. Raw Materials, Electronics..." 
                value={newCatName} 
                onChange={(e) => setNewCatName(e.target.value)} 
                required 
              />
              <InputField 
                label="Description (Optional)" 
                placeholder="Brief category summary..." 
                value={newCatDesc} 
                onChange={(e) => setNewCatDesc(e.target.value)} 
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              + Create Category
            </button>
          </form>

          {/* Existing Categories List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Existing Categories ({categories.length})
            </h4>
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-200">
              {categories.map((cat) => (
                <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                  <div>
                    <p className="text-xs font-bold text-gray-800">{cat.name}</p>
                    {cat.description && <p className="text-[11px] text-gray-500">{cat.description}</p>}
                  </div>
                  <button
                    type="button"
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

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCategoryModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
