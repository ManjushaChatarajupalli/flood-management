const axios = require('axios');
const User = require('../models/User');
const webpush = require('web-push');

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const FLOOD_WEATHER_CODES = [202, 232, 314, 502, 503, 504, 522, 531, 901, 902];
const HEAVY_RAIN_THRESHOLD = 20; // mm/h

// Configure web push
webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_EMAIL || 'admin@floodrescue.com'),
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Check weather for a single user's GPS location
 */
const checkWeatherForUser = async (user) => {
  try {
    if (!user.latitude || !user.longitude || !user.pushSubscription) return;

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat: user.latitude,
          lon: user.longitude,
          appid: WEATHER_API_KEY,
          units: 'metric'
        }
      }
    );

    const data = response.data;
    const weatherCode = data.weather[0]?.id;
    const rainVolume = data.rain?.['1h'] || data.rain?.['3h'] || 0;
    const description = data.weather[0]?.description || '';
    const cityName = data.name || 'your area';

    const isFloodRisk =
      FLOOD_WEATHER_CODES.includes(weatherCode) ||
      rainVolume >= HEAVY_RAIN_THRESHOLD;

    if (isFloodRisk) {
      await sendFloodPushNotification(user, cityName, description, rainVolume);
    }

  } catch (error) {
    console.error(`❌ Weather check failed for user ${user.id}:`, error.message);
  }
};

/**
 * Send browser push notification to a single user
 */
const sendFloodPushNotification = async (user, city, description, rainVolume) => {
  try {
    const subscription = JSON.parse(user.pushSubscription);

    const payload = JSON.stringify({
      title: '⚠️ Flood Warning Alert!',
      body: `Heavy rainfall detected in ${city}. ${description}. Stay safe and move to higher ground!`,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: {
        url: '/dashboard',
        rain: rainVolume,
        city
      }
    });

    await webpush.sendNotification(subscription, payload);
    console.log(`✅ Flood alert sent to user ${user.id} (${city})`);

  } catch (error) {
    // If subscription expired, remove it
    if (error.statusCode === 410) {
      await User.update(
        { pushSubscription: null },
        { where: { id: user.id } }
      );
      console.log(`🗑️ Removed expired subscription for user ${user.id}`);
    } else {
      console.error(`❌ Push failed for user ${user.id}:`, error.message);
    }
  }
};

/**
 * Run weather check for ALL citizens with location + push subscription
 */
const runWeatherCheckForAllUsers = async () => {
  try {
    console.log('🌦️ Running weather check for all citizens...');

    const citizens = await User.findAll({
      where: {
        role: 'citizen',
        isActive: true
      }
    });

    const usersWithSubscription = citizens.filter(
      (u) => u.pushSubscription && u.latitude && u.longitude
    );

    console.log(`👥 Checking weather for ${usersWithSubscription.length} citizens`);

    // Check each user's location
    for (const user of usersWithSubscription) {
      await checkWeatherForUser(user);
      // Small delay to avoid API rate limits
      await new Promise((res) => setTimeout(res, 300));
    }

    console.log('✅ Weather check complete');
  } catch (error) {
    console.error('❌ Weather check error:', error.message);
  }
};

/**
 * Start polling every 30 minutes
 */
const startWeatherPolling = () => {
  console.log('🌍 Weather polling started (every 30 minutes)');

  // Run immediately on startup
  runWeatherCheckForAllUsers();

  // Then every 30 minutes
  setInterval(runWeatherCheckForAllUsers, 30 * 60 * 1000);
};

module.exports = {
  startWeatherPolling,
  runWeatherCheckForAllUsers,
  checkWeatherForUser
};