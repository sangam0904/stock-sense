import React from 'react';

export default function DataTable({ columns, data, onRowClick, emptyMessage = 'No data available' }) {
  return (
    <div className="w-full overflow-x-auto bg-white rounded-2xl shadow-sm border border-blue-100">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/80 border-b border-blue-50 text-xs uppercase text-gray-500 tracking-wider">
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4 font-medium">
                {col.label || col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr 
                key={row.id || rowIdx} 
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-150 ${onRowClick ? 'cursor-pointer hover:bg-blue-50/50' : 'hover:bg-gray-50/50'}`}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key || col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
