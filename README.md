# Real-Time Public Transport Tracking System

A full-stack MERN application for real-time bus tracking in small cities. This system allows users to track buses in real-time, view routes and stops, and provides administrative tools for managing the transport network.

## Features

### User Features
- **Real-time Bus Tracking**: Live location updates on interactive maps
- **Route Management**: View available routes and stops
- **Bus Tracking**: Track specific buses and receive notifications
- **User Dashboard**: Overview of tracked buses and recent notifications
- **Responsive Design**: Works on desktop and mobile devices

### Admin Features
- **Bus Management**: Add, edit, and delete buses
- **Route Management**: Create and manage bus routes
- **Stop Management**: Manage bus stops and locations
- **Real-time Updates**: Update bus locations in real-time
- **Notification System**: Send notifications to users

### Technical Features
- **Real-time Communication**: Socket.IO for live updates
- **Authentication**: JWT-based authentication for users and admins
- **Interactive Maps**: Mapbox-powered maps with multiple styles for bus tracking
- **RESTful API**: Complete REST API for all operations
- **Responsive UI**: Material-UI based modern interface

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **Material-UI** - UI component library
- **Leaflet** - Interactive maps
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time communication
- **React Toastify** - Notifications


## Database Schema

### User Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String,
  role: String (user/admin),
  trackedBuses: [ObjectId],
  createdAt: Date
}
```

### Bus Collection
```javascript
{
  busNumber: String (unique),
  currentLocation: {
    latitude: Number,
    longitude: Number
  },
  status: String,
  route: ObjectId,
  lastUpdated: Date
}
```

### Route Collection
```javascript
{
  routeName: String,
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
  stops: [ObjectId],
  distance: Number,
  estimatedDuration: Number,
  createdAt: Date
}
```

### Stop Collection
```javascript
{
  stopName: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  address: String,
  routes: [ObjectId],
  createdAt: Date
}
```

### Notification Collection
```javascript
{
  message: String,
  type: String,
  targetUsers: [ObjectId],
  targetRoutes: [ObjectId],
  sentBy: ObjectId,
  time: Date,
  isActive: Boolean
}
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Database Seeding

The application includes seed data for Bhubaneswar, Odisha with:

- **20 Bus Stops**: Popular locations across Bhubaneswar
- **5 Bus Routes**: Connecting major areas of the city with waypoints
- **Route Waypoints**: Intermediate points along routes for navigation
- **20 Buses**: With Odisha number plates (OD-01-xxxx)
- **Admin User**: `admin@bhubaneswarbus.com` / `password123`

### Seeding the Database:

```bash
# Navigate to backend directory
cd backend

# Run the seed script
npm run seed

# Check seeded data
npm run check-data
```

### Sample Data Overview:
- **Total Buses**: 20 (15 active, 3 inactive, 2 maintenance)
- **Total Routes**: 5
- **Total Stops**: 20
- **Route Waypoints**: Intermediate navigation points along routes
- **Active Routes**: Railway Station ↔ KIIT, Lingaraj Temple ↔ Nandankanan, etc.
- **Bus Number Format**: OD-01-1001 to OD-01-1020
- **Real Coordinates**: Actual latitude/longitude for Bhubaneswar locations
- **Dashboard Stats**: The dashboard will now show 20 buses, 15 active, 5 routes, and 20 stops

### Route Waypoints Feature:
- **Add Waypoints**: Admin can add intermediate points to routes for better navigation
- **Visual Markers**: Waypoints appear as numbered orange circles on the map
- **Route Planning**: Helps buses navigate complex routes with multiple turns
- **API Endpoints**: POST `/api/routes/:id/waypoints` and DELETE `/api/routes/:id/waypoints/:index`

## Installation & Setup

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/bus-tracking
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
FRONTEND_URL=http://localhost:3000
```

5. Start the backend server:
```bash
npm run dev
```

### Environment Configuration

1. **Backend Environment** (`.env` in backend directory):
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/bus-tracking
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=http://localhost:3000
```

2. **Frontend Environment** (`.env.local` in frontend directory):
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_MAPBOX_ACCESS_TOKEN=your-mapbox-access-token-here
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file (optional - Mapbox API key):
```bash
# Create .env.local file in frontend directory
echo "REACT_APP_MAPBOX_ACCESS_TOKEN=your-mapbox-access-token-here" > .env.local
```

4. Start the development server:
```bash
npm start
```

### Mapbox Integration

The application uses Mapbox for enhanced mapping with multiple styles:
- **Streets**: Standard street map view
- **Satellite**: Satellite imagery
- **Light/Dark**: Light and dark themes
- **Outdoors**: Outdoor/sports focused map

To use Mapbox maps, add your Mapbox access token to the frontend environment variables. The app will fallback to the provided token if no environment variable is set.

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Buses
- `GET /api/buses` - Get all buses
- `GET /api/buses/:id` - Get bus by ID
- `POST /api/buses` - Create bus (Admin)
- `PUT /api/buses/:id` - Update bus (Admin)
- `PATCH /api/buses/:id/location` - Update bus location (Admin)
- `DELETE /api/buses/:id` - Delete bus (Admin)

### Routes
- `GET /api/routes` - Get all routes
- `GET /api/routes/:id` - Get route by ID
- `POST /api/routes` - Create route (Admin)
- `PUT /api/routes/:id` - Update route (Admin)
- `DELETE /api/routes/:id` - Delete route (Admin)
- `POST /api/routes/:id/waypoints` - Add waypoint to route (Admin)
- `DELETE /api/routes/:id/waypoints/:waypointIndex` - Remove waypoint from route (Admin)

### Stops
- `GET /api/stops` - Get all stops
- `GET /api/stops/:id` - Get stop by ID
- `POST /api/stops` - Create stop (Admin)
- `PUT /api/stops/:id` - Update stop (Admin)
- `DELETE /api/stops/:id` - Delete stop (Admin)

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/admin/all` - Get all notifications (Admin)
- `POST /api/notifications` - Create notification (Admin)
- `PUT /api/notifications/:id` - Update notification (Admin)
- `DELETE /api/notifications/:id` - Delete notification (Admin)

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get user by ID (Admin)
- `PUT /api/users/:id` - Update user (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)
- `POST /api/users/track-bus/:busId` - Track bus
- `DELETE /api/users/track-bus/:busId` - Stop tracking bus
- `GET /api/users/tracked-buses` - Get tracked buses

## Socket.IO Events

### Client to Server
- `join-bus-tracking` - Join bus tracking room
- `leave-bus-tracking` - Leave bus tracking room
- `update-bus-location` - Update bus location (Admin)

### Server to Client
- `bus-location-update` - Bus location update
- `new-notification` - New notification

## Usage

### For Users
1. Register/Login to the system
2. View dashboard with system overview
3. Browse available buses and routes
4. Track specific buses on the map
5. Receive real-time notifications

### For Admins
1. Login with admin credentials
2. Access admin panel
3. Manage buses, routes, and stops
4. Update bus locations in real-time
5. Send notifications to users

## Deployment

### Backend Deployment
1. Set environment variables for production
2. Use a process manager like PM2
3. Configure MongoDB connection
4. Set up reverse proxy (nginx)

### Frontend Deployment
1. Build the production bundle:
```bash
npm run build
```
2. Serve static files using nginx or similar
3. Configure API endpoints for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue on GitHub.
