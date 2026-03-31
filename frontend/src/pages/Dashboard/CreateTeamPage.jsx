// FILE: src/pages/Dashboard/CreateTeamPage.jsx
// Route: /rescue-teams/create  (admin only)

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { rescueTeamAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const CreateTeamPage = () => {
  const { user } = useContext(AuthContext);
  const navigate  = useNavigate();

  const [form, setForm] = useState({
    teamName:     '',
    teamLeaderId: '',
    memberIds:    [],
    area:         '',
  });

  const [availableMembers, setAvailableMembers] = useState([]);
  const [loadingMembers, setLoadingMembers]     = useState(true);
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState('');

  // ── Fetch all rescue_team users for dropdowns ──
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        const res = await rescueTeamAPI.getAvailableMembers();
        setAvailableMembers(res.members || []);
      } catch (err) {
        setError('Failed to load rescue team members. Please refresh.');
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, []);

  const handleChange = (e) => {
    setError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Toggle member selection ──
  const toggleMember = (memberId) => {
    setForm(prev => {
      const id = parseInt(memberId);
      const already = prev.memberIds.includes(id);
      return {
        ...prev,
        memberIds: already
          ? prev.memberIds.filter(m => m !== id)
          : [...prev.memberIds, id],
      };
    });
  };

  // ── Validation ──
  const validate = () => {
    if (!form.teamName.trim())   return 'Team name is required.';
    if (!form.teamLeaderId)      return 'Please select a team leader.';
    return null;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    try {
      setSaving(true);
      setError('');

      // Ensure leader is always in memberIds
      const allMemberIds = form.memberIds.includes(parseInt(form.teamLeaderId))
        ? form.memberIds
        : [parseInt(form.teamLeaderId), ...form.memberIds];

      await rescueTeamAPI.createTeam({
        teamName:     form.teamName.trim(),
        teamLeaderId: parseInt(form.teamLeaderId),
        memberIds:    allMemberIds,
        area:         form.area.trim(),
      });

      setSuccess(`Team "${form.teamName}" created successfully!`);
      setTimeout(() => navigate('/admin/dashboard'), 1500);

    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Members available for leader dropdown ──
  const leaderOptions = availableMembers;

  // ── Members available for member multi-select (exclude chosen leader) ──
  const memberOptions = availableMembers.filter(
    m => String(m.id) !== String(form.teamLeaderId)
  );

  const selectedLeader = availableMembers.find(m => String(m.id) === String(form.teamLeaderId));

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: 'system-ui, sans-serif', padding: '32px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              background: '#fff', border: '2px solid #e5e7eb', borderRadius: 10,
              padding: '8px 14px', cursor: 'pointer', fontWeight: 700,
              fontSize: 14, color: '#374151',
            }}
          >
            ← Back
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
              👥 Create Rescue Team
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 0' }}>
              Assign a leader and members to form a new team
            </p>
          </div>
        </div>

        {/* Success banner */}
        {success && (
          <div style={{
            background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12,
            padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <p style={{ color: '#15803d', fontWeight: 700, margin: 0, fontSize: 14 }}>{success}</p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 12,
            padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <p style={{ color: '#dc2626', fontWeight: 600, margin: 0, fontSize: 14 }}>{error}</p>
          </div>
        )}

        {/* Form card */}
        <div style={{
          background: '#fff', borderRadius: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden',
        }}>

          {/* ── Section 1: Basic Info ── */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#7c3aed', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>1</span>
              Basic Information
            </h2>

            {/* Team Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                Team Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="teamName"
                value={form.teamName}
                onChange={handleChange}
                placeholder="e.g. Alpha Rescue Unit"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '2px solid #e5e7eb', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Area / Zone */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                Operational Area / Zone
                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>(optional)</span>
              </label>
              <input
                type="text"
                name="area"
                value={form.area}
                onChange={handleChange}
                placeholder="e.g. North Vijayawada, Krishna District Zone 2"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '2px solid #e5e7eb', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* ── Section 2: Team Leader ── */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#7c3aed', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>2</span>
              Team Leader <span style={{ color: '#dc2626', fontWeight: 400 }}>*</span>
            </h2>

            {loadingMembers ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: 13 }}>
                <div style={{ width: 16, height: 16, border: '2px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Loading rescue team members...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : leaderOptions.length === 0 ? (
              <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderRadius: 10, padding: '12px 16px' }}>
                <p style={{ color: '#92400e', fontSize: 13, fontWeight: 600, margin: 0 }}>
                  ⚠️ No rescue team members found. Register users with the "rescue_team" role first.
                </p>
              </div>
            ) : (
              <>
                <select
                  name="teamLeaderId"
                  value={form.teamLeaderId}
                  onChange={handleChange}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    border: '2px solid #e5e7eb', fontSize: 14,
                    outline: 'none', background: '#fff', cursor: 'pointer',
                    appearance: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                >
                  <option value="">— Select team leader —</option>
                  {leaderOptions.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.phone ? `· ${m.phone}` : ''} {m.email ? `(${m.email})` : ''}
                    </option>
                  ))}
                </select>

                {/* Leader preview card */}
                {selectedLeader && (
                  <div style={{
                    marginTop: 12, background: '#faf5ff', border: '2px solid #c4b5fd',
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: '#7c3aed', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 14, flexShrink: 0,
                    }}>
                      {selectedLeader.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 13, color: '#4c1d95', margin: 0 }}>
                        {selectedLeader.name}
                      </p>
                      <p style={{ fontSize: 11, color: '#7c3aed', margin: 0 }}>
                        {selectedLeader.email}
                        {selectedLeader.phone && ` · ${selectedLeader.phone}`}
                      </p>
                    </div>
                    <span style={{
                      marginLeft: 'auto', background: '#7c3aed', color: '#fff',
                      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    }}>LEADER</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Section 3: Team Members ── */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#7c3aed', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>3</span>
              Team Members
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(optional — select one or more)</span>
            </h2>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 14px 30px' }}>
              The selected leader is automatically a member.
            </p>

            {!loadingMembers && memberOptions.length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
                {form.teamLeaderId
                  ? 'No other rescue members available to add.'
                  : 'Select a leader first to see available members.'}
              </p>
            )}

            {!loadingMembers && memberOptions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {memberOptions.map(member => {
                  const isSelected = form.memberIds.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${isSelected ? '#c4b5fd' : '#e5e7eb'}`,
                        background: isSelected ? '#faf5ff' : '#fff',
                        transition: 'all 0.15s',
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${isSelected ? '#7c3aed' : '#d1d5db'}`,
                        background: isSelected ? '#7c3aed' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                      </div>

                      {/* Avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: isSelected ? '#7c3aed' : '#e5e7eb',
                        color: isSelected ? '#fff' : '#6b7280',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 13,
                      }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#4c1d95' : '#111827', margin: 0 }}>
                          {member.name}
                        </p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                          {member.email}
                          {member.phone && ` · ${member.phone}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected members count */}
            {form.memberIds.length > 0 && (
              <div style={{
                marginTop: 12, background: '#f3f4f6', borderRadius: 8,
                padding: '8px 12px', fontSize: 12, color: '#374151', fontWeight: 600,
              }}>
                {form.memberIds.length + (form.teamLeaderId && !form.memberIds.includes(parseInt(form.teamLeaderId)) ? 1 : 0)} member(s) selected
                {form.teamLeaderId && ` (including leader)`}
              </div>
            )}
          </div>

          {/* ── Summary + Submit ── */}
          <div style={{ padding: '24px 28px' }}>

            {/* Summary preview */}
            {form.teamName && form.teamLeaderId && (
              <div style={{
                background: '#f0fdf4', border: '2px solid #86efac',
                borderRadius: 12, padding: '14px 16px', marginBottom: 20,
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Team Summary
                </p>
                <p style={{ fontSize: 14, color: '#14532d', fontWeight: 800, margin: '0 0 2px' }}>
                  {form.teamName}
                </p>
                <p style={{ fontSize: 12, color: '#16a34a', margin: '0 0 2px' }}>
                  Leader: {selectedLeader?.name}
                </p>
                {form.area && (
                  <p style={{ fontSize: 12, color: '#16a34a', margin: '0 0 2px' }}>
                    Area: {form.area}
                  </p>
                )}
                <p style={{ fontSize: 12, color: '#16a34a', margin: 0 }}>
                  Total members: {
                    new Set([
                      parseInt(form.teamLeaderId),
                      ...form.memberIds
                    ]).size
                  }
                </p>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSubmit}
                disabled={saving || !!success}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
                  background: saving || success ? '#c4b5fd' : '#7c3aed',
                  color: '#fff', fontWeight: 800, fontSize: 15,
                  cursor: saving || success ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.2s',
                }}
              >
                {saving
                  ? <><div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Creating...</>
                  : success
                    ? '✅ Created!'
                    : '👥 Create Team'
                }
              </button>
              <button
                onClick={() => navigate('/admin/dashboard')}
                disabled={saving}
                style={{
                  padding: '13px 20px', borderRadius: 12,
                  border: '2px solid #e5e7eb', background: '#fff',
                  color: '#374151', fontWeight: 700, fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamPage;
