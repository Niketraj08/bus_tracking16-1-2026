import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Card,
  CardContent,
  Fab,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSocket } from '../services/socket';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { calculateETA, findNearestStop, calculateDistance, checkBusApproachingStop } from '../utils/locationUtils';
import { requestNotificationPermission, showBusArrivalNotification, checkAndNotifyBusUpdates } from '../utils/notificationUtils';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const BusTracking = () => {
  const { user, loading: authLoading } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ALL hooks must be called before any early returns
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [trackedBuses, setTrackedBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [mapStyle, setMapStyle] = useState('streets-v11'); // streets-v11, satellite-v9, light-v10, dark-v10
  const mapRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchData();
      setupSocketListeners();
      getUserLocation();
      requestNotificationPermission();
    }

    return () => {
      const socket = getSocket();
      socket.off('bus-location-update');
    };
  }, [user]);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/login" />;
  }

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Error getting user location:', error);
        }
      );
    }
  };

  const fetchData = async () => {
    try {
      console.log('Fetching bus tracking data...');
      const token = localStorage.getItem('token');
      console.log('Auth token exists:', !!token);

      const [busesRes, routesRes, stopsRes, trackedRes] = await Promise.all([
        api.get('/buses'),
        api.get('/routes'),
        api.get('/stops'),
        api.get('/users/tracked-buses')
      ]);

      setBuses(busesRes.data.buses);
      setRoutes(routesRes.data.routes);
      setStops(stopsRes.data.stops);
      setTrackedBuses(trackedRes.data.trackedBuses || []);
      console.log('Data loaded successfully');
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 403) {
        console.log('403 Forbidden - user not authenticated');
        toast.error('Please log in to access bus tracking');
      } else if (error.response?.status === 429) {
        console.log('429 Too Many Requests - rate limited');
        toast.error('Too many requests. Please wait a moment before retrying.');
      } else {
        toast.error('Failed to load bus tracking data');
      }
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    const socket = getSocket();

    socket.on('bus-location-update', (data) => {
      setBuses(prev => prev.map(bus =>
        bus._id === data.busId
          ? { ...bus, currentLocation: data.location, lastUpdated: new Date(data.timestamp) }
          : bus
      ));

      setTrackedBuses(prev => prev.map(bus =>
        bus._id === data.busId
          ? { ...bus, currentLocation: data.location, lastUpdated: new Date(data.timestamp) }
          : bus
      ));

      // Check for notifications
      checkAndNotifyBusUpdates(trackedBuses, data, stops);
    });
  };

  const handleRouteChange = (event) => {
    setSelectedRoute(event.target.value);
    setSelectedBus(null);
  };

  const handleBusSelect = (bus) => {
    setSelectedBus(bus);
    if (mapRef.current && bus.currentLocation) {
      mapRef.current.setView([bus.currentLocation.latitude, bus.currentLocation.longitude], 15);
    }
  };

  const centerOnUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.latitude, userLocation.longitude], 15);
      toast.info('Centered on your location');
    } else {
      getUserLocation();
      toast.info('Getting your location...');
    }
  };

  const handleTrackBus = async (busId) => {
    try {
      await api.post(`/users/track-bus/${busId}`);
      const bus = buses.find(b => b._id === busId);
      if (bus) {
        setTrackedBuses(prev => [...prev, bus]);
        toast.success(`Now tracking Bus ${bus.busNumber}`);
      }
    } catch (error) {
      toast.error('Failed to track bus');
    }
  };

  const handleUntrackBus = async (busId) => {
    try {
      await api.delete(`/users/track-bus/${busId}`);
      setTrackedBuses(prev => prev.filter(bus => bus._id !== busId));
      toast.success('Stopped tracking bus');
    } catch (error) {
      toast.error('Failed to stop tracking bus');
    }
  };

  const filteredBuses = selectedRoute
    ? buses.filter(bus => bus.route._id === selectedRoute)
    : buses;

  const isTracking = (busId) => trackedBuses.some(bus => bus._id === busId);

  const getBusETA = (bus) => {
    if (!userLocation || !bus.currentLocation) return null;

    // Find nearest stop to user
    const nearestStop = findNearestStop(userLocation, stops);
    if (!nearestStop) return null;

    return calculateETA(bus.currentLocation, nearestStop.location);
  };

  const getRoutePolyline = (routeId) => {
    const route = routes.find(r => r._id === routeId);
    if (!route) return [];

    // Create polyline from start to end with waypoints
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
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Live Bus Tracking
      </Typography>

      <Grid container spacing={2}>
        {/* Controls */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>
              Filters
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }} size="small">
              <InputLabel>Route</InputLabel>
              <Select
                value={selectedRoute}
                label="Route"
                onChange={handleRouteChange}
              >
                <MenuItem value="">
                  <em>All Routes</em>
                </MenuItem>
                {routes.map((route) => (
                  <MenuItem key={route._id} value={route._id}>
                    {route.routeName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }} size="small">
              <InputLabel>Map Style</InputLabel>
              <Select
                value={mapStyle}
                label="Map Style"
                onChange={(e) => setMapStyle(e.target.value)}
              >
                <MenuItem value="streets-v11">Streets</MenuItem>
                <MenuItem value="satellite-v9">Satellite</MenuItem>
                <MenuItem value="light-v10">Light</MenuItem>
                <MenuItem value="dark-v10">Dark</MenuItem>
                <MenuItem value="outdoors-v11">Outdoors</MenuItem>
              </Select>
            </FormControl>
          </Paper>

          {/* Bus List */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Available Buses
            </Typography>

            {filteredBuses.length === 0 ? (
              <Alert severity="info" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                No buses found for selected route.
              </Alert>
            ) : (
              <List sx={{ p: 0 }}>
                {filteredBuses.map((bus) => {
                  const eta = getBusETA(bus);
                  return (
                    <ListItem
                      key={bus._id}
                      divider
                      button
                      onClick={() => handleBusSelect(bus)}
                      sx={{
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        py: { xs: 1.5, sm: 1 },
                        px: { xs: 1, sm: 2 }
                      }}
                    >
                      <ListItemText
                        primary={`Bus ${bus.busNumber}`}
                        secondary={
                          <React.Fragment>
                            <span style={{
                              fontSize: '0.75rem',
                              color: '#666',
                              display: 'block'
                            }}>
                              Route: {bus.route.routeName} • Status: {bus.status}
                            </span>
                            {eta && (
                              <span style={{
                                fontSize: '0.75rem',
                                color: '#1976d2',
                                display: 'block',
                                marginTop: '4px'
                              }}>
                                📍 {eta.etaText} ({eta.distance.toFixed(1)} km away)
                              </span>
                            )}
                          </React.Fragment>
                        }
                        sx={{ mb: { xs: 1, sm: 0 }, mr: { xs: 0, sm: 2 } }}
                      />
                      <Box sx={{
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center',
                        width: { xs: '100%', sm: 'auto' },
                        justifyContent: { xs: 'space-between', sm: 'flex-end' }
                      }}>
                        <Chip
                          label={bus.status}
                          color={bus.status === 'active' ? 'success' : 'default'}
                          size="small"
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                        />
                        {isTracking(bus._id) ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUntrackBus(bus._id);
                            }}
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}
                          >
                            Untrack
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrackBus(bus._id);
                            }}
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}
                          >
                            Track
                          </Button>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Map */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Live Map
              </Typography>

              <Box sx={{ height: { xs: 300, sm: 400, md: 500 }, width: '100%', position: 'relative' }}>
                <MapContainer
                  center={[20.2961, 85.8245]} // Default to Bhubaneswar coordinates
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'
                    url={`https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/tiles/{z}/{x}/{y}?access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoieWFhay1kcml2aW5nLWN1cnJpY3VsdW0iLCJhIjoiY2txYzJqb3FwMWZweDJwbXY0M3R5cDAzYyJ9'}`}
                  />

                  {/* Route polylines */}
                  {selectedRoute && (
                    <Polyline
                      positions={getRoutePolyline(selectedRoute)}
                      color="blue"
                      weight={4}
                      opacity={0.7}
                    />
                  )}

                  {/* Route start/end markers */}
                  {selectedRoute && routes
                    .filter(route => route._id === selectedRoute)
                    .map(route => (
                      <React.Fragment key={`route-${route._id}`}>
                        <Marker
                          position={[route.startPoint.latitude, route.startPoint.longitude]}
                          icon={L.divIcon({
                            className: 'custom-start-marker',
                            html: '<div style="background-color: green; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">S</div>',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                          })}
                        >
                          <Popup>
                            <Typography variant="subtitle2">Start: {route.startPoint.name}</Typography>
                            <Typography variant="body2">Route: {route.routeName}</Typography>
                          </Popup>
                        </Marker>
                        <Marker
                          position={[route.endPoint.latitude, route.endPoint.longitude]}
                          icon={L.divIcon({
                            className: 'custom-end-marker',
                            html: '<div style="background-color: red; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">E</div>',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                          })}
                        >
                          <Popup>
                            <Typography variant="subtitle2">End: {route.endPoint.name}</Typography>
                            <Typography variant="body2">Route: {route.routeName}</Typography>
                          </Popup>
                        </Marker>
                      </React.Fragment>
                    ))}

                  {/* Route waypoints markers */}
                  {selectedRoute && routes
                    .filter(route => route._id === selectedRoute)
                    .map(route => (
                      route.waypoints && route.waypoints.map((waypoint, index) => (
                        <Marker
                          key={`waypoint-${index}`}
                          position={[waypoint.latitude, waypoint.longitude]}
                          icon={L.divIcon({
                            className: 'custom-waypoint-marker',
                            html: `<div style="background-color: orange; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${index + 1}</div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                          })}
                        >
                          <Popup>
                            <Typography variant="subtitle2">
                              Waypoint {index + 1}: {waypoint.name}
                            </Typography>
                            <Typography variant="body2">
                              Route: {route.routeName}
                            </Typography>
                          </Popup>
                        </Marker>
                      ))
                    ))}

                  {/* Bus stop markers */}
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

                  {/* Bus markers */}
                  {filteredBuses
                    .filter(bus => bus.currentLocation && bus.status === 'active')
                    .map((bus) => {
                      const eta = getBusETA(bus);
                      return (
                        <Marker
                          key={bus._id}
                          position={[bus.currentLocation.latitude, bus.currentLocation.longitude]}
                          icon={L.divIcon({
                            className: 'custom-bus-marker',
                            html: `<div style="background-color: ${isTracking(bus._id) ? '#ff9800' : '#4caf50'}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${bus.busNumber}</div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                          })}
                        >
                          <Popup>
                            <Typography variant="subtitle2">
                              🚍 Bus {bus.busNumber}
                            </Typography>
                            <Typography variant="body2">
                              Route: {bus.route.routeName}
                            </Typography>
                            <Typography variant="body2">
                              Status: {bus.status}
                            </Typography>
                            <Typography variant="body2">
                              🚗 Speed: {bus.speed ? `${bus.speed.toFixed(1)} km/h` : 'Unknown'}
                            </Typography>
                            {bus.tripStats && (
                              <>
                                <Typography variant="body2">
                                  📏 Today: {bus.tripStats.distanceToday ? `${bus.tripStats.distanceToday.toFixed(2)} km` : '0 km'}
                                </Typography>
                                <Typography variant="body2">
                                  📊 Total: {bus.tripStats.totalDistance ? `${bus.tripStats.totalDistance.toFixed(1)} km` : '0 km'}
                                </Typography>
                              </>
                            )}
                            {eta && (
                              <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                                ⏱️ ETA: {eta.etaText}
                              </Typography>
                            )}
                            <Typography variant="body2">
                              Last updated: {bus.lastUpdated ? new Date(bus.lastUpdated).toLocaleTimeString() : 'Unknown'}
                            </Typography>
                          </Popup>
                        </Marker>
                      );
                    })}
                </MapContainer>

                {/* Floating Action Button for mobile */}
                {isMobile && (
                  <Fab
                    color="primary"
                    size="medium"
                    onClick={centerOnUserLocation}
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      zIndex: 1000
                    }}
                  >
                    📍
                  </Fab>
                )}
              </Box>

              {selectedBus && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    🚍 Bus {selectedBus.busNumber}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    📍 Location: {selectedBus.currentLocation
                      ? `${selectedBus.currentLocation.latitude.toFixed(4)}, ${selectedBus.currentLocation.longitude.toFixed(4)}`
                      : 'Unknown'
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    🕒 Last updated: {selectedBus.lastUpdated
                      ? new Date(selectedBus.lastUpdated).toLocaleString()
                      : 'Never'
                    }
                  </Typography>
                  {getBusETA(selectedBus) && (
                    <Typography variant="body2" color="primary" sx={{ mt: 1, fontWeight: 'bold', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      ⏱️ ETA: {getBusETA(selectedBus).etaText}
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BusTracking;
