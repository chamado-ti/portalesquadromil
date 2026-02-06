// CSV Export utility functions

export function downloadCSV(data: Record<string, unknown>[], filename: string, headers: { key: string; label: string }[]) {
  if (data.length === 0) {
    return;
  }

  // Build CSV content
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  
  const rows = data.map(row => {
    return headers.map(h => {
      const value = row[h.key];
      if (value === null || value === undefined) {
        return '""';
      }
      // Escape quotes and wrap in quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  const csvContent = [headerRow, ...rows].join('\n');
  
  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatDateForCSV(date: string | null | undefined): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleString('pt-BR');
  } catch {
    return date;
  }
}
