/**
 * Utility to export data to CSV / Excel compatible format with UTF-8 BOM
 * @param {Array} data - Array of row objects
 * @param {Array} columns - Array of { label: string, key: string | function }
 * @param {string} filename - Output filename (without extension)
 */
export function exportToCSV(data, columns, filename = 'export') {
  if (!data || !data.length) {
    alert('No data available to export');
    return;
  }

  // Header row
  const headers = columns.map(c => `"${(c.label || c.key || '').replace(/"/g, '""')}"`).join(',');

  // Data rows
  const rows = data.map(row => {
    return columns.map(col => {
      let val = '';
      if (typeof col.key === 'function') {
        val = col.key(row);
      } else {
        val = row[col.key];
      }

      if (val === null || val === undefined) {
        val = '';
      } else {
        val = String(val);
      }

      // Escape quotes and wrap in quotes
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel correctly recognizes UTF-8 encoding
  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filename}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
