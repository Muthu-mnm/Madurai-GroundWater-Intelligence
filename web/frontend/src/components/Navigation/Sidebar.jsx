import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  History, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Database, 
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  setCollapsed, 
  mobileOpen, 
  setMobileOpen 
}) {
  const navItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Interactive GIS Map', icon: Map },
    { id: 'historical', label: 'Historical Analysis', icon: History },
    { id: 'forecast', label: 'Forecast Explorer', icon: TrendingUp },
    { id: 'prediction', label: 'Prediction Simulator', icon: Sparkles },
    { id: 'risk', label: 'Risk Assessment', icon: ShieldAlert },
    { id: 'validation', label: 'Model Validation', icon: CheckCircle2 },
    { id: 'data', label: 'Data Explorer', icon: Database },
    { id: 'methodology', label: 'Methodology & About', icon: BookOpen },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-wrapper" onClick={() => handleNavClick('overview')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">
            <Droplets size={18} />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-title">Madurai Groundwater</span>
              <span className="brand-badge">Intelligence GIS</span>
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

      <nav className="nav-list">
        {navItems.map((item) => {
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
              {!collapsed && <span className="nav-item-label">{item.label}</span>}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          <div><strong>Study Area:</strong> Madurai District</div>
          <div><strong>Period:</strong> 2007–2030 (154 Villages)</div>
          <div style={{ marginTop: '4px', fontSize: '0.7rem' }}>TWAD & CGWB Monitoring Network</div>
        </div>
      )}
    </aside>
  );
}
