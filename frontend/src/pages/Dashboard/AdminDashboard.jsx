// FILE: src/pages/Dashboard/AdminDashboard.jsx

import React, { useState, useEffect, useContext } from 'react';
import { incidentAPI, reliefCenterAPI, rescueTeamAPI } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

// ─────────────────────────────────────────────
// Helper: is incident completed?
// ─────────────────────────────────────────────
const isCompleted = (status) =>
  status === 'rescued' || status === 'safe_zone' || status === 'fake_report';

// ─────────────────────────────────────────────
// Add Shelter Modal
// ─────────────────────────────────────────────
const AddShelterModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '', address: '', latitude: '', longitude: '',
    totalCapacity: '', contactNumber: '', resources: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.name || !form.address || !form.latitude || !form.longitude || !form.totalCapacity) {
      setError('Please fill in all required fields.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const resourceArr = form.resources
        ? form.resources.split(',').map((r) => r.trim()).filter(Boolean)
        : [];
      await reliefCenterAPI.createCenter({
        ...form,
        resources: resourceArr,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        totalCapacity: parseInt(form.totalCapacity),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create shelter.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 32,
        width: '100%', maxWidth: 540,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
            🏠 Add New Shelter
          </h2>
          <button onClick={onClose} style={{
            background: '#f3f4f6', border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#6b7280',
          }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ color: '#dc2626', fontSize: 13, margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Shelter Name *', name: 'name', placeholder: 'e.g. Government School Hall' },
            { label: 'Address *', name: 'address', placeholder: 'Full address' },
            { label: 'Latitude *', name: 'latitude', placeholder: 'e.g. 17.3850', type: 'number' },
            { label: 'Longitude *', name: 'longitude', placeholder: 'e.g. 78.4867', type: 'number' },
            { label: 'Total Capacity *', name: 'totalCapacity', placeholder: 'e.g. 200', type: 'number' },
            { label: 'Contact Number', name: 'contactNumber', placeholder: 'e.g. +91 9876543210' },
            { label: 'Resources (comma separated)', name: 'resources', placeholder: 'Food, Water, Medical, Bedding' },
          ].map((field) => (
            <div key={field.name}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>
                {field.label}
              </label>
              <input
                type={field.type || 'text'}
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                placeholder={field.placeholder}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 9,
                  border: '2px solid #e5e7eb', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={handleSubmit} disabled={saving} style={{
            flex: 1, background: saving ? '#93c5fd' : '#2563eb',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '12px 0', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving...' : '✓ Create Shelter'}
          </button>
          <button onClick={onClose} style={{
            flex: 1, background: '#f3f4f6', color: '#374151',
            border: 'none', borderRadius: 10,
            padding: '12px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Shelter Delete Confirm Modal
// ─────────────────────────────────────────────
const ShelterDeleteModal = ({ center, onClose, onConfirm, deleting }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
  }}>
    <div style={{
      background: '#fff', borderRadius: 20, padding: 32,
      width: '100%', maxWidth: 420,
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Delete Shelter?</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
        Are you sure you want to delete <strong>{center?.name}</strong>? This cannot be undone.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onConfirm} disabled={deleting} style={{
          flex: 1, background: deleting ? '#fca5a5' : '#dc2626',
          color: '#fff', border: 'none', borderRadius: 10,
          padding: '12px 0', fontWeight: 800, fontSize: 14, cursor: deleting ? 'not-allowed' : 'pointer',
        }}>
          {deleting ? 'Deleting...' : '🗑️ Delete'}
        </button>
        <button onClick={onClose} style={{
          flex: 1, background: '#f3f4f6', color: '#374151',
          border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>Cancel</button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Incident Delete Confirm Modal
// ─────────────────────────────────────────────
const IncidentDeleteModal = ({ incident, onClose, onConfirm, deleting }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
  }}>
    <div style={{
      background: '#fff', borderRadius: 20, padding: 32,
      width: '100%', maxWidth: 400,
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
        Delete Incident Report?
      </h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 6 }}>
        You are about to permanently delete
      </p>
      <p style={{ color: '#111827', fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
        Incident #{incident?.id}
      </p>
      <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 24 }}>
        Reporter: {incident?.reporterName} · {incident?.createdAt && new Date(incident.createdAt).toLocaleString()}
      </p>
      <div style={{
        background: '#fef2f2', border: '1px solid #fecaca',
        borderRadius: 10, padding: '10px 14px', marginBottom: 20,
      }}>
        <p style={{ color: '#dc2626', fontSize: 13, margin: 0, fontWeight: 600 }}>
          This will also remove the photo from cloud storage. This cannot be undone.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onConfirm} disabled={deleting} style={{
          flex: 1, background: deleting ? '#fca5a5' : '#dc2626',
          color: '#fff', border: 'none', borderRadius: 10,
          padding: '12px 0', fontWeight: 800, fontSize: 14,
          cursor: deleting ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {deleting
            ? <><span style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Deleting...</>
            : '🗑️ Yes, Delete'
          }
        </button>
        <button onClick={onClose} disabled={deleting} style={{
          flex: 1, background: '#f3f4f6', color: '#374151',
          border: 'none', borderRadius: 10, padding: '12px 0',
          fontWeight: 700, fontSize: 14, cursor: deleting ? 'not-allowed' : 'pointer',
        }}>Cancel</button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Shelters Management Tab
// ─────────────────────────────────────────────
const SheltersTab = () => {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editOccupancy, setEditOccupancy] = useState({});

  useEffect(() => { fetchShelters(); }, []);

  const fetchShelters = async () => {
    try {
      setLoading(true);
      const res = await reliefCenterAPI.getAllCenters();
      setShelters(res.reliefCenters || []);
    } catch (err) {
      console.error('Failed to fetch shelters', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await reliefCenterAPI.deleteCenter(deleteTarget.id);
      setDeleteTarget(null);
      fetchShelters();
    } catch (err) {
      alert('Failed to delete shelter.');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateOccupancy = async (id) => {
    const val = editOccupancy[id];
    if (val === undefined || val === '') return;
    try {
      await reliefCenterAPI.updateCapacity(id, { currentOccupancy: parseInt(val) });
      setEditOccupancy((prev) => { const n = { ...prev }; delete n[id]; return n; });
      fetchShelters();
    } catch (err) {
      alert('Failed to update occupancy.');
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{
        width: 44, height: 44, border: '4px solid #bfdbfe',
        borderTopColor: '#2563eb', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
      }} />
      <p style={{ color: '#6b7280' }}>Loading shelters...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div>
      {showAddModal && <AddShelterModal onClose={() => setShowAddModal(false)} onSuccess={fetchShelters} />}
      {deleteTarget && (
        <ShelterDeleteModal
          center={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
          🏠 Shelter Management ({shelters.length})
        </h2>
        <button onClick={() => setShowAddModal(true)} style={{
          background: '#2563eb', color: '#fff', border: 'none',
          padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>➕ Add Shelter</button>
      </div>

      {shelters.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '60px 0',
          textAlign: 'center', border: '2px dashed #e5e7eb',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏚️</div>
          <p style={{ color: '#6b7280', fontWeight: 600, fontSize: 16 }}>No shelters added yet</p>
          <button onClick={() => setShowAddModal(true)} style={{
            background: '#2563eb', color: '#fff', border: 'none',
            padding: '10px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', marginTop: 12,
          }}>➕ Add First Shelter</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shelters.map((shelter) => {
            const capacity = shelter.totalCapacity ?? shelter.capacity ?? 0;
            const occ = shelter.currentOccupancy ?? 0;
            const pct = capacity > 0 ? (occ / capacity) * 100 : 0;
            const available = capacity - occ;
            const statusColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a';
            const resources = Array.isArray(shelter.resources)
              ? shelter.resources
              : Object.entries(shelter.resources || {}).filter(([, v]) => v).map(([k]) => k);

            return (
              <div key={shelter.id} style={{
                background: '#fff', borderRadius: 14, padding: '18px 22px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: '#111827', margin: '0 0 2px' }}>{shelter.name}</p>
                  <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>📌 {shelter.address}</p>
                  {resources.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {resources.map((r, i) => (
                        <span key={i} style={{
                          background: '#eff6ff', color: '#1d4ed8',
                          padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        }}>{r}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 160 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#6b7280' }}>Occupancy</span>
                    <span style={{ fontWeight: 700 }}>{occ}/{capacity}</span>
                  </div>
                  <div style={{ background: '#f3f4f6', borderRadius: 99, height: 8 }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: statusColor, borderRadius: 99 }} />
                  </div>
                  <p style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                    <strong style={{ color: statusColor }}>{available}</strong> available
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number" min={0} max={capacity}
                    placeholder={`Update (${occ})`}
                    value={editOccupancy[shelter.id] ?? ''}
                    onChange={(e) => setEditOccupancy((prev) => ({ ...prev, [shelter.id]: e.target.value }))}
                    style={{ width: 100, padding: '7px 10px', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: 13, outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <button
                    onClick={() => handleUpdateOccupancy(shelter.id)}
                    disabled={editOccupancy[shelter.id] === undefined || editOccupancy[shelter.id] === ''}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
                  >✓ Update</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link to={`/relief-centers/${shelter.id}`} style={{
                    background: '#eff6ff', color: '#2563eb',
                    padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: 'none',
                  }}>View</Link>
                  <button onClick={() => setDeleteTarget(shelter)} style={{
                    background: '#fef2f2', color: '#dc2626', border: 'none',
                    padding: '8px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Admin Dashboard
// ─────────────────────────────────────────────
const AdminDashboard = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState({
    totalIncidents: 0, pendingVerification: 0, activeRescues: 0,
    completedRescues: 0, totalReliefCenters: 0, totalTeams: 0,
  });
  const [pendingIncidents, setPendingIncidents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [incidentsResponse, centersResponse, teamsResponse] = await Promise.all([
        incidentAPI.getAllIncidents(),
        reliefCenterAPI.getAllCenters(),
        rescueTeamAPI.getAllTeams(),
      ]);
      const incidents = incidentsResponse.incidents || [];
      const centers   = centersResponse.reliefCenters || [];
      const teams     = teamsResponse.teams || [];

      setStats({
        totalIncidents:      incidents.length,
        pendingVerification: incidents.filter(i => i.status === 'pending_verification').length,
        activeRescues:       incidents.filter(i => i.status === 'rescue_in_progress').length,
        completedRescues:    incidents.filter(i => isCompleted(i.status)).length,
        totalReliefCenters:  centers.length,
        totalTeams:          teams.length,
      });
      setPendingIncidents(incidents.filter(i => i.status === 'pending_verification'));
      setRecentActivity(incidents.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveIncident = async (incidentId) => {
    try {
      await incidentAPI.updateIncidentStatus(incidentId, { status: 'unrescued' });
      fetchDashboardData();
    } catch { alert('Failed to approve incident'); }
  };

  const handleRejectIncident = async (incidentId) => {
    try {
      await incidentAPI.updateIncidentStatus(incidentId, { status: 'fake_report' });
      fetchDashboardData();
    } catch { alert('Failed to reject incident'); }
  };

  const handleDeleteIncident = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await incidentAPI.deleteIncident(deleteTarget.id);
      setRecentActivity(prev => prev.filter(i => i.id !== deleteTarget.id));
      setPendingIncidents(prev => prev.filter(i => i.id !== deleteTarget.id));
      setStats(prev => ({ ...prev, totalIncidents: prev.totalIncidents - 1, completedRescues: prev.completedRescues - 1 }));
      setDeleteTarget(null);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete incident. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const statusIcon = (status) => {
    switch (status) {
      case 'unrescued':            return '🔴';
      case 'rescue_in_progress':   return '🟡';
      case 'rescued':              return '🟢';
      case 'safe_zone':            return '✅';
      case 'pending_verification': return '⏳';
      default:                     return '❌';
    }
  };

  const TABS = [
    { key: 'overview',  label: '📊 Overview'  },
    { key: 'shelters',  label: '🏠 Shelters'  },
    { key: 'incidents', label: '⚠️ Incidents' },
  ];

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto" />
        <p className="mt-4 text-gray-500 font-medium">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: 'system-ui, sans-serif' }}>

      {deleteTarget && (
        <IncidentDeleteModal
          incident={deleteTarget}
          onClose={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDeleteIncident}
          deleting={deleting}
        />
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>👨‍💼 Admin Dashboard</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 14 }}>System overview and management</p>
          </div>
          <button onClick={handleLogout} style={{
            background: '#fef2f2', color: '#dc2626', border: '2px solid #fecaca',
            padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>🚪 Logout</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Incidents',  value: stats.totalIncidents,      bg: '#f9fafb', border: '#e5e7eb', color: '#111827' },
            { label: 'Pending Review',   value: stats.pendingVerification,  bg: '#fefce8', border: '#fde047', color: '#854d0e' },
            { label: 'Active Rescues',   value: stats.activeRescues,        bg: '#fff7ed', border: '#fdba74', color: '#7c2d12' },
            { label: 'Completed',        value: stats.completedRescues,     bg: '#f0fdf4', border: '#86efac', color: '#14532d' },
            { label: 'Relief Centers',   value: stats.totalReliefCenters,   bg: '#eff6ff', border: '#93c5fd', color: '#1e3a8a' },
            { label: 'Rescue Teams',     value: stats.totalTeams,           bg: '#faf5ff', border: '#c4b5fd', color: '#4c1d95' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, border: `2px solid ${s.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>{s.label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', width: 'fit-content' }}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '10px 20px', borderRadius: 9, border: 'none',
              background: activeTab === tab.key ? '#2563eb' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#6b7280',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── Shelters Tab ── */}
        {activeTab === 'shelters' && <SheltersTab />}

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <>
            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
              {[
                { action: () => setActiveTab('shelters'), icon: '➕', label: 'Add Relief Center', gradient: 'linear-gradient(135deg,#2563eb,#1e40af)' },
                { to: '/rescue-teams/create',             icon: '👥', label: 'Create Team',       gradient: 'linear-gradient(135deg,#7c3aed,#5b21b6)' },
                { to: '/incidents',                       icon: '📊', label: 'All Incidents',     gradient: 'linear-gradient(135deg,#16a34a,#15803d)' },
                { to: '/map',                             icon: '🗺️', label: 'View Map',          gradient: 'linear-gradient(135deg,#d97706,#b45309)' },
              ].map((a, i) =>
                a.to ? (
                  <Link key={i} to={a.to} style={{
                    background: a.gradient, color: '#fff', borderRadius: 14,
                    padding: '20px 16px', textAlign: 'center',
                    textDecoration: 'none', display: 'block',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = ''}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{a.icon}</div>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{a.label}</p>
                  </Link>
                ) : (
                  <button key={i} onClick={a.action} style={{
                    background: a.gradient, color: '#fff', borderRadius: 14,
                    padding: '20px 16px', textAlign: 'center',
                    border: 'none', cursor: 'pointer', width: '100%',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = ''}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{a.icon}</div>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{a.label}</p>
                  </button>
                )
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Pending Verification */}
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#111827' }}>
                    Pending Verification ({stats.pendingVerification})
                  </h2>
                  {stats.pendingVerification > 0 && (
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                      Needs Attention
                    </span>
                  )}
                </div>
                <div style={{ padding: '16px 22px' }}>
                  {pendingIncidents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                      <p style={{ color: '#6b7280', fontWeight: 600 }}>All incidents verified</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {pendingIncidents.map((incident) => (
                        <div key={incident.id} style={{ border: '2px solid #fef3c7', borderRadius: 12, padding: 14, background: '#fffbeb' }}>
                          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                            {incident.photoUrl && (
                              <img src={incident.photoUrl} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                            )}
                            <div>
                              <p style={{ fontWeight: 800, color: '#111827', margin: '0 0 2px', fontSize: 14 }}>Incident #{incident.id}</p>
                              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px' }}>{new Date(incident.createdAt).toLocaleString()}</p>
                              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Reporter: {incident.reporterName}</p>
                            </div>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                              <span style={{ color: '#6b7280' }}>Verification Score</span>
                              <span style={{ fontWeight: 800 }}>{incident.verificationScore}%</span>
                            </div>
                            <div style={{ background: '#e5e7eb', borderRadius: 99, height: 6 }}>
                              <div style={{
                                width: `${incident.verificationScore}%`, height: '100%', borderRadius: 99,
                                background: incident.verificationScore >= 80 ? '#16a34a' : incident.verificationScore >= 60 ? '#d97706' : '#dc2626',
                              }} />
                            </div>
                          </div>
                          {/* Pending incidents: only Approve + Reject, NO delete (not completed yet) */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleApproveIncident(incident.id)} style={{
                              flex: 1, background: '#16a34a', color: '#fff', border: 'none',
                              padding: '8px 0', borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                            }}>✓ Approve</button>
                            <button onClick={() => handleRejectIncident(incident.id)} style={{
                              flex: 1, background: '#d97706', color: '#fff', border: 'none',
                              padding: '8px 0', borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                            }}>✗ Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#111827' }}>Recent Activity</h2>
                </div>
                <div style={{ padding: '16px 22px' }}>
                  {recentActivity.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                      <p style={{ color: '#6b7280', fontWeight: 600 }}>No recent activity</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recentActivity.map((incident) => (
                        <div key={incident.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', border: '1px solid #f3f4f6', borderRadius: 10,
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          <span style={{ fontSize: 18 }}>{statusIcon(incident.status)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 800, fontSize: 13, color: '#111827', margin: 0 }}>
                              Incident #{incident.id}
                            </p>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {incident.reporterName} · {new Date(incident.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          {/* ── DELETE only when rescued or safe_zone ── */}
                          {isCompleted(incident.status) ? (
                            <button onClick={() => setDeleteTarget(incident)} style={{
                              background: '#fef2f2', color: '#dc2626',
                              border: '1px solid #fecaca', borderRadius: 8,
                              padding: '5px 10px', fontWeight: 700, fontSize: 12,
                              cursor: 'pointer', flexShrink: 0,
                            }}>🗑️ Delete</button>
                          ) : (
                            <span style={{
                              background: '#f3f4f6', color: '#9ca3af',
                              border: '1px solid #e5e7eb', borderRadius: 8,
                              padding: '5px 10px', fontWeight: 600, fontSize: 11,
                              flexShrink: 0,
                            }}>🔒 Active</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Health */}
            <div style={{ marginTop: 20, background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '18px 22px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 16, marginTop: 0 }}>System Health</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Database',       status: 'Connected',     icon: '🗄️' },
                  { label: 'WebSocket',       status: 'Active',        icon: '📡' },
                  { label: 'Image Storage',   status: 'Online',        icon: '🖼️' },
                  { label: 'Weather Monitor', status: 'Polling (30m)', icon: '🌦️' },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 12,
                  }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>{s.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#14532d', margin: 0 }}>{s.status}</p>
                    </div>
                    <span style={{ fontSize: 22 }}>{s.icon}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Incidents Tab ── */}
        {activeTab === 'incidents' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>⚠️ All Incidents</h2>
              <span style={{ background: '#f3f4f6', color: '#374151', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                {recentActivity.length} shown
              </span>
            </div>
            {recentActivity.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px 0' }}>No incidents found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentActivity.map((incident) => (
                  <div key={incident.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', border: '1px solid #f3f4f6', borderRadius: 10,
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <span style={{ fontSize: 20 }}>{statusIcon(incident.status)}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>Incident #{incident.id}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                        {incident.reporterName} · {new Date(incident.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span style={{
                      background: isCompleted(incident.status) ? '#f0fdf4' : '#f3f4f6',
                      color: isCompleted(incident.status) ? '#15803d' : '#374151',
                      border: `1px solid ${isCompleted(incident.status) ? '#86efac' : '#e5e7eb'}`,
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    }}>
                      {incident.status?.replace(/_/g, ' ')}
                    </span>
                    {/* ── DELETE only when rescued or safe_zone ── */}
                    {isCompleted(incident.status) ? (
                      <button onClick={() => setDeleteTarget(incident)} style={{
                        background: '#fef2f2', color: '#dc2626',
                        border: '1px solid #fecaca', borderRadius: 8,
                        padding: '6px 12px', fontWeight: 700, fontSize: 12,
                        cursor: 'pointer', flexShrink: 0,
                      }}>🗑️ Delete</button>
                    ) : (
                      <span style={{
                        background: '#f3f4f6', color: '#9ca3af',
                        border: '1px solid #e5e7eb', borderRadius: 8,
                        padding: '6px 12px', fontWeight: 600, fontSize: 11,
                        flexShrink: 0,
                      }}>🔒 Active</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
