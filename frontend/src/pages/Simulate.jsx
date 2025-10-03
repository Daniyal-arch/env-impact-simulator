import React, { useState } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import simulationService from '../services/simulationService';
import TimeSeriesChart from '../components/charts/TimeSeriesChart';
import ComparisonChart from '../components/charts/ComparisonChart';
import ScenarioSummary from '../components/results/ScenarioSummary';

const Simulate = () => {
  const [formData, setFormData] = useState({
    country: '',
    forest_loss_percent: 10,
    target_year: 2030
  });
  const [nlQuery, setNlQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('structured');

  const handleStructuredSubmit = async (e) => {
    e.preventDefault();
    if (!formData.country.trim()) {
      setError('Please enter a country name');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await simulationService.runSimulation(formData);
      setResults(result);
    } catch (err) {
      setError(err.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNLSubmit = async (e) => {
    e.preventDefault();
    if (!nlQuery.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await simulationService.runNLSimulation(nlQuery);
      if (result.status === 'success') {
        setResults(result.simulation_result);
      } else {
        setError(result.error || 'Natural language processing failed');
      }
    } catch (err) {
      setError(err.message || 'Natural language simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'forest_loss_percent' || name === 'target_year' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Forest Loss Simulation</h1>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('structured')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'structured'
                ? 'border-forest-500 text-forest-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Structured Form
          </button>
          <button
            onClick={() => setActiveTab('natural')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'natural'
                ? 'border-forest-500 text-forest-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Natural Language
          </button>
        </nav>
      </div>

      {/* Structured Form */}
      {activeTab === 'structured' && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <form onSubmit={handleStructuredSubmit}>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="e.g., Brazil, Pakistan, UK"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forest Loss Percentage
                </label>
                <input
                  type="number"
                  name="forest_loss_percent"
                  value={formData.forest_loss_percent}
                  onChange={handleInputChange}
                  min="0.1"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Year
                </label>
                <input
                  type="number"
                  name="target_year"
                  value={formData.target_year}
                  onChange={handleInputChange}
                  min="2025"
                  max="2050"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="mt-6 bg-forest-600 text-white px-6 py-2 rounded-md hover:bg-forest-700 disabled:opacity-50"
            >
              Run Simulation
            </button>
          </form>
        </div>
      )}

      {/* Natural Language Form */}
      {activeTab === 'natural' && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <form onSubmit={handleNLSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your scenario
              </label>
              <textarea
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                placeholder="e.g., What if Brazil loses 10% of its forest by 2030?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
              <p className="text-sm text-gray-500 mt-2">
                Examples: "UK 5% deforestation in 3 years", "Indonesia loses 15% forest by 2028"
              </p>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-forest-600 text-white px-6 py-2 rounded-md hover:bg-forest-700 disabled:opacity-50"
            >
              Process Query
            </button>
          </form>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <LoadingSpinner message="Running simulation... This may take up to 2 minutes." />
      )}

      {/* Error State */}
      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={() => {
            setError(null);
            setResults(null);
          }} 
        />
      )}

      {/* Results with Charts */}
      {results && (
        <div className="space-y-6">
          <ScenarioSummary data={results} />
          <TimeSeriesChart data={results} title="Forest Loss Time Series Analysis" />
          <ComparisonChart data={results} />
        </div>
      )}
    </div>
  );
};

export default Simulate;