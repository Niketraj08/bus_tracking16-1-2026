const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeName: {
    type: String,
    required: true,
    trim: true
  },
  startPoint: {
    name: String,
    latitude: Number,
    longitude: Number
  },
  endPoint: {
    name: String,
    latitude: Number,
    longitude: Number
  },
  waypoints: [{
    name: String,
    latitude: Number,
    longitude: Number,
    order: Number
  }],
  stops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop'
  }],
  distance: {
    type: Number,
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Route', routeSchema);
