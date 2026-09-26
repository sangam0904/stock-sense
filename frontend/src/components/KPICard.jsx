import React from 'react';
import { motion } from 'framer-motion';

export default function KPICard({ title, value, icon: Icon, trend, gradient }) {
  const defaultGradient = 'from-blue-500 to-blue-400';
  const appliedGradient = gradient || defaultGradient;
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 p-6 flex flex-col justify-between overflow-hidden group"
    >
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${appliedGradient}`} />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
            {trend && (
              <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend}
              </span>
            )}
          </div>
        </div>
        
        {Icon && (
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${appliedGradient} opacity-40 blur-md rounded-full group-hover:opacity-60 transition-opacity`} />
            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${appliedGradient} text-white shadow-md`}>
              <Icon size={24} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
