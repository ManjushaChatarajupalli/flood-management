import React, { createContext, useState, useContext, useEffect } from 'react';
import { SocketContext } from './SocketContext';
import { AuthContext } from './AuthContext';
import api from '../services/api';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);

  // Register service worker + subscribe to push when citizen logs in
  useEffect(() => {
    if (user && user.role === 'citizen') {
      registerServiceWorkerAndSubscribe();
    }
  }, [user]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (socket) {
      socket.on('new_notification', (notification) => {
        addNotification(notification);
        showBrowserNotification(notification);
      });
    }

    return () => {
      if (socket) socket.off('new_notification');
    };
  }, [socket]);

  /**
   * Register service worker and subscribe to push notifications
   */
  const registerServiceWorkerAndSubscribe = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported');
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered');

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return;
      }

      // Get VAPID public key from backend
      const { data } = await api.get('/notifications/vapid-public-key');
      const vapidPublicKey = data.publicKey;
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      // Get user's GPS location
      let latitude = null;
      let longitude = null;

      if (navigator.geolocation) {
        try {
          const position = await getCurrentPosition();
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (geoError) {
          console.warn('Could not get GPS location:', geoError.message);
        }
      }

      // Send subscription + location to backend
      await api.post('/notifications/subscribe', {
        subscription,
        latitude,
        longitude
      });

      setPushEnabled(true);
      console.log('✅ Push notification subscription saved');

    } catch (error) {
      console.error('❌ Push subscription failed:', error);
    }
  };

  /**
   * Update GPS location (call this when user moves)
   */
  const updateLocation = async () => {
    try {
      if (!navigator.geolocation) return;

      const position = await getCurrentPosition();
      await api.post('/notifications/update-location', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    } catch (error) {
      console.error('Location update failed:', error);
    }
  };

  const addNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50));
  };

  const showBrowserNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo192.png'
      });
    }
  };

  const clearNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        pushEnabled,
        addNotification,
        clearNotification,
        clearAll,
        updateLocation,
        registerServiceWorkerAndSubscribe
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Helper: Promisify geolocation
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: 60000
    });
  });
}
