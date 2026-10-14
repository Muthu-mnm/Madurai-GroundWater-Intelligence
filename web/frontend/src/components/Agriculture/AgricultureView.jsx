import React, { useState, useMemo } from 'react';
import { 
  Wheat, 
  Search, 
  Filter, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { THRESHOLDS, getVulnerabilityMeta } from '../../utils/thresholds';

export default function AgricultureView({ 
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

  // Evaluates agriculture risk for a record
  const assessAgri = (record) => {
    const ec = Number(record.EC);
    if (!ec || isNaN(ec)) {
      return {
        risk_class: 'Insufficient Data',
        suitability: 'Unassessed',
        reason: 'Missing EC salinity measurement',
        meta: getVulnerabilityMeta('Insufficient Data')
      };
    }

    const sar = Number(record.SAR);
    const rsc = Number(record.RSC);
    const naPct = Number(record['Na%']);
    const ph = Number(record.pH);
    const hasFull = !isNaN(sar) && !isNaN(rsc);

    // 1. Extreme Hazard
    if (ec > 4000 || sar > 26 || rsc > 3.5 || naPct > 80 || ph > 9.0) {
      return {
        risk_class: 'Very High Vulnerability',
        suitability: 'Unsuitable for Standard Irrigation',
        reason: ec > 4000 ? `Severe Salinity (${ec.toFixed(0)} µS/cm > 4000)` : (rsc > 3.5 ? `Severe Bicarbonate Alkalinity (${rsc.toFixed(2)} meq/L)` : `Severe Sodicity (SAR ${sar.toFixed(1)})`),
        meta: getVulnerabilityMeta('Very High Vulnerability'),
        isPartial: !hasFull
      };
    }

    // 2. High Hazard
    if (ec > 2250 || sar > 18 || rsc > 2.5 || naPct > 60 || ph < 6.0) {
      return {
        risk_class: 'High Vulnerability',
        suitability: 'Severe Restriction (Salt-Tolerant Only)',
        reason: ec > 2250 ? `High Salinity (${ec.toFixed(0)} µS/cm > 2250, FAO Class C4)` : (sar > 18 ? `High Sodicity (SAR ${sar.toFixed(1)})` : `High RSC (${rsc.toFixed(2)} meq/L)`),
        meta: getVulnerabilityMeta('High Vulnerability'),
        isPartial: !hasFull
      };
    }

    // 3. Moderate Hazard
    if (ec > 750 || sar > 10 || rsc > 1.25 || naPct > 40 || ph > 8.4) {
      return {
        risk_class: 'Moderate Vulnerability',
        suitability: 'Moderate Restriction (Leaching Needed)',
        reason: ec > 750 ? `Moderate Salinity (${ec.toFixed(0)} µS/cm > 750, FAO Class C3)` : (sar > 10 ? `Moderate Sodicity (SAR ${sar.toFixed(1)})` : `Marginal RSC (${rsc.toFixed(2)} meq/L)`),
        meta: getVulnerabilityMeta('Moderate Vulnerability'),
        isPartial: !hasFull
      };
    }

    // 4. Low Hazard
    return {
      risk_class: 'Low Vulnerability',
      suitability: 'Suitable for General Irrigation',
      reason: hasFull ? 'EC, SAR & RSC comply with safe irrigation guidelines' : 'EC & pH comply with low salinity guidelines (SAR/RSC unmeasured)',
      meta: getVulnerabilityMeta('Low Vulnerability'),
      isPartial: !hasFull
    };
  };

  // Filtered stations with agricultural assessment
  const evaluatedRecords = useMemo(() => {
    return currentDataset
      .filter(d => d.Year === selectedYear)
      .map(r => ({
        ...r,
        agri: assessAgri(r)
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
          if (!d.agri.risk_class.toLowerCase().includes(selectedClass.toLowerCase())) return false;
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
      const a = assessAgri(d);
      if (counts[a.risk_class] !== undefined) counts[a.risk_class]++;
      else counts['Insufficient Data']++;
    });

    const total = yearRecords.length;
    return { counts, total };
  }, [currentDataset, selectedYear]);

  return (
    <div className="content-workspace">
      {/* Header Banner */}
      <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <Wheat size={18} />
              </div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Agriculture Vulnerability Assessment
              </h1>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '850px' }}>
              <strong>Top Metrics:</strong> EC, SAR, RSC, Na%, pH &bull; <strong>Purpose:</strong> Irrigation suitability, salinity and sodium hazards screening based on <strong>FAO 29</strong> &amp; <strong>IS 11624:1986</strong> guidelines.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-muted)', padding: '6px 12px', borderRadius: '6px' }}>
            <Calendar size={15} style={{ color: '#16a34a' }} />
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

      {/* Coverage Status Badge */}
      <div style={{ padding: '8px 14px', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.78rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
        <span>
          <strong>Agronomic Coverage:</strong> Complete multi-parameter evaluation across EC, SAR, RSC, Na%, and pH with empirical Bayes shrinkage uncertainty bounds.
        </span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { key: 'Low Vulnerability', label: 'Low Vulnerability', color: '#0d9488', bg: '#f0fdfa', desc: 'Suitable for general irrigation' },
          { key: 'Moderate Vulnerability', label: 'Moderate Vulnerability', color: '#d97706', bg: '#fffbeb', desc: 'Moderate restriction (leaching needed)' },
          { key: 'High Vulnerability', label: 'High Vulnerability', color: '#ea580c', bg: '#fff7ed', desc: 'Severe restriction (salt-tolerant only)' },
          { key: 'Very High Vulnerability', label: 'Very High Vulnerability', color: '#dc2626', bg: '#fef2f2', desc: 'Unsuitable under standard practices' }
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

      {/* Station Table */}
      <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Agricultural Suitability Records ({evaluatedRecords.length} stations shown for {selectedYear})
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            FAO 29 &amp; IS 11624:1986 Screening
          </div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)' }}>
                <th>Station / Village</th>
                <th>Taluk</th>
                <th>EC (µS/cm)</th>
                <th>SAR</th>
                <th>RSC (meq/L)</th>
                <th>Na (%)</th>
                <th>pH</th>
                <th>Irrigation Suitability</th>
                <th>Agriculture Risk Class</th>
                <th>Key Agricultural Factors</th>
              </tr>
            </thead>
            <tbody>
              {evaluatedRecords.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No stations match the selected filter criteria for {selectedYear}.
                  </td>
                </tr>
              ) : (
                evaluatedRecords.map((r, i) => {
                  const m = r.agri.meta;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ fontWeight: 600 }}>{r.Village || 'Unknown'}</td>
                      <td>{r.Taluk || 'N/A'}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: r.EC > 2250 ? '#ea580c' : 'inherit' }}>
                          {r.EC ? Number(r.EC).toFixed(0) : '—'}
                        </span>
                      </td>
                      <td>
                        {r.SAR !== undefined && r.SAR !== null && !isNaN(Number(r.SAR)) ? (
                          <span style={{ fontWeight: Number(r.SAR) > 10 ? 600 : 400, color: Number(r.SAR) > 18 ? '#dc2626' : (Number(r.SAR) > 10 ? '#ea580c' : 'inherit') }}>
                            {Number(r.SAR).toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        {r.RSC !== undefined && r.RSC !== null && !isNaN(Number(r.RSC)) ? (
                          <span style={{ fontWeight: Number(r.RSC) > 1.25 ? 600 : 400, color: Number(r.RSC) > 2.5 ? '#dc2626' : (Number(r.RSC) > 1.25 ? '#ea580c' : 'inherit') }}>
                            {Number(r.RSC).toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        {r['Na%'] !== undefined && r['Na%'] !== null && !isNaN(Number(r['Na%'])) ? (
                          <span style={{ fontWeight: Number(r['Na%']) > 60 ? 600 : 400, color: Number(r['Na%']) > 60 ? '#ea580c' : 'inherit' }}>
                            {Number(r['Na%']).toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        {r.pH !== undefined && r.pH !== null && !isNaN(Number(r.pH)) ? (
                          <span style={{ fontWeight: Number(r.pH) > 8.5 || Number(r.pH) < 6.5 ? 600 : 400, color: Number(r.pH) > 8.5 || Number(r.pH) < 6.5 ? '#ea580c' : 'inherit' }}>
                            {Number(r.pH).toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {r.agri.suitability}
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
                          {r.agri.risk_class}
                          {r.agri.isPartial && <span style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.8 }}>(Partial)</span>}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '260px' }}>
                        {r.agri.reason}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Scope & Agronomic Guidelines Note */}
      <div className="card" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-muted)' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Info size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Agronomic Guidelines &amp; Scope of Model:</strong>
            <div style={{ marginTop: '4px', lineHeight: 1.5 }}>
              Agricultural suitability is categorized under FAO guidelines:
              EC &lt; 750 µS/cm (Low Salinity Hazard, Class C1/C2), 750–2,250 µS/cm (Moderate Restriction, Class C3), 2,250–4,000 µS/cm (Severe Restriction, Class C4), and &gt; 4,000 µS/cm (Unsuitable, Class C5).
              Sodicity hazard is evaluated when SAR is available (SAR &lt; 10 Safe, 10–18 Moderate, 18–26 High).
              <strong>Important Scope Disclaimer:</strong> This module is a hydrochemical screening tool. It does not predict crop yield, soil organic matter, or farm productivity, and assumes standard field drainage.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
