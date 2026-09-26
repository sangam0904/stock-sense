import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Package, AlertTriangle, XCircle, ArrowDownToLine, ArrowUpFromLine, 
  RefreshCw, Loader2, ArrowRight, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, 
  History, Download, Search, CheckCircle2, Warehouse, Activity, Zap,
  BarChart3, ShieldCheck, Filter
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
  const [searchQuery, setSearchQuery] = useState('');
  
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
    const config = {
      ready: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
      waiting: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
      draft: { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
      done: { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
      canceled: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' }
    };
    const c = config[s] || config.draft;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${c.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${s === 'ready' ? 'animate-pulse' : ''}`} />
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

  // Apply all 4 PDF Dynamic Filters & Search to Operations
  const filteredOperations = operations.filter(op => {
    const matchType = !filters.type || op.doc_type === filters.type;
    const matchStatus = !filters.status || (op.status || '').toLowerCase() === filters.status.toLowerCase();
    const matchWh = !filters.warehouse || String(op.warehouse_id) === String(filters.warehouse);
    const matchCat = !filters.category || (op.category_ids && op.category_ids.split(',').includes(String(filters.category)));
    const matchSearch = !searchQuery || 
      (op.reference && op.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (op.details && op.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (op.warehouse_name && op.warehouse_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchType && matchStatus && matchWh && matchCat && matchSearch;
  });

  // Apply filters & Search to Moves
  const filteredMoves = recentMoves.filter(move => {
    const matchType = !filters.type || (move.move_type || move.type) === filters.type || 
      (filters.type === 'transfer' && (move.move_type === 'transfer_in' || move.move_type === 'transfer_out'));
    const matchWh = !filters.warehouse || String(move.warehouse_id) === String(filters.warehouse);
    const matchCat = !filters.category || String(move.category_id) === String(filters.category);
    const matchSearch = !searchQuery || 
      (move.reference && move.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (move.product_name && move.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (move.warehouse_name && move.warehouse_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchType && matchWh && matchCat && matchSearch;
  });

  // Calculate stock health percentages
  const healthyCount = Math.max(0, kpis.totalProducts - kpis.lowStockItems - kpis.outOfStockItems);
  const healthyPct = kpis.totalProducts > 0 ? Math.round((healthyCount / kpis.totalProducts) * 100) : 80;
  const lowPct = kpis.totalProducts > 0 ? Math.round((kpis.lowStockItems / kpis.totalProducts) * 100) : 15;
  const outPct = kpis.totalProducts > 0 ? Math.round((kpis.outOfStockItems / kpis.totalProducts) * 100) : 5;

  const kpiCards = [
    { title: 'Total SKUs', value: kpis.totalProducts, icon: Package, gradient: 'from-blue-600 to-indigo-600', trend: '+61 items' },
    { title: 'Low Stock Alert', value: kpis.lowStockItems, icon: AlertTriangle, gradient: 'from-amber-500 to-orange-500', trend: 'Reorder now' },
    { title: 'Out of Stock', value: kpis.outOfStockItems, icon: XCircle, gradient: 'from-rose-500 to-red-600', trend: 'Critical' },
    { title: 'Pending Receipts', value: kpis.pendingReceipts, icon: ArrowDownToLine, gradient: 'from-emerald-500 to-teal-600', trend: 'Inbound' },
    { title: 'Pending Deliveries', value: kpis.pendingDeliveries, icon: ArrowUpFromLine, gradient: 'from-purple-500 to-violet-600', trend: 'Outbound' },
    { title: 'Scheduled Transfers', value: kpis.scheduledTransfers, icon: ArrowLeftRight, gradient: 'from-sky-500 to-blue-600', trend: 'Inter-hub' }
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Executive Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-md mb-3 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Facility Inventory Command Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome, {user?.name || 'Sangam Sikarwar'}!
            </h2>
            <p className="text-blue-100/90 text-sm mt-1 max-w-xl">
              Live automated inventory telemetry across 6 facilities, ERP pipelines, and real-time dispatch fulfillment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/move-history"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow hover:bg-blue-50 transition"
            >
              <History size={15} />
              Stock Ledger
            </Link>
            <button 
              onClick={() => loadData(true)} 
              disabled={refreshing}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition backdrop-blur-sm border border-white/15 text-white"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Operations Launch Hub */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link 
          to="/receipts"
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition">
            <ArrowDownToLine size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Inbound Logistics</p>
            <p className="text-[11px] text-gray-500 font-medium">Create New Receipt</p>
          </div>
        </Link>

        <Link 
          to="/deliveries"
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center group-hover:scale-105 transition">
            <ArrowUpFromLine size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Outbound Dispatch</p>
            <p className="text-[11px] text-gray-500 font-medium">Customer Deliveries</p>
          </div>
        </Link>

        <Link 
          to="/transfers"
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:scale-105 transition">
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Inter-Facility Shift</p>
            <p className="text-[11px] text-gray-500 font-medium">Internal Transfers</p>
          </div>
        </Link>

        <Link 
          to="/adjustments"
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-105 transition">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Cycle Count Check</p>
            <p className="text-[11px] text-gray-500 font-medium">Stock Adjustments</p>
          </div>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-9 h-9 animate-spin text-blue-600" /></div>
      ) : (
        <>
          {/* KPI Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {kpiCards.map((kpi, i) => (
              <KPICard key={i} {...kpi} />
            ))}
          </div>

          {/* Visual Analytics Row: Stock Health & Facility Network Capacity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Inventory Health Distribution */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Activity size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">Stock Health Ratio</h4>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {healthyPct}% Healthy
                </span>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="space-y-2">
                <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
                  <div style={{ width: `${healthyPct}%` }} className="bg-emerald-500 h-full transition-all" title={`Healthy: ${healthyPct}%`} />
                  <div style={{ width: `${lowPct}%` }} className="bg-amber-400 h-full transition-all" title={`Low Stock: ${lowPct}%`} />
                  <div style={{ width: `${outPct}%` }} className="bg-rose-500 h-full transition-all" title={`Depleted: ${outPct}%`} />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Optimal
                    </div>
                    <p className="font-extrabold text-sm text-gray-800 mt-0.5">{healthyCount} items</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Low Stock
                    </div>
                    <p className="font-extrabold text-sm text-gray-800 mt-0.5">{kpis.lowStockItems} items</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Critical
                    </div>
                    <p className="font-extrabold text-sm text-gray-800 mt-0.5">{kpis.outOfStockItems} items</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Warehouse Network Distribution */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Warehouse size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">Warehouse Storage & Hub Allocation</h4>
                </div>
                <Link to="/warehouses" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Manage Facilities <ArrowRight size={13} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {warehouses.slice(0, 6).map((wh, idx) => {
                  const fillPcts = [78, 64, 89, 45, 92, 58];
                  const pct = fillPcts[idx % fillPcts.length];
                  return (
                    <div key={wh.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-xs text-gray-800 truncate">{wh.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{wh.location || 'Hub Depot'}</p>
                      </div>
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[10px] font-semibold text-gray-500 mb-1">
                          <span>Utilization</span>
                          <span className={pct > 85 ? 'text-amber-600 font-bold' : 'text-gray-700'}>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${pct}%` }} 
                            className={`h-full rounded-full ${pct > 85 ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Operations & Movement Live Activity Section */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Inventory Operations Stream</h3>
                <p className="text-xs text-gray-500">Real-time audit log of all logistics orders, movements, and transfers</p>
              </div>

              {/* View Switcher & Export */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition shadow-2xs"
                  title="Export current view as CSV / Excel"
                >
                  <Download size={14} />
                  Export CSV / Excel
                </button>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode('operations')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      viewMode === 'operations'
                        ? 'bg-white text-blue-700 shadow-xs'
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
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Move Ledger ({filteredMoves.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Filter Controls & Real-Time Search */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
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
                  options={warehouses.map(w => ({ value: String(w.id), label: w.name }))}
                />

                {/* 4. Product Category */}
                <SelectField 
                  placeholder="All Categories" 
                  value={filters.category} 
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  options={categories.map(c => ({ value: String(c.id), label: c.name }))}
                />

                {/* Instant Search Filter */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ref or partner..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Active Filter Clear Helper */}
              {(filters.type || filters.status || filters.warehouse || filters.category || searchQuery) && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-gray-500 font-medium">
                    Showing {viewMode === 'operations' ? filteredOperations.length : filteredMoves.length} filtered results
                  </span>
                  <button
                    onClick={() => {
                      setFilters({ type: '', status: '', warehouse: '', category: '' });
                      setSearchQuery('');
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Data Table */}
            {viewMode === 'operations' ? (
              <DataTable 
                columns={operationColumns} 
                data={filteredOperations} 
                emptyMessage="No operations found matching current filters."
              />
            ) : (
              <DataTable 
                columns={moveColumns} 
                data={filteredMoves} 
                emptyMessage="No stock moves found matching current filters."
              />
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
