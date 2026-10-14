import React, { useState, useMemo, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { 
  THRESHOLDS, 
  VULNERABILITY_CLASSES, 
  getVulnerabilityMeta, 
  evaluateMultiDomain,
  DOMAIN_METADATA 
} from '../../utils/thresholds';
import ExportButton from '../Common/ExportButton';
import DisclaimerBanner from '../Common/DisclaimerBanner';
import { 
  TrendingUp, 
  Search, 
  Filter, 
  Calendar, 
  Info, 
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Droplet,
  Wheat,
  HeartPulse,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers
} from 'lucide-react';

export default function ForecastExplorer({ 
  forecastData = [], 
  historicalData = [],
  onNavigateToPredict
}) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedDomain, setSelectedDomain] = useState('all'); // 'all' | 'combined' | 'water_quality' | 'agriculture' | 'health'
  const [selectedRisk, setSelectedRisk] = useState('all');
  const [selectedTaluk, setSelectedTaluk] = useState('all');
  const [searchVillage, setSearchVillage] = useState('');
  const [selectedParam, setSelectedParam] = useState('TDS');
  
  // Table Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('Village');
  const [sortDir, setSortDir] = useState('asc');

  // Selected station for deep-dive trajectory chart
  const [activeStation, setActiveStation] = useState(null);

  const forecastChartRef = useRef(null);
  const forecastChartInst = useRef(null);

  // Available taluks for filter
  const talukOptions = useMemo(() => {
    const set = new Set();
    forecastData.forEach(d => {
      if (d.Taluk) set.add(d.Taluk);
    });
    return Array.from(set).sort();
  }, [forecastData]);

  // Evaluated year records with full multi-domain evaluation
  const evaluatedYearData = useMemo(() => {
    return forecastData
      .filter(d => d.Year === selectedYear)
      .map(d => {
        const assessment = evaluateMultiDomain(d);
        return {
          ...d,
          multiDomain: assessment
        };
      });
  }, [forecastData, selectedYear]);

  // Domain Summary Statistics for the selected year
  const domainSummaries = useMemo(() => {
    const counts = {
      combined: { 'Very High Vulnerability': 0, 'High Vulnerability': 0, 'Moderate Vulnerability': 0, 'Low Vulnerability': 0 },
      wq: { 'Very High Vulnerability': 0, 'High Vulnerability': 0, 'Moderate Vulnerability': 0, 'Low Vulnerability': 0 },
      agri: { 'Very High Vulnerability': 0, 'High Vulnerability': 0, 'Moderate Vulnerability': 0, 'Low Vulnerability': 0 },
      health: { 'Very High Vulnerability': 0, 'High Vulnerability': 0, 'Moderate Vulnerability': 0, 'Low Vulnerability': 0 }
    };

    evaluatedYearData.forEach(d => {
      const { combined, wq, agri, health } = d.multiDomain;
      if (counts.combined[combined.class] !== undefined) counts.combined[combined.class]++;
      if (counts.wq[wq.class] !== undefined) counts.wq[wq.class]++;
      if (counts.agri[agri.class] !== undefined) counts.agri[agri.class]++;
      if (counts.health[health.class] !== undefined) counts.health[health.class]++;
    });

    return counts;
  }, [evaluatedYearData]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return evaluatedYearData.filter(d => {
      // Taluk filter
      if (selectedTaluk !== 'all' && d.Taluk && d.Taluk.toLowerCase() !== selectedTaluk.toLowerCase()) {
        return false;
      }

      // Risk Class filter
      if (selectedRisk !== 'all') {
        let targetClass = d.multiDomain.combined.class;
        if (selectedDomain === 'water_quality') targetClass = d.multiDomain.wq.class;
        else if (selectedDomain === 'agriculture') targetClass = d.multiDomain.agri.class;
        else if (selectedDomain === 'health') targetClass = d.multiDomain.health.class;

        if (targetClass !== selectedRisk) return false;
      }

      // Search filter
      if (searchVillage.trim()) {
        const q = searchVillage.toLowerCase().trim();
        const v = (d.Village || '').toLowerCase();
        const t = (d.Taluk || '').toLowerCase();
        if (!v.includes(q) && !t.includes(q)) return false;
      }

      return true;
    });
  }, [evaluatedYearData, selectedTaluk, selectedRisk, selectedDomain, searchVillage]);

  // Set default active station if none selected or if filtered out
  useEffect(() => {
    if (!activeStation && filteredData.length > 0) {
      setActiveStation(filteredData[0]);
    } else if (activeStation && !filteredData.find(d => d.Village === activeStation.Village)) {
      if (filteredData.length > 0) setActiveStation(filteredData[0]);
    }
  }, [filteredData, activeStation]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];

      // Support sorting by multi-domain classes
      if (sortField === 'Combined') {
        va = a.multiDomain.combined.score;
        vb = b.multiDomain.combined.score;
      } else if (sortField === 'WaterQuality') {
        va = a.multiDomain.wq.class;
        vb = b.multiDomain.wq.class;
      } else if (sortField === 'Agriculture') {
        va = a.multiDomain.agri.class;
        vb = b.multiDomain.agri.class;
      } else if (sortField === 'Health') {
        va = a.multiDomain.health.class;
        vb = b.multiDomain.health.class;
      }

      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [filteredData, page, pageSize, sortField, sortDir]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  // Render Longitudinal Trend Chart for Active Station
  useEffect(() => {
    if (!forecastChartRef.current || !activeStation) return;
    if (forecastChartInst.current) forecastChartInst.current.destroy();

    const village = activeStation.Village;

    const stHist = historicalData
      .filter(d => d.Village && d.Village.toLowerCase() === village.toLowerCase())
      .sort((a, b) => a.Year - b.Year);

    const stFc = forecastData
      .filter(d => d.Village && d.Village.toLowerCase() === village.toLowerCase())
      .sort((a, b) => a.Year - b.Year);

    const labels = [];
    const histVals = [];
    const fcVals = [];
    const fcUpperVals = [];
    const fcLowerVals = [];

    for (let y = 2007; y <= 2030; y++) {
      labels.push(y.toString());

      if (y <= 2021) {
        const found = stHist.find(d => d.Year === y);
        histVals.push(found && typeof found[selectedParam] === 'number' ? found[selectedParam] : null);
        fcVals.push(null);
        fcUpperVals.push(null);
        fcLowerVals.push(null);
      } else {
        histVals.push(null);
        const found = stFc.find(d => d.Year === y);
        fcVals.push(found && typeof found[selectedParam] === 'number' ? found[selectedParam] : null);
        fcUpperVals.push(found && typeof found[`${selectedParam}_Upper_CI`] === 'number' ? found[`${selectedParam}_Upper_CI`] : null);
        fcLowerVals.push(found && typeof found[`${selectedParam}_Lower_CI`] === 'number' ? found[`${selectedParam}_Lower_CI`] : null);
      }
    }

    const paramMeta = THRESHOLDS[selectedParam] || {};
    const unitStr = paramMeta.unit ? ` (${paramMeta.unit})` : '';

    const ctx = forecastChartRef.current.getContext('2d');
    forecastChartInst.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Historical Observed${unitStr}`,
            data: histVals,
            borderColor: '#0f766e',
            backgroundColor: '#0f766e',
            borderWidth: 2.2,
            pointRadius: 4,
            tension: 0.1
          },
          {
            label: `Adaptive Ensemble Forecast${unitStr}`,
            data: fcVals,
            borderColor: '#0284c7',
            backgroundColor: '#0284c7',
            borderWidth: 2.2,
            borderDash: [5, 5],
            pointRadius: 3.5,
            tension: 0.1
          },
          {
            label: `Upper Prediction Bound (Nominal 80% CI)`,
            data: fcUpperVals,
            borderColor: 'rgba(2, 132, 199, 0.4)',
            backgroundColor: 'rgba(2, 132, 199, 0.12)',
            fill: '+1',
            borderWidth: 1,
            pointRadius: 0
          },
          {
            label: `Lower Prediction Bound (Nominal 80% CI)`,
            data: fcLowerVals,
            borderColor: 'rgba(2, 132, 199, 0.4)',
            backgroundColor: 'transparent',
            fill: false,
            borderWidth: 1,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { size: 11, family: 'Inter' } }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: '#E2E8EC' },
            title: {
              display: true,
              text: `${paramMeta.name || selectedParam}${unitStr}`,
              font: { size: 11, family: 'Inter', weight: 600 }
            }
          }
        }
      }
    });

    return () => {
      if (forecastChartInst.current) forecastChartInst.current.destroy();
    };
  }, [activeStation, selectedParam, historicalData, forecastData]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const activeAssessment = activeStation ? (activeStation.multiDomain || evaluateMultiDomain(activeStation)) : null;

  return (
    <div className="content-workspace">
      <DisclaimerBanner />

      {/* Simulator Shortcut Banner */}
      {onNavigateToPredict && (
        <div style={{
          backgroundColor: 'rgba(15, 118, 110, 0.08)',
          border: '1.5px solid rgba(15, 118, 110, 0.25)',
          borderRadius: '8px',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#0f766e', color: '#fff', padding: '6px', borderRadius: '6px' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Simulate Custom Groundwater Stress &amp; Climate Scenarios
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Test custom chemical concentrations across all 4 domains up to 2035 with real-time multi-domain screening.
              </div>
            </div>
          </div>
          <button 
            className="btn btn-primary btn-sm"
            onClick={onNavigateToPredict}
            style={{ fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Open Prediction Simulator →
          </button>
        </div>
      )}

      {/* 4 Core Domain Overview Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '12px',
        marginBottom: '14px' 
      }}>
        {/* Combiner Card */}
        <div 
          className="card"
          onClick={() => { setSelectedDomain(selectedDomain === 'combined' ? 'all' : 'combined'); setPage(1); }}
          style={{ 
            padding: '12px 14px', 
            borderLeft: '4px solid #0f766e',
            background: selectedDomain === 'combined' ? '#f0fdfa' : 'var(--bg-surface)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} style={{ color: '#0f766e' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Combiner Assessment</span>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0f766e', background: '#ccfbf1', padding: '1px 6px', borderRadius: '4px' }}>
              Protective
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.74rem' }}>
            <div><strong style={{ color: '#dc2626' }}>{domainSummaries.combined['Very High Vulnerability']}</strong> Critical</div>
            <div><strong style={{ color: '#ea580c' }}>{domainSummaries.combined['High Vulnerability']}</strong> High</div>
            <div><strong style={{ color: '#d97706' }}>{domainSummaries.combined['Moderate Vulnerability']}</strong> Mod</div>
            <div><strong style={{ color: '#0d9488' }}>{domainSummaries.combined['Low Vulnerability']}</strong> Low</div>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Protective precedence: severe risk in any domain cannot be masked.
          </div>
        </div>

        {/* Water Quality Domain Card */}
        <div 
          className="card"
          onClick={() => { setSelectedDomain(selectedDomain === 'water_quality' ? 'all' : 'water_quality'); setPage(1); }}
          style={{ 
            padding: '12px 14px', 
            borderLeft: '4px solid #0284c7',
            background: selectedDomain === 'water_quality' ? '#f0f9ff' : 'var(--bg-surface)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Droplet size={16} style={{ color: '#0284c7' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Water Quality</span>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
              BIS IS 10500
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.74rem' }}>
            <div><strong style={{ color: '#dc2626' }}>{domainSummaries.wq['Very High Vulnerability']}</strong> Extreme</div>
            <div><strong style={{ color: '#ea580c' }}>{domainSummaries.wq['High Vulnerability']}</strong> Exceed</div>
            <div><strong style={{ color: '#d97706' }}>{domainSummaries.wq['Moderate Vulnerability']}</strong> Permissible</div>
            <div><strong style={{ color: '#0d9488' }}>{domainSummaries.wq['Low Vulnerability']}</strong> Safe</div>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            TDS, EC, F, pH, Ca, Mg, Cl, NO3 compliance screening.
          </div>
        </div>

        {/* Agriculture Domain Card */}
        <div 
          className="card"
          onClick={() => { setSelectedDomain(selectedDomain === 'agriculture' ? 'all' : 'agriculture'); setPage(1); }}
          style={{ 
            padding: '12px 14px', 
            borderLeft: '4px solid #16a34a',
            background: selectedDomain === 'agriculture' ? '#f0fdf4' : 'var(--bg-surface)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wheat size={16} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Agriculture Screening</span>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
              FAO / Richards
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.74rem' }}>
            <div><strong style={{ color: '#dc2626' }}>{domainSummaries.agri['Very High Vulnerability']}</strong> Severe</div>
            <div><strong style={{ color: '#ea580c' }}>{domainSummaries.agri['High Vulnerability']}</strong> Restrict</div>
            <div><strong style={{ color: '#d97706' }}>{domainSummaries.agri['Moderate Vulnerability']}</strong> Mod</div>
            <div><strong style={{ color: '#0d9488' }}>{domainSummaries.agri['Low Vulnerability']}</strong> Suitable</div>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Salinity (EC) and sodicity (SAR, RSC, Na%) hazard evaluation.
          </div>
        </div>

        {/* Health Screening Domain Card */}
        <div 
          className="card"
          onClick={() => { setSelectedDomain(selectedDomain === 'health' ? 'all' : 'health'); setPage(1); }}
          style={{ 
            padding: '12px 14px', 
            borderLeft: '4px solid #dc2626',
            background: selectedDomain === 'health' ? '#fef2f2' : 'var(--bg-surface)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HeartPulse size={16} style={{ color: '#dc2626' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Health Screening</span>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
              WHO Toxicological
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.74rem' }}>
            <div><strong style={{ color: '#dc2626' }}>{domainSummaries.health['Very High Vulnerability']}</strong> Toxic</div>
            <div><strong style={{ color: '#ea580c' }}>{domainSummaries.health['High Vulnerability']}</strong> Fluorosis</div>
            <div><strong style={{ color: '#d97706' }}>{domainSummaries.health['Moderate Vulnerability']}</strong> Permissible</div>
            <div><strong style={{ color: '#0d9488' }}>{domainSummaries.health['Low Vulnerability']}</strong> Safe</div>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Dental/skeletal fluorosis and infant methemoglobinemia risk.
          </div>
        </div>
      </div>

      {/* Control Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <span className="filter-label"><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Horizon:</span>
          <select 
            className="filter-select"
            value={selectedYear}
            onChange={(e) => { setSelectedYear(Number(e.target.value)); setPage(1); }}
          >
            {[2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <option key={y} value={y}>Year {y} {y === 2026 ? '(Ref)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label"><Layers size={14} style={{ display: 'inline', marginRight: 4 }} /> Domain:</span>
          <select 
            className="filter-select"
            value={selectedDomain}
            onChange={(e) => { setSelectedDomain(e.target.value); setPage(1); }}
          >
            <option value="all">All Domains (Side-by-Side)</option>
            <option value="combined">Combiner (Combined Risk)</option>
            <option value="water_quality">Water Quality Domain</option>
            <option value="agriculture">Agriculture Domain</option>
            <option value="health">Health Screening Domain</option>
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label"><Filter size={14} style={{ display: 'inline', marginRight: 4 }} /> Severity:</span>
          <select 
            className="filter-select"
            value={selectedRisk}
            onChange={(e) => { setSelectedRisk(e.target.value); setPage(1); }}
          >
            <option value="all">All Severities</option>
            <option value="Very High Vulnerability">Critical / Very High Vulnerability</option>
            <option value="High Vulnerability">High Vulnerability</option>
            <option value="Moderate Vulnerability">Moderate Vulnerability</option>
            <option value="Low Vulnerability">Low Vulnerability</option>
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Taluk:</span>
          <select 
            className="filter-select"
            value={selectedTaluk}
            onChange={(e) => { setSelectedTaluk(e.target.value); setPage(1); }}
          >
            <option value="all">All Taluks ({talukOptions.length})</option>
            {talukOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ flex: 1, minWidth: '150px' }}>
          <input 
            type="text"
            className="filter-input"
            placeholder="Search village or taluk..."
            value={searchVillage}
            onChange={(e) => { setSearchVillage(e.target.value); setPage(1); }}
            style={{ width: '100%' }}
          />
        </div>

        <ExportButton 
          data={filteredData.map(r => ({
            Taluk: r.Taluk,
            Village: r.Village,
            Year: r.Year,
            Combined_Vulnerability_Class: r.multiDomain.combined.class,
            Combined_Composite_Score: r.multiDomain.combined.score,
            Combined_Protective_Trigger: r.multiDomain.combined.reason,
            Water_Quality_Class: r.multiDomain.wq.class,
            Water_Quality_Reason: r.multiDomain.wq.reason,
            Agriculture_Class: r.multiDomain.agri.class,
            Agriculture_Suitability: r.multiDomain.agri.suitability,
            Health_Screening_Class: r.multiDomain.health.class,
            Health_Screening_Concern: r.multiDomain.health.concern,
            TDS_mg_L: r.TDS,
            TDS_Lower_CI: r.TDS_Lower_CI,
            TDS_Upper_CI: r.TDS_Upper_CI,
            EC_uS_cm: r.EC,
            EC_Lower_CI: r.EC_Lower_CI,
            EC_Upper_CI: r.EC_Upper_CI,
            Fluoride_mg_L: r.Fluoride,
            Fluoride_Lower_CI: r.Fluoride_Lower_CI,
            Fluoride_Upper_CI: r.Fluoride_Upper_CI,
            pH: r.pH,
            pH_Lower_CI: r.pH_Lower_CI,
            pH_Upper_CI: r.pH_Upper_CI,
            NO3_mg_L: r.NO3,
            Cl_mg_L: r.Cl,
            Ca_mg_L: r.Ca,
            Mg_mg_L: r.Mg,
            SAR: r.SAR,
            RSC: r.RSC,
            Na_percent: r['Na%'],
            Model_Selected: r.Model_Selected || 'Adaptive Ensemble'
          }))}
          filename={`madurai_multi_domain_forecast_${selectedYear}.csv`}
          label="Export Predictions CSV"
        />
      </div>

      {/* Deep-Dive Trajectory Visualization for Active Station */}
      {activeStation && activeAssessment && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp size={16} style={{ color: '#0f766e' }} />
                Longitudinal Station Trajectory: {activeStation.Village} ({activeStation.Taluk})
              </h3>
              <p className="card-subtitle">
                Adaptive Ensemble Model &bull; Empirical Bayes Residual Scaling &bull; Nominal 80% CI
              </p>
            </div>

            {/* 4 Multi-Domain Badges for Active Station */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              {/* Combiner Badge */}
              {(() => {
                const meta = getVulnerabilityMeta(activeAssessment.combined.class);
                return (
                  <span className={meta.badgeClass} title={`Combiner Score: ${activeAssessment.combined.score}/100`}>
                    🛡️ Combiner: {activeAssessment.combined.class.replace(' Vulnerability', '')}
                  </span>
                );
              })()}

              {/* Water Quality Badge */}
              {(() => {
                const meta = getVulnerabilityMeta(activeAssessment.wq.class);
                return (
                  <span className={meta.badgeClass} title={activeAssessment.wq.reason}>
                    💧 WQ: {activeAssessment.wq.class.replace(' Vulnerability', '')}
                  </span>
                );
              })()}

              {/* Agriculture Badge */}
              {(() => {
                const meta = getVulnerabilityMeta(activeAssessment.agri.class);
                return (
                  <span className={meta.badgeClass} title={activeAssessment.agri.reason}>
                    🌾 Agri: {activeAssessment.agri.class.replace(' Vulnerability', '')}
                    {activeAssessment.agri.isPartial && '*'}
                  </span>
                );
              })()}

              {/* Health Badge */}
              {(() => {
                const meta = getVulnerabilityMeta(activeAssessment.health.class);
                return (
                  <span className={meta.badgeClass} title={activeAssessment.health.concern}>
                    🩺 Health: {activeAssessment.health.class.replace(' Vulnerability', '')}
                    {activeAssessment.health.isPartial && '*'}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Chart Parameter Selector Strip */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '6px 0 10px 0',
            borderBottom: '1px solid var(--border-light)',
            marginBottom: '10px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Trajectory Parameter:
              </span>
              <select 
                className="filter-select"
                value={selectedParam}
                onChange={(e) => setSelectedParam(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '3px 8px' }}
              >
                <option value="TDS">TDS — Total Dissolved Solids (mg/L)</option>
                <option value="EC">EC — Electrical Conductivity (µS/cm)</option>
                <option value="Fluoride">Fluoride — Fluoride (mg/L)</option>
                <option value="pH">pH — Sorensen Scale</option>
                <option value="NO3">NO3 — Nitrate (mg/L)</option>
                <option value="Cl">Cl — Chloride (mg/L)</option>
                <option value="Ca">Ca — Calcium (mg/L)</option>
                <option value="Mg">Mg — Magnesium (mg/L)</option>
                <option value="SAR">SAR — Sodium Adsorption Ratio</option>
                <option value="RSC">RSC — Residual Sodium Carbonate (meq/L)</option>
                <option value="Na%">Na% — Soluble Sodium Percentage (%)</option>
              </select>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Desirable: <strong>{THRESHOLDS[selectedParam]?.desirable ?? '—'}</strong> &bull; Permissible: <strong>{THRESHOLDS[selectedParam]?.permissible ?? '—'}</strong> {THRESHOLDS[selectedParam]?.unit || ''}
            </div>
          </div>

          <div style={{ height: '280px', width: '100%' }}>
            <canvas ref={forecastChartRef}></canvas>
          </div>
        </div>
      )}

      {/* Multi-Domain Forecast Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ 
          padding: '14px 18px', 
          borderBottom: '1px solid var(--border-light)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TableIcon size={16} style={{ color: '#0f766e' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Multi-Domain Groundwater Forecasts ({selectedYear}) — {filteredData.length} Stations
            </h3>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('Village')}>Station / Village</th>
                <th className="sortable" onClick={() => handleSort('Taluk')}>Taluk</th>
                <th className="sortable" onClick={() => handleSort('Combined')}>Combiner Risk</th>
                <th className="sortable" onClick={() => handleSort('WaterQuality')}>Water Quality</th>
                <th className="sortable" onClick={() => handleSort('Agriculture')}>Agriculture</th>
                <th className="sortable" onClick={() => handleSort('Health')}>Health Screening</th>
                <th className="sortable" onClick={() => handleSort('TDS')}>TDS [80% CI]</th>
                <th className="sortable" onClick={() => handleSort('EC')}>EC [80% CI]</th>
                <th className="sortable" onClick={() => handleSort('Fluoride')}>Fluoride [80% CI]</th>
                <th className="sortable" onClick={() => handleSort('pH')}>pH [80% CI]</th>
                <th>Governing Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map((r, i) => {
                const isSelected = activeStation && activeStation.Village === r.Village;
                const ass = r.multiDomain;
                const cMeta = getVulnerabilityMeta(ass.combined.class);
                const wMeta = getVulnerabilityMeta(ass.wq.class);
                const aMeta = getVulnerabilityMeta(ass.agri.class);
                const hMeta = getVulnerabilityMeta(ass.health.class);

                return (
                  <tr 
                    key={`${r.Taluk}-${r.Village}-${i}`}
                    style={{ backgroundColor: isSelected ? 'rgba(15, 118, 110, 0.08)' : undefined, cursor: 'pointer' }}
                    onClick={() => setActiveStation(r)}
                  >
                    <td><strong>{r.Village}</strong></td>
                    <td>{r.Taluk}</td>

                    {/* Combiner Risk */}
                    <td>
                      <span className={cMeta.badgeClass} title={`Score: ${ass.combined.score}/100`}>
                        {ass.combined.class.replace(' Vulnerability', '')}
                      </span>
                    </td>

                    {/* Water Quality */}
                    <td>
                      <span className={wMeta.badgeClass} title={ass.wq.reason}>
                        {ass.wq.class.replace(' Vulnerability', '')}
                      </span>
                    </td>

                    {/* Agriculture */}
                    <td>
                      <span className={aMeta.badgeClass} title={ass.agri.reason}>
                        {ass.agri.class.replace(' Vulnerability', '')}
                        {ass.agri.isPartial && <span style={{ opacity: 0.75, marginLeft: 2 }}>*</span>}
                      </span>
                    </td>

                    {/* Health Screening */}
                    <td>
                      <span className={hMeta.badgeClass} title={ass.health.concern}>
                        {ass.health.class.replace(' Vulnerability', '')}
                        {ass.health.isPartial && <span style={{ opacity: 0.75, marginLeft: 2 }}>*</span>}
                      </span>
                    </td>

                    {/* TDS */}
                    <td>
                      {r.TDS?.toFixed(0)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>[{r.TDS_Lower_CI?.toFixed(0)}, {r.TDS_Upper_CI?.toFixed(0)}]</span>
                    </td>

                    {/* EC */}
                    <td>
                      {r.EC?.toFixed(0)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>[{r.EC_Lower_CI?.toFixed(0)}, {r.EC_Upper_CI?.toFixed(0)}]</span>
                    </td>

                    {/* Fluoride */}
                    <td>
                      {r.Fluoride?.toFixed(2)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>[{r.Fluoride_Lower_CI?.toFixed(2)}, {r.Fluoride_Upper_CI?.toFixed(2)}]</span>
                    </td>

                    {/* pH */}
                    <td>
                      {r.pH?.toFixed(2)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>[{r.pH_Lower_CI?.toFixed(2)}, {r.pH_Upper_CI?.toFixed(2)}]</span>
                    </td>

                    {/* Protective Reason */}
                    <td 
                      style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                      title={ass.combined.reason}
                    >
                      {ass.combined.reason}
                    </td>

                    {/* Action */}
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => { e.stopPropagation(); setActiveStation(r); }}
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No forecast predictions match the specified multi-domain filters.
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
              <option value={100}>100</option>
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
