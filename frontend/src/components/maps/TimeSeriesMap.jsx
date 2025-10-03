import React, { useState } from 'react';
import ForestMap from './ForestMap';

const TimeSeriesMap = ({ data }) => {
  const [selectedYear, setSelectedYear] = useState(2024);

  if (!data?.combined_timeseries) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-500">No historical data available for map visualization</p>
      </div>
    );
  }

  // Get available years from historical data
  const historicalYears = data.combined_timeseries
    .filter(item => item.type === 'observed')
    .map(item => item.year)
    .sort((a, b) => b - a); // Most recent first

  const selectedData = data.combined_timeseries.find(item => item.year === selectedYear);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">Historical Forest Loss Map</h3>
      
      {/* Year Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Year: {selectedYear}
        </label>
        <input
          type="range"
          min={Math.min(...historicalYears)}
          max={Math.max(...historicalYears)}
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{Math.min(...historicalYears)}</span>
          <span>{Math.max(...historicalYears)}</span>
        </div>
      </div>

      {/* Year Grid - Quick Selection */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {historicalYears.slice(0, 12).map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-3 py-2 text-sm rounded ${
              selectedYear === year
                ? 'bg-forest-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Loss Statistics for Selected Year */}
      {selectedData && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {selectedData.year}
              </div>
              <div className="text-sm text-gray-600">Year</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {(selectedData.loss_ha / 1000).toFixed(1)}K
              </div>
              <div className="text-sm text-gray-600">Hectares Lost</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">
                {selectedData.type === 'observed' ? 'Historical' : 'Projected'}
              </div>
              <div className="text-sm text-gray-600">Data Type</div>
            </div>
          </div>
        </div>
      )}

      {/* Map Display */}
      <ForestMap 
        countryIso={data.country_iso}
        year={selectedYear}
        geometry={data.geometry}
      />

      {/* Info Note */}
      <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-sm">
        <p className="text-gray-700">
          <strong>Note:</strong> This map shows Global Forest Watch tree cover loss data. 
          Red areas indicate forest loss. The visualization is conceptual - actual geographic 
          distribution of future loss cannot be predicted with precision.
        </p>
      </div>
    </div>
  );
};

export default TimeSeriesMap;