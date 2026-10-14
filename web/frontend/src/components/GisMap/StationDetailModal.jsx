import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { 
  X, 
  MapPin, 
  Calendar, 
  Droplet, 
  Wheat, 
  HeartPulse, 
  ShieldAlert, 
  AlertOctagon, 
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { THRESHOLDS, getVulnerabilityMeta, DRINKING_SUITABILITY, getDrinkingSuitability } from '../../utils/thresholds';

export default function StationDetailModal({ 
  station, 
  selectedYear = 2026, 
  historicalData = [], 
  forecastData = [], 
  onClose 
}) {
  const chartRef = useRef(null);
  const chartInst = useRef(null);
  const [activeParam, setActiveParam] = useState('Fluoride');

  if (!station) return null;

  const village = station.Village || station.village;
  const taluk = station.Taluk || station.taluk;
  const wellNo = station.Well_No || station.well_no || 'N/A';

  // Find record for selected year
  const isForecastYear = selectedYear >= 2022;
  const sourceData = isForecastYear ? forecastData : historicalData;
  const matchedRecord = sourceData.find(d => 
    d.Village && d.Village.toLowerCase() === village.toLowerCase() && d.Year === selectedYear
  ) || station;

  // Extract parameters
  const tds = Number(matchedRecord.TDS);
  const ec = Number(matchedRecord.EC);
  const f = Number(matchedRecord.Fluoride);
  const ph = Number(matchedRecord.pH);
  const no3 = Number(matchedRecord.NO3);
  const cl = Number(matchedRecord.Cl);
  const sar = Number(matchedRecord.SAR);
  const rsc = Number(matchedRecord.RSC);
  const naPct = Number(matchedRecord['Na%']);

  const hasNo3 = !isNaN(no3) && no3 !== null;
  const hasCl = !isNaN(cl) && cl !== null;
  const hasSar = !isNaN(sar) && sar !== null;
  const hasRsc = !isNaN(rsc) && rsc !== null;
  const hasNaPct = !isNaN(naPct) && naPct !== null;

  // 1. Water Quality Domain Assessment (Top Metrics: pH, EC, TDS, Fluoride, NO3, Cl)
  let wqClass = 'Low Vulnerability';
  let wqReason = 'All parameter point estimates and prediction bounds strictly comply with desirable limits.';
  if (isNaN(tds) || isNaN(ec) || isNaN(f) || isNaN(ph)) {
    wqClass = 'Insufficient Data';
    wqReason = 'Missing core water quality parameters.';
  } else if (f > 3.0 || tds > 3000 || ec > 4000 || (hasCl && cl > 1500) || (hasNo3 && no3 > 100) || ph < 5.0 || ph > 9.5) {
    wqClass = 'Very High Vulnerability';
    wqReason = f > 3.0 ? `Severe Fluoride (${f.toFixed(2)} mg/L > 3.0)` : (tds > 3000 ? `Severe Mineralization (${tds.toFixed(0)} mg/L)` : `Extreme Contaminant Load`);
  } else if (f > 1.5 || tds > 2000 || ec > 2250 || (hasCl && cl > 1000) || (hasNo3 && no3 > 45) || ph < 6.5 || ph > 8.5) {
    wqClass = 'High Vulnerability';
    wqReason = f > 1.5 ? `Fluoride Exceedance (${f.toFixed(2)} mg/L > 1.5 BIS Limit)` : (tds > 2000 ? `TDS Exceedance (${tds.toFixed(0)} mg/L)` : (hasCl && cl > 1000 ? `Chloride Exceedance (${cl.toFixed(0)} mg/L)` : `EC/pH Non-compliance`));
  } else if (tds > 500 || f > 1.0 || ec > 750 || (hasCl && cl > 250) || (matchedRecord.Fluoride_Upper_CI && Number(matchedRecord.Fluoride_Upper_CI) > 1.5)) {
    wqClass = 'Moderate Vulnerability';
    wqReason = 'Permissible relaxation zone or prediction uncertainty bound crosses statutory threshold.';
  }
  const wqMeta = getVulnerabilityMeta(wqClass);

  // 2. Agriculture Domain Assessment (Top Metrics: EC, SAR, RSC, Na%, pH)
  let agriClass = 'Low Vulnerability';
  let agriSuitability = 'Suitable for General Irrigation';
  let agriReason = 'Salinity and sodicity hazard low (EC < 750 µS/cm, FAO Class C1/C2).';
  const agriPartial = !hasSar || !hasRsc;

  if (isNaN(ec)) {
    agriClass = 'Insufficient Data';
    agriSuitability = 'Unassessed';
    agriReason = 'Missing electrical conductivity measurement.';
  } else if (ec > 4000 || sar > 26 || rsc > 3.5 || naPct > 80 || ph > 9.0) {
    agriClass = 'Very High Vulnerability';
    agriSuitability = 'Unsuitable under Standard Practices';
    agriReason = ec > 4000 ? `Severe Salinity (${ec.toFixed(0)} µS/cm)` : (rsc > 3.5 ? `Severe RSC (${rsc.toFixed(2)} meq/L)` : (sar > 26 ? `Severe Sodicity (SAR ${sar.toFixed(1)})` : `Severe Alkalinity`));
  } else if (ec > 2250 || sar > 18 || rsc > 2.5 || naPct > 60 || ph < 6.0) {
    agriClass = 'High Vulnerability';
    agriSuitability = 'Severe Restriction (Salt-Tolerant Crops Only)';
    agriReason = ec > 2250 ? `High Salinity (${ec.toFixed(0)} µS/cm > 2250, FAO Class C4)` : (sar > 18 ? `High Sodicity (SAR ${sar.toFixed(1)})` : (rsc > 2.5 ? `High RSC (${rsc.toFixed(2)} meq/L)` : `High Sodium Percentage`));
  } else if (ec > 750 || sar > 10 || rsc > 1.25 || naPct > 40 || ph > 8.4) {
    agriClass = 'Moderate Vulnerability';
    agriSuitability = 'Moderate Restriction (Good Drainage Needed)';
    agriReason = ec > 750 ? `Moderate Salinity (${ec.toFixed(0)} µS/cm, FAO Class C3)` : `Marginal Sodicity / RSC`;
  }
  const agriMeta = getVulnerabilityMeta(agriClass);

  // 3. Health Domain Screening Assessment (Top Metrics: Fluoride, NO3, TDS, pH, Cl)
  let healthClass = 'Low Vulnerability';
  let healthConcern = 'No chemical contaminant exposure hazards detected in evaluated parameters.';
  const healthPartial = !hasNo3;

  if (isNaN(f)) {
    healthClass = 'Insufficient Data';
    healthConcern = 'Missing Fluoride measurement.';
  } else if (f > 3.0 || (hasNo3 && no3 > 100) || tds > 3000 || (hasCl && cl > 1500) || ph < 5.0 || ph > 9.5) {
    healthClass = 'Very High Vulnerability';
    healthConcern = f > 3.0 ? `Crippling Skeletal Fluorosis Risk (F: ${f.toFixed(2)} mg/L)` : (no3 > 100 ? `Severe Infantile Methemoglobinemia Hazard` : (cl > 1500 ? `Severe Chloride Toxicity (${cl.toFixed(0)} mg/L)` : `Extreme Mineral Load`));
  } else if (f > 1.5 || (hasNo3 && no3 > 45) || tds > 2000 || (hasCl && cl > 1000) || ph < 6.5 || ph > 8.5) {
    healthClass = 'High Vulnerability';
    healthConcern = f > 1.5 ? `Dental Fluorosis Risk in children (F: ${f.toFixed(2)} mg/L > 1.5)` : (no3 > 45 ? `Methemoglobinemia Hazard in bottle-fed infants` : (cl > 1000 ? `Chloride Exceedance (${cl.toFixed(0)} mg/L > 1000)` : `TDS Mineralization / pH Non-compliance`));
  } else if (f > 1.0 || (matchedRecord.Fluoride_Upper_CI && Number(matchedRecord.Fluoride_Upper_CI) > 1.5) || tds > 500 || (hasCl && cl > 250)) {
    healthClass = 'Moderate Vulnerability';
    healthConcern = f > 1.0 ? `Mild dental mottling potential (F: ${f.toFixed(2)} mg/L)` : `Fluoride Upper CI breach or permissible mineral/chloride load`;
  }
  const healthMeta = getVulnerabilityMeta(healthClass);

  // 4. Combined Protective Aggregation Rule
  const domainClasses = [wqClass, agriClass, healthClass];
  let combinedClass = 'Low Vulnerability';
  let score = 15;
  let protectiveNote = 'All 3 domains strictly comply with desirable standards.';

  if (domainClasses.includes('Very High Vulnerability')) {
    combinedClass = 'Very High Vulnerability';
    score = 95;
    protectiveNote = 'Protective severity rule: Extreme hazard in ≥1 domain guarantees Very High combined risk.';
  } else if (domainClasses.includes('High Vulnerability')) {
    combinedClass = 'High Vulnerability';
    score = 75;
    protectiveNote = 'Protective severity rule: Significant statutory or agricultural breach in ≥1 domain.';
  } else if (domainClasses.includes('Moderate Vulnerability')) {
    combinedClass = 'Moderate Vulnerability';
    score = 45;
    protectiveNote = 'Composite relaxation zone: Moderate constraints detected.';
  }
  const combinedMeta = getVulnerabilityMeta(combinedClass);
  const isCombinedPartial = (agriPartial || healthPartial);

  // Multi-Year Chart (2007-2030)
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInst.current) chartInst.current.destroy();

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
        histVals.push(found && typeof found[activeParam] === 'number' ? found[activeParam] : null);
        fcVals.push(null);
        fcUpperVals.push(null);
        fcLowerVals.push(null);
      } else {
        histVals.push(null);
        const found = stFc.find(d => d.Year === y);
        fcVals.push(found && typeof found[activeParam] === 'number' ? found[activeParam] : null);
        fcUpperVals.push(found && typeof found[`${activeParam}_Upper_CI`] === 'number' ? found[`${activeParam}_Upper_CI`] : null);
        fcLowerVals.push(found && typeof found[`${activeParam}_Lower_CI`] === 'number' ? found[`${activeParam}_Lower_CI`] : null);
      }
    }

    const ctx = chartRef.current.getContext('2d');
    chartInst.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Observed (${THRESHOLDS[activeParam]?.unit || ''})`,
            data: histVals,
            borderColor: '#0d9488',
            backgroundColor: '#0d9488',
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.1
          },
          {
            label: `Forecast Point (${THRESHOLDS[activeParam]?.unit || ''})`,
            data: fcVals,
            borderColor: '#0284c7',
            backgroundColor: '#0284c7',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 3,
            tension: 0.1
          },
          {
            label: `Upper Bound (80% CI)`,
            data: fcUpperVals,
            borderColor: 'rgba(2, 132, 199, 0.4)',
            backgroundColor: 'rgba(2, 132, 199, 0.12)',
            fill: '+1',
            borderWidth: 1,
            pointRadius: 0
          },
          {
            label: `Lower Bound (80% CI)`,
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
            labels: { boxWidth: 12, font: { size: 10, family: 'Inter' } }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: '#E2E8EC' },
            title: {
              display: true,
              text: `${activeParam} (${THRESHOLDS[activeParam]?.unit || ''})`,
              font: { size: 11, family: 'Inter' }
            }
          }
        }
      }
    });

    return () => {
      if (chartInst.current) chartInst.current.destroy();
    };
  }, [village, activeParam, historicalData, forecastData]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '880px', width: '95%' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} style={{ color: '#0d9488' }} />
              {village} Monitoring Station ({selectedYear})
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Taluk: <strong>{taluk}</strong> &bull; Well No: <strong>{wellNo}</strong> &bull; Coordinates: {station.Latitude ? `${Number(station.Latitude).toFixed(2)}°N, ${Number(station.Longitude).toFixed(2)}°E` : 'Mapped'}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '80vh', overflowY: 'auto' }}>
          
          {/* CRITICAL BOILING WARNING */}
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertOctagon size={18} style={{ color: '#e11d48', flexShrink: 0 }} />
            <div style={{ fontSize: '0.75rem', color: '#9f1239', lineHeight: 1.4 }}>
              <strong>Chemical Safety Notice:</strong> Boiling water does NOT eliminate chemical contaminants like Fluoride or Nitrate (boiling concentrates dissolved toxins). RO or defluoridation is required for chemical removal.
            </div>
          </div>

          {/* 4 DEDICATED DOMAIN CARDS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
            
            {/* 1. Combined Vulnerability */}
            <div style={{ background: combinedMeta.bg, border: `1px solid ${combinedMeta.border}`, padding: '12px 14px', borderRadius: '6px', borderTop: `3px solid ${combinedMeta.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: combinedMeta.color, fontWeight: 700 }}>
                  Combined Risk
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: combinedMeta.color }}>
                  {score}/100
                </span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: combinedMeta.color, marginTop: '4px' }}>
                {combinedClass}
                {isCombinedPartial && <span style={{ fontSize: '0.7rem', display: 'block', fontWeight: 500 }}>(Partial Assessment)</span>}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                {protectiveNote}
              </div>
            </div>

            {/* 2. Water Quality */}
            <div style={{ background: wqMeta.bg, border: `1px solid ${wqMeta.border}`, padding: '12px 14px', borderRadius: '6px', borderTop: `3px solid ${wqMeta.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: wqMeta.color, fontWeight: 700 }}>
                  Water Quality
                </span>
                <Droplet size={14} style={{ color: wqMeta.color }} />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: wqMeta.color, marginTop: '4px' }}>
                {wqClass}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                {wqReason}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                pH: {ph ? ph.toFixed(2) : '—'} | EC: {ec ? ec.toFixed(0) : '—'} | TDS: {tds ? tds.toFixed(0) : '—'} | F: {f ? f.toFixed(2) : '—'} | NO₃: {hasNo3 ? no3.toFixed(1) : '—'} | Cl: {hasCl ? cl.toFixed(0) : '—'}
              </div>
            </div>

            {/* 3. Agriculture */}
            <div style={{ background: agriMeta.bg, border: `1px solid ${agriMeta.border}`, padding: '12px 14px', borderRadius: '6px', borderTop: `3px solid ${agriMeta.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: agriMeta.color, fontWeight: 700 }}>
                  Agriculture
                </span>
                <Wheat size={14} style={{ color: agriMeta.color }} />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: agriMeta.color, marginTop: '4px' }}>
                {agriClass}
                {agriPartial && <span style={{ fontSize: '0.68rem', display: 'block', fontWeight: 500 }}>(Partial Salinity)</span>}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                {agriSuitability}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                EC: {ec ? ec.toFixed(0) : '—'} | SAR: {hasSar ? sar.toFixed(1) : '—'} | RSC: {hasRsc ? rsc.toFixed(2) : '—'} | Na%: {hasNaPct ? `${naPct.toFixed(1)}%` : '—'} | pH: {ph ? ph.toFixed(2) : '—'}
              </div>
            </div>

            {/* 4. Health Screening */}
            <div style={{ background: healthMeta.bg, border: `1px solid ${healthMeta.border}`, padding: '12px 14px', borderRadius: '6px', borderTop: `3px solid ${healthMeta.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: healthMeta.color, fontWeight: 700 }}>
                  Health Screening
                </span>
                <HeartPulse size={14} style={{ color: healthMeta.color }} />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: healthMeta.color, marginTop: '4px' }}>
                {healthClass}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                {healthConcern}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                F: {f ? `${f.toFixed(2)} mg/L` : '—'} | NO₃: {hasNo3 ? `${no3.toFixed(1)} mg/L` : '—'} | TDS: {tds ? tds.toFixed(0) : '—'} | pH: {ph ? ph.toFixed(2) : '—'} | Cl: {hasCl ? `${cl.toFixed(0)} mg/L` : '—'}
              </div>
            </div>

          </div>

          {/* Interactive Multi-Year Chart (2007-2030) */}
          <div style={{ border: '1px solid var(--border-light)', borderRadius: '6px', padding: '12px 14px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Longitudinal Hydrochemical Trend &amp; Uncertainty Bounds (2007–2030)
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Fluoride', 'NO3', 'TDS', 'EC', 'pH', 'Cl', 'SAR', 'RSC', 'Na%'].map(param => (
                  <button
                    key={param}
                    className={`btn btn-sm ${activeParam === param ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveParam(param)}
                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                  >
                    {param}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: '220px', width: '100%' }}>
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
