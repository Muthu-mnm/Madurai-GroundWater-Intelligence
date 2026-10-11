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
import DisclaimerBanner from '../Common/DisclaimerBanner';
import ExportButton from '../Common/ExportButton';
import { 
  Sparkles, 
  Sliders, 
  Droplets, 
  MapPin, 
  Calendar, 
  CloudRain, 
  SunMedium, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  TrendingUp, 
  Download, 
  Info, 
  Flame,
  Check,
  ChevronRight
} from 'lucide-react';

export default function PredictionSimulator({ 
  historicalData = [], 
  forecastData = [],
  onNavigateToMap
}) {
  // Input Modes: 'custom', 'station', 'preset'
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
      if (latest.Taluk) setSelectedTaluk(latest.Taluk);
    }
  };

  // Load values when a preset template is clicked
  const handleApplyPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setTdsInput(preset.tds);
    setEcInput(preset.ec);
    setFluorideInput(preset.fluoride);
    setPhInput(preset.ph);
    setSelectedScenario(preset.scenario);
  };

  // Run client-side simulation reactively
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

  // Run multi-scenario sensitivity comparison
  const scenarioComparisons = useMemo(() => {
    return SCENARIO_OPTIONS.map(sc => {
      const res = simulatePrediction({
        targetYear,
        tds: tdsInput,
        ec: ecInput,
        fluoride: fluorideInput,
        ph: phInput,
        scenario: sc.id
      });
      return {
        scenario: sc,
        forecast: res.forecast,
        potability: res.potability
      };
    });
  }, [targetYear, tdsInput, ecInput, fluorideInput, phInput]);


  // Reset inputs to clean defaults
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
    const desirable = THRESHOLDS[chartParam]?.desirable;
    const permissible = THRESHOLDS[chartParam]?.permissible;

    const ctx = trajectoryChartRef.current.getContext('2d');
    trajectoryChartInst.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Nominal 80% Upper CI',
            data: upperCI,
            borderColor: 'rgba(23, 107, 112, 0.25)',
            borderDash: [4, 4],
            backgroundColor: 'transparent',
            pointRadius: 0,
            fill: '+1'
          },
          {
            label: 'Nominal 80% Lower CI',
            data: lowerCI,
            borderColor: 'rgba(23, 107, 112, 0.25)',
            borderDash: [4, 4],
            backgroundColor: 'rgba(23, 107, 112, 0.08)',
            pointRadius: 0,
            fill: false
          },
          {
            label: `Forecast Point (${chartParam})`,
            data: points,
            borderColor: '#176B70',
            backgroundColor: '#176B70',
            borderWidth: 2.5,
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
            labels: {
              boxWidth: 12,
              font: { size: 11, family: 'Inter, sans-serif' }
            }
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
            title: {
              display: true,
              text: `${chartParam} (${unit})`,
              font: { size: 11, weight: 'bold' }
            },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            title: {
              display: true,
              text: 'Forecast Horizon (Year)',
              font: { size: 11, weight: 'bold' }
            },
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
    <div className="tab-container" style={{ padding: '24px 32px' }}>
      {/* Title & Overview Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              backgroundColor: 'rgba(23, 107, 112, 0.12)', 
              color: 'var(--accent-primary)', 
              padding: '8px', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={22} />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Groundwater Quality Prediction &amp; Potability Simulator
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', maxWidth: '850px' }}>
            Provide or adjust baseline water quality inputs, select future target horizon (2022–2035) and environmental stress scenarios to generate forward Bayesian point forecasts, 80% uncertainty bounds, and instant 3-tier Drinking Water potability status under BIS 10500:2012.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleReset}
            title="Reset to default potable parameters"
          >
            <RefreshCw size={14} style={{ marginRight: '6px' }} />
            Reset Inputs
          </button>
          <ExportButton 
            data={[fc]} 
            filename={`madurai_prediction_${targetYear}_${fc.Drinking_Suitability.replace(/\s+/g, '_')}.csv`} 
          />
        </div>
      </div>

      <DisclaimerBanner />

      {/* Main Grid: Left Controls (Inputs) vs Right Output (Predictions) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 480px) 1fr', gap: '24px', marginTop: '20px' }}>
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: PREDICTION INPUT PANEL                       */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Input Mode Selector Bar */}
          <div className="card" style={{ padding: '16px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', display: 'block', marginBottom: '10px' }}>
              1. Choose Input Source
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                className={`btn btn-sm ${inputMode === 'preset' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInputMode('preset')}
                style={{ fontSize: '0.8rem', padding: '8px 6px' }}
              >
                Presets
              </button>
              <button
                className={`btn btn-sm ${inputMode === 'station' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInputMode('station')}
                style={{ fontSize: '0.8rem', padding: '8px 6px' }}
              >
                Station Well
              </button>
              <button
                className={`btn btn-sm ${inputMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInputMode('custom')}
                style={{ fontSize: '0.8rem', padding: '8px 6px' }}
              >
                Custom Lab
              </button>
            </div>

            {/* Sub-Panel: Preset Templates */}
            {inputMode === 'preset' && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Quickly test representative aquifer conditions:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {PREDICTION_PRESETS.map(p => {
                    const isSelected = selectedPresetId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleApplyPreset(p)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          backgroundColor: isSelected ? 'rgba(23, 107, 112, 0.08)' : 'var(--bg-app)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1rem' }}>{p.symbol}</span>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              {p.notes}
                            </div>
                          </div>
                        </div>
                        <span className={`suitability-badge ${
                          p.badge === 'Drinkable' ? 'drinkable' : p.badge === 'Required Boiling' ? 'boiling' : 'not-drinkable'
                        }`} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                          {p.badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-Panel: Station Selector */}
            {inputMode === 'station' && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Select an official TWAD / CGWB monitoring station to autofill baseline values:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Filter Taluk
                    </label>
                    <select
                      className="form-select"
                      value={selectedTaluk}
                      onChange={(e) => {
                        setSelectedTaluk(e.target.value);
                        setSelectedStationName('');
                      }}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    >
                      <option value="all">All Taluks ({talukList.length})</option>
                      {talukList.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Select Village
                    </label>
                    <select
                      className="form-select"
                      value={selectedStationName}
                      onChange={(e) => handleSelectStation(e.target.value)}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    >
                      <option value="">-- Choose Village --</option>
                      {stationList.map(st => (
                        <option key={`${st.taluk}-${st.village}`} value={st.village}>
                          {st.village} ({st.taluk})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedStationName && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', backgroundColor: 'rgba(23, 107, 112, 0.08)', padding: '6px 10px', borderRadius: '4px' }}>
                    Loaded historical records for <strong>{selectedStationName}</strong> ({selectedTaluk}). You can adjust values below to test future scenarios.
                  </div>
                )}
              </div>
            )}

            {/* Sub-Panel: Custom Lab */}
            {inputMode === 'custom' && (
              <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Directly tune the sliders or type in numerical values below to simulate any custom well, laboratory sample, or hypothetical water source.
              </div>
            )}
          </div>

          {/* Target Forecast Horizon (Year) */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                2. Target Forecast Horizon
              </label>
              <span style={{ 
                backgroundColor: 'var(--accent-primary)', 
                color: '#fff', 
                fontWeight: 800, 
                fontSize: '0.9rem', 
                padding: '3px 10px', 
                borderRadius: '12px' 
              }}>
                Year {targetYear} (+{Math.max(1, targetYear - 2021)}y Horizon)
              </span>
            </div>

            <input
              type="range"
              min="2022"
              max="2035"
              step="1"
              value={targetYear}
              onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>2022</span>
              <span>2026 (Mid-Term)</span>
              <span>2030 (Decadal)</span>
              <span>2035 (Long-Term)</span>
            </div>

            {/* Quick Year Jump Buttons */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              {[2024, 2026, 2028, 2030, 2035].map(yr => (
                <button
                  key={yr}
                  className={`btn btn-sm ${targetYear === yr ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTargetYear(yr)}
                  style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem' }}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Hydrochemical Parameter Inputs */}
          <div className="card" style={{ padding: '16px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', display: 'block', marginBottom: '14px' }}>
              3. Hydrochemical Parameter Inputs
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* TDS Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>TDS</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Dissolved Solids</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min="50"
                      max="4000"
                      step="10"
                      value={tdsInput}
                      onChange={(e) => setTdsInput(parseFloat(e.target.value) || 0)}
                      className="form-input"
                      style={{ width: '80px', padding: '3px 6px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>mg/L</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="100"
                  max="3500"
                  step="25"
                  value={tdsInput}
                  onChange={(e) => setTdsInput(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: tdsInput > 2000 ? '#DC2626' : tdsInput > 500 ? '#D97706' : '#059669' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span>Desirable: ≤500</span>
                  <span>Permissible: ≤2000</span>
                  <span>Non-compliant: &gt;2000</span>
                </div>
              </div>

              {/* EC Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>EC</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Electrical Conductivity</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min="100"
                      max="6000"
                      step="25"
                      value={ecInput}
                      onChange={(e) => setEcInput(parseFloat(e.target.value) || 0)}
                      className="form-input"
                      style={{ width: '80px', padding: '3px 6px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>µS/cm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="150"
                  max="5000"
                  step="50"
                  value={ecInput}
                  onChange={(e) => setEcInput(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: ecInput > 2250 ? '#DC2626' : ecInput > 750 ? '#D97706' : '#059669' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span>Desirable: ≤750</span>
                  <span>Permissible: ≤2250</span>
                  <span>Saline: &gt;2250</span>
                </div>
              </div>

              {/* Fluoride Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Fluoride (F)</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dental / Skeletal Risk</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min="0.1"
                      max="5.0"
                      step="0.05"
                      value={fluorideInput}
                      onChange={(e) => setFluorideInput(parseFloat(e.target.value) || 0)}
                      className="form-input"
                      style={{ width: '80px', padding: '3px 6px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>mg/L</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.5"
                  step="0.05"
                  value={fluorideInput}
                  onChange={(e) => setFluorideInput(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: fluorideInput > 1.5 ? '#DC2626' : fluorideInput > 1.0 ? '#D97706' : '#059669' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span>Acceptable: ≤1.0</span>
                  <span>Permissible: ≤1.5</span>
                  <span>Toxic / Fluorosis: &gt;1.5</span>
                </div>
              </div>

              {/* pH Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>pH</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Acidity / Alkalinity</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min="4.0"
                      max="11.0"
                      step="0.05"
                      value={phInput}
                      onChange={(e) => setPhInput(parseFloat(e.target.value) || 7.0)}
                      className="form-input"
                      style={{ width: '80px', padding: '3px 6px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>pH</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="5.5"
                  max="9.5"
                  step="0.05"
                  value={phInput}
                  onChange={(e) => setPhInput(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: (phInput < 6.5 || phInput > 8.5) ? '#DC2626' : '#059669' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span>Acidic: &lt;6.5</span>
                  <span>BIS Safe Window: 6.5–8.5</span>
                  <span>Alkaline: &gt;8.5</span>
                </div>
              </div>

            </div>
          </div>

          {/* Environmental / Climate Scenario Radios */}
          <div className="card" style={{ padding: '16px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', display: 'block', marginBottom: '10px' }}>
              4. Environmental &amp; Climate Scenarios
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SCENARIO_OPTIONS.map(sc => {
                const isSelected = selectedScenario === sc.id;
                return (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedScenario(sc.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      backgroundColor: isSelected ? 'rgba(23, 107, 112, 0.08)' : 'var(--bg-app)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name="scenarioRadio"
                          checked={isSelected}
                          onChange={() => setSelectedScenario(sc.id)}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {sc.label}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                        color: isSelected ? '#fff' : 'var(--text-secondary)'
                      }}>
                        {sc.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '24px' }}>
                      {sc.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: PREDICTION OUTPUT RESULTS & DIAGNOSTICS      */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 1. Drinking Water Potability Hero Banner */}
          <div className="card" style={{
            padding: '20px 24px',
            backgroundColor: pot.bg,
            borderColor: pot.border,
            borderWidth: '2px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{pot.symbol}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 900, 
                      color: pot.color,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      {pot.label}
                    </span>
                    <span className={`suitability-badge ${pot.badgeClass}`} style={{ fontSize: '0.78rem' }}>
                      {pot.summary}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.45 }}>
                    {pot.guidance}
                  </p>
                </div>
              </div>

              {/* Regulatory Risk Badge */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Regulatory Classification
                </div>
                <span className={`risk-badge ${riskColor.badgeClass}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                  {fc.Risk_Level}
                </span>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Horizon Year: <strong>{fc.Year}</strong>
                </div>
              </div>
            </div>

            {/* Direct Consumer Treatment Action */}
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '14px', 
              borderTop: `1px solid ${pot.border}`, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              fontSize: '0.8rem'
            }}>
              <Flame size={16} color={pot.color} />
              <div>
                <strong>Required Household Treatment: </strong>
                <span>{pot.treatment}</span>
              </div>
            </div>

            {/* Trigger Diagnostics */}
            {fc.Risk_Description && (
              <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                <strong>Trigger Analysis: </strong>{fc.Risk_Description}
              </div>
            )}
          </div>

          {/* 2. Key Parameter Predictions Grid (TDS, EC, Fluoride, pH) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            
            {/* TDS Card */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TDS</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>mg/L</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 2px' }}>
                {fc.TDS}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                80% CI: <strong>[{fc.TDS_Lower_CI} – {fc.TDS_Upper_CI}]</strong>
              </div>

              {/* Progress gauge relative to 500 (desirable) and 2000 (permissible) */}
              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--border-color)', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (fc.TDS / 2500) * 100)}%`,
                  backgroundColor: fc.TDS > 2000 ? '#DC2626' : fc.TDS > 500 ? '#D97706' : '#059669',
                  borderRadius: '3px'
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>0</span>
                <span>500 (Desirable)</span>
                <span>2000 (Limit)</span>
              </div>
            </div>

            {/* EC Card */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>EC</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>µS/cm</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 2px' }}>
                {fc.EC}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                80% CI: <strong>[{fc.EC_Lower_CI} – {fc.EC_Upper_CI}]</strong>
              </div>

              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--border-color)', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (fc.EC / 3000) * 100)}%`,
                  backgroundColor: fc.EC > 2250 ? '#DC2626' : fc.EC > 750 ? '#D97706' : '#059669',
                  borderRadius: '3px'
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>0</span>
                <span>750</span>
                <span>2250 (Limit)</span>
              </div>
            </div>

            {/* Fluoride Card */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Fluoride (F)</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>mg/L</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: fc.Fluoride > 1.5 ? '#DC2626' : 'var(--text-primary)', margin: '6px 0 2px' }}>
                {fc.Fluoride}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                80% CI: <strong>[{fc.Fluoride_Lower_CI} – {fc.Fluoride_Upper_CI}]</strong>
              </div>

              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--border-color)', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (fc.Fluoride / 2.5) * 100)}%`,
                  backgroundColor: fc.Fluoride > 1.5 ? '#DC2626' : fc.Fluoride > 1.0 ? '#D97706' : '#059669',
                  borderRadius: '3px'
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>0</span>
                <span>1.0</span>
                <span>1.5 (Limit)</span>
              </div>
            </div>

            {/* pH Card */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>pH</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>scale</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: (fc.pH < 6.5 || fc.pH > 8.5) ? '#DC2626' : 'var(--text-primary)', margin: '6px 0 2px' }}>
                {fc.pH}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                80% CI: <strong>[{fc.pH_Lower_CI} – {fc.pH_Upper_CI}]</strong>
              </div>

              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--border-color)', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, ((fc.pH - 5.0) / 5.0) * 100))}%`,
                  backgroundColor: (fc.pH < 6.5 || fc.pH > 8.5) ? '#DC2626' : '#059669',
                  borderRadius: '3px'
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>5.0 (Acidic)</span>
                <span>6.5–8.5 (Safe)</span>
                <span>10.0 (Base)</span>
              </div>
            </div>

          </div>

          {/* 3. Multi-Year Trajectory Line Chart */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Longitudinal Trajectory &amp; 80% Prediction Envelope (2022–{targetYear})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Evaluates mean reversion under damped ensemble trend and Bayesian empirical variance expansion.
                </span>
              </div>

              {/* Parameter switcher pills for chart */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['TDS', 'EC', 'Fluoride', 'pH'].map(param => (
                  <button
                    key={param}
                    className={`btn btn-sm ${chartParam === param ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setChartParam(param)}
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    {param}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: '280px', position: 'relative' }}>
              <canvas ref={trajectoryChartRef}></canvas>
            </div>
          </div>

          {/* 4. Multi-Scenario Sensitivity Matrix */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>
              Cross-Scenario Sensitivity Matrix for Horizon Year {targetYear}
            </h3>
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>TDS (mg/L)</th>
                    <th>EC (µS/cm)</th>
                    <th>Fluoride (mg/L)</th>
                    <th>pH</th>
                    <th>Potability Status</th>
                    <th>Risk Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioComparisons.map(row => {
                    const isCurrent = row.scenario.id === selectedScenario;
                    return (
                      <tr 
                        key={row.scenario.id}
                        style={{ 
                          backgroundColor: isCurrent ? 'rgba(23, 107, 112, 0.08)' : 'transparent',
                          fontWeight: isCurrent ? 700 : 400
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{row.scenario.label}</span>
                            {isCurrent && (
                              <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--accent-primary)', color: '#fff', padding: '1px 4px', borderRadius: '3px' }}>
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{row.forecast.TDS}</td>
                        <td>{row.forecast.EC}</td>
                        <td>{row.forecast.Fluoride}</td>
                        <td>{row.forecast.pH}</td>
                        <td>
                          <span className={`suitability-badge ${row.potability.badgeClass}`}>
                            {row.potability.symbol} {row.potability.label}
                          </span>
                        </td>
                        <td>
                          <span className={`risk-badge ${RISK_COLORS[row.forecast.Risk_Level]?.badgeClass || 'nodata'}`}>
                            {row.forecast.Risk_Level}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
