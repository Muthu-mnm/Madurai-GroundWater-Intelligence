"""
Train and Serialize Multi-Domain Adaptive Ensemble Forecaster (2007-2030)
Trains on all top metrics requested for:
1. Agriculture: EC, SAR, RSC, Na%, pH
2. Human Health: Fluoride, NO3, TDS, pH, Cl
3. Water Quality Monitoring: pH, EC, TDS, Fluoride, NO3, Cl
"""

import json
import sys
from pathlib import Path
import pandas as pd
import numpy as np

# Ensure root & model/src are on sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(root_dir / "model"))

from model.src.model import AdaptiveEnsembleForecaster

def train_and_export():
    hist_path = root_dir / "data" / "historical_groundwater_2007_2021.json"
    print(f"Loading historical data from: {hist_path}")
    with open(hist_path, "r", encoding="utf-8") as f:
        hist_data = json.load(f)
    
    df = pd.DataFrame(hist_data)
    
    # 9 Core metrics across Agriculture, Human Health, and Water Quality
    key_cols = ['TDS', 'EC', 'pH', 'Fluoride', 'NO3', 'Cl', 'SAR', 'RSC', 'Na%']
    print(f"Training on top metrics ({len(key_cols)}): {key_cols}")
    
    # Aggregate annual village observations
    agg_dict = {col: 'mean' for col in key_cols}
    agg_dict['Well_No'] = 'nunique'
    
    v_annual = df.groupby(['Taluk', 'Village', 'Year']).agg(agg_dict).rename(
        columns={'Well_No': 'Sample_Count'}
    ).reset_index()
    
    # Align exactly with the 154 features in madurai_stations.geojson
    stations_geojson_path = root_dir / "data" / "madurai_stations.geojson"
    stations_to_run = []
    coords_dict = {}
    if stations_geojson_path.exists():
        with open(stations_geojson_path, "r", encoding="utf-8") as f:
            st_geojson = json.load(f)
        for feat in st_geojson.get('features', []):
            p = feat['properties']
            geom = feat.get('geometry', {})
            coords = geom.get('coordinates', [78.12, 9.92])
            t = p.get('Taluk', 'Madurai South')
            v = p.get('Village', 'Unknown')
            w = p.get('Well_No', '501001')
            stations_to_run.append([t, v])
            coords_dict[(t.lower(), v.lower())] = {
                'Latitude': coords[1],
                'Longitude': coords[0],
                'Well_No': w
            }
            # also map by village alone for fallback
            coords_dict[v.lower()] = {
                'Latitude': coords[1],
                'Longitude': coords[0],
                'Well_No': w
            }
        print(f"Aligned to all {len(stations_to_run)} monitoring stations from madurai_stations.geojson")

    # Initialize and fit model
    forecaster = AdaptiveEnsembleForecaster(key_cols=key_cols, origin_year=2021)
    forecaster.fit(v_annual)
    
    # Save model artifacts
    artifacts_dir = root_dir / "model" / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    forecaster.save(artifacts_dir / "adaptive_ensemble_model.joblib")
    forecaster.save(artifacts_dir / "adaptive_ensemble_model.pkl")
    
    forecast_years = list(range(2022, 2031))
    forecast_records = []
    
    for taluk, village in stations_to_run:
        meta = coords_dict.get((taluk.lower(), village.lower()), {})
        for yr in forecast_years:
            pred = forecaster.predict_station(taluk, village, yr)
            pred['Model_Selected'] = 'Adaptive Ensemble'
            pred['Calibration_Method'] = 'Empirical Bayes Residual Scaling'
            pred['Nominal_Interval_Coverage'] = 'Nominal 80%'
            pred['Latitude'] = meta.get('Latitude', 9.92)
            pred['Longitude'] = meta.get('Longitude', 78.12)
            pred['Well_No'] = meta.get('Well_No', '501001')
            
            # Map Drinking Suitability
            risk = pred.get('Risk_Level', 'Low Risk')
            if 'High' in risk:
                pred['Drinking_Suitability'] = 'Not Drinkable'
            elif 'Medium' in risk or 'Borderline' in risk:
                pred['Drinking_Suitability'] = 'Required Boiling'
            else:
                pred['Drinking_Suitability'] = 'Drinkable'
                
            forecast_records.append(pred)
            
    fc_df = pd.DataFrame(forecast_records)
    print(f"Generated {len(fc_df)} forecast records across {len(stations_to_run)} stations (2022-2030).")
    
    # Export to data/ and web/frontend/public/data/
    data_out_json = root_dir / "data" / "forecast_results_2022_2030.json"
    data_out_csv = root_dir / "data" / "forecast_results_2022_2030.csv"
    web_out_json = root_dir / "web" / "frontend" / "public" / "data" / "forecast_results_2022_2030.json"
    web_out_csv = root_dir / "web" / "frontend" / "public" / "data" / "forecast_results_2022_2030.csv"
    
    print(f"Writing JSON to {data_out_json} and {web_out_json}...")
    fc_json_str = fc_df.to_json(orient='records', indent=2)
    with open(data_out_json, "w", encoding="utf-8") as f:
        f.write(fc_json_str)
    with open(web_out_json, "w", encoding="utf-8") as f:
        f.write(fc_json_str)
        
    print(f"Writing CSV to {data_out_csv} and {web_out_csv}...")
    fc_df.to_csv(data_out_csv, index=False)
    fc_df.to_csv(web_out_csv, index=False)
    
    # Update forecast_metadata.json
    meta_path = root_dir / "model" / "outputs" / "forecast_metadata.json"
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        meta['primary_targets'] = key_cols
        meta['top_metrics'] = {
            'agriculture': ['EC', 'SAR', 'RSC', 'Na%', 'pH'],
            'human_health': ['Fluoride', 'NO3', 'TDS', 'pH', 'Cl'],
            'water_quality_monitoring': ['pH', 'EC', 'TDS', 'Fluoride', 'NO3', 'Cl']
        }
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
            
    print("Forecaster training and multi-domain forecast export complete!")

if __name__ == "__main__":
    train_and_export()
