import React from 'react';
import { motion } from 'framer-motion';

const StatusBadge = ({ status }) => {
  const getStatusStyles = () => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return {
          bg: 'bg-gradient-to-r from-gray-200 to-gray-100',
          text: 'text-gray-700',
          dot: 'bg-gray-400'
        };
      case 'waiting':
        return {
          bg: 'bg-gradient-to-r from-blue-200 to-blue-100',
          text: 'text-blue-700',
          dot: 'bg-blue-500'
        };
      case 'ready':
        return {
          bg: 'bg-gradient-to-r from-indigo-200 to-indigo-100',
          text: 'text-indigo-700',
          dot: 'bg-indigo-500'
        };
      case 'done':
        return {
          bg: 'bg-gradient-to-r from-emerald-200 to-green-100',
          text: 'text-emerald-700',
          dot: 'bg-emerald-500'
        };
      case 'canceled':
        return {
          bg: 'bg-gradient-to-r from-red-200 to-red-100',
          text: 'text-red-700',
          dot: 'bg-red-500'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-200 to-gray-100',
          text: 'text-gray-700',
          dot: 'bg-gray-400'
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles.bg} ${styles.text} shadow-sm border border-white/20`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
      {status ? status.toUpperCase() : 'UNKNOWN'}
    </span>
  );
};

export default StatusBadge;
