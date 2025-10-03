import React from 'react';
import { formatHectares, formatCO2, formatNumber } from '../../utils/formatters';

const ScenarioSummary = ({ data }) => {
  if (!data) return null;

  const stats = [
    {
      label: 'Country',
      value: data.country,
      icon: '🌍'
    },
    {
      label: 'Total Area',
      value: formatHectares(data.total_area_ha),
      icon: '📏'
    },
    {
      label: 'Forest Area',
      value: formatHectares(data.forest_area_ha),
      icon: '🌲'
    },
    {
      label: 'Baseline Emissions',
      value: formatCO2(data.baseline_emissions_Mg_CO2e * 1000),
      icon: '💨'
    }
  ];

  const projectionStats = data.projections ? [
    {
      label: 'User Scenario Loss',
      value: formatHectares(data.projections.user_scenario.total_loss_ha),
      color: 'text-red-600'
    },
    {
      label: 'Trend-Based Loss',
      value: formatHectares(data.projections.trend_based.total_loss_ha),
      color: 'text-green-600'
    },
    {
      label: 'Scenario Realism',
      value: data.comparison?.scenario_realism || 'N/A',
      color: 'text-blue-600'
    },
    {
      label: 'Multiplier',
      value: `${data.comparison?.user_vs_trend_multiplier}x`,
      color: 'text-orange-600'
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Country Overview */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Country Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
              <div className="text-lg font-semibold mt-1">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Projection Summary */}
      {data.projections && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Projection Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {projectionStats.map((stat, idx) => (
              <div key={idx} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{stat.label}</div>
                <div className={`text-lg font-semibold mt-1 ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500">
            <p className="text-sm text-gray-700">
              <strong>Context:</strong> {data.comparison?.context}
            </p>
          </div>
        </div>
      )}

      {/* Analysis Period */}
      {data.analysis_period && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Historical Data: {data.analysis_period.historical_years}</span>
            <span>Target Year: {data.analysis_period.projection_target_year}</span>
            <span>Years Projected: {data.analysis_period.years_projected}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioSummary;