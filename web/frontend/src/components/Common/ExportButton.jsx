import React from 'react';
import { Download } from 'lucide-react';
import { clientDataService } from '../../services/dataService';

export default function ExportButton({ data, filename = 'groundwater_data.csv', label = 'Export CSV', size = 'md' }) {
  const handleExport = () => {
    if (!data || !data.length) {
      alert("No records to export with the current filter settings.");
      return;
    }
    clientDataService.exportCSV(data, filename);
  };

  return (
    <button 
      className={`btn btn-secondary ${size === 'sm' ? 'btn-sm' : ''}`}
      onClick={handleExport}
      title="Download filtered tabular data as CSV"
    >
      <Download size={14} />
      <span>{label}</span>
    </button>
  );
}
