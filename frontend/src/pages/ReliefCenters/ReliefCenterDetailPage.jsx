// FILE: src/pages/ReliefCenters/ReliefCenterDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { reliefCenterAPI } from '../../services/api';

const ReliefCenterDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCenter();
  }, [id]);

  const fetchCenter = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reliefCenterAPI.getCenterById(id);
      const c = response.reliefCenter;
      // Normalize fields
      const normalized = {
        ...c,
        lat: c.latitude ?? c.lat,
        lng: c.longitude ?? c.lng,
        capacity: c.totalCapacity ?? c.capacity,
        currentOccupancy: c.currentOccupancy ?? 0,
        resources: Array.isArray(c.resources)
          ? c.resources
          : Object.entries(c.resources || {})
              .filter(([, v]) => v)
              .map(([k]) => k),
      };
      setCenter(normalized);
    } catch (err) {
      setError('Failed to load relief center details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, border: '4px solid #bfdbfe',
          borderTopColor: '#2563eb', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
        }} />
        <p style={{ color: '#6b7280', fontWeight: 600 }}>Loading center details...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (error || !center) return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 400 }}>
        <p style={{ fontSize: 48, marginBottom: 12 }}>⚠️</p>
        <p style={{ color: '#dc2626', fontWeight: 700, marginBottom: 16 }}>{error || 'Center not found.'}</p>
        <button onClick={() => navigate('/relief-centers')} style={{
          background: '#2563eb', color: '#fff', border: 'none',
          padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
        }}>
          ← Back to Shelters
        </button>
      </div>
    </div>
  );

  const pct = center.capacity > 0 ? (center.currentOccupancy / center.capacity) * 100 : 0;
  const availableSpace = center.capacity - center.currentOccupancy;
  const availability =
    pct >= 90 ? { status: 'Full', color: '#dc2626', bg: '#fee2e2' }
    : pct >= 70 ? { status: 'Limited', color: '#d97706', bg: '#fef3c7' }
    : { status: 'Available', color: '#16a34a', bg: '#dcfce7' };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a3a6b 0%, #2563eb 60%, #1e40af 100%)',
        padding: '20px 24px',
        boxShadow: '0 4px 24px rgba(30,64,175,0.25)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <button onClick={() => navigate('/relief-centers')} style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', padding: '6px 14px', borderRadius: 20,
            cursor: 'pointer', fontSize: 13, marginBottom: 14,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            ← Back to Shelters
          </button>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0 }}>
            🏠 {center.name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', fontSize: 14 }}>
            📌 {center.address}
          </p>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Capacity Card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', gridColumn: '1 / -1' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 16 }}>📊 Capacity Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
              {[
                { label: 'Total Capacity', value: center.capacity, color: '#2563eb' },
                { label: 'Current Occupancy', value: center.currentOccupancy, color: '#d97706' },
                { label: 'Available Spaces', value: availableSpace, color: '#16a34a' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '14px', background: '#f9fafb', borderRadius: 12 }}>
                  <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ background: '#f3f4f6', borderRadius: 99, height: 14, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(pct, 100)}%`, height: '100%',
                background: availability.color, borderRadius: 99,
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{pct.toFixed(0)}% full</span>
              <span style={{
                background: availability.bg, color: availability.color,
                padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              }}>
                {availability.status}
              </span>
            </div>
          </div>

          {/* Info Card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 16 }}>ℹ️ Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {center.contactNumber && (
                <div>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase' }}>Contact</p>
                  <a href={`tel:${center.contactNumber}`} style={{ color: '#2563eb', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                    📞 {center.contactNumber}
                  </a>
                </div>
              )}
              <div>
                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase' }}>Status</p>
                <span style={{ fontSize: 14, fontWeight: 700, color: center.isActive ? '#16a34a' : '#dc2626' }}>
                  {center.isActive ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>
              {center.createdAt && (
                <div>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase' }}>Added On</p>
                  <p style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>
                    {new Date(center.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Resources Card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 16 }}>🎒 Available Resources</h2>
            {center.resources && center.resources.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {center.resources.map((r, i) => (
                  <span key={i} style={{
                    background: '#eff6ff', color: '#1d4ed8',
                    padding: '6px 14px', borderRadius: 20,
                    fontSize: 13, fontWeight: 600,
                  }}>
                    {r}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>No resources listed.</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {center.lat && center.lng && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#16a34a', color: '#fff', padding: '12px 24px',
                borderRadius: 10, fontWeight: 700, fontSize: 14,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              📍 Get Directions
            </a>
          )}
          <Link
            to="/relief-centers"
            style={{
              background: '#f3f4f6', color: '#374151', padding: '12px 24px',
              borderRadius: 10, fontWeight: 700, fontSize: 14,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            ← All Shelters
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReliefCenterDetailPage;
