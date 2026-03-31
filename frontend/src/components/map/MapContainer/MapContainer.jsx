import React, { useEffect, useState, useRef } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { incidentAPI, reliefCenterAPI } from '../../../services/api';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

// Custom marker icons
const createCustomIcon = (color, icon) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${icon}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40]
  });
};

const markerIcons = {
  unrescued: createCustomIcon('#EF4444', '🔴'),
  rescue_in_progress: createCustomIcon('#F59E0B', '🟡'),
  rescued: createCustomIcon('#10B981', '🟢'),
  safe_zone: createCustomIcon('#10B981', '✅'),
  relief_center: createCustomIcon('#3B82F6', '🏥')
};

// Component to auto-fit bounds
function AutoFitBounds({ incidents, reliefCenters }) {
  const map = useMap();

  useEffect(() => {
    const allPoints = [
      ...incidents.map(i => [i.latitude, i.longitude]),
      ...reliefCenters.map(c => [c.latitude, c.longitude])
    ];

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [incidents, reliefCenters, map]);

  return null;
}

const MapContainerComponent = ({ center = [15.8281, 78.0373], zoom = 12 }) => {
  const [incidents, setIncidents] = useState([]);
  const [reliefCenters, setReliefCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [incidentsResponse, centersResponse] = await Promise.all([
        incidentAPI.getAllIncidents(),
        reliefCenterAPI.getAllCenters()
      ]);

      setIncidents(incidentsResponse.incidents || []);
      setReliefCenters(centersResponse.reliefCenters || []);
      setError('');

    } catch (err) {
      setError('Failed to load map data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      unrescued: 'text-red-600',
      rescue_in_progress: 'text-yellow-600',
      rescued: 'text-green-600',
      safe_zone: 'text-green-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const getStatusLabel = (status) => {
    const labels = {
      unrescued: 'NEEDS RESCUE',
      rescue_in_progress: 'RESCUE IN PROGRESS',
      rescued: 'RESCUED',
      safe_zone: 'SAFE ZONE'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* Legend */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4">
        <h3 className="font-bold text-sm mb-2">Map Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span>🔴</span>
            <span>Needs Rescue</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🟡</span>
            <span>Rescue In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🟢</span>
            <span>Safe Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🏥</span>
            <span>Relief Center</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-gray-600">Total Incidents</p>
            <p className="text-2xl font-bold">{incidents.length}</p>
          </div>
          <div>
            <p className="text-gray-600">Relief Centers</p>
            <p className="text-2xl font-bold">{reliefCenters.length}</p>
          </div>
        </div>
      </div>

      <LeafletMap
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoFitBounds incidents={incidents} reliefCenters={reliefCenters} />

        {/* Incident Markers */}
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.latitude, incident.longitude]}
            icon={markerIcons[incident.status] || markerIcons.unrescued}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className={`font-bold mb-2 ${getStatusColor(incident.status)}`}>
                  {getStatusLabel(incident.status)}
                </div>
                
                {incident.photoUrl && (
                  <img 
                    src={incident.photoUrl} 
                    alt="Incident" 
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                
                <p className="text-sm text-gray-700 mb-1">
                  <strong>Reporter:</strong> {incident.reporterName}
                </p>
                
                {incident.description && (
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Description:</strong> {incident.description}
                  </p>
                )}
                
                <p className="text-xs text-gray-500 mb-2">
                  {new Date(incident.createdAt).toLocaleString()}
                </p>

                {incident.verificationScore && (
                  <div className="mb-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      incident.verificationScore >= 80 ? 'bg-green-100 text-green-800' :
                      incident.verificationScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      Verification: {incident.verificationScore}%
                    </span>
                  </div>
                )}
                
                <a 
                  href={`/incidents/${incident.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Details →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Relief Center Markers */}
        {reliefCenters.map((center) => (
          <Marker
            key={center.id}
            position={[center.latitude, center.longitude]}
            icon={markerIcons.relief_center}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="font-bold text-blue-600 mb-2">
                  🏥 {center.name}
                </div>
                
                <p className="text-sm text-gray-700 mb-1">
                  {center.address}
                </p>
                
                <div className="mb-2">
                  <p className="text-sm">
                    <strong>Capacity:</strong> {center.availableCapacity}/{center.totalCapacity}
                  </p>
                  <div className="w-full bg-gray-200 rounded h-2 mt-1">
                    <div 
                      className="bg-blue-600 h-2 rounded"
                      style={{ 
                        width: `${(center.currentOccupancy / center.totalCapacity) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {center.resources && (
                  <div className="flex gap-2 mb-2">
                    {center.resources.food && <span className="text-xs">🍽️ Food</span>}
                    {center.resources.water && <span className="text-xs">💧 Water</span>}
                    {center.resources.medical && <span className="text-xs">⚕️ Medical</span>}
                  </div>
                )}

                {center.contactNumber && (
                  <p className="text-sm text-gray-700">
                    📞 {center.contactNumber}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </LeafletMap>
    </div>
  );
};

export default MapContainerComponent;