import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Loader2, ChevronLeft, ChevronRight, Search, RotateCcw, 
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, SlidersHorizontal, 
  History, Package, Warehouse, Sparkles, Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import SelectField from '../components/SelectField';
import { exportToCSV } from '../utils/exportCsv';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const parseDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const formatted = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    const d = new Date(formatted);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
};

export default function MoveHistory() {
  const { token } = useAuth();
  const [moves, setMoves] = useState([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ total: 0, pages: 1, limit: 20 });
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ product: '', warehouse: '', type: '' });

  const authFetch = (url, opts = {}) => fetch(url, { 
    ...opts, 
    headers: { 
      ...opts.headers, 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } 
  });

  const loadData = async (targetPage = page) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: targetPage,
        limit: 20
      });
      if (search) queryParams.append('search', search);
      if (filters.product) queryParams.append('product_id', filters.product);
      if (filters.warehouse) queryParams.append('warehouse_id', filters.warehouse);
      if (filters.type) queryParams.append('move_type', filters.type);

      const [movesRes, prodRes, whRes] = await Promise.all([
        authFetch(`${API}/stock-moves?${queryParams.toString()}`),
        authFetch(`${API}/products`),
        authFetch(`${API}/warehouses`)
      ]);
      
      if (movesRes.ok) {
        const movesData = await movesRes.json();
        if (movesData && Array.isArray(movesData.data)) {
          setMoves(movesData.data);
          if (movesData.pagination) {
            setPageInfo(movesData.pagination);
          }
        } else if (Array.isArray(movesData)) {
          setMoves(movesData);
          setPageInfo({ total: movesData.length, pages: 1, limit: 20 });
        } else {
          setMoves([]);
        }
      } else {
        toast.error('Could not fetch move records');
      }

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : (prodData.data || []));
      }

      if (whRes.ok) {
        const whData = await whRes.json();
        setWarehouses(Array.isArray(whData) ? whData : (whData.data || []));
      }
    } catch (err) {
      console.error('Move history error:', err);
      toast.error('Network error loading history');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData(page);
    }
  }, [token, page, filters.product, filters.warehouse, filters.type]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilters({ product: '', warehouse: '', type: '' });
    setPage(1);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(page);
  };

  const getMoveTypeBadge = (type) => {
    const config = {
      receipt: {
        label: 'Receipt In',
        gradient: 'from-emerald-500/20 to-teal-500/20 text-emerald-700 border-emerald-300',
        icon: ArrowDownLeft
      },
      delivery: {
        label: 'Delivery Out',
        gradient: 'from-rose-500/20 to-red-500/20 text-rose-700 border-rose-300',
        icon: ArrowUpRight
      },
      transfer_in: {
        label: 'Transfer In',
        gradient: 'from-blue-500/20 to-cyan-500/20 text-blue-700 border-blue-300',
        icon: ArrowDownLeft
      },
      transfer_out: {
        label: 'Transfer Out',
        gradient: 'from-indigo-500/20 to-purple-500/20 text-indigo-700 border-indigo-300',
        icon: ArrowUpRight
      },
      adjustment: {
        label: 'Adjustment',
        gradient: 'from-amber-500/20 to-orange-500/20 text-amber-700 border-amber-300',
        icon: ArrowLeftRight
      }
    };

    const item = config[type] || {
      label: type ? type.replace('_', ' ').toUpperCase() : 'UNKNOWN',
      gradient: 'from-gray-200 to-gray-100 text-gray-700 border-gray-300',
      icon: History
    };

    const Icon = item.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${item.gradient} bg-gradient-to-r shadow-xs`}>
        <Icon size={13} />
        {item.label}
      </span>
    );
  };

  // Summary counts
  const totalMovesCount = pageInfo.total || moves.length;
  const inMovesCount = moves.filter(m => m.move_type === 'receipt' || m.move_type === 'transfer_in').length;
  const outMovesCount = moves.filter(m => m.move_type === 'delivery' || m.move_type === 'transfer_out').length;

  const handleExportCSV = () => {
    if (!moves.length) return toast.error('No movements to export');
    const exportColumns = [
      { label: 'Date / Timestamp', key: (r) => r.created_at || r.date || '' },
      { label: 'Document Ref', key: 'reference' },
      { label: 'Movement Type', key: (r) => (r.move_type || r.type || '').toUpperCase() },
      { label: 'SKU', key: 'sku' },
      { label: 'Product Name', key: (r) => r.product_name || r.product || '' },
      { label: 'Warehouse', key: (r) => r.warehouse_name || r.warehouse || '' },
      { label: 'Quantity Delta', key: (r) => {
        const q = r.quantity;
        const isOutflow = (r.move_type === 'delivery' || r.move_type === 'transfer_out');
        return isOutflow ? `-${Math.abs(q)}` : `+${Math.abs(q)}`;
      }},
      { label: 'Balance After', key: (r) => r.balance_after ?? '' }
    ];
    exportToCSV(moves, exportColumns, 'StockSense_Ledger_Report');
    toast.success('Stock Ledger downloaded as CSV/Excel');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }} 
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          title="Stock Ledger & Move History" 
          subtitle="Real-time audit log of every incoming, outgoing, transfer, and adjustment movement" 
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-sm transition-all hover:shadow active:scale-95"
            title="Download complete movement records as CSV / Excel"
          >
            <Download size={16} />
            Export CSV / Excel
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 shadow-sm transition-all hover:shadow active:scale-95 disabled:opacity-50"
          >
            <RotateCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-white to-blue-50 border border-blue-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Total Movements</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{totalMovesCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <History size={22} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-emerald-50 border border-emerald-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Inbound Events (Page)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{inMovesCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <ArrowDownLeft size={22} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 via-white to-rose-50 border border-rose-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Outbound Events (Page)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{outMovesCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md">
            <ArrowUpRight size={22} />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 bg-gradient-to-br from-white/95 to-blue-50/40 backdrop-blur-md rounded-2xl border border-blue-100 shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Search reference, SKU, or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm bg-white shadow-xs transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-lg shadow hover:opacity-95 transition"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <div className="w-full sm:w-48">
              <SelectField 
                placeholder="All Products" 
                value={filters.product} 
                onChange={(e) => { setFilters({...filters, product: e.target.value}); setPage(1); }} 
                options={products.map(p => ({ value: p.id, label: p.name }))} 
              />
            </div>
            
            <div className="w-full sm:w-48">
              <SelectField 
                placeholder="All Warehouses" 
                value={filters.warehouse} 
                onChange={(e) => { setFilters({...filters, warehouse: e.target.value}); setPage(1); }} 
                options={warehouses.map(w => ({ value: w.id, label: w.name }))} 
              />
            </div>

            <div className="w-full sm:w-44">
              <SelectField 
                placeholder="All Move Types" 
                value={filters.type} 
                onChange={(e) => { setFilters({...filters, type: e.target.value}); setPage(1); }} 
                options={[
                  { value: 'receipt', label: 'Receipt In' },
                  { value: 'delivery', label: 'Delivery Out' },
                  { value: 'transfer_in', label: 'Transfer In' },
                  { value: 'transfer_out', label: 'Transfer Out' },
                  { value: 'adjustment', label: 'Adjustment' }
                ]} 
              />
            </div>

            {(search || filters.product || filters.warehouse || filters.type) && (
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition self-center"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
        {loading && !isRefreshing ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-gray-500">Loading stock ledger records...</p>
          </div>
        ) : moves.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 mx-auto flex items-center justify-center mb-4 shadow-inner">
              <History size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No stock movements found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
              Stock movements are automatically recorded whenever goods are received via Receipts, dispatched via Deliveries, transferred, or adjusted.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a
                href="/receipts"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition"
              >
                Create a Receipt
              </a>
              <a
                href="/products"
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                View Products
              </a>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border-b border-blue-100 text-xs uppercase font-bold text-gray-500 tracking-wider">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Movement Type</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Warehouse</th>
                  <th className="px-6 py-4">Document Ref</th>
                  <th className="px-6 py-4 text-right">Quantity</th>
                  <th className="px-6 py-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {moves.map((m, idx) => {
                  const isOutflow = m.move_type === 'delivery' || m.move_type === 'transfer_out';
                  const isInflow = m.move_type === 'receipt' || m.move_type === 'transfer_in';
                  
                  return (
                    <motion.tr
                      key={m.id || idx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                        {parseDate(m.created_at)}
                      </td>

                      {/* Movement Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getMoveTypeBadge(m.move_type)}
                      </td>

                      {/* Product */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            <Package size={14} />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-800 block">
                              {m.product_name || 'Item #' + m.product_id}
                            </span>
                            {m.sku && (
                              <span className="text-xs font-mono text-gray-400">
                                SKU: {m.sku}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100/80 px-2.5 py-1 rounded-lg">
                          <Warehouse size={13} className="text-gray-400" />
                          <span>{m.warehouse_name || 'Warehouse #' + m.warehouse_id}</span>
                        </div>
                      </td>

                      {/* Reference */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                          {m.reference || 'N/A'}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-block font-bold text-sm px-2.5 py-0.5 rounded-lg ${
                          isOutflow 
                            ? 'text-rose-700 bg-rose-50 border border-rose-200' 
                            : isInflow 
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                            : 'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}>
                          {isOutflow ? `-${Math.abs(m.quantity)}` : `+${Math.abs(m.quantity)}`}
                        </span>
                      </td>

                      {/* Balance After */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="font-bold text-gray-800 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                          {m.balance_after}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pageInfo.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/60 gap-3">
            <span className="text-xs sm:text-sm text-gray-500">
              Showing page <span className="font-semibold text-gray-800">{page}</span> of{' '}
              <span className="font-semibold text-gray-800">{pageInfo.pages}</span> ({pageInfo.total} total moves recorded)
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition"
              >
                <ChevronLeft size={16} />
                Prev
              </button>
              <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-xs">
                {page}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(pageInfo.pages, p + 1))}
                disabled={page === pageInfo.pages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
