import json
from pathlib import Path
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List

from .water_quality_service import evaluate_water_quality_vulnerability
from .agriculture_service import evaluate_agriculture_vulnerability
from .health_service import evaluate_health_vulnerability
from .combined_vulnerability_service import evaluate_combined_vulnerability

BASE_DIR = Path(__file__).resolve().parent.parent
candidate_dirs = [
    Path(__file__).resolve().parent.parent.parent / "data",
    Path(__file__).resolve().parent.parent / "data",
    Path(__file__).resolve().parent / "data"
]
DATA_DIR = next((d for d in candidate_dirs if d.exists()), candidate_dirs[0])

class DataService:
    def __init__(self):
        self.metadata = {}
        self.historical_records = []
        self.forecast_records = []
        self.metrics = {}
        self.validation = {}
        self.stations_geojson = {}
        self.taluks_geojson = {}
        self.district_geojson = {}
        self.df_historical = None
        self.df_forecast = None
        self.loaded = False

    def load_data(self):
        if self.loaded:
            return

        print("DataService: Loading cached dataset assets...")
        with open(DATA_DIR / "metadata.json", encoding='utf-8') as f:
            self.metadata = json.load(f)

        with open(DATA_DIR / "historical_groundwater_2007_2021.json", encoding='utf-8') as f:
            self.historical_records = json.load(f)
            self.df_historical = pd.DataFrame(self.historical_records)

        with open(DATA_DIR / "forecast_results_2022_2030.json", encoding='utf-8') as f:
            self.forecast_records = json.load(f)
            self.df_forecast = pd.DataFrame(self.forecast_records)

        with open(DATA_DIR / "model_validation_metrics.json", encoding='utf-8') as f:
            self.metrics = json.load(f)

        with open(DATA_DIR / "data_validation_report.json", encoding='utf-8') as f:
            self.validation = json.load(f)

        with open(DATA_DIR / "madurai_stations.geojson", encoding='utf-8') as f:
            self.stations_geojson = json.load(f)

        with open(DATA_DIR / "madurai_taluks.geojson", encoding='utf-8') as f:
            self.taluks_geojson = json.load(f)

        with open(DATA_DIR / "madurai_district_boundary.geojson", encoding='utf-8') as f:
            self.district_geojson = json.load(f)

        self.loaded = True
        print(f"DataService: Successfully loaded {len(self.historical_records)} historical and {len(self.forecast_records)} forecast records.")

    def get_metadata(self):
        self.load_data()
        return self.metadata

    def assess_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Runs the four independent domain models on a single hydrochemical record."""
        return evaluate_combined_vulnerability(record)

    def get_historical(self, year=None, taluk=None, village=None, parameter=None, page=1, page_size=50, sort_by='Year', sort_dir='desc'):
        self.load_data()
        df = self.df_historical.copy()

        if year is not None:
            df = df[df['Year'] == int(year)]
        if taluk and taluk.lower() != 'all':
            df = df[df['Taluk'].str.lower() == taluk.lower()]
        if village:
            df = df[df['Village'].str.lower().str.contains(village.lower())]

        total = len(df)

        if sort_by in df.columns:
            ascending = (sort_dir.lower() == 'asc')
            df = df.sort_values(by=sort_by, ascending=ascending)

        start = (page - 1) * page_size
        end = start + page_size
        page_records = df.iloc[start:end].to_dict(orient='records')

        summary = {}
        for p in ['TDS', 'EC', 'pH', 'Fluoride']:
            if p in df.columns and len(df) > 0:
                s = df[p].dropna()
                if len(s) > 0:
                    summary[p] = {
                        'mean': round(float(s.mean()), 2),
                        'median': round(float(s.median()), 2),
                        'min': round(float(s.min()), 2),
                        'max': round(float(s.max()), 2),
                        'count': int(len(s))
                    }

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'records': page_records,
            'summary': summary
        }

    def get_forecasts(self, year=None, taluk=None, village=None, risk_level=None, drinking_suitability=None, page=1, page_size=50, sort_by='Year', sort_dir='asc'):
        self.load_data()
        df = self.df_forecast.copy()

        if year is not None:
            df = df[df['Year'] == int(year)]
        if taluk and taluk.lower() != 'all':
            df = df[df['Taluk'].str.lower() == taluk.lower()]
        if village:
            df = df[df['Village'].str.lower().str.contains(village.lower())]
        if risk_level and risk_level.lower() != 'all':
            df = df[df['Risk_Level'].str.lower() == risk_level.lower()]
        if drinking_suitability and drinking_suitability.lower() != 'all':
            if 'Drinking_Suitability' in df.columns:
                df = df[df['Drinking_Suitability'].str.lower() == drinking_suitability.lower()]

        total = len(df)

        if sort_by in df.columns:
            ascending = (sort_dir.lower() == 'asc')
            df = df.sort_values(by=sort_by, ascending=ascending)

        start = (page - 1) * page_size
        end = start + page_size
        page_records = df.iloc[start:end].to_dict(orient='records')

        # Risk distribution summary
        risk_counts = df['Risk_Level'].value_counts().to_dict() if 'Risk_Level' in df.columns else {}
        suitability_counts = df['Drinking_Suitability'].value_counts().to_dict() if 'Drinking_Suitability' in df.columns else {}

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'risk_counts': risk_counts,
            'drinking_suitability_counts': suitability_counts,
            'records': page_records
        }

    def get_multi_domain_assessments(
        self,
        year: int = 2026,
        taluk: Optional[str] = None,
        village: Optional[str] = None,
        domain: str = 'combined',
        risk_class: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        Retrieves all station records for a given year and executes the 4 assessment models.
        Supports filtering by domain-specific risk class.
        """
        self.load_data()
        is_forecast = (int(year) >= 2022)
        source_df = self.df_forecast if is_forecast else self.df_historical

        df = source_df[source_df['Year'] == int(year)].copy()
        if taluk and taluk.lower() != 'all':
            df = df[df['Taluk'].str.lower() == taluk.lower()]
        if village:
            df = df[df['Village'].str.lower().str.contains(village.lower().strip())]

        raw_records = df.to_dict(orient='records')
        assessed_list = []

        # Domain key mapping
        domain_key_map = {
            'water_quality': 'water_quality',
            'water-quality': 'water_quality',
            'agriculture': 'agriculture',
            'agri': 'agriculture',
            'health': 'health',
            'combined': 'combined'
        }
        target_domain_key = domain_key_map.get(domain.lower(), 'combined')

        for r in raw_records:
            loc_meta = {
                'taluk': r.get('Taluk', 'Unknown'),
                'village': r.get('Village', 'Unknown'),
                'well_no': r.get('Well_No'),
                'year': int(year),
                'latitude': r.get('Latitude'),
                'longitude': r.get('Longitude')
            }
            res = evaluate_combined_vulnerability(r, location_meta=loc_meta)
            
            # Filter by risk_class if specified
            if risk_class and risk_class.lower() != 'all':
                d_rc = res[target_domain_key].get('risk_class', '').lower()
                # support matching "high vulnerability" against "high vulnerability (partial)"
                if risk_class.lower() not in d_rc:
                    continue

            assessed_list.append(res)

        total = len(assessed_list)
        start = (page - 1) * page_size
        end = start + page_size
        paged_records = assessed_list[start:end]

        return {
            'year': int(year),
            'domain': target_domain_key,
            'total': total,
            'page': page,
            'page_size': page_size,
            'records': paged_records
        }

    def get_multi_domain_summary(self, year: int = 2026) -> Dict[str, Any]:
        """
        Computes vulnerability risk class distributions across all 4 domains for a given year.
        """
        self.load_data()
        is_forecast = (int(year) >= 2022)
        source_df = self.df_forecast if is_forecast else self.df_historical

        df = source_df[source_df['Year'] == int(year)].copy()
        records = df.to_dict(orient='records')

        domain_counts = {
            'water_quality': {'Low Vulnerability': 0, 'Moderate Vulnerability': 0, 'High Vulnerability': 0, 'Very High Vulnerability': 0, 'Insufficient Data': 0},
            'agriculture': {'Low Vulnerability': 0, 'Moderate Vulnerability': 0, 'High Vulnerability': 0, 'Very High Vulnerability': 0, 'Insufficient Data': 0},
            'health': {'Low Vulnerability': 0, 'Moderate Vulnerability': 0, 'High Vulnerability': 0, 'Very High Vulnerability': 0, 'Insufficient Data': 0},
            'combined': {'Low Vulnerability': 0, 'Moderate Vulnerability': 0, 'High Vulnerability': 0, 'Very High Vulnerability': 0, 'Partial Assessment': 0, 'Insufficient Data': 0}
        }

        taluk_summary = {}

        for r in records:
            res = evaluate_combined_vulnerability(r)
            t = r.get('Taluk', 'Unknown')
            if t not in taluk_summary:
                taluk_summary[t] = {
                    'total': 0,
                    'water_quality': {'Low': 0, 'Moderate': 0, 'High': 0, 'Very High': 0},
                    'agriculture': {'Low': 0, 'Moderate': 0, 'High': 0, 'Very High': 0},
                    'health': {'Low': 0, 'Moderate': 0, 'High': 0, 'Very High': 0},
                    'combined': {'Low': 0, 'Moderate': 0, 'High': 0, 'Very High': 0}
                }
            taluk_summary[t]['total'] += 1

            for d in ['water_quality', 'agriculture', 'health']:
                rc = res[d]['risk_class']
                if rc in domain_counts[d]:
                    domain_counts[d][rc] += 1
                short_tier = rc.replace(' Vulnerability', '').strip()
                if short_tier in taluk_summary[t][d]:
                    taluk_summary[t][d][short_tier] += 1

            c_rc = res['combined']['risk_class']
            base_c = res['combined'].get('base_risk_class', c_rc)
            if 'Partial' in c_rc:
                domain_counts['combined']['Partial Assessment'] += 1
            elif c_rc in domain_counts['combined']:
                domain_counts['combined'][c_rc] += 1
            
            short_c = base_c.replace(' Vulnerability', '').strip()
            if short_c in taluk_summary[t]['combined']:
                taluk_summary[t]['combined'][short_c] += 1

        total = len(records)
        domain_pcts = {}
        for d, counts in domain_counts.items():
            domain_pcts[d] = {
                k: round((v / total) * 100, 1) if total > 0 else 0.0
                for k, v in counts.items()
            }

        return {
            'year': int(year),
            'total_stations_evaluated': total,
            'is_forecast_period': is_forecast,
            'counts': domain_counts,
            'percentages': domain_pcts,
            'taluk_breakdown': taluk_summary
        }

    def get_station_assessment(self, village: Optional[str] = None, taluk: Optional[str] = None, year: int = 2026, well_no: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieves station profile, historical and forecast timeseries, and executes the 4 models for the given year.
        Supports lookup by well_no or village.
        """
        self.load_data()
        profile = self.get_station_profile(village=village, taluk=taluk, well_no=well_no)
        if not profile or (not profile['historical_series'] and not profile['forecast_series']):
            return None

        # Locate record for the target year
        target_rec = None
        if int(year) >= 2022:
            matches = [r for r in profile['forecast_series'] if r.get('Year') == int(year)]
            if matches:
                target_rec = matches[0]
        else:
            matches = [r for r in profile['historical_series'] if r.get('Year') == int(year)]
            if matches:
                target_rec = matches[0]

        # Fallback to closest available record if exact year missing
        if not target_rec:
            if profile['forecast_series']:
                target_rec = profile['forecast_series'][-1]
            elif profile['historical_series']:
                target_rec = profile['historical_series'][-1]

        loc_meta = {
            'taluk': profile.get('taluk'),
            'village': profile.get('village'),
            'well_no': profile.get('well_no'),
            'year': target_rec.get('Year', year) if target_rec else year,
            'coordinates': profile.get('coordinates')
        }

        assessment = self.assess_record(target_rec) if target_rec else None

        return {
            'station_info': {
                'village': profile['village'],
                'taluk': profile['taluk'],
                'well_no': profile['well_no'],
                'coordinates': profile['coordinates'],
                'historical_count': profile['historical_count'],
                'forecast_count': len(profile['forecast_series'])
            },
            'selected_year': int(year),
            'target_record': target_rec,
            'assessment': assessment,
            'historical_series': profile['historical_series'],
            'forecast_series': profile['forecast_series']
        }

    def get_station_profile(self, village: Optional[str] = None, taluk: Optional[str] = None, well_no: Optional[str] = None):
        self.load_data()
        
        # 1. Primary lookup by Well_No
        if well_no:
            wno_norm = str(well_no).strip().lower()
            h_df = self.df_historical[self.df_historical['Well_No'].astype(str).str.strip().str.lower() == wno_norm]
            f_df = self.df_forecast[self.df_forecast['Well_No'].astype(str).str.strip().str.lower() == wno_norm]
        elif village:
            v_norm = village.lower().strip()
            # Historical and forecast profile
            h_df = self.df_historical[self.df_historical['Village'].str.lower() == v_norm]
            f_df = self.df_forecast[self.df_forecast['Village'].str.lower() == v_norm]

            # If not found, try common transliteration variants (e.g. Varichiur <-> Varichiyur)
            if len(h_df) == 0 and len(f_df) == 0:
                alias = v_norm.replace('iur', 'iyur') if 'iur' in v_norm else v_norm.replace('iyur', 'iur')
                h_df = self.df_historical[self.df_historical['Village'].str.lower() == alias]
                f_df = self.df_forecast[self.df_forecast['Village'].str.lower() == alias]

            if len(h_df) == 0 and len(f_df) == 0 and taluk:
                h_df = self.df_historical[
                    (self.df_historical['Village'].str.lower().str.contains(v_norm[:5])) &
                    (self.df_historical['Taluk'].str.lower() == taluk.lower())
                ]
                f_df = self.df_forecast[
                    (self.df_forecast['Village'].str.lower().str.contains(v_norm[:5])) &
                    (self.df_forecast['Taluk'].str.lower() == taluk.lower())
                ]
            elif len(h_df) == 0 and len(f_df) == 0:
                h_df = self.df_historical[self.df_historical['Village'].str.lower().str.contains(v_norm[:5])]
                f_df = self.df_forecast[self.df_forecast['Village'].str.lower().str.contains(v_norm[:5])]
        else:
            return None

        coords = None
        out_well_no = well_no
        actual_taluk = None
        actual_village = village

        if len(f_df) > 0:
            first_f = f_df.iloc[0]
            actual_taluk = first_f['Taluk']
            actual_village = village if village else first_f['Village']
            out_well_no = first_f['Well_No']
            if pd.notnull(first_f['Latitude']) and pd.notnull(first_f['Longitude']):
                coords = [float(first_f['Longitude']), float(first_f['Latitude'])]

        if coords is None and len(h_df) > 0:
            first_h = h_df.iloc[0]
            actual_taluk = first_h['Taluk']
            actual_village = village if village else first_h['Village']
            out_well_no = first_h['Well_No']
            if pd.notnull(first_h['Latitude']) and pd.notnull(first_h['Longitude']):
                coords = [float(first_h['Longitude']), float(first_h['Latitude'])]

        return {
            'village': actual_village,
            'taluk': actual_taluk,
            'well_no': out_well_no,
            'coordinates': coords,
            'historical_count': len(h_df),
            'historical_series': h_df.sort_values('Year').to_dict(orient='records'),
            'forecast_series': f_df.sort_values('Year').to_dict(orient='records')
        }

    def get_metrics(self):
        self.load_data()
        return self.metrics

    def get_validation(self):
        self.load_data()
        return self.validation

    def get_geojson(self, layer: str, year: Optional[int] = None, domain: str = 'combined'):
        """
        Retrieves GeoJSON layer.
        For 'stations', if a year is provided (e.g. 2026), enriches every station point
        feature with multi-domain vulnerability assessments for immediate thematic rendering!
        """
        self.load_data()
        if layer == 'taluks':
            return self.taluks_geojson
        elif layer == 'district':
            return self.district_geojson
        elif layer == 'stations':
            if year is None:
                year = 2026

            is_forecast = (int(year) >= 2022)
            source_df = self.df_forecast if is_forecast else self.df_historical
            year_df = source_df[source_df['Year'] == int(year)]

            # Map station records primarily by Well_No
            rec_map = {}
            for r in year_df.to_dict(orient='records'):
                if r.get('Well_No'):
                    rec_map[str(r['Well_No']).strip().lower()] = r
                k1 = (r.get('Taluk', '').strip().lower(), r.get('Village', '').strip().lower())
                if k1 not in rec_map:
                    rec_map[k1] = r

            enriched_features = []
            for feat in self.stations_geojson.get('features', []):
                new_f = {
                    'type': feat['type'],
                    'geometry': feat['geometry'],
                    'properties': dict(feat['properties'])
                }
                p = new_f['properties']
                t_key = p.get('Taluk', '').strip().lower()
                v_key = p.get('Village', '').strip().lower()
                w_key = str(p.get('Well_No', '') or p.get('Well No', '')).strip().lower()

                # Prioritize Well_No match first to prevent village-level merging!
                matched_r = rec_map.get(w_key) or rec_map.get((t_key, v_key))
                if matched_r:
                    ass = evaluate_combined_vulnerability(matched_r)
                    p['Year'] = int(year)
                    p['TDS'] = matched_r.get('TDS')
                    p['EC'] = matched_r.get('EC')
                    p['Fluoride'] = matched_r.get('Fluoride')
                    p['pH'] = matched_r.get('pH')
                    p['water_quality_risk'] = ass['water_quality']['risk_class']
                    p['water_quality_score'] = ass['water_quality'].get('score')
                    p['agriculture_risk'] = ass['agriculture']['risk_class']
                    p['agriculture_score'] = ass['agriculture'].get('score')
                    p['health_risk'] = ass['health']['risk_class']
                    p['health_score'] = ass['health'].get('score')
                    p['combined_risk'] = ass['combined']['risk_class']
                    p['combined_base_risk'] = ass['combined'].get('base_risk_class')
                    p['combined_score'] = ass['combined'].get('composite_score')
                    p['drinking_suitability'] = matched_r.get('Drinking_Suitability', 'Unassessed')

                    # Set active_risk based on requested domain
                    d_norm = domain.lower()
                    if 'water' in d_norm:
                        p['active_risk'] = p['water_quality_risk']
                        p['active_score'] = p['water_quality_score']
                        p['active_factors'] = ass['water_quality'].get('key_factors', [])
                    elif 'agri' in d_norm:
                        p['active_risk'] = p['agriculture_risk']
                        p['active_score'] = p['agriculture_score']
                        p['active_factors'] = ass['agriculture'].get('key_factors', [])
                    elif 'health' in d_norm:
                        p['active_risk'] = p['health_risk']
                        p['active_score'] = p['health_score']
                        p['active_factors'] = ass['health'].get('key_factors', [])
                    else:
                        p['active_risk'] = p['combined_risk']
                        p['active_score'] = p['combined_score']
                        p['active_factors'] = ass['combined'].get('key_factors', [])
                else:
                    p['active_risk'] = 'Insufficient Data'
                    p['active_factors'] = ['No record available for selected year.']

                enriched_features.append(new_f)

            return {
                'type': 'FeatureCollection',
                'features': enriched_features
            }
        else:
            return None

data_service = DataService()
