import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  LocationOn,
  PlayArrow,
  Stop,
  GpsFixed,
  DirectionsBus,
  Schedule
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSocket } from '../services/socket';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { calculateDistance, calculateETA } from '../utils/locationUtils';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconShadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DriverPanel = () => {
  const { user, loading: authLoading } = useAuth();

  // ALL hooks must be called before any early returns
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [selectedBus, setSelectedBus] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [tripStats, setTripStats] = useState({
    distance: 0,
    speed: 0,
    startTime: null,
    duration: 0
  });
  const mapRef = useRef(null);
  const locationInterval = useRef(null);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'driver')) {
      fetchData();
      setupSocketListeners();
    }

    return () => {
      stopLocationTracking();
      const socket = getSocket();
      socket.off('bus-location-update');
    };
  }, [user]);

  // Redirect if not authenticated or not admin/driver
  if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'driver'))) {
    return <Navigate to="/dashboard" />;
  }

  const fetchData = async () => {
    try {
      const [busesRes, routesRes, stopsRes] = await Promise.all([
        api.get('/buses'),
        api.get('/routes'),
        api.get('/stops')
      ]);

      setBuses(busesRes.data.buses);
      setRoutes(routesRes.data.routes);
      setStops(stopsRes.data.stops);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    const socket = getSocket();

    socket.on('bus-location-update', (data) => {
      if (data.busId === selectedBus) {
        setCurrentLocation(data.location);
        setLastUpdate(new Date(data.timestamp));
      }
    });
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsTracking(true);
    setTripStats(prev => ({ ...prev, startTime: new Date() }));

    // Get initial location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCurrentLocation(location);
        updateBusLocation(location);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Failed to get current location');
        setIsTracking(false);
      }
    );

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        // Calculate speed (m/s to km/h)
        const speed = position.coords.speed ? position.coords.speed * 3.6 : 0;

        setCurrentLocation(location);
        setTripStats(prev => ({
          ...prev,
          speed: Math.round(speed),
          duration: prev.startTime ? Math.floor((new Date() - prev.startTime) / 1000 / 60) : 0
        }));

        updateBusLocation(location);
      },
      (error) => {
        console.error('Error watching position:', error);
        toast.error('Location tracking failed');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    setWatchId(id);

    // Update location every 30 seconds as backup
    locationInterval.current = setInterval(() => {
      if (currentLocation) {
        updateBusLocation(currentLocation);
      }
    }, 30000);
  };

  const stopLocationTracking = () => {
    setIsTracking(false);

    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
  };

  const updateBusLocation = async (location) => {
    if (!selectedBus) return;

    try {
      await api.patch(`/buses/${selectedBus}/location`, {
        latitude: location.latitude,
        longitude: location.longitude
      });

      setLastUpdate(new Date());
      console.log('Location updated:', location);
    } catch (error) {
      console.error('Error updating location:', error);
      // Don't show toast for every location update failure to avoid spam
    }
  };

  const handleBusChange = (event) => {
    const busId = event.target.value;
    setSelectedBus(busId);

    const bus = buses.find(b => b._id === busId);
    if (bus) {
      setCurrentRoute(bus.route);
      if (bus.currentLocation) {
        setCurrentLocation(bus.currentLocation);
      }
    }
  };

  const getRoutePolyline = (route) => {
    if (!route) return [];

    const points = [
      [route.startPoint.latitude, route.startPoint.longitude]
    ];

    if (route.waypoints && route.waypoints.length > 0) {
      route.waypoints.forEach(waypoint => {
        points.push([waypoint.latitude, waypoint.longitude]);
      });
    }

    points.push([route.endPoint.latitude, route.endPoint.longitude]);

    return points;
  };

  if (authLoading || loading) {
    return <Typography>Loading driver panel...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Driver Panel - GPS Tracking
      </Typography>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Bus Selection
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Bus</InputLabel>
              <Select
                value={selectedBus}
                label="Select Bus"
                onChange={handleBusChange}
              >
                {buses.map((bus) => (
                  <MenuItem key={bus._id} value={bus._id}>
                    Bus {bus.busNumber} - {bus.route.routeName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedBus && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Tracking Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={isTracking ? 'Active' : 'Inactive'}
                    color={isTracking ? 'success' : 'default'}
                    size="small"
                  />
                  <Typography variant="body2">
                    {lastUpdate ? `Last update: ${lastUpdate.toLocaleTimeString()}` : 'Not updated yet'}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<PlayArrow />}
                onClick={startLocationTracking}
                disabled={!selectedBus || isTracking}
                fullWidth
              >
                Start Tracking
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Stop />}
                onClick={stopLocationTracking}
                disabled={!isTracking}
                fullWidth
              >
                Stop Tracking
              </Button>
            </Box>
          </Paper>

          {selectedBus && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Trip Statistics
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Speed:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {tripStats.speed} km/h
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Duration:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {tripStats.duration} min
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Status:</Typography>
                  <Chip
                    label={isTracking ? 'Tracking' : 'Stopped'}
                    color={isTracking ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </Paper>
          )}
        </Grid>

        {/* Map */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Live GPS Tracking
              </Typography>

              <Box sx={{ height: 500, width: '100%', mb: 2 }}>
                <MapContainer
                  center={[20.2961, 85.8245]} // Bhubaneswar coordinates
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'
                    url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoieWFhay1kcml2aW5nLWN1cnJpY3VsdW0iLCJhIjoiY2txYzJqb3FwMWZweDJwbXY0M3R5cDAzYyJ9'}`}
                  />

                  {/* Route polyline */}
                  {currentRoute && (
                    <Polyline
                      positions={getRoutePolyline(currentRoute)}
                      color="blue"
                      weight={4}
                      opacity={0.7}
                    />
                  )}

                  {/* Bus stops */}
                  {stops.map((stop) => (
                    <Marker
                      key={`stop-${stop._id}`}
                      position={[stop.location.latitude, stop.location.longitude]}
                      icon={L.divIcon({
                        className: 'custom-stop-marker',
                        html: '<div style="background-color: #1976d2; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">🚌</div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                      })}
                    >
                      <Popup>
                        <Typography variant="subtitle2">{stop.stopName}</Typography>
                        <Typography variant="body2">{stop.address}</Typography>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Current bus location */}
                  {currentLocation && selectedBus && (
                    <Marker
                      position={[currentLocation.latitude, currentLocation.longitude]}
                      icon={L.divIcon({
                        className: 'custom-bus-marker',
                        html: `<div style="background-color: ${isTracking ? '#4caf50' : '#ff9800'}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${buses.find(b => b._id === selectedBus)?.busNumber || ''}</div>`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 16]
                      })}
                    >
                      <Popup>
                        <Typography variant="subtitle2">
                          Bus {buses.find(b => b._id === selectedBus)?.busNumber}
                        </Typography>
                        <Typography variant="body2">
                          Route: {currentRoute?.routeName}
                        </Typography>
                        <Typography variant="body2">
                          Speed: {tripStats.speed} km/h
                        </Typography>
                        <Typography variant="body2">
                          Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: isTracking ? 'success.main' : 'warning.main' }}>
                          Status: {isTracking ? 'Live Tracking' : 'Location Update'}
                        </Typography>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </Box>

              {isTracking && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>GPS Tracking Active:</strong> Your location is being updated in real-time.
                    Speed: {tripStats.speed} km/h | Duration: {tripStats.duration} min
                  </Typography>
                </Alert>
              )}

              {currentLocation && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Location
                  </Typography>
                  <Typography variant="body2">
                    Latitude: {currentLocation.latitude.toFixed(6)}
                  </Typography>
                  <Typography variant="body2">
                    Longitude: {currentLocation.longitude.toFixed(6)}
                  </Typography>
                  <Typography variant="body2">
                    Last Update: {lastUpdate ? lastUpdate.toLocaleString() : 'Never'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DriverPanel;
