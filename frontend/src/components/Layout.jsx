import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, 
  ArrowLeftRight, ClipboardCheck, History, Warehouse, User, 
  LogOut, ChevronLeft, ChevronRight, Bell, Search, AlertTriangle,
  Clock, ShieldCheck, Sparkles, ChevronDown, CheckCircle2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const Layout = () => {
  const { logout, user, token } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState({ lowStock: 0, outOfStock: 0, pendingReceipts: 0, pendingDeliveries: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const notifRef = useRef(null);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Receipts', path: '/receipts', icon: ArrowDownToLine },
    { name: 'Deliveries', path: '/deliveries', icon: ArrowUpFromLine },
    { name: 'Transfers', path: '/transfers', icon: ArrowLeftRight },
    { name: 'Adjustments', path: '/adjustments', icon: ClipboardCheck },
    { name: 'Move History', path: '/move-history', icon: History },
    { name: 'Warehouses', path: '/warehouses', icon: Warehouse },
    { name: 'My Profile', path: '/profile', icon: User },
  ];

  // Current page metadata
  const currentNavItem = navItems.find(item => item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)) || { name: 'Overview', icon: LayoutDashboard };

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch KPI alerts for notification center
  useEffect(() => {
    if (!token) return;
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API}/dashboard/kpis`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAlerts({
            lowStock: data.lowStockItems || 0,
            outOfStock: data.outOfStockItems || 0,
            pendingReceipts: data.pendingReceipts || 0,
            pendingDeliveries: data.pendingDeliveries || 0
          });
        }
      } catch (e) {
        // silent fallback
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 45000);
    return () => clearInterval(interval);
  }, [token]);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalAlertCount = alerts.lowStock + alerts.outOfStock + alerts.pendingReceipts;

  return (
    <div className="flex h-screen bg-slate-50 text-gray-800 font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={{ width: 260 }}
        animate={{ width: collapsed ? 76 : 260 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="h-full bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white flex flex-col shadow-2xl relative z-30 select-none flex-shrink-0"
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between h-20 border-b border-white/10">
          {!collapsed ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 blur-md opacity-60 rounded-xl" />
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center relative z-10 shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-200">
                  StockSense
                </span>
                <span className="block text-[10px] font-semibold text-blue-300 uppercase tracking-widest">
                  Enterprise IMS
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="mx-auto relative">
              <div className="absolute inset-0 bg-blue-500 blur-md opacity-60 rounded-xl" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center relative z-10 shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Collapse Toggle Button */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3.5 top-7 bg-indigo-600 border border-white/20 rounded-full p-1 shadow-lg hover:bg-indigo-500 text-white transition-transform hover:scale-110 z-40"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `
                flex items-center px-3.5 py-3 rounded-xl transition-all group relative text-sm
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-600/40 via-indigo-600/30 to-purple-600/20 text-white font-semibold shadow-inner border border-blue-400/20' 
                  : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'}
              `}
              title={collapsed ? item.name : ''}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavPill"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1.5 bg-gradient-to-b from-blue-400 to-indigo-400 rounded-r-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" 
                    />
                  )}
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${collapsed ? 'mx-auto' : 'mr-3'} ${isActive ? 'text-blue-300' : 'text-slate-400 group-hover:text-blue-200'}`} />
                  {!collapsed && <span>{item.name}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3.5 border-t border-white/10 bg-black/20">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} mb-3`}>
            <NavLink 
              to="/profile" 
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-1.5 rounded-xl hover:bg-white/5 transition group w-full`}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 p-0.5 flex-shrink-0 shadow-md">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                </div>
              </div>
              {!collapsed && (
                <div className="overflow-hidden text-left flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate group-hover:text-blue-200 transition">
                    {user?.name || 'Sangam Sikarwar'}
                  </p>
                  <p className="text-[10px] text-blue-300 truncate font-medium">
                    {user?.role || 'Lead Operations'}
                  </p>
                </div>
              )}
            </NavLink>
          </div>

          <button 
            onClick={logout}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-rose-500/20 hover:text-rose-200 border border-transparent hover:border-rose-500/30 transition-all ${collapsed ? 'px-0' : ''}`}
            title="Log Out"
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area with Sticky Header */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between z-20 flex-shrink-0 shadow-xs">
          {/* Left: Active Breadcrumb */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <currentNavItem.icon size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>StockSense</span>
                <span>/</span>
                <span className="font-semibold text-gray-800">{currentNavItem.name}</span>
              </div>
            </div>
          </div>

          {/* Right: Status Pill, Time, Notifications & Quick Profile */}
          <div className="flex items-center gap-3">
            {/* Live Operational Status */}
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>6 Facilities Operational</span>
            </div>

            {/* Time Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 text-slate-600 text-xs font-mono font-medium border border-slate-200">
              <Clock size={13} className="text-slate-400" />
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
                title="Notifications & Inventory Alerts"
              >
                <Bell size={18} />
                {totalAlertCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-gray-800"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-blue-600" />
                        <h4 className="text-sm font-bold text-gray-900">Inventory Alerts</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        {totalAlertCount} active
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 my-2 max-h-72 overflow-y-auto">
                      {alerts.outOfStock > 0 && (
                        <Link 
                          to="/products"
                          onClick={() => setNotificationsOpen(false)}
                          className="py-2.5 px-2 flex items-start gap-3 rounded-xl hover:bg-rose-50/50 transition group"
                        >
                          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 mt-0.5">
                            <AlertTriangle size={15} />
                          </div>
                          <div className="flex-1 text-xs">
                            <p className="font-bold text-rose-800">{alerts.outOfStock} Critical Stock Items</p>
                            <p className="text-slate-500 text-[11px]">Zero quantity in primary logistics depot.</p>
                          </div>
                          <ArrowRight size={14} className="text-slate-400 group-hover:text-rose-600 transition" />
                        </Link>
                      )}

                      {alerts.lowStock > 0 && (
                        <Link 
                          to="/products"
                          onClick={() => setNotificationsOpen(false)}
                          className="py-2.5 px-2 flex items-start gap-3 rounded-xl hover:bg-amber-50/50 transition group"
                        >
                          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                            <AlertTriangle size={15} />
                          </div>
                          <div className="flex-1 text-xs">
                            <p className="font-bold text-amber-800">{alerts.lowStock} Items Below Reorder Point</p>
                            <p className="text-slate-500 text-[11px]">Replenishment suggested to avoid stockouts.</p>
                          </div>
                          <ArrowRight size={14} className="text-slate-400 group-hover:text-amber-600 transition" />
                        </Link>
                      )}

                      {alerts.pendingReceipts > 0 && (
                        <Link 
                          to="/receipts"
                          onClick={() => setNotificationsOpen(false)}
                          className="py-2.5 px-2 flex items-start gap-3 rounded-xl hover:bg-blue-50/50 transition group"
                        >
                          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 mt-0.5">
                            <ArrowDownToLine size={15} />
                          </div>
                          <div className="flex-1 text-xs">
                            <p className="font-bold text-blue-800">{alerts.pendingReceipts} Pending Inbound Consignments</p>
                            <p className="text-slate-500 text-[11px]">Incoming shipments waiting for quality intake check.</p>
                          </div>
                          <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 transition" />
                        </Link>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="text-slate-400 text-[11px]">System auto-syncs every 45s</span>
                      <button 
                        onClick={() => setNotificationsOpen(false)}
                        className="text-blue-600 font-bold hover:underline text-[11px]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Profile Link */}
            <Link 
              to="/profile"
              className="flex items-center gap-2.5 p-1 pl-2 pr-3 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span>{(user?.name || 'S')[0].toUpperCase()}</span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-bold text-gray-700">
                {user?.name?.split(' ')[0] || 'Sangam'}
              </span>
            </Link>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-auto bg-slate-50/70 p-6 md:p-8">
          <div className="max-w-7xl mx-auto min-h-full">
            <AnimatePresence mode="wait">
              <Outlet />
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
