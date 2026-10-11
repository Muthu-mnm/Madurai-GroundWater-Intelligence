# Madurai Groundwater Intelligence GIS & Forecasting Platform

**Historical Analysis, Forecasting & Spatial Risk Assessment (2007–2030)**  
*Study Area: Madurai District, Tamil Nadu, India (7 Taluks, 154 Monitored Villages)*  
*Statutory Standard: BIS 10500:2012 Drinking Water Specification | CPCB Salinity Guidelines*

---

## 1. System Overview

The **Madurai Groundwater Intelligence** web application is an enterprise-grade scientific GIS platform and decision-support system designed to monitor longitudinal groundwater quality (2007–2021), forecast forward hydrochemical trends with nominal 80% empirically calibrated prediction intervals (2022–2030), and perform interval-aware statutory water quality risk screening.

### Key Capabilities
1. **Interactive GIS Map**: Leaflet-based geospatial viewport rendering Madurai District boundaries, 7 administrative taluks, and 154 monitoring station coordinates with live point inspection, choropleth zonation, and basemap switching (Carto Light, OpenStreetMap, Esri Satellite).
2. **Historical Analysis (2007–2021)**: Longitudinal exploration across 2,059 TWAD Board and CGWB monitoring observations, descriptive statistics (Mean, Median, Min-Max, Standard Deviation, Exceedance Rates), annual trends, and paginated records table.
3. **Forecast Explorer (2022–2030)**: Multi-horizon predictions generated from an Adaptive Ensemble model with compounding horizon uncertainty, nominal 80% empirically calibrated prediction intervals, and station trajectories.
4. **Prediction Simulator (2022–2035)**: Interactive forward modeling tool allowing users to provide custom chemical inputs (`TDS`, `EC`, `Fluoride`, `pH`), select target horizons, simulate hydrological stress scenarios (Monsoon Recharge, Normal Trend, Drought Over-Draft), and receive instant 3-tier Drinking Water potability status (**Drinkable**, **Required Boiling**, **Not Drinkable**) with actionable household treatment guidance.
5. **Interval-Aware Risk Assessment**: Evaluates four primary parameters (`TDS`, `EC`, `Fluoride`, `pH`) against BIS 10500:2012 acceptable and permissible limits, taking into account lower and upper prediction bounds. Includes dynamic screening limit sliders and potability breakdown.
6. **Model Validation & Backtesting**: Chronological expanding-window backtesting across horizons 1–5 on 2,744 test evaluations; finite-sample conformal quantile calibration on held-out samples; and CART Decision Tree classification report (95.9% accuracy).
7. **Data Explorer & Automated Audit**: Multi-column data filtering, full-text village search, client-side CSV downloads, and automated data integrity verification.

---

## 2. Directory Structure & Architecture

The repository is organized into distinct, decoupled bundles for the web application, machine learning models, shared geospatial data, automated test suites, and project documentation:

```
d:/Remote Sensing/
├── web/                                # Full-stack Web Application
│   ├── backend/                        # FastAPI REST service & decision support engine
│   │   ├── __init__.py
│   │   ├── main.py                     # API endpoints & static single-page hosting
│   │   ├── data_service.py             # In-memory spatial & tabular querying
│   │   ├── prediction_service.py       # ML simulation service & Bayesian intervals
│   │   └── risk_service.py             # Statutory BIS 10500 / CPCB screening logic
│   └── frontend/                       # React 18 + Vite scientific GIS user interface
│       ├── package.json
│       ├── vite.config.js
│       ├── src/                        # GIS Map, Forecast Explorer, Risk Assessment, etc.
│       ├── public/                     # Static icons & spatial assets
│       └── dist/                       # Production minified bundle
│
├── model/                              # Machine Learning & Hydrochemical Modeling
│   ├── notebooks/                      # Jupyter modeling & research notebooks
│   │   └── Madurai_Groundwater_Forecasting_2007_2030.ipynb
│   ├── src/                            # Production ML forecaster implementation
│   │   ├── __init__.py
│   │   └── model.py                    # AdaptiveEnsembleForecaster class
│   ├── artifacts/                      # Serialized trained model weights & calibrators
│   │   ├── adaptive_ensemble_model.joblib
│   │   └── adaptive_ensemble_model.pkl
│   ├── outputs/                        # Forecast projections & validation metrics
│   │   ├── forecast_results_2022_2030.csv
│   │   ├── backtest_by_horizon.csv
│   │   ├── backtest_metrics.csv
│   │   └── model_selection_summary.csv
│   └── raw_data/                       # Historical hydrochemical records
│       └── Water Quality data_ Madurai district (2007-2021).xlsx
│
├── data/                               # Shared GeoJSON boundaries & normalized datasets
│   ├── madurai_district_boundary.geojson
│   ├── madurai_taluks.geojson
│   ├── madurai_stations.geojson
│   ├── historical_groundwater_2007_2021.json / .csv
│   ├── forecast_results_2022_2030.json / .csv
│   ├── interpolation_surfaces.json
│   ├── model_validation_metrics.json
│   ├── data_validation_report.json
│   └── metadata.json
│
├── tests/                              # Automated unit & data integrity test suite
│   ├── test_api_endpoints.py
│   ├── test_data_integrity.py
│   ├── test_forecast_intervals.py
│   └── test_risk_assessment.py
│
└── docs/                               # Presentations & reference assets
    ├── rev 2 5 ip (1) (1).pptx
    └── GIS_WEB_APP-main.zip
```

---

## 3. Prerequisites & Environment Setup

### Software Requirements
* **Operating System**: Windows 10 or Windows 11 (64-bit)
* **Python**: Version 3.10, 3.11, or 3.12 (Checked: Python 3.12.6)
* **Node.js**: Version 18.x, 20.x, or 24.x (Checked: v24.21.0)
* **npm**: Version 9.x or higher (Checked: 11.19.0)

### 1. Install Python Dependencies
Open PowerShell or Command Prompt in `d:\Remote Sensing` and install required backend packages:
```powershell
pip install fastapi uvicorn pandas numpy openpyxl httpx
```

### 2. Install Frontend Dependencies
Navigate to the `frontend` folder and install Node.js packages:
```powershell
cd "d:\Remote Sensing\frontend"
npm install
cd ..
```

---

## 4. Running the Application Locally

You can run the application in two ways:

### Option A: Integrated Full-Stack Server (Recommended)
This launches the FastAPI server which simultaneously serves the REST API endpoints and hosts the production-built React frontend from port `8000`.

1. Ensure the frontend production bundle is compiled:
   ```powershell
   cd "d:\Remote Sensing\web\frontend"
   npm run build
   cd ..\..
   ```
2. Start the unified server:
   ```powershell
   python -m uvicorn web.backend.main:app --host 127.0.0.1 --port 8000
   ```
3. Open your browser:
   * **Web Application**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
   * **Interactive API Documentation (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   * **System Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### Option B: Frontend Hot-Reload Development Server
If modifying React components or CSS styles, run the Vite development server on port `3000`:
```powershell
cd "d:\Remote Sensing\web\frontend"
npm run dev
```
Open [http://localhost:3000/](http://localhost:3000/) in your browser. API requests are automatically proxied to `http://127.0.0.1:8000`.

---

## 5. Running the Automated Test Suite

The repository includes a comprehensive 31-test automated verification suite covering data integrity, interval ordering, Sørensen pH bounds, BIS 10500 risk assessment logic, and API endpoints.

Execute all unit tests:
```powershell
python -m unittest discover -s tests -v
```

Expected result:
```
Ran 31 tests in ~0.25s
OK
```

---

## 6. How to Add or Update Datasets

### Updating Forecast CSV (`forecast_results_2022_2030.csv`)
1. Place the new forecast CSV into `d:\Remote Sensing\forecast_results_2022_2030.csv`.
2. Required columns: `Taluk`, `Village`, `Year`, `EC`, `Fluoride`, `TDS`, `pH`, `EC_Lower_CI`, `Fluoride_Lower_CI`, `TDS_Lower_CI`, `pH_Lower_CI`, `EC_Upper_CI`, `Fluoride_Upper_CI`, `TDS_Upper_CI`, `pH_Upper_CI`.
3. Re-run the data preparation script:
   ```powershell
   python scratch/prepare_unified_data.py
   ```
4. Rebuild the frontend bundle:
   ```powershell
   cd frontend && npm run build && cd ..
   ```

### Updating Historical Data
1. Place new Excel or CSV files in the workspace.
2. Ensure columns match: `Well No`, `District`, `Taluk`, `Village`, `Year`, `TDS`, `EC`, `pH`, `F`, `Latitude_DD`, `Longitude_DD`.
3. Run `python scratch/prepare_unified_data.py` to regenerate sanitized datasets.

### Updating GeoJSON Boundaries
1. Replace or edit `data/madurai_taluks.geojson` or `data/madurai_district_boundary.geojson`.
2. Ensure coordinates use WGS84 (`EPSG:4326`).
3. Copy updated files to `frontend/public/data/` or re-run `scratch/prepare_unified_data.py`.

---

## 7. Water Quality Standards & Screening Methodology

| Parameter | Desirable Limit (Acceptable) | Permissible Limit (Absence of Alternate) | Standard Applied | Significance |
| :--- | :--- | :--- | :--- | :--- |
| **TDS** | 500 mg/L | 2,000 mg/L | BIS 10500:2012 Table 1 | Palatability, gastrointestinal irritation |
| **EC** | 750 µS/cm | 2,250 µS/cm | CPCB / FAO 29 Guidelines | Soil salinity, osmotic crop damage |
| **Fluoride (F)** | 1.0 mg/L | 1.5 mg/L | BIS 10500:2012 Table 1 | Dental fluorosis (&gt;1.0) &amp; crippling skeletal fluorosis (&gt;1.5) |
| **pH** | 6.5 – 8.5 | Outside 6.5 – 8.5 | BIS 10500:2012 Table 1 | Casing corrosion (&lt;6.5) vs carbonate encrustation (&gt;8.5) |

### Interval-Aware Risk Screening Logic:
* **High Risk**: Point prediction exceeds permissible screening threshold ($F > 1.5$, $\text{TDS} > 2000$, $\text{EC} > 2250$, or $\text{pH} \notin [6.5, 8.5]$).
* **Medium Risk (Borderline)**: Point prediction within limits, but uncertainty interval upper or lower bound breaches screening limit ($F_{\text{Upper}} > 1.5$, $\text{TDS}_{\text{Upper}} > 2000$, $\text{EC}_{\text{Upper}} > 2250$, $\text{pH}_{\text{Lower}} < 6.5$, or $\text{pH}_{\text{Upper}} > 8.5$).
* **Medium Risk (Permissible)**: Point prediction or interval falls in relaxation zone ($500 < \text{TDS} \le 2000$, $750 < \text{EC} \le 2250$, $1.0 < F \le 1.5$).
* **Low Risk**: ALL point estimates AND relevant uncertainty bounds strictly comply with desirable limits.
* **Insufficient Data**: Missing or non-finite records.

---

## 8. Scientific Disclaimer

This application is an analytical research and decision-support tool based on statistical modeling and spatial interpolation. Model predictions and empirical prediction intervals provide **groundwater screening intelligence**, not certified drinking-water safety approval. Official determination of potability requires certified laboratory chemical, bacteriological, and microbiological testing (including heavy metals and pesticide residue testing) in accordance with statutory government regulations.
