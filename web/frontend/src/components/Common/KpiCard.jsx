import React from 'react';

export default function KpiCard({ label, value, meta, variant = '', onClick }) {
  return (
    <div 
      className={`kpi-card ${variant}`} 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <span className="kpi-label">{label}</span>
      <div className="kpi-value">{value}</div>
      {meta && <span className="kpi-meta">{meta}</span>}
    </div>
  );
}
