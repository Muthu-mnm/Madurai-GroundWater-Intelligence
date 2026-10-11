import React, { useState, useEffect } from 'react';
import Sidebar from './components/Navigation/Sidebar';
import TopBar from './components/Navigation/TopBar';
import OverviewDashboard from './components/Overview/OverviewDashboard';
import GisMap from './components/GisMap/GisMap';
import HistoricalAnalysis from './components/Historical/HistoricalAnalysis';
import ForecastExplorer from './components/Forecast/ForecastExplorer';
import PredictionSimulator from './components/Prediction/PredictionSimulator';
import RiskAssessment from './components/Risk/RiskAssessment';
import ModelValidation from './components/Validation/ModelValidation';
import DataExplorer from './components/DataExplorer/DataExplorer';
import Methodology from './components/Methodology/Methodology';
import { clientDataService } from './services/dataService';
import { Droplets } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [theme, setTheme] = useState('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data State
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [validationReport, setValidationReport] = useState({});
  const [districtGeo, setDistrictGeo] = useState(null);
  const [taluksGeo, setTaluksGeo] = useState(null);
  const [stationsGeo, setStationsGeo] = useState(null);
  const [surfaces, setSurfaces] = useState(null);

  // Theme Toggler
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // Initial Data Fetching
  useEffect(() => {
    async function initApp() {
      try {
        setLoading(true);
        const [meta, hist, fc, met, val, distG, talG, stG, surfData] = await Promise.all([
          clientDataService.getMetadata(),
          clientDataService.getHistorical(),
          clientDataService.getForecasts(),
          clientDataService.getMetrics(),
          clientDataService.getValidation(),
          clientDataService.getGeoJSON('district'),
          clientDataService.getGeoJSON('taluks'),
          clientDataService.getGeoJSON('stations'),
          clientDataService.getSurfaces()
        ]);

        setMetadata(meta || {});
        setHistoricalData(hist || []);
        setForecastData(fc || []);
        setMetrics(met || {});
        setValidationReport(val || {});
        setDistrictGeo(distG);
        setTaluksGeo(talG);
        setStationsGeo(stG);
        setSurfaces(surfData);
      } catch (err) {
        console.error("Critical failure during dataset initialization", err);
      } finally {
        setLoading(false);
      }
    }

    initApp();
  }, []);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--accent-primary)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          border: '3px solid rgba(23, 107, 112, 0.2)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
            INITIALIZING MADURAI GROUNDWATER INTELLIGENCE PLATFORM...
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Loading 2007–2030 hydrochemical datasets, GeoJSON boundaries &amp; calibrated risk models
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
        mobileOpen={mobileMenuOpen} 
        setMobileOpen={setMobileMenuOpen} 
      />

      {/* Main Workspace */}
      <div className="app-main">
        <TopBar 
          activeTab={activeTab} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          setMobileOpen={setMobileMenuOpen} 
          dataStatus="Verified Local" 
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'overview' && (
            <OverviewDashboard 
              historicalData={historicalData}
              forecastData={forecastData}
              metadata={metadata}
              onNavigateToMap={() => setActiveTab('map')}
              onNavigateToPredict={() => setActiveTab('prediction')}
            />
          )}

          {activeTab === 'map' && (
            <GisMap 
              historicalData={historicalData}
              forecastData={forecastData}
              districtGeo={districtGeo}
              taluksGeo={taluksGeo}
              stationsGeo={stationsGeo}
              surfaces={surfaces}
              theme={theme}
            />
          )}

          {activeTab === 'historical' && (
            <HistoricalAnalysis 
              historicalData={historicalData} 
            />
          )}

          {activeTab === 'forecast' && (
            <ForecastExplorer 
              forecastData={forecastData}
              historicalData={historicalData}
              onNavigateToPredict={() => setActiveTab('prediction')}
            />
          )}

          {activeTab === 'prediction' && (
            <PredictionSimulator 
              historicalData={historicalData}
              forecastData={forecastData}
              onNavigateToMap={() => setActiveTab('map')}
            />
          )}

          {activeTab === 'risk' && (
            <RiskAssessment 
              forecastData={forecastData}
            />
          )}

          {activeTab === 'validation' && (
            <ModelValidation 
              metrics={metrics}
            />
          )}

          {activeTab === 'data' && (
            <DataExplorer 
              historicalData={historicalData}
              forecastData={forecastData}
              validationReport={validationReport}
            />
          )}

          {activeTab === 'methodology' && (
            <Methodology />
          )}
        </main>
      </div>
    </div>
  );
}
