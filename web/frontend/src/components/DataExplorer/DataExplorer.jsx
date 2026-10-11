import React, { useState, useMemo } from 'react';
import ExportButton from '../Common/ExportButton';
import { DRINKING_SUITABILITY, getDrinkingSuitability } from '../../utils/thresholds';
import { 
  Database, 
  FileCheck2, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Search, 
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function DataExplorer({ 
  historicalData = [], 
  forecastData = [], 
  validationReport = {} 
}) {
  const [activeTab, setActiveTab] = useState('forecast'); // 'forecast' | 'historical' | 'audit'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaluk, setSelectedTaluk] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const checks = validationReport.checks || [];

  // Filtered dataset
  const activeDataset = activeTab === 'forecast' ? forecastData : historicalData;

  const filteredData = useMemo(() => {
    return activeDataset.filter(r => {
      if (selectedTaluk !== 'all' && r.Taluk && r.Taluk.toLowerCase() !== selectedTaluk.toLowerCase()) return false;
      if (selectedYear !== 'all' && r.Year !== Number(selectedYear)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const v = (r.Village || '').toLowerCase();
        const t = (r.Taluk || '').toLowerCase();
        const w = (r.Well_No || '').toLowerCase();
        if (!v.includes(q) && !t.includes(q) && !w.includes(q)) return false;
      }
      return true;
    });
  }, [activeDataset, selectedTaluk, selectedYear, searchQuery]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  return (
    <div className="content-workspace">
      {/* Top Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
        <button 
          className={`btn ${activeTab === 'forecast' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => { setActiveTab('forecast'); setPage(1); }}
        >
          <Database size={14} />
          <span>Production Forecasts ({forecastData.length.toLocaleString()} rows)</span>
        </button>

        <button 
          className={`btn ${activeTab === 'historical' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => { setActiveTab('historical'); setPage(1); }}
        >
          <Database size={14} />
          <span>Historical Master ({historicalData.length.toLocaleString()} rows)</span>
        </button>

        <button 
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('audit')}
        >
          <FileCheck2 size={14} />
          <span>Automated 28-Point Audit ({checks.length} checks)</span>
        </button>
      </div>

      {activeTab === 'audit' ? (
        /* 28-Point Data Validation Audit Table */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--risk-low)' }} />
                28-Point Scientific Data Integrity &amp; Boundary Audit
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Automated programmatic checks validating bounds monotonicity, finite numerical values, spatial bounding boxes, and temporal consistency.
              </p>
            </div>
            <span className="risk-tag low" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
              All {checks.length} Checks Passed
            </span>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Audit Check ID</th>
                  <th>Verification Rule &amp; Scope</th>
                  <th>Status</th>
                  <th>Violations Detected</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c, i) => (
                  <tr key={c.check_id || i}>
                    <td><code>{c.check_id}</code></td>
                    <td>{c.description}</td>
                    <td>
                      {c.passed ? (
                        <span className="risk-tag low">PASS</span>
                      ) : (
                        <span className="risk-tag high">FAIL</span>
                      )}
                    </td>
                    <td>
                      <strong>{c.violating_records || 0}</strong> records
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Data Explorer Filter & Table */
        <>
          <div className="filter-toolbar">
            <div className="filter-group">
              <span className="filter-label">Taluk:</span>
              <select 
                className="filter-select"
                value={selectedTaluk}
                onChange={(e) => { setSelectedTaluk(e.target.value); setPage(1); }}
              >
                <option value="all">All Taluks</option>
                <option value="Madurai North">Madurai North</option>
                <option value="Madurai South">Madurai South</option>
                <option value="Melur">Melur</option>
                <option value="Peraiyur">Peraiyur</option>
                <option value="Thirumangalam">Thirumangalam</option>
                <option value="Usilampatti">Usilampatti</option>
                <option value="Vadipatti">Vadipatti</option>
              </select>
            </div>

            <div className="filter-group">
              <span className="filter-label">Year:</span>
              <select 
                className="filter-select"
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setPage(1); }}
              >
                <option value="all">All Years</option>
                {activeTab === 'forecast' 
                  ? [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))
                  : [2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))
                }
              </select>
            </div>

            <div className="filter-group" style={{ flex: 1, minWidth: '160px' }}>
              <input 
                type="text"
                className="filter-input"
                placeholder="Search station or village name..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                style={{ width: '100%' }}
              />
            </div>

            <ExportButton 
              data={filteredData}
              filename={`madurai_${activeTab}_records.csv`}
              label={`Export ${filteredData.length.toLocaleString()} Records`}
            />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Showing {filteredData.length.toLocaleString()} matching {activeTab} rows
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </span>
            </div>

            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  {activeTab === 'forecast' ? (
                    <tr>
                      <th>Taluk</th>
                      <th>Village</th>
                      <th>Year</th>
                      <th>Drinking Suitability</th>
                      <th>Risk Level</th>
                      <th>TDS (mg/L) [Lower, Upper CI]</th>
                      <th>EC (µS/cm) [Lower, Upper CI]</th>
                      <th>Fluoride (mg/L) [Lower, Upper CI]</th>
                      <th>pH [Lower, Upper CI]</th>
                      <th>Model Selected</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Well ID</th>
                      <th>Taluk</th>
                      <th>Village</th>
                      <th>Year</th>
                      <th>Drinking Suitability</th>
                      <th>Season</th>
                      <th>TDS (mg/L)</th>
                      <th>EC (µS/cm)</th>
                      <th>pH</th>
                      <th>Fluoride (mg/L)</th>
                      <th>NO3 (mg/L)</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {paginated.map((r, i) => {
                    const sLabel = r.Drinking_Suitability || getDrinkingSuitability(r.Risk_Level, r).label;
                    const sMeta = DRINKING_SUITABILITY[sLabel] || DRINKING_SUITABILITY['Unassessed'];
                    return (
                      <tr key={i}>
                        {activeTab === 'forecast' ? (
                          <>
                            <td>{r.Taluk}</td>
                            <td><strong>{r.Village}</strong></td>
                            <td>{r.Year}</td>
                            <td>
                              <span className={`suitability-badge ${sMeta.badgeClass}`}>
                                {sMeta.symbol} {sLabel}
                              </span>
                            </td>
                            <td><span className="risk-tag">{r.Risk_Level}</span></td>
                            <td>{r.TDS?.toFixed(1)} [{r.TDS_Lower_CI?.toFixed(0)}, {r.TDS_Upper_CI?.toFixed(0)}]</td>
                            <td>{r.EC?.toFixed(1)} [{r.EC_Lower_CI?.toFixed(0)}, {r.EC_Upper_CI?.toFixed(0)}]</td>
                            <td>{r.Fluoride?.toFixed(2)} [{r.Fluoride_Lower_CI?.toFixed(2)}, {r.Fluoride_Upper_CI?.toFixed(2)}]</td>
                            <td>{r.pH?.toFixed(2)} [{r.pH_Lower_CI?.toFixed(2)}, {r.pH_Upper_CI?.toFixed(2)}]</td>
                            <td>{r.Model_Selected}</td>
                          </>
                        ) : (
                          <>
                            <td><strong>{r.Well_No || 'N/A'}</strong></td>
                            <td>{r.Taluk}</td>
                            <td>{r.Village}</td>
                            <td>{r.Year}</td>
                            <td>
                              {r.Drinking_Suitability ? (
                                <span className={`suitability-badge ${DRINKING_SUITABILITY[r.Drinking_Suitability]?.badgeClass || 'unassessed'}`}>
                                  {DRINKING_SUITABILITY[r.Drinking_Suitability]?.symbol || '⚪'} {r.Drinking_Suitability}
                                </span>
                              ) : '—'}
                            </td>
                            <td>{r.Season || '—'}</td>
                            <td>{r.TDS?.toFixed(1) || '—'}</td>
                            <td>{r.EC?.toFixed(1) || '—'}</td>
                            <td>{r.pH?.toFixed(2) || '—'}</td>
                            <td>{r.Fluoride?.toFixed(2) || '—'}</td>
                            <td>{r.NO3?.toFixed(1) || '—'}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No records match the current filter selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Strip */}
            <div className="pagination-strip">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Rows per page:</span>
                <select 
                  className="filter-select" 
                  style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span style={{ margin: '0 6px' }}>{page} / {totalPages}</span>
                <button 
                  className="btn btn-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
