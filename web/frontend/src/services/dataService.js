/**
 * Central Client-Side Data Service
 * Loads local pre-rendered JSON datasets and interacts with FastAPI backend.
 */

class ClientDataService {
  constructor() {
    this.metadata = null;
    this.historical = null;
    this.forecasts = null;
    this.metrics = null;
    this.validation = null;
    this.districtGeo = null;
    this.taluksGeo = null;
    this.stationsGeo = null;
    this.surfaces = null;
  }

  async getSurfaces() {
    if (!this.surfaces) {
      try {
        const res = await fetch('/data/interpolation_surfaces.json');
        if (res.ok) this.surfaces = await res.json();
      } catch (e) {
        console.error("Failed to load interpolation surfaces", e);
      }
    }
    return this.surfaces;
  }

  async getMetadata() {
    if (!this.metadata) {
      try {
        const res = await fetch('/api/metadata');
        if (res.ok) this.metadata = await res.json();
      } catch (e) {
        // fallback to static file
      }
      if (!this.metadata) {
        try {
          const res = await fetch('/data/metadata.json');
          if (res.ok) this.metadata = await res.json();
        } catch (e) {
          console.error("Failed to load metadata.json", e);
        }
      }
    }
    return this.metadata;
  }

  async getHistorical() {
    if (!this.historical) {
      try {
        const res = await fetch('/data/historical_groundwater_2007_2021.json');
        if (res.ok) this.historical = await res.json();
      } catch (e) {
        console.error("Failed to load historical data", e);
        this.historical = [];
      }
    }
    return this.historical;
  }

  async getForecasts() {
    if (!this.forecasts) {
      try {
        const res = await fetch('/data/forecast_results_2022_2030.json');
        if (res.ok) this.forecasts = await res.json();
      } catch (e) {
        console.error("Failed to load forecast data", e);
        this.forecasts = [];
      }
    }
    return this.forecasts;
  }

  async getMetrics() {
    if (!this.metrics) {
      try {
        const res = await fetch('/data/model_validation_metrics.json');
        if (res.ok) this.metrics = await res.json();
      } catch (e) {
        console.error("Failed to load metrics data", e);
      }
    }
    return this.metrics;
  }

  async getValidation() {
    if (!this.validation) {
      try {
        const res = await fetch('/data/data_validation_report.json');
        if (res.ok) this.validation = await res.json();
      } catch (e) {
        console.error("Failed to load validation data", e);
      }
    }
    return this.validation;
  }

  async getGeoJSON(layer, year = null, domain = 'combined') {
    // If year and domain provided, attempt backend dynamic enrichment
    if (year !== null && layer === 'stations') {
      try {
        const res = await fetch(`/api/geojson/stations?year=${year}&domain=${domain}`);
        if (res.ok) return await res.json();
      } catch (e) {
        // fallback to static
      }
    }

    const layerMap = {
      district: '/data/madurai_district_boundary.geojson',
      taluks: '/data/madurai_taluks.geojson',
      stations: '/data/madurai_stations.geojson'
    };

    const path = layerMap[layer];
    if (!path) return null;

    try {
      const res = await fetch(path);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(`Failed to load GeoJSON layer ${layer}`, e);
      return null;
    }
    return null;
  }

  async getModelsStatus() {
    try {
      const res = await fetch('/api/models/status');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Could not fetch models status from API", e);
    }
    return null;
  }

  async getAssessmentsSummary(year = 2026) {
    try {
      const res = await fetch(`/api/assessments/summary?year=${year}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Could not fetch assessments summary from API", e);
    }
    return null;
  }

  async getStationAssessment(village, taluk = null, year = 2026) {
    try {
      let url = `/api/assessments/location?village=${encodeURIComponent(village)}&year=${year}`;
      if (taluk) url += `&taluk=${encodeURIComponent(taluk)}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`Could not fetch assessment for ${village}`, e);
    }
    return null;
  }

  async getAssessmentsList(year = 2026, taluk = null, village = null, domain = 'combined', riskClass = null, page = 1, pageSize = 50) {
    try {
      let url = `/api/assess/combined?year=${year}&domain=${domain}&page=${page}&page_size=${pageSize}`;
      if (taluk && taluk.toLowerCase() !== 'all') url += `&taluk=${encodeURIComponent(taluk)}`;
      if (village) url += `&village=${encodeURIComponent(village)}`;
      if (riskClass && riskClass.toLowerCase() !== 'all') url += `&risk_class=${encodeURIComponent(riskClass)}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Could not fetch assessments list from API", e);
    }
    return null;
  }

  async assessCustomInput(domain, payload) {
    const epMap = {
      water_quality: '/api/assess/water-quality',
      agriculture: '/api/assess/agriculture',
      health: '/api/assess/health',
      combined: '/api/assess/combined'
    };
    const endpoint = epMap[domain] || '/api/assess/combined';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Assessment request failed with status ${res.status}`);
    return await res.json();
  }

  exportCSV(data, filename) {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const str = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const clientDataService = new ClientDataService();
