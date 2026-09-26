import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Package, AlertTriangle, XCircle, ArrowDownToLine, ArrowUpFromLine, 
  RefreshCw, Loader2, ArrowRight, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, History, Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import KPICard from '../components/KPICard';
import DataTable from '../components/DataTable';
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
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
};

export default function Dashboard() {
  const { token, user } = useAuth();
  const [kpis, setKpis] = useState({ 
    totalProducts: 0, 
    lowStockItems: 0, 
    outOfStockItems: 0, 
    pendingReceipts: 0, 
    pendingDeliveries: 0,
    scheduledTransfers: 0
  });
  const [recentMoves, setRecentMoves] = useState([]);
  const [operations, setOperations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [viewMode, setViewMode] = useState('operations'); // 'operations' | 'moves'
  
  // 4 Dynamic Filters from PDF specification:
  // 1. By document type: Receipts / Delivery / Internal / Adjustments
  // 2. By status: Draft, Waiting, Ready, Done, Canceled
  // 3. By warehouse or location
  // 4. By product category
  const [filters, setFilters] = useState({ 
    type: '', 
    status: '', 
    warehouse: '', 
    category: '' 
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const authFetch = (url) => fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

  const loadData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);

      const [kpiRes, movesRes, opsRes, whRes, catRes] = await Promise.all([
        authFetch(`${API}/dashboard/kpis`),
        authFetch(`${API}/dashboard/recent-moves`),
        authFetch(`${API}/dashboard/operations`),
        authFetch(`${API}/warehouses`),
        authFetch(`${API}/categories`)
      ]);

      if (kpiRes.ok) setKpis(await kpiRes.json());
      if (movesRes.ok) {
        const moves = await movesRes.json();
        setRecentMoves(Array.isArray(moves) ? moves : (moves.data || []));
      }
      if (opsRes.ok) {
        const ops = await opsRes.json();
        setOperations(Array.isArray(ops) ? ops : (ops.data || []));
      }
      if (whRes.ok) {
        const whs = await whRes.json();
        setWarehouses(Array.isArray(whs) ? whs : (whs.data || []));
      }
      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(Array.isArray(cats) ? cats : (cats.data || []));
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
      const interval = setInterval(() => loadData(true), 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const getMoveTypeBadge = (type) => {
    const config = {
      receipt: { label: 'Receipt In', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      delivery: { label: 'Delivery Out', class: 'bg-rose-50 text-rose-700 border-rose-200' },
      transfer_in: { label: 'Transfer In', class: 'bg-blue-50 text-blue-700 border-blue-200' },
      transfer_out: { label: 'Transfer Out', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      transfer: { label: 'Internal Transfer', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      adjustment: { label: 'Adjustment', class: 'bg-amber-50 text-amber-700 border-amber-200' }
    };
    const c = config[type] || { label: type ? type.toUpperCase() : 'MOVE', class: 'bg-gray-100 text-gray-700 border-gray-200' };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.class}`}>
        {c.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const s = (status || 'draft').toLowerCase();
    const map = {
      draft: 'bg-gray-100 text-gray-700 border-gray-200',
      waiting: 'bg-amber-50 text-amber-700 border-amber-200',
      ready: 'bg-blue-50 text-blue-700 border-blue-200',
      done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      canceled: 'bg-rose-50 text-rose-700 border-rose-200'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${map[s] || map.draft}`}>
        {s}
      </span>
    );
  };

  // Operations Table Columns
  const operationColumns = [
    { key: 'reference', label: 'Reference', render: (row) => (
      <Link 
        to={`/${row.doc_type === 'receipt' ? 'receipts' : row.doc_type === 'delivery' ? 'deliveries' : row.doc_type === 'transfer' ? 'transfers' : 'adjustments'}`}
        className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
      >
        {row.reference}
      </Link>
    )},
    { key: 'type', label: 'Document Type', render: (row) => getMoveTypeBadge(row.doc_type) },
    { key: 'status', label: 'Status', render: (row) => getStatusBadge(row.status) },
    { key: 'warehouse_name', label: 'Warehouse / Route', render: (row) => (
      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{row.warehouse_name}</span>
    )},
    { key: 'details', label: 'Partner / Details', render: (row) => (
      <span className="text-xs text-gray-600">{row.details || '-'}</span>
    )},
    { key: 'items_summary', label: 'Items', render: (row) => (
      <span className="text-xs text-gray-500 truncate max-w-xs block" title={row.items_summary}>
        {row.items_summary ? `${row.item_count || 1} item(s): ${row.items_summary}` : `${row.item_count || 0} item(s)`}
      </span>
    )},
    { key: 'created_at', label: 'Date', render: (row) => (
      <span className="text-xs text-gray-500 font-mono">{parseDate(row.created_at)}</span>
    )}
  ];

  // Stock Moves Columns
  const moveColumns = [
    { key: 'created_at', label: 'Timestamp', render: (row) => (
      <span className="text-xs text-gray-500 font-mono">{parseDate(row.created_at || row.date)}</span>
    )},
    { key: 'type', label: 'Type', render: (row) => getMoveTypeBadge(row.move_type || row.type) },
    { key: 'product', label: 'Product', render: (row) => (
      <span className="font-semibold text-gray-800">{row.product_name || row.product || 'Item #' + row.product_id}</span>
    )},
    { key: 'warehouse', label: 'Warehouse', render: (row) => (
      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{row.warehouse_name || row.warehouse || '-'}</span>
    )},
    { key: 'reference', label: 'Doc Ref', render: (row) => (
      <span className="font-mono text-xs font-semibold text-gray-600">{row.reference || '-'}</span>
    )},
    { key: 'quantity', label: 'Quantity', render: (row) => {
      const q = row.quantity;
      const isOutflow = (row.move_type === 'delivery' || row.move_type === 'transfer_out');
      return (
        <span className={`font-bold text-xs px-2 py-0.5 rounded ${
          isOutflow 
            ? 'text-rose-700 bg-rose-50 border border-rose-200' 
            : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
        }`}>
          {isOutflow ? `-${Math.abs(q)}` : `+${Math.abs(q)}`}
        </span>
      );
    }},
    { key: 'balance_after', label: 'Balance After', render: (row) => (
      <span className="font-semibold text-xs text-gray-700">{row.balance_after ?? '-'}</span>
    )}
  ];

  // Apply all 4 PDF Dynamic Filters to Operations
  const filteredOperations = operations.filter(op => {
    // 1. By document type: Receipts / Delivery / Internal / Adjustments
    const matchType = !filters.type || op.doc_type === filters.type;
    
    // 2. By status: Draft, Waiting, Ready, Done, Canceled
    const matchStatus = !filters.status || (op.status || '').toLowerCase() === filters.status.toLowerCase();
    
    // 3. By warehouse / location
    const matchWh = !filters.warehouse || String(op.warehouse_id) === String(filters.warehouse);
    
    // 4. By product category
    const matchCat = !filters.category || (op.category_ids && op.category_ids.split(',').includes(String(filters.category)));

    return matchType && matchStatus && matchWh && matchCat;
  });

  // Apply filters to Moves
  const filteredMoves = recentMoves.filter(move => {
    const matchType = !filters.type || (move.move_type || move.type) === filters.type || 
      (filters.type === 'transfer' && (move.move_type === 'transfer_in' || move.move_type === 'transfer_out'));
    const matchWh = !filters.warehouse || String(move.warehouse_id) === String(filters.warehouse);
    const matchCat = !filters.category || String(move.category_id) === String(filters.category);
    return matchType && matchWh && matchCat;
  });

  // All 5 core Dashboard KPIs from PDF Page 1:
  // 1. Total Products in Stock
  // 2. Low Stock Items
  // 3. Out of Stock Items
  // 4. Pending Receipts
  // 5. Pending Deliveries
  // 6. Internal Transfers Scheduled
  const kpiCards = [
    { title: 'Total Products', value: kpis.totalProducts, icon: Package, gradient: 'from-blue-500 to-cyan-400' },
    { title: 'Low Stock', value: kpis.lowStockItems, icon: AlertTriangle, gradient: 'from-amber-500 to-orange-400' },
    { title: 'Out of Stock', value: kpis.outOfStockItems, icon: XCircle, gradient: 'from-red-500 to-pink-400' },
    { title: 'Pending Receipts', value: kpis.pendingReceipts, icon: ArrowDownToLine, gradient: 'from-emerald-500 to-teal-400' },
    { title: 'Pending Deliveries', value: kpis.pendingDeliveries, icon: ArrowUpFromLine, gradient: 'from-purple-500 to-violet-400' },
    { title: 'Scheduled Transfers', value: kpis.scheduledTransfers, icon: ArrowLeftRight, gradient: 'from-indigo-600 to-blue-600' }
  ];

  const handleExportCSV = () => {
    if (viewMode === 'operations') {
      if (!filteredOperations.length) return toast.error('No operations to export');
      const cols = [
        { label: 'Date', key: (r) => r.created_at || '' },
        { label: 'Reference', key: 'reference' },
        { label: 'Document Type', key: (r) => (r.doc_type || '').toUpperCase() },
        { label: 'Status', key: 'status' },
        { label: 'Warehouse / Route', key: 'warehouse_name' },
        { label: 'Details / Party', key: 'details' },
        { label: 'Items Summary', key: 'items_summary' },
        { label: 'Item Count', key: 'item_count' }
      ];
      exportToCSV(filteredOperations, cols, 'StockSense_Operations_Report');
      toast.success('Operations report downloaded as CSV/Excel');
    } else {
      if (!filteredMoves.length) return toast.error('No movements to export');
      const cols = [
        { label: 'Date / Timestamp', key: (r) => r.created_at || r.date || '' },
        { label: 'Document Ref', key: 'reference' },
        { label: 'Movement Type', key: (r) => (r.move_type || r.type || '').toUpperCase() },
        { label: 'SKU', key: 'sku' },
        { label: 'Product Name', key: (r) => r.product_name || r.product || '' },
        { label: 'Warehouse', key: (r) => r.warehouse_name || '' },
        { label: 'Quantity', key: 'quantity' },
        { label: 'Balance After', key: (r) => r.balance_after ?? '' }
      ];
      exportToCSV(filteredMoves, cols, 'StockSense_Moves_Report');
      toast.success('Movement ledger downloaded as CSV/Excel');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-md mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              StockSense Live Operational Hub
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Welcome back, {user?.name || 'Manager'}!</h2>
            <p className="text-blue-100 text-sm mt-1">Here is your live real-time overview across all warehouse inventory and movements.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/move-history"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-900 text-xs font-bold shadow hover:bg-blue-50 transition"
            >
              <History size={16} />
              Open Stock Ledger
            </Link>
            <button 
              onClick={() => loadData(true)} 
              disabled={refreshing}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition backdrop-blur-sm"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Operation Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link 
          to="/receipts"
          className="p-3.5 rounded-2xl bg-white/90 border border-blue-100 shadow-sm hover:shadow-md transition flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
            <ArrowDownToLine size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Incoming Stock</p>
            <p className="text-[11px] text-gray-500">Create Receipt</p>
          </div>
        </Link>

        <Link 
          to="/deliveries"
          className="p-3.5 rounded-2xl bg-white/90 border border-blue-100 shadow-sm hover:shadow-md transition flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-105 transition">
            <ArrowUpFromLine size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Outgoing Stock</p>
            <p className="text-[11px] text-gray-500">Delivery Orders</p>
          </div>
        </Link>

        <Link 
          to="/transfers"
          className="p-3.5 rounded-2xl bg-white/90 border border-blue-100 shadow-sm hover:shadow-md transition flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition">
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Warehouse Transfer</p>
            <p className="text-[11px] text-gray-500">Internal Moves</p>
          </div>
        </Link>

        <Link 
          to="/move-history"
          className="p-3.5 rounded-2xl bg-white/90 border border-blue-100 shadow-sm hover:shadow-md transition flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition">
            <History size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Full Audit Ledger</p>
            <p className="text-[11px] text-gray-500">Move History</p>
          </div>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          {/* KPI Cards Strip - 6 Full KPIs from Page 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {kpiCards.map((kpi, i) => (
               <KPICard key={i} {...kpi} />
            ))}
          </div>

          {/* Recent Activity Table with all 4 Dynamic Filter dropdowns */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-blue-100 p-6 space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Inventory Operations & Activity</h3>
                <p className="text-xs text-gray-500 mt-0.5">Real-time stream of all incoming, outgoing, transfer, and adjustment operations</p>
              </div>

              {/* View Switcher & Export */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                  title="Export current view as CSV / Excel"
                >
                  <Download size={14} />
                  Export CSV
                </button>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode('operations')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      viewMode === 'operations'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Operations ({filteredOperations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('moves')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      viewMode === 'moves'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Moves ({filteredMoves.length})
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Dynamic Filters from PDF Specification */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
              {/* 1. Document Type */}
              <SelectField 
                placeholder="All Document Types" 
                value={filters.type} 
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                options={[
                  { value: 'receipt', label: 'Receipts (Inbound)' },
                  { value: 'delivery', label: 'Deliveries (Outbound)' },
                  { value: 'transfer', label: 'Internal Transfers' },
                  { value: 'adjustment', label: 'Stock Adjustments' }
                ]}
              />

              {/* 2. Status: Draft, Waiting, Ready, Done, Canceled */}
              <SelectField 
                placeholder="All Statuses" 
                value={filters.status} 
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'waiting', label: 'Waiting (Picking)' },
                  { value: 'ready', label: 'Ready (Packed)' },
                  { value: 'done', label: 'Done (Completed)' },
                  { value: 'canceled', label: 'Canceled' }
                ]}
              />

              {/* 3. Warehouse Location */}
              <SelectField 
                placeholder="All Warehouses" 
                value={filters.warehouse} 
                onChange={(e) => setFilters({...filters, warehouse: e.target.value})}
                options={warehouses.map(w => ({ value: w.id, label: w.name }))}
              />

              {/* 4. Product Category */}
              <SelectField 
                placeholder="All Categories" 
                value={filters.category} 
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
              />

              {/* Clear Filters Button */}
              {(filters.type || filters.warehouse || filters.category || filters.status) ? (
                <button
                  onClick={() => setFilters({ type: '', warehouse: '', category: '', status: '' })}
                  className="px-3 py-2 bg-white text-gray-700 hover:text-rose-600 text-xs font-bold rounded-xl border border-gray-200 hover:bg-rose-50 transition w-full"
                >
                  Clear Filters
                </button>
              ) : (
                <div className="flex items-center text-xs text-gray-400 px-2 italic">
                  Filtering 4 criteria live
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-100">
              <DataTable 
                columns={viewMode === 'operations' ? operationColumns : moveColumns} 
                data={viewMode === 'operations' ? filteredOperations : filteredMoves} 
                emptyMessage={viewMode === 'operations' ? "No documents match the selected filters." : "No stock movements match the selected filters."} 
              />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
