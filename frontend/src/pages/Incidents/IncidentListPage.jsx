import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentAPI } from '../../services/api';
import VerificationBadge from '../../incidents/VerificationBadge';

const IncidentListPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [incidents, filters]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await incidentAPI.getAllIncidents();
      setIncidents(response.incidents || []);
      setError('');
    } catch (err) {
      setError('Failed to load incidents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...incidents];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(inc => inc.status === filters.status);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(inc =>
        inc.reporterName?.toLowerCase().includes(searchLower) ||
        inc.description?.toLowerCase().includes(searchLower) ||
        inc.id.toString().includes(searchLower)
      );
    }

    setFilteredIncidents(filtered);
  };

  const handleFilterChange = (e) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending_verification: 'bg-gray-100 text-gray-800 border-gray-300',
      unrescued: 'bg-red-100 text-red-800 border-red-300',
      rescue_in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      rescued: 'bg-green-100 text-green-800 border-green-300',
      safe_zone: 'bg-blue-100 text-blue-800 border-blue-300',
      fake_report: 'bg-red-200 text-red-900 border-red-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending_verification: 'Pending Verification',
      unrescued: 'Needs Rescue',
      rescue_in_progress: 'Rescue In Progress',
      rescued: 'Rescued',
      safe_zone: 'Safe Zone',
      fake_report: 'Fake Report'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending_verification: '⏳',
      unrescued: '🔴',
      rescue_in_progress: '🟡',
      rescued: '🟢',
      safe_zone: '✅',
      fake_report: '❌'
    };
    return icons[status] || '📍';
  };

  const stats = {
    total: incidents.length,
    unrescued: incidents.filter(i => i.status === 'unrescued').length,
    inProgress: incidents.filter(i => i.status === 'rescue_in_progress').length,
    rescued: incidents.filter(i => i.status === 'rescued').length,
    pending: incidents.filter(i => i.status === 'pending_verification').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading incidents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Emergency Incidents
          </h1>
          <p className="text-gray-600">
            View and track all reported flood emergencies
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total</p>
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow p-4">
            <p className="text-red-600 text-sm">Needs Rescue</p>
            <p className="text-3xl font-bold text-red-800">{stats.unrescued}</p>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg shadow p-4">
            <p className="text-yellow-600 text-sm">In Progress</p>
            <p className="text-3xl font-bold text-yellow-800">{stats.inProgress}</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg shadow p-4">
            <p className="text-green-600 text-sm">Rescued</p>
            <p className="text-3xl font-bold text-green-800">{stats.rescued}</p>
          </div>
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Pending</p>
            <p className="text-3xl font-bold text-gray-800">{stats.pending}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by reporter, description, or ID..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="unrescued">Needs Rescue</option>
                <option value="rescue_in_progress">Rescue In Progress</option>
                <option value="rescued">Rescued</option>
                <option value="safe_zone">Safe Zone</option>
                <option value="fake_report">Fake Reports</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {filteredIncidents.length} of {incidents.length} incidents
            </p>
            <button
              onClick={() => setFilters({ status: 'all', search: '' })}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button 
              onClick={fetchIncidents}
              className="ml-4 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Incidents Grid */}
        {filteredIncidents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Incidents Found
            </h3>
            <p className="text-gray-600">
              {filters.status !== 'all' || filters.search
                ? 'Try adjusting your filters'
                : 'No incidents have been reported yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
              >
                {/* Image */}
                {incident.photoUrl && (
                  <div className="h-48 overflow-hidden bg-gray-200">
                    <img
                      src={incident.photoUrl}
                      alt="Incident"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(incident.status)}`}>
                      {getStatusIcon(incident.status)} {getStatusLabel(incident.status)}
                    </span>
                  </div>

                  {/* Incident ID */}
                  <p className="text-xs text-gray-500 mb-2">
                    ID: #{incident.id}
                  </p>

                  {/* Reporter */}
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    Reporter: {incident.reporterName}
                  </p>

                  {/* Description */}
                  {incident.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {incident.description}
                    </p>
                  )}

                  {/* Verification Score */}
                  {incident.verificationScore && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Verification</span>
                        <span className="font-semibold">{incident.verificationScore}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            incident.verificationScore >= 80 ? 'bg-green-500' :
                            incident.verificationScore >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${incident.verificationScore}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <p className="text-xs text-gray-500 mb-3">
                    📍 {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                  </p>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500 mb-3">
                    🕒 {new Date(incident.createdAt).toLocaleString()}
                  </p>

                  {/* View Details Button */}
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentListPage;