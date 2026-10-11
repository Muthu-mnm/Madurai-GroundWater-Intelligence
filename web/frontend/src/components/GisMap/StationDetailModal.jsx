import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { X, MapPin, Calendar, Activity, AlertTriangle, Layers, Info, Droplets } from 'lucide-react';
import { THRESHOLDS, RISK_COLORS, DRINKING_SUITABILITY, getDrinkingSuitability } from '../../utils/thresholds';

export default function StationDetailModal({ 
  station, 
  selectedYear, 
  selectedParam, 
  historicalData = [], 
  forecastData = [], 
  onClose 
}) {
  const chartRef = useRef(null);
  const chartInst = useRef(null);

  if (!station) return null;

  const village = station.Village || station.village;
  const taluk = station.Taluk || station.taluk;
  const wellNo = station.Well_No || station.well_no || 'N/A';

  // Find forecast record for selected year
  const fcRecord = forecastData.find(d => 
    d.Village && d.Village.toLowerCase() === village.toLowerCase() && d.Year === selectedYear
  ) || station;

  const riskLevel = fcRecord.Risk_Level || 'Insufficient Data';
  const riskDesc = fcRecord.Risk_Description || 'No description recorded';
  const suitability = fcRecord.Drinking_Suitability || getDrinkingSuitability(riskLevel, fcRecord).label;
  const sMeta = DRINKING_SUITABILITY[suitability] || DRINKING_SUITABILITY['Unassessed'];
  const paramVal = fcRecord[selectedParam];
  const lowerCI = fcRecord[`${selectedParam}_Lower_CI`];
  const upperCI = fcRecord[`${selectedParam}_Upper_CI`];
  const histObs = fcRecord.Historical_Observations || station.Historical_Observations || 'N/A';
  const lastObsYear = fcRecord.Last_Observed_Year || station.Last_Observed_Year || 'N/A';

  // Render station trend chart across 2007-2030
  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInst.current) {
      chartInst.current.destroy();
    }

    // Historical records for this station
    const stHist = historicalData
      .filter(d => d.Village && d.Village.toLowerCase() === village.toLowerCase())
      .sort((a, b) => a.Year - b.Year);

    // Forecast records for this station
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

    const ctx = chartRef.current.getContext('2d');
    chartInst.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Historical Observed (${THRESHOLDS[selectedParam]?.unit || ''})`,
            data: histVals,
            borderColor: '#176B70',
            backgroundColor: '#176B70',
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.1
          },
          {
            label: `Forecast Point (${THRESHOLDS[selectedParam]?.unit || ''})`,
            data: fcVals,
            borderColor: '#397A9B',
            backgroundColor: '#397A9B',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 3,
            tension: 0.1
          },
          {
            label: `Upper Prediction Bound (80% CI)`,
            data: fcUpperVals,
            borderColor: 'rgba(57, 122, 155, 0.4)',
            backgroundColor: 'rgba(57, 122, 155, 0.15)',
            fill: '+1',
            borderWidth: 1,
            pointRadius: 0
          },
          {
            label: `Lower Prediction Bound (80% CI)`,
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
            labels: { boxWidth: 12, font: { size: 10, family: 'Inter' } }
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
      if (chartInst.current) chartInst.current.destroy();
    };
  }, [village, selectedParam, historicalData, forecastData]);

  const riskBadge = RISK_COLORS[riskLevel] || RISK_COLORS['Insufficient Data'];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} style={{ color: 'var(--accent-primary)' }} />
              {village} Monitoring Station
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Taluk: <strong>{taluk}</strong> | Well No: <strong>{wellNo}</strong> | Coordinates: {station.Latitude ? `${station.Latitude}°N, ${station.Longitude}°E` : 'Mapped'}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Key Metric Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
            {/* Drinking Suitability Card */}
            <div style={{ background: sMeta.bg, border: `1px solid ${sMeta.border}`, padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: sMeta.color, fontWeight: 700 }}>
                Drinking Suitability
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: sMeta.color, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{sMeta.symbol}</span> {suitability}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {sMeta.summary}
              </span>
            </div>

            <div style={{ background: 'var(--bg-muted)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Selected Year ({selectedYear})
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {typeof paramVal === 'number' ? `${paramVal.toFixed(2)} ${THRESHOLDS[selectedParam]?.unit || ''}` : 'N/A'}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                80% CI: [{typeof lowerCI === 'number' ? lowerCI.toFixed(1) : '-'}, {typeof upperCI === 'number' ? upperCI.toFixed(1) : '-'}]
              </span>
            </div>

            <div style={{ background: 'var(--bg-muted)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Risk Classification
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: riskBadge.color, marginTop: '2px' }}>
                {riskLevel}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                BIS 10500:2012 Screening
              </span>
            </div>

            <div style={{ background: 'var(--bg-muted)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Historical Context
              </span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {histObs} observations
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Last observed: {lastObsYear}
              </span>
            </div>
          </div>

          {/* Consumer Guidance Banner */}
          <div style={{ background: sMeta.bg, border: `1px solid ${sMeta.border}`, padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <Droplets size={15} style={{ color: sMeta.color }} />
              <strong style={{ color: sMeta.color }}>Consumer Drinking Water Guidance:</strong>
              <span>{sMeta.guidance}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '21px' }}>
              <strong>Recommended Action:</strong> {sMeta.treatment}
            </div>
          </div>

          {/* Trigger Explanation */}
          <div style={{ background: riskBadge.bg, border: `1px solid ${riskBadge.border}`, padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
            <strong>Risk Classification Assessment:</strong> {riskDesc}
          </div>

          {/* Longitudinal Chart */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Longitudinal Groundwater Trend &amp; Calibrated Forecast (2007–2030)
            </h4>
            <div style={{ height: '260px', width: '100%', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '8px', background: 'var(--bg-surface)' }}>
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
