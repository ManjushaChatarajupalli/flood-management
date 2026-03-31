import axios from 'axios';

// Base API URL - update this to match your backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authentication token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// === INCIDENT API ===
export const incidentAPI = {
  createIncident: async (formData) => {
    const response = await api.post('/incidents/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getAllIncidents: async () => {
    const response = await api.get('/incidents');
    return response.data;
  },

  getIncidentById: async (id) => {
    const response = await api.get(`/incidents/${id}`);
    return response.data;
  },

  updateIncidentStatus: async (id, statusData) => {
    const response = await api.put(`/incidents/${id}/status`, statusData);
    return response.data;
  },

  verifyIncident: async (id, verificationData) => {
    const response = await api.post(`/incidents/${id}/verify`, verificationData);
    return response.data;
  },

  deleteIncident: async (id) => {
    const response = await api.delete(`/incidents/${id}`);
    return response.data;
  }
};

// === RELIEF CENTER API ===
export const reliefCenterAPI = {
  // GET all centers (optionally pass { lat, lng } to sort by distance)
  getAllCenters: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.lat) query.append('lat', params.lat);
    if (params.lng) query.append('lng', params.lng);
    if (params.radius) query.append('radius', params.radius);
    const queryString = query.toString();
    const response = await api.get(
      `/relief-centers${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  // GET single center by ID
  getCenterById: async (id) => {
    const response = await api.get(`/relief-centers/${id}`);
    return response.data;
  },

  // POST create a new center (admin only)
  createCenter: async (data) => {
    const response = await api.post('/relief-centers', data);
    return response.data;
  },

  // PUT update center details (admin only)
  updateCenter: async (id, data) => {
    const response = await api.put(`/relief-centers/${id}`, data);
    return response.data;
  },

  // PUT update occupancy only (admin + rescue_team)
  updateCapacity: async (id, data) => {
    const response = await api.put(`/relief-centers/${id}/capacity`, data);
    return response.data;
  },

  // DELETE a center (admin only)
  deleteCenter: async (id) => {
    const response = await api.delete(`/relief-centers/${id}`);
    return response.data;
  },

  // GET nearest center by coordinates
  findNearest: async (latitude, longitude) => {
    const response = await api.get(
      `/relief-centers/nearest?latitude=${latitude}&longitude=${longitude}`
    );
    return response.data;
  },
};

// === AUTH API ===
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

// === RESCUE TEAM API ===
export const rescueTeamAPI = {
  getAllTeams: async () => {
    const response = await api.get('/rescue-teams');
    return response.data;
  },

  getTeamById: async (id) => {
    const response = await api.get(`/rescue-teams/${id}`);
    return response.data;
  },

  createTeam: async (data) => {
    const response = await api.post('/rescue-teams', data);
    return response.data;
  },

  updateTeam: async (id, data) => {
    const response = await api.put(`/rescue-teams/${id}`, data);
    return response.data;
  },

  deleteTeam: async (id) => {
    const response = await api.delete(`/rescue-teams/${id}`);
    return response.data;
  },

  // GET all users with rescue_team role (for form dropdowns)
  getAvailableMembers: async () => {
    const response = await api.get('/rescue-teams/members/available');
    return response.data;
  }
};

export default api;