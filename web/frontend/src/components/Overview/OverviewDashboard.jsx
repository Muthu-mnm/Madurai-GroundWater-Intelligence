import React, { useState, useMemo, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import KpiCard from '../Common/KpiCard';
import DisclaimerBanner from '../Common/DisclaimerBanner';
import { THRESHOLDS, RISK_COLORS } from '../../utils/thresholds';
import { BarChart3, TrendingUp, ShieldCheck, MapPin, Layers, Calendar, Filter, Sparkles } from 'lucide-react';

export default function OverviewDashboard({ 
  historicalData = [], 
  forecastData = [], 
  metadata = {}, 
  onNavigateToMap,
  onNavigateToPredict
}) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedParam, setSelectedParam] = useState('TDS');

  const histChartRef = useRef(null);
  const riskChartRef = useRef(null);
  const talukChartRef = useRef(null);
  
  const histChartInst = useRef(null);
  const riskChartInst = useRef(null);
  const talukChartInst = useRef(null);

  // Dynamic Statistics
  const stats = useMemo(() => {
    const totalWells = 166;
    const uniqueVillages = 154;
    const taluksCount = 7;
    const totalHist = historicalData.length;
    const totalFc = forecastData.length;

    // Filter forecasts for selected year
    const yearFc = forecastData.filter(d => d.Year === selectedYear);
    const riskCounts = {
      'High Risk': 0,
      'Medium Risk (Borderline)': 0,
      'Medium Risk (Permissible)': 0,
      'Low Risk': 0,
      'Insufficient Data': 0
    };

    const suitabilityCounts = {
      'Drinkable': 0,
      'Required Boiling': 0,
      'Not Drinkable': 0
    };

    yearFc.forEach(d => {
      const r = d.Risk_Level || 'Insufficient Data';
      riskCounts[r] = (riskCounts[r] || 0) + 1;

      const s = d.Drinking_Suitability || (r === 'Low Risk' ? 'Drinkable' : r === 'High Risk' ? 'Not Drinkable' : 'Required Boiling');
      if (suitabilityCounts[s] !== undefined) suitabilityCounts[s]++;
    });

    const yearTotal = yearFc.length || 1;
    const riskPercentages = {
      'High Risk': ((riskCounts['High Risk'] / yearTotal) * 100).toFixed(1),
      'Medium Risk (Borderline)': ((riskCounts['Medium Risk (Borderline)'] / yearTotal) * 100).toFixed(1),
      'Medium Risk (Permissible)': ((riskCounts['Medium Risk (Permissible)'] / yearTotal) * 100).toFixed(1),
      'Low Risk': ((riskCounts['Low Risk'] / yearTotal) * 100).toFixed(1),
    };

    const suitabilityPercentages = {
      'Drinkable': ((suitabilityCounts['Drinkable'] / yearTotal) * 100).toFixed(1),
      'Required Boiling': ((suitabilityCounts['Required Boiling'] / yearTotal) * 100).toFixed(1),
      'Not Drinkable': ((suitabilityCounts['Not Drinkable'] / yearTotal) * 100).toFixed(1),
    };

    return {
      totalWells,
      uniqueVillages,
      taluksCount,
      totalHist,
      totalFc,
      yearFcCount: yearFc.length,
      riskCounts,
      riskPercentages,
      suitabilityCounts,
      suitabilityPercentages
    };
  }, [historicalData, forecastData, selectedYear]);

  // Render Historical Trend Chart
  useEffect(() => {
    if (!histChartRef.current || !historicalData.length) return;

    // Aggregate historical annual means
    const annualHist = {};
    for (let y = 2007; y <= 2021; y++) {
      annualHist[y] = { sum: 0, count: 0 };
    }
    historicalData.forEach(d => {
      const y = d.Year;
      const v = d[selectedParam];
      if (annualHist[y] && typeof v === 'number' && !isNaN(v)) {
        annualHist[y].sum += v;
        annualHist[y].count += 1;
      }
    });

    // Aggregate forecast annual means
    const annualFc = {};
    for (let y = 2022; y <= 2030; y++) {
      annualFc[y] = { sum: 0, sumLower: 0, sumUpper: 0, count: 0 };
    }
    forecastData.forEach(d => {
      const y = d.Year;
      const v = d[selectedParam];
      const low = d[`${selectedParam}_Lower_CI`];
      const up = d[`${selectedParam}_Upper_CI`];
      if (annualFc[y] && typeof v === 'number' && !isNaN(v)) {
        annualFc[y].sum += v;
        annualFc[y].sumLower += (typeof low === 'number' ? low : v);
        annualFc[y].sumUpper += (typeof up === 'number' ? up : v);
        annualFc[y].count += 1;
      }
    });

    const labels = [];
    const histValues = [];
    const fcValues = [];
    const fcUpper = [];
    const fcLower = [];

    for (let y = 2007; y <= 2030; y++) {
      labels.push(y.toString());
      if (y <= 2021) {
        const item = annualHist[y];
        histValues.push(item && item.count ? +(item.sum / item.count).toFixed(2) : null);
        fcValues.push(null);
        fcUpper.push(null);
        fcLower.push(null);
      } else {
        histValues.push(null);
        const item = annualFc[y];
        fcValues.push(item && item.count ? +(item.sum / item.count).toFixed(2) : null);
        fcUpper.push(item && item.count ? +(item.sumUpper / item.count).toFixed(2) : null);
        fcLower.push(item && item.count ? +(item.sumLower / item.count).toFixed(2) : null);
      }
    }

    if (histChartInst.current) {
      histChartInst.current.destroy();
    }

    const ctx = histChartRef.current.getContext('2d');
    histChartInst.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Historical Observed Mean (${THRESHOLDS[selectedParam]?.unit || ''})`,
            data: histValues,
            borderColor: '#176B70',
            backgroundColor: '#176B70',
            borderWidth: 2.5,
            pointRadius: 3,
            tension: 0.2
          },
          {
            label: `Forecast Point Prediction (${THRESHOLDS[selectedParam]?.unit || ''})`,
            data: fcValues,
            borderColor: '#397A9B',
            backgroundColor: '#397A9B',
            borderWidth: 2.5,
            borderDash: [5, 5],
            pointRadius: 3,
            tension: 0.2
          },
          {
            label: `Upper Prediction Bound (Nominal 80% CI)`,
            data: fcUpper,
            borderColor: 'rgba(57, 122, 155, 0.4)',
            backgroundColor: 'rgba(57, 122, 155, 0.12)',
            fill: '+1',
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.2
          },
          {
            label: `Lower Prediction Bound (Nominal 80% CI)`,
            data: fcLower,
            borderColor: 'rgba(57, 122, 155, 0.4)',
            backgroundColor: 'transparent',
            fill: false,
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.2
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
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, family: 'Inter' } }
          },
          y: {
            grid: { color: '#E2E8EC' },
            ticks: { font: { size: 11, family: 'Inter' } },
            title: {
              display: true,
              text: `${selectedParam} (${THRESHOLDS[selectedParam]?.unit || ''})`,
              font: { size: 12, weight: 'bold', family: 'Inter' }
            }
          }
        }
      }
    });

    return () => {
      if (histChartInst.current) histChartInst.current.destroy();
    };
  }, [historicalData, forecastData, selectedParam]);

  // Render Risk Distribution Chart
  useEffect(() => {
    if (!riskChartRef.current) return;

    if (riskChartInst.current) {
      riskChartInst.current.destroy();
    }

    const categories = ['High Risk', 'Medium Risk (Borderline)', 'Medium Risk (Permissible)', 'Low Risk'];
    const counts = categories.map(c => stats.riskCounts[c] || 0);
    const bgColors = categories.map(c => RISK_COLORS[c].color);

    const ctx = riskChartRef.current.getContext('2d');
    riskChartInst.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: counts,
          backgroundColor: bgColors,
          borderWidth: 1,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 11, family: 'Inter' } }
          }
        }
      }
    });

    return () => {
      if (riskChartInst.current) riskChartInst.current.destroy();
    };
  }, [stats]);

  // Render Taluk Comparison Chart
  useEffect(() => {
    if (!talukChartRef.current || !forecastData.length) return;

    if (talukChartInst.current) {
      talukChartInst.current.destroy();
    }

    const taluks = ['Madurai North', 'Madurai South', 'Melur', 'Peraiyur', 'Thirumangalam', 'Usilampatti', 'Vadipatti'];
    const yearFc = forecastData.filter(d => d.Year === selectedYear);

    const talukMeans = taluks.map(t => {
      const items = yearFc.filter(d => d.Taluk && d.Taluk.toLowerCase() === t.toLowerCase());
      if (!items.length) return 0;
      const sum = items.reduce((acc, curr) => acc + (curr[selectedParam] || 0), 0);
      return +(sum / items.length).toFixed(1);
    });

    const ctx = talukChartRef.current.getContext('2d');
    talukChartInst.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: taluks,
        datasets: [{
          label: `${selectedParam} Mean in ${selectedYear} (${THRESHOLDS[selectedParam]?.unit || ''})`,
          data: talukMeans,
          backgroundColor: 'rgba(23, 107, 112, 0.85)',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, family: 'Inter' } }
          },
          y: {
            grid: { color: '#E2E8EC' },
            ticks: { font: { size: 11, family: 'Inter' } },
            title: {
              display: true,
              text: `${selectedParam} (${THRESHOLDS[selectedParam]?.unit || ''})`,
              font: { size: 11, family: 'Inter' }
            }
          }
        }
      }
    });

    return () => {
      if (talukChartInst.current) talukChartInst.current.destroy();
    };
  }, [forecastData, selectedYear, selectedParam]);

  return (
    <div className="content-workspace">
      {/* Top Banner */}
      <DisclaimerBanner />

      {/* Prediction Simulator Quick Banner */}
      {onNavigateToPredict && (
        <div style={{
          backgroundColor: 'rgba(23, 107, 112, 0.08)',
          border: '1.5px solid rgba(23, 107, 112, 0.22)',
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
            <div style={{ backgroundColor: 'var(--accent-primary)', color: '#fff', padding: '6px', borderRadius: '6px' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                New Interactive Feature: Prediction Simulator
              </span>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Directly provide chemical parameters (TDS, EC, Fluoride, pH), adjust climate scenarios, and calculate forward potability (Drinkable, Boiling, Not Drinkable).
              </p>
            </div>
          </div>
          <button 
            className="btn btn-primary btn-sm"
            onClick={onNavigateToPredict}
            style={{ fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Launch Prediction Simulator →
          </button>
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="kpi-grid">
        <KpiCard 
          label={`Drinkable (${selectedYear})`} 
          value={`${stats.suitabilityCounts['Drinkable']} stations`} 
          meta={`${stats.suitabilityPercentages['Drinkable']}% safe directly (BIS Desirable)`} 
          variant="drinkable" 
        />
        <KpiCard 
          label={`Required Boiling (${selectedYear})`} 
          value={`${stats.suitabilityCounts['Required Boiling']} stations`} 
          meta={`${stats.suitabilityPercentages['Required Boiling']}% boiling & filtration required`} 
          variant="boiling" 
        />
        <KpiCard 
          label={`Not Drinkable (${selectedYear})`} 
          value={`${stats.suitabilityCounts['Not Drinkable']} stations`} 
          meta={`${stats.suitabilityPercentages['Not Drinkable']}% exceeds limits; RO needed`} 
          variant="not-drinkable" 
        />
        <KpiCard 
          label="Monitoring Wells" 
          value={stats.totalWells} 
          meta="154 Unique Villages" 
        />
        <KpiCard 
          label="Administrative Taluks" 
          value={stats.taluksCount} 
          meta="Full Madurai District" 
        />
        <KpiCard 
          label="Historical Records" 
          value={stats.totalHist.toLocaleString()} 
          meta="2007–2021 (15 Years)" 
        />
        <KpiCard 
          label="Forecast Horizon" 
          value={stats.totalFc.toLocaleString()} 
          meta="2022–2030 (9 Horizons)" 
        />
        <KpiCard 
          label={`Low Risk Tier (${selectedYear})`} 
          value={`${stats.riskCounts['Low Risk']} stations`} 
          meta={`${stats.riskPercentages['Low Risk']}% strictly compliant`} 
          variant="low-risk" 
        />
      </div>

      {/* Parameter & Year Filter Bar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <span className="filter-label"><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Forecast Year:</span>
          <select 
            className="filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <option key={y} value={y}>Year {y} {y === 2026 ? '(Standard Reference Horizon)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label"><Filter size={14} style={{ display: 'inline', marginRight: 4 }} /> Target Parameter:</span>
          <select 
            className="filter-select"
            value={selectedParam}
            onChange={(e) => setSelectedParam(e.target.value)}
          >
            <option value="TDS">TDS — Total Dissolved Solids (mg/L)</option>
            <option value="EC">EC — Electrical Conductivity (µS/cm)</option>
            <option value="Fluoride">Fluoride — Fluoride Content (mg/L)</option>
            <option value="pH">pH — Hydrogen Ion Activity (dimensionless)</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary btn-sm" onClick={onNavigateToMap}>
            <MapPin size={14} />
            <span>Open in GIS Map Viewport</span>
          </button>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Longitudinal History + Forecast Trajectory */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp size={16} style={{ color: 'var(--accent-primary)' }} />
                Longitudinal Trajectory &amp; Empirical Uncertainty Band (2007–2030)
              </h3>
              <p className="card-subtitle">
                Solid line shows historical baseline observations (2007–2021). Dashed line shows Adaptive Ensemble extrapolation with 80% nominal prediction interval band.
              </p>
            </div>
          </div>
          <div style={{ height: '320px', width: '100%' }}>
            <canvas ref={histChartRef}></canvas>
          </div>
        </div>

        {/* Risk Distribution for Selected Year */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <ShieldCheck size={16} style={{ color: 'var(--accent-primary)' }} />
                Risk Classification ({selectedYear})
              </h3>
              <p className="card-subtitle">
                Evaluated under BIS 10500:2012 acceptable/permissible limits.
              </p>
            </div>
          </div>
          <div style={{ height: '320px', width: '100%' }}>
            <canvas ref={riskChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Taluk-wise Comparison Grid */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <BarChart3 size={16} style={{ color: 'var(--accent-primary)' }} />
              Taluk-Wise Mean {selectedParam} Comparison in {selectedYear}
            </h3>
            <p className="card-subtitle">
              Spatial cross-comparison across Madurai's 7 administrative taluks based on station-weighted village projections.
            </p>
          </div>
        </div>
        <div style={{ height: '240px', width: '100%' }}>
          <canvas ref={talukChartRef}></canvas>
        </div>
      </div>
    </div>
  );
}
