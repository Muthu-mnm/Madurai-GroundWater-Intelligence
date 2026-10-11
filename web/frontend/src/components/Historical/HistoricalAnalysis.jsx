import React, { useState, useMemo, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { THRESHOLDS } from '../../utils/thresholds';
import ExportButton from '../Common/ExportButton';
import { 
  History, 
  Search, 
  Filter, 
  BarChart2, 
  TrendingUp, 
  Table as TableIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function HistoricalAnalysis({ historicalData = [] }) {
  const [selectedParam, setSelectedParam] = useState('TDS');
  const [selectedTaluk, setSelectedTaluk] = useState('all');
  const [startYear, setStartYear] = useState(2007);
  const [endYear, setEndYear] = useState(2021);
  const [searchVillage, setSearchVillage] = useState('');
  
  // Table Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('Year');
  const [sortDir, setSortDir] = useState('desc');

  const trendChartRef = useRef(null);
  const exceedChartRef = useRef(null);
  const trendChartInst = useRef(null);
  const exceedChartInst = useRef(null);

  // Filtered dataset based on controls
  const filteredData = useMemo(() => {
    return historicalData.filter(d => {
      if (d.Year < startYear || d.Year > endYear) return false;
      if (selectedTaluk !== 'all' && d.Taluk && d.Taluk.toLowerCase() !== selectedTaluk.toLowerCase()) return false;
      if (searchVillage.trim() && d.Village && !d.Village.toLowerCase().includes(searchVillage.toLowerCase().trim())) return false;
      return true;
    });
  }, [historicalData, startYear, endYear, selectedTaluk, searchVillage]);

  // Statistical summary of the selected parameter
  const stats = useMemo(() => {
    const vals = filteredData
      .map(d => d[selectedParam])
      .filter(v => typeof v === 'number' && !isNaN(v))
      .sort((a, b) => a - b);

    if (!vals.length) return { count: 0, mean: 0, median: 0, min: 0, max: 0, std: 0, q1: 0, q3: 0, exceedanceRate: 0 };

    const count = vals.length;
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = +(sum / count).toFixed(2);
    const median = +(vals[Math.floor(count / 2)]).toFixed(2);
    const min = +vals[0].toFixed(2);
    const max = +vals[count - 1].toFixed(2);
    const q1 = +vals[Math.floor(count * 0.25)].toFixed(2);
    const q3 = +vals[Math.floor(count * 0.75)].toFixed(2);
    
    // Variance & Std
    const variance = vals.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / count;
    const std = +Math.sqrt(variance).toFixed(2);

    // Exceedance Rate
    const cfg = THRESHOLDS[selectedParam];
    let exceedCount = 0;
    if (cfg && cfg.permissible) {
      exceedCount = vals.filter(v => v > cfg.permissible).length;
    } else if (cfg && cfg.max) {
      exceedCount = vals.filter(v => v > cfg.max || v < cfg.min).length;
    }
    const exceedanceRate = +((exceedCount / count) * 100).toFixed(1);

    return { count, mean, median, min, max, std, q1, q3, exceedCount, exceedanceRate };
  }, [filteredData, selectedParam]);

  // Sorted and Paginated Records
  const paginatedRecords = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [filteredData, page, pageSize, sortField, sortDir]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  // Render Annual Trend Chart
  useEffect(() => {
    if (!trendChartRef.current) return;
    if (trendChartInst.current) trendChartInst.current.destroy();

    const annualStats = {};
    for (let y = startYear; y <= endYear; y++) {
      annualStats[y] = { sum: 0, count: 0 };
    }

    filteredData.forEach(d => {
      const y = d.Year;
      const v = d[selectedParam];
      if (annualStats[y] && typeof v === 'number' && !isNaN(v)) {
        annualStats[y].sum += v;
        annualStats[y].count += 1;
      }
    });

    const labels = Object.keys(annualStats);
    const means = labels.map(y => {
      const item = annualStats[y];
      return item.count ? +(item.sum / item.count).toFixed(2) : null;
    });

    const ctx = trendChartRef.current.getContext('2d');
    trendChartInst.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `Mean ${selectedParam} (${THRESHOLDS[selectedParam]?.unit || ''})`,
          data: means,
          borderColor: '#176B70',
          backgroundColor: 'rgba(23, 107, 112, 0.1)',
          fill: true,
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11, family: 'Inter' } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' } } },
          y: { 
            grid: { color: '#E2E8EC' }, 
            ticks: { font: { size: 11, family: 'Inter' } },
            title: { display: true, text: `${selectedParam} (${THRESHOLDS[selectedParam]?.unit || ''})` }
          }
        }
      }
    });

    return () => {
      if (trendChartInst.current) trendChartInst.current.destroy();
    };
  }, [filteredData, selectedParam, startYear, endYear]);

  // Render Exceedance Count Chart by Taluk
  useEffect(() => {
    if (!exceedChartRef.current) return;
    if (exceedChartInst.current) exceedChartInst.current.destroy();

    const taluks = ['Madurai North', 'Madurai South', 'Melur', 'Peraiyur', 'Thirumangalam', 'Usilampatti', 'Vadipatti'];
    const cfg = THRESHOLDS[selectedParam];

    const talukExceedances = taluks.map(t => {
      const records = filteredData.filter(d => d.Taluk && d.Taluk.toLowerCase() === t.toLowerCase());
      if (!records.length) return 0;
      let cnt = 0;
      records.forEach(r => {
        const v = r[selectedParam];
        if (typeof v === 'number') {
          if (cfg && cfg.permissible && v > cfg.permissible) cnt++;
          else if (cfg && cfg.max && (v > cfg.max || v < cfg.min)) cnt++;
        }
      });
      return cnt;
    });

    const ctx = exceedChartRef.current.getContext('2d');
    exceedChartInst.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: taluks,
        datasets: [{
          label: `Exceedance Observations (${selectedParam})`,
          data: talukExceedances,
          backgroundColor: '#DC2626',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' } } },
          y: { 
            grid: { color: '#E2E8EC' }, 
            ticks: { font: { size: 11, family: 'Inter' } },
            title: { display: true, text: 'Exceedance Count' }
          }
        }
      }
    });

    return () => {
      if (exceedChartInst.current) exceedChartInst.current.destroy();
    };
  }, [filteredData, selectedParam]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="content-workspace">
      {/* Control Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <span className="filter-label"><Filter size={14} style={{ display: 'inline', marginRight: 4 }} /> Parameter:</span>
          <select 
            className="filter-select"
            value={selectedParam}
            onChange={(e) => { setSelectedParam(e.target.value); setPage(1); }}
          >
            <option value="TDS">TDS (mg/L)</option>
            <option value="EC">EC (µS/cm)</option>
            <option value="Fluoride">Fluoride (mg/L)</option>
            <option value="pH">pH</option>
            <option value="NO3">Nitrate (mg/L)</option>
            <option value="HAR_Total">Total Hardness (mg/L)</option>
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Taluk:</span>
          <select 
            className="filter-select"
            value={selectedTaluk}
            onChange={(e) => { setSelectedTaluk(e.target.value); setPage(1); }}
          >
            <option value="all">All 7 Taluks</option>
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
          <span className="filter-label">Years:</span>
          <select 
            className="filter-select"
            value={startYear}
            onChange={(e) => { setStartYear(Number(e.target.value)); setPage(1); }}
          >
            {[2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span style={{ color: 'var(--text-secondary)' }}>to</span>
          <select 
            className="filter-select"
            value={endYear}
            onChange={(e) => { setEndYear(Number(e.target.value)); setPage(1); }}
          >
            {[2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ flex: 1, minWidth: '150px' }}>
          <input 
            type="text"
            className="filter-input"
            placeholder="Search village name..."
            value={searchVillage}
            onChange={(e) => { setSearchVillage(e.target.value); setPage(1); }}
            style={{ width: '100%' }}
          />
        </div>

        <ExportButton 
          data={filteredData}
          filename={`madurai_historical_${selectedParam}_${startYear}_${endYear}.csv`}
          label="Export Filtered CSV"
        />
      </div>

      {/* Summary Statistical Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '12px 14px' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Observations</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.count.toLocaleString()}</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Valid records</span>
        </div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Mean</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{stats.mean}</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{THRESHOLDS[selectedParam]?.unit || ''}</span>
        </div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Median</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.median}</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>50th Percentile</span>
        </div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Min – Max</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{stats.min} – {stats.max}</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Observed span</span>
        </div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Std Deviation</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.std}</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dispersion</span>
        </div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Exceedance Rate</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stats.exceedanceRate > 10 ? 'var(--risk-high)' : 'var(--risk-borderline)' }}>
            {stats.exceedanceRate}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{stats.exceedCount} breach events</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp size={16} style={{ color: 'var(--accent-primary)' }} />
                Longitudinal Annual Trend ({startYear}–{endYear})
              </h3>
              <p className="card-subtitle">Annual mean {selectedParam} values across filtered monitoring stations.</p>
            </div>
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            <canvas ref={trendChartRef}></canvas>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <BarChart2 size={16} style={{ color: 'var(--accent-primary)' }} />
                Taluk Exceedance Events
              </h3>
              <p className="card-subtitle">Exceedance count across Madurai's 7 taluks.</p>
            </div>
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            <canvas ref={exceedChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Historical Records Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TableIcon size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Historical Groundwater Records Table ({filteredData.length.toLocaleString()} total rows)
            </h3>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('Well_No')}>Well ID</th>
                <th className="sortable" onClick={() => handleSort('Taluk')}>Taluk</th>
                <th className="sortable" onClick={() => handleSort('Village')}>Village</th>
                <th className="sortable" onClick={() => handleSort('Year')}>Year</th>
                <th className="sortable" onClick={() => handleSort('Date')}>Date</th>
                <th className="sortable" onClick={() => handleSort('TDS')}>TDS (mg/L)</th>
                <th className="sortable" onClick={() => handleSort('EC')}>EC (µS/cm)</th>
                <th className="sortable" onClick={() => handleSort('pH')}>pH</th>
                <th className="sortable" onClick={() => handleSort('Fluoride')}>Fluoride (mg/L)</th>
                <th className="sortable" onClick={() => handleSort('NO3')}>NO3 (mg/L)</th>
                <th className="sortable" onClick={() => handleSort('SAR')}>SAR</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map((r, i) => (
                <tr key={`${r.Well_No}-${r.Year}-${i}`}>
                  <td><strong>{r.Well_No || 'N/A'}</strong></td>
                  <td>{r.Taluk}</td>
                  <td>{r.Village}</td>
                  <td>{r.Year}</td>
                  <td>{r.Date || '—'}</td>
                  <td>{typeof r.TDS === 'number' ? r.TDS.toFixed(1) : '—'}</td>
                  <td>{typeof r.EC === 'number' ? r.EC.toFixed(1) : '—'}</td>
                  <td>{typeof r.pH === 'number' ? r.pH.toFixed(2) : '—'}</td>
                  <td>{typeof r.Fluoride === 'number' ? r.Fluoride.toFixed(2) : '—'}</td>
                  <td>{typeof r.NO3 === 'number' ? r.NO3.toFixed(1) : '—'}</td>
                  <td>{typeof r.SAR === 'number' ? r.SAR.toFixed(2) : '—'}</td>
                </tr>
              ))}
              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No historical records match the chosen filter criteria.
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
    </div>
  );
}
