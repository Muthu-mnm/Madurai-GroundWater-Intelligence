import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { THRESHOLDS, RISK_COLORS, DRINKING_SUITABILITY, getDrinkingSuitability } from '../../utils/thresholds';
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
  Sparkles
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
  const [mode, setMode] = useState('forecast'); // 'forecast' | 'historical'
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedParam, setSelectedParam] = useState('TDS');
  const [selectedTaluk, setSelectedTaluk] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('all');
  
  // Basemap State: Google Satellite Hybrid by default
  const [activeBasemap, setActiveBasemap] = useState('google-satellite');

  // Extent Masking State: 'off' by default (Full continuous satellite map)
  const [maskMode, setMaskMode] = useState('off');

  // Layers Visibility: IDW Heatmap OFF by default so satellite imagery is crisp and photographic
  const [showSurface, setShowSurface] = useState(false);
  const [surfaceOpacity, setSurfaceOpacity] = useState(0.55);
  const [showTalukBoundaries, setShowTalukBoundaries] = useState(true);
  const [showStationMarkers, setShowStationMarkers] = useState(true);

  // Inspector Modal State
  const [selectedStation, setSelectedStation] = useState(null);

  // Basemap tile definitions - Google Satellite Hybrid, Streets, Esri Satellite, Topo
  const basemaps = {
    'google-satellite': {
      name: 'Google Satellite (Hybrid)',
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attrib: '&copy; Google Maps',
      maxZoom: 20
    },
    'osm': {
      name: 'OpenStreetMap (Streets)',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attrib: '&copy; OpenStreetMap contributors',
      maxZoom: 19
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

  // Distinct, High-Contrast Boundary Line Colors for Each Taluk (Zero Fill)
  const TALUK_BOUNDARY_COLORS = {
    'Madurai North': '#00E5FF',     // Vivid Electric Cyan
    'Madurai South': '#FACC15',     // Luminous Canary Yellow
    'Melur': '#10B981',             // Bright Emerald Green
    'Peraiyur': '#A855F7',          // Radiant Lavender Purple
    'Thirumangalam': '#F43F5E',     // Vivid Coral Rose
    'Usilampatti': '#FB923C',       // Luminous Tangerine Orange
    'Vadipatti': '#38BDF8'          // Radiant Sky Blue
  };

  // Color Ramps for Continuous IDW Raster Surface
  const colorRamps = {
    TDS: [
      { val: 400, color: [16, 185, 129] },   // Desirable Green
      { val: 750, color: [6, 182, 212] },    // Low Permissible Cyan
      { val: 1250, color: [245, 158, 11] },  // Mid Permissible Amber
      { val: 2000, color: [249, 115, 22] },  // Upper Permissible Orange
      { val: 3200, color: [220, 38, 38] }    // High Exceedance Red
    ],
    EC: [
      { val: 600, color: [16, 185, 129] },
      { val: 1200, color: [6, 182, 212] },
      { val: 2250, color: [245, 158, 11] },
      { val: 3500, color: [249, 115, 22] },
      { val: 5000, color: [220, 38, 38] }
    ],
    Fluoride: [
      { val: 0.7, color: [16, 185, 129] },
      { val: 1.0, color: [6, 182, 212] },
      { val: 1.5, color: [245, 158, 11] },
      { val: 2.0, color: [249, 115, 22] },
      { val: 2.8, color: [220, 38, 38] }
    ],
    pH: [
      { val: 6.5, color: [249, 115, 22] },   // Acidic Orange
      { val: 7.2, color: [16, 185, 129] },   // Neutral Green
      { val: 8.0, color: [6, 182, 212] },    // Slightly Alkaline Cyan
      { val: 8.5, color: [245, 158, 11] },   // Upper Limit Amber
      { val: 9.2, color: [220, 38, 38] }     // High Alkaline Red
    ]
  };

  function getInterpolatedRgb(ramp, val) {
    if (val <= ramp[0].val) return ramp[0].color;
    if (val >= ramp[ramp.length - 1].val) return ramp[ramp.length - 1].color;
    for (let i = 0; i < ramp.length - 1; i++) {
      if (val >= ramp[i].val && val <= ramp[i + 1].val) {
        const factor = (val - ramp[i].val) / (ramp[i + 1].val - ramp[i].val);
        return [
          Math.round(ramp[i].color[0] + factor * (ramp[i + 1].color[0] - ramp[i].color[0])),
          Math.round(ramp[i].color[1] + factor * (ramp[i + 1].color[1] - ramp[i].color[1])),
          Math.round(ramp[i].color[2] + factor * (ramp[i + 1].color[2] - ramp[i].color[2]))
        ];
      }
    }
    return ramp[0].color;
  }

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInst.current) return;

    // Madurai District centroid ~ 9.925° N, 78.12° E
    const map = L.map(mapContainerRef.current, {
      center: [9.925, 78.12],
      zoom: 10,
      zoomControl: true,
      attributionControl: true
    });

    // Create custom ordered panes for strict spatial layering & mask clipping
    const surfacePane = map.createPane('surfacePane');
    surfacePane.style.zIndex = 250;

    const maskPane = map.createPane('maskPane');
    maskPane.style.zIndex = 300;
    maskPane.style.pointerEvents = 'none'; // Ensure clicks & pan pass through smoothly

    const districtPane = map.createPane('districtPane');
    districtPane.style.zIndex = 350;
    districtPane.style.pointerEvents = 'none';

    const talukPane = map.createPane('talukPane');
    talukPane.style.zIndex = 400;

    const stationPane = map.createPane('stationPane');
    stationPane.style.zIndex = 620;
    stationPane.style.cursor = 'pointer';

    const base = basemaps[activeBasemap];
    tileLayerRef.current = L.tileLayer(base.url, {
      attribution: base.attrib,
      maxZoom: base.maxZoom
    }).addTo(map);

    mapInst.current = map;

    return () => {
      map.remove();
      mapInst.current = null;
    };
  }, []);

  // 2. Update Basemap Tiles
  useEffect(() => {
    if (!mapInst.current || !tileLayerRef.current) return;
    mapInst.current.removeLayer(tileLayerRef.current);

    const base = basemaps[activeBasemap];
    tileLayerRef.current = L.tileLayer(base.url, {
      attribution: base.attrib,
      maxZoom: base.maxZoom
    }).addTo(mapInst.current);

    // Keep basemap in the very background
    tileLayerRef.current.bringToBack();
  }, [activeBasemap]);

  // 3. Render Inverted Boundary Mask (Shows ONLY Madurai District)
  useEffect(() => {
    if (!mapInst.current || !districtGeo) return;

    if (maskLayerRef.current) {
      mapInst.current.removeLayer(maskLayerRef.current);
      maskLayerRef.current = null;
    }

    if (maskMode === 'off') return;

    // World outer perimeter ring (covering the entire globe)
    const worldOuterRing = [
      [-180, 90],
      [180, 90],
      [180, -90],
      [-180, -90],
      [-180, 90]
    ];

    const feature = districtGeo.features ? districtGeo.features[0] : districtGeo;
    if (!feature || !feature.geometry) return;

    let innerRings = [];
    if (feature.geometry.type === 'Polygon') {
      innerRings = feature.geometry.coordinates;
    } else if (feature.geometry.type === 'MultiPolygon') {
      innerRings = feature.geometry.coordinates.map(p => p[0]);
    }

    const maskGeoJson = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            worldOuterRing,
            ...innerRings
          ]
        }
      }]
    };

    const isDark = theme === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
    const maskBgColor = isDark ? '#0b132b' : '#f8fafc';
    const fillOpacityVal = maskMode === 'strict' ? 1.0 : 0.75;

    maskLayerRef.current = L.geoJSON(maskGeoJson, {
      pane: 'maskPane',
      style: {
        fillColor: maskBgColor,
        fillOpacity: fillOpacityVal,
        stroke: false,
        interactive: false
      }
    }).addTo(mapInst.current);
  }, [districtGeo, maskMode, theme]);

  // 4. Render Madurai District Outer Perimeter Line & Lock Map Bounds
  useEffect(() => {
    if (!mapInst.current || !districtGeo) return;
    if (districtLayerRef.current) {
      mapInst.current.removeLayer(districtLayerRef.current);
      districtLayerRef.current = null;
    }

    districtLayerRef.current = L.geoJSON(districtGeo, {
      pane: 'districtPane',
      style: {
        color: '#FFFFFF', // Crisp solid white district outer perimeter
        weight: 3.2,
        opacity: 0.95,
        fill: false
      }
    }).addTo(mapInst.current);

    // Initial focus on Madurai District with smooth bounds
    const bounds = districtLayerRef.current.getBounds();
    mapInst.current.fitBounds(bounds, { padding: [15, 15] });
    mapInst.current.setMaxBounds(bounds.pad(0.35));
    mapInst.current.options.maxBoundsViscosity = 0.85;
    mapInst.current.setMinZoom(9);
    mapInst.current.setMaxZoom(19);
  }, [districtGeo]);

  // 4. Render Continuous IDW Interpolation Raster Surface
  useEffect(() => {
    if (!mapInst.current || !surfaces || !surfaces.surfaces) return;

    if (surfaceLayerRef.current) {
      mapInst.current.removeLayer(surfaceLayerRef.current);
      surfaceLayerRef.current = null;
    }

    if (!showSurface) return;

    const surfData = surfaces.surfaces;
    // Map parameter key to available surface grids
    const paramKeyMap = {
      'TDS': 'TDS',
      'EC': 'EC_GEN',
      'Fluoride': 'F',
      'pH': 'pH_GEN'
    };

    const targetParamKey = paramKeyMap[selectedParam] || 'TDS';
    const pData = surfData.parameters[targetParamKey];
    if (!pData || !pData.grid) return;

    const bounds = surfData.meta.bounds; // [minx, miny, maxx, maxy]
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
    const ramp = colorRamps[selectedParam] || colorRamps.TDS;

    for (let y = 0; y < gridRes; y++) {
      const srcRow = gridRes - 1 - y;
      for (let x = 0; x < gridRes; x++) {
        const val = grid[srcRow][x];
        const idx = (y * gridRes + x) * 4;

        if (val === null || val === undefined) {
          data[idx + 3] = 0; // Transparent outside boundary
        } else {
          const rgb = getInterpolatedRgb(ramp, val);
          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = 235; // Solid on canvas, opacity controlled by Leaflet overlay
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

    // Keep basemap in background
    if (tileLayerRef.current) tileLayerRef.current.bringToBack();
  }, [surfaces, selectedParam, showSurface, surfaceOpacity]);

  // Update surface opacity dynamically
  useEffect(() => {
    if (surfaceLayerRef.current) {
      surfaceLayerRef.current.setOpacity(showSurface ? surfaceOpacity : 0);
    }
  }, [surfaceOpacity, showSurface]);

  // 5. Render Taluk Choropleth Layer
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
        const lineColor = TALUK_BOUNDARY_COLORS[talukName] || '#38BDF8';
        const hasTalukSelection = selectedTaluk !== 'all';
        const isMatch = hasTalukSelection && 
          (talukName.toLowerCase() === selectedTaluk.toLowerCase());

        if (hasTalukSelection) {
          if (isMatch) {
            // SELECTED TALUK: High-contrast, bold, vibrant border color + full-surface hit detection
            return {
              fill: true,
              fillColor: lineColor,
              fillOpacity: 0.05, // Subtle tint preserving satellite imagery while enabling 100% surface clickability
              weight: 4.2,
              opacity: 1.0,
              color: lineColor,
              dashArray: null
            };
          } else {
            // OTHER TALUKS: "non color" - muted uncolored neutral slate line + full-surface hit detection
            return {
              fill: true,
              fillColor: '#FFFFFF',
              fillOpacity: 0.001, // 0.1% opacity: 100% invisible to human eyes, but SVG captures clicks anywhere inside!
              weight: 1.2,
              opacity: 0.35,
              color: '#64748B', // Neutral slate gray (non-color)
              dashArray: '3, 4'
            };
          }
        } else {
          // NO TALUK SELECTED (All Taluks): Each taluk displays its distinct boundary line color + full-surface hit detection
          return {
            fill: true,
            fillColor: '#FFFFFF',
            fillOpacity: 0.001, // 100% clickable surface anywhere inside any taluk
            weight: 2.2,
            opacity: 0.9,
            color: lineColor,
            dashArray: '6, 3'
          };
        }
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const lineColor = TALUK_BOUNDARY_COLORS[p.Taluk] || '#38BDF8';

        layer.bindTooltip(`
          <div style="font-family:Inter,sans-serif; font-size:12px;">
            <strong style="color:${lineColor}; font-size:13px;">${p.Taluk} Taluk</strong><br/>
            <span style="font-size:11px; color:#38BDF8; font-weight:600;">👆 Click anywhere inside to select ${p.Taluk}</span><br/>
            <div style="margin-top:3px; font-size:11px; color:#CBD5E1;">
              <span>Fluoride Exceedance: <b>${p.pct_F_exceed}%</b></span><br/>
              <span>TDS Exceedance: <b>${p.pct_TDS_exceed}%</b></span>
            </div>
          </div>
        `, { sticky: true });

        layer.on({
          mouseover: () => {
            const hasTalukSelection = selectedTaluk !== 'all';
            const isMatch = hasTalukSelection && 
              (p.Taluk && p.Taluk.toLowerCase() === selectedTaluk.toLowerCase());
            if (hasTalukSelection && !isMatch) {
              layer.setStyle({ 
                weight: 2.8, 
                opacity: 0.85, 
                color: lineColor, 
                fill: true,
                fillColor: lineColor,
                fillOpacity: 0.14 
              });
            } else {
              layer.setStyle({ 
                weight: 4.5, 
                opacity: 1.0, 
                color: lineColor,
                fill: true,
                fillColor: lineColor,
                fillOpacity: 0.08
              });
            }
          },
          mouseout: () => {
            const hasTalukSelection = selectedTaluk !== 'all';
            const isMatch = hasTalukSelection && 
              (p.Taluk && p.Taluk.toLowerCase() === selectedTaluk.toLowerCase());
            if (hasTalukSelection) {
              if (isMatch) {
                layer.setStyle({ 
                  weight: 4.2, 
                  opacity: 1.0, 
                  color: lineColor, 
                  dashArray: null,
                  fill: true,
                  fillColor: lineColor,
                  fillOpacity: 0.05
                });
              } else {
                layer.setStyle({ 
                  weight: 1.2, 
                  opacity: 0.35, 
                  color: '#64748B', 
                  dashArray: '3, 4',
                  fill: true,
                  fillColor: '#FFFFFF',
                  fillOpacity: 0.001
                });
              }
            } else {
              layer.setStyle({ 
                weight: 2.2, 
                color: lineColor, 
                opacity: 0.9, 
                dashArray: '6, 3',
                fill: true,
                fillColor: '#FFFFFF',
                fillOpacity: 0.001
              });
            }
          },
          click: (e) => {
            if (e && e.originalEvent) {
              L.DomEvent.stopPropagation(e);
            }
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

  // 6. Filtered Stations Data Memo (Retains all stations for district context; non-selected are rendered non-color)
  const displayStations = useMemo(() => {
    let source = mode === 'forecast' ? forecastData : historicalData;
    let filtered = source.filter(d => d.Year === selectedYear);

    if (mode === 'forecast' && selectedRisk !== 'all') {
      if (selectedRisk === 'Drinkable' || selectedRisk === 'Required Boiling' || selectedRisk === 'Not Drinkable') {
        filtered = filtered.filter(d => {
          const s = d.Drinking_Suitability || getDrinkingSuitability(d.Risk_Level, d).label;
          return s === selectedRisk;
        });
      } else {
        filtered = filtered.filter(d => d.Risk_Level === selectedRisk);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(d => 
        (d.Village && d.Village.toLowerCase().includes(q)) ||
        (d.Taluk && d.Taluk.toLowerCase().includes(q)) ||
        (d.Well_No && d.Well_No.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [mode, selectedYear, selectedRisk, searchQuery, forecastData, historicalData]);

  // 7. Render Station Point Markers (Selected Taluk stations are colored; outside stations are non-color)
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
        (selectedStation.Well_No && st.Well_No && selectedStation.Well_No === st.Well_No) ||
        (Math.abs(selectedStation.Latitude - lat) < 0.0001 && Math.abs(selectedStation.Longitude - lon) < 0.0001)
      );

      let markerColor = '#176B70';
      if (mode === 'forecast') {
        const rLevel = st.Risk_Level || 'Insufficient Data';
        markerColor = RISK_COLORS[rLevel]?.color || '#64748B';
      } else {
        const val = st[selectedParam];
        const cfg = THRESHOLDS[selectedParam];
        if (typeof val === 'number' && cfg) {
          if (cfg.permissible && val > cfg.permissible) {
            markerColor = '#DC2626'; // Exceedance
          } else if (cfg.desirable && val > cfg.desirable) {
            markerColor = '#2563EB'; // Permissible
          } else {
            markerColor = '#059669'; // Desirable
          }
        }
      }

      // Dynamic styling with dedicated stationPane for guaranteed clickability:
      let markerOptions;
      if (hasTalukSelection) {
        if (isStationInSelectedTaluk) {
          markerOptions = {
            pane: 'stationPane',
            interactive: true,
            radius: isCurrentSelectedStation ? 11 : 8,
            fillColor: markerColor,
            color: isCurrentSelectedStation ? '#00E5FF' : '#FFFFFF',
            weight: isCurrentSelectedStation ? 4 : 2,
            opacity: 1,
            fillOpacity: 0.95
          };
        } else {
          // NON COLOR for outside stations
          markerOptions = {
            pane: 'stationPane',
            interactive: true,
            radius: isCurrentSelectedStation ? 9 : 5.5,
            fillColor: '#64748B', // Neutral slate gray (non-color)
            color: isCurrentSelectedStation ? '#00E5FF' : 'rgba(255, 255, 255, 0.4)',
            weight: isCurrentSelectedStation ? 3.5 : 1.2,
            opacity: isCurrentSelectedStation ? 0.95 : 0.45,
            fillOpacity: isCurrentSelectedStation ? 0.75 : 0.35
          };
        }
      } else {
        // ALL TALUKS VIEW
        markerOptions = {
          pane: 'stationPane',
          interactive: true,
          radius: isCurrentSelectedStation ? 11 : 7.5,
          fillColor: markerColor,
          color: isCurrentSelectedStation ? '#00E5FF' : '#FFFFFF',
          weight: isCurrentSelectedStation ? 4 : 2,
          opacity: 1,
          fillOpacity: 0.95
        };
      }

      const marker = L.circleMarker([lat, lon], markerOptions);

      const paramVal = st[selectedParam];
      const paramUnit = THRESHOLDS[selectedParam]?.unit || '';
      const sSuitability = st.Drinking_Suitability || getDrinkingSuitability(st.Risk_Level, st).label;
      const sMeta = DRINKING_SUITABILITY[sSuitability] || DRINKING_SUITABILITY['Unassessed'];

      const tooltipContent = `
        <div style="font-family:Inter,sans-serif; font-size:12px; min-width:145px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
            <strong style="font-size:13px;">${st.Village}</strong>
            <span style="font-size:10px; color:#94A3B8;">${st.Taluk}</span>
          </div>
          <div style="margin-bottom:4px;">
            <span style="font-size:11px; padding:2px 7px; border-radius:3px; background:${sMeta.bg}; color:${sMeta.color}; border:1px solid ${sMeta.border}; font-weight:700;">
              ${sMeta.symbol} ${sSuitability}
            </span>
          </div>
          <div style="font-size:11.5px; margin-bottom:2px;">
            <span>${selectedParam}: <b>${typeof paramVal === 'number' ? paramVal.toFixed(2) : 'N/A'} ${paramUnit}</b></span>
          </div>
          ${mode === 'forecast' 
            ? `<div style="font-size:11px; color:${isStationInSelectedTaluk ? markerColor : '#94A3B8'}; font-weight:600;">${st.Risk_Level}</div>` 
            : `<div style="font-size:11px; color:#94A3B8;">Observed (${selectedYear})</div>`}
          <div style="margin-top:4px; font-size:10.5px; color:#38BDF8; font-weight:600;">👆 Click point to inspect detailed station data</div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, { sticky: true });

      // Guaranteed Hit Detection & Event Handling
      marker.on('click', (e) => {
        if (e && e.originalEvent) {
          L.DomEvent.stopPropagation(e);
        }
        setSelectedStation(st);
        if (hasTalukSelection && !isStationInSelectedTaluk) {
          setSelectedTaluk(st.Taluk);
        }
        if (mapInst.current) {
          mapInst.current.panTo([lat, lon]);
        }
      });

      // Hover feedback expansion
      marker.on('mouseover', () => {
        marker.setStyle({
          radius: isCurrentSelectedStation ? 13 : (hasTalukSelection && !isStationInSelectedTaluk ? 7.5 : 10),
          weight: isCurrentSelectedStation ? 5 : 3
        });
      });
      marker.on('mouseout', () => {
        marker.setStyle(markerOptions);
      });

      markers.addLayer(marker);
    });

    markers.addTo(mapInst.current);
    stationLayerRef.current = markers;
  }, [displayStations, mode, selectedParam, selectedYear, showStationMarkers, selectedTaluk, selectedStation]);

  const handleResetZoom = () => {
    if (districtLayerRef.current && mapInst.current) {
      mapInst.current.fitBounds(districtLayerRef.current.getBounds(), { padding: [15, 15] });
    } else if (mapInst.current) {
      mapInst.current.setView([9.925, 78.12], 10);
    }
    setSelectedTaluk('all');
    setSelectedStation(null);
    setSelectedRisk('all');
    setSearchQuery('');
  };

  return (
    <div className="content-workspace">
      {/* Top Map Control Toolbar */}
      <div className="filter-toolbar">
        {/* Mode Toggle */}
        <div className="filter-group">
          <span className="filter-label">Mode:</span>
          <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
            <button 
              className={`btn btn-sm ${mode === 'forecast' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 0, border: 'none' }}
              onClick={() => { setMode('forecast'); setSelectedYear(2026); }}
            >
              Forecast (2022–2030)
            </button>
            <button 
              className={`btn btn-sm ${mode === 'historical' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 0, border: 'none' }}
              onClick={() => { setMode('historical'); setSelectedYear(2021); }}
            >
              Historical (2007–2021)
            </button>
          </div>
        </div>

        {/* Year Selector */}
        <div className="filter-group">
          <span className="filter-label"><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Year:</span>
          <select 
            className="filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {mode === 'forecast' 
              ? [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y}>Year {y} {y === 2026 ? '(Ref)' : ''}</option>
                ))
              : [2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021].map(y => (
                  <option key={y} value={y}>Year {y}</option>
                ))
            }
          </select>
        </div>

        {/* Parameter Selector */}
        <div className="filter-group">
          <span className="filter-label"><Filter size={14} style={{ display: 'inline', marginRight: 4 }} /> Parameter:</span>
          <select 
            className="filter-select"
            value={selectedParam}
            onChange={(e) => setSelectedParam(e.target.value)}
          >
            <option value="TDS">TDS (mg/L)</option>
            <option value="EC">EC (µS/cm)</option>
            <option value="Fluoride">Fluoride (mg/L)</option>
            <option value="pH">pH</option>
          </select>
        </div>

        {/* Taluk Filter */}
        <div className="filter-group">
          <span className="filter-label">Taluk:</span>
          <select 
            className="filter-select"
            value={selectedTaluk}
            onChange={(e) => setSelectedTaluk(e.target.value)}
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

        {/* Risk & Potability Filter (Forecast Mode) */}
        {mode === 'forecast' && (
          <div className="filter-group">
            <span className="filter-label">Filter Status:</span>
            <select 
              className="filter-select"
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
            >
              <option value="all">All Stations</option>
              <optgroup label="Drinking Potability">
                <option value="Drinkable">🟢 Drinkable (Low Risk)</option>
                <option value="Required Boiling">🟡 Required Boiling (Medium)</option>
                <option value="Not Drinkable">🔴 Not Drinkable (High Risk)</option>
              </optgroup>
              <optgroup label="Regulatory Risk">
                <option value="Low Risk">Low Risk (Desirable)</option>
                <option value="Medium Risk (Permissible)">Medium (Permissible)</option>
                <option value="Medium Risk (Borderline)">Medium (Borderline)</option>
                <option value="High Risk">High Risk (Exceedance)</option>
              </optgroup>
            </select>
          </div>
        )}

        {/* Station Direct Dropdown Selector */}
        <div className="filter-group">
          <span className="filter-label"><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} /> Station:</span>
          <select 
            className="filter-select"
            value={selectedStation?.Village || ''}
            onChange={(e) => {
              const vName = e.target.value;
              if (!vName) {
                setSelectedStation(null);
              } else {
                const found = displayStations.find(s => s.Village === vName);
                if (found) {
                  setSelectedStation(found);
                  if (found.Latitude && found.Longitude && mapInst.current) {
                    mapInst.current.flyTo([found.Latitude, found.Longitude], 13);
                  }
                }
              }
            }}
            style={{ maxWidth: '190px' }}
          >
            <option value="">-- Pick Station ({displayStations.length}) --</option>
            {displayStations.map(s => (
              <option key={`${s.Taluk}-${s.Village}-${s.Well_No || ''}`} value={s.Village}>
                {s.Village} ({s.Taluk})
              </option>
            ))}
          </select>
        </div>

        {/* Village Search */}
        <div className="filter-group" style={{ flex: 1, minWidth: '130px' }}>
          <input 
            type="text"
            className="filter-input"
            placeholder="Search village name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Reset Zoom */}
        <button className="btn btn-secondary btn-sm" onClick={handleResetZoom} title="Reset view and filters">
          <RotateCcw size={14} />
          <span>Reset View</span>
        </button>
      </div>

      {/* Map Viewport Area */}
      <div className="map-canvas-container">
        <div ref={mapContainerRef} className="map-viewport"></div>

        {/* Floating Top Controls: Google Satellite, Streets, Topo & Layer Toggles */}
        <div className="map-floating-panel">
          {/* Quick 1-Click Basemap Toggle */}
          <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
            <button 
              className={`btn btn-sm ${activeBasemap === 'google-satellite' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 0, border: 'none', fontWeight: 600 }}
              onClick={() => setActiveBasemap('google-satellite')}
              title="Switch to Google Satellite (Hybrid with Roads & Labels)"
            >
              🛰️ Google Satellite
            </button>
            <button 
              className={`btn btn-sm ${activeBasemap === 'osm' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 0, border: 'none', fontWeight: 600 }}
              onClick={() => setActiveBasemap('osm')}
              title="Switch to OpenStreetMap Standard Cartography"
            >
              🗺️ Streets
            </button>
            <button 
              className={`btn btn-sm ${activeBasemap === 'esri-satellite' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 0, border: 'none', fontWeight: 600 }}
              onClick={() => setActiveBasemap('esri-satellite')}
              title="Switch to Esri World Imagery"
            >
              🛰️ Esri Sat
            </button>
            <button 
              className={`btn btn-sm ${activeBasemap === 'topo' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 0, border: 'none', fontWeight: 600 }}
              onClick={() => setActiveBasemap('topo')}
              title="Switch to Esri Topographic Terrain Map"
            >
              🏔️ Topo
            </button>
          </div>

          {/* Optional IDW Surface Heatmap Overlay Toggle */}
          <button 
            className={`btn btn-sm ${showSurface ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.72rem', padding: '3px 9px', marginLeft: 4 }}
            onClick={() => setShowSurface(!showSurface)}
            title="Toggle Water Quality Heatmap Overlay (TDS/EC/Fluoride/pH)"
          >
            <Sparkles size={12} />
            <span>Water Quality Heatmap</span>
          </button>

          {showSurface && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <span>Opacity:</span>
              <input 
                type="range" 
                min="0.1" 
                max="0.9" 
                step="0.05"
                value={surfaceOpacity}
                onChange={(e) => setSurfaceOpacity(parseFloat(e.target.value))}
                style={{ width: '60px', height: '4px' }}
                title="Adjust IDW surface opacity"
              />
            </div>
          )}

          <button 
            className={`btn btn-sm ${showTalukBoundaries ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            onClick={() => setShowTalukBoundaries(!showTalukBoundaries)}
            title="Toggle 7 Taluk choropleth boundaries"
          >
            {showTalukBoundaries ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>Taluks</span>
          </button>

          <button 
            className={`btn btn-sm ${showStationMarkers ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            onClick={() => setShowStationMarkers(!showStationMarkers)}
            title="Toggle monitored village station markers"
          >
            {showStationMarkers ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>
              Stations ({selectedTaluk !== 'all' 
                ? `${displayStations.filter(s => s.Taluk && s.Taluk.toLowerCase() === selectedTaluk.toLowerCase()).length} active / ${displayStations.length}` 
                : displayStations.length})
            </span>
          </button>
        </div>

        {/* Quick Taluk Selection Bar */}
        <div style={{
          position: 'absolute',
          top: '46px',
          left: '12px',
          zIndex: 900,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          padding: '5px 8px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)'
        }}>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600, marginRight: '3px' }}>
            Taluk:
          </span>
          <button
            className={`btn btn-xs ${selectedTaluk === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', fontWeight: selectedTaluk === 'all' ? 700 : 500 }}
            onClick={() => {
              setSelectedTaluk('all');
              if (districtLayerRef.current) mapInst.current.fitBounds(districtLayerRef.current.getBounds(), { padding: [15, 15] });
            }}
          >
            All 7
          </button>
          {Object.entries(TALUK_BOUNDARY_COLORS).map(([tName, tColor]) => {
            const isMatch = selectedTaluk.toLowerCase() === tName.toLowerCase();
            return (
              <button
                key={tName}
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  border: isMatch ? `2px solid ${tColor}` : '1px solid rgba(255, 255, 255, 0.16)',
                  background: isMatch ? `${tColor}28` : 'rgba(30, 41, 59, 0.7)',
                  color: isMatch ? '#FFFFFF' : '#CBD5E1',
                  fontWeight: isMatch ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => {
                  if (isMatch) {
                    setSelectedTaluk('all');
                    if (districtLayerRef.current) mapInst.current.fitBounds(districtLayerRef.current.getBounds(), { padding: [15, 15] });
                  } else {
                    setSelectedTaluk(tName);
                    if (talukLayerRef.current) {
                      talukLayerRef.current.eachLayer(l => {
                        if (l.feature?.properties?.Taluk?.toLowerCase() === tName.toLowerCase()) {
                          mapInst.current.fitBounds(l.getBounds(), { padding: [25, 25] });
                        }
                      });
                    }
                  }
                }}
                title={`Click to select ${tName} Taluk`}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: tColor }}></span>
                <span>{tName}</span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <MapLegend 
          mode={mode} 
          selectedParam={selectedParam} 
          selectedTaluk={selectedTaluk} 
          onSelectTaluk={(talukName) => {
            if (talukName === 'all') {
              setSelectedTaluk('all');
              if (districtLayerRef.current) mapInst.current.fitBounds(districtLayerRef.current.getBounds(), { padding: [15, 15] });
            } else {
              setSelectedTaluk(talukName);
              if (talukLayerRef.current) {
                talukLayerRef.current.eachLayer(l => {
                  if (l.feature?.properties?.Taluk?.toLowerCase() === talukName.toLowerCase()) {
                    mapInst.current.fitBounds(l.getBounds(), { padding: [25, 25] });
                  }
                });
              }
            }
          }}
        />
      </div>

      {/* Summary Footer for Displayed Points */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        <span>Showing <strong>{selectedTaluk !== 'all' ? `${displayStations.filter(s => s.Taluk && s.Taluk.toLowerCase() === selectedTaluk.toLowerCase()).length} stations in ${selectedTaluk} (${displayStations.length} total in district)` : `${displayStations.length} monitored locations`}</strong> in {mode === 'forecast' ? `Year ${selectedYear} Forecast Mode` : `Year ${selectedYear} Historical Mode`}. Continuous IDW spatial raster interpolated across 75×75 cells. Click any point to inspect detailed prediction intervals and longitudinal trajectory.</span>
        <span>Madurai District EPSG:4326 WGS84</span>
      </div>

      {/* Station Details Inspector Modal */}
      {selectedStation && (
        <StationDetailModal 
          station={selectedStation}
          selectedYear={selectedYear}
          selectedParam={selectedParam}
          historicalData={historicalData}
          forecastData={forecastData}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  );
}
