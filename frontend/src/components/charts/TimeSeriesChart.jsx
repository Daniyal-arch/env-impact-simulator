import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TimeSeriesChart = ({ data, title }) => {
  // Transform the combined_timeseries data for Recharts
  const chartData = data?.combined_timeseries?.map(item => ({
    year: item.year,
    loss: item.loss_ha,
    type: item.type
  })) || [];

  // Separate observed and projected data
  const observedData = chartData.filter(d => d.type === 'observed');
  const projectedUserData = chartData.filter(d => d.type === 'projected_user_scenario');
  const projectedTrendData = data?.projections?.trend_based?.timeline?.map(item => ({
    year: item.year,
    loss: item.loss_ha
  })) || [];

  // Combine all years for consistent x-axis
  const allData = chartData.reduce((acc, item) => {
    const existing = acc.find(d => d.year === item.year);
    if (existing) {
      if (item.type === 'observed') existing.observed = item.loss;
      if (item.type === 'projected_user_scenario') existing.userScenario = item.loss;
    } else {
      acc.push({
        year: item.year,
        observed: item.type === 'observed' ? item.loss : null,
        userScenario: item.type === 'projected_user_scenario' ? item.loss : null,
        trendBased: null
      });
    }
    return acc;
  }, []);

  // Add trend-based projections
  projectedTrendData.forEach(item => {
    const existing = allData.find(d => d.year === item.year);
    if (existing) {
      existing.trendBased = item.loss;
    } else {
      allData.push({
        year: item.year,
        observed: null,
        userScenario: null,
        trendBased: item.loss
      });
    }
  });

  allData.sort((a, b) => a.year - b.year);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">{title || 'Forest Loss Over Time'}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={allData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="year" 
            label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            label={{ value: 'Forest Loss (hectares)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value) => value ? `${value.toFixed(0)} ha` : 'N/A'}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="observed" 
            stroke="#2563eb" 
            strokeWidth={2}
            name="Historical (Observed)"
            connectNulls
          />
          <Line 
            type="monotone" 
            dataKey="userScenario" 
            stroke="#dc2626" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="User Scenario"
            connectNulls
          />
          <Line 
            type="monotone" 
            dataKey="trendBased" 
            stroke="#16a34a" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Trend-Based Projection"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimeSeriesChart;