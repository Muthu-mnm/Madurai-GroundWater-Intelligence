import React from 'react';
import DisclaimerBanner from '../Common/DisclaimerBanner';
import { 
  BookOpen, 
  Layers, 
  ShieldCheck, 
  TrendingUp, 
  FileText, 
  Cpu, 
  MapPin, 
  AlertCircle 
} from 'lucide-react';

export default function Methodology() {
  return (
    <div className="content-workspace">
      <DisclaimerBanner />

      {/* Hero Overview Card */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <BookOpen size={24} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Madurai Groundwater Intelligence: Scientific Architecture &amp; Methodology
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.6 }}>
              A peer-reviewed decision-support GIS platform engineered for longitudinal groundwater monitoring (2007–2021), multi-year extrapolation (2022–2030), and interval-aware statutory risk screening across the 7 Taluks of Madurai District, Tamil Nadu, India.
            </p>
          </div>
        </div>
      </div>

      {/* Two Pillars Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
        {/* Pillar I */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Cpu size={16} style={{ color: 'var(--accent-primary)' }} />
              Pillar I: Statutory Water Quality Classification Tree
            </h3>
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p>
              Employs an <strong>Interpretable CART Decision Tree Classifier</strong> trained on 1,646 historical records and evaluated on 412 held-out observations under <em>BIS 10500:2012</em> drinking water specifications.
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Target Classes:</strong> Safe (Acceptable), Permissible (Relaxation Zone), Unsafe (Exceedance).</li>
              <li><strong>Model Accuracy:</strong> 95.87% on independent test partition.</li>
              <li><strong>Macro F1-Score:</strong> 0.94; Weighted F1: 0.96.</li>
              <li><strong>Rule Interpretability:</strong> Explicit split criteria on Fluoride (1.0 / 1.5 mg/L) and TDS (500 / 2000 mg/L).</li>
            </ul>
          </div>
        </div>

        {/* Pillar II */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <TrendingUp size={16} style={{ color: 'var(--accent-primary)' }} />
              Pillar II: Continuous Multi-Horizon Forecasting
            </h3>
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p>
              Features an <strong>Adaptive Ensemble Extrapolator</strong> blending station-level Empirical Bayes non-linear damped regression with pooled historical station baselines:
            </p>
            <div style={{ background: 'var(--bg-muted)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              ŷ_ens = 0.5 · ŷ_damped + 0.5 · ȳ_station
            </div>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Inertia Dampening:</strong> Autoregressive damping factor φ = 0.70 prevents unphysical runaway trends.</li>
              <li><strong>Empirical Bayes Regularization:</strong> t-statistic shrinkage shrinks slopes toward zero on sparse records.</li>
              <li><strong>Backtesting:</strong> Chronological expanding-window across horizons h=1..5 over 2,744 out-of-sample test evaluations.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Uncertainty Quantification & Empirical Calibration */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <ShieldCheck size={16} style={{ color: 'var(--accent-primary)' }} />
            Empirical Prediction Intervals &amp; Finite-Sample Conformal Scaling
          </h3>
        </div>
        <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>
            Rather than relying on unverified asymptotic Gaussian assumptions, uncertainty intervals are calibrated via <strong>Empirical Bayes Residual Scaling</strong> with finite-sample empirical quantiles:
          </p>
          <div style={{ background: 'var(--bg-muted)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.6 }}>
            Interval_h = [ max(0, ŷ - q_80 · σ_h),  ŷ + q_80 · σ_h ]<br/>
            σ_h = s_pooled · √(1 + 0.15 · (h - 1))
          </div>
          <p>
            Empirical coverage was validated by holding out 275 station observations (2018–2021). TDS achieved 77.8% coverage, Fluoride 80.7% coverage, and EC 69.5% coverage. pH is strictly bounded within the physical [0, 14] Sorensen scale.
          </p>
        </div>
      </div>

      {/* Regulatory Standards Reference */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Layers size={16} style={{ color: 'var(--accent-primary)' }} />
            Statutory Regulatory Standards Applied
          </h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Chemical Constituent</th>
                <th>Desirable Limit (Acceptable)</th>
                <th>Permissible Limit (Absence of Alternate)</th>
                <th>Authoritative Standard</th>
                <th>Health / Agronomic Significance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>TDS (Total Dissolved Solids)</strong></td>
                <td>500 mg/L</td>
                <td>2,000 mg/L</td>
                <td>BIS 10500:2012 (Table 1, Item 4)</td>
                <td>Palatability, gastrointestinal irritation, plumbing scaling</td>
              </tr>
              <tr>
                <td><strong>EC (Electrical Conductivity)</strong></td>
                <td>750 µS/cm</td>
                <td>2,250 µS/cm</td>
                <td>CPCB Salinity Criteria &amp; FAO 29</td>
                <td>Soil osmotic pressure, crop salinity damage</td>
              </tr>
              <tr>
                <td><strong>Fluoride (F)</strong></td>
                <td>1.0 mg/L</td>
                <td>1.5 mg/L</td>
                <td>BIS 10500:2012 (Table 1, Item 13)</td>
                <td>Dental enamel mottling (&gt;1.0) and crippling skeletal fluorosis (&gt;1.5)</td>
              </tr>
              <tr>
                <td><strong>pH</strong></td>
                <td>6.5 – 8.5</td>
                <td>Outside 6.5 – 8.5</td>
                <td>BIS 10500:2012 (Table 1, Item 2)</td>
                <td>Acidic casing corrosion (&lt;6.5) vs alkaline carbonate incrustation (&gt;8.5)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Institutional Sources & Audit Trail */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <MapPin size={16} style={{ color: 'var(--accent-primary)' }} />
            Data Sources &amp; Institutional Governance
          </h3>
        </div>
        <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div><strong>Primary Monitoring Network:</strong> Tamil Nadu Water Supply and Drainage Board (TWAD Board) &amp; Central Ground Water Board (CGWB), South Eastern Coastal Region.</div>
          <div><strong>Geospatial Boundaries:</strong> Survey of India administrative boundaries mapped in WGS84 (EPSG:4326) across 7 Taluks: Madurai North, Madurai South, Melur, Peraiyur, Thirumangalam, Usilampatti, Vadipatti.</div>
          <div><strong>Sampling Cadence:</strong> Biannual pre-monsoon and post-monsoon hydrogeological monitoring rounds (2007–2021).</div>
        </div>
      </div>
    </div>
  );
}
