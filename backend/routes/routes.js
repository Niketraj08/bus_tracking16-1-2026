const express = require('express');
const { body, validationResult } = require('express-validator');
const Route = require('../models/Route');
const Stop = require('../models/Stop');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all routes
router.get('/', auth, async (req, res) => {
  try {
    const routes = await Route.find()
      .populate('stops', 'stopName location')
      .select('-__v');
    res.json({ routes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get route by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('stops', 'stopName location address')
      .select('-__v');

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({ route });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create route (Admin only)
router.post('/', adminAuth, [
  body('routeName').trim().isLength({ min: 1 }).withMessage('Route name required'),
  body('startPoint.name').trim().isLength({ min: 1 }).withMessage('Start point name required'),
  body('endPoint.name').trim().isLength({ min: 1 }).withMessage('End point name required'),
  body('distance').isNumeric().withMessage('Valid distance required'),
  body('estimatedDuration').isNumeric().withMessage('Valid duration required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { routeName, startPoint, endPoint, waypoints, stops, distance, estimatedDuration } = req.body;

    // Verify all stops exist if provided
    if (stops && stops.length > 0) {
      const stopExists = await Stop.find({ '_id': { $in: stops } });
      if (stopExists.length !== stops.length) {
        return res.status(400).json({ error: 'One or more stops not found' });
      }
    }

    const route = new Route({
      routeName,
      startPoint,
      endPoint,
      waypoints: waypoints || [],
      stops: stops || [],
      distance,
      estimatedDuration
    });

    await route.save();

    const populatedRoute = await Route.findById(route._id)
      .populate('stops', 'stopName location');

    res.status(201).json({
      message: 'Route created successfully',
      route: populatedRoute
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update route (Admin only)
router.put('/:id', adminAuth, [
  body('routeName').optional().trim().isLength({ min: 1 }).withMessage('Route name required'),
  body('distance').optional().isNumeric().withMessage('Valid distance required'),
  body('estimatedDuration').optional().isNumeric().withMessage('Valid duration required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    if (req.body.routeName) updates.routeName = req.body.routeName;
    if (req.body.startPoint) updates.startPoint = req.body.startPoint;
    if (req.body.endPoint) updates.endPoint = req.body.endPoint;
    if (req.body.waypoints !== undefined) updates.waypoints = req.body.waypoints;
    if (req.body.stops) {
      // Verify all stops exist
      const stopExists = await Stop.find({ '_id': { $in: req.body.stops } });
      if (stopExists.length !== req.body.stops.length) {
        return res.status(400).json({ error: 'One or more stops not found' });
      }
      updates.stops = req.body.stops;
    }
    if (req.body.distance) updates.distance = req.body.distance;
    if (req.body.estimatedDuration) updates.estimatedDuration = req.body.estimatedDuration;

    const route = await Route.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('stops', 'stopName location');

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({
      message: 'Route updated successfully',
      route
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add waypoint to route (Admin only)
router.post('/:id/waypoints', adminAuth, [
  body('name').trim().isLength({ min: 1 }).withMessage('Waypoint name required'),
  body('latitude').isNumeric().withMessage('Valid latitude required'),
  body('longitude').isNumeric().withMessage('Valid longitude required'),
  body('order').optional().isNumeric().withMessage('Valid order required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, latitude, longitude, order } = req.body;

    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const waypointOrder = order !== undefined ? order : route.waypoints.length;
    route.waypoints.push({
      name,
      latitude,
      longitude,
      order: waypointOrder
    });

    await route.save();

    res.json({
      message: 'Waypoint added successfully',
      route
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove waypoint from route (Admin only)
router.delete('/:id/waypoints/:waypointIndex', adminAuth, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const waypointIndex = parseInt(req.params.waypointIndex);
    if (waypointIndex < 0 || waypointIndex >= route.waypoints.length) {
      return res.status(400).json({ error: 'Invalid waypoint index' });
    }

    route.waypoints.splice(waypointIndex, 1);
    await route.save();

    res.json({
      message: 'Waypoint removed successfully',
      route
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete route (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({
      message: 'Route deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
