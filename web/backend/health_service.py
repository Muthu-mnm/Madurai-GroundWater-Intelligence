"""
Health Vulnerability Assessment Service
Standards:
- WHO Guidelines for Drinking-water Quality (4th Edition, 2017)
- Indian Standard BIS 10500:2012 Drinking Water Specification

Top Metrics: Fluoride, NO3 (nitrate), TDS, pH, Cl (chloride)
Purpose: Drinking-water quality screening

CRITICAL SAFETY & MEDICAL DISCLAIMER:
This module is a chemical contaminant exposure screening tool, NOT a clinical
diagnostic device. Model results do NOT constitute medical diagnosis or individual
health prognosis. Laboratory water testing and qualified public health guidance
are required before concluding safe consumption.

CRITICAL HYGIENE WARNING:
Boiling water DOES NOT destroy or remove chemical contaminants such as Fluoride,
Nitrate, Chloride, or heavy dissolved solids. In fact, prolonged boiling evaporates
pure water and CONCENTRATES these chemical toxins. Chemical treatment (Activated Alumina
or Reverse Osmosis) is required for inorganic removal.
"""

from typing import Dict, Any, List, Optional

# Standard Health Screening Thresholds (BIS 10500:2012 / WHO 2017)
HEALTH_THRESHOLDS = {
    'Fluoride': {
        'desirable': 1.0,     # Safe / protective against caries
        'permissible': 1.5,   # BIS permissible upper limit (mild fluorosis risk)
        'severe': 3.0,        # Severe crippling skeletal fluorosis threshold
        'unit': 'mg/L'
    },
    'Nitrate': {
        'safe': 45.0,         # BIS 10500:2012 statutory limit (45 mg/L as NO3)
        'severe': 100.0,      # Acute infantile methemoglobinemia risk threshold
        'unit': 'mg/L'
    },
    'TDS': {
        'desirable': 500.0,
        'permissible': 2000.0,
        'severe': 3000.0,     # Severe hyper-mineralization & gastrointestinal stress
        'unit': 'mg/L'
    },
    'pH': {
        'min': 6.5,
        'max': 8.5,
        'severe_min': 5.0,    # Acute pipe corrosion & toxic heavy metal leaching
        'severe_max': 9.5,    # Caustic alkalinity & mucous membrane irritation
        'unit': 'dimensionless'
    },
    'Chloride': {
        'desirable': 250.0,   # Acceptable limit (BIS 10500)
        'permissible': 1000.0,# Permissible limit in absence of alternate source
        'severe': 1500.0,     # Severe osmotic distress, salty taste, GI irritation
        'unit': 'mg/L'
    }
}

BOILING_WARNING = (
    "IMPORTANT SAFETY NOTE: Boiling water does NOT remove or neutralize chemical contaminants "
    "such as Fluoride, Nitrate, or dissolved salts. Boiling evaporates pure steam, which actually "
    "CONCENTRATES chemical toxins in the remaining liquid. Certified Reverse Osmosis (RO) filtration "
    "or activated alumina defluoridation is required for chemical removal."
)

def evaluate_health_vulnerability(record: Dict[str, Any], thresholds: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Evaluates Health Hazard Screening Vulnerability for a groundwater record.
    Evaluates the 5 designated Top Metrics: Fluoride, NO3 (nitrate), TDS, pH, and Cl (chloride).
    
    Returns standardized vocabulary:
    - Low Vulnerability
    - Moderate Vulnerability
    - High Vulnerability
    - Very High Vulnerability
    - Insufficient Data
    """
    cfg = thresholds or HEALTH_THRESHOLDS

    # Validate essential primary contaminant (Fluoride)
    f_val = record.get('Fluoride')
    if f_val is None or not isinstance(f_val, (int, float)) or (isinstance(f_val, float) and (f_val != f_val or abs(f_val) == float('inf'))):
        return {
            'risk_class': 'Insufficient Data',
            'health_hazard_level': 'Unassessed',
            'assessment_type': 'Incomplete data',
            'data_status': 'Missing required Fluoride contaminant measurement',
            'key_factors': ['Fluoride concentration is missing or invalid; cannot evaluate toxicological exposure.'],
            'trigger_parameters': ['Fluoride'],
            'potential_exposure_concerns': [],
            'explanation': 'Health vulnerability assessment requires Fluoride as a primary endemic chemical contaminant.',
            'score': None,
            'limitations': 'Fluoride measurement absent.',
            'boiling_safety_warning': BOILING_WARNING,
            'contaminant_levels': {}
        }

    f = float(f_val)
    tds = float(record['TDS']) if record.get('TDS') is not None and isinstance(record.get('TDS'), (int, float)) else None
    ph = float(record['pH']) if record.get('pH') is not None and isinstance(record.get('pH'), (int, float)) else None

    # Check for Nitrate (NO3)
    no3_val = record.get('NO3')
    has_no3 = (
        no3_val is not None and
        isinstance(no3_val, (int, float)) and
        no3_val == no3_val and
        abs(no3_val) != float('inf')
    )
    no3 = float(no3_val) if has_no3 else None

    # Check for Chloride (Cl)
    cl_val = record.get('Cl')
    has_cl = (
        cl_val is not None and
        isinstance(cl_val, (int, float)) and
        cl_val == cl_val and
        abs(cl_val) != float('inf')
    )
    cl = float(cl_val) if has_cl else None

    # Check for uncertainty intervals (if forecast record)
    f_up = float(record.get('Fluoride_Upper_CI', f))
    has_ci = record.get('Fluoride_Upper_CI') is not None

    if has_no3:
        assessment_type = "Multi-Contaminant Health Hazard Screening (Fluoride, NO3, TDS, pH, Cl)" if has_cl else "Multi-Contaminant Health Hazard Screening (Fluoride & Nitrate)"
        data_status = "Available (Comprehensive chemical screening)"
        limitations = "Chemical hazard screening against BIS 10500:2012 & WHO 2017. Does not account for personal body weight, daily water ingestion volumes, dietary fluoride intake, or individual clinical comorbidities."
    else:
        assessment_type = "Partial contaminant screening (Fluoride, TDS & pH)"
        data_status = "Partial (Nitrate unmeasured in record)"
        limitations = "Nitrate was not modeled or measured in this record; health screening is based on available parameters. Complete laboratory testing recommended."

    v_high_triggers = []
    high_triggers = []
    mod_triggers = []
    concerns = []

    # 1. Fluoride Evaluation
    if f > cfg['Fluoride']['severe']:
        v_high_triggers.append(f"Severe Fluoride Toxicity ({f:.2f} mg/L > {cfg['Fluoride']['severe']} mg/L)")
        concerns.append("Acute risk of Crippling Skeletal Fluorosis: potential osteosclerosis, calcification of spinal ligaments, severe joint deformation, and chronic bone pain.")
    elif f > cfg['Fluoride']['permissible']:
        high_triggers.append(f"Statutory Fluoride Exceedance ({f:.2f} mg/L > {cfg['Fluoride']['permissible']} mg/L BIS limit)")
        concerns.append("Elevated risk of Dental Fluorosis (teeth staining, enamel pitting in growing children) and early-stage skeletal fluorosis.")
    elif f > cfg['Fluoride']['desirable']:
        mod_triggers.append(f"Fluoride in Permissible Zone ({f:.2f} mg/L > {cfg['Fluoride']['desirable']} mg/L desirable)")
        concerns.append("Mild dental mottling potential for infants and children with chronic exclusive ingestion.")
    elif has_ci and f_up > cfg['Fluoride']['permissible']:
        mod_triggers.append(f"Fluoride Upper CI Exceedance ({f_up:.2f} mg/L > {cfg['Fluoride']['permissible']} mg/L limit, Point: {f:.2f})")
        concerns.append("Uncertainty bound indicates potential seasonal or forecast breach of statutory fluoride limit.")

    # 2. Nitrate Evaluation (if present)
    if has_no3:
        if no3 > cfg['Nitrate']['severe']:
            v_high_triggers.append(f"Severe Toxic Nitrate Pollution ({no3:.1f} mg/L > {cfg['Nitrate']['severe']} mg/L)")
            concerns.append("High risk of Infantile Methemoglobinemia ('Blue Baby Syndrome') and thyroid dysfunction; immediate avoidance for bottle-fed infants.")
        elif no3 > cfg['Nitrate']['safe']:
            high_triggers.append(f"Nitrate Non-Compliance ({no3:.1f} mg/L > {cfg['Nitrate']['safe']} mg/L BIS statutory limit)")
            concerns.append("Potential hazard of Methemoglobinemia ('Blue Baby Syndrome') in infants under 6 months; suspected endogenous nitrosamine synthesis.")

    # 3. Chloride Evaluation (if present)
    if has_cl:
        if cl > cfg['Chloride']['severe']:
            v_high_triggers.append(f"Severe Chloride Contamination ({cl:.1f} mg/L > {cfg['Chloride']['severe']} mg/L)")
            concerns.append("High osmotic stress, unpalatable salty taste, and potential gastrointestinal irritation.")
        elif cl > cfg['Chloride']['permissible']:
            high_triggers.append(f"Chloride Exceedance ({cl:.1f} mg/L > {cfg['Chloride']['permissible']} mg/L BIS limit)")
            concerns.append("Elevated chloride load: salty taste, corrosion of domestic plumbing, laxative risk in presence of sodium/magnesium.")
        elif cl > cfg['Chloride']['desirable']:
            mod_triggers.append(f"Chloride in Permissible Zone ({cl:.1f} mg/L > {cfg['Chloride']['desirable']} mg/L)")

    # 4. TDS Mineral Load Evaluation
    if tds is not None:
        if tds > cfg['TDS']['severe']:
            v_high_triggers.append(f"Extreme Total Dissolved Solids ({tds:.1f} mg/L > {cfg['TDS']['severe']} mg/L)")
            concerns.append("Severe hyper-mineralization: gastrointestinal irritation, chronic laxative effects, potential kidney strain in vulnerable populations.")
        elif tds > cfg['TDS']['permissible']:
            high_triggers.append(f"High Mineral Load TDS Exceedance ({tds:.1f} mg/L > {cfg['TDS']['permissible']} mg/L BIS limit)")
            concerns.append("Unpalatable water, potential gastrointestinal distress and scaling.")
        elif tds > cfg['TDS']['desirable']:
            mod_triggers.append(f"TDS in Permissible Relaxation Range ({tds:.1f} mg/L > {cfg['TDS']['desirable']} mg/L desirable)")

    # 5. pH Evaluation
    if ph is not None:
        if ph < cfg['pH']['severe_min'] or ph > cfg['pH']['severe_max']:
            v_high_triggers.append(f"Extreme pH Hazard ({ph:.2f} outside severe limits {cfg['pH']['severe_min']}–{cfg['pH']['severe_max']})")
            concerns.append("Acidic heavy metal dissolution hazard or caustic alkaline dermal/mucosal irritation.")
        elif ph < cfg['pH']['min'] or ph > cfg['pH']['max']:
            high_triggers.append(f"pH Statutory Non-Compliance ({ph:.2f} outside safe range {cfg['pH']['min']}–{cfg['pH']['max']})")
            concerns.append("Corrosion of household distribution infrastructure or aesthetic unpalatability.")

    # Synthesize Health Vulnerability Class
    if v_high_triggers:
        risk_class = 'Very High Vulnerability'
        hazard_level = 'Severe Toxic Contaminant Hazard'
        score = 95
        key_factors = v_high_triggers + high_triggers
        explanation = "Critical health hazard: Extreme concentrations of Fluoride, Nitrate, Chloride, or hyper-mineralization detected with documented toxicity risks."
    elif high_triggers:
        risk_class = 'High Vulnerability'
        hazard_level = 'High Contaminant Exposure Hazard'
        score = 75
        key_factors = high_triggers + mod_triggers
        explanation = "Significant health concern: Contaminant levels exceed statutory drinking water limits, indicating risk of chronic health disorders upon sustained exposure."
    elif mod_triggers:
        risk_class = 'Moderate Vulnerability'
        hazard_level = 'Moderate Exposure Screening Concern'
        score = 45
        key_factors = mod_triggers
        explanation = "Moderate screening concern: Parameters fall within permissible relaxation limits or upper forecast intervals suggest potential guideline exceedance."
    else:
        risk_class = 'Low Vulnerability'
        hazard_level = 'Low Contaminant Hazard'
        score = 15
        key_factors = ['All evaluated chemical contaminants strictly meet BIS and WHO desirable drinking water safety limits.']
        concerns.append('No chemical contaminant exposure hazards detected in evaluated parameters.')
        explanation = "Low health hazard: Evaluated chemical parameters comply with statutory baseline health standards."

    contaminant_levels = {
        'Fluoride': {'value': f, 'unit': 'mg/L', 'standard': '1.0 desirable / 1.5 permissible (BIS 10500)'},
        'NO3': {'value': no3 if has_no3 else None, 'unit': 'mg/L', 'standard': '45.0 max (BIS 10500)'},
        'TDS': {'value': tds, 'unit': 'mg/L', 'standard': '500 desirable / 2000 permissible (BIS 10500)'},
        'pH': {'value': ph, 'unit': 'dimensionless', 'standard': '6.5 - 8.5 (BIS 10500)'},
        'Cl': {'value': cl if has_cl else None, 'unit': 'mg/L', 'standard': '250 desirable / 1000 permissible (BIS 10500)'}
    }

    return {
        'risk_class': risk_class,
        'health_hazard_level': hazard_level,
        'assessment_type': assessment_type,
        'data_status': data_status,
        'key_factors': key_factors,
        'trigger_parameters': list(set([t.split()[0] for t in (v_high_triggers + high_triggers + mod_triggers)])),
        'potential_exposure_concerns': concerns,
        'explanation': explanation,
        'score': score,
        'limitations': limitations,
        'boiling_safety_warning': BOILING_WARNING,
        'contaminant_levels': contaminant_levels
    }
