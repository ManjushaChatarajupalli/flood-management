// src/config/app.config.js

// ============================================
// APPLICATION CONFIGURATION
// ============================================
// This file contains all centralized configuration
// for the Flood Management System application.

/**
 * Main application configuration object
 * Contains settings for API, Map, Markers, Alerts, and more
 */
export const APP_CONFIG = {
  
  // ==========================================
  // API CONFIGURATION
  // ==========================================
  /**
   * Base URL for all API requests
   * Reads from environment variable or defaults to localhost
   * Usage: axios.get(`${APP_CONFIG.API_BASE_URL}/incidents`)
   */
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  
  /**
   * WebSocket server URL for real-time communication
   * Used by Socket.io client
   * Usage: io.connect(APP_CONFIG.SOCKET_URL)
   */
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
  
  
  // ==========================================
  // MAP CONFIGURATION
  // ==========================================
  /**
   * Settings for Leaflet map display
   */
  MAP: {
    /**
     * Default map center coordinates [latitude, longitude]
     * Current: Pune, India
     * Change to your city's coordinates
     */
    DEFAULT_CENTER: [18.5204, 73.8567],
    
    /**
     * Default zoom level (1-18)
     * 1 = World view
     * 10 = City view
     * 13 = District view (default)
     * 18 = Street level
     */
    DEFAULT_ZOOM: 13,
    
    /**
     * Minimum zoom level (user can't zoom out beyond this)
     */
    MIN_ZOOM: 10,
    
    /**
     * Maximum zoom level (user can't zoom in beyond this)
     */
    MAX_ZOOM: 18,
    
    /**
     * URL template for map tiles
     * OpenStreetMap is free and open-source
     * Alternative: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
     */
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    
    /**
     * Attribution text (required by map provider)
     * Displayed in bottom right corner of map
     */
    ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  
  
  // ==========================================
  // MARKER TYPES CONFIGURATION
  // ==========================================
  /**
   * Configuration for different marker types on the map
   * Each type has color, label, and icon
   */
  MARKER_TYPES: {
    /**
     * Red markers - Unreported/Pending emergencies
     */
    EMERGENCY: {
      color: '#EF4444',              // Red (Tailwind red-500)
      label: 'Unreported Emergency',
      icon: '🚨'                     // Emergency siren emoji
    },
    
    /**
     * Yellow markers - Rescue operations in progress
     */
    IN_PROGRESS: {
      color: '#F59E0B',              // Yellow/Orange (Tailwind yellow-500)
      label: 'Rescue In Progress',
      icon: '🚑'                     // Ambulance emoji
    },
    
    /**
     * Green markers - Areas marked as safe
     */
    SAFE_ZONE: {
      color: '#10B981',              // Green (Tailwind green-500)
      label: 'Safe Zone',
      icon: '✅'                     // Check mark emoji
    },
    
    /**
     * Blue markers - Available shelters/relief centers
     */
    SHELTER: {
      color: '#3B82F6',              // Blue (Tailwind blue-500)
      label: 'Available Shelter',
      icon: '🏠'                     // House emoji
    },
    
    /**
     * Purple markers - Active rescue teams
     */
    RESCUE_TEAM: {
      color: '#8B5CF6',              // Purple (Tailwind purple-500)
      label: 'Rescue Team',
      icon: '👥'                     // People emoji
    }
  },
  
  
  // ==========================================
  // ALERT LEVELS CONFIGURATION
  // ==========================================
  /**
   * Flood alert/warning levels
   * Used for displaying alert banners and notifications
   */
  ALERT_LEVELS: {
    /**
     * Low risk level - Normal conditions
     */
    LOW: {
      level: 'low',
      color: 'green',
      label: 'Low Risk',
      bgColor: 'bg-green-100',       // Light green background
      textColor: 'text-green-800',   // Dark green text
      borderColor: 'border-green-300'
    },
    
    /**
     * Moderate risk level - Be prepared
     */
    MODERATE: {
      level: 'moderate',
      color: 'yellow',
      label: 'Moderate Risk',
      bgColor: 'bg-yellow-100',      // Light yellow background
      textColor: 'text-yellow-800',  // Dark yellow text
      borderColor: 'border-yellow-300'
    },
    
    /**
     * High risk level - Take action
     */
    HIGH: {
      level: 'high',
      color: 'orange',
      label: 'High Risk',
      bgColor: 'bg-orange-100',      // Light orange background
      textColor: 'text-orange-800',  // Dark orange text
      borderColor: 'border-orange-300'
    },
    
    /**
     * Severe risk level - Immediate danger
     */
    SEVERE: {
      level: 'severe',
      color: 'red',
      label: 'Severe Risk',
      bgColor: 'bg-red-100',         // Light red background
      textColor: 'text-red-800',     // Dark red text
      borderColor: 'border-red-300'
    }
  },
  
  
  // ==========================================
  // UPDATE INTERVALS (in milliseconds)
  // ==========================================
  /**
   * How often to refresh different types of data
   * Lower values = more frequent updates = more server load
   */
  UPDATE_INTERVALS: {
    /**
     * Rescue team GPS location updates
     * 5000ms = 5 seconds (frequent for real-time tracking)
     */
    TEAM_LOCATION: 5000,
    
    /**
     * Incident status updates
     * 10000ms = 10 seconds (moderate frequency)
     */
    INCIDENTS: 10000,
    
    /**
     * Shelter capacity updates
     * 30000ms = 30 seconds (less frequent, changes slowly)
     */
    SHELTERS: 30000,
    
    /**
     * General map data refresh
     * 15000ms = 15 seconds
     */
    MAP_REFRESH: 15000
  },
  
  
  // ==========================================
  // FILE UPLOAD CONFIGURATION
  // ==========================================
  /**
   * Settings for image/file uploads
   */
  FILE_UPLOAD: {
    /**
     * Maximum file size in bytes
     * 5 * 1024 * 1024 = 5,242,880 bytes = 5MB
     */
    MAX_SIZE: 5 * 1024 * 1024,
    
    /**
     * Accepted MIME types for upload
     * Only JPEG and PNG images allowed
     */
    ACCEPTED_TYPES: [
      'image/jpeg',
      'image/jpg',
      'image/png'
    ],
    
    /**
     * Image compression quality (0.0 to 1.0)
     * 0.7 = 70% quality
     * Lower = smaller file size, lower quality
     * Higher = larger file size, better quality
     */
    COMPRESSION_QUALITY: 0.7,
    
    /**
     * Maximum dimensions for uploaded images (pixels)
     */
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080
  },
  
  
  // ==========================================
  // PAGINATION CONFIGURATION
  // ==========================================
  /**
   * Settings for paginated lists
   */
  PAGINATION: {
    /**
     * Number of items to display per page
     */
    ITEMS_PER_PAGE: 10,
    
    /**
     * Number of page buttons to show in pagination controls
     */
    PAGE_BUTTONS_TO_SHOW: 5
  },
  
  
  // ==========================================
  // NOTIFICATION SETTINGS
  // ==========================================
  /**
   * Toast notification durations
   */
  NOTIFICATION: {
    /**
     * Duration in milliseconds before auto-dismiss
     */
    SUCCESS_DURATION: 3000,    // 3 seconds
    ERROR_DURATION: 5000,      // 5 seconds
    INFO_DURATION: 4000,       // 4 seconds
    WARNING_DURATION: 4500     // 4.5 seconds
  },
  
  
  // ==========================================
  // GEOLOCATION SETTINGS
  // ==========================================
  /**
   * GPS/Geolocation API settings
   */
  GEOLOCATION: {
    /**
     * Enable high accuracy GPS
     * true = More accurate but slower and uses more battery
     * false = Less accurate but faster
     */
    ENABLE_HIGH_ACCURACY: true,
    
    /**
     * Timeout for geolocation request (milliseconds)
     * 10000ms = 10 seconds
     */
    TIMEOUT: 10000,
    
    /**
     * Maximum age of cached position (milliseconds)
     * 0 = Always get fresh position
     */
    MAXIMUM_AGE: 0
  },
  
  
  // ==========================================
  // DISTANCE CALCULATION
  // ==========================================
  /**
   * Distance display settings
   */
  DISTANCE: {
    /**
     * Unit for distance display
     * Options: 'km' or 'miles'
     */
    UNIT: 'km',
    
    /**
     * Decimal places for distance display
     */
    DECIMAL_PLACES: 2
  },
  
  
  // ==========================================
  // DATE/TIME FORMATS
  // ==========================================
  /**
   * Date and time display formats
   */
  DATE_FORMAT: {
    /**
     * Full date and time format
     * Example: "Jan 15, 2024 3:30 PM"
     */
    FULL: 'MMM dd, yyyy h:mm a',
    
    /**
     * Short date format
     * Example: "01/15/2024"
     */
    SHORT: 'MM/dd/yyyy',
    
    /**
     * Time only format
     * Example: "3:30 PM"
     */
    TIME: 'h:mm a',
    
    /**
     * Relative time format
     * Example: "5 minutes ago"
     */
    RELATIVE: true
  },
  
  
  // ==========================================
  // SEARCH/FILTER SETTINGS
  // ==========================================
  /**
   * Search and filtering options
   */
  SEARCH: {
    /**
     * Minimum characters before triggering search
     */
    MIN_CHARACTERS: 3,
    
    /**
     * Debounce delay in milliseconds
     * Prevents too many API calls while typing
     */
    DEBOUNCE_DELAY: 300
  },
  
  
  // ==========================================
  // APPLICATION METADATA
  // ==========================================
  /**
   * General app information
   */
  APP_INFO: {
    NAME: 'Flood Management System',
    VERSION: '1.0.0',
    DESCRIPTION: 'Real-time disaster management and rescue coordination',
    SUPPORT_EMAIL: 'support@floodmanagement.com',
    SUPPORT_PHONE: '+91-1234567890'
  }
};


// ============================================
// EXPORTED HELPER CONFIGURATIONS
// ============================================

/**
 * Map-specific configuration helper
 * Convenient shortcut for map settings
 * 
 * Usage:
 * import { MAP_CONFIG } from '../config/app.config';
 * <MapContainer center={MAP_CONFIG.defaultCenter} />
 */
export const MAP_CONFIG = {
  tileLayer: {
    url: APP_CONFIG.MAP.TILE_LAYER,
    attribution: APP_CONFIG.MAP.ATTRIBUTION
  },
  defaultCenter: APP_CONFIG.MAP.DEFAULT_CENTER,
  defaultZoom: APP_CONFIG.MAP.DEFAULT_ZOOM,
  minZoom: APP_CONFIG.MAP.MIN_ZOOM,
  maxZoom: APP_CONFIG.MAP.MAX_ZOOM
};


/**
 * API configuration helper
 * Convenient shortcut for API settings
 * 
 * Usage:
 * import { API_CONFIG } from '../config/app.config';
 * axios.get(`${API_CONFIG.baseURL}/incidents`)
 */
export const API_CONFIG = {
  baseURL: APP_CONFIG.API_BASE_URL,
  socketURL: APP_CONFIG.SOCKET_URL,
  timeout: 10000, // 10 seconds timeout for API requests
  headers: {
    'Content-Type': 'application/json'
  }
};


/**
 * Color palette helper
 * Quick access to all marker colors
 * 
 * Usage:
 * import { COLORS } from '../config/app.config';
 * <div style={{ color: COLORS.emergency }}>Alert</div>
 */
export const COLORS = {
  emergency: APP_CONFIG.MARKER_TYPES.EMERGENCY.color,
  inProgress: APP_CONFIG.MARKER_TYPES.IN_PROGRESS.color,
  safeZone: APP_CONFIG.MARKER_TYPES.SAFE_ZONE.color,
  shelter: APP_CONFIG.MARKER_TYPES.SHELTER.color,
  rescueTeam: APP_CONFIG.MARKER_TYPES.RESCUE_TEAM.color
};


/**
 * Status configuration
 * Maps incident statuses to colors and labels
 */
export const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: COLORS.emergency,
    bgClass: 'bg-red-100',
    textClass: 'text-red-800'
  },
  assigned: {
    label: 'Assigned',
    color: COLORS.inProgress,
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800'
  },
  in_progress: {
    label: 'In Progress',
    color: COLORS.inProgress,
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800'
  },
  rescued: {
    label: 'Rescued',
    color: COLORS.safeZone,
    bgClass: 'bg-green-100',
    textClass: 'text-green-800'
  },
  closed: {
    label: 'Closed',
    color: '#6B7280',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-800'
  }
};


/**
 * User roles configuration
 */
export const ROLES = {
  CITIZEN: 'citizen',
  RESCUE_TEAM: 'rescue_team',
  ADMIN: 'admin',
  COORDINATOR: 'coordinator'
};


// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get marker configuration by type
 * @param {string} type - Marker type (emergency, shelter, etc.)
 * @returns {object} Marker configuration
 */
export const getMarkerConfig = (type) => {
  return APP_CONFIG.MARKER_TYPES[type.toUpperCase()] || APP_CONFIG.MARKER_TYPES.EMERGENCY;
};


/**
 * Get alert level configuration
 * @param {string} level - Alert level (low, moderate, high, severe)
 * @returns {object} Alert configuration
 */
export const getAlertConfig = (level) => {
  return APP_CONFIG.ALERT_LEVELS[level.toUpperCase()] || APP_CONFIG.ALERT_LEVELS.LOW;
};


/**
 * Get status configuration
 * @param {string} status - Status (pending, assigned, etc.)
 * @returns {object} Status configuration
 */
export const getStatusConfig = (status) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
};


/**
 * Validate file for upload
 * @param {File} file - File to validate
 * @returns {object} { valid: boolean, error: string }
 */
export const validateFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  if (file.size > APP_CONFIG.FILE_UPLOAD.MAX_SIZE) {
    const maxSizeMB = APP_CONFIG.FILE_UPLOAD.MAX_SIZE / (1024 * 1024);
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }
  
  if (!APP_CONFIG.FILE_UPLOAD.ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG and PNG images allowed' };
  }
  
  return { valid: true, error: null };
};


// Default export
export default APP_CONFIG;