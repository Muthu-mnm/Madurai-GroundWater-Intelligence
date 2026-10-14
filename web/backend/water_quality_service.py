"""
Water Quality Vulnerability Assessment Service
Standard: BIS 10500:2012 Drinking Water Specification & CPCB Groundwater Screening Guidelines.
Top Metrics: pH, EC, TDS, Fluoride, NO3 (Nitrate), Cl (Chloride)
Purpose: Identify poor-quality water and monitor changes over time.
"""

from typing import Dict, Any, List, Optional

# Standard regulatory screening thresholds
WQ_THRESHOLDS = {
    'pH': {'min': 6.5, 'max': 8.5, 'extreme_min': 5.0, 'extreme_max': 9.5, 'unit': 'dimensionless'},
    'EC': {'desirable': 750.0, 'permissible': 2250.0, 'extreme': 4000.0, 'unit': 'µS/cm'},
    'TDS': {'desirable': 500.0, 'permissible': 2000.0, 'extreme': 3000.0, 'unit': 'mg/L'},
    'Fluoride': {'desirable': 1.0, 'permissible': 1.5, 'extreme': 3.0, 'unit': 'mg/L'},
    'NO3': {'desirable': 45.0, 'permissible': 45.0, 'extreme': 100.0, 'unit': 'mg/L'},
    'Cl': {'desirable': 250.0, 'permissible': 1000.0, 'extreme': 1500.0, 'unit': 'mg/L'},
    'Ca': {'desirable': 75.0, 'permissible': 200.0, 'extreme': 300.0, 'unit': 'mg/L'},
    'Mg': {'desirable': 30.0, 'permissible': 100.0, 'extreme': 150.0, 'unit': 'mg/L'}
}

def evaluate_water_quality_vulnerability(record: Dict[str, Any], thresholds: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Evaluates Water Quality Vulnerability for a groundwater record based on:
    pH, EC, TDS, Fluoride, NO3, Cl, Ca, Mg.
    
    Accepts both forecast records (with Lower_CI/Upper_CI) and historical records (without CI).
    Returns standardized vocabulary:
    - Low Vulnerability
    - Moderate Vulnerability
    - High Vulnerability
    - Very High Vulnerability
    - Insufficient Data
    """
    cfg = thresholds or WQ_THRESHOLDS

    # Validate essential core parameters
    req = ['TDS', 'EC', 'Fluoride', 'pH']
    missing = []
    for k in req:
        val = record.get(k)
        if val is None or not isinstance(val, (int, float)) or (isinstance(val, float) and (val != val or abs(val) == float('inf'))):
            missing.append(k)

    if missing:
        return {
            'risk_class': 'Insufficient Data',
            'assessment_type': 'Incomplete data',
            'data_status': f"Missing required parameters: {', '.join(missing)}",
            'key_factors': [f"Parameter {m} is missing or invalid" for m in missing],
            'trigger_parameters': missing,
            'explanation': f"Cannot evaluate water quality vulnerability because {len(missing)} required parameter(s) are missing.",
            'score': None,
            'parameters': {}
        }

    tds = float(record['TDS'])
    ec = float(record['EC'])
    f = float(record['Fluoride'])
    ph = float(record['pH'])
    
    no3_raw = record.get('NO3')
    no3 = float(no3_raw) if no3_raw is not None and isinstance(no3_raw, (int, float)) and no3_raw == no3_raw else None
    
    cl_raw = record.get('Cl')
    cl = float(cl_raw) if cl_raw is not None and isinstance(cl_raw, (int, float)) and cl_raw == cl_raw else None

    ca_raw = record.get('Ca')
    ca = float(ca_raw) if ca_raw is not None and isinstance(ca_raw, (int, float)) and ca_raw == ca_raw else None

    mg_raw = record.get('Mg')
    mg = float(mg_raw) if mg_raw is not None and isinstance(mg_raw, (int, float)) and mg_raw == mg_raw else None

    # Optional uncertainty bounds (if present from forecast)
    has_ci = all(record.get(f"{p}_Upper_CI") is not None for p in ['TDS', 'EC', 'Fluoride', 'pH'])
    tds_up = float(record.get('TDS_Upper_CI', tds))
    ec_up = float(record.get('EC_Upper_CI', ec))
    f_up = float(record.get('Fluoride_Upper_CI', f))
    ph_low = float(record.get('pH_Lower_CI', ph))
    ph_up = float(record.get('pH_Upper_CI', ph))
    no3_up = float(record.get('NO3_Upper_CI', no3)) if no3 is not None and record.get('NO3_Upper_CI') is not None else no3
    cl_up = float(record.get('Cl_Upper_CI', cl)) if cl is not None and record.get('Cl_Upper_CI') is not None else cl
    ca_up = float(record.get('Ca_Upper_CI', ca)) if ca is not None and record.get('Ca_Upper_CI') is not None else ca
    mg_up = float(record.get('Mg_Upper_CI', mg)) if mg is not None and record.get('Mg_Upper_CI') is not None else mg

    is_forecast = has_ci or record.get('Model_Selected') is not None or record.get('Year', 2000) > 2021
    assessment_type = "Forecast-based screening" if is_forecast else "Observed historical screening"

    params_dict = {
        'pH': {'value': ph, 'lower_ci': ph_low if has_ci else None, 'upper_ci': ph_up if has_ci else None, 'unit': 'dimensionless', 'threshold': '6.5-8.5'},
        'EC': {'value': ec, 'upper_ci': ec_up if has_ci else None, 'unit': 'µS/cm', 'threshold': cfg['EC']['permissible']},
        'TDS': {'value': tds, 'upper_ci': tds_up if has_ci else None, 'unit': 'mg/L', 'threshold': cfg['TDS']['permissible']},
        'Fluoride': {'value': f, 'upper_ci': f_up if has_ci else None, 'unit': 'mg/L', 'threshold': cfg['Fluoride']['permissible']}
    }
    if no3 is not None:
        params_dict['NO3'] = {'value': no3, 'upper_ci': no3_up if has_ci else None, 'unit': 'mg/L', 'threshold': cfg['NO3']['permissible']}
    if cl is not None:
        params_dict['Cl'] = {'value': cl, 'upper_ci': cl_up if has_ci else None, 'unit': 'mg/L', 'threshold': cfg['Cl']['permissible']}
    if ca is not None:
        params_dict['Ca'] = {'value': ca, 'upper_ci': ca_up if has_ci else None, 'unit': 'mg/L', 'threshold': cfg.get('Ca', {}).get('permissible', 200.0)}
    if mg is not None:
        params_dict['Mg'] = {'value': mg, 'upper_ci': mg_up if has_ci else None, 'unit': 'mg/L', 'threshold': cfg.get('Mg', {}).get('permissible', 100.0)}

    # 1. Very High Vulnerability Check (Severe / Extreme Contamination)
    extreme_triggers = []
    if f > cfg['Fluoride']['extreme']:
        extreme_triggers.append(f"Severe Fluoride Exceedance ({f:.2f} mg/L > {cfg['Fluoride']['extreme']} mg/L severe toxicity threshold)")
    if tds > cfg['TDS']['extreme']:
        extreme_triggers.append(f"Severe TDS Mineralization ({tds:.1f} mg/L > {cfg['TDS']['extreme']} mg/L extreme salinity limit)")
    if ec > cfg['EC']['extreme']:
        extreme_triggers.append(f"Severe Electrical Conductivity ({ec:.1f} µS/cm > {cfg['EC']['extreme']} µS/cm extreme limit)")
    if ph < cfg['pH']['extreme_min'] or ph > cfg['pH']['extreme_max']:
        extreme_triggers.append(f"Extreme pH Outlier ({ph:.2f} outside safe range {cfg['pH']['extreme_min']}–{cfg['pH']['extreme_max']})")
    if no3 is not None and no3 > cfg['NO3']['extreme']:
        extreme_triggers.append(f"Severe Nitrate Toxicity ({no3:.1f} mg/L > {cfg['NO3']['extreme']} mg/L toxic hazard)")
    if cl is not None and cl > cfg['Cl']['extreme']:
        extreme_triggers.append(f"Severe Chloride Mineralization ({cl:.1f} mg/L > {cfg['Cl']['extreme']} mg/L extreme limit)")
    if ca is not None and ca > cfg.get('Ca', {}).get('extreme', 300.0):
        extreme_triggers.append(f"Severe Calcium Hardness ({ca:.1f} mg/L > {cfg.get('Ca', {}).get('extreme', 300.0)} mg/L extreme limit)")
    if mg is not None and mg > cfg.get('Mg', {}).get('extreme', 150.0):
        extreme_triggers.append(f"Severe Magnesium Hardness ({mg:.1f} mg/L > {cfg.get('Mg', {}).get('extreme', 150.0)} mg/L extreme limit)")

    if extreme_triggers:
        return {
            'risk_class': 'Very High Vulnerability',
            'assessment_type': assessment_type,
            'data_status': 'Available',
            'key_factors': extreme_triggers,
            'trigger_parameters': [t.split()[1] for t in extreme_triggers],
            'explanation': 'Critical contamination detected: One or more parameters exceed extreme toxic or mineralization thresholds.',
            'score': 95,
            'parameters': params_dict
        }

    # 2. High Vulnerability Check (Statutory Permissible Limit Exceeded)
    high_triggers = []
    if f > cfg['Fluoride']['permissible']:
        high_triggers.append(f"Fluoride Point Exceedance ({f:.2f} mg/L > {cfg['Fluoride']['permissible']} mg/L BIS statutory limit)")
    if tds > cfg['TDS']['permissible']:
        high_triggers.append(f"TDS Point Exceedance ({tds:.1f} mg/L > {cfg['TDS']['permissible']} mg/L BIS limit)")
    if ec > cfg['EC']['permissible']:
        high_triggers.append(f"EC Point Exceedance ({ec:.1f} µS/cm > {cfg['EC']['permissible']} µS/cm CPCB guideline)")
    if ph < cfg['pH']['min'] or ph > cfg['pH']['max']:
        high_triggers.append(f"pH Point Non-compliance ({ph:.2f} outside {cfg['pH']['min']}–{cfg['pH']['max']} BIS specification)")
    if no3 is not None and no3 > cfg['NO3']['permissible']:
        high_triggers.append(f"Nitrate Point Exceedance ({no3:.1f} mg/L > {cfg['NO3']['permissible']} mg/L BIS statutory limit)")
    if cl is not None and cl > cfg['Cl']['permissible']:
        high_triggers.append(f"Chloride Point Exceedance ({cl:.1f} mg/L > {cfg['Cl']['permissible']} mg/L BIS limit)")
    if ca is not None and ca > cfg.get('Ca', {}).get('permissible', 200.0):
        high_triggers.append(f"Calcium Point Exceedance ({ca:.1f} mg/L > {cfg.get('Ca', {}).get('permissible', 200.0)} mg/L BIS limit)")
    if mg is not None and mg > cfg.get('Mg', {}).get('permissible', 100.0):
        high_triggers.append(f"Magnesium Point Exceedance ({mg:.1f} mg/L > {cfg.get('Mg', {}).get('permissible', 100.0)} mg/L BIS limit)")

    if high_triggers:
        return {
            'risk_class': 'High Vulnerability',
            'assessment_type': assessment_type,
            'data_status': 'Available',
            'key_factors': high_triggers,
            'trigger_parameters': [t.split()[0] for t in high_triggers],
            'explanation': 'Statutory limit breached: Point estimates exceed statutory drinking water or environmental safety thresholds.',
            'score': 75,
            'parameters': params_dict
        }

    # 3. Moderate Vulnerability Check
    # Triggers if: (a) Uncertainty interval breaches permissible limit, OR (b) Point value is in permissible relaxation zone
    mod_triggers = []
    if has_ci:
        if f_up > cfg['Fluoride']['permissible']:
            mod_triggers.append(f"Fluoride Upper CI breach ({f_up:.2f} mg/L > {cfg['Fluoride']['permissible']} mg/L limit, Point: {f:.2f})")
        if tds_up > cfg['TDS']['permissible']:
            mod_triggers.append(f"TDS Upper CI breach ({tds_up:.1f} mg/L > {cfg['TDS']['permissible']} mg/L limit, Point: {tds:.1f})")
        if ec_up > cfg['EC']['permissible']:
            mod_triggers.append(f"EC Upper CI breach ({ec_up:.1f} µS/cm > {cfg['EC']['permissible']} µS/cm guide, Point: {ec:.1f})")
        if ph_low < cfg['pH']['min']:
            mod_triggers.append(f"pH Lower CI breach ({ph_low:.2f} < {cfg['pH']['min']}, Point: {ph:.2f} - corrosion risk)")
        if ph_up > cfg['pH']['max']:
            mod_triggers.append(f"pH Upper CI breach ({ph_up:.2f} > {cfg['pH']['max']}, Point: {ph:.2f} - scaling risk)")
        if no3_up is not None and no3_up > cfg['NO3']['permissible']:
            mod_triggers.append(f"Nitrate Upper CI breach ({no3_up:.1f} mg/L > {cfg['NO3']['permissible']} mg/L limit, Point: {no3:.1f})")
        if cl_up is not None and cl_up > cfg['Cl']['permissible']:
            mod_triggers.append(f"Chloride Upper CI breach ({cl_up:.1f} mg/L > {cfg['Cl']['permissible']} mg/L limit, Point: {cl:.1f})")
        if ca_up is not None and ca_up > cfg.get('Ca', {}).get('permissible', 200.0):
            mod_triggers.append(f"Calcium Upper CI breach ({ca_up:.1f} mg/L > {cfg.get('Ca', {}).get('permissible', 200.0)} mg/L limit, Point: {ca:.1f})")
        if mg_up is not None and mg_up > cfg.get('Mg', {}).get('permissible', 100.0):
            mod_triggers.append(f"Magnesium Upper CI breach ({mg_up:.1f} mg/L > {cfg.get('Mg', {}).get('permissible', 100.0)} mg/L limit, Point: {mg:.1f})")

    # Permissible relaxation triggers (when desirable is exceeded but below permissible)
    if tds > cfg['TDS']['desirable']:
        mod_triggers.append(f"TDS in permissible relaxation zone ({tds:.1f} mg/L > {cfg['TDS']['desirable']} mg/L desirable)")
    elif has_ci and tds_up > cfg['TDS']['desirable']:
        mod_triggers.append(f"TDS Upper CI exceeds desirable limit ({tds_up:.1f} mg/L > {cfg['TDS']['desirable']} mg/L)")

    if f > cfg['Fluoride']['desirable']:
        mod_triggers.append(f"Fluoride in permissible relaxation zone ({f:.2f} mg/L > {cfg['Fluoride']['desirable']} mg/L desirable)")
    elif has_ci and f_up > cfg['Fluoride']['desirable']:
        mod_triggers.append(f"Fluoride Upper CI exceeds desirable limit ({f_up:.2f} mg/L > {cfg['Fluoride']['desirable']} mg/L)")

    if ec > cfg['EC']['desirable']:
        mod_triggers.append(f"EC in permissible relaxation zone ({ec:.1f} µS/cm > {cfg['EC']['desirable']} µS/cm desirable)")
    elif has_ci and ec_up > cfg['EC']['desirable']:
        mod_triggers.append(f"EC Upper CI exceeds desirable limit ({ec_up:.1f} µS/cm > {cfg['EC']['desirable']} µS/cm)")

    if cl is not None and cl > cfg['Cl']['desirable']:
        mod_triggers.append(f"Chloride in permissible relaxation zone ({cl:.1f} mg/L > {cfg['Cl']['desirable']} mg/L desirable)")
    elif has_ci and cl_up is not None and cl_up > cfg['Cl']['desirable']:
        mod_triggers.append(f"Chloride Upper CI exceeds desirable limit ({cl_up:.1f} mg/L > {cfg['Cl']['desirable']} mg/L)")

    if ca is not None and ca > cfg.get('Ca', {}).get('desirable', 75.0):
        mod_triggers.append(f"Calcium in permissible relaxation zone ({ca:.1f} mg/L > {cfg.get('Ca', {}).get('desirable', 75.0)} mg/L desirable)")
    elif has_ci and ca_up is not None and ca_up > cfg.get('Ca', {}).get('desirable', 75.0):
        mod_triggers.append(f"Calcium Upper CI exceeds desirable limit ({ca_up:.1f} mg/L > {cfg.get('Ca', {}).get('desirable', 75.0)} mg/L)")

    if mg is not None and mg > cfg.get('Mg', {}).get('desirable', 30.0):
        mod_triggers.append(f"Magnesium in permissible relaxation zone ({mg:.1f} mg/L > {cfg.get('Mg', {}).get('desirable', 30.0)} mg/L desirable)")
    elif has_ci and mg_up is not None and mg_up > cfg.get('Mg', {}).get('desirable', 30.0):
        mod_triggers.append(f"Magnesium Upper CI exceeds desirable limit ({mg_up:.1f} mg/L > {cfg.get('Mg', {}).get('desirable', 30.0)} mg/L)")

    if mod_triggers:
        return {
            'risk_class': 'Moderate Vulnerability',
            'assessment_type': assessment_type,
            'data_status': 'Available',
            'key_factors': mod_triggers,
            'trigger_parameters': list(set([t.split()[0] for t in mod_triggers])),
            'explanation': 'Moderate risk: Parameters fall within statutory permissible relaxation limits or prediction uncertainty intervals cross screening bounds.',
            'score': 45,
            'parameters': params_dict
        }

    # 4. Strict Desirable Limits (Low Vulnerability)
    return {
        'risk_class': 'Low Vulnerability',
        'assessment_type': assessment_type,
        'data_status': 'Available',
        'key_factors': ['All parameter point values and nominal uncertainty intervals strictly comply with desirable limits.'],
        'trigger_parameters': [],
        'explanation': 'Low risk: All parameters comply with statutory desirable drinking and environmental specifications.',
        'score': 15,
        'parameters': params_dict
    }
