module.exports = {
  heightImperialToMetric(imperialHeight) {
    if (Array.isArray(imperialHeight) && imperialHeight.length === 2) {
      const [feet, inches] = imperialHeight;
      if (typeof feet === 'number' && typeof inches === 'number') {
        const metricHeight = Math.round(feet * 30.48 + inches * 2.54);
        return Number.isNaN(metricHeight) ? 0 : metricHeight;
      }
    }
  },
  heightMetricToImperial(metricHeight) {
    if (typeof metricHeight === 'number') {
      const totalInches = Math.round(metricHeight / 2.54);
      const inches = totalInches % 12;
      const feet = (totalInches - inches) / 12;
      return [feet, inches];
    }
  },
  weightImperialWithOzToMetric(imperialWeight) {
    if (Array.isArray(imperialWeight) && imperialWeight.length === 2) {
      const [lbs, ozs] = imperialWeight;
      if (typeof lbs === 'number' && typeof ozs === 'number') {
        const metricWeight = Math.round(lbs * 453.59237 + ozs * 28.349523125);
        return Number.isNaN(metricWeight) ? 0 : metricWeight;
      }
    }
  },
  weightMetricToImperialWithOz(metricWeight) {
    if (typeof metricWeight === 'number') {
      const totalOzs = Math.round(metricWeight / 28.349523125);
      const ozs = totalOzs % 16;
      const lbs = (totalOzs - ozs) / 16;
      return [lbs, ozs];
    }
  },
  weightImperialToMetric(imperialWeight) {
    if (typeof imperialWeight === 'number') {
      return (imperialWeight * 1000) / 2.2046226218; // note: now storing in grams
    }
  },
  weightMetricToImperial(metricWeight) {
    if (typeof metricWeight === 'number') {
      return Math.round((metricWeight * 2.2046226218) / 1000);
    }
  },
};
