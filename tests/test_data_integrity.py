import unittest
import sys
import json
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

class TestDataIntegrity(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.data_dir = Path(__file__).resolve().parent.parent / "data"
        cls.df_hist = pd.read_csv(cls.data_dir / "historical_groundwater_2007_2021.csv")
        cls.df_fc = pd.read_csv(cls.data_dir / "forecast_results_2022_2030.csv")

    def test_historical_dataset_record_count_and_columns(self):
        """Verify historical dataset contains exactly 2059 validated observations."""
        self.assertEqual(len(self.df_hist), 2059)
        required_cols = ['Well_No', 'Taluk', 'Village', 'Year', 'TDS', 'EC', 'pH', 'Fluoride', 'Latitude', 'Longitude']
        for c in required_cols:
            self.assertIn(c, self.df_hist.columns)

    def test_historical_year_range(self):
        """Historical observations strictly within [2007, 2021]."""
        years = sorted(self.df_hist['Year'].unique())
        self.assertEqual(years[0], 2007)
        self.assertEqual(years[-1], 2021)
        self.assertEqual(len(years), 15)

    def test_forecast_year_range(self):
        """Forecast observations strictly within [2022, 2030]."""
        years = sorted(self.df_fc['Year'].unique())
        self.assertEqual(years[0], 2022)
        self.assertEqual(years[-1], 2030)
        self.assertEqual(len(years), 9)

    def test_monitoring_stations_geographic_bounding_box(self):
        """All mapped station coordinates fall within Madurai District (9.5-10.4°N, 77.4-78.5°E)."""
        valid_coords = self.df_fc.dropna(subset=['Latitude', 'Longitude'])
        self.assertGreater(len(valid_coords), 1300)
        
        self.assertTrue((valid_coords['Latitude'] >= 9.5).all())
        self.assertTrue((valid_coords['Latitude'] <= 10.4).all())
        self.assertTrue((valid_coords['Longitude'] >= 77.4).all())
        self.assertTrue((valid_coords['Longitude'] <= 78.5).all())

    def test_data_validation_report_status(self):
        """Validation report JSON exists and confirms all checks passed."""
        val_path = self.data_dir / "data_validation_report.json"
        self.assertTrue(val_path.exists())
        with open(val_path, encoding='utf-8') as f:
            report = json.load(f)
        self.assertEqual(report['failed_checks'], 0)
        self.assertGreater(report['passed_checks'], 25)

if __name__ == '__main__':
    unittest.main()
