"""
Regression and Data-Integrity Tests for Well Identity, Multi-Domain Vulnerability,
and Data-to-Prediction Pipeline Integrity.
"""

import unittest
import sys
import hashlib
from pathlib import Path
import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from model.src.model import AdaptiveEnsembleForecaster
from web.backend.prediction_service import prediction_service
from web.backend.combined_vulnerability_service import evaluate_combined_vulnerability

class TestWellIdentityAndPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.root_dir = Path(__file__).resolve().parent.parent
        cls.df_hist = pd.read_csv(cls.root_dir / "data" / "historical_groundwater_2007_2021.csv")
        cls.df_fc = pd.read_csv(cls.root_dir / "data" / "forecast_results_2022_2030.csv")
        cls.forecaster = AdaptiveEnsembleForecaster.load(cls.root_dir / "model" / "artifacts" / "adaptive_ensemble_model.joblib")

    def test_distinct_wells_same_village_maintain_separate_histories(self):
        """
        Critical regression test: Verify that multiple monitoring wells in the same village
        (e.g., 21001D and 83005 in Thiruparankundram) maintain distinct historical time series
        and are never averaged together into synthetic village observations.
        """
        thiru_hist = self.df_hist[self.df_hist['Village'].str.lower() == 'thiruparankundram']
        unique_wells = thiru_hist['Well_No'].astype(str).str.strip().unique()
        self.assertGreaterEqual(len(unique_wells), 2, "Thiruparankundram must have at least 2 distinct wells")
        self.assertIn('21001D', unique_wells)
        self.assertIn('83005', unique_wells)

        # Confirm distinct historical measurements
        mean_21001D = thiru_hist[thiru_hist['Well_No'] == '21001D']['TDS'].mean()
        mean_83005 = thiru_hist[thiru_hist['Well_No'] == '83005']['TDS'].mean()
        self.assertNotEqual(mean_21001D, mean_83005, "Wells 21001D and 83005 must have distinct historical averages")

    def test_distinct_wells_same_village_receive_separate_forecasts(self):
        """
        Verify that multiple wells in the same village receive independent forecasts through 2030.
        """
        thiru_fc = self.df_fc[self.df_fc['Village'].str.lower() == 'thiruparankundram']
        fc_wells = thiru_fc['Well_No'].astype(str).str.strip().unique()
        self.assertIn('21001D', fc_wells)
        self.assertIn('83005', fc_wells)

        # Confirm separate predictions for each forecast year
        for yr in range(2022, 2031):
            pred_1 = thiru_fc[(thiru_fc['Well_No'] == '21001D') & (thiru_fc['Year'] == yr)]
            pred_2 = thiru_fc[(thiru_fc['Well_No'] == '83005') & (thiru_fc['Year'] == yr)]
            self.assertEqual(len(pred_1), 1)
            self.assertEqual(len(pred_2), 1)
            self.assertNotEqual(pred_1['TDS'].values[0], pred_2['TDS'].values[0])

    def test_no_silent_fallback_matching_by_village_alone(self):
        """
        Verify that ambiguous village requests where multiple wells exist raise ValueError
        rather than picking the first well arbitrarily.
        """
        with self.assertRaises(ValueError):
            self.forecaster.predict_station(village='Thiruparankundram', year=2026)

        # Explicit well_no requests succeed without ambiguity
        res1 = self.forecaster.predict_station(well_no='21001D', year=2026)
        self.assertEqual(res1['Well_No'], '21001D')
        res2 = self.forecaster.predict_station(well_no='83005', year=2026)
        self.assertEqual(res2['Well_No'], '83005')

    def test_all_166_monitoring_wells_forecast_through_2030(self):
        """Verify all 166 physical monitoring wells have 9 forecast horizons (2022-2030 = 1494 rows)."""
        unique_fc_wells = self.df_fc['Well_No'].astype(str).str.strip().unique()
        self.assertEqual(len(unique_fc_wells), 166)
        self.assertEqual(len(self.df_fc), 1494)
        self.assertEqual(self.df_fc['Year'].min(), 2022)
        self.assertEqual(self.df_fc['Year'].max(), 2030)

    def test_multi_domain_risk_classes_present_in_all_records(self):
        """Verify that all 4 domain vulnerability outputs exist across all 1494 records."""
        required_domains = [
            'Water_Quality_Risk_Class',
            'Agriculture_Risk_Class',
            'Health_Risk_Class',
            'Combined_Risk_Class'
        ]
        for d in required_domains:
            self.assertIn(d, self.df_fc.columns)
            self.assertEqual(self.df_fc[d].isnull().sum(), 0, f"Found missing values in {d}")

    def test_protective_override_non_masking_severity(self):
        """
        Verify that severe risk in one domain cannot be masked or diluted by low risk in other domains.
        In this scenario, severe sodicity (SAR=28.0) triggers Very High Agriculture Vulnerability.
        Even though Water Quality and Health remain Low Vulnerability, Combined Vulnerability
        correctly overrides to Very High Vulnerability.
        """
        synthetic_record = {
            'TDS': 450.0, 'TDS_Upper_CI': 490.0, 'TDS_Lower_CI': 410.0,
            'EC': 700.0, 'EC_Upper_CI': 740.0, 'EC_Lower_CI': 660.0,
            'pH': 7.4, 'pH_Upper_CI': 7.6, 'pH_Lower_CI': 7.2,
            'Fluoride': 0.8, 'Fluoride_Upper_CI': 0.9, 'Fluoride_Lower_CI': 0.7,
            'NO3': 15.0, 'NO3_Upper_CI': 20.0, 'NO3_Lower_CI': 10.0,
            'Cl': 150.0, 'Ca': 50.0, 'Mg': 25.0,
            'SAR': 28.0, 'SAR_Upper_CI': 32.0, 'SAR_Lower_CI': 24.0, # Severe Sodicity Hazard (>26)
            'RSC': 0.5, 'Na%': 25.0,
            'Year': 2026
        }
        res = evaluate_combined_vulnerability(synthetic_record)
        self.assertEqual(res['water_quality']['risk_class'], 'Low Vulnerability')
        self.assertEqual(res['agriculture']['risk_class'], 'Very High Vulnerability')
        self.assertEqual(res['health']['risk_class'], 'Low Vulnerability')
        self.assertEqual(res['combined']['base_risk_class'], 'Very High Vulnerability')
        self.assertIn('Protective severity rule triggered', res['combined']['explanation'])

    def test_physical_interval_bounds(self):
        """Verify Sorensen scale pH in [0, 14], Na% in [0, 100], and other parameters non-negative."""
        self.assertTrue((self.df_fc['pH'] >= 0.0).all())
        self.assertTrue((self.df_fc['pH'] <= 14.0).all())
        self.assertTrue((self.df_fc['pH_Lower_CI'] >= 0.0).all())
        self.assertTrue((self.df_fc['pH_Upper_CI'] <= 14.0).all())

        self.assertTrue((self.df_fc['Na%'] >= 0.0).all())
        self.assertTrue((self.df_fc['Na%'] <= 100.0).all())

        for p in ['TDS', 'EC', 'Fluoride', 'NO3', 'Cl', 'Ca', 'Mg', 'SAR']:
            self.assertTrue((self.df_fc[f'{p}_Lower_CI'] >= 0.0).all())

    def test_custom_simulation_rejects_missing_inputs_without_fallback_defaults(self):
        """Custom simulation must require explicit inputs rather than inventing fake chemistry."""
        with self.assertRaises(ValueError):
            prediction_service.predict(target_year=2026)

    def test_backend_frontend_forecast_synchronization(self):
        """Verify that backend and frontend forecast datasets have matching SHA-256 hashes."""
        backend_csv = self.root_dir / "data" / "forecast_results_2022_2030.csv"
        frontend_csv = self.root_dir / "web" / "frontend" / "public" / "data" / "forecast_results_2022_2030.csv"
        
        with open(backend_csv, 'rb') as f:
            h_back = hashlib.sha256(f.read()).hexdigest()
        with open(frontend_csv, 'rb') as f:
            h_front = hashlib.sha256(f.read()).hexdigest()
            
        self.assertEqual(h_back, h_front, "Frontend and backend forecast CSV files must be identical")

if __name__ == '__main__':
    unittest.main()
