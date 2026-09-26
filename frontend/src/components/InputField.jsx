import React from 'react';

export default function InputField({ label, type = 'text', value, onChange, placeholder, required, error, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`px-4 py-2.5 rounded-xl border ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all text-sm`}
      />
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
}
