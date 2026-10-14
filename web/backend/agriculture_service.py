"""
Agriculture Vulnerability Assessment Service
Standards:
- FAO Irrigation and Drainage Paper 29 (Ayers & Westcot, 1985)
- Indian Standard IS 11624:1986 (Guidelines for Quality of Irrigation Water)
- USDA Salinity Laboratory Handbook 60 (Richards, 1954)

Assesses groundwater suitability for agricultural irrigation based on:
1. Salinity Hazard (EC in µS/cm, TDS in mg/L)
2. Sodicity / Permeability Hazard (Sodium Adsorption Ratio - SAR)
3. Alkalinity / Bicarbonate Hazard (Residual Sodium Carbonate - RSC in meq/L)
4. Sodium Hazard (Sodium Percentage - Na%)
5. Irrigation pH Hazard

Note: Supervised crop yield models are NOT implemented because field crop-yield
outcome labels do not exist in this hydrogeological monitoring repository.
This service provides transparent, rule-based screening against international
and national agricultural irrigation guidelines.
"""

from typing import Dict, Any, List, Optional

# Standard FAO / IS 11624 Agricultural Guidelines
AGRI_THRESHOLDS = {
    'EC': {
        'low': 750.0,       # Class C1/C2: Safe for most crops
        'moderate': 2250.0, # Class C3: Moderate restriction / leaching needed
        'high': 4000.0,     # Class C4: High salinity, salt-tolerant crops only
        'unit': 'µS/cm'
    },
    'TDS': {
        'low': 500.0,
        'moderate': 1500.0,
        'high': 2500.0,
        'unit': 'mg/L'
    },
    'SAR': {
        'low': 10.0,        # Class S1: Low sodium hazard
        'moderate': 18.0,   # Class S2: Medium sodium hazard
        'high': 26.0,       # Class S3: High sodium hazard, soil sealing
        'unit': 'ratio'
    },
    'RSC': {
        'low': 1.25,        # Safe (<1.25 meq/L)
        'moderate': 2.50,   # Marginal (1.25 - 2.50 meq/L)
        'high': 3.50,       # Unsuitable (>2.50 meq/L)
        'unit': 'meq/L'
    },
    'Na_pct': {
        'low': 40.0,        # Excellent to Good
        'moderate': 60.0,   # Permissible
        'high': 80.0,       # Doubtful to Unsuitable
        'unit': '%'
    },
    'pH': {
        'normal_min': 6.5,
        'normal_max': 8.4,
        'alkaline_max': 9.0,
        'unit': 'dimensionless'
    }
}

def evaluate_agriculture_vulnerability(record: Dict[str, Any], thresholds: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Evaluates Agricultural Groundwater Vulnerability.
    If full chemical suite (SAR, RSC, Na%) is available (historical data), performs complete assessment.
    If only EC, TDS, pH are available (forecast data), performs partial salinity/alkalinity screening.
    If EC is missing, returns Insufficient Data.
    """
    cfg = thresholds or AGRI_THRESHOLDS

    # Validate primary salinity indicator (EC)
    ec_val = record.get('EC')
    if ec_val is None or not isinstance(ec_val, (int, float)) or (isinstance(ec_val, float) and (ec_val != ec_val or abs(ec_val) == float('inf'))):
        return {
            'risk_class': 'Insufficient Data',
            'irrigation_suitability': 'Unassessed',
            'assessment_type': 'Incomplete data',
            'data_status': 'Missing required electrical conductivity (EC) measurement',
            'key_factors': ['Electrical conductivity (EC) is missing or invalid; cannot evaluate salinity hazard.'],
            'trigger_parameters': ['EC'],
            'explanation': 'Agricultural assessment requires electrical conductivity (EC) as a primary salinity indicator.',
            'score': None,
            'limitations': 'No valid electrical conductivity measurement available.',
            'supporting_indices': {}
        }

    ec = float(ec_val)
    tds = float(record.get('TDS', ec * 0.64)) if record.get('TDS') is not None else ec * 0.64
    ph = float(record['pH']) if record.get('pH') is not None and isinstance(record.get('pH'), (int, float)) else None

    # Check for secondary irrigation indices
    sar = float(record['SAR']) if record.get('SAR') is not None and isinstance(record.get('SAR'), (int, float)) and record['SAR'] == record['SAR'] else None
    rsc = float(record['RSC']) if record.get('RSC') is not None and isinstance(record.get('RSC'), (int, float)) and record['RSC'] == record['RSC'] else None
    na_pct = float(record['Na%']) if record.get('Na%') is not None and isinstance(record.get('Na%'), (int, float)) and record['Na%'] == record['Na%'] else None

    has_sar = sar is not None
    has_rsc = rsc is not None
    has_na_pct = na_pct is not None
    is_complete = has_sar and has_rsc

    if is_complete:
        assessment_type = "Comprehensive irrigation suitability (FAO 29 & IS 11624)"
        data_status = "Available (Complete chemical suite)"
        limitations = "Rule-based hydrochemical screening against FAO 29 and IS 11624 standards. Does not account for real-time soil texture, drainage conditions, or crop-specific transpiration demands."
    else:
        assessment_type = "Partial screening (Salinity & pH only)"
        data_status = "Partial (SAR, RSC & Na% unmeasured/unforecasted)"
        limitations = "SAR (sodicity) and RSC (alkalinity) were not measured or modeled; assessment represents salinity screening based on EC and pH only. Cation/anion laboratory testing required for full sodicity assessment."

    # Track triggers and contributing factors
    v_high_triggers = []
    high_triggers = []
    mod_triggers = []

    # 1. Salinity Hazard Evaluation
    if ec > cfg['EC']['high']:
        v_high_triggers.append(f"Severe Salinity Hazard (EC: {ec:.1f} µS/cm > {cfg['EC']['high']} µS/cm, FAO Class C5 - Unsuitable under ordinary conditions)")
    elif ec > cfg['EC']['moderate']:
        high_triggers.append(f"High Salinity Hazard (EC: {ec:.1f} µS/cm > {cfg['EC']['moderate']} µS/cm, FAO Class C4 - Severe restriction; salt-tolerant crops only)")
    elif ec > cfg['EC']['low']:
        mod_triggers.append(f"Moderate Salinity Hazard (EC: {ec:.1f} µS/cm > {cfg['EC']['low']} µS/cm, FAO Class C3 - Moderate restriction; leaching required)")

    # 2. Sodicity Hazard Evaluation (SAR)
    if has_sar:
        if sar > cfg['SAR']['high']:
            v_high_triggers.append(f"Severe Sodicity Hazard (SAR: {sar:.2f} > {cfg['SAR']['high']}, USDA Class S4 - Extreme soil permeability breakdown)")
        elif sar > cfg['SAR']['moderate']:
            high_triggers.append(f"High Sodicity Hazard (SAR: {sar:.2f} > {cfg['SAR']['moderate']}, USDA Class S3 - Severe permeability reduction; gypsum amendment needed)")
        elif sar > cfg['SAR']['low']:
            mod_triggers.append(f"Moderate Sodicity Hazard (SAR: {sar:.2f} > {cfg['SAR']['low']}, USDA Class S2 - Leaching and drainage required)")

    # 3. Residual Sodium Carbonate (RSC)
    if has_rsc:
        if rsc > cfg['RSC']['high']:
            v_high_triggers.append(f"Severe Bicarbonate Alkalinity Hazard (RSC: {rsc:.2f} meq/L > {cfg['RSC']['high']} meq/L - Severe calcium precipitation)")
        elif rsc > cfg['RSC']['moderate']:
            high_triggers.append(f"High Bicarbonate Hazard (RSC: {rsc:.2f} meq/L > {cfg['RSC']['moderate']} meq/L - Unsuitable under IS 11624 without acid/gypsum)")
        elif rsc > cfg['RSC']['low']:
            mod_triggers.append(f"Marginal Bicarbonate Hazard (RSC: {rsc:.2f} meq/L > {cfg['RSC']['low']} meq/L - Marginal suitability)")

    # 4. Sodium Percentage (Na%)
    if has_na_pct:
        if na_pct > cfg['Na_pct']['high']:
            v_high_triggers.append(f"Severe Sodium Percentage (Na%: {na_pct:.1f}% > {cfg['Na_pct']['high']}% - Severe soil deflocculation)")
        elif na_pct > cfg['Na_pct']['moderate']:
            high_triggers.append(f"High Sodium Percentage (Na%: {na_pct:.1f}% > {cfg['Na_pct']['moderate']}% - Doubtful irrigation quality)")
        elif na_pct > cfg['Na_pct']['low']:
            mod_triggers.append(f"Moderate Sodium Percentage (Na%: {na_pct:.1f}% > {cfg['Na_pct']['low']}% - Permissible)")

    # 5. pH Hazard
    if ph is not None:
        if ph > cfg['pH']['alkaline_max']:
            v_high_triggers.append(f"Severe Alkaline Hazard (pH: {ph:.2f} > {cfg['pH']['alkaline_max']} - Micronutrient fixation and sodicity)")
        elif ph > cfg['pH']['normal_max']:
            mod_triggers.append(f"Elevated Alkalinity (pH: {ph:.2f} > {cfg['pH']['normal_max']} - Moderate micronutrient restriction)")
        elif ph < cfg['pH']['normal_min']:
            high_triggers.append(f"Acidic Groundwater Hazard (pH: {ph:.2f} < {cfg['pH']['normal_min']} - Acid soil corrosion and aluminum toxicity)")

    # Synthesize Agriculture Vulnerability Class
    if v_high_triggers:
        risk_class = 'Very High Vulnerability'
        suitability = 'Unsuitable for Standard Irrigation'
        score = 95
        key_factors = v_high_triggers + high_triggers
        explanation = "Critical agricultural risk: Severe salinity, extreme sodicity (SAR), or toxic bicarbonate levels create acute crop toxicity and soil structure degradation."
    elif high_triggers:
        risk_class = 'High Vulnerability'
        suitability = 'Severe Restriction (Special Management Required)'
        score = 75
        key_factors = high_triggers + mod_triggers
        explanation = "High agricultural constraint: Significant salinity or permeability hazard requires salt-tolerant crops, high leaching fractions, or soil amendments."
    elif mod_triggers:
        risk_class = 'Moderate Vulnerability'
        suitability = 'Moderate Restriction (Permissible with Good Drainage)'
        score = 45
        key_factors = mod_triggers
        explanation = "Moderate agricultural constraint: Moderate salinity or marginal bicarbonate levels may affect sensitive crops unless good drainage and leaching are provided."
    else:
        risk_class = 'Low Vulnerability'
        suitability = 'Suitable for General Irrigation'
        score = 15
        key_factors = ['All evaluated salinity and sodicity indicators strictly comply with low-hazard agricultural guidelines.']
        explanation = "Low agricultural risk: Water is suitable for general irrigation across a wide range of soils and crops without special management."

    return {
        'risk_class': risk_class,
        'irrigation_suitability': suitability,
        'assessment_type': assessment_type,
        'data_status': data_status,
        'key_factors': key_factors,
        'trigger_parameters': [f.split()[0] for f in key_factors],
        'explanation': explanation,
        'score': score,
        'limitations': limitations,
        'supporting_indices': {
            'EC': {'value': round(ec, 1), 'unit': 'µS/cm', 'threshold_safe': cfg['EC']['low']},
            'TDS': {'value': round(tds, 1), 'unit': 'mg/L', 'threshold_safe': cfg['TDS']['low']},
            'SAR': {'value': round(sar, 2) if has_sar else None, 'unit': 'ratio', 'threshold_safe': cfg['SAR']['low'], 'status': 'Measured' if has_sar else 'Unmeasured'},
            'RSC': {'value': round(rsc, 2) if has_rsc else None, 'unit': 'meq/L', 'threshold_safe': cfg['RSC']['low'], 'status': 'Measured' if has_rsc else 'Unmeasured'},
            'Na_pct': {'value': round(na_pct, 1) if has_na_pct else None, 'unit': '%', 'threshold_safe': cfg['Na_pct']['low'], 'status': 'Measured' if has_na_pct else 'Unmeasured'},
            'pH': {'value': round(ph, 2) if ph is not None else None, 'unit': 'dimensionless', 'threshold_safe': f"{cfg['pH']['normal_min']}-{cfg['pH']['normal_max']}"}
        }
    }
