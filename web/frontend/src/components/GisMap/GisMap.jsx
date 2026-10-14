import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { THRESHOLDS, VULNERABILITY_CLASSES, getVulnerabilityMeta, DOMAIN_METADATA } from '../../utils/thresholds';
import MapLegend from './MapLegend';
import StationDetailModal from './StationDetailModal';
import { 
  Layers, 
  RotateCcw, 
  MapPin, 
  Eye, 
  EyeOff, 
  Calendar,
  Filter,
  Sliders,
  Sparkles,
  Droplet,
  Wheat,
  HeartPulse,
  ShieldAlert,
  Search
} from 'lucide-react';

export default function GisMap({ 
  historicalData = [], 
  forecastData = [], 
  districtGeo = null, 
  taluksGeo = null, 
  stationsGeo = null,
  surfaces = null,
  theme = 'light'
}) {
  const mapContainerRef = useRef(null);
  const mapInst = useRef(null);
  const tileLayerRef = useRef(null);
  const districtLayerRef = useRef(null);
  const maskLayerRef = useRef(null);
  const talukLayerRef = useRef(null);
  const stationLayerRef = useRef(null);
  const surfaceLayerRef = useRef(null);

  // Map Filter State
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedDomain, setSelectedDomain] = useState('combined'); // 'combined' | 'water_quality' | 'agriculture' | 'health'
  const [selectedTaluk, setSelectedTaluk] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('all');
  
  // Basemap State: Clean Light OpenStreetMap by default
  const [activeBasemap, setActiveBasemap] = useState('osm');

  // Surface & Opacity State (Enabled by default with dynamic opacity slider)
  const [showSurface, setShowSurface] = useState(true);
  const [surfaceOpacity, setSurfaceOpacity] = useState(0.55);
  const [showTalukBoundaries, setShowTalukBoundaries] = useState(true);
  const [showStationMarkers, setShowStationMarkers] = useState(true);

  // Inspector Modal State
  const [selectedStation, setSelectedStation] = useState(null);

  // Basemap definitions
  const basemaps = {
    'osm': {
      name: 'OpenStreetMap (Clean Light)',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attrib: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    },
    'google-satellite': {
      name: 'Google Satellite (Hybrid)',
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attrib: '&copy; Google Maps',
      maxZoom: 20
    },
    'esri-satellite': {
      name: 'Esri Satellite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attrib: '&copy; Esri, Maxar',
      maxZoom: 18
    },
    'topo': {
      name: 'Esri Topographic',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attrib: '&copy; Esri, USGS, NOAA',
      maxZoom: 18
    }
  };

  const TALUK_BOUNDARY_COLORS = {
    'Madurai East': '#0284c7',
    'Madurai North': '#00E5FF',
    'Madurai South': '#FACC15',
    'Melur': '#10B981',
    'Peraiyur': '#A855F7',
    'Thirumangalam': '#F43F5E',
    'Usilampatti': '#FB923C',
    'Vadipatti': '#38BDF8'
  };

  const colorRamps = {
    TDS: [
      { val: 400, color: [13, 148, 136] },  // Low: Teal
      { val: 750, color: [2, 132, 199] },   // Low-Mod: Sky
      { val: 1250, color: [217, 119, 6] },  // Mod: Amber
      { val: 2000, color: [234, 88, 12] },  // High: Orange
      { val: 3200, color: [220, 38, 38] }   // Very High: Red
    ],
    EC: [
      { val: 600, color: [13, 148, 136] },
      { val: 1200, color: [2, 132, 199] },
      { val: 2250, color: [217, 119, 6] },
      { val: 3500, color: [234, 88, 12] },
      { val: 5000, color: [220, 38, 38] }
    ],
    Fluoride: [
      { val: 0.7, color: [13, 148, 136] },
      { val: 1.0, color: [2, 132, 199] },
      { val: 1.5, color: [217, 119, 6] },
      { val: 2.0, color: [234, 88, 12] },
      { val: 3.0, color: [220, 38, 38] }
    ],
    GWQI: [
      { val: 80, color: [13, 148, 136] },   // Low: Teal
      { val: 120, color: [2, 132, 199] },   // Moderate: Sky
      { val: 180, color: [217, 119, 6] },   // Elevated: Amber
      { val: 240, color: [234, 88, 12] },   // High: Orange
      { val: 300, color: [220, 38, 38] }    // Very High: Red
    ]
  };

  function getInterpolatedRgb(ramp, val) {
    if (val <= ramp[0].val) return ramp[0].color;
    if (val >= ramp[ramp.length - 1].val) return ramp[ramp.length - 1].color;

    for (let i = 0; i < ramp.length - 1; i++) {
      const lower = ramp[i];
      const upper = ramp[i + 1];
      if (val >= lower.val && val <= upper.val) {
        const factor = (val - lower.val) / (upper.val - lower.val);
        return [
          Math.round(lower.color[0] + factor * (upper.color[0] - lower.color[0])),
          Math.round(lower.color[1] + factor * (upper.color[1] - lower.color[1])),
          Math.round(lower.color[2] + factor * (upper.color[2] - lower.color[2]))
        ];
      }
    }
    return ramp[0].color;
  }

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInst.current) {
      const map = L.map(mapContainerRef.current, {
        center: [9.9252, 78.1198],
        zoom: 10,
        minZoom: 9,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      map.createPane('maskPane');
      map.getPane('maskPane').style.zIndex = 250;

      map.createPane('surfacePane');
      map.getPane('surfacePane').style.zIndex = 300;

      map.createPane('districtPane');
      map.getPane('districtPane').style.zIndex = 350;

      map.createPane('talukPane');
      map.getPane('talukPane').style.zIndex = 400;

      map.createPane('stationPane');
      map.getPane('stationPane').style.zIndex = 500;

      mapInst.current = map;
    }

    return () => {
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
  }, []);

  // 2. Tile Layer Update
  useEffect(() => {
    if (!mapInst.current) return;

    if (tileLayerRef.current) {
      mapInst.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const bm = basemaps[activeBasemap] || basemaps['osm'];
    tileLayerRef.current = L.tileLayer(bm.url, {
      maxZoom: bm.maxZoom,
      attribution: bm.attrib
    }).addTo(mapInst.current);

    tileLayerRef.current.bringToBack();
  }, [activeBasemap]);

  // 3. District Boundary Line
  useEffect(() => {
    if (!mapInst.current || !districtGeo) return;
    if (districtLayerRef.current) {
      mapInst.current.removeLayer(districtLayerRef.current);
      districtLayerRef.current = null;
    }

    districtLayerRef.current = L.geoJSON(districtGeo, {
      pane: 'districtPane',
      style: {
        color: '#0f766e',
        weight: 3.0,
        opacity: 0.95,
        fill: false
      }
    }).addTo(mapInst.current);

    const bounds = districtLayerRef.current.getBounds();
    mapInst.current.fitBounds(bounds, { padding: [15, 15] });
    mapInst.current.setMaxBounds(bounds.pad(0.35));
  }, [districtGeo]);

  // 4. Continuous IDW Interpolation Raster Surface with Opacity
  useEffect(() => {
    if (!mapInst.current || !surfaces || !surfaces.surfaces) return;

    if (surfaceLayerRef.current) {
      mapInst.current.removeLayer(surfaceLayerRef.current);
      surfaceLayerRef.current = null;
    }

    if (!showSurface) return;

    const surfData = surfaces.surfaces;
    let targetParamKey = 'TDS';
    let rampKey = 'TDS';

    if (selectedDomain === 'health') {
      targetParamKey = 'F';
      rampKey = 'Fluoride';
    } else if (selectedDomain === 'agriculture') {
      targetParamKey = 'EC_GEN';
      rampKey = 'EC';
    } else if (selectedDomain === 'water_quality') {
      targetParamKey = 'TDS';
      rampKey = 'TDS';
    } else {
      targetParamKey = 'GWQI_2026_ML' in (surfData.parameters || {}) 
        ? 'GWQI_2026_ML' 
        : ('GWQI' in (surfData.parameters || {}) ? 'GWQI' : 'TDS');
      rampKey = (targetParamKey === 'TDS') ? 'TDS' : 'GWQI';
    }

    const pData = surfData.parameters[targetParamKey] || surfData.parameters['TDS'];
    if (!pData || !pData.grid) return;

    const bounds = surfData.meta.bounds;
    const southWest = L.latLng(bounds[1], bounds[0]);
    const northEast = L.latLng(bounds[3], bounds[2]);
    const imageBounds = L.latLngBounds(southWest, northEast);

    const gridRes = surfData.meta.grid_res;
    const canvas = document.createElement('canvas');
    canvas.width = gridRes;
    canvas.height = gridRes;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(gridRes, gridRes);
    const data = imgData.data;

    const grid = pData.grid;
    const ramp = colorRamps[rampKey] || colorRamps.TDS;

    for (let y = 0; y < gridRes; y++) {
      const srcRow = gridRes - 1 - y;
      for (let x = 0; x < gridRes; x++) {
        const val = grid[srcRow][x];
        const idx = (y * gridRes + x) * 4;

        if (val === null || val === undefined) {
          data[idx + 3] = 0;
        } else {
          const rgb = getInterpolatedRgb(ramp, val);
          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = 235;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const dataUrl = canvas.toDataURL();

    surfaceLayerRef.current = L.imageOverlay(dataUrl, imageBounds, {
      pane: 'surfacePane',
      opacity: surfaceOpacity,
      interactive: false
    });

    surfaceLayerRef.current.addTo(mapInst.current);
    if (tileLayerRef.current) tileLayerRef.current.bringToBack();
  }, [surfaces, selectedDomain, showSurface]);

  // Update surface opacity dynamically without re-rasterizing
  useEffect(() => {
    if (surfaceLayerRef.current) {
      surfaceLayerRef.current.setOpacity(showSurface ? surfaceOpacity : 0);
    }
  }, [surfaceOpacity, showSurface]);

  // 5. Taluk Boundaries
  useEffect(() => {
    if (!mapInst.current || !taluksGeo) return;

    if (talukLayerRef.current) {
      mapInst.current.removeLayer(talukLayerRef.current);
      talukLayerRef.current = null;
    }

    if (!showTalukBoundaries) return;

    talukLayerRef.current = L.geoJSON(taluksGeo, {
      pane: 'talukPane',
      style: (feature) => {
        const talukName = feature.properties.Taluk || '';
        const lineColor = TALUK_BOUNDARY_COLORS[talukName] || '#0284c7';
        const hasTalukSelection = selectedTaluk !== 'all';
        const isMatch = hasTalukSelection && (talukName.toLowerCase() === selectedTaluk.toLowerCase());

        if (hasTalukSelection) {
          if (isMatch) {
            return {
              fill: true,
              fillColor: lineColor,
              fillOpacity: 0.08,
              weight: 3.8,
              opacity: 1.0,
              color: lineColor,
              dashArray: null
            };
          } else {
            return {
              fill: true,
              fillColor: '#FFFFFF',
              fillOpacity: 0.001,
              weight: 1.0,
              opacity: 0.35,
              color: '#94a3b8',
              dashArray: '3, 4'
            };
          }
        } else {
          return {
            fill: true,
            fillColor: '#FFFFFF',
            fillOpacity: 0.001,
            weight: 2.0,
            opacity: 0.85,
            color: lineColor,
            dashArray: '4, 2'
          };
        }
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const lineColor = TALUK_BOUNDARY_COLORS[p.Taluk] || '#0284c7';

        layer.bindTooltip(`
          <div style="font-family:Inter,sans-serif; font-size:12px;">
            <strong style="color:${lineColor}; font-size:13px;">${p.Taluk} Taluk</strong><br/>
            <span style="font-size:11px; color:#0284c7; font-weight:600;">Click to filter stations in ${p.Taluk}</span>
          </div>
        `, { sticky: true });

        layer.on({
          click: (e) => {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
            if (selectedTaluk.toLowerCase() === (p.Taluk || '').toLowerCase()) {
              setSelectedTaluk('all');
              if (districtLayerRef.current) {
                mapInst.current.fitBounds(districtLayerRef.current.getBounds(), { padding: [15, 15] });
              }
            } else {
              setSelectedTaluk(p.Taluk);
              mapInst.current.fitBounds(layer.getBounds(), { padding: [25, 25] });
            }
          }
        });
      }
    }).addTo(mapInst.current);
  }, [taluksGeo, selectedTaluk, showTalukBoundaries]);

  // 6. Evaluate Multi-Domain Classification for Each Station
  const getStationDomainAssessment = (st) => {
    const f = Number(st.Fluoride);
    const ec = Number(st.EC);
    const tds = Number(st.TDS);
    const ph = Number(st.pH);
    const cl = Number(st.Cl);
    const ca = Number(st.Ca);
    const mg = Number(st.Mg);
    const sar = Number(st.SAR);
    const rsc = Number(st.RSC);
    const naPct = Number(st['Na%']);
    const no3 = Number(st.NO3);

    const hasCl = !isNaN(cl) && cl !== null;
    const hasCa = !isNaN(ca) && ca !== null;
    const hasMg = !isNaN(mg) && mg !== null;
    const hasNo3 = !isNaN(no3) && no3 !== null;
    const hasSar = !isNaN(sar) && sar !== null;
    const hasRsc = !isNaN(rsc) && rsc !== null;
    const hasNaPct = !isNaN(naPct) && naPct !== null;

    // 1. Water Quality Domain (pH, EC, TDS, Fluoride, NO3, Cl, Ca, Mg)
    let wq = 'Low Vulnerability';
    if (f > 3.0 || tds > 3000 || ec > 4000 || (hasCl && cl > 1500) || (hasNo3 && no3 > 100) || (hasCa && ca > 300) || (hasMg && mg > 150) || ph < 5.0 || ph > 9.5) wq = 'Very High Vulnerability';
    else if (f > 1.5 || tds > 2000 || ec > 2250 || (hasCl && cl > 1000) || (hasNo3 && no3 > 45) || (hasCa && ca > 200) || (hasMg && mg > 100) || ph < 6.5 || ph > 8.5) wq = 'High Vulnerability';
    else if (tds > 500 || f > 1.0 || ec > 750 || (hasCl && cl > 250) || (hasCa && ca > 75) || (hasMg && mg > 30) || (st.Fluoride_Upper_CI && Number(st.Fluoride_Upper_CI) > 1.5)) wq = 'Moderate Vulnerability';

    // 2. Agriculture Domain (EC, SAR, RSC, Na%, pH)
    let agri = 'Low Vulnerability';
    if (isNaN(ec)) agri = 'Insufficient Data';
    else if (ec > 4000 || (hasSar && sar > 26) || (hasRsc && rsc > 3.5) || (hasNaPct && naPct > 80) || ph > 9.0) agri = 'Very High Vulnerability';
    else if (ec > 2250 || (hasSar && sar > 18) || (hasRsc && rsc > 2.5) || (hasNaPct && naPct > 60) || ph < 6.0) agri = 'High Vulnerability';
    else if (ec > 750 || (hasSar && sar > 10) || (hasRsc && rsc > 1.25) || (hasNaPct && naPct > 40) || ph > 8.4) agri = 'Moderate Vulnerability';

    // 3. Health Domain (Fluoride, NO3, TDS, pH, Cl)
    let health = 'Low Vulnerability';
    if (isNaN(f)) health = 'Insufficient Data';
    else if (f > 3.0 || (hasNo3 && no3 > 100) || tds > 3000 || (hasCl && cl > 1500) || ph < 5.0 || ph > 9.5) health = 'Very High Vulnerability';
    else if (f > 1.5 || (hasNo3 && no3 > 45) || tds > 2000 || (hasCl && cl > 1000) || ph < 6.5 || ph > 8.5) health = 'High Vulnerability';
    else if (f > 1.0 || (st.Fluoride_Upper_CI && Number(st.Fluoride_Upper_CI) > 1.5) || tds > 500 || (hasCl && cl > 250)) health = 'Moderate Vulnerability';

    // 4. Combined Protective
    let combined = 'Low Vulnerability';
    const list = [wq, agri, health];
    if (list.includes('Very High Vulnerability')) combined = 'Very High Vulnerability';
    else if (list.includes('High Vulnerability')) combined = 'High Vulnerability';
    else if (list.includes('Moderate Vulnerability')) combined = 'Moderate Vulnerability';

    return { wq, agri, health, combined };
  };

  // 7. Display Stations Filter
  const displayStations = useMemo(() => {
    const isForecast = selectedYear >= 2022;
    const source = isForecast ? forecastData : historicalData;
    let list = source.filter(d => d.Year === selectedYear);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(d => 
        (d.Village && d.Village.toLowerCase().includes(q)) ||
        (d.Taluk && d.Taluk.toLowerCase().includes(q)) ||
        (d.Well_No && d.Well_No.toLowerCase().includes(q))
      );
    }

    if (selectedRisk !== 'all') {
      list = list.filter(st => {
        const ass = getStationDomainAssessment(st);
        const activeClass = ass[selectedDomain] || ass.combined;
        return activeClass.toLowerCase().includes(selectedRisk.toLowerCase());
      });
    }

    return list;
  }, [selectedYear, selectedDomain, selectedRisk, searchQuery, forecastData, historicalData]);

  // 8. Render Station Markers (Thematically Colored by Active Domain)
  useEffect(() => {
    if (!mapInst.current) return;

    if (stationLayerRef.current) {
      mapInst.current.removeLayer(stationLayerRef.current);
      stationLayerRef.current = null;
    }

    if (!showStationMarkers) return;

    const markers = L.layerGroup();
    const hasTalukSelection = selectedTaluk !== 'all';

    displayStations.forEach(st => {
      const lat = st.Latitude;
      const lon = st.Longitude;
      if (!lat || !lon) return;

      const isStationInSelectedTaluk = !hasTalukSelection || 
        (st.Taluk && st.Taluk.toLowerCase() === selectedTaluk.toLowerCase());

      const isCurrentSelectedStation = selectedStation && (
        (selectedStation.Village && st.Village && selectedStation.Village.toLowerCase() === st.Village.toLowerCase()) ||
        (selectedStation.Well_No && st.Well_No && selectedStation.Well_No === st.Well_No)
      );

      const ass = getStationDomainAssessment(st);
      const activeClass = ass[selectedDomain] || ass.combined;
      const meta = getVulnerabilityMeta(activeClass);
      const markerColor = meta.color;

      let markerOptions;
      if (hasTalukSelection) {
        if (isStationInSelectedTaluk) {
          markerOptions = {
            pane: 'stationPane',
            interactive: true,
            radius: isCurrentSelectedStation ? 11 : 7.5,
            fillColor: markerColor,
            color: isCurrentSelectedStation ? '#00E5FF' : '#FFFFFF',
            weight: isCurrentSelectedStation ? 3.5 : 1.8,
            opacity: 1,
            fillOpacity: 0.95
          };
        } else {
          markerOptions = {
            pane: 'stationPane',
            interactive: true,
            radius: isCurrentSelectedStation ? 8 : 5,
            fillColor: '#94a3b8',
            color: 'rgba(255, 255, 255, 0.4)',
            weight: 1.0,
            opacity: 0.4,
            fillOpacity: 0.35
          };
        }
      } else {
        markerOptions = {
          pane: 'stationPane',
          interactive: true,
          radius: isCurrentSelectedStation ? 11 : 7.5,
          fillColor: markerColor,
          color: isCurrentSelectedStation ? '#00E5FF' : '#FFFFFF',
          weight: isCurrentSelectedStation ? 3.5 : 1.8,
          opacity: 1,
          fillOpacity: 0.95
        };
      }

      const marker = L.circleMarker([lat, lon], markerOptions);

      const tooltipContent = `
        <div style="font-family:Inter,sans-serif; font-size:12px; min-width:160px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
            <strong style="font-size:13px; color:#0f172a;">${st.Village}</strong>
            <span style="font-size:10px; color:#64748b;">${st.Taluk}</span>
          </div>
          <div style="display:inline-block; padding:2px 6px; border-radius:3px; font-size:10px; font-weight:700; background:${meta.bg}; color:${meta.color}; border:1px solid ${meta.border}; margin-bottom:4px;">
            ${activeClass}
          </div>
          <div style="font-size:11px; color:#475569;">
            <span>TDS: <b>${st.TDS ? Number(st.TDS).toFixed(0) : '—'}</b> mg/L</span><br/>
            <span>Fluoride: <b>${st.Fluoride ? Number(st.Fluoride).toFixed(2) : '—'}</b> mg/L</span>
          </div>
          <div style="font-size:10px; color:#0284c7; margin-top:3px; font-weight:600;">
            👉 Click to inspect all 4 domains
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, { sticky: true });
      marker.on('click', () => setSelectedStation(st));
      markers.addLayer(marker);
    });

    stationLayerRef.current = markers;
    stationLayerRef.current.addTo(mapInst.current);
  }, [displayStations, selectedDomain, selectedTaluk, showStationMarkers, selectedStation]);

  const resetView = () => {
    if (!mapInst.current || !districtLayerRef.current) return;
    mapInst.current.fitBounds(districtLayerRef.current.getBounds(), { padding: [15, 15] });
    setSelectedTaluk('all');
    setSelectedRisk('all');
    setSearchQuery('');
  };

  return (
    <div className="gis-map-workspace" style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* COMPACT MAP TOOLBAR (Section 9 Requirement) */}
      <div className="map-toolbar" style={{ 
        padding: '10px 16px', 
        background: 'var(--bg-surface)', 
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px',
        zIndex: 50
      }}>
        {/* Domain Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Domain:</span>
          <div style={{ display: 'flex', background: 'var(--bg-muted)', padding: '2px', borderRadius: '6px' }}>
            {[
              { id: 'combined', label: 'Combined', icon: ShieldAlert, color: '#0f766e' },
              { id: 'water_quality', label: 'Water Quality', icon: Droplet, color: '#0d9488' },
              { id: 'agriculture', label: 'Agriculture', icon: Wheat, color: '#16a34a' },
              { id: 'health', label: 'Health', icon: HeartPulse, color: '#dc2626' }
            ].map(d => {
              const Icon = d.icon;
              const isActive = selectedDomain === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDomain(d.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? 'var(--bg-surface)' : 'transparent',
                    color: isActive ? d.color : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={14} />
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Year Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Year:</span>
          <select
            className="form-control"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 8px', width: '85px' }}
          >
            <optgroup label="Forecast Period (2022–2030)">
              {[2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </optgroup>
            <optgroup label="Historical (2007–2021)">
              {[2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Taluk Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Taluk:</span>
          <select
            className="form-control"
            value={selectedTaluk}
            onChange={(e) => setSelectedTaluk(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '4px 8px', width: '135px' }}
          >
            <option value="all">All Taluks (8)</option>
            {['Madurai East', 'Madurai North', 'Madurai South', 'Melur', 'Peraiyur', 'Thirumangalam', 'Usilampatti', 'Vadipatti'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Layer Controls: Stations Toggle, Heatmap, Opacity Slider, Taluk Outlines */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'var(--bg-muted)', 
          padding: '3px 8px', 
          borderRadius: '6px',
          border: '1px solid var(--border-light)'
        }}>
          {/* Station View Toggle (User requested: hide station view from map for better experience) */}
          <button
            className={`btn btn-sm ${showStationMarkers ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            onClick={() => setShowStationMarkers(!showStationMarkers)}
            title={showStationMarkers ? "Click to hide station markers for unobstructed surface view" : "Click to show station markers"}
          >
            {showStationMarkers ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>{showStationMarkers ? 'Stations' : 'Stations (Hidden)'}</span>
          </button>

          {/* Spatial Heatmap Toggle */}
          <button
            className={`btn btn-sm ${showSurface ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            onClick={() => setShowSurface(!showSurface)}
            title="Toggle Continuous Spatial Interpolation Heatmap"
          >
            <Sparkles size={13} />
            <span>Heatmap</span>
          </button>

          {/* Opacity Slider Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Opacity:</span>
            <input 
              type="range" 
              min="0.05" 
              max="1.0" 
              step="0.05"
              value={surfaceOpacity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSurfaceOpacity(val);
                if (!showSurface) setShowSurface(true);
              }}
              style={{ width: '70px', height: '4px', cursor: 'pointer', accentColor: '#0f766e' }}
              title="Adjust Map Heatmap Layer Opacity"
            />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '32px' }}>
              {Math.round(surfaceOpacity * 100)}%
            </span>
          </div>

          {/* Taluks Boundary Toggle */}
          <button
            className={`btn btn-sm ${showTalukBoundaries ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => setShowTalukBoundaries(!showTalukBoundaries)}
            title="Toggle 8 Taluk Boundary Outlines"
          >
            <Layers size={13} />
            <span>Taluks</span>
          </button>
        </div>

        {/* Risk Class Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Risk:</span>
          <select
            className="form-control"
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '4px 8px', width: '135px' }}
          >
            <option value="all">All Classes</option>
            <option value="Low">Low Vulnerability</option>
            <option value="Moderate">Moderate Vulnerability</option>
            <option value="High">High Vulnerability</option>
            <option value="Very High">Very High Vulnerability</option>
          </select>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '170px' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '0.78rem', padding: '4px 8px 4px 26px' }}
          />
        </div>

        {/* Basemap Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-control"
            value={activeBasemap}
            onChange={(e) => setActiveBasemap(e.target.value)}
            style={{ fontSize: '0.78rem', padding: '4px 6px', width: '150px' }}
          >
            <option value="osm">OpenStreetMap (Light)</option>
            <option value="google-satellite">Google Satellite</option>
            <option value="esri-satellite">Esri Satellite</option>
            <option value="topo">Esri Topographic</option>
          </select>
        </div>

        {/* Reset View Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={resetView}
          title="Reset map view to Madurai District"
          style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      {/* MAP CANVAS CONTAINER */}
      <div 
        ref={mapContainerRef} 
        style={{ flex: 1, width: '100%', height: '100%', minHeight: '520px', background: '#e2e8f0' }} 
      />

      {/* FLOATING MAP ON-CANVAS QUICK CONTROLS (Top-Left of map viewport) */}
      <div style={{
        position: 'absolute',
        top: '64px',
        left: '16px',
        zIndex: 800,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)',
        border: '1px solid var(--border-light)',
        borderRadius: '8px',
        padding: '5px 10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* Toggle Stations */}
        <button
          className={`btn btn-sm ${showStationMarkers ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setShowStationMarkers(!showStationMarkers)}
          style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
          title={showStationMarkers ? "Hide station points for clean surface map" : "Show station points"}
        >
          {showStationMarkers ? <Eye size={12} /> : <EyeOff size={12} />}
          <span>{showStationMarkers ? 'Stations' : 'Stations (Hidden)'}</span>
        </button>

        {/* Toggle Heatmap */}
        <button
          className={`btn btn-sm ${showSurface ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setShowSurface(!showSurface)}
          style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
          title="Toggle Heatmap Layer"
        >
          <Sparkles size={12} />
          <span>Heatmap</span>
        </button>

        {/* Heatmap Opacity Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Opacity:</span>
          <input
            type="range"
            min="0.05"
            max="1.0"
            step="0.05"
            value={surfaceOpacity}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setSurfaceOpacity(val);
              if (!showSurface) setShowSurface(true);
            }}
            style={{ width: '65px', height: '4px', cursor: 'pointer', accentColor: '#0f766e' }}
            title="Adjust Heatmap Opacity (0% - 100%)"
          />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '30px' }}>
            {Math.round(surfaceOpacity * 100)}%
          </span>
        </div>
      </div>

      {/* FLOATING MAP LEGEND */}
      <MapLegend 
        selectedDomain={selectedDomain}
        selectedTaluk={selectedTaluk}
        onSelectTaluk={(t) => setSelectedTaluk(t)}
      />

      {/* STATION INSPECTOR MODAL */}
      {selectedStation && (
        <StationDetailModal
          station={selectedStation}
          selectedYear={selectedYear}
          historicalData={historicalData}
          forecastData={forecastData}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  );
}
