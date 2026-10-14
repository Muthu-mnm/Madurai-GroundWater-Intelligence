import React from 'react';
import { VULNERABILITY_CLASSES, DOMAIN_METADATA } from '../../utils/thresholds';

const TALUK_LEGEND = [
  { name: 'Madurai East', color: '#38BDF8' },
  { name: 'Madurai North', color: '#00E5FF' },
  { name: 'Madurai South', color: '#FACC15' },
  { name: 'Melur', color: '#10B981' },
  { name: 'Peraiyur', color: '#A855F7' },
  { name: 'Thirumangalam', color: '#F43F5E' },
  { name: 'Usilampatti', color: '#FB923C' },
  { name: 'Vadipatti', color: '#38BDF8' }
];

export default function MapLegend({ 
  selectedDomain = 'combined', 
  selectedTaluk = 'all', 
  onSelectTaluk 
}) {
  const hasTalukSelection = selectedTaluk !== 'all';
  const domainMeta = DOMAIN_METADATA[selectedDomain] || DOMAIN_METADATA['combined'];

  return (
    <div className="map-legend-panel" style={{ width: '230px', fontSize: '0.75rem' }}>
      {/* Active Domain Header */}
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
        {domainMeta.shortTitle} Risk
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.3 }}>
        {selectedDomain === 'combined' 
          ? 'Protective composite rule engine (WQ + Health + Agri)'
          : domainMeta.standard}
      </div>

      {/* Vulnerability Classes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
        {[
          { key: 'Very High Vulnerability', label: 'Very High Vulnerability', color: '#dc2626' },
          { key: 'High Vulnerability', label: 'High Vulnerability', color: '#ea580c' },
          { key: 'Moderate Vulnerability', label: 'Moderate Vulnerability', color: '#d97706' },
          { key: 'Low Vulnerability', label: 'Low Vulnerability', color: '#0d9488' },
          { key: 'Partial Assessment', label: 'Partial Assessment', color: '#0284c7' }
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              backgroundColor: item.color,
              flexShrink: 0
            }}></span>
            <span style={{ fontSize: '0.72rem' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Selected Taluk Filter Status */}
      {hasTalukSelection && (
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '6px', marginBottom: '8px', fontSize: '0.7rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Taluk Focus:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00E5FF' }}></span>
            <span>Inside {selectedTaluk}: <strong>Active</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#64748B', opacity: 0.5 }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Other Taluks: <em>Muted</em></span>
          </div>
        </div>
      )}

      {/* Taluk Boundaries Selector */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '6px' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Taluk Filter</span>
          {hasTalukSelection && (
            <button 
              onClick={() => onSelectTaluk && onSelectTaluk('all')}
              style={{ 
                fontSize: '0.65rem', 
                background: 'rgba(56, 189, 248, 0.15)', 
                color: '#0284c7', 
                border: '1px solid rgba(56, 189, 248, 0.3)', 
                borderRadius: '3px', 
                padding: '1px 5px', 
                cursor: 'pointer',
                fontWeight: 600 
              }}
            >
              Reset All
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {TALUK_LEGEND.map(t => {
            const isMatch = hasTalukSelection && (t.name.toLowerCase() === selectedTaluk.toLowerCase());
            return (
              <div 
                key={t.name}
                onClick={() => onSelectTaluk && onSelectTaluk(isMatch ? 'all' : t.name)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '0.68rem',
                  fontWeight: isMatch ? 700 : 400,
                  color: isMatch ? t.color : 'inherit',
                  background: isMatch ? `${t.color}20` : 'transparent'
                }}
              >
                <span style={{ width: 10, height: 3, backgroundColor: t.color, borderRadius: 1 }}></span>
                <span>{t.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
