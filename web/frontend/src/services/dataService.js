/**
 * Central Client-Side Data Service
 * Loads local pre-rendered JSON datasets with transparent fallback.
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
        this.surfaces = await res.json();
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
        // fallback
      }
      if (!this.metadata) {
        const res = await fetch('/data/metadata.json');
        this.metadata = await res.json();
      }
    }
    return this.metadata;
  }

  async getHistorical() {
    if (!this.historical) {
      try {
        const res = await fetch('/data/historical_groundwater_2007_2021.json');
        this.historical = await res.json();
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
        this.forecasts = await res.json();
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
        this.metrics = await res.json();
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
        this.validation = await res.json();
      } catch (e) {
        console.error("Failed to load validation data", e);
      }
    }
    return this.validation;
  }

  async getGeoJSON(layer) {
    const layerMap = {
      district: '/data/madurai_district_boundary.geojson',
      taluks: '/data/madurai_taluks.geojson',
      stations: '/data/madurai_stations.geojson'
    };

    const path = layerMap[layer];
    if (!path) return null;

    try {
      const res = await fetch(path);
      return await res.json();
    } catch (e) {
      console.error(`Failed to load GeoJSON layer ${layer}`, e);
      return null;
    }
  }

  exportCSV(data, filename) {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const escaped = ('' + (row[header] ?? '')).replace(/"/g, '\\"');
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
