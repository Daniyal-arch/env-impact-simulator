import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Forest Impact Simulator
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Analyze forest loss scenarios and their environmental impact using real data 
          from Global Forest Watch. Compare hypothetical scenarios with realistic projections.
        </p>
        
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Structured Simulation</h3>
            <p className="text-gray-600 mb-4">
              Use our form-based interface to specify country, forest loss percentage, 
              and target year for detailed projections.
            </p>
            <Link 
              to="/simulate" 
              className="bg-forest-600 text-white px-4 py-2 rounded hover:bg-forest-700 transition-colors"
            >
              Start Simulation
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Time Series Maps</h3>
            <p className="text-gray-600 mb-4">
              Visualize historical forest loss patterns over time with interactive maps 
              showing regional changes.
            </p>
            <Link 
              to="/timeseries" 
              className="bg-forest-600 text-white px-4 py-2 rounded hover:bg-forest-700 transition-colors"
            >
              View Maps
            </Link>
          </div>
        </div>
        
        <div className="mt-12 bg-forest-50 p-8 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <h4 className="font-semibold">Dual Projections</h4>
              <p className="text-sm text-gray-600">Compare user scenarios with trend-based projections</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🗺️</div>
              <h4 className="font-semibold">Interactive Maps</h4>
              <p className="text-sm text-gray-600">Visualize forest changes over time</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🌍</div>
              <h4 className="font-semibold">Real Data</h4>
              <p className="text-sm text-gray-600">Powered by Global Forest Watch API</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;