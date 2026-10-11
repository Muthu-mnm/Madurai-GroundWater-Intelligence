import unittest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from web.backend.risk_service import evaluate_groundwater_risk, DEFAULT_THRESHOLDS

class TestGroundwaterRiskAssessment(unittest.TestCase):
    
    def setUp(self):
        # Baseline desirable values strictly compliant with desirable limits
        self.base_desirable = {
            'TDS': 400.0, 'TDS_Lower_CI': 300.0, 'TDS_Upper_CI': 490.0,
            'EC': 600.0, 'EC_Lower_CI': 500.0, 'EC_Upper_CI': 720.0,
            'Fluoride': 0.70, 'Fluoride_Lower_CI': 0.50, 'Fluoride_Upper_CI': 0.90,
            'pH': 7.4, 'pH_Lower_CI': 7.0, 'pH_Upper_CI': 7.8
        }

    def test_low_risk_classification_when_all_bounds_compliant(self):
        """Strict Low Risk: Point AND all uncertainty bounds within desirable limits."""
        res = evaluate_groundwater_risk(self.base_desirable)
        self.assertEqual(res['Risk_Level'], 'Low Risk')
        self.assertIn('Desirable Quality', res['Water_Quality_Status'])

    def test_rejection_of_low_risk_when_interval_crosses_desirable_limit(self):
        """
        Point estimate is desirable (TDS=450 <= 500), but Upper CI (650 > 500) crosses desirable threshold.
        Must NOT be classified as Low Risk! It enters Medium Risk (Permissible).
        """
        rec = dict(self.base_desirable)
        rec['TDS'] = 450.0
        rec['TDS_Upper_CI'] = 650.0 # crosses 500
        res = evaluate_groundwater_risk(rec)
        self.assertNotEqual(res['Risk_Level'], 'Low Risk')
        self.assertEqual(res['Risk_Level'], 'Medium Risk (Permissible)')
        self.assertIn('TDS in permissible range', res['Risk_Description'])

    def test_high_risk_point_fluoride_exceedance(self):
        """Point Fluoride > 1.5 mg/L triggers High Risk."""
        rec = dict(self.base_desirable)
        rec['Fluoride'] = 1.80
        rec['Fluoride_Upper_CI'] = 2.20
        res = evaluate_groundwater_risk(rec)
        self.assertEqual(res['Risk_Level'], 'High Risk')
        self.assertIn('Fluoride Point Exceedance', res['Risk_Description'])

    def test_high_risk_point_tds_exceedance(self):
        """Point TDS > 2000 mg/L triggers High Risk."""
        rec = dict(self.base_desirable)
        rec['TDS'] = 2200.0
        rec['TDS_Upper_CI'] = 2600.0
        res = evaluate_groundwater_risk(rec)
        self.assertEqual(res['Risk_Level'], 'High Risk')
        self.assertIn('TDS Point Exceedance', res['Risk_Description'])

    def test_high_risk_point_ec_exceedance(self):
        """Point EC > 2250 µS/cm triggers High Risk."""
        rec = dict(self.base_desirable)
        rec['EC'] = 2500.0
        rec['EC_Upper_CI'] = 2900.0
        res = evaluate_groundwater_risk(rec)
        self.assertEqual(res['Risk_Level'], 'High Risk')
        self.assertIn('EC Point Exceedance', res['Risk_Description'])

    def test_high_risk_ph_outside_range(self):
        """Point pH < 6.5 or > 8.5 triggers High Risk."""
        rec_acidic = dict(self.base_desirable)
        rec_acidic['pH'] = 6.2
        res_acidic = evaluate_groundwater_risk(rec_acidic)
        self.assertEqual(res_acidic['Risk_Level'], 'High Risk')

        rec_alkaline = dict(self.base_desirable)
        rec_alkaline['pH'] = 8.8
        res_alkaline = evaluate_groundwater_risk(rec_alkaline)
        self.assertEqual(res_alkaline['Risk_Level'], 'High Risk')

    def test_medium_risk_borderline_via_upper_ci_breach(self):
        """Point estimate permissible, but Upper CI breaches high-risk threshold."""
        rec = dict(self.base_desirable)
        rec['Fluoride'] = 1.30 # Permissible point
        rec['Fluoride_Upper_CI'] = 1.65 # Breaches 1.5 threshold
        res = evaluate_groundwater_risk(rec)
        self.assertEqual(res['Risk_Level'], 'Medium Risk (Borderline)')
        self.assertIn('Fluoride Upper CI breach', res['Risk_Description'])

    def test_medium_risk_borderline_via_ph_bounds(self):
        """Point pH compliant (7.2), but Lower CI < 6.5 or Upper CI > 8.5 triggers Borderline."""
        rec_low = dict(self.base_desirable)
        rec_low['pH'] = 6.8
        rec_low['pH_Lower_CI'] = 6.3 # Drops below 6.5
        res_low = evaluate_groundwater_risk(rec_low)
        self.assertEqual(res_low['Risk_Level'], 'Medium Risk (Borderline)')
        self.assertIn('corrosion risk', res_low['Risk_Description'])

        rec_high = dict(self.base_desirable)
        rec_high['pH'] = 8.3
        rec_high['pH_Upper_CI'] = 8.7 # Exceeds 8.5
        res_high = evaluate_groundwater_risk(rec_high)
        self.assertEqual(res_high['Risk_Level'], 'Medium Risk (Borderline)')
        self.assertIn('scaling risk', res_high['Risk_Description'])

    def test_precedence_high_risk_over_borderline(self):
        """When one parameter is High Risk and another is Borderline, High Risk takes precedence."""
        rec = dict(self.base_desirable)
        rec['Fluoride'] = 1.90 # High Risk trigger
        rec['TDS'] = 1200.0
        rec['TDS_Upper_CI'] = 2200.0 # Borderline trigger
        res = evaluate_groundwater_risk(rec)
        self.assertEqual(res['Risk_Level'], 'High Risk')

    def test_insufficient_data_handling(self):
        """Missing or non-finite parameters return Insufficient Data."""
        rec_missing = dict(self.base_desirable)
        del rec_missing['TDS_Upper_CI']
        res = evaluate_groundwater_risk(rec_missing)
        self.assertEqual(res['Risk_Level'], 'Insufficient Data')

        rec_nan = dict(self.base_desirable)
        rec_nan['Fluoride'] = float('nan')
        res_nan = evaluate_groundwater_risk(rec_nan)
        self.assertEqual(res_nan['Risk_Level'], 'Insufficient Data')
        self.assertEqual(res_nan['Drinking_Suitability'], 'Unassessed')

    def test_drinking_suitability_mapping(self):
        """Verify 3-tier Drinking Suitability indicator mapping based on risk level."""
        # 1. Drinkable when Low Risk
        res_low = evaluate_groundwater_risk(self.base_desirable)
        self.assertEqual(res_low['Risk_Level'], 'Low Risk')
        self.assertEqual(res_low['Drinking_Suitability'], 'Drinkable')
        self.assertIn('Safe for direct drinking', res_low['Drinking_Suitability_Guidance'])

        # 2. Required Boiling when Permissible or Borderline
        rec_perm = dict(self.base_desirable)
        rec_perm['TDS'] = 800.0
        rec_perm['TDS_Upper_CI'] = 1100.0
        res_perm = evaluate_groundwater_risk(rec_perm)
        self.assertEqual(res_perm['Risk_Level'], 'Medium Risk (Permissible)')
        self.assertEqual(res_perm['Drinking_Suitability'], 'Required Boiling')
        self.assertIn('boiling', res_perm['Drinking_Suitability_Guidance'].lower())

        rec_border = dict(self.base_desirable)
        rec_border['Fluoride'] = 1.30
        rec_border['Fluoride_Upper_CI'] = 1.65
        res_border = evaluate_groundwater_risk(rec_border)
        self.assertEqual(res_border['Risk_Level'], 'Medium Risk (Borderline)')
        self.assertEqual(res_border['Drinking_Suitability'], 'Required Boiling')

        # 3. Not Drinkable when High Risk
        rec_high = dict(self.base_desirable)
        rec_high['Fluoride'] = 2.10
        res_high = evaluate_groundwater_risk(rec_high)
        self.assertEqual(res_high['Risk_Level'], 'High Risk')
        self.assertEqual(res_high['Drinking_Suitability'], 'Not Drinkable')
        self.assertIn('Reverse Osmosis', res_high['Drinking_Suitability_Guidance'])

if __name__ == '__main__':
    unittest.main()
