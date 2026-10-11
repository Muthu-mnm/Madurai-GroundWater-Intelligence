import React, { useState, useMemo } from 'react';
import { THRESHOLDS, RISK_COLORS, DRINKING_SUITABILITY, getDrinkingSuitability, evaluateRisk } from '../../utils/thresholds';
import ExportButton from '../Common/ExportButton';
import DisclaimerBanner from '../Common/DisclaimerBanner';
import { 
  ShieldAlert, 
  Settings, 
  Calendar, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Droplets,
  Flame,
  Ban
} from 'lucide-react';

export default function RiskAssessment({ forecastData = [] }) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedTaluk, setSelectedTaluk] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchVillage, setSearchVillage] = useState('');

  // Configurable screening thresholds state
  const [customThresholds, setCustomThresholds] = useState({
    tdsDesirable: 500,
    tdsPermissible: 2000,
    ecDesirable: 750,
    ecPermissible: 2250,
    fDesirable: 1.0,
    fPermissible: 1.5,
    phMin: 6.5,
    phMax: 8.5
  });

  const [showConfig, setShowConfig] = useState(false);

  // Table pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Evaluate risk dynamically for selected year
  const evaluatedRecords = useMemo(() => {
    const yearRecords = forecastData.filter(d => d.Year === selectedYear);

    return yearRecords.map(rec => {
      // Custom threshold evaluation
      const tds = rec.TDS;
      const tds_up = rec.TDS_Upper_CI;
      const ec = rec.EC;
      const ec_up = rec.EC_Upper_CI;
      const f = rec.Fluoride;
      const f_up = rec.Fluoride_Upper_CI;
      const ph = rec.pH;
      const ph_low = rec.pH_Lower_CI;
      const ph_up = rec.pH_Upper_CI;

      // 1. High Risk
      const high = [];
      if (f > customThresholds.fPermissible) high.push(`Fluoride (${f.toFixed(2)} > ${customThresholds.fPermissible})`);
      if (tds > customThresholds.tdsPermissible) high.push(`TDS (${tds.toFixed(1)} > ${customThresholds.tdsPermissible})`);
      if (ec > customThresholds.ecPermissible) high.push(`EC (${ec.toFixed(1)} > ${customThresholds.ecPermissible})`);
      if (ph < customThresholds.phMin || ph > customThresholds.phMax) high.push(`pH (${ph.toFixed(2)} outside ${customThresholds.phMin}-${customThresholds.phMax})`);

      if (high.length > 0) {
        return {
          ...rec,
          dynRisk: 'High Risk',
          dynSuitability: 'Not Drinkable',
          dynStatus: 'Non-Compliant (Point Exceedance)',
          dynReason: high.join('; ')
        };
      }

      // 2. Medium Risk (Borderline)
      const borderline = [];
      if (f_up > customThresholds.fPermissible) borderline.push(`Fluoride Upper CI (${f_up.toFixed(2)} > ${customThresholds.fPermissible})`);
      if (tds_up > customThresholds.tdsPermissible) borderline.push(`TDS Upper CI (${tds_up.toFixed(1)} > ${customThresholds.tdsPermissible})`);
      if (ec_up > customThresholds.ecPermissible) borderline.push(`EC Upper CI (${ec_up.toFixed(1)} > ${customThresholds.ecPermissible})`);
      if (ph_low < customThresholds.phMin) borderline.push(`pH Lower CI (${ph_low.toFixed(2)} < ${customThresholds.phMin})`);
      if (ph_up > customThresholds.phMax) borderline.push(`pH Upper CI (${ph_up.toFixed(2)} > ${customThresholds.phMax})`);

      if (borderline.length > 0) {
        return {
          ...rec,
          dynRisk: 'Medium Risk (Borderline)',
          dynSuitability: 'Required Boiling',
          dynStatus: 'Conditionally Permissible (CI Exceedance)',
          dynReason: borderline.join('; ')
        };
      }

      // 3. Low Risk (Strict Desirable)
      if (
        tds <= customThresholds.tdsDesirable &&
        f <= customThresholds.fDesirable &&
        ec <= (customThresholds.ecDesirable > 750 ? customThresholds.ecDesirable : 850) &&
        ph >= customThresholds.phMin && ph <= customThresholds.phMax
      ) {
        return {
          ...rec,
          dynRisk: 'Low Risk',
          dynSuitability: 'Drinkable',
          dynStatus: 'Desirable Quality (BIS Acceptable)',
          dynReason: 'Point predictions strictly meet BIS 10500 desirable limits; Upper CI within statutory permissible'
        };
      }

      // 4. Permissible
      const perm = [];
      if (tds > customThresholds.tdsDesirable || tds_up > customThresholds.tdsDesirable) perm.push(`TDS (${tds.toFixed(1)} mg/L) in permissible range`);
      if (f > customThresholds.fDesirable || f_up > customThresholds.fDesirable) perm.push(`Fluoride (${f.toFixed(2)} mg/L) in permissible range`);
      if (ec > customThresholds.ecDesirable || ec_up > customThresholds.ecDesirable) perm.push(`EC (${ec.toFixed(1)} µS/cm) in permissible range`);

      return {
        ...rec,
        dynRisk: 'Medium Risk (Permissible)',
        dynSuitability: 'Required Boiling',
        dynStatus: 'Permissible Relaxation Range',
        dynReason: perm.join('; ')
      };
    });
  }, [forecastData, selectedYear, customThresholds]);

  // Filter for display
  const displayRecords = useMemo(() => {
    return evaluatedRecords.filter(r => {
      if (selectedTaluk !== 'all' && r.Taluk && r.Taluk.toLowerCase() !== selectedTaluk.toLowerCase()) return false;
      if (filterCategory !== 'all') {
        if (filterCategory === 'Drinkable' || filterCategory === 'Required Boiling' || filterCategory === 'Not Drinkable') {
          if (r.dynSuitability !== filterCategory) return false;
        } else if (r.dynRisk !== filterCategory) {
          return false;
        }
      }
      if (searchVillage.trim() && r.Village && !r.Village.toLowerCase().includes(searchVillage.toLowerCase().trim())) return false;
      return true;
    });
  }, [evaluatedRecords, selectedTaluk, filterCategory, searchVillage]);

  // Risk & Suitability Counts Summary
  const summaryCounts = useMemo(() => {
    const c = { 
      'High Risk': 0, 
      'Medium Risk (Borderline)': 0, 
      'Medium Risk (Permissible)': 0, 
      'Low Risk': 0,
      'Drinkable': 0,
      'Required Boiling': 0,
      'Not Drinkable': 0
    };
    evaluatedRecords.forEach(r => {
      if (c[r.dynRisk] !== undefined) c[r.dynRisk]++;
      if (c[r.dynSuitability] !== undefined) c[r.dynSuitability]++;
    });
    return c;
  }, [evaluatedRecords]);

  const total = evaluatedRecords.length || 1;
  const paginated = displayRecords.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(displayRecords.length / pageSize) || 1;

  const handleResetThresholds = () => {
    setCustomThresholds({
      tdsDesirable: 500,
      tdsPermissible: 2000,
      ecDesirable: 750,
      ecPermissible: 2250,
      fDesirable: 1.0,
      fPermissible: 1.5,
      phMin: 6.5,
      phMax: 8.5
    });
  };

  return (
    <div className="content-workspace">
      <DisclaimerBanner />

      {/* Drinking Suitability Key Indicator Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Droplets size={16} style={{ color: '#059669' }} />
            Groundwater Drinking Suitability &amp; Safety Status ({selectedYear})
          </h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Based on statutory BIS 10500:2012 Drinking Water Specifications
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
          {/* Drinkable Card */}
          <div 
            className="card" 
            style={{ 
              borderLeft: '5px solid #059669', 
              padding: '14px 18px', 
              background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.04) 0%, var(--bg-surface) 100%)',
              cursor: 'pointer'
            }}
            onClick={() => { setFilterCategory(filterCategory === 'Drinkable' ? 'all' : 'Drinkable'); setPage(1); }}
            title="Click to filter Drinkable stations"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                🟢 Drinkable
              </span>
              <span className="suitability-badge drinkable" style={{ fontSize: '0.7rem' }}>
                Safe Directly
              </span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
              {summaryCounts['Drinkable']} stations
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
              <strong>{((summaryCounts['Drinkable'] / total) * 100).toFixed(1)}%</strong> of monitored network strictly meets BIS desirable limits (TDS ≤500, F ≤1.0).
            </div>
          </div>

          {/* Required Boiling Card */}
          <div 
            className="card" 
            style={{ 
              borderLeft: '5px solid #D97706', 
              padding: '14px 18px', 
              background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.04) 0%, var(--bg-surface) 100%)',
              cursor: 'pointer'
            }}
            onClick={() => { setFilterCategory(filterCategory === 'Required Boiling' ? 'all' : 'Required Boiling'); setPage(1); }}
            title="Click to filter Required Boiling stations"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                🟡 Required Boiling
              </span>
              <span className="suitability-badge boiling" style={{ fontSize: '0.7rem' }}>
                Boiling Required
              </span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
              {summaryCounts['Required Boiling']} stations
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
              <strong>{((summaryCounts['Required Boiling'] / total) * 100).toFixed(1)}%</strong> permissible under relaxation. Requires boiling (3–5m) &amp; domestic filtration.
            </div>
          </div>

          {/* Not Drinkable Card */}
          <div 
            className="card" 
            style={{ 
              borderLeft: '5px solid #DC2626', 
              padding: '14px 18px', 
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.04) 0%, var(--bg-surface) 100%)',
              cursor: 'pointer'
            }}
            onClick={() => { setFilterCategory(filterCategory === 'Not Drinkable' ? 'all' : 'Not Drinkable'); setPage(1); }}
            title="Click to filter Not Drinkable stations"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                🔴 Not Drinkable
              </span>
              <span className="suitability-badge not-drinkable" style={{ fontSize: '0.7rem' }}>
                Exceeds Limits
              </span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
              {summaryCounts['Not Drinkable']} stations
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
              <strong>{((summaryCounts['Not Drinkable'] / total) * 100).toFixed(1)}%</strong> point exceedance. Unsafe for drinking without Reverse Osmosis / defluoridation.
            </div>
          </div>
        </div>
      </div>

      {/* Regulatory Risk Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--risk-low)', padding: '10px 14px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--risk-low)', textTransform: 'uppercase' }}>Low Risk (Desirable)</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{summaryCounts['Low Risk']} stations</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{((summaryCounts['Low Risk'] / total) * 100).toFixed(1)}% safe baseline</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--risk-permissible)', padding: '10px 14px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--risk-permissible)', textTransform: 'uppercase' }}>Medium (Permissible)</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{summaryCounts['Medium Risk (Permissible)']} stations</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{((summaryCounts['Medium Risk (Permissible)'] / total) * 100).toFixed(1)}% within relaxation</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--risk-borderline)', padding: '10px 14px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--risk-borderline)', textTransform: 'uppercase' }}>Medium (Borderline)</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{summaryCounts['Medium Risk (Borderline)']} stations</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{((summaryCounts['Medium Risk (Borderline)'] / total) * 100).toFixed(1)}% interval breach</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--risk-high)', padding: '10px 14px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--risk-high)', textTransform: 'uppercase' }}>High Risk (Exceedance)</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{summaryCounts['High Risk']} stations</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{((summaryCounts['High Risk'] / total) * 100).toFixed(1)}% point breach</span>
        </div>
      </div>

      {/* Filter and Config Bar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <span className="filter-label"><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Horizon Year:</span>
          <select 
            className="filter-select"
            value={selectedYear}
            onChange={(e) => { setSelectedYear(Number(e.target.value)); setPage(1); }}
          >
            {[2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <option key={y} value={y}>Year {y} {y === 2026 ? '(Standard Reference)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Taluk:</span>
          <select 
            className="filter-select"
            value={selectedTaluk}
            onChange={(e) => { setSelectedTaluk(e.target.value); setPage(1); }}
          >
            <option value="all">All 7 Taluks</option>
            <option value="Madurai North">Madurai North</option>
            <option value="Madurai South">Madurai South</option>
            <option value="Melur">Melur</option>
            <option value="Peraiyur">Peraiyur</option>
            <option value="Thirumangalam">Thirumangalam</option>
            <option value="Usilampatti">Usilampatti</option>
            <option value="Vadipatti">Vadipatti</option>
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label"><Filter size={14} style={{ display: 'inline', marginRight: 4 }} /> Potability &amp; Risk:</span>
          <select 
            className="filter-select"
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          >
            <option value="all">All Categories ({total} stations)</option>
            <optgroup label="Drinking Suitability (Potability)">
              <option value="Drinkable">🟢 Drinkable ({summaryCounts['Drinkable']})</option>
              <option value="Required Boiling">🟡 Required Boiling ({summaryCounts['Required Boiling']})</option>
              <option value="Not Drinkable">🔴 Not Drinkable ({summaryCounts['Not Drinkable']})</option>
            </optgroup>
            <optgroup label="Regulatory Risk Category">
              <option value="Low Risk">Low Risk ({summaryCounts['Low Risk']})</option>
              <option value="Medium Risk (Permissible)">Medium Risk (Permissible) ({summaryCounts['Medium Risk (Permissible)']})</option>
              <option value="Medium Risk (Borderline)">Medium Risk (Borderline) ({summaryCounts['Medium Risk (Borderline)']})</option>
              <option value="High Risk">High Risk ({summaryCounts['High Risk']})</option>
            </optgroup>
          </select>
        </div>

        <div className="filter-group" style={{ flex: 1, minWidth: '150px' }}>
          <input 
            type="text"
            className="filter-input"
            placeholder="Search village name..."
            value={searchVillage}
            onChange={(e) => { setSearchVillage(e.target.value); setPage(1); }}
            style={{ width: '100%' }}
          />
        </div>

        <button 
          className={`btn ${showConfig ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setShowConfig(!showConfig)}
          title="Configure custom screening thresholds"
        >
          <Settings size={14} />
          <span>Screening Thresholds</span>
        </button>

        <ExportButton 
          data={displayRecords.map(r => ({
            Taluk: r.Taluk,
            Village: r.Village,
            Year: r.Year,
            Drinking_Suitability: r.dynSuitability,
            Risk_Level: r.dynRisk,
            Water_Quality_Status: r.dynStatus,
            TDS_mg_L: r.TDS,
            TDS_Upper_CI: r.TDS_Upper_CI,
            EC_uS_cm: r.EC,
            EC_Upper_CI: r.EC_Upper_CI,
            Fluoride_mg_L: r.Fluoride,
            Fluoride_Upper_CI: r.Fluoride_Upper_CI,
            pH: r.pH,
            Assessment_Trigger: r.dynReason
          }))}
          filename={`madurai_drinking_suitability_risk_${selectedYear}.csv`}
          label="Export Report CSV"
        />
      </div>

      {/* Expandable Thresholds Configuration Panel */}
      {showConfig && (
        <div className="card" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-medium)' }}>
          <div className="card-header" style={{ marginBottom: '10px' }}>
            <div>
              <h4 className="card-title">
                <Settings size={16} /> Configurable Water Quality Screening Limits
              </h4>
              <p className="card-subtitle">Adjust parameters to simulate alternative regulatory or screening standards.</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleResetThresholds}>
              Reset to BIS 10500 Defaults
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>TDS Limits (mg/L):</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <input 
                  type="number" 
                  className="filter-input" 
                  style={{ width: '50%' }}
                  title="Desirable limit"
                  value={customThresholds.tdsDesirable}
                  onChange={(e) => setCustomThresholds({...customThresholds, tdsDesirable: Number(e.target.value)})}
                />
                <input 
                  type="number" 
                  className="filter-input" 
                  style={{ width: '50%' }}
                  title="Permissible limit"
                  value={customThresholds.tdsPermissible}
                  onChange={(e) => setCustomThresholds({...customThresholds, tdsPermissible: Number(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>EC Limits (µS/cm):</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <input 
                  type="number" 
                  className="filter-input" 
                  style={{ width: '50%' }}
                  title="Desirable limit"
                  value={customThresholds.ecDesirable}
                  onChange={(e) => setCustomThresholds({...customThresholds, ecDesirable: Number(e.target.value)})}
                />
                <input 
                  type="number" 
                  className="filter-input" 
                  style={{ width: '50%' }}
                  title="Permissible limit"
                  value={customThresholds.ecPermissible}
                  onChange={(e) => setCustomThresholds({...customThresholds, ecPermissible: Number(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Fluoride Limits (mg/L):</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <input 
                  type="number" 
                  step="0.1"
                  className="filter-input" 
                  style={{ width: '50%' }}
                  title="Desirable limit"
                  value={customThresholds.fDesirable}
                  onChange={(e) => setCustomThresholds({...customThresholds, fDesirable: Number(e.target.value)})}
                />
                <input 
                  type="number" 
                  step="0.1"
                  className="filter-input" 
                  style={{ width: '50%' }}
                  title="Permissible limit"
                  value={customThresholds.fPermissible}
                  onChange={(e) => setCustomThresholds({...customThresholds, fPermissible: Number(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>pH Range [Min – Max]:</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <input 
                  type="number" 
                  step="0.1"
                  className="filter-input" 
                  style={{ width: '50%' }}
                  title="Minimum pH"
                  value={customThresholds.phMin}
                  onChange={(e) => setCustomThresholds({...customThresholds, phMin: Number(e.target.value)})}
                />
                <input 
                  type="number" 
                  step="0.1"
                  className="filter-input" 
                  style={{ width: '50%' }}
                  title="Maximum pH"
                  value={customThresholds.phMax}
                  onChange={(e) => setCustomThresholds({...customThresholds, phMax: Number(e.target.value)})}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk & Potability Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Groundwater Drinking Suitability &amp; Risk Assessment ({selectedYear}) — {displayRecords.length} Stations
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Evaluated against BIS 10500:2012 acceptable &amp; permissible drinking limits
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Village</th>
                <th>Taluk</th>
                <th>Drinking Suitability</th>
                <th>Risk Category</th>
                <th>Assessment Status</th>
                <th>Specific Trigger / Consumer Guidance</th>
                <th>TDS (mg/L)</th>
                <th>EC (µS/cm)</th>
                <th>Fluoride (mg/L)</th>
                <th>pH</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, i) => {
                const sMeta = DRINKING_SUITABILITY[r.dynSuitability] || DRINKING_SUITABILITY['Unassessed'];
                return (
                  <tr key={`${r.Taluk}-${r.Village}-${i}`}>
                    <td><strong>{r.Village}</strong></td>
                    <td>{r.Taluk}</td>
                    <td>
                      <span className={`suitability-badge ${sMeta.badgeClass}`}>
                        {sMeta.symbol} {r.dynSuitability}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-tag ${RISK_COLORS[r.dynRisk]?.badgeClass || ''}`}>
                        {r.dynRisk}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{r.dynStatus}</td>
                    <td style={{ maxWidth: '320px', whiteSpace: 'normal', fontSize: '0.78rem' }}>
                      {r.dynReason}
                    </td>
                    <td>{r.TDS?.toFixed(1)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>[{r.TDS_Upper_CI?.toFixed(0)}]</span></td>
                    <td>{r.EC?.toFixed(1)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>[{r.EC_Upper_CI?.toFixed(0)}]</span></td>
                    <td>{r.Fluoride?.toFixed(2)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>[{r.Fluoride_Upper_CI?.toFixed(2)}]</span></td>
                    <td>{r.pH?.toFixed(2)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>[{r.pH_Lower_CI?.toFixed(2)}-{r.pH_Upper_CI?.toFixed(2)}]</span></td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No stations match the selected category or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        <div className="pagination-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Rows per page:</span>
            <select 
              className="filter-select" 
              style={{ padding: '2px 6px', fontSize: '0.75rem' }}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ margin: '0 6px' }}>{page} / {totalPages}</span>
            <button 
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
