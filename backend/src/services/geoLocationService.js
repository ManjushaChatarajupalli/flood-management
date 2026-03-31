const calculateDistance = require('../utils/calculateDistance');
const ReliefCenter = require('../models/ReliefCenter');

class GeoLocationService {
  async findNearestReliefCenter(latitude, longitude) {
    try {
      const centers = await ReliefCenter.findAll({
        where: { isActive: true }
      });

      if (centers.length === 0) {
        return null;
      }

      let nearestCenter = null;
      let minDistance = Infinity;

      centers.forEach(center => {
        const distance = calculateDistance(
          latitude,
          longitude,
          center.latitude,
          center.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestCenter = {
            ...center.toJSON(),
            distance: distance
          };
        }
      });

      return nearestCenter;

    } catch (error) {
      throw new Error('Failed to find nearest relief center: ' + error.message);
    }
  }

  async getCentersWithinRadius(latitude, longitude, radiusKm = 10) {
    try {
      const centers = await ReliefCenter.findAll({
        where: { isActive: true }
      });

      const centersWithDistance = centers.map(center => {
        const distance = calculateDistance(
          latitude,
          longitude,
          center.latitude,
          center.longitude
        );

        return {
          ...center.toJSON(),
          distance: distance
        };
      });

      return centersWithDistance
        .filter(c => c.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);

    } catch (error) {
      throw new Error('Failed to get centers within radius: ' + error.message);
    }
  }
}

module.exports = new GeoLocationService();