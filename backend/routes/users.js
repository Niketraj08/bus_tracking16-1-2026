const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Bus = require('../models/Bus');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all users (Admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .populate('trackedBuses', 'busNumber route')
      .select('-password -__v');
    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tracked buses (User)
router.get('/tracked-buses', auth, async (req, res) => {
  try {
    console.log('GET /tracked-buses - User:', req.user.email);

    const user = await User.findById(req.user._id)
      .populate({
        path: 'trackedBuses',
        populate: {
          path: 'route',
          select: 'routeName startPoint endPoint'
        }
      })
      .select('trackedBuses');

    console.log('GET /tracked-buses - Tracked buses count:', user.trackedBuses.length);
    res.json({ trackedBuses: user.trackedBuses });
  } catch (error) {
    console.error('GET /tracked-buses - Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID (Admin only)
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('trackedBuses', 'busNumber route')
      .select('-password -__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (Admin only)
router.put('/:id', adminAuth, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.role) updates.role = req.body.role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('trackedBuses', 'busNumber route')
     .select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Track bus (User)
router.post('/track-bus/:busId', auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    const user = await User.findById(req.user._id);

    // Check if already tracking
    if (user.trackedBuses.includes(req.params.busId)) {
      return res.status(400).json({ error: 'Bus already being tracked' });
    }

    user.trackedBuses.push(req.params.busId);
    await user.save();

    const updatedUser = await User.findById(req.user._id)
      .populate('trackedBuses', 'busNumber route')
      .select('-password');

    res.json({
      message: 'Bus tracking started',
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Stop tracking bus (User)
router.delete('/track-bus/:busId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Check if tracking
    if (!user.trackedBuses.includes(req.params.busId)) {
      return res.status(400).json({ error: 'Bus not being tracked' });
    }

    user.trackedBuses = user.trackedBuses.filter(
      busId => busId.toString() !== req.params.busId
    );
    await user.save();

    const updatedUser = await User.findById(req.user._id)
      .populate('trackedBuses', 'busNumber route')
      .select('-password');

    res.json({
      message: 'Bus tracking stopped',
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tracked buses (User)
router.get('/tracked-buses', auth, async (req, res) => {
  try {
    console.log('GET /tracked-buses - User:', req.user.email);

    const user = await User.findById(req.user._id)
      .populate({
        path: 'trackedBuses',
        populate: {
          path: 'route',
          select: 'routeName startPoint endPoint'
        }
      })
      .select('trackedBuses');

    console.log('GET /tracked-buses - Tracked buses count:', user.trackedBuses.length);
    res.json({ trackedBuses: user.trackedBuses });
  } catch (error) {
    console.error('GET /tracked-buses - Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
