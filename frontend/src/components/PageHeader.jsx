import React from 'react';
import { motion } from 'framer-motion';

const PageHeader = ({ title, subtitle, action, actionLabel, actionIcon: ActionIcon }) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h1>
          {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
          <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2" />
        </div>
        {action && actionLabel && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={action}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white rounded-xl shadow-lg transition-all font-medium glow-button"
          >
            {ActionIcon && <ActionIcon size={18} />}
            {actionLabel}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
