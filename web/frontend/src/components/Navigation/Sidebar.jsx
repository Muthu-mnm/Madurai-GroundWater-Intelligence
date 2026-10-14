import React, { useState } from 'react';
import { 
  Map, 
  Droplet, 
  Wheat, 
  HeartPulse, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Droplets,
  Layers,
  History,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Database,
  BookOpen,
  LayoutDashboard
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  setCollapsed, 
  mobileOpen, 
  setMobileOpen 
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Primary 5 Navigation Items mandated by Master Prompt
  const primaryNavItems = [
    { id: 'map', label: 'Interactive GIS Map', short: 'GIS Map', icon: Map },
    { id: 'water_quality', label: 'Water Quality', short: 'Water Quality', icon: Droplet },
    { id: 'agriculture', label: 'Agriculture', short: 'Agriculture', icon: Wheat },
    { id: 'health', label: 'Health Screening', short: 'Health', icon: HeartPulse },
    { id: 'combined', label: 'Combined Risk', short: 'Combined Risk', icon: ShieldAlert }
  ];

  // Secondary Tools under compact 'More' section
  const secondaryNavItems = [
    { id: 'historical', label: 'Historical Data (2007–2021)', icon: History },
    { id: 'forecast', label: 'Decadal Forecasts (2022–2030)', icon: TrendingUp },
    { id: 'prediction', label: 'Prediction Simulator', icon: Sparkles },
    { id: 'validation', label: 'Model Validation', icon: CheckCircle2 },
    { id: 'data', label: 'Data Explorer', icon: Database },
    { id: 'overview', label: 'District Overview', icon: LayoutDashboard },
    { id: 'methodology', label: 'Methodology & Guidelines', icon: BookOpen }
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (mobileOpen) setMobileOpen(false);
  };

  const isSecondaryActive = secondaryNavItems.some(item => item.id === activeTab);

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-wrapper" onClick={() => handleNavClick('map')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">
            <Droplets size={18} />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-title">Madurai Groundwater</span>
              <span className="brand-badge">Multi-Domain Intelligence</span>
            </div>
          )}
        </div>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ padding: '4px 6px' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="nav-list">
        <div style={{ 
          fontSize: '0.68rem', 
          fontWeight: 700, 
          letterSpacing: '0.08em', 
          textTransform: 'uppercase', 
          color: 'var(--text-muted)', 
          padding: '8px 14px 4px',
          display: collapsed ? 'none' : 'block'
        }}>
          Core Domains
        </div>

        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <div className="nav-item-icon">
                <Icon size={18} />
              </div>
              {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="nav-item-label">{item.label}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Separator */}
        <div style={{ height: '1px', background: 'var(--border-light)', margin: '10px 12px' }} />

        {/* Secondary 'More' Section */}
        {!collapsed ? (
          <div>
            <div 
              className={`nav-item ${isSecondaryActive ? 'active-parent' : ''}`}
              onClick={() => setMoreOpen(!moreOpen)}
              style={{ justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="nav-item-icon">
                  <Layers size={18} />
                </div>
                <span className="nav-item-label">More Tools & Data</span>
              </div>
              <ChevronDown 
                size={14} 
                style={{ 
                  transform: moreOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s ease',
                  color: 'var(--text-muted)'
                }} 
              />
            </div>

            {moreOpen && (
              <div style={{ paddingLeft: '12px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleNavClick(item.id)}
                      style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                    >
                      <div className="nav-item-icon" style={{ opacity: 0.85 }}>
                        <Icon size={15} />
                      </div>
                      <span className="nav-item-label">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          secondaryNavItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                title={item.label}
              >
                <div className="nav-item-icon">
                  <Icon size={18} />
                </div>
              </div>
            );
          })
        )}
      </nav>

      {/* Footer Info */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div><strong>Study Area:</strong> Madurai District</div>
          <div><strong>Models:</strong> WQ, Agri, Health & Combined</div>
          <div style={{ marginTop: '3px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            154 Stations &bull; 8 Taluks &bull; 2007–2030
          </div>
        </div>
      )}
    </aside>
  );
}
