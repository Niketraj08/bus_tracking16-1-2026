const express = require('express');
const { body, validationResult } = require('express-validator');
const Stop = require('../models/Stop');
const Route = require('../models/Route');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all stops
router.get('/', auth, async (req, res) => {
  try {
    const stops = await Stop.find()
      .populate('routes', 'routeName startPoint endPoint')
      .select('-__v');
    res.json({ stops });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get stop by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const stop = await Stop.findById(req.params.id)
      .populate('routes', 'routeName startPoint endPoint distance')
      .select('-__v');

    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }

    res.json({ stop });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create stop (Admin only)
router.post('/', adminAuth, [
  body('stopName').trim().isLength({ min: 1 }).withMessage('Stop name required'),
  body('location.latitude').isNumeric().withMessage('Valid latitude required'),
  body('location.longitude').isNumeric().withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stopName, location, address } = req.body;

    const stop = new Stop({
      stopName,
      location,
      address
    });

    await stop.save();

    const populatedStop = await Stop.findById(stop._id)
      .populate('routes', 'routeName');

    res.status(201).json({
      message: 'Stop created successfully',
      stop: populatedStop
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update stop (Admin only)
router.put('/:id', adminAuth, [
  body('stopName').optional().trim().isLength({ min: 1 }).withMessage('Stop name required'),
  body('location.latitude').optional().isNumeric().withMessage('Valid latitude required'),
  body('location.longitude').optional().isNumeric().withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    if (req.body.stopName) updates.stopName = req.body.stopName;
    if (req.body.location) updates.location = req.body.location;
    if (req.body.address !== undefined) updates.address = req.body.address;

    const stop = await Stop.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('routes', 'routeName');

    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }

    res.json({
      message: 'Stop updated successfully',
      stop
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete stop (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const stop = await Stop.findByIdAndDelete(req.params.id);

    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }

    // Remove stop from all routes
    await Route.updateMany(
      { stops: req.params.id },
      { $pull: { stops: req.params.id } }
    );

    res.json({
      message: 'Stop deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
