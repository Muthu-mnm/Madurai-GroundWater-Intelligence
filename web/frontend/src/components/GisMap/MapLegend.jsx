import React from 'react';
import { RISK_COLORS } from '../../utils/thresholds';

const TALUK_LEGEND = [
  { name: 'Madurai North', color: '#00E5FF' },
  { name: 'Madurai South', color: '#FACC15' },
  { name: 'Melur', color: '#10B981' },
  { name: 'Peraiyur', color: '#A855F7' },
  { name: 'Thirumangalam', color: '#F43F5E' },
  { name: 'Usilampatti', color: '#FB923C' },
  { name: 'Vadipatti', color: '#38BDF8' }
];

export default function MapLegend({ mode = 'forecast', selectedParam = 'TDS', selectedTaluk = 'all', onSelectTaluk }) {
  const hasTalukSelection = selectedTaluk !== 'all';

  return (
    <div className="map-legend-panel">
      {/* Drinking Suitability Indicator */}
      <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
        Drinking Suitability (Potability)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px', fontSize: '0.72rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🟢</span>
          <span><strong>Drinkable</strong> — Safe directly (Low Risk)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🟡</span>
          <span><strong>Required Boiling</strong> — Boil 3–5m (Medium)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🔴</span>
          <span><strong>Not Drinkable</strong> — RO needed (High Risk)</span>
        </div>
      </div>

      {/* Risk / Concentration Classification */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '6px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>
        {mode === 'forecast' ? 'Risk Classification (BIS 10500)' : `Historical ${selectedParam} Limits`}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
        {mode === 'forecast' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: RISK_COLORS['High Risk'].color }}></span>
              <span>High Risk (Point Exceedance)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: RISK_COLORS['Medium Risk (Borderline)'].color }}></span>
              <span>Medium Risk (Borderline CI Breach)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: RISK_COLORS['Medium Risk (Permissible)'].color }}></span>
              <span>Medium Risk (Permissible Range)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: RISK_COLORS['Low Risk'].color }}></span>
              <span>Low Risk (Strict Desirable)</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#059669' }}></span>
              <span>Desirable Limit</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2563EB' }}></span>
              <span>Permissible Range</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#DC2626' }}></span>
              <span>Statutory Exceedance</span>
            </div>
          </>
        )}
      </div>

      {/* Selected vs Non-Selected Station Indicator */}
      {hasTalukSelection && (
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '5px', marginBottom: '6px', fontSize: '0.7rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>Station Status:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00E5FF', border: '1px solid #FFF' }}></span>
            <span>Inside {selectedTaluk}: <strong>Active Colors</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#64748B', opacity: 0.5 }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Other Taluks: <em>Non-color (Muted)</em></span>
          </div>
        </div>
      )}

      {/* Taluk Boundary Line Colors */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '6px' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Taluk Boundaries</span>
          {hasTalukSelection && (
            <button 
              onClick={() => onSelectTaluk && onSelectTaluk('all')}
              style={{ 
                fontSize: '0.65rem', 
                background: 'rgba(56, 189, 248, 0.15)', 
                color: '#38BDF8', 
                border: '1px solid rgba(56, 189, 248, 0.3)', 
                borderRadius: '3px', 
                padding: '1px 6px', 
                cursor: 'pointer',
                fontWeight: 600 
              }}
              title="Reset to All 7 Taluks"
            >
              Reset All
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem' }}>
          {TALUK_LEGEND.map(t => {
            const isMatch = hasTalukSelection && (t.name.toLowerCase() === selectedTaluk.toLowerCase());
            const isDimmed = hasTalukSelection && !isMatch;

            return (
              <div 
                key={t.name} 
                onClick={() => onSelectTaluk && onSelectTaluk(isMatch ? 'all' : t.name)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  opacity: isDimmed ? 0.45 : 1.0,
                  fontWeight: isMatch ? 700 : 500,
                  color: isMatch ? t.color : 'inherit',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  background: isMatch ? `${t.color}18` : 'transparent',
                  transition: 'all 0.15s ease'
                }}
                title={`Click to select ${t.name} Taluk`}
              >
                <span 
                  style={{ 
                    width: isMatch ? 18 : 14, 
                    height: isMatch ? 4 : 3, 
                    backgroundColor: isDimmed ? '#64748B' : t.color, 
                    borderRadius: 2,
                    boxShadow: isMatch ? `0 0 6px ${t.color}` : 'none'
                  }}
                ></span>
                <span>
                  {t.name}
                  {isMatch ? ' (Active)' : isDimmed ? ' (Click to select)' : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
