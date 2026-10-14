import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';

export default function TopBar({ 
  activeTab, 
  theme, 
  toggleTheme, 
  setMobileOpen
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
    methodology: 'System Architecture & Scientific Methodology'
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
        </div>
      </div>

      <div className="topbar-right">
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
