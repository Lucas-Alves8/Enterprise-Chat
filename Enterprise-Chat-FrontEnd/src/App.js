import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Auth from './pages/Auth';

function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Auth />} />

      </Routes>
    </Router>
  );
}

export default App;