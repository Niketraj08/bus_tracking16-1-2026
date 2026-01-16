const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  currentLocation: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  speed: {
    type: Number,
    default: 0,
    min: 0
  },
  tripStats: {
    distanceToday: {
      type: Number,
      default: 0,
      min: 0
    },
    totalDistance: {
      type: Number,
      default: 0,
      min: 0
    },
    tripStartTime: {
      type: Date
    },
    lastLocation: {
      latitude: Number,
      longitude: Number
    }
  }
});

module.exports = mongoose.model('Bus', busSchema);
