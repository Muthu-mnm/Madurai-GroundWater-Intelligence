import React, { useState, useMemo } from 'react';
import { 
  Droplet, 
  Search, 
  Filter, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ExternalLink,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { THRESHOLDS, getVulnerabilityMeta, DRINKING_SUITABILITY, getDrinkingSuitability } from '../../utils/thresholds';

export default function WaterQualityView({ 
  historicalData = [], 
  forecastData = [],
  onSelectStation = null
}) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedTaluk, setSelectedTaluk] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeParam, setActiveParam] = useState('TDS');

  const isForecastYear = selectedYear >= 2022;
  const currentDataset = isForecastYear ? forecastData : historicalData;

  // Extract available taluks
  const talukOptions = useMemo(() => {
    const set = new Set();
    currentDataset.forEach(d => {
      if (d.Taluk) set.add(d.Taluk);
    });
    return Array.from(set).sort();
  }, [currentDataset]);

  // Filter records by selected year, taluk, search, and class
  const filteredRecords = useMemo(() => {
    return currentDataset.filter(d => {
      if (d.Year !== selectedYear) return false;
      if (selectedTaluk !== 'all' && d.Taluk !== selectedTaluk) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const v = (d.Village || '').toLowerCase();
        const t = (d.Taluk || '').toLowerCase();
        if (!v.includes(q) && !t.includes(q)) return false;
      }
      if (selectedClass !== 'all') {
        const rc = (d.Risk_Level || '').toLowerCase();
        if (!rc.includes(selectedClass.toLowerCase())) return false;
      }
      return true;
    });
  }, [currentDataset, selectedYear, selectedTaluk, selectedClass, searchQuery]);

  // Risk summary counts for this year
  const summaryStats = useMemo(() => {
    const yearRecords = currentDataset.filter(d => d.Year === selectedYear);
    const counts = {
      'Low Vulnerability': 0,
      'Moderate Vulnerability': 0,
      'High Vulnerability': 0,
      'Very High Vulnerability': 0,
      'Insufficient Data': 0
    };

    yearRecords.forEach(d => {
      const rl = d.Risk_Level || '';
      if (rl.includes('Low')) counts['Low Vulnerability']++;
      else if (rl.includes('Medium') || rl.includes('Borderline') || rl.includes('Permissible')) counts['Moderate Vulnerability']++;
      else if (rl.includes('Very High')) counts['Very High Vulnerability']++;
      else if (rl.includes('High')) counts['High Vulnerability']++;
      else counts['Insufficient Data']++;
    });

    const total = yearRecords.length;
    return { counts, total };
  }, [currentDataset, selectedYear]);

  return (
    <div className="content-workspace">
      {/* Header Banner */}
      <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #0d9488' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e6f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                <Droplet size={18} />
              </div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Water Quality Monitoring
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-muted)', padding: '6px 12px', borderRadius: '6px' }}>
            <Calendar size={15} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Year:</span>
            <select
              className="form-control"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ padding: '4px 8px', fontSize: '0.85rem', fontWeight: 700, width: '90px' }}
            >
              <optgroup label="Decadal Forecast (2022–2030)">
                {[2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </optgroup>
              <optgroup label="Historical Observations (2007–2021)">
                {[2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Compact KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { key: 'Low Vulnerability', label: 'Low Vulnerability', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', desc: 'Strictly meets desirable limits' },
          { key: 'Moderate Vulnerability', label: 'Moderate Vulnerability', color: '#d97706', bg: '#fffbeb', border: '#fde68a', desc: 'Permissible relaxation / CI breach' },
          { key: 'High Vulnerability', label: 'High Vulnerability', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', desc: 'Statutory limit breached' },
          { key: 'Very High Vulnerability', label: 'Very High Vulnerability', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', desc: 'Severe toxic / extreme salinity' }
        ].map(item => {
          const count = summaryStats.counts[item.key] || 0;
          const pct = summaryStats.total > 0 ? ((count / summaryStats.total) * 100).toFixed(1) : 0;
          return (
            <div 
              key={item.key}
              className="card"
              onClick={() => setSelectedClass(selectedClass === item.key ? 'all' : item.key)}
              style={{ 
                padding: '12px 14px', 
                borderLeft: `4px solid ${item.color}`, 
                background: selectedClass === item.key ? item.bg : 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.color }}>{pct}%</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {count} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {summaryStats.total}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              className="form-control"
              placeholder="Search station or village name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '0.825rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Taluk:</span>
            <select
              className="form-control"
              value={selectedTaluk}
              onChange={(e) => setSelectedTaluk(e.target.value)}
              style={{ fontSize: '0.825rem', width: '150px' }}
            >
              <option value="all">All Taluks (8)</option>
              {talukOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Vulnerability:</span>
            <select
              className="form-control"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ fontSize: '0.825rem', width: '170px' }}
            >
              <option value="all">All Classes</option>
              <option value="Low">Low Vulnerability</option>
              <option value="Moderate">Moderate Vulnerability</option>
              <option value="High">High Vulnerability</option>
              <option value="Very High">Very High Vulnerability</option>
            </select>
          </div>

          {(selectedTaluk !== 'all' || selectedClass !== 'all' || searchQuery) && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => { setSelectedTaluk('all'); setSelectedClass('all'); setSearchQuery(''); }}
              style={{ fontSize: '0.78rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Station Vulnerability Table */}
      <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Location Records ({filteredRecords.length} stations shown for {selectedYear})
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {isForecastYear ? 'Adaptive Ensemble Forecast + 80% CI' : 'Verified Ground Water Observation'}
          </div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)' }}>
                <th>Station / Village</th>
                <th>Taluk</th>
                <th>pH</th>
                <th>EC (µS/cm)</th>
                <th>TDS (mg/L)</th>
                <th>Fluoride (mg/L)</th>
                <th>NO₃ (mg/L)</th>
                <th>Cl (mg/L)</th>
                <th>Ca (mg/L)</th>
                <th>Mg (mg/L)</th>
                <th>Water Quality Risk Class</th>
                <th>Screening Trigger / Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No stations match the selected filter criteria for {selectedYear}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, i) => {
                  const meta = getVulnerabilityMeta(r.Risk_Level);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ fontWeight: 600 }}>{r.Village || 'Unknown'}</td>
                      <td>{r.Taluk || 'N/A'}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: (r.pH < 6.5 || r.pH > 8.5) ? '#dc2626' : 'inherit' }}>
                          {r.pH ? Number(r.pH).toFixed(2) : '—'}
                        </span>
                        {r.pH_Upper_CI && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CI: {Number(r.pH_Lower_CI).toFixed(1)}–{Number(r.pH_Upper_CI).toFixed(1)}</span>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: r.EC > 2250 ? '#dc2626' : 'inherit' }}>
                          {r.EC ? Number(r.EC).toFixed(0) : '—'}
                        </span>
                        {r.EC_Upper_CI && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CI: {Number(r.EC_Lower_CI).toFixed(0)}–{Number(r.EC_Upper_CI).toFixed(0)}</span>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: r.TDS > 2000 ? '#dc2626' : 'inherit' }}>
                          {r.TDS ? Number(r.TDS).toFixed(0) : '—'}
                        </span>
                        {r.TDS_Upper_CI && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CI: {Number(r.TDS_Lower_CI).toFixed(0)}–{Number(r.TDS_Upper_CI).toFixed(0)}</span>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: r.Fluoride > 1.5 ? '#dc2626' : 'inherit' }}>
                          {r.Fluoride ? Number(r.Fluoride).toFixed(2) : '—'}
                        </span>
                        {r.Fluoride_Upper_CI && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CI: {Number(r.Fluoride_Lower_CI).toFixed(2)}–{Number(r.Fluoride_Upper_CI).toFixed(2)}</span>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: r.NO3 > 45 ? '#dc2626' : 'inherit' }}>
                          {r.NO3 !== undefined && r.NO3 !== null ? Number(r.NO3).toFixed(1) : '—'}
                        </span>
                        {r.NO3_Upper_CI && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CI: {Number(r.NO3_Lower_CI).toFixed(1)}–{Number(r.NO3_Upper_CI).toFixed(1)}</span>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: r.Cl > 1000 ? '#dc2626' : 'inherit' }}>
                          {r.Cl !== undefined && r.Cl !== null ? Number(r.Cl).toFixed(0) : '—'}
                        </span>
                        {r.Cl_Upper_CI && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CI: {Number(r.Cl_Lower_CI).toFixed(0)}–{Number(r.Cl_Upper_CI).toFixed(0)}</span>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: r.Ca > 200 ? '#dc2626' : (r.Ca > 75 ? '#d97706' : 'inherit') }}>
                          {r.Ca !== undefined && r.Ca !== null && !isNaN(Number(r.Ca)) ? Number(r.Ca).toFixed(1) : '—'}
                        </span>
                        {r.Ca_Upper_CI && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CI: {Number(r.Ca_Lower_CI).toFixed(0)}–{Number(r.Ca_Upper_CI).toFixed(0)}</span>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: r.Mg > 100 ? '#dc2626' : (r.Mg > 30 ? '#d97706' : 'inherit') }}>
                          {r.Mg !== undefined && r.Mg !== null && !isNaN(Number(r.Mg)) ? Number(r.Mg).toFixed(1) : '—'}
                        </span>
                        {r.Mg_Upper_CI && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CI: {Number(r.Mg_Lower_CI).toFixed(0)}–{Number(r.Mg_Upper_CI).toFixed(0)}</span>}
                      </td>
                      <td>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.72rem', 
                          fontWeight: 700,
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`
                        }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                        {r.Risk_Description || 'All parameters strictly within desirable screening limits.'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
