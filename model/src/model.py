import numpy as np
import pandas as pd
import joblib
from pathlib import Path

class AdaptiveEnsembleForecaster:
    """
    Adaptive Ensemble Groundwater Quality Forecaster
    
    Architecture:
      y_hat_ens = 0.5 * y_hat_damped + 0.5 * y_bar
      
      Where:
        - y_bar: Historical baseline station mean
        - y_hat_damped: Non-linear damped trend reverting toward historical mean
          y_hat_damped = (1 - w) * (y_last + damped_slope) + w * y_bar
          damped_slope = (slope * shrinkage) * sum_{i=1}^h phi^i  (phi=0.70)
          shrinkage = t_stat^2 / (t_stat^2 + 2.0)  [Empirical Bayes regularization]
          w = min(1.0, 0.15 * h)
          h = Year - Origin_Cutoff
          
      Uncertainty Intervals:
        sigma_h = s_pooled * sqrt(1 + 0.15 * (h - 1))
        Interval = [max(0, y_hat - q_80 * sigma_h), y_hat + q_80 * sigma_h]
        (pH is strictly bounded within the [0, 14] Sorensen scale).
    """
    def __init__(self, key_cols=None, phi=0.70, origin_year=2021):
        self.key_cols = key_cols or ['TDS', 'EC', 'Fluoride', 'pH']
        self.phi = phi
        self.origin_year = origin_year
        self.is_fitted = False
        
        # Fitted parameters
        self.stations_ = {}
        self.taluk_priors_ = {}
        self.district_priors_ = {}
        self.calibrated_q80_ = {
            'TDS': 1.259,
            'EC': 1.223,
            'Fluoride': 1.364,
            'pH': 1.631
        }
        
    def fit(self, df_annual):
        """
        Fit station-level parameters and regional empirical Bayes priors.
        Expects aggregated annual dataframe with columns: ['Taluk', 'Village', 'Year', ...]
        """
        tr_df = df_annual[df_annual['Year'] <= self.origin_year].copy()
        
        # 1. Regional Priors per parameter
        for param in self.key_cols:
            self.taluk_priors_[param] = tr_df.groupby('Taluk')[param].std().to_dict()
            self.district_priors_[param] = float(tr_df[param].std())
            
        # 2. Station-level parameters
        self.stations_ = {}
        for (taluk, village), grp in tr_df.groupby(['Taluk', 'Village']):
            grp = grp.sort_values('Year')
            n_years = len(grp)
            last_yr = int(grp['Year'].iloc[-1])
            sample_cnt = int(grp['Sample_Count'].iloc[-1]) if 'Sample_Count' in grp.columns else 1
            
            station_params = {
                'Taluk': taluk,
                'Village': village,
                'n_years': n_years,
                'last_year': last_yr,
                'sample_count': sample_cnt,
                'params': {}
            }
            
            for param in self.key_cols:
                y_val = grp[param].values
                years_val = grp['Year'].values
                hist_mean = float(np.mean(y_val))
                last_val = float(y_val[-1])
                hist_std = float(np.std(y_val, ddof=1)) if len(y_val) > 1 else hist_mean * 0.15
                
                s_prior = float(self.taluk_priors_[param].get(taluk, self.district_priors_[param]))
                
                if n_years >= 3:
                    X_tr = years_val - years_val.mean()
                    var_x = np.sum(X_tr**2)
                    slope = float(np.sum(X_tr * (y_val - hist_mean)) / var_x if var_x > 0 else 0.0)
                    resids = y_val - (hist_mean + slope * X_tr)
                    s_local = float(np.std(resids, ddof=1) if len(y_val) > 2 else np.std(y_val, ddof=1))
                    s_pooled = float(np.sqrt((n_years * (s_local**2) + 3.0 * (s_prior**2)) / (n_years + 3.0)))
                    se_slope = s_pooled / np.sqrt(var_x) if var_x > 0 else 1e9
                    t_stat = abs(slope / se_slope) if se_slope > 0 else 0.0
                    shrinkage = float((t_stat**2) / (t_stat**2 + 2.0))
                else:
                    slope = 0.0
                    s_pooled = s_prior
                    shrinkage = 0.0
                    
                station_params['params'][param] = {
                    'hist_mean': hist_mean,
                    'last_val': last_val,
                    'slope': slope,
                    'shrinkage': shrinkage,
                    's_pooled': s_pooled
                }
                
            self.stations_[(taluk.lower(), village.lower())] = station_params
            
        self.is_fitted = True
        return self

    def set_calibration_quantiles(self, q_dict):
        """Set empirically calibrated finite-sample quantiles."""
        self.calibrated_q80_.update(q_dict)

    def predict_station(self, taluk, village, year):
        """
        Generate point forecast and uncertainty intervals for a specific station and year.
        """
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before calling predict.")
            
        key = (taluk.lower(), village.lower())
        if key not in self.stations_:
            # Search by village name alone if taluk doesn't match
            matches = [k for k in self.stations_ if k[1] == village.lower()]
            if matches:
                key = matches[0]
            else:
                raise KeyError(f"Station '{village}' ({taluk}) not found in trained stations.")
                
        st = self.stations_[key]
        h = max(1, year - self.origin_year)
        elapsed = year - st['last_year']
        
        results = {
            'Taluk': st['Taluk'],
            'Village': st['Village'],
            'Year': year,
            'Horizon': h,
            'Elapsed_Years': elapsed,
            'Historical_Observations': st['n_years'],
            'Last_Observed_Year': st['last_year']
        }
        
        for param in self.key_cols:
            p_info = st['params'][param]
            hist_mean = p_info['hist_mean']
            last_val = p_info['last_val']
            slope = p_info['slope']
            shrinkage = p_info['shrinkage']
            s_pooled = p_info['s_pooled']
            q_val = self.calibrated_q80_.get(param, 1.25)
            
            damped_slope = (slope * shrinkage) * sum([self.phi**i for i in range(1, int(h)+1)])
            w = min(1.0, 0.15 * h)
            damp_val = (1.0 - w) * (last_val + damped_slope) + w * hist_mean
            p_val = 0.5 * damp_val + 0.5 * hist_mean
            
            if param == 'pH':
                p_val = np.clip(p_val, 0.0, 14.0)
            else:
                p_val = np.maximum(0.0, p_val)
                
            sigma_h = s_pooled * np.sqrt(1.0 + 0.15 * (h - 1))
            if param == 'pH':
                lower_ci = np.clip(p_val - q_val * sigma_h, 0.0, 14.0)
                upper_ci = np.clip(p_val + q_val * sigma_h, 0.0, 14.0)
            else:
                lower_ci = np.maximum(0.0, p_val - q_val * sigma_h)
                upper_ci = p_val + q_val * sigma_h
                
            results[param] = round(float(p_val), 2)
            results[f'{param}_Lower_CI'] = round(float(lower_ci), 2)
            results[f'{param}_Upper_CI'] = round(float(upper_ci), 2)
            
        # Regulatory Risk Classification
        risk_info = self.assess_risk(results)
        results.update(risk_info)
        return results

    def predict_all(self, years=range(2022, 2031)):
        """Generate forecasts across all trained stations for specified years."""
        records = []
        for (taluk, village), st in self.stations_.items():
            for yr in years:
                pred = self.predict_station(st['Taluk'], st['Village'], yr)
                records.append(pred)
        return pd.DataFrame(records)

    @staticmethod
    def assess_risk(row):
        """
        Evaluate regulatory drinking water compliance under BIS 10500:2012
        and salinity under CPCB / FAO guidelines.
        """
        tds, tds_up = row['TDS'], row['TDS_Upper_CI']
        f, f_up = row['Fluoride'], row['Fluoride_Upper_CI']
        ph, ph_low, ph_up = row['pH'], row['pH_Lower_CI'], row['pH_Upper_CI']
        ec, ec_up = row['EC'], row['EC_Upper_CI']
        
        # 1. Confirmed Forecast Exceedance (High Risk)
        confirmed = []
        if f > 1.5: confirmed.append(f"Fluoride High ({f:.2f} mg/L > 1.5 BIS Limit - Fluorosis Hazard)")
        if tds > 2000.0: confirmed.append(f"TDS High ({tds:.1f} mg/L > 2000 BIS Limit - Severe Salinity)")
        if ph < 6.5 or ph > 8.5: confirmed.append(f"pH Non-compliant ({ph:.2f} outside 6.5-8.5 BIS Specification)")
        if ec > 2250.0: confirmed.append(f"EC High ({ec:.1f} µS/cm > 2250 CPCB Salinity Guide)")
        if confirmed:
            return {
                'Water_Quality_Status': 'Non-Compliant (Forecasted Exceedance)',
                'Risk_Level': 'High Risk',
                'Risk_Description': '; '.join(confirmed)
            }
            
        # 2. Borderline Potential Exceedance via Uncertainty Bounds (Medium Risk - Borderline)
        borderline = []
        if f_up > 1.5: borderline.append(f"Permissible Fluoride ({f:.2f} mg/L), but Upper CI ({f_up:.2f} mg/L) breaches 1.5 limit")
        if tds_up > 2000.0: borderline.append(f"Permissible TDS ({tds:.1f} mg/L), but Upper CI ({tds_up:.1f} mg/L) breaches 2000 limit")
        if ph_low < 6.5: borderline.append(f"Compliant pH ({ph:.2f}), but Lower CI ({ph_low:.2f}) drops below 6.5 (corrosion risk)")
        if ph_up > 8.5: borderline.append(f"Compliant pH ({ph:.2f}), but Upper CI ({ph_up:.2f}) exceeds 8.5 (scaling risk)")
        if ec_up > 2250.0: borderline.append(f"Permissible EC ({ec:.1f} µS/cm), but Upper CI ({ec_up:.1f} µS/cm) crosses 2250 CPCB guide")
        if borderline:
            return {
                'Water_Quality_Status': 'Conditionally Permissible (Potential Exceedance)',
                'Risk_Level': 'Medium Risk (Borderline)',
                'Risk_Description': '; '.join(borderline)
            }
            
        # 3. Strict Desirable Quality (Low Risk)
        if (tds <= 500.0 and tds_up <= 500.0 and
            f <= 1.0 and f_up <= 1.0 and
            ec <= 750.0 and ec_up <= 750.0 and
            ph >= 6.5 and ph_low >= 6.5 and ph <= 8.5 and ph_up <= 8.5):
            return {
                'Water_Quality_Status': 'Desirable Quality (Meets Selected BIS Acceptable Limits)',
                'Risk_Level': 'Low Risk',
                'Risk_Description': 'Point forecast and nominal 80% intervals strictly comply with desirable limits'
            }
            
        # 4. Standard Permissible Relaxation Zone
        perm = []
        if tds > 500.0 or tds_up > 500.0: perm.append(f"TDS in Permissible Range (Point: {tds:.1f}, Upper CI: {tds_up:.1f} mg/L)")
        if f > 1.0 or f_up > 1.0: perm.append(f"Fluoride in Permissible Range (Point: {f:.2f}, Upper CI: {f_up:.2f} mg/L)")
        if ec > 750.0 or ec_up > 750.0: perm.append(f"EC in Permissible Range (Point: {ec:.1f}, Upper CI: {ec_up:.1f} µS/cm)")
        return {
            'Water_Quality_Status': 'Permissible Quality (In Absence of Alternate Source)',
            'Risk_Level': 'Medium Risk (Permissible)',
            'Risk_Description': '; '.join(perm) if perm else "Within permissible relaxation limits"
        }

    def save(self, filepath):
        """Serialize and save model to disk."""
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, filepath)
        print(f"Model successfully saved to: {filepath}")

    @classmethod
    def load(cls, filepath):
        """Load trained model from disk."""
        model = joblib.load(filepath)
        print(f"Model successfully loaded from: {filepath}")
        return model
