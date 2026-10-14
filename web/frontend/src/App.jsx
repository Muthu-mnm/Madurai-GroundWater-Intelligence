import React, { useState, useEffect } from 'react';
import Sidebar from './components/Navigation/Sidebar';
import TopBar from './components/Navigation/TopBar';
import GisMap from './components/GisMap/GisMap';
import WaterQualityView from './components/WaterQuality/WaterQualityView';
import AgricultureView from './components/Agriculture/AgricultureView';
import HealthView from './components/Health/HealthView';
import CombinedRiskView from './components/Combined/CombinedRiskView';
import HistoricalAnalysis from './components/Historical/HistoricalAnalysis';
import ForecastExplorer from './components/Forecast/ForecastExplorer';
import PredictionSimulator from './components/Prediction/PredictionSimulator';
import ModelValidation from './components/Validation/ModelValidation';
import DataExplorer from './components/DataExplorer/DataExplorer';
import OverviewDashboard from './components/Overview/OverviewDashboard';
import Methodology from './components/Methodology/Methodology';
import { clientDataService } from './services/dataService';
import { Droplets } from 'lucide-react';

export default function App() {
  // Map opens immediately as default application view (Section 9)
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
          width: '40px',
          height: '40px',
          border: '3px solid rgba(15, 118, 110, 0.2)',
          borderTopColor: '#0f766e',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
            LOADING MADURAI GROUNDWATER INTELLIGENCE PLATFORM
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Initializing Multi-Domain Vulnerability Models &amp; GIS Network (2007–2030)
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
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Primary View: Map Opens Immediately as Default */}
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

          {/* Model 1: Water Quality Vulnerability */}
          {activeTab === 'water_quality' && (
            <WaterQualityView 
              historicalData={historicalData}
              forecastData={forecastData}
              onSelectStation={() => setActiveTab('map')}
            />
          )}

          {/* Model 2: Agriculture Vulnerability */}
          {activeTab === 'agriculture' && (
            <AgricultureView 
              historicalData={historicalData}
              forecastData={forecastData}
              onSelectStation={() => setActiveTab('map')}
            />
          )}

          {/* Model 3: Health Vulnerability Screening */}
          {activeTab === 'health' && (
            <HealthView 
              historicalData={historicalData}
              forecastData={forecastData}
              onSelectStation={() => setActiveTab('map')}
            />
          )}

          {/* Model 4: Combined Vulnerability Assessment */}
          {activeTab === 'combined' && (
            <CombinedRiskView 
              historicalData={historicalData}
              forecastData={forecastData}
              onSelectStation={() => setActiveTab('map')}
            />
          )}

          {/* Secondary Views (Accessible via 'More Tools & Data') */}
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

          {activeTab === 'overview' && (
            <OverviewDashboard 
              historicalData={historicalData}
              forecastData={forecastData}
              metadata={metadata}
              onNavigateToMap={() => setActiveTab('map')}
              onNavigateToPredict={() => setActiveTab('prediction')}
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
