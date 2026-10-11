import unittest
import sys
from pathlib import Path
import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

class TestForecastIntervals(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        data_path = Path(__file__).resolve().parent.parent / "data" / "forecast_results_2022_2030.csv"
        cls.df = pd.read_csv(data_path)

    def test_forecast_dataset_loaded(self):
        self.assertGreater(len(self.df), 1000)
        self.assertEqual(len(self.df), 1386)

    def test_lower_point_upper_interval_ordering_tds(self):
        """Verify TDS Lower CI <= Point <= Upper CI for all records."""
        lower_breach = self.df[self.df['TDS_Lower_CI'] > self.df['TDS']]
        upper_breach = self.df[self.df['TDS'] > self.df['TDS_Upper_CI']]
        self.assertEqual(len(lower_breach), 0, f"Found {len(lower_breach)} records where Lower CI > Point")
        self.assertEqual(len(upper_breach), 0, f"Found {len(upper_breach)} records where Point > Upper CI")

    def test_lower_point_upper_interval_ordering_ec(self):
        """Verify EC Lower CI <= Point <= Upper CI for all records."""
        lower_breach = self.df[self.df['EC_Lower_CI'] > self.df['EC']]
        upper_breach = self.df[self.df['EC'] > self.df['EC_Upper_CI']]
        self.assertEqual(len(lower_breach), 0)
        self.assertEqual(len(upper_breach), 0)

    def test_lower_point_upper_interval_ordering_fluoride(self):
        """Verify Fluoride Lower CI <= Point <= Upper CI for all records."""
        lower_breach = self.df[self.df['Fluoride_Lower_CI'] > self.df['Fluoride']]
        upper_breach = self.df[self.df['Fluoride'] > self.df['Fluoride_Upper_CI']]
        self.assertEqual(len(lower_breach), 0)
        self.assertEqual(len(upper_breach), 0)

    def test_lower_point_upper_interval_ordering_ph(self):
        """Verify pH Lower CI <= Point <= Upper CI for all records."""
        lower_breach = self.df[self.df['pH_Lower_CI'] > self.df['pH']]
        upper_breach = self.df[self.df['pH'] > self.df['pH_Upper_CI']]
        self.assertEqual(len(lower_breach), 0)
        self.assertEqual(len(upper_breach), 0)

    def test_physical_non_negativity(self):
        """TDS, EC, Fluoride must be strictly non-negative."""
        self.assertTrue((self.df['TDS'] >= 0).all())
        self.assertTrue((self.df['TDS_Lower_CI'] >= 0).all())
        self.assertTrue((self.df['EC'] >= 0).all())
        self.assertTrue((self.df['EC_Lower_CI'] >= 0).all())
        self.assertTrue((self.df['Fluoride'] >= 0).all())
        self.assertTrue((self.df['Fluoride_Lower_CI'] >= 0).all())

    def test_sorensen_ph_scale(self):
        """pH values and intervals must be within [0, 14]."""
        self.assertTrue((self.df['pH'] >= 0).all() and (self.df['pH'] <= 14).all())
        self.assertTrue((self.df['pH_Lower_CI'] >= 0).all() and (self.df['pH_Lower_CI'] <= 14).all())
        self.assertTrue((self.df['pH_Upper_CI'] >= 0).all() and (self.df['pH_Upper_CI'] <= 14).all())

    def test_positive_interval_widths(self):
        """All prediction interval widths (Upper - Lower) must be >= 0."""
        for p in ['TDS', 'EC', 'Fluoride', 'pH']:
            width = self.df[f'{p}_Upper_CI'] - self.df[f'{p}_Lower_CI']
            self.assertTrue((width >= 0).all(), f"Found negative interval width in {p}")

if __name__ == '__main__':
    unittest.main()
