from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import io
import pandas as pd

from .data_service import data_service
from .risk_service import evaluate_groundwater_risk
from .prediction_service import prediction_service
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI(
    title="Madurai Groundwater Intelligence API",
    description="Scientific Decision Support & GIS Forecasting Platform for Madurai District, Tamil Nadu",
    version="2.0.0"
)

# Enable CORS for local Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    data_service.load_data()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Madurai Groundwater Intelligence API",
        "version": "2.0.0"
    }

@app.get("/api/metadata")
def get_metadata():
    return data_service.get_metadata()

@app.get("/api/historical")
def get_historical_records(
    year: int = Query(None, description="Filter by observation year (2007-2021)"),
    taluk: str = Query(None, description="Filter by taluk name"),
    village: str = Query(None, description="Search by village name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    sort_by: str = Query("Year"),
    sort_dir: str = Query("desc")
):
    return data_service.get_historical(
        year=year,
        taluk=taluk,
        village=village,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir
    )

@app.get("/api/forecasts")
def get_forecast_records(
    year: int = Query(None, description="Filter by forecast year (2022-2030)"),
    taluk: str = Query(None, description="Filter by taluk name"),
    village: str = Query(None, description="Search by village name"),
    risk_level: str = Query(None, description="Filter by risk category"),
    drinking_suitability: str = Query(None, description="Filter by drinking suitability (Drinkable, Required Boiling, Not Drinkable)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    sort_by: str = Query("Year"),
    sort_dir: str = Query("asc")
):
    return data_service.get_forecasts(
        year=year,
        taluk=taluk,
        village=village,
        risk_level=risk_level,
        drinking_suitability=drinking_suitability,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir
    )

@app.get("/api/risk/summary")
def get_risk_summary(
    year: int = Query(2026, description="Forecast year to evaluate (2022-2030)")
):
    res = data_service.get_forecasts(year=year, page=1, page_size=2000)
    records = res['records']
    
    risk_breakdown = {}
    suitability_breakdown = {}
    taluk_breakdown = {}
    
    for r in records:
        rl = r.get('Risk_Level', 'Insufficient Data')
        risk_breakdown[rl] = risk_breakdown.get(rl, 0) + 1
        
        ds = r.get('Drinking_Suitability', 'Unassessed')
        suitability_breakdown[ds] = suitability_breakdown.get(ds, 0) + 1
        
        t = r.get('Taluk', 'Unknown')
        if t not in taluk_breakdown:
            taluk_breakdown[t] = {
                'High Risk': 0, 'Medium Risk (Borderline)': 0, 'Medium Risk (Permissible)': 0, 'Low Risk': 0, 'Total': 0,
                'Drinkable': 0, 'Required Boiling': 0, 'Not Drinkable': 0
            }
        taluk_breakdown[t][rl] = taluk_breakdown[t].get(rl, 0) + 1
        taluk_breakdown[t][ds] = taluk_breakdown[t].get(ds, 0) + 1
        taluk_breakdown[t]['Total'] += 1

    total = len(records)
    pct_breakdown = {k: round((v / total) * 100, 1) if total > 0 else 0 for k, v in risk_breakdown.items()}
    suitability_pct = {k: round((v / total) * 100, 1) if total > 0 else 0 for k, v in suitability_breakdown.items()}

    return {
        "year": year,
        "total_stations_evaluated": total,
        "risk_counts": risk_breakdown,
        "risk_percentages": pct_breakdown,
        "drinking_suitability_counts": suitability_breakdown,
        "drinking_suitability_percentages": suitability_pct,
        "taluk_breakdown": taluk_breakdown
    }

@app.get("/api/stations")
def get_all_stations():
    return data_service.get_geojson('stations')

@app.get("/api/stations/{village}")
def get_station_profile(village: str, taluk: str = Query(None)):
    profile = data_service.get_station_profile(village, taluk)
    if not profile or (not profile['historical_series'] and not profile['forecast_series']):
        raise HTTPException(status_code=404, detail=f"Station '{village}' not found.")
    return profile

@app.get("/api/metrics")
def get_model_metrics():
    return data_service.get_metrics()

@app.get("/api/validation")
def get_data_validation():
    return data_service.get_validation()

@app.get("/api/geojson/{layer}")
def get_geojson_layer(layer: str):
    gj = data_service.get_geojson(layer)
    if gj is None:
        raise HTTPException(status_code=404, detail=f"GeoJSON layer '{layer}' not found. Available: district, taluks, stations.")
    return gj

@app.get("/api/export")
def export_dataset_csv(
    dataset: str = Query("forecast", pattern="^(forecast|historical)$"),
    year: int = Query(None),
    taluk: str = Query(None)
):
    if dataset == "forecast":
        res = data_service.get_forecasts(year=year, taluk=taluk, page=1, page_size=5000)
        filename = f"madurai_groundwater_forecast_{year or 'all_years'}.csv"
    else:
        res = data_service.get_historical(year=year, taluk=taluk, page=1, page_size=5000)
        filename = f"madurai_groundwater_historical_{year or 'all_years'}.csv"

    df = pd.DataFrame(res['records'])
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    return Response(
        content=stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

class PredictionRequest(BaseModel):
    target_year: int = Field(2026, ge=2022, le=2035, description="Forecast target horizon year")
    tds: Optional[float] = Field(None, ge=0.0, le=5000.0, description="Total Dissolved Solids in mg/L")
    ec: Optional[float] = Field(None, ge=0.0, le=8000.0, description="Electrical Conductivity in µS/cm")
    fluoride: Optional[float] = Field(None, ge=0.0, le=10.0, description="Fluoride in mg/L")
    ph: Optional[float] = Field(None, ge=0.0, le=14.0, description="pH (0-14 Sorensen scale)")
    taluk: Optional[str] = Field(None, description="Taluk name for regional empirical Bayes prior")
    village: Optional[str] = Field(None, description="Village / station name for baseline reference")
    scenario: Optional[str] = Field("normal", description="Hydrological scenario: 'normal', 'recharge', 'stress', 'drought'")

@app.get("/api/predict/stations")
def get_prediction_stations():
    return prediction_service.get_trained_stations()

@app.get("/api/predict")
def predict_water_quality_get(
    target_year: int = Query(2026, ge=2022, le=2035),
    tds: Optional[float] = Query(None, ge=0.0, le=5000.0),
    ec: Optional[float] = Query(None, ge=0.0, le=8000.0),
    fluoride: Optional[float] = Query(None, ge=0.0, le=10.0),
    ph: Optional[float] = Query(None, ge=0.0, le=14.0),
    taluk: Optional[str] = Query(None),
    village: Optional[str] = Query(None),
    scenario: Optional[str] = Query("normal")
):
    return prediction_service.predict(
        target_year=target_year,
        tds=tds,
        ec=ec,
        fluoride=fluoride,
        ph=ph,
        taluk=taluk,
        village=village,
        scenario=scenario
    )

@app.post("/api/predict")
def predict_water_quality_post(req: PredictionRequest):
    return prediction_service.predict(
        target_year=req.target_year,
        tds=req.tds,
        ec=req.ec,
        fluoride=req.fluoride,
        ph=req.ph,
        taluk=req.taluk,
        village=req.village,
        scenario=req.scenario
    )

# Static file hosting if frontend/dist exists
candidate_dist_dirs = [
    Path(__file__).resolve().parent.parent / "frontend" / "dist",
    Path(__file__).resolve().parent.parent.parent / "web" / "frontend" / "dist",
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
]
frontend_dist = next((p for p in candidate_dist_dirs if p.exists()), candidate_dist_dirs[0])
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
