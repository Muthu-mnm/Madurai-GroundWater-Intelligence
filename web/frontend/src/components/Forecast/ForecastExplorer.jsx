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
  Layers,
  BarChart2,
  MapPin,
  Maximize2
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

  // Visualization Mode: 'station' (Deep Dive), 'district' (Decadal 2022-2030), 'taluks' (Spatial Taluks)
  const [vizMode, setVizMode] = useState('station');
  const [decadalMetric, setDecadalMetric] = useState('percent'); // 'percent' | 'count'
  
  // Table Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('Village');
  const [sortDir, setSortDir] = useState('asc');

  // Selected station for deep-dive trajectory chart
  const [activeStation, setActiveStation] = useState(null);

  // Canvas Refs
  const stationChartRef = useRef(null);
  const decadalChartRef = useRef(null);
  const talukChartRef = useRef(null);

  // Chart Instances
  const stationChartInst = useRef(null);
  const decadalChartInst = useRef(null);
  const talukChartInst = useRef(null);

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

  // Decadal Multi-Domain Evolution (2022–2030) for the District
  const decadalDomainTrends = useMemo(() => {
    const years = [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
    return years.map(y => {
      const yRecs = forecastData.filter(d => d.Year === y);
      let combHigh = 0, wqHigh = 0, agriHigh = 0, healthHigh = 0;
      let total = yRecs.length || 1;

      yRecs.forEach(d => {
        const ass = evaluateMultiDomain(d);
        if (ass.combined.class === 'High Vulnerability' || ass.combined.class === 'Very High Vulnerability') combHigh++;
        if (ass.wq.class === 'High Vulnerability' || ass.wq.class === 'Very High Vulnerability') wqHigh++;
        if (ass.agri.class === 'High Vulnerability' || ass.agri.class === 'Very High Vulnerability') agriHigh++;
        if (ass.health.class === 'High Vulnerability' || ass.health.class === 'Very High Vulnerability') healthHigh++;
      });

      return {
        year: y,
        total: yRecs.length,
        combined: combHigh,
        combinedPct: +((combHigh / total) * 100).toFixed(1),
        wq: wqHigh,
        wqPct: +((wqHigh / total) * 100).toFixed(1),
        agri: agriHigh,
        agriPct: +((agriHigh / total) * 100).toFixed(1),
        health: healthHigh,
        healthPct: +((healthHigh / total) * 100).toFixed(1)
      };
    });
  }, [forecastData]);

  // Taluk Vulnerability Breakdown for the Selected Year
  const talukBreakdown = useMemo(() => {
    const map = {};
    evaluatedYearData.forEach(d => {
      const t = d.Taluk || 'Unknown';
      if (!map[t]) {
        map[t] = { total: 0, combinedHigh: 0, wqHigh: 0, agriHigh: 0, healthHigh: 0 };
      }
      map[t].total++;
      if (d.multiDomain.combined.class === 'High Vulnerability' || d.multiDomain.combined.class === 'Very High Vulnerability') map[t].combinedHigh++;
      if (d.multiDomain.wq.class === 'High Vulnerability' || d.multiDomain.wq.class === 'Very High Vulnerability') map[t].wqHigh++;
      if (d.multiDomain.agri.class === 'High Vulnerability' || d.multiDomain.agri.class === 'Very High Vulnerability') map[t].agriHigh++;
      if (d.multiDomain.health.class === 'High Vulnerability' || d.multiDomain.health.class === 'Very High Vulnerability') map[t].healthHigh++;
    });

    return Object.keys(map).sort().map(t => {
      const total = map[t].total || 1;
      return {
        taluk: t,
        total: map[t].total,
        combinedHigh: map[t].combinedHigh,
        combinedPct: +((map[t].combinedHigh / total) * 100).toFixed(1),
        wqHigh: map[t].wqHigh,
        wqPct: +((map[t].wqHigh / total) * 100).toFixed(1),
        agriHigh: map[t].agriHigh,
        agriPct: +((map[t].agriHigh / total) * 100).toFixed(1),
        healthHigh: map[t].healthHigh,
        healthPct: +((map[t].healthHigh / total) * 100).toFixed(1)
      };
    });
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

  // 1. Render Longitudinal Trend Chart for Active Station
  useEffect(() => {
    if (vizMode !== 'station' || !stationChartRef.current || !activeStation) return;
    if (stationChartInst.current) stationChartInst.current.destroy();

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

    const paramMeta = THRESHOLDS[selectedParam] || {};
    const hasDesirable = typeof paramMeta.desirable === 'number';
    const hasPermissible = typeof paramMeta.permissible === 'number';
    const isPh = selectedParam === 'pH';

    const desirableLine = [];
    const permissibleLine = [];

    for (let y = 2007; y <= 2030; y++) {
      labels.push(y.toString());

      // Historical vs Forecast
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

      // Benchmark Threshold Guidelines
      if (isPh) {
        desirableLine.push(6.5);
        permissibleLine.push(8.5);
      } else {
        desirableLine.push(hasDesirable ? paramMeta.desirable : null);
        permissibleLine.push(hasPermissible ? paramMeta.permissible : null);
      }
    }

    const unitStr = paramMeta.unit ? ` (${paramMeta.unit})` : '';

    const datasets = [
      {
        label: `Historical Observed${unitStr}`,
        data: histVals,
        borderColor: '#0f766e',
        backgroundColor: '#0f766e',
        borderWidth: 2.4,
        pointRadius: 4.5,
        pointHoverRadius: 6,
        tension: 0.15,
        order: 1
      },
      {
        label: `Adaptive Ensemble Forecast${unitStr}`,
        data: fcVals,
        borderColor: '#0284c7',
        backgroundColor: '#0284c7',
        borderWidth: 2.4,
        borderDash: [5, 4],
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.15,
        order: 2
      },
      {
        label: `Upper Prediction Bound (Nominal 80% CI)`,
        data: fcUpperVals,
        borderColor: 'rgba(2, 132, 199, 0.45)',
        backgroundColor: 'rgba(2, 132, 199, 0.12)',
        fill: '+1',
        borderWidth: 1.2,
        pointRadius: 0,
        order: 3
      },
      {
        label: `Lower Prediction Bound (Nominal 80% CI)`,
        data: fcLowerVals,
        borderColor: 'rgba(2, 132, 199, 0.45)',
        backgroundColor: 'transparent',
        fill: false,
        borderWidth: 1.2,
        pointRadius: 0,
        order: 4
      }
    ];

    // Add Desirable threshold reference line if applicable
    if (hasDesirable || isPh) {
      datasets.push({
        label: isPh ? 'Desirable Lower Limit (6.5)' : `Desirable Limit (${paramMeta.desirable}${unitStr})`,
        data: desirableLine,
        borderColor: '#10b981',
        borderWidth: 1.6,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        order: 99
      });
    }

    // Add Permissible threshold reference line if applicable
    if (hasPermissible || isPh) {
      datasets.push({
        label: isPh ? 'Desirable Upper Limit (8.5)' : `Permissible Limit (${paramMeta.permissible}${unitStr})`,
        data: permissibleLine,
        borderColor: '#ef4444',
        borderWidth: 1.6,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        order: 98
      });
    }

    const ctx = stationChartRef.current.getContext('2d');
    stationChartInst.current = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { size: 11, family: 'Inter', weight: 500 } }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleFont: { size: 12, weight: 700 },
            bodyFont: { size: 11 }
          }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: '#E2E8EC' },
            title: {
              display: true,
              text: `${paramMeta.name || selectedParam}${unitStr}`,
              font: { size: 11, family: 'Inter', weight: 600 }
            },
            ticks: { font: { family: 'Inter', size: 11 } }
          }
        }
      }
    });

    return () => {
      if (stationChartInst.current) stationChartInst.current.destroy();
    };
  }, [vizMode, activeStation, selectedParam, historicalData, forecastData]);

  // 2. Render Decadal Multi-Domain Evolution Chart (2022–2030)
  useEffect(() => {
    if (vizMode !== 'district' || !decadalChartRef.current) return;
    if (decadalChartInst.current) decadalChartInst.current.destroy();

    const labels = decadalDomainTrends.map(d => d.year.toString());
    const isPct = decadalMetric === 'percent';

    const combData = decadalDomainTrends.map(d => isPct ? d.combinedPct : d.combined);
    const wqData = decadalDomainTrends.map(d => isPct ? d.wqPct : d.wq);
    const agriData = decadalDomainTrends.map(d => isPct ? d.agriPct : d.agri);
    const healthData = decadalDomainTrends.map(d => isPct ? d.healthPct : d.health);

    const ctx = decadalChartRef.current.getContext('2d');
    decadalChartInst.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '🛡️ Combiner (High & Critical Risk)',
            data: combData,
            borderColor: '#0f766e',
            backgroundColor: 'rgba(15, 118, 110, 0.12)',
            borderWidth: 2.6,
            pointRadius: 4.5,
            fill: true,
            tension: 0.25
          },
          {
            label: '💧 Water Quality Exceedance',
            data: wqData,
            borderColor: '#0284c7',
            backgroundColor: 'transparent',
            borderWidth: 2.2,
            borderDash: [4, 4],
            pointRadius: 4,
            tension: 0.25
          },
          {
            label: '🌾 Agriculture Hazard (Salinity/Sodicity)',
            data: agriData,
            borderColor: '#16a34a',
            backgroundColor: 'transparent',
            borderWidth: 2.2,
            pointRadius: 4,
            tension: 0.25
          },
          {
            label: '🩺 Health Toxic Concern (Fluoride/Nitrate)',
            data: healthData,
            borderColor: '#dc2626',
            backgroundColor: 'transparent',
            borderWidth: 2.2,
            pointRadius: 4,
            tension: 0.25
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 14, font: { size: 11, family: 'Inter', weight: 600 } }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}${isPct ? '%' : ' stations'}`
            }
          }
        },
        scales: {
          x: { 
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: '#E2E8EC' },
            title: {
              display: true,
              text: isPct ? 'High / Very High Vulnerable Stations (%)' : 'Number of Vulnerable Stations',
              font: { size: 11, family: 'Inter', weight: 600 }
            },
            ticks: { font: { family: 'Inter', size: 11 } },
            suggestedMin: 0,
            suggestedMax: isPct ? 100 : 154
          }
        }
      }
    });

    return () => {
      if (decadalChartInst.current) decadalChartInst.current.destroy();
    };
  }, [vizMode, decadalDomainTrends, decadalMetric]);

  // 3. Render Taluk Vulnerability Comparison Bar Chart
  useEffect(() => {
    if (vizMode !== 'taluks' || !talukChartRef.current) return;
    if (talukChartInst.current) talukChartInst.current.destroy();

    const labels = talukBreakdown.map(t => t.taluk);
    const combData = talukBreakdown.map(t => t.combinedPct);
    const wqData = talukBreakdown.map(t => t.wqPct);
    const agriData = talukBreakdown.map(t => t.agriPct);
    const healthData = talukBreakdown.map(t => t.healthPct);

    const ctx = talukChartRef.current.getContext('2d');
    talukChartInst.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '🛡️ Combiner Risk (%)',
            data: combData,
            backgroundColor: '#0f766e',
            borderRadius: 4
          },
          {
            label: '💧 Water Quality Exceedance (%)',
            data: wqData,
            backgroundColor: '#0284c7',
            borderRadius: 4
          },
          {
            label: '🌾 Agriculture Hazard (%)',
            data: agriData,
            backgroundColor: '#16a34a',
            borderRadius: 4
          },
          {
            label: '🩺 Health Toxic Concern (%)',
            data: healthData,
            backgroundColor: '#dc2626',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { size: 11, family: 'Inter', weight: 600 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: { 
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: '#E2E8EC' },
            title: {
              display: true,
              text: 'Vulnerability Rate (%)',
              font: { size: 11, family: 'Inter', weight: 600 }
            },
            ticks: { font: { family: 'Inter', size: 11 } },
            suggestedMin: 0,
            suggestedMax: 100
          }
        }
      }
    });

    return () => {
      if (talukChartInst.current) talukChartInst.current.destroy();
    };
  }, [vizMode, talukBreakdown]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const activeAssessment = activeStation ? (activeStation.multiDomain || evaluateMultiDomain(activeStation)) : null;

  // Total count in year
  const totalStationsInYear = evaluatedYearData.length || 1;

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

      {/* 4 Core Domain Cards with Graphical Distribution Bars */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '12px',
        marginBottom: '14px' 
      }}>
        {/* Combiner Card */}
        {(() => {
          const vhigh = domainSummaries.combined['Very High Vulnerability'] || 0;
          const high = domainSummaries.combined['High Vulnerability'] || 0;
          const mod = domainSummaries.combined['Moderate Vulnerability'] || 0;
          const low = domainSummaries.combined['Low Vulnerability'] || 0;
          const pVhigh = (vhigh / totalStationsInYear) * 100;
          const pHigh = (high / totalStationsInYear) * 100;
          const pMod = (mod / totalStationsInYear) * 100;
          const pLow = (low / totalStationsInYear) * 100;

          return (
            <div 
              className="card"
              onClick={() => { setSelectedDomain(selectedDomain === 'combined' ? 'all' : 'combined'); setPage(1); }}
              style={{ 
                padding: '14px 16px', 
                borderLeft: '4px solid #0f766e',
                background: selectedDomain === 'combined' ? '#f0fdfa' : 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={16} style={{ color: '#0f766e' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Combiner Assessment</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0f766e', background: '#ccfbf1', padding: '1px 6px', borderRadius: '4px' }}>
                  Protective Engine
                </span>
              </div>

              {/* Graphical Proportional Distribution Bar */}
              <div style={{ display: 'flex', height: '7px', borderRadius: '4px', overflow: 'hidden', marginTop: '10px', background: '#e2e8f0' }}>
                <div style={{ width: `${pVhigh}%`, background: '#dc2626' }} title={`Critical: ${vhigh} (${pVhigh.toFixed(1)}%)`} />
                <div style={{ width: `${pHigh}%`, background: '#ea580c' }} title={`High: ${high} (${pHigh.toFixed(1)}%)`} />
                <div style={{ width: `${pMod}%`, background: '#d97706' }} title={`Moderate: ${mod} (${pMod.toFixed(1)}%)`} />
                <div style={{ width: `${pLow}%`, background: '#0d9488' }} title={`Low: ${low} (${pLow.toFixed(1)}%)`} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.72rem' }}>
                <span><strong style={{ color: '#dc2626' }}>{vhigh}</strong> Critical</span>
                <span><strong style={{ color: '#ea580c' }}>{high}</strong> High</span>
                <span><strong style={{ color: '#d97706' }}>{mod}</strong> Mod</span>
                <span><strong style={{ color: '#0d9488' }}>{low}</strong> Low</span>
              </div>
            </div>
          );
        })()}

        {/* Water Quality Domain Card */}
        {(() => {
          const vhigh = domainSummaries.wq['Very High Vulnerability'] || 0;
          const high = domainSummaries.wq['High Vulnerability'] || 0;
          const mod = domainSummaries.wq['Moderate Vulnerability'] || 0;
          const low = domainSummaries.wq['Low Vulnerability'] || 0;
          const pVhigh = (vhigh / totalStationsInYear) * 100;
          const pHigh = (high / totalStationsInYear) * 100;
          const pMod = (mod / totalStationsInYear) * 100;
          const pLow = (low / totalStationsInYear) * 100;

          return (
            <div 
              className="card"
              onClick={() => { setSelectedDomain(selectedDomain === 'water_quality' ? 'all' : 'water_quality'); setPage(1); }}
              style={{ 
                padding: '14px 16px', 
                borderLeft: '4px solid #0284c7',
                background: selectedDomain === 'water_quality' ? '#f0f9ff' : 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Droplet size={16} style={{ color: '#0284c7' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Water Quality</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                  BIS IS 10500
                </span>
              </div>

              {/* Graphical Proportional Distribution Bar */}
              <div style={{ display: 'flex', height: '7px', borderRadius: '4px', overflow: 'hidden', marginTop: '10px', background: '#e2e8f0' }}>
                <div style={{ width: `${pVhigh}%`, background: '#dc2626' }} title={`Extreme: ${vhigh} (${pVhigh.toFixed(1)}%)`} />
                <div style={{ width: `${pHigh}%`, background: '#ea580c' }} title={`Exceedance: ${high} (${pHigh.toFixed(1)}%)`} />
                <div style={{ width: `${pMod}%`, background: '#d97706' }} title={`Permissible: ${mod} (${pMod.toFixed(1)}%)`} />
                <div style={{ width: `${pLow}%`, background: '#0d9488' }} title={`Compliant: ${low} (${pLow.toFixed(1)}%)`} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.72rem' }}>
                <span><strong style={{ color: '#dc2626' }}>{vhigh}</strong> Extreme</span>
                <span><strong style={{ color: '#ea580c' }}>{high}</strong> Exceed</span>
                <span><strong style={{ color: '#d97706' }}>{mod}</strong> Relax</span>
                <span><strong style={{ color: '#0d9488' }}>{low}</strong> Safe</span>
              </div>
            </div>
          );
        })()}

        {/* Agriculture Domain Card */}
        {(() => {
          const vhigh = domainSummaries.agri['Very High Vulnerability'] || 0;
          const high = domainSummaries.agri['High Vulnerability'] || 0;
          const mod = domainSummaries.agri['Moderate Vulnerability'] || 0;
          const low = domainSummaries.agri['Low Vulnerability'] || 0;
          const pVhigh = (vhigh / totalStationsInYear) * 100;
          const pHigh = (high / totalStationsInYear) * 100;
          const pMod = (mod / totalStationsInYear) * 100;
          const pLow = (low / totalStationsInYear) * 100;

          return (
            <div 
              className="card"
              onClick={() => { setSelectedDomain(selectedDomain === 'agriculture' ? 'all' : 'agriculture'); setPage(1); }}
              style={{ 
                padding: '14px 16px', 
                borderLeft: '4px solid #16a34a',
                background: selectedDomain === 'agriculture' ? '#f0fdf4' : 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wheat size={16} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Agriculture Screening</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                  FAO / Richards
                </span>
              </div>

              {/* Graphical Proportional Distribution Bar */}
              <div style={{ display: 'flex', height: '7px', borderRadius: '4px', overflow: 'hidden', marginTop: '10px', background: '#e2e8f0' }}>
                <div style={{ width: `${pVhigh}%`, background: '#dc2626' }} title={`Unsuitable: ${vhigh} (${pVhigh.toFixed(1)}%)`} />
                <div style={{ width: `${pHigh}%`, background: '#ea580c' }} title={`Severe Restriction: ${high} (${pHigh.toFixed(1)}%)`} />
                <div style={{ width: `${pMod}%`, background: '#d97706' }} title={`Moderate: ${mod} (${pMod.toFixed(1)}%)`} />
                <div style={{ width: `${pLow}%`, background: '#0d9488' }} title={`Suitable: ${low} (${pLow.toFixed(1)}%)`} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.72rem' }}>
                <span><strong style={{ color: '#dc2626' }}>{vhigh}</strong> Unsuit</span>
                <span><strong style={{ color: '#ea580c' }}>{high}</strong> Restrict</span>
                <span><strong style={{ color: '#d97706' }}>{mod}</strong> Mod</span>
                <span><strong style={{ color: '#0d9488' }}>{low}</strong> Suitable</span>
              </div>
            </div>
          );
        })()}

        {/* Health Screening Domain Card */}
        {(() => {
          const vhigh = domainSummaries.health['Very High Vulnerability'] || 0;
          const high = domainSummaries.health['High Vulnerability'] || 0;
          const mod = domainSummaries.health['Moderate Vulnerability'] || 0;
          const low = domainSummaries.health['Low Vulnerability'] || 0;
          const pVhigh = (vhigh / totalStationsInYear) * 100;
          const pHigh = (high / totalStationsInYear) * 100;
          const pMod = (mod / totalStationsInYear) * 100;
          const pLow = (low / totalStationsInYear) * 100;

          return (
            <div 
              className="card"
              onClick={() => { setSelectedDomain(selectedDomain === 'health' ? 'all' : 'health'); setPage(1); }}
              style={{ 
                padding: '14px 16px', 
                borderLeft: '4px solid #dc2626',
                background: selectedDomain === 'health' ? '#fef2f2' : 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HeartPulse size={16} style={{ color: '#dc2626' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Health Screening</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                  WHO Guidelines
                </span>
              </div>

              {/* Graphical Proportional Distribution Bar */}
              <div style={{ display: 'flex', height: '7px', borderRadius: '4px', overflow: 'hidden', marginTop: '10px', background: '#e2e8f0' }}>
                <div style={{ width: `${pVhigh}%`, background: '#dc2626' }} title={`Toxic Hazard: ${vhigh} (${pVhigh.toFixed(1)}%)`} />
                <div style={{ width: `${pHigh}%`, background: '#ea580c' }} title={`Fluorosis / Nitrate Risk: ${high} (${pHigh.toFixed(1)}%)`} />
                <div style={{ width: `${pMod}%`, background: '#d97706' }} title={`Permissible: ${mod} (${pMod.toFixed(1)}%)`} />
                <div style={{ width: `${pLow}%`, background: '#0d9488' }} title={`Safe: ${low} (${pLow.toFixed(1)}%)`} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.72rem' }}>
                <span><strong style={{ color: '#dc2626' }}>{vhigh}</strong> Toxic</span>
                <span><strong style={{ color: '#ea580c' }}>{high}</strong> Fluorosis</span>
                <span><strong style={{ color: '#d97706' }}>{mod}</strong> Relax</span>
                <span><strong style={{ color: '#0d9488' }}>{low}</strong> Safe</span>
              </div>
            </div>
          );
        })()}
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

      {/* Dynamic Visualizations Panel */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        {/* Visual Mode Navigation Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid var(--border-light)', 
          paddingBottom: '12px',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Analytics Visualization:
            </span>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-muted)', padding: '3px', borderRadius: '6px' }}>
              <button 
                className={`btn btn-sm ${vizMode === 'station' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setVizMode('station')}
                style={{ fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <TrendingUp size={14} /> Station Trajectory
              </button>
              <button 
                className={`btn btn-sm ${vizMode === 'district' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setVizMode('district')}
                style={{ fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Layers size={14} /> Decadal Trends (2022–2030)
              </button>
              <button 
                className={`btn btn-sm ${vizMode === 'taluks' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setVizMode('taluks')}
                style={{ fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <BarChart2 size={14} /> Taluk Vulnerability
              </button>
            </div>
          </div>

          {/* Sub-controls depending on visual mode */}
          {vizMode === 'station' && activeStation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Parameter:
              </span>
              <select 
                className="filter-select"
                value={selectedParam}
                onChange={(e) => setSelectedParam(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '3px 8px', fontWeight: 600 }}
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
          )}

          {vizMode === 'district' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Metric:</span>
              <button 
                className={`btn btn-sm ${decadalMetric === 'percent' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setDecadalMetric('percent')}
                style={{ fontSize: '0.74rem', padding: '2px 8px' }}
              >
                Vulnerability Rate (%)
              </button>
              <button 
                className={`btn btn-sm ${decadalMetric === 'count' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setDecadalMetric('count')}
                style={{ fontSize: '0.74rem', padding: '2px 8px' }}
              >
                Station Count
              </button>
            </div>
          )}

          {vizMode === 'taluks' && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Horizon Year: <strong>{selectedYear}</strong> across 8 Taluks
            </div>
          )}
        </div>

        {/* View 1: Station Trajectory Deep-Dive with Multi-Domain Intelligence Panel */}
        {vizMode === 'station' && activeStation && activeAssessment && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '18px' }}>
            {/* Left: Chart.js Canvas with Threshold Reference Lines */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} style={{ color: '#0f766e' }} />
                    {activeStation.Village} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({activeStation.Taluk})</span>
                  </h4>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Historical (2007–2021) observed vs Adaptive Ensemble (2022–2030) calibrated with nominal 80% CI
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Desirable: <strong style={{ color: '#10b981' }}>{THRESHOLDS[selectedParam]?.desirable ?? '—'}</strong> | Permissible: <strong style={{ color: '#ef4444' }}>{THRESHOLDS[selectedParam]?.permissible ?? '—'}</strong> {THRESHOLDS[selectedParam]?.unit || ''}
                </div>
              </div>

              <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                <canvas ref={stationChartRef}></canvas>
              </div>
            </div>

            {/* Right: Station Multi-Domain Command Card */}
            <div style={{ 
              background: 'var(--bg-muted)', 
              borderRadius: '8px', 
              padding: '14px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px',
              border: '1px solid var(--border-light)' 
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                Multi-Domain Risk Evaluation ({selectedYear})
              </div>

              {/* Combiner Card */}
              {(() => {
                const meta = getVulnerabilityMeta(activeAssessment.combined.class);
                return (
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: '6px', borderLeft: `3px solid ${meta.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>🛡️ Combiner</span>
                      <span className={meta.badgeClass} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {activeAssessment.combined.class.replace(' Vulnerability', '')}
                      </span>
                    </div>
                    {/* Score Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${activeAssessment.combined.score}%`, background: meta.color, height: '100%' }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: meta.color }}>
                        {activeAssessment.combined.score}/100
                      </span>
                    </div>
                    <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                      {activeAssessment.combined.reason}
                    </div>
                  </div>
                );
              })()}

              {/* Water Quality Card */}
              {(() => {
                const meta = getVulnerabilityMeta(activeAssessment.wq.class);
                return (
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: '6px', borderLeft: `3px solid ${meta.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>💧 Water Quality</span>
                      <span className={meta.badgeClass} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {activeAssessment.wq.class.replace(' Vulnerability', '')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      TDS: <strong>{activeStation.TDS?.toFixed(0)}</strong> &bull; EC: <strong>{activeStation.EC?.toFixed(0)}</strong> &bull; F: <strong>{activeStation.Fluoride?.toFixed(2)}</strong> &bull; pH: <strong>{activeStation.pH?.toFixed(2)}</strong>
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {activeAssessment.wq.reason}
                    </div>
                  </div>
                );
              })()}

              {/* Agriculture Card */}
              {(() => {
                const meta = getVulnerabilityMeta(activeAssessment.agri.class);
                return (
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: '6px', borderLeft: `3px solid ${meta.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>🌾 Agriculture</span>
                      <span className={meta.badgeClass} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {activeAssessment.agri.class.replace(' Vulnerability', '')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {activeAssessment.agri.suitability || 'Suitability evaluated'}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {activeAssessment.agri.reason}
                    </div>
                  </div>
                );
              })()}

              {/* Health Card */}
              {(() => {
                const meta = getVulnerabilityMeta(activeAssessment.health.class);
                return (
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: '6px', borderLeft: `3px solid ${meta.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>🩺 Health Screening</span>
                      <span className={meta.badgeClass} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {activeAssessment.health.class.replace(' Vulnerability', '')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                      {activeAssessment.health.concern || activeAssessment.health.reason}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* View 2: Decadal Multi-Domain Evolution (2022–2030) */}
        {vizMode === 'district' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Decadal Vulnerability Trajectory Across Madurai District (2022–2030)
                </h4>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Progression of High &amp; Critical vulnerability stations across the 4 core domains over the entire 9-year horizon.
                </div>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#0f766e', fontWeight: 600 }}>
                154 Stations Monitored
              </div>
            </div>

            <div style={{ height: '320px', width: '100%' }}>
              <canvas ref={decadalChartRef}></canvas>
            </div>
          </div>
        )}

        {/* View 3: Taluk Vulnerability Comparison */}
        {vizMode === 'taluks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Spatial Taluk Vulnerability Distribution ({selectedYear})
                </h4>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Comparative percentage of stations breaching safety limits across the 8 taluks of Madurai.
                </div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Click table rows below to inspect individual stations
              </div>
            </div>

            <div style={{ height: '320px', width: '100%' }}>
              <canvas ref={talukChartRef}></canvas>
            </div>
          </div>
        )}
      </div>

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
                    onClick={() => { setActiveStation(r); setVizMode('station'); }}
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
                        onClick={(e) => { e.stopPropagation(); setActiveStation(r); setVizMode('station'); }}
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
