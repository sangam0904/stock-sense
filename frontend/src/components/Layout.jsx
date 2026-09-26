import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, 
  ArrowLeftRight, ClipboardCheck, History, Warehouse, User, 
  LogOut, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-white text-gray-800 font-sans overflow-hidden">
      <motion.aside 
        initial={{ width: 260 }}
        animate={{ width: collapsed ? 72 : 260 }}
        className="h-full bg-gradient-to-b from-indigo-950 via-blue-900 to-purple-900 text-white flex flex-col shadow-2xl relative z-20"
      >
        <div className="p-4 flex items-center justify-between h-20">
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 blur-md opacity-50 rounded-full" />
                <Package className="w-8 h-8 text-white relative z-10" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">StockSense</span>
            </motion.div>
          )}
          {collapsed && (
            <div className="mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 blur-md opacity-50 rounded-full" />
              <Package className="w-8 h-8 text-white relative z-10" />
            </div>
          )}
        </div>

        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 bg-purple-600 rounded-full p-1 shadow-lg hover:bg-purple-500 transition-colors z-30"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `
                flex items-center px-3 py-3 rounded-xl transition-all group relative
                ${isActive ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/20 text-white' : 'text-blue-100 hover:bg-white/5 hover:text-white'}
              `}
              title={collapsed ? item.name : ''}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavBorder"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-purple-400 rounded-l-xl" 
                    />
                  )}
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'} ${isActive ? 'text-blue-300' : 'text-blue-200 group-hover:text-blue-100'}`} />
                  {!collapsed && <span className="font-medium">{item.name}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} mb-4`}>
            <NavLink to="/profile" className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} hover:opacity-90 transition group`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-0.5 flex-shrink-0 shadow-md">
                <div className="w-full h-full bg-indigo-900 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-white" />
                  )}
                </div>
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-blue-200 transition">{user?.name || 'User'}</p>
                  <p className="text-[11px] text-blue-300 truncate">{user?.role || 'Inventory Manager'}</p>
                </div>
              )}
            </NavLink>
          </div>
          <button 
            onClick={logout}
            className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg text-blue-200 hover:bg-white/10 hover:text-white transition-colors ${collapsed ? 'px-0' : 'px-4'}`}
            title="Logout"
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 overflow-auto relative">
        <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-full">
          <AnimatePresence mode="wait">
            <Outlet />
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Layout;
