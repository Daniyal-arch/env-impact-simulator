import React, { useState } from 'react';
import simulationService from '../services/simulationService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import TimeSeriesMap from '../components/maps/TimeSeriesMap';

const TimeSeries = () => {
  const [country, setCountry] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!country.trim()) {
      setError('Please enter a country name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Run a basic simulation to get historical data
      const result = await simulationService.runSimulation({
        country: country,
        forest_loss_percent: 5, // Default value for getting historical data
        target_year: 2030
      });
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Time Series Forest Loss Maps
      </h1>

      {/* Country Selection Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g., Brazil, Pakistan, Indonesia"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>
          <div className="self-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-forest-600 text-white px-6 py-2 rounded-md hover:bg-forest-700 disabled:opacity-50"
            >
              Load Maps
            </button>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {loading && <LoadingSpinner message="Loading forest data..." />}

      {/* Error State */}
      {error && <ErrorMessage error={error} onRetry={() => setError(null)} />}

      {/* Time Series Map */}
      {data && <TimeSeriesMap data={data} />}

      {/* Instructions */}
      {!data && !loading && !error && (
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">How to Use</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Enter a country name to view historical forest loss data</li>
            <li>Use the year slider or buttons to navigate through different years</li>
            <li>Red areas on the map indicate forest loss</li>
            <li>View loss statistics for each selected year</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TimeSeries;