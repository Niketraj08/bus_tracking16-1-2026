const express = require('express');
const { body, validationResult } = require('express-validator');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all buses
router.get('/', auth, async (req, res) => {
  try {
    const buses = await Bus.find()
      .populate('route', 'routeName startPoint endPoint')
      .select('-__v');
    res.json({ buses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bus by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('route', 'routeName startPoint endPoint stops')
      .select('-__v');

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json({ bus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create bus (Admin only)
router.post('/', adminAuth, [
  body('busNumber').trim().isLength({ min: 1 }).withMessage('Bus number required'),
  body('route').isMongoId().withMessage('Valid route ID required'),
  body('currentLocation.latitude').isNumeric().withMessage('Valid latitude required'),
  body('currentLocation.longitude').isNumeric().withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { busNumber, route, currentLocation } = req.body;

    // Check if bus number already exists
    const existingBus = await Bus.findOne({ busNumber });
    if (existingBus) {
      return res.status(400).json({ error: 'Bus with this number already exists' });
    }

    // Verify route exists
    const routeExists = await Route.findById(route);
    if (!routeExists) {
      return res.status(400).json({ error: 'Route not found' });
    }

    const bus = new Bus({
      busNumber,
      route,
      currentLocation
    });

    await bus.save();

    const populatedBus = await Bus.findById(bus._id)
      .populate('route', 'routeName startPoint endPoint');

    res.status(201).json({
      message: 'Bus created successfully',
      bus: populatedBus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update bus (Admin only)
router.put('/:id', adminAuth, [
  body('busNumber').optional().trim().isLength({ min: 1 }).withMessage('Bus number required'),
  body('route').optional().isMongoId().withMessage('Valid route ID required'),
  body('currentLocation.latitude').optional().isNumeric().withMessage('Valid latitude required'),
  body('currentLocation.longitude').optional().isNumeric().withMessage('Valid longitude required'),
  body('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    if (req.body.busNumber) updates.busNumber = req.body.busNumber;
    if (req.body.route) updates.route = req.body.route;
    if (req.body.currentLocation) updates.currentLocation = req.body.currentLocation;
    if (req.body.status) updates.status = req.body.status;
    updates.lastUpdated = new Date();

    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('route', 'routeName startPoint endPoint');

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json({
      message: 'Bus updated successfully',
      bus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update bus location (Admin only)
router.patch('/:id/location', adminAuth, [
  body('latitude').isNumeric().withMessage('Valid latitude required'),
  body('longitude').isNumeric().withMessage('Valid longitude required'),
  body('speed').optional().isNumeric().withMessage('Valid speed required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, speed } = req.body;
    const now = new Date();

    // Get current bus data to calculate distance
    const currentBus = await Bus.findById(req.params.id);

    if (!currentBus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Calculate distance traveled since last update
    let distanceIncrement = 0;
    if (currentBus.tripStats.lastLocation) {
      const lastLat = currentBus.tripStats.lastLocation.latitude;
      const lastLng = currentBus.tripStats.lastLocation.longitude;

      // Haversine formula for distance
      const R = 6371; // Earth's radius in km
      const dLat = (latitude - lastLat) * Math.PI / 180;
      const dLng = (longitude - lastLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lastLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distanceIncrement = R * c;
    }

    // Calculate speed if not provided (based on distance and time)
    let calculatedSpeed = speed || 0;
    if (!speed && distanceIncrement > 0 && currentBus.lastUpdated) {
      const timeDiffHours = (now - currentBus.lastUpdated) / (1000 * 60 * 60);
      if (timeDiffHours > 0) {
        calculatedSpeed = distanceIncrement / timeDiffHours;
      }
    }

    // Update bus with new location and trip stats
    const updateData = {
      currentLocation: { latitude, longitude },
      lastUpdated: now,
      speed: calculatedSpeed,
      tripStats: {
        ...currentBus.tripStats,
        distanceToday: currentBus.tripStats.distanceToday + distanceIncrement,
        totalDistance: currentBus.tripStats.totalDistance + distanceIncrement,
        lastLocation: { latitude, longitude }
      }
    };

    // Set trip start time if not set
    if (!currentBus.tripStats.tripStartTime) {
      updateData.tripStats.tripStartTime = now;
    }

    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('route', 'routeName');

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    io.to(`bus-${bus._id}`).emit('bus-location-update', {
      busId: bus._id,
      location: bus.currentLocation,
      speed: bus.speed,
      timestamp: bus.lastUpdated,
      tripStats: bus.tripStats
    });

    res.json({
      message: 'Bus location updated successfully',
      bus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete bus (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json({
      message: 'Bus deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset daily distance (Admin only)
router.patch('/:id/reset-distance', adminAuth, async (req, res) => {
  try {
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      {
        'tripStats.distanceToday': 0,
        'tripStats.tripStartTime': new Date()
      },
      { new: true }
    ).populate('route', 'routeName');

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json({
      message: 'Daily distance reset successfully',
      bus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
