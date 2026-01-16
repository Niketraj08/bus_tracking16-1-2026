const mongoose = require('mongoose');
const Bus = require('./models/Bus');
const Route = require('./models/Route');
const Stop = require('./models/Stop');
const User = require('./models/User');
require('dotenv').config();

const checkData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-tracking');
    console.log('Connected to MongoDB\n');

    // Get all data
    const buses = await Bus.find().populate('route').select('-__v');
    const routes = await Route.find().populate('stops').select('-__v');
    const stops = await Stop.find().select('-__v');
    const users = await User.find().select('name email role -_id');

    console.log('📊 DASHBOARD STATISTICS:');
    console.log(`Total Buses: ${buses.length}`);
    console.log(`Active Buses: ${buses.filter(b => b.status === 'active').length}`);
    console.log(`Inactive Buses: ${buses.filter(b => b.status === 'inactive').length}`);
    console.log(`Buses Under Maintenance: ${buses.filter(b => b.status === 'maintenance').length}`);
    console.log(`Total Routes: ${routes.length}`);
    console.log(`Total Stops: ${stops.length}`);
    console.log(`Total Users: ${users.length}\n`);

    console.log('🚌 BUS DETAILS:');
    buses.forEach((bus, index) => {
      console.log(`${index + 1}. ${bus.busNumber} - ${bus.route.routeName} (${bus.status})`);
    });

    console.log('\n🛣️ ROUTE DETAILS:');
    routes.forEach((route, index) => {
      console.log(`${index + 1}. ${route.routeName}`);
      console.log(`   From: ${route.startPoint.name} → To: ${route.endPoint.name}`);
      console.log(`   Distance: ${route.distance} km, Duration: ${route.estimatedDuration} min`);
      console.log(`   Stops: ${route.stops.length}`);
      if (route.waypoints && route.waypoints.length > 0) {
        console.log(`   Waypoints: ${route.waypoints.length}`);
        route.waypoints.forEach((wp, i) => {
          console.log(`     ${i + 1}. ${wp.name} (${wp.latitude.toFixed(4)}, ${wp.longitude.toFixed(4)})`);
        });
      }
    });

    console.log('\n📍 BUS STOPS:');
    stops.forEach((stop, index) => {
      console.log(`${index + 1}. ${stop.stopName} (${stop.location.latitude.toFixed(4)}, ${stop.location.longitude.toFixed(4)})`);
    });

    console.log('\n👥 USERS:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run the check function
checkData();
