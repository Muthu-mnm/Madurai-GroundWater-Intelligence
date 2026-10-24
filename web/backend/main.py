from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import io
import pandas as pd
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from .data_service import data_service
from .risk_service import evaluate_groundwater_risk
from .prediction_service import prediction_service
from .water_quality_service import evaluate_water_quality_vulnerability
from .agriculture_service import evaluate_agriculture_vulnerability
from .health_service import evaluate_health_vulnerability
from .combined_vulnerability_service import evaluate_combined_vulnerability

app = FastAPI(
    title="Madurai Groundwater Intelligence API",
    description="Multi-Domain Groundwater Vulnerability Assessment & GIS Platform for Madurai District, Tamil Nadu",
    version="2.1.0"
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
        "version": "2.1.0",
        "models": {
            "water_quality": "Adaptive Ensemble Forecaster & BIS 10500:2012 Screening",
            "agriculture": "FAO 29 & IS 11624 Irrigation Suitability Assessment",
            "health": "WHO 2017 & BIS Contaminant Exposure Screening",
            "combined": "Protective Multi-Domain Composite Rule Engine v2.1.0"
        }
    }

@app.get("/api/models/status")
def get_models_status():
    """
    Returns architecture, validation status, data coverage, and guidelines for all 4 models.
    Transparently reports missing ground truth labels for agriculture yield and clinical outcomes.
    """
    return {
        "system": "Madurai Multi-Domain Groundwater Vulnerability System",
        "version": "2.1.0",
        "domains": {
            "agriculture": {
                "name": "Agriculture Vulnerability Model",
                "model_type": "Rule-based Irrigation Water Suitability Assessment (FAO 29 & IS 11624)",
                "status": "Operational & Validated",
                "top_metrics": ["EC", "SAR", "RSC", "Na%", "pH"],
                "purpose": "Irrigation suitability, salinity and sodium hazards",
                "standards": ["FAO Irrigation and Drainage Paper 29 (1985)", "Indian Standard IS 11624:1986", "USDA Handbook 60"],
                "data_coverage": "Complete (EC, SAR, RSC, Na%, pH modeled for 166 monitoring wells across 2007–2030)",
                "disclaimer": "Does not predict crop yield or economic productivity. Identifies soil permeability, alkalinity, and crop osmotic salinity hazards."
            },
            "health": {
                "name": "Human Health Vulnerability Screening Model",
                "model_type": "Contaminant-Based Exposure Screening Assessment",
                "status": "Operational (Toxicological screening; No clinical diagnostic claims)",
                "top_metrics": ["Fluoride", "NO3 (nitrate)", "TDS", "pH", "Cl (chloride)"],
                "purpose": "Drinking-water quality screening",
                "standards": ["WHO Guidelines for Drinking-water Quality (2017)", "BIS 10500:2012 statutory limits"],
                "data_coverage": "Complete (Fluoride, NO3, TDS, pH, Cl modeled for 166 monitoring wells across 2007–2030)",
                "critical_safety_note": "Boiling water DOES NOT remove chemical contaminants such as Fluoride, Nitrate, or Chloride. Defluoridation or RO required."
            },
            "water_quality": {
                "name": "Water Quality Monitoring Model",
                "model_type": "Adaptive Ensemble Forecaster + BIS 10500:2012 Regulatory Screening",
                "status": "Operational & Validated",
                "training_data": "Tamil Nadu GWWD historical records (2007-2021, 2,059 observations)",
                "top_metrics": ["pH", "EC", "TDS", "Fluoride", "NO3", "Cl", "Ca", "Mg"],
                "purpose": "Identify poor-quality water and monitor changes over time",
                "uncertainty_method": "Empirical Bayes finite-sample residual quantiles (Nominal 80% CI)",
                "standards": ["BIS 10500:2012 Drinking Water Specification", "CPCB Guidelines"],
                "data_coverage": "Complete for 166 monitoring wells across 7 taluks (2007–2030)"
            },
            "combined": {
                "name": "Combined Vulnerability Assessor",
                "model_type": "Protective Multi-Domain Composite Rule Engine (v2.1.0)",
                "status": "Operational",
                "top_metrics": ["EC", "SAR", "RSC", "Na%", "Fluoride", "NO3", "TDS", "pH", "Cl"],
                "purpose": "Integrated multi-domain risk evaluation across Water Quality, Agriculture, and Human Health",
                "precedence_rule": "Non-masking protective severity: Severe hazard in ANY domain guarantees High or Very High combined vulnerability.",
                "domain_weights": {"water_quality": 0.35, "health": 0.40, "agriculture": 0.25},
                "partial_handling": "Explicit 'Partial Assessment' tag whenever domain data is missing. Never fabricates predictions."
            }
        }
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

# =========================================================================
# MULTI-DOMAIN VULNERABILITY ASSESSMENT ENDPOINTS
# =========================================================================

class AssessmentPayload(BaseModel):
    tds: Optional[float] = Field(None, ge=0.0, le=10000.0, description="Total Dissolved Solids in mg/L")
    ec: Optional[float] = Field(None, ge=0.0, le=20000.0, description="Electrical Conductivity in µS/cm")
    fluoride: Optional[float] = Field(None, ge=0.0, le=20.0, description="Fluoride in mg/L")
    ph: Optional[float] = Field(None, ge=0.0, le=14.0, description="pH (0-14)")
    no3: Optional[float] = Field(None, ge=0.0, le=1000.0, description="Nitrate as NO3 in mg/L")
    cl: Optional[float] = Field(None, ge=0.0, le=5000.0, description="Chloride in mg/L")
    ca: Optional[float] = Field(None, ge=0.0, le=2000.0, description="Calcium in mg/L")
    mg: Optional[float] = Field(None, ge=0.0, le=2000.0, description="Magnesium in mg/L")
    sar: Optional[float] = Field(None, ge=0.0, le=100.0, description="Sodium Adsorption Ratio")
    rsc: Optional[float] = Field(None, ge=-20.0, le=50.0, description="Residual Sodium Carbonate in meq/L")
    na_pct: Optional[float] = Field(None, ge=0.0, le=100.0, description="Sodium Percentage (%)")
    # Uncertainty intervals
    tds_upper_ci: Optional[float] = None
    tds_lower_ci: Optional[float] = None
    ec_upper_ci: Optional[float] = None
    ec_lower_ci: Optional[float] = None
    fluoride_upper_ci: Optional[float] = None
    fluoride_lower_ci: Optional[float] = None
    ph_upper_ci: Optional[float] = None
    ph_lower_ci: Optional[float] = None
    # Location context
    taluk: Optional[str] = None
    village: Optional[str] = None
    well_no: Optional[str] = None
    year: Optional[int] = 2026

def _payload_to_record(p: AssessmentPayload) -> Dict[str, Any]:
    rec = {}
    if p.tds is not None: rec['TDS'] = p.tds
    if p.ec is not None: rec['EC'] = p.ec
    if p.fluoride is not None: rec['Fluoride'] = p.fluoride
    if p.ph is not None: rec['pH'] = p.ph
    if p.no3 is not None: rec['NO3'] = p.no3
    if p.cl is not None: rec['Cl'] = p.cl
    if p.ca is not None: rec['Ca'] = p.ca
    if p.mg is not None: rec['Mg'] = p.mg
    if p.sar is not None: rec['SAR'] = p.sar
    if p.rsc is not None: rec['RSC'] = p.rsc
    if p.na_pct is not None: rec['Na%'] = p.na_pct
    if p.tds_upper_ci is not None: rec['TDS_Upper_CI'] = p.tds_upper_ci
    if p.tds_lower_ci is not None: rec['TDS_Lower_CI'] = p.tds_lower_ci
    if p.ec_upper_ci is not None: rec['EC_Upper_CI'] = p.ec_upper_ci
    if p.ec_lower_ci is not None: rec['EC_Lower_CI'] = p.ec_lower_ci
    if p.fluoride_upper_ci is not None: rec['Fluoride_Upper_CI'] = p.fluoride_upper_ci
    if p.fluoride_lower_ci is not None: rec['Fluoride_Lower_CI'] = p.fluoride_lower_ci
    if p.ph_upper_ci is not None: rec['pH_Upper_CI'] = p.ph_upper_ci
    if p.ph_lower_ci is not None: rec['pH_Lower_CI'] = p.ph_lower_ci
    if p.taluk: rec['Taluk'] = p.taluk
    if p.village: rec['Village'] = p.village
    if p.well_no: rec['Well_No'] = p.well_no
    rec['Year'] = p.year or 2026
    return rec

@app.post("/api/assess/water-quality")
def assess_water_quality_post(payload: AssessmentPayload):
    rec = _payload_to_record(payload)
    return evaluate_water_quality_vulnerability(rec)

@app.get("/api/assess/water-quality")
def assess_water_quality_get(
    tds: Optional[float] = Query(None),
    ec: Optional[float] = Query(None),
    fluoride: Optional[float] = Query(None),
    ph: Optional[float] = Query(None),
    no3: Optional[float] = Query(None),
    cl: Optional[float] = Query(None),
    ca: Optional[float] = Query(None),
    mg: Optional[float] = Query(None),
    tds_upper_ci: Optional[float] = Query(None),
    ec_upper_ci: Optional[float] = Query(None),
    fluoride_upper_ci: Optional[float] = Query(None),
    ph_lower_ci: Optional[float] = Query(None),
    ph_upper_ci: Optional[float] = Query(None)
):
    rec = {
        'TDS': tds, 'EC': ec, 'Fluoride': fluoride, 'pH': ph,
        'NO3': no3, 'Cl': cl, 'Ca': ca, 'Mg': mg,
        'TDS_Upper_CI': tds_upper_ci, 'EC_Upper_CI': ec_upper_ci,
        'Fluoride_Upper_CI': fluoride_upper_ci,
        'pH_Lower_CI': ph_lower_ci, 'pH_Upper_CI': ph_upper_ci
    }
    return evaluate_water_quality_vulnerability(rec)

@app.post("/api/assess/agriculture")
def assess_agriculture_post(payload: AssessmentPayload):
    rec = _payload_to_record(payload)
    return evaluate_agriculture_vulnerability(rec)

@app.get("/api/assess/agriculture")
def assess_agriculture_get(
    ec: Optional[float] = Query(None),
    tds: Optional[float] = Query(None),
    sar: Optional[float] = Query(None),
    rsc: Optional[float] = Query(None),
    na_pct: Optional[float] = Query(None),
    ph: Optional[float] = Query(None)
):
    rec = {'EC': ec, 'TDS': tds, 'SAR': sar, 'RSC': rsc, 'Na%': na_pct, 'pH': ph}
    return evaluate_agriculture_vulnerability(rec)

@app.post("/api/assess/health")
def assess_health_post(payload: AssessmentPayload):
    rec = _payload_to_record(payload)
    return evaluate_health_vulnerability(rec)

@app.get("/api/assess/health")
def assess_health_get(
    fluoride: Optional[float] = Query(None),
    no3: Optional[float] = Query(None),
    tds: Optional[float] = Query(None),
    ph: Optional[float] = Query(None),
    fluoride_upper_ci: Optional[float] = Query(None)
):
    rec = {'Fluoride': fluoride, 'NO3': no3, 'TDS': tds, 'pH': ph, 'Fluoride_Upper_CI': fluoride_upper_ci}
    return evaluate_health_vulnerability(rec)

@app.post("/api/assess/combined")
def assess_combined_post(payload: AssessmentPayload):
    rec = _payload_to_record(payload)
    return evaluate_combined_vulnerability(rec)

@app.get("/api/assess/combined")
def assess_combined_get(
    year: int = Query(2026),
    taluk: Optional[str] = Query(None),
    village: Optional[str] = Query(None),
    domain: str = Query('combined'),
    risk_class: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500)
):
    return data_service.get_multi_domain_assessments(
        year=year,
        taluk=taluk,
        village=village,
        domain=domain,
        risk_class=risk_class,
        page=page,
        page_size=page_size
    )

@app.get("/api/assessments/summary")
def get_assessments_summary(year: int = Query(2026)):
    """Summary distribution of risk classes across all 4 domains for selected year."""
    return data_service.get_multi_domain_summary(year=year)

@app.get("/api/assessments/location")
def get_location_assessment(
    village: Optional[str] = Query(None, description="Village or station name"),
    taluk: Optional[str] = Query(None, description="Taluk name"),
    well_no: Optional[str] = Query(None, description="Monitoring Well Number"),
    year: int = Query(2026, description="Assessment year (2007-2030)")
):
    """Fetches comprehensive multi-domain assessment and series for a specific station."""
    res = data_service.get_station_assessment(village=village, taluk=taluk, year=year, well_no=well_no)
    if not res:
        raise HTTPException(status_code=404, detail=f"Station '{well_no or village}' not found in monitoring network.")
    return res

# =========================================================================
# GIS & EXISTING STATIONS ENDPOINTS
# =========================================================================

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
def get_geojson_layer(
    layer: str,
    year: Optional[int] = Query(None, description="Year for station domain risk enrichment"),
    domain: str = Query('combined', description="Vulnerability domain for active map styling ('water_quality', 'agriculture', 'health', 'combined')")
):
    gj = data_service.get_geojson(layer=layer, year=year, domain=domain)
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
    well_no: Optional[str] = Field(None, description="Monitoring Well Number (e.g. 21001D, 501003)")
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
    well_no: Optional[str] = Query(None),
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
        well_no=well_no,
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
        well_no=req.well_no,
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
