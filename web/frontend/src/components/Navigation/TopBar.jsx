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
    overview: 'Overview Dashboard',
    map: 'Interactive GIS Map & Spatial Zonation',
    historical: 'Historical Groundwater Observations (2007–2021)',
    forecast: 'Forecast Explorer (2022–2030)',
    risk: 'Groundwater Risk Assessment (BIS 10500)',
    validation: 'Model Performance & Calibration',
    data: 'Data Explorer & 28-Point Audit',
    methodology: 'Methodology, Standards & Hydrogeology'
  };

  const subtitles = {
    overview: 'High-level synthesis of historical records, calibrated predictions, and risk distribution across Madurai District.',
    map: 'Continuous spatial visualization across 7 Taluks and 154 monitoring stations with live point inspection.',
    historical: '15-year historical water quality dataset from TWAD Board and CGWB monitoring wells.',
    forecast: 'Nominal 80% empirically calibrated prediction intervals from Adaptive Ensemble modeling.',
    risk: 'Interval-aware screening under statutory BIS 10500:2012 drinking water standards.',
    validation: 'Chronological expanding-window backtesting across horizons 1–5 and finite-sample calibration.',
    data: 'Comprehensive repository datasets, boundary layers, and automated data integrity audit.',
    methodology: 'Peer-reviewed forecasting architecture, calibration formulations, and scientific disclaimers.'
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
