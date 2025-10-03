import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import Simulate from './pages/Simulate';
import TimeSeries from './pages/TimeSeries';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/simulate" element={<Simulate />} />
          <Route path="/timeseries" element={<TimeSeries />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;