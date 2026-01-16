const express = require('express');
const { body, validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { targetUsers: req.user._id },
        { targetUsers: { $size: 0 } } // Global notifications
      ],
      isActive: true
    })
    .populate('sentBy', 'name')
    .populate('targetRoutes', 'routeName')
    .sort({ time: -1 })
    .select('-__v');

    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all notifications (Admin only)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('sentBy', 'name')
      .populate('targetUsers', 'name email')
      .populate('targetRoutes', 'routeName')
      .sort({ time: -1 })
      .select('-__v');

    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create notification (Admin only)
router.post('/', adminAuth, [
  body('message').trim().isLength({ min: 1 }).withMessage('Message required'),
  body('type').optional().isIn(['info', 'warning', 'alert', 'maintenance']).withMessage('Invalid type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, type, targetUsers, targetRoutes } = req.body;

    // Verify target users exist if provided
    if (targetUsers && targetUsers.length > 0) {
      const usersExist = await User.find({ '_id': { $in: targetUsers } });
      if (usersExist.length !== targetUsers.length) {
        return res.status(400).json({ error: 'One or more target users not found' });
      }
    }

    const notification = new Notification({
      message,
      type: type || 'info',
      targetUsers: targetUsers || [],
      targetRoutes: targetRoutes || [],
      sentBy: req.user._id
    });

    await notification.save();

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sentBy', 'name')
      .populate('targetUsers', 'name email')
      .populate('targetRoutes', 'routeName');

    // Emit real-time notification via Socket.IO
    const io = req.app.get('io');
    if (targetUsers && targetUsers.length > 0) {
      targetUsers.forEach(userId => {
        io.to(`user-${userId}`).emit('new-notification', populatedNotification);
      });
    } else {
      // Global notification
      io.emit('new-notification', populatedNotification);
    }

    res.status(201).json({
      message: 'Notification created successfully',
      notification: populatedNotification
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update notification (Admin only)
router.put('/:id', adminAuth, [
  body('message').optional().trim().isLength({ min: 1 }).withMessage('Message required'),
  body('type').optional().isIn(['info', 'warning', 'alert', 'maintenance']).withMessage('Invalid type'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    if (req.body.message) updates.message = req.body.message;
    if (req.body.type) updates.type = req.body.type;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('sentBy', 'name')
     .populate('targetUsers', 'name email')
     .populate('targetRoutes', 'routeName');

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification updated successfully',
      notification
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete notification (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read (User)
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // For now, we'll just return success since we're not tracking read status
    // In a real app, you might want to create a separate collection for user notification status

    res.json({
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
