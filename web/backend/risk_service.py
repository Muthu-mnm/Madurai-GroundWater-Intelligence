"""
Groundwater Risk Assessment Service
Standards:
- BIS 10500:2012 Drinking Water Specification (Acceptable & Permissible Limits)
- Central Pollution Control Board (CPCB) / FAO Salinity Guidelines

Risk Logic Hierarchy:
1. High Risk: Point prediction exceeds upper screening threshold.
2. Medium Risk (Borderline): Point prediction within limits, but uncertainty interval
   breaches upper or lower screening threshold.
3. Medium Risk (Permissible): Point estimate or interval falls in relaxation zone.
4. Low Risk: ALL required point estimates AND uncertainty bounds strictly comply
   with all configured desirable limits.
5. Insufficient Data: One or more required parameters or bounds are null/invalid.
"""

# Configurable screening limits
DEFAULT_THRESHOLDS = {
    'TDS': {'desirable': 500.0, 'permissible': 2000.0, 'unit': 'mg/L'},
    'EC': {'desirable': 750.0, 'permissible': 2250.0, 'unit': 'µS/cm'},
    'Fluoride': {'desirable': 1.0, 'permissible': 1.5, 'unit': 'mg/L'},
    'pH': {'min': 6.5, 'max': 8.5, 'unit': 'dimensionless'}
}

def get_drinking_suitability(risk_level):
    """
    Maps 4-tier regulatory risk level to practical 3-tier Drinking Suitability standard:
    - Low Risk -> Drinkable (Safe for direct human consumption)
    - Medium Risk (Permissible & Borderline) -> Required Boiling (Domestic boiling & filtration required)
    - High Risk -> Not Drinkable (Unsafe; exceeds statutory limits; requires RO / defluoridation)
    """
    if risk_level == 'Low Risk':
        return 'Drinkable', 'Safe for direct drinking; strictly meets BIS 10500:2012 desirable water quality standards.'
    elif risk_level in ('Medium Risk (Permissible)', 'Medium Risk (Borderline)'):
        return 'Required Boiling', 'Permissible in absence of alternate source; boiling (3-5 mins) and domestic filtration required before drinking.'
    elif risk_level == 'High Risk':
        return 'Not Drinkable', 'Exceeds statutory limits. Unsafe for direct human consumption without Reverse Osmosis or defluoridation treatment.'
    else:
        return 'Unassessed', 'Insufficient parameter data to ascertain drinking potability.'

def evaluate_groundwater_risk(record, thresholds=None):
    """
    Evaluates groundwater risk for a given record containing:
    TDS, TDS_Upper_CI, TDS_Lower_CI
    EC, EC_Upper_CI, EC_Lower_CI
    Fluoride, Fluoride_Upper_CI, Fluoride_Lower_CI
    pH, pH_Lower_CI, pH_Upper_CI
    """
    cfg = thresholds or DEFAULT_THRESHOLDS

    # Validate presence of required numeric values
    req_keys = [
        'TDS', 'TDS_Upper_CI',
        'EC', 'EC_Upper_CI',
        'Fluoride', 'Fluoride_Upper_CI',
        'pH', 'pH_Lower_CI', 'pH_Upper_CI'
    ]

    for k in req_keys:
        val = record.get(k)
        if val is None or not isinstance(val, (int, float)) or (isinstance(val, float) and (val != val or abs(val) == float('inf'))):
            ds, dg = get_drinking_suitability('Insufficient Data')
            return {
                'Risk_Level': 'Insufficient Data',
                'Drinking_Suitability': ds,
                'Drinking_Suitability_Guidance': dg,
                'Water_Quality_Status': 'Data Incomplete / Unassessed',
                'Risk_Description': f'Missing or invalid value for parameter: {k}',
                'Trigger_Parameters': [k]
            }

    tds = float(record['TDS'])
    tds_up = float(record['TDS_Upper_CI'])

    ec = float(record['EC'])
    ec_up = float(record['EC_Upper_CI'])

    f = float(record['Fluoride'])
    f_up = float(record['Fluoride_Upper_CI'])

    ph = float(record['pH'])
    ph_low = float(record['pH_Lower_CI'])
    ph_up = float(record['pH_Upper_CI'])

    # 1. High Risk Check (Point Prediction Exceedance)
    high_triggers = []
    if f > cfg['Fluoride']['permissible']:
        high_triggers.append(f"Fluoride Point Exceedance ({f:.2f} mg/L > {cfg['Fluoride']['permissible']} mg/L BIS limit)")
    if tds > cfg['TDS']['permissible']:
        high_triggers.append(f"TDS Point Exceedance ({tds:.1f} mg/L > {cfg['TDS']['permissible']} mg/L BIS limit)")
    if ec > cfg['EC']['permissible']:
        high_triggers.append(f"EC Point Exceedance ({ec:.1f} µS/cm > {cfg['EC']['permissible']} µS/cm CPCB guide)")
    if ph < cfg['pH']['min'] or ph > cfg['pH']['max']:
        high_triggers.append(f"pH Point Non-compliance ({ph:.2f} outside {cfg['pH']['min']}-{cfg['pH']['max']} BIS spec)")

    if high_triggers:
        ds, dg = get_drinking_suitability('High Risk')
        return {
            'Risk_Level': 'High Risk',
            'Drinking_Suitability': ds,
            'Drinking_Suitability_Guidance': dg,
            'Water_Quality_Status': 'Non-Compliant (Forecasted Exceedance)',
            'Risk_Description': '; '.join(high_triggers),
            'Trigger_Parameters': [t.split()[0] for t in high_triggers]
        }

    # 2. Medium Risk - Borderline (Uncertainty Interval Exceedance)
    borderline_triggers = []
    if f_up > cfg['Fluoride']['permissible']:
        borderline_triggers.append(f"Fluoride Upper CI breach ({f_up:.2f} mg/L > {cfg['Fluoride']['permissible']} mg/L limit, Point: {f:.2f})")
    if tds_up > cfg['TDS']['permissible']:
        borderline_triggers.append(f"TDS Upper CI breach ({tds_up:.1f} mg/L > {cfg['TDS']['permissible']} mg/L limit, Point: {tds:.1f})")
    if ec_up > cfg['EC']['permissible']:
        borderline_triggers.append(f"EC Upper CI breach ({ec_up:.1f} µS/cm > {cfg['EC']['permissible']} µS/cm guide, Point: {ec:.1f})")
    if ph_low < cfg['pH']['min']:
        borderline_triggers.append(f"pH Lower CI breach ({ph_low:.2f} < {cfg['pH']['min']}, Point: {ph:.2f} - corrosion risk)")
    if ph_up > cfg['pH']['max']:
        borderline_triggers.append(f"pH Upper CI breach ({ph_up:.2f} > {cfg['pH']['max']}, Point: {ph:.2f} - scaling risk)")

    if borderline_triggers:
        ds, dg = get_drinking_suitability('Medium Risk (Borderline)')
        return {
            'Risk_Level': 'Medium Risk (Borderline)',
            'Drinking_Suitability': ds,
            'Drinking_Suitability_Guidance': dg,
            'Water_Quality_Status': 'Conditionally Permissible (Potential Exceedance)',
            'Risk_Description': '; '.join(borderline_triggers),
            'Trigger_Parameters': [t.split()[0] for t in borderline_triggers]
        }

    # 3. Strict Desirable Limits (Low Risk)
    # Must have point AND upper bounds strictly <= desirable limits for TDS, EC, F, and pH bounds in [6.5, 8.5]
    is_low = (
        tds <= cfg['TDS']['desirable'] and tds_up <= cfg['TDS']['desirable'] and
        f <= cfg['Fluoride']['desirable'] and f_up <= cfg['Fluoride']['desirable'] and
        ec <= cfg['EC']['desirable'] and ec_up <= cfg['EC']['desirable'] and
        ph >= cfg['pH']['min'] and ph_low >= cfg['pH']['min'] and
        ph <= cfg['pH']['max'] and ph_up <= cfg['pH']['max']
    )

    if is_low:
        ds, dg = get_drinking_suitability('Low Risk')
        return {
            'Risk_Level': 'Low Risk',
            'Drinking_Suitability': ds,
            'Drinking_Suitability_Guidance': dg,
            'Water_Quality_Status': 'Desirable Quality (Meets BIS Acceptable Limits)',
            'Risk_Description': 'Point prediction and nominal 80% prediction bounds strictly comply with all desirable water quality limits',
            'Trigger_Parameters': []
        }

    # 4. Standard Permissible Relaxation Zone (Medium Risk - Permissible)
    perm_reasons = []
    if tds > cfg['TDS']['desirable'] or tds_up > cfg['TDS']['desirable']:
        perm_reasons.append(f"TDS in permissible range (Point: {tds:.1f}, Upper CI: {tds_up:.1f} mg/L)")
    if f > cfg['Fluoride']['desirable'] or f_up > cfg['Fluoride']['desirable']:
        perm_reasons.append(f"Fluoride in permissible range (Point: {f:.2f}, Upper CI: {f_up:.2f} mg/L)")
    if ec > cfg['EC']['desirable'] or ec_up > cfg['EC']['desirable']:
        perm_reasons.append(f"EC in permissible range (Point: {ec:.1f}, Upper CI: {ec_up:.1f} µS/cm)")

    ds, dg = get_drinking_suitability('Medium Risk (Permissible)')
    return {
        'Risk_Level': 'Medium Risk (Permissible)',
        'Drinking_Suitability': ds,
        'Drinking_Suitability_Guidance': dg,
        'Water_Quality_Status': 'Permissible Quality (In Absence of Alternate Source)',
        'Risk_Description': '; '.join(perm_reasons) if perm_reasons else "Within statutory permissible relaxation limits",
        'Trigger_Parameters': [p.split()[0] for p in perm_reasons]
    }
