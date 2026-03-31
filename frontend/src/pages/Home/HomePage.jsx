import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentAPI, reliefCenterAPI } from '../../services/api';

const HomePage = () => {
  const [incidents, setIncidents] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [incidentsRes, sheltersRes] = await Promise.all([
        incidentAPI.getAllIncidents(),
        reliefCenterAPI.getAllCenters(),
      ]);
      setIncidents(incidentsRes.incidents || []);
      setShelters(sheltersRes.reliefCenters || []);
    } catch (err) {
      console.error('Failed to load homepage data:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeIncidents = incidents.filter(
    (i) => i.status !== 'rescued' && i.status !== 'safe_zone' && i.status !== 'fake_report'
  );

  const availableSpace = shelters.reduce(
    (sum, s) => sum + ((s.totalCapacity ?? s.capacity ?? 0) - (s.currentOccupancy ?? 0)),
    0
  );

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white shadow-lg z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600 flex items-center gap-2">
              <span>🌊</span> Flood Management System
            </Link>
            <nav className="flex items-center space-x-4">
              <Link
                to="/map"
                className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded transition-colors font-medium"
              >
                🗺️ Live Map
              </Link>
              <Link
                to="/relief-centers"
                className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded transition-colors"
              >
                🏠 Shelters
              </Link>
              <Link
                to="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* ── Landing Page ── */}
      <div className="flex-1 bg-gradient-to-br from-blue-400 to-blue-600">
        <div className="container mx-auto px-4 py-16">

          {/* Hero */}
          <div className="text-center text-white mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Emergency Response System
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Real-time flood monitoring and rescue coordination
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/report-emergency"
                className="bg-red-500 text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-red-600 transition-all transform hover:scale-105 shadow-xl"
              >
                🚨 Report Emergency
              </Link>
              <Link
                to="/map"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
              >
                🗺️ View Live Map
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Link
              to="/report-emergency"
              className="bg-white text-gray-800 p-8 rounded-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
            >
              <div className="text-6xl mb-4 text-center">🚨</div>
              <h3 className="text-2xl font-bold mb-3 text-center">Report Emergency</h3>
              <p className="text-center text-gray-600">Quick incident reporting with GPS location</p>
              <div className="mt-4 text-center text-blue-600 font-semibold">Click to Report →</div>
            </Link>

            <Link
              to="/map"
              className="bg-white text-gray-800 p-8 rounded-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
            >
              <div className="text-6xl mb-4 text-center">🗺️</div>
              <h3 className="text-2xl font-bold mb-3 text-center">Live Map</h3>
              <p className="text-center text-gray-600">Real-time tracking of incidents and rescue teams</p>
              <div className="mt-4 text-center text-blue-600 font-semibold">View Map →</div>
            </Link>

            <Link
              to="/relief-centers"
              className="bg-white text-gray-800 p-8 rounded-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
            >
              <div className="text-6xl mb-4 text-center">🏠</div>
              <h3 className="text-2xl font-bold mb-3 text-center">Find Shelter</h3>
              <p className="text-center text-gray-600">Locate nearest available shelters</p>
              <div className="mt-4 text-center text-blue-600 font-semibold">Find Shelters →</div>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 bg-white/10 backdrop-blur-sm rounded-xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white text-center mb-6">Current Status</h3>

            {loading ? (
              <div className="flex justify-center items-center gap-3 text-white py-4">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading live data...</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6 text-center text-white">
                <div>
                  <div className="text-4xl font-bold">{activeIncidents.length}</div>
                  <div className="text-sm mt-2 opacity-80">Active Reports</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">{shelters.length}</div>
                  <div className="text-sm mt-2 opacity-80">Shelters</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">{availableSpace}</div>
                  <div className="text-sm mt-2 opacity-80">Available Space</div>
                </div>
              </div>
            )}

            {/* Live indicator */}
            {!loading && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
                <span className="text-white/70 text-xs">Live — updates every 30 seconds</span>
              </div>
            )}
          </div>

          {/* Login CTA */}
          <div className="mt-12 text-center">
            <p className="text-white text-lg mb-4">Are you a rescue team member or admin?</p>
            <Link
              to="/login"
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all shadow-lg"
            >
              🔐 Sign In to Your Dashboard
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HomePage;
