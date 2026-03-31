const User = require('../models/User');

// Safe VAPID setup - only init if keys exist
let webpush = null;
try {
  webpush = require('web-push');
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:' + (process.env.VAPID_EMAIL || 'admin@floodrescue.com'),
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ Web Push (VAPID) configured');
  }
} catch (e) {
  console.warn('⚠️ web-push not available:', e.message);
}

// GET /api/notifications/vapid-public-key
const getVapidPublicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
};

// POST /api/notifications/subscribe
const subscribePush = async (req, res) => {
  try {
    const { subscription, latitude, longitude } = req.body;
    const userId = req.user.id;

    if (!subscription) {
      return res.status(400).json({ message: 'Subscription data is required' });
    }

    await User.update(
      {
        pushSubscription: JSON.stringify(subscription),
        latitude: latitude || null,
        longitude: longitude || null
      },
      { where: { id: userId } }
    );

    res.status(201).json({ message: 'Push subscription saved successfully' });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ message: 'Failed to save subscription', error: error.message });
  }
};

// POST /api/notifications/unsubscribe
const unsubscribePush = async (req, res) => {
  try {
    await User.update(
      { pushSubscription: null },
      { where: { id: req.user.id } }
    );
    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unsubscribe' });
  }
};

// POST /api/notifications/update-location
const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude required' });
    }
    await User.update(
      { latitude, longitude },
      { where: { id: req.user.id } }
    );
    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update location' });
  }
};

// POST /api/notifications/send-manual-alert
const sendManualFloodAlert = async (req, res) => {
  try {
    if (!webpush) {
      return res.status(500).json({ message: 'Push service not configured' });
    }

    const { title, message } = req.body;
    const citizens = await User.findAll({
      where: { role: 'citizen', isActive: true }
    });

    const subscribers = citizens.filter(u => u.pushSubscription);
    let successCount = 0;

    for (const user of subscribers) {
      try {
        const subscription = JSON.parse(user.pushSubscription);
        const payload = JSON.stringify({
          title: title || '⚠️ Flood Alert!',
          body: message || 'Emergency flood warning issued. Please stay safe.',
          icon: '/logo192.png'
        });
        await webpush.sendNotification(subscription, payload);
        successCount++;
      } catch (err) {
        if (err.statusCode === 410) {
          await User.update({ pushSubscription: null }, { where: { id: user.id } });
        }
      }
    }

    res.json({
      message: `Alert sent to ${successCount} citizens`,
      total: subscribers.length,
      success: successCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send alert', error: error.message });
  }
};

module.exports = {
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  updateLocation,
  sendManualFloodAlert
};