const mongoose = require('mongoose');
const Bus = require('./models/Bus');
const Route = require('./models/Route');
const Stop = require('./models/Stop');
const User = require('./models/User');
require('dotenv').config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-tracking');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Bus.deleteMany({});
    await Route.deleteMany({});
    await Stop.deleteMany({});
    console.log('Cleared existing data');

    // Create bus stops in Bhubaneswar
    const stopsData = [
      { stopName: 'Bhubaneswar Railway Station', location: { latitude: 20.2961, longitude: 85.8245 }, address: 'Master Canteen Area, Station Square, Bhubaneswar' },
      { stopName: 'Lingaraj Temple', location: { latitude: 20.2387, longitude: 85.8379 }, address: 'Old Town, Bhubaneswar' },
      { stopName: 'Nandankanan Zoo', location: { latitude: 20.3969, longitude: 85.8194 }, address: 'Nandankanan, Bhubaneswar' },
      { stopName: 'Kalinga Stadium', location: { latitude: 20.2945, longitude: 85.8197 }, address: 'Near Railway Station, Bhubaneswar' },
      { stopName: 'Utkal University', location: { latitude: 20.2998, longitude: 85.8167 }, address: 'Vani Vihar, Bhubaneswar' },
      { stopName: 'KIIT University', location: { latitude: 20.3567, longitude: 85.8194 }, address: 'Patia, Bhubaneswar' },
      { stopName: 'Nayapalli', location: { latitude: 20.2919, longitude: 85.8236 }, address: 'Nayapalli Main Road, Bhubaneswar' },
      { stopName: 'Baramunda Bus Stand', location: { latitude: 20.2603, longitude: 85.7897 }, address: 'Baramunda, Bhubaneswar' },
      { stopName: 'Acharya Vihar', location: { latitude: 20.2897, longitude: 85.8336 }, address: 'Acharya Vihar Square, Bhubaneswar' },
      { stopName: 'Jaydev Vihar', location: { latitude: 20.2847, longitude: 85.8297 }, address: 'Jaydev Vihar, Bhubaneswar' },
      { stopName: 'Patia', location: { latitude: 20.3519, longitude: 85.8153 }, address: 'Patia Square, Bhubaneswar' },
      { stopName: 'Infocity', location: { latitude: 20.3536, longitude: 85.8225 }, address: 'Infocity Road, Bhubaneswar' },
      { stopName: 'Chandrasekharpur', location: { latitude: 20.3375, longitude: 85.8169 }, address: 'Chandrasekharpur, Bhubaneswar' },
      { stopName: 'Bapuji Nagar', location: { latitude: 20.2719, longitude: 85.8336 }, address: 'Bapuji Nagar, Bhubaneswar' },
      { stopName: 'Unit 4', location: { latitude: 20.2786, longitude: 85.8339 }, address: 'Unit 4, Bhubaneswar' },
      { stopName: 'Sundarpada', location: { latitude: 20.2667, longitude: 85.8167 }, address: 'Sundarpada, Bhubaneswar' },
      { stopName: 'Rasulgarh', location: { latitude: 20.2836, longitude: 85.8667 }, address: 'Rasulgarh, Bhubaneswar' },
      { stopName: 'Mancheswar', location: { latitude: 20.1836, longitude: 85.8500 }, address: 'Mancheswar, Bhubaneswar' },
      { stopName: 'Sahid Nagar', location: { latitude: 20.3047, longitude: 85.8167 }, address: 'Sahid Nagar, Bhubaneswar' },
      { stopName: 'IRC Village', location: { latitude: 20.2547, longitude: 85.8167 }, address: 'IRC Village, Bhubaneswar' }
    ];

    const stops = await Stop.insertMany(stopsData);
    console.log(`Created ${stops.length} bus stops`);

    // Create bus routes
    const routesData = [
      {
        routeName: 'Route 101: Railway Station - KIIT',
        startPoint: { name: 'Bhubaneswar Railway Station', latitude: 20.2961, longitude: 85.8245 },
        endPoint: { name: 'KIIT University', latitude: 20.3567, longitude: 85.8194 },
        waypoints: [
          { name: 'Kalinga Stadium Junction', latitude: 20.2945, longitude: 85.8197, order: 0 },
          { name: 'Nayapalli Crossroads', latitude: 20.2919, longitude: 85.8236, order: 1 },
          { name: 'Acharya Vihar Square', latitude: 20.2897, longitude: 85.8336, order: 2 }
        ],
        stops: [
          stops.find(s => s.stopName === 'Bhubaneswar Railway Station')._id,
          stops.find(s => s.stopName === 'Kalinga Stadium')._id,
          stops.find(s => s.stopName === 'Nayapalli')._id,
          stops.find(s => s.stopName === 'Acharya Vihar')._id,
          stops.find(s => s.stopName === 'Jaydev Vihar')._id,
          stops.find(s => s.stopName === 'Patia')._id,
          stops.find(s => s.stopName === 'KIIT University')._id
        ],
        distance: 15.5,
        estimatedDuration: 45
      },
      {
        routeName: 'Route 102: Lingaraj Temple - Nandankanan',
        startPoint: { name: 'Lingaraj Temple', latitude: 20.2387, longitude: 85.8379 },
        endPoint: { name: 'Nandankanan Zoo', latitude: 20.3969, longitude: 85.8194 },
        waypoints: [
          { name: 'Bapuji Nagar Junction', latitude: 20.2719, longitude: 85.8336, order: 0 },
          { name: 'Unit 4 Market', latitude: 20.2786, longitude: 85.8339, order: 1 },
          { name: 'Jaydev Vihar Bypass', latitude: 20.2847, longitude: 85.8297, order: 2 }
        ],
        stops: [
          stops.find(s => s.stopName === 'Lingaraj Temple')._id,
          stops.find(s => s.stopName === 'Bapuji Nagar')._id,
          stops.find(s => s.stopName === 'Unit 4')._id,
          stops.find(s => s.stopName === 'Jaydev Vihar')._id,
          stops.find(s => s.stopName === 'Patia')._id,
          stops.find(s => s.stopName === 'Chandrasekharpur')._id,
          stops.find(s => s.stopName === 'Nandankanan Zoo')._id
        ],
        distance: 22.3,
        estimatedDuration: 55
      },
      {
        routeName: 'Route 103: Utkal University - Infocity',
        startPoint: { name: 'Utkal University', latitude: 20.2998, longitude: 85.8167 },
        endPoint: { name: 'Infocity', latitude: 20.3536, longitude: 85.8225 },
        stops: [
          stops.find(s => s.stopName === 'Utkal University')._id,
          stops.find(s => s.stopName === 'Sahid Nagar')._id,
          stops.find(s => s.stopName === 'Acharya Vihar')._id,
          stops.find(s => s.stopName === 'Jaydev Vihar')._id,
          stops.find(s => s.stopName === 'Patia')._id,
          stops.find(s => s.stopName === 'Infocity')._id
        ],
        distance: 12.8,
        estimatedDuration: 35
      },
      {
        routeName: 'Route 104: Baramunda - Mancheswar',
        startPoint: { name: 'Baramunda Bus Stand', latitude: 20.2603, longitude: 85.7897 },
        endPoint: { name: 'Mancheswar', latitude: 20.1836, longitude: 85.8500 },
        stops: [
          stops.find(s => s.stopName === 'Baramunda Bus Stand')._id,
          stops.find(s => s.stopName === 'IRC Village')._id,
          stops.find(s => s.stopName === 'Sundarpada')._id,
          stops.find(s => s.stopName === 'Unit 4')._id,
          stops.find(s => s.stopName === 'Rasulgarh')._id,
          stops.find(s => s.stopName === 'Mancheswar')._id
        ],
        distance: 18.7,
        estimatedDuration: 50
      },
      {
        routeName: 'Route 105: Railway Station - Lingaraj Temple Loop',
        startPoint: { name: 'Bhubaneswar Railway Station', latitude: 20.2961, longitude: 85.8245 },
        endPoint: { name: 'Lingaraj Temple', latitude: 20.2387, longitude: 85.8379 },
        stops: [
          stops.find(s => s.stopName === 'Bhubaneswar Railway Station')._id,
          stops.find(s => s.stopName === 'Kalinga Stadium')._id,
          stops.find(s => s.stopName === 'Nayapalli')._id,
          stops.find(s => s.stopName === 'Acharya Vihar')._id,
          stops.find(s => s.stopName === 'Bapuji Nagar')._id,
          stops.find(s => s.stopName === 'Lingaraj Temple')._id
        ],
        distance: 10.2,
        estimatedDuration: 30
      }
    ];

    const routes = await Route.insertMany(routesData);
    console.log(`Created ${routes.length} bus routes`);

    // Create 20 buses with different statuses and locations
    const busData = [];
    const statuses = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'inactive', 'maintenance', 'active', 'active', 'inactive', 'active', 'maintenance', 'active', 'active', 'inactive', 'active', 'active'];
    const busNumbers = ['OD-01-1001', 'OD-01-1002', 'OD-01-1003', 'OD-01-1004', 'OD-01-1005', 'OD-01-1006', 'OD-01-1007', 'OD-01-1008', 'OD-01-1009', 'OD-01-1010', 'OD-01-1011', 'OD-01-1012', 'OD-01-1013', 'OD-01-1014', 'OD-01-1015', 'OD-01-1016', 'OD-01-1017', 'OD-01-1018', 'OD-01-1019', 'OD-01-1020'];

    for (let i = 0; i < 20; i++) {
      const route = routes[i % routes.length];
      const status = statuses[i];

      // Generate random location along the route for active buses
      let currentLocation = { latitude: 20.2961, longitude: 85.8245 }; // Default to railway station
      if (status === 'active') {
        // Random position between start and end of route
        const progress = Math.random();
        currentLocation = {
          latitude: route.startPoint.latitude + (route.endPoint.latitude - route.startPoint.latitude) * progress,
          longitude: route.startPoint.longitude + (route.endPoint.longitude - route.startPoint.longitude) * progress
        };
      }

      busData.push({
        busNumber: busNumbers[i],
        route: route._id,
        currentLocation,
        status,
        lastUpdated: new Date()
      });
    }

    const buses = await Bus.insertMany(busData);
    console.log(`Created ${buses.length} buses`);

    // Create an admin user for testing
    const adminUser = {
      name: 'Admin User',
      email: 'admin@gmail.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password123 (bcrypt hashed)
      role: 'admin'
    };

    await User.findOneAndUpdate(
      { email: adminUser.email },
      adminUser,
      { upsert: true, new: true }
    );
    console.log('Admin user created/updated');

    console.log('\n🎉 Seed data created successfully!');
    console.log(`📍 ${stops.length} bus stops created`);
    console.log(`🛣️ ${routes.length} routes created`);
    console.log(`🚌 ${buses.length} buses created`);
    console.log(`👤 Admin user: admin@bhubaneswarbus.com / password123`);

    console.log('\n📊 Dashboard Stats:');
    console.log(`Total Buses: ${buses.length}`);
    console.log(`Active Buses: ${buses.filter(b => b.status === 'active').length}`);
    console.log(`Total Routes: ${routes.length}`);
    console.log(`Total Stops: ${stops.length}`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seed function
seedData();
