import React from 'react';
import { 
  Database, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Droplet, 
  Wheat, 
  HeartPulse, 
  ShieldAlert, 
  Info 
} from 'lucide-react';

export default function Methodology() {
  return (
    <div className="content-workspace">
      {/* Header */}
      <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #0f766e' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Methodology &amp; Guidelines
        </h1>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '850px' }}>
          Overview of data sources, four domain assessment models, and practical guidelines for Madurai District.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* 1. DATA SOURCES */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Database size={16} style={{ color: '#0d9488' }} />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              1. Data Sources &amp; Coverage
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            <div style={{ background: 'var(--bg-muted)', padding: '12px 14px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Historical Data (2007–2021)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                2,059 verified observation records compiled from TWAD Board and CGWB monitoring stations.
              </div>
            </div>
            <div style={{ background: 'var(--bg-muted)', padding: '12px 14px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Decadal Forecasts (2022–2030)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                1,386 projected records across 154 stations with nominal 80% empirical Bayes prediction intervals.
              </div>
            </div>
            <div style={{ background: 'var(--bg-muted)', padding: '12px 14px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Geographic Scope</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                154 geo-referenced village stations spanning all 8 revenue taluks of Madurai District.
              </div>
            </div>
          </div>
        </div>

        {/* 2. FOUR ASSESSMENT MODELS */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Cpu size={16} style={{ color: '#0284c7' }} />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              2. Domain Assessment Models
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            
            <div style={{ background: 'var(--bg-muted)', padding: '12px 14px', borderRadius: '6px', borderTop: '3px solid #0d9488' }}>
              <strong style={{ color: '#0d9488', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <Droplet size={14} /> Water Quality Monitoring
              </strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.45 }}>
                Evaluates compliance against <strong>BIS 10500:2012</strong> drinking standards using point estimates and 80% prediction intervals across pH, EC, TDS, Fluoride, NO₃, Cl, Ca, and Mg.
              </div>
            </div>

            <div style={{ background: 'var(--bg-muted)', padding: '12px 14px', borderRadius: '6px', borderTop: '3px solid #16a34a' }}>
              <strong style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <Wheat size={14} /> Agriculture Vulnerability
              </strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.45 }}>
                Evaluates irrigation water suitability against <strong>FAO 29</strong> &amp; <strong>IS 11624:1986</strong> guidelines based on salinity hazard (EC), sodicity (SAR), and alkalinity (RSC, Na%).
              </div>
            </div>

            <div style={{ background: 'var(--bg-muted)', padding: '12px 14px', borderRadius: '6px', borderTop: '3px solid #dc2626' }}>
              <strong style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <HeartPulse size={14} /> Health Screening
              </strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.45 }}>
                Screens for toxicological chemical exposure risks against <strong>WHO 2017</strong> and <strong>BIS</strong> limits, highlighting endemic dental/skeletal fluorosis and infant methemoglobinemia risks.
              </div>
            </div>

            <div style={{ background: 'var(--bg-muted)', padding: '12px 14px', borderRadius: '6px', borderTop: '3px solid #0f766e' }}>
              <strong style={{ color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <ShieldAlert size={14} /> Combined Vulnerability
              </strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.45 }}>
                Protective composite rule engine aggregating all three domains. Guarantees that a severe hazard in any single domain cannot be diluted or hidden by low risks in others.
              </div>
            </div>

          </div>
        </div>

        {/* 3. PRACTICAL GUIDELINES & REMEDIATION */}
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #ea580c' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <AlertTriangle size={16} style={{ color: '#ea580c' }} />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              3. Important Guidelines &amp; Limitations
            </h2>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
              <li>
                <strong>Screening Purpose:</strong> Designed for macroscopic planning and regional decision support. Site-specific potable or agricultural use should be verified with certified laboratory water testing.
              </li>
              <li>
                <strong>Chemical Remediation:</strong> Boiling water does <u>not</u> remove dissolved minerals (Fluoride, Nitrate, or salts)—boiling concentrates chemical toxins. Certified Reverse Osmosis (RO) or activated alumina defluoridation is required.
              </li>
              <li>
                <strong>Domain Scope:</strong> The Agriculture and Health models provide guideline-based environmental exposure screening and do not predict individual crop yields or clinical medical outcomes.
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
