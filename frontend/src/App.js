import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import NLPSimulate from './pages/NLPSimulate';


function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nlp" element={<NLPSimulate />} />
          
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;