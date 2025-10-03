import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ComparisonChart = ({ data }) => {
  if (!data?.projections) return null;

  const chartData = [
    {
      name: 'User Scenario',
      totalLoss: data.projections.user_scenario.total_loss_ha,
      avgAnnual: data.projections.user_scenario.avg_annual_loss_ha,
      co2: data.projections.user_scenario.total_co2_tons
    },
    {
      name: 'Trend-Based',
      totalLoss: data.projections.trend_based.total_loss_ha,
      avgAnnual: data.projections.trend_based.avg_annual_loss_ha,
      co2: data.projections.trend_based.total_co2_tons
    }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">Projection Comparison</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'co2') return `${(value / 1000).toFixed(1)}K tons CO₂`;
              return `${(value / 1000).toFixed(1)}K ha`;
            }}
          />
          <Legend />
          <Bar dataKey="totalLoss" fill="#dc2626" name="Total Loss (ha)" />
          <Bar dataKey="avgAnnual" fill="#f59e0b" name="Avg Annual Loss (ha)" />
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-700">
          <strong>Analysis:</strong> Your scenario projects{' '}
          <span className="font-semibold text-red-600">
            {data.comparison?.user_vs_trend_multiplier}x
          </span>{' '}
          more forest loss than the historical trend suggests.
          This is classified as{' '}
          <span className="font-semibold">
            {data.comparison?.scenario_realism}
          </span>.
        </p>
      </div>
    </div>
  );
};

export default ComparisonChart;