import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  Layers,
  Sparkles,
  Sliders,
  ShieldCheck,
  ShieldAlert as ShieldWarn
} from 'lucide-react';
import { getVulnerabilityMeta, DOMAIN_METADATA } from '../../utils/thresholds';

export default function CombinedRiskView({ 
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

  // Evaluates independent domains and protective combined assessment
  const assessCombined = (record) => {
    const f = Number(record.Fluoride);
    const no3 = Number(record.NO3);
    const tds = Number(record.TDS);
    const ec = Number(record.EC);
    const ph = Number(record.pH);
    const cl = Number(record.Cl);
    const ca = Number(record.Ca);
    const mg = Number(record.Mg);
    const sar = Number(record.SAR);
    const rsc = Number(record.RSC);
    const naPct = Number(record['Na%']);

    const hasNo3 = !isNaN(no3) && no3 !== null;
    const hasCl = !isNaN(cl) && cl !== null;
    const hasCa = !isNaN(ca) && ca !== null;
    const hasMg = !isNaN(mg) && mg !== null;
    const hasSar = !isNaN(sar) && sar !== null;
    const hasRsc = !isNaN(rsc) && rsc !== null;
    const hasNaPct = !isNaN(naPct) && naPct !== null;

    // 1. Water Quality Domain (Top Metrics: pH, EC, TDS, Fluoride, NO3, Cl, Ca, Mg)
    let wqClass = 'Low Vulnerability';
    let wqReason = 'Within desirable limits';
    if (isNaN(tds) || isNaN(ec) || isNaN(f) || isNaN(ph)) {
      wqClass = 'Insufficient Data';
      wqReason = 'Missing parameters';
    } else if (f > 3.0 || tds > 3000 || ec > 4000 || (hasCl && cl > 1500) || (hasNo3 && no3 > 100) || (hasCa && ca > 300) || (hasMg && mg > 150) || ph < 5.0 || ph > 9.5) {
      wqClass = 'Very High Vulnerability';
      wqReason = f > 3.0 ? `Severe Fluoride (${f.toFixed(2)} mg/L)` : (tds > 3000 ? `Severe Mineralization (${tds.toFixed(0)} mg/L)` : `Extreme Contaminant Load`);
    } else if (f > 1.5 || tds > 2000 || ec > 2250 || (hasCl && cl > 1000) || (hasNo3 && no3 > 45) || (hasCa && ca > 200) || (hasMg && mg > 100) || ph < 6.5 || ph > 8.5) {
      wqClass = 'High Vulnerability';
      wqReason = f > 1.5 ? `Fluoride Exceedance (${f.toFixed(2)} mg/L > 1.5)` : (tds > 2000 ? `TDS Exceedance (${tds.toFixed(0)} mg/L)` : (hasCl && cl > 1000 ? `Chloride Exceedance (${cl.toFixed(0)} mg/L)` : (hasCa && ca > 200 ? `Calcium Exceedance (${ca.toFixed(1)} mg/L)` : `EC/pH/Hardness Non-compliance`)));
    } else if (tds > 500 || f > 1.0 || ec > 750 || (hasCl && cl > 250) || (hasCa && ca > 75) || (hasMg && mg > 30) || (record.Fluoride_Upper_CI && Number(record.Fluoride_Upper_CI) > 1.5)) {
      wqClass = 'Moderate Vulnerability';
      wqReason = 'Permissible relaxation / CI breach';
    }

    // 2. Agriculture Domain (Top Metrics: EC, SAR, RSC, Na%, pH)
    let agriClass = 'Low Vulnerability';
    let agriReason = 'Suitable for irrigation';
    const agriPartial = !hasSar || !hasRsc;

    if (isNaN(ec)) {
      agriClass = 'Insufficient Data';
      agriReason = 'Missing EC salinity';
    } else if (ec > 4000 || sar > 26 || rsc > 3.5 || naPct > 80 || ph > 9.0) {
      agriClass = 'Very High Vulnerability';
      agriReason = ec > 4000 ? `Severe Salinity (${ec.toFixed(0)} µS/cm)` : (rsc > 3.5 ? `Severe RSC (${rsc.toFixed(2)} meq/L)` : (sar > 26 ? `Severe Sodicity (SAR ${sar.toFixed(1)})` : `Severe Alkalinity`));
    } else if (ec > 2250 || sar > 18 || rsc > 2.5 || naPct > 60 || ph < 6.0) {
      agriClass = 'High Vulnerability';
      agriReason = ec > 2250 ? `High Salinity (${ec.toFixed(0)} µS/cm, Class C4)` : (sar > 18 ? `High SAR (${sar.toFixed(1)})` : (rsc > 2.5 ? `High RSC (${rsc.toFixed(2)} meq/L)` : `High Sodium Percentage`));
    } else if (ec > 750 || sar > 10 || rsc > 1.25 || naPct > 40 || ph > 8.4) {
      agriClass = 'Moderate Vulnerability';
      agriReason = ec > 750 ? `Moderate Salinity (${ec.toFixed(0)} µS/cm)` : `Marginal Sodicity/RSC`;
    }

    // 3. Health Domain (Top Metrics: Fluoride, NO3, TDS, pH, Cl)
    let healthClass = 'Low Vulnerability';
    let healthReason = 'Complies with WHO/BIS guidelines';
    const healthPartial = !hasNo3;

    if (isNaN(f)) {
      healthClass = 'Insufficient Data';
      healthReason = 'Missing Fluoride';
    } else if (f > 3.0 || (hasNo3 && no3 > 100) || tds > 3000 || (hasCl && cl > 1500) || ph < 5.0 || ph > 9.5) {
      healthClass = 'Very High Vulnerability';
      healthReason = f > 3.0 ? `Crippling Fluorosis Risk (F ${f.toFixed(2)} mg/L)` : (no3 > 100 ? `Acute Nitrate Hazard (${no3.toFixed(0)} mg/L)` : (cl > 1500 ? `Severe Chloride Toxicity (${cl.toFixed(0)} mg/L)` : `Extreme TDS`));
    } else if (f > 1.5 || (hasNo3 && no3 > 45) || tds > 2000 || (hasCl && cl > 1000) || ph < 6.5 || ph > 8.5) {
      healthClass = 'High Vulnerability';
      healthReason = f > 1.5 ? `Dental Fluorosis Risk (F ${f.toFixed(2)} mg/L)` : (no3 > 45 ? `Infantile Methemoglobinemia Risk (NO3 ${no3.toFixed(1)} mg/L)` : (cl > 1000 ? `Chloride Exceedance (${cl.toFixed(0)} mg/L)` : `TDS / pH Exceedance`));
    } else if (f > 1.0 || (record.Fluoride_Upper_CI && Number(record.Fluoride_Upper_CI) > 1.5) || tds > 500 || (hasCl && cl > 250)) {
      healthClass = 'Moderate Vulnerability';
      healthReason = 'Fluoride in permissible zone / CI breach';
    }

    // 4. Combined Protective Aggregation Rule
    const isPartial = (agriPartial || healthPartial);
    const domainList = [wqClass, agriClass, healthClass];

    let combinedClass = 'Low Vulnerability';
    let protectiveTrigger = null;
    let score = 18;

    if (domainList.includes('Very High Vulnerability')) {
      combinedClass = 'Very High Vulnerability';
      score = 95;
      const trig = [];
      if (healthClass === 'Very High Vulnerability') trig.push('Health Toxic Hazard');
      if (agriClass === 'Very High Vulnerability') trig.push('Agriculture Severe Salinity/Sodicity');
      if (wqClass === 'Very High Vulnerability') trig.push('Water Quality Extreme Exceedance');
      protectiveTrigger = `Protective severity rule: ${trig.join(', ')}`;
    } else if (domainList.includes('High Vulnerability')) {
      combinedClass = 'High Vulnerability';
      score = 75;
      const trig = [];
      if (healthClass === 'High Vulnerability') trig.push('Health Risk');
      if (agriClass === 'High Vulnerability') trig.push('Agriculture Hazard');
      if (wqClass === 'High Vulnerability') trig.push('Water Quality Exceedance');
      protectiveTrigger = `Protective severity rule: ${trig.join(', ')}`;
    } else if (domainList.includes('Moderate Vulnerability')) {
      combinedClass = 'Moderate Vulnerability';
      score = 45;
      protectiveTrigger = 'Composite permissible relaxation';
    }

    return {
      wq: { risk_class: wqClass, reason: wqReason, meta: getVulnerabilityMeta(wqClass) },
      agri: { risk_class: agriClass, reason: agriReason, isPartial: agriPartial, meta: getVulnerabilityMeta(agriClass) },
      health: { risk_class: healthClass, reason: healthReason, isPartial: healthPartial, meta: getVulnerabilityMeta(healthClass) },
      combined: {
        risk_class: combinedClass,
        isPartial,
        score,
        protectiveTrigger,
        status: isPartial ? 'Partial Assessment' : 'Complete Assessment',
        meta: getVulnerabilityMeta(combinedClass)
      }
    };
  };

  // Evaluated and filtered records
  const evaluatedRecords = useMemo(() => {
    return currentDataset
      .filter(d => d.Year === selectedYear)
      .map(r => ({
        ...r,
        assessment: assessCombined(r)
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
          if (!d.assessment.combined.risk_class.toLowerCase().includes(selectedClass.toLowerCase())) return false;
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
      'Partial Assessment': 0
    };

    yearRecords.forEach(d => {
      const a = assessCombined(d);
      if (counts[a.combined.risk_class] !== undefined) counts[a.combined.risk_class]++;
      if (a.combined.isPartial) counts['Partial Assessment']++;
    });

    const total = yearRecords.length;
    return { counts, total };
  }, [currentDataset, selectedYear]);

  return (
    <div className="content-workspace">
      {/* Header Banner */}
      <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #0f766e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e' }}>
                <ShieldAlert size={18} />
              </div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Combined Groundwater Vulnerability Assessment
              </h1>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '850px' }}>
              Protective multi-domain integration of <strong>Water Quality</strong>, <strong>Agriculture</strong>, and <strong>Health</strong> models.
              Engineered so that a severe risk in any single domain cannot be diluted or hidden behind low risks in others.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-muted)', padding: '6px 12px', borderRadius: '6px' }}>
            <Calendar size={15} style={{ color: '#0f766e' }} />
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

      {/* Protective Rule & Weight Explanation Strip */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '12px' 
      }}>
        <div className="card" style={{ padding: '12px 14px', background: '#f8fafc', borderLeft: '3px solid #0284c7' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} />
            Protective Severity Precedence Rule
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
            If ANY domain exhibits <em>Very High Vulnerability</em> (e.g. crippling fluorosis or severe salinity), the Combined assessment is automatically locked at <strong>Very High</strong> regardless of scores in other domains.
          </div>
        </div>

        <div className="card" style={{ padding: '12px 14px', background: '#f8fafc', borderLeft: '3px solid #0d9488' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={16} />
            Domain Weights Configuration
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
            Health Vulnerability: <strong>40%</strong> &bull; Water Quality: <strong>35%</strong> &bull; Agriculture: <strong>25%</strong>.
            Weights apply when no single domain triggers the severe override threshold.
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { key: 'Low Vulnerability', label: 'Overall Low Vulnerability', color: '#0d9488', bg: '#f0fdfa', desc: 'All 3 domains strictly compliant' },
          { key: 'Moderate Vulnerability', label: 'Overall Moderate Vulnerability', color: '#d97706', bg: '#fffbeb', desc: 'Permissible relaxation in ≥1 domain' },
          { key: 'High Vulnerability', label: 'Overall High Vulnerability', color: '#ea580c', bg: '#fff7ed', desc: 'Statutory or agricultural breach' },
          { key: 'Very High Vulnerability', label: 'Overall Critical Vulnerability', color: '#dc2626', bg: '#fef2f2', desc: 'Extreme toxicity or severe hazard' }
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
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Combined Class:</span>
            <select
              className="form-control"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ fontSize: '0.825rem', width: '180px' }}
            >
              <option value="all">All Combined Classes</option>
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

      {/* Multi-Domain Side-by-Side Comparison Table */}
      <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Integrated Multi-Domain Assessment Records ({evaluatedRecords.length} stations shown for {selectedYear})
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            All 3 Domains Displayed Side-by-Side
          </div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)' }}>
                <th>Station / Village</th>
                <th>Taluk</th>
                <th>Water Quality Risk</th>
                <th>Agriculture Risk</th>
                <th>Health Screening Risk</th>
                <th>Combined Risk Class</th>
                <th>Composite Score</th>
                <th>Governing Precedence Reason</th>
              </tr>
            </thead>
            <tbody>
              {evaluatedRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No stations match the selected filter criteria for {selectedYear}.
                  </td>
                </tr>
              ) : (
                evaluatedRecords.map((r, i) => {
                  const ass = r.assessment;
                  const cMeta = ass.combined.meta;
                  const wMeta = ass.wq.meta;
                  const aMeta = ass.agri.meta;
                  const hMeta = ass.health.meta;

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ fontWeight: 600 }}>{r.Village || 'Unknown'}</td>
                      <td>{r.Taluk || 'N/A'}</td>
                      
                      {/* Water Quality */}
                      <td>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '0.7rem', 
                          fontWeight: 700,
                          background: wMeta.bg,
                          color: wMeta.color,
                          border: `1px solid ${wMeta.border}`
                        }}>
                          {ass.wq.risk_class.replace(' Vulnerability', '')}
                        </span>
                      </td>

                      {/* Agriculture */}
                      <td>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '0.7rem', 
                          fontWeight: 700,
                          background: aMeta.bg,
                          color: aMeta.color,
                          border: `1px solid ${aMeta.border}`
                        }}>
                          {ass.agri.risk_class.replace(' Vulnerability', '')}
                          {ass.agri.isPartial && <span style={{ opacity: 0.75, marginLeft: '3px' }}>*</span>}
                        </span>
                      </td>

                      {/* Health */}
                      <td>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '0.7rem', 
                          fontWeight: 700,
                          background: hMeta.bg,
                          color: hMeta.color,
                          border: `1px solid ${hMeta.border}`
                        }}>
                          {ass.health.risk_class.replace(' Vulnerability', '')}
                          {ass.health.isPartial && <span style={{ opacity: 0.75, marginLeft: '3px' }}>*</span>}
                        </span>
                      </td>

                      {/* Combined Risk Class */}
                      <td>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.72rem', 
                          fontWeight: 700,
                          background: cMeta.bg,
                          color: cMeta.color,
                          border: `1px solid ${cMeta.border}`
                        }}>
                          {ass.combined.risk_class}
                          {ass.combined.isPartial && <span style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.8 }}>(Partial)</span>}
                        </span>
                      </td>

                      {/* Composite Score */}
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: cMeta.color }}>
                          {ass.combined.score} <span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ 100</span>
                        </span>
                      </td>

                      {/* Governing Reason */}
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                        {ass.combined.protectiveTrigger || 'Balanced multi-domain adherence to desirable standards.'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Traceability and Partial Assessment Standards */}
      <div className="card" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-muted)' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Info size={18} style={{ color: '#0f766e', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Composite Traceability &amp; Partial Assessment Protocol:</strong>
            <div style={{ marginTop: '4px', lineHeight: 1.5 }}>
              The Combined Vulnerability Assessor preserves all 3 domain classes independently. When secondary parameters are unmeasured (indicated by asterisk *), assessments are explicitly marked <em>(Partial)</em>.
              No synthetic numbers are invented. The composite score provides an interpretable 0–100 ranking where scores &ge; 70 signify significant hazard in at least one domain.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
