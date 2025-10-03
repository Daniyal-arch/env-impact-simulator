export const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US').format(Math.round(num));
};

export const formatPercentage = (num, decimals = 1) => {
  if (num === null || num === undefined) return 'N/A';
  return `${num.toFixed(decimals)}%`;
};

export const formatHectares = (hectares) => {
  if (hectares === null || hectares === undefined) return 'N/A';
  
  if (hectares >= 1000000) {
    return `${(hectares / 1000000).toFixed(1)}M ha`;
  } else if (hectares >= 1000) {
    return `${(hectares / 1000).toFixed(1)}K ha`;
  }
  return `${Math.round(hectares)} ha`;
};

export const formatCO2 = (co2Tons) => {
  if (co2Tons === null || co2Tons === undefined) return 'N/A';
  
  if (co2Tons >= 1000000) {
    return `${(co2Tons / 1000000).toFixed(1)}M tons CO₂`;
  } else if (co2Tons >= 1000) {
    return `${(co2Tons / 1000).toFixed(1)}K tons CO₂`;
  }
  return `${Math.round(co2Tons)} tons CO₂`;
};