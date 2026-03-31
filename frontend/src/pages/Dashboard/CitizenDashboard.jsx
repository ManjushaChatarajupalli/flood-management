import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { incidentAPI, reliefCenterAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

const CitizenDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { notifications, pushEnabled, registerServiceWorkerAndSubscribe, updateLocation } = useContext(NotificationContext);
  const navigate = useNavigate();

  const [myReports, setMyReports] = useState([]);
  const [nearbyReliefCenters, setNearbyReliefCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('pending');
  const [notifStatus, setNotifStatus] = useState('pending');
  const [showAlertBanner, setShowAlertBanner] = useState(false);
  const [latestAlert, setLatestAlert] = useState(null);

  useEffect(() => {
    getUserLocation();
    fetchMyReports();
    checkNotificationStatus();
  }, []);

  useEffect(() => {
    if (userLocation) fetchNearbyReliefCenters();
  }, [userLocation]);

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (latest.title?.toLowerCase().includes('flood') || latest.title?.toLowerCase().includes('warning')) {
        setLatestAlert(latest);
        setShowAlertBanner(true);
      }
    }
  }, [notifications]);

  const checkNotificationStatus = () => {
    if ('Notification' in window) setNotifStatus(Notification.permission);
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(loc);
        setLocationStatus('granted');
        updateLocation();
      },
      () => setLocationStatus('denied')
    );
  };

  const handleEnableNotifications = async () => {
    await registerServiceWorkerAndSubscribe();
    checkNotificationStatus();
  };

  const fetchMyReports = async () => {
    try {
      const response = await incidentAPI.getAllIncidents();
      const allIncidents = response.incidents || [];
      setMyReports(allIncidents.filter(i => i.reporterId === user.id));
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyReliefCenters = async () => {
    try {
      const response = await reliefCenterAPI.getAllCenters();
      setNearbyReliefCenters(response.reliefCenters || []);
    } catch (error) {
      console.error('Failed to fetch relief centers:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_verification: 'bg-gray-100 text-gray-800',
      unrescued: 'bg-red-100 text-red-800',
      rescue_in_progress: 'bg-yellow-100 text-yellow-800',
      rescued: 'bg-green-100 text-green-800',
      safe_zone: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending_verification: 'Pending Verification',
      unrescued: 'Awaiting Rescue',
      rescue_in_progress: 'Rescue In Progress',
      rescued: 'Rescued',
      safe_zone: 'Safe Zone'
    };
    return labels[status] || status;
  };

  // ── Logout handler ──
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Flood Alert Banner */}
        {showAlertBanner && latestAlert && (
          <div className="mb-6 p-4 bg-red-600 text-white rounded-2xl shadow-lg flex items-start justify-between animate-pulse">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🚨</span>
              <div>
                <p className="font-bold text-lg">{latestAlert.title}</p>
                <p className="text-sm text-red-100">{latestAlert.message || latestAlert.body}</p>
              </div>
            </div>
            <button onClick={() => setShowAlertBanner(false)} className="text-white text-opacity-70 hover:text-opacity-100 text-xl ml-4 flex-shrink-0">✕</button>
          </div>
        )}

        {/* Permission Setup Cards */}
        {(locationStatus !== 'granted' || !pushEnabled) && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {locationStatus !== 'granted' && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">📍</div>
                <div className="flex-1">
                  <p className="font-bold text-amber-800">Enable Location</p>
                  <p className="text-sm text-amber-700 mt-1">Required for weather monitoring at your location</p>
                  <button onClick={getUserLocation} className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition">Allow Location</button>
                </div>
              </div>
            )}
            {!pushEnabled && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5 flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">🔔</div>
                <div className="flex-1">
                  <p className="font-bold text-blue-800">Enable Flood Alerts</p>
                  <p className="text-sm text-blue-700 mt-1">Get instant push notifications when floods are detected near you</p>
                  <button onClick={handleEnableNotifications} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">Enable Notifications</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notification Active Status */}
        {pushEnabled && locationStatus === 'granted' && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-bold text-green-800 text-sm">Flood monitoring active</p>
              <p className="text-xs text-green-600">Weather is checked every 30 minutes at your GPS location. You'll receive browser alerts even when this tab is in the background.</p>
            </div>
            {userLocation && (
              <span className="ml-auto text-xs text-green-600 font-mono bg-green-100 px-2 py-1 rounded-lg">
                📍 {userLocation.latitude.toFixed(3)}, {userLocation.longitude.toFixed(3)}
              </span>
            )}
          </div>
        )}

        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏠 Citizen Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, <strong>{user?.name}</strong></p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl hover:bg-blue-200 transition"
            >
              👤
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-200 transition"
            >
               Logout
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link to="/report-emergency" className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-lg shadow-red-100 p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <div className="text-4xl mb-2">🚨</div>
            <h3 className="text-xl font-bold mb-1">Report Emergency</h3>
            <p className="text-sm text-red-100">Quick incident reporting</p>
          </Link>
          <Link to="/shelters" className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-2xl shadow-lg shadow-blue-100 p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <div className="text-4xl mb-2">🏥</div>
            <h3 className="text-xl font-bold mb-1">Find Shelter</h3>
            <p className="text-sm text-blue-100">Locate nearest relief center</p>
          </Link>
          <Link to="/map" className="bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-2xl shadow-lg shadow-green-100 p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <div className="text-4xl mb-2">🗺️</div>
            <h3 className="text-xl font-bold mb-1">View Map</h3>
            <p className="text-sm text-green-100">See all incidents & safe zones</p>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-gray-500 text-sm">My Reports</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{myReports.length}</p>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
            <p className="text-yellow-600 text-sm">In Progress</p>
            <p className="text-3xl font-bold text-yellow-800 mt-1">{myReports.filter(r => r.status === 'rescue_in_progress').length}</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
            <p className="text-green-600 text-sm">Resolved</p>
            <p className="text-3xl font-bold text-green-800 mt-1">{myReports.filter(r => r.status === 'rescued' || r.status === 'safe_zone').length}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
            <p className="text-blue-600 text-sm">Nearby Shelters</p>
            <p className="text-3xl font-bold text-blue-800 mt-1">{nearbyReliefCenters.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Reports */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">My Reports</h2>
              <Link to="/incidents" className="text-sm text-blue-600 hover:underline font-medium">View all</Link>
            </div>
            <div className="p-6">
              {myReports.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-gray-500">No reports yet</p>
                  <Link to="/report-emergency" className="inline-block mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold transition">
                    Report Incident
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {myReports.map(report => (
                    <div key={report.id} className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50 transition">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-800">Incident #{report.id}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(report.createdAt).toLocaleString()}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(report.status)}`}>
                          {getStatusLabel(report.status)}
                        </span>
                      </div>
                      {report.photoUrl && <img src={report.photoUrl} alt="Report" className="w-full h-28 object-cover rounded-lg mb-2" />}
                      {report.description && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{report.description}</p>}
                      <Link to={`/incidents/${report.id}`} className="text-sm text-blue-600 hover:underline font-medium">View Details →</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nearby Relief Centers */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Nearby Relief Centers</h2>
            </div>
            <div className="p-6">
              {nearbyReliefCenters.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏥</div>
                  <p className="text-gray-500">No relief centers found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {nearbyReliefCenters.map(center => (
                    <div key={center.id} className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50 transition">
                      <h3 className="font-semibold text-gray-800 mb-1">🏥 {center.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{center.address}</p>
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Capacity</span>
                          <span className="font-semibold">{center.availableCapacity}/{center.totalCapacity}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${(center.currentOccupancy / center.totalCapacity) * 100}%` }} />
                        </div>
                      </div>
                      {center.resources && (
                        <div className="flex gap-2 flex-wrap mt-2">
                          {center.resources.food && <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg">🍽️ Food</span>}
                          {center.resources.water && <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">💧 Water</span>}
                          {center.resources.medical && <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg">⚕️ Medical</span>}
                        </div>
                      )}
                      {center.contactNumber && <p className="text-sm text-gray-600 mt-2">📞 {center.contactNumber}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Safety Tips */}
        <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
          <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
            <span className="text-xl">⚠️</span> Safety Tips During Floods
          </h3>
          <ul className="space-y-2 text-sm text-amber-800 grid grid-cols-1 md:grid-cols-2 gap-1">
            {[
              'Move to higher ground immediately if water is rising',
              'Do not walk or drive through flooded areas',
              'Keep emergency supplies ready (food, water, first aid)',
              'Stay informed through local authorities and news',
              'Keep your phone charged and notifications ON',
              'Use this app to report emergencies and find help'
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
