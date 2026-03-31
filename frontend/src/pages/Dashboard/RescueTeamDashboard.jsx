import React, { useState, useEffect, useContext } from 'react';
import { incidentAPI, rescueTeamAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { Link, useNavigate } from 'react-router-dom';

// ─── Solo Confirm Modal ───────────────────────────────────────
const SoloConfirmModal = ({ incident, onConfirm, onCancel, loading }) => (
  <div
    style={{ background: 'rgba(0,0,0,0.45)', minHeight: '100vh' }}
    className="fixed inset-0 z-50 flex items-center justify-center px-4"
  >
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-2 border-orange-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-2xl flex-shrink-0">
          🚁
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg leading-tight">No team assigned</h3>
          <p className="text-sm text-gray-500">You are not part of a rescue team</p>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-5">
        <p className="text-sm text-orange-800 font-medium">
          Would you like to work solo on this incident?
        </p>
        <p className="text-xs text-orange-600 mt-1">
          Incident #{incident?.id} · 📍 {incident?.latitude?.toFixed(4)}, {incident?.longitude?.toFixed(4)}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : '✓ Work Solo'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────
const RescueTeamDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [assignedIncidents, setAssignedIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [notifPermission, setNotifPermission] = useState('default');
  const [newIncidentAlert, setNewIncidentAlert] = useState(null);

  // ── Solo modal state ──
  const [soloModal, setSoloModal] = useState({ open: false, incident: null });
  const [soloAssigning, setSoloAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);

  useEffect(() => {
    fetchData();
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => setNotifPermission(p));
      }
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_incident', handleNewIncident);
    socket.on('incident_updated', handleIncidentUpdate);
    return () => {
      socket.off('new_incident', handleNewIncident);
      socket.off('incident_updated', handleIncidentUpdate);
    };
  }, [socket, myTeam]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incidentsResponse, teamsResponse] = await Promise.all([
        incidentAPI.getAllIncidents(),
        rescueTeamAPI.getAllTeams()
      ]);

      const allIncidents = incidentsResponse.incidents || [];
      setIncidents(allIncidents);

      // ── FIX: find team where user is leader OR a member ──
      const userTeam = teamsResponse.teams?.find(
        t => t.teamLeaderId === user.id || t.memberIds?.includes(user.id)
      );
      setMyTeam(userTeam || null);

      // ── FIX: include solo-assigned incidents (assignedToUserId) ──
      const myAssigned = allIncidents.filter(i =>
        (userTeam && i.assignedTeamId === userTeam.id) ||
        i.assignedToUserId === user.id
      );
      setAssignedIncidents(myAssigned);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewIncident = (data) => {
    setIncidents(prev => [data.incident, ...prev]);
    setNewIncidentAlert(data.incident);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 New Emergency!', {
        body: `New incident reported near ${data.incident.latitude?.toFixed(3)}, ${data.incident.longitude?.toFixed(3)}`,
        icon: '/logo192.png',
        requireInteraction: true
      });
    }
    setTimeout(() => setNewIncidentAlert(null), 8000);
  };

  const handleIncidentUpdate = (data) => {
    setIncidents(prev =>
      prev.map(inc =>
        inc.id === data.incidentId
          ? { ...inc, status: data.status, assignedTeamId: data.assignedTeamId }
          : inc
      )
    );
  };

  // ── FIX: handleAssignToMe — no more alert(), open solo modal if no team ──
  const handleAssignToMe = (incident) => {
    setAssignError(null);
    if (!myTeam) {
      // No team → show clean solo confirm card
      setSoloModal({ open: true, incident });
      return;
    }
    // Has team → assign directly
    doAssign(incident.id, { status: 'rescue_in_progress', assignedTeamId: myTeam.id });
  };

  // ── Solo confirm handler ──
  const handleSoloConfirm = async () => {
    setSoloAssigning(true);
    try {
      await doAssign(soloModal.incident.id, {
        status: 'rescue_in_progress',
        assignedToUserId: user.id   // solo assignment flag
      });
      setSoloModal({ open: false, incident: null });
    } finally {
      setSoloAssigning(false);
    }
  };

  const doAssign = async (incidentId, payload) => {
    try {
      await incidentAPI.updateIncidentStatus(incidentId, payload);
      fetchData();
      setActiveTab('assigned');
    } catch (error) {
      setAssignError('Failed to assign incident. Please try again.');
    }
  };

  const handleMarkAsRescued = async (incidentId) => {
    try {
      await incidentAPI.updateIncidentStatus(incidentId, { status: 'rescued' });
      fetchData();
    } catch (error) {
      setAssignError('Failed to update status');
    }
  };

  const handleMarkAsSafeZone = async (incidentId) => {
    try {
      await incidentAPI.updateIncidentStatus(incidentId, { status: 'safe_zone' });
      fetchData();
    } catch (error) {
      setAssignError('Failed to update status');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const availableIncidents = incidents.filter(i => i.status === 'unrescued' && i.autoApproved);
  const inProgressIncidents = assignedIncidents.filter(i => i.status === 'rescue_in_progress');
  const completedIncidents = assignedIncidents.filter(i => i.status === 'rescued' || i.status === 'safe_zone');

  const TABS = [
    { id: 'available', label: 'Available',      count: availableIncidents.length  },
    { id: 'assigned',  label: 'My Assignments',  count: assignedIncidents.length   },
    { id: 'completed', label: 'Completed',       count: completedIncidents.length  }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">

      {/* ── Solo confirm modal ── */}
      {soloModal.open && (
        <SoloConfirmModal
          incident={soloModal.incident}
          onConfirm={handleSoloConfirm}
          onCancel={() => setSoloModal({ open: false, incident: null })}
          loading={soloAssigning}
        />
      )}

      <div className="max-w-7xl mx-auto">

        {/* New incident real-time alert banner */}
        {newIncidentAlert && (
          <div className="mb-6 p-4 bg-red-600 text-white rounded-2xl shadow-lg flex items-center gap-4 animate-pulse">
            <span className="text-3xl flex-shrink-0">🚨</span>
            <div className="flex-1">
              <p className="font-bold">New Emergency Reported!</p>
              <p className="text-sm text-red-100">
                Incident #{newIncidentAlert.id} at {newIncidentAlert.latitude?.toFixed(3)}, {newIncidentAlert.longitude?.toFixed(3)}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('available')}
              className="px-4 py-2 bg-white text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition flex-shrink-0"
            >
              View Now
            </button>
          </div>
        )}

        {/* Notification permission prompt */}
        {notifPermission === 'denied' && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center gap-3">
            <span className="text-2xl">🔕</span>
            <p className="text-sm text-amber-800">
              <strong>Browser notifications blocked.</strong> Please enable notifications in your browser settings to receive new incident alerts.
            </p>
          </div>
        )}

        {/* ── Assign error banner ── */}
        {assignError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
            <p className="text-sm text-red-700 font-medium">{assignError}</p>
            <button onClick={() => setAssignError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
          </div>
        )}

        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🚁 Rescue Team Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Welcome back, <strong>{user?.name}</strong>
              {myTeam
                ? <span className="ml-2 text-orange-600 font-semibold">· {myTeam.teamName}</span>
                : <span className="ml-2 text-gray-400 text-sm">· Solo rescuer</span>
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${socket ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {socket ? '🟢 Live' : '⚫ Offline'}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-200 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-gray-500 text-sm">Available</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{availableIncidents.length}</p>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
            <p className="text-yellow-600 text-sm">In Progress</p>
            <p className="text-3xl font-bold text-yellow-800 mt-1">{inProgressIncidents.length}</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
            <p className="text-green-600 text-sm">Completed</p>
            <p className="text-3xl font-bold text-green-800 mt-1">{completedIncidents.length}</p>
          </div>
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
            <p className="text-orange-600 text-sm">Team Status</p>
            <p className="text-lg font-bold text-orange-800 mt-1 capitalize">
              {myTeam?.status || 'Solo'}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="border-b border-gray-100">
            <div className="flex">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-4 font-semibold text-sm transition-all ${
                    activeTab === tab.id
                      ? 'border-b-2 border-orange-500 text-orange-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">

            {/* Available Incidents */}
            {activeTab === 'available' && (
              <div className="space-y-4">
                {availableIncidents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">✅</div>
                    <p className="text-gray-500 font-medium">No available incidents right now</p>
                    <p className="text-gray-400 text-sm mt-1">New incidents will appear here in real-time</p>
                  </div>
                ) : (
                  availableIncidents.map(incident => (
                    <div key={incident.id} className="border-2 border-red-100 rounded-2xl p-5 hover:border-red-200 hover:shadow-md transition bg-red-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">🔴</span>
                            <div>
                              <h3 className="font-bold text-gray-800">Incident #{incident.id}</h3>
                              <p className="text-xs text-gray-400">{new Date(incident.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>📍 Location:</strong> {incident.latitude?.toFixed(4)}, {incident.longitude?.toFixed(4)}
                          </p>
                          {incident.description && (
                            <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-gray-500">Reporter: {incident.reporterName}</span>
                            {incident.peopleCount > 0 && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold">
                                👥 {incident.peopleCount} people
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                              incident.verificationScore >= 80
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {incident.verificationScore}% verified
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {/* ── FIX: pass full incident object, not just id ── */}
                          <button
                            onClick={() => handleAssignToMe(incident)}
                            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm font-bold transition"
                          >
                            Assign to Me
                          </button>
                          <Link
                            to={`/incidents/${incident.id}`}
                            className="px-4 py-2 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium text-center transition"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* My Assignments */}
            {activeTab === 'assigned' && (
              <div className="space-y-4">
                {assignedIncidents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="text-gray-500 font-medium">No assigned incidents</p>
                  </div>
                ) : (
                  assignedIncidents.map(incident => (
                    <div key={incident.id} className={`border-2 rounded-2xl p-5 ${
                      incident.status === 'rescue_in_progress'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-green-200 bg-green-50'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">
                              {incident.status === 'rescue_in_progress' ? '🟡' : '🟢'}
                            </span>
                            <div>
                              <h3 className="font-bold text-gray-800">Incident #{incident.id}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                                incident.status === 'rescue_in_progress'
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : 'bg-green-200 text-green-800'
                              }`}>
                                {incident.status === 'rescue_in_progress' ? 'IN PROGRESS' : 'COMPLETED'}
                              </span>
                              {/* Solo badge */}
                              {!incident.assignedTeamId && incident.assignedToUserId === user.id && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-lg font-bold bg-orange-100 text-orange-700">
                                  SOLO
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            📍 {incident.latitude?.toFixed(4)}, {incident.longitude?.toFixed(4)}
                          </p>
                          {incident.description && (
                            <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                          )}
                        </div>
                        {incident.status === 'rescue_in_progress' && (
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleMarkAsRescued(incident.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-bold transition"
                            >
                              ✓ Mark Rescued
                            </button>
                            <button
                              onClick={() => handleMarkAsSafeZone(incident.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold transition"
                            >
                              🏳️ Safe Zone
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Completed */}
            {activeTab === 'completed' && (
              <div className="space-y-4">
                {completedIncidents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">🏆</div>
                    <p className="text-gray-500 font-medium">No completed incidents yet</p>
                  </div>
                ) : (
                  completedIncidents.map(incident => (
                    <div key={incident.id} className="border-2 border-green-200 rounded-2xl p-4 bg-green-50 flex items-center gap-4">
                      <span className="text-2xl">✅</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">Incident #{incident.id}</h3>
                        <p className="text-sm text-gray-500">
                          Completed: {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <Link to={`/incidents/${incident.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                        View →
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default RescueTeamDashboard;
