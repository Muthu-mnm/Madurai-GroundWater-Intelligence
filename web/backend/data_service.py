import json
from pathlib import Path
import pandas as pd
import numpy as np

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

    def get_station_profile(self, village, taluk=None):
        self.load_data()
        v_norm = village.lower().strip()
        
        # Historical profile
        h_df = self.df_historical[self.df_historical['Village'].str.lower() == v_norm]
        if len(h_df) == 0 and taluk:
            h_df = self.df_historical[
                (self.df_historical['Village'].str.lower().str.contains(v_norm)) &
                (self.df_historical['Taluk'].str.lower() == taluk.lower())
            ]

        # Forecast profile
        f_df = self.df_forecast[self.df_forecast['Village'].str.lower() == v_norm]
        if len(f_df) == 0 and taluk:
            f_df = self.df_forecast[
                (self.df_forecast['Village'].str.lower().str.contains(v_norm)) &
                (self.df_forecast['Taluk'].str.lower() == taluk.lower())
            ]

        coords = None
        well_no = None
        actual_taluk = None
        actual_village = village

        if len(f_df) > 0:
            first_f = f_df.iloc[0]
            actual_taluk = first_f['Taluk']
            actual_village = first_f['Village']
            well_no = first_f['Well_No']
            if pd.notnull(first_f['Latitude']) and pd.notnull(first_f['Longitude']):
                coords = [float(first_f['Longitude']), float(first_f['Latitude'])]

        if coords is None and len(h_df) > 0:
            first_h = h_df.iloc[0]
            actual_taluk = first_h['Taluk']
            actual_village = first_h['Village']
            well_no = first_h['Well_No']
            if pd.notnull(first_h['Latitude']) and pd.notnull(first_h['Longitude']):
                coords = [float(first_h['Longitude']), float(first_h['Latitude'])]

        return {
            'village': actual_village,
            'taluk': actual_taluk,
            'well_no': well_no,
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

    def get_geojson(self, layer):
        self.load_data()
        if layer == 'taluks':
            return self.taluks_geojson
        elif layer == 'district':
            return self.district_geojson
        elif layer == 'stations':
            return self.stations_geojson
        else:
            return None

data_service = DataService()
