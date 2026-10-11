import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function DisclaimerBanner({ text }) {
  const defaultText = "Forecast-Based Groundwater Quality Screening Notice: Model estimates and prediction intervals provide decision-support screening for environmental research, not certified drinking-water safety approval. Potability requires verified laboratory chemical and bacteriological testing.";

  return (
    <div className="disclaimer-banner">
      <AlertCircle size={18} style={{ color: 'var(--accent-secondary)', flexShrink: 0, marginTop: '1px' }} />
      <div>{text || defaultText}</div>
    </div>
  );
}
