import React, { useState, useMemo, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { THRESHOLDS, RISK_COLORS, DRINKING_SUITABILITY, getDrinkingSuitability } from '../../utils/thresholds';
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
  CheckCircle2,
  AlertTriangle,
  Droplets,
  Sparkles
} from 'lucide-react';

export default function ForecastExplorer({ 
  forecastData = [], 
  historicalData = [],
  onNavigateToPredict
}) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedParam, setSelectedParam] = useState('TDS');
  const [selectedTaluk, setSelectedTaluk] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');
  const [searchVillage, setSearchVillage] = useState('');
  
  // Table Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('Village');
  const [sortDir, setSortDir] = useState('asc');

  // Selected station for deep dive chart
  const [activeStation, setActiveStation] = useState(null);

  const forecastChartRef = useRef(null);
  const forecastChartInst = useRef(null);

  // Filtered forecast dataset
  const filteredData = useMemo(() => {
    return forecastData.filter(d => {
      if (d.Year !== selectedYear) return false;
      if (selectedTaluk !== 'all' && d.Taluk && d.Taluk.toLowerCase() !== selectedTaluk.toLowerCase()) return false;
      if (selectedRisk !== 'all') {
        if (selectedRisk === 'Drinkable' || selectedRisk === 'Required Boiling' || selectedRisk === 'Not Drinkable') {
          const s = d.Drinking_Suitability || getDrinkingSuitability(d.Risk_Level, d).label;
          if (s !== selectedRisk) return false;
        } else if (d.Risk_Level !== selectedRisk) {
          return false;
        }
      }
      if (searchVillage.trim() && d.Village && !d.Village.toLowerCase().includes(searchVillage.toLowerCase().trim())) return false;
      return true;
    });
  }, [forecastData, selectedYear, selectedTaluk, selectedRisk, searchVillage]);

  // Set default active station if none selected
  useEffect(() => {
    if (!activeStation && filteredData.length > 0) {
      setActiveStation(filteredData[0]);
    }
  }, [filteredData, activeStation]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
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

    const ctx = forecastChartRef.current.getContext('2d');
    forecastChartInst.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Historical Observed (${THRESHOLDS[selectedParam]?.unit || ''})`,
            data: histVals,
            borderColor: '#176B70',
            backgroundColor: '#176B70',
            borderWidth: 2.2,
            pointRadius: 4,
            tension: 0.1
          },
          {
            label: `Adaptive Ensemble Point Forecast`,
            data: fcVals,
            borderColor: '#397A9B',
            backgroundColor: '#397A9B',
            borderWidth: 2.2,
            borderDash: [5, 5],
            pointRadius: 3,
            tension: 0.1
          },
          {
            label: `Upper Prediction Bound (Nominal 80% CI)`,
            data: fcUpperVals,
            borderColor: 'rgba(57, 122, 155, 0.4)',
            backgroundColor: 'rgba(57, 122, 155, 0.14)',
            fill: '+1',
            borderWidth: 1,
            pointRadius: 0
          },
          {
            label: `Lower Prediction Bound (Nominal 80% CI)`,
            data: fcLowerVals,
            borderColor: 'rgba(57, 122, 155, 0.4)',
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
              text: `${selectedParam} (${THRESHOLDS[selectedParam]?.unit || ''})`,
              font: { size: 11, family: 'Inter' }
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

  return (
    <div className="content-workspace">
      <DisclaimerBanner />

      {/* Interactive Prediction Input Simulator Callout */}
      {onNavigateToPredict && (
        <div style={{
          backgroundColor: 'rgba(23, 107, 112, 0.08)',
          border: '1.5px solid rgba(23, 107, 112, 0.25)',
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
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Want to enter custom chemical inputs or simulate future drought / climate scenarios?
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Use the new Prediction Simulator to test custom TDS, EC, Fluoride, and pH values up to 2035 with real-time potability assessment.
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

      {/* Control Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <span className="filter-label"><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Horizon Year:</span>
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
          <span className="filter-label"><Filter size={14} style={{ display: 'inline', marginRight: 4 }} /> Parameter:</span>
          <select 
            className="filter-select"
            value={selectedParam}
            onChange={(e) => setSelectedParam(e.target.value)}
          >
            <option value="TDS">TDS — Total Dissolved Solids (mg/L)</option>
            <option value="EC">EC — Electrical Conductivity (µS/cm)</option>
            <option value="Fluoride">Fluoride — Fluoride (mg/L)</option>
            <option value="pH">pH — Sorensen Scale</option>
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
          <span className="filter-label">Potability &amp; Risk:</span>
          <select 
            className="filter-select"
            value={selectedRisk}
            onChange={(e) => { setSelectedRisk(e.target.value); setPage(1); }}
          >
            <option value="all">All Statuses ({forecastData.filter(d => d.Year === selectedYear).length})</option>
            <optgroup label="Drinking Suitability (Potability)">
              <option value="Drinkable">🟢 Drinkable (Low Risk)</option>
              <option value="Required Boiling">🟡 Required Boiling (Medium)</option>
              <option value="Not Drinkable">🔴 Not Drinkable (High Risk)</option>
            </optgroup>
            <optgroup label="Regulatory Risk Category">
              <option value="Low Risk">Low Risk (Desirable)</option>
              <option value="Medium Risk (Permissible)">Medium Risk (Permissible)</option>
              <option value="Medium Risk (Borderline)">Medium Risk (Borderline)</option>
              <option value="High Risk">High Risk (Exceedance)</option>
            </optgroup>
          </select>
        </div>

        <div className="filter-group" style={{ flex: 1, minWidth: '150px' }}>
          <input 
            type="text"
            className="filter-input"
            placeholder="Search village..."
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
            Drinking_Suitability: r.Drinking_Suitability || getDrinkingSuitability(r.Risk_Level, r).label,
            Risk_Level: r.Risk_Level,
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
            Water_Quality_Status: r.Water_Quality_Status,
            Risk_Description: r.Risk_Description,
            Model_Selected: r.Model_Selected
          }))}
          filename={`madurai_forecast_predictions_${selectedYear}.csv`}
          label="Export Predictions CSV"
        />
      </div>

      {/* Deep-Dive Trend Visualization for Active Station */}
      {activeStation && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp size={16} style={{ color: 'var(--accent-primary)' }} />
                Longitudinal Station Trajectory: {activeStation.Village} ({activeStation.Taluk})
              </h3>
              <p className="card-subtitle">
                Model: <strong>Adaptive Ensemble</strong> | Calibration: <strong>Empirical Bayes Residual Scaling</strong> | Interval: <strong>Nominal 80% empirically calibrated prediction interval</strong>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(() => {
                const sLabel = activeStation.Drinking_Suitability || getDrinkingSuitability(activeStation.Risk_Level, activeStation).label;
                const sMeta = DRINKING_SUITABILITY[sLabel] || DRINKING_SUITABILITY['Unassessed'];
                return (
                  <span className={`suitability-badge ${sMeta.badgeClass}`} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                    {sMeta.symbol} {sLabel}
                  </span>
                );
              })()}
              <span className={`risk-tag ${RISK_COLORS[activeStation.Risk_Level]?.badgeClass || ''}`} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                {activeStation.Risk_Level}
              </span>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <canvas ref={forecastChartRef}></canvas>
          </div>
        </div>
      )}

      {/* Forecast Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TableIcon size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Calibrated Groundwater Quality Forecasts ({selectedYear}) — {filteredData.length} Stations
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
                <th className="sortable" onClick={() => handleSort('Village')}>Village</th>
                <th className="sortable" onClick={() => handleSort('Taluk')}>Taluk</th>
                <th>Drinking Suitability</th>
                <th className="sortable" onClick={() => handleSort('Risk_Level')}>Risk Level</th>
                <th className="sortable" onClick={() => handleSort('TDS')}>TDS (mg/L) [80% CI]</th>
                <th className="sortable" onClick={() => handleSort('EC')}>EC (µS/cm) [80% CI]</th>
                <th className="sortable" onClick={() => handleSort('Fluoride')}>Fluoride (mg/L) [80% CI]</th>
                <th className="sortable" onClick={() => handleSort('pH')}>pH [80% CI]</th>
                <th>Trigger Assessment</th>
                <th className="sortable" onClick={() => handleSort('Last_Observed_Year')}>Last Obs</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map((r, i) => {
                const isSelected = activeStation && activeStation.Village === r.Village;
                const sLabel = r.Drinking_Suitability || getDrinkingSuitability(r.Risk_Level, r).label;
                const sMeta = DRINKING_SUITABILITY[sLabel] || DRINKING_SUITABILITY['Unassessed'];
                return (
                  <tr 
                    key={`${r.Taluk}-${r.Village}-${i}`}
                    style={{ backgroundColor: isSelected ? 'var(--accent-primary-light)' : undefined, cursor: 'pointer' }}
                    onClick={() => setActiveStation(r)}
                  >
                    <td><strong>{r.Village}</strong></td>
                    <td>{r.Taluk}</td>
                    <td>
                      <span className={`suitability-badge ${sMeta.badgeClass}`}>
                        {sMeta.symbol} {sLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-tag ${RISK_COLORS[r.Risk_Level]?.badgeClass || ''}`}>
                        {r.Risk_Level}
                      </span>
                    </td>
                    <td>
                      {r.TDS?.toFixed(1)} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>[{r.TDS_Lower_CI?.toFixed(0)}, {r.TDS_Upper_CI?.toFixed(0)}]</span>
                    </td>
                    <td>
                      {r.EC?.toFixed(1)} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>[{r.EC_Lower_CI?.toFixed(0)}, {r.EC_Upper_CI?.toFixed(0)}]</span>
                    </td>
                    <td>
                      {r.Fluoride?.toFixed(2)} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>[{r.Fluoride_Lower_CI?.toFixed(2)}, {r.Fluoride_Upper_CI?.toFixed(2)}]</span>
                    </td>
                    <td>
                      {r.pH?.toFixed(2)} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>[{r.pH_Lower_CI?.toFixed(2)}, {r.pH_Upper_CI?.toFixed(2)}]</span>
                    </td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.Risk_Description}>
                      {r.Risk_Description}
                    </td>
                    <td>{r.Last_Observed_Year} ({r.Elapsed_Since_Last_Observation}y ago)</td>
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
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No forecast predictions match the specified search and filter criteria.
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
