import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { incidentAPI } from '../../services/api';
import VerificationBadge from '../../incidents/VerificationBadge';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';


const IncidentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const response = await incidentAPI.getIncidentById(id);
      setIncident(response.incident);
      setError('');
    } catch (err) {
      setError('Failed to load incident details');
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading incident details...</p>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Incident not found'}</p>
          <button
            onClick={() => navigate('/incidents')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Incidents
          </button>
        </div>
      </div>
    );
  }

  const warnings = incident.verificationWarnings 
    ? JSON.parse(incident.verificationWarnings) 
    : [];

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/incidents')}
          className="mb-6 flex items-center gap-2 text-blue-600 hover:underline"
        >
          ← Back to Incidents
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column - Image and Map */}
          <div className="space-y-6">
            
            {/* Image */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <img
                src={incident.photoUrl}
                alt="Incident"
                className="w-full h-96 object-cover"
              />
            </div>

            {/* Map */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800">Location</h3>
              </div>
              <div className="h-64">
                <MapContainer
                  center={[incident.latitude, incident.longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[incident.latitude, incident.longitude]}>
                    <Popup>Incident Location</Popup>
                  </Marker>
                </MapContainer>
              </div>
              <div className="p-4 bg-gray-50">
                <p className="text-sm text-gray-600">
                  📍 Coordinates: {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Incident #{incident.id}
              </h2>

              <div className="mb-4">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusBadgeColor(incident.status)}`}>
                  {getStatusLabel(incident.status)}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Reporter</p>
                  <p className="font-semibold text-gray-800">{incident.reporterName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Reported At</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(incident.createdAt).toLocaleString()}
                  </p>
                </div>

                {incident.description && (
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="text-gray-800">{incident.description}</p>
                  </div>
                )}

                {incident.assignedTeamId && (
                  <div>
                    <p className="text-sm text-gray-600">Assigned Team</p>
                    <p className="font-semibold text-gray-800">
                      Team #{incident.assignedTeamId}
                    </p>
                  </div>
                )}

                {incident.resolvedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Resolved At</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(incident.resolvedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Card */}
            {incident.verificationScore && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-gray-800 mb-4">Verification Status</h3>
                
                <VerificationBadge
                  verificationScore={incident.verificationScore}
                  autoApproved={incident.autoApproved}
                  warnings={warnings}
                />

                {incident.verifiedByTeam && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">
                      ✓ Verified by rescue team on {new Date(incident.verifiedAt).toLocaleString()}
                    </p>
                    {incident.verificationNotes && (
                      <p className="text-sm text-green-700 mt-2">
                        <strong>Notes:</strong> {incident.verificationNotes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* People Count */}
            {incident.peopleCount > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-gray-800 mb-2">People Detected</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {incident.peopleCount} {incident.peopleCount === 1 ? 'person' : 'people'}
                </p>
              </div>
            )}

            {/* Actions (for authorized users - implement based on role) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4">Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  View on Map
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Share Location
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailPage;