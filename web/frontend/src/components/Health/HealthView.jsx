import React, { useState, useMemo } from 'react';
import { 
  HeartPulse, 
  Search, 
  Filter, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  AlertOctagon,
  ShieldAlert
} from 'lucide-react';
import { THRESHOLDS, getVulnerabilityMeta } from '../../utils/thresholds';

export default function HealthView({ 
  historicalData = [], 
  forecastData = [],
  onSelectStation = null
}) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedTaluk, setSelectedTaluk] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Evaluates health vulnerability screening for a record
  const assessHealth = (record) => {
    const f = Number(record.Fluoride);
    if (!f || isNaN(f)) {
      return {
        risk_class: 'Insufficient Data',
        hazard: 'Unassessed',
        concern: 'Missing Fluoride contaminant measurement',
        meta: getVulnerabilityMeta('Insufficient Data'),
        isPartial: true
      };
    }

    const no3 = Number(record.NO3);
    const tds = Number(record.TDS);
    const ph = Number(record.pH);
    const cl = Number(record.Cl);
    const hasNo3 = !isNaN(no3) && no3 !== null;
    const hasCl = !isNaN(cl) && cl !== null;
    const isPartial = !hasNo3;

    // 1. Very High Hazard (Severe Toxicity / Crippling Fluorosis / Acute Methemoglobinemia / Extreme Mineralization)
    if (f > 3.0 || (hasNo3 && no3 > 100) || tds > 3000 || ph < 5.0 || ph > 9.5 || (hasCl && cl > 1500)) {
      const c = [];
      if (f > 3.0) c.push(`Severe Fluoride (${f.toFixed(2)} mg/L): Risk of crippling skeletal fluorosis & bone deformation`);
      if (hasNo3 && no3 > 100) c.push(`Severe Nitrate (${no3.toFixed(1)} mg/L): Acute infantile methemoglobinemia ('Blue Baby') hazard`);
      if (tds > 3000) c.push(`Extreme TDS (${tds.toFixed(0)} mg/L): Gastrointestinal & kidney mineral stress`);
      if (hasCl && cl > 1500) c.push(`Severe Chloride (${cl.toFixed(0)} mg/L): Acute osmotic stress & GI distress`);
      return {
        risk_class: 'Very High Vulnerability',
        hazard: 'Severe Toxic Contaminant Hazard',
        concern: c.join('; '),
        meta: getVulnerabilityMeta('Very High Vulnerability'),
        isPartial
      };
    }

    // 2. High Hazard (Statutory Exceedance: Dental Fluorosis / Blue Baby / Permissible Limit Breached)
    if (f > 1.5 || (hasNo3 && no3 > 45) || tds > 2000 || ph < 6.5 || ph > 8.5 || (hasCl && cl > 1000)) {
      const c = [];
      if (f > 1.5) c.push(`Fluoride Exceedance (${f.toFixed(2)} mg/L > 1.5): Elevated dental fluorosis in children & early skeletal changes`);
      if (hasNo3 && no3 > 45) c.push(`Nitrate Exceedance (${no3.toFixed(1)} mg/L > 45): Methemoglobinemia risk in infants under 6 months`);
      if (tds > 2000) c.push(`Elevated Mineral Load (${tds.toFixed(0)} mg/L > 2000): Hyper-mineralization`);
      if (hasCl && cl > 1000) c.push(`Chloride Exceedance (${cl.toFixed(0)} mg/L > 1000): Salty taste & osmotic distress`);
      if (ph < 6.5 || ph > 8.5) c.push(`pH Outlier (${ph.toFixed(2)}): Piping corrosion or mucosal irritation`);
      return {
        risk_class: 'High Vulnerability',
        hazard: 'High Contaminant Exposure Hazard',
        concern: c.join('; '),
        meta: getVulnerabilityMeta('High Vulnerability'),
        isPartial
      };
    }

    // 3. Moderate Hazard (Permissible Zone / Mild mottling potential)
    if (f > 1.0 || (record.Fluoride_Upper_CI && Number(record.Fluoride_Upper_CI) > 1.5) || tds > 500 || (hasCl && cl > 250)) {
      const c = [];
      if (f > 1.0) c.push(`Fluoride in Permissible Range (${f.toFixed(2)} mg/L > 1.0): Mild dental mottling risk in young children`);
      else if (record.Fluoride_Upper_CI && Number(record.Fluoride_Upper_CI) > 1.5) c.push(`Fluoride Upper CI breach (${Number(record.Fluoride_Upper_CI).toFixed(2)} mg/L > 1.5)`);
      if (tds > 500) c.push(`TDS in permissible range (${tds.toFixed(0)} mg/L)`);
      if (hasCl && cl > 250) c.push(`Chloride in permissible range (${cl.toFixed(0)} mg/L > 250)`);
      return {
        risk_class: 'Moderate Vulnerability',
        hazard: 'Moderate Screening Concern',
        concern: c.join('; '),
        meta: getVulnerabilityMeta('Moderate Vulnerability'),
        isPartial
      };
    }

    // 4. Low Hazard
    return {
      risk_class: 'Low Vulnerability',
      hazard: 'Low Contaminant Hazard',
      concern: 'No chemical contaminant exposure hazards detected in evaluated parameters.',
      meta: getVulnerabilityMeta('Low Vulnerability'),
      isPartial
    };
  };

  // Filtered and evaluated records
  const evaluatedRecords = useMemo(() => {
    return currentDataset
      .filter(d => d.Year === selectedYear)
      .map(r => ({
        ...r,
        health: assessHealth(r)
      }))
      .filter(d => {
        if (selectedTaluk !== 'all' && d.Taluk !== selectedTaluk) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const v = (d.Village || '').toLowerCase();
          const t = (d.Taluk || '').toLowerCase();
          if (!v.includes(q) && !t.includes(q)) return false;
        }
        if (selectedClass !== 'all') {
          if (!d.health.risk_class.toLowerCase().includes(selectedClass.toLowerCase())) return false;
        }
        return true;
      });
  }, [currentDataset, selectedYear, selectedTaluk, selectedClass, searchQuery]);

  // Aggregate stats
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
      const h = assessHealth(d);
      if (counts[h.risk_class] !== undefined) counts[h.risk_class]++;
      else counts['Insufficient Data']++;
    });

    const total = yearRecords.length;
    return { counts, total };
  }, [currentDataset, selectedYear]);

  return (
    <div className="content-workspace">
      {/* Header Banner */}
      <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #dc2626' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <HeartPulse size={18} />
              </div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Health Vulnerability Screening
              </h1>
            </div>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-muted)', padding: '6px 12px', borderRadius: '6px' }}>
            <Calendar size={15} style={{ color: '#dc2626' }} />
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



      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { key: 'Low Vulnerability', label: 'Low Vulnerability', color: '#0d9488', bg: '#f0fdfa', desc: 'F ≤ 1.0 mg/L & NO3 ≤ 45 mg/L' },
          { key: 'Moderate Vulnerability', label: 'Moderate Vulnerability', color: '#d97706', bg: '#fffbeb', desc: '1.0 < F ≤ 1.5 (mild mottling risk)' },
          { key: 'High Vulnerability', label: 'High Vulnerability', color: '#ea580c', bg: '#fff7ed', desc: 'F > 1.5 or NO3 > 45 (statutory breach)' },
          { key: 'Very High Vulnerability', label: 'Very High Vulnerability', color: '#dc2626', bg: '#fef2f2', desc: 'F > 3.0 (crippling fluorosis risk)' }
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
              <option value="all">All Taluks ({talukOptions.length})</option>
              {talukOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Hazard Class:</span>
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

      {/* Station Health Table */}
      <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Contaminant Screening Records ({evaluatedRecords.length} stations shown for {selectedYear})
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            WHO 2017 &amp; BIS 10500:2012 Toxicological Limits
          </div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)' }}>
                <th>Station / Village</th>
                <th>Taluk</th>
                <th>Fluoride (mg/L)</th>
                <th>Nitrate (NO₃ mg/L)</th>
                <th>TDS (mg/L)</th>
                <th>pH</th>
                <th>Chloride (Cl mg/L)</th>
                <th>Health Risk Class</th>
                <th>Toxicological Hazard Screening Concern</th>
              </tr>
            </thead>
            <tbody>
              {evaluatedRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No stations match the selected filter criteria for {selectedYear}.
                  </td>
                </tr>
              ) : (
                evaluatedRecords.map((r, i) => {
                  const m = r.health.meta;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ fontWeight: 600 }}>{r.Village || 'Unknown'}</td>
                      <td>{r.Taluk || 'N/A'}</td>
                      <td>
                        <span style={{ 
                          fontWeight: 700, 
                          color: r.Fluoride > 3.0 ? '#b91c1c' : (r.Fluoride > 1.5 ? '#ea580c' : (r.Fluoride > 1.0 ? '#d97706' : '#0d9488')) 
                        }}>
                          {r.Fluoride ? Number(r.Fluoride).toFixed(2) : '—'}
                        </span>
                        {r.Fluoride_Upper_CI && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Upper CI: {Number(r.Fluoride_Upper_CI).toFixed(2)}</span>}
                      </td>
                      <td>
                        {r.NO3 !== undefined && r.NO3 !== null && !isNaN(Number(r.NO3)) ? (
                          <span style={{ fontWeight: Number(r.NO3) > 45 ? 700 : 400, color: Number(r.NO3) > 45 ? '#dc2626' : 'inherit' }}>
                            {Number(r.NO3).toFixed(1)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                        )}
                      </td>
                      <td>{r.TDS ? Number(r.TDS).toFixed(0) : '—'}</td>
                      <td>{r.pH ? Number(r.pH).toFixed(2) : '—'}</td>
                      <td>
                        {r.Cl !== undefined && r.Cl !== null && !isNaN(Number(r.Cl)) ? (
                          <span style={{ 
                            fontWeight: Number(r.Cl) > 1000 ? 700 : (Number(r.Cl) > 250 ? 600 : 400), 
                            color: Number(r.Cl) > 1000 ? '#ea580c' : (Number(r.Cl) > 250 ? '#d97706' : 'inherit') 
                          }}>
                            {Number(r.Cl).toFixed(0)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.72rem', 
                          fontWeight: 700,
                          background: m.bg,
                          color: m.color,
                          border: `1px solid ${m.border}`
                        }}>
                          {r.health.risk_class}
                          {r.health.isPartial && <span style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.8 }}>(Partial)</span>}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                        {r.health.concern}
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
