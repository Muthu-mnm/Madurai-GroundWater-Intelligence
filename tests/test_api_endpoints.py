import unittest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from web.backend.main import app

class TestApiEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")

    def test_metadata_endpoint(self):
        res = self.client.get("/api/metadata")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["project_name"], "Madurai Groundwater Intelligence")
        self.assertEqual(len(data["taluks"]), 7)

    def test_historical_endpoint(self):
        res = self.client.get("/api/historical?page=1&page_size=10")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 2059)
        self.assertEqual(len(data["records"]), 10)
        self.assertIn("summary", data)

    def test_forecasts_endpoint(self):
        res = self.client.get("/api/forecasts?year=2026&page=1&page_size=20")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreater(data["total"], 100)
        self.assertEqual(len(data["records"]), 20)

    def test_risk_summary_endpoint(self):
        res = self.client.get("/api/risk/summary?year=2026")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["year"], 2026)
        self.assertIn("risk_counts", data)
        self.assertIn("risk_percentages", data)

    def test_validation_endpoint(self):
        res = self.client.get("/api/validation")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("checks", data)
        self.assertEqual(data["failed_checks"], 0)

    def test_metrics_endpoint(self):
        res = self.client.get("/api/metrics")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("classification", data)
        self.assertIn("backtesting", data)
        self.assertIn("calibration", data)

    def test_export_endpoint(self):
        res = self.client.get("/api/export?dataset=forecast&year=2026")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "text/csv; charset=utf-8")
        self.assertIn("TDS", res.text)
        self.assertIn("EC", res.text)

    def test_predict_stations_endpoint(self):
        res = self.client.get("/api/predict/stations")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 50)

    def test_predict_endpoint_get(self):
        res = self.client.get("/api/predict?target_year=2028&tds=450&ec=700&fluoride=0.8&ph=7.3&scenario=normal")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("input_parameters", data)
        self.assertIn("forecast", data)
        self.assertIn("trajectory", data)
        self.assertIn("Drinking_Suitability", data["forecast"])
        self.assertIn("Risk_Level", data["forecast"])
        self.assertEqual(data["forecast"]["Year"], 2028)

    def test_predict_endpoint_post(self):
        payload = {
            "target_year": 2030,
            "tds": 2200.0,
            "ec": 3200.0,
            "fluoride": 1.9,
            "ph": 8.8,
            "scenario": "drought"
        }
        res = self.client.post("/api/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["forecast"]["Year"], 2030)
        self.assertEqual(data["forecast"]["Drinking_Suitability"], "Not Drinkable")
        self.assertEqual(data["forecast"]["Risk_Level"], "High Risk")

if __name__ == '__main__':
    unittest.main()

