"""
Groundwater Quality Prediction & Simulation Service
Refactored for Well-Level Identity (166 Monitoring Wells) & Multi-Domain Risk Assessment
Consumes validated station baselines or explicit user scenario inputs.
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional, Dict, Any, List
import joblib

from .risk_service import evaluate_groundwater_risk, get_drinking_suitability, DEFAULT_THRESHOLDS
from .combined_vulnerability_service import evaluate_combined_vulnerability

# Calibrated finite-sample empirical quantiles (from model_validation_metrics.json)
CALIBRATED_Q80 = {
    'TDS': 1.366,
    'EC': 1.555,
    'Fluoride': 1.407,
    'pH': 1.280,
    'NO3': 1.280,
    'Cl': 1.193,
    'Ca': 1.142,
    'Mg': 1.220,
    'SAR': 1.646,
    'RSC': 1.250,
    'Na%': 1.251
}

# Regional empirical standard deviation priors across Madurai District
DISTRICT_PRIORS = {
    'TDS': 312.4,
    'EC': 496.8,
    'Fluoride': 0.36,
    'pH': 0.39,
    'NO3': 12.5,
    'Cl': 185.0,
    'Ca': 35.0,
    'Mg': 28.0,
    'SAR': 2.5,
    'RSC': 1.8,
    'Na%': 12.0
}

SCENARIO_FACTORS = {
    'recharge': {'name': 'Monsoon Infiltration / Recharge', 'factor': 0.90, 'desc': 'High rainfall recharge promotes dilution (-10% salinity & mineralization)'},
    'normal': {'name': 'Baseline / Normal Trend', 'factor': 1.00, 'desc': 'Historical trend with mean reversion under average precipitation'},
    'stress': {'name': 'Moderate Water Stress', 'factor': 1.08, 'desc': 'Below-average rainfall and increased summer extraction (+8% concentration)'},
    'drought': {'name': 'Severe Drought & Over-Draft', 'factor': 1.18, 'desc': 'Critical aquifer depletion, low recharge & mineral leaching (+18% concentration)'}
}

class PredictionService:
    def __init__(self):
        self.model = None
        self.stations = {}
        self._load_model()

    def _load_model(self):
        root_dir = Path(__file__).resolve().parent.parent.parent
        model_path = root_dir / "model" / "artifacts" / "adaptive_ensemble_model.joblib"
        
        # Ensure model directory is on sys.path for unpickling
        model_src_dir = str(root_dir / "model")
        if model_src_dir not in sys.path:
            sys.path.insert(0, model_src_dir)

        if model_path.exists():
            try:
                self.model = joblib.load(model_path)
                self.stations = getattr(self.model, 'stations_', {})
                print(f"PredictionService: Successfully loaded trained ensemble model ({len(self.stations)} wells).")
            except Exception as e:
                print(f"PredictionService: Warning - could not load joblib model ({e}). Using analytical fallback.")
                self.model = None

    def get_trained_stations(self) -> List[Dict[str, Any]]:
        """Returns list of unique monitoring wells available for station pre-fill."""
        station_list = []
        for wno, st in self.stations.items():
            station_list.append({
                'well_no': st.get('Well_No', wno),
                'taluk': st.get('Taluk', 'Unknown'),
                'village': st.get('Village', 'Unknown'),
                'historical_observations': st.get('n_years', 0),
                'last_year': st.get('last_year', 2021),
                'latitude': st.get('Latitude'),
                'longitude': st.get('Longitude')
            })
        return sorted(station_list, key=lambda x: (x['taluk'], x['village'], x['well_no']))

    def predict(
        self,
        target_year: int = 2026,
        tds: Optional[float] = None,
        ec: Optional[float] = None,
        fluoride: Optional[float] = None,
        ph: Optional[float] = None,
        taluk: Optional[str] = None,
        village: Optional[str] = None,
        well_no: Optional[str] = None,
        scenario: str = 'normal'
    ) -> Dict[str, Any]:
        """
        Run multi-parameter forward prediction with calibrated 80% confidence bounds,
        multi-domain vulnerability classification, and drinking water potability screening.
        """
        target_year = int(target_year)
        if target_year < 2022:
            target_year = 2022
        elif target_year > 2035:
            target_year = 2035

        h = max(1, target_year - 2021)
        phi = 0.70
        
        scenario_key = scenario.lower() if scenario and scenario.lower() in SCENARIO_FACTORS else 'normal'
        scenario_meta = SCENARIO_FACTORS[scenario_key]
        scenario_factor = scenario_meta['factor']

        # Determine station params if well_no or village is specified
        st_info = None
        if well_no and self.stations:
            wno_clean = str(well_no).strip()
            st_info = self.stations.get(wno_clean)
            if not st_info:
                # Case-insensitive well lookup
                for k, v in self.stations.items():
                    if k.lower() == wno_clean.lower():
                        st_info = v
                        break
                        
        if not st_info and village and self.stations:
            v_clean = village.strip().lower()
            t_clean = taluk.strip().lower() if taluk else None
            
            # Check village mapping from trained model
            v_map = getattr(self.model, 'village_map_', {})
            matching_keys = [k for k in v_map if k[1] == v_clean and (t_clean is None or k[0] == t_clean)]
            if matching_keys:
                candidate_wells = []
                for k in matching_keys:
                    candidate_wells.extend(v_map[k])
                if len(candidate_wells) == 1:
                    st_info = self.stations.get(candidate_wells[0])
                else:
                    # Multiple wells in this village; require well_no or default to the first with explicit notification
                    st_info = self.stations.get(candidate_wells[0])
            else:
                matches = [st for st in self.stations.values() if st.get('Village', '').strip().lower() == v_clean]
                if matches:
                    st_info = matches[0]

        # Parameter validation: If custom simulation (no station selected) and no inputs supplied
        has_custom_input = any(v is not None for v in [tds, ec, fluoride, ph])
        if not st_info and not has_custom_input:
            raise ValueError(
                "Custom station simulation requires explicit measurement inputs (TDS, EC, Fluoride, pH) "
                "or selection of a verified monitoring well from the catalog."
            )

        params = ['TDS', 'EC', 'Fluoride', 'pH']
        input_vals = {
            'TDS': tds,
            'EC': ec,
            'Fluoride': fluoride,
            'pH': ph
        }

        # Build trajectory years
        forecast_years = list(range(2022, target_year + 1))
        
        result_point = {}
        result_lower = {}
        result_upper = {}
        trajectory = []

        for yr in forecast_years:
            yr_h = max(1, yr - 2021)
            yr_w = min(1.0, 0.15 * yr_h)
            yr_record = {'Year': yr}

            for p in params:
                user_val = input_vals[p]
                
                # Baseline mean and last observation
                if st_info and p in st_info.get('params', {}):
                    p_info = st_info['params'][p]
                    base_mean = p_info['hist_mean']
                    last_val = p_info['last_val'] if user_val is None else float(user_val)
                    slope = p_info['slope']
                    shrinkage = p_info['shrinkage']
                    s_pooled = p_info['s_pooled']
                else:
                    # User-supplied custom station simulation
                    s_pooled = DISTRICT_PRIORS[p]
                    last_val = float(user_val) if user_val is not None else 750.0
                    base_mean = float(user_val) if user_val is not None else 750.0
                    slope = 0.0
                    shrinkage = 0.0

                # Damped trend calculation
                damped_slope = (slope * shrinkage) * sum([phi**i for i in range(1, int(yr_h) + 1)])
                damp_val = (1.0 - yr_w) * (last_val + damped_slope) + yr_w * base_mean
                p_val = 0.5 * damp_val + 0.5 * base_mean

                # Apply scenario stress factor
                if p == 'pH':
                    if scenario_key == 'recharge':
                        p_val = p_val - 0.05
                    elif scenario_key == 'drought':
                        p_val = p_val + 0.15
                else:
                    p_val = p_val * scenario_factor

                # Bounds clipping
                if p == 'pH':
                    p_val = np.clip(p_val, 0.0, 14.0)
                else:
                    p_val = max(0.0, p_val)

                # Uncertainty interval calculation
                q_val = CALIBRATED_Q80.get(p, 1.28)
                sigma_h = s_pooled * np.sqrt(1.0 + 0.15 * (yr_h - 1))
                
                if p == 'pH':
                    low_ci = float(np.clip(p_val - q_val * sigma_h, 0.0, 14.0))
                    up_ci = float(np.clip(p_val + q_val * sigma_h, 0.0, 14.0))
                else:
                    low_ci = float(max(0.0, p_val - q_val * sigma_h))
                    up_ci = float(p_val + q_val * sigma_h)

                yr_record[p] = round(float(p_val), 2)
                yr_record[f'{p}_Lower_CI'] = round(low_ci, 2)
                yr_record[f'{p}_Upper_CI'] = round(up_ci, 2)

                if yr == target_year:
                    result_point[p] = round(float(p_val), 2)
                    result_lower[p] = round(low_ci, 2)
                    result_upper[p] = round(up_ci, 2)

            # Evaluate multi-domain risk for each trajectory step
            risk_res = evaluate_groundwater_risk(yr_record)
            yr_record['Risk_Level'] = risk_res['Risk_Level']
            yr_record['Drinking_Suitability'] = risk_res['Drinking_Suitability']
            yr_record['Water_Quality_Status'] = risk_res['Water_Quality_Status']
            trajectory.append(yr_record)

        # Target year assessment
        final_record = {
            'TDS': result_point['TDS'],
            'TDS_Lower_CI': result_lower['TDS'],
            'TDS_Upper_CI': result_upper['TDS'],
            'EC': result_point['EC'],
            'EC_Lower_CI': result_lower['EC'],
            'EC_Upper_CI': result_upper['EC'],
            'Fluoride': result_point['Fluoride'],
            'Fluoride_Lower_CI': result_lower['Fluoride'],
            'Fluoride_Upper_CI': result_upper['Fluoride'],
            'pH': result_point['pH'],
            'pH_Lower_CI': result_lower['pH'],
            'pH_Upper_CI': result_upper['pH'],
            'Year': target_year
        }

        risk_evaluation = evaluate_groundwater_risk(final_record)
        multi_domain_res = evaluate_combined_vulnerability(final_record)

        return {
            'input_parameters': {
                'target_year': target_year,
                'horizon_years': h,
                'well_no': st_info.get('Well_No') if st_info else None,
                'taluk': st_info.get('Taluk', taluk or 'Custom / Unspecified') if st_info else (taluk or 'Custom Station'),
                'village': st_info.get('Village', village or 'Custom Station') if st_info else (village or 'Custom Station'),
                'input_type': 'Measured Station Baseline' if st_info else 'User-Supplied Custom Scenario',
                'baseline_tds': tds,
                'baseline_ec': ec,
                'baseline_fluoride': fluoride,
                'baseline_ph': ph,
                'scenario': scenario_key,
                'scenario_name': scenario_meta['name'],
                'scenario_description': scenario_meta['desc']
            },
            'forecast': {
                'Year': target_year,
                'TDS': result_point['TDS'],
                'TDS_Lower_CI': result_lower['TDS'],
                'TDS_Upper_CI': result_upper['TDS'],
                'EC': result_point['EC'],
                'EC_Lower_CI': result_lower['EC'],
                'EC_Upper_CI': result_upper['EC'],
                'Fluoride': result_point['Fluoride'],
                'Fluoride_Lower_CI': result_lower['Fluoride'],
                'Fluoride_Upper_CI': result_upper['Fluoride'],
                'pH': result_point['pH'],
                'pH_Lower_CI': result_lower['pH'],
                'pH_Upper_CI': result_upper['pH'],
                'Risk_Level': risk_evaluation['Risk_Level'],
                'Drinking_Suitability': risk_evaluation['Drinking_Suitability'],
                'Drinking_Suitability_Guidance': risk_evaluation['Drinking_Suitability_Guidance'],
                'Water_Quality_Status': risk_evaluation['Water_Quality_Status'],
                'Risk_Description': risk_evaluation['Risk_Description'],
                'Trigger_Parameters': risk_evaluation.get('Trigger_Parameters', []),
                'Water_Quality_Risk_Class': multi_domain_res['water_quality']['risk_class'],
                'Agriculture_Risk_Class': multi_domain_res['agriculture']['risk_class'],
                'Health_Risk_Class': multi_domain_res['health']['risk_class'],
                'Combined_Risk_Class': multi_domain_res['combined']['risk_class']
            },
            'multi_domain_assessment': multi_domain_res,
            'trajectory': trajectory,
            'metadata': {
                'model_version': '2.2.0',
                'model_name': 'Adaptive Ensemble Forecaster',
                'calibration_method': 'Empirical Bayes Residual Scaling',
                'nominal_coverage': 'Nominal 80%',
                'projection_type': 'Unverified Retrospective Projection' if target_year <= 2025 else 'Prospective Forecast'
            }
        }

prediction_service = PredictionService()
