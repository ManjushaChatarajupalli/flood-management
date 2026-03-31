import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Pages
import HomePage from '../pages/Home/HomePage';
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import AdminDashboard from '../pages/Dashboard/AdminDashboard';
import CitizenDashboard from '../pages/Dashboard/CitizenDashboard';
import RescueTeamDashboard from '../pages/Dashboard/RescueTeamDashboard';
import CreateTeamPage from '../pages/Dashboard/CreateTeamPage';
import ReportIncidentPage from '../pages/Incidents/ReportIncidentPage';
import IncidentDetailPage from '../pages/Incidents/IncidentDetailPage';
import IncidentListPage from '../pages/Incidents/IncidentListPage';
import ReliefCenterListPage from '../pages/ReliefCenters/ReliefCenterListPage';
import ReliefCenterDetailPage from '../pages/ReliefCenters/ReliefCenterDetailPage';
import NotFoundPage from '../pages/NotFound/NotFoundPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import MapContainerComponent from '../components/map/MapContainer/MapContainer';

// ── Protected Route ──
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'admin')        return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'rescue_team')  return <Navigate to="/rescue/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// ── Public Route ──
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    if (user?.role === 'admin')       return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'rescue_team') return <Navigate to="/rescue/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>

      {/* ── Public Routes ── */}
      <Route path="/" element={<HomePage />} />

      <Route path="/map" element={
        <div className="h-screen w-full"><MapContainerComponent /></div>
      } />

      <Route path="/incidents"     element={<IncidentListPage />} />
      <Route path="/incidents/:id" element={<IncidentDetailPage />} />

      <Route path="/relief-centers"     element={<ReliefCenterListPage />} />
      <Route path="/relief-centers/:id" element={<ReliefCenterDetailPage />} />
      <Route path="/shelters"           element={<ReliefCenterListPage />} />
      <Route path="/shelters/:id"       element={<ReliefCenterDetailPage />} />

      <Route path="/report-emergency" element={<ReportIncidentPage />} />

      {/* ── Auth Routes ── */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* ── Protected Routes ── */}

      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['citizen']}>
          <CitizenDashboard />
        </ProtectedRoute>
      } />

      <Route path="/rescue/dashboard" element={
        <ProtectedRoute allowedRoles={['rescue_team']}>
          <RescueTeamDashboard />
        </ProtectedRoute>
      } />

      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={['citizen', 'rescue_team', 'admin']}>
          <ProfilePage />
        </ProtectedRoute>
      } />

      {/* ── FIX: now points to CreateTeamPage instead of AdminDashboard ── */}
      <Route path="/rescue-teams/create" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <CreateTeamPage />
        </ProtectedRoute>
      } />

      {/* ── 404 ── */}
      <Route path="*" element={<NotFoundPage />} />

    </Routes>
  );
};

export default AppRoutes;
