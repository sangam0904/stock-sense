import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function SelectField({ label, value, onChange, options = [], placeholder = 'Select...', required = false, error, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={onChange}
          required={required}
          className={`w-full px-4 py-2.5 pr-10 rounded-xl border ${
            error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'
          } bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all text-sm appearance-none cursor-pointer`}
        >
          <option value="" disabled={required}>{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
          <ChevronDown size={16} />
        </div>
      </div>
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
}
