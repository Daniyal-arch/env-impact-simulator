import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Info, TrendingUp, AlertTriangle, Shield, Leaf, Flame } from 'lucide-react';
import ForestMap from '../components/maps/ForestMap';
const NLPSimulate = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(null);

  const sampleQueries = [
    "Show me Brazil's historical forest loss from 2001 to 2024",
    "What is Pakistan's tree cover loss statistics?",
    "Display Indonesia's deforestation data and CO2 emissions",
  ];

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('http://localhost:8000/nl/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      });

      const result = await response.json();
      if (result.status === 'success' && result.simulation_result) {
        setData(result.simulation_result);
      } else {
        setError(result.error || 'Failed to process your query.');
      }
    } catch (err) {
      setError('Cannot connect to backend. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  };

  const getHistoricalData = () => {
    if (!data?.combined_timeseries) return [];
    return data.combined_timeseries
      .filter(item => item.type === 'observed')
      .map(item => ({
        year: item.year,
        loss_ha: item.loss_ha,
        loss_mha: item.loss_ha / 1000000
      }));
  };

  const getTotalHistoricalLoss = () => {
    const historical = getHistoricalData();
    return historical.reduce((sum, item) => sum + item.loss_ha, 0);
  };

  const getEmissionsData = () => {
    if (!data) return null;
    const totalLoss = getTotalHistoricalLoss();
    const emissionsPerHa = data.baseline_emissions_Mg_CO2e / data.forest_area_ha;
    return totalLoss * emissionsPerHa;
  };

  const getTopLossYears = () => {
    const historical = getHistoricalData();
    return historical.sort((a, b) => b.loss_ha - a.loss_ha).slice(0, 5);
  };

  const getProtectedAreasData = () => {
    if (!data?.protected_areas?.categories) return [];
    return data.protected_areas.categories.slice(0, 6);
  };

  const getTrendAnalysis = () => {
    const historical = getHistoricalData();
    if (historical.length < 5) return null;
    
    const recent5 = historical.slice(-5);
    const avgRecent = recent5.reduce((sum, y) => sum + y.loss_ha, 0) / 5;
    const first5 = historical.slice(0, 5);
    const avgFirst = first5.reduce((sum, y) => sum + y.loss_ha, 0) / 5;
    
    const change = ((avgRecent - avgFirst) / avgFirst) * 100;
    return {
      trend: change > 0 ? 'increasing' : 'decreasing',
      percentChange: Math.abs(change).toFixed(1),
      avgRecent: avgRecent,
      avgFirst: avgFirst
    };
  };

  const COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6', '#ec4899'];

  const InfoTooltip = ({ text }) => (
    <div className="group relative inline-block">
      <Info className="w-4 h-4 text-gray-400 hover:text-blue-600 cursor-help" />
      <div className="invisible group-hover:visible absolute z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg -top-2 left-6">
        {text}
        <div className="absolute top-3 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
      </div>
    </div>
  );

  const IUCN_CATEGORIES = {
    'Ia': 'Strict Nature Reserve',
    'Ib': 'Wilderness Area',
    'II': 'National Park',
    'III': 'Natural Monument',
    'IV': 'Habitat Management',
    'V': 'Protected Landscape',
    'VI': 'Sustainable Use',
    'Not Reported': 'Unclassified'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Fetching comprehensive forest data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Ask about forest loss... (e.g., 'Show Brazil forest loss data')"
              className="flex-1 px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              disabled={loading}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          
          {!data && !loading && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Try:</span>
              {sampleQueries.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(sample)}
                  className="px-3 py-1 bg-gray-100 hover:bg-green-50 text-gray-700 hover:text-green-700 rounded text-sm"
                >
                  {sample}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
            <button onClick={handleSubmit} className="ml-auto px-4 py-2 bg-red-600 text-white rounded">
              Retry
            </button>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="max-w-full">
          {/* Hero Header */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-8 px-6">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-4xl font-bold mb-3">{data.country}</h1>
              <p className="text-lg text-green-50">
                As of 2020, {data.country} had <strong>{(data.forest_area_ha / 1000000).toFixed(1)} Mha</strong> of natural forest, 
                covering <strong>{((data.forest_area_ha / data.total_area_ha) * 100).toFixed(0)}%</strong> of its land area. 
                From {data.analysis_period?.historical_years}, the country lost{' '}
                <strong>{(getTotalHistoricalLoss() / 1000000).toFixed(2)} Mha</strong> of tree cover.
              </p>
            </div>
          </div>

          <div className="max-w-full px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-6">
                
                {/* Enhanced Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <Leaf className="w-5 h-5 text-green-600" />
                      <InfoTooltip text="Total forest area based on ≥30% tree canopy density from satellite imagery" />
                    </div>
                    <div className="text-xs text-gray-600 mb-1">Total Forest Area</div>
                    <div className="text-2xl font-bold text-green-700">
                      {(data.forest_area_ha / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-gray-500">hectares</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="w-5 h-5 text-red-600" />
                      <InfoTooltip text="Total tree cover loss from 2001-2024 detected by satellite monitoring" />
                    </div>
                    <div className="text-xs text-gray-600 mb-1">Tree Cover Loss</div>
                    <div className="text-2xl font-bold text-red-700">
                      {(getTotalHistoricalLoss() / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-gray-500">hectares lost</div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <Leaf className="w-5 h-5 text-green-600" />
                      <InfoTooltip text="Tree cover gain represents new forest growth from 2000-2020 (may include plantations)" />
                    </div>
                    <div className="text-xs text-gray-600 mb-1">Tree Cover Gain</div>
                    <div className="text-2xl font-bold text-green-700">
                      {data.tree_cover_gain?.status === 'success' 
                        ? (data.tree_cover_gain.total_gain_ha / 1000000).toFixed(2)
                        : '0.00'}M
                    </div>
                    <div className="text-xs text-gray-500">ha (2000-2020)</div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <Flame className="w-5 h-5 text-orange-600" />
                      <InfoTooltip text="Fire alerts detected by NASA VIIRS satellites since 2020, indicating potential forest fires" />
                    </div>
                    <div className="text-xs text-gray-600 mb-1">Fire Alerts</div>
                    <div className="text-2xl font-bold text-orange-700">
                      {data.fire_alerts?.status === 'success' 
                        ? (data.fire_alerts.total_alerts / 1000).toFixed(0)
                        : '0'}K
                    </div>
                    <div className="text-xs text-gray-500">since 2020</div>
                  </div>
                </div>

                {/* Trend Analysis Card - NEW! */}
                {getTrendAnalysis() && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg shadow-md border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-700 uppercase">Deforestation Trend Analysis</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-600">First 5 Years Avg</div>
                        <div className="text-lg font-bold text-gray-800">
                          {(getTrendAnalysis().avgFirst / 1000000).toFixed(2)} Mha/yr
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Recent 5 Years Avg</div>
                        <div className="text-lg font-bold text-gray-800">
                          {(getTrendAnalysis().avgRecent / 1000000).toFixed(2)} Mha/yr
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Change</div>
                        <div className={`text-lg font-bold ${getTrendAnalysis().trend === 'increasing' ? 'text-red-600' : 'text-green-600'}`}>
                          {getTrendAnalysis().trend === 'increasing' ? '↑' : '↓'} {getTrendAnalysis().percentChange}%
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Deforestation is <strong>{getTrendAnalysis().trend}</strong> compared to historical baseline
                    </p>
                  </div>
                )}

                {/* Historical Loss Chart */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Tree Cover Loss Over Time
                      </h3>
                      <p className="text-sm text-gray-600 mt-2">
                        From {data.analysis_period?.historical_years}, {data.country} lost{' '}
                        <strong>{(getTotalHistoricalLoss() / 1000000).toFixed(2)} Mha</strong> of tree cover, 
                        equivalent to <strong>{(getEmissionsData() / 1000000000).toFixed(2)} Gt</strong> of CO₂ emissions.
                      </p>
                    </div>
                    <InfoTooltip text="Annual tree cover loss detected through satellite imagery analysis (GLAD/UMD)" />
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={getHistoricalData()}>
                      <defs>
                        <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis label={{ value: 'Loss (Mha)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value) => `${value.toFixed(3)} Mha`}
                        labelFormatter={(label) => `Year: ${label}`}
                      />
                      <Area type="monotone" dataKey="loss_mha" stroke="#22c55e" fillOpacity={1} fill="url(#lossGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Top 5 Years */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Top 5 Years with Highest Loss
                    </h3>
                    <InfoTooltip text="Years with the most severe deforestation, often linked to policy changes, fires, or economic factors" />
                  </div>
                  <div className="space-y-3">
                    {getTopLossYears().map((item, idx) => (
                      <div key={item.year} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                          }`}>
                            {idx + 1}
                          </div>
                          <span className="font-semibold text-gray-800">{item.year}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-600">{(item.loss_mha).toFixed(3)} Mha</div>
                          <div className="text-xs text-gray-500">{item.loss_ha.toLocaleString()} ha</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Protected Areas - Enhanced */}
                {data.protected_areas?.status === 'success' && (
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          Protected Areas (IUCN Classification)
                        </h3>
                      </div>
                      <InfoTooltip text="IUCN categories classify protected areas by conservation goals: from strict reserves (Ia) to sustainable use areas (VI)" />
                    </div>
                    <div className="space-y-2">
                      {getProtectedAreasData().map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                            <div>
                              <span className="text-sm font-medium">Category {item.category}</span>
                              <div className="text-xs text-gray-500">{IUCN_CATEGORIES[item.category] || 'Protected Area'}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{item.count} areas</div>
                            <div className="text-xs text-gray-500">{(item.area_ha / 1000000).toFixed(2)} Mha</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                      <div className="text-sm font-semibold text-blue-900">
                        Total Protected: {(data.protected_areas.total_protected_ha / 1000000).toFixed(2)} Mha 
                        ({((data.protected_areas.total_protected_ha / data.total_area_ha) * 100).toFixed(1)}% of country)
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Forest */}
                {data.primary_forest?.status === 'success' && (
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Primary Forest Extent
                      </h3>
                      <InfoTooltip text="Old-growth forests with ≥75% canopy density, containing high biodiversity and carbon storage" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-sm text-gray-600">Primary Forest</div>
                        <div className="text-3xl font-bold text-green-700 my-2">
                          {(data.primary_forest.primary_forest_ha / 1000000).toFixed(2)} Mha
                        </div>
                        <div className="text-xs text-gray-500">{data.primary_forest.threshold}</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-gray-600">% of Total Forest</div>
                        <div className="text-3xl font-bold text-blue-700 my-2">
                          {((data.primary_forest.primary_forest_ha / data.forest_area_ha) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">High conservation value</div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-5">
                <div className="sticky top-24 space-y-6">
                 // filepath: f:\enviro\frontend\src\pages\NLPSimulate.jsx
// ...existing code...
{/* Map Component */}
<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
    Geographic Overview
  </h3>
  <div className="h-96 rounded-lg">
    {data.geometry ? (
      <ForestMap
        countryIso={data.country_iso}
        year={2024}
        geometry={data.geometry}
      />
    ) : (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="font-semibold text-gray-700">{data.country}</p>
          <p className="text-sm text-gray-600 mt-2">ISO: {data.country_iso}</p>
        </div>
      </div>
    )}
  </div>
</div>


                  {/* Data Sources */}
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg shadow-md border border-green-200">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                      Data Sources & Quality
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-green-200">
                        <span className="text-gray-600">Provider:</span>
                        <span className="font-semibold">Global Forest Watch</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-green-200">
                        <span className="text-gray-600">Primary Dataset:</span>
                        <span className="font-semibold">UMD Tree Cover Loss</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-green-200">
                        <span className="text-gray-600">Analysis Period:</span>
                        <span className="font-semibold">{data.analysis_period?.historical_years}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Total Datasets:</span>
                        <span className="font-semibold">{data.datasets_included?.length || 0}</span>
                      </div>
                    </div>
                    
                    {data.data_quality && (
                      <div className="mt-4 p-3 bg-white rounded border-l-4 border-green-500">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Data Quality Status:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(data.data_quality).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${value === 'success' ? 'bg-green-500' : value === 'partial' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
                              <span className="capitalize">{key.replace('_', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-6">📊</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Comprehensive Forest Analysis
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Get detailed insights into forest loss, tree cover gain, fire alerts, protected areas, 
              and CO₂ emissions from any country using Global Forest Watch data (2001-2024).
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="p-4 bg-green-50 rounded-lg">
                <Leaf className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-sm font-medium">Tree Cover</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <Flame className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-sm font-medium">Fire Alerts</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-sm font-medium">Protected Areas</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <div className="text-sm font-medium">Deforestation</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NLPSimulate;