import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Info, TrendingUp, TrendingDown, AlertTriangle, Shield, Leaf, Flame, Globe, Award, Zap, Users } from 'lucide-react';
import ForestMap from '../components/maps/ForestMap';
const NLPSimulate = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const sampleQueries = [
    "Show me Brazil's historical forest loss from 2001 to 2024",
    "What is Pakistan's tree cover loss statistics?",
    "Display Indonesia's deforestation data",
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
      setError('Cannot connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  const InfoTooltip = ({ text }) => (
    <div className="group relative inline-block">
      <Info className="w-4 h-4 text-gray-400 hover:text-blue-600 cursor-help" />
      <div className="invisible group-hover:visible absolute z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg -top-2 left-6">
        {text}
        <div className="absolute top-3 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
      </div>
    </div>
  );

  const getHistoricalData = () => {
    if (!data?.combined_timeseries) return [];
    return data.combined_timeseries
      .filter(item => item.type === 'observed')
      .map(item => ({ year: item.year, loss_ha: item.loss_ha, loss_mha: item.loss_ha / 1000000 }));
  };

  const getTotalHistoricalLoss = () => {
    const historical = getHistoricalData();
    return historical.reduce((sum, item) => sum + item.loss_ha, 0);
  };

  const getEmissionsData = () => {
    if (!data) return 0;
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
    return { trend: change > 0 ? 'increasing' : 'decreasing', percentChange: Math.abs(change).toFixed(1), avgRecent, avgFirst };
  };

  const getDeforestationRateByDecade = () => {
    const historical = getHistoricalData();
    if (historical.length < 2) return [];

    const decades = {
      '2001-2010': historical.filter(r => r.year <= 2010),
      '2011-2020': historical.filter(r => r.year > 2010 && r.year <= 2020),
      '2021-2024': historical.filter(r => r.year > 2020)
    };

    return Object.entries(decades).map(([decade, items]) => ({
      decade,
      avgRate: items.length > 0 ? (items.reduce((sum, d) => sum + d.loss_mha, 0) / items.length).toFixed(3) : 0
    }));
  };

  const getVelocityData = () => {
    const historical = getHistoricalData();
    if (historical.length < 3) return [];

    const velocityData = [];
    for (let i = 2; i < historical.length; i++) {
      const prev2 = historical[i - 2].loss_ha;
      const prev1 = historical[i - 1].loss_ha;
      const curr = historical[i].loss_ha;
      const velocity = ((curr - prev1) - (prev1 - prev2)) / 1000000;
      velocityData.push({ year: historical[i].year, velocity });
    }
    return velocityData;
  };

  const getForestHealthScores = () => {
    const totalLoss = getTotalHistoricalLoss();
    const lossRate = (totalLoss / data.forest_area_ha) * 100;
    const protectedPercent = ((data.protected_areas?.total_protected_ha || 0) / data.total_area_ha) * 100;
    const primaryPercent = ((data.primary_forest?.primary_forest_ha || 0) / data.forest_area_ha) * 100;
    const fireRisk = data.fire_alerts?.total_alerts || 0;

    const scores = {
      conservation: Math.max(0, 100 - lossRate * 5),
      protection: Math.min(100, protectedPercent * 5),
      integrity: primaryPercent,
      fireManagement: Math.max(0, 100 - (fireRisk / 10000))
    };

    const overallScore = (scores.conservation + scores.protection + scores.integrity + scores.fireManagement) / 4;
    return { scores, overallScore };
  };

  const getGrade = (score) => {
    if (score >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 60) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (score >= 40) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (score >= 20) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6', '#ec4899'];
  const IUCN_CATEGORIES = {
    'Ia': 'Strict Nature Reserve', 'Ib': 'Wilderness Area', 'II': 'National Park',
    'III': 'Natural Monument', 'IV': 'Habitat Management', 'V': 'Protected Landscape',
    'VI': 'Sustainable Use', 'Not Reported': 'Unclassified'
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
            />
            <button onClick={handleSubmit} disabled={loading || !query.trim()}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg">
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          
          {!data && !loading && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Try:</span>
              {sampleQueries.map((sample, idx) => (
                <button key={idx} onClick={() => setQuery(sample)}
                  className="px-3 py-1 bg-gray-100 hover:bg-green-50 text-gray-700 hover:text-green-700 rounded text-sm">
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
            <button onClick={handleSubmit} className="ml-auto px-4 py-2 bg-red-600 text-white rounded">Retry</button>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="max-w-full">
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
          
          {/* Tabs */}
          <div className="bg-white border-b sticky top-16 z-40">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex gap-6">
                {['overview', 'climate', 'protection', 'health'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`py-3 px-4 font-medium border-b-2 transition ${
                      activeTab === tab ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-green-600'
                    }`}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                      <Leaf className="w-5 h-5 text-green-600" />
                      <InfoTooltip text="Total forest area based on ≥30% tree canopy density" />
                    </div>
                    <div className="text-xs text-gray-600 mb-1">Total Forest Area</div>
                    <div className="text-2xl font-bold text-green-700">{(data.forest_area_ha / 1000000).toFixed(1)}M</div>
                    <div className="text-xs text-gray-500">hectares</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="w-5 h-5 text-red-600" />
                      <InfoTooltip text="Total tree cover loss from 2001-2024" />
                    </div>
                    <div className="text-xs text-gray-600 mb-1">Tree Cover Loss</div>
                    <div className="text-2xl font-bold text-red-700">{(getTotalHistoricalLoss() / 1000000).toFixed(2)}M</div>
                    <div className="text-xs text-gray-500">hectares lost</div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <Leaf className="w-5 h-5 text-green-600" />
                      <InfoTooltip text="New forest growth from 2000-2020" />
                    </div>
                    <div className="text-xs text-gray-600 mb-1">Tree Cover Gain</div>
                    <div className="text-2xl font-bold text-green-700">
                      {data.tree_cover_gain?.status === 'success' ? (data.tree_cover_gain.total_gain_ha / 1000000).toFixed(2) : '0.00'}M
                    </div>
                    <div className="text-xs text-gray-500">ha (2000-2020)</div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <Flame className="w-5 h-5 text-orange-600" />
                      <InfoTooltip text="Fire alerts detected by NASA VIIRS since 2020" />
                    </div>
                    <div className="text-xs text-gray-600 mb-1">Fire Alerts</div>
                    <div className="text-2xl font-bold text-orange-700">
                      {data.fire_alerts?.status === 'success' ? (data.fire_alerts.total_alerts / 1000).toFixed(0) : '0'}K
                    </div>
                    <div className="text-xs text-gray-500">since 2020</div>
                  </div>
                </div>

                {/* Trend Analysis */}
                {getTrendAnalysis() && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg shadow-md border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-700 uppercase">Deforestation Trend Analysis</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-600">First 5 Years Avg</div>
                        <div className="text-lg font-bold text-gray-800">{(getTrendAnalysis().avgFirst / 1000000).toFixed(2)} Mha/yr</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Recent 5 Years Avg</div>
                        <div className="text-lg font-bold text-gray-800">{(getTrendAnalysis().avgRecent / 1000000).toFixed(2)} Mha/yr</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Change</div>
                        <div className={`text-lg font-bold ${getTrendAnalysis().trend === 'increasing' ? 'text-red-600' : 'text-green-600'}`}>
                          {getTrendAnalysis().trend === 'increasing' ? '↑' : '↓'} {getTrendAnalysis().percentChange}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Historical Loss Chart */}
                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Tree Cover Loss Over Time</h3>
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
                      <Tooltip formatter={(value) => `${value.toFixed(3)} Mha`} />
                      <Area type="monotone" dataKey="loss_mha" stroke="#22c55e" fillOpacity={1} fill="url(#lossGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Top 5 Years */}
                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Top 5 Years with Highest Loss</h3>
                  <div className="space-y-3">
                    {getTopLossYears().map((item, idx) => (
                      <div key={item.year} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                          }`}>{idx + 1}</div>
                          <span className="font-semibold text-gray-800">{item.year}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-600">{item.loss_mha.toFixed(3)} Mha</div>
                          <div className="text-xs text-gray-500">{item.loss_ha.toLocaleString()} ha</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deforestation Rate by Decade */}
                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Deforestation Rate by Decade</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={getDeforestationRateByDecade()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="decade" />
                      <YAxis label={{ value: 'Avg Rate (Mha/year)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => `${value} Mha/year`} />
                      <Bar dataKey="avgRate" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Loss Velocity */}
                {getVelocityData().length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow-md border">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-700 uppercase">Deforestation Velocity</h3>
                      <InfoTooltip text="Shows acceleration/deceleration of forest loss rate" />
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={getVelocityData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(3)} Mha/year²`} />
                        <Bar dataKey="velocity">
                          {getVelocityData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.velocity > 0 ? '#ef4444' : '#10b981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'climate' && (
              <div className="space-y-6">
                {/* Climate Impact Equivalents */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-lg shadow-md border border-red-200">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Climate Impact Equivalents</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">🚗 Cars on Road</div>
                      <div className="text-2xl font-bold text-red-700">{Math.floor(getEmissionsData() / 1000 / 4.6).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">for 1 year</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">🏠 Homes Powered</div>
                      <div className="text-2xl font-bold text-red-700">{Math.floor(getEmissionsData() / 1000 / 7.5).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">annual energy</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">🌳 Trees Needed</div>
                      <div className="text-2xl font-bold text-red-700">{(Math.floor(getEmissionsData() / 1000 / 0.06) / 1000000).toFixed(1)}M</div>
                      <div className="text-xs text-gray-500">to offset emissions</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">✈️ NY→London Flights</div>
                      <div className="text-2xl font-bold text-red-700">{(Math.floor(getEmissionsData() / 1000 / 0.92) / 1000).toFixed(0)}K</div>
                      <div className="text-xs text-gray-500">round trips</div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white rounded border-l-4 border-red-500">
                    <p className="text-xs text-gray-700">
                      <strong>Total CO₂ Impact:</strong> {(getEmissionsData() / 1000000000).toFixed(2)} Gt of CO₂ released from deforestation
                    </p>
                  </div>
                </div>

                {/* Net Change: Loss vs Gain */}
                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Forest Gain vs Loss (2000-2024)</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Loss', value: getTotalHistoricalLoss() / 1000000, color: '#ef4444' },
                              { name: 'Gain', value: (data.tree_cover_gain?.total_gain_ha || 0) / 1000000, color: '#10b981' }
                            ]}
                            cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                            <Cell fill="#ef4444" />
                            <Cell fill="#10b981" />
                          </Pie>
                          <Tooltip formatter={(value) => `${value.toFixed(2)} Mha`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-2">Net Change</div>
                        <div className={`text-3xl font-bold ${
                          (data.tree_cover_gain?.total_gain_ha || 0) - getTotalHistoricalLoss() < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {((data.tree_cover_gain?.total_gain_ha || 0) - getTotalHistoricalLoss() < 0 ? '−' : '+') + 
                           Math.abs(((data.tree_cover_gain?.total_gain_ha || 0) - getTotalHistoricalLoss()) / 1000000).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Million hectares</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'protection' && (
              <div className="space-y-6">
                {/* Protected Areas */}
                {data.protected_areas?.status === 'success' && (
                  <div className="bg-white p-6 rounded-lg shadow-md border">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-700 uppercase">Protected Areas (IUCN)</h3>
                      <InfoTooltip text="IUCN categories classify protected areas by conservation goals" />
                    </div>
                    <div className="space-y-2">
                      {getProtectedAreasData().map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded border">
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
                  <div className="bg-white p-6 rounded-lg shadow-md border">
                    <div className="flex items-center gap-2 mb-4">
                      <Leaf className="w-5 h-5 text-green-600" />
                      <h3 className="text-sm font-semibold text-gray-700 uppercase">Primary Forest Extent</h3>
                      <InfoTooltip text="Old-growth forests with ≥75% canopy density" />
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
            )}

            {activeTab === 'health' && (
              <div className="space-y-6">
                {/* Forest Health Scorecard */}
                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Forest Health Scorecard</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col items-center justify-center">
                      {(() => {
                        const { overallScore } = getForestHealthScores();
                        const gradeInfo = getGrade(overallScore);
                        return (
                          <>
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center ${gradeInfo.bg} border-4 ${gradeInfo.color}`}>
                              <div className="text-center">
                                <div className="text-4xl font-bold">{gradeInfo.grade}</div>
                                <div className="text-xs">Overall</div>
                              </div>
                            </div>
                            <div className="mt-3 text-center">
                              <div className="text-2xl font-bold text-gray-800">{overallScore.toFixed(1)}</div>
                              <div className="text-xs text-gray-500">Health Score</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={[
                        { metric: 'Conservation', score: getForestHealthScores().scores.conservation, fullMark: 100 },
                        { metric: 'Protection', score: getForestHealthScores().scores.protection, fullMark: 100 },
                        { metric: 'Integrity', score: getForestHealthScores().scores.integrity, fullMark: 100 },
                        { metric: 'Fire Mgmt', score: getForestHealthScores().scores.fireManagement, fullMark: 100 }
                      ]}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {Object.entries(getForestHealthScores().scores).map(([key, value]) => (
                      <div key={key} className="p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${value}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold">{value.toFixed(0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Global Comparison */}
                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Global Deforestation Context</h3>
                  </div>

                  <div className="space-y-3">
                    {[
                      { country: 'Brazil', loss_mha: 87.07, rank: 1 },
                      { country: 'Indonesia', loss_mha: 26.8, rank: 2 },
                      { country: 'DRC', loss_mha: 19.5, rank: 3 },
                      { country: data.country, loss_mha: getTotalHistoricalLoss() / 1000000, rank: '?', current: true },
                      { country: 'Bolivia', loss_mha: 9.8, rank: 4 }
                    ].sort((a, b) => b.loss_mha - a.loss_mha).slice(0, 5).map((item, idx) => {
                      const maxLoss = 87.07;
                      return (
                        <div key={idx} className={`p-3 rounded-lg ${item.current ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                                idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : 'bg-gray-400'
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800">{item.country}</div>
                                {item.current && <div className="text-xs text-blue-600 font-medium">Your Query</div>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-red-600">{item.loss_mha.toFixed(2)} Mha</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${item.current ? 'bg-blue-500' : 'bg-red-500'}`}
                              style={{ width: `${(item.loss_mha / maxLoss) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 p-3 bg-purple-50 rounded border-l-4 border-purple-500">
                    <p className="text-xs text-gray-700">
                      <strong>Note:</strong> Rankings based on total tree cover loss from 2001-2024 globally.
                    </p>
                  </div>
                </div>

                {/* Key Insights Summary */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg shadow-md border border-indigo-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Key Insights Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-white rounded">
                      <div className="text-2xl">📊</div>
                      <div>
                        <div className="font-semibold text-sm">Deforestation Trend</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Forest loss is <strong>{getTrendAnalysis()?.trend}</strong> by{' '}
                          <strong>{getTrendAnalysis()?.percentChange}%</strong> compared to the baseline period.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white rounded">
                      <div className="text-2xl">🌍</div>
                      <div>
                        <div className="font-semibold text-sm">Climate Impact</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Deforestation released <strong>{(getEmissionsData() / 1000000000).toFixed(2)} Gt CO₂</strong>, 
                          equivalent to <strong>{Math.floor(getEmissionsData() / 1000 / 4.6).toLocaleString()}</strong> cars 
                          on the road for one year.
                        </div>
                      </div>
                    </div>

                    {data.protected_areas?.status === 'success' && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded">
                        <div className="text-2xl">🛡️</div>
                        <div>
                          <div className="font-semibold text-sm">Conservation Efforts</div>
                          <div className="text-xs text-gray-600 mt-1">
                            <strong>{((data.protected_areas.total_protected_ha / data.total_area_ha) * 100).toFixed(1)}%</strong>{' '}
                            of the country is under protection across{' '}
                            <strong>{data.protected_areas.categories.reduce((sum, c) => sum + c.count, 0)}</strong> protected areas.
                          </div>
                        </div>
                      </div>
                    )}

                    {data.primary_forest?.status === 'success' && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded">
                        <div className="text-2xl">🌳</div>
                        <div>
                          <div className="font-semibold text-sm">Primary Forest</div>
                          <div className="text-xs text-gray-600 mt-1">
                            <strong>{((data.primary_forest.primary_forest_ha / data.forest_area_ha) * 100).toFixed(1)}%</strong>{' '}
                            of forests are primary/old-growth, critical for biodiversity and carbon storage.
                          </div>
                        </div>
                      </div>
                    )}

                    {data.fire_alerts?.status === 'success' && data.fire_alerts.total_alerts > 0 && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded">
                        <div className="text-2xl">🔥</div>
                        <div>
                          <div className="font-semibold text-sm">Fire Risk</div>
                          <div className="text-xs text-gray-600 mt-1">
                            <strong>{(data.fire_alerts.total_alerts / 1000).toFixed(0)}K</strong> fire alerts 
                            detected since 2020, indicating significant fire risk and potential loss.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Data Sources */}
          <div className="max-w-7xl mx-auto px-6 pb-6">
            <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg shadow-md border border-green-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Data Sources & Quality</h3>
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
                        <div className={`w-2 h-2 rounded-full ${
                          value === 'success' ? 'bg-green-500' : 
                          value === 'partial' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="capitalize">{key.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-6">📊</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Comprehensive Forest Analysis</h2>
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