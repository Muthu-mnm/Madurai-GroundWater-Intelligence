/**
 * Multi-Domain Groundwater Vulnerability Thresholds & Standards
 * Standards:
 * - Water Quality: BIS 10500:2012 Drinking Water Specification & CPCB
 * - Agriculture: FAO Irrigation Paper 29 (1985) & IS 11624:1986
 * - Health: WHO Guidelines for Drinking-water Quality (2017) & BIS 10500:2012
 * - Combined: Protective Multi-Domain Composite Rule Engine (v2.1.0)
 */

export const THRESHOLDS = {
  TDS: {
    name: 'Total Dissolved Solids',
    symbol: 'TDS',
    unit: 'mg/L',
    desirable: 500.0,
    permissible: 2000.0,
    extreme: 3000.0,
    cpcb_guide: 2000.0,
    step: 50
  },
  EC: {
    name: 'Electrical Conductivity',
    symbol: 'EC',
    unit: 'µS/cm',
    desirable: 750.0,
    permissible: 2250.0,
    extreme: 4000.0,
    cpcb_guide: 2250.0,
    step: 100
  },
  Fluoride: {
    name: 'Fluoride',
    symbol: 'F',
    unit: 'mg/L',
    desirable: 1.0,
    permissible: 1.5,
    extreme: 3.0,
    cpcb_guide: 1.5,
    step: 0.1
  },
  pH: {
    name: 'Hydrogen Ion Potential',
    symbol: 'pH',
    unit: 'dimensionless',
    min: 6.5,
    max: 8.5,
    desirable_min: 6.5,
    desirable_max: 8.5,
    extreme_min: 5.0,
    extreme_max: 9.5,
    step: 0.1
  },
  Nitrate: {
    name: 'Nitrate (as NO3)',
    symbol: 'NO3',
    unit: 'mg/L',
    desirable: 45.0,
    permissible: 45.0,
    safe: 45.0,
    extreme: 100.0,
    step: 1.0
  },
  NO3: {
    name: 'Nitrate (as NO3)',
    symbol: 'NO3',
    unit: 'mg/L',
    desirable: 45.0,
    permissible: 45.0,
    safe: 45.0,
    extreme: 100.0,
    step: 1.0
  },
  Cl: {
    name: 'Chloride (as Cl)',
    symbol: 'Cl',
    unit: 'mg/L',
    desirable: 250.0,
    permissible: 1000.0,
    extreme: 1500.0,
    step: 10.0
  },
  Chloride: {
    name: 'Chloride (as Cl)',
    symbol: 'Cl',
    unit: 'mg/L',
    desirable: 250.0,
    permissible: 1000.0,
    extreme: 1500.0,
    step: 10.0
  },
  Ca: {
    name: 'Calcium (as Ca)',
    symbol: 'Ca',
    unit: 'mg/L',
    desirable: 75.0,
    permissible: 200.0,
    extreme: 300.0,
    step: 5.0
  },
  Calcium: {
    name: 'Calcium (as Ca)',
    symbol: 'Ca',
    unit: 'mg/L',
    desirable: 75.0,
    permissible: 200.0,
    extreme: 300.0,
    step: 5.0
  },
  Mg: {
    name: 'Magnesium (as Mg)',
    symbol: 'Mg',
    unit: 'mg/L',
    desirable: 30.0,
    permissible: 100.0,
    extreme: 150.0,
    step: 2.0
  },
  Magnesium: {
    name: 'Magnesium (as Mg)',
    symbol: 'Mg',
    unit: 'mg/L',
    desirable: 30.0,
    permissible: 100.0,
    extreme: 150.0,
    step: 2.0
  },
  SAR: {
    name: 'Sodium Adsorption Ratio',
    symbol: 'SAR',
    unit: 'ratio',
    desirable: 10.0,
    permissible: 18.0,
    low: 10.0,
    moderate: 18.0,
    high: 26.0,
    step: 0.5
  },
  RSC: {
    name: 'Residual Sodium Carbonate',
    symbol: 'RSC',
    unit: 'meq/L',
    desirable: 1.25,
    permissible: 2.50,
    low: 1.25,
    moderate: 2.50,
    high: 3.50,
    step: 0.25
  },
  'Na%': {
    name: 'Sodium Percentage',
    symbol: 'Na%',
    unit: '%',
    desirable: 40.0,
    permissible: 60.0,
    extreme: 80.0,
    step: 1.0
  }
};

export const RISK_COLORS = {
  'High Risk': {
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    badgeClass: 'high'
  },
  'Medium Risk (Borderline)': {
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    badgeClass: 'borderline'
  },
  'Medium Risk (Permissible)': {
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    badgeClass: 'permissible'
  },
  'Low Risk': {
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    badgeClass: 'low'
  },
  'Insufficient Data': {
    color: '#64748B',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    badgeClass: 'nodata'
  },
  // Backward compatibility alias keys
  'Very High Vulnerability': {
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    badgeClass: 'high'
  },
  'High Vulnerability': {
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
    badgeClass: 'high'
  },
  'Moderate Vulnerability': {
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    badgeClass: 'borderline'
  },
  'Low Vulnerability': {
    color: '#0D9488',
    bg: '#F0FDFA',
    border: '#99F6E4',
    badgeClass: 'low'
  },
  'Partial Assessment': {
    color: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    badgeClass: 'permissible'
  }
};

export const VULNERABILITY_CLASSES = {
  'Low Vulnerability': {
    label: 'Low Vulnerability',
    rank: 1,
    color: '#0d9488',
    bg: '#f0fdfa',
    border: '#99f6e4',
    badgeClass: 'badge-vulnerability-low',
    summary: 'Minimal Vulnerability',
    description: 'Complies strictly with desirable statutory limits and safe irrigation guidelines.'
  },
  'Moderate Vulnerability': {
    label: 'Moderate Vulnerability',
    rank: 2,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    badgeClass: 'badge-vulnerability-mod',
    summary: 'Moderate Screening Concern',
    description: 'Parameters within permissible relaxation range or prediction intervals indicate potential exceedance.'
  },
  'High Vulnerability': {
    label: 'High Vulnerability',
    rank: 3,
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
    badgeClass: 'badge-vulnerability-high',
    summary: 'High Vulnerability Hazard',
    description: 'Point forecast or observed value breaches statutory permissible limits or severe agricultural thresholds.'
  },
  'Very High Vulnerability': {
    label: 'Very High Vulnerability',
    rank: 4,
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    badgeClass: 'badge-vulnerability-vhigh',
    summary: 'Critical Vulnerability / Toxicity',
    description: 'Severe contamination, acute toxic exposure, or extreme salinity/alkalinity detected.'
  },
  'Partial Assessment': {
    label: 'Partial Assessment',
    rank: 0,
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    badgeClass: 'badge-vulnerability-partial',
    summary: 'Partial Domain Coverage',
    description: 'Evaluated from available subsets of domains; secondary indicators were unmeasured.'
  },
  'Insufficient Data': {
    label: 'Insufficient Data',
    rank: -1,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#cbd5e1',
    badgeClass: 'badge-vulnerability-nodata',
    summary: 'Incomplete Measurement Data',
    description: 'Essential parameters missing; cannot perform screening without primary measurements.'
  }
};

export const DOMAIN_METADATA = {
  combined: {
    id: 'combined',
    name: 'Combined Assessment',
    title: 'Combined Groundwater Vulnerability',
    shortTitle: 'Combined Assessment',
    topMetrics: ['EC', 'SAR', 'RSC', 'Na%', 'Fluoride', 'NO3', 'TDS', 'pH', 'Cl', 'Ca', 'Mg'],
    purpose: 'Protective composite screening across Agriculture, Human Health, and Water Quality',
    standards: 'Protective Precedence Engine (v2.1.0)',
    standard: 'Protective composite rule engine (WQ + Health + Agri)',
    modelType: 'Protective Composite Rule Engine (v2.1.0)',
    description: 'Combines independent domain risk models. A severe hazard in any domain cannot be masked by low risk in another.'
  },
  water_quality: {
    id: 'water_quality',
    name: 'Water Quality Monitoring',
    title: 'Water Quality Vulnerability',
    shortTitle: 'Water Quality',
    topMetrics: ['pH', 'EC', 'TDS', 'Fluoride', 'NO3', 'Cl', 'Ca', 'Mg'],
    purpose: 'Identify poor-quality water and monitor changes over time',
    standards: 'BIS 10500:2012 & CPCB',
    standard: 'BIS 10500:2012 & CPCB (pH, EC, TDS, Fluoride, NO3, Cl, Ca, Mg)',
    modelType: 'Adaptive Ensemble Forecaster + BIS 10500:2012 Regulatory Screening',
    description: 'Screens pH, EC, TDS, Fluoride, Nitrate, Chloride, Calcium, and Magnesium point forecasts and nominal 80% Bayesian uncertainty intervals.'
  },
  agriculture: {
    id: 'agriculture',
    name: 'Agriculture',
    title: 'Agriculture Vulnerability',
    shortTitle: 'Agriculture',
    topMetrics: ['EC', 'SAR', 'RSC', 'Na%', 'pH'],
    purpose: 'Irrigation suitability, salinity and sodium hazards',
    standards: 'FAO 29 & IS 11624:1986',
    standard: 'FAO 29 & IS 11624:1986 (EC, SAR, RSC, Na%, pH)',
    modelType: 'Rule-Based Irrigation Suitability Assessment (No supervised yield claims)',
    description: 'Screens salinity hazard (EC), sodicity hazard (SAR), bicarbonate alkalinity (RSC), sodium percentage (Na%), and pH.'
  },
  health: {
    id: 'health',
    name: 'Human Health',
    title: 'Health Vulnerability Screening',
    shortTitle: 'Health Screening',
    topMetrics: ['Fluoride', 'NO3', 'TDS', 'pH', 'Cl'],
    purpose: 'Drinking-water quality screening',
    standards: 'WHO 2017 & BIS 10500:2012',
    standard: 'WHO 2017 & BIS 10500:2012 (Fluoride, NO3, TDS, pH, Cl)',
    modelType: 'Contaminant-Based Exposure Screening Tool (Not a clinical diagnosis device)',
    description: 'Screens toxicological exposure hazards for Fluoride, Nitrate (methemoglobinemia), mineral TDS load, pH, and Chloride.'
  }
};

export const DOMAIN_APPLICATION_METRICS = DOMAIN_METADATA;

export function getVulnerabilityMeta(riskClass) {
  if (!riskClass) return VULNERABILITY_CLASSES['Insufficient Data'];
  const norm = String(riskClass).trim();
  
  if (VULNERABILITY_CLASSES[norm]) {
    return VULNERABILITY_CLASSES[norm];
  }
  
  if (norm.includes('Very High')) return VULNERABILITY_CLASSES['Very High Vulnerability'];
  if (norm.includes('High')) return VULNERABILITY_CLASSES['High Vulnerability'];
  if (norm.includes('Moderate') || norm.includes('Medium') || norm.includes('Borderline') || norm.includes('Permissible')) return VULNERABILITY_CLASSES['Moderate Vulnerability'];
  if (norm.includes('Low')) return VULNERABILITY_CLASSES['Low Vulnerability'];
  if (norm.includes('Partial')) return VULNERABILITY_CLASSES['Partial Assessment'];
  return VULNERABILITY_CLASSES['Insufficient Data'];
}

export const DRINKING_SUITABILITY = {
  'Drinkable': {
    label: 'Drinkable',
    symbol: '🟢',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    badgeClass: 'drinkable',
    summary: 'Safe to Drink Directly',
    guidance: 'Strictly complies with BIS 10500:2012 desirable limits. Safe for direct human consumption.',
    treatment: 'None required (routine domestic filtration optional).'
  },
  'Required Boiling': {
    label: 'Required Boiling',
    symbol: '🟡',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    badgeClass: 'boiling',
    summary: 'Microbial Boiling & Filtration Only',
    guidance: 'Boiling kills bacteria/pathogens in absence of alternate source, but DOES NOT remove dissolved chemical contaminants (fluoride, nitrate, salts).',
    treatment: 'Boiling for pathogens; activated carbon or RO required for dissolved ions.'
  },
  'Not Drinkable': {
    label: 'Not Drinkable',
    symbol: '🔴',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    badgeClass: 'not-drinkable',
    summary: 'Unsafe for Direct Drinking',
    guidance: 'Exceeds statutory drinking limits. High risk of adverse health impacts. Do not consume directly without advanced treatment.',
    treatment: 'Requires Reverse Osmosis (RO) or chemical defluoridation.'
  },
  'Unassessed': {
    label: 'Unassessed',
    symbol: '⚪',
    color: '#64748B',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    badgeClass: 'unassessed',
    summary: 'Incomplete Data',
    guidance: 'Insufficient parameter records to ascertain potability status.',
    treatment: 'Comprehensive chemical testing required.'
  }
};

export function getDrinkingSuitability(riskLevel, record = null) {
  if (record && record.Drinking_Suitability && DRINKING_SUITABILITY[record.Drinking_Suitability]) {
    return DRINKING_SUITABILITY[record.Drinking_Suitability];
  }
  if (record && record.drinking_suitability && DRINKING_SUITABILITY[record.drinking_suitability]) {
    return DRINKING_SUITABILITY[record.drinking_suitability];
  }
  const meta = getVulnerabilityMeta(riskLevel);
  if (meta.label === 'Low Vulnerability') return DRINKING_SUITABILITY['Drinkable'];
  if (meta.label === 'Moderate Vulnerability') return DRINKING_SUITABILITY['Required Boiling'];
  if (meta.label === 'High Vulnerability' || meta.label === 'Very High Vulnerability') return DRINKING_SUITABILITY['Not Drinkable'];
  return DRINKING_SUITABILITY['Unassessed'];
}

export function evaluateMultiDomain(record) {
  if (!record) {
    return {
      wq: { class: 'Insufficient Data', reason: 'No data' },
      agri: { class: 'Insufficient Data', reason: 'No data', isPartial: false, suitability: 'Unassessed' },
      health: { class: 'Insufficient Data', reason: 'No data', isPartial: false, concern: 'Unassessed' },
      combined: { class: 'Insufficient Data', reason: 'No data', score: 0, isPartial: false }
    };
  }

  const f = Number(record.Fluoride);
  const no3 = Number(record.NO3);
  const tds = Number(record.TDS);
  const ec = Number(record.EC);
  const ph = Number(record.pH);
  const cl = Number(record.Cl);
  const ca = Number(record.Ca);
  const mg = Number(record.Mg);
  const sar = Number(record.SAR);
  const rsc = Number(record.RSC);
  const naPct = Number(record['Na%']);

  const hasNo3 = !isNaN(no3) && no3 !== null;
  const hasCl = !isNaN(cl) && cl !== null;
  const hasCa = !isNaN(ca) && ca !== null;
  const hasMg = !isNaN(mg) && mg !== null;
  const hasSar = !isNaN(sar) && sar !== null;
  const hasRsc = !isNaN(rsc) && rsc !== null;
  const hasNaPct = !isNaN(naPct) && naPct !== null;

  // 1. Water Quality Domain (Top Metrics: pH, EC, TDS, Fluoride, NO3, Cl, Ca, Mg)
  let wqClass = 'Low Vulnerability';
  let wqReason = 'Within desirable statutory limits';
  if (isNaN(tds) || isNaN(ec) || isNaN(f) || isNaN(ph)) {
    wqClass = 'Insufficient Data';
    wqReason = 'Missing core parameters';
  } else if (f > 3.0 || tds > 3000 || ec > 4000 || (hasCl && cl > 1500) || (hasNo3 && no3 > 100) || (hasCa && ca > 300) || (hasMg && mg > 150) || ph < 5.0 || ph > 9.5) {
    wqClass = 'Very High Vulnerability';
    wqReason = f > 3.0 ? `Severe Fluoride (${f.toFixed(2)} mg/L)` : (tds > 3000 ? `Severe Mineralization (${tds.toFixed(0)} mg/L)` : `Extreme Contaminant Load`);
  } else if (f > 1.5 || tds > 2000 || ec > 2250 || (hasCl && cl > 1000) || (hasNo3 && no3 > 45) || (hasCa && ca > 200) || (hasMg && mg > 100) || ph < 6.5 || ph > 8.5) {
    wqClass = 'High Vulnerability';
    wqReason = f > 1.5 ? `Fluoride Exceedance (${f.toFixed(2)} mg/L > 1.5)` : (tds > 2000 ? `TDS Exceedance (${tds.toFixed(0)} mg/L)` : (hasCl && cl > 1000 ? `Chloride Exceedance (${cl.toFixed(0)} mg/L)` : (hasCa && ca > 200 ? `Calcium Exceedance (${ca.toFixed(1)} mg/L)` : `EC/pH Non-compliance`)));
  } else if (tds > 500 || f > 1.0 || ec > 750 || (hasCl && cl > 250) || (hasCa && ca > 75) || (hasMg && mg > 30) || (record.Fluoride_Upper_CI && Number(record.Fluoride_Upper_CI) > 1.5)) {
    wqClass = 'Moderate Vulnerability';
    wqReason = 'Permissible relaxation / CI breach';
  }

  // 2. Agriculture Domain (Top Metrics: EC, SAR, RSC, Na%, pH)
  let agriClass = 'Low Vulnerability';
  let agriReason = 'Suitable for general irrigation (FAO Class C1/C2)';
  let agriSuitability = 'Suitable for General Irrigation';
  const agriPartial = !hasSar || !hasRsc;

  if (isNaN(ec)) {
    agriClass = 'Insufficient Data';
    agriReason = 'Missing EC salinity measurement';
    agriSuitability = 'Unassessed';
  } else if (ec > 4000 || sar > 26 || rsc > 3.5 || naPct > 80 || ph > 9.0) {
    agriClass = 'Very High Vulnerability';
    agriSuitability = 'Unsuitable under Standard Practices';
    agriReason = ec > 4000 ? `Severe Salinity (${ec.toFixed(0)} µS/cm)` : (rsc > 3.5 ? `Severe RSC (${rsc.toFixed(2)} meq/L)` : (sar > 26 ? `Severe Sodicity (SAR ${sar.toFixed(1)})` : `Severe Alkalinity`));
  } else if (ec > 2250 || sar > 18 || rsc > 2.5 || naPct > 60 || ph < 6.0) {
    agriClass = 'High Vulnerability';
    agriSuitability = 'Severe Restriction (Salt-Tolerant Only)';
    agriReason = ec > 2250 ? `High Salinity (${ec.toFixed(0)} µS/cm, Class C4)` : (sar > 18 ? `High SAR (${sar.toFixed(1)})` : (rsc > 2.5 ? `High RSC (${rsc.toFixed(2)} meq/L)` : `High Sodium Percentage`));
  } else if (ec > 750 || sar > 10 || rsc > 1.25 || naPct > 40 || ph > 8.4) {
    agriClass = 'Moderate Vulnerability';
    agriSuitability = 'Moderate Restriction';
    agriReason = ec > 750 ? `Moderate Salinity (${ec.toFixed(0)} µS/cm)` : `Marginal Sodicity/RSC`;
  }

  // 3. Health Domain (Top Metrics: Fluoride, NO3, TDS, pH, Cl)
  let healthClass = 'Low Vulnerability';
  let healthReason = 'Complies with WHO/BIS guidelines';
  let healthConcern = 'Within safe limits';
  const healthPartial = !hasNo3;

  if (isNaN(f)) {
    healthClass = 'Insufficient Data';
    healthReason = 'Missing Fluoride';
    healthConcern = 'Unassessed';
  } else if (f > 3.0 || (hasNo3 && no3 > 100) || tds > 3000 || (hasCl && cl > 1500) || ph < 5.0 || ph > 9.5) {
    healthClass = 'Very High Vulnerability';
    healthReason = f > 3.0 ? `Crippling Fluorosis Risk (F ${f.toFixed(2)} mg/L)` : (no3 > 100 ? `Acute Nitrate Hazard (${no3.toFixed(0)} mg/L)` : (cl > 1500 ? `Severe Chloride Toxicity (${cl.toFixed(0)} mg/L)` : `Extreme Mineralization`));
    healthConcern = healthReason;
  } else if (f > 1.5 || (hasNo3 && no3 > 45) || tds > 2000 || (hasCl && cl > 1000) || ph < 6.5 || ph > 8.5) {
    healthClass = 'High Vulnerability';
    healthReason = f > 1.5 ? `Dental Fluorosis Risk (F ${f.toFixed(2)} mg/L)` : (no3 > 45 ? `Infantile Methemoglobinemia Risk (NO3 ${no3.toFixed(1)} mg/L)` : (cl > 1000 ? `Chloride Exceedance (${cl.toFixed(0)} mg/L)` : `TDS / pH Exceedance`));
    healthConcern = healthReason;
  } else if (f > 1.0 || (record.Fluoride_Upper_CI && Number(record.Fluoride_Upper_CI) > 1.5) || tds > 500 || (hasCl && cl > 250)) {
    healthClass = 'Moderate Vulnerability';
    healthReason = 'Fluoride in permissible zone or prediction bound breach';
    healthConcern = healthReason;
  }

  // 4. Combined Protective Aggregation Rule
  const domainList = [wqClass, agriClass, healthClass];
  let combinedClass = 'Low Vulnerability';
  let protectiveTrigger = 'All domains comply with desirable limits.';
  let score = 15;

  if (domainList.includes('Very High Vulnerability')) {
    combinedClass = 'Very High Vulnerability';
    score = 95;
    const trig = [];
    if (healthClass === 'Very High Vulnerability') trig.push('Health Toxic Hazard');
    if (agriClass === 'Very High Vulnerability') trig.push('Agriculture Severe Salinity/Sodicity');
    if (wqClass === 'Very High Vulnerability') trig.push('Water Quality Extreme Exceedance');
    protectiveTrigger = `Protective severity rule: ${trig.join(', ')}`;
  } else if (domainList.includes('High Vulnerability')) {
    combinedClass = 'High Vulnerability';
    score = 75;
    const trig = [];
    if (healthClass === 'High Vulnerability') trig.push('Health Risk');
    if (agriClass === 'High Vulnerability') trig.push('Agriculture Hazard');
    if (wqClass === 'High Vulnerability') trig.push('Water Quality Exceedance');
    protectiveTrigger = `Protective severity rule: ${trig.join(', ')}`;
  } else if (domainList.includes('Moderate Vulnerability')) {
    combinedClass = 'Moderate Vulnerability';
    score = 45;
    protectiveTrigger = 'Composite relaxation zone / moderate constraints.';
  }

  return {
    wq: { class: wqClass, reason: wqReason },
    agri: { class: agriClass, reason: agriReason, isPartial: agriPartial, suitability: agriSuitability },
    health: { class: healthClass, reason: healthReason, isPartial: healthPartial, concern: healthConcern },
    combined: { class: combinedClass, reason: protectiveTrigger, score, isPartial: (agriPartial || healthPartial) }
  };
}

export function evaluateRisk(row) {
  if (!row) return { 
    level: 'Insufficient Data', 
    drinkingSuitability: 'Unassessed',
    description: 'No data provided', 
    status: 'Incomplete' 
  };

  const tds = parseFloat(row.TDS);
  const tds_up = parseFloat(row.TDS_Upper_CI);
  const ec = parseFloat(row.EC);
  const ec_up = parseFloat(row.EC_Upper_CI);
  const f = parseFloat(row.Fluoride);
  const f_up = parseFloat(row.Fluoride_Upper_CI);
  const ph = parseFloat(row.pH);
  const ph_low = parseFloat(row.pH_Lower_CI);
  const ph_up = parseFloat(row.pH_Upper_CI);

  if (isNaN(tds) || isNaN(tds_up) || isNaN(ec) || isNaN(ec_up) || isNaN(f) || isNaN(f_up) || isNaN(ph) || isNaN(ph_low) || isNaN(ph_up)) {
    return {
      level: 'Insufficient Data',
      drinkingSuitability: 'Unassessed',
      status: 'Data Incomplete / Unassessed',
      description: 'Missing or non-finite values for parameter prediction bounds.'
    };
  }

  // 1. High Risk Check (Point Exceedance)
  const high = [];
  if (f > 1.5) high.push(`Fluoride High (${f.toFixed(2)} mg/L > 1.5 BIS Limit)`);
  if (tds > 2000.0) high.push(`TDS High (${tds.toFixed(1)} mg/L > 2000 BIS Limit)`);
  if (ec > 2250.0) high.push(`EC High (${ec.toFixed(1)} µS/cm > 2250 CPCB Guide)`);
  if (ph < 6.5 || ph > 8.5) high.push(`pH Non-compliant (${ph.toFixed(2)} outside 6.5-8.5 BIS Specification)`);

  if (high.length > 0) {
    return {
      level: 'High Risk',
      drinkingSuitability: 'Not Drinkable',
      status: 'Non-Compliant (Forecasted Exceedance)',
      description: high.join('; ')
    };
  }

  // 2. Medium Risk - Borderline (Uncertainty CI breach)
  const borderline = [];
  if (f_up > 1.5) borderline.push(`Permissible Fluoride (${f.toFixed(2)} mg/L), but Upper CI (${f_up.toFixed(2)} mg/L) breaches 1.5 limit`);
  if (tds_up > 2000.0) borderline.push(`Permissible TDS (${tds.toFixed(1)} mg/L), but Upper CI (${tds_up.toFixed(1)} mg/L) breaches 2000 limit`);
  if (ec_up > 2250.0) borderline.push(`Permissible EC (${ec.toFixed(1)} µS/cm), but Upper CI (${ec_up.toFixed(1)} µS/cm) crosses 2250 CPCB guide`);
  if (ph_low < 6.5) borderline.push(`Compliant pH (${ph.toFixed(2)}), but Lower CI (${ph_low.toFixed(2)}) drops below 6.5 (corrosion risk)`);
  if (ph_up > 8.5) borderline.push(`Compliant pH (${ph.toFixed(2)}), but Upper CI (${ph_up.toFixed(2)}) exceeds 8.5 (scaling risk)`);

  if (borderline.length > 0) {
    return {
      level: 'Medium Risk (Borderline)',
      drinkingSuitability: 'Required Boiling',
      status: 'Conditionally Permissible (Potential Exceedance)',
      description: borderline.join('; ')
    };
  }

  // 3. Strict Desirable Limits (Low Risk)
  if (
    tds <= 500.0 &&
    f <= 1.0 &&
    ec <= 850.0 &&
    ph >= 6.5 && ph <= 8.5
  ) {
    return {
      level: 'Low Risk',
      drinkingSuitability: 'Drinkable',
      status: 'Desirable Quality (Meets BIS Acceptable Limits)',
      description: 'Point forecast strictly complies with BIS 10500 desirable limits; Upper CI within statutory permissible.'
    };
  }

  // 4. Standard Permissible Relaxation Zone
  const perm = [];
  if (tds > 500.0 || tds_up > 500.0) perm.push(`TDS in Permissible Range (Point: ${tds.toFixed(1)}, Upper CI: ${tds_up.toFixed(1)} mg/L)`);
  if (f > 1.0 || f_up > 1.0) perm.push(`Fluoride in Permissible Range (Point: ${f.toFixed(2)}, Upper CI: ${f_up.toFixed(2)} mg/L)`);
  if (ec > 750.0 || ec_up > 750.0) perm.push(`EC in Permissible Range (Point: ${ec.toFixed(1)}, Upper CI: ${ec_up.toFixed(1)} µS/cm)`);

  return {
    level: 'Medium Risk (Permissible)',
    drinkingSuitability: 'Required Boiling',
    status: 'Permissible Quality (In Absence of Alternate Source)',
    description: perm.length > 0 ? perm.join('; ') : 'Within permissible relaxation limits.'
  };
}

export const PREDICTION_PRESETS = [
  {
    id: 'safe_desirable',
    name: 'Desirable Potable Source',
    tag: 'Safe Drinking',
    badge: 'Drinkable',
    symbol: '🟢',
    tds: 360,
    ec: 550,
    fluoride: 0.65,
    ph: 7.20,
    scenario: 'normal',
    notes: 'Well water fully adhering to BIS 10500 acceptable thresholds.'
  },
  {
    id: 'permissible_boiling',
    name: 'Permissible Moderate Hardness',
    tag: 'Boiling Required',
    badge: 'Required Boiling',
    symbol: '🟡',
    tds: 920,
    ec: 1420,
    fluoride: 1.15,
    ph: 7.60,
    scenario: 'normal',
    notes: 'Elevated mineralization; domestic boiling and filtration advised.'
  },
  {
    id: 'high_fluoride',
    name: 'High Fluoride Contamination',
    tag: 'Fluorosis Hazard',
    badge: 'Not Drinkable',
    symbol: '🔴',
    tds: 880,
    ec: 1350,
    fluoride: 1.85,
    ph: 7.90,
    scenario: 'stress',
    notes: 'Fluoride exceeds 1.5 mg/L limit. Requires chemical defluoridation.'
  },
  {
    id: 'hyper_saline',
    name: 'Severe Saline Ground Intrusion',
    tag: 'Hyper-Saline',
    badge: 'Not Drinkable',
    symbol: '🔴',
    tds: 2450,
    ec: 3650,
    fluoride: 1.25,
    ph: 8.20,
    scenario: 'drought',
    notes: 'TDS & EC exceed statutory limits. Unfit without Reverse Osmosis.'
  },
  {
    id: 'acidic_corrosive',
    name: 'Acidic Aquifer Water',
    tag: 'Corrosion Risk',
    badge: 'Not Drinkable',
    symbol: '🔴',
    tds: 420,
    ec: 620,
    fluoride: 0.70,
    ph: 5.90,
    scenario: 'normal',
    notes: 'pH < 6.5 corrodes piping and leaches heavy metals. Neutralization needed.'
  }
];

export const SCENARIO_OPTIONS = [
  {
    id: 'recharge',
    label: 'Monsoon Recharge',
    badge: 'Dilution (-10%)',
    factor: 0.90,
    phShift: -0.05,
    description: 'Abundant monsoon infiltration replenishes aquifer and dilutes ionic minerals.'
  },
  {
    id: 'normal',
    label: 'Normal Baseline Trend',
    badge: 'Historical (0%)',
    factor: 1.00,
    phShift: 0.0,
    description: 'Average precipitation and extraction rates reverting toward multi-year means.'
  },
  {
    id: 'stress',
    label: 'Moderate Water Stress',
    badge: 'Concentration (+8%)',
    factor: 1.08,
    phShift: 0.05,
    description: 'Below-average rainfall and heightened summer extraction accelerate ionic concentration.'
  },
  {
    id: 'drought',
    label: 'Severe Drought & Over-Draft',
    badge: 'Concentration (+18%)',
    factor: 1.18,
    phShift: 0.15,
    description: 'Deep aquifer pumping and evaporative concentration create severe mineral stress.'
  }
];

const CALIBRATED_Q80 = {
  TDS: 1.259,
  EC: 1.223,
  Fluoride: 1.364,
  pH: 1.631
};

const DISTRICT_PRIORS = {
  TDS: 312.4,
  EC: 496.8,
  Fluoride: 0.36,
  pH: 0.39
};

export function simulatePrediction({
  targetYear = 2026,
  tds = 500,
  ec = 750,
  fluoride = 1.0,
  ph = 7.4,
  scenario = 'normal',
  stationData = null
}) {
  const yr = Math.max(2022, Math.min(2035, parseInt(targetYear, 10) || 2026));
  const h = Math.max(1, yr - 2021);
  const phi = 0.70;
  const w = Math.min(1.0, 0.15 * h);

  const scen = SCENARIO_OPTIONS.find(s => s.id === scenario) || SCENARIO_OPTIONS[1];
  const factor = scen.factor;
  const phShift = scen.phShift;

  const inputMap = {
    TDS: parseFloat(tds) || 500,
    EC: parseFloat(ec) || 750,
    Fluoride: parseFloat(fluoride) || 1.0,
    pH: parseFloat(ph) || 7.4
  };

  const forecast = { Year: yr };
  const trajectory = [];

  for (let tYr = 2022; tYr <= yr; tYr++) {
    const tH = Math.max(1, tYr - 2021);
    const tW = Math.min(1.0, 0.15 * tH);
    const tRec = { Year: tYr };

    ['TDS', 'EC', 'Fluoride', 'pH'].forEach(param => {
      const userVal = inputMap[param];
      let baseMean = userVal;
      let lastVal = userVal;
      let slope = 0.0;
      let shrinkage = 0.0;
      let sPooled = DISTRICT_PRIORS[param];

      if (stationData && stationData.params && stationData.params[param]) {
        const pInfo = stationData.params[param];
        baseMean = pInfo.hist_mean ?? userVal;
        lastVal = userVal;
        slope = pInfo.slope ?? 0.0;
        shrinkage = pInfo.shrinkage ?? 0.0;
        sPooled = pInfo.s_pooled ?? DISTRICT_PRIORS[param];
      }

      const sumPhi = Array.from({ length: tH }, (_, i) => Math.pow(phi, i + 1)).reduce((a, b) => a + b, 0);
      const dampedSlope = (slope * shrinkage) * sumPhi;
      const dampVal = (1.0 - tW) * (lastVal + dampedSlope) + tW * baseMean;
      let pVal = 0.5 * dampVal + 0.5 * baseMean;

      if (param === 'pH') {
        pVal = Math.min(14.0, Math.max(0.0, pVal + phShift));
      } else {
        pVal = Math.max(0.0, pVal * factor);
      }

      const qVal = CALIBRATED_Q80[param] || 1.25;
      const sigmaH = sPooled * Math.sqrt(1.0 + 0.15 * (tH - 1));

      let lowCI, upCI;
      if (param === 'pH') {
        lowCI = Math.min(14.0, Math.max(0.0, pVal - qVal * sigmaH));
        upCI = Math.min(14.0, Math.max(0.0, pVal + qVal * sigmaH));
      } else {
        lowCI = Math.max(0.0, pVal - qVal * sigmaH);
        upCI = pVal + qVal * sigmaH;
      }

      tRec[param] = parseFloat(pVal.toFixed(2));
      tRec[`${param}_Lower_CI`] = parseFloat(lowCI.toFixed(2));
      tRec[`${param}_Upper_CI`] = parseFloat(upCI.toFixed(2));

      if (tYr === yr) {
        forecast[param] = parseFloat(pVal.toFixed(2));
        forecast[`${param}_Lower_CI`] = parseFloat(lowCI.toFixed(2));
        forecast[`${param}_Upper_CI`] = parseFloat(upCI.toFixed(2));
      }
    });

    const stepRisk = evaluateRisk(tRec);
    tRec.Risk_Level = stepRisk.level;
    tRec.Drinking_Suitability = stepRisk.drinkingSuitability;
    tRec.Water_Quality_Status = stepRisk.status;
    trajectory.push(tRec);
  }

  const finalRisk = evaluateRisk(forecast);
  forecast.Risk_Level = finalRisk.level;
  forecast.Drinking_Suitability = finalRisk.drinkingSuitability;
  forecast.Water_Quality_Status = finalRisk.status;
  forecast.Risk_Description = finalRisk.description;

  const potabilityMeta = getDrinkingSuitability(finalRisk.level, forecast);

  return {
    inputParameters: {
      targetYear: yr,
      horizon: h,
      tds: inputMap.TDS,
      ec: inputMap.EC,
      fluoride: inputMap.Fluoride,
      ph: inputMap.pH,
      scenario,
      scenarioMeta: scen
    },
    forecast,
    potability: potabilityMeta,
    trajectory
  };
}
