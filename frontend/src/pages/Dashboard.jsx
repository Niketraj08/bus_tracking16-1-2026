import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert
} from '@mui/material';
import {
  DirectionsBus,
  LocationOn,
  Notifications,
  TrackChanges
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();

  // ALL hooks must be called before any early returns
  const [stats, setStats] = useState({
    totalBuses: 0,
    activeBuses: 0,
    totalRoutes: 0,
    totalStops: 0
  });
  const [trackedBuses, setTrackedBuses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      setDataLoaded(false); // Reset data loaded flag for new user
      fetchDashboardData();
      setupSocketListeners();
    }

    return () => {
      const socket = getSocket();
      socket.off('bus-location-update');
      socket.off('new-notification');
    };
  }, [user]);

  console.log('Dashboard - Auth loading:', authLoading, 'User:', user);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    console.log('Dashboard - Redirecting to login, no user found');
    return <Navigate to="/login" />;
  }

  const fetchDashboardData = async () => {
    // Prevent multiple simultaneous calls
    if (dataLoaded) return;

    try {
      console.log('Dashboard - Fetching data for user:', user?.email);

      const [busesRes, routesRes, stopsRes, trackedRes, notificationsRes] = await Promise.all([
        api.get('/buses'),
        api.get('/routes'),
        api.get('/stops'),
        api.get('/users/tracked-buses'),
        api.get('/notifications')
      ]);

      setStats({
        totalBuses: busesRes.data.buses.length,
        activeBuses: busesRes.data.buses.filter(bus => bus.status === 'active').length,
        totalRoutes: routesRes.data.routes.length,
        totalStops: stopsRes.data.stops.length
      });

      setTrackedBuses(trackedRes.data.trackedBuses || []);
      setNotifications(notificationsRes.data.notifications.slice(0, 5)); // Show latest 5

      setDataLoaded(true);
      console.log('Dashboard - Data loaded successfully');
    } catch (error) {
      console.error('Dashboard - Error fetching dashboard data:', error);
      if (error.response?.status === 403) {
        console.log('Dashboard - 403 error, user may not be authenticated');
        toast.error('Authentication required. Please log in again.');
      } else if (error.response?.status === 429) {
        console.log('Dashboard - 429 error, rate limited');
        toast.error('Too many requests. Please wait a moment and try again.');
      } else {
        toast.error('Failed to load dashboard data. Please refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    const socket = getSocket();

    // Listen for bus location updates
    socket.on('bus-location-update', (data) => {
      // Update tracked buses if needed
      setTrackedBuses(prev => prev.map(bus =>
        bus._id === data.busId
          ? { ...bus, currentLocation: data.location, lastUpdated: new Date(data.timestamp) }
          : bus
      ));
    });

    // Listen for new notifications
    socket.on('new-notification', (notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    });
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'alert': return 'error';
      case 'warning': return 'warning';
      case 'maintenance': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return <Typography>Loading dashboard...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user.name}!
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <DirectionsBus color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">{stats.totalBuses}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Buses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrackChanges color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">{stats.activeBuses}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Buses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <LocationOn color="secondary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">{stats.totalRoutes}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Routes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <LocationOn color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">{stats.totalStops}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Stops
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Tracked Buses */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Your Tracked Buses</Typography>
              <Button component={Link} to="/tracking" variant="outlined" size="small">
                View All
              </Button>
            </Box>

            {trackedBuses.length === 0 ? (
              <Alert severity="info">
                You haven't tracked any buses yet. Go to Live Tracking to start tracking buses.
              </Alert>
            ) : (
              <List>
                {trackedBuses.slice(0, 3).map((bus) => (
                  <ListItem key={bus._id} divider>
                    <ListItemText
                      primary={`Bus ${bus.busNumber}`}
                      secondary={`Route: ${bus.route.routeName} • Status: ${bus.status}`}
                    />
                    <Chip
                      label={bus.status}
                      color={bus.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Recent Notifications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Notifications</Typography>
              <Notifications color="action" />
            </Box>

            {notifications.length === 0 ? (
              <Alert severity="info">
                No notifications yet.
              </Alert>
            ) : (
              <List>
                {notifications.map((notification) => (
                  <ListItem key={notification._id} divider>
                    <ListItemText
                      primary={notification.message}
                      secondary={new Date(notification.time).toLocaleString()}
                    />
                    <Chip
                      label={notification.type}
                      color={getNotificationColor(notification.type)}
                      size="small"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
