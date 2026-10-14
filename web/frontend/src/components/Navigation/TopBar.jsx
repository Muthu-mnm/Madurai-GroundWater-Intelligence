import React from 'react';
import { Menu, Sun, Moon, Database, CheckCircle2 } from 'lucide-react';

export default function TopBar({ 
  activeTab, 
  theme, 
  toggleTheme, 
  setMobileOpen, 
  dataStatus = 'Loaded' 
}) {
  const titles = {
    map: 'Interactive Multi-Domain GIS Map',
    water_quality: 'Water Quality Vulnerability Model',
    agriculture: 'Agriculture Vulnerability Model',
    health: 'Health Vulnerability Screening Model',
    combined: 'Combined Vulnerability Assessment',
    historical: 'Historical Groundwater Observations (2007–2021)',
    forecast: 'Decadal Forecasts (2022–2030)',
    prediction: 'Hydrological Simulation & Prediction',
    validation: 'Model Validation & Temporal Evaluation',
    data: 'Data Explorer & Comprehensive Audit',
    overview: 'District Overview Dashboard',
    methodology: 'System Architecture & Scientific Methodology'
  };

  const subtitles = {
    map: 'Thematic vulnerability mapping across 154 stations and 8 taluks of Madurai District with dynamic domain layer styling.',
    water_quality: 'Top metrics: pH, EC, TDS, Fluoride, NO₃, Cl, Ca, Mg | Purpose: Identify poor-quality water and monitor changes over time (BIS 10500:2012 & CPCB).',
    agriculture: 'Top metrics: EC, SAR, RSC, Na%, pH | Purpose: Irrigation suitability, salinity and sodium hazards (FAO 29 & IS 11624:1986).',
    health: 'Top metrics: Fluoride, NO₃, TDS, pH, Cl | Purpose: Drinking-water quality screening (WHO 2017 & BIS 10500:2012).',
    combined: 'Protective multi-domain composite rule engine integrating Water Quality, Agriculture, and Health screening.',
    historical: '15-year historical water quality dataset from TWAD Board and CGWB monitoring stations.',
    forecast: 'Nominal 80% empirical Bayes prediction intervals from the Adaptive Ensemble forecaster.',
    prediction: 'Interactive forward scenario simulator with uncertainty bounds and multi-domain evaluation.',
    validation: 'Expanding-window temporal backtesting across horizons 1–5 and finite-sample calibration.',
    data: 'Comprehensive repository datasets, boundary layers, and automated data integrity verification.',
    overview: 'High-level synthesis of historical records, calibrated predictions, and risk distribution across Madurai District.',
    methodology: 'Data provenance, four assessment models, evaluation procedures, and hydrogeological limitations.'
  };

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button 
          className="btn btn-secondary btn-sm d-lg-none"
          onClick={() => setMobileOpen(true)}
          style={{ display: 'none' }}
        >
          <Menu size={16} />
        </button>
        <div>
          <h1 className="topbar-title">{titles[activeTab] || 'Madurai Groundwater Intelligence'}</h1>
          <p className="topbar-subtitle">{subtitles[activeTab] || ''}</p>
        </div>
      </div>

      <div className="topbar-right">
        <div className="status-badge" title="Validated local dataset and model outputs loaded">
          <span className="status-dot"></span>
          <Database size={13} />
          <span>Research Data: {dataStatus}</span>
        </div>

        <button 
          className="btn btn-secondary btn-sm"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
}
