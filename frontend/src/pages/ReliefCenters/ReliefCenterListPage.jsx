// FILE: src/pages/ReliefCenters/ReliefCenterListPage.jsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { reliefCenterAPI } from '../../services/api';

const ReliefCenterListPage = () => {
  const [shelters, setShelters] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [sortBy, setSortBy] = useState('distance');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user location first, then fetch shelters
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          fetchShelters(loc);
        },
        () => {
          fetchShelters(null);
        }
      );
    } else {
      fetchShelters(null);
    }
  }, []);

  const fetchShelters = async (loc) => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (loc) {
        response = await reliefCenterAPI.getAllCenters({
          lat: loc.lat,
          lng: loc.lng,
        });
      } else {
        response = await reliefCenterAPI.getAllCenters();
      }
      // Normalize field names from backend (latitude/longitude → lat/lng)
      const normalized = (response.reliefCenters || []).map((c) => ({
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
      }));
      setShelters(normalized);
    } catch (err) {
      console.error('Failed to fetch relief centers:', err);
      setError('Failed to load shelters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getDistanceText = (shelter) => {
    if (!userLocation || !shelter.lat || !shelter.lng) return null;
    const d = calculateDistance(userLocation.lat, userLocation.lng, shelter.lat, shelter.lng);
    return d < 1 ? `${(d * 1000).toFixed(0)}m` : `${d.toFixed(1)}km`;
  };

  const sortedShelters = [...shelters].sort((a, b) => {
    if (sortBy === 'distance' && userLocation) {
      const dA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
      const dB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return dA - dB;
    } else if (sortBy === 'capacity') {
      return (b.capacity - b.currentOccupancy) - (a.capacity - a.currentOccupancy);
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  const getAvailability = (shelter) => {
    const pct = shelter.capacity > 0 ? (shelter.currentOccupancy / shelter.capacity) * 100 : 0;
    if (pct >= 90) return { status: 'Full', color: 'red' };
    if (pct >= 70) return { status: 'Limited', color: 'yellow' };
    return { status: 'Available', color: 'green' };
  };

  const totalCapacity = shelters.reduce((s, c) => s + (c.capacity || 0), 0);
  const totalAvailable = shelters.reduce((s, c) => s + ((c.capacity || 0) - (c.currentOccupancy || 0)), 0);

  return (
    <div className="min-h-screen" style={{ background: '#f0f4ff', fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a3a6b 0%, #2563eb 60%, #1e40af 100%)',
        padding: '0',
        boxShadow: '0 4px 24px rgba(30,64,175,0.25)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 20,
              cursor: 'pointer',
              fontSize: 13,
              marginBottom: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← Back to Home
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                🏠 Available Shelters
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', margin: '4px 0 0', fontSize: 14 }}>
                Find nearest relief centers with available capacity
              </p>
            </div>
            <button
              onClick={() => fetchShelters(userLocation)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Shelters', value: shelters.length, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Total Capacity', value: totalCapacity, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Available Spaces', value: totalAvailable, color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
          ].map((s, i) => (
            <div key={i} style={{
              background: s.bg,
              border: `2px solid ${s.border}`,
              borderRadius: 14,
              padding: '18px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Sort bar */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '14px 20px',
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Sort by:</span>
          {[
            { key: 'distance', label: '📍 Distance' },
            { key: 'capacity', label: '🏠 Availability' },
            { key: 'name', label: '🔤 Name' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                background: sortBy === opt.key ? '#2563eb' : '#f3f4f6',
                color: sortBy === opt.key ? '#fff' : '#374151',
                transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{
              width: 52, height: 52, border: '4px solid #bfdbfe',
              borderTopColor: '#2563eb', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
            }} />
            <p style={{ color: '#6b7280', fontWeight: 600 }}>Loading shelters...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={{
            background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 14,
            padding: 32, textAlign: 'center',
          }}>
            <p style={{ color: '#dc2626', fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>⚠️ {error}</p>
            <button
              onClick={() => fetchShelters(userLocation)}
              style={{
                background: '#dc2626', color: '#fff', border: 'none',
                padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
              }}
            >
              Try Again
            </button>
          </div>
        ) : sortedShelters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🏚️</div>
            <p style={{ color: '#6b7280', fontSize: 18, fontWeight: 600 }}>No shelters available at this time.</p>
            <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 6 }}>Check back later or contact the admin.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {sortedShelters.map((shelter) => {
              const avail = getAvailability(shelter);
              const distance = getDistanceText(shelter);
              const availableSpace = (shelter.capacity || 0) - (shelter.currentOccupancy || 0);
              const pct = shelter.capacity > 0 ? (shelter.currentOccupancy / shelter.capacity) * 100 : 0;

              const colorMap = {
                green: { bar: '#16a34a', badge: '#dcfce7', badgeText: '#15803d', stripe: '#16a34a' },
                yellow: { bar: '#d97706', badge: '#fef3c7', badgeText: '#92400e', stripe: '#d97706' },
                red: { bar: '#dc2626', badge: '#fee2e2', badgeText: '#991b1b', stripe: '#dc2626' },
              };
              const colors = colorMap[avail.color];

              return (
                <div key={shelter.id} style={{
                  background: '#fff',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  border: '1px solid #e5e7eb',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.13)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
                >
                  {/* Color stripe */}
                  <div style={{ height: 5, background: colors.stripe }} />

                  <div style={{ padding: '20px 22px' }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>
                        {shelter.name}
                      </h3>
                      {distance && (
                        <span style={{
                          background: '#eff6ff', color: '#1d4ed8',
                          padding: '3px 10px', borderRadius: 20,
                          fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                        }}>
                          📍 {distance}
                        </span>
                      )}
                    </div>

                    <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
                      📌 {shelter.address}
                    </p>

                    {/* Capacity bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                        <span style={{ fontWeight: 700, color: '#374151' }}>Occupancy</span>
                        <span style={{ color: '#6b7280' }}>
                          {shelter.currentOccupancy} / {shelter.capacity}
                        </span>
                      </div>
                      <div style={{ background: '#f3f4f6', borderRadius: 99, height: 10, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(pct, 100)}%`,
                          height: '100%',
                          background: colors.bar,
                          borderRadius: 99,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        <strong style={{ color: colors.badgeText }}>{availableSpace}</strong> spaces available
                      </p>
                    </div>

                    {/* Resources */}
                    {shelter.resources && shelter.resources.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Resources
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {shelter.resources.map((r, i) => (
                            <span key={i} style={{
                              background: '#f3f4f6', color: '#374151',
                              padding: '3px 10px', borderRadius: 20,
                              fontSize: 12, fontWeight: 500,
                            }}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact */}
                    {shelter.contactNumber && (
                      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
                        📞 <a href={`tel:${shelter.contactNumber}`} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                          {shelter.contactNumber}
                        </a>
                      </p>
                    )}

                    {/* Status badge */}
                    <span style={{
                      display: 'inline-block',
                      background: colors.badge, color: colors.badgeText,
                      padding: '4px 12px', borderRadius: 20,
                      fontSize: 12, fontWeight: 700,
                      marginBottom: 16,
                    }}>
                      {avail.status === 'Available' ? '✅' : avail.status === 'Limited' ? '⚠️' : '🔴'} {avail.status}
                    </span>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link
                        to={`/relief-centers/${shelter.id}`}
                        style={{
                          flex: 1, background: '#2563eb', color: '#fff',
                          textAlign: 'center', padding: '10px 0',
                          borderRadius: 9, fontWeight: 700, fontSize: 13,
                          textDecoration: 'none', display: 'block',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                        onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
                      >
                        View Details
                      </Link>
                      {shelter.lat && shelter.lng && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: '#16a34a', color: '#fff',
                            padding: '10px 14px', borderRadius: 9,
                            fontWeight: 700, fontSize: 16,
                            textDecoration: 'none', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
                          onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}
                          title="Get Directions"
                        >
                          📍
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReliefCenterListPage;
