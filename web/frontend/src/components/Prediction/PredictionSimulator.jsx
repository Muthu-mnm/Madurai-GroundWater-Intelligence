import React, { useState, useMemo, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { 
  THRESHOLDS, 
  RISK_COLORS, 
  DRINKING_SUITABILITY, 
  PREDICTION_PRESETS, 
  SCENARIO_OPTIONS,
  simulatePrediction 
} from '../../utils/thresholds';
import ExportButton from '../Common/ExportButton';
import { 
  Sparkles, 
  RefreshCw, 
  Flame, 
  Sliders, 
  Calendar, 
  MapPin, 
  TrendingUp,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function PredictionSimulator({ 
  historicalData = [], 
  forecastData = [],
  onNavigateToMap
}) {
  // Input Modes: 'preset', 'station', 'custom'
  const [inputMode, setInputMode] = useState('preset');
  const [selectedPresetId, setSelectedPresetId] = useState('safe_desirable');

  // Station prefill selectors
  const [selectedTaluk, setSelectedTaluk] = useState('all');
  const [selectedStationName, setSelectedStationName] = useState('');

  // Target Year (2022 to 2035)
  const [targetYear, setTargetYear] = useState(2026);

  // Baseline hydrochemical parameter inputs
  const [tdsInput, setTdsInput] = useState(360);
  const [ecInput, setEcInput] = useState(550);
  const [fluorideInput, setFluorideInput] = useState(0.65);
  const [phInput, setPhInput] = useState(7.20);

  // Environmental Stress / Climate Scenario
  const [selectedScenario, setSelectedScenario] = useState('normal');

  // Chart param selector for multi-year trajectory
  const [chartParam, setChartParam] = useState('TDS');

  // Chart canvas ref
  const trajectoryChartRef = useRef(null);
  const trajectoryChartInst = useRef(null);

  // Extract unique taluks and stations from historical dataset
  const talukList = useMemo(() => {
    const set = new Set();
    historicalData.forEach(d => { if (d.Taluk) set.add(d.Taluk); });
    return Array.from(set).sort();
  }, [historicalData]);

  const stationList = useMemo(() => {
    const map = new Map();
    historicalData.forEach(d => {
      if (!d.Village) return;
      if (selectedTaluk !== 'all' && d.Taluk && d.Taluk.toLowerCase() !== selectedTaluk.toLowerCase()) return;
      const key = `${d.Taluk || 'Unknown'} - ${d.Village}`;
      if (!map.has(key)) {
        map.set(key, { taluk: d.Taluk, village: d.Village });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.village.localeCompare(b.village));
  }, [historicalData, selectedTaluk]);

  // Load baseline values when a station is selected
  const handleSelectStation = (stName) => {
    setSelectedStationName(stName);
    if (!stName) return;

    const stRecords = historicalData
      .filter(d => d.Village && d.Village.toLowerCase() === stName.toLowerCase())
      .sort((a, b) => b.Year - a.Year);

    if (stRecords.length > 0) {
      const latest = stRecords[0];
      if (latest.TDS != null) setTdsInput(Math.round(latest.TDS));
      if (latest.EC != null) setEcInput(Math.round(latest.EC));
      if (latest.Fluoride != null) setFluorideInput(parseFloat(latest.Fluoride.toFixed(2)));
      if (latest.pH != null) setPhInput(parseFloat(latest.pH.toFixed(2)));
    }
  };

  // Apply quick preset
  const handleApplyPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setTdsInput(preset.tds);
    setEcInput(preset.ec);
    setFluorideInput(preset.fluoride);
    setPhInput(preset.ph);
    if (preset.scenario) setSelectedScenario(preset.scenario);
  };

  // Run simulation prediction
  const simulationResult = useMemo(() => {
    return simulatePrediction({
      targetYear,
      tds: tdsInput,
      ec: ecInput,
      fluoride: fluorideInput,
      ph: phInput,
      scenario: selectedScenario
    });
  }, [targetYear, tdsInput, ecInput, fluorideInput, phInput, selectedScenario]);

  // Reset inputs
  const handleReset = () => {
    handleApplyPreset(PREDICTION_PRESETS[0]);
    setTargetYear(2026);
    setSelectedStationName('');
  };

  // Render Multi-Year Trajectory Line Chart
  useEffect(() => {
    if (!trajectoryChartRef.current || !simulationResult) return;
    if (trajectoryChartInst.current) {
      trajectoryChartInst.current.destroy();
    }

    const traj = simulationResult.trajectory || [];
    const labels = traj.map(d => d.Year);
    const points = traj.map(d => d[chartParam]);
    const lowerCI = traj.map(d => d[`${chartParam}_Lower_CI`]);
    const upperCI = traj.map(d => d[`${chartParam}_Upper_CI`]);
    const unit = THRESHOLDS[chartParam]?.unit || '';

    const ctx = trajectoryChartRef.current.getContext('2d');
    trajectoryChartInst.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '80% Upper Bound',
            data: upperCI,
            borderColor: 'rgba(15, 118, 110, 0.25)',
            borderDash: [4, 4],
            backgroundColor: 'transparent',
            pointRadius: 0,
            fill: '+1'
          },
          {
            label: '80% Lower Bound',
            data: lowerCI,
            borderColor: 'rgba(15, 118, 110, 0.25)',
            borderDash: [4, 4],
            backgroundColor: 'rgba(15, 118, 110, 0.08)',
            pointRadius: 0,
            fill: false
          },
          {
            label: `Forecast Point (${chartParam})`,
            data: points,
            borderColor: '#0f766e',
            backgroundColor: '#0f766e',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.15
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 10, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.formattedValue} ${unit}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: chartParam !== 'pH',
            min: chartParam === 'pH' ? 5.0 : undefined,
            max: chartParam === 'pH' ? 10.0 : undefined,
            title: { display: true, text: `${chartParam} (${unit})`, font: { size: 10 } },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          }
        }
      }
    });

    return () => {
      if (trajectoryChartInst.current) trajectoryChartInst.current.destroy();
    };
  }, [simulationResult, chartParam]);

  const fc = simulationResult.forecast;
  const pot = simulationResult.potability;
  const riskColor = RISK_COLORS[fc.Risk_Level] || RISK_COLORS['Insufficient Data'];

  return (
    <div className="content-workspace">
      {/* Header */}
      <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #0f766e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Prediction &amp; Scenario Simulator
            </h1>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Simulate future water quality, 80% uncertainty bounds, and potability across custom inputs and climate scenarios.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleReset}
              title="Reset to default inputs"
            >
              <RefreshCw size={13} style={{ marginRight: '4px' }} />
              Reset
            </button>
            <ExportButton 
              data={[fc]} 
              filename={`madurai_prediction_${targetYear}.csv`} 
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls (Inputs) vs Right Output (Results) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '16px' }}>
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: SIMULATION INPUTS                            */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* 1. Input Mode Tabs */}
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
              1. Input Source
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                className={`btn btn-sm ${inputMode === 'preset' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInputMode('preset')}
                style={{ fontSize: '0.75rem', padding: '6px 4px' }}
              >
                Presets
              </button>
              <button
                className={`btn btn-sm ${inputMode === 'station' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInputMode('station')}
                style={{ fontSize: '0.75rem', padding: '6px 4px' }}
              >
                Station
              </button>
              <button
                className={`btn btn-sm ${inputMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInputMode('custom')}
                style={{ fontSize: '0.75rem', padding: '6px 4px' }}
              >
                Custom
              </button>
            </div>

            {/* Presets Grid */}
            {inputMode === 'preset' && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {PREDICTION_PRESETS.map(p => {
                  const isSelected = selectedPresetId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleApplyPreset(p)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${isSelected ? '#0f766e' : 'var(--border-light)'}`,
                        backgroundColor: isSelected ? 'rgba(15, 118, 110, 0.08)' : 'var(--bg-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500 }}>
                        {p.symbol} {p.name}
                      </div>
                      <span className={`suitability-badge ${
                        p.badge === 'Drinkable' ? 'drinkable' : p.badge === 'Required Boiling' ? 'boiling' : 'not-drinkable'
                      }`} style={{ fontSize: '0.65rem' }}>
                        {p.badge}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Station Selector */}
            {inputMode === 'station' && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Taluk</label>
                  <select
                    className="form-control"
                    value={selectedTaluk}
                    onChange={(e) => {
                      setSelectedTaluk(e.target.value);
                      setSelectedStationName('');
                    }}
                    style={{ width: '100%', fontSize: '0.78rem', padding: '4px 8px' }}
                  >
                    <option value="all">All Taluks ({talukList.length})</option>
                    {talukList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Village Station</label>
                  <select
                    className="form-control"
                    value={selectedStationName}
                    onChange={(e) => handleSelectStation(e.target.value)}
                    style={{ width: '100%', fontSize: '0.78rem', padding: '4px 8px' }}
                  >
                    <option value="">-- Choose Station --</option>
                    {stationList.map(st => (
                      <option key={`${st.taluk}-${st.village}`} value={st.village}>
                        {st.village} ({st.taluk})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 2. Target Year */}
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                2. Target Horizon
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f766e' }}>
                Year {targetYear}
              </span>
            </div>
            <input
              type="range"
              min="2022"
              max="2035"
              step="1"
              value={targetYear}
              onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#0f766e', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
              {[2024, 2026, 2028, 2030, 2035].map(yr => (
                <button
                  key={yr}
                  className={`btn btn-sm ${targetYear === yr ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTargetYear(yr)}
                  style={{ flex: 1, padding: '2px 4px', fontSize: '0.7rem' }}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Climate Scenario */}
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
              3. Climate Scenario
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {SCENARIO_OPTIONS.map(sc => {
                const isSelected = selectedScenario === sc.id;
                return (
                  <button
                    key={sc.id}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedScenario(sc.id)}
                    style={{ fontSize: '0.72rem', padding: '6px 4px', textAlign: 'center' }}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Chemical Parameters */}
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
              4. Chemical Parameters
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* TDS */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                  <span><strong>TDS</strong> (mg/L)</span>
                  <input
                    type="number"
                    value={tdsInput}
                    onChange={(e) => setTdsInput(parseFloat(e.target.value) || 0)}
                    style={{ width: '65px', fontSize: '0.78rem', padding: '2px 4px', textAlign: 'right' }}
                  />
                </div>
                <input
                  type="range"
                  min="100"
                  max="3500"
                  step="25"
                  value={tdsInput}
                  onChange={(e) => setTdsInput(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: tdsInput > 2000 ? '#dc2626' : tdsInput > 500 ? '#d97706' : '#16a34a' }}
                />
              </div>

              {/* EC */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                  <span><strong>EC</strong> (µS/cm)</span>
                  <input
                    type="number"
                    value={ecInput}
                    onChange={(e) => setEcInput(parseFloat(e.target.value) || 0)}
                    style={{ width: '65px', fontSize: '0.78rem', padding: '2px 4px', textAlign: 'right' }}
                  />
                </div>
                <input
                  type="range"
                  min="150"
                  max="5000"
                  step="50"
                  value={ecInput}
                  onChange={(e) => setEcInput(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: ecInput > 2250 ? '#dc2626' : ecInput > 750 ? '#d97706' : '#16a34a' }}
                />
              </div>

              {/* Fluoride */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                  <span><strong>Fluoride</strong> (mg/L)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={fluorideInput}
                    onChange={(e) => setFluorideInput(parseFloat(e.target.value) || 0)}
                    style={{ width: '65px', fontSize: '0.78rem', padding: '2px 4px', textAlign: 'right' }}
                  />
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.5"
                  step="0.05"
                  value={fluorideInput}
                  onChange={(e) => setFluorideInput(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: fluorideInput > 1.5 ? '#dc2626' : fluorideInput > 1.0 ? '#d97706' : '#16a34a' }}
                />
              </div>

              {/* pH */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                  <span><strong>pH</strong></span>
                  <input
                    type="number"
                    step="0.05"
                    value={phInput}
                    onChange={(e) => setPhInput(parseFloat(e.target.value) || 7.0)}
                    style={{ width: '65px', fontSize: '0.78rem', padding: '2px 4px', textAlign: 'right' }}
                  />
                </div>
                <input
                  type="range"
                  min="5.5"
                  max="9.5"
                  step="0.05"
                  value={phInput}
                  onChange={(e) => setPhInput(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: (phInput < 6.5 || phInput > 8.5) ? '#dc2626' : '#16a34a' }}
                />
              </div>

            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: SIMULATION RESULTS                          */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* 1. Potability Card */}
          <div className="card" style={{
            padding: '16px 20px',
            backgroundColor: pot.bg,
            borderLeft: `5px solid ${pot.color}`,
            border: `1px solid ${pot.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.6rem' }}>{pot.symbol}</span>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: pot.color }}>
                    {pot.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {pot.guidance}
                  </div>
                </div>
              </div>
              <span className={`risk-badge ${riskColor.badgeClass}`}>
                {fc.Risk_Level}
              </span>
            </div>

            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${pot.border}`, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={14} color={pot.color} />
              <span><strong>Treatment: </strong>{pot.treatment}</span>
            </div>
          </div>

          {/* 2. Projected Parameter KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            
            {/* TDS */}
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>TDS (mg/L)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {fc.TDS}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                80% CI: [{fc.TDS_Lower_CI} – {fc.TDS_Upper_CI}]
              </div>
              <div style={{ marginTop: '4px' }}>
                <span className={`risk-tag ${fc.TDS > 2000 ? 'high' : fc.TDS > 500 ? 'permissible' : 'low'}`} style={{ fontSize: '0.65rem' }}>
                  {fc.TDS > 2000 ? 'Exceedance' : fc.TDS > 500 ? 'Permissible' : 'Desirable'}
                </span>
              </div>
            </div>

            {/* EC */}
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>EC (µS/cm)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {fc.EC}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                80% CI: [{fc.EC_Lower_CI} – {fc.EC_Upper_CI}]
              </div>
              <div style={{ marginTop: '4px' }}>
                <span className={`risk-tag ${fc.EC > 2250 ? 'high' : fc.EC > 750 ? 'permissible' : 'low'}`} style={{ fontSize: '0.65rem' }}>
                  {fc.EC > 2250 ? 'Saline' : fc.EC > 750 ? 'Moderate' : 'Low Salinity'}
                </span>
              </div>
            </div>

            {/* Fluoride */}
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fluoride (mg/L)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: fc.Fluoride > 1.5 ? '#dc2626' : 'var(--text-primary)', marginTop: '2px' }}>
                {fc.Fluoride}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                80% CI: [{fc.Fluoride_Lower_CI} – {fc.Fluoride_Upper_CI}]
              </div>
              <div style={{ marginTop: '4px' }}>
                <span className={`risk-tag ${fc.Fluoride > 1.5 ? 'high' : fc.Fluoride > 1.0 ? 'permissible' : 'low'}`} style={{ fontSize: '0.65rem' }}>
                  {fc.Fluoride > 1.5 ? 'Toxic (>1.5)' : fc.Fluoride > 1.0 ? 'Permissible' : 'Safe (≤1.0)'}
                </span>
              </div>
            </div>

            {/* pH */}
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>pH</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: (fc.pH < 6.5 || fc.pH > 8.5) ? '#dc2626' : 'var(--text-primary)', marginTop: '2px' }}>
                {fc.pH}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                80% CI: [{fc.pH_Lower_CI} – {fc.pH_Upper_CI}]
              </div>
              <div style={{ marginTop: '4px' }}>
                <span className={`risk-tag ${(fc.pH < 6.5 || fc.pH > 8.5) ? 'high' : 'low'}`} style={{ fontSize: '0.65rem' }}>
                  {(fc.pH < 6.5 || fc.pH > 8.5) ? 'Non-compliant' : 'BIS Safe (6.5–8.5)'}
                </span>
              </div>
            </div>

          </div>

          {/* 3. Multi-Year Trend Chart */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Trajectory &amp; Uncertainty Envelope (2022–{targetYear})
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['TDS', 'EC', 'Fluoride', 'pH'].map(param => (
                  <button
                    key={param}
                    className={`btn btn-sm ${chartParam === param ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setChartParam(param)}
                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                  >
                    {param}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: '240px', position: 'relative' }}>
              <canvas ref={trajectoryChartRef}></canvas>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
