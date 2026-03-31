const ReliefCenter = require('../models/ReliefCenter');
const geoLocationService = require('../services/geoLocationService');

class ReliefCenterController {
  async createReliefCenter(req, res) {
    try {
      const {
        name,
        address,
        latitude,
        longitude,
        totalCapacity,
        resources,
        contactNumber
      } = req.body;

      const reliefCenter = await ReliefCenter.create({
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        totalCapacity: parseInt(totalCapacity),
        availableCapacity: parseInt(totalCapacity),
        currentOccupancy: 0,
        resources,
        contactNumber
      });

      // Broadcast new relief center
      const io = req.app.get('io');
      if (io) {
        io.emit('new_relief_center', {
          center: reliefCenter
        });
      }

      res.status(201).json({
        success: true,
        message: 'Relief center created successfully',
        reliefCenter
      });

    } catch (error) {
      res.status(500).json({
        message: 'Failed to create relief center',
        error: error.message
      });
    }
  }

  async getAllReliefCenters(req, res) {
    try {
      const { lat, lng, radius } = req.query;

      let centers;

      if (lat && lng) {
        // Get centers within radius
        centers = await geoLocationService.getCentersWithinRadius(
          parseFloat(lat),
          parseFloat(lng),
          radius ? parseFloat(radius) : 10
        );
      } else {
        // Get all centers
        centers = await ReliefCenter.findAll({
          where: { isActive: true },
          order: [['name', 'ASC']]
        });
      }

      res.status(200).json({
        success: true,
        count: centers.length,
        reliefCenters: centers
      });

    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch relief centers',
        error: error.message
      });
    }
  }

  async getReliefCenterById(req, res) {
    try {
      const { id } = req.params;

      const center = await ReliefCenter.findByPk(id);

      if (!center) {
        return res.status(404).json({ message: 'Relief center not found' });
      }

      res.status(200).json({
        success: true,
        reliefCenter: center
      });

    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch relief center',
        error: error.message
      });
    }
  }

  async updateCapacity(req, res) {
    try {
      const { id } = req.params;
      const { currentOccupancy } = req.body;

      const center = await ReliefCenter.findByPk(id);

      if (!center) {
        return res.status(404).json({ message: 'Relief center not found' });
      }

      center.currentOccupancy = parseInt(currentOccupancy);
      center.availableCapacity = center.totalCapacity - center.currentOccupancy;

      await center.save();

      // Broadcast capacity update
      const io = req.app.get('io');
      if (io) {
        io.emit('relief_center_updated', {
          centerId: id,
          currentOccupancy: center.currentOccupancy,
          availableCapacity: center.availableCapacity
        });
      }

      res.status(200).json({
        success: true,
        message: 'Capacity updated successfully',
        reliefCenter: center
      });

    } catch (error) {
      res.status(500).json({
        message: 'Failed to update capacity',
        error: error.message
      });
    }
  }

  async updateReliefCenter(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const center = await ReliefCenter.findByPk(id);

      if (!center) {
        return res.status(404).json({ message: 'Relief center not found' });
      }

      await center.update(updates);

      res.status(200).json({
        success: true,
        message: 'Relief center updated successfully',
        reliefCenter: center
      });

    } catch (error) {
      res.status(500).json({
        message: 'Failed to update relief center',
        error: error.message
      });
    }
  }

  async deleteReliefCenter(req, res) {
    try {
      const { id } = req.params;

      const center = await ReliefCenter.findByPk(id);

      if (!center) {
        return res.status(404).json({ message: 'Relief center not found' });
      }

      await center.destroy();

      res.status(200).json({
        success: true,
        message: 'Relief center deleted successfully'
      });

    } catch (error) {
      res.status(500).json({
        message: 'Failed to delete relief center',
        error: error.message
      });
    }
  }

  async findNearest(req, res) {
    try {
      const { latitude, longitude } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Coordinates required' });
      }

      const nearestCenter = await geoLocationService.findNearestReliefCenter(
        parseFloat(latitude),
        parseFloat(longitude)
      );

      if (!nearestCenter) {
        return res.status(404).json({ message: 'No relief centers found' });
      }

      res.status(200).json({
        success: true,
        reliefCenter: nearestCenter
      });

    } catch (error) {
      res.status(500).json({
        message: 'Failed to find nearest center',
        error: error.message
      });
    }
  }
}

module.exports = new ReliefCenterController();